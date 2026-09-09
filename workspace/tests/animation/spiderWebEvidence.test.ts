import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { verifySpiderWebEvidence } from "../../tools/compare/spiderWebEvidence.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/spider-web-evidence.json"), "utf8")) as Json;

describe("MOVE_SPIDER_WEB retained bilateral Scene-ON evidence", () => {
  it("reproduces the strict source/evidence receipt twice without production or coverage credit", () => {
    const first = verifySpiderWebEvidence();
    expect(first).toEqual(verifySpiderWebEvidence());
    expect(first).toMatchObject({ schema: "spider-web-bilateral-evidence/v1", status: "unsupported-evidence", coverageCredit: false });
    expect(first.orientations["player-back"]).toMatchObject({ rows: 207, sourceRows: 207, cleanupAge: 206, latches: { oam: "206/206 predecessor", matrices: "206/206 predecessor", palette: "205/206 predecessor; age 7 same-row" } });
    expect(first.orientations["opponent-front"]).toMatchObject({ rows: 207, sourceRows: 207, cleanupAge: 206 });
  });

  it.each([
    ["player-back", "tools/compare/fixtures/spider-web-changemap-player.json", -64, 63],
    ["opponent-front", "tools/compare/fixtures/spider-web-changemap-opponent.json", 63, -63],
  ])("pins the %s normalized banked map and orientation-specific mechanisms", (side, path, firstPan, secondPan) => {
    const map = JSON.parse(readFileSync(resolve(root, path as string), "utf8")) as Json;
    expect(map).toMatchObject({ schema: "spider-web-normalized-change-map/v1", side, rows: expect.any(Array) });
    expect(map.rows).toHaveLength(207);
    expect(map.rows[0]).toMatchObject({ age: 0, scriptOffset: 0, active: true, banked: { oam: { predecessor: false }, matrices: { predecessor: false }, palette: { predecessor: false } } });
    expect(map.rows[1].resources).toMatchObject({ tileTags: [10181], paletteTags: [10181] });
    expect(map.rows[4].resources).toMatchObject({ tileTags: [10181, 10180], paletteTags: [10181, 10180] });
    expect(map.rows[7].banked).toMatchObject({ oam: { predecessor: true }, matrices: { predecessor: true }, palette: { predecessor: false, sameRowFaded: true } });
    expect(map.rows[8].banked).toMatchObject({ palette: { predecessor: true } });
    expect(map.rows[39].audio).toMatchObject({ SE1: { symbol: "se_m_string_shot", panX: firstPan } });
    expect(map.rows[121].audio).toMatchObject({ SE1: { symbol: "se_m_string_shot2", panX: secondPan } });
    expect(map.rows[121].sprites.some((entry: Json) => entry.template === "gSpiderWebSpriteTemplate")).toBe(true);
    expect(map.rows[172].sprites.find((entry: Json) => entry.template === "gSpiderWebSpriteTemplate")).toMatchObject({ callback: "AnimSpiderWeb_End" });
    expect(map.rows[206]).toMatchObject({ active: false, resources: { tileTags: [], paletteTags: [] }, tasks: [], sprites: [] });
    expect(fixture.orientations[side as string].changeMapSha256).toBe(createHash("sha256").update(readFileSync(resolve(root, path as string))).digest("hex"));
  });
});
