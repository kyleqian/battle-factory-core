#!/usr/bin/env python3
"""tl204: the ROM's rows around the live body of a Scene ON zero-tail no-hit move (docs/tl204-zero-tail-rows.md), from sub183RomFrames.py r1 outputs.
Per file (rows are 1/frame, `ptr` = gBattlescriptCurrInstr): runs = consecutive frames on one ptr.
  used = the first run after frame 38 with >= 15 screen changes (the "<MON> used <MOVE>!" print; F = run start + first change, first == 1);
  segments = every run from the used run's start up to the print run, merged where a run has no screen change ("script" rows) -- the body's window;
  print = the first hold-64 print run (>= 2 changes, >= 24 rows, hold = len - 1 - last == 64) after the used run (the stat / weather / screen / seed print), F = run start + first;
  next = the first typed burst (a screen change followed by >= 8 changes in 12 rows, sst200RomRows.py's rule) after the end of the print chain (hold-64 print runs starting within 12 rows of the previous one; Calm Mind has 2) = the foe's "used TACKLE!" print.
usage: tl204RomRows.py <rom r1 json...> > rom-rows.json"""
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
    name = os.path.basename(path)
    move = re.match(r"tl204-(.+)-s\d+\.json-on-r1\.json", name).group(1)
    rows = json.load(open(path))["rows"]
    chg = lambda y: y > 0 and rows[y]["scr"] != rows[y - 1]["scr"]
    runs, f = [], 0
    while f < len(rows):
        g = f
        while g + 1 < len(rows) and rows[g + 1]["ptr"] == rows[f]["ptr"]: g += 1
        ch = [x - f for x in range(f, g + 1) if chg(x)]
        runs.append({"a": f, "b": g, "len": g - f + 1, "label": lab(rows[f]["ptr"]), "changes": len(ch), "first": ch[0] if ch else None, "last": ch[-1] if ch else None}); f = g + 1
    ui = next(i for i, r in enumerate(runs) if r["a"] > 38 and r["changes"] >= 15)
    U = runs[ui]
    pi = next(i for i, r in enumerate(runs) if i > ui and r["changes"] >= 2 and r["len"] >= 24 and r["len"] - 1 - r["last"] == 64)
    P = runs[pi]
    seg = []
    for r in runs[ui:pi]:
        if r["changes"] == 0 and seg and seg[-1]["kind"] == "script": seg[-1]["len"] += r["len"]; seg[-1]["end"] = r["b"] + 1; continue
        seg.append({"kind": "script" if r["changes"] == 0 else ("used-print" if r is U else "window"), "label": r["label"], "start": r["a"], "end": r["b"] + 1, "len": r["len"],
                    "changes": r["changes"], "firstChange": r["a"] + r["first"] if r["first"] is not None else None, "lastChange": r["a"] + r["last"] if r["last"] is not None else None})
    chain = [P]
    while pi + 1 + 3 > 0:
        nx = next((r for r in runs[runs.index(chain[-1]) + 1:] if r["a"] <= chain[-1]["b"] + 12 and r["changes"] >= 2 and r["len"] >= 24 and r["len"] - 1 - r["last"] == 64), None)
        if nx is None: break
        chain.append(nx)
    x = chain[-1]["b"] + 1
    while x + 12 < len(rows) and not (chg(x) and sum(chg(x + k) for k in range(12)) >= 8): x += 1
    wins = [s for s in seg if s["kind"] == "window"]
    out[name] = {"move": move, "usedF": U["a"] + U["first"], "usedRunStart": U["a"], "usedRunEnd": U["b"] + 1, "usedLabel": U["label"], "usedGlyphs": U["last"] - U["first"] + 1,
                 "printF": P["a"] + P["first"], "printRunStart": P["a"], "printRunEnd": P["b"] + 1, "printLabel": P["label"], "printLast": P["last"],
                 "chainF": [r["a"] + r["first"] for r in chain], "nextF": x, "nextLabel": lab(rows[x]["ptr"]), "segments": seg,
                 "bodyFirstChange": wins[0]["firstChange"] if wins else None, "bodyLastChange": wins[-1]["lastChange"] if wins else None,
                 "releaseRow": wins[-1]["end"] if wins else None}
print(json.dumps(out, indent=1))
