#!/usr/bin/env python3
"""Record the legal Scene-ON singles boundary for MOVE_HELPING_HAND.

MechanicLab v1 intentionally stages Level-50 singles only.  This probe does
not force a battle type or animation pointer: it observes a real selection of
Helping Hand through the stock failure branch and proves that Move_HELPING_HAND
never becomes the active animation script.  A future doubles-capable harness
can replace this bounded receipt with the complete success window.
"""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit("usage: helpingHandProbe.py <scenario> <output.json>")

SCENARIO, OUTPUT = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(path for path in (ROOT, *ROOT.parents)
               if (path / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE_HELPING_HAND = 270


def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    ref = (ROOT / "reference/pokeemerald").resolve()
    oracle = EmeraldOracle(
        ref / "pokeemerald.gba", ref / "pokeemerald.map",
        HARNESS / "oracle" / "bootstrap" / "factory.json",
    )
    lab = BattleLab(oracle, "battle-scene-on")
    setup = lab.prepare(request)
    nm = subprocess.run(
        ["arm-none-eabi-nm", "-a", str(ref / "pokeemerald.elf")],
        check=True, capture_output=True, text=True,
    ).stdout
    symbols = {
        parts[2]: int(parts[0], 16)
        for line in nm.splitlines()
        if len(parts := line.split()) == 3
        and all(char in "0123456789abcdefABCDEF" for char in parts[0])
    }
    start = symbols["Move_HELPING_HAND"]
    end = symbols["Move_ASSIST"]
    hand_template = symbols["gHelpingHandClapSpriteTemplate"]
    movement_task = symbols["AnimTask_HelpingHandAttackerMovement"]
    shake_task = symbols["AnimTask_ShakeMon2"]
    active = symbols["gAnimScriptActive"]
    pointer = symbols["sBattleAnimScriptPtr"]
    visual_tasks = oracle.symbols["gAnimVisualTaskCount"]
    sprites = oracle.symbols["gSprites"]
    tasks = oracle.symbols["gTasks"]
    battle_types = symbols["gBattleTypeFlags"]

    u8 = lambda address: oracle.read_u8(address)
    u16 = lambda address: u8(address) | (u8(address + 1) << 8)
    u32 = lambda address: u16(address) | (u16(address + 2) << 16)

    rows: list[dict] = []
    started = False
    finished = False
    frame = 0

    def take() -> None:
        nonlocal started, finished
        snapshot = lab.snapshot()
        current = snapshot["engine"]["currentMove"]
        if current == MOVE_HELPING_HAND:
            started = True
        elif started:
            finished = True
        if not started or finished:
            return
        script = u32(pointer)
        hand_sprites = 0
        for slot in range(64):
            base = sprites + slot * 0x44
            if not (u8(base + 0x3e) & 1):
                continue
            if (u32(base + 0x14) & ~1) == hand_template:
                hand_sprites += 1
        helping_tasks = 0
        shake_tasks = 0
        for slot in range(16):
            base = tasks + slot * 0x28
            if not u8(base + 4):
                continue
            task = u32(base) & ~1
            helping_tasks += task == movement_task
            shake_tasks += task == shake_task
        battlers = snapshot["battlers"]
        rows.append({
            "frame": frame,
            "rgbSha256": hashlib.sha256(oracle.screen_rgb()).hexdigest(),
            "currentMove": current,
            "battleTypeFlags": u32(battle_types),
            "animScriptActive": bool(u8(active)),
            "scriptPtr": script,
            "rootScriptActive": bool(u8(active)) and start <= script < end,
            "visualTaskCount": u8(visual_tasks),
            "helpingHandSpriteCount": hand_sprites,
            "helpingHandMovementTaskCount": helping_tasks,
            "shakeMon2TaskCount": shake_tasks,
            "playerPp": battlers["player"]["pp"],
            "opponentPp": battlers["opponent"]["pp"],
        })

    take()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            take()
            if finished:
                break
        if finished:
            break

    if not rows or not finished:
        raise RuntimeError("Helping Hand selection window was not observed")
    if any(row["rootScriptActive"] for row in rows):
        raise RuntimeError("singles unexpectedly entered Move_HELPING_HAND")
    if any(row["helpingHandSpriteCount"] or row["helpingHandMovementTaskCount"]
           for row in rows):
        raise RuntimeError("singles unexpectedly allocated Helping Hand presentation")

    OUTPUT.write_text(json.dumps({
        "schema": "helping-hand-singles-boundary/v1",
        "profile": "battle-scene-on",
        "move": "MOVE_HELPING_HAND",
        "moveId": MOVE_HELPING_HAND,
        "source": {
            "root": "Move_HELPING_HAND",
            "endExclusive": "Move_ASSIST",
            "start": f"0x{start:08x}",
            "end": f"0x{end:08x}",
        },
        "setup": setup,
        "window": {
            "startFrame": rows[0]["frame"],
            "endFrame": rows[-1]["frame"],
            "rows": len(rows),
            "firstPp": {"player": rows[0]["playerPp"], "opponent": rows[0]["opponentPp"]},
            "lastPp": {"player": rows[-1]["playerPp"], "opponent": rows[-1]["opponentPp"]},
        },
        "rows": rows,
        "verdict": {
            "battleLabVersion": "v1 Level-50 singles",
            "rootScriptObserved": False,
            "presentationAllocated": False,
            "reason": "Cmd_trysethelpinghand requires BATTLE_TYPE_DOUBLE before attackanimation",
        },
    }, separators=(",", ":")) + "\n")
    print(f"wrote {OUTPUT}: {len(rows)} legal singles Helping Hand rows")


if __name__ == "__main__":
    main()
