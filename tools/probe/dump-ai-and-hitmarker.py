#!/usr/bin/env python3
"""Dev-time per-tick RAM probe for two double-indirection battle-engine
internals that tools/probe/ram-probe.py's single-deref "watch" spec can't
express:

1. The opponent AI's scratch struct: gBattleResources (pointer) -> deref ->
   +0x14 (the `ai` field, itself a pointer) -> deref -> struct
   AI_ThinkingStruct (aiState, movesetIndex, score[4], funcResult, aiFlags,
   aiAction, aiLogicId - include/battle.h). Built for the S7 turn-end RNG
   cluster question (docs/battle-turn-notes.md S3/S8): confirms whether/when
   the AI's move-scoring scripts (AI_CheckBadMove/AI_TryToFaint/
   AI_CheckViability) actually run for a given trainer+challenge-progress
   combo, since `BattleAI_SetupAIData`'s aiFlags source
   (`GetAiScriptsInBattleFactory`, src/battle_factory.c) is challenge-
   progress-dependent, not a fixed per-trainer constant.

2. gHitMarker's HITMARKER_NO_ANIMATIONS bit (bit 7,
   include/constants/battle.h) cross-checked against the *save file's* own
   `gSaveBlock2Ptr->optionsBattleSceneOff` option bit (a single-deref through
   gSaveBlock2Ptr, bit 10 of the u16 at +0x14 of struct SaveBlock2,
   include/global.h) - confirms whether this canonical anchor's underlying
   save has "Battle Scene: OFF" set, which (via Cmd_attackanimation,
   src/battle_script_commands.c) skips every move's own custom attack-
   animation script engine-wide. Resolved docs/battle-move-anim-notes.md S5
   questions 1 and 3 (DOUBLE_TEAM's clones / ROCK_SLIDE's rocks+shake never
   spawning) and reframed question 3's "falling rocks visible window" as the
   generic hit-flash effect instead.

Run with the harness's mGBA-enabled interpreter (NOT system python3):
    /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
        tools/probe/dump-ai-and-hitmarker.py <trace.json> <output.json> [startTick]

<trace.json> is any oracle trace file with a top-level "segments" array.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) not in (3, 4):
    raise SystemExit(f"usage: {sys.argv[0]} <trace.json> <output.json> [startTick]")
TRACE_PATH = Path(sys.argv[1])
OUTPUT_PATH = Path(sys.argv[2])
START_TICK = int(sys.argv[3]) if len(sys.argv) == 4 else 0

HERE = Path(__file__).resolve().parent
WORKTREE_ROOT = HERE.parent.parent


def find_harness_root(start: Path) -> Path:
    for candidate in (start, *start.parents):
        if (candidate / "oracle" / "emerald_core.py").is_file():
            return candidate
    raise SystemExit(f"could not find the harness root (oracle/emerald_core.py) above {start}")


HARNESS_ROOT = find_harness_root(WORKTREE_ROOT)
ORACLE_DIR = HARNESS_ROOT / "oracle"
sys.path.insert(0, str(ORACLE_DIR))

from emerald_core import EmeraldOracle  # noqa: E402

REFERENCE_POKEEMERALD = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
ROM_PATH = REFERENCE_POKEEMERALD / "pokeemerald.gba"
MAP_PATH = REFERENCE_POKEEMERALD / "pokeemerald.map"
BOOTSTRAP_PATH = ORACLE_DIR / "bootstrap" / "factory.json"

# From `bin/oracle symbols gBattleResources gHitMarker gSaveBlock2Ptr gRngValue`.
GBATTLERESOURCES = 0x020244A8
AI_FIELD_OFFSET = 0x14          # struct BattleResources.ai
AI_AIFLAGS_OFFSET = 0xC         # struct AI_ThinkingStruct.aiFlags (u32)
AI_AISTATE_OFFSET = 0x0         # .aiState (u8)
AI_MOVESETIDX_OFFSET = 0x1      # .movesetIndex (u8)
AI_LOGICID_OFFSET = 0xD         # .aiLogicId (u8)

GHITMARKER = 0x02024280
HITMARKER_NO_ANIMATIONS_BIT = 7

GSAVEBLOCK2PTR = 0x03005D90
OPTIONS_FIELD_OFFSET = 0x14     # struct SaveBlock2's packed u16 bitfield
BATTLE_SCENE_OFF_BIT = 10       # optionsBattleSceneOff within that u16

GRNGVALUE = 0x03005D80


def main() -> None:
    segments = json.loads(TRACE_PATH.read_text())["segments"]
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    oracle.new_session()

    def u16(addr: int) -> int:
        return oracle.read_u8(addr) | (oracle.read_u8(addr + 1) << 8)

    def record(tick: int) -> dict:
        battle_resources = oracle.read_u32(GBATTLERESOURCES)
        ai_ptr = oracle.read_u32(battle_resources + AI_FIELD_OFFSET) if battle_resources else 0
        hit_marker = oracle.read_u32(GHITMARKER)
        save_block2 = oracle.read_u32(GSAVEBLOCK2PTR)
        options_field = u16(save_block2 + OPTIONS_FIELD_OFFSET) if save_block2 else None
        return {
            "tick": tick,
            "aiFlags": oracle.read_u32(ai_ptr + AI_AIFLAGS_OFFSET) if ai_ptr else None,
            "aiState": oracle.read_u8(ai_ptr + AI_AISTATE_OFFSET) if ai_ptr else None,
            "movesetIdx": oracle.read_u8(ai_ptr + AI_MOVESETIDX_OFFSET) if ai_ptr else None,
            "aiLogicId": oracle.read_u8(ai_ptr + AI_LOGICID_OFFSET) if ai_ptr else None,
            "hitMarkerNoAnimBit": (hit_marker >> HITMARKER_NO_ANIMATIONS_BIT) & 1,
            "battleSceneOffBit": ((options_field >> BATTLE_SCENE_OFF_BIT) & 1) if options_field is not None else None,
            "rngValue": oracle.read_u32(GRNGVALUE),
        }

    rows = []
    tick = 0
    if tick >= START_TICK:
        rows.append(record(tick))
    for segment in segments:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            oracle.advance(buttons)
            tick += 1
            if tick >= START_TICK:
                rows.append(record(tick))

    OUTPUT_PATH.write_text(json.dumps({"ticks": rows}, indent=0))


main()
