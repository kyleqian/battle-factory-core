#!/usr/bin/env python3
"""prep50: status-animation net-zero receipt from prep50Probe.py raw pairs (docs/next-adapters-prep50.md).

usage: prep50Extract.py <out-dir> <receipt.json>
Per (label, scenario): the two fresh runs must be byte-identical (pairIdentical). Per status body: side (gBattleAnimAttacker:
0 player, 1 opponent), activation / cleanup, baseline, end, created / destroyed, late changes, netZero. Per label verdict:
NET-ZERO iff every pair is identical, there is >= 1 body on EACH side, every body is netZero with baseline == end == the
known entry [0,1,2,6,8,60,61,62,63] (docs/allocator-net-zero-audit.md). A body still active at the trace end ("no cleanup
within trace") carries no evidence either way: it is listed (truncated) and excluded; >= 1 COMPLETE body per side is required.
"""
import json, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from prep50Probe import JOBS  # noqa: E402

KNOWN = [0, 1, 2, 6, 8, 60, 61, 62, 63]
raw = Path(sys.argv[1]) / "raw"
rows, labels = [], {}
for label, stem in JOBS:
    a, b = (raw / f"{label}-{stem}-{k}.json" for k in (0, 1))
    same = a.is_file() and b.is_file() and a.read_bytes() == b.read_bytes()
    r = json.loads(a.read_text())
    bodies = [{"side": "player" if x["attacker"] == 0 else "opponent", "activation": x["activation"], "cleanup": x["cleanup"],
               **({"error": x["error"]} if "error" in x else {"baseline": x["baseline"], "end": x["end"], "created": x["created"],
                  "destroyed": x["destroyed"], "lateChanges": len(x["lateChanges"]), "netZero": x["netZero"],
                  "knownEntry": x["baseline"] == KNOWN and x["end"] == KNOWN})} for x in r["bodies"]]
    rows.append({"label": label, "scenario": stem, "pairIdentical": same, "framesRun": r["framesRun"], "bodies": bodies})
    s = labels.setdefault(label, {"label": label, "labelAddress": r["labelAddress"], "scenarios": 0, "pairsIdentical": 0,
                                  "bodies": {"player": 0, "opponent": 0}, "netZeroBodies": 0, "knownEntryBodies": 0, "truncated": 0,
                                  "createdDestroyed": set()})
    s["scenarios"] += 1; s["pairsIdentical"] += same
    for x in bodies:
        if "error" in x: s["truncated"] += 1; continue
        s["bodies"][x["side"]] += 1
        s["netZeroBodies"] += x["netZero"]; s["knownEntryBodies"] += x["knownEntry"]
        s["createdDestroyed"].add(f'{x["created"]}/{x["destroyed"]}')
summary = []
for s in labels.values():
    n = s["bodies"]["player"] + s["bodies"]["opponent"]
    ok = (s["pairsIdentical"] == s["scenarios"] and min(s["bodies"].values()) > 0
          and s["netZeroBodies"] == n and s["knownEntryBodies"] == n)
    summary.append({**s, "createdDestroyed": sorted(s["createdDestroyed"]), "verdict": "NET-ZERO" if ok else "NOT PROVEN"})
receipt = {"schema": "prep50-status-net-zero-audit/v1", "knownEntry": KNOWN,
           "probe": "tools/integration/prep50StatusProbe.py (two fresh direct-mGBA processes per scenario)",
           "summary": summary, "scenarios": rows}
Path(sys.argv[2]).write_text(json.dumps(receipt, indent=1) + "\n")
for s in summary:
    print(f'{s["verdict"]:<10} {s["label"]:<17} scenarios {s["scenarios"]} identical {s["pairsIdentical"]} bodies {s["bodies"]} '
          f'netZero {s["netZeroBodies"]} knownEntry {s["knownEntryBodies"]} truncated {s["truncated"]} c/d {s["createdDestroyed"]}')
for r in rows:
    if not r["bodies"] or not r["pairIdentical"] or any(not x.get("netZero") or not x.get("knownEntry") for x in r["bodies"]):
        print("  note:", r["label"], r["scenario"], "identical" if r["pairIdentical"] else "PAIR DIFFERS",
              [(x["side"], x.get("error") or (x["baseline"], x["end"], x["created"], x["destroyed"])) for x in r["bodies"]] or "no bodies")
