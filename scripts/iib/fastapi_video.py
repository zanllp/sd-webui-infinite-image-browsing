import os
from typing import BinaryIO

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.responses import StreamingResponse


def send_bytes_range_requests(
    file_obj: BinaryIO, start: int, end: int, chunk_size: int = 10_000
):
    """Send a file in chunks using Range Requests specification RFC7233

    `start` and `end` parameters are inclusive due to specification
    """
    with file_obj as f:
        f.seek(start)
        while (pos := f.tell()) <= end:
            read_size = min(chunk_size, end + 1 - pos)
            yield f.read(read_size)


def _get_range_header(range_header: str, file_size: int) -> tuple[int, int]:
    def _invalid_range():
        return HTTPException(
            status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE,
            detail=f"Invalid request range (Range:{range_header!r})",
        )

    try:
        h = range_header.replace("bytes=", "").split("-")
        start = int(h[0]) if h[0] != "" else 0
        end = int(h[1]) if h[1] != "" else file_size - 1
    except ValueError:
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
        send_bytes_range_requests(open(file_path, mode="rb"), start, end),
        headers=headers,
        status_code=status_code,
    )
