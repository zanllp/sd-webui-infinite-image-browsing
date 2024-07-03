from contextlib import closing
from typing import Dict, List
from scripts.iib.db.datamodel import Image as DbImg, Tag, ImageTag, DataBase, Folder
import os
from scripts.iib.tool import (
    is_valid_media_path,
    get_modified_date,
    get_video_type,
    is_dev,
    get_modified_date,
    is_image_file,
    case_insensitive_get
)
from scripts.iib.parsers.model import ImageGenerationInfo, ImageGenerationParams
from scripts.iib.logger import logger
from scripts.iib.parsers.index import parse_image_info
from scripts.iib.plugin import plugin_inst_map

# 定义一个函数来获取图片文件的EXIF数据
def get_exif_data(file_path):
    if get_video_type(file_path):
        return ImageGenerationInfo()
    try:
        return parse_image_info(file_path)
    except Exception as e:
        if is_dev:
            logger.error("get_exif_data %s", e)
    return ImageGenerationInfo()


def update_image_data(search_dirs: List[str], is_rebuild = False):
    conn = DataBase.get_conn()
    tag_incr_count_rec: Dict[int, int] = {}

    if is_rebuild:
        Folder.remove_all(conn)

    def safe_save_img_tag(img_tag: ImageTag):
        tag_incr_count_rec[img_tag.tag_id] = (
            tag_incr_count_rec.get(img_tag.tag_id, 0) + 1
        )
        img_tag.save_or_ignore(conn)  # 原先用来处理一些意外，但是写的正确完全没问题,去掉了try catch

    # 递归处理每个文件夹
    def process_folder(folder_path: str):
        if not Folder.check_need_update(conn, folder_path):
            return
        print(f"Processing folder: {folder_path}")
        for filename in os.listdir(folder_path):
            file_path = os.path.normpath(os.path.join(folder_path, filename))
            try:

                if os.path.isdir(file_path):
                    process_folder(file_path)
                elif is_valid_media_path(file_path):
                    build_single_img_idx(conn, file_path, is_rebuild, safe_save_img_tag)
                # neg暂时跳过感觉个没人会搜索这个
            except Exception as e:
                logger.error("Tag generation failed. Skipping this file. file:%s error: %s", file_path, e)
        # 提交对数据库的更改
        Folder.update_modified_date_or_create(conn, folder_path)
        conn.commit()

    for dir in search_dirs:
        process_folder(dir)
        conn.commit()
    for tag_id in tag_incr_count_rec:
        tag = Tag.get(conn, tag_id)
        tag.count += tag_incr_count_rec[tag_id]
        tag.save(conn)
    conn.commit()

def add_image_data_single(file_path):
    conn = DataBase.get_conn()
    tag_incr_count_rec: Dict[int, int] = {}

    def safe_save_img_tag(img_tag: ImageTag):
        tag_incr_count_rec[img_tag.tag_id] = (
            tag_incr_count_rec.get(img_tag.tag_id, 0) + 1
        )
        img_tag.save_or_ignore(conn)

    file_path = os.path.normpath(file_path)
    try:
        if not is_valid_media_path(file_path):
            return
        build_single_img_idx(conn, file_path, False, safe_save_img_tag)
        # neg暂时跳过感觉个没人会搜索这个
    except Exception as e:
        logger.error("Tag generation failed. Skipping this file. file:%s error: %s", file_path, e)
        conn.commit()

    for tag_id in tag_incr_count_rec:
        tag = Tag.get(conn, tag_id)
        tag.count += tag_incr_count_rec[tag_id]
        tag.save(conn)
    conn.commit()

def rebuild_image_index(search_dirs: List[str]):
    conn = DataBase.get_conn()
    with closing(conn.cursor()) as cur:
        cur.execute(
            """DELETE FROM image_tag
            WHERE image_tag.tag_id IN (
                SELECT tag.id FROM tag WHERE tag.type <> 'custom'
            )
            """
        )
        cur.execute("""DELETE FROM tag WHERE tag.type <> 'custom'""")
        conn.commit()
        update_image_data(search_dirs=search_dirs, is_rebuild=True)


def get_extra_meta_keys_from_plugins(source_identifier: str):
    try:
        plugin = plugin_inst_map.get(source_identifier)
        if plugin:
            return plugin.extra_convert_to_tag_meta_keys
    except Exception as e:
        logger.error("get_extra_meta_keys_from_plugins %s", e)
    return []

def build_single_img_idx(conn, file_path, is_rebuild, safe_save_img_tag):
    img = DbImg.get(conn, file_path)
    parsed_params = None
    if is_rebuild:
        info = get_exif_data(file_path)
        parsed_params = info.params
        if not img:
            img = DbImg(
                file_path,
                info.raw_info,
                os.path.getsize(file_path),
                get_modified_date(file_path),
            )
            img.save(conn)
    else:
        if img:  # 已存在的跳过
            if img.date == get_modified_date(img.path):
                return
            else:
                DbImg.safe_batch_remove(conn=conn, image_ids=[img.id])
        info = get_exif_data(file_path)
        parsed_params = info.params
        img = DbImg(
            file_path,
            info.raw_info,
            os.path.getsize(file_path),
            get_modified_date(file_path),
        )
        img.save(conn)

    if not parsed_params:
        return
    meta = parsed_params.meta
    lora = parsed_params.extra.get("lora", [])
    lyco = parsed_params.extra.get("lyco", [])
    pos = parsed_params.pos_prompt
    size_tag = Tag.get_or_create(
        conn,
        str(meta.get("Size-1", 0)) + " * " + str(meta.get("Size-2", 0)),
        type="size",
    )
    safe_save_img_tag(ImageTag(img.id, size_tag.id))
    media_type_tag = Tag.get_or_create(conn, "Image" if is_image_file(file_path) else "Video", 'Media Type')
    safe_save_img_tag(ImageTag(img.id, media_type_tag.id))
    keys = [
        "Model",
        "Sampler",
        "Source Identifier",
        "Postprocess upscale by",
        "Postprocess upscaler",
        "Size",
        "Refiner",
        "Hires upscaler"
    ]
    keys += get_extra_meta_keys_from_plugins(meta.get("Source Identifier", ""))
    for k in keys:
        v = case_insensitive_get(meta, k)
        if not v:
            continue
        
        tag = Tag.get_or_create(conn, str(v), k)
        safe_save_img_tag(ImageTag(img.id, tag.id))
        if "Hires upscaler" == k:
            tag = Tag.get_or_create(conn, 'Hires All', k)
            safe_save_img_tag(ImageTag(img.id, tag.id))
        elif "Refiner" == k:
            tag = Tag.get_or_create(conn, 'Refiner All', k)
            safe_save_img_tag(ImageTag(img.id, tag.id))
    for i in lora:
        tag = Tag.get_or_create(conn, i["name"], "lora")
        safe_save_img_tag(ImageTag(img.id, tag.id))
    for i in lyco:
        tag = Tag.get_or_create(conn, i["name"], "lyco")
        safe_save_img_tag(ImageTag(img.id, tag.id))
    for k in pos:
        tag = Tag.get_or_create(conn, k, "pos")
        safe_save_img_tag(ImageTag(img.id, tag.id))