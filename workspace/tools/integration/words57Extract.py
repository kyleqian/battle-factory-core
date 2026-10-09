#!/usr/bin/env python3
"""words57: raw probe rows (prep46OrderRngProbe.py) -> unit receipts (prep46Extract.units_of, unchanged: bodies = gAnimScriptActive
intervals, gaps up to the next rising edge, every allocation window, dense per-frame order + RAM-read words for the words bodies), plus
`frames`: [frame, free order] at every frame whose observed free order changed (the per-frame check's ROM side; pure python3).

usage (from workspace/): words57Extract.py <out-dir> <units.json>
Run A and run B must be byte-identical files (identicalAB).
"""
import hashlib, json, sys
from pathlib import Path

sys.path.insert(0, "tools/integration")
import spriteOrderBodyPlans as P
import prep46Extract as X
import words57Probe as J


def free_changes(path):
    """Every frame n whose observed free order differs from the frame before: [n, obsF] (from the first sampled frame)."""
    _, W = P.windows(path)
    out, prev = [], None
    for w in W:
        if prev is None or w["obsF"] != prev:
            out.append([w["n"], w["obsF"]])
            prev = w["obsF"]
    return {"first": W[0]["n"], "last": W[-1]["n"], "changes": out}


if __name__ == "__main__":
    out = Path(sys.argv[1])
    result = {"schema": "words57-units/v1", "jobs": {}}
    for job in J.JOBS:
        ident, move, side, battle = job[0], job[1], job[2], job[3]
        a, b = out / "raw" / f"{ident}-A.json", out / "raw" / f"{ident}-B.json"
        if not a.exists():
            continue
        same = b.exists() and a.read_bytes() == b.read_bytes()
        sc = json.loads((out / "scenarios" / f"{ident}.json").read_text())
        result["jobs"][ident] = {"move": move, "wordsSide": side, "battleUnit": battle, "identicalAB": same,
                                 "rawSha256A": hashlib.sha256(a.read_bytes()).hexdigest(),
                                 "scenarioSha256": hashlib.sha256((out / "scenarios" / f"{ident}.json").read_bytes()).hexdigest(),
                                 "labSeed": sc["seed"],
                                 "species": {s: [m["species"] for m in sc["overrides"]["parties"][s]] for s in ("player", "opponent")},
                                 "units": X.units_of(a, move == 240), "freeChanges": free_changes(a)}
    Path(sys.argv[2]).write_text(json.dumps(result, separators=(",", ":"), sort_keys=True) + "\n")
    for ident, job in result["jobs"].items():
        print(ident, "A==B" if job["identicalAB"] else "A!=B",
              " | ".join(f"{u['kind'][0]}{u['mv'] if u['mv'] is not None else ''}@{u['frame']}:{u['plan'] or '-'}" for u in job["units"]))
