// pic8 (2026-11-20 playtest, docs/pic1-live-field-pictures.md): after the player's Pokemon faints, the fade into the party menu.
// Kyle saw it "fade to white"; the ROM fades to black, and because the Factory field is nearly white its first steps are light
// greys, exactly as drawn. What differed was the start: the live route faded 2 frames late, because two one-frame sprite-visibility
// restores run after the faint message and the forced selector's "frames since the dismiss edge" clock started after them.
// ROM lab tools/battle-lab/pic7-player-faint-send-in-on.json: A on "RATTATA fainted!" at trace frame 560 (engine frame 561); the
// field holds 21 frames and ROM_SKY below is the field's top pixel (120, 5) from capture 580 (A + 19) on.
import { describe, expect, it } from "vitest";
import { createStartCarryState, runSeed } from "../tools/soak/randomRoundSoakDriver.ts";
import { render, tick, type EngineState } from "../src/engine/core.ts";
import type { GbaButton } from "../src/input.ts";

/** ROM pixel (120, 5) as 0xRRGGBB at A + 19 .. A + 37 (engine frames after the A frame). */
const ROM_SKY: readonly number[] = [
  0xe7e7ef, 0xe7e7ef, 0xc6c6ce, 0xc6c6ce, 0xadadad, 0xadadad, 0x8c8c94, 0x8c8c94, 0x737373, 0x737373, 0x525252, 0x525252,
  0x393939, 0x393939, 0x181818, 0x181818, 0x000000, 0x000000, 0x000000,
];

function faintMessageState(): EngineState {
  let captured: EngineState | null = null;
  runSeed(0, {
    policy: "winning", scene: "on", renderEvery: 1, maxFrames: 200_000,
    stateFactory: (seed) => createStartCarryState(0, seed * 7 + 1, "on"),
    drawCheck: { check: (state) => {
      const orchestrator = state.factoryRoundBattleOrchestrator;
      const resolution = orchestrator?.battleResolutionPresentation;
      if (captured !== null || !resolution || orchestrator!.battleForcedPartySelect !== null) return;
      const command = resolution.segments[resolution.segmentIndex]?.commands[resolution.commandIndex];
      if (command?.type === "message" && command.faintBattler === 0) {
        captured = state;
        throw new Error("captured");
      }
    } },
  });
  if (captured === null) throw new Error("no player faint");
  return captured;
}

describe("pic8: the fade into the forced party menu starts 21 frames after the faint message's A, as on the ROM", () => {
  it("holds the field 21 frames, then fades to black on the ROM's steps", () => {
    const none: ReadonlySet<GbaButton> = new Set();
    let state = faintMessageState();
    for (let i = 0; i < 120; i += 1) state = tick(state, none);
    state = tick(state, new Set<GbaButton>(["A"]));
    const sky: number[] = [];
    for (let k = 0; k <= 37; k += 1) {
      if (k >= 19) {
        const fb = render(state);
        const o = (5 * 240 + 120) * 4;
        sky.push(fb[o]! * 65536 + fb[o + 1]! * 256 + fb[o + 2]!);
      }
      if (k === 2) expect(state.factoryRoundBattleOrchestrator!.battleForcedPartySelect!.elapsed).toBe(2);
      state = tick(state, none);
    }
    expect(sky).toEqual(ROM_SKY);
  }, 120_000);
});
