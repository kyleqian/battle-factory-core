//! Independent source/macro/program-site and generated-artifact ratchets for
//! `B_SCR_OP_ORWORD`. Behavioral differential replay lives in the sibling
//! vectors test binary.

use std::{fs, path::PathBuf};

use factory_core::battle_script_orword::*;
use factory_core::battle_script_orword_vectors_gen::*;

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
fn exact_source_dispatch_body_macro_constants_and_all_program_sites_are_pinned() {
    let commands = source("reference/pokeemerald/src/battle_script_commands.c");
    let command_ids = source("reference/pokeemerald/include/constants/battle_script_commands.h");
    let macros = source("reference/pokeemerald/asm/macros/battle_script.inc");
    let scripts = source("reference/pokeemerald/data/battle_scripts_1.s");
    let battle_constants = source("reference/pokeemerald/include/constants/battle.h");
    let metadata = BATTLE_SCRIPT_ORWORD_SOURCE_METADATA;

    assert_eq!(BATTLE_SCRIPT_ORWORD_OPCODE_NAME, "B_SCR_OP_ORWORD");
    assert_eq!(BATTLE_SCRIPT_ORWORD_OPCODE, 0x35);
    assert_eq!(BATTLE_SCRIPT_ORWORD_DISPATCHER, "Cmd_orword");
    assert_eq!(BATTLE_SCRIPT_ORWORD_CONCRETE_START_COUNT, 43);
    assert_eq!(BATTLE_SCRIPT_ORWORD_POINTER_WIDTH_BYTES, 4);
    assert_eq!(BATTLE_SCRIPT_ORWORD_VALUE_WIDTH_BYTES, 4);
    assert_eq!(BATTLE_SCRIPT_ORWORD_ENCODED_WIDTH_BYTES, 9);
    assert_eq!(BATTLE_SCRIPT_ORWORD_POINTER_EXPRESSION, "gHitMarker");
    assert_eq!(line(&command_ids, 59).trim(), "B_SCR_OP_ORWORD,");
    assert_eq!(
        line(&commands, usize::from(metadata.dispatch_line)).trim(),
        "[B_SCR_OP_ORWORD]                          = Cmd_orword,                                  //0x35"
    );
    assert_eq!(
        line(&commands, usize::from(metadata.handler_line)),
        "static void Cmd_orword(void)"
    );
    assert_eq!(
        line(&commands, usize::from(metadata.pointer_read_line)).trim(),
        "u32 *memWord = T2_READ_PTR(gBattlescriptCurrInstr + 1);"
    );
    assert_eq!(
        line(&commands, usize::from(metadata.value_read_line)).trim(),
        "u32 val = T2_READ_32(gBattlescriptCurrInstr + 5);"
    );
    assert_eq!(
        line(&commands, usize::from(metadata.or_write_line)).trim(),
        "*memWord |= val;"
    );
    assert_eq!(
        line(&commands, usize::from(metadata.advance_line)).trim(),
        "gBattlescriptCurrInstr += 9;"
    );
    assert_eq!(
        line(&macros, usize::from(metadata.macro_declaration_line)).trim(),
        ".macro orword ptr:req, word:req"
    );
    assert_eq!(
        line(&macros, usize::from(metadata.macro_opcode_line)).trim(),
        ".byte B_SCR_OP_ORWORD"
    );
    assert_eq!(
        line(&macros, usize::from(metadata.macro_pointer_line)).trim(),
        r".4byte \ptr"
    );
    assert_eq!(
        line(&macros, usize::from(metadata.macro_value_line)).trim(),
        r".4byte \word"
    );

    assert_eq!(
        BATTLE_SCRIPT_ORWORD_HITMARKER_TERMS,
        [
            ("HITMARKER_IGNORE_BIDE", 0x0000_0020),
            ("HITMARKER_IGNORE_SUBSTITUTE", 0x0000_0100),
            ("HITMARKER_ATTACKSTRING_PRINTED", 0x0000_0400),
            ("HITMARKER_NO_PPDEDUCT", 0x0000_0800),
            ("HITMARKER_IGNORE_ON_AIR", 0x0001_0000),
            ("HITMARKER_IGNORE_UNDERGROUND", 0x0002_0000),
            ("HITMARKER_IGNORE_UNDERWATER", 0x0004_0000),
            ("HITMARKER_PASSIVE_HP_UPDATE", 0x0010_0000),
            ("HITMARKER_GRUDGE", 0x0100_0000),
            ("HITMARKER_ALLOW_NO_PP", 0x0080_0000),
            ("HITMARKER_CHARGING", 0x0800_0000),
        ]
    );
    assert_eq!(BATTLE_SCRIPT_ORWORD_TERM_EVIDENCE.len(), 11);
    for term in BATTLE_SCRIPT_ORWORD_TERM_EVIDENCE {
        assert_eq!(
            line(&battle_constants, usize::from(term.source_line))
                .trim()
                .split_whitespace()
                .nth(1),
            Some(term.expression),
            "source term line {}",
            term.source_line,
        );
        assert_eq!(
            resolve_battle_script_orword_value(term.expression),
            Some(term.value),
            "native term resolver {}",
            term.expression,
        );
    }

    assert_eq!(BATTLE_SCRIPT_ORWORD_CALL_SITE_EVIDENCE.len(), 43);
    assert_eq!(scripts.matches("\torword gHitMarker, ").count(), 43);
    for site in BATTLE_SCRIPT_ORWORD_CALL_SITE_EVIDENCE {
        assert_eq!(
            line(&scripts, usize::from(site.entry_label_line)).trim_end_matches(':'),
            site.entry_label,
            "entry label {}",
            site.entry_label,
        );
        assert_eq!(
            line(&scripts, usize::from(site.statement_line)).trim(),
            format!("orword gHitMarker, {}", site.value_expression),
            "site {}",
            site.entry_label,
        );
        assert_eq!(site.invocation_mnemonic, "orword");
        assert_eq!(site.invocation_macro_line, 302);
        assert_eq!(site.source_macro, "orword");
        assert_eq!(site.opcode_macro_line, 303);
        assert_eq!(site.pointer_macro_line, 304);
        assert_eq!(site.value_macro_line, 305);
        assert_eq!(
            site.pointer_expression,
            BATTLE_SCRIPT_ORWORD_POINTER_EXPRESSION
        );
        assert_eq!(
            site.encoded_width_bytes,
            BATTLE_SCRIPT_ORWORD_ENCODED_WIDTH_BYTES
        );
        assert_eq!(
            resolve_battle_script_orword_value(site.value_expression),
            Some(site.resolved_value),
            "site {} value expression",
            site.entry_label,
        );
        assert!(site.entry_program_counter <= site.instruction_program_counter);
    }
}

#[test]
fn corpus_counts_hashes_sizes_and_generation_provenance_are_pinned() {
    assert_eq!(BATTLE_SCRIPT_ORWORD_CASES.len(), 66);
    assert_eq!(BATTLE_SCRIPT_ORWORD_REGISTRATION_CASES.len(), 18);
    assert_eq!(
        BATTLE_SCRIPT_ORWORD_DOMAIN_CENSUS,
        [
            ("concrete-starts", 43),
            ("named-hitmarker-terms", 11),
            ("u8-edge-values", 4),
            ("u16-edge-values", 4),
            ("i32-edge-values", 4),
            ("u32-edge-values", 4),
            ("application-count-values", 3),
            ("registration-cases", 18),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_ORWORD_CATEGORY_CENSUS,
        [
            ("canonical-single-term", 29),
            ("canonical-compound-four-term", 1),
            ("canonical-compound-two-term", 11),
            ("canonical-compound-three-term", 2),
            ("named-term-parser", 11),
            ("compound-expression-parser", 2),
            ("prior-hit-marker-u32-edge", 4),
            ("unknown-expression-direct-handler", 4),
            ("repetitions", 2),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_ORWORD_BRANCH_CENSUS,
        [("advance", 62), ("validated-undecodable", 4)]
    );
    assert_eq!(
        BATTLE_SCRIPT_ORWORD_REGISTRATION_BRANCH_CENSUS,
        [
            ("registered", 5),
            ("wrong-cardinality", 3),
            ("invalid-shape", 6),
            ("unknown-pointer", 2),
            ("unknown-value", 2),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_ORWORD_VECTOR_CORPUS_SHA256,
        "b65a896f9ec084d073fe0fa0459fc07d50ca38968c9fa1edfa31b448e300ce08"
    );
    assert_eq!(BATTLE_SCRIPT_ORWORD_VECTOR_CORPUS_BYTES, 386_692);

    let generated = include_bytes!("../src/battle_script_orword_vectors_gen.rs");
    assert_eq!(generated.len(), 568_225);
    assert!(generated.len() <= 900_000);
    assert_eq!(
        sha256("core-rs/crates/factory-core/src/battle_script_orword_vectors_gen.rs"),
        "4c9217fb59426ad2b2d7be892f64078bf667b4763f182d8eb888f70ab8d78210"
    );
    assert_eq!(
        fs::metadata(workspace_root().join("core-rs/tools/gen-battle-script-orword-vectors.mjs"))
            .unwrap()
            .len(),
        41_540
    );
    assert_eq!(
        sha256("core-rs/tools/gen-battle-script-orword-vectors.mjs"),
        "dd6258cb620cc1edff4464945735099fa55b391369e2ec64c6e66b79e4a948ab"
    );
    let generated_text = std::str::from_utf8(generated).unwrap();
    assert!(generated_text
        .contains("Source: executing canonical src/engine/battleScriptOrwordOpcode.ts via Node."));
    assert!(generated_text.contains(
        "Regenerate: node --experimental-strip-types core-rs/tools/gen-battle-script-orword-vectors.mjs."
    ));
}
