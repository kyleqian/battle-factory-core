#!/usr/bin/env python3
"""Assemble tools/probe/receipts/issue129-kingsrock-ko-off.json.

Runs every arm of probe-issue129-kingsrock-ko-off.py TWICE from a fresh
emulator and records the sha256 of each pair, so the receipt carries its own
byte-identity proof.  Usage: python3 tools/probe/build-issue129-receipt.py
"""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ARMS = {
    "ohkoKingsRock": "tools/battle-lab/issue129-kingsrock-ohko-off.json",
    "ohkoNoItemControl": "tools/battle-lab/issue129-noitem-ohko-off.json",
    "earthquakeKoKingsRock": "tools/battle-lab/issue129-kingsrock-eq-ko-off.json",
    "earthquakeSurvivesKingsRock": "tools/battle-lab/issue129-kingsrock-eq-survive-off.json",
}


def run(fixture: str, out: Path) -> dict:
    if out.exists():
        out.unlink()
    subprocess.run(
        [sys.executable, "tools/run-mgba-probe.py", str(out), "--",
         sys.executable, "tools/probe/probe-issue129-kingsrock-ko-off.py", fixture, str(out)],
        cwd=ROOT, check=True, capture_output=True,
    )
    return json.loads(out.read_text())


def main() -> None:
    arms: dict[str, dict] = {}
    shas: dict[str, str] = {}
    with tempfile.TemporaryDirectory() as tmp:
        for name, fixture in ARMS.items():
            digests = []
            payload = None
            for pass_index in (0, 1):
                out = Path(tmp) / f"{name}-{pass_index}.json"
                payload = run(fixture, out)
                digests.append(hashlib.sha256(out.read_bytes()).hexdigest())
            if digests[0] != digests[1]:
                raise SystemExit(f"{name}: two fresh runs differ ({digests})")
            shas[name] = digests[0]
            moveend = {entry["moveendState"]: entry for entry in payload["moveendStatesFirstSeen"]}
            state11 = moveend.get(11)
            arms[name] = {
                "fixture": fixture,
                "seed": payload["seed"],
                "totalRandomCalls": payload["totalRandomCalls"],
                "rngLedger": payload["rngLedger"],
                "moveendStatesFirstSeen": payload["moveendStatesFirstSeen"],
                "atMoveendState11": state11,
                "final": payload["final"],
            }
            print(f"{name}: draws={payload['totalRandomCalls']} sha={digests[0][:16]}", flush=True)

    out_path = ROOT / "tools" / "probe" / "receipts" / "issue129-kingsrock-ko-off.json"
    previous = json.loads(out_path.read_text()) if out_path.exists() else {}
    receipt = dict(previous)
    receipt.update({
        "arms": arms,
        "probeOutputSha256": shas,
        "freshRunCountPerArm": 2,
        "byteIdenticalAcrossFreshRuns": True,
    })
    out_path.write_text(json.dumps(receipt, indent=2) + "\n")
    print(f"wrote {out_path}")


if __name__ == "__main__":
    main()
