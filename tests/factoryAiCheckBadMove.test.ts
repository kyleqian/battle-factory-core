import { describe, expect, it } from "vitest";
import {
  AI_CHECK_BAD_MOVE_TABLE_EFFECTS,
  MOVES_BY_ID,
  firstMoveIdWithEffect,
  runCbmAccUp,
  runCbmSpAtkDown,
  runCheckBadMovePreamble,
  unportedCheckBadMoveTableEffects,
  type FactoryAiCheckBadMoveAttacker,
  type FactoryAiCheckBadMoveRoarTarget,
  type FactoryAiCheckBadMoveTarget,
} from "../src/engine/factoryAiCheckBadMove.ts";

// DEFAULT_STAT_STAGE (6) on both stages -- neutral, irrelevant to every test
// in this file except the dedicated AI_CBM_AttackUp/DefenseUp/BulkUp block below.
const NEUTRAL_ATTACKER: FactoryAiCheckBadMoveAttacker = Object.freeze({ atkStage: 6, defStage: 6 });

const MAROWAK: FactoryAiCheckBadMoveTarget = Object.freeze({
  species: 105,
  types: ["TYPE_GROUND", "TYPE_GROUND"] as const,
  knownAbility: null,
  realAbility: "ABILITY_ROCK_HEAD",
  speedStage: 6, // DEFAULT_STAT_STAGE -- neutral, irrelevant to the effects this file exercises.
  atkStage: 6,
  defStage: 6,
  spDefStage: 6,
});

describe("AI_CBM_HighRiskForDamage via Counter (docs/factory-ai-checkviability-ground-truth.md §34)", () => {
  const MOVE_COUNTER = 68;

  function counterTarget(
    overrides: Partial<FactoryAiCheckBadMoveTarget> = {},
  ): FactoryAiCheckBadMoveTarget {
    return Object.freeze({
      ...MAROWAK,
      species: 213,
      types: ["TYPE_WATER", "TYPE_WATER"] as const,
      knownAbility: "ABILITY_STURDY",
      realAbility: "ABILITY_STURDY",
      ...overrides,
    });
  }

  it("x0 effectiveness JUMPs to Score_Minus10 before the handler ability read", () => {
    const result = run(MOVE_COUNTER, counterTarget({
      types: ["TYPE_GHOST", "TYPE_GHOST"],
      knownAbility: null,
    }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("non-Wonder-Guard FALLTHROUGH reaches End at zero", () => {
    expect(run(MOVE_COUNTER, counterTarget())).toMatchObject({
      kind: "scored",
      scoreDelta: 0,
    });
  });

  it("Wonder Guard FALLTHROUGH plus x2 effectiveness JUMPs to End at zero", () => {
    expect(run(MOVE_COUNTER, counterTarget({
      types: ["TYPE_NORMAL", "TYPE_NORMAL"],
      knownAbility: "ABILITY_WONDER_GUARD",
      realAbility: "ABILITY_WONDER_GUARD",
    }))).toMatchObject({ kind: "scored", scoreDelta: 0 });
  });

  it("Wonder Guard FALLTHROUGH plus non-x2 effectiveness reaches Score_Minus10", () => {
    expect(run(MOVE_COUNTER, counterTarget({
      knownAbility: "ABILITY_WONDER_GUARD",
      realAbility: "ABILITY_WONDER_GUARD",
    }))).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it("performs the handler's fresh ability read after the universal Soundproof read", () => {
    const result = run(MOVE_COUNTER, { ...MAROWAK, types: ["TYPE_WATER", "TYPE_WATER"] });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws.map((draw) => draw.reason)).toEqual([
      "test-slot-soundproof",
      "test-slot-high-risk-ability",
    ]);
  });

  it("leaves the next unported CBM table effect behind the generic barrier (derived dynamically)", () => {
    assertGenericCbmBarrierFires();
  });
});

describe("AI_CBM_HighRiskForDamage via Flail (docs/executable-frontier-census.md EFFECT_FLAIL row, dispatch :160)", () => {
  const MOVE_FLAIL = 175; // EFFECT_FLAIL, TYPE_NORMAL

  function flailTarget(
    overrides: Partial<FactoryAiCheckBadMoveTarget> = {},
  ): FactoryAiCheckBadMoveTarget {
    return Object.freeze({
      ...MAROWAK,
      species: 213,
      types: ["TYPE_ROCK", "TYPE_BUG"] as const,
      knownAbility: "ABILITY_STURDY",
      realAbility: "ABILITY_STURDY",
      ...overrides,
    });
  }

  it("x0 effectiveness JUMPs to Score_Minus10 before the handler ability read", () => {
    const result = run(MOVE_FLAIL, flailTarget({
      types: ["TYPE_GHOST", "TYPE_GHOST"],
      knownAbility: null,
    }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("non-Wonder-Guard FALLTHROUGH reaches End at zero", () => {
    expect(run(MOVE_FLAIL, flailTarget())).toMatchObject({
      kind: "scored",
      scoreDelta: 0,
    });
  });

  it("Wonder Guard FALLTHROUGH plus non-x2 effectiveness reaches Score_Minus10", () => {
    // Normal is never x2 against any type, so Wonder Guard always rejects.
    expect(run(MOVE_FLAIL, flailTarget({
      knownAbility: "ABILITY_WONDER_GUARD",
      realAbility: "ABILITY_WONDER_GUARD",
    }))).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it("performs the handler's fresh ability read after the universal Soundproof read", () => {
    const result = run(MOVE_FLAIL, { ...MAROWAK, types: ["TYPE_ROCK", "TYPE_BUG"] });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws.map((draw) => draw.reason)).toEqual([
      "test-slot-soundproof",
      "test-slot-high-risk-ability",
    ]);
  });

  it("leaves the next unported CBM table effect behind the generic barrier (derived dynamically)", () => {
    assertGenericCbmBarrierFires();
  });
});

describe("AI_CBM_HighRiskForDamage via Mirror Coat (dispatch :182)", () => {
  const MOVE_MIRROR_COAT = 243; // EFFECT_MIRROR_COAT, TYPE_PSYCHIC

  function mirrorCoatTarget(
    overrides: Partial<FactoryAiCheckBadMoveTarget> = {},
  ): FactoryAiCheckBadMoveTarget {
    return Object.freeze({
      ...MAROWAK,
      species: 213,
      types: ["TYPE_ROCK", "TYPE_BUG"] as const,
      knownAbility: "ABILITY_STURDY",
      realAbility: "ABILITY_STURDY",
      ...overrides,
    });
  }

  it("x0 effectiveness JUMPs to Score_Minus10 before the handler ability read", () => {
    // Psychic is x0 against Dark.
    const result = run(MOVE_MIRROR_COAT, mirrorCoatTarget({
      types: ["TYPE_DARK", "TYPE_DARK"],
      knownAbility: null,
    }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("non-Wonder-Guard FALLTHROUGH reaches End at zero", () => {
    expect(run(MOVE_MIRROR_COAT, mirrorCoatTarget())).toMatchObject({
      kind: "scored",
      scoreDelta: 0,
    });
  });

  it("Wonder Guard FALLTHROUGH plus non-x2 effectiveness reaches Score_Minus10", () => {
    expect(run(MOVE_MIRROR_COAT, mirrorCoatTarget({
      types: ["TYPE_ROCK", "TYPE_BUG"],
      knownAbility: "ABILITY_WONDER_GUARD",
      realAbility: "ABILITY_WONDER_GUARD",
    }))).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it("Wonder Guard FALLTHROUGH plus x2 effectiveness JUMPs to End at zero", () => {
    // Psychic is x2 against Fighting.
    expect(run(MOVE_MIRROR_COAT, mirrorCoatTarget({
      types: ["TYPE_FIGHTING", "TYPE_NORMAL"],
      knownAbility: "ABILITY_WONDER_GUARD",
      realAbility: "ABILITY_WONDER_GUARD",
    }))).toMatchObject({ kind: "scored", scoreDelta: 0 });
  });

  it("performs the handler's fresh ability read after the universal Soundproof read", () => {
    const result = run(MOVE_MIRROR_COAT, { ...MAROWAK, types: ["TYPE_ROCK", "TYPE_BUG"] });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws.map((draw) => draw.reason)).toEqual([
      "test-slot-soundproof",
      "test-slot-high-risk-ability",
    ]);
  });
});

describe("AI_CBM_HighRiskForDamage via Focus Punch (dispatch :196)", () => {
  const MOVE_FOCUS_PUNCH = 264; // EFFECT_FOCUS_PUNCH, TYPE_FIGHTING, power 150

  function focusPunchTarget(
    overrides: Partial<FactoryAiCheckBadMoveTarget> = {},
  ): FactoryAiCheckBadMoveTarget {
    return Object.freeze({
      ...MAROWAK,
      species: 213,
      types: ["TYPE_ROCK", "TYPE_BUG"] as const,
      knownAbility: "ABILITY_STURDY",
      realAbility: "ABILITY_STURDY",
      ...overrides,
    });
  }

  it("x0 effectiveness JUMPs to Score_Minus10 before the handler ability read", () => {
    // Fighting is x0 against Ghost.
    const result = run(MOVE_FOCUS_PUNCH, focusPunchTarget({
      types: ["TYPE_GHOST", "TYPE_GHOST"],
      knownAbility: null,
    }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("non-Wonder-Guard FALLTHROUGH reaches End at zero", () => {
    expect(run(MOVE_FOCUS_PUNCH, focusPunchTarget())).toMatchObject({
      kind: "scored",
      scoreDelta: 0,
    });
  });

  it("Wonder Guard FALLTHROUGH plus non-x2 effectiveness reaches Score_Minus10", () => {
    expect(run(MOVE_FOCUS_PUNCH, focusPunchTarget({
      knownAbility: "ABILITY_WONDER_GUARD",
      realAbility: "ABILITY_WONDER_GUARD",
    }))).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it("Wonder Guard FALLTHROUGH plus x2 effectiveness JUMPs to End at zero", () => {
    // Fighting is x2 against Normal.
    expect(run(MOVE_FOCUS_PUNCH, focusPunchTarget({
      types: ["TYPE_NORMAL", "TYPE_NORMAL"],
      knownAbility: "ABILITY_WONDER_GUARD",
      realAbility: "ABILITY_WONDER_GUARD",
    }))).toMatchObject({ kind: "scored", scoreDelta: 0 });
  });

  it("performs the handler's fresh ability read after the universal Soundproof read", () => {
    const result = run(MOVE_FOCUS_PUNCH, { ...MAROWAK, types: ["TYPE_ROCK", "TYPE_BUG"] });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws.map((draw) => draw.reason)).toEqual([
      "test-slot-soundproof",
      "test-slot-high-risk-ability",
    ]);
  });
});

describe("AI_CBM_HighRiskForDamage via Seismic Toss / Night Shade (dispatch :154, EFFECT_LEVEL_DAMAGE)", () => {
  const MOVE_SEISMIC_TOSS = 69; // EFFECT_LEVEL_DAMAGE, TYPE_FIGHTING
  const MOVE_NIGHT_SHADE = 101; // EFFECT_LEVEL_DAMAGE, TYPE_GHOST

  function levelDamageTarget(
    overrides: Partial<FactoryAiCheckBadMoveTarget> = {},
  ): FactoryAiCheckBadMoveTarget {
    return Object.freeze({
      ...MAROWAK,
      species: 213,
      types: ["TYPE_ROCK", "TYPE_BUG"] as const,
      knownAbility: "ABILITY_STURDY",
      realAbility: "ABILITY_STURDY",
      ...overrides,
    });
  }

  it("x0 effectiveness JUMPs to Score_Minus10 before the handler ability read (Seismic Toss, Fighting vs Ghost)", () => {
    const result = run(MOVE_SEISMIC_TOSS, levelDamageTarget({
      types: ["TYPE_GHOST", "TYPE_GHOST"],
      knownAbility: null,
    }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("x0 effectiveness JUMPs to Score_Minus10 before the handler ability read (Night Shade, Ghost vs Normal)", () => {
    const result = run(MOVE_NIGHT_SHADE, levelDamageTarget({
      types: ["TYPE_NORMAL", "TYPE_NORMAL"],
      knownAbility: null,
    }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("non-Wonder-Guard FALLTHROUGH reaches End at zero", () => {
    expect(run(MOVE_SEISMIC_TOSS, levelDamageTarget())).toMatchObject({
      kind: "scored",
      scoreDelta: 0,
    });
  });

  it("Wonder Guard FALLTHROUGH plus non-x2 effectiveness reaches Score_Minus10", () => {
    expect(run(MOVE_NIGHT_SHADE, levelDamageTarget({
      knownAbility: "ABILITY_WONDER_GUARD",
      realAbility: "ABILITY_WONDER_GUARD",
    }))).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it("performs the handler's fresh ability read after the universal Soundproof read", () => {
    const result = run(MOVE_SEISMIC_TOSS, { ...MAROWAK, types: ["TYPE_ROCK", "TYPE_BUG"] });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws.map((draw) => draw.reason)).toEqual([
      "test-slot-soundproof",
      "test-slot-high-risk-ability",
    ]);
  });
});

describe("AI_CBM_HighRiskForDamage via Frustration (dispatch :173)", () => {
  const MOVE_FRUSTRATION = 218; // EFFECT_FRUSTRATION, TYPE_NORMAL

  function frustrationTarget(
    overrides: Partial<FactoryAiCheckBadMoveTarget> = {},
  ): FactoryAiCheckBadMoveTarget {
    return Object.freeze({
      ...MAROWAK,
      species: 213,
      types: ["TYPE_ROCK", "TYPE_BUG"] as const,
      knownAbility: "ABILITY_STURDY",
      realAbility: "ABILITY_STURDY",
      ...overrides,
    });
  }

  it("x0 effectiveness JUMPs to Score_Minus10 before the handler ability read", () => {
    // Normal is x0 against Ghost.
    const result = run(MOVE_FRUSTRATION, frustrationTarget({
      types: ["TYPE_GHOST", "TYPE_GHOST"],
      knownAbility: null,
    }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("non-Wonder-Guard FALLTHROUGH reaches End at zero", () => {
    expect(run(MOVE_FRUSTRATION, frustrationTarget())).toMatchObject({
      kind: "scored",
      scoreDelta: 0,
    });
  });

  it("Wonder Guard FALLTHROUGH plus non-x2 effectiveness reaches Score_Minus10", () => {
    // Normal is never x2 against any type, so Wonder Guard always rejects.
    expect(run(MOVE_FRUSTRATION, frustrationTarget({
      knownAbility: "ABILITY_WONDER_GUARD",
      realAbility: "ABILITY_WONDER_GUARD",
    }))).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it("performs the handler's fresh ability read after the universal Soundproof read", () => {
    const result = run(MOVE_FRUSTRATION, { ...MAROWAK, types: ["TYPE_ROCK", "TYPE_BUG"] });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws.map((draw) => draw.reason)).toEqual([
      "test-slot-soundproof",
      "test-slot-high-risk-ability",
    ]);
  });
});

describe("AI_CBM_HighRiskForDamage via Return (dispatch :171)", () => {
  const MOVE_RETURN = 216; // EFFECT_RETURN, TYPE_NORMAL

  function returnTarget(
    overrides: Partial<FactoryAiCheckBadMoveTarget> = {},
  ): FactoryAiCheckBadMoveTarget {
    return Object.freeze({
      ...MAROWAK,
      species: 213,
      types: ["TYPE_ROCK", "TYPE_BUG"] as const,
      knownAbility: "ABILITY_STURDY",
      realAbility: "ABILITY_STURDY",
      ...overrides,
    });
  }

  it("x0 effectiveness JUMPs to Score_Minus10 before the handler ability read", () => {
    // Normal is x0 against Ghost.
    const result = run(MOVE_RETURN, returnTarget({
      types: ["TYPE_GHOST", "TYPE_GHOST"],
      knownAbility: null,
    }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("non-Wonder-Guard FALLTHROUGH reaches End at zero", () => {
    expect(run(MOVE_RETURN, returnTarget())).toMatchObject({
      kind: "scored",
      scoreDelta: 0,
    });
  });

  it("Wonder Guard FALLTHROUGH plus non-x2 effectiveness reaches Score_Minus10", () => {
    // Normal is never x2 against any type, so Wonder Guard always rejects.
    expect(run(MOVE_RETURN, returnTarget({
      knownAbility: "ABILITY_WONDER_GUARD",
      realAbility: "ABILITY_WONDER_GUARD",
    }))).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it("performs the handler's fresh ability read after the universal Soundproof read", () => {
    const result = run(MOVE_RETURN, { ...MAROWAK, types: ["TYPE_ROCK", "TYPE_BUG"] });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws.map((draw) => draw.reason)).toEqual([
      "test-slot-soundproof",
      "test-slot-high-risk-ability",
    ]);
  });
});

describe("AI_CBM_HighRiskForDamage via Hyper Beam (dispatch :151, EFFECT_RECHARGE)", () => {
  const MOVE_HYPER_BEAM = 63; // EFFECT_RECHARGE, TYPE_NORMAL, power 150

  function rechargeTarget(
    overrides: Partial<FactoryAiCheckBadMoveTarget> = {},
  ): FactoryAiCheckBadMoveTarget {
    return Object.freeze({
      ...MAROWAK,
      species: 213,
      types: ["TYPE_ROCK", "TYPE_BUG"] as const,
      knownAbility: "ABILITY_STURDY",
      realAbility: "ABILITY_STURDY",
      ...overrides,
    });
  }

  it("x0 effectiveness JUMPs to Score_Minus10 before the handler ability read", () => {
    // Normal is x0 against Ghost.
    const result = run(MOVE_HYPER_BEAM, rechargeTarget({
      types: ["TYPE_GHOST", "TYPE_GHOST"],
      knownAbility: null,
    }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("non-Wonder-Guard FALLTHROUGH reaches End at zero", () => {
    expect(run(MOVE_HYPER_BEAM, rechargeTarget())).toMatchObject({
      kind: "scored",
      scoreDelta: 0,
    });
  });

  it("Wonder Guard FALLTHROUGH plus non-x2 effectiveness reaches Score_Minus10", () => {
    // Normal is never x2 against any type, so Wonder Guard always rejects.
    expect(run(MOVE_HYPER_BEAM, rechargeTarget({
      knownAbility: "ABILITY_WONDER_GUARD",
      realAbility: "ABILITY_WONDER_GUARD",
    }))).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it("performs the handler's fresh ability read after the universal Soundproof read", () => {
    const result = run(MOVE_HYPER_BEAM, { ...MAROWAK, types: ["TYPE_ROCK", "TYPE_BUG"] });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws.map((draw) => draw.reason)).toEqual([
      "test-slot-soundproof",
      "test-slot-high-risk-ability",
    ]);
  });
});

describe("AI_CBM_HighRiskForDamage via Endeavor (dispatch :203)", () => {
  const MOVE_ENDEAVOR = 283; // EFFECT_ENDEAVOR, TYPE_NORMAL

  function endeavorTarget(
    overrides: Partial<FactoryAiCheckBadMoveTarget> = {},
  ): FactoryAiCheckBadMoveTarget {
    return Object.freeze({
      ...MAROWAK,
      species: 213,
      types: ["TYPE_ROCK", "TYPE_BUG"] as const,
      knownAbility: "ABILITY_STURDY",
      realAbility: "ABILITY_STURDY",
      ...overrides,
    });
  }

  it("x0 effectiveness JUMPs to Score_Minus10 before the handler ability read", () => {
    // Normal is x0 against Ghost.
    const result = run(MOVE_ENDEAVOR, endeavorTarget({
      types: ["TYPE_GHOST", "TYPE_GHOST"],
      knownAbility: null,
    }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("non-Wonder-Guard FALLTHROUGH reaches End at zero", () => {
    expect(run(MOVE_ENDEAVOR, endeavorTarget())).toMatchObject({
      kind: "scored",
      scoreDelta: 0,
    });
  });

  it("Wonder Guard FALLTHROUGH plus non-x2 effectiveness reaches Score_Minus10", () => {
    // Normal is never x2 against any type, so Wonder Guard always rejects.
    expect(run(MOVE_ENDEAVOR, endeavorTarget({
      knownAbility: "ABILITY_WONDER_GUARD",
      realAbility: "ABILITY_WONDER_GUARD",
    }))).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it("performs the handler's fresh ability read after the universal Soundproof read", () => {
    const result = run(MOVE_ENDEAVOR, { ...MAROWAK, types: ["TYPE_ROCK", "TYPE_BUG"] });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws.map((draw) => draw.reason)).toEqual([
      "test-slot-soundproof",
      "test-slot-high-risk-ability",
    ]);
  });
});

describe("AI_CBM_HighRiskForDamage via Superpower (dispatch :200)", () => {
  const MOVE_SUPERPOWER = 276; // EFFECT_SUPERPOWER, TYPE_FIGHTING, power 120

  function superpowerTarget(
    overrides: Partial<FactoryAiCheckBadMoveTarget> = {},
  ): FactoryAiCheckBadMoveTarget {
    return Object.freeze({
      ...MAROWAK,
      species: 213,
      types: ["TYPE_ROCK", "TYPE_BUG"] as const,
      knownAbility: "ABILITY_STURDY",
      realAbility: "ABILITY_STURDY",
      ...overrides,
    });
  }

  it("x0 effectiveness JUMPs to Score_Minus10 before the handler ability read", () => {
    // Fighting is x0 against Ghost.
    const result = run(MOVE_SUPERPOWER, superpowerTarget({
      types: ["TYPE_GHOST", "TYPE_GHOST"],
      knownAbility: null,
    }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("non-Wonder-Guard FALLTHROUGH reaches End at zero", () => {
    expect(run(MOVE_SUPERPOWER, superpowerTarget())).toMatchObject({
      kind: "scored",
      scoreDelta: 0,
    });
  });

  it("Wonder Guard FALLTHROUGH plus non-x2 effectiveness reaches Score_Minus10", () => {
    expect(run(MOVE_SUPERPOWER, superpowerTarget({
      knownAbility: "ABILITY_WONDER_GUARD",
      realAbility: "ABILITY_WONDER_GUARD",
    }))).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it("Wonder Guard FALLTHROUGH plus x2 effectiveness JUMPs to End at zero", () => {
    // Fighting is x2 against Normal.
    expect(run(MOVE_SUPERPOWER, superpowerTarget({
      types: ["TYPE_NORMAL", "TYPE_NORMAL"],
      knownAbility: "ABILITY_WONDER_GUARD",
      realAbility: "ABILITY_WONDER_GUARD",
    }))).toMatchObject({ kind: "scored", scoreDelta: 0 });
  });

  it("performs the handler's fresh ability read after the universal Soundproof read", () => {
    const result = run(MOVE_SUPERPOWER, { ...MAROWAK, types: ["TYPE_ROCK", "TYPE_BUG"] });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws.map((draw) => draw.reason)).toEqual([
      "test-slot-soundproof",
      "test-slot-high-risk-ability",
    ]);
  });
});

describe("AI_CBM_HighRiskForDamage via Razor Wind (dispatch :128, EFFECT_RAZOR_WIND)", () => {
  const MOVE_RAZOR_WIND = 13; // EFFECT_RAZOR_WIND, TYPE_NORMAL, power 80

  function razorWindTarget(
    overrides: Partial<FactoryAiCheckBadMoveTarget> = {},
  ): FactoryAiCheckBadMoveTarget {
    return Object.freeze({
      ...MAROWAK,
      species: 213,
      types: ["TYPE_ROCK", "TYPE_BUG"] as const,
      knownAbility: "ABILITY_STURDY",
      realAbility: "ABILITY_STURDY",
      ...overrides,
    });
  }

  it("x0 effectiveness JUMPs to Score_Minus10 before the handler ability read", () => {
    // Normal is x0 against Ghost.
    const result = run(MOVE_RAZOR_WIND, razorWindTarget({
      types: ["TYPE_GHOST", "TYPE_GHOST"],
      knownAbility: null,
    }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("non-Wonder-Guard FALLTHROUGH reaches End at zero", () => {
    expect(run(MOVE_RAZOR_WIND, razorWindTarget())).toMatchObject({
      kind: "scored",
      scoreDelta: 0,
    });
  });

  it("Wonder Guard FALLTHROUGH plus non-x2 effectiveness reaches Score_Minus10", () => {
    // Normal is never x2 against any type, so Wonder Guard always rejects.
    expect(run(MOVE_RAZOR_WIND, razorWindTarget({
      knownAbility: "ABILITY_WONDER_GUARD",
      realAbility: "ABILITY_WONDER_GUARD",
    }))).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it("performs the handler's fresh ability read after the universal Soundproof read", () => {
    const result = run(MOVE_RAZOR_WIND, { ...MAROWAK, types: ["TYPE_ROCK", "TYPE_BUG"] });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws.map((draw) => draw.reason)).toEqual([
      "test-slot-soundproof",
      "test-slot-high-risk-ability",
    ]);
  });
});

describe("AI_CBM_HighRiskForDamage via Psywave (dispatch :155, EFFECT_PSYWAVE)", () => {
  const MOVE_PSYWAVE = 149; // EFFECT_PSYWAVE, TYPE_PSYCHIC, power 1

  function psywaveTarget(
    overrides: Partial<FactoryAiCheckBadMoveTarget> = {},
  ): FactoryAiCheckBadMoveTarget {
    return Object.freeze({
      ...MAROWAK,
      species: 213,
      types: ["TYPE_ROCK", "TYPE_BUG"] as const,
      knownAbility: "ABILITY_STURDY",
      realAbility: "ABILITY_STURDY",
      ...overrides,
    });
  }

  it("x0 effectiveness JUMPs to Score_Minus10 before the handler ability read", () => {
    // Psychic is x0 against Dark.
    const result = run(MOVE_PSYWAVE, psywaveTarget({
      types: ["TYPE_DARK", "TYPE_DARK"],
      knownAbility: null,
    }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("non-Wonder-Guard FALLTHROUGH reaches End at zero", () => {
    expect(run(MOVE_PSYWAVE, psywaveTarget())).toMatchObject({
      kind: "scored",
      scoreDelta: 0,
    });
  });

  it("Wonder Guard FALLTHROUGH plus non-x2 effectiveness reaches Score_Minus10", () => {
    expect(run(MOVE_PSYWAVE, psywaveTarget({
      types: ["TYPE_ROCK", "TYPE_BUG"],
      knownAbility: "ABILITY_WONDER_GUARD",
      realAbility: "ABILITY_WONDER_GUARD",
    }))).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it("performs the handler's fresh ability read after the universal Soundproof read", () => {
    const result = run(MOVE_PSYWAVE, { ...MAROWAK, types: ["TYPE_ROCK", "TYPE_BUG"] });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws.map((draw) => draw.reason)).toEqual([
      "test-slot-soundproof",
      "test-slot-high-risk-ability",
    ]);
  });
});

describe("AI_CBM_HighRiskForDamage via Low Kick (dispatch :206, EFFECT_LOW_KICK)", () => {
  const MOVE_LOW_KICK = 67; // EFFECT_LOW_KICK, TYPE_FIGHTING, power 1

  function lowKickTarget(
    overrides: Partial<FactoryAiCheckBadMoveTarget> = {},
  ): FactoryAiCheckBadMoveTarget {
    return Object.freeze({
      ...MAROWAK,
      species: 213,
      types: ["TYPE_ROCK", "TYPE_BUG"] as const,
      knownAbility: "ABILITY_STURDY",
      realAbility: "ABILITY_STURDY",
      ...overrides,
    });
  }

  it("x0 effectiveness JUMPs to Score_Minus10 before the handler ability read", () => {
    // Fighting is x0 against Ghost.
    const result = run(MOVE_LOW_KICK, lowKickTarget({
      types: ["TYPE_GHOST", "TYPE_GHOST"],
      knownAbility: null,
    }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("non-Wonder-Guard FALLTHROUGH reaches End at zero", () => {
    expect(run(MOVE_LOW_KICK, lowKickTarget())).toMatchObject({
      kind: "scored",
      scoreDelta: 0,
    });
  });

  it("Wonder Guard FALLTHROUGH plus non-x2 effectiveness reaches Score_Minus10", () => {
    // Fighting is x1 vs Rock/Bug, so Wonder Guard always rejects here.
    expect(run(MOVE_LOW_KICK, lowKickTarget({
      knownAbility: "ABILITY_WONDER_GUARD",
      realAbility: "ABILITY_WONDER_GUARD",
    }))).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it("performs the handler's fresh ability read after the universal Soundproof read", () => {
    const result = run(MOVE_LOW_KICK, { ...MAROWAK, types: ["TYPE_ROCK", "TYPE_BUG"] });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws.map((draw) => draw.reason)).toEqual([
      "test-slot-soundproof",
      "test-slot-high-risk-ability",
    ]);
  });
});

describe("AI_CBM_HighRiskForDamage via Super Fang (dispatch :129, EFFECT_SUPER_FANG)", () => {
  const MOVE_SUPER_FANG = 162; // EFFECT_SUPER_FANG, TYPE_NORMAL, power 1

  function superFangTarget(
    overrides: Partial<FactoryAiCheckBadMoveTarget> = {},
  ): FactoryAiCheckBadMoveTarget {
    return Object.freeze({
      ...MAROWAK,
      species: 213,
      types: ["TYPE_ROCK", "TYPE_BUG"] as const,
      knownAbility: "ABILITY_STURDY",
      realAbility: "ABILITY_STURDY",
      ...overrides,
    });
  }

  it("x0 effectiveness JUMPs to Score_Minus10 before the handler ability read", () => {
    // Normal is x0 against Ghost.
    const result = run(MOVE_SUPER_FANG, superFangTarget({
      types: ["TYPE_GHOST", "TYPE_GHOST"],
      knownAbility: null,
    }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("non-Wonder-Guard FALLTHROUGH reaches End at zero", () => {
    expect(run(MOVE_SUPER_FANG, superFangTarget())).toMatchObject({
      kind: "scored",
      scoreDelta: 0,
    });
  });

  it("Wonder Guard FALLTHROUGH plus non-x2 effectiveness reaches Score_Minus10", () => {
    // Normal is never x2 against any type, so Wonder Guard always rejects.
    expect(run(MOVE_SUPER_FANG, superFangTarget({
      knownAbility: "ABILITY_WONDER_GUARD",
      realAbility: "ABILITY_WONDER_GUARD",
    }))).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it("performs the handler's fresh ability read after the universal Soundproof read", () => {
    const result = run(MOVE_SUPER_FANG, { ...MAROWAK, types: ["TYPE_ROCK", "TYPE_BUG"] });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws.map((draw) => draw.reason)).toEqual([
      "test-slot-soundproof",
      "test-slot-high-risk-ability",
    ]);
  });
});

describe("AI_CBM_HighRiskForDamage via Present (dispatch :172, EFFECT_PRESENT)", () => {
  const MOVE_PRESENT = 217; // EFFECT_PRESENT, TYPE_NORMAL, power 1

  function presentTarget(
    overrides: Partial<FactoryAiCheckBadMoveTarget> = {},
  ): FactoryAiCheckBadMoveTarget {
    return Object.freeze({
      ...MAROWAK,
      species: 213,
      types: ["TYPE_ROCK", "TYPE_BUG"] as const,
      knownAbility: "ABILITY_STURDY",
      realAbility: "ABILITY_STURDY",
      ...overrides,
    });
  }

  it("x0 effectiveness JUMPs to Score_Minus10 before the handler ability read", () => {
    // Normal is x0 against Ghost.
    const result = run(MOVE_PRESENT, presentTarget({
      types: ["TYPE_GHOST", "TYPE_GHOST"],
      knownAbility: null,
    }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("non-Wonder-Guard FALLTHROUGH reaches End at zero", () => {
    expect(run(MOVE_PRESENT, presentTarget())).toMatchObject({
      kind: "scored",
      scoreDelta: 0,
    });
  });

  it("Wonder Guard FALLTHROUGH plus non-x2 effectiveness reaches Score_Minus10", () => {
    // Normal is never x2 against any type, so Wonder Guard always rejects.
    expect(run(MOVE_PRESENT, presentTarget({
      knownAbility: "ABILITY_WONDER_GUARD",
      realAbility: "ABILITY_WONDER_GUARD",
    }))).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it("performs the handler's fresh ability read after the universal Soundproof read", () => {
    const result = run(MOVE_PRESENT, { ...MAROWAK, types: ["TYPE_ROCK", "TYPE_BUG"] });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws.map((draw) => draw.reason)).toEqual([
      "test-slot-soundproof",
      "test-slot-high-risk-ability",
    ]);
  });
});

describe("AI_CBM_HighRiskForDamage via Sonic Boom (dispatch :177, EFFECT_SONICBOOM)", () => {
  const MOVE_SONICBOOM = 49; // EFFECT_SONICBOOM, TYPE_NORMAL, power 1

  function sonicboomTarget(
    overrides: Partial<FactoryAiCheckBadMoveTarget> = {},
  ): FactoryAiCheckBadMoveTarget {
    return Object.freeze({
      ...MAROWAK,
      species: 213,
      types: ["TYPE_ROCK", "TYPE_BUG"] as const,
      knownAbility: "ABILITY_STURDY",
      realAbility: "ABILITY_STURDY",
      ...overrides,
    });
  }

  it("x0 effectiveness JUMPs to Score_Minus10 before the handler ability read", () => {
    // Normal is x0 against Ghost.
    const result = run(MOVE_SONICBOOM, sonicboomTarget({
      types: ["TYPE_GHOST", "TYPE_GHOST"],
      knownAbility: null,
    }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("non-Wonder-Guard FALLTHROUGH reaches End at zero", () => {
    expect(run(MOVE_SONICBOOM, sonicboomTarget())).toMatchObject({
      kind: "scored",
      scoreDelta: 0,
    });
  });

  it("Wonder Guard FALLTHROUGH plus non-x2 effectiveness reaches Score_Minus10", () => {
    // Normal is never x2 against any type, so Wonder Guard always rejects.
    expect(run(MOVE_SONICBOOM, sonicboomTarget({
      knownAbility: "ABILITY_WONDER_GUARD",
      realAbility: "ABILITY_WONDER_GUARD",
    }))).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });
});

describe("AI_CBM_HighRiskForDamage via Bide (dispatch :123, EFFECT_BIDE)", () => {
  const MOVE_BIDE = 117; // EFFECT_BIDE, TYPE_NORMAL, power 1

  it("non-Wonder-Guard FALLTHROUGH reaches End at zero", () => {
    expect(run(MOVE_BIDE, { ...MAROWAK, types: ["TYPE_ROCK", "TYPE_BUG"] })).toMatchObject({
      kind: "scored",
      scoreDelta: 0,
    });
  });

  it("x0 effectiveness JUMPs to Score_Minus10 before the handler ability read", () => {
    const result = run(MOVE_BIDE, { ...MAROWAK, types: ["TYPE_GHOST", "TYPE_GHOST"] });
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });
});

describe("AI_CBM_HighRiskForDamage via Skull Bash (dispatch :183, EFFECT_SKULL_BASH)", () => {
  const MOVE_SKULL_BASH = 130; // EFFECT_SKULL_BASH, TYPE_NORMAL, power 100

  it("non-Wonder-Guard FALLTHROUGH reaches End at zero", () => {
    expect(run(MOVE_SKULL_BASH, { ...MAROWAK, types: ["TYPE_ROCK", "TYPE_BUG"] })).toMatchObject({
      kind: "scored",
      scoreDelta: 0,
    });
  });

  it("x0 effectiveness JUMPs to Score_Minus10 before the handler ability read", () => {
    const result = run(MOVE_SKULL_BASH, { ...MAROWAK, types: ["TYPE_GHOST", "TYPE_GHOST"] });
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });
});

describe("EFFECT_TELEPORT (data/battle_ai_scripts.s:185, bare Score_Minus10)", () => {
  const MOVE_TELEPORT = 100;

  it("scores -10 unconditionally with zero draws", () => {
    const result = run(MOVE_TELEPORT, { ...MAROWAK, knownAbility: "ABILITY_ROCK_HEAD" });
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10, draws: [] });
  });
});

describe("AI_CBM_Ingrain (data/battle_ai_scripts.s:550-552, EFFECT_INGRAIN)", () => {
  const MOVE_INGRAIN = 275;

  function target(overrides: Partial<FactoryAiCheckBadMoveTarget> = {}): FactoryAiCheckBadMoveTarget {
    return Object.freeze({
      species: 213,
      types: ["TYPE_BUG", "TYPE_ROCK"] as const,
      knownAbility: "ABILITY_STURDY",
      realAbility: "ABILITY_STURDY",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
      ...overrides,
    });
  }

  it("AI already rooted JUMPs to Score_Minus10", () => {
    const result = run(
      MOVE_INGRAIN,
      target(),
      undefined,
      { atkStage: 6, defStage: 6, isRooted: true },
    );
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10, draws: [] });
  });

  it("AI not rooted FALLS THROUGH to end at zero", () => {
    const result = run(MOVE_INGRAIN, target(), undefined, { atkStage: 6, defStage: 6 });
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0, draws: [] });
  });
});

describe("AI_CBM_PerishSong (data/battle_ai_scripts.s:447-449, EFFECT_PERISH_SONG)", () => {
  const MOVE_PERISH_SONG = 195;

  function target(overrides: Partial<FactoryAiCheckBadMoveTarget> = {}): FactoryAiCheckBadMoveTarget {
    return Object.freeze({
      species: 213,
      types: ["TYPE_BUG", "TYPE_ROCK"] as const,
      knownAbility: "ABILITY_STURDY",
      realAbility: "ABILITY_STURDY",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
      ...overrides,
    });
  }

  it("target already under Perish Song JUMPs to Score_Minus10", () => {
    const result = run(MOVE_PERISH_SONG, target({ hasPerishSong: true }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10, draws: [] });
  });

  it("target not under Perish Song FALLS THROUGH to end at zero", () => {
    expect(run(MOVE_PERISH_SONG, target())).toMatchObject({
      kind: "scored",
      scoreDelta: 0,
      draws: [],
    });
  });
});

describe("AI_CBM_Nightmare (data/battle_ai_scripts.s:237-240, EFFECT_NIGHTMARE)", () => {
  const MOVE_NIGHTMARE = 171;

  function target(overrides: Partial<FactoryAiCheckBadMoveTarget> = {}): FactoryAiCheckBadMoveTarget {
    return Object.freeze({
      species: 213,
      types: ["TYPE_BUG", "TYPE_ROCK"] as const,
      knownAbility: "ABILITY_STURDY",
      realAbility: "ABILITY_STURDY",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
      ...overrides,
    });
  }

  it("target already under Nightmare JUMPs to Score_Minus10", () => {
    const result = run(MOVE_NIGHTMARE, target({ isNightmared: true, isAsleep: true }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10, draws: [] });
  });

  it("Nightmared target never reaches the sleep check (sequential, not additive)", () => {
    const result = run(MOVE_NIGHTMARE, target({ isNightmared: true }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10, draws: [] });
  });

  it("asleep but not Nightmared FALLS THROUGH to end at zero", () => {
    const result = run(MOVE_NIGHTMARE, target({ isAsleep: true }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0, draws: [] });
  });

  it("not asleep and not Nightmared JUMPs to Score_Minus8", () => {
    const result = run(MOVE_NIGHTMARE, target());
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -8, draws: [] });
  });
});

describe("AI_CBM_Foresight (data/battle_ai_scripts.s:443-445, EFFECT_FORESIGHT)", () => {
  const MOVE_FORESIGHT = 193;

  function target(overrides: Partial<FactoryAiCheckBadMoveTarget> = {}): FactoryAiCheckBadMoveTarget {
    return Object.freeze({
      species: 213,
      types: ["TYPE_BUG", "TYPE_ROCK"] as const,
      knownAbility: "ABILITY_STURDY",
      realAbility: "ABILITY_STURDY",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
      ...overrides,
    });
  }

  it("target already foresighted JUMPs to Score_Minus10", () => {
    const result = run(MOVE_FORESIGHT, target({ isForesighted: true }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10, draws: [] });
  });

  it("target not foresighted FALLS THROUGH to end at zero", () => {
    expect(run(MOVE_FORESIGHT, target())).toMatchObject({
      kind: "scored",
      scoreDelta: 0,
      draws: [],
    });
  });
});

describe("AI_CBM_Spikes (data/battle_ai_scripts.s:439-441, EFFECT_SPIKES)", () => {
  const MOVE_SPIKES = 191;

  function target(overrides: Partial<FactoryAiCheckBadMoveTarget> = {}): FactoryAiCheckBadMoveTarget {
    return Object.freeze({
      species: 213,
      types: ["TYPE_BUG", "TYPE_ROCK"] as const,
      knownAbility: "ABILITY_STURDY",
      realAbility: "ABILITY_STURDY",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
      ...overrides,
    });
  }

  it("target side already has Spikes JUMPs to Score_Minus10", () => {
    const result = run(MOVE_SPIKES, target({ spikesUp: true }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10, draws: [] });
  });

  it("target side clear FALLS THROUGH to end at zero", () => {
    expect(run(MOVE_SPIKES, target())).toMatchObject({
      kind: "scored",
      scoreDelta: 0,
      draws: [],
    });
  });
});

describe("AI_CBM_FutureSight (data/battle_ai_scripts.s:500-504, EFFECT_FUTURE_SIGHT)", () => {
  const MOVE_FUTURE_SIGHT = 248;

  function target(overrides: Partial<FactoryAiCheckBadMoveTarget> = {}): FactoryAiCheckBadMoveTarget {
    return Object.freeze({
      species: 213,
      types: ["TYPE_BUG", "TYPE_ROCK"] as const,
      knownAbility: "ABILITY_STURDY",
      realAbility: "ABILITY_STURDY",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
      ...overrides,
    });
  }

  it("target side carrying a Future Sight attack JUMPs to Score_Minus12", () => {
    const result = run(MOVE_FUTURE_SIGHT, target({ targetFutureAttackUp: true }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -12, draws: [] });
  });

  it("AI's own side carrying a Future Sight attack JUMPs to Score_Minus12", () => {
    const result = run(
      MOVE_FUTURE_SIGHT,
      target(),
      undefined,
      { atkStage: 6, defStage: 6, attackerFutureAttackUp: true },
    );
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -12, draws: [] });
  });

  it("neither side carrying a Future Sight attack scores +5", () => {
    const result = run(MOVE_FUTURE_SIGHT, target());
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 5, draws: [] });
  });
});

describe("AI_CBM_FocusEnergy (data/battle_ai_scripts.s:382-384, EFFECT_FOCUS_ENERGY)", () => {
  const MOVE_FOCUS_ENERGY = 116;

  function target(overrides: Partial<FactoryAiCheckBadMoveTarget> = {}): FactoryAiCheckBadMoveTarget {
    return Object.freeze({
      species: 213,
      types: ["TYPE_BUG", "TYPE_ROCK"] as const,
      knownAbility: "ABILITY_STURDY",
      realAbility: "ABILITY_STURDY",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
      ...overrides,
    });
  }

  it("AI already has Focus Energy up JUMPs to Score_Minus10", () => {
    const result = run(
      MOVE_FOCUS_ENERGY,
      target(),
      undefined,
      { atkStage: 6, defStage: 6, hasFocusEnergy: true },
    );
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10, draws: [] });
  });

  it("AI does not have Focus Energy up FALLS THROUGH to end at zero", () => {
    const result = run(MOVE_FOCUS_ENERGY, target(), undefined, { atkStage: 6, defStage: 6 });
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0, draws: [] });
  });
});

describe("AI_CBM_Refresh (data/battle_ai_scripts.s:563-565, EFFECT_REFRESH)", () => {
  const MOVE_REFRESH = 287;

  function target(overrides: Partial<FactoryAiCheckBadMoveTarget> = {}): FactoryAiCheckBadMoveTarget {
    return Object.freeze({
      species: 213,
      types: ["TYPE_BUG", "TYPE_ROCK"] as const,
      knownAbility: "ABILITY_STURDY",
      realAbility: "ABILITY_STURDY",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
      ...overrides,
    });
  }

  it("AI with a curable status FALLS THROUGH to end at zero", () => {
    const result = run(
      MOVE_REFRESH,
      target(),
      undefined,
      { atkStage: 6, defStage: 6, hasCurableStatus: true },
    );
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0, draws: [] });
  });

  it("AI without a curable status JUMPs to Score_Minus10", () => {
    const result = run(MOVE_REFRESH, target(), undefined, { atkStage: 6, defStage: 6 });
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10, draws: [] });
  });
});

describe("AI_CBM_OneHitKO (data/battle_ai_scripts.s:358-362, EFFECT_OHKO)", () => {
  const MOVE_GUILLOTINE = 12; // EFFECT_OHKO, TYPE_NORMAL, power 1
  const MOVE_SHEER_COLD = 329; // EFFECT_OHKO, TYPE_ICE, power 1

  function ohkoTarget(
    overrides: Partial<FactoryAiCheckBadMoveTarget> = {},
  ): FactoryAiCheckBadMoveTarget {
    return Object.freeze({
      ...MAROWAK,
      types: ["TYPE_ROCK", "TYPE_BUG"] as const,
      knownAbility: "ABILITY_ROCK_HEAD",
      ...overrides,
    });
  }

  it("x0 effectiveness JUMPs to Score_Minus10 before the handler ability read", () => {
    // Normal is x0 against Ghost. A two-ability species keeps the universal
    // Soundproof draw in the receipt; the handler itself must add no draw.
    const result = run(MOVE_GUILLOTINE, ohkoTarget({
      species: 171,
      types: ["TYPE_GHOST", "TYPE_GHOST"],
      knownAbility: null,
      realAbility: "ABILITY_VOLT_ABSORB",
    }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws.map((draw) => draw.reason)).toEqual(["test-slot-soundproof"]);
  });

  it("non-Sturdy, attacker level >= target level FALLTHROUGH reaches End at zero", () => {
    const result = run(
      MOVE_GUILLOTINE,
      ohkoTarget(),
      undefined,
      { atkStage: 6, defStage: 6, level: 50 },
    );
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    expect(result.draws).toHaveLength(0);
  });

  it("Sturdy JUMPs to Score_Minus10", () => {
    const result = run(
      MOVE_GUILLOTINE,
      ohkoTarget({
        species: 213,
        knownAbility: "ABILITY_STURDY",
        realAbility: "ABILITY_STURDY",
      }),
    );
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it("attacker level below target level JUMPs to Score_Minus10 (if_level_cond 1)", () => {
    // Source `Cmd_if_level_cond` case 1 = "less than": sBattler_AI.level <
    // gBattlerTarget.level.
    const result = run(
      MOVE_SHEER_COLD,
      ohkoTarget({ level: 100 }),
      undefined,
      { atkStage: 6, defStage: 6, level: 50 },
    );
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it("Sturdy with attacker level below target level still scores exactly -10 (single gate)", () => {
    // The two -10 gates are both Score_Minus10 JUMPs, never additive.
    const result = run(
      MOVE_SHEER_COLD,
      ohkoTarget({
        species: 213,
        knownAbility: "ABILITY_STURDY",
        realAbility: "ABILITY_STURDY",
        level: 100,
      }),
      undefined,
      { atkStage: 6, defStage: 6, level: 50 },
    );
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it("performs the handler's fresh ability read after the universal Soundproof read", () => {
    // Species 171 (Lanturn, Volt Absorb / Water Absorb) has two distinct
    // abilities, so with knownAbility null both the universal Soundproof
    // read and the handler's own get_ability draw.
    const result = run(MOVE_GUILLOTINE, ohkoTarget({
      species: 171,
      knownAbility: null,
      realAbility: "ABILITY_VOLT_ABSORB",
    }));
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws.map((draw) => draw.reason)).toEqual([
      "test-slot-soundproof",
      "test-slot-one-hit-ko-ability",
    ]);
  });
});

describe("AI_CBM_LeechSeed (data/battle_ai_scripts.s:410-416, EFFECT_LEECH_SEED)", () => {
  const MOVE_LEECH_SEED = 73; // EFFECT_LEECH_SEED, TYPE_GRASS

  // A known ability suppresses the universal Soundproof draw, isolating the
  // handler's own zero-get_ability body.
  const LEECH_SEED_TARGET: FactoryAiCheckBadMoveTarget = Object.freeze({
    ...MAROWAK,
    knownAbility: "ABILITY_ROCK_HEAD",
  });

  it("already-leech-seeded target JUMPs to Score_Minus10 with zero draws", () => {
    const result = run(MOVE_LEECH_SEED, {
      ...LEECH_SEED_TARGET,
      isLeechSeeded: true,
    });
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("Grass target type1 JUMPs to Score_Minus10", () => {
    const result = run(MOVE_LEECH_SEED, {
      ...LEECH_SEED_TARGET,
      types: ["TYPE_GRASS", "TYPE_ROCK"] as const,
    });
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it("Grass target type2 JUMPs to Score_Minus10", () => {
    const result = run(MOVE_LEECH_SEED, {
      ...LEECH_SEED_TARGET,
      types: ["TYPE_ROCK", "TYPE_GRASS"] as const,
    });
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it("non-seeded non-Grass target FALLS THROUGH to end at zero", () => {
    const result = run(MOVE_LEECH_SEED, LEECH_SEED_TARGET);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
    expect(result.rng.calls).toBe(0);
  });
});

describe("AI_CBM_FakeOut (data/battle_ai_scripts.s:506-509, EFFECT_FAKE_OUT)", () => {
  const MOVE_FAKE_OUT = 252; // EFFECT_FAKE_OUT, TYPE_NORMAL, power 40

  // A known ability suppresses the universal Soundproof draw so the handler
  // body's own zero-RNG shape is what the draw count isolates.
  const FAKE_OUT_TARGET: FactoryAiCheckBadMoveTarget = Object.freeze({
    ...MAROWAK,
    knownAbility: "ABILITY_ROCK_HEAD",
  });

  it("first turn (isFirstTurn nonzero) FALLS THROUGH to end at zero", () => {
    const result = run(
      MOVE_FAKE_OUT,
      FAKE_OUT_TARGET,
      undefined,
      { atkStage: 6, defStage: 6, isFirstTurn: 2 },
    );
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("not first turn (isFirstTurn 0) JUMPs to Score_Minus10", () => {
    const result = run(
      MOVE_FAKE_OUT,
      FAKE_OUT_TARGET,
      undefined,
      { atkStage: 6, defStage: 6, isFirstTurn: 0 },
    );
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it("absent isFirstTurn defaults to 0 (not first turn) and scores the penalty", () => {
    const result = run(MOVE_FAKE_OUT, FAKE_OUT_TARGET, undefined, { atkStage: 6, defStage: 6 });
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });
});

describe("AI_CBM_WillOWisp (data/battle_ai_scripts.s:531-539, EFFECT_WILL_O_WISP)", () => {
  const MOVE_WILL_O_WISP = 261; // EFFECT_WILL_O_WISP, TYPE_FIRE, power 0

  // A known ability suppresses the universal Soundproof draw so the handler's
  // own single get_ability is what the draw count isolates.
  const WOW_TARGET: FactoryAiCheckBadMoveTarget = Object.freeze({
    ...MAROWAK,
    types: ["TYPE_ROCK", "TYPE_BUG"] as const, // Fire is x1 vs Rock/Bug
    knownAbility: "ABILITY_ROCK_HEAD",
  });

  it("Water Veil JUMPs to Score_Minus10", () => {
    const result = run(MOVE_WILL_O_WISP, {
      ...WOW_TARGET,
      knownAbility: "ABILITY_WATER_VEIL",
      realAbility: "ABILITY_WATER_VEIL",
    });
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("any primary status JUMPs to Score_Minus10", () => {
    const result = run(MOVE_WILL_O_WISP, { ...WOW_TARGET, hasAnyStatus: true });
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it("x0 target (Fire vs Fire) JUMPs to Score_Minus10", () => {
    const result = run(MOVE_WILL_O_WISP, {
      ...WOW_TARGET,
      types: ["TYPE_FIRE", "TYPE_FIRE"] as const,
    });
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it("x0_5 target (Fire vs Water) JUMPs to Score_Minus10", () => {
    const result = run(MOVE_WILL_O_WISP, {
      ...WOW_TARGET,
      types: ["TYPE_WATER", "TYPE_WATER"] as const,
    });
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it("x0_25 target (Fire vs Fire/Water) JUMPs to Score_Minus10", () => {
    const result = run(MOVE_WILL_O_WISP, {
      ...WOW_TARGET,
      types: ["TYPE_FIRE", "TYPE_WATER"] as const,
    });
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it("target-side Safeguard JUMPs to Score_Minus10", () => {
    const result = run(MOVE_WILL_O_WISP, { ...WOW_TARGET, safeguardUp: true });
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it("all-clear FALLS THROUGH to end at zero with exactly one handler draw", () => {
    const result = run(MOVE_WILL_O_WISP, {
      ...WOW_TARGET,
      species: 171,
      knownAbility: null,
      realAbility: "ABILITY_VOLT_ABSORB",
    });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    expect(result.draws.map((draw) => draw.reason)).toEqual([
      "test-slot-soundproof",
      "test-slot-will-o-wisp-ability",
    ]);
  });
});

const MOVE_SURF = 57;
const MOVE_ROCK_SLIDE = 157;
const MOVE_BODY_SLAM = 34;
const MOVE_THUNDERBOLT = 85;
const MOVE_HAZE = 114; // EFFECT_HAZE -> AI_CBM_Haze
const MOVE_SNORE = 173;
const MOVE_POISON_POWDER = 77; // EFFECT_POISON -> AI_CBM_Toxic
const MOVE_TOXIC = 92; // EFFECT_TOXIC -> AI_CBM_Toxic
const MOVE_STRING_SHOT = 81; // EFFECT_SPEED_DOWN
const MOVE_COTTON_SPORE = 178; // EFFECT_SPEED_DOWN_2 -- same handler, different table entry

/**
 * Canonical probe target for the file's generic-CBM-barrier pins below. A
 * single-ability species with a known, non-negating, non-Soundproof ability
 * (Sturdy) short-circuits every `get_ability` draw, and every still-unported
 * CBM table effect's move is a `MOVE_POWER_OTHER` candidate (power <= 1 or
 * an `IGNORED_POWERFUL_MOVE_EFFECTS` effect), so the preamble's
 * type/ability-negation block is skipped and every such move reaches the
 * `if_effect` dispatch barrier untouched.
 */
const GENERIC_BARRIER_TARGET: FactoryAiCheckBadMoveTarget = Object.freeze({
  species: 213, // SPECIES_SHUCKLE: single ability STURDY
  types: ["TYPE_PSYCHIC", "TYPE_PSYCHIC"] as const,
  knownAbility: "ABILITY_STURDY",
  realAbility: "ABILITY_STURDY",
  speedStage: 6,
  atkStage: 6,
  defStage: 6,
  spDefStage: 6,
});

/**
 * Derives the standing "the generic CBM barrier still fires" example
 * dynamically from the engine's own table/handled sets, so the pins can never
 * again assert an effect the engine has outgrown -- the barring effect was
 * EFFECT_ABSORB, then EFFECT_HAZE, then EFFECT_STOCKPILE, and each port broke
 * the hardcoded pins. Returns `null` when the whole table is ported, which is
 * where AI_CheckBadMove lands at 109/109.
 */
function genericCbmBarrierExample(): Readonly<{ effect: string; moveId: number }> | null {
  for (const effect of unportedCheckBadMoveTableEffects()) {
    const moveId = firstMoveIdWithEffect(effect);
    if (moveId !== undefined) return { effect, moveId };
  }
  return null;
}

/**
 * The assertion shared by every generic-barrier pin in this file. With any
 * effect still unported it picks one dynamically and pins that its move halts
 * with the named `unsupported-branch` barrier; when the unported set is empty
 * (all 109/109 CheckBadMove table effects ported) the honest assertion
 * inverts: every table-listed effect's first reachable move scores instead of
 * halting. Effects with no Gen-3 move cannot reach the dispatcher and are
 * skipped in both directions.
 */
function assertGenericCbmBarrierFires() {
  const example = genericCbmBarrierExample();
  if (example === null) {
    for (const effect of AI_CHECK_BAD_MOVE_TABLE_EFFECTS) {
      const moveId = firstMoveIdWithEffect(effect);
      if (moveId === undefined) continue;
      expect(run(moveId, GENERIC_BARRIER_TARGET)).toMatchObject({ kind: "scored" });
    }
    return;
  }
  expect(run(example.moveId, GENERIC_BARRIER_TARGET)).toEqual({
    kind: "unsupported-branch",
    barrier: "factory-ai-check-bad-move",
    effect: example.effect,
    moveId: example.moveId,
  });
}

function run(
  moveId: number,
  target: FactoryAiCheckBadMoveTarget,
  rngValue = 249_678_687,
  attacker: FactoryAiCheckBadMoveAttacker = NEUTRAL_ATTACKER,
) {
  return runCheckBadMovePreamble({
    rng: { value: rngValue, calls: 0 },
    moveId,
    target,
    attacker,
    drawOrdinalStart: 1,
    reasonPrefix: "test-slot",
  });
}

describe("AI_CheckBadMove universal preamble (docs/factory-ai-ground-truth.md §4 item 2)", () => {
  it("scores a type-immune move -10 with zero get_ability draws (the x0 short-circuit)", () => {
    const result = run(MOVE_THUNDERBOLT, MAROWAK);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
    expect(result.rng.calls).toBe(0);
  });

  it.each([
    ["Surf (EFFECT_HIT)", MOVE_SURF],
    ["Rock Slide (EFFECT_FLINCH_HIT)", MOVE_ROCK_SLIDE],
    ["Body Slam (EFFECT_PARALYZE_HIT)", MOVE_BODY_SLAM],
  ])(
    "draws exactly two uncached get_ability calls and scores 0 for a non-immune, no-table-entry move: %s",
    (_label, moveId) => {
      const result = run(moveId, MAROWAK);
      expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.draws).toHaveLength(2);
      expect(result.draws.map((d) => d.reason)).toEqual([
        "test-slot-negates-type",
        "test-slot-soundproof",
      ]);
      expect(result.rng.calls).toBe(2);
    },
  );

  it("never caches the ability guess: both preamble call sites redraw fresh even with an identical rng value", () => {
    // A synthetic (rngValue, seed) pair chosen so both draws' randomValue happen
    // to be identical is not required here -- what's asserted is structural:
    // two independent Random() calls occur, not a single cached lookup reused
    // twice. rng.calls strictly increases by 1 per draw, and each draw's
    // `before`/`after` differ.
    const result = run(MOVE_SURF, MAROWAK);
    if (result.kind !== "scored") throw new Error("unreachable");
    const [first, second] = result.draws;
    expect(first!.after).toEqual(second!.before);
    expect(first!.before).not.toEqual(second!.before);
  });

  it("skips the redraw entirely once the ability is known (BattleHistory-style cache input)", () => {
    const known: FactoryAiCheckBadMoveTarget = { ...MAROWAK, knownAbility: "ABILITY_ROCK_HEAD" };
    const result = run(MOVE_SURF, known);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("uses the real (not guessed) ability for a trapper species, without drawing", () => {
    const trapper: FactoryAiCheckBadMoveTarget = {
      species: 25, // SPECIES_PIKACHU (single ability, irrelevant -- realAbility short-circuits first)
      types: ["TYPE_ELECTRIC", "TYPE_ELECTRIC"],
      knownAbility: null,
      realAbility: "ABILITY_SHADOW_TAG",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
    };
    const result = run(MOVE_SURF, trapper);
    expect(result).toMatchObject({ kind: "scored" });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("scores -12 when the guessed ability is Volt Absorb and the move is Electric-type", () => {
    const knownVoltAbsorb: FactoryAiCheckBadMoveTarget = {
      species: 171, // SPECIES_LANTURN: Volt Absorb / Water Absorb
      types: ["TYPE_GRASS", "TYPE_GRASS"], // non-immune to Electric, isolates the ability branch
      knownAbility: "ABILITY_VOLT_ABSORB",
      realAbility: "ABILITY_VOLT_ABSORB",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
    };
    const result = run(MOVE_THUNDERBOLT, knownVoltAbsorb);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -12 });
  });

  it("falls through to soundproof (not negated) when the guessed ability doesn't match the move's type", () => {
    const knownWaterAbsorb: FactoryAiCheckBadMoveTarget = {
      species: 171,
      types: ["TYPE_GRASS", "TYPE_GRASS"],
      knownAbility: "ABILITY_WATER_ABSORB",
      realAbility: "ABILITY_WATER_ABSORB",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
    };
    const result = run(MOVE_THUNDERBOLT /* Electric, not Water */, knownWaterAbsorb);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0); // ability already known -> no draws either way
  });

  it("scores -10 for a Wonder Guard target when the considered move isn't x2 effective", () => {
    const wonderGuardTarget: FactoryAiCheckBadMoveTarget = {
      species: 386, // SPECIES_DEOXYS-ish placeholder unused; Wonder Guard is realAbility-independent here
      types: ["TYPE_NORMAL", "TYPE_NORMAL"],
      knownAbility: "ABILITY_WONDER_GUARD",
      realAbility: "ABILITY_WONDER_GUARD",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
    };
    const result = run(MOVE_BODY_SLAM /* Normal vs Normal = 1x, not x2 */, wonderGuardTarget);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it("scores -10 for a Soundproof target on a sound move in the nine-move list", () => {
    const soundproofTarget: FactoryAiCheckBadMoveTarget = {
      species: 1,
      types: ["TYPE_NORMAL", "TYPE_NORMAL"],
      knownAbility: "ABILITY_SOUNDPROOF",
      realAbility: "ABILITY_SOUNDPROOF",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
    };
    const result = run(MOVE_SNORE, soundproofTarget);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it("halts with a named unsupported-branch barrier for a move whose effect has an if_effect table entry", () => {
    // The example is derived dynamically (unportedCheckBadMoveTableEffects),
    // never a hardcoded effect -- porting an effect would otherwise break
    // this pin. When 109/109 effects are ported, `assertGenericCbmBarrierFires`
    // inverts to "no table effect halts the machine any more".
    assertGenericCbmBarrierFires();
  });

  it("reproduces the exact ground-truth Scenario A per-slot draw/score shape (docs/factory-ai-ground-truth.md §4 item 2/§0(2))", () => {
    const slots = [MOVE_SURF, MOVE_ROCK_SLIDE, MOVE_BODY_SLAM, MOVE_THUNDERBOLT];
    let rng = { value: 249_678_687, calls: 0 };
    let totalDraws = 0;
    const scores: number[] = [];
    for (const moveId of slots) {
      const result = runCheckBadMovePreamble({
        rng,
        moveId,
        target: MAROWAK,
        attacker: NEUTRAL_ATTACKER,
        drawOrdinalStart: totalDraws + 1,
        reasonPrefix: `slot-${moveId}`,
      });
      if (result.kind !== "scored") throw new Error(`expected scored, got barrier for move ${moveId}`);
      rng = result.rng;
      totalDraws += result.draws.length;
      scores.push(result.scoreDelta);
    }
    // Surf/RockSlide/BodySlam: 2 draws each (ability-negation + soundproof,
    // neither matches Rock Head/Lightning Rod); Thunderbolt: 0 (x0 short-circuit).
    expect(totalDraws).toBe(6);
    expect(scores).toEqual([0, 0, 0, -10]);
  });
});

describe("AI_CBM_Sleep (docs/factory-ai-checkviability-ground-truth.md §29)", () => {
  const MOVE_SING = 47;

  function target(overrides: Partial<FactoryAiCheckBadMoveTarget> = {}): FactoryAiCheckBadMoveTarget {
    return Object.freeze({
      species: 213,
      types: ["TYPE_BUG", "TYPE_ROCK"] as const,
      knownAbility: "ABILITY_STURDY",
      realAbility: "ABILITY_STURDY",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
      ...overrides,
    });
  }

  it.each([
    ["Insomnia", { knownAbility: "ABILITY_INSOMNIA", realAbility: "ABILITY_INSOMNIA" }],
    ["Vital Spirit", { knownAbility: "ABILITY_VITAL_SPIRIT", realAbility: "ABILITY_VITAL_SPIRIT" }],
    ["any primary status", { hasAnyStatus: true }],
    ["Safeguard", { safeguardUp: true }],
  ])("%s gate JUMPs to Score_Minus10", (_label, overrides) => {
    const result = run(MOVE_SING, target(overrides));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it("all four gates FALL THROUGH to end for an eligible target", () => {
    const result = run(MOVE_SING, target());
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0, draws: [] });
  });

  it("executes the handler's own fresh get_ability after the universal preamble", () => {
    const result = run(MOVE_SING, { ...MAROWAK, hasAnyStatus: true });
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws.map((draw) => draw.reason)).toEqual([
      "test-slot-soundproof",
      "test-slot-sleep-ability",
    ]);
  });

  it("leaves the next unported CBM table effect behind the generic barrier (derived dynamically)", () => {
    assertGenericCbmBarrierFires();
  });
});

describe("AI_CBM_Roar (docs/factory-ai-checkviability-ground-truth.md §30)", () => {
  const MOVE_ROAR = 46;

  function target(overrides: Partial<FactoryAiCheckBadMoveRoarTarget> = {}): FactoryAiCheckBadMoveRoarTarget {
    return Object.freeze({
      species: 213,
      types: ["TYPE_BUG", "TYPE_ROCK"] as const,
      knownAbility: "ABILITY_STURDY",
      realAbility: "ABILITY_STURDY",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
      usablePartyMons: 1,
      ...overrides,
    });
  }

  it("usable-party count 0 JUMPs to Score_Minus10 before the handler ability read", () => {
    const result = run(MOVE_ROAR, target({
      species: 111,
      knownAbility: null,
      realAbility: "ABILITY_LIGHTNING_ROD",
      usablePartyMons: 0,
    }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws.map((draw) => draw.reason)).toEqual(["test-slot-soundproof"]);
  });

  it("positive usable-party count FALLS THROUGH; Suction Cups JUMPs to Score_Minus10", () => {
    const result = run(MOVE_ROAR, target({
      knownAbility: "ABILITY_SUCTION_CUPS",
      realAbility: "ABILITY_SUCTION_CUPS",
    }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10, draws: [] });
  });

  it("positive usable-party count and another ability FALL THROUGH to end", () => {
    expect(run(MOVE_ROAR, target())).toMatchObject({
      kind: "scored",
      scoreDelta: 0,
      draws: [],
    });
  });

  it("executes the handler's fresh get_ability only after the count gate falls through", () => {
    const result = run(MOVE_ROAR, target({
      species: 111,
      knownAbility: null,
      realAbility: "ABILITY_LIGHTNING_ROD",
    }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws.map((draw) => draw.reason)).toEqual([
      "test-slot-soundproof",
      "test-slot-roar-ability",
    ]);
  });

  it("leaves the next unported CBM table effect behind the generic barrier (derived dynamically)", () => {
    assertGenericCbmBarrierFires();
  });
});

describe("AI_CBM_Paralyze (docs/factory-ai-checkviability-ground-truth.md §31)", () => {
  const MOVE_THUNDER_WAVE = 86;

  function target(overrides: Partial<FactoryAiCheckBadMoveTarget> = {}): FactoryAiCheckBadMoveTarget {
    return Object.freeze({
      species: 213,
      types: ["TYPE_BUG", "TYPE_ROCK"] as const,
      knownAbility: "ABILITY_STURDY",
      realAbility: "ABILITY_STURDY",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
      ...overrides,
    });
  }

  it("type immunity JUMPs to Score_Minus10 before the handler ability read", () => {
    const result = run(MOVE_THUNDER_WAVE, {
      ...MAROWAK,
      knownAbility: null,
    });
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws.map((draw) => draw.reason)).toEqual(["test-slot-soundproof"]);
  });

  it("nonimmune type FALLS THROUGH; Limber JUMPs to Score_Minus10", () => {
    expect(run(MOVE_THUNDER_WAVE, target({
      species: 132,
      types: ["TYPE_NORMAL", "TYPE_NORMAL"],
      knownAbility: "ABILITY_LIMBER",
      realAbility: "ABILITY_LIMBER",
    }))).toMatchObject({ kind: "scored", scoreDelta: -10, draws: [] });
  });

  it("pins Cmd_if_type_effectiveness's source no-effect glitch: Ground then Flying FALLS THROUGH at damage 1", () => {
    expect(run(MOVE_THUNDER_WAVE, target({
      types: ["TYPE_GROUND", "TYPE_FLYING"],
    }))).toMatchObject({ kind: "scored", scoreDelta: 0, draws: [] });
  });

  it.each([
    ["any primary status", { hasAnyStatus: true }],
    ["Safeguard", { safeguardUp: true }],
  ])("%s gate JUMPs to Score_Minus10 after the non-Limber ability FALLTHROUGH", (_label, overrides) => {
    expect(run(MOVE_THUNDER_WAVE, target(overrides))).toMatchObject({
      kind: "scored",
      scoreDelta: -10,
      draws: [],
    });
  });

  it("all four gates FALL THROUGH to end for an eligible target", () => {
    expect(run(MOVE_THUNDER_WAVE, target())).toMatchObject({
      kind: "scored",
      scoreDelta: 0,
      draws: [],
    });
  });

  it("executes the handler's own fresh get_ability after the universal preamble", () => {
    const result = run(MOVE_THUNDER_WAVE, {
      ...MAROWAK,
      types: ["TYPE_ROCK", "TYPE_ROCK"],
      hasAnyStatus: true,
    });
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws.map((draw) => draw.reason)).toEqual([
      "test-slot-soundproof",
      "test-slot-paralyze-ability",
    ]);
  });

  it("leaves the next unported CBM table effect behind the generic barrier (derived dynamically)", () => {
    assertGenericCbmBarrierFires();
  });
});

describe("AI_CBM_Confuse (docs/factory-ai-checkviability-ground-truth.md §32)", () => {
  const MOVE_CONFUSE_RAY = 109;

  function target(overrides: Partial<FactoryAiCheckBadMoveTarget> = {}): FactoryAiCheckBadMoveTarget {
    return Object.freeze({
      species: 213,
      types: ["TYPE_BUG", "TYPE_ROCK"] as const,
      knownAbility: "ABILITY_STURDY",
      realAbility: "ABILITY_STURDY",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
      ...overrides,
    });
  }

  it("existing confusion JUMPs to Score_Minus5 before the handler ability read", () => {
    expect(run(MOVE_CONFUSE_RAY, target({ isConfused: true }))).toMatchObject({
      kind: "scored",
      scoreDelta: -5,
      draws: [],
    });
  });

  it("not-confused FALLTHROUGH reaches Own Tempo, which JUMPs to Score_Minus10", () => {
    expect(run(MOVE_CONFUSE_RAY, target({
      knownAbility: "ABILITY_OWN_TEMPO",
      realAbility: "ABILITY_OWN_TEMPO",
    }))).toMatchObject({ kind: "scored", scoreDelta: -10, draws: [] });
  });

  it("non-Own-Tempo FALLTHROUGH reaches Safeguard, which JUMPs to Score_Minus10", () => {
    expect(run(MOVE_CONFUSE_RAY, target({ safeguardUp: true }))).toMatchObject({
      kind: "scored",
      scoreDelta: -10,
      draws: [],
    });
  });

  it("all three gates FALL THROUGH to end for an eligible target", () => {
    expect(run(MOVE_CONFUSE_RAY, target())).toMatchObject({
      kind: "scored",
      scoreDelta: 0,
      draws: [],
    });
  });

  it.each([
    ["Swagger", 207],
    ["Flatter", 260],
  ])("%s's separate dispatch converges on the same source-complete CBM body", (_label, moveId) => {
    expect(run(moveId, target({ isConfused: true }))).toMatchObject({
      kind: "scored",
      scoreDelta: -5,
    });
  });

  it("executes the handler's own fresh get_ability after the universal preamble", () => {
    const result = run(MOVE_CONFUSE_RAY, MAROWAK);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws.map((draw) => draw.reason)).toEqual([
      "test-slot-soundproof",
      "test-slot-confuse-ability",
    ]);
  });

  it("leaves the next unported CBM table effect behind the generic barrier (derived dynamically)", () => {
    assertGenericCbmBarrierFires();
  });
});

describe("AI_CBM_Toxic (data/battle_ai_scripts.s:341-352)", () => {
  const CLEAN_TARGET: FactoryAiCheckBadMoveTarget = Object.freeze({
    species: 213, // Shuckle: single known-by-species Sturdy keeps all handler draws at zero.
    types: ["TYPE_BUG", "TYPE_ROCK"] as const,
    knownAbility: null,
    realAbility: "ABILITY_STURDY",
    speedStage: 6,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
  });

  it.each([
    [["TYPE_STEEL", "TYPE_FLYING"] as const, "type 1 Steel"],
    [["TYPE_NORMAL", "TYPE_POISON"] as const, "type 2 Poison"],
  ])("scores -10 at the source-ordered type gates with no handler draw: %s", (types, _label) => {
    const result = run(MOVE_TOXIC, { ...MAROWAK, types, knownAbility: "ABILITY_ROCK_HEAD" });
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("scores -10 for Immunity after the type gates", () => {
    const result = run(MOVE_TOXIC, {
      ...CLEAN_TARGET,
      knownAbility: "ABILITY_IMMUNITY",
      realAbility: "ABILITY_IMMUNITY",
    });
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it.each([
    [{ hasAnyStatus: true }, "STATUS1_ANY"],
    [{ safeguardUp: true }, "SIDE_STATUS_SAFEGUARD"],
  ])("scores -10 at the final source gates: %s", (patch, _label) => {
    const result = run(MOVE_TOXIC, { ...CLEAN_TARGET, ...patch });
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it.each([
    [MOVE_TOXIC, "EFFECT_TOXIC"],
    [MOVE_POISON_POWDER, "EFFECT_POISON"],
  ])("ports both table entries sharing the clean AI_CBM_Toxic end: move %i %s", (moveId) => {
    const result = run(moveId, CLEAN_TARGET);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
  });

  it("keeps the handler get_ability after Soundproof and before the status gate", () => {
    const result = run(MOVE_TOXIC, { ...MAROWAK, hasAnyStatus: true });
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws.map(({ reason }) => reason)).toEqual([
      "test-slot-soundproof",
      "test-slot-toxic-immunity",
    ]);
    expect(result.rng.calls).toBe(2);
  });
});

// data/battle_ai_scripts.s:287-312, docs/factory-ai-checkviability-ground-truth.md's
// proven CBM+CV pair (§6 is the CV half; this is the CBM half).
describe("AI_CBM_SpeedDown + CheckIfAbilityBlocksStatChange (docs/factory-ai-checkviability-ground-truth.md §6)", () => {
  // Marowak's own realAbility is ambiguous (Rock Head / Lightning Rod, two
  // distinct abilities) -- it still draws once for the universal preamble's
  // OWN soundproof guess regardless of this handler, so the "zero total
  // draws" claim below needs a single-ability target (Shuckle, this doc's
  // own §6 fixture species) to isolate the SpeedDown branch's own zero-RNG
  // MIN_STAT_STAGE short-circuit cleanly.
  const SHUCKLE: FactoryAiCheckBadMoveTarget = Object.freeze({
    species: 213,
    types: ["TYPE_BUG", "TYPE_ROCK"] as const,
    knownAbility: null,
    realAbility: "ABILITY_STURDY",
    speedStage: 6,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
  });

  it("scores -10 with zero draws when the target's Speed stage is already MIN_STAT_STAGE", () => {
    const atMinSpeed: FactoryAiCheckBadMoveTarget = { ...SHUCKLE, speedStage: 0 };
    const result = run(MOVE_STRING_SHOT, atMinSpeed);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("EFFECT_SPEED_DOWN_2 hits the identical MIN_STAT_STAGE short-circuit", () => {
    const atMinSpeed: FactoryAiCheckBadMoveTarget = { ...SHUCKLE, speedStage: 0 };
    const result = run(MOVE_COTTON_SPORE, atMinSpeed);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("scores -10 with zero draws for a Speed Boost target (if_ability, zero-RNG check_ability, not a get_ability guess)", () => {
    const speedBoost: FactoryAiCheckBadMoveTarget = {
      species: 302, // SPECIES_NINJASK: Speed Boost is its only ability
      types: ["TYPE_BUG", "TYPE_FLYING"],
      knownAbility: null,
      realAbility: "ABILITY_SPEED_BOOST",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
    };
    const result = run(MOVE_STRING_SHOT, speedBoost);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("if_ability's own quirk: an UNKNOWN two-ability target never registers a check_ability match, even when one of its two abilities is the one being asked about", () => {
    // SPECIES_YANMA: Speed Boost / Compound Eyes, both unobserved -- real
    // source behavior (Cmd_check_ability's abilityDummyVariable branch) is
    // that check_ability can never return true for such a target, so the
    // MIN_STAT_STAGE/Speed-Boost short-circuits both miss and the shared
    // CheckIfAbilityBlocksStatChange tail's own get_ability guess runs.
    const ambiguousSpeedBoost: FactoryAiCheckBadMoveTarget = {
      species: 193,
      types: ["TYPE_BUG", "TYPE_FLYING"],
      knownAbility: null,
      realAbility: "ABILITY_SPEED_BOOST",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
    };
    const result = run(MOVE_STRING_SHOT, ambiguousSpeedBoost);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    // One draw for the universal preamble's own soundproof guess, one for
    // CheckIfAbilityBlocksStatChange's get_ability guess -- neither can ever
    // land on Clear Body/White Smoke for this species, so scoreDelta stays 0
    // regardless of the coin flip, but both draws are real.
    expect(result.draws).toHaveLength(2);
  });

  it("scores -10 when CheckIfAbilityBlocksStatChange's get_ability guess is Clear Body (known ability, zero draws)", () => {
    const knownClearBody: FactoryAiCheckBadMoveTarget = {
      species: 72, // SPECIES_TENTACOOL: Clear Body / Liquid Ooze
      types: ["TYPE_WATER", "TYPE_POISON"],
      knownAbility: "ABILITY_CLEAR_BODY",
      realAbility: "ABILITY_CLEAR_BODY",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
    };
    const result = run(MOVE_STRING_SHOT, knownClearBody);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("scores -10 when CheckIfAbilityBlocksStatChange's get_ability guess is White Smoke (known ability, zero draws)", () => {
    const knownWhiteSmoke: FactoryAiCheckBadMoveTarget = {
      species: 321, // SPECIES_TORKOAL: White Smoke is its only ability
      types: ["TYPE_FIRE", "TYPE_FIRE"],
      knownAbility: "ABILITY_WHITE_SMOKE",
      realAbility: "ABILITY_WHITE_SMOKE",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
    };
    const result = run(MOVE_STRING_SHOT, knownWhiteSmoke);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("still barriers every other reachable CBM handler untouched by this narrowing (pass-through, derived dynamically)", () => {
    assertGenericCbmBarrierFires();
  });
});

// data/battle_ai_scripts.s:277-281,308-312, docs/factory-ai-checkviability-ground-truth.md
// §14.1: the first CBM-blocked pair's own CBM half (this is the CBM side;
// AI_CV_AttackDown, the CV side, is in factoryAiCheckViability.test.ts).
describe("AI_CBM_AttackDown + CheckIfAbilityBlocksStatChange (docs/factory-ai-checkviability-ground-truth.md §14.1)", () => {
  const MOVE_GROWL = 45; // EFFECT_ATTACK_DOWN
  const MOVE_CHARM = 204; // EFFECT_ATTACK_DOWN_2 -- same handler, different table entry

  // Single-ability species so both draw sites' free-guess path is exercised
  // without a confound (doc §14.2's own porter guidance).
  const PINSIR: FactoryAiCheckBadMoveTarget = Object.freeze({
    species: 127, // Hyper Cutter is its only ability
    types: ["TYPE_BUG", "TYPE_BUG"] as const,
    knownAbility: null,
    realAbility: "ABILITY_HYPER_CUTTER",
    speedStage: 6,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
  });
  const SHUCKLE: FactoryAiCheckBadMoveTarget = Object.freeze({
    species: 213,
    types: ["TYPE_BUG", "TYPE_ROCK"] as const,
    knownAbility: null,
    realAbility: "ABILITY_STURDY",
    speedStage: 6,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
  });

  it("scores -10 with zero draws when the target's ATK stage is already MIN_STAT_STAGE", () => {
    const atMinAtk: FactoryAiCheckBadMoveTarget = { ...SHUCKLE, atkStage: 0 };
    const result = run(MOVE_GROWL, atMinAtk);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("EFFECT_ATTACK_DOWN_2 hits the identical MIN_STAT_STAGE short-circuit", () => {
    const atMinAtk: FactoryAiCheckBadMoveTarget = { ...SHUCKLE, atkStage: 0 };
    const result = run(MOVE_CHARM, atMinAtk);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("scores -10 with zero draws for a single-ability Hyper Cutter target (get_ability's own free guess, the first of the handler's two draw sites)", () => {
    const result = run(MOVE_GROWL, PINSIR);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("scores -10 with zero draws when Hyper Cutter is the known (BattleHistory-cached) ability", () => {
    const known: FactoryAiCheckBadMoveTarget = { ...PINSIR, knownAbility: "ABILITY_HYPER_CUTTER" };
    const result = run(MOVE_GROWL, known);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("an ambiguous two-ability target (neither ability is Hyper Cutter, Clear Body, or White Smoke) draws exactly three times -- the universal preamble's own soundproof guess, plus once per AttackDown draw site -- and scores 0", () => {
    // SPECIES_YANMA: Speed Boost / Compound Eyes, both unobserved -- neither
    // can ever land on Soundproof (universal preamble), Hyper Cutter (first
    // AttackDown draw site), or Clear Body/White Smoke (shared-tail second
    // draw site). Growl is 0-power (MOVE_POWER_OTHER), so the preamble's own
    // type-negation ability guess is skipped -- only its soundproof guess
    // draws, same convention the SpeedDown tests already established for why
    // Marowak (also ambiguous) can't isolate a handler's own draw count.
    const ambiguous: FactoryAiCheckBadMoveTarget = {
      species: 193,
      types: ["TYPE_BUG", "TYPE_FLYING"],
      knownAbility: null,
      realAbility: "ABILITY_SPEED_BOOST",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
    };
    const result = run(MOVE_GROWL, ambiguous);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(3);
    expect(result.draws.map((d) => d.reason)).toEqual([
      "test-slot-soundproof",
      "test-slot-attack-down-hyper-cutter",
      "test-slot-attack-down-shared-tail",
    ]);
  });

  it("scores -10 when the shared tail's known ability is Clear Body, zero draws (second draw site, known-ability short-circuit)", () => {
    const knownClearBody: FactoryAiCheckBadMoveTarget = {
      species: 72, // SPECIES_TENTACOOL: Clear Body / Liquid Ooze
      types: ["TYPE_WATER", "TYPE_POISON"],
      knownAbility: "ABILITY_CLEAR_BODY",
      realAbility: "ABILITY_CLEAR_BODY",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
    };
    const result = run(MOVE_GROWL, knownClearBody);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("scores -10 with zero draws for a single-ability White Smoke target (second draw site's own free guess)", () => {
    const whiteSmoke: FactoryAiCheckBadMoveTarget = {
      species: 321, // SPECIES_TORKOAL: White Smoke is its only ability
      types: ["TYPE_FIRE", "TYPE_FIRE"],
      knownAbility: null,
      realAbility: "ABILITY_WHITE_SMOKE",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
    };
    const result = run(MOVE_GROWL, whiteSmoke);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("still barriers every other reachable CBM handler untouched by this narrowing (pass-through, derived dynamically)", () => {
    assertGenericCbmBarrierFires();
  });
});

// data/battle_ai_scripts.s:283-285,308-312, docs/factory-ai-checkviability-ground-truth.md
// §15.1: the second CBM-blocked pair's own CBM half (this is the CBM side;
// AI_CV_DefenseDown, the CV side, is in factoryAiCheckViability.test.ts).
// Unlike AI_CBM_AttackDown, this handler has no intervening get_ability call
// of its own before the shared tail -- just a bare MIN_STAT_STAGE gate then
// a direct goto -- so the shared tail's own get_ability fires at most once.
describe("AI_CBM_DefenseDown + CheckIfAbilityBlocksStatChange (docs/factory-ai-checkviability-ground-truth.md §15.1)", () => {
  const MOVE_TAIL_WHIP = 39; // EFFECT_DEFENSE_DOWN
  const MOVE_SCREECH = 103; // EFFECT_DEFENSE_DOWN_2 -- same handler, different table entry

  const SHUCKLE: FactoryAiCheckBadMoveTarget = Object.freeze({
    species: 213,
    types: ["TYPE_BUG", "TYPE_ROCK"] as const,
    knownAbility: null,
    realAbility: "ABILITY_STURDY",
    speedStage: 6,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
  });

  it("scores -10 with zero draws when the target's DEF stage is already MIN_STAT_STAGE", () => {
    const atMinDef: FactoryAiCheckBadMoveTarget = { ...SHUCKLE, defStage: 0 };
    const result = run(MOVE_TAIL_WHIP, atMinDef);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("EFFECT_DEFENSE_DOWN_2 hits the identical MIN_STAT_STAGE short-circuit", () => {
    const atMinDef: FactoryAiCheckBadMoveTarget = { ...SHUCKLE, defStage: 0 };
    const result = run(MOVE_SCREECH, atMinDef);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("an ambiguous two-ability target (neither ability is Clear Body nor White Smoke) draws exactly twice -- the universal preamble's own soundproof guess, plus the shared tail's own -- and scores 0", () => {
    // SPECIES_YANMA: Speed Boost / Compound Eyes, both unobserved -- Tail
    // Whip is 0-power (MOVE_POWER_OTHER), so the preamble's own type-negation
    // ability guess is skipped, same convention the AttackDown block already
    // established.
    const ambiguous: FactoryAiCheckBadMoveTarget = {
      species: 193,
      types: ["TYPE_BUG", "TYPE_FLYING"],
      knownAbility: null,
      realAbility: "ABILITY_SPEED_BOOST",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
    };
    const result = run(MOVE_TAIL_WHIP, ambiguous);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(2);
    expect(result.draws.map((d) => d.reason)).toEqual([
      "test-slot-soundproof",
      "test-slot-defense-down-shared-tail",
    ]);
  });

  it("scores -10 when the shared tail's known ability is Clear Body, zero draws", () => {
    const knownClearBody: FactoryAiCheckBadMoveTarget = {
      species: 72, // SPECIES_TENTACOOL: Clear Body / Liquid Ooze
      types: ["TYPE_WATER", "TYPE_POISON"],
      knownAbility: "ABILITY_CLEAR_BODY",
      realAbility: "ABILITY_CLEAR_BODY",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
    };
    const result = run(MOVE_TAIL_WHIP, knownClearBody);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("scores -10 with zero draws for a single-ability White Smoke target (shared tail's own free guess)", () => {
    const whiteSmoke: FactoryAiCheckBadMoveTarget = {
      species: 321, // SPECIES_TORKOAL: White Smoke is its only ability
      types: ["TYPE_FIRE", "TYPE_FIRE"],
      knownAbility: null,
      realAbility: "ABILITY_WHITE_SMOKE",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
    };
    const result = run(MOVE_TAIL_WHIP, whiteSmoke);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });
});

// data/battle_ai_scripts.s:296-298,308-312, docs/factory-ai-checkviability-ground-truth.md
// §16.1: the third CBM-blocked pair's own CBM half -- byte-for-byte the same
// shape as AI_CBM_DefenseDown above with STAT_SPDEF swapped for STAT_DEF.
// EFFECT_SPECIAL_DEFENSE_DOWN itself is unused by any real move (doc §16.2),
// so every test here dispatches via the _2 table entry; MOVE_FAKE_TEARS (not
// MOVE_METAL_SOUND, which is in the Soundproof nine-move list) keeps the
// universal preamble's own soundproof guess from confounding the handler's
// own scoreDelta.
describe("AI_CBM_SpDefDown + CheckIfAbilityBlocksStatChange (docs/factory-ai-checkviability-ground-truth.md §16.1)", () => {
  const MOVE_FAKE_TEARS = 313; // EFFECT_SPECIAL_DEFENSE_DOWN_2
  const MOVE_METAL_SOUND = 319; // EFFECT_SPECIAL_DEFENSE_DOWN_2 -- same handler, different table entry (also Soundproof-blocked)

  const SHUCKLE: FactoryAiCheckBadMoveTarget = Object.freeze({
    species: 213,
    types: ["TYPE_BUG", "TYPE_ROCK"] as const,
    knownAbility: null,
    realAbility: "ABILITY_STURDY",
    speedStage: 6,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
  });

  it("scores -10 with zero draws when the target's SPDEF stage is already MIN_STAT_STAGE", () => {
    const atMinSpDef: FactoryAiCheckBadMoveTarget = { ...SHUCKLE, spDefStage: 0 };
    const result = run(MOVE_FAKE_TEARS, atMinSpDef);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("MOVE_METAL_SOUND dispatches to the identical handler (both are EFFECT_SPECIAL_DEFENSE_DOWN_2)", () => {
    const atMinSpDef: FactoryAiCheckBadMoveTarget = { ...SHUCKLE, spDefStage: 0 };
    const result = run(MOVE_METAL_SOUND, atMinSpDef);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("an ambiguous two-ability target (neither ability is Clear Body nor White Smoke) draws exactly twice -- the universal preamble's own soundproof guess, plus the shared tail's own -- and scores 0", () => {
    const ambiguous: FactoryAiCheckBadMoveTarget = {
      species: 193,
      types: ["TYPE_BUG", "TYPE_FLYING"],
      knownAbility: null,
      realAbility: "ABILITY_SPEED_BOOST",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
    };
    const result = run(MOVE_FAKE_TEARS, ambiguous);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(2);
    expect(result.draws.map((d) => d.reason)).toEqual([
      "test-slot-soundproof",
      "test-slot-sp-def-down-shared-tail",
    ]);
  });

  it("scores -10 when the shared tail's known ability is Clear Body, zero draws", () => {
    const knownClearBody: FactoryAiCheckBadMoveTarget = {
      species: 72, // SPECIES_TENTACOOL: Clear Body / Liquid Ooze
      types: ["TYPE_WATER", "TYPE_POISON"],
      knownAbility: "ABILITY_CLEAR_BODY",
      realAbility: "ABILITY_CLEAR_BODY",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
    };
    const result = run(MOVE_FAKE_TEARS, knownClearBody);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("scores -10 with zero draws for a single-ability White Smoke target (shared tail's own free guess)", () => {
    const whiteSmoke: FactoryAiCheckBadMoveTarget = {
      species: 321, // SPECIES_TORKOAL: White Smoke is its only ability
      types: ["TYPE_FIRE", "TYPE_FIRE"],
      knownAbility: null,
      realAbility: "ABILITY_WHITE_SMOKE",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
    };
    const result = run(MOVE_FAKE_TEARS, whiteSmoke);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });
});

// data/battle_ai_scripts.s:249-251/253-255/581-584,
// docs/factory-ai-checkviability-ground-truth.md §17.1/§18.1. Unlike every
// stat-DOWN CBM handler above, these three read AI_USER's OWN ATK/DEF stat
// stage (the ATTACKER, not the target) and never call get_ability at all --
// a bare MAX_STAT_STAGE gate, no shared CheckIfAbilityBlocksStatChange tail.
describe("AI_CBM_AttackUp / AI_CBM_DefenseUp / AI_CBM_BulkUp (docs/factory-ai-checkviability-ground-truth.md §17.1/§18.1)", () => {
  const MOVE_MEDITATE = 96; // EFFECT_ATTACK_UP
  const MOVE_SWORDS_DANCE = 14; // EFFECT_ATTACK_UP_2 -- same handler, different table entry
  const MOVE_HARDEN = 106; // EFFECT_DEFENSE_UP
  const MOVE_ACID_ARMOR = 151; // EFFECT_DEFENSE_UP_2 -- same handler, different table entry
  const MOVE_DEFENSE_CURL = 111; // EFFECT_DEFENSE_CURL -- also routes to AI_CBM_DefenseUp, CBM-only (doc §18.1)
  const MOVE_BULK_UP = 339; // EFFECT_BULK_UP -- separate handler, CBM side only

  // Single-ability (Sturdy) target: the universal preamble's own soundproof
  // guess (still run for every move, including these 0-power stat-up moves)
  // costs zero real draws here, isolating each handler's own zero-RNG gate.
  const SHUCKLE: FactoryAiCheckBadMoveTarget = Object.freeze({
    species: 213,
    types: ["TYPE_BUG", "TYPE_ROCK"] as const,
    knownAbility: null,
    realAbility: "ABILITY_STURDY",
    speedStage: 6,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
  });

  function withAttacker(atkStage: number, defStage: number): FactoryAiCheckBadMoveAttacker {
    return Object.freeze({ atkStage, defStage });
  }

  it.each([
    ["Meditate (EFFECT_ATTACK_UP)", MOVE_MEDITATE],
    ["Swords Dance (EFFECT_ATTACK_UP_2)", MOVE_SWORDS_DANCE],
  ])("AI_CBM_AttackUp: %s scores -10 with zero draws when AI_USER's own ATK stage is already MAX_STAT_STAGE (12)", (_label, moveId) => {
    const result = run(moveId, SHUCKLE, undefined, withAttacker(12, 6));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it.each([11, 6, 0])("AI_CBM_AttackUp: scores 0 with zero draws when AI_USER's own ATK stage is %i (not maxed)", (atkStage) => {
    const result = run(MOVE_MEDITATE, SHUCKLE, undefined, withAttacker(atkStage, 6));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it.each([
    ["Harden (EFFECT_DEFENSE_UP)", MOVE_HARDEN],
    ["Acid Armor (EFFECT_DEFENSE_UP_2)", MOVE_ACID_ARMOR],
    ["Defense Curl (EFFECT_DEFENSE_CURL, CBM-only dispatch)", MOVE_DEFENSE_CURL],
  ])("AI_CBM_DefenseUp: %s scores -10 with zero draws when AI_USER's own DEF stage is already MAX_STAT_STAGE (12)", (_label, moveId) => {
    const result = run(moveId, SHUCKLE, undefined, withAttacker(6, 12));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("AI_CBM_DefenseUp: scores 0 with zero draws when AI_USER's own DEF stage is not maxed", () => {
    const result = run(MOVE_HARDEN, SHUCKLE, undefined, withAttacker(6, 6));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("AI_CBM_BulkUp: scores -18 (both gates fire independently, -10 + -8) when both ATK and DEF are already MAX_STAT_STAGE", () => {
    const result = run(MOVE_BULK_UP, SHUCKLE, undefined, withAttacker(12, 12));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -18 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("AI_CBM_BulkUp: scores -10 (only the ATK gate fires) when ATK is maxed but DEF is not", () => {
    const result = run(MOVE_BULK_UP, SHUCKLE, undefined, withAttacker(12, 6));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it("AI_CBM_BulkUp: scores -8 (only the DEF gate fires) when DEF is maxed but ATK is not", () => {
    const result = run(MOVE_BULK_UP, SHUCKLE, undefined, withAttacker(6, 12));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -8 });
  });

  it("AI_CBM_BulkUp: scores 0 when neither ATK nor DEF is maxed", () => {
    const result = run(MOVE_BULK_UP, SHUCKLE, undefined, withAttacker(6, 6));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });
});

// data/battle_ai_scripts.s:164,434-437: AI_CBM_Curse is byte-for-byte the
// same dual-stat body as AI_CBM_BulkUp (AI_USER's own ATK -10 then DEF -8),
// so it reuses runCbmBulkUp unchanged. Reached from EFFECT_CURSE.
describe("AI_CBM_Curse (data/battle_ai_scripts.s:434-437, BulkUp-identical body)", () => {
  const MOVE_CURSE = 174; // EFFECT_CURSE

  const SHUCKLE: FactoryAiCheckBadMoveTarget = Object.freeze({
    species: 213,
    types: ["TYPE_BUG", "TYPE_ROCK"] as const,
    knownAbility: null,
    realAbility: "ABILITY_STURDY",
    speedStage: 6,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
  });

  function withAttacker(atkStage: number, defStage: number): FactoryAiCheckBadMoveAttacker {
    return Object.freeze({ atkStage, defStage });
  }

  it("scores -18 (both gates fire independently, -10 + -8) when both ATK and DEF are already MAX_STAT_STAGE", () => {
    const result = run(MOVE_CURSE, SHUCKLE, undefined, withAttacker(12, 12));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -18 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("scores -10 (only the ATK gate fires) when ATK is maxed but DEF is not", () => {
    const result = run(MOVE_CURSE, SHUCKLE, undefined, withAttacker(12, 6));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it("scores -8 (only the DEF gate fires) when DEF is maxed but ATK is not", () => {
    const result = run(MOVE_CURSE, SHUCKLE, undefined, withAttacker(6, 12));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -8 });
  });

  it("scores 0 with zero draws when neither ATK nor DEF is maxed", () => {
    const result = run(MOVE_CURSE, SHUCKLE, undefined, withAttacker(6, 6));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("leaves the next unported CBM table effect behind the generic barrier (derived dynamically)", () => {
    assertGenericCbmBarrierFires();
  });
});

// data/battle_ai_scripts.s:257-259/261-263,
// docs/factory-ai-checkviability-ground-truth.md §20.1/§21.1. Byte-for-byte
// the same bare MAX_STAT_STAGE-on-AI_USER's-own-stage shape as
// AI_CBM_AttackUp/AI_CBM_DefenseUp above, with STAT_SPEED/STAT_SPATK
// swapped in -- zero get_ability calls, no shared tail.
describe("AI_CBM_SpeedUp / AI_CBM_SpAtkUp (docs/factory-ai-checkviability-ground-truth.md §20.1/§21.1)", () => {
  const MOVE_AGILITY = 97; // EFFECT_SPEED_UP_2 -- EFFECT_SPEED_UP itself has no real move (like EFFECT_ACCURACY_DOWN_2)
  const MOVE_GROWTH = 74; // EFFECT_SPECIAL_ATTACK_UP
  const MOVE_TAIL_GLOW = 294; // EFFECT_SPECIAL_ATTACK_UP_2 -- same handler, different table entry

  // Single-ability (Sturdy) target, same species/rationale as the
  // AttackUp/DefenseUp/BulkUp block's own SHUCKLE above (out of scope here,
  // this describe block's own sibling) -- isolates each handler's own
  // zero-RNG gate from the universal soundproof preamble's get_ability draw.
  const SHUCKLE: FactoryAiCheckBadMoveTarget = Object.freeze({
    species: 213,
    types: ["TYPE_BUG", "TYPE_ROCK"] as const,
    knownAbility: null,
    realAbility: "ABILITY_STURDY",
    speedStage: 6,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
  });

  function withSpeedAttacker(speedStage: number): FactoryAiCheckBadMoveAttacker {
    return Object.freeze({ atkStage: 6, defStage: 6, speedStage });
  }
  function withSpAtkAttacker(spAtkStage: number): FactoryAiCheckBadMoveAttacker {
    return Object.freeze({ atkStage: 6, defStage: 6, spAtkStage });
  }

  it("AI_CBM_SpeedUp: Agility (EFFECT_SPEED_UP_2) scores -10 with zero draws when AI_USER's own SPEED stage is already MAX_STAT_STAGE (12)", () => {
    const result = run(MOVE_AGILITY, SHUCKLE, undefined, withSpeedAttacker(12));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it.each([11, 6, 0])("AI_CBM_SpeedUp: scores 0 with zero draws when AI_USER's own SPEED stage is %i (not maxed)", (speedStage) => {
    const result = run(MOVE_AGILITY, SHUCKLE, undefined, withSpeedAttacker(speedStage));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("AI_CBM_SpeedUp: omitted speedStage defaults to DEFAULT_STAT_STAGE (6, not maxed) -- scores 0", () => {
    const result = run(MOVE_AGILITY, SHUCKLE, undefined, Object.freeze({ atkStage: 6, defStage: 6 }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
  });

  it.each([
    ["Growth (EFFECT_SPECIAL_ATTACK_UP)", MOVE_GROWTH],
    ["Tail Glow (EFFECT_SPECIAL_ATTACK_UP_2)", MOVE_TAIL_GLOW],
  ])("AI_CBM_SpAtkUp: %s scores -10 with zero draws when AI_USER's own SPATK stage is already MAX_STAT_STAGE (12)", (_label, moveId) => {
    const result = run(moveId, SHUCKLE, undefined, withSpAtkAttacker(12));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it.each([11, 6, 0])("AI_CBM_SpAtkUp: scores 0 with zero draws when AI_USER's own SPATK stage is %i (not maxed)", (spAtkStage) => {
    const result = run(MOVE_GROWTH, SHUCKLE, undefined, withSpAtkAttacker(spAtkStage));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("AI_CBM_SpAtkUp: omitted spAtkStage defaults to DEFAULT_STAT_STAGE (6, not maxed) -- scores 0", () => {
    const result = run(MOVE_GROWTH, SHUCKLE, undefined, Object.freeze({ atkStage: 6, defStage: 6 }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
  });
});

// data/battle_ai_scripts.s:265-267, docs/factory-ai-checkviability-ground-
// truth.md §28. Byte-for-byte the same bare MAX_STAT_STAGE-on-AI_USER gate
// as AttackUp/SpeedUp/SpAtkUp. The CV half is the already-ported shared
// AI_CV_SpDefUp body (§22), so these tests close the remaining CBM branch.
describe("AI_CBM_SpDefUp (docs/factory-ai-checkviability-ground-truth.md §28)", () => {
  const MOVE_AMNESIA = 133; // EFFECT_SPECIAL_DEFENSE_UP_2

  const SHUCKLE: FactoryAiCheckBadMoveTarget = Object.freeze({
    species: 213,
    types: ["TYPE_BUG", "TYPE_ROCK"] as const,
    knownAbility: null,
    realAbility: "ABILITY_STURDY",
    speedStage: 6,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
  });

  it("JUMP applies Score_Minus10 with zero draws when AI_USER's own SPDEF stage equals MAX_STAT_STAGE", () => {
    const result = run(
      MOVE_AMNESIA,
      SHUCKLE,
      undefined,
      Object.freeze({ atkStage: 6, defStage: 6, spDefStage: 12 }),
    );
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it.each([11, 6, 0])("FALLTHROUGH reaches end and skips Score_Minus10 with zero draws when AI_USER's own SPDEF stage is %i", (spDefStage) => {
    const result = run(
      MOVE_AMNESIA,
      SHUCKLE,
      undefined,
      Object.freeze({ atkStage: 6, defStage: 6, spDefStage }),
    );
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("omitted spDefStage defaults to DEFAULT_STAT_STAGE and the next unported table effect still reaches the generic barrier", () => {
    const amnesia = run(MOVE_AMNESIA, SHUCKLE);
    expect(amnesia).toMatchObject({ kind: "scored", scoreDelta: 0 });

    assertGenericCbmBarrierFires();
  });
});
// data/battle_ai_scripts.s:576-579/590-593, docs/factory-ai-checkviability-ground-truth.md
// §22.1: the ninth CBM-blocked pair's own CBM half -- unlike every stat-UP
// handler above, TWO SEPARATE dual-stat handlers (the AI_CBM_BulkUp/
// AI_CBM_DragonDance shape, §18.1), each independently checking both stats
// its own move raises (-10 first stat, -8 second), not aliases of each
// other or of AI_CBM_DefenseUp/AI_CBM_SpAtkUp/AI_CBM_SpDefUp.
describe("AI_CBM_CosmicPower / AI_CBM_CalmMind (docs/factory-ai-checkviability-ground-truth.md §22.1)", () => {
  const MOVE_COSMIC_POWER = 322; // EFFECT_COSMIC_POWER
  const MOVE_CALM_MIND = 347; // EFFECT_CALM_MIND

  // Single-ability (Sturdy) target, same species/rationale as the
  // AttackUp/DefenseUp/BulkUp/SpeedUp/SpAtkUp blocks' own SHUCKLE above.
  const SHUCKLE: FactoryAiCheckBadMoveTarget = Object.freeze({
    species: 213,
    types: ["TYPE_BUG", "TYPE_ROCK"] as const,
    knownAbility: null,
    realAbility: "ABILITY_STURDY",
    speedStage: 6,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
  });

  function withCosmicPowerAttacker(defStage: number, spDefStage: number): FactoryAiCheckBadMoveAttacker {
    return Object.freeze({ atkStage: 6, defStage, spDefStage });
  }
  function withCalmMindAttacker(spAtkStage: number, spDefStage: number): FactoryAiCheckBadMoveAttacker {
    return Object.freeze({ atkStage: 6, defStage: 6, spAtkStage, spDefStage });
  }

  it("AI_CBM_CosmicPower: scores -18 (both gates fire independently, -10 + -8) when both DEF and SPDEF are already MAX_STAT_STAGE", () => {
    const result = run(MOVE_COSMIC_POWER, SHUCKLE, undefined, withCosmicPowerAttacker(12, 12));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -18 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("AI_CBM_CosmicPower: scores -10 (only the DEF gate fires) when DEF is maxed but SPDEF is not", () => {
    const result = run(MOVE_COSMIC_POWER, SHUCKLE, undefined, withCosmicPowerAttacker(12, 6));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it("AI_CBM_CosmicPower: scores -8 (only the SPDEF gate fires) when SPDEF is maxed but DEF is not", () => {
    const result = run(MOVE_COSMIC_POWER, SHUCKLE, undefined, withCosmicPowerAttacker(6, 12));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -8 });
  });

  it("AI_CBM_CosmicPower: scores 0 with zero draws when neither DEF nor SPDEF is maxed", () => {
    const result = run(MOVE_COSMIC_POWER, SHUCKLE, undefined, withCosmicPowerAttacker(6, 6));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("AI_CBM_CosmicPower: omitted spDefStage defaults to DEFAULT_STAT_STAGE (6, not maxed) -- DEF-only gate still fires", () => {
    const result = run(MOVE_COSMIC_POWER, SHUCKLE, undefined, Object.freeze({ atkStage: 6, defStage: 12 }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it("AI_CBM_CalmMind: scores -18 (both gates fire independently, -10 + -8) when both SPATK and SPDEF are already MAX_STAT_STAGE", () => {
    const result = run(MOVE_CALM_MIND, SHUCKLE, undefined, withCalmMindAttacker(12, 12));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -18 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("AI_CBM_CalmMind: scores -10 (only the SPATK gate fires) when SPATK is maxed but SPDEF is not", () => {
    const result = run(MOVE_CALM_MIND, SHUCKLE, undefined, withCalmMindAttacker(12, 6));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it("AI_CBM_CalmMind: scores -8 (only the SPDEF gate fires) when SPDEF is maxed but SPATK is not", () => {
    const result = run(MOVE_CALM_MIND, SHUCKLE, undefined, withCalmMindAttacker(6, 12));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -8 });
  });

  it("AI_CBM_CalmMind: scores 0 with zero draws when neither SPATK nor SPDEF is maxed", () => {
    const result = run(MOVE_CALM_MIND, SHUCKLE, undefined, withCalmMindAttacker(6, 6));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("AI_CBM_CalmMind: omitted spAtkStage/spDefStage both default to DEFAULT_STAT_STAGE (6, not maxed) -- scores 0", () => {
    const result = run(MOVE_CALM_MIND, SHUCKLE, undefined, Object.freeze({ atkStage: 6, defStage: 6 }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
  });
});

// data/battle_ai_scripts.s:595-598, docs/factory-ai-checkviability-ground-truth.md
// §33.1: the same dual-stat shape as AI_CBM_BulkUp/AI_CBM_CalmMind above
// (ATK -10 first, SPEED -8 second), reached from EFFECT_DRAGON_DANCE
// (dispatch :213).
describe("AI_CBM_DragonDance (docs/factory-ai-checkviability-ground-truth.md §33.1)", () => {
  const MOVE_DRAGON_DANCE = 349; // EFFECT_DRAGON_DANCE

  const SHUCKLE: FactoryAiCheckBadMoveTarget = Object.freeze({
    species: 213,
    types: ["TYPE_BUG", "TYPE_ROCK"] as const,
    knownAbility: null,
    realAbility: "ABILITY_STURDY",
    speedStage: 6,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
  });

  it("scores -18 (both gates fire independently, -10 + -8) when both ATK and SPEED are already MAX_STAT_STAGE", () => {
    const result = run(
      MOVE_DRAGON_DANCE,
      SHUCKLE,
      undefined,
      Object.freeze({ atkStage: 12, defStage: 6, speedStage: 12 }),
    );
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -18 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("scores -10 (only the ATK gate fires) when ATK is maxed but SPEED is not", () => {
    const result = run(
      MOVE_DRAGON_DANCE,
      SHUCKLE,
      undefined,
      Object.freeze({ atkStage: 12, defStage: 6, speedStage: 6 }),
    );
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it("scores -8 (only the SPEED gate fires) when SPEED is maxed but ATK is not", () => {
    const result = run(
      MOVE_DRAGON_DANCE,
      SHUCKLE,
      undefined,
      Object.freeze({ atkStage: 6, defStage: 6, speedStage: 12 }),
    );
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -8 });
  });

  it("scores 0 with zero draws when neither ATK nor SPEED is maxed", () => {
    const result = run(
      MOVE_DRAGON_DANCE,
      SHUCKLE,
      undefined,
      Object.freeze({ atkStage: 6, defStage: 6, speedStage: 6 }),
    );
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("omitted speedStage defaults to DEFAULT_STAT_STAGE (6, not maxed) -- ATK-only gate still fires", () => {
    const result = run(
      MOVE_DRAGON_DANCE,
      SHUCKLE,
      undefined,
      Object.freeze({ atkStage: 12, defStage: 6 }),
    );
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });
});

// data/battle_ai_scripts.s:300-312, docs/factory-ai-checkviability-ground-truth.md
// §19.1: the sixth CBM-blocked pair's own CBM half (this is the CBM side;
// AI_CV_AccuracyDown, the CV side, is in factoryAiCheckViability.test.ts).
// Unlike AI_CBM_DefenseDown/SpDefDown (bare MIN_STAT_STAGE gate, direct goto),
// this handler has its own extra ABILITY_KEEN_EYE get_ability call first --
// the same two-draw-site shape AI_CBM_AttackDown already established for
// Hyper Cutter.
describe("AI_CBM_AccDown + CheckIfAbilityBlocksStatChange (docs/factory-ai-checkviability-ground-truth.md §19.1)", () => {
  const MOVE_SAND_ATTACK = 28; // EFFECT_ACCURACY_DOWN

  // Single-ability species so both draw sites' free-guess path is exercised
  // without a confound (doc §14.2's own porter guidance, reused here).
  const PIDGEOTTO: FactoryAiCheckBadMoveTarget = Object.freeze({
    species: 17, // SPECIES_PIDGEOTTO: Keen Eye is its only ability
    types: ["TYPE_NORMAL", "TYPE_FLYING"] as const,
    knownAbility: null,
    realAbility: "ABILITY_KEEN_EYE",
    speedStage: 6,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
    accStage: 6,
  });
  const SHUCKLE: FactoryAiCheckBadMoveTarget = Object.freeze({
    species: 213,
    types: ["TYPE_BUG", "TYPE_ROCK"] as const,
    knownAbility: null,
    realAbility: "ABILITY_STURDY",
    speedStage: 6,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
    accStage: 6,
  });

  it("scores -10 with zero draws when the target's ACC stage is already MIN_STAT_STAGE", () => {
    const atMinAcc: FactoryAiCheckBadMoveTarget = { ...SHUCKLE, accStage: 0 };
    const result = run(MOVE_SAND_ATTACK, atMinAcc);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("defaults an omitted accStage to DEFAULT_STAT_STAGE (6), not MIN_STAT_STAGE -- doesn't short-circuit", () => {
    const { accStage: _omit, ...withoutAccStage } = SHUCKLE;
    const result = run(MOVE_SAND_ATTACK, withoutAccStage as FactoryAiCheckBadMoveTarget);
    // Sturdy is neither Keen Eye nor Clear Body/White Smoke -- falls through
    // both draw sites to score 0, proving the gate did NOT fire at MIN.
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
  });

  it("scores -10 with zero draws for a single-ability Keen Eye target (get_ability's own free guess, the first of the handler's two draw sites)", () => {
    const result = run(MOVE_SAND_ATTACK, PIDGEOTTO);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("scores -10 with zero draws when Keen Eye is the known (BattleHistory-cached) ability", () => {
    const known: FactoryAiCheckBadMoveTarget = { ...PIDGEOTTO, knownAbility: "ABILITY_KEEN_EYE" };
    const result = run(MOVE_SAND_ATTACK, known);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("an ambiguous two-ability target (neither ability is Keen Eye, Clear Body, or White Smoke) draws exactly three times -- the universal preamble's own soundproof guess, plus once per AccDown draw site -- and scores 0", () => {
    // SPECIES_YANMA: Speed Boost / Compound Eyes, both unobserved -- neither
    // can ever land on Soundproof (universal preamble), Keen Eye (first
    // AccDown draw site), or Clear Body/White Smoke (shared-tail second
    // draw site). Sand Attack is 0-power (MOVE_POWER_OTHER), so the
    // preamble's own type-negation ability guess is skipped -- only its
    // soundproof guess draws, same convention the AttackDown block already
    // established.
    const ambiguous: FactoryAiCheckBadMoveTarget = {
      species: 193,
      types: ["TYPE_BUG", "TYPE_FLYING"],
      knownAbility: null,
      realAbility: "ABILITY_SPEED_BOOST",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
      accStage: 6,
    };
    const result = run(MOVE_SAND_ATTACK, ambiguous);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(3);
    expect(result.draws.map((d) => d.reason)).toEqual([
      "test-slot-soundproof",
      "test-slot-acc-down-keen-eye",
      "test-slot-acc-down-shared-tail",
    ]);
  });

  it("scores -10 when the shared tail's known ability is Clear Body, zero draws (second draw site, known-ability short-circuit)", () => {
    const knownClearBody: FactoryAiCheckBadMoveTarget = {
      species: 72, // SPECIES_TENTACOOL: Clear Body / Liquid Ooze
      types: ["TYPE_WATER", "TYPE_POISON"],
      knownAbility: "ABILITY_CLEAR_BODY",
      realAbility: "ABILITY_CLEAR_BODY",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
      accStage: 6,
    };
    const result = run(MOVE_SAND_ATTACK, knownClearBody);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("scores -10 with zero draws for a single-ability White Smoke target (second draw site's own free guess)", () => {
    const whiteSmoke: FactoryAiCheckBadMoveTarget = {
      species: 321, // SPECIES_TORKOAL: White Smoke is its only ability
      types: ["TYPE_FIRE", "TYPE_FIRE"],
      knownAbility: null,
      realAbility: "ABILITY_WHITE_SMOKE",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
      accStage: 6,
    };
    const result = run(MOVE_SAND_ATTACK, whiteSmoke);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("still barriers every other reachable CBM handler untouched by this narrowing (pass-through, derived dynamically)", () => {
    assertGenericCbmBarrierFires();
  });

  it("EFFECT_ACCURACY_DOWN_2 is a vestigial constant with zero real moves (doc §19.1) -- not independently testable through a real move ID, confirmed absent from the generated move table", () => {
    expect([...MOVES_BY_ID.values()].some((m) => m.effect === "EFFECT_ACCURACY_DOWN_2")).toBe(false);
  });
});

// data/battle_ai_scripts.s:354-356/393-395, docs/factory-ai-checkviability-ground-truth.md
// §23.1: the tenth CBM-blocked pair's own CBM half -- the smallest CBM
// handler shape in this doc to date, a single AI_USER-own-side-status bit
// test with zero stat-stage read and zero get_ability call.
describe("AI_CBM_LightScreen / AI_CBM_Reflect (docs/factory-ai-checkviability-ground-truth.md §23.1)", () => {
  const MOVE_LIGHT_SCREEN = 113; // EFFECT_LIGHT_SCREEN
  const MOVE_REFLECT = 115; // EFFECT_REFLECT

  // Single-ability (Sturdy) target, same species/rationale as the
  // AttackUp/DefenseUp/BulkUp/SpeedUp/SpAtkUp/CosmicPower/CalmMind blocks'
  // own SHUCKLE above.
  const SHUCKLE: FactoryAiCheckBadMoveTarget = Object.freeze({
    species: 213,
    types: ["TYPE_BUG", "TYPE_ROCK"] as const,
    knownAbility: null,
    realAbility: "ABILITY_STURDY",
    speedStage: 6,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
  });

  it("AI_CBM_LightScreen: scores -8 when AI_USER's own light screen is up", () => {
    const result = run(MOVE_LIGHT_SCREEN, SHUCKLE, undefined, Object.freeze({ atkStage: 6, defStage: 6, lightScreenUp: true }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -8 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("AI_CBM_LightScreen: scores 0 with zero draws when AI_USER's own light screen is not up", () => {
    const result = run(MOVE_LIGHT_SCREEN, SHUCKLE, undefined, Object.freeze({ atkStage: 6, defStage: 6, lightScreenUp: false }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("AI_CBM_LightScreen: omitted lightScreenUp defaults to false (not up) -- scores 0", () => {
    const result = run(MOVE_LIGHT_SCREEN, SHUCKLE, undefined, Object.freeze({ atkStage: 6, defStage: 6 }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
  });

  it("AI_CBM_LightScreen: AI_USER's own reflectUp is irrelevant to this gate (distinct SIDE_STATUS_* bits)", () => {
    const result = run(MOVE_LIGHT_SCREEN, SHUCKLE, undefined, Object.freeze({ atkStage: 6, defStage: 6, reflectUp: true }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
  });

  it("AI_CBM_Reflect: scores -8 when AI_USER's own reflect is up", () => {
    const result = run(MOVE_REFLECT, SHUCKLE, undefined, Object.freeze({ atkStage: 6, defStage: 6, reflectUp: true }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -8 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("AI_CBM_Reflect: scores 0 with zero draws when AI_USER's own reflect is not up", () => {
    const result = run(MOVE_REFLECT, SHUCKLE, undefined, Object.freeze({ atkStage: 6, defStage: 6, reflectUp: false }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("AI_CBM_Reflect: omitted reflectUp defaults to false (not up) -- scores 0", () => {
    const result = run(MOVE_REFLECT, SHUCKLE, undefined, Object.freeze({ atkStage: 6, defStage: 6 }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
  });

  it("AI_CBM_Reflect: AI_USER's own lightScreenUp is irrelevant to this gate (distinct SIDE_STATUS_* bits)", () => {
    const result = run(MOVE_REFLECT, SHUCKLE, undefined, Object.freeze({ atkStage: 6, defStage: 6, lightScreenUp: true }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
  });
});

// data/battle_ai_scripts.s:273-275, docs/factory-ai-checkviability-ground-truth.md
// §24.1: the eleventh CBM-blocked pair's own CBM half -- byte-for-byte the
// same bare 2-instruction MAX_STAT_STAGE-on-AI_USER's-own-stage shape as
// AI_CBM_AttackUp/DefenseUp/SpeedUp/SpAtkUp with STAT_EVASION swapped in.
describe("AI_CBM_EvasionUp (docs/factory-ai-checkviability-ground-truth.md §24.1)", () => {
  const MOVE_DOUBLE_TEAM = 104; // EFFECT_EVASION_UP
  const MOVE_MINIMIZE = 107; // EFFECT_MINIMIZE -- shares this same single-stat handler

  // Single-ability (Sturdy) target, same rationale as the AttackUp/DefenseUp/
  // BulkUp block's own SHUCKLE above -- isolates the zero-RNG gate from the
  // universal preamble's own soundproof guess.
  const SHUCKLE: FactoryAiCheckBadMoveTarget = Object.freeze({
    species: 213,
    types: ["TYPE_BUG", "TYPE_ROCK"] as const,
    knownAbility: null,
    realAbility: "ABILITY_STURDY",
    speedStage: 6,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
  });

  function withEvasionAttacker(evasionStage: number): FactoryAiCheckBadMoveAttacker {
    return Object.freeze({ atkStage: 6, defStage: 6, evasionStage });
  }

  it.each([
    ["Double Team (EFFECT_EVASION_UP)", MOVE_DOUBLE_TEAM],
    ["Minimize (EFFECT_MINIMIZE, shares this same handler per doc §24.1/§24.7)", MOVE_MINIMIZE],
  ])("%s scores -10 with zero draws when AI_USER's own EVASION stage is already MAX_STAT_STAGE (12)", (_label, moveId) => {
    const result = run(moveId, SHUCKLE, undefined, withEvasionAttacker(12));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it.each([11, 7, 6, 0])("scores 0 with zero draws when AI_USER's own EVASION stage is %i (not maxed)", (evasionStage) => {
    const result = run(MOVE_DOUBLE_TEAM, SHUCKLE, undefined, withEvasionAttacker(evasionStage));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("omitted evasionStage defaults to DEFAULT_STAT_STAGE (6), not MAX_STAT_STAGE -- scores 0", () => {
    const result = run(MOVE_DOUBLE_TEAM, SHUCKLE, undefined, Object.freeze({ atkStage: 6, defStage: 6 }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
  });

  it("EFFECT_EVASION_UP_2 is a vestigial constant with zero real moves (doc §24.7) -- not independently testable through a real move ID, confirmed absent from the generated move table", () => {
    expect([...MOVES_BY_ID.values()].some((m) => m.effect === "EFFECT_EVASION_UP_2")).toBe(false);
  });
});

// data/battle_ai_scripts.s:306-312, docs/factory-ai-checkviability-ground-truth.md
// §24.1: the eleventh CBM-blocked pair's other CBM half -- the same bare
// MIN_STAT_STAGE-gate-plus-shared-tail shape AI_CBM_DefenseDown/SpDefDown
// already established (no own-ability short-circuit like AttackDown/AccDown's
// Hyper Cutter/Keen Eye -- no dedicated evasion-immunity ability in Gen 3).
describe("AI_CBM_EvasionDown + CheckIfAbilityBlocksStatChange (docs/factory-ai-checkviability-ground-truth.md §24.1)", () => {
  const MOVE_SWEET_SCENT = 230; // EFFECT_EVASION_DOWN

  const SHUCKLE: FactoryAiCheckBadMoveTarget = Object.freeze({
    species: 213,
    types: ["TYPE_BUG", "TYPE_ROCK"] as const,
    knownAbility: null,
    realAbility: "ABILITY_STURDY",
    speedStage: 6,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
    evasionStage: 6,
  });

  it("scores -10 with zero draws when the target's EVASION stage is already MIN_STAT_STAGE", () => {
    const atMinEvasion: FactoryAiCheckBadMoveTarget = { ...SHUCKLE, evasionStage: 0 };
    const result = run(MOVE_SWEET_SCENT, atMinEvasion);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("defaults an omitted evasionStage to DEFAULT_STAT_STAGE (6), not MIN_STAT_STAGE -- doesn't short-circuit", () => {
    const { evasionStage: _omit, ...withoutEvasionStage } = SHUCKLE;
    const result = run(MOVE_SWEET_SCENT, withoutEvasionStage as FactoryAiCheckBadMoveTarget);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
  });

  it("an ambiguous two-ability target (neither ability is Clear Body nor White Smoke) draws exactly twice -- the universal preamble's own soundproof guess, plus the shared tail's own -- and scores 0", () => {
    const ambiguous: FactoryAiCheckBadMoveTarget = {
      species: 193,
      types: ["TYPE_BUG", "TYPE_FLYING"],
      knownAbility: null,
      realAbility: "ABILITY_SPEED_BOOST",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
      evasionStage: 6,
    };
    const result = run(MOVE_SWEET_SCENT, ambiguous);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(2);
    expect(result.draws.map((d) => d.reason)).toEqual([
      "test-slot-soundproof",
      "test-slot-evasion-down-shared-tail",
    ]);
  });

  it("scores -10 when the shared tail's known ability is Clear Body, zero draws", () => {
    const knownClearBody: FactoryAiCheckBadMoveTarget = {
      species: 72, // SPECIES_TENTACOOL: Clear Body / Liquid Ooze
      types: ["TYPE_WATER", "TYPE_POISON"],
      knownAbility: "ABILITY_CLEAR_BODY",
      realAbility: "ABILITY_CLEAR_BODY",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
      evasionStage: 6,
    };
    const result = run(MOVE_SWEET_SCENT, knownClearBody);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("scores -10 with zero draws for a single-ability White Smoke target (shared tail's own free guess)", () => {
    const whiteSmoke: FactoryAiCheckBadMoveTarget = {
      species: 321, // SPECIES_TORKOAL: White Smoke is its only ability
      types: ["TYPE_FIRE", "TYPE_FIRE"],
      knownAbility: null,
      realAbility: "ABILITY_WHITE_SMOKE",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
      evasionStage: 6,
    };
    const result = run(MOVE_SWEET_SCENT, whiteSmoke);
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("EFFECT_EVASION_DOWN_2 is a vestigial constant with zero real moves (doc §24.7) -- not independently testable through a real move ID, confirmed absent from the generated move table", () => {
    expect([...MOVES_BY_ID.values()].some((m) => m.effect === "EFFECT_EVASION_DOWN_2")).toBe(false);
  });

  it("still barriers every other reachable CBM handler untouched by this narrowing (pass-through, derived dynamically)", () => {
    assertGenericCbmBarrierFires();
  });
});

// data/battle_ai_scripts.s:490-493/:495-498/:522-525, docs/factory-ai-
// checkviability-ground-truth.md §25.1: the twelfth and final CBM-blocked
// pair's own CBM third -- three separately named dispatch targets, but
// byte-for-byte identical 3-instruction bodies (`get_weather; if_equal
// <OWN>, Score_Minus8; end`). Zero get_ability/stat-stage reads at all, so
// the SHUCKLE target above (irrelevant to this handler) still works fine.
describe("AI_CBM_RainDance / AI_CBM_SunnyDay / AI_CBM_Hail (docs/factory-ai-checkviability-ground-truth.md §25.1)", () => {
  const MOVE_RAIN_DANCE = 240;
  const MOVE_SUNNY_DAY = 241;
  const MOVE_HAIL = 258;

  const SHUCKLE: FactoryAiCheckBadMoveTarget = Object.freeze({
    species: 213,
    types: ["TYPE_BUG", "TYPE_ROCK"] as const,
    knownAbility: null,
    realAbility: "ABILITY_STURDY",
    speedStage: 6,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
  });

  function withWeather(currentWeather: 0 | 1 | 2 | 3 | undefined): FactoryAiCheckBadMoveAttacker {
    return Object.freeze({ atkStage: 6, defStage: 6, currentWeather });
  }

  it.each([
    ["AI_CBM_RainDance", MOVE_RAIN_DANCE, 1 as const],
    ["AI_CBM_SunnyDay", MOVE_SUNNY_DAY, 0 as const],
    ["AI_CBM_Hail", MOVE_HAIL, 3 as const],
  ])("%s scores -8 with zero draws when current weather already equals the move's own type", (_label, moveId, ownWeather) => {
    const result = run(moveId, SHUCKLE, undefined, withWeather(ownWeather));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -8 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it.each([
    ["AI_CBM_RainDance", MOVE_RAIN_DANCE, 1 as const],
    ["AI_CBM_SunnyDay", MOVE_SUNNY_DAY, 0 as const],
    ["AI_CBM_Hail", MOVE_HAIL, 3 as const],
  ])("%s scores 0 when current weather is a DIFFERENT weather (cross-weather irrelevance)", (_label, moveId, ownWeather) => {
    // Pick any weather constant that isn't this handler's own.
    const other = ([0, 1, 2, 3] as const).find((w) => w !== ownWeather)!;
    const result = run(moveId, SHUCKLE, undefined, withWeather(other));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
  });

  it.each([
    ["AI_CBM_RainDance", MOVE_RAIN_DANCE],
    ["AI_CBM_SunnyDay", MOVE_SUNNY_DAY],
    ["AI_CBM_Hail", MOVE_HAIL],
  ])("%s scores 0 with zero draws when currentWeather is omitted (no weather bit set)", (_label, moveId) => {
    const result = run(moveId, SHUCKLE, undefined, withWeather(undefined));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("the three bodies are byte-for-byte identical shape (doc §25.1) -- confirmed by cross-handler parity: RainDance under Sun scores the same as SunnyDay under Sun would under RainDance's own constant swapped in", () => {
    // RainDance's own weather (Rain=1) does nothing to SunnyDay (own weather Sun=0);
    // conversely Sun does nothing to RainDance. Parity check: swapping the
    // move AND the weather together reproduces the -8/0 split symmetrically.
    const rainUnderRain = run(MOVE_RAIN_DANCE, SHUCKLE, undefined, withWeather(1));
    const sunnyUnderSun = run(MOVE_SUNNY_DAY, SHUCKLE, undefined, withWeather(0));
    const hailUnderHail = run(MOVE_HAIL, SHUCKLE, undefined, withWeather(3));
    expect(rainUnderRain).toMatchObject({ kind: "scored", scoreDelta: -8 });
    expect(sunnyUnderSun).toMatchObject({ kind: "scored", scoreDelta: -8 });
    expect(hailUnderHail).toMatchObject({ kind: "scored", scoreDelta: -8 });
  });

  // `get_weather`'s own stale-`funcResult` bug, Channel 1 (ground truth doc
  // §25.10.1/.3, ISSUES #47): on a genuinely weatherless dispatch
  // (currentWeather === undefined), get_weather reads whatever the universal
  // preamble's own get_ability AI_TARGET call (the soundproof check, same
  // script, same slot) left behind -- the target's real ability ID, not a
  // clean "no weather" sentinel. Mechanism-level cases below force a specific
  // ability via `knownAbility` (bypassing species lookup, zero draws either
  // way) to cover all four IDs the AI_WEATHER_* range can ever collide with
  // (0-3); the species-level cases after that reproduce §25.10.2's own two
  // live fixtures verbatim (Ninjask id 3, Anorith id 4).
  describe("get_weather's own stale-funcResult bug, Channel 1: universal preamble's get_ability AI_TARGET leaks into a weatherless read (doc §25.10)", () => {
    function knownAbilityTarget(knownAbility: string): FactoryAiCheckBadMoveTarget {
      return { ...SHUCKLE, knownAbility };
    }

    it.each([
      ["AI_CBM_SunnyDay", MOVE_SUNNY_DAY, "ABILITY_NONE"], // id 0 == AI_WEATHER_SUN
      ["AI_CBM_RainDance", MOVE_RAIN_DANCE, "ABILITY_STENCH"], // id 1 == AI_WEATHER_RAIN
      ["AI_CBM_Hail", MOVE_HAIL, "ABILITY_SPEED_BOOST"], // id 3 == AI_WEATHER_HAIL
    ])("%s scores -8 with zero draws when weatherless and the target's ability ID collides with its own weather constant", (_label, moveId, knownAbility) => {
      const result = run(moveId, knownAbilityTarget(knownAbility), undefined, withWeather(undefined));
      expect(result).toMatchObject({ kind: "scored", scoreDelta: -8 });
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.draws).toHaveLength(0);
    });

    it.each([
      ["AI_CBM_RainDance", MOVE_RAIN_DANCE],
      ["AI_CBM_SunnyDay", MOVE_SUNNY_DAY],
      ["AI_CBM_Hail", MOVE_HAIL],
    ])("%s stays 0 when weatherless and the target's ability ID (2, Drizzle) collides with none of the three CBM handlers' own constant (Sandstorm is never a CBM-checked type)", (_label, moveId) => {
      const result = run(moveId, knownAbilityTarget("ABILITY_DRIZZLE"), undefined, withWeather(undefined));
      expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    });

    it("AI_CBM_Hail stays 0 when weatherless and the target's colliding ability ID belongs to a DIFFERENT handler's own constant (id 1 == Rain, not Hail)", () => {
      const result = run(MOVE_HAIL, knownAbilityTarget("ABILITY_STENCH"), undefined, withWeather(undefined));
      expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    });

    // Real Factory-reachable species, reproducing §25.10.2's own two live
    // fixtures' CBM-side contribution exactly (both single-ability species,
    // so nextGetAbilityDraw's own species lookup returns ability0 directly,
    // zero draws -- no `knownAbility` override needed).
    const NINJASK: FactoryAiCheckBadMoveTarget = Object.freeze({
      species: 302,
      types: ["TYPE_BUG", "TYPE_FLYING"] as const,
      knownAbility: null,
      realAbility: "ABILITY_SPEED_BOOST",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
    });
    const ANORITH: FactoryAiCheckBadMoveTarget = Object.freeze({
      species: 390,
      types: ["TYPE_ROCK", "TYPE_BUG"] as const,
      knownAbility: null,
      realAbility: "ABILITY_BATTLE_ARMOR",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
    });

    it("`hail-staleweather-collision` (doc §25.10.2): Ninjask (Speed Boost, id 3) weatherless -- AI_CBM_Hail scores -8 with zero draws, the collision's own CBM contribution to the ROM's live net -7", () => {
      const result = run(MOVE_HAIL, NINJASK, undefined, withWeather(undefined));
      expect(result).toMatchObject({ kind: "scored", scoreDelta: -8 });
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.draws).toHaveLength(0);
    });

    it.each([
      ["AI_CBM_RainDance", MOVE_RAIN_DANCE],
      ["AI_CBM_SunnyDay", MOVE_SUNNY_DAY],
    ])("%s stays 0 for the same weatherless Ninjask target -- the collision is Hail-specific (id 3 matches only AI_WEATHER_HAIL)", (_label, moveId) => {
      const result = run(moveId, NINJASK, undefined, withWeather(undefined));
      expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    });

    it("`hail-staleweather-control` (doc §25.10.2): Anorith (Battle Armor, id 4) weatherless -- outside the 0-3 collision range, AI_CBM_Hail stays 0, silencing this channel so the ROM's live net +1 is Channel 2 alone", () => {
      const result = run(MOVE_HAIL, ANORITH, undefined, withWeather(undefined));
      expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
      if (result.kind !== "scored") throw new Error("unreachable");
      expect(result.draws).toHaveLength(0);
    });

    it("a genuinely set weather always wins over the stale ability read, even for a colliding-ID target (Ninjask, id 3) -- the clean path is untouched", () => {
      const realRain = run(MOVE_RAIN_DANCE, NINJASK, undefined, withWeather(1));
      const realSandstormAgainstHail = run(MOVE_HAIL, NINJASK, undefined, withWeather(2));
      expect(realRain).toMatchObject({ kind: "scored", scoreDelta: -8 }); // real weather == RainDance's own type
      expect(realSandstormAgainstHail).toMatchObject({ kind: "scored", scoreDelta: 0 }); // real weather != Hail's own type
    });
  });
});

// data/battle_ai_scripts.s:168,451-454: AI_CBM_Sandstorm -- the weather
// trio's sibling fourth, byte-for-byte the same 3-instruction body with
// AI_WEATHER_SANDSTORM (id 2) swapped in. Same stale-`funcResult` channel:
// ability id 2 (ABILITY_DRIZZLE) collides with AI_WEATHER_SANDSTORM on a
// weatherless read.
describe("AI_CBM_Sandstorm (data/battle_ai_scripts.s:451-454)", () => {
  const MOVE_SANDSTORM = 201;

  const SHUCKLE: FactoryAiCheckBadMoveTarget = Object.freeze({
    species: 213,
    types: ["TYPE_BUG", "TYPE_ROCK"] as const,
    knownAbility: null,
    realAbility: "ABILITY_STURDY",
    speedStage: 6,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
  });

  function withWeather(currentWeather: 0 | 1 | 2 | 3 | undefined): FactoryAiCheckBadMoveAttacker {
    return Object.freeze({ atkStage: 6, defStage: 6, currentWeather });
  }

  it("scores -8 with zero draws when current weather is already Sandstorm", () => {
    const result = run(MOVE_SANDSTORM, SHUCKLE, undefined, withWeather(2));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -8 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("scores 0 when current weather is a DIFFERENT weather", () => {
    const result = run(MOVE_SANDSTORM, SHUCKLE, undefined, withWeather(1));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
  });

  it("scores 0 with zero draws when currentWeather is omitted (no weather bit set)", () => {
    const result = run(MOVE_SANDSTORM, SHUCKLE, undefined, withWeather(undefined));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("scores -8 with zero draws when weatherless and the target's ability ID collides with AI_WEATHER_SANDSTORM (id 2 = Drizzle)", () => {
    const result = run(MOVE_SANDSTORM, { ...SHUCKLE, knownAbility: "ABILITY_DRIZZLE" }, undefined, withWeather(undefined));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -8 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("stays 0 when weatherless and the target's colliding ability ID belongs to a DIFFERENT handler's own constant (id 1 == Rain, not Sandstorm)", () => {
    const result = run(MOVE_SANDSTORM, { ...SHUCKLE, knownAbility: "ABILITY_STENCH" }, undefined, withWeather(undefined));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
  });

  it("a genuinely set weather always wins over the stale ability read, even for a colliding-ID target", () => {
    const realRain = run(MOVE_SANDSTORM, { ...SHUCKLE, knownAbility: "ABILITY_DRIZZLE" }, undefined, withWeather(1));
    expect(realRain).toMatchObject({ kind: "scored", scoreDelta: 0 }); // real weather != Sandstorm
  });
});

describe("AI_CBM_TrickAndKnockOff (data/battle_ai_scripts.s:545-548, EFFECT_KNOCK_OFF/EFFECT_TRICK)", () => {
  const MOVE_KNOCK_OFF = 282;
  const MOVE_TRICK = 271;

  function target(overrides: Partial<FactoryAiCheckBadMoveTarget> = {}): FactoryAiCheckBadMoveTarget {
    return Object.freeze({
      species: 213,
      types: ["TYPE_BUG", "TYPE_ROCK"] as const,
      knownAbility: "ABILITY_STURDY",
      realAbility: "ABILITY_STURDY",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
      ...overrides,
    });
  }

  it("target with Sticky Hold JUMPs to Score_Minus10", () => {
    const result = run(MOVE_KNOCK_OFF, target({ knownAbility: "ABILITY_STICKY_HOLD", realAbility: "ABILITY_STICKY_HOLD" }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("non-Sticky-Hold target FALLS THROUGH to end at zero", () => {
    const result = run(MOVE_KNOCK_OFF, target());
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0, draws: [] });
  });

  it("executes the handler's own fresh get_ability after the universal preamble", () => {
    const result = run(MOVE_KNOCK_OFF, { ...MAROWAK, species: 111, realAbility: "ABILITY_LIGHTNING_ROD" });
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws.map((draw) => draw.reason)).toEqual([
      "test-slot-negates-type",
      "test-slot-soundproof",
      "test-slot-trick-and-knock-off-ability",
    ]);
  });

  it("shares the handler with EFFECT_TRICK (dispatch :198)", () => {
    expect(run(MOVE_TRICK, target({ knownAbility: "ABILITY_STICKY_HOLD", realAbility: "ABILITY_STICKY_HOLD" })))
      .toMatchObject({ kind: "scored", scoreDelta: -10 });
    expect(run(MOVE_TRICK, target())).toMatchObject({ kind: "scored", scoreDelta: 0 });
  });
});

describe("AI_CBM_Safeguard (data/battle_ai_scripts.s:478-480, EFFECT_SAFEGUARD)", () => {
  const MOVE_SAFEGUARD = 219;

  function target(overrides: Partial<FactoryAiCheckBadMoveTarget> = {}): FactoryAiCheckBadMoveTarget {
    return Object.freeze({
      species: 213,
      types: ["TYPE_BUG", "TYPE_ROCK"] as const,
      knownAbility: "ABILITY_STURDY",
      realAbility: "ABILITY_STURDY",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
      ...overrides,
    });
  }

  function attacker(overrides: Partial<FactoryAiCheckBadMoveAttacker> = {}): FactoryAiCheckBadMoveAttacker {
    return Object.freeze({ ...NEUTRAL_ATTACKER, ...overrides });
  }

  it("AI's own Safeguard bit up JUMPs to Score_Minus8", () => {
    const result = run(MOVE_SAFEGUARD, target(), undefined, attacker({ safeguardUp: true }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -8, draws: [] });
  });

  it("no Safeguard on AI's own side FALLS THROUGH to end at zero", () => {
    expect(run(MOVE_SAFEGUARD, target(), undefined, attacker())).toMatchObject({
      kind: "scored",
      scoreDelta: 0,
      draws: [],
    });
  });

  it("zero-draw: no ability read anywhere (MOVE_POWER_OTHER skips the preamble's type reads)", () => {
    const result = run(MOVE_SAFEGUARD, target({ knownAbility: null }), undefined, attacker());
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0); // species 213 has a single ability -- no soundproof guess draw
  });
});

describe("AI_CBM_DamageDuringSleep (data/battle_ai_scripts.s:426-428, EFFECT_SNORE/EFFECT_SLEEP_TALK)", () => {
  const MOVE_SLEEP_TALK = 214;
  const MOVE_SNORE = 173;

  function target(overrides: Partial<FactoryAiCheckBadMoveTarget> = {}): FactoryAiCheckBadMoveTarget {
    return Object.freeze({
      species: 213,
      types: ["TYPE_BUG", "TYPE_ROCK"] as const,
      knownAbility: "ABILITY_STURDY",
      realAbility: "ABILITY_STURDY",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
      ...overrides,
    });
  }

  function attacker(overrides: Partial<FactoryAiCheckBadMoveAttacker> = {}): FactoryAiCheckBadMoveAttacker {
    return Object.freeze({ ...NEUTRAL_ATTACKER, ...overrides });
  }

  it("user NOT asleep JUMPs to Score_Minus8", () => {
    const result = run(MOVE_SLEEP_TALK, target(), undefined, attacker());
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -8, draws: [] });
  });

  it("user asleep FALLS THROUGH to end at zero", () => {
    expect(run(MOVE_SLEEP_TALK, target(), undefined, attacker({ isAsleep: true }))).toMatchObject({
      kind: "scored",
      scoreDelta: 0,
      draws: [],
    });
  });

  it("shares the handler with EFFECT_SNORE (dispatch :158)", () => {
    expect(run(MOVE_SNORE, target(), undefined, attacker())).toMatchObject({ kind: "scored", scoreDelta: -8 });
    expect(run(MOVE_SNORE, target(), undefined, attacker({ isAsleep: true }))).toMatchObject({ kind: "scored", scoreDelta: 0 });
  });
});

describe("AI_CBM_Explosion (data/battle_ai_scripts.s:224-235, EFFECT_EXPLOSION)", () => {
  const MOVE_SELF_DESTRUCT = 120;
  const MOVE_EXPLOSION = 153;

  function target(overrides: Partial<FactoryAiCheckBadMoveRoarTarget> = {}): FactoryAiCheckBadMoveRoarTarget {
    return Object.freeze({
      species: 213,
      types: ["TYPE_BUG", "TYPE_ROCK"] as const,
      knownAbility: "ABILITY_STURDY",
      realAbility: "ABILITY_STURDY",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
      usablePartyMons: 1,
      ...overrides,
    });
  }

  function attacker(overrides: Partial<FactoryAiCheckBadMoveAttacker> = {}): FactoryAiCheckBadMoveAttacker {
    return Object.freeze({ ...NEUTRAL_ATTACKER, usablePartyMons: 1, ...overrides });
  }

  it("x0 effectiveness JUMPs to Score_Minus10 before the handler ability read", () => {
    const result = run(MOVE_EXPLOSION, target({ types: ["TYPE_GHOST", "TYPE_GHOST"] as const }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("Damp JUMPs to Score_Minus10 after the fresh ability read", () => {
    const result = run(MOVE_EXPLOSION, target({ knownAbility: "ABILITY_DAMP", realAbility: "ABILITY_DAMP" }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10, draws: [] });
  });

  it("AI_USER still has usable party mons: FALLS THROUGH to end at zero", () => {
    expect(run(MOVE_EXPLOSION, target(), undefined, attacker())).toMatchObject({
      kind: "scored",
      scoreDelta: 0,
      draws: [],
    });
  });

  it("AI_USER at last mon, AI_TARGET still has reserves: Score_Minus10", () => {
    const result = run(MOVE_EXPLOSION, target(), undefined, attacker({ usablePartyMons: 0 }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it("both sides at last mon: goto Score_Minus1", () => {
    const result = run(
      MOVE_EXPLOSION,
      target({ usablePartyMons: 0 }),
      undefined,
      attacker({ usablePartyMons: 0 }),
    );
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -1 });
  });

  it("dispatches both table entries (EFFECT_EXPLOSION): Selfdestruct", () => {
    expect(run(MOVE_SELF_DESTRUCT, target(), undefined, attacker())).toMatchObject({ kind: "scored", scoreDelta: 0 });
    expect(run(MOVE_SELF_DESTRUCT, target(), undefined, attacker({ usablePartyMons: 0 })))
      .toMatchObject({ kind: "scored", scoreDelta: -10 });
  });
});

describe("AI_CBM_BatonPass (data/battle_ai_scripts.s:485-488, EFFECT_BATON_PASS)", () => {
  const MOVE_BATON_PASS = 226;

  function target(overrides: Partial<FactoryAiCheckBadMoveTarget> = {}): FactoryAiCheckBadMoveTarget {
    return Object.freeze({
      species: 213,
      types: ["TYPE_BUG", "TYPE_ROCK"] as const,
      knownAbility: "ABILITY_STURDY",
      realAbility: "ABILITY_STURDY",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
      ...overrides,
    });
  }

  function attacker(overrides: Partial<FactoryAiCheckBadMoveAttacker> = {}): FactoryAiCheckBadMoveAttacker {
    return Object.freeze({ ...NEUTRAL_ATTACKER, usablePartyMons: 1, ...overrides });
  }

  it("AI_USER usable party count 0 JUMPs to Score_Minus10", () => {
    const result = run(MOVE_BATON_PASS, target(), undefined, attacker({ usablePartyMons: 0 }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10, draws: [] });
  });

  it("positive AI_USER usable party count FALLS THROUGH to end at zero", () => {
    expect(run(MOVE_BATON_PASS, target(), undefined, attacker())).toMatchObject({
      kind: "scored",
      scoreDelta: 0,
      draws: [],
    });
  });
});

describe("AI_CBM_Substitute (data/battle_ai_scripts.s:405-408, EFFECT_SUBSTITUTE)", () => {
  const MOVE_SUBSTITUTE = 164;

  function target(overrides: Partial<FactoryAiCheckBadMoveTarget> = {}): FactoryAiCheckBadMoveTarget {
    return Object.freeze({
      species: 213,
      types: ["TYPE_BUG", "TYPE_ROCK"] as const,
      knownAbility: "ABILITY_STURDY",
      realAbility: "ABILITY_STURDY",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
      ...overrides,
    });
  }

  function attacker(overrides: Partial<FactoryAiCheckBadMoveAttacker> = {}): FactoryAiCheckBadMoveAttacker {
    return Object.freeze({
      ...NEUTRAL_ATTACKER,
      hp: 100,
      maxHp: 100,
      ...overrides,
    });
  }

  it("own substitute up JUMPs to Score_Minus8", () => {
    const result = run(MOVE_SUBSTITUTE, target(), undefined, attacker({ hasSubstitute: true }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -8, draws: [] });
  });

  it("own HP% below 26 JUMPs to Score_Minus10", () => {
    const result = run(MOVE_SUBSTITUTE, target(), undefined, attacker({ hp: 25 }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10, draws: [] });
  });

  it("own HP% exactly 26 FALLS THROUGH to end at zero", () => {
    expect(run(MOVE_SUBSTITUTE, target(), undefined, attacker({ hp: 26 }))).toMatchObject({
      kind: "scored",
      scoreDelta: 0,
      draws: [],
    });
  });

  it("full HP and no substitute FALLS THROUGH to end at zero", () => {
    expect(run(MOVE_SUBSTITUTE, target(), undefined, attacker())).toMatchObject({
      kind: "scored",
      scoreDelta: 0,
      draws: [],
    });
  });
});

describe("AI_CBM_DreamEater (data/battle_ai_scripts.s:242-245, EFFECT_DREAM_EATER)", () => {
  const MOVE_DREAM_EATER = 138;

  function target(overrides: Partial<FactoryAiCheckBadMoveTarget> = {}): FactoryAiCheckBadMoveTarget {
    return Object.freeze({
      species: 213,
      types: ["TYPE_BUG", "TYPE_ROCK"] as const,
      knownAbility: "ABILITY_STURDY",
      realAbility: "ABILITY_STURDY",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
      ...overrides,
    });
  }

  it("target NOT asleep JUMPs to Score_Minus8", () => {
    const result = run(MOVE_DREAM_EATER, target());
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -8, draws: [] });
  });

  it("target asleep FALLS THROUGH past the sleep gate to end at zero", () => {
    expect(run(MOVE_DREAM_EATER, target({ isAsleep: true }))).toMatchObject({
      kind: "scored",
      scoreDelta: 0,
      draws: [],
    });
  });

  it("target asleep but type x0 JUMPs to Score_Minus10", () => {
    const result = run(MOVE_DREAM_EATER, target({
      isAsleep: true,
      types: ["TYPE_DARK", "TYPE_DARK"] as const,
    }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10, draws: [] });
  });
});

describe("AI_CBM_CantEscape (data/battle_ai_scripts.s:430-433, EFFECT_MEAN_LOOK)", () => {
  const MOVE_MEAN_LOOK = 212;

  function target(overrides: Partial<FactoryAiCheckBadMoveTarget> = {}): FactoryAiCheckBadMoveTarget {
    return Object.freeze({
      species: 213,
      types: ["TYPE_BUG", "TYPE_ROCK"] as const,
      knownAbility: "ABILITY_STURDY",
      realAbility: "ABILITY_STURDY",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
      ...overrides,
    });
  }

  it("target already trapped JUMPs to Score_Minus10", () => {
    const result = run(MOVE_MEAN_LOOK, target({ isEscapePrevented: true }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10, draws: [] });
  });

  it("target not trapped FALLS THROUGH to end at zero", () => {
    expect(run(MOVE_MEAN_LOOK, target())).toMatchObject({
      kind: "scored",
      scoreDelta: 0,
      draws: [],
    });
  });
});

describe("AI_CBM_Torment (data/battle_ai_scripts.s:527-529, EFFECT_TORMENT)", () => {
  const MOVE_TORMENT = 259;

  function target(overrides: Partial<FactoryAiCheckBadMoveTarget> = {}): FactoryAiCheckBadMoveTarget {
    return Object.freeze({
      species: 213,
      types: ["TYPE_BUG", "TYPE_ROCK"] as const,
      knownAbility: "ABILITY_STURDY",
      realAbility: "ABILITY_STURDY",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
      ...overrides,
    });
  }

  it("target already tormented JUMPs to Score_Minus10", () => {
    const result = run(MOVE_TORMENT, target({ isTormented: true }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10, draws: [] });
  });

  it("target not tormented FALLS THROUGH to end at zero", () => {
    expect(run(MOVE_TORMENT, target())).toMatchObject({
      kind: "scored",
      scoreDelta: 0,
      draws: [],
    });
  });
});

describe("AI_CBM_HelpingHand (data/battle_ai_scripts.s:541-543, EFFECT_HELPING_HAND)", () => {
  const MOVE_HELPING_HAND = 270;

  function target(overrides: Partial<FactoryAiCheckBadMoveTarget> = {}): FactoryAiCheckBadMoveTarget {
    return Object.freeze({
      species: 213,
      types: ["TYPE_BUG", "TYPE_ROCK"] as const,
      knownAbility: "ABILITY_STURDY",
      realAbility: "ABILITY_STURDY",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
      ...overrides,
    });
  }

  it("singles-only engine always takes if_not_double_battle and scores -10", () => {
    const result = run(MOVE_HELPING_HAND, target());
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10, draws: [] });
  });

  it("scores exactly -10 with a known ability (zero draws from preamble or handler)", () => {
    const result = run(MOVE_HELPING_HAND, target({ knownAbility: "ABILITY_ROCK_HEAD" }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10, draws: [] });
  });
});

describe("AI_CBM_Tickle (data/battle_ai_scripts.s:571-574, EFFECT_TICKLE)", () => {
  const MOVE_TICKLE = 321;

  function target(overrides: Partial<FactoryAiCheckBadMoveTarget> = {}): FactoryAiCheckBadMoveTarget {
    return Object.freeze({
      species: 213,
      types: ["TYPE_BUG", "TYPE_ROCK"] as const,
      knownAbility: "ABILITY_STURDY",
      realAbility: "ABILITY_STURDY",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
      ...overrides,
    });
  }

  it("target ATK at MIN_STAT_STAGE JUMPs to Score_Minus10", () => {
    const result = run(MOVE_TICKLE, target({ atkStage: 0 }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10, draws: [] });
  });

  it("target DEF at MIN_STAT_STAGE JUMPs to Score_Minus8", () => {
    const result = run(MOVE_TICKLE, target({ defStage: 0 }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -8, draws: [] });
  });

  it("both stages at floor score -18 (two sequential gates, additive)", () => {
    const result = run(MOVE_TICKLE, target({ atkStage: 0, defStage: 0 }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -18, draws: [] });
  });

  it("neither stat at floor FALLS THROUGH to end at zero", () => {
    const result = run(MOVE_TICKLE, target());
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0, draws: [] });
  });
});

describe("AI_CBM_BellyDrum (data/battle_ai_scripts.s:247-251, EFFECT_BELLY_DRUM)", () => {
  const MOVE_BELLY_DRUM = 187;

  function target(overrides: Partial<FactoryAiCheckBadMoveTarget> = {}): FactoryAiCheckBadMoveTarget {
    return Object.freeze({
      species: 213,
      types: ["TYPE_BUG", "TYPE_ROCK"] as const,
      knownAbility: "ABILITY_STURDY",
      realAbility: "ABILITY_STURDY",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
      ...overrides,
    });
  }

  it("HP below 51% JUMPs to Score_Minus10 without reaching the ATK gate", () => {
    const result = run(
      MOVE_BELLY_DRUM,
      target(),
      undefined,
      { atkStage: 12, defStage: 6, hp: 50, maxHp: 100 },
    );
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10, draws: [] });
  });

  it("HP at 50% (truncating 50/100) JUMPs to Score_Minus10", () => {
    const result = run(
      MOVE_BELLY_DRUM,
      target(),
      undefined,
      { atkStage: 6, defStage: 6, hp: 50, maxHp: 100 },
    );
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10, draws: [] });
  });

  it("HP at 51% FALLS THROUGH to the ATK gate; non-MAX ATK ends at zero", () => {
    const result = run(
      MOVE_BELLY_DRUM,
      target(),
      undefined,
      { atkStage: 6, defStage: 6, hp: 51, maxHp: 100 },
    );
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0, draws: [] });
  });

  it("HP at 51% with ATK at MAX_STAT_STAGE JUMPs to Score_Minus10", () => {
    const result = run(
      MOVE_BELLY_DRUM,
      target(),
      undefined,
      { atkStage: 12, defStage: 6, hp: 51, maxHp: 100 },
    );
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10, draws: [] });
  });

  it("absent hp/maxHp defaults to 100% and reaches the ATK gate at zero", () => {
    const result = run(MOVE_BELLY_DRUM, target(), undefined, { atkStage: 6, defStage: 6 });
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0, draws: [] });
  });
});

describe("AI_CBM_Magnitude (data/battle_ai_scripts.s:365-367, EFFECT_MAGNITUDE)", () => {
  const MOVE_MAGNITUDE = 222; // EFFECT_MAGNITUDE, TYPE_GROUND, power 1

  function target(overrides: Partial<FactoryAiCheckBadMoveTarget> = {}): FactoryAiCheckBadMoveTarget {
    return Object.freeze({
      species: 213,
      types: ["TYPE_ROCK", "TYPE_BUG"] as const,
      knownAbility: "ABILITY_STURDY",
      realAbility: "ABILITY_STURDY",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
      ...overrides,
    });
  }

  it("Levitate JUMPs to Score_Minus10 after the handler's own first ability read", () => {
    const result = run(MOVE_MAGNITUDE, target({
      knownAbility: "ABILITY_LEVITATE",
      realAbility: "ABILITY_LEVITATE",
    }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10, draws: [] });
  });

  it("non-Levitate FALLS THROUGH into HighRiskForDamage; x0 type JUMPs to -10", () => {
    // Ground is x0 against Flying.
    const result = run(MOVE_MAGNITUDE, target({
      types: ["TYPE_FLYING", "TYPE_FLYING"],
    }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    // Known ability suppresses both the universal soundproof read and the
    // handler's levitate read; the x0 short-circuit adds no draw of its own.
    expect(result.draws).toHaveLength(0);
  });

  it("non-Levitate non-x0 non-Wonder-Guard FALLS THROUGH to end at zero", () => {
    const result = run(MOVE_MAGNITUDE, target());
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0, draws: [] });
  });

  it("executes two fresh ability draws for an ambiguous non-Levitate target", () => {
    // Species 171 (Lanturn, Volt Absorb / Water Absorb) draws at both the
    // handler's own levitate gate and HighRisk's own get_ability.
    const result = run(MOVE_MAGNITUDE, {
      ...MAROWAK,
      species: 171,
      types: ["TYPE_ROCK", "TYPE_BUG"],
      knownAbility: null,
      realAbility: "ABILITY_VOLT_ABSORB",
    });
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws.map((draw) => draw.reason)).toEqual([
      "test-slot-soundproof",
      "test-slot-magnitude-levitate",
      "test-slot-magnitude-high-risk-ability",
    ]);
  });
});

describe("AI_CBM_AccUp (data/battle_ai_scripts.s:269-271, EFFECT_ACCURACY_UP/_2)", () => {
  // EFFECT_ACCURACY_UP (15) and EFFECT_ACCURACY_UP_2 (55) are vestigial in
  // Gen 3 -- no move in gMovesInfo carries either effect -- so the handler is
  // dispatch-reachable only and is receipt-pinned directly here, one test per
  // exit (the same "case per exit" rule as every other CBM handler).
  it("AI's own ACC stage at MAX_STAT_STAGE (12) JUMPs to Score_Minus10", () => {
    expect(runCbmAccUp(12)).toBe(-10);
  });

  it("AI's own ACC stage below MAX FALLS THROUGH to end at zero", () => {
    expect(runCbmAccUp(6)).toBe(0);
  });

  it("AI's own ACC stage at MIN_STAT_STAGE (0) FALLS THROUGH to end at zero", () => {
    expect(runCbmAccUp(0)).toBe(0);
  });
});

describe("AI_CBM_SpAtkDown + CheckIfAbilityBlocksStatChange (data/battle_ai_scripts.s:292-294)", () => {
  // EFFECT_SPECIAL_ATTACK_DOWN (21) and EFFECT_SPECIAL_ATTACK_DOWN_2 (61) are
  // vestigial in Gen 3 -- no move in gMovesInfo carries either effect -- so
  // the handler is dispatch-reachable only and is receipt-pinned directly
  // here through its exported entry point (the shared-tail machinery itself
  // is densely receipted via AI_CBM_SpDefDown above).
  const RNG = Object.freeze({ value: 249_678_687, calls: 0 });

  function spAtkDownTarget(
    overrides: Partial<FactoryAiCheckBadMoveTarget> = {},
  ): FactoryAiCheckBadMoveTarget {
    return Object.freeze({
      ...MAROWAK,
      species: 213,
      types: ["TYPE_BUG", "TYPE_ROCK"] as const,
      knownAbility: null,
      realAbility: "ABILITY_STURDY",
      ...overrides,
    });
  }

  function runSpAtkDown(target: FactoryAiCheckBadMoveTarget): ReturnType<typeof runCbmSpAtkDown> {
    return runCbmSpAtkDown(target, RNG, 1, "test-sp-atk-down");
  }

  it("target's SPATK stage already MIN_STAT_STAGE JUMPs to Score_Minus10 with zero draws", () => {
    const result = runSpAtkDown(spAtkDownTarget({ spAtkStage: 0 }));
    expect(result).toMatchObject({ scoreDelta: -10 });
    expect(result.draws).toHaveLength(0);
  });

  it("an ambiguous two-ability target (neither ability Clear Body nor White Smoke) draws once via the shared tail and scores 0", () => {
    const result = runSpAtkDown(spAtkDownTarget({
      species: 193, // SPECIES_YANMA: Speed Boost / Compound Eyes, both unobserved
      types: ["TYPE_BUG", "TYPE_FLYING"],
    }));
    expect(result).toMatchObject({ scoreDelta: 0 });
    expect(result.draws.map((draw) => draw.reason)).toEqual(["test-sp-atk-down-shared-tail"]);
  });

  it("a known Clear Body target scores -10 with zero draws (shared tail's free guess)", () => {
    const result = runSpAtkDown(spAtkDownTarget({
      species: 72, // SPECIES_TENTACOOL: Clear Body / Liquid Ooze
      knownAbility: "ABILITY_CLEAR_BODY",
      realAbility: "ABILITY_CLEAR_BODY",
    }));
    expect(result).toMatchObject({ scoreDelta: -10 });
    expect(result.draws).toHaveLength(0);
  });

  it("defaults an omitted spAtkStage to DEFAULT_STAT_STAGE (6), not MIN -- doesn't short-circuit", () => {
    const result = runSpAtkDown(spAtkDownTarget());
    // Sturdy is neither Clear Body nor White Smoke -- scores 0, proving the
    // MIN gate did not fire on an omitted stage.
    expect(result).toMatchObject({ scoreDelta: 0 });
  });
});

describe("AI_CBM_Haze (data/battle_ai_scripts.s:314-332, EFFECT_HAZE)", () => {
  function hazeTarget(
    overrides: Partial<FactoryAiCheckBadMoveTarget> = {},
  ): FactoryAiCheckBadMoveTarget {
    return Object.freeze({
      species: 213,
      types: ["TYPE_BUG", "TYPE_ROCK"] as const,
      knownAbility: "ABILITY_STURDY",
      realAbility: "ABILITY_STURDY",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
      ...overrides,
    });
  }

  it("all-clear path (no lowered own stat, no raised target stat) reaches Score_Minus10", () => {
    expect(run(MOVE_HAZE, hazeTarget())).toMatchObject({ kind: "scored", scoreDelta: -10, draws: [] });
  });

  it("any of the user's own seven stages below DEFAULT JUMPs to End at zero", () => {
    expect(run(MOVE_HAZE, hazeTarget(), undefined, { atkStage: 5, defStage: 6 })).toMatchObject({
      kind: "scored",
      scoreDelta: 0,
      draws: [],
    });
  });

  it("a lowered user ACC stage (optional, defaulted to 6) also JUMPs to End at zero", () => {
    expect(run(MOVE_HAZE, hazeTarget(), undefined, { atkStage: 6, defStage: 6, accStage: 5 })).toMatchObject({
      kind: "scored",
      scoreDelta: 0,
    });
  });

  it("a raised target ATK stage JUMPs to End at zero", () => {
    expect(run(MOVE_HAZE, hazeTarget({ atkStage: 7 }))).toMatchObject({ kind: "scored", scoreDelta: 0 });
  });

  it("a raised target EVASION stage JUMPs to End at zero (optional, defaulted to 6)", () => {
    expect(run(MOVE_HAZE, hazeTarget({ evasionStage: 7 }))).toMatchObject({ kind: "scored", scoreDelta: 0 });
  });

  it("omitted attacker stat stages default to DEFAULT_STAT_STAGE and never fire a user gate", () => {
    // NEUTRAL_ATTACKER supplies only atk/def; speed/spAtk/spDef/acc/evasion
    // all default to 6 and stay below the <6 user gates.
    expect(run(MOVE_HAZE, hazeTarget())).toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it("zero-draw: Haze never calls get_ability (single-ability target means no soundproof guess either)", () => {
    const result = run(MOVE_HAZE, hazeTarget());
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });
});

describe("EFFECT_PSYCH_UP -> AI_CBM_Haze (data/battle_ai_scripts.s:181,314-332)", () => {
  const MOVE_PSYCH_UP = 244; // EFFECT_PSYCH_UP, TYPE_NORMAL, power 0

  function psychUpTarget(
    overrides: Partial<FactoryAiCheckBadMoveTarget> = {},
  ): FactoryAiCheckBadMoveTarget {
    return Object.freeze({
      species: 213,
      types: ["TYPE_BUG", "TYPE_ROCK"] as const,
      knownAbility: "ABILITY_STURDY",
      realAbility: "ABILITY_STURDY",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
      ...overrides,
    });
  }

  it("dispatches to the shared AI_CBM_Haze body: all-clear path reaches Score_Minus10", () => {
    expect(run(MOVE_PSYCH_UP, psychUpTarget())).toMatchObject({ kind: "scored", scoreDelta: -10, draws: [] });
  });

  it("a raised target ATK stage JUMPs to End at zero, same as EFFECT_HAZE", () => {
    expect(run(MOVE_PSYCH_UP, psychUpTarget({ atkStage: 7 }))).toMatchObject({
      kind: "scored",
      scoreDelta: 0,
    });
  });
});

describe("AI_CBM_Mist (data/battle_ai_scripts.s:378-380, EFFECT_MIST)", () => {
  const MOVE_MIST = 54; // EFFECT_MIST, TYPE_ICE, power 0

  function mistTarget(
    overrides: Partial<FactoryAiCheckBadMoveTarget> = {},
  ): FactoryAiCheckBadMoveTarget {
    return Object.freeze({
      species: 213,
      types: ["TYPE_BUG", "TYPE_ROCK"] as const,
      knownAbility: "ABILITY_STURDY",
      realAbility: "ABILITY_STURDY",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
      ...overrides,
    });
  }

  function mistAttacker(
    overrides: Partial<FactoryAiCheckBadMoveAttacker> = {},
  ): FactoryAiCheckBadMoveAttacker {
    return Object.freeze({ ...NEUTRAL_ATTACKER, ...overrides });
  }

  it("AI's OWN side's MIST bit up JUMPs to Score_Minus8", () => {
    const result = run(MOVE_MIST, mistTarget(), undefined, mistAttacker({ mistUp: true }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -8, draws: [] });
  });

  it("no MIST on AI's own side FALLS THROUGH to end at zero", () => {
    expect(run(MOVE_MIST, mistTarget(), undefined, mistAttacker())).toMatchObject({
      kind: "scored",
      scoreDelta: 0,
      draws: [],
    });
  });

  it("zero-draw: no ability read anywhere (single-ability target means no soundproof guess either)", () => {
    const result = run(MOVE_MIST, mistTarget({ knownAbility: null }), undefined, mistAttacker());
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });
});

describe("AI_CBM_Disable (data/battle_ai_scripts.s:418-420, EFFECT_DISABLE)", () => {
  const MOVE_DISABLE = 50; // EFFECT_DISABLE, TYPE_NORMAL, power 0

  function disableTarget(
    overrides: Partial<FactoryAiCheckBadMoveTarget> = {},
  ): FactoryAiCheckBadMoveTarget {
    return Object.freeze({
      species: 213,
      types: ["TYPE_BUG", "TYPE_ROCK"] as const,
      knownAbility: "ABILITY_STURDY",
      realAbility: "ABILITY_STURDY",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
      ...overrides,
    });
  }

  it("target already has any move disabled JUMPs to Score_Minus8", () => {
    const result = run(MOVE_DISABLE, disableTarget({ anyMoveDisabled: true }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -8, draws: [] });
  });

  it("target has no disabled move FALLS THROUGH to end at zero", () => {
    expect(run(MOVE_DISABLE, disableTarget())).toMatchObject({ kind: "scored", scoreDelta: 0, draws: [] });
  });

  it("zero-draw: no ability read anywhere (single-ability target means no soundproof guess either)", () => {
    const result = run(MOVE_DISABLE, disableTarget({ knownAbility: null }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });
});

describe("AI_CBM_Encore (data/battle_ai_scripts.s:422-424, EFFECT_ENCORE)", () => {
  const MOVE_ENCORE = 227; // EFFECT_ENCORE, TYPE_NORMAL, power 0

  function encoreTarget(
    overrides: Partial<FactoryAiCheckBadMoveTarget> = {},
  ): FactoryAiCheckBadMoveTarget {
    return Object.freeze({
      species: 213,
      types: ["TYPE_BUG", "TYPE_ROCK"] as const,
      knownAbility: "ABILITY_STURDY",
      realAbility: "ABILITY_STURDY",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
      ...overrides,
    });
  }

  it("target already has any move encored JUMPs to Score_Minus8", () => {
    const result = run(MOVE_ENCORE, encoreTarget({ anyMoveEncored: true }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -8, draws: [] });
  });

  it("target has no encored move FALLS THROUGH to end at zero", () => {
    expect(run(MOVE_ENCORE, encoreTarget())).toMatchObject({ kind: "scored", scoreDelta: 0, draws: [] });
  });

  it("zero-draw: no ability read anywhere (single-ability target means no soundproof guess either)", () => {
    const result = run(MOVE_ENCORE, encoreTarget({ knownAbility: null }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });
});

describe("AI_CBM_Attract (data/battle_ai_scripts.s:456-476, EFFECT_ATTRACT)", () => {
  const MOVE_ATTRACT = 213; // EFFECT_ATTRACT, TYPE_NORMAL, power 0

  function attractTarget(
    overrides: Partial<FactoryAiCheckBadMoveTarget> = {},
  ): FactoryAiCheckBadMoveTarget {
    return Object.freeze({
      species: 213,
      types: ["TYPE_BUG", "TYPE_ROCK"] as const,
      knownAbility: "ABILITY_STURDY",
      realAbility: "ABILITY_STURDY",
      speedStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
      ...overrides,
    });
  }

  function attractAttacker(
    overrides: Partial<FactoryAiCheckBadMoveAttacker> = {},
  ): FactoryAiCheckBadMoveAttacker {
    return Object.freeze({ ...NEUTRAL_ATTACKER, ...overrides });
  }

  it("target already infatuated JUMPs to Score_Minus10 before the ability read", () => {
    const result = run(MOVE_ATTRACT, attractTarget({ isInfatuated: true }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10 });
    if (result.kind !== "scored") throw new Error("unreachable");
    expect(result.draws).toHaveLength(0);
  });

  it("target's known ability Oblivious JUMPs to Score_Minus10", () => {
    const result = run(MOVE_ATTRACT, attractTarget({
      knownAbility: "ABILITY_OBLIVIOUS",
      realAbility: "ABILITY_OBLIVIOUS",
    }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10, draws: [] });
  });

  it("a male user against a female target FALLS THROUGH to end at zero", () => {
    const result = run(MOVE_ATTRACT, attractTarget({ gender: "MON_FEMALE" }), undefined, attractAttacker({ gender: "MON_MALE" }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0, draws: [] });
  });

  it("a female user against a male target FALLS THROUGH to end at zero", () => {
    const result = run(MOVE_ATTRACT, attractTarget({ gender: "MON_MALE" }), undefined, attractAttacker({ gender: "MON_FEMALE" }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0, draws: [] });
  });

  it("a male user against a male target JUMPs to Score_Minus10", () => {
    const result = run(MOVE_ATTRACT, attractTarget({ gender: "MON_MALE" }), undefined, attractAttacker({ gender: "MON_MALE" }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10, draws: [] });
  });

  it("a genderless (MON_GENDERLESS) user falls through to Score_Minus10, never treated as male or female", () => {
    const result = run(MOVE_ATTRACT, attractTarget({ gender: "MON_FEMALE" }), undefined, attractAttacker({ gender: "MON_GENDERLESS" }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10, draws: [] });
  });

  it("an unmodeled (undefined) user gender scores -10 exactly like MON_GENDERLESS", () => {
    const result = run(MOVE_ATTRACT, attractTarget({ gender: "MON_FEMALE" }), undefined, attractAttacker());
    expect(result).toMatchObject({ kind: "scored", scoreDelta: -10, draws: [] });
  });

  it("an ambiguous two-ability target draws once (the handler's own ability read) for the gender gates", () => {
    const result = run(MOVE_ATTRACT, attractTarget({
      species: 171, // SPECIES_LANTURN: Volt Absorb / Water Absorb, both unobserved
      types: ["TYPE_WATER", "TYPE_ELECTRIC"],
      knownAbility: null,
      gender: "MON_FEMALE",
    }), undefined, attractAttacker({ gender: "MON_MALE" }));
    expect(result).toMatchObject({ kind: "scored", scoreDelta: 0 });
    if (result.kind !== "scored") throw new Error("unreachable");
    // Universal preamble soundproof guess + the handler's own ability read.
    expect(result.draws.map((draw) => draw.reason)).toEqual([
      "test-slot-soundproof",
      "test-slot-attract-ability",
    ]);
  });
});

describe("AI_CBM_Memento (data/battle_ai_scripts.s:482-484, EFFECT_MEMENTO)", () => {
  const MOVE_MEMENTO = 262; // TYPE_DARK, power 0 -> MOVE_POWER_OTHER, preamble type block skipped

  const MEMENTO_TARGET: FactoryAiCheckBadMoveTarget = Object.freeze({
    species: 213,
    types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
    knownAbility: "ABILITY_STURDY",
    realAbility: "ABILITY_STURDY",
    speedStage: 6,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
  });

  function mementoTarget(overrides: Partial<FactoryAiCheckBadMoveTarget>): FactoryAiCheckBadMoveTarget {
    return Object.freeze({ ...MEMENTO_TARGET, ...overrides });
  }

  function benchAttacker(usablePartyMons: number): FactoryAiCheckBadMoveAttacker {
    return Object.freeze({ atkStage: 6, defStage: 6, usablePartyMons });
  }

  it("target ATK at MIN_STAT_STAGE JUMPs to Score_Minus10 before the spAtk/count gates", () => {
    expect(run(MOVE_MEMENTO, mementoTarget({ atkStage: 0 }), undefined, benchAttacker(1)))
      .toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it("target SPATK at MIN_STAT_STAGE (ATK above floor) JUMPs to Score_Minus8", () => {
    expect(run(MOVE_MEMENTO, mementoTarget({ atkStage: 6, spAtkStage: 0 }), undefined, benchAttacker(1)))
      .toMatchObject({ kind: "scored", scoreDelta: -8 });
  });

  it("falls through into AI_CBM_BatonPass's own count gate: zero usable party mons scores -10", () => {
    expect(run(MOVE_MEMENTO, mementoTarget({ atkStage: 6, spAtkStage: 6 }), undefined, benchAttacker(0)))
      .toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it("all-clear path (both target stages above floor, bench non-empty) reaches End at zero", () => {
    expect(run(MOVE_MEMENTO, mementoTarget({ atkStage: 6, spAtkStage: 6 }), undefined, benchAttacker(2)))
      .toMatchObject({ kind: "scored", scoreDelta: 0 });
  });
});

describe("AI_CBM_Stockpile (data/battle_ai_scripts.s:511-514, EFFECT_STOCKPILE)", () => {
  const MOVE_STOCKPILE = 254; // TYPE_NORMAL, power 0 -> MOVE_POWER_OTHER

  const STOCKPILE_TARGET: FactoryAiCheckBadMoveTarget = Object.freeze({
    species: 213,
    types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
    knownAbility: "ABILITY_STURDY",
    realAbility: "ABILITY_STURDY",
    speedStage: 6,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
  });

  function stockpileAttacker(count: number): FactoryAiCheckBadMoveAttacker {
    return Object.freeze({ atkStage: 6, defStage: 6, stockpileCount: count });
  }

  it("a stockpile counter at the 3-count maximum JUMPs to Score_Minus10", () => {
    expect(run(MOVE_STOCKPILE, STOCKPILE_TARGET, undefined, stockpileAttacker(3)))
      .toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it("counts below the maximum (0/1/2) FALL THROUGH to End at zero", () => {
    for (const count of [0, 1, 2]) {
      expect(run(MOVE_STOCKPILE, STOCKPILE_TARGET, undefined, stockpileAttacker(count)))
        .toMatchObject({ kind: "scored", scoreDelta: 0 });
    }
  });

  it("an omitted stockpileCount defaults to 0 (battle-start) and scores zero", () => {
    expect(run(MOVE_STOCKPILE, STOCKPILE_TARGET)).toMatchObject({
      kind: "scored",
      scoreDelta: 0,
      draws: [],
    });
  });
});

describe("AI_CBM_SpitUpAndSwallow (data/battle_ai_scripts.s:516-520, EFFECT_SPIT_UP/EFFECT_SWALLOW)", () => {
  const MOVE_SPIT_UP = 255; // TYPE_NORMAL, power 100 (ignored-powerful effect)
  const MOVE_SWALLOW = 256; // TYPE_NORMAL, power 0

  const NORMAL_TARGET: FactoryAiCheckBadMoveTarget = Object.freeze({
    species: 213,
    types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
    knownAbility: "ABILITY_STURDY",
    realAbility: "ABILITY_STURDY",
    speedStage: 6,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
  });

  function spitUpAttacker(count: number): FactoryAiCheckBadMoveAttacker {
    return Object.freeze({ atkStage: 6, defStage: 6, stockpileCount: count });
  }

  it.each([
    ["Spit Up", MOVE_SPIT_UP],
    ["Swallow", MOVE_SWALLOW],
  ])("%s: x0 type immunity (Ghost target) JUMPs to Score_Minus10 before the count read", (_label, moveId) => {
    expect(run(moveId, { ...NORMAL_TARGET, types: ["TYPE_GHOST", "TYPE_GHOST"] }, undefined, spitUpAttacker(2)))
      .toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it.each([
    ["Spit Up", MOVE_SPIT_UP],
    ["Swallow", MOVE_SWALLOW],
  ])("%s: zero stockpile count against a non-immune target JUMPs to Score_Minus10", (_label, moveId) => {
    expect(run(moveId, NORMAL_TARGET, undefined, spitUpAttacker(0)))
      .toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it.each([
    ["Spit Up", MOVE_SPIT_UP],
    ["Swallow", MOVE_SWALLOW],
  ])("%s: nonzero count against a non-immune target FALLS THROUGH to End at zero", (_label, moveId) => {
    expect(run(moveId, NORMAL_TARGET, undefined, spitUpAttacker(2)))
      .toMatchObject({ kind: "scored", scoreDelta: 0, draws: [] });
  });
});

describe("AI_CBM_Recycle (data/battle_ai_scripts.s:554-557, EFFECT_RECYCLE)", () => {
  const MOVE_RECYCLE = 278; // TYPE_NORMAL, power 0 -> MOVE_POWER_OTHER

  const RECYCLE_TARGET: FactoryAiCheckBadMoveTarget = Object.freeze({
    species: 213,
    types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
    knownAbility: "ABILITY_STURDY",
    realAbility: "ABILITY_STURDY",
    speedStage: 6,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
  });

  function recycleAttacker(usedHeldItemId: number): FactoryAiCheckBadMoveAttacker {
    return Object.freeze({ atkStage: 6, defStage: 6, usedHeldItemId });
  }

  it("no used held item (ITEM_NONE) JUMPs to Score_Minus10", () => {
    expect(run(MOVE_RECYCLE, RECYCLE_TARGET, undefined, recycleAttacker(0)))
      .toMatchObject({ kind: "scored", scoreDelta: -10 });
  });

  it("a used held item recorded FALLS THROUGH to End at zero", () => {
    expect(run(MOVE_RECYCLE, RECYCLE_TARGET, undefined, recycleAttacker(155)))
      .toMatchObject({ kind: "scored", scoreDelta: 0 });
  });

  it("an omitted usedHeldItemId defaults to ITEM_NONE (battle-start) and scores -10", () => {
    expect(run(MOVE_RECYCLE, RECYCLE_TARGET)).toMatchObject({
      kind: "scored",
      scoreDelta: -10,
      draws: [],
    });
  });
});
