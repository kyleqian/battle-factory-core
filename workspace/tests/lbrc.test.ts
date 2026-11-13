// lbr-c (docs/lbrc-challenge-request.md): after a challenge ended, the attendant's save dialog reports `challenge-request` once and the
// library game holds there for the host to destroy the mount. `challenge-end` is untouched and the trace the anti-cheat sees gets nothing.
import { createHash } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { render, type EngineState } from "../src/engine/core.ts";
import type { FactoryEvent, TraceSegment } from "../src/factoryContract.ts";
import { FactorySession, type FactorySessionOptions } from "../src/factorySession.ts";
import { replayChallenge } from "../src/headless.ts";
import { mountFactoryGameInternal } from "../src/lib.ts";
import type { GbaButton } from "../src/input.ts";
import { ActionLog, RandomPlayer, Rng } from "../tools/soak/randomRoundSoakDriver.ts";

type Kind = "loss" | "retire";

interface Lobby {
  readonly session: FactorySession;
  readonly events: FactoryEvent[];
  /** The input trace the host holds at the `challenge-end` event (what it uploads). */
  readonly endTrace: TraceSegment[];
}

function playToLobby(kind: Kind, challengeRequest: FactorySessionOptions["challengeRequest"]): Lobby {
  const session = new FactorySession({ battleScene: "off", challengeRequest });
  const player =
    kind === "retire"
      ? new RandomPlayer(new Rng(1), new ActionLog(false), "winning")
      : new RandomPlayer(new Rng(0), new ActionLog(false), "vanilla");
  if (kind === "retire") player.retireRate = 1;
  player.newChallengeFromLobby = false;
  const events: FactoryEvent[] = [];
  let endTrace: TraceSegment[] | null = null;
  for (let frame = 1; frame <= 60_000; frame += 1) {
    const produced = session.tick(player.decide(session.state), frame);
    events.push(...produced);
    if (endTrace === null && produced.some((event) => event.type === "challenge-end")) endTrace = session.trace();
    if (session.state.lobbyFreeRoam !== null && endTrace !== null) {
      for (let i = 0; i < 90; i += 1) events.push(...session.tick(new Set<GbaButton>(), 0));
      return { session, events, endTrace };
    }
  }
  throw new Error(`${kind}: never reached the walkable Lobby`);
}

/** Tap A (2 held, 6 released) up to `limit` frames, or until `stop` says so. */
function tapA(session: FactorySession, events: FactoryEvent[], limit: number, stop: (state: EngineState) => boolean): number {
  const A = new Set<GbaButton>(["A"]);
  const idle = new Set<GbaButton>();
  let frames = 0;
  while (frames < limit) {
    for (const keys of [A, A, idle, idle, idle, idle, idle, idle]) {
      events.push(...session.tick(keys, 0));
      frames += 1;
      if (stop(session.state)) return frames;
    }
  }
  return frames;
}

const frameHash = (state: EngineState): string => createHash("sha1").update(render(state)).digest("hex").slice(0, 16);
const types = (events: readonly FactoryEvent[]): string[] => events.map((event) => event.type);

for (const kind of ["loss", "retire"] as const) {
  describe(`lbrc: challenge-request after a ${kind} (Scene OFF)`, () => {
    const run = playToLobby(kind, undefined);
    const { session, events, endTrace } = run;
    const endEvent = events.find((event) => event.type === "challenge-end")!;
    const afterEnd: FactoryEvent[] = [];
    const afterConversation = tapA(session, afterEnd, 3000, (state) => state.lobbyAttendant?.saveDialogStarted === true);
    const request = afterEnd.find((event) => event.type === "challenge-request");
    const heldState = session.state;
    const heldHash = frameHash(heldState);

    it("challenge-end fires where it always did (loss: with battle-end; retire: on the Lobby-entry frame), exactly once, before the request", () => {
      expect(types(events)).toEqual(["battle-end", "challenge-end"]);
      expect(endEvent).toMatchObject({ type: "challenge-end", reason: kind });
      expect(session.ended).toBe(kind);
      expect(afterEnd.filter((event) => event.type === "challenge-end")).toEqual([]);
    });

    it("emits challenge-request once, on the first frame of the ROM save dialog", () => {
      expect(types(afterEnd)).toEqual(["challenge-request"]);
      expect(request).toEqual({ type: "challenge-request", frame: session.frame });
      expect(request!.frame).toBeGreaterThan(endEvent.frame);
      expect(heldState.lobbyAttendant).toMatchObject({ screen: "saveInfo", phase: "talk", age: 0, lead: null, saveDialogStarted: true });
      expect(afterConversation).toBeLessThan(3000);
    });

    it("then holds: input is ignored, the picture does not change, no further event, the mount stays in the Lobby", () => {
      const more: FactoryEvent[] = [];
      const keysets: GbaButton[][] = [["A"], ["B"], ["UP"], ["DOWN"], ["A", "B"], ["START"], ["LEFT"], []];
      for (let i = 0; i < 400; i += 1) {
        more.push(...session.tick(new Set(keysets[i % keysets.length]), 0));
        expect(session.state.lobbyAttendant).toBe(heldState.lobbyAttendant);
        expect(session.state.lobbyFreeRoam).toBe(heldState.lobbyFreeRoam);
        if (i % 40 === 0) expect(frameHash(session.state)).toBe(heldHash);
      }
      expect(frameHash(session.state)).toBe(heldHash);
      expect(more).toEqual([]);
      expect(session.ended).toBe(kind);
    });

    it("adds nothing to the trace the anti-cheat sees: the trace read at challenge-end is a prefix of the final trace and replays to the same outcome", () => {
      const full = session.trace();
      expect(full.length).toBeGreaterThanOrEqual(endTrace.length);
      expect(JSON.stringify(full.slice(0, endTrace.length))).toBe(JSON.stringify(endTrace));
      // The trace read right after challenge-end ends at that event's frame; the later request event only cuts runs after it.
      expect(endTrace.reduce((n, segment) => n + segment.frames, 0)).toBe(endEvent.frame);
      const atEnd = replayChallenge({ battleScene: "off", segments: endTrace });
      const all = replayChallenge({ battleScene: "off", segments: full });
      expect(atEnd.ended).toBe(kind);
      expect(all.ended).toBe(kind);
      expect(all.digest).toBe(atEnd.digest);
      expect(all.battles).toEqual(atEnd.battles);
      expect(all.streak).toBe(atEnd.streak);
      expect(atEnd.frames).toBe(endEvent.frame);
      expect(all.frames).toBe(full.reduce((n, segment) => n + segment.frames, 0));
    });
  });
}

describe("lbrc: library mount", () => {
  const saved = { raf: globalThis.requestAnimationFrame, caf: globalThis.cancelAnimationFrame };
  afterEach(() => {
    (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame = saved.raf;
    (globalThis as { cancelAnimationFrame?: unknown }).cancelAnimationFrame = saved.caf;
  });
  it("the mount (default = hold) reports challenge-request through onEvent and then holds; the host destroys it", () => {
    const run = playToLobby("loss", undefined);
    (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame = () => 0;
    (globalThis as { cancelAnimationFrame?: unknown }).cancelAnimationFrame = () => undefined;
    const events: FactoryEvent[] = [];
    const data = new Uint8ClampedArray(240 * 160 * 4);
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ createImageData: () => ({ data }), putImageData: () => undefined }),
    } as unknown as HTMLCanvasElement;
    const game = mountFactoryGameInternal({
      canvas,
      battleScene: "off",
      resume: run.session.trace(),
      resumeSync: true,
      onEvent: (event) => events.push(event),
    });
    try {
      const A = ["A"];
      const idle: string[] = [];
      for (let i = 0; i < 400 && !events.some((event) => event.type === "challenge-request"); i += 1) {
        game.advance([{ frames: 2, buttons: A }, { frames: 6, buttons: idle }]);
      }
      expect(events.filter((event) => event.type === "challenge-request")).toHaveLength(1);
      const lobby = game.session.state.lobbyAttendant;
      game.advance([{ frames: 300, buttons: A }]);
      expect(game.session.state.lobbyAttendant).toBe(lobby);
      expect(events.filter((event) => event.type === "challenge-request")).toHaveLength(1);
    } finally {
      game.destroy();
    }
  }, 120_000);
});

describe("lbrc: continue mode and the not-ended guard", () => {
  it('challengeRequest "continue" reports the event once and lets the in-game new challenge run (dev shell / soak path)', () => {
    const run = playToLobby("loss", "continue");
    const after: FactoryEvent[] = [];
    tapA(run.session, after, 6000, (state) => state.lobbyFreeRoam === null);
    expect(types(after)).toEqual(["challenge-request"]);
    expect(run.session.state.lobbyFreeRoam).toBeNull();
    expect(run.session.state.draftScreen).not.toBeNull();
  }, 120_000);

  it("on a mount whose challenge has not ended nothing is reported and nothing is held (lbr-b behaviour)", () => {
    const run = playToLobby("loss", "continue");
    const fresh = new FactorySession({ battleScene: "off" });
    fresh.state = run.session.state;
    (fresh as unknown as { syncMarkers(): void }).syncMarkers();
    const after: FactoryEvent[] = [];
    tapA(fresh, after, 6000, (state) => state.lobbyFreeRoam === null);
    expect(after).toEqual([]);
    expect(fresh.ended).toBeNull();
    expect(fresh.state.lobbyFreeRoam).toBeNull();
    expect(fresh.state.attendantRequestHold).toBe(false);
  }, 120_000);
});
