import { describe, expect, it } from "vitest";
import {
  chooseFactoryAiScoredDecision,
  submitFactoryAiDecision,
  unportedCheckViabilityTableEffects,
  type FactoryAiScoredBattlerView,
  type FactoryAiScoredTargetView,
  type FactoryAiScoredView,
} from "../src/engine/factoryAiDecisionPolicy.ts";
import {
  AI_CHECK_BAD_MOVE_TABLE_EFFECTS,
  MOVES_BY_ID,
  firstMoveIdWithEffect,
  unportedCheckBadMoveTableEffects,
} from "../src/engine/factoryAiCheckBadMove.ts";
import {
  createBattleCommandRequest,
  createBattleState,
  type BattleDecisionReducer,
  type BattleJsonObject,
  type BattleState,
} from "../src/engine/battleDecisionBoundary.ts";
import { advanceRngValue } from "../src/engine/rng.ts";
import { DEFAULT_STAT_STAGE, MAX_STAT_STAGE } from "../src/engine/damageCalc.ts";

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

describe("Roar zero-usable-bench live receipt (doc §30)", () => {
  it.each([
    [1, 609_957_550, 1, 1_920_291_958],
    [2, 2_385_371_400, 2, 1_857_269_776],
  ])("seed %i matches the OFF PP-selected Light Screen slot and exact RNG endpoint", (
    _seed,
    rngStart,
    expectedSlot,
    expectedRng,
  ) => {
    const stages = NEUTRAL_STAGES;
    const view: FactoryAiScoredView = Object.freeze({
      schema: "factory-ai-scored-view/v1",
      mode: "factory-level-50-singles",
      active: Object.freeze({ aiBattler: 1, targetBattler: 0 }),
      factory: Object.freeze({
        levelMode: 0,
        battleMode: 0,
        factoryWinStreak: 28,
        trainerOpponentId: 222,
      }),
      moves: [46, 113, 113, 113] as const,
      attacker: Object.freeze({
        types: ["TYPE_GHOST", "TYPE_GHOST"] as const,
        attack: 90, defense: 150, spAttack: 80, spDefense: 150, speed: 45, level: 50,
        statStages: stages, isFirstTurn: 2, hp: 115, maxHp: 115,
        lightScreenUp: false, ability: "ABILITY_PRESSURE",
      }),
      target: Object.freeze({
        species: 200,
        types: ["TYPE_GHOST", "TYPE_GHOST"] as const,
        attack: 80, defense: 80, spAttack: 105, spDefense: 105, speed: 105, level: 50,
        statStages: stages, isFirstTurn: 0, hp: 135, maxHp: 135,
        ability: "ABILITY_LEVITATE", knownAbility: null, usablePartyMons: 0,
      }),
    });
    const result = chooseFactoryAiScoredDecision({
      view,
      request: fourSlotRequest,
      rng: { value: rngStart, calls: 0 },
    });
    expect(result.trace.slotScores.map((slot) => [
      slot.checkBadMoveDelta,
      slot.checkViabilityDelta,
      slot.finalScore,
    ])).toEqual([
      [-10, -3, 87],
      [0, -2, 98],
      [0, -2, 98],
      [0, -2, 98],
    ]);
    expect(result.trace.draws).toHaveLength(8);
    expect(result.trace.draws.map((draw) => draw.kind)).toEqual([
      "setup-simulated-rng",
      "setup-simulated-rng",
      "setup-simulated-rng",
      "setup-simulated-rng",
      "light-screen-roll",
      "light-screen-roll",
      "light-screen-roll",
      "best-move-tie",
    ]);
    expect(result.trace.tie.chosenDecision).toMatchObject({ kind: "use-move", moveSlot: expectedSlot });
    expect(result.rng.value).toBe(expectedRng);
  });
});

describe("Confuse Own Tempo live receipt (doc §32)", () => {
  it.each([
    [1, 3_726_110_690, 1, 3_070_328_874, [-2, -2, -2]],
    [99, 1_329_715_331, 2, 3_507_076_075, [-2, 0, -2]],
  ])("seed %i matches the OFF PP-selected Light Screen slot and exact RNG endpoint", (
    _seed,
    rngStart,
    expectedSlot,
    expectedRng,
    screenCvDeltas,
  ) => {
    const stages = NEUTRAL_STAGES;
    const view: FactoryAiScoredView = Object.freeze({
      schema: "factory-ai-scored-view/v1",
      mode: "factory-level-50-singles",
      active: Object.freeze({ aiBattler: 1, targetBattler: 0 }),
      factory: Object.freeze({
        levelMode: 0,
        battleMode: 0,
        factoryWinStreak: 28,
        trainerOpponentId: 222,
      }),
      moves: [109, 113, 113, 113] as const,
      attacker: Object.freeze({
        types: ["TYPE_GHOST", "TYPE_POISON"] as const,
        attack: 85, defense: 80, spAttack: 150, spDefense: 95, speed: 130, level: 50,
        statStages: stages, isFirstTurn: 2, hp: 135, maxHp: 135,
        lightScreenUp: true, ability: "ABILITY_LEVITATE",
      }),
      target: Object.freeze({
        species: 308,
        types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
        attack: 80, defense: 80, spAttack: 80, spDefense: 80, speed: 80, level: 50,
        statStages: stages, isFirstTurn: 0, hp: 135, maxHp: 135,
        ability: "ABILITY_OWN_TEMPO", knownAbility: null,
        lastUsedMoveId: 233, knownMoveIds: [233],
      }),
    });
    const result = chooseFactoryAiScoredDecision({
      view,
      request: fourSlotRequest,
      rng: { value: rngStart, calls: 0 },
    });
    expect(result.trace.slotScores.map((slot) => [
      slot.checkBadMoveDelta,
      slot.checkViabilityDelta,
      slot.finalScore,
    ])).toEqual([
      [-10, 0, 90],
      [-8, screenCvDeltas[0], 92 + screenCvDeltas[0]],
      [-8, screenCvDeltas[1], 92 + screenCvDeltas[1]],
      [-8, screenCvDeltas[2], 92 + screenCvDeltas[2]],
    ]);
    expect(result.trace.draws).toHaveLength(8);
    expect(result.trace.draws.map((draw) => draw.kind)).toEqual([
      "setup-simulated-rng",
      "setup-simulated-rng",
      "setup-simulated-rng",
      "setup-simulated-rng",
      "light-screen-roll",
      "light-screen-roll",
      "light-screen-roll",
      "best-move-tie",
    ]);
    expect(result.trace.tie.chosenDecision).toMatchObject({ kind: "use-move", moveSlot: expectedSlot });
    expect(result.rng.value).toBe(expectedRng);
  });
});

describe("Swagger live OFF receipts (doc §33)", () => {
  it.each([
    [1, "control", "ABILITY_THICK_FAT", 3_726_110_690, 0, 724_352_597, [101, 90, 90, 92]],
    [1, "reach", "ABILITY_OWN_TEMPO", 3_726_110_690, 3, 724_352_597, [91, 90, 90, 92]],
    [99, "control", "ABILITY_THICK_FAT", 1_329_715_331, 0, 4_213_767_554, [100, 92, 90, 92]],
    [99, "reach", "ABILITY_OWN_TEMPO", 1_329_715_331, 1, 4_213_767_554, [90, 92, 90, 92]],
  ])("seed %i %s matches the PP-selected slot and exact RNG endpoint", (
    _seed,
    _role,
    targetAbility,
    rngStart,
    expectedSlot,
    expectedRng,
    expectedScores,
  ) => {
    const stages = NEUTRAL_STAGES;
    const view: FactoryAiScoredView = Object.freeze({
      schema: "factory-ai-scored-view/v1",
      mode: "factory-level-50-singles",
      active: Object.freeze({ aiBattler: 1, targetBattler: 0 }),
      factory: Object.freeze({
        levelMode: 0,
        battleMode: 0,
        factoryWinStreak: 28,
        trainerOpponentId: 222,
      }),
      moves: [207, 113, 113, 113] as const,
      attacker: Object.freeze({
        types: ["TYPE_GHOST", "TYPE_POISON"] as const,
        attack: 85, defense: 80, spAttack: 150, spDefense: 95, speed: 130, level: 50,
        statStages: stages, isFirstTurn: 2, hp: 135, maxHp: 135,
        lightScreenUp: true, ability: "ABILITY_LEVITATE",
      }),
      target: Object.freeze({
        species: targetAbility === "ABILITY_OWN_TEMPO" ? 308 : 241,
        types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
        attack: 80, defense: 80, spAttack: 80, spDefense: 80, speed: 80, level: 50,
        statStages: stages, isFirstTurn: 0,
        hp: targetAbility === "ABILITY_OWN_TEMPO" ? 135 : 170,
        maxHp: targetAbility === "ABILITY_OWN_TEMPO" ? 135 : 170,
        ability: targetAbility,
        knownAbility: null,
        lastUsedMoveId: 233,
        knownMoveIds: [233],
      }),
    });
    const result = chooseFactoryAiScoredDecision({
      view,
      request: fourSlotRequest,
      rng: { value: rngStart, calls: 0 },
    });
    expect(result.trace.slotScores.map((slot) => slot.finalScore)).toEqual(expectedScores);
    expect(result.trace.draws.map((draw) => draw.kind)).toEqual([
      "setup-simulated-rng",
      "setup-simulated-rng",
      "setup-simulated-rng",
      "setup-simulated-rng",
      "swagger-roll",
      "light-screen-roll",
      "light-screen-roll",
      "light-screen-roll",
      "best-move-tie",
    ]);
    expect(result.trace.tie.chosenDecision).toMatchObject({
      kind: "use-move",
      moveSlot: expectedSlot,
    });
    expect(result.rng.value).toBe(expectedRng);
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
    // The example is derived dynamically -- unportedCheckBadMoveTableEffects
    // is AI_CHECK_BAD_MOVE_TABLE_EFFECTS minus the dispatcher's handled set,
    // so the pin can never assert an effect the engine has outgrown (it was
    // MOVE_HAZE until EFFECT_HAZE ported, then MOVE_STOCKPILE; 2026-08-08).
    const unported = unportedCheckBadMoveTableEffects();
    if (unported.length === 0) {
      // 109/109: no CheckBadMove table effect halts the machine any more.
      // The exhaustive "every table effect scores" proof lives in the CBM
      // unit suite (factoryAiCheckBadMove.test.ts); here we only pin that
      // the full decision no longer throws the check-bad-move barrier for a
      // representative table-listed move. (A check-viability barrier for the
      // same move is fine -- it is a different, still-live barrier.)
      const representative = firstMoveIdWithEffect([...AI_CHECK_BAD_MOVE_TABLE_EFFECTS][0]!) ?? MOVE_SURF;
      const view = scoredView([representative, MOVE_SURF, MOVE_SURF, MOVE_SURF], 28);
      expect(() =>
        chooseFactoryAiScoredDecision({
          view,
          request: fourSlotRequest,
          rng: { value: 0x1234_5678, calls: 0 },
        })).not.toThrow(/check-bad-move barrier/);
      return;
    }
    const moveId = firstMoveIdWithEffect(unported[0]!);
    if (moveId === undefined) throw new Error(`no Gen-3 move carries ${unported[0]}`);
    const view = scoredView([moveId, MOVE_SURF, MOVE_SURF, MOVE_SURF], 28);
    expect(() =>
      chooseFactoryAiScoredDecision({
        view,
        request: fourSlotRequest,
        rng: { value: 0x1234_5678, calls: 0 },
      })).toThrow(/check-bad-move barrier/);
  });

  it("halts loudly on a CheckViability unsupported-branch barrier rather than silently mis-scoring", () => {
    // The example is derived dynamically by probing the real dispatcher:
    // every unported CheckViability effect (computed by probing
    // runCheckViability itself) is tried as slot 0 until one actually throws
    // the check-viability barrier -- not the check-bad-move one (the example
    // must be ported in CheckBadMove) and not a quiet success. A side-lane
    // worker is porting CheckViability right now; this pin never hardcodes a
    // specific CV effect.
    const unported = unportedCheckViabilityTableEffects();
    if (unported.length === 0) {
      const view = scoredView([MOVE_SURF, MOVE_SURF, MOVE_SURF, MOVE_SURF], 28);
      expect(() =>
        chooseFactoryAiScoredDecision({
          view,
          request: fourSlotRequest,
          rng: { value: 0x1234_5678, calls: 0 },
        })).not.toThrow(/check-viability barrier/);
      return;
    }
    let exampleMoveId: number | null = null;
    for (const effect of unported) {
      for (const row of MOVES_BY_ID.values()) {
        if (row.effect !== effect) continue;
        const view = scoredView([row.id, MOVE_SURF, MOVE_SURF, MOVE_SURF], 28);
        try {
          chooseFactoryAiScoredDecision({
            view,
            request: fourSlotRequest,
            rng: { value: 0x1234_5678, calls: 0 },
          });
        } catch (error) {
          if (error instanceof Error && /check-viability barrier/.test(error.message)) {
            exampleMoveId = row.id;
            break;
          }
        }
      }
      if (exampleMoveId !== null) break;
    }
    if (exampleMoveId === null) {
      // Every unported CV effect's first move hits the check-bad-move barrier
      // first (unported in CBM too), so no CV-isolated example exists.
      expect(exampleMoveId).not.toBeNull();
      return;
    }
    const view = scoredView([exampleMoveId, MOVE_SURF, MOVE_SURF, MOVE_SURF], 28);
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

// AI_CV_SpeedDownFromChance (data/battle_ai_scripts.s:1136-1141,
// docs/factory-ai-checkviability-ground-truth.md §5's table row, §4's
// footnote, §10's porter note) -- the 22nd and last reachable CV handler.
//
// NOTE on this describe block's relationship to the doc's own §6 fixtures
// (tools/battle-lab/mechanic-factory-ai-cv-speeddown-{opponent-faster,
// opponent-slower}-off.json, reproduced by the describe block directly
// above): those two fixtures dispatch MOVE_STRING_SHOT, whose effect is
// EFFECT_SPEED_DOWN -- a DIRECT dispatch to AI_CV_SpeedDown, not
// EFFECT_SPEED_DOWN_HIT/AI_CV_SpeedDownFromChance. They do NOT exercise
// this handler's own code path (confirmed by inspecting the fixture JSON's
// `moves` field: move ID 81 = MOVE_STRING_SHOT). No live-oracle fixture
// exists yet for any of SpeedDownFromChance's 6 covered moves (checked
// tools/battle-lab/ -- fixture authoring is out of scope for this step), so
// this block instead drives the REAL mask-7 dispatcher
// (chooseFactoryAiScoredDecision, the same CBM->TryToFaint->CV pipeline the
// §6 block above exercises) with a hand-built view using the actual
// dispatching/non-dispatching moves, same Dugtrio/Shuckle speed-differential
// species pair as §6's own fixtures. This is genuine mask-7 pipeline
// coverage of the new dispatch wiring, just not tied to a banked live-oracle
// ledger the way §6's own two fixtures are -- assertions below are scoped to
// the check-viability phase specifically (not total draw counts), since Icy
// Wind is a real 55-power move and its own type matchup against Dugtrio
// (Ice vs Ground/Ground, 4x) can additionally engage AI_TryToFaint's own
// x4-effective if_random_less_than gate -- an orthogonal, already-ported
// mechanism, not something this step re-verifies.
describe("AI_CV_SpeedDownFromChance mask-7 pipeline coverage (real dispatcher, no banked oracle fixture yet)", () => {
  const MOVE_ICY_WIND_MASK7 = 196; // EFFECT_SPEED_DOWN_HIT -- redirects into AI_CV_SpeedDown
  const MOVE_BUBBLE_BEAM_MASK7 = 61; // EFFECT_SPEED_DOWN_HIT -- falls through to a genuine zero

  const SPEED_EXTRAS = Object.freeze({
    statStages: NEUTRAL_STAGES,
    isFirstTurn: 2,
    hp: 100, maxHp: 100,
  });
  const DUGTRIO = Object.freeze({ types: ["TYPE_GROUND", "TYPE_GROUND"] as const, attack: 80, defense: 50, spAttack: 50, spDefense: 70, speed: 120, level: 50, ...SPEED_EXTRAS });
  const SHUCKLE = Object.freeze({ types: ["TYPE_BUG", "TYPE_ROCK"] as const, attack: 10, defense: 230, spAttack: 10, spDefense: 230, speed: 5, level: 50, ...SPEED_EXTRAS });
  function shuckleTarget(): FactoryAiScoredTargetView {
    return Object.freeze({ species: 213, ...SHUCKLE, ability: "ABILITY_STURDY", knownAbility: null });
  }
  function dugtrioTarget(): FactoryAiScoredTargetView {
    return Object.freeze({ species: 51, ...DUGTRIO, ability: "ABILITY_ARENA_TRAP", knownAbility: null });
  }
  function speedDownFromChanceView(moveId: number, attacker: FactoryAiScoredBattlerView, target: FactoryAiScoredTargetView): FactoryAiScoredView {
    return Object.freeze({
      schema: "factory-ai-scored-view/v1",
      mode: "factory-level-50-singles",
      active: Object.freeze({ aiBattler: 1 as const, targetBattler: 0 as const }),
      factory: Object.freeze({ levelMode: 0 as const, battleMode: 0 as const, factoryWinStreak: 28, trainerOpponentId: 222 }),
      moves: [moveId, MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH] as const,
      attacker,
      target,
    });
  }
  function cvPhaseDraws(result: ReturnType<typeof chooseFactoryAiScoredDecision>) {
    return result.trace.draws.filter((d) => "phase" in d && d.phase === "check-viability");
  }

  it("Icy Wind redirects: opponent (AI_USER) faster -> AI_CV_SpeedDown's deterministic -3 branch, zero CV draws", () => {
    const view = speedDownFromChanceView(MOVE_ICY_WIND_MASK7, DUGTRIO, shuckleTarget());
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: 1, calls: 0 } });
    expect(cvPhaseDraws(result)).toHaveLength(0);
    expect(result.trace.slotScores[0]).toMatchObject({ checkViabilityDelta: -3 });
  });

  it("Icy Wind redirects: opponent (AI_USER) slower -> AI_CV_SpeedDown's probabilistic branch, exactly one CV draw", () => {
    const view = speedDownFromChanceView(MOVE_ICY_WIND_MASK7, SHUCKLE, dugtrioTarget());
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: 1, calls: 0 } });
    const cvDraws = cvPhaseDraws(result);
    expect(cvDraws).toHaveLength(1);
    expect(cvDraws[0]).toMatchObject({ kind: "speed-down-roll" });
    expect(result.trace.slotScores[0]!.checkViabilityDelta).toBeGreaterThanOrEqual(0); // 0 or +2, both valid outcomes of the roll
  });

  it("Bubblebeam falls through to AI_CV_SpeedDownFromChance's own `end`: zero CV draws, zero CV delta, regardless of who is faster", () => {
    const fasterUser = chooseFactoryAiScoredDecision({
      view: speedDownFromChanceView(MOVE_BUBBLE_BEAM_MASK7, DUGTRIO, shuckleTarget()),
      request: fourSlotRequest,
      rng: { value: 1, calls: 0 },
    });
    expect(cvPhaseDraws(fasterUser)).toHaveLength(0);
    expect(fasterUser.trace.slotScores[0]).toMatchObject({ checkViabilityDelta: 0 });

    const slowerUser = chooseFactoryAiScoredDecision({
      view: speedDownFromChanceView(MOVE_BUBBLE_BEAM_MASK7, SHUCKLE, dugtrioTarget()),
      request: fourSlotRequest,
      rng: { value: 1, calls: 0 },
    });
    expect(cvPhaseDraws(slowerUser)).toHaveLength(0);
    expect(slowerUser.trace.slotScores[0]).toMatchObject({ checkViabilityDelta: 0 });
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

const MOVE_GROWL_ATTACK_DOWN = 45; // EFFECT_ATTACK_DOWN

// docs/factory-ai-checkviability-ground-truth.md §14.3/§14.4's twin fixtures
// (tools/battle-lab/mechanic-factory-ai-cv-attackdown-{nonphysical-reach,
// physical-control}-off.json) -- the first CBM-blocked pair, reproduced
// through the REAL mask-7 dispatcher end to end now that both
// AI_CBM_AttackDown and AI_CV_AttackDown are ported. Same all-4-slots-
// identical design as the Pursuit/HighCrit/AlwaysHit/VitalThrow blocks
// above: opponent (AI_USER) = Marowak, all 4 slots MOVE_GROWL. Unlike those
// four, EFFECT_ATTACK_DOWN DOES have a CheckBadMove table entry -- but both
// fixtures' target is single-ability (Levitate/Sturdy), so per doc §14.2's
// own live finding, CBM's get_ability guesses are free (zero draws) and its
// two Score_Minus10 branches stay unreached (target ability is neither Hyper
// Cutter, Clear Body, nor White Smoke) -- CBM's own contribution is a flat,
// identical 0 in both fixtures, asserted directly below rather than assumed.
// Target ATK stage stays at NEUTRAL_STAGES (DEFAULT_STAT_STAGE) in both --
// AI_CV_AttackDown's own Gate A skips straight to AttackDown3, so DRAW SITE 1
// is unreached in both fixtures by construction (doc §14.3), matching entry
// 463's SpeedDown reproduction precedent above of constructing the decisive
// state directly rather than replaying a real stat-change turn.
describe("AI_CV_AttackDown mask-7 fixture reproduction (docs/factory-ai-checkviability-ground-truth.md §14.3/§14.4)", () => {
  const MOVE_ATTACK_DOWN_MOVESET = [
    MOVE_GROWL_ATTACK_DOWN, MOVE_GROWL_ATTACK_DOWN, MOVE_GROWL_ATTACK_DOWN, MOVE_GROWL_ATTACK_DOWN,
  ] as const;

  const MAROWAK_ATTACKER: FactoryAiScoredBattlerView = Object.freeze({
    types: ["TYPE_GROUND", "TYPE_GROUND"] as const,
    attack: 130, defense: 130, spAttack: 55, spDefense: 70, speed: 65, level: 50,
    statStages: NEUTRAL_STAGES,
    isFirstTurn: 2,
    hp: 135, maxHp: 135,
  });
  // Haunter (species 93), Ghost/Poison -- neither type is in
  // AI_CV_AttackDown_PhysicalTypeList, falls through Gates E/F into DRAW
  // SITE 2. Levitate is its only ability (doc §14.2's own single-ability
  // porter guidance, confirmed live after the Dugtrio-target confound).
  function haunterTarget(): FactoryAiScoredTargetView {
    return Object.freeze({
      species: 93,
      types: ["TYPE_GHOST", "TYPE_POISON"] as const,
      attack: 50, defense: 45, spAttack: 115, spDefense: 55, speed: 95, level: 50,
      statStages: NEUTRAL_STAGES,
      isFirstTurn: 2,
      hp: 100, maxHp: 100, ability: "ABILITY_LEVITATE", knownAbility: null,
    });
  }
  // Shuckle (species 213), Bug/Rock -- both types are in the physical list;
  // Gate E matches immediately on type1, deterministic zero-draw End. Same
  // species/stats as the SpeedDown block's own `shuckleTarget` above.
  function shuckleAttackDownTarget(): FactoryAiScoredTargetView {
    return Object.freeze({
      species: 213,
      types: ["TYPE_BUG", "TYPE_ROCK"] as const,
      attack: 10, defense: 230, spAttack: 10, spDefense: 230, speed: 5, level: 50,
      statStages: NEUTRAL_STAGES,
      isFirstTurn: 2,
      hp: 100, maxHp: 100, ability: "ABILITY_STURDY", knownAbility: null,
    });
  }
  function attackDownView(target: FactoryAiScoredTargetView): FactoryAiScoredView {
    return Object.freeze({
      schema: "factory-ai-scored-view/v1",
      mode: "factory-level-50-singles",
      active: Object.freeze({ aiBattler: 1 as const, targetBattler: 0 as const }),
      factory: Object.freeze({ levelMode: 0 as const, battleMode: 0 as const, factoryWinStreak: 28, trainerOpponentId: 222 }),
      moves: MOVE_ATTACK_DOWN_MOVESET,
      attacker: MAROWAK_ATTACKER,
      target,
    });
  }
  function phaseDraws(result: ReturnType<typeof chooseFactoryAiScoredDecision>, phase: "check-bad-move" | "try-to-faint" | "check-viability") {
    return result.trace.draws.filter((d) => "phase" in d && d.phase === phase);
  }

  it.each([1, 99])("reach fixture (Marowak AI vs Haunter target, non-physical), seed %i: all 4 identical Growl slots independently reach DRAW SITE 2 -- exactly 4 check-viability draws, zero CBM/TryToFaint draws (single-ability Levitate target)", (seed) => {
    const view = attackDownView(haunterTarget());
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: seed, calls: 0 } });
    expect(phaseDraws(result, "check-bad-move")).toHaveLength(0);
    expect(phaseDraws(result, "try-to-faint")).toHaveLength(0);
    const cvDraws = phaseDraws(result, "check-viability");
    expect(cvDraws).toHaveLength(4);
    expect(cvDraws.every((d) => "kind" in d && d.kind === "attack-down-roll-2")).toBe(true);
    expect(result.trace.draws).toHaveLength(4 /* setup */ + 4 /* CV roll x4 slots */ + 1 /* tie */);
  });

  it.each([1, 99])("control fixture (Marowak AI vs Shuckle target, physical), seed %i: Gate E matches immediately for all 4 slots -- zero check-viability draws, zero CBM/TryToFaint draws (single-ability Sturdy target)", (seed) => {
    const view = attackDownView(shuckleAttackDownTarget());
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: seed, calls: 0 } });
    expect(phaseDraws(result, "check-bad-move")).toHaveLength(0);
    expect(phaseDraws(result, "try-to-faint")).toHaveLength(0);
    expect(phaseDraws(result, "check-viability")).toHaveLength(0);
    expect(result.trace.draws).toHaveLength(4 /* setup */ + 1 /* tie */);
  });
});

const MOVE_LEER = 43; // EFFECT_DEFENSE_DOWN
const MOVE_FAKE_TEARS = 313; // EFFECT_SPECIAL_DEFENSE_DOWN_2

// docs/factory-ai-checkviability-ground-truth.md §15's twin fixtures
// (tools/battle-lab/mechanic-factory-ai-cv-defensedown-{lowhp-reach,
// fullhp-control}-off.json) -- the second CBM-blocked pair, reproduced
// through the REAL mask-7 dispatcher end to end now that both
// AI_CBM_DefenseDown and AI_CV_DefenseDown are ported. Opponent (AI_USER) =
// Anorith, all 4 slots MOVE_LEER; target (player) = Machamp, same species
// pairing as the VitalThrow block above (doc §15.2 reuses it verbatim) --
// Battle Armor blocks Anorith's own crit roll, Machamp's single assignable
// ability (Guts) keeps CBM's shared-tail get_ability guess free. Unlike
// AttackDown's target-stat-stage gate, this pair's Gate A reads AI_USER's
// OWN hp -- the reach/control split is the SAME hp values §15.3 live-verified
// for VitalThrow's own attacker (22/120=18% seed 1, 30/120=25% seed 99 for
// reach; 120/120=100% for control), constructed directly per this file's own
// "construct the decisive state" precedent rather than replayed through the
// hit chain.
describe("AI_CV_DefenseDown mask-7 fixture reproduction (docs/factory-ai-checkviability-ground-truth.md §15.2/§15.3)", () => {
  const MOVE_DEFENSE_DOWN_MOVESET = [MOVE_LEER, MOVE_LEER, MOVE_LEER, MOVE_LEER] as const;

  // Anorith (species 390), level 50, base HP45/Atk95/Def50/SpA40/SpD50/Spe75
  // -> level-50 stats HP120/Atk115/Def70/SpA60/SpD70/Speed95 (doc §15.2, same
  // as §13.2's own VitalThrow attacker).
  function anorithAttacker(hp: number): FactoryAiScoredBattlerView {
    return Object.freeze({
      types: ["TYPE_ROCK", "TYPE_BUG"] as const,
      attack: 115, defense: 70, spAttack: 60, spDefense: 70, speed: 95, level: 50,
      statStages: NEUTRAL_STAGES,
      isFirstTurn: 0,
      hp, maxHp: 120,
    });
  }
  // Machamp (species 68), single assignable ability (Guts) -- doc §15.2, same
  // species/stats as the VitalThrow block's own target.
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
  function defenseDownView(attacker: FactoryAiScoredBattlerView): FactoryAiScoredView {
    return Object.freeze({
      schema: "factory-ai-scored-view/v1",
      mode: "factory-level-50-singles",
      active: Object.freeze({ aiBattler: 1 as const, targetBattler: 0 as const }),
      factory: Object.freeze({ levelMode: 0 as const, battleMode: 0 as const, factoryWinStreak: 28, trainerOpponentId: 222 }),
      moves: MOVE_DEFENSE_DOWN_MOVESET,
      attacker,
      target: machampTarget(),
    });
  }
  function phaseDraws(result: ReturnType<typeof chooseFactoryAiScoredDecision>, phase: "check-bad-move" | "try-to-faint" | "check-viability") {
    return result.trace.draws.filter((d) => "phase" in d && d.phase === phase);
  }
  function assertPicksLeer(view: FactoryAiScoredView, result: ReturnType<typeof chooseFactoryAiScoredDecision>) {
    expect(result.submission.decision).toMatchObject({ kind: "use-move" });
    if (result.submission.decision.kind === "use-move") {
      expect(view.moves[result.submission.decision.moveSlot]).toBe(MOVE_LEER);
    }
  }

  it("reach fixture, seed 1 (Anorith at 22/120 HP = 18%, doc §15.3's own live-verified endpoint): Gate A true for all 4 identical Leer slots, exactly 4 check-viability draws, zero CBM/TryToFaint draws, picks Leer", () => {
    const view = defenseDownView(anorithAttacker(22));
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: 1, calls: 0 } });
    expect(phaseDraws(result, "check-bad-move")).toHaveLength(0);
    expect(phaseDraws(result, "try-to-faint")).toHaveLength(0);
    const cvDraws = phaseDraws(result, "check-viability");
    expect(cvDraws).toHaveLength(4);
    expect(cvDraws.every((d) => "kind" in d && d.kind === "defense-down-roll")).toBe(true);
    assertPicksLeer(view, result);
  });

  it("reach fixture, seed 99 (Anorith at 30/120 HP = 25%, doc §15.3's own live-verified endpoint): exactly 4 check-viability draws, picks Leer", () => {
    const view = defenseDownView(anorithAttacker(30));
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: 99, calls: 0 } });
    const cvDraws = phaseDraws(result, "check-viability");
    expect(cvDraws).toHaveLength(4);
    expect(cvDraws.every((d) => "kind" in d && d.kind === "defense-down-roll")).toBe(true);
    assertPicksLeer(view, result);
  });

  it.each([1, 99])("control fixture (Anorith stays at full 120/120 HP -- Gate A false, Gate B true at neutral DEF stage), seed %i: deterministic zero check-viability draws, picks Leer", (seed) => {
    const view = defenseDownView(anorithAttacker(120));
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: seed, calls: 0 } });
    expect(phaseDraws(result, "check-bad-move")).toHaveLength(0);
    expect(phaseDraws(result, "try-to-faint")).toHaveLength(0);
    expect(phaseDraws(result, "check-viability")).toHaveLength(0);
    assertPicksLeer(view, result);
  });
});

// docs/factory-ai-checkviability-ground-truth.md §16's twin fixtures
// (tools/battle-lab/mechanic-factory-ai-cv-spdefdown-{lowhp-reach,
// fullhp-control}-off.json) -- the third CBM-blocked pair, same recipe as
// AI_CV_DefenseDown above with the dispatch move swapped to MOVE_FAKE_TEARS
// (EFFECT_SPECIAL_DEFENSE_DOWN_2 -- EFFECT_SPECIAL_DEFENSE_DOWN itself is
// unused by any real move, doc §16.2) and the draw kind swapped to
// "sp-def-down-roll".
describe("AI_CV_SpDefDown mask-7 fixture reproduction (docs/factory-ai-checkviability-ground-truth.md §16.2/§16.3)", () => {
  const MOVE_SPDEF_DOWN_MOVESET = [MOVE_FAKE_TEARS, MOVE_FAKE_TEARS, MOVE_FAKE_TEARS, MOVE_FAKE_TEARS] as const;

  function anorithAttacker(hp: number): FactoryAiScoredBattlerView {
    return Object.freeze({
      types: ["TYPE_ROCK", "TYPE_BUG"] as const,
      attack: 115, defense: 70, spAttack: 60, spDefense: 70, speed: 95, level: 50,
      statStages: NEUTRAL_STAGES,
      isFirstTurn: 0,
      hp, maxHp: 120,
    });
  }
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
  function spDefDownView(attacker: FactoryAiScoredBattlerView): FactoryAiScoredView {
    return Object.freeze({
      schema: "factory-ai-scored-view/v1",
      mode: "factory-level-50-singles",
      active: Object.freeze({ aiBattler: 1 as const, targetBattler: 0 as const }),
      factory: Object.freeze({ levelMode: 0 as const, battleMode: 0 as const, factoryWinStreak: 28, trainerOpponentId: 222 }),
      moves: MOVE_SPDEF_DOWN_MOVESET,
      attacker,
      target: machampTarget(),
    });
  }
  function phaseDraws(result: ReturnType<typeof chooseFactoryAiScoredDecision>, phase: "check-bad-move" | "try-to-faint" | "check-viability") {
    return result.trace.draws.filter((d) => "phase" in d && d.phase === phase);
  }
  function assertPicksFakeTears(view: FactoryAiScoredView, result: ReturnType<typeof chooseFactoryAiScoredDecision>) {
    expect(result.submission.decision).toMatchObject({ kind: "use-move" });
    if (result.submission.decision.kind === "use-move") {
      expect(view.moves[result.submission.decision.moveSlot]).toBe(MOVE_FAKE_TEARS);
    }
  }

  it("reach fixture, seed 1 (Anorith at 22/120 HP = 18%): Gate A true for all 4 identical Fake Tears slots, exactly 4 check-viability draws, zero CBM/TryToFaint draws, picks Fake Tears", () => {
    const view = spDefDownView(anorithAttacker(22));
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: 1, calls: 0 } });
    expect(phaseDraws(result, "check-bad-move")).toHaveLength(0);
    expect(phaseDraws(result, "try-to-faint")).toHaveLength(0);
    const cvDraws = phaseDraws(result, "check-viability");
    expect(cvDraws).toHaveLength(4);
    expect(cvDraws.every((d) => "kind" in d && d.kind === "sp-def-down-roll")).toBe(true);
    assertPicksFakeTears(view, result);
  });

  it("reach fixture, seed 99 (Anorith at 30/120 HP = 25%): exactly 4 check-viability draws, picks Fake Tears", () => {
    const view = spDefDownView(anorithAttacker(30));
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: 99, calls: 0 } });
    const cvDraws = phaseDraws(result, "check-viability");
    expect(cvDraws).toHaveLength(4);
    expect(cvDraws.every((d) => "kind" in d && d.kind === "sp-def-down-roll")).toBe(true);
    assertPicksFakeTears(view, result);
  });

  it.each([1, 99])("control fixture (Anorith stays at full 120/120 HP -- Gate A false, Gate B true at neutral SPDEF stage), seed %i: deterministic zero check-viability draws, picks Fake Tears", (seed) => {
    const view = spDefDownView(anorithAttacker(120));
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: seed, calls: 0 } });
    expect(phaseDraws(result, "check-bad-move")).toHaveLength(0);
    expect(phaseDraws(result, "try-to-faint")).toHaveLength(0);
    expect(phaseDraws(result, "check-viability")).toHaveLength(0);
    assertPicksFakeTears(view, result);
  });
});

const MOVE_SWORDS_DANCE_ATTACK_UP = 14; // EFFECT_ATTACK_UP_2

// docs/factory-ai-checkviability-ground-truth.md §17's twin fixtures
// (tools/battle-lab/mechanic-factory-ai-cv-attackup-{fullhp-reach,
// lowhp-control}-off.json) -- the fourth CBM-blocked pair, reproduced
// through the REAL mask-7 dispatcher end to end now that both
// AI_CBM_AttackUp and AI_CV_AttackUp are ported. Opponent (AI_USER) =
// Anorith, all 4 slots MOVE_SWORDS_DANCE (EFFECT_ATTACK_UP_2); target
// (player) = Machamp, same species pairing as the VitalThrow/DefenseDown/
// SpDefDown blocks above. Unlike every stat-DOWN pair, every gate/draw site
// here reads AI_USER's OWN state -- Machamp's own kit is irrelevant to this
// handler entirely (doc §17.3's own note, a first for this file's
// CBM-blocked pairs). §17.2's own finding applies: only the PHANTOM
// next-turn re-decision is observable in a single executed turn, so by the
// time it fires, turn 1's own REAL Swords Dance has already raised
// Anorith's own ATK stage from DEFAULT_STAT_STAGE (6) to 8 (still < 9, so
// Gate A/DRAW SITE 1 stays unreached in both fixtures, matching the doc's
// own live ledger -- attribution shows zero AI_CBM/AI_CV draws attributable
// to a stage-12 CBM short-circuit or a Gate-A-true DRAW SITE 1 path)
// -- constructed directly here (statStages.atk: 8), same "construct the
// decisive post-turn-1 state" precedent the DefenseDown/SpDefDown blocks
// above already established for HP.
describe("AI_CV_AttackUp mask-7 fixture reproduction (docs/factory-ai-checkviability-ground-truth.md §17.3/§17.4)", () => {
  const MOVE_ATTACK_UP_MOVESET = [
    MOVE_SWORDS_DANCE_ATTACK_UP, MOVE_SWORDS_DANCE_ATTACK_UP, MOVE_SWORDS_DANCE_ATTACK_UP, MOVE_SWORDS_DANCE_ATTACK_UP,
  ] as const;
  const POST_SWORDS_DANCE_STAGES = Object.freeze({ ...NEUTRAL_STAGES, atk: 8 });

  function anorithAttacker(hp: number): FactoryAiScoredBattlerView {
    return Object.freeze({
      types: ["TYPE_ROCK", "TYPE_BUG"] as const,
      attack: 115, defense: 70, spAttack: 60, spDefense: 70, speed: 95, level: 50,
      statStages: POST_SWORDS_DANCE_STAGES,
      isFirstTurn: 0,
      hp, maxHp: 120,
    });
  }
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
  function attackUpView(attacker: FactoryAiScoredBattlerView): FactoryAiScoredView {
    return Object.freeze({
      schema: "factory-ai-scored-view/v1",
      mode: "factory-level-50-singles",
      active: Object.freeze({ aiBattler: 1 as const, targetBattler: 0 as const }),
      factory: Object.freeze({ levelMode: 0 as const, battleMode: 0 as const, factoryWinStreak: 28, trainerOpponentId: 222 }),
      moves: MOVE_ATTACK_UP_MOVESET,
      attacker,
      target: machampTarget(),
    });
  }
  function phaseDraws(result: ReturnType<typeof chooseFactoryAiScoredDecision>, phase: "check-bad-move" | "try-to-faint" | "check-viability") {
    return result.trace.draws.filter((d) => "phase" in d && d.phase === phase);
  }

  it.each([1, 99])("reach fixture (Anorith stays at full 120/120 HP -- Gate B true, reaches DRAW SITE 2), seed %i: exactly 4 check-viability draws, zero CBM/TryToFaint draws", (seed) => {
    const view = attackUpView(anorithAttacker(120));
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: seed, calls: 0 } });
    expect(phaseDraws(result, "check-bad-move")).toHaveLength(0);
    expect(phaseDraws(result, "try-to-faint")).toHaveLength(0);
    const cvDraws = phaseDraws(result, "check-viability");
    expect(cvDraws).toHaveLength(4);
    expect(cvDraws.every((d) => "kind" in d && d.kind === "attack-up-roll-2")).toBe(true);
    expect(result.trace.draws).toHaveLength(4 /* setup */ + 4 /* CV roll x4 slots */ + 1 /* tie */);
  });

  it("control fixture, seed 1 (Anorith at 30/120 HP = 25%, doc §17.4's own live-verified endpoint): Gate B false (skips DRAW SITE 2), Gate D true (HP<40, skips DRAW SITE 3) -- deterministic zero check-viability draws", () => {
    const view = attackUpView(anorithAttacker(30));
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: 1, calls: 0 } });
    expect(phaseDraws(result, "check-bad-move")).toHaveLength(0);
    expect(phaseDraws(result, "try-to-faint")).toHaveLength(0);
    expect(phaseDraws(result, "check-viability")).toHaveLength(0);
    expect(result.trace.draws).toHaveLength(4 /* setup */ + 1 /* tie */);
  });

  it("control fixture, seed 99 (Anorith at 18/120 HP = 15%, doc §17.4's own live-verified endpoint): deterministic zero check-viability draws", () => {
    const view = attackUpView(anorithAttacker(18));
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: 99, calls: 0 } });
    expect(phaseDraws(result, "check-viability")).toHaveLength(0);
    expect(result.trace.draws).toHaveLength(4 /* setup */ + 1 /* tie */);
  });
});

// docs/factory-ai-checkviability-ground-truth.md §14.5 item 2's own
// acceptance bonus: §6's ORIGINAL AI_CV_SpeedDown fixtures used a real
// opponent moveset of [MOVE_STRING_SHOT, MOVE_GROWL, MOVE_GROWL, MOVE_GROWL]
// (not the MOVE_SPLASH substitute the block above had to use before this
// pair was ported) -- three of the four candidate slots are Growl, whose
// effect (EFFECT_ATTACK_DOWN) was CBM-table-blocked until this entry's own
// port. Reusing the SpeedDown block's own DUGTRIO_STATS/SHUCKLE_STATS
// (opponent-faster) and SHUCKLE_STATS/DUGTRIO_STATS (opponent-slower) pairs
// unchanged -- both Dugtrio (Arena Trap, single ability) and Shuckle
// (Sturdy, single ability) keep every CBM get_ability guess zero-draw, and
// both are physical-list types (Ground/Bug+Rock), so AI_CV_AttackDown's own
// Gates E/F short-circuit every Growl slot to a deterministic zero -- these
// fixtures isolate AI_CV_SpeedDown's own contribution exactly like the
// MOVE_SPLASH block did, just with the real move the doc's own live oracle
// fixture used.
describe("AI_CV_SpeedDown mask-7 fixture reproduction with the doc's own real §6 moveset (docs/factory-ai-checkviability-ground-truth.md §14.5 item 2)", () => {
  const MOVE_REAL_SPEED_DOWN_MOVESET = [
    MOVE_STRING_SHOT, MOVE_GROWL_ATTACK_DOWN, MOVE_GROWL_ATTACK_DOWN, MOVE_GROWL_ATTACK_DOWN,
  ] as const;

  function realSpeedDownView(attacker: FactoryAiScoredBattlerView, target: FactoryAiScoredTargetView): FactoryAiScoredView {
    return Object.freeze({
      schema: "factory-ai-scored-view/v1",
      mode: "factory-level-50-singles",
      active: Object.freeze({ aiBattler: 1 as const, targetBattler: 0 as const }),
      factory: Object.freeze({ levelMode: 0 as const, battleMode: 0 as const, factoryWinStreak: 28, trainerOpponentId: 222 }),
      moves: MOVE_REAL_SPEED_DOWN_MOVESET,
      attacker,
      target,
    });
  }
  const DUGTRIO_STATS = Object.freeze({
    types: ["TYPE_GROUND", "TYPE_GROUND"] as const,
    attack: 80, defense: 50, spAttack: 50, spDefense: 70, speed: 120, level: 50,
    statStages: NEUTRAL_STAGES,
    isFirstTurn: 2,
    hp: 100, maxHp: 100,
  });
  const SHUCKLE_ATTACK_DOWN_STATS = Object.freeze({
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
    return Object.freeze({ species: 213, ...SHUCKLE_ATTACK_DOWN_STATS, ability: "ABILITY_STURDY", knownAbility: null });
  }

  it.each([1, 99])("opponent-faster fixture (Dugtrio AI vs Shuckle target), seed %i: never picks String Shot, zero CBM/TryToFaint/CV draws for the -3 branch, all 3 Growl slots deterministic 0 (physical-list target)", (seed) => {
    const view = realSpeedDownView(DUGTRIO_STATS, shuckleTarget());
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: seed, calls: 0 } });
    expect(result.trace.draws).toHaveLength(4 /* setup */ + 1 /* tie */);
    expect(result.trace.slotScores.map((s) => s.finalScore)).toEqual([97, 100, 100, 100]);
    expect(result.trace.bestMoveSlots).toEqual([1, 2, 3]);
    if (result.submission.decision.kind === "use-move") {
      expect(result.submission.decision.moveSlot).not.toBe(0);
    }
  });

  it.each([1, 99])("opponent-slower fixture (Shuckle AI vs Dugtrio target), seed %i: always picks String Shot, 1 CV draw (the SpeedDown if_random_less_than 70 roll), all 3 Growl slots deterministic 0 (physical-list target)", (seed) => {
    const view = realSpeedDownView(SHUCKLE_ATTACK_DOWN_STATS, dugtrioTarget());
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

const MOVE_HARDEN_DEFENSE_UP = 106; // EFFECT_DEFENSE_UP
const MOVE_VITAL_THROW_LAST = 233; // Fighting, IN AI_CV_DefenseUp_PhysicalTypes
const MOVE_SEISMIC_TOSS_LAST = 69; // Fighting, IN the list, fixed-damage (EFFECT_LEVEL_DAMAGE)
const MOVE_DRAGON_RAGE_LAST = 82; // Dragon, NOT in the list

// docs/factory-ai-checkviability-ground-truth.md §18's three fixtures
// (tools/battle-lab/mechanic-factory-ai-cv-defenseup-{lowhp-control,
// physicallastmove,nonphysicallastmove}-off.json) -- the fifth CBM-blocked
// pair, reproduced through the REAL mask-7 dispatcher end to end now that
// both AI_CBM_DefenseUp and AI_CV_DefenseUp are ported. Opponent (AI_USER) =
// Anorith, all 4 slots MOVE_HARDEN (EFFECT_DEFENSE_UP, +1 own DEF stage);
// target (player) = Machamp. Per §17.2/§18.2's own finding, only the
// PHANTOM next-turn re-decision is observable, so by the time it fires:
// (1) Anorith's own real turn-1 Harden has already raised its DEF stage
// 6->7 (still < 9, Gate A/DRAW SITE 1 stays unreached, matching the doc's
// own live attribution -- no Cmd_get_ability, no stage-9+ draw), and (2)
// MOVEEND_UPDATE_LAST_MOVES has already set gLastMoves[player] to whatever
// the player's own turn-1 move was -- Gate E/F read THAT move's power/type,
// not the target's live stats. HP lands directly in the doc's own
// [40,70)-percent band (Gate C true, Gate D false) via the constructed hp
// values below (doc §18.3's own real Vital Throw/Seismic Toss/Dragon Rage
// numbers against this exact matchup), same "construct the decisive
// post-turn-1 state" precedent as every block above.
//
// Draw-count reconciliation (per docs/factory-ai-draw-discrepancy-probe.md,
// which supersedes this comment's own prior "EXACTLY 4" claim): the doc's
// own live ledger (§18.4) showed 5-6 total Cmd_if_random_less_than calls for
// the physical-list fixtures, which an earlier session here could not
// reconcile against a naive "4 identical slots x 1 draw" derivation and left
// as an open, unattributed extra. The probe doc's own live single-step
// instrumentation (its §3.1/§3.2, watching gAIScriptPtr itself, not just the
// shared C-level return address) positively identified the missing site:
// DRAW SITE 4's own failure (roll >= 60) falls straight through into DRAW
// SITE 5's own instruction with no gate between them (probe doc §4, raw ROM
// byte offsets) -- so each of the 4 identical slots draws once (pass, stops)
// or TWICE (fails at site 4, chains into site 5), not always once. Fixed
// below (`runCvDefenseUp`'s own DRAW SITE 4/5 chain) and confirmed here: this
// exact fixture (seed 1, Vital Throw and Seismic Toss both) now reproduces 7
// check-viability draws -- slot 1 fail@4+fail@5 (2 draws, -2), slot 2
// fail@4+fail@5 (2 draws, -2), slot 3 pass@4 (1 draw, no penalty), slot 4
// fail@4+pass@5 (2 draws, no penalty) -- squarely inside the fixed model's
// own [4,8]-draw range (4 slots x 1-or-2 draws each), not the old buggy
// model's fixed-4. This test's own seed/ordinal position is NOT the live
// ROM's own RNG stream, so its 7 does not need to equal the doc's raw 5-6
// number-for-number; what's reconciled is the MECHANISM (chained, variable
// per-slot draw count) that the old "always 4" derivation and the old port
// both missed.
describe("AI_CV_DefenseUp mask-7 fixture reproduction (docs/factory-ai-checkviability-ground-truth.md §18.3/§18.4)", () => {
  const MOVE_DEFENSE_UP_MOVESET = [
    MOVE_HARDEN_DEFENSE_UP, MOVE_HARDEN_DEFENSE_UP, MOVE_HARDEN_DEFENSE_UP, MOVE_HARDEN_DEFENSE_UP,
  ] as const;
  const POST_HARDEN_STAGES = Object.freeze({ ...NEUTRAL_STAGES, def: 7 });

  function anorithAttacker(hp: number): FactoryAiScoredBattlerView {
    return Object.freeze({
      types: ["TYPE_ROCK", "TYPE_BUG"] as const,
      attack: 115, defense: 70, spAttack: 60, spDefense: 70, speed: 95, level: 50,
      statStages: POST_HARDEN_STAGES,
      isFirstTurn: 0,
      hp, maxHp: 120,
    });
  }
  function machampTarget(lastUsedMoveId: number): FactoryAiScoredTargetView {
    return Object.freeze({
      species: 68,
      types: ["TYPE_FIGHTING", "TYPE_FIGHTING"] as const,
      attack: 150, defense: 100, spAttack: 85, spDefense: 105, speed: 75, level: 50,
      statStages: NEUTRAL_STAGES,
      isFirstTurn: 0,
      hp: 165, maxHp: 165, ability: "ABILITY_GUTS", knownAbility: null,
      lastUsedMoveId,
    });
  }
  function defenseUpView(attacker: FactoryAiScoredBattlerView, target: FactoryAiScoredTargetView): FactoryAiScoredView {
    return Object.freeze({
      schema: "factory-ai-scored-view/v1",
      mode: "factory-level-50-singles",
      active: Object.freeze({ aiBattler: 1 as const, targetBattler: 0 as const }),
      factory: Object.freeze({ levelMode: 0 as const, battleMode: 0 as const, factoryWinStreak: 28, trainerOpponentId: 222 }),
      moves: MOVE_DEFENSE_UP_MOVESET,
      attacker,
      target,
    });
  }
  function phaseDraws(result: ReturnType<typeof chooseFactoryAiScoredDecision>, phase: "check-bad-move" | "try-to-faint" | "check-viability") {
    return result.trace.draws.filter((d) => "phase" in d && d.phase === phase);
  }

  it("physical fixture #1 (Vital Throw, doc's own 55/120 = 45.8% HP figure): 7 check-viability draws -- DRAW SITE 4 chains into DRAW SITE 5 whenever the first roll fails, zero CBM/TryToFaint draws", () => {
    const view = defenseUpView(anorithAttacker(55), machampTarget(MOVE_VITAL_THROW_LAST));
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: 1, calls: 0 } });
    expect(phaseDraws(result, "check-bad-move")).toHaveLength(0);
    expect(phaseDraws(result, "try-to-faint")).toHaveLength(0);
    const cvDraws = phaseDraws(result, "check-viability");
    // slot 1: fail@4+fail@5 (-2); slot 2: fail@4+fail@5 (-2); slot 3: pass@4
    // (no penalty); slot 4: fail@4+pass@5 (no penalty). 2+2+1+2 = 7 draws.
    expect(cvDraws.map((d) => ("kind" in d ? d.kind : null))).toEqual([
      "defense-up-roll-4", "defense-up-roll-5",
      "defense-up-roll-4", "defense-up-roll-5",
      "defense-up-roll-4",
      "defense-up-roll-4", "defense-up-roll-5",
    ]);
    expect(cvDraws.map((d) => ("succeeded" in d ? d.succeeded : null))).toEqual([
      true, true, true, true, false, true, false,
    ]);
    expect(result.trace.draws).toHaveLength(4 /* setup */ + 7 /* check-viability */ + 1 /* tie */);
  });

  it("physical fixture #2 (Seismic Toss, doc's own 70/120 = 58.3% HP figure): identical 7-draw chain, same code path as Vital Throw", () => {
    const view = defenseUpView(anorithAttacker(70), machampTarget(MOVE_SEISMIC_TOSS_LAST));
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: 1, calls: 0 } });
    const cvDraws = phaseDraws(result, "check-viability");
    expect(cvDraws.map((d) => ("kind" in d ? d.kind : null))).toEqual([
      "defense-up-roll-4", "defense-up-roll-5",
      "defense-up-roll-4", "defense-up-roll-5",
      "defense-up-roll-4",
      "defense-up-roll-4", "defense-up-roll-5",
    ]);
    expect(result.trace.draws).toHaveLength(4 /* setup */ + 7 /* check-viability */ + 1 /* tie */);
  });

  it("non-physical flip (Dragon Rage, doc's own 80/120 = 66.7% HP figure): deterministic ZERO check-viability draws -- Gate F jumps straight to the -2 penalty, matching the doc's own live ledger exactly", () => {
    const view = defenseUpView(anorithAttacker(80), machampTarget(MOVE_DRAGON_RAGE_LAST));
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: 1, calls: 0 } });
    expect(phaseDraws(result, "check-bad-move")).toHaveLength(0);
    expect(phaseDraws(result, "try-to-faint")).toHaveLength(0);
    expect(phaseDraws(result, "check-viability")).toHaveLength(0);
    expect(result.trace.draws).toHaveLength(4 /* setup */ + 1 /* tie */);
  });
});

const MOVE_SAND_ATTACK_ACC_DOWN = 28; // EFFECT_ACCURACY_DOWN
const MOVE_SAND_ATTACK_MOVESET = [
  MOVE_SAND_ATTACK_ACC_DOWN, MOVE_SAND_ATTACK_ACC_DOWN, MOVE_SAND_ATTACK_ACC_DOWN, MOVE_SAND_ATTACK_ACC_DOWN,
] as const;

// docs/factory-ai-checkviability-ground-truth.md §19's twin fixtures
// (tools/battle-lab/mechanic-factory-ai-cv-accuracydown-{lowhp-reach,
// fullhp-control}-off.json) -- the sixth CBM-blocked pair, reproduced
// through the REAL mask-7 dispatcher end to end. Opponent (AI_USER) =
// Machamp (species 68, single ability Guts, Base Speed 55), all 4 slots
// MOVE_SAND_ATTACK; target (player) = Anorith (species 390, single ability
// Battle Armor, Base Speed 75) -- both single-ability, closing the
// Cmd_get_ability confound (doc §19.3) so AI_CBM_AccDown's own contribution
// is a flat, identical 0 in both fixtures. Doc §19.2's own confound finding
// governs the role assignment: Anorith (faster) plays the real-damage
// role (Seismic Toss, fixed damage, no accuracy-check ordering risk),
// Machamp (slower) is the dispatch-move-using opponent under test -- the
// SAME single real turn-1 decision this doc's whole CBM-blocked-pair series
// reproduces (not a second/phantom turn; §19.3's own fixtures execute
// exactly one turn).
//
// Draw-count reconciliation (per this step's brief): the doc's own live
// ledger (§19.4) shows 17 total Random() calls for the reach fixture, 7 for
// control, both cross-seed-stable. The live attribution table (§19.4)
// breaks the reach total down as: BattleAI_SetupAIData+0x83 (4, this port's
// own "setup-simulated-rng" draws) + BattleTurnPassed+0x157 (1) +
// ChooseMoveOrAction_Singles+0xf7 (1, this port's own tie draw) +
// Cmd_accuracycheck+0x305 (2) + Cmd_seteffectwithchance+0x81 (1) +
// Cmd_if_random_less_than+0x7 (8) = 17; the control total drops the last
// three (Cmd_accuracycheck 1 instead of 2, Cmd_seteffectwithchance 0,
// Cmd_if_random_less_than 0) = 7. Of these, ONLY the setup (4), tie (1),
// and Cmd_if_random_less_than (8 reach / 0 control) draws are inside
// chooseFactoryAiScoredDecision's own scope -- BattleTurnPassed's turn-order
// draw and both real moves' own Cmd_accuracycheck/Cmd_seteffectwithchance
// rolls happen elsewhere in the engine's move-execution pipeline, outside
// the AI's own move-scoring function, same reconciliation shape §18.4
// already established for AI_CV_DefenseUp's own extra unattributed draws.
// So this port's own policy-only total is 4+1+8=13 (reach) / 4+1+0=5
// (control) -- a documented SUBSET of the oracle's full 17/7 window totals,
// not a mismatch.
describe("AI_CV_AccuracyDown mask-7 fixture reproduction (docs/factory-ai-checkviability-ground-truth.md §19.3/§19.4)", () => {
  function machampAttacker(hp: number): FactoryAiScoredBattlerView {
    return Object.freeze({
      types: ["TYPE_FIGHTING", "TYPE_FIGHTING"] as const,
      attack: 150, defense: 100, spAttack: 85, spDefense: 105, speed: 55, level: 50,
      statStages: NEUTRAL_STAGES,
      isFirstTurn: 0,
      hp, maxHp: 165,
    });
  }
  function anorithTarget(accStage: number): FactoryAiScoredTargetView {
    return Object.freeze({
      species: 390,
      types: ["TYPE_ROCK", "TYPE_BUG"] as const,
      attack: 115, defense: 70, spAttack: 60, spDefense: 70, speed: 75, level: 50,
      statStages: Object.freeze({ ...NEUTRAL_STAGES, acc: accStage }),
      isFirstTurn: 0,
      hp: 120, maxHp: 120, ability: "ABILITY_BATTLE_ARMOR", knownAbility: null,
    });
  }
  function accuracyDownView(attacker: FactoryAiScoredBattlerView, target: FactoryAiScoredTargetView): FactoryAiScoredView {
    return Object.freeze({
      schema: "factory-ai-scored-view/v1",
      mode: "factory-level-50-singles",
      active: Object.freeze({ aiBattler: 1 as const, targetBattler: 0 as const }),
      factory: Object.freeze({ levelMode: 0 as const, battleMode: 0 as const, factoryWinStreak: 28, trainerOpponentId: 222 }),
      moves: MOVE_SAND_ATTACK_MOVESET,
      attacker,
      target,
    });
  }
  function phaseDraws(result: ReturnType<typeof chooseFactoryAiScoredDecision>, phase: "check-bad-move" | "try-to-faint" | "check-viability") {
    return result.trace.draws.filter((d) => "phase" in d && d.phase === phase);
  }

  it("reach fixture (Machamp at 115/165 HP = 69.7%, doc's own live-verified HP figure): Gate A true (DRAW SITE 1) AND Gate I false (Anorith's own ACC stage already 5, this same dispatch move's own prior hit) -> DRAW SITE 7 too -- 8 check-viability draws (2 sites x 4 identical slots), zero CBM/TryToFaint draws", () => {
    const view = accuracyDownView(machampAttacker(115), anorithTarget(5));
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: 1, calls: 0 } });
    expect(phaseDraws(result, "check-bad-move")).toHaveLength(0);
    expect(phaseDraws(result, "try-to-faint")).toHaveLength(0);
    const cvDraws = phaseDraws(result, "check-viability");
    expect(cvDraws).toHaveLength(8);
    const kinds = cvDraws.map((d) => ("kind" in d ? d.kind : null));
    expect(kinds.filter((k) => k === "accuracy-down-roll-1")).toHaveLength(4);
    expect(kinds.filter((k) => k === "accuracy-down-roll-7")).toHaveLength(4);
    // Policy-only total: 4 setup + 1 tie + 8 check-viability = 13 (see the
    // reconciliation comment above for why this is a documented SUBSET of
    // the oracle's own 17-draw full window total, not a mismatch).
    expect(result.trace.draws).toHaveLength(4 + 1 + 8);
  });

  it("reach fixture, seed 99 (doc's own cross-seed-stable second run): identical 8 check-viability draws", () => {
    const view = accuracyDownView(machampAttacker(115), anorithTarget(5));
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: 99, calls: 0 } });
    expect(phaseDraws(result, "check-viability")).toHaveLength(8);
    expect(result.trace.draws).toHaveLength(4 + 1 + 8);
  });

  it("control fixture (Machamp stays at full 165/165 HP throughout, doc's own live-verified figure): Gate B true (skips DRAW SITE 1) and Gate H true (skips the entire tail) -- deterministic ZERO check-viability draws, matching the doc's own live ledger exactly", () => {
    const view = accuracyDownView(machampAttacker(165), anorithTarget(5));
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: 1, calls: 0 } });
    expect(phaseDraws(result, "check-bad-move")).toHaveLength(0);
    expect(phaseDraws(result, "try-to-faint")).toHaveLength(0);
    expect(phaseDraws(result, "check-viability")).toHaveLength(0);
    // Policy-only total: 4 setup + 1 tie = 5 -- a documented SUBSET of the
    // oracle's own 7-draw full window total (see the reconciliation
    // comment above).
    expect(result.trace.draws).toHaveLength(4 + 1);
  });

  it("control fixture, seed 99 (doc's own cross-seed-stable second run): identical deterministic zero check-viability draws", () => {
    const view = accuracyDownView(machampAttacker(165), anorithTarget(5));
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: 99, calls: 0 } });
    expect(phaseDraws(result, "check-viability")).toHaveLength(0);
    expect(result.trace.draws).toHaveLength(4 + 1);
  });
});

const MOVE_AGILITY_SPEED_UP = 97; // EFFECT_SPEED_UP_2

// docs/factory-ai-checkviability-ground-truth.md §20.2/§20.3's twin fixtures
// (tools/battle-lab/mechanic-factory-ai-cv-speedup-{slower-reach,
// faster-control}-off.json) -- the seventh CBM-blocked pair, reproduced
// through the REAL mask-7 dispatcher end to end now that both AI_CBM_SpeedUp
// and AI_CV_SpeedUp are ported. Species-role-SWAP design (doc §20.2 reuses
// SpeedDown's own §6 trick, not an HP band): opponent (AI_USER) and target
// (player) species swap between the reach/control fixtures. Both species
// single-ability (Crobat: Inner Focus; Shuckle: Sturdy) -- doc §20.2's own
// live catch that AI_CheckBadMove's shared Soundproof prologue (`:47-58`)
// unconditionally draws get_ability for ANY dual-ability species regardless
// of handler body, so single-ability on BOTH sides is required to close that
// confound, not just the target (a first for this file's CBM-blocked pairs).
// All 4 opponent slots MOVE_AGILITY (self-targeted, 0 power/accuracy -- no
// damage/accuracy-check confound); the statStages.speed: 8 below constructs
// the decisive POST-turn-1 state directly (real Agility execution, stage
// 6->8), same "construct the decisive state" precedent the AttackUp/
// DefenseUp blocks above already established. Target's own moveset is
// irrelevant to either handler body and isn't part of this view at all --
// only AI_USER's own candidate moves (`view.moves`) are ever scored.
describe("AI_CV_SpeedUp mask-7 fixture reproduction (docs/factory-ai-checkviability-ground-truth.md §20.2/§20.3)", () => {
  const MOVE_SPEED_UP_MOVESET = [
    MOVE_AGILITY_SPEED_UP, MOVE_AGILITY_SPEED_UP, MOVE_AGILITY_SPEED_UP, MOVE_AGILITY_SPEED_UP,
  ] as const;
  const POST_AGILITY_STAGES = Object.freeze({ ...NEUTRAL_STAGES, speed: 8 });

  // Crobat (species 169), base Speed 130, single ability (Inner Focus).
  function crobatAttacker(): FactoryAiScoredBattlerView {
    return Object.freeze({
      types: ["TYPE_POISON", "TYPE_FLYING"] as const,
      attack: 90, defense: 80, spAttack: 70, spDefense: 80, speed: 130, level: 50,
      statStages: POST_AGILITY_STAGES,
      isFirstTurn: 0,
      hp: 100, maxHp: 100,
    });
  }
  function crobatTarget(): FactoryAiScoredTargetView {
    return Object.freeze({
      species: 169,
      types: ["TYPE_POISON", "TYPE_FLYING"] as const,
      attack: 90, defense: 80, spAttack: 70, spDefense: 80, speed: 130, level: 50,
      statStages: NEUTRAL_STAGES,
      isFirstTurn: 0,
      hp: 100, maxHp: 100, ability: "ABILITY_INNER_FOCUS", knownAbility: null,
    });
  }
  // Shuckle (species 213), base Speed 5, single ability (Sturdy).
  function shuckleAttacker(): FactoryAiScoredBattlerView {
    return Object.freeze({
      types: ["TYPE_BUG", "TYPE_ROCK"] as const,
      attack: 10, defense: 230, spAttack: 10, spDefense: 230, speed: 5, level: 50,
      statStages: POST_AGILITY_STAGES,
      isFirstTurn: 0,
      hp: 100, maxHp: 100,
    });
  }
  function shuckleTarget(): FactoryAiScoredTargetView {
    return Object.freeze({
      species: 213,
      types: ["TYPE_BUG", "TYPE_ROCK"] as const,
      attack: 10, defense: 230, spAttack: 10, spDefense: 230, speed: 5, level: 50,
      statStages: NEUTRAL_STAGES,
      isFirstTurn: 0,
      hp: 100, maxHp: 100, ability: "ABILITY_STURDY", knownAbility: null,
    });
  }
  function speedUpView(attacker: FactoryAiScoredBattlerView, target: FactoryAiScoredTargetView): FactoryAiScoredView {
    return Object.freeze({
      schema: "factory-ai-scored-view/v1",
      mode: "factory-level-50-singles",
      active: Object.freeze({ aiBattler: 1 as const, targetBattler: 0 as const }),
      factory: Object.freeze({ levelMode: 0 as const, battleMode: 0 as const, factoryWinStreak: 28, trainerOpponentId: 222 }),
      moves: MOVE_SPEED_UP_MOVESET,
      attacker,
      target,
    });
  }
  function phaseDraws(result: ReturnType<typeof chooseFactoryAiScoredDecision>, phase: "check-bad-move" | "try-to-faint" | "check-viability") {
    return result.trace.draws.filter((d) => "phase" in d && d.phase === phase);
  }

  it.each([1, 99])("reach fixture (Shuckle AI, post-Agility SPEED stage 8 -> effective speed 10, vs Crobat target -> effective speed 130), seed %i: all 4 identical Agility slots independently reach DRAW SITE 1 -- exactly 4 check-viability draws, zero CBM/TryToFaint draws (both species single-ability)", (seed) => {
    const view = speedUpView(shuckleAttacker(), crobatTarget());
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: seed, calls: 0 } });
    expect(phaseDraws(result, "check-bad-move")).toHaveLength(0);
    expect(phaseDraws(result, "try-to-faint")).toHaveLength(0);
    const cvDraws = phaseDraws(result, "check-viability");
    expect(cvDraws).toHaveLength(4);
    expect(cvDraws.every((d) => "kind" in d && d.kind === "speed-up-roll")).toBe(true);
    expect(result.trace.draws).toHaveLength(4 /* setup */ + 4 /* CV roll x4 slots */ + 1 /* tie */);
  });

  it.each([1, 99])("control fixture (Crobat AI, post-Agility SPEED stage 8 -> effective speed 260, vs Shuckle target -> effective speed 5), seed %i: Gate A false (target not faster) -- deterministic zero check-viability draws", (seed) => {
    const view = speedUpView(crobatAttacker(), shuckleTarget());
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: seed, calls: 0 } });
    expect(phaseDraws(result, "check-bad-move")).toHaveLength(0);
    expect(phaseDraws(result, "try-to-faint")).toHaveLength(0);
    expect(phaseDraws(result, "check-viability")).toHaveLength(0);
    expect(result.trace.draws).toHaveLength(4 /* setup */ + 1 /* tie */);
  });
});

const MOVE_GROWTH_SPATK_UP_REPRO = 74; // EFFECT_SPECIAL_ATTACK_UP

// docs/factory-ai-checkviability-ground-truth.md §21.2/§21.3's twin fixtures
// (tools/battle-lab/mechanic-factory-ai-cv-spatkup-{fullhp-reach,
// lowhp-control}-off.json) -- the eighth CBM-blocked pair, reproduced
// through the REAL mask-7 dispatcher end to end now that both AI_CBM_SpAtkUp
// and AI_CV_SpAtkUp are ported. §17's own Anorith/Machamp fixture design
// reused verbatim (doc §21.2): opponent (AI_USER) = Anorith (Battle Armor
// blocks Cmd_critcalc's own Random() call), all 4 slots MOVE_GROWTH
// (EFFECT_SPECIAL_ATTACK_UP, self-target, 0 power/accuracy); target (player)
// = Machamp, single assignable ability (Guts), same species pairing as the
// AttackUp/DefenseDown/SpDefDown/VitalThrow blocks above. Every gate/draw
// site reads AI_USER's OWN state only (same structural break AttackUp's own
// block established) -- Machamp's own kit/moveset is irrelevant to this
// handler entirely, so its HP/ability stay fixed and only Anorith's own HP
// varies between the reach/control fixtures, constructed directly per this
// file's own "construct the decisive state" precedent. Neither fixture
// reaches DRAW SITE 1 (needs SPATK stage already built to 9-11, a 2-turn
// recipe, doc §21.2's own "not staged this session") or DRAW SITE 3 (needs
// HP in [40,70), doc §21.2's own note) -- so this reproduction's own numeric
// ledger is IDENTICAL to AttackUp's own (§17.4: 10/10 reach, 8/8 control),
// even though DRAW SITE 3's threshold differs (doc §21.1) -- neither
// fixture design reaches that site either way.
describe("AI_CV_SpAtkUp mask-7 fixture reproduction (docs/factory-ai-checkviability-ground-truth.md §21.2/§21.3)", () => {
  const MOVE_SPATK_UP_MOVESET = [
    MOVE_GROWTH_SPATK_UP_REPRO, MOVE_GROWTH_SPATK_UP_REPRO, MOVE_GROWTH_SPATK_UP_REPRO, MOVE_GROWTH_SPATK_UP_REPRO,
  ] as const;

  function anorithAttacker(hp: number): FactoryAiScoredBattlerView {
    return Object.freeze({
      types: ["TYPE_ROCK", "TYPE_BUG"] as const,
      attack: 115, defense: 70, spAttack: 60, spDefense: 70, speed: 95, level: 50,
      statStages: NEUTRAL_STAGES,
      isFirstTurn: 0,
      hp, maxHp: 120,
    });
  }
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
  function spAtkUpView(attacker: FactoryAiScoredBattlerView): FactoryAiScoredView {
    return Object.freeze({
      schema: "factory-ai-scored-view/v1",
      mode: "factory-level-50-singles",
      active: Object.freeze({ aiBattler: 1 as const, targetBattler: 0 as const }),
      factory: Object.freeze({ levelMode: 0 as const, battleMode: 0 as const, factoryWinStreak: 28, trainerOpponentId: 222 }),
      moves: MOVE_SPATK_UP_MOVESET,
      attacker,
      target: machampTarget(),
    });
  }
  function phaseDraws(result: ReturnType<typeof chooseFactoryAiScoredDecision>, phase: "check-bad-move" | "try-to-faint" | "check-viability") {
    return result.trace.draws.filter((d) => "phase" in d && d.phase === phase);
  }

  it.each([1, 99])("reach fixture (Anorith stays at full 120/120 HP -- Gate B true, reaches DRAW SITE 2), seed %i: exactly 4 check-viability draws, zero CBM/TryToFaint draws", (seed) => {
    const view = spAtkUpView(anorithAttacker(120));
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: seed, calls: 0 } });
    expect(phaseDraws(result, "check-bad-move")).toHaveLength(0);
    expect(phaseDraws(result, "try-to-faint")).toHaveLength(0);
    const cvDraws = phaseDraws(result, "check-viability");
    expect(cvDraws).toHaveLength(4);
    expect(cvDraws.every((d) => "kind" in d && d.kind === "sp-atk-up-roll-2")).toBe(true);
    expect(result.trace.draws).toHaveLength(4 /* setup */ + 4 /* CV roll x4 slots */ + 1 /* tie */);
  });

  it("control fixture, seed 1 (Anorith at 30/120 HP = 25%, doc §21.3's own live-verified endpoint): Gate B false (skips DRAW SITE 2), Gate D true (HP<40, skips DRAW SITE 3) -- deterministic zero check-viability draws", () => {
    const view = spAtkUpView(anorithAttacker(30));
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: 1, calls: 0 } });
    expect(phaseDraws(result, "check-bad-move")).toHaveLength(0);
    expect(phaseDraws(result, "try-to-faint")).toHaveLength(0);
    expect(phaseDraws(result, "check-viability")).toHaveLength(0);
    expect(result.trace.draws).toHaveLength(4 /* setup */ + 1 /* tie */);
  });

  it("control fixture, seed 99 (Anorith at 18/120 HP = 15%, doc §21.3's own live-verified endpoint): deterministic zero check-viability draws", () => {
    const view = spAtkUpView(anorithAttacker(18));
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: 99, calls: 0 } });
    expect(phaseDraws(result, "check-viability")).toHaveLength(0);
    expect(result.trace.draws).toHaveLength(4 /* setup */ + 1 /* tie */);
  });
});

const MOVE_COSMIC_POWER_MASK7 = 322; // EFFECT_COSMIC_POWER
const MOVE_CALM_MIND_MASK7 = 347; // EFFECT_CALM_MIND

// docs/factory-ai-checkviability-ground-truth.md §22.2/§22.3's four fixtures
// (tools/battle-lab/mechanic-factory-ai-cv-spdefup-{cosmicpower,calmmind}-
// {reach,control}-off.json) -- the ninth CBM-blocked pair, reproduced
// through the REAL mask-7 dispatcher end to end now that AI_CBM_CosmicPower,
// AI_CBM_CalmMind, and the shared AI_CV_SpDefUp are all ported. §18.3's own
// Anorith/Machamp HP-banded last-used-move recipe reused verbatim (doc
// §22.2): opponent (AI_USER) = Anorith (Battle Armor blocks Cmd_critcalc's
// own Random() call), target (player) = Machamp (single ability Guts) --
// same species pairing as the DefenseUp/SpAtkUp blocks above. Gate F's own
// polarity inversion (doc §22.1) flips the reach/control move-to-name
// assignment vs DefenseUp's own: here Seismic Toss (physical, IN the list)
// is the CONTROL fixture (Gate F now jumps straight to ScoreDown2, a fully
// deterministic zero-draw path) and Dragon Rage (non-physical, NOT in the
// list) is the REACH fixture (falls through to DRAW SITE 4) -- the exact
// opposite of DefenseUp's own naming, per §22.2's own explicit warning
// against copying DefenseUp's move-to-name assignment blind. Same chained
// DRAW SITE 4/5 model the DefenseUp block above establishes (docs/factory-
// ai-draw-discrepancy-probe.md §4: byte-identical topology, confirmed live
// on this second handler too, probe doc §3.4) -- reusing the SAME species/
// stats/moveset-count shape as the DefenseUp fixture above puts this
// fixture's own CV phase at the identical RNG-stream offset, so it
// reproduces the identical 7-draw chain (slot1/2 fail@4+fail@5, slot3
// pass@4, slot4 fail@4+pass@5). The oracle's own live window totals (§22.3:
// reach 14/13, control 8/8 cross-seed) include extra per-slot Random() calls
// outside chooseFactoryAiScoredDecision's own scope -- a documented subset,
// same relationship every prior HP-banded/last-move pair (DefenseUp/
// AccuracyDown) already established, not a mismatch.
describe("AI_CV_SpDefUp mask-7 fixture reproduction (docs/factory-ai-checkviability-ground-truth.md §22.2/§22.3)", () => {
  function anorithAttacker(hp: number): FactoryAiScoredBattlerView {
    return Object.freeze({
      types: ["TYPE_ROCK", "TYPE_BUG"] as const,
      attack: 115, defense: 70, spAttack: 60, spDefense: 70, speed: 95, level: 50,
      statStages: NEUTRAL_STAGES,
      isFirstTurn: 0,
      hp, maxHp: 120,
    });
  }
  function machampTarget(lastUsedMoveId: number): FactoryAiScoredTargetView {
    return Object.freeze({
      species: 68,
      types: ["TYPE_FIGHTING", "TYPE_FIGHTING"] as const,
      attack: 150, defense: 100, spAttack: 85, spDefense: 105, speed: 75, level: 50,
      statStages: NEUTRAL_STAGES,
      isFirstTurn: 0,
      hp: 165, maxHp: 165, ability: "ABILITY_GUTS", knownAbility: null,
      lastUsedMoveId,
    });
  }
  function spDefUpView(
    moveId: number,
    attacker: FactoryAiScoredBattlerView,
    target: FactoryAiScoredTargetView,
  ): FactoryAiScoredView {
    return Object.freeze({
      schema: "factory-ai-scored-view/v1",
      mode: "factory-level-50-singles",
      active: Object.freeze({ aiBattler: 1 as const, targetBattler: 0 as const }),
      factory: Object.freeze({ levelMode: 0 as const, battleMode: 0 as const, factoryWinStreak: 28, trainerOpponentId: 222 }),
      moves: [moveId, moveId, moveId, moveId] as const,
      attacker,
      target,
    });
  }
  function phaseDraws(result: ReturnType<typeof chooseFactoryAiScoredDecision>, phase: "check-bad-move" | "try-to-faint" | "check-viability") {
    return result.trace.draws.filter((d) => "phase" in d && d.phase === phase);
  }

  it.each([
    ["CosmicPower", MOVE_COSMIC_POWER_MASK7],
    ["CalmMind", MOVE_CALM_MIND_MASK7],
  ])("%s reach fixture (Dragon Rage last, Anorith 80/120 = 66.7%%): Gate F NOT in the physical list -- falls through to DRAW SITE 4, which chains into DRAW SITE 5 on failure -- 7 check-viability draws, identical to DefenseUp's own physical fixture (same RNG-stream offset), zero CBM/TryToFaint draws", (_label, moveId) => {
    const view = spDefUpView(moveId, anorithAttacker(80), machampTarget(MOVE_DRAGON_RAGE_LAST));
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: 1, calls: 0 } });
    expect(phaseDraws(result, "check-bad-move")).toHaveLength(0);
    expect(phaseDraws(result, "try-to-faint")).toHaveLength(0);
    const cvDraws = phaseDraws(result, "check-viability");
    // Same 2+2+1+2 = 7 shape as AI_CV_DefenseUp's own physical fixture above.
    expect(cvDraws.map((d) => ("kind" in d ? d.kind : null))).toEqual([
      "sp-def-up-roll-4", "sp-def-up-roll-5",
      "sp-def-up-roll-4", "sp-def-up-roll-5",
      "sp-def-up-roll-4",
      "sp-def-up-roll-4", "sp-def-up-roll-5",
    ]);
    expect(result.trace.draws).toHaveLength(4 /* setup */ + 7 /* check-viability */ + 1 /* tie */);
  });

  it.each([
    ["CosmicPower", MOVE_COSMIC_POWER_MASK7],
    ["CalmMind", MOVE_CALM_MIND_MASK7],
  ])("%s control fixture (Seismic Toss last, Anorith 70/120 = 58.3%%): Gate F IS in the physical list -- INVERTED vs DefenseUp, jumps straight to ScoreDown2, deterministic ZERO check-viability draws", (_label, moveId) => {
    const view = spDefUpView(moveId, anorithAttacker(70), machampTarget(MOVE_SEISMIC_TOSS_LAST));
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: 1, calls: 0 } });
    expect(phaseDraws(result, "check-bad-move")).toHaveLength(0);
    expect(phaseDraws(result, "try-to-faint")).toHaveLength(0);
    expect(phaseDraws(result, "check-viability")).toHaveLength(0);
    expect(result.trace.draws).toHaveLength(4 /* setup */ + 1 /* tie */);
  });

  it.each([
    ["CosmicPower", MOVE_COSMIC_POWER_MASK7],
    ["CalmMind", MOVE_CALM_MIND_MASK7],
  ])("%s wiring: the attacker's own maxed SPDEF stage reaches the CBM handler through the real dispatcher (mask 1 isolates CheckBadMove: -8 on every slot vs the neutral-stage run; pins the previously unwired spDefStage)", (_label, moveId) => {
    // Mask 1 (win streak below the mask-7 band) so ONLY CheckBadMove runs --
    // under mask 7 the shared AI_CV_SpDefUp body reads the same maxed stage
    // through its own gates and contaminates a total-score comparison.
    function mask1View(attacker: FactoryAiScoredBattlerView): FactoryAiScoredView {
      const base = spDefUpView(moveId, attacker, machampTarget(MOVE_SEISMIC_TOSS_LAST));
      return Object.freeze({ ...base, factory: Object.freeze({ ...base.factory, factoryWinStreak: 14 }) });
    }
    const neutral = chooseFactoryAiScoredDecision({
      view: mask1View(anorithAttacker(70)),
      request: fourSlotRequest,
      rng: { value: 1, calls: 0 },
    });
    const maxed = chooseFactoryAiScoredDecision({
      view: mask1View(Object.freeze({
        ...anorithAttacker(70),
        statStages: Object.freeze({ ...NEUTRAL_STAGES, spDef: MAX_STAT_STAGE }),
      })),
      request: fourSlotRequest,
      rng: { value: 1, calls: 0 },
    });
    expect(maxed.trace.mask).toBe(1);
    expect(maxed.trace.executedScoringScripts).toEqual(["check-bad-move"]);
    expect(phaseDraws(maxed, "check-bad-move")).toHaveLength(0);
    expect(maxed.trace.slotScores.map((s) => s.finalScore)).toEqual(
      neutral.trace.slotScores.map((s) => s.finalScore - 8),
    );
  });

  it("CosmicPower and CalmMind produce numerically identical draw counts for the same reach fixture (neither's own extra raised stat affects Dragon Rage's fixed damage or AI_CV_SpDefUp's own gates, doc §22.3)", () => {
    const reachCosmic = chooseFactoryAiScoredDecision({
      view: spDefUpView(MOVE_COSMIC_POWER_MASK7, anorithAttacker(80), machampTarget(MOVE_DRAGON_RAGE_LAST)),
      request: fourSlotRequest,
      rng: { value: 1, calls: 0 },
    });
    const reachCalm = chooseFactoryAiScoredDecision({
      view: spDefUpView(MOVE_CALM_MIND_MASK7, anorithAttacker(80), machampTarget(MOVE_DRAGON_RAGE_LAST)),
      request: fourSlotRequest,
      rng: { value: 1, calls: 0 },
    });
    expect(reachCalm.trace.draws).toHaveLength(reachCosmic.trace.draws.length);
    expect(phaseDraws(reachCalm, "check-viability")).toHaveLength(phaseDraws(reachCosmic, "check-viability").length);
  });

  it("AI_CBM_SpDefUp live receipt: at max SPDEF the -10 makes Light Screen slot 3 win with the oracle's exact 10-draw decision ledger (doc §28)", () => {
    const result = chooseFactoryAiScoredDecision({
      view: Object.freeze({
        schema: "factory-ai-scored-view/v1" as const,
        mode: "factory-level-50-singles" as const,
        active: Object.freeze({ aiBattler: 1 as const, targetBattler: 0 as const }),
        factory: Object.freeze({
          levelMode: 0 as const,
          battleMode: 0 as const,
          factoryWinStreak: 28,
          trainerOpponentId: 222,
        }),
        moves: [133, 113, 113, 113] as const,
        attacker: Object.freeze({
          types: ["TYPE_GHOST", "TYPE_GHOST"] as const,
          attack: 90, defense: 150, spAttack: 80, spDefense: 150, speed: 45, level: 50,
          statStages: Object.freeze({ ...NEUTRAL_STAGES, spDef: MAX_STAT_STAGE }),
          isFirstTurn: 0,
          hp: 115, maxHp: 115,
          lightScreenUp: true,
          ability: "ABILITY_PRESSURE",
        }),
        target: Object.freeze({
          species: 241,
          types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
          attack: 100, defense: 125, spAttack: 60, spDefense: 90, speed: 120, level: 50,
          statStages: NEUTRAL_STAGES,
          isFirstTurn: 0,
          hp: 170, maxHp: 170,
          ability: "ABILITY_THICK_FAT",
          knownAbility: null,
          lastUsedMoveId: 233,
        }),
      }),
      request: fourSlotRequest,
      // OFF oracle seed-1 reach fixture: frame 2200 RNG is 1215990602;
      // Cmd_seteffectwithchance + BattleTurnPassed consume two draws before
      // BattleAI_SetupAIData starts this exact receipt.
      rng: { value: 2_489_327_812, calls: 0 },
    });

    expect(result.trace.slotScores.map((slot) => ({
      cbm: slot.checkBadMoveDelta,
      cv: slot.checkViabilityDelta,
      final: slot.finalScore,
    }))).toEqual([
      { cbm: -10, cv: -3, final: 87 },
      { cbm: -8, cv: -2, final: 90 },
      { cbm: -8, cv: -2, final: 90 },
      { cbm: -8, cv: -2, final: 90 },
    ]);
    expect(result.trace.draws.map((draw) => draw.kind)).toEqual([
      "setup-simulated-rng",
      "setup-simulated-rng",
      "setup-simulated-rng",
      "setup-simulated-rng",
      "sp-def-up-roll-1",
      "sp-def-up-roll-3",
      "light-screen-roll",
      "light-screen-roll",
      "light-screen-roll",
      "best-move-tie",
    ]);
    expect(result.trace.tie.chosenDecision).toEqual({
      kind: "use-move",
      moveSlot: 3,
      targetBattler: 0,
    });
    expect(result.rng).toEqual({ value: 873_887_126, calls: 10 });
  });
});

const MOVE_LIGHT_SCREEN_MASK7 = 113; // EFFECT_LIGHT_SCREEN
const MOVE_REFLECT_MASK7 = 115; // EFFECT_REFLECT

// docs/factory-ai-checkviability-ground-truth.md §23.2/§23.3's four fixtures
// (tools/battle-lab/mechanic-factory-ai-cv-{lightscreen,reflect}-{reach,
// control}-off.json) -- the tenth CBM-blocked pair, reproduced through the
// REAL mask-7 dispatcher end to end now that AI_CBM_LightScreen/
// AI_CBM_Reflect and AI_CV_LightScreen/AI_CV_Reflect are all ported. Opponent
// (AI_USER) = Anorith (same species/stats as the DefenseDown/DefenseUp/
// SpAtkUp/SpDefUp blocks above), stays at full 120/120 HP in EVERY fixture --
// unlike every prior CBM-blocked pair, doc §23.2 needs zero move-damage or
// HP-banding at all, since Gate A only cares whether that HP is < 50% (never
// true here). LightScreen's 8-type special list and Reflect's 9-type
// physical list are exact complements (doc §23.1), so the same two target
// species (Shuckle 213 Bug/Rock, single ability Sturdy; Vulpix 37 pure Fire,
// single ability Flash Fire -- both closing the CBM preamble's own
// get_ability confound) serve both pairs with reach/control simply swapping:
// Shuckle is LightScreen's reach (neither type listed) / Reflect's control
// (both types listed); Vulpix is LightScreen's control (Fire listed) /
// Reflect's reach (Fire not listed). Same "4 clean check-viability draws"
// policy-own-draws model every prior block establishes: the oracle's own
// live window totals (§23.3: reach 10/10, control 6/6 cross-seed) are a
// documented superset (the extra +1 is BattleTurnPassed, outside
// chooseFactoryAiScoredDecision's own scope, doc §23.4) -- reach's own
// policy total is 4 setup + 4 CV + 1 tie = 9; control's is 4 setup + 0 CV +
// 1 tie = 5.
describe("AI_CV_LightScreen / AI_CV_Reflect mask-7 fixture reproduction (docs/factory-ai-checkviability-ground-truth.md §23.2/§23.3)", () => {
  function anorithSideScreenAttacker(): FactoryAiScoredBattlerView {
    return Object.freeze({
      types: ["TYPE_ROCK", "TYPE_BUG"] as const,
      attack: 115, defense: 70, spAttack: 60, spDefense: 70, speed: 95, level: 50,
      statStages: NEUTRAL_STAGES,
      isFirstTurn: 0,
      hp: 120, maxHp: 120,
    });
  }
  function shuckleSideScreenTarget(): FactoryAiScoredTargetView {
    return Object.freeze({
      species: 213,
      types: ["TYPE_BUG", "TYPE_ROCK"] as const,
      attack: 10, defense: 230, spAttack: 10, spDefense: 230, speed: 5, level: 50,
      statStages: NEUTRAL_STAGES,
      isFirstTurn: 0,
      hp: 100, maxHp: 100, ability: "ABILITY_STURDY", knownAbility: null,
    });
  }
  function vulpixSideScreenTarget(): FactoryAiScoredTargetView {
    return Object.freeze({
      species: 37,
      types: ["TYPE_FIRE", "TYPE_FIRE"] as const,
      attack: 41, defense: 40, spAttack: 50, spDefense: 65, speed: 65, level: 50,
      statStages: NEUTRAL_STAGES,
      isFirstTurn: 0,
      hp: 100, maxHp: 100, ability: "ABILITY_FLASH_FIRE", knownAbility: null,
    });
  }
  function sideScreenView(moveId: number, target: FactoryAiScoredTargetView): FactoryAiScoredView {
    return Object.freeze({
      schema: "factory-ai-scored-view/v1",
      mode: "factory-level-50-singles",
      active: Object.freeze({ aiBattler: 1 as const, targetBattler: 0 as const }),
      factory: Object.freeze({ levelMode: 0 as const, battleMode: 0 as const, factoryWinStreak: 28, trainerOpponentId: 222 }),
      moves: [moveId, moveId, moveId, moveId] as const,
      attacker: anorithSideScreenAttacker(),
      target,
    });
  }
  function phaseDraws(result: ReturnType<typeof chooseFactoryAiScoredDecision>, phase: "check-bad-move" | "try-to-faint" | "check-viability") {
    return result.trace.draws.filter((d) => "phase" in d && d.phase === phase);
  }

  it.each([1, 99])("LightScreen reach fixture (Shuckle target, Bug/Rock -- neither type in the special list), seed %i: all 4 identical slots independently reach the DRAW SITE -- exactly 4 check-viability draws, zero CBM/TryToFaint draws, 9 total policy draws", (seed) => {
    const view = sideScreenView(MOVE_LIGHT_SCREEN_MASK7, shuckleSideScreenTarget());
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: seed, calls: 0 } });
    expect(phaseDraws(result, "check-bad-move")).toHaveLength(0);
    expect(phaseDraws(result, "try-to-faint")).toHaveLength(0);
    const cvDraws = phaseDraws(result, "check-viability");
    expect(cvDraws).toHaveLength(4);
    expect(cvDraws.every((d) => "kind" in d && d.kind === "light-screen-roll")).toBe(true);
    expect(result.trace.draws).toHaveLength(4 /* setup */ + 4 /* CV roll x4 slots */ + 1 /* tie */);
  });

  it.each([1, 99])("LightScreen control fixture (Vulpix target, pure Fire -- IS in the special list), seed %i: Gate B matches immediately for all 4 slots -- zero check-viability draws, zero CBM/TryToFaint draws, 5 total policy draws", (seed) => {
    const view = sideScreenView(MOVE_LIGHT_SCREEN_MASK7, vulpixSideScreenTarget());
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: seed, calls: 0 } });
    expect(phaseDraws(result, "check-bad-move")).toHaveLength(0);
    expect(phaseDraws(result, "try-to-faint")).toHaveLength(0);
    expect(phaseDraws(result, "check-viability")).toHaveLength(0);
    expect(result.trace.draws).toHaveLength(4 /* setup */ + 1 /* tie */);
  });

  it.each([1, 99])("Reflect reach fixture (Vulpix target, pure Fire -- NOT in the physical list), seed %i: all 4 identical slots independently reach the DRAW SITE -- exactly 4 check-viability draws, zero CBM/TryToFaint draws, 9 total policy draws", (seed) => {
    const view = sideScreenView(MOVE_REFLECT_MASK7, vulpixSideScreenTarget());
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: seed, calls: 0 } });
    expect(phaseDraws(result, "check-bad-move")).toHaveLength(0);
    expect(phaseDraws(result, "try-to-faint")).toHaveLength(0);
    const cvDraws = phaseDraws(result, "check-viability");
    expect(cvDraws).toHaveLength(4);
    expect(cvDraws.every((d) => "kind" in d && d.kind === "reflect-roll")).toBe(true);
    expect(result.trace.draws).toHaveLength(4 /* setup */ + 4 /* CV roll x4 slots */ + 1 /* tie */);
  });

  it.each([1, 99])("Reflect control fixture (Shuckle target, Bug/Rock -- both types in the physical list), seed %i: Gate B matches immediately for all 4 slots -- zero check-viability draws, zero CBM/TryToFaint draws, 5 total policy draws", (seed) => {
    const view = sideScreenView(MOVE_REFLECT_MASK7, shuckleSideScreenTarget());
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: seed, calls: 0 } });
    expect(phaseDraws(result, "check-bad-move")).toHaveLength(0);
    expect(phaseDraws(result, "try-to-faint")).toHaveLength(0);
    expect(phaseDraws(result, "check-viability")).toHaveLength(0);
    expect(result.trace.draws).toHaveLength(4 /* setup */ + 1 /* tie */);
  });

  it("LightScreen and Reflect produce numerically identical draw counts on their own respective reach fixtures (doc §23.3's own cross-handler parity)", () => {
    const lightScreenReach = chooseFactoryAiScoredDecision({
      view: sideScreenView(MOVE_LIGHT_SCREEN_MASK7, shuckleSideScreenTarget()),
      request: fourSlotRequest,
      rng: { value: 1, calls: 0 },
    });
    const reflectReach = chooseFactoryAiScoredDecision({
      view: sideScreenView(MOVE_REFLECT_MASK7, vulpixSideScreenTarget()),
      request: fourSlotRequest,
      rng: { value: 1, calls: 0 },
    });
    expect(reflectReach.trace.draws).toHaveLength(lightScreenReach.trace.draws.length);
    expect(phaseDraws(reflectReach, "check-viability")).toHaveLength(phaseDraws(lightScreenReach, "check-viability").length);
  });
});

const MOVE_DOUBLE_TEAM_MASK7 = 104; // EFFECT_EVASION_UP

// docs/factory-ai-checkviability-ground-truth.md §24.2/§24.3's three fixtures
// (tools/battle-lab/mechanic-factory-ai-cv-evasionup-{fullhp-reach,
// midhp-control,lowhp-reach}-off.json) -- the eleventh CBM-blocked pair's own
// UP half, reproduced through the REAL mask-7 dispatcher end to end.
// Opponent (AI_USER, under test) = Machamp (species 68, same stats as the
// SpDefUp block's own target above -- here Machamp is the ATTACKER, not the
// target, since Double Team is Machamp's own move), all 4 slots MOVE_DOUBLE_
// TEAM; target (player) = Anorith (species 390, single ability Battle Armor
// -- closes the universal CBM preamble's own get_ability confound). Because
// Gate A's own 90% threshold and Gate H's own 70% threshold are disjoint
// bands (doc §24.1/§24.2), three fixtures are needed (not two, unlike
// AccuracyDown's own shared-threshold twin-site design): fullhp-reach isolates
// DRAW SITE 1, midhp-control is a shared zero-draw control for BOTH sites,
// lowhp-reach isolates DRAW SITE 8. Every fixture constructs Machamp's own
// evasion stage at 7 (not 6) directly -- Double Team's own real turn-1 use
// has already raised it by the time the phantom next-decision runs (doc
// §24.1's own finding, same "construct the post-real-move state directly"
// precedent the AttackUp block's own POST_SWORDS_DANCE_STAGES established).
// Policy-own-draws model: fullhp-reach/lowhp-reach = 4 setup + 4 CV + 1 tie =
// 9; midhp-control = 4 setup + 0 CV + 1 tie = 5 (doc §24.3's own live window
// totals of 10/8/12 are a documented superset, the same relationship every
// prior pair already established).
describe("AI_CV_EvasionUp mask-7 fixture reproduction (docs/factory-ai-checkviability-ground-truth.md §24.2/§24.3)", () => {
  const POST_DOUBLE_TEAM_STAGES = Object.freeze({ ...NEUTRAL_STAGES, evasion: 7 });

  function machampAttacker(hp: number, maxHp = 165): FactoryAiScoredBattlerView {
    return Object.freeze({
      types: ["TYPE_FIGHTING", "TYPE_FIGHTING"] as const,
      attack: 150, defense: 100, spAttack: 85, spDefense: 105, speed: 75, level: 50,
      statStages: POST_DOUBLE_TEAM_STAGES,
      isFirstTurn: 0,
      hp, maxHp,
    });
  }
  function anorithTarget(hp = 100, maxHp = 100): FactoryAiScoredTargetView {
    return Object.freeze({
      species: 390,
      types: ["TYPE_ROCK", "TYPE_BUG"] as const,
      attack: 115, defense: 70, spAttack: 60, spDefense: 70, speed: 95, level: 50,
      statStages: NEUTRAL_STAGES,
      isFirstTurn: 0,
      hp, maxHp, ability: "ABILITY_BATTLE_ARMOR", knownAbility: null,
    });
  }
  function evasionUpView(attacker: FactoryAiScoredBattlerView, target: FactoryAiScoredTargetView): FactoryAiScoredView {
    return Object.freeze({
      schema: "factory-ai-scored-view/v1",
      mode: "factory-level-50-singles",
      active: Object.freeze({ aiBattler: 1 as const, targetBattler: 0 as const }),
      factory: Object.freeze({ levelMode: 0 as const, battleMode: 0 as const, factoryWinStreak: 28, trainerOpponentId: 222 }),
      moves: [MOVE_DOUBLE_TEAM_MASK7, MOVE_DOUBLE_TEAM_MASK7, MOVE_DOUBLE_TEAM_MASK7, MOVE_DOUBLE_TEAM_MASK7] as const,
      attacker,
      target,
    });
  }
  function phaseDraws(result: ReturnType<typeof chooseFactoryAiScoredDecision>, phase: "check-bad-move" | "try-to-faint" | "check-viability") {
    return result.trace.draws.filter((d) => "phase" in d && d.phase === phase);
  }

  it("fullhp-reach fixture (Machamp 165/165 = 100%): Gate A true for all 4 identical slots -- exactly 4 check-viability draws (DRAW SITE 1), zero CBM/TryToFaint draws", () => {
    const view = evasionUpView(machampAttacker(165), anorithTarget());
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: 1, calls: 0 } });
    expect(phaseDraws(result, "check-bad-move")).toHaveLength(0);
    expect(phaseDraws(result, "try-to-faint")).toHaveLength(0);
    const cvDraws = phaseDraws(result, "check-viability");
    expect(cvDraws).toHaveLength(4);
    expect(cvDraws.every((d) => "kind" in d && d.kind === "evasion-up-roll-1")).toBe(true);
    expect(result.trace.draws).toHaveLength(4 /* setup */ + 4 /* CV roll x4 slots */ + 1 /* tie */);
  });

  it("midhp-control fixture (Machamp 125/165 = 75%, Dragon Rage's fixed 40 damage): strictly between both gates' own disjoint thresholds -- a shared deterministic zero-draw control for BOTH sites", () => {
    const view = evasionUpView(machampAttacker(125), anorithTarget());
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: 1, calls: 0 } });
    expect(phaseDraws(result, "check-bad-move")).toHaveLength(0);
    expect(phaseDraws(result, "try-to-faint")).toHaveLength(0);
    expect(phaseDraws(result, "check-viability")).toHaveLength(0);
    expect(result.trace.draws).toHaveLength(4 /* setup */ + 1 /* tie */);
  });

  it("lowhp-reach fixture (Machamp 115/165 = 69%, Seismic Toss's fixed level-50 damage): Gate H false, Gate I false (evasion already 7, not the neutral 6) -- exactly 4 check-viability draws (DRAW SITE 8)", () => {
    const view = evasionUpView(machampAttacker(115), anorithTarget());
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: 1, calls: 0 } });
    expect(phaseDraws(result, "check-bad-move")).toHaveLength(0);
    expect(phaseDraws(result, "try-to-faint")).toHaveLength(0);
    const cvDraws = phaseDraws(result, "check-viability");
    expect(cvDraws).toHaveLength(4);
    expect(cvDraws.every((d) => "kind" in d && d.kind === "evasion-up-roll-8")).toBe(true);
    expect(result.trace.draws).toHaveLength(4 /* setup */ + 4 /* CV roll x4 slots */ + 1 /* tie */);
  });

  it("wiring: the attacker's own maxed EVASION stage reaches the CBM handler through the real dispatcher (mask 1 isolates CheckBadMove: -10 on every slot vs the neutral-stage run; same entry-483/485 wiring-gap precedent -- AI_CV_EvasionUp reads the same stage under mask 7, so mask 1 is required to isolate CBM's own delta)", () => {
    function mask1View(attacker: FactoryAiScoredBattlerView): FactoryAiScoredView {
      const base = evasionUpView(attacker, anorithTarget());
      return Object.freeze({ ...base, factory: Object.freeze({ ...base.factory, factoryWinStreak: 14 }) });
    }
    const neutral = chooseFactoryAiScoredDecision({
      view: mask1View(machampAttacker(115)),
      request: fourSlotRequest,
      rng: { value: 1, calls: 0 },
    });
    const maxed = chooseFactoryAiScoredDecision({
      view: mask1View(Object.freeze({
        ...machampAttacker(115),
        statStages: Object.freeze({ ...NEUTRAL_STAGES, evasion: MAX_STAT_STAGE }),
      })),
      request: fourSlotRequest,
      rng: { value: 1, calls: 0 },
    });
    expect(maxed.trace.mask).toBe(1);
    expect(maxed.trace.executedScoringScripts).toEqual(["check-bad-move"]);
    expect(phaseDraws(maxed, "check-bad-move")).toHaveLength(0);
    expect(maxed.trace.slotScores.map((s) => s.finalScore)).toEqual(
      neutral.trace.slotScores.map((s) => s.finalScore - 10),
    );
  });
});

const MOVE_SWEET_SCENT_MASK7 = 230; // EFFECT_EVASION_DOWN

// docs/factory-ai-checkviability-ground-truth.md §24.2/§24.3's twin fixtures
// (tools/battle-lab/mechanic-factory-ai-cv-evasiondown-{lowhp-reach,
// fullhp-control}-off.json) -- the eleventh CBM-blocked pair's own DOWN half,
// confirmed byte-for-byte the same shape as DefenseDown/SpDefDown (doc
// §24.1), reusing that exact fixture recipe verbatim: opponent (AI_USER) =
// Anorith, all 4 slots MOVE_SWEET_SCENT; target (player) = Machamp, single
// assignable ability Guts. Same live-verified HP endpoints as the
// DefenseDown/SpDefDown/VitalThrow blocks above (22/120=18% seed 1,
// 30/120=25% seed 99 for reach; 120/120=100% for control).
describe("AI_CV_EvasionDown mask-7 fixture reproduction (docs/factory-ai-checkviability-ground-truth.md §24.2/§24.3)", () => {
  function anorithAttacker(hp: number): FactoryAiScoredBattlerView {
    return Object.freeze({
      types: ["TYPE_ROCK", "TYPE_BUG"] as const,
      attack: 115, defense: 70, spAttack: 60, spDefense: 70, speed: 95, level: 50,
      statStages: NEUTRAL_STAGES,
      isFirstTurn: 0,
      hp, maxHp: 120,
    });
  }
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
  function evasionDownView(attacker: FactoryAiScoredBattlerView): FactoryAiScoredView {
    return Object.freeze({
      schema: "factory-ai-scored-view/v1",
      mode: "factory-level-50-singles",
      active: Object.freeze({ aiBattler: 1 as const, targetBattler: 0 as const }),
      factory: Object.freeze({ levelMode: 0 as const, battleMode: 0 as const, factoryWinStreak: 28, trainerOpponentId: 222 }),
      moves: [MOVE_SWEET_SCENT_MASK7, MOVE_SWEET_SCENT_MASK7, MOVE_SWEET_SCENT_MASK7, MOVE_SWEET_SCENT_MASK7] as const,
      attacker,
      target: machampTarget(),
    });
  }
  function phaseDraws(result: ReturnType<typeof chooseFactoryAiScoredDecision>, phase: "check-bad-move" | "try-to-faint" | "check-viability") {
    return result.trace.draws.filter((d) => "phase" in d && d.phase === phase);
  }
  function assertPicksSweetScent(view: FactoryAiScoredView, result: ReturnType<typeof chooseFactoryAiScoredDecision>) {
    expect(result.submission.decision).toMatchObject({ kind: "use-move" });
    if (result.submission.decision.kind === "use-move") {
      expect(view.moves[result.submission.decision.moveSlot]).toBe(MOVE_SWEET_SCENT_MASK7);
    }
  }

  it("reach fixture, seed 1 (Anorith at 22/120 HP = 18%): Gate A true for all 4 identical Sweet Scent slots, exactly 4 check-viability draws, zero CBM/TryToFaint draws, picks Sweet Scent", () => {
    const view = evasionDownView(anorithAttacker(22));
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: 1, calls: 0 } });
    expect(phaseDraws(result, "check-bad-move")).toHaveLength(0);
    expect(phaseDraws(result, "try-to-faint")).toHaveLength(0);
    const cvDraws = phaseDraws(result, "check-viability");
    expect(cvDraws).toHaveLength(4);
    expect(cvDraws.every((d) => "kind" in d && d.kind === "evasion-down-roll")).toBe(true);
    assertPicksSweetScent(view, result);
  });

  it("reach fixture, seed 99 (Anorith at 30/120 HP = 25%): exactly 4 check-viability draws, picks Sweet Scent", () => {
    const view = evasionDownView(anorithAttacker(30));
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: 99, calls: 0 } });
    const cvDraws = phaseDraws(result, "check-viability");
    expect(cvDraws).toHaveLength(4);
    expect(cvDraws.every((d) => "kind" in d && d.kind === "evasion-down-roll")).toBe(true);
    assertPicksSweetScent(view, result);
  });

  it.each([1, 99])("control fixture (Anorith stays at full 120/120 HP -- Gate A false, Gate B true at neutral EVASION stage), seed %i: deterministic zero check-viability draws, picks Sweet Scent", (seed) => {
    const view = evasionDownView(anorithAttacker(120));
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: seed, calls: 0 } });
    expect(phaseDraws(result, "check-bad-move")).toHaveLength(0);
    expect(phaseDraws(result, "try-to-faint")).toHaveLength(0);
    expect(phaseDraws(result, "check-viability")).toHaveLength(0);
    assertPicksSweetScent(view, result);
  });
});

const MOVE_RAIN_DANCE_MASK7 = 240; // EFFECT_RAIN_DANCE
const MOVE_SUNNY_DAY_MASK7 = 241; // EFFECT_SUNNY_DAY
const MOVE_HAIL_MASK7 = 258; // EFFECT_HAIL
const MOVE_GROWL_MASK7 = 45; // EFFECT_ATTACK_DOWN -- zero CBM/CV contribution against this exact pairing (established below)

// docs/factory-ai-checkviability-ground-truth.md §25.4/§25.5: the twelfth
// (and final) CBM-blocked pair -- ALL SIX handlers (3 CBM, 3 CV) are
// 0-if_random, so unlike every prior pair this section's own draw-count
// technique has no signal (a reachable and an unreached branch both draw
// zero from the handler itself, doc §25.4). The only live-observable
// channel is the AI's own final PICK, so these fixtures reproduce that pick
// directly rather than a draw count: opponent (AI_USER) = Anorith (single
// ability Battle Armor -- neither Swift Swim nor Rain Dish, genuinely
// neutral for RainDance's own extra gates too), moveset
// [<weather move>, Growl, Growl, Growl]; target (player) = Shuckle (single
// ability Sturdy, Bug/Rock -- the same pairing §6/§14 already proved a
// zero-baseline Growl control for: CBM's AttackDown gate needs target ATK
// == MIN_STAT_STAGE or ABILITY_HYPER_CUTTER, neither true; CV's AttackDown
// gate matches Shuckle's Bug/Rock physical-type list immediately, zero
// draws either way since Shuckle is single-ability). Anorith faster than
// Shuckle (95 vs 5) means RainDance's own Gate P (if_user_faster) resolves
// deterministically true with zero draws in every fixture below -- the
// hidden tie-break Random() (doc §25.3) and the Swift-Swim/Rain-Dish gates
// are exercised by the handler-level tests above instead (doc §25.6 items
// 1-2, not staged live by the doc's own session either).
// `cbmreach` (weather == the move's own type): CBM fires -8, CV's chain
// excludes the move's own type so it stays 0 -- net -8, AI picks a Growl
// slot (never slot 0). `cvreach` (weather == Sandstorm, common to all three
// handlers' own "other three" list): CBM doesn't match (0), CV matches
// (+1) -- net +1, AI picks slot 0 (the weather move) always, no tie.
// Policy-own draws: every one of these twelve cases is setup(4) + CBM(0,
// single-ability target) + TryToFaint(0, all four moves are 0-power) +
// CV(0, deterministic weather-trio span + zero-draw AttackDown control) +
// tie(1) = 5 -- reconciles cleanly to the doc's own "genuinely 0-if_random"
// finding with zero residual (this section abandoned the draw-count
// channel entirely, so there is no live draw-count window to reconcile
// against beyond confirming the mechanism draws nothing extra).
describe("AI_CV_RainDance / AI_CV_SunnyDay / AI_CV_Hail mask-7 fixture reproduction (docs/factory-ai-checkviability-ground-truth.md §25.4/§25.5)", () => {
  function anorithWeatherAttacker(currentWeather: 0 | 1 | 2 | 3): FactoryAiScoredBattlerView {
    return Object.freeze({
      types: ["TYPE_ROCK", "TYPE_BUG"] as const,
      attack: 115, defense: 70, spAttack: 60, spDefense: 70, speed: 95, level: 50,
      statStages: NEUTRAL_STAGES,
      isFirstTurn: 0,
      hp: 120, maxHp: 120,
      ability: "ABILITY_BATTLE_ARMOR",
      currentWeather,
    });
  }
  function shuckleWeatherTarget(): FactoryAiScoredTargetView {
    return Object.freeze({
      species: 213,
      types: ["TYPE_BUG", "TYPE_ROCK"] as const,
      attack: 10, defense: 230, spAttack: 10, spDefense: 230, speed: 5, level: 50,
      statStages: NEUTRAL_STAGES,
      isFirstTurn: 0,
      hp: 100, maxHp: 100, ability: "ABILITY_STURDY", knownAbility: null,
    });
  }
  function weatherView(weatherMoveId: number, currentWeather: 0 | 1 | 2 | 3): FactoryAiScoredView {
    return Object.freeze({
      schema: "factory-ai-scored-view/v1",
      mode: "factory-level-50-singles",
      active: Object.freeze({ aiBattler: 1 as const, targetBattler: 0 as const }),
      factory: Object.freeze({ levelMode: 0 as const, battleMode: 0 as const, factoryWinStreak: 28, trainerOpponentId: 222 }),
      moves: [weatherMoveId, MOVE_GROWL_MASK7, MOVE_GROWL_MASK7, MOVE_GROWL_MASK7] as const,
      attacker: anorithWeatherAttacker(currentWeather),
      target: shuckleWeatherTarget(),
    });
  }
  function phaseDraws(result: ReturnType<typeof chooseFactoryAiScoredDecision>, phase: "check-bad-move" | "try-to-faint" | "check-viability") {
    return result.trace.draws.filter((d) => "phase" in d && d.phase === phase);
  }

  const AI_WEATHER_SUN = 0 as const;
  const AI_WEATHER_RAIN = 1 as const;
  const AI_WEATHER_SANDSTORM = 2 as const;
  const AI_WEATHER_HAIL = 3 as const;

  const HANDLERS = [
    { label: "raindance", moveId: MOVE_RAIN_DANCE_MASK7, ownWeather: AI_WEATHER_RAIN },
    { label: "sunnyday", moveId: MOVE_SUNNY_DAY_MASK7, ownWeather: AI_WEATHER_SUN },
    { label: "hail", moveId: MOVE_HAIL_MASK7, ownWeather: AI_WEATHER_HAIL },
  ] as const;

  describe.each(HANDLERS)("$label", ({ moveId, ownWeather }) => {
    it.each([1, 99])("cbmreach (weather == own type), seed %i: net -8 (CBM -8, CV 0) -- AI picks a Growl slot, never slot 0, with setup(4)+CBM(0)+TryToFaint(0)+CV(0)+tie(1)=5 total draws", (seed) => {
      const view = weatherView(moveId, ownWeather);
      const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: seed, calls: 0 } });
      expect(phaseDraws(result, "check-bad-move")).toHaveLength(0);
      expect(phaseDraws(result, "try-to-faint")).toHaveLength(0);
      expect(phaseDraws(result, "check-viability")).toHaveLength(0);
      expect(result.trace.draws).toHaveLength(5);
      expect(result.trace.slotScores[0]).toMatchObject({ checkBadMoveDelta: -8, checkViabilityDelta: 0, finalScore: 92 });
      for (const slot of [1, 2, 3]) {
        expect(result.trace.slotScores[slot]).toMatchObject({ checkBadMoveDelta: 0, checkViabilityDelta: 0, finalScore: 100 });
      }
      expect(result.submission.decision).toMatchObject({ kind: "use-move" });
      if (result.submission.decision.kind === "use-move") {
        expect(result.submission.decision.moveSlot).not.toBe(0);
        expect(view.moves[result.submission.decision.moveSlot]).toBe(MOVE_GROWL_MASK7);
      }
    });

    it.each([1, 99])("cvreach (weather == Sandstorm, common to all three handlers' own 'other three'), seed %i: net +1 (CBM 0, CV +1) -- AI always picks slot 0 (the weather move), no tie, with setup(4)+CBM(0)+TryToFaint(0)+CV(0)+tie(1)=5 total draws", (seed) => {
      const view = weatherView(moveId, AI_WEATHER_SANDSTORM);
      const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: seed, calls: 0 } });
      expect(phaseDraws(result, "check-bad-move")).toHaveLength(0);
      expect(phaseDraws(result, "try-to-faint")).toHaveLength(0);
      expect(phaseDraws(result, "check-viability")).toHaveLength(0);
      expect(result.trace.draws).toHaveLength(5);
      expect(result.trace.slotScores[0]).toMatchObject({ checkBadMoveDelta: 0, checkViabilityDelta: 1, finalScore: 101 });
      for (const slot of [1, 2, 3]) {
        expect(result.trace.slotScores[slot]).toMatchObject({ checkBadMoveDelta: 0, checkViabilityDelta: 0, finalScore: 100 });
      }
      expect(result.trace.bestMoveSlots).toEqual([0]);
      expect(result.submission.decision).toMatchObject({ kind: "use-move", moveSlot: 0 });
    });
  });

  it("cross-handler parity (doc §25.1): the three CBM bodies are byte-identical -- each cbmreach fixture's own -8 is bit-for-bit the same magnitude regardless of which handler fires", () => {
    const deltas = HANDLERS.map(({ moveId, ownWeather }) => {
      const view = weatherView(moveId, ownWeather);
      const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: 1, calls: 0 } });
      return result.trace.slotScores[0]!.checkBadMoveDelta;
    });
    expect(deltas).toEqual([-8, -8, -8]);
  });
});

// `get_weather`'s own stale-funcResult bug, Channel 2 (docs/factory-ai-
// checkviability-ground-truth.md §25.10.1/§25.10.3, ISSUES #47): the real
// ROM's `ChooseMoveOrAction_Singles`/`BattleAI_DoAIProcessing`
// (`battle_ai_script_commands.c:395-416,572-616`) runs each `aiLogicId` to
// completion across all 4 movesetIndex slots before advancing -- CBM(0..3),
// then TTF(0..3), then CV(0..3) -- so `AI_TryToFaint`'s own last-processed
// slot's `get_how_powerful_move_is` classification (always
// `MOVE_POWER_OTHER`/Sun for a real power<=1 filler move in the last slot)
// leaks into `AI_CheckViability`'s own FIRST scripted slot's `get_weather`
// read whenever weather is genuinely unset. These three describe blocks
// reproduce the doc's own three staged, live-oracle-verified fixtures'
// mask-7 net scores exactly (species/moveset/ability lifted verbatim from
// `tools/battle-lab/mechanic-factory-ai-hail-staleweather-{collision,
// control}-off.json` and `mechanic-factory-ai-cv-raindance-noraindish-
// stalesun-off.json`; stat fields other than speed/HP are placeholders --
// every candidate move here has power <=1, so `estimateDamage` never runs
// and only speed (Rain Dance's own Gate P) and HP% (the shared weather
// span's own Gate H) are ever read).
describe("get_weather's own stale-funcResult bug, Channel 2: AI_TryToFaint's last-scripted-slot classification leaks into AI_CheckViability's first-scripted-slot get_weather (doc §25.10, ISSUES #47)", () => {
  const MOVE_SPLASH = 150;
  const MOVE_GROWL = 45;

  function huntailAttacker(): FactoryAiScoredBattlerView {
    return Object.freeze({
      types: ["TYPE_WATER", "TYPE_WATER"] as const,
      attack: 100, defense: 100, spAttack: 100, spDefense: 100, speed: 60, level: 50,
      statStages: NEUTRAL_STAGES,
      isFirstTurn: 0,
      hp: 100, maxHp: 100,
      ability: "ABILITY_SWIFT_SWIM",
      currentWeather: undefined,
    });
  }
  function ninjaskTarget(): FactoryAiScoredTargetView {
    return Object.freeze({
      species: 302, // SPECIES_NINJASK: single ability, Speed Boost (id 3 == AI_WEATHER_HAIL)
      types: ["TYPE_BUG", "TYPE_FLYING"] as const,
      attack: 90, defense: 45, spAttack: 50, spDefense: 50, speed: 160, level: 50,
      statStages: NEUTRAL_STAGES,
      isFirstTurn: 0,
      hp: 100, maxHp: 100, ability: "ABILITY_SPEED_BOOST", knownAbility: null,
    });
  }
  function anorithTarget(): FactoryAiScoredTargetView {
    return Object.freeze({
      species: 390, // SPECIES_ANORITH: single ability, Battle Armor (id 4, outside the 0-3 collision range)
      types: ["TYPE_ROCK", "TYPE_BUG"] as const,
      attack: 95, defense: 50, spAttack: 40, spDefense: 50, speed: 75, level: 50,
      statStages: NEUTRAL_STAGES,
      isFirstTurn: 0,
      hp: 100, maxHp: 100, ability: "ABILITY_BATTLE_ARMOR", knownAbility: null,
    });
  }
  function hailView(target: FactoryAiScoredTargetView): FactoryAiScoredView {
    return Object.freeze({
      schema: "factory-ai-scored-view/v1",
      mode: "factory-level-50-singles",
      active: Object.freeze({ aiBattler: 1 as const, targetBattler: 0 as const }),
      factory: Object.freeze({ levelMode: 0 as const, battleMode: 0 as const, factoryWinStreak: 28, trainerOpponentId: 222 }),
      moves: [MOVE_HAIL_MASK7, MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH] as const,
      attacker: huntailAttacker(),
      target,
    });
  }

  it.each([1, 99])("`mechanic-factory-ai-hail-staleweather-collision-off`, seed %i (doc §25.10.2): Huntail's Hail vs weatherless Ninjask -- net -7 (CBM -8 ability-id collision + TTF 0 + CV +1 stale-Sun carry), Hail must never win turn 1", (seed) => {
    const view = hailView(ninjaskTarget());
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: seed, calls: 0 } });
    expect(result.trace.slotScores[0]).toMatchObject({
      checkBadMoveDelta: -8,
      tryToFaintDelta: 0,
      checkViabilityDelta: 1,
      finalScore: 93,
    });
    expect(result.trace.bestMoveSlots).not.toContain(0);
    expect(result.submission.decision).toMatchObject({ kind: "use-move" });
    if (result.submission.decision.kind === "use-move") {
      expect(view.moves[result.submission.decision.moveSlot]).toBe(MOVE_SPLASH);
    }
  });

  it.each([1, 99])("`mechanic-factory-ai-hail-staleweather-control-off`, seed %i (doc §25.10.2): Huntail's Hail vs weatherless Anorith (id 4, outside the collision range, CBM channel silenced) -- net +1 (CV's stale-Sun carry alone), Hail must always win turn 1", (seed) => {
    const view = hailView(anorithTarget());
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: seed, calls: 0 } });
    expect(result.trace.slotScores[0]).toMatchObject({
      checkBadMoveDelta: 0,
      tryToFaintDelta: 0,
      checkViabilityDelta: 1,
      finalScore: 101,
    });
    expect(result.trace.bestMoveSlots).toEqual([0]);
    expect(result.submission.decision).toMatchObject({ kind: "use-move", moveSlot: 0 });
  });

  it.each([1, 99])("`mechanic-factory-ai-cv-raindance-noraindish-stalesun-off`, seed %i (doc §25.10.2): Lotad (Swift Swim, abilitySlot 0, speed 50 -- user-faster over Shuckle's 25, so Gate P skips Gate S/Rain Dish entirely) Rain Dance vs Shuckle -- net +1 (CV's stale-Sun carry at Gate W2, before Gate R's own tail is ever reached), Rain Dance must win turn 1 despite having no Rain Dish", (seed) => {
    const view: FactoryAiScoredView = Object.freeze({
      schema: "factory-ai-scored-view/v1",
      mode: "factory-level-50-singles",
      active: Object.freeze({ aiBattler: 1 as const, targetBattler: 0 as const }),
      factory: Object.freeze({ levelMode: 0 as const, battleMode: 0 as const, factoryWinStreak: 28, trainerOpponentId: 222 }),
      moves: [MOVE_RAIN_DANCE_MASK7, MOVE_GROWL, MOVE_GROWL, MOVE_GROWL] as const,
      attacker: Object.freeze({
        types: ["TYPE_WATER", "TYPE_GRASS"] as const, // SPECIES_LOTAD
        attack: 30, defense: 30, spAttack: 40, spDefense: 50, speed: 50, level: 50,
        statStages: NEUTRAL_STAGES,
        isFirstTurn: 0,
        hp: 100, maxHp: 100,
        ability: "ABILITY_SWIFT_SWIM", // abilitySlot 0, NOT Rain Dish (abilitySlot 1)
        currentWeather: undefined,
      }),
      target: Object.freeze({
        species: 213, // SPECIES_SHUCKLE: single ability, Sturdy (id 5, outside the collision range)
        types: ["TYPE_BUG", "TYPE_ROCK"] as const,
        attack: 10, defense: 230, spAttack: 10, spDefense: 230, speed: 25, level: 50,
        statStages: NEUTRAL_STAGES,
        isFirstTurn: 0,
        hp: 100, maxHp: 100, ability: "ABILITY_STURDY", knownAbility: null,
      }),
    });
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: seed, calls: 0 } });
    expect(result.trace.slotScores[0]).toMatchObject({
      checkBadMoveDelta: 0,
      tryToFaintDelta: 0,
      checkViabilityDelta: 1,
      finalScore: 101,
    });
    expect(result.trace.bestMoveSlots).toEqual([0]);
    expect(result.submission.decision).toMatchObject({ kind: "use-move", moveSlot: 0 });
  });
});

// ISSUES #47's movesetIndex-1-3 remainder (doc §27): Channel 2's carry no
// longer stops dead at the CV pass's own first scripted slot -- it's
// simulated value-level, slot by slot, across the WHOLE pass per §27.1's
// exhaustive per-handler funcResult write audit. These two blocks reproduce
// doc §27's own two live-oracle-staged fixtures exactly
// (`tools/battle-lab/mechanic-factory-ai-cv-hail-movesetindex1-{writesnever-
// carry,writesalways-clean}-off.json`) -- both place MOVE_HAIL at moveset
// index 1, one behind a writes-never predecessor (AI_CV_SpeedDown, doc §27.1
// handler 1) and one behind a writes-always predecessor (AI_CV_AttackDown,
// handler 7). Species/moveset/stats lifted verbatim from doc §27.2 -- same
// Dugtrio (AI_USER, base Speed 120)/Shuckle (target, base Speed 5, Bug/Rock,
// Sturdy) matchup this doc's own §6/§9/§14.5 fixtures already established.
describe("get_weather's own stale-funcResult carry surviving an intervening CV-pass slot, Channel 2 value-level propagation (doc §27, ISSUES #47)", () => {
  const MOVE_STRING_SHOT_IDX1 = 81; // EFFECT_SPEED_DOWN -- writes-never predecessor (doc §27.1 handler 1)
  const MOVE_GROWL_IDX1 = 45; // EFFECT_ATTACK_DOWN -- writes-always predecessor (doc §27.1 handler 7)
  const MOVE_HAIL_IDX1 = 258; // EFFECT_HAIL, at movesetIndex 1 in both fixtures below
  const MOVE_SPLASH_IDX1 = 150;

  const DUGTRIO = Object.freeze({
    types: ["TYPE_GROUND", "TYPE_GROUND"] as const,
    attack: 80, defense: 50, spAttack: 50, spDefense: 70, speed: 120, level: 50,
    statStages: NEUTRAL_STAGES,
    isFirstTurn: 2,
    hp: 100, maxHp: 100,
  });
  const SHUCKLE = Object.freeze({
    types: ["TYPE_BUG", "TYPE_ROCK"] as const,
    attack: 10, defense: 230, spAttack: 10, spDefense: 230, speed: 5, level: 50,
    statStages: NEUTRAL_STAGES,
    isFirstTurn: 2,
    hp: 100, maxHp: 100,
  });
  function shuckleTarget(): FactoryAiScoredTargetView {
    return Object.freeze({ species: 213, ...SHUCKLE, ability: "ABILITY_STURDY", knownAbility: null });
  }
  function movesetIndex1View(moveset: readonly [number, number, number, number]): FactoryAiScoredView {
    return Object.freeze({
      schema: "factory-ai-scored-view/v1",
      mode: "factory-level-50-singles",
      active: Object.freeze({ aiBattler: 1 as const, targetBattler: 0 as const }),
      factory: Object.freeze({ levelMode: 0 as const, battleMode: 0 as const, factoryWinStreak: 28, trainerOpponentId: 222 }),
      moves: moveset,
      attacker: DUGTRIO,
      target: shuckleTarget(),
    });
  }

  it.each([1, 99])("`mechanic-factory-ai-cv-hail-movesetindex1-writesnever-carry-off`, seed %i (doc §27.2/§27.4): AI_CV_SpeedDown's own -3 branch never writes funcResult, so the TTF-pass exit (Sun, from the 0-power filler slots) is still sitting there when Hail's own get_weather reads it at index 1 -- net -3/+1/0/0, Hail must win turn 1 deterministically, NO tie", (seed) => {
    const view = movesetIndex1View([MOVE_STRING_SHOT_IDX1, MOVE_HAIL_IDX1, MOVE_SPLASH_IDX1, MOVE_SPLASH_IDX1]);
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: seed, calls: 0 } });
    expect(result.trace.slotScores.map((s) => s.checkViabilityDelta)).toEqual([-3, 1, 0, 0]);
    expect(result.trace.slotScores.map((s) => s.finalScore)).toEqual([97, 101, 100, 100]);
    expect(result.trace.bestMoveSlots).toEqual([1]);
    expect(result.submission.decision).toMatchObject({ kind: "use-move", moveSlot: 1 });
  });

  it.each([1, 99])("`mechanic-factory-ai-cv-hail-movesetindex1-writesalways-clean-off`, seed %i (doc §27.2/§27.4): AI_CV_AttackDown's own Gates E/F ALWAYS write funcResult = target type1 (TYPE_BUG, outside the AI_WEATHER_* 0-3 collision range) before Hail's own get_weather reads it at index 1 -- the TTF-pass carry is already destroyed, net 0/0/0/0, a genuine 4-way tie, Hail's own slot never scores above the other three", (seed) => {
    const view = movesetIndex1View([MOVE_GROWL_IDX1, MOVE_HAIL_IDX1, MOVE_SPLASH_IDX1, MOVE_SPLASH_IDX1]);
    const result = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: seed, calls: 0 } });
    expect(result.trace.slotScores.map((s) => s.checkViabilityDelta)).toEqual([0, 0, 0, 0]);
    expect(result.trace.slotScores.map((s) => s.finalScore)).toEqual([100, 100, 100, 100]);
    expect(result.trace.bestMoveSlots).toEqual([0, 1, 2, 3]);
    expect(result.trace.tie.modulus).toBe(4);
  });

  it("this fixture's own tie-break ledger, banked (not a claim about the real ROM's own RNG stream, only this deterministic simulation's): seed 1 lands on slot 3, seed 99 lands on slot 1 -- Hail winning here is a property of a genuinely fair 4-way tie, not evidence against the writes-always classification (doc §27.3 draws the same conclusion from the real oracle's own two different seeds landing on two different non-Hail slots)", () => {
    const view = movesetIndex1View([MOVE_GROWL_IDX1, MOVE_HAIL_IDX1, MOVE_SPLASH_IDX1, MOVE_SPLASH_IDX1]);
    const seed1 = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: 1, calls: 0 } });
    expect(seed1.trace.tie.index).toBe(3);
    const seed99 = chooseFactoryAiScoredDecision({ view, request: fourSlotRequest, rng: { value: 99, calls: 0 } });
    expect(seed99.trace.tie.index).toBe(1);
  });
});

// Live-wiring receipts for the five handler-input fields the pass-3
// CheckViability adapter must populate (PROGRESS.md entry 1004). These drive
// `chooseFactoryAiScoredDecision` -- NOT the handlers directly -- so a wiring
// regression (a field read by a handler but never populated by the adapter)
// fails loudly. Direct-handler tests cannot catch that class.
const MOVE_BRICK_BREAK_MASK7 = 280; // EFFECT_BRICK_BREAK -- AI_CV_BrickBreak's single target-side Reflect gate
const MOVE_FACADE_MASK7 = 263; // EFFECT_FACADE -- AI_CV_Facade's target-status1 mask
const MOVE_FOCUS_PUNCH_MASK7 = 264; // EFFECT_FOCUS_PUNCH -- AI_CV_FocusPunch3's AI_USER substitute tail
const MOVE_SLEEP_TALK_MASK7 = 214; // EFFECT_SLEEP_TALK -- AI_CV_SleepTalk's AI_USER-status1 gate

function cvWiringView(
  moveId: number,
  targetOverrides: Record<string, unknown>,
  attackerOverrides: Record<string, unknown> = {},
): FactoryAiScoredView {
  return Object.freeze({
    schema: "factory-ai-scored-view/v1",
    mode: "factory-level-50-singles",
    active: Object.freeze({ aiBattler: 1 as const, targetBattler: 0 as const }),
    factory: Object.freeze({
      levelMode: 0 as const,
      battleMode: 0 as const,
      factoryWinStreak: 28,
      trainerOpponentId: 222,
    }),
    moves: [moveId, MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH] as const,
    attacker: Object.freeze({ ...ALAKAZAM, ...attackerOverrides }),
    target: Object.freeze({ ...marowak(5), ...targetOverrides }),
  });
}

describe("pass-3 CheckViability adapter populates the five handler-input fields end to end", () => {
  it("hasSideReflect: view.targetSideReflectUp=true reaches AI_CV_BrickBreak's target-side gate (+1), false stays 0", () => {
    const up = chooseFactoryAiScoredDecision({
      view: cvWiringView(MOVE_BRICK_BREAK_MASK7, { targetSideReflectUp: true }),
      request: fourSlotRequest,
      rng: { value: 1, calls: 0 },
    });
    expect(up.trace.slotScores[0]).toMatchObject({ checkViabilityDelta: 1 });

    const down = chooseFactoryAiScoredDecision({
      view: cvWiringView(MOVE_BRICK_BREAK_MASK7, {}),
      request: fourSlotRequest,
      rng: { value: 1, calls: 0 },
    });
    expect(down.trace.slotScores[0]).toMatchObject({ checkViabilityDelta: 0 });
  });

  it.each([
    ["isPoisoned", { isPoisoned: true }],
    ["isBurned", { isBurned: true }],
    ["isParalyzed", { isParalyzed: true }],
  ] as const)("AI_CV_Facade's target-status1 mask: %s=true through the adapter scores +1, absent scores 0", (_field, targetOverrides) => {
    const statused = chooseFactoryAiScoredDecision({
      view: cvWiringView(MOVE_FACADE_MASK7, targetOverrides),
      request: fourSlotRequest,
      rng: { value: 1, calls: 0 },
    });
    expect(statused.trace.slotScores[0]).toMatchObject({ checkViabilityDelta: 1 });

    const clean = chooseFactoryAiScoredDecision({
      view: cvWiringView(MOVE_FACADE_MASK7, {}),
      request: fourSlotRequest,
      rng: { value: 1, calls: 0 },
    });
    expect(clean.trace.slotScores[0]).toMatchObject({ checkViabilityDelta: 0 });
  });

  it("hasSubstitute: view.attacker.hasSubstitute=true reaches AI_CV_FocusPunch3's AI_USER substitute tail (+5 vs +1)", () => {
    const withSub = cvWiringView(MOVE_FOCUS_PUNCH_MASK7, { isInfatuated: true }, { hasSubstitute: true });
    const withoutSub = cvWiringView(MOVE_FOCUS_PUNCH_MASK7, { isInfatuated: true }, {});
    // The FocusPunch3 roll (jump prob 100/256) gates the +5/+1 tail, so pick
    // the first seed whose roll falls through (succeeded) for the with-sub
    // view, then assert the identical-seed without-sub view scores +1.
    let foundValue: number | null = null;
    for (let v = 1; v <= 256; v += 1) {
      const result = chooseFactoryAiScoredDecision({
        view: withSub,
        request: fourSlotRequest,
        rng: { value: v, calls: 0 },
      });
      if (result.trace.slotScores[0]!.checkViabilityDelta === 5) {
        foundValue = v;
        break;
      }
    }
    expect(foundValue).not.toBeNull();
    const without = chooseFactoryAiScoredDecision({
      view: withoutSub,
      request: fourSlotRequest,
      rng: { value: foundValue!, calls: 0 },
    });
    expect(without.trace.slotScores[0]).toMatchObject({ checkViabilityDelta: 1 });
  });

  it("AI_CV_SleepTalk's AI_USER-status1 gate reads the attacker's own isAsleep through the adapter (+10 asleep, -5 awake)", () => {
    const asleep = chooseFactoryAiScoredDecision({
      view: cvWiringView(MOVE_SLEEP_TALK_MASK7, {}, { isAsleep: true }),
      request: fourSlotRequest,
      rng: { value: 1, calls: 0 },
    });
    expect(asleep.trace.slotScores[0]).toMatchObject({ checkViabilityDelta: 10 });

    const awake = chooseFactoryAiScoredDecision({
      view: cvWiringView(MOVE_SLEEP_TALK_MASK7, {}, {}),
      request: fourSlotRequest,
      rng: { value: 1, calls: 0 },
    });
    expect(awake.trace.slotScores[0]).toMatchObject({ checkViabilityDelta: -5 });
  });
});

describe("AI_CV_Encore/HealBell new-field wiring through the adapter", () => {
  const MOVE_ENCORE_MASK7 = 227; // EFFECT_ENCORE
  const MOVE_HEAL_BELL_MASK7 = 215; // EFFECT_HEAL_BELL

  it("anyMoveDisabled: view.target.anyMoveDisabled=true jumps Encore's last-move gate (+3 roll, +3 on fall-through)", () => {
    // seed 1 -> %256=198 >= 30 FALL-THROUGH +3.
    const disabled = chooseFactoryAiScoredDecision({
      view: cvWiringView(MOVE_ENCORE_MASK7, { anyMoveDisabled: true }),
      request: fourSlotRequest,
      rng: { value: 1, calls: 0 },
    });
    expect(disabled.trace.slotScores[0]).toMatchObject({ checkViabilityDelta: 3 });

    // absent -> target faster? no (marowak target outspeeds the alakazam
    // attacker? attacker=alakazam, target=marowak level 5). Without a
    // disabled move the last-move gate decides: marowak's last move is
    // outside the encouraged table, so the deterministic -2.
    const absent = chooseFactoryAiScoredDecision({
      view: cvWiringView(MOVE_ENCORE_MASK7, {}),
      request: fourSlotRequest,
      rng: { value: 1, calls: 0 },
    });
    expect(absent.trace.slotScores[0]).toMatchObject({ checkViabilityDelta: -2 });
  });

  it("targetPartyStatusEqualsAny: view.target.targetPartyStatusEqualsAny=true is HealBell's clean zero, absent is -5", () => {
    const party = chooseFactoryAiScoredDecision({
      view: cvWiringView(MOVE_HEAL_BELL_MASK7, { targetPartyStatusEqualsAny: true }),
      request: fourSlotRequest,
      rng: { value: 1, calls: 0 },
    });
    expect(party.trace.slotScores[0]).toMatchObject({ checkViabilityDelta: 0 });

    const clean = chooseFactoryAiScoredDecision({
      view: cvWiringView(MOVE_HEAL_BELL_MASK7, {}),
      request: fourSlotRequest,
      rng: { value: 1, calls: 0 },
    });
    expect(clean.trace.slotScores[0]).toMatchObject({ checkViabilityDelta: -5 });
  });

  it("hasAnyStatus: view.target.hasAnyStatus=true reaches AI_CV_Substitute5's statused-target zero, absent reaches the +1 roll", () => {
    const MOVE_SUBSTITUTE_MASK7 = 164; // EFFECT_SUBSTITUTE
    // Target's last move drives the Substitute5 gate: give the marowak target
    // a status-inducing last move (EFFECT_TOXIC, MOVE_TOXIC 92) so a
    // statused target ends at zero and a clean one rolls the +1. The adapter
    // burns RNG in the setup-simulated-rng + TryToFaint passes before the CV
    // roll, so scan for a seed whose roll-4 falls through (>= 100).
    const cleanView = cvWiringView(MOVE_SUBSTITUTE_MASK7, { lastUsedMoveId: 92 });
    let foundValue: number | null = null;
    for (let v = 1; v <= 256; v += 1) {
      const result = chooseFactoryAiScoredDecision({
        view: cleanView,
        request: fourSlotRequest,
        rng: { value: v, calls: 0 },
      });
      if (result.trace.slotScores[0]!.checkViabilityDelta === 1) {
        foundValue = v;
        break;
      }
    }
    expect(foundValue).not.toBeNull();
    const statused = chooseFactoryAiScoredDecision({
      view: cvWiringView(MOVE_SUBSTITUTE_MASK7, { lastUsedMoveId: 92, hasAnyStatus: true }),
      request: fourSlotRequest,
      rng: { value: foundValue!, calls: 0 },
    });
    expect(statused.trace.slotScores[0]).toMatchObject({ checkViabilityDelta: 0 });

    const clean = chooseFactoryAiScoredDecision({
      view: cleanView,
      request: fourSlotRequest,
      rng: { value: foundValue!, calls: 0 },
    });
    expect(clean.trace.slotScores[0]).toMatchObject({ checkViabilityDelta: 1 });
  });
});
