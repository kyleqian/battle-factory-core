//! Independent source/macro/call-site and artifact-identity ratchets for the
//! fixed-damage cluster. Behavioral differential replay lives in the
//! sibling test binary.

use std::{fs, path::PathBuf};

use factory_core::battle_script_fixed_damage::*;
use factory_core::battle_script_fixed_damage_vectors_gen::*;

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

    assert_eq!(BATTLE_SCRIPT_DMGTOLEVEL_OPCODE, 0x9f);
    assert_eq!(BATTLE_SCRIPT_DMGTOLEVEL_OPCODE_NAME, "B_SCR_OP_DMGTOLEVEL");
    assert_eq!(BATTLE_SCRIPT_DMGTOLEVEL_DISPATCHER, "Cmd_dmgtolevel");
    assert_eq!(BATTLE_SCRIPT_DMGTOLEVEL_ENCODED_WIDTH_BYTES, 1);

    assert_eq!(BATTLE_SCRIPT_PSYWAVEDAMAGEEFFECT_OPCODE, 0xa0);
    assert_eq!(
        BATTLE_SCRIPT_PSYWAVEDAMAGEEFFECT_OPCODE_NAME,
        "B_SCR_OP_PSYWAVEDAMAGEEFFECT"
    );
    assert_eq!(
        BATTLE_SCRIPT_PSYWAVEDAMAGEEFFECT_DISPATCHER,
        "Cmd_psywavedamageeffect"
    );
    assert_eq!(BATTLE_SCRIPT_PSYWAVEDAMAGEEFFECT_ENCODED_WIDTH_BYTES, 1);
    assert_eq!(
        BATTLE_SCRIPT_PSYWAVEDAMAGEEFFECT_RNG_REASON,
        "psywavedamageeffect"
    );

    assert_eq!(BATTLE_SCRIPT_DAMAGETOHALFTARGETHP_OPCODE, 0x94);
    assert_eq!(
        BATTLE_SCRIPT_DAMAGETOHALFTARGETHP_OPCODE_NAME,
        "B_SCR_OP_DAMAGETOHALFTARGETHP"
    );
    assert_eq!(
        BATTLE_SCRIPT_DAMAGETOHALFTARGETHP_DISPATCHER,
        "Cmd_damagetohalftargethp"
    );
    assert_eq!(BATTLE_SCRIPT_DAMAGETOHALFTARGETHP_ENCODED_WIDTH_BYTES, 1);

    assert_eq!(BATTLE_SCRIPT_SETDAMAGETOHEALTHDIFFERENCE_OPCODE, 0xd8);
    assert_eq!(
        BATTLE_SCRIPT_SETDAMAGETOHEALTHDIFFERENCE_OPCODE_NAME,
        "B_SCR_OP_SETDAMAGETOHEALTHDIFFERENCE"
    );
    assert_eq!(
        BATTLE_SCRIPT_SETDAMAGETOHEALTHDIFFERENCE_DISPATCHER,
        "Cmd_setdamagetohealthdifference"
    );
    assert_eq!(
        BATTLE_SCRIPT_SETDAMAGETOHEALTHDIFFERENCE_ENCODED_WIDTH_BYTES,
        5
    );

    // Forward declarations (:238, :239, :227, :295).
    assert_eq!(line(&commands, 238), "static void Cmd_dmgtolevel(void);");
    assert_eq!(
        line(&commands, 239),
        "static void Cmd_psywavedamageeffect(void);"
    );
    assert_eq!(
        line(&commands, 227),
        "static void Cmd_damagetohalftargethp(void);"
    );
    assert_eq!(
        line(&commands, 295),
        "static void Cmd_setdamagetohealthdifference(void);"
    );

    // Dispatch rows (:490 //0x9F, :491 //0xA0, :479 //0x94, :547 //0xD8).
    assert_eq!(
        line(&commands, 490).trim(),
        "[B_SCR_OP_DMGTOLEVEL]                      = Cmd_dmgtolevel,                              //0x9F"
    );
    assert_eq!(
        line(&commands, 491).trim(),
        "[B_SCR_OP_PSYWAVEDAMAGEEFFECT]             = Cmd_psywavedamageeffect,                     //0xA0"
    );
    assert_eq!(
        line(&commands, 479).trim(),
        "[B_SCR_OP_DAMAGETOHALFTARGETHP]            = Cmd_damagetohalftargethp,                    //0x94"
    );
    assert_eq!(
        line(&commands, 547).trim(),
        "[B_SCR_OP_SETDAMAGETOHEALTHDIFFERENCE]     = Cmd_setdamagetohealthdifference,             //0xD8"
    );

    // Handler bodies (:7926-7930, :7932-7941, :7577-7584, :9366-9377).
    assert_eq!(line(&commands, 7926), "static void Cmd_dmgtolevel(void)");
    assert_eq!(line(&commands, 7930), "}");
    assert!(source_body(&commands, 7925, 6)
        .contains("gBattleMoveDamage = gBattleMons[gBattlerAttacker].level;"));

    assert_eq!(
        line(&commands, 7932),
        "static void Cmd_psywavedamageeffect(void)"
    );
    assert_eq!(line(&commands, 7941), "}");
    let psywave_body = source_body(&commands, 7931, 11);
    assert!(psywave_body.contains("while ((randDamage = Random() % 16) > 10);"));
    assert!(psywave_body.contains(
        "gBattleMoveDamage = gBattleMons[gBattlerAttacker].level * (randDamage + 50) / 100;"
    ));

    assert_eq!(
        line(&commands, 7577),
        "static void Cmd_damagetohalftargethp(void)"
    );
    assert_eq!(line(&commands, 7584), "}");
    let half_body = source_body(&commands, 7576, 9);
    assert!(half_body.contains("gBattleMoveDamage = gBattleMons[gBattlerTarget].hp / 2;"));
    assert!(half_body.contains("gBattleMoveDamage = 1;"));

    assert_eq!(
        line(&commands, 9366),
        "static void Cmd_setdamagetohealthdifference(void)"
    );
    assert_eq!(line(&commands, 9377), "}");
    let healthdiff_body = source_body(&commands, 9365, 13);
    assert!(healthdiff_body.contains("T1_READ_PTR(gBattlescriptCurrInstr + 1);"));
    assert!(healthdiff_body.contains(
        "gBattleMoveDamage = gBattleMons[gBattlerTarget].hp - gBattleMons[gBattlerAttacker].hp;"
    ));

    // Opcode enum positions (:165, :166, :154, :222).
    assert_eq!(line(&command_ids, 165).trim(), "B_SCR_OP_DMGTOLEVEL,");
    assert_eq!(
        line(&command_ids, 166).trim(),
        "B_SCR_OP_PSYWAVEDAMAGEEFFECT,"
    );
    assert_eq!(
        line(&command_ids, 154).trim(),
        "B_SCR_OP_DAMAGETOHALFTARGETHP,"
    );
    assert_eq!(
        line(&command_ids, 222).trim(),
        "B_SCR_OP_SETDAMAGETOHEALTHDIFFERENCE,"
    );

    // Macros (:845, :849, :798: single .byte, no operand; :1106: ptr:req).
    assert_eq!(line(&macros, 845).trim(), ".macro dmgtolevel");
    assert_eq!(line(&macros, 846).trim(), ".byte B_SCR_OP_DMGTOLEVEL");
    assert_eq!(line(&macros, 849).trim(), ".macro psywavedamageeffect");
    assert_eq!(
        line(&macros, 850).trim(),
        ".byte B_SCR_OP_PSYWAVEDAMAGEEFFECT"
    );
    assert_eq!(line(&macros, 798).trim(), ".macro damagetohalftargethp");
    assert_eq!(
        line(&macros, 799).trim(),
        ".byte B_SCR_OP_DAMAGETOHALFTARGETHP"
    );
    assert_eq!(
        line(&macros, 1106).trim(),
        ".macro setdamagetohealthdifference ptr:req"
    );
    assert_eq!(
        line(&macros, 1107).trim(),
        ".byte B_SCR_OP_SETDAMAGETOHEALTHDIFFERENCE"
    );
    assert_eq!(line(&macros, 1108).trim(), ".4byte \\ptr");

    // Exactly one bare call site each (:1202, :1213, :816, :2483).
    assert_eq!(line(&scripts, 1202).trim(), "dmgtolevel");
    assert_eq!(line(&scripts, 1213).trim(), "psywavedamageeffect");
    assert_eq!(line(&scripts, 816).trim(), "damagetohalftargethp");
    assert_eq!(
        line(&scripts, 2483).trim(),
        "setdamagetohealthdifference BattleScript_ButItFailed"
    );
    let count_exact = |needle: &str| {
        scripts
            .lines()
            .filter(|candidate| candidate.trim() == needle)
            .count()
    };
    assert_eq!(count_exact("dmgtolevel"), 1);
    assert_eq!(count_exact("psywavedamageeffect"), 1);
    assert_eq!(count_exact("damagetohalftargethp"), 1);
    let count_prefixed = |needle: &str| {
        scripts
            .lines()
            .filter(|candidate| candidate.trim().starts_with(needle))
            .count()
    };
    assert_eq!(count_prefixed("setdamagetohealthdifference "), 1);
}

fn source_body(source: &str, skip: usize, take: usize) -> String {
    source
        .lines()
        .skip(skip)
        .take(take)
        .collect::<Vec<_>>()
        .join("\n")
}

#[test]
fn corpus_counts_sizes_hashes_and_generation_provenance_are_pinned() {
    assert_eq!(BATTLE_SCRIPT_FIXED_DAMAGE_CASES.len(), 23);
    assert_eq!(BATTLE_SCRIPT_FIXED_DAMAGE_REGISTRATION_CASES.len(), 9);
    assert_eq!(
        BATTLE_SCRIPT_FIXED_DAMAGE_VECTOR_CORPUS_SHA256,
        "20f30d0f4b56a7f048a61544277c63388bf7f427818e127064dbdc7f528ffc2a"
    );
    assert_eq!(
        BATTLE_SCRIPT_FIXED_DAMAGE_VECTOR_GENERATOR_SHA256,
        "4c3d7282d4b959f4f08fdf3660c6bd240494c0326121fbe50ea86ba683527ec3"
    );
    assert_eq!(BATTLE_SCRIPT_FIXED_DAMAGE_VECTOR_GENERATOR_BYTES, 34_428);

    let generated = include_bytes!("../src/battle_script_fixed_damage_vectors_gen.rs");
    assert_eq!(generated.len(), 466_885);
    assert_eq!(
        sha256("core-rs/crates/factory-core/src/battle_script_fixed_damage_vectors_gen.rs"),
        "e6d98b465e5546c8c0860c8c1a9fd36100f37bb5980e09df1575a3caef22290d"
    );
    assert_eq!(
        fs::metadata(
            workspace_root().join("core-rs/tools/gen-battle-script-fixed-damage-vectors.mjs")
        )
        .unwrap()
        .len(),
        34_428
    );
    assert_eq!(
        sha256("core-rs/tools/gen-battle-script-fixed-damage-vectors.mjs"),
        "4c3d7282d4b959f4f08fdf3660c6bd240494c0326121fbe50ea86ba683527ec3"
    );
    let generated_text = std::str::from_utf8(generated).unwrap();
    assert!(generated_text
        .contains("Source: executing canonical src/engine/battleScriptHitChainOpcode.ts and"));
    assert!(generated_text.contains("Regenerate from any cwd; do not hand-edit."));
}
