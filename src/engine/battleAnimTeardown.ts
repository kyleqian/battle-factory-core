export interface BattleAnimTeardownProfile {
  /** First displayed palette callback after the initial coefficient. */
  readonly paletteRestoreFirstAge: number;
  readonly paletteInitialCoeff: number;
  readonly paletteTargetCoeff: number;
  /** Source `gPaletteFade.deltaY`. */
  readonly paletteDelta: number;
  /** BG and OBJ halves are updated on alternating callbacks. */
  readonly paletteCallbacksPerStep: number;
  /** Display age at which `clearmonbg` and `blendoff` execute. */
  readonly monBgClearAge: number;
  /** Display age at which the sound-gated script `end` succeeds. */
  readonly scriptEndAge: number;
}

export interface BattleAnimTeardownState {
  readonly backgroundPaletteCoeff: number;
  readonly monBgActive: boolean;
  readonly alphaBlendEnabled: boolean;
  readonly scriptActive: boolean;
}

/**
 * Source-relative teardown shared by move scripts that restore a normal
 * palette fade, wait for it, then execute `clearmonbg` / `blendoff`.
 *
 * This models command and callback stages, not a table of rendered frames.
 * Profiles retain the source/evidence-dependent start and sound-tail clocks.
 */
export function battleAnimTeardownState(
  age: number,
  profile: Readonly<BattleAnimTeardownProfile>,
): BattleAnimTeardownState {
  const paletteSteps =
    age < profile.paletteRestoreFirstAge
      ? 0
      : 1 + Math.floor(
          (age - profile.paletteRestoreFirstAge)
            / profile.paletteCallbacksPerStep,
        );
  const direction = Math.sign(
    profile.paletteTargetCoeff - profile.paletteInitialCoeff,
  );
  const unboundedCoeff =
    profile.paletteInitialCoeff
    + direction * paletteSteps * profile.paletteDelta;
  const backgroundPaletteCoeff =
    direction < 0
      ? Math.max(profile.paletteTargetCoeff, unboundedCoeff)
      : Math.min(profile.paletteTargetCoeff, unboundedCoeff);

  return {
    backgroundPaletteCoeff,
    monBgActive: age < profile.monBgClearAge,
    alphaBlendEnabled: age < profile.monBgClearAge,
    scriptActive: age < profile.scriptEndAge,
  };
}
