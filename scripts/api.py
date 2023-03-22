import os
import time
from scripts.tool import human_readable_size
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
import re
import subprocess
import asyncio
import subprocess
from typing import Any, List, Literal, Union
from scripts.baiduyun_task import BaiduyunTask
from pydantic import BaseModel
from scripts.bin import (
    check_bin_exists,
    cwd,
    bin_file_path,
    is_win,
)
from scripts.tool import get_windows_drives, convert_to_bytes
import functools
from scripts.logger import logger


def exec_ops(args: Union[List[str], str]):
    args = [args] if isinstance(args, str) else args
    res = ""
    if check_bin_exists():
        result = subprocess.run([bin_file_path, *args], capture_output=True)
        try:
            res = result.stdout.decode().strip()
        except UnicodeDecodeError:
            res = result.stdout.decode("gbk", errors="ignore").strip()
    if args[0] != "ls":
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
    if output.find("获取目录下的文件列表: 网络错误") != -1:
        raise Exception("获取目录下的文件列表: 网络错误")
    files = []
    for line in output.split("\n"):
        match = re.match(pattern, line)
        if match:
            name = match.group(4).strip()
            f_type = "dir" if name.endswith("/") else "file"
            size = match.group(2)
            file_info = {
                "size": size,
                "date": match.group(3),
                "name": name.strip("/"),
                "type": f_type,
                "bytes": convert_to_bytes(size) if size != "-" else size
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


def baidu_netdisk_api(_: Any, app: FastAPI):
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
        conf = {}
        try:
            from modules.shared import opts
            conf = opts.data
        except: 
            pass
        return {
            "global_setting": conf,
            "cwd": cwd,
            "is_win": is_win,
            "home": os.environ.get("USERPROFILE") if is_win else os.environ.get("HOME"),
            "sd_cwd": os.getcwd(),
        }

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
        try:
            if target == "local":
                if is_win and folder_path == "/":
                    for item in get_windows_drives():
                        files.append({"type": "dir", "size": "-", "name": item})
                else:
                    for item in os.listdir(folder_path):
                        path = os.path.join(folder_path, item)
                        if not os.path.exists(path):
                            continue
                        mod_time = os.path.getmtime(path)
                        date = time.strftime(
                            "%Y-%m-%d %H:%M:%S", time.localtime(mod_time)
                        )
                        if os.path.isfile(path):
                            bytes = os.path.getsize(path)
                            size = human_readable_size(bytes)
                            files.append(
                                {
                                    "type": "file",
                                    "date": date,
                                    "size": size,
                                    "name": item,
                                    "bytes": bytes,
                                }
                            )
                        elif os.path.isdir(path):
                            files.append(
                                {"type": "dir", "date": date, "size": "-", "name": item}
                            )
            else:
                files = list_file(folder_path)

        except Exception as e:
            logger.error(e)
            raise HTTPException(status_code=400, detail=str(e))

        return {"files": files}
