//! Pure `B_SCR_OP_SETSUBSTITUTE` registration and state/control projection.
//!
//! This is the deliberately narrow, machine-independent port of
//! `src/engine/battleScriptSetsubstituteOpcode.ts`. `Cmd_setsubstitute`
//! resolves the attacker first, derives one quarter of its max HP (with the
//! canonical defensive minimum of one), and either records the too-weak
//! result or constructs the attacker's durable Substitute state. It always
//! advances one operand-free instruction.
//!
//! Source authority:
//! - `Cmd_setsubstitute` is at
//!   `reference/pokeemerald/src/battle_script_commands.c:7808-7832`, and the
//!   dispatch table binds `B_SCR_OP_SETSUBSTITUTE` / `0x9C` to it at `:487`.
//! - Its one-byte `setsubstitute` macro is at
//!   `reference/pokeemerald/asm/macros/battle_script.inc:832-834`; the sole
//!   concrete effect-script invocation is
//!   `BattleScript_EffectSubstitute` at
//!   `reference/pokeemerald/data/battle_scripts_1.s:1085-1108`.
//! - `STATUS2_SUBSTITUTE`, `STATUS2_WRAPPED`, and
//!   `HITMARKER_IGNORE_SUBSTITUTE` are at
//!   `reference/pokeemerald/include/constants/battle.h:135-150,184-198`.
//!   `B_MSG_SET_SUBSTITUTE` / `B_MSG_SUBSTITUTE_FAILED` select
//!   `gSubstituteUsedStringIds` at
//!   `reference/pokeemerald/include/constants/battle_string_ids.h:507-509`
//!   and `reference/pokeemerald/src/battle_message.c:1066-1070`.
//! - The actual HP debit is intentionally later: the success branch reaches
//!   `healthbarupdate BS_ATTACKER` then `datahpupdate BS_ATTACKER` at
//!   `data/battle_scripts_1.s:1095-1107`; `Cmd_datahpupdate` owns that debit
//!   at `battle_script_commands.c:1843-1925`.
//!
//! The TypeScript registration factory deliberately filters only by opcode
//! name and checks that exactly one candidate exists. It does *not* inspect
//! the selected instruction's id, dispatcher, or operands. This module keeps
//! that observable factory boundary, while the generated corpus separately
//! ratchets the real source identity.
//!
//! This leaf deliberately owns neither a generic Battle Script machine,
//! absolute program counter, scheduler/RNG/event transport, later HP debit,
//! controller state, presentation, ABI, nor WASM adapter.

use core::fmt;

/// Source `MAX_BATTLERS_COUNT`; source arrays retain four indexed cells even
/// in a Factory singles battle.
pub const BATTLE_SCRIPT_SETSUBSTITUTE_BATTLER_COUNT: usize = 4;

/// The concrete opcode name selected by the canonical TypeScript factory.
pub const BATTLE_SCRIPT_SETSUBSTITUTE_OPCODE_NAME: &str = "B_SCR_OP_SETSUBSTITUTE";

/// `B_SCR_OP_SETSUBSTITUTE`, separately ratcheted source identity.
pub const BATTLE_SCRIPT_SETSUBSTITUTE_OPCODE: u8 = 0x9c;

/// Source dispatcher, separately ratcheted rather than a factory predicate.
pub const BATTLE_SCRIPT_SETSUBSTITUTE_DISPATCHER: &str = "Cmd_setsubstitute";

/// `STATUS2_SUBSTITUTE` from `include/constants/battle.h:148`.
pub const BATTLE_SCRIPT_STATUS2_SUBSTITUTE: u32 = 1 << 24;

/// `STATUS2_WRAPPED` from `include/constants/battle.h:140`.
pub const BATTLE_SCRIPT_STATUS2_WRAPPED_MASK: u32 = (1 << 13) | (1 << 14) | (1 << 15);

/// `HITMARKER_IGNORE_SUBSTITUTE` from `include/constants/battle.h:188`.
pub const BATTLE_SCRIPT_HITMARKER_IGNORE_SUBSTITUTE: u32 = 1 << 8;

/// `B_MSG_SET_SUBSTITUTE`, index into `gSubstituteUsedStringIds`.
pub const BATTLE_SCRIPT_B_MSG_SET_SUBSTITUTE: u8 = 0;

/// `B_MSG_SUBSTITUTE_FAILED`, index into `gSubstituteUsedStringIds`.
pub const BATTLE_SCRIPT_B_MSG_SUBSTITUTE_FAILED: u8 = 1;

/// Complete source `BattleScriptBattlerId` domain used by selector roles and
/// all source-indexed arrays retained in this projection.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptSetsubstituteBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

/// Fixed source battler domain, retained for role and sibling ratchets.
pub const BATTLE_SCRIPT_SETSUBSTITUTE_BATTLERS: [BattleScriptSetsubstituteBattler;
    BATTLE_SCRIPT_SETSUBSTITUTE_BATTLER_COUNT] = [
    BattleScriptSetsubstituteBattler::Battler0,
    BattleScriptSetsubstituteBattler::Battler1,
    BattleScriptSetsubstituteBattler::Battler2,
    BattleScriptSetsubstituteBattler::Battler3,
];

impl BattleScriptSetsubstituteBattler {
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

/// Complete selector-role projection. Only `attacker` is read, but the other
/// nullable aliases are retained so the canonical object-spread preservation
/// is executable instead of assumed.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetsubstituteRoles {
    pub attacker: Option<BattleScriptSetsubstituteBattler>,
    pub target: Option<BattleScriptSetsubstituteBattler>,
    pub effect_battler: Option<BattleScriptSetsubstituteBattler>,
    pub fainted: Option<BattleScriptSetsubstituteBattler>,
}

/// Per-battler state retained by this narrow projection. The command reads
/// `hp`/`max_hp` and replaces only `status2` and `substitute_hp` on a
/// successful path; all other fields pin the source-shaped shallow copy.
///
/// `DisableStruct::substituteHP` is a source `u8`, but the canonical
/// TypeScript handler is directly callable over the complete `maxHP` `u16`
/// domain and writes its un-narrowed quarter value. This projection therefore
/// preserves its direct-handler value as `u16`, including values above 255;
/// the later source storage boundary is outside this leaf.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetsubstituteBattlerState {
    pub side: u8,
    pub ability: u8,
    pub hp: u16,
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

/// Independent source-shaped rules-context fields preserved by the canonical
/// `{ ...rulesContext }` result. None is read or written by this command;
/// retaining them makes its copy-only ownership boundary explicit.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetsubstituteSiblings {
    pub scripting_battler: BattleScriptSetsubstituteBattler,
    pub battler_with_ability: BattleScriptSetsubstituteBattler,
    pub atk_canceler_tracker: u8,
    pub battle_outcome: u8,
    pub current_move: u16,
    pub current_move_effect: u8,
    pub current_move_power: u16,
    pub current_move_position: u8,
    pub move_result_flags: u32,
    pub dmg_multiplier: u8,
    pub crit_multiplier: u8,
    pub move_effect_byte: u8,
    pub miss_type: u8,
    pub multi_hit_counter: u8,
    pub multi_hit_string_counter: u8,
    pub dynamic_base_power: u16,
    pub hp_dealt: i32,
    pub locked_moves: [u16; BATTLE_SCRIPT_SETSUBSTITUTE_BATTLER_COUNT],
    pub bide_dmg: [i32; BATTLE_SCRIPT_SETSUBSTITUTE_BATTLER_COUNT],
    pub side_statuses: [u32; 2],
    pub weather: u32,
    pub weather_timer: u8,
}

/// Complete narrow rules projection read or written by the canonical handler.
/// It is intentionally not a generic battle-state replacement: each retained
/// field exists only to prove this leaf's immutable state ownership.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetsubstituteRules {
    pub battlers:
        [BattleScriptSetsubstituteBattlerState; BATTLE_SCRIPT_SETSUBSTITUTE_BATTLER_COUNT],
    pub selector_roles: BattleScriptSetsubstituteRoles,
    /// Source `s32 gBattleMoveDamage`; this constructor only writes zero or
    /// one quarter of an unsigned-16 max HP.
    pub battle_move_damage: i32,
    /// Source `gBattleCommunication[MULTISTRING_CHOOSER]` table index.
    pub multistring_chooser: u8,
    /// Source `u32 gHitMarker`, retained over its complete packed-word domain.
    pub hit_marker: u32,
    pub siblings: BattleScriptSetsubstituteSiblings,
}

/// Minimal full instruction projection used only by the factory. The
/// canonical factory observes `opcode_name` and returns `opcode_id`; the
/// remaining fields are deliberately present but never predicates.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetsubstituteInstruction<'a> {
    pub opcode_name: &'a str,
    pub program_counter: u32,
    pub opcode_id: u8,
    pub dispatcher: &'a str,
    pub operand_count: usize,
}

/// The one handler-map binding created by a successful registration.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetsubstituteRegistration {
    pub opcode_id: u8,
}

/// The only machine-independent control result for this unconditional
/// one-byte command.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptSetsubstituteControl {
    Advance,
}

/// Complete projected result of one successful handler application.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetsubstituteOutcome {
    pub rules: BattleScriptSetsubstituteRules,
    pub control: BattleScriptSetsubstituteControl,
}

/// Canonical TypeScript factory failure. The handler's typed missing-attacker
/// error is intentionally separate because registration happens earlier in
/// the outer machine assembly.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptSetsubstituteRegistrationError {
    ExpectedOneConcreteInstruction { count: usize },
}

impl fmt::Display for BattleScriptSetsubstituteRegistrationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::ExpectedOneConcreteInstruction { count } => write!(
                formatter,
                "committed Battle Script program must emit one B_SCR_OP_SETSUBSTITUTE, found {count}"
            ),
        }
    }
}

impl std::error::Error for BattleScriptSetsubstituteRegistrationError {}

/// Exact typed-reachable error thrown by the canonical handler.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptSetsubstituteError {
    MissingAttackerRole,
}

impl fmt::Display for BattleScriptSetsubstituteError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::MissingAttackerRole => {
                write!(formatter, "Cmd_setsubstitute requires an attacker role")
            }
        }
    }
}

impl std::error::Error for BattleScriptSetsubstituteError {}

/// Native projection of `createBattleScriptSetsubstituteOpcodeHandlers`.
///
/// The TypeScript factory filters the whole program by exactly the concrete
/// opcode name, errors only when that candidate count is not one, and maps the
/// selected instruction's dynamic opcode id to the handler. It deliberately
/// does not inspect dispatcher or operands, and it does not require the id to
/// equal the real source `0x9C`; preserve that behavior here.
pub fn register_battle_script_setsubstitute_handler(
    instructions: &[BattleScriptSetsubstituteInstruction<'_>],
) -> Result<BattleScriptSetsubstituteRegistration, BattleScriptSetsubstituteRegistrationError> {
    let mut matches = instructions
        .iter()
        .filter(|instruction| instruction.opcode_name == BATTLE_SCRIPT_SETSUBSTITUTE_OPCODE_NAME);
    let selected = matches.next();
    let count = usize::from(selected.is_some()) + matches.count();
    let Some(instruction) = selected else {
        return Err(
            BattleScriptSetsubstituteRegistrationError::ExpectedOneConcreteInstruction { count: 0 },
        );
    };
    if count != 1 {
        return Err(
            BattleScriptSetsubstituteRegistrationError::ExpectedOneConcreteInstruction { count },
        );
    }
    Ok(BattleScriptSetsubstituteRegistration { opcode_id: instruction.opcode_id })
}

/// The canonical direct-handler quarter: `max(1, floor(maxHP / 4))` over the
/// complete source `u16` max-HP domain.
#[must_use]
pub const fn battle_script_setsubstitute_quarter_max_hp(max_hp: u16) -> u16 {
    let quarter = max_hp / 4;
    if quarter == 0 {
        1
    } else {
        quarter
    }
}

/// Native immutable-value twin of the canonical `Cmd_setsubstitute` handler.
///
/// Attacker resolution is deliberately the first operation. Failure at
/// `hp <= quarter` changes *only* `battle_move_damage` to zero and the
/// chooser to the failure index. Success updates only the attacker's durable
/// Substitute fields, overwrites move damage and chooser, and ORs the source
/// ignore-substitute marker. Neither path debits HP; later effect-script
/// `datahpupdate` owns that behavior. Both paths return `Advance`, with no
/// RNG, scheduler, or event work in this pure leaf.
pub fn apply_battle_script_setsubstitute(
    rules: &BattleScriptSetsubstituteRules,
) -> Result<BattleScriptSetsubstituteOutcome, BattleScriptSetsubstituteError> {
    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptSetsubstituteError::MissingAttackerRole)?;
    let attacker_index = attacker.index();
    let attacker_state = rules.battlers[attacker_index];
    let quarter_max_hp = battle_script_setsubstitute_quarter_max_hp(attacker_state.max_hp);

    let mut next = *rules;
    if attacker_state.hp <= quarter_max_hp {
        next.battle_move_damage = 0;
        next.multistring_chooser = BATTLE_SCRIPT_B_MSG_SUBSTITUTE_FAILED;
    } else {
        next.battlers[attacker_index].status2 = (attacker_state.status2
            | BATTLE_SCRIPT_STATUS2_SUBSTITUTE)
            & !BATTLE_SCRIPT_STATUS2_WRAPPED_MASK;
        next.battlers[attacker_index].substitute_hp = quarter_max_hp;
        next.battle_move_damage = i32::from(quarter_max_hp);
        next.multistring_chooser = BATTLE_SCRIPT_B_MSG_SET_SUBSTITUTE;
        next.hit_marker |= BATTLE_SCRIPT_HITMARKER_IGNORE_SUBSTITUTE;
    }

    Ok(BattleScriptSetsubstituteOutcome {
        rules: next,
        control: BattleScriptSetsubstituteControl::Advance,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    const BATTLER: BattleScriptSetsubstituteBattlerState = BattleScriptSetsubstituteBattlerState {
        side: 0,
        ability: 0,
        hp: 26,
        max_hp: 100,
        moves: [164, 0, 0, 0],
        pp: [10, 0, 0, 0],
        status1: 0,
        status2: BATTLE_SCRIPT_STATUS2_WRAPPED_MASK,
        status3: 0,
        substitute_hp: 9,
        rollout_timer: 0,
        fury_cutter_counter: 0,
        truant_counter: 0,
        recharge_timer: 0,
        flinch_immobility: 0,
        disabled_move: 0,
        used_disabled_move: 0,
        taunt_timer: 0,
        used_taunted_move: 0,
        used_imprisoned_move: 0,
        item: 0,
        stat_stages: [6; 8],
        party_index: 0,
        speed: 50,
    };

    const SIBLINGS: BattleScriptSetsubstituteSiblings = BattleScriptSetsubstituteSiblings {
        scripting_battler: BattleScriptSetsubstituteBattler::Battler0,
        battler_with_ability: BattleScriptSetsubstituteBattler::Battler1,
        atk_canceler_tracker: 2,
        battle_outcome: 3,
        current_move: 164,
        current_move_effect: 96,
        current_move_power: 0,
        current_move_position: 0,
        move_result_flags: 0x8000_0020,
        dmg_multiplier: 3,
        crit_multiplier: 2,
        move_effect_byte: 0x7f,
        miss_type: 4,
        multi_hit_counter: 5,
        multi_hit_string_counter: 6,
        dynamic_base_power: 7,
        hp_dealt: -8,
        locked_moves: [9, 10, 11, 12],
        bide_dmg: [-13, 14, -15, 16],
        side_statuses: [0x0100_0001, 0x8000_0002],
        weather: 0x4000_0003,
        weather_timer: 4,
    };

    const fn rules(
        attacker: Option<BattleScriptSetsubstituteBattler>,
    ) -> BattleScriptSetsubstituteRules {
        BattleScriptSetsubstituteRules {
            battlers: [BATTLER; BATTLE_SCRIPT_SETSUBSTITUTE_BATTLER_COUNT],
            selector_roles: BattleScriptSetsubstituteRoles {
                attacker,
                target: Some(BattleScriptSetsubstituteBattler::Battler1),
                effect_battler: Some(BattleScriptSetsubstituteBattler::Battler2),
                fainted: Some(BattleScriptSetsubstituteBattler::Battler3),
            },
            battle_move_damage: -77,
            multistring_chooser: 0xee,
            hit_marker: 0x8000_0001,
            siblings: SIBLINGS,
        }
    }

    #[test]
    fn success_sets_only_attacker_durable_fields_and_later_hp_debit_is_not_owned() {
        let input = rules(Some(BattleScriptSetsubstituteBattler::Battler2));
        let outcome = apply_battle_script_setsubstitute(&input).expect("attacker exists");
        assert_eq!(outcome.control, BattleScriptSetsubstituteControl::Advance);
        assert_eq!(outcome.rules.battlers[2].hp, 26);
        assert_eq!(
            outcome.rules.battlers[2].status2,
            BATTLE_SCRIPT_STATUS2_SUBSTITUTE
        );
        assert_eq!(outcome.rules.battlers[2].substitute_hp, 25);
        assert_eq!(outcome.rules.battle_move_damage, 25);
        assert_eq!(
            outcome.rules.multistring_chooser,
            BATTLE_SCRIPT_B_MSG_SET_SUBSTITUTE
        );
        assert_eq!(
            outcome.rules.hit_marker,
            input.hit_marker | BATTLE_SCRIPT_HITMARKER_IGNORE_SUBSTITUTE
        );
        assert_eq!(outcome.rules.battlers[0], input.battlers[0]);
        assert_eq!(outcome.rules.battlers[1], input.battlers[1]);
        assert_eq!(outcome.rules.battlers[3], input.battlers[3]);
        assert_eq!(outcome.rules.selector_roles, input.selector_roles);
        assert_eq!(outcome.rules.siblings, input.siblings);
        assert_eq!(
            input,
            rules(Some(BattleScriptSetsubstituteBattler::Battler2))
        );
    }

    #[test]
    fn failure_is_strict_at_the_quarter_boundary() {
        let mut input = rules(Some(BattleScriptSetsubstituteBattler::Battler0));
        input.battlers[0].hp = 25;
        let outcome = apply_battle_script_setsubstitute(&input).expect("attacker exists");
        assert_eq!(outcome.rules.battlers, input.battlers);
        assert_eq!(outcome.rules.hit_marker, input.hit_marker);
        assert_eq!(outcome.rules.siblings, input.siblings);
        assert_eq!(outcome.rules.battle_move_damage, 0);
        assert_eq!(
            outcome.rules.multistring_chooser,
            BATTLE_SCRIPT_B_MSG_SUBSTITUTE_FAILED
        );
    }

    #[test]
    fn missing_attacker_precedes_every_battler_read() {
        let mut input = rules(None);
        input.battlers[0].max_hp = 0;
        input.battlers[0].hp = u16::MAX;
        let before = input;
        assert_eq!(
            apply_battle_script_setsubstitute(&input)
                .expect_err("missing attacker must fail first")
                .to_string(),
            "Cmd_setsubstitute requires an attacker role"
        );
        assert_eq!(input, before);
    }

    #[test]
    fn factory_checks_only_name_cardinality() {
        let permissive = BattleScriptSetsubstituteInstruction {
            opcode_name: BATTLE_SCRIPT_SETSUBSTITUTE_OPCODE_NAME,
            program_counter: 123,
            opcode_id: 0,
            dispatcher: "not_checked",
            operand_count: usize::MAX,
        };
        assert_eq!(
            register_battle_script_setsubstitute_handler(&[permissive]),
            Ok(BattleScriptSetsubstituteRegistration { opcode_id: 0 })
        );
        assert_eq!(
            register_battle_script_setsubstitute_handler(&[])
                .expect_err("zero matching instructions must fail")
                .to_string(),
            "committed Battle Script program must emit one B_SCR_OP_SETSUBSTITUTE, found 0"
        );
    }
}
