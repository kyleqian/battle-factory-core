"""Round replay (docs/parity-mac/round-replay.md): one table over a batch directory of tools/audio/romRoundReplay.sh.
Usage: python3 tools/audio/romRoundSummary.py OUTDIR [--json FILE]
Per round: the battles driven, how the round ended on the ROM (won / lost / stopped), and the first difference (the battle, and whether it was at the battle
start (a party field, the trainer or the sets), at the trainer roll, or in the turns). Counts are of rounds driven, not a quality figure."""
import json, sys
from collections import Counter
from pathlib import Path

d = Path(sys.argv[1])
rows = []
for line in (d / "done.txt").read_text().splitlines():
    rid, rc = line.split(" rc=")
    row = {"id": rid, "rc": int(rc)}
    cmp_path, drive_path = d / f"{rid}.cmp.json", d / f"{rid}.drive.json"
    if cmp_path.exists():
        c = json.loads(cmp_path.read_text())
        dr = json.loads(drive_path.read_text())
        bs = c["battles"]
        row.update({"match": c["match"], "battles": len(bs), "romError": c.get("romError"), "roundError": c.get("roundError"),
                    "end": ("error" if dr.get("error") else "won" if len(bs) == 7 and bs[-1]["romOutcome"] == 1 else "lost" if bs and bs[-1]["romOutcome"] == 2 else "stopped"),
                    "swaps": sum(1 for b in bs if (b.get("swapAfter") or {}).get("type") == "accept")})
        first = next((b for b in bs if not b["match"]), None)
        if first is not None:
            kind = ("start" if first["startDiffs"] else "trainer-roll" if first["battleIndex"] > 0 and not (first["selection"] or {}).get("matched")
                    else "engine-error" if first["engineError"] else "turns")
            row["first"] = {"battle": first["battleIndex"], "kind": kind, "startDiffs": first["startDiffs"][:6], "selection": first["selection"],
                            "turns": first["turns"], "engineError": first["engineError"]}
    rows.append(row)
print(f"rounds {len(rows)}; rc {dict(Counter(r['rc'] for r in rows))}")
print(f"ends {dict(Counter(r.get('end') for r in rows))}")
print(f"match {sum(1 for r in rows if r.get('match'))}; battles driven {sum(r.get('battles', 0) for r in rows)}; deepest {Counter(r.get('battles', 0) for r in rows)}")
print(f"rounds with a swap {sum(1 for r in rows if r.get('swaps'))}; swaps {sum(r.get('swaps', 0) for r in rows)}")
for r in rows:
    if not r.get("match"):
        print(json.dumps({k: r.get(k) for k in ("id", "rc", "battles", "end", "romError", "roundError", "first")})[:900])
if "--json" in sys.argv:
    Path(sys.argv[sys.argv.index("--json") + 1]).write_text(json.dumps(rows, indent=1))
