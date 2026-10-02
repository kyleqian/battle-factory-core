//! Independent source/macro/call-site and artifact-identity ratchets for the
//! `B_SCR_OP_ADJUSTNORMALDAMAGE` / `B_SCR_OP_ADJUSTNORMALDAMAGE2` /
//! `B_SCR_OP_ADJUSTSETDAMAGE` family. Behavioral differential replay lives
//! in the sibling test binary.

use std::{fs, path::PathBuf};

use factory_core::battle_script_adjustdamage::*;
use factory_core::battle_script_adjustdamage_vectors_gen::*;

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

fn sha256(path: &str) -> String {
    let output = std::process::Command::new("sh")
        .args(["-c", &format!("shasum -a 256 {} | cut -d ' ' -f 1", path)])
        .current_dir(workspace_root())
        .output()
        .expect("run shasum");
    assert!(output.status.success());
    String::from_utf8(output.stdout).unwrap().trim().to_owned()
}

#[test]
fn exact_opcode_dispatch_macro_and_call_site_lines_are_pinned() {
    let commands = source("reference/pokeemerald/src/battle_script_commands.c");
    let command_ids = source("reference/pokeemerald/include/constants/battle_script_commands.h");
    let macros = source("reference/pokeemerald/asm/macros/battle_script.inc");
    let scripts = source("reference/pokeemerald/data/battle_scripts_1.s");
    let battle_h = source("reference/pokeemerald/include/constants/battle.h");
    let hold_effects_h = source("reference/pokeemerald/include/constants/hold_effects.h");
    let move_effects_h = source("reference/pokeemerald/include/constants/battle_move_effects.h");

    assert_eq!(BATTLE_SCRIPT_ADJUSTNORMALDAMAGE_OPCODE, 0x07);
    assert_eq!(
        BATTLE_SCRIPT_ADJUSTNORMALDAMAGE_OPCODE_NAME,
        "B_SCR_OP_ADJUSTNORMALDAMAGE"
    );
    assert_eq!(
        BATTLE_SCRIPT_ADJUSTNORMALDAMAGE_DISPATCHER,
        "Cmd_adjustnormaldamage"
    );
    assert_eq!(BATTLE_SCRIPT_ADJUSTNORMALDAMAGE2_OPCODE, 0x08);
    assert_eq!(
        BATTLE_SCRIPT_ADJUSTNORMALDAMAGE2_OPCODE_NAME,
        "B_SCR_OP_ADJUSTNORMALDAMAGE2"
    );
    assert_eq!(
        BATTLE_SCRIPT_ADJUSTNORMALDAMAGE2_DISPATCHER,
        "Cmd_adjustnormaldamage2"
    );
    assert_eq!(BATTLE_SCRIPT_ADJUSTSETDAMAGE_OPCODE, 0x69);
    assert_eq!(
        BATTLE_SCRIPT_ADJUSTSETDAMAGE_OPCODE_NAME,
        "B_SCR_OP_ADJUSTSETDAMAGE"
    );
    assert_eq!(
        BATTLE_SCRIPT_ADJUSTSETDAMAGE_DISPATCHER,
        "Cmd_adjustsetdamage"
    );
    assert_eq!(BATTLE_SCRIPT_ADJUSTDAMAGE_ENCODED_WIDTH_BYTES, 1);
    assert_eq!(BATTLE_SCRIPT_ADJUSTDAMAGE_HOLD_EFFECT_FOCUS_BAND, 39);
    assert_eq!(BATTLE_SCRIPT_ADJUSTDAMAGE_STATUS2_SUBSTITUTE, 1 << 24);
    assert_eq!(BATTLE_SCRIPT_ADJUSTDAMAGE_MOVE_RESULT_FOE_ENDURED, 1 << 6);
    assert_eq!(BATTLE_SCRIPT_ADJUSTDAMAGE_MOVE_RESULT_FOE_HUNG_ON, 1 << 7);
    assert_eq!(BATTLE_SCRIPT_ADJUSTDAMAGE_EFFECT_FALSE_SWIPE, 101);
    assert_eq!(
        BATTLE_SCRIPT_ADJUSTNORMALDAMAGE_RNG_REASON,
        "adjustnormaldamage"
    );
    assert_eq!(
        BATTLE_SCRIPT_ADJUSTNORMALDAMAGE_FOCUS_BAND_RNG_REASON,
        "adjustnormaldamage-focus-band"
    );
    assert_eq!(
        BATTLE_SCRIPT_ADJUSTNORMALDAMAGE2_RNG_REASON,
        "adjustnormaldamage2"
    );
    assert_eq!(
        BATTLE_SCRIPT_ADJUSTNORMALDAMAGE2_FOCUS_BAND_RNG_REASON,
        "adjustnormaldamage2-focus-band"
    );
    assert_eq!(
        BATTLE_SCRIPT_ADJUSTSETDAMAGE_FOCUS_BAND_RNG_REASON,
        "adjustsetdamage-focus-band"
    );

    // Forward declarations (:86, :87, :184).
    assert_eq!(
        line(&commands, 86),
        "static void Cmd_adjustnormaldamage(void);"
    );
    assert_eq!(
        line(&commands, 87),
        "static void Cmd_adjustnormaldamage2(void);"
    );
    assert_eq!(
        line(&commands, 184),
        "static void Cmd_adjustsetdamage(void);"
    );

    // Dispatch rows (:338 //0x7, :339 //0x8, :436 //0x69).
    assert_eq!(
        line(&commands, 338).trim(),
        "[B_SCR_OP_ADJUSTNORMALDAMAGE]              = Cmd_adjustnormaldamage,                      //0x7"
    );
    assert_eq!(
        line(&commands, 339).trim(),
        "[B_SCR_OP_ADJUSTNORMALDAMAGE2]             = Cmd_adjustnormaldamage2,                     //0x8"
    );
    assert_eq!(
        line(&commands, 436).trim(),
        "[B_SCR_OP_ADJUSTSETDAMAGE]                 = Cmd_adjustsetdamage,                         //0x69"
    );

    // Handler bodies (:1658-1698, :1701-1741, :5861-5899).
    assert_eq!(
        line(&commands, 1658),
        "static void Cmd_adjustnormaldamage(void)"
    );
    assert_eq!(line(&commands, 1698), "}");
    assert_eq!(
        line(&commands, 1700).trim(),
        "// The same as adjustnormaldamage except it doesn't check for false swipe move effect."
    );
    assert_eq!(
        line(&commands, 1701),
        "static void Cmd_adjustnormaldamage2(void)"
    );
    assert_eq!(line(&commands, 1741), "}");
    assert_eq!(
        line(&commands, 5860).trim(),
        "// The same as adjustnormaldamage, except there's no random damage multiplier."
    );
    assert_eq!(
        line(&commands, 5861),
        "static void Cmd_adjustsetdamage(void)"
    );
    assert_eq!(line(&commands, 5899), "}");

    let normaldamage_body: String = commands
        .lines()
        .skip(1657)
        .take(41)
        .collect::<Vec<_>>()
        .join("\n");
    assert!(normaldamage_body.contains("ApplyRandomDmgMultiplier();"));
    assert!(normaldamage_body
        .contains("if (holdEffect == HOLD_EFFECT_FOCUS_BAND && (Random() % 100) < param)"));
    assert!(normaldamage_body.contains("gSpecialStatuses[gBattlerTarget].focusBanded = 1;"));
    assert!(normaldamage_body.contains(
        "&& (gBattleMoves[gCurrentMove].effect == EFFECT_FALSE_SWIPE || gProtectStructs[gBattlerTarget].endured || gSpecialStatuses[gBattlerTarget].focusBanded)"
    ));
    assert!(normaldamage_body.contains("gMoveResultFlags |= MOVE_RESULT_FOE_ENDURED;"));
    assert!(normaldamage_body.contains("gMoveResultFlags |= MOVE_RESULT_FOE_HUNG_ON;"));
    assert!(normaldamage_body.contains("gLastUsedItem = gBattleMons[gBattlerTarget].item;"));

    let normaldamage2_body: String = commands
        .lines()
        .skip(1700)
        .take(41)
        .collect::<Vec<_>>()
        .join("\n");
    assert!(normaldamage2_body.contains("ApplyRandomDmgMultiplier();"));
    assert!(!normaldamage2_body.contains("EFFECT_FALSE_SWIPE"));
    assert!(normaldamage2_body.contains(
        "&& (gProtectStructs[gBattlerTarget].endured || gSpecialStatuses[gBattlerTarget].focusBanded)"
    ));

    let setdamage_body: String = commands
        .lines()
        .skip(5860)
        .take(40)
        .collect::<Vec<_>>()
        .join("\n");
    assert!(!setdamage_body.contains("ApplyRandomDmgMultiplier();"));
    assert!(setdamage_body.contains(
        "&& (gBattleMoves[gCurrentMove].effect == EFFECT_FALSE_SWIPE || gProtectStructs[gBattlerTarget].endured || gSpecialStatuses[gBattlerTarget].focusBanded)"
    ));

    // Opcode enum positions (:13, :14, :111).
    assert_eq!(
        line(&command_ids, 13).trim(),
        "B_SCR_OP_ADJUSTNORMALDAMAGE,"
    );
    assert_eq!(
        line(&command_ids, 14).trim(),
        "B_SCR_OP_ADJUSTNORMALDAMAGE2,"
    );
    assert_eq!(line(&command_ids, 111).trim(), "B_SCR_OP_ADJUSTSETDAMAGE,");

    // Macros (:32-34, :36-38, :603-605): each a single .byte, no operand.
    assert_eq!(line(&macros, 32).trim(), ".macro adjustnormaldamage");
    assert_eq!(
        line(&macros, 33).trim(),
        ".byte B_SCR_OP_ADJUSTNORMALDAMAGE"
    );
    assert_eq!(line(&macros, 34).trim(), ".endm");
    assert_eq!(line(&macros, 36).trim(), ".macro adjustnormaldamage2");
    assert_eq!(
        line(&macros, 37).trim(),
        ".byte B_SCR_OP_ADJUSTNORMALDAMAGE2"
    );
    assert_eq!(line(&macros, 38).trim(), ".endm");
    assert_eq!(line(&macros, 603).trim(), ".macro adjustsetdamage");
    assert_eq!(line(&macros, 604).trim(), ".byte B_SCR_OP_ADJUSTSETDAMAGE");
    assert_eq!(line(&macros, 605).trim(), ".endm");

    // STATUS2_SUBSTITUTE (:148), MOVE_RESULT_FOE_ENDURED (:226),
    // MOVE_RESULT_FOE_HUNG_ON (:227).
    assert_eq!(
        line(&battle_h, 148).trim(),
        "#define STATUS2_SUBSTITUTE            (1 << 24)"
    );
    assert_eq!(
        line(&battle_h, 226).trim(),
        "#define MOVE_RESULT_FOE_ENDURED        (1 << 6)"
    );
    assert_eq!(
        line(&battle_h, 227).trim(),
        "#define MOVE_RESULT_FOE_HUNG_ON        (1 << 7)"
    );
    // HOLD_EFFECT_FOCUS_BAND (:43).
    assert_eq!(
        line(&hold_effects_h, 43).trim(),
        "#define HOLD_EFFECT_FOCUS_BAND     39"
    );
    // EFFECT_FALSE_SWIPE (:105).
    assert_eq!(
        line(&move_effects_h, 105).trim(),
        "#define EFFECT_FALSE_SWIPE 101"
    );

    // First concrete call sites (:252, :3517, :827).
    assert_eq!(line(&scripts, 252).trim(), "adjustnormaldamage");
    assert_eq!(line(&scripts, 3517).trim(), "adjustnormaldamage2");
    assert_eq!(line(&scripts, 827).trim(), "adjustsetdamage");

    // Exact bare call-site counts (12 / 2 / 9).
    let count = |needle: &str| {
        scripts
            .lines()
            .filter(|candidate| candidate.trim() == needle)
            .count()
    };
    assert_eq!(count("adjustnormaldamage"), 12);
    assert_eq!(count("adjustnormaldamage2"), 2);
    assert_eq!(count("adjustsetdamage"), 9);
    assert_eq!(
        BATTLE_SCRIPT_ADJUSTNORMALDAMAGE_CONCRETE_CALL_SITE_COUNT,
        12
    );
    assert_eq!(
        BATTLE_SCRIPT_ADJUSTNORMALDAMAGE2_CONCRETE_CALL_SITE_COUNT,
        2
    );
    assert_eq!(BATTLE_SCRIPT_ADJUSTSETDAMAGE_CONCRETE_CALL_SITE_COUNT, 9);
}

#[test]
fn corpus_counts_sizes_hashes_and_generation_provenance_are_pinned() {
    assert_eq!(BATTLE_SCRIPT_ADJUSTDAMAGE_CASES.len(), 34);
    assert_eq!(BATTLE_SCRIPT_ADJUSTDAMAGE_REGISTRATION_CASES.len(), 4);
    assert_eq!(
        BATTLE_SCRIPT_ADJUSTDAMAGE_VECTOR_CORPUS_SHA256,
        "02413888d15f9578a2cc3cba2a8add8df97e1c1f9ecf149a5062cf3e32e545ec"
    );
    assert_eq!(
        BATTLE_SCRIPT_ADJUSTDAMAGE_VECTOR_GENERATOR_SHA256,
        "6bac564d27a4f08fc1ddebac5b31da4f926be80109e6361f9c104da1f3c4fc31"
    );
    assert_eq!(BATTLE_SCRIPT_ADJUSTDAMAGE_VECTOR_GENERATOR_BYTES, 37_037);

    let generated = include_bytes!("../src/battle_script_adjustdamage_vectors_gen.rs");
    assert_eq!(generated.len(), 478_116);
    assert_eq!(
        sha256("core-rs/crates/factory-core/src/battle_script_adjustdamage_vectors_gen.rs"),
        "078338789b21aaf507537ffe76d6fd12f529328ae12ee00ac67f93b9528816d9"
    );
    assert_eq!(
        fs::metadata(
            workspace_root().join("core-rs/tools/gen-battle-script-adjustdamage-vectors.mjs")
        )
        .unwrap()
        .len(),
        37_037
    );
    assert_eq!(
        sha256("core-rs/tools/gen-battle-script-adjustdamage-vectors.mjs"),
        "6bac564d27a4f08fc1ddebac5b31da4f926be80109e6361f9c104da1f3c4fc31"
    );
    let generated_text = std::str::from_utf8(generated).unwrap();
    assert!(generated_text.contains(
        "Source: executing canonical src/engine/battleScriptHitChainOpcode.ts via node --experimental-strip-types."
    ));
    assert!(generated_text.contains("Regenerate from any cwd; do not hand-edit."));
}
