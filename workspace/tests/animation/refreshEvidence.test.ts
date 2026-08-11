import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface Receipt {
  readonly schema: string;
  readonly oracleProfile: string;
  readonly scenario: string;
  readonly probe: string;
  readonly orientation: string;
  readonly move: string;
  readonly appStage: { readonly oracleFrame: number; readonly presentationAge: number };
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly attacker: { readonly species: string; readonly geometry: { readonly side: string } };
  readonly target: { readonly species: string };
  readonly evidenceSchema: string;
  readonly evidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly lifecycleCounts: Record<string, number>;
  readonly fieldProfile: { readonly playerHp: number; readonly playerMaxHp: number };
}

const fixtures: Array<[string, number, number, number]> = [
  // player-back CHANSEY (Factory record 227) -> opponent ONIX (exact)
  ["tools/compare/fixtures/refresh-player-chansey-opponent-onix.json", 515, 723, 325],
  // opponent-front CHANSEY (Factory record 227) -> player ONIX (exact)
  ["tools/compare/fixtures/refresh-opponent-chansey-player-onix.json", 519, 727, 142],
];

describe("MOVE_REFRESH dense evidence receipts", () => {
  it.each(fixtures)("pins a complete Scene-ON window: %s", (path, startFrame, endFrame, playerHp) => {
    const receipt = JSON.parse(readFileSync(path, "utf8")) as Receipt;
    const scenario = JSON.parse(readFileSync(receipt.scenario, "utf8"));
    expect(receipt.schema).toBe("scene-on-portable-evidence/v1");
    expect(receipt.oracleProfile).toBe("battle-scene-on");
    expect(receipt.move).toBe("REFRESH");
    expect(receipt.probe).toBe("tools/compare/refreshProbe.py");
    expect(receipt.denseWindow.startFrame).toBe(startFrame);
    expect(receipt.denseWindow.endFrame).toBe(endFrame);
    expect(receipt.denseWindow.frameCount).toBe(endFrame - startFrame + 1);
    expect(receipt.appStage).toEqual({
      oracleFrame: startFrame,
      presentationAge: 0,
    });
    expect(receipt.attacker.species).toBe("CHANSEY");
    expect(receipt.target.species).toBe("ONIX");
    expect(receipt.evidenceSchema).toBe("refresh-dense-evidence/v1");
    expect(receipt.evidenceSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(receipt.rawRgbSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(receipt.lifecycleCounts).toEqual({
      gGrantingStarsSpriteTemplate: 2,
      gThinRingExpandingSpriteTemplate: 1,
      gSimplePaletteBlendSpriteTemplate: 1,
    });
    expect(scenario).toMatchObject({ profile: "battle-scene-on", level: 50 });
    expect(scenario.overrides.parties.player).toHaveLength(3);
    expect(scenario.overrides.parties.opponent).toHaveLength(3);
    const playerParty = scenario.overrides.parties.player as Array<{ species: number; moves: number[] }>;
    const opponentParty = scenario.overrides.parties.opponent as Array<{ species: number; moves: number[] }>;
    const chanseyOnPlayer = playerParty.some((mon) => mon.species === 113);
    const chanseyParty = chanseyOnPlayer ? playerParty : opponentParty;
    const chansey = chanseyParty.find((mon) => mon.species === 113);
    expect(chansey).toBeDefined();
    expect(chansey!.moves).toEqual([287, 287, 287, 287]);
    const toxicParty = chanseyOnPlayer ? opponentParty : playerParty;
    for (const mon of toxicParty) {
      expect(mon.moves).toEqual([92, 92, 92, 92]);
    }
    expect(receipt.fieldProfile.playerHp).toBe(playerHp);
    expect(receipt.fieldProfile.playerHp).toBeLessThanOrEqual(receipt.fieldProfile.playerMaxHp);
    expect(receipt.attacker.geometry.side).toBe(chanseyOnPlayer ? "player" : "opponent");
    expect(receipt.orientation).toBe(chanseyOnPlayer ? "player-to-opponent" : "opponent-to-player");
  });
});
