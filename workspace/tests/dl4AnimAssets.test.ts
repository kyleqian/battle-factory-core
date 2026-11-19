// dl4: the move-animation asset provider, the per-asset store, the needs scan and the hold in the mount loop (docs/dl3-per-species-pictures.md, dl4).
// The store is injected through the shared-store seam, so no build and no network are needed.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { render } from "../src/engine/core.ts";
import { AnimAssetPending, installAnimAssets, installedAnimAssets, lazyAnimAsset, type AnimAssetSource } from "../src/engine/animAssets.ts";
import { neededAnimAssets, neededMoveIds } from "../src/engine/animAssetNeeds.ts";
import { createAnimAssetStore, sharedAnimAssetStore, type AnimAssetStore } from "../src/engine/animAssetStore.ts";
import { FULL_ANIM_ASSETS } from "../src/engine/animAssetsFull.ts";
import { FactorySession } from "../src/factorySession.ts";
import { mountFactoryGameInternal } from "../src/lib.ts";
import { animAssetsFullSource, animAssetNames } from "../tools/build/generateAnimAssetsFull.ts";
import { animAssetFileTexts } from "../tools/build/monPicFiles.ts";
import { ActionLog, RandomPlayer, Rng } from "../tools/soak/randomRoundSoakDriver.ts";
import animAssetMoves from "../src/assets/gen/anim-asset-moves.json" with { type: "json" };

const root = resolve(import.meta.dirname, "..");
const texts = animAssetFileTexts(root);
const names = Object.keys(texts);
const sleep = (): Promise<void> => new Promise((done) => setTimeout(done, 0));
const frameHash = (session: FactorySession): string => createHash("sha1").update(render(session.state)).digest("hex").slice(0, 16);

let full: AnimAssetSource;
beforeAll(() => {
  full = installedAnimAssets()!;
});
afterEach(() => installAnimAssets(full));

type Loader = { requested: string[]; release(): void; fail: Set<string>; store: AnimAssetStore };
/** A store whose files arrive only after `release()` (or one macrotask when `autoRelease`). */
function gatedStore(autoRelease = false): Loader {
  const requested: string[] = [];
  const waiting: (() => void)[] = [];
  const fail = new Set<string>();
  let open = autoRelease;
  const store = createAnimAssetStore({
    names,
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

describe("dl4: the generated sources", () => {
  it("animAssetsFull.ts lists every asset file (regenerate with tools/build/generateAnimAssetsFull.ts)", () => {
    expect(readFileSync(resolve(root, "src/engine/animAssetsFull.ts"), "utf8")).toBe(animAssetsFullSource(animAssetNames(root)));
    expect(Object.keys(FULL_ANIM_ASSETS)).toEqual(animAssetNames(root));
  });

  it("every asset is either a lazy name in the two scene modules or on the eager list, never both; the table names only fetched files", () => {
    const files = new Set(readdirSync(resolve(root, "src/animation/assets")).map((file) => file.slice(0, -5)));
    const lazy = new Set<string>();
    for (const file of ["engine/battleScene.ts", "engine/liveMoveAnimation.ts"]) {
      const source = readFileSync(resolve(root, "src", file), "utf8");
      for (const match of source.matchAll(/lazyAnimAsset<[^>]*>\("([^"]+)"\)/g)) lazy.add(match[1]!);
    }
    const eager = new Set(animAssetMoves.eager);
    expect([...lazy].filter((name) => eager.has(name))).toEqual([]);
    expect([...files].filter((name) => !lazy.has(name) && !eager.has(name))).toEqual([]);
    expect([...lazy, ...eager].filter((name) => !files.has(name))).toEqual([]);
    expect(new Set(names)).toEqual(lazy);
    for (const list of Object.values(animAssetMoves.byMove)) for (const name of list) expect(lazy.has(name), name).toBe(true);
  });
});

describe("dl4: the per-asset store", () => {
  it("reads throw AnimAssetPending until the file arrives, record the miss, then equal the full table", async () => {
    const { store, requested } = gatedStore(true);
    expect(() => store.source.get("knock-off")).toThrow(AnimAssetPending);
    expect(requested).toEqual(["knock-off"]); // a read starts the fetch
    expect(store.takeMissed()).toEqual(["knock-off"]);
    expect(store.takeMissed()).toEqual([]);
    expect(store.pending(["knock-off", "recover", "NOT_AN_ASSET"])).toEqual(["knock-off", "recover"]);
    await store.whenLoaded(["knock-off", "recover"]);
    expect(store.pending(["knock-off", "recover"])).toEqual([]);
    for (const name of ["knock-off", "recover"]) expect(store.source.get(name)).toEqual(full.get(name));
    expect(requested).toEqual(["knock-off", "recover"]); // each file once
    expect(() => store.source.get("not-an-asset")).toThrow(/has no file/);
  });

  it("a lazy asset reads through the installed source on every access", async () => {
    const { store } = gatedStore(true);
    const view = lazyAnimAsset<{ strike: { tileset: unknown } }>("knock-off");
    installAnimAssets(store.source);
    expect(() => view.strike).toThrow(AnimAssetPending);
    await store.whenLoaded(["knock-off"]);
    expect(view.strike).toEqual((full.get("knock-off") as { strike: unknown }).strike);
    expect(Object.keys(view)).toEqual(Object.keys(full.get("knock-off")));
    expect("strike" in view).toBe(true);
    expect({ ...view }).toEqual(full.get("knock-off"));
  });

  it("retries a failed file once, then holds a sticky failure", async () => {
    let attempts = 0;
    const flaky = createAnimAssetStore({
      names,
      load: async (name) => {
        attempts += 1;
        if (attempts === 1) throw new Error("boom");
        return texts[name]!;
      },
    });
    await flaky.whenLoaded(["recover"]);
    expect(attempts).toBe(2);
    expect(flaky.failure).toBeNull();
    const dead = createAnimAssetStore({ names, load: async () => Promise.reject(new Error("down")) });
    await expect(dead.whenLoaded(["recover"])).rejects.toThrow(/failed to load/);
    expect(dead.failure).not.toBeNull();
  });
});

describe("dl4: the needs scan", () => {
  it("Scene OFF names no move; Scene ON names the parties' moves once the round controller built them", () => {
    const off = new FactorySession({ battleScene: "off", gameplaySeed: 4 });
    const on = new FactorySession({ battleScene: "on", gameplaySeed: 4 });
    const playerOff = new RandomPlayer(new Rng(4), new ActionLog(false), "winning");
    const playerOn = new RandomPlayer(new Rng(4), new ActionLog(false), "winning");
    expect(neededMoveIds(on.state).size).toBe(0);
    let firstOn = 0;
    for (let frame = 1; frame <= 3000; frame += 1) {
      off.tick(playerOff.decide(off.state), frame);
      on.tick(playerOn.decide(on.state), frame);
      expect(neededMoveIds(off.state).size).toBe(0);
      if (firstOn === 0 && neededMoveIds(on.state).size > 0) firstOn = frame;
    }
    expect(firstOn).toBeGreaterThan(0);
    const ids = neededMoveIds(on.state);
    expect(ids.size).toBeGreaterThanOrEqual(4);
    expect(neededAnimAssets(off.state, animAssetMoves, () => true).size).toBe(0);
  });
});

describe("dl4: a called move", () => {
  it("is prefetched as soon as a tick names it (Metronome / Mimic / Sleep Talk / Assist set calledMove), even when no party lists it", () => {
    const knockOff = 282;
    const state = (presentation: unknown) =>
      ({ battleSceneMode: "on", factoryRoundBattleOrchestrator: { round: null, battleResolutionPresentation: presentation }, stagedBattleTurn: null, sceneOnPresentation: null }) as never;
    expect(neededAnimAssets(state({ calledMove: 1 }), animAssetMoves, () => true).has("knock-off")).toBe(false);
    expect(neededAnimAssets(state({ steps: [{ calledMove: knockOff }] }), animAssetMoves, () => true).has("knock-off")).toBe(true);
    expect(neededAnimAssets(state({ steps: [{ calledMove: knockOff }] }), animAssetMoves, (name) => name !== "knock-off").has("knock-off")).toBe(false);
  });
});

describe("dl4: the headless / node path needs no animation assets", () => {
  it("ticks never read an asset: a Scene ON session ticks 1500 frames over a store with nothing loaded and requests nothing", () => {
    const { store, requested } = gatedStore();
    installAnimAssets(store.source);
    const session = new FactorySession({ battleScene: "on", gameplaySeed: 3 });
    const player = new RandomPlayer(new Rng(3), new ActionLog(false), "winning");
    for (let frame = 1; frame <= 1500; frame += 1) session.tick(player.decide(session.state), frame);
    expect(requested).toEqual([]);
    expect(store.takeMissed()).toEqual([]);
  });
});

describe("dl4: the mount loop holds on an animation asset that has not arrived", () => {
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

  it("a Scene ON play-through over a store that delivers each file a macrotask late draws exactly what the full table draws, and the trace is untouched", async () => {
    const gate = gatedStore(true);
    sharedAnimAssetStore("dl4-hold", () => gate.store);
    installAnimAssets(gate.store.source);
    installRaf();
    const drawn = new Map<number, string>();
    let frameOfGame = (): number => 0;
    const { canvas } = fakeCanvas((data) => drawn.set(frameOfGame(), createHash("sha1").update(data).digest("hex").slice(0, 16)));
    const game = mountFactoryGameInternal({ canvas, battleScene: "on", gameplaySeed: 4 });
    frameOfGame = () => game.frame;
    await game.pixelsReady;
    const player = new RandomPlayer(new Rng(4), new ActionLog(false), "winning");
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
    // The battle's moves were prefetched or held on: files were requested, and fewer than all of them.
    expect(gate.requested.length).toBeGreaterThan(0);
    expect(gate.requested.length).toBeLessThan(names.length);

    installAnimAssets(full);
    const replay = new FactorySession({ battleScene: "on", gameplaySeed: 4 });
    const trace = game.sessionTrace().segments;
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
  }, 240_000);
});
