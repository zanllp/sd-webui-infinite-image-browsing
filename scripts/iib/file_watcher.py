import os
import time
import threading
import queue
from typing import Set, List, Optional
from dataclasses import dataclass, field
from enum import Enum
from concurrent.futures import ThreadPoolExecutor, FIRST_COMPLETED
import hashlib

try:
    from watchdog.observers import Observer
    from watchdog.events import FileSystemEventHandler, FileSystemEvent, FileCreatedEvent, FileModifiedEvent, FileDeletedEvent, FileMovedEvent
    WATCHDOG_AVAILABLE = True
except ImportError:
    WATCHDOG_AVAILABLE = False
    FileSystemEventHandler = object

from scripts.iib.db.datamodel import DataBase, Image, ImageTag
from scripts.iib.db.update_image_data import add_image_data_single
from scripts.iib.tool import is_valid_media_path, get_formatted_date, get_modified_date, is_dev

class EventType(Enum):
    CREATED = "created"
    MODIFIED = "modified"
    DELETED = "deleted"
    MOVED = "moved"

@dataclass(order=True)
class FileChangeEvent:
    priority: int
    event_type: EventType = field(compare=False)
    path: str = field(compare=False)
    timestamp: float = field(default_factory=time.time, compare=False)

class IIBEventHandler(FileSystemEventHandler if WATCHDOG_AVAILABLE else object):
    def __init__(self, event_queue: queue.PriorityQueue, media_extensions: Set[str]):
        self.event_queue = event_queue
        self.media_extensions = media_extensions
        self._last_event_time: float = 0
        self._event_cooldown: float = 0.05  # 50ms 内相同文件的多个事件合并

    def _should_process(self, path: str) -> bool:
        if not path:
            return False
        ext = os.path.splitext(path)[1].lower()
        return ext in self.media_extensions

    def _deduplicate(self, path: str, event_type: EventType) -> bool:
        now = time.time()
        if now - self._last_event_time < self._event_cooldown:
            return True
        self._last_event_time = now
        return False

    def on_created(self, event: FileSystemEvent):
        if event.is_directory or not self._should_process(event.src_path):
            return
        if self._deduplicate(event.src_path, EventType.CREATED):
            return
        self.event_queue.put(FileChangeEvent(0, EventType.CREATED, event.src_path))

    def on_modified(self, event: FileSystemEvent):
        if event.is_directory or not self._should_process(event.src_path):
            return
        if self._deduplicate(event.src_path, EventType.MODIFIED):
            return
        self.event_queue.put(FileChangeEvent(1, EventType.MODIFIED, event.src_path))

    def on_deleted(self, event: FileSystemEvent):
        if event.is_directory or not self._should_process(event.src_path):
            return
        self.event_queue.put(FileChangeEvent(2, EventType.DELETED, event.src_path))

    def on_moved(self, event: FileSystemEvent):
        if event.is_directory or not self._should_process(event.dest_path):
            return
        self.event_queue.put(FileChangeEvent(0, EventType.CREATED, event.dest_path))
        self.event_queue.put(FileChangeEvent(2, EventType.DELETED, event.src_path))


class IIBFileWatcher:
    _instance: Optional['IIBFileWatcher'] = None

    def __init__(
        self,
        watch_dirs: List[str],
        batch_size: int = 32,
        batch_timeout: float = 2.0,
        max_workers: int = 2,
        poll_interval: float = 1.0,
    ):
        self.watch_dirs = [os.path.normpath(d) for d in watch_dirs if os.path.exists(d)]
        self.batch_size = batch_size
        self.batch_timeout = batch_timeout
        self.max_workers = max_workers
        self.poll_interval = poll_interval

        self._media_extensions: Set[str] = {
            '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.avif', '.jpe',
            '.mp4', '.m4v', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.ts', '.webm',
            '.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac', '.wma',
        }

        self._event_queue: queue.PriorityQueue = queue.PriorityQueue(maxsize=1024)
        self._observer: Optional[Observer] = None
        self._executor = ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="iib_watcher")
        self._running = False
        self._processing = False
        self._processed_paths: Set[str] = set()
        self._pending_batches: List[List[FileChangeEvent]] = []
        self._lock = threading.Lock()

        IIBFileWatcher._instance = self

    @classmethod
    def get_instance(cls) -> Optional['IIBFileWatcher']:
        return cls._instance

    def start(self) -> bool:
        if not WATCHDOG_AVAILABLE:
            if is_dev:
                print("[IIB Watch] watchdog not installed, file watching disabled")
            return False

        if self._running:
            return True

        if not self.watch_dirs:
            if is_dev:
                print("[IIB Watch] No valid directories to watch")
            return False

        try:
            handler = IIBEventHandler(self._event_queue, self._media_extensions)
            self._observer = Observer()
            self._observer.name = "IIBFileWatcher"

            for dir_path in self.watch_dirs:
                try:
                    self._observer.schedule(handler, dir_path, recursive=True)
                    if is_dev:
                        print(f"[IIB Watch] Monitoring: {dir_path}")
                except Exception as e:
                    print(f"[IIB Watch] Failed to watch {dir_path}: {e}")

            self._observer.start()
            self._running = True

            self._executor.submit(self._process_events_loop)
            if is_dev:
                print(f"[IIB Watch] Started watching {len(self.watch_dirs)} directories")

            return True
        except Exception as e:
            print(f"[IIB Watch] Failed to start: {e}")
            return False

    def stop(self):
        if not self._running:
            return

        self._running = False

        if self._observer is not None:
            try:
                self._observer.stop()
                self._observer.join(timeout=5.0)
            except Exception:
                pass
            self._observer = None

        self._executor.shutdown(wait=True, cancel_futures=True)

        IIBFileWatcher._instance = None
        if is_dev:
            print("[IIB Watch] Stopped")

    def _process_events_loop(self):
        last_batch_time = time.time()

        while self._running:
            try:
                timeout = max(0.1, self.batch_timeout - (time.time() - last_batch_time))
                events: List[FileChangeEvent] = []

                try:
                    while len(events) < self.batch_size:
                        event = self._event_queue.get(timeout=timeout)
                        events.append(event)
                except queue.Empty:
                    pass

                if not events:
                    continue

                events.sort(key=lambda e: (e.priority, e.timestamp))
                merged_events = self._merge_duplicate_events(events)

                with self._lock:
                    self._pending_batches.append(merged_events)

                if len(self._pending_batches) > 1 or time.time() - last_batch_time >= self.batch_timeout:
                    self._flush_batches()
                    last_batch_time = time.time()

            except Exception as e:
                if is_dev:
                    print(f"[IIB Watch] Event processing error: {e}")
                time.sleep(1.0)

        self._flush_batches()

    def _merge_duplicate_events(self, events: List[FileChangeEvent]) -> List[FileChangeEvent]:
        path_last_event = {}
        result = []

        for event in events:
            path = event.path
            if path in path_last_event:
                existing = path_last_event[path]
                if event.event_type == EventType.DELETED:
                    result.append(event)
                    del path_last_event[path]
                elif existing.event_type != EventType.DELETED:
                    path_last_event[path] = event
            else:
                path_last_event[path] = event
                result.append(event)

        return result

    def _flush_batches(self):
        with self._lock:
            if not self._pending_batches:
                return
            all_events = []
            for batch in self._pending_batches:
                all_events.extend(batch)
            self._pending_batches.clear()

        if not all_events:
            return

        try:
            futures = [
                self._executor.submit(self._process_batch, batch)
                for batch in self._chunk_events(all_events, self.batch_size * 2)
            ]
            for future in futures:
                future.result(timeout=30.0)
        except Exception as e:
            if is_dev:
                print(f"[IIB Watch] Batch processing error: {e}")

    def _chunk_events(self, events: List[FileChangeEvent], chunk_size: int) -> List[List[FileChangeEvent]]:
        return [events[i:i + chunk_size] for i in range(0, len(events), chunk_size)]

    def _process_batch(self, events: List[FileChangeEvent]):
        if not events:
            return

        path_to_events = {}
        for event in events:
            if event.path not in path_to_events:
                path_to_events[event.path] = []
            path_to_events[event.path].append(event)

        conn = DataBase.get_conn()
        try:
            for path, path_events in path_to_events.items():
                try:
                    if os.path.exists(path):
                        latest_event = max(path_events, key=lambda e: e.timestamp)
                        if latest_event.event_type != EventType.DELETED:
                            self._add_image(path)
                        elif latest_event.event_type == EventType.MODIFIED:
                            self._add_image(path)
                    else:
                        self._remove_image(conn, path)
                except Exception as e:
                    if is_dev:
                        print(f"[IIB Watch] Error processing {path}: {e}")
            conn.commit()
        except Exception:
            conn.rollback()

    def _add_image(self, path: str):
        if not is_valid_media_path(path):
            return
        path = os.path.normpath(path)
        self._processed_paths.add(path)
        try:
            add_image_data_single(path)
            if is_dev:
                print(f"[IIB Watch] Added: {os.path.basename(path)}")
        except Exception as e:
            if is_dev:
                print(f"[IIB Watch] Failed to add {path}: {e}")

    def _remove_image(self, conn, path: str):
        path = os.path.normpath(path)
        if path in self._processed_paths:
            self._processed_paths.discard(path)
        try:
            img = Image.get(conn, path)
            if img:
                ImageTag.remove(conn, image_id=img.id)
                Image.remove(conn, img.id)
                if is_dev:
                    print(f"[IIB Watch] Removed: {os.path.basename(path)}")
        except Exception as e:
            if is_dev:
                print(f"[IIB Watch] Failed to remove {path}: {e}")


def start_file_watcher(
    watch_dirs: List[str],
    batch_size: int = 32,
    batch_timeout: float = 2.0,
    max_workers: int = 2,
) -> bool:
    if IIBFileWatcher.get_instance() is not None:
        stop_file_watcher()

    watcher = IIBFileWatcher(
        watch_dirs=watch_dirs,
        batch_size=batch_size,
        batch_timeout=batch_timeout,
        max_workers=max_workers,
    )
    return watcher.start()


def stop_file_watcher():
    watcher = IIBFileWatcher.get_instance()
    if watcher is not None:
        watcher.stop()
        return True
    return False


def get_watcher_status() -> dict:
    watcher = IIBFileWatcher.get_instance()
    if watcher is None:
        return {"running": False}
    return {
        "running": watcher._running,
        "watch_dirs": watcher.watch_dirs,
        "queue_size": watcher._event_queue.qsize(),
        "pending_batches": len(watcher._pending_batches),
    }
