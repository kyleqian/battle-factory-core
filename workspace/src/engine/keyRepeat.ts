// Reproduces reference/pokeemerald's src/main.c ReadKeys() key-repeat model
// exactly (JOY_NEW / JOY_REPEAT semantics), since the draft screen's cursor
// and menu navigation are driven by JOY_NEW(A_BUTTON)/JOY_REPEAT(DPAD_*).
//
// main.c: gKeyRepeatStartDelay = 40, gKeyRepeatContinueDelay = 5.
// Each frame: newKeysRaw = keyInput & ~heldKeysRaw (per-bit, edge-triggered).
// If the *entire* held combination is unchanged from the previous frame,
// keyRepeatCounter decrements; when it hits 0, newAndRepeatedKeys is set to
// the full current keyInput and the counter resets to the continue delay.
// Any change (including releasing to nothing) resets the counter to the
// start delay. This one counter is shared across all buttons (not per-key).

import type { GbaButton } from "../input.ts";

const REPEAT_START_DELAY = 40;
const REPEAT_CONTINUE_DELAY = 5;

export interface KeyRepeatState {
  heldKeysRaw: ReadonlySet<GbaButton>;
  keyRepeatCounter: number;
}

export interface KeyFrame {
  /** JOY_NEW: buttons newly pressed this frame (edge-triggered, per-bit). */
  newKeys: ReadonlySet<GbaButton>;
  /** JOY_REPEAT: newKeys, plus the full held set on the frame the repeat counter fires. */
  newAndRepeatedKeys: ReadonlySet<GbaButton>;
  next: KeyRepeatState;
}

export const INITIAL_KEY_REPEAT_STATE: KeyRepeatState = {
  heldKeysRaw: new Set(),
  keyRepeatCounter: REPEAT_START_DELAY,
};

function setsEqual(a: ReadonlySet<GbaButton>, b: ReadonlySet<GbaButton>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) {
    if (!b.has(v)) return false;
  }
  return true;
}

export function readKeys(buttons: ReadonlySet<GbaButton>, prev: KeyRepeatState): KeyFrame {
  const newKeys = new Set<GbaButton>();
  for (const b of buttons) {
    if (!prev.heldKeysRaw.has(b)) newKeys.add(b);
  }

  let newAndRepeatedKeys: ReadonlySet<GbaButton> = newKeys;
  let keyRepeatCounter = prev.keyRepeatCounter;

  if (buttons.size > 0 && setsEqual(buttons, prev.heldKeysRaw)) {
    keyRepeatCounter -= 1;
    if (keyRepeatCounter === 0) {
      newAndRepeatedKeys = new Set(buttons);
      keyRepeatCounter = REPEAT_CONTINUE_DELAY;
    }
  } else {
    keyRepeatCounter = REPEAT_START_DELAY;
  }

  return {
    newKeys,
    newAndRepeatedKeys,
    next: { heldKeysRaw: new Set(buttons), keyRepeatCounter },
  };
}

export function hasButton(keys: ReadonlySet<GbaButton>, button: GbaButton): boolean {
  return keys.has(button);
}
