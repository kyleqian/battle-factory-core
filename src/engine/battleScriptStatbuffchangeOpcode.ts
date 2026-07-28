/**
 * The primary-effect stat-change route (docs/primary-stat-ground-truth.md):
 * `B_SCR_OP_STATBUFFCHANGE` (`Cmd_statbuffchange`, battle_script_commands.c:
 * 7100-7105), `B_SCR_OP_SETGRAPHICALSTATCHANGEVALUES` (`Cmd_
 * setgraphicalstatchangevalues`, :4088-4109), `B_SCR_OP_PLAYANIMATION`
 * (`Cmd_playanimation`, :4004-4040, registered for B_ANIM_STATS_CHANGE --
 * the only animType `BattleScript_EffectStatUp`/`EffectStatDown` ever pass,
 * source-confirmed the unconditional first-checked branch regardless of
 * HITMARKER_NO_ANIMATIONS/semi-invulnerability -- plus B_ANIM_RAIN_CONTINUES/
 * B_ANIM_SUN_CONTINUES for the end-turn weather field loop's own continues
 * scripts, see `createPlayanimationOpcodeHandler`'s own doc for the branch
 * this widening ports), `B_SCR_OP_JUMPIFSTATUS2`
 * (`Cmd_jumpifstatus2`, :3093-3103, the DOWN family's Substitute early-out,
 * `EFFECT_CONFUSE`'s already-confused check, and -- docs/yawn-thrash-endturn-
 * design.md §3, Rung 4 -- `BattleScript_EffectRampage`'s own
 * already-locked-in STATUS2_MULTIPLETURNS skip),
 * and `B_SCR_OP_ORBYTE` (`Cmd_orbyte`, :3864-3869, only reachable via
 * ChangeStatBuffs' own Protect branch -> BattleScript_ButItFailed).
 *
 * `Cmd_statbuffchange` itself is a thin wrapper: `gBattleScripting.
 * statChanger` (already populated by the earlier `setstatchanger`/setbyte
 * instruction, B_SCR_OP_SETBYTE, already registered) supplies statId/
 * direction/magnitude; this opcode's own two bytecode operands are `flags`
 * (a real script-authored byte) and `jumpptr` (a real jump target) -- the
 * "adjacent registration" docs/stat-change-confusion-ground-truth.md S1.1
 * deferred. All 31 concrete call sites pass STAT_CHANGE_ALLOW_PTR set (see
 * STATBUFFCHANGE_FLAG_BITS below), so `changeStatBuffs`' "blocked-silent"
 * outcome is structurally unreachable on this route -- defensively thrown,
 * not silently mishandled.
 */
import type { BattleScriptBattlerId } from "./battleScriptEvents.ts";
import {
  resolveBattleScriptLabel,
  type BattleScriptProgram,
} from "./battleScriptProgram.ts";
import {
  markBattleScriptControllerPending,
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import {
  changeStatBuffs,
  MOVE_EFFECT_AFFECTS_USER,
  MOVE_EFFECT_CERTAIN,
  STAT_CHANGE_ALLOW_PTR,
  STAT_CHANGE_NOT_PROTECT_AFFECTED,
} from "./battleScriptStatBuffs.ts";
import type {
  BattleScriptControllerIdlePort,
  BattleScriptBattlerSelectorResolverPort,
} from "./battleScriptSourceCommands.ts";
import { unsupportedBranch } from "./battleScriptHitChainOpcode.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";

/** include/battle.h:309-310, include/constants/battle_script_commands.h:371-372 -- every bit a concrete statbuffchange flags operand names. */
const STATBUFFCHANGE_FLAG_BITS: ReadonlyMap<string, number> = new Map([
  ["MOVE_EFFECT_AFFECTS_USER", MOVE_EFFECT_AFFECTS_USER],
  ["MOVE_EFFECT_CERTAIN", MOVE_EFFECT_CERTAIN],
  ["STAT_CHANGE_ALLOW_PTR", STAT_CHANGE_ALLOW_PTR],
  ["STAT_CHANGE_NOT_PROTECT_AFFECTED", STAT_CHANGE_NOT_PROTECT_AFFECTED],
]);

function resolveStatbuffchangeFlags(expression: string): number | null {
  let result = 0;
  for (const term of expression.split("|")) {
    const bit = STATBUFFCHANGE_FLAG_BITS.get(term.trim());
    if (bit === undefined) return null;
    result |= bit;
  }
  return result >>> 0;
}

function requireBattlerRole(
  rulesContext: BattleScriptRulesContext,
  role: "attacker" | "target",
): BattleScriptBattlerId {
  const value = rulesContext.selectorRoles[role];
  if (value === null) throw new Error(`Battle Script statbuffchange command requires a ${role} role`);
  return value;
}

function createStatbuffchangeOpcodeHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const [flagsOperand, ptrOperand] = context.instruction.operands;
    const flags = resolveStatbuffchangeFlags(flagsOperand!.expression);
    const jumpTarget = resolveBattleScriptLabel(context.program, ptrOperand!.expression);
    if (flags === null || !jumpTarget) {
      throw new Error(`validated B_SCR_OP_STATBUFFCHANGE became undecodable at ${context.state.programCounter}`);
    }

    const rulesContext = context.state.rulesContext;
    const attacker = requireBattlerRole(rulesContext, "attacker");
    const target = requireBattlerRole(rulesContext, "target");
    const statChanger = rulesContext.statChanger;
    const statId = statChanger & 0xf;
    const magnitude = ((statChanger >> 4) & 0x7) as 1 | 2;
    const direction = (statChanger & 0x80) !== 0 ? "decrease" as const : "increase" as const;

    const outcome = changeStatBuffs(context, {
      attacker,
      target,
      currentMove: rulesContext.currentMove,
      statId,
      direction,
      magnitude,
      flags,
      jumpProgramCounter: jumpTarget.programCounter,
    });

    if (outcome.kind === "resolved") return outcome.transition;
    if (outcome.kind === "blocked-silent") {
      throw new Error(
        "Cmd_statbuffchange: changeStatBuffs returned blocked-silent, but every concrete "
          + "statbuffchange call site sets STAT_CHANGE_ALLOW_PTR -- unreachable in the real topology",
      );
    }
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      { rulesContext: outcome.rulesContext, events: outcome.events },
    );
  };
}

/** battle_anim.h:195-198. */
const STAT_ANIM_PLUS1 = 14;
const STAT_ANIM_PLUS2 = 38;
const STAT_ANIM_MINUS1 = 21;
const STAT_ANIM_MINUS2 = 45;

function createSetgraphicalstatchangevaluesOpcodeHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const rulesContext = context.state.rulesContext;
    const statChanger = rulesContext.statChanger;
    const valueSelector = statChanger & 0xf0;
    let value: number;
    switch (valueSelector) {
      case 0x10: value = STAT_ANIM_PLUS1 + 1; break;
      case 0x20: value = STAT_ANIM_PLUS2 + 1; break;
      case 0x90: value = STAT_ANIM_MINUS1 + 1; break;
      case 0xa0: value = STAT_ANIM_MINUS2 + 1; break;
      default: value = 0; break;
    }
    const statId = statChanger & 0xf;
    const animArg1 = (statId + value - 1) & 0xffff;
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      { rulesContext: Object.freeze({ ...rulesContext, animArg1 }) },
    );
  };
}

/**
 * Widened beyond the B_ANIM_STATS_CHANGE arm (docs/end-turn-ground-truth.md
 * F7/F9, docs/screens-weather-ground-truth.md §6 slice 4) to also cover
 * B_ANIM_RAIN_CONTINUES/B_ANIM_SUN_CONTINUES -- `BattleScript_
 * RainContinuesOrEnds`/`SunlightContinues`'s own `playanimation BS_ATTACKER,
 * B_ANIM_RAIN_CONTINUES`/`SUN_CONTINUES` (no third operand supplied, so the
 * macro's `arg=NULL` default is what's actually encoded -- NOT
 * `sB_ANIM_ARG1`, confirmed against `src/data/gen/battle-script-program.json`'s
 * own parsed operands for both call sites).
 *
 * Source (`battle_script_commands.c:4004-4043`) branches on animType in this
 * order: (1) STATS_CHANGE/SNATCH_MOVE/SUBSTITUTE_FADE emit unconditionally;
 * (2) else if HITMARKER_NO_ANIMATIONS, push+`BattleScript_Pausex20` (skip);
 * (3) else if RAIN_CONTINUES/SUN_CONTINUES/SANDSTORM_CONTINUES/
 * HAIL_CONTINUES, emit -- this branch is reached only when
 * HITMARKER_NO_ANIMATIONS is clear, and (unlike the final "else" branch)
 * bypasses the STATUS3_SEMI_INVULNERABLE skip entirely. This engine never
 * sets HITMARKER_NO_ANIMATIONS anywhere (no production code path ORs that
 * bit in -- confirmed by grep; docs/battle-move-anim-notes.md and
 * docs/battle-turn-notes.md disagree on whether a real save's Battle-Scene-
 * OFF option keeps it set for a whole battle, an unresolved tension this
 * registration does not need to settle), so branch (2) is unreachable given
 * this engine's current state model and branch (3) is the one this handler
 * ports -- same "emit, bypass semi-invulnerable" shape already established
 * for SANDSTORM_CONTINUES/HAIL_CONTINUES's own PLAYANIMATION_VAR handler
 * (`battleScriptDamagingWeatherOpcode.ts`'s `createPlayanimationVarHandler`).
 * The animation argument (`*argumentPtr`, dereferenced from the encoded NULL
 * pointer) is decorative-only for this non-presentation engine; emitted with
 * an empty `arguments` array, matching that same sibling handler's
 * `WEATHER_VAR` precedent.
 *
 * Any other animType (e.g. B_ANIM_SMOKEBALL_ESCAPE, B_ANIM_SNATCH_MOVE) still
 * barriers rather than approximating the other branches.
 */
const PLAYANIMATION_ANIM_TYPES: ReadonlyMap<
  string,
  Readonly<{ argExpression: string; animationId: string; readsAnimArg1: boolean }>
> = new Map([
  ["B_ANIM_STATS_CHANGE", { argExpression: "sB_ANIM_ARG1", animationId: "STATS_CHANGE", readsAnimArg1: true }],
  ["B_ANIM_RAIN_CONTINUES", { argExpression: "NULL", animationId: "RAIN_CONTINUES", readsAnimArg1: false }],
  ["B_ANIM_SUN_CONTINUES", { argExpression: "NULL", animationId: "SUN_CONTINUES", readsAnimArg1: false }],
  /**
   * docs/ingrain-leechseed-wrap-ground-truth.md §2a/§2b/§2c -- Ingrain's own
   * `playanimation BS_ATTACKER, B_ANIM_INGRAIN_HEAL` (no third operand, `arg`
   * defaults to NULL, the same shape as RAIN/SUN_CONTINUES above); Leech
   * Seed's/Wrap's own end-turn scripts both pass `sB_ANIM_ARG1` explicitly,
   * the same shape as B_ANIM_STATS_CHANGE.
   */
  ["B_ANIM_INGRAIN_HEAL", { argExpression: "NULL", animationId: "INGRAIN_HEAL", readsAnimArg1: false }],
  ["B_ANIM_LEECH_SEED_DRAIN", { argExpression: "sB_ANIM_ARG1", animationId: "LEECH_SEED_DRAIN", readsAnimArg1: true }],
  ["B_ANIM_TURN_TRAP", { argExpression: "sB_ANIM_ARG1", animationId: "TURN_TRAP", readsAnimArg1: true }],
  /** BattleScript_WishComesTrue's delayed-heal presentation command. */
  ["B_ANIM_WISH_HEAL", { argExpression: "NULL", animationId: "WISH_HEAL", readsAnimArg1: false }],
  /**
   * docs/endturn-abilities-items-ground-truth.md §1c/§5 slice 4 -- every
   * `ITEMEFFECT_NORMAL` end2 script (Leftovers/White Herb/all 8 cure
   * berries) opens with `playanimation BS_ATTACKER|BS_SCRIPTING,
   * B_ANIM_HELD_ITEM_EFFECT` (no third operand, same NULL-arg shape as
   * B_ANIM_INGRAIN_HEAL).
   */
  ["B_ANIM_HELD_ITEM_EFFECT", { argExpression: "NULL", animationId: "HELD_ITEM_EFFECT", readsAnimArg1: false }],
]);

function createPlayanimationOpcodeHandler(
  isControllerIdle: BattleScriptControllerIdlePort<BattleScriptRulesContext>,
  resolveBattlerForBattleScript: BattleScriptBattlerSelectorResolverPort<BattleScriptRulesContext>,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    if (!isControllerIdle(context)) {
      return transitionBattleScriptCommand(
        context,
        Object.freeze({
          kind: "block",
          reason: Object.freeze({
            kind: "controller-busy",
            programCounter: context.state.programCounter,
            opcodeId: context.instruction.opcodeId,
            opcodeName: context.instruction.opcodeName,
          }),
        }),
      );
    }
    const [battlerOperand, animTypeOperand, argOperand] = context.instruction.operands;
    const animType = PLAYANIMATION_ANIM_TYPES.get(animTypeOperand!.expression);
    if (!animType) {
      return unsupportedBranch(
        context,
        `Cmd_playanimation's animType ${animTypeOperand!.expression} is not registered`,
        "battle_script_commands.c",
        4011,
      );
    }
    if (argOperand!.expression !== animType.argExpression) {
      return unsupportedBranch(
        context,
        `Cmd_playanimation's argument operand ${argOperand!.expression} is not ${animType.argExpression} `
          + `for animType ${animTypeOperand!.expression}`,
        "battle_script_commands.c",
        4009,
      );
    }
    const battler = resolveBattlerForBattleScript(context, battlerOperand!);
    if (battler === null) {
      return transitionBattleScriptCommand(
        context,
        Object.freeze({
          kind: "block",
          reason: Object.freeze({
            kind: "source-context-unavailable",
            programCounter: context.state.programCounter,
            opcodeId: context.instruction.opcodeId,
            opcodeName: context.instruction.opcodeName,
            port: "resolve-battler-for-battle-script",
            operandExpression: battlerOperand!.expression,
          }),
        }),
      );
    }
    const eventArguments = animType.readsAnimArg1
      ? Object.freeze([String(context.state.rulesContext.animArg1)])
      : Object.freeze([]);
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      {
        scheduler: markBattleScriptControllerPending(context.state.scheduler, battler),
        events: Object.freeze([
          Object.freeze({
            kind: "animation" as const,
            animationId: animType.animationId,
            battler,
            arguments: eventArguments,
          }),
        ]),
      },
    );
  };
}

/** include/constants/battle.h:216 -- STATUS2_SUBSTITUTE = 1 << 24. The DOWN family's Substitute early-out is the only concrete jumpifstatus2 value this registration needs (matches BATTLE_SCRIPT_STATUS2_SUBSTITUTE elsewhere; declared locally to avoid an import cycle through battleScriptRulesContext.ts, which itself imports this module). */
const STATUS2_SUBSTITUTE = 1 << 24;
/** include/constants/battle.h:129 -- STATUS2_CONFUSION = 1<<0 | 1<<1 | 1<<2. EFFECT_CONFUSE's own already-confused check (docs/status-cluster-ground-truth.md); matches BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_CONFUSION elsewhere, declared locally for the same import-cycle reason as STATUS2_SUBSTITUTE above. */
const STATUS2_CONFUSION = 0x7;
/**
 * include/constants/battle.h:139 -- STATUS2_MULTIPLETURNS = 1<<12.
 * `BattleScript_EffectRampage`'s own already-locked-in skip
 * (`jumpifstatus2 BS_ATTACKER, STATUS2_MULTIPLETURNS, BattleScript_
 * EffectRampage2`, docs/yawn-thrash-endturn-design.md §3, Rung 4) --
 * a real gap the design doc's own opcode census missed (it checked that
 * `Cmd_jumpifstatus2` the OPCODE was registered, not that this specific
 * operand VALUE was in the narrowed set; without this entry every
 * Thrash/Outrage/Petal Dance script hits this instruction's own
 * unsupported-branch barrier on its very first use, before
 * `confuseifrepeatingattackends` is ever reached). Matches
 * BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS elsewhere, declared
 * locally for the same import-cycle reason as STATUS2_SUBSTITUTE above.
 */
const STATUS2_MULTIPLETURNS = 1 << 12;
const JUMPIFSTATUS2_VALUES: ReadonlyMap<string, number> = new Map([
  ["STATUS2_SUBSTITUTE", STATUS2_SUBSTITUTE],
  ["STATUS2_CONFUSION", STATUS2_CONFUSION],
  ["STATUS2_MULTIPLETURNS", STATUS2_MULTIPLETURNS],
]);

function createJumpifstatus2OpcodeHandler(
  resolveBattlerForBattleScript: BattleScriptBattlerSelectorResolverPort<BattleScriptRulesContext>,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const [battlerOperand, statusOperand, ptrOperand] = context.instruction.operands;
    const mask = JUMPIFSTATUS2_VALUES.get(statusOperand!.expression);
    if (mask === undefined) {
      return unsupportedBranch(
        context,
        `Cmd_jumpifstatus2's status2 value ${statusOperand!.expression} is outside the registered set`,
        "battle_script_commands.c",
        3096,
      );
    }
    const battler = resolveBattlerForBattleScript(context, battlerOperand!);
    if (battler === null) {
      return transitionBattleScriptCommand(
        context,
        Object.freeze({
          kind: "block",
          reason: Object.freeze({
            kind: "source-context-unavailable",
            programCounter: context.state.programCounter,
            opcodeId: context.instruction.opcodeId,
            opcodeName: context.instruction.opcodeName,
            port: "resolve-battler-for-battle-script",
            operandExpression: battlerOperand!.expression,
          }),
        }),
      );
    }
    const battlerState = context.state.rulesContext.battlers[battler];
    const shouldJump = (battlerState.status2 & mask) !== 0 && battlerState.hp !== 0;
    if (!shouldJump) {
      return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
    }
    const target = resolveBattleScriptLabel(context.program, ptrOperand!.expression);
    if (!target) throw new Error(`Cmd_jumpifstatus2: unresolved jump target ${ptrOperand!.expression}`);
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "jump", programCounter: target.programCounter }),
    );
  };
}

/** include/constants/battle.h:220-228 -- the 3 named MOVE_RESULT_* bits every concrete orbyte call site uses. */
const ORBYTE_MOVE_RESULT_BITS: ReadonlyMap<string, number> = new Map([
  ["MOVE_RESULT_MISSED", 1 << 0],
  ["MOVE_RESULT_DOESNT_AFFECT_FOE", 1 << 3],
  ["MOVE_RESULT_FAILED", 1 << 5],
]);

function createOrbyteOpcodeHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const [, valueOperand] = context.instruction.operands;
    const value = ORBYTE_MOVE_RESULT_BITS.get(valueOperand!.expression);
    if (value === undefined) {
      throw new Error(`validated B_SCR_OP_ORBYTE became undecodable at ${context.state.programCounter}`);
    }
    const rulesContext = context.state.rulesContext;
    const moveResultFlags = (rulesContext.moveResultFlags | value) >>> 0;
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      { rulesContext: Object.freeze({ ...rulesContext, moveResultFlags }) },
    );
  };
}

export type BattleScriptStatbuffchangeExternalPorts = Readonly<{
  isControllerIdle: BattleScriptControllerIdlePort<BattleScriptRulesContext>;
  resolveBattlerForBattleScript: BattleScriptBattlerSelectorResolverPort<BattleScriptRulesContext>;
}>;

/**
 * Registers STATBUFFCHANGE generically (its own guard-ladder dispatch covers
 * every real flags/statId/direction combination via changeStatBuffs) plus
 * two (a)-complete, eagerly-validated opcodes (JUMPIFSTATUS2 narrowed to its
 * one concrete value, ORBYTE fully) matching the codebase's established
 * eager-validation-at-registration precedent (Cmd_setbyte/Cmd_orword/
 * Cmd_jumpifstatus3condition).
 */
export function createBattleScriptStatbuffchangeOpcodeHandlers(
  program: BattleScriptProgram,
  ports: BattleScriptStatbuffchangeExternalPorts,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const statbuffchangeStarts = program.instructions.filter(
    (instruction) => instruction.opcodeName === "B_SCR_OP_STATBUFFCHANGE",
  );
  if (statbuffchangeStarts.length !== 31) {
    throw new Error(`B_SCR_OP_STATBUFFCHANGE requires all 31 concrete starts, got ${statbuffchangeStarts.length}`);
  }
  for (const instruction of statbuffchangeStarts) {
    const [flagsOperand, ptrOperand] = instruction.operands;
    if (instruction.operands.length !== 2 || flagsOperand?.widthBytes !== 1 || ptrOperand?.widthBytes !== 4) {
      throw new Error(`invalid B_SCR_OP_STATBUFFCHANGE shape at program counter ${instruction.programCounter}`);
    }
    if (resolveStatbuffchangeFlags(flagsOperand.expression) === null) {
      throw new Error(`unknown B_SCR_OP_STATBUFFCHANGE flags ${flagsOperand.expression}`);
    }
    if (!resolveBattleScriptLabel(program, ptrOperand.expression)) {
      throw new Error(`unresolved B_SCR_OP_STATBUFFCHANGE jump target ${ptrOperand.expression}`);
    }
  }

  const orbyteStarts = program.instructions.filter(
    (instruction) => instruction.opcodeName === "B_SCR_OP_ORBYTE",
  );
  if (orbyteStarts.length !== 11) {
    throw new Error(`B_SCR_OP_ORBYTE requires all 11 concrete starts, got ${orbyteStarts.length}`);
  }
  for (const instruction of orbyteStarts) {
    const [pointer, value] = instruction.operands;
    if (instruction.operands.length !== 2 || pointer?.widthBytes !== 4 || value?.widthBytes !== 1) {
      throw new Error(`invalid B_SCR_OP_ORBYTE shape at program counter ${instruction.programCounter}`);
    }
    if (pointer.expression !== "gMoveResultFlags") {
      throw new Error(`unknown B_SCR_OP_ORBYTE pointer ${pointer.expression}`);
    }
    if (!ORBYTE_MOVE_RESULT_BITS.has(value.expression)) {
      throw new Error(`unknown B_SCR_OP_ORBYTE value ${value.expression}`);
    }
  }

  const handlers: Record<number, BattleScriptOpcodeHandler<BattleScriptRulesContext>> = {
    [statbuffchangeStarts[0]!.opcodeId]: createStatbuffchangeOpcodeHandler(),
    [orbyteStarts[0]!.opcodeId]: createOrbyteOpcodeHandler(),
  };

  const setgraphicalstatchangevaluesStart = program.instructions.find(
    (instruction) => instruction.opcodeName === "B_SCR_OP_SETGRAPHICALSTATCHANGEVALUES",
  );
  if (setgraphicalstatchangevaluesStart) {
    handlers[setgraphicalstatchangevaluesStart.opcodeId] = createSetgraphicalstatchangevaluesOpcodeHandler();
  }
  const playanimationStart = program.instructions.find(
    (instruction) => instruction.opcodeName === "B_SCR_OP_PLAYANIMATION",
  );
  if (playanimationStart) {
    handlers[playanimationStart.opcodeId] = createPlayanimationOpcodeHandler(
      ports.isControllerIdle,
      ports.resolveBattlerForBattleScript,
    );
  }
  const jumpifstatus2Start = program.instructions.find(
    (instruction) => instruction.opcodeName === "B_SCR_OP_JUMPIFSTATUS2",
  );
  if (jumpifstatus2Start) {
    handlers[jumpifstatus2Start.opcodeId] = createJumpifstatus2OpcodeHandler(ports.resolveBattlerForBattleScript);
  }

  return Object.freeze(handlers);
}
