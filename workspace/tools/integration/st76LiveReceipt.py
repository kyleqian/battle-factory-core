#!/usr/bin/env python3
"""st76: the live receipt (docs/st76-status-gates.md): windows (st76-windows.json without the row hashes), the census delta (base vs
final, seeds 0..999 as ten --index-from ranges of 100 in scratch copies of liveShareCensus.ts; fix74CensusDelta.py), the Scene ON / OFF
parity (hide66Parity.ts --moves=291) and the final gates (GATES json, optional).
usage: st76LiveReceipt.py [GATES.json]  -> tools/integration/fixtures/st76-live-receipt.json"""
import json, sys
from pathlib import Path
FX = Path("tools/integration/fixtures")
w = json.loads((FX / "st76-windows.json").read_text())
delta = json.loads((FX / "st76-census-delta-seeds0-999.json").read_text())
parity = {s: json.loads((FX / f"st76-parity-seed{s}.json").read_text()) for s in (428, 518)}
by = {}
for c in delta["changes"]:
    k = f'{c["moveId"]}/{c["side"]}: {c["before"]} -> {c["after"]}'
    by.setdefault(k, {"commands": 0, "framesBefore": 0, "framesAfter": 0})
    by[k]["commands"] += 1; by[k]["framesBefore"] += c["framesBefore"]; by[k]["framesAfter"] += c["framesAfter"]
receipt = {
    "schema": "st76-live-receipt/v1",
    "base": "76125b755", "productionChange": "src/engine/liveMoveAnimation.ts cases 291 / 309: the displayed-status gates removed",
    "windows": {"totals": w["totals"], "rows": [{k: v for k, v in x.items() if k != "romRgbSha256"} for x in w["windows"]],
                "attackRowSweep": w["attackRowSweep"], "lagRowWindows": w["lagRowWindows"],
                "source": "tools/integration/fixtures/st76-windows.json (st76Receipt.py; ROM row hashes for the Tier-1 vectors)"},
    "census": {"seeds": "0..999", "method": "ten ranges of 100 per tree, --index-from = range start (single-process battle ids / streaks), scratch copies of liveShareCensus.ts",
               **{k: delta[k] for k in ("keySequenceIdentical", "battleDigestExcludingFramesIdentical", "commands", "liveCommands", "liveFrames", "frames")},
               "statusChanges": by, "liveToFallback": sum(1 for c in delta["changes"] if c["before"] == "live" and c["after"] != "live"),
               "source": "tools/integration/fixtures/st76-census-delta-seeds0-999.json"},
    "parity": {str(s): {k: p[k] for k in ("seed", "streak", "moves", "turnBoundariesCompared", "logicalDigest", "rngEqual", "rulesEqual", "boundaryEqual")}
               for s, p in parity.items()},
}
if len(sys.argv) > 1:
    receipt["gates"] = json.loads(Path(sys.argv[1]).read_text())
(FX / "st76-live-receipt.json").write_text(json.dumps(receipt, indent=1) + "\n")
print(json.dumps({"windows": receipt["windows"]["totals"], "census": {k: receipt["census"][k] for k in ("liveCommands", "liveFrames", "liveToFallback", "keySequenceIdentical", "battleDigestExcludingFramesIdentical")}, "changes": by}, indent=1))
