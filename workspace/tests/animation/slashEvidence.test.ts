import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface Receipt {
  readonly schema: string;
  readonly oracleProfile: string;
  readonly scenario: string;
  readonly probe: string;
  readonly orientation: string;
  readonly move: string;
  readonly appStage: { readonly presentationAge: number };
  readonly denseWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
    readonly frameCount: number;
  };
  readonly attacker: { readonly species: string; readonly geometry: { readonly side: string } };
  readonly target: { readonly species: string };
  readonly evidenceSchema: string;
  readonly evidenceSha256: string;
  readonly secondFreshEvidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly acceptance: { readonly status: string; readonly framebufferMatching: number; readonly componentMatching: number };
  readonly fieldProfile: { readonly playerHp: number; readonly playerMaxHp: number; readonly opponentHp: number; readonly opponentMaxHp: number };
}

interface WindowExpect {
  readonly startFrame: number;
  readonly endFrame: number;
  readonly frameCount: number;
}

const fixtures: Array<[string, string, WindowExpect, number, number, number, "exact" | "partial", number, number]> = [
  // player-back CHARMELEON (Factory set 175, move 163) -> opponent ONIX
  ["tools/compare/fixtures/slash-player-charmeleon-opponent-onix.json", "player-to-opponent", { startFrame: 73, endFrame: 118, frameCount: 46 }, 165, 142, 5, "exact", 46, 46],
  // opponent-front CHARMELEON -> player ONIX (structurally identical +4 on
  // every frame; both first frames are clean, no skipProbeFrames)
  ["tools/compare/fixtures/slash-opponent-charmeleon-player-onix.json", "opponent-to-player", { startFrame: 77, endFrame: 122, frameCount: 46 }, 142, 165, 5, "exact", 46, 46],
];

describe("MOVE_SLASH dense evidence receipts", () => {
  it.each(fixtures)("pins a complete isolated Scene-ON window: %s", (path, orientation, window, playerHp, opponentHp, species, status, framebuffer, component) => {
    const receipt = JSON.parse(readFileSync(path, "utf8")) as Receipt;
    const scenario = JSON.parse(readFileSync(receipt.scenario, "utf8"));
    expect(receipt.schema).toBe("scene-on-portable-evidence/v1");
    expect(receipt.oracleProfile).toBe("battle-scene-on");
    expect(receipt.move).toBe("SLASH");
    expect(receipt.probe).toBe("tools/compare/slashProbe.py");
    expect(receipt.orientation).toBe(orientation);
    expect(receipt.denseWindow).toEqual(window);
    expect(receipt.appStage).toEqual({ presentationAge: 0 });
    expect(receipt.attacker.species).toBe("CHARMELEON");
    expect(receipt.attacker.geometry.side).toBe(orientation === "player-to-opponent" ? "player" : "opponent");
    expect(receipt.target.species).toBe("ONIX");
    expect(receipt.evidenceSchema).toBe("slash-dense-evidence/v1");
    expect(receipt.evidenceSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(receipt.secondFreshEvidenceSha256).toBe(receipt.evidenceSha256);
    expect(receipt.rawRgbSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(receipt.acceptance).toEqual({
      status,
      framebufferMatching: framebuffer,
      componentMatching: component,
    });
    expect(scenario).toMatchObject({ profile: "battle-scene-on", level: 50 });
    expect(scenario.overrides.parties.player).toHaveLength(3);
    expect(scenario.overrides.parties.opponent).toHaveLength(3);
    const playerParty = scenario.overrides.parties.player as Array<{ species: number; moves: number[] }>;
    const opponentParty = scenario.overrides.parties.opponent as Array<{ species: number; moves: number[] }>;
    const charmeleonOnPlayer = playerParty.some((mon) => mon.species === species);
    const charmeleonParty = charmeleonOnPlayer ? playerParty : opponentParty;
    const charmeleon = charmeleonParty.find((mon) => mon.species === species);
    expect(charmeleon).toBeDefined();
    expect(charmeleon!.moves).toEqual([163, 163, 163, 163]);
    expect(receipt.fieldProfile.playerHp).toBe(playerHp);
    expect(receipt.fieldProfile.opponentHp).toBe(opponentHp);
    expect(receipt.fieldProfile.playerHp).toBeLessThanOrEqual(receipt.fieldProfile.playerMaxHp);
    expect(receipt.fieldProfile.opponentHp).toBeLessThanOrEqual(receipt.fieldProfile.opponentMaxHp);
  });

  it("pins the twice-fresh hashes for both orientations", () => {
    expect(JSON.parse(readFileSync("tools/compare/fixtures/slash-player-charmeleon-opponent-onix.json", "utf8")))
      .toMatchObject({
        evidenceSha256: "b1e38fbcfdc72767f1ec0caef3cda6cea5e364edcad56cdc7a8e1088183dda88",
        secondFreshEvidenceSha256: "b1e38fbcfdc72767f1ec0caef3cda6cea5e364edcad56cdc7a8e1088183dda88",
        rawRgbSha256: "df7ff7a8237190853b44e6dea7879e0154ec8762532567c97fdae84a2ffce413",
      });
    expect(JSON.parse(readFileSync("tools/compare/fixtures/slash-opponent-charmeleon-player-onix.json", "utf8")))
      .toMatchObject({
        evidenceSha256: "b23785fb0bcf7855dba88f32fa0d0cf458feaa09be32bd3df5f7aa4c9ae4aba5",
        secondFreshEvidenceSha256: "b23785fb0bcf7855dba88f32fa0d0cf458feaa09be32bd3df5f7aa4c9ae4aba5",
        rawRgbSha256: "a08c6c22184a8b0f368e0563c58d50504d25648f8905da02f1664cd6541a9ac2",
      });
  });
});
