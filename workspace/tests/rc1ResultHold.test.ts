// rc1 (Kyle, 2026-11-21): the library option `lobby: "skip"` replaces the walkable Lobby after a round with black result holds the
// host draws its card over (src/engine/resultHold.ts). A loss / forfeit holds from the first black frame of the battle's fade, a
// retire from the first black frame of its warp (and its challenge-end moves there), a 7-win from the first black frame after the
// battle room, where A / START deals the next round's draft. Without the option nothing changes (the default "walk").
import { afterEach, describe, expect, it } from "vitest";
import { render, type EngineState } from "../src/engine/core.ts";
import { ROUND_HOLD_INPUT_DELAY } from "../src/engine/resultHold.ts";
import type { FactoryEvent, TraceSegment } from "../src/factoryContract.ts";
import { FactorySession } from "../src/factorySession.ts";
import { replayChallenge } from "../src/headless.ts";
import type { GbaButton } from "../src/input.ts";
import { mountFactoryGameInternal } from "../src/lib.ts";
import { ActionLog, RandomPlayer, Rng } from "../tools/soak/randomRoundSoakDriver.ts";

type Scene = "on" | "off";
const A: ReadonlySet<GbaButton> = new Set(["A"]);
const START: ReadonlySet<GbaButton> = new Set(["START"]);
const IDLE: ReadonlySet<GbaButton> = new Set();
/** Seeds as in tests/lbrd.test.ts: 0 wins the anchor's first round ("winning" policy) in both scenes and wins battle 1 before a retire. */
const WIN_SEED = 0;

function player(seed: number, setup: (p: RandomPlayer) => void = () => undefined): RandomPlayer {
  const p = new RandomPlayer(new Rng(seed), new ActionLog(false), "winning");
  p.newChallengeFromLobby = false;
  setup(p);
  return p;
}

function isBlack(state: EngineState): boolean {
  const pixels = render(state);
  for (let i = 0; i < pixels.length; i += 4) if (pixels[i] !== 0 || pixels[i + 1] !== 0 || pixels[i + 2] !== 0) return false;
  return true;
}

const plain = (events: readonly FactoryEvent[]) => events.map((event) => JSON.stringify(event));

interface Played {
  session: FactorySession;
  events: FactoryEvent[];
  /** The same play without the option, ticked in lockstep up to the skip session's first hold. */
  walk: FactorySession;
  walkEvents: FactoryEvent[];
}

/** Plays a skip session and a walk session with identical players until the skip session reports `result-screen`. */
function playToHold(scene: Scene, setup: (p: RandomPlayer) => void = () => undefined): Played {
  const session = new FactorySession({ battleScene: scene, lobby: "skip" });
  const walk = new FactorySession({ battleScene: scene });
  const skipPlayer = player(WIN_SEED, setup);
  const walkPlayer = player(WIN_SEED, setup);
  const events: FactoryEvent[] = [];
  const walkEvents: FactoryEvent[] = [];
  for (let frame = 1; frame <= 150_000; frame += 1) {
    const produced = session.tick(skipPlayer.decide(session.state), 0);
    events.push(...produced);
    if (produced.some((event) => event.type === "result-screen")) return { session, events, walk, walkEvents };
    walkEvents.push(...walk.tick(walkPlayer.decide(walk.state), 0));
  }
  throw new Error("no result-screen");
}

describe("rc1: the default is the Lobby, unchanged", () => {
  it('"walk" and no option build the same states, without the rc1 fields', () => {
    const none = new FactorySession({ battleScene: "off", gameplaySeed: 77 });
    const walk = new FactorySession({ battleScene: "off", gameplaySeed: 77, lobby: "walk" });
    expect(walk.state).toEqual(none.state);
    expect("lobbySkip" in none.state).toBe(false);
    expect("resultHold" in none.state).toBe(false);
    const skip = new FactorySession({ battleScene: "off", gameplaySeed: 77, lobby: "skip" });
    expect(skip.state.lobbySkip).toBe(true);
    const { lobbySkip: _flag, ...rest } = skip.state;
    expect(rest).toEqual(none.state);
  });
});

for (const scene of ["off", "on"] as const) {
  describe(`rc1: a 7-win holds black, A deals the next round's draft (Scene ${scene.toUpperCase()})`, () => {
    let played: Played;
    it("plays exactly like the Lobby mode up to the hold: the same battle-ends and round-end on the same frames", () => {
      played = playToHold(scene);
      const { events, walkEvents, session, walk } = played;
      const types = events.map((event) => event.type);
      expect(types).toEqual([...Array.from({ length: 7 }, () => "battle-end"), "round-end", "result-screen"]);
      expect(plain(events.slice(0, 8))).toEqual(plain(walkEvents));
      expect(events[8]).toEqual({ type: "result-screen", reason: "round", streak: 7, frame: session.frame });
      // The Lobby mode is on the frame before, at the same point of the return span: the battle room has faded out.
      expect(walk.frame).toBe(session.frame - 1);
      expect(session.state.resultHold).toEqual({ kind: "round", age: 0 });
      expect(session.resultScreen()).toEqual({ reason: "round", streak: 7 });
      expect(isBlack(session.state)).toBe(true);
      expect(session.state.lobbyFreeRoam).toBeNull();
      expect(session.ended).toBeNull();
    }, 120_000);

    it(`holds black and ignores every press until ${ROUND_HOLD_INPUT_DELAY} frames in, then A deals the next draft with the streak carried`, () => {
      const { session } = played;
      const before = session.state;
      const held: FactoryEvent[] = [];
      // Presses inside the input delay change nothing but the frame counter and the vblank cursor.
      for (let i = 0; i < ROUND_HOLD_INPUT_DELAY - 1; i += 1) held.push(...session.tick(i % 4 === 0 ? A : i % 4 === 2 ? START : IDLE, 0));
      expect(held).toEqual([]);
      expect(session.state.resultHold).toEqual({ kind: "round", age: ROUND_HOLD_INPUT_DELAY - 1 });
      expect(session.state.factoryRoundBattleOrchestrator).toBe(before.factoryRoundBattleOrchestrator);
      expect(isBlack(session.state)).toBe(true);
      held.push(...session.tick(IDLE, 0)); // age 30: from here a new press counts
      for (let i = 0; i < 20; i += 1) held.push(...session.tick(IDLE, 0));
      expect(held).toEqual([]);
      const releaseFrame = session.frame + 1;
      const released = session.tick(A, 0);
      expect(released).toEqual([{ type: "round-continue", frame: releaseFrame }]);
      const draft = session.state;
      expect(draft.resultHold).toBeNull();
      expect(draft.factoryRoundBattleOrchestrator).toBeNull();
      expect(draft.postwin).toBeNull();
      expect(draft.factoryTerminal).toBeNull();
      expect(draft.lobbyFreeRoam).toBeNull();
      expect(draft.prebattleEntry).toBeNull();
      expect(draft.lobbySkip).toBe(true);
      expect(isBlack(draft)).toBe(false);
      // The won Lobby's carry step: +7, the round's rents, 3 BP for a first challenge.
      expect(draft.factoryCarry).toMatchObject({ factoryWinStreak: 7, battlePoints: 3, factorySymbolsCount: 0 });
      expect(draft.factoryCarry.rentsCount).toBe(before.factoryRoundBattleOrchestrator!.facilityState.rentsCount);
      expect(draft.pendingGeneratedRound!.carry).toBe(draft.factoryCarry);
      expect(session.resultScreen()).toBeNull();
      // Holding A does not count again on the draft (it is the same press).
      expect(session.tick(A, 0)).toEqual([]);
    });

    if (scene === "off") {
      it("the next round goes on from 7: the next battle-end is streak 8, and the whole trace replays with the option", () => {
        const { session } = played;
        const p = player(WIN_SEED + 1);
        const more: FactoryEvent[] = [];
        for (let frame = 0; frame < 60_000 && !more.some((event) => event.type === "battle-end"); frame += 1) {
          more.push(...session.tick(p.decide(session.state), 0));
        }
        const end = more.find((event) => event.type === "battle-end") as Extract<FactoryEvent, { type: "battle-end" }>;
        expect(end).toBeDefined();
        expect(end.streak).toBe(end.result === "win" ? 8 : 7);
        const segments = session.recorder.segmentsFrom() as TraceSegment[];
        const replay = replayChallenge({ battleScene: scene, lobby: "skip", segments });
        expect(replay.battles).toEqual(session.battles);
        expect(replay.streak).toBe(session.streak);
        expect(replay.ended).toBe(session.ended);
        expect(replay.digest).toBe(session.digest());
        expect(replay.frames).toBe(session.frame);
        // Without the option the same inputs walk into the Lobby: the second round never starts.
        const walked = replayChallenge({ battleScene: scene, segments });
        expect(walked.battles.length).toBe(7);
      }, 120_000);
    }
  });
}

describe("rc1: a resume into a round hold reports the card again", () => {
  type Frame = (time: number) => void;
  const g = globalThis as { requestAnimationFrame?: unknown; cancelAnimationFrame?: unknown };
  const saved = { raf: g.requestAnimationFrame, caf: g.cancelAnimationFrame };
  afterEach(() => {
    g.requestAnimationFrame = saved.raf;
    g.cancelAnimationFrame = saved.caf;
  });

  it("FactorySession.resume lands in the hold; the mount says ready, then result-screen", () => {
    const { session } = playToHold("off");
    for (let i = 0; i < 12; i += 1) session.tick(IDLE, 0);
    const trace = session.recorder.segmentsFrom() as TraceSegment[];
    const resumed = new FactorySession({ battleScene: "off", lobby: "skip" });
    expect(resumed.resume(trace).map((event) => event.type)).toContain("result-screen");
    expect(resumed.frame).toBe(session.frame);
    expect(resumed.state.resultHold).toEqual(session.state.resultHold);
    expect(resumed.resultScreen()).toEqual({ reason: "round", streak: 7 });

    const queue: Frame[] = [];
    g.requestAnimationFrame = (cb: Frame) => queue.push(cb);
    g.cancelAnimationFrame = () => undefined;
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }), putImageData: () => undefined }),
    } as unknown as HTMLCanvasElement;
    const events: FactoryEvent[] = [];
    const game = mountFactoryGameInternal({ canvas, battleScene: "off", lobby: "skip", resume: trace, resumeSync: true, onEvent: (event) => events.push(event) });
    queue.shift()!(0);
    expect(events).toEqual([
      { type: "ready", frame: session.frame },
      { type: "result-screen", reason: "round", streak: 7, frame: session.frame },
    ]);
    game.destroy();
  }, 120_000);
});

describe("rc1: a loss holds black from the end of the battle's fade", () => {
  it("a forfeit: challenge-end where it always was, result-screen loss 36 frames later on the first black frame, then nothing", () => {
    const { session, events, walkEvents } = playToHold("off", (p) => {
      p.forfeitRate = 1;
    });
    expect(events.map((event) => event.type)).toEqual(["battle-end", "challenge-end", "result-screen"]);
    expect(plain(events.slice(0, 2))).toEqual(plain(walkEvents));
    const end = events[1] as Extract<FactoryEvent, { type: "challenge-end" }>;
    expect(end).toMatchObject({ reason: "loss", streak: 0 });
    expect(events[2]).toEqual({ type: "result-screen", reason: "loss", streak: 0, frame: end.frame + 36 });
    expect(isBlack(session.state)).toBe(true);
    expect(session.resultScreen()).toEqual({ reason: "loss", streak: 0 });
    const later: FactoryEvent[] = [];
    for (let i = 0; i < 600; i += 1) later.push(...session.tick(i % 3 === 0 ? A : i % 3 === 1 ? START : IDLE, 0));
    expect(later).toEqual([]);
    expect(session.state.resultHold!.kind).toBe("end");
    expect(session.state.lobbyFreeRoam).toBeNull();
    expect(isBlack(session.state)).toBe(true);
    // The trace up to challenge-end (what a host uploads: the event cut the run there) replays the same with or without the option.
    const upToEnd: TraceSegment[] = [];
    let frames = 0;
    for (const run of session.recorder.segmentsFrom() as TraceSegment[]) {
      if (frames >= end.frame) break;
      upToEnd.push(run);
      frames += run.frames;
    }
    expect(frames).toBe(end.frame);
    const withOption = replayChallenge({ battleScene: "off", lobby: "skip", segments: upToEnd });
    expect(withOption).toEqual(replayChallenge({ battleScene: "off", segments: upToEnd }));
    expect(withOption).toMatchObject({ ended: "loss", streak: 0, frames: end.frame });
  }, 120_000);

  it("a retire: challenge-end retire and result-screen on the RETIRE warp's first black frame, and the trace to there replays to the retire", () => {
    const { session, events } = playToHold("off", (p) => {
      p.retireRate = 1;
    });
    const types = events.map((event) => event.type);
    expect(types.slice(-2)).toEqual(["challenge-end", "result-screen"]);
    const end = events[events.length - 2] as Extract<FactoryEvent, { type: "challenge-end" }>;
    expect(end).toMatchObject({ reason: "retire", frame: session.frame });
    expect(events[events.length - 1]).toEqual({ type: "result-screen", reason: "retire", streak: end.streak, frame: session.frame });
    expect(end.streak).toBeGreaterThan(0);
    expect(isBlack(session.state)).toBe(true);
    expect(session.state.postwin!.question!.kind).toBe("retire");
    const trace = session.trace();
    expect(trace.reduce((sum, run) => sum + run.frames, 0)).toBe(session.frame);
    const replay = replayChallenge({ battleScene: "off", lobby: "skip", segments: trace });
    expect(replay.ended).toBe("retire");
    expect(replay.streak).toBe(end.streak);
    expect(replay.battles).toEqual(session.battles);
    // Without the option the same trace has not reached the Lobby's free walking yet: no end (a server accepts a claimed retire so).
    expect(replayChallenge({ battleScene: "off", segments: trace }).ended).toBeNull();
  }, 120_000);
});
