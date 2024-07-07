import hashlib
import os
from typing import List
from scripts.iib.tool import get_formatted_date, get_cache_dir, is_video_file
from concurrent.futures import ThreadPoolExecutor
import time


def generate_video_covers(dirs,verbose=False):
  start_time = time.time()
  import imageio.v3 as iio
  
  cache_base_dir = get_cache_dir()

  def process_video(item):
    if item.is_dir():
      verbose and print(f"Processing directory: {item.path}")
      for sub_item in os.scandir(item.path):
        process_video(sub_item)
      return
    if not os.path.exists(item.path) or not is_video_file(item.path):
      return

    try:
      path = os.path.normpath(item.path)
      stat = item.stat()
      t = get_formatted_date(stat.st_mtime)
      hash_dir = hashlib.md5((path + t).encode("utf-8")).hexdigest()
      cache_dir = os.path.join(cache_base_dir, "iib_cache", "video_cover", hash_dir)
      cache_path = os.path.join(cache_dir, "cover.webp")

      # 如果缓存文件存在，则直接返回该文件
      if os.path.exists(cache_path):
        print(f"Video cover already exists: {path}")
        return

      frame = iio.imread(
        path,
        index=16,
        plugin="pyav",
      )

      os.makedirs(cache_dir, exist_ok=True)
      iio.imwrite(cache_path, frame, extension=".webp")
      verbose and print(f"Video cover generated: {path}")
    except Exception as e:
      print(f"Error generating video cover: {path}")
      print(e)

  with ThreadPoolExecutor() as executor:
    for dir_path in dirs:
      folder_listing: List[os.DirEntry] = os.scandir(dir_path)
      for item in folder_listing:
        executor.submit(process_video, item)

  print("Video covers generated successfully.")
  end_time = time.time()
  execution_time = end_time - start_time
  print(f"Execution time: {execution_time} seconds")