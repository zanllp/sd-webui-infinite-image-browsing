import os
from scripts.tool import human_readable_size
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
import modules.scripts as scripts
import gradio as gr
import re
import subprocess
import uuid
import asyncio
import subprocess
from modules import script_callbacks, shared
from typing import List, Dict, Literal, Union
from modules.shared import opts
from scripts.baiduyun_task import BaiduyunTask
import datetime
from pydantic import BaseModel
from scripts.log_parser import parse_log_line
from scripts.bin import (
    download_bin_file,
    get_matched_summary,
    check_bin_exists,
    cwd,
    bin_file_path,
    bin_file_name,
)
import functools
from scripts.logger import logger


def get_global_conf():
    default_conf = get_default_conf()
    return {
        "output_dirs": opts.data.get("baidu_netdisk_output_dirs")
        or default_conf.get("output_dirs"),
        "upload_dir": opts.data.get("baidu_netdisk_upload_dir")
        or default_conf.get("upload_dir"),
    }


def exec_ops(args: Union[List[str], str]):
    args = [args] if isinstance(args, str) else args
    res = ""
    if check_bin_exists():
        result = subprocess.run([bin_file_path, *args], capture_output=True)
        try:
            res = result.stdout.decode().strip()
        except UnicodeDecodeError:
            res = result.stdout.decode("gbk", errors="ignore").strip()
    logger.info(res)
    return res


def login_by_bduss(bduss: str):
    output = exec_ops(["login", f"-bduss={bduss}"])
    match = re.search("百度帐号登录成功: (.+)$", output)
    if match:
        return {"status": "ok", "msg": match.group(1).strip()}
    else:
        return {"status": "error", "msg": output}


def get_curr_working_dir():
    return exec_ops("pwd")


def list_file(cwd="/"):
    output = exec_ops(["ls", cwd])
    pattern = re.compile(
        r"\s+(\d+)\s+([\w\-.]+)\s+(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})\s+(.*)"
    )
    files = []
    for line in output.split("\n"):
        match = re.match(pattern, line)
        if match:
            name = match.group(4).strip()
            file_info = {
                "size": match.group(2),
                # "date": match.group(3),
                "name": name.strip("/"),
                "type": "dir" if name.endswith("/") else "file",
            }
            files.append(file_info)
    return files


def get_curr_user():
    match = re.search(
        r"uid:\s*(\d+), 用户名:\s*(\w+),",
        exec_ops("who"),
    )
    if not match:
        return
    uid = match.group(1)
    if int(uid) == 0:
        return
    username = match.group(2)
    return {"uid": uid, "username": username}


def logout():
    match = re.search("退出用户成功", exec_ops(["logout", "-y"]))
    return bool(match)


not_exists_msg = (
    f"找不到{bin_file_name},尝试手动从 {get_matched_summary()[1]} 下载,下载后放到 {cwd} 文件夹下,重启界面"
)


def on_ui_tabs():
    exists = check_bin_exists()
    if not exists:
        try:
            print("缺少必要的二进制文件，开始下载")
            download_bin_file()
            print("done")
        except Exception as e:
            print("下载二进制文件时出错：", str(e))
        exists = check_bin_exists()
        if not exists:
            print(f"\033[31m{not_exists_msg}\033[0m")
    with gr.Blocks(analytics_enabled=False) as baidu_netdisk:
        gr.Textbox(not_exists_msg, visible=not exists)
        with gr.Row(visible=bool(exists)):
            with gr.Column():
                gr.HTML(
                    "如果你看到这个那说明此项那说明出现了问题", elem_id="baidu_netdisk_container_wrapper"
                )

        return ((baidu_netdisk, "百度云上传", "baiduyun"),)


def get_default_conf():
    conf_g = opts.data
    outputs_dirs = ",".join(
        list(
            filter(
                bool,
                [
                    conf_g["outdir_samples"],
                    conf_g["outdir_txt2img_samples"],
                    conf_g["outdir_img2img_samples"],
                    conf_g["outdir_extras_samples"],
                    conf_g["outdir_grids"],
                    conf_g["outdir_txt2img_grids"],
                    conf_g["outdir_txt2img_grids"],
                    conf_g["outdir_save"],
                ],
            )
        )
    )
    upload_dir = "/stable-diffusion-upload"
    return {
        "output_dirs": outputs_dirs,
        "upload_dir": upload_dir,
    }


def singleton_async(fn):
    @functools.wraps(fn)
    async def wrapper(*args, **kwargs):
        key = args[0] if len(args) > 0 else None
        if key in wrapper.busy:
            raise Exception("Function is busy, please try again later.")
        wrapper.busy.append(key)
        try:
            return await fn(*args, **kwargs)
        finally:
            wrapper.busy.remove(key)

    wrapper.busy = []
    return wrapper


def baidu_netdisk_api(_: gr.Blocks, app: FastAPI):
    pre = "/baidu_netdisk"
    app.mount(
        f"{pre}/fe-static",
        StaticFiles(directory=f"{cwd}/vue/dist"),
        name="baidu_netdisk-fe-static",
    )

    @app.get(f"{pre}/user")
    async def user():
        return get_curr_user()

    @app.post(f"{pre}/user/logout")
    async def user_logout():
        return logout()

    class BaiduyunUserLoginReq(BaseModel):
        bduss: str

    @app.post(f"{pre}/user/login")
    async def user_login(req: BaiduyunUserLoginReq):
        res = login_by_bduss(req.bduss)
        if res["status"] != "ok":
            raise HTTPException(status_code=401, detail=res["msg"])
        return get_curr_user()

    @app.get(f"{pre}/hello")
    async def greeting():
        return "hello"

    @app.get(f"{pre}/global_setting")
    async def global_setting():
        return {"global_setting": opts.data, "default_conf": get_default_conf()}

    class BaiduyunUploadDownloadReq(BaseModel):
        type: Literal["upload", "download"]
        send_dirs: str
        recv_dir: str

    @app.post(f"{pre}/task")
    async def upload(req: BaiduyunUploadDownloadReq):
        task = await BaiduyunTask.create(**req.dict())
        return {"id": task.id}

    @app.get(f"{pre}/tasks")
    async def upload_tasks():
        tasks = []
        for key in BaiduyunTask.get_cache():
            task = BaiduyunTask.get_by_id(key)
            task.update_state()
            tasks.append(task.get_summary())
        return {"tasks": list(reversed(tasks))}
    
    @app.delete(pre + "/task/{id}")
    async def remove_task_cache(id: str):
        c = BaiduyunTask.get_cache()
        if id in c:
            c.pop(id)
        

    @app.get(pre + "/task/{id}/files_state")
    async def task_files_state(id):
        p = BaiduyunTask.get_by_id(id)
        if not p:
            raise HTTPException(status_code=404, detail="找不到该上传任务")
        return {"files_state": p.files_state}

    @app.post(pre + "/task/{id}/cancel")
    async def cancel_task(id):
        p = BaiduyunTask.get_by_id(id)
        if not p:
            raise HTTPException(status_code=404, detail="找不到该上传任务")
        last_tick = await p.cancel()
        return {"last_tick": last_tick}

    upload_poll_promise_dict = {}

    @app.get(pre + "/task/{id}/tick")
    async def upload_poll(id):
        async def get_tick_sync_wait_wrapper():
            task = BaiduyunTask.get_by_id(id)
            if not task:
                raise HTTPException(status_code=404, detail="找不到该上传任务")
            return await task.get_tick()

        res = upload_poll_promise_dict.get(id)
        if res:
            res = await res
        else:
            upload_poll_promise_dict[id] = asyncio.create_task(
                get_tick_sync_wait_wrapper()
            )
            res = await upload_poll_promise_dict[id]
            upload_poll_promise_dict.pop(id)

        return res

    @app.get(pre + "/files/{target}")
    async def get_target_floder_files(
        target: Literal["local", "netdisk"], folder_path: str
    ):
        files = []
        if target == "local":
            for item in os.listdir(folder_path):
                path = os.path.join(folder_path, item)
                if os.path.isfile(path):
                    size = human_readable_size(os.path.getsize(path))
                    files.append({"type": "file", "size": size, "name": item})
                elif os.path.isdir(path):
                    files.append({"type": "dir", "szie": "-", "name": item})
        else:
            files = list_file(folder_path)

        return {"files": files}


script_callbacks.on_ui_tabs(on_ui_tabs)
script_callbacks.on_app_started(baidu_netdisk_api)
