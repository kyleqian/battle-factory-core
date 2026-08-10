import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import coverage from "../../ANIMATION_COVERAGE.json" with { type: "json" };

interface Receipt {
  scenario: string; changeMap: string; orientation: string;
  activeSourceScriptWindow: { startFrame: number; endFrame: number; frameCount: number };
  sourceAnimationWindow: { startFrame: number; endFrame: number; frameCount: number };
  sourceBounds: { start: string; endExclusive: string; cleanupOffset: number };
  probeJsonSha256: string; evidenceSha256: string; rawRgbSha256: string;
  changeMapSha256: string; freshRuns: number; freshProbeAndRgbEquality: boolean;
  acceptance: { status: string; componentMatching: number; framebufferMatching: number; productionReducer: boolean; productionCompositor: boolean };
}

const cases = [
  ["glare-player-dunsparce-opponent-shuckle.json", "player-back-to-opponent-front", 74, 286,
    "e1e93dce38a4910604fbe29bec58906109499dc9354824b3d3481183b5aef210",
    "67acdfad1ac0e6ebcd4e58be993d2e3fded3979405e0eb77724142dc27ca3db5",
    "676cc2a4ab462a12ab1f06c01a75d1eab1db346ed40db0eb815ba94e9bd16beb"],
  ["glare-opponent-dunsparce-player-shuckle.json", "opponent-front-to-player-back", 78, 290,
    "62e9d48d9b09edea5f891b8e3720ada12113343b98b3c0b4248142a3d6c7b2e2",
    "2aa1e8a7769c723575d8dff345e3629ec39d320b2185c9b16ca1790716401644",
    "eb5d27eadf6348be044b1b04e6b74bd887cac4ada819ef29301a311f9d7678c8"],
] as const;

describe("MOVE_GLARE bilateral dense exact evidence", () => {
  it.each(cases)("pins complete source and framebuffer acceptance: %s",
    (name, orientation, start, end, probeHash, evidenceHash, rgbHash) => {
      const receipt = JSON.parse(readFileSync(`tools/compare/fixtures/${name}`, "utf8")) as Receipt;
      const scenario = JSON.parse(readFileSync(receipt.scenario, "utf8"));
      expect(receipt).toMatchObject({
        orientation,
        activeSourceScriptWindow: { startFrame: start, endFrame: end - 1, frameCount: 212 },
        sourceAnimationWindow: { startFrame: start, endFrame: end, frameCount: 213 },
        sourceBounds: { start: "0x082cd0ca", endExclusive: "0x082cd133", cleanupOffset: 104 },
        probeJsonSha256: probeHash, evidenceSha256: evidenceHash, rawRgbSha256: rgbHash,
        freshRuns: 2, freshProbeAndRgbEquality: true,
        acceptance: { status: "exact", componentMatching: 213, framebufferMatching: 213,
          productionReducer: true, productionCompositor: true },
      });
      expect(createHash("sha256").update(readFileSync(receipt.changeMap)).digest("hex"))
        .toBe(receipt.changeMapSha256);
      expect(scenario).toMatchObject({ profile: "battle-scene-on", level: 50, challengeNum: 1 });
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      const party = [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent] as Array<{ species: number; moves: number[] }>;
      expect(party.find((mon) => mon.species === 206)?.moves).toEqual([137, 137, 137, 137]);
      expect(party.some((mon) => mon.species === 213)).toBe(true);
    });

  it("pins the source-distinct dots, sparkles, tasks, and both palette blends", () => {
    const scripts = readFileSync("reference/pokeemerald/data/battle_anim_scripts.s", "utf8");
    const body = scripts.slice(scripts.indexOf("Move_GLARE:"), scripts.indexOf("Move_BARRAGE:"));
    expect(body).toContain("createvisualtask AnimTask_GlareEyeDots, 5, 0");
    expect(body.match(/gEyeSparkleSpriteTemplate/g)).toHaveLength(2);
    expect(body).toContain("createvisualtask AnimTask_ScaryFace, 5");
    expect(body).toContain("delay 2");
    expect(body).toContain("createvisualtask AnimTask_ShakeTargetInPattern, 3, 20, 1, FALSE");
    expect(body.match(/createvisualtask AnimTask_BlendBattleAnimPal/g)).toHaveLength(2);
    expect(body).toContain("F_PAL_BG, 0, 0, 16, RGB_BLACK");
    expect(body).toContain("F_PAL_BG, 0, 16, 0, RGB_BLACK");

    const effects3 = readFileSync("reference/pokeemerald/src/battle_anim_effects_3.c", "utf8");
    expect(effects3).toContain("const struct SpriteTemplate gGlareEyeDotSpriteTemplate");
    expect(effects3).toContain(".callback = AnimGlareEyeDot");
    expect(effects3).toContain("task->tPairMax = 12");
    const effects2 = readFileSync("reference/pokeemerald/src/battle_anim_effects_2.c", "utf8");
    expect(effects2).toContain("const struct SpriteTemplate gEyeSparkleSpriteTemplate");
    expect(effects2).toContain(".callback = AnimEyeSparkle");
  });

  it("keeps GLARE exact after the Protect promotion at 151/151", () => {
    expect(coverage.entries).toHaveLength(151);
    expect(coverage.entries.every((entry) => entry.status === "exact")).toBe(true);
    expect(coverage.entries.filter((entry) => entry.move === "MOVE_GLARE")).toHaveLength(1);
    expect(276 - coverage.entries.length).toBe(125);
  });
});
