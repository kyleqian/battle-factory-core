import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface PartyMon {
  readonly species: number;
  readonly level: number;
  readonly ivs: Readonly<Record<string, number>>;
  readonly evs: Readonly<Record<string, number>>;
  readonly moves: readonly number[];
  readonly ppUps: readonly number[];
  readonly item: number;
  readonly abilitySlot: number;
  readonly friendship: number;
  readonly gender: string;
  readonly shiny: boolean;
}

describe("MOVE_COMET_PUNCH natural multi-hit exact acceptance", () => {
  it("stages sole Level-50 carrier set 159 in complete bilateral legal parties", () => {
    const receipt = JSON.parse(readFileSync("tools/compare/fixtures/comet-punch-natural-receipts.json", "utf8"));
    for (const orientation of receipt.orientations) {
      const scenario = JSON.parse(readFileSync(orientation.scenario, "utf8")) as {
        profile: string;
        challengeNum: number;
        playerSetIds: number[];
        opponentSetIds: number[];
        overrides: { parties: { player: PartyMon[]; opponent: PartyMon[] } };
      };
      expect(scenario.profile).toBe("battle-scene-on");
      expect(scenario.challengeNum).toBe(0);
      expect([...scenario.playerSetIds, ...scenario.opponentSetIds]).toContain(159);
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      const ledian = [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent]
        .find((mon) => mon.species === 166);
      expect(ledian?.moves).toEqual([4, 4, 4, 4]);
      for (const mon of [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent]) {
        expect(mon.level).toBe(50);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        for (const field of ["item", "abilitySlot", "friendship", "gender", "shiny"] as const) {
          expect(mon).toHaveProperty(field);
        }
      }
    }
  });

  it("pins natural 4/5-hit bilateral receipts, both routes, maps, and all 333 dense frames", () => {
    const receipt = JSON.parse(readFileSync("tools/compare/fixtures/comet-punch-natural-receipts.json", "utf8"));
    expect(receipt).toMatchObject({ schema: "comet-punch-natural-receipts/v1", oracleProfile: "battle-scene-on", move: "COMET_PUNCH", status: "exact" });
    expect(receipt.orientations.map((orientation: { orientation: string }) => orientation.orientation))
      .toEqual(["player-back", "opponent-front"]);
    let accepted = 0;
    for (const [index, orientation] of receipt.orientations.entries()) {
      expect(orientation.evidenceSha256).toBe(orientation.secondFreshEvidenceSha256);
      expect(orientation.windows.map((window: { moveTurn: number }) => window.moveTurn))
        .toEqual(index === 0 ? [0, 1, 2, 3] : [0, 1, 2, 3, 4]);
      expect(new Set(orientation.windows.map((window: { moveTurn: number }) => window.moveTurn & 1)))
        .toEqual(new Set([0, 1]));
      for (const window of orientation.windows) {
        expect(window.frameCount).toBe(37);
        expect(createHash("sha256").update(readFileSync(window.changeMap)).digest("hex"))
          .toBe(window.changeMapSha256);
        expect(window.acceptance).toEqual({ sourceReducerMatching: 37, typedSeamMatching: 37, componentMatching: 37, framebufferMatching: 37 });
        accepted += window.acceptance.framebufferMatching;
      }
    }
    expect(accepted).toBe(333);
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.filter((entry: { status: string }) => entry.status === "exact")).toHaveLength(169);
    expect(coverage.entries.find((entry: { move: string }) => entry.move === "MOVE_COMET_PUNCH"))
      .toMatchObject({ status: "exact" });
  });
});
