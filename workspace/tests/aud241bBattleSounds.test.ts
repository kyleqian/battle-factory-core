// aud241b: the Factory singles battle's effectiveness SEs, SE_FAINT, the faint cry (with its BGM duck and restore) and the player's
// low-HP SE loop reproduce the ROM's sound events, in both scenes. The fixtures are committed oracle output of
// tools/audio/soundEventProbe.py (stepping mode) with the key script embedded; this test needs no emulator.
// See docs/aud241b-battle-sounds.md.
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectSoundTick, type SoundEvent } from "../src/audio/soundEvents.ts";
import { FAINT_CRY_RESTORE_FRAMES } from "../src/data/faintCryFrames.ts";
import { createInitialState, tick } from "../src/engine/core.ts";
import { beginScreenSoundTick, handleLowHpMusicChange } from "../src/engine/screenSounds.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";

interface FixtureEvent {
  frame: number;
  kind: string;
  id: number | null;
  pan: number | null;
  mode?: string | number;
  volume?: number;
  priority?: number;
  player?: string;
  via?: string;
  noop?: boolean;
}
interface Fixture {
  from?: number;
  frames: number;
  profile: string;
  events: FixtureEvent[];
  trace: {
    route: "generated-orchestrator" | "canonical-recorded";
    battleScene: "on" | "off";
    appStage?: { id: string; frame: number };
    segments: Array<{ frames: number; buttons?: string[] }>;
  };
}

const fixture = (name: string): Fixture =>
  JSON.parse(readFileSync(new URL(`../tools/audio/fixtures/${name}.json`, import.meta.url), "utf8")) as Fixture;

const CRY_MODES = ["NORMAL", "DOUBLES", "ENCOUNTER", "HIGH_PITCH", "ECHO_START", "FAINT", "ECHO_END", "ROAR_1", "ROAR_2", "GROWL_1", "GROWL_2", "WEAK", "WEAK_DOUBLES"];
const key = (e: FixtureEvent | SoundEvent) => ({
  frame: e.frame,
  kind: e.kind,
  id: e.id,
  pan: e.pan,
  mode: typeof e.mode === "number" ? CRY_MODES[e.mode] : e.mode,
  volume: e.volume,
  priority: e.priority,
});
const EFFECT_SES = [12, 13, 14, 16, 90];
// The families of this step: effectiveness SEs, SE_FAINT, SE_LOW_HEALTH and its stop, the cry and its duck / restore. Move-animation
// SEs and the aud241a intro sounds belong to other steps.
const inFamily = (e: FixtureEvent | SoundEvent): boolean =>
  (e.kind === "se" && EFFECT_SES.includes(e.id as number)) ||
  (e.kind === "stop" && e.id === 90) ||
  e.kind === "cry" ||
  (e.kind === "duck" && e.id === 476);
// The ROM logs every HandleLowHpMusicChange / DestroyAnimSoundTask call; the no-ops (`noop: true`) play nothing.
const played = (events: readonly FixtureEvent[]) => events.filter((e) => e.noop !== true && inFamily(e));

const appTracePath = "../tools/compare/appTrace.ts";
const { APP_STAGES } = (await import(/* @vite-ignore */ appTracePath)) as {
  APP_STAGES: Record<string, (state: ReturnType<typeof createInitialState>) => ReturnType<typeof createInitialState>>;
};

function collectWindow(rom: Fixture, collect = true): { events: SoundEvent[]; state: string } {
  const { appStage } = rom.trace;
  let state = createInitialState({ appRoute: rom.trace.route, battleScene: rom.trace.battleScene });
  if (appStage !== undefined && appStage.frame === 0) state = APP_STAGES[appStage.id]!(state);
  const events: SoundEvent[] = [];
  for (const advance of traceAdvances(rom.trace.segments)) {
    if (advance.frame > rom.frames) break;
    if (collect) {
      const result = collectSoundTick(state.frame + 1, () => tick(state, advance.buttons));
      state = result.result;
      events.push(...result.events);
    } else {
      state = tick(state, advance.buttons);
    }
  }
  return { events: events.filter(inFamily), state: JSON.stringify(state) };
}

/** Frame difference (ours - ROM) of each played ROM event, after asserting every other field is equal and the counts match. */
function frameDeltas(name: string): number[] {
  const rom = fixture(name);
  const romEvents = played(rom.events);
  const ours = collectWindow(rom).events;
  expect(ours.map((e) => ({ ...key(e), frame: 0 }))).toEqual(romEvents.map((e) => ({ ...key(e), frame: 0 })));
  return ours.map((e, index) => e.frame - romEvents[index]!.frame);
}

describe("effectiveness, faint and low-HP sounds match the ROM (aud241b)", () => {
  it("faint-opponent-window.json: SE_EFFECTIVE, the FAINT cry with its duck / restore and SE_FAINT, all at pan +63 / +25, frame for frame (Scene ON)", () => {
    const rom = fixture("faint-opponent-window");
    expect(rom.profile).toBe("battle-scene-on");
    expect(played(rom.events).map((e) => `${e.frame}:${e.kind}:${e.id}:${e.pan}:${e.volume ?? ""}`)).toEqual([
      "295:se:13:63:", "389:duck:476:null:85", "389:cry:19:25:120", "417:duck:476:null:256", "455:se:16:63:",
    ]);
    expect(frameDeltas("faint-opponent-window")).toEqual([0, 0, 0, 0, 0]);
  });

  it("faint-opponent-off-window.json: the same events on Scene OFF's own timeline (no 7-tick controller lag)", () => {
    const rom = fixture("faint-opponent-off-window");
    expect(rom.profile).toBe("battle-scene-off");
    expect(played(rom.events).map((e) => e.frame)).toEqual([98, 192, 192, 220, 258]);
    expect(frameDeltas("faint-opponent-off-window")).toEqual([0, 0, 0, 0, 0]);
  });

  it("faint-player-window.json / faint-player-off-window.json: the player's side plays pan -64 / -25 and the low-HP stop is a no-op", () => {
    const on = fixture("faint-player-window");
    const off = fixture("faint-player-off-window");
    expect(played(on.events).map((e) => `${e.kind}:${e.id}:${e.pan}`)).toEqual(["se:13:-64", "duck:476:null", "cry:19:-25", "duck:476:null", "se:16:-64"]);
    expect(played(off.events).map((e) => e.frame)).toEqual([102, 196, 196, 224, 262]);
    expect(frameDeltas("faint-player-window")).toEqual([0, 0, 0, 0, 0]);
    expect(frameDeltas("faint-player-off-window")).toEqual([0, 0, 0, 0, 0]);
  });

  it("super-effective-window.json / -off: SE_SUPER_EFFECTIVE is on the ROM's frame in Scene ON and one early in Scene OFF; the engine's 'It's super effective!' message is 5 ticks short, which moves the faint 5 early", () => {
    const on = fixture("super-effective-window");
    const off = fixture("super-effective-off-window");
    expect(played(on.events).map((e) => `${e.frame}:${e.kind}:${e.id}:${e.pan}`)).toEqual([
      "115:se:14:63", "294:duck:476:null", "294:cry:19:25", "322:duck:476:null", "360:se:16:63",
    ]);
    expect(played(off.events).map((e) => e.frame)).toEqual([97, 276, 276, 304, 342]);
    expect(frameDeltas("super-effective-window")).toEqual([0, -5, -5, -5, -5]);
    expect(frameDeltas("super-effective-off-window")).toEqual([-1, -6, -6, -6, -6]);
  });

  it("lowhp-window.json / lowhp-off-window.json: the player's bar turning red starts SE_LOW_HEALTH one tick after HealthbarDone; the second attack of the turn is one tick early (known mismatch)", () => {
    const on = fixture("lowhp-window");
    const off = fixture("lowhp-off-window");
    expect(played(on.events).map((e) => `${e.frame}:${e.kind}:${e.id}:${e.pan}`)).toEqual(["299:se:13:-64", "387:se:90:null", "662:se:13:63"]);
    expect(played(off.events).map((e) => e.frame)).toEqual([102, 190, 275]);
    expect(frameDeltas("lowhp-window")).toEqual([0, 0, -1]);
    expect(frameDeltas("lowhp-off-window")).toEqual([0, 0, -1]);
  });

  it("lowhp-faint-window.json / lowhp-faint-off-window.json: the faint from a red bar stops the loop (the only real stop-90) and every sound after the 8-pixel drain trails by the engine's 28-tick HP floor", () => {
    const on = fixture("lowhp-faint-window");
    const off = fixture("lowhp-faint-off-window");
    const stops = (rom: Fixture) => rom.events.filter((e) => e.kind === "stop" && e.id === 90 && e.noop !== true).map((e) => e.frame);
    expect(stops(on)).toEqual([1110]);
    expect(stops(off)).toEqual([573]);
    // [first hit, loop start, second hit, third hit, stop, duck, cry, restore, SE_FAINT]; the ROM drains the last 8 pixels in 12 ticks,
    // the engine's hp command lasts its 28-tick minimum (ISSUES: hp floor), so the stop and the faint sounds are 16 ticks late.
    expect(frameDeltas("lowhp-faint-window")).toEqual([0, 0, -1, 0, 16, 16, 16, 16, 16]);
    expect(frameDeltas("lowhp-faint-off-window")).toEqual([0, 0, -1, 0, 16, 16, 16, 16, 16]);
  });

  it("collecting sounds does not change the engine state (faint, super effective, low-HP loop, both scenes)", () => {
    for (const name of ["faint-player-window", "faint-opponent-off-window", "super-effective-window", "lowhp-faint-off-window"]) {
      const rom = fixture(name);
      expect(collectWindow(rom, true).state, name).toBe(collectWindow(rom, false).state);
    }
  });

  it("the old battle windows' effectiveness SEs are pinned on the ROM (12 at pan -64 / 63); their lab is not replayable without a Rhydon / Golbat staging", () => {
    for (const [name, frames] of [["battle-window", [118, 474]], ["battle-window-off", [107, 317]]] as const) {
      const rom = fixture(name);
      expect(rom.events.filter((e) => e.kind === "se" && e.id === 12).map((e) => `${e.frame}:${e.pan}`), name).toEqual(
        frames.map((frame, index) => `${frame}:${index === 0 ? -64 : 63}`),
      );
    }
  });
});

describe("faint cry restore delay (aud241b)", () => {
  const lengthFixtures = readdirSync(new URL("../tools/audio/fixtures/", import.meta.url)).filter((f) => f.startsWith("faint-cry-length-"));

  it("is exact on every species measured on the ROM (the generator's fit inputs)", () => {
    expect(lengthFixtures.length).toBe(14);
    for (const file of lengthFixtures) {
      const rom = fixture(file.replace(/\.json$/, ""));
      const cry = rom.events.find((e) => e.kind === "cry" && e.mode === "FAINT")!;
      const restore = rom.events.find((e) => e.kind === "duck" && e.via === "IsCryPlaying" && e.frame > cry.frame)!;
      expect(restore.frame - cry.frame, file).toBe(FAINT_CRY_RESTORE_FRAMES[cry.id as number]);
    }
    const rattata = fixture("faint-opponent-window");
    const cry = rattata.events.find((e) => e.kind === "cry")!;
    expect(rattata.events.find((e) => e.kind === "duck" && e.via === "IsCryPlaying")!.frame - cry.frame).toBe(FAINT_CRY_RESTORE_FRAMES[19]);
  });

  it("covers all 376 Factory species", () => {
    expect(Object.keys(FAINT_CRY_RESTORE_FRAMES)).toHaveLength(376);
  });
});

describe("low-HP loop rule (HandleLowHpMusicChange, battle_gfx_sfx_util.c)", () => {
  const run = (calls: ReadonlyArray<readonly [number, number]>): string[] => {
    const result = collectSoundTick(1, () => {
      beginScreenSoundTick(1);
      for (const [hp, max] of calls) handleLowHpMusicChange(hp, max);
    });
    return result.events.map((e) => `${e.kind}:${e.id}`);
  };

  it("a red bar (1..9 of 48 pixels, not full) starts SE_LOW_HEALTH once", () => {
    expect(run([[61, 61], [11, 61], [11, 61], [5, 61]])).toEqual(["se:90"]);
  });

  it("a yellow, green or empty bar stops the loop only if it was playing", () => {
    expect(run([[30, 61], [0, 61]])).toEqual([]);
    expect(run([[11, 61], [30, 61], [0, 61]])).toEqual(["se:90", "stop:90"]);
    expect(run([[11, 61], [0, 61], [11, 61]])).toEqual(["se:90", "stop:90", "se:90"]);
  });

  it("the red bound is the 48-pixel fraction (9 red, 10 yellow) with a one-pixel floor for a live mon", () => {
    expect(run([[9, 48]])).toEqual(["se:90"]);
    expect(run([[10, 48]])).toEqual([]);
    expect(run([[1, 500]])).toEqual(["se:90"]);
  });
});
