#!/usr/bin/env python3
"""aud110 (docs/aud110-live-audit-25.md): WIDENED scenarios for the live Taunt 269 / Harden 106 bodies and the other live bodies those routes
exercise (Mean Look 212, Substitute 164, Swagger 207), built with stg107Stage.py's member() / base / seed (lab seed pinned, species are
INTERNAL ids, EV totals 504 <= 510). Real routes, no injected state: the mover has four identical slots, the other side four Harden.
  taunt-<side>-<taunter>-<target>: the FASTER side Taunts (first body T1, later body T3: the target's Taunt timer expires), the target's
                                   Harden fails while taunted (power 0), so Taunt / Harden bodies mix with the "can't use" messages
  harden-<a>-<b>:  both sides Harden x4 (player faster): two Harden bodies per turn, first and later, both orientations
  mean-look / substitute / swagger: <side> uses its move x4 (faster) against a Harden x4 target
usage: aud110Stage.py <out-dir>"""
import json, sys
from pathlib import Path

sys.path.insert(0, "tools/integration")
import stg107Stage as G

JOBS = [  # id, mover side, mover species, other species, mover move, other move, turns
    ("taunt-ply-99-169", "player", 99, 169, G.TAUNT, G.HARDEN, 3),     # player Kingler -> elevated opponent Crobat
    ("taunt-ply-65-143", "player", 65, 143, G.TAUNT, G.HARDEN, 3),     # player Alakazam -> big-picture opponent Snorlax
    ("taunt-ply-93-95", "player", 93, 95, G.TAUNT, G.HARDEN, 3),       # player Haunter -> opponent Onix
    ("taunt-opp-169-99", "opponent", 169, 99, G.TAUNT, G.HARDEN, 3),   # elevated opponent Crobat -> player Kingler
    ("taunt-opp-362-213", "opponent", 362, 213, G.TAUNT, G.HARDEN, 3), # opponent Dusclops -> player Shuckle
    ("taunt-opp-95-42", "opponent", 95, 42, G.TAUNT, G.HARDEN, 3),     # big opponent Onix -> player Golbat
    ("harden-99-169", "player", 99, 169, G.HARDEN, G.HARDEN, 2),       # Kingler (player) / Crobat (elevated opponent)
    ("harden-143-362", "player", 143, 362, G.HARDEN, G.HARDEN, 2),     # Snorlax (player, big) / Dusclops
    ("harden-93-95", "player", 93, 95, G.HARDEN, G.HARDEN, 2),         # Haunter / Onix
    ("meanlook-ply-65-143", "player", 65, 143, G.MEAN_LOOK, G.HARDEN, 2),
    ("meanlook-opp-169-99", "opponent", 169, 99, G.MEAN_LOOK, G.HARDEN, 2),
    ("substitute-ply-99-169", "player", 99, 169, G.SUBSTITUTE, G.HARDEN, 2),
    ("substitute-opp-362-213", "opponent", 362, 213, G.SUBSTITUTE, G.HARDEN, 2),
    ("swagger-ply-65-143", "player", 65, 143, 207, G.HARDEN, 2),
    ("swagger-opp-169-99", "opponent", 169, 99, 207, G.HARDEN, 2),
]


def scenario(job) -> dict:
    ident, side, mover, other, mv, ov, turns = job
    oside = "opponent" if side == "player" else "player"
    data = json.loads(G.BASE.read_text())
    data["profile"] = "battle-scene-on"
    data["seed"] = G.SEED
    fast, slow = G.FAST, G.SLOW
    if ident.startswith("harden"):  # player is faster in the both-Harden battles
        mover_speed, other_speed = (fast, slow) if side == "player" else (slow, fast)
    else:
        mover_speed, other_speed = fast, slow
    bench = [G.member(113, [G.TACKLE] * 4, slow), G.member(95, [G.TACKLE] * 4, slow)]
    data["overrides"] = {"parties": {side: [G.member(mover, [mv] * 4, mover_speed)] + bench,
                                     oside: [G.member(other, [ov] * 4, other_speed)] + json.loads(json.dumps(bench))}}
    segs = []
    for _ in range(turns):
        segs += G.TURN
    segs.append({"frames": 600, "buttons": []})
    data["trace"] = {"segments": json.loads(json.dumps(segs))}
    return data


if __name__ == "__main__":
    out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=False)
    for job in JOBS:
        (out / f"aud110-{job[0]}.json").write_text(json.dumps(scenario(job), indent=1, sort_keys=True) + "\n")
    print(len(JOBS), "scenarios")
