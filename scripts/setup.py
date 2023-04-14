from scripts.api import baidu_netdisk_api, send_img_path, AutoUpload
from modules import script_callbacks, generation_parameters_copypaste as send, extras
from scripts.tool import locale
from PIL import Image


"""
api函数声明和启动分离方便另外一边被外部调用
"""



def on_ui_tabs():
    import gradio as gr
    with gr.Blocks(analytics_enabled=False) as view:
        with gr.Row():
            with gr.Column():
                gr.HTML(
                    "如果你看到这个那说明此项那说明出现了问题", elem_id="baidu_netdisk_container_wrapper"
                )
        # 以下是使用2个组件模拟粘贴过程
        img = gr.Image(
            type="pil",
            elem_id="bd_hidden_img",
        )
        def on_img_change():
            send_img_path["value"] = '' # 真正收到图片改变才允许放行
        img.change(on_img_change)

        img_update_trigger = gr.Button("button", elem_id="bd_hidden_img_update_trigger")

        # 修改文本和图像，等待修改完成后前端触发粘贴按钮
        def img_update_func():
            path = send_img_path.get("value")
            geninfo,_ = extras.images.read_info_from_image(Image.open(path))
            return path, geninfo
        
        img_file_info = gr.Textbox(elem_id="bd_hidden_img_file_info")
        img_update_trigger.click(img_update_func, outputs=[img, img_file_info])
        for tab in ["txt2img", "img2img", "inpaint", "extras"]:
            btn = gr.Button(f"Send to {tab}", elem_id=f"bd_hidden_tab_{tab}")
            # 注册粘贴
            send.register_paste_params_button(
                send.ParamBinding(
                    paste_button=btn,
                    tabname=tab,
                    source_image_component=img,
                    source_text_component=img_file_info
                )
            )

        return ((view, "无边图像浏览" if locale == "zh" else "Infinite image browsing", "infinite-image-browsing"),)





def on_img_saved(params: script_callbacks.ImageSaveParams):
    AutoUpload.files.append(params.filename)
    

script_callbacks.on_ui_tabs(on_ui_tabs)
script_callbacks.on_app_started(baidu_netdisk_api)
script_callbacks.on_image_saved(on_img_saved)