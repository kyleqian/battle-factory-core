//! Independent source/dispatch/header/macro/call-site/corpus ratchets for
//! the SETMULTIHIT / DECREMENTMULTIHIT / SETMULTIHITCOUNTER /
//! INITMULTIHITSTRING / JUMPIFHASNOHP quintet. Every literal below was
//! re-verified with `sed`/`grep` against `reference/pokeemerald`
//! independently of the generator.

use std::{fs, path::PathBuf};

use factory_core::battle_script_multihit_family::*;
use factory_core::battle_script_multihit_family_vectors_gen::*;

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
fn handler_bodies_match_reference_verbatim() {
    let commands = source("reference/pokeemerald/src/battle_script_commands.c");

    assert_eq!(line(&commands, 3638), "static void Cmd_setmultihit(void)");
    assert_eq!(
        line(&commands, 3644),
        "static void Cmd_decrementmultihit(void)"
    );
    assert_eq!(
        line(&commands, 7139),
        "static void Cmd_setmultihitcounter(void)"
    );
    assert_eq!(
        line(&commands, 7157),
        "static void Cmd_initmultihitstring(void)"
    );
    assert_eq!(line(&commands, 9609), "static void Cmd_jumpifhasnohp(void)");

    assert!(line(&commands, 369).contains("[B_SCR_OP_SETMULTIHIT]"));
    assert!(line(&commands, 369).contains("Cmd_setmultihit,"));
    assert!(line(&commands, 369).contains("//0x26"));
    assert!(line(&commands, 370).contains("[B_SCR_OP_DECREMENTMULTIHIT]"));
    assert!(line(&commands, 370).contains("Cmd_decrementmultihit,"));
    assert!(line(&commands, 370).contains("//0x27"));
    assert!(line(&commands, 472).contains("[B_SCR_OP_SETMULTIHITCOUNTER]"));
    assert!(line(&commands, 472).contains("Cmd_setmultihitcounter,"));
    assert!(line(&commands, 472).contains("//0x8D"));
    assert!(line(&commands, 473).contains("[B_SCR_OP_INITMULTIHITSTRING]"));
    assert!(line(&commands, 473).contains("Cmd_initmultihitstring,"));
    assert!(line(&commands, 473).contains("//0x8E"));
    assert!(line(&commands, 558).contains("[B_SCR_OP_JUMPIFHASNOHP]"));
    assert!(line(&commands, 558).contains("Cmd_jumpifhasnohp,"));
    assert!(line(&commands, 558).contains("//0xE3"));

    let header = source("reference/pokeemerald/include/constants/battle_script_commands.h");
    assert_eq!(line(&header, 44).trim(), "B_SCR_OP_SETMULTIHIT,");
    assert_eq!(line(&header, 45).trim(), "B_SCR_OP_DECREMENTMULTIHIT,");
    assert_eq!(line(&header, 147).trim(), "B_SCR_OP_SETMULTIHITCOUNTER,");
    assert_eq!(line(&header, 148).trim(), "B_SCR_OP_INITMULTIHITSTRING,");
    assert_eq!(line(&header, 233).trim(), "B_SCR_OP_JUMPIFHASNOHP,");
}

#[test]
fn macro_evidence_is_independent() {
    let macros = source("reference/pokeemerald/asm/macros/battle_script.inc");
    assert_eq!(line(&macros, 202).trim(), ".macro setmultihit value:req");
    assert_eq!(
        line(&macros, 207).trim(),
        ".macro decrementmultihit value:req"
    );
    assert_eq!(
        line(&macros, 766).trim(),
        ".macro setmultihitcounter val:req"
    );
    assert_eq!(line(&macros, 771).trim(), ".macro initmultihitstring");
    assert_eq!(
        line(&macros, 1159).trim(),
        ".macro jumpifhasnohp battler:req, ptr:req"
    );
}

#[test]
fn committed_program_call_site_census_matches_brief() {
    let scripts = source("reference/pokeemerald/data/battle_scripts_1.s");

    let setmultihit_sites: Vec<&str> = scripts
        .lines()
        .filter(|l| l.starts_with("\tsetmultihit "))
        .collect();
    assert_eq!(setmultihit_sites.len(), 3);
    for expected in ["\tsetmultihit 3", "\tsetmultihit 1", "\tsetmultihit 2"] {
        assert!(
            setmultihit_sites.contains(&expected),
            "missing setmultihit site {expected}"
        );
    }

    let decrement_sites: Vec<&str> = scripts
        .lines()
        .filter(|l| l.starts_with("\tdecrementmultihit "))
        .collect();
    assert_eq!(decrement_sites.len(), 3);

    let counter_sites: Vec<&str> = scripts
        .lines()
        .filter(|l| l.starts_with("\tsetmultihitcounter "))
        .collect();
    assert_eq!(counter_sites.len(), 3);
    for expected in ["\tsetmultihitcounter 0", "\tsetmultihitcounter 2"] {
        assert!(
            counter_sites.contains(&expected),
            "missing setmultihitcounter site {expected}"
        );
    }

    let init_sites: Vec<&str> = scripts
        .lines()
        .filter(|l| *l == "\tinitmultihitstring")
        .collect();
    assert_eq!(init_sites.len(), 4);

    let hasnohp_sites: Vec<&str> = scripts
        .lines()
        .filter(|l| l.starts_with("\tjumpifhasnohp "))
        .collect();
    assert_eq!(hasnohp_sites.len(), 5);
    for expected in [
        "\tjumpifhasnohp BS_ATTACKER, BattleScript_MultiHitEnd",
        "\tjumpifhasnohp BS_TARGET, BattleScript_MultiHitPrintStrings",
        "\tjumpifhasnohp BS_ATTACKER, BattleScript_TripleKickEnd",
        "\tjumpifhasnohp BS_TARGET, BattleScript_TripleKickNoMoreHits",
        "\tjumpifhasnohp BS_TARGET, BattleScript_TeeterDanceLoopIncrement",
    ] {
        assert!(
            hasnohp_sites.contains(&expected),
            "missing jumpifhasnohp site {expected}"
        );
    }
}

#[test]
fn byte_operand_resolver_is_a_closed_regex_projection() {
    assert_eq!(resolve_battle_script_multihit_byte_operand("0"), Some(0));
    assert_eq!(resolve_battle_script_multihit_byte_operand("42"), Some(42));
    assert_eq!(
        resolve_battle_script_multihit_byte_operand("MULTI_HIT_COUNT"),
        None
    );
    assert_eq!(resolve_battle_script_multihit_byte_operand("-1"), None);
    assert_eq!(resolve_battle_script_multihit_byte_operand("1.5"), None);
}

#[test]
fn battler_resolver_is_the_six_named_selector_closed_catalog() {
    let rules = BattleScriptMultiHitFamilyRules {
        multi_hit_counter: 0,
        multi_hit_string_counter: 0,
        selector_attacker: Some(0),
        selector_target: Some(1),
        selector_effect_battler: Some(2),
        selector_fainted: Some(3),
        scripting_battler: 1,
        battlers_hp: [1, 1, 1, 1],
    };
    assert_eq!(
        resolve_battle_script_multihit_battler(&rules, "BS_ATTACKER"),
        Some(0)
    );
    assert_eq!(
        resolve_battle_script_multihit_battler(&rules, "BS_TARGET"),
        Some(1)
    );
    assert_eq!(
        resolve_battle_script_multihit_battler(&rules, "BS_EFFECT_BATTLER"),
        Some(2)
    );
    assert_eq!(
        resolve_battle_script_multihit_battler(&rules, "BS_FAINTED"),
        Some(3)
    );
    assert_eq!(
        resolve_battle_script_multihit_battler(&rules, "BS_BATTLER_0"),
        Some(0)
    );
    assert_eq!(
        resolve_battle_script_multihit_battler(&rules, "BS_SCRIPTING"),
        Some(1)
    );
    assert_eq!(
        resolve_battle_script_multihit_battler(&rules, "gUnknownSelector"),
        None
    );
}

#[test]
fn registration_error_text_is_shared_verbatim_across_all_five() {
    for name in [
        BATTLE_SCRIPT_SETMULTIHIT_OPCODE_NAME,
        BATTLE_SCRIPT_DECREMENTMULTIHIT_OPCODE_NAME,
        BATTLE_SCRIPT_SETMULTIHITCOUNTER_OPCODE_NAME,
        BATTLE_SCRIPT_INITMULTIHITSTRING_OPCODE_NAME,
        BATTLE_SCRIPT_JUMPIFHASNOHP_OPCODE_NAME,
    ] {
        let error = register_battle_script_multihit_family_opcode(&[], name).unwrap_err();
        assert_eq!(
            error.to_string(),
            format!("committed Battle Script program does not emit {name}")
        );
    }
}

#[test]
fn generator_and_corpus_provenance_are_recorded() {
    assert_eq!(BATTLE_SCRIPT_MULTIHIT_FAMILY_VECTOR_CORPUS_SHA256.len(), 64);
    assert_ne!(BATTLE_SCRIPT_MULTIHIT_FAMILY_VECTOR_CORPUS_BYTES, 0);

    let total = BATTLE_SCRIPT_SETMULTIHIT_CASES.len()
        + BATTLE_SCRIPT_DECREMENTMULTIHIT_CASES.len()
        + BATTLE_SCRIPT_SETMULTIHITCOUNTER_CASES.len()
        + BATTLE_SCRIPT_INITMULTIHITSTRING_CASES.len()
        + BATTLE_SCRIPT_JUMPIFHASNOHP_CASES.len();
    assert!(
        (34..=44).contains(&total),
        "behavior case count {total} outside the 34-44 target band"
    );
    assert_eq!(BATTLE_SCRIPT_MULTIHIT_FAMILY_REGISTRATION_CASES.len(), 7);

    let domain = |name: &str| {
        BATTLE_SCRIPT_MULTIHIT_FAMILY_DOMAIN_CENSUS
            .iter()
            .find(|(n, _)| *n == name)
            .map(|(_, c)| *c)
            .unwrap_or_else(|| panic!("missing domain census entry {name}"))
    };
    assert_eq!(domain("setmultihit-concrete-starts"), 3);
    assert_eq!(domain("decrementmultihit-concrete-starts"), 3);
    assert_eq!(domain("setmultihitcounter-concrete-starts"), 3);
    assert_eq!(domain("initmultihitstring-concrete-starts"), 4);
    assert_eq!(domain("jumpifhasnohp-concrete-starts"), 5);
}
