import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createSceneOnMovePresentation,
  sceneOnAcidArmorView,
} from "../../src/animation/sceneOnPresentation.ts";

const source = readFileSync("reference/pokeemerald/data/battle_anim_scripts.s", "utf8");
const effects = readFileSync("reference/pokeemerald/src/battle_anim_effects_3.c", "utf8");
const sha256 = (path: string): string => createHash("sha256").update(readFileSync(path)).digest("hex");

const fixtures = [
  "tools/compare/fixtures/acid-armor-player-grimer-opponent-onix.json",
  "tools/compare/fixtures/acid-armor-opponent-grimer-player-onix.json",
] as const;

describe("MOVE_ACID_ARMOR source and dense evidence", () => {
  it("bounds the complete stock script and AnimTask_AcidArmor implementation", () => {
    const script = source.slice(source.indexOf("Move_ACID_ARMOR:"), source.indexOf("Move_SHARPEN:"));
    expect(script).toContain("monbg ANIM_ATTACKER");
    expect(script).toContain("setalpha 15, 0");
    expect(script).toContain("createvisualtask AnimTask_AcidArmor, 2, ANIM_ATTACKER");
    expect(script).toContain("playsewithpan SE_M_ACID_ARMOR, SOUND_PAN_ATTACKER");
    expect(script).toContain("blendoff");
    expect(script).toContain("clearmonbg ANIM_ATTACKER\n\tdelay 1\n\tend");
    const body = effects.slice(effects.indexOf("void AnimTask_AcidArmor(u8 taskId)"), effects.indexOf("void AnimTask_DeepInhale(u8 taskId)"));
    for (const token of [
      "REG_BG1HOFS", "REG_BG2HOFS", "SCANLINE_EFFECT_DMACNT_32BIT",
      "gScanlineEffectRegBuffers[gScanlineEffect.srcBuffer]", "gSineTable[sineIndex] >> 5",
      "task->data[6] > 63", "task->data[3] == 0 && task->data[4] == 16",
      "gScanlineEffect.state = 3", "task->data[3] == 16 && task->data[4] == 0",
      "DestroyAnimVisualTask(taskId)",
    ]) expect(body).toContain(token);
  });

  it("uses complete legal set-110 GRIMER parties and constrains choices only", () => {
    for (const fixturePath of fixtures) {
      const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));
      const scenario = JSON.parse(readFileSync(fixture.scenario, "utf8"));
      expect(scenario).toMatchObject({ mode: "mechanicLab", profile: "battle-scene-on", level: 50 });
      for (const side of ["player", "opponent"] as const) {
        expect(scenario.overrides.parties[side]).toHaveLength(3);
        for (const mon of scenario.overrides.parties[side]) {
          expect(mon).toHaveProperty("nature");
          expect(Object.keys(mon.ivs)).toHaveLength(6);
          expect(Object.keys(mon.evs)).toHaveLength(6);
          expect(mon.ppUps).toHaveLength(4);
          expect(mon).toMatchObject({ level: 50, shiny: false });
        }
      }
      const grimer = [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent]
        .find((mon) => mon.species === 88);
      expect(grimer.moves).toEqual([151, 151, 151, 151]);
      expect(fixture.sourceWindow).toMatchObject({ frameCount: 119 });
      expect(fixture.acceptance).toEqual({ status: "exact", componentMatching: 119, framebufferMatching: 119 });
    }
  });

  it("pins bilateral evidence, RGB, change maps, and the typed seam", () => {
    const expected = [
      ["a94ccd9090218b868e2230299f180677b8a3474e85b92e9c3799cdb7b3b92a36", "e7ddd013ffd7d7502cc7d5cd652ad15270fbe740810153ff6f225878e2289078", "b1763e4f0d6f5b908be656f29061a94fb3ce8c365635a4fe1e7d694a1f0f26c0"],
      ["67183490a1c1207dc9c976e2769e4edf462afb64dfee81ebcd5cccc2313ea772", "5092275e068f51d77e2d79c5c84a1b0bf5ec0e6472cbf136898d4ab1c3dbd9dd", "486f39c130d923ea81aa39ff01f0bd58c4f4fc5e3ea6fe6337cb3d6c0142b2b8"],
    ];
    fixtures.forEach((path, index) => {
      const fixture = JSON.parse(readFileSync(path, "utf8"));
      expect([fixture.evidenceSha256, fixture.rawRgbSha256, fixture.changeMapSha256]).toEqual(expected[index]);
      expect(sha256(fixture.changeMap)).toBe(fixture.changeMapSha256);
      const stage = createSceneOnMovePresentation(fixture);
      expect(sceneOnAcidArmorView({ ...stage, age: 4 })).toMatchObject({
        age: 4, taskActive: true, monbgActive: true,
        bg: fixture.orientation === "player-back" ? "BG2" : "BG1",
      });
    });
  });
});
