#!/usr/bin/env python3
"""RAM tiebreaker for the §1.6 gold-entrance discrepancy.

`docs/noland-walkup-dialogue-scoping.md` §1.6 flags that the gold
`factoryBrain` lab fixture shows "Right this way, please!" a SECOND time at
the BattleRoom entrance, where a static decomp read of
`EnterRoomFactoryHeadBattle` (`data/maps/BattleFrontier_BattleFactoryBattleRoom/
scripts.inc:51-60`) predicts "Hey, hey! Get a move on!" unconditionally
whenever brain-ready. Two hypotheses: (a) the battle-lab harness's own
state-jump machinery leaves a stale on-frame-script guard var primed, so
`EnterRoomFactoryHeadBattle` never fires on this staged entry and the visible
box is something else's leftover; (b) the ROM genuinely reuses the string.

This probe calls `BattleLab.prepare()` unmodified (the exact staging the
`factoryBrain` mode's HTTP route uses — no reimplementation) but subclasses
it to also read, at every existing `preCheckpointCaptureFrames` sample, the
overworld bookkeeping decomp says gates this: `VAR_TEMP_0`/`VAR_TEMP_1`
(`include/constants/vars.h:9-24`, the two "have I entered this map yet"
guards `BattleFactoryBattleRoom`'s and `BattleFactoryPreBattleRoom`'s own
`OnWarp`/`OnFrame` map-script tables key off), `VAR_TEMP_F` (the copied
`frontier_getbrainstatus` result BattleRoom's `OnTransition` writes,
`scripts.inc:17-18`), and `gSaveBlock1Ptr->location.mapGroup/mapNum`
(`include/global.h:986-987`, `WarpData` at `include/global.h:581-588` — the
current-map bookkeeping every `LoadMapFromWarp`/`ClearTempFieldEventData`
call updates, `src/overworld.c:826-849`, `src/event_data.c:39-48`).

If the frame showing the disputed "Right this way, please!" box reads
`mapNum == MAP_BATTLE_FRONTIER_BATTLE_FACTORY_BATTLE_ROOM` (33) with
`VAR_TEMP_0 == 0` at the moment `EnterRoomFactoryHeadBattle` should have
already fired (i.e. nothing suppressed it), that rules out the stale-guard
hypothesis outright — the box is showing on the real map with the gate open,
so its content is what the ROM's on-frame dispatch actually selected, not a
leftover render.

Run via `python3 tools/run-mgba-probe.py <fresh-output.json> --
tools/probe/probe-factory-brain-gold-entrance-ram.py <fresh-output.json>`.
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path


if len(sys.argv) != 2:
    raise SystemExit(f"usage: {sys.argv[0]} <fresh-output.json>")

OUTPUT_PATH = Path(sys.argv[1])
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

from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

REFERENCE = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
ROM_PATH = REFERENCE / "pokeemerald.gba"
MAP_PATH = REFERENCE / "pokeemerald.map"
BOOTSTRAP_PATH = ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json"

SAVE_BLOCK1_LOCATION = 0x04  # struct SaveBlock1.location (WarpData), include/global.h:987
VARS_TABLE_OFFSET = 0x139C  # struct SaveBlock1.vars[], include/global.h:1021
VAR_TEMP_0_INDEX = 0x0
VAR_TEMP_1_INDEX = 0x1
VAR_TEMP_F_INDEX = 0xF
VAR_FRONTIER_BATTLE_MODE_INDEX = 0x40CE - 0x4000
VAR_FRONTIER_FACILITY_INDEX = 0x40CF - 0x4000

MAP_GROUP_FACTORY = 26
MAP_NUM_LOBBY = 31
MAP_NUM_PRE_BATTLE_ROOM = 32
MAP_NUM_BATTLE_ROOM = 33
MAP_NAMES = {
    MAP_NUM_LOBBY: "Lobby",
    MAP_NUM_PRE_BATTLE_ROOM: "PreBattleRoom",
    MAP_NUM_BATTLE_ROOM: "BattleRoom",
}

FRONTIER_BRAIN_NOT_READY = 0
FRONTIER_BRAIN_SILVER = 1
FRONTIER_BRAIN_GOLD = 2
FRONTIER_BRAIN_STREAK = 3
FRONTIER_BRAIN_STREAK_LONG = 4
BRAIN_STATUS_NAMES = {
    FRONTIER_BRAIN_NOT_READY: "NOT_READY",
    FRONTIER_BRAIN_SILVER: "SILVER",
    FRONTIER_BRAIN_GOLD: "GOLD",
    FRONTIER_BRAIN_STREAK: "STREAK",
    FRONTIER_BRAIN_STREAK_LONG: "STREAK_LONG",
}


class InstrumentedLab(BattleLab):
    """BattleLab with the map-script guard vars + current map appended to
    every pre-checkpoint snapshot. `prepare()` itself is untouched — this
    only widens what each already-scheduled capture records."""

    def snapshot(self) -> dict:
        base = super().snapshot()
        save1 = self.oracle.read_u32(self.oracle.symbols["gSaveBlock1Ptr"])
        map_group = self.oracle.read_u8(save1 + SAVE_BLOCK1_LOCATION)
        map_num = self.oracle.read_u8(save1 + SAVE_BLOCK1_LOCATION + 1)

        def var_temp(index: int) -> int:
            return self.oracle.read_u16(save1 + VARS_TABLE_OFFSET + index * 2)

        base["overworld"] = {
            "mapGroup": map_group,
            "mapNum": map_num,
            "mapName": MAP_NAMES.get(map_num, f"map{map_group}:{map_num}")
            if map_group == MAP_GROUP_FACTORY
            else f"map{map_group}:{map_num}",
            "varTemp0": var_temp(VAR_TEMP_0_INDEX),
            "varTemp1": var_temp(VAR_TEMP_1_INDEX),
            "varTempF": var_temp(VAR_TEMP_F_INDEX),
            "varTempFName": BRAIN_STATUS_NAMES.get(var_temp(VAR_TEMP_F_INDEX)),
            "varFrontierBattleMode": var_temp(VAR_FRONTIER_BATTLE_MODE_INDEX),
            "varFrontierFacility": var_temp(VAR_FRONTIER_FACILITY_INDEX),
        }
        return base


def main() -> None:
    scenario = json.loads(
        (WORKTREE_ROOT / "tools" / "battle-lab" / "factory-brain-gold-intro-dense-off.json").read_text()
    )
    scenario["preCheckpointCaptureFrames"] = list(range(715, 971))
    profile = scenario.get("profile", "battle-scene-off")

    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    request = validate_request(scenario, profile)
    # Sanity: MAX_PRE_CHECKPOINT_CAPTURES caps a single request's explicit
    # list at 256 entries; split into two prepare() calls if this trips.
    if len(request["preCheckpointCaptureFrames"]) > 256:
        raise AssertionError(
            f"requested {len(request['preCheckpointCaptureFrames'])} capture frames, "
            "over the 256 cap -- split the range"
        )

    lab = InstrumentedLab(oracle, profile)
    setup = lab.prepare(request)

    rows = []
    for capture in setup["preCheckpointCaptures"]:
        overworld = capture["state"]["overworld"]
        rows.append({
            "frame": capture["frame"],
            "sha256": capture["sha256"],
            "mapGroup": overworld["mapGroup"],
            "mapNum": overworld["mapNum"],
            "mapName": overworld["mapName"],
            "varTemp0": overworld["varTemp0"],
            "varTemp1": overworld["varTemp1"],
            "varTempF": overworld["varTempF"],
            "varTempFName": overworld["varTempFName"],
            "varFrontierBattleMode": overworld["varFrontierBattleMode"],
            "varFrontierFacility": overworld["varFrontierFacility"],
        })

    # Span-compress on (mapName, varTemp0, varTemp1, varTempF) so the RAM
    # transitions line up directly against the frame-content boundaries the
    # sibling dense-PNG fixture already established (map warp, on-frame gate
    # opening, brain-status var landing).
    spans = []
    key = None
    start = None
    prev_frame = None
    for row in rows:
        row_key = (
            row["mapName"], row["varTemp0"], row["varTemp1"], row["varTempF"],
            row["varFrontierBattleMode"], row["varFrontierFacility"],
        )
        if row_key != key:
            if key is not None:
                spans.append({"start": start, "end": prev_frame, "key": key})
            key, start = row_key, row["frame"]
        prev_frame = row["frame"]
    if key is not None:
        spans.append({"start": start, "end": prev_frame, "key": key})

    output = {
        "schema": "factory-brain-gold-entrance-ram-off/v1",
        "oracleProfile": profile,
        "sourceScenario": "tools/battle-lab/factory-brain-gold-intro-dense-off.json",
        "requestedCaptureFrames": request["preCheckpointCaptureFrames"],
        "rows": rows,
        "spans": [
            {
                "frames": f"{s['start']}-{s['end']}",
                "mapName": s["key"][0],
                "varTemp0": s["key"][1],
                "varTemp1": s["key"][2],
                "varTempF": s["key"][3],
                "varFrontierBattleMode": s["key"][4],
                "varFrontierFacility": s["key"][5],
            }
            for s in spans
        ],
    }
    OUTPUT_PATH.write_text(json.dumps(output, indent=2, default=str) + "\n")


main()
