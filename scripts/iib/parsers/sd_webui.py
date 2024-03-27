from PIL import Image

from scripts.iib.tool import (
    parse_generation_parameters,
    read_sd_webui_gen_info_from_image,
)
from scripts.iib.parsers.model import ImageGenerationInfo, ImageGenerationParams


class SdWebUIParser:
    def __init__(self):
        pass

    @classmethod
    def parse(clz, img: Image, file_path):
        if not clz.test(img, file_path):
            raise Exception("The input image does not match the current parser.")
        info = read_sd_webui_gen_info_from_image(img, file_path)
        if not info:
            return ImageGenerationInfo()
        info += ", Source Identifier: Stable Diffusion web UI"
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
            return True
        except Exception as e:
            return False
