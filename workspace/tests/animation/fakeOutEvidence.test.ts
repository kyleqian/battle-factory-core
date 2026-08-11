import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import player from "../../tools/compare/fixtures/fake-out-player-makuhita-opponent-shuckle.json" with { type: "json" };
import opponent from "../../tools/compare/fixtures/fake-out-opponent-makuhita-player-shuckle.json" with { type: "json" };
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };

describe("MOVE_FAKE_OUT bilateral exact evidence", () => {
  it("pins complete dense source windows and deterministic receipts", () => {
    expect(player).toMatchObject({ oracleProfile:"battle-scene-on", moveId:252, targetPictureYOffset:9, sourceWindow:{startFrame:78,endFrame:163,frameCount:86}, acceptance:{status:"exact",componentEvidence:86,productionReducer:true,typedSeam:true,relevantHardware:86,productionCompositor:true,framebufferMatching:86} });
    expect(opponent).toMatchObject({ oracleProfile:"battle-scene-on", moveId:252, targetPictureYOffset:11, sourceWindow:{startFrame:82,endFrame:167,frameCount:86}, acceptance:{status:"exact",componentEvidence:86,productionReducer:true,typedSeam:true,relevantHardware:86,productionCompositor:true,framebufferMatching:86} });
    for (const fixture of [player, opponent]) {
      expect(fixture.sourceBounds).toEqual({start:"0x082d3f2e",endExclusive:"0x082d3f69"});
      expect(createHash("sha256").update(readFileSync(fixture.changeMap)).digest("hex")).toBe(fixture.changeMapSha256);
      expect(fixture.probeJsonSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(fixture.rawRgbSha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("pins the complete legal set-22 source record and isolated source body", () => {
    expect(frontierMons.entries.find(({index})=>index===22)).toMatchObject({index:22,label:"FRONTIER_MON_MAKUHITA",species:"SPECIES_MAKUHITA",moves:["MOVE_FAKE_OUT","MOVE_SEISMIC_TOSS","MOVE_DETECT","MOVE_WHIRLWIND"],itemName:"BATTLE_FRONTIER_ITEM_SCOPE_LENS",evSpreadStats:["F_EV_SPREAD_ATTACK","F_EV_SPREAD_HP"],nature:"NATURE_DOCILE"});
    const source=readFileSync("reference/pokeemerald/data/battle_anim_scripts.s","utf8");
    const body=source.slice(source.indexOf("Move_FAKE_OUT:"),source.indexOf("Move_SCARY_FACE:"));
    for(const text of ["AnimTask_FakeOut","AnimTask_ShakeMon2","AnimTask_StretchTargetUp","simple_palette_blend selector=F_PAL_BG"]) expect(body).toContain(text);
  });

  it("keeps ASTONISH's source audit green as the reuse control", () => {
    const audit=execFileSync("node",["--experimental-strip-types","tools/compare/astonishSourceAudit.ts"],{encoding:"utf8"});
    expect(audit).toContain("MOVE_ASTONISH");
    expect(audit).toContain("MOVE_FAKE_OUT");
  });
});
