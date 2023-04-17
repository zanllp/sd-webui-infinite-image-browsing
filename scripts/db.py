import sqlite3
import os
from scripts.tool import cwd

# 定义数据库文件名
DB_FILE = os.path.join(cwd,"infinite-image-browsing.db")

# 初始化数据库连接
conn = sqlite3.connect(DB_FILE)

# 定义一个类来表示数据库中的图像文件
class Image:
    def __init__(self, id, filename, filepath, exif):
        self.id = id
        self.filename = filename
        self.filepath = filepath
        self.exif = exif

    # 插入数据
    @classmethod
    def insert(cls, filename, filepath, exif):
        cursor = conn.cursor()
        cursor.execute("INSERT INTO images (filename, filepath, exif) VALUES (?, ?, ?)", (filename, filepath, exif))
        conn.commit()
        return cls(cursor.lastrowid, filename, filepath, exif)

    # 查询数据
    @classmethod
    def search(cls, keyword):
        cursor = conn.cursor()
        cursor.execute("SELECT id, filename, filepath, exif FROM images WHERE filename LIKE ? OR exif LIKE ?", ('%'+keyword+'%', '%'+keyword+'%'))
        results = cursor.fetchall()
        return [cls(*row) for row in results]

    # 删除数据
    def delete(self):
        cursor = conn.cursor()
        cursor.execute("DELETE FROM images WHERE id = ?", (self.id,))
        conn.commit()

# 定义一个函数来创建数据库表
def create_table():
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS images (
            id INTEGER PRIMARY KEY,
            filename TEXT,
            filepath TEXT,
            exif TEXT
        )
    """)
    conn.commit()