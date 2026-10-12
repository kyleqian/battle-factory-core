#!/usr/bin/env python3
"""stf115 (docs/stf115-struggle-declines.md): stg107Stage.py's 11 REAL forced-Struggle scenarios plus four Substitute-doll routes
(rung 2). Same lab envelope, lab seed pinned (stg107Stage.SEED), three complete legal members per side, no transient-state injection.
  psub   PP route, the Pressure target (Dusclops 362) knows Substitute x4 (the AI / FIGHT-first-slot picks it): T1 its doll goes up,
         T2.. Substitute fails (doll up); the struggler (Mean Look 212, 5 PP, faster) Struggles from T4 INTO THE DOLL (defender cell).
  tsub   Taunt route, the struggler is FASTER and knows Substitute x4: T1 Substitute (doll up), then the slower target's Taunt
         lands; T2 every move is power 0 -> Struggle BY A DOLL ATTACKER (the swap body cell); T3 Substitute fails, Taunt again; T4 Struggle.
usage: stf115Stage.py <out-dir>
"""
import json, sys
from pathlib import Path

sys.path.insert(0, "tools/integration")
import stg107Stage as G

DOLL_JOBS = [
    ("stf115-ply-psub-95-362", "player", 95, 362, "psub", "tttttt"),    # player Onix Struggle T4 / T5 into the opponent Dusclops's doll
    ("stf115-opp-psub-95-362", "opponent", 95, 362, "psub", "tttttt"),  # opponent Onix Struggle T4 / T5 into the player Dusclops's doll
    ("stf115-opp-psub-143-362", "opponent", 143, 362, "psub", "tttttt"),  # opponent Snorlax (no idle rest) T4 / T5 into the player Dusclops's doll
    ("stf115-ply-tsub-95-135", "player", 95, 135, "tsub", "tttttt"),    # player Onix (doll) Struggles T2 / T4 -> opponent Jolteon
    ("stf115-opp-tsub-143-95", "opponent", 143, 95, "tsub", "tttttt"),  # opponent Snorlax (doll) Struggles T2 / T4 -> player Onix
]


def scenario(job, profile: str) -> dict:
    ident, side, struggler, target, route, plan = job
    if route not in ("psub", "tsub"):
        return G.scenario(job, profile)
    data = G.scenario((ident, side, struggler, target, "pp" if route == "psub" else "taunt", plan), profile)
    other = "opponent" if side == "player" else "player"
    parties = data["overrides"]["parties"]
    if route == "psub":
        parties[other][0]["moves"] = [G.SUBSTITUTE] * 4
    else:
        s, t = parties[side][0], parties[other][0]
        speed_s = {k: s[k] for k in ("nature", "ivs", "evs")}
        s.update({k: t[k] for k in ("nature", "ivs", "evs")}); t.update(speed_s)  # struggler FAST, Taunt user SLOW
        s["moves"] = [G.SUBSTITUTE] * 4  # Taunt blocks it too (power 0); the AI has no other choice on T1
        t["moves"] = [G.TAUNT] * 4
    return data


if __name__ == "__main__":
    out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=False)
    jobs = G.JOBS + DOLL_JOBS
    for job in jobs:
        (out / f"{job[0]}.json").write_text(json.dumps(scenario(job, "battle-scene-on"), indent=1, sort_keys=True) + "\n")
    print(len(jobs), "scenarios")
