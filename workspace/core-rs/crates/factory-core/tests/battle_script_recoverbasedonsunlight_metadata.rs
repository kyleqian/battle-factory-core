//! Independent source-metadata, corpus-identity, and census ratchets for the
//! recover-based-on-sunlight leaf. Behavioral replay lives in the sibling
//! vectors test binary so neither gate can silently substitute for the other.

use factory_core::battle_script_recoverbasedonsunlight::*;
use factory_core::battle_script_recoverbasedonsunlight_vectors_gen::*;

#[test]
fn source_dispatch_body_pointer_macro_aliases_and_constants_are_exact() {
    assert_eq!(
        BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_METADATA,
        (
            0xc0,
            "Cmd_recoverbasedonsunlight",
            1187,
            1737,
            994,
            996,
            4,
            5,
            [1184, 1184, 1184],
            1424,
        )
    );
    assert_eq!(
        BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_OPCODE_NAME,
        "B_SCR_OP_RECOVERBASEDONSUNLIGHT"
    );
    assert_eq!(BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_OPCODE, 0xc0);
    assert_eq!(
        BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_DISPATCHER,
        "Cmd_recoverbasedonsunlight"
    );
    assert_eq!(BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_POINTER_WIDTH_BYTES, 4);
    assert_eq!(BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_ENCODED_WIDTH_BYTES, 5);
    assert_eq!(
        BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_EFFECT_LABELS,
        [
            "BattleScript_EffectMorningSun",
            "BattleScript_EffectSynthesis",
            "BattleScript_EffectMoonlight",
        ]
    );
    assert_eq!(BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_ABILITY_CLOUD_NINE, 13);
    assert_eq!(BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_ABILITY_AIR_LOCK, 77);
    assert_eq!(BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_WEATHER_SUN, 0x60);
}

#[test]
fn every_domain_and_category_census_is_independently_exact() {
    assert_eq!(
        BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_DOMAIN_CENSUS,
        [
            ("u16-max-hp", 65_536),
            ("arithmetic-regimes", 4),
            ("full-lower-higher-handler-applications", 786_424),
            ("selector-alias-matrix", 500),
            ("weather-mask-values", 9),
            ("ability-placement-cases", 64),
            ("registration-cases", 5),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_CATEGORY_CENSUS,
        [
            ("ability-placement-presence-absence", 64),
            ("error-order", 1),
            ("hp-equality-boundaries", 216),
            ("late-label-resolution", 2),
            ("prior-signed-damage", 14),
            ("repetitions", 2),
            ("selector-alias-matrix", 500),
            ("weather-u32-masks", 9),
        ]
    );
    assert_eq!(BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_CASES.len(), 808);
    assert_eq!(
        BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_REGISTRATION_CASES.len(),
        5
    );
}

#[test]
fn corpus_proof_and_generated_artifact_identity_are_pinned() {
    assert_eq!(
        BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_RAW_PROOF_SHA256,
        "1b0e5b8f555a7b0ec7c60c9b2e97fa8b82a376afffd67d58ecee9e7992333599"
    );
    assert_eq!(
        BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_RAW_PROOF_BYTES,
        10_557_911
    );
    assert_eq!(
        BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_VECTOR_CORPUS_SHA256,
        "7c3adaca45202f2f310eabccb3023344ca4acbed2bbaeaeb268bff4f600fdfe4"
    );
    assert_eq!(
        BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_VECTOR_CORPUS_BYTES,
        9_065_263
    );
}
