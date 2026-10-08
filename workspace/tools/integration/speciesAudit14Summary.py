#!/usr/bin/env python3
"""speciesAudit14: one line per attdoll-check window of every stem in list.tsv (receipts from speciesAudit14SwapRun.sh):
stem kind side move rows presented cell px r1/r2 identical(digests r1 == r2) exactRows badAges maxPxRow tail(k+1 r1/r2, k+2 r1/r2).
usage: speciesAudit14Summary.py <receipt dir> <list.tsv>"""
import json, sys
from pathlib import Path
rec = Path(sys.argv[1]); n = ok = nonzero = 0
for line in open(sys.argv[2]):
    stem = line.split("\t")[0]
    try: res = json.loads((rec / f"{stem}.json").read_text())["results"]
    except Exception: print(stem, "NO-RECEIPT"); continue
    if not res: print(stem, "no-window"); continue
    for x in res:
        if "prod" not in x:
            print(stem, x["kind"], x.get("side"), x.get("move", ""), "adapter=" + str(x.get("adapter")), x.get("error", ""), "segments" if "segments" in x else ""); continue
        p = x["prod"]; t = x.get("tail") or {}
        n += 1; ok += p["identical"]; nonzero += any(p["px"])
        tail = f"tail k+1 {t['rowK1']['production']} k+2 {t['rowK2']['production']}" if t else "tail -"
        print(stem, x["kind"], x["side"], x["move"], f"rows={x['rows']}", f"presented={x.get('swapPresented')}", f"cell={x.get('cell')}",
              f"px={p['px'][0]}/{p['px'][1]}", f"identical={p['identical']}", f"exact={p['exactRows']}", f"bad={','.join(p['badAges'])}",
              f"max={p['maxPxRow']}", tail, f"dig={p['digests'][0]}")
print(f"windows={n} identical={ok} nonzero={nonzero}")
