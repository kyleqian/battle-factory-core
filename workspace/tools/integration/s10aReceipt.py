#!/usr/bin/env python3
"""S10A live receipt (tools/integration/fixtures/r5-live-receipt.json): merges the compact speciesAuditDense.ts receipts (2 fresh mGBA runs per
window, digests compared) of the S10A scoped-exact adapters with the tested commit / src tree, the commands and the gate outcomes (JSON args).
usage: s10aReceipt.py RECEIPTDIR [gates.json]"""
import json, subprocess, sys
from pathlib import Path
R = Path(__file__).resolve().parents[2]
git = lambda *a: subprocess.run(["git", *a], cwd=R, capture_output=True, text=True).stdout.strip()
windows = []
for f in sorted(Path(sys.argv[1]).glob("*.json")):
    r = json.loads(f.read_text())
    windows.append({"fixture": r["fixture"], "move": json.loads((R / r["fixture"]).read_text())["move"], "rows": r["rows"], "exactRows": r["exactRows"],
                    "residualPixels": r["residualPixels"], "expectedDuration": r["expectedDuration"], "freshRuns": r["freshRuns"], "digests": r["digests"],
                    "identical": r["identical"]})
out = R / "tools/integration/fixtures/r5-live-receipt.json"
prev = json.loads(out.read_text()) if out.exists() else {}
gates = json.loads(Path(sys.argv[2]).read_text()) if len(sys.argv) > 2 else prev.get("gates", {})
receipt = {"schema": "s10a-live-receipt/v1", "testedCommit": git("rev-parse", "HEAD"), "testedSrcTree": git("rev-parse", "HEAD:workspace/src"),
           "dirty": bool(git("status", "--porcelain", "src")),
           "commands": ["sh tools/integration/prep22Probes.sh /tmp/s10a/sp 2 <12 spit-up scenarios>; python3 tools/integration/s10aLiveFixtures.py /tmp/s10a/sp",
                        "OUT_DIR=<dir> npx vite-node tools/integration/speciesAuditDense.ts tools/integration/fixtures/s10a-live/<fixture>.json  (2 fresh mGBA runs)",
                        "python3 tools/integration/s10aReceipt.py <dir> [gates.json]"],
           "summary": {m: {"windows": sum(w["move"] == m for w in windows), "rows": sum(w["rows"] for w in windows if w["move"] == m),
                           "exactRows": sum(w["exactRows"] for w in windows if w["move"] == m),
                           "residualPixels": sum(w["residualPixels"] for w in windows if w["move"] == m)} for m in sorted({w["move"] for w in windows})},
           "windows": windows, "routes": prev.get("routes", {}), "gates": gates}
out.write_text(json.dumps(receipt, indent=1) + "\n")
print(json.dumps(receipt["summary"]))
