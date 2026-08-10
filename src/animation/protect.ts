export type ProtectSide = "player" | "opponent";

export interface ProtectSpriteState {
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly priority: 2 | 3;
  readonly subpriority: 28 | 38;
  readonly duration: number;
  readonly invisible: boolean;
  readonly callback: "step" | "destroyBlend";
  readonly paletteRotationSteps: number;
  readonly alpha: Readonly<{ eva: number; evb: number }>;
}

export interface ProtectState {
  readonly sourceAge: number;
  readonly active: boolean;
  readonly sprite: ProtectSpriteState | null;
  readonly attackerBattlerHidden: boolean;
  readonly soundTaskActive: boolean;
}

/**
 * Pure source-age port of Move_PROTECT and AnimProtect. Age zero is the first
 * pointer inside the real even script interval; age 122 is the first inactive
 * interpreter cleanup row.
 */
export function protectAtAge(
  sourceAge: number,
  attackerCenter: Readonly<{ x: number; y: number }>,
  side: ProtectSide,
): ProtectState {
  const callbackTick = sourceAge - 6;
  const spriteActive = callbackTick >= 1 && callbackTick <= 110;
  let sprite: ProtectSpriteState | null = null;
  if (spriteActive) {
    const duration = Math.max(0, 90 - callbackTick);
    const drift = Math.floor(callbackTick * 96 / 256);
    const evb = callbackTick <= 20
      ? 16 - Math.floor(callbackTick / 2)
      : callbackTick <= 91
        ? 6
        : Math.min(16, 6 + Math.floor((callbackTick - 90) / 2));
    sprite = {
      x: attackerCenter.x + 24,
      y: attackerCenter.y,
      x2: drift === 0 ? 0 : -drift,
      priority: side === "player" ? 3 : 2,
      subpriority: side === "player" ? 28 : 38,
      duration,
      invisible: callbackTick === 110,
      callback: callbackTick === 110 ? "destroyBlend" : "step",
      paletteRotationSteps: Math.floor(callbackTick / 2),
      alpha: { eva: 16 - evb, evb },
    };
  }
  return {
    sourceAge,
    active: sourceAge >= 0 && sourceAge < 122,
    sprite,
    attackerBattlerHidden: sourceAge >= 4 && sourceAge <= 117,
    soundTaskActive: sourceAge >= 7 && sourceAge <= 22,
  };
}
