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
  calls?: Array<{ fn: string; frame: number; noop?: boolean }>; // absent in the aud242b fixtures (saved without the call log)
}

// "pan" = SE12PanpotControl (a running SE re-panned, e.g. CalculatePanIncrement in aud242b flamethrower / icywind)
const EVENT_KINDS = ["se", "bgm", "fanfare", "cry", "stop", "duck", "fade", "continue", "pan"];
const PLAYERS = ["BGM", "SE1", "SE2", "SE3", "cry"];
const FADE_DIRS = ["out", "out-temporary", "in"];
const PLAYED_KINDS = ["se", "bgm", "fanfare"];
const PLAYER_KINDS = ["stop", "duck", "fade", "continue"];

const files = readdirSync(fixtureDir).filter((f) => f.endsWith(".json")).sort();
const fixtures = files.map((f) => [f, JSON.parse(readFileSync(new URL(f, fixtureDir), "utf8")) as Fixture] as const);

describe("audio probe fixtures", () => {
  it("covers the draft, swap, decline and summary windows and both scene profiles of the battle windows", () => {
    expect(files).toEqual([
      "aud241c-brain-off-window.json",
      "aud241c-brain-on-window.json",
      "aud241c-loss-off-window.json",
      "aud241c-loss-on-window.json",
      "aud241c-win-off-window.json",
      "aud241c-win-on-window.json",
      "aud242a-agility-player.json",
      "aud242a-ember-player.json",
      "aud242a-psybeam-player.json",
      "aud242a-razorleaf-player.json",
      "aud242a-slam-player.json",
      "aud242a-slash-opponent.json",
      "aud242a-swift-opponent.json",
      "aud242a-swordsdance-opponent.json",
      "aud242b-aurorabeam-player.json",
      "aud242b-crunch-player.json",
      "aud242b-dragonrage-opponent.json",
      "aud242b-dragonrage-player.json",
      "aud242b-flamethrower-opponent.json",
      "aud242b-haze-player.json",
      "aud242b-hijumpkick-opponent.json",
      "aud242b-hijumpkick-player.json",
      "aud242b-hyperbeam-player.json",
      "aud242b-hyperfang-player.json",
      "aud242b-icebeam-opponent.json",
      "aud242b-icywind-opponent.json",
      "aud242b-machpunch-opponent.json",
      "aud242b-megapunch-opponent.json",
      "aud242b-megapunch-player.json",
      "aud242b-shadowball-player.json",
      "aud242b-thunder-opponent.json",
      "aud242b-thunderbolt-player.json",
      "aud242c-aurorabeam-player.json",
      "aud242c-cosmicpower-player.json",
      "aud242c-crunch-player.json",
      "aud242c-dragonclaw-opponent.json",
      "aud242c-fireblast-player.json",
      "aud242c-flamethrower-opponent.json",
      "aud242c-flamethrower-player.json",
      "aud242c-flatter-player.json",
      "aud242c-hyperbeam-opponent.json",
      "aud242c-hyperbeam-player.json",
      "aud242c-hyperfang-player.json",
      "aud242c-icebeam-opponent.json",
      "aud242c-icywind-opponent.json",
      "aud242c-machpunch-opponent.json",
      "aud242c-machpunch-player.json",
      "aud242c-metalsound-opponent.json",
      "aud242c-psybeam-player.json",
      "aud242c-superpower-player.json",
      "aud242c-sweetscent-player.json",
      "aud242d-calmmind-player.json",
      "aud242d-doubleedge-player.json",
      "aud242d-hail-player.json",
      "aud242d-icywind-opponent.json",
      "aud242d-metalclaw-player.json",
      "aud242d-steelwing-player.json",
      "aud242d-sunnyday-player.json",
      "aud242d-thunderbolt-player.json",
      "aud242e-absorb-player.json",
      "aud242e-counter-player.json",
      "aud242e-doubleedge-player.json",
      "aud242e-gigadrain-player.json",
      "aud242e-megadrain-player.json",
      "aud242e-overheat-player.json",
      "aud242e-poisonfang-player.json",
      "aud242e-poisontail-player.json",
      "aud242e-rocktomb-player.json",
      "aud242e-rollingkick-player.json",
      "aud242e-sludge-player.json",
      "aud242e-thunderbolt-player.json",
      "aud242e-toxic-player.json",
      "aud242e-watergun-player.json",
      "aud242e-waterpulse-player.json",
      "aud242f-growth-player.json",
      "aud242f-headbutt-player.json",
      "aud242f-hiddenpower-player.json",
      "aud242f-horndrill-player.json",
      "aud242f-icebeam-player.json",
      "aud242f-icepunch-player.json",
      "aud242f-swagger-player.json",
      "aud242g-bubblebeam-player.json",
      "aud242g-dreameater-player.json",
      "aud242g-triattack-player.json",
      "aud242h-psychic-player.json",
      "aud250-focuspunch-opponent.json",
      "aud250-focuspunch-player.json",
      "aud250-leechseed-opponent.json",
      "aud250-leechseed-player.json",
      "battle-intro-window-off.json",
      "battle-intro-window.json",
      "battle-window-off.json",
      "battle-window.json",
      "brain-heal-setup-window.json",
      "cry1-howl-jynx-player-on.json",
      "cry1-hypervoice-jynx-player-on.json",
      "cry1-hypervoice-pidgey-player-on.json",
      "cry1-roar-jynx-player-on.json",
      "cry1-roar-pidgey-opp-on.json",
      "cry1-roar-pidgey-player-on.json",
      "draft-trace-window.json",
      "draft-window.json",
      "faint-cry-length-10.json",
      "faint-cry-length-113.json",
      "faint-cry-length-129.json",
      "faint-cry-length-143.json",
      "faint-cry-length-149.json",
      "faint-cry-length-16.json",
      "faint-cry-length-202.json",
      "faint-cry-length-330.json",
      "faint-cry-length-350.json",
      "faint-cry-length-376.json",
      "faint-cry-length-40.json",
      "faint-cry-length-41.json",
      "faint-cry-length-63.json",
      "faint-cry-length-95.json",
      "faint-opponent-off-window.json",
      "faint-opponent-window.json",
      "faint-player-off-window.json",
      "faint-player-window.json",
      "frf250a-bag-off-window.json",
      "frf250a-bag-on-window.json",
      "frf250a-run-b-off-window.json",
      "frf250a-run-b-on-window.json",
      "frf250a-run-no-off-window.json",
      "frf250a-run-no-on-window.json",
      "frf250b-run-yes-off-window.json",
      "heal-window.json",
      "hie3-cheri-on.json",
      "hie3-leftovers-on.json",
      "hie3-shellbell-on.json",
      "hie3-sitrus-on.json",
      "hie3-sitrus-opp-on.json",
      "intro-canonical-window.json",
      "intro-magneton-off-window.json",
      "intro-magneton-on-window.json",
      "intro-yoshi-off-window.json",
      "intro-yoshi-on-window.json",
      "loss-terminal-window.json",
      "lowhp-faint-off-window.json",
      "lowhp-faint-window.json",
      "lowhp-off-window.json",
      "lowhp-window.json",
      "obr251-opponent-faint-off-window.json",
      "obr251-opponent-faint-on-window.json",
      "party-forced-window.json",
      "party-summary-entry-window.json",
      "party-voluntary-window.json",
      "postwin-record-window.json",
      "seventh-win-window.json",
      "summary-close-at-cry.json",
      "summary-close-during-cry.json",
      "summary-draft-window.json",
      "summary-party-weak-window.json",
      "summary-party-window.json",
      "summary-swap-window.json",
      "super-effective-off-window.json",
      "super-effective-window.json",
      "swap-decline-window.json",
      "swap-window.json",
      "switch-opponent-replacement-off-window.json",
      "switch-player-forced-sendout-on-window.json",
      "switch-player-off-window.json",
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
            // the ROM's stat-change SE reaches pan +64 on an opponent target (aud242a swordsdance-opponent: SE_M_STAT_INCREASE)
            expect(Number.isInteger(e.pan) && e.pan >= -64 && e.pan <= 64, JSON.stringify(e)).toBe(true);
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

      it.skipIf(d.calls === undefined && file.startsWith("aud242b-"))("has calls consistent with the hooks and events", () => {
        const calls = d.calls!;
        let last = (d.from ?? 0) + 1;
        for (const c of calls) {
          expect(Object.keys(d.hooks), JSON.stringify(c)).toContain(c.fn);
          expect(c.frame, JSON.stringify(c)).toBeGreaterThanOrEqual(last);
          last = c.frame;
        }
        const effective = (rows: Array<{ noop?: boolean }>) => rows.filter((r) => !r.noop).length;
        expect(effective(calls)).toBeGreaterThanOrEqual(effective(d.events) - d.events.filter((e) => e.via === "m4aMPlayAllStop").length);
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
