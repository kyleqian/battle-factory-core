import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import fixture from "../fixtures/fire-blast-animation-source-staging.json" with { type: "json" };

describe("MOVE_FIRE_BLAST authoritative-source checkpoint", () => {
  it("pins the complete root/subroutine interval, command order, callbacks, OAM, asset, audio, and component graph", () => {
    const audit = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/fireBlastSourceAudit.ts",
    ], { encoding: "utf8" }));
    expect(audit).toMatchObject({
      move: fixture.move,
      moveId: fixture.moveId,
      status: "unsupported-source-staging-checkpoint",
      source: fixture.source,
      sourceHashes: fixture.sourceHashes,
      scripts: fixture.scripts,
      ringPhases: fixture.ringPhases,
      crossVectors: fixture.crossVectors,
      lifecycle: {
        loads: ["ANIM_TAG_SMALL_EMBER"],
        unloads: [],
        ringSubroutineCalls: 3,
        ringSpritesPerCall: 5,
        crossSubroutineCalls: 9,
        crossSpritesPerCall: 5,
        oam: expect.stringContaining("AffineOff ObjNormal 32x32"),
        palette: ["F_PAL_BG 3,0,8 RGB_BLACK", "F_PAL_BG 2,8,0 RGB_BLACK"],
        audio: expect.stringContaining("source tick 111"),
      },
      sideDependencies: {
        ring: expect.stringContaining("attacker picture coordinates"),
        cross: expect.stringContaining("target-relative"),
        shake: expect.stringContaining("ANIM_TARGET, 5,0,20,1"),
        palette: expect.stringContaining("F_PAL_BG"),
        audio: expect.stringContaining("reverses"),
      },
      components: [
        "asset:ANIM_TAG_SMALL_EMBER", "soundTask:SoundTask_FireBlast",
        "sprite:gFireBlastCrossSpriteTemplate", "sprite:gFireBlastRingSpriteTemplate",
        "subroutine:FireBlastCross", "subroutine:FireBlastRing",
        "task:AnimTask_BlendBattleAnimPal", "task:AnimTask_ShakeMon",
      ],
      carrier: {
        lowestLegal: fixture.carrier.lowestLegal,
        challenge2Range: fixture.carrier.challenge2Range,
      },
      ownership: { gpuRegisters: false, gameplayState: false, renderer: false },
    });
    expect(audit.carrier.allLevel50).toHaveLength(18);
    expect(audit.carrier.allLevel50[0]).toMatchObject({
      index: fixture.carrier.lowestLegal.index,
      label: fixture.carrier.lowestLegal.label,
      species: fixture.carrier.lowestLegal.species,
    });
  });

  it("keeps Fire Blast distinct from its exact fire controls and unsupported in coverage", () => {
    const audit = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/fireBlastSourceAudit.ts",
    ], { encoding: "utf8" }));
    expect(audit.sharedControls.dragonBreath).toContain("not Fire Blast");
    expect(audit.sharedControls.flamethrower).toContain("not Fire Blast");
    expect(audit.sharedControls.blazeKick).toContain("does not exercise");
    expect(audit.sharedControls.ember).toContain("does not prove");
    expect(audit.sharedControls.fireSpin).toContain("independent");
    expect(audit.sharedControls.projectilePrimitives).toContain("no Fire Blast acceptance credit");
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.find((entry: { move: string }) => entry.move === fixture.move))
      .toBeUndefined();
    expect(fixture.coverageCredit).toBe(false);
    expect(fixture.boundedRemainder).toContain("No reducer");
  });
});
