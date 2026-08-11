import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

interface Audit {
  readonly move: string;
  readonly moveId: number;
  readonly carrier: {
    readonly setId: number;
    readonly set: string;
    readonly species: string;
    readonly legalRange: readonly number[];
    readonly challengeNum: number;
  };
  readonly visualDispatch: Readonly<
    Record<string, { readonly value: number; readonly body: string }>
  >;
  readonly factory: {
    readonly mapType: string;
    readonly environment: string;
    readonly environmentValue: number;
    readonly reachableBodies: readonly string[];
  };
  readonly selectionRoutes: Readonly<Record<string, string>>;
  readonly factoryBody: {
    readonly label: string;
    readonly components: readonly string[];
  };
  readonly semanticEvidence: readonly string[];
  readonly verdict: string;
}

function audit(): Audit {
  return JSON.parse(execFileSync(process.execPath, [
    "--experimental-strip-types",
    "tools/compare/secretPowerSourceAudit.ts",
  ], { encoding: "utf8" })) as Audit;
}

describe("MOVE_SECRET_POWER source/controller evidence checkpoint", () => {
  it("proves the lowest legal Level-50 carrier from the challenge-0 range", () => {
    expect(audit()).toMatchObject({
      move: "MOVE_SECRET_POWER",
      moveId: 290,
      carrier: {
        setId: 117,
        set: "FRONTIER_MON_TEDDIURSA",
        species: "SPECIES_TEDDIURSA",
        legalRange: [110, 199],
        challengeNum: 0,
      },
    });
  });

  it("pins every environment-selected body and the sole Factory body", () => {
    const result = audit();
    expect(result.visualDispatch).toEqual({
      BATTLE_ENVIRONMENT_GRASS: { value: 0, body: "Move_NEEDLE_ARM" },
      BATTLE_ENVIRONMENT_LONG_GRASS: {
        value: 1, body: "Move_MAGICAL_LEAF",
      },
      BATTLE_ENVIRONMENT_SAND: { value: 2, body: "Move_MUD_SHOT" },
      BATTLE_ENVIRONMENT_UNDERWATER: { value: 3, body: "Move_WATERFALL" },
      BATTLE_ENVIRONMENT_WATER: { value: 4, body: "Move_SURF" },
      BATTLE_ENVIRONMENT_POND: { value: 5, body: "Move_BUBBLE_BEAM" },
      BATTLE_ENVIRONMENT_MOUNTAIN: { value: 6, body: "Move_ROCK_THROW" },
      BATTLE_ENVIRONMENT_CAVE: { value: 7, body: "Move_BITE" },
      BATTLE_ENVIRONMENT_BUILDING: { value: 8, body: "Move_STRENGTH" },
      BATTLE_ENVIRONMENT_PLAIN: { value: 9, body: "Move_SLAM" },
    });
    expect(result.factory).toEqual({
      mapType: "MAP_TYPE_INDOOR",
      environment: "BATTLE_ENVIRONMENT_BUILDING",
      environmentValue: 8,
      reachableBodies: ["Move_STRENGTH"],
    });
  });

  it("pins success and every animation-bypass route without owning battle logic", () => {
    const result = audit();
    expect(result.selectionRoutes).toEqual({
      success: "CONTROLLER_MOVEANIMATION -> DoMoveAnim(290) -> "
        + "Move_SECRET_POWER -> AnimTask_GetBattleEnvironment -> Move_STRENGTH",
      accuracyMiss: "BattleScript_PrintMoveMissed bypasses attackanimation",
      noEffect: "Cmd_attackanimation selects BattleScript_Pausex20",
      animationsDisabled: "Cmd_attackanimation selects BattleScript_Pausex20",
      secondaryEffect:
        "seteffectwithchance runs after attackanimation/resultmessage",
    });
    expect(result.factoryBody).toMatchObject({
      label: "Move_STRENGTH",
      components: expect.arrayContaining([
        "AnimTask_ShakeAndSinkMon",
        "AnimTask_TranslateMonEllipticalRespectSide",
        "three gBasicHitSplatSpriteTemplate animation-1 lifecycles",
        "AnimTask_ShakeMon2",
      ]),
    });
    expect(result.semanticEvidence).toEqual([
      "tests/battleScriptGetSecretPowerEffectOpcode.test.ts",
      "tests/secretPowerOracleEvidence.test.ts",
    ]);
    expect(result.verdict).toMatch(/^unsupported:/);
  });
});
