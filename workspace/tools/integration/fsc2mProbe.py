#!/usr/bin/env python3
"""fsc2m: per-frame ROM probe of a battle lab with a scripted A-press policy after the move commit (hpd2Probe + text printer state).

usage: fsc2mProbe.py <scenario.json> <on|off> <output.json> <policy> [maxFrames]
policy: `pulse:P:PHI` = A held one frame at every trace frame k > commit with (k - commit) % P == PHI (the lab / driver idiom is P = 16);
        `ready` = A one frame as soon as the message printer (sTextPrinters[0]) sits in its wait-for-press state, never otherwise.
The lab's own trace segments run first (the menu presses: segments 0..2 are menu A / wait / move A, segment 3 is the idle window); the policy replaces segment 3's buttons.
Per frame row: f, ptr (gBattlescriptCurrInstr), exec (gBattleControllerExecFlags), anim, hp[2], tp = [active, state, delayCounter] of sTextPrinters[0], pause = gPauseCounterBattle, btn = 1 when A was pressed in that frame's advance.
Output carries `presses` (frame numbers whose advance carried A), so the same schedule can be replayed with tools/audio/soundEventProbe.py (see fsc2mRun.sh).
"""
from __future__ import annotations
import json, sys
from pathlib import Path

if len(sys.argv) not in (5, 6) or sys.argv[2] not in ("on", "off"):
    raise SystemExit(__doc__)
SCENARIO, MODE, OUTPUT, POLICY = Path(sys.argv[1]), sys.argv[2], Path(sys.argv[3]), sys.argv[4]
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(path for path in (ROOT, *ROOT.parents) if (path / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

PROFILE = {"on": "battle-scene-on", "off": "battle-scene-off"}[MODE]
BOOT = {"on": "factory.json", "off": "factory-battle-scene-off.json"}[MODE]
TEXT_PRINTERS = 0x020201B0  # sTextPrinters (static; arm-none-eabi-nm pokeemerald.elf)
PRINTER_SIZE, ACTIVE_OFF, STATE_OFF, DELAY_OFF = 0x24, 0x1B, 0x1C, 0x1E


def main() -> None:
    raw_req = json.loads(SCENARIO.read_text())
    raw_req["profile"] = PROFILE
    request = validate_request(raw_req, PROFILE)
    ref = (ROOT / "reference/pokeemerald").resolve()
    oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle/bootstrap" / BOOT)
    lab = BattleLab(oracle, PROFILE)
    lab.prepare(request)
    sy = oracle.symbols
    u8, u16, u32 = oracle.read_u8, oracle.read_u16, oracle.read_u32
    rows, presses = [], []
    frame = 0
    commit = None

    def sample(btn: int) -> None:
        rows.append({"f": frame, "ptr": u32(sy["gBattlescriptCurrInstr"]), "exec": u32(sy["gBattleControllerExecFlags"]), "anim": u8(sy["gAnimScriptActive"]),
                     "hp": [u16(sy["gBattleMons"] + 0x58 * i + 0x28) for i in range(2)], "pause": u16(sy["gPauseCounterBattle"]),
                     "tp": [u8(TEXT_PRINTERS + ACTIVE_OFF), u8(TEXT_PRINTERS + STATE_OFF), u8(TEXT_PRINTERS + DELAY_OFF)], "btn": btn})

    sample(0)
    limit = int(sys.argv[5]) if len(sys.argv) == 6 else 1000000
    segs = request["trace"]["segments"]
    for si, segment in enumerate(segs):
        last = si == len(segs) - 1
        for _ in range(segment["frames"]):
            if frame >= limit:
                break
            buttons = list(segment.get("buttons", []))
            if last:
                if commit is None:
                    commit = frame
                k = frame + 1 - commit
                if POLICY.startswith("pulse:"):
                    _, period, phi = POLICY.split(":")
                    if k > 0 and (k % int(period)) == int(phi):
                        buttons = ["A"]
                elif POLICY == "ready":
                    t = rows[-1]["tp"]
                    if t[0] and t[1] == 2:
                        buttons = ["A"]
            oracle.advance(buttons)
            frame += 1
            if "A" in buttons:
                presses.append(frame)
            sample(1 if "A" in buttons else 0)
    OUTPUT.write_text(json.dumps({"schema": "fsc2m-probe/v1", "scenario": SCENARIO.name, "mode": MODE, "policy": POLICY, "frameCount": frame, "windowStart": commit,
                                  "presses": presses, "rows": rows}, separators=(",", ":")))


if __name__ == "__main__":
    main()
