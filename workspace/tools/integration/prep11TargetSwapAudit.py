#!/usr/bin/env python3
"""prep11 Part A follow-up: species-swap audit of already-live adapters whose accepted fixture has an ONIX opponent target.  For each given fixture: copy its lab scenario with the opponent party[0]
ONIX (95) replaced by GOLEM (76), write a fixture copy (target GOLEM, HP 155) under tools/integration/fixtures/prep11/audit/ and print the paths (run them through prep11LeafDense.ts).
usage: prep11TargetSwapAudit.py <fixture.json> ..."""
import json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
out = ROOT / "tools/integration/fixtures/prep11/audit"; out.mkdir(parents=True, exist_ok=True)
for p in sys.argv[1:]:
    src = json.loads((ROOT / p).read_text())
    if src.get("sourceFixture"): src = {**json.loads((ROOT / src["sourceFixture"]).read_text()), **src}
    if src["target"]["species"] != "ONIX" or src["target"]["geometry"]["side"] != "opponent" or src.get("precedingBodies") or src.get("precedingTurns"): print("skip", p); continue
    sc = json.loads((ROOT / src["scenario"]).read_text())
    party = sc.get("overrides", {}).get("parties", {}).get("opponent")
    if not party or party[0]["species"] != 95: print("skip (no explicit opponent party[0] ONIX)", p); continue
    party[0]["species"] = 76
    name = "audit-golem-" + Path(p).stem
    (ROOT / f"tools/battle-lab/prep11-{name}.json").write_text(json.dumps(sc, separators=(",", ":")) + "\n")
    f = dict(src); f["scenario"] = f"tools/battle-lab/prep11-{name}.json"; f["target"] = {**src["target"], "species": "GOLEM"}
    f["fieldProfile"] = {**src["fieldProfile"], "opponentHp": 155, "opponentMaxHp": 155}
    f.pop("sourceFixture", None); f.pop("note", None)
    (out / f"{name}.json").write_text(json.dumps(f, indent=1) + "\n"); print(f"tools/integration/fixtures/prep11/audit/{name}.json")
