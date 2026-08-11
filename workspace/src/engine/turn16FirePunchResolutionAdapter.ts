/**
 * ISSUES #39 rank-8 bridge: source-own the canonical Scene-OFF
 * FAINT_ATTACK/FIRE_PUNCH/burn lifecycle without selecting a turn number in
 * the renderer.
 *
 * The staged boundary is the real post-switch MAGBY/MURKROW field recorded in
 * docs/turn16-notes.md. Its exact RNG cursor (0xfa44fd77), battler stats, PP,
 * HP, move order, damage, successful burn, status-icon receipt, residual, and
 * next command are independently pinned there from Scene-OFF RAM/source
 * evidence. The production full-turn reducer and generic immutable resolution
 * projector derive the commands below; this module does not encode pixel
 * timing or inspect a battle/turn/tick selector.
 */
import { createBattleCommandPresentation } from "./battleCommandPresentation.ts";
import type {
  BattleCommandRequest,
  BattleDecisionTransitionResult,
  BattleState,
} from "./battleDecisionBoundary.ts";
import {
  createBattleResolutionPresentation,
  type BattleResolutionPresentationCommand,
  type BattleResolutionPresentationState,
} from "./battleResolutionPresentation.ts";
import { createBattleScriptRulesContext } from "./battleScriptRulesContext.ts";
import { BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS } from "./battleScriptSourceConstants.ts";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnDecisionRules,
} from "./factoryBattleScriptFullTurnDecision.ts";

const FIRE_PUNCH = 7;
const FAINT_ATTACK = 185;
const CANONICAL_POST_SWITCH_RNG_SEED = 0xfa44_fd77;

const PLAYER_FIRE_PUNCH = Object.freeze({
  kind: "use-move" as const,
  moveSlot: 0 as const,
  targetBattler: 1 as const,
});
const TRAINER_FAINT_ATTACK = Object.freeze({
  kind: "use-move" as const,
  moveSlot: 0 as const,
  targetBattler: 0 as const,
});

type DecisionRequired = Extract<
  BattleDecisionTransitionResult<FactoryFullTurnDecisionRules>,
  Readonly<{ kind: "decision-required" }>
>;

function expectCommandRequest(
  state: BattleState<FactoryFullTurnDecisionRules>,
  side: "player" | "trainer",
): BattleCommandRequest {
  if (
    state.boundary.kind !== "decision-required"
    || state.boundary.request.kind !== "command"
    || state.boundary.request.side !== side
  ) {
    throw new Error(`turn16FirePunchResolutionAdapter: expected ${side} command boundary`);
  }
  return state.boundary.request;
}

function expectDecisionRequired(
  transition: BattleDecisionTransitionResult<FactoryFullTurnDecisionRules>,
  label: string,
): DecisionRequired {
  if (transition.kind !== "decision-required") {
    throw new Error(`turn16FirePunchResolutionAdapter: ${label} did not publish a decision boundary`);
  }
  return transition;
}

function stageInitialBattle(): BattleState<FactoryFullTurnDecisionRules> {
  const initial = createFactoryFullTurnBattleState({
    requestId: 5,
    rngSeed: CANONICAL_POST_SWITCH_RNG_SEED,
    player: {
      species: 240,
      moveId: FIRE_PUNCH,
      moves: [FIRE_PUNCH, 108, 109, 123],
      pp: [15, 20, 10, 20],
      ability: 49,
      abilityNum: 0,
      item: 221,
      attack: 81,
      defense: 43,
      spAttack: 108,
      spDefense: 61,
      speed: 89,
      hp: 138,
      maxHp: 138,
      types: ["TYPE_FIRE", "TYPE_FIRE"],
    },
    trainer: {
      species: 198,
      moveId: FAINT_ATTACK,
      moves: [FAINT_ATTACK, 19, 259, 269],
      pp: [20, 14, 15, 20],
      ability: 15,
      abilityNum: 0,
      item: 221,
      attack: 91,
      defense: 69,
      spAttack: 91,
      spDefense: 69,
      speed: 97,
      hp: 142,
      maxHp: 142,
      types: ["TYPE_DARK", "TYPE_FLYING"],
    },
  });
  return Object.freeze({
    ...initial,
    rules: Object.freeze({
      ...initial.rules,
      rulesContext: createBattleScriptRulesContext({
        ...initial.rules.rulesContext,
        hitMarker: BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS,
      }),
    }),
  });
}

function commandWithType<T extends BattleResolutionPresentationCommand["type"]>(
  commands: readonly BattleResolutionPresentationCommand[],
  type: T,
  predicate: (command: Extract<BattleResolutionPresentationCommand, { type: T }>) => boolean,
): Extract<BattleResolutionPresentationCommand, { type: T }> {
  const command = commands.find((candidate) =>
    candidate.type === type
    && predicate(candidate as Extract<BattleResolutionPresentationCommand, { type: T }>)
  );
  if (command === undefined) {
    throw new Error(`turn16FirePunchResolutionAdapter: missing ${type} command`);
  }
  return command as Extract<BattleResolutionPresentationCommand, { type: T }>;
}

export type Turn16FirePunchResolutionAdapter = Readonly<{
  resolution: BattleResolutionPresentationState;
  commands: readonly BattleResolutionPresentationCommand[];
  faintAttackLines: readonly string[];
  firePunchLines: readonly string[];
  burnedLines: readonly string[];
  residualLines: readonly string[];
  playerHp: Readonly<{ from: number; to: number }>;
  opponentHitHp: Readonly<{ from: number; to: number }>;
  opponentResidualHp: Readonly<{ from: number; to: number }>;
  opponentStatus1: number;
  playerPp: readonly [number, number, number, number];
}>;

/** Builds the exact full turn through the production reducer and projector. */
export function resolveTurn16FirePunchResolutionAdapter(): Turn16FirePunchResolutionAdapter {
  const initial = stageInitialBattle();
  const sourceRequest = expectCommandRequest(initial, "player");
  const selected = expectDecisionRequired(
    submitFactoryFullTurnDecision(initial, {
      requestId: sourceRequest.requestId,
      side: "player",
      decision: PLAYER_FIRE_PUNCH,
    }),
    "player selection",
  );
  const trainerRequest = expectCommandRequest(selected.state, "trainer");
  const resolved = expectDecisionRequired(
    submitFactoryFullTurnDecision(selected.state, {
      requestId: trainerRequest.requestId,
      side: "trainer",
      decision: TRAINER_FAINT_ATTACK,
    }),
    "full turn",
  );
  const resolution = createBattleResolutionPresentation({
    sourceRequest,
    sourceDecision: PLAYER_FIRE_PUNCH,
    beforeRules: initial.rules,
    transition: resolved,
    fieldBoundary: createBattleCommandPresentation(
      sourceRequest,
      initial.rules.rulesContext,
      PLAYER_FIRE_PUNCH.moveSlot,
    ).field,
    confirmHandoff: Object.freeze({
      fightDisplayCursor: PLAYER_FIRE_PUNCH.moveSlot,
      idleBounceElapsed: 0,
    }),
  });
  const commands = resolution.segments[0]!.commands;
  const messages = commands.filter((command) => command.type === "message");
  const hpCommands = commands.filter((command) => command.type === "hp");
  const faintAttack = commandWithType(commands, "message", (command) =>
    command.lines[0] === "Foe MURKROW used"
  );
  const firePunch = commandWithType(commands, "message", (command) =>
    command.lines[0] === "MAGBY used"
  );
  const burned = commandWithType(commands, "message", (command) =>
    command.lines[0] === "Foe MURKROW was burned!"
  );
  const residual = commandWithType(commands, "message", (command) =>
    command.lines[0] === "Foe MURKROW is hurt"
  );
  const playerHp = commandWithType(commands, "hp", (command) => command.battler === 0);
  const opponentHp = hpCommands.filter((command) => command.type === "hp" && command.battler === 1);
  if (messages.length < 4 || opponentHp.length !== 2) {
    throw new Error("turn16FirePunchResolutionAdapter: incomplete full-turn command lifecycle");
  }
  const statusIcon = commandWithType(commands, "status-icon", (command) => command.battler === 1);
  const after = resolution.segments[0]!.afterRules.rulesContext;
  return Object.freeze({
    resolution,
    commands,
    faintAttackLines: faintAttack.lines,
    firePunchLines: firePunch.lines,
    burnedLines: burned.lines,
    residualLines: residual.lines,
    playerHp: Object.freeze({ from: playerHp.from, to: playerHp.to }),
    opponentHitHp: Object.freeze({ from: opponentHp[0]!.from, to: opponentHp[0]!.to }),
    opponentResidualHp: Object.freeze({ from: opponentHp[1]!.from, to: opponentHp[1]!.to }),
    opponentStatus1: statusIcon.status1,
    playerPp: after.battlers[0]!.pp,
  });
}

/** Cached source-owned receipt shared by the exact input and render seams. */
export const CANONICAL_FIRE_PUNCH_RESOLUTION =
  resolveTurn16FirePunchResolutionAdapter();
