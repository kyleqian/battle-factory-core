#!/usr/bin/env python3
"""dolldef-live receipt: two independent prep38Check.ts passes (each comparing every row against BOTH fresh direct-mGBA probe runs) over every
prep38 TEST window (defender shown as the Substitute doll) at the final production code, plus the committed dense fixtures' per-row ROM sha256
check (dolldefLiveCheck.ts JSON lines). Classifies each window: claimed (a LIVE_SUBSTITUTE_DOLL_DEFENDER_CELLS cell, live) or declined (fallback).
usage: dolldefReceipt.py REC1 REC2 DOLLDEF_LINES CODE_COMMIT SRC_TREE OUT.json [extra.json]"""
import json, sys
from pathlib import Path
rec1, rec2, lines, commit, tree, out = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]), sys.argv[4], sys.argv[5], Path(sys.argv[6])
extra = json.loads(Path(sys.argv[7]).read_text()) if len(sys.argv) > 7 else {}
committed = {d["stem"]: d for d in (json.loads(l) for l in lines.read_text().splitlines() if l.strip())}
windows = []
for p in sorted(rec1.glob("*-test.json")):
    a, b = json.loads(p.read_text())[0], json.loads((rec2 / p.name).read_text())[0]
    strip = lambda r: {k: v for k, v in r.items() if k != "fixture"}  # noqa: E731
    c = committed.get(a["stem"])
    windows.append({
        "stem": a["stem"], "move": a["move"], "attackerSide": a["attackerSide"], "window": a["window"], "rows": a["rows"], "shift": a["shift"],
        "orderInput": a["orderInput"], "liveEngaged": a["liveEngaged"], "liveDuration": a["liveDuration"],
        "pass1": [r["residualPixels"] for r in a["runs"]], "pass2": [r["residualPixels"] for r in b["runs"]],
        "freshRunsIdentical": a["identical"] and b["identical"], "passesIdentical": strip(a) == strip(b),
        "affectedAges": a["affectedAges"], "maxPxRow": a["maxPxRow"], "bbox": a["bbox"],
        "verdict": ("claimed" if a["liveEngaged"] else "declined-fallback"),
        **({"committedFixture": {"rows": c["rows"], "exactRows": c["exactRows"], "mismatchedAges": c["mismatchedAges"]}} if c else {}),
    })
claimed = [w for w in windows if w["verdict"] == "claimed"]
receipt = {
    "schema": "dolldef-live-receipt/v1",
    "code": {"commit": commit, "srcTree": tree},
    "method": "fresh direct-mGBA prep38 probes (tools/integration/prep38Probes.sh, 65 scenarios x 2 fresh processes, frame series compared), "
              "prep38Fixtures.py TEST windows (each scenario's own activation; D3 words pinned from the probe), age shift = the move's calibrated "
              "doll-free control (fixtures/prep38/receipts/control); production renderBattleResolutionLiveView with the defender flagged "
              "substituteDoll, compared against both probe runs; two independent checker passes; committed dense fixtures "
              "(fixtures/dolldef-live, per-row ROM RGB sha256) re-rendered by dolldefLiveCheck.ts",
    "summary": {
        "windows": len(windows), "claimed": len(claimed), "claimedZeroPx": sum(1 for w in claimed if w["pass1"] == [0, 0] and w["pass2"] == [0, 0]),
        "claimedDocumentedResidual": [{"stem": w["stem"], "px": w["pass1"][0], "ages": w["affectedAges"]} for w in claimed if w["pass1"] != [0, 0]],
        "declined": sorted(w["stem"] for w in windows if w["verdict"] != "claimed"),
        "allPassesIdentical": all(w["passesIdentical"] for w in windows), "allFreshRunsIdentical": all(w["freshRunsIdentical"] for w in windows),
        "committedFixtures": len(committed),
        "committedFixturesExact": sum(1 for c in committed.values() if not c["mismatchedAges"]),
    },
    **extra,
    "windows": windows,
}
out.write_text(json.dumps(receipt, indent=1) + "\n")
print(json.dumps(receipt["summary"], indent=1))
