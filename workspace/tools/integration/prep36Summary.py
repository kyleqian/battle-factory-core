#!/usr/bin/env python3
"""prep36: one-screen summary of the Eruption receipts (eruption-check-pixels.json + eruption-neg-*.json) in a receipt dir.
usage: python3 tools/integration/prep36Summary.py <receipt dir>"""
import json
import sys
from pathlib import Path

rec = Path(sys.argv[1])
main = json.loads((rec / "eruption-check-pixels.json").read_text())
print("window | attacker y | wave ends | rows | profile leaves equal | fields (all rows) | model px 0-rows (residual) | corpus-profile px 0-rows")
for w in main["windows"]:
    bad = {k: v for k, v in w["fields"].items() if v.split("/")[0] != v.split("/")[1]}
    px = w.get("pixels", {})
    m, c = px.get("model", {}), px.get("corpusProfileBaseline", {})
    print(f"{w['window']} | {w['attackerY']} | {w['waveEnds']} | {w['romRows']} | {w['profile']['equal']}/{w['profile']['leaves']} | "
          f"not-all: {bad} | {m.get('zeroPx')}/{m.get('rows')} ({m.get('residualPx')}; {m.get('mismatchRows')}) | {c.get('zeroPx')}/{c.get('rows')}")
for f in sorted(rec.glob("eruption-neg-*.json")):
    d = json.loads(f.read_text())
    parts = []
    for w in d["windows"]:
        bad = {k: v for k, v in w["fields"].items() if v.split("/")[0] != v.split("/")[1] and k not in ("paletteAll512",)}
        m = w.get("pixels", {}).get("model", {})
        parts.append(f"{w['window']}: fields {bad} px {m.get('zeroPx')}/{m.get('rows')} ({m.get('residualPx')})")
    print(f"neg={d['neg']}: " + " || ".join(parts))
