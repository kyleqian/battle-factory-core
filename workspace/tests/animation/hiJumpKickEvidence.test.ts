import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Fixture = {
  readonly schema: string;
  readonly oracleProfile: string;
  readonly orientation: "player-back" | "opponent-front";
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly attackerSide: "player" | "opponent";
  readonly targetSide: "player" | "opponent";
  readonly attacker: { readonly species: string; readonly geometry: { readonly spriteCorner: { readonly x: number; readonly y: number } } };
  readonly target: { readonly species: string };
  readonly evidenceSchema: string;
  readonly evidenceSha256: string;
  readonly secondFreshEvidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly changeMap: string;
  readonly changeMapSha256: string;
  readonly acceptance: { readonly status: string; readonly componentMatching: number; readonly framebufferMatching: number };
};

const hash = (value: string | Buffer): string =>
  createHash("sha256").update(value).digest("hex");

describe("MOVE_HI_JUMP_KICK committed evidence inventory", () => {
  it("pins both legal Scene-ON dense receipts and normalized change maps", () => {
    const paths = [
      "tools/compare/fixtures/hi-jump-kick-player-medicham-opponent-onix.json",
      "tools/compare/fixtures/hi-jump-kick-opponent-medicham-player-onix.json",
    ];
    for (const path of paths) {
      const fixture = JSON.parse(readFileSync(resolve(path), "utf8")) as Fixture;
      const map = readFileSync(resolve(fixture.changeMap), "utf8");
      expect(fixture.schema).toBe("hi-jump-kick-portable-evidence/v1");
      expect(fixture.oracleProfile).toBe("battle-scene-on");
      expect(fixture.evidenceSchema).toBe("hi-jump-kick-dense-evidence/v1");
      expect(fixture.denseWindow.frameCount).toBe(91);
      expect(fixture.denseWindow.endFrame - fixture.denseWindow.startFrame + 1).toBe(91);
      expect(fixture.attacker.species).toBe("MEDICHAM");
      expect(fixture.target.species).toBe("ONIX");
      expect(fixture.attacker.geometry.spriteCorner.x).toBe(fixture.attackerSide === "player" ? 40 : 144);
      expect(fixture.attacker.geometry.spriteCorner.y).toBe(fixture.attackerSide === "player" ? 51 : 9);
      expect(fixture.acceptance).toEqual({ status: "exact", componentMatching: 91, framebufferMatching: 91 });
      expect(fixture.secondFreshEvidenceSha256).toBe(fixture.evidenceSha256);
      expect(hash(map)).toBe(fixture.changeMapSha256);
      expect(map.startsWith(`# ${basename(fixture.changeMap)} raw RGB888 — 91 frames, 240x160\n`)).toBe(true);
    }
  });

  it("pins set 373 as the sole active Medicham carrier in both complete parties", () => {
    const paths = [
      "tools/battle-lab/mechanic-hi-jump-kick-player-medicham-opponent-onix.json",
      "tools/battle-lab/mechanic-hi-jump-kick-opponent-medicham-player-onix.json",
    ];
    let carrierCount = 0;
    for (const path of paths) {
      const scenario = JSON.parse(readFileSync(resolve(path), "utf8")) as {
        playerSetIds: number[];
        opponentSetIds: number[];
        overrides: { parties: { player: readonly { species: number; moves: number[] }[]; opponent: readonly { species: number; moves: number[] }[] } };
      };
      expect([...scenario.playerSetIds, ...scenario.opponentSetIds]).toContain(373);
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      carrierCount += [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent]
        .filter((mon) => mon.species === 357 && mon.moves.includes(136)).length;
    }
    expect(carrierCount).toBe(2);
  });
});
