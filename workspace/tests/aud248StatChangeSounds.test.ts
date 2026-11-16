// aud248: General_StatsChange's SE (SE_M_STAT_INCREASE 239 / SE_M_STAT_DECREASE 245, pan SOUND_PAN_ATTACKER via BattleAnimAdjustPanning2) in both scenes.
// Fixtures are committed oracle output of tools/audio/soundEventProbe.py (Scene ON move windows that contain a stat change); needs no emulator.
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectSoundTick, type SoundEvent } from "../src/audio/soundEvents.ts";
import { createInitialState, tick } from "../src/engine/core.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";

interface FixtureEvent { frame: number; kind: string; id: number | null; pan: number | null; noop?: boolean }
interface Fixture {
  frames: number;
  events: FixtureEvent[];
  trace: { route: "generated-orchestrator" | "canonical-recorded"; battleScene: "on" | "off"; appStage?: { id: string; frame: number }; segments: Array<{ frames: number; buttons?: string[] }> };
}

const dir = new URL("../tools/audio/fixtures/", import.meta.url);
const isStat = (e: FixtureEvent | SoundEvent): boolean => e.kind === "se" && (e.id === 239 || e.id === 245);
const appTracePath = "../tools/compare/appTrace.ts";
const { APP_STAGES } = (await import(/* @vite-ignore */ appTracePath)) as {
  APP_STAGES: Record<string, (state: ReturnType<typeof createInitialState>) => ReturnType<typeof createInitialState>>;
};

function ourStatSes(rom: Fixture, scene: "on" | "off"): SoundEvent[] {
  const { appStage } = rom.trace;
  let state = createInitialState({ appRoute: rom.trace.route, battleScene: scene });
  if (appStage !== undefined && appStage.frame === 0) state = APP_STAGES[appStage.id]!(state);
  const events: SoundEvent[] = [];
  for (const advance of traceAdvances(rom.trace.segments)) {
    if (advance.frame > rom.frames) break;
    const result = collectSoundTick(state.frame + 1, () => tick(state, advance.buttons));
    state = result.result;
    events.push(...result.events);
  }
  return events.filter(isStat);
}

// ROM frame minus our frame, per fixture window (null = we emit no stat SE there). The stat-change command starts after the move body, whose
// presentation length is not yet ROM-exact in these windows (the clock K = STATS_CHANGE_SE_AGE is exact in the ROM-aligned census seeds, docs/aud248-s11-scoreboard.md);
// the metalclaw / steelwing / silverwind / ancientpower rows come from a move's secondary effect that our presentation does not run as a stats-change command (named gap).
const RESIDUAL: Record<string, number | null> = {
  "aud242a-agility-player.json": -2, "aud242a-swordsdance-opponent.json": -2, "aud242c-cosmicpower-player.json": 2, "aud242c-flatter-player.json": 5,
  "aud242c-metalsound-opponent.json": 0, "aud242c-superpower-player.json": 17, "aud242c-sweetscent-player.json": -1, "aud242d-calmmind-player.json": 0,
  "aud242d-metalclaw-player.json": null, "aud242d-steelwing-player.json": null, "aud242e-overheat-player.json": 17, "aud242f-growth-player.json": 23, "aud242f-swagger-player.json": 6,
  "aud242j-silverwind-player.json": null,
  "aud242k-ancientpower-player.json": null, "aud242k-scaryface-player.json": 14, "aud242k-smokescreen-player.json": 0,
};

const names = readdirSync(dir).filter((n) => /^aud242.*\.json$/.test(n));
const fixtures = names.map((n) => [n, JSON.parse(readFileSync(new URL(n, dir), "utf8")) as Fixture] as const).filter(([, f]) => f.events.some(isStat));

describe("stat-change SEs (aud248)", () => {
  it("has fixtures covering rises and falls on both sides", () => {
    const rows = fixtures.flatMap(([, f]) => f.events.filter(isStat));
    expect(rows.some((e) => e.id === 239) && rows.some((e) => e.id === 245)).toBe(true);
    expect(rows.some((e) => e.pan === -64) && rows.some((e) => e.pan === 64)).toBe(true);
  });

  it("every fixture window has a named residual", () => {
    expect(fixtures.map(([n]) => n).sort()).toEqual(Object.keys(RESIDUAL).sort());
  });

  for (const [name, rom] of fixtures) {
    const residual = RESIDUAL[name];
    it(`${name}: ${residual === null ? "no stat SE is emitted (named gap)" : `our stat SE equals the ROM's id and pan at a ${residual} frame residual`}`, () => {
      const ours = ourStatSes(rom, rom.trace.battleScene);
      const theirs = rom.events.filter((e) => e.noop !== true && isStat(e));
      if (residual === null) {
        expect(ours).toEqual([]);
        return;
      }
      expect(ours.map((e) => `${e.frame + residual}:${e.id}:${e.pan}`)).toEqual(theirs.map((e) => `${e.frame}:${e.id}:${e.pan}`));
    });
  }

  it("Scene OFF plays the stat SE too (the stat-change animation runs in both scenes)", () => {
    const rom = fixtures.find(([n]) => RESIDUAL[n] !== null)![1];
    expect(ourStatSes(rom, "off").length).toBeGreaterThan(0);
  });
});
