#!/usr/bin/env python3
"""Live audit 18: one line per consumer window from <receipt-dir>/check-*.json (audit18Check.ts) — the ROM hide state of the OTHER battler
at activation (H = invisible), the production hide (h) and their agreement, the prompt flags of the history, CHAIN lend (live / decline,
order known / deferred, allocator, px, r1 == r2), and the ENTRY-lend control (px, r1 == r2). Then per-family totals.
usage: audit18Summary.py <receipt-dir>"""
import json, sys
from collections import Counter
from pathlib import Path

tot = Counter()
for p in sorted(Path(sys.argv[1]).glob("check-*.json")):
    for r in json.loads(p.read_text())["rows"]:
        c, e = r["chain"], r["entry"]
        me = 0 if r["side"] == "player" else 1
        other_rom, other_prod = r["romInvisible"][1 - me], c["hidden"][1 - me]
        res = c["residualRows"]
        ages = f"{res[0][0]}..{res[-1][0]}" if res else "-"
        locked = "".join("p" if x else "L" for x in r["promptShown"])
        fam = r["fixture"].split("-")[0]
        print(f"{r['fixture']:<38} {r['move']:<12} {r['side']:<8} {'H' if other_rom else '.'}{'h' if other_prod else '.'} agree={int(r['hideAgree'])} "
              f"prompts={locked:<7} units={r['units']:<3} live={int(c['live'])} order={int(c['orderKnown'])}{'d' if c['orderDeferred'] else ''} "
              f"alloc={int(c['allocatorInput'])} rows={c['rows']} exact={c['exactRows']} px={c['px']} r1==r2={int(c['digests'][0] == c['digests'][1])} "
              f"ages={ages} | entry live={int(e['live'])} px={e['px']} r1==r2={int(e['digests'][0] == e['digests'][1])} win={int(all(r['sameWindow']))}"
              f"{' decline=' + c['decline'] if c['decline'] else ''}")
        tot[(fam, "windows")] += 1
        tot[(fam, "live")] += c["live"]
        tot[(fam, "0px")] += c["live"] and c["px"] == 0
        tot[(fam, "hidden")] += other_rom
        tot[(fam, "hiddenLive0px")] += other_rom and c["live"] and c["px"] == 0
        tot[(fam, "agree")] += r["hideAgree"]
        tot[(fam, "r1==r2")] += c["digests"][0] == c["digests"][1] and e["digests"][0] == e["digests"][1]
for fam in sorted({k[0] for k in tot}):
    print(fam, " ".join(f"{k}={tot[(fam, k)]}" for k in ("windows", "live", "0px", "hidden", "hiddenLive0px", "agree", "r1==r2")))
