import os
import platform
import re


def human_readable_size(size_bytes):
    """
    Converts bytes to a human-readable format.
    """
    # define the size units
    units = ('B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB')
    # calculate the logarithm of the input value with base 1024
    size = int(size_bytes)
    if size == 0:
        return '0B'
    i = 0
    while size >= 1024 and i < len(units) - 1:
        size /= 1024
        i += 1
    # round the result to two decimal points and return as a string
    return '{:.2f} {}'.format(size, units[i])

def get_windows_drives():
    drives = []
    for drive in range(ord('A'), ord('Z')+1):
        drive_name = chr(drive) + ':/'
        if os.path.exists(drive_name):
            drives.append(drive_name)
    return drives

pattern = re.compile(r'(\d+\.?\d*)([KMGT]?B)', re.IGNORECASE)
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

is_dev = "APP_ENV" in os.environ and os.environ["APP_ENV"] == "dev"
cwd = os.path.normpath(os.path.join(__file__, "../../"))
is_win = platform.system().lower().find("windows") != -1