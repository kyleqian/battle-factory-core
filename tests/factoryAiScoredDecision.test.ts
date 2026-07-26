import { describe, expect, it } from "vitest";
import {
  chooseFactoryAiScoredDecision,
  submitFactoryAiDecision,
  type FactoryAiScoredBattlerView,
  type FactoryAiScoredTargetView,
  type FactoryAiScoredView,
} from "../src/engine/factoryAiDecisionPolicy.ts";
import {
  createBattleCommandRequest,
  createBattleState,
  type BattleDecisionReducer,
  type BattleJsonObject,
  type BattleState,
} from "../src/engine/battleDecisionBoundary.ts";
import { advanceRngValue } from "../src/engine/rng.ts";
import { DEFAULT_STAT_STAGE } from "../src/engine/damageCalc.ts";

const NEUTRAL_STAGES = Object.freeze({
  atk: DEFAULT_STAT_STAGE,
  def: DEFAULT_STAT_STAGE,
  spAtk: DEFAULT_STAT_STAGE,
  spDef: DEFAULT_STAT_STAGE,
  speed: DEFAULT_STAT_STAGE,
});

// Representative (not live-RAM-probed) level-50 Alakazam/Marowak-shaped
// stats -- real base stats (Alakazam atk50/def45/spA135/spD95;
// Marowak atk80/def110/spA50/spD80), roughly scaled to level 50, chosen so
// the *order of magnitude* of every candidate move's damage is real
// (dozens of HP against a 135-max-HP target), not exact oracle numbers.
// See docs/factory-ai-ground-truth.md and PROGRESS.md entry 457 for why
// target.hp is 5, not full: a live oracle probe this session
// (tools/battle-lab/mechanic-factory-ai-unambiguous-off.json, frame 732)
// found Marowak at 5/135 HP by the time turn 2's decision fires -- turn 1's
// own Surf hit (2x super effective) already landed before
// BattleAI_SetupAIData runs for turn 2. This means TryToFaint's can-faint
// branch, not the cannot-faint/most-powerful branch, is what actually
// governs these 3 banked scenarios' real turn-2 decision.
// Base speed 120/45 respectively -> representative (not oracle-exact) level-50
// values via the standard stat formula, same "order of magnitude, not exact"
// convention as the atk/def/spA/spD fields above.
const ALAKAZAM = Object.freeze({
  types: ["TYPE_PSYCHIC", "TYPE_PSYCHIC"] as const,
  attack: 55,
  defense: 65,
  spAttack: 135,
  spDefense: 105,
  speed: 140,
  level: 50,
  statStages: NEUTRAL_STAGES,
  isFirstTurn: 2,
});

function marowak(hp: number) {
  return Object.freeze({
    species: 105,
    types: ["TYPE_GROUND", "TYPE_GROUND"] as const,
    attack: 130,
    defense: 130,
    spAttack: 55,
    spDefense: 70,
    speed: 65,
    level: 50,
    statStages: NEUTRAL_STAGES,
    isFirstTurn: 2,
    hp,
    ability: "ABILITY_ROCK_HEAD",
    knownAbility: null,
  });
}

const MOVE_SURF = 57;
const MOVE_ROCK_SLIDE = 157;
const MOVE_BODY_SLAM = 34;
const MOVE_THUNDERBOLT = 85;
const MOVE_STRING_SHOT = 81; // EFFECT_SPEED_DOWN
const MOVE_SPLASH = 150; // EFFECT_SPLASH -- 0 power, no CBM or CV table entry

function scoredView(
  moves: readonly [number, number, number, number],
  factoryWinStreak: number,
  targetHp = 5,
): FactoryAiScoredView {
  return Object.freeze({
    schema: "factory-ai-scored-view/v1",
    mode: "factory-level-50-singles",
    active: Object.freeze({ aiBattler: 1 as const, targetBattler: 0 as const }),
    factory: Object.freeze({
      levelMode: 0 as const,
      battleMode: 0 as const,
      factoryWinStreak,
      trainerOpponentId: 222,
    }),
    moves,
    attacker: ALAKAZAM,
    target: marowak(targetHp),
  });
}

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

// docs/factory-ai-ground-truth.md's newest (2026-07-25 instrumented
// caller-attribution) section, §1: the ordered pre-decision draw sequence
// between frame-100's rngValue and BattleAI_SetupAIData's own first draw is
// 8 real LCG steps, decision-independent for every banked fixture --
// opponent's own turn-1 Cmd_seteffectwithchance tail (1) + player's 4-roll
// Pound chain (4) + BattleTurnPassed's gRandomTurnNumber draw (1) +
// ShouldSwitch's switch-AI pre-check (2, entry 455's own finding). NOT
// ported switch-AI/hit-chain semantics -- just their documented effect on
// LCG cursor position, applied here by the test layer per this step's own
// restated acceptance criterion.
const PRE_DECISION_OFFSET_DRAWS = 8;

function advanceToDecisionStart(frame100RngValue: number): { value: number; calls: number } {
  let value = frame100RngValue;
  for (let i = 0; i < PRE_DECISION_OFFSET_DRAWS; i += 1) value = advanceRngValue(value);
  return { value, calls: 0 };
}

describe("Factory AI mask 1 (CheckBadMove only) via direct construction", () => {
  it("runs only check-bad-move and draws exactly setup(4) + CBM + tie(1)", () => {
    const view = scoredView([MOVE_SURF, MOVE_ROCK_SLIDE, MOVE_BODY_SLAM, MOVE_THUNDERBOLT], 14);
    const result = chooseFactoryAiScoredDecision({
      view,
      request: fourSlotRequest,
      rng: { value: 0x1234_5678, calls: 0 },
    });
    expect(result.trace.mask).toBe(1);
    expect(result.trace.executedScoringScripts).toEqual(["check-bad-move"]);
    // Surf/RockSlide/BodySlam: non-immune, 2 get_ability draws each (6);
    // Thunderbolt: type-immune x0 short-circuit, 0 draws.
    expect(result.trace.draws).toHaveLength(4 + 6 + 1);
    expect(result.trace.slotScores.map((s) => s.finalScore)).toEqual([100, 100, 100, 90]);
    // A clean 3-way tie among the untouched-by-CBM slots (CheckBadMove's
    // universal preamble has no branch that rewards a merely-better type
    // multiplier -- confirmed by docs/factory-ai-ground-truth.md's own
    // port-subset audit §2, "mask 1 shape: NO... a 3-way tie, not native's
    // clean Surf-wins pick").
    expect(result.trace.bestMoveSlots).toEqual([0, 1, 2]);
  });
});

describe("Factory AI mask 7 (CheckBadMove + TryToFaint + CheckViability), scenario reproduction", () => {
  it("unambiguous (Surf/RockSlide/BodySlam/Thunderbolt vs pure-Ground Marowak at 5/135 HP): 11 draws, Thunderbolt loses", () => {
    const rng = advanceToDecisionStart(249_678_687); // frame-100 rngValue, seed 1
    const view = scoredView([MOVE_SURF, MOVE_ROCK_SLIDE, MOVE_BODY_SLAM, MOVE_THUNDERBOLT], 28);
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng });

    expect(result.trace.mask).toBe(7);
    expect(result.trace.executedScoringScripts).toEqual(["check-bad-move", "try-to-faint", "check-viability"]);
    // setup(4) + CBM get_ability (2 per non-immune slot x 3 = 6) + tie(1) =
    // 11, matching this step's restated acceptance ledger exactly.
    // TryToFaint draws 0 here: all 3 non-immune moves CAN faint a 5-HP
    // Marowak (the can-faint branch never reaches the x4 if_random_less_than
    // gate), and Thunderbolt's cannot-faint path isn't x4 (it's a 0x
    // immunity, not a supereffective multiplier).
    expect(result.trace.draws).toHaveLength(11);
    expect(result.trace.draws.filter((d) => "phase" in d && d.phase === "try-to-faint")).toHaveLength(0);

    // Surf/RockSlide/BodySlam can all faint a 5-HP target -> flat TryToFaint
    // +4 each, no CheckBadMove/CheckViability differentiation among them
    // (none reach a named handler) -> a genuine 3-way tie at 104. Thunderbolt:
    // CBM immunity -10, TryToFaint cannot-faint + not-most-powerful -1 -> 89.
    expect(result.trace.slotScores.map((s) => s.finalScore)).toEqual([104, 104, 104, 89]);
    expect(result.trace.bestMoveSlots).toEqual([0, 1, 2]);
    expect(result.submission.decision).toMatchObject({ kind: "use-move" });
  });

  it("tie fixture (Surf/RockSlide/Surf/Thunderbolt) reproduces the identical 11-draw shape", () => {
    const rng = advanceToDecisionStart(249_678_687); // frame-100 rngValue matches the unambiguous fixture exactly (same seed, same turn-1 pick)
    const view = scoredView([MOVE_SURF, MOVE_ROCK_SLIDE, MOVE_SURF, MOVE_THUNDERBOLT], 28);
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng });

    expect(result.trace.draws).toHaveLength(11);
    expect(result.trace.slotScores.map((s) => s.finalScore)).toEqual([104, 104, 104, 89]);
    expect(result.trace.bestMoveSlots).toEqual([0, 1, 2]);
  });

  it("degenerate fixture (all 4 slots Surf): 13 draws (4 non-immune slots x 2 get_ability), all tie at 104", () => {
    const rng = advanceToDecisionStart(2_291_141_473); // frame-100 rngValue, degenerate fixture seed 1
    const view = scoredView([MOVE_SURF, MOVE_SURF, MOVE_SURF, MOVE_SURF], 28);
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng });

    expect(result.trace.draws).toHaveLength(4 + 8 + 1);
    expect(result.trace.slotScores.map((s) => s.finalScore)).toEqual([104, 104, 104, 104]);
    expect(result.trace.bestMoveSlots).toEqual([0, 1, 2, 3]);
  });

  it("halts loudly on a CheckBadMove unsupported-branch barrier rather than silently mis-scoring", () => {
    const view = scoredView([45 /* MOVE_GROWL, has an if_effect table entry */, MOVE_SURF, MOVE_SURF, MOVE_SURF], 28);
    expect(() =>
      chooseFactoryAiScoredDecision({
        view,
        request: fourSlotRequest,
        rng: { value: 0x1234_5678, calls: 0 },
      })).toThrow(/check-bad-move barrier/);
  });

  it("halts loudly on a CheckViability unsupported-branch barrier rather than silently mis-scoring", () => {
    const view = scoredView([71 /* MOVE_ABSORB, EFFECT_ABSORB: only CheckViability has a table entry */, MOVE_SURF, MOVE_SURF, MOVE_SURF], 28);
    expect(() =>
      chooseFactoryAiScoredDecision({
        view,
        request: fourSlotRequest,
        rng: { value: 0x1234_5678, calls: 0 },
      })).toThrow(/check-viability barrier/);
  });
});

// docs/factory-ai-checkviability-ground-truth.md §6's two banked fixtures
// (tools/battle-lab/mechanic-factory-ai-cv-speeddown-{opponent-faster,
// opponent-slower}-off.json), reproduced through the REAL mask-7 dispatcher
// end to end -- the first CheckViability handler-body port, verified the
// same way entry 460's port verified the three earlier mask-7 scenarios.
//
// The doc's own control move (MOVE_GROWL) can't be reused here: its effect
// (EFFECT_ATTACK_DOWN) is a DIFFERENT CBM-blocked handler that isn't ported
// (AI_CBM_AttackDown), so it would hit an unrelated check-bad-move barrier
// before this scenario ever reached AI_CV_SpeedDown. MOVE_SPLASH substitutes
// cleanly: same 0-power/ties-most-powerful property the doc's own design
// section requires, but EFFECT_SPLASH has NO entry in either the CBM or the
// CV dispatch table at all (unconditionally 0 score/0 draws in every battle
// state, not just this one) -- so it isolates AI_CV_SpeedDown's own causal
// contribution without depending on any unported handler's state-dependent
// short-circuit.
//
// This does not replay the live oracle's exact pre-decision RNG state for
// turn 1 (docs/factory-ai-checkviability-ground-truth.md §6's own
// "Not yet banked" note: turn 1's decision is baked into rngValue before
// frame 0 is ever captured, and the caller-attribution offset that would let
// a fresh construction start from the SAME LCG state as the live fixture
// hasn't been run for these two fixtures). What IS reproduced, matching the
// doc's own tables exactly: the categorical turn-1 pick (never slot 0 when
// the opponent/AI is faster, always slot 0 when it's slower) and the
// doc-predicted policy-own draw shape (CBM/TryToFaint contribute zero draws
// in both fixtures -- Dugtrio's real ability ARENA_TRAP and Shuckle's only
// ability STURDY both short-circuit every get_ability call zero-RNG, and
// neither move's type pair ever hits the x4-effective gate TryToFaint's own
// `if_random_less_than 80` sits behind; AI_CV_SpeedDown alone draws 0 in the
// deterministic branch and exactly 1 in the probabilistic branch), across
// two different construction seeds each, matching "same turn-1 pick" cross-seed
// stability the same way the doc's own two-seed table does.
describe("AI_CV_SpeedDown mask-7 fixture reproduction (docs/factory-ai-checkviability-ground-truth.md §6)", () => {
  const MOVE_SPEED_DOWN_MOVESET = [MOVE_STRING_SHOT, MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH] as const;

  const DUGTRIO_STATS = Object.freeze({
    types: ["TYPE_GROUND", "TYPE_GROUND"] as const,
    attack: 80, defense: 50, spAttack: 50, spDefense: 70, speed: 120, level: 50,
    statStages: NEUTRAL_STAGES,
    isFirstTurn: 2,
  });
  const SHUCKLE_STATS = Object.freeze({
    types: ["TYPE_BUG", "TYPE_ROCK"] as const,
    attack: 10, defense: 230, spAttack: 10, spDefense: 230, speed: 5, level: 50,
    statStages: NEUTRAL_STAGES,
    isFirstTurn: 2,
  });
  function dugtrioTarget(): FactoryAiScoredTargetView {
    return Object.freeze({ species: 51, ...DUGTRIO_STATS, hp: 100, ability: "ABILITY_ARENA_TRAP", knownAbility: null });
  }
  function shuckleTarget(): FactoryAiScoredTargetView {
    return Object.freeze({ species: 213, ...SHUCKLE_STATS, hp: 100, ability: "ABILITY_STURDY", knownAbility: null });
  }
  function speedDownView(attacker: FactoryAiScoredBattlerView, target: FactoryAiScoredTargetView): FactoryAiScoredView {
    return Object.freeze({
      schema: "factory-ai-scored-view/v1",
      mode: "factory-level-50-singles",
      active: Object.freeze({ aiBattler: 1 as const, targetBattler: 0 as const }),
      factory: Object.freeze({ levelMode: 0 as const, battleMode: 0 as const, factoryWinStreak: 28, trainerOpponentId: 222 }),
      moves: MOVE_SPEED_DOWN_MOVESET,
      attacker,
      target,
    });
  }

  it.each([1, 99])("opponent-faster fixture (Dugtrio AI vs Shuckle target), seed %i: never picks String Shot, 5 total draws, zero CBM/TryToFaint/CV draws for the -3 branch", (seed) => {
    const view = speedDownView(DUGTRIO_STATS, shuckleTarget());
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: seed, calls: 0 } });
    expect(result.trace.draws).toHaveLength(4 /* setup */ + 1 /* tie */);
    expect(result.trace.slotScores.map((s) => s.finalScore)).toEqual([97, 100, 100, 100]);
    expect(result.trace.bestMoveSlots).toEqual([1, 2, 3]);
    expect(result.submission.decision).toMatchObject({ kind: "use-move" });
    if (result.submission.decision.kind === "use-move") {
      expect(result.submission.decision.moveSlot).not.toBe(0);
    }
  });

  it.each([1, 99])("opponent-slower fixture (Shuckle AI vs Dugtrio target), seed %i: always picks String Shot, 6 total draws (the if_random_less_than 70 roll lands >= 70)", (seed) => {
    const view = speedDownView(SHUCKLE_STATS, dugtrioTarget());
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: seed, calls: 0 } });
    expect(result.trace.draws).toHaveLength(4 /* setup */ + 1 /* CV roll */ + 1 /* tie */);
    expect(result.trace.slotScores.map((s) => s.finalScore)).toEqual([102, 100, 100, 100]);
    expect(result.trace.bestMoveSlots).toEqual([0]);
    expect(result.submission.decision).toMatchObject({ kind: "use-move", moveSlot: 0 });
  });
});

type FixtureRules = BattleJsonObject & Readonly<{ acceptedMoveSlot: number | null }>;

describe("submitFactoryAiDecision top-level dispatch", () => {
  it("routes challenge band 0-1 to the untouched mask-0 policy", () => {
    const state = createBattleState({
      rules: { acceptedMoveSlot: null },
      rngSeed: 0x1234_5678,
      request: fourSlotRequest,
    }) as BattleState<FixtureRules>;
    const reducer: BattleDecisionReducer<FixtureRules> = (context) => ({
      rules: { acceptedMoveSlot: context.decision.kind === "use-move" ? context.decision.moveSlot : null },
      events: [],
      boundary: { kind: "terminal", outcome: "player-win" },
    });
    const view = scoredView([MOVE_SURF, MOVE_ROCK_SLIDE, MOVE_BODY_SLAM, MOVE_THUNDERBOLT], 0);
    const result = submitFactoryAiDecision(state, view, reducer);
    expect(result.trace.mask).toBe(0);
    expect(result.trace).not.toHaveProperty("executedScoringScripts", ["check-bad-move"]);
  });

  it("routes challenge band 2-3 to mask 1 and band 4+ to mask 7", () => {
    const makeState = () => createBattleState({
      rules: { acceptedMoveSlot: null },
      rngSeed: 0x1234_5678,
      request: fourSlotRequest,
    }) as BattleState<FixtureRules>;
    const reducer: BattleDecisionReducer<FixtureRules> = (context) => ({
      rules: { acceptedMoveSlot: context.decision.kind === "use-move" ? context.decision.moveSlot : null },
      events: [],
      boundary: { kind: "terminal", outcome: "player-win" },
    });

    const band3 = submitFactoryAiDecision(
      makeState(),
      scoredView([MOVE_SURF, MOVE_ROCK_SLIDE, MOVE_BODY_SLAM, MOVE_THUNDERBOLT], 3 * 7),
      reducer,
    );
    expect(band3.trace.mask).toBe(1);

    const band4 = submitFactoryAiDecision(
      makeState(),
      scoredView([MOVE_SURF, MOVE_ROCK_SLIDE, MOVE_BODY_SLAM, MOVE_THUNDERBOLT], 4 * 7),
      reducer,
    );
    expect(band4.trace.mask).toBe(7);
  });
});
