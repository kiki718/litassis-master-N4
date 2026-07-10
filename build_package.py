from __future__ import annotations

import argparse
import fnmatch
import os
import zipfile
from datetime import date
from pathlib import Path


ROOT = Path(__file__).resolve().parent

EXCLUDE_DIRS = {
    "__pycache__",
    ".git",
    "dist",
    "logs",
    "outputs",
}

EXCLUDE_PATTERNS = {
    ".env",
    "*.pyc",
    "*.pyo",
    "*.zip",
    "data/cache/*",
}


def should_exclude(path: Path) -> bool:
    relative = path.relative_to(ROOT).as_posix()
    if any(part in EXCLUDE_DIRS for part in path.relative_to(ROOT).parts):
        return True
    return any(fnmatch.fnmatch(relative, pattern) for pattern in EXCLUDE_PATTERNS)


def build_package(version: str | None = None) -> Path:
    version = version or date.today().strftime("%Y%m%d")
    dist_dir = ROOT / "dist"
    dist_dir.mkdir(exist_ok=True)
    package_path = dist_dir / f"literature_assistant_v2_{version}.zip"
    if package_path.exists():
        package_path.unlink()

    with zipfile.ZipFile(package_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for current_root, dirs, files in os.walk(ROOT):
            current_path = Path(current_root)
            dirs[:] = [item for item in dirs if item not in EXCLUDE_DIRS and not should_exclude(current_path / item)]
            for file_name in files:
                file_path = current_path / file_name
                if should_exclude(file_path):
                    continue
                archive.write(file_path, file_path.relative_to(ROOT))
    return package_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a deployable Literature Assistant zip package.")
    parser.add_argument("--version", default=None, help="Package version suffix. Default: YYYYMMDD.")
    args = parser.parse_args()
    package_path = build_package(args.version)
    print(package_path)


if __name__ == "__main__":
    main()
