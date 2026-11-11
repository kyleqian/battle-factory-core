import { describe, expect, it } from "vitest";
import {
  runCheckBadMovePreamble,
  type FactoryAiCheckBadMoveTarget,
} from "../src/engine/factoryAiCheckBadMove.ts";

// aiv270 cause A (ISSUES #204). C `Cmd_if_type_effectiveness` (battle_ai_script_commands.c:1515-1557, non-BUGFIX) never
// copies TypeCalc's no-effect flag, so an immunity row followed by a later non-zero row in table order lifts the AI value
// back to 1 (battle_script_commands.c:1502-1506, 1536-1591). Ground table rows: Flying x0 (idx 59), then Rock x2 (idx 61).
// Psychic rows: Dark x0 (idx 72), then Steel x0.5 (idx 73).

const MOVE_EARTHQUAKE = 89; // Ground, power 100
const MOVE_PSYWAVE = 149; // Psychic, EFFECT_PSYWAVE (AI_CBM_HighRiskForDamage)

const MAROWAK_TWO_ABILITIES: FactoryAiCheckBadMoveTarget = Object.freeze({
  species: 105,
  types: ["TYPE_GROUND", "TYPE_GROUND"] as const,
  knownAbility: null,
  realAbility: "ABILITY_ROCK_HEAD",
  speedStage: 6,
  atkStage: 6,
  defStage: 6,
  spDefStage: 6,
});

function run(moveId: number, types: readonly [string, string]) {
  const result = runCheckBadMovePreamble({
    rng: { value: 249_678_687, calls: 0 },
    moveId,
    target: { ...MAROWAK_TWO_ABILITIES, types },
    attacker: { atkStage: 6, defStage: 6 },
    drawOrdinalStart: 1,
    reasonPrefix: "slot",
  });
  if (result.kind !== "scored") throw new Error("expected a scored result");
  return result;
}

describe("aiv270 A: AI x0 probe is the Cmd_if_type_effectiveness quirk, not the true multiplier", () => {
  it("Ground vs [ROCK, FLYING] is not x0 in the AI view: not -10, both get_ability draws consumed", () => {
    const result = run(MOVE_EARTHQUAKE, ["TYPE_ROCK", "TYPE_FLYING"]);
    expect(result.scoreDelta).toBe(0);
    expect(result.draws.map((d) => d.reason)).toEqual(["slot-negates-type", "slot-soundproof"]);
    expect(result.rng.calls).toBe(2);
  });

  it("Ground vs [FLYING] (immunity row is last, nothing lifts it) is x0: -10 with no draws", () => {
    const result = run(MOVE_EARTHQUAKE, ["TYPE_FLYING", "TYPE_FLYING"]);
    expect(result.scoreDelta).toBe(-10);
    expect(result.draws).toHaveLength(0);
    expect(result.rng.calls).toBe(0);
  });

  it("Ground vs [FLYING, ROCK] (type slots swapped) behaves the same as [ROCK, FLYING]: the glitch follows table order", () => {
    const result = run(MOVE_EARTHQUAKE, ["TYPE_FLYING", "TYPE_ROCK"]);
    expect(result.scoreDelta).toBe(0);
    expect(result.draws).toHaveLength(2);
  });

  it("AI_CBM_HighRiskForDamage (Psywave) vs [DARK, STEEL]: not -10, performs the handler ability read", () => {
    const result = run(MOVE_PSYWAVE, ["TYPE_DARK", "TYPE_STEEL"]);
    expect(result.scoreDelta).toBe(0);
    expect(result.draws.map((d) => d.reason)).toEqual(["slot-soundproof", "slot-high-risk-ability"]);
  });

  it("AI_CBM_HighRiskForDamage (Psywave) vs [DARK]: x0, -10 before the handler ability read", () => {
    const result = run(MOVE_PSYWAVE, ["TYPE_DARK", "TYPE_DARK"]);
    expect(result.scoreDelta).toBe(-10);
    expect(result.draws.map((d) => d.reason)).toEqual(["slot-soundproof"]);
  });
});
