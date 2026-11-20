// snd1 (Kyle's 2026-11-20 live play: "the ball-tray sounds at battle start are faint"). The battle-start tray plays 14 SEs in one second;
// SE_BALL_TRAY_BALL (SE1) and SE_BALL_TRAY_EXIT (SE2) follow each other on the same music player as close as 2 frames apart (ROM probe,
// tools/audio/fixtures/snd1-first-walk-window.json: BALL 1254 -> 1256, 1261 -> 1263; EXIT 1275 -> 1277, 1282 -> 1284). The player cut a
// preempted SE at the new event's time, but the ROM keeps it one frame past that and releases it over the next (docs/snd1-playtest-sounds.md,
// isolated ROM recording: a BALL preempted 2 frames after its call plays its first audible frame in full, RMS 2133 vs 2133 alone, and about
// half of the next). The BALL's recorded onset is 924 samples (2.07 frames), so the old cut killed every such ball before it was heard.
import { describe, expect, it } from "vitest";
import { createAudioPlayer, FRAME_HZ, SE_STOP_LAG_S, SE_STOP_RELEASE_S, type AudioContextLike, type BufferSourceLike } from "../src/audio/player.ts";
import { bundledAssets } from "../src/audio/playerAssets.ts";
import type { SoundEvent } from "../src/audio/soundEvents.ts";

class FakeParam {
  value = 1;
  readonly calls: { op: string; value: number; time: number }[] = [];
  setValueAtTime(value: number, time: number): void {
    this.calls.push({ op: "set", value, time });
  }
  linearRampToValueAtTime(value: number, time: number): void {
    this.calls.push({ op: "ramp", value, time });
  }
  cancelScheduledValues(time: number): void {
    this.calls.push({ op: "cancel", value: 0, time });
  }
}
class FakeNode {
  connect(): void {}
}
class FakeGain extends FakeNode {
  readonly gain = new FakeParam();
}
class FakeSource extends FakeNode implements BufferSourceLike {
  buffer: { duration: number } | null = null;
  loop = false;
  loopStart = 0;
  loopEnd = 0;
  starts: { when?: number; offset?: number; duration?: number }[] = [];
  stops: number[] = [];
  start(when?: number, offset?: number, duration?: number): void {
    this.starts.push({ when, offset, duration });
  }
  stop(when?: number): void {
    this.stops.push(when ?? 0);
  }
}
class FakeContext implements AudioContextLike {
  currentTime = 100;
  state = "running";
  readonly destination = {};
  readonly gains: FakeGain[] = [];
  readonly sources: FakeSource[] = [];
  async resume(): Promise<void> {}
  createGain(): FakeGain {
    const gain = new FakeGain();
    this.gains.push(gain);
    return gain;
  }
  createBufferSource(): FakeSource {
    const source = new FakeSource();
    this.sources.push(source);
    return source;
  }
  createChannelMerger(): FakeNode {
    return new FakeNode();
  }
  async decodeAudioData(): Promise<{ duration: number }> {
    return { duration: 1000 };
  }
}
const flush = async (): Promise<void> => {
  for (let i = 0; i < 40; i += 1) await new Promise<void>((resolve) => setTimeout(resolve, 0));
};
const se = (frame: number, id: number, pan: number | null): SoundEvent => ({ kind: "se", frame, id, pan });
const sounds = bundledAssets.manifest.sounds;
const onset = (key: string): number => sounds[key]!.onsetSamples / sounds[key]!.sampleRate;

async function ready() {
  const ctx = new FakeContext();
  const time = { now: 100 };
  const player = createAudioPlayer({
    enabled: true,
    gestureTarget: null,
    setTimer: () => 0,
    clearTimer: () => undefined,
    clock: () => time.now,
    createContext: () => ctx,
    fetchBytes: async () => new ArrayBuffer(8),
    canPlayOgg: () => true,
    latency: 0.03,
  });
  await flush(); // the prefetch set (which now holds the tray files) is decoded before the battle starts
  /** Pushes an event with the wall clock at its frame (the game pushes in real time; the player re-anchors events > 0.25 s ahead). */
  const at = (first: number) => (event: SoundEvent): void => {
    time.now = 100 + (event.frame - first) / FRAME_HZ;
    ctx.currentTime = time.now;
    player.push(event);
  };
  return { ctx, player, at };
}

describe("an SE preempted on its music player sounds one frame past the new start, then fades over one frame (m4a output lag)", () => {
  it("SE_BALL_TRAY_BALL pan 63 then pan -64 two frames later: the first ball is audible before it is released", async () => {
    const { ctx, player } = await ready();
    player.push(se(1254, 115, 63));
    player.push(se(1256, 115, -64));
    expect(player.stats().preempted).toBe(1);
    const [first, second] = ctx.sources;
    const t1254 = 100 + 0.03;
    const t1256 = t1254 + 2 / FRAME_HZ;
    expect(first!.starts[0]!.when).toBeCloseTo(t1254 + onset("se:115:63"), 4);
    // The ROM rule: released from one frame after the preempting call, gone one frame later.
    expect(SE_STOP_LAG_S).toBeCloseTo(1 / FRAME_HZ, 9);
    expect(SE_STOP_RELEASE_S).toBeCloseTo(1 / FRAME_HZ, 9);
    const stop = first!.stops.at(-1)!;
    expect(stop).toBeCloseTo(t1256 + SE_STOP_LAG_S + SE_STOP_RELEASE_S + 0.001, 4);
    // The first ball is heard: its sources stop after they start (the old cut stopped them at t1256 + 4 ms, before the 924-sample onset).
    expect(stop - first!.starts[0]!.when!).toBeGreaterThan(1.5 / FRAME_HZ);
    expect(second!.starts[0]!.when).toBeCloseTo(t1256 + onset("se:115:-64"), 4);
    expect(second!.stops.length).toBe(0);
  });

  it("the whole battle-1 tray (ROM frames): every ball and exit is audible for at least one frame", async () => {
    const { ctx, player, at } = await ready();
    const push = at(1228);
    const tray: [number, number, number][] = [
      [1228, 114, 0], [1231, 114, 0], [1247, 115, 63], [1254, 115, 63], [1256, 115, -64], [1261, 115, 63], [1263, 115, -64],
      [1268, 116, 63], [1270, 115, -64], [1275, 116, 63], [1277, 116, -64], [1282, 116, 63], [1284, 116, -64], [1291, 116, -64],
    ];
    for (const [frame, id, pan] of tray) push(se(frame, id, pan));
    expect(player.stats().preempted).toBe(12);
    expect(ctx.sources.length).toBe(tray.length);
    for (const [index, source] of ctx.sources.entries()) {
      const start = source.starts[0]!.when!;
      const end = source.stops.length > 0 ? source.stops.at(-1)! : start + source.starts[0]!.duration!;
      expect(end - start, `tray SE ${tray[index]!.join(" ")}`).toBeGreaterThan(0.9 / FRAME_HZ);
    }
  });

  it("m4aSongNumStop of a playing SE releases it the same way", async () => {
    const { ctx, at } = await ready();
    const push = at(10);
    push(se(10, 90, null)); // SE_LOW_HEALTH loop
    await flush();
    push({ kind: "stop", frame: 40, id: 90, pan: null });
    const loop = ctx.sources.filter((s) => s.stops.length > 0);
    expect(loop.length).toBeGreaterThan(0);
    const t40 = 100 + 0.03 + 30 / FRAME_HZ;
    for (const source of loop) expect(source.stops.at(-1)!).toBeCloseTo(t40 + SE_STOP_LAG_S + SE_STOP_RELEASE_S + 0.001, 3);
  });
});
