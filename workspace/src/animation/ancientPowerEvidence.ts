/**
 * Narrow source-state validator shared by the portable Ancient Power gate and
 * Tier-1 mutation tests.  It deliberately accepts plain probe values so the
 * production reducer never depends on mGBA or evidence files.
 */
export interface AncientPowerProbeSpriteSurface {
  readonly slot: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly invisible: number;
}

export interface AncientPowerProbeRegisterSurface {
  readonly bg3hofs: number;
  readonly bg3vofs: number;
  readonly bldcnt: number;
  readonly bldalpha: number;
}

export interface AncientPowerProbeSurface {
  readonly attacker: AncientPowerProbeSpriteSurface;
  readonly target: AncientPowerProbeSpriteSurface;
  readonly battleBg3: Readonly<{ x: number; y: number }>;
  readonly registers: AncientPowerProbeRegisterSurface;
  readonly rockSpriteOrder: readonly number[];
}

export interface AncientPowerExpectedProbeSurface {
  readonly attacker: AncientPowerProbeSpriteSurface;
  readonly target: AncientPowerProbeSpriteSurface;
  readonly battleBg3: Readonly<{ x: number; y: number }>;
  readonly registers: AncientPowerProbeRegisterSurface;
  readonly rockSpriteOrder: readonly number[];
}

/** Fail closed: every reducer-owned live source field must agree exactly. */
export function validateAncientPowerProbeSurface(
  actual: Readonly<AncientPowerProbeSurface>,
  expected: Readonly<AncientPowerExpectedProbeSurface>,
): readonly string[] {
  const failures: string[] = [];
  for (const role of ["attacker", "target"] as const) {
    for (const field of ["slot", "x", "y", "x2", "y2", "invisible"] as const) {
      if (actual[role][field] !== expected[role][field]) failures.push(`${role}.${field}`);
    }
  }
  for (const field of ["x", "y"] as const) {
    if (actual.battleBg3[field] !== expected.battleBg3[field]) failures.push(`battleBg3.${field}`);
  }
  for (const field of ["bg3hofs", "bg3vofs", "bldcnt", "bldalpha"] as const) {
    if (actual.registers[field] !== expected.registers[field]) failures.push(`registers.${field}`);
  }
  if (actual.rockSpriteOrder.length !== expected.rockSpriteOrder.length
    || actual.rockSpriteOrder.some((slot, index) => slot !== expected.rockSpriteOrder[index])) {
    failures.push("rockSpriteOrder");
  }
  return failures;
}
