from typing import Dict, List
from scripts.db.datamodel import Image as DbImg, Tag, ImageTag, DataBase, Floder
import os
from PIL import Image
from scripts.tool import (
    read_info_from_image,
    parse_generation_parameters,
    is_valid_image_path,
    get_modified_date,
    is_dev,
)

from scripts.logger import logger


# 定义一个函数来获取图片文件的EXIF数据
def get_exif_data(file_path):
    try:
        with Image.open(file_path) as img:
            info = read_info_from_image(img)
            return parse_generation_parameters(info), info
    except Exception as e:
        if is_dev:
            logger.error("get_exif_data %s", e)


def update_image_data(search_dirs: List[str]):
    conn = DataBase.get_conn()
    tag_incr_count_rec: Dict[int, int] = {}

    def safe_save_img_tag(img_tag: ImageTag):
        tag_incr_count_rec[img_tag.tag_id] = (
            tag_incr_count_rec.get(img_tag.tag_id, 0) + 1
        )
        img_tag.save(conn)  # 原先用来处理一些意外，但是写的正确完全没问题,去掉了try catch

    # 递归处理每个文件夹
    def process_folder(folder_path: str):
        if not Floder.check_need_update(conn, folder_path):
            return
        print(f"Processing folder: {folder_path}")
        for filename in os.listdir(folder_path):
            file_path = os.path.normpath(os.path.join(folder_path, filename))

            if os.path.isdir(file_path):
                process_folder(file_path)

            elif is_valid_image_path(file_path):
                if DbImg.get(conn, file_path):  # 已存在的跳过
                    continue
                exif_data = get_exif_data(file_path)
                if not exif_data:
                    continue
                exif, lora, pos, _ = exif_data[0]
                img = DbImg(
                    file_path,
                    exif_data[1],
                    os.path.getsize(file_path),
                    get_modified_date(file_path),
                )
                img.save(conn)

                size_tag = Tag.get_or_create(
                    conn,
                    str(exif.get("Size-1", 0)) + " * " + str(exif.get("Size-2", 0)),
                    type="size",
                )
                safe_save_img_tag(ImageTag(img.id, size_tag.id))

                for k in ["Model", "Sampler"]:
                    v = exif.get(k)
                    if not v:
                        continue
                    tag = Tag.get_or_create(conn, str(v),  k)
                    safe_save_img_tag(ImageTag(img.id, tag.id))
                for i in lora:
                    tag = Tag.get_or_create(conn, i["name"], "lora")
                    safe_save_img_tag(ImageTag(img.id, tag.id))
                for k in pos:
                    tag = Tag.get_or_create(conn, k, "pos")
                    safe_save_img_tag(ImageTag(img.id, tag.id))
                # neg暂时跳过感觉个没人会搜索这个

        # 提交对数据库的更改
        Floder.update_modified_date_or_create(conn, folder_path)
        conn.commit()

    for dir in search_dirs:
        process_folder(dir)
        conn.commit()
    for tag_id in tag_incr_count_rec:
        tag = Tag.get(conn, tag_id)
        tag.count += tag_incr_count_rec[tag_id]
        tag.save(conn)
    conn.commit()
