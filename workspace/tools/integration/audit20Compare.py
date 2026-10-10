#!/usr/bin/env python3
"""Live audit 20 (= audit19Compare.py + the allocator comparison in the window key): compare a fresh audit20Run.sh receipt dir with the committed receipts.
Per consumer window (check/check-*.json): chain + entry (live, decline, order, digests r1 / r2, px, rows). A window is
  identical   every field equal;
  ROM-drift   different, and one of the four fresh probe runs (r1 / r2 of either receipt) disagrees with the others inside its own
              receipt (r1 != r2): the ROM itself rendered differently (ISSUES #154 class: sporadic, seen on Random2 consumers);
  DIFFERS     different with r1 == r2 in both receipts (a real reproduction failure).
Every other receipt file (derive.txt, lends.txt, summary.txt, verdicts.txt, wp160/, ...) is compared byte for byte.
usage: audit20Compare.py <fresh-receipt-dir> <committed-receipt-dir>"""
import json, sys
from pathlib import Path

fresh, ref = Path(sys.argv[1]), Path(sys.argv[2])


def rows(d: Path) -> dict:
    out = {}
    for p in (d / "check").glob("check-*.json"):
        for r in json.loads(p.read_text())["rows"]:
            out[r["fixture"]] = r
    return out


a, b = rows(fresh), rows(ref)
key = lambda r: [(r[k]["live"], r[k]["decline"], r[k]["orderKnown"], r[k]["digests"], r[k]["px"], r[k]["rows"]) for k in ("chain", "entry")] + [r["alloc"]]
stable = lambda r: all(r[k]["digests"][0] == r[k]["digests"][1] for k in ("chain", "entry"))
count = {"identical": 0, "ROM-drift": 0, "DIFFERS": 0, "missing": 0}
for name in sorted(set(a) | set(b)):
    if name not in a or name not in b:
        count["missing"] += 1; print("MISSING", name); continue
    if key(a[name]) == key(b[name]):
        count["identical"] += 1
    elif not stable(a[name]) or not stable(b[name]):
        count["ROM-drift"] += 1; print("ROM-drift", name, a[name]["chain"]["digests"], b[name]["chain"]["digests"])
    else:
        count["DIFFERS"] += 1; print("DIFFERS", name, key(a[name]), key(b[name]))
print(" ".join(f"{k}={v}" for k, v in count.items()), "windows")
for rel in sorted(str(p.relative_to(ref)) for p in ref.rglob("*") if p.is_file() and p.parent.name != "check"):
    x, y = fresh / rel, ref / rel
    print(f"{rel}: {'byte-identical' if x.exists() and y.exists() and x.read_bytes() == y.read_bytes() else 'DIFFERS'}")
