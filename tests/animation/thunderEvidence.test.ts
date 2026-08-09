import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface Receipt {
  readonly schema: string;
  readonly oracleProfile: string;
  readonly scenario: string;
  readonly probe: string;
  readonly move: string;
  readonly moveId: number;
  readonly orientation: string;
  readonly activeSourceScriptWindow: { readonly frameCount: number };
  readonly sourceAnimationWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly sourceBounds: { readonly start: string; readonly endExclusive: string; readonly cleanupOffset: number };
  readonly evidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly freshRuns: number;
  readonly acceptance: {
    readonly status: string;
    readonly componentMatching: number;
    readonly framebufferMatching: number;
  };
}

const cases: Array<[string, string, number, number, string, string, string, string]> = [
  ["thunder-player-magneton-opponent-shuckle.json", "player-back-to-opponent-front", 76, 337,
    "e2cbab666552c493a9ac7d7d0bf38bad7ed09deac2ef93d7badb6ff0dc3fdc93",
    "bb5b5dffeb62acfe4f74e57e3b64be887c685c9305f59ac63c5bbf30c28c14a2",
    "tools/compare/evidence/thunder-changemap-player.txt", "f6b4949dd0ae921911de5f8eea3ebd32f0fc35a1b8a1f51ef08a683395470ba2"],
  ["thunder-opponent-magneton-player-shuckle.json", "opponent-front-to-player-back", 80, 341,
    "45a17da410f2703625028eafe85d34a5aff5d70af3944698eb001c3415607f7f",
    "f6d879f0e4b659ed4940604b8179d5440843eb1d1e98040466a66bb0098c6f7a",
    "tools/compare/evidence/thunder-changemap-opponent.txt", "dae87b566d5d8a9326b178c6ed9b573f64f48066d4d585af3240fd4414f6809f"],
];

describe("MOVE_THUNDER exact bilateral evidence", () => {
  it.each(cases)("pins the complete portable-exact source window: %s",
    (name, orientation, startFrame, endFrame, evidenceSha256, rawRgbSha256, mapPath, mapSha256) => {
      const receipt = JSON.parse(readFileSync(`tools/compare/fixtures/${name}`, "utf8")) as Receipt;
      const scenario = JSON.parse(readFileSync(receipt.scenario, "utf8"));
      expect(receipt).toMatchObject({
        schema: "scene-on-portable-evidence/v1",
        oracleProfile: "battle-scene-on", probe: "tools/compare/thunderProbe.py",
        move: "THUNDER", moveId: 87, orientation,
        activeSourceScriptWindow: { frameCount: 261 },
        sourceAnimationWindow: { startFrame, endFrame, frameCount: 262 },
        sourceBounds: { start: "0x082cf935", endExclusive: "0x082cfa8f", cleanupOffset: 345 },
        evidenceSha256, rawRgbSha256, freshRuns: 2,
        acceptance: {
          status: "exact", componentMatching: 262, framebufferMatching: 262,
        },
      });
      expect(scenario).toMatchObject({ profile: "battle-scene-on", level: 50 });
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      const party = [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent] as Array<{ species: number; moves: number[] }>;
      expect(party.find((mon) => mon.species === 82)?.moves).toEqual([87, 87, 87, 87]);
      expect(party.some((mon) => mon.species === 213)).toBe(true);
      expect(createHash("sha256").update(readFileSync(mapPath)).digest("hex")).toBe(mapSha256);
    });

  it("pins the complete source body and the materially different siblings", () => {
    const source = readFileSync("reference/pokeemerald/data/battle_anim_scripts.s", "utf8");
    const block = (start: string, end: string) => source.slice(source.indexOf(`${start}:`), source.indexOf(`${end}:`, source.indexOf(`${start}:`) + 1));
    const thunder = block("Move_THUNDER", "Move_THUNDER_PUNCH");
    expect(thunder).toContain("fadetobg BG_THUNDER");
    expect(thunder).toContain("AnimTask_StartSlidingBg, 5, -256, 0, 1, -1");
    expect(thunder).toContain("simple_palette_blend selector=F_PAL_BG");
    expect(thunder.match(/gLightningSpriteTemplate/g)).toHaveLength(12);
    expect(thunder).toContain("AnimTask_ShakeTargetInPattern, 2, 30, 3, TRUE, 0");
    expect(thunder).toContain("restorebg");
    expect(block("Move_GLARE", "Move_BARRAGE")).toContain("AnimTask_ShakeTargetInPattern, 3, 20, 1, FALSE");
    expect(block("Move_TRI_ATTACK", "Move_MINIMIZE")).toContain("AnimTask_ShakeTargetInPattern, 2, 20, 3, TRUE, 1");
  });
});
