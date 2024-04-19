import ctypes
from datetime import datetime
import os
import platform
import re
import tempfile
import imghdr
import subprocess
from typing import Dict, List
import sys
import piexif
import piexif.helper
import json
import zipfile
from PIL import Image
import shutil

sd_img_dirs = [
    "outdir_txt2img_samples",
    "outdir_img2img_samples",
    "outdir_save",
    "outdir_extras_samples",
    "outdir_grids",
    "outdir_img2img_grids",
    "outdir_samples",
    "outdir_txt2img_grids",
]


is_dev = os.getenv("APP_ENV") == "dev"
is_nuitka = "__compiled__" in globals()
cwd = os.getcwd() if is_nuitka else os.path.normpath(os.path.join(__file__, "../../../"))
is_win = platform.system().lower().find("windows") != -1



    
try:
    from dotenv import load_dotenv

    load_dotenv(os.path.join(cwd, ".env"))
except Exception as e:
    print(e)



def backup_db_file(db_file_path):

    if not os.path.exists(db_file_path):
        return
    max_backup_count = int(os.environ.get('IIB_DB_FILE_BACKUP_MAX', '16'))
    if max_backup_count < 1:
        return
    backup_folder = os.path.join(cwd,'iib_db_backup')
    current_time = datetime.now()
    timestamp = current_time.strftime('%Y-%m-%d %H-%M-%S')
    backup_filename = f"iib.db_{timestamp}"
    os.makedirs(backup_folder, exist_ok=True)
    backup_filepath = os.path.join(backup_folder, backup_filename)
    shutil.copy2(db_file_path, backup_filepath)
    backup_files = os.listdir(backup_folder)
    pattern = r"iib\.db_(\d{4}-\d{2}-\d{2} \d{2}-\d{2}-\d{2})"
    backup_files_with_time = [(f, re.search(pattern, f).group(1)) for f in backup_files if re.search(pattern, f)]
    sorted_backup_files = sorted(backup_files_with_time, key=lambda x: datetime.strptime(x[1], '%Y-%m-%d %H-%M-%S'))

    if len(sorted_backup_files) > max_backup_count:
        files_to_remove_count = len(sorted_backup_files) - max_backup_count
        for i in range(files_to_remove_count):
            file_to_remove = os.path.join(backup_folder, sorted_backup_files[i][0])
            os.remove(file_to_remove)
            
    print(f"\033[92mIIB Database file has been successfully backed up to the backup folder.\033[0m")

def get_sd_webui_conf(**kwargs):
    try:
        from modules.shared import opts

        return opts.data
    except:
        pass
    try:
        sd_conf_path = kwargs.get("sd_webui_config")
        with codecs.open(sd_conf_path, "r", "utf-8") as f:
            obj = json.loads(f.read())
            if kwargs.get("sd_webui_path_relative_to_config"):
                for dir in sd_img_dirs:
                    if obj[dir] and not os.path.isabs(obj[dir]):
                        obj[dir] = os.path.normpath(
                            os.path.join(sd_conf_path, "../", obj[dir])
                        )
            return obj
    except:
        pass
    return {}

def normalize_paths(paths: List[str], base = cwd):
    """
    Normalize a list of paths, ensuring that each path is an absolute path with no redundant components.

    Args:
        paths (List[str]): A list of paths to be normalized.

    Returns:
        List[str]: A list of normalized paths.
    """
    res: List[str] = []
    for path in paths:
        # Skip empty or blank paths
        if not path or len(path.strip()) == 0:
            continue
        # If the path is already an absolute path, use it as is
        if os.path.isabs(path):
            abs_path = path
        # Otherwise, make the path absolute by joining it with the current working directory
        else:
            abs_path = os.path.join(base, path)
        # If the absolute path exists, add it to the result after normalizing it
        if os.path.exists(abs_path):
            res.append(os.path.normpath(abs_path))
    return res

def to_abs_path(path):
    if not os.path.isabs(path):
        path = os.path.join(os.getcwd(), path)
    return os.path.normpath(path)


def get_valid_img_dirs(
    conf,
    keys=sd_img_dirs,
):
    # 获取配置项
    paths = [conf.get(key) for key in keys]

    # 判断路径是否有效并转为绝对路径
    abs_paths = []
    for path in paths:
        if not path or len(path.strip()) == 0:
            continue
        if os.path.isabs(path):  # 已经是绝对路径
            abs_path = path
        else:  # 转为绝对路径
            abs_path = os.path.join(os.getcwd(), path)
        if os.path.exists(abs_path):  # 判断路径是否存在
            abs_paths.append(os.path.normpath(abs_path))

    return abs_paths


def human_readable_size(size_bytes):
    """
    Converts bytes to a human-readable format.
    """
    # define the size units
    units = ("B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB")
    # calculate the logarithm of the input value with base 1024
    size = int(size_bytes)
    if size == 0:
        return "0B"
    i = 0
    while size >= 1024 and i < len(units) - 1:
        size /= 1024
        i += 1
    # round the result to two decimal points and return as a string
    return "{:.2f} {}".format(size, units[i])


def get_windows_drives():
    drives = []
    bitmask = ctypes.windll.kernel32.GetLogicalDrives()
    for letter in range(65, 91):
        if bitmask & 1:
            drive_name = chr(letter) + ":/"
            drives.append(drive_name)
        bitmask >>= 1
    return drives


pattern = re.compile(r"(\d+\.?\d*)([KMGT]?B)", re.IGNORECASE)


def convert_to_bytes(file_size_str):
    match = re.match(pattern, file_size_str)
    if match:
        size_str, unit_str = match.groups()
        size = float(size_str)
        unit = unit_str.upper()
        if unit == "KB":
            size *= 1024
        elif unit == "MB":
            size *= 1024**2
        elif unit == "GB":
            size *= 1024**3
        elif unit == "TB":
            size *= 1024**4
        return int(size)
    else:
        raise ValueError(f"Invalid file size string '{file_size_str}'")
    
def get_video_type(file_path):
    video_extensions = ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.ts']
    file_extension = file_path[file_path.rfind('.'):].lower()

    if file_extension in video_extensions:
        return file_extension[1:] 
    else:
        return None

def is_valid_media_path(path):
    """
    判断给定的路径是否是图像文件
    """
    abs_path = os.path.abspath(path)  # 转为绝对路径
    if not os.path.exists(abs_path):  # 判断路径是否存在
        return False
    if not os.path.isfile(abs_path):  # 判断是否是文件
        return False
    if not imghdr.what(abs_path) and not get_video_type(abs_path):  # 判断是否是图像文件
        return False
    return True



def create_zip_file(file_paths: List[str], zip_file_name: str):
    """
    将文件打包成一个压缩包

    Args:
        file_paths: 文件路径的列表
        zip_file_name: 压缩包的文件名

    Returns:
        无返回值
    """
    with zipfile.ZipFile(zip_file_name, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for file_path in file_paths:
            if os.path.isfile(file_path):
                zip_file.write(file_path, os.path.basename(file_path))
            elif os.path.isdir(file_path):
                for root, _, files in os.walk(file_path):
                    for file in files:
                        full_path = os.path.join(root, file)
                        zip_file.write(full_path, os.path.relpath(full_path, file_path))

def get_temp_path():
    """获取跨平台的临时文件目录路径"""
    temp_path = None
    try:
        # 尝试获取系统环境变量中的临时文件目录路径
        temp_path = (
            os.environ.get("TMPDIR") or os.environ.get("TMP") or os.environ.get("TEMP")
        )
    except Exception as e:
        print("获取系统环境变量临时文件目录路径失败，错误信息：", e)

    # 如果系统环境变量中没有设置临时文件目录路径，则使用 Python 的 tempfile 模块创建临时文件目录
    if not temp_path:
        try:
            temp_path = tempfile.gettempdir()
        except Exception as e:
            print("使用 Python 的 tempfile 模块创建临时文件目录失败，错误信息：", e)

    # 确保临时文件目录存在
    if not os.path.exists(temp_path):
        try:
            os.makedirs(temp_path)
        except Exception as e:
            print("创建临时文件目录失败，错误信息：", e)

    return temp_path


temp_path = get_temp_path()

def get_secret_key_required():
    try:
        from modules.shared import cmd_opts
        return bool(cmd_opts.gradio_auth)
    except:        
        return False

is_secret_key_required = get_secret_key_required()

def get_enable_access_control():
    ctrl = os.getenv("IIB_ACCESS_CONTROL")
    if ctrl == "enable":
        return True
    if ctrl == "disable":
        return False
    try:
        from modules.shared import cmd_opts

        return (
            cmd_opts.share or cmd_opts.ngrok or cmd_opts.listen or cmd_opts.server_name
        )
    except:
        pass
    return False


enable_access_control = get_enable_access_control()


def get_locale():
    import locale

    env_lang = os.getenv("IIB_SERVER_LANG")
    if env_lang in ["zh", "en"]:
        return env_lang
    lang, _ = locale.getdefaultlocale()
    return "zh" if lang and lang.startswith("zh") else "en"


locale = get_locale()


def get_formatted_date(timestamp: float) -> str:
    return datetime.fromtimestamp(timestamp).strftime("%Y-%m-%d %H:%M:%S")


def get_modified_date(folder_path: str):
    return get_formatted_date(os.path.getmtime(folder_path))


def get_created_date(folder_path: str):
    return get_formatted_date(os.path.getctime(folder_path))


def unique_by(seq, key_func=lambda x: x):
    seen = set()
    return [x for x in seq if not (key := key_func(x)) in seen and not seen.add(key)]


def find(lst, comparator):
    return next((item for item in lst if comparator(item)), None)


def findIndex(lst, comparator):
    return next((i for i, item in enumerate(lst) if comparator(item)), -1)

def unquote(text):
    if len(text) == 0 or text[0] != '"' or text[-1] != '"':
        return text

    try:
        return json.loads(text)
    except Exception:
        return text

def get_img_geninfo_txt_path(path: str):
    txt_path = re.sub(r"\.\w+$", ".txt", path)
    if os.path.exists(txt_path):
        return txt_path

def is_img_created_by_comfyui(img: Image):
    return img.info.get('prompt') and img.info.get('workflow')

def is_img_created_by_comfyui_with_webui_gen_info(img: Image):
    return is_img_created_by_comfyui(img) and img.info.get('parameters')

def get_comfyui_exif_data(img: Image):
    prompt = img.info.get('prompt')
    if not prompt:
        return {}
    meta_key = '3'
    data: Dict[str, any] = json.loads(prompt)
    for i in range(3, 32):
        try:
            i = str(i)
            if data[i]["class_type"].startswith("KSampler"):
                meta_key = i
                break
        except:
            pass
    meta = {}
    KSampler_entry = data[meta_key]["inputs"]
    # As a workaround to bypass parsing errors in the parser.
    # https://github.com/jiw0220/stable-diffusion-image-metadata/blob/00b8d42d4d1a536862bba0b07c332bdebb2a0ce5/src/index.ts#L130
    meta["Steps"] = "Unknown" 
    meta["Sampler"] = KSampler_entry["sampler_name"]
    meta["Model"] = data[KSampler_entry["model"][0]]["inputs"]["ckpt_name"]
    meta["Source Identifier"] = "ComfyUI"
    def get_text_from_clip(idx: str) :
        text = data[idx]["inputs"]["text"]
        if isinstance(text, list): # type:CLIPTextEncode (NSP) mode:Wildcards
            text = data[text[0]]["inputs"]["text"]
        return text.strip()
    pos_prompt = get_text_from_clip(KSampler_entry["positive"][0])
    neg_prompt = get_text_from_clip(KSampler_entry["negative"][0])
    pos_prompt_arr = unique_by(parse_prompt(pos_prompt)["pos_prompt"])
    return {
        "meta": meta,
        "pos_prompt": pos_prompt_arr,
        "pos_prompt_raw": pos_prompt,
        "neg_prompt_raw" : neg_prompt
    }

def comfyui_exif_data_to_str(data):
    res = data["pos_prompt_raw"] + "\nNegative prompt: " + data["neg_prompt_raw"] + "\n"
    meta_arr = []
    for k,v in data["meta"].items():
        meta_arr.append(f'{k}: {v}')
    return res + ", ".join(meta_arr)

def read_sd_webui_gen_info_from_image(image: Image, path="") -> str:
    """
    Reads metadata from an image file.

    Args:
        image (PIL.Image.Image): The image object to read metadata from.
        path (str): Optional. The path to the image file. Used to look for a .txt file with additional metadata.

    Returns:
        str: The metadata as a string.
    """
    items = image.info or {}
    geninfo = items.pop("parameters", None)

    if "exif" in items:
        exif = piexif.load(items["exif"])
        exif_comment = (exif or {}).get("Exif", {}).get(piexif.ExifIFD.UserComment, b"")

        try:
            exif_comment = piexif.helper.UserComment.load(exif_comment)
        except ValueError:
            exif_comment = exif_comment.decode("utf8", errors="ignore")

        if exif_comment:
            items["exif comment"] = exif_comment
            geninfo = exif_comment

    if not geninfo and path:
        try:
            txt_path = get_img_geninfo_txt_path(path)
            if txt_path:
                with open(txt_path) as f:
                    geninfo = f.read()
        except Exception as e:
            pass

    return geninfo


re_param_code = r'\s*([\w ]+):\s*("(?:\\"[^,]|\\"|\\|[^\"])+"|[^,]*)(?:,|$)'
re_param = re.compile(re_param_code)
re_imagesize = re.compile(r"^(\d+)x(\d+)$")
re_lora_prompt = re.compile("<lora:([\w_\s.]+):([\d.]+)>", re.IGNORECASE)
re_lora_extract = re.compile(r"([\w_\s.]+)(?:\d+)?")
re_lyco_prompt = re.compile("<lyco:([\w_\s.]+):([\d.]+)>", re.IGNORECASE)
re_parens = re.compile(r"[\\/\[\](){}]+")


def lora_extract(lora: str):
    """
    提取yoshino yoshino(2a79aa5adc4a)
    """
    res = re_lora_extract.match(lora)
    return res.group(1) if res else lora


def parse_prompt(x: str):
    x = re.sub(
        re_parens, "", x.replace("，", ",").replace("-", " ").replace("_", " ")
    )
    tag_list = [x.strip() for x in x.split(",")]
    res = []
    lora_list = []
    lyco_list = []
    for tag in tag_list:
        if len(tag) == 0:
            continue
        idx_colon = tag.find(":")
        if idx_colon != -1:
            if re.search(re_lora_prompt, tag):
                lora_res = re.search(re_lora_prompt, tag)
                lora_list.append(
                    {"name": lora_res.group(1), "value": float(lora_res.group(2))}
                )
            elif re.search(re_lyco_prompt, tag):
                lyco_res = re.search(re_lyco_prompt, tag)
                lyco_list.append(
                    {"name": lyco_res.group(1), "value": float(lyco_res.group(2))}
                )
            else:
                tag = tag[0:idx_colon]
                if len(tag):
                    res.append(tag.lower())
        else:
            res.append(tag.lower())
    return {"pos_prompt": res, "lora": lora_list, "lyco": lyco_list}


def parse_generation_parameters(x: str):
    res = {}
    prompt = ""
    negative_prompt = ""
    done_with_prompt = False
    if not x:
        return {"meta": {}, "pos_prompt": [], "lora": [], "lyco": []}
    *lines, lastline = x.strip().split("\n")
    if len(re_param.findall(lastline)) < 3:
        lines.append(lastline)
        lastline = ""
    if len(lines) == 1 and lines[0].startswith("Postprocess"):  # 把上面改成<2应该也可以，当时不敢动
        lastline = lines[
            0
        ]  # 把Postprocess upscale by: 4, Postprocess upscaler: R-ESRGAN 4x+ Anime6B 推到res解析
        lines = []
    for i, line in enumerate(lines):
        line = line.strip()
        if line.startswith("Negative prompt:"):
            done_with_prompt = True
            line = line[16:].strip()

        if done_with_prompt:
            negative_prompt += ("" if negative_prompt == "" else "\n") + line
        else:
            prompt += ("" if prompt == "" else "\n") + line

    for k, v in re_param.findall(lastline):
        try:
            if len(v) == 0:
                res[k] = v
                continue
            if v[0] == '"' and v[-1] == '"':
                v = unquote(v)

            m = re_imagesize.match(v)
            if m is not None:
                res[f"{k}-1"] = m.group(1)
                res[f"{k}-2"] = m.group(2)
            else:
                res[k] = v
        except Exception:
            print(f"Error parsing \"{k}: {v}\"")
            
    prompt_parse_res = parse_prompt(prompt)
    lora = prompt_parse_res["lora"]
    for k in res:
        k_s = str(k)
        if k_s.startswith("AddNet Module") and str(res[k]).lower() == "lora":
            model = res[k_s.replace("Module", "Model")]
            value = res.get(k_s.replace("Module", "Weight A"), "1")
            lora.append({"name": lora_extract(model), "value": float(value)})
    return {
        "meta": res,
        "pos_prompt": unique_by(prompt_parse_res["pos_prompt"]),
        "lora": unique_by(lora, lambda x: x["name"].lower()),
        "lyco": unique_by(prompt_parse_res["lyco"], lambda x: x["name"].lower()),
    }


tags_translate: Dict[str, str] = {}
try:
    import codecs

    with codecs.open(os.path.join(cwd, "tags-translate.csv"), "r", "utf-8") as tag:
        tags_translate_str = tag.read()
        for line in tags_translate_str.splitlines():
            en, mapping = line.split(",")
            tags_translate[en.strip()] = mapping.strip()
except Exception as e:
    pass


def open_folder(folder_path, file_path=None):
    folder = os.path.realpath(folder_path)
    if file_path:
        file = os.path.join(folder, file_path)
        if os.name == "nt":
            subprocess.run(["explorer", "/select,", file])
        elif sys.platform == "darwin":
            subprocess.run(["open", "-R", file])
        elif os.name == "posix":
            subprocess.run(["xdg-open", file])
    else:
        if os.name == "nt":
            subprocess.run(["explorer", folder])
        elif sys.platform == "darwin":
            subprocess.run(["open", folder])
        elif os.name == "posix":
            subprocess.run(["xdg-open", folder])


def open_file_with_default_app(file_path):
    system = platform.system()
    if system == 'Darwin':  # macOS
        subprocess.call(['open', file_path])
    elif system == 'Windows':  # Windows
        subprocess.call(file_path, shell=True)
    elif system == 'Linux':  # Linux
        subprocess.call(['xdg-open', file_path])
    else:
        raise OSError(f'Unsupported operating system: {system}')
    
def omit(d, keys):
    return {k: v for k, v in d.items() if k not in keys}
