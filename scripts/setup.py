import modules.scripts as scripts
import gradio as gr
import os
from contextlib import contextmanager
import re
import subprocess
import platform
import logging
import time

from modules import images
from modules.processing import process_images, Processed
from modules.processing import Processed
from modules import script_callbacks, shared
from modules.shared import opts, cmd_opts, state
import json
from typing import Dict, Literal, TypedDict

cwd = os.path.normpath(os.path.join(__file__, "../../"))
print(shared.config_filename)
is_win = platform.system().lower().index("win") != -1
bin_file_name = "BaiduPCS-Go.exe" if is_win else "BaiduPCS-Go"

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
    return {
        "output_dirs": opts.__getattr__("baidu_netdisk_output_dirs"),
        "upload_dir": opts.__getattr__("baidu_netdisk_upload_dir"),
    }


@contextmanager
def cd(newdir):
    """
    更改当前的工作目录，并在with语句块结束后恢复原来的工作目录。
    """
    prevdir = os.getcwd()
    os.chdir(newdir)
    try:
        yield
    finally:
        os.chdir(prevdir)


def check_bin_exists():
    return os.path.exists(os.path.join(cwd, bin_file_name))


def exec_ops(args: list[str] | str):
    args = [args] if isinstance(args, str) else args
    res = ""
    if os.path.exists(os.path.join(cwd, bin_file_name)):
        with cd(cwd):
            result = subprocess.run([bin_file_name, *args], capture_output=True)
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
    # 使用正则表达式解析输出
    match = re.search(
        r"uid:\s*(\d+), 用户名:\s*(\w+),",
        exec_ops("who"),
    )
    if not match:
        return
    # 获取解析结果
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


not_exists_msg = f"找不到{bin_file_name},下载后放到 {cwd} 文件夹下,重启界面"

def upload_file_to_baidu_net_disk(pre_log):
    conf = get_global_conf()
    dirs = str(conf['output_dirs']).split(',')
    print(["upload", *dirs, conf['upload_dir']])
    return exec_ops(["upload", *dirs, conf['upload_dir']])

def on_ui_tabs():
    exists = check_bin_exists()
    user = get_curr_user()
    if not exists:
        print(f"\033[31m{not_exists_msg}\033[0m")
    with gr.Blocks(analytics_enabled=False) as image_browser:
        gr.Textbox(not_exists_msg, visible=not exists)
        with gr.Row(visible=bool(exists and not user)) as login_form:
            bduss_input = gr.Textbox(interactive=True, label="输入bduss,完成后回车登录")
        with gr.Row(visible=bool(exists and user)) as operation_form:
            with gr.Column(scale=5):
                upload_btn = gr.Button("上传")
                logout_btn = gr.Button("登出账户")
            with gr.Column(scale=5):
                log_text = gr.Textbox(get_curr_user_name(), label="log", elem_id="baidu_netdisk_log")


            upload_btn.click(
                fn=upload_file_to_baidu_net_disk,
                inputs=log_text,
                outputs=log_text,
                # _js="document.querySelector(\"body > gradio-app\").shadowRoot.querySelector(\"#baidu_netdisk_log textarea\").value = 'uploading....'"
            
            )

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
                outputs=[log_text, operation_form, login_form],
            )

            def on_logout():
                logout()
                return gr.update(visible=True), gr.update(visible=False)

            logout_btn.click(fn=on_logout, outputs=[login_form, operation_form])
        return ((image_browser, "百度云", "baiduyun"),)


def on_ui_settings():
    bd_options = []
    # [current setting_name], [default], [label], [old setting_name]
    conf_g = opts.data
    default_outputs = ",".join(
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
    bd_options.append(
        ("baidu_netdisk_output_dirs", default_outputs, "上传的本地文件夹列表，多个文件夹使用逗号分隔")
    )
    bd_options.append(
        ("baidu_netdisk_upload_dir", "/stable-diffusion-upload", "百度网盘用于接收上传文件的文件夹地址")
    )

    section = ("baidu-netdisk", "百度云")
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


script_callbacks.on_ui_settings(on_ui_settings)

script_callbacks.on_ui_tabs(on_ui_tabs)
