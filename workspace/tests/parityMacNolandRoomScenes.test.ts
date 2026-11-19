// Noland's battle-room scenes without an emulator (docs/parity-mac/noland-room-scenes.md). Each fixture is a real-ROM recording
// (tools/audio/romNolandScene.py: the lab's walk-up to the Factory Head, the save's record staged, every frame's picture hash, RNG draws,
// sounds and A / B gates) kept by tools/integration/nolandSceneEngine.ts --fixture. The engine is staged at the same GO ON menu with the same
// record and RNG cursor and ticked with the ROM's presses (nolandSceneEngine.ts driveEngine). Up to each fixture's `through` frame the
// engine must show the ROM's picture on every frame, take a press on exactly the frames the ROM takes one, and play the same sounds; the
// RNG draws per frame must match everywhere except at the battle's start (Noland's team build, the transition draw and the battle init,
// which the engine makes from its own gameplay stream). What each recording covers is pinned on its own data.
import { describe, expect, it } from "vitest";
import { compareScene, driveEngine, loadSceneFixture, type RomRecording, type SceneFixture } from "../tools/integration/nolandSceneEngine.ts";

const load = (name: string): SceneFixture => loadSceneFixture(new URL(`./fixtures/noland-room/${name}.json.gz`, import.meta.url));

/** SE_SELECT on the room's \p / \l prompts (the end-of-message waits are silent). */
function roomSelects(rec: RomRecording, through: number): number {
  let n = 0;
  let inRoom = false;
  for (const r of rec.frames.slice(0, through + 1)) {
    if ((r.sounds ?? []).some((e) => e.kind === "se" && e.id === 9)) inRoom = true; // SE_EXIT: the warp into the battle room
    if ((r.sounds ?? []).some((e) => e.kind === "bgm" && e.id === 471)) inRoom = false; // the battle BGM
    if (inRoom) n += (r.sounds ?? []).filter((e) => e.kind === "se" && e.id === 5).length;
  }
  return n;
}

const CASES: Array<{ name: string; symbols: number; heard: [number, number]; challenge: number; selects: number; covers?: (f: SceneFixture) => void }> = [
  { name: "silver-first", symbols: 0, heard: [0, 0], challenge: 2, selects: 8 },
  { name: "silver-first-slow", symbols: 0, heard: [0, 0], challenge: 2, selects: 8, covers: (f) => {
    // every room press later than its first taken frame: the \p page turns show the cleared box a frame later
    const presses = f.recording.frames.filter((r) => r.press && r.f > 300).map((r) => r.f);
    expect(presses.length).toBeGreaterThanOrEqual(10);
  } },
  { name: "silver-heard", symbols: 0, heard: [1, 0], challenge: 2, selects: 0 },
  { name: "return-21", symbols: 2, heard: [1, 1], challenge: 2, selects: 0 },
  { name: "gold-first", symbols: 1, heard: [1, 0], challenge: 5, selects: 3 },
  { name: "gold-heard", symbols: 1, heard: [1, 1], challenge: 5, selects: 0 },
  { name: "return-42", symbols: 2, heard: [1, 1], challenge: 5, selects: 0 },
  { name: "silver-first-b", symbols: 0, heard: [0, 0], challenge: 2, selects: 8, covers: (f) => {
    const buttons = new Set(f.recording.frames.filter((r) => r.press && r.f > 2).map((r) => r.press![0]));
    expect([...buttons]).toEqual(["B"]);
  } },
  { name: "silver-first-scene-on", symbols: 0, heard: [0, 0], challenge: 2, selects: 8, covers: (f) => expect(f.recording.scene).toBe("on") },
  { name: "gold-heard-scene-on", symbols: 1, heard: [1, 1], challenge: 5, selects: 0, covers: (f) => expect(f.recording.scene).toBe("on") },
];

describe("Noland's battle-room scenes, frame by frame against the real ROM", () => {
  for (const c of CASES) {
    it(c.name, () => {
      const f = load(c.name);
      const rec = f.recording;
      expect(rec.challenge).toBe(c.challenge);
      expect(rec.recordStart).toEqual({ symbols: c.symbols, heardBrainSpeech: { silver: c.heard[0], gold: c.heard[1] } });
      expect(roomSelects(rec, f.through)).toBe(c.selects);
      c.covers?.(f);
      const rows = driveEngine(rec, f.prompt?.f ?? f.through, true);
      expect(rows).toHaveLength(f.prompt?.f ?? f.through);
      // The battle intro's prompt: the press is taken on the ROM's frame (A or B).
      if (f.prompt !== undefined) expect(rows[f.prompt.f - 1]!.adv).toEqual(f.prompt.adv);
      const cmp = compareScene(rec, rows, 1, f.through);
      expect(cmp.sha).toEqual([]);
      expect(cmp.adv).toEqual([]);
      // PlayMapChosenOrBattleBGM's m4aMPlayAllStop and PlayBGM can straddle a frame after the team build (the ROM's frame boundary falls
      // mid-call); the engine plays both on the BGM's frame.
      const bgmFrame = rec.frames.find((r) => (r.sounds ?? []).some((e) => e.kind === "bgm" && e.id === 471))?.f;
      const battleBgm = new Set(["stop:469@BGM", "bgm:471"]);
      expect(cmp.sounds.filter((s) => !(bgmFrame !== undefined && Math.abs(s.f - bgmFrame) <= 1
        && [...s.rom, ...s.engine].every((k) => battleBgm.has(k))))).toEqual([]);
      // The battle start's draws are the engine's own (gameplay RNG); every other frame draws what the ROM draws.
      expect(cmp.draws.filter((d) => !d.where.startsWith("battleRoom:brainSpeechSettled") && !d.where.startsWith("round:"))).toEqual([]);
    });
  }
});
