#!/usr/bin/env python3
"""Read-only Battle Scene OFF receipt probe for ISSUES #131 (ENDTURN_ORDER).

Run only through tools/run-mgba-probe.py.

Source under test: `battle_util.c:1199-1218` `DoFieldEndTurnEffects` case
`ENDTURN_ORDER` identity-fills `gBattlerByTurnOrder` and bubble-sorts it with
`GetWhoStrikesFirst(order[i], order[j], FALSE)` (`battle_main.c:4595-4753`,
speed-tie `Random() & 1` at `:4728`/`:4745`) at the top of EVERY end-turn
pass, i.e. after the turn's actions have already run.

The probe samples every controller trace frame and records
  * `gBattlerByTurnOrder[0..3]` transitions (the array itself, at 0x202407e),
  * `gBattleMainFunc` sampled BEFORE each advance, so a frame's `Random()`
    draws are attributed to the main-func that executed during it
    (`BattleTurnPassed` is `battle_main.c:3956`; it both runs the end-turn
    pass and, on its clean exit at `:4013`, draws `gRandomTurnNumber`),
  * `sRandCount` deltas per frame (total and BattleTurnPassed-attributed),
  * `gDisplayedStringBattle` message transitions.

It never stages transient battle state: parties are complete legal records
and every effect is produced by real moves.
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit(f"usage: {sys.argv[0]} <fixture.json> <output.json>")

FIXTURE_PATH = Path(sys.argv[1])
OUTPUT_PATH = Path(sys.argv[2])
WORKTREE_ROOT = Path(__file__).resolve().parents[2]
PROFILE = "battle-scene-off"
SRANDCOUNT_ADDR = 0x020249C0
DISPLAYED_STRING_BYTES = 128


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


def decode_displayed(raw: list[int]) -> str:
    chars: list[str] = []
    punctuation = {
        0x00: " ", 0xAB: "!", 0xAC: "?", 0xAD: ".", 0xAE: "-",
        0xB4: "’", 0xB8: ",", 0xBA: "/", 0xF0: ":",
    }
    for value in raw:
        if value == 0xFF:
            break
        if value == 0xFE:
            chars.append("\n")
        elif value in punctuation:
            chars.append(punctuation[value])
        elif 0xA1 <= value <= 0xAA:
            chars.append(str(value - 0xA1))
        elif 0xBB <= value <= 0xD4:
            chars.append(chr(ord("A") + value - 0xBB))
        elif 0xD5 <= value <= 0xEE:
            chars.append(chr(ord("a") + value - 0xD5))
        elif value in (0xFA, 0xFB):
            chars.append("\n")
        else:
            chars.append(f"<{value:02X}>")
    return "".join(chars)


def iter_trace_frames(trace: dict):
    frame = 0
    for segment in trace["segments"]:
        for _ in range(int(segment["frames"])):
            frame += 1
            yield frame, segment.get("buttons", [])


def party_identity(mon: dict) -> dict:
    return {
        "species": mon["species"],
        "item": mon["item"],
        "abilitySlot": mon["abilitySlot"],
        "ability": mon["ability"],
        "moves": mon["moves"],
    }


def main() -> None:
    fixture = json.loads(FIXTURE_PATH.read_text())
    request = validate_request(fixture, PROFILE)
    reference = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
    oracle = EmeraldOracle(
        reference / "pokeemerald.gba",
        reference / "pokeemerald.map",
        ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json",
    )
    lab = BattleLab(oracle, PROFILE)
    lab.prepare(request)
    symbols = oracle.symbols
    parties = lab.snapshot()["parties"]
    turn_order_addr = symbols["gBattlerByTurnOrder"]
    main_func_addr = symbols["gBattleMainFunc"]
    chosen_action_addr = symbols["gChosenActionByBattler"]
    battle_turn_passed = symbols["BattleTurnPassed"] | 1  # Thumb pointer

    def read_turn_order() -> list[int]:
        return [oracle.read_u8(turn_order_addr + i) for i in range(4)]

    def read_chosen_actions() -> list[int]:
        return [oracle.read_u8(chosen_action_addr + i) for i in range(2)]

    def read_message() -> str:
        return decode_displayed([
            oracle.read_u8(symbols["gDisplayedStringBattle"] + offset)
            for offset in range(DISPLAYED_STRING_BYTES)
        ])

    def actives() -> dict:
        state = lab.snapshot()["battlers"]
        return {
            side: {
                "partyIndex": state[side]["partyIndex"],
                "species": state[side]["species"],
                "speed": state[side]["stats"]["speed"],
                "statStagesSpeed": state[side]["statStages"][3],
                "hp": state[side]["hp"],
                "maxHp": state[side]["maxHp"],
                "status1": state[side]["status1"],
                "item": state[side]["item"],
            }
            for side in ("player", "opponent")
        }

    initial = {"battlerByTurnOrder": read_turn_order(), "actives": actives(),
               "weather": lab.snapshot()["weather"]}
    previous_order = initial["battlerByTurnOrder"]
    previous_message = read_message()
    previous_chosen = read_chosen_actions()
    random_before = oracle.read_u32(SRANDCOUNT_ADDR)

    message_events: list[dict] = []
    order_events: list[dict] = []
    turn_passed_windows: list[dict] = []
    total_random_calls = 0
    total_turn_passed_random_calls = 0
    open_window: dict | None = None

    for frame, buttons in iter_trace_frames(request["trace"]):
        func_before = oracle.read_u32(main_func_addr)
        oracle.advance(buttons)
        random_after = oracle.read_u32(SRANDCOUNT_ADDR)
        random_calls = (random_after - random_before) & 0xFFFFFFFF
        total_random_calls += random_calls
        random_before = random_after
        order_now = read_turn_order()

        in_turn_passed = func_before == battle_turn_passed
        if in_turn_passed:
            total_turn_passed_random_calls += random_calls
            if open_window is None:
                # First BattleTurnPassed frame of this end-turn pass: this is
                # the frame ENDTURN_ORDER (battle_util.c:1199-1218) runs in.
                open_window = {
                    "firstFrame": frame,
                    "lastFrame": frame,
                    "randomCalls": random_calls,
                    "battlerByTurnOrderBefore": previous_order,
                    "battlerByTurnOrderAfterEndturnOrder": order_now,
                    "battlerByTurnOrderAtExit": order_now,
                    "closedByChosenActionReset": False,
                }
                turn_passed_windows.append(open_window)
            else:
                open_window["lastFrame"] = frame
                open_window["randomCalls"] += random_calls
                open_window["battlerByTurnOrderAtExit"] = order_now

        # battle_main.c:4001-4004 -- BattleTurnPassed's clean exit sets every
        # gChosenActionByBattler back to B_ACTION_NONE (0xFF) in the same block
        # that draws gRandomTurnNumber (:4013). That flip is the exact end of
        # one end-turn pass.
        chosen_now = read_chosen_actions()
        if open_window is not None and chosen_now != previous_chosen and all(v == 0xFF for v in chosen_now):
            open_window["closedByChosenActionReset"] = True
            open_window["lastFrame"] = frame
            open_window = None
        previous_chosen = chosen_now

        if order_now != previous_order:
            order_events.append({
                "frame": frame,
                "from": previous_order,
                "to": order_now,
                "inBattleTurnPassed": in_turn_passed,
            })
            previous_order = order_now

        message = read_message()
        if message and message != previous_message:
            message_events.append({"frame": frame, "text": message})
        previous_message = message

    final = {"battlerByTurnOrder": read_turn_order(), "actives": actives(),
             "weather": lab.snapshot()["weather"]}

    result = {
        "schema": "issue131-endturn-order-off-semantic-receipt/v1",
        "fixture": str(FIXTURE_PATH.as_posix()),
        "oracleProfile": PROFILE,
        "seed": request["seed"],
        "sampledEveryTraceFrame": True,
        "symbols": {
            "gBattlerByTurnOrder": turn_order_addr,
            "gBattleMainFunc": main_func_addr,
            "BattleTurnPassed": symbols["BattleTurnPassed"],
            "gChosenActionByBattler": chosen_action_addr,
        },
        "parties": {
            side: [party_identity(mon) for mon in parties[side]]
            for side in ("player", "opponent")
        },
        "initial": initial,
        "orderEvents": order_events,
        "messageEvents": message_events,
        "battleTurnPassedWindows": turn_passed_windows,
        "totalRandomCalls": total_random_calls,
        "battleTurnPassedRandomCalls": total_turn_passed_random_calls,
        "final": final,
        "framebufferSha256": hashlib.sha256(oracle.screen_rgb()).hexdigest(),
    }
    OUTPUT_PATH.write_text(json.dumps(result, indent=2) + "\n")
    print(
        f"wrote {OUTPUT_PATH}: orderEvents={len(order_events)} "
        f"turnPassedWindows={len(turn_passed_windows)} "
        f"turnPassedRandom={total_turn_passed_random_calls} "
        f"totalRandom={total_random_calls}",
        flush=True,
    )


if __name__ == "__main__":
    main()
