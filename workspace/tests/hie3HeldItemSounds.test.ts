// hie3 (ISSUES #220 step 3): General_HeldItemEffect SEs 152 x3 / 228 / 102 in Scene ON, against step-mode ROM probe windows
// (tools/audio/fixtures/hie3-*-on.json, soundEventProbe.py `lab` of tools/battle-lab/hie1-*-on.json / hie2-sitrus-opp-on.json; docs/hie3-held-item-sounds.md).
// The engine's lab runs ahead of the ROM before the segment (docs/hie2-held-item-render.md); the per-lab drift below is that measured pre-segment offset.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectSoundTick } from "../src/audio/soundEvents.ts";
import { createInitialState, tick } from "../src/engine/core.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";

interface FixtureEvent { frame: number; kind: string; id: number | null; pan: number | null }
interface Fixture { frames: number; events: FixtureEvent[]; trace: { route: "generated-orchestrator"; battleScene: "on" | "off"; appStage: { id: string; frame: number }; segments: Array<{ frames: number; buttons?: string[] }> } }
const appTracePath = "../tools/compare/appTrace.ts";
const { APP_STAGES } = (await import(/* @vite-ignore */ appTracePath)) as {
  APP_STAGES: Record<string, (state: ReturnType<typeof createInitialState>) => ReturnType<typeof createInitialState>>;
};
const load = (name: string): Fixture => JSON.parse(readFileSync(new URL(`../tools/audio/fixtures/${name}.json`, import.meta.url), "utf8")) as Fixture;
const HELD_IDS = [152, 228, 102];

/** The engine's SE rows of the window, with the first frame the HELD_ITEM_EFFECT command presents. */
function replay(rom: Fixture): { rows: string[]; commandStart: number } {
  let state = createInitialState({ appRoute: rom.trace.route, battleScene: rom.trace.battleScene });
  state = APP_STAGES[rom.trace.appStage.id]!(state);
  const rows: string[] = [];
  let commandStart = -1;
  for (const advance of traceAdvances(rom.trace.segments)) {
    if (advance.frame > rom.frames) break;
    const result = collectSoundTick(state.frame + 1, () => tick(state, advance.buttons));
    state = result.result;
    const res = (state as any).factoryRoundBattleOrchestrator?.battleResolutionPresentation;
    const command = res?.segments[res.segmentIndex]?.commands[res.commandIndex];
    if (commandStart < 0 && command?.type === "general-animation" && command.animation === "HELD_ITEM_EFFECT" && res.lifecycle.phase === "presenting") commandStart = advance.frame;
    for (const e of result.events) if (e.kind === "se" && e.id !== null && HELD_IDS.includes(e.id)) rows.push(`${e.id}@${e.frame}(${e.pan})`);
  }
  return { rows, commandStart };
}
const romRows = (rom: Fixture, drift: number) => rom.events.filter((e) => e.kind === "se" && e.id !== null && HELD_IDS.includes(e.id)).map((e) => `${e.id}@${e.frame - drift}(${e.pan})`);
// ROM first SE frame (script frame 8), the lab's pre-segment drift (app ahead of the ROM), engine command start, pan. hpd4: the floor-free foe-hit hold starts the held-item command 1 row later in sitrus-opp / leftovers / cheri (drift 9 / 17 / 20 -> 8 / 16 / 19, toward the ROM). hpd5: Seismic Toss (the lab's attack) joins the audited leads (6-row lead, level-aware 220 / 227 / 231 body, 1-row tail), so the held-item command starts 7 rows later per Toss before it and the drift falls 9 / 8 / 17 / 16 / 19 -> 2 / 1 / 3 / 2 / 12. hpf1: the Seismic Toss on the player carries its ROM post-hp hold (tail rows, no floor), 1 row more before the held-item command in sitrus-on / shellbell-on: drift 2 / 3 -> 1 / 2.
const SITES = [
  { name: "hie3-sitrus-on", first: 754, drift: 1, commandStart: 730, pan: -64 },
  { name: "hie3-sitrus-opp-on", first: 754, drift: 1, commandStart: 730, pan: 63 },
  { name: "hie3-shellbell-on", first: 766, drift: 2, commandStart: 747, pan: -64 },
  { name: "hie3-leftovers-on", first: 772, drift: 2, commandStart: 747, pan: -64 },
  { name: "hie3-cheri-on", first: 737, drift: 12, commandStart: 739, pan: -64 },
] as const;
const SPACING: ReadonlyArray<readonly [number, number]> = [[152, 0], [152, 32], [152, 64], [228, 96], [102, 168]];

describe("General_HeldItemEffect SEs (hie3, Scene ON)", () => {
  for (const site of SITES) {
    it(`${site.name}: ROM rows 152 / 152 / 152 / 228 / 102 at +0 / 32 / 64 / 96 / 168, and the engine plays them at the ROM frame minus the lab drift`, () => {
      const rom = load(site.name);
      expect(rom.events.filter((e) => e.kind === "se" && e.id !== null && HELD_IDS.includes(e.id)).map((e) => [e.id, e.frame - site.first, e.pan])).toEqual(SPACING.map(([id, at]) => [id, at, site.pan]));
      expect(rom.events.find((e) => e.id === 152)!.frame).toBe(site.first);
      const ours = replay(rom);
      expect(ours.commandStart).toBe(site.commandStart);
      expect(ours.rows).toEqual(romRows(rom, site.drift));
    });
  }

  it("the first SE is drift-free: 23 frames into a restart command (Sitrus, Leftovers, either side), 17 into a continuation (Shell Bell), 14 before a cure berry command", () => {
    const starts = SITES.map((s) => s.first - s.drift - s.commandStart);
    expect(starts).toEqual([23, 23, 17, 23, -14]);
  });

  it("Scene OFF presents no General_HeldItemEffect SE (the ROM runs Pausex20)", () => {
    const lab = JSON.parse(readFileSync(new URL("../tools/battle-lab/hie1-sitrus-off.json", import.meta.url), "utf8")) as { trace: { segments: Fixture["trace"]["segments"] } };
    const rom: Fixture = { frames: 1822, events: [], trace: { route: "generated-orchestrator", battleScene: "off", appStage: { id: "hie1-sitrus-off", frame: 0 }, segments: lab.trace.segments } };
    expect(replay(rom).rows).toEqual([]);
  });
});
