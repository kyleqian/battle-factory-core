//! Independent source/decomp/macro/program-site and corpus-identity ratchets
//! for the Cmd_incrementgamestat leaf. Behavioral replay stays in the sibling
//! vectors test so generated TypeScript execution cannot substitute for source
//! evidence.

use std::{fs, path::PathBuf};

use factory_core::battle_script_incrementgamestat::*;
use factory_core::battle_script_incrementgamestat_vectors_gen::*;

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
fn source_dispatch_side_gate_raw_operand_advance_macro_and_both_sites_are_independently_exact() {
    let commands = source("reference/pokeemerald/src/battle_script_commands.c");
    let macro_source = source("reference/pokeemerald/asm/macros/battle_script.inc");
    let scripts = source("reference/pokeemerald/data/battle_scripts_1.s");
    let game_stats = source("reference/pokeemerald/include/constants/game_stat.h");

    assert_eq!(
        BATTLE_SCRIPT_INCREMENT_GAME_STAT_CANONICAL_DECOMP_DISPATCH_EVIDENCE,
        BattleScriptIncrementGameStatDecompDispatchEvidence {
            opcode_name: "B_SCR_OP_INCREMENTGAMESTAT",
            opcode_id: 0x60,
            dispatcher: "Cmd_incrementgamestat",
            dispatch_line: 427,
            handler_line: 5689,
            side_gate_line: 5691,
            raw_operand_read_line: 5692,
            advance_line: 5694,
        },
    );
    assert!(line(&commands, 427)
        .contains("[B_SCR_OP_INCREMENTGAMESTAT]               = Cmd_incrementgamestat"));
    assert_eq!(
        line(&commands, 5689),
        "static void Cmd_incrementgamestat(void)"
    );
    assert_eq!(
        line(&commands, 5691).trim(),
        "if (GetBattlerSide(gBattlerAttacker) == B_SIDE_PLAYER)"
    );
    assert_eq!(
        line(&commands, 5692).trim(),
        "IncrementGameStat(gBattlescriptCurrInstr[1]);"
    );
    assert_eq!(line(&commands, 5694).trim(), "gBattlescriptCurrInstr += 2;");

    assert_eq!(
        BATTLE_SCRIPT_INCREMENT_GAME_STAT_MACRO_EVIDENCE,
        BattleScriptIncrementGameStatMacroEvidence {
            macro_name: "incrementgamestat",
            declaration_line: 557,
            opcode_line: 558,
            operand_line: 559,
            operand_width_bytes: 1,
            encoded_width_bytes: 2,
        },
    );
    assert_eq!(
        line(&macro_source, 557).trim(),
        ".macro incrementgamestat stat:req"
    );
    assert_eq!(
        line(&macro_source, 558).trim(),
        ".byte B_SCR_OP_INCREMENTGAMESTAT"
    );
    assert_eq!(line(&macro_source, 559).trim(), r".byte \stat");

    assert_eq!(line(&scripts, 897), "BattleScript_EffectRecoil::");
    assert_eq!(
        line(&scripts, 900).trim(),
        "incrementgamestat GAME_STAT_USED_STRUGGLE"
    );
    assert_eq!(line(&scripts, 1172), "BattleScript_EffectSplash::");
    assert_eq!(
        line(&scripts, 1178).trim(),
        "incrementgamestat GAME_STAT_USED_SPLASH"
    );
    assert_eq!(scripts.matches("\tincrementgamestat ").count(), 2);
    assert_eq!(
        line(&game_stats, 30).trim(),
        "#define GAME_STAT_USED_SPLASH                 26"
    );
    assert_eq!(
        line(&game_stats, 31).trim(),
        "#define GAME_STAT_USED_STRUGGLE               27"
    );
}

#[test]
fn canonical_program_sites_common_identity_and_two_raw_u8_expressions_are_ratcheted() {
    assert_eq!(
        BATTLE_SCRIPT_INCREMENT_GAME_STAT_CALL_SITE_EVIDENCE,
        [
            BattleScriptIncrementGameStatCallSiteEvidence {
                entry_label: "BattleScript_EffectRecoil",
                entry_label_line: 897,
                entry_program_counter: 524,
                statement_line: 900,
                invocation_mnemonic: "incrementgamestat",
                invocation_macro_line: 557,
                source_macro: "incrementgamestat",
                opcode_macro_line: 558,
                operand_macro_line: 559,
                game_stat_expression: "GAME_STAT_USED_STRUGGLE",
                game_stat_index: 27,
                instruction_program_counter: 526,
                encoded_width_bytes: 2,
            },
            BattleScriptIncrementGameStatCallSiteEvidence {
                entry_label: "BattleScript_EffectSplash",
                entry_label_line: 1172,
                entry_program_counter: 725,
                statement_line: 1178,
                invocation_mnemonic: "incrementgamestat",
                invocation_macro_line: 557,
                source_macro: "incrementgamestat",
                opcode_macro_line: 558,
                operand_macro_line: 559,
                game_stat_expression: "GAME_STAT_USED_SPLASH",
                game_stat_index: 26,
                instruction_program_counter: 730,
                encoded_width_bytes: 2,
            },
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_INCREMENTGAMESTAT_OPCODE_NAME,
        "B_SCR_OP_INCREMENTGAMESTAT"
    );
    assert_eq!(BATTLE_SCRIPT_INCREMENTGAMESTAT_OPCODE, 0x60);
    assert_eq!(
        BATTLE_SCRIPT_INCREMENTGAMESTAT_DISPATCHER,
        "Cmd_incrementgamestat"
    );
    assert_eq!(BATTLE_SCRIPT_INCREMENTGAMESTAT_CONCRETE_START_COUNT, 2);
    assert_eq!(BATTLE_SCRIPT_INCREMENTGAMESTAT_OPERAND_WIDTH_BYTES, 1);
    assert_eq!(BATTLE_SCRIPT_INCREMENTGAMESTAT_ENCODED_WIDTH_BYTES, 2);
    assert_eq!(
        BATTLE_SCRIPT_INCREMENT_GAME_STATS,
        [
            BattleScriptIncrementGameStat::UsedStruggle,
            BattleScriptIncrementGameStat::UsedSplash,
        ],
    );
    assert_eq!(
        BattleScriptIncrementGameStat::UsedSplash.index(),
        BATTLE_SCRIPT_INCREMENT_GAME_STAT_USED_SPLASH_INDEX
    );
    assert_eq!(
        BattleScriptIncrementGameStat::UsedStruggle.index(),
        BATTLE_SCRIPT_INCREMENT_GAME_STAT_USED_STRUGGLE_INDEX
    );
    assert_eq!(
        BattleScriptIncrementGameStat::UsedSplash.source_expression(),
        "GAME_STAT_USED_SPLASH"
    );
    assert_eq!(
        BattleScriptIncrementGameStat::UsedStruggle.source_expression(),
        "GAME_STAT_USED_STRUGGLE"
    );
}

#[test]
fn deterministic_corpus_counts_hashes_sizes_and_generation_provenance_are_pinned() {
    assert_eq!(BATTLE_SCRIPT_INCREMENT_GAME_STAT_CASES.len(), 33);
    assert_eq!(
        BATTLE_SCRIPT_INCREMENT_GAME_STAT_REGISTRATION_CASES.len(),
        18
    );
    assert_eq!(
        BATTLE_SCRIPT_INCREMENT_GAME_STAT_DOMAIN_CENSUS,
        [
            ("battler-slots", 4),
            ("source-sides", 2),
            ("canonical-attacker-slots", 4),
            ("attacker-side-combinations", 8),
            ("typed-game-stat-expressions", 2),
            ("concrete-game-stat-starts", 2),
            ("u8-edge-values", 4),
            ("u16-edge-values", 4),
            ("i32-edge-values", 4),
            ("u32-edge-values", 4),
            ("application-count-values", 2),
            ("registration-shape-cases", 18),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_INCREMENT_GAME_STAT_CATEGORY_CENSUS,
        [
            ("canonical-attacker-slot-side-mapping", 8),
            ("resolved-attacker-side-gate", 16),
            ("integer-edge-and-sibling-preservation", 4),
            ("repeated-application-idempotence", 3),
            ("missing-attacker-role", 2),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_INCREMENT_GAME_STAT_BRANCH_CENSUS,
        [
            ("player-advance", 14),
            ("opponent-advance", 14),
            ("player-advance-then-player-advance", 2),
            ("opponent-advance-then-opponent-advance", 1),
            ("missing-attacker-role", 2),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_INCREMENT_GAME_STAT_REGISTRATION_BRANCH_CENSUS,
        [
            ("registered", 3),
            ("wrong-cardinality", 5),
            ("invalid-shape", 8),
            ("unknown-expression", 2),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_INCREMENT_GAME_STAT_VECTOR_CORPUS_SHA256,
        "280fa91b9929f99f20e022ccfd24f2360b189c87aa20f01976f90e0ea2c51722",
    );
    assert_eq!(
        BATTLE_SCRIPT_INCREMENT_GAME_STAT_VECTOR_CORPUS_BYTES,
        69_295
    );
    let generated = include_bytes!("../src/battle_script_incrementgamestat_vectors_gen.rs");
    assert_eq!(generated.len(), 210_728);
    assert!(generated.len() <= 500_000);
    let generated_source = include_str!("../src/battle_script_incrementgamestat_vectors_gen.rs");
    assert!(generated_source.contains(
        "Source: executing canonical src/engine/battleScriptIncrementGameStatOpcode.ts via node."
    ));
    assert!(generated_source.contains(
        "Regenerate: node --experimental-strip-types core-rs/tools/gen-battle-script-incrementgamestat-vectors.mjs."
    ));
}
