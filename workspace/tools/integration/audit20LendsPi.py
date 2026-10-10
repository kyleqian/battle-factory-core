#!/usr/bin/env python3
"""Live audit 20: the order-lend comparison of AUDIT20_LENDS_ONLY lines (audit20Check.ts) under the post-KO relabel pi of
docs/postko-consumer-audit.md s3 (a rank-preserving map of the ROM's free set at activation, from the fixture's rom.alloc.pre.inUse,
onto the battle entry's free set, rom.alloc.entry.inUse): raw = lend == ROM sSpriteOrder minus the known-entry occupied slots (the
lends.txt test), pi = lend == pi(the ROM free order). Before a KO pi is the identity.
usage: audit20LendsPi.py <lends.txt> <fixture-dir>"""
import json, sys
from collections import Counter
from pathlib import Path

lends, fx = Path(sys.argv[1]), Path(sys.argv[2])
use = lambda h: [(int(h, 16) >> i) & 1 for i in range(64)]
count = Counter()
for line in lends.read_text().splitlines():
    r = json.loads(line)
    f = json.loads((fx / r["fixture"]).read_text())
    a = f["rom"]["alloc"]
    pre, ent = use(a["pre"]["inUse"]), use(a["entry"]["inUse"])
    pi = dict(zip(sorted(i for i in range(64) if not pre[i]), sorted(i for i in range(64) if not ent[i])))
    rom = [pi[s] for s in f["rom"]["spriteOrder"] if not pre[s]]
    same = r["lend"] is not None and r["lend"][:16] == rom[:16]
    hist = [e for t in f["precedingTurns"] for e in t["events"]][:-1]
    ko = any(e.get("kind") == "faint-animation" for e in hist)
    after = next((e["arguments"][0] for e in reversed(hist) if e.get("animationId") == "MOVE_ANIMATION"), "entry")
    count[(r["fixture"].split("-s")[0], "post-KO" if ko else "pre-KO", f"after {after}", f"pi-same={same}")] += 1
    print(f"{r['fixture']:<40} {r['move']:<11} live={int(r['live'])} {'post-KO' if ko else 'pre-KO '} after={after:<6} raw-same={int(r['same'])} "
          f"pi-same={int(same)} lend={r['lend'][:8] if r['lend'] else None} pi(rom)={rom[:8]}")
print()
for k in sorted(count):
    print(*k, count[k])
