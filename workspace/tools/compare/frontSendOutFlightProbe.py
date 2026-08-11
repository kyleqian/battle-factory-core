#!/usr/bin/env python3
"""Capture the opponent front send-out flight during the Scene-ON battle intro.

The ENTIRE front send-out flight plays during `BattleLab.prepare()`'s
fast-forward, before any trace segment runs — a post-prepare probe only ever
sees the settled sprite (SpriteCallbackDummy). This probe opts into
`preCheckpointCaptureAllFrames` (set on the scenario dict here, never by
editing the committed scenario) so `preCheckpointCaptures` yields one
`{frame, sha256, state}` per prepare-phase frame, with absolute frame numbers
from `new_session()`.

The anchor is measured, not assumed: t_anchor is the first frame the battler-1
(opponent front) sprite's animNum flips 0 -> 1 — the `StartSpriteAnim(sprite,
1)` from `SpriteCB_OpponentMonFromBall` observing `affineAnimEnded` TRUE
(battle_main.c:2838). Do NOT key on `SpriteCallbackDummy_2`: for delay-0
species the mon-anim task installs the `Anim_*` callback later the SAME frame,
so frame-end snapshots jump straight from `SpriteCB_OpponentMonFromBall` to
the `Anim_*` symbol. Species with nonzero `sMonAnimationDelayTable` (e.g.
PIDGEOTTO, 25) hold `SpriteCallbackDummy_2` while `Task_AnimateAfterDelay`
counts down — both tasks are scanned into every snapshot.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(parent for parent in (ROOT, *ROOT.parents) if (parent / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))

from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

REFERENCE = (ROOT / "reference" / "pokeemerald").resolve()
ROM = REFERENCE / "pokeemerald.gba"
MAP = REFERENCE / "pokeemerald.map"
BOOTSTRAP = HARNESS / "oracle" / "bootstrap" / "factory.json"

SPECIES_NAMES_BY_ID = {
    index: entry["name"]
    for index, entry in enumerate(
        json.loads((ROOT / "src" / "data" / "gen" / "species-names.json").read_text())["species"]
    )
}
SELECTOR_TABLES = json.loads((ROOT / "src" / "data" / "gen" / "send-out-anim-selector-tables.json").read_text())
ANIMATION_DELAY = SELECTOR_TABLES["animationDelay"]["species"]

PRECEDING_ROWS = 10


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit(f"usage: {sys.argv[0]} <scenario.json> <output.json>")
    scenario_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])
    scenario = json.loads(scenario_path.read_text())
    scenario["preCheckpointCaptureAllFrames"] = True
    request = validate_request(scenario, "battle-scene-on")

    oracle = EmeraldOracle(ROM, MAP, BOOTSTRAP)
    nm = subprocess.run(
        ["arm-none-eabi-nm", "-a", str(REFERENCE / "pokeemerald.elf")],
        check=True, capture_output=True, text=True,
    ).stdout
    address_by_name: dict[str, int] = {}
    name_by_address: dict[int, str] = {}
    for line in nm.splitlines():
        parts = line.split()
        if len(parts) != 3:
            continue
        try:
            address = int(parts[0], 16)
        except ValueError:
            continue
        address_by_name[parts[2]] = address
        name_by_address[address] = parts[2]

    def u8(address: int) -> int:
        return oracle.read_u8(address)

    def u16(address: int) -> int:
        return u8(address) | (u8(address + 1) << 8)

    def u32(address: int) -> int:
        return u16(address) | (u16(address + 2) << 16)

    def s8(address: int) -> int:
        value = u8(address)
        return value - 0x100 if value >= 0x80 else value

    def s16(address: int) -> int:
        value = u16(address)
        return value - 0x10000 if value >= 0x8000 else value

    def raw(address: int, size: int) -> str:
        return "".join(f"{u8(address + offset):02x}" for offset in range(size))

    sprites = oracle.symbols["gSprites"]
    matrices = oracle.symbols["gOamMatrices"]
    sprite_ids = oracle.symbols["gBattlerSpriteIds"]
    tasks = oracle.symbols["gTasks"]

    def task_scan(symbol: str) -> dict | None:
        target = address_by_name[symbol]
        for slot in range(16):
            base = tasks + slot * 0x28
            if u8(base + 4) and (u32(base) & ~1) == target:
                return {
                    "slot": slot, "callbackSymbol": symbol,
                    "data": [s16(base + 8 + index * 2) for index in range(16)],
                    "raw": raw(base, 0x28),
                }
        return None

    def mon_animation_task() -> dict | None:
        return task_scan("Task_HandleMonAnimation")

    def animate_after_delay_task() -> dict | None:
        return task_scan("Task_AnimateAfterDelay")

    def sprite(slot: int) -> dict:
        base = sprites + slot * 0x44
        attr0, attr1, attr2 = u16(base), u16(base + 2), u16(base + 4)
        matrix_number = (attr1 >> 9) & 31
        matrix = matrices + matrix_number * 8
        callback = u32(base + 0x1C)
        flags = u16(base + 0x3E)
        return {
            "slot": slot, "flags": flags, "visible": not bool(flags & 4),
            "x": s16(base + 0x20), "y": s16(base + 0x22),
            "x2": s16(base + 0x24), "y2": s16(base + 0x26),
            "animNum": u8(base + 0x2A), "animCmdIndex": u8(base + 0x2B),
            "centerToCornerVecX": s8(base + 0x28), "centerToCornerVecY": s8(base + 0x29),
            "data": [s16(base + 0x2E + index * 2) for index in range(8)],
            "callbackSymbol": name_by_address.get(callback & ~1),
            "oam": {
                "attr0": attr0, "attr1": attr1, "attr2": attr2,
                "affineMode": (attr0 >> 8) & 3, "matrixNumber": matrix_number,
                "matrix": [s16(matrix + offset) for offset in (0, 2, 4, 6)],
                "raw": raw(base, 8),
            },
        }

    def snapshot() -> dict:
        slot = u8(sprite_ids + 1)
        return {
            "battler1": None if slot >= 64 else sprite(slot),
            "monAnimationTask": mon_animation_task(),
            "animateAfterDelayTask": animate_after_delay_task(),
        }

    oracle.screen_png = lambda: b""  # type: ignore[method-assign]
    lab = BattleLab(oracle, "battle-scene-on")
    lab.snapshot = snapshot  # type: ignore[method-assign]
    captures = lab.prepare(request)["preCheckpointCaptures"]

    opponent = request["overrides"]["parties"]["opponent"][0]
    species_id = opponent["species"]
    species_name = SPECIES_NAMES_BY_ID.get(species_id)
    if species_name is None:
        raise RuntimeError(f"no species-name mapping for id {species_id}")

    def battler1(capture: dict) -> dict | None:
        return capture["state"].get("battler1")

    def first_frame(predicate) -> int | None:
        return next((index for index, capture in enumerate(captures)
                     if (entry := battler1(capture)) is not None and predicate(entry)), None)

    # Before the battle mon is allocated, gBattlerSpriteIds[1] points at
    # unrelated rental-screen sprites whose animNum flaps are noise. Restrict
    # the anchor search to frames at-or-after the emerge callback installs.
    from_ball_index = first_frame(lambda entry: entry["callbackSymbol"] == "SpriteCB_OpponentMonFromBall")
    if from_ball_index is None:
        observed = sorted({(entry := battler1(c)) and entry["callbackSymbol"] for c in captures})
        anim_nums = sorted({(entry := battler1(c)) and entry["animNum"] for c in captures})
        raise RuntimeError(
            f"battler1 SpriteCB_OpponentMonFromBall never observed; callbacks={observed}; animNums={anim_nums}"
        )
    anchor_index = next((index for index, capture in enumerate(captures[from_ball_index:], start=from_ball_index)
                         if (entry := battler1(capture)) is not None and entry["animNum"] == 1), None)
    if anchor_index is None:
        observed = sorted({(entry := battler1(c)) and entry["callbackSymbol"]
                           for c in captures[from_ball_index:]})
        anim_nums = sorted({(entry := battler1(c)) and entry["animNum"]
                            for c in captures[from_ball_index:]})
        raise RuntimeError(
            f"battler1 animNum never flipped 0->1 after the ball emerge; callbacks={observed}; animNums={anim_nums}"
        )
    move_index = first_frame(lambda entry: (entry["callbackSymbol"] or "").startswith("Anim_"))
    if move_index is None:
        raise RuntimeError("battler1 Anim_* callback was never installed")
    end_index = first_frame(lambda entry: entry["callbackSymbol"] == "WaitAnimEnd")
    if end_index is None:
        raise RuntimeError("battler1 flight never reached WaitAnimEnd in the prepare phase")
    settle_index = next((index for index, capture in enumerate(captures[end_index + 1:], start=end_index + 1)
                         if (entry := battler1(capture)) is not None and entry["callbackSymbol"] == "SpriteCallbackDummy"), None)
    if settle_index is None:
        settle_index = len(captures) - 1
        reached_settle = False
    else:
        reached_settle = True

    start_index = max(0, anchor_index - PRECEDING_ROWS)
    dense = []
    for capture in captures[start_index:settle_index + 1]:
        dense.append({
            "frame": capture["frame"], "sha256": capture["sha256"],
            "battler1": capture["state"]["battler1"],
            "monAnimationTask": capture["state"]["monAnimationTask"],
            "animateAfterDelayTask": capture["state"]["animateAfterDelayTask"],
        })

    anchor_frame = captures[anchor_index]["frame"]
    move_frame = captures[move_index]["frame"]
    delay_table = ANIMATION_DELAY.get(species_name)
    result = {
        "schema": "front-send-out-flight/v1", "profile": "battle-scene-on",
        "species": species_name, "speciesId": species_id,
        "sourceFrontAnimId": SELECTOR_TABLES["frontAnimIds"]["species"].get(species_name),
        "sourceWindow": {
            "startFrame": dense[0]["frame"], "endFrame": dense[-1]["frame"],
            "frameCount": len(dense), "reachedSettledDummy": reached_settle,
        },
        "derived": {
            "t_anchor": anchor_frame,
            "t_animNumFlip": anchor_frame,
            "t_move": move_frame,
            "t_end": captures[end_index]["frame"],
            "animationDelay": delay_table if delay_table is not None else 0,
            "measuredGap": move_frame - anchor_frame,
        },
        "callbackAddresses": {
            name: address_by_name[name]
            for name in sorted(("Task_HandleMonAnimation", "Task_AnimateAfterDelay", "WaitAnimEnd", "SpriteCallbackDummy"))
            if name in address_by_name
        },
        "frames": dense,
    }
    output_path.write_text(json.dumps(result, separators=(",", ":")) + "\n")
    print(
        f"wrote {output_path}: {species_name} (id {species_id}), "
        f"anchor={anchor_frame}, move={move_frame}, gap={result['derived']['measuredGap']}, "
        f"dense={dense[0]['frame']}..{dense[-1]['frame']} ({len(dense)} frames), "
        f"settled={reached_settle}"
    )


if __name__ == "__main__":
    main()
