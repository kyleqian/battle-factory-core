// sst1 (docs/sst1-sandstorm-continues.md): the end-turn sandstorm, Scene ON. ROM (frame catcher, 15 end turns in two runs), from the first
// glyph of "The sandstorm rages.": SE_M_SANDSTORM at +88 (ours was +96), the sand pictures +95..+248 on both sides, and the first glyph of
// "{X} is buffeted by the sandstorm!" at +258 when the first battler in turn order is hurt and +264 when it is not (ours was +256 always):
// BattleScript_DamagingWeatherContinues runs one script command a frame, and an unhurt battler adds LoopIncrement's three commands and the
// loop's next three. The sound is sst1's (General_Sandstorm on the body's own clock); the print's rows are the box's etp1
// (damagingWeatherLoopLeadRows, the same instruction count), which replaced sst1's tail rule in the merge.
import { describe, expect, it } from "vitest";
import { createBattleResolutionPresentationRenderView } from "../src/engine/battleResolutionPresentationRender.ts";
import { FactorySession } from "../src/factorySession.ts";
import { ActionLog, RandomPlayer, Rng } from "../tools/soak/randomRoundSoakDriver.ts";

/** Seed 44 Scene ON with the soak's test player (makeTrace's t44on): per end-turn sandstorm, SE_M_SANDSTORM and the buffeted print's first
 *  glyph, in frames from the first glyph of "The sandstorm rages.". */
function sandstormTurns(seed: number, turns: number): Array<{ se: number | null; buffeted: number }> {
  const mix = (x: number) => { x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0; x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0; return (x ^ (x >>> 16)) >>> 0; };
  const session = new FactorySession({ battleScene: "on", gameplaySeed: mix(seed * 2 + 1), presentationSeed: mix(seed * 2 + 2), start: "draft", challengeRequest: "hold" });
  const player = new RandomPlayer(new Rng(seed), new ActionLog(false), "winning-coverage");
  const out: Array<{ se: number | null; buffeted: number }> = [];
  let frame = 0;
  let rages: number | null = null;
  let se: number | null = null;
  let lastId: string | null = null;
  session.attachSoundSink({ push: (e) => { if (e.kind === "se" && e.id === 219 && rages !== null) se = frame; } });
  for (; frame < 120000 && out.length < turns; frame += 1) {
    session.tick(player.decide(session.state));
    const resolution = session.state.factoryRoundBattleOrchestrator?.battleResolutionPresentation ?? null;
    const segment = resolution?.segments[resolution.segmentIndex];
    const command = segment?.commands[resolution!.commandIndex];
    let id: string | null = null;
    if (command?.type === "message") {
      const payload = segment!.events.find((e) => e.sequence === command.eventSequence)?.payload as { messageId?: string } | undefined;
      id = payload?.messageId ?? null;
    }
    // sbx1: during a print's lead rows the box still shows the previous message, so a glyph is the command's own text with characters on screen
    const shown = resolution === null ? null : createBattleResolutionPresentationRenderView(resolution).message;
    const glyph = shown !== null && command?.type === "message" && shown.lines === command.lines && shown.visibleCharacters >= 1;
    if (id === "STRINGID_SANDSTORMRAGES" && lastId !== id && glyph) rages = frame;
    if (id === "STRINGID_PKMNBUFFETEDBYSANDSTORM" && lastId !== id && glyph && rages !== null) {
      out.push({ se: se === null ? null : se - rages, buffeted: frame - rages });
      rages = null;
      se = null;
    }
    if (glyph || command?.type !== "message") lastId = id;
  }
  return out;
}

describe("sst1: ordinary play (seed 44, Scene ON: PUPITAR's and ONIX's sandstorms)", () => {
  it("SE_M_SANDSTORM 88 frames after the first print, the buffeted print at 258 or 264 by turn order, as on the ROM", () => {
    // the merge with the box's run re-rolled the test player's round (a trajectory, not a ROM frame): 5 sandstorm end turns, was 6
    const turns = sandstormTurns(44, 6);
    // swt1 (the opponent faint replacement's next print 9 frames later, ROM release +12; the soak player's round shifts): 6 sandstorm end turns again within the 120000-frame cap; the per-turn ROM values are unchanged
    expect(turns.length).toBe(6);
    expect(turns.every((t) => t.se === 88)).toBe(true);
    expect(turns.every((t) => t.buffeted === 258 || t.buffeted === 264)).toBe(true);
    // both cases occur: PUPITAR (unhurt) moved first in the first two turns, YANMA / ELEKID (hurt) first after
    expect(turns.map((t) => t.buffeted)).toEqual([264, 264, 258, 258, 258, 258]);
  }, 120000);
});
