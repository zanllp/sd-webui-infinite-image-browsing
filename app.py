from typing import List
from fastapi import FastAPI
from fastapi.responses import FileResponse
import uvicorn
import os
from scripts.iib.api import infinite_image_browsing_api, index_html_path
from scripts.iib.tool import get_sd_webui_conf, get_valid_img_dirs, sd_img_dirs
from scripts.iib.db.datamodel import DataBase, Image
from scripts.iib.db.update_image_data import update_image_data
import argparse
import logging
from typing import Optional, Coroutine
import asyncio

tag = "\033[31m[warn]\033[0m"

default_port = 8000
default_host = "127.0.0.1"


def normalize_paths(paths: List[str]):
    """
    Normalize a list of paths, ensuring that each path is an absolute path with no redundant components.

    Args:
        paths (List[str]): A list of paths to be normalized.

    Returns:
        List[str]: A list of normalized paths.
    """
    res: List[str] = []
    for path in paths:
        # Skip empty or blank paths
        if not path or len(path.strip()) == 0:
            continue
        # If the path is already an absolute path, use it as is
        if os.path.isabs(path):
            abs_path = path
        # Otherwise, make the path absolute by joining it with the current working directory
        else:
            abs_path = os.path.join(os.getcwd(), path)
        # If the absolute path exists, add it to the result after normalizing it
        if os.path.exists(abs_path):
            res.append(os.path.normpath(abs_path))
    return res


def sd_webui_paths_check(sd_webui_config: str):
    import json

    conf = {}
    with open(sd_webui_config, "r") as f:
        conf = json.loads(f.read())
    paths = [conf.get(key) for key in sd_img_dirs]
    paths_check(paths)


def paths_check(paths):
    for path in paths:
        if not path or len(path.strip()) == 0:
            continue
        if os.path.isabs(path):
            abs_path = path
        else:
            abs_path = os.path.join(os.getcwd(), path)
        if not os.path.exists(abs_path):
            print(f"{tag} The path '{abs_path}' will be ignored (value: {path}).")


def update_image_index_func(sd_webui_config: str):
    dirs = get_valid_img_dirs(get_sd_webui_conf(sd_webui_config=sd_webui_config))
    if not len(dirs):
        return print(f"{tag} no valid image directories, skipped")
    conn = DataBase.get_conn()
    update_image_data(dirs)
    if Image.count(conn=conn) == 0:
        return print(f"{tag} it appears that there is some issue")
    print("update image index completed. ✨")


class AppUtils(object):
    def __init__(
        self,
        sd_webui_config: Optional[str] = None,
        update_image_index: bool = False,
        extra_paths: List[str] = [],
    ):
        """
        sd_webui_config, type=str, default=None, help="the path to the config file"
        update_image_index, action="store_true", help="update the image index"
        extra_paths", nargs="+", help="extra paths to use, will be added to Quick Move.", default=[]
        """
        self.sd_webui_config = sd_webui_config
        self.update_image_index = update_image_index
        self.extra_paths = extra_paths

    def set_params(self, *args, **kwargs) -> None:
        """改变参数，与__init__的行为一致"""
        self.__init__(*args, **kwargs)

    @staticmethod
    def async_run(app: FastAPI, port: int = default_port) -> Coroutine:
        """
        用于从异步运行的FastAPI，在jupyter notebook环境中非常有用

        app为要启动的FastAPI实例
        port为要启动的端口

        返回协程uvicorn.Server().serve()
        """
        # 不建议改成async def，并且用await替换return
        # 因为这样会失去对server.serve()的控制
        config = uvicorn.Config(app, host=default_host, port=port)
        server = uvicorn.Server(config)
        return server.serve()

    def wrap_app(self, app: FastAPI) -> None:
        """
        为传递的app挂载上infinite_image_browsing后端
        """
        sd_webui_config = self.sd_webui_config
        update_image_index = self.update_image_index
        extra_paths = self.extra_paths

        if sd_webui_config:
            sd_webui_paths_check(sd_webui_config)
            if update_image_index:
                update_image_index_func(sd_webui_config)
        paths_check(extra_paths)

        infinite_image_browsing_api(
            app,
            sd_webui_config=sd_webui_config,
            extra_paths_cli=normalize_paths(extra_paths),
        )

    def get_root_browser_app(self) -> FastAPI:
        """
        获取首页挂载在"/"上的infinite_image_browsing FastAPI实例
        """
        app = FastAPI()

        # 用于在首页显示
        @app.get("/")
        def index():
            return FileResponse(index_html_path)

        self.wrap_app(app)
        return app


def setup_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="A fast and powerful image browser for Stable Diffusion webui.")
    parser.add_argument("--port", type=int, help="The port to use", default=default_port)
    parser.add_argument("--sd_webui_config", type=str, default=None, help="The path to the config file")
    parser.add_argument("--update_image_index", action="store_true", help="Update the image index")
    parser.add_argument(
        "--extra_paths", nargs="+", help="Extra paths to use, will be added to Quick Move.", default=[]
    )
    return parser


def launch_app(port: int = default_port, *args, **kwargs) -> None:
    """
    同步函数

    除 port 参数外，所传入的其他参数全都会被传递给AppUtils()
    sd_webui_config, type=str, default=None, help="the path to the config file"
    update_image_index, action="store_true", help="update the image index"
    extra_paths", nargs="+", help="extra paths to use, will be added to Quick Move.", default=[]

    """
    app_utils = AppUtils(*args, **kwargs)
    app = app_utils.get_root_browser_app()
    uvicorn.run(app, host=default_host, port=port)


async def async_launch_app(port: int = default_port, *args, **kwargs) -> None:
    """
    协程函数

    除 port 参数外，所传入的其他参数全都会被传递给AppUtils()
    sd_webui_config, type=str, default=None, help="the path to the config file"
    update_image_index, action="store_true", help="update the image index"
    extra_paths", nargs="+", help="extra paths to use, will be added to Quick Move.", default=[]

    """
    app_utils = AppUtils(*args, **kwargs)
    app = app_utils.get_root_browser_app()
    await app_utils.async_run(app, port=port)


if __name__ == "__main__":
    parser = setup_parser()
    cmd_params = parser.parse_args()
    launch_app(
        cmd_params.port,
        sd_webui_config=cmd_params.sd_webui_config,
        update_image_index=cmd_params.update_image_index,
        extra_paths=cmd_params.extra_paths,
    )
