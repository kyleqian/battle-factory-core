//! Independent source/dispatch/macro/call-site/corpus ratchets for
//! `Cmd_jumpiftype`/`Cmd_jumpiftype2`/`Cmd_cursetarget`.

use std::{fs, path::PathBuf};

use factory_core::battle_script_type_curse::*;
use factory_core::battle_script_type_curse_vectors_gen::*;

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
fn decomp_evidence_is_independent() {
    let commands = source("reference/pokeemerald/src/battle_script_commands.c");
    let evidence = BATTLE_SCRIPT_TYPE_CURSE_SOURCE_METADATA;
    assert_eq!(
        evidence,
        BattleScriptTypeCurseSourceMetadata {
            jumpiftype_handler_line: 3243,
            jumpiftype_dispatch_line: 365,
            jumpiftype_forward_decl_line: 113,
            jumpiftype_enum_line: 40,
            jumpiftype2_handler_line: 3981,
            jumpiftype2_dispatch_line: 397,
            jumpiftype2_forward_decl_line: 145,
            jumpiftype2_enum_line: 72,
            cursetarget_handler_line: 8468,
            cursetarget_dispatch_line: 506,
            cursetarget_forward_decl_line: 254,
            cursetarget_enum_line: 181,
            is_battler_of_type_macro_line: 471,
            jumpiftype_macro_declaration_line: 181,
            jumpiftype2_macro_declaration_line: 366,
            cursetarget_macro_declaration_line: 918,
        }
    );

    assert_eq!(line(&commands, 3243), "static void Cmd_jumpiftype(void)");
    assert_eq!(line(&commands, 3244), "{");
    assert_eq!(
        line(&commands, 3245).trim(),
        "u8 battler = GetBattlerForBattleScript(gBattlescriptCurrInstr[1]);"
    );
    assert_eq!(
        line(&commands, 3246).trim(),
        "u8 type = gBattlescriptCurrInstr[2];"
    );
    assert_eq!(
        line(&commands, 3247).trim(),
        "const u8 *jumpPtr = T2_READ_PTR(gBattlescriptCurrInstr + 3);"
    );
    assert_eq!(
        line(&commands, 3249).trim(),
        "if (IS_BATTLER_OF_TYPE(battler, type))"
    );
    assert_eq!(
        line(&commands, 3250).trim(),
        "gBattlescriptCurrInstr = jumpPtr;"
    );
    assert_eq!(line(&commands, 3252).trim(), "gBattlescriptCurrInstr += 7;");

    assert_eq!(line(&commands, 3981), "static void Cmd_jumpiftype2(void)");
    assert_eq!(
        line(&commands, 3983).trim(),
        "u8 battler = GetBattlerForBattleScript(gBattlescriptCurrInstr[1]);"
    );
    assert_eq!(
        line(&commands, 3985).trim(),
        "if (gBattlescriptCurrInstr[2] == gBattleMons[battler].types[0] || gBattlescriptCurrInstr[2] == gBattleMons[battler].types[1])"
    );
    assert_eq!(
        line(&commands, 3986).trim(),
        "gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 3);"
    );
    assert_eq!(line(&commands, 3988).trim(), "gBattlescriptCurrInstr += 7;");

    assert_eq!(line(&commands, 8468), "static void Cmd_cursetarget(void)");
    assert_eq!(
        line(&commands, 8470).trim(),
        "if (gBattleMons[gBattlerTarget].status2 & STATUS2_CURSED)"
    );
    assert_eq!(
        line(&commands, 8472).trim(),
        "gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 1);"
    );
    assert_eq!(
        line(&commands, 8476).trim(),
        "gBattleMons[gBattlerTarget].status2 |= STATUS2_CURSED;"
    );
    assert_eq!(
        line(&commands, 8477).trim(),
        "gBattleMoveDamage = gBattleMons[gBattlerAttacker].maxHP / 2;"
    );
    assert_eq!(line(&commands, 8478).trim(), "if (gBattleMoveDamage == 0)");
    assert_eq!(line(&commands, 8479).trim(), "gBattleMoveDamage = 1;");
    assert_eq!(line(&commands, 8481).trim(), "gBattlescriptCurrInstr += 5;");

    assert!(line(&commands, 365).contains("[B_SCR_OP_JUMPIFTYPE]"));
    assert!(line(&commands, 365).contains("Cmd_jumpiftype,"));
    assert!(line(&commands, 365).contains("//0x22"));
    assert!(line(&commands, 397).contains("[B_SCR_OP_JUMPIFTYPE2]"));
    assert!(line(&commands, 397).contains("Cmd_jumpiftype2,"));
    assert!(line(&commands, 397).contains("//0x42"));
    assert!(line(&commands, 506).contains("[B_SCR_OP_CURSETARGET]"));
    assert!(line(&commands, 506).contains("Cmd_cursetarget,"));
    assert!(line(&commands, 506).contains("//0xAF"));

    assert_eq!(line(&commands, 113), "static void Cmd_jumpiftype(void);");
    assert_eq!(line(&commands, 145), "static void Cmd_jumpiftype2(void);");
    assert_eq!(line(&commands, 254), "static void Cmd_cursetarget(void);");

    let enum_header = source("reference/pokeemerald/include/constants/battle_script_commands.h");
    assert_eq!(line(&enum_header, 40).trim(), "B_SCR_OP_JUMPIFTYPE,");
    assert_eq!(line(&enum_header, 72).trim(), "B_SCR_OP_JUMPIFTYPE2,");
    assert_eq!(line(&enum_header, 181).trim(), "B_SCR_OP_CURSETARGET,");

    let battle_h = source("reference/pokeemerald/include/battle.h");
    assert_eq!(
        line(&battle_h, 471).trim(),
        "#define IS_BATTLER_OF_TYPE(battler, type) ((gBattleMons[battler].types[0] == type || gBattleMons[battler].types[1] == type))"
    );

    let battle_constants_h = source("reference/pokeemerald/include/constants/battle.h");
    assert_eq!(
        line(&battle_constants_h, 152).trim(),
        "#define STATUS2_CURSED                (1 << 28)"
    );
    assert_eq!(BATTLE_SCRIPT_STATUS2_CURSED, 1 << 28);
}

#[test]
fn macro_evidence_is_independent() {
    let macros = source("reference/pokeemerald/asm/macros/battle_script.inc");
    assert_eq!(
        line(&macros, 181).trim(),
        ".macro jumpiftype battler:req, type:req, ptr:req"
    );
    assert_eq!(line(&macros, 182).trim(), ".byte B_SCR_OP_JUMPIFTYPE");
    assert_eq!(line(&macros, 185).trim(), ".4byte \\ptr");
    assert_eq!(
        line(&macros, 366).trim(),
        ".macro jumpiftype2 battler:req, type:req, ptr:req"
    );
    assert_eq!(line(&macros, 367).trim(), ".byte B_SCR_OP_JUMPIFTYPE2");
    assert_eq!(line(&macros, 918).trim(), ".macro cursetarget ptr:req");
    assert_eq!(line(&macros, 919).trim(), ".byte B_SCR_OP_CURSETARGET");
    assert_eq!(line(&macros, 920).trim(), ".4byte \\ptr");
    assert_eq!(BATTLE_SCRIPT_JUMPIFTYPE_ENCODED_WIDTH_BYTES, 7);
    assert_eq!(BATTLE_SCRIPT_CURSETARGET_ENCODED_WIDTH_BYTES, 5);
}

#[test]
fn committed_program_call_site_counts_match_brief() {
    let scripts = source("reference/pokeemerald/data/battle_scripts_1.s");
    let jumpiftype_sites = scripts.matches("jumpiftype ").count();
    let jumpiftype2_sites = scripts.matches("jumpiftype2 ").count();
    let cursetarget_sites = scripts.matches("cursetarget ").count();
    // "jumpiftype " (trailing space right after the mnemonic) never matches a
    // "jumpiftype2 " line, since that line's next character is "2" not a
    // space -- the two counts are independent.
    assert_eq!(jumpiftype_sites, 5, "expected 5 jumpiftype call sites");
    assert_eq!(jumpiftype2_sites, 1, "expected 1 jumpiftype2 call site");
    assert_eq!(cursetarget_sites, 1, "expected 1 cursetarget call site");

    assert!(scripts.contains("jumpiftype BS_TARGET, TYPE_POISON, BattleScript_NotAffected"));
    assert!(scripts.contains("jumpiftype BS_TARGET, TYPE_STEEL, BattleScript_NotAffected"));
    assert!(scripts.contains("jumpiftype BS_TARGET, TYPE_FIRE, BattleScript_NotAffected"));
    assert!(scripts.contains("jumpiftype2 BS_ATTACKER, TYPE_GHOST, BattleScript_GhostCurse"));
    assert!(scripts.contains("cursetarget BattleScript_ButItFailed"));
}

#[test]
fn type_universe_and_helper_are_independent() {
    assert!(is_recognized_battle_type("TYPE_NORMAL"));
    assert!(is_recognized_battle_type("TYPE_DARK"));
    assert!(!is_recognized_battle_type("TYPE_MYSTERY_BOGUS"));
    assert_eq!(BATTLE_SCRIPT_TYPE_NAMES.len(), 18);

    let pokemon_h = source("reference/pokeemerald/include/constants/pokemon.h");
    assert_eq!(
        line(&pokemon_h, 6).split_whitespace().collect::<Vec<_>>(),
        ["#define", "TYPE_NORMAL", "0"]
    );
    assert_eq!(
        line(&pokemon_h, 23).split_whitespace().collect::<Vec<_>>(),
        ["#define", "TYPE_DARK", "17"]
    );
}

#[test]
fn generator_and_corpus_provenance_are_recorded() {
    assert_eq!(BATTLE_SCRIPT_TYPE_CURSE_VECTOR_CORPUS_SHA256.len(), 64);
    assert_eq!(BATTLE_SCRIPT_TYPE_CURSE_VECTOR_GENERATOR_SHA256.len(), 64);
    assert!(BATTLE_SCRIPT_TYPE_CURSE_JUMP_CASES.len() >= 20);
    assert!(BATTLE_SCRIPT_TYPE_CURSE_CURSETARGET_CASES.len() >= 6);
    assert_eq!(BATTLE_SCRIPT_TYPE_CURSE_REGISTRATION_CASES.len(), 17);
}
