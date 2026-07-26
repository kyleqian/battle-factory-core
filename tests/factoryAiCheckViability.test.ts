import { describe, expect, it } from "vitest";
import { runCheckViability } from "../src/engine/factoryAiCheckViability.ts";

const MOVE_SURF = 57; // EFFECT_HIT -- no if_effect table entry
const MOVE_ROCK_SLIDE = 157; // EFFECT_FLINCH_HIT -- no entry
const MOVE_BODY_SLAM = 34; // EFFECT_PARALYZE_HIT -- no entry
const MOVE_THUNDERBOLT = 85; // EFFECT_PARALYZE_HIT -- no entry
const MOVE_GROWL = 45; // EFFECT_ATTACK_DOWN -- has an entry (AI_CV_AttackDown, not ported)
const MOVE_TOXIC = 92; // EFFECT_TOXIC -- has an entry (AI_CV_Toxic, not ported)

// Neutral speed/stage battlers for the tests above that don't exercise
// AI_CV_SpeedDown -- the describe block below owns that handler's own battlers.
// types/isFirstTurn/evasionStage/accStage are irrelevant to these
// no-table-entry/barrier cases but required by the widened battler shape
// (entry 466 added isFirstTurn, this entry adds evasionStage/accStage).
const NEUTRAL_BATTLER = Object.freeze({
  speed: 100,
  speedStage: 6,
  types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
  isFirstTurn: 0,
  evasionStage: 6,
  accStage: 6,
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
    const result = run({ value: 1, calls: 0 }, MOVE_GROWL);
    expect(result).toEqual({
      kind: "unsupported-branch",
      barrier: "factory-ai-check-viability",
      effect: "EFFECT_ATTACK_DOWN",
      moveId: MOVE_GROWL,
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
    const result = run({ value: 1, calls: 0 }, MOVE_GROWL);
    expect(result).toMatchObject({ kind: "unsupported-branch", effect: "EFFECT_ATTACK_DOWN" });
  });
});

const MOVE_PURSUIT = 228; // EFFECT_PURSUIT

/** Speed/speedStage/evasionStage/accStage are irrelevant to AI_CV_Pursuit -- fixed dummy values, only `types`/`isFirstTurn` vary per test. */
function pursuitBattler(types: readonly [string, string], isFirstTurn: number) {
  return Object.freeze({ speed: 100, speedStage: 6, types, isFirstTurn, evasionStage: 6, accStage: 6 });
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

/** isFirstTurn/evasionStage/accStage are irrelevant to AI_CV_HighCrit -- fixed dummy values, only `types` vary per test. */
function highCritBattler(types: readonly [string, string]) {
  return Object.freeze({ speed: 100, speedStage: 6, types, isFirstTurn: 0, evasionStage: 6, accStage: 6 });
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
    const result = run({ value: 1, calls: 0 }, MOVE_GROWL);
    expect(result).toMatchObject({ kind: "unsupported-branch", effect: "EFFECT_ATTACK_DOWN" });
  });
});

const MOVE_SWIFT = 129; // EFFECT_ALWAYS_HIT

/**
 * speed/speedStage/types/isFirstTurn are irrelevant to AI_CV_AlwaysHit --
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
