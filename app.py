from typing import List
from fastapi import FastAPI
from fastapi.responses import FileResponse
import uvicorn
import os
from scripts.iib.api import infinite_image_browsing_api
from scripts.iib.tool import cwd, get_sd_webui_conf, get_valid_img_dirs, sd_img_dirs
from scripts.iib.db.datamodel import DataBase, Image
from scripts.iib.db.update_image_data import update_image_data
import argparse

tag = "\033[31m[warn]\033[0m"


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


def update_image_index(sd_webui_config: str):
    dirs = get_valid_img_dirs(get_sd_webui_conf(sd_webui_config=sd_webui_config))
    if not len(dirs):
        return print(f"{tag} no valid image directories, skipped")
    conn = DataBase.get_conn()
    update_image_data(dirs)
    if Image.count(conn=conn) == 0:
        return print(f"{tag} it appears that there is some issue")
    print("update image index completed. ✨")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Process some integers.")
    parser.add_argument("--port", type=int, help="the port to use", default=8000)
    parser.add_argument("--sd_webui_config", help="the path to the config file")
    parser.add_argument(
        "--update_image_index", action="store_true", help="update the image index"
    )
    parser.add_argument(
        "--extra_paths", nargs="+", help="extra paths to use, will be added to Quick Move.", default=[]
    )
    args = parser.parse_args()
    sd_webui_config = args.sd_webui_config
    if sd_webui_config:
        sd_webui_paths_check(sd_webui_config)
        if args.update_image_index:
            update_image_index(sd_webui_config)
    paths_check(args.extra_paths)

    app = FastAPI()

    @app.get("/")
    def index():
        return FileResponse(os.path.join(cwd, "vue/dist/index.html"))

    infinite_image_browsing_api(
        None,
        app,
        sd_webui_config=sd_webui_config,
        extra_paths_cli=normalize_paths(args.extra_paths),
    )
    uvicorn.run(app, host="127.0.0.1", port=args.port)
