// @pokebench/factory: the browser entry (contract v2, src/factoryContract.ts).
// Mounts the game on a 240x160 canvas, runs the fixed-timestep frame loop,
// turns button presses into the recorded input trace, fast-forwards a resumed
// trace, and reports the challenge's events. The dev shell (src/main.ts) uses
// mountFactoryGameInternal for its test ABI; hosts use mountFactoryGame.
import { installedMonPicPixels, installMonPicPixels, monPicPixelsInstalled } from "./engine/monPicPixels.ts";
import { MonPicPending } from "./engine/monPicPending.ts";
import { neededMonPics } from "./engine/monPicNeeds.ts";
import { activeMonPicSpriteStore, createMonPicSpriteStore, sharedMonPicSpriteStore, type MonPicSpriteStore } from "./engine/monPicSpriteStore.ts";
import { AnimAssetPending, installAnimAssets, installedAnimAssets } from "./engine/animAssets.ts";
import { neededAnimAssets } from "./engine/animAssetNeeds.ts";
import { activeAnimAssetStore, createAnimAssetStore, sharedAnimAssetStore, type AnimAssetStore } from "./engine/animAssetStore.ts";
import animAssetMoves from "./assets/gen/anim-asset-moves.json" with { type: "json" };
import { render, SCREEN_HEIGHT, SCREEN_WIDTH } from "./engine/core.ts";
import type { FactoryAudioState, FactoryEvent, FactoryGame, FactoryGameOptions, TraceSegment } from "./factoryContract.ts";
import type { AudioPlayer, AudioStats } from "./audio/player.ts";
import { initialMusicEvents } from "./audio/initialMusic.ts";
import { MusicTracker } from "./audio/musicTracker.ts";
import { collectSoundTick, type SoundEvent } from "./audio/soundEvents.ts";
import { ENGINE_BUILD, FactorySession } from "./factorySession.ts";
import { normalizeButtons, type GbaButton } from "./input.ts";
import type { SessionContainedError, SessionTrace } from "./sessionRecorder.ts";

export type {
  BattleScene,
  FactoryAudioState,
  FactoryEvent,
  FactoryGame,
  FactoryGameOptions,
  GbaButton,
  TraceSegment,
} from "./factoryContract.ts";
export { connectGamepad } from "./gamepad.ts";
export type { GamepadLike, GamepadOptions, GamepadTarget } from "./gamepad.ts";
export { ENGINE_BUILD, SCREEN_HEIGHT, SCREEN_WIDTH };

// GBA video: 280896 cycles/frame at 2^24 Hz.
export const FRAME_HZ = 16_777_216 / 280_896;
const FRAME_MS = 1000 / FRAME_HZ;
/** Fast-forward work per animation frame while resuming, so the page stays responsive. */
const RESUME_BUDGET_MS = 12;

export interface MountInternalOptions extends FactoryGameOptions {
  /** Replay `resume` inline inside the mount call instead of across animation frames. */
  resumeSync?: boolean;
  /** lbr-c: "hold" (default, the library behaviour) or "continue" (the dev shell's in-game new-challenge path). */
  challengeRequest?: "hold" | "continue";
  /** The dev shell's crash overlay: the error and the session it happened in. */
  onCrash?: (error: unknown, session: FactorySession) => void;
  /**
   * dl3: where the battle pictures come from. "files" (the default in a build): one small file per species, fetched when a screen needs
   * it, the loop holding until it arrived. "all": the whole sheets as one chunk, installed before the first frame and readable
   * synchronously (the dev shell's `?pokebench=1` bench ABI, which cannot wait). Only the app build and the dev server carry "all".
   */
  sprites?: "files" | "all";
}

// dl3: injected by the vite configs; absent when src/ runs straight from source (node tools: the provider is installed up front).
const SPRITE_FILES_BUILT = typeof __POKEBENCH_SPRITE_FILES__ === "boolean" && __POKEBENCH_SPRITE_FILES__;
const SPRITE_FULL_BUILT = typeof __POKEBENCH_SPRITE_FULL__ !== "boolean" || __POKEBENCH_SPRITE_FULL__;

function spriteBaseUrl(spriteBase: string | undefined): URL | undefined {
  return spriteBase === undefined ? undefined : new URL(spriteBase.endsWith("/") ? spriteBase : `${spriteBase}/`, document.baseURI);
}

// dl4: the move-animation assets come from `<spriteBase>/anim/<asset>.txt` (the same copied `sprites/` directory), next to the chunks by default.
async function openAnimAssetStore(spriteBase: string | undefined): Promise<AnimAssetStore> {
  const files = (await import("virtual:pokebench-anim-asset-files")).default;
  if (files === null) throw new Error("this build carries no animation asset files");
  const base = spriteBaseUrl(spriteBase);
  return sharedAnimAssetStore(base?.href ?? "", () =>
    createAnimAssetStore({
      names: Object.keys(files),
      load: async (name) => {
        const url = base === undefined ? files[name]! : new URL(`anim/${name}.txt`, base).href;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`${response.status} for ${url}`);
        return response.text();
      },
    }),
  );
}

async function openSpriteStore(spriteBase: string | undefined): Promise<MonPicSpriteStore> {
  const files = (await import("virtual:pokebench-mon-pic-files")).default;
  if (files === null) throw new Error("this build carries no battle picture files");
  const base = spriteBaseUrl(spriteBase);
  return sharedMonPicSpriteStore(base?.href ?? "", () =>
    createMonPicSpriteStore({
      species: Object.keys(files),
      load: async (species) => {
        const url = base === undefined ? files[species]! : new URL(`${species}.txt`, base).href;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`${response.status} for ${url}`);
        return response.text();
      },
    }),
  );
}

export interface FactoryGameInternal extends FactoryGame {
  readonly session: FactorySession;
  /** Bench ABI: tick these runs synchronously; engine throws propagate to the caller unchanged. */
  advance(segments: ReadonlyArray<{ frames: number; buttons?: readonly string[] }>): void;
  /** Bench ABI: back to the challenge's first frame. */
  reset(): void;
  draw(): void;
  /** bnd257d: resolves once the sprite pixels are installed (already resolved when a provider was installed before the mount); rejects if the sprite chunk fails to load. */
  readonly pixelsReady: Promise<void>;
  /** Dev / test: the audio player's counters (null until the player chunk has loaded). */
  audioStats(): AudioStats | null;
  sessionTrace(error?: unknown): SessionTrace;
  containedErrors(): SessionContainedError[];
}

export function mountFactoryGame(options: FactoryGameOptions): FactoryGame {
  const game = mountFactoryGameInternal({ ...options, challengeRequest: "hold", sprites: undefined });
  return {
    get engine() {
      return game.engine;
    },
    get frame() {
      return game.frame;
    },
    press: (button) => game.press(button),
    release: (button) => game.release(button),
    trace: (fromSegment) => game.trace(fromSegment),
    setAudio: (enabled) => game.setAudio(enabled),
    getAudio: () => game.getAudio(),
    destroy: () => game.destroy(),
  };
}

export function mountFactoryGameInternal(options: MountInternalOptions): FactoryGameInternal {
  const { canvas } = options;
  canvas.width = SCREEN_WIDTH;
  canvas.height = SCREEN_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("mountFactoryGame: 2d canvas context unavailable");
  const imageData = ctx.createImageData(SCREEN_WIDTH, SCREEN_HEIGHT);
  const sessionOptions = {
    battleScene: options.battleScene,
    gameplaySeed: options.gameplaySeed,
    presentationSeed: options.presentationSeed,
    challengeRequest: options.challengeRequest,
    start: options.start,
  };
  let session = new FactorySession(sessionOptions);
  // bnd257d / dl3: the battle pictures are not in the first chunk. mountFactoryGame still returns synchronously; the first draw, the loop and
  // `ready` wait for the pictures the first screen shows, and press() is dropped until then. A provider installed before the mount (vitest
  // setup, render tools) keeps everything synchronous. With per-species files (the library default) the loop also HOLDS (no tick, no draw)
  // whenever a screen it is about to show names a picture that has not arrived; the trace and every tick are untouched (docs/dl3-per-species-pictures.md).
  const useFull = SPRITE_FULL_BUILT && (options.sprites ?? (SPRITE_FILES_BUILT ? "files" : "all")) === "all";
  let store: MonPicSpriteStore | undefined = activeMonPicSpriteStore(installedMonPicPixels());
  /** Species a render asked for that the state scan did not name; they stay in the hold's wanted set. */
  const extraWanted = new Set<string>();
  // dl4: the same for the move-animation asset files (Scene ON only; Scene OFF names none).
  let animStore: AnimAssetStore | undefined = activeAnimAssetStore(installedAnimAssets());
  const extraAnim = new Set<string>();
  function animWanted(): Set<string> {
    const wanted = neededAnimAssets(session.state, animAssetMoves, animStore!.has);
    for (const name of extraAnim) wanted.add(name);
    return wanted;
  }
  function picturesReady(): boolean {
    let ready = true;
    if (store !== undefined) {
      const wanted = neededMonPics(session.state, store.has);
      for (const species of extraWanted) wanted.add(species);
      if (store.pending(wanted).length > 0) ready = false;
    }
    if (animStore !== undefined && animStore.pending(animWanted()).length > 0) ready = false;
    return ready;
  }
  const preparePixels = async (): Promise<void> => {
    if (store === undefined && !monPicPixelsInstalled()) {
      if (useFull) {
        // A call, not a bare side-effect import: `"sideEffects": false` lets the bundler drop the latter (bnd256c follow-up).
        await import("./engine/monPicPixelsInstall.ts").then((module) => module.installBundledMonPicPixels());
        return;
      }
      store = await openSpriteStore(options.spriteBase);
      installMonPicPixels(store.tables);
      animStore = await openAnimAssetStore(options.spriteBase);
      installAnimAssets(animStore.source);
    }
    if (store !== undefined) {
      const wanted = neededMonPics(session.state, store.has);
      await store.whenLoaded(wanted);
    }
    if (animStore !== undefined) await animStore.whenLoaded(animWanted());
  };
  let pixelsInstalled = monPicPixelsInstalled() && picturesReady();
  const pixelsReady: Promise<void> = pixelsInstalled ? Promise.resolve() : preparePixels();
  const held = new Set<GbaButton>();
  /** Presses released before the next frame sampled them still count for one frame. */
  const latched = new Set<GbaButton>();
  const now = (): number => performance.now();
  const mountedAt = now();
  /** Animation-frame clock of the previous loop call; set on the first call so the two clocks never mix. */
  let last: number | null = null;
  let accumulator = 0;
  let raf = 0;
  let destroyed = false;
  let crashed = false;
  let readySent = false;
  // aud245: the player is a separate chunk (src/audio/player.ts), imported only when audio is asked for. Its sink is write-only:
  // events go in, nothing comes back, and a session ticks identically with or without it.
  const audioWanted = { enabled: options.audio?.enabled ?? false, volume: Math.max(0, Math.min(1, options.audio?.volume ?? 1)) };
  let audio: AudioPlayer | null = null;
  let audioLoading = false;
  let audioFailed = false;
  // The tracker keeps the music state of the live frame (live ticks and the resume fast-forward); a player that starts late, or after a
  // fast-forward, is brought to that state by `restore` instead of waiting for the next music event. It is always attached: write-only.
  const music = new MusicTracker(initialMusicEvents(options.start));
  const audioSink = {
    push(event: SoundEvent): void {
      music.push(event);
      audio?.push(event);
    },
  };
  session.attachSoundSink(audioSink);
  function loadAudio(): void {
    if (audio || audioLoading || audioFailed || destroyed) return;
    audioLoading = true;
    void import("./audio/player.ts").then(
      ({ createAudioPlayer }) => {
        audioLoading = false;
        if (destroyed) return;
        audio = createAudioPlayer({ enabled: audioWanted.enabled, volume: audioWanted.volume, baseUrl: options.audio?.baseUrl });
        if (!resuming) audio.restore(music.events(), session.frame);
      },
      (error: unknown) => {
        audioLoading = false;
        audioFailed = true;
        console.warn("pokebench audio: the player failed to load; the game continues muted", error);
      },
    );
  }

  let resuming: { segments: TraceSegment[]; segment: number; frame: number; held: ReadonlySet<GbaButton> } | null = null;

  const emit = (event: FactoryEvent): void => {
    if (!destroyed) options.onEvent?.(event);
  };

  /** Renders and presents the frame; false (nothing presented) when it read an animation asset that has not arrived, even if the renderer swallowed the throw. */
  function drawFrame(): boolean {
    animStore?.takeMissed(); // reads while pending outside a draw (a swallowed tick-side read) must not hold this frame
    const pixels = render(session.state);
    if (animStore !== undefined) {
      const missed = animStore.takeMissed();
      if (missed.length > 0) {
        for (const name of missed) extraAnim.add(name);
        animStore.pending(missed);
        return false;
      }
    }
    imageData.data.set(pixels);
    ctx!.putImageData(imageData, 0, 0);
    return true;
  }

  function draw(): void {
    drawFrame();
  }

  /** Draws the frame; false (nothing drawn, the canvas keeps the last frame) when it read a picture or an animation asset that has not arrived. */
  function drawOrHold(): boolean {
    try {
      return drawFrame();
    } catch (error) {
      if (error instanceof MonPicPending && store !== undefined) {
        extraWanted.add(error.species);
        store.pending([error.species]);
        return false;
      }
      if (error instanceof AnimAssetPending && animStore !== undefined) {
        for (const name of [error.asset, ...animStore.takeMissed()]) extraAnim.add(name);
        animStore.pending(extraAnim);
        return false;
      }
      throw error;
    }
  }

  function failPictures(error: unknown): void {
    crashed = true;
    console.error("pokebench: the sprite pixels failed to load; the game did not start", error);
    options.onError?.({ message: `sprite pixels failed to load: ${error instanceof Error ? error.message : String(error)}`, frame: session.frame });
  }

  /** The loop waits one animation frame without ticking or drawing; the clock restarts so the wait is never replayed as a burst of ticks. */
  function hold(time: number): void {
    last = time;
    accumulator = 0;
    raf = requestAnimationFrame(loop);
  }

  function sample(): ReadonlySet<GbaButton> {
    const sampled = new Set(held);
    for (const button of latched) sampled.add(button);
    latched.clear();
    return sampled;
  }

  function tickOnce(): void {
    const events = session.tick(sample(), Math.round(now() - mountedAt));
    for (const event of events) emit(event);
  }

  function crash(error: unknown): void {
    crashed = true;
    console.error("POKEBENCH CRASH — replayable session trace:", JSON.stringify(session.toTrace(error)), error);
    options.onCrash?.(error, session);
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    options.onError?.({ message, frame: session.frame });
  }

  function beginResume(segments: TraceSegment[]): void {
    resuming = { segments: segments.map((segment) => ({ ...segment, buttons: [...segment.buttons] })), segment: 0, frame: 0, held: new Set() };
    nextResumeRun();
  }

  function nextResumeRun(): void {
    if (!resuming) return;
    const segment = resuming.segments[resuming.segment];
    resuming.held = segment ? new Set(normalizeButtons(segment.buttons)) : new Set();
    resuming.frame = 0;
  }

  /** Fast-forwards until the budget is spent; returns true once the whole trace has been replayed. */
  function resumeStep(budgetMs: number): boolean {
    if (!resuming) return true;
    const deadline = now() + budgetMs;
    while (resuming.segment < resuming.segments.length) {
      const segment = resuming.segments[resuming.segment]!;
      while (resuming.frame < segment.frames) {
        // The fast-forward is silent, but its sound events say what music is playing when it ends.
        const held = resuming.held;
        for (const event of collectSoundTick(session.frame + 1, () => session.replayStep(held)).events) music.push(event);
        resuming.frame += 1;
        if (now() >= deadline) return false;
      }
      resuming.segment += 1;
      nextResumeRun();
    }
    session.preloadTrace(resuming.segments);
    resuming = null;
    audio?.restore(music.events(), session.frame);
    return true;
  }

  function loop(time: number): void {
    if (destroyed || crashed) return;
    const failure = store?.failure ?? animStore?.failure;
    if (failure) {
      failPictures(failure);
      return;
    }
    if (resuming) {
      try {
        if (!resumeStep(RESUME_BUDGET_MS)) {
          raf = requestAnimationFrame(loop);
          return;
        }
      } catch (error) {
        crash(error);
        return;
      }
      last = time;
      accumulator = 0;
      if (!drawOrHold()) return hold(time);
    }
    if (!picturesReady()) return hold(time);
    if (!readySent) {
      readySent = true;
      emit({ type: "ready", frame: session.frame });
    }
    if (last === null) last = time;
    accumulator = Math.min(accumulator + (time - last), FRAME_MS * 8);
    last = time;
    while (accumulator >= FRAME_MS) {
      // Crash containment lives HERE, not in the session: the bench advance()
      // ABI must keep propagating engine throws to its caller unchanged.
      try {
        tickOnce();
      } catch (error) {
        crash(error);
        return;
      }
      accumulator -= FRAME_MS;
      // A tick that put new species on screen (the round's parties, the swap candidates) starts their fetch here, before the next tick.
      if (!picturesReady()) return hold(time);
    }
    if (!drawOrHold()) return hold(time);
    raf = requestAnimationFrame(loop);
  }

  if (options.resume && options.resume.length > 0) {
    beginResume(options.resume);
    if (options.resumeSync) {
      try {
        while (!resumeStep(Number.POSITIVE_INFINITY)) {
          // resumeStep only returns false when the budget runs out.
        }
      } catch (error) {
        crash(error);
      }
    }
  }
  const startLoop = (): void => {
    drawOrHold();
    if (!crashed) raf = requestAnimationFrame(loop);
  };
  if (pixelsInstalled) startLoop();
  else {
    pixelsReady.then(
      () => {
        pixelsInstalled = true;
        if (!destroyed) startLoop();
      },
      (error: unknown) => {
        if (!destroyed) failPictures(error);
      },
    );
  }
  if (options.audio) loadAudio();

  return {
    get engine() {
      return ENGINE_BUILD;
    },
    get frame() {
      return session.frame;
    },
    get session() {
      return session;
    },
    pixelsReady,
    press(button) {
      if (!pixelsInstalled) return;
      held.add(button);
      latched.add(button);
    },
    release(button) {
      held.delete(button);
    },
    trace(fromSegment = 0) {
      return session.trace(fromSegment);
    },
    setAudio(enabled) {
      audioWanted.enabled = enabled;
      if (audio) audio.setEnabled(enabled);
      else if (enabled) loadAudio();
    },
    getAudio(): FactoryAudioState {
      return {
        enabled: audioWanted.enabled,
        volume: audioWanted.volume,
        state: audio ? audio.state() : audioFailed ? "unsupported" : audioLoading ? "loading" : "off",
      };
    },
    audioStats: () => audio?.stats() ?? null,
    advance(segments) {
      for (const segment of segments) {
        const buttons = new Set(normalizeButtons(segment.buttons ?? []));
        for (let index = 0; index < segment.frames; index += 1) {
          for (const event of session.tick(buttons)) emit(event);
        }
      }
      drawOrHold();
    },
    reset() {
      session = new FactorySession(sessionOptions);
      session.attachSoundSink(audioSink);
      music.reset();
      audio?.restore(music.events(), session.frame);
      held.clear();
      latched.clear();
      resuming = null;
      readySent = false;
      drawOrHold();
    },
    draw,
    sessionTrace: (error) => session.toTrace(error),
    containedErrors: () => session.containedErrors.map((entry) => ({ ...entry })),
    destroy() {
      destroyed = true;
      session.attachSoundSink(null);
      audio?.destroy();
      cancelAnimationFrame(raf);
      held.clear();
      latched.clear();
    },
  };
}
