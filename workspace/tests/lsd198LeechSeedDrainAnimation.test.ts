/**
 * lsd198 (docs/lsd198-leech-seed-drain-animation.md): the Scene ON Leech Seed drain (`general-animation` LEECH_SEED_DRAIN) is drawn by the existing live
 * MOVE_ABSORB adapter. Routing pins: the command flag, the render effect (battlers, start age, window), the sprite-order lend through the orchestrator's
 * prepareResolutionPalette, the production-only input rule, and the recorded ROM receipt's localisation of the one residual row. Hermetic (kernel + presentation).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createBattleResolutionPresentationRenderView, LEECH_SEED_DRAIN_ABSORB_MOVE_ID, LEECH_SEED_DRAIN_BODY_START_AGE } from "../src/engine/battleResolutionPresentationRender.ts";
import { renderBattleResolutionLiveView } from "../src/engine/battleScene.ts";
import { lsd186Production } from "../tools/integration/lsd186Production.ts";
import { lsd198Route } from "../tools/integration/lsd198Route.ts";

const CASES = [
  { label: "player seeds (the foe is drained)", seederSide: "player", seed: 57, drained: 1, owner: 0 },
  { label: "opponent seeds (the player is drained)", seederSide: "opponent", seed: 4, drained: 0, owner: 1 },
] as const;

describe("lsd198: Scene ON drain command flag", () => {
  for (const c of CASES) {
    it(`${c.label}: Scene ON carries animated: true on the 218-row command, Scene OFF does not`, () => {
      const on = lsd186Production({ scene: "on", seederSide: c.seederSide, seed: c.seed });
      const off = lsd186Production({ scene: "off", seederSide: c.seederSide, seed: c.seed });
      const onCommand = on.commands.find((x: any) => x.type === "general-animation" && x.animation === "LEECH_SEED_DRAIN") as any;
      const offCommand = off.commands.find((x: any) => x.type === "general-animation" && x.animation === "LEECH_SEED_DRAIN") as any;
      expect(onCommand.animated).toBe(true);
      expect(onCommand.battler).toBe(c.drained);
      expect(offCommand.animated).toBeUndefined();
    });
  }
});

describe("lsd198: the drain routes to the live ABSORB adapter", () => {
  for (const c of CASES) {
    const route = lsd198Route({ seederSide: c.seederSide, seed: c.seed });
    const k = route.commands.findIndex((x) => x.type === "general-animation" && x.animation === "LEECH_SEED_DRAIN");
    const effectAt = (age: number) => createBattleResolutionPresentationRenderView(route.at(k, age) as never).effect as any;

    it(`${c.label}: the effect is Absorb (move 71) from the seed owner onto the seeded battler, body age = command age - ${LEECH_SEED_DRAIN_BODY_START_AGE}`, () => {
      expect(LEECH_SEED_DRAIN_ABSORB_MOVE_ID).toBe(71);
      expect(LEECH_SEED_DRAIN_BODY_START_AGE).toBe(21);
      for (const [age, bodyAge] of [[21, 0], [41, 20], [100, 79], [214, 193]] as const) {
        const e = effectAt(age);
        expect(e.type).toBe("move");
        expect(e.request).toMatchObject({ moveId: 71, attacker: c.owner, target: c.drained });
        expect(e.age).toBe(bodyAge);
      }
    });

    it(`${c.label}: the sprite-order lend is known (the orchestrator lends it strictly before the drain's animation receipt)`, () => {
      expect(effectAt(21).spriteOrderInput?.known).toBe(true);
      expect(effectAt(100).spriteOrderInput).toBe(effectAt(21).spriteOrderInput);
    });

    it(`${c.label}: rows before the body are ordinary (no effect) and rows after it are the inert general-animation effect`, () => {
      for (const age of [0, 10, 20]) expect(effectAt(age) ?? null).toBeNull();
      for (const age of [215, 216, 217]) expect(effectAt(age)).toMatchObject({ type: "general-animation", animation: "LEECH_SEED_DRAIN" });
    });

    it(`${c.label}: the body is drawn (a hit-splat row differs from the same row without the animated flag)`, () => {
      const draw = (state: any) => { const fb = new Uint8Array(240 * 160 * 4); renderBattleResolutionLiveView(fb, createBattleResolutionPresentationRenderView(state)); return fb; };
      const animated = route.at(k, 21 + 17);
      const plain = { ...animated, segments: [{ ...animated.segments[0], commands: animated.segments[0].commands.map((x: any, i: number) => (i === k ? { ...x, animated: undefined } : x)) }] };
      const a = draw(animated), b = draw(plain);
      let differing = 0;
      for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) differing++;
      expect(differing).toBeGreaterThan(200);
    });

    it(`${c.label}: Scene OFF draws no move effect for the drain`, () => {
      const off = lsd186Production({ scene: "off", seederSide: c.seederSide, seed: c.seed });
      const index = off.commands.findIndex((x: any) => x.type === "general-animation" && x.animation === "LEECH_SEED_DRAIN");
      const state = { field: off.field, segments: [{ field: off.field, beforeRules: off.beforeRules, afterRules: off.afterRules, events: off.events, commands: off.commands }],
        segmentIndex: 0, commandIndex: index, lifecycle: { phase: "presenting", phaseElapsed: 30 }, confirmHandoff: null, opponentTrainer: null,
        sourceDecision: { kind: "use-move" }, fadeTick: 0 };
      expect((createBattleResolutionPresentationRenderView(state as never).effect as any)?.type).not.toBe("move");
    });
  }
});

describe("lsd198: fixture data never feeds production rendering", () => {
  it("no production source imports tools/ or a lsd198 fixture", () => {
    for (const file of ["src/engine/battleResolutionPresentationRender.ts", "src/engine/factoryRoundBattleOrchestrator.ts", "src/engine/battleResolutionPresentation.ts"]) {
      const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
      expect(source).not.toMatch(/from\s+["'][^"']*tools\//);
      expect(source).not.toMatch(/fixtures\/lsd198/);
    }
  });
});

describe("lsd198: recorded ROM receipt before the lsd199 fix (tools/integration/fixtures/lsd198/dense, lsd198DrainDense.ts; r1 == r2 byte-identical; the current receipt is fixtures/lsd199)", () => {
  const receipt = (name: string) => JSON.parse(readFileSync(new URL(`../tools/integration/fixtures/lsd198/dense/${name}`, import.meta.url), "utf8"));
  it("player seeds: 446 rows, every row outside the 218-row animation command pixel-exact, one residual row at body age 20", () => {
    const r = receipt("p-on.json");
    expect([r.total.rows, r.total.exactRows, r.outsideAnimation.exactRows, r.outsideAnimation.rows]).toEqual([446, 445, 228, 228]);
    expect(r.rows.filter((x: any) => x.box + x.opp + x.ply + x.other > 0).map((x: any) => [x.elapsed, x.opp, x.ply])).toEqual([[41, 1843, 0]]);
  });
  it("opponent seeds: 437 rows, every row outside the animation command pixel-exact, one residual row at body age 20", () => {
    const r = receipt("o-on.json");
    expect([r.total.rows, r.total.exactRows, r.outsideAnimation.exactRows, r.outsideAnimation.rows]).toEqual([437, 436, 219, 219]);
    expect(r.rows.filter((x: any) => x.box + x.opp + x.ply + x.other > 0).map((x: any) => [x.elapsed, x.opp, x.ply])).toEqual([[41, 0, 1476]]);
  });
});
