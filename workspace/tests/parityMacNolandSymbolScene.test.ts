// The symbol scene after a first win over Noland, and the return to the Lobby, without an emulator (docs/parity-mac/noland-room-scenes.md,
// "The symbol scene"). Each fixture is a real-ROM recording (tools/audio/romNolandScene.py --win: the battle ended as a win at its first
// action menu, then the ROM plays the room, the scene, the warp and the Lobby) kept from the battle's return to the field. The engine is
// staged on the same frame of its return span (nolandSceneEngine.ts nolandWinReturnStage: the round's seventh battle won, the ROM's RNG
// cursor) and ticked with the ROM's presses. Up to each fixture's `through` frame every frame's picture, every A / B gate, every sound and
// every frame's RNG draws must be the ROM's. The one sound left out is the map BGM's return on the span's age 53, which the battle's end
// schedules (battleEndSounds.ts) and the stage starts after.
import "../tools/compare/harnessPlayerName.ts"; // the player name the recordings were made with (the Lobby's points text shows it)
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { FactorySession } from "../src/factorySession.ts";
import { render } from "../src/engine/core.ts";
import type { GbaButton } from "../src/input.ts";
import { collectSoundTick, type SoundEvent } from "../src/audio/soundEvents.ts";
import { compareScene, driveEngine, loadSceneFixture, nolandWinReturnStage, sceneStartFrame, type SceneFixture } from "../tools/integration/nolandSceneEngine.ts";

const load = (name: string): SceneFixture => loadSceneFixture(new URL(`./fixtures/noland-room/${name}.json.gz`, import.meta.url));

function romSounds(f: SceneFixture, kind: string, id: number): number[] {
  return f.recording.frames.filter((r) => (r.sounds ?? []).some((e) => e.kind === kind && e.id === id)).map((r) => r.f);
}

const CASES: Array<{ name: string; tier: "silver" | "gold" | null; covers: (f: SceneFixture, start: number) => void }> = [
  { name: "symbol-silver", tier: "silver", covers: (f, start) => {
    // the fanfare and its continue 318 frames later; SE_SELECT on the closing lines' two \p; SE_EXIT on the warp
    const [fanfare] = romSounds(f, "fanfare", 466);
    expect(romSounds(f, "continue", 469)[0]! - fanfare!).toBe(318);
    expect(romSounds(f, "se", 9)).toHaveLength(1);
    expect(romSounds(f, "se", 5).filter((x) => x < romSounds(f, "se", 9)[0]!)).toHaveLength(2);
    expect(fanfare! - start).toBeGreaterThan(100);
  } },
  { name: "symbol-gold", tier: "gold", covers: (f) => {
    const [fanfare] = romSounds(f, "fanfare", 466);
    expect(romSounds(f, "continue", 469)[0]! - fanfare!).toBe(318);
    // Noland's line's \p and the closing lines' two \p; the Lobby's points fanfare (the recording runs to the save's SE)
    expect(romSounds(f, "se", 5).filter((x) => x < romSounds(f, "se", 9)[0]!)).toHaveLength(3);
    expect(romSounds(f, "fanfare", 459)).toHaveLength(1);
  } },
  { name: "win-no-symbol", tier: null, covers: (f, start) => {
    // no scene: the warp (SE_EXIT) on the span's age 79 (the stage starts on age 40)
    expect(romSounds(f, "fanfare", 466)).toEqual([]);
    expect(romSounds(f, "se", 9).map((x) => x - start + 40)).toEqual([79]);
  } },
];

describe("the symbol scene and the return to the Lobby, frame by frame against the real ROM", () => {
  for (const c of CASES) {
    it(c.name, () => {
      const f = load(c.name);
      const rec = f.recording;
      const start = sceneStartFrame(rec, "win");
      c.covers(f, start);
      const rows = driveEngine(rec, f.through, true, undefined, "win");
      expect(rows[0]!.f).toBe(start + 1);
      expect(rows.at(-1)!.f).toBe(f.through);
      const sceneFrames = rows.filter((r) => r.where.startsWith("battleRoom:brainSymbol")).length;
      if (c.tier === null) expect(sceneFrames).toBe(0);
      else expect(sceneFrames).toBeGreaterThan(400);
      const cmp = compareScene(rec, rows, start + 1, f.through);
      // Under vitest the engine prints its own player name (tools/compare/harnessPlayerName.ts is off there): the Lobby's "<player> obtained
      // N Battle Point(s)." frames (from the points fanfare to the exchange text, 8 frames after its continue) are the only ones it shows.
      const points = romSounds(f, "fanfare", 459)[0];
      const pointsEnd = points === undefined ? undefined : f.recording.frames.find((r) => r.f > points && (r.sounds ?? []).some((e) => e.kind === "continue"))?.f;
      const nameFrame = (x: number) => points !== undefined && x >= points - 4 && x <= (pointsEnd ?? f.through) + 8;
      expect(cmp.sha.filter((x) => process.env.VITEST === undefined || !nameFrame(x))).toEqual([]);
      expect(cmp.adv).toEqual([]);
      expect(cmp.draws).toEqual([]);
      const bgmReturn = start + 1 + (53 - 41);
      expect(cmp.sounds.filter((s) => !(s.f === bgmReturn && s.rom.join() === "bgm:469" && s.engine.length === 0))).toEqual([]);
    });
  }
});

describe("the symbol scene in the library", () => {
  it("a reload in the middle of the scene replays to the same frame and goes on with the same pictures and music", () => {
    const f = load("symbol-gold");
    const rec = f.recording;
    const start = sceneStartFrame(rec, "win");
    const presses = (frame: number): ReadonlySet<GbaButton> => new Set((rec.frames[frame]?.press ?? []) as GbaButton[]);
    // into the scene, past the fanfare's start (the scene opens on the span's age 79, 39 frames after the stage); then 400 frames more
    const reloadAt = start + 300;
    const end = reloadAt + 400;
    const hash = (state: FactorySession["state"]) => createHash("sha256").update(render(state)).digest("hex");
    // One session at a time: the sound scheduler is the module's (one live session per page on the site).
    const live = new FactorySession({ battleScene: "off" });
    live.state = nolandWinReturnStage(rec);
    const liveSounds: SoundEvent[] = [];
    live.attachSoundSink({ push: (e) => liveSounds.push(e) });
    const events: string[] = [];
    const liveFrames = new Map<number, string>();
    let atReload = "";
    for (let frame = start + 1; frame <= end; frame += 1) {
      for (const e of live.tick(presses(frame))) events.push(e.type);
      if (frame === reloadAt) {
        expect(live.state.battleRoom?.phase).toBe("brainSymbol");
        expect(live.state.battleRoom?.symbolStage).toBe("fanfare");
        // the round ended before the scene; the record already has the symbol and the challenge goes on
        // (the stage replaces the session's state after it is built: the session sees the battle's and the round's end on its first frame)
        expect(events).toEqual(["battle-end", "round-end"]);
        expect(live.frontierRecord().symbols).toBe(2);
        atReload = hash(live.state);
      }
      if (frame > reloadAt && frame % 10 === 0) liveFrames.set(frame, hash(live.state));
    }
    // a second mount: the same start, the presses so far replayed as lib.ts's resume does (replayStep inside collectSoundTick, the events
    // kept for the music), then live
    const replayed = new FactorySession({ battleScene: "off" });
    replayed.state = nolandWinReturnStage(rec);
    const replayedSounds: SoundEvent[] = [];
    for (let frame = start + 1; frame <= reloadAt; frame += 1) {
      for (const e of collectSoundTick(replayed.frame + 1, () => replayed.replayStep(presses(frame))).events) replayedSounds.push(e);
    }
    expect(hash(replayed.state)).toBe(atReload);
    replayed.attachSoundSink({ push: (e) => replayedSounds.push(e) });
    for (let frame = reloadAt + 1; frame <= end; frame += 1) {
      replayed.tick(presses(frame));
      if (frame % 10 === 0) expect(hash(replayed.state)).toBe(liveFrames.get(frame));
    }
    // the same sounds, before the reload and after it (the fanfare's continue comes after the reload)
    const keys = (list: SoundEvent[]) => list.map((e) => `${e.frame}:${e.kind}:${e.id}`);
    expect(keys(replayedSounds)).toEqual(keys(liveSounds));
    expect(liveSounds.filter((e) => e.kind === "continue" && e.frame > reloadAt - start).map((e) => e.id)).toContain(469);
  });
});
