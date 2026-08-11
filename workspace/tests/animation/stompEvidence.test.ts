import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface Receipt {
  readonly schema: string;
  readonly oracleProfile: string;
  readonly move: string;
  readonly orientation: string;
  readonly scenario: string;
  readonly probe: string;
  readonly sourceWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
    readonly frameCount: number;
  };
  readonly evidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly changeMap: string;
  readonly changeMapSha256: string;
  readonly attacker: { readonly species: string; readonly geometry: { readonly side: string } };
  readonly target: { readonly species: string; readonly geometry: { readonly side: string } };
  readonly acceptance: {
    readonly status: string;
    readonly componentMatching: number;
    readonly framebufferMatching: number;
  };
}

const fixtures: readonly [string, string, string, string, string][] = [
  [
    "tools/compare/fixtures/stomp-player-loudred-opponent-onix.json",
    "player-back",
    "09f5e153176e9b5954190cf929523f39d27587672a1ad14eb4e544357616591b",
    "20fefcf15094d2e764b29ba2a0194a2bd657e47e33440a1f15a82b78de9a5ac3",
    "231ee382ecfdf403c8f659aa60547411097287632eaac1691d0c246b2754aae2",
  ],
  [
    "tools/compare/fixtures/stomp-opponent-loudred-player-onix.json",
    "opponent-front",
    "e99ef777beded45d45a239e50bee770a09462ac412d5a60a7ff0771823e3c864",
    "9771a53ae750504f67462758057f5a25f393829370f7876720fe2d92047681ce",
    "88fc9e260bda6f1750363b8aae2067a83c5ed602abdb8e8f70b22033f3ed3498",
  ],
];

describe("MOVE_STOMP exact Scene-ON evidence", () => {
  it.each(fixtures)(
    "pins the twice-fresh %s receipt",
    (path, orientation, evidenceSha256, rawRgbSha256, changeMapSha256) => {
      const receipt = JSON.parse(readFileSync(path, "utf8")) as Receipt;
      const scenario = JSON.parse(readFileSync(receipt.scenario, "utf8"));
      expect(receipt).toMatchObject({
        schema: "stomp-portable-evidence/v1",
        oracleProfile: "battle-scene-on",
        move: "STOMP",
        orientation,
        probe: "tools/compare/stompProbe.py",
        sourceWindow: { startFrame: 215, endFrame: 281, frameCount: 67 },
        attacker: { species: "LOUDRED", geometry: { side: orientation === "player-back" ? "player" : "opponent" } },
        target: { species: "ONIX", geometry: { side: orientation === "player-back" ? "opponent" : "player" } },
        evidenceSha256,
        rawRgbSha256,
        changeMapSha256,
        acceptance: { status: "exact", componentMatching: 67, framebufferMatching: 67 },
      });
      expect(createHash("sha256").update(readFileSync(receipt.changeMap)).digest("hex"))
        .toBe(changeMapSha256);
      expect(scenario).toMatchObject({ profile: "battle-scene-on", level: 50 });
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
    },
  );

  it("keeps source/OAM/palette/audio and raw-RGB proof load-bearing", () => {
    const portable = readFileSync("tools/compare/stompPortable.ts", "utf8");
    expect(portable).toContain("priorHardwareMatches");
    expect(portable).toContain("palette-load/OAM latch");
    expect(portable).toContain("AnimTask_ShakeMon");
    expect(portable).toContain("rawReceipts");
    expect(portable).toContain("change-map receipt");
  });
});
