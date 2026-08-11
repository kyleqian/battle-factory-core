import { describe, expect, it } from "vitest";
import {
  featherDanceOnixOpponentHealthbox,
  featherDancePidgeottoPlayerHealthbox,
  flyMurkrowPlayerHealthbox,
  KABUTO_SENDOUT_BATTLER,
  kabutoHealthboxContentForHp,
  magbyPlayerHealthboxContentForHp,
  ONIX_MENU_BATTLER,
  onixPlayerHealthboxContentForState,
} from "../src/engine/battleScene.ts";
import { composeOpponentHealthbox, composePlayerHealthbox } from "../src/engine/healthboxAssembly.ts";
import battleHealthboxAsset from "../src/assets/gen/battle-healthbox.json" with { type: "json" };

// docs/species-render-entry-point-retirement-design.md §4 slice 2: these six
// family-C healthbox factories used to bake their species name/level/maxHp
// (and, for MAGBY, gender) as literals inside the function body. They are
// now pure functions of their arguments. This file pins each factory's
// output against directly calling the same `composeOpponentHealthbox`/
// `composePlayerHealthbox` primitive with the pre-change literal values -
// proof the parameterization is byte-identical, not a new formula.

const opponentAssets = {
  frame: battleHealthboxAsset.singlesOpponent,
  hpbar: battleHealthboxAsset.hpbar,
  hpbarAnim: battleHealthboxAsset.hpbarAnim,
  frameEnd: battleHealthboxAsset.frameEnd,
  statusIcons: battleHealthboxAsset.status2,
};

const playerAssets = {
  frame: battleHealthboxAsset.singlesPlayer,
  hpbar: battleHealthboxAsset.hpbar,
  hpbarAnim: battleHealthboxAsset.hpbarAnim,
  expbar: battleHealthboxAsset.expbar,
  statusIcons: battleHealthboxAsset.status,
  textPalette: battleHealthboxAsset.singlesPlayer.palette,
};

type CollisionIdentity = {
  name: string;
  level: number;
  maxHp: number;
};

const ONIX_COLLISION_IDENTITY: CollisionIdentity = { name: "ONIX", level: 42, maxHp: 101 };
const MAGBY_COLLISION_IDENTITY: CollisionIdentity = { name: "MAGBY", level: 49, maxHp: 173 };

function expectIdentityCollisionSafe(
  factory: (hp: number, identity: CollisionIdentity) => unknown,
  compose: (hp: number, identity: CollisionIdentity) => unknown,
): void {
  const orders = [
    { hp: 31, identities: [ONIX_COLLISION_IDENTITY, MAGBY_COLLISION_IDENTITY] },
    { hp: 32, identities: [MAGBY_COLLISION_IDENTITY, ONIX_COLLISION_IDENTITY] },
  ] as const;
  for (const { hp, identities } of orders) {
    for (const identity of identities) {
      expect(factory(hp, identity)).toEqual(compose(hp, identity));
    }
  }
}

describe("battleScene.ts family-C healthbox factories (slice 2 parameterization)", () => {
  it("kabutoHealthboxContentForHp matches composeOpponentHealthbox for KABUTO_SENDOUT_BATTLER's identity at full and partial HP", () => {
    for (const hp of [91, 47]) {
      expect(
        kabutoHealthboxContentForHp(
          hp,
          KABUTO_SENDOUT_BATTLER.name,
          KABUTO_SENDOUT_BATTLER.level,
          KABUTO_SENDOUT_BATTLER.maxHP,
          KABUTO_SENDOUT_BATTLER.gender,
        ),
      ).toEqual(
        composeOpponentHealthbox(opponentAssets, {
          name: "KABUTO",
          level: 50,
          gender: "male",
          hpFraction: hp / 91,
          status: "none",
        }),
      );
    }
  });

  it("onixPlayerHealthboxContentForState matches composePlayerHealthbox for ONIX_MENU_BATTLER's identity at full HP/no-status and partial HP/burn", () => {
    const cases = [
      { hp: 117, status: "none" as const },
      { hp: 63, status: "burn" as const },
    ];
    for (const { hp, status } of cases) {
      expect(
        onixPlayerHealthboxContentForState(
          hp,
          status,
          ONIX_MENU_BATTLER.gender,
          ONIX_MENU_BATTLER.name,
          ONIX_MENU_BATTLER.level,
          ONIX_MENU_BATTLER.maxHP,
        ),
      ).toEqual(
        composePlayerHealthbox(playerAssets, {
          name: "ONIX",
          level: 50,
          gender: "male",
          hpFraction: hp / 117,
          status,
          currentHp: hp,
          maxHp: 117,
        }),
      );
    }
  });

  it("featherDanceOnixOpponentHealthbox matches composeOpponentHealthbox for the pre-change ONIX/50/117 literal at full and partial HP", () => {
    for (const hp of [117, 58]) {
      expect(featherDanceOnixOpponentHealthbox(hp, "male", "ONIX", 50, 117)).toEqual(
        composeOpponentHealthbox(opponentAssets, {
          name: "ONIX",
          level: 50,
          gender: "male",
          hpFraction: hp / 117,
          status: "none",
        }),
      );
    }
  });

  it("featherDancePidgeottoPlayerHealthbox matches composePlayerHealthbox for the pre-change PIDGEOTTO/50/156 literal at full and partial HP", () => {
    const cases = [
      { hp: 156, status: "none" as const },
      { hp: 80, status: "burn" as const },
    ];
    for (const { hp, status } of cases) {
      expect(featherDancePidgeottoPlayerHealthbox(hp, status, "male", "PIDGEOTTO", 50, 156)).toEqual(
        composePlayerHealthbox(playerAssets, {
          name: "PIDGEOTTO",
          level: 50,
          gender: "male",
          hpFraction: hp / 156,
          status,
          currentHp: hp,
          maxHp: 156,
        }),
      );
    }
  });

  it("flyMurkrowPlayerHealthbox matches composePlayerHealthbox for the pre-change MURKROW/50/142 literal at full and partial HP", () => {
    const cases = [
      { hp: 142, status: "none" as const },
      { hp: 70, status: "burn" as const },
    ];
    for (const { hp, status } of cases) {
      expect(flyMurkrowPlayerHealthbox(hp, status, "male", "MURKROW", 50, 142)).toEqual(
        composePlayerHealthbox(playerAssets, {
          name: "MURKROW",
          level: 50,
          gender: "male",
          hpFraction: hp / 142,
          status,
          currentHp: hp,
          maxHp: 142,
        }),
      );
    }
  });

  it("magbyPlayerHealthboxContentForHp matches composePlayerHealthbox for the pre-change MAGBY/50/138/female literal at full and partial HP", () => {
    for (const hp of [138, 90]) {
      expect(magbyPlayerHealthboxContentForHp(hp, "MAGBY", 50, 138, "female")).toEqual(
        composePlayerHealthbox(playerAssets, {
          name: "MAGBY",
          level: 50,
          gender: "female",
          hpFraction: hp / 138,
          status: "none",
          currentHp: hp,
          maxHp: 138,
        }),
      );
    }
  });

  it("kabutoHealthboxContentForHp owns every identity and max-HP cache input in either call order", () => {
    expectIdentityCollisionSafe(
      (hp, { name, level, maxHp }) => kabutoHealthboxContentForHp(hp, name, level, maxHp, "male"),
      (hp, { name, level, maxHp }) => composeOpponentHealthbox(opponentAssets, {
        name,
        level,
        gender: "male",
        hpFraction: hp / maxHp,
        status: "none",
      }),
    );
  });

  it("onixPlayerHealthboxContentForState owns every identity and max-HP cache input in either call order", () => {
    expectIdentityCollisionSafe(
      (hp, { name, level, maxHp }) => onixPlayerHealthboxContentForState(hp, "paralysis", "female", name, level, maxHp),
      (hp, { name, level, maxHp }) => composePlayerHealthbox(playerAssets, {
        name,
        level,
        gender: "female",
        hpFraction: hp / maxHp,
        status: "paralysis",
        currentHp: hp,
        maxHp,
      }),
    );
  });

  it("featherDanceOnixOpponentHealthbox owns every identity and max-HP cache input in either call order", () => {
    expectIdentityCollisionSafe(
      (hp, { name, level, maxHp }) => featherDanceOnixOpponentHealthbox(hp, "male", name, level, maxHp),
      (hp, { name, level, maxHp }) => composeOpponentHealthbox(opponentAssets, {
        name,
        level,
        gender: "male",
        hpFraction: hp / maxHp,
        status: "none",
      }),
    );
  });

  it("featherDancePidgeottoPlayerHealthbox owns every identity and max-HP cache input in either call order", () => {
    expectIdentityCollisionSafe(
      (hp, { name, level, maxHp }) => featherDancePidgeottoPlayerHealthbox(hp, "burn", "female", name, level, maxHp),
      (hp, { name, level, maxHp }) => composePlayerHealthbox(playerAssets, {
        name,
        level,
        gender: "female",
        hpFraction: hp / maxHp,
        status: "burn",
        currentHp: hp,
        maxHp,
      }),
    );
  });

  it("flyMurkrowPlayerHealthbox owns every identity and max-HP cache input in either call order", () => {
    expectIdentityCollisionSafe(
      (hp, { name, level, maxHp }) => flyMurkrowPlayerHealthbox(hp, "burn", "male", name, level, maxHp),
      (hp, { name, level, maxHp }) => composePlayerHealthbox(playerAssets, {
        name,
        level,
        gender: "male",
        hpFraction: hp / maxHp,
        status: "burn",
        currentHp: hp,
        maxHp,
      }),
    );
  });

  it("magbyPlayerHealthboxContentForHp owns every identity and max-HP cache input in either call order", () => {
    expectIdentityCollisionSafe(
      (hp, { name, level, maxHp }) => magbyPlayerHealthboxContentForHp(hp, name, level, maxHp, "male"),
      (hp, { name, level, maxHp }) => composePlayerHealthbox(playerAssets, {
        name,
        level,
        gender: "male",
        hpFraction: hp / maxHp,
        status: "none",
        currentHp: hp,
        maxHp,
      }),
    );
  });
});
