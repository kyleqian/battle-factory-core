#!/usr/bin/env python3
"""lsd186: the ROM's script-row timeline of the Leech Seed turn-end drain in sub183RomFrames.py outputs (docs/lsd186-leech-seed-drain-timing.md).
Anchor D = the first frame at BattleScript_LeechSeedTurnDrain (0x082dad15). Per drain: every run (consecutive frames on one gBattlescriptCurrInstr)
from D-8 to the end of the following print, with start (relative to D), length, exec flags, anim-script-active, and screen-change rows.
usage: lsd186RomRuns.py <rom.json>... > receipt"""
import bisect, json, os, re, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
syms = []
for line in open(os.path.join(ROOT, "reference/pokeemerald/pokeemerald.map")):
    m = re.match(r"\s+0x([0-9a-f]{8,16})\s+(BattleScript_\w+)\s*$", line)
    if m: syms.append((int(m.group(1), 16), m.group(2)))
syms.sort(); addrs = [a for a, _ in syms]
ROM = open(os.path.join(ROOT, "reference/pokeemerald/pokeemerald.gba"), "rb").read()
DRAIN = next(a for a, n in syms if n == "BattleScript_LeechSeedTurnDrain")
def lab(p):
    i = bisect.bisect_right(addrs, p) - 1
    return f"{syms[i][1]}+{p - syms[i][0]}" if i >= 0 and p - syms[i][0] < 512 else hex(p)
out = {}
for path in sys.argv[1:]:
    rows = json.load(open(path))["rows"]
    runs, f = [], 0
    while f < len(rows):
        g = f
        while g + 1 < len(rows) and rows[g + 1]["ptr"] == rows[f]["ptr"]: g += 1
        runs.append((f, g)); f = g + 1
    drains = []
    for i, (f, g) in enumerate(runs):
        if rows[f]["ptr"] != DRAIN: continue
        D = f; seq = []
        for (a, b) in runs[max(0, i - 3):i + 22]:
            ch = [x - D for x in range(a, b + 1) if x and rows[x]["scr"] != rows[x - 1]["scr"]]
            seq.append([lab(rows[a]["ptr"]), a - D, b - a + 1, rows[a]["exec"], rows[a]["act"], ch[:3] + ([ch[-1]] if len(ch) > 3 else []), len(ch)])
        drains.append({"D": D, "atk": rows[f]["atk"], "runs": seq})
    out[os.path.basename(path)] = drains
print(json.dumps(out))
