import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface PartyMon {
  readonly species: number;
  readonly level: number;
  readonly nature: number;
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

describe("MOVE_DOUBLE_KICK dense acceptance", () => {
  it("stages the lowest legal carrier in complete bilateral parties", () => {
    const paths = [
      "tools/battle-lab/mechanic-double-kick-player-nidorina-opponent-onix.json",
      "tools/battle-lab/mechanic-double-kick-opponent-nidorina-player-onix.json",
    ];
    for (const path of paths) {
      const scenario = JSON.parse(readFileSync(path, "utf8")) as {
        profile: string;
        challengeNum: number;
        playerSetIds: number[];
        opponentSetIds: number[];
        overrides: { parties: { player: PartyMon[]; opponent: PartyMon[] } };
      };
      expect(scenario.profile).toBe("battle-scene-on");
      expect(scenario.challengeNum).toBe(0);
      expect([...scenario.playerSetIds, ...scenario.opponentSetIds]).toContain(146);
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      for (const mon of [
        ...scenario.overrides.parties.player,
        ...scenario.overrides.parties.opponent,
      ]) {
        expect(mon.level).toBe(50);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        for (const field of ["item", "abilitySlot", "friendship", "gender", "shiny"] as const) {
          expect(mon).toHaveProperty(field);
        }
      }
      const nidorina = [
        ...scenario.overrides.parties.player,
        ...scenario.overrides.parties.opponent,
      ].find((mon) => mon.species === 30);
      expect(nidorina?.moves).toEqual([24, 24, 24, 24]);
    }
  });

  it("pins twice-fresh bilateral receipts, maps, and all-frame acceptance", () => {
    for (const [path, evidence, raw, mapHash] of [
      [
        "tools/compare/fixtures/double-kick-player-nidorina-opponent-onix.json",
        "e1072af739c49df889d1bc7b1c7e24323cefa4ae909a1b498e19f664a8e89ecc",
        "435f47a1f53fee17b7b89178056d951a0562265a9b054cd014d9de30c3c728bb",
        "4660983635482964ddddc1ffb82a2fffc5becbf1e32473e3c1d3631845b62b3c",
      ],
      [
        "tools/compare/fixtures/double-kick-opponent-nidorina-player-onix.json",
        "83b37252a4db4a9f3785d0339c09a4888966c960f234f82e46a16b8d9373d112",
        "9a4ed4ea22323eac11a2c000afc076bb4ed39d79f60bf997aff10f3679057016",
        "8a94f506a6f0e767e51e5719426d8fae716ebadbba2162280c06c9a218e0c798",
      ],
    ] as const) {
      const fixture = JSON.parse(readFileSync(path, "utf8"));
      expect(fixture.schema).toBe("double-kick-portable-exact/v1");
      expect(fixture.oracleProfile).toBe("battle-scene-on");
      expect(fixture.denseWindow).toEqual({ startFrame: 227, endFrame: 262, frameCount: 36 });
      expect(fixture.evidenceSha256).toBe(evidence);
      expect(fixture.secondFreshEvidenceSha256).toBe(evidence);
      expect(fixture.rawRgbSha256).toBe(raw);
      expect(createHash("sha256").update(readFileSync(fixture.changeMap)).digest("hex"))
        .toBe(mapHash);
      expect(fixture.latches).toMatchObject({
        softwareOamToHardware: "RAM+1",
        fistFootAndChildPlainOam: "RAM+1",
        shakeMon: "RAM+1",
      });
      expect(fixture.latches.resourcePaletteToHardware).toContain("monbg OBJ-to-BG");
      expect(fixture.acceptance).toEqual({
        status: "exact",
        sourceReducerMatching: 36,
        typedSeamMatching: 36,
        componentMatching: 36,
        framebufferMatching: 36,
      });
    }
  });

  it("audits source assets deterministically and records only DOUBLE_KICK's claim", () => {
    const audit = execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/doubleKickAssetAudit.ts",
    ], { encoding: "utf8" });
    expect(audit).toContain("MOVE_DOUBLE_KICK deterministic asset audit exact");

    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    const exact = coverage.entries.filter((entry: { status?: string }) => entry.status === "exact");
    expect(exact).toHaveLength(185);
    expect(exact.find((entry: { move: string }) => entry.move === "MOVE_DOUBLE_KICK"))
      .toMatchObject({ status: "exact" });
  });
});
