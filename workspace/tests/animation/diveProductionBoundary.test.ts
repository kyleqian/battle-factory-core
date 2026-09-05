import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  createSceneOnMovePresentation,
  sceneOnDiveView,
  type SceneOnDiveConfig,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import type {
  DiveAllocation,
  DiveBubbleProfile,
  DiveDropletProfile,
  DiveImpactProfile,
  DiveProfile,
} from "../../src/animation/dive.ts";

type Row = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const fixture = JSON.parse(readFileSync(resolve(root,
  "tools/compare/fixtures/dive-evidence.json"), "utf8")) as Record<string, any>;
const symbol = (sprite: Row): string | null => sprite.template?.symbol ?? null;

function bodyRows(orientation: "player-back" | "opponent-front", body: "setup" | "attack") {
  const item = fixture.orientations[orientation];
  const frames = JSON.parse(gunzipSync(readFileSync(resolve(root, item.denseState)))
    .toString("utf8")).frames as Row[];
  const setupCount = item.bodyWindows[0].frameCount as number;
  return body === "setup" ? frames.slice(0, setupCount) : frames.slice(setupCount);
}

function allocation(row: Row, sprite: Row): DiveAllocation {
  return { slot: sprite.slot, matrixNum: sprite.matrixNum,
    persistentOrder: row.spriteOrder.indexOf(sprite.slot) };
}

function newSprites(rows: Row[], age: number, template: string): Row[] {
  const previous = age ? rows[age - 1]!.sprites as Row[] : [];
  return (rows[age]!.sprites as Row[]).filter((sprite) => symbol(sprite) === template
    && !previous.some((prior) => prior.slot === sprite.slot && symbol(prior) === template));
}

function makeProfile(rows: Row[], body: "setup" | "attack"): DiveProfile {
  const first = rows[0]!, last = rows.length - 1;
  const splashBirth = body === "setup" ? last - 50 : 16;
  const splash = newSprites(rows, splashBirth, "gDiveWaterSplashSpriteTemplate")[0]!;
  const droplets = newSprites(rows, splashBirth, "gSprayWaterDropletSpriteTemplate");
  const ball = body === "setup" ? newSprites(rows, 10, "gDiveBallSpriteTemplate")[0]! : splash;
  const impacts: DiveImpactProfile[] = body === "attack" ? Array.from({ length: 9 }, (_, index) => {
    const age = 30 + index * 4;
    const hit = newSprites(rows, age, "gWaterHitSplatSpriteTemplate")[0]!;
    const bubbles = newSprites(rows, age, "gSmallDriftingBubblesSpriteTemplate");
    return { ...allocation(rows[age]!, hit), bubbles: bubbles.map((bubble): DiveBubbleProfile => ({
      ...allocation(rows[age]!, bubble), velocityX: bubble.data[1], velocityY: bubble.data[2],
    })) as [DiveBubbleProfile, DiveBubbleProfile] };
  }) : [];
  const dropletsProfile = droplets.map((sprite): DiveDropletProfile => ({
    ...allocation(rows[splashBirth]!, sprite), velocityX: sprite.data[0],
    velocityY: sprite.data[1] + 32, direction: sprite.data[2],
  }));
  const slots = [...new Set([...(body === "setup" ? [ball.slot] : []), splash.slot,
    ...dropletsProfile.map((sprite) => sprite.slot),
    ...impacts.flatMap((impact) => [impact.slot, ...impact.bubbles.map((bubble) => bubble.slot)])])];
  return { firstInactiveAge: last, attackerSubpriority: first.battlerSprites.attacker.subpriority,
    targetSubpriority: first.battlerSprites.target.subpriority,
    ball: allocation(rows[body === "setup" ? 10 : splashBirth]!, ball),
    splash: allocation(rows[splashBirth]!, splash),
    droplets: dropletsProfile, impacts,
    spriteOrderSeed: rows[body === "setup" ? 9 : 15]!.spriteOrder
      .filter((slot: number) => slots.includes(slot)) };
}

function configFor(orientation: "player-back" | "opponent-front", body: "setup" | "attack",
  rows: Row[]): SceneOnDiveConfig {
  const first = rows[0]!, playerAttacker = orientation === "player-back";
  const battler = (species: SceneOnPresentationBattler["species"], side: "player" | "opponent",
    sprite: Row): SceneOnPresentationBattler => ({ species, geometry: {
      side, spriteCorner: { x: sprite.x - 32, y: sprite.y - 32 },
      animationCenter: { x: sprite.x, y: sprite.y },
      battlePositionCenter: side === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 },
    } });
  const attacker = first.battlerSprites.attacker, target = first.battlerSprites.target;
  return {
    move: "DIVE", body,
    attacker: battler("CHINCHOU", playerAttacker ? "player" : "opponent", attacker),
    target: battler("ONIX", playerAttacker ? "opponent" : "player", target),
    fieldProfile: {
      playerHp: first.parties.player[0].hp, playerMaxHp: first.parties.player[0].maxHp,
      opponentHp: first.parties.opponent[0].hp, opponentMaxHp: first.parties.opponent[0].maxHp,
      playerGender: first.parties.player[0].gender, opponentGender: first.parties.opponent[0].gender,
    },
    animationGeometry: {
      attackerCenter: { x: attacker.x, y: attacker.y }, targetCenter: { x: target.x, y: target.y },
      attackerPictureOffset: playerAttacker ? { x: 72, y: 80 } : { x: 176, y: 40 },
      targetPictureOffset: playerAttacker ? { x: 176, y: 40 } : { x: 72, y: 80 },
      attackerRestOffset: { x2: attacker.x2, y2: attacker.y2 },
      targetRestOffset: { x2: target.x2, y2: target.y2 },
    },
    animationProfile: makeProfile(rows, body),
  };
}

const hasTag = (row: Row, tag: number): boolean => row.tileTags.includes(tag)
  && row.paletteTags.includes(tag);
const signedBgOffset = (value: number, base: number): number => {
  const delta = (value - base + 512) % 512;
  return delta === 0 ? 0 : delta > 255 ? 512 - delta : -delta;
};

describe("MOVE_DIVE typed production boundary and retained state", () => {
  for (const orientation of ["player-back", "opponent-front"] as const) {
    for (const body of ["setup", "attack"] as const) it(`${orientation} ${body} ratchets every state row`, () => {
      const rows = bodyRows(orientation, body);
      const stage = createSceneOnMovePresentation(configFor(orientation, body, rows));
      const selectedBg = orientation === "player-back" ? "bg1hofs" : "bg2hofs";
      const baseBg = body === "attack" ? rows[63]!.registers[selectedBg] : 0;
      for (const [age, row] of rows.entries()) {
        const view = sceneOnDiveView({ ...stage, age });
        expect(view.scriptActive, `${age} script`).toBe(row.animScriptActive);
        expect(view.active, `${age} active`).toBe(age <= rows.length - 1);
        expect(view.attackerInvisible, `${age} attacker visibility`)
          .toBe(row.battlerSprites.attacker.invisible);
        expect(view.targetInvisible, `${age} target visibility`)
          .toBe(row.battlerSprites.target.invisible);
        expect(view.targetOffset, `${age} target offset`).toEqual({
          x2: row.battlerSprites.target.x2, y2: row.battlerSprites.target.y2,
        });
        expect(view.targetMonbg, `${age} monbg`).toBe(body === "attack" && age >= 14 && age < 87);
        expect(view.alpha ? [16192, 2060] : [0, 0], `${age} alpha`)
          .toEqual([row.registers.bldcnt, row.registers.bldalpha]);
        expect(view.selectedBgOffsetX, `${age} selected BG`)
          .toBe(body === "attack" && age >= 31 && age <= 63
            ? signedBgOffset(row.registers[selectedBg], baseBg) : 0);
        expect(view.resources, `${age} resources`).toEqual({
          splash: hasTag(row, 10272), sweatBead: hasTag(row, 10273),
          roundShadow: hasTag(row, 10156), waterImpact: hasTag(row, 10148),
          smallBubbles: hasTag(row, 10155),
        });
        for (const event of view.audio) {
          expect(row.audio.SE1.songHeaderIdentity.symbol, `${age} audio ${event.song}`)
            .toBe(event.song.toLowerCase());
        }
        if (age === rows.length - 1) {
          expect([view.scriptActive, view.ball, view.splash, view.droplets.length,
            view.impacts.length, view.bubbles.length]).toEqual([false, null, null, 0, 0, 0]);
          expect(Object.values(view.resources).every((loaded) => !loaded)).toBe(true);
        }
      }
    });
  }

  it("pins Dive's own OAM, affine, and palette hardware transfer classes", () => {
    const digest = (value: unknown): string => createHash("sha256")
      .update(JSON.stringify(value)).digest("hex");
    for (const orientation of ["player-back", "opponent-front"] as const) {
      for (const body of ["setup", "attack"] as const) {
        const rows = bodyRows(orientation, body);
        let oamMatches = 0, matrixMatches = 0, paletteMatches = 0;
        for (let age = 1; age < rows.length; age += 1) {
          const row = rows[age]!, prior = rows[age - 1]!;
          if (digest(row.hardwareOam) === digest(prior.softwareOam)) oamMatches += 1;
          if (digest(row.hardwareMatrices) === digest(prior.softwareMatrices)) matrixMatches += 1;
          if (digest(row.hardwarePalette) === digest(prior.fadedPalette)) paletteMatches += 1;
        }
        const expected = orientation === "player-back" && body === "setup"
          ? [116, 116, 117]
          : body === "attack" ? [92, 92, 91] : [114, 114, 114];
        expect([oamMatches, matrixMatches, paletteMatches], `${orientation} ${body}`)
          .toEqual(expected);
        if (orientation === "player-back" && body === "setup") {
          expect(digest(rows[68]!.hardwareOam)).toBe(digest(rows[66]!.softwareOam));
          expect(digest(rows[68]!.hardwareMatrices)).toBe(digest(rows[66]!.softwareMatrices));
        }
        if (body === "attack") {
          expect(digest(rows[13]!.hardwarePalette)).toBe(digest(rows[13]!.fadedPalette));
        }
      }
    }
  });

  it("routes altered live species, geometry, allocation, order, and RNG profile", () => {
    const rows = bodyRows("player-back", "attack"), base = configFor("player-back", "attack", rows);
    const altered: SceneOnDiveConfig = {
      ...base,
      attacker: { ...base.attacker, species: "ARON" }, target: { ...base.target, species: "GROVYLE" },
      animationGeometry: { ...base.animationGeometry,
        targetPictureOffset: { x: 53, y: 91 }, targetRestOffset: { x2: 7, y2: -3 } },
      animationProfile: { ...base.animationProfile,
        droplets: base.animationProfile.droplets.map((item, index, drops) => ({ ...item,
          slot: drops[drops.length - 1 - index]!.slot,
          persistentOrder: 50 - index, velocityX: item.velocityX + 17 + index })) },
    };
    const ordinary = sceneOnDiveView({ ...createSceneOnMovePresentation(base), age: 25 });
    const changed = sceneOnDiveView({ ...createSceneOnMovePresentation(altered), age: 25 });
    expect([changed.attacker.species, changed.target.species]).toEqual(["ARON", "GROVYLE"]);
    expect(changed.droplets.map((item) => [item.slot, item.persistentOrder, item.x, item.y, item.x2]))
      .not.toEqual(ordinary.droplets.map((item) => [item.slot, item.persistentOrder, item.x, item.y, item.x2]));
  });
});
