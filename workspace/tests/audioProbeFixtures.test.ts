import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Hermetic schema + invariants for the ROM sound-event probe fixtures (docs/s11-audio-design.md section 2).
// No emulator: the fixtures are the committed output of tools/audio/soundEventProbe.py (stepping reference mode).

const fixtureDir = new URL("../tools/audio/fixtures/", import.meta.url);
const songsHeader = readFileSync(new URL("../reference/pokeemerald/include/constants/songs.h", import.meta.url), "utf8");

const songIds = new Map<string, number>();
for (const m of songsHeader.matchAll(/^#define (SE_\w+|MUS_\w+|PH_\w+)\s+(\d+)/gm)) songIds.set(m[1]!, Number(m[2]));

type Row = Record<string, unknown> & { frame: number; kind: string; id: number | null; name: string | null; pan: number | null; noop?: boolean };
interface Fixture {
  schema: string;
  window: string;
  profile: string;
  frames: number;
  from?: number;
  hooks: Record<string, string>;
  mode: string;
  events: Row[];
  calls: Array<{ fn: string; frame: number; noop?: boolean }>;
}

const EVENT_KINDS = ["se", "bgm", "fanfare", "cry", "stop", "duck", "fade", "continue"];
const PLAYERS = ["BGM", "SE1", "SE2", "SE3", "cry"];
const FADE_DIRS = ["out", "out-temporary", "in"];
const PLAYED_KINDS = ["se", "bgm", "fanfare"];
const PLAYER_KINDS = ["stop", "duck", "fade", "continue"];

const files = readdirSync(fixtureDir).filter((f) => f.endsWith(".json")).sort();
const fixtures = files.map((f) => [f, JSON.parse(readFileSync(new URL(f, fixtureDir), "utf8")) as Fixture] as const);

describe("audio probe fixtures", () => {
  it("covers the draft, swap, decline and summary windows and both scene profiles of the battle windows", () => {
    expect(files).toEqual([
      "battle-intro-window-off.json",
      "battle-intro-window.json",
      "battle-window-off.json",
      "battle-window.json",
      "draft-trace-window.json",
      "draft-window.json",
      "heal-window.json",
      "loss-terminal-window.json",
      "postwin-record-window.json",
      "seventh-win-window.json",
      "party-forced-window.json",
      "party-summary-entry-window.json",
      "party-voluntary-window.json",
      "summary-close-at-cry.json",
      "summary-close-during-cry.json",
      "summary-draft-window.json",
      "summary-party-weak-window.json",
      "summary-party-window.json",
      "summary-swap-window.json",
      "swap-decline-window.json",
      "swap-window.json",
    ]);
    const profiles = new Set(fixtures.map(([, d]) => d.profile));
    expect([...profiles].sort()).toEqual(["battle-scene-off", "battle-scene-on"]);
  });

  for (const [file, d] of fixtures) {
    describe(file, () => {
      it("has the header", () => {
        expect(d.schema).toBe("audio-sound-events/v1");
        expect(d.mode).toBe("step");
        expect(typeof d.window).toBe("string");
        expect(Number.isInteger(d.frames) && d.frames >= 0).toBe(true);
        for (const hook of ["m4aSongNumStart", "m4aMPlayFadeOut", "m4aMPlayFadeIn", "m4aMPlayVolumeControl", "m4aMPlayStop", "m4aMPlayContinue"]) {
          expect(d.hooks[hook], hook).toMatch(/^0x08[0-9a-f]{6}$/);
        }
        expect(d.events.length).toBeGreaterThan(0);
      });

      it("has well-formed events with 1-based, non-decreasing frames", () => {
        const from = d.from ?? 0; // trace windows start after `from` frames and report absolute frames
        let last = from + 1;
        for (const e of d.events) {
          expect(EVENT_KINDS, JSON.stringify(e)).toContain(e.kind);
          expect(Number.isInteger(e.frame) && e.frame > from, JSON.stringify(e)).toBe(true);
          expect(e.frame, `frames sorted: ${JSON.stringify(e)}`).toBeGreaterThanOrEqual(last);
          last = e.frame;
          if (d.frames > 0) expect(e.frame, JSON.stringify(e)).toBeLessThanOrEqual(from + d.frames);
          if (e.pan !== null) {
            expect(Number.isInteger(e.pan) && e.pan >= -64 && e.pan <= 63, JSON.stringify(e)).toBe(true);
          }
          expect(typeof e.via, JSON.stringify(e)).toBe("string");
          if (e.noop !== undefined) expect(e.noop).toBe(true);
        }
      });

      it("names every played sound with a known id", () => {
        for (const e of d.events) {
          if (PLAYED_KINDS.includes(e.kind)) {
            expect(Number.isInteger(e.id), JSON.stringify(e)).toBe(true);
            expect(e.name, JSON.stringify(e)).toMatch(/^(SE|MUS)_\w+$/);
          }
          if (e.kind === "fanfare") expect(e.name).toMatch(/^MUS_/);
          if (e.kind === "cry") {
            expect(e.name, JSON.stringify(e)).toMatch(/^SPECIES_\w+$/);
            expect(Number.isInteger(e.id) && (e.id as number) > 0, JSON.stringify(e)).toBe(true);
            expect(typeof e.volume).toBe("number");
            expect(typeof e.priority).toBe("number");
            expect(typeof e.mode).toBe("string");
          }
          if (e.name !== null && e.kind !== "cry") {
            expect(songIds.get(e.name), `${e.name} in songs.h`).toBe(e.id);
          }
        }
      });

      it("describes player-targeted events (stop / duck / fade / continue)", () => {
        for (const e of d.events) {
          if (!PLAYER_KINDS.includes(e.kind)) continue;
          if (e.player === undefined) {
            // m4aSongNumStop names a song, not a player
            expect(e.kind, JSON.stringify(e)).toBe("stop");
            expect(Number.isInteger(e.id) && e.name !== null, JSON.stringify(e)).toBe(true);
          } else {
            // StopCryAndClearCrySongs before any cry has played reads a null gMPlay_PokemonCry (always a no-op)
            if (e.player === "0x00000000") expect(e.noop, JSON.stringify(e)).toBe(true);
            else expect(PLAYERS, JSON.stringify(e)).toContain(e.player);
          }
          // a player with no song loaded has no id/name (e.g. stopping an idle SE3)
          expect(e.id === null, JSON.stringify(e)).toBe(e.name === null);
          if (e.kind === "fade") {
            expect(FADE_DIRS).toContain(e.dir);
            expect(Number.isInteger(e.speed) && (e.speed as number) > 0, JSON.stringify(e)).toBe(true);
          }
          if (e.kind === "duck") {
            expect(Number.isInteger(e.tracks) && (e.tracks as number) > 0, JSON.stringify(e)).toBe(true);
            expect(Number.isInteger(e.volume) && (e.volume as number) >= 0 && (e.volume as number) <= 256, JSON.stringify(e)).toBe(true);
          }
        }
      });

      it("has calls consistent with the hooks and events", () => {
        let last = (d.from ?? 0) + 1;
        for (const c of d.calls) {
          expect(Object.keys(d.hooks), JSON.stringify(c)).toContain(c.fn);
          expect(c.frame, JSON.stringify(c)).toBeGreaterThanOrEqual(last);
          last = c.frame;
        }
        const effective = (rows: Array<{ noop?: boolean }>) => rows.filter((r) => !r.noop).length;
        expect(effective(d.calls)).toBeGreaterThanOrEqual(effective(d.events) - d.events.filter((e) => e.via === "m4aMPlayAllStop").length);
      });
    });
  }

  it("the Scene OFF battle window drops move-animation SEs and keeps the rest of the ON window", () => {
    const byFile = new Map(fixtures);
    const on = byFile.get("battle-window.json")!;
    const off = byFile.get("battle-window-off.json")!;
    expect(off.frames).toBe(on.frames);
    const effective = (f: Fixture) => f.events.filter((e) => !e.noop);
    const key = (e: Row) => `${e.kind}:${e.name}`;
    const onKeys = effective(on).map(key);
    const offKeys = effective(off).map(key);
    expect(onKeys.some((k) => k.startsWith("se:SE_M_"))).toBe(true);
    expect(offKeys.some((k) => k.startsWith("se:SE_M_"))).toBe(false);
    const onRest = onKeys.filter((k) => !k.startsWith("se:SE_M_"));
    for (const k of offKeys) expect(onRest, k).toContain(k);
  });
});
