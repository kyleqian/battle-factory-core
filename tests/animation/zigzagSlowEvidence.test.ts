import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { speciesFrontIdleRestOffset } from "../../src/animation/speciesIdleAnim.ts";
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import venomothScenario from "../../tools/compare/fixtures/sendout-front-venomoth.json" with { type: "json" };
import venomothA from "../../tools/compare/fixtures/sendout-front-venomoth-run-a.json" with { type: "json" };
import venomothB from "../../tools/compare/fixtures/sendout-front-venomoth-run-b.json" with { type: "json" };
import kinglerScenario from "../../tools/compare/fixtures/sendout-front-kingler.json" with { type: "json" };
import kinglerA from "../../tools/compare/fixtures/sendout-front-kingler-run-a.json" with { type: "json" };
import kinglerB from "../../tools/compare/fixtures/sendout-front-kingler-run-b.json" with { type: "json" };
import flygonScenario from "../../tools/compare/fixtures/sendout-front-flygon.json" with { type: "json" };
import flygonA from "../../tools/compare/fixtures/sendout-front-flygon-run-a.json" with { type: "json" };
import flygonB from "../../tools/compare/fixtures/sendout-front-flygon-run-b.json" with { type: "json" };

const receipts = [
  ["VENOMOTH", venomothScenario, venomothA, venomothB, "sendout-front-venomoth", 49, 21, 373,
    "cfc7e2a234d3eb7e0124ec3c9198d7620ee1341b06e607a3e5f8cd15cfa506ff"],
  ["KINGLER", kinglerScenario, kinglerA, kinglerB, "sendout-front-kingler", 99, 8, 372,
    "e07a9dd6d5b3cbe81314ed08871982dd1b04d72380d6a01d794fe2c9b2e3787f"],
  ["FLYGON", flygonScenario, flygonA, flygonB, "sendout-front-flygon", 334, 6, 373,
    "24dddba203497ba399c2944bbf7a636edb3ced114e5bc4d44ddc7dee826176e9"],
] as const;

describe("ANIM_ZIGZAG_SLOW Scene-ON evidence", () => {
  it.each(receipts)("pins paired raw and normalized %s receipts", (
    species, scenario, runA, runB, stem, speciesId, animCmdIndex, bytes, sha256,
  ) => {
    expect(scenario.profile).toBe("battle-scene-on");
    expect(scenario.mode).toBe("mechanicLab");
    expect(scenario.overrides.parties.player).toHaveLength(3);
    expect(scenario.overrides.parties.opponent).toHaveLength(3);
    expect(scenario.overrides.parties.opponent[0]!.species).toBe(speciesId);
    const rawA = readFileSync(new URL(`../../tools/compare/fixtures/${stem}-run-a.json`, import.meta.url));
    const rawB = readFileSync(new URL(`../../tools/compare/fixtures/${stem}-run-b.json`, import.meta.url));
    expect(rawA.equals(rawB)).toBe(true);
    expect(rawA).toHaveLength(bytes);
    expect(rawA.at(-1)).toBe("}".charCodeAt(0));
    expect(createHash("sha256").update(rawA).digest("hex")).toBe(sha256);
    expect(runA).toEqual(runB);
    expect(selectorTables.frontAnimIds.species[species]).toBe("ANIM_ZIGZAG_SLOW");
    expect(runA.ticks).toHaveLength(1);
    expect(runA.ticks[0]!.battler1).toMatchObject({
      x2: 0, y2: 0, animNum: 1, animCmdIndex, data2: speciesId,
      callback: "0x8007428", callbackSymbol: "SpriteCallbackDummy",
    });
    expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
  });
});
