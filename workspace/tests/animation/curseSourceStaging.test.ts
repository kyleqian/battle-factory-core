import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;
const audit = (): Json => JSON.parse(execFileSync(
  process.execPath,
  ["--experimental-strip-types", "tools/compare/curseSourceAudit.ts"],
  { encoding: "utf8", maxBuffer: 32 << 20 },
)) as Json;

describe("MOVE_CURSE source classification and exact coverage", () => {
  it("pins the half-open source/ELF/ROM root, all five blocks, and direct bodies", () => {
    const first = audit();
    expect(audit()).toEqual(first);
    expect(first).toMatchObject({
      schema: "curse-source-audit/v1", move: "MOVE_CURSE", moveId: 174,
      status: "exact", coverageCredit: true,
      source: {
        pointerOwnedRoot: {
          symbol: "Move_CURSE", nextDispatchLabel: "Move_SOFT_BOILED",
          elf: { start: "0x082d3bf2", endExclusive: "0x082d3cb2", byteLength: 0xc0 },
          rom: { start: "0x082d3bf2", endExclusive: "0x082d3cb2", byteLength: 0xc0 },
        },
        blocks: [
          { name: "Move_CURSE", elf: { start: "0x082d3bf2", endExclusive: "0x082d3bfb", byteLength: 9 } },
          { name: "CurseGhost", elf: { start: "0x082d3bfb", endExclusive: "0x082d3c62", byteLength: 0x67 } },
          { name: "CurseGhostShakeFromNail", elf: { start: "0x082d3c62", endExclusive: "0x082d3c78", byteLength: 0x16 } },
          { name: "CurseStats", elf: { start: "0x082d3c78", endExclusive: "0x082d3c93", byteLength: 0x1b } },
          { name: "CurseStats1", elf: { start: "0x082d3c93", endExclusive: "0x082d3cb2", byteLength: 0x1f } },
        ],
      },
      graph: { componentCount: 16, blocks: ["Move_CURSE", "CurseGhost", "CurseStats", "CurseGhostShakeFromNail", "CurseStats1"] },
    });
    expect(first.source.blocks).toHaveLength(5);
    for (const block of first.source.blocks as Json[]) {
      expect(block.source).toMatchObject({ path: "data/battle_anim_scripts.s", sha256: expect.stringMatching(/^[0-9a-f]{64}$/) });
      expect(block.elf).toMatchObject({ image: "reference/pokeemerald/pokeemerald.elf" });
      expect(block.rom).toMatchObject({ image: "reference/pokeemerald/pokeemerald.gba", sha256: expect.stringMatching(/^[0-9a-f]{64}$/) });
    }
    for (const body of Object.values(first.source.directBodies) as Json[]) {
      expect(body.source).toMatchObject({ path: expect.stringMatching(/^src\//), sha256: expect.stringMatching(/^[0-9a-f]{64}$/) });
      expect(body.elf).toMatchObject({ image: "reference/pokeemerald/pokeemerald.elf", byteLength: expect.any(Number) });
      expect(body.rom).toMatchObject({ image: "reference/pokeemerald/pokeemerald.gba", sha256: expect.stringMatching(/^[0-9a-f]{64}$/) });
    }
  });

  it("pins the complete 18-set Level-50 census, both natural branches, and non-transfer controls", () => {
    const result = audit();
    expect(result.graph.components).toHaveLength(16);
    expect(result.graph.novelTrackComponents).toHaveLength(10);
    expect(result.carriers).toMatchObject({ allFactoryCount: 20, level50Count: 18, census: { complete: true, frontierMonCount: 18, speciesCount: 15 } });
    expect(result.carriers.level50.map((entry: Json) => entry.index)).toEqual([
      458, 471, 516, 525, 534, 540, 543, 548, 556, 578, 580, 666, 699, 748, 764, 784, 826, 838,
    ]);
    expect(result.carriers.excludedOutsideLevel50.map((entry: Json) => entry.index)).toEqual([865, 866]);
    expect(result.source.branches).toMatchObject({
      selector: "choosetwoturnanim CurseGhost, CurseStats",
      ghost: { attacker: "Ghost", nailShake: [4, 0, 10, 0], ghostShake: [2, 0, 14, 1] },
      stats: { attacker: "non-Ghost", sway: [0, 10, 1536, 3], whiteLines: true, paletteBlends: 2 },
    });
    expect(result.controls).toMatchObject({
      siblingMoves: [
        { move: "MOVE_TICKLE" }, { move: "MOVE_ATTRACT" }, { move: "MOVE_SCREECH" },
        { move: "MOVE_SLEEP_TALK" }, { move: "MOVE_BIND" },
      ], noTransferCredit: true, onlyRepresentative: ["MOVE_CURSE"],
    });
    expect(result.checkpoint).toMatchObject({
      sourceAudit: true, completePointerOwnedRoot: true, completeReachableVisualGraph: true,
      halfOpenSourceElfRomIntervals: true, fullFactoryCarrierCensus: true, completeLevel50CarrierCensus: true,
      naturalGhostAndStatBranches: true, productionChanged: true, reducerAdded: true,
      typedSceneOnSeam: true, compositorAdded: true, coveragePromotion: true,
      componentTrackFulfilled: true, gameplayStateOwned: false, unsupportedNoCreditBoundary: false,
    });
  });
});
