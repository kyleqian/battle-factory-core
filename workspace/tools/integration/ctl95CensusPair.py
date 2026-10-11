#!/usr/bin/env python3
"""ctl95: prep43CensusDelta.py on stalled-battle-tail-paired command lists. A stalled census battle runs to liveShareCensus.ts's
FRAME_BUDGET (200,000 frames); when newly-live bodies lengthen its presentation, fewer commands fit (ctl95: seed 796, 215 -> 214).
Each battle's commands are cut to the shorter of the two lists (it must be a key prefix of the longer; anything else is an error), then
prep43CensusDelta.py pairs them line by line.
usage: ctl95CensusPair.py <before.json> <before.jsonl> <after.json> <after.jsonl> <out.json>"""
import json, subprocess, sys
from collections import Counter
from pathlib import Path

bj, bl, aj, al, out = sys.argv[1:6]
load = lambda p: [json.loads(line) for line in open(p) if line.strip()]
b, a = load(bl), load(al)
nb, na = Counter(c["battle"] for c in b), Counter(c["battle"] for c in a)
cut = {k: min(nb[k], na[k]) for k in nb | na}
key = lambda c: (c["battle"], c["kind"], c.get("moveId"), c.get("side"))
for k in [k for k in cut if nb[k] != na[k]]:
    # the merged reports carry no stall list: a differing battle must be a budget-truncated tail (the shorter list a key prefix)
    kb, ka = [key(c) for c in b if c["battle"] == k], [key(c) for c in a if c["battle"] == k]
    if kb[:cut[k]] != ka[:cut[k]]:
        raise SystemExit(f"battle {k}: command counts differ and the shorter list is not a key prefix")
def trim(cs):
    seen, kept = Counter(), []
    for c in cs:
        seen[c["battle"]] += 1
        if seen[c["battle"]] <= cut[c["battle"]]:
            kept.append(c)
    return kept
tb, ta = Path(out).with_suffix(".before.jsonl"), Path(out).with_suffix(".after.jsonl")
tb.write_text("".join(json.dumps(c) + "\n" for c in trim(b))); ta.write_text("".join(json.dumps(c) + "\n" for c in trim(a)))
print(f"trimmed stalled tails: {[(k, nb[k], na[k]) for k in sorted(cut) if nb[k] != na[k]]}")
subprocess.run([sys.executable, str(Path(__file__).with_name("prep43CensusDelta.py")), bj, str(tb), aj, str(ta), out], check=True)
tb.unlink(); ta.unlink()
