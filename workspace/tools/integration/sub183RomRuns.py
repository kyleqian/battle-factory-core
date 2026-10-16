#!/usr/bin/env python3
"""sub183: the ROM's script-row timeline of every Substitute use in sub183RomFrames.py outputs (off108Rom.py's G / run convention:
G = the "used" print's final glyph row; each run = consecutive frames on one gBattlescriptCurrInstr).
usage: sub183RomRuns.py <rom.json>... > receipt"""
import bisect, json, os, re, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
syms = []
for line in open(os.path.join(ROOT, "reference/pokeemerald/pokeemerald.map")):
    m = re.match(r"\s+0x([0-9a-f]{8,16})\s+(BattleScript_\w+)\s*$", line)
    if m: syms.append((int(m.group(1), 16), m.group(2)))
syms.sort(); addrs = [a for a, _ in syms]
ROM = open(os.path.join(ROOT, "reference/pokeemerald/pokeemerald.gba"), "rb").read()
opcode = lambda p: ROM[p - 0x08000000] if 0x08000000 <= p < 0x08000000 + len(ROM) else None
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
    uses = []
    for i, (f, g) in enumerate(runs):
        r = rows[f]
        if not f or not r["exec"] or opcode(rows[f - 1]["ptr"]) != 0x02 or r["mv"] != 164: continue
        ch = [x for x in range(f, g + 1) if rows[x]["scr"] != rows[x - 1]["scr"]]
        if not ch: continue
        uses.append({"i": i, "atk": r["atk"], "G": g - 1, "firstGlyph": ch[0], "romFrameOfUse": f})
    res = []
    for k, u in enumerate(uses):
        end = uses[k + 1]["i"] if k + 1 < len(uses) else len(runs)
        G = u["G"]; seq = []
        for (f, g) in runs[u["i"] + 1:end]:
            ch = [x - G for x in range(f, g + 1) if x and rows[x]["scr"] != rows[x - 1]["scr"]]
            seq.append([lab(rows[f]["ptr"]), f - G, g - f + 1, rows[f]["exec"], rows[f]["act"], ch[:2] + ([ch[-1]] if len(ch) > 2 else []), len(ch)])
            if len(seq) >= 14: break
        res.append({**u, "runs": seq})
    out[os.path.basename(path)] = res
print(json.dumps(out, indent=1))
