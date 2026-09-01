import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(new URL("../..", import.meta.url).pathname);
const completeKeys = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];
const statKeys = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"];
const components = [
  "asset:ANIM_TAG_AIR_WAVE_2", "asset:ANIM_TAG_GUST", "asset:ANIM_TAG_IMPACT",
  "sprite:gAirWaveCrescentSpriteTemplate", "sprite:gRazorWindTornadoSpriteTemplate",
  "subroutine:RazorWindEnd", "subroutine:RazorWindSetUp", "subroutine:RazorWindUnleash",
  "task:AnimTask_ShakeMon2", "visualCommand:monbg", "visualCommand:setalpha",
  "visualCommand:clearmonbg", "visualCommand:blendoff",
];
const audit = () => JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/razorWindSourceAudit.ts"], { cwd: root, encoding: "utf8" }));

describe("MOVE_RAZOR_WIND source/legal staging checkpoint", () => {
  it("pins the complete odd-pointer source interval and exact 13-node track", () => {
    expect(audit()).toMatchObject({
      move: "MOVE_RAZOR_WIND", moveId: 13, status: "unsupported-source-contract",
      source: { root: { start: "0x82d3981", endExclusive: "0x82d3a67", bytes: 230, sha256: "2ce0cd33eeb3ca88c35874e227fb057118738e109d5d8c75360dbf07551af490" } },
      labels: { Move_RAZOR_WIND: 0x082d3981, RazorWindEnd: 0x082d398a, RazorWindSetUp: 0x082d398c, RazorWindUnleash: 0x082d39dc, Move_DISABLE: 0x082d3a67 },
      components, carrier: { lowestLegal: { index: 130, label: "FRONTIER_MON_NUZLEAF" }, siblingLegal: { index: 247, label: "FRONTIER_MON_ABSOL_1" } },
    });
  });

  it.each([
    ["player-back", "tools/battle-lab/mechanic-razor-wind-player-nuzleaf-opponent-onix.json", true],
    ["opponent-front", "tools/battle-lab/mechanic-razor-wind-opponent-nuzleaf-player-onix.json", false],
  ])("keeps the %s stage complete, legal, bilateral, and transient-free", (_side, path, playerAttacker) => {
    const stage = JSON.parse(readFileSync(resolve(root, path), "utf8"));
    expect(stage).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50, challengeNum: 0, battleNum: 0 });
    expect(Object.keys(stage.overrides)).toEqual(["parties"]);
    const parties = stage.overrides.parties;
    const attacker = playerAttacker ? parties.player[0] : parties.opponent[0];
    expect(attacker).toMatchObject({ species: 299, level: 50, nature: 0, item: 142, moves: [13, 13, 13, 13] });
    expect(parties.player).toHaveLength(3); expect(parties.opponent).toHaveLength(3);
    for (const party of [parties.player, parties.opponent]) {
      expect(new Set(party.map((mon: any) => mon.species)).size).toBe(3);
      for (const mon of party) {
        expect(Object.keys(mon).sort()).toEqual(completeKeys);
        expect(Object.keys(mon.ivs).sort()).toEqual(statKeys);
        expect(Object.keys(mon.evs).sort()).toEqual(statKeys);
        expect(mon.level).toBe(50); expect(mon.moves).toHaveLength(4); expect(mon.ppUps).toHaveLength(4);
        for (const transient of ["hp", "status", "stages", "statStages", "weather", "outcome", "volatile"]) expect(mon).not.toHaveProperty(transient);
      }
    }
  });

  it("promotes Razor Wind alone and denies sibling inference", () => {
    const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8"));
    expect(coverage.entries.find((entry: any) => entry.move === "MOVE_RAZOR_WIND"))
      .toMatchObject({ status: "exact" });
    expect(coverage.componentTracks.find((track: any) => track.id === "razor-wind-two-turn-air-wave")).toMatchObject({ components, representatives: ["MOVE_RAZOR_WIND"], fulfilled: true });
    expect(coverage.entries.find((entry: any) => entry.move === "MOVE_AEROBLAST")).toBeUndefined();
    expect(coverage.entries.find((entry: any) => entry.move === "MOVE_SONIC_BOOM").status).toBe("exact");
    expect(coverage.entries.find((entry: any) => entry.move === "MOVE_STEEL_WING").status).toBe("exact");
    expect(coverage.entries.find((entry: any) => entry.move === "MOVE_SCREECH").status).toBe("exact");
  });
});
