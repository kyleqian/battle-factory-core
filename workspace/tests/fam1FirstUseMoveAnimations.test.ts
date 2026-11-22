// fam1 (docs/fam1-first-use-move-animations.md): the first time a move animation needs a lazily downloaded file, the browser game holds
// the frame until the file is in and then draws the animation; it never drops it. Containment lets a pending animation file through a
// render (never recorded, never degrading the command) and keeps containing it on the tick; no tick reads a lazy file; and the move
// table names the files of Whirlpool and Spark (the two first uses the 2026-11-22 playtest lost). The per-move table check for every
// Factory move is tests/fam1MoveAnimationReads*.test.ts; the injected draw-time pending is tests/fam1PendingDrawHolds.test.ts.
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { render } from "../src/engine/core.ts";
import { AnimAssetPending, installAnimAssets, installedAnimAssets, type AnimAssetSource } from "../src/engine/animAssets.ts";
import { createAnimAssetStore, sharedAnimAssetStore, type AnimAssetStore } from "../src/engine/animAssetStore.ts";
import {
  clearContainedPresentationErrors, containedPresentationErrorCount, containedPresentationErrors, presentationRenderRunning,
  recordContainedPresentationError, withPresentationRender,
} from "../src/engine/presentationContainment.ts";
import { FactorySession } from "../src/factorySession.ts";
import { mountFactoryGameInternal } from "../src/lib.ts";
import { animAssetFileTexts } from "../tools/build/monPicFiles.ts";
import { recordMoveAnimationReads } from "../tools/bundle/animAssetMoveReads.ts";
import { ActionLog, RandomPlayer, Rng, runSeed } from "../tools/soak/randomRoundSoakDriver.ts";
import animAssetMoves from "../src/assets/gen/anim-asset-moves.json" with { type: "json" };

const root = resolve(import.meta.dirname, "..");
const texts = animAssetFileTexts(root);
const names = Object.keys(texts);
const lazy = new Set(names);
const byMove = animAssetMoves.byMove as Record<string, string[]>;
const sleep = (): Promise<void> => new Promise((done) => setTimeout(done, 0));
const frameHash = (session: FactorySession): string => createHash("sha1").update(render(session.state)).digest("hex").slice(0, 16);
const WHIRLPOOL = 250;
const SPARK = 209;

let full: AnimAssetSource;
beforeAll(() => {
  full = installedAnimAssets()!;
});
afterEach(() => {
  installAnimAssets(full);
  clearContainedPresentationErrors();
});

describe("fam1: containment lets a pending animation file through a render, not through a tick", () => {
  it("inside a render the pending read is rethrown and not recorded; outside a render it is contained as before", () => {
    clearContainedPresentationErrors();
    const pending = new AnimAssetPending("water-orb");
    expect(presentationRenderRunning()).toBe(false);
    expect(() => withPresentationRender(() => recordContainedPresentationError("draw", "move-animation", pending))).toThrow(pending);
    expect(() => withPresentationRender(() => withPresentationRender(() => recordContainedPresentationError("adapter", "move-animation", pending))))
      .toThrow(pending);
    expect(containedPresentationErrorCount()).toBe(0);
    // The depth unwinds through the throw: the next tick-side read is contained (recorded once) and does not escape.
    expect(presentationRenderRunning()).toBe(false);
    expect(recordContainedPresentationError("duration", "move-animation", pending)).toBe(true);
    expect(containedPresentationErrors()).toMatchObject([{ site: "duration", message: "AnimAssetPending: animation asset water-orb has not loaded" }]);
    // Any other error is still contained inside a render.
    expect(withPresentationRender(() => recordContainedPresentationError("draw", "move-animation", new TypeError("boom")))).toBe(true);
    expect(containedPresentationErrorCount()).toBe(2);
  });
});

describe("fam1: the move table", () => {
  it("lists Whirlpool's water-orb and Spark's dynamicPunch (the playtest's two dropped first uses), which their animations read", () => {
    for (const [move, file] of [[WHIRLPOOL, "water-orb"], [SPARK, "dynamicPunch"]] as const) {
      expect(recordMoveAnimationReads(move).reads, `move ${move}`).toContain(file);
      expect(byMove[move], `move ${move}`).toContain(file);
    }
  });
});

describe("fam1: no tick reads a lazy animation file", () => {
  it("Scene ON soak battles ticked without a render read none (a tick-side read would be contained, never held)", () => {
    const read: string[] = [];
    installAnimAssets({ get: (name) => (lazy.has(name) && read.push(name), full.get(name)) });
    // The battles' move animations whose table entry names a lazy file (their render reads it; their ticks must not).
    const animations = new Set<object>();
    type Observed = { factoryRoundBattleOrchestrator: { battleResolutionPresentation: { segments: { commands: { type: string; animation?: { moveId: number } }[] }[] } | null } | null };
    const observer = {
      beginSeed() {},
      recordPlayerFightCommit() {},
      observe(state: Observed) {
        for (const segment of state.factoryRoundBattleOrchestrator?.battleResolutionPresentation?.segments ?? []) {
          for (const command of segment.commands) {
            if (command.type === "move-animation" && (byMove[command.animation?.moveId ?? 0]?.length ?? 0) > 0) animations.add(command);
          }
        }
      },
    };
    for (const seed of [2, 7, 11, 19]) {
      const result = runSeed(seed, { policy: "coverage-fight", scene: "on", renderEvery: 0, maxFrames: 40_000, coverage: observer as never });
      expect(result.outcome, `seed ${seed}`).toBe("OK");
    }
    expect(animations.size).toBeGreaterThan(10);
    expect(read).toEqual([]);
  }, 240_000);
});

describe("fam1: the mount loop holds on every animation file the prefetch did not name, then draws the animation", () => {
  type Frame = (time: number) => void;
  const saved = {
    raf: (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame,
    caf: (globalThis as { cancelAnimationFrame?: unknown }).cancelAnimationFrame,
  };
  let queue: Frame[] = [];
  let clock = 0;
  function pump(ms: number): void {
    clock += ms;
    const pendingFrames = queue;
    queue = [];
    for (const cb of pendingFrames) cb(clock);
  }
  afterEach(() => {
    (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame = saved.raf;
    (globalThis as { cancelAnimationFrame?: unknown }).cancelAnimationFrame = saved.caf;
  });

  it("a store that names no file to the prefetch (every table entry missing): every drawn frame equals the full-table render, no contained error", async () => {
    clearContainedPresentationErrors();
    const requested: string[] = [];
    const real = createAnimAssetStore({
      names,
      load: async (name) => {
        requested.push(name);
        await sleep();
        return texts[name]!;
      },
    });
    // `has` false: the needs scan names nothing, so the only fetches are the ones a render's pending read starts (drawOrHold).
    const hidden: AnimAssetStore = {
      source: real.source,
      names: real.names,
      has: () => false,
      pending: (wanted) => real.pending(wanted),
      whenLoaded: (wanted) => real.whenLoaded(wanted),
      takeMissed: () => real.takeMissed(),
      get failure() {
        return real.failure;
      },
    };
    sharedAnimAssetStore("fam1-hidden", () => hidden);
    installAnimAssets(hidden.source);
    queue = [];
    clock = 0;
    (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame = (cb: Frame) => (queue.push(cb), queue.length);
    (globalThis as { cancelAnimationFrame?: unknown }).cancelAnimationFrame = () => undefined;
    const drawn = new Map<number, string>();
    let frameOfGame = (): number => 0;
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({
        createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
        putImageData: (image: { data: Uint8ClampedArray }) => {
          drawn.set(frameOfGame(), createHash("sha1").update(image.data).digest("hex").slice(0, 16));
        },
      }),
    } as unknown as HTMLCanvasElement;
    const errors: string[] = [];
    const game = mountFactoryGameInternal({ canvas, battleScene: "on", gameplaySeed: 4, onError: (error) => errors.push(error.message) });
    frameOfGame = () => game.frame;
    await game.pixelsReady;
    const player = new RandomPlayer(new Rng(4), new ActionLog(false), "winning");
    let held = new Set<string>();
    for (let step = 0; step < 6000; step += 1) {
      const decided = player.decide(game.session.state);
      for (const button of held) if (!decided.has(button as never)) game.release(button as never);
      for (const button of decided) game.press(button);
      held = new Set(decided);
      pump(17);
      if (step % 4 === 0) await sleep();
    }
    game.destroy();
    expect(errors).toEqual([]);
    expect(containedPresentationErrorCount()).toBe(0);
    // Animation files were read before they arrived (nothing prefetched them) and each was fetched once.
    expect(requested.length).toBeGreaterThan(0);
    expect(new Set(requested).size).toBe(requested.length);

    installAnimAssets(full);
    const replay = new FactorySession({ battleScene: "on", gameplaySeed: 4 });
    let frames = 0;
    let compared = 0;
    const mismatched: number[] = [];
    for (const segment of game.sessionTrace().segments) {
      for (let at = 0; at < segment.frames; at += 1) {
        replay.replayStep(new Set(segment.buttons) as never);
        frames += 1;
        const hash = drawn.get(frames);
        if (hash !== undefined) {
          compared += 1;
          if (frameHash(replay) !== hash) mismatched.push(frames);
        }
      }
    }
    expect(compared).toBeGreaterThan(1500);
    expect(mismatched).toEqual([]);
    expect(frames).toBe(game.frame);
    expect(replay.digest()).toBe(game.session.digest());
  }, 300_000);
});
