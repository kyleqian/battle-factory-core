#!/usr/bin/env python3
"""lsd194: the ROM's print runs in sub183RomFrames.py outputs (docs/lsd194-print-floor-and-drain.md).
A "print run" = consecutive frames on one gBattlescriptCurrInstr (a `waitmessage`) that contain >= 2 screen changes (glyphs) and last >= 24 rows.
Row 0 = the run's first frame. first = first screen change (the first glyph), last = last screen change (the final glyph), len = run length;
the next instruction starts at run row `len`, so first glyph -> next command = len - first and hold = len - 1 - last (0-indexed rows).
usage: lsd194PrintRuns.py <rom.json>... > receipt.json"""
import bisect, json, os, re, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
syms = []
for line in open(os.path.join(ROOT, "reference/pokeemerald/pokeemerald.map")):
    m = re.match(r"\s+0x([0-9a-f]{8,16})\s+(BattleScript_\w+)\s*$", line)
    if m: syms.append((int(m.group(1), 16), m.group(2)))
syms.sort(); addrs = [a for a, _ in syms]
def lab(p):
    i = bisect.bisect_right(addrs, p) - 1
    return f"{syms[i][1]}+{p - syms[i][0]}" if i >= 0 and p - syms[i][0] < 1024 else hex(p)
out = {}
for path in sys.argv[1:]:
    rows = json.load(open(path))["rows"]
    runs, f = [], 0
    while f < len(rows):
        g = f
        while g + 1 < len(rows) and rows[g + 1]["ptr"] == rows[f]["ptr"]: g += 1
        runs.append((f, g)); f = g + 1
    prints = []
    for i, (a, b) in enumerate(runs):
        ch = [x - a for x in range(a, b + 1) if x and rows[x]["scr"] != rows[x - 1]["scr"]]
        if len(ch) < 2 or b - a + 1 < 24: continue
        nxt = runs[i + 1] if i + 1 < len(runs) else None
        prints.append({"label": lab(rows[a]["ptr"]), "frame": a, "len": b - a + 1, "first": ch[0], "last": ch[-1], "changes": len(ch),
                       "hold": b - a - ch[-1], "toNext": b - a + 1 - ch[0], "next": lab(rows[nxt[0]]["ptr"]) if nxt else None,
                       "nextFrame": nxt[0] if nxt else None})
    out[os.path.basename(path)] = prints
print(json.dumps(out, indent=1))
