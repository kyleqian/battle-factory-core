#!/usr/bin/env python3
"""land75: Scene ON lab scenarios for the two wall routes hist73 turns exact (liveWallMoveAdapters.test.ts seeds 10 / 260, Factory
streak 0, slot 0), reproducing each route's body history before the wall body with the route's species (internal ids):
  wall10-*   route seed 10: player YANMA Signal Beam 324 -> foe DROWZEE Barrier 112 (same turn). `-opp` is the route orientation
             (YANMA fast on the player side); `-ply` swaps the sides (DROWZEE's Barrier on the player side).
  wall260-*  route seed 260: foe SPOINK Psywave 149, player CLAMPERL Dive 291 (setup), next turn foe SPOINK Magic Coat 277 (priority +4)
             at the hidden diver. SPOINK knows [PSYWAVE, MAGIC_COAT, MAGIC_COAT, MAGIC_COAT]: the Factory AI picks with the pinned lab
             seed; `-s<seed>` variants are the sweep (land75Fixtures.py keeps the ones whose ROM history equals the route's).
audit18Stage.py's lead() / trace() / base (tools/battle-lab/prep18-return-altopp-snorlax-golem.json); every scenario pins an explicit
lab seed (ISSUES #154).
usage: land75Stage.py <out-dir>
"""
import json, sys
from pathlib import Path

OUT = Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
BASE = json.loads(Path("tools/battle-lab/prep18-return-altopp-snorlax-golem.json").read_text())
SP = {"YANMA": 193, "DROWZEE": 96, "SPOINK": 351, "CLAMPERL": 373}
SIGNAL_BEAM, BARRIER, PSYWAVE, MAGIC_COAT, DIVE = 324, 112, 149, 277, 291
SEEDS_260 = [305420349, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]


def lead(member: dict, species: int, moves: list[int], fast: bool) -> dict:
    m = json.loads(json.dumps(member))
    m.update({"species": species, "moves": moves, "item": 0, "nature": 3 if fast else 7, "friendship": 70,
              "gender": "male" if fast else "female"})
    m["ivs"]["speed"] = 31 if fast else 0
    m["evs"]["speed"] = 0
    return m


def trace(cycles: int) -> dict:
    seg = []
    for _ in range(cycles):
        seg += [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": 1300, "buttons": []}]
    return {"segments": seg}


def stage(name: str, fast: tuple[str, list[int]], slow: tuple[str, list[int]], slow_side: str, cycles: int, seed: int) -> None:
    s = json.loads(json.dumps(BASE))
    fast_side = "opponent" if slow_side == "player" else "player"
    parties = s["overrides"]["parties"]
    parties[fast_side][0] = lead(parties[fast_side][0], SP[fast[0]], fast[1], True)
    parties[slow_side][0] = lead(parties[slow_side][0], SP[slow[0]], slow[1], False)
    for p in ("player", "opponent"):
        for m in parties[p][1:]:
            m["item"] = 0
    s["trace"] = trace(cycles)
    s["seed"] = seed
    (OUT / f"{name}.json").write_text(json.dumps(s, indent=1) + "\n")


stage("wall10-yanma-drowzee-barrier-opp", ("YANMA", [SIGNAL_BEAM] * 4), ("DROWZEE", [BARRIER] * 4), "opponent", 2, 305420349)
stage("wall10-yanma-drowzee-barrier-ply", ("YANMA", [SIGNAL_BEAM] * 4), ("DROWZEE", [BARRIER] * 4), "player", 2, 305420349)
for seed in SEEDS_260:
    stage(f"wall260-spoink-clamperl-magic-coat-opp-s{seed}", ("SPOINK", [PSYWAVE, MAGIC_COAT, MAGIC_COAT, MAGIC_COAT]),
          ("CLAMPERL", [DIVE] * 4), "player", 2, seed)
print("\n".join(sorted(p.name for p in OUT.glob("*.json"))))
