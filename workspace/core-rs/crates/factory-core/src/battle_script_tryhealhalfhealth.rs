//! Pure `B_SCR_OP_TRYHEALHALFHEALTH` registration and state/control
//! projection.
//!
//! This is the deliberately narrow, machine-independent port of
//! `src/engine/battleScriptTryhealhalfhealthOpcode.ts`. The canonical factory
//! uses `Array.prototype.find`, so it registers the *first* instruction whose
//! opcode name is `B_SCR_OP_TRYHEALHALFHEALTH` and deliberately performs no
//! cardinality, dispatcher, id, or operand-shape validation. The handler is a
//! separate boundary: it reads operand expression one before looking up any
//! selector role, selects `BS_ATTACKER` or `BS_TARGET`, writes the negative
//! half-max-HP damage on both control branches, and resolves its own failure
//! expression only after an exact full-HP comparison.
//!
//! Source authority:
//! - The command enum and dispatch-table binding are
//!   `B_SCR_OP_TRYHEALHALFHEALTH` / `0x7B` and `Cmd_tryhealhalfhealth` in
//!   `reference/pokeemerald/include/constants/battle_script_commands.h:129`
//!   and `reference/pokeemerald/src/battle_script_commands.c:454`.
//! - Its body is `battle_script_commands.c:6615-6629`: `BS_ATTACKER`
//!   unconditionally writes `gBattlerTarget = gBattlerAttacker`; it then
//!   writes `gBattleMoveDamage = -max(1, floor(maxHP / 2))` before comparing
//!   `hp == maxHP` and either following the pointer or advancing six bytes.
//! - The `tryhealhalfhealth ptr:req, battler:req` macro encodes one opcode,
//!   a four-byte pointer, and a one-byte battler expression at
//!   `reference/pokeemerald/asm/macros/battle_script.inc:684-688`.
//! - Its two concrete instruction shapes are `BattleScript_EffectRestoreHp`
//!   (`BS_ATTACKER`, `data/battle_scripts_1.s:672-685`) and
//!   `BattleScript_EffectSoftboiled` (`BS_TARGET`, `:2027-2040`). Both use
//!   the `BattleScript_AlreadyAtFullHp` failure label at `:2042-2046`.
//! - `BattlePokemon::hp` / `maxHP` are source `u16`
//!   (`reference/pokeemerald/include/pokemon.h:282,285`), while
//!   `gBattleMoveDamage` is source `s32` and attacker/target are source `u8`
//!   (`reference/pokeemerald/include/battle.h:654,659-660`).
//!
//! The generic Battle Script program, absolute jump program counters,
//! scheduler, RNG, events, controller state, presentation, ABI/WASM export,
//! and later `datahpupdate` healing are deliberately outside this pure leaf.

use core::fmt;

/// Source `MAX_BATTLERS_COUNT`; active arrays retain all four source slots
/// even in a Factory singles battle.
pub const BATTLE_SCRIPT_TRYHEALHALFHEALTH_BATTLER_COUNT: usize = 4;

/// The only opcode name observed by the canonical registration factory.
pub const BATTLE_SCRIPT_TRYHEALHALFHEALTH_OPCODE_NAME: &str = "B_SCR_OP_TRYHEALHALFHEALTH";

/// `B_SCR_OP_TRYHEALHALFHEALTH` source identity, separately ratcheted rather
/// than a registration or handler predicate.
pub const BATTLE_SCRIPT_TRYHEALHALFHEALTH_OPCODE: u8 = 0x7b;

/// Source dispatcher identity, separately ratcheted rather than a factory or
/// handler predicate.
pub const BATTLE_SCRIPT_TRYHEALHALFHEALTH_DISPATCHER: &str = "Cmd_tryhealhalfhealth";

/// First operand of the six-byte source macro is a four-byte failure pointer.
pub const BATTLE_SCRIPT_TRYHEALHALFHEALTH_FAILURE_POINTER_WIDTH_BYTES: u8 = 4;

/// Second operand of the six-byte source macro is a source selector byte.
pub const BATTLE_SCRIPT_TRYHEALHALFHEALTH_BATTLER_OPERAND_WIDTH_BYTES: u8 = 1;

/// The two source expressions accepted by the direct canonical handler.
pub const BATTLE_SCRIPT_TRYHEALHALFHEALTH_BS_ATTACKER: &str = "BS_ATTACKER";
pub const BATTLE_SCRIPT_TRYHEALHALFHEALTH_BS_TARGET: &str = "BS_TARGET";

/// The committed pointer expression shared by both concrete source calls.
pub const BATTLE_SCRIPT_TRYHEALHALFHEALTH_FULL_HP_LABEL: &str = "BattleScript_AlreadyAtFullHp";

/// Complete source `BattleScriptBattlerId` domain used by selector roles and
/// indexed active-battler state.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptTryhealhalfhealthBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

/// Fixed source battler domain, retained for all-role and sibling-preservation
/// ratchets.
pub const BATTLE_SCRIPT_TRYHEALHALFHEALTH_BATTLERS: [BattleScriptTryhealhalfhealthBattler;
    BATTLE_SCRIPT_TRYHEALHALFHEALTH_BATTLER_COUNT] = [
    BattleScriptTryhealhalfhealthBattler::Battler0,
    BattleScriptTryhealhalfhealthBattler::Battler1,
    BattleScriptTryhealhalfhealthBattler::Battler2,
    BattleScriptTryhealhalfhealthBattler::Battler3,
];

impl BattleScriptTryhealhalfhealthBattler {
    /// Zero-based source-array index.
    #[must_use]
    pub const fn index(self) -> usize {
        self as usize
    }

    /// Source `u8` battler id.
    #[must_use]
    pub const fn as_u8(self) -> u8 {
        self as u8
    }
}

/// Complete selector projection retained by the TypeScript handler's object
/// spread. `BS_ATTACKER` reads only `attacker` and overwrites `target`; the
/// `BS_TARGET` path reads only `target` and retains this whole value exactly.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryhealhalfhealthRoles {
    pub attacker: Option<BattleScriptTryhealhalfhealthBattler>,
    pub target: Option<BattleScriptTryhealhalfhealthBattler>,
    pub effect_battler: Option<BattleScriptTryhealhalfhealthBattler>,
    pub fainted: Option<BattleScriptTryhealhalfhealthBattler>,
}

/// Representative complete active-battler projection preserved by this leaf.
/// Only `hp` and `max_hp` are read; the remaining source-shaped values make
/// the immutable shallow-copy boundary executable in tests.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryhealhalfhealthBattlerState {
    pub side: u8,
    pub ability: u8,
    /// Source `gBattleMons[battler].hp` (`u16`). Corrupt values greater than
    /// `max_hp` stay representable because the TypeScript direct handler only
    /// tests exact equality.
    pub hp: u16,
    /// Source `gBattleMons[battler].maxHP` (`u16`), including zero in direct
    /// canonical handler calls.
    pub max_hp: u16,
    pub moves: [u16; 4],
    pub pp: [u8; 4],
    pub status1: u32,
    pub status2: u32,
    pub status3: u32,
    pub substitute_hp: u16,
    pub rollout_timer: u8,
    pub fury_cutter_counter: u8,
    pub truant_counter: u8,
    pub recharge_timer: u8,
    pub flinch_immobility: u8,
    pub disabled_move: u16,
    pub used_disabled_move: u8,
    pub taunt_timer: u8,
    pub used_taunted_move: u8,
    pub used_imprisoned_move: u8,
    pub item: u16,
    pub stat_stages: [u8; 8],
    pub party_index: u8,
    pub speed: u16,
}

/// Independent rules-context fields retained so this leaf cannot silently
/// discard source-shaped siblings while replacing only roles/damage.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryhealhalfhealthSiblings {
    pub scripting_battler: BattleScriptTryhealhalfhealthBattler,
    pub battler_with_ability: BattleScriptTryhealhalfhealthBattler,
    pub atk_canceler_tracker: u8,
    pub battle_outcome: u8,
    pub current_move: u16,
    pub current_move_effect: u8,
    pub current_move_position: u8,
    pub move_result_flags: u32,
    pub dmg_multiplier: u8,
    pub crit_multiplier: u8,
    pub move_effect_byte: u8,
    pub miss_type: u8,
    pub hit_marker: u32,
    pub multi_hit_counter: u8,
    pub multi_hit_string_counter: u8,
    pub multistring_chooser: u8,
    pub pain_split_hp: i32,
    pub dynamic_base_power: u16,
    pub hp_dealt: i32,
    pub bide_dmg: [i32; BATTLE_SCRIPT_TRYHEALHALFHEALTH_BATTLER_COUNT],
    pub locked_moves: [u16; BATTLE_SCRIPT_TRYHEALHALFHEALTH_BATTLER_COUNT],
    pub side_statuses: [u32; 2],
    pub weather: u32,
    pub weather_timer: u8,
}

/// Complete narrow projection read or written by the canonical handler. This
/// is not a generic `BattleState`: every retained field proves the command's
/// strict immutable ownership boundary.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryhealhalfhealthRules {
    pub battlers:
        [BattleScriptTryhealhalfhealthBattlerState; BATTLE_SCRIPT_TRYHEALHALFHEALTH_BATTLER_COUNT],
    pub selector_roles: BattleScriptTryhealhalfhealthRoles,
    /// Source `s32 gBattleMoveDamage`, overwritten even if the target is at
    /// full HP and the instruction follows its failure pointer.
    pub battle_move_damage: i32,
    pub siblings: BattleScriptTryhealhalfhealthSiblings,
}

/// Minimal source operand projection. The handler reads only expressions;
/// widths are retained to separately ratchet the concrete macro encodings and
/// deliberately do not become an invented handler predicate.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryhealhalfhealthOperand<'a> {
    pub width_bytes: u8,
    pub expression: &'a str,
}

/// Instruction plus the parent machine's result of resolving operand zero.
///
/// The generic machine owns labels and absolute program counters. This leaf
/// carries only the exact expression whose lookup succeeded, which proves a
/// full-HP branch resolves its *own* pointer late without leaking a cursor.
/// The registration projection sees all instruction fields but only reads
/// `opcode_name`; handler execution sees operand expressions and the lookup
/// result but deliberately does not enforce source identity or shape.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryhealhalfhealthInstruction<'a> {
    pub opcode_name: &'a str,
    pub program_counter: u32,
    pub opcode_id: u8,
    pub dispatcher: &'a str,
    pub operands: &'a [BattleScriptTryhealhalfhealthOperand<'a>],
    pub resolved_failure_target: Option<&'a str>,
}

/// The single dynamic handler-map binding returned by a successful canonical
/// first-match registration.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryhealhalfhealthRegistration {
    pub opcode_id: u8,
}

/// Machine-independent control result of `Cmd_tryhealhalfhealth`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTryhealhalfhealthControl {
    /// `hp != maxHP`: source advances its six-byte instruction.
    Advance,
    /// `hp == maxHP`: source follows operand zero after that exact expression
    /// has resolved in the surrounding program.
    FailJump,
}

/// Complete projected result of one successful handler invocation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryhealhalfhealthOutcome {
    pub rules: BattleScriptTryhealhalfhealthRules,
    pub control: BattleScriptTryhealhalfhealthControl,
}

/// Exact canonical TypeScript factory failure. No extra cardinality or shape
/// variants exist because `.find` neither observes duplicates nor validates a
/// selected instruction beyond its opcode name.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTryhealhalfhealthRegistrationError {
    MissingConcreteInstruction,
}

impl fmt::Display for BattleScriptTryhealhalfhealthRegistrationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::MissingConcreteInstruction => write!(
                formatter,
                "committed Battle Script program does not emit B_SCR_OP_TRYHEALHALFHEALTH"
            ),
        }
    }
}

impl std::error::Error for BattleScriptTryhealhalfhealthRegistrationError {}

/// Exact direct-handler errors in canonical evaluation order.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTryhealhalfhealthError<'a> {
    UnexpectedBattlerOperand { expression: Option<&'a str> },
    MissingAttackerRole,
    MissingTargetRole,
    UnresolvedJumpTarget { expression: &'a str },
}

impl fmt::Display for BattleScriptTryhealhalfhealthError<'_> {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::UnexpectedBattlerOperand { expression } => write!(
                formatter,
                "Cmd_tryhealhalfhealth: unexpected battler operand {} -- the committed program's only two call sites use BS_ATTACKER/BS_TARGET",
                expression.unwrap_or("<missing>"),
            ),
            Self::MissingAttackerRole => {
                write!(formatter, "Cmd_tryhealhalfhealth requires a attacker role")
            }
            Self::MissingTargetRole => {
                write!(formatter, "Cmd_tryhealhalfhealth requires a target role")
            }
            Self::UnresolvedJumpTarget { expression } => {
                write!(formatter, "Cmd_tryhealhalfhealth: unresolved jump target {expression}")
            }
        }
    }
}

impl std::error::Error for BattleScriptTryhealhalfhealthError<'_> {}

/// Native projection of
/// `createBattleScriptTryhealhalfhealthOpcodeHandlers(program)`.
///
/// `Array.prototype.find` selects only the first name match. It neither counts
/// later matches nor inspects the selected instruction's id, dispatcher, or
/// operands. Keep that deliberately permissive observable behavior; the
/// generated corpus separately pins the real source identity and both actual
/// concrete operand shapes.
pub fn register_battle_script_tryhealhalfhealth_handler(
    instructions: &[BattleScriptTryhealhalfhealthInstruction<'_>],
) -> Result<BattleScriptTryhealhalfhealthRegistration, BattleScriptTryhealhalfhealthRegistrationError>
{
    let instruction = instructions
        .iter()
        .find(|instruction| instruction.opcode_name == BATTLE_SCRIPT_TRYHEALHALFHEALTH_OPCODE_NAME)
        .ok_or(BattleScriptTryhealhalfhealthRegistrationError::MissingConcreteInstruction)?;
    Ok(BattleScriptTryhealhalfhealthRegistration { opcode_id: instruction.opcode_id })
}

/// Source-shaped positive half: `max(1, floor(maxHP / 2))` over the complete
/// source `u16` input domain. `u16::MAX` therefore produces `32767`; minimum
/// clamping handles both zero and one max-HP values.
#[must_use]
pub const fn battle_script_tryhealhalfhealth_half_max_hp(max_hp: u16) -> u16 {
    let half = max_hp / 2;
    if half == 0 {
        1
    } else {
        half
    }
}

/// Native immutable-value twin of the canonical `Cmd_tryhealhalfhealth`
/// handler.
///
/// Operand expression one is examined before every selector lookup. The
/// `BS_ATTACKER` path requires an attacker and overwrites only target;
/// `BS_TARGET` requires a target and retains all selectors. Both paths read
/// their selected target's source-width HP fields, calculate/write negative
/// half max HP, and preserve all battlers and sibling context. Only then does
/// the exact `hp == max_hp` branch resolve operand zero's own expression; an
/// unresolved pointer is consequently invisible on non-full paths and loses
/// to missing role errors on full ones. This pure value result consumes no
/// RNG, emits no events, and mutates no input.
pub fn apply_battle_script_tryhealhalfhealth<'a>(
    instruction: BattleScriptTryhealhalfhealthInstruction<'a>,
    rules: &BattleScriptTryhealhalfhealthRules,
) -> Result<BattleScriptTryhealhalfhealthOutcome, BattleScriptTryhealhalfhealthError<'a>> {
    let battler_expression = instruction
        .operands
        .get(1)
        .map(|operand| operand.expression);
    let (target, selector_roles) = match battler_expression {
        Some(BATTLE_SCRIPT_TRYHEALHALFHEALTH_BS_ATTACKER) => {
            let attacker = rules
                .selector_roles
                .attacker
                .ok_or(BattleScriptTryhealhalfhealthError::MissingAttackerRole)?;
            let mut selector_roles = rules.selector_roles;
            selector_roles.target = Some(attacker);
            (attacker, selector_roles)
        }
        Some(BATTLE_SCRIPT_TRYHEALHALFHEALTH_BS_TARGET) => {
            let target = rules
                .selector_roles
                .target
                .ok_or(BattleScriptTryhealhalfhealthError::MissingTargetRole)?;
            (target, rules.selector_roles)
        }
        expression => {
            return Err(
                BattleScriptTryhealhalfhealthError::UnexpectedBattlerOperand { expression },
            );
        }
    };

    // A successful selector at index one proves operand zero exists too.
    let failure_expression = instruction.operands[0].expression;
    let target_state = rules.battlers[target.index()];
    let half = battle_script_tryhealhalfhealth_half_max_hp(target_state.max_hp);
    let battle_move_damage = -i32::from(half);
    let mut next = *rules;
    next.selector_roles = selector_roles;
    next.battle_move_damage = battle_move_damage;

    if target_state.hp == target_state.max_hp {
        if instruction.resolved_failure_target != Some(failure_expression) {
            return Err(BattleScriptTryhealhalfhealthError::UnresolvedJumpTarget {
                expression: failure_expression,
            });
        }
        return Ok(BattleScriptTryhealhalfhealthOutcome {
            rules: next,
            control: BattleScriptTryhealhalfhealthControl::FailJump,
        });
    }

    Ok(BattleScriptTryhealhalfhealthOutcome {
        rules: next,
        control: BattleScriptTryhealhalfhealthControl::Advance,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    const OPERANDS: [BattleScriptTryhealhalfhealthOperand<'static>; 2] = [
        BattleScriptTryhealhalfhealthOperand {
            width_bytes: BATTLE_SCRIPT_TRYHEALHALFHEALTH_FAILURE_POINTER_WIDTH_BYTES,
            expression: BATTLE_SCRIPT_TRYHEALHALFHEALTH_FULL_HP_LABEL,
        },
        BattleScriptTryhealhalfhealthOperand {
            width_bytes: BATTLE_SCRIPT_TRYHEALHALFHEALTH_BATTLER_OPERAND_WIDTH_BYTES,
            expression: BATTLE_SCRIPT_TRYHEALHALFHEALTH_BS_ATTACKER,
        },
    ];

    const BATTLER: BattleScriptTryhealhalfhealthBattlerState =
        BattleScriptTryhealhalfhealthBattlerState {
            side: 0,
            ability: 1,
            hp: 7,
            max_hp: 101,
            moves: [105, 135, 0, 0],
            pp: [10, 10, 0, 0],
            status1: 0x0102_0304,
            status2: 0x0506_0708,
            status3: 0x090a_0b0c,
            substitute_hp: 13,
            rollout_timer: 14,
            fury_cutter_counter: 15,
            truant_counter: 16,
            recharge_timer: 17,
            flinch_immobility: 18,
            disabled_move: 19,
            used_disabled_move: 20,
            taunt_timer: 21,
            used_taunted_move: 22,
            used_imprisoned_move: 23,
            item: 24,
            stat_stages: [0, 1, 2, 3, 4, 5, 6, 7],
            party_index: 2,
            speed: 25,
        };

    const SIBLINGS: BattleScriptTryhealhalfhealthSiblings = BattleScriptTryhealhalfhealthSiblings {
        scripting_battler: BattleScriptTryhealhalfhealthBattler::Battler0,
        battler_with_ability: BattleScriptTryhealhalfhealthBattler::Battler1,
        atk_canceler_tracker: 2,
        battle_outcome: 3,
        current_move: 105,
        current_move_effect: 4,
        current_move_position: 1,
        move_result_flags: 0x8000_0001,
        dmg_multiplier: 5,
        crit_multiplier: 6,
        move_effect_byte: 7,
        miss_type: 8,
        hit_marker: 0x4000_0002,
        multi_hit_counter: 9,
        multi_hit_string_counter: 10,
        multistring_chooser: 11,
        pain_split_hp: i32::MIN,
        dynamic_base_power: 12,
        hp_dealt: i32::MAX,
        bide_dmg: [i32::MIN, -1, 0, i32::MAX],
        locked_moves: [13, 14, 15, 16],
        side_statuses: [0x0100_0001, 0x8000_0002],
        weather: 0x4000_0003,
        weather_timer: 17,
    };

    fn rules(
        attacker: Option<BattleScriptTryhealhalfhealthBattler>,
        target: Option<BattleScriptTryhealhalfhealthBattler>,
        hp: u16,
        max_hp: u16,
    ) -> BattleScriptTryhealhalfhealthRules {
        let mut focus = BATTLER;
        focus.hp = hp;
        focus.max_hp = max_hp;
        BattleScriptTryhealhalfhealthRules {
            battlers: [focus, BATTLER, BATTLER, BATTLER],
            selector_roles: BattleScriptTryhealhalfhealthRoles {
                attacker,
                target,
                effect_battler: Some(BattleScriptTryhealhalfhealthBattler::Battler2),
                fainted: Some(BattleScriptTryhealhalfhealthBattler::Battler3),
            },
            battle_move_damage: i32::MIN,
            siblings: SIBLINGS,
        }
    }

    fn instruction(
        operands: &'static [BattleScriptTryhealhalfhealthOperand<'static>],
        resolved_failure_target: Option<&'static str>,
    ) -> BattleScriptTryhealhalfhealthInstruction<'static> {
        BattleScriptTryhealhalfhealthInstruction {
            opcode_name: BATTLE_SCRIPT_TRYHEALHALFHEALTH_OPCODE_NAME,
            program_counter: 344,
            opcode_id: BATTLE_SCRIPT_TRYHEALHALFHEALTH_OPCODE,
            dispatcher: BATTLE_SCRIPT_TRYHEALHALFHEALTH_DISPATCHER,
            operands,
            resolved_failure_target,
        }
    }

    #[test]
    fn half_helper_covers_minimum_and_u16_endpoints() {
        assert_eq!(battle_script_tryhealhalfhealth_half_max_hp(0), 1);
        assert_eq!(battle_script_tryhealhalfhealth_half_max_hp(1), 1);
        assert_eq!(battle_script_tryhealhalfhealth_half_max_hp(2), 1);
        assert_eq!(battle_script_tryhealhalfhealth_half_max_hp(101), 50);
        assert_eq!(
            battle_script_tryhealhalfhealth_half_max_hp(u16::MAX),
            32_767
        );
    }

    #[test]
    fn attacker_rebinds_target_and_writes_damage_before_full_hp_jump() {
        let input = rules(
            Some(BattleScriptTryhealhalfhealthBattler::Battler0),
            Some(BattleScriptTryhealhalfhealthBattler::Battler1),
            101,
            101,
        );
        let before = input;
        let outcome = apply_battle_script_tryhealhalfhealth(
            instruction(
                &OPERANDS,
                Some(BATTLE_SCRIPT_TRYHEALHALFHEALTH_FULL_HP_LABEL),
            ),
            &input,
        )
        .expect("full HP with its resolved pointer must jump");
        assert_eq!(
            outcome.control,
            BattleScriptTryhealhalfhealthControl::FailJump
        );
        assert_eq!(
            outcome.rules.selector_roles.attacker,
            input.selector_roles.attacker
        );
        assert_eq!(
            outcome.rules.selector_roles.target,
            Some(BattleScriptTryhealhalfhealthBattler::Battler0)
        );
        assert_eq!(
            outcome.rules.selector_roles.effect_battler,
            input.selector_roles.effect_battler
        );
        assert_eq!(
            outcome.rules.selector_roles.fainted,
            input.selector_roles.fainted
        );
        assert_eq!(outcome.rules.battle_move_damage, -50);
        assert_eq!(outcome.rules.battlers, input.battlers);
        assert_eq!(outcome.rules.siblings, input.siblings);
        assert_eq!(input, before, "input must remain immutable");
    }

    #[test]
    fn operand_precedes_roles_and_nonfull_skips_label_lookup() {
        const BAD_OPERANDS: [BattleScriptTryhealhalfhealthOperand<'static>; 2] = [
            BattleScriptTryhealhalfhealthOperand {
                width_bytes: 4,
                expression: "BattleScript_Unresolved",
            },
            BattleScriptTryhealhalfhealthOperand {
                width_bytes: 1,
                expression: "BS_EFFECT_BATTLER",
            },
        ];
        let missing_roles = rules(None, None, 0, 100);
        assert_eq!(
            apply_battle_script_tryhealhalfhealth(instruction(&BAD_OPERANDS, None), &missing_roles)
                .expect_err("bad operand must win before either role")
                .to_string(),
            "Cmd_tryhealhalfhealth: unexpected battler operand BS_EFFECT_BATTLER -- the committed program's only two call sites use BS_ATTACKER/BS_TARGET"
        );

        let input = rules(
            Some(BattleScriptTryhealhalfhealthBattler::Battler0),
            Some(BattleScriptTryhealhalfhealthBattler::Battler0),
            99,
            100,
        );
        let outcome = apply_battle_script_tryhealhalfhealth(instruction(&OPERANDS, None), &input)
            .expect("nonfull path must not resolve its failure label");
        assert_eq!(
            outcome.control,
            BattleScriptTryhealhalfhealthControl::Advance
        );
        assert_eq!(outcome.rules.battle_move_damage, -50);
    }

    #[test]
    fn registration_is_first_match_only_and_has_no_shape_predicates() {
        const EMPTY: [BattleScriptTryhealhalfhealthOperand<'static>; 0] = [];
        let first = BattleScriptTryhealhalfhealthInstruction {
            opcode_name: BATTLE_SCRIPT_TRYHEALHALFHEALTH_OPCODE_NAME,
            program_counter: 1,
            opcode_id: 0,
            dispatcher: "not inspected",
            operands: &EMPTY,
            resolved_failure_target: None,
        };
        let second = BattleScriptTryhealhalfhealthInstruction {
            opcode_id: BATTLE_SCRIPT_TRYHEALHALFHEALTH_OPCODE,
            ..instruction(
                &OPERANDS,
                Some(BATTLE_SCRIPT_TRYHEALHALFHEALTH_FULL_HP_LABEL),
            )
        };
        assert_eq!(
            register_battle_script_tryhealhalfhealth_handler(&[first, second]),
            Ok(BattleScriptTryhealhalfhealthRegistration { opcode_id: 0 })
        );
        assert_eq!(
            register_battle_script_tryhealhalfhealth_handler(&[
                BattleScriptTryhealhalfhealthInstruction { opcode_name: "B_SCR_OP_NOP", ..first }
            ])
            .expect_err("missing name must fail")
            .to_string(),
            "committed Battle Script program does not emit B_SCR_OP_TRYHEALHALFHEALTH"
        );
    }
}
