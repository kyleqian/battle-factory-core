#!/usr/bin/env python3
"""doll90: the lab parties' personalities (RAM, fresh direct mGBA process; never the shared HTTP oracles).

usage: doll90Personality.py <scenario.json> <output.json>
After BattleLab.prepare (parties built from overrides.parties before CB2_InitBattle) reads gPlayerParty[0..2] / gEnemyParty[0..2]
BoxPokemon.personality (offset 0, struct Pokemon 100 bytes): the Double Team clone phase input (dt60: player back anim by nature) and
the shiny gate need it, and the attdoll fixtures carry none.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

SCENARIO, OUTPUT = Path(sys.argv[1]), Path(sys.argv[2])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(path for path in (ROOT, *ROOT.parents) if (path / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
ref = (ROOT / "reference/pokeemerald").resolve()
oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle/bootstrap/factory.json")
lab = BattleLab(oracle, "battle-scene-on")
lab.prepare(request)
nm = subprocess.run(["arm-none-eabi-nm", "-a", str(ref / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
names = {p[2]: int(p[0], 16) for line in nm.splitlines() if len(p := line.split()) == 3}
out = {side: [{"personality": oracle.read_u32(names[sym] + 100 * i), "otId": oracle.read_u32(names[sym] + 100 * i + 4)} for i in range(3)]
       for side, sym in (("player", "gPlayerParty"), ("opponent", "gEnemyParty"))}
OUTPUT.write_text(json.dumps({"schema": "doll90-personality/v1", "scenario": str(SCENARIO), **out}, indent=1) + "\n")
