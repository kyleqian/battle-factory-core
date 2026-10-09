// plans48: Dream Eater (138) geometry-keyed sprite-order plan (docs/next-adapters-plans48.md) — the absorption-orb family of
// docs/giga-drain-geometry-order.md: DreamEaterAbsorb's orbs (Giga Drain's eight literal triples) + HealingEffect's stars, the plan
// computed from dreamEater.ts's own timeline through absorptionOrbSpriteOrderPlan.ts at the displayed species.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { liveMoveGeometrySpriteOrderPlanText } from "../src/engine/liveMoveAnimation.ts";
import {
  applySpriteOrderPresentationEvent, createSpriteOrderTracker, decodeSpriteOrderPlan, SPRITE_ORDER_GEOMETRY_KEYED_BODIES,
  type SpriteOrderPresentationEvent,
} from "../src/engine/spriteOrderEventTransform.ts";
import { applySpriteOrderUnitPlan, createSpriteOrderPlanCursor, knownEntrySpriteOrderState } from "../src/engine/spriteOrderProvider.ts";

type Side = "player" | "opponent";
type Species = { playerSpecies: number; opponentSpecies: number };
const dePlan = (side: Side, species: Species) => liveMoveGeometrySpriteOrderPlanText(138, side, species);

interface Win { f: number; C: [number, string][]; D: number[]; F: number[] }
interface Unit { kind: string; label: string; F0: number[]; truncated: boolean; plan: string; windows: Win[] }
interface Job { unit: string; base: string; variant?: unknown; ops?: unknown; identicalAB: boolean; units: Unit[] }
const read = (path: string) => (JSON.parse(readFileSync(path, "utf8")) as { jobs: Record<string, Job> }).jobs;
const prediction = JSON.parse(readFileSync("tools/integration/fixtures/plans48/dream-eater-prediction.json", "utf8")) as
  { plans: string[]; predictions: Record<string, number> };

function species(job: Job): Species {
  const parties = JSON.parse(readFileSync(`tools/battle-lab/${job.base}.json`, "utf8")).overrides.parties;
  const out = { playerSpecies: parties.player[0].species as number, opponentSpecies: parties.opponent[0].species as number };
  const set = (side: unknown, value: unknown) => { if (side === "player") out.playerSpecies = value as number; else out.opponentSpecies = value as number; };
  if (Array.isArray(job.variant)) set(job.variant[0], job.variant[1]); // prep45: (side, species)
  for (const op of (Array.isArray(job.ops) ? job.ops : []) as unknown[][]) if (op[0] === "species") set(op[1], op[2]); // plans48
  return out;
}

const instances = [...Object.entries(read("tools/integration/fixtures/plans48/units.json")),
  ...Object.entries(read("tools/integration/fixtures/prep45/units.json"))]
  .filter(([, job]) => job.unit === "BODY138")
  .flatMap(([name, job]) => job.units.filter(unit => unit.kind === "body" && !unit.truncated && unit.label.startsWith("body 138:"))
    .map(unit => ({ name, job, unit, side: unit.label.endsWith(":player") ? "player" as const : "opponent" as const })));

describe("Dream Eater (138) geometry-keyed sprite-order plan", () => {
  it("reproduces every ROM grid plan (14 instances, both sides, A == B), each equal to its pre-recorded prediction", () => {
    expect(instances).toHaveLength(14);
    for (const { name, job, unit, side } of instances) {
      expect(job.identicalAB, name).toBe(true);
      expect(dePlan(side, species(job)), name).toBe(unit.plan);
      if (name in prediction.predictions) expect(prediction.plans[prediction.predictions[name]!], name).toBe(unit.plan);
    }
    // the opponent side shows both predicted plans (the flips: Lapras 131 / Onix 95 defender with these attackers)
    expect(new Set(instances.filter(row => row.side === "opponent").map(row => row.unit.plan)).size).toBe(2);
    expect(new Set(instances.map(row => row.unit.plan))).toEqual(new Set(prediction.plans));
  });

  it("per-frame: the production cursor with the geometry plan matches every ROM allocation window", () => {
    for (const { name, job, unit, side } of instances) {
      const plan = decodeSpriteOrderPlan(dePlan(side, species(job))!);
      const start = createSpriteOrderPlanCursor({ known: true, free: unit.F0, pendingDestroyed: [] });
      expect(plan, name).toHaveLength(unit.windows.length);
      unit.windows.forEach((rom, k) => expect(applySpriteOrderUnitPlan(start, plan.slice(0, k + 1)).order.free, `${name} ${k}`).toEqual(rom.F));
    }
  });

  it("geometry sweep: every species pair's plan differs from the ROM plans only in the order of same-frame destroy groups", () => {
    const [reference] = prediction.plans as [string];
    const classes = new Set<string>();
    for (let player = 1; player <= 411; player += 13) for (let opponent = 1; opponent <= 411; opponent += 11) {
      for (const side of ["player", "opponent"] as const) {
        const plan = dePlan(side, { playerSpecies: player, opponentSpecies: opponent });
        if (plan !== null) classes.add(plan);
      }
    }
    for (const rom of prediction.plans) expect(classes.has(rom)).toBe(true);
    for (const plan of classes) {
      const windows = plan.split(";"), base = reference.split(";");
      expect(windows).toHaveLength(base.length);
      windows.forEach((window, k) => {
        if (window === base[k]) return;
        expect(window.startsWith("D") && base[k]!.startsWith("D"), `${k} ${window}`).toBe(true);
        expect(window.slice(1).split(",").map(Number).sort((l, r) => l - r)).toEqual(base[k]!.slice(1).split(",").map(Number).sort((l, r) => l - r));
      });
    }
  });

  it("the transform applies the geometry plan a body event carries; without one it invalidates as before", () => {
    expect(SPRITE_ORDER_GEOMETRY_KEYED_BODIES.has(138)).toBe(true);
    const tracker = createSpriteOrderTracker(knownEntrySpriteOrderState("ordinary-factory"));
    const body = (geometry?: Species): SpriteOrderPresentationEvent =>
      ({ kind: "move-animation", moveId: 138, attackerSide: "opponent", ...(geometry ? { geometryPlan: dePlan("opponent", geometry)! } : {}) });
    expect(applySpriteOrderPresentationEvent(tracker, body()).invalidReason).toBe("no EXACT plan: body 138:opponent");
    const majority = applySpriteOrderPresentationEvent(tracker, body({ playerSpecies: 95, opponentSpecies: 40 }));
    const flip = applySpriteOrderPresentationEvent(tracker, body({ playerSpecies: 131, opponentSpecies: 40 }));
    expect([majority.cursor.order.known, flip.cursor.order.known]).toEqual([true, true]);
    expect(majority.cursor.order.free).not.toEqual(flip.cursor.order.free);
  });
});
