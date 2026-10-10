import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  applySpriteOrderPresentationEvent, createSpriteOrderTracker, decodeSpriteOrderPlan, spriteOrderProductionBodyPlan,
} from "../src/engine/spriteOrderEventTransform.ts";
import { applySpriteOrderUnitPlan, createSpriteOrderPlanCursor, knownEntrySpriteOrderState } from "../src/engine/spriteOrderProvider.ts";
import { advanceLiveSpriteOrderHost, createLiveSpriteOrderHost, type LiveSpriteOrderHost } from "../src/engine/liveSpriteOrderHost.ts";
import { SPRITE_ORDER_PRODUCTION_BODIES } from "../src/engine/spriteOrderProductionPlans.ts";
import type { BattleKernelSemanticEvent } from "../src/engine/battleDecisionBoundary.ts";

// S10A fly63: prep61's Fly 19 / Bounce 340 two-turn order plans (docs/next-adapters-prep61.md). Setup and unleash are keyed apart
// (choosetwoturnanim: 19 / 10019, 340 / 10340); the attacker is hidden from its setup body to its unleash body (FlySetUp / BounceSetUp hide
// the sprite themselves in Scene ON); a hit on the hidden battler allocates nothing; a hidden battler's faint / switch-in invalidates.
// Dive 291 is words-keyed (prep61) and keeps master's single unplanned key. ROM receipts: direct-mGBA probes (prep61Probe.py, every job
// twice in fresh processes, A == B), extracted by prep61Extract.py and checked per frame by prep61Check.ts (check.json).
const fixture = (name: string) => JSON.parse(readFileSync(new URL(`../tools/integration/fixtures/${name}`, import.meta.url), "utf8"));
interface Win { f: number; C: [number, string][]; D: number[]; F: number[] }
interface Unit { kind: string; label: string; frame: number; F0: number[]; truncated: boolean; strayFChanges: number; plan: string; windows: Win[] }
const units = fixture("prep61/units.json") as { jobs: Record<string, { unit: string; identicalAB: boolean; units: Unit[] }> };
const check = fixture("prep61/check.json") as {
  plans: Record<string, string>; labels: Record<string, { instances: number; exact: number; frames: number; jobs: string[]; problems: unknown[] }>;
};
const rows = fixture("prep61/plan-rows.json") as { bodies: Record<string, { verdict: string; tier: string }>; anims: Record<string, unknown> };
const sides = ["player", "opponent"] as const;
const same = (l: readonly number[], r: readonly number[]) => l.length === r.length && l.every((v, i) => v === r[i]);

/** prep45Check's checkUnit: the production plan prefix through every allocation window; created / destroyed / F equal the ROM. */
function perFrameExact(unit: Unit, plan: NonNullable<ReturnType<typeof spriteOrderProductionBodyPlan>>): boolean {
  const start = createSpriteOrderPlanCursor({ known: true, free: unit.F0, pendingDestroyed: [] });
  if (unit.windows.length !== plan.length || unit.strayFChanges !== 0) return false;
  let cursor = start;
  for (let k = 0; k < plan.length; k += 1) {
    const before = cursor;
    cursor = applySpriteOrderUnitPlan(start, plan.slice(0, k + 1));
    const rom = unit.windows[k]!;
    if (!cursor.order.known) return false;
    const created = cursor.occupied.filter(slot => !before.occupied.includes(slot));
    const destroyed = before.occupied.filter(slot => !cursor.occupied.includes(slot));
    if (!same(created, rom.C.map(([slot]) => slot).sort((l, r) => l - r)) || !same(destroyed, [...rom.D].sort((l, r) => l - r))
      || !same(cursor.order.free, rom.F)) return false;
  }
  return cursor.occupied.filter(slot => !start.occupied.includes(slot)).length === 0;
}

describe("fly63: prep61 Fly / Bounce receipts and production rows", () => {
  it("every job is identical across its two fresh runs; every Fly / Bounce body instance is per-frame exact under the production plan", () => {
    expect(Object.values(units.jobs).every(job => job.identicalAB)).toBe(true);
    const counted: Record<string, number> = {};
    for (const job of Object.values(units.jobs)) {
      for (const unit of job.units) {
        const body = /^body (\d+):(player|opponent)$/.exec(unit.label);
        if (unit.kind !== "body" || unit.truncated || !body || ![19, 10019, 340, 10340].includes(Number(body[1]))) continue;
        const plan = spriteOrderProductionBodyPlan(Number(body[1]), body[2] as "player" | "opponent");
        expect(plan, unit.label).not.toBeNull();
        expect(perFrameExact(unit, plan!), `${unit.label} f${unit.frame}`).toBe(true);
        counted[unit.label] = (counted[unit.label] ?? 0) + 1;
      }
    }
    // check.json (prep61Check.ts over the same units): every label exact == instances, both sides, at least 2 jobs.
    expect(Object.keys(check.labels).sort()).toEqual(Object.keys(check.plans).sort());
    for (const [label, result] of Object.entries(check.labels)) {
      expect({ label, exact: result.exact, problems: result.problems }).toEqual({ label, exact: result.instances, problems: [] });
      expect(result.jobs.length, label).toBeGreaterThanOrEqual(2);
      expect(counted[label], label).toBe(result.instances);
    }
    expect(Object.values(check.labels).reduce((n, l) => n + l.instances, 0)).toBe(53);
  });

  it("each plan row is EXACT / confirmed and equals the production text; no Dive row", () => {
    expect(Object.keys(rows.bodies).sort()).toEqual(
      ["10019:opponent", "10019:player", "10340:opponent", "10340:player", "19:opponent", "19:player", "340:opponent", "340:player"]);
    expect(rows.anims).toEqual({});
    for (const [key, row] of Object.entries(rows.bodies)) {
      expect({ key, verdict: row.verdict, tier: row.tier }).toEqual({ key, verdict: "EXACT-PLAN", tier: "confirmed" });
      const [move, side] = key.split(":") as [string, "player" | "opponent"];
      expect(spriteOrderProductionBodyPlan(Number(move), side), key).toEqual(decodeSpriteOrderPlan(check.plans[`body ${key}`]!));
    }
    // Bounce's unleash is side-keyed: the hitsplat pair's destroys swap.
    expect(check.plans["body 10340:player"]).toBe("Cf;Cf;D0;D1");
    expect(check.plans["body 10340:opponent"]).toBe("Cf;Cf;D1;D0");
    for (const key of ["291:player", "291:opponent", "10291:player", "10291:opponent"]) expect(SPRITE_ORDER_PRODUCTION_BODIES[key], key).toBeUndefined();
  });
});

describe("fly63: the host keys and hides the semi-invulnerable two-turn user", () => {
  const ev = (sequence: number, kind: string, extra: object = {}) =>
    Object.freeze({ sequence, payload: { kind, ...extra }, provenance: undefined }) as unknown as BattleKernelSemanticEvent;
  const host = (events: readonly BattleKernelSemanticEvent[]) => {
    const start: LiveSpriteOrderHost = Object.freeze({ ...createLiveSpriteOrderHost(knownEntrySpriteOrderState("ordinary-factory")), promptRequestId: 3 });
    return advanceLiveSpriteOrderHost(start, { resolutionId: { requestId: 3 }, segmentIndex: 0, segments: [{ events }] }, Number.POSITIVE_INFINITY);
  };
  const body = (sequence: number, move: number, battler: 0 | 1, turn: 0 | 1) => ev(sequence, "animation", {
    animationId: "MOVE_ANIMATION", battler, target: 1 - battler, arguments: [String(move), String(turn), "90", turn === 1 ? "30" : "0", "70", "0"] });
  const transform = (moveIds: readonly number[], attackerSide: "player" | "opponent") => moveIds.reduce(
    (tracker, moveId) => applySpriteOrderPresentationEvent(tracker, { kind: "move-animation", moveId, attackerSide }),
    createSpriteOrderTracker(knownEntrySpriteOrderState("ordinary-factory")));

  it("turn 0 is the setup key and hides the attacker; turn 1 is the 10000 + move unleash key and reveals it", () => {
    for (const move of [19, 340]) {
      for (const battler of [0, 1] as const) {
        const side = sides[battler];
        const setup = host([body(10, move, battler, 0)]);
        expect(setup.tracker.cursor.order.known, `${move}/${side}`).toBe(true);
        expect(setup.tracker.cursor.order.free).toEqual(transform([move], side).cursor.order.free);
        expect(setup.hidden[battler], `${move}/${side}`).toBe(true);
        expect(setup.hidden[1 - battler]).toBe(false);
        const unleash = host([body(10, move, battler, 0), body(20, move, battler, 1)]);
        expect(unleash.tracker.cursor.order.known, `${move}/${side}`).toBe(true);
        expect(unleash.tracker.cursor.order.free).toEqual(transform([move, 10000 + move], side).cursor.order.free);
        expect(unleash.hidden).toEqual([false, false]);
      }
    }
  });

  it("the hit on the hidden battler allocates nothing (no blip); on a shown battler it is still the blip", () => {
    for (const move of [19, 340]) {
      for (const battler of [0, 1] as const) {
        // The other battler's planned body leaves the lowest free slot off the head (Fly's unleash shape Cf;Cf;D0;D1), so a blip would show.
        const before = [body(10, move, battler, 0), body(15, 19, 1 - battler as 0 | 1, 1)];
        const window = host(before);
        expect(window.hidden[battler], `${move}/${battler}`).toBe(true);
        const hit = host([...before, ev(20, "animation", { animationId: "HIT_ANIMATION", battler, arguments: [] })]);
        expect(hit.tracker.cursor.order.known, `${move}/${battler}`).toBe(true);
        expect(hit.tracker.cursor.order.free).toEqual(window.tracker.cursor.order.free);
        expect(hit.tracker.cursor.occupied).toEqual(window.tracker.cursor.occupied);
        const other = host([...before, ev(20, "animation", { animationId: "HIT_ANIMATION", battler: 1 - battler, arguments: [] })]);
        expect(other.tracker.cursor.order.known).toBe(true);
        expect(other.tracker.cursor.order.free).toEqual(
          applySpriteOrderPresentationEvent(window.tracker, { kind: "hit-animation", targetVisible: true }).cursor.order.free);
        expect(other.tracker.cursor.order.free).not.toEqual(window.tracker.cursor.order.free);
      }
    }
  });

  it("a hidden battler's faint or switch-in invalidates (unprobed); the failed-unleash show toggle clears hidden without invalidating", () => {
    for (const battler of [0, 1] as const) {
      for (const kind of ["faint-animation", "switch-in-animation"]) {
        const after = host([body(10, 19, battler, 0), ev(20, kind, { battler })]);
        expect(after.tracker.cursor.order.known, `${kind}/${battler}`).toBe(false);
        expect(after.tracker.invalidReason).toBe(`${kind} of a hidden battler`);
      }
      const shown = host([body(10, 340, battler, 0), ev(20, "set-battler-sprite-visibility", { battler, invisible: false })]);
      expect(shown.hidden).toEqual([false, false]);
      expect(shown.tracker.cursor.order.known).toBe(true);
    }
  });

  it("Dive 291 keeps master's single unplanned key and never hides (words-keyed, out of scope)", () => {
    for (const battler of [0, 1] as const) {
      for (const turn of [0, 1] as const) {
        const after = host([body(10, 291, battler, turn)]);
        expect(after.tracker.cursor.order.known).toBe(false);
        expect(after.tracker.invalidReason).toContain(`body 291:${sides[battler]}`);
        expect(after.hidden).toEqual([false, false]);
      }
    }
  });
});
