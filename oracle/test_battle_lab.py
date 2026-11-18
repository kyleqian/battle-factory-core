#!/usr/bin/env python3

from __future__ import annotations

import re
import struct
import unittest
from itertools import permutations
from pathlib import Path

from battle_lab import (
    ACTION_MENU_MAX_ACKS,
    ACTION_MENU_MAX_ACKS_BRAIN,
    ATTENDANT_DIALOGUE_ROUTE,
    BATTLE_MON_SIZE,
    CONTROLLER_CHOOSE_ACTION,
    MAX_PRE_CHECKPOINT_CAPTURES,
    MAX_PRE_CHECKPOINT_FRAME,
    PRE_REPORT_ANCHOR_SHA256,
    BattleLab,
    FacilityCatalog,
    SELECT_CONFIRM_ACCEPT,
    SELECT_CONFIRM_TO_ACTION_MENU,
    SB2_FACTORY_RENTS_SINGLES_50,
    SELECT_TO_ACTION_MENU,
    SUBSTRUCT_POSITIONS,
    WALKUP_MAX_ACKS,
    rental_selection_route,
    validate_request,
)


class FakeOracle:
    def __init__(self):
        self.memory: dict[int, int] = {}
        # preview_report()'s anchor guard is the only thing checked before
        # any advance()/new_session()-dependent call FakeOracle can't
        # support, so it's the one BattleLab method offline tests can reach
        # meaningfully — set this to PRE_REPORT_ANCHOR_SHA256 to get past it.
        self.canonical_screen_sha256 = "fake-anchor-not-set"
        self.symbols = {
            "gSpecialVar_0x8005": 0x7900,
            "gSpecialVar_0x8006": 0x7902,
            "gFrontierTempParty": 0x7904,
            "gBattleFrontierMons": 0x1000,
            "gBattleFrontierHeldItems": 0x5000,
            "gBattleMoves": 0x5200,
            "gBattleMons": 0x6000,
            "gBattlersCount": 0x6080,
            "gBattlerPartyIndexes": 0x6090,
            "gStatuses3": 0x7000,
            "gDisableStructs": 0x7100,
            "gBattleWeather": 0x7200,
            "gWishFutureKnock": 0x7300,
            "gSideTimers": 0x7400,
            "gSideStatuses": 0x7500,
            "gRngValue": 0x7600,
            "gBattleOutcome": 0x7604,
            "gMain": 0x7700,
            "CB2_OverworldBasic": 0x123456,
            "gActiveBattler": 0x7710,
            "gBattleControllerExecFlags": 0x7714,
            "gBattleCommunication": 0x7720,
            "gBattleBufferA": 0x7800,
            "gCurrentMove": 0x7C00,
            "gPlayerParty": 0x8000,
            "gEnemyParty": 0x8300,
            "gSpeciesNames": 0x14000,
            "gExperienceTables": 0xA000,
            "gSpeciesInfo": 0xD000,
            "gNatureStatTable": 0x11000,
        }

    def read_u8(self, addr: int) -> int:
        return self.memory.get(addr, 0)

    def read_u16(self, addr: int) -> int:
        return self.read_u8(addr) | self.read_u8(addr + 1) << 8

    def read_u32(self, addr: int) -> int:
        return sum(self.read_u8(addr + offset) << (offset * 8) for offset in range(4))

    def write_u8(self, addr: int, value: int) -> None:
        self.memory[addr] = value & 0xFF

    def write_u16(self, addr: int, value: int) -> None:
        self.write_u8(addr, value)
        self.write_u8(addr + 1, value >> 8)

    def write_u32(self, addr: int, value: int) -> None:
        for offset in range(4):
            self.write_u8(addr + offset, value >> (offset * 8))


def request(**changes) -> dict:
    value = {
        "schemaVersion": 1,
        "mode": "factoryLegal",
        "profile": "battle-scene-off",
        "trainerId": 50,
        "challengeNum": 0,
        "battleNum": 0,
        "level": 50,
        "playerSetIds": [110, 111, 112],
        "opponentSetIds": [113, 114, 115],
        "seed": 123,
        "trace": {"segments": [], "captureFrames": [0]},
    }
    value.update(changes)
    return value


def brain_request(**changes) -> dict:
    value = {
        "schemaVersion": 1,
        "mode": "factoryBrain",
        "profile": "battle-scene-off",
        "challengeNum": 2,
        "level": 50,
        "playerSetIds": [110, 111, 112],
        "seed": 123,
        "trace": {"segments": [], "captureFrames": [0]},
    }
    value.update(changes)
    return value


def custom_mon(species: int, **changes) -> dict:
    value = {
        "species": species,
        "level": 50,
        "nature": 3,
        "ivs": {
            "hp": 31,
            "attack": 30,
            "defense": 29,
            "speed": 28,
            "spAttack": 27,
            "spDefense": 26,
        },
        "evs": {
            "hp": 4,
            "attack": 252,
            "defense": 0,
            "speed": 252,
            "spAttack": 0,
            "spDefense": 0,
        },
        "moves": [33, 73, 92, 150],
        "ppUps": [3, 2, 1, 0],
        "item": 186,
        "abilitySlot": 0,
        "friendship": 200,
        "gender": "male",
        "shiny": False,
    }
    value.update(changes)
    return value


class ValidationTests(unittest.TestCase):
    def test_factory_legal_normalizes_semantic_ids(self):
        value = validate_request(request(), "battle-scene-off")
        self.assertEqual(value["playerSetIds"], (110, 111, 112))
        self.assertEqual(value["opponentSetIds"], (113, 114, 115))
        self.assertEqual(value["seed"], 123)

    def test_profile_must_match_server(self):
        with self.assertRaisesRegex(ValueError, "does not match"):
            validate_request(request(profile="battle-scene-on"), "battle-scene-off")

    def test_schema_version_rejects_boolean_alias_for_one(self):
        with self.assertRaisesRegex(ValueError, "schemaVersion must be an integer"):
            validate_request(request(schemaVersion=True), "battle-scene-off")

    def test_factory_legal_rejects_mechanic_overrides(self):
        with self.assertRaisesRegex(ValueError, "does not permit overrides"):
            validate_request(request(overrides={"weather": "rain"}), "battle-scene-off")

    def test_mechanic_lab_accepts_allowlisted_setup_object(self):
        value = validate_request(
            request(
                mode="mechanicLab",
                overrides={
                    "battlers": {
                        "player": {
                            "moves": [73, 33, 33, 33],
                            "ppUps": [0, 0, 0, 0],
                        }
                    }
                },
            ),
            "battle-scene-off",
        )
        self.assertEqual(value["mode"], "mechanicLab")

    def test_mechanic_lab_accepts_complete_custom_parties(self):
        value = validate_request(
            request(
                mode="mechanicLab",
                overrides={
                    "parties": {
                        "player": [
                            custom_mon(1),
                            custom_mon(2),
                            custom_mon(3),
                        ],
                        "opponent": [
                            custom_mon(4),
                            custom_mon(5),
                            custom_mon(6),
                        ],
                    }
                },
            ),
            "battle-scene-off",
        )
        self.assertEqual(
            value["overrides"]["parties"]["player"][1]["species"],
            2,
        )

    def test_custom_parties_require_three_mons_on_both_sides(self):
        with self.assertRaisesRegex(ValueError, "exactly three Pokémon"):
            validate_request(
                request(
                    mode="mechanicLab",
                    overrides={
                        "parties": {
                            "player": [custom_mon(1)],
                            "opponent": [
                                custom_mon(4),
                                custom_mon(5),
                                custom_mon(6),
                            ],
                        }
                    },
                ),
                "battle-scene-off",
            )

    def test_custom_party_evs_use_per_stat_and_total_bounds(self):
        bad_total = custom_mon(
            1,
            evs={
                "hp": 255,
                "attack": 255,
                "defense": 1,
                "speed": 0,
                "spAttack": 0,
                "spDefense": 0,
            },
        )
        with self.assertRaisesRegex(ValueError, "total must not exceed 510"):
            validate_request(
                request(
                    mode="mechanicLab",
                    overrides={
                        "parties": {
                            "player": [bad_total, custom_mon(2), custom_mon(3)],
                            "opponent": [
                                custom_mon(4),
                                custom_mon(5),
                                custom_mon(6),
                            ],
                        }
                    },
                ),
                "battle-scene-off",
            )
        bad_ivs = custom_mon(
            1,
            ivs={
                "hp": 32,
                "attack": 31,
                "defense": 31,
                "speed": 31,
                "spAttack": 31,
                "spDefense": 31,
            },
        )
        with self.assertRaisesRegex(ValueError, "ivs.hp.*0 to 31"):
            validate_request(
                request(
                    mode="mechanicLab",
                    overrides={
                        "parties": {
                            "player": [bad_ivs, custom_mon(2), custom_mon(3)],
                            "opponent": [
                                custom_mon(4),
                                custom_mon(5),
                                custom_mon(6),
                            ],
                        }
                    },
                ),
                "battle-scene-off",
            )

    def test_custom_party_rejects_transient_state_and_legacy_mix(self):
        with self.assertRaisesRegex(ValueError, "status"):
            validate_request(
                request(
                    mode="mechanicLab",
                    overrides={
                        "parties": {
                            "player": [
                                custom_mon(1, status={"kind": "poison"}),
                                custom_mon(2),
                                custom_mon(3),
                            ],
                            "opponent": [
                                custom_mon(4),
                                custom_mon(5),
                                custom_mon(6),
                            ],
                        }
                    },
                ),
                "battle-scene-off",
            )
        with self.assertRaisesRegex(ValueError, "mutually exclusive"):
            validate_request(
                request(
                    mode="mechanicLab",
                    overrides={
                        "parties": {
                            "player": [
                                custom_mon(1),
                                custom_mon(2),
                                custom_mon(3),
                            ],
                            "opponent": [
                                custom_mon(4),
                                custom_mon(5),
                                custom_mon(6),
                            ],
                        },
                        "battlers": {},
                    },
                ),
                "battle-scene-off",
            )

    def test_v1_rejects_noland_head_battles_explicitly(self):
        with self.assertRaisesRegex(ValueError, "Noland"):
            validate_request(
                request(challengeNum=2, battleNum=6, trainerId=140),
                "battle-scene-off",
            )

    def test_factory_brain_normalizes_structural_identity(self):
        value = validate_request(brain_request(), "battle-scene-off")
        self.assertEqual(value["mode"], "factoryBrain")
        self.assertEqual(value["trainerId"], 1022)
        self.assertEqual(value["battleNum"], 6)
        self.assertEqual(tuple(value["opponentSetIds"]), ())
        self.assertEqual(value["playerSetIds"], (110, 111, 112))

    def test_factory_brain_accepts_both_real_encounters_only(self):
        self.assertEqual(
            validate_request(brain_request(challengeNum=5), "battle-scene-off")["challengeNum"],
            5,
        )
        for challenge_num in (0, 1, 3, 4, 6, 7):
            with self.assertRaisesRegex(ValueError, "2 \\(silver\\) or 5 \\(gold\\)"):
                validate_request(
                    brain_request(challengeNum=challenge_num), "battle-scene-off"
                )

    def test_factory_brain_requires_challenge_num(self):
        req = brain_request()
        del req["challengeNum"]
        with self.assertRaisesRegex(ValueError, "challengeNum must be an integer"):
            validate_request(req, "battle-scene-off")

    def test_factory_brain_rejects_explicit_identity_fields(self):
        for field, sample in (
            ("trainerId", 50),
            ("battleNum", 6),
            ("opponentSetIds", [113, 114, 115]),
        ):
            with self.assertRaisesRegex(ValueError, "does not accept fields"):
                validate_request(
                    brain_request(**{field: sample}), "battle-scene-off"
                )

    def test_factory_brain_rejects_battler_overrides(self):
        with self.assertRaisesRegex(ValueError, "does not permit overrides.battlers"):
            validate_request(
                brain_request(
                    overrides={
                        "battlers": {
                            "player": {
                                "moves": [73, 33, 33, 33],
                                "ppUps": [0, 0, 0, 0],
                            }
                        }
                    }
                ),
                "battle-scene-off",
            )

    def test_factory_brain_accepts_pinned_party_override(self):
        value = validate_request(
            brain_request(
                overrides={
                    "parties": {
                        "player": [custom_mon(1), custom_mon(2), custom_mon(3)],
                        "opponent": [custom_mon(4), custom_mon(5), custom_mon(6)],
                    }
                }
            ),
            "battle-scene-off",
        )
        self.assertEqual(
            value["overrides"]["parties"]["opponent"][0]["species"],
            4,
        )

    def test_factory_brain_rejects_unknown_overrides(self):
        with self.assertRaisesRegex(ValueError, "unknown overrides"):
            validate_request(
                brain_request(overrides={"weather": "rain"}),
                "battle-scene-off",
            )

    def test_walkup_defaults_false_and_normalizes(self):
        self.assertFalse(
            validate_request(brain_request(), "battle-scene-off")["walkup"]
        )
        value = validate_request(brain_request(walkup=True), "battle-scene-off")
        self.assertTrue(value["walkup"])
        # The identity stays the brain battle's; prepare() stages the
        # pre-win values and lets the ROM's own post-win fragment increment.
        self.assertEqual(value["battleNum"], 6)
        self.assertEqual(value["trainerId"], 1022)

    def test_walkup_accepts_gold_encounter(self):
        value = validate_request(
            brain_request(challengeNum=5, walkup=True), "battle-scene-off"
        )
        self.assertEqual(value["challengeNum"], 5)
        self.assertTrue(value["walkup"])

    def test_walkup_rejects_non_boolean(self):
        with self.assertRaisesRegex(ValueError, "walkup must be a boolean"):
            validate_request(brain_request(walkup=1), "battle-scene-off")

    def test_walkup_is_factory_brain_only(self):
        with self.assertRaisesRegex(ValueError, "only available in mode 'factoryBrain'"):
            validate_request(request(walkup=True), "battle-scene-off")
        with self.assertRaisesRegex(ValueError, "only available in mode 'factoryBrain'"):
            validate_request(
                request(mode="mechanicLab", walkup=True), "battle-scene-off"
            )

    def test_walkup_rejects_all_overrides(self):
        with self.assertRaisesRegex(ValueError, "walkup does not permit overrides"):
            validate_request(
                brain_request(
                    walkup=True,
                    overrides={
                        "parties": {
                            "player": [custom_mon(1), custom_mon(2), custom_mon(3)],
                            "opponent": [custom_mon(4), custom_mon(5), custom_mon(6)],
                        }
                    },
                ),
                "battle-scene-off",
            )


    def test_pre_checkpoint_capture_frames_default_empty(self):
        value = validate_request(request(), "battle-scene-off")
        self.assertEqual(value["preCheckpointCaptureFrames"], [])

    def test_pre_checkpoint_capture_frames_sorted_and_deduplicated(self):
        value = validate_request(
            request(preCheckpointCaptureFrames=[1886, 0, 1000, 0]),
            "battle-scene-off",
        )
        self.assertEqual(value["preCheckpointCaptureFrames"], [0, 1000, 1886])

    def test_pre_checkpoint_capture_frames_reject_out_of_range(self):
        with self.assertRaisesRegex(ValueError, r"preCheckpointCaptureFrames\[0\]"):
            validate_request(
                request(preCheckpointCaptureFrames=[MAX_PRE_CHECKPOINT_FRAME + 1]),
                "battle-scene-off",
            )
        with self.assertRaisesRegex(ValueError, r"preCheckpointCaptureFrames\[0\]"):
            validate_request(
                request(preCheckpointCaptureFrames=[-1]),
                "battle-scene-off",
            )

    def test_pre_checkpoint_capture_frames_reject_boolean_alias(self):
        with self.assertRaisesRegex(ValueError, r"preCheckpointCaptureFrames\[0\] must be an integer"):
            validate_request(
                request(preCheckpointCaptureFrames=[True]),
                "battle-scene-off",
            )

    def test_pre_checkpoint_capture_frames_reject_too_many_entries(self):
        with self.assertRaisesRegex(ValueError, "0 to 256 entries"):
            validate_request(
                request(
                    preCheckpointCaptureFrames=list(range(MAX_PRE_CHECKPOINT_CAPTURES + 1))
                ),
                "battle-scene-off",
            )

    def test_pre_checkpoint_capture_frames_reject_non_list(self):
        with self.assertRaisesRegex(ValueError, "0 to 256 entries"):
            validate_request(
                request(preCheckpointCaptureFrames=0),
                "battle-scene-off",
            )

    def test_pre_checkpoint_capture_all_frames_defaults_false(self):
        value = validate_request(request(), "battle-scene-off")
        self.assertEqual(value["preCheckpointCaptureAllFrames"], False)

    def test_pre_checkpoint_capture_all_frames_rejects_non_boolean(self):
        with self.assertRaisesRegex(ValueError, "preCheckpointCaptureAllFrames must be a boolean"):
            validate_request(
                request(preCheckpointCaptureAllFrames=1),
                "battle-scene-off",
            )

    def test_pre_checkpoint_capture_all_frames_rejects_combination_with_explicit_list(self):
        with self.assertRaisesRegex(ValueError, "mutually exclusive"):
            validate_request(
                request(
                    preCheckpointCaptureAllFrames=True,
                    preCheckpointCaptureFrames=[0],
                ),
                "battle-scene-off",
            )


class CatalogAndLegalityTests(unittest.TestCase):
    def setUp(self):
        self.oracle = FakeOracle()
        for set_id in range(110, 267):
            base = self.oracle.symbols["gBattleFrontierMons"] + set_id * 16
            self.oracle.write_u16(base, set_id + 1000)
            for slot in range(4):
                self.oracle.write_u16(base + 2 + slot * 2, set_id + slot)
            item_table_id = set_id - 109
            self.oracle.write_u8(base + 10, item_table_id)
            self.oracle.write_u8(base + 11, 0x3F)
            self.oracle.write_u8(base + 12, set_id % 25)
            self.oracle.write_u16(
                self.oracle.symbols["gBattleFrontierHeldItems"] + item_table_id * 2,
                item_table_id + 200,
            )
        self.lab = BattleLab(self.oracle, "battle-scene-off")

    def test_catalog_decodes_source_struct_layout(self):
        mon = FacilityCatalog(self.oracle).mon(110)
        self.assertEqual(mon.species, 1110)
        self.assertEqual(mon.moves, (110, 111, 112, 113))
        self.assertEqual(mon.item, 201)
        self.assertEqual(mon.nature, 10)

    def test_factory_legal_completes_six_mon_rental_pool(self):
        normalized = validate_request(request(), "battle-scene-off")
        player = [self.lab.catalog.mon(i) for i in normalized["playerSetIds"]]
        opponent = [self.lab.catalog.mon(i) for i in normalized["opponentSetIds"]]
        plan = self.lab._validate_and_plan(normalized, player, opponent)
        self.assertEqual(plan.selected_positions, (0, 1, 2))
        self.assertEqual([mon.set_id for mon in plan.fillers], [116, 117, 118])

    def test_factory_legal_rejects_wrong_challenge_range(self):
        normalized = validate_request(request(playerSetIds=[109, 110, 111]), "battle-scene-off")
        player = [self.lab.catalog.mon(i) for i in normalized["playerSetIds"]]
        opponent = [self.lab.catalog.mon(i) for i in normalized["opponentSetIds"]]
        with self.assertRaisesRegex(ValueError, "cannot be assigned"):
            self.lab._validate_and_plan(normalized, player, opponent)

    def test_past_rentals_unlock_source_ranked_candidate_slots(self):
        normalized = validate_request(
            request(rentalSwapCount=15, playerSetIds=[200, 110, 111]),
            "battle-scene-off",
        )
        player = [self.lab.catalog.mon(i) for i in normalized["playerSetIds"]]
        opponent = [self.lab.catalog.mon(i) for i in normalized["opponentSetIds"]]
        plan = self.lab._validate_and_plan(normalized, player, opponent)
        self.assertEqual(self.lab._rental_rank(normalized["rentalSwapCount"]), 1)
        self.assertEqual(plan.selected_positions, (0, 1, 2))
        self.assertEqual(plan.candidates[0].set_id, 200)

    def test_ranked_rentals_preserve_requested_party_order(self):
        normalized = validate_request(
            request(rentalSwapCount=15, playerSetIds=[110, 200, 111]),
            "battle-scene-off",
        )
        player = [self.lab.catalog.mon(i) for i in normalized["playerSetIds"]]
        opponent = [self.lab.catalog.mon(i) for i in normalized["opponentSetIds"]]
        plan = self.lab._validate_and_plan(normalized, player, opponent)
        self.assertEqual(plan.selected_positions, (1, 0, 2))

    def test_rental_rank_matches_source_u8_truncation(self):
        expected = (
            (0, 0),
            (14, 0),
            (15, 1),
            (21, 1),
            (22, 2),
            (28, 2),
            (29, 3),
            (35, 3),
            (36, 4),
            (42, 4),
            (43, 5),
            (255, 5),
            (256, 0),
            (271, 1),
            (0xFFFF, 5),
        )
        for count, rank in expected:
            with self.subTest(count=count):
                self.assertEqual(self.lab._rental_rank(count), rank)

    def test_internal_route_length_is_pinned(self):
        self.assertEqual(sum(frames for frames, _ in SELECT_TO_ACTION_MENU), 1886)
        self.assertEqual(CONTROLLER_CHOOSE_ACTION, 18)
        self.assertEqual(ACTION_MENU_MAX_ACKS, 12)

    def test_rental_selection_route_worst_case_stays_under_the_capture_cap(self):
        # rental_selection_route()'s length is data-dependent on which
        # candidates got selected, not fixed at SELECT_TO_ACTION_MENU's 1886
        # — a prior adversarial review found the true range by brute force.
        # Recheck that brute force here so a future change to the route
        # can't silently widen the true worst case past what
        # MAX_PRE_CHECKPOINT_FRAME's own comment assumes without this test
        # catching it.
        lengths = {
            sum(frames for frames, _ in rental_selection_route(combo))
            for combo in permutations(range(6), 3)
        }
        self.assertEqual(min(lengths), 1886)
        self.assertEqual(max(lengths), 1936)
        # MAX_PRE_CHECKPOINT_FRAME must stay above every reachable internal
        # frame number: the 120-frame lead-in, the true worst-case rental-
        # selection route above, and the intro-acknowledgement loop's worst
        # case.
        worst_case_internal_frame = 120 + max(lengths) + ACTION_MENU_MAX_ACKS * (120 + 2 + 12)
        self.assertEqual(worst_case_internal_frame, 3664)
        self.assertLess(worst_case_internal_frame, MAX_PRE_CHECKPOINT_FRAME)

    def test_walkup_route_length_stays_under_its_own_frame_bound(self):
        # The walk-up route swaps the fresh-draft intro drive for the
        # confirm-accept slice plus the ask-ready acknowledgement loop; the
        # shared pre-checkpoint frame bound must stay above its worst case.
        self.assertEqual(
            SELECT_CONFIRM_TO_ACTION_MENU[: len(SELECT_CONFIRM_ACCEPT)],
            SELECT_CONFIRM_ACCEPT,
        )
        confirm_lengths = {
            sum(
                frames
                for frames, _ in rental_selection_route(
                    combo, through_confirm_only=True
                )
            )
            for combo in permutations(range(6), 3)
        }
        worst_case = 120 + max(confirm_lengths) + WALKUP_MAX_ACKS * (120 + 2 + 12)
        self.assertEqual(worst_case, 2706)
        self.assertLess(worst_case, MAX_PRE_CHECKPOINT_FRAME)

    def test_attendant_dialogue_route_length_is_pinned(self):
        # A literal extraction of bootstrap/factory.json's segments[193:225]
        # (BOOTSTRAP.md's v3 table, steps 1-16); this total plus 60 further
        # idle frames reaches the same state factory.json bakes in directly.
        self.assertEqual(sum(frames for frames, _ in ATTENDANT_DIALOGUE_ROUTE), 2916)


class ScriptedMenuOracle(FakeOracle):
    """Plays back (gBattleBufferA[0][0], exec flags) per frame; records A."""

    def __init__(self, timeline):
        super().__init__()
        self.timeline = timeline
        self.frame = 0
        self.a_frames: list[int] = []

    def advance(self, buttons: list[str]) -> None:
        self.frame += 1
        if "A" in buttons:
            self.a_frames.append(self.frame)
        buffer, flags = self.timeline(self.frame)
        self.write_u8(self.symbols["gBattleBufferA"], buffer)
        self.write_u32(self.symbols["gBattleControllerExecFlags"], flags)


class IntroAcknowledgementTests(unittest.TestCase):
    PRINT_STRING = 16  # any controller command other than choose-action

    def finish(self, timeline, **kwargs) -> ScriptedMenuOracle:
        oracle = ScriptedMenuOracle(timeline)
        BattleLab(oracle, "battle-scene-off")._finish_intro_to_action_menu(**kwargs)
        return oracle

    def test_no_tap_while_the_menu_waits_on_the_opponent_controller(self):
        # The live failure (ROM seeds 3623, 6048, 1447, ...): the check at
        # frame 120 lands while the choose-action command is already with
        # the player's controller and the opponent's AI still holds its
        # exec bit. A tap there picks FIGHT.
        def timeline(frame):
            if frame < 115:
                return self.PRINT_STRING, 1
            return CONTROLLER_CHOOSE_ACTION, 3 if frame < 127 else 1

        oracle = self.finish(timeline)
        self.assertEqual(oracle.a_frames, [])
        self.assertEqual(oracle.frame, 134)

    def test_taps_keep_their_cadence_until_the_menu_is_issued(self):
        def timeline(frame):
            if frame < 300:
                return self.PRINT_STRING, 1
            return CONTROLLER_CHOOSE_ACTION, 1

        oracle = self.finish(timeline)
        self.assertEqual(oracle.a_frames, [121, 122, 255, 256])
        self.assertEqual(oracle.frame, 388)

    def test_stale_choose_action_byte_without_the_player_bit_still_taps(self):
        # The buffer byte alone is not the menu: the command is only live
        # while the player's exec bit is set.
        def timeline(frame):
            if frame < 200:
                return CONTROLLER_CHOOSE_ACTION, 2
            return CONTROLLER_CHOOSE_ACTION, 1

        oracle = self.finish(timeline)
        self.assertEqual(oracle.a_frames, [121, 122])
        self.assertEqual(oracle.frame, 254)

    def test_gives_up_after_the_documented_worst_case(self):
        for max_acks in (ACTION_MENU_MAX_ACKS, ACTION_MENU_MAX_ACKS_BRAIN):
            with self.subTest(max_acks=max_acks):
                oracle = ScriptedMenuOracle(lambda frame: (self.PRINT_STRING, 0))
                with self.assertRaisesRegex(RuntimeError, "player action menu"):
                    BattleLab(oracle, "battle-scene-off")._finish_intro_to_action_menu(
                        max_acks=max_acks
                    )
                self.assertEqual(oracle.frame, max_acks * (120 + 2 + 12))
                self.assertEqual(len(oracle.a_frames), max_acks * 2)


class MechanicLoadoutTests(unittest.TestCase):
    def setUp(self):
        self.oracle = FakeOracle()
        self.lab = BattleLab(self.oracle, "battle-scene-off")
        player = self.oracle.symbols["gBattleMons"]
        opponent = player + BATTLE_MON_SIZE
        self.oracle.write_u16(player + 0x28, 100)
        self.oracle.write_u16(player + 0x2C, 120)
        self.oracle.write_u16(opponent + 0x28, 110)
        self.oracle.write_u16(opponent + 0x2C, 140)
        for move, pp in ((73, 10), (92, 15), (261, 5), (195, 5)):
            self.oracle.write_u8(
                self.oracle.symbols["gBattleMoves"] + move * 12 + 4,
                pp,
            )

    def test_allowlisted_loadout_fields_can_be_selected(self):
        self.lab._apply_overrides({
            "battlers": {
                "player": {
                    "moves": [73, 92, 261, 195],
                    "ppUps": [0, 1, 2, 3],
                    "item": 200,
                    "ability": 20,
                    "types": [12, 12],
                    "friendship": 255,
                }
            },
        })
        base = self.oracle.symbols["gBattleMons"]
        self.assertEqual(self.oracle.read_u16(base + 0x0C), 73)
        self.assertEqual(self.oracle.read_u8(base + 0x24), 10)
        self.assertEqual(self.oracle.read_u8(base + 0x25), 18)
        self.assertEqual(self.oracle.read_u8(base + 0x26), 7)
        self.assertEqual(self.oracle.read_u8(base + 0x27), 8)
        self.assertEqual(self.oracle.read_u8(base + 0x3B), 0xE4)
        self.assertEqual(self.oracle.read_u16(base + 0x2E), 200)
        self.assertEqual(self.oracle.read_u8(base + 0x20), 20)
        self.assertEqual(
            [self.oracle.read_u8(base + 0x21), self.oracle.read_u8(base + 0x22)],
            [12, 12],
        )
        self.assertEqual(self.oracle.read_u8(base + 0x2B), 255)

    def test_override_ids_stay_within_source_tables(self):
        with self.assertRaisesRegex(ValueError, "item must be an integer from 0 to 376"):
            self.lab._apply_overrides({
                "battlers": {"player": {"item": 377}}
            })
        with self.assertRaisesRegex(ValueError, "ability must be an integer from 0 to 77"):
            self.lab._apply_overrides({
                "battlers": {"player": {"ability": 78}}
            })

    def test_moves_and_pp_ups_must_be_consistent(self):
        with self.assertRaisesRegex(ValueError, "must be supplied together"):
            self.lab._apply_overrides({
                "battlers": {"player": {"moves": [153, 153, 153, 153]}}
            })
        with self.assertRaisesRegex(ValueError, "must be supplied together"):
            self.lab._apply_overrides({
                "battlers": {"player": {"ppUps": [0, 0, 0, 0]}}
            })
        with self.assertRaisesRegex(ValueError, "integer from 0 to 3"):
            self.lab._apply_overrides({
                "battlers": {
                    "player": {
                        "moves": [153, 153, 153, 153],
                        "ppUps": [4, 0, 0, 0],
                    }
                }
            })
        with self.assertRaisesRegex(ValueError, "unknown fields: pp"):
            self.lab._apply_overrides({
                "battlers": {
                    "player": {
                        "moves": [153, 153, 153, 153],
                        "pp": [5, 5, 5, 5],
                    }
                }
            })
        self.oracle.write_u8(
            self.oracle.symbols["gBattleMoves"] + 166 * 12 + 4,
            1,
        )
        with self.assertRaisesRegex(ValueError, "must be 0 for move 166"):
            self.lab._validate_pp_ups({
                "battlers": {
                    "player": {
                        "moves": [166, 73, 92, 195],
                        "ppUps": [1, 0, 0, 0],
                    }
                }
            })

    def test_direct_battle_state_is_rejected(self):
        for overrides, field in (
            ({"weather": "rain"}, "weather"),
            ({"weatherTurns": 5}, "weatherTurns"),
            ({"sides": {"player": {"reflect": 3}}}, "sides"),
            ({"battlers": {"player": {"hp": 37}}}, "hp"),
            ({"battlers": {"player": {"maxHp": 100}}}, "maxHp"),
            ({"battlers": {"player": {"status": {"kind": "poison"}}}}, "status"),
            (
                {"battlers": {"player": {"volatile": {"confusionTurns": 2}}}},
                "volatile",
            ),
            ({"battlers": {"player": {"statStages": [6] * 8}}}, "statStages"),
        ):
            with self.subTest(field=field):
                with self.assertRaisesRegex(ValueError, field):
                    self.lab._apply_overrides(overrides)

    def test_snapshot_exposes_named_timed_conditions(self):
        base = self.oracle.symbols["gBattleMons"]
        self.oracle.write_u32(base + 0x50, 4)
        self.oracle.write_u32(base + 0x4C, (1 << 7) | (3 << 8))
        self.oracle.write_u32(self.oracle.symbols["gStatuses3"], 0x25)
        self.oracle.write_u8(self.oracle.symbols["gDisableStructs"] + 0x0F, 2)
        self.oracle.write_u16(self.oracle.symbols["gBattleWeather"], 1)
        self.oracle.write_u8(self.oracle.symbols["gWishFutureKnock"] + 0x28, 5)
        self.oracle.write_u8(self.oracle.symbols["gSideTimers"], 3)
        self.oracle.write_u8(self.oracle.symbols["gSideTimers"] + 10, 2)
        self.oracle.write_u8(self.oracle.symbols["gSideTimers"] + 12 + 2, 4)
        self.oracle.write_u8(self.oracle.symbols["gSideTimers"] + 12 + 10, 3)
        self.oracle.write_u8(base + 0x3B, 0xE4)
        snapshot = self.lab.snapshot()
        self.assertEqual(snapshot["weatherTurns"], 5)
        self.assertEqual(
            snapshot["battlers"]["player"]["volatile"],
            {
                "confusionTurns": 4,
                "leechSeededBy": "opponent",
                "perishSongTurns": 2,
            },
        )
        self.assertEqual(
            snapshot["sideConditions"]["player"],
            {
                "reflectTurns": 3,
                "lightScreenTurns": 0,
                "mistTurns": 0,
                "safeguardTurns": 0,
                "spikes": 2,
            },
        )
        self.assertEqual(snapshot["sideConditions"]["opponent"]["lightScreenTurns"], 4)
        self.assertEqual(snapshot["sideConditions"]["opponent"]["spikes"], 3)
        self.assertEqual(snapshot["battlers"]["player"]["ppUps"], [0, 1, 2, 3])
        self.assertEqual(
            snapshot["battlers"]["player"]["status"],
            {"kind": "toxic", "counter": 3},
        )

    def test_snapshot_decodes_each_permanent_status(self):
        cases = (
            (0, {"kind": "none"}),
            (4, {"kind": "sleep", "turns": 4}),
            (1 << 3, {"kind": "poison"}),
            (1 << 4, {"kind": "burn"}),
            (1 << 5, {"kind": "freeze"}),
            (1 << 6, {"kind": "paralysis"}),
            ((1 << 7) | (5 << 8), {"kind": "toxic", "counter": 5}),
        )
        for raw, expected in cases:
            with self.subTest(raw=raw):
                self.assertEqual(self.lab._permanent_status(raw), expected)

    def test_loadout_checkpoint_precedes_first_action_choices(self):
        battle_mons = self.oracle.symbols["gBattleMons"]
        communication = self.oracle.symbols["gBattleCommunication"]
        self.oracle.write_u8(self.oracle.symbols["gBattlersCount"], 2)
        self.oracle.write_u16(battle_mons, 1)
        self.oracle.write_u16(battle_mons + BATTLE_MON_SIZE, 2)
        self.oracle.write_u8(communication, 1)
        self.oracle.write_u8(communication + 1, 1)

        self.assertTrue(self.lab._before_first_action_choices())

        self.oracle.write_u32(
            self.oracle.symbols["gBattleControllerExecFlags"],
            1,
        )
        self.assertFalse(self.lab._before_first_action_choices())
        self.oracle.write_u32(
            self.oracle.symbols["gBattleControllerExecFlags"],
            0,
        )
        self.oracle.write_u8(communication + 1, 2)
        self.assertFalse(self.lab._before_first_action_choices())


class CustomPartyBuilderTests(unittest.TestCase):
    SPECIES = 25

    def setUp(self):
        self.oracle = FakeOracle()
        self.lab = BattleLab(self.oracle, "battle-scene-off")
        info = self.oracle.symbols["gSpeciesInfo"] + self.SPECIES * 28
        for offset, value in enumerate((35, 55, 40, 90, 50, 50)):
            self.oracle.write_u8(info + offset, value)
        self.oracle.write_u8(info + 6, 13)
        self.oracle.write_u8(info + 7, 13)
        self.oracle.write_u8(info + 0x10, 127)
        self.oracle.write_u8(info + 0x12, 70)
        self.oracle.write_u8(info + 0x13, 0)
        self.oracle.write_u8(info + 0x16, 9)
        self.oracle.write_u8(info + 0x17, 31)
        self.oracle.write_u32(
            self.oracle.symbols["gExperienceTables"] + 50 * 4,
            125000,
        )
        nature = self.oracle.symbols["gNatureStatTable"] + 3 * 5
        for offset, value in enumerate((1, 0, 0, 0xFF, 0)):
            self.oracle.write_u8(nature + offset, value)
        for move, pp in ((33, 35), (73, 10), (92, 10), (150, 40), (166, 1)):
            self.oracle.write_u8(
                self.oracle.symbols["gBattleMoves"] + move * 12 + 4,
                pp,
            )
        name = b"PIKACHU\xff\xff\xff"
        for offset, byte in enumerate(name):
            self.oracle.write_u8(
                self.oracle.symbols["gSpeciesNames"]
                + self.SPECIES * 11
                + offset,
                byte,
            )
        self.base = self.oracle.symbols["gPlayerParty"]
        self.oracle.write_u32(self.base + 4, 0x12345678)
        self.oracle.write_u8(self.base + 18, 2)
        for offset, byte in enumerate(b"MEMORY\xff"):
            self.oracle.write_u8(self.base + 20 + offset, byte)

    def test_builder_round_trips_complete_encrypted_party_record(self):
        personality = next(
            candidate
            for candidate in range(4, 100000, 24)
            if (
                candidate % 25 == 3
                and self.lab._gender(candidate, 127) == "male"
                and not self.lab._is_shiny(candidate, 0x12345678)
            )
        )
        self.assertEqual(personality % 24, 4)
        value = custom_mon(
            self.SPECIES,
            abilitySlot=1,
            personality=personality,
        )
        self.lab._validate_custom_parties({
            "parties": {
                "player": [value, value, value],
                "opponent": [value, value, value],
            }
        })
        self.lab._write_party_mon(
            self.base,
            value,
            0xCAFEBABE,
            50,
            "overrides.parties.player[0]",
        )
        mon = self.lab._party_mon(self.base)
        self.assertTrue(mon["checksumValid"])
        self.assertEqual(mon["species"], self.SPECIES)
        self.assertEqual(mon["level"], 50)
        self.assertEqual(mon["nature"], 3)
        self.assertEqual(mon["ivs"], value["ivs"])
        self.assertEqual(mon["evs"], value["evs"])
        self.assertEqual(mon["moves"], value["moves"])
        self.assertEqual(mon["pp"], [56, 14, 12, 40])
        self.assertEqual(mon["ppUps"], value["ppUps"])
        self.assertEqual(mon["item"], 186)
        self.assertEqual((mon["abilitySlot"], mon["ability"]), (1, 31))
        self.assertEqual(mon["friendship"], 200)
        self.assertEqual(mon["gender"], "male")
        self.assertFalse(mon["shiny"])
        self.assertEqual(mon["hp"], mon["maxHp"])
        self.assertEqual(mon["maxHp"], 111)
        self.assertEqual(
            mon["stats"],
            {
                "attack": 116,
                "defense": 59,
                "speed": 140,
                "spAttack": 61,
                "spDefense": 68,
            },
        )
        self.assertEqual(mon["status"], {"kind": "none"})
        key = personality ^ 0x12345678
        physical = b"".join(
            (
                self.oracle.read_u32(self.base + 32 + offset) ^ key
            ).to_bytes(4, "little")
            for offset in range(0, 48, 4)
        )
        self.assertEqual(SUBSTRUCT_POSITIONS[4], (0, 2, 3, 1))
        self.assertEqual(int.from_bytes(physical[0:2], "little"), self.SPECIES)
        self.assertEqual(int.from_bytes(physical[24:26], "little"), 33)
        self.assertEqual(physical[36], 4)

    def test_personality_can_select_shiny_and_exact_properties(self):
        personality = self.lab._select_personality(
            123,
            0x12345678,
            10,
            127,
            "female",
            True,
            None,
            "mon",
        )
        self.assertEqual(personality % 25, 10)
        self.assertEqual(self.lab._gender(personality, 127), "female")
        self.assertTrue(self.lab._is_shiny(personality, 0x12345678))
        self.assertEqual(
            self.lab._select_personality(
                0,
                0x12345678,
                10,
                127,
                "female",
                True,
                personality,
                "mon",
            ),
            personality,
        )
        with self.assertRaisesRegex(ValueError, "does not match"):
            self.lab._select_personality(
                0,
                0x12345678,
                11,
                127,
                "female",
                True,
                personality,
                "mon",
            )

    def test_all_24_encrypted_substruct_permutations_round_trip(self):
        for residue in range(24):
            personality = next(
                candidate
                for candidate in range(residue, 500000, 24)
                if (
                    candidate % 25 == 3
                    and self.lab._gender(candidate, 127) == "male"
                    and not self.lab._is_shiny(candidate, 0x12345678)
                )
            )
            value = custom_mon(
                self.SPECIES,
                abilitySlot=1,
                personality=personality,
            )
            with self.subTest(residue=residue, personality=personality):
                self.lab._write_party_mon(
                    self.base,
                    value,
                    0,
                    50,
                    "mon",
                )
                mon = self.lab._party_mon(self.base)
                self.assertTrue(mon["checksumValid"])
                self.assertEqual(mon["species"], self.SPECIES)
                self.assertEqual(mon["moves"], [33, 73, 92, 150])
                self.assertEqual(mon["ivs"], value["ivs"])
                self.assertEqual(mon["evs"], value["evs"])
                self.assertEqual(mon["abilitySlot"], 1)

    def test_minimal_spec_uses_source_and_contract_defaults(self):
        value = {"species": self.SPECIES, "moves": [166, 150, 0, 0]}
        self.lab._write_party_mon(
            self.base,
            value,
            777,
            50,
            "mon",
        )
        mon = self.lab._party_mon(self.base)
        self.assertEqual(mon["level"], 50)
        self.assertEqual(mon["nature"], 0)
        self.assertEqual(mon["ivs"], {name: 31 for name in mon["ivs"]})
        self.assertEqual(mon["evs"], {name: 0 for name in mon["evs"]})
        self.assertEqual(mon["ppUps"], [0, 0, 0, 0])
        self.assertEqual(mon["pp"], [1, 40, 0, 0])
        self.assertEqual((mon["item"], mon["abilitySlot"]), (0, 0))
        self.assertEqual(mon["friendship"], 70)
        self.assertFalse(mon["shiny"])
        self.assertTrue(mon["checksumValid"])

    def test_low_pp_move_refuses_pp_ups_in_custom_party(self):
        value = custom_mon(
            self.SPECIES,
            moves=[166, 150, 150, 150],
            ppUps=[1, 0, 0, 0],
        )
        parties = {
            "parties": {
                "player": [value] * 3,
                "opponent": [custom_mon(self.SPECIES)] * 3,
            }
        }
        with self.assertRaisesRegex(ValueError, "must be 0 for move 166"):
            self.lab._validate_custom_parties(parties)

    def test_shiny_search_handles_rarest_gender_thresholds(self):
        female = self.lab._select_personality(
            0xFFFFFFFF,
            0x12345678,
            24,
            1,
            "female",
            True,
            None,
            "female-mon",
        )
        self.assertEqual(female % 25, 24)
        self.assertEqual(female & 0xFF, 0)
        self.assertTrue(self.lab._is_shiny(female, 0x12345678))

        male = self.lab._select_personality(
            0,
            0x12345678,
            0,
            0xFE,
            "male",
            True,
            None,
            "male-mon",
        )
        self.assertEqual(male % 25, 0)
        self.assertGreaterEqual(male & 0xFF, 0xFE)
        self.assertTrue(self.lab._is_shiny(male, 0x12345678))

    def test_shedinja_keeps_one_hp_at_level_and_ev_extremes(self):
        info = self.oracle.symbols["gSpeciesInfo"] + 303 * 28
        for offset, value in enumerate((1, 90, 45, 40, 30, 30)):
            self.oracle.write_u8(info + offset, value)
        stats = self.lab._calculate_stats(
            303,
            100,
            0,
            {
                name: 31
                for name in (
                    "hp",
                    "attack",
                    "defense",
                    "speed",
                    "spAttack",
                    "spDefense",
                )
            },
            {
                "hp": 255,
                "attack": 255,
                "defense": 0,
                "speed": 0,
                "spAttack": 0,
                "spDefense": 0,
            },
        )
        self.assertEqual(stats["maxHp"], 1)
        self.assertEqual(stats["attack"], 279)

    def test_species_validates_ability_slot_and_gender(self):
        no_second_ability = custom_mon(self.SPECIES, abilitySlot=1)
        info = self.oracle.symbols["gSpeciesInfo"] + self.SPECIES * 28
        self.oracle.write_u8(info + 0x17, 0)
        parties = {
            "parties": {
                "player": [no_second_ability] * 3,
                "opponent": [custom_mon(self.SPECIES)] * 3,
            }
        }
        with self.assertRaisesRegex(ValueError, "abilitySlot 1 is not available"):
            self.lab._validate_custom_parties(parties)

        self.oracle.write_u8(info + 0x17, 31)
        self.oracle.write_u8(info + 0x10, 0xFF)
        gendered = custom_mon(self.SPECIES, gender="male")
        parties["parties"]["player"] = [gendered] * 3
        with self.assertRaisesRegex(ValueError, "gender 'male' is not available"):
            self.lab._validate_custom_parties(parties)

    def test_prebattle_checkpoint_requires_both_benches_and_empty_battle(self):
        self.oracle.write_u32(
            self.oracle.symbols["gMain"] + 4,
            self.oracle.symbols["CB2_OverworldBasic"] | 1,
        )
        for symbol in ("gPlayerParty", "gEnemyParty"):
            base = self.oracle.symbols[symbol]
            for index in range(3):
                self.oracle.write_u8(base + index * 100 + 84, 50)
                self.oracle.write_u16(base + index * 100 + 86, 100)
        self.assertTrue(self.lab._parties_ready_for_staging())
        self.oracle.write_u16(self.oracle.symbols["gBattleMons"], 25)
        self.assertFalse(self.lab._parties_ready_for_staging())


class PreviewReportGuardTests(unittest.TestCase):
    """Offline coverage for preview_report()'s two guards.

    Both checks run before the method's first FakeOracle-incompatible call
    (new_session()), so they're the one part of preview_report() an offline
    FakeOracle test can reach. A prior adversarial review disabled the
    anchor guard in a scratch copy and found the full 43-test offline suite
    (as it stood then) still passed — these tests close that specific gap;
    they do not, and cannot, cover anything past new_session().
    """

    def setUp(self):
        self.oracle = FakeOracle()
        self.lab = BattleLab(self.oracle, "battle-scene-off")

    def test_rejects_wrong_anchor(self):
        self.oracle.canonical_screen_sha256 = "not-the-real-anchor"
        with self.assertRaisesRegex(RuntimeError, "factory-pre-report.json"):
            self.lab.preview_report()

    def test_rejects_capture_frames_combined_with_capture_all_frames(self):
        self.oracle.canonical_screen_sha256 = PRE_REPORT_ANCHOR_SHA256
        with self.assertRaisesRegex(ValueError, "mutually exclusive"):
            self.lab.preview_report(capture_frames={0}, capture_all_frames=True)

    def test_correct_anchor_and_valid_capture_args_pass_both_guards(self):
        self.oracle.canonical_screen_sha256 = PRE_REPORT_ANCHOR_SHA256
        # FakeOracle has no new_session()/advance(), so a call that clears
        # both guards fails past them with AttributeError, not RuntimeError
        # or ValueError — that's the signal the guards didn't wrongly block
        # a valid call.
        with self.assertRaises(AttributeError):
            self.lab.preview_report(capture_frames={0})
        with self.assertRaises(AttributeError):
            self.lab.preview_report(capture_all_frames=True)
        with self.assertRaises(AttributeError):
            self.lab.preview_report()


_REFERENCE = Path(__file__).resolve().parent.parent / "reference" / "pokeemerald"


class SaveOffsetTests(unittest.TestCase):
    def test_rents_count_offset_is_the_one_the_rom_reads(self):
        # include/global.h labels factoryRentsCount "0xDF6", but the built
        # GetNumPastRentalsRank adds 0xDF2 to gSaveBlock2Ptr (its literal
        # pool): 0xDF6 is [1][0], the doubles count.
        rom_path = _REFERENCE / "pokeemerald.gba"
        map_path = _REFERENCE / "pokeemerald.map"
        if not (rom_path.is_file() and map_path.is_file()):
            self.skipTest("the decompilation is not built")
        found = re.search(
            r"^\s+0x([0-9a-f]{8})\s+GetNumPastRentalsRank$",
            map_path.read_text(),
            re.MULTILINE,
        )
        self.assertIsNotNone(found)
        start = int(found.group(1), 16) - 0x08000000
        code = rom_path.read_bytes()[start:start + 0x48]
        words = {
            struct.unpack_from("<I", code, offset)[0]
            for offset in range(0, len(code) - 3, 4)
        }
        self.assertIn(0xDF2, words)
        self.assertEqual(SB2_FACTORY_RENTS_SINGLES_50, 0xDF2)


if __name__ == "__main__":
    unittest.main()
