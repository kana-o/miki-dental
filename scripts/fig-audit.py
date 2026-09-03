"""全ページのカンプJSONを走査し、「面（カード／帯）」になっているノードを一覧化する。

- 塗り（SOLID）を持ち、幅240px以上・高さ24px以上のフレーム／矩形
- NOISE などのエフェクトが乗っているノード（見た目の色が塗り値と一致しないので要注意）

usage: python scripts/fig-audit.py <dir> [--noise-only]
"""
import glob
import io
import json
import os
import sys

d = sys.argv[1]
noise_only = "--noise-only" in sys.argv


def hexof(f):
    c = f["color"]
    a = f.get("opacity", 1) * c.get("a", 1)
    h = "#%02x%02x%02x" % (round(c["r"] * 255), round(c["g"] * 255), round(c["b"] * 255))
    return h if a >= 0.999 else "%s@%d%%" % (h, round(a * 100))


for path in sorted(glob.glob(d + "/*.json")):
    page = os.path.basename(path)[:-5]
    if page in ("imagefills",):
        continue
    try:
        doc = json.load(io.open(path, encoding="utf-8"))
    except Exception as e:
        print("!! %s 読み込み失敗: %s" % (page, e))
        continue
    rows = []
    root = None

    def walk(n):
        global root
        b = n.get("absoluteBoundingBox") or {}
        if root is None and b:
            root = b
        if not b:
            for c in n.get("children", []):
                walk(c)
            return
        w, h = b.get("width", 0), b.get("height", 0)
        eff = [e for e in (n.get("effects") or []) if e.get("visible", True) and e.get("type") not in ("DROP_SHADOW", "INNER_SHADOW")]
        solid = [f for f in (n.get("fills") or []) if f.get("visible", True) and f.get("type") == "SOLID"]
        if w >= 240 and h >= 24 and (solid or eff):
            if noise_only and not eff:
                pass
            else:
                tag = ""
                if eff:
                    e = eff[0]
                    c = e.get("color") or {}
                    tag = " [%s %s a=%.2f]" % (e["type"], "#%02x%02x%02x" % (
                        round(c.get("r", 0) * 255), round(c.get("g", 0) * 255), round(c.get("b", 0) * 255)) if c else "-",
                        c.get("a", 1) if c else 1)
                rows.append("    %-26s %5d,%-6d %4dx%-5d %-12s r=%-5s%s" % (
                    (n.get("name") or "")[:26],
                    round(b["x"] - root["x"]), round(b["y"] - root["y"]), round(w), round(h),
                    ",".join(hexof(f) for f in solid) or "-",
                    n.get("cornerRadius") or 0, tag))
        for c in n.get("children", []):
            walk(c)

    for k, v in doc.get("nodes", {}).items():
        walk(v["document"])
    if rows:
        print("### %s (%d)" % (page, len(rows)))
        for r in rows:
            print(r)
