#!/usr/bin/env python3
"""hpd2: per-frame battle-engine RAM of a battle-lab scenario in a fresh direct mGBA process (docs/hpd1-hp-hold.md, hpd2 section).

usage: hpd2Probe.py <scenario.json> <on|off> <output.json> [maxFrames]
Per trace frame (frame 0 = after BattleLab.prepare): gBattleMainFunc (`main`), gBattlescriptCurrInstr (`ptr`), gBattleControllerExecFlags (`exec`),
gBattleCommunication[0..3] (`comm`), gCurrentActionFuncId (`act`), gBattlerControllerFuncs[0..1] (`ctl`), gAnimScriptActive (`anim`),
gBattleTypeFlags is not recorded.  Derived from sub183RomFrames.py; no screen capture.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) not in (4, 5) or sys.argv[2] not in ("on", "off"):
    raise SystemExit("usage: hpd2Probe.py <scenario> <on|off> <output.json> [maxFrames]")
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
    lab.prepare(request)
    sy = oracle.symbols
    addr = lambda n: sy[n]
    ptr_a, act_a, exec_a = addr("gBattlescriptCurrInstr"), addr("gAnimScriptActive"), addr("gBattleControllerExecFlags")
    mv_a, atk_a = addr("gCurrentMove"), addr("gBattlerAttacker")
    u8, u16, u32 = oracle.read_u8, oracle.read_u16, oracle.read_u32
    rows = []
    frame = 0

    def sample() -> None:
        row = {"f": frame, "main": u32(addr("gBattleMainFunc")), "ptr": u32(ptr_a), "exec": u32(exec_a), "anim": u8(act_a),
               "comm": [u8(addr("gBattleCommunication") + i) for i in range(4)], "act": u8(addr("gCurrentActionFuncId")),
               "ctl": [u32(addr("gBattlerControllerFuncs") + 4 * i) for i in range(2)]}
        rows.append(row)

    sample()
    limit = int(sys.argv[4]) if len(sys.argv) == 5 else 1000000
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            if frame >= limit:
                break
            oracle.advance(segment.get("buttons", []))
            frame += 1
            sample()
    OUTPUT.write_text(json.dumps({"schema": "hpd2-rom-ram/v1", "scenario": SCENARIO.name, "mode": MODE, "seed": request.get("seed"),
                                  "frameCount": frame, "rows": rows}, separators=(",", ":")))


if __name__ == "__main__":
    main()
