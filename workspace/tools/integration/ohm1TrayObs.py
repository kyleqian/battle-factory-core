#!/usr/bin/env python3
"""ohm1: one row per real-play AI tray (ROM probe) with its turn context, to tally 101 / 102 over independent observations.

usage: ohm1TrayObs.py SOURCE=DIR:STEM[,STEM...] ...   e.g. t2=.integration/evidence/t2final-20261124:310-off,310-on  (reads DIR/STEM.{drive,engine}.json and the probe rows in PROBEDIR/STEM.tray.json via --probe-dir)
Env: PROBE_DIR (default .integration/evidence/ohm1/<source>). Row: source, stem, scene, resolution k, tray d, lag (1 = 101 tray, 2 = 102 tray), offset into the resolution segment, the player's decision kind
that turn, whether the opponent's mon fainted earlier in that segment (engine SE_FAINT pan > 0 -> faint replacement), the engine decision index; prints a tally."""
import collections
import json
import os
import sys
from pathlib import Path

rows_out = []
for arg in sys.argv[1:]:
    src, rest = arg.split("=", 1)
    d, stems = rest.split(":", 1)
    pdir = Path(os.environ.get("PROBE_DIR", f".integration/evidence/ohm1/{src}"))
    for stem in stems.split(","):
        pf = pdir / f"{stem}.tray.json"
        if not pf.exists():
            continue
        drive = json.load(open(Path(d) / f"{stem}.drive.json"))["drive"]["anchors"]
        eng = json.load(open(Path(d) / f"{stem}.engine.json"))
        dec = [x for x in eng["decisions"] if x["commitFrame"] is not None]
        trows = json.load(open(pf))["rows"]
        trays, cur = [], None
        for r in trows:
            f, timer, shown = r[0], r[2], r[4]
            if shown and timer == 0 and (cur is None or cur["closed"] or f - cur["last"] > 3):
                cur = {"d": f, "t1": None, "last": f, "closed": False}
                trays.append(cur)
            elif cur and not cur["closed"]:
                if shown:
                    cur["last"] = f
                    if timer == 1 and cur["t1"] is None:
                        cur["t1"] = f
                else:
                    cur["closed"] = True
        for t in trays:
            if t["t1"] is None:
                continue
            k = max((i for i, a in enumerate(drive) if a["commitFrame"] <= t["d"]), default=None)
            if k is None or k >= len(dec):
                rows_out.append(dict(source=src, stem=stem, scene=stem.split("-")[1], d=t["d"], lag=t["t1"] - t["d"], intro=True))
                continue
            off = t["d"] - drive[k]["commitFrame"]
            lo = dec[k]["commitFrame"]
            hi = dec[k + 1]["menuOpenFrame"] if k + 1 < len(dec) else 10**9
            faint = any(r[2] == 16 and (r[3] or 0) > 0 and lo <= r[0] < lo + off for r in eng["sound"])
            cry = next((r[2] for r in sorted(eng["sound"]) if r[1] == "cry" and r[0] >= lo + off and (r[3] or 0) > 0), None)
            rows_out.append(dict(source=src, stem=stem, scene=stem.split("-")[1], seed=int(stem.split("-")[0]), k=k, d=t["d"], lag=t["t1"] - t["d"], tray=100 + t["t1"] - t["d"], off=off,
                                 player=dec[k]["kind"], faint=faint, species=cry, intro=False))
for r in rows_out:
    print(json.dumps(r))
vol = [r for r in rows_out if not r["intro"] and not r["faint"]]
print("voluntary AI trays:", collections.Counter((r["tray"]) for r in vol))
print("faint-replacement trays:", collections.Counter((r["tray"]) for r in rows_out if not r["intro"] and r["faint"]))
print("voluntary by player decision:", collections.Counter((r["player"], r["tray"]) for r in vol))
print("voluntary by scene:", collections.Counter((r["scene"], r["tray"]) for r in vol))
