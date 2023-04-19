import sqlite3
from scripts.db.datamodel import conn, Image as DbImg, Tag, ImageTag, DataBase
import os
from PIL import Image
from scripts.tool import (
    read_info_from_image,
    parse_generation_parameters,
    is_valid_image_path,
    get_modified_date,
)

# 定义一个函数来获取图片文件的EXIF数据
def get_exif_data(file_path):
    try:
        with Image.open(file_path) as img:
            info = read_info_from_image(img)
            return parse_generation_parameters(info)
    except:
        pass
    return None

def init_image_data():
    conn = DataBase.get_conn()
    c = conn.cursor()
    
    # 创建已完成文件夹表
    c.execute(
        """CREATE TABLE IF NOT EXISTS folders
                (id INTEGER PRIMARY KEY AUTOINCREMENT,
                path TEXT,
                modified_date TEXT)"""
    )

    # 递归处理每个文件夹
    def process_folder(folder_path: str):
        # 检查这个文件夹是否已经记录在数据库中
        c.execute("SELECT * FROM folders WHERE path=?", (folder_path,))
        folder_record = c.fetchone()

        # 如果这个文件夹没有记录，或者修改时间与数据库不同，则继续
        if not folder_record or (folder_path) != folder_record[2]:
            print(f"Processing folder: {folder_path}")

            c.execute(
                "INSERT INTO folders (path, modified_date) VALUES (?, ?)",
                (folder_path, get_modified_date(folder_path)),
            )

            for filename in os.listdir(folder_path):
                file_path = os.path.join(folder_path, filename)

                if os.path.isdir(file_path):
                    process_folder(file_path)

                elif is_valid_image_path(file_path):
                    exif_data = get_exif_data(file_path)
                    if not exif_data:
                        continue
                    exif, lora, pos, neg = exif_data
                    img = DbImg(file_path)
                    img.save(conn)

                    def safe_save_img_tag(img_tag: ImageTag):
                        img_tag.save(conn)  # 原先用来处理一些意外，但是写的正确完全没问题

                    size_tag = Tag.get_or_create(
                        conn,
                        str(exif.get("Size-1", 0)) + " * " + str(exif.get("Size-2", 0)),
                        type="size",
                    )
                    size_img_tag = ImageTag(img.id, size_tag.id)
                    safe_save_img_tag(size_img_tag)

                    for k in ["Model", "Sampler"]:
                        v = exif.get(k)
                        if not v:
                            continue
                        tag = Tag.get_or_create(conn, str(v), None, k)
                        img_tag = ImageTag(img.id, tag.id)
                        safe_save_img_tag(img_tag)
                    for i in lora:
                        tag = Tag.get_or_create(conn, i["name"], None, "lora")
                        img_tag = ImageTag(img.id, tag.id)
                        safe_save_img_tag(img_tag)
                    for k in pos:
                        tag = Tag.get_or_create(conn, k, None, "pos")
                        img_tag = ImageTag(img.id, tag.id)
                        safe_save_img_tag(img_tag)
                    # neg暂时跳过感觉个没人会搜索这个

            # 提交对数据库的更改
            conn.commit()
