from PIL import Image

import piexif
import piexif.helper
from scripts.iib.tool import parse_generation_parameters, replace_punctuation
from scripts.iib.parsers.model import ImageGenerationInfo, ImageGenerationParams
from PIL.ExifTags import TAGS
import json


class StableSwarmUIParser:
    def __init__(self):
        pass

    @classmethod
    def get_exif_data(clz, image: Image) -> str:
        items = image.info or {}
        exif_bytes = b""

        if "exif" in items:
            # Handle EXIF data (common in JPEGs, but can be in PNGs via eXIf chunk)
            exif = piexif.load(items["exif"])
            # UserComment is in the Exif IFD, tag 37510
            exif_bytes = (
                (exif or {}).get("Exif", {}).get(piexif.ExifIFD.UserComment, b"")
            )
        else:
            # Fallback for PNG info, as metadata can be in text chunks.
            # Common keys are 'parameters' (A1111-style) or 'Comment'.
            raw_info = items.get("parameters") or items.get("Comment")
            if isinstance(raw_info, str):
                # Pillow reads PNG tEXt chunks as strings. To get the original bytes
                # (which include the "UNICODE" marker), we need to re-encode it.
                # latin-1 is a safe choice as it maps every byte value 0-255 to a character.
                exif_bytes = raw_info.encode('latin-1')
            elif isinstance(raw_info, bytes):
                exif_bytes = raw_info

        # Stable Swarm UI encodes metadata as UTF-16 after a "UNICODE" marker
        unicode_start = exif_bytes.find(b"UNICODE")
        if unicode_start == -1:
            # If no UNICODE marker, try to decode as UTF-8 as a fallback
            try:
                decoded_str = exif_bytes.decode("utf-8", errors="ignore")
                if '"sui_image_params"' in decoded_str:
                    return decoded_str
            except Exception:
                pass # Ignore decoding errors and raise the final error
            raise ValueError("'UNICODE' marker not found in Exif data.")

        # Extract and decode the UTF-16 JSON string
        unicode_data = exif_bytes[unicode_start + len("UNICODE") + 1 :]
        geninfo = unicode_data.decode("utf-16")
        return geninfo

    @classmethod
    def parse(clz, img: Image, file_path):
        if not clz.test(img, file_path):
            raise Exception("The input image does not match the current parser.")

        full_exif_data = json.loads(clz.get_exif_data(img))
        params_data = full_exif_data.get("sui_image_params", {})
        models_data = full_exif_data.get("sui_models", [])

        # --- Reconstruct Prompt with LoRAs ---
        prompt = params_data.get("prompt", "")
        loras = params_data.get("loras", [])
        lora_weights = params_data.get("loraweights", [])

        lora_hashes = []
        lora_hash_map = {
            # Normalize name by removing extension for matching
            model_info.get("name", "").replace(".safetensors", "").replace(".pt", ""): model_info.get("hash", "").replace("0x", "")
            for model_info in models_data if model_info.get("param") == "loras"
        }

        # Combine LoRAs and weights into the prompt string
        for i, lora_name in enumerate(loras):
            if i < len(lora_weights):
                weight = lora_weights[i]
                prompt += f" <lora:{lora_name}:{weight}>"

                # Find and store the corresponding hash
                lora_hash = lora_hash_map.get(lora_name, "N/A")
                if lora_hash != "N/A":
                    lora_hashes.append(f"{lora_name}: {lora_hash}")

        negative_prompt = params_data.get("negativeprompt", "").strip()

        # --- Build Metadata Line ---
        meta_kv = []
        if "steps" in params_data: meta_kv.append(f"Steps: {params_data['steps']}")
        if "sampler" in params_data: meta_kv.append(f"Sampler: {params_data['sampler']}")
        if "cfgscale" in params_data: meta_kv.append(f"CFG scale: {params_data['cfgscale']}")
        if "seed" in params_data: meta_kv.append(f"Seed: {params_data['seed']}")
        if "width" in params_data and "height" in params_data:
            meta_kv.append(f"Size: {params_data['width']}x{params_data['height']}")

        # Find model name and hash
        model_name = params_data.get("model")
        model_hash = ""
        if model_name:
            for model_info in models_data:
                # Match by param type and ensure the name starts with the model from params
                if model_info.get("param") == "model" and model_info.get("name", "").startswith(model_name):
                    model_hash = model_info.get("hash", "").replace("0x", "")
                    break

        if model_hash: meta_kv.append(f"Model hash: {model_hash[:10]}")
        if model_name: meta_kv.append(f"Model: {model_name}")

        if lora_hashes:
            meta_kv.append(f"Lora hashes: {', '.join(lora_hashes)}")

        # Add remaining parameters
        other_params = params_data.copy()
        keys_to_ignore = [
            "prompt", "negativeprompt", "steps", "sampler", "cfgscale", "seed",
            "width", "height", "model", "loras", "loraweights", "lorasectionconfinement"
        ]
        for key in keys_to_ignore:
            other_params.pop(key, None)

        for key, value in other_params.items():
            value_str = replace_punctuation(str(value))
            meta_kv.append(f"{key}: {value_str}")

        meta_kv.append("Source Identifier: StableSwarmUI")
        meta_string = ", ".join(meta_kv)

        # --- Final Assembly ---
        info = f"{prompt}\nNegative prompt: {negative_prompt}\n{meta_string}"

        params = parse_generation_parameters(info)

        final_meta = params.get("meta", {})
        final_meta["final_width"] = img.size[0]
        final_meta["final_height"] = img.size[1]
        if model_hash:
            final_meta["Model hash"] = model_hash  # Store full hash

        return ImageGenerationInfo(
            info,
            ImageGenerationParams(
                meta=final_meta,
                pos_prompt=params.get("pos_prompt", prompt),
                extra=params,
            ),
        )

    @classmethod
    def test(clz, img: Image, file_path: str):
        try:
            exif = clz.get_exif_data(img)
            # Check for the unique key that identifies Stable Swarm UI metadata
            return '"sui_image_params"' in exif
        except Exception:
            return False
