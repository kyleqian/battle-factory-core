//! Independent source/dispatch/macro/call-site/constants/corpus ratchets for
//! `Cmd_jumpifstatus3condition`.

use std::{fs, path::PathBuf};

use factory_core::battle_script_jumpifstatus3condition::*;
use factory_core::battle_script_jumpifstatus3condition_vectors_gen::*;

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
        BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_DECOMP_DISPATCH_EVIDENCE,
        BattleScriptJumpifstatus3conditionDecompDispatchEvidence {
            opcode_name: "B_SCR_OP_JUMPIFSTATUS3CONDITION",
            opcode_id: 0x21,
            dispatcher: "Cmd_jumpifstatus3condition",
            dispatch_line: 364,
            forward_decl_line: 112,
            handler_line: 3218,
            battler_line: 3223,
            status_line: 3224,
            pointer_line: 3225,
            condition_check_line: 3227,
            condition_true_bit_set_advance_line: 3230,
            condition_true_bit_clear_jump_line: 3232,
            condition_false_bit_set_jump_line: 3237,
            condition_false_bit_clear_advance_line: 3239,
        }
    );
    assert!(line(&commands, 364)
        .contains("[B_SCR_OP_JUMPIFSTATUS3CONDITION]          = Cmd_jumpifstatus3condition"));
    assert_eq!(
        line(&commands, 112),
        "static void Cmd_jumpifstatus3condition(void);"
    );
    assert_eq!(
        line(&commands, 3218),
        "static void Cmd_jumpifstatus3condition(void)"
    );
    assert_eq!(
        line(&commands, 3223).trim(),
        "gActiveBattler = GetBattlerForBattleScript(gBattlescriptCurrInstr[1]);"
    );
    assert_eq!(
        line(&commands, 3224).trim(),
        "status = T2_READ_32(gBattlescriptCurrInstr + 2);"
    );
    assert_eq!(
        line(&commands, 3225).trim(),
        "jumpPtr = T2_READ_PTR(gBattlescriptCurrInstr + 7);"
    );
    assert_eq!(
        line(&commands, 3227).trim(),
        "if (gBattlescriptCurrInstr[6])"
    );
    assert_eq!(
        line(&commands, 3230).trim(),
        "gBattlescriptCurrInstr += 11;"
    );
    assert_eq!(
        line(&commands, 3232).trim(),
        "gBattlescriptCurrInstr = jumpPtr;"
    );
    assert_eq!(
        line(&commands, 3237).trim(),
        "gBattlescriptCurrInstr = jumpPtr;"
    );
    assert_eq!(
        line(&commands, 3239).trim(),
        "gBattlescriptCurrInstr += 11;"
    );

    assert_eq!(
        BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_MACRO_EVIDENCE,
        BattleScriptJumpifstatus3conditionMacroEvidence {
            declaration_line: 173,
            opcode_line: 174,
            battler_line: 175,
            status3_line: 176,
            condition_line: 177,
            pointer_line: 178,
            jumpifstatus3_macro_line: 1422,
            jumpifnostatus3_macro_line: 1426,
            encoded_width_bytes: 11,
        }
    );
    assert_eq!(
        line(&macro_source, 173).trim(),
        ".macro jumpifstatus3condition battler:req, status3:req, condition:req, ptr:req"
    );
    assert_eq!(
        line(&macro_source, 174).trim(),
        ".byte B_SCR_OP_JUMPIFSTATUS3CONDITION"
    );
    assert_eq!(line(&macro_source, 175).trim(), r".byte \battler");
    assert_eq!(line(&macro_source, 176).trim(), r".4byte \status3");
    assert_eq!(line(&macro_source, 177).trim(), r".byte \condition");
    assert_eq!(line(&macro_source, 178).trim(), r".4byte \ptr");
    assert_eq!(
        line(&macro_source, 1422).trim(),
        ".macro jumpifstatus3 battler:req, status:req, jumpptr:req"
    );
    assert_eq!(
        line(&macro_source, 1426).trim(),
        ".macro jumpifnostatus3 battler:req, status:req, jumpptr:req"
    );
}

#[test]
fn constants_expression_mapping_and_seven_call_sites_are_exact() {
    let battle_header = source("reference/pokeemerald/include/constants/battle.h");
    let scripts = source("reference/pokeemerald/data/battle_scripts_1.s");

    assert_eq!(
        line(&battle_header, 163).trim(),
        "#define STATUS3_ON_AIR                  (1 << 6)"
    );
    assert_eq!(
        line(&battle_header, 164).trim(),
        "#define STATUS3_UNDERGROUND             (1 << 7)"
    );
    assert_eq!(
        line(&battle_header, 165).trim(),
        "#define STATUS3_MINIMIZED               (1 << 8)"
    );
    assert_eq!(
        line(&battle_header, 167).trim(),
        "#define STATUS3_ROOTED                  (1 << 10)"
    );
    assert_eq!(
        line(&battle_header, 175).trim(),
        "#define STATUS3_UNDERWATER              (1 << 18)"
    );

    assert_eq!(
        BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_STATUS3_MASKS,
        [
            BattleScriptJumpifstatus3conditionStatus3::OnAir,
            BattleScriptJumpifstatus3conditionStatus3::Underground,
            BattleScriptJumpifstatus3conditionStatus3::Minimized,
            BattleScriptJumpifstatus3conditionStatus3::Rooted,
            BattleScriptJumpifstatus3conditionStatus3::Underwater,
        ]
    );
    assert_eq!(
        BattleScriptJumpifstatus3conditionStatus3::OnAir.mask(),
        1 << 6
    );
    assert_eq!(
        BattleScriptJumpifstatus3conditionStatus3::Underground.mask(),
        1 << 7
    );
    assert_eq!(
        BattleScriptJumpifstatus3conditionStatus3::Minimized.mask(),
        1 << 8
    );
    assert_eq!(
        BattleScriptJumpifstatus3conditionStatus3::Rooted.mask(),
        1 << 10
    );
    assert_eq!(
        BattleScriptJumpifstatus3conditionStatus3::Underwater.mask(),
        1 << 18
    );
    assert_eq!(
        battle_script_jumpifstatus3condition_condition_from_expression("TRUE"),
        Some(true)
    );
    assert_eq!(
        battle_script_jumpifstatus3condition_condition_from_expression("FALSE"),
        Some(false)
    );
    assert_eq!(
        battle_script_jumpifstatus3condition_condition_from_expression("MAYBE"),
        None
    );

    assert_eq!(
        BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_CALL_SITE_EVIDENCE,
        [
            BattleScriptJumpifstatus3conditionCallSiteEvidence {
                entry_label: "BattleScript_EffectHit",
                entry_label_line: 236,
                statement_line: 238,
                instruction_program_counter: 1,
                status_expression: "STATUS3_UNDERWATER",
                status_mask: 1 << 18,
                condition_expression: "TRUE",
                condition: true,
                target_expression: "BattleScript_HitFromAtkCanceler",
                target_program_counter: 4,
            },
            BattleScriptJumpifstatus3conditionCallSiteEvidence {
                entry_label: "BattleScript_EffectRoar",
                entry_label_line: 593,
                statement_line: 598,
                instruction_program_counter: 276,
                status_expression: "STATUS3_ROOTED",
                status_mask: 1 << 10,
                condition_expression: "FALSE",
                condition: false,
                target_expression: "BattleScript_PrintMonIsRooted",
                target_program_counter: 2636,
            },
            BattleScriptJumpifstatus3conditionCallSiteEvidence {
                entry_label: "BattleScript_EffectTrap",
                entry_label_line: 830,
                statement_line: 832,
                instruction_program_counter: 470,
                status_expression: "STATUS3_UNDERWATER",
                status_mask: 1 << 18,
                condition_expression: "TRUE",
                condition: true,
                target_expression: "BattleScript_DoWrapEffect",
                target_program_counter: 473,
            },
            BattleScriptJumpifstatus3conditionCallSiteEvidence {
                entry_label: "BattleScript_EffectTwister",
                entry_label_line: 1826,
                statement_line: 1827,
                instruction_program_counter: 1253,
                status_expression: "STATUS3_ON_AIR",
                status_mask: 1 << 6,
                condition_expression: "TRUE",
                condition: true,
                target_expression: "BattleScript_FlinchEffect",
                target_program_counter: 1256,
            },
            BattleScriptJumpifstatus3conditionCallSiteEvidence {
                entry_label: "BattleScript_HitsAllWithUndergroundBonusLoop",
                entry_label_line: 1839,
                statement_line: 1841,
                instruction_program_counter: 1263,
                status_expression: "STATUS3_UNDERGROUND",
                status_mask: 1 << 7,
                condition_expression: "TRUE",
                condition: true,
                target_expression: "BattleScript_HitsAllNoUndergroundBonus",
                target_program_counter: 1267,
            },
            BattleScriptJumpifstatus3conditionCallSiteEvidence {
                entry_label: "BattleScript_EffectGust",
                entry_label_line: 1892,
                statement_line: 1893,
                instruction_program_counter: 1310,
                status_expression: "STATUS3_ON_AIR",
                status_mask: 1 << 6,
                condition_expression: "TRUE",
                condition: true,
                target_expression: "BattleScript_EffectHit",
                target_program_counter: 0,
            },
            BattleScriptJumpifstatus3conditionCallSiteEvidence {
                entry_label: "BattleScript_EffectStomp",
                entry_label_line: 1898,
                statement_line: 1899,
                instruction_program_counter: 1314,
                status_expression: "STATUS3_MINIMIZED",
                status_mask: 1 << 8,
                condition_expression: "TRUE",
                condition: true,
                target_expression: "BattleScript_FlinchEffect",
                target_program_counter: 1256,
            },
        ]
    );
    assert_eq!(scripts.matches("\tjumpifstatus3 ").count(), 1);
    assert_eq!(scripts.matches("\tjumpifnostatus3 ").count(), 6);
    for evidence in &BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_CALL_SITE_EVIDENCE {
        assert_eq!(
            line(&scripts, evidence.entry_label_line as usize),
            format!("{}::", evidence.entry_label)
        );
        let macro_name = if evidence.condition {
            "jumpifnostatus3"
        } else {
            "jumpifstatus3"
        };
        assert_eq!(
            line(&scripts, evidence.statement_line as usize).trim(),
            format!(
                "{macro_name} BS_TARGET, {}, {}",
                evidence.status_expression, evidence.target_expression
            )
        );
    }
}

#[test]
fn deterministic_corpus_counts_hashes_sizes_and_generation_provenance_are_pinned() {
    assert_eq!(BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_CASES.len(), 577);
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_REGISTRATION_CASES.len(),
        15
    );
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_DOMAIN_CENSUS,
        [
            ("topology-values", 2),
            ("target-role-values", 4),
            ("concrete-call-sites", 7),
            ("status3-mask-count", 5),
            ("status3-domain-values-per-site", 13),
            ("application-count-values", 2),
            ("registration-shape-cases", 15),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_CATEGORY_CENSUS,
        [
            ("dense-site-topology-target-status-matrix", 546),
            ("late-label-resolution", 14),
            ("repeated-application", 14),
            ("direct-handler-validation", 3),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_BRANCH_CENSUS,
        [
            ("jump", 318),
            ("advance", 235),
            ("unresolved-label", 7),
            ("jump-then-jump", 7),
            ("advance-then-advance", 7),
            ("undecodable", 3),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_REGISTRATION_BRANCH_CENSUS,
        [
            ("registered", 4),
            ("wrong-cardinality", 3),
            ("invalid-shape", 5),
            ("unknown-battler-selector", 1),
            ("unknown-condition", 1),
            ("unknown-status3-value", 1),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_VECTOR_CORPUS_SHA256,
        "c88eb6c8bd520541a677bac3cffca42e05780ece2024a8267554e143a0eb58f0"
    );
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_VECTOR_CORPUS_BYTES,
        384_549
    );
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_VECTOR_GENERATOR_SHA256,
        "a5591512378aff656f380342516bd7548d116979c2620af1e386819884996934"
    );
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_VECTOR_GENERATOR_BYTES,
        30_001
    );
    let generated = include_bytes!("../src/battle_script_jumpifstatus3condition_vectors_gen.rs");
    assert_eq!(generated.len(), 600_257);
    let generated_source =
        include_str!("../src/battle_script_jumpifstatus3condition_vectors_gen.rs");
    assert!(generated_source.contains(
        "Source: executing canonical src/engine/battleScriptJumpifstatus3conditionOpcode.ts via node."
    ));
    assert!(generated_source.contains(
        "Regenerate: node --experimental-strip-types core-rs/tools/gen-battle-script-jumpifstatus3condition-vectors.mjs."
    ));
}
