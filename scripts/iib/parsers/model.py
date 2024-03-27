from scripts.iib.tool import omit


class ImageGenerationParams:
    def __init__(self, meta: dict = {}, pos_prompt: list = [], extra: dict = {}) -> None:
        self.meta = meta
        self.pos_prompt = pos_prompt
        self.extra = omit(extra, ["meta", "pos_prompt"])


class ImageGenerationInfo:
    def __init__(
        self,
        raw_info: str = "",
        params: ImageGenerationParams = ImageGenerationParams(),
    ):
        self.raw_info = raw_info
        self.params = params
