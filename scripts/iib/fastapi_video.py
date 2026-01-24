import os
from typing import BinaryIO, Dict, Tuple

from fastapi import HTTPException, Request, status
from fastapi.responses import StreamingResponse
from scripts.iib.tool import get_video_type

video_file_handler: Dict[str, "BinaryIO"] = {}

def close_video_file_reader(path):
    if not get_video_type(path):
        return
    try:
        f = video_file_handler.get(path)
        if f is not None:
            f.close()
    except Exception as e:
        print(f"close file error: {e}")
    

def send_bytes_range_requests(
    file_path: str,
    start: int,
    end: int,
    chunk_size: int = 1024 * 1024,
):
    """Send a file in chunks using Range Requests specification RFC7233

    `start` and `end` parameters are inclusive due to specification
    """
    f = None
    try:
        # Larger chunk size improves throughput for large video files.
        f = open(file_path, mode="rb")
        video_file_handler[file_path] = f
        f.seek(start)
        while (pos := f.tell()) <= end:
            read_size = min(chunk_size, end + 1 - pos)
            data = f.read(read_size)
            if not data:
                break
            yield data
    finally:
        # Best-effort cleanup; the file may already be closed by external code.
        try:
            cur = video_file_handler.get(file_path)
            if cur is f:
                video_file_handler.pop(file_path, None)
            if f is not None:
                f.close()
        except Exception:
            pass


def _get_range_header(range_header: str, file_size: int) -> Tuple[int, int]:
    def _invalid_range():
        return HTTPException(
            status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE,
            detail=f"Invalid request range (Range:{range_header!r})",
        )

    # RFC7233 supports:
    # - bytes=START-END
    # - bytes=START-
    # - bytes=-SUFFIX_LENGTH
    # Browsers usually send a single range; if multiple, we take the first one.
    try:
        raw = range_header.strip()
        if not raw.startswith("bytes="):
            raise _invalid_range()
        raw = raw[len("bytes=") :].split(",")[0].strip()
        start_s, end_s = raw.split("-", 1)

        # suffix-byte-range-spec: bytes=-<length>
        if start_s == "" and end_s != "":
            suffix_len = int(end_s)
            if suffix_len <= 0:
                raise _invalid_range()
            start = max(file_size - suffix_len, 0)
            end = file_size - 1
        else:
            start = int(start_s) if start_s != "" else 0
            end = int(end_s) if end_s != "" else file_size - 1
    except HTTPException:
        raise
    except Exception:
        raise _invalid_range()

    if start > end or start < 0 or end > file_size - 1:
        raise _invalid_range()
    return start, end


def range_requests_response(
    request: Request, file_path: str, content_type: str
):
    """Returns StreamingResponse using Range Requests of a given file"""

    file_size = os.stat(file_path).st_size
    range_header = request.headers.get("range")

    headers = {
        "content-type": content_type,
        "accept-ranges": "bytes",
        "content-encoding": "identity",
        "content-length": str(file_size),
        "access-control-expose-headers": (
            "content-type, accept-ranges, content-length, "
            "content-range, content-encoding"
        ),
    }
    start = 0
    end = file_size - 1
    status_code = status.HTTP_200_OK

    if range_header is not None:
        start, end = _get_range_header(range_header, file_size)
        size = end - start + 1
        headers["content-length"] = str(size)
        headers["content-range"] = f"bytes {start}-{end}/{file_size}"
        status_code = status.HTTP_206_PARTIAL_CONTENT

    return StreamingResponse(
        send_bytes_range_requests(file_path, start, end),
        headers=headers,
        status_code=status_code,
    )
