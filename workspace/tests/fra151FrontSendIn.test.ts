// fra151 (docs/fra151-front-send-in-animation.md): the Scene ON opponent send-in draws the species front animation
// (sAnim_<Name>_1 frame + the Anim_* callback motion) from the settled emerge; Scene OFF and the player side never launch it.
import { describe, expect, it } from "vitest";
import {
  MID_BATTLE_SWITCH_FRONT_ANIM_FRAME_START_ELAPSED,
  MID_BATTLE_SWITCH_FRONT_ANIM_MOTION_START_ELAPSED,
  midBattleSwitchInAt,
  midBattleSwitchInFrontAnimAt,
} from "../src/engine/battleResolutionPresentationRender.ts";
import { frontSendOutAffineAtTick, frontSendOutAnimationDelay, frontSendOutFrameAtTick } from "../src/animation/sendOutDispatcher.ts";
import { frontSendOutSpriteFrameAtTick } from "../src/animation/sendOutSpriteFrame.ts";

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
});
