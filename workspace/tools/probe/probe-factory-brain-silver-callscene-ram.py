#!/usr/bin/env python3
"""RAM tiebreaker for the walk-up program's §1.1 call-scene, silver path.

`docs/noland-silver-walkup-presentation-map.md` finds that the staged
silver `factoryBrain` route (challengeNum 2, playerSetIds [267, 268, 269],
seed 305419896 — the same staged path
`factory-brain-silver-intro-dense-off.json` and the
`factory-round-battle7-noland-reveal-off` 648/701 reveal compare both use)
never shows `ReturnToRoomFromBattle`'s attendant call-scene, the
`AskReadyForHead` GO ON/RECORD/REST/RETIRE menu, or the `AskSwapBeforeHead`
YES/NO prompt — dense PNG evidence shows the draft-confirm ("Are these
three POKEMON OK?" YES) falling straight through a black warp flash into
`EnterBattleRoom`'s "Right this way, please!" box, skipping all of §1.1's
call-scene content.

Source (`data/maps/BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc:
19-42`, `EventScript_EnterRoom`, the `MAP_SCRIPT_ON_FRAME_TABLE` handler)
gates the whole scene on `VAR_0x8006` (a "special var", `gSpecialVar_0x8006`,
`src/event_data.c:16`, NOT part of the `SaveBlock1.vars[]` table the
existing gold-entrance probe reads):
`goto_if_eq VAR_0x8006, 1 -> ReturnToRoomFromBattle` (the call-scene);
`goto_if_eq VAR_0x8006, 2 -> ResumeChallenge`; otherwise falls through to
the fresh-draft entry path (attendant+player enter-room movement, generate
rental/opponent mons, "Hold your mons, choose from selection", fade to
black, `factory_rentmons` opens the draft UI) which itself falls straight
into `EnterBattleRoom` with no ask-ready gate at all — this is the ROM's
genuine first-battle-of-challenge behavior, not a script bug.

`BattleLab.prepare()` (`oracle/battle_lab.py:565-735`) restores the
canonical rental checkpoint and re-enters `DoBattleFactorySelectScreen`
directly via a raw `gMain+4` callback write, forcing `battleNum` to 6 in
SaveBlock2 so the opponent is Noland — but never writes `VAR_0x8006` at
all, so it stays whatever the canonical checkpoint snapshot bakes in. If
that's 0 (neither 1 nor 2), the ROM takes the same fresh-draft fallthrough
path a genuine battle-1 entry takes, landing on Noland's dialogue (because
`frontier_getbrainstatus` reads the forced `battleNum`) while skipping
the call-scene/ask-ready gate a genuine battle-21 entry would have taken.
This probe reads `VAR_0x8006` directly at every frame of the draft-confirm
-> warp -> EnterBattleRoom window to confirm that value never becomes 1.

Run via `python3 tools/run-mgba-probe.py <fresh-output.json> --
tools/probe/probe-factory-brain-silver-callscene-ram.py <fresh-output.json>`.
"""

from __future__ import annotations

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

MAP_GROUP_FACTORY = 26
MAP_NUM_LOBBY = 31
MAP_NUM_PRE_BATTLE_ROOM = 32
MAP_NUM_BATTLE_ROOM = 33
MAP_NAMES = {
    MAP_NUM_LOBBY: "Lobby",
    MAP_NUM_PRE_BATTLE_ROOM: "PreBattleRoom",
    MAP_NUM_BATTLE_ROOM: "BattleRoom",
}


class InstrumentedLab(BattleLab):
    """BattleLab with VAR_0x8006 (the EnterRoom call-scene gate) plus the
    current map appended to every pre-checkpoint snapshot. `prepare()`
    itself is untouched — this only widens what each already-scheduled
    capture records."""

    def snapshot(self) -> dict:
        base = super().snapshot()
        save1 = self.oracle.read_u32(self.oracle.symbols["gSaveBlock1Ptr"])
        map_group = self.oracle.read_u8(save1 + SAVE_BLOCK1_LOCATION)
        map_num = self.oracle.read_u8(save1 + SAVE_BLOCK1_LOCATION + 1)

        base["overworld"] = {
            "mapGroup": map_group,
            "mapNum": map_num,
            "mapName": MAP_NAMES.get(map_num, f"map{map_group}:{map_num}")
            if map_group == MAP_GROUP_FACTORY
            else f"map{map_group}:{map_num}",
            "varSpecial8006": self.oracle.read_u16(self.oracle.symbols["gSpecialVar_0x8006"]),
            "varSpecial8005": self.oracle.read_u16(self.oracle.symbols["gSpecialVar_0x8005"]),
        }
        return base


def main() -> None:
    scenario = json.loads(
        (WORKTREE_ROOT / "tools" / "battle-lab" / "factory-brain-silver-intro-dense-off.json").read_text()
    )
    scenario["preCheckpointCaptureFrames"] = list(range(380, 636))
    profile = scenario.get("profile", "battle-scene-off")

    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    request = validate_request(scenario, profile)
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
            "varSpecial8006": overworld["varSpecial8006"],
            "varSpecial8005": overworld["varSpecial8005"],
        })

    spans = []
    key = None
    start = None
    prev_frame = None
    for row in rows:
        row_key = (row["mapName"], row["varSpecial8006"], row["varSpecial8005"])
        if row_key != key:
            if key is not None:
                spans.append({"start": start, "end": prev_frame, "key": key})
            key, start = row_key, row["frame"]
        prev_frame = row["frame"]
    if key is not None:
        spans.append({"start": start, "end": prev_frame, "key": key})

    output = {
        "schema": "factory-brain-silver-callscene-ram-off/v1",
        "oracleProfile": profile,
        "sourceScenario": "tools/battle-lab/factory-brain-silver-intro-dense-off.json",
        "requestedCaptureFrames": request["preCheckpointCaptureFrames"],
        "rows": rows,
        "spans": [
            {
                "frames": f"{s['start']}-{s['end']}",
                "mapName": s["key"][0],
                "varSpecial8006": s["key"][1],
                "varSpecial8005": s["key"][2],
            }
            for s in spans
        ],
    }
    OUTPUT_PATH.write_text(json.dumps(output, indent=2, default=str) + "\n")


main()
