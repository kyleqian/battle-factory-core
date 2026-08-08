import { describe, expect, it, vi } from "vitest";
import {
  chooseFactoryAiScoredDecision,
  type FactoryAiScoredBattlerView,
  type FactoryAiScoredTargetView,
  type FactoryAiScoredView,
} from "../src/engine/factoryAiDecisionPolicy.ts";
import {
  AI_WEATHER_SUN,
  type AiWeatherValue,
  type FactoryAiCheckBadMoveAttacker,
  type FactoryAiCheckBadMoveRoarTarget,
  type FactoryAiMonGender,
} from "../src/engine/factoryAiCheckBadMove.ts";
import type { FactoryAiCheckViabilityBattler } from "../src/engine/factoryAiCheckViability.ts";
import type {
  FactoryAiTryToFaintBattler,
  FactoryAiTryToFaintTarget,
} from "../src/engine/factoryAiTryToFaint.ts";
import {
  createBattleCommandRequest,
} from "../src/engine/battleDecisionBoundary.ts";
import { DEFAULT_STAT_STAGE } from "../src/engine/damageCalc.ts";

// Part B of the "unwired handler-input field" fix (PROGRESS.md entry 1004):
// a structural guard that makes the whole defect class impossible. It wraps
// the three live scorer entry points to capture the exact objects the
// adapter (`chooseFactoryAiScoredDecision`) hands to each scorer, then
// derives the handler-input field sets from the declared types (via
// compile-time-exhaustive `Required<T>` samples, so `npm run typecheck`
// enforces the samples stay complete) and asserts every declared field is
// present on the captured object. Adding a handler-input field tomorrow
// without wiring it in `factoryAiDecisionPolicy.ts` fails this test by name.
const { capturedCv, capturedCbm, capturedTtf } = vi.hoisted(() => ({
  capturedCv: [] as unknown[],
  capturedCbm: [] as unknown[],
  capturedTtf: [] as unknown[],
}));

vi.mock("../src/engine/factoryAiCheckViability.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/engine/factoryAiCheckViability.ts")>();
  return {
    ...actual,
    runCheckViability: (input: Parameters<typeof actual.runCheckViability>[0]) => {
      capturedCv.push(input);
      return actual.runCheckViability(input);
    },
  };
});

vi.mock("../src/engine/factoryAiCheckBadMove.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/engine/factoryAiCheckBadMove.ts")>();
  return {
    ...actual,
    runCheckBadMovePreamble: (input: Parameters<typeof actual.runCheckBadMovePreamble>[0]) => {
      capturedCbm.push(input);
      return actual.runCheckBadMovePreamble(input);
    },
  };
});

vi.mock("../src/engine/factoryAiTryToFaint.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/engine/factoryAiTryToFaint.ts")>();
  return {
    ...actual,
    runTryToFaint: (input: Parameters<typeof actual.runTryToFaint>[0]) => {
      capturedTtf.push(input);
      return actual.runTryToFaint(input);
    },
  };
});

const NEUTRAL_STAGES = Object.freeze({
  atk: DEFAULT_STAT_STAGE,
  def: DEFAULT_STAT_STAGE,
  spAtk: DEFAULT_STAT_STAGE,
  spDef: DEFAULT_STAT_STAGE,
  speed: DEFAULT_STAT_STAGE,
  acc: DEFAULT_STAT_STAGE,
  evasion: DEFAULT_STAT_STAGE,
});

const MOVE_SPLASH = 150; // EFFECT_SPLASH -- no CBM or CV table entry, so every pass runs without a barrier

// Every optional scored-view field set to a non-default value, so every
// conditional spread in the adapter's pass literals fires and the captured
// objects carry the full populated set. `Required<...>` makes this
// compile-time-exhaustive: a new view field forces this object to grow.
const PROBE_ATTACKER: Required<FactoryAiScoredBattlerView> = Object.freeze({
  types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
  attack: 1,
  defense: 1,
  spAttack: 1,
  spDefense: 1,
  speed: 1,
  level: 50,
  statStages: NEUTRAL_STAGES,
  isFirstTurn: 1,
  hp: 1,
  maxHp: 1,
  lastUsedMoveId: 1,
  isToxicPoisoned: true,
  hasAnyStatus: true,
  isConfused: true,
  isAsleep: true,
  isTaunted: true,
  isLeechSeeded: true,
  isInfatuated: true,
  hasYawn: true,
  hasPerishSong: true,
  isNightmared: true,
  isForesighted: true,
  spikesUp: true,
  targetFutureAttackUp: true,
  protectUses: 1,
  battleTurnCount: 1,
  isRooted: true,
  attackerFutureAttackUp: true,
  hasFocusEnergy: true,
  hasCurableStatus: true,
  isCursed: true,
  isEscapePrevented: true,
  isTormented: true,
  lightScreenUp: true,
  reflectUp: true,
  safeguardUp: true,
  isPoisoned: true,
  isBurned: true,
  isParalyzed: true,
  targetSideReflectUp: true,
  targetPartyStatusEqualsAny: true,
  ability: "ABILITY_PRESSURE",
  currentWeather: AI_WEATHER_SUN as AiWeatherValue,
  usablePartyMons: 1,
  hasSubstitute: true,
  anyMoveDisabled: true,
  anyMoveEncored: true,
  mistUp: true,
  gender: "MON_MALE" as FactoryAiMonGender,
  imprisonedOthers: true,
  mudSportUp: true,
  waterSportUp: true,
  usedHeldItemId: 1,
  stockpileCount: 1,
});

const PROBE_TARGET: Required<FactoryAiScoredTargetView> = Object.freeze({
  ...PROBE_ATTACKER,
  species: 1,
  ability: "ABILITY_PRESSURE",
  knownAbility: null,
  knownItemEffect: 1,
  knownMoveIds: [1, 1, 1, 1],
  usablePartyMons: 1,
});

const PROBE_VIEW: FactoryAiScoredView = Object.freeze({
  schema: "factory-ai-scored-view/v1",
  mode: "factory-level-50-singles",
  active: Object.freeze({ aiBattler: 1 as const, targetBattler: 0 as const }),
  factory: Object.freeze({
    levelMode: 0 as const,
    battleMode: 0 as const,
    factoryWinStreak: 28,
    trainerOpponentId: 222,
  }),
  moves: [MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH] as const,
  attacker: PROBE_ATTACKER,
  target: PROBE_TARGET,
});

const fourSlotRequest = createBattleCommandRequest({
  kind: "command",
  requestId: 1,
  side: "trainer",
  battler: 1,
  legalDecisions: [
    { kind: "use-move", moveSlot: 0, targetBattler: 0 },
    { kind: "use-move", moveSlot: 1, targetBattler: 0 },
    { kind: "use-move", moveSlot: 2, targetBattler: 0 },
    { kind: "use-move", moveSlot: 3, targetBattler: 0 },
  ],
});

// Compile-time-exhaustive samples of the handler-input types. `Required<T>`
// (with every field literally present) means typecheck fails the moment a
// handler-input type grows a field this sample does not cover, so the
// declared sets below cannot rot silently.
const CV_BATTLER_SAMPLE: Required<FactoryAiCheckViabilityBattler> = Object.freeze({
  speed: 1,
  speedStage: DEFAULT_STAT_STAGE,
  types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
  isFirstTurn: 1,
  evasionStage: DEFAULT_STAT_STAGE,
  accStage: DEFAULT_STAT_STAGE,
  atkStage: DEFAULT_STAT_STAGE,
  defStage: DEFAULT_STAT_STAGE,
  spDefStage: DEFAULT_STAT_STAGE,
  hp: 1,
  maxHp: 1,
  spAtkStage: DEFAULT_STAT_STAGE,
  lastUsedMoveId: 1,
  isToxicPoisoned: true,
  isLeechSeeded: true,
  isRooted: true,
  isCursed: true,
  ability: "ABILITY_NONE",
  currentWeather: AI_WEATHER_SUN as AiWeatherValue,
  moves: [1, 1, 1, 1] as const,
  battleTurnCount: 1,
  knownMoves: [1],
  isInfatuated: true,
  isAsleep: true,
  isConfused: true,
  isTaunted: true,
  hasYawn: true,
  hasPerishSong: true,
  protectUses: 1,
  hasSideReflect: true,
  isPoisoned: true,
  isBurned: true,
  isParalyzed: true,
  hasSubstitute: true,
  anyMoveDisabled: true,
  hasAnyStatus: true,
  targetPartyStatusEqualsAny: true,
});

const CBM_TARGET_SAMPLE: Required<FactoryAiCheckBadMoveRoarTarget> = Object.freeze({
  species: 1,
  types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
  knownAbility: null,
  realAbility: "ABILITY_NONE",
  speedStage: DEFAULT_STAT_STAGE,
  atkStage: DEFAULT_STAT_STAGE,
  defStage: DEFAULT_STAT_STAGE,
  spDefStage: DEFAULT_STAT_STAGE,
  accStage: DEFAULT_STAT_STAGE,
  evasionStage: DEFAULT_STAT_STAGE,
  hasAnyStatus: true,
  safeguardUp: true,
  isConfused: true,
  isLeechSeeded: true,
  isAsleep: true,
  isEscapePrevented: true,
  isTormented: true,
  hasPerishSong: true,
  isNightmared: true,
  isForesighted: true,
  spikesUp: true,
  targetFutureAttackUp: true,
  level: 50,
  spAtkStage: DEFAULT_STAT_STAGE,
  isInfatuated: true,
  anyMoveDisabled: true,
  anyMoveEncored: true,
  gender: "MON_MALE" as FactoryAiMonGender,
  usablePartyMons: 1,
});

const CBM_ATTACKER_SAMPLE: Required<FactoryAiCheckBadMoveAttacker> = Object.freeze({
  atkStage: DEFAULT_STAT_STAGE,
  defStage: DEFAULT_STAT_STAGE,
  speedStage: DEFAULT_STAT_STAGE,
  spAtkStage: DEFAULT_STAT_STAGE,
  spDefStage: DEFAULT_STAT_STAGE,
  lightScreenUp: true,
  reflectUp: true,
  evasionStage: DEFAULT_STAT_STAGE,
  attackerFutureAttackUp: true,
  hasFocusEnergy: true,
  hasCurableStatus: true,
  currentWeather: AI_WEATHER_SUN as AiWeatherValue,
  level: 50,
  isFirstTurn: 1,
  safeguardUp: true,
  isAsleep: true,
  usablePartyMons: 1,
  hasSubstitute: true,
  hp: 1,
  maxHp: 1,
  isRooted: true,
  accStage: DEFAULT_STAT_STAGE,
  mistUp: true,
  gender: "MON_MALE" as FactoryAiMonGender,
  imprisonedOthers: true,
  mudSportUp: true,
  waterSportUp: true,
  usedHeldItemId: 1,
  stockpileCount: 1,
});

const TTF_BATTLER_SAMPLE: Required<FactoryAiTryToFaintBattler> = Object.freeze({
  attack: 1,
  defense: 1,
  spAttack: 1,
  spDefense: 1,
  level: 50,
  types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
  statStages: NEUTRAL_STAGES,
});

const TTF_TARGET_SAMPLE: Required<FactoryAiTryToFaintTarget> = Object.freeze({
  ...TTF_BATTLER_SAMPLE,
  hp: 1,
  ability: "ABILITY_NONE",
});

function keysOf<T extends object>(sample: T): readonly string[] {
  return Object.keys(sample).sort();
}

function coveredBy(declared: readonly string[], populated: readonly string[]): string[] {
  const populatedSet = new Set(populated);
  return declared.filter((key) => !populatedSet.has(key));
}

function assertNoExtras(populated: readonly string[], declared: readonly string[], label: string): void {
  const declaredSet = new Set(declared);
  const extras = populated.filter((key) => !declaredSet.has(key));
  expect(extras, `${label}: adapter passed fields the handler-input type does not declare -- remove or declare them`).toEqual([]);
}

describe("handler-input fields are all populated by the live adapter (wiring parity)", () => {
  it("runs all three scorer passes against the all-fields probe view", () => {
    capturedCv.length = 0;
    capturedCbm.length = 0;
    capturedTtf.length = 0;
    const result = chooseFactoryAiScoredDecision({
      view: PROBE_VIEW,
      request: fourSlotRequest,
      rng: { value: 1, calls: 0 },
    });
    expect(result.trace.executedScoringScripts).toEqual(["check-bad-move", "try-to-faint", "check-viability"]);
    expect(capturedCbm.length).toBe(4);
    expect(capturedTtf.length).toBe(4);
    expect(capturedCv.length).toBe(4);
  });

  it("AI_CheckViability: every declared handler-input field is carried by the pass-3 attacker/target literals", () => {
    capturedCv.length = 0;
    chooseFactoryAiScoredDecision({ view: PROBE_VIEW, request: fourSlotRequest, rng: { value: 1, calls: 0 } });
    const input = capturedCv[0] as Readonly<{
      attacker: FactoryAiCheckViabilityBattler;
      target: FactoryAiCheckViabilityBattler;
    }>;
    expect(input).toBeDefined();
    const declared = keysOf(CV_BATTLER_SAMPLE);
    const populated = [...Object.keys(input.attacker), ...Object.keys(input.target)];
    const missing = coveredBy(declared, populated);
    expect(
      missing,
      `AI_CheckViability handler-input fields the pass-3 adapter never populates -- wire them in factoryAiDecisionPolicy.ts's runCheckViability call (add a view field, carry it in the attacker/target literal, pin it with a through-the-adapter test). Offending: ${missing.join(", ")}`,
    ).toEqual([]);
    assertNoExtras(populated, declared, "AI_CheckViability");
  });

  it("AI_CheckBadMove: every declared handler-input field is carried by the CBM attacker/target adapters", () => {
    capturedCbm.length = 0;
    chooseFactoryAiScoredDecision({ view: PROBE_VIEW, request: fourSlotRequest, rng: { value: 1, calls: 0 } });
    const input = capturedCbm[0] as Readonly<{
      attacker: FactoryAiCheckBadMoveAttacker;
      target: FactoryAiCheckBadMoveRoarTarget;
    }>;
    expect(input).toBeDefined();
    const declared = [...keysOf(CBM_ATTACKER_SAMPLE), ...keysOf(CBM_TARGET_SAMPLE)].sort();
    const populated = [...Object.keys(input.attacker), ...Object.keys(input.target)];
    const missing = coveredBy(declared, populated);
    expect(
      missing,
      `AI_CheckBadMove handler-input fields the adapter never populates -- wire them in factoryAiDecisionPolicy.ts's targetForCbm/attackerForCbm literals. Offending: ${missing.join(", ")}`,
    ).toEqual([]);
    assertNoExtras(populated, declared, "AI_CheckBadMove");
  });

  it("AI_TryToFaint: every declared handler-input field is carried by the passed-through view battlers", () => {
    capturedTtf.length = 0;
    chooseFactoryAiScoredDecision({ view: PROBE_VIEW, request: fourSlotRequest, rng: { value: 1, calls: 0 } });
    const input = capturedTtf[0] as Readonly<{
      attacker: FactoryAiTryToFaintBattler;
      target: FactoryAiTryToFaintTarget;
    }>;
    expect(input).toBeDefined();
    const declared = [...keysOf(TTF_BATTLER_SAMPLE), ...keysOf(TTF_TARGET_SAMPLE)].sort();
    const populated = [...Object.keys(input.attacker), ...Object.keys(input.target)];
    const missing = coveredBy(declared, populated);
    expect(
      missing,
      `AI_TryToFaint handler-input fields the passed-through view does not carry -- add them to FactoryAiScoredBattlerView/FactoryAiScoredTargetView (and populate them in the live driver). Offending: ${missing.join(", ")}`,
    ).toEqual([]);
  });
});
