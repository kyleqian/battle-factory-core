#!/usr/bin/env python3
"""snd145 (docs/snd145-send-in-tail-live.md): compact per-window summary of snd145Compare.ts outputs (the receipt's R4 section).
Per window: kind, species, scene, slide / duration as production builds them, the ROM's next-text row, rows, zero rows, px per region,
the nonzero healthbox / message rows (e >= 17; e < 17 is the faint path's party-tray hide, not in the constructed segment) and the
opponent-sprite residual range (the species front animation production does not draw).
usage: snd145Summary.py <out.json> <compare.json>..."""
import json, sys
out = []
for p in sys.argv[2:]:
    d = json.load(open(p)); R = d["perRow"]
    opp = [r["e"] for r in R if r["opp"] > 0]
    out.append(dict(kind=d["kind"], species=d["species"], name=d["name"], sceneOn=d.get("sceneOn", True), slideStart=d["slideStart"],
                    duration=d["duration"], romNextText=d["romNextText"], rows=d["rows"], zeroRows=d["zeroRows"], px=d["px"],
                    hbMsgNonZeroRows=[[r["e"], r["hb"], r["msg"]] for r in R if r["hb"] + r["msg"] > 0 and r["e"] >= 17],
                    earlyHbPx=sum(r["hb"] for r in R if r["e"] < 17),
                    oppResidualRows=[min(opp), max(opp), len(opp)] if opp else None))
out.sort(key=lambda w: (not w["sceneOn"], w["kind"], w["species"]))
json.dump(out, open(sys.argv[1], "w"), indent=1); open(sys.argv[1], "a").write("\n")
for w in out:
    print(f"{'ON ' if w['sceneOn'] else 'OFF'} {w['kind']:5} {w['name']:10} slide {w['slideStart']:3} dur {w['duration']:3} romNext {w['romNextText']} "
          f"rows {w['rows']:3} zero {w['zeroRows']:3} hb+msg nonzero rows {len(w['hbMsgNonZeroRows'])} opp residual {w['oppResidualRows']}")
