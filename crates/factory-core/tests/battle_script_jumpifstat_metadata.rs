//! Independent source/dispatch/macro/call-site/constants/corpus ratchets for
//! `Cmd_jumpifstat`.

use std::{fs, path::PathBuf};

use factory_core::battle_script_jumpifstat::*;
use factory_core::battle_script_jumpifstat_vectors_gen::*;

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
        BATTLE_SCRIPT_JUMPIFSTAT_DECOMP_DISPATCH_EVIDENCE,
        BattleScriptJumpifstatDecompDispatchEvidence {
            opcode_name: "B_SCR_OP_JUMPIFSTAT",
            opcode_id: 0x20,
            dispatcher: "Cmd_jumpifstat",
            dispatch_line: 363,
            forward_decl_line: 111,
            handler_line: 3178,
            battler_line: 3181,
            value_line: 3182,
            switch_line: 3184,
            case_equal_line: 3186,
            case_not_equal_line: 3190,
            case_greater_than_line: 3194,
            case_less_than_line: 3198,
            case_common_bits_line: 3202,
            case_no_common_bits_line: 3206,
            jump_line: 3213,
            advance_line: 3215,
        }
    );
    assert!(line(&commands, 363)
        .contains("[B_SCR_OP_JUMPIFSTAT]                      = Cmd_jumpifstat"));
    assert!(line(&commands, 363).contains("//0x20"));
    assert_eq!(line(&commands, 111), "static void Cmd_jumpifstat(void);");
    assert_eq!(line(&commands, 3178), "static void Cmd_jumpifstat(void)");
    assert_eq!(
        line(&commands, 3181).trim(),
        "u8 battler = GetBattlerForBattleScript(gBattlescriptCurrInstr[1]);"
    );
    assert_eq!(
        line(&commands, 3182).trim(),
        "u8 value = gBattleMons[battler].statStages[gBattlescriptCurrInstr[3]];"
    );
    assert_eq!(
        line(&commands, 3184).trim(),
        "switch (gBattlescriptCurrInstr[2])"
    );
    assert_eq!(line(&commands, 3186).trim(), "case CMP_EQUAL:");
    assert_eq!(line(&commands, 3190).trim(), "case CMP_NOT_EQUAL:");
    assert_eq!(line(&commands, 3194).trim(), "case CMP_GREATER_THAN:");
    assert_eq!(line(&commands, 3198).trim(), "case CMP_LESS_THAN:");
    assert_eq!(line(&commands, 3202).trim(), "case CMP_COMMON_BITS:");
    assert_eq!(line(&commands, 3206).trim(), "case CMP_NO_COMMON_BITS:");
    assert_eq!(
        line(&commands, 3213).trim(),
        "gBattlescriptCurrInstr = T2_READ_PTR(gBattlescriptCurrInstr + 5);"
    );
    assert_eq!(line(&commands, 3215).trim(), "gBattlescriptCurrInstr += 9;");

    assert_eq!(
        BATTLE_SCRIPT_JUMPIFSTAT_MACRO_EVIDENCE,
        BattleScriptJumpifstatMacroEvidence {
            declaration_line: 164,
            opcode_line: 165,
            battler_line: 166,
            ifflag_line: 167,
            stat_line: 168,
            value_line: 169,
            pointer_line: 170,
            encoded_width_bytes: 9,
        }
    );
    assert_eq!(
        line(&macro_source, 164).trim(),
        ".macro jumpifstat battler:req, ifflag:req, stat:req, value:req, ptr"
    );
    assert_eq!(line(&macro_source, 165).trim(), ".byte B_SCR_OP_JUMPIFSTAT");
    assert_eq!(line(&macro_source, 166).trim(), r".byte \battler");
    assert_eq!(line(&macro_source, 167).trim(), r".byte \ifflag");
    assert_eq!(line(&macro_source, 168).trim(), r".byte \stat");
    assert_eq!(line(&macro_source, 169).trim(), r".byte \value");
    assert_eq!(line(&macro_source, 170).trim(), r".4byte \ptr");
}

#[test]
fn constants_expression_mapping_and_eighteen_call_sites_are_exact() {
    let commands_header =
        source("reference/pokeemerald/include/constants/battle_script_commands.h");
    let pokemon_header = source("reference/pokeemerald/include/constants/pokemon.h");
    let scripts = source("reference/pokeemerald/data/battle_scripts_1.s");

    assert_eq!(
        line(&commands_header, 326).trim(),
        "#define CMP_EQUAL               0"
    );
    assert_eq!(
        line(&commands_header, 327).trim(),
        "#define CMP_NOT_EQUAL           1"
    );
    assert_eq!(
        line(&commands_header, 328).trim(),
        "#define CMP_GREATER_THAN        2"
    );
    assert_eq!(
        line(&commands_header, 329).trim(),
        "#define CMP_LESS_THAN           3"
    );
    assert_eq!(
        line(&commands_header, 330).trim(),
        "#define CMP_COMMON_BITS         4"
    );
    assert_eq!(
        line(&commands_header, 331).trim(),
        "#define CMP_NO_COMMON_BITS      5"
    );

    assert_eq!(line(&pokemon_header, 76).trim(), "#define STAT_ATK     1");
    assert_eq!(line(&pokemon_header, 77).trim(), "#define STAT_DEF     2");
    assert_eq!(line(&pokemon_header, 78).trim(), "#define STAT_SPEED   3");
    assert_eq!(line(&pokemon_header, 79).trim(), "#define STAT_SPATK   4");
    assert_eq!(line(&pokemon_header, 80).trim(), "#define STAT_SPDEF   5");
    assert!(line(&pokemon_header, 83)
        .trim()
        .starts_with("#define STAT_ACC     6"));
    assert!(line(&pokemon_header, 84)
        .trim()
        .starts_with("#define STAT_EVASION 7"));
    assert_eq!(
        line(&pokemon_header, 89).trim(),
        "#define MIN_STAT_STAGE     0"
    );
    assert_eq!(
        line(&pokemon_header, 91).trim(),
        "#define MAX_STAT_STAGE    12"
    );

    assert_eq!(
        battle_script_jumpifstat_comparator_from_expression("CMP_EQUAL"),
        Some(BattleScriptJumpifstatComparator::Equal)
    );
    assert_eq!(
        battle_script_jumpifstat_comparator_from_expression("CMP_MAYBE"),
        None
    );
    assert_eq!(
        battle_script_jumpifstat_stat_from_expression("STAT_HP"),
        None,
        "STAT_HP is never a jumpifstat operand"
    );
    assert_eq!(
        battle_script_jumpifstat_value_from_expression("DEFAULT_STAT_STAGE"),
        None
    );
    assert_eq!(BattleScriptJumpifstatValue::Min.value(), 0);
    assert_eq!(BattleScriptJumpifstatValue::Max.value(), 12);

    assert_eq!(
        BATTLE_SCRIPT_JUMPIFSTAT_CALL_SITE_EVIDENCE.len(),
        BATTLE_SCRIPT_JUMPIFSTAT_CONCRETE_START_COUNT
    );
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFSTAT_CALL_SITE_EVIDENCE
            .iter()
            .filter(|evidence| evidence.battler_selector_expression == "BS_ATTACKER")
            .count(),
        16
    );
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFSTAT_CALL_SITE_EVIDENCE
            .iter()
            .filter(|evidence| evidence.battler_selector_expression == "BS_TARGET")
            .count(),
        2
    );
    assert_eq!(scripts.matches("\tjumpifstat ").count(), 18);
    for evidence in &BATTLE_SCRIPT_JUMPIFSTAT_CALL_SITE_EVIDENCE {
        assert_eq!(
            line(&scripts, evidence.statement_line as usize).trim(),
            format!(
                "jumpifstat {}, {}, {}, {}, {}",
                evidence.battler_selector_expression,
                evidence.comparator_expression,
                evidence.stat_expression,
                evidence.value_expression,
                evidence.target_expression,
            )
        );
        assert!(
            evidence.statement_line > evidence.entry_label_line,
            "{} statement must follow its entry label",
            evidence.target_expression
        );
        let comparator =
            battle_script_jumpifstat_comparator_from_expression(evidence.comparator_expression)
                .expect("evidence comparator is named");
        let stat = battle_script_jumpifstat_stat_from_expression(evidence.stat_expression)
            .expect("evidence stat is named");
        let value = battle_script_jumpifstat_value_from_expression(evidence.value_expression)
            .expect("evidence value is named");
        // Round-trips against the enum accessors so the evidence table and
        // the executable enums cannot silently drift apart.
        assert_eq!(comparator.expression(), evidence.comparator_expression);
        assert_eq!(stat.expression(), evidence.stat_expression);
        assert_eq!(value.expression(), evidence.value_expression);
    }
}

#[test]
fn comparator_switch_is_source_complete_for_all_six_cases() {
    // battle_script_commands.c:3186-3209 -- every CMP_* case, including the
    // two (COMMON_BITS/NO_COMMON_BITS) no concrete call site exercises.
    assert!(BattleScriptJumpifstatComparator::Equal.evaluate(6, 6));
    assert!(!BattleScriptJumpifstatComparator::Equal.evaluate(5, 6));
    assert!(BattleScriptJumpifstatComparator::NotEqual.evaluate(5, 6));
    assert!(!BattleScriptJumpifstatComparator::NotEqual.evaluate(6, 6));
    assert!(BattleScriptJumpifstatComparator::GreaterThan.evaluate(7, 6));
    assert!(!BattleScriptJumpifstatComparator::GreaterThan.evaluate(6, 6));
    assert!(BattleScriptJumpifstatComparator::LessThan.evaluate(5, 6));
    assert!(!BattleScriptJumpifstatComparator::LessThan.evaluate(6, 6));
    assert!(BattleScriptJumpifstatComparator::CommonBits.evaluate(0b0110, 0b0100));
    assert!(!BattleScriptJumpifstatComparator::CommonBits.evaluate(0b0001, 0b0100));
    assert!(BattleScriptJumpifstatComparator::NoCommonBits.evaluate(0b0001, 0b0100));
    assert!(!BattleScriptJumpifstatComparator::NoCommonBits.evaluate(0b0110, 0b0100));
}

#[test]
fn deterministic_corpus_counts_hashes_sizes_and_generation_provenance_are_pinned() {
    assert_eq!(BATTLE_SCRIPT_JUMPIFSTAT_CASES.len(), 1602);
    assert_eq!(BATTLE_SCRIPT_JUMPIFSTAT_REGISTRATION_CASES.len(), 16);
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFSTAT_DOMAIN_CENSUS,
        [
            ("topology-values", 2),
            ("role-values", 4),
            ("concrete-call-sites", 18),
            ("stat-stage-domain-values", 13),
            ("comparator-count", 6),
            ("comparand-count", 2),
            ("application-count-values", 2),
            ("registration-shape-cases", 16),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFSTAT_CATEGORY_CENSUS,
        [
            ("dense-site-topology-role-stage-matrix", 1404),
            ("comparator-truth-table", 156),
            ("repeated-application", 36),
            ("direct-handler-validation", 6),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFSTAT_BRANCH_CENSUS,
        [
            ("advance", 650),
            ("jump", 910),
            ("jump-then-jump", 18),
            ("advance-then-advance", 18),
            ("block", 2),
            ("undecodable", 3),
            ("unresolved-label", 1),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFSTAT_REGISTRATION_BRANCH_CENSUS,
        [
            ("registered", 3),
            ("wrong-cardinality", 3),
            ("invalid-shape", 6),
            ("unknown-comparator", 1),
            ("unknown-stat", 1),
            ("unknown-value", 1),
            ("unresolved-label", 1),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFSTAT_VECTOR_CORPUS_SHA256,
        "1713232e00bdb6af8d6ce6bce929fa52badfd10dab85511b7daf4b43575a4da9"
    );
    assert_eq!(BATTLE_SCRIPT_JUMPIFSTAT_VECTOR_CORPUS_BYTES, 1_348_623);
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFSTAT_VECTOR_GENERATOR_SHA256,
        "d092db5e978488c6011c9cb98473dacd0ddf7b9ff55e9cb69265ad156f4d052a"
    );
    assert_eq!(BATTLE_SCRIPT_JUMPIFSTAT_VECTOR_GENERATOR_BYTES, 37_103);
    let generated = include_bytes!("../src/battle_script_jumpifstat_vectors_gen.rs");
    assert_eq!(generated.len(), 2_512_225);
    let generated_source = include_str!("../src/battle_script_jumpifstat_vectors_gen.rs");
    assert!(generated_source.contains(
        "Source: executing canonical src/engine/battleScriptJumpifstatOpcode.ts via node."
    ));
    assert!(generated_source.contains(
        "Regenerate: node --experimental-strip-types core-rs/tools/gen-battle-script-jumpifstat-vectors.mjs."
    ));
}
