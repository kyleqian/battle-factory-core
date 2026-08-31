//! Independent source/dispatch/macro/call-site/constants/corpus provenance
//! ratchets for `Cmd_tryinfatuating`. Behavioral differential replay lives in
//! the sibling vector test, so canonical TypeScript cannot substitute for
//! source evidence here.

use std::{fs, path::PathBuf, process::Command};

use factory_core::battle_script_tryinfatuating::*;
use factory_core::battle_script_tryinfatuating_vectors_gen::*;

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
    let evidence = BATTLE_SCRIPT_TRYINFATUATING_DECOMP_DISPATCH_EVIDENCE;

    assert_eq!(evidence.opcode_name, "B_SCR_OP_TRYINFATUATING");
    assert_eq!(evidence.opcode_id, 0x97);
    assert_eq!(evidence.dispatcher, "Cmd_tryinfatuating");
    assert_eq!(
        line(&commands, evidence.dispatch_line).trim(),
        "[B_SCR_OP_TRYINFATUATING]                  = Cmd_tryinfatuating,                          //0x97"
    );
    assert_eq!(
        line(&commands, evidence.forward_decl_line).trim(),
        "static void Cmd_tryinfatuating(void);"
    );
    assert_eq!(
        line(&commands, evidence.handler_line),
        "static void Cmd_tryinfatuating(void)"
    );
    assert_eq!(
        line(&commands, evidence.ability_check_line).trim(),
        "if (gBattleMons[gBattlerTarget].ability == ABILITY_OBLIVIOUS)"
    );
    assert_eq!(
        line(&commands, evidence.oblivious_jump_line).trim(),
        "gBattlescriptCurrInstr = BattleScript_ObliviousPreventsAttraction;"
    );
    assert_eq!(
        line(&commands, evidence.oblivious_last_used_ability_line).trim(),
        "gLastUsedAbility = ABILITY_OBLIVIOUS;"
    );
    assert_eq!(
        line(&commands, evidence.oblivious_record_ability_line).trim(),
        "RecordAbilityBattle(gBattlerTarget, ABILITY_OBLIVIOUS);"
    );
    assert_eq!(
        line(&commands, evidence.fail_condition_line_1).trim(),
        "if (GetGenderFromSpeciesAndPersonality(speciesAttacker, personalityAttacker) == GetGenderFromSpeciesAndPersonality(speciesTarget, personalityTarget)"
    );
    assert_eq!(
        line(&commands, evidence.fail_condition_line_2).trim(),
        "|| gBattleMons[gBattlerTarget].status2 & STATUS2_INFATUATION"
    );
    assert_eq!(
        line(&commands, evidence.fail_condition_line_3).trim(),
        "|| GetGenderFromSpeciesAndPersonality(speciesAttacker, personalityAttacker) == MON_GENDERLESS"
    );
    assert_eq!(
        line(&commands, evidence.fail_condition_line_4).trim(),
        "|| GetGenderFromSpeciesAndPersonality(speciesTarget, personalityTarget) == MON_GENDERLESS)"
    );
    assert_eq!(
        line(&commands, evidence.jump_line).trim(),
        "gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 1);"
    );
    assert_eq!(
        line(&commands, evidence.status2_write_line).trim(),
        "gBattleMons[gBattlerTarget].status2 |= STATUS2_INFATUATED_WITH(gBattlerAttacker);"
    );
    assert_eq!(
        line(&commands, evidence.advance_line).trim(),
        "gBattlescriptCurrInstr += 5;"
    );

    let pokemon = source("reference/pokeemerald/src/pokemon.c");
    assert_eq!(
        line(&pokemon, evidence.gender_fn_line),
        "u8 GetGenderFromSpeciesAndPersonality(u16 species, u32 personality)"
    );
}

#[test]
fn macro_declaration_and_encoded_width_are_exact() {
    let macros = source("reference/pokeemerald/asm/macros/battle_script.inc");
    let evidence = BATTLE_SCRIPT_TRYINFATUATING_MACRO_EVIDENCE;

    assert_eq!(
        line(&macros, evidence.declaration_line).trim(),
        ".macro tryinfatuating ptr:req"
    );
    assert_eq!(
        line(&macros, evidence.opcode_line).trim(),
        ".byte B_SCR_OP_TRYINFATUATING"
    );
    assert_eq!(line(&macros, evidence.pointer_line).trim(), r".4byte \ptr");
    assert_eq!(evidence.encoded_width_bytes, 5);
    assert_eq!(BATTLE_SCRIPT_TRYINFATUATING_ENCODED_WIDTH_BYTES, 5);
    assert_eq!(BATTLE_SCRIPT_TRYINFATUATING_FAILURE_POINTER_WIDTH_BYTES, 4);
}

#[test]
fn sole_call_site_is_exact_and_unique() {
    let scripts = source("reference/pokeemerald/data/battle_scripts_1.s");
    let evidence = BATTLE_SCRIPT_TRYINFATUATING_CALL_SITE_EVIDENCE;

    assert_eq!(evidence.entry_label, "BattleScript_EffectAttract");
    assert_eq!(
        line(&scripts, evidence.entry_label_line),
        "BattleScript_EffectAttract::"
    );
    assert_eq!(
        line(&scripts, evidence.statement_line).trim(),
        "tryinfatuating BattleScript_ButItFailed"
    );
    assert_eq!(
        scripts.matches("\ttryinfatuating ").count(),
        1,
        "call site must be unique"
    );
    assert_eq!(evidence.instruction_program_counter, 1118);
    assert_eq!(
        evidence.failure_target_expression,
        "BattleScript_ButItFailed"
    );
    assert_eq!(evidence.failure_target_program_counter, 1434);
    assert_eq!(
        evidence.oblivious_target_expression,
        "BattleScript_ObliviousPreventsAttraction"
    );
    assert_eq!(evidence.oblivious_target_program_counter, 2996);

    let oblivious_label_count = scripts
        .lines()
        .filter(|candidate| candidate.trim() == "BattleScript_ObliviousPreventsAttraction::")
        .count();
    assert_eq!(oblivious_label_count, 1, "oblivious label must be unique");
}

#[test]
fn source_constants_are_exact() {
    let battle_constants = source("reference/pokeemerald/include/constants/battle.h");
    let ability_constants = source("reference/pokeemerald/include/constants/abilities.h");
    let pokemon_constants = source("reference/pokeemerald/include/constants/pokemon.h");

    assert_eq!(
        line(&ability_constants, 16).trim(),
        "#define ABILITY_OBLIVIOUS 12"
    );
    assert_eq!(
        line(&battle_constants, 142).trim(),
        "#define STATUS2_INFATUATION           (1 << 16 | 1 << 17 | 1 << 18 | 1 << 19)  // 4 bits, one for every battler"
    );
    assert_eq!(
        line(&battle_constants, 143).trim(),
        "#define STATUS2_INFATUATED_WITH(battler) (gBitTable[battler] << 16)"
    );
    assert_eq!(
        line(&pokemon_constants, 171).trim(),
        "#define MON_GENDERLESS 0xFF"
    );

    assert_eq!(BATTLE_SCRIPT_ABILITY_OBLIVIOUS, 12);
    assert_eq!(
        BATTLE_SCRIPT_STATUS2_INFATUATION,
        (1 << 16) | (1 << 17) | (1 << 18) | (1 << 19)
    );
    assert_eq!(BATTLE_SCRIPT_TRYINFATUATING_OPCODE, 0x97);
    assert_eq!(
        BATTLE_SCRIPT_TRYINFATUATING_DISPATCHER,
        "Cmd_tryinfatuating"
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYINFATUATING_OBLIVIOUS_LABEL,
        "BattleScript_ObliviousPreventsAttraction"
    );

    for battler in BATTLE_SCRIPT_TRYINFATUATING_BATTLERS {
        assert_eq!(
            status2_infatuated_with(battler),
            1u32 << (16 + battler.index())
        );
    }
}

#[test]
fn deterministic_corpus_counts_sizes_hashes_and_generation_provenance_are_pinned() {
    assert_eq!(BATTLE_SCRIPT_TRYINFATUATING_CASES.len(), 953);
    assert_eq!(BATTLE_SCRIPT_TRYINFATUATING_REGISTRATION_CASES.len(), 3);
    assert_eq!(
        BATTLE_SCRIPT_TRYINFATUATING_VECTOR_CORPUS_SHA256,
        "74da7fe4ce04d2721a87ca45021bcc5f9639a4506840a939e8f59a4970b05a81"
    );
    assert_eq!(BATTLE_SCRIPT_TRYINFATUATING_VECTOR_CORPUS_BYTES, 1_148_940);
    assert_eq!(
        BATTLE_SCRIPT_TRYINFATUATING_VECTOR_GENERATOR_SHA256,
        "9296e023886c2b4d666c00e93d869a5ccfb3f83d3cd34f1a4132322bf57c9cfa"
    );
    assert_eq!(BATTLE_SCRIPT_TRYINFATUATING_VECTOR_GENERATOR_BYTES, 33_294);

    let generated = include_bytes!("../src/battle_script_tryinfatuating_vectors_gen.rs");
    assert_eq!(generated.len(), 3_600_294);
    assert_eq!(
        sha256("core-rs/crates/factory-core/src/battle_script_tryinfatuating_vectors_gen.rs"),
        "8a0c2e9f8deaeec3f2e22057c8d3ab19ca93401c4c0aae554f24659348ae7ee1"
    );
    assert_eq!(
        fs::metadata(
            workspace_root().join("core-rs/tools/gen-battle-script-tryinfatuating-vectors.mjs")
        )
        .expect("generator metadata")
        .len(),
        33_294
    );
    assert_eq!(
        sha256("core-rs/tools/gen-battle-script-tryinfatuating-vectors.mjs"),
        "9296e023886c2b4d666c00e93d869a5ccfb3f83d3cd34f1a4132322bf57c9cfa"
    );
    let generated_text = std::str::from_utf8(generated).expect("generated Rust is UTF-8");
    assert!(generated_text.contains(
        "Source: executing canonical src/engine/battleScriptTryinfatuatingOpcode.ts via node --experimental-strip-types."
    ));
    assert!(generated_text
        .contains("GENERATED by core-rs/tools/gen-battle-script-tryinfatuating-vectors.mjs."));
}
