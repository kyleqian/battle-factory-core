#!/usr/bin/env python3
"""Observe the real sprite allocator from battle reset through Light Screen.

The BattleLab checkpoint is deliberately too late to establish allocator
provenance.  This probe wraps its internal frame advance and records every
change to gSprites while the stock ROM traverses the draft, battle init,
trainer intro, party trays, sendout, first action menu, and legal move.
"""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit("usage: lightScreenAllocatorProbe.py <scenario> <output.json>")

SCENARIO, OUTPUT = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents)
               if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))

from battle_lab import BattleLab, validate_request
from emerald_core import EmeraldOracle

SPRITE_SIZE = 0x44


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    ref = ROOT / "reference" / "pokeemerald"
    oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map",
                           HARNESS / "oracle" / "bootstrap" / "factory.json")
    lab = BattleLab(oracle, "battle-scene-on")
    nm = subprocess.run(["arm-none-eabi-nm", "-a", str(ref / "pokeemerald.elf")],
                        check=True, capture_output=True, text=True).stdout
    symbols = {}
    address_names: dict[int, list[str]] = {}
    for line in nm.splitlines():
        parts = line.split()
        if len(parts) == 3:
            address = int(parts[0], 16)
            symbols[parts[2]] = address
            address_names.setdefault(address, []).append(parts[2])
    required = ("gSprites", "gBattlerSpriteIds", "gHealthboxSpriteIds",
                "gAnimScriptActive", "sAnimMoveIndex",
                "gLightScreenWallSpriteTemplate",
                "gSpecialScreenSparkleSpriteTemplate")
    missing = [name for name in required if name not in symbols]
    if missing:
        raise RuntimeError(f"ELF lacks required symbols: {missing}")

    def u16(address: int) -> int:
        return oracle.read_u8(address) | oracle.read_u8(address + 1) << 8

    def sprite_rows() -> list[dict]:
        rows = []
        for slot in range(64):
            base = symbols["gSprites"] + SPRITE_SIZE * slot
            if not oracle.read_u8(base + 0x3E) & 1:
                continue
            template = oracle.read_u32(base + 0x14)
            callback = oracle.read_u32(base + 0x1C)
            rows.append({
                "slot": slot,
                "template": template,
                "templateNames": address_names.get(template, []),
                "callback": callback,
                "callbackNames": address_names.get(callback, []),
            })
        return rows

    events: list[dict] = []
    previous: dict[int, tuple[int, int]] | None = None
    checkpoint: dict | None = None
    step = 0
    phase = "pre-checkpoint"
    light_anim_start: int | None = None
    light_anim_cleanup: int | None = None
    light_anim_was_active = False

    def observe() -> None:
        nonlocal previous, light_anim_start, light_anim_cleanup, light_anim_was_active
        active = (phase == "trace" and
                  bool(oracle.read_u8(symbols["gAnimScriptActive"])) and
                  u16(symbols["sAnimMoveIndex"]) == 113)
        if active and light_anim_start is None:
            light_anim_start = step - checkpoint_step
        if light_anim_was_active and not active and light_anim_cleanup is None:
            light_anim_cleanup = step - checkpoint_step
        light_anim_was_active = active
        current_rows = sprite_rows()
        current = {r["slot"]: (r["template"], r["callback"]) for r in current_rows}
        if previous is None:
            previous = current
            return
        freed = sorted(set(previous) - set(current))
        # Callback changes are ordinary lifecycle progress, not allocations.
        # A new template in an occupied slot is a same-display replacement.
        allocated = [r for r in current_rows if r["slot"] not in previous or
                     previous[r["slot"]][0] != current[r["slot"]][0]]
        if freed or allocated:
            events.append({"step": step, "oracleFrame": oracle.frame, "phase": phase,
                           "freed": freed, "allocated": allocated,
                           "occupied": sorted(current)})
        previous = current

    original_advance = oracle.advance

    def observed_advance(buttons):
        nonlocal step
        result = original_advance(buttons)
        step += 1
        observe()
        return result

    oracle.advance = observed_advance
    setup = lab.prepare(request)
    checkpoint = {
        "step": step, "oracleFrame": oracle.frame,
        "sprites": sprite_rows(),
        "battlerSpriteIds": [oracle.read_u8(symbols["gBattlerSpriteIds"] + i)
                             for i in range(2)],
        "healthboxSpriteIds": [oracle.read_u8(symbols["gHealthboxSpriteIds"] + i)
                               for i in range(2)],
    }
    checkpoint_step = step
    phase = "trace"
    # Continue through the caller's legal move, using the same wrapped advance.
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            observed_advance(segment.get("buttons", []))

    wall = symbols["gLightScreenWallSpriteTemplate"]
    sparkle = symbols["gSpecialScreenSparkleSpriteTemplate"]
    relevant = [event for event in events if event["step"] >= checkpoint_step or
                any(row["template"] in (wall, sparkle) for row in event["allocated"])]
    allocations = [
        {"frame": event["step"] - checkpoint_step, "slot": row["slot"],
         "kind": "wall" if row["template"] == wall else "sparkle"}
        for event in events for row in event["allocated"]
        if row["template"] in (wall, sparkle)
    ]
    identity = {name: sha(ref / name)
                for name in ("pokeemerald.gba", "pokeemerald.elf", "pokeemerald.map")}
    source_files = (
        "src/battle_main.c", "src/battle_gfx_sfx_util.c",
        "src/battle_interface.c", "src/battle_controller_player.c",
        "src/battle_controller_opponent.c", "src/sprite.c",
        "src/battle_anim.c", "src/battle_anim_psychic.c",
        "data/battle_anim_scripts.s",
    )
    payload = {
        "schema": "light-screen-allocator-lifecycle/v1",
        "scenario": str(SCENARIO), "setup": setup,
        "referenceSha256": identity,
        "toolSha256": sha(Path(__file__)),
        "sourceSha256": {name: sha(ref / name) for name in source_files},
        "sourceAnchors": {
            "reset": "src/battle_main.c:CB2_InitBattleInternal ResetSpriteData",
            "healthboxes": "src/battle_gfx_sfx_util.c:BattleInitAllSprites state 3; src/battle_interface.c:CreateBattlerHealthboxSprites",
            "shadow": "src/battle_gfx_sfx_util.c:BattleInitAllSprites state 6; LoadAndCreateEnemyShadowSprites",
            "partySummary": "src/battle_interface.c:CreatePartyStatusSummarySprites; Task_HidePartyStatusSummary_BattleStart_2",
            "allocation": "src/sprite.c:CreateSprite first free; CreateSpriteAtEnd last free; DestroySprite clears inUse",
            "move": "data/battle_anim_scripts.s:Move_LIGHT_SCREEN",
        },
        "historyBound": "fresh BattleLab route from new_session through first action menu and first legal move; no switch, in-battle summary, substitute, transform, or unknown entry",
        "checkpoint": checkpoint,
        "events": events,
        "postCheckpointEvents": relevant,
        "animationClock": {"start": light_anim_start, "cleanup": light_anim_cleanup},
        "lightScreenAllocations": allocations,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, separators=(",", ":")) + "\n")
    print(json.dumps({"output": str(OUTPUT), "events": len(events),
                      "checkpointStep": checkpoint_step,
                      "occupied": [r["slot"] for r in checkpoint["sprites"]],
                      "lightScreenAllocations": allocations}))


if __name__ == "__main__":
    main()
