import { describe, expect, it } from "vitest";
import { runCheckViability } from "../src/engine/factoryAiCheckViability.ts";

const MOVE_SURF = 57; // EFFECT_HIT -- no if_effect table entry
const MOVE_ROCK_SLIDE = 157; // EFFECT_FLINCH_HIT -- no entry
const MOVE_BODY_SLAM = 34; // EFFECT_PARALYZE_HIT -- no entry
const MOVE_THUNDERBOLT = 85; // EFFECT_PARALYZE_HIT -- no entry
const MOVE_HAZE = 114; // EFFECT_HAZE -- has an entry (AI_CV_Haze, not ported)
const MOVE_TOXIC = 92; // EFFECT_TOXIC -- has an entry (AI_CV_Toxic, not ported)

// Neutral speed/stage battlers for the tests above that don't exercise
// AI_CV_SpeedDown -- the describe block below owns that handler's own battlers.
// types/isFirstTurn/evasionStage/accStage/hp/maxHp are irrelevant to these
// no-table-entry/barrier cases but required by the widened battler shape
// (entry 466 added isFirstTurn, entry 467 added evasionStage/accStage, this
// entry adds hp/maxHp).
const NEUTRAL_BATTLER = Object.freeze({
  speed: 100,
  speedStage: 6,
  types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
  isFirstTurn: 0,
  evasionStage: 6,
  accStage: 6,
  atkStage: 6,
  defStage: 6,
  spDefStage: 6,
  hp: 100,
  maxHp: 100,
});

function run(rng: { value: number; calls: number }, moveId: number) {
  return runCheckViability({
    rng,
    moveId,
    attacker: NEUTRAL_BATTLER,
    target: NEUTRAL_BATTLER,
    drawOrdinalStart: 1,
    reasonPrefix: "test-slot",
  });
}

describe("AI_CheckViability dispatch shell (docs/factory-ai-ground-truth.md §4 item 5)", () => {
  it.each([
    ["Surf (EFFECT_HIT)", MOVE_SURF],
    ["Rock Slide (EFFECT_FLINCH_HIT)", MOVE_ROCK_SLIDE],
    ["Body Slam (EFFECT_PARALYZE_HIT)", MOVE_BODY_SLAM],
    ["Thunderbolt (EFFECT_PARALYZE_HIT)", MOVE_THUNDERBOLT],
  ])("falls through to zero score/zero draws for a no-table-entry move: %s", (_label, moveId) => {
    const rng = { value: 12345, calls: 0 };
    const result = run(rng, moveId);
    expect(result).toEqual({ kind: "scored", rng, draws: [], scoreDelta: 0 });
  });

  it("halts with a named unsupported-branch barrier for a move whose effect has an if_effect table entry", () => {
    const result = run({ value: 1, calls: 0 }, MOVE_HAZE);
    expect(result).toEqual({
      kind: "unsupported-branch",
      barrier: "factory-ai-check-viability",
      effect: "EFFECT_HAZE",
      moveId: MOVE_HAZE,
    });
  });

  it("barriers a second, unrelated effect too (table is source-complete, not a single hardcoded case)", () => {
    const result = run({ value: 1, calls: 0 }, MOVE_TOXIC);
    expect(result).toEqual({
      kind: "unsupported-branch",
      barrier: "factory-ai-check-viability",
      effect: "EFFECT_TOXIC",
      moveId: MOVE_TOXIC,
    });
  });
});

const MOVE_STRING_SHOT = 81; // EFFECT_SPEED_DOWN
const MOVE_COTTON_SPORE = 178; // EFFECT_SPEED_DOWN_2 -- same handler, different table entry

// data/battle_ai_scripts.s:1142-1152, docs/factory-ai-checkviability-ground-truth.md §6.
describe("AI_CV_SpeedDown (docs/factory-ai-checkviability-ground-truth.md §6)", () => {
  const SPEED_BATTLER_EXTRAS = Object.freeze({
    types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
    isFirstTurn: 0,
    evasionStage: 6,
    accStage: 6,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
    hp: 100,
    maxHp: 100,
  });
  const FASTER_USER = Object.freeze({ speed: 120, speedStage: 6, ...SPEED_BATTLER_EXTRAS }); // AI_USER faster -> target NOT faster
  const SLOWER_USER = Object.freeze({ speed: 5, speedStage: 6, ...SPEED_BATTLER_EXTRAS }); // AI_USER slower -> target faster
  const FASTER_TARGET = Object.freeze({ speed: 120, speedStage: 6, ...SPEED_BATTLER_EXTRAS });
  const SLOWER_TARGET = Object.freeze({ speed: 5, speedStage: 6, ...SPEED_BATTLER_EXTRAS });

  it("scores a deterministic -3 with zero draws when the target is not faster (if_target_faster false)", () => {
    const rng = { value: 249_678_687, calls: 0 };
    const result = runCheckViability({
      rng,
      moveId: MOVE_STRING_SHOT,
      attacker: FASTER_USER,
      target: SLOWER_TARGET,
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result).toEqual({ kind: "scored", rng, draws: [], scoreDelta: -3 });
  });

  it("EFFECT_SPEED_DOWN_2 dispatches through the identical handler", () => {
    const rng = { value: 249_678_687, calls: 0 };
    const result = runCheckViability({
      rng,
      moveId: MOVE_COTTON_SPORE,
      attacker: FASTER_USER,
      target: SLOWER_TARGET,
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result).toEqual({ kind: "scored", rng, draws: [], scoreDelta: -3 });
  });

  it("draws exactly one if_random_less_than 70 roll and scores 0 when the target is faster and the roll is < 70", () => {
    // seed 4 -> randomValue 1817>>16&0xffff=... % 256 = 25 (< 70).
    const result = runCheckViability({
      rng: { value: 4, calls: 0 },
      moveId: MOVE_STRING_SHOT,
      attacker: SLOWER_USER,
      target: FASTER_TARGET,
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result.kind).toBe("scored");
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.scoreDelta).toBe(0);
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "speed-down-roll", succeeded: false });
    expect(result.rng.calls).toBe(1);
  });

  it("draws exactly one if_random_less_than 70 roll and scores +2 when the target is faster and the roll is >= 70", () => {
    // seed 1 -> randomValue 16838 % 256 = 198 (>= 70).
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_STRING_SHOT,
      attacker: SLOWER_USER,
      target: FASTER_TARGET,
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result.kind).toBe("scored");
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.scoreDelta).toBe(2);
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "speed-down-roll", succeeded: true });
  });

  it("an exact speed tie still burns GetWhoStrikesFirst's own Random() call, but never takes the target-faster branch (Cmd_if_user_goes matches strikesFirst===1 exactly, a tie can only resolve to 0 or 2)", () => {
    const TIED = Object.freeze({ speed: 100, speedStage: 6, ...SPEED_BATTLER_EXTRAS });
    // seed 3 -> tie-roll randomValue 50515 is ODD -> GetWhoStrikesFirst's own
    // `Random() & 1` tie-break would read as "battler2/target strikes" (2),
    // which if_target_faster's `== 1` check still treats as NOT faster.
    const oddTie = runCheckViability({
      rng: { value: 3, calls: 0 },
      moveId: MOVE_STRING_SHOT,
      attacker: TIED,
      target: TIED,
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(oddTie.kind).toBe("scored");
    if (oddTie.kind !== "scored") throw new Error("unreachable");
    expect(oddTie.scoreDelta).toBe(-3);
    expect(oddTie.draws).toHaveLength(1);
    expect(oddTie.draws[0]).toMatchObject({ kind: "target-faster-tie", strikesFirst: 2 });
    expect(oddTie.rng.calls).toBe(1);

    // seed 8 -> tie-roll randomValue 3634 is EVEN -> strikesFirst stays 0.
    const evenTie = runCheckViability({
      rng: { value: 8, calls: 0 },
      moveId: MOVE_STRING_SHOT,
      attacker: TIED,
      target: TIED,
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(evenTie.kind).toBe("scored");
    if (evenTie.kind !== "scored") throw new Error("unreachable");
    expect(evenTie.scoreDelta).toBe(-3);
    expect(evenTie.draws).toHaveLength(1);
    expect(evenTie.draws[0]).toMatchObject({ kind: "target-faster-tie", strikesFirst: 0 });
  });

  it("still barriers every other reachable CV handler untouched by this narrowing (pass-through)", () => {
    const result = run({ value: 1, calls: 0 }, MOVE_HAZE);
    expect(result).toMatchObject({ kind: "unsupported-branch", effect: "EFFECT_HAZE" });
  });
});

const MOVE_PURSUIT = 228; // EFFECT_PURSUIT

/** Speed/speedStage/evasionStage/accStage/hp/maxHp are irrelevant to AI_CV_Pursuit -- fixed dummy values, only `types`/`isFirstTurn` vary per test. */
function pursuitBattler(types: readonly [string, string], isFirstTurn: number) {
  return Object.freeze({ speed: 100, speedStage: 6, types, isFirstTurn, evasionStage: 6, accStage: 6, atkStage: 6, defStage: 6, spDefStage: 6, hp: 100, maxHp: 100 });
}

// data/battle_ai_scripts.s:2018-2036, docs/factory-ai-checkviability-ground-truth.md §11.1.
describe("AI_CV_Pursuit (docs/factory-ai-checkviability-ground-truth.md §11.1)", () => {
  const ATTACKER_UNUSED_TYPES = ["TYPE_DARK", "TYPE_DARK"] as const; // AI_CV_Pursuit never reads the attacker's own types

  it("turn 1 (isFirstTurn=2): deterministic zero draws/score, even against a Ghost/Psychic target", () => {
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_PURSUIT,
      attacker: pursuitBattler(ATTACKER_UNUSED_TYPES, 2),
      target: pursuitBattler(["TYPE_GHOST", "TYPE_PSYCHIC"], 0),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result).toMatchObject({ kind: "scored", draws: [], scoreDelta: 0 });
  });

  it("turn 2 (isFirstTurn=1): still deterministic zero draws/score against a Ghost target", () => {
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_PURSUIT,
      attacker: pursuitBattler(ATTACKER_UNUSED_TYPES, 1),
      target: pursuitBattler(["TYPE_GHOST", "TYPE_NORMAL"], 0),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result).toMatchObject({ kind: "scored", draws: [], scoreDelta: 0 });
  });

  it("turn 3+ (isFirstTurn=0) against a target with neither Ghost nor Psychic typing: zero draws/score (goto End)", () => {
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_PURSUIT,
      attacker: pursuitBattler(ATTACKER_UNUSED_TYPES, 0),
      target: pursuitBattler(["TYPE_NORMAL", "TYPE_NORMAL"], 0),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result).toMatchObject({ kind: "scored", draws: [], scoreDelta: 0 });
  });

  it.each([
    ["type1 == GHOST", ["TYPE_GHOST", "TYPE_NORMAL"] as const],
    ["type1 == PSYCHIC", ["TYPE_PSYCHIC", "TYPE_NORMAL"] as const],
    ["type2 == GHOST", ["TYPE_NORMAL", "TYPE_GHOST"] as const],
    ["type2 == PSYCHIC", ["TYPE_NORMAL", "TYPE_PSYCHIC"] as const],
  ])("turn 3+ (isFirstTurn=0), %s: reaches AI_CV_Pursuit2 and draws exactly once", (_label, targetTypes) => {
    // seed 3 -> randomValue 50515 % 256 = 83 (< 128, jumps to End, no bonus).
    const result = runCheckViability({
      rng: { value: 3, calls: 0 },
      moveId: MOVE_PURSUIT,
      attacker: pursuitBattler(ATTACKER_UNUSED_TYPES, 0),
      target: pursuitBattler(targetTypes, 0),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result.kind).toBe("scored");
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.scoreDelta).toBe(0);
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "pursuit-roll", succeeded: false });
    expect(result.rng.calls).toBe(1);
  });

  it("if_random_less_than 128 roll >= 128: falls through to score +1, exactly one draw", () => {
    // seed 1 -> randomValue 16838 % 256 = 198 (>= 128).
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_PURSUIT,
      attacker: pursuitBattler(ATTACKER_UNUSED_TYPES, 0),
      target: pursuitBattler(["TYPE_GHOST", "TYPE_NORMAL"], 0),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result.kind).toBe("scored");
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.scoreDelta).toBe(1);
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "pursuit-roll", succeeded: true });
  });

  it("still barriers every other reachable CV handler untouched by this narrowing (pass-through)", () => {
    const result = run({ value: 1, calls: 0 }, MOVE_TOXIC);
    expect(result).toMatchObject({ kind: "unsupported-branch", effect: "EFFECT_TOXIC" });
  });
});

const MOVE_SLASH = 163; // EFFECT_HIGH_CRITICAL, TYPE_NORMAL
const MOVE_KARATE_CHOP = 2; // EFFECT_HIGH_CRITICAL, TYPE_FIGHTING
const MOVE_BLAZE_KICK = 299; // EFFECT_BLAZE_KICK, TYPE_FIRE
const MOVE_POISON_TAIL = 342; // EFFECT_POISON_TAIL, TYPE_POISON

/** isFirstTurn/evasionStage/accStage/hp/maxHp are irrelevant to AI_CV_HighCrit -- fixed dummy values, only `types` vary per test. */
function highCritBattler(types: readonly [string, string]) {
  return Object.freeze({ speed: 100, speedStage: 6, types, isFirstTurn: 0, evasionStage: 6, accStage: 6, atkStage: 6, defStage: 6, spDefStage: 6, hp: 100, maxHp: 100 });
}

// data/battle_ai_scripts.s:1449-1461, docs/factory-ai-checkviability-ground-truth.md §11.2.
describe("AI_CV_HighCrit (docs/factory-ai-checkviability-ground-truth.md §11.2)", () => {
  it("exactly 0.25x (no STAB, double 0.5x resist): deterministic zero draws/score", () => {
    // Slash (Normal) vs Rock+Steel: 40 * 5/10 * 5/10 = 10 = AI_EFFECTIVENESS_x0_25, direct match.
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_SLASH,
      attacker: highCritBattler(["TYPE_PSYCHIC", "TYPE_PSYCHIC"]),
      target: highCritBattler(["TYPE_ROCK", "TYPE_STEEL"]),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result).toMatchObject({ kind: "scored", draws: [], scoreDelta: 0 });
  });

  it("exactly 0.5x (no STAB, single 0.5x resist -- Onix's real Rock/Ground typing): deterministic zero draws/score", () => {
    // Slash (Normal) vs Rock+Ground: 40 * 5/10 = 20 = AI_EFFECTIVENESS_x0_5, direct match (Ground has no entry, stays 1x).
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_SLASH,
      attacker: highCritBattler(["TYPE_PSYCHIC", "TYPE_PSYCHIC"]),
      target: highCritBattler(["TYPE_ROCK", "TYPE_GROUND"]),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result).toMatchObject({ kind: "scored", draws: [], scoreDelta: 0 });
  });

  it("0.5x via the STAB magic-number remap (60*5/10=30 -> AI_EFFECTIVENESS_x0_5): deterministic zero draws/score", () => {
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_SLASH,
      attacker: highCritBattler(["TYPE_NORMAL", "TYPE_NORMAL"]), // STAB
      target: highCritBattler(["TYPE_ROCK", "TYPE_GROUND"]),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result).toMatchObject({ kind: "scored", draws: [], scoreDelta: 0 });
  });

  it("0.25x via the STAB magic-number remap (60*5/10*5/10=15 -> AI_EFFECTIVENESS_x0_25): deterministic zero draws/score", () => {
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_SLASH,
      attacker: highCritBattler(["TYPE_NORMAL", "TYPE_NORMAL"]), // STAB
      target: highCritBattler(["TYPE_ROCK", "TYPE_STEEL"]),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result).toMatchObject({ kind: "scored", draws: [], scoreDelta: 0 });
  });

  it("exactly 2x (no STAB, single weak, direct match): jumps straight to AI_CV_HighCrit2, roll < 128 -> zero score, one draw", () => {
    // Karate Chop (Fighting) vs Normal (dedup'd Normal/Normal): 40 * 20/10 = 80 = AI_EFFECTIVENESS_x2.
    // seed 3 -> randomValue 50515 % 256 = 83 (< 128).
    const result = runCheckViability({
      rng: { value: 3, calls: 0 },
      moveId: MOVE_KARATE_CHOP,
      attacker: highCritBattler(["TYPE_WATER", "TYPE_WATER"]),
      target: highCritBattler(["TYPE_NORMAL", "TYPE_NORMAL"]),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result.kind).toBe("scored");
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.scoreDelta).toBe(0);
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "high-crit-roll", succeeded: false });
    expect(result.rng.calls).toBe(1);
  });

  it("exactly 2x, roll >= 128 -> score +1, one draw", () => {
    // seed 1 -> randomValue 16838 % 256 = 198 (>= 128).
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_KARATE_CHOP,
      attacker: highCritBattler(["TYPE_WATER", "TYPE_WATER"]),
      target: highCritBattler(["TYPE_NORMAL", "TYPE_NORMAL"]),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result.kind).toBe("scored");
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.scoreDelta).toBe(1);
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "high-crit-roll", succeeded: true });
  });

  it("exactly 4x (no STAB, double weak, direct match): jumps straight to AI_CV_HighCrit2, one draw", () => {
    // Karate Chop (Fighting) vs Normal+Rock (both 2x): 40 * 20/10 * 20/10 = 160 = AI_EFFECTIVENESS_x4.
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_KARATE_CHOP,
      attacker: highCritBattler(["TYPE_WATER", "TYPE_WATER"]),
      target: highCritBattler(["TYPE_NORMAL", "TYPE_ROCK"]),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result.kind).toBe("scored");
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "high-crit-roll" });
  });

  it("2x via the STAB magic-number remap (60*20/10=120 -> AI_EFFECTIVENESS_x2): jumps straight to AI_CV_HighCrit2, one draw", () => {
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_KARATE_CHOP,
      attacker: highCritBattler(["TYPE_FIGHTING", "TYPE_FIGHTING"]), // STAB
      target: highCritBattler(["TYPE_NORMAL", "TYPE_NORMAL"]),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result.kind).toBe("scored");
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "high-crit-roll" });
  });

  it("4x via the STAB magic-number remap (60*20/10*20/10=240 -> AI_EFFECTIVENESS_x4): jumps straight to AI_CV_HighCrit2, one draw", () => {
    const result = runCheckViability({
      rng: { value: 3, calls: 0 },
      moveId: MOVE_KARATE_CHOP,
      attacker: highCritBattler(["TYPE_FIGHTING", "TYPE_FIGHTING"]), // STAB
      target: highCritBattler(["TYPE_NORMAL", "TYPE_ROCK"]),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result.kind).toBe("scored");
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "high-crit-roll" });
  });

  describe("neutral/immune fallthrough (no explicit match -- the doc's own §11.2 quirk: 1 or 2 draws, not fixed)", () => {
    const NEUTRAL_TARGET = ["TYPE_GROUND", "TYPE_GROUND"] as const; // Slash (Normal) has no table entry either direction -> stays 1x
    const IMMUNE_TARGET = ["TYPE_GHOST", "TYPE_GHOST"] as const; // Normal vs Ghost = 0x

    it("first if_random_less_than 128 roll < 128: jumps to End immediately, exactly one draw, zero score", () => {
      // seed 3 -> randomValue 50515 % 256 = 83 (< 128).
      const result = runCheckViability({
        rng: { value: 3, calls: 0 },
        moveId: MOVE_SLASH,
        attacker: highCritBattler(["TYPE_PSYCHIC", "TYPE_PSYCHIC"]),
        target: highCritBattler(NEUTRAL_TARGET),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(0);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "high-crit-fallthrough-roll", jumpedToEnd: true });
      expect(result.rng.calls).toBe(1);
    });

    it("first roll >= 128, second roll (AI_CV_HighCrit2's own) < 128: falls through into the second instruction, TWO draws, zero score", () => {
      // seed 1 -> draw1 randomValue 16838 % 256 = 198 (>= 128, falls through);
      // draw2 (from the advanced rngValue) randomValue % 256 = 33 (< 128, jumps to End).
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_SLASH,
        attacker: highCritBattler(["TYPE_PSYCHIC", "TYPE_PSYCHIC"]),
        target: highCritBattler(NEUTRAL_TARGET),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(0);
      expect(result.draws).toHaveLength(2);
      expect(result.draws[0]).toMatchObject({ kind: "high-crit-fallthrough-roll", jumpedToEnd: false });
      expect(result.draws[1]).toMatchObject({ kind: "high-crit-roll", succeeded: false });
      expect(result.rng.calls).toBe(2);
    });

    it("both rolls >= 128: falls through both instructions, TWO draws, score +1", () => {
      // seed 2 -> draw1 randomValue % 256 = 140 (>= 128); draw2 randomValue % 256 = 195 (>= 128).
      const result = runCheckViability({
        rng: { value: 2, calls: 0 },
        moveId: MOVE_SLASH,
        attacker: highCritBattler(["TYPE_PSYCHIC", "TYPE_PSYCHIC"]),
        target: highCritBattler(NEUTRAL_TARGET),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(1);
      expect(result.draws).toHaveLength(2);
      expect(result.draws[0]).toMatchObject({ kind: "high-crit-fallthrough-roll", jumpedToEnd: false });
      expect(result.draws[1]).toMatchObject({ kind: "high-crit-roll", succeeded: true });
    });

    it("0x immune effectiveness falls through the SAME path as neutral (not a fifth explicit branch)", () => {
      const result = runCheckViability({
        rng: { value: 3, calls: 0 },
        moveId: MOVE_SLASH,
        attacker: highCritBattler(["TYPE_PSYCHIC", "TYPE_PSYCHIC"]),
        target: highCritBattler(IMMUNE_TARGET),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(0);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "high-crit-fallthrough-roll", jumpedToEnd: true });
    });
  });

  it("EFFECT_BLAZE_KICK dispatches through the identical handler", () => {
    // Blaze Kick (Fire) vs Grass (STAB'd single weak, 60*20/10=120 -> remap x2): jumps straight to AI_CV_HighCrit2.
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_BLAZE_KICK,
      attacker: highCritBattler(["TYPE_FIRE", "TYPE_FIRE"]),
      target: highCritBattler(["TYPE_GRASS", "TYPE_NORMAL"]),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result.kind).toBe("scored");
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "high-crit-roll" });
  });

  it("EFFECT_POISON_TAIL dispatches through the identical handler", () => {
    // Poison Tail (Poison) vs Grass (STAB'd single weak, 60*20/10=120 -> remap x2): jumps straight to AI_CV_HighCrit2.
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_POISON_TAIL,
      attacker: highCritBattler(["TYPE_POISON", "TYPE_POISON"]),
      target: highCritBattler(["TYPE_GRASS", "TYPE_NORMAL"]),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result.kind).toBe("scored");
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "high-crit-roll" });
  });

  it("still barriers every other reachable CV handler untouched by this narrowing (pass-through)", () => {
    const result = run({ value: 1, calls: 0 }, MOVE_HAZE);
    expect(result).toMatchObject({ kind: "unsupported-branch", effect: "EFFECT_HAZE" });
  });
});

const MOVE_SWIFT = 129; // EFFECT_ALWAYS_HIT

/**
 * speed/speedStage/types/isFirstTurn/hp/maxHp are irrelevant to AI_CV_AlwaysHit --
 * fixed dummy values, only `evasionStage` (read from AI_TARGET) and
 * `accStage` (read from AI_USER) vary per test.
 */
function alwaysHitBattler(evasionStage: number, accStage: number) {
  return Object.freeze({
    speed: 100,
    speedStage: 6,
    types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
    isFirstTurn: 0,
    evasionStage,
    accStage,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
    hp: 100,
    maxHp: 100,
  });
}

// data/battle_ai_scripts.s:1075-1089, docs/factory-ai-checkviability-ground-truth.md §11.3/§12.1.
describe("AI_CV_AlwaysHit (docs/factory-ai-checkviability-ground-truth.md §11.3/§12.1)", () => {
  const NEUTRAL_EVASION = 6; // DEFAULT_STAT_STAGE
  const NEUTRAL_ACC = 6;

  it("neither gate true (evasion<=8, acc>=4): deterministic zero draws/score (goto End)", () => {
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_SWIFT,
      attacker: alwaysHitBattler(NEUTRAL_EVASION, NEUTRAL_ACC),
      target: alwaysHitBattler(NEUTRAL_EVASION, NEUTRAL_ACC),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result).toMatchObject({ kind: "scored", draws: [], scoreDelta: 0 });
  });

  it.each([
    ["target evasion stage 9 (>8, not >10)", 9, NEUTRAL_ACC],
    ["target evasion stage 10 (>8, not >10)", 10, NEUTRAL_ACC],
    ["user acc stage 3 (<4, not <2)", NEUTRAL_EVASION, 3],
    ["user acc stage 2 (<4, not <2)", NEUTRAL_EVASION, 2],
  ])("%s: reaches AI_CV_AlwaysHit2 directly, roll < 100 -> zero score, one draw", (_label, evasionStage, accStage) => {
    // seed 3 -> randomValue 50515 % 256 = 83 (< 100, jumps to End, no bonus).
    const result = runCheckViability({
      rng: { value: 3, calls: 0 },
      moveId: MOVE_SWIFT,
      attacker: alwaysHitBattler(NEUTRAL_EVASION, accStage),
      target: alwaysHitBattler(evasionStage, NEUTRAL_ACC),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result.kind).toBe("scored");
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.scoreDelta).toBe(0);
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "always-hit-roll", succeeded: false });
    expect(result.rng.calls).toBe(1);
  });

  it.each([
    ["target evasion stage 9 (>8, not >10)", 9, NEUTRAL_ACC],
    ["target evasion stage 10 (>8, not >10)", 10, NEUTRAL_ACC],
    ["user acc stage 3 (<4, not <2)", NEUTRAL_EVASION, 3],
    ["user acc stage 2 (<4, not <2)", NEUTRAL_EVASION, 2],
  ])("%s: reaches AI_CV_AlwaysHit2 directly, roll >= 100 -> score +1, one draw", (_label, evasionStage, accStage) => {
    // seed 1 -> randomValue 16838 % 256 = 198 (>= 100).
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_SWIFT,
      attacker: alwaysHitBattler(NEUTRAL_EVASION, accStage),
      target: alwaysHitBattler(evasionStage, NEUTRAL_ACC),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result.kind).toBe("scored");
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.scoreDelta).toBe(1);
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "always-hit-roll", succeeded: true });
  });

  describe("ScoreUp1 fallthrough (real finding beyond doc §11.3's own inline gloss -- score +1 does NOT terminate the script, it falls through into AI_CV_AlwaysHit2's own roll)", () => {
    it.each([
      ["target evasion stage 11 (>10)", 11, NEUTRAL_ACC],
      ["target evasion stage 12 (>10)", 12, NEUTRAL_ACC],
      ["user acc stage 1 (<2)", NEUTRAL_EVASION, 1],
      ["user acc stage 0 (<2)", NEUTRAL_EVASION, 0],
    ])("%s: falls through ScoreUp1 into AlwaysHit2, roll < 100 -> score +1 (not +0), exactly one draw (not zero)", (_label, evasionStage, accStage) => {
      // seed 3 -> randomValue 50515 % 256 = 83 (< 100, jumps to End after ScoreUp1's own +1).
      const result = runCheckViability({
        rng: { value: 3, calls: 0 },
        moveId: MOVE_SWIFT,
        attacker: alwaysHitBattler(NEUTRAL_EVASION, accStage),
        target: alwaysHitBattler(evasionStage, NEUTRAL_ACC),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(1);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "always-hit-roll", succeeded: false });
      expect(result.rng.calls).toBe(1);
    });

    it.each([
      ["target evasion stage 11 (>10)", 11, NEUTRAL_ACC],
      ["target evasion stage 12 (>10)", 12, NEUTRAL_ACC],
      ["user acc stage 1 (<2)", NEUTRAL_EVASION, 1],
      ["user acc stage 0 (<2)", NEUTRAL_EVASION, 0],
    ])("%s: falls through ScoreUp1 into AlwaysHit2, roll >= 100 -> score +2, exactly one draw", (_label, evasionStage, accStage) => {
      // seed 1 -> randomValue 16838 % 256 = 198 (>= 100).
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_SWIFT,
        attacker: alwaysHitBattler(NEUTRAL_EVASION, accStage),
        target: alwaysHitBattler(evasionStage, NEUTRAL_ACC),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(2);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "always-hit-roll", succeeded: true });
    });
  });

  it("still barriers every other reachable CV handler untouched by this narrowing (pass-through)", () => {
    const result = run({ value: 1, calls: 0 }, MOVE_TOXIC);
    expect(result).toMatchObject({ kind: "unsupported-branch", effect: "EFFECT_TOXIC" });
  });
});

const MOVE_VITAL_THROW = 233; // EFFECT_VITAL_THROW

/** types/isFirstTurn/evasionStage/accStage are irrelevant to AI_CV_VitalThrow -- fixed dummy values, only `speed`/`hp`/`maxHp` vary per test. */
function vitalThrowBattler(speed: number, hp: number, maxHp: number) {
  return Object.freeze({
    speed,
    speedStage: 6,
    types: ["TYPE_FIGHTING", "TYPE_FIGHTING"] as const,
    isFirstTurn: 0,
    evasionStage: 6,
    accStage: 6,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
    hp,
    maxHp,
  });
}

// data/battle_ai_scripts.s:1536-1546, docs/factory-ai-checkviability-ground-truth.md §13.
describe("AI_CV_VitalThrow (docs/factory-ai-checkviability-ground-truth.md §13)", () => {
  it("target strictly faster: deterministic zero draws/score, HP is never even read (goto End before the HP check)", () => {
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_VITAL_THROW,
      attacker: vitalThrowBattler(75, 1, 100), // 1% HP -- would reach VitalThrow2 if the speed gate didn't short-circuit first.
      target: vitalThrowBattler(95, 100, 100),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
  });

  it("an exact speed tie still burns GetWhoStrikesFirst's own Random() call, but never takes the target-faster branch (same Cmd_if_user_goes quirk runCvSpeedDown already pins)", () => {
    // seed 3 -> tie-roll randomValue 50515 is ODD -> strikesFirst=2 (still not 1).
    const oddTie = runCheckViability({
      rng: { value: 3, calls: 0 },
      moveId: MOVE_VITAL_THROW,
      attacker: vitalThrowBattler(100, 100, 100), // 100% HP -> deterministic End once past the speed gate.
      target: vitalThrowBattler(100, 100, 100),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(oddTie.kind).toBe("scored");
    if (oddTie.kind !== "scored") throw new Error("unreachable");
    expect(oddTie.scoreDelta).toBe(0);
    expect(oddTie.draws).toHaveLength(1);
    expect(oddTie.draws[0]).toMatchObject({ kind: "target-faster-tie", strikesFirst: 2 });

    // seed 8 -> tie-roll randomValue 3634 is EVEN -> strikesFirst stays 0.
    const evenTie = runCheckViability({
      rng: { value: 8, calls: 0 },
      moveId: MOVE_VITAL_THROW,
      attacker: vitalThrowBattler(100, 100, 100),
      target: vitalThrowBattler(100, 100, 100),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(evenTie.kind).toBe("scored");
    if (evenTie.kind !== "scored") throw new Error("unreachable");
    expect(evenTie.scoreDelta).toBe(0);
    expect(evenTie.draws).toHaveLength(1);
    expect(evenTie.draws[0]).toMatchObject({ kind: "target-faster-tie", strikesFirst: 0 });
  });

  it("HP% exactly 61 (>60): deterministic zero draws/score (if_hp_more_than AI_USER, 60 is true)", () => {
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_VITAL_THROW,
      attacker: vitalThrowBattler(100, 61, 100),
      target: vitalThrowBattler(50, 100, 100),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
  });

  it("HP% exactly 60 (NOT >60): reaches the [40,60] midband roll, not the deterministic End", () => {
    // seed 2 -> randomValue % 256 = 140 (< 180, jumps to End), exactly one draw.
    const result = runCheckViability({
      rng: { value: 2, calls: 0 },
      moveId: MOVE_VITAL_THROW,
      attacker: vitalThrowBattler(100, 60, 100),
      target: vitalThrowBattler(50, 100, 100),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result.kind).toBe("scored");
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.scoreDelta).toBe(0);
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "vital-throw-midband-roll", jumpedToEnd: true });
  });

  it("HP% exactly 40 (NOT <40): reaches the [40,60] midband roll too, same as 60", () => {
    // seed 2 -> randomValue % 256 = 140 (< 180, jumps to End), exactly one draw.
    const result = runCheckViability({
      rng: { value: 2, calls: 0 },
      moveId: MOVE_VITAL_THROW,
      attacker: vitalThrowBattler(100, 40, 100),
      target: vitalThrowBattler(50, 100, 100),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result.kind).toBe("scored");
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.scoreDelta).toBe(0);
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "vital-throw-midband-roll", jumpedToEnd: true });
  });

  it("HP% exactly 39 (<40): skips the midband roll entirely, straight to AI_CV_VitalThrow2's own roll (one draw, not two)", () => {
    // seed 4 -> randomValue % 256 = 25 (< 50, jumps to End).
    const result = runCheckViability({
      rng: { value: 4, calls: 0 },
      moveId: MOVE_VITAL_THROW,
      attacker: vitalThrowBattler(100, 39, 100),
      target: vitalThrowBattler(50, 100, 100),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result.kind).toBe("scored");
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.scoreDelta).toBe(0);
    expect(result.draws).toHaveLength(1);
    expect(result.draws[0]).toMatchObject({ kind: "vital-throw-roll", succeeded: false });
  });

  describe("[40,60] midband roll (if_random_less_than 180)", () => {
    it("roll < 180: jumps straight to End, exactly one draw, zero score", () => {
      // seed 2 -> randomValue % 256 = 140 (< 180).
      const result = runCheckViability({
        rng: { value: 2, calls: 0 },
        moveId: MOVE_VITAL_THROW,
        attacker: vitalThrowBattler(100, 50, 100),
        target: vitalThrowBattler(50, 100, 100),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(0);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "vital-throw-midband-roll", jumpedToEnd: true });
    });

    it("roll >= 180, then AI_CV_VitalThrow2's own roll < 50: falls through both instructions, TWO draws, zero score", () => {
      // seed 1 -> draw1 randomValue % 256 = 198 (>= 180, falls through); draw2 randomValue % 256 = 33 (< 50, jumps to End).
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_VITAL_THROW,
        attacker: vitalThrowBattler(100, 50, 100),
        target: vitalThrowBattler(50, 100, 100),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(0);
      expect(result.draws).toHaveLength(2);
      expect(result.draws[0]).toMatchObject({ kind: "vital-throw-midband-roll", jumpedToEnd: false });
      expect(result.draws[1]).toMatchObject({ kind: "vital-throw-roll", succeeded: false });
      expect(result.rng.calls).toBe(2);
    });

    it("roll >= 180, then AI_CV_VitalThrow2's own roll >= 50: falls through both instructions, TWO draws, score -1", () => {
      // seed 9 -> draw1 randomValue % 256 = 249 (>= 180); draw2 randomValue % 256 = 53 (>= 50).
      const result = runCheckViability({
        rng: { value: 9, calls: 0 },
        moveId: MOVE_VITAL_THROW,
        attacker: vitalThrowBattler(100, 50, 100),
        target: vitalThrowBattler(50, 100, 100),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(-1);
      expect(result.draws).toHaveLength(2);
      expect(result.draws[0]).toMatchObject({ kind: "vital-throw-midband-roll", jumpedToEnd: false });
      expect(result.draws[1]).toMatchObject({ kind: "vital-throw-roll", succeeded: true });
      expect(result.rng.calls).toBe(2);
    });
  });

  describe("<40% direct AI_CV_VitalThrow2 roll (if_random_less_than 50)", () => {
    it("roll < 50: jumps to End, exactly one draw, zero score", () => {
      // seed 4 -> randomValue % 256 = 25 (< 50).
      const result = runCheckViability({
        rng: { value: 4, calls: 0 },
        moveId: MOVE_VITAL_THROW,
        attacker: vitalThrowBattler(100, 20, 100),
        target: vitalThrowBattler(50, 100, 100),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(0);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "vital-throw-roll", succeeded: false });
      expect(result.rng.calls).toBe(1);
    });

    it("roll >= 50: falls through to score -1, exactly one draw", () => {
      // seed 1 -> randomValue % 256 = 198 (>= 50).
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_VITAL_THROW,
        attacker: vitalThrowBattler(100, 20, 100),
        target: vitalThrowBattler(50, 100, 100),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(-1);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "vital-throw-roll", succeeded: true });
      expect(result.rng.calls).toBe(1);
    });
  });

  it("still barriers every other reachable CV handler untouched by this narrowing (pass-through)", () => {
    const result = run({ value: 1, calls: 0 }, MOVE_HAZE);
    expect(result).toMatchObject({ kind: "unsupported-branch", effect: "EFFECT_HAZE" });
  });
});

const MOVE_GROWL_ATTACK_DOWN = 45; // EFFECT_ATTACK_DOWN
const MOVE_CHARM = 204; // EFFECT_ATTACK_DOWN_2 -- same handler, different table entry
const PHYSICAL_TYPES = ["TYPE_BUG", "TYPE_ROCK"] as const; // both in AI_CV_AttackDown_PhysicalTypeList (Shuckle-shaped)
const NON_PHYSICAL_TYPES = ["TYPE_GHOST", "TYPE_POISON"] as const; // neither in the list (Haunter-shaped), doc §14.3's own reach fixture

/** isFirstTurn/evasionStage/accStage/speed(Stage) are irrelevant to AI_CV_AttackDown -- fixed dummy values. */
function attackDownAttacker(hp: number, maxHp = 100) {
  return Object.freeze({
    speed: 100, speedStage: 6, types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
    isFirstTurn: 0, evasionStage: 6, accStage: 6, atkStage: 6, defStage: 6, spDefStage: 6, hp, maxHp,
  });
}
function attackDownTarget(atkStage: number, hp: number, types: readonly [string, string], maxHp = 100) {
  return Object.freeze({
    speed: 100, speedStage: 6, types,
    isFirstTurn: 0, evasionStage: 6, accStage: 6, atkStage, defStage: 6, spDefStage: 6, hp, maxHp,
  });
}

// data/battle_ai_scripts.s:1090-1123, docs/factory-ai-checkviability-ground-truth.md §14.1:
// the first CBM-blocked pair's own CV half (AI_CBM_AttackDown, the CBM side,
// is in factoryAiCheckBadMove.test.ts). Every one of the 6 gates and both
// if_random_less_than draw sites, isolated one at a time by holding the
// other gates at their deterministic/skip settings, plus a combined test
// proving DRAW SITE 1 and DRAW SITE 2 are NOT mutually exclusive.
describe("AI_CV_AttackDown (docs/factory-ai-checkviability-ground-truth.md §14.1)", () => {
  it("Gate A held (target ATK stage == DEFAULT_STAT_STAGE) + Gate D skip (target HP > 70) + Gate E match (type1 physical): fully deterministic, zero draws, zero score", () => {
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_GROWL_ATTACK_DOWN,
      attacker: attackDownAttacker(100),
      target: attackDownTarget(6, 100, PHYSICAL_TYPES),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
  });

  it("EFFECT_ATTACK_DOWN_2 dispatches to the identical handler", () => {
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: MOVE_CHARM,
      attacker: attackDownAttacker(100),
      target: attackDownTarget(6, 100, PHYSICAL_TYPES),
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
  });

  describe("Gate A / Gate B (target ATK stage != DEFAULT_STAT_STAGE; AI_USER's own HP > 90)", () => {
    it("Gate A not held, Gate C skips DRAW SITE 1 (ATK stage 4 > 3), Gate B skips the second -1 (attacker HP 100% > 90): score -1, zero draws", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_GROWL_ATTACK_DOWN,
        attacker: attackDownAttacker(100),
        target: attackDownTarget(4, 100, PHYSICAL_TYPES),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: -1 });
    });

    it("Gate A not held, Gate B applies the second -1 (attacker HP exactly 90%, NOT >90): score -2, zero draws", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_GROWL_ATTACK_DOWN,
        attacker: attackDownAttacker(90),
        target: attackDownTarget(4, 100, PHYSICAL_TYPES),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: -2 });
    });
  });

  describe("Gate C / DRAW SITE 1 (if_random_less_than 50, reached only at target ATK stage in [0,3])", () => {
    it("ATK stage 3 (<=3) reaches the roll; roll < 50 skips the -2 (one draw, base -1 from Gate A only)", () => {
      // seed 4 -> randomValue % 256 = 25 (< 50).
      const result = runCheckViability({
        rng: { value: 4, calls: 0 },
        moveId: MOVE_GROWL_ATTACK_DOWN,
        attacker: attackDownAttacker(100), // > 90 -> Gate B's second -1 skipped
        target: attackDownTarget(3, 100, PHYSICAL_TYPES), // Gate D/E deterministic zero past this
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(-1);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "attack-down-roll-1", succeeded: false });
    });

    it("ATK stage 3 (<=3), roll >= 50 applies the -2 (one draw, -1 -2 = -3 total)", () => {
      // seed 1 -> randomValue % 256 = 198 (>= 50).
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_GROWL_ATTACK_DOWN,
        attacker: attackDownAttacker(100),
        target: attackDownTarget(3, 100, PHYSICAL_TYPES),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(-3);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "attack-down-roll-1", succeeded: true });
    });
  });

  describe("Gate D (if_hp_more_than AI_TARGET, 70 -- the target's OWN hp, a plain fallthrough)", () => {
    it("target HP exactly 71% (>70): skips the -2", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_GROWL_ATTACK_DOWN,
        attacker: attackDownAttacker(100),
        target: attackDownTarget(6, 71, PHYSICAL_TYPES), // Gate A held -> only Gate D/E vary
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
    });

    it("target HP exactly 70% (NOT >70): applies the -2", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_GROWL_ATTACK_DOWN,
        attacker: attackDownAttacker(100),
        target: attackDownTarget(6, 70, PHYSICAL_TYPES),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: -2 });
    });
  });

  describe("Gates E/F (get_target_type1/2 + if_in_bytes AI_CV_AttackDown_PhysicalTypeList)", () => {
    it("Gate E matches on type1 alone (type2 non-physical): jumps to End, zero draws", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_GROWL_ATTACK_DOWN,
        attacker: attackDownAttacker(100),
        target: attackDownTarget(6, 100, ["TYPE_BUG", "TYPE_FLYING"]),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
    });

    it("Gate F matches on type2 alone (type1 non-physical, Gate E misses): jumps to End, zero draws", () => {
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_GROWL_ATTACK_DOWN,
        attacker: attackDownAttacker(100),
        target: attackDownTarget(6, 100, ["TYPE_GHOST", "TYPE_ROCK"]),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result).toEqual({ kind: "scored", rng: { value: 1, calls: 0 }, draws: [], scoreDelta: 0 });
    });
  });

  describe("DRAW SITE 2 (if_random_less_than 50, reached only when neither Gate E nor F matches)", () => {
    it("roll < 50: jumps to End, exactly one draw, zero score (doc §14.3's own reach fixture shape)", () => {
      // seed 4 -> randomValue % 256 = 25 (< 50).
      const result = runCheckViability({
        rng: { value: 4, calls: 0 },
        moveId: MOVE_GROWL_ATTACK_DOWN,
        attacker: attackDownAttacker(100),
        target: attackDownTarget(6, 100, NON_PHYSICAL_TYPES),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(0);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "attack-down-roll-2", succeeded: false });
      expect(result.rng.calls).toBe(1);
    });

    it("roll >= 50: falls through to score -2, exactly one draw", () => {
      // seed 1 -> randomValue % 256 = 198 (>= 50).
      const result = runCheckViability({
        rng: { value: 1, calls: 0 },
        moveId: MOVE_GROWL_ATTACK_DOWN,
        attacker: attackDownAttacker(100),
        target: attackDownTarget(6, 100, NON_PHYSICAL_TYPES),
        drawOrdinalStart: 1,
        reasonPrefix: "test",
      });
      expect(result.kind).toBe("scored");
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.scoreDelta).toBe(-2);
      expect(result.draws).toHaveLength(1);
      expect(result.draws[0]).toMatchObject({ kind: "attack-down-roll-2", succeeded: true });
      expect(result.rng.calls).toBe(1);
    });
  });

  it("DRAW SITE 1 and DRAW SITE 2 are NOT mutually exclusive: both fire in one pass, worst-case -8 (-1,-1,-2,-2,-2)", () => {
    // seed 2 -> draw1 randomValue % 256 = 140 (>= 50, succeeds); draw2 randomValue % 256 = 195 (>= 50, succeeds).
    const result = runCheckViability({
      rng: { value: 2, calls: 0 },
      moveId: MOVE_GROWL_ATTACK_DOWN,
      attacker: attackDownAttacker(50), // <= 90 -> Gate B's second -1 applies
      target: attackDownTarget(3, 50, NON_PHYSICAL_TYPES), // ATK stage <=3 -> draw1; HP <=70 -> Gate D -2; non-physical -> draw2
      drawOrdinalStart: 1,
      reasonPrefix: "test",
    });
    expect(result.kind).toBe("scored");
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.scoreDelta).toBe(-8);
    expect(result.draws).toHaveLength(2);
    expect(result.draws[0]).toMatchObject({ kind: "attack-down-roll-1", succeeded: true });
    expect(result.draws[1]).toMatchObject({ kind: "attack-down-roll-2", succeeded: true });
    expect(result.rng.calls).toBe(2);
  });

  it("still barriers every other reachable CV handler untouched by this narrowing (pass-through)", () => {
    const result = run({ value: 1, calls: 0 }, MOVE_HAZE);
    expect(result).toMatchObject({ kind: "unsupported-branch", effect: "EFFECT_HAZE" });
  });
});
