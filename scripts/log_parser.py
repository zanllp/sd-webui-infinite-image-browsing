import re
regex = re.compile(r"\[(\d+)\] (上传文件失败|秒传失败|上传文件成功|准备上传|目标文件|加入上传队列)(?:\:|,)?(.*)")
upload_success_extra_re = re.compile(r"保存到网盘路径: (.*)$")
concurrent_re = re.compile(r"上传单个文件最大并发量为: (\d+), 最大同时上传文件数为: (\d+)")

def parse_log_line(line_str: str):
    match = regex.match(line_str)
    if not match:
        if line_str.startswith("上传结束"):
            return { "status": "done", "extra_info": line_str }
        concurrent_match = concurrent_re.search(line_str)
        if concurrent_match:
            return {  "status": "start", "concurrent": int(concurrent_match.group(1)) }
        return
    line = {
        "id": match.group(1),
        "status": {
            "秒传失败": "fast-upload-failed",
            "上传文件成功": "upload-success",
            "准备上传": "upload-preparing",
            "目标文件": "file-skipped",
            "加入上传队列": "queued",
            "上传文件失败": "upload-failed"
        }.get(match.group(2)),
        "local_file_path": None,
        "baidu_netdisk_saved_path": None
    }
    extra_info = match.group(3).strip()
    if line["status"] == "upload-success":
        line["baidu_netdisk_saved_path"] = upload_success_extra_re.match(extra_info).group(1)
    elif line["status"] == "prepare":
        line["local_file_path"] = extra_info
    elif line["status"] == "upload-failed":
        line["extra_info"] = extra_info
    return line