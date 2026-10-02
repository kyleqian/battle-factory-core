//! Independent source/macro/call-site and artifact-identity ratchets for
//! `B_SCR_OP_DAMAGECALC`. Behavioral differential replay lives in the
//! sibling test binary.

use std::{fs, path::PathBuf};

use factory_core::battle_script_damagecalc::*;
use factory_core::battle_script_damagecalc_vectors_gen::*;

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

    assert_eq!(BATTLE_SCRIPT_DAMAGECALC_OPCODE, 0x05);
    assert_eq!(BATTLE_SCRIPT_DAMAGECALC_OPCODE_NAME, "B_SCR_OP_DAMAGECALC");
    assert_eq!(BATTLE_SCRIPT_DAMAGECALC_DISPATCHER, "Cmd_damagecalc");
    assert_eq!(BATTLE_SCRIPT_DAMAGECALC_ENCODED_WIDTH_BYTES, 1);
    assert_eq!(BATTLE_SCRIPT_DAMAGECALC_STATUS3_CHARGED_UP, 1 << 9);

    // Forward declaration (:84).
    assert_eq!(line(&commands, 84), "static void Cmd_damagecalc(void);");

    // Dispatch row (:336, //0x5).
    assert_eq!(
        line(&commands, 336).trim(),
        "[B_SCR_OP_DAMAGECALC]                      = Cmd_damagecalc,                              //0x5"
    );

    // Handler body (:1290-1303).
    assert_eq!(line(&commands, 1290), "static void Cmd_damagecalc(void)");
    let handler_body: String = commands
        .lines()
        .skip(1289)
        .take(14)
        .collect::<Vec<_>>()
        .join("\n");
    assert!(handler_body.contains(
        "gBattleMoveDamage = gBattleMoveDamage * gCritMultiplier * gBattleScripting.dmgMultiplier;"
    ));
    assert!(handler_body.contains(
        "if (gStatuses3[gBattlerAttacker] & STATUS3_CHARGED_UP && gBattleMoves[gCurrentMove].type == TYPE_ELECTRIC)"
    ));
    assert!(handler_body.contains("gBattleMoveDamage *= 2;"));
    assert!(handler_body.contains("if (gProtectStructs[gBattlerAttacker].helpingHand)"));
    assert!(handler_body.contains("gBattleMoveDamage = gBattleMoveDamage * 15 / 10;"));
    assert!(handler_body.contains("gBattlescriptCurrInstr++;"));

    // Opcode enum position (:11).
    assert_eq!(line(&command_ids, 11).trim(), "B_SCR_OP_DAMAGECALC,");

    // Macro (:24-26): a single .byte, no operand.
    assert_eq!(line(&macros, 24).trim(), ".macro damagecalc");
    assert_eq!(line(&macros, 25).trim(), ".byte B_SCR_OP_DAMAGECALC");
    assert_eq!(line(&macros, 26).trim(), ".endm");

    // STATUS3_CHARGED_UP (:166).
    assert_eq!(
        line(&battle_h, 166).trim(),
        "#define STATUS3_CHARGED_UP              (1 << 9)"
    );

    // First concrete call site (:250), inside BattleScript_HitFromCritCalc.
    assert_eq!(line(&scripts, 249).trim(), "critcalc");
    assert_eq!(line(&scripts, 250).trim(), "damagecalc");

    // 11 concrete bare `damagecalc` call sites across the committed program.
    assert_eq!(
        scripts.matches("\tdamagecalc\n").count(),
        11,
        "exactly 11 bare damagecalc call sites"
    );
    assert_eq!(BATTLE_SCRIPT_DAMAGECALC_CONCRETE_CALL_SITE_COUNT, 11);
}

#[test]
fn charge_up_electric_doubling_uses_the_resolved_dynamic_aware_type() {
    // Documented discrepancy from the C source (TS is the spec, per project
    // instructions): battle_script_commands.c:1297 compares the STATIC
    // gBattleMoves[gCurrentMove].type, ignoring dynamicMoveType, while the
    // canonical TypeScript handler compares the RESOLVED (dynamic-aware)
    // type. This port follows the TypeScript.
    let mut battlers = [
        plain_battler(1),
        plain_battler(2),
        plain_battler(3),
        plain_battler(4),
    ];
    battlers[0].base.status3 = BATTLE_SCRIPT_DAMAGECALC_STATUS3_CHARGED_UP;
    let rules = BattleScriptDamagecalcRules {
        battlers,
        battlers_count: 2,
        battle_type_flags: 0,
        weather: 0,
        current_move: 33, // TACKLE, TYPE_NORMAL
        dynamic_base_power: 0,
        dynamic_move_type: 13, // TYPE_ELECTRIC, wins over the static Normal type
        crit_multiplier: 1,
        dmg_multiplier: 1,
        selector_roles: BattleScriptDamagecalcRoles {
            attacker: Some(BattleScriptDamagecalcBattler::Battler0),
            target: Some(BattleScriptDamagecalcBattler::Battler1),
        },
        enigma_berry_hold_effects: [0, 0, 0, 0],
        enigma_berry_hold_effect_params: [0, 0, 0, 0],
        battle_move_damage: 0,
    };
    let mut without_charge = rules;
    without_charge.battlers[0].base.status3 = 0;
    let doubled = apply_battle_script_damagecalc(&rules)
        .unwrap()
        .battle_move_damage;
    let base = apply_battle_script_damagecalc(&without_charge)
        .unwrap()
        .battle_move_damage;
    assert_eq!(doubled, base * 2);
}

fn plain_battler(species: u16) -> BattleScriptDamagecalcBattlerState {
    use factory_core::battle_script_base_damage::BattleScriptBaseDamageBattlerState;
    use factory_core::damage_calc::StatStages;
    BattleScriptDamagecalcBattlerState {
        base: BattleScriptBaseDamageBattlerState {
            item: 0,
            ability: 0,
            species,
            types: [0, 0],
            level: 50,
            attack: 60,
            defense: 60,
            sp_attack: 60,
            sp_defense: 60,
            stat_stages: StatStages { atk: 6, def: 6, sp_atk: 6, sp_def: 6 },
            hp: 100,
            max_hp: 100,
            status1: 0,
            status3: 0,
            flash_fire_boosted: 0,
        },
        helping_hand: 0,
    }
}

#[test]
fn corpus_counts_sizes_hashes_and_generation_provenance_are_pinned() {
    assert_eq!(BATTLE_SCRIPT_DAMAGECALC_CASES.len(), 24);
    assert_eq!(BATTLE_SCRIPT_DAMAGECALC_REGISTRATION_CASES.len(), 3);
    assert_eq!(
        BATTLE_SCRIPT_DAMAGECALC_VECTOR_CORPUS_SHA256,
        "897f1de90a536e52f5eaf203bbeb892db7817dc006ca7632959d4a39653b9690"
    );
    assert_eq!(BATTLE_SCRIPT_DAMAGECALC_VECTOR_CORPUS_BYTES, 110_501);
    assert_eq!(
        BATTLE_SCRIPT_DAMAGECALC_VECTOR_GENERATOR_SHA256,
        "afbbcccca522128a52c3d5f27c1b34bfdac63c644d7bcd9556af140393a16d8b"
    );
    assert_eq!(BATTLE_SCRIPT_DAMAGECALC_VECTOR_GENERATOR_BYTES, 27_361);

    let generated = include_bytes!("../src/battle_script_damagecalc_vectors_gen.rs");
    assert_eq!(
        sha256("core-rs/crates/factory-core/src/battle_script_damagecalc_vectors_gen.rs"),
        "80c1e402650ae36515e91b6705d664a4275cfb42846cc307e78d27d52408288c"
    );
    assert_eq!(generated.len(), 310_094);
    assert_eq!(
        fs::metadata(
            workspace_root().join("core-rs/tools/gen-battle-script-damagecalc-vectors.mjs")
        )
        .unwrap()
        .len(),
        27_361
    );
    assert_eq!(
        sha256("core-rs/tools/gen-battle-script-damagecalc-vectors.mjs"),
        "afbbcccca522128a52c3d5f27c1b34bfdac63c644d7bcd9556af140393a16d8b"
    );
    let generated_text = std::str::from_utf8(generated).unwrap();
    assert!(generated_text.contains(
        "Source: executing canonical src/engine/battleScriptHitChainOpcode.ts via node --experimental-strip-types."
    ));
    assert!(generated_text.contains("Regenerate from any cwd; do not hand-edit."));
}
