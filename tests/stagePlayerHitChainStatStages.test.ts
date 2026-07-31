import { describe, expect, it } from "vitest";
import { stagePlayerHitChainToTerminalMachineState } from "../src/engine/turn1RockSlidePresentationStaging.ts";

/**
 * ISSUES #58: the shared staging helper's local `battler()` normalizer used
 * to hardcode `statStages: [6, 6, 6, 6, 6, 6, 6, 6]` regardless of the
 * caller's input, so a caller-supplied non-neutral stat stage silently
 * collapsed to neutral downstream in `calculateBattleScriptBaseDamageForCurrentMove`
 * (`battleScriptHitChainOpcode.ts`'s own `toDamageCalcStatStages` read of
 * `battler.statStages[STAT_ATK]`). Same silent-drop class as the fixed #57
 * (maxHP/item, `387a34a1`). Live-probed consequence
 * (`turn67RockSlidePresentationStagingPreview.ts`'s own module doc, commit
 * `1c015a37`): staging turn 6's real ONIX ROCK_SLIDE against PIDGEOTTO
 * through the shared helper, with Onix's real FEATHER_DANCE-lowered ATK
 * stage (6 -> 4), computed Pidgeotto's HP as 156 -> 71 (-85, neutral-stage
 * damage) instead of the real 156 -> 113 (-43).
 *
 * Ground truth reused, not fabricated: species/stats/moves/PP/RNG seed are
 * `turn67RockSlidePresentationStagingPreview.ts`'s own turn-6 constants
 * (`docs/turn6-notes.md` §3/§4), which already prove this exact shape
 * settles at 156 -> 113 via a local workaround pipeline mirroring
 * `turn6FeatherDancePresentationStaging.ts`'s own correct
 * `changes.statStages ?? default` pattern. This test proves the SHARED
 * helper now reproduces the identical real result once fixed.
 */
const SPECIES_ONIX = 95;
const SPECIES_PIDGEOTTO = 17;
const MOVE_ROCK_SLIDE = 157;
/** docs/turn6-notes.md §3's tick-7356 row -- value after FEATHER_DANCE's own roll, direct RNG carry-forward into ROCK_SLIDE's own accuracy roll. */
const TURN6_STAGED_RNG_SEED = 1484887866;
/** docs/turn6-notes.md §3's own next ledger entry (tick 8104) -- the real settle after exactly 4 Random() calls. */
const TURN6_RNG_VALUE_AFTER = 3551375038;

const TURN6_ONIX = Object.freeze({
  hp: 31,
  species: SPECIES_ONIX,
  attack: 51,
  defense: 187,
  spAttack: 36,
  spDefense: 72,
  types: ["TYPE_ROCK", "TYPE_GROUND"] as const,
  moves: [MOVE_ROCK_SLIDE, 20, 225, 201] as const, // ROCK_SLIDE, BIND, DRAGON_BREATH, SANDSTORM
  pp: [6, 20, 20, 10] as const,
});

const TURN6_PIDGEOTTO = Object.freeze({
  hp: 156,
  species: SPECIES_PIDGEOTTO,
  attack: 98,
  defense: 61,
  spAttack: 56,
  spDefense: 56,
  types: ["TYPE_NORMAL", "TYPE_FLYING"] as const,
});

describe("stagePlayerHitChainToTerminalMachineState: caller-supplied statStages (ISSUES #58)", () => {
  it("threads a supplied attacker statStages array verbatim into the staged terminal machine state AND computes the real non-neutral-stage damage (156 -> 113, not the neutral-stage 156 -> 71)", () => {
    const { state } = stagePlayerHitChainToTerminalMachineState({
      attacker: { ...TURN6_ONIX, statStages: [6, 4, 6, 6, 6, 6, 6, 6] },
      target: TURN6_PIDGEOTTO,
      currentMove: MOVE_ROCK_SLIDE,
      currentMovePosition: 0,
      moveEffectByte: 0,
      rngSeed: TURN6_STAGED_RNG_SEED,
    });
    const attacker = state.rulesContext.battlers[0];
    const target = state.rulesContext.battlers[1];
    expect(attacker.statStages).toEqual([6, 4, 6, 6, 6, 6, 6, 6]);
    expect(target.hp).toBe(113);
    expect(state.rng.value).toBe(TURN6_RNG_VALUE_AFTER);
  });

  it("an input that omits statStages keeps the pre-existing defaulting behavior unaffected (all-neutral [6,6,6,6,6,6,6,6], byte-identical prior damage)", () => {
    const { state } = stagePlayerHitChainToTerminalMachineState({
      attacker: TURN6_ONIX,
      target: TURN6_PIDGEOTTO,
      currentMove: MOVE_ROCK_SLIDE,
      currentMovePosition: 0,
      moveEffectByte: 0,
      rngSeed: TURN6_STAGED_RNG_SEED,
    });
    const attacker = state.rulesContext.battlers[0];
    const target = state.rulesContext.battlers[1];
    expect(attacker.statStages).toEqual([6, 6, 6, 6, 6, 6, 6, 6]);
    // Neutral-stage damage is strictly larger than the real -2-stage damage
    // above (-85 vs -43, turn67RockSlidePresentationStagingPreview.ts's own
    // module doc) -- pins the pre-fix, still-reachable default path.
    expect(target.hp).toBe(71);
  });
});
