// aud262: T1 0..999 missing-gated tail, the power / HP / elevation / height dimensions (docs/aud242-move-anim-sounds.md section 28).
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

function expectConstantOffset(rom: Fixture, ids: number[], count: number, from: "first" | "last" = "last"): number {
  const pick = (events: FixtureEvent[]) => { const rows = events.filter((e) => e.noop !== true && e.kind === "se" && ids.includes(e.id as number)); return from === "last" ? rows.slice(-count) : rows.slice(0, count); };
  const romRows = pick(rom.events);
  const ours = pick(ourEvents(rom));
  expect(ours.map((e) => `${e.id}:${e.pan}`)).toEqual(romRows.map((e) => `${e.id}:${e.pan}`));
  const offsets = romRows.map((e, i) => e.frame - ours[i]!.frame);
  expect(new Set(offsets).size).toBe(1);
  return offsets[0]!;
}

// AnimTask_IsPowerOver99 (battle_anim_ground.c:734-742) writes ARG_RET_ID and Move_MAGNITUDE branches on it: MagnitudeRegular and MagnitudeIntense both start the 10-row SE_M_STRENGTH loop in the
// same script step (the intense branch only adds palette blends after it), so the branch is resolved and needs no power key in the table: ROM 214 x10 nine frames apart.
describe("Magnitude (aud262)", () => {
  it("the table entry: one SE_M_STRENGTH loop at frame 0 (both power branches), ungated", () => {
    expect(timing.moves[222]!.label).toBe("Move_MAGNITUDE");
    expect(timing.moves[222]!.gated.every((g) => g === 0)).toBe(true);
    expect(timing.variants[timing.moves[222]!.variants[0]!]!.map((o) => `${o.op}:${o.frame}:${(o as { times?: number }).times}`)).toEqual(["loopsewithpan:0:10"]);
  });
  for (const [side, pan] of [["player", 63], ["opponent", -63]] as const) {
    it(`aud262-magnitude-${side}: ids, pans and the 9-frame loop equal the ROM's, offset constant`, () => {
      const rom = fixture(`aud262-magnitude-${side}`);
      const romRows = rom.events.filter((e) => e.kind === "se" && e.id === 214).slice(0, 10);
      expect(romRows.map((e) => e.frame - romRows[0]!.frame)).toEqual([0, 8, 17, 26, 35, 44, 53, 62, 71, 80]);
      expect(romRows.every((e) => e.pan === pan)).toBe(true);
      expect(expectConstantOffset(rom, [214], 10, "first")).toBe(3);
    });
  }
});
