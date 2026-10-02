//! Pure `B_SCR_OP_TRYSETREST` registration, state, and control leaf.
//!
//! This is the deliberately narrow native twin of
//! `src/engine/battleScriptTrysetrestOpcode.ts`. `Cmd_trysetrest` is
//! `BattleScript_EffectRest`'s single mechanical opcode: it unconditionally
//! reassigns the target role to the attacker and writes
//! `battleMoveDamage = -attacker.maxHP` before ever checking HP -- both
//! writes land even on the fail branch, matching source exactly even though
//! the fail path never reads either back. A full-HP attacker takes the
//! late-resolved operand's fail jump with no further writes; otherwise the
//! message chooser is picked from whether any non-sleep status1 bit is set,
//! status1 is unconditionally REPLACED (not OR'd) with `STATUS1_SLEEP_TURN(3)`
//! -- curing any pre-existing non-sleep status in the same write -- synced to
//! the party mirror, and a single `set-battler-status-data` event mirrors the
//! real `BtlController_EmitSetMonData(REQUEST_STATUS_BATTLE)` call.
//!
//! Source authority:
//! - `Cmd_trysetrest` is `reference/pokeemerald/src/battle_script_commands.c:6762-6784`;
//!   dispatch `:460` (`//0x81`), forward declaration `:208`.
//! - The five-byte macro is `asm/macros/battle_script.inc:711-714`.
//! - The sole concrete call site is `BattleScript_EffectRest`
//!   (`data/battle_scripts_1.s:735,741`, `trysetrest BattleScript_AlreadyAtFullHp`).
//! - `STATUS1_SLEEP`/`STATUS1_SLEEP_TURN` are `include/constants/battle.h:115-116`.
//! - `B_MSG_REST`/`B_MSG_REST_STATUSED` are `include/constants/battle_string_ids.h:467-468`.
//! - `B_SCR_OP_TRYSETREST` is `include/constants/battle_script_commands.h:135`.
//!
//! This leaf deliberately owns neither a generic machine, scheduler/event
//! transport, RNG advancement, presentation, nor the WASM ABI.

use core::fmt;

/// Source `MAX_BATTLERS_COUNT`; all source-indexed state retains four cells.
pub const BATTLE_SCRIPT_TRYSETREST_BATTLER_COUNT: usize = 4;
/// Source party size mirrored per side.
pub const BATTLE_SCRIPT_TRYSETREST_PARTY_SIZE: usize = 6;
/// `B_SCR_OP_TRYSETREST` in the source command enum / dispatch table.
pub const BATTLE_SCRIPT_TRYSETREST_OPCODE: u8 = 0x81;
/// Concrete opcode name selected by canonical registration.
pub const BATTLE_SCRIPT_TRYSETREST_OPCODE_NAME: &str = "B_SCR_OP_TRYSETREST";
/// Source dispatch-table handler identity.
pub const BATTLE_SCRIPT_TRYSETREST_DISPATCHER: &str = "Cmd_trysetrest";
/// The single source macro operand is a four-byte script pointer.
pub const BATTLE_SCRIPT_TRYSETREST_POINTER_WIDTH_BYTES: u8 = 4;
/// The source macro's encoded byte width (opcode + 4-byte pointer).
pub const BATTLE_SCRIPT_TRYSETREST_ENCODED_WIDTH_BYTES: u8 = 5;
/// `include/constants/battle.h:115` -- low 3 bits double as the sleep-turn counter.
pub const BATTLE_SCRIPT_TRYSETREST_STATUS1_SLEEP: u32 = 0x0000_0007;
/// `STATUS1_SLEEP_TURN(3)`.
pub const BATTLE_SCRIPT_TRYSETREST_STATUS1_SLEEP_TURN_3: u32 = 3;
/// `include/constants/battle_string_ids.h:467`.
pub const BATTLE_SCRIPT_TRYSETREST_B_MSG_REST: u8 = 0;
/// `include/constants/battle_string_ids.h:468`.
pub const BATTLE_SCRIPT_TRYSETREST_B_MSG_REST_STATUSED: u8 = 1;

/// Complete source battler-id domain used by roles and source-indexed arrays.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptTrysetrestBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

/// Fixed source battler domain, including inactive cells in singles.
pub const BATTLE_SCRIPT_TRYSETREST_BATTLERS: [BattleScriptTrysetrestBattler;
    BATTLE_SCRIPT_TRYSETREST_BATTLER_COUNT] = [
    BattleScriptTrysetrestBattler::Battler0,
    BattleScriptTrysetrestBattler::Battler1,
    BattleScriptTrysetrestBattler::Battler2,
    BattleScriptTrysetrestBattler::Battler3,
];

impl BattleScriptTrysetrestBattler {
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

    #[must_use]
    pub const fn from_u8(value: u8) -> Option<Self> {
        match value {
            0 => Some(Self::Battler0),
            1 => Some(Self::Battler1),
            2 => Some(Self::Battler2),
            3 => Some(Self::Battler3),
            _ => None,
        }
    }
}

/// Source battler side, used to index the party mirror.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptTrysetrestSide {
    Player = 0,
    Opponent = 1,
}

impl BattleScriptTrysetrestSide {
    #[must_use]
    pub const fn index(self) -> usize {
        self as usize
    }
}

/// The complete per-battler projection read or written by this opcode.
/// `ability`/`item` are salted noise that must survive every branch
/// untouched, proving the command's narrow ownership boundary.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetrestBattlerState {
    pub hp: u16,
    pub max_hp: u16,
    pub status1: u32,
    pub side: BattleScriptTrysetrestSide,
    pub party_index: u8,
    pub ability: u8,
    pub item: u16,
}

/// Canonical selector bindings. `target` is an OUTPUT of this command:
/// every branch unconditionally reassigns it to the attacker.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetrestRoles {
    pub attacker: Option<BattleScriptTrysetrestBattler>,
    pub target: Option<BattleScriptTrysetrestBattler>,
}

/// One party-mirror cell. `noise` is a salted field that must survive every
/// branch untouched, including the identity-no-op case where `status1` is
/// rewritten to the same value it already held.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetrestPartyMember {
    pub status1: u32,
    pub noise: u32,
}

/// Complete narrow rules slice read or written by this command.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetrestRules {
    pub battlers: [BattleScriptTrysetrestBattlerState; BATTLE_SCRIPT_TRYSETREST_BATTLER_COUNT],
    pub selector_roles: BattleScriptTrysetrestRoles,
    /// `[side][partyIndex]`, mirroring `party.player`/`party.opponent`.
    pub party: [[BattleScriptTrysetrestPartyMember; BATTLE_SCRIPT_TRYSETREST_PARTY_SIZE]; 2],
    /// Source `s32 gBattleMoveDamage`, written unconditionally on every branch.
    pub battle_move_damage: i32,
    /// Source `gBattleCommunication[MULTISTRING_CHOOSER]`, written only on
    /// the success (non-full-HP) branch.
    pub multistring_chooser: u8,
}

/// One source-macro operand retained for late label resolution.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetrestOperand<'a> {
    pub width_bytes: u8,
    pub expression: &'a str,
}

/// A resolved source jump label.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetrestResolvedLabel<'a> {
    pub expression: &'a str,
    pub program_counter: u32,
}

/// Instruction projection used for both registration and execution.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetrestInstruction<'a> {
    pub opcode_name: &'a str,
    pub program_counter: u32,
    pub opcode_id: u8,
    pub dispatcher: &'a str,
    /// Canonical TypeScript reads `instruction.operands[0]` with no shape
    /// validation, so this stays a slice rather than a fixed single field --
    /// a missing operand is a TS runtime crash the differential corpus never
    /// exercises (see `BattleScriptTrysetrestError::MissingOperand`, covered
    /// only by a direct Rust unit test).
    pub operands: &'a [BattleScriptTrysetrestOperand<'a>],
    /// Late label resolution is a scheduler/program concern this leaf does
    /// not own; the caller resolves the operand's expression and reports the
    /// result here, exactly like the canonical TypeScript factory's own
    /// `resolveBattleScriptLabel` call inside the handler. Resolution is
    /// consulted only on the full-HP jump branch.
    pub resolved_jump_target: Option<BattleScriptTrysetrestResolvedLabel<'a>>,
}

/// The one dynamic opcode key emitted by successful registration.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetrestRegistration {
    pub opcode_id: u8,
}

/// Exact canonical registration failure. The TypeScript factory only
/// requires at least one `B_SCR_OP_TRYSETREST` instruction to exist -- it
/// performs no opcode-id/dispatcher/operand-shape validation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTrysetrestRegistrationError {
    NotFound,
}

impl fmt::Display for BattleScriptTrysetrestRegistrationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::NotFound => write!(
                formatter,
                "committed Battle Script program does not emit B_SCR_OP_TRYSETREST"
            ),
        }
    }
}

impl std::error::Error for BattleScriptTrysetrestRegistrationError {}

/// Native projection of `createBattleScriptTrysetrestOpcodeHandlers`. Binds
/// the first instruction whose `opcodeName` matches; errors only when none
/// exists. No count or shape validation is performed, matching the
/// canonical TypeScript factory exactly.
pub fn register_battle_script_trysetrest_handler(
    instructions: &[BattleScriptTrysetrestInstruction<'_>],
) -> Result<BattleScriptTrysetrestRegistration, BattleScriptTrysetrestRegistrationError> {
    instructions
        .iter()
        .find(|instruction| instruction.opcode_name == BATTLE_SCRIPT_TRYSETREST_OPCODE_NAME)
        .map(|instruction| BattleScriptTrysetrestRegistration { opcode_id: instruction.opcode_id })
        .ok_or(BattleScriptTrysetrestRegistrationError::NotFound)
}

/// Exact control directive emitted by the narrow opcode leaf.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTrysetrestControl {
    Advance,
    Jump { program_counter: u32 },
}

/// One emitted controller event, mirroring `BtlController_EmitSetMonData`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTrysetrestEvent {
    SetBattlerStatusData {
        battler: BattleScriptTrysetrestBattler,
        status1: u32,
    },
}

/// Complete immutable result of one successful handler application.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetrestOutcome {
    pub rules: BattleScriptTrysetrestRules,
    pub control: BattleScriptTrysetrestControl,
    pub emitted_event: Option<BattleScriptTrysetrestEvent>,
}

/// Exact observable per-execution errors in canonical evaluation order.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTrysetrestError<'a> {
    MissingAttackerRole,
    /// Not TS-differentially realizable from the committed program (the sole
    /// concrete call site always supplies its pointer operand); covered by a
    /// direct Rust unit test only, mirroring the canonical handler's
    /// `instruction.operands[0]!.expression` TS runtime crash on an absent
    /// operand.
    MissingOperand,
    UnresolvedJumpTarget {
        expression: &'a str,
    },
}

impl fmt::Display for BattleScriptTrysetrestError<'_> {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::MissingAttackerRole => {
                write!(formatter, "Cmd_trysetrest requires an attacker role")
            }
            Self::MissingOperand => write!(
                formatter,
                "Cmd_trysetrest: instruction is missing its jump-target operand"
            ),
            Self::UnresolvedJumpTarget { expression } => {
                write!(
                    formatter,
                    "Cmd_trysetrest: unresolved jump target {expression}"
                )
            }
        }
    }
}

impl std::error::Error for BattleScriptTrysetrestError<'_> {}

/// Native immutable-value twin of canonical `Cmd_trysetrest`.
///
/// Evaluation order matches the canonical handler exactly: the attacker role
/// is required first; `selectorRoles.target` is then unconditionally
/// reassigned to the attacker and `battleMoveDamage` unconditionally set to
/// `-maxHP` -- both survive on the fail branch even though source never
/// reads them back there. Only then is full HP checked: on a full-HP
/// attacker the operand's jump target is resolved (late resolution) and the
/// outcome jumps with no further writes; otherwise the message chooser is
/// derived from any non-sleep status1 bit, status1 is replaced with
/// `STATUS1_SLEEP_TURN(3)`, the party mirror is synced, and one
/// `SetBattlerStatusData` event is emitted before advancing.
pub fn apply_battle_script_trysetrest<'a>(
    instruction: BattleScriptTrysetrestInstruction<'a>,
    rules: &BattleScriptTrysetrestRules,
) -> Result<BattleScriptTrysetrestOutcome, BattleScriptTrysetrestError<'a>> {
    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptTrysetrestError::MissingAttackerRole)?;
    let attacker_state = rules.battlers[attacker.index()];

    let mut base_rules = *rules;
    base_rules.selector_roles.target = Some(attacker);
    base_rules.battle_move_damage = -i32::from(attacker_state.max_hp);

    if attacker_state.hp == attacker_state.max_hp {
        let operand = instruction
            .operands
            .first()
            .ok_or(BattleScriptTrysetrestError::MissingOperand)?;
        let resolved = instruction.resolved_jump_target.ok_or(
            BattleScriptTrysetrestError::UnresolvedJumpTarget { expression: operand.expression },
        )?;
        return Ok(BattleScriptTrysetrestOutcome {
            rules: base_rules,
            control: BattleScriptTrysetrestControl::Jump {
                program_counter: resolved.program_counter,
            },
            emitted_event: None,
        });
    }

    let multistring_chooser =
        if attacker_state.status1 & !BATTLE_SCRIPT_TRYSETREST_STATUS1_SLEEP != 0 {
            BATTLE_SCRIPT_TRYSETREST_B_MSG_REST_STATUSED
        } else {
            BATTLE_SCRIPT_TRYSETREST_B_MSG_REST
        };

    let mut next_rules = base_rules;
    next_rules.battlers[attacker.index()].status1 = BATTLE_SCRIPT_TRYSETREST_STATUS1_SLEEP_TURN_3;
    next_rules.multistring_chooser = multistring_chooser;
    next_rules.party[attacker_state.side.index()][usize::from(attacker_state.party_index)]
        .status1 = BATTLE_SCRIPT_TRYSETREST_STATUS1_SLEEP_TURN_3;

    Ok(BattleScriptTrysetrestOutcome {
        rules: next_rules,
        control: BattleScriptTrysetrestControl::Advance,
        emitted_event: Some(BattleScriptTrysetrestEvent::SetBattlerStatusData {
            battler: attacker,
            status1: BATTLE_SCRIPT_TRYSETREST_STATUS1_SLEEP_TURN_3,
        }),
    })
}

/// Independent source, dispatch, and body evidence.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetrestDecompDispatchEvidence {
    pub opcode_name: &'static str,
    pub opcode_id: u8,
    pub dispatcher: &'static str,
    pub dispatch_line: u32,
    pub forward_decl_line: u32,
    pub handler_line: u32,
    pub role_collapse_line: u32,
    pub damage_line: u32,
    pub hp_check_line: u32,
    pub jump_line: u32,
    pub chooser_statused_line: u32,
    pub chooser_rest_line: u32,
    pub status_write_line: u32,
    pub emit_line: u32,
    pub advance_line: u32,
}

pub const BATTLE_SCRIPT_TRYSETREST_DECOMP_DISPATCH_EVIDENCE:
    BattleScriptTrysetrestDecompDispatchEvidence = BattleScriptTrysetrestDecompDispatchEvidence {
    opcode_name: BATTLE_SCRIPT_TRYSETREST_OPCODE_NAME,
    opcode_id: BATTLE_SCRIPT_TRYSETREST_OPCODE,
    dispatcher: BATTLE_SCRIPT_TRYSETREST_DISPATCHER,
    dispatch_line: 460,
    forward_decl_line: 208,
    handler_line: 6762,
    role_collapse_line: 6765,
    damage_line: 6766,
    hp_check_line: 6768,
    jump_line: 6770,
    chooser_statused_line: 6775,
    chooser_rest_line: 6777,
    status_write_line: 6779,
    emit_line: 6780,
    advance_line: 6782,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetrestMacroEvidence {
    pub declaration_line: u32,
    pub opcode_line: u32,
    pub pointer_line: u32,
    pub encoded_width_bytes: u8,
}

pub const BATTLE_SCRIPT_TRYSETREST_MACRO_EVIDENCE: BattleScriptTrysetrestMacroEvidence =
    BattleScriptTrysetrestMacroEvidence {
        declaration_line: 711,
        opcode_line: 712,
        pointer_line: 713,
        encoded_width_bytes: BATTLE_SCRIPT_TRYSETREST_ENCODED_WIDTH_BYTES,
    };

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetrestCallSiteEvidence {
    pub entry_label: &'static str,
    pub entry_label_line: u32,
    pub statement_line: u32,
    pub target_expression: &'static str,
}

pub const BATTLE_SCRIPT_TRYSETREST_CALL_SITE_EVIDENCE: BattleScriptTrysetrestCallSiteEvidence =
    BattleScriptTrysetrestCallSiteEvidence {
        entry_label: "BattleScript_EffectRest",
        entry_label_line: 735,
        statement_line: 741,
        target_expression: "BattleScript_AlreadyAtFullHp",
    };

#[cfg(test)]
mod tests {
    use super::*;

    const NOOP_OPERANDS: [BattleScriptTrysetrestOperand<'static>; 1] =
        [BattleScriptTrysetrestOperand {
            width_bytes: 4,
            expression: "BattleScript_AlreadyAtFullHp",
        }];

    const RESOLVED: BattleScriptTrysetrestResolvedLabel<'static> =
        BattleScriptTrysetrestResolvedLabel {
            expression: "BattleScript_AlreadyAtFullHp",
            program_counter: 999,
        };

    fn battler(
        hp: u16,
        max_hp: u16,
        status1: u32,
        side: BattleScriptTrysetrestSide,
        party_index: u8,
    ) -> BattleScriptTrysetrestBattlerState {
        BattleScriptTrysetrestBattlerState {
            hp,
            max_hp,
            status1,
            side,
            party_index,
            ability: 5,
            item: 77,
        }
    }

    fn rules(
        battlers: [BattleScriptTrysetrestBattlerState; 4],
        attacker: Option<BattleScriptTrysetrestBattler>,
        target: Option<BattleScriptTrysetrestBattler>,
    ) -> BattleScriptTrysetrestRules {
        let member = BattleScriptTrysetrestPartyMember { status1: 0, noise: 0xabcd };
        BattleScriptTrysetrestRules {
            battlers,
            selector_roles: BattleScriptTrysetrestRoles { attacker, target },
            party: [[member; 6], [member; 6]],
            battle_move_damage: i32::MIN,
            multistring_chooser: 0xff,
        }
    }

    fn instruction(
        operands: &'static [BattleScriptTrysetrestOperand<'static>],
        resolved_jump_target: Option<BattleScriptTrysetrestResolvedLabel<'static>>,
    ) -> BattleScriptTrysetrestInstruction<'static> {
        BattleScriptTrysetrestInstruction {
            opcode_name: BATTLE_SCRIPT_TRYSETREST_OPCODE_NAME,
            program_counter: 741,
            opcode_id: BATTLE_SCRIPT_TRYSETREST_OPCODE,
            dispatcher: BATTLE_SCRIPT_TRYSETREST_DISPATCHER,
            operands,
            resolved_jump_target,
        }
    }

    fn default_battlers() -> [BattleScriptTrysetrestBattlerState; 4] {
        [
            battler(70, 140, 0, BattleScriptTrysetrestSide::Player, 0),
            battler(0, 0, 0, BattleScriptTrysetrestSide::Player, 0),
            battler(0, 0, 0, BattleScriptTrysetrestSide::Player, 0),
            battler(0, 0, 0, BattleScriptTrysetrestSide::Player, 0),
        ]
    }

    #[test]
    fn chooser_boundary_masks_the_sleep_counter_bits() {
        // A pure sleep counter (1..=7) alone must NOT trip the "statused"
        // chooser: `status1 & ~STATUS1_SLEEP` must mask out all three low bits.
        for sleep_counter in 1u32..=7 {
            let mut battlers = default_battlers();
            battlers[0].status1 = sleep_counter;
            let input = rules(
                battlers,
                Some(BattleScriptTrysetrestBattler::Battler0),
                None,
            );
            let outcome = apply_battle_script_trysetrest(instruction(&NOOP_OPERANDS, None), &input)
                .expect("non-full HP advances");
            assert_eq!(
                outcome.rules.multistring_chooser, BATTLE_SCRIPT_TRYSETREST_B_MSG_REST,
                "sleep counter {sleep_counter} incorrectly tripped B_MSG_REST_STATUSED"
            );
        }
        // Any bit outside the low 3 must trip the statused chooser, even
        // combined with a nonzero sleep counter.
        for status1 in [0x08u32, 0x10, 0x40, 0x80, 0x20, 0x08 | 0x05] {
            let mut battlers = default_battlers();
            battlers[0].status1 = status1;
            let input = rules(
                battlers,
                Some(BattleScriptTrysetrestBattler::Battler0),
                None,
            );
            let outcome = apply_battle_script_trysetrest(instruction(&NOOP_OPERANDS, None), &input)
                .expect("non-full HP advances");
            assert_eq!(
                outcome.rules.multistring_chooser, BATTLE_SCRIPT_TRYSETREST_B_MSG_REST_STATUSED,
                "status1 {status1:#x} did not trip B_MSG_REST_STATUSED"
            );
        }
    }

    #[test]
    fn status_write_replaces_rather_than_ors_prior_status() {
        let mut battlers = default_battlers();
        battlers[0].status1 = 0x10; // burn
        let input = rules(
            battlers,
            Some(BattleScriptTrysetrestBattler::Battler0),
            None,
        );
        let outcome = apply_battle_script_trysetrest(instruction(&NOOP_OPERANDS, None), &input)
            .expect("non-full HP advances");
        assert_eq!(
            outcome.rules.battlers[0].status1,
            BATTLE_SCRIPT_TRYSETREST_STATUS1_SLEEP_TURN_3
        );
        assert_eq!(
            outcome.rules.battlers[0].status1 & 0x10,
            0,
            "burn bit must be cured, not preserved"
        );
    }

    #[test]
    fn role_and_damage_writes_are_unconditional_on_the_fail_branch() {
        let mut battlers = default_battlers();
        battlers[0].hp = 140;
        battlers[0].max_hp = 140;
        battlers[0].status1 = 0x99; // must survive untouched on the fail branch
        let input = rules(
            battlers,
            Some(BattleScriptTrysetrestBattler::Battler0),
            Some(BattleScriptTrysetrestBattler::Battler2),
        );
        let outcome =
            apply_battle_script_trysetrest(instruction(&NOOP_OPERANDS, Some(RESOLVED)), &input)
                .expect("full HP jumps");
        assert_eq!(
            outcome.control,
            BattleScriptTrysetrestControl::Jump { program_counter: 999 }
        );
        assert_eq!(
            outcome.rules.selector_roles.target,
            Some(BattleScriptTrysetrestBattler::Battler0)
        );
        assert_eq!(outcome.rules.battle_move_damage, -140);
        assert_eq!(
            outcome.rules.battlers[0].status1, 0x99,
            "fail branch must not touch status1"
        );
        assert_eq!(
            outcome.rules.multistring_chooser, input.multistring_chooser,
            "chooser unchanged on fail"
        );
        assert_eq!(
            outcome.rules.party, input.party,
            "no party write on fail branch"
        );
        assert_eq!(outcome.emitted_event, None, "no event on fail branch");

        // Also prove the reassignment even when target started as None.
        let none_target = rules(
            default_battlers(),
            Some(BattleScriptTrysetrestBattler::Battler1),
            None,
        );
        let mut full_hp = none_target;
        full_hp.battlers[1].hp = full_hp.battlers[1].max_hp;
        let jumped =
            apply_battle_script_trysetrest(instruction(&NOOP_OPERANDS, Some(RESOLVED)), &full_hp)
                .expect("full HP jumps with no prior target");
        assert_eq!(
            jumped.rules.selector_roles.target,
            Some(BattleScriptTrysetrestBattler::Battler1)
        );
    }

    #[test]
    fn lazy_label_resolution_only_bites_on_the_fail_branch() {
        let mut battlers = default_battlers();
        battlers[0].hp = 40; // not full HP: resolution is never consulted
        let advancing = rules(
            battlers,
            Some(BattleScriptTrysetrestBattler::Battler0),
            None,
        );
        assert!(
            apply_battle_script_trysetrest(instruction(&NOOP_OPERANDS, None), &advancing).is_ok()
        );

        let mut full = default_battlers();
        full[0].hp = full[0].max_hp;
        let failing = rules(full, Some(BattleScriptTrysetrestBattler::Battler0), None);
        assert_eq!(
            apply_battle_script_trysetrest(instruction(&NOOP_OPERANDS, None), &failing)
                .expect_err("unresolved pointer on fail branch")
                .to_string(),
            "Cmd_trysetrest: unresolved jump target BattleScript_AlreadyAtFullHp"
        );
    }

    #[test]
    fn missing_attacker_role_is_the_first_check() {
        let input = rules(
            default_battlers(),
            None,
            Some(BattleScriptTrysetrestBattler::Battler2),
        );
        assert_eq!(
            apply_battle_script_trysetrest(instruction(&NOOP_OPERANDS, None), &input)
                .expect_err("attacker required")
                .to_string(),
            "Cmd_trysetrest requires an attacker role"
        );
    }

    #[test]
    fn missing_operand_is_not_ts_differentially_realizable_but_typed_here() {
        let mut full = default_battlers();
        full[0].hp = full[0].max_hp;
        let input = rules(full, Some(BattleScriptTrysetrestBattler::Battler0), None);
        assert_eq!(
            apply_battle_script_trysetrest(instruction(&[], None), &input)
                .expect_err("missing operand")
                .to_string(),
            "Cmd_trysetrest: instruction is missing its jump-target operand"
        );
    }

    #[test]
    fn registration_is_find_first_and_presence_only() {
        let noise = BattleScriptTrysetrestInstruction {
            opcode_name: "B_SCR_OP_RUST_NOISE",
            program_counter: 0,
            opcode_id: 0,
            dispatcher: "Cmd_noise",
            operands: &[],
            resolved_jump_target: None,
        };
        let first = instruction(&NOOP_OPERANDS, None);
        let second =
            BattleScriptTrysetrestInstruction { program_counter: 2000, opcode_id: 0x99, ..first };

        assert_eq!(
            register_battle_script_trysetrest_handler(&[])
                .expect_err("absent")
                .to_string(),
            "committed Battle Script program does not emit B_SCR_OP_TRYSETREST"
        );
        assert_eq!(
            register_battle_script_trysetrest_handler(&[noise, first])
                .expect("single match registers")
                .opcode_id,
            BATTLE_SCRIPT_TRYSETREST_OPCODE
        );
        // Two matches register under the FIRST match's opcode id, even when
        // it differs from the canonical constant -- no opcode-id validation.
        assert_eq!(
            register_battle_script_trysetrest_handler(&[first, second])
                .expect("first of two matches wins")
                .opcode_id,
            BATTLE_SCRIPT_TRYSETREST_OPCODE
        );
        assert_eq!(
            register_battle_script_trysetrest_handler(&[second, first])
                .expect("first of two matches wins, reversed order")
                .opcode_id,
            0x99
        );
    }

    #[test]
    fn battler_ids_round_trip_from_u8() {
        for battler in BATTLE_SCRIPT_TRYSETREST_BATTLERS {
            assert_eq!(
                BattleScriptTrysetrestBattler::from_u8(battler.as_u8()),
                Some(battler)
            );
        }
        assert_eq!(BattleScriptTrysetrestBattler::from_u8(4), None);
    }
}
