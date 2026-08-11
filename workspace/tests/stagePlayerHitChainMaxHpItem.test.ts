import { describe, expect, it } from "vitest";
import { stagePlayerHitChainToTerminalMachineState } from "../src/engine/turn1RockSlidePresentationStaging.ts";

/**
 * ISSUES #57: the shared staging helper's local `battler()` normalizer used
 * to hardcode `item: 0` and never set `maxHP` at all, so a caller-supplied
 * attacker maxHP/item silently collapsed (maxHP -> current HP, item -> 0)
 * downstream in `createBattleScriptRulesContext`. Live-probed consequence
 * (commit 2fa31c96's own message): Onix's real maxHP 117 collapsed to 1
 * (its staged hp), wrongly failing the Sitrus `hp <= maxHP/2` gate and
 * forcing `turn5ResolutionAdapterPreview.ts` into a local staging pipeline
 * instead of this shared helper.
 *
 * Minimal, self-constructed staging input (no import of the turn5 files) --
 * reuses turn1's own real ONIX ROCK_SLIDE hit chain shape/seed
 * (`turn1RockSlidePresentationStaging.ts`'s own module doc) so the script
 * still reaches its own terminal end cleanly.
 */
const SPECIES_ONIX = 95;
const SPECIES_GROVYLE = 278;
const MOVE_ROCK_SLIDE = 157;
const STAGED_RNG_SEED = 3485459011;
/** src/data/gen/item-hold-effects.json ITEM_SITRUS_BERRY. */
const ITEM_SITRUS_BERRY = 142;

const BASE_ATTACKER = Object.freeze({
  species: SPECIES_ONIX,
  attack: 51,
  defense: 187,
  spAttack: 36,
  spDefense: 72,
  types: ["TYPE_ROCK", "TYPE_GROUND"] as const,
  moves: [MOVE_ROCK_SLIDE, 0, 0, 0] as const,
  pp: [10, 0, 0, 0] as const,
});

const TARGET = Object.freeze({
  hp: 143,
  species: SPECIES_GROVYLE,
  attack: 103,
  defense: 56,
  spAttack: 91,
  spDefense: 71,
  types: ["TYPE_GRASS", "TYPE_GRASS"] as const,
});

describe("stagePlayerHitChainToTerminalMachineState: caller-supplied maxHP/item (ISSUES #57)", () => {
  it("threads a supplied attacker maxHP/item verbatim into the staged terminal machine state", () => {
    const { state } = stagePlayerHitChainToTerminalMachineState({
      attacker: { ...BASE_ATTACKER, hp: 1, maxHP: 117, item: ITEM_SITRUS_BERRY },
      target: TARGET,
      currentMove: MOVE_ROCK_SLIDE,
      currentMovePosition: 0,
      moveEffectByte: 0,
      rngSeed: STAGED_RNG_SEED,
    });
    const attacker = state.rulesContext.battlers[0];
    expect(attacker.maxHP).toBe(117);
    expect(attacker.hp).toBe(1);
    expect(attacker.item).toBe(ITEM_SITRUS_BERRY);
  });

  it("an input that omits maxHP/item keeps the pre-existing defaulting behavior unaffected (maxHP -> hp, item -> 0)", () => {
    const { state } = stagePlayerHitChainToTerminalMachineState({
      attacker: { ...BASE_ATTACKER, hp: 143 },
      target: TARGET,
      currentMove: MOVE_ROCK_SLIDE,
      currentMovePosition: 0,
      moveEffectByte: 0,
      rngSeed: STAGED_RNG_SEED,
    });
    const attacker = state.rulesContext.battlers[0];
    expect(attacker.maxHP).toBe(143);
    expect(attacker.item).toBe(0);
  });
});
