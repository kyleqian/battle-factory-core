// aud239: the write-only sound sink is neutral. A session with a recording sink attached produces the
// same per-frame sha256, kernel-events digest, battles, recorded trace and headless replay as one with
// no sink, and the sink only receives the screen SE_SELECTs and (aud241a) the battle start's sounds.
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { type SoundEvent, type SoundSink } from "../src/audio/soundEvents.ts";
import { render } from "../src/engine/core.ts";
import type { BattleScene, TraceSegment } from "../src/factoryContract.ts";
import { FactorySession } from "../src/factorySession.ts";
import { replayChallenge } from "../src/headless.ts";
import { ActionLog, RandomPlayer, Rng, type SoakPolicy } from "../tools/soak/randomRoundSoakDriver.ts";

class RecordingSink implements SoundSink {
  readonly events: SoundEvent[] = [];
  push(event: SoundEvent): void {
    this.events.push(event);
  }
}

interface Run {
  readonly frameHashes: string[];
  readonly digest: string;
  readonly battles: unknown;
  readonly trace: TraceSegment[];
  readonly finalFrame: number;
}

function play(scene: BattleScene, seed: number, policy: SoakPolicy, frames: number, sink: SoundSink | null): Run {
  const session = new FactorySession({ battleScene: scene, gameplaySeed: seed });
  if (sink !== null) session.attachSoundSink(sink);
  const player = new RandomPlayer(new Rng(seed), new ActionLog(false), policy);
  const frameHashes: string[] = [];
  for (let frame = 1; frame <= frames; frame += 1) {
    session.tick(player.decide(session.state), frame);
    frameHashes.push(createHash("sha256").update(render(session.state)).digest("hex"));
  }
  // Close the trailing run so the whole trace is readable.
  session.recorder.cut();
  return { frameHashes, digest: session.digest(), battles: session.battles, trace: session.trace(), finalFrame: session.frame };
}

// aud240a: screens emit SE_SELECT (kind se, id 5, pan null); aud241a: the battle start adds the battle BGM, the ball tray,
// the ball opens and the send-out cries with their BGM duck. Nothing else is emitted in these runs yet.
const BATTLE_START_SE_IDS = new Set([5, 15, 114, 115, 116]);
function expectScreenSoundsOnly(events: readonly SoundEvent[], frames: number): void {
  let last = 0;
  for (const event of events) {
    if (event.kind === "se") expect(BATTLE_START_SE_IDS.has(event.id!), JSON.stringify(event)).toBe(true);
    else expect(["stop", "bgm", "cry", "duck"], JSON.stringify(event)).toContain(event.kind);
    expect(event.frame).toBeGreaterThanOrEqual(last);
    expect(event.frame).toBeLessThanOrEqual(frames);
    last = event.frame;
  }
}

describe("sound sink neutrality (aud239)", () => {
  for (const [scene, seed, policy, frames] of [
    ["off", 3, "winning", 4000],
    ["on", 7, "winning", 2500],
  ] as const) {
    it(`Scene ${scene.toUpperCase()}: per-frame sha256, digest, battles and trace are identical with a sink; the sink only gets in-order screen and battle-start sounds`, () => {
      const bare = play(scene, seed, policy, frames, null);
      const sink = new RecordingSink();
      const wired = play(scene, seed, policy, frames, sink);
      expect(wired.frameHashes.length).toBe(frames);
      expect(wired.frameHashes).toEqual(bare.frameHashes);
      expect(wired.digest).toBe(bare.digest);
      expect(bare.digest).not.toBe(new FactorySession({ battleScene: scene, gameplaySeed: seed }).digest()); // the run reached battle events
      expect(wired.battles).toEqual(bare.battles);
      expect(wired.trace).toEqual(bare.trace);
      expect(wired.finalFrame).toBe(bare.finalFrame);
      expectScreenSoundsOnly(sink.events, frames);
      // The session never put the sink into anything it exports.
      expect(JSON.stringify(wired.trace)).not.toContain("sound");
    });
  }

  it("a headless replay of the sink-attached run's trace reproduces its digest (the trace carries no audio)", () => {
    const sink = new RecordingSink();
    const wired = play("off", 3, "winning", 4000, sink);
    const heard = sink.events.length;
    const replay = replayChallenge({ battleScene: "off", gameplaySeed: 3, segments: wired.trace });
    expect(replay.frames).toBe(wired.finalFrame);
    expect(replay.digest).toBe(wired.digest);
    expect(replay.battles).toEqual(wired.battles);
    expect(sink.events.length).toBe(heard); // the headless replay is silent
  });

  it("attaching and detaching mid-run changes nothing", () => {
    const bare = play("off", 5, "winning", 800, null);
    const session = new FactorySession({ battleScene: "off", gameplaySeed: 5 });
    const player = new RandomPlayer(new Rng(5), new ActionLog(false), "winning");
    const sink = new RecordingSink();
    const hashes: string[] = [];
    for (let frame = 1; frame <= 800; frame += 1) {
      session.attachSoundSink(frame > 200 && frame <= 600 ? sink : null);
      session.tick(player.decide(session.state), frame);
      hashes.push(createHash("sha256").update(render(session.state)).digest("hex"));
    }
    expect(hashes).toEqual(bare.frameHashes);
    expect(session.digest()).toBe(bare.digest);
  });
});
