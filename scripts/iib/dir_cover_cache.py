import os
from scripts.iib.db.datamodel  import DirCoverCache, DataBase
from scripts.iib.tool import get_created_date_by_stat, get_formatted_date, is_valid_media_path, get_video_type, birthtime_sort_key_fn

def get_top_4_media_info(folder_path):
    """
    获取给定文件夹路径下的前4个媒体文件的完整路径。

    参数:
    folder_path (str): 文件夹的路径。

    返回值:
    list: 包含前4个媒体文件完整路径的列表。
    """
    conn = DataBase.get_conn()
    if DirCoverCache.is_cache_expired(conn, folder_path):
        media_files = get_media_files_from_folder(folder_path)
        DirCoverCache.cache_media_files(conn, folder_path, media_files)
    else:
        media_files = DirCoverCache.get_cached_media_files(conn, folder_path)

    return media_files[:4]

def get_media_files_from_folder(folder_path):
    """
    从文件夹中获取媒体文件的完整路径。

    参数:
    folder_path (str): 文件夹的路径。

    返回值:
    list: 包含媒体文件完整路径的列表。
    """
    media_files = []
    with os.scandir(folder_path) as entries:
        for entry in sorted(entries, key=birthtime_sort_key_fn, reverse=True):
            if entry.is_file() and is_valid_media_path(entry.path):
                name = os.path.basename(entry.path)
                stat = entry.stat()
                date = get_formatted_date(stat.st_mtime)
                created_time = get_created_date_by_stat(stat)
                media_files.append({
                    "fullpath": entry.path,
                    "media_type": "video" if get_video_type(entry.path) else "image",
                    "type": "file",
                    "date": date,
                    "created_time": created_time,
                    "name": name,
                })
            if len(media_files) > 3:
                return media_files
    
    return media_files
