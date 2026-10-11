#!/usr/bin/env python3
"""ret88: ReturnWeak dense-window scenarios (docs/ret88-return-weak.md): ret88Probe.py's jobs at lab seed 305420349 (both sides; Dragonair 148
/ Onix 95 = idle-rest target, Snorlax 143 / Golbat 42 = elevated target, Golbat 42 / Snorlax 143 = elevated attacker; the attacker lead at
friendship 0; two FIGHT turns = a first and a later Return body), renamed pb-ret88w-<side>-<attacker>-<defender> so audit20Fixtures.py
windows EVERY body. Every party member that knows Return is staged at friendship 0 (ret88Probe.py sets only the lead; the benched
members keep the base's 60 -- also power level 0 -- which ret88Rekey.py would reject as two values). usage: ret88WindowStage.py <out-dir>"""
import json, sys, tempfile
from pathlib import Path

sys.path.insert(0, "tools/integration")
import ret88Probe as R

out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=False)
with tempfile.TemporaryDirectory() as tmp:
    for job in R.JOBS:
        if not job[1].endswith("-s305420349"):
            continue
        name = job[1].replace("ret88-weak-", "pb-ret88w-").replace("-s305420349", "")
        data = json.loads(R.scenario(Path(tmp), job).read_text())
        for side in data["overrides"]["parties"].values():
            for m in side:
                if 216 in m["moves"]:
                    m["friendship"] = 0
        (out / f"{name}.json").write_text(json.dumps(data, indent=1, sort_keys=True) + "\n")
print(len(list(out.glob("*.json"))), "scenarios")
