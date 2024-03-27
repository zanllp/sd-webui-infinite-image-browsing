import os
import re
from PIL import Image

from scripts.iib.parsers.model import ImageGenerationInfo, ImageGenerationParams
from scripts.iib.tool import omit, parse_generation_parameters


def remove_extra_spaces(text):
    return re.sub(r"\s+", " ", text)


def get_log_file(file_path: str):
    dir = os.path.dirname(file_path)
    with open(os.path.join(dir, "log.html")) as f:
        return f.read()


class FooocusParser:
    def __init__(self):
        pass

    @classmethod
    def parse(clz, img: Image, file_path):
        if not clz.test(img, file_path):
            raise Exception("The input image does not match the current parser.")
        from lxml import etree

        log = get_log_file(file_path)
        root = etree.HTML(log)
        id = str(os.path.basename(file_path)).replace(".", "_")
        metadata = root.xpath(f'//div[@id="{id}"]/descendant::table[@class="metadata"]')
        tr_elements = metadata[0].xpath(".//tr")
        # As a workaround to bypass parsing errors in the parser.
        # https://github.com/jiw0220/stable-diffusion-image-metadata/blob/00b8d42d4d1a536862bba0b07c332bdebb2a0ce5/src/index.ts#L130
        metadata_list_str = "Steps: Unknown , Source Identifier: Fooocus ,"
        params = {"meta": {"Source Identifier": "Fooocus"}}
        for tr in tr_elements:
            label = tr.xpath('.//td[@class="label"]/text()')
            value = tr.xpath('.//td[@class="value"]/text()')
            if label:
                k = label[0]
                v = value[0] if value else "None"
                if k == "Fooocus V2 Expansion":
                    continue
                if k == "Prompt" or k == "Negative Prompt":
                    params[k] = remove_extra_spaces(v.replace("\n", "").strip())
                else:
                    v = v.replace(",", "，")
                    params["meta"][k] = v
                    metadata_list_str += f" {k}: {v},"
        params["meta"]["Model"] = params["meta"]["Base Model"]
        params["meta"]["Size"] = str(params["meta"]["Resolution"]).replace("(", "").replace(")", "").replace("，", " * ")
        metadata_list_str = metadata_list_str.strip()
        info = f"""{params['Prompt']}\nNegative prompt: {params['Negative Prompt']}\n{metadata_list_str}""".strip()
        return ImageGenerationInfo(
            info,
            ImageGenerationParams(
                meta=params["meta"],
                pos_prompt=parse_generation_parameters(info)["pos_prompt"]
            ),
        )

    @classmethod
    def test(clz, img: Image, file_path: str):
        filename = os.path.basename(file_path)
        try:
            return get_log_file(file_path).find(filename) != -1
        except Exception as e:
            return False
