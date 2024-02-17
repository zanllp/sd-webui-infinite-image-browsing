from scripts.iib.vendor.comfyui import ComfyUIParser
from scripts.iib.vendor.sd_webui import SdWebUIParser
from scripts.iib.vendor.model import ImageGenerationInfo
from PIL import Image


def parse_image_info(image_path: str) -> ImageGenerationInfo:
    parsers = [ComfyUIParser, SdWebUIParser]
    with Image.open(image_path) as img:
        for parser in parsers:
            if parser.test(img):
                return parser.parse(img, image_path)
        raise Exception("matched parser is not found")
