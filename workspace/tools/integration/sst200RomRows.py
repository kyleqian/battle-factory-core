#!/usr/bin/env python3
"""sst200: the ROM's stat-chain print rows (docs/sst200-second-stat-rows.md) from sub183RomFrames.py r1 outputs.
Per file: `chain` = the first N consecutive hold-64 print runs that are not an effectiveness / crit / used print (lsd194PrintRuns.py's print-run rule),
F = absolute frame of the print's first glyph (run frame + first screen change), `next` = the first typed burst (a screen change followed by >= 8 changes in 12 rows)
after the last chain print's next instruction, or for a fainting user the FaintAttacker print run.
usage: sst200RomRows.py <rom r1 json...> > rom-rows.json"""
import bisect, json, os, re, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
N = {"tickle": 2, "memento": 2, "superpower": 2, "silver-wind": 5, "ancient-power": 5, "calm-mind": 2, "dragon-dance": 2, "cosmic-power": 2, "curse": 3}
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
    name = os.path.basename(path)
    move = re.match(r"sst200-(.+)-s\d+\.json-(on|off)-r1\.json", name).group(1)
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
        prints.append({"label": lab(rows[a]["ptr"]), "run": i, "frame": a, "len": b - a + 1, "first": ch[0], "last": ch[-1], "hold": b - a - ch[-1], "F": a + ch[0], "end": b + 1})
    skip = ("BattleScript_HitFromAtk", "BattleScript_MoveEnd", "BattleScript_FaintAttacker", "0x")
    chain = []
    for p in prints:
        if p["hold"] == 64 and not p["label"].startswith(skip):
            if chain and p["frame"] - chain[-1]["end"] > 12: break
            chain.append(p)
            if len(chain) == N[move]: break
    after = chain[-1]["end"]
    nxt = next((p for p in prints if p["label"].startswith("BattleScript_FaintAttacker") and p["frame"] >= after), None)
    kind = "faint print"
    if nxt is None:
        kind = "typed burst"
        x = after
        chg = lambda y: rows[y]["scr"] != rows[y - 1]["scr"]
        while x + 12 < len(rows) and not (chg(x) and sum(chg(x + k) for k in range(12)) >= 8): x += 1
        nxt = {"F": x, "label": lab(rows[x]["ptr"])}
    out[name] = {"move": move, "chain": chain, "next": {"kind": kind, "F": nxt["F"], "label": nxt["label"]}}
print(json.dumps(out, indent=1))
