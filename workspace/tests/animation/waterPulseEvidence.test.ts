import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { verifyWaterPulseEvidence } from "../../tools/compare/waterPulseEvidence.ts";

type Json = Record<string, any>;
const fixture = JSON.parse(readFileSync("tools/compare/fixtures/water-pulse-evidence.json", "utf8")) as Json;

describe("MOVE_WATER_PULSE bilateral dense evidence", () => {
  it("replays both twice-fresh semantic/raw-RGB receipts and normalized maps", () => {
    const result = verifyWaterPulseEvidence();
    expect(result).toMatchObject({
      schema: "water-pulse-bilateral-evidence/v1",
      status: "unsupported-dense-evidence-checkpoint",
      coverageCredit: false,
      orientations: {
        "player-back": {
          rows: 160, changedRows: 119,
          dense: "ae21143a1c6f069a27fb2aa4dc61f7dac9731cea03d3097f6f74709da43f5b8b",
          rawRgb: "751bc16afc41bb58209ffbc1864512407d0d6bf145693337557662e6d5ba5ce1",
          map: "3db2689d5981200633ba75712d82e1d624aa37d6ee3b384cc346ffe1caa4d5f7",
        },
        "opponent-front": {
          rows: 160, changedRows: 121,
          dense: "da0c82051bcd08e116622acedd007a179873e0a80b5770e48c3091e641337fcf",
          rawRgb: "36fd9747bf99fec78f47b08540515be6527411d1e0ce58b7d878537942736b7e",
          map: "92b85303991f9efb314b6f40860043c1fb2012525d80b7f1a478b7928d4f49cb",
        },
      },
    });
  });

  it.each(["player-back", "opponent-front"] as const)("pins %s source-relative nodes, bank maps, and first inactive cleanup", (side) => {
    const map = JSON.parse(readFileSync(fixture.orientations[side].changeMap, "utf8")) as Json;
    expect(map).toMatchObject({
      schema: "water-pulse-normalized-banked-change-map/v1",
      side,
      sourceWindow: { frameCount: 160 },
    });
    expect(map.rows).toHaveLength(160);
    expect(map.rows[0]).toMatchObject({ age: 0, scriptOffset: 0, active: true, sprites: [], tasks: [] });
    expect(map.rows[10].sprites.filter((sprite: Json) => sprite.template === "gSimplePaletteBlendSpriteTemplate")).toHaveLength(1);
    expect(map.rows[22].sprites.filter((sprite: Json) => sprite.template === "gWaterPulseBubbleSpriteTemplate")).toHaveLength(5);
    expect(map.rows[72].sprites.filter((sprite: Json) => sprite.template === "gWaterPulseRingSpriteTemplate")).toHaveLength(1);
    expect(map.rows[79].sprites.filter((sprite: Json) => sprite.template === "gWaterPulseRingSpriteTemplate")).toHaveLength(2);
    expect(map.rows[86].sprites.filter((sprite: Json) => sprite.template === "gWaterPulseRingSpriteTemplate")).toHaveLength(3);
    expect(map.rows[86].sprites.filter((sprite: Json) => sprite.template === "gWaterPulseRingBubbleSpriteTemplate")).toHaveLength(2);
    expect(map.rows[101].tasks.some((task: Json) => task.func === "AnimTask_ShakeMon_Step")).toBe(true);
    expect(map.rows[103].battlerAxes.target[3]).toBe(8);
    expect(map.rows[159]).toMatchObject({ age: 159, active: false, scriptOffset: 244, sprites: [], tasks: [] });
    expect(map.rows[0].palettes.unfaded).toHaveLength(32);
    expect(map.rows[1].palettes.unfaded[23]).not.toBe(map.rows[0].palettes.unfaded[23]);
    expect(map.rows[4].palettes.unfaded[24]).not.toBe(map.rows[3].palettes.unfaded[24]);
    expect(map.rows[1].oam.hardware).toBe(map.rows[0].oam.software);
    expect(map.rows[1].matrices.hardware).toBe(map.rows[0].matrices.software);
    expect(map.rows[7].palettes.hardware).not.toEqual(map.rows[6].palettes.faded);
    expect(map.rows[8].palettes.hardware).toEqual(map.rows[7].palettes.faded);
    expect(map.rows[10].audio.SE1.songHeaderIdentity.symbol).toBe("se_m_bubble3");
    expect(map.rows[72].audio.SE1.songHeaderIdentity.symbol).toBe("se_m_giga_drain");
  });

  it("keeps the retained evidence checkpoint immutable while current coverage is exact", () => {
    expect(fixture).toMatchObject({
      oracleProfile: "battle-scene-on",
      move: "MOVE_WATER_PULSE",
      moveId: 352,
      status: "unsupported-dense-evidence-checkpoint",
      coverageCredit: false,
      scope: {
        productionChanged: false,
        reducerAdded: false,
        typedSceneOnSeam: false,
        compositorAdded: false,
        framebufferAcceptanceAdded: false,
        coveragePromotion: false,
        componentTrackFulfilled: false,
        siblingCredit: false,
        newDurableLatch: false,
      },
    });
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8")) as Json;
    expect(coverage.entries.find((entry: Json) => entry.move === "MOVE_WATER_PULSE"))
      .toMatchObject({ status: "exact" });
    expect(coverage.componentTracks.find((track: Json) => track.id === "water-gun-small-bubbles-water-impact"))
      .toMatchObject({ fulfilled: true, representatives: expect.arrayContaining(["MOVE_WATER_PULSE"]) });
    expect(readFileSync("ANIMATION_LATCHES.md", "utf8")).not.toContain("Water Pulse");
  });
});
