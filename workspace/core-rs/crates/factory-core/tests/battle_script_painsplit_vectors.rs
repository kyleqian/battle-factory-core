//! Independent generated-corpus metadata ratchet for Pain Split.

use factory_core::battle_script_painsplit_vectors_gen::{
    BATTLE_SCRIPT_PAINSPLIT_BRANCH_CENSUS, BATTLE_SCRIPT_PAINSPLIT_CASES,
    BATTLE_SCRIPT_PAINSPLIT_CATEGORY_CENSUS, BATTLE_SCRIPT_PAINSPLIT_DOMAIN_CENSUS,
    BATTLE_SCRIPT_PAINSPLIT_REGISTRATION_BRANCH_CENSUS, BATTLE_SCRIPT_PAINSPLIT_REGISTRATION_CASES,
    BATTLE_SCRIPT_PAINSPLIT_VECTOR_CORPUS_BYTES, BATTLE_SCRIPT_PAINSPLIT_VECTOR_CORPUS_SHA256,
};

#[test]
fn corpus_censuses_hash_size_and_case_counts_are_ratchet_pinned() {
    assert_eq!(
        BATTLE_SCRIPT_PAINSPLIT_VECTOR_CORPUS_SHA256,
        "636cff5a1ac7934a7e9aea36eabe93d69092a54648665dfc5791d91f03dc8f3a",
    );
    assert_eq!(BATTLE_SCRIPT_PAINSPLIT_VECTOR_CORPUS_BYTES, 5_351_849);
    assert_eq!(BATTLE_SCRIPT_PAINSPLIT_CASES.len(), 922);
    assert_eq!(BATTLE_SCRIPT_PAINSPLIT_REGISTRATION_CASES.len(), 13);
    assert_eq!(
        BATTLE_SCRIPT_PAINSPLIT_DOMAIN_CENSUS,
        [
            ("battler-slots", 4),
            ("optional-selector-role-values", 5),
            ("complete-selector-matrix", 625),
            ("source-u16-arithmetic-values", 14),
            ("source-u16-arithmetic-pairs", 196),
            ("packed-status2-edge-values", 5),
            ("signed-source-i32-edge-values", 7),
            ("canonical-concrete-call-sites", 1),
            ("registration-cases", 13),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_PAINSPLIT_CATEGORY_CENSUS,
        [
            ("complete-selector-matrix", 625),
            ("invalid-instruction-shape-before-roles", 8),
            ("ordered-missing-role-before-label-resolution", 2),
            ("ordered-unresolved-failure-target", 2),
            ("packed-status2-substitute-edges-and-no-write-jump", 80),
            ("repeated-advance-is-idempotent", 1),
            ("repeated-failure-jump-is-idempotent", 1),
            (
                "signed-prior-globals-shellbell-and-specialstatus-siblings",
                7,
            ),
            ("source-u16-arithmetic-endpoint-parity-sign-matrix", 196),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_PAINSPLIT_BRANCH_CENSUS,
        [
            ("advance", 636),
            ("advance-then-advance", 1),
            ("fail-jump", 48),
            ("fail-jump-then-fail-jump", 1),
            ("invalid-instruction-shape", 8),
            ("missing-attacker-role", 126),
            ("missing-target-role", 101),
            ("unresolved-failure-target", 1),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_PAINSPLIT_REGISTRATION_BRANCH_CENSUS,
        [
            ("invalid-shape", 8),
            ("registered", 2),
            ("wrong-cardinality", 3),
        ],
    );
}
