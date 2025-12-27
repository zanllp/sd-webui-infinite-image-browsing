import os
import subprocess
import tempfile
from pathlib import Path
from PIL import Image

def pillow_can_open_jxl():
    """Return True if Pillow has a JXL plugin available (pillow-jxl imported)."""
    try:
        import pillow_jxl  # noqa: F401
        return True
    except Exception:
        return False

def convert_jxl_to_webp(src_path: str, dst_path: str, size: tuple = None, quality: int = 85):
    """
    Convert a .jxl to webp.

    Strategy:
    1) Try to open with PIL (pillow-jxl) and save as webp.
    2) If PIL fails, try djxl (part of libjxl tools) to decode to PNG then convert to webp.
    3) If djxl is not available, try ImageMagick 'magick' or 'convert' as fallback.

    Returns True on success, False on failure.
    """
    src = Path(src_path)
    dst = Path(dst_path)
    dst.parent.mkdir(parents=True, exist_ok=True)

    # 1) Try Pillow first
    try:
        with Image.open(str(src)) as img:
            if size:
                img.thumbnail(size)
            img.save(str(dst), "WEBP", quality=quality)
        return True
    except Exception:
        # continue to fallback
        pass

    # 2) Try djxl (libjxl tools) -> decode to PNG, then convert with Pillow
    tmp_png = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            tmp_png = tmp.name
        # djxl decodes JXL to PNG (djxl input.jxl output.png)
        cmd = ["djxl", str(src), tmp_png]
        subprocess.check_call(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        # open PNG and save webp
        try:
            with Image.open(tmp_png) as img:
                if size:
                    img.thumbnail(size)
                img.save(str(dst), "WEBP", quality=quality)
            os.unlink(tmp_png)
            return True
        finally:
            if os.path.exists(tmp_png):
                os.unlink(tmp_png)
    except Exception:
        # djxl not available or failed, continue to next fallback
        try:
            if tmp_png and os.path.exists(tmp_png):
                os.unlink(tmp_png)
        except Exception:
            pass

    # 3) Try ImageMagick (magick or convert)
    try:
        magick_cmd = None
        for exe in ("magick", "convert"):
            try:
                subprocess.check_call([exe, "--version"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                magick_cmd = exe
                break
            except Exception:
                continue
        if magick_cmd:
            # convert input.jxl -resize WxH -quality Q output.webp (if size provided)
            cmd = [magick_cmd, str(src)]
            if size:
                cmd += ["-resize", f"{size[0]}x{size[1]}"]
            cmd += ["-quality", str(quality), str(dst)]
            subprocess.check_call(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return True
    except Exception:
        pass

    return False
