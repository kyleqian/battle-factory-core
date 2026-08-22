//! Independent source/decomp/macro/program-site and corpus identity ratchets
//! for `Cmd_jumpifconfusedandstatmaxed`. The generated TypeScript behavior
//! replay lives in the sibling vectors test, so it cannot substitute for the
//! pinned source authority here.

use std::{fs, path::PathBuf};

use factory_core::battle_script_jumpifconfusedandstatmaxed::*;
use factory_core::battle_script_jumpifconfusedandstatmaxed_vectors_gen::*;

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
        .unwrap_or_else(|| panic!("missing source line {number}"))
}

#[test]
fn source_dispatch_ordered_conjunction_macro_constants_and_both_sites_are_independently_exact() {
    let commands = source("reference/pokeemerald/src/battle_script_commands.c");
    let battle_header = source("reference/pokeemerald/include/constants/battle.h");
    let pokemon_header = source("reference/pokeemerald/include/constants/pokemon.h");
    let macro_source = source("reference/pokeemerald/asm/macros/battle_script.inc");
    let scripts = source("reference/pokeemerald/data/battle_scripts_1.s");

    assert_eq!(
        BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_CANONICAL_DECOMP_DISPATCH_EVIDENCE,
        BattleScriptJumpifconfusedandstatmaxedDecompDispatchEvidence {
            opcode_name: "B_SCR_OP_JUMPIFCONFUSEDANDSTATMAXED",
            opcode_id: 0xb4,
            dispatcher: "Cmd_jumpifconfusedandstatmaxed",
            dispatch_line: 511,
            handler_line: 8571,
            condition_status2_line: 8573,
            condition_stat_stage_line: 8574,
            jump_line: 8575,
            advance_line: 8577,
            confusion_mask_line: 129,
            max_stat_stage_line: 91,
        },
    );
    assert!(line(&commands, 511)
        .contains("[B_SCR_OP_JUMPIFCONFUSEDANDSTATMAXED]      = Cmd_jumpifconfusedandstatmaxed"));
    assert_eq!(
        line(&commands, 8571),
        "static void Cmd_jumpifconfusedandstatmaxed(void)",
    );
    assert_eq!(
        line(&commands, 8573).trim(),
        "if (gBattleMons[gBattlerTarget].status2 & STATUS2_CONFUSION",
    );
    assert_eq!(
        line(&commands, 8574).trim(),
        "&& gBattleMons[gBattlerTarget].statStages[gBattlescriptCurrInstr[1]] == MAX_STAT_STAGE)",
    );
    assert_eq!(
        line(&commands, 8575).trim(),
        "gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 2);",
    );
    assert_eq!(line(&commands, 8577).trim(), "gBattlescriptCurrInstr += 6;");
    assert_eq!(
        line(&battle_header, 129).trim(),
        "#define STATUS2_CONFUSION             (1 << 0 | 1 << 1 | 1 << 2)",
    );
    assert_eq!(line(&pokemon_header, 76).trim(), "#define STAT_ATK     1");
    assert_eq!(line(&pokemon_header, 79).trim(), "#define STAT_SPATK   4");
    assert_eq!(
        line(&pokemon_header, 91).trim(),
        "#define MAX_STAT_STAGE    12"
    );

    assert_eq!(
        BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_MACRO_EVIDENCE,
        BattleScriptJumpifconfusedandstatmaxedMacroEvidence {
            macro_name: "jumpifconfusedandstatmaxed",
            declaration_line: 941,
            opcode_line: 942,
            stat_line: 943,
            pointer_line: 944,
            stat_width_bytes: 1,
            pointer_width_bytes: 4,
            encoded_width_bytes: 6,
        },
    );
    assert_eq!(
        line(&macro_source, 941).trim(),
        ".macro jumpifconfusedandstatmaxed stat:req, ptr:req",
    );
    assert_eq!(
        line(&macro_source, 942).trim(),
        ".byte B_SCR_OP_JUMPIFCONFUSEDANDSTATMAXED",
    );
    assert_eq!(line(&macro_source, 943).trim(), r".byte \stat");
    assert_eq!(line(&macro_source, 944).trim(), r".4byte \ptr");

    assert_eq!(line(&scripts, 1608), "BattleScript_EffectSwagger::");
    assert_eq!(
        line(&scripts, 1614).trim(),
        "jumpifconfusedandstatmaxed STAT_ATK, BattleScript_ButItFailed",
    );
    assert_eq!(line(&scripts, 2151), "BattleScript_EffectFlatter::");
    assert_eq!(
        line(&scripts, 2157).trim(),
        "jumpifconfusedandstatmaxed STAT_SPATK, BattleScript_ButItFailed",
    );
    assert_eq!(scripts.matches("\tjumpifconfusedandstatmaxed ").count(), 2);
}

#[test]
fn opcode_identity_program_sites_and_the_two_raw_stat_operands_are_ratcheted() {
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_OPCODE_NAME,
        "B_SCR_OP_JUMPIFCONFUSEDANDSTATMAXED",
    );
    assert_eq!(BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_OPCODE, 0xb4);
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_DISPATCHER,
        "Cmd_jumpifconfusedandstatmaxed",
    );
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_CONCRETE_START_COUNT,
        2,
    );
    assert_eq!(BATTLE_SCRIPT_STATUS2_CONFUSION, 7);
    assert_eq!(BATTLE_SCRIPT_MAX_STAT_STAGE, 12);
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_STATS,
        [
            BattleScriptJumpifconfusedandstatmaxedStat::Attack,
            BattleScriptJumpifconfusedandstatmaxedStat::SpecialAttack,
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_CALL_SITE_EVIDENCE,
        [
            BattleScriptJumpifconfusedandstatmaxedCallSiteEvidence {
                entry_label: "BattleScript_EffectSwagger",
                entry_label_line: 1608,
                entry_program_counter: 1083,
                statement_line: 1614,
                invocation_mnemonic: "jumpifconfusedandstatmaxed",
                stat_expression: "STAT_ATK",
                stat_stage_index: 1,
                target_expression: "BattleScript_ButItFailed",
                instruction_program_counter: 1088,
                target_program_counter: 1434,
            },
            BattleScriptJumpifconfusedandstatmaxedCallSiteEvidence {
                entry_label: "BattleScript_EffectFlatter",
                entry_label_line: 2151,
                entry_program_counter: 1505,
                statement_line: 2157,
                invocation_mnemonic: "jumpifconfusedandstatmaxed",
                stat_expression: "STAT_SPATK",
                stat_stage_index: 4,
                target_expression: "BattleScript_ButItFailed",
                instruction_program_counter: 1510,
                target_program_counter: 1434,
            },
        ],
    );
    assert_eq!(
        battle_script_jumpifconfusedandstatmaxed_stat_from_expression("STAT_ATK"),
        Some(BattleScriptJumpifconfusedandstatmaxedStat::Attack),
    );
    assert_eq!(
        battle_script_jumpifconfusedandstatmaxed_stat_from_expression("STAT_SPATK"),
        Some(BattleScriptJumpifconfusedandstatmaxedStat::SpecialAttack),
    );
    assert_eq!(
        battle_script_jumpifconfusedandstatmaxed_stat_from_expression("STAT_DEF"),
        None,
    );
}

#[test]
fn deterministic_corpus_counts_sizes_hashes_and_generation_provenance_are_pinned() {
    assert_eq!(BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_CASES.len(), 589);
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_REGISTRATION_CASES.len(),
        16,
    );
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_DOMAIN_CENSUS,
        [
            ("battler-slots", 4),
            ("target-role-values", 4),
            ("optional-target-role-values", 5),
            ("concrete-stat-call-sites", 2),
            ("concrete-stat-expressions", 2),
            ("stat-stage-array-cells", 8),
            ("confusion-mask-status2-edge-values", 10),
            ("signed-stat-stage-edge-values", 7),
            ("all-site-target-status-stage-combinations", 560),
            ("application-count-values", 2),
            ("registration-shape-cases", 16),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_CATEGORY_CENSUS,
        [
            ("site-target-confusion-stage-matrix", 560),
            ("concrete-stat-index-isolation", 16),
            ("false-path-skips-label-resolution", 4),
            ("true-path-label-resolution", 2),
            ("missing-target-ordering", 2),
            ("repeated-application", 4),
            ("handler-validation-ordering", 1),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_BRANCH_CENSUS,
        [
            ("advance", 524),
            ("jump", 56),
            ("unresolved-jump-target", 2),
            ("missing-target-role", 2),
            ("jump-then-jump", 2),
            ("advance-then-advance", 2),
            ("undecodable-stat", 1),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_REGISTRATION_BRANCH_CENSUS,
        [
            ("registered", 4),
            ("wrong-cardinality", 3),
            ("invalid-shape", 5),
            ("unknown-stat", 2),
            ("unresolved-label", 2),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_VECTOR_CORPUS_SHA256,
        "a0a453793492a31eb678790276dfb8cb13784530431575786fa42a97f0703eb8",
    );
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_VECTOR_CORPUS_BYTES,
        1_516_483,
    );
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_VECTOR_GENERATOR_SHA256,
        "21ae43eec1ffaeb163a7f7a0bd2a7b80bed490e537ac50a9994dea3b825d53a1",
    );
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_VECTOR_GENERATOR_BYTES,
        48_048,
    );
    let generated =
        include_bytes!("../src/battle_script_jumpifconfusedandstatmaxed_vectors_gen.rs");
    assert_eq!(generated.len(), 4_328_972);
    assert!(generated.len() <= 5_000_000);
    let generated_source =
        include_str!("../src/battle_script_jumpifconfusedandstatmaxed_vectors_gen.rs");
    assert!(generated_source.contains(
        "Source: executing canonical src/engine/battleScriptJumpifconfusedandstatmaxedOpcode.ts via node.",
    ));
    assert!(generated_source.contains(
        "Regenerate: node --experimental-strip-types core-rs/tools/gen-battle-script-jumpifconfusedandstatmaxed-vectors.mjs.",
    ));
    let generator =
        include_bytes!("../../../tools/gen-battle-script-jumpifconfusedandstatmaxed-vectors.mjs");
    assert_eq!(generator.len(), 48_048);
}
