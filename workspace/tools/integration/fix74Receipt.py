#!/usr/bin/env python3
"""fix74: assemble tools/integration/fixtures/fix74-live-receipt.json from the run's scratch outputs.
  python3 tools/integration/fix74Receipt.py <scratch-dir> [census-delta.json] [parity-339.json] [parity-113.json]
<scratch-dir> holds verify/<name>.jsonl (fix74Verify.ts), derive/<name>.json (bulkUpProbe.py: RAM y2) and act/<name>.json
(audit18Probe.py: activation .. first inactive)."""
import json, sys
from pathlib import Path

S = Path(sys.argv[1])
extra = [Path(p) for p in sys.argv[2:]]
FIX = Path("tools/integration/fixtures/fix74")
pred = json.loads((FIX / "bulk-up-predictions.json").read_text())["predictions"]
windows = []
for fixture in sorted((FIX / "fixtures").glob("*.json")):
    name = fixture.stem
    f = json.loads(fixture.read_text())
    v = json.loads((S / "verify" / f"{name}.jsonl").read_text().splitlines()[0])
    probe = json.loads((S / "derive" / f"{name}.json").read_text())
    sid = next(t["data"][15] for r in probe["frames"] for t in r["tasks"] if t["func"]["symbol"] == "AnimTask_GrowAndShrink_Step")
    ram_y2 = [next(x["y2"] for x in r["sprites"] if x["slot"] == sid) for r in probe["frames"][:48]]
    act = json.loads((S / "act" / f"{name}.json").read_text())
    body = next(b for b in act["bodies"] if b.get("label") == "Move_BULK_UP")
    side, species = f["attacker"]["geometry"]["side"], f["attacker"]["species"]
    p = pred[f"{species}/{side}"]
    windows.append({
        "fixture": name, "attacker": species, "side": side, "target": f["target"]["species"],
        "window": f["denseWindow"], "rows": v["rows"], "exactRows": v["exactRows"], "px": v["px"], "expectedDuration": v["expectedDuration"],
        "r1EqR2": v["r1EqR2"], "digests": v["digests"],
        "activation": body["startFrame"], "firstInactive": body["endFrame"], "rowsActivationFraming": body["endFrame"] - body["startFrame"] + 1,
        "leadRows": f["denseWindow"]["startFrame"] - body["startFrame"],
        "romY2": ram_y2, "H": p["H"], "predictedY2Equal": ",".join(map(str, ram_y2)) == p["reducerY2"],
        "predictedPx": p["predictedPx"], "predictedRowsActivationFraming": p["rowsActivationFraming"],
    })
ls_before = Path("tools/integration/fixtures/fix74/light-screen-live-before.txt").read_text().splitlines()
ls_after = Path("tools/integration/fixtures/fix74/light-screen-live-after.txt").read_text().splitlines()
receipt = {
    "schema": "fix74-live-receipt/v1",
    "base": "1b59ee96e",
    "bulkUp": {
        "verdict": "source-correct for every species (branch A, no production change): the audit 18 CHANSEY residual is the window framing "
                   "(production age 0 = first grown frame, 4 rows after activation; audit 18 rendered age 0 at activation), the same ARTIFACT "
                   "class as audit 18's Iron Defense ageOffset -1",
        "windows": windows,
        "summary": {"windows": len(windows), "zeroPx": sum(w["px"] == 0 for w in windows), "r1EqR2": sum(w["r1EqR2"] for w in windows),
                    "y2EqualsPrediction": sum(w["predictedY2Equal"] for w in windows),
                    "rowsActivationFraming": sorted({w["rowsActivationFraming"] for w in windows}), "leadRows": sorted({w["leadRows"] for w in windows})},
    },
    "lightScreen": {
        "decline": "liveMoveHiddenTargetDeclines: moveId 113 && attacker 0 && opponent hidden (any Fly / Bounce / Dig / Dive)",
        "audit18LendsOnlyBefore": ls_before, "audit18LendsOnlyAfter": ls_after,
        "changed": [b.split(",")[0] for b, a in zip(ls_before, ls_after) if b != a],
    },
}
for path in extra:
    receipt[path.stem.replace("fix74-", "")] = json.loads(path.read_text())
Path("tools/integration/fixtures/fix74-live-receipt.json").write_text(json.dumps(receipt, indent=1) + "\n")
print(json.dumps(receipt["bulkUp"]["summary"]), receipt["lightScreen"]["changed"])
