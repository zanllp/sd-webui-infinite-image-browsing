from fastapi import FastAPI
from scripts.api import baidu_netdisk_api, send_img_path, AutoUpload
from modules import script_callbacks, generation_parameters_copypaste as send, extras
from scripts.tool import cwd, debounce
from PIL import Image
from scripts.logger import logger


"""
api函数声明和启动分离方便另外一边被外部调用
"""



def on_ui_tabs():
    import gradio as gr
    with gr.Blocks(analytics_enabled=False) as baidu_netdisk:
        with gr.Row():
            with gr.Column():
                gr.HTML(
                    "如果你看到这个那说明此项那说明出现了问题", elem_id="baidu_netdisk_container_wrapper"
                )

        img = gr.Image(
            type="pil",
            elem_id="bd_hidden_img",
        )

        img_update_trigger = gr.Button("button", elem_id="bd_hidden_img_update_trigger")

        def img_update_func():
            path = send_img_path.get("value")
            geninfo,_ = extras.images.read_info_from_image(Image.open(path))
            send_img_path["value"] = ''
            return path, geninfo
        
        img_file_info = gr.Textbox(elem_id="bd_hidden_img_file_info")
        img_update_trigger.click(img_update_func, outputs=[img, img_file_info])
        for tab in ["txt2img", "img2img", "inpaint", "extras"]:
            btn = gr.Button(f"Send to {tab}", elem_id=f"bd_hidden_tab_{tab}")
            send.register_paste_params_button(
                send.ParamBinding(
                    paste_button=btn,
                    tabname=tab,
                    source_image_component=img,
                    source_text_component=img_file_info
                )
            )

        return ((baidu_netdisk, "无边图像浏览", "infinite-image-browsing"),)





def on_img_saved(params: script_callbacks.ImageSaveParams):
    AutoUpload.files.append(params.filename)
    

script_callbacks.on_ui_tabs(on_ui_tabs)
script_callbacks.on_app_started(baidu_netdisk_api)
script_callbacks.on_image_saved(on_img_saved)