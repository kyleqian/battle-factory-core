import { describe, expect, it } from "vitest";
import { meanLookAtAge } from "../../src/animation/meanLook.ts";
import { createSceneOnMovePresentation, sceneOnMeanLookView, type SceneOnMeanLookConfig } from "../../src/animation/sceneOnPresentation.ts";

describe("MOVE_MEAN_LOOK pure source-age reducer", () => {
  const target = { x: 176, y: 42 } as const;
  it("ports the complete eye callback lifecycle", () => {
    expect(meanLookAtAge(6, target, 30).eye).toBeNull();
    expect(meanLookAtAge(7, target, 30).eye).toMatchObject({ callback: "step1-alpha-pulse", xScale: 352, yScale: 408, alpha: 5, invisible: false, subpriority: 28 });
    expect(meanLookAtAge(77, target, 30).eye).toMatchObject({ xScale: 72, yScale: 128 });
    expect(meanLookAtAge(78, target, 30).eye).toMatchObject({ callback: "step2-hidden-grow", xScale: 48, invisible: true });
    expect(meanLookAtAge(89, target, 30).eye).toMatchObject({ xScale: 80, yScale: 80, invisible: false });
    expect(meanLookAtAge(94, target, 30).eye).toMatchObject({ xScale: 240, yScale: 240 });
    expect(meanLookAtAge(96, target, 30).eye).toMatchObject({ callback: "step3-wobble", x2: 0, y2: 0 });
    expect(meanLookAtAge(97, target, 30).eye).toMatchObject({ x2: 1, y2: 0 });
    expect(meanLookAtAge(103, target, 30).eye).toMatchObject({ x2: 0, y2: -1 });
    expect(meanLookAtAge(113, target, 30).eye).toMatchObject({ callback: "step4-alpha-fade", alpha: 16 });
    expect(meanLookAtAge(161, target, 30).eye).toMatchObject({ alpha: 0, invisible: true });
    expect(meanLookAtAge(165, target, 30).eye).not.toBeNull();
    expect(meanLookAtAge(166, target, 30).eye).toBeNull();
  });
  it("pins script, monbg, palette-phase and inactive cleanup edges", () => {
    expect(meanLookAtAge(0, target, 30)).toMatchObject({ active: true, sourceOffset: 0, monBgTargetCopy: false });
    expect(meanLookAtAge(4, target, 30)).toMatchObject({ sourceOffset: 5, monBgTargetCopy: true });
    expect(meanLookAtAge(8, target, 30)).toMatchObject({ fieldBlackCoefficient: 0, eyeBlendAlpha: 5 });
    expect(meanLookAtAge(9, target, 30)).toMatchObject({ fieldBlackCoefficient: 2, eyeBlendAlpha: 6 });
    expect(meanLookAtAge(30, target, 30).fieldPalette).toBe("black");
    expect(meanLookAtAge(30, target, 30).fieldBlackCoefficient).toBe(16);
    expect(meanLookAtAge(129, target, 30)).toMatchObject({ sourceOffset: 65, fieldPalette: "fade-from-black" });
    expect(meanLookAtAge(129, target, 30).eyeBlendAlpha).toBe(12);
    expect(meanLookAtAge(161, target, 30).eyeBlendAlpha).toBe(1);
    expect(meanLookAtAge(160, target, 30).fieldBlackCoefficient).toBe(0);
    expect(meanLookAtAge(164, target, 30).monBgTargetCopy).toBe(false);
    expect(meanLookAtAge(170, target, 30)).toMatchObject({ active: false, sourceOffset: 68, eye: null });
  });
  it("exposes live geometry through the typed Scene-ON seam", () => {
    const config: SceneOnMeanLookConfig = {
      move: "MEAN_LOOK",
      attacker: { species: "MURKROW", geometry: { side: "player", spriteCorner: { x: 40, y: 56 }, animationCenter: { x: 72, y: 88 }, battlePositionCenter: { x: 72, y: 80 } } },
      target: { species: "ONIX", geometry: { side: "opponent", spriteCorner: { x: 144, y: 10 }, animationCenter: { x: 176, y: 42 }, battlePositionCenter: { x: 176, y: 40 } } },
      fieldProfile: { playerHp: 100, playerMaxHp: 100, opponentHp: 100, opponentMaxHp: 100 },
      animationProfile: { targetSubpriority: 30 },
    };
    expect(sceneOnMeanLookView({ ...createSceneOnMovePresentation(config), age: 7 })).toMatchObject({ target: { species: "ONIX" }, eye: { x: 176, y: 42, subpriority: 28 } });
  });
});
