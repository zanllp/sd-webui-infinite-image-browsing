from PIL import Image

from scripts.iib.tool import (
    comfyui_exif_data_to_str,
    is_img_created_by_comfyui,
    is_img_created_by_comfyui_with_webui_gen_info,
    get_comfyui_exif_data,
    parse_generation_parameters,
    read_sd_webui_gen_info_from_image,
)
from scripts.iib.vendor.model import ImageGenerationInfo, ImageGenerationParams


class ComfyUIParser:
    def __init__(self):
        pass

    @classmethod
    def parse(clz, img, file_path):
        info = ""
        params = None
        if not clz.test(img):
            raise Exception("image not matchd")
        if is_img_created_by_comfyui_with_webui_gen_info(img):
            info = read_sd_webui_gen_info_from_image(img, file_path)
            params = parse_generation_parameters(info)
        else:
            params = get_comfyui_exif_data(img)
            info = comfyui_exif_data_to_str(params)
        return ImageGenerationInfo(
            info,
            ImageGenerationParams(
                meta=params["meta"], pos_prompt=params["pos_prompt"], extra=params
            ),
        )

    @classmethod
    def test(clz, img: Image) -> bool:
        try:
            return is_img_created_by_comfyui(
                img
            ) or is_img_created_by_comfyui_with_webui_gen_info(img)
        except Exception:
            return False
