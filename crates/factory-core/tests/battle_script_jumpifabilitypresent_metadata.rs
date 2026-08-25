//! Independent source/dispatch/macro/two-site/constants/corpus ratchets for
//! `Cmd_jumpifabilitypresent`.

use std::{fs, path::PathBuf};

use factory_core::battle_script_jumpifabilitypresent::*;
use factory_core::battle_script_jumpifabilitypresent_vectors_gen::*;

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
fn decomp_dispatch_field_scan_macro_and_exact_two_sites_are_independent() {
    let commands = source("reference/pokeemerald/src/battle_script_commands.c");
    let utility = source("reference/pokeemerald/src/battle_util.c");
    let macro_source = source("reference/pokeemerald/asm/macros/battle_script.inc");
    let scripts = source("reference/pokeemerald/data/battle_scripts_1.s");

    assert_eq!(
        BATTLE_SCRIPT_JUMPIFABILITYPRESENT_DECOMP_DISPATCH_EVIDENCE,
        BattleScriptJumpifabilitypresentDecompDispatchEvidence {
            opcode_name: "B_SCR_OP_JUMPIFABILITYPRESENT",
            opcode_id: 0x43,
            dispatcher: "Cmd_jumpifabilitypresent",
            dispatch_line: 398,
            handler_line: 3991,
            ability_effect_line: 3993,
            jump_line: 3994,
            advance_line: 3996,
            field_scan_case_line: 3140,
            topology_loop_line: 3141,
            living_match_line: 3143,
        }
    );
    assert!(line(&commands, 398)
        .contains("[B_SCR_OP_JUMPIFABILITYPRESENT]            = Cmd_jumpifabilitypresent"));
    assert_eq!(
        line(&commands, 3991),
        "static void Cmd_jumpifabilitypresent(void)"
    );
    assert_eq!(line(&commands, 3993).trim(), "if (AbilityBattleEffects(ABILITYEFFECT_CHECK_ON_FIELD, 0, gBattlescriptCurrInstr[1], 0, 0))");
    assert_eq!(
        line(&commands, 3994).trim(),
        "gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 2);"
    );
    assert_eq!(line(&commands, 3996).trim(), "gBattlescriptCurrInstr += 6;");
    assert_eq!(
        line(&utility, 3140).trim(),
        "case ABILITYEFFECT_CHECK_ON_FIELD: // 19"
    );
    assert_eq!(
        line(&utility, 3141).trim(),
        "for (i = 0; i < gBattlersCount; i++)"
    );
    assert_eq!(
        line(&utility, 3143).trim(),
        "if (gBattleMons[i].ability == ability && gBattleMons[i].hp != 0)"
    );

    assert_eq!(
        BATTLE_SCRIPT_JUMPIFABILITYPRESENT_MACRO_EVIDENCE,
        BattleScriptJumpifabilitypresentMacroEvidence {
            declaration_line: 373,
            opcode_line: 374,
            ability_line: 375,
            pointer_line: 376,
            encoded_width_bytes: 6,
        }
    );
    assert_eq!(
        line(&macro_source, 373).trim(),
        ".macro jumpifabilitypresent ability:req, ptr:req"
    );
    assert_eq!(
        line(&macro_source, 374).trim(),
        ".byte B_SCR_OP_JUMPIFABILITYPRESENT"
    );
    assert_eq!(line(&macro_source, 375).trim(), r".byte \ability");
    assert_eq!(line(&macro_source, 376).trim(), r".4byte \ptr");

    assert_eq!(line(&scripts, 1903), "BattleScript_EffectSolarBeam::");
    assert_eq!(
        line(&scripts, 1904).trim(),
        "jumpifabilitypresent ABILITY_CLOUD_NINE, BattleScript_SolarBeamDecideTurn"
    );
    assert_eq!(
        line(&scripts, 1905).trim(),
        "jumpifabilitypresent ABILITY_AIR_LOCK, BattleScript_SolarBeamDecideTurn"
    );
    assert_eq!(line(&scripts, 1907), "BattleScript_SolarBeamDecideTurn::");
    assert_eq!(scripts.matches("\tjumpifabilitypresent ").count(), 2);
}

#[test]
fn constants_expression_mapping_and_program_site_metadata_are_exact() {
    let abilities = source("reference/pokeemerald/include/constants/abilities.h");
    let battle_util_header = source("reference/pokeemerald/include/battle_util.h");
    assert_eq!(line(&abilities, 17).trim(), "#define ABILITY_CLOUD_NINE 13");
    assert_eq!(line(&abilities, 81).trim(), "#define ABILITY_AIR_LOCK 77");
    assert_eq!(line(&battle_util_header, 47).trim(), "#define WEATHER_HAS_EFFECT ((!ABILITY_ON_FIELD(ABILITY_CLOUD_NINE) && !ABILITY_ON_FIELD(ABILITY_AIR_LOCK)))");
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFABILITYPRESENT_ABILITIES,
        [
            BattleScriptJumpifabilitypresentAbility::CloudNine,
            BattleScriptJumpifabilitypresentAbility::AirLock,
        ]
    );
    assert_eq!(BattleScriptJumpifabilitypresentAbility::CloudNine.id(), 13);
    assert_eq!(BattleScriptJumpifabilitypresentAbility::AirLock.id(), 77);
    assert_eq!(
        BattleScriptJumpifabilitypresentAbility::CloudNine.expression(),
        "ABILITY_CLOUD_NINE"
    );
    assert_eq!(
        BattleScriptJumpifabilitypresentAbility::AirLock.expression(),
        "ABILITY_AIR_LOCK"
    );
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFABILITYPRESENT_CALL_SITE_EVIDENCE,
        [
            BattleScriptJumpifabilitypresentCallSiteEvidence {
                entry_label: "BattleScript_EffectSolarBeam",
                entry_label_line: 1903,
                statement_line: 1904,
                instruction_program_counter: 1317,
                ability_expression: "ABILITY_CLOUD_NINE",
                ability_id: 13,
                target_expression: "BattleScript_SolarBeamDecideTurn",
                target_program_counter: 1320
            },
            BattleScriptJumpifabilitypresentCallSiteEvidence {
                entry_label: "BattleScript_EffectSolarBeam",
                entry_label_line: 1903,
                statement_line: 1905,
                instruction_program_counter: 1318,
                ability_expression: "ABILITY_AIR_LOCK",
                ability_id: 77,
                target_expression: "BattleScript_SolarBeamDecideTurn",
                target_program_counter: 1320
            },
        ]
    );
}

#[test]
fn deterministic_corpus_counts_hashes_sizes_and_generation_provenance_are_pinned() {
    assert_eq!(BATTLE_SCRIPT_JUMPIFABILITYPRESENT_CASES.len(), 153);
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFABILITYPRESENT_REGISTRATION_CASES.len(),
        15
    );
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFABILITYPRESENT_DOMAIN_CENSUS,
        [
            ("topology-values", 2),
            ("battler-positions", 4),
            ("concrete-call-sites", 2),
            ("supported-ability-expressions", 2),
            ("ability-kinds-per-site", 3),
            ("hp-values", 3),
            ("dense-matrix-combinations", 144),
            ("application-count-values", 2),
            ("registration-shape-cases", 15),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFABILITYPRESENT_CATEGORY_CENSUS,
        [
            ("dense-topology-position-life-ability-matrix", 144),
            ("late-label-resolution", 4),
            ("repeated-application", 4),
            ("direct-handler-validation", 1),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFABILITYPRESENT_BRANCH_CENSUS,
        [
            ("advance", 122),
            ("jump", 24),
            ("unresolved-label", 2),
            ("jump-then-jump", 2),
            ("advance-then-advance", 2),
            ("unvalidated-ability", 1),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFABILITYPRESENT_REGISTRATION_BRANCH_CENSUS,
        [
            ("registered", 5),
            ("wrong-cardinality", 3),
            ("invalid-shape", 7),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFABILITYPRESENT_VECTOR_CORPUS_SHA256,
        "fc70a470d096700098fbf5fe8454bfdecd38da0b599d30f52339820841aa46bc"
    );
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFABILITYPRESENT_VECTOR_CORPUS_BYTES,
        305_982
    );
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFABILITYPRESENT_VECTOR_GENERATOR_SHA256,
        "4923f0d7bcb94f7bd3c90533e2176422fe2893998732d1fba5a26a62ca24a2ee"
    );
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFABILITYPRESENT_VECTOR_GENERATOR_BYTES,
        26_662
    );
    let generated = include_bytes!("../src/battle_script_jumpifabilitypresent_vectors_gen.rs");
    assert_eq!(generated.len(), 808_906);
    let generated_source = include_str!("../src/battle_script_jumpifabilitypresent_vectors_gen.rs");
    assert!(generated_source.contains("Source: executing canonical src/engine/battleScriptJumpifabilitypresentOpcode.ts via node."));
    assert!(generated_source.contains("Regenerate: node --experimental-strip-types core-rs/tools/gen-battle-script-jumpifabilitypresent-vectors.mjs."));
}
