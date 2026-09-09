import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const contracts = [
  ["tools/compare/fixtures/sleep-powder-player-hoppip-opponent-onix.json", 380, 573, "207ffeb968088756ef0d371b7e1bb7490ef62cd9d8998c7e2d02c032f7ad2be1", "e90bba35fa7ac51ad2e116a6d83c82832a0c0881b37289f082aa559f37c74559", "642c7ebc4dd21004ea3a54e0efd8e490f9337ea62c713172bc471e97e11137d4", "player"],
  ["tools/compare/fixtures/sleep-powder-opponent-hoppip-player-onix.json", 385, 578, "f353a36c542dfb7cebe280b175599b270b0c458b6f479bb62e7bf4c6aeb41006", "63ebdc38b331dc48a68af12a70d1d6fe47969c4445c5d5a8681137120cbb4ff7", "bd82e7856c2bc424eb329c12236974ee2763d17adb3a2422983a0fc480679347", "opponent"],
] as const;

describe("MOVE_SLEEP_POWDER dense Scene-ON evidence", () => {
  it("promotes only Sleep Powder", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.filter((entry: { status: string }) => entry.status === "exact")).toHaveLength(243);
    expect(coverage.entries.find((entry: { move: string }) => entry.move === "MOVE_SLEEP_POWDER"))
      .toMatchObject({ status: "exact" });
    expect(coverage.entries.find((entry: { move: string }) => entry.move === "MOVE_POISON_POWDER"))
      .toBeUndefined();
  });
  it.each(contracts)("pins %s", (path, start, end, evidence, raw, map, side) => {
    const receipt = JSON.parse(readFileSync(path, "utf8"));
    const scenario = JSON.parse(readFileSync(receipt.scenario, "utf8"));
    expect(receipt).toMatchObject({
      schema: "sleep-powder-portable-evidence/v1", oracleProfile: "battle-scene-on",
      sourceWindow: { startFrame: start, endFrame: end, frameCount: 194 },
      evidenceSha256: evidence, rawRgbSha256: raw,
      acceptance: { status: "exact", componentMatching: 194, framebufferMatching: 194 },
      battleState: { attackerSide: side, targetStatus1: 0 },
    });
    expect(createHash("sha256").update(readFileSync(receipt.changeMap)).digest("hex")).toBe(map);
    expect(scenario.overrides.parties.player).toHaveLength(3);
    expect(scenario.overrides.parties.opponent).toHaveLength(3);
    expect(scenario.overrides.parties[side][0]).toMatchObject({ species: 187, moves: [79, 79, 79, 79] });
    for (const mon of [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent]) {
      expect(mon).toMatchObject({ level: 50, moves: expect.any(Array), ppUps: [0, 0, 0, 0], ivs: expect.any(Object), evs: expect.any(Object), abilitySlot: expect.any(Number), shiny: false });
      expect(mon.moves).toHaveLength(4);
    }
  });
});
