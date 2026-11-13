// aud245: playing the sounds has zero effect on the game. The same scripted session ticked with no sink, a recording sink and the real
// audio player behind a fake AudioContext (enabled, so it schedules sources) gives identical per-frame sha256, kernel digest, battles and trace.
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createAudioPlayer, type AudioContextLike } from "../src/audio/player.ts";
import { type SoundEvent, type SoundSink } from "../src/audio/soundEvents.ts";
import { render } from "../src/engine/core.ts";
import type { BattleScene } from "../src/factoryContract.ts";
import { FactorySession } from "../src/factorySession.ts";
import { ActionLog, RandomPlayer, Rng, type SoakPolicy } from "../tools/soak/randomRoundSoakDriver.ts";

function fakeContext(): AudioContextLike & { sources: number } {
  const param = { value: 1, setValueAtTime: () => undefined, linearRampToValueAtTime: () => undefined, cancelScheduledValues: () => undefined };
  const node = (): Record<string, unknown> => ({ connect: () => undefined, gain: { ...param } });
  const ctx = {
    currentTime: 0,
    state: "running",
    destination: {},
    sources: 0,
    resume: async () => undefined,
    createGain: node,
    createChannelMerger: node,
    createBufferSource: () => {
      ctx.sources += 1;
      return { ...node(), buffer: null, loop: false, loopStart: 0, loopEnd: 0, start: () => undefined, stop: () => undefined };
    },
    decodeAudioData: async () => ({ duration: 1000 }),
  };
  return ctx as unknown as AudioContextLike & { sources: number };
}

function play(scene: BattleScene, seed: number, policy: SoakPolicy, frames: number, sink: SoundSink | null) {
  const session = new FactorySession({ battleScene: scene, gameplaySeed: seed });
  if (sink !== null) session.attachSoundSink(sink);
  const player = new RandomPlayer(new Rng(seed), new ActionLog(false), policy);
  const frameHashes: string[] = [];
  for (let frame = 1; frame <= frames; frame += 1) {
    session.tick(player.decide(session.state), frame);
    frameHashes.push(createHash("sha256").update(render(session.state)).digest("hex"));
  }
  session.recorder.cut();
  return { frameHashes, digest: session.digest(), battles: session.battles, trace: session.trace(), finalFrame: session.frame };
}

describe("audio playback is invisible to the game (aud245)", () => {
  for (const [scene, seed, frames] of [
    ["off", 3, 4000],
    ["on", 7, 2500],
  ] as const) {
    it(`Scene ${scene.toUpperCase()}: no sink, a recording sink and the player give identical frame hashes, digest, battles and trace`, async () => {
      const bare = play(scene, seed, "winning", frames, null);
      const events: SoundEvent[] = [];
      const recorded = play(scene, seed, "winning", frames, { push: (event) => events.push(event) });
      const ctx = fakeContext();
      const audio = createAudioPlayer({ enabled: true, gestureTarget: null, setTimer: () => 0, clearTimer: () => undefined, clock: () => 0, createContext: () => ctx, fetchBytes: async () => new ArrayBuffer(8), canPlayOgg: () => true });
      await new Promise((resolve) => setTimeout(resolve, 300)); // the effects are decoded, so SEs start synchronously
      const heard = play(scene, seed, "winning", frames, { push: (event) => audio.push(event) });
      for (const run of [recorded, heard]) {
        expect(run.frameHashes).toEqual(bare.frameHashes);
        expect(run.digest).toBe(bare.digest);
        expect(run.battles).toEqual(bare.battles);
        expect(run.trace).toEqual(bare.trace);
        expect(run.finalFrame).toBe(bare.finalFrame);
      }
      expect(events.length).toBeGreaterThan(50);
      const stats = audio.stats();
      expect(Object.values(stats.events).reduce((a, b) => a + b, 0)).toBe(events.length);
      for (const kind of ["se", "bgm", "cry"]) expect(stats.events[kind], kind).toBe(events.filter((event) => event.kind === kind).length);
      expect(stats.started.se).toBeGreaterThan(0);
      expect(ctx.sources).toBeGreaterThan(0);
      audio.destroy();
    }, 300_000);
  }
});
