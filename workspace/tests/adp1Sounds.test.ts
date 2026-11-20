// adp1: the SE rows of Withdraw / Rock Smash / Beat Up (docs/adp1-withdraw-rocksmash-beatup.md section 4), ROM windows in probe step mode, Scene ON, player attacker.
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

const pick = (events: FixtureEvent[], ids: readonly number[]) => events.filter((e) => e.noop !== true && e.kind === "se" && ids.includes(e.id as number));

describe("adp1 move SEs", () => {
  const windows = [
    ["withdraw", 110, [162], [0], [-4], "Move_WITHDRAW"],
    ["rocksmash", 249, [123, 131], [0, 11], [0, 0], "Move_ROCK_SMASH"],
    // The in-hit spacing (10) is exact; the hit-to-hit gap is 193 in the ROM (printstring, attack, two waitmessage LONG) and 195 here, so ROM minus ours is -2 per hit.
    // hpf3: it was 132 (ROM minus ours +61 per hit) while the hp command kept the 28-row floor; the hpf1 / hpf2 length for hit -> print is the ROM's (hpf2Shape on adp1s-beatup-player-on: ROM bar rise -> next rise +91 for hits 1 and 2, the app's hp command is 91 long).
    ["beatup", 251, [123], [0, 10, 193, 203, 386, 396], [28, 28, 26, 26, 24, 24], "Move_BEAT_UP"],
  ] as const;
  for (const [name, move, ids, rel, expectedOffsets, label] of windows) {
    it(`the table entry of ${label} carries the SE rows`, () => {
      const entry = (timing.moves as unknown as Record<string, { label: string; variants: number[] }>)[String(move)]!;
      expect(entry.label).toBe(label);
    });
    it(`adp1s-${name}-player: ROM SE spacing ${rel.join("/")}, ids and pans equal, ROM minus ours pinned`, () => {
      const rom = fixture(`adp1s-${name}-player`);
      const romRows = pick(rom.events, ids);
      const ours = pick(ourEvents(rom), ids);
      expect(romRows.map((e) => e.frame - romRows[0]!.frame)).toEqual(rel);
      expect(ours.map((e) => `${e.id}:${e.pan}`)).toEqual(romRows.map((e) => `${e.id}:${e.pan}`));
      const offsets = romRows.map((e, i) => e.frame - ours[i]!.frame);
      expect(offsets).toEqual(expectedOffsets);
    });
  }
});
