import { describe, expect, it } from "vitest";
import {
  EMBER_FLARE_SPAWN_COUNT,
  EMBER_SPAWN_COUNT,
  emberFlareSpritesAtAge,
  emberSpritesAtAge,
  emberSpritesInDrawOrder,
  type EmberGeometry,
} from "../src/engine/ember.ts";
import emberProbe from "../src/data/gen/ember-sprite-probe.json" with { type: "json" };
import emberProbeOpponent from "../src/data/gen/ember-sprite-probe-opponent.json" with { type: "json" };

// RAM-probe evidence (`tools/probe/run-battle-lab-rgb.py` extended with
// `gEmberSpriteTemplate`/`gEmberFlareSpriteTemplate` capture, staged via
// `tools/battle-lab/mechanic-ember-player-onix-opponent-murkrow.json`,
// MOVE_EMBER cast player ONIX -> opponent MURKROW): every real RAM tick both
// sprite families are alive, trimmed to `src/data/gen/ember-sprite-probe.json`.
// This is dev-time-only test evidence (the executable-frontier ratchet
// forbids production imports of `*-probe.json`); `src/engine/ember.ts`
// derives every field from the ported `TranslateAnimSpriteToTargetMonLocation`/
// `AnimTravelDiagonally` -> `StartAnimLinearTranslation` chain, not from
// replaying this table.

interface ProbeSprite {
  readonly slot: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly tileNum: number;
  readonly subpriority: number;
}

interface ProbeFrame {
  readonly frame: number;
  readonly emberSprites: readonly ProbeSprite[];
  readonly emberFlareSprites: readonly ProbeSprite[];
}

const PROBE = emberProbe as { readonly frames: readonly ProbeFrame[] };
const SPAWN_TICK = PROBE.frames[0]!.frame;

// ONIX (player, animationCenter {72,88}) -> MURKROW (opponent-front,
// animationCenter.x 176, battlePositionCenter {176,40}) - the same pair/
// geometry constants DRAGON_BREATH/FLAMETHROWER/THUNDER_PUNCH's own staged
// fixtures already establish for this species pair (`sceneOnPresentation.ts`).
const GEOMETRY: EmberGeometry = {
  attackerCenter: { x: 72, y: 88 },
  targetCenter: { x: 176, y: 42 },
  targetBattlePosition: { x: 176, y: 40 },
  attackerSide: "player",
  targetSubpriority: 40,
};

// Cross-check, opposite orientation (opponent ONIX -> player MURKROW,
// RAM-probed separately): confirms the attacker-side sign rules for both
// `startX`'s side-signed offset and the target-x-offset negation, not just
// the player-attacker branch the dense fixture above exercises.
const OPPOSITE_GEOMETRY: EmberGeometry = {
  attackerCenter: { x: 176, y: 42 },
  targetCenter: { x: 72, y: 88 },
  targetBattlePosition: { x: 72, y: 80 },
  attackerSide: "opponent",
  targetSubpriority: 30,
};

function centerFromProbe(sprite: ProbeSprite): { x: number; y: number } {
  return { x: sprite.x + sprite.x2, y: sprite.y + sprite.y2 };
}

describe("emberSpritesAtAge", () => {
  it("matches every RAM-probed ember tick, both spawn slot and position", () => {
    let checkedRows = 0;
    for (const row of PROBE.frames) {
      if (row.emberSprites.length === 0) continue;
      const age = row.frame - SPAWN_TICK;
      const sprites = emberSpritesAtAge(age, GEOMETRY);
      expect(sprites.length).toBe(row.emberSprites.length);
      const bySlotOrder = [...row.emberSprites].sort((a, b) => a.slot - b.slot);
      for (let index = 0; index < bySlotOrder.length; index += 1) {
        const expected = centerFromProbe(bySlotOrder[index]!);
        const actual = sprites[index]!;
        expect({ x: actual.centerX, y: actual.centerY }).toEqual(expected);
        expect(actual.subpriority).toBe(bySlotOrder[index]!.subpriority);
      }
      checkedRows += 1;
    }
    expect(checkedRows).toBeGreaterThan(0);
  });

  it("spawns exactly EMBER_SPAWN_COUNT sprites across the burst", () => {
    const seen = new Set<number>();
    for (let age = 0; age < 40; age += 1) {
      for (const sprite of emberSpritesAtAge(age, GEOMETRY)) seen.add(sprite.spawnIndex);
    }
    expect(seen.size).toBe(EMBER_SPAWN_COUNT);
  });
});

describe("emberFlareSpritesAtAge", () => {
  it("matches every RAM-probed flare tick, both frame cycle and position", () => {
    let checkedRows = 0;
    for (const row of PROBE.frames) {
      if (row.emberFlareSprites.length === 0) continue;
      const age = row.frame - SPAWN_TICK;
      const sprites = emberFlareSpritesAtAge(age, GEOMETRY);
      expect(sprites.length).toBe(row.emberFlareSprites.length);
      const bySlotOrder = [...row.emberFlareSprites].sort((a, b) => a.slot - b.slot);
      for (let index = 0; index < bySlotOrder.length; index += 1) {
        const expected = centerFromProbe(bySlotOrder[index]!);
        const actual = sprites[index]!;
        expect({ x: actual.centerX, y: actual.centerY }).toEqual(expected);
        expect(actual.subpriority).toBe(bySlotOrder[index]!.subpriority);
        const expectedFrame = (bySlotOrder[index]!.tileNum - 537) / 16;
        expect(actual.sheetFrame).toBe(expectedFrame);
      }
      checkedRows += 1;
    }
    expect(checkedRows).toBeGreaterThan(0);
  });

  it("spawns exactly EMBER_FLARE_SPAWN_COUNT sprites across the burst", () => {
    const seen = new Set<number>();
    for (let age = 0; age < 80; age += 1) {
      for (const sprite of emberFlareSpritesAtAge(age, GEOMETRY)) seen.add(sprite.spawnIndex);
    }
    expect(seen.size).toBe(EMBER_FLARE_SPAWN_COUNT);
  });
});

describe("opposite orientation (opponent ONIX -> player MURKROW)", () => {
  const OPPONENT_PROBE = emberProbeOpponent as { readonly frames: readonly ProbeFrame[] };
  const OPPONENT_SPAWN_TICK = OPPONENT_PROBE.frames[0]!.frame;

  it("matches every RAM-probed ember and flare tick with the sign rules flipped", () => {
    let checkedRows = 0;
    for (const row of OPPONENT_PROBE.frames) {
      const age = row.frame - OPPONENT_SPAWN_TICK;
      if (row.emberSprites.length > 0) {
        const sprites = emberSpritesAtAge(age, OPPOSITE_GEOMETRY);
        expect(sprites.length).toBe(row.emberSprites.length);
        const bySlotOrder = [...row.emberSprites].sort((a, b) => a.slot - b.slot);
        for (let index = 0; index < bySlotOrder.length; index += 1) {
          expect({ x: sprites[index]!.centerX, y: sprites[index]!.centerY })
            .toEqual(centerFromProbe(bySlotOrder[index]!));
          expect(sprites[index]!.subpriority).toBe(bySlotOrder[index]!.subpriority);
        }
        checkedRows += 1;
      }
      if (row.emberFlareSprites.length > 0) {
        const sprites = emberFlareSpritesAtAge(age, OPPOSITE_GEOMETRY);
        expect(sprites.length).toBe(row.emberFlareSprites.length);
        const bySlotOrder = [...row.emberFlareSprites].sort((a, b) => a.slot - b.slot);
        for (let index = 0; index < bySlotOrder.length; index += 1) {
          expect({ x: sprites[index]!.centerX, y: sprites[index]!.centerY })
            .toEqual(centerFromProbe(bySlotOrder[index]!));
          expect(sprites[index]!.subpriority).toBe(bySlotOrder[index]!.subpriority);
        }
        checkedRows += 1;
      }
    }
    expect(checkedRows).toBeGreaterThan(0);
  });
});

describe("emberSpritesInDrawOrder", () => {
  it("paints the larger screen-y sprite last (frontmost) on overlap", () => {
    // Ages 30-32: the third ember (age 18-20, still alive) overlaps the
    // first flare (age 0-2) - RAM-probe-confirmed overlap window.
    for (const age of [30, 31, 32]) {
      const ordered = emberSpritesInDrawOrder(age, GEOMETRY);
      expect(ordered.length).toBe(2);
      expect(ordered[0]!.centerY).toBeLessThanOrEqual(ordered[1]!.centerY);
      expect(ordered[1]!.kind).toBe("ember");
    }
  });
});
