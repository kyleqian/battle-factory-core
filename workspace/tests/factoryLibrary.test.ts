// Tier-1 pins for the game library (src/lib.ts, src/headless.ts, src/factorySession.ts):
// the contract v2 events, the input trace, resume equality and the headless replay.
// Real play comes from the soak's RandomPlayer (tools/soak/randomRoundSoakDriver.ts),
// pressing real buttons through createInitialState + tick, exactly like the browser.
import { createHash } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { createInitialState, render, type EngineState } from "../src/engine/core.ts";
import type { FactoryEvent, TraceSegment } from "../src/factoryContract.ts";
import { createChallengeState, ENGINE_BUILD, FactorySession } from "../src/factorySession.ts";
import { replayChallenge } from "../src/headless.ts";
import { mountFactoryGame, mountFactoryGameInternal } from "../src/lib.ts";
import { ActionLog, RandomPlayer, Rng, type SoakPolicy } from "../tools/soak/randomRoundSoakDriver.ts";

/** Plays `frames` live frames with a seeded soak player; `t` stamps are the frame number. */
function playLive(
  session: FactorySession,
  player: RandomPlayer,
  frames: number,
  onFrame?: (state: EngineState, frame: number) => void,
): FactoryEvent[] {
  const events: FactoryEvent[] = [];
  for (let frame = 1; frame <= frames; frame += 1) {
    const produced = session.tick(player.decide(session.state), frame);
    events.push(...produced);
    onFrame?.(session.state, session.frame);
  }
  return events;
}

function soakPlayer(seed: number, policy: SoakPolicy): RandomPlayer {
  return new RandomPlayer(new Rng(seed), new ActionLog(false), policy);
}

/** The census tools' digest, recomputed independently with node:crypto. */
class CensusDigest {
  private readonly hash = createHash("sha256");
  private readonly seen = new Set<object>();
  observe(state: EngineState): void {
    const presentation = state.factoryRoundBattleOrchestrator?.battleResolutionPresentation ?? null;
    if (!presentation) return;
    for (const segment of presentation.segments) {
      if (this.seen.has(segment)) continue;
      this.seen.add(segment);
      this.hash.update(JSON.stringify(segment.events));
    }
  }
  digest(): string {
    return this.hash.digest("hex").slice(0, 16);
  }
}

function frameHash(state: EngineState): string {
  return createHash("sha1").update(render(state)).digest("hex").slice(0, 16);
}

describe("FactorySession events (contract v2)", () => {
  it("reports a first-battle win with streak 1, then a retire at the attendant (Scene OFF)", () => {
    const session = new FactorySession({ battleScene: "off" });
    const player = soakPlayer(1, "winning");
    player.retireRate = 1;
    // lbra: the soak player now walks on from the Lobby by default; this test plays the Lobby idle (the digest covers every observed frame).
    player.newChallengeFromLobby = false;
    const census = new CensusDigest();
    const events: FactoryEvent[] = [];
    for (let frame = 1; frame <= 20_000 && session.ended === null; frame += 1) {
      events.push(...session.tick(player.decide(session.state), frame));
      census.observe(session.state);
    }
    expect(events.map((event) => event.type)).toEqual(["battle-end", "challenge-end"]);
    const [win, end] = events as [FactoryEvent & { type: "battle-end" }, FactoryEvent & { type: "challenge-end" }];
    expect(win).toMatchObject({ result: "win", streak: 1 });
    expect(end).toMatchObject({ reason: "retire", streak: 1 });
    expect(end.frame).toBeGreaterThan(win.frame);
    expect(session.frame).toBe(end.frame);
    expect(session.battles).toEqual([{ result: "win", streak: 1, frame: win.frame }]);
    expect(session.streak).toBe(1);
    expect(session.ended).toBe("retire");
    expect(session.digest()).toMatch(/^[0-9a-f]{16}$/);
    expect(session.digest()).toBe(census.digest());

    // The trace is the recorder's RLE runs with the library's wall-clock stamps; the
    // challenge-end event cut the current run, so the finished runs end exactly at its frame.
    const trace = session.trace();
    expect(trace.reduce((sum, run) => sum + run.frames, 0)).toBe(session.frame);
    expect(trace.reduce((sum, run) => sum + run.frames, 0)).toBe(end.frame);
    expect(trace.every((run) => run.frames <= 600)).toBe(true);
    expect(trace.every((run) => typeof run.t === "number")).toBe(true);
    expect(session.trace(trace.length - 2)).toEqual(trace.slice(-2));
    // toTrace() keeps the historical export shape (no timestamps).
    expect(session.toTrace().segments.every((run) => !("t" in run))).toBe(true);
    expect(session.toTrace().build).toBe(ENGINE_BUILD);

    // Nothing more is reported once the challenge ended, even as the lobby plays on.
    expect(playLive(session, player, 2_000)).toEqual([]);
    expect(session.ended).toBe("retire");

    // The headless replay of that trace is the same challenge.
    const replay = replayChallenge({ battleScene: "off", segments: trace });
    expect(replay).toEqual({ frames: end.frame, streak: 1, ended: "retire", battles: session.battles, digest: session.digest(),
      frontier: { symbols: 0, heardBrainSpeech: { silver: false, gold: false } } });
    const untimed = trace.map(({ frames, buttons }) => ({ frames, buttons }));
    expect(replayChallenge({ battleScene: "off", segments: untimed }).digest).toBe(replay.digest);
  });

  it("reports a lost first battle as battle-end loss + challenge-end loss on the same frame", () => {
    const session = new FactorySession({ battleScene: "off" });
    const player = soakPlayer(0, "vanilla");
    const events: FactoryEvent[] = [];
    for (let frame = 1; frame <= 20_000 && session.ended === null; frame += 1) {
      events.push(...session.tick(player.decide(session.state), frame));
    }
    expect(events).toEqual([
      { type: "battle-end", result: "loss", streak: 0, frame: session.frame },
      { type: "challenge-end", reason: "loss", streak: 0, frame: session.frame },
    ]);
    expect(session.battles).toEqual([{ result: "loss", streak: 0, frame: session.frame }]);
    // lbr-c: after the end, the only event a mount can still report is the one challenge-request (docs/lbrc-challenge-request.md).
    expect(playLive(session, player, 3_000).map((event) => event.type).filter((type) => type !== "challenge-request")).toEqual([]);
    expect(session.ended).toBe("loss");
    const replay = replayChallenge({ battleScene: "off", segments: session.trace() });
    expect(replay).toMatchObject({ streak: 0, ended: "loss", battles: session.battles, digest: session.digest() });
  });

  it("counts the streak as carried wins + battles won in the round", () => {
    // Two wins into a fresh challenge: streak 1 then 2 (round-end would come at 7).
    const session = new FactorySession({ battleScene: "off", gameplaySeed: 7 });
    const player = soakPlayer(3, "winning");
    const wins: number[] = [];
    for (let frame = 1; frame <= 30_000 && wins.length < 2; frame += 1) {
      for (const event of session.tick(player.decide(session.state), frame)) {
        if (event.type === "battle-end") wins.push(event.streak);
        expect(event.type).not.toBe("challenge-end");
      }
    }
    expect(wins).toEqual([1, 2]);
    expect(session.streak).toBe(2);
  });
});

describe("trace hand-outs", () => {
  it("never freeze a run short: tails read at different moments concatenate to the finished runs", () => {
    const session = new FactorySession({ battleScene: "off", gameplaySeed: 3 });
    const player = soakPlayer(2, "winning");
    const uploaded: TraceSegment[] = [];
    let sent = 0;
    for (let frame = 1; frame <= 12_000; frame += 1) {
      session.tick(player.decide(session.state), frame);
      // An "upload" every 97 frames, like a host's periodic tail upload.
      if (frame % 97 === 0) {
        const tail = session.trace(sent);
        uploaded.push(...tail);
        sent += tail.length;
      }
    }
    const tail = session.trace(sent);
    uploaded.push(...tail);
    expect(uploaded).toEqual(session.trace());
    // Everything handed out is a prefix of the full recording, frame for frame.
    const all = session.recorder.segmentsFrom();
    expect(all.slice(0, uploaded.length)).toEqual(uploaded);
    const sentFrames = uploaded.reduce((sum, run) => sum + run.frames, 0);
    expect(sentFrames).toBeLessThanOrEqual(session.frame);
    // With the 600-frame cap the handed-out part trails the live frame by less than one run.
    expect(session.frame - sentFrames).toBeLessThan(600);
  });
});

describe("gameplaySeed", () => {
  it("is the anchor draft when absent and a generated challenge-0 draft otherwise", () => {
    expect(createChallengeState({ battleScene: "off" })).toEqual(createInitialState({ battleScene: "off" }));
    const seeded = createChallengeState({ battleScene: "on", gameplaySeed: 0x12345678 });
    expect(seeded.factoryCarry.factoryWinStreak).toBe(0);
    expect(seeded.pendingGeneratedRound).toEqual({ rngValueBefore: 0x12345678, carry: seeded.factoryCarry });
    expect(seeded.battleSceneMode).toBe("on");
    expect(createChallengeState({ battleScene: "on", gameplaySeed: 0x12345678 })).toEqual(seeded);
    const other = createChallengeState({ battleScene: "on", gameplaySeed: 0x12345679 });
    expect(other.draftScreen.rentals.map((r) => r.source)).not.toEqual(seeded.draftScreen.rentals.map((r) => r.source));
    expect(seeded.draftScreen.rentals.map((r) => r.source)).not.toEqual(
      createChallengeState({ battleScene: "on" }).draftScreen.rentals.map((r) => r.source),
    );
    expect(() => createChallengeState({ battleScene: "off", gameplaySeed: -1 })).toThrow("u32");
    expect(() => createChallengeState({ battleScene: "off", gameplaySeed: 2 ** 32 })).toThrow("u32");
  });
});

describe("resume", () => {
  for (const scene of ["off", "on"] as const) {
    it(`reproduces the uninterrupted run frame-for-frame (Scene ${scene.toUpperCase()})`, () => {
      const frames = scene === "off" ? 11_000 : 14_000;
      const every = 101;
      const live = new FactorySession({ battleScene: scene, gameplaySeed: 42 });
      const liveHashes = new Map<number, string>();
      const liveEvents = playLive(live, soakPlayer(5, "winning"), frames, (state, frame) => {
        if (frame % every === 0) liveHashes.set(frame, frameHash(state));
      });
      expect(liveEvents.length, "the sample must contain a battle resolution").toBeGreaterThan(0);
      // Every run, the still-open one included (trace() hands out finished runs only).
      const trace = live.recorder.segmentsFrom();
      const split = Math.floor(trace.length / 2);
      const prefixFrames = trace.slice(0, split).reduce((sum, run) => sum + run.frames, 0);

      const resumed = new FactorySession({ battleScene: scene, gameplaySeed: 42 });
      const resumedEvents = resumed.resume(trace.slice(0, split));
      expect(resumed.frame).toBe(prefixFrames);
      expect(resumedEvents).toEqual(liveEvents.filter((event) => event.frame <= prefixFrames));
      expect(resumed.trace()).toEqual(trace.slice(0, split));

      // Continue live from the resumed state with the rest of the recorded inputs.
      let frame = prefixFrames;
      for (const run of trace.slice(split)) {
        const held = new Set(run.buttons);
        for (let i = 0; i < run.frames; i += 1) {
          frame += 1;
          const produced = resumed.tick(held, frame);
          expect(produced).toEqual(liveEvents.filter((event) => event.frame === frame));
          if (frame % every === 0) expect(frameHash(resumed.state), `frame ${frame}`).toBe(liveHashes.get(frame));
        }
      }
      expect(resumed.frame).toBe(live.frame);
      expect(resumed.recorder.segmentsFrom()).toEqual(trace);
      expect(resumed.battles).toEqual(live.battles);
      expect(resumed.streak).toBe(live.streak);
      expect(resumed.digest()).toBe(live.digest());
      expect(replayChallenge({ battleScene: scene, gameplaySeed: 42, segments: trace })).toEqual({
        frames: live.frame,
        streak: live.streak,
        ended: live.ended,
        battles: live.battles,
        digest: live.digest(),
        frontier: live.frontierRecord(),
      });
    });
  }
});

describe("mountFactoryGame", () => {
  type Frame = (time: number) => void;
  const saved = {
    raf: (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame,
    caf: (globalThis as { cancelAnimationFrame?: unknown }).cancelAnimationFrame,
  };
  let queue: Frame[] = [];
  let clock = 0;
  function installRaf(): void {
    queue = [];
    clock = 0;
    (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame = (cb: Frame) => {
      queue.push(cb);
      return queue.length;
    };
    (globalThis as { cancelAnimationFrame?: unknown }).cancelAnimationFrame = () => undefined;
  }
  /** Runs one animation frame `ms` later. */
  function pump(ms: number): void {
    clock += ms;
    const pending = queue;
    queue = [];
    for (const cb of pending) cb(clock);
  }
  afterEach(() => {
    (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame = saved.raf;
    (globalThis as { cancelAnimationFrame?: unknown }).cancelAnimationFrame = saved.caf;
  });

  function fakeCanvas(): { canvas: HTMLCanvasElement; draws: () => number } {
    let draws = 0;
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({
        createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
        putImageData: () => {
          draws += 1;
        },
      }),
    } as unknown as HTMLCanvasElement;
    return { canvas, draws: () => draws };
  }

  it("emits ready, samples held and tapped buttons per frame, and exposes the trace", () => {
    installRaf();
    const { canvas, draws } = fakeCanvas();
    const events: FactoryEvent[] = [];
    const game = mountFactoryGameInternal({ canvas, battleScene: "off", gameplaySeed: 9, onEvent: (event) => events.push(event) });
    expect(canvas.width).toBe(240);
    expect(canvas.height).toBe(160);
    expect(game.engine).toBe(ENGINE_BUILD);
    expect(game.frame).toBe(0);
    expect(draws()).toBe(1);
    pump(0);
    expect(events).toEqual([{ type: "ready", frame: 0 }]);
    pump(51); // 3 frames idle (16.74 ms each)
    const idle = game.frame;
    expect(idle).toBe(3);
    game.press("A");
    game.release("A"); // a tap shorter than a frame still counts for one frame
    pump(17);
    game.press("RIGHT");
    pump(34);
    game.release("RIGHT");
    pump(17);
    // The idle run after RIGHT is still open, so trace() stops at the RIGHT run.
    const trace = game.trace();
    expect(trace.map(({ frames, buttons }) => ({ frames, buttons }))).toEqual([
      { frames: 3, buttons: [] },
      { frames: 1, buttons: ["A"] },
      { frames: 2, buttons: ["RIGHT"] },
    ]);
    expect(trace.every((run) => typeof run.t === "number" && run.t >= 0)).toBe(true);
    expect(game.trace(2)).toEqual(trace.slice(2));
    expect(game.session.recorder.segmentsFrom(3).map(({ frames, buttons }) => ({ frames, buttons }))).toEqual([{ frames: 1, buttons: [] }]);
    // aud245: the contract gained setAudio / getAudio (additive).
    const contractOnly = mountFactoryGame({ canvas: fakeCanvas().canvas, battleScene: "off" });
    expect(Object.keys(contractOnly).sort()).toEqual(["destroy", "engine", "frame", "getAudio", "press", "release", "setAudio", "trace"]);
    contractOnly.destroy();
    game.destroy();
    const before = game.frame;
    pump(100);
    expect(game.frame).toBe(before);
  });

  it("fast-forwards a resumed trace across animation frames before handing over control", () => {
    installRaf();
    const live = new FactorySession({ battleScene: "off", gameplaySeed: 9 });
    const player = soakPlayer(1, "winning");
    const liveEvents: FactoryEvent[] = [];
    for (let frame = 1; frame <= 30_000 && liveEvents.length === 0; frame += 1) {
      liveEvents.push(...live.tick(player.decide(live.state), frame));
    }
    expect(liveEvents.map((event) => event.type)).toEqual(["battle-end"]);
    const total = live.frame;
    const segments: TraceSegment[] = live.trace();

    const { canvas } = fakeCanvas();
    const events: FactoryEvent[] = [];
    const game = mountFactoryGameInternal({ canvas, battleScene: "off", gameplaySeed: 9, resume: segments, onEvent: (event) => events.push(event) });
    expect(game.frame).toBe(0);
    let pumps = 0;
    while (events.length === 0 && pumps < 10_000) {
      pump(16);
      pumps += 1;
    }
    expect(events).toEqual([{ type: "ready", frame: total }]);
    expect(game.frame).toBeGreaterThanOrEqual(total);
    expect(game.trace().slice(0, segments.length)).toEqual(segments);
    expect(game.session.battles).toEqual(live.battles);
    expect(game.session.digest()).toBe(live.digest());
    game.destroy();

    // The synchronous form (the dev shell / tests) is identical.
    const sync = mountFactoryGameInternal({ canvas: fakeCanvas().canvas, battleScene: "off", gameplaySeed: 9, resume: segments, resumeSync: true });
    expect(sync.frame).toBe(total);
    expect(sync.session.digest()).toBe(live.digest());
    sync.destroy();
  });

  it("keeps the bench ABI: advance() ticks synchronously and reset() rewinds", () => {
    installRaf();
    const { canvas } = fakeCanvas();
    const game = mountFactoryGameInternal({ canvas, battleScene: "off" });
    game.advance([{ frames: 3 }, { frames: 2, buttons: ["A"] }]);
    expect(game.frame).toBe(5);
    // The A run is still open (no event cut it), so the contract trace stops before it.
    expect(game.trace().map(({ frames, buttons }) => ({ frames, buttons }))).toEqual([{ frames: 3, buttons: [] }]);
    expect(game.sessionTrace().segments).toEqual([
      { frames: 3, buttons: [] },
      { frames: 2, buttons: ["A"] },
    ]);
    expect(() => game.advance([{ frames: 1, buttons: ["JUMP"] }])).toThrow("unknown GBA button");
    game.reset();
    expect(game.frame).toBe(0);
    expect(game.trace()).toEqual([]);
    expect(game.containedErrors()).toEqual([]);
    game.destroy();
  });
});
