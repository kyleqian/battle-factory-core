"""Semantic Battle Factory staging for the stock-ROM Emerald oracle.

The lab deliberately stages *inputs and prerequisites*, never outcomes.  It
rewinds to the canonical rental screen, replaces source-level Factory set IDs,
re-enters the real rental UI, and lets the ROM construct both parties and
initialize the battle.  ``mechanicLab`` may instead construct complete legal
Pokémon in both party buffers before the ROM initializes the battle, or retain
the legacy active-battler loadout overrides.  ``factoryBrain`` stages Noland's
challenge-2 (silver) or challenge-5 (gold) final battle: the trainer identity
is structural (always ``TRAINER_FRONTIER_BRAIN``) and his party is generated
live by the ROM's ``FillFactoryBrainParty``, with ``overrides.parties``
optionally pinning a known roster.  ``factoryBrain`` with ``walkup: true``
stages the *approach* to that battle instead of the battle itself: the ROM's
own post-win script increments the streak and warps back into the
PreBattleRoom, playing the genuine heal line, Noland phone call, and
GO ON/RECORD/REST/RETIRE menu; the checkpoint lands with that menu open and
the caller's trace answers it.  It never writes HP, status,
volatile, stat-stage, weather, side-condition, or other transient battle state.

Raw addresses and C-structure offsets stay private to this module.  The HTTP
contract uses trainer/set IDs and named battle concepts.
"""

from __future__ import annotations

import hashlib
import struct
from base64 import b64encode
from collections.abc import Callable
from dataclasses import dataclass
from itertools import permutations


SCHEMA_VERSION = 1
FACTORY_TRAINERS_COUNT = 300
# Noland, the Factory's Frontier Brain. His trainer-opponent value lives far
# outside the 300-row facility catalog (include/constants/trainers.h:12), and
# his party is generated live by FillFactoryBrainParty
# (src/battle_factory.c:759) — so factoryBrain requests carry no trainerId,
# battleNum, or opponentSetIds fields at all; the identity is structural.
TRAINER_FRONTIER_BRAIN = 1022
# sFixedIVTable[challengeNum + 2][0] (src/battle_factory.c:157-167, consulted
# by FillFactoryBrainParty at :772 with isLastBattle=FALSE) at the only two
# real Noland encounters: silver (challenge 2) and gold (challenge 5).
FACTORY_BRAIN_FIXED_IVS = {2: 15, 5: 31}
LEVEL_50_MAX_SET_ID = 849
ITEMS_COUNT = 377
ABILITIES_COUNT = 78
SPECIES_COUNT = 412
SPECIES_UNOWN = 201
SPECIES_SHEDINJA = 303
POKEMON_SIZE = 100
SPECIES_INFO_SIZE = 28
EXPERIENCE_TABLE_STRIDE = 101 * 4
SPECIES_NAME_SIZE = 11
PARTY_SIZE = 6
# The agbcc ABI rounds this 13-byte C struct to 16 bytes in the ROM table.
FACILITY_MON_SIZE = 16
RENTAL_MON_SIZE = 12
BATTLE_MON_SIZE = 0x58
# The agbcc ABI rounds this all-byte 9-byte C struct to a 12-byte array stride.
BATTLE_MOVE_SIZE = 12
NUM_BATTLE_STATS = 8
# The agbcc ABI rounds this all-byte 11-byte C struct to a 12-byte stride.
SIDE_TIMER_SIZE = 12
CONTROLLER_CHOOSE_ACTION = 18
PLAYER_CONTROLLER_FLAG = 1 << 0
ACTION_MENU_MAX_ACKS = 12
# Noland's battle intro ("FACTORY HEAD NOLAND would like to battle!" plus the
# Brain intro presentation) runs longer than the ordinary trainer intro: a
# live challenge-2 factoryBrain staging measured 16 ack blocks to the first
# action menu versus the ordinary 12-block budget. Double the measured need
# for headroom without becoming unbounded.
ACTION_MENU_MAX_ACKS_BRAIN = 32
STATE_BEFORE_ACTION_CHOSEN = 1
# `SELECT_TO_ACTION_MENU` (the (0, 1, 2) rental-position ordering) is 1886
# frames, but rental_selection_route()'s real runtime length is data-
# dependent on which candidates get selected — a brute-force check of all
# 120 reachable 3-of-6 orderings found a true range of 1886-1936 frames.
# Add the 120-frame lead-in and _finish_intro_to_action_menu's worst case
# (ACTION_MENU_MAX_ACKS * 134) to the true 1936-frame max, not the more
# convenient but incomplete 1886 figure: 120 + 1936 + 1608 = 3664. This
# leaves real headroom without being unbounded; see
# test_internal_route_length_is_pinned for the brute-force check itself.
MAX_PRE_CHECKPOINT_FRAME = 4096
MAX_PRE_CHECKPOINT_CAPTURES = 256
# preview_report()'s required anchor (BOOTSTRAP.md's v2 checkpoint,
# bootstrap/factory-pre-report.json). Checked at call time: an oracle built
# against any other bootstrap (e.g. the default factory.json) does not fail
# loudly on its own here the way prepare() happens to (its later
# gBattlersCount/gBattleMons checks incidentally catch a wrong anchor) —
# verified live that without this check, preview_report() against the
# default anchor silently returns a plausible-looking but stale, bogus
# result (leftover gFrontierTempParty/report-var memory from that anchor's
# own construction, untouched by this call's replay).
PRE_REPORT_ANCHOR_SHA256 = "ebb6ad29cc122f04c1e64217774c784f403d821154fec407cb0166371d44874d"
STAT_NAMES = ("hp", "attack", "defense", "speed", "spAttack", "spDefense")
GENDERS = ("male", "female", "genderless")

# personality % 24 selects the physical slot of each logical 12-byte
# substruct. Each tuple is logical ID -> physical storage index, exactly as
# GetSubstruct's four v1..v4 arguments express it in pokemon.c.
SUBSTRUCT_POSITIONS = (
    (0, 1, 2, 3), (0, 1, 3, 2), (0, 2, 1, 3), (0, 3, 1, 2),
    (0, 2, 3, 1), (0, 3, 2, 1), (1, 0, 2, 3), (1, 0, 3, 2),
    (2, 0, 1, 3), (3, 0, 1, 2), (2, 0, 3, 1), (3, 0, 2, 1),
    (1, 2, 0, 3), (1, 3, 0, 2), (2, 1, 0, 3), (3, 1, 0, 2),
    (2, 3, 0, 1), (3, 2, 0, 1), (1, 2, 3, 0), (1, 3, 2, 0),
    (2, 1, 3, 0), (3, 1, 2, 0), (2, 3, 1, 0), (3, 2, 1, 0),
)

# SaveBlock2 offsets are source-pinned by include/global.h.
SB2_FRONTIER_LVL_MODE = 0xCA9
SB2_FRONTIER_BATTLE_NUM = 0xCB2
SB2_TOWER_WIN_STREAK_SINGLES_50 = 0xCE0
SB2_FACTORY_WIN_STREAK_SINGLES_50 = 0xDE2
SB2_FACTORY_RENTS_SINGLES_50 = 0xDF6
SB2_RENTAL_MONS = 0xE70

# --- Frontier-Brain walk-up staging (`factoryBrain` + `walkup: true`) -------
# The ordinary staging re-enters the rental draft over the canonical
# checkpoint, whose parked field script is the *fresh-draft* PreBattleRoom
# entry: after the draft it resumes directly at EnterBattleRoom ("Right this
# way, please!") and never plays the post-battle re-entry content — the heal
# line, Noland's phone call, the GO ON/RECORD/REST/RETIRE menu, and the
# pre-head swap prompt (RAM-probed in the workspace's
# docs/noland-silver-walkup-presentation-map.md §0: the map's OnFrame
# dispatch needs VAR_0x8006 == 1, which nothing on the staged path writes).
# The walk-up staging redirects that parked script pointer to the ROM's own
# post-win fragment (the BattleRoom's DefeatedOpponent label), so the ROM
# itself performs the genuine bookkeeping (win-streak-swaps stat, streak
# increment, battle-number increment), sets VAR_0x8006 = 1, and warps back
# into the PreBattleRoom — from where OnWarp/OnFrame run the real
# ReturnToRoomFromBattle scene, byte-for-byte the ROM's own 21st/42nd-battle
# path. The route stops with the ask-ready multichoice open (cursor on
# GO ON); the caller's post-checkpoint trace chooses the answer.
#
# struct ScriptContext field offsets (include/script.h) and the script-mode
# enum (src/script.c). sGlobalScriptContext itself is file-static and absent
# from the linker map, so prepare() locates it by scanning IWRAM for the
# unique struct whose cmdTable/cmdTableEnd point at gScriptCmdTable and
# whose parked scriptPtr is the fresh-draft resume label.
SCRIPT_CTX_MODE = 0x1
SCRIPT_CTX_NATIVE_PTR = 0x4
SCRIPT_CTX_SCRIPT_PTR = 0x8
SCRIPT_CTX_CMD_TABLE = 0x5C
SCRIPT_CTX_CMD_TABLE_END = 0x60
# ScriptContext_Stop (waitstate, multichoice) only flips the separate
# file-static status byte; the context's own mode stays BYTECODE while
# parked, and only native waits (waitmessage, waitbuttonpress, movement)
# switch it to NATIVE. Verified live against the canonical checkpoint.
SCRIPT_MODE_BYTECODE = 1
SCRIPT_MODE_NATIVE = 2
IWRAM_RANGE = (0x03000000, 0x03008000)
# Exported script labels (data symbols, present in the linker map).
WALKUP_PARKED_LABEL = (
    "BattleFrontier_BattleFactoryPreBattleRoom_EventScript_EnterBattleRoom"
)
WALKUP_REDIRECT_LABEL = (
    "BattleFrontier_BattleFactoryBattleRoom_EventScript_DefeatedOpponent"
)
WALKUP_ASK_READY_LABEL = (
    "BattleFrontier_BattleFactoryPreBattleRoom_EventScript_AskReadyForHead"
)
WALKUP_ASK_READY_NO_RECORD_LABEL = (
    "BattleFrontier_BattleFactoryPreBattleRoom_EventScript_AskReadyForHeadNoRecord"
)
WALKUP_ASK_SWAP_LABEL = (
    "BattleFrontier_BattleFactoryPreBattleRoom_EventScript_AskSwapBeforeHead"
)
# SaveBlock1.flags (include/global.h 0x1270) and the Factory symbol flags
# (include/constants/flags.h). GetFrontierBrainStatus needs the silver
# symbol set before the challenge-5 (gold) encounter reads as GOLD — the
# real game can never reach battle 42 without it. Both factoryBrain
# stagings (battle and walk-up) derive it from challengeNum.
SB1_FLAGS = 0x1270
FLAG_SYS_FACTORY_SILVER = 0x8CC
FLAG_SYS_FACTORY_GOLD = 0x8CD
# Bit 3 of the 0xCA9 bitfield byte (global.h: lvlMode:2, challengePaused:1,
# disableRecordBattle:1). The walk-up clears it: the genuine path re-enables
# recording before every regular battle, so battle 20's aftermath has it
# clear and the ask-ready menu is the four-option GO ON/RECORD/REST/RETIRE.
SB2_DISABLE_RECORD_BATTLE_BIT = 0x8
# Walk-up ack budget: four boxes need an A (heal line, "wait a few
# moments", "understood, sir", "message from the head") and the fanfare/
# attendant-movement waits burn a few more inert cycles; 16 doubles the
# need. The whole walk-up internal route (120 lead-in + 442 worst-case
# confirm-only rental selection + 16 * 134 ack loop = 2706 frames, pinned
# by test_walkup_route_length_stays_under_its_own_frame_bound) stays under
# MAX_PRE_CHECKPOINT_FRAME, so walk-up requests share the ordinary bound.
WALKUP_MAX_ACKS = 16

REGULAR_TRAINER_RANGES = (
    (0, 99),
    (80, 119),
    (100, 139),
    (120, 159),
    (140, 179),
    (160, 199),
    (180, 219),
    (200, 299),
)
FINAL_TRAINER_RANGES = (
    (100, 119),
    (120, 139),
    (140, 159),
    (160, 179),
    (180, 199),
    (200, 219),
    (220, 239),
    (200, 299),
)
LEVEL_50_SET_RANGES = (
    (110, 199),
    (162, 266),
    (267, 371),
    (372, 467),
    (468, 563),
    (564, 659),
    (660, 755),
    (372, 849),
)
RENTAL_RANK_THRESHOLDS = (15, 22, 29, 36, 43)

# This is the canonical, deliberately generous Scene-OFF route from the
# rental selection screen to the first action menu.  It selects slots 0, 1,
# and 2.  Scene-ON is also supported; the long idle windows absorb its species
# entrance animation.  State assertions below fail closed if a source update
# changes the route.
SELECT_MON_AT_CURSOR = (
    (2, ("A",)), (28, ()), (2, ("DOWN",)), (4, ()), (2, ("A",)),
)
# The confirm-accept prefix ("Are these three POKéMON OK?" -> YES plus the
# fade-out) is also the walk-up staging's hand-off point: everything after
# it drives the fresh-draft path's own intro, which the walk-up redirect
# replaces with the post-win warp back into the PreBattleRoom.
SELECT_CONFIRM_ACCEPT = (
    (70, ()), (2, ("A",)), (130, ()),
)
SELECT_CONFIRM_TO_ACTION_MENU = SELECT_CONFIRM_ACCEPT + (
    (8, ()), (2, ("A",)), (96, ()), (24, ()), (162, ()), (54, ()), (100, ()),
    (2, ("A",)), (196, ()), (14, ()), (210, ()), (60, ()), (100, ()),
    (2, ("A",)), (144, ()), (180, ()), (60, ()), (80, ()),
)


def rental_selection_route(
    selected_positions: tuple[int, int, int],
    through_confirm_only: bool = False,
) -> tuple[tuple[int, tuple[str, ...]], ...]:
    route: list[tuple[int, tuple[str, ...]]] = []
    cursor = 0
    for index, target in enumerate(selected_positions):
        distance = (target - cursor) % 6
        for step in range(distance):
            route.append((2, ("RIGHT",)))
            if step + 1 < distance:
                route.append((2, ()))
        route.extend(SELECT_MON_AT_CURSOR)
        cursor = target
        if index < len(selected_positions) - 1:
            route.append((36, ()))
    route.extend(
        SELECT_CONFIRM_ACCEPT if through_confirm_only
        else SELECT_CONFIRM_TO_ACTION_MENU
    )
    return tuple(route)


SELECT_TO_ACTION_MENU = rental_selection_route((0, 1, 2))

# The attendant-dialogue route from the pre-report anchor (bootstrap/
# factory-pre-report.json, BOOTSTRAP.md's v2 checkpoint) through the
# rental-draft screen load. This is a literal extraction of
# bootstrap/factory.json's segments[193:225] (BOOTSTRAP.md's v3 table,
# steps 1-16) — screenshot-verified there; it is not independently
# re-verified here beyond the pinned-length test below and the fresh-
# process anchor/report checks in report-preview-smoke-test.py. Replaying
# it plus 60 further idle frames reaches the same state factory.json bakes
# in directly as its own v3 anchor.
ATTENDANT_DIALOGUE_ROUTE = (
    (6, ("A",)), (100, ()),
    (6, ("A",)), (100, ()),
    (6, ("A",)), (100, ()),
    (6, ("A",)), (100, ()),
    (6, ("A",)), (100, ()),
    (6, ("A",)), (100, ()),
    (6, ("A",)), (120, ()),
    (6, ("A",)), (120, ()),
    (6, ("A",)), (700, ()),
    (6, ("A",)), (100, ()),
    (6, ("A",)), (460, ()),  # generation + first report page print
    (6, ("A",)), (120, ()),  # dismiss "skilled in the X type"
    (6, ("A",)), (120, ()),  # dismiss "favorite battle style..."
    (6, ("A",)), (120, ()),
    (6, ("A",)), (120, ()),
    (6, ("A",)), (240, ()),
)


def _integer(value, path: str, low: int, high: int) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or not low <= value <= high:
        raise ValueError(f"{path} must be an integer from {low} to {high}")
    return value


def _set_ids(value, path: str, max_id: int) -> tuple[int, int, int]:
    if not isinstance(value, list) or len(value) != 3:
        raise ValueError(f"{path} must contain exactly three set IDs")
    return tuple(_integer(item, f"{path}[{index}]", 0, max_id) for index, item in enumerate(value))


def _pre_checkpoint_capture_frames(value: object, path: str) -> list[int]:
    if not isinstance(value, list) or len(value) > MAX_PRE_CHECKPOINT_CAPTURES:
        raise ValueError(f"{path} must contain 0 to {MAX_PRE_CHECKPOINT_CAPTURES} entries")
    return sorted({
        _integer(item, f"{path}[{index}]", 0, MAX_PRE_CHECKPOINT_FRAME)
        for index, item in enumerate(value)
    })


def _stat_values(value: object, path: str, high: int) -> dict[str, int]:
    if not isinstance(value, dict):
        raise ValueError(f"{path} must be an object")
    unknown = set(value) - set(STAT_NAMES)
    missing = set(STAT_NAMES) - set(value)
    if unknown:
        raise ValueError(f"{path} has unknown fields: {', '.join(sorted(unknown))}")
    if missing:
        raise ValueError(f"{path} is missing fields: {', '.join(sorted(missing))}")
    return {
        name: _integer(value[name], f"{path}.{name}", 0, high)
        for name in STAT_NAMES
    }


def _validate_party_pokemon(value: object, path: str) -> None:
    if not isinstance(value, dict):
        raise ValueError(f"{path} must be an object")
    allowed = {
        "species", "level", "nature", "ivs", "evs", "moves", "ppUps",
        "item", "abilitySlot", "friendship", "personality", "gender", "shiny",
    }
    unknown = set(value) - allowed
    if unknown:
        raise ValueError(f"{path} has unknown fields: {', '.join(sorted(unknown))}")
    if "species" not in value:
        raise ValueError(f"{path}.species is required")
    if "moves" not in value:
        raise ValueError(f"{path}.moves is required")
    _integer(value["species"], f"{path}.species", 1, SPECIES_COUNT - 1)
    if "level" in value:
        _integer(value["level"], f"{path}.level", 1, 100)
    if "nature" in value:
        _integer(value["nature"], f"{path}.nature", 0, 24)
    if "ivs" in value:
        _stat_values(value["ivs"], f"{path}.ivs", 31)
    if "evs" in value:
        evs = _stat_values(value["evs"], f"{path}.evs", 255)
        if sum(evs.values()) > 510:
            raise ValueError(f"{path}.evs total must not exceed 510")
    moves = value["moves"]
    if not isinstance(moves, list) or len(moves) != 4:
        raise ValueError(f"{path}.moves must contain four move IDs")
    for index, move in enumerate(moves):
        _integer(move, f"{path}.moves[{index}]", 0, 354)
    pp_ups = value.get("ppUps", [0, 0, 0, 0])
    if not isinstance(pp_ups, list) or len(pp_ups) != 4:
        raise ValueError(f"{path}.ppUps must contain four values")
    for index, amount in enumerate(pp_ups):
        _integer(amount, f"{path}.ppUps[{index}]", 0, 3)
    if "item" in value:
        _integer(value["item"], f"{path}.item", 0, ITEMS_COUNT - 1)
    if "abilitySlot" in value:
        _integer(value["abilitySlot"], f"{path}.abilitySlot", 0, 1)
    if "friendship" in value:
        _integer(value["friendship"], f"{path}.friendship", 0, 255)
    if "personality" in value:
        _integer(value["personality"], f"{path}.personality", 0, 0xFFFFFFFF)
    if "gender" in value and value["gender"] not in GENDERS:
        raise ValueError(f"{path}.gender must be 'male', 'female', or 'genderless'")
    if "shiny" in value and not isinstance(value["shiny"], bool):
        raise ValueError(f"{path}.shiny must be a boolean")


def _validate_parties(value: object) -> None:
    if not isinstance(value, dict):
        raise ValueError("overrides.parties must be an object")
    unknown = set(value) - {"player", "opponent"}
    if unknown:
        raise ValueError(
            "overrides.parties has unknown fields: "
            f"{', '.join(sorted(unknown))}"
        )
    missing = {"player", "opponent"} - set(value)
    if missing:
        raise ValueError(
            "overrides.parties is missing fields: "
            f"{', '.join(sorted(missing))}"
        )
    for side in ("player", "opponent"):
        party = value[side]
        path = f"overrides.parties.{side}"
        if not isinstance(party, list) or len(party) != 3:
            raise ValueError(f"{path} must contain exactly three Pokémon")
        for index, mon in enumerate(party):
            _validate_party_pokemon(mon, f"{path}[{index}]")


def _validate_loadout_overrides(overrides: dict) -> None:
    unknown = set(overrides) - {"battlers", "parties"}
    if unknown:
        raise ValueError(f"unknown overrides: {', '.join(sorted(unknown))}")
    if "battlers" in overrides and "parties" in overrides:
        raise ValueError(
            "overrides.battlers and overrides.parties are mutually exclusive"
        )
    if "parties" in overrides:
        _validate_parties(overrides["parties"])
    battlers = overrides.get("battlers", {})
    if not isinstance(battlers, dict):
        raise ValueError("overrides.battlers must be an object")
    unknown_battlers = set(battlers) - {"player", "opponent"}
    if unknown_battlers:
        raise ValueError(
            "overrides.battlers has unknown fields: "
            f"{', '.join(sorted(unknown_battlers))}"
        )
    for name, value in battlers.items():
        path = f"overrides.battlers.{name}"
        if not isinstance(value, dict):
            raise ValueError(f"{path} must be an object")
        allowed = {"moves", "ppUps", "item", "ability", "types", "friendship"}
        unknown_fields = set(value) - allowed
        if unknown_fields:
            raise ValueError(
                f"{path} has unknown fields: {', '.join(sorted(unknown_fields))}"
            )
        if "moves" in value:
            moves = value["moves"]
            if not isinstance(moves, list) or len(moves) != 4:
                raise ValueError(f"{path}.moves must contain four move IDs")
            for index, move in enumerate(moves):
                _integer(move, f"{path}.moves[{index}]", 0, 354)
        if ("moves" in value) != ("ppUps" in value):
            raise ValueError(
                f"{path}.moves and {path}.ppUps must be supplied together"
            )
        if "ppUps" in value:
            pp_ups = value["ppUps"]
            if not isinstance(pp_ups, list) or len(pp_ups) != 4:
                raise ValueError(f"{path}.ppUps must contain four values")
            for index, amount in enumerate(pp_ups):
                _integer(amount, f"{path}.ppUps[{index}]", 0, 3)
        if "item" in value:
            _integer(value["item"], f"{path}.item", 0, ITEMS_COUNT - 1)
        if "ability" in value:
            _integer(value["ability"], f"{path}.ability", 0, ABILITIES_COUNT - 1)
        if "types" in value:
            types = value["types"]
            if not isinstance(types, list) or len(types) != 2:
                raise ValueError(f"{path}.types must contain two type IDs")
            for index, type_id in enumerate(types):
                _integer(type_id, f"{path}.types[{index}]", 0, 17)
        if "friendship" in value:
            _integer(value["friendship"], f"{path}.friendship", 0, 255)


def validate_request(value: object, profile: str) -> dict:
    if not isinstance(value, dict):
        raise ValueError("body must be an object")
    allowed = {
        "schemaVersion", "mode", "profile", "level", "challengeNum",
        "battleNum", "trainerId", "playerSetIds", "opponentSetIds",
        "rentalSwapCount", "seed", "overrides", "trace", "walkup",
        "preCheckpointCaptureFrames", "preCheckpointCaptureAllFrames",
    }
    unknown = set(value) - allowed
    if unknown:
        raise ValueError(f"unknown fields: {', '.join(sorted(unknown))}")
    _integer(
        value.get("schemaVersion", SCHEMA_VERSION),
        "schemaVersion",
        SCHEMA_VERSION,
        SCHEMA_VERSION,
    )
    mode = value.get("mode")
    if mode not in ("factoryLegal", "mechanicLab", "factoryBrain"):
        raise ValueError("mode must be 'factoryLegal', 'mechanicLab', or 'factoryBrain'")
    requested_profile = value.get("profile", profile)
    if requested_profile != profile:
        raise ValueError(
            f"profile {requested_profile!r} does not match this oracle service ({profile!r})"
        )
    level = _integer(value.get("level", 50), "level", 50, 50)
    max_set_id = LEVEL_50_MAX_SET_ID
    walkup = value.get("walkup", False)
    if not isinstance(walkup, bool):
        raise ValueError("walkup must be a boolean")
    if walkup and mode != "factoryBrain":
        raise ValueError(
            "walkup is only available in mode 'factoryBrain'; the "
            "post-battle PreBattleRoom re-entry it stages is the "
            "Frontier-Brain walk-up"
        )
    if mode == "factoryBrain":
        forbidden = {"trainerId", "battleNum", "opponentSetIds"} & set(value)
        if forbidden:
            raise ValueError(
                "factoryBrain does not accept fields: "
                f"{', '.join(sorted(forbidden))} (the trainer is implied "
                "TRAINER_FRONTIER_BRAIN, Noland is always his challenge's "
                "final battle, and his party is generated live by "
                "FillFactoryBrainParty, not staged from set IDs)"
            )
        challenge_num = _integer(value.get("challengeNum"), "challengeNum", 0, 7)
        if challenge_num not in (2, 5):
            raise ValueError(
                "factoryBrain challengeNum must be 2 (silver) or 5 (gold); "
                "those are the only real in-game Noland encounters"
            )
        battle_num = 6
        trainer_id = TRAINER_FRONTIER_BRAIN
        opponent_set_ids = ()
    else:
        challenge_num = _integer(value.get("challengeNum", 0), "challengeNum", 0, 7)
        battle_num = _integer(value.get("battleNum", 0), "battleNum", 0, 6)
        if battle_num == 6 and challenge_num in (2, 5):
            raise ValueError(
                "challenge 2/5 battle 6 is a Noland battle; use mode "
                "'factoryBrain' to stage it (ordinary trainerId staging of "
                "Noland remains unsupported)"
            )
        trainer_id = _integer(value.get("trainerId"), "trainerId", 0, FACTORY_TRAINERS_COUNT - 1)
        opponent_set_ids = _set_ids(value.get("opponentSetIds"), "opponentSetIds", max_set_id)
    player_set_ids = _set_ids(value.get("playerSetIds"), "playerSetIds", max_set_id)
    rental_swap_count = _integer(
        value.get("rentalSwapCount", 0),
        "rentalSwapCount",
        0,
        0xFFFF,
    )
    seed = _integer(value.get("seed", 0xD2DDEEC8), "seed", 0, 0xFFFFFFFF)
    overrides = value.get("overrides", {})
    if not isinstance(overrides, dict):
        raise ValueError("overrides must be an object")
    if mode == "factoryLegal" and overrides:
        raise ValueError("factoryLegal does not permit overrides; use mechanicLab")
    if mode == "mechanicLab":
        _validate_loadout_overrides(overrides)
    if mode == "factoryBrain" and overrides:
        if walkup:
            raise ValueError(
                "walkup does not permit overrides: the checkpoint lands at "
                "the ask-ready menu, before any battle initializes, so the "
                "party-staging hooks never run; the eventual battle is "
                "seed-deterministic instead"
            )
        if "battlers" in overrides:
            raise ValueError(
                "factoryBrain does not permit overrides.battlers; the Brain "
                "party is generated live — pin a known roster with "
                "overrides.parties instead"
            )
        unknown_overrides = set(overrides) - {"parties"}
        if unknown_overrides:
            raise ValueError(f"unknown overrides: {', '.join(sorted(unknown_overrides))}")
        _validate_parties(overrides["parties"])
    trace = value.get("trace", {"segments": [], "captureFrames": [0]})
    if not isinstance(trace, dict):
        raise ValueError("trace must be an object")
    pre_checkpoint_capture_frames = _pre_checkpoint_capture_frames(
        value.get("preCheckpointCaptureFrames", []),
        "preCheckpointCaptureFrames",
    )
    pre_checkpoint_capture_all_frames = value.get("preCheckpointCaptureAllFrames", False)
    if not isinstance(pre_checkpoint_capture_all_frames, bool):
        raise ValueError("preCheckpointCaptureAllFrames must be a boolean")
    if pre_checkpoint_capture_all_frames and pre_checkpoint_capture_frames:
        raise ValueError(
            "preCheckpointCaptureFrames and preCheckpointCaptureAllFrames "
            "are mutually exclusive"
        )
    return {
        "schemaVersion": SCHEMA_VERSION,
        "mode": mode,
        "profile": profile,
        "level": level,
        "challengeNum": challenge_num,
        "battleNum": battle_num,
        "trainerId": trainer_id,
        "playerSetIds": player_set_ids,
        "opponentSetIds": opponent_set_ids,
        "rentalSwapCount": rental_swap_count,
        "seed": seed,
        "overrides": overrides,
        "trace": trace,
        "walkup": walkup,
        "preCheckpointCaptureFrames": pre_checkpoint_capture_frames,
        "preCheckpointCaptureAllFrames": pre_checkpoint_capture_all_frames,
    }


@dataclass(frozen=True)
class FacilityMon:
    set_id: int
    species: int
    moves: tuple[int, int, int, int]
    item_table_id: int
    item: int
    ev_spread: int
    nature: int

    def json(self) -> dict:
        return {
            "setId": self.set_id,
            "species": self.species,
            "moves": list(self.moves),
            "item": self.item,
            "itemTableId": self.item_table_id,
            "evSpread": self.ev_spread,
            "nature": self.nature,
        }


class FacilityCatalog:
    def __init__(self, oracle):
        self.oracle = oracle
        self.mons = oracle.symbols["gBattleFrontierMons"]
        self.items = oracle.symbols["gBattleFrontierHeldItems"]

    def mon(self, set_id: int) -> FacilityMon:
        base = self.mons + set_id * FACILITY_MON_SIZE
        item_table_id = self.oracle.read_u8(base + 10)
        return FacilityMon(
            set_id=set_id,
            species=self.oracle.read_u16(base),
            moves=tuple(self.oracle.read_u16(base + 2 + index * 2) for index in range(4)),
            item_table_id=item_table_id,
            item=self.oracle.read_u16(self.items + item_table_id * 2),
            ev_spread=self.oracle.read_u8(base + 11),
            nature=self.oracle.read_u8(base + 12),
        )


@dataclass(frozen=True)
class RentalPlan:
    candidates: tuple[
        FacilityMon,
        FacilityMon,
        FacilityMon,
        FacilityMon,
        FacilityMon,
        FacilityMon,
    ]
    selected_positions: tuple[int, int, int]

    @property
    def fillers(self) -> list[FacilityMon]:
        selected = set(self.selected_positions)
        return [mon for index, mon in enumerate(self.candidates) if index not in selected]


class BattleLab:
    def __init__(self, oracle, profile: str):
        self.oracle = oracle
        self.profile = profile
        self.catalog = FacilityCatalog(oracle)
        # IWRAM address of the file-static sGlobalScriptContext, discovered
        # on first walk-up staging and stable for the process lifetime.
        self._script_context_addr: int | None = None

    def prepare(self, request: dict) -> dict:
        """Stage a battle and return the semantic setup descriptor."""
        player = [self.catalog.mon(set_id) for set_id in request["playerSetIds"]]
        opponent = [self.catalog.mon(set_id) for set_id in request["opponentSetIds"]]
        rental_plan = self._validate_and_plan(request, player, opponent)
        if request["mode"] in ("mechanicLab", "factoryBrain"):
            self._validate_pp_ups(request["overrides"])
            self._validate_custom_parties(request["overrides"])

        self.oracle.new_session()

        # Additive, opt-in captures of the internal route from new_session()
        # through the action-menu checkpoint below — the rental-selection
        # screen and the battle-start intro cutscene, both of which the
        # route already traverses but never otherwise exposes. Frame
        # numbers here are absolute (0 == immediately after new_session()),
        # a distinct coordinate space from the post-checkpoint frame 0 the
        # caller's own `trace` is relative to; unrequested (the common
        # case: 441 of 444 existing tools/battle-lab/*.json fixtures ask
        # for neither) costs one `in`/bool check per frame and nothing else.
        # preCheckpointCaptureAllFrames is a deliberate, uncapped dense-probe
        # affordance (unlike the 256-capped explicit list below) — it exists
        # for callers building a full animation trace, not the common
        # mechanicLab ability/item-test caller, so it must stay opt-in too.
        pre_checkpoint_wanted = set(request["preCheckpointCaptureFrames"])
        pre_checkpoint_capture_all = request["preCheckpointCaptureAllFrames"]
        pre_checkpoint_captures: list[dict] = []

        def capture_pre_checkpoint() -> None:
            if not pre_checkpoint_capture_all and self.oracle.frame not in pre_checkpoint_wanted:
                return
            rgb = self.oracle.screen_rgb()
            pre_checkpoint_captures.append({
                "frame": self.oracle.frame,
                "sha256": hashlib.sha256(rgb).hexdigest(),
                "pngBase64": b64encode(self.oracle.screen_png()).decode("ascii"),
                "state": self.snapshot(),
            })

        capture_pre_checkpoint()

        walkup = request["walkup"]
        save2 = self.oracle.read_u32(self.oracle.symbols["gSaveBlock2Ptr"])
        challenge_index = min(request["challengeNum"], 7)
        lvl_mode_clear = 0x3 | (SB2_DISABLE_RECORD_BATTLE_BIT if walkup else 0)
        self.oracle.write_u8(
            save2 + SB2_FRONTIER_LVL_MODE,
            self.oracle.read_u8(save2 + SB2_FRONTIER_LVL_MODE) & ~lvl_mode_clear,
        )
        current_streak = request["challengeNum"] * 7 + request["battleNum"]
        # The walk-up stages the state right after the *previous* battle's
        # win: the redirected post-win fragment then performs the ROM's own
        # streak and battle-number increments to the final values.
        self.oracle.write_u16(
            save2 + SB2_FRONTIER_BATTLE_NUM,
            request["battleNum"] - 1 if walkup else request["battleNum"],
        )
        self.oracle.write_u16(
            save2 + SB2_FACTORY_WIN_STREAK_SINGLES_50,
            current_streak - 1 if walkup else current_streak,
        )
        # The stock Emerald bug reads the Tower streak for opponent IVs.
        # Nothing on the walk-up path increments it, so it is staged at the
        # final value in both stagings and the eventual battle state matches
        # the plain factoryBrain staging exactly.
        self.oracle.write_u16(
            save2 + SB2_TOWER_WIN_STREAK_SINGLES_50,
            current_streak,
        )
        if request["mode"] == "factoryBrain" and request["challengeNum"] == 5:
            # Gold is only reachable with the silver symbol earned;
            # GetFrontierBrainStatus otherwise reads NOT_READY at streak 41
            # and the ROM stages an ordinary trainer instead of gold Noland.
            self._set_factory_symbol_flag(FLAG_SYS_FACTORY_SILVER)
        self.oracle.write_u16(
            save2 + SB2_FACTORY_RENTS_SINGLES_50,
            request["rentalSwapCount"],
        )

        for index, mon in enumerate(rental_plan.candidates):
            self.oracle.write_u16(
                save2 + SB2_RENTAL_MONS + index * RENTAL_MON_SIZE,
                mon.set_id,
            )
        for index, set_id in enumerate(request["opponentSetIds"]):
            self.oracle.write_u16(self.oracle.symbols["gFrontierTempParty"] + index * 2, set_id)
        self.oracle.write_u16(self.oracle.symbols["gTrainerBattleOpponent_A"], request["trainerId"])
        self.oracle.write_u32(self.oracle.symbols["gRngValue"], request["seed"])

        # Re-enter the source's real rental constructor after replacing the
        # semantic set IDs. SetMainCallback2 inside this exported function
        # resets gMain.state itself.
        self.oracle.write_u32(
            self.oracle.symbols["gMain"] + 4,
            self.oracle.symbols["DoBattleFactorySelectScreen"] | 1,
        )
        if walkup:
            # While the draft runs, the checkpoint's field script sits
            # parked at its post-draft resume point. Redirect it to the
            # ROM's own post-win fragment so that, when the draft confirm
            # returns to the field, the ROM performs its genuine post-win
            # bookkeeping and warps back into the PreBattleRoom re-entry.
            self._redirect_parked_script_to_post_win()
        custom_parties = request["overrides"].get("parties")
        party_builder_applied = custom_parties is None
        active_overrides_applied = (
            request["mode"] != "mechanicLab"
            or "battlers" not in request["overrides"]
        )

        def apply_mechanic_setup() -> None:
            nonlocal party_builder_applied, active_overrides_applied
            if not party_builder_applied and self._parties_ready_for_staging():
                self._apply_custom_parties(
                    custom_parties,
                    request["seed"],
                    request["level"],
                )
                party_builder_applied = True
            if (
                not active_overrides_applied
                and self._before_first_action_choices()
            ):
                self._apply_overrides(request["overrides"])
                active_overrides_applied = True

        def after_frame() -> None:
            apply_mechanic_setup()
            capture_pre_checkpoint()

        self._advance(120, (), after_frame)
        for frames, buttons in rental_selection_route(
            rental_plan.selected_positions,
            through_confirm_only=walkup,
        ):
            self._advance(frames, buttons, after_frame)
        if walkup:
            self._finish_walkup_to_ask_ready(after_frame)
        else:
            self._finish_intro_to_action_menu(
                after_frame,
                max_acks=(
                    ACTION_MENU_MAX_ACKS_BRAIN
                    if request["mode"] == "factoryBrain"
                    else ACTION_MENU_MAX_ACKS
                ),
            )

        if walkup:
            # The redirected fragment's own increments prove it executed:
            # the fresh-draft fallthrough would have left both fields at
            # their staged pre-win values. Re-read the SaveBlock2 pointer —
            # the ROM periodically DMA-relocates the save blocks, so the
            # staging-time pointer is stale after the route.
            save2_after = self.oracle.read_u32(self.oracle.symbols["gSaveBlock2Ptr"])
            battle_num_after = self.oracle.read_u16(
                save2_after + SB2_FRONTIER_BATTLE_NUM
            )
            streak_after = self.oracle.read_u16(
                save2_after + SB2_FACTORY_WIN_STREAK_SINGLES_50
            )
            if battle_num_after != request["battleNum"] or streak_after != current_streak:
                raise RuntimeError(
                    "walk-up route did not run the ROM's post-win increments "
                    f"(battleNum {battle_num_after}, streak {streak_after})"
                )
        elif self.oracle.read_u8(self.oracle.symbols["gBattlersCount"]) != 2:
            raise RuntimeError("battle lab route did not reach a singles battle")
        if not walkup:
            battle_mons = self.oracle.symbols["gBattleMons"]
            if not self.oracle.read_u16(battle_mons) or not self.oracle.read_u16(
                battle_mons + BATTLE_MON_SIZE
            ):
                raise RuntimeError("battle lab route did not initialize both active battlers")

        if not party_builder_applied:
            raise RuntimeError(
                "battle lab route did not reach the pre-battle party checkpoint"
            )
        if not active_overrides_applied:
            raise RuntimeError(
                "battle lab route did not reach the pre-action loadout checkpoint"
            )

        # User trace frames are relative to the completed lab setup, not the
        # internal route used to reach it.
        self.oracle.frame = 0
        descriptor = {
            "schemaVersion": SCHEMA_VERSION,
            "mode": request["mode"],
            "profile": request["profile"],
            "level": request["level"],
            "challengeNum": request["challengeNum"],
            "battleNum": request["battleNum"],
            "trainerId": request["trainerId"],
            "rentalSwapCount": request["rentalSwapCount"],
            "rentalRank": self._rental_rank(request["rentalSwapCount"]),
            "seed": request["seed"],
            "player": [mon.json() for mon in player],
            "opponent": [mon.json() for mon in opponent],
            "rentalCandidates": [mon.json() for mon in rental_plan.candidates],
            "selectedRentalPositions": list(rental_plan.selected_positions),
            "rentalFillers": [mon.json() for mon in rental_plan.fillers],
            "sourceInitialized": True,
            "customPartiesBuiltBeforeBattle": custom_parties is not None,
            "rangeIndex": challenge_index,
            "preCheckpointCaptures": pre_checkpoint_captures,
        }
        if request["mode"] == "factoryBrain":
            # No trainerId/rangeIndex echo: the Brain's identity is structural
            # and his party never came from catalog set IDs. Instead expose
            # the party the ROM actually generated (read back from RAM after
            # battle init) plus the derived fixed IV, so callers can
            # cross-check against the workspace port without re-deriving.
            del descriptor["trainerId"]
            del descriptor["rangeIndex"]
            descriptor["fixedIv"] = FACTORY_BRAIN_FIXED_IVS[request["challengeNum"]]
            if walkup:
                # No battle initialized yet, so there is no opponentParty to
                # read back; echo the staged overworld facts instead so
                # callers can assert the walk-up staging semantically.
                descriptor["walkup"] = True
                descriptor["factoryWinStreak"] = streak_after
                descriptor["curChallengeBattleNum"] = battle_num_after
                descriptor["factorySymbols"] = self._factory_symbol_count()
                descriptor["askReadyMenuVariant"] = self._walkup_ask_ready_state()
            else:
                descriptor["opponentParty"] = self._party("opponent")
        return descriptor

    def preview_report(
        self,
        *,
        seed: int | None = None,
        capture_frames: set[int] | None = None,
        capture_all_frames: bool = False,
    ) -> dict:
        """Replay the attendant scouting-report dialogue, capturing frames
        and the computed report state. Does not stage a battle.

        Requires this instance's oracle to be booted from
        bootstrap/factory-pre-report.json (BOOTSTRAP.md's v2 checkpoint,
        before the dialogue), NOT the default anchor prepare() assumes —
        the standard server's oracle is anchored past this dialogue and
        cannot run this method meaningfully. Checked at call time (raises
        RuntimeError on mismatch): unlike prepare(), which happens to fail
        loudly on a wrong anchor via its own later gBattlersCount/
        gBattleMons checks, this method has no equivalent natural
        checkpoint, and a live check confirmed that without this guard it
        silently returns a plausible-looking but stale, bogus result
        instead of failing. This is a deliberate scope boundary, not an
        oversight: the underlying constraint is that a single running
        oracle process serves one fixed canonical snapshot
        (emerald_core.py's new_session() docstring), so this capability is
        exposed only in-process (see report-preview-smoke-test.py), not
        through the shared HTTP contract every other Battle Lab caller
        uses.

        `seed`, if given, is written to gRngValue immediately after
        new_session() — long before the dialogue's RNG-consuming
        generation settles (frame 1802 of the ~2916-frame route below) —
        which is what makes this safe: it changes an input the whole
        generate-then-describe sequence reads at its start, rather than
        trying to intercept its result. A live probe confirmed that this
        codebase's frame-level control (advance(), the only thing this
        method uses) cannot land between generation and the report-text
        computation — but not because no gap exists: instruction-level
        stepping (not used by this method or anywhere else in this
        codebase's advance()-based API) shows a real, thousands-of-
        instructions gap inside that one video frame, and a poke held
        continuously at that finer granularity does change the computed
        report. See BOOTSTRAP.md's "Why a new anchor and not a mid-script
        poke" section for the full account. A caller cannot choose a
        specific opponent through this method as shipped, only a seed;
        the resulting opponent, and thus the report, is real and
        ROM-computed, but not directly selectable.
        """
        if self.oracle.canonical_screen_sha256 != PRE_REPORT_ANCHOR_SHA256:
            raise RuntimeError(
                "preview_report() requires an oracle booted from "
                "bootstrap/factory-pre-report.json; this oracle's canonical "
                f"screen sha256 is {self.oracle.canonical_screen_sha256!r}, "
                f"not {PRE_REPORT_ANCHOR_SHA256!r}"
            )
        if capture_all_frames and capture_frames:
            raise ValueError(
                "capture_frames and capture_all_frames are mutually exclusive"
            )

        self.oracle.new_session()
        if seed is not None:
            self.oracle.write_u32(self.oracle.symbols["gRngValue"], seed)

        wanted = set(capture_frames or ())
        captures: list[dict] = []

        def capture() -> None:
            if not capture_all_frames and self.oracle.frame not in wanted:
                return
            rgb = self.oracle.screen_rgb()
            captures.append({
                "frame": self.oracle.frame,
                "sha256": hashlib.sha256(rgb).hexdigest(),
                "pngBase64": b64encode(self.oracle.screen_png()).decode("ascii"),
            })

        capture()
        for frames, buttons in ATTENDANT_DIALOGUE_ROUTE:
            self._advance(frames, buttons, capture)

        temp_party = self.oracle.symbols["gFrontierTempParty"]
        return {
            "schemaVersion": SCHEMA_VERSION,
            "seed": seed,
            "captures": captures,
            "report": {
                "opponentSetIds": [
                    self.oracle.read_u16(temp_party + i * 2) for i in range(3)
                ],
                "typeVar": self.oracle.read_u16(self.oracle.symbols["gSpecialVar_0x8005"]),
                "styleVar": self.oracle.read_u16(self.oracle.symbols["gSpecialVar_0x8006"]),
            },
        }

    def snapshot(self) -> dict:
        return {
            "rngValue": self.oracle.read_u32(self.oracle.symbols["gRngValue"]),
            "battleOutcome": self.oracle.read_u8(self.oracle.symbols["gBattleOutcome"]),
            "weather": self.oracle.read_u16(self.oracle.symbols["gBattleWeather"]),
            "weatherTurns": self.oracle.read_u8(
                self.oracle.symbols["gWishFutureKnock"] + 0x28
            ),
            "sideStatuses": [
                self.oracle.read_u16(self.oracle.symbols["gSideStatuses"] + side * 2)
                for side in range(2)
            ],
            "sideConditions": {
                "player": self._side_condition(0),
                "opponent": self._side_condition(1),
            },
            "battlers": {
                "player": self._battle_mon(0),
                "opponent": self._battle_mon(1),
            },
            "parties": {
                "player": self._party("player"),
                "opponent": self._party("opponent"),
            },
            "engine": {
                "mainCallback2": self.oracle.read_u32(self.oracle.symbols["gMain"] + 4),
                "activeBattler": self.oracle.read_u8(self.oracle.symbols["gActiveBattler"]),
                "controllerExecFlags": self.oracle.read_u32(
                    self.oracle.symbols["gBattleControllerExecFlags"]
                ),
                "playerControllerCommand": self.oracle.read_u8(
                    self.oracle.symbols["gBattleBufferA"]
                ),
                "opponentControllerCommand": self.oracle.read_u8(
                    self.oracle.symbols["gBattleBufferA"] + 0x200
                ),
                "currentMove": self.oracle.read_u16(self.oracle.symbols["gCurrentMove"]),
            },
        }

    def _battle_mon(self, battler: int) -> dict:
        base = self.oracle.symbols["gBattleMons"] + battler * BATTLE_MON_SIZE
        pp_bonuses = self.oracle.read_u8(base + 0x3B)
        status1 = self.oracle.read_u32(base + 0x4C)
        status2 = self.oracle.read_u32(base + 0x50)
        status3 = self.oracle.read_u32(self.oracle.symbols["gStatuses3"] + battler * 4)
        leech_seeded = bool(status3 & (1 << 2))
        return {
            "partyIndex": self.oracle.read_u8(
                self.oracle.symbols["gBattlerPartyIndexes"] + battler * 2
            ),
            "species": self.oracle.read_u16(base),
            "stats": {
                "attack": self.oracle.read_u16(base + 2),
                "defense": self.oracle.read_u16(base + 4),
                "speed": self.oracle.read_u16(base + 6),
                "spAttack": self.oracle.read_u16(base + 8),
                "spDefense": self.oracle.read_u16(base + 10),
            },
            "moves": [self.oracle.read_u16(base + 0x0C + index * 2) for index in range(4)],
            "statStages": [
                self.oracle.read_u8(base + 0x18 + index)
                for index in range(NUM_BATTLE_STATS)
            ],
            "ability": self.oracle.read_u8(base + 0x20),
            "types": [self.oracle.read_u8(base + 0x21), self.oracle.read_u8(base + 0x22)],
            "pp": [self.oracle.read_u8(base + 0x24 + index) for index in range(4)],
            "ppUps": [
                (pp_bonuses >> (index * 2)) & 0x3
                for index in range(4)
            ],
            "hp": self.oracle.read_u16(base + 0x28),
            "level": self.oracle.read_u8(base + 0x2A),
            "friendship": self.oracle.read_u8(base + 0x2B),
            "maxHp": self.oracle.read_u16(base + 0x2C),
            "item": self.oracle.read_u16(base + 0x2E),
            "status1": status1,
            "status": self._permanent_status(status1),
            "status2": status2,
            "status3": status3,
            "volatile": {
                "confusionTurns": status2 & 0x7,
                "leechSeededBy": (
                    ("player" if (status3 & 0x3) == 0 else "opponent")
                    if leech_seeded
                    else None
                ),
                "perishSongTurns": (
                    self.oracle.read_u8(
                        self.oracle.symbols["gDisableStructs"] + battler * 0x1C + 0x0F
                    )
                    & 0xF
                ),
            },
        }

    @staticmethod
    def _permanent_status(status1: int) -> dict:
        if status1 & 0x7:
            return {"kind": "sleep", "turns": status1 & 0x7}
        if status1 & (1 << 7):
            return {"kind": "toxic", "counter": (status1 >> 8) & 0xF}
        if status1 & (1 << 3):
            return {"kind": "poison"}
        if status1 & (1 << 4):
            return {"kind": "burn"}
        if status1 & (1 << 5):
            return {"kind": "freeze"}
        if status1 & (1 << 6):
            return {"kind": "paralysis"}
        return {"kind": "none"}

    def _side_condition(self, side: int) -> dict:
        timers = self.oracle.symbols["gSideTimers"] + side * SIDE_TIMER_SIZE
        return {
            "reflectTurns": self.oracle.read_u8(timers),
            "lightScreenTurns": self.oracle.read_u8(timers + 2),
            "mistTurns": self.oracle.read_u8(timers + 4),
            "safeguardTurns": self.oracle.read_u8(timers + 6),
            "spikes": self.oracle.read_u8(timers + 10),
        }

    def _party(self, side: str) -> list[dict]:
        symbol = "gPlayerParty" if side == "player" else "gEnemyParty"
        base = self.oracle.symbols[symbol]
        return [
            self._party_mon(base + index * POKEMON_SIZE)
            for index in range(3)
        ]

    def _party_mon(self, base: int) -> dict:
        personality, ot_id, substructs, checksum_valid = self._decrypt_box(base)
        core, moves_data, ev_data, iv_data = substructs
        species, item, experience, pp_bonuses, friendship, _ = struct.unpack(
            "<HHIBBH", core
        )
        moves = list(struct.unpack("<4H", moves_data[:8]))
        pp = list(moves_data[8:12])
        evs = dict(zip(STAT_NAMES, ev_data[:6]))
        iv_word = struct.unpack("<I", iv_data[4:8])[0]
        ivs = {
            name: (iv_word >> (index * 5)) & 0x1F
            for index, name in enumerate(STAT_NAMES)
        }
        ability_slot = (iv_word >> 31) & 1
        species_info = (
            self._species_info(species)
            if 0 < species < SPECIES_COUNT
            else bytes(SPECIES_INFO_SIZE)
        )
        ratio = species_info[0x10]
        return {
            "species": species,
            "level": self.oracle.read_u8(base + 84),
            "experience": experience,
            "nature": personality % 25,
            "ivs": ivs,
            "evs": evs,
            "moves": moves,
            "pp": pp,
            "ppUps": [
                (pp_bonuses >> (index * 2)) & 0x3
                for index in range(4)
            ],
            "item": item,
            "abilitySlot": ability_slot,
            "ability": species_info[0x16 + ability_slot],
            "types": list(species_info[6:8]),
            "friendship": friendship,
            "personality": personality,
            "gender": self._gender(personality, ratio),
            "shiny": self._is_shiny(personality, ot_id),
            "otId": ot_id,
            "hp": self.oracle.read_u16(base + 86),
            "maxHp": self.oracle.read_u16(base + 88),
            "stats": {
                "attack": self.oracle.read_u16(base + 90),
                "defense": self.oracle.read_u16(base + 92),
                "speed": self.oracle.read_u16(base + 94),
                "spAttack": self.oracle.read_u16(base + 96),
                "spDefense": self.oracle.read_u16(base + 98),
            },
            "status1": self.oracle.read_u32(base + 80),
            "status": self._permanent_status(self.oracle.read_u32(base + 80)),
            "checksumValid": checksum_valid,
        }

    def _validate_custom_parties(self, overrides: dict) -> None:
        parties = overrides.get("parties")
        if parties is None:
            return
        _validate_parties(parties)
        for side in ("player", "opponent"):
            for index, value in enumerate(parties[side]):
                path = f"overrides.parties.{side}[{index}]"
                species_info = self._species_info(value["species"])
                ability_slot = value.get("abilitySlot", 0)
                if species_info[0x16 + ability_slot] == 0:
                    raise ValueError(
                        f"{path}.abilitySlot {ability_slot} is not available "
                        f"for species {value['species']}"
                    )
                ratio = species_info[0x10]
                gender = value.get("gender")
                if gender is not None and not self._gender_is_possible(gender, ratio):
                    raise ValueError(
                        f"{path}.gender {gender!r} is not available "
                        f"for species {value['species']}"
                    )
                for move_index, (move, pp_ups) in enumerate(
                    zip(value["moves"], value.get("ppUps", [0, 0, 0, 0]))
                ):
                    base_pp = self._move_base_pp(move)
                    if pp_ups and base_pp <= 4:
                        raise ValueError(
                            f"{path}.ppUps[{move_index}] must be 0 for move {move}; "
                            f"Emerald does not apply PP Ups to moves with {base_pp} PP"
                        )
                personality = value.get("personality")
                nature = value.get("nature")
                if (
                    personality is not None
                    and nature is not None
                    and personality % 25 != nature
                ):
                    raise ValueError(
                        f"{path}.personality has nature {personality % 25}, "
                        f"not requested nature {nature}"
                    )
                if (
                    personality is not None
                    and gender is not None
                    and self._gender(personality, ratio) != gender
                ):
                    raise ValueError(
                        f"{path}.personality is not requested gender {gender!r}"
                    )

    def _apply_custom_parties(
        self,
        parties: object,
        seed: int,
        default_level: int,
    ) -> None:
        _validate_parties(parties)
        assert isinstance(parties, dict)
        for side_index, side in enumerate(("player", "opponent")):
            symbol = "gPlayerParty" if side == "player" else "gEnemyParty"
            party_base = self.oracle.symbols[symbol]
            for index, value in enumerate(parties[side]):
                self._write_party_mon(
                    party_base + index * POKEMON_SIZE,
                    value,
                    seed ^ (0x9E3779B9 * (side_index * 3 + index + 1)),
                    default_level,
                    f"overrides.parties.{side}[{index}]",
                )

    def _write_party_mon(
        self,
        base: int,
        value: dict,
        personality_seed: int,
        default_level: int,
        path: str,
    ) -> None:
        species = value["species"]
        species_info = self._species_info(species)
        level = value.get("level", default_level)
        ivs = _stat_values(
            value.get("ivs", {name: 31 for name in STAT_NAMES}),
            f"{path}.ivs",
            31,
        )
        evs = _stat_values(
            value.get("evs", {name: 0 for name in STAT_NAMES}),
            f"{path}.evs",
            255,
        )
        if sum(evs.values()) > 510:
            raise ValueError(f"{path}.evs total must not exceed 510")
        moves = value["moves"]
        pp_ups = value.get("ppUps", [0, 0, 0, 0])
        item = value.get("item", 0)
        ability_slot = value.get("abilitySlot", 0)
        friendship = value.get("friendship", species_info[0x12])
        old_header = bytearray(self._read_bytes(base, 32))
        ot_id = struct.unpack("<I", old_header[4:8])[0]
        nature = value.get("nature")
        if nature is None:
            nature = (
                value["personality"] % 25
                if "personality" in value
                else 0
            )
        personality = self._select_personality(
            personality_seed & 0xFFFFFFFF,
            ot_id,
            nature,
            species_info[0x10],
            value.get("gender"),
            value.get("shiny", False),
            value.get("personality"),
            path,
        )

        growth_rate = species_info[0x13]
        experience = self.oracle.read_u32(
            self.oracle.symbols["gExperienceTables"]
            + growth_rate * EXPERIENCE_TABLE_STRIDE
            + level * 4
        )
        pp_bonuses = sum(amount << (index * 2) for index, amount in enumerate(pp_ups))
        pp = [
            self._move_base_pp(move)
            + (self._move_base_pp(move) * 20 * pp_ups[index]) // 100
            for index, move in enumerate(moves)
        ]
        logical = (
            struct.pack(
                "<HHIBBH",
                species,
                item,
                experience,
                pp_bonuses,
                friendship,
                0,
            ),
            struct.pack("<4H4B", *moves, *pp),
            bytes([evs[name] for name in STAT_NAMES]) + bytes(6),
            self._build_origin_and_ivs(level, ivs, ability_slot),
        )
        checksum = sum(
            struct.unpack("<24H", b"".join(logical))
        ) & 0xFFFF
        physical_parts: list[bytes | None] = [None, None, None, None]
        for logical_id, physical_index in enumerate(
            SUBSTRUCT_POSITIONS[personality % 24]
        ):
            physical_parts[physical_index] = logical[logical_id]
        physical = b"".join(physical_parts)  # type: ignore[arg-type]
        key = personality ^ ot_id
        encrypted = b"".join(
            struct.pack(
                "<I",
                struct.unpack("<I", physical[offset:offset + 4])[0] ^ key,
            )
            for offset in range(0, 48, 4)
        )

        header = old_header
        header[0:4] = struct.pack("<I", personality)
        header[4:8] = struct.pack("<I", ot_id)
        header[8:18] = self._read_bytes(
            self.oracle.symbols["gSpeciesNames"] + species * SPECIES_NAME_SIZE,
            10,
        )
        if header[18] == 0:
            header[18] = 2
        header[19] = 0x02
        header[27] = 0
        header[28:30] = struct.pack("<H", checksum)
        header[30:32] = b"\0\0"

        stats = self._calculate_stats(species, level, nature, ivs, evs)
        record = bytearray(POKEMON_SIZE)
        record[:32] = header
        record[32:80] = encrypted
        record[80:84] = b"\0\0\0\0"
        record[84] = level
        record[85] = 0xFF
        struct.pack_into(
            "<7H",
            record,
            86,
            stats["maxHp"],
            stats["maxHp"],
            stats["attack"],
            stats["defense"],
            stats["speed"],
            stats["spAttack"],
            stats["spDefense"],
        )
        self._write_bytes(base, record)

    @staticmethod
    def _build_origin_and_ivs(
        level: int,
        ivs: dict[str, int],
        ability_slot: int,
    ) -> bytes:
        # Emerald, met at the requested level, ordinary Poké Ball, male OT.
        origin = level | (3 << 7) | (4 << 11)
        iv_word = sum(
            ivs[name] << (index * 5)
            for index, name in enumerate(STAT_NAMES)
        )
        iv_word |= ability_slot << 31
        return b"\0\0" + struct.pack("<H", origin) + struct.pack("<I", iv_word) + bytes(4)

    def _calculate_stats(
        self,
        species: int,
        level: int,
        nature: int,
        ivs: dict[str, int],
        evs: dict[str, int],
    ) -> dict[str, int]:
        info = self._species_info(species)
        max_hp = (
            1
            if species == SPECIES_SHEDINJA
            else (
                (2 * info[0] + ivs["hp"] + evs["hp"] // 4) * level // 100
                + level
                + 10
            )
        )
        result = {"maxHp": max_hp}
        for index, name in enumerate(STAT_NAMES[1:], start=1):
            stat = (
                (2 * info[index] + ivs[name] + evs[name] // 4) * level // 100
                + 5
            )
            modifier = self.oracle.read_u8(
                self.oracle.symbols["gNatureStatTable"] + nature * 5 + index - 1
            )
            if modifier == 1:
                stat = stat * 110 // 100
            elif modifier == 0xFF:
                stat = stat * 90 // 100
            result[name] = stat
        return result

    def _select_personality(
        self,
        seed: int,
        ot_id: int,
        nature: int,
        gender_ratio: int,
        gender: str | None,
        shiny: bool,
        exact: int | None,
        path: str,
    ) -> int:
        def matches(personality: int) -> bool:
            return (
                personality % 25 == nature
                and (gender is None or self._gender(personality, gender_ratio) == gender)
                and self._is_shiny(personality, ot_id) == shiny
            )

        if exact is not None:
            if not matches(exact):
                raise ValueError(
                    f"{path}.personality does not match the requested "
                    "nature, gender, and shiny properties"
                )
            return exact
        if shiny:
            trainer_xor = (ot_id & 0xFFFF) ^ (ot_id >> 16)
            start = seed & 0xFFFF
            for offset in range(0x10000):
                low = (start + offset) & 0xFFFF
                for shiny_value in range(8):
                    high = trainer_xor ^ low ^ shiny_value
                    personality = low | (high << 16)
                    if matches(personality):
                        return personality
        else:
            for offset in range(0x10000):
                personality = (seed + offset) & 0xFFFFFFFF
                if matches(personality):
                    return personality
        raise ValueError(
            f"{path} has no personality matching the requested properties"
        )

    @staticmethod
    def _is_shiny(personality: int, ot_id: int) -> bool:
        return (
            (personality & 0xFFFF)
            ^ (personality >> 16)
            ^ (ot_id & 0xFFFF)
            ^ (ot_id >> 16)
        ) < 8

    @staticmethod
    def _gender(personality: int, ratio: int) -> str:
        if ratio == 0xFF:
            return "genderless"
        return "female" if (personality & 0xFF) < ratio else "male"

    @staticmethod
    def _gender_is_possible(gender: str, ratio: int) -> bool:
        if ratio == 0xFF:
            return gender == "genderless"
        if gender == "genderless":
            return False
        if ratio == 0:
            return gender == "male"
        if ratio == 0xFE:
            return gender == "female"
        return True

    def _species_info(self, species: int) -> bytes:
        return self._read_bytes(
            self.oracle.symbols["gSpeciesInfo"] + species * SPECIES_INFO_SIZE,
            SPECIES_INFO_SIZE,
        )

    def _move_base_pp(self, move: int) -> int:
        return self.oracle.read_u8(
            self.oracle.symbols["gBattleMoves"] + move * BATTLE_MOVE_SIZE + 4
        )

    def _decrypt_box(
        self,
        base: int,
    ) -> tuple[int, int, tuple[bytes, bytes, bytes, bytes], bool]:
        personality = self.oracle.read_u32(base)
        ot_id = self.oracle.read_u32(base + 4)
        key = personality ^ ot_id
        encrypted = self._read_bytes(base + 32, 48)
        physical = b"".join(
            struct.pack(
                "<I",
                struct.unpack("<I", encrypted[offset:offset + 4])[0] ^ key,
            )
            for offset in range(0, 48, 4)
        )
        logical: list[bytes | None] = [None, None, None, None]
        for logical_id, physical_index in enumerate(
            SUBSTRUCT_POSITIONS[personality % 24]
        ):
            logical[logical_id] = physical[
                physical_index * 12:(physical_index + 1) * 12
            ]
        substructs = tuple(logical)  # type: ignore[arg-type]
        checksum = sum(
            struct.unpack("<24H", b"".join(substructs))
        ) & 0xFFFF
        return (
            personality,
            ot_id,
            substructs,  # type: ignore[return-value]
            checksum == self.oracle.read_u16(base + 28),
        )

    def _read_bytes(self, base: int, length: int) -> bytes:
        return bytes(self.oracle.read_u8(base + offset) for offset in range(length))

    def _write_bytes(self, base: int, value: bytes | bytearray) -> None:
        for offset, byte in enumerate(value):
            self.oracle.write_u8(base + offset, byte)

    def _parties_ready_for_staging(self) -> bool:
        if (
            self.oracle.read_u32(self.oracle.symbols["gMain"] + 4)
            != (self.oracle.symbols["CB2_OverworldBasic"] | 1)
        ):
            return False
        if self.oracle.read_u8(self.oracle.symbols["gBattlersCount"]) != 0:
            return False
        battle_mons = self.oracle.symbols["gBattleMons"]
        if (
            self.oracle.read_u16(battle_mons)
            or self.oracle.read_u16(battle_mons + BATTLE_MON_SIZE)
        ):
            return False
        for symbol in ("gPlayerParty", "gEnemyParty"):
            base = self.oracle.symbols[symbol]
            for index in range(3):
                mon = base + index * POKEMON_SIZE
                if (
                    self.oracle.read_u8(mon + 84) == 0
                    or self.oracle.read_u16(mon + 86) == 0
                ):
                    return False
        return True

    def _validate_and_plan(
        self,
        request: dict,
        player: list[FacilityMon],
        opponent: list[FacilityMon],
    ) -> RentalPlan:
        challenge = min(request["challengeNum"], 7)
        if request["mode"] == "factoryBrain":
            # Only the player half stages from set IDs. Noland's party is
            # generated live by FillFactoryBrainParty once the battle starts,
            # after the draft, excluding the player's rentals itself — so the
            # empty opponent list constrains nothing here.
            for mon in player:
                if mon.species == SPECIES_UNOWN:
                    raise ValueError(f"player set {mon.set_id} is Unown, which Factory forbids")
            self._validate_unique_team("player", player)
            return self._plan_rentals(
                challenge,
                self._rental_rank(request["rentalSwapCount"]),
                player,
                opponent,
            )
        if request["mode"] == "factoryLegal":
            rental_rank = self._rental_rank(request["rentalSwapCount"])
            for mon in player:
                if mon.species == SPECIES_UNOWN:
                    raise ValueError(f"player set {mon.set_id} is Unown, which Factory forbids")
            low, high = LEVEL_50_SET_RANGES[challenge]
            for mon in opponent:
                if not low <= mon.set_id <= high:
                    raise ValueError(
                        f"opponent set {mon.set_id} is outside Level-50 challenge "
                        f"{request['challengeNum']} range {low}..{high}"
                    )
                if mon.species == SPECIES_UNOWN:
                    raise ValueError(f"opponent set {mon.set_id} is Unown, which Factory forbids")
            trainer_ranges = FINAL_TRAINER_RANGES if request["battleNum"] == 6 else REGULAR_TRAINER_RANGES
            trainer_low, trainer_high = trainer_ranges[challenge]
            if not trainer_low <= request["trainerId"] <= trainer_high:
                raise ValueError(
                    f"trainerId {request['trainerId']} is outside challenge "
                    f"{request['challengeNum']} battle {request['battleNum']} range "
                    f"{trainer_low}..{trainer_high}"
                )
            self._validate_unique_team("player", player)
            self._validate_unique_team("opponent", opponent)
            player_species = {mon.species for mon in player}
            repeated = player_species & {mon.species for mon in opponent}
            if repeated:
                raise ValueError(
                    f"opponent species overlap the rental pool: {sorted(repeated)}"
                )
            return self._plan_rentals(challenge, rental_rank, player, opponent)

        # mechanicLab still needs a legal source route. It may replace the
        # complete parties before battle initialization or use the legacy
        # active-battler loadout seam afterward.
        base_request = request | {"mode": "factoryLegal"}
        return self._validate_and_plan(base_request, player, opponent)

    @staticmethod
    def _validate_unique_team(label: str, mons: list[FacilityMon]) -> None:
        species = [mon.species for mon in mons]
        if len(set(species)) != len(species):
            raise ValueError(f"{label} party repeats a species")
        items = [mon.item for mon in mons if mon.item != 0]
        if len(set(items)) != len(items):
            raise ValueError(f"{label} party repeats a held item")

    def _plan_rentals(
        self,
        challenge: int,
        rental_rank: int,
        player: list[FacilityMon],
        opponent: list[FacilityMon],
    ) -> RentalPlan:
        selected_positions = next(
            (
                positions
                for positions in permutations(range(6), 3)
                if all(
                    self._set_in_position(mon.set_id, challenge, rental_rank, position)
                    for mon, position in zip(player, positions)
                )
            ),
            None,
        )
        if selected_positions is None:
            raise ValueError(
                "player sets cannot be assigned to the source rental ranges for "
                f"challenge {challenge} and rental rank {rental_rank}"
            )

        candidates: list[FacilityMon | None] = [None] * 6
        for mon, position in zip(player, selected_positions):
            candidates[position] = mon
        used_species = {mon.species for mon in player} | {mon.species for mon in opponent}
        rental_items = {mon.item for mon in player if mon.item}

        def fill(position: int) -> bool:
            if position == 6:
                return True
            if candidates[position] is not None:
                return fill(position + 1)
            low, high = self._rental_position_range(challenge, rental_rank, position)
            for set_id in range(low, high + 1):
                mon = self.catalog.mon(set_id)
                if mon.species == SPECIES_UNOWN or mon.species in used_species:
                    continue
                if mon.item and mon.item in rental_items:
                    continue
                candidates[position] = mon
                used_species.add(mon.species)
                if mon.item:
                    rental_items.add(mon.item)
                if fill(position + 1):
                    return True
                candidates[position] = None
                used_species.remove(mon.species)
                if mon.item:
                    rental_items.remove(mon.item)
            return False

        if not fill(0):
            raise ValueError("could not complete a legal six-mon rental pool")
        return RentalPlan(
            candidates=tuple(candidates),  # type: ignore[arg-type]
            selected_positions=selected_positions,
        )

    @staticmethod
    def _rental_rank(rental_swap_count: int) -> int:
        # GetNumPastRentalsRank loads the u16 save field into a u8 local.
        # Preserve that stock-Emerald truncation for counts above 255.
        rents = rental_swap_count & 0xFF
        return sum(
            rents >= threshold
            for threshold in RENTAL_RANK_THRESHOLDS
        )

    @staticmethod
    def _rental_position_range(
        challenge: int,
        rental_rank: int,
        position: int,
    ) -> tuple[int, int]:
        if position < rental_rank and challenge < 7:
            return LEVEL_50_SET_RANGES[challenge + 1]
        return LEVEL_50_SET_RANGES[challenge]

    @classmethod
    def _set_in_position(
        cls,
        set_id: int,
        challenge: int,
        rental_rank: int,
        position: int,
    ) -> bool:
        low, high = cls._rental_position_range(challenge, rental_rank, position)
        return low <= set_id <= high

    def _apply_overrides(self, overrides: dict) -> None:
        _validate_loadout_overrides(overrides)
        battlers = overrides.get("battlers", {})
        for name, battler in (("player", 0), ("opponent", 1)):
            if name in battlers:
                self._apply_battler(battler, battlers[name], f"overrides.battlers.{name}")

    def _validate_pp_ups(self, overrides: dict) -> None:
        moves_table = self.oracle.symbols["gBattleMoves"]
        for name, value in overrides.get("battlers", {}).items():
            if "ppUps" not in value:
                continue
            path = f"overrides.battlers.{name}"
            for index, (move, pp_ups) in enumerate(
                zip(value["moves"], value["ppUps"])
            ):
                base_pp = self.oracle.read_u8(
                    moves_table + move * BATTLE_MOVE_SIZE + 4
                )
                if pp_ups and base_pp <= 4:
                    raise ValueError(
                        f"{path}.ppUps[{index}] must be 0 for move {move}; "
                        f"Emerald does not apply PP Ups to moves with {base_pp} PP"
                    )

    def _apply_battler(self, battler: int, value: object, path: str) -> None:
        if not isinstance(value, dict):
            raise ValueError(f"{path} must be an object")
        allowed = {
            "moves", "ppUps", "item", "ability", "types", "friendship",
        }
        unknown = set(value) - allowed
        if unknown:
            raise ValueError(f"{path} has unknown fields: {', '.join(sorted(unknown))}")
        base = self.oracle.symbols["gBattleMons"] + battler * BATTLE_MON_SIZE
        if "moves" in value:
            moves = value["moves"]
            if not isinstance(moves, list) or len(moves) != 4:
                raise ValueError(f"{path}.moves must contain four move IDs")
            for index, move in enumerate(moves):
                self.oracle.write_u16(
                    base + 0x0C + index * 2,
                    _integer(move, f"{path}.moves[{index}]", 0, 354),
                )
        if "ppUps" in value:
            moves = value["moves"]
            pp_bonuses = 0
            for index, pp_ups in enumerate(value["ppUps"]):
                base_pp = self.oracle.read_u8(
                    self.oracle.symbols["gBattleMoves"]
                    + moves[index] * BATTLE_MOVE_SIZE
                    + 4
                )
                amount = base_pp + (base_pp * 20 * pp_ups) // 100
                self.oracle.write_u8(
                    base + 0x24 + index,
                    amount,
                )
                pp_bonuses |= pp_ups << (index * 2)
            self.oracle.write_u8(base + 0x3B, pp_bonuses)
        if "item" in value:
            self.oracle.write_u16(
                base + 0x2E,
                _integer(value["item"], f"{path}.item", 0, ITEMS_COUNT - 1),
            )
        if "ability" in value:
            self.oracle.write_u8(
                base + 0x20,
                _integer(value["ability"], f"{path}.ability", 0, ABILITIES_COUNT - 1),
            )
        if "types" in value:
            types = value["types"]
            if not isinstance(types, list) or len(types) != 2:
                raise ValueError(f"{path}.types must contain two type IDs")
            for index, type_id in enumerate(types):
                self.oracle.write_u8(
                    base + 0x21 + index,
                    _integer(type_id, f"{path}.types[{index}]", 0, 17),
                )
        if "friendship" in value:
            self.oracle.write_u8(
                base + 0x2B,
                _integer(value["friendship"], f"{path}.friendship", 0, 255),
            )

    def _before_first_action_choices(self) -> bool:
        communications = self.oracle.symbols["gBattleCommunication"]
        battle_mons = self.oracle.symbols["gBattleMons"]
        return (
            self.oracle.read_u8(self.oracle.symbols["gBattlersCount"]) == 2
            and self.oracle.read_u16(battle_mons) != 0
            and self.oracle.read_u16(battle_mons + BATTLE_MON_SIZE) != 0
            and self.oracle.read_u32(
                self.oracle.symbols["gBattleControllerExecFlags"]
            ) == 0
            and self.oracle.read_u8(communications) == STATE_BEFORE_ACTION_CHOSEN
            and self.oracle.read_u8(communications + 1)
            == STATE_BEFORE_ACTION_CHOSEN
        )

    def _advance(
        self,
        frames: int,
        buttons: tuple[str, ...],
        after_frame: Callable[[], None] | None = None,
    ) -> None:
        for _ in range(frames):
            self.oracle.advance(list(buttons))
            if after_frame is not None:
                after_frame()

    def _finish_intro_to_action_menu(
        self,
        after_frame: Callable[[], None] | None = None,
        max_acks: int = ACTION_MENU_MAX_ACKS,
    ) -> None:
        """Acknowledge variable entrance hooks until the player can act.

        Species and abilities can add one or more messages after the common
        Factory intro route. The public frame-zero contract is semantic, so
        never expose one of those variable messages as though it were the
        action menu.

        Never tap A once the player's controller holds the choose-action
        command. ready() stays false there while the opponent's controller
        still runs (its AI can take several frames, and an emulated frame
        can end inside them with the menu already taking input); a tap
        after such a check picked FIGHT, the next one the first move, and
        the staging played turn 1. A tap that starts before the command is
        issued cannot reach the menu: only the first main-loop pass that
        samples the keys sees A as new, and HandleInputChooseAction first
        runs two passes after the command.
        """
        player_buffer = self.oracle.symbols["gBattleBufferA"]
        exec_flags = self.oracle.symbols["gBattleControllerExecFlags"]

        def menu_issued() -> bool:
            return (
                self.oracle.read_u8(player_buffer) == CONTROLLER_CHOOSE_ACTION
                and self.oracle.read_u32(exec_flags) & PLAYER_CONTROLLER_FLAG != 0
            )

        def ready() -> bool:
            return (
                self.oracle.read_u8(player_buffer) == CONTROLLER_CHOOSE_ACTION
                and self.oracle.read_u32(exec_flags) == PLAYER_CONTROLLER_FLAG
            )

        if ready():
            return
        for _ in range(max_acks):
            self._advance(120, (), after_frame)
            if ready():
                return
            # Same 2-frame slot either way, so the check frames never move.
            self._advance(2, () if menu_issued() else ("A",), after_frame)
            self._advance(12, (), after_frame)
            if ready():
                return
        raise RuntimeError("battle lab route did not reach the player action menu")

    # -- Frontier-Brain walk-up staging helpers -----------------------------

    def _locate_global_script_context(self, parked_script_ptr: int) -> int:
        """Find sGlobalScriptContext by structural signature.

        The context is file-static (absent from the linker map), so scan
        IWRAM for the struct whose cmdTable/cmdTableEnd fields point at the
        exported gScriptCmdTable pair AND whose scriptPtr holds the known
        parked resume label. The cmdTable pair alone also matches
        sImmediateScriptContext; the parked pointer disambiguates.
        """
        symbols = self.oracle.symbols
        cmd_table = symbols["gScriptCmdTable"]
        cmd_table_end = symbols["gScriptCmdTableEnd"]
        low, high = IWRAM_RANGE
        matches = []
        for addr in range(low, high - SCRIPT_CTX_CMD_TABLE_END - 4, 4):
            if (
                self.oracle.read_u32(addr + SCRIPT_CTX_CMD_TABLE) == cmd_table
                and self.oracle.read_u32(addr + SCRIPT_CTX_CMD_TABLE_END)
                == cmd_table_end
                and self.oracle.read_u32(addr + SCRIPT_CTX_SCRIPT_PTR)
                == parked_script_ptr
            ):
                matches.append(addr)
        if len(matches) != 1:
            raise RuntimeError(
                "could not locate the parked global script context "
                f"({len(matches)} structural matches); the canonical "
                "checkpoint's field-script state changed"
            )
        return matches[0]

    def _redirect_parked_script_to_post_win(self) -> None:
        symbols = self.oracle.symbols
        parked = symbols[WALKUP_PARKED_LABEL]
        target = symbols[WALKUP_REDIRECT_LABEL]
        ctx = self._script_context_addr
        if (
            ctx is None
            or self.oracle.read_u32(ctx + SCRIPT_CTX_SCRIPT_PTR) != parked
        ):
            ctx = self._locate_global_script_context(parked)
            self._script_context_addr = ctx
        if self.oracle.read_u8(ctx + SCRIPT_CTX_MODE) != SCRIPT_MODE_BYTECODE:
            raise RuntimeError(
                "the checkpoint's parked field script is not waiting at the "
                "draft waitstate; refusing to redirect it"
            )
        self.oracle.write_u32(ctx + SCRIPT_CTX_SCRIPT_PTR, target)

    def _set_factory_symbol_flag(self, flag: int) -> None:
        save1 = self.oracle.read_u32(self.oracle.symbols["gSaveBlock1Ptr"])
        addr = save1 + SB1_FLAGS + (flag >> 3)
        self.oracle.write_u8(addr, self.oracle.read_u8(addr) | (1 << (flag & 7)))

    def _factory_symbol_count(self) -> int:
        save1 = self.oracle.read_u32(self.oracle.symbols["gSaveBlock1Ptr"])
        count = 0
        for flag in (FLAG_SYS_FACTORY_SILVER, FLAG_SYS_FACTORY_GOLD):
            byte = self.oracle.read_u8(save1 + SB1_FLAGS + (flag >> 3))
            count += (byte >> (flag & 7)) & 1
        return count

    def _walkup_ask_ready_state(self) -> str | None:
        """Return the open ask-ready menu variant, or None if not waiting.

        A parked pointer inside the AskReadyForHead script region with the
        context still in BYTECODE mode can only be the multichoice's
        ScriptContext_Stop: the region's other between-frame waits
        (waitmessage) park in NATIVE mode, and a running script never rests
        between frames mid-region otherwise.
        """
        ctx = self._script_context_addr
        if ctx is None:
            return None
        if self.oracle.read_u8(ctx + SCRIPT_CTX_MODE) != SCRIPT_MODE_BYTECODE:
            return None
        pointer = self.oracle.read_u32(ctx + SCRIPT_CTX_SCRIPT_PTR)
        symbols = self.oracle.symbols
        if symbols[WALKUP_ASK_READY_LABEL] <= pointer < symbols[
            WALKUP_ASK_READY_NO_RECORD_LABEL
        ]:
            return "record"
        if symbols[WALKUP_ASK_READY_NO_RECORD_LABEL] <= pointer < symbols[
            WALKUP_ASK_SWAP_LABEL
        ]:
            return "noRecord"
        return None

    def _finish_walkup_to_ask_ready(
        self,
        after_frame: Callable[[], None] | None = None,
    ) -> None:
        """Acknowledge the re-entry scene until the ask-ready menu opens.

        The same blind 120/2/12 ack cadence every committed fixture's route
        already uses (a state-guarded "don't tap while printing" variant was
        tried and deadlocks: the multi-page boss message parks the printer
        on waitmessage's native wait at each page prompt, waiting for the
        very button the guard withholds). The one guard that matters is the
        stop condition: the loop checks for the open multichoice before
        every tap, so no A can reach the menu and select GO ON before the
        caller's trace gets to answer it.
        """
        if self._walkup_ask_ready_state():
            return
        for _ in range(WALKUP_MAX_ACKS):
            self._advance(120, (), after_frame)
            if self._walkup_ask_ready_state():
                return
            self._advance(2, ("A",), after_frame)
            self._advance(12, (), after_frame)
            if self._walkup_ask_ready_state():
                return
        raise RuntimeError(
            "battle lab walk-up route did not reach the ask-ready menu"
        )
