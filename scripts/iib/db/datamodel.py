from sqlite3 import Connection, connect
from enum import Enum
from typing import Dict, List, Optional, TypedDict
from scripts.iib.tool import (
    cwd,
    get_modified_date,
    human_readable_size,
    tags_translate,
    is_dev,
    find,
    unique_by
)
from contextlib import closing
import os
import threading

class FileInfoDict(TypedDict):
    type: str
    date: float
    size: int
    name: str
    bytes: bytes
    created_time: float
    fullpath: str

class Cursor:
    def __init__(self, has_next = True, next = ''):
        self.has_next = has_next
        self.next = next

    
class DataBase:
    local = threading.local()

    _initing = False

    num = 0

    path = "iib.db"

    @classmethod
    def get_conn(clz) -> Connection:
        # for : sqlite3.ProgrammingError: SQLite objects created in a thread can only be used in that same thread
        if hasattr(clz.local, "conn"):
            return clz.local.conn
        else:
            conn = clz.init()
            clz.local.conn = conn
            return conn

    @classmethod
    def init(clz):
        # 创建连接并打开数据库
        conn = connect(clz.path if os.path.isabs(clz.path) else os.path.join(cwd, clz.path))
        try:            
            Floder.create_table(conn)
            ImageTag.create_table(conn)
            Tag.create_table(conn)
            Image.create_table(conn)
            ExtraPath.create_table(conn)
        finally:
            conn.commit()
        clz.num += 1
        if is_dev:
            print(f"当前连接数{clz.num}")
        return conn


class Image:
    def __init__(self, path, exif=None, size=0, date="", id=None):
        self.path = path
        self.exif = exif
        self.id = id
        self.size = size
        self.date = date

    def to_file_info(self) -> FileInfoDict:
        return {
            "type": "file",
            "id": self.id,
            "date": self.date,
            "created_date": self.date,
            "size": human_readable_size(self.size),
            "is_under_scanned_path": True,
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

    def update_path(self, conn: Connection, new_path: str):
        self.path = os.path.normpath(new_path)
        with closing(conn.cursor()) as cur:
            cur.execute(
                "UPDATE image SET path = ? WHERE id = ?",
                (self.path, self.id)
            )

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

    @classmethod
    def safe_batch_remove(cls, conn: Connection, image_ids: List[int]) -> None:
        if not(image_ids):
            return
        with closing(conn.cursor()) as cur:
            try:
                placeholders = ",".join("?" * len(image_ids))
                cur.execute(f"DELETE FROM image_tag WHERE image_id IN ({placeholders})", image_ids)
                cur.execute(f"DELETE FROM image WHERE id IN ({placeholders})", image_ids)
            except BaseException as e:
                print(e)
            finally:
                conn.commit()

    @classmethod
    def find_by_substring(cls, conn: Connection, substring: str, limit: int = 500, cursor = '') -> tuple[List["Image"], Cursor]:
        api_cur = Cursor()
        with closing(conn.cursor()) as cur:
            if cursor:
                sql = f"SELECT * FROM image WHERE (path LIKE ? OR exif LIKE ?) AND (date < ?) ORDER BY date DESC LIMIT ?"
                cur.execute(sql, (f"%{substring}%", f"%{substring}%", cursor, limit))
            else:
                sql = "SELECT * FROM image WHERE path LIKE ? OR exif LIKE ? ORDER BY date DESC LIMIT ?"
                cur.execute(sql, (f"%{substring}%", f"%{substring}%", limit))
            rows = cur.fetchall()
        
        api_cur.has_next = len(rows) >= limit
        images = []
        deleted_ids = []
        for row in rows:
            img = cls.from_row(row)
            if os.path.exists(img.path):
                images.append(img)
            else: 
                deleted_ids.append(img.id)
        cls.safe_batch_remove(conn, deleted_ids)        
        if images:
            api_cur.next = str(images[-1].date)
        return images, api_cur
    

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
    def get_or_create(cls, conn: Connection, name: str, type: str):
        assert name and type
        with closing(conn.cursor()) as cur:
            cur.execute(
                "SELECT tag.* FROM tag WHERE name = ? and type = ?", (name, type)
            )
            row = cur.fetchone()
            if row is None:
                tag = cls(name=name, score=0, type=type)
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
            name TEXT,
            score INTEGER,
            type TEXT,
            count INTEGER,
            UNIQUE(name, type) ON CONFLICT REPLACE
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
    def get_tags_for_image(
        cls,
        conn: Connection,
        image_id: int,
        tag_id: Optional[int] = None,
        type: Optional[str] = None,
    ):
        with closing(conn.cursor()) as cur:
            query = "SELECT tag.* FROM tag INNER JOIN image_tag ON tag.id = image_tag.tag_id WHERE image_tag.image_id = ?"
            params = [image_id]
            if tag_id:
                query += " AND image_tag.tag_id = ?"
                params.append(tag_id)
            if type:
                query += " AND tag.type = ?"
                params.append(type)
            cur.execute(query, tuple(params))
            rows = cur.fetchall()
            return [Tag.from_row(x) for x in rows]

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
                images.append(Image.from_row(row))
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
        cls, conn: Connection, tag_dict: Dict[str, List[int]], limit: int = 500, cursor = ''
    ) -> tuple[List[Image], Cursor]:
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
            elif operator == "not" and tag_dict["not"]:
                where_clauses.append(
                    """(image_id NOT IN (
  SELECT image_id
  FROM image_tag
  WHERE tag_id IN ({})
))""".format(
                        ",".join("?" * len(tag_ids))
                    )
                )
                params.extend(tag_ids)
            elif operator == "or" and tag_dict["or"]:
                where_clauses.append(
                    """(image_id IN (
  SELECT image_id
  FROM image_tag
  WHERE tag_id IN ({})
  GROUP BY image_id
  HAVING COUNT(DISTINCT tag_id) >= 1
)
)""".format(",".join("?" * len(tag_ids)))
                )
                params.extend(tag_ids)
        if cursor:
            where_clauses.append("(image.date < ?)")
            params.append(cursor)

        if where_clauses:
            query += " WHERE " + " AND ".join(where_clauses)

        query += " GROUP BY image.id"

        if "and" in tag_dict:
            query += " HAVING COUNT(DISTINCT tag_id) = ?"
            params.append(len(tag_dict["and"]))

        query += " ORDER BY date DESC LIMIT ?"
        params.append(limit)
        api_cur = Cursor()
        with closing(conn.cursor()) as cur:
            cur.execute(query, params)
            rows = cur.fetchall()
            images = []            
            deleted_ids = []
            for row in rows:
                img = Image(id=row[0], path=row[1], size=row[2], date=row[3])
                if os.path.exists(img.path):
                    images.append(img)
                else: 
                    deleted_ids.append(img.id)
            Image.safe_batch_remove(conn, deleted_ids)
            api_cur.has_next = len(rows) >= limit
            if images:
                api_cur.next = str(images[-1].date)
            return images, api_cur
        
    @classmethod
    def batch_get_tags_by_path(cls, conn: Connection, paths: List[str], type = "custom") -> Dict[str, List[Tag]]:
        if not paths:
            return {}
        tag_dict = {}
        with closing(conn.cursor()) as cur:
            placeholders = ",".join("?" * len(paths))
            query = f"""
                SELECT image.path, tag.* FROM image_tag
                INNER JOIN image ON image_tag.image_id = image.id
                INNER JOIN tag ON image_tag.tag_id = tag.id
                WHERE tag.type = '{type}' AND image.path IN ({placeholders})
            """
            cur.execute(query, paths)
            rows = cur.fetchall()
            for row in rows:
                path = row[0]
                tag = Tag.from_row(row[1:])
                if path in tag_dict:
                    tag_dict[path].append(tag)
                else:
                    tag_dict[path] = [tag]
        return tag_dict
    
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
            if not os.path.exists(folder_path):
                return False
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
            extra_paths = ExtraPath.get_extra_paths(conn)
            for ep in extra_paths:
                if not find(result_set, lambda x : x[1] == ep.path):
                    dirs.append(ep.path)
            for row in result_set:
                folder_path = row[1]
                if (
                    os.path.exists(folder_path)
                    and get_modified_date(folder_path) != row[2]
                ):
                    dirs.append(folder_path)
            return unique_by(dirs, os.path.normpath)
        
    @classmethod
    def remove_folder(cls, conn: Connection, folder_path: str):
        folder_path = os.path.normpath(folder_path)
        with closing(conn.cursor()) as cur:
            cur.execute("DELETE FROM folders WHERE path = ?", (folder_path,))

class ExtraPathType(Enum):
    scanned = 'scanned'
    walk = 'walk'
    cli_only = 'cli_access_only'

class ExtraPath:
    def __init__(self, path: str, type: Optional[ExtraPathType] = None):
        assert type
        self.path = os.path.normpath(path)
        self.type = type

    def save(self, conn):
        assert self.type in [ExtraPathType.walk, ExtraPathType.scanned]
        with closing(conn.cursor()) as cur:
            cur.execute(
                "INSERT INTO extra_path (path, type) VALUES (?, ?) ON CONFLICT (path) DO UPDATE SET type = ?",
                (self.path, self.type.value, self.type.value),
            )

    @classmethod
    def get_extra_paths(cls, conn, type: Optional[ExtraPathType] = None) -> List['ExtraPath']:
        query = "SELECT * FROM extra_path"
        params = ()
        if type:
            query += " WHERE type = ?"
            params = (type.value,)
        with closing(conn.cursor()) as cur:
            cur.execute(query, params)
            rows = cur.fetchall()
            paths: List[ExtraPath] = []
            for row in rows:
                path = row[0]
                if os.path.exists(path):
                    paths.append(ExtraPath(path, ExtraPathType(row[1])))
                else:
                    cls.remove(conn, path)
            return paths

    @classmethod
    def remove(cls, conn, path: str, type: Optional[ExtraPathType] = None, img_search_dirs: Optional[List[str]] = []):
        with closing(conn.cursor()) as cur:
            sql = "DELETE FROM extra_path WHERE path = ?"
            path = os.path.normpath(path)
            if type:
                cur.execute(sql, (path,))
            else:
                cur.execute(sql + "AND type = ?", (path, type.value))
            if path not in img_search_dirs:
                Floder.remove_folder(conn, path)
            conn.commit()

    @classmethod
    def create_table(cls, conn):
        with closing(conn.cursor()) as cur:
            cur.execute(
                """CREATE TABLE IF NOT EXISTS extra_path (
                            path TEXT PRIMARY KEY,
                            type TEXT NOT NULL
                        )"""
            )