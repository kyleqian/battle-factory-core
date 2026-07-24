#!/usr/bin/env python3
"""Stage the real Factory loss lobby script from a late Battle-1 OFF prefix.

This is an oracle-only evidence tool.  It replays the canonical first battle
through its existing post-win swap screen, then performs the smallest field
handoff that the Factory battle-room loss branch itself performs: write the
challenge status, install its destination map/coordinates, and re-enter the
ordinary map loader.  The map's own OnWarp/OnFrame scripts then render the
return/save flow; this tool never writes message, task, window, or renderer
state.

Run through tools/run-mgba-probe.py with a fresh output path.
"""

from __future__ import annotations

import hashlib
import json
import os
import sys
from pathlib import Path


if len(sys.argv) != 2:
    raise SystemExit(f"usage: {sys.argv[0]} <fresh-output.json>")

OUTPUT_PATH = Path(sys.argv[1])
RGB_DIR = Path(os.environ["FACTORY_LOSS_RGB_DIR"]) if os.environ.get("FACTORY_LOSS_RGB_DIR") else None
HERE = Path(__file__).resolve().parent
WORKTREE_ROOT = HERE.parent.parent


def find_harness_root(start: Path) -> Path:
    for candidate in (start, *start.parents):
        if (candidate / "oracle" / "emerald_core.py").is_file():
            return candidate
    raise SystemExit(f"could not find harness root above {start}")


HARNESS_ROOT = find_harness_root(WORKTREE_ROOT)
ORACLE_DIR = HARNESS_ROOT / "oracle"
sys.path.insert(0, str(ORACLE_DIR))

from emerald_core import EmeraldOracle  # noqa: E402


REFERENCE = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
ROM_PATH = REFERENCE / "pokeemerald.gba"
MAP_PATH = REFERENCE / "pokeemerald.map"
BOOTSTRAP_PATH = ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json"
PREFIX_PATH = WORKTREE_ROOT / "tools" / "compare" / "traces-groundtruth" / "battle1-postwin-dense.json"

# `BattleFactoryBattleRoom_EventScript_WarpToLobbyLost` sets this exact value
# before its singles warp.  These group/number values are MAP_* constants,
# not screen coordinates: map_groups.h gives Factory Lobby = (31 | 26 << 8).
CHALLENGE_STATUS_LOST = 4
FACTORY_LOBBY_GROUP = 26
FACTORY_LOBBY_NUM = 31
FACTORY_BATTLE_ROOM_GROUP = 26
FACTORY_BATTLE_ROOM_NUM = 33
WARP_ID_NONE = 0xFF
LOBBY_X = 4
LOBBY_Y = 8

# Battle-1 post-win trace ends at the source-owned swap screen.  It avoids a
# later battle replay while retaining the canonical Factory party/status data.
PREFIX_TICK = 29601
DENSE_FRAMES = 720
# The loss message has page breaks.  These sparse, source-relative A presses
# clear its two text waits only after the printer has settled; no staged
# message/menu state is supplied.  The final idle tail leaves the record
# prompt visible for later app-comparison input experiments.
IDLE_INPUTS = {80: ["A"], 160: ["A"]}
RECORD_B_INPUTS = {**IDLE_INPUTS, 600: ["B"]}
SAVE_BLOCK1_LOCATION = 0x04  # struct SaveBlock1.location
# The offsets below are the absolute SaveBlock2 layout offsets printed in
# struct BattleFrontier's source comments (for example challengeStatus 0xCA8),
# not offsets relative to the frontier sub-struct.
FRONTIER_CHALLENGE_STATUS = 0xCA8
GMAIN_CALLBACK2 = 0x004
GMAIN_STATE = 0x438


def u16(oracle: EmeraldOracle, addr: int) -> int:
    return oracle.read_u8(addr) | (oracle.read_u8(addr + 1) << 8)


def u32(oracle: EmeraldOracle, addr: int) -> int:
    return oracle.read_u32(addr)


def write_u16(oracle: EmeraldOracle, addr: int, value: int) -> None:
    oracle.write_u8(addr, value & 0xFF)
    oracle.write_u8(addr + 1, value >> 8)


def write_u32(oracle: EmeraldOracle, addr: int, value: int) -> None:
    for offset in range(4):
        oracle.write_u8(addr + offset, value >> (offset * 8))


def write_warp(oracle: EmeraldOracle, addr: int, group: int, num: int, warp_id: int, x: int, y: int) -> None:
    # struct WarpData is five signed bytes: group, map, warp, x, y.
    for offset, value in enumerate((group, num, warp_id, x, y)):
        oracle.write_u8(addr + offset, value & 0xFF)


def read_warp(oracle: EmeraldOracle, addr: int) -> dict[str, int]:
    names = ("group", "map", "warpId", "x", "y")
    return {name: oracle.read_u8(addr + index) for index, name in enumerate(names)}


def frontier_base(oracle: EmeraldOracle) -> int:
    return u32(oracle, oracle.symbols["gSaveBlock2Ptr"])


def save1_base(oracle: EmeraldOracle) -> int:
    return u32(oracle, oracle.symbols["gSaveBlock1Ptr"])


def frame(oracle: EmeraldOracle, tick: int) -> dict[str, object]:
    save1 = save1_base(oracle)
    frontier = frontier_base(oracle)
    rgb = oracle.screen_rgb()
    if RGB_DIR is not None and 1 <= tick <= 210:
        RGB_DIR.mkdir(parents=True, exist_ok=True)
        (RGB_DIR / f"{tick:03d}.rgb").write_bytes(rgb)
    return {
        "tick": tick,
        "sha256": hashlib.sha256(rgb).hexdigest(),
        "playerPosition": {"x": u16(oracle, save1), "y": u16(oracle, save1 + 2)},
        "bgOffsets": {
            "bg1x": u16(oracle, 0x04000010),
            "bg1y": u16(oracle, 0x04000012),
            "bg2x": u16(oracle, 0x04000014),
            "bg2y": u16(oracle, 0x04000016),
            "bg3x": u16(oracle, 0x04000018),
            "bg3y": u16(oracle, 0x0400001A),
        },
        "location": read_warp(oracle, save1 + SAVE_BLOCK1_LOCATION),
        "challengeStatus": oracle.read_u8(frontier + FRONTIER_CHALLENGE_STATUS),
        "battleNum": u16(oracle, frontier + 0xCB2),
        "activeFlags": u32(oracle, frontier + 0xCDC),
        "factorySingles50Streak": u16(oracle, frontier + 0xDE2),
        "factorySingles50Rents": u16(oracle, frontier + 0xDF6),
        "battlePoints": u16(oracle, frontier + 0xEB8),
        "callback2": u32(oracle, oracle.symbols["gMain"] + GMAIN_CALLBACK2),
        "mainState": oracle.read_u8(oracle.symbols["gMain"] + GMAIN_STATE),
    }


def run_case(oracle: EmeraldOracle, trace: dict, inputs: dict[int, list[str]]) -> dict[str, object]:
    oracle.new_session()
    tick = 0
    for segment in trace["segments"]:
        for _ in range(int(segment["frames"])):
            oracle.advance(segment.get("buttons", []))
            tick += 1
    if tick != PREFIX_TICK:
        raise AssertionError(f"expected canonical prefix tick {PREFIX_TICK}, got {tick}")

    save1 = save1_base(oracle)
    frontier = frontier_base(oracle)
    before = frame(oracle, tick)

    # These correspond exactly to source actions in the loss branch: status
    # write plus `warp MAP_BATTLE_FRONTIER_BATTLE_FACTORY_LOBBY, 4, 8`.
    # Re-entering CB2_LoadMap is the smallest public field-loader seam after
    # those writes; no field-script instruction pointer is forged.
    oracle.write_u8(frontier + FRONTIER_CHALLENGE_STATUS, CHALLENGE_STATUS_LOST)
    write_warp(oracle, save1 + SAVE_BLOCK1_LOCATION, FACTORY_LOBBY_GROUP, FACTORY_LOBBY_NUM, WARP_ID_NONE, LOBBY_X, LOBBY_Y)
    write_warp(oracle, oracle.symbols["gLastUsedWarp"], FACTORY_BATTLE_ROOM_GROUP, FACTORY_BATTLE_ROOM_NUM, WARP_ID_NONE, LOBBY_X, LOBBY_Y)
    oracle.write_u8(oracle.symbols["gMain"] + GMAIN_STATE, 0)
    write_u32(oracle, oracle.symbols["gMain"] + GMAIN_CALLBACK2, oracle.symbols["CB2_LoadMap"] | 1)

    staged = frame(oracle, tick)
    if staged["challengeStatus"] != CHALLENGE_STATUS_LOST or staged["location"] != {
        "group": FACTORY_LOBBY_GROUP, "map": FACTORY_LOBBY_NUM, "warpId": WARP_ID_NONE, "x": LOBBY_X, "y": LOBBY_Y
    }:
        raise AssertionError(f"loss handoff stage did not stick: {staged}")

    captures = []
    for relative in range(1, DENSE_FRAMES + 1):
        buttons = inputs.get(relative, [])
        oracle.advance(buttons)
        capture = frame(oracle, relative)
        if buttons:
            capture["buttons"] = buttons
        captures.append(capture)

    return {
        "before": before,
        "staged": staged,
        "inputSchedule": [{"relativeTick": tick, "buttons": buttons} for tick, buttons in inputs.items()],
        "captures": captures,
    }


def main() -> None:
    trace = json.loads(PREFIX_PATH.read_text())
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    idle = run_case(oracle, trace, IDLE_INPUTS)
    record_b = run_case(oracle, trace, RECORD_B_INPUTS)
    idle_at_210 = idle["captures"][209]
    if idle_at_210["challengeStatus"] != 0 or idle_at_210["activeFlags"] != 0:
        raise AssertionError(f"loss source flow did not save/clear active state at +210: {idle_at_210}")
    if any(idle_at_210[field] != idle["staged"][field] for field in ("battleNum", "factorySingles50Streak", "factorySingles50Rents")):
        raise AssertionError(f"loss path mutated a non-loss counter: staged={idle['staged']} endpoint={idle_at_210}")
    if not any(
        idle_capture["sha256"] != b_capture["sha256"]
        for idle_capture, b_capture in zip(idle["captures"][600:], record_b["captures"][600:])
    ):
        raise AssertionError("record-prompt B control did not change the normal source-owned endpoint")
    output = {
        "schema": "factory-loss-ending-stage/v1",
        "oracleProfile": "battle-scene-off",
        "sourceTrace": str(PREFIX_PATH.relative_to(WORKTREE_ROOT)),
        "construction": {
            "canonicalPrefixTick": PREFIX_TICK,
            "stageBoundary": "late canonical Battle-1 post-win swap screen -> Factory battle-room loss handoff",
            "writes": [
                {"target": "gSaveBlock2Ptr->frontier.challengeStatus", "offset": "0xCA8", "value": CHALLENGE_STATUS_LOST, "source": "BattleFactoryBattleRoom/scripts.inc:88-90"},
                {"target": "gSaveBlock1Ptr->location", "value": {"map": "MAP_BATTLE_FRONTIER_BATTLE_FACTORY_LOBBY", "group": FACTORY_LOBBY_GROUP, "num": FACTORY_LOBBY_NUM, "warpId": WARP_ID_NONE, "x": LOBBY_X, "y": LOBBY_Y}, "source": "BattleFactoryBattleRoom/scripts.inc:222-227"},
                {"target": "gLastUsedWarp", "value": {"map": "MAP_BATTLE_FRONTIER_BATTLE_FACTORY_BATTLE_ROOM", "group": FACTORY_BATTLE_ROOM_GROUP, "num": FACTORY_BATTLE_ROOM_NUM}, "source": "overworld.c:540-546 transition provenance"},
                {"target": "gMain.callback2/state", "value": "CB2_LoadMap/0", "source": "overworld.c:1572-1587"},
            ],
            "normalRenderingAfterStage": "CB2_LoadMap -> LoadMapInStepsLocal -> lobby OnWarp/OnFrame map scripts -> LostChallenge",
        },
        "idleToRecordPrompt": idle,
        "recordPromptB": record_b,
    }
    OUTPUT_PATH.write_text(json.dumps(output, indent=2) + "\n")


main()
