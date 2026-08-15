//! Independent source/census ratchet for the Weight Damage leaf. It does not
//! consume canonical expected vectors, so decomp wiring and Pokédex authority
//! fail separately from differential execution.

use std::{fs, path::PathBuf};

use factory_core::battle_script_weightdamage::{
    BATTLE_SCRIPT_WEIGHTDAMAGE_SPECIES_CATALOG, BATTLE_SCRIPT_WEIGHTDAMAGE_SPECIES_CATALOG_BYTES,
    BATTLE_SCRIPT_WEIGHTDAMAGE_SPECIES_CATALOG_SHA256,
};

fn workspace_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../..")
}

fn source(relative: &str) -> String {
    fs::read_to_string(workspace_root().join(relative))
        .unwrap_or_else(|error| panic!("could not read {relative}: {error}"))
}

#[test]
fn decomp_dispatch_body_operand_free_macro_and_low_kick_site_are_independent() {
    let commands = source("reference/pokeemerald/src/battle_script_commands.c");
    assert_eq!(
        commands
            .matches("[B_SCR_OP_WEIGHTDAMAGECALCULATION]         = Cmd_weightdamagecalculation")
            .count(),
        1,
    );
    let body_start = commands
        .find("static void Cmd_weightdamagecalculation(void)")
        .expect("source command body");
    let body = &commands[body_start..];
    assert!(body.contains("for (i = 0; sWeightToDamageTable[i] != 0xFFFF; i += 2)",));
    assert!(body.contains(
        "if (sWeightToDamageTable[i] > GetPokedexHeightWeight(SpeciesToNationalPokedexNum(gBattleMons[gBattlerTarget].species), 1))",
    ));
    assert!(body.contains("gDynamicBasePower = sWeightToDamageTable[i + 1];"));
    assert!(body.contains("gDynamicBasePower = 120;"));
    assert!(body.contains("gBattlescriptCurrInstr++;"));
    assert!(commands.contains(
        "static const u16 sWeightToDamageTable[] =\n{\n    100, 20,\n    250, 40,\n    500, 60,\n    1000, 80,\n    2000, 100,\n    0xFFFF, 0xFFFF",
    ));

    let macro_source = source("reference/pokeemerald/asm/macros/battle_script.inc");
    assert_eq!(
        macro_source
            .matches(".macro weightdamagecalculation")
            .count(),
        1
    );
    assert!(macro_source.contains(
        ".macro weightdamagecalculation\n\t.byte B_SCR_OP_WEIGHTDAMAGECALCULATION\n\t.endm",
    ));
    let scripts = source("reference/pokeemerald/data/battle_scripts_1.s");
    assert_eq!(scripts.matches("\tweightdamagecalculation").count(), 1);
    assert!(scripts.contains(
        "BattleScript_EffectLowKick::\n\tattackcanceler\n\tattackstring\n\tppreduce\n\tweightdamagecalculation\n\taccuracycheck",
    ));
}

#[test]
fn pokedex_weight_authority_and_complete_generated_catalog_census_are_independent() {
    let pokedex_header = source("reference/pokeemerald/include/pokedex.h");
    assert!(pokedex_header.contains("u16 weight; //in hectograms"));
    let pokedex = source("reference/pokeemerald/src/pokedex.c");
    assert!(pokedex.contains("case 1:  // weight\n        return gPokedexEntries[dexNum].weight;"));
    let extractor = source("tools/extract/extract-battle-frontier-data.ts");
    assert!(extractor.contains(
        "const pokedexEntries = readRef(\"src\", \"data\", \"pokemon\", \"pokedex_entries.h\")"
    ));
    assert!(extractor.contains("weightByNationalDexName"));
    assert!(extractor.contains("weightHectograms: weightByNationalDexName.get("));
    assert!(extractor.contains("25 OLD_UNOWN compatibility ids without Pokédex weights"));

    let stats = source("src/data/gen/species-stats.json");
    assert_eq!(stats.matches("\"weightHectograms\":").count(), 411);
    assert_eq!(stats.matches("\"weightHectograms\":null").count(), 25);
    assert_eq!(BATTLE_SCRIPT_WEIGHTDAMAGE_SPECIES_CATALOG.len(), 411);
    assert_eq!(
        BATTLE_SCRIPT_WEIGHTDAMAGE_SPECIES_CATALOG
            .iter()
            .filter(|(_, weight)| weight.is_some())
            .count(),
        386,
    );
    assert_eq!(
        BATTLE_SCRIPT_WEIGHTDAMAGE_SPECIES_CATALOG
            .iter()
            .filter_map(|(id, weight)| weight.is_none().then_some(*id))
            .collect::<Vec<_>>(),
        (252_u16..=276).collect::<Vec<_>>(),
    );
    assert_eq!(
        BATTLE_SCRIPT_WEIGHTDAMAGE_SPECIES_CATALOG
            .iter()
            .map(|(id, _)| *id)
            .collect::<Vec<_>>(),
        (1_u16..=411).collect::<Vec<_>>(),
    );
    assert_eq!(
        BATTLE_SCRIPT_WEIGHTDAMAGE_SPECIES_CATALOG_SHA256,
        "8831e5a6e21a42ab71dce857243f008a4efdac72e97cdf83148763e25ad6d85f",
    );
    assert_eq!(BATTLE_SCRIPT_WEIGHTDAMAGE_SPECIES_CATALOG_BYTES, 3981);
    let generated = include_bytes!("../src/battle_script_weightdamage_catalog_gen.rs");
    assert_eq!(generated.len(), 11_788);
    assert!(generated.len() < 20_000);
}
