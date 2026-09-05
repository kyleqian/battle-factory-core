import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  diveAtAge,
  type DiveAllocation,
  type DiveBubbleProfile,
  type DiveDropletProfile,
  type DiveGeometry,
  type DiveImpactProfile,
  type DiveProfile,
} from "../../src/animation/dive.ts";

const root = resolve(import.meta.dirname, "../..");
const fixture = JSON.parse(readFileSync(resolve(root,
  "tools/compare/fixtures/dive-evidence.json"), "utf8")) as Record<string, any>;
type Row = Record<string, any>;
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
  return { firstInactiveAge: last,
    attackerSubpriority: first.battlerSprites.attacker.subpriority,
    targetSubpriority: first.battlerSprites.target.subpriority,
    ball: allocation(rows[body === "setup" ? 10 : splashBirth]!, ball),
    splash: allocation(rows[splashBirth]!, splash),
    droplets: dropletsProfile, impacts,
    spriteOrderSeed: rows[body === "setup" ? 9 : 15]!.spriteOrder
      .filter((slot: number) => slots.includes(slot)) };
}

function geometry(rows: Row[]): DiveGeometry {
  const first = rows[0]!, attacker = first.battlerSprites.attacker;
  const target = first.battlerSprites.target;
  const attackerPictureOffset = attacker.x < 128 ? { x: 72, y: 80 } : { x: 176, y: 40 };
  const targetPictureOffset = target.x < 128 ? { x: 72, y: 80 } : { x: 176, y: 40 };
  return { attackerCenter: { x: attacker.x, y: attacker.y },
    targetCenter: { x: target.x, y: target.y },
    attackerPictureOffset, targetPictureOffset,
    attackerRestOffset: { x2: attacker.x2, y2: attacker.y2 },
    targetRestOffset: { x2: target.x2, y2: target.y2 } };
}

function expectedSprites(row: Row, template: string): Row[] {
  return row.sprites.filter((sprite: Row) => symbol(sprite) === template);
}

describe("Dive source-relative reducer checkpoint", () => {
  for (const orientation of ["player-back", "opponent-front"] as const) {
    for (const body of ["setup", "attack"] as const) it(`${orientation} ${body} reproduces every retained component row`, () => {
      const rows = bodyRows(orientation, body), profile = makeProfile(rows, body);
      const geo = geometry(rows), side = orientation === "player-back" ? "player" : "opponent";
      for (const [age, row] of rows.entries()) {
        const state = diveAtAge(age, body, side, geo, profile);
        const actual = [state.ball, state.splash, ...state.droplets, ...state.impacts, ...state.bubbles]
          .filter((sprite): sprite is NonNullable<typeof sprite> => sprite !== null);
        const source = row.sprites.filter((sprite: Row) => /gDiveBall|gDiveWaterSplash|gSprayWaterDroplet|gWaterHitSplat|gSmallDriftingBubbles/.test(symbol(sprite) ?? ""));
        expect(actual.length, `age ${age} count`).toBe(source.length);
        for (const sprite of actual) {
          const template = sprite.kind === "ball" ? "gDiveBallSpriteTemplate"
            : sprite.kind === "splash" ? "gDiveWaterSplashSpriteTemplate"
              : sprite.kind === "droplet" ? "gSprayWaterDropletSpriteTemplate"
                : sprite.kind === "impact" ? "gWaterHitSplatSpriteTemplate"
                  : "gSmallDriftingBubblesSpriteTemplate";
          const match = expectedSprites(row, template).find((item) => item.slot === sprite.slot);
          expect(match, `age ${age} ${sprite.kind} slot ${sprite.slot}`).toBeTruthy();
          if (!match) throw new Error(`missing age ${age} ${sprite.kind} slot ${sprite.slot}`);
          expect([sprite.x, sprite.y, sprite.x2, sprite.y2, sprite.subpriority, sprite.matrixNum],
            `age ${age} ${sprite.kind} slot ${sprite.slot}`).toEqual(
            [match.x, match.y, match.x2, match.y2, match.subpriority, match.matrixNum]);
          if ("matrix" in sprite) expect(sprite.matrix, `age ${age} ${sprite.kind} matrix`)
            .toEqual(match.matrix);
          if (sprite.kind === "ball") expect(sprite.invisible, `age ${age} ball visibility`)
            .toBe(match.invisible);
        }
        const activeSlots = new Set(actual.map((sprite) => sprite.slot));
        expect(state.hardwareOrder, `age ${age} stable hardware order`)
          .toEqual(row.spriteOrder.filter((slot: number) => activeSlots.has(slot)));
        expect(state.scriptActive, `age ${age} script`).toBe(row.animScriptActive);
      }
    });
  }

  it("responds to altered geometry, allocation, and random-derived velocities", () => {
    const rows = bodyRows("player-back", "attack"), base = makeProfile(rows, "attack");
    const altered = { ...base, droplets: base.droplets.map((drop, index, drops) => ({ ...drop,
      slot: drops[drops.length - 1 - index]!.slot, velocityX: drop.velocityX + index + 17 })) };
    const geo = geometry(rows), moved = { ...geo,
      targetPictureOffset: { x: geo.targetPictureOffset.x - 31, y: geo.targetPictureOffset.y + 19 } };
    const ordinary = diveAtAge(25, "attack", "player", geo, base);
    const changed = diveAtAge(25, "attack", "player", moved, altered);
    expect(changed.droplets.map((drop) => drop.slot)).not.toEqual(ordinary.droplets.map((drop) => drop.slot));
    expect(changed.droplets.map((drop) => [drop.x, drop.y, drop.x2]))
      .not.toEqual(ordinary.droplets.map((drop) => [drop.x, drop.y, drop.x2]));
  });

  it("preserves the live seed only for exact-Y ties instead of fitting named ages", () => {
    const rows = bodyRows("player-back", "attack"), base = makeProfile(rows, "attack");
    const geo = geometry(rows), first = base.impacts[0]!;
    const tied = { ...base, impacts: [{ ...first, bubbles: [
      first.bubbles[0], { ...first.bubbles[1],
        velocityX: first.bubbles[0].velocityX, velocityY: first.bubbles[0].velocityY },
    ] }, ...base.impacts.slice(1)] } satisfies DiveProfile;
    const swappedSeed = tied.spriteOrderSeed.slice();
    const left = swappedSeed.indexOf(first.bubbles[0].slot);
    const right = swappedSeed.indexOf(first.bubbles[1].slot);
    [swappedSeed[left], swappedSeed[right]] = [swappedSeed[right]!, swappedSeed[left]!];
    const ordinary = diveAtAge(30, "attack", "player", geo, tied).hardwareOrder;
    const swapped = diveAtAge(30, "attack", "player", geo,
      { ...tied, spriteOrderSeed: swappedSeed }).hardwareOrder;
    expect(swapped).not.toEqual(ordinary);
    expect(new Set(swapped)).toEqual(new Set(ordinary));
  });
});
