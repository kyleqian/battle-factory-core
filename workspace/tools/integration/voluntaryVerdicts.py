#!/usr/bin/env python3
"""Summarise the voluntary what-if receipts + model checks into tools/integration/fixtures/voluntary/verdicts.json
(docs/voluntary-switch-lend-audit.md s3).  Plain python."""
import json
from pathlib import Path

FX = Path(__file__).resolve().parent / "fixtures"
V = FX / "voluntary"
rows = []
for draft_path in sorted(FX.glob("voluntary-*.json")):
    draft = json.loads(draft_path.read_text())
    name = draft_path.stem.removeprefix("voluntary-")
    receipts = {p.stem.removeprefix(f"whatif-{name}-"): json.loads(p.read_text()) for p in V.glob(f"whatif-{name}-*.json")
                if p.stem.removeprefix(f"whatif-{name}-").count("-") == 1}
    cells = {k: f"{r['exactRows']}/{r['rows']}" for k, r in receipts.items()}
    role = receipts.get("role-entry")
    exact = role is not None and role["exactRows"] == role["rows"] and role["residualPixels"] == 0
    today = receipts.get("production-entry") or receipts.get("production-none")
    today_exact = today is not None and today["exactRows"] == today["rows"]
    verdict = ("GENERALIZES" if today_exact else "NEEDS-PARAM (role lend" + (" + allocator re-seed)" if draft["move"] == "LIGHT_SCREEN" else ")")) \
        if exact else "NEEDS-NEW"
    rows.append({"draft": draft_path.name, "move": draft["move"], "side": draft["attacker"]["geometry"]["side"], "scenario": draft["scenario"],
                 "edge": draft["edgeRiseFrame"], "rows": role["rows"] if role else None, "whatif": cells, "verdict": verdict})
(V / "verdicts.json").write_text(json.dumps(rows, indent=1) + "\n")
for r in rows:
    print(r["draft"].ljust(42), r["move"].ljust(13), r["side"].ljust(8), r["edge"], r["whatif"], r["verdict"])
