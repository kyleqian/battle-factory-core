// Dev shell: a 240x160 GBA-shaped canvas driven by the game library
// (src/lib.ts), plus the __POKEBENCH__ test ABI, the crash overlay and the
// __POKEBENCH_SESSION__ export every browser test and tool depends on. The
// game itself (loop, input trace, events) lives in the library; keep the
// contract in AGENTS.md true: one game-surface element, exact 240x160 under
// ?pokebench=1.

import { buttonForKey, type GbaButton } from "./input.ts";
import { connectGamepad } from "./gamepad.ts";
import { FRAME_HZ, mountFactoryGameInternal, SCREEN_HEIGHT, SCREEN_WIDTH } from "./lib.ts";
import type { FactorySession } from "./factorySession.ts";
import type { SessionContainedError, SessionTrace } from "./sessionRecorder.ts";
import { DEFAULT_PRESENTATION_RNG_SEED, parsePresentationSeed } from "./engine/presentationRngHost.ts";
import "./style.css";

export { FRAME_HZ, SCREEN_HEIGHT, SCREEN_WIDTH };

// Injected by vite.config.ts; identifies the commit a played build came from
// so stale-preview reports are attributable at a glance.
const BUILD_STAMP: string =
  typeof __POKEBENCH_BUILD_STAMP__ === "string" ? __POKEBENCH_BUILD_STAMP__ : "dev";

const battleScene = new URLSearchParams(location.search).get("battleScene") === "off" ? "off" : "on";
const benchMode = new URLSearchParams(location.search).has("pokebench");
// Presentation-only Random2 seed (docs/presentation-rng.md): `presentationSeed=<hex>` pins it;
// the bench ABI otherwise stays deterministic on the documented default; ordinary play draws one
// per session. Reset keeps the session's seed so replays and resets reproduce the same visuals.
function choosePresentationSeed(): number {
  const pinned = parsePresentationSeed(new URLSearchParams(location.search).get("presentationSeed"));
  if (pinned !== null) return pinned;
  if (benchMode) return DEFAULT_PRESENTATION_RNG_SEED;
  return crypto.getRandomValues(new Uint32Array(1))[0]!;
}
const presentationSeed = choosePresentationSeed();

const app = document.querySelector<HTMLDivElement>("#app")!;
const canvas = document.createElement("canvas");
canvas.width = SCREEN_WIDTH;
canvas.height = SCREEN_HEIGHT;
canvas.dataset.testid = "game-surface";
canvas.style.width = benchMode ? `${SCREEN_WIDTH}px` : `${SCREEN_WIDTH * 3}px`;
canvas.style.height = benchMode ? `${SCREEN_HEIGHT}px` : `${SCREEN_HEIGHT * 3}px`;
canvas.style.imageRendering = "pixelated";
app.appendChild(canvas);

if (!benchMode) {
  const stamp = document.createElement("div");
  stamp.dataset.testid = "build-stamp";
  stamp.textContent = `build ${BUILD_STAMP}`;
  stamp.style.cssText = "font:11px monospace;color:#888;margin-top:4px;user-select:text;";
  app.appendChild(stamp);
  const modeLink = document.createElement("a");
  const modeUrl = new URL(location.href);
  modeUrl.searchParams.set("battleScene", battleScene === "on" ? "off" : "on");
  modeLink.href = modeUrl.toString();
  modeLink.textContent = `Battle Scene ${battleScene.toUpperCase()} · restart with ${battleScene === "on" ? "OFF" : "ON"}`;
  modeLink.style.cssText = "display:block;font:12px monospace;color:#aaa;margin-top:8px;";
  app.appendChild(modeLink);
}

function showCrashOverlay(error: unknown, session: FactorySession): void {
  const trace = session.toTrace(error);
  const json = JSON.stringify(trace);
  (window as unknown as Record<string, unknown>).__POKEBENCH_CRASH__ = trace;

  const overlay = document.createElement("div");
  overlay.dataset.testid = "crash-overlay";
  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(10,10,14,0.92);color:#eee;" +
    "font:14px/1.5 monospace;padding:24px;overflow:auto;z-index:1000;";
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  const title = document.createElement("h2");
  title.textContent = "The game hit an engine error";
  title.style.cssText = "color:#ff7070;font:bold 16px monospace;margin:0 0 12px;";
  const detail = document.createElement("pre");
  detail.textContent = `${message}\n\nframe ${trace.frame} · build ${BUILD_STAMP}`;
  detail.style.cssText = "white-space:pre-wrap;color:#ffb0b0;margin:0 0 16px;";
  const hint = document.createElement("p");
  hint.textContent =
    "The box below is a replayable recording of this whole session. " +
    "Copy it and paste it into the dev chat — it reproduces this crash exactly.";
  hint.style.cssText = "margin:0 0 8px;color:#ccc;";
  const text = document.createElement("textarea");
  text.readOnly = true;
  text.value = json;
  text.style.cssText =
    "width:100%;height:120px;background:#16161c;color:#9fd49f;border:1px solid #444;" +
    "font:11px monospace;padding:8px;box-sizing:border-box;";
  const copy = document.createElement("button");
  copy.textContent = "Copy crash trace";
  copy.style.cssText =
    "margin-top:8px;padding:6px 14px;font:13px monospace;cursor:pointer;" +
    "background:#2d4f2d;color:#dfffdf;border:1px solid #4a7a4a;";
  copy.addEventListener("click", () => {
    text.select();
    void navigator.clipboard?.writeText(json).catch(() => document.execCommand("copy"));
    copy.textContent = "Copied";
  });
  overlay.append(title, detail, hint, text, copy);
  document.body.appendChild(overlay);
}

// The library owns the frame loop, the input trace and the contained-error
// bookkeeping; the shell only wires the keyboard and the test ABI to it.
// `?audio=1` turns sound on in the dev shell (muted otherwise; the first key press resumes the AudioContext).
const audioOn = new URLSearchParams(location.search).get("audio") === "1";
const game = mountFactoryGameInternal({
  canvas,
  battleScene,
  presentationSeed,
  // The shell plays the in-game new-challenge path (soak / goalPlay / play:random); `?challengeRequest=hold` behaves like a host mount.
  challengeRequest: new URLSearchParams(location.search).get("challengeRequest") === "hold" ? "hold" : "continue",
  // rc1: `?lobby=skip` plays the website's result holds instead of the Lobby after a round (the shell draws no card: the screen stays black).
  ...(new URLSearchParams(location.search).get("lobby") === "skip" ? { lobby: "skip" as const } : {}),
  // dl3: the bench ABI's advance() is synchronous and cannot wait for a picture file, so it reads the full tables; real-time play uses the files.
  ...(benchMode ? { sprites: "all" as const } : {}),
  ...(audioOn ? { audio: { enabled: true } } : {}),
  onCrash: showCrashOverlay,
});

window.addEventListener("keydown", (event) => {
  const button = buttonForKey(event.key);
  if (button) {
    if (!event.repeat) game.press(button);
    event.preventDefault();
  }
});
window.addEventListener("keyup", (event) => {
  const button = buttonForKey(event.key);
  if (button) game.release(button as GbaButton);
});

// Dev-shell opt-in: the library mount never polls the gamepad itself.
connectGamepad(game);

// Sound counters for tools/browser/audioCheck.mjs (only when ?audio=1).
if (audioOn) (window as unknown as Record<string, unknown>).__POKEBENCH_AUDIO__ = () => ({ stats: game.audioStats(), state: game.getAudio() });

// bnd257d: the sprite pixels load in a dynamic chunk, so the globals tools wait for (`__POKEBENCH__`, `__POKEBENCH_SESSION__`) appear only
// once the first draw is possible. A failed load was already reported by the library (console.error); nothing is defined then.
function exposeGlobals(): void {
  // The session trace is always exportable, not just on a crash: when a played
  // moment merely LOOKS wrong, `__POKEBENCH_SESSION__()` in the console yields
  // a deterministic replay of the whole session up to that moment.
  (window as unknown as Record<string, unknown>).__POKEBENCH_SESSION__ = (): SessionTrace => game.sessionTrace();

  // Deterministic test ABI, mirrored from the pewter demo: reset() rewinds to
  // the real draft on the production generated route, advance() replays trace
  // segments synchronously.
  if (benchMode) {
    (window as unknown as Record<string, unknown>).__POKEBENCH__ = {
      reset(): void {
        game.reset();
      },
      advance(segments: Array<{ frames: number; buttons?: string[] }>): void {
        game.advance(segments);
      },
      // contain209: the presentation throws contained so far (a contained throw never escapes advance()).
      containedErrors(): SessionContainedError[] {
        return game.containedErrors();
      },
    };
  }
}
void game.pixelsReady.then(exposeGlobals, () => {});
