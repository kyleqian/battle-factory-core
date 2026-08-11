#!/usr/bin/env python3
"""Trace Factory construction RNG epochs with LR-attributed Random calls.

This is a dev-time, Scene-OFF evidence probe for ISSUES #55.  It records the
complete LCG chain inside one source construction function, tagging each draw
as a CreateMonWithEVSpreadNatureOTID construction draw or a VBlankIntr ambient
draw.  ``anchor`` uses the canonical draft bootstrap; ``liliana`` replays the
committed WIN GO ON fixture; ``factory-varied`` stages a separate complete
legal Factory battle and traces its opponent construction.

Every invocation must use a fresh output path and the repository wrapper:

    python3 tools/run-mgba-probe.py /tmp/fresh.json -- \
      python3 tools/probe/trace-factory-construction-rng.py /tmp/fresh.json anchor

The wrapper's known teardown SIGSEGV is harmless after valid JSON is written.
"""

from __future__ import annotations

import bisect
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any, Callable


if len(sys.argv) != 3:
    raise SystemExit(f"usage: {sys.argv[0]} <output.json> anchor|liliana|factory-varied")

OUTPUT = Path(sys.argv[1])
CASE = sys.argv[2]
if CASE not in {"anchor", "liliana", "factory-varied"}:
    raise SystemExit(f"unknown case {CASE!r}")

HERE = Path(__file__).resolve().parent
WORKTREE_ROOT = HERE.parent.parent


def find_harness_root(start: Path) -> Path:
    for candidate in (start, *start.parents):
        if (candidate / "oracle" / "emerald_core.py").is_file():
            return candidate
    raise SystemExit(f"could not find oracle harness above {start}")


HARNESS_ROOT = find_harness_root(WORKTREE_ROOT)
ORACLE_DIR = HARNESS_ROOT / "oracle"
sys.path.insert(0, str(ORACLE_DIR))

from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402
from mgba._pylib import ffi as MGBA_FFI  # noqa: E402
from factory_timer0_selected_edge import (  # noqa: E402
    GET_BOX_MON_DATA2_ENTRY_PC,
    LILIANA_AUDIO_EDGE,
    SelectedEncryptedAccessorEdge,
)


REFERENCE = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
ROM = REFERENCE / "pokeemerald.gba"
MAP = REFERENCE / "pokeemerald.map"
BOOTSTRAP_OFF = ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json"

RANDOM_ENTRY_PC = 0x0806F5CE  # Random() entry, mGBA's pipelined Thumb PC
SELECTABLE_ENTRY_PC = 0x0819B486  # CreateFrontierFactorySelectableMons + 2
FILL_FACTORY_ENTRY_PC = 0x081635D6  # FillFactoryFrontierTrainerParty + 2
CREATE_EV_ENTRY_PC = 0x08068636  # CreateMonWithEVSpreadNatureOTID + 2
GET_NATURE_ENTRY_PC = 0x0806D08A  # GetNatureFromPersonality + 2
CREATE_MON_ENTRY_PC = 0x08067B4E  # CreateMon + 2
CREATE_MON_RESUME_PC = 0x0806869E  # instruction after CreateMon BL + pipeline
CALCULATE_STATS_ENTRY_PC = 0x08068D0E  # CalculateMonStats + 2
CALCULATE_STATS_RESUME_PC = 0x080686EC  # instruction after CalculateMonStats BL + pipeline
VBLANK_ENTRY_PC = 0x0800073A  # VBlankIntr + 2
VBLANK_EXIT_PC = 0x080007DC  # VBlankIntr's terminal bx + 2
SELECTABLE_POST_END_PC = 0x0819B614  # after held-item SetMonData, before loop test
FILL_FACTORY_POST_END_PC = 0x0816376E  # after held-item SetMonData, before loop test
SRANDCOUNT_ADDR = 0x020249C0  # src/random.c:5, static EWRAM symbol
SAVE_RENTALS_OFFSET = 0xE70  # include/global.h: SaveBlock2.frontier.rentalMons
RENTAL_MON_STRIDE = 12
FACILITY_MON_STRIDE = 16
FACILITY_MON_NATURE_OFFSET = 12
POKEMON_SIZE = 100

ANCHOR_ENTRY_FRAME = 6696
ANCHOR_LAST_FRAME = 6750
LILIANA_FIRST_FRAME = 11311
LILIANA_LAST_FRAME = 11345

ANCHOR_BOOTSTRAP_SHA256 = "9c89c74113f29e7d4595571c3aceb728417c4fe441b644ec0022fb498463f297"

# The committed v1 receipt intentionally remains frame/cursor-only.  A fresh
# probe can opt into mGBA master-cycle evidence for the construction-clock
# follow-up without changing that receipt's byte contract:
#   FACTORY_CONSTRUCTION_CYCLE_EVIDENCE=1 ... trace-factory-construction-rng.py
CYCLE_EVIDENCE = os.environ.get("FACTORY_CONSTRUCTION_CYCLE_EVIDENCE") == "1"
# This is deliberately a separate opt-in receipt from the v2 construction
# chain.  The v2 files stay frozen while this records the *source-visible*
# VBlank state and individual VBlankIntr call boundaries needed to investigate
# the remaining hardware-workload clock.  It must be used with cycle evidence:
#   FACTORY_CONSTRUCTION_CYCLE_EVIDENCE=1 \
#   FACTORY_VBLANK_WORKLOAD_EVIDENCE=1 ... trace-factory-construction-rng.py
VBLANK_WORKLOAD_EVIDENCE = os.environ.get("FACTORY_VBLANK_WORKLOAD_EVIDENCE") == "1"
# Version two is deliberately a sibling observation packet.  The v1 workload
# receipt has already been committed as a stable outer-VBlank contract, so the
# m4a-only instruction boundaries and its extra state are opt-in rather than
# appended to that contract.
#
#   FACTORY_CONSTRUCTION_CYCLE_EVIDENCE=1 \
#   FACTORY_VBLANK_WORKLOAD_EVIDENCE=1 \
#   FACTORY_VBLANK_WORKLOAD_INTERNAL_EVIDENCE=1 ...
VBLANK_WORKLOAD_INTERNAL_EVIDENCE = (
    os.environ.get("FACTORY_VBLANK_WORKLOAD_INTERNAL_EVIDENCE") == "1"
)
# This is a sibling of the frozen v2 construction receipt. It records each
# direct source call made by CalculateMonStats, with scalar inputs/results but
# never a party pointer, set id, trainer id, or timing lookup key. The call
# sites are from the pinned CalculateMonStats ELF body and distinguish the
# stat field / arithmetic branch an eventual source reducer must replay.
#
#   FACTORY_CONSTRUCTION_CYCLE_EVIDENCE=1 \
#   FACTORY_CALCULATE_MON_STATS_EVIDENCE=1 ...
CALCULATE_MON_STATS_EVIDENCE = (
    os.environ.get("FACTORY_CALCULATE_MON_STATS_EVIDENCE") == "1"
)
# Compact sibling receipt for Issue #55's EWRAM reducer. This never changes
# the frozen v2/v3 packets: it is emitted only under a separate opt-in and
# retains instruction PCs, width/access class, address modulo 4, and deltas.
EWRAM_ACCESS_EVIDENCE = (
    os.environ.get("FACTORY_EWRAM_ACCESS_EVIDENCE") == "1"
)
# Bounded Timer 0 cadence receipt.  This decorates the already selected source
# boundaries only; it does not walk every retired instruction and it retains
# no absolute queue pointer or fixture-specific timing key.
TIMER0_CADENCE_EVIDENCE = (
    os.environ.get("FACTORY_TIMER0_CADENCE_EVIDENCE") == "1"
)
# Compact all-crossing Timer 0 evidence.  This is intentionally separate from
# the cadence receipt and the +18 classifier: it observes every Timer 0 event
# reschedule inside the retained source-function epochs, not only rows already
# joined to a residual.  It never changes the v1/v2 packets.
#
#   FACTORY_CONSTRUCTION_CYCLE_EVIDENCE=1 \
#   FACTORY_TIMER0_FIFO_EVIDENCE=1 ... trace-factory-construction-rng.py
TIMER0_FIFO_EVIDENCE = (
    os.environ.get("FACTORY_TIMER0_FIFO_EVIDENCE") == "1"
)
# Callback-entry sibling receipt for the absolute mGBA scheduler boundary.
# This wraps the existing native timing events only while the selected source
# construction function is active, delegates every callback immediately, and
# retains one plain dual refill plus one exact Video-co-due contrast.
TIMER0_SCHEDULER_RUNTIME_EVIDENCE = (
    os.environ.get("FACTORY_TIMER0_SCHEDULER_RUNTIME_EVIDENCE") == "1"
)
# One source-selected LILIANA edge only. Native wrappers are installed at the
# selected accessor entry, delegate without retention until 0x082e7c3e, and
# restore as soon as Timer@D, Audio@D+1, and both FIFO DMAs are complete.
TIMER0_SELECTED_EDGE_RUNTIME_EVIDENCE = (
    os.environ.get("FACTORY_TIMER0_SELECTED_EDGE_RUNTIME_EVIDENCE") == "1"
)
# Separate scalar/source-relative packet for the recurring +18-cycle residual
# audit.  This decorates already-selected source boundaries only; it does not
# retain a trainer/set/mon identity or turn the observation into a timing key.
RESIDUAL_18_EVIDENCE = (
    os.environ.get("FACTORY_RESIDUAL_18_EVIDENCE") == "1"
)
# Instruction-granular sibling of the endpoint census.  It deliberately
# selects one source-reduced +18 signed-division observation and a nearby
# zero-residual control with the same compiled entry/return path.  The packet
# records mGBA's named timing-event queue before every retired instruction so
# an asynchronous increment can be attributed to an event, rather than to an
# endpoint nextEvent distance.
RESIDUAL_18_INSTRUCTION_EVIDENCE = (
    os.environ.get("FACTORY_RESIDUAL_18_INSTRUCTION_EVIDENCE") == "1"
)
# Compact three-epoch classifier for the already-censused +18 joins.  These
# are source-order ordinals within a compiled component, never cycle/tick
# positions, pointers, RNG values, or observed durations.  The lists are the
# join established by FACTORY_RESIDUAL_18_EVIDENCE's Tier-1 census; the mode
# below uses them only to decide which short instruction spans to retain.
RESIDUAL_18_CLASSIFIER_EVIDENCE = (
    os.environ.get("FACTORY_RESIDUAL_18_CLASSIFIER_EVIDENCE") == "1"
)

RESIDUAL_18_CLASSIFIER_MEMBERS: dict[str, dict[str, tuple[int, ...]]] = {
    "anchor": {
        "encrypted-accessor": (1, 4, 6, 8, 10, 14, 16, 18, 20, 22, 25, 27, 29, 32, 34, 36, 38, 39, 42, 46, 48, 50, 53, 55, 58, 60, 62, 64, 66, 68, 71, 73, 75),
        "level-loop": (2,),
        "signed-divide": (22,),
        "get-nature": (),
        "nature-attempt": (4, 30, 51, 71, 91),
        "outer-factory-loop": (3,),
    },
    "liliana": {
        "encrypted-accessor": (1, 3, 5, 10, 12, 16, 19, 21, 23, 25, 26, 28, 30, 32, 35, 38),
        "level-loop": (0,),
        "signed-divide": (),
        "get-nature": (),
        "nature-attempt": (25, 45),
        "outer-factory-loop": (),
    },
    "factory-varied": {
        "encrypted-accessor": (0, 2, 4, 6, 9, 11, 14, 16, 18, 21, 23, 25, 26, 28, 30, 33, 35, 37),
        "level-loop": (1,),
        "signed-divide": (),
        "get-nature": (3, 12),
        "nature-attempt": (48, 63, 75, 95),
        "outer-factory-loop": (),
    },
}

# The same source-order join, restricted to residual==0 rows.  Keeping these
# ordinals explicit prevents a +117/+245/+263/+308 sibling from becoming an
# accidental baseline.  Across the three epochs these are exactly the 488
# clean controls already derived by FACTORY_RESIDUAL_18_EVIDENCE.
RESIDUAL_18_CLASSIFIER_CLEAN_CONTROLS: dict[str, dict[str, tuple[int, ...]]] = {
    "anchor": {
        "encrypted-accessor": (0, 2, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 24, 26, 28, 30, 31, 33, 35, 37, 40, 41, 45, 47, 49, 51, 52, 54, 56, 57, 59, 61, 63, 65, 67, 69, 70, 72, 77),
        "level-loop": (0, 1, 3, 4, 5),
        "signed-divide": tuple(range(36)),
        "get-nature": (0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29),
        "nature-attempt": (0, 1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120),
        "outer-factory-loop": (0, 1, 2, 4),
    },
    "liliana": {
        "encrypted-accessor": (0, 2, 4, 6, 9, 11, 13, 17, 18, 20, 22, 24, 27, 29, 31, 33, 34),
        "level-loop": (1, 2),
        "signed-divide": tuple(range(18)),
        "get-nature": tuple(range(15)),
        "nature-attempt": (0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55),
        "outer-factory-loop": (0, 1),
    },
    "factory-varied": {
        "encrypted-accessor": (1, 3, 5, 7, 8, 10, 13, 15, 17, 19, 20, 22, 24, 27, 29, 31, 32, 34, 36, 38),
        "level-loop": (0,),
        "signed-divide": tuple(range(18)),
        "get-nature": (0, 1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14),
        "nature-attempt": (0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 96, 97, 98, 99, 100),
        "outer-factory-loop": (0, 1),
    },
}

# First-pass PC/cycle scouts over the 85 known members identify the only
# instruction starts at which a local source edge is enlarged.  The second
# pass walks mTiming only at these exact source PCs (and the following edge),
# so queue evidence is bounded independently of encrypted-loop length.
RESIDUAL_18_CLASSIFIER_QUEUE_INSTRUCTION_PCS = {
    0x08068C7A, 0x08068CA2, 0x08068CB2, 0x08068CB6, 0x08068CEE,
    0x08068CF0, 0x08069094, 0x0806909E, 0x0806A23A, 0x0806A240,
    0x0806A25A, 0x0806A268, 0x0806A270, 0x0806A282, 0x0806A288,
    0x0806A28A, 0x0806A28C, 0x0806A342, 0x0806A494, 0x0806A496,
    0x0806A4FC, 0x0806A508, 0x0806A684, 0x0806A690, 0x0806D096,
    0x0819B528, 0x082E7572, 0x082E7BF2, 0x082E7BF8, 0x082E7BFE,
    0x082E7C02, 0x082E7C04, 0x082E7C06, 0x082E7C10, 0x082E7C14,
    0x082E7C16, 0x082E7C18, 0x082E7C1A, 0x082E7C1C, 0x082E7C1E,
    0x082E7C20, 0x082E7C26, 0x082E7C2A, 0x082E7C2C, 0x082E7C30,
    0x082E7C3C, 0x082E7C3E, 0x082E7C42, 0x082E7C44, 0x082E7C46,
    0x082E7C4A, 0x082E7C4C, 0x082E7C4E, 0x082E7C50, 0x082E7C52,
    0x082E7C56, 0x082E7C60, 0x082E7C90, 0x082E7C94,
}

RESIDUAL_18_DIVIDE_TRACE_SELECTORS = {
    # Both calls are in anchor mon 3 and reduce to 318 source cycles.  The
    # first is a clean sibling; the second is the census's sole divide +18.
    (3, 9300, 100): ("signed-divide-clean", 0),
    (3, 11300, 100): ("signed-divide-plus18", 18),
}

# mGBA exposes executing Thumb PC + 2. `nextPc` is the immediately following
# instruction boundary, so the delta is the selected data instruction alone.
EWRAM_ACCESS_BOUNDARIES = {
    0x0806A258: ("decrypt-word-read", 0x0806A256, 0x0806A25A, "read", 4, 2, 0),
    0x0806A25E: ("decrypt-word-str", 0x0806A25C, 0x0806A260, "write", 4, 2, 0),
    0x0806A264: ("decrypt-word-stmia", 0x0806A262, 0x0806A266, "write", 4, 2, 0),
    0x0806A234: ("encrypt-word-read", 0x0806A232, 0x0806A236, "read", 4, 2, 0),
    0x0806A23A: ("encrypt-word-str", 0x0806A238, 0x0806A23C, "write", 4, 2, 0),
    0x0806A240: ("encrypt-word-stmia", 0x0806A23E, 0x0806A242, "write", 4, 2, 0),
    0x08068CB4: ("checksum-halfword-read", 0x08068CB2, 0x08068CB6, "read", 2, 5, 0),
    0x0806A6D8: ("stored-checksum-halfword-read", 0x0806A6D6, 0x0806A6DA, "read", 2, 1, 28),
    0x0806A962: ("species-bad-egg-byte-read", 0x0806A960, 0x0806A964, "read", 1, 2, 19),
    0x0806A974: ("species-halfword-read", 0x0806A972, 0x0806A976, "read", 2, 6, 0),
    0x0806A980: ("experience-word-read", 0x0806A97E, 0x0806A982, "read", 4, 1, 4),
    0x0806A9A6: ("ev-byte-read", 0x0806A9A4, 0x0806A9A8, "read", 1, 7, 0),
    0x0806A9F8: ("iv-byte-read", 0x0806A9F6, 0x0806A9FA, "read", 1, 5, 4),
    0x0806AA00: ("iv-halfword-read", 0x0806A9FE, 0x0806AA02, "read", 2, 5, 4),
    0x0806AA10: ("iv-word-read", 0x0806AA0E, 0x0806AA12, "read", 4, 5, 4),
}

# mGBA reports the executing Thumb instruction plus two bytes. Every entry
# below is a direct BL in CalculateMonStats (pokemon.c:2823-2889); nested calls
# made by these callees have an LR outside this table and are intentionally not
# duplicated. This keeps the observation a bounded source-operation trace.
CALCULATE_MON_STATS_DIRECT_CALLS: dict[int, tuple[str, str, int]] = {
    0x08068D1E: ("get-mon-data", "old-max-hp", 0x0806A51A),
    0x08068D2A: ("get-mon-data", "current-hp", 0x0806A51A),
    0x08068D36: ("get-mon-data", "hp-iv", 0x0806A51A),
    0x08068D42: ("get-mon-data", "hp-ev", 0x0806A51A),
    0x08068D4E: ("get-mon-data", "attack-iv", 0x0806A51A),
    0x08068D5A: ("get-mon-data", "attack-ev", 0x0806A51A),
    0x08068D66: ("get-mon-data", "defense-iv", 0x0806A51A),
    0x08068D72: ("get-mon-data", "defense-ev", 0x0806A51A),
    0x08068D7E: ("get-mon-data", "speed-iv", 0x0806A51A),
    0x08068D8A: ("get-mon-data", "speed-ev", 0x0806A51A),
    0x08068D96: ("get-mon-data", "sp-attack-iv", 0x0806A51A),
    0x08068DA2: ("get-mon-data", "sp-attack-ev", 0x0806A51A),
    0x08068DAE: ("get-mon-data", "sp-defense-iv", 0x0806A51A),
    0x08068DBA: ("get-mon-data", "sp-defense-ev", 0x0806A51A),
    0x08068DC6: ("get-mon-data", "species", 0x0806A51A),
    0x08068DD0: ("get-level-from-exp", "level", 0x08069056),
    0x08068DE0: ("set-mon-data", "level", 0x0806ACAE),
    0x08068E1C: ("divide", "max-hp", 0x082E7542),
    0x08068E42: ("set-mon-data", "max-hp", 0x0806ACAE),
    0x08068E68: ("divide", "attack", 0x082E7542),
    0x08068E72: ("get-nature", "attack", 0x0806D072),
    0x08068E80: ("modify-stat-by-nature", "attack", 0x0806D8D6),
    0x08068E90: ("set-mon-data", "attack", 0x0806ACAE),
    0x08068EAE: ("divide", "defense", 0x082E7542),
    0x08068EB8: ("get-nature", "defense", 0x0806D072),
    0x08068EC6: ("modify-stat-by-nature", "defense", 0x0806D8D6),
    0x08068ED6: ("set-mon-data", "defense", 0x0806ACAE),
    0x08068EF4: ("divide", "speed", 0x082E7542),
    0x08068EFE: ("get-nature", "speed", 0x0806D072),
    0x08068F0C: ("modify-stat-by-nature", "speed", 0x0806D8D6),
    0x08068F1C: ("set-mon-data", "speed", 0x0806ACAE),
    0x08068F3A: ("divide", "sp-attack", 0x082E7542),
    0x08068F44: ("get-nature", "sp-attack", 0x0806D072),
    0x08068F52: ("modify-stat-by-nature", "sp-attack", 0x0806D8D6),
    0x08068F62: ("set-mon-data", "sp-attack", 0x0806ACAE),
    0x08068F80: ("divide", "sp-defense", 0x082E7542),
    0x08068F8A: ("get-nature", "sp-defense", 0x0806D072),
    0x08068F98: ("modify-stat-by-nature", "sp-defense", 0x0806D8D6),
    0x08068FA8: ("set-mon-data", "sp-defense", 0x0806ACAE),
    0x08068FF0: ("set-mon-data", "current-hp", 0x0806ACAE),
}

# VBlankIntr's direct call/return sites in the pinned ELF.  These are source
# routines in main.c, not inferred from the construction fixture.  Capturing
# both sides lets the report attribute elapsed master cycles without trying to
# guess a callback's cost from a frame identity.
VBLANK_STAGE_PCS = {
    # mGBA exposes the pipelined Thumb PC (instruction + 2), just like the
    # existing VBlankIntr/CreateMon constants above.
    0x08000780: "vblank-callback-call",
    0x08000784: "vblank-callback-return",
    0x0800078A: "copy-buffered-gpu-regs-call",
    0x0800078E: "copy-buffered-gpu-regs-return/process-dma3-call",
    0x08000792: "process-dma3-return",
    0x0800079A: "m4a-sound-main-call",
    0x0800079E: "m4a-sound-main-return/try-receive-link-call",
    0x080007A2: "try-receive-link-return",
    0x080007BC: "ambient-random-call",
    0x080007C0: "ambient-random-return/update-wireless-call",
    0x080007C4: "update-wireless-return",
}

# m4aSoundMain's compiled source-owned boundaries.  The first seven locations
# are ROM Thumb PCs (mGBA reports the executing instruction + 2); the latter
# three are the same pinned SoundMainRAM instructions after m4aSoundInit copies
# the routine to SoundMainRAM_Buffer in IWRAM.  They intentionally name only
# source routines or loop heads in m4a.c/m4a_1.s, not fixture-specific paths.
M4A_SOUND_MAIN_CALL_PC = 0x0800079A
M4A_SOUND_MAIN_RETURN_PC = 0x0800079E
M4A_INTERNAL_STAGE_PCS = {
    0x082DF05E: "sound-main-entry",
    0x082DFA5E: "mplay-main-entry",
    0x082DFAAE: "mplay-track-command-pass",
    0x082DFC02: "mplay-track-volume-pitch-pass",
    0x082DF0A0: "sound-main-after-mplay",
    0x082E0CAA: "cgb-sound-entry",
    0x082DF0A6: "sound-main-after-cgb",
    0x03001AAA: "sound-main-ram-entry",
    0x03001B42: "sound-main-ram-channel-pass",
    0x03001E4C: "sound-main-ram-epilogue",
}

# These are the non-VBlank source ISR entries.  If one ran between VBlank's
# terminal bx and the interrupted instruction resuming, it would be direct
# evidence rather than an unexplained timing residual.
NON_VBLANK_ISR_ENTRY_PCS = {
    0x08000816: "HBlankIntr",
    0x08000846: "VCountIntr",
    0x0800087A: "SerialIntr",
    # Timer0/1/2, DMA, Key, and Game Pak entries share IntrDummy in this
    # build. Capturing it prevents the generic resume detector below from
    # silently mistaking a source ISR entry for the interrupted instruction.
    0x080008AA: "IntrDummy",
    0x0800BA2A: "Timer3Intr",
}

G_MAIN_ADDR = 0x030022C0
G_MAIN_VBLANK_CALLBACK_OFFSET = 0x0C
G_MAIN_CALLBACK2_OFFSET = 0x04
G_MAIN_HBLANK_CALLBACK_OFFSET = 0x10
G_MAIN_VCOUNT_CALLBACK_OFFSET = 0x14
G_MAIN_SERIAL_CALLBACK_OFFSET = 0x18
G_MAIN_FLAGS_OFFSET = 0x439
G_TRAINER_HILL_VBLANK_COUNTER_ADDR = 0x0203CF5C
G_WIRELESS_COMM_TYPE_ADDR = 0x030030FC
G_LINK_VSYNC_DISABLED_ADDR = 0x03002748

DMA3_REQUESTS_ADDR = 0x03000010
DMA3_MANAGER_LOCKED_ADDR = 0x03000810
DMA3_REQUEST_CURSOR_ADDR = 0x03000811
DMA3_REQUEST_SIZE = 16
DMA3_REQUEST_COUNT = 128

GPU_REG_WAITING_LIST_ADDR = 0x03000878
GPU_REG_BUFFER_LOCKED_ADDR = 0x030008D8
GPU_REG_WAITING_LIST_SIZE = 0x60

SPRITE_COPY_PENDING_ADDR = 0x02021834
SPRITE_COPY_COUNT_ADDR = 0x02021835
PALETTE_FADE_ADDR = 0x02037FD4
PALETTE_TRANSFER_PENDING_ADDR = 0x02037FE4
SCANLINE_EFFECT_ADDR = 0x02039B28
SOUND_INFO_ADDR = 0x03006380

# The structures below are pinned from include/main.h, dma3_manager.c,
# gpu_regs.c, palette.c, scanline_effect.h, and gba/m4a_internal.h.  They are
# intentionally semantic state summaries (not pointer or fixture IDs).
SOUND_INFO_PCM_DMA_COUNTER = 0x04
SOUND_INFO_REVERB = 0x05
SOUND_INFO_MAX_CHANS = 0x06
SOUND_INFO_FREQ = 0x08
SOUND_INFO_C15 = 0x0A
SOUND_INFO_PCM_DMA_PERIOD = 0x0B
SOUND_INFO_MAX_LINES = 0x0C
SOUND_INFO_PCM_SAMPLES_PER_VBLANK = 0x10
SOUND_INFO_CGB_CHANS = 0x1C
SOUND_INFO_MUSIC_PLAYER_HEAD = 0x24
SOUND_INFO_CHANNELS = 0x50
SOUND_CHANNEL_SIZE = 0x40
MUSIC_PLAYER_INFO_SIZE = 0x40
MUSIC_PLAYER_TRACK_SIZE = 0x50
MUSIC_PLAYER_INFO_TRACKS = 0x2C
MUSIC_PLAYER_INFO_TONE = 0x30
MUSIC_PLAYER_INFO_NEXT_MAIN = 0x38
MUSIC_PLAYER_INFO_NEXT_PLAYER = 0x3C
MUSIC_PLAYER_INFO_TEMPO_D = 0x1C
MUSIC_PLAYER_INFO_TEMPO_U = 0x1E
MUSIC_PLAYER_INFO_TEMPO_I = 0x20
MUSIC_PLAYER_INFO_TEMPO_C = 0x22
MUSIC_PLAYER_INFO_FADE_OI = 0x24
MUSIC_PLAYER_INFO_FADE_OC = 0x26
MUSIC_PLAYER_INFO_FADE_OV = 0x28

MUSIC_TRACK_TONE = 0x24
MUSIC_TRACK_TIMER = 0x3A
MUSIC_TRACK_COMMAND = 0x40
MUSIC_TRACK_PATTERN_STACK = 0x44
MUSIC_TRACK_CHANNELS = 0x20

WAVE_DATA_TYPE = 0x00
WAVE_DATA_STATUS = 0x02
WAVE_DATA_FREQUENCY = 0x04
WAVE_DATA_LOOP_START = 0x08
WAVE_DATA_SIZE = 0x0C
WAVE_DATA_BYTES = 0x10

SOUND_CHANNEL_COUNT = 0x18
SOUND_CHANNEL_FW = 0x1C
SOUND_CHANNEL_FREQUENCY = 0x20
SOUND_CHANNEL_WAVE = 0x24
SOUND_CHANNEL_CURRENT = 0x28
SOUND_CHANNEL_NEXT = 0x34

CGB_CHANNEL_SIZE = 0x40
CGB_CHANNEL_FREQUENCY = 0x20
CGB_CHANNEL_WAVE = 0x24
CGB_CHANNEL_CURRENT_WAVE = 0x28

M4A_INPUT_PREFIX_BYTES = 8


def pointer_symbol(value: int) -> str | None:
    """Render a callback pointer as a source symbol without retaining its address."""
    if value == 0:
        return None
    return symbol_at(value & ~1)


def snapshot_dma3_queue(oracle: EmeraldOracle) -> dict[str, Any]:
    """Read the source queue shape ProcessDma3Requests will consume next."""
    cursor = read_u8(oracle, DMA3_REQUEST_CURSOR_ADDR)
    queued: list[dict[str, int]] = []
    for offset in range(DMA3_REQUEST_COUNT):
        index = (cursor + offset) % DMA3_REQUEST_COUNT
        base = DMA3_REQUESTS_ADDR + index * DMA3_REQUEST_SIZE
        size = read_u16(oracle, base + 8)
        if size == 0:
            break
        queued.append({"size": size, "mode": read_u16(oracle, base + 10)})
    return {
        "locked": read_u8(oracle, DMA3_MANAGER_LOCKED_ADDR) != 0,
        "cursor": cursor,
        "queuedRequests": queued,
        "queuedBytes": sum(request["size"] for request in queued),
    }


def snapshot_music_players(oracle: EmeraldOracle, head: int) -> list[dict[str, Any]]:
    """Capture the linked m4a player/track branches without memory addresses."""
    players: list[dict[str, Any]] = []
    seen: set[int] = set()
    current = head
    while current and current not in seen and len(players) < 16:
        seen.add(current)
        track_count = min(read_u8(oracle, current + 8), 16)
        tracks = read_u32(oracle, current + 0x2C)
        track_rows: list[dict[str, int]] = []
        if tracks:
            for index in range(track_count):
                track = tracks + index * MUSIC_PLAYER_TRACK_SIZE
                track_rows.append({
                    "flags": read_u8(oracle, track),
                    "wait": read_u8(oracle, track + 1),
                    "runningStatus": read_u8(oracle, track + 7),
                    "mod": read_u8(oracle, track + 23),
                    "lfoSpeed": read_u8(oracle, track + 25),
                    "lfoDelayCounter": read_u8(oracle, track + 28),
                })
        players.append({
            "status": read_u32(oracle, current + 4),
            "trackCount": track_count,
            "tempoCounter": read_u16(oracle, current + 0x22),
            "tracks": track_rows,
        })
        current = read_u32(oracle, current + 0x3C)
    return players


def is_source_readable(address: int, size: int) -> bool:
    """Keep optional command/wave capture bounded to source memory regions."""
    if size < 0:
        return False
    end = address + size
    return (
        0x08000000 <= address and end <= 0x0A000000  # ROM / mapped ROM mirror
        or 0x02000000 <= address and end <= 0x02040000  # EWRAM
        or 0x03000000 <= address and end <= 0x03008000  # IWRAM
    )


def bounded_source_bytes(oracle: EmeraldOracle, address: int, length: int = M4A_INPUT_PREFIX_BYTES) -> list[int]:
    """Return a capped input prefix without persisting a source pointer."""
    if address == 0 or not is_source_readable(address, length):
        return []
    return [read_u8(oracle, address + index) for index in range(length)]


def snapshot_wave_input(oracle: EmeraldOracle, wave: int, current_pointer: int = 0) -> dict[str, Any] | None:
    """Capture only the header and bounded bytes the m4a mixers dereference."""
    if wave == 0 or not is_source_readable(wave, WAVE_DATA_BYTES):
        return None
    data = wave + WAVE_DATA_BYTES
    size = read_u32(oracle, wave + WAVE_DATA_SIZE)
    current_offset: int | None = None
    if current_pointer >= data and current_pointer - data <= max(size, M4A_INPUT_PREFIX_BYTES):
        current_offset = current_pointer - data
    return {
        "type": read_u16(oracle, wave + WAVE_DATA_TYPE),
        "status": read_u16(oracle, wave + WAVE_DATA_STATUS),
        "frequency": read_u32(oracle, wave + WAVE_DATA_FREQUENCY),
        "loopStart": read_u32(oracle, wave + WAVE_DATA_LOOP_START),
        "size": size,
        "dataPrefix": bounded_source_bytes(oracle, data),
        "currentOffset": current_offset,
        "currentPrefix": bounded_source_bytes(oracle, current_pointer),
    }


def snapshot_tone_input(oracle: EmeraldOracle, tone: int) -> dict[str, Any] | None:
    """ToneData is the track-visible input to ply_voice and channel creation."""
    if tone == 0 or not is_source_readable(tone, 12):
        return None
    return {
        "type": read_u8(oracle, tone),
        "key": read_u8(oracle, tone + 1),
        "length": read_u8(oracle, tone + 2),
        "panSweep": read_u8(oracle, tone + 3),
        "wave": snapshot_wave_input(oracle, read_u32(oracle, tone + 4)),
        "attack": read_u8(oracle, tone + 8),
        "decay": read_u8(oracle, tone + 9),
        "sustain": read_u8(oracle, tone + 10),
        "release": read_u8(oracle, tone + 11),
    }


def source_channel_kind(address: int, cgb_channels: int) -> str:
    """Identify a track chain member without retaining its RAM address."""
    direct_start = SOUND_INFO_ADDR + SOUND_INFO_CHANNELS
    direct_end = direct_start + 12 * SOUND_CHANNEL_SIZE
    if direct_start <= address < direct_end and (address - direct_start) % SOUND_CHANNEL_SIZE == 0:
        return "direct"
    if cgb_channels and cgb_channels <= address < cgb_channels + 4 * CGB_CHANNEL_SIZE and (address - cgb_channels) % CGB_CHANNEL_SIZE == 0:
        return "cgb"
    return "other"


def snapshot_track_chain(oracle: EmeraldOracle, first_channel: int, cgb_channels: int) -> list[str]:
    """MPlayMain walks this source-linked channel list before each track pass."""
    kinds: list[str] = []
    current = first_channel
    seen: set[int] = set()
    while current and current not in seen and len(kinds) < 16:
        seen.add(current)
        kind = source_channel_kind(current, cgb_channels)
        kinds.append(kind)
        if kind == "other" or not is_source_readable(current + SOUND_CHANNEL_NEXT, 4):
            break
        current = read_u32(oracle, current + SOUND_CHANNEL_NEXT)
    return kinds


def snapshot_track_input(oracle: EmeraldOracle, track: int, player_tone: int, cgb_channels: int) -> dict[str, Any]:
    """Bounded MPlayMain inputs for its command and volume/pitch track passes."""
    command = read_u32(oracle, track + MUSIC_TRACK_COMMAND)
    command_prefix = bounded_source_bytes(oracle, command)
    pattern_prefixes = [
        bounded_source_bytes(oracle, read_u32(oracle, track + MUSIC_TRACK_PATTERN_STACK + index * 4))
        for index in range(3)
    ]
    next_voice: dict[str, Any] | None = None
    # ply_voice consumes the byte after its 0xBD opcode as a ToneData table
    # index.  Persist that dereferenced row only when this bounded next-command
    # view proves the handler can enter it immediately.
    if command_prefix[:1] == [0xBD] and len(command_prefix) >= 2 and player_tone:
        voice_index = command_prefix[1]
        next_voice = {
            "index": voice_index,
            "tone": snapshot_tone_input(oracle, player_tone + voice_index * 12),
        }
    return {
        # Bytes 0x00-0x1f are the complete scalar control region read by the
        # two MPlayMain track loops (flags through pseudoEchoLength).
        "control": [read_u8(oracle, track + index) for index in range(0x20)],
        "tone": snapshot_tone_input(oracle, track + MUSIC_TRACK_TONE),
        "timer": read_u16(oracle, track + MUSIC_TRACK_TIMER),
        "commandPrefix": command_prefix,
        "patternPrefixes": pattern_prefixes,
        "nextVoice": next_voice,
        "linkedChannelKinds": snapshot_track_chain(
            oracle, read_u32(oracle, track + MUSIC_TRACK_CHANNELS), cgb_channels
        ),
    }


def snapshot_m4a_players(oracle: EmeraldOracle, head: int, cgb_channels: int) -> list[dict[str, Any]]:
    """Follow the MPlayMainNext-linked source list with address-free rows."""
    players: list[dict[str, Any]] = []
    seen: set[int] = set()
    current = head
    while current and current not in seen and len(players) < 16:
        seen.add(current)
        track_count = min(read_u8(oracle, current + 8), 16)
        tracks = read_u32(oracle, current + MUSIC_PLAYER_INFO_TRACKS)
        player_tone = read_u32(oracle, current + MUSIC_PLAYER_INFO_TONE)
        players.append({
            "status": read_u32(oracle, current + 4),
            "trackCount": track_count,
            "command": read_u8(oracle, current + 10),
            "clock": read_u32(oracle, current + 12),
            "tempo": {
                "d": read_u16(oracle, current + MUSIC_PLAYER_INFO_TEMPO_D),
                "u": read_u16(oracle, current + MUSIC_PLAYER_INFO_TEMPO_U),
                "i": read_u16(oracle, current + MUSIC_PLAYER_INFO_TEMPO_I),
                "c": read_u16(oracle, current + MUSIC_PLAYER_INFO_TEMPO_C),
            },
            "fade": {
                "i": read_u16(oracle, current + MUSIC_PLAYER_INFO_FADE_OI),
                "c": read_u16(oracle, current + MUSIC_PLAYER_INFO_FADE_OC),
                "v": read_u16(oracle, current + MUSIC_PLAYER_INFO_FADE_OV),
            },
            "mainRoutine": pointer_symbol(read_u32(oracle, current + MUSIC_PLAYER_INFO_NEXT_MAIN)),
            "hasNextPlayer": read_u32(oracle, current + MUSIC_PLAYER_INFO_NEXT_PLAYER) != 0,
            "tracks": [
                snapshot_track_input(oracle, tracks + index * MUSIC_PLAYER_TRACK_SIZE, player_tone, cgb_channels)
                for index in range(track_count)
            ] if tracks else [],
        })
        current = read_u32(oracle, current + MUSIC_PLAYER_INFO_NEXT_PLAYER)
    return players


def snapshot_direct_channel_input(oracle: EmeraldOracle, channel: int) -> dict[str, Any]:
    """SoundMainRAM's direct-sound envelope/mixer input for one fixed slot."""
    wave = read_u32(oracle, channel + SOUND_CHANNEL_WAVE)
    current = read_u32(oracle, channel + SOUND_CHANNEL_CURRENT)
    return {
        # Bytes 0x00-0x17 cover the scalar SoundChannel inputs consulted by the
        # envelope and branch selection before the ARM mixer consumes count/fw.
        "control": [read_u8(oracle, channel + index) for index in range(0x18)],
        "count": read_u32(oracle, channel + SOUND_CHANNEL_COUNT),
        "fw": read_u32(oracle, channel + SOUND_CHANNEL_FW),
        "frequency": read_u32(oracle, channel + SOUND_CHANNEL_FREQUENCY),
        "wave": snapshot_wave_input(oracle, wave, current),
    }


def snapshot_cgb_channel_input(oracle: EmeraldOracle, channel: int) -> dict[str, Any]:
    """CgbSound's fixed four-channel branch inputs, without pointer identity."""
    wave = read_u32(oracle, channel + CGB_CHANNEL_WAVE)
    current_wave = read_u32(oracle, channel + CGB_CHANNEL_CURRENT_WAVE)
    return {
        # CgbSound's branch/control fields live in the first 0x20 bytes.
        "control": [read_u8(oracle, channel + index) for index in range(0x20)],
        "frequency": read_u32(oracle, channel + CGB_CHANNEL_FREQUENCY),
        "wavePrefix": bounded_source_bytes(oracle, wave, M4A_INPUT_PREFIX_BYTES * 2),
        "waveIsCurrent": wave != 0 and wave == current_wave,
    }


def snapshot_m4a_internal_state(oracle: EmeraldOracle) -> dict[str, Any]:
    """State actually dereferenced by the compiled m4a routine graph.

    This is intentionally an inventory, not a timing key: command and wave
    reads are capped at eight bytes (sixteen for CGB wave RAM) and do not claim
    to model unbounded command control flow or sample data beyond that window.
    """
    cgb_channels = read_u32(oracle, SOUND_INFO_ADDR + SOUND_INFO_CGB_CHANS)
    music_head = read_u32(oracle, SOUND_INFO_ADDR + SOUND_INFO_MUSIC_PLAYER_HEAD)
    return {
        "soundInfo": {
            "ident": read_u32(oracle, SOUND_INFO_ADDR),
            "pcmDmaCounter": read_u8(oracle, SOUND_INFO_ADDR + SOUND_INFO_PCM_DMA_COUNTER),
            "pcmDmaPeriod": read_u8(oracle, SOUND_INFO_ADDR + SOUND_INFO_PCM_DMA_PERIOD),
            "pcmSamplesPerVBlank": read_u32(oracle, SOUND_INFO_ADDR + SOUND_INFO_PCM_SAMPLES_PER_VBLANK),
            "reverb": read_u8(oracle, SOUND_INFO_ADDR + SOUND_INFO_REVERB),
            "maxChans": read_u8(oracle, SOUND_INFO_ADDR + SOUND_INFO_MAX_CHANS),
            "maxLines": read_u8(oracle, SOUND_INFO_ADDR + SOUND_INFO_MAX_LINES),
            "frequency": read_u8(oracle, SOUND_INFO_ADDR + SOUND_INFO_FREQ),
            "c15": read_u8(oracle, SOUND_INFO_ADDR + SOUND_INFO_C15),
            "divFrequency": read_u32(oracle, SOUND_INFO_ADDR + 0x18),
            "mplayMainRoutine": pointer_symbol(read_u32(oracle, SOUND_INFO_ADDR + 0x20)),
            "cgbRoutine": pointer_symbol(read_u32(oracle, SOUND_INFO_ADDR + 0x28)),
        },
        "musicPlayers": snapshot_m4a_players(oracle, music_head, cgb_channels),
        "directChannels": [
            snapshot_direct_channel_input(oracle, SOUND_INFO_ADDR + SOUND_INFO_CHANNELS + index * SOUND_CHANNEL_SIZE)
            for index in range(12)
        ],
        "cgbChannels": [
            snapshot_cgb_channel_input(oracle, cgb_channels + index * CGB_CHANNEL_SIZE)
            for index in range(4)
        ] if cgb_channels else [],
        "dma": {
            "dma1Control": read_u32(oracle, 0x040000C4),
            "dma2Control": read_u32(oracle, 0x040000D0),
        },
    }


def snapshot_vblank_workload(oracle: EmeraldOracle) -> dict[str, Any]:
    """Source-visible VBlank inputs that may select a different code path."""
    main_flags = read_u8(oracle, G_MAIN_ADDR + G_MAIN_FLAGS_OFFSET)
    sound_channels = []
    for index in range(12):
        channel = SOUND_INFO_ADDR + SOUND_INFO_CHANNELS + index * SOUND_CHANNEL_SIZE
        sound_channels.append({
            "statusFlags": read_u8(oracle, channel),
            "type": read_u8(oracle, channel + 1),
            "gateTime": read_u8(oracle, channel + 16),
            "envelopeVolume": read_u8(oracle, channel + 9),
            "count": read_u32(oracle, channel + 24),
        })
    cgb_chans = read_u32(oracle, SOUND_INFO_ADDR + SOUND_INFO_CGB_CHANS)
    cgb_flags = [] if cgb_chans == 0 else [read_u8(oracle, cgb_chans + index * 0x30) for index in range(4)]
    queued_gpu_offsets = [
        read_u8(oracle, GPU_REG_WAITING_LIST_ADDR + index)
        for index in range(GPU_REG_WAITING_LIST_SIZE)
    ]
    queued_gpu_offsets = [value for value in queued_gpu_offsets if value != 0xFF]
    return {
        "main": {
            "callback2": pointer_symbol(read_u32(oracle, G_MAIN_ADDR + G_MAIN_CALLBACK2_OFFSET)),
            "vblankCallback": pointer_symbol(read_u32(oracle, G_MAIN_ADDR + G_MAIN_VBLANK_CALLBACK_OFFSET)),
            "hblankCallback": pointer_symbol(read_u32(oracle, G_MAIN_ADDR + G_MAIN_HBLANK_CALLBACK_OFFSET)),
            "vcountCallback": pointer_symbol(read_u32(oracle, G_MAIN_ADDR + G_MAIN_VCOUNT_CALLBACK_OFFSET)),
            "serialCallback": pointer_symbol(read_u32(oracle, G_MAIN_ADDR + G_MAIN_SERIAL_CALLBACK_OFFSET)),
            "oamLoadDisabled": (main_flags & 1) != 0,
            "inBattle": (main_flags & 2) != 0,
            "trainerHillVBlankCounterActive": read_u32(oracle, G_TRAINER_HILL_VBLANK_COUNTER_ADDR) != 0,
        },
        "link": {
            "wirelessCommType": read_u8(oracle, G_WIRELESS_COMM_TYPE_ADDR),
            "linkVSyncDisabled": read_u8(oracle, G_LINK_VSYNC_DISABLED_ADDR) != 0,
        },
        "gpu": {
            "bufferLocked": read_u8(oracle, GPU_REG_BUFFER_LOCKED_ADDR) != 0,
            "queuedRegisterOffsets": queued_gpu_offsets,
            "spriteCopyPending": read_u8(oracle, SPRITE_COPY_PENDING_ADDR) != 0,
            "spriteCopyRequestCount": read_u8(oracle, SPRITE_COPY_COUNT_ADDR),
            "paletteTransferPending": read_u32(oracle, PALETTE_TRANSFER_PENDING_ADDR) != 0,
            "paletteFadeControl": read_u32(oracle, PALETTE_FADE_ADDR),
            "scanline": {
                "state": read_u8(oracle, SCANLINE_EFFECT_ADDR + 17),
                "sourceBuffer": read_u8(oracle, SCANLINE_EFFECT_ADDR + 16),
                "dmaControl": read_u32(oracle, SCANLINE_EFFECT_ADDR + 12),
            },
        },
        "dma3": snapshot_dma3_queue(oracle),
        "sound": {
            "ident": read_u32(oracle, SOUND_INFO_ADDR),
            "pcmDmaCounter": read_u8(oracle, SOUND_INFO_ADDR + SOUND_INFO_PCM_DMA_COUNTER),
            "pcmDmaPeriod": read_u8(oracle, SOUND_INFO_ADDR + SOUND_INFO_PCM_DMA_PERIOD),
            "pcmSamplesPerVBlank": read_u32(oracle, SOUND_INFO_ADDR + SOUND_INFO_PCM_SAMPLES_PER_VBLANK),
            "reverb": read_u8(oracle, SOUND_INFO_ADDR + SOUND_INFO_REVERB),
            "maxChans": read_u8(oracle, SOUND_INFO_ADDR + SOUND_INFO_MAX_CHANS),
            "maxLines": read_u8(oracle, SOUND_INFO_ADDR + SOUND_INFO_MAX_LINES),
            "frequency": read_u8(oracle, SOUND_INFO_ADDR + SOUND_INFO_FREQ),
            "c15": read_u8(oracle, SOUND_INFO_ADDR + SOUND_INFO_C15),
            "musicPlayers": snapshot_music_players(
                oracle, read_u32(oracle, SOUND_INFO_ADDR + SOUND_INFO_MUSIC_PLAYER_HEAD)
            ),
            "directChannels": sound_channels,
            "cgbChannelStatusFlags": cgb_flags,
            "dma1Control": read_u32(oracle, 0x040000C4),
            "dma2Control": read_u32(oracle, 0x040000D0),
        },
    }


def current_vblank_workload(epoch: dict[str, Any]) -> dict[str, Any] | None:
    """Return the currently executing VBlank record, if workload capture is enabled."""
    workloads = epoch.get("vblankWorkloads")
    if not workloads:
        return None
    for workload in reversed(workloads):
        if "resume" not in workload:
            return workload
    return None


def append_vblank_stage(epoch: dict[str, Any], oracle: EmeraldOracle, frame: int, pc: int, stage: str, **fields: Any) -> None:
    """Append a source instruction boundary to the active workload record."""
    workload = current_vblank_workload(epoch)
    if workload is not None:
        workload["stages"].append(cycle_snapshot(oracle, frame, pc, stage, **fields))


def start_m4a_internal_observation(epoch: dict[str, Any], oracle: EmeraldOracle, frame: int, pc: int) -> None:
    """Snapshot m4a state at its VBlank call boundary, not at epoch identity."""
    workload = current_vblank_workload(epoch)
    if workload is None or "audioInternal" in workload:
        return
    workload["audioInternal"] = {
        "state": snapshot_m4a_internal_state(oracle),
        "stages": [cycle_snapshot(oracle, frame, pc, "m4a-sound-main-call")],
    }


def append_m4a_internal_stage(epoch: dict[str, Any], oracle: EmeraldOracle, frame: int, pc: int, stage: str) -> None:
    """Append only a pinned m4a routine or loop-head boundary."""
    workload = current_vblank_workload(epoch)
    if workload is None:
        return
    audio = workload.get("audioInternal")
    if audio is not None:
        audio["stages"].append(cycle_snapshot(oracle, frame, pc, stage))


def cycle_snapshot(oracle: EmeraldOracle, frame: int, pc: int, kind: str, **fields: Any) -> dict[str, Any]:
    global_cycles = int(oracle.core._native.timing.globalCycles)
    frame_cycles = int(oracle.core.frame_cycles)
    cpu_cycles = int(oracle.core.cpu._native.cycles)
    master_cycles = global_cycles + cpu_cycles
    snapshot = {
        "kind": kind,
        "frame": frame,
        "globalCycles": global_cycles,
        "cpuCycles": cpu_cycles,
        "masterCycles": master_cycles,
        "cyclePhase": master_cycles % frame_cycles,
        "pc": f"0x{pc:08x}",
        **fields,
    }
    if TIMER0_CADENCE_EVIDENCE:
        snapshot["timer0"] = snapshot_timer0_cadence(oracle, global_cycles, cpu_cycles, master_cycles)
    if RESIDUAL_18_EVIDENCE:
        snapshot["executionState"] = snapshot_residual_execution_state(oracle)
    return snapshot


def snapshot_residual_execution_state(oracle: EmeraldOracle) -> dict[str, Any]:
    """Capture scheduler/bus state that can distinguish a non-source stall.

    All values are emulator/GBA scalar state at an exact compiled boundary.
    No party pointer, RNG cursor, frame identity, or observed duration is kept.
    """
    cpu = oracle.core.cpu._native
    gba = oracle.core._native
    memory = gba.memory
    return {
        "cpu": {
            "cycles": int(cpu.cycles),
            "nextEvent": int(cpu.nextEvent),
            "cpsr": int(cpu.cpsr.packed),
            "executionMode": int(cpu.executionMode),
            "privilegeMode": int(cpu.privilegeMode),
            "halted": int(cpu.halted),
            "prefetch": [int(cpu.prefetch[0]), int(cpu.prefetch[1])],
        },
        "gba": {
            "performingDma": int(gba.performingDMA),
            "springIrq": int(gba.springIRQ),
            "cpuBlocked": bool(gba.cpuBlocked),
            "dmaPc": int(gba.dmaPC),
        },
        "memory": {
            "activeRegion": int(memory.activeRegion),
            "prefetchEnabled": bool(memory.prefetch),
            "lastPrefetchedPc": int(memory.lastPrefetchedPc),
            "activeDma": int(memory.activeDMA),
            "dmaTransferRegister": int(memory.dmaTransferRegister),
            "dma": [
                {
                    "control": int(channel.reg),
                    "source": int(channel.source),
                    "destination": int(channel.dest),
                    "count": int(channel.count),
                    "nextSource": int(channel.nextSource),
                    "nextDestination": int(channel.nextDest),
                    "nextCount": int(channel.nextCount),
                    "when": int(channel.when),
                }
                for channel in memory.dma
            ],
        },
        "interrupt": {
            "ie": oracle.read_u16(0x04000200),
            "if": oracle.read_u16(0x04000202),
            "ime": oracle.read_u16(0x04000208),
            "dispstat": oracle.read_u16(0x04000004),
            "vcount": oracle.read_u16(0x04000006),
            "waitcnt": oracle.read_u16(0x04000204),
        },
    }


TIMING_QUEUE_EVENT_LIMIT = 32
TIMING_QUEUE_NAME_LIMIT = 64

TIMER0_CNT_L_ADDR = 0x04000100
TIMER0_CNT_H_ADDR = 0x04000102
TIMER0_EVENT_NAME = "GBA Timer 0"
FIFO_A_ADDR = 0x040000A0
FIFO_B_ADDR = 0x040000A4


def signed_timing_delta(when: int, master_cycles: int) -> int:
    """Return an mTiming absolute due time relative to global+CPU cycles."""
    delta = (int(when) - (master_cycles & 0xFFFFFFFF)) & 0xFFFFFFFF
    return delta - 0x1_0000_0000 if delta & 0x8000_0000 else delta


def classifier_return_class(entry_pc: int, stop_pc: int) -> str:
    return f"0x{entry_pc:08x}->0x{stop_pc:08x}"


def classifier_member(case: str, component: str, ordinal: int) -> bool:
    return ordinal in RESIDUAL_18_CLASSIFIER_MEMBERS[case].get(component, ())


def classifier_start_trace(
    epoch: dict[str, Any],
    *,
    label: str,
    component: str,
    ordinal: int,
    entry_pc: int,
    stop_pc: int | None,
    stop_kind: str,
    return_class: str,
) -> None:
    if epoch.get("residualClassifierTraceActive") is not None:
        raise RuntimeError("overlapping residual classifier instruction trace")
    epoch["residualClassifierTraceActive"] = {
        "label": label,
        "component": component,
        "ordinal": ordinal,
        "entryPc": f"0x{entry_pc:08x}",
        "stopPc": stop_pc,
        "stopKind": stop_kind,
        "returnClass": return_class,
        "boundaries": [],
    }


def classifier_maybe_start_trace(
    epoch: dict[str, Any],
    *,
    case: str,
    component: str,
    ordinal: int,
    entry_pc: int,
    stop_pc: int | None,
    stop_kind: str,
    return_class: str,
) -> None:
    member = classifier_member(case, component, ordinal)
    if member:
        label = "member"
    elif ordinal in RESIDUAL_18_CLASSIFIER_CLEAN_CONTROLS[case].get(component, ()):
        label = "control"
    else:
        return
    classifier_start_trace(
        epoch,
        label=label,
        component=component,
        ordinal=ordinal,
        entry_pc=entry_pc,
        stop_pc=stop_pc,
        stop_kind=stop_kind,
        return_class=return_class,
    )


def classifier_direct_component(operation: str, arguments: dict[str, int]) -> str | None:
    if operation == "get-mon-data" and arguments.get("field") not in {57, 58}:
        return "encrypted-accessor"
    if operation == "get-level-from-exp":
        return "level-loop"
    if operation == "divide":
        return "signed-divide"
    if operation == "get-nature":
        return "get-nature"
    return None


def observe_classifier_epoch_boundary(
    epoch: dict[str, Any], oracle: EmeraldOracle, pc: int,
) -> None:
    if not (RESIDUAL_18_CLASSIFIER_EVIDENCE or TIMER0_FIFO_EVIDENCE):
        return
    if epoch.get("entry") is None or epoch.get("return") is not None:
        return
    if pc == GET_NATURE_ENTRY_PC:
        counters = epoch.setdefault("residualClassifierOrdinals", {})
        component = "nature-attempt"
        ordinal = int(counters.get(component, 0))
        counters[component] = ordinal + 1
        classifier_maybe_start_trace(
            epoch,
            case=CASE,
            component=component,
            ordinal=ordinal,
            entry_pc=pc,
            stop_pc=None,
            stop_kind="nature",
            return_class="nature-attempt",
        )
    elif pc in {SELECTABLE_POST_END_PC, FILL_FACTORY_POST_END_PC}:
        counters = epoch.setdefault("residualClassifierOrdinals", {})
        component = "outer-factory-loop"
        ordinal = int(counters.get(component, 0))
        counters[component] = ordinal + 1
        classifier_maybe_start_trace(
            epoch,
            case=CASE,
            component=component,
            ordinal=ordinal,
            entry_pc=pc,
            stop_pc=CREATE_EV_ENTRY_PC,
            stop_kind="pc",
            return_class=classifier_return_class(pc, CREATE_EV_ENTRY_PC),
        )


def snapshot_timing_queue(timing) -> list[dict[str, Any]]:
    """Bounds-checked walk of mTiming's pending-event list.

    The vendored ffi declares both ``struct mTiming`` and
    ``struct mTimingEvent`` in full (root/reroot/globalCycles/... and
    context/callback/name/when/priority/next), so field access is
    layout-safe.  Validated 2026-08-10: 20,500 per-instruction walks with
    zero faults, and raw savestates are byte-identical with walks on vs.
    off.  The binding's known SIGSEGV is interpreter teardown, fires with
    no walk at all, and is already covered by tools/run-mgba-probe.py's
    accept-after-valid-JSON contract.  Guards here: never dereference NULL,
    cap the link walk, cap name reads.  No pointer values are retained.
    """
    events: list[dict[str, Any]] = []
    evt = timing.root
    while evt != MGBA_FFI.NULL and len(events) < TIMING_QUEUE_EVENT_LIMIT:
        name = None
        if evt.name != MGBA_FFI.NULL:
            raw = MGBA_FFI.string(evt.name, TIMING_QUEUE_NAME_LIMIT)
            name = raw.decode("ascii", "replace")
        events.append({
            "name": name,
            "when": int(evt.when),
            "priority": int(evt.priority),
        })
        evt = evt.next
    if evt != MGBA_FFI.NULL:
        events.append({"name": "<truncated>", "when": None, "priority": None})
    return events


def snapshot_timer0_cadence(
    oracle: EmeraldOracle, global_cycles: int, cpu_cycles: int, master_cycles: int,
) -> dict[str, Any]:
    """Capture source registers and only Timer 0's relative queue position."""
    timer_event = next(
        (event for event in snapshot_timing_queue(oracle.core._native.timing)
         if event["name"] == TIMER0_EVENT_NAME),
        None,
    )
    event: dict[str, Any] | None = None
    if timer_event is not None and timer_event["when"] is not None:
        when_delta = signed_timing_delta(timer_event["when"], master_cycles)
        event = {
            "name": TIMER0_EVENT_NAME,
            "priority": timer_event["priority"],
            "whenDelta": when_delta,
            "due": when_delta <= 0,
        }
    return {
        "tm0cntL": read_u16(oracle, TIMER0_CNT_L_ADDR),
        "tm0cntH": read_u16(oracle, TIMER0_CNT_H_ADDR),
        "globalCycles": global_cycles,
        "cpuCycles": cpu_cycles,
        "masterCycles": master_cycles,
        "event": event,
    }


def dma_destination_kind(address: int) -> str:
    if address == FIFO_A_ADDR:
        return "fifo-a"
    if address == FIFO_B_ADDR:
        return "fifo-b"
    if address == 0:
        return "none"
    return "other"


def runtime_scheduler_time(timing: Any) -> dict[str, int]:
    relative = int(timing.relativeCycles[0])
    master = int(timing.masterCycles)
    return {
        "masterCycles": master,
        "relativeCycles": relative,
        "currentTime": (master + relative) & 0xFFFFFFFF,
        "globalTime": int(timing.globalCycles) + relative,
    }


def snapshot_runtime_scheduler_hardware(oracle: EmeraldOracle, timing: Any) -> dict[str, Any]:
    """Snapshot every field required by the Timer 0 scheduler handoff."""
    gba = oracle.core._native
    audio = gba.audio
    now = runtime_scheduler_time(timing)

    def fifo_state(fifo: Any) -> dict[str, int]:
        write = int(fifo.fifoWrite)
        read = int(fifo.fifoRead)
        return {
            "fifoWrite": write,
            "fifoRead": read,
            "fifoWordLevel": (write - read) & 7,
            "internalRemaining": int(fifo.internalRemaining),
            "dmaSource": int(fifo.dmaSource),
        }

    dma_rows = []
    for channel in range(4):
        dma = gba.memory.dma[channel]
        control = int(dma.reg)
        when = int(dma.when)
        dma_rows.append({
            "channel": channel,
            "control": control,
            "enabled": bool(control & 0x8000),
            "timing": (control >> 12) & 3,
            "count": int(dma.count),
            "nextCount": int(dma.nextCount),
            "source": int(dma.source),
            "destination": int(dma.dest),
            "nextSource": int(dma.nextSource),
            "nextDestination": int(dma.nextDest),
            "when": when,
            "deadlineDelta": signed_timing_delta(when, now["currentTime"]),
        })

    queue = []
    for event in snapshot_timing_queue(timing):
        when = event["when"]
        queue.append({
            "name": event["name"],
            "priority": event["priority"],
            "when": when,
            "deadlineDelta": None if when is None else signed_timing_delta(when, now["currentTime"]),
            "due": False if when is None else signed_timing_delta(when, now["currentTime"]) <= 0,
        })

    mixer_present = audio.mixer != MGBA_FFI.NULL
    mixer: dict[str, Any] = {
        "present": mixer_present,
        "externalMixing": bool(audio.externalMixing),
    }
    if mixer_present:
        mixer["contextAddress"] = int(audio.mixer.contextAddress)

    return {
        "scheduler": now,
        "audio": {
            "enabled": bool(audio.enable),
            "mixer": mixer,
        },
        "fifo": {"a": fifo_state(audio.chA), "b": fifo_state(audio.chB)},
        "dma": dma_rows,
        "activeDma": int(gba.memory.activeDMA),
        "performingDma": int(gba.performingDMA),
        "cpuBlocked": bool(gba.cpuBlocked),
        "queue": queue,
    }


class Timer0SchedulerRuntimeCapture:
    """Transparent callback wrappers for two source-epoch Timer 0 windows."""

    def __init__(self, oracle: EmeraldOracle) -> None:
        self.oracle = oracle
        self.gba = oracle.core._native
        self.originals: list[tuple[Any, Any]] = []
        self.wrappers: list[Any] = []
        self.event_indexes: dict[int, int] = {}
        self.same_tick_history: list[dict[str, Any]] = []
        self.recent_history: list[dict[str, Any]] = []
        self.last_event_by_name: dict[str, dict[str, Any]] = {}
        self.tick_master_cycles: int | None = None
        self.windows: list[dict[str, Any]] = []
        self.pending: dict[str, Any] | None = None
        self.restored = False
        self.installed_names: list[str] = []
        self.dual_refill_scout: list[dict[str, Any]] = []
        self._install()

    def _install(self) -> None:
        events: list[Any] = []
        event = self.gba.timing.root
        while event != MGBA_FFI.NULL and len(events) < TIMING_QUEUE_EVENT_LIMIT:
            events.append(event)
            event = event.next
        events.extend([
            MGBA_FFI.addressof(self.gba.timers[0], "event"),
            MGBA_FFI.addressof(self.gba.memory, "dmaEvent"),
            MGBA_FFI.addressof(self.gba, "irqEvent"),
        ])
        seen: set[int] = set()
        for event in events:
            address = int(MGBA_FFI.cast("uintptr_t", event))
            if address in seen:
                continue
            seen.add(address)
            original = event.callback
            name = (
                MGBA_FFI.string(event.name, TIMING_QUEUE_NAME_LIMIT).decode("ascii", "replace")
                if event.name != MGBA_FFI.NULL else "<unnamed>"
            )

            @MGBA_FFI.callback("void(struct mTiming *, void *, uint32_t)")
            def wrapper(timing: Any, context: Any, cycles_late: int, *,
                        _event: Any = event, _name: str = name, _original: Any = original) -> None:
                self._callback(_event, _name, _original, timing, context, int(cycles_late))

            self.originals.append((event, original))
            self.wrappers.append(wrapper)
            self.event_indexes[address] = len(self.originals) - 1
            self.installed_names.append(name)
            event.callback = wrapper

    def restore(self) -> None:
        if self.restored:
            return
        for event, original in self.originals:
            event.callback = original
        self.restored = True

    @staticmethod
    def _dma_counts(state: dict[str, Any]) -> list[int]:
        return [row["nextCount"] for row in state["dma"]]

    def _event_record(self, event: Any, name: str, cycles_late: int,
                      state: dict[str, Any]) -> dict[str, Any]:
        scheduled_when = int(event.when)
        return {
            "name": name,
            "priority": int(event.priority),
            "scheduledWhen": scheduled_when,
            "cyclesLate": cycles_late,
            "schedulerCurrentTime": state["scheduler"]["currentTime"],
            "dmaNextCounts": self._dma_counts(state),
            "activeDma": state["activeDma"],
        }

    def _callback(self, event: Any, name: str, original: Any, timing: Any,
                  context: Any, cycles_late: int) -> None:
        entry = snapshot_runtime_scheduler_hardware(self.oracle, timing)
        master_cycles = entry["scheduler"]["masterCycles"]
        if self.tick_master_cycles != master_cycles:
            self.tick_master_cycles = master_cycles
            self.same_tick_history = []
        record = self._event_record(event, name, cycles_late, entry)
        preceding = [
            prior for prior in self.recent_history
            if (
                prior["schedulerCurrentTime"] == record["schedulerCurrentTime"]
                or prior["scheduledWhen"] == record["scheduledWhen"]
            )
        ]
        exact_deadline_predecessors = [
            prior for prior in self.last_event_by_name.values()
            if prior["scheduledWhen"] == record["scheduledWhen"]
        ]
        for prior in exact_deadline_predecessors:
            if prior not in preceding:
                preceding.append(prior)
        original(timing, context, cycles_late)
        if name == "GBA Video" and not self.restored:
            # Video alternates its event callback between _startHblank and
            # _startHdraw. Preserve that native phase while keeping this
            # transparent wrapper installed for the next occurrence.
            address = int(MGBA_FFI.cast("uintptr_t", event))
            index = self.event_indexes[address]
            next_original = event.callback
            self.originals[index] = (event, next_original)
            event.callback = self.wrappers[index]
        after = snapshot_runtime_scheduler_hardware(self.oracle, timing)
        record["dmaNextCountsAfter"] = self._dma_counts(after)

        if name == TIMER0_EVENT_NAME and self.pending is None:
            before_counts = self._dma_counts(entry)
            after_counts = self._dma_counts(after)
            requested = [
                channel for channel in range(4)
                if before_counts[channel] == 0 and after_counts[channel] > 0
            ]
            exact_co_due = [
                prior for prior in preceding
                if prior["scheduledWhen"] == record["scheduledWhen"]
            ]
            kind = "video-co-due-dual-refill" if any(
                prior["name"] == "GBA Video" for prior in exact_co_due
            ) else "isolated-dual-refill"
            if requested == [1, 2]:
                prior_video = next(
                    (prior for prior in reversed(self.recent_history) if prior["name"] == "GBA Video"),
                    None,
                )
                self.dual_refill_scout.append({
                    "timerWhen": record["scheduledWhen"],
                    "timerCurrent": record["schedulerCurrentTime"],
                    "priorNames": [prior["name"] for prior in preceding],
                    "priorVideoWhen": None if prior_video is None else prior_video["scheduledWhen"],
                    "priorVideoCurrent": None if prior_video is None else prior_video["schedulerCurrentTime"],
                })
            wanted = (
                requested == [1, 2]
                and kind not in {window["kind"] for window in self.windows}
                and kind in {"isolated-dual-refill", "video-co-due-dual-refill"}
            )
            if wanted:
                current_event = {
                    key: record[key]
                    for key in ("name", "priority", "scheduledWhen", "cyclesLate", "schedulerCurrentTime")
                }
                self.pending = {
                    "kind": kind,
                    "tickEntryCallbacksBeforeTimer0": preceding,
                    "exactCoDueCallbacksBeforeTimer0": exact_co_due,
                    "timer0CurrentEvent": current_event,
                    "timer0Entry": entry,
                    "timer0Exit": after,
                    "requestOrder": [
                        {"fifo": "a", "dmaChannel": 1},
                        {"fifo": "b", "dmaChannel": 2},
                    ],
                    "dmaCallbacks": [],
                    "completionOrder": [],
                }

        if self.pending is not None and name == "GBA DMA":
            active = record["activeDma"]
            callback = {
                **record,
                "activeNextCountAfter": (
                    after["dma"][active]["nextCount"] if 0 <= active < 4 else None
                ),
            }
            self.pending["dmaCallbacks"].append(callback)
            if (
                0 <= active < 4
                and record["dmaNextCounts"][active] != 0
                and after["dma"][active]["nextCount"] == 0
            ):
                self.pending["completionOrder"].append(active)
            if after["dma"][1]["nextCount"] == 0 and after["dma"][2]["nextCount"] == 0:
                self.pending["afterCompletion"] = after
                self.windows.append(self.pending)
                self.pending = None
                if len(self.windows) == 2:
                    self.restore()

        self.same_tick_history.append(record)
        self.recent_history.append(record)
        self.recent_history = self.recent_history[-32:]
        self.last_event_by_name[name] = record

    def finish(self) -> list[dict[str, Any]]:
        self.restore()
        if self.pending is not None:
            raise RuntimeError("Timer 0 runtime receipt ended during DMA service")
        kinds = {window["kind"] for window in self.windows}
        if kinds != {"isolated-dual-refill", "video-co-due-dual-refill"}:
            raise RuntimeError(
                f"Timer 0 runtime receipt missing required windows: {kinds}; "
                f"installed={self.installed_names}; scout={self.dual_refill_scout[:12]}"
            )
        return sorted(self.windows, key=lambda window: window["kind"] != "isolated-dual-refill")


class SelectedAdjacentDeadlineRuntimeCapture:
    """Transparent wrappers for LILIANA's Timer@D then Audio@D+1 edge."""

    EVENT_NAMES = (TIMER0_EVENT_NAME, "GBA Audio Sample", "GBA DMA")

    def __init__(self, oracle: EmeraldOracle) -> None:
        self.oracle = oracle
        self.gba = oracle.core._native
        self.originals: list[tuple[Any, Any]] = []
        self.wrappers: list[Any] = []
        self.installed_names: list[str] = []
        self.install_state = snapshot_runtime_scheduler_hardware(
            oracle, self.gba.timing
        )
        self.armed = False
        self.complete = False
        self.restored = False
        self.timeline: list[dict[str, Any]] = []
        self.timer_record: dict[str, Any] | None = None
        self.audio_record: dict[str, Any] | None = None
        self.completion_order: list[int] = []
        self.final_state: dict[str, Any] | None = None
        self._install()
        due = {
            event["name"]: event["deadlineDelta"]
            for event in self.install_state["queue"]
            if event["name"] in {TIMER0_EVENT_NAME, "GBA Audio Sample"}
        }
        if set(due) != {TIMER0_EVENT_NAME, "GBA Audio Sample"}:
            self.restore()
            raise RuntimeError(f"selected runtime install lacks Timer/Audio roots: {due}")
        if any(delta is None or delta <= 0 for delta in due.values()):
            self.restore()
            raise RuntimeError(f"selected runtime wrappers installed after a deadline: {due}")

    @staticmethod
    def _event_name(event: Any) -> str:
        if event.name == MGBA_FFI.NULL:
            return "<unnamed>"
        return MGBA_FFI.string(
            event.name, TIMING_QUEUE_NAME_LIMIT
        ).decode("ascii", "replace")

    def _install(self) -> None:
        by_name: dict[str, Any] = {}
        event = self.gba.timing.root
        while event != MGBA_FFI.NULL and len(by_name) < TIMING_QUEUE_EVENT_LIMIT:
            name = self._event_name(event)
            if name in self.EVENT_NAMES:
                by_name[name] = event
            event = event.next
        by_name[TIMER0_EVENT_NAME] = MGBA_FFI.addressof(
            self.gba.timers[0], "event"
        )
        by_name["GBA DMA"] = MGBA_FFI.addressof(self.gba.memory, "dmaEvent")
        missing = set(self.EVENT_NAMES) - set(by_name)
        if missing:
            raise RuntimeError(f"selected runtime wrapper events missing: {sorted(missing)}")
        for name in self.EVENT_NAMES:
            event = by_name[name]
            original = event.callback

            @MGBA_FFI.callback("void(struct mTiming *, void *, uint32_t)")
            def wrapper(timing: Any, context: Any, cycles_late: int, *,
                        _event: Any = event, _name: str = name,
                        _original: Any = original) -> None:
                self._callback(
                    _event, _name, _original, timing, context, int(cycles_late)
                )

            self.originals.append((event, original))
            self.wrappers.append(wrapper)
            self.installed_names.append(name)
            event.callback = wrapper

    def arm(self) -> None:
        if self.armed or self.restored:
            raise RuntimeError("selected runtime wrapper cannot be armed twice")
        self.armed = True

    def restore(self) -> None:
        if self.restored:
            return
        for event, original in self.originals:
            event.callback = original
        self.restored = True

    @staticmethod
    def _dma_counts(state: dict[str, Any]) -> list[int]:
        return [row["nextCount"] for row in state["dma"]]

    def _callback(self, event: Any, name: str, original: Any, timing: Any,
                  context: Any, cycles_late: int) -> None:
        if not self.armed:
            original(timing, context, cycles_late)
            return
        entry = snapshot_runtime_scheduler_hardware(self.oracle, timing)
        record = {
            "sequence": len(self.timeline),
            "name": name,
            "priority": int(event.priority),
            "scheduledWhen": int(event.when),
            "cyclesLate": cycles_late,
            "schedulerCurrentTime": entry["scheduler"]["currentTime"],
            "entry": entry,
        }
        original(timing, context, cycles_late)
        after = snapshot_runtime_scheduler_hardware(self.oracle, timing)
        record["exit"] = after
        self.timeline.append(record)

        if name == TIMER0_EVENT_NAME:
            if self.timer_record is not None:
                self.restore()
                return
            self.timer_record = record
        elif name == "GBA Audio Sample":
            if self.audio_record is None:
                self.audio_record = record
        elif name == "GBA DMA":
            active = entry["activeDma"]
            if (
                active in {1, 2}
                and entry["dma"][active]["nextCount"] != 0
                and after["dma"][active]["nextCount"] == 0
            ):
                self.completion_order.append(active)

        if (
            self.timer_record is not None
            and self.audio_record is not None
            and self.completion_order == [1, 2]
        ):
            self.complete = True
            self.final_state = after
            self.restore()

    def finish(self) -> dict[str, Any]:
        self.restore()
        if not self.armed or not self.complete:
            raise RuntimeError(
                "selected adjacent-deadline runtime capture incomplete: "
                f"armed={self.armed} complete={self.complete} "
                f"names={[row['name'] for row in self.timeline]} "
                f"completion={self.completion_order}"
            )
        assert self.timer_record is not None
        assert self.audio_record is not None
        timer_due = self.timer_record["scheduledWhen"]
        audio_due = self.audio_record["scheduledWhen"]
        timer_index = self.timeline.index(self.timer_record)
        audio_index = self.timeline.index(self.audio_record)
        timer_before = self._dma_counts(self.timer_record["entry"])
        timer_after = self._dma_counts(self.timer_record["exit"])
        requested = [
            channel for channel in range(4)
            if timer_before[channel] == 0 and timer_after[channel] > 0
        ]
        if audio_due - timer_due != 1 or timer_index >= audio_index:
            raise RuntimeError(
                "selected runtime deadline/order mismatch: "
                f"Timer={timer_due}@{timer_index} Audio={audio_due}@{audio_index}"
            )
        if requested != [1, 2] or self.completion_order != [1, 2]:
            raise RuntimeError(
                f"selected runtime DMA mismatch: requested={requested} "
                f"completion={self.completion_order}"
            )
        compact_timeline = []
        for row in self.timeline:
            entry = row["entry"]
            after = row["exit"]
            compact_timeline.append({
                key: row[key]
                for key in (
                    "sequence", "name", "priority", "scheduledWhen",
                    "cyclesLate", "schedulerCurrentTime",
                )
            } | {
                "entry": {
                    "dmaNextCounts": self._dma_counts(entry),
                    "activeDma": entry["activeDma"],
                    "performingDma": entry["performingDma"],
                    "cpuBlocked": entry["cpuBlocked"],
                },
                "exit": {
                    "dmaNextCounts": self._dma_counts(after),
                    "activeDma": after["activeDma"],
                    "performingDma": after["performingDma"],
                    "cpuBlocked": after["cpuBlocked"],
                },
            })
        return {
            "installState": self.install_state,
            "deadlineOrder": [TIMER0_EVENT_NAME, "GBA Audio Sample"],
            "audioTimerDeadlineDelta": audio_due - timer_due,
            "requestOrder": [
                {"fifo": "a", "dmaChannel": 1},
                {"fifo": "b", "dmaChannel": 2},
            ],
            "completionOrder": self.completion_order,
            "timeline": compact_timeline,
            "hardwareStates": {
                "timer0Entry": self.timer_record["entry"],
                "timer0Exit": self.timer_record["exit"],
                "audioEntry": self.audio_record["entry"],
                "audioExit": self.audio_record["exit"],
                "afterCompletion": self.final_state,
            },
            "wrappersRestoredAfterSequence": compact_timeline[-1]["sequence"],
        }


def snapshot_timer0_fifo_state(oracle: EmeraldOracle, master_cycles: int) -> dict[str, Any]:
    """Capture the smallest safe mGBA state around one Timer 0 reschedule.

    The raw event ``when`` and mGBA internal ``lastEvent`` are retained only
    transiently for crossing detection; the compact receipt removes them,
    along with all absolute time and address identity. FIFO indices and
    ``internalRemaining`` are the direct-sound state needed to tell a sample
    consumption from a DMA refill; DMA1/2 controls/counters and normalized
    destinations expose which channel actually changed.
    """
    gba = oracle.core._native
    cpu = oracle.core.cpu._native
    timer = gba.timers[0]
    timer_event = timer.event
    audio = gba.audio

    def fifo_state(fifo: Any) -> dict[str, int]:
        write = int(fifo.fifoWrite)
        read = int(fifo.fifoRead)
        return {
            "fifoWrite": write,
            "fifoRead": read,
            "fifoWordLevel": (write - read) & 7,
            "internalRemaining": int(fifo.internalRemaining),
            "dmaSource": int(fifo.dmaSource),
        }

    dma_rows: list[dict[str, Any]] = []
    for channel in (
        1,
        2,
    ):
        internal = gba.memory.dma[channel]
        control = int(internal.reg)
        destination = int(internal.dest)
        dma_rows.append({
            "channel": channel,
            "control": control,
            "enabled": bool(control & 0x8000),
            "repeat": bool(control & 0x0200),
            "width": 32 if control & 0x0400 else 16,
            "timing": (control >> 12) & 3,
            "destControl": (control >> 5) & 3,
            "sourceControl": (control >> 7) & 3,
            "internalCount": int(internal.count),
            "internalNextCount": int(internal.nextCount),
            "internalWhenDelta": (
                signed_timing_delta(int(internal.when), master_cycles)
                if int(internal.when) != 0 else None
            ),
            "destinationKind": dma_destination_kind(destination),
        })

    return {
        "masterCycles": master_cycles,
        "timerEventWhenRaw": int(timer_event.when),
        "timer0": {
            "tm0cntL": read_u16(oracle, TIMER0_CNT_L_ADDR),
            "tm0cntH": read_u16(oracle, TIMER0_CNT_H_ADDR),
            "reload": int(timer.reload),
            "lastEvent": int(timer.lastEvent),
            "flags": int(timer.flags),
            "eventWhenDelta": signed_timing_delta(int(timer_event.when), master_cycles),
            "eventDue": signed_timing_delta(int(timer_event.when), master_cycles) <= 0,
        },
        "fifo": {
            "a": fifo_state(audio.chA),
            "b": fifo_state(audio.chB),
        },
        "dma": dma_rows,
        "cpu": {
            "nextEventDistance": int(cpu.nextEvent) - int(cpu.cycles),
            "prefetchEnabled": bool(gba.memory.prefetch),
            "performingDma": int(gba.performingDMA),
            "cpuBlocked": bool(gba.cpuBlocked),
            "activeDma": int(gba.memory.activeDMA),
        },
    }


def observe_residual_instruction_trace(
    epoch: dict[str, Any], oracle: EmeraldOracle, pc: int,
) -> None:
    timing = oracle.core._native.timing
    cpu = oracle.core.cpu._native
    master_cycles = int(timing.globalCycles) + int(cpu.cycles)
    classifier = epoch.get("residualClassifierTraceActive")
    if classifier is not None:
        candidate_pc = pc - 2 in RESIDUAL_18_CLASSIFIER_QUEUE_INSTRUCTION_PCS
        pending_queue = classifier.pop("queueAfterPending", False)
        queue_needed = candidate_pc or pending_queue
        queue_before = snapshot_timing_queue(timing) if queue_needed else []
        hardware_before = (
            snapshot_timer0_fifo_state(oracle, master_cycles)
            if TIMER0_FIFO_EVIDENCE and queue_needed else None
        )
        if candidate_pc:
            classifier["queueAfterPending"] = True
        current = {
            "observedPc": f"0x{pc:08x}",
            "instructionPc": f"0x{pc - 2:08x}",
            "masterCycles": master_cycles,
            "cpuCycles": int(cpu.cycles),
            "timingMasterCycles": int(timing.masterCycles),
            "nextEvent": int(cpu.nextEvent),
            "eventQueue": queue_before,
            "timer0FifoState": hardware_before,
        }
        previous = classifier.pop("lastBoundary", None)
        if previous is not None:
            # A selected trace can terminate on the instruction immediately
            # after a candidate edge.  Re-take the after state at that stop
            # boundary so the crossing still has a complete before/after pair.
            if (
                TIMER0_FIFO_EVIDENCE
                and previous.get("timer0FifoState") is not None
                and current.get("timer0FifoState") is None
            ):
                current["timer0FifoState"] = snapshot_timer0_fifo_state(
                    oracle, master_cycles
                )
                current["eventQueue"] = snapshot_timing_queue(timing)
            key = (previous["instructionPc"], current["instructionPc"])
            edge = {
                "instructionPc": key[0],
                "nextInstructionPc": key[1],
                "cycles": current["masterCycles"] - previous["masterCycles"],
                "eventDistance": int(previous["nextEvent"]) - int(previous["cpuCycles"]),
                "queueBefore": classifier_queue(previous),
                "queueAfter": classifier_queue(current),
                "timer0FifoBefore": previous.get("timer0FifoState"),
                "timer0FifoAfter": current.get("timer0FifoState"),
            }
            edges = classifier.setdefault("edges", {})
            prior = edges.get(key)
            prefer_larger = classifier["label"] == "member"
            if prior is None or (
                edge["cycles"] > prior["cycles"]
                if prefer_larger
                else edge["cycles"] < prior["cycles"]
            ):
                edges[key] = edge
        classifier["lastBoundary"] = current
        stop = False
        if classifier["stopKind"] == "return":
            stop = pc in {classifier["stopPc"], classifier["stopPc"] + 2}
        elif classifier["stopKind"] == "pc":
            stop = pc == classifier["stopPc"]
        elif classifier["stopKind"] == "nature":
            caller = symbol_at(int(oracle.core.cpu.lr))
            stop = (
                pc == CREATE_MON_ENTRY_PC
                or (pc == RANDOM_ENTRY_PC and not caller.startswith("VBlankIntr"))
            )
        if stop:
            classifier["stopObservedPc"] = f"0x{pc:08x}"
            classifier["edges"] = list(classifier.pop("edges", {}).values())
            classifier.pop("lastBoundary", None)
            classifier.pop("queueWalks", None)
            if classifier["stopKind"] == "nature":
                classifier["returnClass"] = classifier_return_class(
                    int(classifier["entryPc"], 16), pc,
                )
            epoch.setdefault("residualClassifierTraces", []).append(classifier)
            epoch.pop("residualClassifierTraceActive", None)
        return

    active = epoch.get("residualInstructionTraceActive")
    if active is None:
        return
    queue_before = snapshot_timing_queue(timing)
    active["boundaries"].append({
        "observedPc": f"0x{pc:08x}",
        "instructionPc": f"0x{pc - 2:08x}",
        "masterCycles": master_cycles,
        "cpuCycles": int(cpu.cycles),
        "timingMasterCycles": int(timing.masterCycles),
        "nextEvent": int(cpu.nextEvent),
        "eventQueue": queue_before,
    })
    stop = False
    if pc in {active["returnPc"], active["returnPc"] + 2}:
        stop = True
    if stop:
        epoch.setdefault("residualInstructionTraces", []).append(active)
        epoch.pop("residualInstructionTraceActive", None)


def observe_ewram_access_boundary(
    epoch: dict[str, Any], oracle: EmeraldOracle, frame: int, pc: int
) -> None:
    """Pair one pinned EWRAM instruction with its immediate successor."""
    component = epoch.get("ewramComponentActive")
    if component is not None and (
        (component["kind"] == "checksum-loop" and pc == 0x08068D00)
        or (
            component["kind"] != "checksum-loop"
            and pc in {component["returnPc"], component["returnPc"] + 2}
        )
    ):
        end = cycle_snapshot(oracle, frame, pc, "ewram-component-end")
        completed = dict(component)
        completed["cycles"] = end["masterCycles"] - completed.pop("startMasterCycles")
        completed["returnPc"] = f"0x{pc:08x}"
        epoch.setdefault("ewramComponentBoundaries", []).append(completed)
        epoch.pop("ewramComponentActive", None)

    if epoch.get("ewramComponentActive") is None:
        component_kind = {
            0x0806A22A: "encrypt-loop",
            0x0806A24E: "decrypt-loop",
            0x08068CB2: "checksum-loop",
        }.get(pc)
        if component_kind is not None:
            epoch["ewramComponentActive"] = {
                "kind": component_kind,
                "entryPc": f"0x{pc - 2:08x}",
                "returnPc": 0x08068CFE if component_kind == "checksum-loop" else (oracle.core.cpu.lr & ~1),
                "startMasterCycles": cycle_snapshot(
                    oracle, frame, pc, "ewram-component-start"
                )["masterCycles"],
            }

    pending = epoch.get("ewramAccessPending")
    if pending is not None and pc == pending["nextObservedPc"]:
        end = cycle_snapshot(oracle, frame, pc, "ewram-access-end")
        row = dict(pending)
        row["endMasterCycles"] = end["masterCycles"]
        row["cycles"] = end["masterCycles"] - row.pop("startMasterCycles")
        row.pop("nextObservedPc")
        epoch.setdefault("ewramAccessBoundaries", []).append(row)
        epoch.pop("ewramAccessPending", None)

    descriptor = EWRAM_ACCESS_BOUNDARIES.get(pc)
    if descriptor is None or epoch.get("ewramAccessPending") is not None:
        return
    label, instruction_pc, next_pc, access, width, base_register, offset = descriptor
    address = (cpu_gpr(oracle, base_register) + offset) & 0xFFFFFFFF
    active = epoch.get("calculateMonStatsActiveCall")
    field = None
    if active is not None and active.get("operation") == "get-mon-data":
        field = active.get("arguments", {}).get("field")
    epoch["ewramAccessPending"] = {
        "label": label,
        "instructionPc": f"0x{instruction_pc:08x}",
        "observedPc": f"0x{pc:08x}",
        "nextObservedPc": next_pc,
        "access": access,
        "width": width,
        "addressModulo4": address & 3,
        "field": field,
        "frame": frame,
        "startMasterCycles": cycle_snapshot(
            oracle, frame, pc, "ewram-access-start"
        )["masterCycles"],
    }


def cpu_gpr(oracle: EmeraldOracle, index: int) -> int:
    """Read a scalar argument/result without retaining a mon-memory address."""
    return int(oracle.core.cpu.gprs[index])


def calculate_mon_stats_call_arguments(operation: str, oracle: EmeraldOracle) -> dict[str, int]:
    """Capture only branch-relevant scalar ABI arguments at a direct call."""
    if operation in {"get-mon-data", "set-mon-data"}:
        return {"field": cpu_gpr(oracle, 1)}
    if operation == "divide":
        return {"dividend": cpu_gpr(oracle, 0), "divisor": cpu_gpr(oracle, 1)}
    if operation == "modify-stat-by-nature":
        return {
            "nature": cpu_gpr(oracle, 0),
            "stat": cpu_gpr(oracle, 1),
            "statIndex": cpu_gpr(oracle, 2),
        }
    if operation == "get-level-from-exp":
        # The outer ABI is a Pokemon pointer, but both encrypted accessors
        # below route GetSubstruct through personality % 24. Preserve only the
        # scalar source state needed to audit that compiled route.
        return {"personality": read_u32(oracle, cpu_gpr(oracle, 0))}
    return {}


def observe_calculate_mon_stats_call(
    epoch: dict[str, Any],
    oracle: EmeraldOracle,
    frame: int,
    pc: int,
) -> None:
    """Pair each direct CalculateMonStats call at ELF-pinned instruction boundaries."""
    if not CALCULATE_MON_STATS_EVIDENCE:
        return

    active = epoch.get("calculateMonStatsActiveCall")
    if active is not None:
        if active["operation"] == "get-level-from-exp":
            # GetLevelFromMonExp's source inputs are not ABI registers at its
            # outer entry: both are returned by nested GetMonData2 calls. Keep
            # only those scalar results and the compiled loop boundaries; do
            # not retain the party pointer or decrypted box-mon storage.
            if pc == 0x08069062:  # after GetMonData2(MON_DATA_SPECIES)
                active["arguments"]["species"] = cpu_gpr(oracle, 0) & 0xFFFF
                active.setdefault("boundaries", {})["speciesAccessorReturn"] = cycle_snapshot(
                    oracle, frame, pc, "get-level-species-accessor-return",
                )
            elif pc == 0x08069072:  # after GetMonData2(MON_DATA_EXP)
                active["arguments"]["experience"] = cpu_gpr(oracle, 0)
                active.setdefault("boundaries", {})["experienceAccessorReturn"] = cycle_snapshot(
                    oracle, frame, pc, "get-level-experience-accessor-return",
                )
            elif pc == 0x08069084:  # after gSpeciesInfo[species].growthRate load
                active["arguments"]["growthRate"] = cpu_gpr(oracle, 0) & 0xFF
                active.setdefault("boundaries", {})["growthRateLoaded"] = cycle_snapshot(
                    oracle, frame, pc, "get-level-growth-rate-loaded",
                )
            elif pc == 0x08069090:  # first experience-table comparison
                active.setdefault("boundaries", {})["firstLevelCompare"] = cycle_snapshot(
                    oracle, frame, pc, "get-level-first-compare",
                )
                if RESIDUAL_18_CLASSIFIER_EVIDENCE or TIMER0_FIFO_EVIDENCE:
                    classifier_maybe_start_trace(
                        epoch,
                        case=CASE,
                        component="level-loop",
                        ordinal=int(active["classifierOrdinal"]),
                        entry_pc=pc,
                        stop_pc=0x080690AC,
                        stop_kind="pc",
                        return_class=classifier_return_class(pc, 0x080690AC),
                    )
            elif pc == 0x080690AC:  # common loop exit, before level - 1
                active.setdefault("boundaries", {})["loopExit"] = cycle_snapshot(
                    oracle, frame, pc, "get-level-loop-exit",
                )
            elif pc == 0x08000846:  # VCountIntr entry inside this callee
                active.setdefault("asyncService", []).append(cycle_snapshot(
                    oracle, frame, pc, "get-level-vcount-entry",
                ))
            elif pc == 0x082DFA12:  # m4aSoundVSync entry from VCountIntr
                active.setdefault("asyncService", []).append(cycle_snapshot(
                    oracle, frame, pc, "get-level-m4a-sound-vsync-entry",
                ))
            elif pc == 0x0800086E:  # VCountIntr terminal bx
                active.setdefault("asyncService", []).append(cycle_snapshot(
                    oracle, frame, pc, "get-level-vcount-return",
                ))
        return_pc = int(active["returnPc"], 16)
        if pc in {return_pc, return_pc + 2}:
            completed = dict(active)
            return_snapshot = cycle_snapshot(
                oracle, frame, pc, "calculate-mon-stats-direct-return",
            )
            completed["returnMasterCycles"] = return_snapshot["masterCycles"]
            if RESIDUAL_18_EVIDENCE:
                completed["returnCyclePhase"] = return_snapshot["cyclePhase"]
                completed["returnExecutionState"] = return_snapshot["executionState"]
            completed["returnPcObserved"] = f"0x{pc:08x}"
            if active["operation"] != "set-mon-data":
                completed["result"] = cpu_gpr(oracle, 0)
            epoch.setdefault("calculateMonStatsCalls", []).append(completed)
            epoch.pop("calculateMonStatsActiveCall", None)

    # CreateMon itself invokes CalculateMonStats before the outer Factory
    # EV-spread boundary. This v1 receipt is deliberately scoped to the later
    # CalculateMonStats call whose entry is already pinned in v2.
    if epoch.get("calculateMonStatsActiveMonIndex") is None:
        return

    # Thumb BL stores the return address (+4, with the Thumb bit) in LR.
    call_pc = (oracle.core.cpu.lr & ~1) - 4
    descriptor = CALCULATE_MON_STATS_DIRECT_CALLS.get(call_pc)
    if descriptor is None:
        return
    operation, target, expected_entry_pc = descriptor
    if pc != expected_entry_pc:
        return
    if epoch.get("calculateMonStatsActiveCall") is not None:
        raise RuntimeError("nested direct CalculateMonStats observation")
    entry_snapshot = cycle_snapshot(
        oracle, frame, pc, "calculate-mon-stats-direct-entry",
    )
    epoch["calculateMonStatsActiveCall"] = {
        "monIndex": epoch.get("calculateMonStatsActiveMonIndex"),
        "operation": operation,
        "target": target,
        "callPc": f"0x{call_pc:08x}",
        "entryPc": f"0x{pc:08x}",
        "returnPc": f"0x{(oracle.core.cpu.lr & ~1):08x}",
        "entryMasterCycles": entry_snapshot["masterCycles"],
        "arguments": calculate_mon_stats_call_arguments(operation, oracle),
    }
    if RESIDUAL_18_CLASSIFIER_EVIDENCE or TIMER0_FIFO_EVIDENCE:
        arguments = epoch["calculateMonStatsActiveCall"]["arguments"]
        component = classifier_direct_component(operation, arguments)
        if component is not None and component != "level-loop":
            counters = epoch.setdefault("residualClassifierOrdinals", {})
            ordinal = int(counters.get(component, 0))
            counters[component] = ordinal + 1
            epoch["calculateMonStatsActiveCall"]["classifierComponent"] = component
            epoch["calculateMonStatsActiveCall"]["classifierOrdinal"] = ordinal
            return_pc = int(oracle.core.cpu.lr) & ~1
            classifier_maybe_start_trace(
                epoch,
                case=CASE,
                component=component,
                ordinal=ordinal,
                entry_pc=pc,
                stop_pc=return_pc,
                stop_kind="return",
                return_class=classifier_return_class(pc, return_pc),
            )
        elif component == "level-loop":
            counters = epoch.setdefault("residualClassifierOrdinals", {})
            ordinal = int(counters.get(component, 0))
            counters[component] = ordinal + 1
            epoch["calculateMonStatsActiveCall"]["classifierComponent"] = component
            epoch["calculateMonStatsActiveCall"]["classifierOrdinal"] = ordinal
    if RESIDUAL_18_INSTRUCTION_EVIDENCE and operation == "divide":
        arguments = epoch["calculateMonStatsActiveCall"]["arguments"]
        selector = (
            int(epoch.get("calculateMonStatsActiveMonIndex")),
            arguments["dividend"],
            arguments["divisor"],
        )
        selected = RESIDUAL_18_DIVIDE_TRACE_SELECTORS.get(selector)
        if selected is not None:
            if epoch.get("residualInstructionTraceActive") is not None:
                raise RuntimeError("overlapping residual instruction trace")
            label, residual_cycles = selected
            epoch["residualInstructionTraceActive"] = {
                "label": label,
                "component": "signed-divide",
                "entryPc": f"0x{pc:08x}",
                "returnPc": int(oracle.core.cpu.lr & ~1),
                "arguments": arguments,
                "sourceCycles": 318,
                "residualCycles": residual_cycles,
                "boundaries": [],
            }
    if RESIDUAL_18_EVIDENCE:
        epoch["calculateMonStatsActiveCall"]["entryCyclePhase"] = entry_snapshot["cyclePhase"]
        epoch["calculateMonStatsActiveCall"]["entryExecutionState"] = entry_snapshot["executionState"]


def symbols(elf: Path) -> list[tuple[int, str]]:
    output = subprocess.run(
        ["arm-none-eabi-nm", "--defined-only", "-n", str(elf)],
        capture_output=True,
        text=True,
        check=True,
    ).stdout
    rows: list[tuple[int, str]] = []
    for line in output.splitlines():
        fields = line.split()
        if len(fields) == 3 and fields[1] in ("t", "T"):
            rows.append((int(fields[0], 16), fields[2]))
    return rows


SYMBOLS = symbols(REFERENCE / "pokeemerald.elf")


def symbol_at(address: int) -> str:
    index = bisect.bisect_right(SYMBOLS, (address, "\uffff")) - 1
    if index < 0:
        return f"0x{address:08x}"
    base, name = SYMBOLS[index]
    return name if address == base else f"{name}+0x{address - base:x}"


def read_u32(oracle: EmeraldOracle, address: int) -> int:
    return oracle.read_u32(address)


def read_u16(oracle: EmeraldOracle, address: int) -> int:
    return oracle.read_u16(address)


def advance_one_instrumented_frame(
    oracle: EmeraldOracle,
    buttons: list[str],
    frame: int,
    active_frames: set[int],
    calls: list[dict[str, Any]],
    target_entry: int,
    epoch: dict[str, Any],
    normal_advance: Callable[[list[str]], None] | None = None,
    increment_oracle_frame: bool = True,
) -> None:
    """Run one video frame, stepping only selected frames instruction-wise."""
    if frame not in active_frames:
        (normal_advance or oracle.advance)(buttons)
        return

    oracle._set_buttons(buttons)
    start_counter = oracle.core.frame_counter
    steps = 0
    while True:
        pc = oracle.core.cpu.pc
        if TIMER0_SELECTED_EDGE_RUNTIME_EVIDENCE:
            selector = epoch.setdefault(
                "timer0SelectedEdgeSelector",
                SelectedEncryptedAccessorEdge(LILIANA_AUDIO_EDGE),
            )
            selected_now = selector.observe(
                pc,
                lr=int(oracle.core.cpu.lr),
                field=(
                    cpu_gpr(oracle, 1)
                    if pc == GET_BOX_MON_DATA2_ENTRY_PC else None
                ),
                outer_stats_entry=(
                    pc == CALCULATE_STATS_ENTRY_PC
                    and symbol_at(oracle.core.cpu.lr).startswith(
                        "CreateMonWithEVSpreadNatureOTID"
                    )
                ),
            )
            if (
                pc == GET_BOX_MON_DATA2_ENTRY_PC
                and selector.selected_accessor_active
                and epoch.get("timer0SelectedEdgeRuntimeCapture") is None
            ):
                epoch["timer0SelectedEdgeRuntimeCapture"] = (
                    SelectedAdjacentDeadlineRuntimeCapture(oracle)
                )
            if selected_now:
                capture = epoch.get("timer0SelectedEdgeRuntimeCapture")
                if capture is None:
                    raise RuntimeError(
                        "selected adjacent-deadline wrapper was not installed"
                    )
                capture.arm()
        if CYCLE_EVIDENCE:
            cycle_events = epoch.setdefault("cycleEvents", [])
            awaiting_resume = epoch.get("awaitingVBlankResume")
            if (
                awaiting_resume is not None
                and VBLANK_WORKLOAD_EVIDENCE
                and pc in NON_VBLANK_ISR_ENTRY_PCS
                and epoch.get("return") is None
            ):
                # Do not mistake a nested ISR for the interrupted source
                # instruction resuming.  The report distinguishes a real ROM
                # ISR entry from timing that mGBA services outside a ROM path.
                append_vblank_stage(
                    epoch, oracle, frame, pc, "non-vblank-isr-entry",
                    isr=NON_VBLANK_ISR_ENTRY_PCS[pc],
                )
            elif awaiting_resume is not None and pc >= 0x08000800 and epoch.get("return") is None:
                cycle_events.append(cycle_snapshot(
                    oracle, frame, pc, "vblank-resume",
                    interruptIndex=awaiting_resume,
                    resumeFunction=symbol_at(pc - 2),
                ))
                if VBLANK_WORKLOAD_EVIDENCE:
                    workload = current_vblank_workload(epoch)
                    if workload is not None:
                        workload["resume"] = cycle_snapshot(
                            oracle, frame, pc, "vblank-resume",
                            resumeFunction=symbol_at(pc - 2),
                        )
                epoch.pop("awaitingVBlankResume", None)
            if VBLANK_WORKLOAD_INTERNAL_EVIDENCE and pc == M4A_SOUND_MAIN_CALL_PC:
                start_m4a_internal_observation(epoch, oracle, frame, pc)
            if VBLANK_WORKLOAD_INTERNAL_EVIDENCE and pc in M4A_INTERNAL_STAGE_PCS:
                append_m4a_internal_stage(
                    epoch, oracle, frame, pc, M4A_INTERNAL_STAGE_PCS[pc]
                )
            if VBLANK_WORKLOAD_INTERNAL_EVIDENCE and pc == M4A_SOUND_MAIN_RETURN_PC:
                append_m4a_internal_stage(epoch, oracle, frame, pc, "m4a-sound-main-return")
            if VBLANK_WORKLOAD_EVIDENCE and pc in VBLANK_STAGE_PCS:
                append_vblank_stage(epoch, oracle, frame, pc, VBLANK_STAGE_PCS[pc])
            observe_classifier_epoch_boundary(epoch, oracle, pc)
            observe_calculate_mon_stats_call(epoch, oracle, frame, pc)
            if (
                RESIDUAL_18_INSTRUCTION_EVIDENCE
                or RESIDUAL_18_CLASSIFIER_EVIDENCE
                or TIMER0_FIFO_EVIDENCE
            ):
                observe_residual_instruction_trace(epoch, oracle, pc)
            if EWRAM_ACCESS_EVIDENCE:
                observe_ewram_access_boundary(epoch, oracle, frame, pc)
            if pc == target_entry and epoch.get("entry") is None:
                if (
                    TIMER0_SCHEDULER_RUNTIME_EVIDENCE
                    and epoch.get("timer0SchedulerRuntimeCapture") is None
                ):
                    epoch["timer0SchedulerRuntimeCapture"] = Timer0SchedulerRuntimeCapture(oracle)
                cycle_events.append(cycle_snapshot(
                    oracle, frame, pc, "source-function-entry",
                    sourceFunction=symbol_at(pc - 2),
                ))
            if pc == CREATE_EV_ENTRY_PC:
                mon_index = sum(
                    event["kind"] == "construction-entry"
                    for event in cycle_events
                )
                epoch["currentMonIndex"] = mon_index
                epoch["currentAttempt"] = 0
                epoch["constructionReturnPc"] = oracle.core.cpu.lr
                cycle_events.append(cycle_snapshot(
                    oracle, frame, pc, "construction-entry",
                    monIndex=mon_index,
                    returnPc=f"0x{oracle.core.cpu.lr:08x}",
                ))
            elif pc == GET_NATURE_ENTRY_PC and epoch.get("entry") is not None:
                cycle_events.append(cycle_snapshot(
                    oracle, frame, pc, "personality-attempt-check",
                    monIndex=epoch.get("currentMonIndex"),
                    attempt=epoch.get("currentAttempt"),
                ))
                epoch["currentAttempt"] = int(epoch.get("currentAttempt", 0)) + 1
            elif pc == CREATE_MON_ENTRY_PC and epoch.get("entry") is not None:
                cycle_events.append(cycle_snapshot(
                    oracle, frame, pc, "create-mon-entry",
                    monIndex=epoch.get("currentMonIndex"),
                ))
            elif pc == CREATE_MON_RESUME_PC and epoch.get("entry") is not None:
                cycle_events.append(cycle_snapshot(
                    oracle, frame, pc, "create-mon-return",
                    monIndex=epoch.get("currentMonIndex"),
                ))
            elif (
                pc == CALCULATE_STATS_ENTRY_PC
                and (epoch.get("entry") is not None or RESIDUAL_18_INSTRUCTION_EVIDENCE)
                and symbol_at(oracle.core.cpu.lr).startswith("CreateMonWithEVSpreadNatureOTID")
            ):
                cycle_events.append(cycle_snapshot(
                    oracle, frame, pc, "calculate-mon-stats-entry",
                    monIndex=epoch.get("currentMonIndex"),
                ))
                if CALCULATE_MON_STATS_EVIDENCE:
                    if RESIDUAL_18_INSTRUCTION_EVIDENCE and epoch.get("entry") is None:
                        # The bounded sibling starts directly on anchor mon 3's
                        # two-frame stats window; no construction identity is
                        # retained in its output.
                        epoch["currentMonIndex"] = 3
                    epoch["calculateMonStatsActiveMonIndex"] = epoch.get("currentMonIndex")
            elif pc == CALCULATE_STATS_RESUME_PC and epoch.get("entry") is not None:
                if CALCULATE_MON_STATS_EVIDENCE:
                    if epoch.get("calculateMonStatsActiveCall") is not None:
                        raise RuntimeError("CalculateMonStats returned with an unfinished direct call")
                    epoch.pop("calculateMonStatsActiveMonIndex", None)
                cycle_events.append(cycle_snapshot(
                    oracle, frame, pc, "calculate-mon-stats-return",
                    monIndex=epoch.get("currentMonIndex"),
                ))
            elif pc in {SELECTABLE_POST_END_PC, FILL_FACTORY_POST_END_PC} and epoch.get("entry") is not None:
                cycle_events.append(cycle_snapshot(
                    oracle, frame, pc, "factory-post-mon-end",
                    monIndex=epoch.get("currentMonIndex"),
                ))
            elif pc == VBLANK_ENTRY_PC and epoch.get("return") is None:
                interrupt_index = int(epoch.get("interruptCount", 0))
                epoch["interruptCount"] = interrupt_index + 1
                vblank_entry = cycle_snapshot(
                    oracle, frame, pc, "vblank-entry",
                    interruptIndex=interrupt_index,
                    interruptedMonIndex=epoch.get("currentMonIndex"),
                )
                cycle_events.append(vblank_entry)
                if VBLANK_WORKLOAD_EVIDENCE:
                    epoch.setdefault("vblankWorkloads", []).append({
                        "interruptIndex": interrupt_index,
                        "frame": frame,
                        "state": snapshot_vblank_workload(oracle),
                        "entry": vblank_entry,
                        "stages": [vblank_entry],
                    })
            elif pc == VBLANK_EXIT_PC and epoch.get("return") is None:
                interrupt_index = int(epoch.get("interruptCount", 1)) - 1
                vblank_return = cycle_snapshot(
                    oracle, frame, pc, "vblank-return",
                    interruptIndex=interrupt_index,
                    interruptedMonIndex=epoch.get("currentMonIndex"),
                )
                cycle_events.append(vblank_return)
                if VBLANK_WORKLOAD_EVIDENCE:
                    workload = current_vblank_workload(epoch)
                    if workload is not None:
                        workload["return"] = vblank_return
                        workload["stages"].append(vblank_return)
                epoch["awaitingVBlankResume"] = interrupt_index
            construction_return_pc = epoch.get("constructionReturnPc")
            if construction_return_pc is not None:
                aligned_return = int(construction_return_pc) & ~1
                if pc in {aligned_return, aligned_return + 2}:
                    cycle_events.append(cycle_snapshot(
                        oracle, frame, pc, "construction-return",
                        monIndex=epoch.get("currentMonIndex"),
                    ))
                    epoch.pop("constructionReturnPc", None)
        if pc == RANDOM_ENTRY_PC:
            pre = read_u32(oracle, oracle.symbols["gRngValue"])
            lr = oracle.core.cpu.lr
            post = (pre * 1103515245 + 24691) & 0xFFFFFFFF
            call = {
                "frame": frame,
                "caller": symbol_at(lr),
                "lr": f"0x{lr:08x}",
                "pre": pre,
                "post": post,
                "u16": (post >> 16) & 0xFFFF,
            }
            # mGBA's master-cycle clock is the source timing evidence needed
            # by the follow-up TypeScript construction clock.  Keep it opt-in
            # so the committed v1 receipt remains byte/schema-compatible.
            if CYCLE_EVIDENCE:
                timing = cycle_snapshot(oracle, frame, pc, "random")
                for field in ("globalCycles", "cpuCycles", "masterCycles", "cyclePhase"):
                    call[field] = timing[field]
                if epoch.get("entry") is not None and epoch.get("return") is None:
                    kind = "ambient-random" if symbol_at(lr).startswith("VBlankIntr") else "personality-random"
                    cycle_events.append(cycle_snapshot(
                        oracle, frame, pc, kind,
                        caller=symbol_at(lr),
                        monIndex=None if kind == "ambient-random" else epoch.get("currentMonIndex"),
                        attempt=None if kind == "ambient-random" else epoch.get("currentAttempt"),
                        half=None if kind == "ambient-random" else (
                            "low" if symbol_at(lr).endswith("+0x35") else "high"
                        ),
                    ))
            calls.append(call)
        if pc == target_entry and epoch.get("entry") is None:
            entry = {
                "frame": frame,
                "returnPc": f"0x{oracle.core.cpu.lr:08x}",
                "rngValue": read_u32(oracle, oracle.symbols["gRngValue"]),
                "callStartIndex": len(calls),
            }
            if CYCLE_EVIDENCE:
                timing = cycle_snapshot(oracle, frame, pc, "entry")
                entry["globalCycles"] = timing["globalCycles"]
                entry["cpuCycles"] = timing["cpuCycles"]
                entry["masterCycles"] = timing["masterCycles"]
                entry["frameCycles"] = int(oracle.core.frame_cycles)
                entry["cyclePhase"] = timing["cyclePhase"]
            epoch["entry"] = entry
        pending = epoch.get("entry")
        if pending is not None and epoch.get("return") is None:
            lr = int(pending["returnPc"], 16)
            return_pcs = {lr, lr & ~1, (lr & ~1) + 2}
            if pc in return_pcs:
                returned = {
                    "frame": frame,
                    "returnPc": f"0x{pc:08x}",
                    "rngValue": read_u32(oracle, oracle.symbols["gRngValue"]),
                    "callEndIndex": len(calls),
                }
                if CYCLE_EVIDENCE:
                    timing = cycle_snapshot(oracle, frame, pc, "return")
                    returned["globalCycles"] = timing["globalCycles"]
                    returned["cpuCycles"] = timing["cpuCycles"]
                    returned["masterCycles"] = timing["masterCycles"]
                    returned["cyclePhase"] = timing["cyclePhase"]
                    cycle_events.append(cycle_snapshot(
                        oracle, frame, pc, "source-function-return",
                        sourceFunction=symbol_at(target_entry - 2),
                    ))
                epoch["return"] = returned
        if oracle.core.frame_counter != start_counter:
            break
        oracle.core.step()
        steps += 1
        if steps > 20_000_000:
            raise RuntimeError(f"frame {frame} did not finish while stepping")
    oracle._screen_stale = False
    if increment_oracle_frame:
        oracle.frame += 1


def rental_or_temp_ids(oracle: EmeraldOracle, source: str, count: int) -> list[int]:
    if source == "rentalMons":
        save2 = read_u32(oracle, oracle.symbols["gSaveBlock2Ptr"])
        base = save2 + SAVE_RENTALS_OFFSET
        return [read_u16(oracle, base + i * RENTAL_MON_STRIDE) for i in range(count)]
    base = oracle.symbols["gFrontierTempParty"]
    return [read_u16(oracle, base + i * 2) for i in range(count)]


def target_natures(oracle: EmeraldOracle, set_ids: list[int]) -> list[int]:
    base = oracle.symbols["gBattleFrontierMons"]
    return [read_u8(oracle, base + set_id * FACILITY_MON_STRIDE + FACILITY_MON_NATURE_OFFSET) for set_id in set_ids]


def read_u8(oracle: EmeraldOracle, address: int) -> int:
    return oracle.read_u8(address)


def classify_and_summarize(
    *,
    case: str,
    source_function: str,
    epoch: dict[str, Any],
    calls: list[dict[str, Any]],
    oracle: EmeraldOracle,
    set_ids: list[int],
    source: str,
    expected_mon_count: int,
    fast_rows: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    if epoch.get("entry") is None or epoch.get("return") is None:
        raise RuntimeError(f"{case}: failed to find {source_function} entry/return: {epoch}")
    entry = epoch["entry"]
    returned = epoch["return"]
    epoch_calls = calls[entry["callStartIndex"]:returned["callEndIndex"]]
    if not epoch_calls:
        raise RuntimeError(f"{case}: construction epoch had no Random calls")

    source_calls: list[dict[str, Any]] = []
    source_positions: list[int] = []
    sequence: list[dict[str, Any]] = []
    for sequence_index, call in enumerate(epoch_calls):
        caller = call["caller"]
        if caller.startswith("VBlankIntr"):
            tag = "ambient"
        elif caller.startswith("CreateMonWithEVSpreadNatureOTID"):
            tag = "construction"
        else:
            tag = "other"
        tagged = dict(call)
        tagged["sequenceIndex"] = sequence_index
        tagged["tag"] = tag
        sequence.append(tagged)
        if tag == "construction":
            source_calls.append(tagged)
            source_positions.append(sequence_index)

    if any(item["tag"] == "other" for item in sequence):
        others = sorted({item["caller"] for item in sequence if item["tag"] == "other"})
        raise RuntimeError(f"{case}: unexpected non-construction call(s) in epoch: {others}")
    if len(source_calls) % 2:
        raise RuntimeError(f"{case}: odd number of construction Random calls: {len(source_calls)}")

    natures = target_natures(oracle, set_ids)
    if len(natures) != expected_mon_count:
        raise RuntimeError(f"{case}: expected {expected_mon_count} natures, got {natures}")

    mon_summaries: list[dict[str, Any]] = []
    source_index = 0
    for mon_index, nature in enumerate(natures):
        first_source_index = source_index
        attempts = 0
        accepted_personality: int | None = None
        while source_index < len(source_calls):
            low = source_calls[source_index]
            high = source_calls[source_index + 1] if source_index + 1 < len(source_calls) else None
            if high is None:
                break
            personality = low["u16"] | (high["u16"] << 16)
            attempts += 1
            source_index += 2
            if personality % 25 == nature:
                accepted_personality = personality
                break
        if accepted_personality is None:
            raise RuntimeError(f"{case}: mon {mon_index} never accepted nature {nature}")
        last_source_index = source_index - 1
        mon_calls = source_calls[first_source_index:source_index]
        first_call = mon_calls[0]
        last_call = mon_calls[-1]
        first_sequence = source_positions[first_source_index]
        last_sequence = source_positions[last_source_index]
        for offset, item in enumerate(mon_calls):
            item["monIndex"] = mon_index
            item["attempt"] = offset // 2
            item["half"] = "low" if offset % 2 == 0 else "high"
        mon_summaries.append({
            "monIndex": mon_index,
            "setId": set_ids[mon_index],
            "targetNature": nature,
            "attempts": attempts,
            "constructionDraws": attempts * 2,
            "acceptedPersonality": accepted_personality,
            "firstSequenceIndex": first_sequence,
            "lastSequenceIndex": last_sequence,
            "firstFrame": first_call["frame"],
            "lastFrame": last_call["frame"],
            "startCursor": first_call["pre"],
            "endCursor": last_call["post"],
        })
    if source_index != len(source_calls):
        raise RuntimeError(f"{case}: construction draws remain after {expected_mon_count} mons")

    if sequence[0]["pre"] != entry["rngValue"]:
        raise RuntimeError(f"{case}: epoch entry cursor is not sequence start")
    for previous, current in zip(sequence, sequence[1:]):
        if previous["post"] != current["pre"]:
            raise RuntimeError(f"{case}: RNG gap at sequence {current['sequenceIndex']}")
    if sequence[-1]["post"] != returned["rngValue"]:
        raise RuntimeError(f"{case}: return cursor does not follow final sequence draw")

    frame_counts: list[dict[str, int]] = []
    for frame in range(entry["frame"], returned["frame"] + 1):
        rows = [item for item in sequence if item["frame"] == frame]
        frame_counts.append({
            "frame": frame,
            "construction": sum(item["tag"] == "construction" for item in rows),
            "ambient": sum(item["tag"] == "ambient" for item in rows),
            "total": len(rows),
        })

    result: dict[str, Any] = {
        "case": case,
        "sourceFunction": source_function,
        "sourceSetIds": set_ids,
        "source": source,
        "monCount": expected_mon_count,
        "entry": entry,
        "return": returned,
        "sequence": sequence,
        "frameCounts": frame_counts,
        "monBoundaries": mon_summaries,
        "totals": {
            "construction": sum(item["tag"] == "construction" for item in sequence),
            "ambient": sum(item["tag"] == "ambient" for item in sequence),
            "total": len(sequence),
        },
        "gapless": True,
    }
    if fast_rows is not None:
        # The location-only fast pass is useful while developing a new case,
        # but cycle-mode output is the compact reproducible receipt and does
        # not duplicate hundreds of pre-epoch route frames.
        if not CYCLE_EVIDENCE:
            result["fastFrameEvidence"] = fast_rows
    if CYCLE_EVIDENCE:
        cycle_events = epoch.get("cycleEvents", [])
        result["cycleEvidence"] = {
            "frameCycles": int(oracle.core.frame_cycles),
            "initialMasterCyclePhase": source_calls[0]["cyclePhase"],
            "sourceEntryMasterCyclePhase": entry["cyclePhase"],
            "cyclesSincePriorVBlank": (
                source_calls[0]["masterCycles"]
                - max(
                    event["masterCycles"]
                    for event in cycle_events
                    if event["kind"] == "vblank-entry"
                    and event["masterCycles"] <= source_calls[0]["masterCycles"]
                )
            ),
            "events": cycle_events,
        }
    if CALCULATE_MON_STATS_EVIDENCE:
        if epoch.get("calculateMonStatsActiveCall") is not None:
            raise RuntimeError("CalculateMonStats evidence finished with an unfinished direct call")
        result["calculateMonStatsEvidence"] = {
            "schema": "factory-calculate-mon-stats-direct-calls/v1",
            "calls": epoch.get("calculateMonStatsCalls", []),
        }
    if EWRAM_ACCESS_EVIDENCE:
        if epoch.get("ewramAccessPending") is not None:
            raise RuntimeError("EWRAM evidence finished with an unpaired instruction")
        result["ewramAccessEvidence"] = epoch.get("ewramAccessBoundaries", [])
        result["ewramComponentEvidence"] = epoch.get("ewramComponentBoundaries", [])
    if RESIDUAL_18_INSTRUCTION_EVIDENCE:
        if epoch.get("residualInstructionTraceActive") is not None:
            raise RuntimeError("residual instruction evidence finished mid-trace")
        result["residualInstructionTraces"] = epoch.get("residualInstructionTraces", [])
    if RESIDUAL_18_CLASSIFIER_EVIDENCE or TIMER0_FIFO_EVIDENCE:
        if epoch.get("residualClassifierTraceActive") is not None:
            raise RuntimeError("residual classifier evidence finished mid-trace")
        result["residualClassifierTraces"] = epoch.get("residualClassifierTraces", [])
    if VBLANK_WORKLOAD_EVIDENCE:
        # This is a separate raw observation packet, intentionally not folded
        # into cycleEvidence's frozen v2 contract.  The report filters it to
        # entry->return epochs and derives distributions from the named ROM
        # stages and source-visible state only.
        result["vblankWorkloadEvidence"] = {
            "schema": "factory-vblank-workload-observation/v1",
            "interrupts": epoch.get("vblankWorkloads", []),
        }
    return result


def run_anchor() -> dict[str, Any]:
    calls: list[dict[str, Any]] = []
    epoch: dict[str, Any] = {}
    active = set(range(ANCHOR_ENTRY_FRAME, ANCHOR_LAST_FRAME + 1))

    original = EmeraldOracle._run_bootstrap

    def instrumented_bootstrap(self: EmeraldOracle, spec: dict[str, Any]) -> int:
        frames = 0
        for segment in spec.get("segments", []):
            buttons = segment.get("buttons", [])
            self._set_buttons(buttons)
            for _ in range(int(segment["frames"])):
                frame = frames + 1
                if frame in active:
                    advance_one_instrumented_frame(
                        self, buttons, frame, active, calls, SELECTABLE_ENTRY_PC, epoch,
                        increment_oracle_frame=False,
                    )
                else:
                    self.core.run_frame()
                frames += 1
        for poke in spec.get("pokes", []):
            addr = self.resolve_poke_addr(poke)
            for index, value in enumerate(poke["bytes"]):
                self.write_u8(addr + index, value)
        self._set_buttons([])
        for _ in range(int(spec.get("settleFrames", 0))):
            frame = frames + 1
            if frame in active:
                advance_one_instrumented_frame(
                    self, [], frame, active, calls, SELECTABLE_ENTRY_PC, epoch,
                    increment_oracle_frame=False,
                )
            else:
                self.core.run_frame()
            frames += 1
        return frames

    EmeraldOracle._run_bootstrap = instrumented_bootstrap
    try:
        oracle = EmeraldOracle(ROM, MAP, BOOTSTRAP_OFF)
    finally:
        EmeraldOracle._run_bootstrap = original
    if oracle.canonical_screen_sha256 != ANCHOR_BOOTSTRAP_SHA256:
        raise RuntimeError(f"anchor canonical screen changed: {oracle.canonical_screen_sha256}")
    if (
        RESIDUAL_18_INSTRUCTION_EVIDENCE
        or RESIDUAL_18_CLASSIFIER_EVIDENCE
        or TIMER0_FIFO_EVIDENCE
        or TIMER0_SCHEDULER_RUNTIME_EVIDENCE
    ):
        if TIMER0_SCHEDULER_RUNTIME_EVIDENCE:
            capture = epoch.get("timer0SchedulerRuntimeCapture")
            if capture is None:
                raise RuntimeError("anchor: Timer 0 scheduler runtime hook was not armed")
            return {
                "schema": "factory-timer0-scheduler-runtime/v1",
                "case": "anchor",
                "oracleProfile": "battle-scene-off",
                "sourceFunction": "CreateFrontierFactorySelectableMons",
                "selection": (
                    "first source-epoch dual FIFO refill observed in each of the isolated and "
                    "exact-Video-co-due classes"
                ),
                "windows": capture.finish(),
            }
        return {
            "case": "anchor",
            "sourceFunction": "CreateFrontierFactorySelectableMons",
            "oracleProfile": "battle-scene-off",
            "residualInstructionTraces": epoch.get("residualInstructionTraces", []),
            "residualClassifierTraces": epoch.get("residualClassifierTraces", []),
        }
    set_ids = rental_or_temp_ids(oracle, "rentalMons", 6)
    result = classify_and_summarize(
        case="anchor",
        source_function="CreateFrontierFactorySelectableMons",
        epoch=epoch,
        calls=calls,
        oracle=oracle,
        set_ids=set_ids,
        source="gSaveBlock2Ptr->frontier.rentalMons",
        expected_mon_count=6,
    )
    result["oracleProfile"] = "battle-scene-off"
    result["canonicalScreenSha256"] = oracle.canonical_screen_sha256
    return result


def load_fixture(name: str) -> dict[str, Any]:
    return json.loads((WORKTREE_ROOT / "tools" / "battle-lab" / name).read_text())


def validated_request(raw: dict[str, Any]) -> dict[str, Any]:
    value = dict(raw)
    value.setdefault("preCheckpointCaptureFrames", [])
    value.setdefault("preCheckpointCaptureAllFrames", False)
    value.setdefault("rentalSwapCount", 0)
    return validate_request(value, "battle-scene-off")


def stage_request(oracle: EmeraldOracle, raw: dict[str, Any]) -> dict[str, Any]:
    return BattleLab(oracle, "battle-scene-off").prepare(validated_request(raw))


def run_fixed_fixture(raw: dict[str, Any], first_frame: int, last_frame: int) -> tuple[EmeraldOracle, dict[str, Any], dict[str, Any], list[dict[str, Any]]]:
    oracle = EmeraldOracle(ROM, MAP, BOOTSTRAP_OFF)
    fixture = stage_request(oracle, raw)
    trace = raw["trace"]["segments"]
    for segment in trace:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            oracle.advance(buttons)
    oracle.advance(["A"])
    oracle.advance(["A"])
    calls: list[dict[str, Any]] = []
    epoch: dict[str, Any] = {}
    for frame in range(first_frame, last_frame + 1):
        advance_one_instrumented_frame(
            oracle, [], frame, set(range(first_frame, last_frame + 1)), calls,
            FILL_FACTORY_ENTRY_PC, epoch,
        )
    return oracle, fixture, epoch, calls


def run_liliana() -> dict[str, Any]:
    raw = load_fixture("scratch-win-go-on-swap-offer-no-guide-dismiss-probe.json")
    oracle, _, epoch, calls = run_fixed_fixture(raw, LILIANA_FIRST_FRAME, LILIANA_LAST_FRAME)
    if TIMER0_SELECTED_EDGE_RUNTIME_EVIDENCE:
        selector = epoch.get("timer0SelectedEdgeSelector")
        capture = epoch.get("timer0SelectedEdgeRuntimeCapture")
        if selector is None or capture is None:
            raise RuntimeError("selected adjacent-deadline runtime edge was not reached")
        return {
            "schema": "factory-timer0-selected-adjacent-runtime/v1",
            "case": "liliana",
            "oracleProfile": "battle-scene-off",
            "sourceFunction": "FillFactoryFrontierTrainerParty",
            "selection": selector.summary(),
            "runtime": capture.finish(),
        }
    if (
        RESIDUAL_18_INSTRUCTION_EVIDENCE
        or RESIDUAL_18_CLASSIFIER_EVIDENCE
        or TIMER0_FIFO_EVIDENCE
    ):
        return {
            "case": "liliana",
            "sourceFunction": "FillFactoryFrontierTrainerParty",
            "oracleProfile": "battle-scene-off",
            "residualInstructionTraces": epoch.get("residualInstructionTraces", []),
            "residualClassifierTraces": epoch.get("residualClassifierTraces", []),
        }
    set_ids = rental_or_temp_ids(oracle, "tempParty", 3)
    result = classify_and_summarize(
        case="liliana",
        source_function="FillFactoryFrontierTrainerParty",
        epoch=epoch,
        calls=calls,
        oracle=oracle,
        set_ids=set_ids,
        source="gFrontierTempParty",
        expected_mon_count=3,
    )
    result["oracleProfile"] = "battle-scene-off"
    result["canonicalScreenSha256"] = oracle.canonical_screen_sha256
    return result


def read_party_personalities(oracle: EmeraldOracle) -> tuple[int, int, int]:
    base = oracle.symbols["gEnemyParty"]
    return tuple(read_u32(oracle, base + i * POKEMON_SIZE) for i in range(3))


def run_factory_varied() -> dict[str, Any]:
    raw = load_fixture("factory-varied.json")
    request = validated_request(raw)

    # Pass 1 is frame-granularity evidence used only to locate the opponent
    # party write.  The second fresh pass single-steps that complete interval.
    oracle = EmeraldOracle(ROM, MAP, BOOTSTRAP_OFF)
    fast_rows: list[dict[str, Any]] = []
    route_frame = 0
    original_advance = oracle.advance
    prior_party = read_party_personalities(oracle)

    def observed_advance(buttons: list[str]) -> None:
        nonlocal route_frame, prior_party
        route_frame += 1
        before_count = read_u32(oracle, SRANDCOUNT_ADDR)
        before_rng = read_u32(oracle, oracle.symbols["gRngValue"])
        original_advance(buttons)
        after_count = read_u32(oracle, SRANDCOUNT_ADDR)
        after_rng = read_u32(oracle, oracle.symbols["gRngValue"])
        now_party = read_party_personalities(oracle)
        fast_rows.append({
            "frame": route_frame,
            "randomCalls": (after_count - before_count) & 0xFFFFFFFF,
            "rngBefore": before_rng,
            "rngAfter": after_rng,
            "partyBefore": list(prior_party),
            "partyAfter": list(now_party),
            "partyChanged": now_party != prior_party,
        })
        prior_party = now_party

    oracle.advance = observed_advance  # type: ignore[method-assign]
    stage_request(oracle, raw)
    changed = [row["frame"] for row in fast_rows if row["partyChanged"]]
    if not changed:
        raise RuntimeError("factory-varied: fast pass saw no gEnemyParty construction write")
    first = max(1, min(changed) - 12)
    last = max(changed) + 12

    oracle2 = EmeraldOracle(ROM, MAP, BOOTSTRAP_OFF)
    calls: list[dict[str, Any]] = []
    epoch: dict[str, Any] = {}
    route_frame = 0
    original_advance2 = oracle2.advance
    target_frames = set(range(first, last + 1))

    def targeted_advance(buttons: list[str]) -> None:
        nonlocal route_frame
        route_frame += 1
        advance_one_instrumented_frame(
            oracle2, buttons, route_frame, target_frames, calls,
            FILL_FACTORY_ENTRY_PC, epoch, original_advance2,
        )

    oracle2.advance = targeted_advance  # type: ignore[method-assign]
    stage_request(oracle2, raw)
    if (
        RESIDUAL_18_INSTRUCTION_EVIDENCE
        or RESIDUAL_18_CLASSIFIER_EVIDENCE
        or TIMER0_FIFO_EVIDENCE
    ):
        return {
            "case": "factory-varied",
            "sourceFunction": "FillFactoryFrontierTrainerParty",
            "oracleProfile": "battle-scene-off",
            "residualInstructionTraces": epoch.get("residualInstructionTraces", []),
            "residualClassifierTraces": epoch.get("residualClassifierTraces", []),
        }
    set_ids = rental_or_temp_ids(oracle2, "tempParty", 3)
    result = classify_and_summarize(
        case="factory-varied",
        source_function="FillFactoryFrontierTrainerParty",
        epoch=epoch,
        calls=calls,
        oracle=oracle2,
        set_ids=set_ids,
        source="gFrontierTempParty",
        expected_mon_count=3,
        fast_rows=fast_rows,
    )
    result["oracleProfile"] = "battle-scene-off"
    result["canonicalScreenSha256"] = oracle2.canonical_screen_sha256
    result["targetFrameRange"] = [first, last]
    return result


def compact_vblank_workload_receipt(result: dict[str, Any]) -> dict[str, Any]:
    """Drop construction identities from the optional hardware-workload receipt.

    The v2 receipt remains the authoritative RNG chain. This companion only
    needs relative VBlank timing, VBlank state, and named stage boundaries. It
    deliberately omits frame, absolute time, RNG cursor, mon index, set, and
    trainer details so a later reducer cannot accidentally treat evidence
    identity as input.
    """
    raw = result["vblankWorkloadEvidence"]
    interrupts: list[dict[str, Any]] = []
    source_entry = result["entry"]["masterCycles"]
    source_return = result["return"]["masterCycles"]
    for workload in raw["interrupts"]:
        returned = workload.get("return")
        resumed = workload.get("resume")
        if returned is None or resumed is None:
            continue
        entry_cycles = workload["entry"]["masterCycles"]
        if entry_cycles < source_entry or entry_cycles > source_return:
            continue
        stages = []
        for stage in workload["stages"]:
            compact = {
                "kind": stage["kind"],
                "cyclesSinceVBlankEntry": stage["masterCycles"] - entry_cycles,
            }
            if "isr" in stage:
                compact["isr"] = stage["isr"]
            stages.append(compact)
        interrupts.append({
            "state": workload["state"],
            "vblankEntryToReturnCycles": returned["masterCycles"] - entry_cycles,
            "returnToResumeCycles": resumed["masterCycles"] - returned["masterCycles"],
            "resumeFunction": resumed["resumeFunction"],
            "stages": stages,
        })
    return {
        "schema": "factory-vblank-workload-probe/v1",
        "case": result["case"],
        "oracleProfile": result["oracleProfile"],
        "sourceFunction": result["sourceFunction"],
        "interrupts": interrupts,
    }


def compact_vblank_workload_internal_receipt(result: dict[str, Any]) -> dict[str, Any]:
    """Write an address-free v2 sibling with the source-owned m4a stages.

    The old v1 packet is intentionally not reused or rewritten.  This carries
    the same relative VBlank shell plus the snapshot taken at m4aSoundMain's
    call boundary and the compiled SoundMain/MPlayMain/CgbSound/SoundMainRAM
    boundaries inside it.
    """
    raw = result["vblankWorkloadEvidence"]
    interrupts: list[dict[str, Any]] = []
    source_entry = result["entry"]["masterCycles"]
    source_return = result["return"]["masterCycles"]
    for workload in raw["interrupts"]:
        returned = workload.get("return")
        resumed = workload.get("resume")
        audio = workload.get("audioInternal")
        if returned is None or resumed is None or audio is None:
            continue
        entry_cycles = workload["entry"]["masterCycles"]
        if entry_cycles < source_entry or entry_cycles > source_return:
            continue
        stages = []
        for stage in workload["stages"]:
            compact = {
                "kind": stage["kind"],
                "cyclesSinceVBlankEntry": stage["masterCycles"] - entry_cycles,
            }
            if "isr" in stage:
                compact["isr"] = stage["isr"]
            stages.append(compact)
        audio_stages = [
            {
                "kind": stage["kind"],
                "cyclesSinceVBlankEntry": stage["masterCycles"] - entry_cycles,
            }
            for stage in audio["stages"]
        ]
        interrupts.append({
            "state": workload["state"],
            "m4a": {
                "state": audio["state"],
                "stages": audio_stages,
            },
            "vblankEntryToReturnCycles": returned["masterCycles"] - entry_cycles,
            "returnToResumeCycles": resumed["masterCycles"] - returned["masterCycles"],
            "resumeFunction": resumed["resumeFunction"],
            "stages": stages,
        })
    return {
        "schema": "factory-vblank-workload-internal-probe/v2",
        "case": result["case"],
        "oracleProfile": result["oracleProfile"],
        "sourceFunction": result["sourceFunction"],
        "m4aInputPrefixBytes": M4A_INPUT_PREFIX_BYTES,
        "interrupts": interrupts,
    }


def compact_calculate_mon_stats_receipt(result: dict[str, Any]) -> dict[str, Any]:
    """Keep the sibling stats packet source-shaped and independent of v2's full RNG log."""
    events = result["cycleEvidence"]["events"]
    entries = {
        int(event["monIndex"]): event
        for event in events
        if event["kind"] == "calculate-mon-stats-entry"
    }
    returns = {
        int(event["monIndex"]): event
        for event in events
        if event["kind"] == "calculate-mon-stats-return"
    }
    spans = [
        {
            "monIndex": mon_index,
            "entryMasterCycles": entries[mon_index]["masterCycles"],
            "entryPc": entries[mon_index]["pc"],
            "returnMasterCycles": returns[mon_index]["masterCycles"],
            "returnPc": returns[mon_index]["pc"],
        }
        for mon_index in sorted(entries)
    ]
    first_entry = min(span["entryMasterCycles"] for span in spans)
    final_return = max(span["returnMasterCycles"] for span in spans)
    pause_parts: dict[int, dict[str, int]] = {}
    for event in events:
        interrupt_index = event.get("interruptIndex")
        if interrupt_index is None:
            continue
        if event["kind"] == "vblank-entry":
            pause_parts.setdefault(int(interrupt_index), {})["entryMasterCycles"] = event["masterCycles"]
        elif event["kind"] == "vblank-resume":
            pause_parts.setdefault(int(interrupt_index), {})["resumeMasterCycles"] = event["masterCycles"]
    pauses = [
        part
        for _, part in sorted(pause_parts.items())
        if "entryMasterCycles" in part
        and "resumeMasterCycles" in part
        and part["entryMasterCycles"] <= final_return
        and part["resumeMasterCycles"] >= first_entry
    ]
    mons = [
        {
            "monIndex": mon["monIndex"],
            "targetNature": mon["targetNature"],
            "acceptedPersonality": mon["acceptedPersonality"],
        }
        for mon in result["monBoundaries"]
    ]
    return {
        "schema": "factory-calculate-mon-stats-direct-calls/v1",
        "case": result["case"],
        "oracleProfile": result["oracleProfile"],
        "sourceFunction": result["sourceFunction"],
        "mons": mons,
        "spans": spans,
        "interruptPauses": pauses,
        "directCalls": result["calculateMonStatsEvidence"]["calls"],
    }


def compact_residual_18_receipt(result: dict[str, Any]) -> dict[str, Any]:
    """Retain only exact source boundaries and hardware execution state."""
    compact_stats = compact_calculate_mon_stats_receipt(result)
    def compact_boundary(event: dict[str, Any]) -> dict[str, Any]:
        return {
            key: event[key]
            for key in (
                "kind", "masterCycles", "cyclePhase", "pc", "returnPc",
                "interruptIndex", "executionState",
            )
            if key in event
        }

    source_kinds = {
        "construction-entry",
        "personality-random",
        "personality-attempt-check",
        "create-mon-entry",
        "factory-post-mon-end",
        "vblank-entry",
        "vblank-resume",
    }
    boundaries = []
    for event in result["cycleEvidence"]["events"]:
        if event["kind"] not in source_kinds:
            continue
        boundaries.append(compact_boundary(event))
    direct_calls = []
    for call in compact_stats["directCalls"]:
        row = {
            key: call[key]
            for key in (
                "operation", "callPc", "entryPc", "returnPc",
                "returnPcObserved", "entryMasterCycles", "returnMasterCycles",
                "entryCyclePhase", "returnCyclePhase", "entryExecutionState",
                "returnExecutionState",
            )
            if key in call
        }
        if "boundaries" in call:
            row["boundaries"] = {
                name: compact_boundary(boundary)
                for name, boundary in call["boundaries"].items()
            }
        if "asyncService" in call:
            row["asyncService"] = [compact_boundary(event) for event in call["asyncService"]]
        direct_calls.append(row)
    return {
        "schema": "factory-construction-residual-boundaries/v1",
        "case": result["case"],
        "oracleProfile": result["oracleProfile"],
        "sourceFunction": result["sourceFunction"],
        "frameCycles": result["cycleEvidence"]["frameCycles"],
        "sourceBoundaries": boundaries,
        "interruptPauses": compact_stats["interruptPauses"],
        "directCalls": direct_calls,
    }


def compact_residual_instruction_receipt(result: dict[str, Any]) -> dict[str, Any]:
    """Normalize two matched instruction traces to their source entry."""
    traces = result.get("residualInstructionTraces", [])
    if len(traces) != len(RESIDUAL_18_DIVIDE_TRACE_SELECTORS):
        raise RuntimeError(f"expected two residual instruction traces, got {len(traces)}")
    compact = []
    for trace in traces:
        boundaries = trace["boundaries"]
        entry_cycles = boundaries[0]["masterCycles"]
        instructions = []
        for before, after in zip(boundaries, boundaries[1:]):
            instructions.append({
                "instructionPc": before["instructionPc"],
                "nextInstructionPc": after["instructionPc"],
                "cyclesSinceEntry": before["masterCycles"] - entry_cycles,
                "cycles": after["masterCycles"] - before["masterCycles"],
                "cpuCyclesUntilNextEvent": before["nextEvent"] - before["cpuCycles"],
                "eventQueue": before["eventQueue"],
            })
        compact.append({
            "label": trace["label"],
            "component": trace["component"],
            "entryPc": trace["entryPc"],
            "returnPc": f"0x{trace['returnPc']:08x}",
            "arguments": trace["arguments"],
            "sourceCycles": trace["sourceCycles"],
            "residualCycles": trace["residualCycles"],
            "observedCycles": boundaries[-1]["masterCycles"] - entry_cycles,
            "instructions": instructions,
        })
    by_label = {trace["label"]: trace for trace in compact}
    clean = by_label["signed-divide-clean"]
    member = by_label["signed-divide-plus18"]
    clean_by_edge = {
        (row["instructionPc"], row["nextInstructionPc"], row["cyclesSinceEntry"]): row
        for row in clean["instructions"]
    }
    increments = []
    for row in member["instructions"]:
        matched = clean_by_edge.get(
            (row["instructionPc"], row["nextInstructionPc"], row["cyclesSinceEntry"])
        )
        if matched is not None and row["cycles"] != matched["cycles"]:
            increments.append({
                "instructionPc": row["instructionPc"],
                "nextInstructionPc": row["nextInstructionPc"],
                "cleanCycles": matched["cycles"],
                "memberCycles": row["cycles"],
                "incrementCycles": row["cycles"] - matched["cycles"],
                "memberQueueBefore": row["eventQueue"],
                "cleanQueueBefore": matched["eventQueue"],
            })
    return {
        "schema": "factory-construction-residual-instruction-events/v1",
        "case": result["case"],
        "oracleProfile": result["oracleProfile"],
        "sourceFunction": result["sourceFunction"],
        "traces": compact,
        "matchedIncrements": increments,
    }


def classifier_queue(row: dict[str, Any]) -> list[dict[str, Any]]:
    """Keep queue identity and relative due-ness, never absolute timing."""
    master_cycles = int(row["masterCycles"])
    def relative_when(event_when: int) -> int:
        delta = (event_when - (master_cycles & 0xFFFFFFFF)) & 0xFFFFFFFF
        return delta - 0x1_0000_0000 if delta & 0x8000_0000 else delta
    return [
        {
            "name": event["name"],
            "priority": event["priority"],
            "due": relative_when(int(event["when"])) <= 0,
            "whenDelta": relative_when(int(event["when"])),
        }
        for event in row["eventQueue"]
    ]


def classifier_queue_shape(queue: list[dict[str, Any]]) -> list[tuple[Any, ...]]:
    return [(event["name"], event["priority"]) for event in queue]


def classifier_trace_edges(trace: dict[str, Any]) -> dict[tuple[str, str], dict[str, Any]]:
    """Deduplicate a trace to the minimum source edge and its queue evidence."""
    if isinstance(trace.get("edges"), list):
        return {
            (edge["instructionPc"], edge["nextInstructionPc"]): edge
            for edge in trace["edges"]
        }
    boundaries = trace["boundaries"]
    edges: dict[tuple[str, str], dict[str, Any]] = {}
    for before, after in zip(boundaries, boundaries[1:]):
        key = (before["instructionPc"], after["instructionPc"])
        queue_before = classifier_queue(before)
        queue_after = classifier_queue(after)
        row = {
            "instructionPc": key[0],
            "nextInstructionPc": key[1],
            "cycles": after["masterCycles"] - before["masterCycles"],
            "eventDistance": int(before["nextEvent"]) - int(before["cpuCycles"]),
            "queueBefore": queue_before,
            "queueAfter": queue_after,
        }
        previous = edges.get(key)
        prefer_larger = trace["label"] == "member"
        if previous is None or (
            row["cycles"] > previous["cycles"]
            if prefer_larger
            else row["cycles"] < previous["cycles"]
        ):
            edges[key] = row
    return edges


def classifier_event_name(edge: dict[str, Any]) -> str | None:
    before = edge["queueBefore"]
    crossed = classifier_crossed_event_names(edge)
    if crossed:
        # Timer 0 is the question under test; keep it primary when it is
        # co-due with Video, while retaining the full crossed set below.
        if "GBA Timer 0" in crossed:
            return "GBA Timer 0"
        return crossed[0]
    after_shape = classifier_queue_shape(edge["queueAfter"])
    before_shape = classifier_queue_shape(before)
    if before_shape != after_shape and before:
        return before[0]["name"]
    return next((event["name"] for event in before if event["due"]), None)


def classifier_crossed_event_names(edge: dict[str, Any]) -> list[str]:
    before = [event["name"] for event in edge["queueBefore"] if event["due"]]
    after = {event["name"] for event in edge["queueAfter"] if event["due"]}
    return [name for name in before if name is not None and name not in after]


def classifier_service_cost_class(crossed: list[str]) -> str | None:
    if "GBA Timer 0" not in crossed:
        return None if not crossed else "timing-event:" + "+".join(crossed)
    co_due = [name for name in crossed if name != "GBA Timer 0"]
    return (
        "gba-timer-0-m4a-sample"
        if not co_due
        else "gba-timer-0-m4a-sample+co-due:" + "+".join(co_due)
    )


def compact_residual_classifier_receipt(result: dict[str, Any]) -> dict[str, Any]:
    """Compact all selected member spans and one clean control per class.

    The source-order selectors choose the already-censused rows.  The output
    contains no absolute master cycle, frame, RNG, party, or pointer fields.
    Member rows retain only instruction edges whose local cost or due queue
    differs from the source-clean profile; controls retain a deduplicated edge
    profile so a later cross-epoch join can fill classes absent in one epoch.
    """
    raw = result.get("residualClassifierTraces", [])
    if not raw:
        raise RuntimeError(f"{result['case']}: classifier produced no instruction traces")
    profiles = []
    for trace in raw:
        profile = classifier_trace_edges(trace)
        profiles.append({"trace": trace, "edges": profile})
    controls: dict[tuple[str, str], list[dict[str, Any]]] = {}
    for item in profiles:
        trace = item["trace"]
        if trace["label"] == "control":
            controls.setdefault((trace["component"], trace["returnClass"]), []).append(item)

    members = []
    for item in profiles:
        trace = item["trace"]
        if trace["label"] != "member":
            continue
        control_items = controls.get((trace["component"], trace["returnClass"]), [])
        control_edges: dict[tuple[str, str], dict[str, Any]] = {}
        for control in control_items:
            for key, edge in control["edges"].items():
                previous = control_edges.get(key)
                if previous is None or edge["cycles"] < previous["cycles"]:
                    control_edges[key] = edge
        increments = []
        for key, edge in item["edges"].items():
            control = control_edges.get(key)
            increment = None if control is None else edge["cycles"] - control["cycles"]
            event_name = classifier_event_name(edge)
            if (increment is not None and increment > 0) or (
                increment is None and edge["cycles"] > 11
            ):
                crossed_events = classifier_crossed_event_names(edge)
                increments.append({
                    "instructionPc": edge["instructionPc"],
                    "nextInstructionPc": edge["nextInstructionPc"],
                    "memberCycles": edge["cycles"],
                    "controlCycles": None if control is None else control["cycles"],
                    "controlMatch": (
                        "same-component-return-class-edge"
                        if control is not None
                        else "no-identical-clean-edge-in-return-class"
                    ),
                    "incrementCycles": increment,
                    "eventName": event_name,
                    "crossedEventNames": crossed_events,
                    "serviceCostClass": classifier_service_cost_class(crossed_events),
                    "queueBefore": edge["queueBefore"],
                    "queueAfter": edge["queueAfter"],
                    "controlQueueBefore": None if control is None else control["queueBefore"],
                })
        members.append({
            "component": trace["component"],
            "ordinal": trace["ordinal"],
            "entryPc": trace["entryPc"],
            "returnClass": trace["returnClass"],
            "increments": increments,
        })

    clean_control_groups: dict[tuple[str, str], dict[str, Any]] = {}
    for item in profiles:
        trace = item["trace"]
        if trace["label"] != "control":
            continue
        key = (trace["component"], trace["returnClass"])
        group = clean_control_groups.setdefault(key, {
            "component": trace["component"],
            "returnClass": trace["returnClass"],
            "sampleCount": 0,
            "edges": {},
        })
        group["sampleCount"] += 1
        for edge in item["edges"].values():
            if int(edge["instructionPc"], 16) not in RESIDUAL_18_CLASSIFIER_QUEUE_INSTRUCTION_PCS:
                continue
            edge_key = (edge["instructionPc"], edge["nextInstructionPc"])
            previous = group["edges"].get(edge_key)
            if previous is None or edge["cycles"] < previous["cycles"]:
                group["edges"][edge_key] = edge
    clean_controls = []
    for group in clean_control_groups.values():
        clean_controls.append({
            "component": group["component"],
            "returnClass": group["returnClass"],
            "sampleCount": group["sampleCount"],
            "edges": sorted(group["edges"].values(), key=lambda row: (
                row["instructionPc"], row["nextInstructionPc"],
            )),
        })
    members.sort(key=lambda row: (row["component"], row["ordinal"]))
    clean_controls.sort(key=lambda row: (row["component"], row["returnClass"]))
    return {
        "schema": "factory-construction-residual-instruction-events/v2",
        "case": result["case"],
        "oracleProfile": result["oracleProfile"],
        "sourceFunction": result["sourceFunction"],
        "memberCount": len(members),
        "cleanControlCount": sum(row["sampleCount"] for row in clean_controls),
        "cleanControlGroupCount": len(clean_controls),
        "members": members,
        "cleanControls": clean_controls,
    }


def compact_timer0_fifo_state(state: dict[str, Any]) -> dict[str, Any]:
    compact: dict[str, Any] = {
        "timer0": {
            key: state["timer0"][key]
            for key in ("tm0cntL", "tm0cntH", "reload", "flags", "eventWhenDelta", "eventDue")
        },
        "deepStateAvailable": "fifo" in state and "dma" in state,
        "cpu": state.get("cpu"),
    }
    if "fifo" not in state or "dma" not in state:
        return compact
    compact.update({
        "fifo": state["fifo"],
        "dma": [
            {
                key: row[key]
                for key in (
                    "channel", "control", "enabled", "repeat", "width", "timing",
                    "destControl", "sourceControl", "internalCount",
                    "internalNextCount", "internalWhenDelta", "destinationKind",
                )
            }
            for row in state["dma"]
        ],
    })
    return compact


def timer0_fifo_transition_from_states(
    before: dict[str, Any] | None, after: dict[str, Any] | None,
) -> tuple[str, list[str], list[str], list[str], list[int]]:
    if before is None or after is None or "fifo" not in before or "fifo" not in after:
        return "state-unavailable", [], [], [], []
    before_fifo = before["fifo"]
    after_fifo = after["fifo"]
    write_changed = [
        name for name in ("a", "b")
        if before_fifo[name]["fifoWrite"] != after_fifo[name]["fifoWrite"]
    ]
    read_changed = [
        name for name in ("a", "b")
        if before_fifo[name]["fifoRead"] != after_fifo[name]["fifoRead"]
    ]
    remaining_changed = [
        name for name in ("a", "b")
        if before_fifo[name]["internalRemaining"] != after_fifo[name]["internalRemaining"]
    ]
    changed_dma = [
        before_row["channel"]
        for before_row, after_row in zip(before["dma"], after["dma"])
        if before_row != after_row
    ]
    if write_changed:
        transition = "fifo-write-pointer-changed"
    elif changed_dma:
        transition = "dma-state-changed-without-fifo-write"
    elif remaining_changed or read_changed:
        transition = "fifo-consumption-state-changed"
    else:
        transition = "no-observed-fifo-dma-mutation"
    return transition, write_changed, read_changed, remaining_changed, changed_dma


def compact_timer0_fifo_classifier_receipt(result: dict[str, Any]) -> dict[str, Any]:
    """Classify every Timer 0 crossing in the existing source-order traces.

    The classifier deliberately reuses the already-censused member/control
    selectors.  It adds deep mGBA state only at the bounded queue observation
    edges, so it cannot turn a whole frame or a fixture identity into a timing
    key.
    """
    raw = result.get("residualClassifierTraces", [])
    if not raw:
        raise RuntimeError(f"{result['case']}: Timer 0 FIFO classifier produced no traces")
    profiles = [
        {"trace": trace, "edges": classifier_trace_edges(trace)}
        for trace in raw
    ]
    clean_minima: dict[tuple[str, str, str, str], int] = {}
    clean_samples: dict[tuple[str, str, str, str], int] = {}
    for item in profiles:
        trace = item["trace"]
        if trace["label"] != "control":
            continue
        for key, edge in item["edges"].items():
            if int(edge["instructionPc"], 16) not in RESIDUAL_18_CLASSIFIER_QUEUE_INSTRUCTION_PCS:
                continue
            group_key = (trace["component"], trace["returnClass"], key[0], key[1])
            clean_samples[group_key] = clean_samples.get(group_key, 0) + 1
            previous = clean_minima.get(group_key)
            if previous is None or edge["cycles"] < previous:
                clean_minima[group_key] = edge["cycles"]

    crossings: list[dict[str, Any]] = []
    for item in profiles:
        trace = item["trace"]
        for key, edge in item["edges"].items():
            before_state = edge.get("timer0FifoBefore")
            after_state = edge.get("timer0FifoAfter")
            raw_rescheduled = (
                before_state is not None
                and after_state is not None
                and before_state.get("timerEventWhenRaw") != after_state.get("timerEventWhenRaw")
            )
            crossed_events = classifier_crossed_event_names(edge)
            if not raw_rescheduled and TIMER0_EVENT_NAME not in crossed_events:
                continue
            group_key = (trace["component"], trace["returnClass"], key[0], key[1])
            clean_cycles = clean_minima.get(group_key)
            transition, write_changed, read_changed, remaining_changed, changed_dma = (
                timer0_fifo_transition_from_states(before_state, after_state)
            )
            crossings.append({
                "label": trace["label"],
                "component": trace["component"],
                "ordinal": trace["ordinal"],
                "returnClass": trace["returnClass"],
                "instructionPc": edge["instructionPc"],
                "nextInstructionPc": edge["nextInstructionPc"],
                "observedEdgeCycles": edge["cycles"],
                "cleanMinimumEdgeCycles": clean_cycles,
                "residualDeltaClass": (
                    None if clean_cycles is None else edge["cycles"] - clean_cycles
                ),
                "fifoTransition": transition,
                "fifoRefillObserved": transition == "fifo-write-pointer-changed",
                "fifoWriteChanged": write_changed,
                "fifoReadChanged": read_changed,
                "fifoRemainingChanged": remaining_changed,
                "dmaChannelsChanged": changed_dma,
                "crossedEventNames": crossed_events,
                "coDueEventNames": [
                    name for name in crossed_events if name != TIMER0_EVENT_NAME
                ],
                "before": None if before_state is None else {
                    **compact_timer0_fifo_state(before_state),
                    "queue": edge["queueBefore"],
                },
                "after": None if after_state is None else {
                    **compact_timer0_fifo_state(after_state),
                    "queue": edge["queueAfter"],
                },
            })
    crossings.sort(key=lambda row: (
        row["component"], row["ordinal"], row["instructionPc"], row["nextInstructionPc"],
    ))
    for index, row in enumerate(crossings):
        row["crossingOrdinal"] = index
    clean_edge_baselines = [
        {
            "component": key[0],
            "returnClass": key[1],
            "instructionPc": key[2],
            "nextInstructionPc": key[3],
            "cleanMinimumEdgeCycles": cycles,
            "sampleCount": clean_samples[key],
        }
        for key, cycles in sorted(clean_minima.items())
    ]
    return {
        "schema": "factory-construction-timer0-fifo-crossings/v1",
        "case": result["case"],
        "oracleProfile": result["oracleProfile"],
        "sourceFunction": result["sourceFunction"],
        "observation": "selected-source-order-timer0-crossing-edges",
        "selectedTraceCount": len(raw),
        "memberTraceCount": sum(trace["label"] == "member" for trace in raw),
        "cleanControlTraceCount": sum(trace["label"] == "control" for trace in raw),
        "cleanEdgeBaselines": clean_edge_baselines,
        "crossingCount": len(crossings),
        "crossings": crossings,
    }


def compact_ewram_access_receipt(result: dict[str, Any]) -> dict[str, Any]:
    """Keep clean minima and scalar/source-relative alignment classes only."""
    grouped: dict[tuple[str, int], list[dict[str, Any]]] = {}
    for raw in result["ewramAccessEvidence"]:
        grouped.setdefault((raw["label"], raw["addressModulo4"]), []).append(raw)
    rows: list[dict[str, Any]] = []
    for _, samples in sorted(grouped.items()):
        first = samples[0]
        rows.append({
            "label": first["label"],
            "instructionPc": first["instructionPc"],
            "observedPc": first["observedPc"],
            "access": first["access"],
            "width": first["width"],
            "addressModulo4": first["addressModulo4"],
            "cleanCycles": min(sample["cycles"] for sample in samples),
            "samples": len(samples),
        })
    component_groups: dict[str, list[dict[str, Any]]] = {}
    for component in result["ewramComponentEvidence"]:
        component_groups.setdefault(component["kind"], []).append(component)
    components = []
    for kind, samples in sorted(component_groups.items()):
        first = samples[0]
        components.append({
            "kind": kind,
            "entryPc": first["entryPc"],
            "cleanCycles": min(sample["cycles"] for sample in samples),
            "samples": len(samples),
        })
    return {
        "schema": "factory-ewram-access-boundaries/v1",
        "case": result["case"],
        "oracleProfile": result["oracleProfile"],
        "sourceFunction": result["sourceFunction"],
        "components": components,
        "rows": rows,
    }


TIMER0_SOURCE_BOUNDARY_KINDS = {
    "source-function-entry",
    "construction-entry",
    "personality-attempt-check",
    "personality-random",
    "create-mon-entry",
    "create-mon-return",
    "calculate-mon-stats-entry",
    "calculate-mon-stats-return",
    "factory-post-mon-end",
    "construction-return",
    "source-function-return",
}


def compact_timer0_cadence_receipt(result: dict[str, Any]) -> dict[str, Any]:
    """Keep Timer 0 registers and relative due phase at source boundaries."""
    events = result.get("cycleEvidence", {}).get("events", [])
    boundaries: list[dict[str, Any]] = []
    for event in events:
        if event["kind"] not in TIMER0_SOURCE_BOUNDARY_KINDS:
            continue
        timer0 = event.get("timer0")
        if timer0 is None:
            raise RuntimeError(f"{result['case']}: missing Timer 0 snapshot at {event['kind']}")
        boundaries.append({
            "kind": event["kind"],
            "pc": event["pc"],
            "monIndex": event.get("monIndex"),
            "attempt": event.get("attempt"),
            "half": event.get("half"),
            "globalCycles": event["globalCycles"],
            "cpuCycles": event["cpuCycles"],
            "masterCycles": event["masterCycles"],
            "tm0cntL": timer0["tm0cntL"],
            "tm0cntH": timer0["tm0cntH"],
            "event": timer0["event"],
        })
    if not boundaries:
        raise RuntimeError(f"{result['case']}: Timer 0 receipt captured no source boundaries")
    first = next(
        (row for row in boundaries if row["kind"] == "source-function-entry"),
        boundaries[0],
    )
    first_event = first["event"]
    return {
        "schema": "factory-construction-timer0-cadence/v1",
        "case": result["case"],
        "oracleProfile": result["oracleProfile"],
        "sourceFunction": result["sourceFunction"],
        "frameCycles": result["cycleEvidence"]["frameCycles"],
        "constructionClockEntryPhase": first["masterCycles"] % result["cycleEvidence"]["frameCycles"],
        "firstDueRelativeMasterCycles": None if first_event is None else first_event["whenDelta"],
        "boundaries": boundaries,
    }


def main() -> None:
    if OUTPUT.exists():
        raise SystemExit(f"refusing existing output path: {OUTPUT}")
    if VBLANK_WORKLOAD_EVIDENCE and not CYCLE_EVIDENCE:
        raise SystemExit("FACTORY_VBLANK_WORKLOAD_EVIDENCE=1 requires FACTORY_CONSTRUCTION_CYCLE_EVIDENCE=1")
    if VBLANK_WORKLOAD_INTERNAL_EVIDENCE and not VBLANK_WORKLOAD_EVIDENCE:
        raise SystemExit("FACTORY_VBLANK_WORKLOAD_INTERNAL_EVIDENCE=1 requires FACTORY_VBLANK_WORKLOAD_EVIDENCE=1")
    if CALCULATE_MON_STATS_EVIDENCE and not CYCLE_EVIDENCE:
        raise SystemExit("FACTORY_CALCULATE_MON_STATS_EVIDENCE=1 requires FACTORY_CONSTRUCTION_CYCLE_EVIDENCE=1")
    if EWRAM_ACCESS_EVIDENCE and not (CYCLE_EVIDENCE and CALCULATE_MON_STATS_EVIDENCE):
        raise SystemExit(
            "FACTORY_EWRAM_ACCESS_EVIDENCE=1 requires cycle and CalculateMonStats evidence"
        )
    if RESIDUAL_18_EVIDENCE and not (CYCLE_EVIDENCE and CALCULATE_MON_STATS_EVIDENCE):
        raise SystemExit(
            "FACTORY_RESIDUAL_18_EVIDENCE=1 requires cycle and CalculateMonStats evidence"
        )
    if RESIDUAL_18_INSTRUCTION_EVIDENCE and not (CYCLE_EVIDENCE and CALCULATE_MON_STATS_EVIDENCE):
        raise SystemExit(
            "FACTORY_RESIDUAL_18_INSTRUCTION_EVIDENCE=1 requires cycle and CalculateMonStats evidence"
        )
    if RESIDUAL_18_CLASSIFIER_EVIDENCE and not (CYCLE_EVIDENCE and CALCULATE_MON_STATS_EVIDENCE):
        raise SystemExit(
            "FACTORY_RESIDUAL_18_CLASSIFIER_EVIDENCE=1 requires cycle and CalculateMonStats evidence"
        )
    if TIMER0_CADENCE_EVIDENCE and not CYCLE_EVIDENCE:
        raise SystemExit(
            "FACTORY_TIMER0_CADENCE_EVIDENCE=1 requires FACTORY_CONSTRUCTION_CYCLE_EVIDENCE=1"
        )
    if TIMER0_FIFO_EVIDENCE and not (CYCLE_EVIDENCE and CALCULATE_MON_STATS_EVIDENCE):
        raise SystemExit(
            "FACTORY_TIMER0_FIFO_EVIDENCE=1 requires cycle and CalculateMonStats evidence"
        )
    if TIMER0_SCHEDULER_RUNTIME_EVIDENCE and not CYCLE_EVIDENCE:
        raise SystemExit(
            "FACTORY_TIMER0_SCHEDULER_RUNTIME_EVIDENCE=1 requires "
            "FACTORY_CONSTRUCTION_CYCLE_EVIDENCE=1"
        )
    if TIMER0_SCHEDULER_RUNTIME_EVIDENCE and CASE != "anchor":
        raise SystemExit(
            "FACTORY_TIMER0_SCHEDULER_RUNTIME_EVIDENCE=1 is bounded to the anchor case"
        )
    if TIMER0_SELECTED_EDGE_RUNTIME_EVIDENCE and CASE != "liliana":
        raise SystemExit(
            "FACTORY_TIMER0_SELECTED_EDGE_RUNTIME_EVIDENCE=1 is bounded to liliana"
        )
    if TIMER0_SELECTED_EDGE_RUNTIME_EVIDENCE and TIMER0_SCHEDULER_RUNTIME_EVIDENCE:
        raise SystemExit("selected and census Timer 0 runtime modes are exclusive")
    if CASE == "anchor":
        result = run_anchor()
    elif CASE == "liliana":
        result = run_liliana()
    else:
        result = run_factory_varied()
    if TIMER0_SELECTED_EDGE_RUNTIME_EVIDENCE:
        message = (
            f"wrote {OUTPUT}: {result['case']} selected adjacent-deadline "
            "Timer 0 runtime window"
        )
    elif TIMER0_SCHEDULER_RUNTIME_EVIDENCE:
        message = f"wrote {OUTPUT}: {result['case']} {len(result['windows'])} Timer 0 scheduler windows"
    elif TIMER0_FIFO_EVIDENCE:
        result = compact_timer0_fifo_classifier_receipt(result)
    elif TIMER0_CADENCE_EVIDENCE:
        result = compact_timer0_cadence_receipt(result)
    elif RESIDUAL_18_CLASSIFIER_EVIDENCE:
        result = compact_residual_classifier_receipt(result)
    elif RESIDUAL_18_INSTRUCTION_EVIDENCE:
        result = compact_residual_instruction_receipt(result)
    elif RESIDUAL_18_EVIDENCE:
        result = compact_residual_18_receipt(result)
    elif EWRAM_ACCESS_EVIDENCE:
        result = compact_ewram_access_receipt(result)
    elif CALCULATE_MON_STATS_EVIDENCE:
        result = compact_calculate_mon_stats_receipt(result)
    elif VBLANK_WORKLOAD_INTERNAL_EVIDENCE:
        result = compact_vblank_workload_internal_receipt(result)
    elif VBLANK_WORKLOAD_EVIDENCE:
        result = compact_vblank_workload_receipt(result)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(result, indent=2) + "\n")
    if TIMER0_FIFO_EVIDENCE:
        message = f"wrote {OUTPUT}: {result['case']} {result['crossingCount']} Timer 0 FIFO crossings"
    elif TIMER0_CADENCE_EVIDENCE:
        message = f"wrote {OUTPUT}: {result['case']} {len(result['boundaries'])} Timer 0 boundaries"
    elif RESIDUAL_18_CLASSIFIER_EVIDENCE:
        message = (
            f"wrote {OUTPUT}: {result['case']} {len(result['members'])} members + "
            f"{len(result['cleanControls'])} clean controls"
        )
    elif RESIDUAL_18_INSTRUCTION_EVIDENCE:
        message = f"wrote {OUTPUT}: {result['case']} {len(result['traces'])} instruction-level residual traces"
    elif RESIDUAL_18_EVIDENCE:
        message = f"wrote {OUTPUT}: {result['case']} {len(result['sourceBoundaries'])} residual-audit source boundaries"
    elif EWRAM_ACCESS_EVIDENCE:
        message = f"wrote {OUTPUT}: {result['case']} {len(result['rows'])} compact EWRAM boundaries"
    elif CALCULATE_MON_STATS_EVIDENCE:
        message = f"wrote {OUTPUT}: {result['case']} {len(result['directCalls'])} direct CalculateMonStats calls"
    elif VBLANK_WORKLOAD_EVIDENCE:
        message = f"wrote {OUTPUT}: {result['case']} {len(result['interrupts'])} VBlank workload observations"
    else:
        message = (
            f"wrote {OUTPUT}: {result['case']} "
            f"{result['totals']['construction']} construction + "
            f"{result['totals']['ambient']} ambient draws"
        )
    print(message, flush=True)


if __name__ == "__main__":
    main()
