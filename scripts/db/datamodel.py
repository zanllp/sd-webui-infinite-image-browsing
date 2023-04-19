import sqlite3
from typing import Optional

class DataBase:
    _conn: Optional[sqlite3.Connection] = None

    _initing = False

    @classmethod
    def get_conn(clz) -> sqlite3.Connection:
        if not clz._conn:
            clz.init()
        return clz._conn

    @classmethod
    def init(clz):
        # 创建连接并打开数据库
        conn = sqlite3.connect('example.db')
        clz._conn = conn
        ImageTag.create_table(conn)
        Tag.create_table(conn)
        Image.create_table(conn)

class Image:
    def __init__(self, path, exif=None):
        self.path = path
        self.exif = exif
        self.id = None

    def save(self, conn):
        cur = conn.cursor()
        cur.execute("INSERT INTO image (path, exif) VALUES (?, ?)", (self.path, self.exif))
        self.id = cur.lastrowid

    @classmethod
    def get(cls, conn, id):
        cur = conn.cursor()
        cur.execute("SELECT * FROM image WHERE id = ?", (id,))
        row = cur.fetchone()
        if row is None:
            return None
        else:
            image = cls(path=row[1], exif=row[2])
            image.id = row[0]
            return image

    @classmethod
    def create_table(cls, conn):
        cur = conn.cursor()
        cur.execute('''CREATE TABLE IF NOT EXISTS image (
                          id INTEGER PRIMARY KEY AUTOINCREMENT,
                          path TEXT,
                          exif TEXT
                       )''')
        cur.execute('CREATE INDEX IF NOT EXISTS image_idx_path ON image(path)')

    @classmethod
    def count(cls, conn):
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM image")
        count = cur.fetchone()[0]
        return count

class Tag:
    def __init__(self, name, score, type):
        self.name = name
        self.score = score
        self.type = type
        self.id = None

    def save(self, conn):
        cur = conn.cursor()
        cur.execute("INSERT INTO tag (name, score, type) VALUES (?, ?, ?)", (self.name, self.score, self.type))
        self.id = cur.lastrowid

    @classmethod
    def get(cls, conn, id):
        cur = conn.cursor()
        cur.execute("SELECT * FROM tag WHERE id = ?", (id,))
        row = cur.fetchone()
        if row is None:
            return None
        else:
            tag = cls(name=row[1], score=row[2], type=row[3])
            tag.id = row[0]
            return tag
    
    @classmethod
    def get_all(cls, conn):
        cur = conn.cursor()
        cur.execute("SELECT * FROM tag")
        rows = cur.fetchall()
        tags: list[Tag] = []
        for row in rows:
            tag = cls(name=row[1], score=row[2], type=row[3])
            tag.id = row[0]
            tags.append(tag)
        return tags
        
    @classmethod
    def get_or_create(cls, conn, name, score = None, type = None):
        cur = conn.cursor()
        cur.execute("SELECT tag.* FROM tag WHERE name = ?", (name,))
        row = cur.fetchone()
        if row is None:
            tag = cls(name=name, score=score, type=type)
            tag.save(conn)
            return tag
        else:
            tag = cls(name=row[1], score=row[2], type=row[3])
            tag.id = row[0]
            return tag


    @classmethod
    def create_table(cls, conn):
        cur = conn.cursor()
        cur.execute('''CREATE TABLE IF NOT EXISTS tag (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          score INTEGER,
          type TEXT
          );
          ''')
        cur.execute('CREATE INDEX IF NOT EXISTS tag_idx_name ON tag(name)')

class ImageTag:
    def __init__(self, image_id, tag_id):
        assert tag_id and image_id
        self.image_id = image_id
        self.tag_id = tag_id

    def save(self, conn):
        cur = conn.cursor()
        cur.execute("INSERT INTO image_tag (image_id, tag_id) VALUES (?, ?)", (self.image_id, self.tag_id))

    @classmethod
    def get_tags_for_image(cls, conn, image_id):
        cur = conn.cursor()
        cur.execute("SELECT tag.* FROM tag INNER JOIN image_tag ON tag.id = image_tag.tag_id WHERE image_tag.image_id = ?", (image_id,))
        rows = cur.fetchall()
        tags: list[Tag] = []
        for row in rows:
            tag = Tag(name=row[1], score=row[2], type=row[3])
            tag.id = row[0]
            tags.append(tag)
        return tags

    @classmethod
    def get_images_for_tag(cls, conn, tag_id):
        cur = conn.cursor()
        cur.execute("SELECT image.* FROM image INNER JOIN image_tag ON image.id = image_tag.image_id WHERE image_tag.tag_id = ?", (tag_id,))
        rows = cur.fetchall()
        images = []
        for row in rows:
            image = Image(path=row[1], exif=row[2])
            image.id = row[0]
            images.append(image)
        return images

    @classmethod
    def create_table(cls, conn):
        cur = conn.cursor()
        cur.execute('''CREATE TABLE IF NOT EXISTS image_tag (
                          image_id INTEGER,
                          tag_id INTEGER,
                          FOREIGN KEY (image_id) REFERENCES image(id),
                          FOREIGN KEY (tag_id) REFERENCES tag(id),
                          PRIMARY KEY (image_id, tag_id)
                       )''')

