/** Pure source-age reducer for Emerald's MOVE_MEAN_LOOK eye lifecycle. */

export interface MeanLookPoint { readonly x: number; readonly y: number }
export interface MeanLookProfile { readonly targetSubpriority: number }

export interface MeanLookEyeState {
  readonly slot: 4;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly subpriority: number;
  readonly callback: "step1-alpha-pulse" | "step2-hidden-grow" | "step3-wobble" | "step4-alpha-fade";
  readonly invisible: boolean;
  /** Source affine scale; the compositor converts this to an OAM matrix. */
  readonly xScale: number;
  readonly yScale: number;
  readonly alpha: number;
}

export interface MeanLookState {
  readonly age: number;
  readonly active: boolean;
  readonly sourceOffset: 0 | 3 | 5 | 46 | 65 | 67 | 68 | null;
  readonly monBgTargetCopy: boolean;
  readonly fieldPalette: "original" | "fade-to-black" | "black" | "fade-from-black";
  readonly eye: Readonly<MeanLookEyeState> | null;
}

function firstAffineScale(age: number): readonly [number, number] {
  let x = 0x180;
  let y = 0x180;
  for (let step = 0; step <= age - 7; step++) {
    if (step % 10 < 5) { x -= 0x20; y += 0x18; }
    else { x += 0x18; y -= 0x20; }
  }
  return [x, y];
}

function pulseAlpha(age: number): number {
  const phase = (age - 7 + 1) % 22;
  return phase <= 11 ? 4 + phase : 26 - phase;
}

function wobble(age: number): readonly [number, number] {
  if (age > 112 && age <= 165) return [1, 0];
  if (age < 97 || age > 112) return [0, 0];
  return ([[1, 0], [1, 0], [-1, 0], [-1, 0], [0, 1], [0, 1], [0, -1], [0, -1]] as const)[(age - 97) % 8]!;
}

function eyeAtAge(age: number, target: Readonly<MeanLookPoint>, targetSubpriority: number): MeanLookEyeState | null {
  if (age < 7 || age > 165) return null;
  let callback: MeanLookEyeState["callback"];
  let invisible = false;
  let xScale: number;
  let yScale: number;
  let alpha: number;
  if (age <= 77) {
    callback = "step1-alpha-pulse";
    [xScale, yScale] = firstAffineScale(age);
    alpha = pulseAlpha(age);
  } else if (age <= 95) {
    callback = "step2-hidden-grow";
    invisible = age <= 88;
    const growthSteps = Math.max(0, age - 88);
    xScale = yScale = 0x30 + Math.min(6, growthSteps) * 0x20;
    alpha = 0;
  } else if (age <= 112) {
    callback = "step3-wobble";
    xScale = yScale = 0xf0;
    alpha = 0;
  } else {
    callback = "step4-alpha-fade";
    xScale = yScale = 0xf0;
    alpha = Math.max(0, 16 - Math.floor(Math.max(0, age - 113) / 3));
    invisible = age >= 161;
  }
  const [x2, y2] = wobble(age);
  return { slot: 4, x: target.x, y: target.y, x2, y2, subpriority: targetSubpriority - 2, callback, invisible, xScale, yScale, alpha };
}

/** Age zero is the first pointer-owned row; age 170 is inactive cleanup. */
export function meanLookAtAge(age: number, target: Readonly<MeanLookPoint>, targetSubpriority: number): MeanLookState {
  const sourceOffset = age === 0 ? 0
    : age <= 3 ? 3
      : age <= 6 ? 5
        : age <= 128 ? 46
          : age <= 160 ? 65
            : age <= 169 ? 67
              : age === 170 ? 68 : null;
  return {
    age,
    active: age >= 0 && age <= 169,
    sourceOffset,
    monBgTargetCopy: age >= 4 && age <= 163,
    fieldPalette: age < 8 || age >= 160 ? "original"
      : age < 30 ? "fade-to-black"
        : age < 129 ? "black" : "fade-from-black",
    eye: eyeAtAge(age, target, targetSubpriority),
  };
}
