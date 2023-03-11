from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
import modules.scripts as scripts
import gradio as gr
import re
import subprocess
import logging
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


# 创建logger对象，设置日志级别为DEBUG
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

# 创建控制台输出的handler，设置日志级别为INFO
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)

# 创建文件输出的handler，设置日志级别为DEBUG
file_handler = logging.FileHandler(f"{cwd}/log.log")
file_handler.setLevel(logging.DEBUG)

# 定义handler的日志格式
formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
console_handler.setFormatter(formatter)
file_handler.setFormatter(formatter)

# 将handler添加到logger对象中
logger.addHandler(console_handler)
logger.addHandler(file_handler)


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
        return (True, match.group(1).strip())
    else:
        print(output)


def get_curr_working_dir():
    return exec_ops("pwd")


def list_file(cwd="/"):
    exec_ops(["cd", cwd])
    output = exec_ops("ls")
    pattern = (
        r"\s+(\d+)\s+(\d+\.\d+\w+)\s+(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})\s+(.*)"
    )
    files = []
    for line in output.split("\n"):
        match = re.match(pattern, line)
        if match:
            file_info = {
                "id": int(match.group(1)),
                "size": match.group(2).strip(),
                "date": match.group(3).strip(),
                "name": match.group(4).strip(),
            }
            files.append(file_info)

    # 打印解析结果
    for file in files:
        print(file)
    return file


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


def get_curr_user_name():
    res = get_curr_user()
    return res["username"] if res else "未登录"


not_exists_msg = (
    f"找不到{bin_file_name},尝试手动从 {get_matched_summary()[1]} 下载,下载后放到 {cwd} 文件夹下,重启界面"
)


def upload_file_to_baidu_net_disk(pre_log):
    conf = get_global_conf()
    dirs = str(conf["output_dirs"]).split(",")
    print(["upload", *dirs, conf["upload_dir"]])

    return exec_ops(["upload", *dirs, conf["upload_dir"]])


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
    user = get_curr_user()
    with gr.Blocks(analytics_enabled=False) as baidu_netdisk:
        gr.Textbox(not_exists_msg, visible=not exists)
        with gr.Row(visible=bool(exists and not user)) as login_form:
            bduss_input = gr.Textbox(interactive=True, label="输入bduss,完成后回车登录")
        with gr.Row(visible=bool(exists and user)) as operation_form:
            with gr.Column():
                html_container = gr.HTML(
                    "如果你看到这个那说明此项那说明出现了问题", elem_id="baidu_netdisk_container_wrapper"
                )
                logout_btn = gr.Button("登出账户")

            def on_bduss_input_enter(bduss):
                res = login_by_bduss(bduss=bduss)
                return (
                    f"登陆成功{res[1]}" if res else "登录失败",
                    gr.update(visible=bool(res)),
                    gr.update(visible=not res),
                )

            bduss_input.submit(
                on_bduss_input_enter,
                inputs=[bduss_input],
                outputs=[html_container, operation_form, login_form],
            )

            def on_logout():
                logout()
                return gr.update(visible=True), gr.update(visible=False)

            logout_btn.click(fn=on_logout, outputs=[login_form, operation_form])
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


def on_ui_settings():
    bd_options = []
    default_conf = get_default_conf()
    bd_options.append(
        (
            "baidu_netdisk_output_dirs",
            default_conf["output_dirs"],
            "上传的本地文件夹列表，多个文件夹使用逗号分隔",
        )
    )
    bd_options.append(
        ("baidu_netdisk_upload_dir", default_conf["upload_dir"], "百度网盘用于接收上传文件的文件夹地址")
    )

    section = ("baidu-netdisk", "百度云上传")
    # Move historic setting names to current names
    for i in range(len(bd_options)):
        shared.opts.add_option(
            bd_options[i][0],
            shared.OptionInfo(
                bd_options[i][1],
                bd_options[i][2],
                section=section,
            ),
        )


def singleton_async(fn):
    @functools.wraps(fn)
    async def wrapper(*args, **kwargs):
        key = args[0] if len(args) > 0 else None
        print(wrapper.busy)
        print(key)
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

    @app.get(f"{pre}/hello")
    async def greeting():
        return "hello"

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

    @app.get(pre + "/task/{id}/files_state")
    async def task_files_stat(id):
        p = BaiduyunTask.get_by_id(id)
        if not p:
            raise HTTPException(status_code=404, detail="找不到该上传任务")
        return {"files_state": p.files_state}
    
    upload_poll_promise_dict = {}
    @app.get(pre + "/task/{id}/tick")
    async def upload_poll(id):
        async def get_tick():  
            task = BaiduyunTask.get_by_id(id)
            if not task:
                raise HTTPException(status_code=404, detail="找不到该上传任务")
            tasks = []
            while True:
                try:
                    line = await asyncio.wait_for(
                        task.subprocess.stdout.readline(), timeout=0.1
                    )
                    line = line.decode()
                    if not line:
                        break
                    if line.isspace():
                        continue
                    info = parse_log_line(line)
                    tasks.append({"info": info, "log": line})
                    task.append_log(info, line)
                except asyncio.TimeoutError:
                    break
            task.update_state()
            return {"tasks": tasks, "task_summary": task.get_summary()}
        
        res = upload_poll_promise_dict.get(id)
        if res:
            res = await res
        else:
            upload_poll_promise_dict[id] = asyncio.create_task(get_tick()) 
            res = await upload_poll_promise_dict[id]
            upload_poll_promise_dict.pop(id)
        return res


script_callbacks.on_ui_settings(on_ui_settings)
script_callbacks.on_ui_tabs(on_ui_tabs)
script_callbacks.on_app_started(baidu_netdisk_api)
