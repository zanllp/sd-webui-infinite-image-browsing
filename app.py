from typing import List
from fastapi import FastAPI
from fastapi.responses import FileResponse
import uvicorn
import os
from scripts.iib.api import infinite_image_browsing_api, index_html_path
from scripts.iib.tool import get_sd_webui_conf, get_valid_img_dirs, sd_img_dirs, normalize_paths
from scripts.iib.db.datamodel import DataBase, Image
from scripts.iib.db.update_image_data import update_image_data
import argparse
from typing import Optional, Coroutine
import json

tag = "\033[31m[warn]\033[0m"

default_port = 8000
default_host = "127.0.0.1"


def sd_webui_paths_check(sd_webui_config: str, relative_to_config: bool):
    conf = {}
    with open(sd_webui_config, "r") as f:
        conf = json.loads(f.read())
    if relative_to_config:
        for dir in sd_img_dirs:
            if not os.path.isabs(conf[dir]):
                conf[dir] = os.path.normpath(
                    os.path.join(sd_webui_config, "../", conf[dir])
                )
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


def do_update_image_index(sd_webui_config: str, relative_to_config=False):
    dirs = get_valid_img_dirs(
        get_sd_webui_conf(
            sd_webui_config=sd_webui_config,
            sd_webui_path_relative_to_config=relative_to_config,
        )
    )
    if not len(dirs):
        return print(f"{tag} no valid image directories, skipped")
    conn = DataBase.get_conn()
    update_image_data(dirs)
    if Image.count(conn=conn) == 0:
        return print(f"{tag} it appears that there is some issue")
    print("update image index completed. ✨")


class AppUtils:
    def __init__(
        self,
        sd_webui_config: Optional[str] = None,
        update_image_index: bool = False,
        extra_paths: List[str] = [],
        sd_webui_path_relative_to_config=False,
        allow_cors=False,
        enable_shutdown=False,
        sd_webui_dir: Optional[str] = None,
    ):
        """
        Parameter definitions can be found by running the `python app.py -h `command or by examining the setup_parser() function.
        """
        self.sd_webui_config = sd_webui_config
        self.update_image_index = update_image_index
        self.extra_paths = extra_paths
        self.sd_webui_path_relative_to_config = sd_webui_path_relative_to_config
        self.allow_cors = allow_cors
        self.enable_shutdown = enable_shutdown
        self.sd_webui_dir = sd_webui_dir
        if sd_webui_dir:
            DataBase.path = os.path.join(
                sd_webui_dir, "extensions/sd-webui-infinite-image-browsing/iib.db"
            )
            self.sd_webui_config = os.path.join(sd_webui_dir, "config.json")
            self.sd_webui_path_relative_to_config = True

    def set_params(self, *args, **kwargs) -> None:
        """改变参数，与__init__的行为一致"""
        self.__init__(*args, **kwargs)

    @staticmethod
    def async_run(app: FastAPI, port: int = default_port, host = default_host) -> Coroutine:
        """
        用于从异步运行的 FastAPI，在 Jupyter Notebook 环境中非常有用
        """
        # 不建议改成 async def，并且用 await 替换 return，
        # 因为这样会失去对 server.serve() 的控制。
        config = uvicorn.Config(app, host=host, port=port)
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
            sd_webui_paths_check(sd_webui_config, self.sd_webui_path_relative_to_config)
            if update_image_index:
                do_update_image_index(
                    sd_webui_config, self.sd_webui_path_relative_to_config
                )
        paths_check(extra_paths)

        infinite_image_browsing_api(
            app,
            sd_webui_config=sd_webui_config,
            extra_paths_cli=normalize_paths(extra_paths, os.getcwd()),
            sd_webui_path_relative_to_config=self.sd_webui_path_relative_to_config,
            allow_cors=self.allow_cors,
            enable_shutdown=self.enable_shutdown,
            launch_mode="server",
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
    parser = argparse.ArgumentParser(
        description="A fast and powerful image browser for Stable Diffusion webui."
    )
    parser.add_argument(
        "--host", type=str, default=default_host, help="The host to use"
    )
    parser.add_argument(
        "--port", type=int, help="The port to use", default=default_port
    )
    parser.add_argument(
        "--sd_webui_config", type=str, default=None, help="The path to the config file"
    )
    parser.add_argument(
        "--update_image_index", action="store_true", help="Update the image index"
    )
    parser.add_argument(
        "--extra_paths",
        nargs="+",
        help="Extra paths to use, will be added to Quick Move.",
        default=[],
    )
    parser.add_argument(
        "--sd_webui_path_relative_to_config",
        action="store_true",
        help="Use the file path of the sd_webui_config file as the base for all relative paths provided within the sd_webui_config file.",
    )
    parser.add_argument(
        "--allow_cors",
        action="store_true",
        help="Allow Cross-Origin Resource Sharing (CORS) for the API.",
    )
    parser.add_argument(
        "--enable_shutdown",
        action="store_true",
        help="Enable the shutdown endpoint.",
    )
    parser.add_argument(
        "--sd_webui_dir",
        type=str,
        default=None,
        help="The path to the sd_webui folder. When specified, the sd_webui's configuration will be used and the extension must be installed within the sd_webui. Data will be shared between the two.",
    )
    return parser


def launch_app(port: int = default_port, host: str = default_host, *args, **kwargs: dict) -> None:
    """
    Launches the application on the specified port.

    Args:
        **kwargs (dict): Optional keyword arguments that can be used to configure the application.
            These can be viewed by running 'python app.py -h' or by checking the setup_parser() function.
    """
    app_utils = AppUtils(*args, **kwargs)
    app = app_utils.get_root_browser_app()
    uvicorn.run(app, host=host, port=port)


async def async_launch_app(port: int = default_port, host: str = default_host, *args, **kwargs: dict) -> None:
    """
    Asynchronously launches the application on the specified port.

    Args:
        **kwargs (dict): Optional keyword arguments that can be used to configure the application.
            These can be viewed by running 'python app.py -h' or by checking the setup_parser() function.
    """
    app_utils = AppUtils(*args, **kwargs)
    app = app_utils.get_root_browser_app()
    await app_utils.async_run(app, host=host, port=port)


if __name__ == "__main__":
    parser = setup_parser()
    args = parser.parse_args()
    launch_app(**vars(args))
