#!/usr/bin/env python3
"""Merge the playerfaint what-if receipts + model checks + host replay into fixtures/playerfaint/verdicts.json (docs/playerfaint-lend-audit.md s3)."""
import json
from pathlib import Path

FX = Path(__file__).resolve().parent / "fixtures"
replay = {r["fixture"]: r for r in json.loads((FX / "playerfaint/host-replay-receipt.json").read_text())}
ALLOCATOR = {"PROTECT", "LIGHT_SCREEN"}
rows = []
for path in sorted(FX.glob("playerfaint-*.json")):
    fx = json.loads(path.read_text())
    name = path.stem.removeprefix("playerfaint-")
    rel = f"tools/integration/fixtures/{path.name}"
    receipts = {}
    for lend in ("role", "production", "raw"):
        p = FX / f"playerfaint/whatif-{name}.whatif-{lend}.json"
        if p.exists():
            r = json.loads(p.read_text())
            receipts[lend] = {"exactRows": r["exactRows"], "rows": r["rows"], "residualPixels": r["residualPixels"], "digest": r["digest"]}
    role, today = receipts.get("role"), receipts.get("production")
    second_ko = name.startswith("secondko-")
    if second_ko:
        verdict = "GENERALIZES (today's pi lend)" if today and today["exactRows"] == today["rows"] else "FAILS"
    elif role and role["exactRows"] == role["rows"]:
        verdict = "NEEDS-PARAM (role lend + host re-seed)" if fx["move"] in ALLOCATOR else (
            "NEEDS-PARAM (role lend)" if not today or today["exactRows"] < today["rows"] else "GENERALIZES")
    else:
        verdict = "NEEDS-NEW"
    rows.append({"fixture": rel, "move": fx["move"], "side": fx["attacker"]["geometry"]["side"], "edge": fx["edgeRiseFrame"],
                 "window": fx["denseWindow"], "whatIf": receipts, "hostReplay": replay.get(rel), "verdict": verdict})
(FX / "playerfaint/verdicts.json").write_text(json.dumps(rows, indent=1) + "\n")
for r in rows:
    w = r["whatIf"]
    print(f'{r["move"]:13} {r["side"]:8} {r["edge"]:5} role {w.get("role", {}).get("exactRows")}/{w.get("role", {}).get("rows")} '
          f'today {w.get("production", {}).get("exactRows")}/{w.get("production", {}).get("rows")} raw {w.get("raw", {}).get("exactRows")} -> {r["verdict"]}')
