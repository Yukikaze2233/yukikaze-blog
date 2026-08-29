#!/usr/bin/env python3
"""新建一篇博客文章草稿。"""
import argparse
import datetime
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
POSTS_DIR = ROOT / "posts"


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9\u4e00-\u9fff]+", "-", text)
    return text.strip("-") or "untitled"


def main() -> None:
    parser = argparse.ArgumentParser(description="新建博客文章")
    parser.add_argument("title", help="文章标题")
    parser.add_argument("--slug", help="英文 slug（可选）")
    parser.add_argument("--tags", default="", help="标签，英文逗号分隔")
    parser.add_argument("--date", default=str(datetime.date.today()), help="日期 YYYY-MM-DD")
    args = parser.parse_args()

    slug = args.slug or slugify(args.title)
    path = POSTS_DIR / f"{slug}.md"
    if path.exists():
        print(f"已存在：{path}")
        raise SystemExit(1)

    tags = [t.strip() for t in args.tags.split(",") if t.strip()]
    content = [
        "---",
        f"title: {args.title}",
        f"date: {args.date}",
        "excerpt: 一句话摘要",
        f"tags: [{', '.join(tags)}]",
        "---",
        "",
        f"# {args.title}",
        "",
        "开始写正文…",
        "",
    ]
    path.write_text("\n".join(content), encoding="utf-8")
    print(f"已创建：{path}")

    subprocess.run(["python3", str(ROOT / "scripts" / "build_posts_index.py")], check=True)
    print("索引已更新。")


if __name__ == "__main__":
    main()
