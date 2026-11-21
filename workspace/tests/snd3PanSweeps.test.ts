// snd3 (ISSUES #226): SE_M_BLIZZARD (153) and SE_M_GUST (132) are panned sweeps (battle_anim.c:1263-1450 Cmd_panse + Task_PanFromInitialToTarget:
// PlaySE12WithPanning(attacker pan), then the pan moves -64 -> 63 by +2 per frame). The engine emits the start SE plus one `pan` event per
// step (moveAnimSounds.ts panRows); the player must find a recording AT the start pan (se:153:-64 / se:153:63; there was none) and re-pan it
// through m4a's law on each step (player.ts panEvent). The sweep is rendered per ROM step, one gain change per `pan` event, not per recording.
import { describe, expect, it } from "vitest";
import { createAudioPlayer, m4aPanGains, type AudioContextLike, type AudioPlayerOptions, type BufferSourceLike } from "../src/audio/player.ts";
import { moveAnimOpRows, type TimedOp } from "../src/engine/moveAnimSounds.ts";
import type { SoundEvent } from "../src/audio/soundEvents.ts";

class FakeParam {
  value = 1;
  readonly sets: { value: number; time: number }[] = [];
  setValueAtTime(value: number, time: number): void {
    this.sets.push({ value, time });
  }
  linearRampToValueAtTime(): void {}
  cancelScheduledValues(): void {}
}
class FakeNode {
  readonly targets: unknown[] = [];
  connect(target: unknown): void {
    this.targets.push(target);
  }
  disconnect(): void {
    this.targets.length = 0;
  }
}
class FakeGain extends FakeNode {
  readonly gain = new FakeParam();
  channelCount = 2;
  channelCountMode = "max";
}
class FakeSource extends FakeNode implements BufferSourceLike {
  buffer: { duration: number } | null = null;
  loop = false;
  loopStart = 0;
  loopEnd = 0;
  starts: { when?: number; offset?: number; duration?: number }[] = [];
  start(when?: number, offset?: number, duration?: number): void {
    this.starts.push({ when, offset, duration });
  }
  stop(): void {}
}
class FakeContext implements AudioContextLike {
  currentTime = 100;
  state = "running";
  readonly destination = { destination: true };
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
function harness(options: Partial<AudioPlayerOptions> = {}) {
  const ctx = new FakeContext();
  const fetched: string[] = [];
  const player = createAudioPlayer({
    enabled: true, gestureTarget: null, setTimer: () => 0, clearTimer: () => undefined, clock: () => 100, createContext: () => ctx,
    fetchBytes: async (url) => {
      fetched.push(url);
      return new ArrayBuffer(8);
    },
    canPlayOgg: () => true,
    ...options,
  });
  return { player, ctx, fetched };
}
const flush = async (): Promise<void> => {
  for (let i = 0; i < 40; i += 1) await new Promise<void>((resolve) => setTimeout(resolve, 0));
};

/** The events the engine emits for `panse id, SOUND_PAN_ATTACKER, SOUND_PAN_TARGET, +2, 0` (Blizzard / Gust), from the frame `at`. */
function sweepEvents(id: number, attackerSide: "player" | "opponent", at: number): SoundEvent[] {
  const op: TimedOp = { op: "panse", frame: 0, id, pan: -64, target: 63, inc: 2, wait: 0 };
  const targetSide = attackerSide === "player" ? "opponent" : "player";
  return moveAnimOpRows(op, { attackerSide, targetSide }).map((row): SoundEvent => ({ ...row.emission, frame: at + row.offset }));
}

describe("panse sweeps (Blizzard 153, Gust 132)", () => {
  it("the engine's sweep is the ROM's: the start SE at the attacker's pan, then +-2 per frame to the other side (63 -> -63 mirrored)", () => {
    const player = sweepEvents(153, "player", 100);
    expect(player[0]).toMatchObject({ kind: "se", id: 153, pan: -64, frame: 100 });
    const pans = player.slice(1).map((e) => e.pan!);
    expect(pans[0]).toBe(-62);
    expect(pans.at(-1)).toBe(63);
    expect(pans.every((p, i) => i === 0 || p - pans[i - 1]! === 2 || p === 63)).toBe(true);
    const opponent = sweepEvents(153, "opponent", 100);
    expect(opponent[0]).toMatchObject({ kind: "se", id: 153, pan: 63 });
    // animSoundPan mirrors the target pan (63 -> -63, :1287-1291), so an opponent attacker sweeps 63 -> -63.
    expect(opponent.at(-1)).toMatchObject({ kind: "pan", pan: -63 });
  });

  for (const [id, side, own] of [[153, "player", "se-153-panm64"], [153, "opponent", "se-153-panp63"], [132, "player", "se-132-panm64"], [132, "opponent", "se-132-panp63"]] as const) {
    it(`SE ${id} from the ${side}: the recording at its own start pan plays (no 'missing'), then each step re-pans it with m4a's law`, async () => {
      const h = harness();
      await flush();
      const events = sweepEvents(id, side, 100);
      const start = events[0]!;
      h.player.push(start);
      await flush();
      expect(h.fetched.some((url) => url.includes(own)), `${own} fetched`).toBe(true);
      expect(h.player.stats().missing).toBe(0);
      expect(h.ctx.sources.length).toBe(1);
      const pre = h.ctx.sources[0]!.targets[0] as FakeGain;
      const steps = events.slice(1, 21);
      for (const step of steps) h.player.push(step);
      expect(pre.channelCount).toBe(1);
      const [left, right] = pre.targets as FakeGain[];
      const last = steps.filter((s) => s.pan !== start.pan).at(-1)!.pan!;
      expect(left!.gain.sets.at(-1)!.value).toBeCloseTo(m4aPanGains(last).left, 9);
      expect(right!.gain.sets.at(-1)!.value).toBeCloseTo(m4aPanGains(last).right, 9);
      // One gain change per ROM step after the first splice (which builds the stage with the first pan).
      expect(left!.gain.sets.length).toBe(steps.filter((s) => s.pan !== start.pan).length - 1);
    });
  }
});
