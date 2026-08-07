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
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly attacker: { readonly species: string; readonly geometry: { readonly side: string } };
  readonly target: { readonly species: string };
  readonly evidenceSchema: string;
  readonly evidenceSha256: string;
  readonly secondFreshEvidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly acceptance: { readonly status: string; readonly framebufferMatching: number; readonly componentMatching: number };
  readonly fieldProfile: { readonly playerHp: number; readonly playerMaxHp: number; readonly opponentHp: number; readonly opponentMaxHp: number };
}

const fixtures: Array<[string, string, number, number]> = [
  // player-back ROSELIA (Factory record 171, move 320) -> opponent ONIX
  ["tools/compare/fixtures/grass-whistle-player-roselia-opponent-onix.json", "player-to-opponent", 147, 110],
  // opponent-front ROSELIA (Factory record 171, move 320) -> player ONIX
  ["tools/compare/fixtures/grass-whistle-opponent-roselia-player-onix.json", "opponent-to-player", 110, 147],
];

describe("MOVE_GRASS_WHISTLE dense evidence receipts", () => {
  it.each(fixtures)("pins a complete isolated Scene-ON window: %s", (path, orientation, playerHp, opponentHp) => {
    const receipt = JSON.parse(readFileSync(path, "utf8")) as Receipt;
    const scenario = JSON.parse(readFileSync(receipt.scenario, "utf8"));
    expect(receipt.schema).toBe("scene-on-portable-evidence/v1");
    expect(receipt.oracleProfile).toBe("battle-scene-on");
    expect(receipt.move).toBe("GRASS_WHISTLE");
    expect(receipt.probe).toBe("tools/compare/grassWhistleProbe.py");
    expect(receipt.orientation).toBe(orientation);
    // Both legal orientations share the script-pointer-isolated 216-440 window.
    expect(receipt.denseWindow).toEqual({ startFrame: 216, endFrame: 440, frameCount: 225 });
    expect(receipt.appStage).toEqual({ presentationAge: 0 });
    expect(receipt.attacker.species).toBe("ROSELIA");
    expect(receipt.attacker.geometry.side).toBe(orientation === "player-to-opponent" ? "player" : "opponent");
    expect(receipt.target.species).toBe("ONIX");
    expect(receipt.evidenceSchema).toBe("grass-whistle-dense-evidence/v1");
    expect(receipt.evidenceSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(receipt.secondFreshEvidenceSha256).toBe(receipt.evidenceSha256);
    expect(receipt.rawRgbSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(receipt.acceptance).toEqual({
      status: "exact",
      framebufferMatching: 225,
      componentMatching: 225,
    });
    expect(scenario).toMatchObject({ profile: "battle-scene-on", level: 50 });
    expect(scenario.overrides.parties.player).toHaveLength(3);
    expect(scenario.overrides.parties.opponent).toHaveLength(3);
    const playerParty = scenario.overrides.parties.player as Array<{ species: number; moves: number[] }>;
    const opponentParty = scenario.overrides.parties.opponent as Array<{ species: number; moves: number[] }>;
    const roseliaOnPlayer = playerParty.some((mon) => mon.species === 363);
    const roseliaParty = roseliaOnPlayer ? playerParty : opponentParty;
    const roselia = roseliaParty.find((mon) => mon.species === 363);
    expect(roselia).toBeDefined();
    expect(roselia!.moves).toEqual([320, 320, 320, 320]);
    const onixParty = roseliaOnPlayer ? opponentParty : playerParty;
    for (const mon of onixParty) {
      expect(mon.species).toBe(95);
      expect(mon.moves).toEqual([33, 33, 33, 33]);
    }
    expect(receipt.fieldProfile.playerHp).toBe(playerHp);
    expect(receipt.fieldProfile.opponentHp).toBe(opponentHp);
    expect(receipt.fieldProfile.playerHp).toBeLessThanOrEqual(receipt.fieldProfile.playerMaxHp);
    expect(receipt.fieldProfile.opponentHp).toBeLessThanOrEqual(receipt.fieldProfile.opponentMaxHp);
  });

  it("pins the twice-fresh hashes for both orientations", () => {
    expect(JSON.parse(readFileSync("tools/compare/fixtures/grass-whistle-player-roselia-opponent-onix.json", "utf8")))
      .toMatchObject({
        evidenceSha256: "4b4aef457f57f541977a898787a4285a14b44144654a6898c6d08df02ff5298a",
        secondFreshEvidenceSha256: "4b4aef457f57f541977a898787a4285a14b44144654a6898c6d08df02ff5298a",
        rawRgbSha256: "eee49e4817a8d51a0dfe8c0a366b013d3ffd11e7c68e4d1ba9c1bff75a0154ee",
      });
    expect(JSON.parse(readFileSync("tools/compare/fixtures/grass-whistle-opponent-roselia-player-onix.json", "utf8")))
      .toMatchObject({
        evidenceSha256: "22a0ea611845be719b07ae323f132f40ddb417176b967767e9b023f4068e51db",
        secondFreshEvidenceSha256: "22a0ea611845be719b07ae323f132f40ddb417176b967767e9b023f4068e51db",
        rawRgbSha256: "9d218d9a997f651cdecb491c973ca4baa660d98fcb37052f16d3330e32d21ee5",
      });
  });
});
