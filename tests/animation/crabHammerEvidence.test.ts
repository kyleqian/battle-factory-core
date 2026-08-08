import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface Receipt {
  readonly schema: string;
  readonly oracleProfile: string;
  readonly move: string;
  readonly orientation: string;
  readonly scenario: string;
  readonly probe: string;
  readonly appStage: { readonly presentationAge: number };
  readonly denseWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
    readonly frameCount: number;
  };
  readonly attacker: { readonly species: string; readonly geometry: { readonly side: string } };
  readonly target: { readonly species: string; readonly geometry: { readonly side: string } };
  readonly targetIdleX2: number;
  readonly fieldProfile: {
    readonly playerHp: number;
    readonly playerMaxHp: number;
    readonly opponentHp: number;
    readonly opponentMaxHp: number;
  };
  readonly evidenceSchema: string;
  readonly stableEvidenceSha256: string;
  readonly secondFreshStableEvidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly acceptance: {
    readonly status: string;
    readonly framebufferMatching: number;
    readonly componentMatching: number;
  };
}

const fixtures: Array<[
  path: string,
  orientation: string,
  startFrame: number,
  endFrame: number,
  playerHp: number,
  opponentHp: number,
  targetIdleX2: number,
]> = [
  [
    "tools/compare/fixtures/crabhammer-player-krabby-opponent-onix.json",
    "player-to-opponent",
    212,
    316,
    128,
    142,
    1,
  ],
  [
    "tools/compare/fixtures/crabhammer-opponent-krabby-player-onix.json",
    "opponent-to-player",
    302,
    406,
    142,
    117,
    0,
  ],
];

describe("MOVE_CRABHAMMER dense evidence receipts", () => {
  it.each(fixtures)(
    "pins a complete Scene-ON body: %s",
    (path, orientation, startFrame, endFrame, playerHp, opponentHp, targetIdleX2) => {
      const receipt = JSON.parse(readFileSync(path, "utf8")) as Receipt;
      const scenario = JSON.parse(readFileSync(receipt.scenario, "utf8"));
      expect(receipt).toMatchObject({
        schema: "scene-on-portable-evidence/v1",
        oracleProfile: "battle-scene-on",
        move: "CRABHAMMER",
        orientation,
        probe: "tools/compare/crabHammerProbe.py",
        appStage: { presentationAge: 0 },
        denseWindow: { startFrame, endFrame, frameCount: 105 },
        attacker: { species: "KRABBY", geometry: { side: orientation === "player-to-opponent" ? "player" : "opponent" } },
        target: { species: "ONIX", geometry: { side: orientation === "player-to-opponent" ? "opponent" : "player" } },
        targetIdleX2,
        fieldProfile: { playerHp, opponentHp },
        evidenceSchema: "crabhammer-dense-evidence/v1",
        acceptance: { status: "exact", framebufferMatching: 105, componentMatching: 105 },
      });
      expect(receipt.stableEvidenceSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(receipt.secondFreshStableEvidenceSha256).toBe(receipt.stableEvidenceSha256);
      expect(receipt.rawRgbSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(receipt.fieldProfile.playerHp).toBeLessThanOrEqual(receipt.fieldProfile.playerMaxHp);
      expect(receipt.fieldProfile.opponentHp).toBeLessThanOrEqual(receipt.fieldProfile.opponentMaxHp);
      expect(scenario).toMatchObject({ profile: "battle-scene-on", level: 50 });
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      const parties = [
        ...scenario.overrides.parties.player,
        ...scenario.overrides.parties.opponent,
      ] as Array<{ species: number; moves: number[] }>;
      const krabby = parties.find((mon) => mon.species === 98);
      expect(krabby).toBeDefined();
      expect(krabby!.moves).toEqual([152, 152, 152, 152]);
    },
  );

  it("pins the stable projections while retaining all raw RGB", () => {
    expect(JSON.parse(readFileSync(fixtures[0]![0], "utf8"))).toMatchObject({
      stableEvidenceSha256: "13518a8aea57840552d24c03ec161be22496ff776ce1b9e182c340e4e88d3907",
      secondFreshStableEvidenceSha256: "13518a8aea57840552d24c03ec161be22496ff776ce1b9e182c340e4e88d3907",
      rawRgbSha256: "92c0bd67d6a6c3e931b94c2d2e96f65727500eb722e3b3553a776698a5b9ad3d",
    });
    expect(JSON.parse(readFileSync(fixtures[1]![0], "utf8"))).toMatchObject({
      stableEvidenceSha256: "54694fc00c593243e1c959f565cfc35b36929cb605fac6e2976b5b9b2ac5fc4a",
      secondFreshStableEvidenceSha256: "54694fc00c593243e1c959f565cfc35b36929cb605fac6e2976b5b9b2ac5fc4a",
      rawRgbSha256: "e6cf436c6b8b29f66ce55f1edcd43277e358709032116993e0dcdd26cb66c695",
    });
  });

  it("keeps the source-owned eight-bubble and palette body explicit", () => {
    const source = readFileSync("reference/pokeemerald/data/battle_anim_scripts.s", "utf8");
    const start = source.indexOf("Move_CRABHAMMER:");
    const end = source.indexOf("Move_SURF:", start);
    const body = source.slice(start, end);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    expect(body).toContain("loadspritegfx ANIM_TAG_ICE_CRYSTALS");
    expect(body).toContain("loadspritegfx ANIM_TAG_WATER_IMPACT");
    expect(body).toContain("complex_palette_blend");
    expect(body).toContain("AnimTask_ShakeMon");
    expect(body.match(/gSmallBubblePairSpriteTemplate/g)).toHaveLength(8);
  });
});
