#!/usr/bin/env python3
"""prep45: raw sSpriteOrder probe rows (prep45Probe.py) -> compact unit receipts (pure python3, no mGBA).

usage (from workspace/): prep45Extract.py <out-dir> <units.json>
prep43Extract.py's unit split and plan encoding, driven by prep45Probe.JOBS (run A == run B byte-identical required; sha256 of run A's
rows recorded). mv-0 bodies are labelled by the job's unit (status BRN / general TURN_TRAP / WISH_HEAL / INGRAIN_HEAL); move bodies
by `body <mv>:<attacker side>`. Also prints, per label, the distinct observed plans and their instance counts.
"""
import hashlib, json, sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, "tools/integration")
import prep43Extract as X
import prep45Probe as J

X.J = J
X.MV0_LABEL = {"BRN": "status BRN", "TURN_TRAP": "general TURN_TRAP", "WISH_HEAL": "general WISH_HEAL", "INGRAIN_HEAL": "general INGRAIN_HEAL",
               "ITEM_KNOCKOFF": "general ITEM_KNOCKOFF", "FUTURE_SIGHT_HIT": "general FUTURE_SIGHT_HIT"}

if __name__ == "__main__":
    OUT = Path(sys.argv[1])
    X.OUT = OUT
    result = {"schema": "prep45-units/v1", "jobs": {}}
    for unit, job, move, base, variant in J.JOBS:
        a, b = OUT / "raw" / f"{job}-A.json", OUT / "raw" / f"{job}-B.json"
        if not a.exists():
            continue
        same = b.exists() and a.read_bytes() == b.read_bytes()
        rows = hashlib.sha256(json.dumps(json.loads(a.read_text())["rows"], separators=(",", ":")).encode()).hexdigest()
        entry = {"unit": unit, "move": move, "base": base, "variant": list(variant) if variant else None, "rowsSha256A": rows, "identicalAB": same}
        entry.update(X.units_of(job, a))
        result["jobs"][job] = entry
    Path(sys.argv[2]).write_text(json.dumps(result, separators=(",", ":"), sort_keys=True) + "\n")
    print(len(result["jobs"]), "jobs;", sum(not j["identicalAB"] for j in result["jobs"].values()), "A/B differ")
    plans = defaultdict(lambda: defaultdict(list))
    for name, j in result["jobs"].items():
        for u in j["units"]:
            if u["kind"] == "body" and not u["truncated"]:
                plans[(j["unit"], u["label"])][u["plan"]].append(name)
    for (unit, label), ps in sorted(plans.items()):
        print(f"{unit:13} {label:28} {len(ps)} plan(s): " + " || ".join(f"{len(v)}x [{p[:90]}{'...' if len(p) > 90 else ''}]" for p, v in sorted(ps.items(), key=lambda kv: -len(kv[1]))))
