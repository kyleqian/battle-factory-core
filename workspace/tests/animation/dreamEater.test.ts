import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  DREAM_EATER_HEALING_FIRST_AGE,
  DREAM_EATER_ORB_FIRST_AGE,
  DREAM_EATER_ORB_GROUPS,
  dreamEaterAtAge,
  dreamEaterSpritesBackToFrontAtAge,
  dreamEaterTargetOamOffsetAtSourceAge,
} from "../../src/animation/dreamEater.ts";
import {
  createSceneOnMovePresentation,
  sceneOnDreamEaterView,
} from "../../src/animation/sceneOnPresentation.ts";

type Side = "player" | "opponent";
type Row = Record<string, any>;

const allocatorProfile = {
  orbs: [3, 4, 5, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 3, 20, 21, 4, 7, 9, 5, 11, 13],
  stars: [3, 4, 5, 3],
  orderSeed: [4, 3, 16, 15, 14, 13, 12, 11, 10, 9, 7, 5, 21, 20, 19, 18, 17],
} as const;

function rows(side: Side): Row[] {
  return JSON.parse(gunzipSync(readFileSync(
    `tools/compare/evidence/dream-eater-${side}-dense-state.json.gz`,
  )).toString("utf8")).frames;
}

function config(side: Side) {
  const playerToOpponent = side === "player";
  const attackerCenter = playerToOpponent ? { x: 72, y: 96 } : { x: 176, y: 48 };
  return {
    move: "DREAM_EATER" as const,
    attacker: {
      species: "WIGGLYTUFF" as const,
      geometry: playerToOpponent ? {
        side: "player" as const,
        spriteCorner: { x: 40, y: 56 },
        animationCenter: attackerCenter,
        battlePositionCenter: { x: 72, y: 80 },
      } : {
        side: "opponent" as const,
        spriteCorner: { x: 144, y: 16 },
        animationCenter: attackerCenter,
        battlePositionCenter: { x: 176, y: 40 },
      },
    },
    target: {
      species: "ONIX" as const,
      geometry: playerToOpponent ? {
        side: "opponent" as const,
        spriteCorner: { x: 144, y: 10 },
        animationCenter: { x: 176, y: 42 },
        battlePositionCenter: { x: 176, y: 40 },
      } : {
        side: "player" as const,
        spriteCorner: { x: 40, y: 48 },
        animationCenter: { x: 72, y: 88 },
        battlePositionCenter: { x: 72, y: 80 },
      },
    },
    healingCenter: attackerCenter,
    absorptionCenter: attackerCenter,
    targetRestOffset: playerToOpponent ? { x2: 1, y2: 0 } : { x2: 0, y2: 0 },
    allocatorProfile,
    fieldProfile: playerToOpponent ? {
      playerHp: 205, playerMaxHp: 215,
      opponentHp: 110, opponentMaxHp: 110,
      playerGender: "female" as const, opponentGender: "male" as const,
    } : {
      playerHp: 110, playerMaxHp: 110,
      opponentHp: 195, opponentMaxHp: 215,
      playerGender: "male" as const, opponentGender: "female" as const,
    },
  };
}

function spriteShape(sprite: Record<string, any>) {
  return [sprite.x, sprite.y, sprite.x2, sprite.y2, sprite.frame, sprite.xScale, sprite.yScale];
}

describe("MOVE_DREAM_EATER source-relative reducer and typed seam", () => {
  it("ports the literal Swagger triples, HealingEffect, and cleanup clocks", () => {
    expect(DREAM_EATER_ORB_GROUPS).toHaveLength(8);
    expect(DREAM_EATER_ORB_GROUPS.flat()).toHaveLength(24);
    expect(dreamEaterAtAge(DREAM_EATER_ORB_FIRST_AGE, { x: 176, y: 42 }, { x: 72, y: 96 }, "player"))
      .toMatchObject({ soundRestart: "SE_M_SWAGGER" });
    expect(dreamEaterAtAge(DREAM_EATER_HEALING_FIRST_AGE, { x: 176, y: 42 }, { x: 72, y: 96 }, "player"))
      .toMatchObject({ soundRestart: "SE_M_ABSORB_2", sprites: [expect.objectContaining({ kind: "star", x: 72, y: 91 })] });
    expect(dreamEaterAtAge(265, { x: 176, y: 42 }, { x: 72, y: 96 }, "player").active).toBe(false);
    expect(dreamEaterAtAge(265, { x: 72, y: 80 }, { x: 176, y: 48 }, "opponent").active).toBe(true);
    expect(dreamEaterAtAge(266, { x: 72, y: 80 }, { x: 176, y: 48 }, "opponent").active).toBe(false);
  });

  it("matches all 533 retained reducer rows and the typed presentation seam", () => {
    let checked = 0;
    for (const side of ["player", "opponent"] as const) {
      const evidence = rows(side);
      const stage = createSceneOnMovePresentation(config(side));
      const targetSlot = evidence[0]!.animationBattlers.spriteIds[evidence[0]!.animationBattlers.target];
      for (let age = 0; age < evidence.length; age += 1) {
        const row = evidence[age]!;
        const target = row.sprites.find((sprite: Row) => sprite.slot === targetSlot)!;
        const view = sceneOnDreamEaterView({ ...stage, age });
        const direct = dreamEaterAtAge(
          age,
          stage.config.target.geometry.animationCenter,
          stage.config.absorptionCenter,
          stage.config.attacker.geometry.side,
          stage.config.healingCenter,
          stage.config.targetRestOffset,
        );
        expect(view).toMatchObject(direct);
        expect([direct.targetX2, direct.targetY2]).toEqual([target.x2, target.y2]);
        expect([direct.targetScale.xScale, direct.targetScale.yScale])
          .toEqual([target.matrix[0], target.matrix[3]]);
        expect(direct.targetOnMonBg).toBe(row.tasks.some((task: Row) => task.func.symbol === "Task_UpdateMonBg"));
        expect(direct.bgBldy).toBe(row.registers.bldy);
        expect(direct.alpha ? direct.alpha.eva | (direct.alpha.evb << 8) : 0).toBe(row.registers.bldalpha);
        expect(direct.active).toBe(row.animScriptActive);

        if (age >= 48 && age <= 126) {
          const tileBytes = (target.attr[2] as number).toString(16).padStart(4, "0")
            .match(/../g)!.reverse().join("");
          const targetOam = row.softwareOam.find((entry: string) => entry.slice(8, 12) === tileBytes);
          expect(targetOam).toBeDefined();
          const attr0 = Number.parseInt(targetOam!.slice(2, 4) + targetOam!.slice(0, 2), 16);
          const attr1 = Number.parseInt(targetOam!.slice(6, 8) + targetOam!.slice(4, 6), 16);
          const doubleSize = (attr0 & 0x200) !== 0;
          const rawX = attr1 & 0x1ff;
          const rawY = attr0 & 0xff;
          const oamX = rawX >= 256 ? rawX - 512 : rawX;
          const oamY = rawY >= 128 ? rawY - 256 : rawY;
          const cornerX = stage.config.target.geometry.spriteCorner.x - (doubleSize ? 32 : 0);
          const cornerY = stage.config.target.geometry.spriteCorner.y - (doubleSize ? 32 : 0);
          expect(dreamEaterTargetOamOffsetAtSourceAge(age, stage.config.targetRestOffset))
            .toEqual({ x2: oamX - cornerX, y2: oamY - cornerY });
        }

        const expectedOrbs = row.sprites.filter((sprite: Row) => sprite.template.symbol === "gAbsorptionOrbSpriteTemplate")
          .map((sprite: Row) => [sprite.x, sprite.y, sprite.x2, sprite.y2, 8, sprite.matrix[0], sprite.matrix[3]])
          .sort();
        const actualOrbs = direct.sprites.filter((sprite) => sprite.kind === "orb").map(spriteShape).sort();
        expect(actualOrbs).toEqual(expectedOrbs);
        checked += 1;
      }
    }
    expect(checked).toBe(533);
  });

  it("derives the equal-subpriority source order without a frame lookup", () => {
    const player = config("player");
    const sprites = dreamEaterSpritesBackToFrontAtAge(
      99,
      player.target.geometry.animationCenter,
      player.absorptionCenter,
      "player",
      player.healingCenter,
      allocatorProfile,
    );
    expect(sprites.filter((sprite) => sprite.kind === "orb").map((sprite) => sprite.y + sprite.y2))
      .toEqual([...sprites].filter((sprite) => sprite.kind === "orb")
        .map((sprite) => sprite.y + sprite.y2).sort((a, b) => a - b));
  });

  it("owns presentation only, with no gameplay/RNG imports", () => {
    const source = readFileSync("src/animation/dreamEater.ts", "utf8");
    for (const forbidden of ["Math.random", "rngValue", "damage", "turnOrder", "roundController", "facility"]) {
      expect(source).not.toContain(forbidden);
    }
  });
});
