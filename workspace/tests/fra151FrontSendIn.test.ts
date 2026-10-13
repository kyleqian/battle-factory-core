// fra151 (docs/fra151-front-send-in-animation.md): the Scene ON opponent send-in draws the species front animation
// (sAnim_<Name>_1 frame + the Anim_* callback motion) from the settled emerge; Scene OFF and the player side never launch it.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  MID_BATTLE_SWITCH_FRONT_ANIM_FRAME_START_ELAPSED,
  MID_BATTLE_SWITCH_FRONT_ANIM_MOTION_START_ELAPSED,
  midBattleSwitchInAt,
  midBattleSwitchInFrontAnimAt,
} from "../src/engine/battleResolutionPresentationRender.ts";
import {
  FRONT_SEND_OUT_INITIALIZER_ONLY_TICKS, frontSendOutAffineAtTick, frontSendOutAnimationDelay, frontSendOutFrameAtTick,
  frontSendOutInitializerTicks, frontSendOutPaletteAtTick,
} from "../src/animation/sendOutDispatcher.ts";
import { frontSendOutSpriteFrameAtTick } from "../src/animation/sendOutSpriteFrame.ts";
import { speciesFrontIdleRestOffsetOrZero } from "../src/animation/speciesIdleAnim.ts";

describe("fra151 Scene ON opponent send-in front animation", () => {
  it("starts the sAnim_<Name>_1 program at el 34 and the Anim_* motion at el 35 (+ delay - 1)", () => {
    expect(MID_BATTLE_SWITCH_FRONT_ANIM_FRAME_START_ELAPSED).toBe(34);
    expect(MID_BATTLE_SWITCH_FRONT_ANIM_MOTION_START_ELAPSED).toBe(35);
    expect(midBattleSwitchInFrontAnimAt("TAILLOW", 33)).toBeNull();
    for (let e = 34; e < 120; e += 1) {
      const s = midBattleSwitchInFrontAnimAt("TAILLOW", e)!;
      expect(s.frame).toBe(frontSendOutSpriteFrameAtTick("TAILLOW", e - 34));
      const motion = e - 35;
      expect([s.x2, s.y2]).toEqual(motion < 0 ? [0, 0] : [frontSendOutFrameAtTick("TAILLOW", motion)!.x2, frontSendOutFrameAtTick("TAILLOW", motion)!.y2]);
    }
    // SALAMENCE: delay 70 -> the H_SHAKE callback launches 69 frames after the sprite animation's motion anchor.
    expect(frontSendOutAnimationDelay("SALAMENCE")).toBe(70);
    expect(midBattleSwitchInFrontAnimAt("SALAMENCE", 35 + 68)).toMatchObject({ x2: 0, y2: 0 });
    const first = frontSendOutFrameAtTick("SALAMENCE", 0)!;
    expect(midBattleSwitchInFrontAnimAt("SALAMENCE", 35 + 69)).toMatchObject({ x2: first.x2, y2: first.y2 });
  });

  it("leaves ONIX (RAPID_H_HOPS) at its terminal x2 = +1 after the motion", () => {
    expect(midBattleSwitchInFrontAnimAt("ONIX", 35 + 85)).toMatchObject({ x2: 1, y2: 0 });
    expect(midBattleSwitchInFrontAnimAt("ONIX", 400)).toMatchObject({ x2: 1, y2: 0, frame: 0, matrix: null });
  });

  it("carries the double-size OAM matrix of an affine family (SPHEAL Anim_Spin) and none at rest", () => {
    expect(frontSendOutAnimationDelay("SPHEAL")).toBe(15);
    const mid = midBattleSwitchInFrontAnimAt("SPHEAL", 35 + 14 + 10)!;
    expect(mid.matrix).not.toBeNull();
    expect(mid.matrix).toEqual(frontSendOutAffineAtTick("SPHEAL", 10));
    expect(midBattleSwitchInFrontAnimAt("SPHEAL", 400)!.matrix).toBeNull();
    // A pure-translation family never carries a matrix.
    for (let t = 0; t < 40; t += 1) expect(frontSendOutAffineAtTick("TAILLOW", t)).toBeNull();
  });

  it("is only launched for the opponent with a species (Scene ON tail); the release tint ramps one frame earlier there", () => {
    const on = midBattleSwitchInAt(40, 1, 70, "TAILLOW");
    const off = midBattleSwitchInAt(40, 1);
    const player = midBattleSwitchInAt(40, 0, undefined, "TAILLOW");
    expect(on.frontAnim).not.toBeNull();
    expect(off.frontAnim).toBeNull();
    expect(player.frontAnim).toBeNull();
    // Release tint: 16 through local 21 (el 40), then 15 -> 0 (Scene ON); Scene OFF keeps 16 through local 22.
    expect(midBattleSwitchInAt(40, 1, 70, "TAILLOW").monTintCoefficient).toBe(16);
    expect(midBattleSwitchInAt(41, 1, 70, "TAILLOW").monTintCoefficient).toBe(15);
    expect(midBattleSwitchInAt(56, 1, 70, "TAILLOW").monTintCoefficient).toBe(0);
    expect(midBattleSwitchInAt(41, 1).monTintCoefficient).toBe(16);
    expect(midBattleSwitchInAt(42, 1).monTintCoefficient).toBe(15);
  });

  it("delays the install-only initializers (Anim_BackAndLunge / Figure8 / RotateUpSlamDown) by one frame", () => {
    expect(FRONT_SEND_OUT_INITIALIZER_ONLY_TICKS).toEqual({ BACK_AND_LUNGE: 1, FIGURE_8: 1, ROTATE_UP_SLAM_DOWN: 1 });
    expect(frontSendOutInitializerTicks("RATICATE")).toBe(1);
    expect(frontSendOutInitializerTicks("PIDGEOT")).toBe(0);
    expect(midBattleSwitchInFrontAnimAt("RATICATE", 35)).toMatchObject({ x2: 0, y2: 0 });
    const tick0 = frontSendOutFrameAtTick("RATICATE", 0)!;
    expect(midBattleSwitchInFrontAnimAt("RATICATE", 36)).toMatchObject({ x2: tick0.x2, y2: tick0.y2 });
    // GOLEM: the first RotateUpSlamDown_0 write (rotation 0xff00) shows at el 36 (ROM 0 px).
    expect(midBattleSwitchInFrontAnimAt("GOLEM", 36)!.matrix).toEqual([255, 6, -6, 255]);
  });

  it("shows sMonAffineAnims' identity on the HandleStartAffineAnim tick and keeps the last matrix write", () => {
    expect(frontSendOutAffineAtTick("KINGDRA", 0)).toEqual([256, 0, 0, 256]);
    expect(frontSendOutAffineAtTick("HERACROSS", 0)).toEqual([256, 0, 0, 256]);
    expect(frontSendOutAffineAtTick("HERACROSS", 1)).toEqual([244, 0, 0, 244]);
    // RotateUpSlamDown_1 writes no rotation: the last written one persists.
    expect(frontSendOutAffineAtTick("GOLEM", 20)).toEqual(frontSendOutAffineAtTick("GOLEM", 19));
    // V_STRETCH is reduced with sDontFlip TRUE (positive xScale).
    expect(frontSendOutAffineAtTick("ARBOK", 20)![0]).toBeGreaterThan(0);
  });

  it("models the glow palette under the release fade task and the flicker visibility", () => {
    // GASTLY (GLOW_BLACK): the plain palette over the held tint at el 35..39, the tint ramp at 40..56, the glow from 57.
    expect(midBattleSwitchInAt(35, 1, 166, "GASTLY")).toMatchObject({ monTintCoefficient: 0, frontAnim: { blend: { coefficient: 0 } } });
    expect(midBattleSwitchInAt(40, 1, 166, "GASTLY")).toMatchObject({ monTintCoefficient: 16, frontAnim: { blend: null } });
    expect(midBattleSwitchInAt(56, 1, 166, "GASTLY")).toMatchObject({ monTintCoefficient: 0, frontAnim: { blend: null } });
    expect(midBattleSwitchInAt(57, 1, 166, "GASTLY")).toMatchObject({ monTintCoefficient: 0, frontAnim: { blend: { coefficient: 8, color: 0 } } });
    expect(frontSendOutPaletteAtTick("HAUNTER", 1).invisible).toBe(true);
    expect(frontSendOutPaletteAtTick("HAUNTER", 2).invisible).toBe(false);
    expect(frontSendOutPaletteAtTick("TAILLOW", 10)).toEqual({ invisible: false, blend: null });
  });

  it("settles every Factory species at the rest the live movers read and the ROM measured (R3)", () => {
    // tools/integration/fixtures/x2-history/species-rest-x2.json: direct mGBA, 376 species, opponent front x2 / y2 at the first body.
    const rom = JSON.parse(readFileSync("tools/integration/fixtures/x2-history/species-rest-x2.json", "utf8")).all as
      Record<string, { opponentFront: { x2: number; y2: number } }>;
    expect(Object.keys(rom)).toHaveLength(376);
    for (const [species, measured] of Object.entries(rom)) {
      const settled = midBattleSwitchInFrontAnimAt(species, 400)!;
      const idle = speciesFrontIdleRestOffsetOrZero(species);
      expect([species, settled.x2, settled.y2]).toEqual([species, idle.x2, idle.y2]);
      expect([species, settled.x2, settled.y2]).toEqual([species, measured.opponentFront.x2, measured.opponentFront.y2]);
      expect([species, settled.frame, settled.invisible]).toEqual([species, 0, false]);
      expect(settled.matrix === null || settled.matrix.join() === "256,0,0,256").toBe(true);
      expect(settled.blend === null || settled.blend.coefficient === 0).toBe(true);
    }
  });
});
