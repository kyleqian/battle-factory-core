/**
 * Source-shaped reducer for MOVE_SWAGGER.
 *
 * Source:
 * - `data/battle_anim_scripts.s:Move_SWAGGER`
 * - `battle_anim_effects_2.c:gGrowAndShrinkAffineAnimCmds`
 * - `battle_anim_effects_2.c:AnimBreathPuff`
 * - `battle_anim_effects_2.c:gAngerMarkAffineAnimCmds` / `AnimAngerMark`
 *
 * Ages are relative to the first displayed GrowAndShrink task frame. The
 * script-created sprite ages below intentionally remain named constants so
 * live evidence can ratchet the interpreter/display handoff independently.
 */

export type SwaggerSide = "player" | "opponent";

export interface SwaggerPoint {
  readonly x: number;
  readonly y: number;
}

export interface SwaggerBreathPuff {
  readonly kind: "breath";
  readonly age: number;
  readonly x: number;
  readonly y: number;
  readonly frame: number;
  readonly hFlip: boolean;
}

export interface SwaggerAngerMark {
  readonly kind: "anger";
  readonly spawnIndex: 0 | 1;
  readonly age: number;
  readonly x: number;
  readonly y: number;
  readonly xScale: number;
  readonly yScale: number;
}

export interface SwaggerState {
  readonly attackerScale: Readonly<{ x: number; y: number }>;
  readonly attackerY2: number;
  readonly breath: SwaggerBreathPuff | null;
  readonly angerMarks: readonly SwaggerAngerMark[];
}

export const SWAGGER_BREATH_CREATION_AGE = 49;
export const SWAGGER_FIRST_ANGER_CREATION_AGE = 129;
export const SWAGGER_SECOND_ANGER_CREATION_AGE = 143;

function affineValueAtAge(
  age: number,
  firstDelta: number,
  secondDelta: number,
): number {
  if (age < 0) return 256;
  if (age < 12) return 256 + firstDelta * (age + 1);
  if (age < 36) return 256 + firstDelta * 12;
  if (age < 48) {
    return 256 + firstDelta * 12 + secondDelta * (age - 35);
  }
  return 256;
}

export function swaggerGrowAndShrinkAtAge(
  age: number,
): Readonly<{ x: number; y: number }> {
  return {
    x: affineValueAtAge(age, -4, 4),
    y: affineValueAtAge(age, -5, 5),
  };
}

function breathFrame(age: number): number {
  if (age < 4) return 0;
  if (age < 44) return 1;
  if (age < 48) return 2;
  return 3;
}

export function swaggerBreathAtAge(
  age: number,
  attackerSide: SwaggerSide,
  attackerCenter: SwaggerPoint,
): SwaggerBreathPuff | null {
  const spriteAge = age - SWAGGER_BREATH_CREATION_AGE;
  if (spriteAge < 0 || spriteAge >= 53) return null;
  const direction = attackerSide === "player" ? 1 : -1;
  const travel = attackerSide === "player"
    ? Math.trunc((spriteAge + 1) / 4)
    : Math.min(13, Math.ceil((spriteAge + 1) / 4));
  return {
    kind: "breath",
    age: spriteAge,
    x: attackerCenter.x
      + direction * (32 + travel),
    y: attackerCenter.y,
    frame: breathFrame(spriteAge),
    hFlip: attackerSide === "player",
  };
}

/**
 * Literal `gAngerMarkSpriteTemplate` reducer. Exported for moves whose script
 * uses the same three argv values and callback; it does not imply move-level
 * acceptance for those callers.
 */
export function swaggerAngerMarkAtAge(
  age: number,
  spawnIndex: 0 | 1,
  creationAge: number,
  targetSide: SwaggerSide,
  targetCenter: SwaggerPoint,
): SwaggerAngerMark | null {
  const spriteAge = age - creationAge;
  if (spriteAge < 0 || spriteAge >= 17) return null;
  const scriptX = spawnIndex === 0 ? -20 : 20;
  const mirroredX = targetSide === "opponent" ? -scriptX : scriptX;
  // `StartSpriteAffineAnim` advances once during creation and the callback
  // advances again in that same interpreter frame. The final identity state
  // remains allocated for one cleanup frame.
  const scale = spriteAge < 7
    ? 278 + 11 * spriteAge
    : spriteAge < 15
      ? 333 - 11 * (spriteAge - 7)
      : 256;
  return {
    kind: "anger",
    spawnIndex,
    age: spriteAge,
    x: targetCenter.x + mirroredX,
    y: Math.max(8, targetCenter.y - 28),
    xScale: scale,
    yScale: scale,
  };
}

export function swaggerAtAge(
  age: number,
  attackerSide: SwaggerSide,
  attackerCenter: SwaggerPoint,
  targetSide: SwaggerSide,
  targetCenter: SwaggerPoint,
): SwaggerState {
  const attackerScale = swaggerGrowAndShrinkAtAge(age);
  const battlerHeight = attackerSide === "player" ? 38 : 32;
  const scaledHeight = Math.trunc((battlerHeight << 8) / attackerScale.y);
  return {
    attackerScale,
    attackerY2: Math.trunc((battlerHeight - scaledHeight) / 2),
    breath: swaggerBreathAtAge(age, attackerSide, attackerCenter),
    angerMarks: [
      swaggerAngerMarkAtAge(
        age, 0, SWAGGER_FIRST_ANGER_CREATION_AGE, targetSide, targetCenter,
      ),
      swaggerAngerMarkAtAge(
        age, 1, SWAGGER_SECOND_ANGER_CREATION_AGE, targetSide, targetCenter,
      ),
    ].filter((mark): mark is SwaggerAngerMark => mark !== null),
  };
}
