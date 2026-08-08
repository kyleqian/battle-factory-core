import { describe, expect, it } from "vitest";
import {
  ironTailAtAge,
  ironTailSoundEventsAtAge,
} from "../../src/animation/ironTail.ts";
import {
  createSceneOnMovePresentation,
  sceneOnIronTailView,
} from "../../src/animation/sceneOnPresentation.ts";

const PLAYER = { attacker: { x: 72, y: 88 }, target: { x: 176, y: 42 } };
const OPPONENT = { attacker: { x: 176, y: 49 }, target: { x: 72, y: 80 } };

describe("Move_IRON_TAIL source-relative reducer", () => {
  it("stays static with the original palette until the grayscale write displays", () => {
    expect(ironTailAtAge(0, "player", PLAYER.attacker, PLAYER.target))
      .toMatchObject({ attackerX2: 0, targetX2: 0, hitsplatVisible: false });
    const beforeGray = ironTailAtAge(5, "player", PLAYER.attacker, PLAYER.target);
    expect(beforeGray.metallic.attackerGrayscale).toBe(true);
    expect(beforeGray.metallic.maskSpriteActive).toBe(false);
    expect(ironTailAtAge(11, "player", PLAYER.attacker, PLAYER.target)
      .metallic.maskSpriteActive).toBe(false);
  });

  it("shows the grayscale from the first step through set_original_pal", () => {
    expect(ironTailAtAge(6, "player", PLAYER.attacker, PLAYER.target)
      .metallic.attackerGrayscale).toBe(true);
    expect(ironTailAtAge(125, "player", PLAYER.attacker, PLAYER.target)
      .attackerPaletteRestored).toBe(false);
    expect(ironTailAtAge(126, "player", PLAYER.attacker, PLAYER.target)
      .attackerPaletteRestored).toBe(true);
  });

  it("renders exactly the two visible metallic-shine band sweeps", () => {
    // RAM truth: sweep 1 at ages 12..36 and sweep 2 at ages 44..68; the
    // shared one-display latch moves them to displayed ages 13..37/45..69.
    const band = (age: number) => ironTailAtAge(age, "player", PLAYER.attacker, PLAYER.target)
      .metallic.maskSpriteActive;
    expect(band(11)).toBe(false);
    expect(band(12)).toBe(true);
    expect(band(36)).toBe(true);
    expect(band(37)).toBe(false);
    expect(band(43)).toBe(false);
    expect(band(44)).toBe(true);
    expect(band(68)).toBe(true);
    // Sweep 3 and everything after is invisible (ClearBattleAnimBg ran).
    expect(band(69)).toBe(false);
    expect(band(100)).toBe(false);
    expect(band(120)).toBe(false);
  });

  it("marches the lunge out, holds, and returns, with the opponent negated", () => {
    const out = (age: number, side: "player" | "opponent") =>
      ironTailAtAge(age, side, side === "player" ? PLAYER.attacker : OPPONENT.attacker,
        side === "player" ? PLAYER.target : OPPONENT.target).attackerX2;
    expect(out(107, "player")).toBe(4);
    expect(out(110, "player")).toBe(16);
    expect(out(111, "player")).toBe(16);
    expect(out(112, "player")).toBe(16);
    expect(out(113, "player")).toBe(12);
    expect(out(116, "player")).toBe(0);
    expect(out(107, "opponent")).toBe(-4);
    expect(out(110, "opponent")).toBe(-16);
    expect(out(113, "opponent")).toBe(-12);
  });

  it("spawns the hitsplat one RAM frame after the lunge helper and the shake on the target", () => {
    expect(ironTailAtAge(114, "player", PLAYER.attacker, PLAYER.target)
      .hitsplatVisible).toBe(false);
    expect(ironTailAtAge(115, "player", PLAYER.attacker, PLAYER.target)
      .hitsplatVisible).toBe(true);
    expect(ironTailAtAge(124, "player", PLAYER.attacker, PLAYER.target)
      .hitsplatVisible).toBe(true);
    expect(ironTailAtAge(125, "player", PLAYER.attacker, PLAYER.target)
      .hitsplatVisible).toBe(false);
    // ShakeMon (3, 0, 6, 1): RAM x2 3,3,0,0,3,3,0,0 over ages 117..124.
    const x2 = (age: number) => ironTailAtAge(age, "player", PLAYER.attacker, PLAYER.target)
      .targetX2;
    expect(x2(117)).toBe(3);
    expect(x2(118)).toBe(3);
    expect(x2(119)).toBe(0);
    expect(x2(120)).toBe(0);
    expect(x2(121)).toBe(3);
    expect(x2(122)).toBe(3);
    expect(x2(123)).toBe(0);
    expect(x2(124)).toBe(0);
    expect(x2(125)).toBe(0);
  });

  it("holds monbg/setalpha over the contact body and cleans up at set_original_pal", () => {
    expect(ironTailAtAge(115, "player", PLAYER.attacker, PLAYER.target))
      .toMatchObject({ monbg: true, alpha: true });
    expect(ironTailAtAge(126, "player", PLAYER.attacker, PLAYER.target))
      .toMatchObject({ monbg: true, alpha: false, attackerPaletteRestored: true });
    expect(ironTailAtAge(133, "player", PLAYER.attacker, PLAYER.target))
      .toMatchObject({ monbg: false, alpha: false });
  });

  it("reports the looped HARDEN sound and the single VITAL_THROW2 hit sound", () => {
    expect(ironTailSoundEventsAtAge(10, "player", "opponent"))
      .toEqual([{ age: 10, song: "SE_M_HARDEN", pan: -64 }]);
    expect(ironTailSoundEventsAtAge(10, "opponent", "player"))
      .toEqual([{ age: 10, song: "SE_M_HARDEN", pan: 63 }]);
    expect(ironTailSoundEventsAtAge(115, "player", "opponent"))
      .toEqual([{ age: 115, song: "SE_M_VITAL_THROW2", pan: 63 }]);
    expect(ironTailSoundEventsAtAge(34, "player", "opponent")).toEqual([]);
  });

  it("exposes the same reducer through the relative Scene-ON presentation seam", () => {
    const state = createSceneOnMovePresentation({
      move: "IRON_TAIL",
      attacker: {
        species: "AZUMARILL",
        geometry: {
          side: "player",
          spriteCorner: { x: 40, y: 64 },
          animationCenter: PLAYER.attacker,
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
      target: {
        species: "ONIX",
        geometry: {
          side: "opponent",
          spriteCorner: { x: 144, y: 10 },
          animationCenter: PLAYER.target,
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      fieldProfile: {
        playerHp: 167,
        playerMaxHp: 175,
        opponentHp: 142,
        opponentMaxHp: 142,
      },
    });
    const view = sceneOnIronTailView({ ...state, age: 117 });
    expect(view).toMatchObject({
      age: 117,
      attackerX2: 0,
      targetX2: 3,
      hitsplatVisible: true,
      attackerPaletteRestored: false,
    });
    expect(view.metallic.maskSpriteActive).toBe(false);
  });
});
