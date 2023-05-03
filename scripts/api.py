from datetime import datetime, timedelta
import os
import shutil
from scripts.tool import (
    human_readable_size,
    is_valid_image_path,
    temp_path,
    read_info_from_image,
    get_modified_date,
    is_win,
    cwd,
    locale,
)
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
import asyncio
from typing import Any, List, Literal, Optional
from pydantic import BaseModel
from fastapi.responses import FileResponse, RedirectResponse
from PIL import Image
import hashlib
from urllib.parse import urlencode
from scripts.db.datamodel import DataBase, Image as DbImg, Tag, Floder, ImageTag
from scripts.db.update_image_data import update_image_data
from scripts.tool import get_windows_drives
from scripts.logger import logger


send_img_path = {"value": ""}


def infinite_image_browsing_api(_: Any, app: FastAPI, **kwargs):
    pre = "/infinite_image_browsing"
    app.mount(
        f"{pre}/fe-static",
        StaticFiles(directory=f"{cwd}/vue/dist"),
        name="infinite_image_browsing-fe-static",
    )

    def get_sd_webui_conf():
        try:
            from modules.shared import opts

            return opts.data
        except:
            pass
        try:
            with open(kwargs.get("sd_webui_config"), "r") as f:
                import json

                return json.loads(f.read())
        except:
            pass
        return {}

    @app.get(f"{pre}/hello")
    async def greeting():
        return "hello"

    @app.get(f"{pre}/global_setting")
    async def global_setting():
        all_custom_tags = []
        try:
            all_custom_tags = Tag.get_all_custom_tag(DataBase.get_conn())
        except Exception as e:
            print(e)
        return {
            "global_setting": get_sd_webui_conf(),
            "cwd": cwd,
            "is_win": is_win,
            "home": os.environ.get("USERPROFILE") if is_win else os.environ.get("HOME"),
            "sd_cwd": os.getcwd(),
            "all_custom_tags": all_custom_tags,
        }

    class DeleteFilesReq(BaseModel):
        file_paths: List[str]

    @app.post(pre + "/delete_files/{target}")
    async def delete_files(req: DeleteFilesReq, target: Literal["local", "netdisk"]):
        if target == "local":
            conn = DataBase.get_conn()
            for path in req.file_paths:
                try:
                    if os.path.isdir(path):
                        if len(os.listdir(path)):
                            error_msg = (
                                "When a folder is not empty, it is not allowed to be deleted."
                                if locale == "en"
                                else "文件夹不为空时不允许删除。"
                            )
                            raise HTTPException(400, detail=error_msg)
                        shutil.rmtree(path)
                    else:
                        os.remove(path)
                        img = DbImg.get(conn, os.path.normpath(path))
                        if img:
                            logger.info("delete file: %s", path)
                            ImageTag.remove(conn, img.id)
                            DbImg.remove(conn, img.id)
                except OSError as e:
                    # 处理删除失败的情况
                    logger.error("delete failed")
                    error_msg = (
                        f"Error deleting file {path}: {e}"
                        if locale == "en"
                        else f"删除文件 {path} 时出错：{e}"
                    )
                    raise HTTPException(400, detail=error_msg)
        else:
            pass

    class MoveFilesReq(BaseModel):
        file_paths: List[str]
        dest: str

    @app.post(pre + "/move_files/{target}")
    async def move_files(req: MoveFilesReq, target: Literal["local", "netdisk"]):
        conn = DataBase.get_conn()
        if target == "local":
            for path in req.file_paths:
                try:
                    shutil.move(path, req.dest)
                    img = DbImg.get(conn, os.path.normpath(path))
                    if img:
                        ImageTag.remove(conn, img.id)
                        DbImg.remove(conn, img.id)
                except OSError as e:
                    error_msg = (
                        f"Error moving file {path} to {req.dest}: {e}"
                        if locale == "en"
                        else f"移动文件 {path} 到 {req.dest} 时出错：{e}"
                    )
                    raise HTTPException(400, detail=error_msg)
        else:
            pass

    @app.get(pre + "/files/{target}")
    async def get_target_floder_files(
        target: Literal["local", "netdisk"], folder_path: str
    ):
        files = []
        try:
            if target == "local":
                if is_win and folder_path == "/":
                    for item in get_windows_drives():
                        files.append(
                            {"type": "dir", "size": "-", "name": item, "fullpath": item}
                        )
                else:
                    for item in os.listdir(folder_path):
                        path = os.path.join(folder_path, item)
                        if not os.path.exists(path):
                            continue
                        date = get_modified_date(path)
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
                                    "fullpath": os.path.normpath(
                                        os.path.join(folder_path, item)
                                    ),
                                }
                            )
                        elif os.path.isdir(path):
                            files.append(
                                {
                                    "type": "dir",
                                    "date": date,
                                    "size": "-",
                                    "name": item,
                                    "fullpath": os.path.normpath(
                                        os.path.join(folder_path, item)
                                    ),
                                }
                            )
            else:
                pass

        except Exception as e:
            logger.error(e)
            raise HTTPException(status_code=400, detail=str(e))

        return {"files": files}

    @app.get(pre + "/image-thumbnail")
    async def thumbnail(path: str, size: str = "256,256"):
        if not temp_path:
            encoded_params = urlencode({"filename": path})
            return RedirectResponse(url=f"{pre}/file?{encoded_params}")
        # 生成缓存文件的路径
        hash = hashlib.md5((path + size).encode("utf-8")).hexdigest()
        cache_path = os.path.join(temp_path, f"{hash}.webp")

        # 如果缓存文件存在，则直接返回该文件
        if os.path.exists(cache_path):
            return FileResponse(
                cache_path,
                media_type="image/webp",
                headers={"Cache-Control": "max-age=31536000", "ETag": hash},
            )

        # 如果缓存文件不存在，则生成缩略图并保存
        with Image.open(path) as img:
            w, h = size.split(",")
            img.thumbnail((int(w), int(h)))
            img.save(cache_path, "webp")

        # 返回缓存文件
        return FileResponse(
            cache_path,
            media_type="image/webp",
            headers={"Cache-Control": "max-age=31536000", "ETag": hash},
        )

    forever_cache_path = []
    img_search_dirs = []
    try:

        def get_config_path(
            conf,
            keys=[
                "outdir_txt2img_samples",
                "outdir_img2img_samples",
                "outdir_save",
                "outdir_extras_samples",
                "outdir_grids",
                "outdir_img2img_grids",
                "outdir_samples",
                "outdir_txt2img_grids",
            ],
        ):
            # 获取配置项
            paths = [conf.get(key) for key in keys]

            # 判断路径是否有效并转为绝对路径
            abs_paths = []
            for path in paths:
                if not path or len(path.strip()) == 0:
                    continue
                if os.path.isabs(path):  # 已经是绝对路径
                    abs_path = path
                else:  # 转为绝对路径
                    abs_path = os.path.join(os.getcwd(), path)
                if os.path.exists(abs_path):  # 判断路径是否存在
                    abs_paths.append(abs_path)

            return abs_paths

        forever_cache_path = get_config_path(get_sd_webui_conf())
        img_search_dirs = forever_cache_path
    except:
        pass

    def need_cache(path, parent_paths=forever_cache_path):
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

    @app.get(pre + "/file")
    async def get_file(filename: str, disposition: Optional[str] = None):
        import mimetypes

        if not os.path.exists(filename):
            raise HTTPException(status_code=404)
        if not os.path.isfile(filename):
            raise HTTPException(status_code=400, detail=f"{filename} is not a file")
        # 根据文件后缀名获取媒体类型
        media_type, _ = mimetypes.guess_type(filename)
        headers = {}
        if disposition:
            headers["Content-Disposition"] = f'attachment; filename="{disposition}"'
        if need_cache(filename) and is_valid_image_path(filename):  # 认为永远不变,不要协商缓存了试试
            headers["Cache-Control"] = "public, max-age=31536000"
            headers["Expires"] = (datetime.now() + timedelta(days=365)).strftime(
                "%a, %d %b %Y %H:%M:%S GMT"
            )

        return FileResponse(
            filename,
            media_type=media_type,
            headers=headers,
        )

    @app.post(pre + "/send_img_path")
    async def api_set_send_img_path(path: str):
        send_img_path["value"] = path

    # 等待图片信息生成完成
    @app.get(pre + "/gen_info_completed")
    async def api_set_send_img_path():
        for _ in range(600):  # 等待60s
            if send_img_path["value"] == "":  # 等待setup里面生成完成
                return True
            v = send_img_path["value"]
            logger.info("gen_info_completed %s %s", _, v)
            await asyncio.sleep(0.1)
        return send_img_path["value"] == ""

    @app.get(pre + "/image_geninfo")
    async def image_geninfo(path: str):
        with Image.open(path) as img:
            return read_info_from_image(img)

    class CheckPathExistsReq(BaseModel):
        paths: List[str]

    @app.post(pre + "/check_path_exists")
    async def check_path_exists(req: CheckPathExistsReq):
        res = {}
        for path in req.paths:
            res[path] = os.path.exists(path)
        return res

    @app.get(pre)
    def index_bd():
        return FileResponse(os.path.join(cwd, "vue/dist/index.html"))

    db_pre = pre + "/db"

    @app.get(db_pre + "/basic_info")
    async def get_db_basic_info():
        conn = DataBase.get_conn()
        img_count = DbImg.count(conn)
        tags = Tag.get_all(conn)
        expired_dirs = Floder.get_expired_dirs(conn)
        return {
            "img_count": img_count,
            "tags": tags,
            "expired": len(expired_dirs) != 0,
            "expired_dirs": expired_dirs,
        }

    @app.post(db_pre + "/update_image_data")
    async def update_image_db_data():
        try:
            DataBase._initing = True
            conn = DataBase.get_conn()
            img_count = DbImg.count(conn)
            update_image_data(
                img_search_dirs if img_count == 0 else Floder.get_expired_dirs(conn)
            )
        finally:
            DataBase._initing = False

    @app.get(db_pre + "/match_images_by_tags")
    async def match_image_by_tags(tag_ids: str):
        ids = [int(x) for x in tag_ids.split(",")]
        conn = DataBase.get_conn()
        return [
            x.to_file_info() for x in ImageTag.get_images_by_tags(conn, {"and": ids})
        ]

    @app.get(db_pre + "/img_selected_custom_tag")
    async def get_img_selected_custom_tag(path: str):
        path = os.path.normpath(path)
        if not need_cache(path):
            return []
        conn = DataBase.get_conn()
        img = DbImg.get(conn, path)
        if not img:
            if DbImg.count(conn) == 0:
                return []
            update_image_data([os.path.dirname(path)])
            img = DbImg.get(conn, path)
        assert img
        # tags = Tag.get_all_custom_tag()
        return ImageTag.get_tags_for_image(conn, img.id, type="custom")

    class ToggleCustomTagToImgReq(BaseModel):
        img_path: str
        tag_id: int

    @app.post(db_pre + "/toggle_custom_tag_to_img")
    async def toggle_custom_tag_to_img(req: ToggleCustomTagToImgReq):
        conn = DataBase.get_conn()
        path = os.path.normpath(req.img_path)
        if not need_cache(path):
            raise HTTPException(
                400,
                "非 Stable Diffusion webui 文件夹下不支持切换 tag，如果有需要请提 Issue"
                if locale == "zh"
                else "Tag toggleing is not supported outside the Stable Diffusion webui folder. Please open an issue if you have any questions.",
            )
        img = DbImg.get(conn, path)
        if not img:
            raise HTTPException(
                400,
                "你需要先通过图像搜索页生成索引"
                if locale == "zh"
                else "You need to generate an index through the image search page first.",
            )
        tags = ImageTag.get_tags_for_image(
            conn=conn, image_id=img.id, type="custom", tag_id=req.tag_id
        )
        is_remove = len(tags)
        if is_remove:
            ImageTag.remove(conn, img.id, tags[0].id)
        else:
            ImageTag(img.id, req.tag_id).save(conn)
        conn.commit()
        return {"is_remove": is_remove}

    class AddCustomTagReq(BaseModel):
        tag_name: str

    @app.post(db_pre + "/add_custom_tag")
    async def add_custom_tag(req: AddCustomTagReq):
        conn = DataBase.get_conn()
        tag = Tag.get_or_create(conn, name=req.tag_name, type="custom")
        conn.commit()
        return tag

    class RemoveCustomTagReq(BaseModel):
        tag_id: str

    @app.post(db_pre + "/remove_custom_tag")
    async def remove_custom_tag(req: RemoveCustomTagReq):
        conn = DataBase.get_conn()
        ImageTag.remove(conn, tag_id=req.tag_id)
        Tag.remove(conn, req.tag_id)

    class RemoveCustomTagFromReq(BaseModel):
        img_id: int
        tag_id: str

    @app.post(db_pre + "/remove_custom_tag_from_img")
    async def remove_custom_tag_from_img(req: RemoveCustomTagFromReq):
        conn = DataBase.get_conn()
        ImageTag.remove(conn, image_id=req.img_id, tag_id=req.tag_id)
