//! Independent source/dispatch/macro/call-site/corpus ratchets for
//! `Cmd_jumpifstatus`/`Cmd_jumpifstatus2`.

use std::{fs, path::PathBuf};

use factory_core::battle_script_jumpifstatus::*;
use factory_core::battle_script_jumpifstatus_vectors_gen::*;

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
fn decomp_dispatch_evidence_is_independent() {
    let commands = source("reference/pokeemerald/src/battle_script_commands.c");
    let evidence = BATTLE_SCRIPT_JUMPIFSTATUS_DECOMP_EVIDENCE;
    assert_eq!(
        evidence,
        BattleScriptJumpifstatusDecompEvidence {
            jumpifstatus_dispatch_line: 359,
            jumpifstatus2_dispatch_line: 360,
            jumpifstatus_forward_decl_line: 107,
            jumpifstatus2_forward_decl_line: 108,
            jumpifstatus_handler_line: 3081,
            jumpifstatus2_handler_line: 3093,
            jumpifstatus_battler_line: 3083,
            jumpifstatus_flags_line: 3084,
            jumpifstatus_ptr_line: 3085,
            jumpifstatus_if_line: 3087,
            jumpifstatus_jump_line: 3088,
            jumpifstatus_advance_line: 3090,
            jumpifstatus2_battler_line: 3095,
            jumpifstatus2_flags_line: 3096,
            jumpifstatus2_ptr_line: 3097,
            jumpifstatus2_if_line: 3099,
            jumpifstatus2_jump_line: 3100,
            jumpifstatus2_advance_line: 3102,
            enum_jumpifstatus_line: 34,
            enum_jumpifstatus2_line: 35,
        }
    );

    assert!(line(&commands, 359).contains("[B_SCR_OP_JUMPIFSTATUS]"));
    assert!(line(&commands, 359).contains("Cmd_jumpifstatus,"));
    assert!(line(&commands, 359).contains("//0x1C"));
    assert!(line(&commands, 360).contains("[B_SCR_OP_JUMPIFSTATUS2]"));
    assert!(line(&commands, 360).contains("Cmd_jumpifstatus2,"));
    assert!(line(&commands, 360).contains("//0x1D"));
    assert_eq!(line(&commands, 107), "static void Cmd_jumpifstatus(void);");
    assert_eq!(line(&commands, 108), "static void Cmd_jumpifstatus2(void);");
    assert_eq!(line(&commands, 3081), "static void Cmd_jumpifstatus(void)");
    assert_eq!(line(&commands, 3093), "static void Cmd_jumpifstatus2(void)");
    assert_eq!(
        line(&commands, 3083).trim(),
        "u8 battler = GetBattlerForBattleScript(gBattlescriptCurrInstr[1]);"
    );
    assert_eq!(
        line(&commands, 3084).trim(),
        "u32 flags = T2_READ_32(gBattlescriptCurrInstr + 2);"
    );
    assert_eq!(
        line(&commands, 3085).trim(),
        "const u8 *jumpPtr = T2_READ_PTR(gBattlescriptCurrInstr + 6);"
    );
    assert_eq!(
        line(&commands, 3087).trim(),
        "if (gBattleMons[battler].status1 & flags && gBattleMons[battler].hp != 0)"
    );
    assert_eq!(
        line(&commands, 3088).trim(),
        "gBattlescriptCurrInstr = jumpPtr;"
    );
    assert_eq!(
        line(&commands, 3090).trim(),
        "gBattlescriptCurrInstr += 10;"
    );
    assert_eq!(
        line(&commands, 3095).trim(),
        "u8 battler = GetBattlerForBattleScript(gBattlescriptCurrInstr[1]);"
    );
    assert_eq!(
        line(&commands, 3096).trim(),
        "u32 flags = T2_READ_32(gBattlescriptCurrInstr + 2);"
    );
    assert_eq!(
        line(&commands, 3097).trim(),
        "const u8 *jumpPtr = T2_READ_PTR(gBattlescriptCurrInstr + 6);"
    );
    assert_eq!(
        line(&commands, 3099).trim(),
        "if (gBattleMons[battler].status2 & flags && gBattleMons[battler].hp != 0)"
    );
    assert_eq!(
        line(&commands, 3100).trim(),
        "gBattlescriptCurrInstr = jumpPtr;"
    );
    assert_eq!(
        line(&commands, 3102).trim(),
        "gBattlescriptCurrInstr += 10;"
    );

    let enum_header = source("reference/pokeemerald/include/constants/battle_script_commands.h");
    assert_eq!(line(&enum_header, 34).trim(), "B_SCR_OP_JUMPIFSTATUS,");
    assert_eq!(line(&enum_header, 35).trim(), "B_SCR_OP_JUMPIFSTATUS2,");
}

#[test]
fn macro_evidence_is_independent() {
    let macros = source("reference/pokeemerald/asm/macros/battle_script.inc");
    let evidence = BATTLE_SCRIPT_JUMPIFSTATUS_MACRO_EVIDENCE;
    assert_eq!(
        evidence,
        BattleScriptJumpifstatusMacroEvidence {
            jumpifstatus_declaration_line: 136,
            jumpifstatus_opcode_line: 137,
            jumpifstatus_battler_line: 138,
            jumpifstatus_status1_line: 139,
            jumpifstatus_pointer_line: 140,
            jumpifstatus2_declaration_line: 143,
            jumpifstatus2_opcode_line: 144,
            jumpifstatus2_battler_line: 145,
            jumpifstatus2_status2_line: 146,
            jumpifstatus2_pointer_line: 147,
            encoded_width_bytes: 10,
        }
    );
    assert_eq!(
        line(&macros, 136).trim(),
        ".macro jumpifstatus battler:req, status1:req, ptr:req"
    );
    assert_eq!(line(&macros, 137).trim(), ".byte B_SCR_OP_JUMPIFSTATUS");
    assert_eq!(line(&macros, 138).trim(), ".byte \\battler");
    assert_eq!(line(&macros, 139).trim(), ".4byte \\status1");
    assert_eq!(line(&macros, 140).trim(), ".4byte \\ptr");
    assert_eq!(
        line(&macros, 143).trim(),
        ".macro jumpifstatus2 battler:req, status2:req, ptr:req"
    );
    assert_eq!(line(&macros, 144).trim(), ".byte B_SCR_OP_JUMPIFSTATUS2");
    assert_eq!(line(&macros, 145).trim(), ".byte \\battler");
    assert_eq!(line(&macros, 146).trim(), ".4byte \\status2");
    assert_eq!(line(&macros, 147).trim(), ".4byte \\ptr");
}

#[test]
fn committed_program_call_site_counts_match_brief() {
    let scripts = source("reference/pokeemerald/data/battle_scripts_1.s");
    let status1_sites = scripts.matches("jumpifstatus ").count();
    let status2_sites = scripts.matches("jumpifstatus2 ").count();
    assert_eq!(status1_sites, 21, "expected 21 jumpifstatus call sites");
    assert_eq!(status2_sites, 37, "expected 37 jumpifstatus2 call sites");
    assert!(scripts.contains("jumpifstatus BS_TARGET, STATUS1_SLEEP, BattleScript_AlreadyAsleep"));
    assert!(scripts.contains(
        "jumpifstatus BS_ATTACKER, STATUS1_POISON | STATUS1_BURN | STATUS1_PARALYSIS | STATUS1_TOXIC_POISON, BattleScript_FacadeDoubleDmg"
    ));
    assert!(
        scripts.contains("jumpifstatus2 BS_TARGET, STATUS2_SUBSTITUTE, BattleScript_ButItFailed")
    );
    assert!(scripts
        .contains("jumpifstatus2 BS_ATTACKER, STATUS2_MULTIPLETURNS, BattleScript_EffectRampage2"));
}

#[test]
fn status1_and_status2_bit_constants_cite_battle_h() {
    let battle_h = source("reference/pokeemerald/include/constants/battle.h");
    assert_eq!(
        line(&battle_h, 115).trim(),
        "#define STATUS1_SLEEP            (1 << 0 | 1 << 1 | 1 << 2) // First 3 bits (Number of turns to sleep)"
    );
    assert_eq!(
        line(&battle_h, 117).trim(),
        "#define STATUS1_POISON           (1 << 3)"
    );
    assert_eq!(
        line(&battle_h, 118).trim(),
        "#define STATUS1_BURN             (1 << 4)"
    );
    assert_eq!(
        line(&battle_h, 119).trim(),
        "#define STATUS1_FREEZE           (1 << 5)"
    );
    assert_eq!(
        line(&battle_h, 120).trim(),
        "#define STATUS1_PARALYSIS        (1 << 6)"
    );
    assert_eq!(
        line(&battle_h, 121).trim(),
        "#define STATUS1_TOXIC_POISON     (1 << 7)"
    );
    assert!(line(&battle_h, 125).contains("STATUS1_ANY"));
    assert_eq!(
        line(&battle_h, 129).trim(),
        "#define STATUS2_CONFUSION             (1 << 0 | 1 << 1 | 1 << 2)"
    );
    assert_eq!(
        line(&battle_h, 139).trim(),
        "#define STATUS2_MULTIPLETURNS         (1 << 12)"
    );
    assert_eq!(
        line(&battle_h, 144).trim(),
        "#define STATUS2_FOCUS_ENERGY          (1 << 20)"
    );
    assert_eq!(
        line(&battle_h, 148).trim(),
        "#define STATUS2_SUBSTITUTE            (1 << 24)"
    );
    assert_eq!(
        line(&battle_h, 150).trim(),
        "#define STATUS2_ESCAPE_PREVENTION     (1 << 26)"
    );
    assert_eq!(
        line(&battle_h, 151).trim(),
        "#define STATUS2_NIGHTMARE             (1 << 27)"
    );

    assert_eq!(
        resolve_battle_script_jumpifstatus_status1_mask("STATUS1_SLEEP"),
        Some(0x7)
    );
    assert_eq!(
        resolve_battle_script_jumpifstatus_status1_mask("STATUS1_ANY"),
        Some(0xff)
    );
    assert_eq!(
        resolve_battle_script_jumpifstatus2_status2_mask("STATUS2_SUBSTITUTE"),
        Some(1 << 24)
    );
}

#[test]
fn generator_and_corpus_provenance_are_recorded() {
    assert_eq!(BATTLE_SCRIPT_JUMPIFSTATUS_VECTOR_CORPUS_SHA256.len(), 64);
    assert_eq!(BATTLE_SCRIPT_JUMPIFSTATUS_VECTOR_GENERATOR_SHA256.len(), 64);
    assert!(BATTLE_SCRIPT_JUMPIFSTATUS_CATEGORY_CENSUS.len() >= 5);
    assert!(BATTLE_SCRIPT_JUMPIFSTATUS_CASES.len() >= 20);
    assert_eq!(BATTLE_SCRIPT_JUMPIFSTATUS_REGISTRATION_CASES.len(), 5);
}
