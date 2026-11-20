// snd1 (Kyle's 2026-11-20 live play: Delibird's Ice Ball "sounds really weird"). ROM window tools/audio/fixtures/aud242q-iceball5-player.json
// (five Ice Ball rolls, Scene ON): SE_M_ICY_WIND (137), SE_M_BRICK_BREAK (198) 30 frames later, then the effectiveness SE the frame before each
// hit. Two faults: SE 198 had no recording (tests/snd1EmittedSesHaveAssets.test.ts), and a lead body's effectiveness SE was scheduled from an
// anchor that subtracted every earlier lead body of the presentation, so it came 12 / 30 / 48 / 63 / 77 frames early and, from roll 3, before the
// impact. It now starts with our hit (src/engine/battleHitSounds.ts).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectSoundTick } from "../src/audio/soundEvents.ts";
import { createInitialState, tick } from "../src/engine/core.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";

const fx = JSON.parse(readFileSync(new URL("../tools/audio/fixtures/aud242q-iceball5-player.json", import.meta.url), "utf8")) as {
  frames: number;
  events: { frame: number; kind: string; id: number | null; noop?: boolean }[];
  trace: { route: "generated-orchestrator"; battleScene: "on"; appStage: { id: string }; segments: { frames: number; buttons?: string[] }[] };
};
const appTracePath = "../tools/compare/appTrace.ts";
const { APP_STAGES } = (await import(/* @vite-ignore */ appTracePath)) as {
  APP_STAGES: Record<string, (state: ReturnType<typeof createInitialState>) => ReturnType<typeof createInitialState>>;
};

function frames(id: number): number[] {
  let state = APP_STAGES[fx.trace.appStage.id]!(createInitialState({ appRoute: fx.trace.route, battleScene: fx.trace.battleScene }));
  const out: number[] = [];
  for (const advance of traceAdvances(fx.trace.segments)) {
    if (advance.frame > fx.frames) break;
    const result = collectSoundTick(state.frame + 1, () => tick(state, advance.buttons));
    state = result.result;
    for (const e of result.events) if (e.kind === "se" && e.id === id) out.push(advance.frame);
  }
  return out;
}
const rom = (id: number): number[] => fx.events.filter((e) => !e.noop && e.kind === "se" && e.id === id).map((e) => e.frame);

describe("Ice Ball: the effectiveness SE follows the impact on every roll (aud242q ROM window)", () => {
  it("ROM: impact 30 frames after the whoosh, the effectiveness SE 41 frames after the impact on rolls 1-4 (96 with roll 5's ice background)", () => {
    const impact = rom(198);
    expect(rom(137).map((f, i) => impact[i]! - f)).toEqual([30, 30, 30, 30, 30]);
    expect(rom(13).map((f, i) => f - impact[i]!)).toEqual([41, 41, 41, 41, 96]);
  });

  it("ours: the effectiveness SE is within a frame of the ROM's on rolls 1-3 and never before the impact", () => {
    const ours = frames(13);
    const impact = frames(198);
    expect(ours.map((f, i) => f - rom(13)[i]!)).toEqual([1, 1, 1, 4, 8]); // rolls 4 / 5: our hit's own drift (hpd5)
    for (const [i, f] of ours.entries()) expect(f - impact[i]!, `roll ${i + 1}`).toBeGreaterThan(30);
  });
});
