//! Independent source/dispatch/macro/call-site/constants/corpus ratchets for
//! `Cmd_getsecretpowereffect`, read directly from `reference/pokeemerald`
//! and the canonical TypeScript module -- not from the Rust port under
//! test.

use std::{fs, path::PathBuf};

use factory_core::battle_script_getsecretpowereffect::*;
use factory_core::battle_script_getsecretpowereffect_vectors_gen::*;

fn workspace_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../..")
}

fn source(relative: &str) -> String {
    fs::read_to_string(workspace_root().join(relative))
        .unwrap_or_else(|error| panic!("could not read {relative}: {error}"))
}

fn line(source: &str, number: usize) -> &str {
    source
        .lines()
        .nth(number - 1)
        .unwrap_or_else(|| panic!("missing line {number}"))
}

#[test]
fn decomp_dispatch_and_macro_evidence_are_independent() {
    let commands = source("reference/pokeemerald/src/battle_script_commands.c");
    let macro_source = source("reference/pokeemerald/asm/macros/battle_script.inc");

    assert_eq!(
        BATTLE_SCRIPT_GETSECRETPOWEREFFECT_DECOMP_DISPATCH_EVIDENCE,
        BattleScriptGetsecretpowereffectDecompDispatchEvidence {
            opcode_name: "B_SCR_OP_GETSECRETPOWEREFFECT",
            opcode_id: 0xe4,
            dispatcher: "Cmd_getsecretpowereffect",
            dispatch_line: 559,
            forward_decl_line: 307,
            handler_line: 9619,
            switch_line: 9621,
            grass_assign_line: 9624,
            long_grass_assign_line: 9627,
            sand_assign_line: 9630,
            underwater_assign_line: 9633,
            water_assign_line: 9636,
            pond_assign_line: 9639,
            mountain_assign_line: 9642,
            cave_assign_line: 9645,
            default_assign_line: 9648,
            advance_line: 9651,
        }
    );
    assert!(line(&commands, 559)
        .contains("[B_SCR_OP_GETSECRETPOWEREFFECT]            = Cmd_getsecretpowereffect"));
    assert_eq!(
        line(&commands, 307),
        "static void Cmd_getsecretpowereffect(void);"
    );
    assert_eq!(
        line(&commands, 9619),
        "static void Cmd_getsecretpowereffect(void)"
    );
    assert_eq!(line(&commands, 9621).trim(), "switch (gBattleEnvironment)");
    assert_eq!(
        line(&commands, 9624).trim(),
        "gBattleCommunication[MOVE_EFFECT_BYTE] = MOVE_EFFECT_POISON;"
    );
    assert_eq!(
        line(&commands, 9627).trim(),
        "gBattleCommunication[MOVE_EFFECT_BYTE] = MOVE_EFFECT_SLEEP;"
    );
    assert_eq!(
        line(&commands, 9630).trim(),
        "gBattleCommunication[MOVE_EFFECT_BYTE] = MOVE_EFFECT_ACC_MINUS_1;"
    );
    assert_eq!(
        line(&commands, 9633).trim(),
        "gBattleCommunication[MOVE_EFFECT_BYTE] = MOVE_EFFECT_DEF_MINUS_1;"
    );
    assert_eq!(
        line(&commands, 9636).trim(),
        "gBattleCommunication[MOVE_EFFECT_BYTE] = MOVE_EFFECT_ATK_MINUS_1;"
    );
    assert_eq!(
        line(&commands, 9639).trim(),
        "gBattleCommunication[MOVE_EFFECT_BYTE] = MOVE_EFFECT_SPD_MINUS_1;"
    );
    assert_eq!(
        line(&commands, 9642).trim(),
        "gBattleCommunication[MOVE_EFFECT_BYTE] = MOVE_EFFECT_CONFUSION;"
    );
    assert_eq!(
        line(&commands, 9645).trim(),
        "gBattleCommunication[MOVE_EFFECT_BYTE] = MOVE_EFFECT_FLINCH;"
    );
    assert_eq!(
        line(&commands, 9648).trim(),
        "gBattleCommunication[MOVE_EFFECT_BYTE] = MOVE_EFFECT_PARALYSIS;"
    );
    assert_eq!(line(&commands, 9651).trim(), "gBattlescriptCurrInstr++;");

    assert_eq!(
        BATTLE_SCRIPT_GETSECRETPOWEREFFECT_MACRO_EVIDENCE,
        BattleScriptGetsecretpowereffectMacroEvidence {
            declaration_line: 1165,
            opcode_line: 1166,
            encoded_width_bytes: 1,
        }
    );
    assert_eq!(
        line(&macro_source, 1165).trim(),
        ".macro getsecretpowereffect"
    );
    assert_eq!(
        line(&macro_source, 1166).trim(),
        ".byte B_SCR_OP_GETSECRETPOWEREFFECT"
    );
    assert_eq!(line(&macro_source, 1167).trim(), ".endm");
}

#[test]
fn constants_expression_mapping_and_the_sole_call_site_are_exact() {
    let battle_header = source("reference/pokeemerald/include/constants/battle.h");
    let commands_header =
        source("reference/pokeemerald/include/constants/battle_script_commands.h");
    let scripts = source("reference/pokeemerald/data/battle_scripts_1.s");

    assert_eq!(
        line(&battle_header, 313).trim(),
        "#define BATTLE_ENVIRONMENT_GRASS        0"
    );
    assert_eq!(
        line(&battle_header, 314).trim(),
        "#define BATTLE_ENVIRONMENT_LONG_GRASS   1"
    );
    assert_eq!(
        line(&battle_header, 315).trim(),
        "#define BATTLE_ENVIRONMENT_SAND         2"
    );
    assert_eq!(
        line(&battle_header, 316).trim(),
        "#define BATTLE_ENVIRONMENT_UNDERWATER   3"
    );
    assert_eq!(
        line(&battle_header, 317).trim(),
        "#define BATTLE_ENVIRONMENT_WATER        4"
    );
    assert_eq!(
        line(&battle_header, 318).trim(),
        "#define BATTLE_ENVIRONMENT_POND         5"
    );
    assert_eq!(
        line(&battle_header, 319).trim(),
        "#define BATTLE_ENVIRONMENT_MOUNTAIN     6"
    );
    assert_eq!(
        line(&battle_header, 320).trim(),
        "#define BATTLE_ENVIRONMENT_CAVE         7"
    );
    assert_eq!(
        line(&battle_header, 321).trim(),
        "#define BATTLE_ENVIRONMENT_BUILDING     8"
    );
    assert_eq!(
        line(&battle_header, 322).trim(),
        "#define BATTLE_ENVIRONMENT_PLAIN        9"
    );
    assert_eq!(
        line(&battle_header, 247).trim(),
        "#define MOVE_EFFECT_SLEEP               1"
    );
    assert_eq!(
        line(&battle_header, 248).trim(),
        "#define MOVE_EFFECT_POISON              2"
    );
    assert_eq!(
        line(&battle_header, 251).trim(),
        "#define MOVE_EFFECT_PARALYSIS           5"
    );
    assert_eq!(
        line(&battle_header, 254).trim(),
        "#define MOVE_EFFECT_CONFUSION           7"
    );
    assert_eq!(
        line(&battle_header, 255).trim(),
        "#define MOVE_EFFECT_FLINCH              8"
    );
    assert_eq!(
        line(&battle_header, 269).trim(),
        "#define MOVE_EFFECT_ATK_MINUS_1         22"
    );
    assert_eq!(
        line(&battle_header, 270).trim(),
        "#define MOVE_EFFECT_DEF_MINUS_1         23"
    );
    assert_eq!(
        line(&battle_header, 271).trim(),
        "#define MOVE_EFFECT_SPD_MINUS_1         24"
    );
    assert_eq!(
        line(&battle_header, 274).trim(),
        "#define MOVE_EFFECT_ACC_MINUS_1         27"
    );
    assert_eq!(
        line(&commands_header, 292).trim(),
        "#define MOVE_EFFECT_BYTE        3"
    );

    assert_eq!(
        BATTLE_SCRIPT_GETSECRETPOWEREFFECT_CALL_SITE_EVIDENCE,
        BattleScriptGetsecretpowereffectCallSiteEvidence {
            entry_label: "BattleScript_EffectSecretPower",
            entry_label_line: 2563,
            statement_line: 2564,
            instruction_program_counter: 1835,
            goto_line: 2565,
            goto_target: "BattleScript_EffectHit",
        }
    );
    assert_eq!(scripts.matches("\tgetsecretpowereffect\n").count(), 1);
    let evidence = BATTLE_SCRIPT_GETSECRETPOWEREFFECT_CALL_SITE_EVIDENCE;
    assert_eq!(
        line(&scripts, evidence.entry_label_line as usize),
        format!("{}::", evidence.entry_label)
    );
    assert_eq!(
        line(&scripts, evidence.statement_line as usize).trim(),
        "getsecretpowereffect"
    );
    assert_eq!(
        line(&scripts, evidence.goto_line as usize).trim(),
        format!("goto {}", evidence.goto_target)
    );
}

#[test]
fn pure_environment_mapping_matches_the_documented_switch_for_every_raw_u8() {
    let explicit = [
        (
            BattleScriptGetsecretpowereffectEnvironment::Grass,
            BATTLE_SCRIPT_MOVE_EFFECT_POISON,
        ),
        (
            BattleScriptGetsecretpowereffectEnvironment::LongGrass,
            BATTLE_SCRIPT_MOVE_EFFECT_SLEEP,
        ),
        (
            BattleScriptGetsecretpowereffectEnvironment::Sand,
            BATTLE_SCRIPT_MOVE_EFFECT_ACC_MINUS_1,
        ),
        (
            BattleScriptGetsecretpowereffectEnvironment::Underwater,
            BATTLE_SCRIPT_MOVE_EFFECT_DEF_MINUS_1,
        ),
        (
            BattleScriptGetsecretpowereffectEnvironment::Water,
            BATTLE_SCRIPT_MOVE_EFFECT_ATK_MINUS_1,
        ),
        (
            BattleScriptGetsecretpowereffectEnvironment::Pond,
            BATTLE_SCRIPT_MOVE_EFFECT_SPD_MINUS_1,
        ),
        (
            BattleScriptGetsecretpowereffectEnvironment::Mountain,
            BATTLE_SCRIPT_MOVE_EFFECT_CONFUSION,
        ),
        (
            BattleScriptGetsecretpowereffectEnvironment::Cave,
            BATTLE_SCRIPT_MOVE_EFFECT_FLINCH,
        ),
    ];
    for (environment, expected) in explicit {
        assert_eq!(
            battle_script_getsecretpowereffect_move_effect_for_environment(environment.as_u8()),
            expected
        );
    }
    for raw in 0u16..=0xff {
        let raw = raw as u8;
        let expected = match BattleScriptGetsecretpowereffectEnvironment::from_u8(raw) {
            Some(BattleScriptGetsecretpowereffectEnvironment::Grass) => {
                BATTLE_SCRIPT_MOVE_EFFECT_POISON
            }
            Some(BattleScriptGetsecretpowereffectEnvironment::LongGrass) => {
                BATTLE_SCRIPT_MOVE_EFFECT_SLEEP
            }
            Some(BattleScriptGetsecretpowereffectEnvironment::Sand) => {
                BATTLE_SCRIPT_MOVE_EFFECT_ACC_MINUS_1
            }
            Some(BattleScriptGetsecretpowereffectEnvironment::Underwater) => {
                BATTLE_SCRIPT_MOVE_EFFECT_DEF_MINUS_1
            }
            Some(BattleScriptGetsecretpowereffectEnvironment::Water) => {
                BATTLE_SCRIPT_MOVE_EFFECT_ATK_MINUS_1
            }
            Some(BattleScriptGetsecretpowereffectEnvironment::Pond) => {
                BATTLE_SCRIPT_MOVE_EFFECT_SPD_MINUS_1
            }
            Some(BattleScriptGetsecretpowereffectEnvironment::Mountain) => {
                BATTLE_SCRIPT_MOVE_EFFECT_CONFUSION
            }
            Some(BattleScriptGetsecretpowereffectEnvironment::Cave) => {
                BATTLE_SCRIPT_MOVE_EFFECT_FLINCH
            }
            None => BATTLE_SCRIPT_MOVE_EFFECT_PARALYSIS,
        };
        assert_eq!(
            battle_script_getsecretpowereffect_move_effect_for_environment(raw),
            expected,
            "raw environment {raw}"
        );
    }
}

#[test]
fn deterministic_corpus_counts_hashes_sizes_and_generation_provenance_are_pinned() {
    assert_eq!(BATTLE_SCRIPT_GETSECRETPOWEREFFECT_CASES.len(), 298);
    assert_eq!(
        BATTLE_SCRIPT_GETSECRETPOWEREFFECT_REGISTRATION_CASES.len(),
        6
    );
    assert_eq!(
        BATTLE_SCRIPT_GETSECRETPOWEREFFECT_DOMAIN_CENSUS,
        [
            ("environment-domain-values", 256),
            ("representative-environments", 14),
            ("prior-move-effect-byte-fixtures", 3),
            ("registration-shape-cases", 6),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_GETSECRETPOWEREFFECT_CATEGORY_CENSUS,
        [("environment-domain", 256), ("overwrite-semantics", 42)]
    );
    assert_eq!(
        BATTLE_SCRIPT_GETSECRETPOWEREFFECT_REGISTRATION_BRANCH_CENSUS,
        [
            ("registered", 1),
            ("wrong-cardinality", 2),
            ("invalid-shape", 3)
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_GETSECRETPOWEREFFECT_VECTOR_CORPUS_SHA256,
        "4a368aa0860dce4751ea8059af38ca35f6251dd392096558e25c3debd805eb80"
    );
    assert_eq!(
        BATTLE_SCRIPT_GETSECRETPOWEREFFECT_VECTOR_CORPUS_BYTES,
        336_161
    );
    assert_eq!(
        BATTLE_SCRIPT_GETSECRETPOWEREFFECT_VECTOR_GENERATOR_SHA256,
        "ef5e88b5242dd38761d5d35b20a2ba27a793838cf04e287223c8810375dcce44"
    );
    assert_eq!(
        BATTLE_SCRIPT_GETSECRETPOWEREFFECT_VECTOR_GENERATOR_BYTES,
        17_622
    );
    let generated = include_bytes!("../src/battle_script_getsecretpowereffect_vectors_gen.rs");
    assert_eq!(generated.len(), 1_250_835);
    let generated_source = include_str!("../src/battle_script_getsecretpowereffect_vectors_gen.rs");
    assert!(generated_source.contains(
        "Source: executing canonical src/engine/battleScriptGetSecretPowerEffectOpcode.ts via node."
    ));
    assert!(generated_source.contains(
        "Regenerate: node --experimental-strip-types core-rs/tools/gen-battle-script-getsecretpowereffect-vectors.mjs."
    ));
}
