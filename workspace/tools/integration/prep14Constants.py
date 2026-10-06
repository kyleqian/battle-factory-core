#!/usr/bin/env python3
"""prep14: per-move allocator constants + equality across accepted player / accepted opponent / alternate species (+ the retained corpora via prep14Analyze.py's
prep14-crosscheck.json), from prep13Probe.py outputs (default /tmp/p14a/r1, analysis json = prep14-analysis.json).  Includes the monbg formula check
(Task_UpdateMonBg data[1..4] == (x+x2, y+y2, 32-x', 32-y') of the battler on sprite slot data[0]) and the net-zero-at-end+1 check.
usage: prep14Constants.py PROBE_DIR OUT_JSON"""
import json, sys
from pathlib import Path
D, OUT = Path(sys.argv[1]), Path(sys.argv[2])
ROOT = Path(__file__).resolve().parents[2]
ana = json.loads((ROOT / "tools/integration/fixtures/prep14/prep14-analysis.json").read_text())
cross = json.loads((ROOT / "tools/integration/fixtures/prep14/prep14-crosscheck.json").read_text())
LABEL = {"rain-dance": "RAIN_DANCE", "overheat": "OVERHEAT", "curse-ghost": "CURSE", "curse-stat": "CURSE", "silver-wind": "SILVER_WIND", "water-pulse": "WATER_PULSE", "psych-up": "PSYCH_UP", "hail": "HAIL"}
def pick(key, pref, first_act=None):
    sc = next(k for k in ana if k.startswith(pref))
    rows = [r for r in ana[sc] if r["move"] == LABEL[key]]
    return sc, next((r for r in rows if r["act"] == first_act), rows[0])
def sig(r):
    sp = [(s["age"], s["slot"], s["tmpl"], s["bank"], s["tile"], s["matrix"]) for s in r["sprites"] if s["tmpl"] != "ALLOCATE_SCRIPT_CMD_TABLE"]
    tk = sorted({(t["age"], t["slot"], t["func"]) for t in r["tasks"]})
    return {"spawns": sp, "tasks": tk, "bitmap": r["bitmap"], "inUse": r["inUseAtAct"], "tasksAtAct": r["tasksAtAct"], "orderShape": r["orderShape"], "rows": r["rows"]}
res = {}
for key in LABEL:
    ent = {}
    fa = cross[f"{key}-player"]["firstFrame"]["activation"]
    sigs = {}
    for tag, pref in (("player", f"mechanic-{key}-player-"), ("opponent", f"mechanic-{key}-opponent-"), ("alt", f"prep14-{key}-alt-")):
        sc, r = pick(key, pref, cross[f"{key}-{tag}"]["firstFrame"]["activation"] if tag != "alt" else None)
        j = json.loads((D / f"{sc}.json").read_text())
        b = next(b for b in j["bodies"] if b["start"] == r["act"])
        mon = None
        for e in j["taskEvents"]:
            if b["start"] <= e[0] <= (b["end"] or 10**9):
                for k, v in e[1].items():
                    if j["taskFuncNames"].get(str(v & ~1)) == "Task_UpdateMonBg":
                        d = e[2][k]; side = 0 if d[0] == 6 else 1
                        a = b["atActivation"]; x = a["battlerXY"][side][0] + a["battlerX2Y2"][side][0]; y = a["battlerXY"][side][1] + a["battlerX2Y2"][side][1]
                        mon = {"age": e[0] - b["start"], "slot": int(k), "data": d, "battlerOnSprite": "player" if side == 0 else "opponent", "formula": [x, y, 32 - x, 32 - y], "holds": d[1:5] == [x, y, 32 - x, 32 - y]}
                        break
                if mon: break
        s = sig(r); s["monbg"] = mon; s["netZeroAtEnd1"] = r["netZeroAtEnd1"]; s["scenario"] = sc; s["act"] = r["act"]
        sigs[tag] = s
    p = sigs["player"]
    ent["scenarios"] = {t: {"scenario": s["scenario"], "activation": s["act"], "rows": s["rows"], "bitmapAtActivation": s["bitmap"], "tasksAtActivation": s["tasksAtAct"], "inUseAtActivation": s["inUse"], "orderShape": s["orderShape"], "monbg": s["monbg"], "netZeroAtEnd1": all(v for v in s["netZeroAtEnd1"].values() if isinstance(v, bool))} for t, s in sigs.items()}
    ent["constants"] = {"spawns(age,slot,template,bank,tile,matrix)": p["spawns"], "tasks(age,slot,func)": p["tasks"]}
    ent["equalToPlayer"] = {t: {"spawns": sigs[t]["spawns"] == p["spawns"], "tasks": sigs[t]["tasks"] == p["tasks"], "bitmap": sigs[t]["bitmap"] == p["bitmap"], "inUse": sigs[t]["inUse"] == p["inUse"]} for t in ("opponent", "alt")}
    ent["corpusCrossCheck"] = {s: {k: cross[f"{key}-{s}"][k] for k in ("spawnsEqual", "taskPairsEqual", "orderAtAct", "animRng0==rng2AtAct")} | {"offset": cross[f"{key}-{s}"]["firstFrame"]["offset"], "rows": cross[f"{key}-{s}"]["rows"]} for s in ("player", "opponent")}
    res[key] = ent
    print(key, {t: v for t, v in ent["equalToPlayer"].items()}, "monbg", {t: (s["monbg"] or {}).get("holds") for t, s in sigs.items()}, "netZero", {t: v["netZeroAtEnd1"] for t, v in ent["scenarios"].items()})
OUT.write_text(json.dumps(res, indent=1))
