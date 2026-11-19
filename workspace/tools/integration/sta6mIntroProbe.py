#!/usr/bin/env python3
"""sta6m: per-frame battle-engine RAM across a battle lab's PREPARE route (the battle-start intro, where the switch-in ability scripts run).

usage: sta6mIntroProbe.py <scenario.json> <on|off> <output.json>
Frame numbers are absolute (0 == after new_session(), the `preCheckpointFrameOffset` coordinate of the intro traces). Per frame: gBattleMainFunc (`main`),
gBattlescriptCurrInstr (`ptr`), gBattleControllerExecFlags (`exec`), gAnimScriptActive (`anim`), gBattleCommunication[0..3] (`comm`). Also `player` /
`opponent` = the ROM's real party records (personality, ability slot) after prepare, to build an app stage with the same personalities.
Derived from hpd2Probe.py; the battle-lab route itself is unchanged (oracle.advance is wrapped, not replaced).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) != 4 or sys.argv[2] not in ("on", "off"):
    raise SystemExit("usage: sta6mIntroProbe.py <scenario> <on|off> <output.json>")
SCENARIO, MODE, OUTPUT = Path(sys.argv[1]), sys.argv[2], Path(sys.argv[3])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(path for path in (ROOT, *ROOT.parents) if (path / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

PROFILE = {"on": "battle-scene-on", "off": "battle-scene-off"}[MODE]
BOOT = {"on": "factory.json", "off": "factory-battle-scene-off.json"}[MODE]


def main() -> None:
    raw_req = json.loads(SCENARIO.read_text())
    raw_req["profile"] = PROFILE
    request = validate_request(raw_req, PROFILE)
    ref = (ROOT / "reference/pokeemerald").resolve()
    oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle/bootstrap" / BOOT)
    lab = BattleLab(oracle, PROFILE)
    sy = oracle.symbols
    u8, u32 = oracle.read_u8, oracle.read_u32
    rows = []
    real_advance = oracle.advance

    def sample() -> None:
        rows.append({"f": oracle.frame, "main": u32(sy["gBattleMainFunc"]), "ptr": u32(sy["gBattlescriptCurrInstr"]),
                     "exec": u32(sy["gBattleControllerExecFlags"]), "anim": u8(sy["gAnimScriptActive"]),
                     "comm": [u8(sy["gBattleCommunication"] + i) for i in range(4)]})

    def wrapped(buttons):
        real_advance(buttons)
        sample()

    oracle.advance = wrapped
    descriptor = lab.prepare(request)
    oracle.advance = real_advance
    parties = {side: [{k: mon.get(k) for k in ("species", "personality", "abilitySlot", "ability", "level", "moves", "item")}
                      for mon in lab._party(side)] for side in ("player", "opponent")}
    OUTPUT.write_text(json.dumps({"schema": "sta6m-intro-ram/v1", "scenario": SCENARIO.name, "mode": MODE, "frameCount": len(rows),
                                  "parties": parties, "rows": rows}, separators=(",", ":")))


if __name__ == "__main__":
    main()
