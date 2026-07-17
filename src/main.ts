// Entry point: a 240x160 GBA-shaped canvas on a fixed timestep, with the
// __POKEBENCH__ test ABI. This template intentionally ships no game — the
// roadmap's stages build the engine here. Keep the contract in AGENTS.md
// true as you do: one game-surface element, exact 240x160 under ?pokebench=1.

import { buttonForKey, normalizeButtons, type GbaButton } from "./input.ts";
import { createInitialState, render, tick as engineTick, SCREEN_WIDTH, SCREEN_HEIGHT } from "./engine/core.ts";
import "./style.css";

export { SCREEN_WIDTH, SCREEN_HEIGHT };
// GBA video: 280896 cycles/frame at 2^24 Hz.
export const FRAME_HZ = 16_777_216 / 280_896;

const held = new Set<GbaButton>();
let state = createInitialState();

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

function draw(): void {
  imageData.data.set(render(state));
  ctx.putImageData(imageData, 0, 0);
}

function tick(buttons: ReadonlySet<GbaButton>): void {
  state = engineTick(state, buttons);
  draw();
}
draw();

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
    tick(held);
    accumulator -= FRAME_MS;
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Deterministic test ABI, mirrored from the pewter demo: reset() rewinds to
// the canonical start, advance() replays trace segments synchronously.
if (benchMode) {
  (window as unknown as Record<string, unknown>).__POKEBENCH__ = {
    reset(): void {
      state = createInitialState();
      held.clear();
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
