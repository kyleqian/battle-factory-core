// cry1 (ISSUES #219 family 3): the cry-task rows (first cries, second cries, stops, BGM restore) of Roar / Howl / Hyper Voice in Scene ON, against step-mode ROM probe windows
// (tools/audio/fixtures/cry1-*.json, soundEventProbe.py `lab` of tools/battle-lab/cry1-*.json; docs/cry1-cry-tasks.md).
// The engine's labs differ from the ROM before the move (earlier-turn text / hit timing); the per-lab drift below is engine minus ROM at the first cry.
// hpd6: cry1-roar-pidgey-opp-on drift 1 -> 2, command start 392 -> 393: the floor-free foe-hit hp hold (hpd4, bar + 1) of the lab's earlier Seismic Toss is 1 row longer; the Toss hit SE -> first cry interval goes 114 -> 115 against the ROM's 120 (hit SE 288 -> cry 408).
// hpf2: cry1-roar-{pidgey,jynx}-player-on drift 13 -> -1, command start 388 / 386 -> 374 / 372: the earlier turn's heal / recoil hp rows are now the ROM's hp -> print hold (no 28-row floor); the first cry is 1 frame before the ROM's instead of 13 after.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectSoundTick, type SoundEvent } from "../src/audio/soundEvents.ts";
import { createInitialState, tick } from "../src/engine/core.ts";
import { emitCryTaskRows } from "../src/engine/moveAnimSounds.ts";
import { beginScreenSoundTick, runScheduledScreenSounds } from "../src/engine/screenSounds.ts";
import { CRY_ECHO_END_FRAMES, CRY_ECHO_START_FRAMES, CRY_HIGH_PITCH_FRAMES, CRY_ROAR_2_FRAMES } from "../src/data/cryModeFrames.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";

interface FixtureEvent { frame: number; kind: string; id: number | null; pan: number | null; mode?: string; volume?: number; noop?: boolean; via?: string }
interface Fixture { frames: number; events: FixtureEvent[]; trace: { route: "generated-orchestrator"; battleScene: "on" | "off"; appStage: { id: string; frame: number }; segments: Array<{ frames: number; buttons?: string[] }> } }
const appTracePath = "../tools/compare/appTrace.ts";
const { APP_STAGES } = (await import(/* @vite-ignore */ appTracePath)) as {
  APP_STAGES: Record<string, (state: ReturnType<typeof createInitialState>) => ReturnType<typeof createInitialState>>;
};
const load = (name: string): Fixture => JSON.parse(readFileSync(new URL(`../tools/audio/fixtures/${name}.json`, import.meta.url), "utf8")) as Fixture;
const MOVES = [46, 336, 304];
const BGM = 476;

/** The engine's cry / duck rows of the window, with the first frame the cry move's animation command presents. */
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
    if (commandStart < 0 && command?.type === "move-animation" && res.lifecycle.phase === "presenting" && MOVES.includes(command.animation?.moveId)) commandStart = advance.frame;
    for (const e of result.events) if (e.kind === "cry" || e.kind === "duck" || (e.kind === "stop" && (e as any).player === "cry")) rows.push(describe_(e.frame, e.kind, e.id, e.pan, (e as any).mode, e.volume));
  }
  return { rows, commandStart };
}
const describe_ = (frame: number, kind: string, id: number | null, pan: number | null, mode: number | undefined, volume: number | undefined): string =>
  kind === "duck" ? `duck@${frame}:${volume}` : kind === "stop" ? `stop@${frame}` : `cry@${frame}:${id}:${pan}:${mode}`;

const MODE_ID: Record<string, number> = { HIGH_PITCH: 3, ECHO_START: 4, ECHO_END: 6, ROAR_1: 7, ROAR_2: 8 };
/** First cry rows of the ROM window: the effective BGM duck (85) and the cry (noop duck rows are ROM log noise: the BGM is already at 85). */
function romFirstCry(rom: Fixture): { duck: number; cry: FixtureEvent } {
  const cry = rom.events.find((e) => e.kind === "cry" && e.mode !== undefined && e.mode in MODE_ID)!;
  const duck = rom.events.find((e) => e.kind === "duck" && e.frame === cry.frame && e.volume === 85 && e.noop !== true)!;
  return { duck: duck.frame, cry };
}

// ROM first-cry frame, species, pan, mode, engine-minus-ROM drift at the first cry, the engine's command start (first presented frame of the animation) and the row's age in it.
const SITES = [
  { name: "cry1-roar-pidgey-player-on", species: 16, pan: -64, mode: "ROAR_1", rom: 392, drift: -1, commandStart: 374 },
  { name: "cry1-roar-jynx-player-on", species: 124, pan: -64, mode: "ROAR_1", rom: 390, drift: -1, commandStart: 372 },
  { name: "cry1-roar-pidgey-opp-on", species: 16, pan: 63, mode: "ROAR_1", rom: 408, drift: 2, commandStart: 393 },
  { name: "cry1-howl-jynx-player-on", species: 124, pan: -64, mode: "HIGH_PITCH", rom: 87, drift: 4, commandStart: 46 },
  { name: "cry1-hypervoice-pidgey-player-on", species: 16, pan: -64, mode: "ECHO_START", rom: 69, drift: 0, commandStart: 53 },
  { name: "cry1-hypervoice-jynx-player-on", species: 124, pan: -64, mode: "ECHO_START", rom: 67, drift: 0, commandStart: 51 },
] as const;

describe("cry-task first cries (cry1, Scene ON)", () => {
  for (const site of SITES) {
    it(`${site.name}: the ROM plays ${site.mode} at ${site.rom} (species ${site.species}, pan ${site.pan}, BGM duck 85) and the engine's first cry row is the ROM frame + ${site.drift}`, () => {
      const rom = load(site.name);
      const first = romFirstCry(rom);
      expect([first.cry.frame, first.cry.id, first.cry.pan, first.cry.mode, first.cry.volume, first.duck]).toEqual([site.rom, site.species, site.pan, site.mode, 120, site.rom]);
      const ours = replay(rom);
      expect(ours.commandStart).toBe(site.commandStart);
      const at = site.rom + site.drift;
      const cries = ours.rows.filter((r) => r.startsWith("cry@") && !r.endsWith(":5") && !r.endsWith(":0"));
      expect(cries[0]).toBe(`cry@${at}:${site.species}:${site.pan}:${MODE_ID[site.mode]}`);
      expect(ours.rows).toContain(`duck@${at}:85`);
    });
  }

  it("the first cry is at the animation command start + 11 + script frame: Roar 6, Howl 34, Hyper Voice 5 (engine frames, drift-free offsets)", () => {
    expect(SITES.map((s) => s.rom + s.drift - s.commandStart)).toEqual([17, 17, 17, 45, 16, 16]);
  });

  it("ROM facts the second cries build on: ROAR_2 is ROAR_1 + 11, and Hyper Voice's first stop (a ROM no-op, nothing playing) is 2 frames before ECHO_START", () => {
    for (const name of ["cry1-roar-pidgey-player-on", "cry1-roar-jynx-player-on", "cry1-roar-pidgey-opp-on"]) {
      const rom = load(name);
      const r1 = rom.events.find((e) => e.mode === "ROAR_1")!;
      const r2 = rom.events.find((e) => e.mode === "ROAR_2")!;
      expect(r2.frame - r1.frame).toBe(11);
    }
    for (const name of ["cry1-hypervoice-pidgey-player-on", "cry1-hypervoice-jynx-player-on"]) {
      const rom = load(name);
      const es = rom.events.find((e) => e.mode === "ECHO_START")!;
      const stop = rom.events.find((e) => e.kind === "stop" && e.via === "StopCryAndClearCrySongs")!;
      expect([es.frame - stop.frame, stop.noop]).toEqual([2, true]);
    }
  });
});

/** Effective ROM rows from the first cry to the BGM restore (duck 256), as `frame - first cry` strings; the `noop` rows are ROM log noise. */
function romTaskRows(rom: Fixture, first: number): string[] {
  const rows: string[] = [];
  for (const e of rom.events) {
    if (e.frame < first || e.noop === true) continue;
    if (e.kind === "cry" && e.mode !== undefined && e.mode in MODE_ID) rows.push(`${e.frame - first}:cry:${e.id}:${e.pan}:${MODE_ID[e.mode]}`);
    else if (e.kind === "stop" && (e as any).player === "cry") rows.push(`${e.frame - first}:stop`);
    else if (e.kind === "duck") {
      rows.push(`${e.frame - first}:duck:${e.volume}`);
      if (e.volume === 256) break;
    }
  }
  return rows;
}

function engineTaskRows(rom: Fixture, first: number, drift: number): string[] {
  const rows: string[] = [];
  for (const r of replay(rom).rows) {
    const frame = Number(/@(\d+)/.exec(r)![1]);
    if (frame < first + drift) continue;
    const rel = frame - first - drift;
    if (r.startsWith("cry@")) {
      const [, , id, pan, mode] = r.split(/[@:]/);
      if (Number(mode) === 0 || Number(mode) === 5) continue;
      rows.push(`${rel}:cry:${id}:${pan}:${mode}`);
    } else if (r.startsWith("stop@")) rows.push(`${rel}:stop`);
    else {
      rows.push(`${rel}:duck:${r.split(":")[1]}`);
      if (r.endsWith(":256")) break;
    }
  }
  return rows;
}

describe("cry-task second cries, stops and the BGM restore (cry1, Scene ON)", () => {
  for (const site of SITES) {
    it(`${site.name}: the engine's rows after the first cry equal the ROM's effective rows (offsets, ids, pans, modes, the duck 256) `, () => {
      const rom = load(site.name);
      const expected = romTaskRows(rom, site.rom);
      expect(expected.length).toBeGreaterThanOrEqual(3);
      expect(engineTaskRows(rom, site.rom, site.drift)).toEqual(expected);
    });
  }

  it("Hyper Voice's two rounds: ES, stop at D_ES, EE, the round-2 stop 53 after the first ES, ES2 2 later, stop, EE2, the restore (frames after the first ES)", () => {
    expect(romTaskRows(load("cry1-hypervoice-pidgey-player-on"), 69)).toEqual([
      "0:duck:85", "0:cry:16:-64:4", "12:stop", "13:cry:16:-64:6", "53:stop", "55:cry:16:-64:4", "67:stop", "68:cry:16:-64:6", "80:duck:256",
    ]);
    expect(romTaskRows(load("cry1-hypervoice-jynx-player-on"), 67).map((r) => r.split(":").slice(0, 2).join(":"))).toEqual([
      "0:duck", "0:cry", "26:stop", "27:cry", "53:stop", "55:cry", "81:stop", "82:cry", "98:duck",
    ]);
  });
});

describe("cry-task lengths: the derived cryModeFrames.ts tables + 1 (the ROM-measured species of tests/fixtures/cry1-lengths.json)", () => {
  const measured = JSON.parse(readFileSync(new URL("fixtures/cry1-lengths.json", import.meta.url), "utf8")) as Record<string, Array<[number, number]>>;
  const TABLES = { ES: CRY_ECHO_START_FRAMES, EE: CRY_ECHO_END_FRAMES, R2: CRY_ROAR_2_FRAMES, HP: CRY_HIGH_PITCH_FRAMES } as const;
  for (const [key, table] of Object.entries(TABLES)) {
    it(`${key}: all ${measured[key]!.length} measured species`, () => {
      expect(measured[key]!.map(([species]) => [species, table[species]! + 1])).toEqual(measured[key]);
    });
  }
  it("Jynx hits the note-length caps (ES 26, HP 51, R2 61, EE 131 = 130 + 1)", () => {
    expect([CRY_ECHO_START_FRAMES[124], CRY_HIGH_PITCH_FRAMES[124], CRY_ROAR_2_FRAMES[124], CRY_ECHO_END_FRAMES[124]].map((n) => n! + 1)).toEqual([26, 51, 61, 131]);
  });
});

describe("cry task rows (unit)", () => {
  const rowsAt = (move: number, species: number, side: "player" | "opponent", scriptRow: number): SoundEvent[] =>
    [...collectSoundTick(1, () => emitCryTaskRows(move, species, side, scriptRow, false)).events];
  const brief = (events: SoundEvent[]) => events.map((e) => [e.kind, e.id, e.pan, (e as any).mode, e.volume]);

  it("plays the duck and the cry at the task's first frame, with the attacker's pan; SPECIES_NONE and non-cry moves play nothing", () => {
    expect(brief(rowsAt(46, 16, "player", 6))).toEqual([["duck", BGM, null, undefined, 85], ["cry", 16, -64, 7, 120]]);
    expect(rowsAt(46, 16, "opponent", 6).map((e) => e.pan)).toEqual([null, 63]);
    expect(rowsAt(336, 124, "player", 34).map((e) => (e as any).mode)).toEqual([undefined, 3]);
    expect(rowsAt(304, 124, "opponent", 5).map((e) => (e as any).mode)).toEqual([undefined, 4]);
    expect(rowsAt(46, 16, "player", 5)).toEqual([]);
    expect(rowsAt(304, 16, "player", 6)).toEqual([]);
    expect(rowsAt(46, 0, "player", 6)).toEqual([]);
    expect(rowsAt(150, 16, "player", 6)).toEqual([]);
  });

  it("the second cries carry no duck row (already ducked); stops are cry-player stops; the restore is a duck 256", () => {
    expect(brief(rowsAt(46, 124, "player", 17))).toEqual([["cry", 124, -64, 8, 120]]);
    expect(rowsAt(304, 124, "player", 5 + 26).map((e) => [e.kind, (e as any).player])).toEqual([["stop", "cry"]]);
    expect(brief(rowsAt(304, 124, "player", 5 + 27))).toEqual([["cry", 124, -64, 6, 120]]);
    expect(brief(rowsAt(304, 124, "player", 58))).toEqual([["stop", null, null, undefined, undefined]]);
    expect(brief(rowsAt(304, 124, "player", 60))).toEqual([["cry", 124, -64, 4, 120]]);
  });

  it("the BGM restore is scheduled from the first cry: Roar ROAR_2 + D_R2, Howl HIGH_PITCH + D_HP; Hyper Voice the earlier of EE2 + D_EE and the animation end (first ES + 98)", () => {
    const restoreRow = (move: number, species: number, first: number): number => {
      let found = -1;
      for (let row = 0; row < 200; row += 1) {
        const { events } = collectSoundTick(row + 1, () => {
          beginScreenSoundTick(row + 1);
          emitCryTaskRows(move, species, "player", row, false);
          runScheduledScreenSounds();
        });
        if (events.some((e) => e.kind === "duck" && e.volume === 256)) found = row - first;
      }
      return found;
    };
    expect([restoreRow(46, 124, 6), restoreRow(46, 16, 6), restoreRow(336, 124, 34), restoreRow(336, 16, 34)]).toEqual([72, 23, 51, 11]);
    expect([restoreRow(304, 16, 5), restoreRow(304, 69, 5), restoreRow(304, 124, 5)]).toEqual([80, 98, 98]);
  });
});
