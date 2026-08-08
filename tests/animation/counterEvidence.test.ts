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
  // player-back HITMONTOP (Factory set 341, move 68) -> opponent ONIX
  ["tools/compare/fixtures/counter-player-hitmontop-opponent-onix.json", "player-to-opponent", { startFrame: 207, endFrame: 294, frameCount: 88 }, 152, 142, 237, "exact", 88, 88],
  // opponent-front HITMONTOP -> player ONIX (structurally identical on every
  // frame +0; both first frames are clean, no skipProbeFrames)
  ["tools/compare/fixtures/counter-opponent-hitmontop-player-onix.json", "opponent-to-player", { startFrame: 207, endFrame: 294, frameCount: 88 }, 142, 152, 237, "exact", 88, 88],
];

describe("MOVE_COUNTER dense evidence receipts", () => {
  it.each(fixtures)("pins a complete isolated Scene-ON window: %s", (path, orientation, window, playerHp, opponentHp, species, status, framebuffer, component) => {
    const receipt = JSON.parse(readFileSync(path, "utf8")) as Receipt;
    const scenario = JSON.parse(readFileSync(receipt.scenario, "utf8"));
    expect(receipt.schema).toBe("scene-on-portable-evidence/v1");
    expect(receipt.oracleProfile).toBe("battle-scene-on");
    expect(receipt.move).toBe("COUNTER");
    expect(receipt.probe).toBe("tools/compare/counterProbe.py");
    expect(receipt.orientation).toBe(orientation);
    expect(receipt.denseWindow).toEqual(window);
    expect(receipt.appStage).toEqual({ presentationAge: 0 });
    expect(receipt.attacker.species).toBe("HITMONTOP");
    expect(receipt.attacker.geometry.side).toBe(orientation === "player-to-opponent" ? "player" : "opponent");
    expect(receipt.target.species).toBe("ONIX");
    expect(receipt.evidenceSchema).toBe("counter-dense-evidence/v1");
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
    const hitmontopOnPlayer = playerParty.some((mon) => mon.species === species);
    const hitmontopParty = hitmontopOnPlayer ? playerParty : opponentParty;
    const hitmontop = hitmontopParty.find((mon) => mon.species === species);
    expect(hitmontop).toBeDefined();
    expect(hitmontop!.moves).toEqual([68, 68, 68, 68]);
    expect(receipt.fieldProfile.playerHp).toBe(playerHp);
    expect(receipt.fieldProfile.opponentHp).toBe(opponentHp);
    expect(receipt.fieldProfile.playerHp).toBeLessThanOrEqual(receipt.fieldProfile.playerMaxHp);
    expect(receipt.fieldProfile.opponentHp).toBeLessThanOrEqual(receipt.fieldProfile.opponentMaxHp);
  });

  it("pins the twice-fresh hashes for both orientations", () => {
    expect(JSON.parse(readFileSync("tools/compare/fixtures/counter-player-hitmontop-opponent-onix.json", "utf8")))
      .toMatchObject({
        evidenceSha256: "aeb600cddbd03ebcb0d8cf45d38d93ba03faf26e77fbfcd4951fd7dc0f6a6597",
        secondFreshEvidenceSha256: "aeb600cddbd03ebcb0d8cf45d38d93ba03faf26e77fbfcd4951fd7dc0f6a6597",
        rawRgbSha256: "858b9e0ff45947da10241dd7a61f60ab2498fac063fa8722ae3df6f765337da2",
      });
    expect(JSON.parse(readFileSync("tools/compare/fixtures/counter-opponent-hitmontop-player-onix.json", "utf8")))
      .toMatchObject({
        evidenceSha256: "d6c0b68ab4cecec213e6e85df12c2ba80c297658a2a195d7cbcab89716a93389",
        secondFreshEvidenceSha256: "d6c0b68ab4cecec213e6e85df12c2ba80c297658a2a195d7cbcab89716a93389",
        rawRgbSha256: "85cab93f5be1eac69b53034ff645ea4ee794a131d4da5eb97df8f30027fbe14b",
      });
  });
});
