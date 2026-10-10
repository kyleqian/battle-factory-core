#!/usr/bin/env python3
"""prep61: raw probe rows (prep61Probe.py / prep61EventProbe.py) -> compact unit receipts (pure python3, no mGBA).

usage (from workspace/): prep61Extract.py <out-dir> <units.json>
prep43Extract.units_of's unit split and plan encoding, driven by prep61Probe.JOBS (run A == run B byte-identical required). Each unit
also carries the RAM state at its first frame from the probe's extra list: gAnimMoveTurn, the battler sprites' invisible bits and the
STATUS3_SEMI_INVULNERABLE bits (bit 0 player, bit 1 opponent), and gRng2Value. A Fly / Bounce / Dive body with gAnimMoveTurn bit 0 set
(choosetwoturnanim's second branch) is labelled with the order key 10000 + move (`body 10019:player`), as the host's TWO_TURN keys.
Per job, `visibility`: every change of (invisible bits, semi-invulnerable bits) with its frame and the unit it falls in.
Prints, per label, the distinct observed plans and their instance counts.
"""
import bisect, hashlib, json, sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, "tools/integration")
import prep43Extract as X
import prep61Probe as J  # installs JOBS / scenario on prep43Probe

TWO_TURN = {19, 340, 291}


def state_at(extra, n):
    i = bisect.bisect_right([e[0] for e in extra], n) - 1
    return extra[i] if i >= 0 else [n, 0, 0, 0, 0]


if __name__ == "__main__":
    OUT = Path(sys.argv[1])
    X.OUT = OUT
    result = {"schema": "prep61-units/v1", "jobs": {}}
    for unit, job, move, base, ops in J.JOBS:
        a, b = OUT / "raw" / f"{job}-A.json", OUT / "raw" / f"{job}-B.json"
        if not a.exists():
            continue
        same = b.exists() and a.read_bytes() == b.read_bytes()
        raw = json.loads(a.read_text())
        rows = hashlib.sha256(json.dumps(raw["rows"], separators=(",", ":")).encode()).hexdigest()
        extra = raw["extra"]
        entry = {"unit": unit, "move": move, "base": base, "ops": [list(o) for o in ops], "rowsSha256A": rows, "identicalAB": same}
        entry.update(X.units_of(job, a))
        for u in entry["units"]:
            _, turn, inv, semi, rng2 = state_at(extra, u["frame"])
            u["ram"] = {"animMoveTurn": turn, "invisible": inv, "semiInvulnerable": semi, "rng2": format(rng2, "08x")}
            if u["kind"] == "body" and u["label"].startswith("body "):
                mv, side = u["label"][5:].split(":")
                if int(mv) in TWO_TURN and turn & 1:
                    u["label"] = f"body {10000 + int(mv)}:{side}"
        starts = [u["frame"] for u in entry["units"]]
        vis, prev = [], None
        for e in extra:
            if prev is None or (e[2], e[3]) != prev:
                k = bisect.bisect_right(starts, e[0]) - 1
                vis.append({"f": e[0], "invisible": e[2], "semiInvulnerable": e[3],
                            "in": f"{entry['units'][k]['kind']} {entry['units'][k]['label']}" if k >= 0 else "before the first unit"})
            prev = (e[2], e[3])
        entry["visibility"] = vis
        result["jobs"][job] = entry
    Path(sys.argv[2]).write_text(json.dumps(result, separators=(",", ":"), sort_keys=True) + "\n")
    print(len(result["jobs"]), "jobs;", sum(not j["identicalAB"] for j in result["jobs"].values()), "A/B differ")
    plans = defaultdict(lambda: defaultdict(list))
    for name, j in result["jobs"].items():
        for u in j["units"]:
            if u["kind"] == "body" and not u["truncated"]:
                plans[(j["unit"], u["label"])][u["plan"]].append(name)
    for (unit, label), ps in sorted(plans.items()):
        print(f"{unit:7} {label:22} {len(ps)} plan(s): " + " || ".join(f"{len(v)}x [{p[:90]}{'...' if len(p) > 90 else ''}] {','.join(v)}"
                                                         for p, v in sorted(ps.items(), key=lambda kv: -len(kv[1]))))
