//! Pure state transformation from `gHpDealt` to `gBattleMoveDamage` for
//! `B_SCR_OP_NEGATIVEDAMAGE`.
//!
//! This is the arithmetic surface of
//! `src/engine/battleScriptNegativedamageOpcode.ts`, deliberately separated
//! from that module's opcode registration and battle-script machine seam.
//! The source implementation is the port's authority for the complete typed
//! input domain: `-Math.floor(hpDealt / 2)`, followed by a `-1` result only
//! when that computed value is zero.
//!
//! The TypeScript module cites `Cmd_negativedamage` at
//! `reference/pokeemerald/src/battle_script_commands.c:6925-6932`. Its two
//! source call sites are `BattleScript_EffectAbsorb` and
//! `BattleScript_EffectDreamEater` at
//! `reference/pokeemerald/data/battle_scripts_1.s:343-350` and
//! `:453-459`; the immediately following `datahpupdate BS_ATTACKER` applies
//! the negative result as the drain heal. The TypeScript comment also cites
//! the modeled negative-damage HP-gain branch in
//! `src/engine/battleScriptHitChainOpcode.ts:1985-2010`.
//!
//! C and Rust's ordinary signed division truncate toward zero. That is
//! equivalent for the production path's documented non-negative `hpDealt`,
//! but not for the complete signed-`i32` input contract here. The explicit
//! correction below preserves JavaScript `Math.floor` for negative odd
//! values, including the full `i32` domain, without an overflowing negation.

/// Computes the canonical negative drain amount for a signed-`i32` `hpDealt`.
///
/// This function owns no opcode registration, machine state, RNG, or battle
/// context. It is only the source-shaped scalar transformation.
#[must_use]
pub const fn calculate_battle_script_negative_damage(hp_dealt: i32) -> i32 {
    let truncated_half = hp_dealt / 2;
    let floor_half = if hp_dealt < 0 && hp_dealt % 2 != 0 {
        truncated_half - 1
    } else {
        truncated_half
    };
    let battle_move_damage = -floor_half;
    if battle_move_damage == 0 {
        -1
    } else {
        battle_move_damage
    }
}
