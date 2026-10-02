//! Pure `B_SCR_OP_TRYSWAPITEMS` (Trick) registration, state, and control leaf.
//!
//! This is the deliberately narrow native twin of
//! `src/engine/battleScriptTryswapitemsOpcode.ts`, not a generic Battle
//! Script machine. Trick's command owns the active-item exchange, the
//! attacker-owned `changedItems` bookkeeping, both persistent held-item
//! controller writes, both Choice-lock clears, and the swap message-table
//! selector. A later source `MOVEEND_CHANGED_ITEMS` case (not this leaf)
//! restores the attacker's temporarily cleared active item from
//! `changedItems`.
//!
//! Evaluation order matches the canonical handler exactly: per-execution
//! shape check, then attacker role then target role, then in order --
//! Trainer Hill (fail), opponent-in-regular-battle (fail), knocked-off in
//! regular battles (fail), both-items-none/enigma-berry/mail (fail), target
//! Sticky Hold (jump + ability reveal), else the full swap (advance). Every
//! fail branch resolves its failure-pointer operand LAZILY -- only when that
//! branch is actually taken -- exactly like the canonical handler's own
//! `resolveBattleScriptLabel` call.
//!
//! Source authority:
//! - `Cmd_tryswapitems` is `reference/pokeemerald/src/battle_script_commands.c:9189-9273`;
//!   dispatch `:541` (`//0xD2`), forward declaration `:289`.
//! - The five-byte macro is `asm/macros/battle_script.inc:1076-1079`.
//! - The sole concrete call site is `data/battle_scripts_1.s:2337`
//!   (`tryswapitems BattleScript_ButItFailed`, inside
//!   `BattleScript_EffectTrick`), and the sticky-hold jump target label is
//!   `data/battle_scripts_1.s:4173` (`BattleScript_StickyHoldActivates::`).
//! - `include/constants/items.h:139` (`ITEM_ORANGE_MAIL 121`) and `:150`
//!   (`ITEM_RETRO_MAIL 132`); `include/constants/abilities.h:64`
//!   (`ABILITY_STICKY_HOLD 60`).
//! - `include/battle.h:173` (`u8 knockedOffMons[NUM_BATTLE_SIDES]`) and
//!   `:420` (`u16 changedItems[MAX_BATTLERS_COUNT]`).
//! - `include/constants/battle_script_commands.h:216` (`B_SCR_OP_TRYSWAPITEMS`).
//!
//! This leaf deliberately owns neither a generic machine, scheduler/event
//! transport, RNG advancement, presentation, nor the WASM ABI. It does not
//! import `crate::battle_script_ai_reveal`'s rules struct -- the ability
//! reveal's identity-write semantics are mirrored inline over this leaf's own
//! narrow `ai_observed_ability_ids` cell.

use core::fmt;

/// Source `MAX_BATTLERS_COUNT`; all source-indexed state retains four cells.
pub const BATTLE_SCRIPT_TRYSWAPITEMS_BATTLER_COUNT: usize = 4;
/// Source party size; both sides carry six member cells.
pub const BATTLE_SCRIPT_TRYSWAPITEMS_PARTY_SIZE: usize = 6;
/// `B_SCR_OP_TRYSWAPITEMS` in the source command enum / dispatch table.
pub const BATTLE_SCRIPT_TRYSWAPITEMS_OPCODE: u8 = 0xd2;
/// Concrete opcode name selected by canonical registration.
pub const BATTLE_SCRIPT_TRYSWAPITEMS_OPCODE_NAME: &str = "B_SCR_OP_TRYSWAPITEMS";
/// Source dispatch-table handler identity.
pub const BATTLE_SCRIPT_TRYSWAPITEMS_DISPATCHER: &str = "Cmd_tryswapitems";
/// The canonical factory accepts exactly this many concrete starts.
pub const BATTLE_SCRIPT_TRYSWAPITEMS_CONCRETE_START_COUNT: usize = 1;
/// One four-byte failure pointer follows the opcode byte.
pub const BATTLE_SCRIPT_TRYSWAPITEMS_FAILURE_POINTER_WIDTH_BYTES: u8 = 4;
/// The source macro's encoded byte width.
pub const BATTLE_SCRIPT_TRYSWAPITEMS_ENCODED_WIDTH_BYTES: u8 = 5;

/// `include/constants/items.h:4` -- `ITEM_NONE`.
pub const BATTLE_SCRIPT_TRYSWAPITEMS_ITEM_NONE: u16 = 0;
/// `include/constants/items.h:139` -- `ITEM_ORANGE_MAIL`, the first mail id.
pub const BATTLE_SCRIPT_TRYSWAPITEMS_ITEM_ORANGE_MAIL: u16 = 121;
/// `include/constants/items.h:150` -- `ITEM_RETRO_MAIL`, the last mail id.
pub const BATTLE_SCRIPT_TRYSWAPITEMS_ITEM_RETRO_MAIL: u16 = 132;
/// The TS `BATTLE_SCRIPT_ITEM_ENIGMA_BERRY` constant
/// (`battleScriptRulesContext.ts:139`) -- `ITEM_ENIGMA_BERRY`.
pub const BATTLE_SCRIPT_TRYSWAPITEMS_ITEM_ENIGMA_BERRY: u16 = 175;
/// `include/constants/abilities.h:64` -- `ABILITY_STICKY_HOLD`.
pub const BATTLE_SCRIPT_TRYSWAPITEMS_ABILITY_STICKY_HOLD: u8 = 60;
/// The hardcoded (not operand-supplied) jump target on target Sticky Hold.
pub const BATTLE_SCRIPT_TRYSWAPITEMS_STICKY_HOLD_LABEL: &str = "BattleScript_StickyHoldActivates";

const BATTLE_TYPE_LINK: u32 = 1 << 1;
const BATTLE_TYPE_EREADER_TRAINER: u32 = 1 << 11;
const BATTLE_TYPE_BATTLE_TOWER: u32 = 1 << 8;
const BATTLE_TYPE_DOME: u32 = 1 << 16;
const BATTLE_TYPE_PALACE: u32 = 1 << 17;
const BATTLE_TYPE_ARENA: u32 = 1 << 18;
const BATTLE_TYPE_FACTORY: u32 = 1 << 19;
const BATTLE_TYPE_PIKE: u32 = 1 << 20;
const BATTLE_TYPE_PYRAMID: u32 = 1 << 21;
const BATTLE_TYPE_RECORDED_LINK: u32 = 1 << 25;
/// `include/constants/battle.h` -- `BATTLE_TYPE_TRAINER_HILL`.
pub const BATTLE_SCRIPT_TRYSWAPITEMS_BATTLE_TYPE_TRAINER_HILL: u32 = 1 << 26;
const BATTLE_TYPE_SECRET_BASE: u32 = 1 << 27;
const BATTLE_TYPE_FRONTIER: u32 = BATTLE_TYPE_BATTLE_TOWER
    | BATTLE_TYPE_DOME
    | BATTLE_TYPE_PALACE
    | BATTLE_TYPE_ARENA
    | BATTLE_TYPE_FACTORY
    | BATTLE_TYPE_PIKE
    | BATTLE_TYPE_PYRAMID;
/// Flag union under which the opponent-in-regular-battle guard and the
/// knocked-off guard are both bypassed.
pub const BATTLE_SCRIPT_TRYSWAPITEMS_ALLOWED_SPECIAL_BATTLES: u32 = BATTLE_TYPE_LINK
    | BATTLE_TYPE_EREADER_TRAINER
    | BATTLE_TYPE_FRONTIER
    | BATTLE_TYPE_SECRET_BASE
    | BATTLE_TYPE_RECORDED_LINK;

const B_MSG_ITEM_SWAP_TAKEN: u8 = 0;
const B_MSG_ITEM_SWAP_GIVEN: u8 = 1;
const B_MSG_ITEM_SWAP_BOTH: u8 = 2;

#[must_use]
const fn is_mail(item: u16) -> bool {
    item >= BATTLE_SCRIPT_TRYSWAPITEMS_ITEM_ORANGE_MAIL
        && item <= BATTLE_SCRIPT_TRYSWAPITEMS_ITEM_RETRO_MAIL
}

/// Complete source battler-id domain used by roles and source-indexed arrays.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptTryswapitemsBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

/// Fixed source battler domain, including inactive cells in singles.
pub const BATTLE_SCRIPT_TRYSWAPITEMS_BATTLERS: [BattleScriptTryswapitemsBattler;
    BATTLE_SCRIPT_TRYSWAPITEMS_BATTLER_COUNT] = [
    BattleScriptTryswapitemsBattler::Battler0,
    BattleScriptTryswapitemsBattler::Battler1,
    BattleScriptTryswapitemsBattler::Battler2,
    BattleScriptTryswapitemsBattler::Battler3,
];

impl BattleScriptTryswapitemsBattler {
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

/// Source battle side, indexing the two persistent party arrays and the
/// per-side `knockedOffMons` mask.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptTryswapitemsSide {
    Player = 0,
    Opponent = 1,
}

impl BattleScriptTryswapitemsSide {
    /// Zero-based source-array index.
    #[must_use]
    pub const fn index(self) -> usize {
        self as usize
    }
}

/// The complete per-battler projection read or written by this opcode.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryswapitemsBattlerState {
    pub side: BattleScriptTryswapitemsSide,
    pub party_index: u8,
    pub item: u16,
    pub ability: u8,
    /// Salted noise sibling this command never reads or writes.
    pub marker: u32,
}

/// One persistent party member's projection. `noise` is a salted sibling
/// this command never reads or writes; only `item` participates.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryswapitemsPartyMember {
    pub item: u16,
    pub noise: u32,
}

/// Canonical selector bindings. Both are required.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryswapitemsRoles {
    pub attacker: Option<BattleScriptTryswapitemsBattler>,
    pub target: Option<BattleScriptTryswapitemsBattler>,
}

/// Complete narrow rules slice read or written by this command.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryswapitemsRules {
    pub battlers: [BattleScriptTryswapitemsBattlerState; BATTLE_SCRIPT_TRYSWAPITEMS_BATTLER_COUNT],
    pub party: [[BattleScriptTryswapitemsPartyMember; BATTLE_SCRIPT_TRYSWAPITEMS_PARTY_SIZE]; 2],
    pub selector_roles: BattleScriptTryswapitemsRoles,
    pub battle_type_flags: u32,
    /// Source `gWishFutureKnock.knockedOffMons[NUM_BATTLE_SIDES]`, one
    /// six-party-slot bitmask per side.
    pub knocked_off_mons: [u8; 2],
    /// Source `gBattleStruct->changedItems[MAX_BATTLERS_COUNT]`.
    pub changed_items: [u16; BATTLE_SCRIPT_TRYSWAPITEMS_BATTLER_COUNT],
    /// Source `gBattleStruct->choicedMove[MAX_BATTLERS_COUNT]`.
    pub choiced_move: [u16; BATTLE_SCRIPT_TRYSWAPITEMS_BATTLER_COUNT],
    pub last_used_ability: u8,
    /// Narrow inline twin of `aiObservedAbilityIds`'s identity-write
    /// convention (`src/engine/battleScriptAiReveal.ts:10-24`), read/written
    /// only on the Sticky Hold branch.
    pub ai_observed_ability_ids: [u8; BATTLE_SCRIPT_TRYSWAPITEMS_BATTLER_COUNT],
    pub multistring_chooser: u8,
    pub battle_text_buff1_item: Option<u16>,
    pub battle_text_buff2_item: Option<u16>,
}

/// Scheduler projection carrying only the unique pending-controller list this
/// command appends to on success. Shape copied from `battle_script_tryrecycleitem`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryswapitemsScheduler {
    pub pending_controller_battlers:
        [Option<BattleScriptTryswapitemsBattler>; BATTLE_SCRIPT_TRYSWAPITEMS_BATTLER_COUNT],
    pub pending_count: u8,
}

/// One source-macro operand retained for canonical shape validation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryswapitemsOperand<'a> {
    pub width_bytes: u8,
    pub expression: &'a str,
}

/// A resolved source label.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryswapitemsResolvedLabel<'a> {
    pub expression: &'a str,
    pub program_counter: u32,
}

/// Instruction projection used for both singleton registration and
/// execution. Late label resolution is a scheduler/program concern this leaf
/// does not own; the caller resolves each expression and reports the result
/// here, lazily -- exactly like the canonical TypeScript handler's own
/// `resolveBattleScriptLabel` calls, each invoked only on its own branch.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryswapitemsInstruction<'a> {
    pub opcode_name: &'a str,
    pub program_counter: u32,
    pub opcode_id: u8,
    pub dispatcher: &'a str,
    pub operands: &'a [BattleScriptTryswapitemsOperand<'a>],
    pub resolved_failure_target: Option<BattleScriptTryswapitemsResolvedLabel<'a>>,
    pub resolved_sticky_hold_target: Option<BattleScriptTryswapitemsResolvedLabel<'a>>,
}

/// The one dynamic opcode key emitted by successful singleton registration.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryswapitemsRegistration {
    pub opcode_id: u8,
}

/// Exact control directive emitted by the narrow opcode leaf.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTryswapitemsControl {
    Advance,
    Jump { program_counter: u32 },
}

/// The two events the success branch emits, in order. No other branch emits
/// any event.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryswapitemsEvent {
    pub battler: BattleScriptTryswapitemsBattler,
    pub item: u16,
}

/// Complete immutable result of one successful handler application.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryswapitemsOutcome {
    pub rules: BattleScriptTryswapitemsRules,
    pub scheduler: BattleScriptTryswapitemsScheduler,
    pub control: BattleScriptTryswapitemsControl,
    /// `Some([attacker_event, target_event])` on the success (Advance)
    /// branch only; `None` on every jump branch, including Sticky Hold.
    pub events: Option<[BattleScriptTryswapitemsEvent; 2]>,
}

/// Exact observable errors in canonical evaluation order.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTryswapitemsError<'a> {
    WrongCardinality {
        count: usize,
    },
    InvalidInstructionShape {
        program_counter: u32,
    },
    MissingAttackerRole,
    MissingTargetRole,
    InvalidPartyIndex {
        side: BattleScriptTryswapitemsSide,
        party_index: u8,
    },
    UnresolvedFailureTarget {
        expression: &'a str,
    },
    UnresolvedStickyHoldTarget,
}

impl fmt::Display for BattleScriptTryswapitemsError<'_> {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::WrongCardinality { count } => write!(
                formatter,
                "B_SCR_OP_TRYSWAPITEMS requires exactly 1 concrete start, got {count}"
            ),
            Self::InvalidInstructionShape { program_counter } => write!(
                formatter,
                "invalid B_SCR_OP_TRYSWAPITEMS shape at program counter {program_counter}"
            ),
            Self::MissingAttackerRole => write!(
                formatter,
                "Battle Script hit-chain command requires a attacker role"
            ),
            Self::MissingTargetRole => write!(
                formatter,
                "Battle Script hit-chain command requires a target role"
            ),
            Self::InvalidPartyIndex { side, party_index } => write!(
                formatter,
                "Cmd_tryswapitems: invalid {side:?} party index {party_index}"
            ),
            Self::UnresolvedFailureTarget { expression } => write!(
                formatter,
                "Cmd_tryswapitems: unresolved failure target {expression}"
            ),
            Self::UnresolvedStickyHoldTarget => write!(
                formatter,
                "Cmd_tryswapitems: unresolved BattleScript_StickyHoldActivates"
            ),
        }
    }
}

impl std::error::Error for BattleScriptTryswapitemsError<'_> {}

fn validate_instruction<'a>(
    instruction: BattleScriptTryswapitemsInstruction<'a>,
) -> Result<&'a str, BattleScriptTryswapitemsError<'a>> {
    let [failure] = instruction.operands else {
        return Err(BattleScriptTryswapitemsError::InvalidInstructionShape {
            program_counter: instruction.program_counter,
        });
    };
    if instruction.opcode_id != BATTLE_SCRIPT_TRYSWAPITEMS_OPCODE
        || instruction.dispatcher != BATTLE_SCRIPT_TRYSWAPITEMS_DISPATCHER
        || failure.width_bytes != BATTLE_SCRIPT_TRYSWAPITEMS_FAILURE_POINTER_WIDTH_BYTES
    {
        return Err(BattleScriptTryswapitemsError::InvalidInstructionShape {
            program_counter: instruction.program_counter,
        });
    }
    Ok(failure.expression)
}

/// Native projection of `createBattleScriptTryswapitemsOpcodeHandlers`.
/// Wrong cardinality fails before shape inspection; the one matching
/// instruction is then validated, returning the first offender; successful
/// registration contains precisely one opcode key taken from that
/// instruction.
pub fn register_battle_script_tryswapitems_handler<'a>(
    instructions: &[BattleScriptTryswapitemsInstruction<'a>],
) -> Result<BattleScriptTryswapitemsRegistration, BattleScriptTryswapitemsError<'a>> {
    let matching = instructions
        .iter()
        .filter(|instruction| instruction.opcode_name == BATTLE_SCRIPT_TRYSWAPITEMS_OPCODE_NAME)
        .collect::<Vec<_>>();
    if matching.len() != BATTLE_SCRIPT_TRYSWAPITEMS_CONCRETE_START_COUNT {
        return Err(BattleScriptTryswapitemsError::WrongCardinality { count: matching.len() });
    }
    validate_instruction(*matching[0])?;
    Ok(BattleScriptTryswapitemsRegistration { opcode_id: matching[0].opcode_id })
}

/// Native immutable-value twin of canonical `Cmd_tryswapitems`.
pub fn apply_battle_script_tryswapitems<'a>(
    instruction: BattleScriptTryswapitemsInstruction<'a>,
    rules: &BattleScriptTryswapitemsRules,
    scheduler: &BattleScriptTryswapitemsScheduler,
) -> Result<BattleScriptTryswapitemsOutcome, BattleScriptTryswapitemsError<'a>> {
    let failure_expression = validate_instruction(instruction)?;

    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptTryswapitemsError::MissingAttackerRole)?;
    let target = rules
        .selector_roles
        .target
        .ok_or(BattleScriptTryswapitemsError::MissingTargetRole)?;

    let fail = |instruction: BattleScriptTryswapitemsInstruction<'a>| {
        let resolved = instruction.resolved_failure_target.ok_or(
            BattleScriptTryswapitemsError::UnresolvedFailureTarget {
                expression: failure_expression,
            },
        )?;
        Ok(BattleScriptTryswapitemsOutcome {
            rules: *rules,
            scheduler: *scheduler,
            control: BattleScriptTryswapitemsControl::Jump {
                program_counter: resolved.program_counter,
            },
            events: None,
        })
    };

    let flags = rules.battle_type_flags;

    // Source order matters: Trainer Hill rejects before side or item reads.
    if flags & BATTLE_SCRIPT_TRYSWAPITEMS_BATTLE_TYPE_TRAINER_HILL != 0 {
        return fail(instruction);
    }
    let regular_battle = flags & BATTLE_SCRIPT_TRYSWAPITEMS_ALLOWED_SPECIAL_BATTLES == 0;
    let attacker_state = rules.battlers[attacker.index()];
    let target_state = rules.battlers[target.index()];
    if attacker_state.side == BattleScriptTryswapitemsSide::Opponent && regular_battle {
        return fail(instruction);
    }

    let attacker_side = attacker_state.side;
    let target_side = target_state.side;
    if regular_battle
        && ((rules.knocked_off_mons[attacker_side.index()] & (1 << attacker_state.party_index))
            != 0
            || (rules.knocked_off_mons[target_side.index()] & (1 << target_state.party_index)) != 0)
    {
        return fail(instruction);
    }

    let old_item_atk = attacker_state.item;
    let new_item_atk = target_state.item;
    if (old_item_atk == BATTLE_SCRIPT_TRYSWAPITEMS_ITEM_NONE
        && new_item_atk == BATTLE_SCRIPT_TRYSWAPITEMS_ITEM_NONE)
        || old_item_atk == BATTLE_SCRIPT_TRYSWAPITEMS_ITEM_ENIGMA_BERRY
        || new_item_atk == BATTLE_SCRIPT_TRYSWAPITEMS_ITEM_ENIGMA_BERRY
        || is_mail(old_item_atk)
        || is_mail(new_item_atk)
    {
        return fail(instruction);
    }

    if target_state.ability == BATTLE_SCRIPT_TRYSWAPITEMS_ABILITY_STICKY_HOLD {
        let resolved = instruction
            .resolved_sticky_hold_target
            .ok_or(BattleScriptTryswapitemsError::UnresolvedStickyHoldTarget)?;
        let mut next_rules = *rules;
        next_rules.last_used_ability = BATTLE_SCRIPT_TRYSWAPITEMS_ABILITY_STICKY_HOLD;
        if next_rules.ai_observed_ability_ids[target.index()]
            != BATTLE_SCRIPT_TRYSWAPITEMS_ABILITY_STICKY_HOLD
        {
            next_rules.ai_observed_ability_ids[target.index()] =
                BATTLE_SCRIPT_TRYSWAPITEMS_ABILITY_STICKY_HOLD;
        }
        return Ok(BattleScriptTryswapitemsOutcome {
            rules: next_rules,
            scheduler: *scheduler,
            control: BattleScriptTryswapitemsControl::Jump {
                program_counter: resolved.program_counter,
            },
            events: None,
        });
    }

    let attacker_party_index = usize::from(attacker_state.party_index);
    if attacker_party_index >= BATTLE_SCRIPT_TRYSWAPITEMS_PARTY_SIZE {
        return Err(BattleScriptTryswapitemsError::InvalidPartyIndex {
            side: attacker_side,
            party_index: attacker_state.party_index,
        });
    }
    let target_party_index = usize::from(target_state.party_index);
    if target_party_index >= BATTLE_SCRIPT_TRYSWAPITEMS_PARTY_SIZE {
        return Err(BattleScriptTryswapitemsError::InvalidPartyIndex {
            side: target_side,
            party_index: target_state.party_index,
        });
    }

    let mut next_rules = *rules;
    // Asymmetric on purpose: the attacker's ACTIVE item clears to none while
    // its PARTY slot receives the target's item; the target's active item
    // and party slot both receive the attacker's old item.
    next_rules.battlers[attacker.index()].item = BATTLE_SCRIPT_TRYSWAPITEMS_ITEM_NONE;
    next_rules.battlers[target.index()].item = old_item_atk;
    next_rules.party[attacker_side.index()][attacker_party_index].item = new_item_atk;
    next_rules.party[target_side.index()][target_party_index].item = old_item_atk;

    next_rules.changed_items[attacker.index()] = new_item_atk;
    next_rules.choiced_move[attacker.index()] = 0;
    next_rules.choiced_move[target.index()] = 0;

    next_rules.multistring_chooser = if old_item_atk != BATTLE_SCRIPT_TRYSWAPITEMS_ITEM_NONE
        && new_item_atk != BATTLE_SCRIPT_TRYSWAPITEMS_ITEM_NONE
    {
        B_MSG_ITEM_SWAP_BOTH
    } else if old_item_atk == BATTLE_SCRIPT_TRYSWAPITEMS_ITEM_NONE {
        B_MSG_ITEM_SWAP_TAKEN
    } else {
        B_MSG_ITEM_SWAP_GIVEN
    };
    next_rules.battle_text_buff1_item = Some(new_item_atk);
    next_rules.battle_text_buff2_item = Some(old_item_atk);

    let mut next_scheduler = *scheduler;
    for battler in [attacker, target] {
        let pending_count = usize::from(next_scheduler.pending_count);
        let already_pending =
            next_scheduler.pending_controller_battlers[..pending_count].contains(&Some(battler));
        if !already_pending {
            debug_assert!(pending_count < BATTLE_SCRIPT_TRYSWAPITEMS_BATTLER_COUNT);
            next_scheduler.pending_controller_battlers[pending_count] = Some(battler);
            next_scheduler.pending_count += 1;
        }
    }

    Ok(BattleScriptTryswapitemsOutcome {
        rules: next_rules,
        scheduler: next_scheduler,
        control: BattleScriptTryswapitemsControl::Advance,
        events: Some([
            BattleScriptTryswapitemsEvent { battler: attacker, item: new_item_atk },
            BattleScriptTryswapitemsEvent { battler: target, item: old_item_atk },
        ]),
    })
}

/// Independent source, dispatch, and body evidence.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryswapitemsDecompDispatchEvidence {
    pub opcode_name: &'static str,
    pub opcode_id: u8,
    pub dispatcher: &'static str,
    pub dispatch_line: u32,
    pub forward_decl_line: u32,
    pub handler_line: u32,
    pub trainer_hill_line: u32,
    pub opponent_regular_guard_line: u32,
    pub knocked_off_attacker_line: u32,
    pub knocked_off_target_line: u32,
    pub item_guard_line: u32,
    pub sticky_hold_check_line: u32,
    pub sticky_hold_jump_line: u32,
    pub sticky_hold_record_ability_line: u32,
    pub changed_items_write_line: u32,
    pub attacker_item_clear_line: u32,
    pub target_item_set_line: u32,
    pub emit_attacker_line: u32,
    pub emit_target_line: u32,
    pub choiced_move_target_clear_line: u32,
    pub choiced_move_attacker_clear_line: u32,
    pub advance_line: u32,
    pub multistring_both_line: u32,
    pub multistring_taken_line: u32,
    pub multistring_given_line: u32,
}

pub const BATTLE_SCRIPT_TRYSWAPITEMS_DECOMP_DISPATCH_EVIDENCE:
    BattleScriptTryswapitemsDecompDispatchEvidence =
    BattleScriptTryswapitemsDecompDispatchEvidence {
        opcode_name: BATTLE_SCRIPT_TRYSWAPITEMS_OPCODE_NAME,
        opcode_id: BATTLE_SCRIPT_TRYSWAPITEMS_OPCODE,
        dispatcher: BATTLE_SCRIPT_TRYSWAPITEMS_DISPATCHER,
        dispatch_line: 541,
        forward_decl_line: 289,
        handler_line: 9189,
        trainer_hill_line: 9192,
        opponent_regular_guard_line: 9193,
        knocked_off_attacker_line: 9213,
        knocked_off_target_line: 9214,
        item_guard_line: 9220,
        sticky_hold_check_line: 9229,
        sticky_hold_jump_line: 9231,
        sticky_hold_record_ability_line: 9233,
        changed_items_write_line: 9240,
        attacker_item_clear_line: 9244,
        target_item_set_line: 9245,
        emit_attacker_line: 9248,
        emit_target_line: 9252,
        choiced_move_target_clear_line: 9255,
        choiced_move_attacker_clear_line: 9258,
        advance_line: 9261,
        multistring_both_line: 9267,
        multistring_taken_line: 9269,
        multistring_given_line: 9271,
    };

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryswapitemsMacroEvidence {
    pub declaration_line: u32,
    pub opcode_line: u32,
    pub pointer_line: u32,
    pub encoded_width_bytes: u8,
}

pub const BATTLE_SCRIPT_TRYSWAPITEMS_MACRO_EVIDENCE: BattleScriptTryswapitemsMacroEvidence =
    BattleScriptTryswapitemsMacroEvidence {
        declaration_line: 1076,
        opcode_line: 1077,
        pointer_line: 1078,
        encoded_width_bytes: BATTLE_SCRIPT_TRYSWAPITEMS_ENCODED_WIDTH_BYTES,
    };

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryswapitemsCallSiteEvidence {
    pub entry_label: &'static str,
    pub entry_label_line: u32,
    pub statement_line: u32,
    pub instruction_program_counter: u32,
    pub failure_target_expression: &'static str,
    pub failure_target_program_counter: u32,
    pub sticky_hold_label_line: u32,
    pub sticky_hold_program_counter: u32,
}

pub const BATTLE_SCRIPT_TRYSWAPITEMS_CALL_SITE_EVIDENCE: BattleScriptTryswapitemsCallSiteEvidence =
    BattleScriptTryswapitemsCallSiteEvidence {
        entry_label: "BattleScript_EffectTrick",
        entry_label_line: 2331,
        statement_line: 2337,
        instruction_program_counter: 1652,
        failure_target_expression: "BattleScript_ButItFailed",
        failure_target_program_counter: 1434,
        sticky_hold_label_line: 4173,
        sticky_hold_program_counter: 3019,
    };

/// Constants pinned outside the handler body.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryswapitemsConstantsEvidence {
    pub orange_mail_line: u32,
    pub retro_mail_line: u32,
    pub sticky_hold_ability_line: u32,
    pub knocked_off_mons_field_line: u32,
    pub changed_items_field_line: u32,
    pub command_enum_line: u32,
}

pub const BATTLE_SCRIPT_TRYSWAPITEMS_CONSTANTS_EVIDENCE: BattleScriptTryswapitemsConstantsEvidence =
    BattleScriptTryswapitemsConstantsEvidence {
        orange_mail_line: 139,
        retro_mail_line: 150,
        sticky_hold_ability_line: 64,
        knocked_off_mons_field_line: 173,
        changed_items_field_line: 420,
        command_enum_line: 216,
    };

#[cfg(test)]
mod tests {
    use super::*;

    const FAILED_OPERAND: [BattleScriptTryswapitemsOperand<'static>; 1] =
        [BattleScriptTryswapitemsOperand {
            width_bytes: 4,
            expression: "BattleScript_ButItFailed",
        }];

    const RESOLVED_FAILURE: BattleScriptTryswapitemsResolvedLabel<'static> =
        BattleScriptTryswapitemsResolvedLabel {
            expression: "BattleScript_ButItFailed",
            program_counter: 1434,
        };
    const RESOLVED_STICKY_HOLD: BattleScriptTryswapitemsResolvedLabel<'static> =
        BattleScriptTryswapitemsResolvedLabel {
            expression: "BattleScript_StickyHoldActivates",
            program_counter: 3019,
        };

    fn plain_battler(
        side: BattleScriptTryswapitemsSide,
        party_index: u8,
        item: u16,
        ability: u8,
    ) -> BattleScriptTryswapitemsBattlerState {
        BattleScriptTryswapitemsBattlerState { side, party_index, item, ability, marker: 0xabcd }
    }

    fn plain_member(item: u16) -> BattleScriptTryswapitemsPartyMember {
        BattleScriptTryswapitemsPartyMember { item, noise: 0x1234_5678 }
    }

    fn base_rules(
        attacker_side: BattleScriptTryswapitemsSide,
        attacker_party_index: u8,
        attacker_item: u16,
        target_side: BattleScriptTryswapitemsSide,
        target_party_index: u8,
        target_item: u16,
        target_ability: u8,
    ) -> BattleScriptTryswapitemsRules {
        let attacker = plain_battler(attacker_side, attacker_party_index, attacker_item, 0);
        let target = plain_battler(target_side, target_party_index, target_item, target_ability);
        BattleScriptTryswapitemsRules {
            battlers: [
                attacker,
                target,
                plain_battler(BattleScriptTryswapitemsSide::Player, 2, 8, 0),
                plain_battler(BattleScriptTryswapitemsSide::Opponent, 3, 7, 0),
            ],
            party: [
                [
                    plain_member(if attacker_side == BattleScriptTryswapitemsSide::Player {
                        attacker_item
                    } else if target_side == BattleScriptTryswapitemsSide::Player {
                        target_item
                    } else {
                        11
                    }),
                    plain_member(12),
                    plain_member(13),
                    plain_member(14),
                    plain_member(15),
                    plain_member(16),
                ],
                [
                    plain_member(if attacker_side == BattleScriptTryswapitemsSide::Opponent {
                        attacker_item
                    } else if target_side == BattleScriptTryswapitemsSide::Opponent {
                        target_item
                    } else {
                        21
                    }),
                    plain_member(22),
                    plain_member(23),
                    plain_member(24),
                    plain_member(25),
                    plain_member(26),
                ],
            ],
            selector_roles: BattleScriptTryswapitemsRoles {
                attacker: Some(BattleScriptTryswapitemsBattler::Battler0),
                target: Some(BattleScriptTryswapitemsBattler::Battler1),
            },
            battle_type_flags: 0,
            knocked_off_mons: [0, 0],
            changed_items: [1, 2, 3, 4],
            choiced_move: [11, 22, 33, 44],
            last_used_ability: 0,
            ai_observed_ability_ids: [0, 0, 0, 0],
            multistring_chooser: 0,
            battle_text_buff1_item: None,
            battle_text_buff2_item: None,
        }
    }

    fn scheduler(pending: &[BattleScriptTryswapitemsBattler]) -> BattleScriptTryswapitemsScheduler {
        let mut cells = [None; 4];
        for (index, battler) in pending.iter().enumerate() {
            cells[index] = Some(*battler);
        }
        BattleScriptTryswapitemsScheduler {
            pending_controller_battlers: cells,
            pending_count: pending.len() as u8,
        }
    }

    fn instruction(
        resolved_failure_target: Option<BattleScriptTryswapitemsResolvedLabel<'static>>,
        resolved_sticky_hold_target: Option<BattleScriptTryswapitemsResolvedLabel<'static>>,
    ) -> BattleScriptTryswapitemsInstruction<'static> {
        BattleScriptTryswapitemsInstruction {
            opcode_name: BATTLE_SCRIPT_TRYSWAPITEMS_OPCODE_NAME,
            program_counter: 1652,
            opcode_id: BATTLE_SCRIPT_TRYSWAPITEMS_OPCODE,
            dispatcher: BATTLE_SCRIPT_TRYSWAPITEMS_DISPATCHER,
            operands: &FAILED_OPERAND,
            resolved_failure_target,
            resolved_sticky_hold_target,
        }
    }

    fn full_instruction() -> BattleScriptTryswapitemsInstruction<'static> {
        instruction(Some(RESOLVED_FAILURE), Some(RESOLVED_STICKY_HOLD))
    }

    fn player_vs_opponent(attacker_item: u16, target_item: u16) -> BattleScriptTryswapitemsRules {
        base_rules(
            BattleScriptTryswapitemsSide::Player,
            0,
            attacker_item,
            BattleScriptTryswapitemsSide::Opponent,
            1,
            target_item,
            0,
        )
    }

    #[test]
    fn trainer_hill_fails_before_any_other_conjunct() {
        let mut input = player_vs_opponent(139, 140);
        input.battle_type_flags = BATTLE_SCRIPT_TRYSWAPITEMS_BATTLE_TYPE_TRAINER_HILL;
        let outcome = apply_battle_script_tryswapitems(full_instruction(), &input, &scheduler(&[]))
            .expect("trainer hill fails cleanly");
        assert_eq!(
            outcome.control,
            BattleScriptTryswapitemsControl::Jump { program_counter: 1434 }
        );
        assert_eq!(outcome.rules, input);
        assert_eq!(outcome.events, None);
    }

    #[test]
    fn opponent_attacker_fails_in_regular_battle_but_bypassed_by_special_flags() {
        // Attacker on the opponent side, regular battle: fails.
        let regular = base_rules(
            BattleScriptTryswapitemsSide::Opponent,
            0,
            139,
            BattleScriptTryswapitemsSide::Player,
            0,
            140,
            0,
        );
        let outcome =
            apply_battle_script_tryswapitems(full_instruction(), &regular, &scheduler(&[]))
                .expect("opponent attacker fails in regular battle");
        assert_eq!(
            outcome.control,
            BattleScriptTryswapitemsControl::Jump { program_counter: 1434 }
        );

        // Same setup, but a Factory battle flag (ALLOWED_SPECIAL member) bypasses it.
        let mut factory = regular;
        factory.battle_type_flags = 1 << 19; // BATTLE_TYPE_FACTORY
        let outcome =
            apply_battle_script_tryswapitems(full_instruction(), &factory, &scheduler(&[]))
                .expect("factory battle bypasses the opponent guard");
        assert_eq!(outcome.control, BattleScriptTryswapitemsControl::Advance);
    }

    #[test]
    fn knocked_off_fails_in_regular_battle_for_either_side_but_ignored_in_special_battles() {
        let mut attacker_knocked = player_vs_opponent(139, 140);
        attacker_knocked.knocked_off_mons[0] = 1 << 0; // attacker partyIndex 0
        let outcome = apply_battle_script_tryswapitems(
            full_instruction(),
            &attacker_knocked,
            &scheduler(&[]),
        )
        .expect("attacker-side knock off fails");
        assert_eq!(
            outcome.control,
            BattleScriptTryswapitemsControl::Jump { program_counter: 1434 }
        );

        let mut target_knocked = player_vs_opponent(139, 140);
        target_knocked.knocked_off_mons[1] = 1 << 1; // target partyIndex 1
        let outcome =
            apply_battle_script_tryswapitems(full_instruction(), &target_knocked, &scheduler(&[]))
                .expect("target-side knock off fails");
        assert_eq!(
            outcome.control,
            BattleScriptTryswapitemsControl::Jump { program_counter: 1434 }
        );

        let mut special = target_knocked;
        special.battle_type_flags = 1 << 1; // BATTLE_TYPE_LINK
        let outcome =
            apply_battle_script_tryswapitems(full_instruction(), &special, &scheduler(&[]))
                .expect("special battle ignores knocked-off state");
        assert_eq!(outcome.control, BattleScriptTryswapitemsControl::Advance);
    }

    #[test]
    fn both_items_none_enigma_and_mail_bounds_all_fail() {
        let both_none = player_vs_opponent(0, 0);
        assert_eq!(
            apply_battle_script_tryswapitems(full_instruction(), &both_none, &scheduler(&[]))
                .unwrap()
                .control,
            BattleScriptTryswapitemsControl::Jump { program_counter: 1434 }
        );

        let enigma_attacker = player_vs_opponent(175, 1);
        assert_eq!(
            apply_battle_script_tryswapitems(full_instruction(), &enigma_attacker, &scheduler(&[]))
                .unwrap()
                .control,
            BattleScriptTryswapitemsControl::Jump { program_counter: 1434 }
        );
        let enigma_target = player_vs_opponent(1, 175);
        assert_eq!(
            apply_battle_script_tryswapitems(full_instruction(), &enigma_target, &scheduler(&[]))
                .unwrap()
                .control,
            BattleScriptTryswapitemsControl::Jump { program_counter: 1434 }
        );

        for mail_item in [121u16, 132] {
            let mail_attacker = player_vs_opponent(mail_item, 1);
            assert_eq!(
                apply_battle_script_tryswapitems(
                    full_instruction(),
                    &mail_attacker,
                    &scheduler(&[])
                )
                .unwrap()
                .control,
                BattleScriptTryswapitemsControl::Jump { program_counter: 1434 },
                "mail item {mail_item} on attacker should fail"
            );
            let mail_target = player_vs_opponent(1, mail_item);
            assert_eq!(
                apply_battle_script_tryswapitems(full_instruction(), &mail_target, &scheduler(&[]))
                    .unwrap()
                    .control,
                BattleScriptTryswapitemsControl::Jump { program_counter: 1434 },
                "mail item {mail_item} on target should fail"
            );
        }

        // 120 and 133 are one below/above the mail range: not mail, succeed.
        for non_mail in [120u16, 133] {
            let ok = player_vs_opponent(non_mail, 1);
            assert_eq!(
                apply_battle_script_tryswapitems(full_instruction(), &ok, &scheduler(&[]))
                    .unwrap()
                    .control,
                BattleScriptTryswapitemsControl::Advance,
                "non-mail item {non_mail} should succeed"
            );
        }
    }

    #[test]
    fn sticky_hold_jumps_and_reveals_ability_with_identity_case() {
        let mut input = player_vs_opponent(139, 140);
        input.battlers[1].ability = BATTLE_SCRIPT_TRYSWAPITEMS_ABILITY_STICKY_HOLD;
        let outcome = apply_battle_script_tryswapitems(full_instruction(), &input, &scheduler(&[]))
            .expect("sticky hold jumps");
        assert_eq!(
            outcome.control,
            BattleScriptTryswapitemsControl::Jump { program_counter: 3019 }
        );
        assert_eq!(
            outcome.rules.last_used_ability,
            BATTLE_SCRIPT_TRYSWAPITEMS_ABILITY_STICKY_HOLD
        );
        assert_eq!(
            outcome.rules.ai_observed_ability_ids[1],
            BATTLE_SCRIPT_TRYSWAPITEMS_ABILITY_STICKY_HOLD
        );
        assert_eq!(outcome.events, None);
        // Items untouched on this branch.
        assert_eq!(outcome.rules.battlers[0].item, 139);
        assert_eq!(outcome.rules.battlers[1].item, 140);

        // Identity case: the cell already equals 60 before the branch runs.
        let mut already = input;
        already.ai_observed_ability_ids[1] = BATTLE_SCRIPT_TRYSWAPITEMS_ABILITY_STICKY_HOLD;
        already.last_used_ability = 9; // proves overwrite still happens
        let outcome =
            apply_battle_script_tryswapitems(full_instruction(), &already, &scheduler(&[]))
                .expect("identity sticky hold still jumps");
        assert_eq!(
            outcome.rules.last_used_ability,
            BATTLE_SCRIPT_TRYSWAPITEMS_ABILITY_STICKY_HOLD
        );
        assert_eq!(
            outcome.rules.ai_observed_ability_ids[1],
            BATTLE_SCRIPT_TRYSWAPITEMS_ABILITY_STICKY_HOLD
        );
    }

    #[test]
    fn success_swap_is_asymmetric_between_active_item_and_party_mirror() {
        let input = player_vs_opponent(139, 0);
        let outcome = apply_battle_script_tryswapitems(full_instruction(), &input, &scheduler(&[]))
            .expect("clean success");
        assert_eq!(outcome.control, BattleScriptTryswapitemsControl::Advance);
        // Attacker's active item clears to NONE...
        assert_eq!(outcome.rules.battlers[0].item, 0);
        // ...but its PARTY slot receives the target's (new) item.
        assert_eq!(outcome.rules.party[0][0].item, 0); // newItemAtk was 0 here
                                                       // Target's active item AND party slot both receive the attacker's old item.
        assert_eq!(outcome.rules.battlers[1].item, 139);
        assert_eq!(outcome.rules.party[1][1].item, 139);
        assert_eq!(outcome.rules.changed_items, [0, 2, 3, 4]);
        assert_eq!(outcome.rules.choiced_move, [0, 0, 33, 44]);
        assert_eq!(outcome.rules.multistring_chooser, B_MSG_ITEM_SWAP_GIVEN);
        assert_eq!(outcome.rules.battle_text_buff1_item, Some(0));
        assert_eq!(outcome.rules.battle_text_buff2_item, Some(139));
        // Untouched siblings retain their salted noise / values.
        assert_eq!(outcome.rules.battlers[0].ability, 0);
        assert_eq!(outcome.rules.party[0][1].noise, 0x1234_5678);
    }

    #[test]
    fn multistring_chooser_covers_all_three_branches() {
        let both = player_vs_opponent(139, 140);
        assert_eq!(
            apply_battle_script_tryswapitems(full_instruction(), &both, &scheduler(&[]))
                .unwrap()
                .rules
                .multistring_chooser,
            B_MSG_ITEM_SWAP_BOTH
        );
        let taken = player_vs_opponent(0, 140);
        assert_eq!(
            apply_battle_script_tryswapitems(full_instruction(), &taken, &scheduler(&[]))
                .unwrap()
                .rules
                .multistring_chooser,
            B_MSG_ITEM_SWAP_TAKEN
        );
        let given = player_vs_opponent(139, 0);
        assert_eq!(
            apply_battle_script_tryswapitems(full_instruction(), &given, &scheduler(&[]))
                .unwrap()
                .rules
                .multistring_chooser,
            B_MSG_ITEM_SWAP_GIVEN
        );
    }

    #[test]
    fn choiced_move_double_clear_retains_other_cells() {
        let input = player_vs_opponent(139, 140);
        let outcome =
            apply_battle_script_tryswapitems(full_instruction(), &input, &scheduler(&[])).unwrap();
        assert_eq!(outcome.rules.choiced_move[0], 0);
        assert_eq!(outcome.rules.choiced_move[1], 0);
        assert_eq!(outcome.rules.choiced_move[2], 33);
        assert_eq!(outcome.rules.choiced_move[3], 44);
    }

    #[test]
    fn pending_append_order_is_attacker_then_target() {
        let input = player_vs_opponent(139, 140);
        let outcome =
            apply_battle_script_tryswapitems(full_instruction(), &input, &scheduler(&[])).unwrap();
        assert_eq!(
            outcome.scheduler.pending_controller_battlers[0],
            Some(BattleScriptTryswapitemsBattler::Battler0)
        );
        assert_eq!(
            outcome.scheduler.pending_controller_battlers[1],
            Some(BattleScriptTryswapitemsBattler::Battler1)
        );
        assert_eq!(outcome.scheduler.pending_count, 2);

        // Target already pending: only attacker gets appended.
        let already_target = scheduler(&[BattleScriptTryswapitemsBattler::Battler1]);
        let outcome =
            apply_battle_script_tryswapitems(full_instruction(), &input, &already_target).unwrap();
        assert_eq!(
            outcome.scheduler.pending_controller_battlers[0],
            Some(BattleScriptTryswapitemsBattler::Battler1)
        );
        assert_eq!(
            outcome.scheduler.pending_controller_battlers[1],
            Some(BattleScriptTryswapitemsBattler::Battler0)
        );
        assert_eq!(outcome.scheduler.pending_count, 2);
    }

    #[test]
    fn two_events_in_order_on_success_only() {
        let input = player_vs_opponent(139, 140);
        let outcome =
            apply_battle_script_tryswapitems(full_instruction(), &input, &scheduler(&[])).unwrap();
        assert_eq!(
            outcome.events,
            Some([
                BattleScriptTryswapitemsEvent {
                    battler: BattleScriptTryswapitemsBattler::Battler0,
                    item: 140,
                },
                BattleScriptTryswapitemsEvent {
                    battler: BattleScriptTryswapitemsBattler::Battler1,
                    item: 139,
                },
            ])
        );
    }

    #[test]
    fn per_branch_lazy_label_resolution() {
        // No failure label resolved, but the success branch never needs it.
        let success = player_vs_opponent(139, 140);
        let no_failure_label = instruction(None, Some(RESOLVED_STICKY_HOLD));
        assert!(
            apply_battle_script_tryswapitems(no_failure_label, &success, &scheduler(&[])).is_ok()
        );

        // A taken fail branch requires the failure label.
        let mut trainer_hill = success;
        trainer_hill.battle_type_flags = BATTLE_SCRIPT_TRYSWAPITEMS_BATTLE_TYPE_TRAINER_HILL;
        assert_eq!(
            apply_battle_script_tryswapitems(no_failure_label, &trainer_hill, &scheduler(&[]))
                .expect_err("unresolved failure target")
                .to_string(),
            "Cmd_tryswapitems: unresolved failure target BattleScript_ButItFailed"
        );

        // A taken sticky-hold branch requires its own label, independent of the failure label.
        let mut sticky = success;
        sticky.battlers[1].ability = BATTLE_SCRIPT_TRYSWAPITEMS_ABILITY_STICKY_HOLD;
        let no_sticky_label = instruction(Some(RESOLVED_FAILURE), None);
        assert_eq!(
            apply_battle_script_tryswapitems(no_sticky_label, &sticky, &scheduler(&[]))
                .expect_err("unresolved sticky hold target")
                .to_string(),
            "Cmd_tryswapitems: unresolved BattleScript_StickyHoldActivates"
        );
        // But the failure branch on that same instruction still works fine.
        assert!(
            apply_battle_script_tryswapitems(no_sticky_label, &trainer_hill, &scheduler(&[]))
                .is_ok()
        );
    }

    #[test]
    fn missing_roles_and_malformed_shape_produce_exact_errors() {
        let mut missing_attacker = player_vs_opponent(139, 140);
        missing_attacker.selector_roles.attacker = None;
        assert_eq!(
            apply_battle_script_tryswapitems(
                full_instruction(),
                &missing_attacker,
                &scheduler(&[])
            )
            .expect_err("missing attacker")
            .to_string(),
            "Battle Script hit-chain command requires a attacker role"
        );

        let mut missing_target = player_vs_opponent(139, 140);
        missing_target.selector_roles.target = None;
        assert_eq!(
            apply_battle_script_tryswapitems(full_instruction(), &missing_target, &scheduler(&[]))
                .expect_err("missing target")
                .to_string(),
            "Battle Script hit-chain command requires a target role"
        );

        let bad_shape =
            BattleScriptTryswapitemsInstruction { opcode_id: 0xd3, ..full_instruction() };
        assert_eq!(
            apply_battle_script_tryswapitems(bad_shape, &missing_attacker, &scheduler(&[]))
                .expect_err("shape precedes role")
                .to_string(),
            "invalid B_SCR_OP_TRYSWAPITEMS shape at program counter 1652"
        );
    }

    #[test]
    fn registration_accepts_one_start_and_rejects_wrong_cardinality_and_shape() {
        let good = full_instruction();
        assert_eq!(
            register_battle_script_tryswapitems_handler(&[good])
                .expect("one start registers")
                .opcode_id,
            BATTLE_SCRIPT_TRYSWAPITEMS_OPCODE
        );
        assert_eq!(
            register_battle_script_tryswapitems_handler(&[])
                .expect_err("zero starts")
                .to_string(),
            "B_SCR_OP_TRYSWAPITEMS requires exactly 1 concrete start, got 0"
        );
        assert_eq!(
            register_battle_script_tryswapitems_handler(&[good, good])
                .expect_err("two starts")
                .to_string(),
            "B_SCR_OP_TRYSWAPITEMS requires exactly 1 concrete start, got 2"
        );
        let bad = BattleScriptTryswapitemsInstruction { opcode_id: 0xd3, ..good };
        assert_eq!(
            register_battle_script_tryswapitems_handler(&[bad])
                .expect_err("shape offender reported")
                .to_string(),
            "invalid B_SCR_OP_TRYSWAPITEMS shape at program counter 1652"
        );
    }

    #[test]
    fn battler_ids_round_trip_from_u8() {
        for battler in BATTLE_SCRIPT_TRYSWAPITEMS_BATTLERS {
            assert_eq!(
                BattleScriptTryswapitemsBattler::from_u8(battler.as_u8()),
                Some(battler)
            );
        }
        assert_eq!(BattleScriptTryswapitemsBattler::from_u8(4), None);
    }
}
