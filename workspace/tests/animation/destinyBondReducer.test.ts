import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  DESTINY_BOND_FIRST_INACTIVE_AGE,
  DESTINY_BOND_WHITE_SHADOW_TAG,
  destinyBondAtAge,
  destinyBondPaletteCoefficientAtAge,
  type DestinyBondLiveInputs,
} from "../../src/animation/destinyBond.ts";
import {
  sceneOnDestinyBondView,
  type SceneOnDestinyBondPresentationState,
} from "../../src/animation/sceneOnPresentation.ts";

const live = (overrides: Partial<DestinyBondLiveInputs> = {}): DestinyBondLiveInputs => ({
  attackerSide: "player",
  targetSide: "opponent",
  attackerSpecies: "WOBBUFFET",
  targetSpecies: "ONIX",
  attackerCenter: { x: 72, y: 94 },
  targetCenter: { x: 176, y: 44 },
  attackerBottom: 120,
  targetBottom: 74,
  attackerSpriteSlot: 0,
  whiteShadowSpriteSlot: 3,
  whiteShadowTaskSlot: 0,
  shakeTaskSlot: 1,
  paletteTaskSlot: 2,
  fadeTaskSlot: 0,
  clearMonBgTaskSlot: 0,
  whiteShadowTileSlot: 6,
  whiteShadowPaletteBank: 7,
  whiteShadowTileRange: [305, 32],
  matrixBitmap: 0,
  spriteOrder: [62, 60, 0, 63, 1, 61, 6, 8, 2, 3, 4],
  whiteShadowOrderIndex: 8,
  visibleObjPaletteBanks: [16, 17],
  excludedObjPaletteBanks: [18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31],
  ...overrides,
});

describe("MOVE_DESTINY_BOND source-age reducer", () => {
  it("replays both complete dense orientations twice through reducer and typed seam", () => {
    const summary = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/verifyDestinyBondReducer.ts",
    ], { encoding: "utf8" })) as Record<string, any>;
    for (const side of ["player-back", "opponent-front"]) {
      expect(summary[side]).toMatchObject({
        reducerRows: 188,
        seamRows: 188,
        lifecycle: {
          whiteShadow: "43..137", whiteShadowTask: "43..139", shake: "93..137",
          palette: "93..116 / 119..142", fade: "4..41 / 144..181", firstInactive: 187,
        },
        latches: {
          oam: "187/187 predecessor", matrices: "187/187 predecessor",
          whiteShadowHardwareRank: "11 ages 44..138",
        },
        cleanup: { age: 187, active: false, visualTasks: 0, sprites: 0, framebufferCompared: false },
      });
    }
  });

  it("ports the source cursor, resource lifetime, and first inactive cleanup", () => {
    expect(destinyBondAtAge(0, live())).toMatchObject({
      active: true,
      source: { pointerOffset: 0, wait: 0 },
      resources: { whiteShadow: { loaded: false, tag: null } },
    });
    expect(destinyBondAtAge(1, live()).resources.whiteShadow).toMatchObject({
      loaded: true, tag: DESTINY_BOND_WHITE_SHADOW_TAG, tileRange: [305, 32],
    });
    expect(destinyBondAtAge(43, live())).toMatchObject({
      source: { pointerOffset: 27, wait: 48 },
      registers: { bldcnt: 16192, bldalpha: 4096 },
      sprites: [{ kind: "white-shadow", slot: 3, x: 74, y: 119 }],
      audio: { events: [{ sound: "SE_M_CONFUSE_RAY" }] },
    });
    expect(destinyBondAtAge(DESTINY_BOND_FIRST_INACTIVE_AGE, live())).toMatchObject({
      active: false,
      source: { pointerOffset: 90, wait: 1 },
      sprites: [], tasks: [], registers: { bldcnt: 0, bldalpha: 0, bldy: 0 },
      resources: { whiteShadow: { loaded: false, tag: null } },
      cleanup: { firstInactive: true, visualTasks: 0, ownedSprites: 0 },
    });
  });

  it("keeps white-shadow, shake, palette, Ghost BG, and hardware latches source-relative", () => {
    expect(destinyBondAtAge(44, live()).displayTransfer).toMatchObject({
      oam: "preceding-software", matrices: "preceding-software",
      whiteShadowHardwareRank: "preceding-software-rank-11",
    });
    expect(destinyBondAtAge(93, live())).toMatchObject({
      attackerOffset: { x2: -2, y2: 0 },
      tasks: expect.arrayContaining([expect.objectContaining({ callback: "AnimTask_ShakeMonInPlace_Step" })]),
    });
    expect(destinyBondAtAge(94, live()).attackerOffset).toEqual({ x2: 2, y2: 0 });
    expect(destinyBondAtAge(138, live()).attackerOffset).toEqual({ x2: 0, y2: 0 });
    expect(destinyBondAtAge(23, live()).background).toMatchObject({
      vram: "ghost", vramEvent: "load-ghost", fadedPaletteBank2: "battle",
    });
    expect(destinyBondAtAge(25, live()).background).toMatchObject({
      fadedPaletteBank2: "ghost", hardwarePaletteBank2: "ghost", hardwareBank2Event: "load-ghost",
    });
    expect(destinyBondAtAge(163, live()).background.vramEvent).toBe("restore-battle");
    expect([94, 95, 97, 117, 119, 121, 143].map(destinyBondPaletteCoefficientAtAge))
      .toEqual([0, 1, 2, 12, 12, 11, 0]);
  });

  it("is deterministic and responds to live geometry, allocation, task, and order controls", () => {
    const first = destinyBondAtAge(50, live());
    expect(destinyBondAtAge(50, live())).toEqual(first);
    const altered = destinyBondAtAge(50, live({
      attackerSpecies: "MAGBY",
      targetSpecies: "NINETALES",
      attackerCenter: { x: 36, y: 101 },
      targetCenter: { x: 204, y: 35 },
      attackerBottom: 132,
      targetBottom: 61,
      whiteShadowSpriteSlot: 11,
      whiteShadowTaskSlot: 4,
      whiteShadowTileSlot: 9,
      whiteShadowPaletteBank: 13,
      matrixBitmap: 7,
      spriteOrder: [1, 4, 6, 9],
      whiteShadowOrderIndex: 2,
    }));
    expect(altered).not.toEqual(first);
    expect(altered.sprites[0]).toMatchObject({ slot: 11 });
    expect(altered.tasks).toEqual(expect.arrayContaining([
      expect.objectContaining({ slot: 4, callback: "AnimTask_DestinyBondWhiteShadow_Step" }),
    ]));
    expect(altered.sourceOrder).toEqual([1, 4, 11, 6, 9]);
    expect(altered.resources).toMatchObject({
      whiteShadow: { tileSlot: 9, paletteBank: 13 }, allocator: { matrixBitmap: 7 },
    });
  });

  it("routes the same live facts through the narrow typed Scene-ON seam", () => {
    const input = live();
    const { attackerSide: _attackerSide, targetSide: _targetSide,
      attackerSpecies: _attackerSpecies, targetSpecies: _targetSpecies,
      attackerCenter: _attackerCenter, targetCenter: _targetCenter, ...animationInputs } = input;
    const state = {
      age: 43,
      config: {
        move: "DESTINY_BOND",
        attacker: {
          species: "WOBBUFFET",
          geometry: {
            side: "player", spriteCorner: { x: 40, y: 72 },
            animationCenter: input.attackerCenter, battlePositionCenter: { x: 72, y: 94 },
          },
        },
        target: {
          species: "ONIX",
          geometry: {
            side: "opponent", spriteCorner: { x: 144, y: 16 },
            animationCenter: input.targetCenter, battlePositionCenter: { x: 176, y: 44 },
          },
        },
        fieldProfile: { kind: "default" },
        animationInputs,
      },
    } as unknown as SceneOnDestinyBondPresentationState;
    const view = sceneOnDestinyBondView(state);
    expect(view).toMatchObject({
      attacker: { species: "WOBBUFFET" }, target: { species: "ONIX" },
      sprites: [{ x: 74, y: 119 }], resources: { whiteShadow: { tag: 10188 } },
    });
  });
});
