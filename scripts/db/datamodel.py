from sqlite3 import Connection, connect
from typing import Dict, List, Optional
from scripts.tool import cwd, get_modified_date, human_readable_size, tags_translate
from contextlib import closing
import os


class DataBase:
    _conn: Optional[Connection] = None

    _initing = False

    @classmethod
    def get_conn(clz) -> Connection:
        if not clz._conn:
            clz.init()
        return clz._conn

    @classmethod
    def init(clz):
        # 创建连接并打开数据库
        conn = connect(os.path.join(cwd, "iib.db"))
        clz._conn = conn
        Floder.create_table(conn)
        ImageTag.create_table(conn)
        Tag.create_table(conn)
        Image.create_table(conn)


class Image:
    def __init__(self, path, exif=None, size=0, date="", id=None):
        self.path = path
        self.exif = exif
        self.id = id
        self.size = size
        self.date = date

    def to_file_info(self):
        return {
            "type": "file",
            "id": self.id,
            "date": self.date,
            "size": human_readable_size(self.size),
            "bytes": self.size,
            "name": os.path.basename(self.path),
            "fullpath": self.path,
        }

    def save(self, conn):
        with closing(conn.cursor()) as cur:
            cur.execute(
                "INSERT OR REPLACE  INTO image (path, exif, size, date) VALUES (?, ?, ?, ?)",
                (self.path, self.exif, self.size, self.date),
            )
            self.id = cur.lastrowid

    @classmethod
    def get(cls, conn: Connection, id_or_path):
        with closing(conn.cursor()) as cur:
            cur.execute(
                "SELECT * FROM image WHERE id = ? OR path = ?", (id_or_path, id_or_path)
            )
            row = cur.fetchone()
            if row is None:
                return None
            else:
                return cls.from_row(row)

    @classmethod
    def get_by_ids(cls, conn: Connection, ids: List[int]) -> List["Image"]:
        if not ids:
            return []

        query = """
            SELECT * FROM image
            WHERE id IN ({})
        """.format(
            ",".join("?" * len(ids))
        )

        with closing(conn.cursor()) as cur:
            cur.execute(query, ids)
            rows = cur.fetchall()

        images = []
        for row in rows:
            images.append(cls.from_row(row))
        return images

    @classmethod
    def create_table(cls, conn):
        with closing(conn.cursor()) as cur:
            cur.execute(
                """CREATE TABLE IF NOT EXISTS image (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            path TEXT UNIQUE,
                            exif TEXT,
                            size INTEGER,
                            date TEXT
                        )"""
            )
            cur.execute("CREATE INDEX IF NOT EXISTS image_idx_path ON image(path)")

    @classmethod
    def count(cls, conn):
        with closing(conn.cursor()) as cur:
            cur.execute("SELECT COUNT(*) FROM image")
            count = cur.fetchone()[0]
            return count

    @classmethod
    def from_row(cls, row: tuple):
        image = cls(path=row[1], exif=row[2], size=row[3], date=row[4])
        image.id = row[0]
        return image

    @classmethod
    def remove(cls, conn: Connection, image_id: int) -> None:
        with closing(conn.cursor()) as cur:
            cur.execute("DELETE FROM image WHERE id = ?", (image_id,))
            conn.commit()


class Tag:
    def __init__(self, name: str, score: int, type: str, count=0):
        self.name = name
        self.score = score
        self.type = type
        self.count = count
        self.id = None
        self.display_name = tags_translate.get(name)

    def save(self, conn):
        with closing(conn.cursor()) as cur:
            cur.execute(
                "INSERT OR REPLACE INTO tag (id, name, score, type, count) VALUES (?, ?, ?, ?, ?)",
                (self.id, self.name, self.score, self.type, self.count),
            )
            self.id = cur.lastrowid

    @classmethod
    def remove(cls, conn, tag_id):
        with closing(conn.cursor()) as cur:
            cur.execute("DELETE FROM tag WHERE id = ?", (tag_id,))
            conn.commit()

    @classmethod
    def get(cls, conn: Connection, id):
        with closing(conn.cursor()) as cur:
            cur.execute("SELECT * FROM tag WHERE id = ?", (id,))
            row = cur.fetchone()
            if row is None:
                return None
            else:
                return cls.from_row(row)

    @classmethod
    def get_all_custom_tag(cls, conn):
        with closing(conn.cursor()) as cur:
            cur.execute("SELECT * FROM tag where type = 'custom'")
            rows = cur.fetchall()
            tags: list[Tag] = []
            for row in rows:
                tags.append(cls.from_row(row))
            return tags

    @classmethod
    def get_all(cls, conn):
        with closing(conn.cursor()) as cur:
            cur.execute("SELECT * FROM tag")
            rows = cur.fetchall()
            tags: list[Tag] = []
            for row in rows:
                tags.append(cls.from_row(row))
            return tags

    @classmethod
    def get_or_create(cls, conn: Connection, name, score=None, type=None):
        with closing(conn.cursor()) as cur:
            cur.execute("SELECT tag.* FROM tag WHERE name = ?", (name,))
            row = cur.fetchone()
            if row is None:
                tag = cls(name=name, score=score, type=type)
                tag.save(conn)
                return tag
            else:
                return cls.from_row(row)

    @classmethod
    def from_row(cls, row: tuple):
        tag = cls(name=row[1], score=row[2], type=row[3], count=row[4])
        tag.id = row[0]
        return tag

    @classmethod
    def create_table(cls, conn):
        with closing(conn.cursor()) as cur:
            cur.execute(
                """CREATE TABLE IF NOT EXISTS tag (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE,
            score INTEGER,
            type TEXT,
            count INTEGER
            );
            """
            )
            cur.execute("CREATE INDEX IF NOT EXISTS tag_idx_name ON tag(name)")
            cur.execute(
                """INSERT OR IGNORE INTO tag(name, score, type, count)
                VALUES ("like", 0, "custom", 0);
                """
            )


class ImageTag:
    def __init__(self, image_id: int, tag_id: int):
        assert tag_id and image_id
        self.image_id = image_id
        self.tag_id = tag_id

    def save(self, conn):
        with closing(conn.cursor()) as cur:
            cur.execute(
                "INSERT INTO image_tag (image_id, tag_id) VALUES (?, ?)",
                (self.image_id, self.tag_id),
            )

    @classmethod
    def get_tags_for_image(cls, conn: Connection, image_id):
        with closing(conn.cursor()) as cur:
            cur.execute(
                "SELECT tag.* FROM tag INNER JOIN image_tag ON tag.id = image_tag.tag_id WHERE image_tag.image_id = ?",
                (image_id,),
            )
            rows = cur.fetchall()
            tags: list[Tag] = []
            for row in rows:
                tag = Tag(name=row[1], score=row[2], type=row[3])
                tag.id = row[0]
                tags.append(tag)
            return tags

    @classmethod
    def get_images_for_tag(cls, conn: Connection, tag_id):
        with closing(conn.cursor()) as cur:
            cur.execute(
                "SELECT image.* FROM image INNER JOIN image_tag ON image.id = image_tag.image_id WHERE image_tag.tag_id = ?",
                (tag_id,),
            )
            rows = cur.fetchall()
            images = []
            for row in rows:
                image = Image(path=row[1], exif=row[2])
                image.id = row[0]
                images.append(image)
            return images

    @classmethod
    def create_table(cls, conn):
        with closing(conn.cursor()) as cur:
            cur.execute(
                """CREATE TABLE IF NOT EXISTS image_tag (
                            image_id INTEGER,
                            tag_id INTEGER,
                            FOREIGN KEY (image_id) REFERENCES image(id),
                            FOREIGN KEY (tag_id) REFERENCES tag(id),
                            PRIMARY KEY (image_id, tag_id)
                        )"""
            )

    @classmethod
    def get_images_by_tags(
        cls, conn: Connection, tag_dict: Dict[str, List[int]], limit: int = 500
    ) -> List[Image]:
        query = """
            SELECT image.id, image.path, image.size,image.date
            FROM image
            INNER JOIN image_tag ON image.id = image_tag.image_id
        """

        where_clauses = []
        params = []

        for operator, tag_ids in tag_dict.items():
            if operator == "and":
                where_clauses.append(
                    "tag_id IN ({})".format(",".join("?" * len(tag_ids)))
                )
                params.extend(tag_ids)
            elif operator == "not":
                where_clauses.append(
                    "tag_id NOT IN ({})".format(",".join("?" * len(tag_ids)))
                )
                params.extend(tag_ids)

        if where_clauses:
            query += " WHERE " + " AND ".join(where_clauses)

        query += " GROUP BY image.id"

        if "and" in tag_dict:
            query += " HAVING COUNT(DISTINCT tag_id) = ?"
            params.append(len(tag_dict["and"]))

        query += " ORDER BY date DESC LIMIT ?"
        params.append(limit)
        with closing(conn.cursor()) as cur:
            cur.execute(query, params)
            rows = cur.fetchall()
            return [
                Image(id=row[0], path=row[1], size=row[2], date=row[3]) for row in rows
            ]

    @classmethod
    def remove(
        cls,
        conn: Connection,
        image_id: Optional[int] = None,
        tag_id: Optional[int] = None,
    ) -> None:
        assert image_id or tag_id
        with closing(conn.cursor()) as cur:
            if tag_id and image_id:
                cur.execute(
                    "DELETE FROM image_tag WHERE image_id = ? and tag_id = ?",
                    (image_id, tag_id),
                )
            elif tag_id:
                cur.execute("DELETE FROM image_tag WHERE tag_id = ?", (tag_id,))
            else:
                cur.execute("DELETE FROM image_tag WHERE image_id = ?", (image_id,))
            conn.commit()


class Floder:
    def __init__(self, id: int, path: str, modified_date: str):
        self.id = id
        self.path = path
        self.modified_date = modified_date

    @classmethod
    def create_table(cls, conn):
        with closing(conn.cursor()) as cur:
            cur.execute(
                """CREATE TABLE IF NOT EXISTS folders
                        (id INTEGER PRIMARY KEY AUTOINCREMENT,
                        path TEXT,
                        modified_date TEXT)"""
            )
            cur.execute("CREATE INDEX IF NOT EXISTS folders_idx_path ON folders(path)")

    @classmethod
    def check_need_update(cls, conn: Connection, folder_path: str):
        folder_path = os.path.normpath(folder_path)
        with closing(conn.cursor()) as cur:
            cur.execute("SELECT * FROM folders WHERE path=?", (folder_path,))
            folder_record = cur.fetchone()  # 如果这个文件夹没有记录，或者修改时间与数据库不同，则需要修改
            return not folder_record or (
                folder_record[2] != get_modified_date(folder_path)
            )

    @classmethod
    def update_modified_date_or_create(cls, conn: Connection, folder_path: str):
        folder_path = os.path.normpath(folder_path)
        with closing(conn.cursor()) as cur:
            cur.execute("SELECT * FROM folders WHERE path = ?", (folder_path,))
            row = cur.fetchone()
            if row:
                cur.execute(
                    "UPDATE folders SET modified_date = ? WHERE path = ?",
                    (get_modified_date(folder_path), folder_path),
                )
            else:
                cur.execute(
                    "INSERT INTO folders (path, modified_date) VALUES (?, ?)",
                    (folder_path, get_modified_date(folder_path)),
                )

    @classmethod
    def get_expired_dirs(cls, conn: Connection):
        dirs: List[str] = []
        with closing(conn.cursor()) as cur:
            cur.execute("SELECT * FROM folders")
            result_set = cur.fetchall()
            for row in result_set:
                folder_path = row[1]
                if (
                    os.path.exists(folder_path)
                    and get_modified_date(folder_path) != row[2]
                ):
                    dirs.append(folder_path)
            return dirs
