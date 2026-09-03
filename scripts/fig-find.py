"""Figma nodes JSON から名前でノードを検索し、id / 位置 / 画像参照を出力する。

usage: python scripts/fig-find.py <json> <name-substring> [--type TYPE]
"""
import io
import json
import sys

path = sys.argv[1]
needle = sys.argv[2]
want = None
if "--type" in sys.argv:
    want = sys.argv[sys.argv.index("--type") + 1]

d = json.load(io.open(path, encoding="utf-8"))
rootbox = None


def walk(n, trail):
    global rootbox
    b = n.get("absoluteBoundingBox") or {}
    if rootbox is None and b:
        rootbox = b
    name = n.get("name") or ""
    if needle in name and (want is None or n.get("type") == want):
        ox = rootbox.get("x", 0)
        oy = rootbox.get("y", 0)
        img = ""
        for f in n.get("fills") or []:
            if f.get("type") == "IMAGE":
                img = " imageRef=%s scale=%s" % (f.get("imageRef"), f.get("scaleMode"))
        print("%-18s %-10s %-26s %5d,%-6d %4dx%-5d%s" % (
            n.get("id"), n.get("type"), name[:26],
            round(b.get("x", 0) - ox), round(b.get("y", 0) - oy),
            round(b.get("width", 0)), round(b.get("height", 0)), img))
        print("    親: " + " > ".join(trail[-4:]))
    for c in n.get("children", []):
        walk(c, trail + [name])


for k, v in d["nodes"].items():
    walk(v["document"], [])
