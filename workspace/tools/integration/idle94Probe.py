#!/usr/bin/env python3
"""idle94: one battle-lab scenario in a fresh direct mGBA process (never the shared HTTP oracles), Scene ON or Scene OFF.

usage: idle94Probe.py <scenario.json> <on|off> <output.json>
Per trace frame (frame 0 = after BattleLab.prepare, frame n = after n trace frames): gBattlescriptCurrInstr (`ptr`),
gAnimScriptActive (`act`), gBattleControllerExecFlags (`exec`), gCurrentMove (`mv`), gBattlerAttacker (`atk`), the screen sha256[:16] (raw RGB888, `scr`), OAM / palette RAM sha
(`oam` / `pal`) and the BG / window / blend IO registers (`io`, only stored when they change). The profile picks the oracle
bootstrap exactly as oracle/server.py does (factory.json = Scene ON, factory-battle-scene-off.json = Scene OFF); the scenario's own
"profile" field is overridden, nothing else (its explicit lab "seed" stays).
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

if len(sys.argv) != 4 or sys.argv[2] not in ("on", "off"):
    raise SystemExit("usage: idle94Probe.py <scenario> <on|off> <output.json>")
SCENARIO, MODE, OUTPUT = Path(sys.argv[1]), sys.argv[2], Path(sys.argv[3])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(path for path in (ROOT, *ROOT.parents) if (path / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

PROFILE = {"on": "battle-scene-on", "off": "battle-scene-off"}[MODE]
BOOT = {"on": "factory.json", "off": "factory-battle-scene-off.json"}[MODE]
IO = {"dispcnt": 0x04000000, "bg0cnt": 0x04000008, "bg1cnt": 0x0400000A, "bg2cnt": 0x0400000C, "bg3cnt": 0x0400000E,
      "bg1hofs": 0x04000014, "bg1vofs": 0x04000016, "bg2hofs": 0x04000018, "bg2vofs": 0x0400001A, "bg3hofs": 0x0400001C, "bg3vofs": 0x0400001E,
      "win0h": 0x04000040, "win0v": 0x04000044, "winin": 0x04000048, "winout": 0x0400004A,
      "bldcnt": 0x04000050, "bldalpha": 0x04000052, "bldy": 0x04000054}


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
    blk = lambda a, n: hashlib.sha256(bytes(u8(a + i) for i in range(n))).hexdigest()[:12]
    rows, last_io = [], None
    frame = 0

    def sample() -> None:
        nonlocal last_io
        io = {k: u16(a) for k, a in IO.items()}
        row = {"f": frame, "ptr": u32(ptr_a), "act": u8(act_a), "exec": u32(exec_a), "mv": u16(mv_a), "atk": u8(atk_a),
               "scr": hashlib.sha256(oracle.screen_rgb()).hexdigest()[:16], "oam": blk(0x07000000, 0x400), "pal": blk(0x05000200, 0x200)}
        if io != last_io:
            row["io"] = io
            last_io = io
        rows.append(row)

    sample()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            sample()
    OUTPUT.write_text(json.dumps({"schema": "idle94-probe/v1", "scenario": SCENARIO.name, "mode": MODE, "seed": request.get("seed"),
                                  "frameCount": frame, "rows": rows}, separators=(",", ":")))


if __name__ == "__main__":
    main()
