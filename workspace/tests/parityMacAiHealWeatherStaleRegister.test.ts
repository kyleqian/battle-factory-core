import { describe, expect, it } from "vitest";
import { runCheckViability } from "../src/engine/factoryAiCheckViability.ts";

// docs/parity-mac/ai-heal-weather-stale-register.md. AI_CV_HealWeather (data/battle_ai_scripts.s:1315-1323, Morning Sun / Synthesis / Moonlight):
//   get_weather; if_equal AI_WEATHER_HAIL / RAIN / SANDSTORM -> score -2; then AI_CV_Heal.
// Cmd_get_weather (battle_ai_script_commands.c:1644-1665, non-BUGFIX) writes funcResult only when a weather bit is set. With clear weather the three if_equal
// test the value an earlier command left: after AI_TryToFaint's pass that is get_how_powerful_move_is' 2 (most powerful) / 1 (not most powerful) / 0 (other),
// which read as sandstorm / rain / sun. ROM seed 7922 (silver Noland): Tropius at 29 / 166 HP, clear weather, Body Slam (the last slot) is its most powerful
// move, so the register holds 2: Synthesis scores -2 +2 = 100, ties with Body Slam and loses the tie draw. The engine applied the -2 only for real weather.

const TACKLE = 33;
const SYNTHESIS = 235;
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

// Tropius 29 / 166 HP, speed 56; the target (Weepinbell, speed 64) is faster: AI_CV_Heal4 -> Heal5 -> Heal6, one roll (`if_random_less_than 20`), then +2.
// rng value 1: the roll is 16838 % 256 = 198, not below 20.
function run(moveId: number, staleFuncResultFallback: 0 | 1 | 2 | 3 | undefined, currentWeather?: 0 | 1 | 2 | 3) {
  const result = runCheckViability({
    rng: { value: 1, calls: 0 },
    moveId,
    attacker: { ...BASE, speed: 56, hp: 29, maxHp: 166, moves: [moveId, TACKLE, TACKLE, TACKLE] as const, ...(currentWeather === undefined ? {} : { currentWeather }) },
    target: { ...BASE, speed: 64 },
    staleFuncResultFallback,
    drawOrdinalStart: 1,
    reasonPrefix: "probe",
  });
  if (result.kind !== "scored") throw new Error(`expected a scored result, got ${result.kind}`);
  return { scoreDelta: result.scoreDelta, kinds: result.draws.map((draw) => draw.kind), funcResultAfter: result.funcResultAfter };
}

describe("AI_CV_HealWeather tests the carried funcResult when the weather is clear", () => {
  it("a carried 2 / 1 / 3 reads as sandstorm / rain / hail: -2, then the heal body's +2 (ROM seed 7922)", () => {
    // Unfixed: scoreDelta 2 for all three.
    expect(run(SYNTHESIS, 2)).toEqual({ scoreDelta: 0, kinds: ["heal-roll-3"], funcResultAfter: 2 });
    expect(run(SYNTHESIS, 1)).toEqual({ scoreDelta: 0, kinds: ["heal-roll-3"], funcResultAfter: 1 });
    expect(run(SYNTHESIS, 3)).toEqual({ scoreDelta: 0, kinds: ["heal-roll-3"], funcResultAfter: 3 });
    // Morning Sun 234 and Moonlight 236 dispatch to the same script (:731-733).
    expect(run(234, 2).scoreDelta).toBe(0);
    expect(run(236, 2).scoreDelta).toBe(0);
  });

  it("a carried 0 reads as sun, and an unknown carry gives no penalty", () => {
    expect(run(SYNTHESIS, 0)).toEqual({ scoreDelta: 2, kinds: ["heal-roll-3"], funcResultAfter: 0 });
    expect(run(SYNTHESIS, undefined)).toEqual({ scoreDelta: 2, kinds: ["heal-roll-3"], funcResultAfter: undefined });
  });

  it("real weather overwrites the carried value", () => {
    expect(run(SYNTHESIS, 2, 0)).toEqual({ scoreDelta: 2, kinds: ["heal-roll-3"], funcResultAfter: 0 }); // sun
    expect(run(SYNTHESIS, 0, 1)).toEqual({ scoreDelta: 0, kinds: ["heal-roll-3"], funcResultAfter: 1 }); // rain
  });

  it("AI_CV_Heal itself (Recover 105) has no weather gate", () => {
    expect(run(105, 2)).toEqual({ scoreDelta: 2, kinds: ["heal-roll-3"], funcResultAfter: 2 });
  });
});
