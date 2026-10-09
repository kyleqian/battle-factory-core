#!/usr/bin/env python3
"""Live audit 16 (S10A side lane): CHAIN scenarios for the routes that became live THIS SESSION — a UNIT whose history today's folds
made lend a known allocator / order host (alloc50 + alloc52 net-zero status animations and move bodies; plans51 Outrage), then a CONSUMER
(a live adapter) on the other side; plus no-unit CONTROLS (the unit replaced by Counter: fails against a non-physical consumer, no body)
and the ISSUES #152 ARBOK -> CATERPIE field with a non-Blizzard first-body move.

usage: audit16Stage.py <out-dir>     (writes <out-dir>/<name>.json; the committed set is tools/integration/fixtures/audit-16/scenarios/)
Base: tools/battle-lab/prep18-return-altopp-snorlax-golem.json (battle-lab mechanicLab, Scene ON, explicit lab seed 305420349 kept in every
scenario: ISSUES #154). Leads as in audit 15: the UNIT side is SNORLAX (speed 50, faster), the CONSUMER side CHANSEY (speed 49); one move
x4, items 0. CYCLES prompt cycles per scenario (5 when the unit's status keeps the consumer from moving for several turns).
"""
import json, sys
from pathlib import Path

BASE = json.loads(Path("tools/battle-lab/prep18-return-altopp-snorlax-golem.json").read_text())
OUT = Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
MOVES = {"CONFUSE_RAY": 109, "SPORE": 147, "THUNDER_WAVE": 86, "SLUDGE_BOMB": 188, "WILL_O_WISP": 261, "SEISMIC_TOSS": 69, "ICE_BALL": 301,
         "FUTURE_SIGHT": 248, "PURSUIT": 228, "PERISH_SONG": 195, "OUTRAGE": 200, "COUNTER": 68, "LIGHT_SCREEN": 113, "REFLECT": 115,
         "PROTECT": 182, "THUNDERBOLT": 85, "ICE_BEAM": 58, "DOUBLE_TEAM": 104, "SWIFT": 129, "BLIZZARD": 59, "SIGNAL_BEAM": 324, "BONEMERANG": 155, "SUNNY_DAY": 241}
# name: (unit move, consumer move, consumer side, prompt cycles)
CHAINS = {
    # priority 1: a status animation (infliction and / or the afflicted battler's move attempt) -> allocator consumer
    "conf-light-screen-ply": ("CONFUSE_RAY", "LIGHT_SCREEN", "player", 3),
    "conf-light-screen-opp": ("CONFUSE_RAY", "LIGHT_SCREEN", "opponent", 3),
    "conf-reflect-ply": ("CONFUSE_RAY", "REFLECT", "player", 3),
    "conf-reflect-opp": ("CONFUSE_RAY", "REFLECT", "opponent", 3),
    "conf-protect-ply": ("CONFUSE_RAY", "PROTECT", "player", 4),
    "slp-light-screen-ply": ("SPORE", "LIGHT_SCREEN", "player", 6),
    "slp-light-screen-opp": ("SPORE", "LIGHT_SCREEN", "opponent", 6),
    "slp-reflect-ply": ("SPORE", "REFLECT", "player", 6),
    "slp-protect-ply": ("SPORE", "PROTECT", "player", 6),
    "prz-light-screen-ply": ("THUNDER_WAVE", "LIGHT_SCREEN", "player", 3),
    "prz-light-screen-opp": ("THUNDER_WAVE", "LIGHT_SCREEN", "opponent", 3),
    "prz-reflect-ply": ("THUNDER_WAVE", "REFLECT", "player", 3),
    "prz-protect-ply": ("THUNDER_WAVE", "PROTECT", "player", 4),
    "psn-light-screen-ply": ("SLUDGE_BOMB", "LIGHT_SCREEN", "player", 5),
    "psn-reflect-ply": ("SLUDGE_BOMB", "REFLECT", "player", 5),
    "brn-light-screen-opp": ("WILL_O_WISP", "LIGHT_SCREEN", "opponent", 3),
    "frz-light-screen-ply": ("ICE_BEAM", "LIGHT_SCREEN", "player", 6),
    "frz-reflect-ply": ("ICE_BEAM", "REFLECT", "player", 6),
    "psn-protect-ply": ("SLUDGE_BOMB", "PROTECT", "player", 5),
    "brn-reflect-ply": ("WILL_O_WISP", "REFLECT", "player", 3),
    # priority 2: prep52's newly net-zero bodies -> allocator consumer
    "seismic-toss-light-screen-ply": ("SEISMIC_TOSS", "LIGHT_SCREEN", "player", 3),
    "seismic-toss-light-screen-opp": ("SEISMIC_TOSS", "LIGHT_SCREEN", "opponent", 3),
    "seismic-toss-reflect-ply": ("SEISMIC_TOSS", "REFLECT", "player", 3),
    "seismic-toss-protect-ply": ("SEISMIC_TOSS", "PROTECT", "player", 4),
    "ice-ball-light-screen-ply": ("ICE_BALL", "LIGHT_SCREEN", "player", 4),
    "ice-ball-reflect-ply": ("ICE_BALL", "REFLECT", "player", 4),
    "future-sight-light-screen-ply": ("FUTURE_SIGHT", "LIGHT_SCREEN", "player", 5),
    "future-sight-reflect-ply": ("FUTURE_SIGHT", "REFLECT", "player", 5),
    "future-sight-light-screen-opp": ("FUTURE_SIGHT", "LIGHT_SCREEN", "opponent", 5),
    # the delayed hit General_FutureSightHit (end of turn 3) -> a consumer that repeats every turn
    "future-sight-protect-ply": ("FUTURE_SIGHT", "PROTECT", "player", 5),
    "future-sight-thunderbolt-ply": ("FUTURE_SIGHT", "THUNDERBOLT", "player", 5),
    "future-sight-thunderbolt-opp": ("FUTURE_SIGHT", "THUNDERBOLT", "opponent", 5),
    "pursuit-light-screen-ply": ("PURSUIT", "LIGHT_SCREEN", "player", 3),
    "pursuit-reflect-ply": ("PURSUIT", "REFLECT", "player", 3),
    "perish-song-light-screen-ply": ("PERISH_SONG", "LIGHT_SCREEN", "player", 3),
    "perish-song-reflect-ply": ("PERISH_SONG", "REFLECT", "player", 3),
    # priority 3: plans51 Outrage (EXACT order unit) -> order consumers
    "outrage-thunderbolt-ply": ("OUTRAGE", "THUNDERBOLT", "player", 4),
    "outrage-thunderbolt-opp": ("OUTRAGE", "THUNDERBOLT", "opponent", 4),
    "outrage-ice-beam-ply": ("OUTRAGE", "ICE_BEAM", "player", 4),
    "outrage-double-team-ply": ("OUTRAGE", "DOUBLE_TEAM", "player", 4),
    "outrage-double-team-opp": ("OUTRAGE", "DOUBLE_TEAM", "opponent", 4),
    # no-unit controls: the consumer is the battle's first body
    "ctl-light-screen-ply": ("COUNTER", "LIGHT_SCREEN", "player", 2),
    "ctl-light-screen-opp": ("COUNTER", "LIGHT_SCREEN", "opponent", 2),
    "ctl-reflect-ply": ("COUNTER", "REFLECT", "player", 2),
    "ctl-reflect-opp": ("COUNTER", "REFLECT", "opponent", 2),
    "ctl-protect-ply": ("COUNTER", "PROTECT", "player", 2),
    "ctl-thunderbolt-ply": ("COUNTER", "THUNDERBOLT", "player", 2),
    "ctl-thunderbolt-opp": ("COUNTER", "THUNDERBOLT", "opponent", 2),
    "ctl-ice-beam-ply": ("COUNTER", "ICE_BEAM", "player", 2),
    "ctl-double-team-ply": ("COUNTER", "DOUBLE_TEAM", "player", 2),
    "ctl-double-team-opp": ("COUNTER", "DOUBLE_TEAM", "opponent", 2),
}


# lab seeds picked by audit16Sweep.py (seeds 1..24): the first seed whose ROM route puts the chance-based status animation before the consumer
# (Sludge Bomb PSN 30 %, Ice Beam FRZ 10 %). A sleeping opponent CHANSEY was switched out by the AI on every swept seed (not staged).
SEEDS = {"psn-light-screen-ply": 1, "psn-reflect-ply": 1, "psn-protect-ply": 3, "frz-light-screen-ply": 3, "frz-reflect-ply": 3}


def lead(member: dict, species: int, move: int, fast: bool) -> dict:
    m = json.loads(json.dumps(member))
    m.update({"species": species, "moves": [move] * 4, "item": 0, "nature": 3 if fast else 7, "friendship": 70,
              "gender": "male" if fast else "female"})  # CHANSEY is female-only
    m["ivs"]["speed"] = 31 if fast else 0
    m["evs"]["speed"] = 0
    return m


def trace(cycles: int) -> dict:
    seg = []
    for _ in range(cycles):
        seg += [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": 1300, "buttons": []}]
    return {"segments": seg}


for name, (unit, consumer, side, cycles) in CHAINS.items():
    s = json.loads(json.dumps(BASE))
    other = "opponent" if side == "player" else "player"
    parties = s["overrides"]["parties"]
    parties[other][0] = lead(parties[other][0], 143, MOVES[unit], True)   # SNORLAX: the unit side, faster
    parties[side][0] = lead(parties[side][0], 113, MOVES[consumer], False)  # CHANSEY: the consumer side
    for p in ("player", "opponent"):
        for m in parties[p][1:]:
            m["item"] = 0
    s["trace"] = trace(cycles)
    assert s["seed"] == 305420349
    s["seed"] = SEEDS.get(name, s["seed"])
    (OUT / f"{name}.json").write_text(json.dumps(s, indent=1) + "\n")
# priority 4 (later58): Signal Beam / Bonemerang (SNORLAX, faster) at LATER bodies after a CHANSEY predecessor OUTSIDE later58's probe set
# (Quick Attack / Growl / Splash / own body): Thunder Wave + its PRZ animation (a status move), Double Team + stat (a stat boost), Sunny Day
# (a weather move). Here the SNORLAX move is the consumer (audit16Fixtures.py LATER); "side" = SNORLAX's side.
LATER = {}
for move, tag in (("SIGNAL_BEAM", "signal-beam"), ("BONEMERANG", "bonemerang")):
    for pred, ptag in (("THUNDER_WAVE", "prz"), ("DOUBLE_TEAM", "dt"), ("SUNNY_DAY", "sunny")):
        for side, stag in (("player", "ply"), ("opponent", "opp")):
            LATER[f"later-{tag}-{ptag}-{stag}"] = (move, pred, side)
for name, (move, pred, side) in LATER.items():
    s = json.loads(json.dumps(BASE))
    other = "opponent" if side == "player" else "player"
    parties = s["overrides"]["parties"]
    parties[side][0] = lead(parties[side][0], 143, MOVES[move], True)    # SNORLAX: the later-body move, faster
    parties[other][0] = lead(parties[other][0], 113, MOVES[pred], False)  # CHANSEY: the predecessor
    for p in ("player", "opponent"):
        for m in parties[p][1:]:
            m["item"] = 0
    s["trace"] = trace(3)
    assert s["seed"] == 305420349
    (OUT / f"{name}.json").write_text(json.dumps(s, indent=1) + "\n")
# ISSUES #152: the ARBOK -> CATERPIE geoice control field (tools/integration/fixtures/geoice/controls/scenarios/, lab seed 305419897) with
# ARBOK's Blizzard x4 replaced by another first-body live adapter; CATERPIE (Tackle, speed 0) moves second, so ARBOK's body is the first.
G = json.loads(Path("tools/integration/fixtures/geoice/controls/scenarios/blizzard-opponent-arbok-caterpie.json").read_text())
for name, move in (("i152-arbok-double-team", "DOUBLE_TEAM"), ("i152-arbok-thunderbolt", "THUNDERBOLT"), ("i152-arbok-swift", "SWIFT"),
                   ("i152-arbok-blizzard", "BLIZZARD")):  # Blizzard itself through this audit's fixture path (ROM personality / HP)
    s = json.loads(json.dumps(G))
    s["overrides"]["parties"]["opponent"][0]["moves"] = [MOVES[move]] * 4
    s["trace"] = trace(1) if move != "BLIZZARD" else G["trace"]
    assert s["seed"] == 305419897
    (OUT / f"{name}.json").write_text(json.dumps(s, indent=1) + "\n")
print("\n".join(sorted(p.name for p in OUT.glob("*.json"))))
