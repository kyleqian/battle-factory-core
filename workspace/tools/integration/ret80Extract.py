#!/usr/bin/env python3
"""ret80: raw sSpriteOrder probe rows (ret80Probe.py) -> compact unit receipts (pure python3, no mGBA).

usage (from workspace/): ret80Extract.py <out-dir> <units.json>
prep43Extract's unit split and plan encoding driven by ret80Probe.JOBS (run A == run B byte-identical required), as plans69Extract.
Return bodies are labelled `body 216:<side> <level>` by the job's AnimTask_GetReturnPowerLevel branch (the scenario's friendship).
Prints, per label, the distinct observed plans and their instance counts.
"""
import hashlib, json, sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, "tools/integration")
import prep43Extract as X
import ret80Probe as J

X.J = J

if __name__ == "__main__":
    OUT = Path(sys.argv[1])
    X.OUT = OUT
    result = {"schema": "ret80-units/v1", "jobs": {}}
    for unit, job, move, base, ops in J.JOBS:
        a, b = OUT / "raw" / f"{job}-A.json", OUT / "raw" / f"{job}-B.json"
        if not a.exists():
            continue
        same = b.exists() and a.read_bytes() == b.read_bytes()
        rows = hashlib.sha256(json.dumps(json.loads(a.read_text())["rows"], separators=(",", ":")).encode()).hexdigest()
        entry = {"unit": unit, "move": move, "base": base, "ops": [list(o) for o in ops] if ops else None, "rowsSha256A": rows, "identicalAB": same}
        entry.update(X.units_of(job, a))
        level = unit.split("_", 1)[1].lower()
        for u in entry["units"]:
            if u["kind"] == "body" and u["label"].startswith("body 216:"):
                u["label"] += f" {level}"
        result["jobs"][job] = entry
    Path(sys.argv[2]).write_text(json.dumps(result, separators=(",", ":"), sort_keys=True) + "\n")
    print(len(result["jobs"]), "jobs;", sum(not j["identicalAB"] for j in result["jobs"].values()), "A/B differ")
    plans = defaultdict(lambda: defaultdict(list))
    for name, j in result["jobs"].items():
        for u in j["units"]:
            if u["kind"] == "body" and not u["truncated"]:
                plans[(j["unit"], u["label"])][u["plan"]].append(name)
            elif u["kind"] == "body" and u["label"].startswith("body 216:"):
                plans[(j["unit"], u["label"] + " TRUNCATED")]["-"].append(name)
    for (unit, label), ps in sorted(plans.items()):
        print(f"{unit:17} {label:32} {len(ps)} plan(s): " + " || ".join(f"{len(v)}x [{p}] {','.join(v)}" for p, v in sorted(ps.items(), key=lambda kv: -len(kv[1]))))
