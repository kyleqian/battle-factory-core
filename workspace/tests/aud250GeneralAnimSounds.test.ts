// aud250: FOCUS_PUNCH_SETUP / LEECH_SEED_DRAIN / CASTFORM_CHANGE General_* animation SEs, calibrated on ROM windows (tools/audio/fixtures/aud250-*.json,
// committed soundEventProbe.py output; no emulator needed). Command age -> script row anchors: 5 / 7 / 5 (docs/aud250-general-anim-sounds.md).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectSoundTick, type SoundEvent } from "../src/audio/soundEvents.ts";
import { createInitialState, tick } from "../src/engine/core.ts";
import { CFF232_CLASSES } from "../tools/integration/cff232Classes.ts";
import { SND233_ON_ROM_COMMAND_START } from "../tools/integration/snd233CastformOn.ts";
import { cff230Route } from "../tools/integration/cff230Route.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";

interface FixtureEvent { frame: number; kind: string; id: number | null; pan: number | null; noop?: boolean }
interface Fixture { frames: number; events: FixtureEvent[]; trace: { route: "generated-orchestrator" | "canonical-recorded"; battleScene?: "on" | "off"; appStage?: { id: string; frame: number }; segments: Array<{ frames: number; buttons?: string[] }> } }
const appTracePath = "../tools/compare/appTrace.ts";
const { APP_STAGES } = (await import(/* @vite-ignore */ appTracePath)) as {
  APP_STAGES: Record<string, (state: ReturnType<typeof createInitialState>) => ReturnType<typeof createInitialState>>;
};
const load = (name: string): Fixture => JSON.parse(readFileSync(new URL(`../tools/audio/fixtures/${name}.json`, import.meta.url), "utf8")) as Fixture;

function ourEvents(rom: Fixture): SoundEvent[] {
  let state = createInitialState({ appRoute: rom.trace.route, battleScene: rom.trace.battleScene ?? "on" });
  if (rom.trace.appStage !== undefined && rom.trace.appStage.frame === 0) state = APP_STAGES[rom.trace.appStage.id]!(state);
  const events: SoundEvent[] = [];
  for (const advance of traceAdvances(rom.trace.segments)) {
    if (advance.frame > rom.frames) break;
    const result = collectSoundTick(state.frame + 1, () => tick(state, advance.buttons));
    state = result.result;
    events.push(...result.events);
  }
  return events;
}
const rows = (events: Array<{ frame: number; kind: string; id: number | null; pan: number | null }>, ids: number[]) =>
  events.filter((e) => e.kind === "se" && e.id !== null && ids.includes(e.id)).map((e) => `${e.id}@${e.frame}(${e.pan})`);

describe("FOCUS_PUNCH_SETUP / LEECH_SEED_DRAIN / CASTFORM_CHANGE sound rows (aud250)", () => {
  for (const name of ["aud250-focuspunch-player", "aud250-focuspunch-opponent"]) {
    it(`${name}: SE 171 at the ROM frame and pan`, () => {
      const rom = load(name);
      expect(rows(ourEvents(rom), [171])).toEqual(rows(rom.events, [171]));
      expect(rows(rom.events, [171]).length).toBe(1);
    });
  }
  for (const name of ["aud250-leechseed-player", "aud250-leechseed-opponent"]) {
    it(`${name}: LeechSeedDrain 180, eight 142 rows (6-frame spacing) and 179 at the ROM frames and pans`, () => {
      const rom = load(name);
      const ids = [180, 142, 179];
      expect(rows(ourEvents(rom), ids)).toEqual(rows(rom.events, ids));
      expect(rows(rom.events, ids).length).toBe(10);
    });
  }
  // The Castform ROM windows are the cff232 mechanic-lab (rain-opp, seed 651 census route). cff232 / snd233 align engine and ROM rows on the lead command (anchorCommand):
  // ROM frame = romCommandStart - leadRows + (engine frame - first presenting frame of the anchor command). The ROM has SE 203 / 204 at 354 / 403 (Scene ON), 198 / 247 (OFF).
  const castform = CFF232_CLASSES.find((c) => c.name === "opponent-water-after-rain-dance")!;
  for (const [scene, romStart, romRows] of [["on", SND233_ON_ROM_COMMAND_START, [354, 403]], ["off", castform.romCommandStart, [198, 247]]] as const) {
    it(`Scene ${scene.toUpperCase()}: CastformChange 203 / 204 at the ROM frames ${romRows.join(" / ")}, pan 63 (ROM rain-opp window)`, () => {
      let anchorStart = -1;
      const got: Array<{ id: number; pan: number | null; romFrame: number }> = [];
      cff230Route(castform.seed, false, 1, scene, (frame, state, sounds) => {
        const res = state.battleResolutionPresentation;
        const here = res?.segments[res.segmentIndex]?.events.some((e: any) => e.payload.animationId === "CASTFORM_CHANGE");
        if (anchorStart < 0 && here === true && res.commandIndex === castform.anchorCommand && res.lifecycle.phase === "presenting") anchorStart = frame;
        for (const e of sounds) if (anchorStart >= 0 && e.kind === "se" && (e.id === 203 || e.id === 204)) got.push({ id: e.id!, pan: e.pan, romFrame: romStart - castform.leadRows + frame - anchorStart });
      });
      expect(anchorStart).toBeGreaterThan(0);
      expect(got).toEqual([{ id: 203, pan: 63, romFrame: romRows[0] }, { id: 204, pan: 63, romFrame: romRows[1] }]);
    });
  }
});
