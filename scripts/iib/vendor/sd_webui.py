from PIL import Image

from scripts.iib.tool import (
    parse_generation_parameters,
    read_sd_webui_gen_info_from_image,
)
from scripts.iib.vendor.model import ImageGenerationInfo, ImageGenerationParams


class SdWebUIParser:
    def __init__(self):
        pass

    @classmethod
    def parse(clz, img: Image, file_path):
        if not clz.test(img):
            raise Exception("image not matchd")
        info = read_sd_webui_gen_info_from_image(img, file_path)
        params = parse_generation_parameters(info)
        return ImageGenerationInfo(
            info,
            ImageGenerationParams(
                meta=params["meta"], pos_prompt=params["pos_prompt"], extra=params
            ),
        )

    @classmethod
    def test(clz, img: Image):
        try:
            return True
        except Exception as e:
            return False
