/**
 * lsd199 (docs/lsd198-leech-seed-drain-animation.md, lsd199 section): the Leech Seed drain runs Move_ABSORB from Task_ClearBitWhenBattleTableAnimDone (a RunTasks
 * task), so AnimTask_ShakeMon's creation state (x2 0, y2 +5) reaches Task_UpdateMonBg one pass before the controller-hosted ordinary Absorb would show it. Pins:
 * absorbAtAge's `taskHostedScript` rule, the drain request flag, the RAM probe receipt (lsd199ShakeProbe.py) and the dense receipt (0 residual, both orientations).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { absorbAtAge } from "../src/animation/absorb.ts";
import { createBattleResolutionPresentationRenderView } from "../src/engine/battleResolutionPresentationRender.ts";
import { lsd198Route } from "../tools/integration/lsd198Route.ts";

const T = { x: 176, y: 40 }, A = { x: 72, y: 80 };
const fixture = (path: string) => JSON.parse(readFileSync(new URL(`../tools/integration/fixtures/lsd199/${path}`, import.meta.url), "utf8"));

describe("lsd199: absorbAtAge taskHostedScript", () => {
  it("adds only the ShakeMon creation pass at source age 19 (y2 +5, x2 0, pose owned); every other age equals the controller-hosted body", () => {
    for (let age = -2; age <= 196; age++) {
      const plain = absorbAtAge(age, T, A, "player");
      const task = absorbAtAge(age, T, A, "player", A, true);
      if (age === 19) {
        expect([plain.targetX2, plain.targetY2, plain.targetPoseOwned]).toEqual([0, 0, false]);
        expect([task.targetX2, task.targetY2, task.targetPoseOwned]).toEqual([0, 5, true]);
        expect({ ...task, targetY2: 0, targetPoseOwned: false }).toEqual(plain);
      } else {
        expect(task).toEqual(plain);
      }
    }
  });
  it("controller-hosted: ShakeMon owns the pose from source age 20 (the renderer's former age < 21 display rule); y2 +5 at 22-23 and 26-27", () => {
    const owned = [], shaken = [];
    for (let age = 0; age <= 193; age++) {
      const s = absorbAtAge(age, T, A, "opponent");
      if (s.targetPoseOwned) owned.push(age);
      if (s.targetY2 !== 0) shaken.push(age);
    }
    expect(owned[0]).toBe(20);
    expect(owned.length).toBe(174);
    expect(shaken).toEqual([22, 23, 26, 27]);
  });
});

describe("lsd199: only the drain's request is task-hosted", () => {
  for (const [seederSide, seed] of [["player", 57], ["opponent", 4]] as const) {
    it(`${seederSide} seeds: the drain effect's request carries taskHostedScript: true`, () => {
      const route = lsd198Route({ seederSide, seed });
      const k = route.commands.findIndex((x) => x.type === "general-animation" && x.animation === "LEECH_SEED_DRAIN");
      const e = createBattleResolutionPresentationRenderView(route.at(k, 41) as never).effect as any;
      expect(e.request).toMatchObject({ moveId: 71, taskHostedScript: true });
      expect(e.age).toBe(20);
    });
  }
});

describe("lsd199: RAM probe receipt (direct mGBA, lsd199ShakeProbe.py; the target is the seeded / Absorb-target battler)", () => {
  const SHAKE = 0x080d5221, UPDATE_MON_BG = 0x080a47d9, TABLE_TASK = 0x0805da49;
  // Move_ABSORB's ShakeMon is the priority-5 one (createvisualtask AnimTask_ShakeMon, 5, ...); an earlier priority-2 ShakeMon belongs to another script.
  const shakeRows = (rows: any[]) => rows.filter((r) => r.tasks.some((t: any) => Number(t[0]) === SHAKE && t[1] === 5));
  for (const [side, target] of [["player", "b1"], ["opponent", "b0"]] as const) {
    it(`ordinary Absorb, ${side} attacker (controller-hosted): the creation frame ends already stepped back to y2 0; ShakeMon runs ahead of Task_UpdateMonBg`, () => {
      const rows = shakeRows(fixture(`ram/absorb-${side}-on.json`).rows);
      expect(rows.map((r: any) => r[target])).toEqual([[0, 0], [0, 0], [0, 5], [0, 5], [0, 0], [0, 0], [0, 5], [0, 5]]);
      expect(rows[0].tasks.map((t: any) => [Number(t[0]), t[1]])).toEqual([[SHAKE, 5], [UPDATE_MON_BG, 10]]);
    });
    it(`drain, ${side} seeds (task-hosted): the creation frame ends at y2 +5 (no same-pass step); the script task and Task_UpdateMonBg (priority 10) follow ShakeMon (priority 5)`, () => {
      const rows = shakeRows(fixture(`ram/leech-seed-drain-${side}-on.json`).rows);
      expect(rows.map((r: any) => r[target])).toEqual([[0, 5], [0, 0], [0, 0], [0, 5], [0, 5], [0, 0], [0, 0], [0, 5], [0, 5]]);
      expect(rows[0].tasks.map((t: any) => [Number(t[0]), t[1]])).toEqual([[SHAKE, 5], [TABLE_TASK, 10], [UPDATE_MON_BG, 10]]);
    });
  }
});

describe("lsd199: dense receipt (lsd198DrainDense.ts, tools/integration/fixtures/lsd199/dense; r1 == r2 byte-identical)", () => {
  for (const [name, rows, outside] of [["p-on-r1.json", 446, 228], ["o-on-r1.json", 437, 219]] as const) {
    it(`${name}: every row pixel-exact (${rows} rows, the 218-row animation command included)`, () => {
      const r = fixture(`dense/${name}`);
      expect([r.total.rows, r.total.exactRows, r.animationSpan.exactRows, r.outsideAnimation.exactRows]).toEqual([rows, rows, 218, outside]);
      expect(r.rows.filter((x: any) => x.box + x.opp + x.ply + x.other > 0)).toEqual([]);
    });
  }
});
