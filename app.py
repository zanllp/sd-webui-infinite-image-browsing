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
def paths_check(sd_webui_config: str):
    import json
    conf = {}
    with open(sd_webui_config, "r") as f:
            conf = json.loads(f.read())
    paths = [conf.get(key) for key in sd_img_dirs]
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
    parser = argparse.ArgumentParser(description='Process some integers.')
    parser.add_argument('--port', type=int, help='the port to use', default=8000)
    parser.add_argument('--sd_webui_config', help='the path to the config file')
    parser.add_argument('--update_image_index', action='store_true', help='update the image index')
    args = parser.parse_args()
    sd_webui_config = args.sd_webui_config
    if sd_webui_config:
        paths_check(sd_webui_config)
        if args.update_image_index:
            update_image_index(sd_webui_config)
    app = FastAPI()
    @app.get("/")
    def index():
        return FileResponse(os.path.join(cwd, "vue/dist/index.html"))
    infinite_image_browsing_api(None, app, sd_webui_config = sd_webui_config)
    uvicorn.run(app, host="127.0.0.1", port=args.port)
