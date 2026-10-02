//! Pure `B_SCR_OP_REMOVEITEM` registration, state, and control leaf.
//!
//! This is the deliberately narrow native twin of
//! `src/engine/battleScriptRemoveitemOpcode.ts`, not a generic Battle Script
//! machine. Unlike `Cmd_tryrecycleitem` (the consumer of the
//! `usedHeldItems` cells this opcode produces), `Cmd_removeitem` never
//! branches: it resolves its one selector operand (`BS_ATTACKER` or
//! `BS_SCRIPTING`, through the same battler-selector-role convention as
//! `battle_script_jumpifstatus3condition`) to a live battler, unconditionally
//! records that battler's current active item into `usedHeldItems[battler]`
//! (even when it is already `ITEM_NONE` -- the old value is what gets
//! recorded), clears the active item and its persistent party mirror,
//! appends the battler to the unique pending-controller list, and emits one
//! held-item controller-write event. `lastUsedItem` is never touched. If the
//! selector cannot resolve to a live battler, the command halts through the
//! same `unsupported-branch` outcome shape as the rest of the hit-chain
//! family, leaving rules and scheduler unchanged. No branch consumes RNG,
//! and -- unlike `Cmd_tryrecycleitem` -- canonical registration performs no
//! additional per-execution shape re-check.
//!
//! Source authority:
//! - `Cmd_removeitem` is `reference/pokeemerald/src/battle_script_commands.c:5901-5915`;
//!   dispatch `:437` (`//0x6A`), forward declaration `:185`.
//! - The two-byte macro is `asm/macros/battle_script.inc:607-610`.
//! - All 13 concrete call sites are `data/battle_scripts_1.s`: eight
//!   `removeitem BS_SCRIPTING` at `:4271,4283,4295,4307,4319,4330,4342,4353`
//!   and five `removeitem BS_ATTACKER` at `:4363,4370,4407,4416,4423`.
//! - Selector dispatch is `src/battle_util.c:702-703` (`BS_ATTACKER` ->
//!   `gBattlerAttacker`) and `:711-712` (`BS_SCRIPTING` ->
//!   `gBattleScripting.battler`).
//! - `include/battle.h:415` (`u16 usedHeldItems[MAX_BATTLERS_COUNT]`);
//!   `include/constants/battle_script_commands.h:112` (`B_SCR_OP_REMOVEITEM`),
//!   `:305` (`BS_ATTACKER 1`), `:314` (`BS_SCRIPTING 10`);
//!   `include/constants/items.h:4` (`ITEM_NONE 0`).
//!
//! This leaf deliberately owns neither a generic machine, scheduler/event
//! transport, RNG advancement, presentation, nor the WASM ABI.

use core::fmt;

/// Source `MAX_BATTLERS_COUNT`; all source-indexed state retains four cells.
pub const BATTLE_SCRIPT_REMOVEITEM_BATTLER_COUNT: usize = 4;
/// Source party size; both sides carry six member cells.
pub const BATTLE_SCRIPT_REMOVEITEM_PARTY_SIZE: usize = 6;
/// `B_SCR_OP_REMOVEITEM` in the source command enum / dispatch table.
pub const BATTLE_SCRIPT_REMOVEITEM_OPCODE: u8 = 0x6a;
/// Concrete opcode name selected by canonical registration.
pub const BATTLE_SCRIPT_REMOVEITEM_OPCODE_NAME: &str = "B_SCR_OP_REMOVEITEM";
/// Source dispatch-table handler identity.
pub const BATTLE_SCRIPT_REMOVEITEM_DISPATCHER: &str = "Cmd_removeitem";
/// The canonical factory accepts exactly this many concrete starts.
pub const BATTLE_SCRIPT_REMOVEITEM_CONCRETE_START_COUNT: usize = 13;
/// The one selector operand's encoded byte width.
pub const BATTLE_SCRIPT_REMOVEITEM_SELECTOR_WIDTH_BYTES: u8 = 1;
/// The source macro's encoded byte width.
pub const BATTLE_SCRIPT_REMOVEITEM_ENCODED_WIDTH_BYTES: u8 = 2;
/// `include/constants/items.h:4` -- `ITEM_NONE`.
pub const BATTLE_SCRIPT_REMOVEITEM_ITEM_NONE: u16 = 0;
/// `include/constants/battle_script_commands.h:305` -- `BS_ATTACKER`.
pub const BATTLE_SCRIPT_REMOVEITEM_SELECTOR_BS_ATTACKER: &str = "BS_ATTACKER";
/// `include/constants/battle_script_commands.h:314` -- `BS_SCRIPTING`.
pub const BATTLE_SCRIPT_REMOVEITEM_SELECTOR_BS_SCRIPTING: &str = "BS_SCRIPTING";
/// `unsupportedBranch`'s fixed `sourceFile` argument at this call site.
pub const BATTLE_SCRIPT_REMOVEITEM_UNSUPPORTED_SOURCE_FILE: &str = "battle_script_commands.c";
/// `battle_script_commands.c:5905` -- the `GetBattlerForBattleScript` call
/// the canonical handler cites as its `unsupportedBranch` source line.
pub const BATTLE_SCRIPT_REMOVEITEM_UNSUPPORTED_SOURCE_LINE: u32 = 5905;
/// TypeScript's `operand?.expression ?? "<missing>"` fallback.
pub const BATTLE_SCRIPT_REMOVEITEM_MISSING_SELECTOR_EXPRESSION: &str = "<missing>";

/// Complete source battler-id domain used by roles and source-indexed arrays.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptRemoveitemBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

/// Fixed source battler domain, including inactive cells in singles.
pub const BATTLE_SCRIPT_REMOVEITEM_BATTLERS: [BattleScriptRemoveitemBattler;
    BATTLE_SCRIPT_REMOVEITEM_BATTLER_COUNT] = [
    BattleScriptRemoveitemBattler::Battler0,
    BattleScriptRemoveitemBattler::Battler1,
    BattleScriptRemoveitemBattler::Battler2,
    BattleScriptRemoveitemBattler::Battler3,
];

impl BattleScriptRemoveitemBattler {
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
pub enum BattleScriptRemoveitemSide {
    Player = 0,
    Opponent = 1,
}

impl BattleScriptRemoveitemSide {
    /// Zero-based source-array index.
    #[must_use]
    pub const fn index(self) -> usize {
        self as usize
    }
}

/// The complete per-battler projection read or written by this opcode.
/// `ability` and `marker` are salted noise siblings this command never reads
/// or writes; only `item` (read then written on the resolved battler) and
/// `side` / `party_index` (read to locate the party mirror) participate in
/// canonical evaluation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptRemoveitemBattlerState {
    pub side: BattleScriptRemoveitemSide,
    pub party_index: u8,
    pub item: u16,
    pub ability: u8,
    pub marker: u32,
}

/// One persistent party member's projection. `noise` is a salted sibling
/// this command never reads or writes; only `item` participates.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptRemoveitemPartyMember {
    pub item: u16,
    pub noise: u32,
}

/// Canonical selector bindings. Only `attacker` is ever read.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptRemoveitemRoles {
    pub attacker: Option<BattleScriptRemoveitemBattler>,
}

/// Complete narrow rules slice read or written by this command.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptRemoveitemRules {
    pub battlers: [BattleScriptRemoveitemBattlerState; BATTLE_SCRIPT_REMOVEITEM_BATTLER_COUNT],
    pub party: [[BattleScriptRemoveitemPartyMember; BATTLE_SCRIPT_REMOVEITEM_PARTY_SIZE]; 2],
    pub selector_roles: BattleScriptRemoveitemRoles,
    /// Source `gBattleScripting.battler` (`include/battle.h:668`). Modeled
    /// as optional -- unlike the production rules context, where this field
    /// is always populated -- purely to give this leaf's `BS_SCRIPTING`
    /// resolution the same "role may be absent" shape as every other
    /// `resolveRulesBattlerForBattleScript` selector.
    pub scripting_battler: Option<BattleScriptRemoveitemBattler>,
    pub used_held_items: [u16; BATTLE_SCRIPT_REMOVEITEM_BATTLER_COUNT],
    pub last_used_item: u16,
}

/// Scheduler projection carrying only the unique pending-controller list this
/// command appends to on success. Shape copied from `battle_script_tryrecycleitem`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptRemoveitemScheduler {
    pub pending_controller_battlers:
        [Option<BattleScriptRemoveitemBattler>; BATTLE_SCRIPT_REMOVEITEM_BATTLER_COUNT],
    pub pending_count: u8,
}

/// One source-macro operand retained for canonical shape validation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptRemoveitemOperand<'a> {
    pub width_bytes: u8,
    pub expression: &'a str,
}

/// Instruction projection used for both registration and execution. There is
/// no resolved-label field -- this instruction is 2 bytes with no pointer
/// operand and never jumps.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptRemoveitemInstruction<'a> {
    pub opcode_name: &'a str,
    pub program_counter: u32,
    pub opcode_id: u8,
    pub dispatcher: &'a str,
    pub operands: &'a [BattleScriptRemoveitemOperand<'a>],
}

/// The one dynamic opcode key emitted by successful registration.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptRemoveitemRegistration {
    pub opcode_id: u8,
}

/// Exact control directive emitted by the narrow opcode leaf. This command
/// never jumps -- there is no failure label -- so `Advance` is the sole
/// variant, kept as an enum for structural symmetry with the rest of the
/// Battle Script leaf family.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptRemoveitemControl {
    Advance,
}

/// The sole event this command ever emits, on the applied branch only.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptRemoveitemEvent {
    SetBattlerItem {
        battler: BattleScriptRemoveitemBattler,
        item: u16,
    },
}

/// Native twin of canonical `unsupportedBranch`'s halt reason
/// (`battleScriptHitChainOpcode.ts:717-738`): the machine's own
/// `programCounter`/`opcodeId`/`opcodeName`, plus this call site's fixed
/// `sourceFile`/`sourceLine` and the dynamic `sourceConstruct` -- exposed
/// here as its `selector_expression` component (`"<missing>"` when the
/// instruction supplied no operand at all) so the struct stays `Copy`;
/// `Display` reconstructs the exact canonical message.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptRemoveitemUnsupportedBranchReason<'a> {
    pub program_counter: u32,
    pub opcode_id: u8,
    pub opcode_name: &'a str,
    pub selector_expression: &'a str,
    pub source_file: &'static str,
    pub source_line: u32,
}

impl fmt::Display for BattleScriptRemoveitemUnsupportedBranchReason<'_> {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            formatter,
            "Cmd_removeitem's GetBattlerForBattleScript selector ({}) is unavailable",
            self.selector_expression
        )
    }
}

/// Complete immutable result of one execution: either the applied branch
/// (rules/scheduler/control/event) or the unsupported-branch halt, mirroring
/// the canonical handler's two-way `transitionBattleScriptCommand`
/// (advance) vs `unsupportedBranch` (halt) outcome.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptRemoveitemOutcome<'a> {
    Applied {
        rules: BattleScriptRemoveitemRules,
        scheduler: BattleScriptRemoveitemScheduler,
        control: BattleScriptRemoveitemControl,
        emitted_event: Option<BattleScriptRemoveitemEvent>,
    },
    UnsupportedBranch(BattleScriptRemoveitemUnsupportedBranchReason<'a>),
}

/// Exact observable registration errors in canonical evaluation order.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptRemoveitemRegistrationError {
    WrongCardinality { count: usize },
    InvalidInstructionShape { program_counter: u32 },
}

impl fmt::Display for BattleScriptRemoveitemRegistrationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::WrongCardinality { count } => write!(
                formatter,
                "B_SCR_OP_REMOVEITEM requires all 13 concrete starts, got {count}"
            ),
            Self::InvalidInstructionShape { program_counter } => write!(
                formatter,
                "invalid B_SCR_OP_REMOVEITEM shape at program counter {program_counter}"
            ),
        }
    }
}

impl std::error::Error for BattleScriptRemoveitemRegistrationError {}

/// Defensive-only structural error this leaf's execution can never reach
/// through the canonical corpus (every concrete party index is 0..=5); kept
/// so the same bound is checked here as in the sibling
/// `battle_script_tryrecycleitem` leaf rather than silently indexing out of
/// bounds on malformed test input.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptRemoveitemExecutionError {
    InvalidPartyIndex {
        side: BattleScriptRemoveitemSide,
        party_index: u8,
    },
}

impl fmt::Display for BattleScriptRemoveitemExecutionError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidPartyIndex { side, party_index } => write!(
                formatter,
                "Cmd_removeitem: invalid {side:?} party index {party_index}"
            ),
        }
    }
}

impl std::error::Error for BattleScriptRemoveitemExecutionError {}

fn resolve_selector_expression<'a>(operands: &[BattleScriptRemoveitemOperand<'a>]) -> &'a str {
    match operands.first() {
        Some(operand) => operand.expression,
        None => BATTLE_SCRIPT_REMOVEITEM_MISSING_SELECTOR_EXPRESSION,
    }
}

fn resolve_battler(
    selector_expression: &str,
    rules: &BattleScriptRemoveitemRules,
) -> Option<BattleScriptRemoveitemBattler> {
    match selector_expression {
        BATTLE_SCRIPT_REMOVEITEM_SELECTOR_BS_ATTACKER => rules.selector_roles.attacker,
        BATTLE_SCRIPT_REMOVEITEM_SELECTOR_BS_SCRIPTING => rules.scripting_battler,
        _ => None,
    }
}

/// Native projection of `createBattleScriptRemoveitemOpcodeHandlers`. Wrong
/// cardinality fails before shape inspection; every matching instruction is
/// then validated in program order, returning the first offender;
/// successful registration contains precisely one opcode key taken from the
/// first matching instruction.
pub fn register_battle_script_removeitem_handler<'a>(
    instructions: &[BattleScriptRemoveitemInstruction<'a>],
) -> Result<BattleScriptRemoveitemRegistration, BattleScriptRemoveitemRegistrationError> {
    let matching = instructions
        .iter()
        .filter(|instruction| instruction.opcode_name == BATTLE_SCRIPT_REMOVEITEM_OPCODE_NAME)
        .collect::<Vec<_>>();
    if matching.len() != BATTLE_SCRIPT_REMOVEITEM_CONCRETE_START_COUNT {
        return Err(BattleScriptRemoveitemRegistrationError::WrongCardinality {
            count: matching.len(),
        });
    }
    for instruction in &matching {
        let [operand] = instruction.operands else {
            return Err(
                BattleScriptRemoveitemRegistrationError::InvalidInstructionShape {
                    program_counter: instruction.program_counter,
                },
            );
        };
        let selector_ok = operand.expression == BATTLE_SCRIPT_REMOVEITEM_SELECTOR_BS_SCRIPTING
            || operand.expression == BATTLE_SCRIPT_REMOVEITEM_SELECTOR_BS_ATTACKER;
        if instruction.dispatcher != BATTLE_SCRIPT_REMOVEITEM_DISPATCHER
            || operand.width_bytes != BATTLE_SCRIPT_REMOVEITEM_SELECTOR_WIDTH_BYTES
            || !selector_ok
        {
            return Err(
                BattleScriptRemoveitemRegistrationError::InvalidInstructionShape {
                    program_counter: instruction.program_counter,
                },
            );
        }
    }
    Ok(BattleScriptRemoveitemRegistration { opcode_id: matching[0].opcode_id })
}

/// Native immutable-value twin of canonical `Cmd_removeitem`. There is no
/// per-execution shape re-check (unlike `Cmd_tryrecycleitem`'s handler) --
/// this function reads `instruction.operands.first()` exactly as the
/// canonical handler reads `context.instruction.operands[0]`, with no prior
/// validation. Selector resolution matches
/// `resolveRulesBattlerForBattleScript`: `BS_ATTACKER` reads the attacker
/// role, `BS_SCRIPTING` reads `scriptingBattler`; anything else (including a
/// missing operand) resolves to no battler. A resolved battler always
/// applies -- `usedHeldItems[battler]` unconditionally receives the
/// battler's current (pre-clear) active item, the active item and its
/// persistent party mirror clear to `ITEM_NONE`, the battler joins the
/// unique pending-controller list, and one held-item event is emitted.
/// `lastUsedItem` is never touched.
pub fn apply_battle_script_removeitem<'a>(
    instruction: BattleScriptRemoveitemInstruction<'a>,
    rules: &BattleScriptRemoveitemRules,
    scheduler: &BattleScriptRemoveitemScheduler,
) -> Result<BattleScriptRemoveitemOutcome<'a>, BattleScriptRemoveitemExecutionError> {
    let selector_expression = resolve_selector_expression(instruction.operands);
    let battler = resolve_battler(selector_expression, rules);

    let Some(battler) = battler else {
        return Ok(BattleScriptRemoveitemOutcome::UnsupportedBranch(
            BattleScriptRemoveitemUnsupportedBranchReason {
                program_counter: instruction.program_counter,
                opcode_id: instruction.opcode_id,
                opcode_name: instruction.opcode_name,
                selector_expression,
                source_file: BATTLE_SCRIPT_REMOVEITEM_UNSUPPORTED_SOURCE_FILE,
                source_line: BATTLE_SCRIPT_REMOVEITEM_UNSUPPORTED_SOURCE_LINE,
            },
        ));
    };

    let owner = rules.battlers[battler.index()];
    let party_index = usize::from(owner.party_index);
    if party_index >= BATTLE_SCRIPT_REMOVEITEM_PARTY_SIZE {
        return Err(BattleScriptRemoveitemExecutionError::InvalidPartyIndex {
            side: owner.side,
            party_index: owner.party_index,
        });
    }

    let mut next_rules = *rules;
    next_rules.used_held_items[battler.index()] = owner.item;
    next_rules.battlers[battler.index()].item = BATTLE_SCRIPT_REMOVEITEM_ITEM_NONE;
    next_rules.party[owner.side.index()][party_index].item = BATTLE_SCRIPT_REMOVEITEM_ITEM_NONE;

    let mut next_scheduler = *scheduler;
    let pending_count = usize::from(next_scheduler.pending_count);
    let already_pending =
        next_scheduler.pending_controller_battlers[..pending_count].contains(&Some(battler));
    if !already_pending {
        debug_assert!(pending_count < BATTLE_SCRIPT_REMOVEITEM_BATTLER_COUNT);
        next_scheduler.pending_controller_battlers[pending_count] = Some(battler);
        next_scheduler.pending_count += 1;
    }

    Ok(BattleScriptRemoveitemOutcome::Applied {
        rules: next_rules,
        scheduler: next_scheduler,
        control: BattleScriptRemoveitemControl::Advance,
        emitted_event: Some(BattleScriptRemoveitemEvent::SetBattlerItem {
            battler,
            item: BATTLE_SCRIPT_REMOVEITEM_ITEM_NONE,
        }),
    })
}

/// Independent source, dispatch, and body evidence.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptRemoveitemDecompDispatchEvidence {
    pub opcode_name: &'static str,
    pub opcode_id: u8,
    pub dispatcher: &'static str,
    pub dispatch_line: u32,
    pub forward_decl_line: u32,
    pub handler_line: u32,
    pub locals_line: u32,
    pub active_battler_line: u32,
    pub used_held_item_pointer_line: u32,
    pub write_used_held_item_line: u32,
    pub clear_item_line: u32,
    pub emit_line: u32,
    pub mark_pending_line: u32,
    pub advance_line: u32,
}

pub const BATTLE_SCRIPT_REMOVEITEM_DECOMP_DISPATCH_EVIDENCE:
    BattleScriptRemoveitemDecompDispatchEvidence = BattleScriptRemoveitemDecompDispatchEvidence {
    opcode_name: BATTLE_SCRIPT_REMOVEITEM_OPCODE_NAME,
    opcode_id: BATTLE_SCRIPT_REMOVEITEM_OPCODE,
    dispatcher: BATTLE_SCRIPT_REMOVEITEM_DISPATCHER,
    dispatch_line: 437,
    forward_decl_line: 185,
    handler_line: 5901,
    locals_line: 5903,
    active_battler_line: 5905,
    used_held_item_pointer_line: 5907,
    write_used_held_item_line: 5908,
    clear_item_line: 5909,
    emit_line: 5911,
    mark_pending_line: 5912,
    advance_line: 5914,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptRemoveitemMacroEvidence {
    pub declaration_line: u32,
    pub opcode_line: u32,
    pub battler_line: u32,
    pub encoded_width_bytes: u8,
}

pub const BATTLE_SCRIPT_REMOVEITEM_MACRO_EVIDENCE: BattleScriptRemoveitemMacroEvidence =
    BattleScriptRemoveitemMacroEvidence {
        declaration_line: 607,
        opcode_line: 608,
        battler_line: 609,
        encoded_width_bytes: BATTLE_SCRIPT_REMOVEITEM_ENCODED_WIDTH_BYTES,
    };

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptRemoveitemCallSiteEvidence {
    pub entry_label: &'static str,
    pub entry_label_line: u32,
    pub statement_line: u32,
    pub selector_expression: &'static str,
}

pub const BATTLE_SCRIPT_REMOVEITEM_CALL_SITE_EVIDENCE: [BattleScriptRemoveitemCallSiteEvidence;
    BATTLE_SCRIPT_REMOVEITEM_CONCRETE_START_COUNT] = [
    BattleScriptRemoveitemCallSiteEvidence {
        entry_label: "BattleScript_BerryCureParRet",
        entry_label_line: 4266,
        statement_line: 4271,
        selector_expression: "BS_SCRIPTING",
    },
    BattleScriptRemoveitemCallSiteEvidence {
        entry_label: "BattleScript_BerryCurePsnRet",
        entry_label_line: 4278,
        statement_line: 4283,
        selector_expression: "BS_SCRIPTING",
    },
    BattleScriptRemoveitemCallSiteEvidence {
        entry_label: "BattleScript_BerryCureBrnRet",
        entry_label_line: 4290,
        statement_line: 4295,
        selector_expression: "BS_SCRIPTING",
    },
    BattleScriptRemoveitemCallSiteEvidence {
        entry_label: "BattleScript_BerryCureFrzRet",
        entry_label_line: 4302,
        statement_line: 4307,
        selector_expression: "BS_SCRIPTING",
    },
    BattleScriptRemoveitemCallSiteEvidence {
        entry_label: "BattleScript_BerryCureSlpRet",
        entry_label_line: 4314,
        statement_line: 4319,
        selector_expression: "BS_SCRIPTING",
    },
    BattleScriptRemoveitemCallSiteEvidence {
        entry_label: "BattleScript_BerryCureConfusionRet",
        entry_label_line: 4326,
        statement_line: 4330,
        selector_expression: "BS_SCRIPTING",
    },
    BattleScriptRemoveitemCallSiteEvidence {
        entry_label: "BattleScript_BerryCureChosenStatusRet",
        entry_label_line: 4337,
        statement_line: 4342,
        selector_expression: "BS_SCRIPTING",
    },
    BattleScriptRemoveitemCallSiteEvidence {
        entry_label: "BattleScript_WhiteHerbRet",
        entry_label_line: 4349,
        statement_line: 4353,
        selector_expression: "BS_SCRIPTING",
    },
    BattleScriptRemoveitemCallSiteEvidence {
        entry_label: "BattleScript_ItemHealHP_RemoveItem",
        entry_label_line: 4356,
        statement_line: 4363,
        selector_expression: "BS_ATTACKER",
    },
    BattleScriptRemoveitemCallSiteEvidence {
        entry_label: "BattleScript_BerryPPHealEnd2",
        entry_label_line: 4366,
        statement_line: 4370,
        selector_expression: "BS_ATTACKER",
    },
    BattleScriptRemoveitemCallSiteEvidence {
        entry_label: "BattleScript_BerryConfuseHealEnd2",
        entry_label_line: 4396,
        statement_line: 4407,
        selector_expression: "BS_ATTACKER",
    },
    BattleScriptRemoveitemCallSiteEvidence {
        entry_label: "BattleScript_BerryStatRaiseDoStatUp",
        entry_label_line: 4413,
        statement_line: 4416,
        selector_expression: "BS_ATTACKER",
    },
    BattleScriptRemoveitemCallSiteEvidence {
        entry_label: "BattleScript_BerryFocusEnergyEnd2",
        entry_label_line: 4419,
        statement_line: 4423,
        selector_expression: "BS_ATTACKER",
    },
];

#[cfg(test)]
mod tests {
    use super::*;

    const SCRIPTING_OPERAND: [BattleScriptRemoveitemOperand<'static>; 1] =
        [BattleScriptRemoveitemOperand { width_bytes: 1, expression: "BS_SCRIPTING" }];
    const ATTACKER_OPERAND: [BattleScriptRemoveitemOperand<'static>; 1] =
        [BattleScriptRemoveitemOperand { width_bytes: 1, expression: "BS_ATTACKER" }];

    fn plain_battler(
        side: BattleScriptRemoveitemSide,
        party_index: u8,
        item: u16,
    ) -> BattleScriptRemoveitemBattlerState {
        BattleScriptRemoveitemBattlerState { side, party_index, item, ability: 7, marker: 0xabcd }
    }

    fn plain_member(item: u16) -> BattleScriptRemoveitemPartyMember {
        BattleScriptRemoveitemPartyMember { item, noise: 0x1234_5678 }
    }

    fn rules(
        attacker_item: u16,
        used_held_items: [u16; 4],
        attacker: Option<BattleScriptRemoveitemBattler>,
        scripting_battler: Option<BattleScriptRemoveitemBattler>,
        party_item: u16,
    ) -> BattleScriptRemoveitemRules {
        BattleScriptRemoveitemRules {
            battlers: [
                plain_battler(BattleScriptRemoveitemSide::Player, 0, attacker_item),
                plain_battler(BattleScriptRemoveitemSide::Opponent, 1, 9),
                plain_battler(BattleScriptRemoveitemSide::Player, 2, 8),
                plain_battler(BattleScriptRemoveitemSide::Opponent, 3, 7),
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
            selector_roles: BattleScriptRemoveitemRoles { attacker },
            scripting_battler,
            used_held_items,
            last_used_item: 77,
        }
    }

    fn scheduler(pending: &[BattleScriptRemoveitemBattler]) -> BattleScriptRemoveitemScheduler {
        let mut cells = [None; 4];
        for (index, battler) in pending.iter().enumerate() {
            cells[index] = Some(*battler);
        }
        BattleScriptRemoveitemScheduler {
            pending_controller_battlers: cells,
            pending_count: pending.len() as u8,
        }
    }

    fn instruction<'a>(
        operands: &'a [BattleScriptRemoveitemOperand<'a>],
    ) -> BattleScriptRemoveitemInstruction<'a> {
        BattleScriptRemoveitemInstruction {
            opcode_name: BATTLE_SCRIPT_REMOVEITEM_OPCODE_NAME,
            program_counter: 4321,
            opcode_id: BATTLE_SCRIPT_REMOVEITEM_OPCODE,
            dispatcher: BATTLE_SCRIPT_REMOVEITEM_DISPATCHER,
            operands,
        }
    }

    #[test]
    fn bs_attacker_resolves_attacker_role() {
        let attacker = Some(BattleScriptRemoveitemBattler::Battler0);
        let input = rules(139, [0, 9, 8, 7], attacker, None, 139);
        let outcome =
            apply_battle_script_removeitem(instruction(&ATTACKER_OPERAND), &input, &scheduler(&[]))
                .expect("attacker resolves");
        match outcome {
            BattleScriptRemoveitemOutcome::Applied { rules, .. } => {
                assert_eq!(rules.battlers[0].item, 0);
                assert_eq!(rules.used_held_items[0], 139);
            }
            other => panic!("expected applied outcome, got {other:?}"),
        }
    }

    #[test]
    fn bs_scripting_resolves_scripting_battler() {
        let scripting = Some(BattleScriptRemoveitemBattler::Battler2);
        let input = rules(0, [0, 9, 0, 7], None, scripting, 55);
        let outcome = apply_battle_script_removeitem(
            instruction(&SCRIPTING_OPERAND),
            &input,
            &scheduler(&[]),
        )
        .expect("scripting resolves");
        match outcome {
            BattleScriptRemoveitemOutcome::Applied { rules, .. } => {
                assert_eq!(rules.battlers[2].item, 0);
                assert_eq!(rules.used_held_items[2], 8);
            }
            other => panic!("expected applied outcome, got {other:?}"),
        }
    }

    #[test]
    fn missing_attacker_role_halts_unsupported() {
        let input = rules(0, [0, 9, 8, 7], None, None, 0);
        let outcome =
            apply_battle_script_removeitem(instruction(&ATTACKER_OPERAND), &input, &scheduler(&[]))
                .expect("no crash on missing role");
        match outcome {
            BattleScriptRemoveitemOutcome::UnsupportedBranch(reason) => {
                assert_eq!(reason.selector_expression, "BS_ATTACKER");
                assert_eq!(reason.source_line, 5905);
                assert_eq!(
                    reason.to_string(),
                    "Cmd_removeitem's GetBattlerForBattleScript selector (BS_ATTACKER) is unavailable"
                );
            }
            other => panic!("expected unsupported-branch, got {other:?}"),
        }
    }

    #[test]
    fn missing_scripting_battler_role_halts_unsupported() {
        let input = rules(0, [0, 9, 8, 7], None, None, 0);
        let outcome = apply_battle_script_removeitem(
            instruction(&SCRIPTING_OPERAND),
            &input,
            &scheduler(&[]),
        )
        .expect("no crash on missing role");
        match outcome {
            BattleScriptRemoveitemOutcome::UnsupportedBranch(reason) => {
                assert_eq!(reason.selector_expression, "BS_SCRIPTING");
                assert_eq!(
                    reason.to_string(),
                    "Cmd_removeitem's GetBattlerForBattleScript selector (BS_SCRIPTING) is unavailable"
                );
            }
            other => panic!("expected unsupported-branch, got {other:?}"),
        }
    }

    #[test]
    fn unconditional_overwrite_replaces_zero_used_held_item_cell() {
        let attacker = Some(BattleScriptRemoveitemBattler::Battler0);
        let input = rules(0, [0, 9, 8, 7], attacker, None, 0);
        let outcome =
            apply_battle_script_removeitem(instruction(&ATTACKER_OPERAND), &input, &scheduler(&[]))
                .expect("clean success");
        match outcome {
            BattleScriptRemoveitemOutcome::Applied { rules, .. } => {
                assert_eq!(rules.used_held_items, [0, 9, 8, 7]);
                assert_eq!(rules.last_used_item, 77, "lastUsedItem is never touched");
            }
            other => panic!("expected applied outcome, got {other:?}"),
        }
    }

    #[test]
    fn party_identity_path_and_untouched_siblings() {
        let attacker = Some(BattleScriptRemoveitemBattler::Battler0);
        let input = rules(0, [0, 9, 8, 7], attacker, None, 0);
        let outcome =
            apply_battle_script_removeitem(instruction(&ATTACKER_OPERAND), &input, &scheduler(&[]))
                .expect("clean success");
        match outcome {
            BattleScriptRemoveitemOutcome::Applied { rules, .. } => {
                assert_eq!(rules.party[0][0].item, 0);
                assert_eq!(rules.party[0][0].noise, 0x1234_5678);
                assert_eq!(rules.battlers[0].ability, 7);
                assert_eq!(rules.battlers[1].item, 9);
            }
            other => panic!("expected applied outcome, got {other:?}"),
        }
    }

    #[test]
    fn pending_controller_append_happens_once() {
        let attacker = Some(BattleScriptRemoveitemBattler::Battler0);
        let input = rules(139, [0, 9, 8, 7], attacker, None, 139);
        let outcome =
            apply_battle_script_removeitem(instruction(&ATTACKER_OPERAND), &input, &scheduler(&[]))
                .expect("clean success");
        match outcome {
            BattleScriptRemoveitemOutcome::Applied { scheduler, .. } => {
                assert_eq!(
                    scheduler.pending_controller_battlers[0],
                    Some(BattleScriptRemoveitemBattler::Battler0)
                );
                assert_eq!(scheduler.pending_count, 1);
            }
            other => panic!("expected applied outcome, got {other:?}"),
        }
        let already = scheduler(&[BattleScriptRemoveitemBattler::Battler0]);
        let idempotent =
            apply_battle_script_removeitem(instruction(&ATTACKER_OPERAND), &input, &already)
                .expect("idempotent success");
        match idempotent {
            BattleScriptRemoveitemOutcome::Applied { scheduler, .. } => {
                assert_eq!(scheduler, already);
            }
            other => panic!("expected applied outcome, got {other:?}"),
        }
    }

    #[test]
    fn missing_operand_reports_missing_selector_expression() {
        let input = rules(0, [0, 9, 8, 7], None, None, 0);
        let outcome = apply_battle_script_removeitem(instruction(&[]), &input, &scheduler(&[]))
            .expect("no crash on missing operand");
        match outcome {
            BattleScriptRemoveitemOutcome::UnsupportedBranch(reason) => {
                assert_eq!(reason.selector_expression, "<missing>");
            }
            other => panic!("expected unsupported-branch, got {other:?}"),
        }
    }

    #[test]
    fn out_of_domain_party_index_is_a_defensive_error() {
        let attacker = Some(BattleScriptRemoveitemBattler::Battler0);
        let mut input = rules(139, [0, 9, 8, 7], attacker, None, 139);
        input.battlers[0].party_index = 6;
        let error =
            apply_battle_script_removeitem(instruction(&ATTACKER_OPERAND), &input, &scheduler(&[]))
                .expect_err("out-of-domain party index rejected");
        assert_eq!(
            error.to_string(),
            "Cmd_removeitem: invalid Player party index 6"
        );
    }

    #[test]
    fn registration_accepts_thirteen_starts_and_rejects_wrong_cardinality_and_shape() {
        let starts: Vec<BattleScriptRemoveitemInstruction<'static>> = (0..13)
            .map(|index| {
                let operands: &'static [BattleScriptRemoveitemOperand<'static>] = if index % 2 == 0
                {
                    &SCRIPTING_OPERAND
                } else {
                    &ATTACKER_OPERAND
                };
                BattleScriptRemoveitemInstruction {
                    opcode_name: BATTLE_SCRIPT_REMOVEITEM_OPCODE_NAME,
                    program_counter: 100 + index,
                    opcode_id: BATTLE_SCRIPT_REMOVEITEM_OPCODE,
                    dispatcher: BATTLE_SCRIPT_REMOVEITEM_DISPATCHER,
                    operands,
                }
            })
            .collect();
        assert_eq!(
            register_battle_script_removeitem_handler(&starts)
                .expect("thirteen starts register")
                .opcode_id,
            BATTLE_SCRIPT_REMOVEITEM_OPCODE
        );
        assert_eq!(
            register_battle_script_removeitem_handler(&starts[..12])
                .expect_err("twelve starts")
                .to_string(),
            "B_SCR_OP_REMOVEITEM requires all 13 concrete starts, got 12"
        );
        let mut bad = starts.clone();
        bad[5] =
            BattleScriptRemoveitemInstruction { dispatcher: "Cmd_settypetoenvironment", ..bad[5] };
        assert_eq!(
            register_battle_script_removeitem_handler(&bad)
                .expect_err("shape offender reported")
                .to_string(),
            "invalid B_SCR_OP_REMOVEITEM shape at program counter 105"
        );
    }

    #[test]
    fn battler_ids_round_trip_from_u8() {
        for battler in BATTLE_SCRIPT_REMOVEITEM_BATTLERS {
            assert_eq!(
                BattleScriptRemoveitemBattler::from_u8(battler.as_u8()),
                Some(battler)
            );
        }
        assert_eq!(BattleScriptRemoveitemBattler::from_u8(4), None);
    }
}
