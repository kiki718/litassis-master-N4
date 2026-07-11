from __future__ import annotations

import os


def _patch_mineru_file_writer() -> None:
    try:
        from mineru.data.data_reader_writer.filebase import FileBasedDataWriter
    except Exception:
        return

    original_write = FileBasedDataWriter.write
    if getattr(original_write, "_litassis_parent_mkdir_patch", False):
        return

    def write_with_parent_dirs(self, path: str, data: bytes) -> None:
        parent_dir = getattr(self, "parent_dir", "") or ""
        target = path if os.path.isabs(path) else os.path.join(parent_dir, path)
        target_parent = os.path.dirname(target)
        if target_parent:
            os.makedirs(target_parent, exist_ok=True)
        return original_write(self, path, data)

    write_with_parent_dirs._litassis_parent_mkdir_patch = True
    FileBasedDataWriter.write = write_with_parent_dirs


_patch_mineru_file_writer()
