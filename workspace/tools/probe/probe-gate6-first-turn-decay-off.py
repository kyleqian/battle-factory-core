#!/usr/bin/env python3
"""Compact, read-only Battle Scene OFF receipt probe for Gate-6 ISFIRSTTURN DECAY.

Run only through tools/run-mgba-probe.py.  The fixture stages complete legal
three-mon parties.  Player lead MAKUHITA (FRONTIER_MON_MAKUHITA, set 22, the
FAKE OUT rental row) commits FAKE OUT on turns 1 and 2 into an opponent whose
three mons each carry four identical HARDEN slots (one legal AI choice, and the
battle never ends).  Player bench slot 1 is NINJASK (FRONTIER_MON_NINJASK_1,
set 238; abilitySlot 0 is ABILITY_SPEED_BOOST -- NINJASK's ability array is
{SPEED_BOOST, NONE}), shifted in on turn 3 so its SPEED BOOST switch-in
suppression and its first real activation land in the same trace.

Source under test: src/battle_main.c TurnValuesCleanUp(FALSE) (4857-4891),
called once per turn from BattleTurnPassed (:3974):

    if (gDisableStructs[i].isFirstTurn) gDisableStructs[i].isFirstTurn--;

Readers: Cmd_jumpifnotfirstturn (data/battle_scripts_1.s:2048-2052,
BattleScript_EffectFakeOut's only consumer) and ABILITYEFFECT_ENDTURN's
ABILITY_SPEED_BOOST gate `gDisableStructs[battler].isFirstTurn != 2`
(src/battle_util.c:2642-2652).

The probe samples EVERY controller frame and retains gDisableStructs[].isFirstTurn
(offset 0x16 of the 28-byte struct: include/battle.h struct DisableStruct;
sizeof confirmed by pokeemerald.map gDisableStructs 0x020242bc ->
gPauseCounterBattle 0x0202432c = 0x70 = 4 * 28), the displayed battle string,
the player's Speed stat stage, and the Random() call count.  It stages no
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
DISABLE_STRUCT_SIZE = 28
DISABLE_STRUCT_IS_FIRST_TURN = 0x16
DISABLE_STRUCT_RECHARGE_TIMER = 0x1A


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
    ("attack", ["FAKE OUT turn 1: isFirstTurn == 1, flinch lands"]),
    ("attack", ["FAKE OUT turn 2: isFirstTurn == 0, But it failed!"]),
    ("shift1", ["shift NINJASK in: isFirstTurn := 2, SPEED BOOST suppressed"]),
    ("attack", ["NINJASK's first full turn: isFirstTurn == 1, SPEED BOOST fires"]),
    ("attack", ["NINJASK second full turn: isFirstTurn == 0, SPEED BOOST fires"]),
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
    disable_structs = symbols["gDisableStructs"]

    def disable(battler: int, offset: int) -> int:
        return oracle.read_u8(disable_structs + battler * DISABLE_STRUCT_SIZE + offset)

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
            "isFirstTurn": [disable(i, DISABLE_STRUCT_IS_FIRST_TURN) for i in range(2)],
            "rechargeTimer": [disable(i, DISABLE_STRUCT_RECHARGE_TIMER) for i in range(2)],
            "player": {
                "partyIndex": player["partyIndex"],
                "species": player["species"],
                "speedStage": player["statStages"][3],
                "speed": player["stats"]["speed"],
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
    is_first_turn_events: list[dict] = []
    speed_stage_events: list[dict] = []
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
        if after["isFirstTurn"] != previous["isFirstTurn"]:
            is_first_turn_events.append({
                "frame": frame,
                "before": previous["isFirstTurn"],
                "after": after["isFirstTurn"],
                "playerPartyIndex": after["player"]["partyIndex"],
            })
        if after["player"]["speedStage"] != previous["player"]["speedStage"]:
            speed_stage_events.append({
                "frame": frame,
                "before": previous["player"]["speedStage"],
                "after": after["player"]["speedStage"],
                "playerSpecies": after["player"]["species"],
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
            "isFirstTurnAtPrompt": previous["isFirstTurn"],
            "playerPartyIndex": previous["player"]["partyIndex"],
            "playerSpeedStage": previous["player"]["speedStage"],
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
        "schema": "gate6-first-turn-decay-off-semantic-receipt/v1",
        "fixture": str(FIXTURE_PATH.as_posix()),
        "oracleProfile": PROFILE,
        "seed": request["seed"],
        "sampledEveryControllerFrame": True,
        "totalFrames": frame,
        "parties": {
            "playerLeadFakeOut": {
                "species": parties["player"][0]["species"],
                "ability": parties["player"][0]["ability"],
                "moves": parties["player"][0]["moves"],
            },
            "playerBenchSpeedBoost": {
                "species": parties["player"][1]["species"],
                "ability": parties["player"][1]["ability"],
                "moves": parties["player"][1]["moves"],
            },
            "opponentLead": {
                "species": parties["opponent"][0]["species"],
                "ability": parties["opponent"][0]["ability"],
                "moves": parties["opponent"][0]["moves"],
            },
        },
        "initial": initial,
        "turnMarks": turn_marks,
        "isFirstTurnEvents": is_first_turn_events,
        "speedStageEvents": speed_stage_events,
        "messageEvents": message_events,
        "totalRandomCalls": total_random_calls,
        "final": final,
        "framebufferSha256": hashlib.sha256(oracle.screen_rgb()).hexdigest(),
    }
    OUTPUT_PATH.write_text(json.dumps(result, indent=2) + "\n")
    print(
        f"wrote {OUTPUT_PATH}: frames={frame} "
        f"isFirstTurnAtPrompt={[m['isFirstTurnAtPrompt'] for m in turn_marks]} "
        f"speedStageEvents={len(speed_stage_events)}",
        flush=True,
    )


if __name__ == "__main__":
    main()
