#!/usr/bin/env python3
"""prep28: compact event table (sprite-order-body-events/v1 shape) of the prep28 probe scenarios (identical A/B only) for the CONFIRMED cells + Sky Attack.
usage: OUT=/tmp/p28 python3 tools/integration/prep28Events.py -> fixtures/prep28/body-events.json"""
import json, os, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import spriteOrderBodyPlans as P
OUT = Path(os.environ.get("OUT", "/tmp/p28")); PREP = P.FIX / "prep28"
cells = {c["cell"] for c in json.loads((PREP / "tie-verdicts.json").read_text())["cells"] if c["verdict"] == "CONFIRMED"} | {"143:player", "143:opponent"}
sc = []
for a in sorted(OUT.glob("*-A.json")):
    b = a.with_name(a.name[:-7] + "-B.json"); cell = ":".join(a.name.split("-")[:2])
    if cell not in cells or not b.exists() or a.read_bytes() != b.read_bytes(): continue
    s = P.extract_scenario("p28", str(a))
    if s is None: continue
    s["side"], s["file"] = cell.split(":")[1], a.name; sc.append(s)
(PREP / "body-events.json").write_text(json.dumps({"schema": "sprite-order-body-events/v1", "note": "prep28 scenarios only", "scenarios": sc}, separators=(",", ":")) + "\n")
print(len(sc), "scenarios", (PREP / "body-events.json").stat().st_size, "bytes")
