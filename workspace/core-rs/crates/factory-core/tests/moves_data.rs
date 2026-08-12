//! Spot-pins `gen_tables::MOVES` (codegen: `node core-rs/tools/gen-data.mjs`)
//! against `src/data/gen/moves.json` and `reference/pokeemerald`'s
//! `EFFECT_*`/`MOVE_TARGET_*`/`FLAG_*` headers. Cross-checks id-space
//! consistency with the pre-existing `MOVE_PP` table (M3a), which indexes
//! the same 355 moves.

use factory_core::gen_tables::{MoveRow, MOVES, MOVE_PP};

#[test]
fn moves_table_has_355_rows() {
    assert_eq!(MOVES.len(), 355);
}

#[test]
fn moves_id_space_matches_move_pp_table() {
    assert_eq!(MOVES.len(), MOVE_PP.len());
    for (i, (mv, &pp)) in MOVES.iter().zip(MOVE_PP.iter()).enumerate() {
        assert_eq!(mv.id as usize, i, "MOVES[{i}].id must equal its row index");
        assert_eq!(mv.pp, pp, "MOVES[{i}].pp must match MOVE_PP[{i}]");
    }
}

#[test]
fn tackle_matches_moves_json() {
    // src/data/gen/moves.json .moves[33] (MOVE_TACKLE): type TYPE_NORMAL,
    // power 35, accuracy 95, pp 35, effect EFFECT_HIT, secondaryEffectChance
    // 0, priority 0, target ["MOVE_TARGET_SELECTED"] (bit value 0,
    // reference/pokeemerald/include/battle.h:46), flags
    // ["FLAG_MAKES_CONTACT","FLAG_PROTECT_AFFECTED","FLAG_MIRROR_MOVE_AFFECTED",
    // "FLAG_KINGS_ROCK_AFFECTED"] (bits 1+2+16+32=51,
    // reference/pokeemerald/include/constants/pokemon.h:208-213).
    let row = MOVES[33];
    assert_eq!(
        row,
        MoveRow {
            id: 33,
            move_type: 0, // TYPE_NORMAL
            power: 35,
            accuracy: 95,
            pp: 35,
            secondary_effect_chance: 0,
            priority: 0,
            effect: 0, // EFFECT_HIT (battle_move_effects.h:4)
            target: 0, // MOVE_TARGET_SELECTED
            flags: 51,
        }
    );
}

#[test]
fn focus_punch_is_a_negative_priority_move() {
    // src/data/gen/moves.json .moves[264] (MOVE_FOCUS_PUNCH): priority -3,
    // effect EFFECT_FOCUS_PUNCH (battle_move_effects.h:174, id 170), target
    // MOVE_TARGET_SELECTED (0), flags FLAG_MAKES_CONTACT|FLAG_PROTECT_AFFECTED
    // (1+2=3).
    let row = MOVES[264];
    assert_eq!(
        row,
        MoveRow {
            id: 264,
            move_type: 1, // TYPE_FIGHTING
            power: 150,
            accuracy: 100,
            pp: 20,
            secondary_effect_chance: 0,
            priority: -3,
            effect: 170,
            target: 0,
            flags: 3,
        }
    );
}

#[test]
fn pay_day_has_a_high_secondary_effect_chance() {
    // src/data/gen/moves.json .moves[6] (MOVE_PAY_DAY): secondaryEffectChance
    // 100, effect EFFECT_PAY_DAY (battle_move_effects.h:38, id 34), flags
    // FLAG_PROTECT_AFFECTED|FLAG_MIRROR_MOVE_AFFECTED|FLAG_KINGS_ROCK_AFFECTED
    // (2+16+32=50).
    let row = MOVES[6];
    assert_eq!(
        row,
        MoveRow {
            id: 6,
            move_type: 0, // TYPE_NORMAL
            power: 40,
            accuracy: 100,
            pp: 20,
            secondary_effect_chance: 100,
            priority: 0,
            effect: 34,
            target: 0,
            flags: 50,
        }
    );
}

#[test]
fn earthquake_is_a_multi_target_move() {
    // src/data/gen/moves.json .moves[89] (MOVE_EARTHQUAKE): target
    // ["MOVE_TARGET_FOES_AND_ALLY"] (bit value 1<<5=32,
    // reference/pokeemerald/include/battle.h:52), effect EFFECT_EARTHQUAKE
    // (battle_move_effects.h:151, id 147), flags
    // FLAG_PROTECT_AFFECTED|FLAG_MIRROR_MOVE_AFFECTED|FLAG_KINGS_ROCK_AFFECTED
    // (2+16+32=50).
    let row = MOVES[89];
    assert_eq!(
        row,
        MoveRow {
            id: 89,
            move_type: 4, // TYPE_GROUND
            power: 100,
            accuracy: 100,
            pp: 10,
            secondary_effect_chance: 0,
            priority: 0,
            effect: 147,
            target: 32, // MOVE_TARGET_FOES_AND_ALLY
            flags: 50,
        }
    );
}
