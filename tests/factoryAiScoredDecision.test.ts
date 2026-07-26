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
  acc: DEFAULT_STAT_STAGE,
  evasion: DEFAULT_STAT_STAGE,
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
  hp: 135,
  maxHp: 135,
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
    maxHp: 135,
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
    hp: 100, maxHp: 100,
  });
  const SHUCKLE_STATS = Object.freeze({
    types: ["TYPE_BUG", "TYPE_ROCK"] as const,
    attack: 10, defense: 230, spAttack: 10, spDefense: 230, speed: 5, level: 50,
    statStages: NEUTRAL_STAGES,
    isFirstTurn: 2,
    hp: 100, maxHp: 100,
  });
  function dugtrioTarget(): FactoryAiScoredTargetView {
    return Object.freeze({ species: 51, ...DUGTRIO_STATS, ability: "ABILITY_ARENA_TRAP", knownAbility: null });
  }
  function shuckleTarget(): FactoryAiScoredTargetView {
    return Object.freeze({ species: 213, ...SHUCKLE_STATS, ability: "ABILITY_STURDY", knownAbility: null });
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

const MOVE_PURSUIT = 228; // EFFECT_PURSUIT
const MOVE_SLASH = 163; // EFFECT_HIGH_CRITICAL

// docs/factory-ai-checkviability-ground-truth.md §11.1's two banked fixtures
// (tools/battle-lab/mechanic-factory-ai-cv-pursuit-{ghost-reach,normal-control}-off.json).
// Both fixtures use all 4 opponent slots as the SAME dispatch move
// (MOVE_PURSUIT) -- unlike SpeedDown's own MOVE_GROWL confound (entry 463,
// EFFECT_ATTACK_DOWN hits an unrelated unported CBM barrier), EFFECT_PURSUIT
// has no CheckBadMove table entry at all (doc §4), so no control-move
// substitution is needed here -- the real fixture's own moveset reproduces
// directly, verbatim.
//
// This does NOT replay the live oracle's multi-turn window total (doc
// §11.0's own "do not chase the window total" finding -- the window embeds
// a phantom next-decision whose OWN draw count is sensitive to unrelated
// subsystems, not AI_CV_Pursuit's own contribution). Instead it constructs
// turn 3's decision directly (isFirstTurn=0, the exact state the real
// fixture's own reachable branch is measured at, per doc §11.1) and asserts
// the policy-own draw shape structurally implied by running the identical
// handler across all 4 identical slots -- matching this file's own
// "degenerate fixture (all 4 slots Surf)" precedent above: N identical
// slots each independently draw when reachable, not a single shared draw.
describe("AI_CV_Pursuit mask-7 fixture reproduction (docs/factory-ai-checkviability-ground-truth.md §11.1)", () => {
  const MAROWAK_PURSUIT_MOVESET = [MOVE_PURSUIT, MOVE_PURSUIT, MOVE_PURSUIT, MOVE_PURSUIT] as const;

  function marowakAttacker(isFirstTurn: number): FactoryAiScoredBattlerView {
    return Object.freeze({
      types: ["TYPE_GROUND", "TYPE_GROUND"] as const,
      attack: 80, defense: 110, spAttack: 50, spDefense: 80, speed: 45, level: 50,
      statStages: NEUTRAL_STAGES,
      isFirstTurn,
      hp: 100, maxHp: 100,
    });
  }
  function wobbuffetTarget(): FactoryAiScoredTargetView {
    return Object.freeze({
      species: 202,
      types: ["TYPE_PSYCHIC", "TYPE_PSYCHIC"] as const,
      attack: 33, defense: 58, spAttack: 33, spDefense: 58, speed: 33, level: 50,
      statStages: NEUTRAL_STAGES,
      isFirstTurn: 0,
      hp: 190, maxHp: 190, ability: "ABILITY_SHADOW_TAG", knownAbility: null,
    });
  }
  function miltankTarget(): FactoryAiScoredTargetView {
    return Object.freeze({
      species: 241,
      types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
      attack: 80, defense: 105, spAttack: 40, spDefense: 70, speed: 100, level: 50,
      statStages: NEUTRAL_STAGES,
      isFirstTurn: 0,
      hp: 95, maxHp: 95, ability: "ABILITY_THICK_FAT", knownAbility: null,
    });
  }
  function pursuitView(attacker: FactoryAiScoredBattlerView, target: FactoryAiScoredTargetView): FactoryAiScoredView {
    return Object.freeze({
      schema: "factory-ai-scored-view/v1",
      mode: "factory-level-50-singles",
      active: Object.freeze({ aiBattler: 1 as const, targetBattler: 0 as const }),
      factory: Object.freeze({ levelMode: 0 as const, battleMode: 0 as const, factoryWinStreak: 28, trainerOpponentId: 222 }),
      moves: MAROWAK_PURSUIT_MOVESET,
      attacker,
      target,
    });
  }
  function checkViabilityDraws(result: ReturnType<typeof chooseFactoryAiScoredDecision>) {
    return result.trace.draws.filter((d) => "phase" in d && d.phase === "check-viability");
  }

  it.each([1, 99])("ghost-reach fixture (Wobbuffet target, pure Psychic), seed %i, turn-3 decision (isFirstTurn=0): all 4 identical Pursuit slots independently reach AI_CV_Pursuit2, exactly 4 check-viability draws, picks Pursuit", (seed) => {
    const view = pursuitView(marowakAttacker(0), wobbuffetTarget());
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: seed, calls: 0 } });
    const cvDraws = checkViabilityDraws(result);
    expect(cvDraws).toHaveLength(4);
    expect(cvDraws.every((d) => "kind" in d && d.kind === "pursuit-roll")).toBe(true);
    expect(result.submission.decision).toMatchObject({ kind: "use-move" });
    if (result.submission.decision.kind === "use-move") {
      expect(view.moves[result.submission.decision.moveSlot]).toBe(MOVE_PURSUIT);
    }
  });

  it.each([1, 99])("normal-control fixture (Miltank target, pure Normal), seed %i, turn-3 decision (isFirstTurn=0): target type never matches Ghost/Psychic, zero check-viability draws, picks Pursuit", (seed) => {
    const view = pursuitView(marowakAttacker(0), miltankTarget());
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: seed, calls: 0 } });
    const cvDraws = checkViabilityDraws(result);
    expect(cvDraws).toHaveLength(0);
    expect(result.submission.decision).toMatchObject({ kind: "use-move" });
    if (result.submission.decision.kind === "use-move") {
      expect(view.moves[result.submission.decision.moveSlot]).toBe(MOVE_PURSUIT);
    }
  });

  it.each([1, 99])("turn-1 decision (isFirstTurn=2) against the SAME reach target, seed %i: is_first_turn_for's own gate keeps check-viability at zero draws regardless of the target's type", (seed) => {
    const view = pursuitView(marowakAttacker(2), wobbuffetTarget());
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: seed, calls: 0 } });
    expect(checkViabilityDraws(result)).toHaveLength(0);
  });
});

// docs/factory-ai-checkviability-ground-truth.md §11.2's two banked fixtures
// (tools/battle-lab/mechanic-factory-ai-cv-highcrit-{neutral,resisted}-off.json).
// Same all-4-slots-identical design and "do not chase the window total"
// discipline as the AI_CV_Pursuit block above -- EFFECT_HIGH_CRITICAL has no
// CheckBadMove table entry either, so MOVE_SLASH reproduces directly.
// HighCrit has no isFirstTurn precondition (state-independent, like
// SpeedDown), so unlike Pursuit this needs no turn-3 construction --
// AI_USER's own isFirstTurn is fixed at a single value (2) throughout.
describe("AI_CV_HighCrit mask-7 fixture reproduction (docs/factory-ai-checkviability-ground-truth.md §11.2)", () => {
  const MAROWAK_SLASH_MOVESET = [MOVE_SLASH, MOVE_SLASH, MOVE_SLASH, MOVE_SLASH] as const;

  const MAROWAK_ATTACKER: FactoryAiScoredBattlerView = Object.freeze({
    types: ["TYPE_GROUND", "TYPE_GROUND"] as const,
    attack: 80, defense: 110, spAttack: 50, spDefense: 80, speed: 45, level: 50,
    statStages: NEUTRAL_STAGES,
    isFirstTurn: 2,
    hp: 100, maxHp: 100,
  });
  function onixTarget(): FactoryAiScoredTargetView {
    return Object.freeze({
      species: 95,
      types: ["TYPE_ROCK", "TYPE_GROUND"] as const,
      attack: 45, defense: 160, spAttack: 30, spDefense: 45, speed: 70, level: 50,
      statStages: NEUTRAL_STAGES,
      isFirstTurn: 0,
      hp: 35, maxHp: 100, ability: "ABILITY_ROCK_HEAD", knownAbility: null,
    });
  }
  function dugtrioTarget(): FactoryAiScoredTargetView {
    return Object.freeze({
      species: 51,
      types: ["TYPE_GROUND", "TYPE_GROUND"] as const,
      attack: 80, defense: 50, spAttack: 50, spDefense: 70, speed: 120, level: 50,
      statStages: NEUTRAL_STAGES,
      isFirstTurn: 0,
      hp: 35, maxHp: 100, ability: "ABILITY_ARENA_TRAP", knownAbility: null,
    });
  }
  function highCritView(target: FactoryAiScoredTargetView): FactoryAiScoredView {
    return Object.freeze({
      schema: "factory-ai-scored-view/v1",
      mode: "factory-level-50-singles",
      active: Object.freeze({ aiBattler: 1 as const, targetBattler: 0 as const }),
      factory: Object.freeze({ levelMode: 0 as const, battleMode: 0 as const, factoryWinStreak: 28, trainerOpponentId: 222 }),
      moves: MAROWAK_SLASH_MOVESET,
      attacker: MAROWAK_ATTACKER,
      target,
    });
  }
  function checkViabilityDraws(result: ReturnType<typeof chooseFactoryAiScoredDecision>) {
    return result.trace.draws.filter((d) => "phase" in d && d.phase === "check-viability");
  }

  it.each([1, 99])("resisted fixture (Onix target, Rock/Ground -- 0.5x), seed %i: deterministic zero check-viability draws across all 4 identical Slash slots, picks Slash", (seed) => {
    const view = highCritView(onixTarget());
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: seed, calls: 0 } });
    expect(checkViabilityDraws(result)).toHaveLength(0);
    expect(result.submission.decision).toMatchObject({ kind: "use-move" });
    if (result.submission.decision.kind === "use-move") {
      expect(view.moves[result.submission.decision.moveSlot]).toBe(MOVE_SLASH);
    }
  });

  it.each([1, 99])("neutral fixture (Dugtrio target, pure Ground -- 1x), seed %i: each of the 4 identical Slash slots independently reaches the neutral fallthrough (doc §11.2's own 1-or-2-draw-per-reach quirk), picks Slash", (seed) => {
    const view = highCritView(dugtrioTarget());
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: seed, calls: 0 } });
    const cvDraws = checkViabilityDraws(result);
    // Each of the 4 slots independently burns 1 draw (first roll < 128) or 2
    // (first roll >= 128, cascading into AI_CV_HighCrit2's own roll), so the
    // policy-own total ranges 4-8 depending on the 4 slots' own individual
    // rolls -- deterministic and reproducible for a GIVEN seed (pinned exact
    // below at both banked seeds, live-computed, not guessed), but not
    // asserted equal ACROSS seeds -- doc §11.2's own documented cross-seed
    // instability, reproduced structurally here rather than against the
    // oracle's own window-total numbers.
    expect(cvDraws.length).toBeGreaterThanOrEqual(4);
    expect(cvDraws.length).toBeLessThanOrEqual(8);
    expect(cvDraws).toHaveLength(6);
    expect(cvDraws.every((d) => "kind" in d && (d.kind === "high-crit-fallthrough-roll" || d.kind === "high-crit-roll"))).toBe(true);
    expect(result.submission.decision).toMatchObject({ kind: "use-move" });
    if (result.submission.decision.kind === "use-move") {
      expect(view.moves[result.submission.decision.moveSlot]).toBe(MOVE_SLASH);
    }
  });
});

const MOVE_SWIFT = 129; // EFFECT_ALWAYS_HIT

// docs/factory-ai-checkviability-ground-truth.md §12.1's two banked fixtures
// (tools/battle-lab/mechanic-factory-ai-cv-alwayshit-{evasion-reach,
// splash-control}-off.json). Same all-4-slots-identical design as the
// Pursuit/HighCrit blocks above -- EFFECT_ALWAYS_HIT has no CheckBadMove
// table entry either, so MOVE_SWIFT reproduces directly. Unlike Pursuit's
// isFirstTurn gate, AI_CV_AlwaysHit's own precondition (the TARGET's own
// evasion stage) is real accumulated state, not a fixed per-turn counter --
// this constructs the DECISIVE state directly (the target's evasion stat
// stage at the real fixture's own turn 4/5 decisions) rather than replaying
// the fixture's own 4-turn Double Team build, matching this file's own
// "construct the decision directly, assert the policy-own draw shape"
// precedent (§11.1/§11.2 above) -- the 44/44 and 36/36 banked numbers are
// WINDOW totals (setup/tie draws + every executed turn's own decision, most
// of them unreachable), not this handler's own policy-level contribution.
describe("AI_CV_AlwaysHit mask-7 fixture reproduction (docs/factory-ai-checkviability-ground-truth.md §12.1)", () => {
  const MAROWAK_SWIFT_MOVESET = [MOVE_SWIFT, MOVE_SWIFT, MOVE_SWIFT, MOVE_SWIFT] as const;

  const MAROWAK_ATTACKER: FactoryAiScoredBattlerView = Object.freeze({
    types: ["TYPE_GROUND", "TYPE_GROUND"] as const,
    attack: 80, defense: 110, spAttack: 50, spDefense: 80, speed: 45, level: 50,
    statStages: NEUTRAL_STAGES,
    isFirstTurn: 0,
    hp: 100, maxHp: 100,
  });
  // Real base stats (species-types.json/species-stats.json): Ghost/Poison,
  // immune to MOVE_SWIFT's Normal type regardless of evasion -- same
  // zero-damage-across-every-turn property doc §12.1 relies on to remove any
  // TryToFaint HP-band confound.
  function haunterTarget(evasionStage: number): FactoryAiScoredTargetView {
    return Object.freeze({
      species: 93,
      types: ["TYPE_GHOST", "TYPE_POISON"] as const,
      attack: 50, defense: 45, spAttack: 115, spDefense: 55, speed: 95, level: 50,
      statStages: Object.freeze({ ...NEUTRAL_STAGES, evasion: evasionStage }),
      isFirstTurn: 0,
      hp: 60, maxHp: 100, ability: "ABILITY_LEVITATE", knownAbility: null,
    });
  }
  function alwaysHitView(target: FactoryAiScoredTargetView): FactoryAiScoredView {
    return Object.freeze({
      schema: "factory-ai-scored-view/v1",
      mode: "factory-level-50-singles",
      active: Object.freeze({ aiBattler: 1 as const, targetBattler: 0 as const }),
      factory: Object.freeze({ levelMode: 0 as const, battleMode: 0 as const, factoryWinStreak: 28, trainerOpponentId: 222 }),
      moves: MAROWAK_SWIFT_MOVESET,
      attacker: MAROWAK_ATTACKER,
      target,
    });
  }
  function checkViabilityDraws(result: ReturnType<typeof chooseFactoryAiScoredDecision>) {
    return result.trace.draws.filter((d) => "phase" in d && d.phase === "check-viability");
  }

  it.each([1, 99])("reach fixture, target (Haunter) evasion stage 9 (turn 4's real decision), seed %i: all 4 identical Swift slots independently reach AI_CV_AlwaysHit2, exactly 4 check-viability draws, picks Swift", (seed) => {
    const view = alwaysHitView(haunterTarget(9));
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: seed, calls: 0 } });
    const cvDraws = checkViabilityDraws(result);
    expect(cvDraws).toHaveLength(4);
    expect(cvDraws.every((d) => "kind" in d && d.kind === "always-hit-roll")).toBe(true);
    expect(result.submission.decision).toMatchObject({ kind: "use-move" });
    if (result.submission.decision.kind === "use-move") {
      expect(view.moves[result.submission.decision.moveSlot]).toBe(MOVE_SWIFT);
    }
  });

  it.each([1, 99])("reach fixture, target (Haunter) evasion stage 10 (turn 5's phantom decision, still >8 not >10), seed %i: exactly 4 check-viability draws", (seed) => {
    const view = alwaysHitView(haunterTarget(10));
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: seed, calls: 0 } });
    expect(checkViabilityDraws(result)).toHaveLength(4);
  });

  it.each([1, 99])("splash-control fixture, target (Haunter) evasion stays neutral (stage 6), seed %i: neither gate ever true, zero check-viability draws, picks Swift", (seed) => {
    const view = alwaysHitView(haunterTarget(6));
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: seed, calls: 0 } });
    const cvDraws = checkViabilityDraws(result);
    expect(cvDraws).toHaveLength(0);
    expect(result.submission.decision).toMatchObject({ kind: "use-move" });
    if (result.submission.decision.kind === "use-move") {
      expect(view.moves[result.submission.decision.moveSlot]).toBe(MOVE_SWIFT);
    }
  });
});

const MOVE_VITAL_THROW = 233; // EFFECT_VITAL_THROW

// docs/factory-ai-checkviability-ground-truth.md §13's two banked fixtures
// (tools/battle-lab/mechanic-factory-ai-cv-vitalthrow-{lowhp-reach,
// fullhp-control}-off.json). Same all-4-slots-identical design as the
// Pursuit/HighCrit/AlwaysHit blocks above -- EFFECT_VITAL_THROW has no
// CheckBadMove table entry either (doc §5/§13.4), so MOVE_VITAL_THROW
// reproduces directly. Unlike AlwaysHit's accumulated stat-stage
// precondition, VitalThrow's own precondition is AI_USER's (Anorith's) own
// current HP -- this constructs the DECISIVE HP states directly (full HP
// for turn 1's own real decision and the control fixture; the doc's own
// live-verified post-turn-1 HP for the phantom next decision, seed-specific
// per §13.3's own table: 32/120=26% at seed 1, 29/120=24% at seed 99)
// rather than replaying a real damage roll through the hit chain, matching
// this file's own "construct the decision directly" precedent above.
describe("AI_CV_VitalThrow mask-7 fixture reproduction (docs/factory-ai-checkviability-ground-truth.md §13)", () => {
  const MOVE_VITAL_THROW_MOVESET = [MOVE_VITAL_THROW, MOVE_VITAL_THROW, MOVE_VITAL_THROW, MOVE_VITAL_THROW] as const;

  // Anorith (species 390), level 50, base HP45/Atk95/Def50/SpA40/SpD50/Spe75
  // -> level-50 stats HP120/Atk115/Def70/SpA60/SpD70/Speed95 (doc §13.2).
  function anorithAttacker(hp: number): FactoryAiScoredBattlerView {
    return Object.freeze({
      types: ["TYPE_ROCK", "TYPE_BUG"] as const,
      attack: 115, defense: 70, spAttack: 60, spDefense: 70, speed: 95, level: 50,
      statStages: NEUTRAL_STAGES,
      isFirstTurn: 0,
      hp, maxHp: 120,
    });
  }
  // Machamp (species 68), level 50, base HP90/Atk130/Def80/SpA65/SpD85/Spe55
  // -> level-50 stats HP165/Atk150/Def100/SpA85/SpD105/Speed75 (doc §13.2) --
  // Speed 75 < Anorith's 95 satisfies §13.1's corrected precondition
  // (opponent faster) with zero Random() cost from the speed check itself.
  function machampTarget(): FactoryAiScoredTargetView {
    return Object.freeze({
      species: 68,
      types: ["TYPE_FIGHTING", "TYPE_FIGHTING"] as const,
      attack: 150, defense: 100, spAttack: 85, spDefense: 105, speed: 75, level: 50,
      statStages: NEUTRAL_STAGES,
      isFirstTurn: 0,
      hp: 165, maxHp: 165, ability: "ABILITY_GUTS", knownAbility: null,
    });
  }
  function vitalThrowView(attacker: FactoryAiScoredBattlerView): FactoryAiScoredView {
    return Object.freeze({
      schema: "factory-ai-scored-view/v1",
      mode: "factory-level-50-singles",
      active: Object.freeze({ aiBattler: 1 as const, targetBattler: 0 as const }),
      factory: Object.freeze({ levelMode: 0 as const, battleMode: 0 as const, factoryWinStreak: 28, trainerOpponentId: 222 }),
      moves: MOVE_VITAL_THROW_MOVESET,
      attacker,
      target: machampTarget(),
    });
  }
  function checkViabilityDraws(result: ReturnType<typeof chooseFactoryAiScoredDecision>) {
    return result.trace.draws.filter((d) => "phase" in d && d.phase === "check-viability");
  }
  function assertPicksVitalThrow(view: FactoryAiScoredView, result: ReturnType<typeof chooseFactoryAiScoredDecision>) {
    expect(result.submission.decision).toMatchObject({ kind: "use-move" });
    if (result.submission.decision.kind === "use-move") {
      expect(view.moves[result.submission.decision.moveSlot]).toBe(MOVE_VITAL_THROW);
    }
  }

  it.each([1, 99])("reach fixture, turn 1's own real decision (Anorith at full 120/120 HP, before any damage), seed %i: deterministic zero check-viability draws across all 4 identical Vital Throw slots, picks Vital Throw", (seed) => {
    const view = vitalThrowView(anorithAttacker(120));
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: seed, calls: 0 } });
    expect(checkViabilityDraws(result)).toHaveLength(0);
    assertPicksVitalThrow(view, result);
  });

  it("reach fixture, phantom next decision (Anorith at 32/120 HP = 26%, seed 1, doc §13.3's own live-verified endpoint): all 4 identical Vital Throw slots independently reach AI_CV_VitalThrow2, exactly 4 check-viability draws, picks Vital Throw", () => {
    const view = vitalThrowView(anorithAttacker(32));
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: 1, calls: 0 } });
    const cvDraws = checkViabilityDraws(result);
    expect(cvDraws).toHaveLength(4);
    expect(cvDraws.every((d) => "kind" in d && d.kind === "vital-throw-roll")).toBe(true);
    assertPicksVitalThrow(view, result);
  });

  it("reach fixture, phantom next decision (Anorith at 29/120 HP = 24%, seed 99, doc §13.3's own live-verified endpoint): exactly 4 check-viability draws, all direct AI_CV_VitalThrow2 rolls, picks Vital Throw", () => {
    const view = vitalThrowView(anorithAttacker(29));
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: 99, calls: 0 } });
    const cvDraws = checkViabilityDraws(result);
    expect(cvDraws).toHaveLength(4);
    expect(cvDraws.every((d) => "kind" in d && d.kind === "vital-throw-roll")).toBe(true);
    assertPicksVitalThrow(view, result);
  });

  it.each([1, 99])("control fixture (Anorith stays at full 120/120 HP throughout -- if_hp_more_than 60 stays true), seed %i: deterministic zero check-viability draws, picks Vital Throw", (seed) => {
    const view = vitalThrowView(anorithAttacker(120));
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: seed, calls: 0 } });
    expect(checkViabilityDraws(result)).toHaveLength(0);
    assertPicksVitalThrow(view, result);
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
