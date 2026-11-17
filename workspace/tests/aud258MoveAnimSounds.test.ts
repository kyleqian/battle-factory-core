// aud258: Seismic Toss (AnimTask_MoveSeismicTossBg exact 119 + the jumpreteq on AnimTask_GetSeismicTossDamageLevel resolved from the battle's damage; the extractor's damage grid).
// ROM windows = the committed aud242a/b/e fixtures whose opponent / player Seismic Toss (Weak: damage < 33 in those low-level labs) used to be ROM-only rows.
// See docs/aud242-move-anim-sounds.md section 24.
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
const seismic = (events: Array<{ frame: number; kind: string; id: number | null; pan: number | null; noop?: boolean }>) =>
  events.filter((e) => e.noop !== true && e.kind === "se" && (e.id === 214 || e.id === 131 || (e.id === 238 && e.pan === 0)));

describe("Seismic Toss (aud258)", () => {
  const entry = timing.moves[69]!;
  const variant = (index: number) => timing.variants[index]!;
  it("the table entry: SE 238 at frame 31 (after the BG fade), then the damage level's rocks; every level ends ungated", () => {
    expect(entry.label).toBe("Move_SEISMIC_TOSS");
    expect(entry.gated[0]).toBe(0);
    const grid = timing.damageGrids[(entry as { damage?: number[] }).damage![0]!]!;
    const rows = grid.map((v) => variant(v).map((o) => `${o.op}:${o.frame}:${(o as { id?: number }).id}`));
    const rock = (frame: number, id: number) => `playsewithpan:${frame}:${id}`;
    expect(rows[0]).toEqual([rock(31, 238), rock(151, 214), rock(169, 131)]);
    expect(rows[1]).toEqual([rock(31, 238), rock(151, 214), rock(167, 131), rock(183, 214)]);
    expect(rows[2]).toEqual([rock(31, 238), rock(151, 131), rock(163, 214), rock(175, 131), rock(187, 214)]);
  });
  const SPECS: Array<{ file: string; opening: number; offset: number }> = [
    { file: "aud242a-swordsdance-opponent", opening: 407, offset: 1 },
    { file: "aud242b-haze-player", opening: 435, offset: 2 },
    { file: "aud242e-counter-player", opening: 101, offset: 0 },
  ];
  for (const spec of SPECS) {
    it(`${spec.file}: the Weak rows (238, 214 at +120, 131 at +138) equal the ROM's in id / pan / gaps; ROM minus ours is ${spec.offset} on every row`, () => {
      const rom = fixture(spec.file);
      const romRows = seismic(rom.events);
      const ours = seismic(ourEvents(rom));
      expect(romRows.map((e) => e.id)).toEqual([238, 214, 131]);
      expect(romRows[0]!.frame).toBe(spec.opening);
      expect(romRows.map((e) => e.frame - spec.opening)).toEqual([0, 120, 138]);
      expect(ours.map((e) => `${e.id}:${e.pan}`)).toEqual(romRows.map((e) => `${e.id}:${e.pan}`));
      expect(romRows.map((e, i) => e.frame - ours[i]!.frame)).toEqual([spec.offset, spec.offset, spec.offset]);
    });
  }
});
