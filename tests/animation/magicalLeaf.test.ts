import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import {
  MAGICAL_LEAF_BLEND_COLORS,
  MAGICAL_LEAF_CLEANUP_AGE,
  MAGICAL_LEAF_CONTACT_AGE,
  MAGICAL_LEAF_CUTTER_AGE,
  MAGICAL_LEAF_DISPLAY_LAG,
  MAGICAL_LEAF_FIRST_INACTIVE_AGE,
  MAGICAL_LEAF_FIRST_PARTICLE_AGE,
  MAGICAL_LEAF_FRAME_COUNT,
  MAGICAL_LEAF_OPPONENT_START_FRAME,
  MAGICAL_LEAF_ORIENTATION_FRAME_SHIFT,
  MAGICAL_LEAF_PALETTE_SCOPE,
  MAGICAL_LEAF_PLAYER_START_FRAME,
  MAGICAL_LEAF_SETARG_AGE,
  magicalLeafAtAge,
} from "../../src/animation/magicalLeaf.ts";
import { razorLeafParticleFromLocalAge } from "../../src/animation/razorLeaf.ts";
import {
  createSceneOnMovePresentation,
  sceneOnMagicalLeafView,
} from "../../src/animation/sceneOnPresentation.ts";

const PLAYER_BACK = {
  attackerSide: "player",
  attackerCenter: { x: 72, y: 96 },
  targetCenter: { x: 176, y: 42 },
  targetIdleX2: 1,
} as const;
const OPPONENT_FRONT = {
  attackerSide: "opponent",
  attackerCenter: { x: 176, y: 48 },
  targetCenter: { x: 72, y: 88 },
  targetIdleX2: 0,
} as const;

const source = readFileSync(
  "reference/pokeemerald/data/battle_anim_scripts.s",
  "utf8",
);
const effects = readFileSync(
  "reference/pokeemerald/src/battle_anim_effects_1.c",
  "utf8",
);

describe("MOVE_MAGICAL_LEAF source audit and legal Scene-ON stage", () => {
  it("proves set 171 Roselia is the lowest eligible Level-50 carrier", () => {
    const carriers = frontierMons.entries.filter(({ moves, index }) =>
      index >= 110 && index <= 849 && moves.includes("MOVE_MAGICAL_LEAF"),
    );
    expect(carriers.map(({ index }) => index)).toEqual([171, 183, 243, 380, 437, 581, 629, 815]);
    expect(carriers[0]).toMatchObject({
      index: 171,
      label: "FRONTIER_MON_ROSELIA_1",
      species: "SPECIES_ROSELIA",
      moves: ["MOVE_MAGICAL_LEAF", "MOVE_TOXIC", "MOVE_GRASS_WHISTLE", "MOVE_COTTON_SPORE"],
      itemName: "BATTLE_FRONTIER_ITEM_PECHA_BERRY",
      evSpreadStats: ["F_EV_SPREAD_DEFENSE", "F_EV_SPREAD_HP"],
      nature: "NATURE_DOCILE",
    });
  });

  it("pins the complete literal body and the palette task's seven-color loop", () => {
    const start = source.indexOf("Move_MAGICAL_LEAF:");
    const body = source.slice(start, source.indexOf("Move_ICE_BALL:", start));
    expect(body.match(/create_razor_leaf_particle_sprite/g)).toHaveLength(10);
    expect(body.match(/create_razor_leaf_cutter_sprite/g)).toHaveLength(2);
    expect(body.match(/create_basic_hitsplat_sprite/g)).toHaveLength(2);
    expect(body).toContain("createvisualtask AnimTask_CycleMagicalLeafPal, 5");
    expect(body).toContain("createvisualtask AnimTask_ShakeMon2, 2, ANIM_TARGET, 2, 0, 8, 1");
    expect(body).toContain("setarg 7, 0xFFFF");
    expect(body).toMatch(/monbg ANIM_DEF_PARTNER[\s\S]*setalpha 12, 8[\s\S]*clearmonbg ANIM_DEF_PARTNER[\s\S]*blendoff/);
    const taskStart = effects.indexOf("void AnimTask_CycleMagicalLeafPal");
    const task = effects.slice(taskStart, effects.indexOf("static void AnimNeedleArmSpike", taskStart));
    expect(task).toMatch(/ANIM_TAG_LEAF[\s\S]*ANIM_TAG_RAZOR_LEAF/);
    expect(task).toMatch(/BlendPalette\(task->data\[8\], 16, task->data\[10\]/);
    expect(task).toMatch(/\+\+task->data\[10\] == 17[\s\S]*\+\+task->data\[11\] == 7/);
    expect(task).toContain("gBattleAnimArgs[7] == -1");
  });

  it("uses two complete, item-unique legal parties with every carrier slot constrained", () => {
    for (const name of [
      "mechanic-magical-leaf-player-roselia-opponent-onix.json",
      "mechanic-magical-leaf-opponent-roselia-player-onix.json",
    ]) {
      const scenario = JSON.parse(readFileSync(`tools/battle-lab/${name}`, "utf8"));
      expect(scenario).toMatchObject({
        mode: "mechanicLab", profile: "battle-scene-on", level: 50,
        challengeNum: 0, battleNum: 0,
      });
      expect([...scenario.playerSetIds, ...scenario.opponentSetIds]).toContain(171);
      expect([...scenario.playerSetIds, ...scenario.opponentSetIds]).toContain(156);
      for (const party of [scenario.overrides.parties.player, scenario.overrides.parties.opponent]) {
        expect(party).toHaveLength(3);
        expect(new Set(party.map(({ species }: { species: number }) => species)).size).toBe(3);
        const items = party.map(({ item }: { item: number }) => item).filter(Boolean);
        expect(new Set(items).size).toBe(items.length);
        for (const mon of party) {
          expect(mon).toMatchObject({
            level: 50,
            ivs: { hp: expect.any(Number), attack: expect.any(Number), defense: expect.any(Number), speed: expect.any(Number), spAttack: expect.any(Number), spDefense: expect.any(Number) },
            evs: { hp: expect.any(Number), attack: expect.any(Number), defense: expect.any(Number), speed: expect.any(Number), spAttack: expect.any(Number), spDefense: expect.any(Number) },
            moves: expect.any(Array), ppUps: [0, 0, 0, 0],
            abilitySlot: expect.any(Number), friendship: expect.any(Number),
            gender: expect.any(String), shiny: false,
          });
          expect(mon.moves).toHaveLength(4);
        }
      }
      const carrier = [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent]
        .find(({ species }: { species: number }) => species === 363);
      expect(carrier).toMatchObject({
        species: 363, nature: 6, item: 135,
        evs: { hp: 255, defense: 255 },
        moves: [345, 345, 345, 345],
      });
    }
  });
});

describe("MOVE_MAGICAL_LEAF source-relative reducer", () => {
  it("pins both complete 182-frame windows and the independently measured shift", () => {
    expect(MAGICAL_LEAF_PLAYER_START_FRAME).toBe(77);
    expect(MAGICAL_LEAF_OPPONENT_START_FRAME).toBe(81);
    expect(MAGICAL_LEAF_ORIENTATION_FRAME_SHIFT).toBe(4);
    expect(MAGICAL_LEAF_FRAME_COUNT).toBe(182);
    expect(magicalLeafAtAge(0, PLAYER_BACK).active).toBe(true);
    expect(magicalLeafAtAge(180, PLAYER_BACK).active).toBe(true);
    expect(magicalLeafAtAge(MAGICAL_LEAF_FIRST_INACTIVE_AGE, PLAYER_BACK)).toMatchObject({
      active: false,
      assetsLoaded: { leaf: false, razorLeaf: false, impact: false },
      targetMonbg: false,
      alpha: null,
      arg7: -1,
    });
  });

  it("pins asset loads, monbg/alpha/register ownership, setarg, and cleanup", () => {
    expect(magicalLeafAtAge(0, PLAYER_BACK).assetsLoaded).toEqual({ leaf: false, razorLeaf: false, impact: false });
    expect(magicalLeafAtAge(1, PLAYER_BACK).assetsLoaded).toEqual({ leaf: true, razorLeaf: false, impact: false });
    expect(magicalLeafAtAge(4, PLAYER_BACK).assetsLoaded).toEqual({ leaf: true, razorLeaf: true, impact: false });
    expect(magicalLeafAtAge(7, PLAYER_BACK).assetsLoaded).toEqual({ leaf: true, razorLeaf: true, impact: true });
    expect(magicalLeafAtAge(10, PLAYER_BACK)).toMatchObject({ targetMonbg: true, alpha: null });
    expect(magicalLeafAtAge(13, PLAYER_BACK).alpha).toEqual({ eva: 12, evb: 8 });
    expect(magicalLeafAtAge(MAGICAL_LEAF_SETARG_AGE, PLAYER_BACK)).toMatchObject({ arg7: -1, paletteCycle: null });
    expect(magicalLeafAtAge(MAGICAL_LEAF_CLEANUP_AGE, PLAYER_BACK)).toMatchObject({ targetMonbg: false, alpha: null });
  });

  it("reuses the exact Razor Leaf particle callback for all ten literal spawns", () => {
    const starts = Array.from({ length: 10 }, (_, index) => MAGICAL_LEAF_FIRST_PARTICLE_AGE + index * 4);
    const slots = [3, 4, 5, 7, 9, 10, 11, 12, 13, 14];
    for (const [index, age] of starts.entries()) {
      const player = magicalLeafAtAge(age, PLAYER_BACK).particles.find(({ spawnIndex }) => spawnIndex === index)!;
      const opponent = magicalLeafAtAge(age, OPPONENT_FRONT).particles.find(({ spawnIndex }) => spawnIndex === index)!;
      expect(player).toMatchObject({ oamSlot: slots[index], subpriority: 28, age: 0 });
      expect(opponent).toMatchObject({ oamSlot: slots[index], subpriority: 38, age: 0 });
      const { oamSlot: _slot, subpriority: _priority, ...sharedParticle } = player;
      expect(sharedParticle).toEqual(
        razorLeafParticleFromLocalAge(0, index, "player", PLAYER_BACK.attackerCenter),
      );
    }
    expect(magicalLeafAtAge(52, PLAYER_BACK).particles).toHaveLength(10);
    expect(magicalLeafAtAge(107, PLAYER_BACK).particles).toHaveLength(9);
    expect(magicalLeafAtAge(141, PLAYER_BACK).particles).toHaveLength(0);
  });

  it("ports both independent duration-32 cutters and their real slot/subpriority order", () => {
    expect(magicalLeafAtAge(MAGICAL_LEAF_CUTTER_AGE, PLAYER_BACK).cutters).toEqual([
      expect.objectContaining({ index: 0, oamSlot: 3, subpriority: 37, x: 92, y: 86, x2: 3, y2: 0 }),
      expect.objectContaining({ index: 1, oamSlot: 5, subpriority: 37, x: 92, y: 86, x2: 3, y2: -3 }),
    ]);
    expect(magicalLeafAtAge(MAGICAL_LEAF_CUTTER_AGE, OPPONENT_FRONT).cutters).toEqual([
      expect.objectContaining({ index: 0, oamSlot: 3, subpriority: 27, x: 156, y: 38, x2: -3, y2: 2 }),
      expect.objectContaining({ index: 1, oamSlot: 5, subpriority: 27, x: 156, y: 38, x2: -3, y2: -1 }),
    ]);
    expect(magicalLeafAtAge(164, PLAYER_BACK).cutters).toEqual([]);
    expect(magicalLeafAtAge(164, OPPONENT_FRONT).cutters).toHaveLength(2);
    expect(magicalLeafAtAge(167, OPPONENT_FRONT).cutters).toEqual([]);
  });

  it("pins both mirrored hitsplats, per-move ShakeMon2, and target idle takeover", () => {
    expect(magicalLeafAtAge(MAGICAL_LEAF_CONTACT_AGE, PLAYER_BACK)).toMatchObject({
      targetX2: -2,
      shakeTask: { slot: 0, tick: 1 },
      hitsplats: [
        { index: 0, oamSlot: 4, x: 166, y: 38, animation: 2, subpriority: 36 },
        { index: 1, oamSlot: 7, x: 186, y: 46, animation: 2, subpriority: 36 },
      ],
    });
    expect(magicalLeafAtAge(MAGICAL_LEAF_CONTACT_AGE, OPPONENT_FRONT).hitsplats).toEqual([
      expect.objectContaining({ index: 0, oamSlot: 4, x: 82, y: 84, subpriority: 26 }),
      expect.objectContaining({ index: 1, oamSlot: 7, x: 62, y: 92, subpriority: 26 }),
    ]);
    expect([145, 146, 147, 148, 149, 158, 159, 160].map((age) => magicalLeafAtAge(age, PLAYER_BACK).targetX2))
      .toEqual([1, -2, -2, 2, 2, -2, -2, 0]);
    expect(magicalLeafAtAge(156, PLAYER_BACK).hitsplats).toEqual([]);
  });

  it("pins every palette-cycle step, both 16-color scopes, and all three sounds", () => {
    expect(MAGICAL_LEAF_PALETTE_SCOPE).toEqual({
      leaf: { start: 368, length: 16 },
      razorLeaf: { start: 384, length: 16 },
    });
    expect(MAGICAL_LEAF_BLEND_COLORS).toEqual([0x1f, 0x27f, 0x3ff, 0x3e0, 0x7dc5, 0x7d56, 0x7eb6]);
    for (let age = 16; age <= 167; age += 1) {
      expect(magicalLeafAtAge(age, PLAYER_BACK).paletteCycle).toMatchObject({
        taskSlot: 2,
        age: age - 16,
        coefficient: (age - 16) % 17,
        colorIndex: Math.floor((age - 16) / 17) % 7,
        scopes: MAGICAL_LEAF_PALETTE_SCOPE,
      });
    }
    expect([16, 26, 37, 48, 59].map((age) => magicalLeafAtAge(age, PLAYER_BACK).soundRestart))
      .toEqual(Array(5).fill("SE_M_POISON_POWDER"));
    expect(magicalLeafAtAge(114, PLAYER_BACK)).toMatchObject({ soundRestart: "SE_M_RAZOR_WIND2", soundPan: -64 });
    expect(magicalLeafAtAge(146, PLAYER_BACK)).toMatchObject({ soundRestart: "SE_M_RAZOR_WIND", soundPan: 63 });
    expect(magicalLeafAtAge(146, OPPONENT_FRONT)).toMatchObject({ soundRestart: "SE_M_RAZOR_WIND", soundPan: -63 });
  });

  it("pins each measured display latch against both raw-RGB change maps", () => {
    expect(MAGICAL_LEAF_DISPLAY_LAG).toEqual({
      particleSprite: 1, cutterSprite: 1, hitsplatSprite: 1,
      cycleMagicalLeafPalette: 1, shakeMon2: 1,
      monbg: "ram-only", setalpha: "ram-only", setarg: "ram-only",
      clearmonbgAndBlendoff: "ram-only",
    });
    const player = readFileSync("tools/compare/evidence/magical-leaf-changemap-player.txt", "utf8");
    const opponent = readFileSync("tools/compare/evidence/magical-leaf-changemap-opponent.txt", "utf8");
    expect(player).toMatch(/^94\s+41\s+70,86-74,97$/m); // particle RAM age 16 -> display age 17
    expect(opponent).toMatch(/^98\s+41\s+174,38-178,49$/m);
    expect(player).toMatch(/^192\s+567\s+/m); // cutter RAM age 114 -> display age 115
    expect(opponent).toMatch(/^196\s+729\s+/m);
    expect(player).toMatch(/^224\s+2117\s+/m); // hitsplats + ShakeMon2 RAM age 146 -> display age 147
    expect(opponent).toMatch(/^228\s+1555\s+/m);
  });

  it("exposes the staged body through the typed no-draw Scene-ON seam", () => {
    const state = createSceneOnMovePresentation({
      move: "MAGICAL_LEAF",
      attacker: { species: "ROSELIA", geometry: { side: "player", spriteCorner: { x: 40, y: 56 }, animationCenter: PLAYER_BACK.attackerCenter, battlePositionCenter: { x: 72, y: 80 } } },
      target: { species: "ONIX", geometry: { side: "opponent", spriteCorner: { x: 144, y: 10 }, animationCenter: PLAYER_BACK.targetCenter, battlePositionCenter: { x: 176, y: 40 } } },
      fieldProfile: { playerHp: 115, playerMaxHp: 115, opponentHp: 137, opponentMaxHp: 137 },
      targetIdleX2: 1,
    });
    expect(sceneOnMagicalLeafView({ ...state, age: 146 })).toMatchObject({
      age: 146,
      attacker: { species: "ROSELIA" },
      target: { species: "ONIX" },
      targetX2: -2,
      hitsplats: [{ oamSlot: 4 }, { oamSlot: 7 }],
    });
  });
});

describe("MOVE_MAGICAL_LEAF bilateral staging receipts", () => {
  it("pins twice-fresh pointer-isolated component and raw-RGB evidence without promotion", () => {
    const player = JSON.parse(readFileSync("tools/compare/fixtures/magical-leaf-player-roselia-opponent-onix.json", "utf8"));
    const opponent = JSON.parse(readFileSync("tools/compare/fixtures/magical-leaf-opponent-roselia-player-onix.json", "utf8"));
    expect(player).toMatchObject({
      schema: "magical-leaf-staging-receipt/v1", profile: "battle-scene-on",
      orientation: "player-back", sourceWindow: { startFrame: 77, endFrame: 258, frameCount: 182 },
      repeatRuns: 2,
      probeSha256: "30962d27b71235aa17dbb2820be83ff53be534c85fa771e79c9f079cffa63e52",
      rawRgbSequenceSha256: "f45745676e1c6383a01619d009f6e7f2e3e553417e39a2267fc81c85b6380f52",
    });
    expect(opponent).toMatchObject({
      schema: "magical-leaf-staging-receipt/v1", profile: "battle-scene-on",
      orientation: "opponent-front", sourceWindow: { startFrame: 81, endFrame: 262, frameCount: 182 },
      repeatRuns: 2,
      probeSha256: "2ff34accc68e8650c44540a14a3dbcaadf528076bf73c0a0f11ec6218d7e2bf2",
      rawRgbSequenceSha256: "1e7008151f3308e6e397640ef3e16789a0862f3ca1c5b729b1e847e74beff81f",
    });
    expect(player.checkpoints.map(({ age }: { age: number }) => age)).toEqual([0, 16, 17, 114, 146, 160, 168, 169, 181]);
    expect(opponent.checkpoints.map(({ age }: { age: number }) => age)).toEqual([0, 16, 17, 114, 146, 160, 168, 169, 181]);
  });
});
