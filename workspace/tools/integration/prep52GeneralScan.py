#!/usr/bin/env python3
"""prep52: every NON-MOVE animation script seen in the prep52 probe runs (sAnimMoveIndex == 0: general / status / special
animations), with its allocator net-zero tally (docs/next-adapters-prep52.md "General animations").

usage: prep52GeneralScan.py <out-dir> <receipt.json>
Production's allocator host (factoryRoundBattleOrchestrator.ts prepareResolutionPalette) is invalidated by move bodies outside
the net-zero list / plans, ball / summary / slide / recall commands and status animations outside the audited set -- NOT by
general-animation, hit-animation or stat-animation events. This scan reads every A run whose B twin is byte-identical and
tallies, per script label, complete intervals, net-zero intervals (prep52Extract.py's rule: baseline == end, created ==
destroyed, every late change owned by the next action), intervals from the known entry per side, and created counts.
Incidental evidence: the scenarios were chosen for the move bodies, not for these scripts.
"""
import json, sys
from collections import defaultdict
from pathlib import Path

KNOWN = [0, 1, 2, 6, 8, 60, 61, 62, 63]
HIT = ["sInvisibleSpriteTemplate", "SpriteCB_HitAnimHealthoxEffect"]
out, receipt = Path(sys.argv[1]), Path(sys.argv[2])
tally = defaultdict(lambda: {"intervals": 0, "complete": 0, "netZero": 0, "fromKnownEntry": {"player": 0, "opponent": 0},
                             "created": set(), "scenarios": set(), "notNetZero": []})
skipped = []
for a in sorted((out / "raw").glob("*-A.json")):
    b = a.with_name(a.name[:-6] + "B.json")
    if not b.is_file() or a.read_bytes() != b.read_bytes():
        skipped.append(a.name); continue
    raw = json.loads(a.read_bytes())
    starts = [x["activation"] for x in raw["bodies"]]
    for x in raw["bodies"]:
        if x["moveIndex"] != 0:
            continue
        t = tally[x["script"]]
        t["intervals"] += 1
        t["scenarios"].add(a.name[:-7])
        if "error" in x:
            continue
        t["complete"] += 1
        later = [s for s in starts if s > x["activation"]]
        owned = all(any(s <= c["frame"] for s in later) or (c["added"] and all(v == HIT for v in c["added"].values()) and not c["removed"])
                    for c in x["lateChanges"])
        nz = x["baseline"] == x["end"] and x["created"] == x["destroyed"] and owned
        t["netZero"] += nz
        if x["baseline"] == KNOWN and nz:
            t["fromKnownEntry"]["player" if x["attacker"] == 0 else "opponent"] += 1
        t["created"].add(x["created"])
        if not nz:
            t["notNetZero"].append({"scenario": a.name[:-7], "activation": x["activation"], "baseline": x["baseline"], "end": x["end"],
                                    "created": x["created"], "destroyed": x["destroyed"], "survivors": x["survivors"],
                                    "freed": x["freed"], "late": x["lateChanges"]})
rows = [{"script": k, **{kk: (sorted(v) if isinstance(v, set) else v) for kk, v in t.items() if kk != "scenarios"},
         "scenarioCount": len(t["scenarios"])} for k, t in sorted(tally.items())]
doc = {"schema": "prep52-general-animation-scan/v1", "knownEntry": KNOWN, "skippedNotIdentical": skipped, "scripts": rows}
receipt.write_text(json.dumps(doc, indent=1) + "\n")
for r in rows:
    print(f'{r["script"]:<28} complete {r["complete"]:>3}/{r["intervals"]:<3} netZero {r["netZero"]:>3}  known-entry ply/opp '
          f'{r["fromKnownEntry"]["player"]}/{r["fromKnownEntry"]["opponent"]}  created {r["created"]}  scenarios {r["scenarioCount"]}')
