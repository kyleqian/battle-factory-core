#!/usr/bin/env python3
"""plans69: raw sSpriteOrder probe rows (plans69Probe.py) -> compact unit receipts (pure python3, no mGBA).

usage (from workspace/): plans69Extract.py <out-dir> <units.json>
prep43Extract's unit split and plan encoding driven by plans69Probe.JOBS (run A == run B byte-identical required), as plans51Extract.
Move bodies are `body <mv>:<attacker side>`. In the CASTFORM_CHANGE jobs the first mv-0 unit after the weather move's body is labelled
`general CASTFORM_CHANGE` (BattleScript_CastformChange follows the weather message; the end-turn *_CONTINUES units come later), every
other mv-0 unit `general mv-0`. Magnitude bodies carry the ROM gAnimMovePower (plans69PowerProbe.py) and are labelled
`body 222:<side> power>99` / `power<=99` (Move_MAGNITUDE's AnimTask_IsPowerOver99 branch). The SPEED_BOOST jobs' mv-0 units are
`general STATS_CHANGE (Speed Boost)`. Prints, per label, the distinct observed plans and their instance counts.
"""
import hashlib, json, sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, "tools/integration")
import prep43Extract as X
import plans69Probe as J

X.J = J

if __name__ == "__main__":
    OUT = Path(sys.argv[1])
    X.OUT = OUT
    result = {"schema": "plans69-units/v1", "jobs": {}}
    for unit, job, move, base, ops in J.JOBS:
        a, b = OUT / "raw" / f"{job}-A.json", OUT / "raw" / f"{job}-B.json"
        if not a.exists():
            continue
        same = b.exists() and a.read_bytes() == b.read_bytes()
        rows = hashlib.sha256(json.dumps(json.loads(a.read_text())["rows"], separators=(",", ":")).encode()).hexdigest()
        entry = {"unit": unit, "move": move, "base": base, "ops": [list(o) for o in ops] if ops else None, "rowsSha256A": rows, "identicalAB": same}
        entry.update(X.units_of(job, a))
        if unit == "CASTFORM_CHANGE":
            seen_weather = False
            for u in entry["units"]:
                if u["kind"] != "body":
                    continue
                if u["label"].startswith(f"body {move}:"):
                    seen_weather = True
                elif u["label"] == "mv-0":
                    u["label"] = "general CASTFORM_CHANGE" if seen_weather else "general mv-0"
                    seen_weather = False
        if unit == "SPEED_BOOST":  # the only general animation of these jobs: BattleScript_SpeedBoostActivates' B_ANIM_STATS_CHANGE
            for u in entry["units"]:
                if u["kind"] == "body" and u["label"] == "mv-0":
                    u["label"] = "general STATS_CHANGE (Speed Boost)"
        if unit == "MAGNITUDE":  # gAnimMovePower per body start (plans69PowerProbe.py; A == B required), joined on the frame counter
            pa, pb = OUT / "power" / f"{job}-A.json", OUT / "power" / f"{job}-B.json"
            power = {b["n"]: b["power"] for b in json.loads(pa.read_text())["bodies"]} if pa.exists() else {}
            entry["powerIdenticalAB"] = pa.exists() and pb.exists() and pa.read_bytes() == pb.read_bytes()
            for u in entry["units"]:
                if u["kind"] == "body" and u["label"].startswith("body 222:"):
                    u["power"] = power.get(u["frame"])
                    u["label"] += " power>99" if u["power"] is not None and u["power"] > 99 else " power<=99" if u["power"] is not None else " power?"
        result["jobs"][job] = entry
    Path(sys.argv[2]).write_text(json.dumps(result, separators=(",", ":"), sort_keys=True) + "\n")
    print(len(result["jobs"]), "jobs;", sum(not j["identicalAB"] or not j.get("powerIdenticalAB", True) for j in result["jobs"].values()), "A/B differ")
    plans = defaultdict(lambda: defaultdict(list))
    for name, j in result["jobs"].items():
        for u in j["units"]:
            if u["kind"] == "body" and not u["truncated"]:
                plans[(j["unit"], u["label"])][u["plan"]].append(name)
    for (unit, label), ps in sorted(plans.items()):
        print(f"{unit:15} {label:24} {len(ps)} plan(s): " + " || ".join(f"{len(v)}x [{p[:110]}{'...' if len(p) > 110 else ''}] {','.join(v)}" for p, v in sorted(ps.items(), key=lambda kv: -len(kv[1]))))
