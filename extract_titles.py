from __future__ import annotations

import json
import xml.etree.ElementTree as ET
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
TITLE_RAW_DIR = BASE_DIR / "title_raw"
OUTPUT_PATH = BASE_DIR / "title.json"
TITLE_FILENAME = "Title.xml"


def iter_title_files(base_dir: Path) -> list[Path]:
    if not base_dir.exists():
        raise FileNotFoundError(f"未找到目录: {base_dir}")
    return sorted(base_dir.rglob(TITLE_FILENAME))


def extract_title_info(xml_path: Path) -> dict[str, str]:
    tree = ET.parse(xml_path)
    root = tree.getroot()

    name = root.findtext("./name/str")
    rare_type = root.findtext("./rareType")

    if name is None:
        raise ValueError(f"文件 {xml_path} 缺少 name/str 节点")

    if rare_type is None:
        rare_type = ""

    return {"name": name, "rareType": rare_type}


def main() -> None:
    title_files = iter_title_files(TITLE_RAW_DIR)

    titles = []
    for xml_path in title_files:
        try:
            titles.append(extract_title_info(xml_path))
        except Exception as exc:  # noqa: BLE001
            raise RuntimeError(f"解析 {xml_path} 时发生错误") from exc

    OUTPUT_PATH.write_text(
        json.dumps(titles, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
