#!/usr/bin/env python3
"""Pin the first four Battle-1 completion/menu-bounce epochs under Scene OFF.

The canonical replay comes from ``turn5-menu.json``.  Only its controller
segments are consumed; the oracle is explicitly bootstrapped from
``factory-battle-scene-off.json``.  For each post-turn action-menu boundary
the probe records:

* battle/controller state, HP, PP, and persisted move cursor;
* the transition that installs ``HandleInputChooseAction``;
* the following ``DoBounceEffect`` reset of both player-side bounce drivers;
* raw framebuffer hashes on both sides of that semantic redraw edge; and
* isolated A pulses at the installed-handler tick and the following tick.

Run through the teardown-safe wrapper:

    python3 tools/run-mgba-probe.py <fresh-output.json> -- \
      tools/probe/probe-turn1-4-epochs-off.py <fresh-output.json>
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

if len(sys.argv) != 2:
    raise SystemExit(f"usage: {sys.argv[0]} <output.json>")

OUTPUT_PATH = Path(sys.argv[1])
HERE = Path(__file__).resolve().parent
WORKTREE_ROOT = HERE.parent.parent


def find_harness_root(start: Path) -> Path:
    for candidate in (start, *start.parents):
        if (candidate / "oracle" / "emerald_core.py").is_file():
            return candidate
    raise SystemExit(f"could not find harness root above {start}")


HARNESS_ROOT = find_harness_root(WORKTREE_ROOT)
sys.path.insert(0, str(HARNESS_ROOT / "oracle"))

from emerald_core import EmeraldOracle  # noqa: E402

REFERENCE = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
ROM_PATH = REFERENCE / "pokeemerald.gba"
MAP_PATH = REFERENCE / "pokeemerald.map"
BOOTSTRAP_PATH = HARNESS_ROOT / "oracle" / "bootstrap" / "factory-battle-scene-off.json"
TRACE_PATH = WORKTREE_ROOT / "tools" / "compare" / "traces" / "turn5-menu.json"

SPRITE_SIZE = 0x44
HANDLE_INPUT_CHOOSE_ACTION = 0x08057589
PLAYER_BUFFER_RUN_COMMAND = 0x08057505
HANDLE_TURN_ACTION_SELECTION_STATE = 0x0803BE75
BATTLE_TURN_PASSED = 0x0803B9BD

# Windows are deliberately disjoint and begin after each move-confirm input.
TURN_WINDOWS = {
    "turn1": (2200, 2700),
    "turn2": (3100, 3500),
    "turn3": (4100, 4500),
    "turn4": (5300, 5700),
}


def u16(oracle: EmeraldOracle, addr: int) -> int:
    return oracle.read_u8(addr) | (oracle.read_u8(addr + 1) << 8)


def s16(oracle: EmeraldOracle, addr: int) -> int:
    value = u16(oracle, addr)
    return value - 0x10000 if value & 0x8000 else value


def source_buttons_by_tick() -> list[list[str]]:
    result: list[list[str]] = [[]]
    for segment in json.loads(TRACE_PATH.read_text())["segments"]:
        buttons = list(segment.get("buttons", []))
        result.extend([buttons] * int(segment["frames"]))
    return result


def row(oracle: EmeraldOracle, tick: int, with_sha: bool = False) -> dict:
    symbols = oracle.symbols
    battle_sprites_data = oracle.read_u32(symbols["gBattleSpritesDataPtr"])
    healthboxes_data = oracle.read_u32(battle_sprites_data + 4)
    bounce_flags = oracle.read_u8(healthboxes_data)
    healthbox_driver_id = oracle.read_u8(healthboxes_data + 2)
    mon_driver_id = oracle.read_u8(healthboxes_data + 3)
    g_sprites = symbols["gSprites"]

    def driver(driver_id: int) -> dict:
        base = g_sprites + driver_id * SPRITE_SIZE
        return {
            "id": driver_id,
            "sinIndex": u16(oracle, base + 46),
            "delta": s16(oracle, base + 48),
            "amplitude": s16(oracle, base + 50),
            "targetSpriteId": u16(oracle, base + 52),
            "which": u16(oracle, base + 54),
        }

    result = {
        "tick": tick,
        "battleMainFunc": oracle.read_u32(symbols["gBattleMainFunc"]),
        "execFlags": oracle.read_u32(symbols["gBattleControllerExecFlags"]),
        "playerControllerFunc": oracle.read_u32(symbols["gBattlerControllerFuncs"]),
        "playerCommand": oracle.read_u8(symbols["gBattleBufferA"]),
        "playerReturnAction": oracle.read_u8(symbols["gBattleBufferB"] + 1),
        "bg0Y": u16(oracle, symbols["gBattle_BG0_Y"]),
        "actionState": oracle.read_u8(symbols["gBattleCommunication"]),
        "persistedMoveSlot": oracle.read_u8(symbols["gMoveSelectionCursor"]),
        "playerPp": [oracle.read_u8(symbols["gBattleMons"] + 0x24 + i) for i in range(4)],
        "playerHp": u16(oracle, symbols["gBattleMons"] + 0x28),
        "opponentHp": u16(oracle, symbols["gBattleMons"] + 0x80),
        "healthboxIsBouncing": bool(bounce_flags & 0x02),
        "battlerIsBouncing": bool(bounce_flags & 0x04),
        "healthboxDriver": driver(healthbox_driver_id),
        "battlerDriver": driver(mon_driver_id),
    }
    if with_sha:
        result["framebufferSha256"] = hashlib.sha256(oracle.screen_rgb()).hexdigest()
    return result


def run_canonical(oracle: EmeraldOracle, buttons_by_tick: list[list[str]]) -> list[dict]:
    oracle.new_session()
    rows: list[dict] = []
    end_tick = max(end for _, end in TURN_WINDOWS.values())
    for tick in range(1, end_tick + 1):
        oracle.advance(buttons_by_tick[tick])
        if any(start <= tick <= end for start, end in TURN_WINDOWS.values()):
            rows.append(row(oracle, tick))
    return rows


def pulse_result(
    oracle: EmeraldOracle,
    buttons_by_tick: list[list[str]],
    pulse_tick: int,
) -> dict:
    oracle.new_session()
    sampled: list[dict] = []
    for tick in range(1, pulse_tick + 4):
        buttons = ["A"] if tick == pulse_tick else buttons_by_tick[tick]
        oracle.advance(buttons)
        if pulse_tick - 1 <= tick <= pulse_tick + 3:
            sampled.append(row(oracle, tick, with_sha=True))
    press = next(item for item in sampled if item["tick"] == pulse_tick)
    return {
        "pulseTick": pulse_tick,
        "acceptedActionOnPulse": (
            press["playerControllerFunc"] == PLAYER_BUFFER_RUN_COMMAND
            and press["playerReturnAction"] == 0
        ),
        "pressRow": press,
    }


def main() -> None:
    buttons_by_tick = source_buttons_by_tick()
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    canonical = run_canonical(oracle, buttons_by_tick)
    by_tick = {item["tick"]: item for item in canonical}
    boundaries = {}

    for label, (start, end) in TURN_WINDOWS.items():
        ready_ticks = [
            tick
            for tick in range(start + 1, end + 1)
            if by_tick[tick]["playerControllerFunc"] == HANDLE_INPUT_CHOOSE_ACTION
            and by_tick[tick - 1]["playerControllerFunc"] != HANDLE_INPUT_CHOOSE_ACTION
        ]
        if len(ready_ticks) != 1:
            raise AssertionError(f"{label}: expected one handler-install edge, got {ready_ticks}")
        handler_tick = ready_ticks[0]

        reset_ticks = [
            tick
            for tick in range(handler_tick, min(handler_tick + 4, end) + 1)
            if by_tick[tick]["healthboxIsBouncing"]
            and by_tick[tick]["battlerIsBouncing"]
            and not (
                by_tick[tick - 1]["healthboxIsBouncing"]
                and by_tick[tick - 1]["battlerIsBouncing"]
            )
        ]
        if len(reset_ticks) != 1:
            raise AssertionError(f"{label}: expected one bounce reset edge, got {reset_ticks}")
        reset_tick = reset_ticks[0]

        main_transitions = [
            item
            for item in canonical
            if start <= item["tick"] <= handler_tick
            and item["battleMainFunc"] in (BATTLE_TURN_PASSED, HANDLE_TURN_ACTION_SELECTION_STATE)
            and item["battleMainFunc"] != by_tick[item["tick"] - 1]["battleMainFunc"]
        ]
        selected_ticks = sorted(
            {
                handler_tick - 2,
                handler_tick - 1,
                handler_tick,
                reset_tick,
                reset_tick + 1,
                *[item["tick"] for item in main_transitions],
            }
        )

        # Re-run just far enough to attach framebuffer hashes to the small
        # selected row set; the first pass keeps the full scan inexpensive.
        oracle.new_session()
        selected_rows = []
        for tick in range(1, max(selected_ticks) + 1):
            oracle.advance(buttons_by_tick[tick])
            if tick in selected_ticks:
                selected_rows.append(row(oracle, tick, with_sha=True))

        boundaries[label] = {
            "handlerInstalledTick": handler_tick,
            "bounceResetAndFirstInputTick": reset_tick,
            "postTurnFacts": {
                "playerHp": by_tick[reset_tick]["playerHp"],
                "opponentHp": by_tick[reset_tick]["opponentHp"],
                "playerPp": by_tick[reset_tick]["playerPp"],
                "persistedMoveSlot": by_tick[reset_tick]["persistedMoveSlot"],
            },
            "canonicalRows": selected_rows,
            "inputCandidates": [
                pulse_result(oracle, buttons_by_tick, handler_tick),
                pulse_result(oracle, buttons_by_tick, reset_tick),
            ],
        }

    output = {
        "sourceTrace": str(TRACE_PATH.relative_to(WORKTREE_ROOT)),
        "oracleProfile": "battle-scene-off",
        "functionPointers": {
            "BattleTurnPassed": BATTLE_TURN_PASSED,
            "HandleTurnActionSelectionState": HANDLE_TURN_ACTION_SELECTION_STATE,
            "HandleInputChooseAction": HANDLE_INPUT_CHOOSE_ACTION,
            "PlayerBufferRunCommand": PLAYER_BUFFER_RUN_COMMAND,
        },
        "boundaries": boundaries,
    }
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(output, indent=2))
    print(f"wrote {OUTPUT_PATH}")


main()
