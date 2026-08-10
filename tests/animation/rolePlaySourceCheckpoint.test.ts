import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const scenarioPaths = [
  "tools/battle-lab/mechanic-role-play-player-kadabra-opponent-onix.json",
  "tools/battle-lab/mechanic-role-play-opponent-kadabra-player-onix.json",
] as const;

describe("MOVE_ROLE_PLAY bounded source/staging checkpoint", () => {
  it("pins the ROM body, source graph, silhouette task, and Level-50 carrier boundary", () => {
    const output = execFileSync(
      "node",
      ["--experimental-strip-types", "tools/compare/rolePlaySourceAudit.ts"],
      { encoding: "utf8" },
    );
    expect(output).toContain("0x082d4fae..0x082d500a (0x5c bytes), 13 commands");
    expect(output).toContain("sole new task AnimTask_RolePlaySilhouette");
    expect(output).toContain("set 169 FRONTIER_MON_KADABRA_1 is the sole and lowest Level-50 carrier");
    expect(output).toContain("stable target set 156 ONIX");
  });

  it.each(scenarioPaths)("stages complete legal bilateral parties without constraining benches: %s", (path) => {
    const scenario = JSON.parse(readFileSync(path, "utf8"));
    expect(scenario).toMatchObject({ mode: "mechanicLab", profile: "battle-scene-on", level: 50, challengeNum: 0 });
    expect(scenario.overrides.parties.player).toHaveLength(3);
    expect(scenario.overrides.parties.opponent).toHaveLength(3);
    for (const side of ["player", "opponent"] as const) {
      for (const mon of scenario.overrides.parties[side]) {
        expect(mon).toMatchObject({ level: 50, ppUps: [0, 0, 0, 0], abilitySlot: 0, shiny: false });
        expect(Object.keys(mon.ivs).sort()).toEqual(["attack", "defense", "hp", "spAttack", "spDefense", "speed"]);
        expect(Object.keys(mon.evs).sort()).toEqual(["attack", "defense", "hp", "spAttack", "spDefense", "speed"]);
      }
    }
    const allMons = [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent];
    const kadabra = allMons.find((mon: { species: number }) => mon.species === 64);
    const onix = allMons.find((mon: { species: number }) => mon.species === 95);
    expect(kadabra).toMatchObject({ nature: 8, item: 214, moves: [272, 272, 272, 272] });
    expect(onix).toMatchObject({ nature: 0, item: 142, moves: [157, 20, 225, 201] });
    expect(allMons.filter((mon: { species: number }) => mon.species !== 64)
      .every((mon: { moves: number[] }) => mon.moves.some((move) => move !== 272))).toBe(true);
  });

  it("pins twice-fresh endpoint staging without mistaking it for dense acceptance", () => {
    const receipt = JSON.parse(readFileSync("tools/compare/fixtures/role-play-staging-receipt.json", "utf8"));
    expect(receipt).toMatchObject({
      schema: "role-play-staging-receipt/v1",
      oracleProfile: "battle-scene-on",
      acceptance: { status: "unsupported", denseWindowCaptured: false, productionFramebufferCompared: false },
    });
    for (const orientation of [receipt.playerBack, receipt.opponentFront]) {
      expect(orientation.freshRuns).toHaveLength(2);
      expect(orientation.freshRuns[0]).toEqual(orientation.freshRuns[1]);
      expect(orientation.initial.kadabraAbility).toBe(28);
      expect(orientation.initial.onixAbility).toBe(69);
      expect(orientation.final.kadabraAbility).toBe(69);
      expect(orientation.targetSpriteIdentity.otId).toBe(416049562);
    }
  });

  it("promotes Role Play only with its independent dense bilateral acceptance", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.filter((entry: { status?: string }) => entry.status === "exact")).toHaveLength(153);
    expect(coverage.entries.find((entry: { move: string }) => entry.move === "MOVE_ROLE_PLAY")?.status).toBe("exact");
  });
});
