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
  // player-back LICKITUNG (Factory set 164, move 122) -> opponent ONIX
  ["tools/compare/fixtures/lick-player-lickitung-opponent-onix.json", "player-to-opponent", { startFrame: 214, endFrame: 286, frameCount: 73 }, 185, 131, 108, "exact", 73, 73],
  // opponent-front LICKITUNG -> player ONIX (structurally identical every
  // frame -1; both first frames are clean, no skipProbeFrames)
  ["tools/compare/fixtures/lick-opponent-lickitung-player-onix.json", "opponent-to-player", { startFrame: 213, endFrame: 285, frameCount: 73 }, 131, 186, 108, "exact", 73, 73],
];

describe("MOVE_LICK dense evidence receipts", () => {
  it.each(fixtures)("pins a complete isolated Scene-ON window: %s", (path, orientation, window, playerHp, opponentHp, species, status, framebuffer, component) => {
    const receipt = JSON.parse(readFileSync(path, "utf8")) as Receipt;
    const scenario = JSON.parse(readFileSync(receipt.scenario, "utf8"));
    expect(receipt.schema).toBe("scene-on-portable-evidence/v1");
    expect(receipt.oracleProfile).toBe("battle-scene-on");
    expect(receipt.move).toBe("LICK");
    expect(receipt.probe).toBe("tools/compare/lickProbe.py");
    expect(receipt.orientation).toBe(orientation);
    expect(receipt.denseWindow).toEqual(window);
    expect(receipt.appStage).toEqual({ presentationAge: 0 });
    expect(receipt.attacker.species).toBe("LICKITUNG");
    expect(receipt.attacker.geometry.side).toBe(orientation === "player-to-opponent" ? "player" : "opponent");
    expect(receipt.target.species).toBe("ONIX");
    expect(receipt.evidenceSchema).toBe("lick-dense-evidence/v1");
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
    const lickitungOnPlayer = playerParty.some((mon) => mon.species === species);
    const lickitungParty = lickitungOnPlayer ? playerParty : opponentParty;
    const lickitung = lickitungParty.find((mon) => mon.species === species);
    expect(lickitung).toBeDefined();
    expect(lickitung!.moves).toEqual([122, 122, 122, 122]);
    expect(receipt.fieldProfile.playerHp).toBe(playerHp);
    expect(receipt.fieldProfile.opponentHp).toBe(opponentHp);
    expect(receipt.fieldProfile.playerHp).toBeLessThanOrEqual(receipt.fieldProfile.playerMaxHp);
    expect(receipt.fieldProfile.opponentHp).toBeLessThanOrEqual(receipt.fieldProfile.opponentMaxHp);
  });

  it("pins the twice-fresh hashes for both orientations", () => {
    expect(JSON.parse(readFileSync("tools/compare/fixtures/lick-player-lickitung-opponent-onix.json", "utf8")))
      .toMatchObject({
        evidenceSha256: "72c763d6a39394675e42dca981c4ee3f29f4e53031ee87d14a2aec5cd40b2a18",
        secondFreshEvidenceSha256: "72c763d6a39394675e42dca981c4ee3f29f4e53031ee87d14a2aec5cd40b2a18",
        rawRgbSha256: "862399772b492f96f8ba6a5b84eb46cdf2881e963c554282a135c12ad2360d91",
      });
    expect(JSON.parse(readFileSync("tools/compare/fixtures/lick-opponent-lickitung-player-onix.json", "utf8")))
      .toMatchObject({
        evidenceSha256: "2c8a668d1d14acdf7fb14eb645bfb0f6ed38d5ec5ef18729550b22a9f2bcb416",
        secondFreshEvidenceSha256: "2c8a668d1d14acdf7fb14eb645bfb0f6ed38d5ec5ef18729550b22a9f2bcb416",
        rawRgbSha256: "65f7c59555be001cbe500083b2db83e37585b9fdbec7b8302e3333dab5b18062",
      });
  });
});
