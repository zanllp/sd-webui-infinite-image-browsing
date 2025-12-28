import hashlib
import os
from typing import List
from scripts.iib.tool import get_formatted_date, get_cache_dir, is_image_file
from concurrent.futures import ThreadPoolExecutor
import time
from PIL import Image

def generate_image_cache(dirs, size:str, verbose=False):
  start_time = time.time()
  cache_base_dir = get_cache_dir()

  def process_image(item):
    if item.is_dir():
      verbose and print(f"Processing directory: {item.path}")
      for sub_item in os.scandir(item.path):
        process_image(sub_item)
      return
    if not os.path.exists(item.path) or not is_image_file(item.path):
      return

    try:
      path = os.path.normpath(item.path)
      stat = item.stat()
      t = get_formatted_date(stat.st_mtime)
      hash_dir = hashlib.md5((path + t).encode("utf-8")).hexdigest()
      cache_dir = os.path.join(cache_base_dir, "iib_cache", hash_dir)
      cache_path = os.path.join(cache_dir, f"{size}.webp")

      if os.path.exists(cache_path):
          verbose and print(f"Image cache already exists: {path}")
          return

      if os.path.getsize(path) < 64 * 1024:
          verbose and print(f"Image size less than 64KB: {path}", "skip")
          return
        
      with Image.open(path) as img:
          w, h = size.split("x")
          img.thumbnail((int(w), int(h)))
          os.makedirs(cache_dir, exist_ok=True)
          img.save(cache_path, "webp")

      verbose and print(f"Image cache generated: {path}")
    except Exception as e:
      print(f"Error generating image cache: {path}")
      print(e)

  with ThreadPoolExecutor() as executor:
    for dir_path in dirs:
      folder_listing: List[os.DirEntry] = os.scandir(dir_path)
      for item in folder_listing:
        executor.submit(process_image, item)

  print("Image cache generation completed. ✨")
  end_time = time.time()
  execution_time = end_time - start_time
  print(f"Execution time: {execution_time} seconds")