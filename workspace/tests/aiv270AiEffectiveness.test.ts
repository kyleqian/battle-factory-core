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

// parity-mac (docs/parity-mac/ai-effectiveness-foresight.md). TypeCalc breaks at the TYPE_FORESIGHT sentinel row when the defender has
// STATUS2_FORESIGHT (battle_script_commands.c:1560-1566), so Normal / Fighting moves are not x0 into a Foresighted Ghost for
// `if_type_effectiveness AI_EFFECTIVENESS_x0`. ROM seed 959: Hitmonlee keeps Mega Kick and Brick Break at 100 against a Foresighted
// Sableye (the engine scored both -10 and was left with Rock Tomb only).
describe("AI effectiveness honors Foresight on the target", () => {
  const BRICK_BREAK = 280; // Fighting, power 75
  const MEGA_KICK = 25; // Normal, power 120
  const probe = (moveId: number, isForesighted: boolean) => {
    const result = runCheckBadMovePreamble({
      rng: { value: 249_678_687, calls: 0 },
      moveId,
      target: { ...MAROWAK_TWO_ABILITIES, types: ["TYPE_DARK", "TYPE_GHOST"], ...(isForesighted ? { isForesighted: true } : {}) },
      attacker: { atkStage: 6, defStage: 6 },
      drawOrdinalStart: 1,
      reasonPrefix: "slot",
    });
    if (result.kind !== "scored") throw new Error("expected a scored result");
    return result.scoreDelta;
  };

  it("without Foresight a Normal / Fighting move into a Ghost is x0: Score_Minus10", () => {
    expect(probe(BRICK_BREAK, false)).toBe(-10);
    expect(probe(MEGA_KICK, false)).toBe(-10);
  });

  it("with Foresight the Ghost immunity rows are skipped: no penalty", () => {
    expect(probe(BRICK_BREAK, true)).toBe(0); // fails unfixed (-10)
    expect(probe(MEGA_KICK, true)).toBe(0); // fails unfixed (-10)
  });
});
