import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type MoveReceipt = {
  readonly orientation: string;
  readonly scenario: string;
  readonly attacker: { readonly species: string; readonly geometry: { readonly side: "player" | "opponent" } };
  readonly target: { readonly species: string; readonly geometry: { readonly side: "player" | "opponent" } };
  readonly sourceWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly evidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly lifecycleCounts?: Readonly<Record<string, number>>;
  readonly status?: string;
  readonly acceptance?: Readonly<Record<string, boolean>>;
};

type Scenario = {
  readonly schemaVersion: number;
  readonly mode: string;
  readonly profile: string;
  readonly level: number;
  readonly challengeNum: number;
  readonly playerSetIds: readonly number[];
  readonly opponentSetIds: readonly number[];
  readonly overrides: {
    readonly parties: Record<"player" | "opponent", readonly {
      readonly species: number;
      readonly level: number;
      readonly nature: number;
      readonly moves: readonly number[];
      readonly ppUps: readonly number[];
      readonly item: number;
      readonly abilitySlot: number;
      readonly friendship: number;
    }[]>;
  };
};

function receipt(path: string): MoveReceipt {
  return JSON.parse(readFileSync(path, "utf8")) as MoveReceipt;
}

function scenario(path: string): Scenario {
  return JSON.parse(readFileSync(path, "utf8")) as Scenario;
}

describe("green-spike-needle-arm component-track receipt ratchet", () => {
  it("requires the exact component inventory, independent Cacnea receipts, and the Factory Strength exclusion", () => {
    const needleArm = [
      receipt("tools/compare/fixtures/needle-arm-player-cacnea-opponent-onix.json"),
      receipt("tools/compare/fixtures/needle-arm-opponent-cacnea-player-onix.json"),
    ];
    expect(needleArm.map((entry) => [
      entry.orientation,
      entry.sourceWindow,
      entry.attacker.species,
      entry.attacker.geometry.side,
      entry.target.species,
      entry.target.geometry.side,
      entry.lifecycleCounts?.gNeedleArmSpikeSpriteTemplate,
      entry.evidenceSha256,
      entry.rawRgbSha256,
    ])).toEqual([
      ["player-back Cacnea -> opponent-front Onix", { startFrame: 223, endFrame: 330, frameCount: 108 }, "CACNEA", "player", "ONIX", "opponent", 20,
        "f6f26ca98a0aea08c1bd5c9fef4553443c93c260d829ed0609c41ef26935d10c",
        "bbb4ea8404fbde111de1c1dfe91d45d47033b2f0522754695d4d7ed5f21db0f6"],
      ["opponent-front Cacnea -> player-back Onix", { startFrame: 223, endFrame: 330, frameCount: 108 }, "CACNEA", "opponent", "ONIX", "player", 20,
        "75a2df84d96ea99f2cb2b584a67a338d419c565a14c7bc726f7bf7a8aaf20470",
        "291b07d72166df08330fd95741f84ea0d14918c57602114968143ca9bd48d1e1"],
    ]);

    for (const fixture of needleArm) {
      const staged = scenario(fixture.scenario);
      const carrierSide = fixture.attacker.geometry.side;
      const carrierSets = carrierSide === "player"
        ? staged.playerSetIds
        : staged.opponentSetIds;
      expect(staged).toMatchObject({
        schemaVersion: 1,
        mode: "mechanicLab",
        profile: "battle-scene-on",
        level: 50,
        challengeNum: 0,
      });
      expect(staged.overrides.parties.player).toHaveLength(3);
      expect(staged.overrides.parties.opponent).toHaveLength(3);
      expect(carrierSets).toEqual([125, 185, 188]);
      expect(staged.overrides.parties[carrierSide][0]).toMatchObject({
        species: 344,
        level: 50,
        nature: 24,
        moves: [302, 302, 302, 302],
        ppUps: [0, 0, 0, 0],
        item: 142,
        abilitySlot: 0,
        friendship: 0,
      });
    }

    const strength = [
      receipt("tools/compare/fixtures/secret-power-strength-player-teddiursa-opponent-onix.json"),
      receipt("tools/compare/fixtures/secret-power-strength-opponent-teddiursa-player-onix.json"),
    ];
    expect(strength.map((entry) => [
      entry.orientation,
      entry.sourceWindow,
      entry.evidenceSha256,
      entry.rawRgbSha256,
      entry.status,
      entry.acceptance,
    ])).toEqual([
      ["player-back Teddiursa -> opponent-front Onix", { startFrame: 222, endFrame: 323, frameCount: 102 },
        "9d8f3ad7a472bdd940aa35a7aa7e9c62823d8d2b11c0114ce6d4b1f92aed73a3",
        "af6ff533abeb22e9b2f45c09339dcb979ac8508501e64d6d012faa1eb91a2903",
        "exact", { reducerPinned: true, typedSeam: true, productionFramebuffer: true, exact: true }],
      ["opponent-front Teddiursa -> player-back Onix", { startFrame: 222, endFrame: 323, frameCount: 102 },
        "8d6902b63b3dc96622261856cdb413c452d3c55140465a674d97aa51271a2172",
        "f4c81b0de053a8703ed10238c70d6398693fc937c1ad2d088de451a097d6376a",
        "exact", { reducerPinned: true, typedSeam: true, productionFramebuffer: true, exact: true }],
    ]);

    const dispatch = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/secretPowerSourceAudit.ts",
    ], { encoding: "utf8" })) as {
      readonly factory: { readonly environment: string; readonly reachableBodies: readonly string[] };
      readonly visualDispatch: Record<string, { readonly body: string }>;
      readonly verdict: string;
    };
    expect(dispatch.factory).toEqual({
      mapType: "MAP_TYPE_INDOOR",
      environment: "BATTLE_ENVIRONMENT_BUILDING",
      environmentValue: 8,
      reachableBodies: ["Move_STRENGTH"],
    });
    expect(dispatch.visualDispatch.BATTLE_ENVIRONMENT_GRASS).toEqual({ body: "Move_NEEDLE_ARM", value: 0 });
    expect(dispatch.verdict).toBe(
      "Factory dispatch exact: Factory reaches sole body, Move_STRENGTH; "
      + "grass-only Move_NEEDLE_ARM is unreachable and receives no Factory "
      + "GREEN_SPIKE credit",
    );

    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.filter((entry: { status: string }) => entry.status === "exact")).toHaveLength(231);
    expect(coverage.entries.filter((entry: { status: string }) =>
      entry.status === "partial" || entry.status === "staged",
    )).toEqual([]);
    const needleEntry = coverage.entries.find((entry: { move: string }) =>
      entry.move === "MOVE_NEEDLE_ARM",
    );
    const secretPowerEntry = coverage.entries.find((entry: { move: string }) =>
      entry.move === "MOVE_SECRET_POWER",
    );
    expect(needleEntry).toMatchObject({ move: "MOVE_NEEDLE_ARM", status: "exact" });
    expect(secretPowerEntry).toMatchObject({ move: "MOVE_SECRET_POWER", status: "exact" });
    expect(needleEntry.covered.join("\n")).toContain("no GREEN_SPIKE credit");
    expect(coverage.componentTracks.filter((track: { id: string }) =>
      track.id === "green-spike-needle-arm",
    )).toEqual([
      expect.objectContaining({
        components: [
          "asset:ANIM_TAG_GREEN_SPIKE",
          "sprite:gNeedleArmSpikeSpriteTemplate",
          "task:AnimTask_ShakeMon2",
          "asset:ANIM_TAG_IMPACT",
          "asset:ANIM_TAG_HANDS_AND_FEET",
        ],
        representatives: ["MOVE_NEEDLE_ARM", "MOVE_SECRET_POWER"],
        fulfilled: true,
      }),
    ]);
  });
});
