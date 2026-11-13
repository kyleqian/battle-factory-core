// bnd257d: the browser sprite sheets are a dynamic chunk (docs/bnd257d-lazy-sprites.md). Every test here re-imports the graph with NO provider
// installed (the suite setup installs one in the main registry), the state a browser page is in until the sprite chunk resolves.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import frontSprites from "../src/assets/gen/battle-opponent-front-sprites.json" with { type: "json" };
import type { FactoryEvent } from "../src/factoryContract.ts";

const root = resolve(import.meta.dirname, "..");
const strip = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("bnd257d: importing the renderer with no provider installed", () => {
  it("core.ts, battleScene.ts and the pic renderers import without reading a pixel; reads throw until install", async () => {
    vi.resetModules();
    const pixels = await import("../src/engine/monPicPixels.ts");
    expect(pixels.monPicPixelsInstalled()).toBe(false);
    await import("../src/engine/core.ts");
    const scene = await import("../src/engine/battleScene.ts");
    await import("../src/engine/monPicRender.ts");
    await import("../src/engine/summaryInfoPage.ts");
    await import("../src/engine/battlePartySelect.ts");
    expect(pixels.monPicPixelsInstalled()).toBe(false);
    expect(() => scene.grovyleFrontSprite.tileset).toThrow("mon pic pixels not installed");
    expect(() => ({ ...scene.kabutoFrontSprite })).toThrow("mon pic pixels not installed");
    pixels.installMonPicPixels({ back: {}, front: frontSprites } as never);
    const sheet = (frontSprites as Record<string, { tileset: unknown; frame2: unknown; palette: unknown }>).GROVYLE!;
    expect(scene.grovyleFrontSprite.tileset).toBe(sheet.tileset);
    expect(scene.grovyleFrontSprite.frame2).toBe(sheet.frame2);
    expect(scene.grovyleFrontSprite.palette).toBe(sheet.palette);
    expect({ ...scene.grovyleFrontSprite, tileset: 1 }).toEqual({ tileset: 1, frame2: sheet.frame2, palette: sheet.palette });
  });

  it("the lazy table view forwards reads, `in` and key enumeration to the installed table", async () => {
    vi.resetModules();
    const pixels = await import("../src/engine/monPicPixels.ts");
    const view = pixels.lazyMonPicTable<Record<string, unknown>>("front");
    expect(() => view.ONIX).toThrow("mon pic pixels not installed");
    pixels.installMonPicPixels({ back: {}, front: frontSprites } as never);
    expect(view.ONIX).toBe((frontSprites as Record<string, unknown>).ONIX);
    expect("ONIX" in view).toBe(true);
    expect("NOT_A_SPECIES" in view).toBe(false);
    expect(Object.keys(view)).toEqual(Object.keys(frontSprites));
    expect(Object.keys({ ...view }).length).toBe(Object.keys(frontSprites).length);
  });
});

describe("bnd257d: mountFactoryGame with the sprite pixels still loading", () => {
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
  function pump(ms: number): void {
    clock += ms;
    const pending = queue;
    queue = [];
    for (const cb of pending) cb(clock);
  }
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
  afterEach(() => {
    (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame = saved.raf;
    (globalThis as { cancelAnimationFrame?: unknown }).cancelAnimationFrame = saved.caf;
    vi.doUnmock("../src/engine/monPicPixelsInstall.ts");
    vi.resetModules();
  });

  it("returns at once, draws and emits ready only after the install resolves, and drops presses made before it", async () => {
    vi.resetModules();
    const lib = await import("../src/lib.ts");
    const pixels = await import("../src/engine/monPicPixels.ts");
    expect(pixels.monPicPixelsInstalled()).toBe(false);
    installRaf();
    const { canvas, draws } = fakeCanvas();
    const events: FactoryEvent[] = [];
    const game = lib.mountFactoryGameInternal({ canvas, battleScene: "off", gameplaySeed: 9, onEvent: (event) => events.push(event) });
    expect(canvas.width).toBe(240);
    expect(draws()).toBe(0);
    expect(queue.length).toBe(0);
    game.press("A"); // before the pixels: dropped, not latched into frame 0
    expect(pixels.monPicPixelsInstalled()).toBe(false);
    await game.pixelsReady;
    expect(pixels.monPicPixelsInstalled()).toBe(true);
    expect(draws()).toBe(1);
    expect(queue.length).toBe(1);
    expect(events).toEqual([]);
    pump(0);
    expect(events).toEqual([{ type: "ready", frame: 0 }]);
    pump(51);
    game.press("B"); // after the pixels: latched as before
    game.release("B");
    pump(17);
    expect(game.trace().map(({ frames, buttons }) => ({ frames, buttons }))).toEqual([{ frames: 3, buttons: [] }]);
    pump(17);
    expect(game.trace().map(({ frames, buttons }) => ({ frames, buttons }))).toEqual([
      { frames: 3, buttons: [] },
      { frames: 1, buttons: ["B"] },
    ]);
    game.destroy();
  });

  it("destroy() before the install resolves starts nothing", async () => {
    vi.resetModules();
    const lib = await import("../src/lib.ts");
    installRaf();
    const { canvas, draws } = fakeCanvas();
    const events: FactoryEvent[] = [];
    const game = lib.mountFactoryGameInternal({ canvas, battleScene: "off", onEvent: (event) => events.push(event) });
    game.destroy();
    await game.pixelsReady;
    expect(draws()).toBe(0);
    expect(queue.length).toBe(0);
    expect(events).toEqual([]);
  });

  it("a rejected sprite import calls onError once and never starts the loop", async () => {
    vi.resetModules();
    vi.doMock("../src/engine/monPicPixelsInstall.ts", () => ({
      installBundledMonPicPixels: () => {
        throw new Error("sprite chunk lost");
      },
    }));
    const lib = await import("../src/lib.ts");
    installRaf();
    const { canvas, draws } = fakeCanvas();
    const errors: { message: string; frame: number }[] = [];
    const events: FactoryEvent[] = [];
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const game = lib.mountFactoryGameInternal({ canvas, battleScene: "off", onError: (error) => errors.push(error), onEvent: (event) => events.push(event) });
      await expect(game.pixelsReady).rejects.toThrow("sprite chunk lost");
      await Promise.resolve();
      expect(errors).toHaveLength(1);
      expect(errors[0]!.message).toContain("sprite chunk lost");
      expect(errors[0]!.frame).toBe(0);
      expect(draws()).toBe(0);
      expect(queue.length).toBe(0);
      pump(100);
      expect(events).toEqual([]);
      game.press("A");
      expect(game.trace()).toEqual([]);
      game.destroy();
    } finally {
      consoleError.mockRestore();
    }
  });
});

describe("bnd257d static ratchets", () => {
  it("src/lib.ts imports the install module only dynamically and still calls the installer", () => {
    const lib = strip(readFileSync(resolve(root, "src/lib.ts"), "utf8"));
    expect(lib).not.toMatch(/^import .*monPicPixelsInstall\.ts"/m);
    expect(lib).toMatch(/import\("\.\/engine\/monPicPixelsInstall\.ts"\)\.then\(\(module\) => module\.installBundledMonPicPixels\(\)\)/);
  });

  it("no browser-graph source imports the sprite sheet JSON except the install module", () => {
    const hits: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const file = resolve(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== "assets") walk(file);
        } else if (file.endsWith(".ts") && /battle-back-sprites|battle-opponent-front-sprites/.test(strip(readFileSync(file, "utf8")))) {
          hits.push(file.slice(root.length + 1));
        }
      }
    };
    walk(resolve(root, "src"));
    expect(hits).toEqual(["src/engine/monPicPixelsInstall.ts"]);
  });

  it("party-mon-icons is not in the sprite manual chunk", async () => {
    const { manualChunks } = await import("../vite.config.ts");
    expect(manualChunks("/x/src/assets/gen/party-mon-icons.json")).toBe("assets-gen");
    expect(manualChunks("/x/src/assets/gen/battle-back-sprites.json")).toBe("assets-sprites");
    expect(manualChunks("/x/src/assets/gen/battle-opponent-front-sprites.json")).toBe("assets-sprites");
  });

  // Needs `npm run build:lib` (dist-lib is git-ignored): the entry and its static chunks never import the sprite chunk statically.
  const chunks = resolve(root, "dist-lib/chunks");
  it.skipIf(!existsSync(chunks))("the built browser entry reaches the sprite chunk only through import()", () => {
    const names = readdirSync(chunks);
    const sprites = names.find((name) => name.startsWith("assets-sprites-"));
    expect(sprites).toBeDefined();
    const files = [resolve(root, "dist-lib/index.js"), ...names.map((name) => resolve(chunks, name))];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toMatch(new RegExp(`^(?:import|export)[^\\n]*assets-sprites-`, "m"));
    }
  });
});
