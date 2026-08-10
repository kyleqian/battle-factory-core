import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  NIGHT_SHADE_FRAME_COUNT,
  nightShadeAtAge,
  nightShadeBackgroundBldy,
  nightShadeBackgroundIsGhost,
} from "../../src/animation/nightShade.ts";

describe("MOVE_NIGHT_SHADE source-relative reducer", () => {
  it("pins the complete source body and lowest legal Level-50 carrier", () => {
    const source = readFileSync("reference/pokeemerald/data/battle_anim_scripts.s", "utf8");
    const body = source.slice(source.indexOf("Move_NIGHT_SHADE:"), source.indexOf("Move_EGG_BOMB:"));
    expect(body).toContain("createvisualtask AnimTask_NightShadeClone, 5, 85");
    expect(body).toContain("createvisualtask AnimTask_ShakeMon2, 2, ANIM_TARGET, 2, 0, 12, 1");
    expect(body).toContain("blend_color_cycle priority=2, selector=F_PAL_TARGET, delay=0, num_blends=2, initial_blend_y=0, target_blend_y=13, color=RGB_BLACK");
    const scenario = JSON.parse(readFileSync("tools/battle-lab/mechanic-night-shade-player-ariados-opponent-onix.json", "utf8"));
    expect(scenario.playerSetIds[0]).toBe(160);
    expect(scenario.overrides.parties.player[0]).toMatchObject({ species: 168, moves: [101, 101, 101, 101] });
    expect(scenario.overrides.parties.player).toHaveLength(3);
    expect(scenario.overrides.parties.opponent).toHaveLength(3);
  });

  it("ports fade, clone alpha/matrix, target shake/blend, and cleanup", () => {
    expect(NIGHT_SHADE_FRAME_COUNT).toBe(228);
    expect(nightShadeAtAge(55)).toMatchObject({ cloneTaskActive: true, cloneMatrix: 256, cloneAlpha: { eva: 0, evb: 16 } });
    expect(nightShadeAtAge(56).cloneMatrix).toBe(128);
    expect(nightShadeAtAge(58).cloneAlpha).toEqual({ eva: 1, evb: 15 });
    expect(nightShadeAtAge(82).cloneAlpha).toEqual({ eva: 9, evb: 7 });
    expect(nightShadeAtAge(128)).toMatchObject({ targetX2: 2, targetBlackCoeff: 0 });
    expect(nightShadeAtAge(130)).toMatchObject({ targetX2: -2, targetBlackCoeff: 2 });
    expect(nightShadeAtAge(169).cloneMatrix).toBe(136);
    expect(nightShadeAtAge(183)).toMatchObject({ cloneTaskActive: false, cloneMatrix: 248, cloneAlpha: { eva: 0, evb: 0 } });
    expect(nightShadeAtAge(184).cloneMatrix).toBe(256);
    expect(nightShadeBackgroundBldy(190)).toBe(1);
    expect(nightShadeBackgroundIsGhost(22)).toBe(true);
    expect(nightShadeAtAge(228).active).toBe(false);
  });
});
