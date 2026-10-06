#!/usr/bin/env python3
"""prep18: per-move/per-body allocator constants + equality across accepted player / accepted opponent / fresh alternate species (+ the retained corpora via
prep18Analyze.py's prep18-crosscheck.json), from prep13Probe.py outputs (/tmp/p18a/r1) and the analysis json.  Includes the monbg formula check
(Task_UpdateMonBg data[1..4] == (x+x2, y+y2, 32-x', 32-y') of the battler on sprite slot data[0]) and the net-zero-at-end+1 check.
usage: prep18Constants.py PROBE_DIR OUT_JSON"""
import json, sys
from pathlib import Path
D, OUT = Path(sys.argv[1]), Path(sys.argv[2])
ROOT = Path(__file__).resolve().parents[2]
FX = ROOT / "tools/integration/fixtures/prep18"
ana = json.loads((FX / "prep18-analysis.json").read_text())
cross = json.loads((FX / "prep18-crosscheck.json").read_text())
LABEL = {"dig": "DIG", "megahorn": "MEGAHORN", "will-o-wisp": "WILL_O_WISP", "fury-cutter": "FURY_CUTTER", "return": "RETURN", "return-weak": "RETURN", "return-medium": "RETURN", "return-strong": "RETURN", "pursuit": "PURSUIT"}
ALT = {"dig": "prep18-dig-alt-flygon-golem", "megahorn": "prep18-megahorn-alt-heracross-golem", "will-o-wisp": "prep18-will-o-wisp-alt-banette-golem", "fury-cutter": "prep18-fury-cutter-alt-scyther-golem", "return": "prep18-return-alt-snorlax-golem", "pursuit": "prep18-pursuit-alt-umbreon-golem"}
def sig(r):
    sp = [(s["age"], s["slot"], s["tmpl"], s["bank"], s["tile"], s["matrix"]) for s in r["sprites"] if s["tmpl"] != "ALLOCATE_SCRIPT_CMD_TABLE"]
    tk = sorted({(t["age"], t["slot"], t["func"]) for t in r["tasks"]})
    return {"spawns": sp, "tasks": tk, "bitmap": r["bitmap"], "inUse": r["inUseAtAct"], "tasksAtAct": r["tasksAtAct"], "orderShape": r["orderShape"], "rows": r["rows"]}
def monbg(j, r, rk):
    b = next(b for b in j["bodies"] if b["start"] == r["act"]); end = b["end"] if b["end"] is not None else 10**9
    for e in j["taskEvents"]:
        if b["start"] <= e[0] <= end:
            for k, v in e[1].items():
                if j["taskFuncNames"].get(str(v & ~1)) == "Task_UpdateMonBg":
                    d = e[2][k]; side = 0 if d[0] == 6 else 1; a = b["atActivation"]
                    x = a["battlerXY"][side][0] + a["battlerX2Y2"][side][0]; y = a["battlerXY"][side][1] + a["battlerX2Y2"][side][1]
                    return {"age": e[0] - b["start"], "slot": int(k), "data": d, "battlerOnSprite": "player" if side == 0 else "opponent", "formula": [x, y, 32 - x, 32 - y], "holds": d[1:5] == [x, y, 32 - x, 32 - y]}
    return None
res = {}
for key, label in LABEL.items():
    scen = {"player": next(k for k in ana if k.startswith(f"mechanic-{key}-player-")), "opponent": next(k for k in ana if k.startswith(f"mechanic-{key}-opponent-"))}
    if key in ALT: scen["alt"] = ALT[key]
    rowsby = {t: [r for r in ana[sc] if r["move"] == label] for t, sc in scen.items()}
    ent = {}
    for bi in range(len(rowsby["player"])):
        sigs = {}
        for t, sc in scen.items():
            r = rowsby[t][bi]; j = json.loads((D / f"{sc}.json").read_text())
            s = sig(r); s["monbg"] = monbg(j, r, bi); s["netZeroAtEnd1"] = r["netZeroAtEnd1"]; s["scenario"] = sc; s["act"] = r["act"]; s["rng2"] = r["rng2"]; s["orderAtAct"] = r["orderAtAct"]; s["regsAtAct"] = r["regsAtAct"]
            sigs[t] = s
        p = sigs["player"]; ck = lambda side: cross.get(f"{key}-{side}" + (f"#{bi}" if bi else ""))
        ent[f"body{bi}"] = {
            "scenarios": {t: {"scenario": s["scenario"], "activation": s["act"], "rows": s["rows"], "bitmapAtActivation": s["bitmap"], "tasksAtActivation": s["tasksAtAct"], "inUseAtActivation": s["inUse"], "orderShape": s["orderShape"],
                              "monbg": s["monbg"], "netZeroAtEnd1": all(v for v in s["netZeroAtEnd1"].values() if isinstance(v, bool))} for t, s in sigs.items()},
            "constants": {"spawns(age,slot,template,bank,tile,matrix)": p["spawns"], "tasks(age,slot,func)": p["tasks"]},
            "equalToPlayer": {t: {"spawns": sigs[t]["spawns"] == p["spawns"], "tasks": sigs[t]["tasks"] == p["tasks"], "bitmap": sigs[t]["bitmap"] == p["bitmap"], "inUse": sigs[t]["inUse"] == p["inUse"], "rows": sigs[t]["rows"] == p["rows"]} for t in sigs if t != "player"},
            "orderAtActivation": {t: s["orderAtAct"] for t, s in sigs.items()},
            "corpusCrossCheck": {s: {k: ck(s)[k] for k in ("spawnsEqual", "taskPairsEqual", "orderAtAct", "animRng0==rng2AtAct", "inUseAtAct")} | {"offset": ck(s)["firstFrame"]["offset"], "rows": ck(s)["rows"]} for s in ("player", "opponent") if ck(s)},
        }
        print(key, f"body{bi}", {t: v for t, v in ent[f"body{bi}"]["equalToPlayer"].items()}, "monbg", {t: (s["monbg"] or {}).get("holds") for t, s in sigs.items()},
              "netZero", {t: v["netZeroAtEnd1"] for t, v in ent[f"body{bi}"]["scenarios"].items()}, "shape", {t: s["orderShape"] for t, s in sigs.items()})
    res[key] = ent
OUT.write_text(json.dumps(res, indent=1))
