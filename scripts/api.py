from datetime import datetime, timedelta
import os
import shutil
import time
from scripts.tool import human_readable_size, is_valid_image_path, temp_path
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
import re
import subprocess
import asyncio
import subprocess
from typing import Any, List, Literal, Optional, Union
from scripts.baiduyun_task import BaiduyunTask
from pydantic import BaseModel
from fastapi.responses import FileResponse, RedirectResponse
from PIL import Image
from io import BytesIO
import hashlib
from urllib.parse import urlencode

from scripts.bin import (
    bin_file_name,
    get_matched_summary,
    check_bin_exists,
    download_bin_file,
)

from scripts.bin import (
    check_bin_exists,
    cwd,
    bin_file_path,
    is_win,
)
from scripts.tool import get_windows_drives, convert_to_bytes
import functools
from scripts.logger import logger

class AutoUpload:
    # 已成等待发送图像的队列
    files = []
    task_id: Union[None, str] = None
    
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
            name = name.strip("/")
            file_info = {
                "size": size,
                "date": match.group(3),
                "name": name,
                "type": f_type,
                "bytes": convert_to_bytes(size) if size != "-" else size,
                "fullpath": f"{cwd}/{name}",
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

send_img_path = { "value": "" }

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
        send_dirs: List[str]
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
    
    class DeleteFilesReq(BaseModel):
        file_paths: list[str]

    @app.post(pre+"/delete_files/{target}")
    async def delete_files(req: DeleteFilesReq, target: Literal["local", "netdisk"]):
        if target == "local":
            for path in req.file_paths:
                try:
                    # 删除文件
                    os.remove(path)
                except OSError as e:
                    # 处理删除失败的情况
                    raise HTTPException(400, detail=f"删除文件{path}时出错：{e}")
        else:
            exec_ops(["rm", *req.file_paths]) #没检查是否失败，暂时先这样

    class MoveFilesReq(BaseModel):
        file_paths: list[str]
        dest: str

    @app.post(pre+"/move_files/{target}")
    async def move_files(req: MoveFilesReq, target: Literal["local", "netdisk"]):
        if target == "local":
           for path in req.file_paths:
            try:
                shutil.move(path, req.dest)
            except OSError as e:
                raise HTTPException(400, detail=f"移动文件{path}到{req.dest}时出错：{e}")
        else:
            exec_ops(["mv", *req.file_paths, req.dest]) #没检查是否失败，暂时先这样

    @app.get(pre + "/files/{target}")
    async def get_target_floder_files(
        target: Literal["local", "netdisk"], folder_path: str
    ):
        files = []
        try:
            if target == "local":
                if is_win and folder_path == "/":
                    for item in get_windows_drives():
                        files.append({"type": "dir", "size": "-", "name": item, "fullpath": item})
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
                                    "fullpath": os.path.normpath(os.path.join(folder_path, item))
                                }
                            )
                        elif os.path.isdir(path):
                            files.append(
                                {"type": "dir", "date": date, "size": "-", "name": item, "fullpath": os.path.normpath(os.path.join(folder_path, item))}
                            )
            else:
                files = list_file(folder_path)

        except Exception as e:
            logger.error(e)
            raise HTTPException(status_code=400, detail=str(e))

        return {"files": files}

    @app.get(pre + "/image-thumbnail")
    async def thumbnail(path: str, size: str = '256,256'):
        if not temp_path:
            encoded_params = urlencode({ "filename": path })
            return RedirectResponse(url=f"{pre}/file?{encoded_params}")
        # 生成缓存文件的路径
        hash = hashlib.md5((path + size).encode('utf-8')).hexdigest()
        cache_path = os.path.join(temp_path, f'{hash}.webp')

        # 如果缓存文件存在，则直接返回该文件
        if os.path.exists(cache_path):
            return FileResponse(
                cache_path,
                media_type="image/webp",
                headers={"Cache-Control": "max-age=31536000", "ETag": hash},
            )

        # 如果缓存文件不存在，则生成缩略图并保存
        with open(path, "rb") as f:
            img = Image.open(BytesIO(f.read()))
        w,h = size.split(',')
        img.thumbnail((int(w),int(h)))
        buffer = BytesIO()
        img.save(buffer, 'webp')

        # 将二进制数据写入缓存文件中
        with open(cache_path, 'wb') as f:
            f.write(buffer.getvalue())

        # 返回缓存文件
        return FileResponse(
            cache_path,
            media_type="image/webp",
            headers={"Cache-Control": "max-age=31536000", "ETag": hash},
        )
    
    forever_cache_path = []
    try:
        from modules.shared import opts
        conf = opts.data
        def get_config_path(conf):
            # 获取配置项
            keys = ['outdir_txt2img_samples', 'outdir_img2img_samples', 'outdir_save',
                    'outdir_extras_samples', 'additional_networks_extra_lora_path',
                    'outdir_grids', 'outdir_img2img_grids', 'outdir_samples', 'outdir_txt2img_grids']
            paths = [conf.get(key) for key in keys]
            
            # 判断路径是否有效并转为绝对路径
            abs_paths = []
            for path in paths:
                if os.path.isabs(path):  # 已经是绝对路径
                    abs_path = path
                else:  # 转为绝对路径
                    abs_path = os.path.join(os.getcwd(), path)
                if os.path.exists(abs_path):  # 判断路径是否存在
                    abs_paths.append(abs_path)
            
            return abs_paths
        forever_cache_path = get_config_path(conf)
    except:
        pass

    def need_cache(path, parent_paths = forever_cache_path):
        """
        判断 path 是否是 parent_paths 中某个路径的子路径
        """
        try:            
            for parent_path in parent_paths:
                if os.path.commonpath([path, parent_path]) == parent_path:
                    return True
        except:
            pass
        return False
    
    @app.get(pre+"/file")
    async def get_file(filename: str, disposition: Optional[str] = None):
        import mimetypes
        if not os.path.exists(filename):
            raise HTTPException(status_code=404)

        # 根据文件后缀名获取媒体类型
        media_type, _ = mimetypes.guess_type(filename)
        headers = {}
        if disposition:
            headers["Content-Disposition"] = f'attachment; filename="{disposition}"'
        if need_cache(filename) and is_valid_image_path(filename): # 认为永远不变,不要协商缓存了试试
            headers["Cache-Control"] = "public, max-age=31536000"
            headers["Expires"] = (datetime.now() + timedelta(days=365)).strftime("%a, %d %b %Y %H:%M:%S GMT")

        return FileResponse(
            filename,
            media_type=media_type,
            headers=headers,
        )
    
    @app.post(pre+"/send_img_path")
    async def api_set_send_img_path(path: str):
        send_img_path["value"] = path

    # 等待图片信息生成完成
    @app.get(pre+"/gen_info_completed")
    async def api_set_send_img_path():
        for _ in range(600): # 等待60s
            if send_img_path["value"] == '':
                return True
            await asyncio.sleep(0.1)
        return send_img_path["value"] == ''
    
    
    @app.get(pre+"/image_geninfo")
    async def image_geninfo(path: str):
        from modules import extras
        geninfo,_ = extras.images.read_info_from_image(Image.open(path))
        return geninfo
    
    class AutoUploadParams(BaseModel):
        recv_dir: str
    @app.post(pre+"/auto_upload")
    async def auto_upload(req: AutoUploadParams):
        tick_info = None
        if AutoUpload.task_id:
            task = BaiduyunTask.get_by_id(AutoUpload.task_id)
            tick_info = await task.get_tick()
            if not task.running:
                AutoUpload.task_id = None
        else:
            recived_file = AutoUpload.files
            AutoUpload.files = []
            if len(recived_file):
                logger.info(f"创建上传任务 {recived_file} ----> {req.recv_dir}")
                task = await BaiduyunTask.create('upload', recived_file, req.recv_dir)
                AutoUpload.task_id = task.id
        return {
            "tick_info": tick_info,
            "pending_files": AutoUpload.files
        }
    
    class CheckPathExistsReq(BaseModel):
        paths: List[str]

    @app.post(pre + '/check_path_exists')
    async def check_path_exists(req: CheckPathExistsReq):
        res = {}
        for path in req.paths:
            res[path] = os.path.exists(path)
        return res
    
    not_exists_msg = ()

    @app.get(pre + '/baiduyun_exists')
    async def baiduyun_exists():
        return check_bin_exists()
    
    @app.get(pre)
    def index_bd():
        return FileResponse(os.path.join(cwd, "vue/dist/index.html"))

    @app.post(pre + '/download_baiduyun')
    async def download_baiduyun():
        if not check_bin_exists():
            try:
                download_bin_file()
            except:
                raise HTTPException(500, detail=f"安装失败,找不到{bin_file_name},尝试手动从 {get_matched_summary()[1]} 或者 {get_matched_summary()[2]} 下载,下载后放到 {cwd} 文件夹下,重启界面")
