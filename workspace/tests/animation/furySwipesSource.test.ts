import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import furySwipesAsset from "../../src/animation/assets/furySwipes.json" with { type: "json" };

describe("MOVE_FURY_SWIPES source contract", () => {
  it("pins the exclusive script, graph, callbacks, cells, and lowest carrier", () => {
    const output = execFileSync(
      "node",
      ["--experimental-strip-types", "tools/compare/furySwipesSourceAudit.ts"],
      { encoding: "utf8" },
    );
    expect(output).toContain(
      "0x082d407c..0x082d40e0 (0x64 bytes)",
    );
    expect(output).toContain("complete 4-component SWIPE/HorizontalLunge/ShakeMon2 graph");
    expect(output).toContain("lowest legal Level-50 carrier set 142 FRONTIER_MON_AIPOM");
  });

  it("pins source-derived swipe cells and hFlip program", () => {
    const effects = readFileSync(
      "reference/pokeemerald/src/battle_anim_effects_2.c",
      "utf8",
    );
    expect(effects).toContain("ANIMCMD_FRAME(0, 4)");
    expect(effects).toContain("ANIMCMD_FRAME(48, 4)");
    expect(effects).toContain("ANIMCMD_FRAME(0, 4, .hFlip = TRUE)");
    expect(effects).toContain(".oam = &gOamData_AffineOff_ObjNormal_32x32");
    expect(effects).toContain("else if (sprite->animEnded)");
    expect(furySwipesAsset.source.swipe).toContain("four 32x32 cells");
    expect(furySwipesAsset.swipe.tileset).toMatchObject({ columns: 4, rows: 20 });
  });

  it("extracts the owned asset byte-for-byte", () => {
    const output = join(mkdtempSync(join(tmpdir(), "fury-swipes-assets-")), "asset.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/extractFurySwipesAssets.ts",
      "--out",
      output,
    ]);
    expect(readFileSync(output)).toEqual(
      readFileSync("src/animation/assets/furySwipes.json"),
    );
  });
});
