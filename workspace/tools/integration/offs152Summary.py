#!/usr/bin/env python3
"""offs152 (docs/offs152-scene-off-send-in-tail.md): compact per-window summary of offs152Compare.ts outputs (the receipt's R0 / R3 table).
Per window: species, production slide / duration / lag, the ROM removal / next-text rows, rows, px per region, the nonzero rows before the
send-in (R0: pause, forced hold, removal, gap) and the nonzero healthbox / message / BG rows (R3), and the opponent-sprite residual range.
usage: offs152Summary.py <out.json> <compare.json>..."""
import json, sys
out = []
for p in sys.argv[2:]:
    d = json.load(open(p)); R = d["perRow"]
    opp = [r["e"] for r in R if r["opp"] > 0]
    out.append(dict(species=d["species"], name=d["name"], base=d["base"], slideStart=d["slideStart"], duration=d["duration"],
                    romRemoval=d["romRemoval"], romNextText=d["romNextText"], rows=d["rows"], zeroRows=d["zeroRows"], px=d["px"],
                    preSendInNonZeroRows=len(d["preSendInNonZero"]),
                    hbMsgBgNonZeroRows=[[r["e"], r["hb"], r["msg"], r["bg"]] for r in R if r["hb"] + r["msg"] + r["bg"] > 0],
                    oppResidualRows=[min(opp), max(opp), len(opp)] if opp else None))
out.sort(key=lambda w: (w["base"], w["species"]))
json.dump(out, open(sys.argv[1], "w"), indent=1); open(sys.argv[1], "a").write("\n")
for w in out:
    print(f"{'BASE ' if w['base'] else ''}{w['name']:10} slide {w['slideStart']:3} dur {w['duration']:3} romNext {w['romNextText']} removal {w['romRemoval']} "
          f"rows {w['rows']:3} pre-send-in nonzero {w['preSendInNonZeroRows']} hb+msg+bg nonzero rows {len(w['hbMsgBgNonZeroRows'])} opp {w['oppResidualRows']}")
