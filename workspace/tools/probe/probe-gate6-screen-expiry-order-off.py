#!/usr/bin/env python3
"""Compact, read-only Battle Scene OFF receipt probe for Gate-6 SCREEN EXPIRY ORDER.

Run only through tools/run-mgba-probe.py.  The fixture stages complete legal
three-mon parties: player lead SUNKERN (FRONTIER_MON_SUNKERN, catalog index 0,
the LIGHT SCREEN rental row) faces opponent lead HOOTHOOT
(FRONTIER_MON_HOOTHOOT, index 38, the REFLECT rental row).  Every slot on both
leads is staged as that one move, so turn 1 puts BOTH screens up (timer 5 each)
and turns 2-5 are inert re-uses ("But it failed!").  Nothing deals damage, so
the battle simply runs to the turn both timers hit 0.

Source under test: src/battle_util.c DoFieldEndTurnEffects (1220-1315).  Each of
ENDTURN_REFLECT (:1221), ENDTURN_LIGHT_SCREEN (:1246), ENDTURN_MIST (:1272) and
ENDTURN_SAFEGUARD (:1294) owns its OWN `while (gBattleStruct->turnSideTracker <
2)` loop, and turnSideTracker resets to 0 only when the case ends without
firing.  The traversal is therefore CASE-major -- Reflect(side 0),
Reflect(side 1), LightScreen(side 0), LightScreen(side 1), Mist(0), Mist(1),
Safeguard(0), Safeguard(1) -- so with the player's Light Screen (side 0) and the
opponent's Reflect (side 1) expiring on the same turn the ROM prints the REFLECT
message FIRST.

The probe samples EVERY controller frame and retains gSideStatuses, the four
gSideTimers counters per side, and the displayed battle string.  It stages no
transient battle state; every action is real controller input.
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


# Per-turn controller plan.  "attack" = FIGHT then move slot 0; "shift1" = the
# POKeMON -> bench slot 1 -> SHIFT dance (the same button script the Gate-6
# ARENA TRAP fixtures use).
TURN_PLAN = [
    ("attack", ["turn 1: LIGHT SCREEN (player, side 0) and REFLECT (opponent, side 1) both go up, timer 5"]),
    ("attack", ["turn 2: both re-uses fail; timers 4"]),
    ("attack", ["turn 3: timers 3"]),
    ("attack", ["turn 4: timers 2"]),
    ("attack", ["turn 5: timers 1 -> 0, both screens expire in the SAME end-turn pass"]),
]

# The POKeMON -> bench slot 1 -> SHIFT dance uses the same fixed button script
# the Gate-6 ARENA TRAP fixtures already prove out.
SHIFT_SLOT1_SCRIPT = [
    ("DOWN", 2, 38), ("A", 2, 118), ("RIGHT", 2, 38), ("A", 2, 38), ("A", 2, 38),
]
PROMPT_SETTLE_FRAMES = 60


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
    def displayed() -> str:
        raw = [
            oracle.read_u8(symbols["gDisplayedStringBattle"] + offset)
            for offset in range(DISPLAYED_STRING_BYTES)
        ]
        return decode_displayed(raw)

    def compact() -> dict:
        state = lab.snapshot()
        player = state["battlers"]["player"]
        opponent = state["battlers"]["opponent"]
        return {
            "battleMainFunc": oracle.read_u32(symbols["gBattleMainFunc"]),
            "sideStatuses": state["sideStatuses"],
            "sideConditions": state["sideConditions"],
            "player": {
                "partyIndex": player["partyIndex"],
                "species": player["species"],
                "hp": player["hp"],
                "pp": player["pp"],
            },
            "opponent": {
                "partyIndex": opponent["partyIndex"],
                "species": opponent["species"],
                "hp": opponent["hp"],
                "pp": opponent["pp"],
            },
            "displayedString": displayed(),
        }

    frame = 0
    message_events: list[dict] = []
    side_timer_events: list[dict] = []
    side_status_events: list[dict] = []
    previous = compact()
    initial = previous
    previous_message = previous["displayedString"]
    random_before = oracle.read_u32(SRANDCOUNT_ADDR)
    total_random_calls = 0

    def step(buttons: list[str]) -> dict:
        nonlocal frame, previous, previous_message, random_before, total_random_calls
        oracle.advance(buttons)
        frame += 1
        after = compact()
        random_after = oracle.read_u32(SRANDCOUNT_ADDR)
        total_random_calls += (random_after - random_before) & 0xFFFFFFFF
        random_before = random_after
        if after["sideConditions"] != previous["sideConditions"]:
            side_timer_events.append({
                "frame": frame,
                "before": previous["sideConditions"],
                "after": after["sideConditions"],
            })
        if after["sideStatuses"] != previous["sideStatuses"]:
            side_status_events.append({
                "frame": frame,
                "before": previous["sideStatuses"],
                "after": after["sideStatuses"],
            })
        message = after["displayedString"]
        if message and message != previous_message:
            message_events.append({"frame": frame, "text": message})
        previous_message = message
        previous = after
        return after

    # `lab.prepare` leaves the battle parked in HandleTurnActionSelectionState
    # (`src/battle_main.c:4012` is what BattleTurnPassed re-arms every turn), so
    # the gBattleMainFunc value observed at frame 0 IS that function pointer and
    # doubles as an exact turn-boundary sentinel -- the symbol itself is static
    # and absent from pokeemerald.map.
    action_selection_func = previous["battleMainFunc"]

    def at_action_prompt() -> bool:
        return previous["battleMainFunc"] == action_selection_func

    def commit_with_a(max_attempts: int = 10, gap: int = 40) -> None:
        """FIGHT, then move slot 0 -- keep tapping A until the turn commits."""
        for _ in range(max_attempts):
            step(["A"])
            step(["A"])
            for _ in range(gap):
                step([])
                if not at_action_prompt():
                    return
        raise RuntimeError(
            f"A presses never committed the turn (frame={frame}, "
            f"displayed={previous['displayedString']!r})"
        )

    def wait_for_prompt(limit: int = 4000) -> None:
        for _ in range(limit):
            step([])
            if at_action_prompt():
                for _ in range(PROMPT_SETTLE_FRAMES):
                    step([])
                return
        tail = [f"{e['frame']}:{e['text']!r}" for e in message_events[-14:]]
        raise RuntimeError(
            f"no action prompt within {limit} frames (frame={frame}); "
            f"last displayed={previous['displayedString']!r}; messages={tail}"
        )

    turn_marks: list[dict] = []
    for index, (kind, notes) in enumerate(TURN_PLAN):
        turn = index + 1
        if turn != 1:
            wait_for_prompt()
        turn_marks.append({
            "turn": turn,
            "kind": kind,
            "notes": notes,
            "frameAtPrompt": frame,
            "sideStatusesAtPrompt": previous["sideStatuses"],
            "sideConditionsAtPrompt": previous["sideConditions"],
        })
        if kind == "attack":
            commit_with_a()
        else:
            for button, hold, wait in SHIFT_SLOT1_SCRIPT:
                for _ in range(hold):
                    step([button])
                for _ in range(wait):
                    step([])
            for _ in range(600):
                if not at_action_prompt():
                    break
                step([])
            else:
                raise RuntimeError(f"SHIFT never committed the turn (frame={frame})")

    # Settle the final turn so its end-of-turn effects and prompt are captured.
    wait_for_prompt()
    final = previous

    result = {
        "schema": "gate6-screen-expiry-order-off-semantic-receipt/v1",
        "fixture": str(FIXTURE_PATH.as_posix()),
        "oracleProfile": PROFILE,
        "seed": request["seed"],
        "sampledEveryControllerFrame": True,
        "totalFrames": frame,
        "parties": {
            "playerLeadLightScreen": {
                "species": parties["player"][0]["species"],
                "ability": parties["player"][0]["ability"],
                "moves": parties["player"][0]["moves"],
            },
            "opponentLeadReflect": {
                "species": parties["opponent"][0]["species"],
                "ability": parties["opponent"][0]["ability"],
                "moves": parties["opponent"][0]["moves"],
            },
        },
        "initial": initial,
        "turnMarks": turn_marks,
        "sideTimerEvents": side_timer_events,
        "sideStatusEvents": side_status_events,
        "messageEvents": message_events,
        "totalRandomCalls": total_random_calls,
        "final": final,
        "framebufferSha256": hashlib.sha256(oracle.screen_rgb()).hexdigest(),
    }
    OUTPUT_PATH.write_text(json.dumps(result, indent=2) + "\n")
    print(
        f"wrote {OUTPUT_PATH}: frames={frame} "
        f"sideStatusEvents={len(side_status_events)} "
        f"expiry={[e['text'] for e in message_events if 'wore off' in e['text']]}",
        flush=True,
    )


if __name__ == "__main__":
    main()
