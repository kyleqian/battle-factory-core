#!/usr/bin/env python3
"""Live compatibility and semantic smoke test for /v1/battle-lab/run."""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request


BASE_URL = os.environ.get("POKEBENCH_ORACLE_URL", "http://127.0.0.1:8014").rstrip("/")
PROFILE = os.environ.get("POKEBENCH_EXPECTED_ORACLE_PROFILE", "battle-scene-off")
CANONICAL_SHA = "9c89c74113f29e7d4595571c3aceb728417c4fe441b644ec0022fb498463f297"
CURSOR_SLOT2_SHA = "f98116c078fce6458b46917d833dd2a52ec904a307c7252aed034872ba047f1b"
failures: list[str] = []


def check(name: str, condition: bool, detail: object = None) -> None:
    if condition:
        print(f"ok   {name}")
    else:
        failures.append(name)
        print(f"FAIL {name}: {detail!r}")


def post(path: str, value: dict) -> dict:
    request = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=json.dumps(value).encode(),
        headers={"content-type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=300) as response:
        return json.load(response)


def post_error(path: str, value: dict) -> tuple[int, dict]:
    try:
        post(path, value)
    except urllib.error.HTTPError as error:
        return error.code, json.load(error)
    raise AssertionError("request unexpectedly succeeded")


def scenario(mode: str, player: list[int], opponent: list[int], **extra) -> dict:
    value = {
        "schemaVersion": 1,
        "mode": mode,
        "profile": PROFILE,
        "trainerId": 50,
        "challengeNum": 0,
        "battleNum": 0,
        "level": 50,
        "playerSetIds": player,
        "opponentSetIds": opponent,
        "seed": 0x12345678,
        "trace": {"segments": [], "captureFrames": [0]},
    }
    value.update(extra)
    return value


def main() -> None:
    canonical = post("/v1/run", {
        "segments": [
            {"frames": 6, "buttons": ["RIGHT"]},
            {"frames": 20, "buttons": []},
        ],
        "captureFrames": [0, 26],
    })
    hashes = {capture["frame"]: capture["sha256"] for capture in canonical["captures"]}
    check("canonical /v1/run frame 0 unchanged", hashes.get(0) == CANONICAL_SHA, hashes.get(0))
    check(
        "canonical /v1/run cursor trace unchanged",
        hashes.get(26) == CURSOR_SLOT2_SHA,
        hashes.get(26),
    )

    boolean_frame_status, boolean_frame_error = post_error("/v1/run", {
        "segments": [{"frames": True, "buttons": []}],
        "captureFrames": [1],
    })
    check(
        "trace frames reject JSON booleans",
        boolean_frame_status == 400 and "must be an integer" in boolean_frame_error["error"],
        (boolean_frame_status, boolean_frame_error),
    )

    boolean_capture_status, boolean_capture_error = post_error("/v1/run", {
        "segments": [{"frames": 1, "buttons": []}],
        "captureFrames": [True],
    })
    check(
        "capture frames reject JSON booleans",
        boolean_capture_status == 400 and "capture frame" in boolean_capture_error["error"],
        (boolean_capture_status, boolean_capture_error),
    )

    arbitrary = post("/v1/battle-lab/run", scenario(
        "factoryLegal",
        [110, 111, 112],
        [113, 114, 115],
    ))
    setup = arbitrary["battleLab"]
    state = arbitrary["captures"][0]["state"]
    check("Factory party was source-initialized", setup["sourceInitialized"] is True)
    check(
        "arbitrary player set reached gBattleMons",
        state["battlers"]["player"]["species"] == setup["player"][0]["species"],
        (state["battlers"]["player"]["species"], setup["player"][0]["species"]),
    )
    check(
        "arbitrary opponent set reached gBattleMons",
        state["battlers"]["opponent"]["species"] == setup["opponent"][0]["species"],
        (state["battlers"]["opponent"]["species"], setup["opponent"][0]["species"]),
    )

    pre_checkpoint = post("/v1/battle-lab/run", scenario(
        "factoryLegal",
        [110, 111, 112],
        [113, 114, 115],
        preCheckpointCaptureFrames=[0, 1000, 1886],
    ))
    pre_captures = {
        capture["frame"]: capture
        for capture in pre_checkpoint["battleLab"]["preCheckpointCaptures"]
    }
    check(
        "pre-checkpoint captures land at exactly the requested frames",
        sorted(pre_captures) == [0, 1000, 1886],
        sorted(pre_captures),
    )
    check(
        "pre-checkpoint frame zero is the untouched canonical anchor",
        pre_captures[0]["sha256"] == CANONICAL_SHA,
        pre_captures[0]["sha256"],
    )
    check(
        "pre-checkpoint captures carry PNG and semantic state",
        (
            len(pre_captures[1886]["pngBase64"]) > 0,
            "battlers" in pre_captures[1886]["state"],
        ) == (True, True),
        list(pre_captures[1886].keys()),
    )

    no_pre_checkpoint = post("/v1/battle-lab/run", scenario(
        "factoryLegal",
        [110, 111, 112],
        [113, 114, 115],
    ))
    check(
        "omitting preCheckpointCaptureFrames produces none, by default",
        no_pre_checkpoint["battleLab"]["preCheckpointCaptures"] == [],
        no_pre_checkpoint["battleLab"]["preCheckpointCaptures"],
    )
    check(
        "requesting pre-checkpoint captures does not perturb the post-checkpoint contract",
        (
            no_pre_checkpoint["captures"][0]["state"]["battlers"]["player"]["species"]
            == pre_checkpoint["captures"][0]["state"]["battlers"]["player"]["species"]
            == setup["player"][0]["species"]
        ),
        (
            no_pre_checkpoint["captures"][0]["state"]["battlers"]["player"]["species"],
            pre_checkpoint["captures"][0]["state"]["battlers"]["player"]["species"],
        ),
    )

    dense_pre_checkpoint = post("/v1/battle-lab/run", scenario(
        "factoryLegal",
        [110, 111, 112],
        [113, 114, 115],
        preCheckpointCaptureAllFrames=True,
    ))
    dense_captures = dense_pre_checkpoint["battleLab"]["preCheckpointCaptures"]
    dense_frames = [capture["frame"] for capture in dense_captures]
    check(
        "preCheckpointCaptureAllFrames captures every internal frame densely",
        (
            dense_frames == list(range(len(dense_frames))),
            len(dense_frames) > 1886,
            dense_captures[0]["sha256"] == CANONICAL_SHA,
        ) == (True, True, True),
        {"count": len(dense_frames), "last": dense_frames[-1] if dense_frames else None},
    )

    both_fields_status, both_fields_error = post_error("/v1/battle-lab/run", scenario(
        "factoryLegal",
        [110, 111, 112],
        [113, 114, 115],
        preCheckpointCaptureAllFrames=True,
        preCheckpointCaptureFrames=[0],
    ))
    check(
        "preCheckpointCaptureAllFrames rejects combination with an explicit list",
        both_fields_status == 400 and "mutually exclusive" in both_fields_error["error"],
        (both_fields_status, both_fields_error),
    )

    ranked_rentals = post("/v1/battle-lab/run", scenario(
        "factoryLegal",
        [189, 202, 147],
        [198, 192, 120],
        rentalSwapCount=15,
        seed=235929350,
    ))
    ranked_setup = ranked_rentals["battleLab"]
    ranked_state = ranked_rentals["captures"][0]["state"]
    check(
        "past rentals unlock the source's higher-band candidate slot",
        (
            ranked_setup["rentalRank"],
            ranked_setup["selectedRentalPositions"],
            [mon["setId"] for mon in ranked_setup["rentalCandidates"][:3]],
        ) == (1, [1, 0, 2], [202, 189, 147]),
        ranked_setup,
    )
    check(
        "nontrivial rental-slot order preserves the requested lead",
        ranked_state["battlers"]["player"]["species"]
        == ranked_setup["player"][0]["species"],
        (
            ranked_state["battlers"]["player"]["species"],
            ranked_setup["player"][0]["species"],
        ),
    )

    wrapped_rentals = post("/v1/battle-lab/run", scenario(
        "factoryLegal",
        [110, 111, 112],
        [113, 114, 115],
        rentalSwapCount=256,
    ))
    check(
        "rental rank preserves Emerald's u16-to-u8 truncation",
        (
            wrapped_rentals["battleLab"]["rentalSwapCount"],
            wrapped_rentals["battleLab"]["rentalRank"],
            wrapped_rentals["battleLab"]["selectedRentalPositions"],
        ) == (256, 0, [0, 1, 2]),
        wrapped_rentals["battleLab"],
    )

    variable_intro = post("/v1/battle-lab/run", scenario(
        "factoryLegal",
        [189, 147, 155],
        [198, 192, 120],
        seed=235929350,
    ))
    intro_state = variable_intro["captures"][0]["state"]
    check(
        "variable entrance hooks finish before lab frame zero",
        (
            intro_state["engine"]["playerControllerCommand"],
            intro_state["engine"]["controllerExecFlags"],
        ) == (18, 1),
        intro_state["engine"],
    )
    check(
        "semantic state exposes all eight ROM stat-stage slots",
        len(intro_state["battlers"]["player"]["statStages"]) == 8,
        intro_state["battlers"]["player"]["statStages"],
    )

    def custom_mon(species: int, **changes) -> dict:
        value = {
            "species": species,
            "moves": [150, 150, 150, 150],  # Force the ordinary AI to Splash.
        }
        value.update(changes)
        return value

    custom_party = post("/v1/battle-lab/run", scenario(
        "mechanicLab",
        [110, 111, 112],
        [113, 114, 115],
        overrides={
            "parties": {
                "player": [
                    custom_mon(
                        25,  # PIKACHU
                        level=55,
                        nature=10,
                        ivs={
                            "hp": 31,
                            "attack": 30,
                            "defense": 29,
                            "speed": 28,
                            "spAttack": 27,
                            "spDefense": 26,
                        },
                        evs={
                            "hp": 4,
                            "attack": 252,
                            "defense": 0,
                            "speed": 252,
                            "spAttack": 0,
                            "spDefense": 0,
                        },
                        moves=[33, 73, 92, 150],
                        ppUps=[3, 2, 1, 0],
                        item=186,
                        abilitySlot=0,
                        friendship=200,
                    ),
                    custom_mon(303),  # SHEDINJA
                    custom_mon(6),  # CHARIZARD
                ],
                "opponent": [
                    custom_mon(248),  # TYRANITAR / Sand Stream
                    custom_mon(202),  # WOBBUFFET
                    custom_mon(94),  # GENGAR
                ],
            }
        },
    ))
    custom_setup = custom_party["battleLab"]
    custom_state = custom_party["captures"][0]["state"]
    check(
        "mechanicLab builds both complete parties before battle initialization",
        (
            custom_setup["customPartiesBuiltBeforeBattle"],
            [mon["species"] for mon in custom_state["parties"]["player"]],
            [mon["species"] for mon in custom_state["parties"]["opponent"]],
            [
                mon["checksumValid"]
                for side in custom_state["parties"].values()
                for mon in side
            ],
        ) == (
            True,
            [25, 303, 6],
            [248, 202, 94],
            [True] * 6,
        ),
        custom_state["parties"],
    )
    check(
        "ROM-derived custom stats, PP, ability, and types reach the active battler",
        (
            custom_state["battlers"]["player"]["species"],
            custom_state["battlers"]["player"]["level"],
            custom_state["battlers"]["player"]["pp"],
            custom_state["battlers"]["player"]["ability"],
            custom_state["battlers"]["player"]["types"],
            custom_state["battlers"]["player"]["friendship"],
        ) == (25, 55, [56, 14, 12, 40], 9, [13, 13], 200),
        custom_state["battlers"]["player"],
    )
    check(
        "pre-battle construction runs the lead's normal entry ability",
        (
            custom_state["battlers"]["opponent"]["species"],
            custom_state["battlers"]["opponent"]["ability"],
            custom_state["weather"],
        ) == (248, 45, 24),
        custom_state,
    )

    edge_matrix = post("/v1/battle-lab/run", scenario(
        "mechanicLab",
        [110, 111, 112],
        [113, 114, 115],
        seed=0xDEADBEEF,
        overrides={
            "parties": {
                "player": [
                    custom_mon(
                        392,  # RALTS
                        level=1,
                        nature=24,
                        abilitySlot=1,  # Trace
                        gender="female",
                        shiny=True,
                        moves=[166, 150, 150, 150],  # Sketch has one base PP.
                        ppUps=[0, 0, 0, 0],
                        evs={
                            "hp": 255,
                            "attack": 255,
                            "defense": 0,
                            "speed": 0,
                            "spAttack": 0,
                            "spDefense": 0,
                        },
                    ),
                    custom_mon(
                        303,  # SHEDINJA
                        level=100,
                        gender="genderless",
                        shiny=True,
                        evs={
                            "hp": 255,
                            "attack": 255,
                            "defense": 0,
                            "speed": 0,
                            "spAttack": 0,
                            "spDefense": 0,
                        },
                    ),
                    custom_mon(
                        29,  # NIDORAN_F
                        level=100,
                        gender="female",
                    ),
                ],
                "opponent": [
                    custom_mon(
                        81,  # MAGNEMITE
                        abilitySlot=1,  # Sturdy
                        gender="genderless",
                    ),
                    custom_mon(128, gender="male"),  # TAUROS
                    custom_mon(201, gender="genderless"),  # UNOWN
                ],
            }
        },
    ))
    edge_state = edge_matrix["captures"][0]["state"]
    edge_player = edge_state["parties"]["player"]
    edge_opponent = edge_state["parties"]["opponent"]
    check(
        "shiny rare-gender level-1 lead preserves max EVs and one-PP move",
        (
            edge_player[0]["species"],
            edge_player[0]["level"],
            edge_player[0]["experience"],
            edge_player[0]["nature"],
            sum(edge_player[0]["evs"].values()),
            edge_player[0]["pp"][0],
            edge_player[0]["abilitySlot"],
            edge_player[0]["ability"],
            edge_player[0]["gender"],
            edge_player[0]["shiny"],
            edge_player[0]["checksumValid"],
        ) == (392, 1, 1, 24, 510, 1, 1, 36, "female", True, True),
        edge_player[0],
    )
    check(
        "Trace entry hook copies a secondary-slot Sturdy ability normally",
        (
            edge_state["battlers"]["player"]["ability"],
            edge_player[0]["ability"],
            edge_state["battlers"]["opponent"]["ability"],
            edge_opponent[0]["abilitySlot"],
            edge_opponent[0]["ability"],
        ) == (5, 36, 5, 1, 5),
        {
            "player": edge_state["battlers"]["player"],
            "opponent": edge_state["battlers"]["opponent"],
            "parties": edge_state["parties"],
        },
    )
    check(
        "level-100 shiny Shedinja keeps source experience and exactly one HP",
        (
            edge_player[1]["species"],
            edge_player[1]["level"],
            edge_player[1]["experience"],
            sum(edge_player[1]["evs"].values()),
            edge_player[1]["hp"],
            edge_player[1]["maxHp"],
            edge_player[1]["gender"],
            edge_player[1]["shiny"],
        ) == (303, 100, 600000, 510, 1, 1, "genderless", True),
        edge_player[1],
    )
    check(
        "fixed and genderless species accept only their real personality classes",
        (
            edge_player[2]["species"],
            edge_player[2]["gender"],
            [(mon["species"], mon["gender"]) for mon in edge_opponent],
            all(
                mon["checksumValid"]
                for side in edge_state["parties"].values()
                for mon in side
            ),
        ) == (
            29,
            "female",
            [(81, "genderless"), (128, "male"), (201, "genderless")],
            True,
        ),
        edge_state["parties"],
    )

    switch_result = post("/v1/battle-lab/run", scenario(
        "mechanicLab",
        [110, 111, 112],
        [113, 114, 115],
        overrides={
            "parties": {
                "player": [
                    custom_mon(25),
                    custom_mon(303),
                    custom_mon(6),
                ],
                "opponent": [
                    custom_mon(94),
                    custom_mon(202),
                    custom_mon(248),
                ],
            }
        },
        trace={
            "segments": [
                {"frames": 2, "buttons": ["DOWN"]},
                {"frames": 30, "buttons": []},
                {"frames": 2, "buttons": ["A"]},
                {"frames": 100, "buttons": []},
                {"frames": 2, "buttons": ["RIGHT"]},
                {"frames": 30, "buttons": []},
                {"frames": 2, "buttons": ["A"]},
                {"frames": 30, "buttons": []},
                {"frames": 2, "buttons": ["A"]},
                {"frames": 900, "buttons": []},
            ],
            "captureFrames": [0, 1100],
        },
    ))
    switch_before, switch_after = (
        capture["state"] for capture in switch_result["captures"]
    )
    check(
        "ordinary party-menu switching reconstructs from the custom bench",
        (
            switch_before["battlers"]["player"]["partyIndex"],
            switch_before["battlers"]["player"]["species"],
            switch_after["battlers"]["player"]["partyIndex"],
            switch_after["battlers"]["player"]["species"],
            [mon["species"] for mon in switch_after["parties"]["player"]],
            [mon["checksumValid"] for mon in switch_after["parties"]["player"]],
        ) == (0, 25, 1, 303, [25, 303, 6], [True, True, True]),
        {"before": switch_before, "after": switch_after},
    )
    check(
        "forced opponent loadout produces a controlled stock-ROM action",
        (
            sum(switch_before["battlers"]["opponent"]["pp"]),
            sum(switch_after["battlers"]["opponent"]["pp"]),
            set(switch_after["battlers"]["opponent"]["moves"]),
        ) == (160, 159, {150}),
        {
            "before": switch_before["battlers"]["opponent"],
            "after": switch_after["battlers"]["opponent"],
        },
    )

    boolean_schema = scenario(
        "factoryLegal",
        [110, 111, 112],
        [113, 114, 115],
        schemaVersion=True,
    )
    boolean_schema_status, boolean_schema_error = post_error(
        "/v1/battle-lab/run",
        boolean_schema,
    )
    check(
        "battle-lab schema version rejects JSON booleans",
        boolean_schema_status == 400 and "must be an integer" in boolean_schema_error["error"],
        (boolean_schema_status, boolean_schema_error),
    )

    injected_weather = scenario(
        "mechanicLab",
        [110, 111, 112],
        [113, 114, 115],
        overrides={"weather": "rain"},
    )
    injected_weather_status, injected_weather_error = post_error(
        "/v1/battle-lab/run",
        injected_weather,
    )
    check(
        "mechanicLab rejects direct weather injection",
        (
            injected_weather_status == 400
            and "unknown overrides: weather" in injected_weather_error["error"]
        ),
        (injected_weather_status, injected_weather_error),
    )

    mechanic = scenario(
        "mechanicLab",
        [188, 184, 135],  # GROVYLE first
        [156, 149, 180],  # ONIX first
        overrides={
            "battlers": {
                "player": {
                    "moves": [73, 33, 33, 33],  # LEech Seed, then Tackle
                    "ppUps": [3, 0, 0, 0],
                },
            },
        },
        trace={
            "segments": [
                {"frames": 2, "buttons": ["A"]},
                {"frames": 30, "buttons": []},
                {"frames": 2, "buttons": ["A"]},
                {"frames": 1000, "buttons": []},
            ],
            "captureFrames": [0, 1034],
        },
    )
    result = post("/v1/battle-lab/run", mechanic)
    before, after = result["captures"]
    before_state, after_state = before["state"], after["state"]
    check(
        "mechanicLab staged move slots",
        (
            before_state["battlers"]["player"]["moves"][0],
            before_state["battlers"]["player"]["ppUps"][0],
            before_state["battlers"]["player"]["pp"][0],
        ) == (73, 3, 16),
        before_state["battlers"]["player"],
    )
    check(
        "stock ROM consumed Leech Seed PP",
        (
            before_state["battlers"]["player"]["pp"][0],
            after_state["battlers"]["player"]["pp"][0],
        ) == (16, 15),
        (
            before_state["battlers"]["player"]["pp"][0],
            after_state["battlers"]["player"]["pp"][0],
        ),
    )
    check(
        "stock ROM applied Leech Seed volatile",
        (
            bool(after_state["battlers"]["opponent"]["status3"] & (1 << 2)),
            after_state["battlers"]["opponent"]["volatile"]["leechSeededBy"],
        ) == (True, "player"),
        after_state["battlers"]["opponent"],
    )
    check(
        "stock ROM executed end-turn Leech Seed drain",
        after_state["battlers"]["opponent"]["hp"] < before_state["battlers"]["opponent"]["hp"],
        (
            before_state["battlers"]["opponent"]["hp"],
            after_state["battlers"]["opponent"]["hp"],
        ),
    )

    swords_dance = scenario(
        "mechanicLab",
        [539, 469, 477],
        [499, 474, 512],
        trainerId=150,
        challengeNum=4,
        battleNum=4,
        seed=381263025,
        overrides={
            "battlers": {
                "player": {
                    "moves": [14, 33, 33, 33],  # Swords Dance, then Tackle
                    "ppUps": [0, 0, 0, 0],
                },
                "opponent": {
                    "moves": [150, 150, 150, 150],  # Splash
                    "ppUps": [0, 0, 0, 0],
                    "ability": 0,
                },
            },
        },
        trace={
            "segments": [
                {"frames": 2, "buttons": ["A"]},
                {"frames": 30, "buttons": []},
                {"frames": 2, "buttons": ["A"]},
                {"frames": 700, "buttons": []},
            ],
            "captureFrames": [0, 734],
        },
    )
    dance_result = post("/v1/battle-lab/run", swords_dance)
    dance_before, dance_after = (
        capture["state"] for capture in dance_result["captures"]
    )
    check(
        "stock ROM applies Swords Dance to the Attack stage",
        (
            dance_before["battlers"]["player"]["statStages"][1],
            dance_after["battlers"]["player"]["statStages"][1],
        ) == (6, 8),
        (
            dance_before["battlers"]["player"]["statStages"],
            dance_after["battlers"]["player"]["statStages"],
        ),
    )

    def confuse_with_ability(ability: int) -> tuple[dict, dict]:
        result = post("/v1/battle-lab/run", scenario(
            "mechanicLab",
            [274, 354, 338],
            [291, 339, 327],
            trainerId=110,
            challengeNum=2,
            battleNum=2,
            seed=948121078,
            overrides={
                "battlers": {
                    "player": {
                        "moves": [109, 33, 33, 33],  # Confuse Ray
                        "ppUps": [0, 0, 0, 0],
                    },
                    "opponent": {
                        "moves": [150, 150, 150, 150],  # Splash
                        "ppUps": [0, 0, 0, 0],
                        "ability": ability,
                    },
                },
            },
            trace={
                "segments": [
                    {"frames": 2, "buttons": ["A"]},
                    {"frames": 30, "buttons": []},
                    {"frames": 2, "buttons": ["A"]},
                    {"frames": 866, "buttons": []},
                ],
                "captureFrames": [0, 900],
            },
        ))
        return tuple(capture["state"] for capture in result["captures"])

    confusion_before, confusion_after = confuse_with_ability(0)
    check(
        "Confuse Ray creates confusion through the stock ROM",
        (
            confusion_before["battlers"]["player"]["pp"][0],
            confusion_after["battlers"]["player"]["pp"][0],
            confusion_after["battlers"]["opponent"]["volatile"]["confusionTurns"],
        ) == (10, 9, 2),
        (
            confusion_before["battlers"]["player"]["pp"],
            confusion_after["battlers"]["player"]["pp"],
            confusion_after["battlers"]["opponent"]["volatile"],
        ),
    )

    tempo_before, tempo_after = confuse_with_ability(20)  # Own Tempo
    check(
        "staged Own Tempo blocks stock-ROM Confuse Ray",
        (
            tempo_before["battlers"]["player"]["pp"][0],
            tempo_after["battlers"]["player"]["pp"][0],
            tempo_after["battlers"]["opponent"]["volatile"]["confusionTurns"],
        ) == (10, 9, 0),
        (
            tempo_before["battlers"]["player"]["pp"],
            tempo_after["battlers"]["player"]["pp"],
            tempo_after["battlers"]["opponent"]["volatile"],
        ),
    )

    def move_with_loadout(
        move: int,
        *,
        player: dict | None = None,
        opponent: dict | None = None,
    ) -> tuple[dict, dict]:
        player_loadout = {
            "moves": [move, 150, 150, 150],
            "ppUps": [0, 0, 0, 0],
        }
        player_loadout.update(player or {})
        opponent_loadout = {
            "moves": [150, 150, 150, 150],
            "ppUps": [0, 0, 0, 0],
            "ability": 0,
        }
        opponent_loadout.update(opponent or {})
        result = post("/v1/battle-lab/run", scenario(
            "mechanicLab",
            [274, 354, 338],
            [291, 339, 327],
            trainerId=110,
            challengeNum=2,
            battleNum=2,
            seed=948121078,
            overrides={
                "battlers": {
                    "player": player_loadout,
                    "opponent": opponent_loadout,
                },
            },
            trace={
                "segments": [
                    {"frames": 2, "buttons": ["A"]},
                    {"frames": 30, "buttons": []},
                    {"frames": 2, "buttons": ["A"]},
                    {"frames": 866, "buttons": []},
                ],
                "captureFrames": [0, 900],
            },
        ))
        return tuple(capture["state"] for capture in result["captures"])

    ai_before, ai_after = move_with_loadout(
        150,  # Splash
        opponent={
            "moves": [85, 150, 150, 150],  # Thunderbolt, then Splash
            "ppUps": [0, 0, 0, 0],
            "ability": 22,  # Intimidate, whose already-passed entry hook stays passed
        },
    )
    check(
        "opponent AI chooses from the staged first-turn loadout",
        (
            ai_before["battlers"]["opponent"]["pp"],
            ai_after["battlers"]["opponent"]["pp"],
            ai_after["battlers"]["player"]["hp"]
            < ai_before["battlers"]["player"]["hp"],
            ai_before["battlers"]["opponent"]["ability"],
            ai_before["battlers"]["player"]["statStages"][1],
        ) == ([15, 40, 40, 40], [14, 40, 40, 40], True, 22, 6),
        {
            "before": ai_before,
            "after": ai_after,
        },
    )

    immune_before, immune_after = move_with_loadout(
        150,  # Splash
        player={"types": [4, 4]},  # Ground
        opponent={
            "moves": [85, 85, 85, 33],  # Thunderbolt x3, Tackle
            "ppUps": [0, 0, 0, 0],
        },
    )
    check(
        "Factory bad-move AI rejects an immune staged move",
        (
            immune_before["battlers"]["opponent"]["pp"],
            immune_after["battlers"]["opponent"]["pp"],
        ) == ([15, 15, 15, 35], [15, 15, 15, 34]),
        {
            "before": immune_before,
            "after": immune_after,
        },
    )

    high_tier = scenario(
        "mechanicLab",
        [468, 469, 470],
        [471, 473, 474],
        trainerId=160,
        challengeNum=4,
        seed=0,
        overrides={
            "battlers": {
                "player": {
                    "moves": [150, 150, 150, 150],  # Splash
                    "ppUps": [0, 0, 0, 0],
                    "ability": 0,
                    "types": [0, 0],
                },
                "opponent": {
                    "moves": [33, 63, 150, 150],  # Tackle, Hyper Beam, Splash x2
                    "ppUps": [0, 0, 0, 0],
                    "ability": 0,
                    "types": [0, 0],
                    "item": 0,
                },
            },
        },
        trace={
            "segments": [
                {"frames": 2, "buttons": ["A"]},
                {"frames": 30, "buttons": []},
                {"frames": 2, "buttons": ["A"]},
                {"frames": 1166, "buttons": []},
            ],
            "captureFrames": [0, 1200],
        },
    )
    high_tier_result = post("/v1/battle-lab/run", high_tier)
    high_tier_before, high_tier_after = (
        capture["state"] for capture in high_tier_result["captures"]
    )
    check(
        "high-tier Factory AI takes a guaranteed finishing move",
        (
            high_tier_before["battlers"]["opponent"]["pp"],
            high_tier_after["battlers"]["opponent"]["pp"],
            high_tier_before["battlers"]["player"]["hp"],
            high_tier_after["battlers"]["player"]["hp"],
        ) == ([35, 5, 40, 40], [35, 4, 40, 40], 102, 0),
        {
            "before": high_tier_before,
            "after": high_tier_after,
        },
    )

    status_aware = scenario(
        "mechanicLab",
        [468, 469, 470],
        [471, 473, 474],
        trainerId=160,
        challengeNum=4,
        seed=0,
        overrides={
            "battlers": {
                "player": {
                    "moves": [150, 150, 150, 150],  # Splash
                    "ppUps": [0, 0, 0, 0],
                    "ability": 0,
                    "types": [7, 7],  # Ghost makes Tackle another bad choice.
                },
                "opponent": {
                    "moves": [92, 33, 150, 150],  # Toxic, Tackle, Splash x2
                    "ppUps": [0, 0, 0, 0],
                    "ability": 0,
                    "types": [0, 0],
                    "item": 0,
                },
            },
        },
        trace={
            "segments": [
                {"frames": 2, "buttons": ["A"]},
                {"frames": 30, "buttons": []},
                {"frames": 2, "buttons": ["A"]},
                {"frames": 1166, "buttons": []},
                {"frames": 2, "buttons": ["A"]},
                {"frames": 30, "buttons": []},
                {"frames": 2, "buttons": ["A"]},
                {"frames": 1166, "buttons": []},
            ],
            "captureFrames": [0, 1200, 2400],
        },
    )
    status_aware_result = post("/v1/battle-lab/run", status_aware)
    status_before, status_turn_one, status_turn_two = (
        capture["state"] for capture in status_aware_result["captures"]
    )
    check(
        "high-tier Factory AI does not repeat Toxic into existing status",
        (
            status_before["battlers"]["opponent"]["pp"],
            status_turn_one["battlers"]["opponent"]["pp"],
            status_turn_two["battlers"]["opponent"]["pp"],
            status_turn_one["battlers"]["player"]["status"],
            status_turn_two["battlers"]["player"]["status"],
        ) == (
            [10, 35, 40, 40],
            [9, 35, 40, 40],
            [9, 35, 40, 39],
            {"kind": "toxic", "counter": 1},
            {"kind": "toxic", "counter": 2},
        ),
        {
            "before": status_before,
            "turnOne": status_turn_one,
            "turnTwo": status_turn_two,
        },
    )

    no_item_before, no_item_after = move_with_loadout(33, player={"item": 0})
    band_before, band_after = move_with_loadout(
        33,
        player={"item": 186},  # Choice Band
    )
    no_item_damage = (
        no_item_before["battlers"]["opponent"]["hp"]
        - no_item_after["battlers"]["opponent"]["hp"]
    )
    band_damage = (
        band_before["battlers"]["opponent"]["hp"]
        - band_after["battlers"]["opponent"]["hp"]
    )
    check(
        "staged Choice Band affects stock-ROM damage calculation",
        (
            no_item_before["battlers"]["player"]["item"],
            band_before["battlers"]["player"]["item"],
            no_item_before["battlers"]["player"]["stats"]["attack"],
            band_before["battlers"]["player"]["stats"]["attack"],
            no_item_before["battlers"]["player"]["pp"][0],
            no_item_after["battlers"]["player"]["pp"][0],
            band_before["battlers"]["player"]["pp"][0],
            band_after["battlers"]["player"]["pp"][0],
            band_damage > no_item_damage,
        ) == (0, 186, 39, 39, 35, 34, 35, 34, True),
        {
            "noItemDamage": no_item_damage,
            "choiceBandDamage": band_damage,
            "noItemBefore": no_item_before["battlers"]["player"],
            "choiceBandBefore": band_before["battlers"]["player"],
        },
    )

    normal_before, normal_after = move_with_loadout(
        33,  # Tackle
        opponent={"types": [0, 0]},  # Normal
    )
    ghost_before, ghost_after = move_with_loadout(
        33,
        opponent={"types": [7, 7]},  # Ghost
    )
    normal_damage = (
        normal_before["battlers"]["opponent"]["hp"]
        - normal_after["battlers"]["opponent"]["hp"]
    )
    ghost_damage = (
        ghost_before["battlers"]["opponent"]["hp"]
        - ghost_after["battlers"]["opponent"]["hp"]
    )
    check(
        "staged types participate in stock-ROM effectiveness",
        (
            normal_before["battlers"]["opponent"]["types"],
            ghost_before["battlers"]["opponent"]["types"],
            normal_damage > 0,
            ghost_damage,
            ghost_before["battlers"]["player"]["pp"][0],
            ghost_after["battlers"]["player"]["pp"][0],
        ) == ([0, 0], [7, 7], True, 0, 35, 34),
        {
            "normalDamage": normal_damage,
            "ghostDamage": ghost_damage,
            "normalTypes": normal_before["battlers"]["opponent"]["types"],
            "ghostTypes": ghost_before["battlers"]["opponent"]["types"],
        },
    )

    return_low_before, return_low_after = move_with_loadout(
        216,  # Return
        player={"friendship": 0},
    )
    return_high_before, return_high_after = move_with_loadout(
        216,
        player={"friendship": 255},
    )
    return_low_damage = (
        return_low_before["battlers"]["opponent"]["hp"]
        - return_low_after["battlers"]["opponent"]["hp"]
    )
    return_high_damage = (
        return_high_before["battlers"]["opponent"]["hp"]
        - return_high_after["battlers"]["opponent"]["hp"]
    )
    check(
        "staged friendship participates in stock-ROM Return power",
        (
            return_low_before["battlers"]["player"]["friendship"],
            return_high_before["battlers"]["player"]["friendship"],
            return_high_damage > return_low_damage,
        ) == (0, 255, True),
        {
            "zeroFriendshipDamage": return_low_damage,
            "maxFriendshipDamage": return_high_damage,
        },
    )

    spikes_before, spikes_after = move_with_loadout(191)  # Spikes
    check(
        "semantic snapshot reads the padded opponent SideTimer row",
        (
            spikes_before["sideConditions"]["opponent"]["spikes"],
            spikes_after["sideConditions"]["opponent"]["spikes"],
            bool(spikes_after["sideStatuses"][1] & (1 << 4)),
            spikes_before["battlers"]["player"]["pp"][0],
            spikes_after["battlers"]["player"]["pp"][0],
        ) == (0, 1, True, 20, 19),
        {
            "before": spikes_before["sideConditions"],
            "after": spikes_after["sideConditions"],
            "sideStatuses": spikes_after["sideStatuses"],
        },
    )

    toxic = scenario(
        "mechanicLab",
        [274, 354, 338],
        [291, 339, 327],
        trainerId=110,
        challengeNum=2,
        battleNum=2,
        seed=1,
        overrides={
            "battlers": {
                "player": {
                    "moves": [92, 33, 33, 33],  # Toxic
                    "ppUps": [0, 0, 0, 0],
                },
                "opponent": {
                    "moves": [150, 150, 150, 150],
                    "ppUps": [0, 0, 0, 0],
                    "ability": 0,
                },
            },
        },
        trace={
            "segments": [
                {"frames": 2, "buttons": ["A"]},
                {"frames": 30, "buttons": []},
                {"frames": 2, "buttons": ["A"]},
                {"frames": 1200, "buttons": []},
            ],
            "captureFrames": [0, 1234],
        },
    )
    toxic_result = post("/v1/battle-lab/run", toxic)
    toxic_before, toxic_after = (
        capture["state"] for capture in toxic_result["captures"]
    )
    check(
        "Toxic creates named status and residual damage through the stock ROM",
        (
            toxic_before["battlers"]["opponent"]["status"],
            toxic_after["battlers"]["opponent"]["status"],
            toxic_after["battlers"]["opponent"]["hp"]
            < toxic_before["battlers"]["opponent"]["hp"],
        ) == ({"kind": "none"}, {"kind": "toxic", "counter": 1}, True),
        (toxic_before, toxic_after),
    )

    rain_dance = scenario(
        "mechanicLab",
        [274, 354, 338],
        [291, 339, 327],
        trainerId=110,
        challengeNum=2,
        battleNum=2,
        seed=948121078,
        overrides={
            "battlers": {
                "player": {
                    "moves": [240, 33, 33, 33],  # Rain Dance
                    "ppUps": [0, 0, 0, 0],
                },
                "opponent": {
                    "moves": [150, 150, 150, 150],
                    "ppUps": [0, 0, 0, 0],
                    "ability": 0,
                },
            },
        },
        trace={
            "segments": [
                {"frames": 2, "buttons": ["A"]},
                {"frames": 30, "buttons": []},
                {"frames": 2, "buttons": ["A"]},
                {"frames": 866, "buttons": []},
            ],
            "captureFrames": [0, 900],
        },
    )
    rain_result = post("/v1/battle-lab/run", rain_dance)
    rain_before, rain_after = (
        capture["state"] for capture in rain_result["captures"]
    )
    check(
        "Rain Dance creates weather through the stock-ROM move script",
        (
            rain_before["weather"],
            rain_before["weatherTurns"],
            rain_after["weather"],
            rain_after["weatherTurns"],
        ) == (0, 0, 1, 4),
        (
            rain_before["weather"],
            rain_before["weatherTurns"],
            rain_after["weather"],
            rain_after["weatherTurns"],
        ),
    )

    perish_song = scenario(
        "mechanicLab",
        [274, 354, 338],
        [291, 339, 327],
        trainerId=110,
        challengeNum=2,
        battleNum=2,
        seed=948121078,
        overrides={
            "battlers": {
                "player": {
                    "moves": [195, 33, 33, 33],  # Perish Song
                    "ppUps": [0, 0, 0, 0],
                },
                "opponent": {
                    "moves": [150, 150, 150, 150],
                    "ppUps": [0, 0, 0, 0],
                    "ability": 0,
                },
            },
        },
        trace={
            "segments": [
                {"frames": 2, "buttons": ["A"]},
                {"frames": 30, "buttons": []},
                {"frames": 2, "buttons": ["A"]},
                {"frames": 866, "buttons": []},
            ],
            "captureFrames": [0, 900],
        },
    )
    perish_result = post("/v1/battle-lab/run", perish_song)
    perish_before, perish_after = (
        capture["state"] for capture in perish_result["captures"]
    )
    check(
        "Perish Song creates both counters through the stock-ROM move script",
        (
            perish_before["battlers"]["player"]["volatile"]["perishSongTurns"],
            perish_before["battlers"]["opponent"]["volatile"]["perishSongTurns"],
            perish_after["battlers"]["player"]["volatile"]["perishSongTurns"],
            perish_after["battlers"]["opponent"]["volatile"]["perishSongTurns"],
        ) == (0, 0, 2, 2),
        (perish_before, perish_after),
    )

    if failures:
        print(f"\nbattle-lab smoke test FAILED ({len(failures)}): {', '.join(failures)}")
        sys.exit(1)
    print("\nbattle-lab smoke test passed")


if __name__ == "__main__":
    main()
