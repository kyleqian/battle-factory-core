//! Pure `B_SCR_OP_ACCURACYCHECK` (0x1, `Cmd_accuracycheck`) -- PART 1 OF 2
//! (M86): only the no-roll BYPASS paths (`NO_ACC_CALC_CHECK_LOCK_ON`,
//! `NO_ACC_CALC`), the module skeleton, and registration. The three
//! full-formula operand forms (`ACC_CURR_MOVE`, `MOVE_FUTURE_SIGHT`,
//! `MOVE_DOOM_DESIRE` -- protect gate, lock-on, hitmarker ladder, weather
//! bypasses, the rng roll, and the hit/miss tails) are the NEXT step (M87)
//! and resolve to [`BattleScriptAccuracycheckOutcome::FullFormulaPathPending`]
//! here, never a TS-parity claim.
//!
//! Source authority: `reference/pokeemerald/src/battle_script_commands.c`
//! -- `Cmd_accuracycheck` :1099-1189 (bypass branch :1103-1113),
//! `JumpIfMoveFailed` :1009-1025, `JumpIfMoveAffectedByProtect` :1041-1052,
//! `DEFENDER_IS_PROTECTED` :57; dispatch row :332 (`//0x1`), forward decl
//! :80; `include/constants/battle_script_commands.h:7` (enum position);
//! `asm/macros/battle_script.inc:6-10` (`accuracycheck failPtr:req,
//! move:req`, operand widths 4/2); `include/constants/battle.h:160`
//! (`STATUS3_ALWAYS_HITS`), `:163/:164/:175`
//! (`STATUS3_ON_AIR`/`STATUS3_UNDERGROUND`/`STATUS3_UNDERWATER`), `:220`
//! (`MOVE_RESULT_MISSED`); `include/constants/pokemon.h:209`
//! (`FLAG_PROTECT_AFFECTED`, encoded into `gen_tables::MoveRow.flags`
//! verbatim by `gen-data.mjs`'s `moveFlagBits` OR-reduction). Committed
//! census (grepped from `reference/pokeemerald/data/battle_scripts_1.s`):
//! 66 sites total -- 55 `ACC_CURR_MOVE`, 8 `NO_ACC_CALC_CHECK_LOCK_ON`, 1
//! `NO_ACC_CALC`, 1 `MOVE_FUTURE_SIGHT`, 1 `MOVE_DOOM_DESIRE`.
//!
//! TS spec: `src/engine/battleScriptHitChainOpcode.ts` --
//! `accuracycheckOpcodeHandler` :1131-1158 (operand dispatch FIRST, before
//! any role/state read -- a bad move operand Halts even with no roles
//! bound), `accuracycheckNoAccCalc` :1080-1117 (the bypass ladder: (a)
//! lock-on-only sure-hit, (b) bare semi-invulnerable jump -- source's own
//! `JumpIfMoveAffectedByProtect` is never reached down that sub-branch, so
//! no flags/missType/history write happens here, unlike (c) -- (c)
//! `JumpIfMoveAffectedByProtect(0)`'s Protect gate, which reads
//! `gCurrentMove` regardless of the literal `0` argument), `isDefenderProtected`/
//! `moveHasProtectFlag` :827-840 (an unknown move resolves to NO flags, not
//! an error -- `MOVE_FLAGS_BY_ID.get(move) ?? []`), `jumpToMissTarget`
//! :849-871, `withClearedLandedMove` :807-819, `requireBattlerRole`
//! :787-794, registration `install("B_SCR_OP_ACCURACYCHECK",
//! accuracycheckOpcodeHandler)` inside `createBattleScriptHitChainOpcodeHandlers`
//! (:4708-4713: find the FIRST committed instruction, no other validation).
//!
//! Registration owns neither a dispatcher check nor an operand-shape check
//! -- a DEVIATION from every recent sibling that DOES validate at
//! registration (`battle_script_type_curse.rs`'s eager-with-label-
//! prevalidation, `battle_script_semi_invulnerable.rs`'s dispatcher+operand
//! shape check): this leaf mirrors `battle_script_tryko.rs`/
//! `battle_script_typecalc.rs`'s find-first-only convention instead. Label
//! resolution is LAZY and taken-only, exactly like `battle_script_tryko.rs`
//! and `battle_script_type_curse.rs`'s jump family: the caller resolves the
//! fail-label expression against the committed program and reports the
//! result on the execution input; `None` becomes `"accuracycheck: committed
//! program has no label <expr>"` only when the branch that needs it is
//! actually taken.
//!
//! This leaf owns neither the WASM ABI, RNG, scheduler/controller state,
//! nor presentation.

use core::fmt;

use crate::gen_tables::MOVES;

pub const BATTLE_SCRIPT_ACCURACYCHECK_SOURCE_FILE: &str = "battle_script_commands.c";
pub const BATTLE_SCRIPT_ACCURACYCHECK_OPCODE: u8 = 0x01;
pub const BATTLE_SCRIPT_ACCURACYCHECK_OPCODE_NAME: &str = "B_SCR_OP_ACCURACYCHECK";
pub const BATTLE_SCRIPT_ACCURACYCHECK_DISPATCHER: &str = "Cmd_accuracycheck";
/// Committed census (`data/battle_scripts_1.s`, grepped): 66 total -- 55
/// `ACC_CURR_MOVE`, 8 `NO_ACC_CALC_CHECK_LOCK_ON`, 1 `NO_ACC_CALC`, 1
/// `MOVE_FUTURE_SIGHT`, 1 `MOVE_DOOM_DESIRE`.
pub const BATTLE_SCRIPT_ACCURACYCHECK_CONCRETE_START_COUNT: usize = 66;

/// Source `MAX_BATTLERS_COUNT`; all source-indexed state retains four cells.
pub const BATTLE_SCRIPT_ACCURACYCHECK_BATTLER_COUNT: usize = 4;

/// `include/constants/battle.h:160`.
pub const BATTLE_SCRIPT_ACCURACYCHECK_STATUS3_ALWAYS_HITS: u32 = (1 << 3) | (1 << 4);
/// `include/constants/battle.h:163`.
pub const BATTLE_SCRIPT_ACCURACYCHECK_STATUS3_ON_AIR: u32 = 1 << 6;
/// `include/constants/battle.h:164`.
pub const BATTLE_SCRIPT_ACCURACYCHECK_STATUS3_UNDERGROUND: u32 = 1 << 7;
/// `include/constants/battle.h:175`.
pub const BATTLE_SCRIPT_ACCURACYCHECK_STATUS3_UNDERWATER: u32 = 1 << 18;
/// `include/constants/battle.h:220`.
pub const BATTLE_SCRIPT_ACCURACYCHECK_MOVE_RESULT_MISSED: u32 = 1 << 0;
/// `battleScriptSourceConstants.ts:214` (`B_MSG_PROTECTED`).
pub const BATTLE_SCRIPT_ACCURACYCHECK_B_MSG_PROTECTED: u8 = 1;
/// `include/constants/pokemon.h:209`; encoded into `gen_tables::MoveRow.flags`
/// verbatim (OR-reduction of `moveFlagBits` in `gen-data.mjs`).
pub const BATTLE_SCRIPT_ACCURACYCHECK_FLAG_PROTECT_AFFECTED: u8 = 1 << 1;
/// `include/constants/moves.h:252`.
pub const BATTLE_SCRIPT_ACCURACYCHECK_MOVE_FUTURE_SIGHT: u16 = 248;
/// `include/constants/moves.h:357`.
pub const BATTLE_SCRIPT_ACCURACYCHECK_MOVE_DOOM_DESIRE: u16 = 353;

/// Complete source battler-id domain used by roles and source-indexed
/// battler state.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptAccuracycheckBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

impl BattleScriptAccuracycheckBattler {
    #[must_use]
    pub const fn index(self) -> usize {
        self as usize
    }

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

/// The narrow per-battler projection the bypass ladder reads.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptAccuracycheckBattlerState {
    pub status3: u32,
    /// `ProtectStruct::protected`, 0|1.
    pub protected: u8,
    /// `gDisableStructs[battler].battlerWithSureHit`, always a valid
    /// 0..=3 battler id (TS default 0).
    pub battler_with_sure_hit: u8,
}

/// `withClearedLandedMove`'s twin source arrays
/// (`battleScriptHitChainOpcode.ts:807-819`).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptAccuracycheckMoveHistory {
    pub last_landed_moves: [u16; BATTLE_SCRIPT_ACCURACYCHECK_BATTLER_COUNT],
    pub last_hit_by_type: [u16; BATTLE_SCRIPT_ACCURACYCHECK_BATTLER_COUNT],
}

/// Canonical selector bindings, checked attacker-then-target.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptAccuracycheckRoles {
    pub attacker: Option<BattleScriptAccuracycheckBattler>,
    pub target: Option<BattleScriptAccuracycheckBattler>,
}

/// Complete narrow rules slice the bypass ladder reads or writes.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptAccuracycheckRules {
    pub battlers:
        [BattleScriptAccuracycheckBattlerState; BATTLE_SCRIPT_ACCURACYCHECK_BATTLER_COUNT],
    /// `gCurrentMove` -- read by `isDefenderProtected` regardless of the
    /// bypass form's own literal operand.
    pub current_move: u16,
    pub move_result_flags: u32,
    pub miss_type: u8,
    pub move_history: BattleScriptAccuracycheckMoveHistory,
    pub selector_roles: BattleScriptAccuracycheckRoles,
}

/// One committed-program instruction, used ONLY for registration (find the
/// FIRST match by `opcode_name`; no shape or cardinality validation).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptAccuracycheckInstruction<'a> {
    pub opcode_name: &'a str,
    pub opcode_id: u8,
    pub program_counter: u32,
}

/// `committed Battle Script program does not emit B_SCR_OP_ACCURACYCHECK`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptAccuracycheckRegistrationError {
    pub opcode_name: &'static str,
}

impl fmt::Display for BattleScriptAccuracycheckRegistrationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            formatter,
            "committed Battle Script program does not emit {}",
            self.opcode_name
        )
    }
}

impl std::error::Error for BattleScriptAccuracycheckRegistrationError {}

/// Native projection of the `install("B_SCR_OP_ACCURACYCHECK", ...)` line
/// inside `createBattleScriptHitChainOpcodeHandlers`: find the FIRST
/// instruction with this opcode name -- no shape or cardinality validation.
pub fn register_battle_script_accuracycheck<'a>(
    instructions: &[BattleScriptAccuracycheckInstruction<'a>],
) -> Result<u8, BattleScriptAccuracycheckRegistrationError> {
    instructions
        .iter()
        .find(|instruction| instruction.opcode_name == BATTLE_SCRIPT_ACCURACYCHECK_OPCODE_NAME)
        .map(|instruction| instruction.opcode_id)
        .ok_or(BattleScriptAccuracycheckRegistrationError {
            opcode_name: BATTLE_SCRIPT_ACCURACYCHECK_OPCODE_NAME,
        })
}

/// Execution input: the raw operand-1 (move) expression, the operand-0
/// (fail label) expression retained for error rendering, and the fail
/// label's LAZY, already-resolved program counter (`None` means the
/// committed program has no such label) -- consulted only by the two
/// sub-branches that actually jump.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptAccuracycheckExecution<'a> {
    pub program_counter: u32,
    pub opcode_id: u8,
    /// `None` renders as `"<missing>"`, matching the TS
    /// `moveOperand?.expression ?? "<missing>"` fallback.
    pub move_operand_expression: Option<&'a str>,
    pub fail_label_expression: &'a str,
    pub resolved_fail_program_counter: Option<u32>,
}

/// Mirrors canonical `unsupportedBranch`'s reason object verbatim.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BattleScriptAccuracycheckHalt {
    pub program_counter: u32,
    pub opcode_id: u8,
    pub opcode_name: &'static str,
    pub source_construct: String,
    pub source_file: &'static str,
    pub source_line: u32,
}

/// Exact observable non-error outcomes.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BattleScriptAccuracycheckOutcome {
    Advance {
        rules: BattleScriptAccuracycheckRules,
    },
    Jump {
        program_counter: u32,
        rules: BattleScriptAccuracycheckRules,
    },
    Halt(BattleScriptAccuracycheckHalt),
    /// M87 replaces this: `ACC_CURR_MOVE`/`MOVE_FUTURE_SIGHT`/
    /// `MOVE_DOOM_DESIRE` all resolve here, unmodeled. NOT a TS-parity
    /// claim -- covered only by native unit tests, never generator vectors.
    FullFormulaPathPending {
        expression: String,
    },
}

/// Exact observable errors in canonical evaluation order.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BattleScriptAccuracycheckError {
    /// `requireBattlerRole(rulesContext, "attacker")`.
    MissingAttackerRole,
    /// `requireBattlerRole(rulesContext, "target")`.
    MissingTargetRole,
    /// `resolveBattleScriptLabel(program, expression)` returning nothing,
    /// for whichever of the ladder's two jump sub-branches was taken.
    UnresolvedFailTarget { expression: String },
}

impl fmt::Display for BattleScriptAccuracycheckError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::MissingAttackerRole => write!(
                formatter,
                "Battle Script hit-chain command requires a attacker role"
            ),
            Self::MissingTargetRole => write!(
                formatter,
                "Battle Script hit-chain command requires a target role"
            ),
            Self::UnresolvedFailTarget { expression } => write!(
                formatter,
                "accuracycheck: committed program has no label {expression}"
            ),
        }
    }
}

impl std::error::Error for BattleScriptAccuracycheckError {}

fn move_has_protect_flag(move_id: u16) -> bool {
    MOVES
        .get(usize::from(move_id))
        .map(|row| row.flags & BATTLE_SCRIPT_ACCURACYCHECK_FLAG_PROTECT_AFFECTED != 0)
        .unwrap_or(false)
}

/// `Cmd_accuracycheck`'s `DEFENDER_IS_PROTECTED` gate
/// (`battle_script_commands.c:57`), shared by both the bypass ladder here
/// and (in M87) the full-formula path. An unknown `move` resolves to "not
/// affected", never an error -- matching `MOVE_FLAGS_BY_ID.get(move) ?? []`.
#[must_use]
pub fn is_defender_protected(target: &BattleScriptAccuracycheckBattlerState, move_id: u16) -> bool {
    target.protected == 1 && move_has_protect_flag(move_id)
}

fn clear_landed_move(
    history: BattleScriptAccuracycheckMoveHistory,
    target: BattleScriptAccuracycheckBattler,
) -> BattleScriptAccuracycheckMoveHistory {
    let mut next = history;
    next.last_landed_moves[target.index()] = 0;
    next.last_hit_by_type[target.index()] = 0;
    next
}

/// Native twin of `accuracycheckNoAccCalc`
/// (`battleScriptHitChainOpcode.ts:1080-1117`). See the module doc comment
/// for the exact (a) < (b) < (c) precedence and the `checksLockOn`
/// asymmetry (bare `NO_ACC_CALC` never compares `battlerWithSureHit`).
fn accuracycheck_no_acc_calc(
    execution: &BattleScriptAccuracycheckExecution<'_>,
    rules: &BattleScriptAccuracycheckRules,
    checks_lock_on: bool,
) -> Result<BattleScriptAccuracycheckOutcome, BattleScriptAccuracycheckError> {
    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptAccuracycheckError::MissingAttackerRole)?;
    let target = rules
        .selector_roles
        .target
        .ok_or(BattleScriptAccuracycheckError::MissingTargetRole)?;
    let target_state = rules.battlers[target.index()];

    if checks_lock_on
        && (target_state.status3 & BATTLE_SCRIPT_ACCURACYCHECK_STATUS3_ALWAYS_HITS) != 0
        && target_state.battler_with_sure_hit == attacker.as_u8()
    {
        return Ok(BattleScriptAccuracycheckOutcome::Advance { rules: *rules });
    }

    let semi_invulnerable_mask = BATTLE_SCRIPT_ACCURACYCHECK_STATUS3_ON_AIR
        | BATTLE_SCRIPT_ACCURACYCHECK_STATUS3_UNDERGROUND
        | BATTLE_SCRIPT_ACCURACYCHECK_STATUS3_UNDERWATER;
    if (target_state.status3 & semi_invulnerable_mask) != 0 {
        let program_counter = execution.resolved_fail_program_counter.ok_or_else(|| {
            BattleScriptAccuracycheckError::UnresolvedFailTarget {
                expression: execution.fail_label_expression.to_string(),
            }
        })?;
        return Ok(BattleScriptAccuracycheckOutcome::Jump { program_counter, rules: *rules });
    }

    if is_defender_protected(&target_state, rules.current_move) {
        let program_counter = execution.resolved_fail_program_counter.ok_or_else(|| {
            BattleScriptAccuracycheckError::UnresolvedFailTarget {
                expression: execution.fail_label_expression.to_string(),
            }
        })?;
        let mut next = *rules;
        next.move_result_flags |= BATTLE_SCRIPT_ACCURACYCHECK_MOVE_RESULT_MISSED;
        next.miss_type = BATTLE_SCRIPT_ACCURACYCHECK_B_MSG_PROTECTED;
        next.move_history = clear_landed_move(next.move_history, target);
        return Ok(BattleScriptAccuracycheckOutcome::Jump { program_counter, rules: next });
    }

    Ok(BattleScriptAccuracycheckOutcome::Advance { rules: *rules })
}

/// Native twin of `accuracycheckOpcodeHandler`
/// (`battleScriptHitChainOpcode.ts:1131-1158`). Dispatches on the move
/// operand FIRST, before any role or state read.
///
/// # Errors
/// See [`BattleScriptAccuracycheckError`] for the exact ordered error set
/// (only reachable down the two bypass forms).
pub fn apply_battle_script_accuracycheck(
    execution: &BattleScriptAccuracycheckExecution<'_>,
    rules: &BattleScriptAccuracycheckRules,
) -> Result<BattleScriptAccuracycheckOutcome, BattleScriptAccuracycheckError> {
    match execution.move_operand_expression {
        Some("NO_ACC_CALC_CHECK_LOCK_ON") => accuracycheck_no_acc_calc(execution, rules, true),
        Some("NO_ACC_CALC") => accuracycheck_no_acc_calc(execution, rules, false),
        Some(expression @ ("ACC_CURR_MOVE" | "MOVE_FUTURE_SIGHT" | "MOVE_DOOM_DESIRE")) => {
            Ok(BattleScriptAccuracycheckOutcome::FullFormulaPathPending {
                expression: expression.to_string(),
            })
        }
        other => Ok(BattleScriptAccuracycheckOutcome::Halt(
            BattleScriptAccuracycheckHalt {
                program_counter: execution.program_counter,
                opcode_id: execution.opcode_id,
                opcode_name: BATTLE_SCRIPT_ACCURACYCHECK_OPCODE_NAME,
                source_construct: format!(
                "Cmd_accuracycheck's non-ACC_CURR_MOVE move argument ({}) -- this registered path \
                 supports ACC_CURR_MOVE plus Future Sight/Doom Desire's explicit literals",
                other.unwrap_or("<missing>")
            ),
                source_file: BATTLE_SCRIPT_ACCURACYCHECK_SOURCE_FILE,
                source_line: 1103,
            },
        )),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn battler_state() -> BattleScriptAccuracycheckBattlerState {
        BattleScriptAccuracycheckBattlerState { status3: 0, protected: 0, battler_with_sure_hit: 0 }
    }

    fn rules() -> BattleScriptAccuracycheckRules {
        BattleScriptAccuracycheckRules {
            battlers: [
                battler_state(),
                battler_state(),
                battler_state(),
                battler_state(),
            ],
            current_move: 33, // MOVE_TACKLE, FLAG_PROTECT_AFFECTED
            move_result_flags: 0,
            miss_type: 0,
            move_history: BattleScriptAccuracycheckMoveHistory {
                last_landed_moves: [1, 2, 3, 4],
                last_hit_by_type: [5, 6, 7, 8],
            },
            selector_roles: BattleScriptAccuracycheckRoles {
                attacker: Some(BattleScriptAccuracycheckBattler::Battler0),
                target: Some(BattleScriptAccuracycheckBattler::Battler1),
            },
        }
    }

    fn execution() -> BattleScriptAccuracycheckExecution<'static> {
        BattleScriptAccuracycheckExecution {
            program_counter: 100,
            opcode_id: BATTLE_SCRIPT_ACCURACYCHECK_OPCODE,
            move_operand_expression: Some("NO_ACC_CALC_CHECK_LOCK_ON"),
            fail_label_expression: "BattleScript_ButItFailed",
            resolved_fail_program_counter: Some(9000),
        }
    }

    #[test]
    fn is_defender_protected_both_directions() {
        let mut target = battler_state();
        assert!(!is_defender_protected(&target, 33), "not protected yet");
        target.protected = 1;
        assert!(
            is_defender_protected(&target, 33),
            "protected + flagged move"
        );
        assert!(
            !is_defender_protected(&target, 14),
            "protected but SWORDS_DANCE has no protect flag"
        );
        assert!(
            !is_defender_protected(&target, 60_000),
            "unknown move resolves not-affected, not an error"
        );
    }

    #[test]
    fn lock_on_beats_semi_invulnerable_beats_protect() {
        // (a) lock-on wins even with semi-invuln AND protect also true.
        let mut r = rules();
        r.battlers[1].status3 = BATTLE_SCRIPT_ACCURACYCHECK_STATUS3_ALWAYS_HITS
            | BATTLE_SCRIPT_ACCURACYCHECK_STATUS3_ON_AIR;
        r.battlers[1].battler_with_sure_hit = 0;
        r.battlers[1].protected = 1;
        let outcome = apply_battle_script_accuracycheck(&execution(), &r).unwrap();
        assert!(matches!(
            outcome,
            BattleScriptAccuracycheckOutcome::Advance { .. }
        ));

        // (b) semi-invulnerable beats (c) protect: bare jump, zero writes.
        let mut r2 = rules();
        r2.battlers[1].status3 = BATTLE_SCRIPT_ACCURACYCHECK_STATUS3_UNDERGROUND;
        r2.battlers[1].protected = 1;
        match apply_battle_script_accuracycheck(&execution(), &r2).unwrap() {
            BattleScriptAccuracycheckOutcome::Jump { program_counter, rules: out } => {
                assert_eq!(program_counter, 9000);
                assert_eq!(out, r2, "bare jump must not touch flags/missType/history");
            }
            other => panic!("expected jump, got {other:?}"),
        }
    }

    #[test]
    fn checks_lock_on_asymmetry() {
        // NO_ACC_CALC (checksLockOn=false) ignores a live sure-hit match and
        // still falls through to the semi-invulnerable check.
        let mut r = rules();
        r.battlers[1].status3 = BATTLE_SCRIPT_ACCURACYCHECK_STATUS3_ALWAYS_HITS
            | BATTLE_SCRIPT_ACCURACYCHECK_STATUS3_UNDERWATER;
        r.battlers[1].battler_with_sure_hit = 0;
        let mut execution = execution();
        execution.move_operand_expression = Some("NO_ACC_CALC");
        match apply_battle_script_accuracycheck(&execution, &r).unwrap() {
            BattleScriptAccuracycheckOutcome::Jump { program_counter, .. } => {
                assert_eq!(program_counter, 9000);
            }
            other => panic!("expected jump, got {other:?}"),
        }
    }

    #[test]
    fn protect_miss_writes_flags_misstype_and_clears_only_target_history() {
        let mut r = rules();
        r.battlers[1].protected = 1;
        match apply_battle_script_accuracycheck(&execution(), &r).unwrap() {
            BattleScriptAccuracycheckOutcome::Jump { program_counter, rules: out } => {
                assert_eq!(program_counter, 9000);
                assert_eq!(
                    out.move_result_flags,
                    BATTLE_SCRIPT_ACCURACYCHECK_MOVE_RESULT_MISSED
                );
                assert_eq!(out.miss_type, BATTLE_SCRIPT_ACCURACYCHECK_B_MSG_PROTECTED);
                assert_eq!(out.move_history.last_landed_moves, [1, 0, 3, 4]);
                assert_eq!(out.move_history.last_hit_by_type, [5, 0, 7, 8]);
            }
            other => panic!("expected jump, got {other:?}"),
        }
    }

    #[test]
    fn protect_unflagged_move_and_unprotected_flagged_move_both_advance() {
        let mut r = rules();
        r.battlers[1].protected = 1;
        r.current_move = 14; // MOVE_SWORDS_DANCE, no FLAG_PROTECT_AFFECTED
        let outcome = apply_battle_script_accuracycheck(&execution(), &r).unwrap();
        assert!(matches!(
            outcome,
            BattleScriptAccuracycheckOutcome::Advance { .. }
        ));

        let r2 = rules(); // protected == 0, flagged move
        let outcome2 = apply_battle_script_accuracycheck(&execution(), &r2).unwrap();
        assert!(matches!(
            outcome2,
            BattleScriptAccuracycheckOutcome::Advance { .. }
        ));
    }

    #[test]
    fn role_errors_attacker_before_target() {
        let mut r = rules();
        r.selector_roles.attacker = None;
        r.selector_roles.target = None;
        let error = apply_battle_script_accuracycheck(&execution(), &r).unwrap_err();
        assert_eq!(error, BattleScriptAccuracycheckError::MissingAttackerRole);
        assert_eq!(
            error.to_string(),
            "Battle Script hit-chain command requires a attacker role"
        );

        let mut r2 = rules();
        r2.selector_roles.target = None;
        assert_eq!(
            apply_battle_script_accuracycheck(&execution(), &r2).unwrap_err(),
            BattleScriptAccuracycheckError::MissingTargetRole
        );
    }

    #[test]
    fn unresolved_fail_target_on_both_jump_sub_branches() {
        let mut execution = execution();
        execution.resolved_fail_program_counter = None;

        let mut r = rules();
        r.battlers[1].status3 = BATTLE_SCRIPT_ACCURACYCHECK_STATUS3_ON_AIR;
        assert_eq!(
            apply_battle_script_accuracycheck(&execution, &r)
                .unwrap_err()
                .to_string(),
            "accuracycheck: committed program has no label BattleScript_ButItFailed"
        );

        let mut r2 = rules();
        r2.battlers[1].protected = 1;
        assert_eq!(
            apply_battle_script_accuracycheck(&execution, &r2)
                .unwrap_err()
                .to_string(),
            "accuracycheck: committed program has no label BattleScript_ButItFailed"
        );
    }

    #[test]
    fn unsupported_branch_for_unknown_literal_and_missing_operand() {
        let r = rules();
        let mut execution = execution();
        execution.move_operand_expression = Some("SOME_UNKNOWN_LITERAL");
        match apply_battle_script_accuracycheck(&execution, &r).unwrap() {
            BattleScriptAccuracycheckOutcome::Halt(halt) => {
                assert_eq!(
                    halt.source_construct,
                    "Cmd_accuracycheck's non-ACC_CURR_MOVE move argument (SOME_UNKNOWN_LITERAL) -- \
                     this registered path supports ACC_CURR_MOVE plus Future Sight/Doom Desire's \
                     explicit literals"
                );
            }
            other => panic!("expected halt, got {other:?}"),
        }

        execution.move_operand_expression = None;
        match apply_battle_script_accuracycheck(&execution, &r).unwrap() {
            BattleScriptAccuracycheckOutcome::Halt(halt) => {
                assert!(halt.source_construct.contains("(<missing>)"));
            }
            other => panic!("expected halt, got {other:?}"),
        }
    }

    #[test]
    fn full_formula_path_pending_for_all_three_staged_forms() {
        let r = rules();
        for literal in ["ACC_CURR_MOVE", "MOVE_FUTURE_SIGHT", "MOVE_DOOM_DESIRE"] {
            let mut execution = execution();
            execution.move_operand_expression = Some(literal);
            match apply_battle_script_accuracycheck(&execution, &r).unwrap() {
                BattleScriptAccuracycheckOutcome::FullFormulaPathPending { expression } => {
                    assert_eq!(expression, literal);
                }
                other => panic!("expected FullFormulaPathPending, got {other:?}"),
            }
        }
    }

    #[test]
    fn registration_find_first_ignores_later_duplicates() {
        let instructions = [
            BattleScriptAccuracycheckInstruction {
                opcode_name: BATTLE_SCRIPT_ACCURACYCHECK_OPCODE_NAME,
                opcode_id: BATTLE_SCRIPT_ACCURACYCHECK_OPCODE,
                program_counter: 10,
            },
            BattleScriptAccuracycheckInstruction {
                opcode_name: BATTLE_SCRIPT_ACCURACYCHECK_OPCODE_NAME,
                opcode_id: 0xee,
                program_counter: 20,
            },
        ];
        assert_eq!(
            register_battle_script_accuracycheck(&instructions).unwrap(),
            BATTLE_SCRIPT_ACCURACYCHECK_OPCODE
        );
        assert_eq!(
            register_battle_script_accuracycheck(&[])
                .unwrap_err()
                .to_string(),
            "committed Battle Script program does not emit B_SCR_OP_ACCURACYCHECK"
        );
    }

    #[test]
    fn battler_ids_round_trip() {
        for value in 0u8..4 {
            assert_eq!(
                BattleScriptAccuracycheckBattler::from_u8(value)
                    .unwrap()
                    .as_u8(),
                value
            );
        }
        assert_eq!(BattleScriptAccuracycheckBattler::from_u8(4), None);
    }
}
