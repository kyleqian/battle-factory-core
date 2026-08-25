#!/usr/bin/env python3
"""Compact, read-only Battle Scene OFF receipt probe for Gate-6 LEPPA BERRY.

Run only through tools/run-mgba-probe.py.  The fixture stages complete legal
three-mon parties: Nidoking (set 606, Poison Point, holding a LEPPA BERRY)
commits HORN DRILL (5 PP) every turn into a pure-Ghost Misdreavus (set 566)
whose four slots are all MEAN LOOK, so Nidoking is never damaged and Horn
Drill can never connect.  On the turn slot 0 reaches 0 PP the end-turn
ITEMEFFECT_NORMAL poll fires HOLD_EFFECT_RESTORE_PP.

Source: src/battle_util.c ItemBattleEffects case HOLD_EFFECT_RESTORE_PP —
guarded by `if (!moveTurn)`, scans MON_DATA_MOVE1..4 for the FIRST slot with
0 PP, adds battlerHoldEffectParam capped at CalculatePPWithBonus, prepares
gBattleTextBuff1 with that move and runs BattleScript_BerryPPHealEnd2.
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
        "pp": mon["pp"],
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

    def compact() -> dict:
        state = lab.snapshot()
        player = state["battlers"]["player"]
        opponent = state["battlers"]["opponent"]
        record = state["parties"]["player"][0]
        raw = [
            oracle.read_u8(symbols["gDisplayedStringBattle"] + offset)
            for offset in range(DISPLAYED_STRING_BYTES)
        ]
        return {
            "rngValue": state["rngValue"],
            "player": {
                "partyIndex": player["partyIndex"],
                "species": player["species"],
                "item": player["item"],
                "hp": player["hp"],
                "maxHp": player["maxHp"],
                "status1": player["status1"],
                "pp": player["pp"],
            },
            "playerRecord": {"item": record["item"], "pp": record["pp"]},
            "opponent": {
                "partyIndex": opponent["partyIndex"],
                "species": opponent["species"],
                "ability": opponent["ability"],
                "hp": opponent["hp"],
                "maxHp": opponent["maxHp"],
                "pp": opponent["pp"],
            },
            "currentMove": oracle.read_u16(symbols["gCurrentMove"]),
            "displayedString": decode_displayed(raw),
        }

    initial = compact()
    before = initial
    previous_message = initial["displayedString"]
    random_before = oracle.read_u32(SRANDCOUNT_ADDR)
    message_events: list[dict] = []
    pp_timeline: list[dict] = []
    item_timeline: list[dict] = []
    turn_random_calls: list[int] = []
    pending_random = 0
    restore_event: dict | None = None

    for frame, buttons in iter_trace_frames(request["trace"]):
        oracle.advance(buttons)
        after = compact()
        random_after = oracle.read_u32(SRANDCOUNT_ADDR)
        pending_random += (random_after - random_before) & 0xFFFFFFFF

        if after["player"]["pp"][0] != before["player"]["pp"][0]:
            pp_timeline.append({
                "frame": frame,
                "ppBefore": before["player"]["pp"][0],
                "ppAfter": after["player"]["pp"][0],
                "recordPp": after["playerRecord"]["pp"][0],
                "randomCallsSincePreviousChange": pending_random,
                "rngValue": after["rngValue"],
            })
            turn_random_calls.append(pending_random)
            pending_random = 0
            if (
                restore_event is None
                and before["player"]["pp"][0] == 0
                and after["player"]["pp"][0] > 0
            ):
                restore_event = {"frame": frame, **after}

        if after["player"]["item"] != before["player"]["item"]:
            item_timeline.append({
                "frame": frame,
                "itemBefore": before["player"]["item"],
                "itemAfter": after["player"]["item"],
                "recordItem": after["playerRecord"]["item"],
                "pp": after["player"]["pp"],
            })

        message = after["displayedString"]
        if message and message != previous_message:
            message_events.append({"frame": frame, "text": message})
        previous_message = message

        before = after
        random_before = random_after

    final = compact()
    if restore_event is None:
        raise RuntimeError(
            f"LEPPA BERRY never restored PP within the fixture trace; pp timeline={pp_timeline}"
        )

    horn_drill_uses = [row for row in pp_timeline if row["ppAfter"] < row["ppBefore"]]
    result = {
        "schema": "gate6-leppa-berry-off-semantic-receipt/v1",
        "fixture": str(FIXTURE_PATH.as_posix()),
        "oracleProfile": PROFILE,
        "seed": request["seed"],
        "sampledEveryTraceFrame": True,
        "parties": {
            "leppaNidoking": party_identity(parties["player"][0]),
            "ghostMisdreavus": party_identity(parties["opponent"][0]),
        },
        "initial": initial,
        "ppTimeline": pp_timeline,
        "itemTimeline": item_timeline,
        "hornDrillUsesBeforeRestore": len(horn_drill_uses),
        "restore": {
            "frame": restore_event["frame"],
            "ppAfter": restore_event["player"]["pp"],
            "recordPpAfter": restore_event["playerRecord"]["pp"],
            "itemAfter": restore_event["player"]["item"],
            "recordItemAfter": restore_event["playerRecord"]["item"],
        },
        "messageEvents": message_events,
        "final": final,
        "framebufferSha256": hashlib.sha256(oracle.screen_rgb()).hexdigest(),
    }
    OUTPUT_PATH.write_text(json.dumps(result, indent=2) + "\n")
    print(
        f"wrote {OUTPUT_PATH}: restore at frame {restore_event['frame']} after "
        f"{len(horn_drill_uses)} HORN DRILL uses; pp={result['restore']['ppAfter']} "
        f"item={result['restore']['itemAfter']}",
        flush=True,
    )


if __name__ == "__main__":
    main()
