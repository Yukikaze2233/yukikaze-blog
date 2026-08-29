#!/usr/bin/env python3
"""扫描 posts/*.md 的 YAML front matter，生成 posts/index.json。"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
POSTS_DIR = ROOT / "posts"
OUT = POSTS_DIR / "index.json"

FM_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n?", re.DOTALL)


def parse_front_matter(text: str) -> dict:
    m = FM_RE.match(text)
    if not m:
        return {}
    fm = {}
    for line in m.group(1).splitlines():
        if ":" not in line:
            continue
        key, _, value = line.partition(":")
        key = key.strip()
        value = value.strip()
        if value.startswith("[") and value.endswith("]"):
            value = [v.strip().strip("'\"") for v in value[1:-1].split(",") if v.strip()]
        else:
            value = value.strip("'\"")
        fm[key] = value
    return fm


def main() -> None:
    posts = []
    for path in sorted(POSTS_DIR.glob("*.md")):
        text = path.read_text(encoding="utf-8")
        fm = parse_front_matter(text)
        posts.append(
            {
                "slug": path.stem,
                "title": fm.get("title", path.stem),
                "date": fm.get("date", ""),
                "excerpt": fm.get("excerpt", ""),
                "tags": fm.get("tags", []),
                "draft": str(fm.get("draft", "")).lower() == "true",
            }
        )
    posts.sort(key=lambda p: p["date"], reverse=True)
    OUT.write_text(json.dumps(posts, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT} ({len(posts)} posts)")


if __name__ == "__main__":
    main()
