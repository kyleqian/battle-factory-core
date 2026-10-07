#!/usr/bin/env python3
"""Summarise a prep26 check receipt: per window OK / failing fields.  usage: prep26Summary.py receipt.json"""
import json, sys
R = json.load(open(sys.argv[1])); bad_total = 0; rows = 0; ent = 0; entm = 0
for r in R:
    n = r["rows"]; bad = []
    if r["oamRowsExact"] != n - 1: bad.append(("oam", r["oamRowsExact"], n - 1, r["badRows"][:6], r["examples"][:2]))
    if r["matrixRowsExact"] != n - 1: bad.append(("mat", r["matrixRowsExact"]))
    for f, v in r["fields"].items():
        if v["exact"] != v["rows"]: bad.append((f, v["exact"], v["rows"], v.get("bad", [])[:3]))
    rows += n; ent += r["entries"]; entm += r["entryMatch"]
    print(r["name"], "OK" if not bad else bad)
print(f"windows {len(R)} rows {rows} oamEntries {entm}/{ent}")
