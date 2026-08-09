import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const fixtures = [
  ["tools/compare/fixtures/disable-player-drowzee-opponent-onix.json", "player-back", "player", 110, 117],
  ["tools/compare/fixtures/disable-opponent-drowzee-player-onix.json", "opponent-front", "opponent", 117, 125],
] as const;

describe("MOVE_DISABLE exact evidence", () => {
  it.each(fixtures)("pins a complete legal Scene-ON receipt: %s", (path, orientation, side, playerHp, opponentHp) => {
    const receipt = JSON.parse(readFileSync(path, "utf8"));
    const scenario = JSON.parse(readFileSync(receipt.scenario, "utf8"));
    expect(receipt).toMatchObject({
      schema: "disable-portable-evidence/v1",
      oracleProfile: "battle-scene-on",
      move: "DISABLE",
      moveId: 50,
      orientation,
      sourceWindow: { frameCount: 113 },
      sourceBounds: { start: "0x082d3a67", endExclusive: "0x082d3a95" },
      attacker: { species: "DROWZEE", geometry: { side } },
      target: { species: "ONIX" },
      fieldProfile: { playerHp, opponentHp },
    });
    expect(receipt.probeJsonSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(receipt.rawRgbSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(receipt.changeMapSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(scenario).toMatchObject({ profile: "battle-scene-on", level: 50 });
    expect(scenario.overrides.parties.player).toHaveLength(3);
    expect(scenario.overrides.parties.opponent).toHaveLength(3);
    const parties = [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent];
    const drowzee = parties.find((mon: { species: number }) => mon.species === 96);
    expect(drowzee).toMatchObject({
      level: 50, nature: 24, item: 142, abilitySlot: 0,
      evs: { hp: 170, attack: 170, spAttack: 170 },
      moves: [50, 50, 50, 50],
    });
  });

  it("audits the bounded script, sparkle asset, grow task, audio, and source carrier", () => {
    const result = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/disableSourceAudit.ts",
    ], { encoding: "utf8" }));
    expect(result).toMatchObject({
      move: "MOVE_DISABLE",
      moveId: 50,
      sourceBounds: { start: "0x082d3a67", endExclusive: "0x082d3a95" },
      taskBounds: { start: "0x081045b0", step: "0x08104614" },
      carrier: "FRONTIER_MON_DROWZEE 114",
    });
  });

  it("keeps twice-fresh portable framebuffer/component/hardware acceptance executable", () => {
    const portable = readFileSync("tools/compare/disablePortable.ts", "utf8");
    expect(portable).toContain("runNumber <= 2");
    expect(portable).toContain("framebuffer ${framebuffer}/113");
    expect(portable).toContain("component ${component}/113");
    expect(portable).toContain("hardware ${hardware}/113");
    expect(portable).toContain("tools/run-mgba-probe.py");
  });
});
