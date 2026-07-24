import {
  createBattleCommandRequest,
  submitBattleDecision,
  type BattleCommandRequest,
  type BattleDecisionReducer,
  type BattleDecisionRequest,
  type BattleDecisionSubmission,
  type BattleDecisionTransitionResult,
  type BattleJsonObject,
  type BattleMoveDecision,
  type BattleMoveSlot,
  type BattleRngState,
  type BattleState,
} from "./battleDecisionBoundary.ts";
import {
  FACTORY_BATTLE_MODE_SINGLES,
  FACTORY_LEVEL_MODE_50,
  selectFactoryAiMask,
  type FactoryAiMaskSelectionInput,
  type FactoryAiMaskSelectionReceipt,
} from "./factoryAiMaskSelection.ts";
import { advanceRngValue } from "./rng.ts";

const U16_MAX = 0xffff;
const U32_MAX = 0xffff_ffff;
const MAX_MON_MOVES = 4;
const DEFAULT_MOVE_SCORE = 100;

export type FactoryAiMaskZeroView = Readonly<{
  schema: "factory-ai-view/v1";
  mode: "factory-level-50-singles";
  active: Readonly<{
    aiBattler: 1;
    targetBattler: 0;
  }>;
  factory: FactoryAiMaskSelectionInput;
  moves: readonly [number, number, number, number];
}>;

export type FactoryAiSetupDraw = Readonly<{
  ordinal: number;
  reason: string;
  kind: "setup-simulated-rng";
  moveSlot: BattleMoveSlot;
  before: BattleRngState;
  after: BattleRngState;
  rawRngValue: number;
  randomValue: number;
  simulatedRng: number;
}>;

export type FactoryAiTieDraw = Readonly<{
  ordinal: number;
  reason: string;
  kind: "best-move-tie";
  before: BattleRngState;
  after: BattleRngState;
  rawRngValue: number;
  randomValue: number;
}>;

export type FactoryAiRngDraw = FactoryAiSetupDraw | FactoryAiTieDraw;

export type FactoryAiSlotScore = Readonly<{
  moveSlot: BattleMoveSlot;
  moveId: number;
  legal: boolean;
  initialScore: 100;
  finalScore: number;
}>;

export type FactoryAiMaskZeroTrace = Readonly<{
  schema: "factory-ai-trace/v1";
  phase: "choose-move";
  mask: 0;
  maskSelection: FactoryAiMaskSelectionReceipt;
  executedScoringScripts: readonly [];
  draws: readonly FactoryAiRngDraw[];
  slotScores: readonly FactoryAiSlotScore[];
  bestMoveSlots: readonly BattleMoveSlot[];
  tie: Readonly<{
    modulus: number;
    index: number;
    chosenDecision: BattleMoveDecision;
  }>;
}>;

export type FactoryAiDecisionChoice = Readonly<{
  submission: BattleDecisionSubmission;
  rng: BattleRngState;
  trace: FactoryAiMaskZeroTrace;
}>;

export type FactoryAiDecisionTransition<
  RulesState extends BattleJsonObject = BattleJsonObject,
> = FactoryAiDecisionChoice & Readonly<{
  transition: BattleDecisionTransitionResult<RulesState>;
}>;

function fail(label: string, expectation: string): never {
  throw new Error(`${label} must ${expectation}`);
}

function recordAt(value: unknown, label: string): Record<string, unknown> {
  if (
    value === null
    || typeof value !== "object"
    || Array.isArray(value)
    || (
      Object.getPrototypeOf(value) !== Object.prototype
      && Object.getPrototypeOf(value) !== null
    )
  ) {
    return fail(label, "be a plain object");
  }
  return value as Record<string, unknown>;
}

function exactKeys(
  record: Record<string, unknown>,
  expectedKeys: readonly string[],
  label: string,
): void {
  const actual = Object.keys(record).sort();
  const expected = [...expectedKeys].sort();
  if (
    actual.length !== expected.length
    || actual.some((key, index) => key !== expected[index])
  ) {
    throw new Error(
      `${label} must have exactly keys ${expected.join(", ")}, got ${actual.join(", ")}`,
    );
  }
}

function integerAt(
  value: unknown,
  minimum: number,
  maximum: number,
  label: string,
): number {
  if (
    !Number.isSafeInteger(value)
    || Number(value) < minimum
    || Number(value) > maximum
  ) {
    return fail(label, `be an integer in ${minimum}..${maximum}`);
  }
  return Number(value);
}

function viewAt(value: unknown): FactoryAiMaskZeroView {
  const view = recordAt(value, "Factory AI view");
  exactKeys(view, ["schema", "mode", "active", "factory", "moves"], "Factory AI view");
  if (view.schema !== "factory-ai-view/v1") {
    return fail("Factory AI view.schema", "be factory-ai-view/v1");
  }
  if (view.mode !== "factory-level-50-singles") {
    return fail("Factory AI view.mode", "be factory-level-50-singles");
  }

  const active = recordAt(view.active, "Factory AI view.active");
  exactKeys(active, ["aiBattler", "targetBattler"], "Factory AI view.active");
  if (active.aiBattler !== 1 || active.targetBattler !== 0) {
    return fail(
      "Factory AI view.active",
      "identify trainer battler 1 and player target battler 0",
    );
  }

  const factory = recordAt(view.factory, "Factory AI view.factory");
  exactKeys(
    factory,
    ["levelMode", "battleMode", "factoryWinStreak", "trainerOpponentId"],
    "Factory AI view.factory",
  );
  const factoryInput = Object.freeze({
    levelMode: integerAt(factory.levelMode, 0, 2, "Factory AI view.factory.levelMode"),
    battleMode: integerAt(factory.battleMode, 0, 1, "Factory AI view.factory.battleMode"),
    factoryWinStreak: integerAt(
      factory.factoryWinStreak,
      0,
      U16_MAX,
      "Factory AI view.factory.factoryWinStreak",
    ),
    trainerOpponentId: integerAt(
      factory.trainerOpponentId,
      0,
      U16_MAX,
      "Factory AI view.factory.trainerOpponentId",
    ),
  }) as FactoryAiMaskSelectionInput;
  if (
    factoryInput.levelMode !== FACTORY_LEVEL_MODE_50
    || factoryInput.battleMode !== FACTORY_BATTLE_MODE_SINGLES
  ) {
    throw new Error(
      "Factory AI mask-0 policy supports only Level-50 Factory singles",
    );
  }

  if (!Array.isArray(view.moves) || view.moves.length !== MAX_MON_MOVES) {
    return fail("Factory AI view.moves", "be a four-slot tuple");
  }
  const moves = Object.freeze(view.moves.map((move, slot) =>
    integerAt(move, 0, U16_MAX, `Factory AI view.moves[${slot}]`),
  )) as unknown as readonly [number, number, number, number];

  return Object.freeze({
    schema: "factory-ai-view/v1",
    mode: "factory-level-50-singles",
    active: Object.freeze({ aiBattler: 1, targetBattler: 0 }),
    factory: factoryInput,
    moves,
  });
}

function rngAt(value: unknown): BattleRngState {
  const rng = recordAt(value, "Factory AI RNG");
  exactKeys(rng, ["value", "calls"], "Factory AI RNG");
  return Object.freeze({
    value: integerAt(rng.value, 0, U32_MAX, "Factory AI RNG.value"),
    calls: integerAt(
      rng.calls,
      0,
      Number.MAX_SAFE_INTEGER - 5,
      "Factory AI RNG.calls",
    ),
  });
}

function commandRequestAt(value: unknown): BattleCommandRequest {
  const request = recordAt(value, "Factory AI request");
  if (request.kind !== "command") {
    throw new Error("Factory AI mask-0 policy supports only command requests");
  }
  return createBattleCommandRequest(
    request as unknown as BattleCommandRequest,
  );
}

function nextDraw(
  rng: BattleRngState,
  ordinal: number,
  reason: string,
): Readonly<{
  before: BattleRngState;
  after: BattleRngState;
  rawRngValue: number;
  randomValue: number;
  ordinal: number;
  reason: string;
}> {
  const rawRngValue = advanceRngValue(rng.value);
  const after = Object.freeze({
    value: rawRngValue,
    calls: rng.calls + 1,
  });
  return Object.freeze({
    ordinal,
    reason,
    before: rng,
    after,
    rawRngValue,
    randomValue: (rawRngValue >>> 16) & U16_MAX,
  });
}

/**
 * The source-complete mask-0 subset of Emerald's Factory move chooser.
 *
 * Native setup initializes all four scores to 100, applies the kernel-owned
 * move-limitations result, and consumes one simulated-damage draw per slot
 * even when that slot is unusable. Mask 0 runs no scoring scripts. Singles
 * then consumes one final tie draw, including when only one best move exists.
 */
export function chooseFactoryAiMaskZeroDecision(input: Readonly<{
  view: FactoryAiMaskZeroView;
  request: BattleDecisionRequest;
  rng: BattleRngState;
}>): FactoryAiDecisionChoice {
  const choiceInput = recordAt(input, "Factory AI decision input");
  exactKeys(
    choiceInput,
    ["view", "request", "rng"],
    "Factory AI decision input",
  );
  const request = commandRequestAt(choiceInput.request);
  const view = viewAt(choiceInput.view);
  let rng = rngAt(choiceInput.rng);
  if (request.side !== "trainer" || request.battler !== view.active.aiBattler) {
    throw new Error(
      "Factory AI mask-0 policy requires the current trainer battler-1 request",
    );
  }
  if (
    request.legalDecisions.some((decision) => decision.kind !== "use-move")
  ) {
    throw new Error(
      "Factory AI mask-0 move policy does not implement switch action prechecks",
    );
  }

  const legalMoves = request.legalDecisions as readonly BattleMoveDecision[];
  const legalBySlot = new Map<BattleMoveSlot, BattleMoveDecision>();
  for (const decision of legalMoves) {
    if (decision.targetBattler !== view.active.targetBattler) {
      throw new Error(
        `Factory AI legal move slot ${decision.moveSlot} targets the wrong singles battler`,
      );
    }
    if (view.moves[decision.moveSlot] === 0) {
      throw new Error(
        `Factory AI legal move slot ${decision.moveSlot} contains MOVE_NONE`,
      );
    }
    legalBySlot.set(decision.moveSlot, decision);
  }
  if (legalBySlot.size === 0) {
    throw new Error("Factory AI mask-0 policy requires at least one legal move");
  }

  const maskSelection = selectFactoryAiMask(view.factory);
  if (
    maskSelection.mask !== 0
    || maskSelection.receipt.branch.id !== "challengeBelow2"
  ) {
    throw new Error(
      `Factory AI mask-0 policy does not support selected ${maskSelection.receipt.branch.id} mask ${maskSelection.mask}`,
    );
  }

  const draws: FactoryAiRngDraw[] = [];
  const slotScores: FactoryAiSlotScore[] = [];
  for (let slot = 0; slot < MAX_MON_MOVES; slot += 1) {
    const moveSlot = slot as BattleMoveSlot;
    const reason = `setup-simulated-rng-slot-${slot}`;
    const draw = nextDraw(rng, draws.length + 1, reason);
    rng = draw.after;
    draws.push(Object.freeze({
      ...draw,
      kind: "setup-simulated-rng",
      moveSlot,
      simulatedRng: DEFAULT_MOVE_SCORE - (draw.randomValue % 16),
    }));
    const legal = legalBySlot.has(moveSlot);
    slotScores.push(Object.freeze({
      moveSlot,
      moveId: view.moves[moveSlot],
      legal,
      initialScore: DEFAULT_MOVE_SCORE,
      finalScore: legal ? DEFAULT_MOVE_SCORE : 0,
    }));
  }

  const bestMoveSlots = Object.freeze(
    slotScores
      .filter((slot) => slot.legal && slot.finalScore === DEFAULT_MOVE_SCORE)
      .map((slot) => slot.moveSlot),
  );
  const tieDraw = nextDraw(rng, draws.length + 1, "best-move-tie-selection");
  rng = tieDraw.after;
  draws.push(Object.freeze({ ...tieDraw, kind: "best-move-tie" }));
  const tieIndex = tieDraw.randomValue % bestMoveSlots.length;
  const chosenSlot = bestMoveSlots[tieIndex]!;
  const chosenDecision = legalBySlot.get(chosenSlot)!;
  const submission = Object.freeze({
    requestId: request.requestId,
    side: request.side,
    decision: chosenDecision,
  });
  const trace = Object.freeze({
    schema: "factory-ai-trace/v1" as const,
    phase: "choose-move" as const,
    mask: 0 as const,
    maskSelection: maskSelection.receipt,
    executedScoringScripts: Object.freeze([]) as readonly [],
    draws: Object.freeze(draws),
    slotScores: Object.freeze(slotScores),
    bestMoveSlots,
    tie: Object.freeze({
      modulus: bestMoveSlots.length,
      index: tieIndex,
      chosenDecision,
    }),
  });
  return Object.freeze({ submission, rng, trace });
}

/**
 * Composes the pure policy with the published kernel submission boundary.
 * The policy predicts from the state's explicit RNG; the boundary then owns
 * and verifies every recorded draw before the rules reducer observes it.
 */
export function submitFactoryAiMaskZeroDecision<
  RulesState extends BattleJsonObject,
>(
  state: BattleState<RulesState>,
  view: FactoryAiMaskZeroView,
  reducer: BattleDecisionReducer<RulesState>,
): FactoryAiDecisionTransition<RulesState> {
  if (state.boundary.kind !== "decision-required") {
    throw new Error("Factory AI requires a current Battle decision request");
  }
  if (state.boundary.request.kind !== "command") {
    throw new Error("Factory AI mask-0 policy does not implement forced switches");
  }
  const choice = chooseFactoryAiMaskZeroDecision({
    view,
    request: state.boundary.request,
    rng: state.rng,
  });
  const synchronizedReducer: BattleDecisionReducer<RulesState> = (context) => {
    for (const draw of choice.trace.draws) {
      const before = context.rng.snapshot();
      if (
        before.value !== draw.before.value
        || before.calls !== draw.before.calls
      ) {
        throw new Error(`Factory AI RNG diverged before draw ${draw.ordinal}`);
      }
      const randomValue = context.rng.draw(draw.reason);
      const after = context.rng.snapshot();
      if (
        randomValue !== draw.randomValue
        || after.value !== draw.after.value
        || after.calls !== draw.after.calls
      ) {
        throw new Error(`Factory AI RNG diverged after draw ${draw.ordinal}`);
      }
    }
    return reducer(context);
  };
  const transition = submitBattleDecision(
    state,
    choice.submission,
    synchronizedReducer,
  );
  if (
    transition.state.rng.calls < choice.rng.calls
    || (
      transition.state.rng.calls === choice.rng.calls
      && transition.state.rng.value !== choice.rng.value
    )
  ) {
    throw new Error("Battle kernel did not retain the Factory AI RNG draws");
  }
  return Object.freeze({ ...choice, transition });
}
