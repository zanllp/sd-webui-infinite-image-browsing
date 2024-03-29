from scripts.iib.parsers.comfyui import ComfyUIParser
from scripts.iib.parsers.sd_webui import SdWebUIParser
from scripts.iib.parsers.fooocus import FooocusParser
from scripts.iib.parsers.model import ImageGenerationInfo
from PIL import Image


def parse_image_info(image_path: str) -> ImageGenerationInfo:
    parsers = [ComfyUIParser, FooocusParser, SdWebUIParser]
    with Image.open(image_path) as img:
        for parser in parsers:
            if parser.test(img, image_path):
                return parser.parse(img, image_path)
        raise Exception("matched parser is not found")
