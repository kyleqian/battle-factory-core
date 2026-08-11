import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface Mon {
  readonly species: number; readonly level: number; readonly nature: number;
  readonly ivs: Readonly<Record<string, number>>; readonly evs: Readonly<Record<string, number>>;
  readonly moves: readonly number[]; readonly ppUps: readonly number[]; readonly item: number;
  readonly abilitySlot: number; readonly friendship: number; readonly gender: string; readonly shiny: boolean;
}

describe("MOVE_THRASH source/evidence checkpoint", () => {
  it("pins the exact script-data interval, six-component graph, sole carrier, and distinct sibling", () => {
    const output = execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/thrashSourceAudit.ts",
    ], { encoding: "utf8" });
    expect(output).toContain("0x082cc981..0x082cca00 (0x7f bytes; byte 0x082cc980 belongs to HornDrillInContest)");
    expect(output).toContain("six components");
    expect(output).toContain("set 408 FRONTIER_MON_TAUROS_1");
    expect(output).toContain("MOVE_DOUBLE_KICK has 11 carriers and a distinct");
  });

  it("stages complete legal challenge-3 three-Pokemon parties in both orientations", () => {
    const paths = [
      "tools/battle-lab/mechanic-thrash-player-tauros-opponent-onix.json",
      "tools/battle-lab/mechanic-thrash-opponent-tauros-player-onix.json",
    ];
    let carriers = 0;
    for (const path of paths) {
      const scenario = JSON.parse(readFileSync(path, "utf8")) as {
        profile: string; challengeNum: number; playerSetIds: number[]; opponentSetIds: number[];
        overrides: { parties: { player: readonly Mon[]; opponent: readonly Mon[] } };
      };
      expect(scenario.profile).toBe("battle-scene-on");
      expect(scenario.challengeNum).toBe(3);
      expect([...scenario.playerSetIds, ...scenario.opponentSetIds]).toContain(408);
      expect([...scenario.playerSetIds, ...scenario.opponentSetIds].every((id) => id >= 372 && id <= 467)).toBe(true);
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      for (const mon of [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent]) {
        expect(mon.level).toBe(50);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        for (const field of ["item", "abilitySlot", "friendship", "gender", "shiny"] as const) {
          expect(mon).toHaveProperty(field);
        }
      }
      carriers += [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent]
        .filter((mon) => mon.species === 128 && mon.moves.every((move) => move === 37)).length;
    }
    expect(carriers).toBe(2);
  });

  it("pins bilateral dense receipts, maps, measured latches, and the unsupported verdict", () => {
    for (const [path, window, evidence, raw, mapHash] of [
      ["tools/compare/fixtures/thrash-player-tauros-opponent-onix.json",
        { startFrame: 72, endFrame: 174, frameCount: 103 },
        "16832a54913890270e1334b9147bd3240a9c1af3d745ea943865961aa4eea408",
        "23f6c80748540ca07435b4771e72d334bda72597bfe74dca83176584a9b772c0",
        "0a305072cd76cbadad88e2e4f0b32887878e47eb0e49becd3ac47c0177344c2d"],
      ["tools/compare/fixtures/thrash-opponent-tauros-player-onix.json",
        { startFrame: 76, endFrame: 178, frameCount: 103 },
        "e1317010a41abcef53ab7e0a9758a56158140c8987b6d61b855d36c8de482424",
        "eac38716e6086a36b889923f00965534ca94954aa9dff4f06f76144b6b7935f0",
        "056021bd706abde44edbb102c6932201172e17a2998a5c0a04980e184c8750f8"],
    ] as const) {
      const fixture = JSON.parse(readFileSync(path, "utf8"));
      expect(fixture.denseWindow).toEqual(window);
      expect(fixture.evidenceSha256).toBe(evidence);
      expect(fixture.secondFreshEvidenceSha256).toBe(evidence);
      expect(fixture.rawRgbSha256).toBe(raw);
      expect(createHash("sha256").update(readFileSync(fixture.changeMap)).digest("hex")).toBe(mapHash);
      expect(fixture.latches.thrashHorizontalAffine).toBe("RAM+2");
      expect(fixture.latches.thrashVerticalPosition).toBe("RAM+1");
      expect(fixture.latches.shakeMonInPlace).toContain("unknown");
      expect(fixture.acceptance).toEqual({ status: "evidence-only-unsupported", denseEvidenceFrames: 103 });
    }
    const coverage = readFileSync("ANIMATION_COVERAGE.json", "utf8");
    expect(coverage).toContain("MOVE_THRASH remains unsupported");
    expect(coverage).toContain("MOVE_DOUBLE_KICK remains independently unsupported");
  });
});
