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

        if "exif" in items:
            exif = piexif.load(items["exif"])
            exif_bytes = (
                (exif or {}).get("Exif", {}).get(piexif.ExifIFD.UserComment, b"")
            )

        unicode_start = exif_bytes.find(b"UNICODE")
        if unicode_start == -1:
            raise ValueError("'UNICODE' markup isn't found")

        unicode_data = exif_bytes[unicode_start + len("UNICODE") + 1 :]
        geninfo = unicode_data.decode("utf-16")
        return geninfo

    @classmethod
    def parse(clz, img: Image, file_path):
        if not clz.test(img, file_path):
            raise Exception("The input image does not match the current parser.")
        exif_data = json.loads(clz.get_exif_data(img))["sui_image_params"]
        prompt = exif_data.pop("prompt")
        negativeprompt = exif_data.pop("negativeprompt")
        steps = exif_data.pop("steps")
        meta_kv = [f"Steps: {steps}", "Source Identifier: StableSwarmUI"]
        for key, value in exif_data.items():
            value = replace_punctuation(str(value))
            meta_kv.append(f"{key}: {value}")
        meta = ", ".join(meta_kv)
        info = "\n".join([prompt, f"Negative prompt: {negativeprompt}", meta])
        params = parse_generation_parameters(info)
        return ImageGenerationInfo(
            info,
            ImageGenerationParams(
                meta=params["meta"], pos_prompt=params["pos_prompt"], extra=params
            ),
        )

    @classmethod
    def test(clz, img: Image, file_path: str):
        try:
            exif = clz.get_exif_data(img)
            return exif.find("sui_image_params") != -1
        except Exception as e:
            return False
