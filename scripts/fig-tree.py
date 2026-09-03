"""Figma REST の nodes JSON からフレーム構造（位置・サイズ・塗り・角丸）を出力する。

usage: python scripts/fig-tree.py <json> [maxdepth] [name-filter]
"""
import io
import json
import sys


def hexof(fills):
    out = []
    for f in fills or []:
        if not f.get("visible", True):
            continue
        if f.get("type") != "SOLID":
            out.append(f.get("type"))
            continue
        c = f["color"]
        a = f.get("opacity", 1) * c.get("a", 1)
        h = "#%02x%02x%02x" % (round(c["r"] * 255), round(c["g"] * 255), round(c["b"] * 255))
        out.append(h if a >= 0.999 else "%s@%.2f" % (h, a))
    return ",".join(out)


def walk(n, depth, maxd, ox, oy, filt):
    b = n.get("absoluteBoundingBox") or {}
    x = b.get("x"); y = b.get("y"); w = b.get("width"); h = b.get("height")
    pos = ""
    if x is not None:
        pos = "%5d,%-6d %4dx%-5d" % (round(x - ox), round(y - oy), round(w), round(h))
    bg = hexof(n.get("fills"))
    st = hexof(n.get("strokes"))
    r = n.get("cornerRadius")
    extra = []
    if bg:
        extra.append("fill=" + bg)
    if st:
        extra.append("stroke=%s/%sw" % (st, n.get("strokeWeight")))
    if r:
        extra.append("r=%s" % r)
    if n.get("layoutMode"):
        extra.append("auto=%s" % n["layoutMode"])
    if n.get("visible") is False:
        extra.append("HIDDEN")
    line = "%s%-14s %-24s %s" % ("  " * depth, n.get("type", ""), (n.get("name") or "")[:24], pos)
    if extra:
        line += "  " + " ".join(extra)
    if not filt or filt in (n.get("name") or ""):
        print(line)
    if depth < maxd:
        for c in n.get("children", []):
            walk(c, depth + 1, maxd, ox, oy, filt)


path = sys.argv[1]
maxd = int(sys.argv[2]) if len(sys.argv) > 2 else 2
filt = sys.argv[3] if len(sys.argv) > 3 else None
d = json.load(io.open(path, encoding="utf-8"))
for k, v in d["nodes"].items():
    root = v["document"]
    b = root.get("absoluteBoundingBox") or {}
    walk(root, 0, maxd, b.get("x", 0), b.get("y", 0), filt)
