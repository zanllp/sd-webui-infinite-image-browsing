from scripts.iib.api import infinite_image_browsing_api, send_img_path
from modules import script_callbacks, generation_parameters_copypaste as send
from scripts.iib.tool import locale
from scripts.iib.tool import read_info_from_image
from PIL import Image
from scripts.iib.logger import logger


"""
api函数声明和启动分离方便另外一边被外部调用
"""


def on_ui_tabs():
    import gradio as gr

    with gr.Blocks(analytics_enabled=False) as view:
        with gr.Row():
            with gr.Column():
                gr.HTML("error", elem_id="infinite_image_browsing_container_wrapper")
                # 以下是使用2个组件模拟粘贴过程
                img = gr.Image(
                    type="pil",
                    elem_id="iib_hidden_img",
                )

                def on_img_change():
                    send_img_path["value"] = ""  # 真正收到图片改变才允许放行

                img.change(on_img_change)

                img_update_trigger = gr.Button(
                    "button", elem_id="iib_hidden_img_update_trigger"
                )

                # 修改文本和图像，等待修改完成后前端触发粘贴按钮
                # 有时在触发后收不到回调，可能是在解析params。txt时除了问题删除掉就行了
                def img_update_func():
                    try:
                        path = send_img_path.get("value")
                        logger.info("img_update_func %s", path)
                        img = Image.open(path)
                        info = read_info_from_image(img)
                        return img, info
                    except Exception as e:
                        logger.error("img_update_func %s",e)

                img_file_info = gr.Textbox(elem_id="iib_hidden_img_file_info")
                img_update_trigger.click(img_update_func, outputs=[img, img_file_info])
                for tab in ["txt2img", "img2img", "inpaint", "extras"]:
                    btn = gr.Button(f"Send to {tab}", elem_id=f"iib_hidden_tab_{tab}")
                    # 注册粘贴
                    send.register_paste_params_button(
                        send.ParamBinding(
                            paste_button=btn,
                            tabname=tab,
                            source_image_component=img,
                            source_text_component=img_file_info,
                        )
                    )

        return (
            (
                view,
                "无边图像浏览" if locale == "zh" else "Infinite image browsing",
                "infinite-image-browsing",
            ),
        )


script_callbacks.on_ui_tabs(on_ui_tabs)
script_callbacks.on_app_started(infinite_image_browsing_api)
