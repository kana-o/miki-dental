"""余白プロパティを含まない完全一致SCSSルールを検出する（共通化候補の抽出用）。"""
import io
import os
import re
import glob
import collections

SPACING_PROPS = ("margin", "padding", "gap", "row-gap", "column-gap",
                 "top", "left", "right", "bottom", "inset")


def has_spacing(body):
    for decl in body.split(";"):
        if ":" not in decl:
            continue
        prop = decl.split(":")[0].strip().lstrip("&").strip()
        # ネストのメディアクエリ内も含めて素のプロパティ名だけを見る
        prop = prop.split()[-1] if prop else ""
        if prop.startswith("margin") or prop.startswith("padding"):
            return True
        if prop in SPACING_PROPS:
            return True
    return False


rules = collections.defaultdict(list)
for path in sorted(glob.glob("src/scss/module/_*.scss")):
    if path.endswith("_index.scss"):
        continue
    src = io.open(path, encoding="utf-8").read()
    name = os.path.basename(path)
    i = 0
    opener = re.compile(r"^([.&][^{\n]*?)\s*\{", re.M)
    while i < len(src):
        m = opener.search(src, i)
        if not m:
            break
        sel = m.group(1).strip()
        depth, j = 1, m.end()
        while j < len(src) and depth:
            if src[j] == "{":
                depth += 1
            elif src[j] == "}":
                depth -= 1
            j += 1
        body = src[m.end():j - 1]
        norm = re.sub(r"//[^\n]*", "", body)
        norm = re.sub(r"/\*.*?\*/", "", norm, flags=re.S)
        norm = re.sub(r"\s+", " ", norm).strip()
        if len(norm) > 40 and not has_spacing(norm):
            rules[norm].append((name, sel))
        i = j

dups = {k: v for k, v in rules.items()
        if len(v) > 1 and len(set(loc[0] for loc in v)) > 1}
print("余白を含まない完全一致ルール: %d組" % len(dups))
print("")
for norm, locs in sorted(dups.items(), key=lambda x: -len(x[1])):
    print("● %d箇所 / %dファイル" % (len(locs), len(set(l[0] for l in locs))))
    for f, sel in locs:
        print("    %-24s %s" % (f, sel))
    print("    -> %s" % norm[:180])
    print("")
