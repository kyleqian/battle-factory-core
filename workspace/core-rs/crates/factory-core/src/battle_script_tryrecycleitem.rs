//! Pure `B_SCR_OP_TRYRECYCLEITEM` registration, state, and control leaf.
//!
//! This is the deliberately narrow native twin of
//! `src/engine/battleScriptTryrecycleitemOpcode.ts`, not a generic Battle
//! Script machine. Recycle requires a recorded consumed item
//! (`usedHeldItems[attacker] != ITEM_NONE`) and an empty active held-item
//! slot; failing either conjunct jumps through the operand's late-resolved
//! failure pointer with the rules and scheduler unchanged. Otherwise the
//! command transfers `usedHeldItems[attacker]` back into the active battler
//! and its persistent party owner, clears the consumed-item cell, records
//! `lastUsedItem`, appends the attacker to the unique pending-controller
//! list, and emits one held-item controller-write event. No branch consumes
//! RNG.
//!
//! Source authority:
//! - `Cmd_tryrecycleitem` is `reference/pokeemerald/src/battle_script_commands.c:9808-9829`;
//!   dispatch `:565` (`//0xEA`), forward declaration `:313`.
//! - The five-byte macro is `asm/macros/battle_script.inc:1190-1193`.
//! - The sole concrete call site is `data/battle_scripts_1.s:2407`
//!   (`tryrecycleitem BattleScript_ButItFailed`, inside
//!   `BattleScript_EffectRecycle`).
//! - `include/battle.h:415` (`u16 usedHeldItems[MAX_BATTLERS_COUNT]`) and
//!   `:657` (`extern u16 gLastUsedItem`).
//! - `include/constants/battle_script_commands.h:240`; `include/constants/items.h:4`
//!   (`ITEM_NONE 0`).
//!
//! This leaf deliberately owns neither a generic machine, scheduler/event
//! transport, RNG advancement, presentation, nor the WASM ABI.

use core::fmt;

/// Source `MAX_BATTLERS_COUNT`; all source-indexed state retains four cells.
pub const BATTLE_SCRIPT_TRYRECYCLEITEM_BATTLER_COUNT: usize = 4;
/// Source party size; both sides carry six member cells.
pub const BATTLE_SCRIPT_TRYRECYCLEITEM_PARTY_SIZE: usize = 6;
/// `B_SCR_OP_TRYRECYCLEITEM` in the source command enum / dispatch table.
pub const BATTLE_SCRIPT_TRYRECYCLEITEM_OPCODE: u8 = 0xea;
/// Concrete opcode name selected by canonical registration.
pub const BATTLE_SCRIPT_TRYRECYCLEITEM_OPCODE_NAME: &str = "B_SCR_OP_TRYRECYCLEITEM";
/// Source dispatch-table handler identity.
pub const BATTLE_SCRIPT_TRYRECYCLEITEM_DISPATCHER: &str = "Cmd_tryrecycleitem";
/// The canonical factory accepts exactly this many concrete starts.
pub const BATTLE_SCRIPT_TRYRECYCLEITEM_CONCRETE_START_COUNT: usize = 1;
/// One four-byte failure pointer follows the opcode byte.
pub const BATTLE_SCRIPT_TRYRECYCLEITEM_FAILURE_POINTER_WIDTH_BYTES: u8 = 4;
/// The source macro's encoded byte width.
pub const BATTLE_SCRIPT_TRYRECYCLEITEM_ENCODED_WIDTH_BYTES: u8 = 5;
/// `include/constants/items.h:4` -- `ITEM_NONE`.
pub const BATTLE_SCRIPT_TRYRECYCLEITEM_ITEM_NONE: u16 = 0;

/// Complete source battler-id domain used by roles and source-indexed arrays.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptTryrecycleitemBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

/// Fixed source battler domain, including inactive cells in singles.
pub const BATTLE_SCRIPT_TRYRECYCLEITEM_BATTLERS: [BattleScriptTryrecycleitemBattler;
    BATTLE_SCRIPT_TRYRECYCLEITEM_BATTLER_COUNT] = [
    BattleScriptTryrecycleitemBattler::Battler0,
    BattleScriptTryrecycleitemBattler::Battler1,
    BattleScriptTryrecycleitemBattler::Battler2,
    BattleScriptTryrecycleitemBattler::Battler3,
];

impl BattleScriptTryrecycleitemBattler {
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

/// Source battle side, indexing the two persistent party arrays.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptTryrecycleitemSide {
    Player = 0,
    Opponent = 1,
}

impl BattleScriptTryrecycleitemSide {
    /// Zero-based source-array index.
    #[must_use]
    pub const fn index(self) -> usize {
        self as usize
    }
}

/// The complete per-battler projection read or written by this opcode.
/// `ability` and `marker` are salted noise siblings this command never reads
/// or writes; only `item` (read then written on the attacker) and `side` /
/// `party_index` (read to locate the party mirror) participate in canonical
/// evaluation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryrecycleitemBattlerState {
    pub side: BattleScriptTryrecycleitemSide,
    pub party_index: u8,
    pub item: u16,
    pub ability: u8,
    pub marker: u32,
}

/// One persistent party member's projection. `noise` is a salted sibling
/// this command never reads or writes; only `item` participates.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryrecycleitemPartyMember {
    pub item: u16,
    pub noise: u32,
}

/// Canonical selector bindings. Only `attacker` is ever read.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryrecycleitemRoles {
    pub attacker: Option<BattleScriptTryrecycleitemBattler>,
}

/// Complete narrow rules slice read or written by this command.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryrecycleitemRules {
    pub battlers:
        [BattleScriptTryrecycleitemBattlerState; BATTLE_SCRIPT_TRYRECYCLEITEM_BATTLER_COUNT],
    pub party:
        [[BattleScriptTryrecycleitemPartyMember; BATTLE_SCRIPT_TRYRECYCLEITEM_PARTY_SIZE]; 2],
    pub selector_roles: BattleScriptTryrecycleitemRoles,
    pub used_held_items: [u16; BATTLE_SCRIPT_TRYRECYCLEITEM_BATTLER_COUNT],
    pub last_used_item: u16,
}

/// Scheduler projection carrying only the unique pending-controller list this
/// command appends to on success. Shape copied from `battle_script_refresh`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryrecycleitemScheduler {
    pub pending_controller_battlers:
        [Option<BattleScriptTryrecycleitemBattler>; BATTLE_SCRIPT_TRYRECYCLEITEM_BATTLER_COUNT],
    pub pending_count: u8,
}

/// One source-macro operand retained for canonical shape validation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryrecycleitemOperand<'a> {
    pub width_bytes: u8,
    pub expression: &'a str,
}

/// A resolved source failure label.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryrecycleitemResolvedLabel<'a> {
    pub expression: &'a str,
    pub program_counter: u32,
}

/// Instruction projection used for both singleton registration and execution.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryrecycleitemInstruction<'a> {
    pub opcode_name: &'a str,
    pub program_counter: u32,
    pub opcode_id: u8,
    pub dispatcher: &'a str,
    pub operands: &'a [BattleScriptTryrecycleitemOperand<'a>],
    /// Late label resolution is a scheduler/program concern this leaf does
    /// not own; the caller resolves the pointer operand's expression and
    /// reports the result here, exactly like the canonical TypeScript
    /// handler's own `resolveBattleScriptLabel` call, invoked lazily only on
    /// the failure branch.
    pub resolved_failure_target: Option<BattleScriptTryrecycleitemResolvedLabel<'a>>,
}

/// The one dynamic opcode key emitted by successful singleton registration.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryrecycleitemRegistration {
    pub opcode_id: u8,
}

/// Exact control directive emitted by the narrow opcode leaf.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTryrecycleitemControl {
    Advance,
    Jump { program_counter: u32 },
}

/// The sole event this command ever emits, on the success branch only.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTryrecycleitemEvent {
    SetBattlerItem {
        battler: BattleScriptTryrecycleitemBattler,
        item: u16,
    },
}

/// Complete immutable result of one successful handler application.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryrecycleitemOutcome {
    pub rules: BattleScriptTryrecycleitemRules,
    pub scheduler: BattleScriptTryrecycleitemScheduler,
    pub control: BattleScriptTryrecycleitemControl,
    pub emitted_event: Option<BattleScriptTryrecycleitemEvent>,
}

/// Exact observable errors in canonical evaluation order.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTryrecycleitemError<'a> {
    WrongCardinality {
        count: usize,
    },
    InvalidInstructionShape {
        program_counter: u32,
    },
    MissingAttackerRole,
    InvalidPartyIndex {
        side: BattleScriptTryrecycleitemSide,
        party_index: u8,
    },
    UnresolvedFailureTarget {
        expression: &'a str,
    },
}

impl fmt::Display for BattleScriptTryrecycleitemError<'_> {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::WrongCardinality { count } => write!(
                formatter,
                "B_SCR_OP_TRYRECYCLEITEM requires exactly 1 concrete start, got {count}"
            ),
            Self::InvalidInstructionShape { program_counter } => write!(
                formatter,
                "invalid B_SCR_OP_TRYRECYCLEITEM shape at program counter {program_counter}"
            ),
            Self::MissingAttackerRole => write!(
                formatter,
                "Battle Script hit-chain command requires a attacker role"
            ),
            Self::InvalidPartyIndex { side, party_index } => write!(
                formatter,
                "Cmd_tryrecycleitem: invalid {side:?} party index {party_index}"
            ),
            Self::UnresolvedFailureTarget { expression } => write!(
                formatter,
                "Cmd_tryrecycleitem: unresolved failure target {expression}"
            ),
        }
    }
}

impl std::error::Error for BattleScriptTryrecycleitemError<'_> {}

fn validate_instruction<'a>(
    instruction: BattleScriptTryrecycleitemInstruction<'a>,
) -> Result<&'a str, BattleScriptTryrecycleitemError<'a>> {
    let [failure] = instruction.operands else {
        return Err(BattleScriptTryrecycleitemError::InvalidInstructionShape {
            program_counter: instruction.program_counter,
        });
    };
    if instruction.opcode_id != BATTLE_SCRIPT_TRYRECYCLEITEM_OPCODE
        || instruction.dispatcher != BATTLE_SCRIPT_TRYRECYCLEITEM_DISPATCHER
        || failure.width_bytes != BATTLE_SCRIPT_TRYRECYCLEITEM_FAILURE_POINTER_WIDTH_BYTES
    {
        return Err(BattleScriptTryrecycleitemError::InvalidInstructionShape {
            program_counter: instruction.program_counter,
        });
    }
    Ok(failure.expression)
}

/// Native projection of `createBattleScriptTryrecycleitemOpcodeHandlers`.
/// Wrong cardinality fails before shape inspection; the one matching
/// instruction is then validated, returning the first offender; successful
/// registration contains precisely one opcode key taken from that
/// instruction.
pub fn register_battle_script_tryrecycleitem_handler<'a>(
    instructions: &[BattleScriptTryrecycleitemInstruction<'a>],
) -> Result<BattleScriptTryrecycleitemRegistration, BattleScriptTryrecycleitemError<'a>> {
    let matching = instructions
        .iter()
        .filter(|instruction| instruction.opcode_name == BATTLE_SCRIPT_TRYRECYCLEITEM_OPCODE_NAME)
        .collect::<Vec<_>>();
    if matching.len() != BATTLE_SCRIPT_TRYRECYCLEITEM_CONCRETE_START_COUNT {
        return Err(BattleScriptTryrecycleitemError::WrongCardinality { count: matching.len() });
    }
    validate_instruction(*matching[0])?;
    Ok(BattleScriptTryrecycleitemRegistration { opcode_id: matching[0].opcode_id })
}

/// Native immutable-value twin of canonical `Cmd_tryrecycleitem`.
///
/// Evaluation order matches the canonical handler exactly: shape validation,
/// then the attacker role, then the two-conjunct success predicate
/// (`usedHeldItems[attacker] != ITEM_NONE && battlers[attacker].item ==
/// ITEM_NONE`). On failure the pointer operand is resolved lazily -- only on
/// this branch -- and the rules and scheduler are returned unchanged. On
/// success the attacker's active item, its persistent party mirror, the
/// consumed-item cell, `lastUsedItem`, and the pending-controller list all
/// update, and exactly one held-item event is emitted.
pub fn apply_battle_script_tryrecycleitem<'a>(
    instruction: BattleScriptTryrecycleitemInstruction<'a>,
    rules: &BattleScriptTryrecycleitemRules,
    scheduler: &BattleScriptTryrecycleitemScheduler,
) -> Result<BattleScriptTryrecycleitemOutcome, BattleScriptTryrecycleitemError<'a>> {
    let failure_expression = validate_instruction(instruction)?;

    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptTryrecycleitemError::MissingAttackerRole)?;

    let attacker_state = rules.battlers[attacker.index()];
    let used_item = rules.used_held_items[attacker.index()];
    let fails = used_item == BATTLE_SCRIPT_TRYRECYCLEITEM_ITEM_NONE
        || attacker_state.item != BATTLE_SCRIPT_TRYRECYCLEITEM_ITEM_NONE;

    if fails {
        let resolved = instruction.resolved_failure_target.ok_or(
            BattleScriptTryrecycleitemError::UnresolvedFailureTarget {
                expression: failure_expression,
            },
        )?;
        return Ok(BattleScriptTryrecycleitemOutcome {
            rules: *rules,
            scheduler: *scheduler,
            control: BattleScriptTryrecycleitemControl::Jump {
                program_counter: resolved.program_counter,
            },
            emitted_event: None,
        });
    }

    let party_index = usize::from(attacker_state.party_index);
    if party_index >= BATTLE_SCRIPT_TRYRECYCLEITEM_PARTY_SIZE {
        return Err(BattleScriptTryrecycleitemError::InvalidPartyIndex {
            side: attacker_state.side,
            party_index: attacker_state.party_index,
        });
    }

    let mut next_rules = *rules;
    next_rules.battlers[attacker.index()].item = used_item;
    next_rules.party[attacker_state.side.index()][party_index].item = used_item;
    next_rules.used_held_items[attacker.index()] = BATTLE_SCRIPT_TRYRECYCLEITEM_ITEM_NONE;
    next_rules.last_used_item = used_item;

    let mut next_scheduler = *scheduler;
    let pending_count = usize::from(next_scheduler.pending_count);
    let already_pending =
        next_scheduler.pending_controller_battlers[..pending_count].contains(&Some(attacker));
    if !already_pending {
        debug_assert!(pending_count < BATTLE_SCRIPT_TRYRECYCLEITEM_BATTLER_COUNT);
        next_scheduler.pending_controller_battlers[pending_count] = Some(attacker);
        next_scheduler.pending_count += 1;
    }

    Ok(BattleScriptTryrecycleitemOutcome {
        rules: next_rules,
        scheduler: next_scheduler,
        control: BattleScriptTryrecycleitemControl::Advance,
        emitted_event: Some(BattleScriptTryrecycleitemEvent::SetBattlerItem {
            battler: attacker,
            item: used_item,
        }),
    })
}

/// Independent source, dispatch, and body evidence.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryrecycleitemDecompDispatchEvidence {
    pub opcode_name: &'static str,
    pub opcode_id: u8,
    pub dispatcher: &'static str,
    pub dispatch_line: u32,
    pub forward_decl_line: u32,
    pub handler_line: u32,
    pub locals_line: u32,
    pub active_battler_line: u32,
    pub used_held_item_pointer_line: u32,
    pub condition_line: u32,
    pub last_used_item_line: u32,
    pub clear_used_held_item_line: u32,
    pub write_item_line: u32,
    pub emit_line: u32,
    pub mark_pending_line: u32,
    pub advance_line: u32,
    pub else_pointer_line: u32,
}

pub const BATTLE_SCRIPT_TRYRECYCLEITEM_DECOMP_DISPATCH_EVIDENCE:
    BattleScriptTryrecycleitemDecompDispatchEvidence =
    BattleScriptTryrecycleitemDecompDispatchEvidence {
        opcode_name: BATTLE_SCRIPT_TRYRECYCLEITEM_OPCODE_NAME,
        opcode_id: BATTLE_SCRIPT_TRYRECYCLEITEM_OPCODE,
        dispatcher: BATTLE_SCRIPT_TRYRECYCLEITEM_DISPATCHER,
        dispatch_line: 565,
        forward_decl_line: 313,
        handler_line: 9808,
        locals_line: 9810,
        active_battler_line: 9812,
        used_held_item_pointer_line: 9813,
        condition_line: 9814,
        last_used_item_line: 9816,
        clear_used_held_item_line: 9817,
        write_item_line: 9818,
        emit_line: 9820,
        mark_pending_line: 9821,
        advance_line: 9823,
        else_pointer_line: 9827,
    };

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryrecycleitemMacroEvidence {
    pub declaration_line: u32,
    pub opcode_line: u32,
    pub pointer_line: u32,
    pub encoded_width_bytes: u8,
}

pub const BATTLE_SCRIPT_TRYRECYCLEITEM_MACRO_EVIDENCE: BattleScriptTryrecycleitemMacroEvidence =
    BattleScriptTryrecycleitemMacroEvidence {
        declaration_line: 1190,
        opcode_line: 1191,
        pointer_line: 1192,
        encoded_width_bytes: BATTLE_SCRIPT_TRYRECYCLEITEM_ENCODED_WIDTH_BYTES,
    };

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryrecycleitemCallSiteEvidence {
    pub entry_label: &'static str,
    pub entry_label_line: u32,
    pub statement_line: u32,
    pub instruction_program_counter: u32,
    pub failure_target_expression: &'static str,
    pub failure_target_program_counter: u32,
}

pub const BATTLE_SCRIPT_TRYRECYCLEITEM_CALL_SITE_EVIDENCE:
    BattleScriptTryrecycleitemCallSiteEvidence = BattleScriptTryrecycleitemCallSiteEvidence {
    entry_label: "BattleScript_EffectRecycle",
    entry_label_line: 2403,
    statement_line: 2407,
    instruction_program_counter: 1708,
    failure_target_expression: "BattleScript_ButItFailed",
    failure_target_program_counter: 1434,
};

#[cfg(test)]
mod tests {
    use super::*;

    const FAILED_OPERAND: [BattleScriptTryrecycleitemOperand<'static>; 1] =
        [BattleScriptTryrecycleitemOperand {
            width_bytes: 4,
            expression: "BattleScript_ButItFailed",
        }];

    fn plain_battler(
        side: BattleScriptTryrecycleitemSide,
        party_index: u8,
        item: u16,
    ) -> BattleScriptTryrecycleitemBattlerState {
        BattleScriptTryrecycleitemBattlerState {
            side,
            party_index,
            item,
            ability: 7,
            marker: 0xabcd,
        }
    }

    fn plain_member(item: u16) -> BattleScriptTryrecycleitemPartyMember {
        BattleScriptTryrecycleitemPartyMember { item, noise: 0x1234_5678 }
    }

    fn rules(
        attacker_item: u16,
        used_held_items: [u16; 4],
        attacker: Option<BattleScriptTryrecycleitemBattler>,
        party_item: u16,
    ) -> BattleScriptTryrecycleitemRules {
        BattleScriptTryrecycleitemRules {
            battlers: [
                plain_battler(BattleScriptTryrecycleitemSide::Player, 0, attacker_item),
                plain_battler(BattleScriptTryrecycleitemSide::Opponent, 1, 9),
                plain_battler(BattleScriptTryrecycleitemSide::Player, 2, 8),
                plain_battler(BattleScriptTryrecycleitemSide::Opponent, 3, 7),
            ],
            party: [
                [
                    plain_member(party_item),
                    plain_member(11),
                    plain_member(12),
                    plain_member(13),
                    plain_member(14),
                    plain_member(15),
                ],
                [
                    plain_member(21),
                    plain_member(22),
                    plain_member(23),
                    plain_member(24),
                    plain_member(25),
                    plain_member(26),
                ],
            ],
            selector_roles: BattleScriptTryrecycleitemRoles { attacker },
            used_held_items,
            last_used_item: 77,
        }
    }

    fn scheduler(
        pending: &[BattleScriptTryrecycleitemBattler],
    ) -> BattleScriptTryrecycleitemScheduler {
        let mut cells = [None; 4];
        for (index, battler) in pending.iter().enumerate() {
            cells[index] = Some(*battler);
        }
        BattleScriptTryrecycleitemScheduler {
            pending_controller_battlers: cells,
            pending_count: pending.len() as u8,
        }
    }

    fn instruction<'a>(
        operands: &'a [BattleScriptTryrecycleitemOperand<'a>],
        resolved_failure_target: Option<BattleScriptTryrecycleitemResolvedLabel<'a>>,
    ) -> BattleScriptTryrecycleitemInstruction<'a> {
        BattleScriptTryrecycleitemInstruction {
            opcode_name: BATTLE_SCRIPT_TRYRECYCLEITEM_OPCODE_NAME,
            program_counter: 1708,
            opcode_id: BATTLE_SCRIPT_TRYRECYCLEITEM_OPCODE,
            dispatcher: BATTLE_SCRIPT_TRYRECYCLEITEM_DISPATCHER,
            operands,
            resolved_failure_target,
        }
    }

    const RESOLVED: BattleScriptTryrecycleitemResolvedLabel<'static> =
        BattleScriptTryrecycleitemResolvedLabel {
            expression: "BattleScript_ButItFailed",
            program_counter: 1434,
        };

    #[test]
    fn fails_when_no_used_item_is_recorded() {
        let operands = &FAILED_OPERAND;
        let instr = instruction(operands, Some(RESOLVED));
        let attacker = Some(BattleScriptTryrecycleitemBattler::Battler0);
        let input = rules(0, [0, 9, 8, 7], attacker, 0);
        let outcome = apply_battle_script_tryrecycleitem(instr, &input, &scheduler(&[]))
            .expect("no used item fails cleanly");
        assert_eq!(
            outcome.control,
            BattleScriptTryrecycleitemControl::Jump { program_counter: 1434 }
        );
        assert_eq!(outcome.rules, input);
        assert_eq!(outcome.emitted_event, None);
    }

    #[test]
    fn fails_when_active_item_slot_is_occupied() {
        let operands = &FAILED_OPERAND;
        let instr = instruction(operands, Some(RESOLVED));
        let attacker = Some(BattleScriptTryrecycleitemBattler::Battler0);
        let input = rules(5, [139, 9, 8, 7], attacker, 0);
        let outcome = apply_battle_script_tryrecycleitem(instr, &input, &scheduler(&[]))
            .expect("occupied slot fails cleanly");
        assert_eq!(
            outcome.control,
            BattleScriptTryrecycleitemControl::Jump { program_counter: 1434 }
        );
        assert_eq!(outcome.rules, input);
    }

    #[test]
    fn success_transfers_item_and_clears_used_held_item_cell_only() {
        let operands = &FAILED_OPERAND;
        let instr = instruction(operands, Some(RESOLVED));
        let attacker = Some(BattleScriptTryrecycleitemBattler::Battler0);
        let input = rules(0, [139, 9, 8, 7], attacker, 0);

        let outcome = apply_battle_script_tryrecycleitem(instr, &input, &scheduler(&[]))
            .expect("clean success");
        assert_eq!(outcome.control, BattleScriptTryrecycleitemControl::Advance);
        assert_eq!(outcome.rules.battlers[0].item, 139);
        assert_eq!(outcome.rules.party[0][0].item, 139);
        assert_eq!(outcome.rules.used_held_items, [0, 9, 8, 7]);
        assert_eq!(outcome.rules.last_used_item, 139);
        assert_eq!(
            outcome.emitted_event,
            Some(BattleScriptTryrecycleitemEvent::SetBattlerItem {
                battler: BattleScriptTryrecycleitemBattler::Battler0,
                item: 139,
            })
        );
        // Untouched siblings retain their salted noise.
        assert_eq!(outcome.rules.battlers[0].ability, 7);
        assert_eq!(outcome.rules.party[0][0].noise, 0x1234_5678);
        assert_eq!(outcome.rules.battlers[1].item, 9);
        assert_eq!(outcome.rules.party[1][1].item, 22);
    }

    #[test]
    fn pending_controller_append_happens_once() {
        let operands = &FAILED_OPERAND;
        let instr = instruction(operands, Some(RESOLVED));
        let attacker = Some(BattleScriptTryrecycleitemBattler::Battler0);
        let input = rules(0, [139, 9, 8, 7], attacker, 0);

        let outcome = apply_battle_script_tryrecycleitem(instr, &input, &scheduler(&[]))
            .expect("clean success");
        assert_eq!(
            outcome.scheduler.pending_controller_battlers[0],
            Some(BattleScriptTryrecycleitemBattler::Battler0)
        );
        assert_eq!(outcome.scheduler.pending_count, 1);

        let already = scheduler(&[BattleScriptTryrecycleitemBattler::Battler0]);
        let idempotent = apply_battle_script_tryrecycleitem(instr, &input, &already)
            .expect("idempotent success");
        assert_eq!(idempotent.scheduler, already);
    }

    #[test]
    fn lazy_label_resolution_only_matters_on_the_fail_branch() {
        let operands = &FAILED_OPERAND;
        let unresolved_instr = instruction(operands, None);
        let attacker = Some(BattleScriptTryrecycleitemBattler::Battler0);

        // Success ignores the unresolved label entirely.
        let success = rules(0, [139, 9, 8, 7], attacker, 0);
        assert!(
            apply_battle_script_tryrecycleitem(unresolved_instr, &success, &scheduler(&[])).is_ok()
        );

        // Failure needs the resolved label.
        let failure = rules(0, [0, 9, 8, 7], attacker, 0);
        assert_eq!(
            apply_battle_script_tryrecycleitem(unresolved_instr, &failure, &scheduler(&[]))
                .expect_err("unresolved failure target")
                .to_string(),
            "Cmd_tryrecycleitem: unresolved failure target BattleScript_ButItFailed"
        );
    }

    #[test]
    fn malformed_instruction_precedes_missing_attacker_role() {
        let bad_opcode = instruction(&FAILED_OPERAND, Some(RESOLVED));
        let bad_opcode = BattleScriptTryrecycleitemInstruction { opcode_id: 0xeb, ..bad_opcode };
        let missing = rules(0, [139, 9, 8, 7], None, 0);
        assert_eq!(
            apply_battle_script_tryrecycleitem(bad_opcode, &missing, &scheduler(&[]))
                .expect_err("shape precedes role")
                .to_string(),
            "invalid B_SCR_OP_TRYRECYCLEITEM shape at program counter 1708"
        );

        let good = instruction(&FAILED_OPERAND, Some(RESOLVED));
        assert_eq!(
            apply_battle_script_tryrecycleitem(good, &missing, &scheduler(&[]))
                .expect_err("attacker role required")
                .to_string(),
            "Battle Script hit-chain command requires a attacker role"
        );
    }

    #[test]
    fn registration_accepts_one_start_and_rejects_wrong_cardinality_and_shape() {
        let good = instruction(&FAILED_OPERAND, Some(RESOLVED));
        assert_eq!(
            register_battle_script_tryrecycleitem_handler(&[good])
                .expect("one start registers")
                .opcode_id,
            BATTLE_SCRIPT_TRYRECYCLEITEM_OPCODE
        );
        assert_eq!(
            register_battle_script_tryrecycleitem_handler(&[])
                .expect_err("zero starts")
                .to_string(),
            "B_SCR_OP_TRYRECYCLEITEM requires exactly 1 concrete start, got 0"
        );
        assert_eq!(
            register_battle_script_tryrecycleitem_handler(&[good, good])
                .expect_err("two starts")
                .to_string(),
            "B_SCR_OP_TRYRECYCLEITEM requires exactly 1 concrete start, got 2"
        );
        let bad = BattleScriptTryrecycleitemInstruction { opcode_id: 0xeb, ..good };
        assert_eq!(
            register_battle_script_tryrecycleitem_handler(&[bad])
                .expect_err("shape offender reported")
                .to_string(),
            "invalid B_SCR_OP_TRYRECYCLEITEM shape at program counter 1708"
        );
    }

    #[test]
    fn battler_ids_round_trip_from_u8() {
        for battler in BATTLE_SCRIPT_TRYRECYCLEITEM_BATTLERS {
            assert_eq!(
                BattleScriptTryrecycleitemBattler::from_u8(battler.as_u8()),
                Some(battler)
            );
        }
        assert_eq!(BattleScriptTryrecycleitemBattler::from_u8(4), None);
    }
}
