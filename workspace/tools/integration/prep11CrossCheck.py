#!/usr/bin/env python3
"""prep11: cross-check the fresh prep11 measurements against the RETAINED ACCEPTED dense-state corpora (tools/compare/evidence/<move>-<side>-dense-state.json.gz).
Per (move, side): window length, matrixBitmap at the first accepted frame, the ordered sprite spawn list (slot, template, palette bank, tile, matrix) of the move's sprites, and the
ordered task (slot, func) first appearances. The accepted corpora come from their own (Factory-staged) scenarios, so equality here is evidence that the allocator constants are
history/scenario independent, not that the scenarios are the same. usage: prep11CrossCheck.py [analysis.json]  -> fixtures/prep11/prep11-crosscheck.json"""
import gzip, json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
A = json.loads((ROOT / "tools/integration/fixtures/prep11/prep11-analysis.json").read_text())
EV = ROOT / "tools/compare/evidence"
MOVES = {"air-cutter": "AIR_CUTTER", "destiny-bond": "DESTINY_BOND", "foresight": "FORESIGHT", "leech-seed": "LEECH_SEED", "petal-dance": "PETAL_DANCE", "recycle": "RECYCLE",
         "rollout": "ROLLOUT", "sky-uppercut": "SKY_UPPERCUT", "spider-web": "SPIDER_WEB", "tri-attack": "TRI_ATTACK"}
def mine(move, side):
    for sc, rows in A.items():
        if f"-{side}-" not in sc or "alt" in sc or f"mechanic-{move}-" not in sc: continue
        for r in rows:
            if r["move"] == MOVES[move]: return sc, r
def acc(move, side):  # older corpora (leech seed, recycle, tri attack) predate resourceAllocators: bitmap0 None there
    c = json.load(gzip.open(EV / f"{move}-{side}-dense-state.json.gz")); f = c.get("frames") or c["windows"]["main"]["frames"]  # leech seed / rollout corpora nest the body windows
    if not f: raise FileNotFoundError(move)
    f0 = f[0]; base_slots = {s["slot"] for s in f0["sprites"]}
    seen = set(base_slots); spawns = []; tasks = []; seen_t = set()
    for i, fr in enumerate(f):
        cur = {s["slot"]: s for s in fr["sprites"]}
        for slot, s in cur.items():
            if slot not in seen:
                seen.add(slot); a = s["attr"]
                spawns.append([i, slot, s["template"]["symbol"], a[2] >> 12, a[2] & 0x3ff, (a[1] >> 9) & 31 if a[0] & 0x100 else None])
        seen = {x for x in seen if x in cur or x in base_slots}
        for t in fr["tasks"]:
            k = (t["slot"], t["func"]["symbol"])
            if k not in seen_t: seen_t.add(k); tasks.append([i, t["slot"], t["func"]["symbol"]])
    return {"first": f0["frame"], "last": f[-1]["frame"], "rows": len(f), "bitmap0": (f0.get("resourceAllocators") or {}).get("matrixBitmap"), "tasks0": len(f0["tasks"]), "spawns": spawns, "tasks": tasks,
            "order0": f0["spriteOrder"][:20]}
out = {}
for move in MOVES:
    for side in ("player", "opponent"):
        try: a = acc(move, side)
        except (FileNotFoundError, KeyError, TypeError) as e: out[f"{move}-{side}"] = {"error": repr(e)}; continue
        m = mine(move, side)
        if not m: out[f"{move}-{side}"] = {"accepted": {k: a[k] for k in ("first", "last", "rows", "bitmap0")}, "mine": None}; continue
        sc, r = m
        # my spawns: first spawn of each slot (the corpus first-appearance logic ignores re-use of an already seen slot only when still live; compare sets of (template, pal, tile, matrix) and spawn slots)
        mySpawns = [[s["age"], s["slot"], s["tmpl"], s["palLate"], s["tile"], s["matrix"]] for s in r["sprites"]]
        key = lambda l: sorted({(x[2], x[3], x[4], x[5]) for x in l})
        myTasks = sorted({(int(k), v) for _, t in r["taskEvents"] for k, v in t.items()})
        accTasks = sorted({(t[1], t[2]) for t in a["tasks"]})
        out[f"{move}-{side}"] = {"scenario": sc, "windowRows": {"accepted": a["rows"], "mine": r["duration"] + 1}, "firstFrame": {"accepted": a["first"], "mine": r["act"]},
            "bitmapAtActivation": {"accepted": a["bitmap0"], "mine": r["bitmap"]}, "tasksAtActivation": {"accepted": a["tasks0"], "mine": len(r["tasksAtAct"])},
            "spriteKinds(template,pal,tile,matrix)": {"equal": key(a["spawns"]) == key(mySpawns), "accepted": key(a["spawns"]), "mine": key(mySpawns)},
            "spawnSlotSequenceEqual": [x[1] for x in a["spawns"]] == [x[1] for x in mySpawns], "taskPairsEqual": myTasks == accTasks, "taskPairsOnlyAccepted": [list(x) for x in set(accTasks) - set(myTasks)],
            "taskPairsOnlyMine": [list(x) for x in set(myTasks) - set(accTasks)]}
(ROOT / "tools/integration/fixtures/prep11/prep11-crosscheck.json").write_text(json.dumps(out, indent=1))
for k, v in out.items():
    if "scenario" not in v: print(k, v); continue
    print(k, "rows", v["windowRows"], "bitmap", v["bitmapAtActivation"], "kinds==", v["spriteKinds(template,pal,tile,matrix)"]["equal"], "slots==", v["spawnSlotSequenceEqual"], "tasks==", v["taskPairsEqual"],
          "onlyAcc", v["taskPairsOnlyAccepted"][:3], "onlyMine", v["taskPairsOnlyMine"][:3])
