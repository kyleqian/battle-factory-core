#!/usr/bin/env python3
"""prep16: BG-register / hardware-scroll / software-matrix history at the activation of the target bodies (Silver Wind 318, Psych Up 244, Overheat 315), from prep16Probe.py output.
Signature = IO registers 0x00..0x56 (dispcnt, bg0-3cnt, bg0-3 hofs/vofs, win*, bld*) + gBattle_BG*_X/Y + software gOamMatrices + bitmap.  Reports (1) activation signature vs the first-body signature of the same
attacker side, per predecessor move; (2) whether the activation signature is a function of (target move, attacker side, previous body move) across all scenarios/turns; (3) per-move 'registers left at end' (end+1 and end+30
signature stability) and whether activation(N) == end+30(N-1) for every body pair.   usage: prep16BgHistory.py PROBE_DIR OUT_JSON"""
import hashlib, json, sys, collections
from pathlib import Path
D, OUT = Path(sys.argv[1]), Path(sys.argv[2])
NAMES = {"00": "dispcnt", "08": "bg0cnt", "0a": "bg1cnt", "0c": "bg2cnt", "0e": "bg3cnt", "10": "bg0hofs", "12": "bg0vofs", "14": "bg1hofs", "16": "bg1vofs", "18": "bg2hofs", "1a": "bg2vofs", "1c": "bg3hofs", "1e": "bg3vofs",
         "40": "win0h", "42": "win1h", "44": "win0v", "46": "win1v", "48": "winin", "4a": "winout", "4c": "mosaic", "50": "bldcnt", "52": "bldalpha", "54": "bldy"}
def sig(s):
    return {"io": {NAMES[k]: v for k, v in s["io"].items() if k in NAMES}, "bgVars": s["bgVars"], "matricesSha": hashlib.sha1(json.dumps(s["matrices"]).encode()).hexdigest()[:10], "nonzeroMatrices": sum(1 for i in range(0, 128, 4) if any(s["matrices"][i:i + 4])), "bitmap": s["bitmap"]}
def flat(g):
    d = dict(g["io"]); d.update({"var:" + k: v for k, v in g["bgVars"].items()}); d["matricesSha"] = g["matricesSha"]; d["bitmap"] = g["bitmap"]; return d
def diff(a, b): return {k: [a[k], b[k]] for k in a if a[k] != b[k]}
runs = {}
for f in sorted(D.glob("prep16-*.json")):
    if f.name.endswith(".log"): continue
    j = json.loads(f.read_text()); runs[f.stem[7:]] = j["bodies"]
TARGET = {318: "SILVER_WIND", 244: "PSYCH_UP", 315: "OVERHEAT"}
MV = {0: "stat/none(0)", 14: "SWORDS_DANCE", 33: "TACKLE", 45: "GROWL", 63: "HYPER_BEAM", 94: "PSYCHIC", 150: "SPLASH", 318: "SILVER_WIND", 244: "PSYCH_UP", 315: "OVERHEAT", None: "FIRST"}
rows = []
for n, bodies in runs.items():
    for i, b in enumerate(bodies):
        a = b["atActivation"]
        rows.append({"scn": n, "i": i, "move": b["move"], "side": "player" if b["attacker"] == 0 else "opponent", "prev": b["prevMove"], "turn2": b["start"] > 800, "act": flat(sig(a)),
                     "e1": flat(sig(b["atEnd+1"])) if "atEnd+1" in b else None, "e30": flat(sig(b["atEnd+30"])) if "atEnd+30" in b else None, "pre": {NAMES[k]: v for k, v in (b["preAct"] or {}).items() if k in NAMES}})
res = {"targets": {}}
for mv, nm in TARGET.items():
    for side in ("player", "opponent"):
        sel = [r for r in rows if r["move"] == mv and r["side"] == side]
        if not sel: continue
        ref = next((r for r in sel if r["prev"] is None and not r["turn2"]), None)
        tbl = []
        for r in sel:
            tbl.append({"scn": r["scn"], "turn": 2 if r["turn2"] else 1, "prev": MV.get(r["prev"], r["prev"]), "diffVsFirstBody": diff(ref["act"], r["act"]) if ref else "no first-body run"})
        # function-of (prev) test: distinct activation signatures per prev
        byprev = collections.defaultdict(set)
        for r in sel: byprev[MV.get(r["prev"], r["prev"])].add(json.dumps(r["act"], sort_keys=True))
        res["targets"][f"{nm}/{side}"] = {"firstBodyScenarios": [r["scn"] for r in sel if r["prev"] is None and not r["turn2"]], "rows": tbl, "distinctActSignaturesPerPrev": {k: len(v) for k, v in byprev.items()},
                                           "prevToSignatureGroups": None}
        # group prevs by identical signature
        grp = collections.defaultdict(list)
        for k, v in byprev.items():
            for s in v: grp[hashlib.sha1(s.encode()).hexdigest()[:8]].append(k)
        res["targets"][f"{nm}/{side}"]["prevToSignatureGroups"] = list(grp.values())
# per-move left-at-end table and chain test
left = collections.defaultdict(lambda: collections.defaultdict(set))
for r in rows:
    if r["e1"]: left[MV.get(r["move"], r["move"])]["end+1"].add(json.dumps(r["e1"], sort_keys=True))
    if r["e30"]: left[MV.get(r["move"], r["move"])]["end+30"].add(json.dumps(r["e30"], sort_keys=True))
res["leftAtEnd"] = {m: {k: len(v) for k, v in d.items()} for m, d in left.items()}
# chain: activation(N) == end+30(N-1)?
chain = collections.Counter(); chainBad = []
for n, bodies in runs.items():
    for i in range(1, len(bodies)):
        p, c = bodies[i - 1], bodies[i]
        if "atEnd+30" not in p: continue
        eq = flat(sig(p["atEnd+30"])) == flat(sig(c["atActivation"])); chain[eq] += 1
        if not eq and len(chainBad) < 400: chainBad.append({"scn": n, "prev": MV.get(p["move"]), "move": MV.get(c["move"]), "gapFrames": c["start"] - p["end"], "diff": diff(flat(sig(p["atEnd+30"])), flat(sig(c["atActivation"])))})
res["chainActEqualsPrevEnd30"] = {"equal": chain[True], "different": chain[False]}
# per (prev,move) tables for the targets: signature of end+30 of prev vs act -> if different, which regs
cb = collections.defaultdict(lambda: collections.defaultdict(int))
for c in chainBad:
    for k in c["diff"]: cb[f"{c['prev']}->{c['move']}"][k] += 1
res["chainDifferingRegisters"] = {k: dict(v) for k, v in cb.items()}
# gap-frame distribution: when act != prev end+30, is it just that more frames elapsed (menu/turn text)? record gap
res["chainBadGap"] = [[c["prev"], c["move"], c["gapFrames"], sorted(c["diff"])] for c in chainBad[:60]]
OUT.write_text(json.dumps(res, indent=0, separators=(",", ":")))
for k, v in res["targets"].items():
    print("==", k, "first-body:", v["firstBodyScenarios"], "prev groups with identical signature:", v["prevToSignatureGroups"])
    for r in v["rows"]: print("  ", r["turn"], r["prev"], r["scn"], json.dumps(r["diffVsFirstBody"])[:260])
print("left-at-end distinct signatures per move:", res["leftAtEnd"]); print("act==prev end+30:", res["chainActEqualsPrevEnd30"])
