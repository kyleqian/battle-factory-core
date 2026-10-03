#!/usr/bin/env python3
"""Trace the source-owned controller/animation clock for legal Light Screen.

Unlike lightScreenProbe.py, this probe does not call every frame with
gCurrentMove == LIGHT_SCREEN an animation-load frame.  It records the battle
script, controller, text-printer, and animation-script state needed to locate
the actual load/start/body/cleanup boundaries.
"""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit("usage: lightScreenClockProbe.py <scenario> <output.json>")

SCENARIO, OUTPUT = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(path for path in (ROOT, *ROOT.parents)
               if (path / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))

from battle_lab import BattleLab, validate_request
from emerald_core import EmeraldOracle


def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    ref = ROOT / "reference" / "pokeemerald"
    oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map",
                           HARNESS / "oracle" / "bootstrap" / "factory.json")
    lab = BattleLab(oracle, "battle-scene-on")
    setup = lab.prepare(request)
    nm_text = subprocess.run(
        ["arm-none-eabi-nm", "-a", str(ref / "pokeemerald.elf")], check=True,
        capture_output=True, text=True).stdout
    names = {parts[2]: int(parts[0], 16)
             for line in nm_text.splitlines()
             if len(parts := line.split()) == 3}
    required = (
        "gAnimScriptActive", "sAnimFramesToWait", "sAnimMoveIndex",
        "sBattleAnimScriptPtr", "gBattleControllerExecFlags",
        "gBattlerControllerFuncs", "gBattlescriptCurrInstr", "gActiveBattler",
        "sTextPrinters", "gSprites", "gLightScreenWallSpriteTemplate",
        "Move_LIGHT_SCREEN",
    )
    missing = [name for name in required if name not in names]
    if missing:
        raise RuntimeError(f"ELF lacks required symbols: {missing}")

    def u16(addr: int) -> int:
        return oracle.read_u8(addr) | oracle.read_u8(addr + 1) << 8

    def u32(addr: int) -> int:
        return oracle.read_u32(addr)

    def s8(addr: int) -> int:
        value = oracle.read_u8(addr)
        return value - 256 if value >= 128 else value

    wall_template = names["gLightScreenWallSpriteTemplate"]
    rows: list[dict] = []

    def capture(frame: int) -> None:
        snap = lab.snapshot()
        current_move = snap["engine"]["currentMove"]
        anim_active = bool(oracle.read_u8(names["gAnimScriptActive"]))
        # Retain the whole ordinary move lifetime, including attack-string time,
        # and a short post-cleanup tail. This distinction is the point of the probe.
        if current_move != 113 and not anim_active and not rows:
            return
        controller_funcs = [u32(names["gBattlerControllerFuncs"] + 4 * i)
                            for i in range(4)]
        printers = []
        for i in range(32):
            base = names["sTextPrinters"] + 0x24 * i
            if oracle.read_u8(base + 0x1B):
                printers.append({
                    "window": i,
                    "currentChar": u32(base),
                    "active": oracle.read_u8(base + 0x1B),
                    "state": oracle.read_u8(base + 0x1C),
                    "delayCounter": oracle.read_u8(base + 0x1E),
                })
        wall_slots = []
        for i in range(64):
            base = names["gSprites"] + 0x44 * i
            if (oracle.read_u8(base + 0x3E) & 1 and
                    u32(base + 0x14) == wall_template):
                wall_slots.append(i)
        rows.append({
            "frame": frame,
            "currentMove": current_move,
            "battleScriptPtr": u32(names["gBattlescriptCurrInstr"]),
            "controllerExecFlags": u32(names["gBattleControllerExecFlags"]),
            "activeBattler": oracle.read_u8(names["gActiveBattler"]),
            "controllerFuncs": controller_funcs,
            "textPrinters": printers,
            "anim": {
                "active": anim_active,
                "moveIndex": u16(names["sAnimMoveIndex"]),
                "scriptPtr": u32(names["sBattleAnimScriptPtr"]),
                "framesToWait": s8(names["sAnimFramesToWait"]),
            },
            "wallSlots": wall_slots,
        })

    frame = 0
    capture(frame)
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            capture(frame)

    if not rows or not any(row["wallSlots"] for row in rows):
        raise RuntimeError("Light Screen wall not reached")

    def first_index(predicate) -> int | None:
        return next((i for i, row in enumerate(rows) if predicate(row)), None)

    start_i = first_index(lambda row: row["anim"]["active"] and
                          row["anim"]["moveIndex"] == 113)
    wall_i = first_index(lambda row: bool(row["wallSlots"]))
    cleanup_i = next((i for i in range((wall_i or 0) + 1, len(rows))
                      if not rows[i]["anim"]["active"]), None)
    if start_i is None:
        raise RuntimeError("Light Screen animation script not reached")
    move_i = start_i
    while move_i and rows[move_i - 1]["currentMove"] == 113:
        move_i -= 1
    printer_i = next((i for i in range(move_i, start_i)
                      if rows[i]["textPrinters"]), None)
    printer_done_i = (next((i for i in range((printer_i or move_i) + 1, start_i)
                            if not rows[i]["textPrinters"]), None)
                      if printer_i is not None else None)
    first_load_i = next((i for i in range(start_i, len(rows))
                         if rows[i]["anim"]["scriptPtr"] == names["Move_LIGHT_SCREEN"] + 3), None)
    second_load_i = next((i for i in range(start_i, len(rows))
                          if rows[i]["anim"]["scriptPtr"] == names["Move_LIGHT_SCREEN"] + 6), None)
    anchors = {
        "ordinaryMoveObserved": rows[move_i]["frame"],
        "attackStringPrinterActive": rows[printer_i]["frame"] if printer_i is not None else None,
        "attackStringPrinterComplete": rows[printer_done_i]["frame"] if printer_done_i is not None else None,
        "animationScriptActive": rows[start_i]["frame"] if start_i is not None else None,
        "firstLoadSpriteGfxWait": rows[first_load_i]["frame"] if first_load_i is not None else None,
        "secondLoadSpriteGfxWait": rows[second_load_i]["frame"] if second_load_i is not None else None,
        "firstWall": rows[wall_i]["frame"] if wall_i is not None else None,
        "animationScriptCleanup": rows[cleanup_i]["frame"] if cleanup_i is not None else None,
    }
    end_i = next((i for i in range((cleanup_i or start_i) + 1, len(rows))
                  if rows[i]["currentMove"] != 113), len(rows) - 1)
    identity = {}
    for filename in ("pokeemerald.gba", "pokeemerald.elf", "pokeemerald.map"):
        identity[filename] = hashlib.sha256((ref / filename).read_bytes()).hexdigest()
    payload = {
        "schema": "light-screen-source-clock/v1",
        "scenario": str(SCENARIO),
        "setup": setup,
        "referenceSha256": identity,
        "sourceAnchors": {
            "battleEffect": "data/battle_scripts_1.s:BattleScript_EffectLightScreen",
            "attackAnimation": "data/battle_scripts_1.s:BattleScript_PrintReflectLightScreenSafeguardString",
            "moveAnimation": "data/battle_anim_scripts.s:Move_LIGHT_SCREEN",
            "controller": ["src/battle_controller_player.c:PlayerHandleMoveAnimation",
                           "src/battle_controller_opponent.c:OpponentHandleMoveAnimation"],
            "loader": "src/battle_anim.c:Cmd_loadspritegfx",
        },
        "allocatorAudit": {
            "reset": "src/battle_main.c:InitBattleBgsVideo -> LoadBattleTextboxAndBackground -> ResetSpriteData",
            "healthboxes": "src/battle_gfx_sfx_util.c:BattleInitAllSprites state 3 calls CreateBattlerHealthboxSprites in battler order",
            "healthboxAllocation": "src/battle_interface.c:CreateBattlerHealthboxSprites uses CreateSprite for left halves, then CreateSpriteAtEnd for right halves and health bars",
            "enemyShadow": "src/battle_gfx_sfx_util.c:BattleInitAllSprites state 6 calls LoadAndCreateEnemyShadowSprites, which uses CreateSprite",
            "laterLifetimes": "trainer/battler sendout uses CreateSprite; party summaries use CreateSprite plus CreateSpriteAtEnd",
            "limit": "source call order alone does not prove final occupied slots after intro/sendout/summary destruction, so this probe grants no allocator recipe",
        },
        "symbolAddresses": {name: names[name] for name in required},
        "anchors": anchors,
        "frames": rows[move_i:end_i + 1],
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, separators=(",", ":")) + "\n")
    print(f"wrote {OUTPUT}: {len(rows)} rows; anchors={anchors}")


if __name__ == "__main__":
    main()
