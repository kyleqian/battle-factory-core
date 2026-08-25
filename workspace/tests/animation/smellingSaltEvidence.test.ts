import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

const sha = (value: Uint8Array) => createHash("sha256").update(value).digest("hex");
const receipt = JSON.parse(readFileSync("tools/compare/fixtures/smelling-salt-evidence.json", "utf8"));

describe("MOVE_SMELLING_SALT bilateral evidence checkpoint", () => {
  it("pins complete twice-fresh legal Scene-ON windows without promotion", () => {
    expect(receipt).toMatchObject({
      move: "MOVE_SMELLING_SALT", status: "unsupported", coverageCredit: false,
      repeatability: { runsPerOrientation: 2, allMatched: true },
      measured: { pointerRows: "121/121 each", firstInactiveAge: 120,
        oamPredecessor: "120/120 each", matrixTwoRows: "119/119 eligible each",
        palettePredecessor: "120/120 each", gameplayRngTransitions: 0,
        animationRngTransitions: 120 },
    });
    for (const item of Object.values(receipt.orientations) as any[]) {
      const compressed = readFileSync(item.denseState);
      expect(sha(compressed)).toBe(item.denseStateSha256);
      expect(sha(gunzipSync(compressed))).toBe(item.probeJsonSha256);
      const scenario = JSON.parse(readFileSync(item.scenario, "utf8"));
      expect(scenario).toMatchObject({ mode: "mechanicLab", profile: "battle-scene-on", level: 50 });
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      const carrier = [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent]
        .find((mon: any) => mon.species === 210);
      expect(carrier.moves).toEqual([265, 265, 265, 265]);
    }
  });

  it("pins the authoritative graph, lowest Level-50 carrier, and controls", () => {
    const graph = JSON.parse(readFileSync("src/data/gen/battle-animation-components.json", "utf8"));
    expect(graph.moves.find((entry: any) => entry.move === "MOVE_SMELLING_SALT").componentIds).toEqual([
      "asset:ANIM_TAG_SMELLINGSALT_EFFECT", "asset:ANIM_TAG_TAG_HAND",
      "sprite:gSmellingSaltExclamationSpriteTemplate", "sprite:gSmellingSaltsHandSpriteTemplate",
      "task:AnimTask_ShakeMon2", "task:AnimTask_SmellingSaltsSquish",
    ]);
    const mons = JSON.parse(readFileSync("src/data/gen/battle-frontier-mons.json", "utf8"));
    const carriers = mons.entries.filter((entry: any) => entry.index >= 110 && entry.moves.includes("MOVE_SMELLING_SALT"));
    expect(carriers[0]).toMatchObject({ index: 376, label: "FRONTIER_MON_GRANBULL_1", species: "SPECIES_GRANBULL" });
    expect(receipt.controls.statusesChanged).toBe(false);
  });
});
