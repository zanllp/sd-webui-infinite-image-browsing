import os
from scripts.iib.db.datamodel  import DirCoverCache, DataBase
from scripts.iib.tool import is_valid_media_path, get_video_type

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
    for root, dirs, files in os.walk(folder_path):
        for file in files:
            file_path = os.path.join(root, file)
            if is_valid_media_path(file_path):
                if get_video_type(file_path):
                  media_files.append({ "path": file_path, "type": "video" })
                else:
                  media_files.append({ "path": file_path, "type": "image" })
            if len(media_files) > 3:
                return media_files
    return media_files
