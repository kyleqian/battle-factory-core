#!/usr/bin/env python3
"""stf115 (docs/stf115-struggle-declines.md): one deterministic line per window of <check-dir>/check-*.json (audit20Check.ts / audit21Check.ts
in a given tree): fixture, move, side, after (`after-struggle` = an earlier Struggle body in the same battle), CHAIN live / rows / exact / px,
r1 == r2 (both fresh probes' per-row digests, chain + entry, and the same ROM window), the ENTRY lend's px, the decline; then totals, and the
after-a-Struggle totals. With <lends.jsonl> (AUDIT20_LENDS_ONLY output) each line also carries `lend=` (the CHAIN lend's free order == the ROM
sSpriteOrder free order at the activation: 1 / 0).
usage: stf115Summary.py <check-dir> [<lends.jsonl>]
       stf115Summary.py --attdoll <attdollLiveCheck receipt dir>   (one line per subbed-ATTACKER swap composite window: rows, ROM body rows,
       production duration, presented, px vs run 1 / run 2, exact rows, tail rows k+1 / k+2; then totals)"""
import json, re, sys
from collections import Counter
from pathlib import Path

if sys.argv[1] == "--attdoll":
    n = ok = 0
    for p in sorted(Path(sys.argv[2]).glob("stf115-*.json")):
        for w in json.loads(p.read_text())["results"]:
            if w.get("kind") != "swap" or "prod" not in w:
                continue
            px, tail = w["prod"]["px"], w.get("tail") or {}
            k1, k2 = (tail.get("rowK1") or {}).get("production"), (tail.get("rowK2") or {}).get("production")
            good = w["swapPresented"] and px == [0, 0] and w["prod"]["exactRows"] == w["rows"] and k1 == [0, 0] and k2 == [0, 0]
            n += 1; ok += int(good)
            print(f"{p.stem:<26} {w['move']:<9} {w['side']:<8} activation={w['activation']:<5} rows={w['rows']} romBody={w['romBodyRows']} "
                  f"adapter={w['adapterDuration']} production={w['productionDuration']} presented={int(w['swapPresented'])} px={px} "
                  f"exact={w['prod']['exactRows']} k1={k1} k2={k2}")
    print(f"TOTAL attacker-doll swap windows={n} presented-0px-every-row(+k1,k2)={ok}")
    sys.exit(0)
lends = {}
if len(sys.argv) > 2:
    for line in Path(sys.argv[2]).read_text().splitlines():
        d = json.loads(line)
        lends[d["fixture"]] = int(d["same"])
tot = Counter()
for p in sorted(Path(sys.argv[1]).glob("check-*.json")):
    rows = sorted(json.loads(p.read_text())["rows"], key=lambda r: int(re.search(r"-c(\d+)\.json$", r["fixture"]).group(1)))
    seen = False
    for r in rows:
        c, e = r["chain"], r["entry"]
        after = "after-struggle" if seen else "-"
        same = int(c["digests"][0] == c["digests"][1] and e["digests"][0] == e["digests"][1] and all(r["sameWindow"]))
        lend = f" lend={lends[r['fixture']]}" if r["fixture"] in lends else ""
        print(f"{r['fixture'].replace('.json', ''):<34} {r['move']:<10} {r['side']:<8} {after:<14} live={int(c['live'])} rows={c['rows']:<3} "
              f"exact={c['exactRows']:<3} px={c['px']:<7} r1==r2={same} entry={e['px']}{lend}{' decline=' + c['decline'] if c['decline'] else ''}")
        for k in ("all", after):
            tot[k, "windows"] += 1
            tot[k, "live"] += int(c["live"])
            tot[k, "live0px"] += int(c["live"] and c["px"] == 0)
            tot[k, "r1==r2"] += same
            tot[k, "lend"] += lends.get(r["fixture"], 0)
        seen = seen or r["move"] == "STRUGGLE"
for k in ("all", "after-struggle"):
    print(f"TOTAL {k:<14} windows={tot[k, 'windows']} live={tot[k, 'live']} live-0px={tot[k, 'live0px']} r1==r2={tot[k, 'r1==r2']}"
          + (f" lend==ROM={tot[k, 'lend']}" if lends else ""))
