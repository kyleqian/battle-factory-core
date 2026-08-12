import { gunzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import fissureAsset from "../../src/animation/assets/fissure.json" with { type: "json" };
import {
  FISSURE_FRAME_COUNT,
  fissureAtAge,
  fissureDirtPainterOrder,
} from "../../src/animation/fissure.ts";
import {
  createSceneOnMovePresentation,
  sceneOnFissureView,
} from "../../src/animation/sceneOnPresentation.ts";

type EvidenceFrame = {
  tasks: Array<{ func: { symbol: string | null }; data: number[] }>;
  sprites: Array<{
    slot: number; x: number; y: number; x2: number; y2: number;
    template: { symbol: string | null };
  }>;
  battlers: { player: { species: number }; opponent: { species: number } };
  softwareOam: string[];
  registers: Record<string, number>;
};

const cases = [
  {
    side: "opponent" as const,
    artifact: "tools/compare/evidence/fissure-player-full-state.json.gz",
    animationCenter: { x: 176, y: 42 },
    battleCenter: { x: 176, y: 40 },
    initialTargetX2: 1,
  },
  {
    side: "player" as const,
    artifact: "tools/compare/evidence/fissure-opponent-full-state.json.gz",
    animationCenter: { x: 72, y: 88 },
    battleCenter: { x: 72, y: 80 },
    initialTargetX2: 0,
  },
] as const;

describe("MOVE_FISSURE source reducer", () => {
  it("normalizes the 512x256 BG_FISSURE screenblocks to row-major tiles", () => {
    const tilemap = fissureAsset.background.tilemap;
    expect([tilemap.width, tilemap.height]).toEqual([64, 32]);
    expect(tilemap.entries[1]).toMatchObject({ tile: 1, hFlip: false, vFlip: false });
    expect(tilemap.entries[7 + 7 * 64]).toMatchObject({ tile: 63, hFlip: false, vFlip: false });
    expect(tilemap.entries[8 * 64]).toMatchObject({ tile: 63, hFlip: true, vFlip: true });
    expect(tilemap.entries.filter((_, index) => index % 64 >= 32).every(({ tile }) => tile === 0))
      .toBe(true);
  });

  it.each(cases)("matches every retained $side source task, dirt sprite, and register row", (fixture) => {
    const probe = JSON.parse(gunzipSync(readFileSync(fixture.artifact)).toString()) as {
      frames: EvidenceFrame[];
    };
    expect(probe.frames).toHaveLength(FISSURE_FRAME_COUNT);
    for (let age = 0; age < probe.frames.length; age += 1) {
      const oracle = probe.frames[age]!;
      const reduced = fissureAtAge(
        age,
        fixture.side,
        fixture.animationCenter,
        fixture.battleCenter,
        fixture.initialTargetX2,
      );
      const platform = oracle.tasks.find((task) => task.func.symbol === "AnimTask_ShakePlatforms");
      const target = oracle.tasks.find((task) => task.func.symbol === "AnimTask_ShakeBattlers");
      if (age >= 4 && age <= 199) {
        expect(platform?.data.slice(0, 4)).toEqual([
          reduced.shake.taskState, reduced.shake.delay,
          reduced.shake.timer, 50,
        ]);
        expect(platform?.data.slice(14, 16)).toEqual([
          reduced.shake.horizontalOffset, 13,
        ]);
        expect(target?.data.slice(0, 4)).toEqual(platform?.data.slice(0, 4));
      } else {
        expect(platform).toBeUndefined();
        expect(target).toBeUndefined();
      }
      expect(oracle.sprites.filter(
        (sprite) => sprite.template.symbol === "gDirtPlumeSpriteTemplate",
      ).map(({ slot, x, y, x2, y2 }) => ({ slot, x, y, x2, y2 })))
        .toEqual(reduced.dirt.map(({ slot, x, y, x2, y2 }) => ({ slot, x, y, x2, y2 })));
      expect(oracle.registers.bldcnt).toBe(reduced.bldcnt);
      expect(oracle.registers.bldy).toBe(reduced.bldy);
      expect(oracle.registers.bg3hofs).toBe(reduced.bg3Scroll.x & 0x1ff);
      expect(oracle.registers.bg3vofs).toBe(reduced.bg3Scroll.y & 0xff);
    }
  });

  it("pins the three dirt groups, two palette pulses, audio cues, and cleanup", () => {
    const state = (age: number) => fissureAtAge(
      age, "opponent", { x: 176, y: 42 }, { x: 176, y: 40 }, 1,
    );
    expect(state(14).dirt).toHaveLength(4);
    expect(state(38).displayedDirt).toHaveLength(4);
    expect(state(39).displayedDirt).toEqual([]);
    expect(state(31).palette).toMatchObject({ color: "black", coefficient: 14 });
    expect(state(34).palette).toMatchObject({ color: "white", coefficient: 14 });
    expect(state(39).palette.active).toBe(false);
    expect(state(65).palette.color).toBe("black");
    expect(state(68).palette.color).toBe("white");
    expect(state(73).palette.active).toBe(false);
    expect([4, 14, 48, 82].flatMap((age) => state(age).soundEvents.map((event) => event.song)))
      .toEqual(["SE_M_EARTHQUAKE", "SE_M_DIG", "SE_M_DIG", "SE_M_DIG"]);
    expect(state(154).bg3Scroll).toEqual({ x: 368, y: 22 });
    expect(state(233).bg3Scroll).toEqual({ x: 368, y: 22 });
    expect(state(234).bg3Scroll).toEqual({ x: 0, y: 0 });
    expect(state(252).active).toBe(true);
    expect(state(253).active).toBe(false);
  });

  it("replays stable equal-subpriority OAM ordering as the dirt arcs cross", () => {
    const state = (age: number) => fissureAtAge(
      age, "opponent", { x: 176, y: 42 }, { x: 176, y: 40 }, 1,
    );
    const painterSlots = (age: number) =>
      fissureDirtPainterOrder(state(age).displayedDirt).map(({ slot }) => slot);
    expect(painterSlots(50)).toEqual([7, 5, 4, 3]);
    expect(painterSlots(51)).toEqual([7, 5, 3, 4]);
    expect(painterSlots(57)).toEqual([7, 5, 3, 4]);
    expect(painterSlots(60)).toEqual([7, 3, 4, 5]);
    expect(painterSlots(61)).toEqual([7, 4, 3, 5]);
  });

  it("exposes only presentation geometry and immutable field values through the typed seam", () => {
    const stage = createSceneOnMovePresentation({
      move: "FISSURE",
      attacker: {
        species: "DUGTRIO",
        geometry: {
          side: "player", spriteCorner: { x: 40, y: 59 },
          animationCenter: { x: 72, y: 91 },
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
      target: {
        species: "ONIX",
        geometry: {
          side: "opponent", spriteCorner: { x: 144, y: 10 },
          animationCenter: { x: 176, y: 42 },
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      initialTargetX2: 1,
      fieldProfile: {
        playerHp: 110, playerMaxHp: 110,
        opponentHp: 110, opponentMaxHp: 110,
        playerGender: "male", opponentGender: "male",
      },
    });
    for (let age = 0; age < FISSURE_FRAME_COUNT; age += 1) {
      const { attacker, target, ...view } = sceneOnFissureView({ ...stage, age });
      expect(view).toEqual(fissureAtAge(
        age, "opponent", target.geometry.animationCenter,
        target.geometry.battlePositionCenter, 1,
      ));
      expect(attacker.species).toBe("DUGTRIO");
    }
  });
});
