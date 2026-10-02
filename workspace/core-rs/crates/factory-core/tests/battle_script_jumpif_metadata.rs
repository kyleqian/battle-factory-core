//! Independent source/macro/comparator citation and artifact-identity
//! ratchets for the jumpifbyte/jumpifhalfword/jumpifword family (M74).
//! Behavioral differential replay lives in the sibling test binary.

use std::{fs, path::PathBuf};

use factory_core::battle_script_jumpif::*;
use factory_core::battle_script_jumpif_catalog_gen::*;
use factory_core::battle_script_jumpif_vectors_gen::*;

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
fn opcode_ids_dispatcher_names_and_widths_are_pinned() {
    assert_eq!(BATTLE_SCRIPT_JUMPIFBYTE_OPCODE, 0x29);
    assert_eq!(BATTLE_SCRIPT_JUMPIFHALFWORD_OPCODE, 0x2a);
    assert_eq!(BATTLE_SCRIPT_JUMPIFWORD_OPCODE, 0x2b);
    assert_eq!(BATTLE_SCRIPT_JUMPIFBYTE_DISPATCHER, "Cmd_jumpifbyte");
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFHALFWORD_DISPATCHER,
        "Cmd_jumpifhalfword"
    );
    assert_eq!(BATTLE_SCRIPT_JUMPIFWORD_DISPATCHER, "Cmd_jumpifword");
    assert_eq!(BATTLE_SCRIPT_JUMPIFBYTE_VALUE_WIDTH_BYTES, 1);
    assert_eq!(BATTLE_SCRIPT_JUMPIFHALFWORD_VALUE_WIDTH_BYTES, 2);
    assert_eq!(BATTLE_SCRIPT_JUMPIFWORD_VALUE_WIDTH_BYTES, 4);
    assert_eq!(BATTLE_SCRIPT_JUMPIF_SOURCE_FILE, "data/battle_scripts_1.s");
}

#[test]
fn exact_dispatch_forward_decl_handler_and_comparator_lines_are_pinned() {
    let commands = source("reference/pokeemerald/src/battle_script_commands.c");
    let command_ids = source("reference/pokeemerald/include/constants/battle_script_commands.h");
    let macros = source("reference/pokeemerald/asm/macros/battle_script.inc");

    // Forward declarations (:120-122).
    assert_eq!(
        line(&commands, 120).trim(),
        "static void Cmd_jumpifbyte(void);"
    );
    assert_eq!(
        line(&commands, 121).trim(),
        "static void Cmd_jumpifhalfword(void);"
    );
    assert_eq!(
        line(&commands, 122).trim(),
        "static void Cmd_jumpifword(void);"
    );

    // Dispatch rows (:372-374, //0x29-//0x2B).
    assert_eq!(
        line(&commands, 372).trim(),
        "[B_SCR_OP_JUMPIFBYTE]                      = Cmd_jumpifbyte,                              //0x29"
    );
    assert_eq!(
        line(&commands, 373).trim(),
        "[B_SCR_OP_JUMPIFHALFWORD]                  = Cmd_jumpifhalfword,                          //0x2A"
    );
    assert_eq!(
        line(&commands, 374).trim(),
        "[B_SCR_OP_JUMPIFWORD]                      = Cmd_jumpifword,                              //0x2B"
    );

    // Handler bodies (:3657-3692, :3695-3731, :3733-3762).
    assert_eq!(line(&commands, 3657), "static void Cmd_jumpifbyte(void)");
    assert_eq!(
        line(&commands, 3695),
        "static void Cmd_jumpifhalfword(void)"
    );
    assert_eq!(line(&commands, 3733), "static void Cmd_jumpifword(void)");

    // Opcode enum (:47-49).
    assert_eq!(line(&command_ids, 47).trim(), "B_SCR_OP_JUMPIFBYTE,");
    assert_eq!(line(&command_ids, 48).trim(), "B_SCR_OP_JUMPIFHALFWORD,");
    assert_eq!(line(&command_ids, 49).trim(), "B_SCR_OP_JUMPIFWORD,");

    // Comparators (:326-331).
    assert_eq!(
        line(&command_ids, 326).trim(),
        "#define CMP_EQUAL               0"
    );
    assert_eq!(
        line(&command_ids, 327).trim(),
        "#define CMP_NOT_EQUAL           1"
    );
    assert_eq!(
        line(&command_ids, 328).trim(),
        "#define CMP_GREATER_THAN        2"
    );
    assert_eq!(
        line(&command_ids, 329).trim(),
        "#define CMP_LESS_THAN           3"
    );
    assert_eq!(
        line(&command_ids, 330).trim(),
        "#define CMP_COMMON_BITS         4"
    );
    assert_eq!(
        line(&command_ids, 331).trim(),
        "#define CMP_NO_COMMON_BITS      5"
    );

    // Macro operand encodings (:217-240).
    assert_eq!(
        line(&macros, 217).trim(),
        ".macro jumpifbyte ifflag:req, val:req, byte:req, ptr:req"
    );
    assert_eq!(
        line(&macros, 225).trim(),
        ".macro jumpifhalfword ifflag:req, val:req, hword:req, ptr:req"
    );
    assert_eq!(
        line(&macros, 233).trim(),
        ".macro jumpifword ifflag:req, val:req, word:req, ptr:req"
    );

    // Wrapper macros that expand to this family (:1414-1421, :1430-1432, :1434-1440).
    assert_eq!(
        line(&macros, 1414).trim(),
        ".macro jumpifmove move:req, jumpptr:req"
    );
    assert_eq!(
        line(&macros, 1415).trim(),
        "jumpifhalfword CMP_EQUAL, gCurrentMove, \\move, \\jumpptr"
    );
    assert_eq!(
        line(&macros, 1418).trim(),
        ".macro jumpifnotmove move:req, jumpptr:req"
    );
    assert_eq!(
        line(&macros, 1419).trim(),
        "jumpifhalfword CMP_NOT_EQUAL, gCurrentMove, \\move, \\jumpptr"
    );
    assert_eq!(
        line(&macros, 1430).trim(),
        ".macro jumpifmovehadnoeffect jumpptr:req"
    );
    assert_eq!(
        line(&macros, 1431).trim(),
        "jumpifbyte CMP_COMMON_BITS, gMoveResultFlags, MOVE_RESULT_NO_EFFECT, \\jumpptr"
    );
    assert_eq!(
        line(&macros, 1434).trim(),
        ".macro jumpifbattletype flags:req, jumpptr:req"
    );
    assert_eq!(
        line(&macros, 1435).trim(),
        "jumpifword CMP_COMMON_BITS, gBattleTypeFlags, \\flags, \\jumpptr"
    );
    assert_eq!(
        line(&macros, 1438).trim(),
        ".macro jumpifnotbattletype flags:req, jumpptr:req"
    );
    assert_eq!(
        line(&macros, 1439).trim(),
        "jumpifword CMP_NO_COMMON_BITS, gBattleTypeFlags, \\flags, \\jumpptr"
    );
}

#[test]
fn catalog_and_corpus_sizes_hashes_and_generation_provenance_are_pinned() {
    assert_eq!(BATTLE_SCRIPT_JUMPIF_CASES.len(), 106);
    assert_eq!(BATTLE_SCRIPT_JUMPIF_REGISTRATION_CASES.len(), 6);
    assert_eq!(
        BATTLE_SCRIPT_JUMPIF_VECTOR_CORPUS_SHA256,
        "2bae823ca1fcfa4e1b3c028e0cacf75f9462447d136bcd458d3212a0cbf126db"
    );
    assert_eq!(BATTLE_SCRIPT_JUMPIF_VECTOR_GENERATOR_BYTES, 26_541);
    assert_eq!(
        BATTLE_SCRIPT_JUMPIF_VECTOR_GENERATOR_SHA256,
        "41c53e3006e521e85076bd043449e53a17017318a43dd4b5804a7aabd4b97394"
    );

    assert_eq!(
        fs::metadata(workspace_root().join("core-rs/tools/gen-battle-script-jumpif-vectors.mjs"))
            .unwrap()
            .len(),
        26_541
    );
    assert_eq!(
        sha256("core-rs/tools/gen-battle-script-jumpif-vectors.mjs"),
        "41c53e3006e521e85076bd043449e53a17017318a43dd4b5804a7aabd4b97394"
    );

    let generated = include_bytes!("../src/battle_script_jumpif_vectors_gen.rs");
    assert_eq!(generated.len(), 158_159);
    assert_eq!(
        sha256("core-rs/crates/factory-core/src/battle_script_jumpif_vectors_gen.rs"),
        "e3d13320426e02b5f27b35f68b30e7d925d741474250cdfbc01e138c7326e686"
    );

    let catalog = include_bytes!("../src/battle_script_jumpif_catalog_gen.rs");
    assert_eq!(catalog.len(), 3_005);
    assert_eq!(
        sha256("core-rs/crates/factory-core/src/battle_script_jumpif_catalog_gen.rs"),
        "f7e4b427e01957e7b94edcd992cff378f91cbc630cf5bfb6e55db3d94fac8442"
    );
}

#[test]
fn value_catalogs_cover_the_committed_call_site_expressions() {
    // Every distinct byte-value expression the committed program's 65 call
    // sites use resolves through the shared setbyte resolver; unmodeled ones
    // (e.g. an out-of-domain literal) are recorded as `None`, never omitted.
    assert!(BATTLE_SCRIPT_JUMPIFBYTE_VALUE_CATALOG
        .iter()
        .any(|(expr, value)| *expr == "MOVE_RESULT_NO_EFFECT" && value.is_some()));
    assert!(BATTLE_SCRIPT_JUMPIFHALFWORD_VALUE_CATALOG
        .iter()
        .any(|(expr, value)| *expr == "MOVE_SURF" && value.is_some()));
    assert!(BATTLE_SCRIPT_JUMPIFHALFWORD_VALUE_CATALOG
        .iter()
        .any(|(expr, value)| *expr == "TRAINER_SECRET_BASE" && value.is_none()));
    assert!(BATTLE_SCRIPT_JUMPIFWORD_VALUE_CATALOG
        .iter()
        .any(|(expr, value)| *expr == "BATTLE_TYPE_TRAINER" && value.is_some()));
    assert!(BATTLE_SCRIPT_JUMPIFWORD_VALUE_CATALOG
        .iter()
        .any(|(expr, value)| *expr == "BATTLE_TYPE_TRAINER_HILL" && value.is_none()));
}
