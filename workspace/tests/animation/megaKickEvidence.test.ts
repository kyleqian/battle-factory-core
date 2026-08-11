import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface Receipt {
  readonly schema: string;
  readonly oracleProfile: string;
  readonly scenario: string;
  readonly probe: string;
  readonly orientation: string;
  readonly sourceWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
    readonly frameCount: number;
  };
  readonly evidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly acceptance: {
    readonly status: string;
    readonly componentMatching: number;
    readonly framebufferMatching: number;
  };
  readonly attacker: { readonly species: string; readonly geometry: { readonly side: string } };
  readonly target: { readonly species: string; readonly geometry: { readonly side: string } };
  readonly fieldProfile: {
    readonly playerHp: number;
    readonly playerMaxHp: number;
    readonly opponentHp: number;
    readonly opponentMaxHp: number;
  };
}

const fixtures: readonly [
  path: string,
  orientation: string,
  startFrame: number,
  endFrame: number,
  playerHp: number,
  opponentHp: number,
][] = [
  [
    "tools/compare/fixtures/mega-kick-player-sudowoodo-opponent-onix.json",
    "player-back",
    379,
    538,
    170,
    110,
  ],
  [
    "tools/compare/fixtures/mega-kick-opponent-sudowoodo-player-onix.json",
    "opponent-front",
    297,
    456,
    110,
    173,
  ],
];

describe("MOVE_MEGA_KICK dense Scene-ON evidence", () => {
  it.each(fixtures)(
    "pins the complete %s receipt",
    (path, orientation, startFrame, endFrame, playerHp, opponentHp) => {
      const receipt = JSON.parse(readFileSync(path, "utf8")) as Receipt;
      const scenario = JSON.parse(readFileSync(receipt.scenario, "utf8"));
      expect(receipt).toMatchObject({
        schema: "mega-kick-portable-evidence/v1",
        oracleProfile: "battle-scene-on",
        probe: "tools/compare/megaKickProbe.py",
        orientation,
        sourceWindow: { startFrame, endFrame, frameCount: 160 },
        attacker: {
          species: "SUDOWOODO",
          geometry: { side: orientation === "player-back" ? "player" : "opponent" },
        },
        target: {
          species: "ONIX",
          geometry: { side: orientation === "player-back" ? "opponent" : "player" },
        },
        fieldProfile: { playerHp, opponentHp },
        acceptance: { status: "exact", componentMatching: 160, framebufferMatching: 160 },
      });
      expect(receipt.evidenceSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(receipt.rawRgbSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(receipt.fieldProfile.playerHp).toBeLessThanOrEqual(receipt.fieldProfile.playerMaxHp);
      expect(receipt.fieldProfile.opponentHp).toBeLessThanOrEqual(receipt.fieldProfile.opponentMaxHp);
      expect(scenario).toMatchObject({ profile: "battle-scene-on", level: 50 });
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
    },
  );

  it("pins the two independently fresh raw-RGB and component receipts", () => {
    expect(JSON.parse(readFileSync(fixtures[0]![0], "utf8"))).toMatchObject({
      evidenceSha256: "edfddb237985981eba090b79a054bd981ae7912ed5318886666eb5a2ae8e800f",
      rawRgbSha256: "4193093ce07c00d543f10183739091677e4af039ff32864ca6af2b11d79f0874",
    });
    expect(JSON.parse(readFileSync(fixtures[1]![0], "utf8"))).toMatchObject({
      evidenceSha256: "4f6748c255496c3fea135413ba606d398de46934eba38efbc2822692bce47ea8",
      rawRgbSha256: "8fb370e247b63ec3e1f5d72f9dddfac7e8377732eb61b47244a2d4b0c1cc32d7",
    });
  });

  it("keeps the measured Kick display latches explicit", () => {
    const portable = readFileSync("tools/compare/megaKickPortable.ts", "utf8");
    expect(portable).toContain("variant-1 foot and RAM + 1 matrix");
    expect(portable).toContain("targetSprite.invisible !== (age >= 7 && age <= 113)");
    expect(portable).toContain("age >= 121 && age <= 157");
    expect(portable).toContain("fixture.targetSide === \"player\" ? 38 : 28");
  });
});
