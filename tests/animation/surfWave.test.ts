import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import asset from "../../src/animation/assets/surf-wave.json" with { type: "json" };

describe("visualCommand:create_surf_wave source checkpoint", () => {
  it("extracts exactly the Factory-required water assets and source dispatch", () => {
    expect(asset.source.carriers[0]).toContain("WARTORTLE_2 set 281");
    expect(asset.source.carriers[1]).toContain("MARSHTOMP_2 set 295");
    expect(asset.source.excluded).toContain("no software sprite");
    expect(asset.water).toMatchObject({ columns: 16, rows: 16 });
    expect(asset.playerTilemap).toHaveLength(4096);
    expect(asset.opponentTilemap).toHaveLength(4096);
    const scratch = mkdtempSync(join(tmpdir(), "pokebench-surf-wave-assets-"));
    const output = join(scratch, "surf-wave.json");
    execFileSync("node", ["--experimental-strip-types", resolve("tools/compare/extractSurfWaveAssets.ts"), "--out", output]);
    expect(readFileSync(output)).toEqual(readFileSync(resolve("src/animation/assets/surf-wave.json")));
    const audit = execFileSync("node", ["--experimental-strip-types", resolve("tools/compare/surfWaveSourceAudit.ts")], { encoding: "utf8" });
    expect(audit).toContain("BATTLE_ENVIRONMENT_BUILDING dispatches Move_STRENGTH");
    expect(audit).toContain("MUDDY_WATER");
  });
});
