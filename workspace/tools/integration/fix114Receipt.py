#!/usr/bin/env python3
"""fix114 (docs/fix114-live-audit-defects.md): the committed receipt tools/integration/fixtures/fix114-live-receipt.json from a fix114Run.sh
output dir: every aligned Taunt / Harden / Swagger / Mean Look / Substitute window (aud110Summary.py lines) of the HEAD arm and the base arm, the
totals, and (when <census-base> / <census-final> ret88Census.sh shard dirs are given) the census delta: per-command status / frames / liveFrames
changes, the command KEY sequence and the merged digests.
usage: fix114Receipt.py <run-dir> [<census-base> <census-final>] > receipt.json"""
import json, re, sys
from pathlib import Path

LINE = re.compile(r"^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+live=(\d) rows=(\d+)\s+exact=(\d+)\s+px=(\d+)\s+r1==r2=(\d) ages=(\S+) entry=(\d+)")
run = Path(sys.argv[1])
out = {"schema": "fix114-live-receipt/1", "labSeed": 305420349, "windows": [], "totals": {}}
for arm in ("head", "base"):
    out[f"{arm}Rev"] = (run / arm / "rev.txt").read_text().split()
    for line in (run / "rec" / f"{arm}-aligned.txt").read_text().splitlines():
        m = LINE.match(line)
        if m:
            f, mv, side, sp, live, rows, exact, px, same, ages, entry = m.groups()
            out["windows"].append({"arm": arm, "fixture": f, "move": mv, "side": side, "species": sp, "live": live == "1", "rows": int(rows),
                                   "exactRows": int(exact), "px": int(px), "r1r2": same == "1", "residualAges": ages})
        elif line.startswith("TOTAL"):
            _, mv, *kv = line.split()
            out["totals"].setdefault(arm, {})[mv] = {k: int(v) for k, v in (x.rsplit("=", 1) for x in kv)}
if len(sys.argv) == 4:
    base, final = Path(sys.argv[2]), Path(sys.argv[3])
    rows = lambda d: [json.loads(l) for l in (d / "merged.jsonl").read_text().splitlines() if l]
    b, a = rows(base), rows(final)
    key = lambda r: (r["battle"], r["kind"], r.get("moveId"), r.get("side"), r.get("attacker"), r.get("target"))
    mb, ma = (json.loads((d / "merged.json").read_text()) for d in (base, final))
    out["census"] = {
        "base": {"commit": (base / "commit").read_text().strip(), "src": (base / "src").read_text().strip()},
        "final": {"commit": (final / "commit").read_text().strip(), "src": (final / "src").read_text().strip()},
        "seeds": "0..999", "commands": [len(b), len(a)],
        "keySequenceIdentical": [key(r) for r in b] == [key(r) for r in a],
        "statusChanges": sum(x["status"] != y["status"] for x, y in zip(b, a)),
        "frameChanges": sum(x["frames"] != y["frames"] or x["liveFrames"] != y["liveFrames"] for x, y in zip(b, a)),
        "declineChanges": sum(x["decline"] != y["decline"] for x, y in zip(b, a)),
        "battleDigest": [mb["battleDigest"], ma["battleDigest"]],
        "commandKeyDigest": [mb["commandKeyDigest"], ma["commandKeyDigest"]],
        "overall": [mb["overall"], ma["overall"]],
    }
print(json.dumps(out, indent=1, sort_keys=True))
