// aud260: T1 0..99 missing-gated tail (docs/aud242-move-anim-sounds.md section 26).
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

const tableRows = (move: number, variant: number) =>
  timing.variants[timing.moves[move]!.variants[variant]!]!.map((o) => `${o.frame}:${(o as { id?: number }).id}`);

function expectConstantOffset(rom: Fixture, ids: number[], last: number): number {
  const pick = (events: FixtureEvent[]) => events.filter((e) => e.noop !== true && e.kind === "se" && ids.includes(e.id as number)).slice(-last);
  const romRows = pick(rom.events);
  const ours = pick(ourEvents(rom));
  expect(ours.map((e) => `${e.id}:${e.pan}`)).toEqual(romRows.map((e) => `${e.id}:${e.pan}`));
  const offsets = romRows.map((e, i) => e.frame - ours[i]!.frame);
  expect(new Set(offsets).size).toBe(1);
  return offsets[0]!;
}

// Turn 2 against a Reflect target (the ROM's second Brick Break: 122 @1113, 122 @1142, 123 @1203, 198 @1215): AnimBrickBreakWall (battle_anim_fight.c:690-742) is gone 99 ticks after
// its creation (args 90, 10), so the first waitforvisualfinish ends at the fist's SE and the shard SE 198 follows 12 frames after SE 123.
describe("Brick Break turn 2 (aud260)", () => {
  it("the table entry: shattered-wall variants are ungated with the shard SE 198 at 126", () => {
    expect(timing.moves[280]!.gated.every((g) => g === 0)).toBe(true);
    expect(tableRows(280, 2)).toEqual(["24:122", "53:122", "114:123", "126:198"]);
    expect(tableRows(280, 0)).toEqual(["24:122", "53:122", "114:123"]);
  });
  it("aud260-brickbreak-player: ROM-minus-ours is one constant over turn 2's four rows", () => {
    const rom = fixture("aud260-brickbreak-player");
    expect(expectConstantOffset(rom, [122, 123, 198], 4)).toBe(2);
  });
});
