#!/usr/bin/env python3
"""Read-only ROM receipt probe for STEP rcp154 (action-time move choice:
a battler dragged in before acting, and a battler Encored mid-turn before
acting).  A copy of tools/probe/probe-rcp143-random-callers.py with three
additions; everything rcp143 records is recorded the same way.

Run only through tools/run-mgba-probe.py, one card per process:

    python3 tools/run-mgba-probe.py <out.json> -- \
        python3 tools/probe/probe-rcp154-action-time.py <card.json> <out.json> \
            [--attribute START:END] [--slot-plan 0,1] \
            [--png-dir DIR --png-range START:END] [--png-after-message N]

Additions over rcp143:

* ``--slot-plan``: the player's move slot per move-menu entry (the n-th time
  the player controller enters ``HandleInputChooseMove``; the last entry
  repeats).  On an A pulse of the card's trace that would confirm a move
  while ``gMoveSelectionCursor[0]`` is not the planned slot, that pulse
  presses RIGHT/LEFT (or DOWN/UP) instead.  Pass 1 records the realized
  per-frame buttons; pass 2 replays exactly those, so the attribution pass
  sees the same inputs (``inputSubstitutions`` lists every swap).
* The watch adds the action-time globals: ``gChosenMoveByBattler``,
  ``gCurrMovePos`` / ``gChosenMovePos`` / ``gChosenMove``, the active
  species and party index per battler, ``gLastMoves`` and each battler's
  ``gDisableStructs`` Encore fields, and the player controller function.
* ``--png-after-message N`` saves one PNG N frames after every displayed
  battle-string change (the receipt's text evidence).

It stages the card exactly like `bin/oracle lab` (`BattleLab.prepare`, stock
ROM, `overrides.parties`), then makes two passes over the card's own trace
(the instrument of `tools/probe/attribute-factory-ai-random-callers.py`):

1. **Per-frame pass.**  `sRandCount` (`src/random.c:5,14`) frame deltas,
   cross-checked against an independent `gRngValue` LCG replay (the receipt
   refuses to be written if they ever disagree, as issue140's probe does);
   plus a watch of `gBattleMainFunc`, `gCurrentActionFuncId`,
   `gBattlescriptCurrInstr`, `gCurrentMove`, the displayed battle string,
   `gAnimScriptActive` and `sBattleAnimScriptPtr` (resolved to its
   `General_*` / `Move_*` label) -- message and animation frame spans for
   the Focus Punch receipt.  Optional dense PNGs from the same emulator.
2. **Attribution pass.**  A FRESH emulator re-stages the card, fast-forwards
   the unflagged frames and single-steps (`core.step()`) only the frames pass
   1 saw drawing inside `--attribute`, catching every entry into `Random()`
   (`0x0806F5CC`, pipelined PC +2) and recording the caller (LR bisected
   against `arm-none-eabi-nm` text symbols), the pre-draw `gRngValue`, the
   drawn u16, `gBattlescriptCurrInstr` and `gBattleMainFunc` at that instant.

Pass 2's hit count must equal pass 1's window total (`reconciliation`).
Nothing transient is staged; every effect comes from controller input.
"""

from __future__ import annotations

import argparse
import bisect
import hashlib
import json
import subprocess
import sys
from pathlib import Path

PARSER = argparse.ArgumentParser()
PARSER.add_argument("card", type=Path)
PARSER.add_argument("output", type=Path)
PARSER.add_argument("--attribute", default="", help="START:END frames (exclusive:inclusive) to single-step")
PARSER.add_argument("--png-dir", type=Path, default=None)
PARSER.add_argument("--png-range", default="", help="START:END inclusive frames to save as PNG")
PARSER.add_argument("--slot-plan", default="0", help="comma list: player move slot per move-menu entry")
PARSER.add_argument("--png-after-message", type=int, default=0, help="save a PNG N frames after each message change")
ARGS = PARSER.parse_args()

WORKTREE_ROOT = Path(__file__).resolve().parents[2]


def find_harness_root(start: Path) -> Path:
    for candidate in (start, *start.parents):
        if (candidate / "oracle" / "emerald_core.py").is_file():
            return candidate
    raise SystemExit(f"could not find harness root above {start}")


HARNESS_ROOT = find_harness_root(WORKTREE_ROOT)
ORACLE_DIR = HARNESS_ROOT / "oracle"
sys.path.insert(0, str(ORACLE_DIR))

from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

REFERENCE = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
BOOTSTRAPS = {
    "battle-scene-off": ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json",
    "battle-scene-on": ORACLE_DIR / "bootstrap" / "factory.json",
}
RANDOM_ADDR = 0x0806F5CC
RANDOM_ENTRY_PC = RANDOM_ADDR + 2
SRANDCOUNT_ADDR = 0x020249C0
LCG_MULT = 0x41C64E6D
LCG_ADD = 0x6073
MAX_DRAWS_PER_FRAME = 512
DISPLAYED_STRING_BYTES = 160
BATTLE_MON_SIZE = 0x58
BATTLE_MON_HP = 0x28
BATTLE_MON_STATUS2 = 0x50
BATTLE_MON_SPECIES = 0x00
BATTLE_MON_MOVES = 0x0C
DISABLE_STRUCT_SIZE = 0x1C
DISABLE_ENCORED_MOVE = 0x06
DISABLE_ENCORED_MOVE_POS = 0x0C
DISABLE_ENCORE_TIMER = 0x0E


def parse_range(text: str) -> tuple[int, int] | None:
    if not text:
        return None
    start, end = text.split(":")
    return int(start), int(end)


def lcg(value: int) -> int:
    return (value * LCG_MULT + LCG_ADD) & 0xFFFFFFFF


def lcg_distance(before: int, after: int) -> int:
    value = before & 0xFFFFFFFF
    for k in range(MAX_DRAWS_PER_FRAME + 1):
        if value == (after & 0xFFFFFFFF):
            return k
        value = lcg(value)
    return -1


def nm_symbols() -> tuple[list[tuple[int, str]], dict[str, int]]:
    out = subprocess.run(
        ["arm-none-eabi-nm", "--defined-only", "-n", str(REFERENCE / "pokeemerald.elf")],
        capture_output=True, text=True, check=True,
    ).stdout
    text: list[tuple[int, str]] = []
    every: dict[str, int] = {}
    for line in out.splitlines():
        parts = line.split()
        if len(parts) != 3:
            continue
        address, kind, name = int(parts[0], 16), parts[1], parts[2]
        every.setdefault(name, address)
        if kind in ("t", "T"):
            text.append((address, name))
    text.sort()
    return text, every


def nearest(table: list[tuple[int, str]], address: int, span: int) -> str:
    index = bisect.bisect_right(table, (address, "￿")) - 1
    if index < 0:
        return f"0x{address:08X}"
    base, name = table[index]
    delta = address - base
    if delta > span:
        return f"0x{address:08X}"
    return name if delta == 0 else f"{name}+0x{delta:x}"


def decode_displayed(raw: list[int]) -> str:
    punctuation = {
        0x00: " ", 0xAB: "!", 0xAC: "?", 0xAD: ".", 0xAE: "-", 0xB0: "…",
        0xB4: "’", 0xB8: ",", 0xBA: "/", 0xF0: ":",
    }
    chars: list[str] = []
    for value in raw:
        if value == 0xFF:
            break
        if value in (0xFE, 0xFA, 0xFB):
            chars.append("\n")
        elif value in punctuation:
            chars.append(punctuation[value])
        elif 0xA1 <= value <= 0xAA:
            chars.append(str(value - 0xA1))
        elif 0xBB <= value <= 0xD4:
            chars.append(chr(ord("A") + value - 0xBB))
        elif 0xD5 <= value <= 0xEE:
            chars.append(chr(ord("a") + value - 0xD5))
        else:
            chars.append(f"<{value:02X}>")
    return "".join(chars)


def iter_trace_frames(trace: dict):
    frame = 0
    for index, segment in enumerate(trace["segments"]):
        for offset in range(int(segment["frames"])):
            frame += 1
            yield frame, segment.get("buttons", []), index, offset


def steer(cursor: int, slot: int) -> list[str]:
    """One menu step from move cursor `cursor` towards `slot` (2x2 grid)."""
    if (cursor & 1) != (slot & 1):
        return ["RIGHT"] if slot & 1 else ["LEFT"]
    return ["DOWN"] if slot & 2 else ["UP"]


def party_identity(mon: dict) -> dict:
    keys = ("species", "item", "abilitySlot", "ability", "moves", "hp", "maxHp", "stats", "level", "personality")
    return {key: mon[key] for key in keys if key in mon}


def main() -> None:
    card = json.loads(ARGS.card.read_text())
    profile = card.get("profile", "battle-scene-off")
    request = validate_request(card, profile)
    attribute_window = parse_range(ARGS.attribute)
    png_window = parse_range(ARGS.png_range)
    text_table, every_symbol = nm_symbols()

    def stage() -> tuple[EmeraldOracle, BattleLab]:
        oracle = EmeraldOracle(REFERENCE / "pokeemerald.gba", REFERENCE / "pokeemerald.map", BOOTSTRAPS[profile])
        lab = BattleLab(oracle, profile)
        lab.prepare(request)
        return oracle, lab

    oracle, lab = stage()
    symbols = oracle.symbols
    script_labels = sorted(
        (address, name) for name, address in symbols.items()
        if name.startswith("BattleScript") or name.startswith("gBattleScriptsForMoveEffects")
    )
    anim_labels = sorted(
        (address, name) for name, address in every_symbol.items()
        if name.startswith(("General_", "Move_", "Special_", "Status_"))
    )
    anim_ptr_addr = every_symbol["sBattleAnimScriptPtr"]
    anim_active_addr = every_symbol["gAnimScriptActive"]
    battle_mons = symbols["gBattleMons"]
    disable_structs = symbols["gDisableStructs"]
    slot_plan = [int(x) for x in ARGS.slot_plan.split(",")]
    controller_funcs = every_symbol["gBattlerControllerFuncs"]
    choose_move_func = every_symbol["HandleInputChooseMove"]
    move_cursor = every_symbol["gMoveSelectionCursor"]
    parties_before = lab.snapshot()["parties"]

    def main_func() -> str:
        return nearest(text_table, oracle.read_u32(symbols["gBattleMainFunc"]) & ~1, 0x1000)

    def script_label() -> str:
        return nearest(script_labels, oracle.read_u32(symbols["gBattlescriptCurrInstr"]), 0x400)

    def watch() -> dict:
        anim_active = oracle.read_u8(anim_active_addr)
        return {
            "battleMainFunc": main_func(),
            "actionFuncId": oracle.read_u8(symbols["gCurrentActionFuncId"]),
            "turnActionNumber": oracle.read_u8(symbols["gCurrentTurnActionNumber"]),
            "script": script_label(),
            "currentMove": oracle.read_u16(symbols["gCurrentMove"]),
            "attacker": oracle.read_u8(symbols["gBattlerAttacker"]),
            "animActive": anim_active,
            "animScript": nearest(anim_labels, oracle.read_u32(anim_ptr_addr), 0x400) if anim_active else None,
            "activeHp": [oracle.read_u16(battle_mons + b * BATTLE_MON_SIZE + BATTLE_MON_HP) for b in range(2)],
            "activeSpecies": [oracle.read_u16(battle_mons + b * BATTLE_MON_SIZE + BATTLE_MON_SPECIES) for b in range(2)],
            "activeMoves": [
                [oracle.read_u16(battle_mons + b * BATTLE_MON_SIZE + BATTLE_MON_MOVES + 2 * i) for i in range(4)]
                for b in range(2)
            ],
            "partyIndex": [oracle.read_u16(every_symbol["gBattlerPartyIndexes"] + 2 * b) for b in range(2)],
            "chosenMoveByBattler": [oracle.read_u16(every_symbol["gChosenMoveByBattler"] + 2 * b) for b in range(2)],
            "currMovePos": oracle.read_u8(every_symbol["gCurrMovePos"]),
            "chosenMovePos": oracle.read_u8(every_symbol["gChosenMovePos"]),
            "chosenMove": oracle.read_u16(every_symbol["gChosenMove"]),
            "lastMoves": [oracle.read_u16(every_symbol["gLastMoves"] + 2 * b) for b in range(2)],
            "encore": [
                [
                    oracle.read_u16(disable_structs + b * DISABLE_STRUCT_SIZE + DISABLE_ENCORED_MOVE),
                    oracle.read_u8(disable_structs + b * DISABLE_STRUCT_SIZE + DISABLE_ENCORED_MOVE_POS),
                    oracle.read_u8(disable_structs + b * DISABLE_STRUCT_SIZE + DISABLE_ENCORE_TIMER) & 0xF,
                ]
                for b in range(2)
            ],
            "playerController": nearest(text_table, oracle.read_u32(controller_funcs) & ~1, 0x1000),
            "status2": [oracle.read_u32(battle_mons + b * BATTLE_MON_SIZE + BATTLE_MON_STATUS2) for b in range(2)],
        }

    def read_message() -> str:
        return decode_displayed([
            oracle.read_u8(symbols["gDisplayedStringBattle"] + offset) for offset in range(DISPLAYED_STRING_BYTES)
        ])

    # ---- pass 1 -------------------------------------------------------
    previous = watch()
    initial = previous
    previous_message = read_message()
    count_before = oracle.read_u32(SRANDCOUNT_ADDR)
    rng_before = oracle.read_u32(symbols["gRngValue"])
    per_frame: list[dict] = []
    transitions: list[dict] = []
    messages: list[dict] = []
    mismatches: list[dict] = []
    pngs: list[dict] = []
    total = 0
    if ARGS.png_dir:
        ARGS.png_dir.mkdir(parents=True, exist_ok=True)
    realized: list[list[str]] = []
    substitutions: list[dict] = []
    menu_entries = 0
    in_menu = False
    segment_buttons: list[str] = []
    png_due: set[int] = set()
    for frame, buttons, segment_index, offset in iter_trace_frames(request["trace"]):
        controller = oracle.read_u32(controller_funcs) & ~1
        if controller == choose_move_func and not in_menu:
            menu_entries += 1
        in_menu = controller == choose_move_func
        if offset == 0:
            segment_buttons = list(buttons)
            if buttons == ["A"] and in_menu:
                slot = slot_plan[min(menu_entries, len(slot_plan)) - 1]
                cursor = oracle.read_u8(move_cursor)
                if cursor != slot:
                    segment_buttons = steer(cursor, slot)
                    substitutions.append({
                        "frame": frame, "menuEntry": menu_entries, "cursor": cursor,
                        "plannedSlot": slot, "buttons": segment_buttons,
                    })
        realized.append(segment_buttons)
        oracle.advance(segment_buttons)
        count_after = oracle.read_u32(SRANDCOUNT_ADDR)
        rng_after = oracle.read_u32(symbols["gRngValue"])
        calls = (count_after - count_before) & 0xFFFFFFFF
        lcg_calls = lcg_distance(rng_before, rng_after)
        if lcg_calls != calls:
            mismatches.append({"frame": frame, "sRandCount": calls, "lcgDistance": lcg_calls})
        now = watch()
        if calls:
            per_frame.append({
                "frame": frame, "calls": calls, "rngBefore": rng_before, "rngAfter": rng_after,
                "battleMainFunc": now["battleMainFunc"], "script": now["script"],
            })
        total += calls
        count_before, rng_before = count_after, rng_after
        changed = {key: [previous[key], now[key]] for key in now if now[key] != previous[key]}
        if changed:
            transitions.append({"frame": frame, "changed": changed})
            previous = now
        message = read_message()
        if message != previous_message:
            messages.append({"frame": frame, "text": message})
            if ARGS.png_after_message:
                png_due.add(frame + ARGS.png_after_message)
        previous_message = message
        if ARGS.png_dir and ((png_window and png_window[0] <= frame <= png_window[1]) or frame in png_due):
            from PIL import Image  # local: only needed for dense PNG runs

            rgb = oracle.screen_rgb()
            path = ARGS.png_dir / f"frame-{frame:05d}.png"
            Image.frombytes("RGB", (240, 160), rgb).save(path)
            pngs.append({"frame": frame, "rgbSha256": hashlib.sha256(rgb).hexdigest()})
    if mismatches:
        raise SystemExit(f"sRandCount and LCG replay disagree on {len(mismatches)} frame(s): {mismatches[0]}")
    final_snapshot = lab.snapshot()
    final_watch = watch()
    framebuffer = hashlib.sha256(oracle.screen_rgb()).hexdigest()

    # ---- pass 2 -------------------------------------------------------
    hits: list[dict] = []
    window_total = 0
    if attribute_window:
        start, end = attribute_window
        flagged = {row["frame"] for row in per_frame if start < row["frame"] <= end}
        window_total = sum(row["calls"] for row in per_frame if start < row["frame"] <= end)
        oracle2, _lab2 = stage()
        for frame, buttons in enumerate(realized, start=1):
            if frame > end:
                break
            if frame not in flagged:
                oracle2.advance(buttons)
                continue
            oracle2._set_buttons(buttons)
            start_fc = oracle2.core.frame_counter
            steps = 0
            while True:
                if oracle2.core.cpu.pc == RANDOM_ENTRY_PC:
                    before = oracle2.read_u32(symbols["gRngValue"])
                    after = lcg(before)
                    hits.append({
                        "frame": frame,
                        "caller": nearest(text_table, oracle2.core.cpu.lr & ~1, 0x4000),
                        "lr": f"0x{oracle2.core.cpu.lr:08x}",
                        "rngBefore": before,
                        "value": after >> 16,
                        "script": nearest(script_labels, oracle2.read_u32(symbols["gBattlescriptCurrInstr"]), 0x400),
                        "battleMainFunc": nearest(
                            text_table, oracle2.read_u32(symbols["gBattleMainFunc"]) & ~1, 0x1000
                        ),
                        "currentMove": oracle2.read_u16(symbols["gCurrentMove"]),
                        "attacker": oracle2.read_u8(symbols["gBattlerAttacker"]),
                    })
                if oracle2.core.frame_counter != start_fc:
                    break
                oracle2.core.step()
                steps += 1
                if steps > 20_000_000:
                    raise RuntimeError(f"frame {frame} did not end")
            oracle2._screen_stale = False
            oracle2.frame += 1

    result = {
        "schema": "rcp154-action-time-probe/v1",
        "slotPlan": slot_plan,
        "moveMenuEntries": menu_entries,
        "inputSubstitutions": substitutions,
        "card": ARGS.card.as_posix(),
        "oracleProfile": profile,
        "seed": request["seed"],
        "drawCountCrossChecked": True,
        "parties": {side: [party_identity(mon) for mon in parties_before[side]] for side in ("player", "opponent")},
        "initial": initial,
        "totalRandomCalls": total,
        "perFrameDraws": per_frame,
        "messages": messages,
        "transitions": transitions,
        "attribution": {
            "window": list(attribute_window) if attribute_window else None,
            "windowTotal": window_total,
            "hitCount": len(hits),
            "reconciled": window_total == len(hits),
            "hits": hits,
        },
        "pngs": pngs,
        "final": {
            "watch": final_watch,
            "playerParty": [{"species": m["species"], "hp": m["hp"]} for m in final_snapshot["parties"]["player"]],
            "opponentParty": [{"species": m["species"], "hp": m["hp"]} for m in final_snapshot["parties"]["opponent"]],
            "battleOutcome": final_snapshot["battleOutcome"],
        },
        "framebufferSha256": framebuffer,
    }
    ARGS.output.write_text(json.dumps(result, indent=1) + "\n")
    print(
        f"wrote {ARGS.output}: total={total} attributed={len(hits)}/{window_total} messages={len(messages)}",
        flush=True,
    )


if __name__ == "__main__":
    main()
