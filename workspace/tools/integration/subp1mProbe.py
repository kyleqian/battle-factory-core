#!/usr/bin/env python3
"""subp1m: hpd2Probe variant. usage: subp1mProbe.py <scenario.json> <on|off> <output.json> <totalFrames> <pressFrame|never> [button A|B|START|RIGHT]
Keeps the scenario's first three trace segments (A, idle 18, A: Fight -> first move), then idles to pressFrame, holds <button> 2 frames, then idles to totalFrames.
Adds gBattleTypeFlags (`btf`, first row) and gTextFlags bytes (`tf`) to every row.
(hpd2: per-frame battle-engine RAM of a battle-lab scenario in a fresh direct mGBA process (docs/hpd1-hp-hold.md, hpd2 section).

usage: hpd2Probe.py <scenario.json> <on|off> <output.json> [maxFrames]
Per trace frame (frame 0 = after BattleLab.prepare): gBattleMainFunc (`main`), gBattlescriptCurrInstr (`ptr`), gBattleControllerExecFlags (`exec`),
gBattleCommunication[0..3] (`comm`), gCurrentActionFuncId (`act`), gBattlerControllerFuncs[0..1] (`ctl`), gAnimScriptActive (`anim`),
gBattleTypeFlags is not recorded. hpf2: also `hp` / `mhp` = gBattleMons[0..1].hp / maxHP.  Derived from sub183RomFrames.py; no screen capture.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) not in (6, 7) or sys.argv[2] not in ("on", "off"):
    raise SystemExit("usage: subp1mProbe.py <scenario> <on|off> <output.json> <totalFrames> <pressFrame|never> [button]")
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
    total = int(sys.argv[4])
    press = None if sys.argv[5] == "never" else int(sys.argv[5])
    button = sys.argv[6] if len(sys.argv) == 7 else "A"
    segs = raw_req["trace"]["segments"][:3]
    used = sum(x["frames"] for x in segs)
    if press is not None:
        segs.append({"frames": press - used, "buttons": []})
        segs.append({"frames": 2, "buttons": [button]})
        used = press + 2
    segs.append({"frames": total - used, "buttons": []})
    raw_req["trace"]["segments"] = segs
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
               "ctl": [u32(addr("gBattlerControllerFuncs") + 4 * i) for i in range(2)],
               "tf": [u8(0x03003014 + i) for i in range(4)], "hp": [u16(addr("gBattleMons") + 0x58 * i + 0x28) for i in range(2)], "mhp": [u16(addr("gBattleMons") + 0x58 * i + 0x2C) for i in range(2)]}
        rows.append(row)

    sample()
    limit = 1000000
    btf = u32(addr("gBattleTypeFlags"))
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            if frame >= limit:
                break
            oracle.advance(segment.get("buttons", []))
            frame += 1
            sample()
    OUTPUT.write_text(json.dumps({"schema": "hpd2-rom-ram/v1", "scenario": SCENARIO.name, "mode": MODE, "seed": request.get("seed"),
                                  "frameCount": frame, "btf": btf, "press": sys.argv[5], "button": button, "rows": rows}, separators=(",", ":")))


if __name__ == "__main__":
    main()
