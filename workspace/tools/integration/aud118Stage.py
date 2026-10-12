#!/usr/bin/env python3
"""aud118 (docs/aud118-live-audit-26.md): WIDENED forced-Struggle 165 scenarios, built with stg107Stage.py's scenario() / member() (lab seed
305420349 pinned, INTERNAL species ids, EV totals 504 <= 510, shiny off). Route "taunt": the FASTER side Taunts, the struggler (Harden x4) has no
usable move on T2 / T4 / T6 -> Struggle; every Struggle follows live Taunt / Harden bodies of the same battle (lend chains).
  pairs:   big STEELIX 208, small DIGLETT 50, elevated BUTTERFREE 12 / LEDIAN 166, WAILORD 314 (short back), RATTATA 19 / ONIX 95 (opponent rest x2 1)
  weather: the player GOLDUCK 55 (Taunt user, slot 2 Rain Dance 240) uses Rain Dance on T1 (plan "s" = slot 2): the opponent CASTFORM 385
           (Forecast, slot 0) turns rainy (CASTFORM_CHANGE), T2 Taunt, T3 / T5 the RAINY Castform struggles (rain lasts T1..T5).
           Plan "sbtttt": the move cursor remembers slot 2, so T2 goes back LEFT to Taunt (BACK_TURN).
           (KYOGRE / Drizzle is not stageable: production has no Kyogre battle pic, Factory never shows one.)
  KO:      player STEELIX's Struggle KOs the opponent SHEDINJA 303 (1 HP) -> the opponent's CHANSEY switches in, later bodies continue
           (the KO job's benches know Harden x4: TACKLE has no production live adapter, so a Tackle after the send-in cannot be rendered)
usage: aud118Stage.py <out-dir>"""
import json, sys
from pathlib import Path

sys.path.insert(0, "tools/integration")
import stg107Stage as G

JOBS = [  # stg107Stage.scenario's job shape: id, struggler side, struggler, target, route, player turn plan
    ("aud118-ply-208-12", "player", 208, 12, "taunt", "tttttt"),     # player BIG Steelix -> elevated opponent Butterfree
    ("aud118-opp-12-50", "opponent", 12, 50, "taunt", "tttttt"),     # elevated opponent Butterfree -> SMALL player Diglett
    ("aud118-ply-50-208", "player", 50, 208, "taunt", "tttttt"),     # SMALL player Diglett -> BIG opponent Steelix
    ("aud118-opp-208-314", "opponent", 208, 314, "taunt", "tttttt"), # BIG opponent Steelix -> player Wailord (short back)
    ("aud118-ply-65-19", "player", 65, 19, "taunt", "tttttt"),       # player Alakazam -> opponent RATTATA (front idle rest x2 1)
    ("aud118-opp-166-65", "opponent", 166, 65, "taunt", "tttttt"),   # elevated opponent Ledian -> player Alakazam
    ("aud118-opp-385-55-rain", "opponent", 385, 55, "taunt", "sbtttt"),  # opponent RAINY Castform -> player Golduck (T1 Rain Dance)
    ("aud118-ply-50-95", "player", 50, 95, "taunt", "tttttt"),       # SMALL player Diglett -> opponent ONIX (front idle rest x2 1)
    ("aud118-ply-208-303", "player", 208, 303, "taunt", "tttttt"),   # player Steelix Struggle KOs Shedinja -> Chansey switch-in
]

if __name__ == "__main__":
    out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=False)
    for job in JOBS:
        d = G.scenario(job, "battle-scene-on")
        parties = d["overrides"]["parties"]
        if job[0].endswith("-rain"):  # the player Taunt user's slot 2 (SUB_TURN's RIGHT) = Rain Dance
            parties["player"][0]["moves"] = [G.TAUNT, 240, G.TAUNT, G.TAUNT]
        if job[0].endswith("-303"):  # benches Harden x4 (every body after the send-in has a production live adapter)
            for side in ("player", "opponent"):
                for m in parties[side][1:]:
                    m["moves"] = [G.HARDEN] * 4
        (out / f"{job[0]}.json").write_text(json.dumps(d, indent=1, sort_keys=True) + "\n")
    print(len(JOBS), "scenarios")
