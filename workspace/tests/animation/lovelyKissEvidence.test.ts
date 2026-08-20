import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import fixture from "../../tools/compare/fixtures/lovely-kiss-evidence.json" with { type: "json" };
import { verifyLovelyKissEvidence } from "../../tools/compare/lovelyKissEvidence.ts";

describe("MOVE_LOVELY_KISS retained evidence checkpoint", () => {
  it("pins the source interval, graph, callbacks, assets, audio, and lowest carrier", () => {
    const audit = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", fixture.source.audit,
    ], { encoding: "utf8" })) as Record<string, any>;
    expect(audit).toMatchObject({
      move: "MOVE_LOVELY_KISS",
      moveId: 142,
      sourceBounds: {
        start: "0x082d4035",
        endExclusive: "0x082d407c",
        byteLength: 71,
        pointerContract: "half-open-byte-interval-with-even-and-odd-command-pointers-observed",
      },
      graph: {
        blocks: ["Move_LOVELY_KISS"],
        components: fixture.components,
      },
      carrier: {
        frontierMon: "FRONTIER_MON_JYNX_1",
        setId: 377,
        speciesId: 124,
        item: "BATTLE_FRONTIER_ITEM_SHELL_BELL",
      },
      callbacks: ["AnimDevil", "AnimPinkHeart", "AnimPinkHeart_Step"],
      audio: {
        first: { soundEffect: "SE_M_PSYBEAM2", id: 200, pan: "SOUND_PAN_TARGET" },
        hearts: { soundEffect: "SE_M_ATTRACT", id: 226, pan: "SOUND_PAN_TARGET" },
      },
    });
  });

  it("verifies both complete legal dense Scene-ON receipts without promotion", () => {
    const result = verifyLovelyKissEvidence();
    expect(result).toEqual({
      "player-back": expect.objectContaining({
        sourceRows: 153,
        rawRgbRows: 153,
        lifecycle: { devilCreates: 1, pinkHeartCreates: 4 },
        latches: { oam: "152/152", matrices: "152/152", palette: "152/152" },
        gameplayRngTransitions: 0,
        animationRngTransitions: 152,
        framebufferCompared: false,
      }),
      "opponent-front": expect.objectContaining({
        sourceRows: 153,
        rawRgbRows: 153,
        lifecycle: { devilCreates: 1, pinkHeartCreates: 4 },
        latches: { oam: "152/152", matrices: "152/152", palette: "152/152" },
        gameplayRngTransitions: 0,
        animationRngTransitions: 152,
        framebufferCompared: false,
      }),
    });
    expect(fixture.status).toBe("partial");
    expect(fixture.coverageCredit).toBe(false);
    expect(fixture.evidenceScope).toMatchObject({
      productionAnimationChanged: true,
      reducerAdded: true,
      typedSeamAdded: true,
      compositorAdded: false,
      framebufferCompared: false,
      gameplayStateOwned: false,
      twiceFreshByteIdentical: true,
    });
  });

  it("requires complete legal parties and keeps source-neighbor controls independent", () => {
    for (const side of ["player-back", "opponent-front"] as const) {
      const scenario = JSON.parse(readFileSync(fixture.orientations[side].scenario, "utf8")) as Record<string, any>;
      expect(scenario).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50, challengeNum: 3 });
      expect(Object.keys(scenario.overrides)).toEqual(["parties"]);
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      for (const party of Object.values(scenario.overrides.parties) as any[][]) {
        for (const mon of party) {
          expect(mon).toMatchObject({ level: 50, ppUps: [0, 0, 0, 0], friendship: 70, shiny: false });
          expect(mon.moves).toHaveLength(4);
          expect(Object.keys(mon.ivs)).toHaveLength(6);
          expect(Object.keys(mon.evs)).toHaveLength(6);
          for (const transient of ["hp", "status", "statStages", "volatile", "weather", "outcome"]) expect(mon).not.toHaveProperty(transient);
        }
      }
    }
    expect(fixture.controls).toMatchObject({
      sweetKiss: "exact source-neighbor control only; no shared acceptance",
      attract: "exact source-neighbor control only; no shared acceptance",
    });
  });
});
