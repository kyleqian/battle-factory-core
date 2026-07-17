// GBA button model shared by the game loop, the test ABI, and the compare
// tooling. Button names match the oracle's trace contract exactly.

export const GBA_BUTTONS = [
  "A",
  "B",
  "SELECT",
  "START",
  "RIGHT",
  "LEFT",
  "UP",
  "DOWN",
  "R",
  "L",
] as const;

export type GbaButton = (typeof GBA_BUTTONS)[number];

export type ButtonState = ReadonlySet<GbaButton>;

const KEY_BINDINGS: Record<string, GbaButton> = {
  ArrowUp: "UP",
  ArrowDown: "DOWN",
  ArrowLeft: "LEFT",
  ArrowRight: "RIGHT",
  w: "UP",
  s: "DOWN",
  a: "LEFT",
  d: "RIGHT",
  z: "A",
  x: "B",
  Escape: "B",
  Enter: "START",
  Shift: "SELECT",
  q: "L",
  e: "R",
};

export function buttonForKey(key: string): GbaButton | undefined {
  return KEY_BINDINGS[key] ?? KEY_BINDINGS[key.toLowerCase()];
}

export function normalizeButtons(buttons: readonly string[]): GbaButton[] {
  const seen = new Set<GbaButton>();
  for (const button of buttons) {
    if (!(GBA_BUTTONS as readonly string[]).includes(button)) {
      throw new Error(`unknown GBA button: ${button}`);
    }
    seen.add(button as GbaButton);
  }
  return [...seen];
}
