// Opt-in gamepad input for the browser entry. Polls the W3C Standard Gamepad
// layout once per animation frame and turns button edges into game.press /
// game.release, so the recorded trace is exactly what the same presses would
// have made. The mount never polls on its own (the host owns the input UI);
// this file is not part of the headless graph.
import type { GbaButton } from "./input.ts";

/** The part of FactoryGame the helper drives. */
export interface GamepadTarget {
  press(button: GbaButton): void;
  release(button: GbaButton): void;
}

/** The part of a W3C Gamepad the helper reads. */
export interface GamepadLike {
  readonly connected: boolean;
  readonly buttons: ReadonlyArray<{ readonly pressed: boolean }>;
  readonly axes: readonly number[];
}

export interface GamepadOptions {
  /** Left-stick dead zone, 0..1; an axis counts as a direction past it. Default 0.5. */
  deadZone?: number;
  /** Returns the current pads; default `navigator.getGamepads()`. */
  getGamepads?: () => ArrayLike<GamepadLike | null | undefined>;
  /** Schedules the next poll and returns a cancel function; default requestAnimationFrame. */
  schedule?: (poll: () => void) => () => void;
}

export const DEFAULT_GAMEPAD_DEAD_ZONE = 0.5;

/** Standard Gamepad button index to GBA button. */
export const GAMEPAD_BUTTONS: ReadonlyArray<readonly [number, GbaButton]> = [
  [0, "A"],
  [1, "B"],
  [4, "L"],
  [5, "R"],
  [8, "SELECT"],
  [9, "START"],
  [12, "UP"],
  [13, "DOWN"],
  [14, "LEFT"],
  [15, "RIGHT"],
];

/** The buttons held on one pad: face / shoulder / d-pad buttons plus the left stick as a d-pad. */
export function gamepadButtons(pad: GamepadLike, deadZone = DEFAULT_GAMEPAD_DEAD_ZONE): Set<GbaButton> {
  const held = new Set<GbaButton>();
  for (const [index, button] of GAMEPAD_BUTTONS) {
    if (pad.buttons[index]?.pressed) held.add(button);
  }
  const x = pad.axes[0] ?? 0;
  const y = pad.axes[1] ?? 0;
  if (x < -deadZone) held.add("LEFT");
  else if (x > deadZone) held.add("RIGHT");
  if (y < -deadZone) held.add("UP");
  else if (y > deadZone) held.add("DOWN");
  return held;
}

/**
 * Drives `game` from the first connected gamepad (lowest index; other pads are ignored).
 * Presses and releases on edges only. Losing the pad or calling the returned disconnect
 * function releases everything the helper pressed; if the first pad changes, buttons the new
 * pad is not holding are released.
 */
export function connectGamepad(game: GamepadTarget, options: GamepadOptions = {}): () => void {
  const deadZone = options.deadZone ?? DEFAULT_GAMEPAD_DEAD_ZONE;
  // No Gamepad API (insecure context, old browser, non-browser host): behave as if no pad is connected.
  const getGamepads = options.getGamepads ?? (() => (typeof navigator !== "undefined" && navigator.getGamepads ? navigator.getGamepads() : []));
  const schedule =
    options.schedule ??
    ((poll: () => void) => {
      const id = requestAnimationFrame(poll);
      return () => cancelAnimationFrame(id);
    });
  let down = new Set<GbaButton>();
  let cancel: (() => void) | null = null;
  let stopped = false;

  function activePad(): GamepadLike | null {
    const pads = getGamepads();
    for (let index = 0; index < pads.length; index += 1) {
      const pad = pads[index];
      if (pad?.connected) return pad;
    }
    return null;
  }

  function releaseAll(): void {
    for (const button of down) game.release(button);
    down = new Set();
  }

  function poll(): void {
    if (stopped) return;
    cancel = schedule(poll);
    const pad = activePad();
    if (!pad) {
      releaseAll();
      return;
    }
    const now = gamepadButtons(pad, deadZone);
    for (const button of down) if (!now.has(button)) game.release(button);
    for (const button of now) if (!down.has(button)) game.press(button);
    down = now;
  }

  cancel = schedule(poll);
  return () => {
    if (stopped) return;
    stopped = true;
    cancel?.();
    cancel = null;
    releaseAll();
  };
}
