import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(new URL("../..", import.meta.url).pathname);
const audit = () => JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/diveSourceAudit.ts"], { cwd: root, encoding: "utf8" }));
const completeKeys = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];
const statKeys = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"];

describe("MOVE_DIVE source/legal evidence boundary", () => {
  it("pins both pointer-owned ranges, the full graph, and all legal carriers", () => {
    expect(audit()).toMatchObject({
      schema: "dive-source-audit/v1", move: "MOVE_DIVE", moveId: 291,
      status: "exact-source-contract",
      source: {
        root: { start: 0x082d653d, endExclusive: 0x082d65f7, bytes: 186, sha256: "55eafa860b14f2d02231270c9ddfce77a85050d9a4e3231d40469dcc42c9c0c2" },
        risingWater: { start: 0x082cb102, endExclusive: 0x082cb275, bytes: 371, sha256: "9d663164e09ec4665d56b522153dfaf68f6420c6c35eb0c417e2923ffd77822f" },
      },
      lifecycle: { diveBall: 1, splashes: 2, sprayDroplets: 20, waterImpacts: 9, driftingBubbles: 18, shakeMon2: 1 },
      carriers: [
        { index: 116, label: "FRONTIER_MON_CHINCHOU" }, { index: 123, label: "FRONTIER_MON_LUVDISC" },
        { index: 134, label: "FRONTIER_MON_CLAMPERL" }, { index: 265, label: "FRONTIER_MON_POLITOED_1" },
        { index: 371, label: "FRONTIER_MON_CLOYSTER_2" }, { index: 772, label: "FRONTIER_MON_SUICUNE_2" },
      ],
      ownership: { reducer: true, seam: true, compositor: true, gameplay: false, coverageCredit: true, trackFulfilled: true },
    });
  });

  it.each([
    "tools/battle-lab/mechanic-dive-player-chinchou-opponent-onix.json",
    "tools/battle-lab/mechanic-dive-opponent-chinchou-player-onix.json",
  ])("keeps %s complete, bilateral, zero-PP-Up, and transient-free", (path) => {
    const stage = JSON.parse(readFileSync(resolve(root, path), "utf8"));
    expect(stage).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50 });
    expect(Object.keys(stage.overrides)).toEqual(["parties"]);
    expect(stage).not.toHaveProperty("preCheckpointCaptures");
    for (const party of [stage.overrides.parties.player, stage.overrides.parties.opponent]) {
      expect(party).toHaveLength(3);
      for (const mon of party) {
        expect(Object.keys(mon).sort()).toEqual(completeKeys);
        expect(Object.keys(mon.ivs).sort()).toEqual(statKeys);
        expect(Object.keys(mon.evs).sort()).toEqual(statKeys);
        expect(mon.ppUps).toEqual([0, 0, 0, 0]);
        for (const key of ["hp", "status", "stages", "weather", "outcome", "volatile"]) expect(mon).not.toHaveProperty(key);
      }
    }
  });

  it("requires independent exact acceptance for all three track moves", () => {
    const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8"));
    expect(coverage.entries.find((entry: any) => entry.move === "MOVE_DIVE").status).toBe("exact");
    expect(coverage.entries.find((entry: any) => entry.move === "MOVE_FLY").status).toBe("exact");
    expect(coverage.entries.find((entry: any) => entry.move === "MOVE_BOUNCE").status).toBe("exact");
    expect(coverage.componentTracks.find((track: any) => track.id === "two-turn-semi-invulnerable"))
      .toMatchObject({ representatives: ["MOVE_FLY", "MOVE_BOUNCE", "MOVE_DIVE"], fulfilled: true });
  });
});
