#!/usr/bin/env python3
"""Refresh the Writing section of index.html from the Medium RSS feed.

Rewrites everything between the <!--START_SECTION:x--> / <!--END_SECTION:x-->
markers. Standard library only, so the workflow needs no install step.
"""
from __future__ import annotations

import html
import os
import pathlib
import re
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

USER = os.environ.get("BLOG_USER", "cybersamarth")
FEED = os.environ.get("BLOG_FEED", f"https://medium.com/feed/@{USER}")
PAGE = pathlib.Path(__file__).resolve().parent.parent / "index.html"
MAX_POSTS = int(os.environ.get("MAX_POSTS", "6"))


def fetch_posts() -> tuple[list[tuple[str, str, str]], int]:
    req = urllib.request.Request(FEED, headers={"User-Agent": f"{USER}-site-bot"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        root = ET.fromstring(resp.read())

    posts = []
    total = len(list(root.iterfind(".//item")))
    for item in list(root.iterfind(".//item"))[:MAX_POSTS]:
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").split("?")[0].strip()
        when = ""
        if raw := item.findtext("pubDate"):
            try:
                when = parsedate_to_datetime(raw).strftime("%b %Y")
            except (TypeError, ValueError):
                when = ""
        if title and link:
            posts.append((title, link, when))
    return posts, total


def render(posts: list[tuple[str, str, str]]) -> str:
    if not posts:
        return '      <li><a href="https://medium.com/@cybersamarth">Read the blog on Medium</a></li>'
    return "\n".join(
        f'      <li><a href="{html.escape(link)}">'
        f'<span>{html.escape(title)}</span>'
        f'<span class="date">{html.escape(when)}</span></a></li>'
        for title, link, when in posts)


def splice(text: str, name: str, body: str) -> str:
    pattern = re.compile(
        rf"(<!--START_SECTION:{name}-->)(.*?)(<!--END_SECTION:{name}-->)", re.S)
    if not pattern.search(text):
        print(f"  ! marker '{name}' not found, skipping")
        return text
    return pattern.sub(lambda m: f"{m.group(1)}\n{body}\n{m.group(3)}", text)


def main() -> None:
    try:
        posts, total = fetch_posts()
        print(f"fetched {len(posts)} posts (feed has {total})")
    except (urllib.error.URLError, ET.ParseError) as exc:
        print(f"feed unavailable ({exc.__class__.__name__}); leaving posts as they are")
        return

    text = PAGE.read_text()
    text = splice(text, "posts", render(posts))
    if total:
        text = splice(text, "postcount", str(total))
    stamp = datetime.now(timezone.utc).strftime("%d %b %Y")
    text = splice(text, "updated", f"Updated {stamp}")
    PAGE.write_text(text)
    print(f"wrote {PAGE}")


if __name__ == "__main__":
    main()
