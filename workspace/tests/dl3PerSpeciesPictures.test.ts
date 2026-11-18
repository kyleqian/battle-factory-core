// dl3: the per-species battle picture store, its hold in the mount loop, and the headless path that never needs it
// (docs/dl3-per-species-pictures.md). The store is injected through the shared-store seam, so no build and no network are needed.
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { render } from "../src/engine/core.ts";
import { installedMonPicPixels, installMonPicPixels, type MonPicPixelTables } from "../src/engine/monPicPixels.ts";
import { MonPicPending } from "../src/engine/monPicPending.ts";
import { neededMonPics } from "../src/engine/monPicNeeds.ts";
import { createMonPicSpriteStore, sharedMonPicSpriteStore, type MonPicSpriteStore } from "../src/engine/monPicSpriteStore.ts";
import { recordContainedPresentationError } from "../src/engine/presentationContainment.ts";
import { FactorySession } from "../src/factorySession.ts";
import { mountFactoryGameInternal } from "../src/lib.ts";
import { monPicFileTexts } from "../tools/build/monPicFiles.ts";
import { ActionLog, RandomPlayer, Rng } from "../tools/soak/randomRoundSoakDriver.ts";

const root = resolve(import.meta.dirname, "..");
const texts = monPicFileTexts(root);
const species = Object.keys(texts);
const sleep = (): Promise<void> => new Promise((done) => setTimeout(done, 0));
const frameHash = (session: FactorySession): string => createHash("sha1").update(render(session.state)).digest("hex").slice(0, 16);

let full: MonPicPixelTables;
beforeAll(() => {
  full = installedMonPicPixels()!;
});
afterEach(() => installMonPicPixels(full));

type Loader = { requested: string[]; release(): void; fail: Set<string>; store: MonPicSpriteStore };
/** A store whose files arrive only after `release()` (or one macrotask when `autoRelease`). */
function gatedStore(autoRelease = false): Loader {
  const requested: string[] = [];
  const waiting: (() => void)[] = [];
  const fail = new Set<string>();
  let open = autoRelease;
  const store = createMonPicSpriteStore({
    species,
    load: async (name) => {
      requested.push(name);
      if (autoRelease) await sleep();
      else if (!open) await new Promise<void>((done) => waiting.push(done));
      if (fail.has(name)) throw new Error("404");
      return texts[name]!;
    },
  });
  return {
    requested,
    fail,
    store,
    release() {
      open = true;
      for (const done of waiting.splice(0)) done();
    },
  };
}

describe("dl3: the per-species store", () => {
  it("reads throw MonPicPending until the file arrives, then decode exactly like the full tables", async () => {
    const { store, requested } = gatedStore(true);
    expect(() => store.tables.front.ABRA).toThrow(MonPicPending);
    expect(requested).toEqual(["ABRA"]); // a read starts the fetch
    expect(store.pending(["ABRA", "ONIX", "NOT_A_SPECIES"])).toEqual(["ABRA", "ONIX"]);
    await store.whenLoaded(["ABRA", "ONIX"]);
    expect(store.pending(["ABRA", "ONIX"])).toEqual([]);
    for (const name of ["ABRA", "ONIX"]) {
      expect(store.tables.front[name]).toEqual(full.front[name]);
      expect(store.tables.back[name]).toEqual(full.back[name]);
    }
    expect(Object.keys(store.tables.front)).toEqual(Object.keys(full.front));
    expect(requested).toEqual(["ABRA", "ONIX"]); // each file once
  });

  it("retries a failed file once, then holds a sticky failure", async () => {
    const calls: string[] = [];
    let attempts = 0;
    const flaky = createMonPicSpriteStore({
      species,
      load: async (name) => {
        calls.push(name);
        attempts += 1;
        if (attempts === 1) throw new Error("reset");
        return texts[name]!;
      },
    });
    await flaky.whenLoaded(["ABRA"]);
    expect(calls).toEqual(["ABRA", "ABRA"]);
    expect(flaky.failure).toBeNull();

    const dead = createMonPicSpriteStore({
      species,
      load: async () => {
        throw new Error("404");
      },
    });
    await expect(dead.whenLoaded(["ABRA"])).rejects.toThrow("ABRA failed to load");
    expect(dead.failure?.message).toContain("404");
  });

  it("a contained presentation error that is a pending picture is rethrown, any other is still contained", () => {
    expect(() => recordContainedPresentationError("draw", "x", new MonPicPending("ABRA"))).toThrow(MonPicPending);
    expect(recordContainedPresentationError("draw", "dl3-test", new Error("dl3 other"))).toBe(true);
  });
});

describe("dl3: the headless / node path needs no pictures", () => {
  it("ticks never read a pixel: a session ticks 1500 frames over a store with nothing loaded and requests nothing", () => {
    const { store, requested } = gatedStore();
    installMonPicPixels(store.tables);
    const session = new FactorySession({ battleScene: "on", gameplaySeed: 3 });
    const player = new RandomPlayer(new Rng(3), new ActionLog(false), "winning");
    for (let frame = 1; frame <= 1500; frame += 1) session.tick(player.decide(session.state), frame);
    expect(requested).toEqual([]);
  });

  it("neededMonPics names the draft's six at the first frame and the battle parties later", () => {
    const session = new FactorySession({ battleScene: "off", gameplaySeed: 4 });
    const first = neededMonPics(session.state, (name) => species.includes(name));
    expect(first.size).toBeGreaterThanOrEqual(6);
    expect(first.size).toBeLessThanOrEqual(12);
    const player = new RandomPlayer(new Rng(4), new ActionLog(false), "winning");
    let latest = first;
    for (let frame = 1; frame <= 4000; frame += 1) {
      session.tick(player.decide(session.state), frame);
      if (frame % 200 === 0) latest = new Set([...latest, ...neededMonPics(session.state, (name) => species.includes(name))]);
    }
    expect(latest.size).toBeGreaterThan(first.size);
  });
});

describe("dl3: the mount loop holds on a picture that has not arrived", () => {
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
    (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame = (cb: Frame) => (queue.push(cb), queue.length);
    (globalThis as { cancelAnimationFrame?: unknown }).cancelAnimationFrame = () => undefined;
  }
  function pump(ms: number): void {
    clock += ms;
    const pending = queue;
    queue = [];
    for (const cb of pending) cb(clock);
  }
  function fakeCanvas(onDraw?: (data: Uint8ClampedArray) => void): { canvas: HTMLCanvasElement; draws: () => number } {
    let draws = 0;
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({
        createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
        putImageData: (image: { data: Uint8ClampedArray }) => {
          draws += 1;
          onDraw?.(image.data);
        },
      }),
    } as unknown as HTMLCanvasElement;
    return { canvas, draws: () => draws };
  }
  afterEach(() => {
    (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame = saved.raf;
    (globalThis as { cancelAnimationFrame?: unknown }).cancelAnimationFrame = saved.caf;
  });

  it("no tick and no draw while the draft's pictures are in flight, then it starts and the trace matches a full-table replay", async () => {
    const gate = gatedStore();
    sharedMonPicSpriteStore("dl3-hold", () => gate.store);
    installMonPicPixels(gate.store.tables);
    installRaf();
    // The last drawn frame's hash per session frame: every one must equal what the full tables render for that frame.
    const drawn = new Map<number, string>();
    let frameOfGame = (): number => 0;
    const { canvas, draws } = fakeCanvas((data) => drawn.set(frameOfGame(), createHash("sha1").update(data).digest("hex").slice(0, 16)));
    const events: string[] = [];
    const game = mountFactoryGameInternal({ canvas, battleScene: "on", gameplaySeed: 4, onEvent: (event) => events.push(event.type) });
    frameOfGame = () => game.frame;
    expect(gate.requested.length).toBeGreaterThanOrEqual(6); // the draft's six are requested at mount
    game.press("A"); // before the pictures: dropped
    for (let step = 0; step < 5; step += 1) {
      await sleep();
      pump(17);
    }
    expect(game.frame).toBe(0);
    expect(draws()).toBe(0);
    expect(events).toEqual([]);

    gate.release();
    await game.pixelsReady;
    expect(draws()).toBe(1);

    // Play on with a seeded soak player through the hold points (the files arrive one macrotask late from here on).
    const player = new RandomPlayer(new Rng(4), new ActionLog(false), "winning");
    // The gate is open now: later files resolve on a microtask turn, so each batch of sync pumps below holds until the next await.
    let held = new Set<string>();
    for (let step = 0; step < 2600; step += 1) {
      const decided = player.decide(game.session.state);
      for (const button of held) if (!decided.has(button as never)) game.release(button as never);
      for (const button of decided) game.press(button);
      held = new Set(decided);
      pump(17);
      if (step % 8 === 0) await sleep();
    }
    game.destroy();
    expect(game.frame).toBeGreaterThan(1500);
    expect(events[0]).toBe("ready");
    // More than the draft's six pictures were fetched, so the battle's parties were requested by the loop.
    expect(new Set(gate.requested).size).toBeGreaterThan(6);

    // The same trace through the full tables: identical state, identical rendered frame.
    installMonPicPixels(full);
    const replay = new FactorySession({ battleScene: "on", gameplaySeed: 4 });
    const trace = game.sessionTrace().segments; // trace() leaves the open run out
    let frames = 0;
    let compared = 0;
    const mismatched: number[] = [];
    for (const segment of trace) {
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
    expect(compared).toBeGreaterThan(1000);
    expect(mismatched).toEqual([]);
    expect(frames).toBe(game.frame);
    expect(replay.digest()).toBe(game.session.digest());
    expect(frameHash(replay)).toBe(frameHash(game.session));
  }, 180_000);

  it("a file that never loads ends in onError once and never starts the loop", async () => {
    const gate = gatedStore(true);
    for (const name of species) gate.fail.add(name);
    sharedMonPicSpriteStore("dl3-fail", () => gate.store);
    installMonPicPixels(gate.store.tables);
    installRaf();
    const { canvas, draws } = fakeCanvas();
    const errors: string[] = [];
    const quiet = console.error;
    console.error = () => undefined;
    try {
      const game = mountFactoryGameInternal({ canvas, battleScene: "off", gameplaySeed: 4, onError: (error) => errors.push(error.message) });
      await game.pixelsReady.catch(() => undefined);
      await sleep();
      pump(17);
      expect(gate.store.failure).not.toBeNull();
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain("sprite pixels failed to load");
      expect(draws()).toBe(0);
      game.destroy();
    } finally {
      console.error = quiet;
    }
  });
});
