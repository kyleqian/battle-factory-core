#!/usr/bin/env python3
"""forced-switch: summarise forcedSwitchRomProbe raw output into the compact fixture (E = first inactive frame after the body, doc convention E = last active + 1).
usage: forcedSwitchRomSummary.py <rawdir> <outdir>   -> one <scenario>.json per scenario (sprites, battler/healthbox changes, controller/species events, per-frame battler hash)."""
import json, sys, hashlib
from pathlib import Path
raw, out = Path(sys.argv[1]), Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
for p in sorted(raw.glob("*.json")):
    d = json.loads(p.read_text()); E = d["E"] + 1
    rows = {int(k) - E: v for k, v in d["rows"].items()}
    ev, prev = [], {}
    for k in sorted(rows):
        r = rows[k]
        cur = {"ctrl": r["ctrl"], "main": r["main"], "pidx": r["pidx"], "species": r["species"],
               "tgt": r["b"], "hb": r["h"], "txt": r["txt"][:24], "tasks": r["tasks"]}
        diff = {a: b for a, b in cur.items() if prev.get(a) != b}
        if diff: ev.append({"k": k, **diff})
        prev = cur
    spawns = [{**s, "k": s["f"] - E} for s in d["spawns"]]
    for s in spawns: s.pop("f")
    h = hashlib.sha256(json.dumps([[k, rows[k]["b"], rows[k]["h"]] for k in sorted(rows)]).encode()).hexdigest()[:16]
    (out / p.name).write_text(json.dumps({"scenario": d["scenario"], "E": E, "perFrameHash": h, "events": ev, "spawns": spawns}, separators=(",", ":")))
    print(p.name, "E", E, "hash", h, "events", len(ev), "spawns", len(spawns))
