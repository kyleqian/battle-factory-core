#!/usr/bin/env python3
"""fix114 (docs/fix114-live-audit-defects.md): WIDENED scenarios for the three aud110 defects, built with aud110Stage.py's scenario() (stg107Stage
member / base / lab seed 305420349, INTERNAL species ids, EV totals 504 <= 510). Pictures (mon-pic-coords.json, 64 - 2 * yOffset): STEELIX back 64 /
front 64, WAILORD back 20, DIGLETT back 32 / front 28, MURKROW back 46, MIGHTYENA back 56; opponent front idle rests (speciesIdleAnim.ts): ONIX and
RATTATA x2 = 1 are the only non-zero ones.
  A Taunt:   opponent Taunter -> a big (STEELIX) and a small (DIGLETT) PLAYER target, and the reverse orientation on the same pictures
  B Harden:  both sides Harden x4 with an opponent RATTATA (the second non-zero rest) and a second ONIX pair
  C Swagger: a tall and a short attacker picture on EACH side (player STEELIX 64 / WAILORD 20, opponent STEELIX 64 / DIGLETT 28)
usage: fix114Stage.py <out-dir>"""
import json, sys
from pathlib import Path

sys.path.insert(0, "tools/integration")
import aud110Stage as A
import stg107Stage as G

JOBS = [  # id, mover side, mover species, other species, mover move, other move, turns (aud110Stage.scenario's shape)
    ("taunt-opp-198-208", "opponent", 198, 208, G.TAUNT, G.HARDEN, 3),  # opponent Murkrow -> BIG player Steelix (back 64)
    ("taunt-opp-287-50", "opponent", 287, 50, G.TAUNT, G.HARDEN, 3),    # opponent Mightyena -> SMALL player Diglett (back 32)
    ("taunt-ply-198-208", "player", 198, 208, G.TAUNT, G.HARDEN, 3),    # player Murkrow -> big opponent Steelix
    ("taunt-ply-287-50", "player", 287, 50, G.TAUNT, G.HARDEN, 3),      # player Mightyena -> small opponent Diglett
    ("harden-65-19", "player", 65, 19, G.HARDEN, G.HARDEN, 2),          # Alakazam / opponent RATTATA (rest x2 1)
    ("harden-208-95", "player", 208, 95, G.HARDEN, G.HARDEN, 2),        # Steelix / opponent ONIX (rest x2 1), second Onix pair
    ("swagger-ply-208-50", "player", 208, 50, 207, G.HARDEN, 2),        # player TALL Steelix (back 64)
    ("swagger-ply-314-208", "player", 314, 208, 207, G.HARDEN, 2),      # player SHORT Wailord (back 20)
    ("swagger-opp-208-50", "opponent", 208, 50, 207, G.HARDEN, 2),      # opponent TALL Steelix (front 64)
    ("swagger-opp-50-208", "opponent", 50, 208, 207, G.HARDEN, 2),      # opponent SHORT Diglett (front 28)
]

if __name__ == "__main__":
    out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=False)
    for job in JOBS:
        (out / f"fix114-{job[0]}.json").write_text(json.dumps(A.scenario(job), indent=1, sort_keys=True) + "\n")
    print(len(JOBS), "scenarios")
