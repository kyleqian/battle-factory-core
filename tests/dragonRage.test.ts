import { describe, expect, it } from "vitest";
import playerProbe from "../src/data/gen/dragonrage-full-probe-player-attacker.json" with { type: "json" };
import opponentProbe from "../src/data/gen/dragonrage-full-probe-opponent-attacker.json" with { type: "json" };
import {
  DRAGON_RAGE_FIRE_PLUME_SPAWNS,
  DRAGON_RAGE_FIRE_SPIT_GEOMETRY,
  DRAGON_RAGE_ATTACKER_SHAKE,
  DRAGON_RAGE_TARGET_SHAKE,
  DRAGON_RAGE_SLIDE_TO_OFFSET,
  DRAGON_RAGE_SLIDE_TO_ORIGINAL_POS,
  DRAGON_RAGE_FRAMEBUFFER_SHAKE_AGE_LAG,
  DRAGON_RAGE_FRAMEBUFFER_SLIDE_AGE_LAG,
  DRAGON_RAGE_FRAMEBUFFER_FIRE_SPIT_AGE_LAG,
  DRAGON_RAGE_FRAMEBUFFER_FIRE_PLUME_AGE_LAG,
  dragonRageFireSpitStateAtAge,
  dragonRageFirePlumeStateAtAge,
  dragonRageSchedule,
  shakeMonOffsetAtRenderTick,
  slideMonToOffsetAtTick,
  slideMonToOriginalPosAtTick,
} from "../src/engine/dragonRage.ts";

interface SpriteRow {
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly animCmdIndex: number;
  readonly subpriority: number;
  readonly matrixA: number;
  readonly matrixB: number;
  readonly matrixC: number;
  readonly matrixD: number;
  readonly slot: number;
}

interface ProbeRow {
  readonly tick: number;
  readonly attacker: SpriteRow;
  readonly target: SpriteRow;
  readonly shakeMonTasks: ReadonlyArray<{ readonly data: readonly number[] }>;
  readonly fireSpitSprites: readonly SpriteRow[];
  readonly firePlumeSprites: readonly SpriteRow[];
  readonly slideSprites: ReadonlyArray<SpriteRow & { readonly kind: string }>;
}

function rowsOf(probe: { ticks: ProbeRow[] }): Map<number, ProbeRow> {
  return new Map(probe.ticks.map((row) => [row.tick, row]));
}

const PLAYER_ROWS = rowsOf(playerProbe as { ticks: ProbeRow[] });
const OPPONENT_ROWS = rowsOf(opponentProbe as { ticks: ProbeRow[] });

function row(rows: Map<number, ProbeRow>, tick: number): ProbeRow {
  const found = rows.get(tick);
  if (!found) throw new Error(`probe is missing tick ${tick}`);
  return found;
}

// Both fixtures' own T0 (the attacker AnimTask_ShakeMon's own first RAM-
// observable tick, `dump-dragonrage-full.py`): player-attacker fixture 89,
// opponent-attacker fixture 93. Every other tick in `dragonRageSchedule`
// below is DERIVED from this single anchor, not independently fit.
const PLAYER_T0 = 89;
const OPPONENT_T0 = 93;

describe("dragonRageSchedule reproduces every RAM-probed creation tick (both orientations)", () => {
  it("player-attacker fixture (CHARMELEON player, ONIX opponent)", () => {
    const schedule = dragonRageSchedule(PLAYER_T0);
    expect(schedule.attackerShakeTick).toBe(89);
    expect(schedule.slideToOffsetTick).toBe(168);
    expect(schedule.fireSpitTick).toBe(174);
    expect(schedule.targetShakeTick).toBe(186);
    expect(schedule.firePlumeTicks).toEqual([186, 189, 192, 195, 198, 201, 204, 207]);
    expect(schedule.slideToOriginalPosTick).toBe(235);
  });

  it("opponent-attacker fixture (CHARMELEON opponent, ONIX player)", () => {
    const schedule = dragonRageSchedule(OPPONENT_T0);
    expect(schedule.attackerShakeTick).toBe(93);
    expect(schedule.slideToOffsetTick).toBe(172);
    expect(schedule.fireSpitTick).toBe(178);
    expect(schedule.targetShakeTick).toBe(190);
    expect(schedule.firePlumeTicks).toEqual([190, 193, 196, 199, 202, 205, 208, 211]);
    expect(schedule.slideToOriginalPosTick).toBe(239);
  });
});

describe("attacker/target AnimTask_ShakeMon (reused primitive, first ATTACKER-side call site)", () => {
  it("attacker shake x2/y2 matches RAM at every probed tick, both fixtures", () => {
    for (const [rows, t0] of [[PLAYER_ROWS, PLAYER_T0], [OPPONENT_ROWS, OPPONENT_T0]] as const) {
      for (let tick = t0; tick <= t0 + 78; tick += 1) {
        const probed = row(rows, tick).attacker;
        const ported = shakeMonOffsetAtRenderTick(DRAGON_RAGE_ATTACKER_SHAKE, t0, tick);
        expect(ported, `tick ${tick}`).toEqual({ x2: probed.x2, y2: probed.y2 });
      }
    }
  });

  it("target shake y2 matches RAM at every probed tick, both fixtures", () => {
    for (const [rows, t0] of [[PLAYER_ROWS, PLAYER_T0], [OPPONENT_ROWS, OPPONENT_T0]] as const) {
      const schedule = dragonRageSchedule(t0);
      for (let tick = schedule.targetShakeTick; tick <= schedule.targetShakeTick + 47; tick += 1) {
        const probed = row(rows, tick).target;
        const ported = shakeMonOffsetAtRenderTick(DRAGON_RAGE_TARGET_SHAKE, schedule.targetShakeTick, tick);
        expect(ported, `tick ${tick}`).toEqual({ x2: probed.x2, y2: probed.y2 });
      }
    }
  });

  // Rung 1 (ANIMATION_PROGRESS.md 2026-07-25): pixel-diffed directly against
  // `dragon-rage-player-charmeleon-opponent-onix`'s render age 1 (frame 90),
  // one tick before the lag-2-adjusted attacker shake first clears its own
  // creation guard - the oracle photo already shows the sprite shifted by
  // the full `yOffset`, RAM-invisible (collapsed the same tick) but
  // framebuffer-visible one tick earlier than the steady-state lag predicts.
  it("one tick before creation shows the RAM-invisible creation-write transient", () => {
    expect(shakeMonOffsetAtRenderTick(DRAGON_RAGE_ATTACKER_SHAKE, 0, -1)).toEqual({ x2: 0, y2: 2 });
    expect(shakeMonOffsetAtRenderTick(DRAGON_RAGE_TARGET_SHAKE, 97, 96)).toEqual({ x2: 0, y2: 3 });
  });

  it("two or more ticks before creation stays zero (guard unaffected outside the one-tick transient)", () => {
    expect(shakeMonOffsetAtRenderTick(DRAGON_RAGE_ATTACKER_SHAKE, 0, -2)).toEqual({ x2: 0, y2: 0 });
    expect(shakeMonOffsetAtRenderTick(DRAGON_RAGE_ATTACKER_SHAKE, 0, -10)).toEqual({ x2: 0, y2: 0 });
  });
});

describe("SlideMonToOffset/SlideMonToOriginalPos (attacker, battlerFlag=0) at both orientations", () => {
  it("slide-to-offset attacker x2 matches RAM, player and opponent side", () => {
    for (const [rows, t0, battlerSide] of [
      [PLAYER_ROWS, PLAYER_T0, "player"],
      [OPPONENT_ROWS, OPPONENT_T0, "opponent"],
    ] as const) {
      const schedule = dragonRageSchedule(t0);
      for (let tick = schedule.slideToOffsetTick; tick <= schedule.slideToOffsetTick + 4; tick += 1) {
        const probed = row(rows, tick).attacker;
        const ported = slideMonToOffsetAtTick(
          { battlerSide, ...DRAGON_RAGE_SLIDE_TO_OFFSET },
          tick - schedule.slideToOffsetTick,
        );
        expect(ported, `tick ${tick}`).toEqual({ x2: probed.x2, y2: probed.y2 });
      }
    }
  });

  it("slide-to-original-pos attacker x2 matches RAM, player and opponent side", () => {
    // SlideMonToOffset leaves the attacker's x2 at its own mirrored target
    // offset (+15 player, -15 opponent) for the whole fire-spit/shake/plume
    // phase in between; SlideMonToOriginalPos's own `currentX2` is that held
    // value at ITS creation tick.
    for (const [rows, t0, currentX2] of [
      [PLAYER_ROWS, PLAYER_T0, 15],
      [OPPONENT_ROWS, OPPONENT_T0, -15],
    ] as const) {
      const schedule = dragonRageSchedule(t0);
      for (let tick = schedule.slideToOriginalPosTick; tick <= schedule.slideToOriginalPosTick + 3; tick += 1) {
        const probed = row(rows, tick).attacker;
        const ported = slideMonToOriginalPosAtTick(
          { currentX2, currentY2: 0, ...DRAGON_RAGE_SLIDE_TO_ORIGINAL_POS },
          tick - schedule.slideToOriginalPosTick,
        );
        expect(ported.x2, `tick ${tick}`).toBe(probed.x2);
      }
    }
  });
});

describe("fire-spit sprite (StartDragonFireTranslation, both sides' asymmetric-offset branches)", () => {
  it("player-side: position, frame, and static affine matrix match RAM at every probed age", () => {
    const schedule = dragonRageSchedule(PLAYER_T0);
    for (let age = 0; age <= 10; age += 1) {
      const tick = schedule.fireSpitTick + age;
      const probed = row(PLAYER_ROWS, tick).fireSpitSprites[0]!;
      const ported = dragonRageFireSpitStateAtAge(age, DRAGON_RAGE_FIRE_SPIT_GEOMETRY.player)!;
      expect({ x: ported.x, y: ported.y, x2: ported.x2, y2: ported.y2 }, `age ${age}`).toEqual({
        x: probed.x, y: probed.y, x2: probed.x2, y2: probed.y2,
      });
      expect(ported.sheetFrame, `age ${age} frame`).toBe(probed.animCmdIndex);
      expect(ported.matrix, `age ${age} matrix`).toEqual({
        pa: probed.matrixA, pb: probed.matrixB, pc: probed.matrixC, pd: probed.matrixD,
      });
    }
  });

  it("opponent-side: position, frame, and static affine matrix match RAM at every probed age", () => {
    const schedule = dragonRageSchedule(OPPONENT_T0);
    for (let age = 0; age <= 10; age += 1) {
      const tick = schedule.fireSpitTick + age;
      const probed = row(OPPONENT_ROWS, tick).fireSpitSprites[0]!;
      const ported = dragonRageFireSpitStateAtAge(age, DRAGON_RAGE_FIRE_SPIT_GEOMETRY.opponent)!;
      expect({ x: ported.x, y: ported.y, x2: ported.x2, y2: ported.y2 }, `age ${age}`).toEqual({
        x: probed.x, y: probed.y, x2: probed.x2, y2: probed.y2,
      });
      expect(ported.sheetFrame, `age ${age} frame`).toBe(probed.animCmdIndex);
      expect(ported.matrix, `age ${age} matrix`).toEqual({
        pa: probed.matrixA, pb: probed.matrixB, pc: probed.matrixC, pd: probed.matrixD,
      });
    }
  });

  it("is gone (null) outside its age 0..10 lifetime", () => {
    expect(dragonRageFireSpitStateAtAge(-1)).toBeNull();
    expect(dragonRageFireSpitStateAtAge(11)).toBeNull();
  });
});

describe("fire-plume sprites (AnimDragonRageFirePlume, all 8 spawns, both orientations)", () => {
  it("player-attacker: every spawn's position/subpriority/frame matches RAM across its full 26-tick life", () => {
    const schedule = dragonRageSchedule(PLAYER_T0);
    const targetBattlePosition = { x: 176, y: 40 };
    const targetSubpriority = 40;
    for (let i = 0; i < 8; i += 1) {
      const spawn = DRAGON_RAGE_FIRE_PLUME_SPAWNS[i]!;
      const creationTick = schedule.firePlumeTicks[i]!;
      // Identify this spawn's own RAM slot as whichever plume slot is new at
      // its creation tick (not present the tick before) - `x` alone isn't a
      // unique key since multiple spawns share the same x offset.
      const priorSlots = new Set(row(PLAYER_ROWS, creationTick - 1).firePlumeSprites.map((s) => s.slot));
      const slot = row(PLAYER_ROWS, creationTick).firePlumeSprites.find((s) => !priorSlots.has(s.slot))!.slot;
      for (let age = 0; age < 26; age += 1) {
        const tick = creationTick + age;
        const probed = row(PLAYER_ROWS, tick).firePlumeSprites.find((s) => s.slot === slot);
        const ported = dragonRageFirePlumeStateAtAge(spawn, "player", targetBattlePosition, targetSubpriority, age)!;
        expect(probed, `spawn ${i} age ${age} (tick ${tick}) should be present`).toBeDefined();
        expect({ x: ported.x, y: ported.y }, `spawn ${i} age ${age}`).toEqual({ x: probed!.x, y: probed!.y });
        expect(ported.subpriority, `spawn ${i} age ${age} subpriority`).toBe(probed!.subpriority);
        expect(ported.sheetFrame, `spawn ${i} age ${age} frame`).toBe(probed!.animCmdIndex);
      }
      expect(dragonRageFirePlumeStateAtAge(spawn, "player", targetBattlePosition, targetSubpriority, 26)).toBeNull();
    }
  });

  it("opponent-attacker: every spawn's position/subpriority/frame matches RAM across its full 26-tick life", () => {
    const schedule = dragonRageSchedule(OPPONENT_T0);
    const targetBattlePosition = { x: 72, y: 80 };
    const targetSubpriority = 30;
    for (let i = 0; i < 8; i += 1) {
      const spawn = DRAGON_RAGE_FIRE_PLUME_SPAWNS[i]!;
      const creationTick = schedule.firePlumeTicks[i]!;
      const priorSlots = new Set(row(OPPONENT_ROWS, creationTick - 1).firePlumeSprites.map((s) => s.slot));
      const slot = row(OPPONENT_ROWS, creationTick).firePlumeSprites.find((s) => !priorSlots.has(s.slot))!.slot;
      for (let age = 0; age < 26; age += 1) {
        const tick = creationTick + age;
        const probed = row(OPPONENT_ROWS, tick).firePlumeSprites.find((s) => s.slot === slot);
        const ported = dragonRageFirePlumeStateAtAge(spawn, "opponent", targetBattlePosition, targetSubpriority, age)!;
        expect(probed, `spawn ${i} age ${age} (tick ${tick}) should be present`).toBeDefined();
        expect({ x: ported.x, y: ported.y }, `spawn ${i} age ${age}`).toEqual({ x: probed!.x, y: probed!.y });
        expect(ported.subpriority, `spawn ${i} age ${age} subpriority`).toBe(probed!.subpriority);
        expect(ported.sheetFrame, `spawn ${i} age ${age} frame`).toBe(probed!.animCmdIndex);
      }
    }
  });
});

describe("rung 5 framebuffer capture-lag constants (dense-sweep-confirmed, see dragonRage.ts's own doc comments)", () => {
  it("pins the per-mechanism lag values", () => {
    expect(DRAGON_RAGE_FRAMEBUFFER_SHAKE_AGE_LAG).toBe(2);
    expect(DRAGON_RAGE_FRAMEBUFFER_SLIDE_AGE_LAG).toBe(1);
    expect(DRAGON_RAGE_FRAMEBUFFER_FIRE_SPIT_AGE_LAG).toBe(1);
    expect(DRAGON_RAGE_FRAMEBUFFER_FIRE_PLUME_AGE_LAG).toBe(1);
  });
});
