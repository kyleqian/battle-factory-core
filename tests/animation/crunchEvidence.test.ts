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
  // player-back HOUNDOUR (Factory set 119, move 242) -> opponent ONIX
  ["tools/compare/fixtures/crunch-player-houndour-opponent-onix.json", "player-to-opponent", { startFrame: 74, endFrame: 215, frameCount: 142 }, 141, 142, 228, "exact", 142, 142],
  // opponent-front HOUNDOUR -> player ONIX (structurally identical +4 on
  // every frame; both first frames are clean, no skipProbeFrames)
  ["tools/compare/fixtures/crunch-opponent-houndour-player-onix.json", "opponent-to-player", { startFrame: 78, endFrame: 219, frameCount: 142 }, 142, 141, 228, "exact", 142, 142],
];

describe("MOVE_CRUNCH dense evidence receipts", () => {
  it.each(fixtures)("pins a complete isolated Scene-ON window: %s", (path, orientation, window, playerHp, opponentHp, species, status, framebuffer, component) => {
    const receipt = JSON.parse(readFileSync(path, "utf8")) as Receipt;
    const scenario = JSON.parse(readFileSync(receipt.scenario, "utf8"));
    expect(receipt.schema).toBe("scene-on-portable-evidence/v1");
    expect(receipt.oracleProfile).toBe("battle-scene-on");
    expect(receipt.move).toBe("CRUNCH");
    expect(receipt.probe).toBe("tools/compare/crunchProbe.py");
    expect(receipt.orientation).toBe(orientation);
    expect(receipt.denseWindow).toEqual(window);
    expect(receipt.appStage).toEqual({ presentationAge: 0 });
    expect(receipt.attacker.species).toBe("HOUNDOUR");
    expect(receipt.attacker.geometry.side).toBe(orientation === "player-to-opponent" ? "player" : "opponent");
    expect(receipt.target.species).toBe("ONIX");
    expect(receipt.evidenceSchema).toBe("crunch-dense-evidence/v1");
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
    const houndourOnPlayer = playerParty.some((mon) => mon.species === species);
    const houndourParty = houndourOnPlayer ? playerParty : opponentParty;
    const houndour = houndourParty.find((mon) => mon.species === species);
    expect(houndour).toBeDefined();
    expect(houndour!.moves).toEqual([242, 242, 242, 242]);
    expect(receipt.fieldProfile.playerHp).toBe(playerHp);
    expect(receipt.fieldProfile.opponentHp).toBe(opponentHp);
    expect(receipt.fieldProfile.playerHp).toBeLessThanOrEqual(receipt.fieldProfile.playerMaxHp);
    expect(receipt.fieldProfile.opponentHp).toBeLessThanOrEqual(receipt.fieldProfile.opponentMaxHp);
  });

  it("pins the twice-fresh hashes for both orientations", () => {
    expect(JSON.parse(readFileSync("tools/compare/fixtures/crunch-player-houndour-opponent-onix.json", "utf8")))
      .toMatchObject({
        evidenceSha256: "8aefff069fb3a7595f08e45b0e97114217e59b171499341d3e4540b5638fec32",
        secondFreshEvidenceSha256: "8aefff069fb3a7595f08e45b0e97114217e59b171499341d3e4540b5638fec32",
        rawRgbSha256: "bf3360b12a1810a883203bf025f370a82bcc39508a2613771ef7f47f7e516a6c",
      });
    expect(JSON.parse(readFileSync("tools/compare/fixtures/crunch-opponent-houndour-player-onix.json", "utf8")))
      .toMatchObject({
        evidenceSha256: "f4ebd54457d448ae2108fdbf97d325375daffb4f24b421ea0bfa8184578a3aee",
        secondFreshEvidenceSha256: "f4ebd54457d448ae2108fdbf97d325375daffb4f24b421ea0bfa8184578a3aee",
        rawRgbSha256: "8b7215a7116500641958b1a0345ee264458b9be86461f8451a2618273d56ee8e",
      });
  });
});
