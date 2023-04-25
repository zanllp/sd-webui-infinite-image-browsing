from fastapi import FastAPI
from fastapi.responses import FileResponse
import uvicorn
import os
from scripts.api import infinite_image_browsing_api
from scripts.tool import cwd
import argparse

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Process some integers.')
    parser.add_argument('--port', type=int, help='the port to use', default=8000)
    parser.add_argument('--sd_webui_config', help='the path to the config file')
    args = parser.parse_args()
    app = FastAPI()
    @app.get("/")
    def index():
        return FileResponse(os.path.join(cwd, "vue/dist/index.html"))
    infinite_image_browsing_api(None, app, sd_webui_config = args.sd_webui_config)
    uvicorn.run(app, host="127.0.0.1", port=args.port)
