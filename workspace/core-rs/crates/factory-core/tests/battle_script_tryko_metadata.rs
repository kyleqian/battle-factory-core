//! Independent source/dispatch/macro/call-site/constants/corpus provenance
//! ratchets for `Cmd_tryKO`. Behavioral differential replay lives in the
//! sibling vector test, so canonical TypeScript cannot substitute for source
//! evidence here.

use std::{fs, path::PathBuf, process::Command};

use factory_core::battle_script_tryko::*;
use factory_core::battle_script_tryko_vectors_gen::*;

fn workspace_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../..")
}

fn source(relative: &str) -> String {
    fs::read_to_string(workspace_root().join(relative))
        .unwrap_or_else(|error| panic!("could not read {relative}: {error}"))
}

fn line(source: &str, number: u32) -> &str {
    source
        .lines()
        .nth(number as usize - 1)
        .unwrap_or_else(|| panic!("missing source line {number}"))
}

fn sha256(relative: &str) -> String {
    let output = Command::new("shasum")
        .args(["-a", "256", relative])
        .current_dir(workspace_root())
        .output()
        .expect("run shasum");
    assert!(output.status.success(), "shasum did not succeed");
    String::from_utf8(output.stdout)
        .expect("shasum output must be UTF-8")
        .split_whitespace()
        .next()
        .expect("shasum must print a digest")
        .to_owned()
}

#[test]
fn dispatch_forward_declaration_and_handler_body_are_exact() {
    let commands = source("reference/pokeemerald/src/battle_script_commands.c");
    let command_ids = source("reference/pokeemerald/include/constants/battle_script_commands.h");

    assert_eq!(BATTLE_SCRIPT_TRYKO_OPCODE, 0x93);
    assert_eq!(BATTLE_SCRIPT_TRYKO_OPCODE_NAME, "B_SCR_OP_TRYKO");
    assert_eq!(BATTLE_SCRIPT_TRYKO_DISPATCHER, "Cmd_tryKO");

    // Forward declaration (:226).
    assert_eq!(line(&commands, 226).trim(), "static void Cmd_tryKO(void);");

    // Dispatch row (:478 //0x93).
    assert_eq!(
        line(&commands, 478).trim(),
        "[B_SCR_OP_TRYKO]                           = Cmd_tryKO,                                   //0x93"
    );

    // Opcode enum position.
    assert_eq!(line(&command_ids, 153).trim(), "B_SCR_OP_TRYKO,");

    // Handler body (:7490-7574; :7576 is the following function's comment).
    assert_eq!(line(&commands, 7490), "static void Cmd_tryKO(void)");
    assert_eq!(
        line(&commands, 7507).trim(),
        "if (holdEffect == HOLD_EFFECT_FOCUS_BAND && (Random() % 100) < param)"
    );
    assert_eq!(
        line(&commands, 7513).trim(),
        "if (gBattleMons[gBattlerTarget].ability == ABILITY_STURDY)"
    );
    assert_eq!(
        line(&commands, 7517).trim(),
        "gBattlescriptCurrInstr = BattleScript_SturdyPreventsOHKO;"
    );
    assert_eq!(
        line(&commands, 7523).trim(),
        "if (!(gStatuses3[gBattlerTarget] & STATUS3_ALWAYS_HITS))"
    );
    assert_eq!(
        line(&commands, 7538).trim(),
        "chance = gBattleMoves[gCurrentMove].accuracy + (gBattleMons[gBattlerAttacker].level - gBattleMons[gBattlerTarget].level);"
    );
    assert_eq!(
        line(&commands, 7539).trim(),
        "if (Random() % 100 + 1 < chance && gBattleMons[gBattlerAttacker].level >= gBattleMons[gBattlerTarget].level)"
    );
    assert_eq!(line(&commands, 7544).trim(), "if (chance)");
    assert_eq!(
        line(&commands, 7546).trim(),
        "if (gProtectStructs[gBattlerTarget].endured)"
    );
    assert_eq!(
        line(&commands, 7551).trim(),
        "else if (gSpecialStatuses[gBattlerTarget].focusBanded)"
    );
    assert_eq!(line(&commands, 7562).trim(), "gBattlescriptCurrInstr += 5;");
    assert_eq!(line(&commands, 7564).trim(), "else");
    assert_eq!(
        line(&commands, 7566).trim(),
        "gMoveResultFlags |= MOVE_RESULT_MISSED;"
    );
    assert_eq!(
        line(&commands, 7571).trim(),
        "gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 1);"
    );
    assert_eq!(line(&commands, 7574).trim(), "}");
    assert_eq!(line(&commands, 7576).trim(), "// Super Fang");
}

#[test]
fn macro_declaration_encoded_width_and_call_site_are_exact() {
    let macros = source("reference/pokeemerald/asm/macros/battle_script.inc");
    let scripts = source("reference/pokeemerald/data/battle_scripts_1.s");

    assert_eq!(line(&macros, 793).trim(), ".macro tryKO ptr:req");
    assert_eq!(line(&macros, 794).trim(), ".byte B_SCR_OP_TRYKO");
    assert_eq!(line(&macros, 795).trim(), r".4byte \ptr");
    assert_eq!(line(&macros, 796).trim(), ".endm");
    assert_eq!(BATTLE_SCRIPT_TRYKO_ENCODED_WIDTH_BYTES, 5);
    assert_eq!(BATTLE_SCRIPT_TRYKO_POINTER_WIDTH_BYTES, 4);

    assert_eq!(line(&scripts, 769).trim(), "tryKO BattleScript_KOFail");
    assert_eq!(
        scripts.matches("\ttryKO ").count(),
        1,
        "call site must be unique"
    );
    assert_eq!(line(&scripts, 762), "BattleScript_EffectOHKO::");
    assert_eq!(line(&scripts, 772), "BattleScript_KOFail::");
}

#[test]
fn source_constants_are_exact() {
    let battle_constants = source("reference/pokeemerald/include/constants/battle.h");
    let ability_constants = source("reference/pokeemerald/include/constants/abilities.h");
    let hold_effects = source("reference/pokeemerald/include/constants/hold_effects.h");
    let battle_message = source("reference/pokeemerald/src/battle_message.c");
    let battle_string_ids = source("reference/pokeemerald/include/constants/battle_string_ids.h");

    assert_eq!(
        line(&battle_constants, 160).trim(),
        "#define STATUS3_ALWAYS_HITS             (1 << 3 | 1 << 4)"
    );
    assert_eq!(
        line(&ability_constants, 9).trim(),
        "#define ABILITY_STURDY 5"
    );
    assert_eq!(
        line(&hold_effects, 43).trim(),
        "#define HOLD_EFFECT_FOCUS_BAND     39"
    );
    assert_eq!(
        line(&battle_constants, 220).trim(),
        "#define MOVE_RESULT_MISSED             (1 << 0)"
    );
    assert_eq!(
        line(&battle_constants, 224).trim(),
        "#define MOVE_RESULT_ONE_HIT_KO         (1 << 4)"
    );
    assert_eq!(
        line(&battle_constants, 226).trim(),
        "#define MOVE_RESULT_FOE_ENDURED        (1 << 6)"
    );
    assert_eq!(
        line(&battle_constants, 227).trim(),
        "#define MOVE_RESULT_FOE_HUNG_ON        (1 << 7)"
    );
    assert_eq!(
        line(&battle_message, 1108).trim(),
        "const u16 gKOFailedStringIds[] ="
    );
    assert_eq!(
        line(&battle_message, 1110).trim(),
        "[B_MSG_KO_MISS]       = STRINGID_ATTACKMISSED,"
    );
    assert_eq!(
        line(&battle_message, 1111).trim(),
        "[B_MSG_KO_UNAFFECTED] = STRINGID_PKMNUNAFFECTED"
    );
    assert_eq!(
        line(&battle_string_ids, 492).trim(),
        "#define B_MSG_KO_MISS       0"
    );
    assert_eq!(
        line(&battle_string_ids, 493).trim(),
        "#define B_MSG_KO_UNAFFECTED 1"
    );

    assert_eq!(BATTLE_SCRIPT_TRYKO_STATUS3_ALWAYS_HITS, (1 << 3) | (1 << 4));
    assert_eq!(BATTLE_SCRIPT_TRYKO_ABILITY_STURDY, 5);
    assert_eq!(BATTLE_SCRIPT_TRYKO_HOLD_EFFECT_FOCUS_BAND, 39);
    assert_eq!(BATTLE_SCRIPT_TRYKO_MOVE_RESULT_MISSED, 1 << 0);
    assert_eq!(BATTLE_SCRIPT_TRYKO_MOVE_RESULT_ONE_HIT_KO, 1 << 4);
    assert_eq!(BATTLE_SCRIPT_TRYKO_MOVE_RESULT_FOE_ENDURED, 1 << 6);
    assert_eq!(BATTLE_SCRIPT_TRYKO_MOVE_RESULT_FOE_HUNG_ON, 1 << 7);
    assert_eq!(BATTLE_SCRIPT_TRYKO_MSG_KO_MISS, 0);
    assert_eq!(BATTLE_SCRIPT_TRYKO_MSG_KO_UNAFFECTED, 1);
    assert_eq!(
        BATTLE_SCRIPT_TRYKO_STURDY_LABEL,
        "BattleScript_SturdyPreventsOHKO"
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYKO_FOCUS_BAND_RNG_REASON,
        "tryko-focus-band"
    );
    assert_eq!(BATTLE_SCRIPT_TRYKO_RNG_REASON, "tryko");
}

#[test]
fn deterministic_corpus_counts_sizes_hashes_and_generation_provenance_are_pinned() {
    assert_eq!(BATTLE_SCRIPT_TRYKO_CASES.len(), 27);
    assert_eq!(BATTLE_SCRIPT_TRYKO_REGISTRATION_CASES.len(), 3);
    assert_eq!(
        BATTLE_SCRIPT_TRYKO_VECTOR_CORPUS_SHA256,
        "c949f5acd9149736b56ac90e07e71fb2f18b399abe7cb30cce09b7a97cf429d7"
    );
    assert_eq!(BATTLE_SCRIPT_TRYKO_VECTOR_CORPUS_BYTES, 52_220);
    assert_eq!(
        BATTLE_SCRIPT_TRYKO_VECTOR_GENERATOR_SHA256,
        "6cd890b0590f2ab44c2bc5a23164127a2c71dbebd35460d75eca9452db273e1c"
    );
    assert_eq!(BATTLE_SCRIPT_TRYKO_VECTOR_GENERATOR_BYTES, 37_557);

    let generated = include_bytes!("../src/battle_script_tryko_vectors_gen.rs");
    assert_eq!(generated.len(), 150_325);
    assert_eq!(
        sha256("core-rs/crates/factory-core/src/battle_script_tryko_vectors_gen.rs"),
        "763d99eb7861392102d11da5bd685c548755e5c70c9e866e99c99a1366df3278"
    );
    assert_eq!(
        fs::metadata(workspace_root().join("core-rs/tools/gen-battle-script-tryko-vectors.mjs"))
            .expect("generator metadata")
            .len(),
        37_557
    );
    assert_eq!(
        sha256("core-rs/tools/gen-battle-script-tryko-vectors.mjs"),
        "6cd890b0590f2ab44c2bc5a23164127a2c71dbebd35460d75eca9452db273e1c"
    );
    let generated_text = std::str::from_utf8(generated).expect("generated Rust is UTF-8");
    assert!(generated_text.contains(
        "Source: executing canonical src/engine/battleScriptTryKOOpcode.ts via node --experimental-strip-types."
    ));
    assert!(
        generated_text.contains("GENERATED by core-rs/tools/gen-battle-script-tryko-vectors.mjs.")
    );
}
