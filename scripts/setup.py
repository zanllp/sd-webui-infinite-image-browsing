from scripts.api import baidu_netdisk_api
from modules import script_callbacks
from scripts.bin import (
    bin_file_name,
    get_matched_summary,
    check_bin_exists,
    download_bin_file,
)
from scripts.tool import cwd
'''
api函数声明和启动分离方便另外一边被外部调用
'''

not_exists_msg = (
    f"找不到{bin_file_name},尝试手动从 {get_matched_summary()[1]} 下载,下载后放到 {cwd} 文件夹下,重启界面"
)


def on_ui_tabs():
    import gradio as gr

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

        return ((baidu_netdisk, "百度云", "baiduyun"),)


script_callbacks.on_ui_tabs(on_ui_tabs)
script_callbacks.on_app_started(baidu_netdisk_api)
