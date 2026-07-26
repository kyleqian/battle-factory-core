/**
 * Screens/weather registration slice 1 (docs/screens-weather-ground-truth.md
 * §1a/§2/§6 item 1): `B_SCR_OP_SETREFLECT` / `SETLIGHTSCREEN` / `SETSAFEGUARD`
 * / `SETMIST` -- `Cmd_setreflect:6697` / `Cmd_setlightscreen:7468` /
 * `Cmd_setsafeguard:8652` / `Cmd_setmist:7732`. Four pure, zero-operand,
 * branchless-of-RNG setters sharing one shape: fail if already active (the
 * side's own SIDE_STATUS_* bit for reflect/lightscreen/safeguard; the raw
 * `mistTimer` value itself for Mist -- its one differently-shaped guard, doc
 * §2), else write the bit + a fresh 5-turn timer + the setting battler's id
 * (`gSideTimers[side].reflectBattlerId = gBattlerAttacker` etc.) --
 * `DoFieldEndTurnEffects`' own end-turn cases read that id back to reassign
 * BS_ATTACKER for the wear-off script (doc §3a).
 *
 * The double-battle message variant (`B_MSG_SET_REFLECT_DOUBLE` /
 * `B_MSG_SET_LIGHTSCREEN_DOUBLE`, gated on `BATTLE_TYPE_DOUBLE &&
 * CountAliveMonsInBattle(...) == 2`) is genuinely unreachable at Factory L50
 * singles (doc §6 item 6, explicitly out of scope) -- always the SINGLE
 * chooser value on success. Source-complete (a): every branch either fails
 * or succeeds, no unmodeled sub-case, so no `unsupported-branch` barrier.
 */
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import type { BattleScriptProgram } from "./battleScriptProgram.ts";
import {
  BATTLE_SCRIPT_MOVE_RESULT_FAILED,
  BATTLE_SCRIPT_MOVE_RESULT_MISSED,
} from "./battleScriptSourceConstants.ts";
import type {
  BattleScriptRulesContext,
  BattleScriptSideTimerState,
} from "./battleScriptRulesContext.ts";

/** include/constants/battle.h:210-217. */
const SIDE_STATUS_REFLECT = 1 << 0;
const SIDE_STATUS_LIGHTSCREEN = 1 << 1;
const SIDE_STATUS_SAFEGUARD = 1 << 5;
const SIDE_STATUS_MIST = 1 << 8;

/** battle_message.c:952-1051 -- MULTISTRING_CHOOSER indices, singles-only rows. */
const B_MSG_SIDE_STATUS_FAILED = 0;
const B_MSG_SET_REFLECT_SINGLE = 1;
const B_MSG_SET_LIGHTSCREEN_SINGLE = 3;
const B_MSG_SET_SAFEGUARD = 5;
const B_MSG_SET_MIST = 0;
const B_MSG_MIST_FAILED = 1;

function requireAttacker(rules: BattleScriptRulesContext): 0 | 1 | 2 | 3 {
  const attacker = rules.selectorRoles.attacker;
  if (attacker === null) throw new Error("Cmd_set<sidestatus> requires an attacker role");
  return attacker;
}

function withSideTimers(
  rules: BattleScriptRulesContext,
  side: 0 | 1,
  changes: Partial<BattleScriptSideTimerState>,
): readonly [BattleScriptSideTimerState, BattleScriptSideTimerState] {
  const next = [...rules.sideTimers] as [BattleScriptSideTimerState, BattleScriptSideTimerState];
  next[side] = Object.freeze({ ...next[side], ...changes });
  return Object.freeze(next) as readonly [BattleScriptSideTimerState, BattleScriptSideTimerState];
}

function withSideStatusBit(
  rules: BattleScriptRulesContext,
  side: 0 | 1,
  bit: number,
): readonly [number, number] {
  const next = [...rules.sideStatuses] as [number, number];
  next[side] = (next[side] | bit) >>> 0;
  return Object.freeze(next) as readonly [number, number];
}

function withoutSideStatusBits(
  rules: BattleScriptRulesContext,
  side: 0 | 1,
  bits: number,
): readonly [number, number] {
  const next = [...rules.sideStatuses] as [number, number];
  next[side] = (next[side] & ~bits) >>> 0;
  return Object.freeze(next) as readonly [number, number];
}

type SetSideStatusConfig = Readonly<{
  isActive: (rules: BattleScriptRulesContext, side: 0 | 1) => boolean;
  failFlag: number;
  failChooser: number;
  successChooser: number;
  applySuccess: (
    rules: BattleScriptRulesContext,
    side: 0 | 1,
    attacker: 0 | 1 | 2 | 3,
  ) => BattleScriptRulesContext;
}>;

function createSetSideStatusHandler(
  config: SetSideStatusConfig,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const rules = context.state.rulesContext;
    const attacker = requireAttacker(rules);
    const side = rules.battlers[attacker].side;
    const nextRules = config.isActive(rules, side)
      ? Object.freeze({
        ...rules,
        moveResultFlags: (rules.moveResultFlags | config.failFlag) >>> 0,
        multistringChooser: config.failChooser,
      })
      : Object.freeze({
        ...config.applySuccess(rules, side, attacker),
        multistringChooser: config.successChooser,
      });
    return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }), { rulesContext: nextRules });
  };
}

const REFLECT_CONFIG: SetSideStatusConfig = Object.freeze({
  isActive: (rules, side) => (rules.sideStatuses[side] & SIDE_STATUS_REFLECT) !== 0,
  failFlag: BATTLE_SCRIPT_MOVE_RESULT_MISSED,
  failChooser: B_MSG_SIDE_STATUS_FAILED,
  successChooser: B_MSG_SET_REFLECT_SINGLE,
  applySuccess: (rules, side, attacker) => Object.freeze({
    ...rules,
    sideStatuses: withSideStatusBit(rules, side, SIDE_STATUS_REFLECT),
    sideTimers: withSideTimers(rules, side, { reflectTimer: 5, reflectBattlerId: attacker }),
  }),
});

const LIGHTSCREEN_CONFIG: SetSideStatusConfig = Object.freeze({
  isActive: (rules, side) => (rules.sideStatuses[side] & SIDE_STATUS_LIGHTSCREEN) !== 0,
  failFlag: BATTLE_SCRIPT_MOVE_RESULT_MISSED,
  failChooser: B_MSG_SIDE_STATUS_FAILED,
  successChooser: B_MSG_SET_LIGHTSCREEN_SINGLE,
  applySuccess: (rules, side, attacker) => Object.freeze({
    ...rules,
    sideStatuses: withSideStatusBit(rules, side, SIDE_STATUS_LIGHTSCREEN),
    sideTimers: withSideTimers(rules, side, { lightscreenTimer: 5, lightscreenBattlerId: attacker }),
  }),
});

const SAFEGUARD_CONFIG: SetSideStatusConfig = Object.freeze({
  isActive: (rules, side) => (rules.sideStatuses[side] & SIDE_STATUS_SAFEGUARD) !== 0,
  failFlag: BATTLE_SCRIPT_MOVE_RESULT_MISSED,
  failChooser: B_MSG_SIDE_STATUS_FAILED,
  successChooser: B_MSG_SET_SAFEGUARD,
  applySuccess: (rules, side, attacker) => Object.freeze({
    ...rules,
    sideStatuses: withSideStatusBit(rules, side, SIDE_STATUS_SAFEGUARD),
    sideTimers: withSideTimers(rules, side, { safeguardTimer: 5, safeguardBattlerId: attacker }),
  }),
});

const MIST_CONFIG: SetSideStatusConfig = Object.freeze({
  isActive: (rules, side) => rules.mistTimers[side] !== 0,
  failFlag: BATTLE_SCRIPT_MOVE_RESULT_FAILED,
  failChooser: B_MSG_MIST_FAILED,
  successChooser: B_MSG_SET_MIST,
  applySuccess: (rules, side, attacker) => {
    const mistTimers = [...rules.mistTimers] as [number, number];
    mistTimers[side] = 5;
    return Object.freeze({
      ...rules,
      mistTimers: Object.freeze(mistTimers) as readonly [number, number],
      sideTimers: withSideTimers(rules, side, { mistBattlerId: attacker }),
      sideStatuses: withSideStatusBit(rules, side, SIDE_STATUS_MIST),
    });
  },
});

/**
 * Cmd_removelightscreenreflect (battle_script_commands.c:9883-9903) --
 * Brick Break's own opener, the sole concrete call site
 * (data/battle_scripts_1.s:2423). Clears the *opposing* side's Reflect/
 * Light Screen (bit + timer) if either is active, else leaves them
 * untouched -- reuses the exact sideStatuses/sideTimers fields the
 * SETREFLECT/SETLIGHTSCREEN setters above already model.
 * `gBattleScripting.animTurn`/`.animTargetsHit` are written unconditionally
 * on both branches (1/1 when cleared, 0/0 otherwise). Despite the source
 * comment framing these as animation-branch-selection only, Brick Break's
 * own script reads `animTurn` back through a real
 * `jumpifbyte CMP_EQUAL, sB_ANIM_TURN, 0` branch gating a
 * `bicbyte gMoveResultFlags, MOVE_RESULT_MISSED | MOVE_RESULT_DOESNT_AFFECT_FOE`
 * -- breaking a screen also forcibly clears any Levitate-immunity miss flag
 * typecalc may have set moments earlier (verified by reading both the
 * script and Cmd_attackanimation's own `animTurn++`, battle_script_commands.c
 * :1786/1789, which runs between removelightscreenreflect and the second
 * `jumpifbyte CMP_LESS_THAN, sB_ANIM_TURN, 2` -- so the "wall shattered"
 * print is reachable in singles too when a screen actually broke, 1->2 after
 * the increment, not dead as an earlier scouting pass assumed). `jumpifbyte`/
 * `bicbyte`/`printstring`/`waitmessage` are all already generically
 * registered, so this opcode's own job is only the correct animTurn/
 * animTargetsHit write -- the rest wires itself.
 */
export const removelightscreenreflectOpcodeHandler: BattleScriptOpcodeHandler<BattleScriptRulesContext> = (
  context,
) => {
  const rules = context.state.rulesContext;
  const side = rules.battlers[requireAttacker(rules)].side;
  const opposingSide = (side === 0 ? 1 : 0) as 0 | 1;
  const timers = rules.sideTimers[opposingSide];
  const screensActive = timers.reflectTimer !== 0 || timers.lightscreenTimer !== 0;

  const nextRules = screensActive
    ? Object.freeze({
      ...rules,
      sideStatuses: withoutSideStatusBits(rules, opposingSide, SIDE_STATUS_REFLECT | SIDE_STATUS_LIGHTSCREEN),
      sideTimers: withSideTimers(rules, opposingSide, { reflectTimer: 0, lightscreenTimer: 0 }),
      animTurn: 1,
      animTargetsHit: 1,
    })
    : Object.freeze({ ...rules, animTurn: 0, animTargetsHit: 0 });

  return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }), { rulesContext: nextRules });
};

function registerSingleInstruction(
  program: BattleScriptProgram,
  opcodeName: string,
  handler: BattleScriptOpcodeHandler<BattleScriptRulesContext>,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const starts = program.instructions.filter((instruction) => instruction.opcodeName === opcodeName);
  if (starts.length !== 1) {
    throw new Error(`${opcodeName} requires exactly 1 concrete start, got ${starts.length}`);
  }
  const [instruction] = starts;
  if (instruction!.operands.length !== 0) {
    throw new Error(`invalid ${opcodeName} shape at program counter ${instruction!.programCounter}`);
  }
  return Object.freeze({ [instruction!.opcodeId]: handler });
}

export function createBattleScriptSetSideStatusOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  return Object.freeze({
    ...registerSingleInstruction(program, "B_SCR_OP_SETREFLECT", createSetSideStatusHandler(REFLECT_CONFIG)),
    ...registerSingleInstruction(program, "B_SCR_OP_SETLIGHTSCREEN", createSetSideStatusHandler(LIGHTSCREEN_CONFIG)),
    ...registerSingleInstruction(program, "B_SCR_OP_SETSAFEGUARD", createSetSideStatusHandler(SAFEGUARD_CONFIG)),
    ...registerSingleInstruction(program, "B_SCR_OP_SETMIST", createSetSideStatusHandler(MIST_CONFIG)),
    ...registerSingleInstruction(
      program,
      "B_SCR_OP_REMOVELIGHTSCREENREFLECT",
      removelightscreenreflectOpcodeHandler,
    ),
  });
}
