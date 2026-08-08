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
import {
  runCheckBadMovePreamble,
  AI_WEATHER_RAIN,
  AI_WEATHER_SANDSTORM,
  AI_WEATHER_SUN,
  type AiWeatherValue,
  type FactoryAiCheckBadMoveAttacker,
  type FactoryAiCheckBadMoveDraw,
  type FactoryAiCheckBadMoveRoarTarget,
} from "./factoryAiCheckBadMove.ts";
import {
  runTryToFaint,
  type FactoryAiMostPowerful,
  type FactoryAiTryToFaintBattler,
  type FactoryAiTryToFaintDraw,
  type FactoryAiTryToFaintTarget,
} from "./factoryAiTryToFaint.ts";
import { runCheckViability, type FactoryAiCheckViabilityDraw } from "./factoryAiCheckViability.ts";

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
  // Native AI selects only a slot. Target resolution belongs to the opponent
  // controller, so preserve the kernel's one authoritative decision per slot.
  for (const decision of legalMoves) {
    if (legalBySlot.has(decision.moveSlot)) {
      throw new Error(
        `Factory AI legal move slot ${decision.moveSlot} has ambiguous duplicate decisions`,
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

// ---------------------------------------------------------------------------
// Mask 1 (CheckBadMove only) / mask 7 (CheckBadMove + TryToFaint +
// CheckViability), per GetAiScriptsInBattleFactory (battle_factory.c:889-911,
// factoryAiMaskSelection.ts's already-ported branch table) and the
// port-subset audit's §4. Reuses the exact same setup/tie draw shape as the
// mask-0 policy above (BattleAI_SetupAIData's 4 simulatedRNG draws +
// ChooseMoveOrAction_Singles's unconditional final tie draw, §1.1/§1.4) --
// mask 0 is untouched by everything below.

export type FactoryAiScoredBattlerView = Readonly<{
  types: readonly [string, string];
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  speed: number;
  level: number;
  statStages: Readonly<{ atk: number; def: number; spAtk: number; spDef: number; speed: number; acc: number; evasion: number }>;
  /** `gDisableStructs[].isFirstTurn` (0-2) -- source-required for `AI_CV_Pursuit` (`is_first_turn_for AI_USER`, entry 466); only the attacker's own copy is read today. */
  isFirstTurn: number;
  /** Current/max HP -- source-required for `AI_CV_VitalThrow` (`if_hp_more_than`/`if_hp_less_than AI_USER`, entry 468/doc §13); only the attacker's own copy is read today, carried on both sides for the same shape-symmetry convention as `isFirstTurn`. */
  hp: number;
  maxHp: number;
  /**
   * `gLastMoves[battler]` -- source-required for `AI_CV_DefenseUp`'s own
   * Gate E/F (`get_last_used_bank_move AI_TARGET`, doc §18.1/§18.2); only
   * the target's own copy is read. Optional, defaulting to `MOVE_NONE` (0)
   * when omitted -- the real battle-start default (doc §18.2).
   */
  lastUsedMoveId?: number;
  /** `gBattleMons[].status1 & STATUS1_TOXIC_POISON` -- source-required for `AI_CV_AccuracyDown`'s Gate D (target only, doc §19.1). Optional, defaulting to `false`. */
  isToxicPoisoned?: boolean;
  /** `gBattleMons[].status1 & STATUS1_ANY` -- source-required for `AI_CBM_Toxic`'s target-status gate. Optional, defaulting to `false`. */
  hasAnyStatus?: boolean;
  /** `gBattleMons[].status2 & STATUS2_CONFUSION` -- source-required for `AI_CBM_Confuse`'s first gate (target only, doc §32). Optional, defaulting to `false`. */
  isConfused?: boolean;
  /** `gBattleMons[].status1 & STATUS1_SLEEP`, read by AI_CV_Counter. */
  isAsleep?: boolean;
  /** `gDisableStructs[].tauntTimer != 0`, read by AI_CV_Counter. */
  isTaunted?: boolean;
  /** `gStatuses3[] & STATUS3_LEECHSEED` -- source-required for `AI_CV_AccuracyDown`'s Gate E (target only, doc §19.1). Optional, defaulting to `false`. */
  isLeechSeeded?: boolean;
  /** STATUS2_INFATUATION, read by AI_CV_Protect. */
  isInfatuated?: boolean;
  /** STATUS3_YAWN, read by AI_CV_Protect. */
  hasYawn?: boolean;
  /** STATUS3_PERISH_SONG, read by AI_CV_Protect. */
  hasPerishSong?: boolean;
  /** STATUS2_NIGHTMARE, read by AI_CBM_Nightmare. */
  isNightmared?: boolean;
  /** DisableStruct::protectUses, read by AI_CV_Protect. */
  protectUses?: number;
  /**
   * Source `gBattleResults.battleTurnCounter`, read by `AI_CV_Swagger` only
   * after its Psych Up/target-ATK gate (doc §33). Optional battle-start
   * default is 0.
   */
  battleTurnCount?: number;
  /** `gStatuses3[] & STATUS3_ROOTED` (Ingrain) -- source-required for `AI_CV_AccuracyDown`'s Gate F (AI_USER's own copy only, doc §19.1). Optional, defaulting to `false`. */
  isRooted?: boolean;
  /** `gBattleMons[].status2 & STATUS2_CURSED` -- source-required for `AI_CV_AccuracyDown`'s Gate G (target only, doc §19.1). Optional, defaulting to `false`. */
  isCursed?: boolean;
  /** `gBattleMons[].status2 & STATUS2_ESCAPE_PREVENTION` -- `AI_CBM_CantEscape`'s single gate (target only, EFFECT_MEAN_LOOK). Optional, defaulting to `false`. */
  isEscapePrevented?: boolean;
  /** `gBattleMons[].status2 & STATUS2_TORMENT` -- `AI_CBM_Torment`'s single gate (target only, EFFECT_TORMENT). Optional, defaulting to `false`. */
  isTormented?: boolean;
  /** `gSideStatuses[] & SIDE_STATUS_LIGHTSCREEN` -- source-required for `AI_CBM_LightScreen`'s own gate (AI_USER's OWN side only, doc §23.1). Optional, defaulting to `false`. */
  lightScreenUp?: boolean;
  /** `gSideStatuses[] & SIDE_STATUS_REFLECT` -- source-required for `AI_CBM_Reflect`'s own gate (AI_USER's OWN side only, doc §23.1). Optional, defaulting to `false`. */
  reflectUp?: boolean;
  /** `gSideStatuses[] & SIDE_STATUS_SAFEGUARD` -- source-required for `AI_CBM_Toxic`'s target-side gate. Optional, defaulting to `false`. */
  safeguardUp?: boolean;
  /**
   * The battler's own real ability (`get_ability AI_USER`, a direct field
   * read, never the target-guessing heuristic) -- source-required for
   * `AI_CV_RainDance`'s Gate S/R (attacker's own copy only, doc §25.2).
   * Optional, defaulting to `"ABILITY_NONE"`.
   */
  ability?: string;
  /**
   * Current weather, `AI_WEATHER_*`-encoded (0=Sun/1=Rain/2=Sandstorm/
   * 3=Hail) -- source-required for `AI_CBM_RainDance`/`SunnyDay`/`Hail` and
   * `AI_CV_SunnyDay`/`Hail`/`RainDance` (attacker's own copy only, doc
   * §25.1/§25.2). Optional, defaulting to `undefined` (no weather bit set).
   */
  currentWeather?: AiWeatherValue;
  /**
   * Alive, non-empty, non-Egg bench count produced by
   * `count_usable_party_mons AI_USER`, excluding the active party index --
   * `AI_CBM_Explosion`/`AI_CBM_BatonPass`'s own AI_USER count gate. Optional
   * (the live driver does not yet model either side's party), defaulting to
   * the CBM layer's conservative zero-member default.
   */
  usablePartyMons?: number;
  /** `gBattleMons[].status2 & STATUS2_SUBSTITUTE` -- `AI_CBM_Substitute`'s own first gate (attacker's own copy only). Optional, defaulting to `false`. */
  hasSubstitute?: boolean;
}>;

export type FactoryAiScoredTargetView = FactoryAiScoredBattlerView & Readonly<{
  species: number;
  /** Real (not guessed) ability -- TryToFaint/CheckViability read live state. */
  ability: string;
  /** BattleHistory-style known ability for CheckBadMove's get_ability guess cache. */
  knownAbility: string | null;
  /** Source BattleHistory itemEffects cell (0 means no observed effect). */
  knownItemEffect?: number;
  /** BattleHistory-known move IDs, read by AI_CV_Protect's target move-effect scan. */
  knownMoveIds?: readonly number[];
  /**
   * Alive, non-empty, non-Egg target-side bench count produced by
   * `count_usable_party_mons AI_TARGET`, excluding the active party index.
   * Source-required by `AI_CBM_Roar`; optional with the CBM layer's
   * conservative zero-member default.
   */
  usablePartyMons?: number;
}>;

export type FactoryAiScoredView = Readonly<{
  schema: "factory-ai-scored-view/v1";
  mode: "factory-level-50-singles";
  active: Readonly<{ aiBattler: 1; targetBattler: 0 }>;
  factory: FactoryAiMaskSelectionInput;
  moves: readonly [number, number, number, number];
  attacker: FactoryAiScoredBattlerView;
  target: FactoryAiScoredTargetView;
}>;

export type FactoryAiScoredPhaseDraw =
  | (FactoryAiCheckBadMoveDraw & Readonly<{ phase: "check-bad-move"; moveSlot: BattleMoveSlot }>)
  | (FactoryAiTryToFaintDraw & Readonly<{ phase: "try-to-faint"; moveSlot: BattleMoveSlot }>)
  | (FactoryAiCheckViabilityDraw & Readonly<{ phase: "check-viability"; moveSlot: BattleMoveSlot }>);

export type FactoryAiScoredDraw = FactoryAiRngDraw | FactoryAiScoredPhaseDraw;

export type FactoryAiScoredSlot = Readonly<{
  moveSlot: BattleMoveSlot;
  moveId: number;
  legal: boolean;
  initialScore: 100;
  checkBadMoveDelta: number | null;
  tryToFaintDelta: number | null;
  checkViabilityDelta: number | null;
  finalScore: number;
}>;

export type FactoryAiScoredTrace = Readonly<{
  schema: "factory-ai-trace/v1";
  phase: "choose-move";
  mask: 1 | 7;
  maskSelection: FactoryAiMaskSelectionReceipt;
  executedScoringScripts: readonly ("check-bad-move" | "try-to-faint" | "check-viability")[];
  draws: readonly FactoryAiScoredDraw[];
  slotScores: readonly FactoryAiScoredSlot[];
  bestMoveSlots: readonly BattleMoveSlot[];
  tie: Readonly<{
    modulus: number;
    index: number;
    chosenDecision: BattleMoveDecision;
  }>;
}>;

export type FactoryAiScoredChoice = Readonly<{
  submission: BattleDecisionSubmission;
  rng: BattleRngState;
  trace: FactoryAiScoredTrace;
}>;

export type FactoryAiScoredTransition<
  RulesState extends BattleJsonObject = BattleJsonObject,
> = FactoryAiScoredChoice & Readonly<{
  transition: BattleDecisionTransitionResult<RulesState>;
}>;

function scoredViewAt(value: unknown): FactoryAiScoredView {
  const view = recordAt(value, "Factory AI scored view");
  exactKeys(
    view,
    ["schema", "mode", "active", "factory", "moves", "attacker", "target"],
    "Factory AI scored view",
  );
  if (view.schema !== "factory-ai-scored-view/v1") {
    return fail("Factory AI scored view.schema", "be factory-ai-scored-view/v1");
  }
  if (view.mode !== "factory-level-50-singles") {
    return fail("Factory AI scored view.mode", "be factory-level-50-singles");
  }
  const active = recordAt(view.active, "Factory AI scored view.active");
  exactKeys(active, ["aiBattler", "targetBattler"], "Factory AI scored view.active");
  if (active.aiBattler !== 1 || active.targetBattler !== 0) {
    return fail(
      "Factory AI scored view.active",
      "identify trainer battler 1 and player target battler 0",
    );
  }
  const factory = recordAt(view.factory, "Factory AI scored view.factory");
  exactKeys(
    factory,
    ["levelMode", "battleMode", "factoryWinStreak", "trainerOpponentId"],
    "Factory AI scored view.factory",
  );
  const factoryInput = Object.freeze({
    levelMode: integerAt(factory.levelMode, 0, 2, "Factory AI scored view.factory.levelMode"),
    battleMode: integerAt(factory.battleMode, 0, 1, "Factory AI scored view.factory.battleMode"),
    factoryWinStreak: integerAt(
      factory.factoryWinStreak,
      0,
      U16_MAX,
      "Factory AI scored view.factory.factoryWinStreak",
    ),
    trainerOpponentId: integerAt(
      factory.trainerOpponentId,
      0,
      U16_MAX,
      "Factory AI scored view.factory.trainerOpponentId",
    ),
  }) as FactoryAiMaskSelectionInput;
  if (
    factoryInput.levelMode !== FACTORY_LEVEL_MODE_50
    || factoryInput.battleMode !== FACTORY_BATTLE_MODE_SINGLES
  ) {
    throw new Error("Factory AI scored policy supports only Level-50 Factory singles");
  }
  if (!Array.isArray(view.moves) || view.moves.length !== MAX_MON_MOVES) {
    return fail("Factory AI scored view.moves", "be a four-slot tuple");
  }
  const moves = Object.freeze(view.moves.map((move, slot) =>
    integerAt(move, 0, U16_MAX, `Factory AI scored view.moves[${slot}]`),
  )) as unknown as readonly [number, number, number, number];

  return Object.freeze({
    schema: "factory-ai-scored-view/v1",
    mode: "factory-level-50-singles",
    active: Object.freeze({ aiBattler: 1, targetBattler: 0 }),
    factory: factoryInput,
    moves,
    attacker: view.attacker as FactoryAiScoredBattlerView,
    target: view.target as FactoryAiScoredTargetView,
  });
}

/**
 * `Cmd_get_how_powerful_move_is`'s own `funcResult` write
 * (`battle_ai_script_commands.c:1228-1236`) -- `MOVE_MOST_POWERFUL`(2),
 * `MOVE_NOT_MOST_POWERFUL`(1), `MOVE_POWER_OTHER`(0)
 * (`include/constants/battle_ai.h:33-35`) numerically double as
 * `AI_WEATHER_SANDSTORM`/`RAIN`/`SUN` respectively -- the numeric collision
 * `get_weather`'s stale-read bug (Channel 2, doc §25.10.1) rides on when
 * `AI_TryToFaint`'s pass runs immediately before `AI_CheckViability`'s own.
 */
const MOST_POWERFUL_TO_FUNC_RESULT: Readonly<Record<FactoryAiMostPowerful, AiWeatherValue>> = Object.freeze({
  "power-other": AI_WEATHER_SUN,
  "not-most-powerful": AI_WEATHER_RAIN,
  "most-powerful": AI_WEATHER_SANDSTORM,
});

/**
 * Mask-1/mask-7 Factory move chooser: setup (identical to mask 0) + three
 * full logic-ID-major passes over all 4 movesetIndex slots -- `AI_CheckBadMove`
 * (always), then -- mask 7 only -- `AI_TryToFaint`, then `AI_CheckViability`
 * -- matching the real ROM's own `ChooseMoveOrAction_Singles`/
 * `BattleAI_DoAIProcessing` loop (`battle_ai_script_commands.c:395-416,
 * 572-616`: one `aiLogicId` runs to completion across all 4 slots before the
 * next logic ID starts), not the per-slot interleave (CBM0,TTF0,CV0,CBM1,...)
 * this function used to run (ISSUES #47). `AI_THINKING_STRUCT->funcResult` is
 * never reset within a decision (`BattleAI_SetupAIData` zeroes it once, before
 * `aiLogicId` 0 starts) -- `ttfExitFuncResult`/`cvCarryStillIntact` below
 * thread the one Factory-reachable consequence of that (Channel 2's stale
 * `get_weather` read at the CV pass's own first scripted slot; see
 * `weatherSetterCvScore`'s own fallback param in `factoryAiCheckViability.ts`)
 * without claiming to model every handler's own `funcResult` side effects. A
 * slot whose script halts on a named unsupported-branch barrier fails the
 * whole decision loudly (no score can be computed for that slot) rather than
 * silently no-op'ing.
 */
export function chooseFactoryAiScoredDecision(input: Readonly<{
  view: FactoryAiScoredView;
  request: BattleDecisionRequest;
  rng: BattleRngState;
}>): FactoryAiScoredChoice {
  const choiceInput = recordAt(input, "Factory AI scored decision input");
  exactKeys(choiceInput, ["view", "request", "rng"], "Factory AI scored decision input");
  const request = commandRequestAt(choiceInput.request);
  const view = scoredViewAt(choiceInput.view);
  let rng = rngAt(choiceInput.rng);
  if (request.side !== "trainer" || request.battler !== view.active.aiBattler) {
    throw new Error(
      "Factory AI scored policy requires the current trainer battler-1 request",
    );
  }
  if (request.legalDecisions.some((decision) => decision.kind !== "use-move")) {
    throw new Error(
      "Factory AI scored move policy does not implement switch action prechecks",
    );
  }

  const legalMoves = request.legalDecisions as readonly BattleMoveDecision[];
  const legalBySlot = new Map<BattleMoveSlot, BattleMoveDecision>();
  for (const decision of legalMoves) {
    if (legalBySlot.has(decision.moveSlot)) {
      throw new Error(
        `Factory AI legal move slot ${decision.moveSlot} has ambiguous duplicate decisions`,
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
    throw new Error("Factory AI scored policy requires at least one legal move");
  }

  const maskSelection = selectFactoryAiMask(view.factory);
  if (maskSelection.mask !== 1 && maskSelection.mask !== 7) {
    throw new Error(
      `Factory AI scored policy does not support selected ${maskSelection.receipt.branch.id} mask ${maskSelection.mask}`,
    );
  }
  const mask = maskSelection.mask;

  const draws: FactoryAiScoredDraw[] = [];
  const simulatedRng: [number, number, number, number] = [0, 0, 0, 0];
  for (let slot = 0; slot < MAX_MON_MOVES; slot += 1) {
    const moveSlot = slot as BattleMoveSlot;
    const draw = nextDraw(rng, draws.length + 1, `setup-simulated-rng-slot-${slot}`);
    rng = draw.after;
    const slotSimulatedRng = DEFAULT_MOVE_SCORE - (draw.randomValue % 16);
    simulatedRng[slot] = slotSimulatedRng;
    draws.push(Object.freeze({
      ...draw,
      kind: "setup-simulated-rng",
      moveSlot,
      simulatedRng: slotSimulatedRng,
    }));
  }

  const targetForCbm: FactoryAiCheckBadMoveRoarTarget = Object.freeze({
    species: view.target.species,
    types: view.target.types,
    knownAbility: view.target.knownAbility,
    realAbility: view.target.ability,
    speedStage: view.target.statStages.speed,
    atkStage: view.target.statStages.atk,
    defStage: view.target.statStages.def,
    spDefStage: view.target.statStages.spDef,
    accStage: view.target.statStages.acc,
    evasionStage: view.target.statStages.evasion,
    hasAnyStatus: view.target.hasAnyStatus,
    isConfused: view.target.isConfused,
    safeguardUp: view.target.safeguardUp,
    usablePartyMons: view.target.usablePartyMons,
    isLeechSeeded: view.target.isLeechSeeded,
    ...(view.target.isAsleep === true ? { isAsleep: true } : {}),
    ...(view.target.isEscapePrevented === true ? { isEscapePrevented: true } : {}),
    ...(view.target.isTormented === true ? { isTormented: true } : {}),
    ...(view.target.hasPerishSong === true ? { hasPerishSong: true } : {}),
    ...(view.target.isNightmared === true ? { isNightmared: true } : {}),
    level: view.target.level,
  });
  const attackerForCbm: FactoryAiCheckBadMoveAttacker = Object.freeze({
    atkStage: view.attacker.statStages.atk,
    defStage: view.attacker.statStages.def,
    speedStage: view.attacker.statStages.speed,
    spAtkStage: view.attacker.statStages.spAtk,
    spDefStage: view.attacker.statStages.spDef,
    lightScreenUp: view.attacker.lightScreenUp,
    reflectUp: view.attacker.reflectUp,
    evasionStage: view.attacker.statStages.evasion,
    currentWeather: view.attacker.currentWeather,
    level: view.attacker.level,
    isFirstTurn: view.attacker.isFirstTurn,
    ...(view.attacker.safeguardUp === true ? { safeguardUp: true } : {}),
    ...(view.attacker.isAsleep === true ? { isAsleep: true } : {}),
    ...(view.attacker.usablePartyMons === undefined
      ? {}
      : { usablePartyMons: view.attacker.usablePartyMons }),
    ...(view.attacker.hasSubstitute === true ? { hasSubstitute: true } : {}),
    hp: view.attacker.hp,
    maxHp: view.attacker.maxHp,
    ...(view.attacker.isRooted === true ? { isRooted: true } : {}),
  });

  const executedScoringScripts: ("check-bad-move" | "try-to-faint" | "check-viability")[] = [
    "check-bad-move",
  ];
  if (mask === 7) executedScoringScripts.push("try-to-faint", "check-viability");

  type ScoredSlotAccumulator = {
    moveSlot: BattleMoveSlot;
    moveId: number;
    legal: boolean;
    checkBadMoveDelta: number | null;
    tryToFaintDelta: number | null;
    checkViabilityDelta: number | null;
  };
  const slotAccumulators: ScoredSlotAccumulator[] = [];
  for (let slot = 0; slot < MAX_MON_MOVES; slot += 1) {
    const moveSlot = slot as BattleMoveSlot;
    slotAccumulators.push({
      moveSlot,
      moveId: view.moves[moveSlot],
      legal: legalBySlot.has(moveSlot),
      checkBadMoveDelta: null,
      tryToFaintDelta: null,
      checkViabilityDelta: null,
    });
  }

  // Pass 1: AI_CheckBadMove, movesetIndex 0..3 (always -- mask 1 or 7). An
  // illegal slot's `moveConsidered` is 0 in the real ROM (BattleAI_DoAIProcessing,
  // `:591-598`), which runs no AI command at all for that slot in any logic
  // ID -- `funcResult` stays untouched, matching this port's own `continue`.
  for (const slotAcc of slotAccumulators) {
    if (!slotAcc.legal) continue;
    const cbm = runCheckBadMovePreamble({
      rng,
      moveId: slotAcc.moveId,
      target: targetForCbm,
      attacker: attackerForCbm,
      drawOrdinalStart: draws.length + 1,
      reasonPrefix: `slot-${slotAcc.moveSlot}-check-bad-move`,
    });
    if (cbm.kind === "unsupported-branch") {
      throw new Error(
        `Factory AI check-bad-move barrier: slot ${slotAcc.moveSlot} move ${slotAcc.moveId} effect ${cbm.effect}`,
      );
    }
    rng = cbm.rng;
    for (const draw of cbm.draws) {
      draws.push(Object.freeze({ ...draw, phase: "check-bad-move" as const, moveSlot: slotAcc.moveSlot }));
    }
    slotAcc.checkBadMoveDelta = cbm.scoreDelta;
  }

  // `get_weather`'s own stale-`funcResult` carry from AI_TryToFaint's pass
  // into AI_CheckViability's pass, Channel 2 (doc §25.10.1) -- the funcResult
  // value TryToFaint's own last-processed slot that actually invoked
  // `get_how_powerful_move_is` left behind. `Cmd_if_can_faint` never touches
  // `funcResult` (`battle_ai_script_commands.c:1743-1770`), so a can-faint
  // slot (where `get_how_powerful_move_is` never runs) leaves the running
  // value from its predecessor untouched -- `runTryToFaint`'s own
  // `mostPowerful: null` return already signals exactly that case.
  let ttfExitFuncResult: AiWeatherValue | undefined;

  if (mask === 7) {
    // Pass 2: AI_TryToFaint, movesetIndex 0..3.
    for (const slotAcc of slotAccumulators) {
      if (!slotAcc.legal) continue;
      const ttf = runTryToFaint({
        rng,
        moveId: slotAcc.moveId,
        movesetIndex: slotAcc.moveSlot,
        moveset: view.moves,
        simulatedRng,
        attacker: view.attacker as FactoryAiTryToFaintBattler,
        target: view.target as FactoryAiTryToFaintTarget,
        drawOrdinalStart: draws.length + 1,
        reasonPrefix: `slot-${slotAcc.moveSlot}-try-to-faint`,
      });
      rng = ttf.rng;
      for (const draw of ttf.draws) {
        draws.push(Object.freeze({ ...draw, phase: "try-to-faint" as const, moveSlot: slotAcc.moveSlot }));
      }
      slotAcc.tryToFaintDelta = ttf.scoreDelta;
      if (ttf.mostPowerful !== null) {
        ttfExitFuncResult = MOST_POWERFUL_TO_FUNC_RESULT[ttf.mostPowerful];
      }
    }

    // Pass 3: AI_CheckViability, movesetIndex 0..3. `AI_CheckViability`'s own
    // preamble (`data/battle_ai_scripts.s:652-655`, `if_target_is_ally
    // AI_Ret`) never itself writes `funcResult`, so the FIRST slot this pass
    // actually scripts (movesetIndex resets to 0 entering every new
    // `aiLogicId`, `battle_ai_script_commands.c:411-413`) reads exactly the
    // TryToFaint pass's own exit value above. From there, `funcResultAfter`
    // is simulated value-level, slot by slot, across the WHOLE pass, per
    // doc §27.1's exhaustive per-handler write audit (ISSUES #47's
    // movesetIndex-1-3 remainder) -- not just a single-slot carry/no-carry
    // boolean: a writes-never handler leaves the running value untouched, a
    // writes-always handler replaces it with its own written value
    // (`runCheckViability`'s own `funcResultAfter` return), and a
    // writes-conditionally handler does either, per its own audited branch.
    let cvFuncResult: AiWeatherValue | undefined = ttfExitFuncResult;
    for (const slotAcc of slotAccumulators) {
      if (!slotAcc.legal) continue;
      const staleFuncResultFallback = cvFuncResult;
      const cv = runCheckViability({
        rng,
        moveId: slotAcc.moveId,
        attacker: {
          speed: view.attacker.speed,
          speedStage: view.attacker.statStages.speed,
          types: view.attacker.types,
          isFirstTurn: view.attacker.isFirstTurn,
          evasionStage: view.attacker.statStages.evasion,
          accStage: view.attacker.statStages.acc,
          atkStage: view.attacker.statStages.atk,
          defStage: view.attacker.statStages.def,
          spDefStage: view.attacker.statStages.spDef,
          spAtkStage: view.attacker.statStages.spAtk,
          hp: view.attacker.hp,
          maxHp: view.attacker.maxHp,
          isRooted: view.attacker.isRooted,
          ability: view.attacker.ability,
          currentWeather: view.attacker.currentWeather,
          moves: view.moves,
          battleTurnCount: view.attacker.battleTurnCount,
          isInfatuated: view.attacker.isInfatuated,
          isLeechSeeded: view.attacker.isLeechSeeded,
          hasYawn: view.attacker.hasYawn,
          protectUses: view.attacker.protectUses,
        },
        target: {
          speed: view.target.speed,
          speedStage: view.target.statStages.speed,
          types: view.target.types,
          isFirstTurn: view.target.isFirstTurn,
          evasionStage: view.target.statStages.evasion,
          accStage: view.target.statStages.acc,
          atkStage: view.target.statStages.atk,
          defStage: view.target.statStages.def,
          spDefStage: view.target.statStages.spDef,
          hp: view.target.hp,
          maxHp: view.target.maxHp,
          lastUsedMoveId: view.target.lastUsedMoveId,
          isToxicPoisoned: view.target.isToxicPoisoned,
          isLeechSeeded: view.target.isLeechSeeded,
          isCursed: view.target.isCursed,
          isInfatuated: view.target.isInfatuated,
          isAsleep: view.target.isAsleep,
          isConfused: view.target.isConfused,
          isTaunted: view.target.isTaunted,
          hasYawn: view.target.hasYawn,
          hasPerishSong: view.target.hasPerishSong,
          knownMoves: view.target.knownMoveIds,
        },
        staleFuncResultFallback,
        drawOrdinalStart: draws.length + 1,
        reasonPrefix: `slot-${slotAcc.moveSlot}-check-viability`,
      });
      if (cv.kind === "unsupported-branch") {
        throw new Error(
          `Factory AI check-viability barrier: slot ${slotAcc.moveSlot} move ${slotAcc.moveId} effect ${cv.effect}`,
        );
      }
      rng = cv.rng;
      for (const draw of cv.draws) {
        draws.push(Object.freeze({ ...draw, phase: "check-viability" as const, moveSlot: slotAcc.moveSlot }));
      }
      slotAcc.checkViabilityDelta = cv.scoreDelta;
      cvFuncResult = cv.funcResultAfter;
    }
  }

  const slotScores: FactoryAiScoredSlot[] = slotAccumulators.map((slotAcc) => {
    if (!slotAcc.legal) {
      return Object.freeze({
        moveSlot: slotAcc.moveSlot,
        moveId: slotAcc.moveId,
        legal: false,
        initialScore: DEFAULT_MOVE_SCORE,
        checkBadMoveDelta: null,
        tryToFaintDelta: null,
        checkViabilityDelta: null,
        finalScore: 0,
      });
    }
    const finalScore = DEFAULT_MOVE_SCORE
      + (slotAcc.checkBadMoveDelta ?? 0)
      + (slotAcc.tryToFaintDelta ?? 0)
      + (slotAcc.checkViabilityDelta ?? 0);
    return Object.freeze({
      moveSlot: slotAcc.moveSlot,
      moveId: slotAcc.moveId,
      legal: true,
      initialScore: DEFAULT_MOVE_SCORE,
      checkBadMoveDelta: slotAcc.checkBadMoveDelta,
      tryToFaintDelta: slotAcc.tryToFaintDelta,
      checkViabilityDelta: slotAcc.checkViabilityDelta,
      finalScore,
    });
  });

  const legalScores = slotScores.filter((slot) => slot.legal);
  const bestScore = Math.max(...legalScores.map((slot) => slot.finalScore));
  const bestMoveSlots = Object.freeze(
    legalScores.filter((slot) => slot.finalScore === bestScore).map((slot) => slot.moveSlot),
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
    mask,
    maskSelection: maskSelection.receipt,
    executedScoringScripts: Object.freeze(executedScoringScripts),
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

/** Composition twin of `submitFactoryAiMaskZeroDecision`, for masks 1/7. */
export function submitFactoryAiScoredDecision<
  RulesState extends BattleJsonObject,
>(
  state: BattleState<RulesState>,
  view: FactoryAiScoredView,
  reducer: BattleDecisionReducer<RulesState>,
): FactoryAiScoredTransition<RulesState> {
  if (state.boundary.kind !== "decision-required") {
    throw new Error("Factory AI requires a current Battle decision request");
  }
  if (state.boundary.request.kind !== "command") {
    throw new Error("Factory AI scored policy does not implement forced switches");
  }
  const choice = chooseFactoryAiScoredDecision({
    view,
    request: state.boundary.request,
    rng: state.rng,
  });
  const synchronizedReducer: BattleDecisionReducer<RulesState> = (context) => {
    for (const draw of choice.trace.draws) {
      const before = context.rng.snapshot();
      if (before.value !== draw.before.value || before.calls !== draw.before.calls) {
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
  const transition = submitBattleDecision(state, choice.submission, synchronizedReducer);
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

/**
 * Top-level Factory AI dispatch: `selectFactoryAiMask` picks band 0-1 ->
 * mask 0 (existing policy, untouched), band 2-3 -> mask 1 (CheckBadMove
 * only), band 4-7 -> mask 7 (CheckBadMove + TryToFaint + CheckViability),
 * per `GetAiScriptsInBattleFactory` (`battle_factory.c:889-911`). The kernel
 * stays decision-source-agnostic: this is the only place that picks which
 * pure policy runs before handing off to the shared `submitBattleDecision`
 * boundary.
 */
export function submitFactoryAiDecision<
  RulesState extends BattleJsonObject,
>(
  state: BattleState<RulesState>,
  view: FactoryAiScoredView,
  reducer: BattleDecisionReducer<RulesState>,
): FactoryAiDecisionTransition<RulesState> | FactoryAiScoredTransition<RulesState> {
  const mask = selectFactoryAiMask(view.factory).mask;
  if (mask === 0) {
    const maskZeroView: FactoryAiMaskZeroView = Object.freeze({
      schema: "factory-ai-view/v1",
      mode: "factory-level-50-singles",
      active: view.active,
      factory: view.factory,
      moves: view.moves,
    });
    return submitFactoryAiMaskZeroDecision(state, maskZeroView, reducer);
  }
  return submitFactoryAiScoredDecision(state, view, reducer);
}
