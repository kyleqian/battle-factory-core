#!/usr/bin/env python3
"""plans48: raw sSpriteOrder probe rows (prep48Probe.py) -> compact unit receipts (pure python3, no mGBA).

usage (from workspace/): prep48Extract.py <out-dir> <units.json>
prep45Extract.py driven by prep48Probe.JOBS (prep43Extract's unit split and plan encoding; run A == run B byte-identical required).
mv-0 bodies are labelled by the job's unit (status NIGHTMARE / status CURSED / general ITEM_KNOCKOFF / status FRZ); move bodies by
`body <mv>:<attacker side>`. FRZ seed-sweep jobs without a freeze keep only their metadata (froze: false). Prints, per label, the distinct observed plans and their instance counts.
"""
import hashlib, json, sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, "tools/integration")
import prep43Extract as X
import prep48Probe as J

X.J = J
X.MV0_LABEL = {"NIGHTMARE": "status NIGHTMARE", "CURSED": "status CURSED", "ITEM_KNOCKOFF": "general ITEM_KNOCKOFF", "FRZ": "status FRZ", "SUBSTITUTE_FADE": "general SUBSTITUTE_FADE"}

if __name__ == "__main__":
    OUT = Path(sys.argv[1])
    X.OUT = OUT
    result = {"schema": "prep48-units/v1", "jobs": {}}
    for unit, job, move, base, ops in J.JOBS:
        a, b = OUT / "raw" / f"{job}-A.json", OUT / "raw" / f"{job}-B.json"
        if not a.exists():
            continue
        same = b.exists() and a.read_bytes() == b.read_bytes()
        rows = hashlib.sha256(json.dumps(json.loads(a.read_text())["rows"], separators=(",", ":")).encode()).hexdigest()
        entry = {"unit": unit, "move": move, "base": base, "ops": [list(o) for o in ops] if ops else None, "rowsSha256A": rows, "identicalAB": same}
        entry.update(X.units_of(job, a))
        if unit == "FRZ":  # the seed sweep: keep the units of the freezing seeds only (the others record froze: false)
            entry["froze"] = any(u["label"] == "status FRZ" for u in entry["units"])
            if not entry["froze"]:
                entry["units"] = []
        result["jobs"][job] = entry
    Path(sys.argv[2]).write_text(json.dumps(result, separators=(",", ":"), sort_keys=True) + "\n")
    print(len(result["jobs"]), "jobs;", sum(not j["identicalAB"] for j in result["jobs"].values()), "A/B differ")
    plans = defaultdict(lambda: defaultdict(list))
    for name, j in result["jobs"].items():
        for u in j["units"]:
            if u["kind"] == "body" and not u["truncated"]:
                plans[(j["unit"], u["label"])][u["plan"]].append(name)
    for (unit, label), ps in sorted(plans.items()):
        print(f"{unit:13} {label:24} {len(ps)} plan(s): " + " || ".join(f"{len(v)}x [{p[:100]}{'...' if len(p) > 100 else ''}] {','.join(v)}" for p, v in sorted(ps.items(), key=lambda kv: -len(kv[1]))))
