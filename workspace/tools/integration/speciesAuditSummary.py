#!/usr/bin/env python3
"""speciesAudit: one line per receipt in a dense output dir. usage: speciesAuditSummary.py /tmp/sa/dense"""
import json, glob, sys, os
for p in sorted(glob.glob(sys.argv[1] + "/*.json")):
    d = json.load(open(p)); k = os.path.basename(p)[:-5]
    if "error" in d: print(f"{k}\tERROR\t{d['error']}"); continue
    ages = [b[0] for b in d["badRows"]]
    print(f"{k}\t{d['exactRows']}/{d['rows']}\tpx {d['residualPixels']}\tdur {d['expectedDuration']}\tidentical {d['identical']}\tfield {d.get('fieldPx')} chrome {d.get('chromePx')}\tbad ages {ages[:3]}..{ages[-3:]} n={len(ages)}")
