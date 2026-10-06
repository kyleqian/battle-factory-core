#!/usr/bin/env python3
"""prep16: compact activation-register table for the target bodies: per (move, attacker side, previous body move, turn) the registers the reducers consume (dispcnt, bg1cnt, bg2cnt, bg1/bg2 hofs/vofs, win0h/v, bldcnt, bldalpha, bldy)
and whether the software gOamMatrices equal the first-body ones; duplicate rows merged.  usage: prep16BgTable.py PROBE_DIR OUT_JSON"""
import hashlib, json, sys, collections
from pathlib import Path
D, OUT = Path(sys.argv[1]), Path(sys.argv[2])
MV = {0: "STAT(0)", 14: "SWORDS_DANCE", 33: "TACKLE", 45: "GROWL", 63: "HYPER_BEAM", 94: "PSYCHIC", 150: "SPLASH", 318: "SILVER_WIND", 244: "PSYCH_UP", 315: "OVERHEAT", None: "FIRST_BODY"}
KEYS = {"00": "dispcnt", "0a": "bg1cnt", "0c": "bg2cnt", "14": "bg1hofs", "16": "bg1vofs", "18": "bg2hofs", "1a": "bg2vofs", "40": "win0h", "44": "win0v", "50": "bldcnt", "52": "bldalpha", "54": "bldy"}
tab = collections.defaultdict(lambda: collections.defaultdict(set)); first = {}
for f in sorted(D.glob("prep16-*.json")):
    if f.name.endswith(".log"): continue
    for b in json.loads(f.read_text())["bodies"]:
        if b["move"] not in (318, 244, 315): continue
        a = b["atActivation"]; side = "player" if b["attacker"] == 0 else "opponent"
        row = {KEYS[k]: a["io"][k] for k in KEYS}; msha = hashlib.sha1(json.dumps(a["matrices"]).encode()).hexdigest()[:8]
        if b["prevMove"] is None and not first.get(b["move"]): first[b["move"]] = (row, msha)
        tab[(MV[b["move"]], side)][(MV[b["prevMove"]], 2 if b["start"] > 800 else 1)].add(json.dumps({**row, "matricesSha": msha}, sort_keys=True))
out = {}
for (mv, side), d in sorted(tab.items()):
    mvid = {v: k for k, v in MV.items()}[mv]; base, bsha = first[mvid]
    out[f"{mv}/{side}"] = {"firstBody": {**base, "matricesSha": bsha}, "byPrevBody": {f"{p}|turn{t}": [{k: v for k, v in json.loads(s).items() if k == "matricesSha" or base.get(k) != v} for s in sorted(ss)] for (p, t), ss in sorted(d.items(), key=lambda kv: (kv[0][1], str(kv[0][0])))}}
OUT.write_text(json.dumps(out, indent=0, separators=(",", ":")))
for k, v in out.items():
    print(k, "first", v["firstBody"])
    for p, r in v["byPrevBody"].items(): print("   ", p, "distinct", len(r), "diff vs first:", json.dumps(r[0]) if len(r) == 1 else json.dumps(r))
