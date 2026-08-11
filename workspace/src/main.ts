// Entry point: a 240x160 GBA-shaped canvas on a fixed timestep, with the
// __POKEBENCH__ test ABI. This template intentionally ships no game — the
// roadmap's stages build the engine here. Keep the contract in AGENTS.md
// true as you do: one game-surface element, exact 240x160 under ?pokebench=1.

import { buttonForKey, normalizeButtons, type GbaButton } from "./input.ts";
import { createInitialState, render, tick as engineTick, SCREEN_WIDTH, SCREEN_HEIGHT } from "./engine/core.ts";
import { SessionRecorder, type SessionTrace } from "./sessionRecorder.ts";
import "./style.css";

export { SCREEN_WIDTH, SCREEN_HEIGHT };
// GBA video: 280896 cycles/frame at 2^24 Hz.
export const FRAME_HZ = 16_777_216 / 280_896;

// Injected by vite.config.ts; identifies the commit a played build came from
// so stale-preview reports are attributable at a glance.
const BUILD_STAMP: string =
  typeof __POKEBENCH_BUILD_STAMP__ === "string" ? __POKEBENCH_BUILD_STAMP__ : "dev";

const held = new Set<GbaButton>();
let state = createInitialState();
const recorder = new SessionRecorder();

const app = document.querySelector<HTMLDivElement>("#app")!;
const canvas = document.createElement("canvas");
canvas.width = SCREEN_WIDTH;
canvas.height = SCREEN_HEIGHT;
canvas.dataset.testid = "game-surface";
const benchMode = new URLSearchParams(location.search).has("pokebench");
canvas.style.width = benchMode ? `${SCREEN_WIDTH}px` : `${SCREEN_WIDTH * 3}px`;
canvas.style.height = benchMode ? `${SCREEN_HEIGHT}px` : `${SCREEN_HEIGHT * 3}px`;
canvas.style.imageRendering = "pixelated";
app.appendChild(canvas);
const ctx = canvas.getContext("2d")!;
const imageData = ctx.createImageData(SCREEN_WIDTH, SCREEN_HEIGHT);

if (!benchMode) {
  const stamp = document.createElement("div");
  stamp.dataset.testid = "build-stamp";
  stamp.textContent = `build ${BUILD_STAMP}`;
  stamp.style.cssText = "font:11px monospace;color:#888;margin-top:4px;user-select:text;";
  app.appendChild(stamp);
}

function draw(): void {
  imageData.data.set(render(state));
  ctx.putImageData(imageData, 0, 0);
}

function tick(buttons: ReadonlySet<GbaButton>): void {
  recorder.recordTick(buttons);
  state = engineTick(state, buttons);
  draw();
}
draw();

function currentSessionTrace(error?: unknown): SessionTrace {
  return recorder.toTrace({ appRoute: state.appRoute, build: BUILD_STAMP, error });
}

// The session trace is always exportable, not just on a crash: when a played
// moment merely LOOKS wrong, `__POKEBENCH_SESSION__()` in the console yields
// a deterministic replay of the whole session up to that moment.
(window as unknown as Record<string, unknown>).__POKEBENCH_SESSION__ = () =>
  currentSessionTrace();

let crashed = false;
function showCrashOverlay(error: unknown): void {
  crashed = true;
  const trace = currentSessionTrace(error);
  const json = JSON.stringify(trace);
  (window as unknown as Record<string, unknown>).__POKEBENCH_CRASH__ = trace;
  console.error("POKEBENCH CRASH — replayable session trace:", json, error);

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

window.addEventListener("keydown", (event) => {
  const button = buttonForKey(event.key);
  if (button) {
    held.add(button);
    event.preventDefault();
  }
});
window.addEventListener("keyup", (event) => {
  const button = buttonForKey(event.key);
  if (button) held.delete(button);
});

let last = performance.now();
let accumulator = 0;
const FRAME_MS = 1000 / FRAME_HZ;
function loop(now: number): void {
  accumulator = Math.min(accumulator + (now - last), FRAME_MS * 8);
  last = now;
  while (accumulator >= FRAME_MS) {
    // Crash containment lives HERE, not in tick(): the bench-mode advance()
    // ABI must keep propagating engine throws to its caller unchanged.
    try {
      tick(held);
    } catch (error) {
      showCrashOverlay(error);
      return; // stop the loop; the overlay owns the screen now
    }
    accumulator -= FRAME_MS;
  }
  if (!crashed) requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Deterministic test ABI, mirrored from the pewter demo: reset() rewinds to
// the real draft on the production generated route, advance() replays trace
// segments synchronously.
if (benchMode) {
  (window as unknown as Record<string, unknown>).__POKEBENCH__ = {
    reset(): void {
      state = createInitialState();
      held.clear();
      recorder.reset();
      draw();
    },
    advance(segments: Array<{ frames: number; buttons?: string[] }>): void {
      for (const segment of segments) {
        const buttons = new Set(normalizeButtons(segment.buttons ?? []));
        for (let index = 0; index < segment.frames; index += 1) tick(buttons);
      }
      draw();
    },
  };
}
