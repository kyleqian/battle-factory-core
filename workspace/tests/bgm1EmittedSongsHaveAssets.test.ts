// bgm1 (ISSUES #224): every bgm / fanfare song id the engine can emit in a Factory challenge has a recorded asset in the audio
// manifest (src/assets/gen/audio), an AAC twin and a player entry. Today's emitters: the Lobby / room / draft BGM (469), the
// battle BGM (GetBattleBGM: 476 trainer, 471 Frontier Brain), the victory BGMs (412 / 354), the symbol / heal / BP fanfares.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { initialMusicEvents } from "../src/audio/initialMusic.ts";
import { collectSoundTick, type SoundEvent } from "../src/audio/soundEvents.ts";
import { emitBattleStartBgm } from "../src/engine/battleStartSounds.ts";
import { MUS_VICTORY_GYM_LEADER, MUS_VICTORY_TRAINER } from "../src/engine/battleEndSounds.ts";
import { MUS_OBTAIN_B_POINTS, beginScreenSoundTick, playSymbolFanfare, runScheduledScreenSounds, scheduleHealFanfare } from "../src/engine/screenSounds.ts";

const ROOT = resolve(import.meta.dirname, "..");
const AUDIO = join(ROOT, "src/assets/gen/audio");
const manifest = JSON.parse(readFileSync(join(AUDIO, "manifest.json"), "utf8")) as {
  sounds: Record<string, { file: string; kind: string; id: number; loops?: boolean }>;
  files: Record<string, unknown>;
  alt: { files: Record<string, unknown> };
};
const songPlayers = JSON.parse(readFileSync(join(AUDIO, "song-players.json"), "utf8")) as { songs: Record<string, [number, number]> };

function collect(frame: number, run: () => void): readonly SoundEvent[] {
  return collectSoundTick(frame, () => {
    beginScreenSoundTick(frame);
    run();
    runScheduledScreenSounds();
  }).events;
}

/** Every bgm / fanfare event the Factory emitters produce, driven through the real emitter functions. */
function emittedSongs(): { bgm: Set<number>; fanfare: Set<number> } {
  const events: SoundEvent[] = [];
  for (const brain of [false, true]) events.push(...collect(1000 + (brain ? 1 : 0), () => emitBattleStartBgm(brain)));
  events.push(...initialMusicEvents("draft"), ...initialMusicEvents("after-save"));
  events.push(...collect(2000, () => playSymbolFanfare(1)));
  events.push(...collect(3000, () => scheduleHealFanfare(true)));
  for (let frame = 3001; frame <= 3400; frame += 1) events.push(...collect(frame, () => undefined));
  const bgm = new Set(events.filter((e) => e.kind === "bgm").map((e) => e.id!));
  const fanfare = new Set(events.filter((e) => e.kind === "fanfare").map((e) => e.id!));
  // The victory songs start from a button-message presentation (battleEndSounds.ts); their ids are the exported constants.
  bgm.add(MUS_VICTORY_TRAINER).add(MUS_VICTORY_GYM_LEADER);
  // MSGBOX_GETPOINTS' fanfare starts from the terminal's script steps (screenSounds.ts scheduleTerminalStepSounds); its id is the exported constant.
  fanfare.add(MUS_OBTAIN_B_POINTS);
  return { bgm, fanfare };
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : path.endsWith(".ts") ? [path] : [];
  });
}

describe("bgm1: every emitted song has a recording", () => {
  const emitted = emittedSongs();

  it("drives the emitters and finds the known Factory song set", () => {
    expect([...emitted.bgm].sort((a, b) => a - b)).toEqual([354, 412, 469, 471, 476]);
    expect([...emitted.fanfare].sort((a, b) => a - b)).toEqual([368, 459, 466]);
  });

  it("has a manifest entry (and an Ogg, an AAC twin and a player row) for every emitted bgm / fanfare id", () => {
    for (const [kind, ids] of [["bgm", emitted.bgm], ["fanfare", emitted.fanfare]] as const) {
      for (const id of ids) {
        const sound = manifest.sounds[`${kind}:${id}`];
        expect(sound, `${kind}:${id} has no manifest entry`).toBeDefined();
        expect(sound!.kind).toBe(kind);
        expect(sound!.id).toBe(id);
        expect(sound!.loops, `${kind}:${id} loop flag`).toBe(kind === "bgm");
        expect(manifest.files[sound!.file], `${sound!.file} in manifest.files`).toBeDefined();
        expect(statSync(join(AUDIO, sound!.file)).size, sound!.file).toBeGreaterThan(10_000);
        const twin = `aac/${sound!.file.replace(/\.ogg$/, ".m4a")}`;
        expect(manifest.alt.files[twin], `${twin} in manifest.alt`).toBeDefined();
        expect(statSync(join(AUDIO, twin)).size, twin).toBeGreaterThan(10_000);
        expect(songPlayers.songs[String(id)], `song-players row for ${id}`).toBeDefined();
      }
    }
  });

  it("every exported BGM_* / MUS_* song constant in the engine is recorded (a new constant must come with an asset)", () => {
    const found = new Map<number, string>();
    for (const file of sourceFiles(join(ROOT, "src/engine"))) {
      for (const m of readFileSync(file, "utf8").matchAll(/export const ((?:BGM|MUS)_(?![A-Z0-9_]*VOLUME)[A-Z0-9_]+) = (\d+);/g)) found.set(Number(m[2]), `${m[1]} (${file.slice(ROOT.length + 1)})`);
    }
    expect(found.size).toBe(8);
    for (const [id, where] of found) {
      expect(manifest.sounds[`bgm:${id}`] ?? manifest.sounds[`fanfare:${id}`], `${where} = ${id} has no bgm: / fanfare: manifest entry`).toBeDefined();
    }
  });

  it("pins where bgm / fanfare events can be emitted: a new emitter file must be added here with its ids covered above", () => {
    const emitters = sourceFiles(join(ROOT, "src"))
      .filter((file) => /kind: "(?:bgm|fanfare)"/.test(readFileSync(file, "utf8")))
      .map((file) => file.slice(ROOT.length + 1))
      .filter((file) => !/^src\/audio\/(?:player|musicTracker|soundEvents)\.ts$/.test(file))
      .sort();
    expect(emitters).toEqual(["src/audio/initialMusic.ts", "src/engine/battleEndSounds.ts", "src/engine/screenSounds.ts"]);
  });
});
