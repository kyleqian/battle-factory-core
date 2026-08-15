//! Pure `B_SCR_OP_NORMALISEBUFFS` state transformation and control result.
//!
//! This is the intentionally narrow state surface of
//! `src/engine/battleScriptNormalisebuffsOpcode.ts`, separated from that
//! module's opcode registration and the generic Battle Script machine. The
//! canonical handler replaces every source-shaped `statStages` row with eight
//! copies of the default stage, then advances its operand-free command.
//!
//! Source authority is Haze's `Cmd_normalisebuffs` in
//! `reference/pokeemerald/src/battle_script_commands.c:7108-7119`: its nested
//! loops visit every present battler and every `NUM_BATTLE_STATS` cell,
//! assigning `DEFAULT_STAT_STAGE`, before the one-byte instruction advance.
//! `NUM_BATTLE_STATS = NUM_STATS + 2 = 8` and `DEFAULT_STAT_STAGE = 6` are
//! defined at `reference/pokeemerald/include/constants/pokemon.h:76-90`.
//!
//! This leaf deliberately owns neither statuses, DisableStruct fields, roles,
//! absolute program counters, opcode registration, a generic `BattleState`
//! reducer, RNG, scheduler state, controller state, nor presentation.

/// The canonical TypeScript projection always carries four battler records.
/// This preserves the fixed `BattleScriptRulesContext["battlers"]` shape,
/// rather than turning this leaf into a model of source `gBattlersCount`.
pub const BATTLE_SCRIPT_NORMALISEBUFFS_BATTLER_COUNT: usize = 4;

/// Source `NUM_BATTLE_STATS` from `include/constants/pokemon.h:87`.
pub const BATTLE_SCRIPT_NORMALISEBUFFS_STAT_STAGE_COUNT: usize = 8;

/// Source `DEFAULT_STAT_STAGE` from `include/constants/pokemon.h:90`.
/// `BattleScriptRulesContext` validates these source cells as signed `s8`s.
pub const BATTLE_SCRIPT_NORMALISEBUFFS_DEFAULT_STAT_STAGE: i8 = 6;

/// The complete per-battler projection read and replaced by this opcode.
///
/// The source `BattlePokemon::statStages` field is `s8[NUM_BATTLE_STATS]`
/// (`reference/pokeemerald/include/pokemon.h:277`), so this narrow port keeps
/// all eight cells as signed bytes rather than losing the negative test domain.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptNormalisebuffsBattlerState {
    pub stat_stages: [i8; BATTLE_SCRIPT_NORMALISEBUFFS_STAT_STAGE_COUNT],
}

/// Complete narrow projection read or written by the opcode. It holds only
/// the four canonical stat-stage rows; it is not a generic battle-state
/// substitute and deliberately cannot own unrelated battler fields.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptNormalisebuffsRules {
    pub battlers:
        [BattleScriptNormalisebuffsBattlerState; BATTLE_SCRIPT_NORMALISEBUFFS_BATTLER_COUNT],
}

/// The sole control result for this unconditional, operand-free command.
/// Absolute program counters stay in the machine layer this leaf does not
/// model.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptNormalisebuffsControl {
    Advance,
}

/// Complete projected result of one handler invocation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptNormalisebuffsOutcome {
    pub rules: BattleScriptNormalisebuffsRules,
    pub control: BattleScriptNormalisebuffsControl,
}

/// Native immutable-value twin of the pure state transformation and control
/// result performed by `Cmd_normalisebuffs`'s TypeScript handler.
///
/// All four fixed battler rows and every signed stage cell are overwritten,
/// including cells that are already neutral. The source command has no role,
/// failure, or conditional-control branch: every application advances and a
/// repeated application is therefore value-idempotent.
#[must_use]
pub fn apply_battle_script_normalisebuffs(
    rules: &BattleScriptNormalisebuffsRules,
) -> BattleScriptNormalisebuffsOutcome {
    let mut next = *rules;
    for battler in &mut next.battlers {
        battler.stat_stages = [BATTLE_SCRIPT_NORMALISEBUFFS_DEFAULT_STAT_STAGE;
            BATTLE_SCRIPT_NORMALISEBUFFS_STAT_STAGE_COUNT];
    }

    BattleScriptNormalisebuffsOutcome {
        rules: next,
        control: BattleScriptNormalisebuffsControl::Advance,
    }
}
