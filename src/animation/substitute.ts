export const SUBSTITUTE_FRAME_COUNT = 87;

export interface SubstituteSpriteState {
  readonly graphics: "attacker" | "substitute";
  readonly x2: number;
  readonly y2: number;
  readonly invisible: boolean;
  readonly affine: boolean;
  readonly matrix: Readonly<{ a: number; b: 0; c: 0; d: number }>;
}

export interface SubstituteState {
  readonly sprite: SubstituteSpriteState;
  readonly taskActive: boolean;
  readonly sound: Readonly<{
    id: "SE_M_ATTRACT" | "SE_M_BUBBLE2";
    pan: number;
  }> | null;
  readonly active: boolean;
}

function dollStateAtAge(age: number): Pick<SubstituteSpriteState, "x2" | "y2"> {
  let phase = 0;
  let velocity = 0;
  let x2 = 200;
  let y2 = -200;
  for (let currentAge = 12; currentAge <= age; currentAge += 1) {
    if (phase === 0) {
      velocity += 112;
      y2 += velocity >> 8;
      // GetSubstituteSpriteDefault_Y is 97 in both singles orientations.
      if (97 + y2 >= -32) x2 = 0;
      if (y2 > 0) y2 = 0;
      if (y2 === 0) {
        velocity -= 0x800;
        phase = 1;
      }
    } else if (phase === 1) {
      velocity -= 112;
      if (velocity < 0) velocity = 0;
      y2 -= velocity >> 8;
      if (velocity === 0) phase = 2;
    } else {
      velocity += 112;
      y2 += velocity >> 8;
      if (y2 > 0) y2 = 0;
    }
  }
  return { x2, y2 };
}

/** Complete source-relative Move_SUBSTITUTE task plus first inactive cleanup. */
export function substituteAtAge(
  age: number,
  attackerSide: "player" | "opponent",
): SubstituteState {
  let sprite: SubstituteSpriteState;
  if (age <= 0) {
    sprite = {
      graphics: "attacker", x2: 0, y2: 0, invisible: false,
      affine: false, matrix: { a: 256, b: 0, c: 0, d: 256 },
    };
  } else if (age <= 8) {
    sprite = {
      graphics: "attacker", x2: 0, y2: 0, invisible: false,
      affine: true,
      matrix: { a: 256 + age * 0x60, b: 0, c: 0, d: 256 - age * 0x0d },
    };
  } else if (age === 9) {
    sprite = {
      graphics: "attacker", x2: 0, y2: 0, invisible: true,
      affine: false, matrix: { a: 256, b: 0, c: 0, d: 256 },
    };
  } else if (age === 10) {
    sprite = {
      graphics: "substitute", x2: 0, y2: 0, invisible: true,
      affine: false, matrix: { a: 256, b: 0, c: 0, d: 256 },
    };
  } else {
    const offset = dollStateAtAge(age);
    sprite = {
      graphics: "substitute", ...offset, invisible: false,
      affine: false, matrix: { a: 256, b: 0, c: 0, d: 256 },
    };
  }
  return {
    sprite,
    taskActive: age >= 1 && age <= 66,
    sound: age === 0
      ? { id: "SE_M_ATTRACT", pan: attackerSide === "player" ? -64 : 63 }
      : age === 42 || age === 67
        ? { id: "SE_M_BUBBLE2", pan: attackerSide === "player" ? -64 : 63 }
        : null,
    active: age >= 0 && age < SUBSTITUTE_FRAME_COUNT - 1,
  };
}
