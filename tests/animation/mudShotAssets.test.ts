import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import committed from "../../src/animation/assets/mud-shot.json" with { type: "json" };

describe("MOVE_MUD_SHOT source assets", () => {
  it("re-extracts the checked-in KRABBY and BROWN_ORB bytes", () => {
    const scratch = mkdtempSync(join(tmpdir(), "pokebench-mud-shot-assets-"));
    const output = join(scratch, "mud-shot.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/extractMudShotAssets.ts",
      "--out",
      output,
    ]);
    expect(JSON.parse(readFileSync(output, "utf8"))).toEqual(committed);
    expect(committed.source.carrier).toContain(
      "set 111; SPECIES_KRABBY 98; MOVE_MUD_SHOT 341",
    );
    expect(committed.brownOrb.tileset.columns).toBe(2);
    expect(committed.brownOrb.tileset.rows).toBe(8);
  });
});
