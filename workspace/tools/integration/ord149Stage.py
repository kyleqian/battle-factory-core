#!/usr/bin/env python3
"""ord149 (docs/ord149-astonish-extrasensory.md) window routes: the windows AFTER an Astonish 310 body through the production live renderer
(ord124Stage.py's shape). plans69Probe.scenario's lab envelope (lab seed pinned); the attacker knows only Astonish, the defender only a
Factory-live move (Harden 106 / Mega Punch 5), three turns: every defender window and every later body follows an Astonish body.
usage: ord149Stage.py <out-dir>   (writes <id>.json lab scenarios; audit20Probes.py takes them as pb-<id>.json)"""
import sys
from pathlib import Path

sys.path.insert(0, "tools/integration")
import plans69Probe as P69

SIDES = (("player", "opponent", "ply"), ("opponent", "player", "opp"))
JOBS = []
for side, other, tag in SIDES:
    for a, d, dmv, seed in ((371, 95, 106, 7), (143, 42, 5, 11), (42, 143, 106, 0)):
        JOBS.append(("as", f"ord149-was-{tag}-{a}-{d}-{dmv}-s{seed}", 310, P69.base("astonish", side, "loudred"),
                     (("species", side, a), ("species", other, d), ("moves", side, 310), ("moves", other, dmv), ("seed", seed), ("turns", 2))))

if __name__ == "__main__":
    out = Path(sys.argv[1])
    for job in JOBS:
        src = P69.scenario(out, job)
        (out / f"{job[1]}.json").write_text(src.read_text())
    print(len(JOBS), "scenarios")
