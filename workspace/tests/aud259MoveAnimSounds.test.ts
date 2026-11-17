// aud259: Soft-Boiled (gSoftBoiledEggSpriteTemplate lifetime = the script's `setarg 7, 0xFFFF`, the egg reaches AnimSoftBoiledEgg_Step4 first).
// See docs/aud242-move-anim-sounds.md section 25.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectSoundTick, type SoundEvent } from "../src/audio/soundEvents.ts";
import { createInitialState, tick } from "../src/engine/core.ts";
import timing from "../src/data/gen/anim-sound-timing.json" with { type: "json" };
import { traceAdvances } from "../tools/compare/traceReplay.ts";

interface FixtureEvent { frame: number; kind: string; id: number | null; pan: number | null; noop?: boolean }
interface Fixture { frames: number; events: FixtureEvent[]; trace: { route: "generated-orchestrator" | "canonical-recorded"; battleScene: "on" | "off"; appStage?: { id: string; frame: number }; segments: Array<{ frames: number; buttons?: string[] }> } }
const fixture = (file: string): Fixture => JSON.parse(readFileSync(new URL(`../tools/audio/fixtures/${file}.json`, import.meta.url), "utf8")) as Fixture;
const appTracePath = "../tools/compare/appTrace.ts";
const { APP_STAGES } = (await import(/* @vite-ignore */ appTracePath)) as { APP_STAGES: Record<string, (state: ReturnType<typeof createInitialState>) => ReturnType<typeof createInitialState>> };

function ourEvents(rom: Fixture): SoundEvent[] {
  let state = createInitialState({ appRoute: rom.trace.route, battleScene: rom.trace.battleScene });
  if (rom.trace.appStage !== undefined) state = APP_STAGES[rom.trace.appStage.id]!(state);
  const events: SoundEvent[] = [];
  for (const advance of traceAdvances(rom.trace.segments)) {
    if (advance.frame > rom.frames) break;
    const result = collectSoundTick(state.frame + 1, () => tick(state, advance.buttons));
    state = result.result;
    events.push(...result.events);
  }
  return events;
}

describe("Soft Boiled (aud259)", () => {
  const entry = timing.moves[135]!;
  it("the table entry: SE 167 at 12, 166 at 143 (delay 120 + 7), 179 at 217 (after the egg wait at setarg + 1), ungated", () => {
    expect(entry.label).toBe("Move_SOFT_BOILED");
    expect(entry.gated.every((g) => g === 0)).toBe(true);
    const rows = timing.variants[entry.variants[0]!]!.map((o) => `${o.op}:${o.frame}:${(o as { id?: number }).id}:${o.pan}`);
    expect(rows).toEqual(["playsewithpan:12:167:-64", "playsewithpan:143:166:-64", "playsewithpan:217:179:63"]);
  });
  it("aud259-softboiled-player (the second turn's heal; the first fails at full HP): ids, pans and the 131 / 74-frame gaps equal the ROM's, offset constant", () => {
    const rom = fixture("aud259-softboiled-player");
    const pick = (events: FixtureEvent[]) => events.filter((e) => e.noop !== true && e.kind === "se" && [167, 166, 179].includes(e.id as number));
    const romRows = pick(rom.events);
    const ours = pick(ourEvents(rom));
    expect(romRows.map((e) => `${e.id}:${e.pan}`)).toEqual(["167:-64", "166:-64", "179:-64"]);
    expect(romRows.map((e) => e.frame - romRows[0]!.frame)).toEqual([0, 131, 205]);
    expect(ours.map((e) => `${e.id}:${e.pan}`)).toEqual(romRows.map((e) => `${e.id}:${e.pan}`));
    const offsets = romRows.map((e, i) => e.frame - ours[i]!.frame);
    expect(new Set(offsets).size).toBe(1);
    expect(offsets[0]).toBe(-5);
  });
});
