#!/usr/bin/env python3
"""prep13: per-body allocator facts of the Ice Beam / Water Spout / Hidden Power / Hyper Beam probes (prep13Probe.py outputs, default /tmp/prep13-probes/r1)
-> fixtures/prep13/prep13-analysis.json, and a cross-check of every accepted scenario against the retained accepted dense corpus
(tools/compare/evidence/<move>-<side>-dense-state.json.gz) -> fixtures/prep13/prep13-crosscheck.json.   usage: prep13Analyze.py [probe-dir]"""
import gzip, json, subprocess, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
D = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/prep13-probes/r1")
OUT = ROOT / "tools/integration/fixtures/prep13"; OUT.mkdir(parents=True, exist_ok=True)
EV = ROOT / "tools/compare/evidence"
nm = subprocess.run(["arm-none-eabi-nm", "-n", str(ROOT / "reference/pokeemerald/pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
name = {}
for l in nm.splitlines():
    p = l.split()
    if len(p) == 3: name.setdefault(int(p[0], 16) & ~1, p[2])
MOVES = {58: "ICE_BEAM", 323: "WATER_SPOUT", 237: "HIDDEN_POWER", 63: "HYPER_BEAM"}
FIRST_BODY_ORDER = [62, 60, 0, 63, 1, 61, 6, 8, 2, 4, 3, 21, 20, 5]
POST_TACKLE_ORDER = [62, 60, 0, 63, 1, 61, 6, 8, 2, 3, 4, 21, 20, 5]
def side_of(sc):  # accepted scenarios: mechanic-<move>-<attackerside>-...; alternates: prep13-<move>-alt-<attackerside>-...
    return "opponent" if ("-opponent-" in sc.replace("-alt-", "-") and (sc.startswith("prep13-") and "-alt-opponent-" in sc or sc.startswith("mechanic-") and any(f"-{m}-opponent-" in sc for m in ("ice-beam", "water-spout", "hidden-power", "hyper-beam")))) else "player"
def analyse(path):
    d = json.loads(path.read_text()); rows = []
    for b in d["bodies"]:
        if b["move"] not in MOVES: continue
        a = b["atActivation"]; end = b["end"] if b["end"] is not None else d["frames"]
        sp = [s for s in d["spawns"] if b["start"] <= s["f"] <= end and s["ev"] == "+"]
        sprites = [{"age": s["f"] - b["start"], "slot": s["slot"], "tmpl": name.get(s["tmpl"] & ~1, hex(s["tmpl"])), "bank": (s.get("attrLate") or s["attr"])[2] >> 12, "tile": (s.get("attrLate") or s["attr"])[2] & 0x3ff,
                    "matrix": (s["attr"][1] >> 9) & 31 if s["attr"][0] & 0x100 else None, "x": s["x"], "y": s["y"], "x2": s["x2"], "y2": s["y2"], "sub": s["sub"], "cb": name.get(s["cb"] & ~1, hex(s["cb"])), "data": s["data"]} for s in sp]
        tasks = []
        for e in d["taskEvents"]:
            if b["start"] <= e[0] <= end:
                for k, v in e[1].items():
                    key = (int(k), name.get(v & ~1, hex(v)))
                    if key not in [(t["slot"], t["func"]) for t in tasks]: tasks.append({"age": e[0] - b["start"], "slot": key[0], "func": key[1], "data": e[2][k]})
        order_changes = [[f - b["start"], o] for f, o in d["orderSeries"] if b["start"] <= f <= end]
        e1 = b.get("atEnd+1", {})
        rows.append({"move": MOVES[b["move"]], "act": b["start"], "firstInactive": end, "rows": end - b["start"] + 1, "bitmap": a["bitmap"], "tasksAtAct": a["tasks"], "inUseAtAct": a["sprites"], "rng2": a["rng2"], "rng": a["rng"],
                     "monsAtAct": [{k: m[k] for k in ("species", "hp", "maxHP", "status1", "personality", "ivWord")} for m in a["mons"]], "battlerXY": a["battlerXY"], "battlerX2Y2": a["battlerX2Y2"], "battlerSub": a["battlerSub"], "battlerSpriteIds": a["battlerSpriteIds"],
                     "orderAtAct": a["spriteOrder"], "orderShape": "first-body" if a["spriteOrder"][:14] == FIRST_BODY_ORDER else "post-tackle" if a["spriteOrder"][:14] == POST_TACKLE_ORDER else "other",
                     "sprites": sprites, "tasks": tasks, "orderChanges": order_changes, "regsAtAct": a["regs"],
                     "netZeroAtEnd1": {"bitmap": e1.get("bitmap") == a["bitmap"], "tasks": e1.get("tasks") == a["tasks"], "sprites": e1.get("sprites") == a["sprites"], "end1": {k: e1.get(k) for k in ("bitmap", "tasks", "sprites")}}})
    return rows
out = {f.stem: analyse(f) for f in sorted(D.glob("*.json"))}
(OUT / "prep13-analysis.json").write_text(json.dumps(out, separators=(",", ":")))
# ---- cross-check vs the accepted corpora
def corpus(move, side):
    c = json.load(gzip.open(EV / f"{move}-{side}-dense-state.json.gz")); f = c["frames"]
    seen = set(); spawns = []; tasks = []; tseen = set()
    prev = set()
    for i, fr in enumerate(f):
        cur = {s["slot"]: s for s in fr["sprites"]}
        for slot, s in cur.items():
            if slot not in prev and i > 0 or (i == 0 and False):
                late = f[min(i + 3, len(f) - 1)]["sprites"]; ls = next((x for x in late if x["slot"] == slot), s); a = ls["attr"]
                spawns.append({"age": i, "slot": slot, "tmpl": s["template"]["symbol"], "bank": a[2] >> 12, "tile": a[2] & 0x3ff, "matrix": (a[1] >> 9) & 31 if a[0] & 0x100 else None})
        prev = set(cur)
        for t in fr["tasks"]:
            k = (t["slot"], t["func"]["symbol"])
            if k not in tseen: tseen.add(k); tasks.append({"age": i, "slot": t["slot"], "func": t["func"]["symbol"]})
    f0 = f[0]
    return {"first": f0["frame"], "last": f[-1]["frame"], "rows": len(f), "tasks0": len(f0["tasks"]), "inUse0": sorted(s["slot"] for s in f0["sprites"]), "spawns": spawns, "tasks": tasks, "order0": f0["spriteOrder"], "animRng0": f0["animationRng"],
            "battlerSub": [f0["battlerSprites"]["attacker"]["subpriority"], f0["battlerSprites"]["target"]["subpriority"]], "hp": [f0["battlers"]["player"]["hp"], f0["battlers"]["player"]["maxHp"], f0["battlers"]["opponent"]["hp"], f0["battlers"]["opponent"]["maxHp"]]}
cross = {}
for move in ("ice-beam", "water-spout", "hidden-power", "hyper-beam"):
    for side in ("player", "opponent"):
        sc = next(k for k in out if k.startswith(f"mechanic-{move}-{side}-"))
        r = out[sc][0]; c = corpus(move, side)
        mk = lambda l: [(x["age"], x["slot"], x["tmpl"], x["bank"], x["tile"], x["matrix"]) for x in l if x["tmpl"] != "ALLOCATE_SCRIPT_CMD_TABLE"]
        cs, ms = mk(c["spawns"]), mk(r["sprites"])
        ct = sorted({(t["slot"], t["func"]) for t in c["tasks"]}); mt = sorted({(t["slot"], t["func"]) for t in r["tasks"]})
        cross[f"{move}-{side}"] = {"scenario": sc, "firstFrame": {"corpus": c["first"], "activation": r["act"], "offset": c["first"] - r["act"]}, "rows": {"corpus": c["rows"], "probe": r["rows"]},
            "tasksAtAct": {"corpus": c["tasks0"], "probe": len(r["tasksAtAct"])}, "inUseAtAct": {"corpus": c["inUse0"], "probe": r["inUseAtAct"]}, "orderAtAct": {"corpus": c["order0"] == r["orderAtAct"]},
            "spawnsEqual": cs == ms, "spawnsOnlyCorpus": [list(x) for x in sorted(set(cs) - set(ms))][:6], "spawnsOnlyProbe": [list(x) for x in sorted(set(ms) - set(cs))][:6], "nSpawns": [len(cs), len(ms)],
            "taskPairsEqual": ct == mt, "taskPairsOnlyCorpus": ct and [list(x) for x in set(ct) - set(mt)], "taskPairsOnlyProbe": [list(x) for x in set(mt) - set(ct)],
            "animRng0==rng2AtAct": c["animRng0"] == r["rng2"], "battlerSub": {"corpus": c["battlerSub"], "probe": [r["battlerSub"][0 if side == "player" else 1], r["battlerSub"][1 if side == "player" else 0]]}, "hp": {"corpus": c["hp"]}}
(OUT / "prep13-crosscheck.json").write_text(json.dumps(cross, indent=1))
for k, v in cross.items():
    print(k, "first", v["firstFrame"], "rows", v["rows"], "tasks0", v["tasksAtAct"], "inUse==", v["inUseAtAct"]["corpus"] == v["inUseAtAct"]["probe"], "order==", v["orderAtAct"]["corpus"], "spawns==", v["spawnsEqual"], v["nSpawns"], "tasks==", v["taskPairsEqual"], "rng==", v["animRng0==rng2AtAct"], "sub", v["battlerSub"])
    if not v["spawnsEqual"]: print("   onlyCorpus", v["spawnsOnlyCorpus"], "onlyProbe", v["spawnsOnlyProbe"])
    if not v["taskPairsEqual"]: print("   tasks onlyCorpus", v["taskPairsOnlyCorpus"], "onlyProbe", v["taskPairsOnlyProbe"])
