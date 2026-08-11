import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  COTTON_SPORE_FIRST_INACTIVE_AGE,
  COTTON_SPORE_FRAME_COUNT,
  cottonSporeAtAge,
} from "../../src/animation/cottonSpore.ts";
import {
  createSceneOnMovePresentation,
  sceneOnCottonSporeView,
  type SceneOnCottonSporeConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import {
  createInitialState,
  render,
  type EngineState,
} from "../../src/engine/core.ts";

const fixtures = [
  {
    path: "tools/compare/fixtures/cotton-spore-player-mareep-opponent-onix.json",
    orientation: "player-back",
    evidence: "f3505c583dbfd81459fa5a6ae013a0e84d8583f0cf3e0d0ec8cb1817c120e0c3",
    raw: "b46bd803dd59cf953c0fa0d4a979d15ab6c9060a6cc7b14571dbcb69cea38007",
    hashes: {
      0: "e564ceed50cfd1c924abdda55bfe05c95c0eaf3266ad54d7b54ae415e8c7a449",
      8: "53c922f7a41f5628822ce2adf346bff3744117b95afae7aa5b7ffe8073a5a544",
      119: "4b94325609748a31df0ee547a66eedfcad594858c1a9241f76caa8c1c3d7a2af",
      198: "80ff95b35be9e6adc54a86b7606f325da05923ba01de74d881fe9ab4d5e3a030",
      203: "e564ceed50cfd1c924abdda55bfe05c95c0eaf3266ad54d7b54ae415e8c7a449",
    },
  },
  {
    path: "tools/compare/fixtures/cotton-spore-opponent-mareep-player-onix.json",
    orientation: "opponent-front",
    evidence: "a719bb8dff37cdf3f82a3909b6129e694b1982fa0800152dbbd7c3ae105e5983",
    raw: "629fb753f6e9522a6144b90c630b4d6306e3fcdd1b2558fe9af8a55617ab569c",
    hashes: {
      0: "668d9ef6a6e077d165a6b099e4459ef520352de8eef6b03660c0f7f1adb2de51",
      8: "303bad12d558a491de4de1cc09fe4200be70e32a353a12cd58900e9c96798daa",
      119: "39d4f80fd345b1f5e97e41da7d1d0d1d21b43f17dfbfd579cf9281b485a6aa6e",
      198: "76912336daa20ffa6480313c575b89f933b1f0cd42ff45b4d31b94bfcb0dd6b5",
      203: "668d9ef6a6e077d165a6b099e4459ef520352de8eef6b03660c0f7f1adb2de51",
    },
  },
] as const;

function rgbDigest(rgba: Uint8Array): string {
  const rgb = new Uint8Array(240 * 160 * 3);
  for (let pixel = 0; pixel < 240 * 160; pixel++) {
    rgb[pixel * 3] = rgba[pixel * 4]!;
    rgb[pixel * 3 + 1] = rgba[pixel * 4 + 1]!;
    rgb[pixel * 3 + 2] = rgba[pixel * 4 + 2]!;
  }
  return createHash("sha256").update(rgb).digest("hex");
}

describe("MOVE_COTTON_SPORE exact source-relative presentation", () => {
  it("pins the distinct unblended body, loop audio, split priority, and cleanup", () => {
    expect(COTTON_SPORE_FRAME_COUNT).toBe(204);
    expect(COTTON_SPORE_FIRST_INACTIVE_AGE).toBe(203);
    expect(cottonSporeAtAge(0, "opponent", { x: 176, y: 42 }))
      .toMatchObject({
        active: true,
        sporeLoaded: false,
        targetMonBg: false,
        splitBgPriority: false,
        alpha: null,
        doubleBattlePriorityTask: false,
        scriptOffset: 0,
      });
    expect(cottonSporeAtAge(7, "opponent", { x: 176, y: 42 }))
      .toMatchObject({
        splitBgPriority: true,
        targetMonBg: true,
        sound: "SE_M_POISON_POWDER",
        soundLoopActive: true,
        scriptOffset: 51,
      });
    expect(cottonSporeAtAge(7, "opponent", { x: 176, y: 42 }).particles[0])
      .toMatchObject({
        x: 176,
        y: 22,
        x2: 27,
        y2: 1,
        data0: 78,
        data1: 89,
        data2: 48,
        priority: 2,
        blend: false,
        callback: "AnimSporeParticle_Step",
      });
    expect(cottonSporeAtAge(177, "player", { x: 72, y: 88 }))
      .toMatchObject({
        sound: "SE_M_POISON_POWDER",
        soundPanSide: "player",
        soundLoopActive: false,
      });
    expect(cottonSporeAtAge(203, "player", { x: 72, y: 88 }))
      .toMatchObject({
        active: false,
        sporeLoaded: false,
        targetMonBg: false,
        particles: [],
        scriptOffset: 31,
      });
  });

  it("reuses all nine AnimSporeParticle lifecycles without inheriting Spore alpha", () => {
    expect(cottonSporeAtAge(21, "opponent", { x: 176, y: 42 }).particles)
      .toHaveLength(2);
    expect(cottonSporeAtAge(77, "player", { x: 72, y: 88 }).particles)
      .toHaveLength(6);
    expect(cottonSporeAtAge(119, "player", { x: 72, y: 88 }).particles)
      .toHaveLength(6);
    expect(cottonSporeAtAge(197, "player", { x: 72, y: 88 }).particles)
      .toHaveLength(1);
    expect(cottonSporeAtAge(198, "player", { x: 72, y: 88 }).particles)
      .toEqual([]);
    for (let age = 0; age < COTTON_SPORE_FRAME_COUNT; age++) {
      expect(cottonSporeAtAge(age, "opponent", { x: 176, y: 42 }).alpha)
        .toBeNull();
    }
  });

  it("pins the lowest legal carrier and both source bodies", () => {
    const output = execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/sporeSourceAudit.ts",
    ], { encoding: "utf8" });
    expect(output).toContain(
      "set 49/FRONTIER_MON_MAREEP -> SPECIES_MAREEP 179",
    );
    expect(output).toContain("nine unblended particles");
    expect(output).toContain("no alpha/SporeDoubleBattle");
  });

  it("keeps the typed seam presentation-only", () => {
    const fixture = JSON.parse(readFileSync(fixtures[0].path, "utf8"));
    const config: SceneOnCottonSporeConfig = {
      move: "COTTON_SPORE",
      attacker: fixture.attacker,
      target: fixture.target,
      fieldProfile: fixture.fieldProfile,
    };
    const view = sceneOnCottonSporeView({
      ...createSceneOnMovePresentation(config),
      age: 119,
    });
    expect(view).toMatchObject({
      age: 119,
      attacker: { species: "MAREEP" },
      target: { species: "ONIX" },
      splitBgPriority: true,
    });
    expect("speedStage" in view).toBe(false);
    expect("accuracy" in view).toBe(false);
  });

  it("pins compositor ordering and cleanup in both orientations", () => {
    for (const contract of fixtures) {
      const fixture = JSON.parse(readFileSync(contract.path, "utf8"));
      const stage = createSceneOnMovePresentation({
        move: "COTTON_SPORE",
        attacker: fixture.attacker,
        target: fixture.target,
        fieldProfile: fixture.fieldProfile,
      } satisfies SceneOnCottonSporeConfig);
      for (const [ageText, expected] of Object.entries(contract.hashes)) {
        const age = Number(ageText);
        const engine: EngineState = {
          ...createInitialState(),
          rngMode: "frontierBattle",
          sceneOnPresentation: { ...stage, age },
        };
        expect(rgbDigest(render(engine)), `${contract.orientation} age ${age}`)
          .toBe(expected);
      }
    }
  });

  it("pins complete legal parties and immutable evidence contracts", () => {
    for (const contract of fixtures) {
      const fixture = JSON.parse(readFileSync(contract.path, "utf8"));
      const scenario = JSON.parse(readFileSync(fixture.scenario, "utf8"));
      expect(fixture).toMatchObject({
        schema: "cotton-spore-portable-evidence/v1",
        oracleProfile: "battle-scene-on",
        orientation: contract.orientation,
        sourceWindow: { frameCount: 204 },
        evidenceSha256: contract.evidence,
        rawRgbSha256: contract.raw,
        battleState: { attackerItem: 133, targetStatus1: 0 },
      });
      expect(scenario.profile).toBe("battle-scene-on");
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      for (const party of Object.values(scenario.overrides.parties) as any[][]) {
        for (const mon of party) {
          expect(mon.moves).toHaveLength(4);
          expect(mon.ppUps).toHaveLength(4);
          expect(Object.keys(mon.ivs)).toHaveLength(6);
          expect(Object.keys(mon.evs)).toHaveLength(6);
          expect(mon).toMatchObject({
            level: 50,
            nature: expect.any(Number),
            item: expect.any(Number),
            abilitySlot: expect.any(Number),
            friendship: expect.any(Number),
            shiny: false,
          });
        }
      }
    }
  });
});
