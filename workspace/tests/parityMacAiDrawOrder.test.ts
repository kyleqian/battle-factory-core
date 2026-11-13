import { describe, expect, it } from "vitest";
import { runCheckViability } from "../src/engine/factoryAiCheckViability.ts";

// docs/parity-mac/ai-speed-tie-draw-order.md. `if_target_faster` / `if_user_faster` spend one Random() only on a speed tie
// (GetWhoStrikesFirst). A handler must take that draw exactly where the script runs the command: an earlier command that
// jumps past it means no speed check and no draw. ROM seed 114 (Weezing, Memento at 63% HP, both speeds 72): the ROM's
// AI_CV_SelfKO spends one draw (Encourage4's roll), the engine spent two (a tie draw first).

const TACKLE = 33;
const BASE = Object.freeze({
  speed: 100,
  speedStage: 6,
  types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
  isFirstTurn: 0,
  evasionStage: 6,
  accStage: 6,
  atkStage: 6,
  defStage: 6,
  spAtkStage: 6,
  spDefStage: 6,
  hp: 100,
  maxHp: 100,
  moves: [TACKLE, TACKLE, TACKLE, TACKLE] as const,
});

function run(moveId: number, attacker: Record<string, unknown> = {}, target: Record<string, unknown> = {}) {
  const result = runCheckViability({
    rng: { value: 1, calls: 0 },
    moveId,
    attacker: { ...BASE, moves: [moveId, TACKLE, TACKLE, TACKLE] as const, ...attacker },
    target: { ...BASE, ...target },
    drawOrdinalStart: 1,
    reasonPrefix: "probe",
  });
  if (result.kind !== "scored") throw new Error(`expected a scored result, got ${result.kind}`);
  return { scoreDelta: result.scoreDelta, kinds: result.draws.map((draw) => draw.kind) };
}

describe("AI speed-tie draw is spent only where the script runs the speed check (equal speeds on both sides)", () => {
  it("AI_CV_SelfKO (:800-826): below 80% HP `if_hp_less_than AI_USER, 80` (:807) jumps past `if_target_faster` (:808)", () => {
    // Explosion 153 at 60% HP: Encourage2 -> HP > 50 -> Encourage4's single roll. Unfixed: ["target-faster-tie", "self-ko-roll-5"].
    expect(run(153, { hp: 60 }).kinds).toEqual(["self-ko-roll-5"]);
    // Memento 262 dispatches to the same script.
    expect(run(262, { hp: 60 }).kinds).toEqual(["self-ko-roll-5"]);
    // At 80% or more the speed check runs first, so the tie draw is still there.
    expect(run(153, { hp: 90 }).kinds[0]).toBe("target-faster-tie");
  });

  it("AI_CV_Heal (:1324-1351): at full HP `if_hp_equal AI_USER, 100` (:1325) scores -3 before `if_target_faster` (:1326)", () => {
    // Recover 105. Unfixed: ["target-faster-tie"].
    expect(run(105)).toEqual({ scoreDelta: -3, kinds: [] });
    // Below full HP the speed check comes first.
    expect(run(105, { hp: 90 }).kinds[0]).toBe("target-faster-tie");
  });

  it("AI_CV_BatonPass (:1978-2016): with no stat above stage 7 the script reaches no speed check (-2, no draw)", () => {
    // Baton Pass 226. Unfixed: ["target-faster-tie"].
    expect(run(226)).toEqual({ scoreDelta: -2, kinds: [] });
    // A stat above 7 reaches BatonPass7's `if_target_faster` (:2007).
    expect(run(226, { atkStage: 8 }).kinds[0]).toBe("target-faster-tie");
  });

  it("AI_CV_MirrorMove (:838-852): target faster and its last move is on the encouraged list ends with no roll (:848)", () => {
    // Mirror Move 119; target strictly faster (no tie), last move Spore 147. Unfixed: ["mirror-move-roll-2"].
    expect(run(119, { speed: 5 }, { speed: 120, lastUsedMoveId: 147 })).toEqual({ scoreDelta: 0, kinds: [] });
    // A last move that is not on the list still rolls.
    expect(run(119, { speed: 5 }, { speed: 120, lastUsedMoveId: TACKLE }).kinds).toEqual(["mirror-move-roll-2"]);
  });
});
