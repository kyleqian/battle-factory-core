// sst1 (docs/sst1-sandstorm-continues.md): the end-turn sandstorm, Scene ON. ROM (frame catcher, 15 end turns in two runs), from the first
// glyph of "The sandstorm rages.": SE_M_SANDSTORM at +88 (ours +96), the sand pictures +95..+248 on both sides, and the first glyph of
// "{X} is buffeted by the sandstorm!" at +258 when the first battler in turn order is hurt and +264 when it is not (ours +256 always):
// BattleScript_DamagingWeatherContinues runs one script command a frame, and an unhurt battler adds LoopIncrement's three commands and the
// loop's next three.
import { describe, expect, it } from "vitest";
import {
  WEATHER_CONTINUES_LAUNCH_TAIL_ROWS,
  sandstormContinuesTailRows,
} from "../src/engine/battleResolutionPresentation.ts";
import { createBattleResolutionPresentationRenderView } from "../src/engine/battleResolutionPresentationRender.ts";
import type { BattleKernelSemanticEvent } from "../src/engine/battleDecisionBoundary.ts";
import { FactorySession } from "../src/factorySession.ts";
import { ActionLog, RandomPlayer, Rng } from "../tools/soak/randomRoundSoakDriver.ts";

const event = (sequence: number, payload: Record<string, unknown>, instructionExecution?: number) =>
  ({ sequence, payload, provenance: instructionExecution === undefined ? undefined : { instructionExecution } }) as unknown as BattleKernelSemanticEvent;

describe("sst1: the sandstorm's script rows after its body", () => {
  it("the tail is the script's instructions from playanimation_var to the first buffeted print", () => {
    const anim = event(1, { kind: "animation", animationId: "WEATHER_VAR", arguments: ["12"] }, 66);
    const hurtFirst = [anim, event(2, { kind: "message", messageId: "STRINGID_PKMNBUFFETEDBYSANDSTORM" }, 71)];
    const unhurtFirst = [anim, event(2, { kind: "message", messageId: "STRINGID_PKMNBUFFETEDBYSANDSTORM" }, 77)];
    expect(sandstormContinuesTailRows(hurtFirst, 0)).toBe(5);
    expect(sandstormContinuesTailRows(unhurtFirst, 0)).toBe(11);
    // no buffeted print in the run (neither battler hurt, or another message first): the old tail
    expect(sandstormContinuesTailRows([anim, event(2, { kind: "message", messageId: "STRINGID_PKMNSTOPPEDSPEED" }, 80)], 0)).toBe(WEATHER_CONTINUES_LAUNCH_TAIL_ROWS);
    expect(sandstormContinuesTailRows([anim], 0)).toBe(WEATHER_CONTINUES_LAUNCH_TAIL_ROWS);
  });
});

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
    const glyph = resolution !== null && (createBattleResolutionPresentationRenderView(resolution).message?.visibleCharacters ?? 0) >= 1;
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
    const turns = sandstormTurns(44, 6);
    expect(turns.length).toBe(6);
    expect(turns.every((t) => t.se === 88)).toBe(true);
    expect(turns.every((t) => t.buffeted === 258 || t.buffeted === 264)).toBe(true);
    // both cases occur: PUPITAR (unhurt) moved first in the first two turns, YANMA / ELEKID (hurt) first after
    expect(turns.map((t) => t.buffeted)).toEqual([264, 264, 258, 258, 258, 258]);
  }, 120000);
});
