// S10A gdgeo (docs/giga-drain-geometry-order.md): the Giga Drain body's (202) sprite-order plan is keyed by the battlers' geometry.
// ROM receipts: tools/integration/fixtures/gdgeo/units.json (24-pair grid, twice fresh) + fixtures/prep43/units.json (10 jobs).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { BattleKernelSemanticEvent } from "../src/engine/battleDecisionBoundary.ts";
import { battleResolutionMoveAnimationField } from "../src/engine/battleResolutionPresentationRender.ts";
import { battleCommandFieldSpeciesSpriteOrigin, createBattleCommandFieldArtView } from "../src/engine/battleCommandFieldArt.ts";
import { advanceLiveSpriteOrderHost, createLiveSpriteOrderHost, lendLiveSpriteOrder } from "../src/engine/liveSpriteOrderHost.ts";
import {
  applySpriteOrderPresentationEvent, createSpriteOrderTracker, decodeSpriteOrderPlan, type SpriteOrderPresentationEvent,
} from "../src/engine/spriteOrderEventTransform.ts";
import { gigaDrainSpriteOrderPlanForGeometry, megaDrainSpriteOrderPlanForGeometry } from "../src/engine/spriteOrderGigaDrainPlan.ts";
import { applySpriteOrderUnitPlan, createSpriteOrderPlanCursor, knownEntrySpriteOrderState } from "../src/engine/spriteOrderProvider.ts";
import { generatedCommandAnimationReplay } from "../tools/integration/generatedCommandAnimationReplay.ts";

/** The plan of 9 / 10 prep43 probes (prep43Check.ts PREP43_PLANS "body 202"). */
const MAJORITY = "Cf;D0;Cf;D1;Cfff;Cfff;Cfff;Cfff;Cfff;D2;Cfff;D5,6;D3;Cfff;D8,10;D4;Cfff;D12,13;D7,9;D16;D11;D17,19;D14;D15;D21;D18;"
  + "D23,24;D20;D22;D25;Cf;Cf;Cf;D26;Cf;D27;D28;D29;Cf;D30";
const FLIP_18 = MAJORITY.replace("D7,9", "D9,7");
const ONIX = 95, DIGLETT = 50, ROSELIA = 363;

interface Win { f: number; C: [number, string][]; D: number[]; F: number[] }
interface Unit { kind: string; label: string; F0: number[]; truncated: boolean; plan: string; windows: Win[] }
interface Job { base: string; variant: unknown; identicalAB: boolean; predicted?: string; units: Unit[] }
const read = (path: string) => (JSON.parse(readFileSync(path, "utf8")) as { jobs: Record<string, Job> }).jobs;

function species(job: Job): { playerSpecies: number; opponentSpecies: number } {
  const parties = JSON.parse(readFileSync(`tools/battle-lab/${job.base}.json`, "utf8")).overrides.parties;
  const v = (Array.isArray(job.variant) ? job.variant : []) as (string | number)[];
  if (v[0] === "both") return { playerSpecies: v[1] as number, opponentSpecies: v[2] as number };
  const out = { playerSpecies: parties.player[0].species as number, opponentSpecies: parties.opponent[0].species as number };
  for (let i = v[0] === "extend" ? 2 : 0; i + 1 < v.length; i += 2) {
    if (v[i] === "player") out.playerSpecies = v[i + 1] as number; else if (v[i] === "opponent") out.opponentSpecies = v[i + 1] as number;
  }
  return out;
}

const instances = [...Object.entries(read("tools/integration/fixtures/gdgeo/units.json")),
  ...Object.entries(read("tools/integration/fixtures/prep43/units.json"))].flatMap(([name, job]) => job.units
  .filter(unit => unit.kind === "body" && !unit.truncated && unit.label.startsWith("body 202:"))
  .map(unit => ({ name, job, unit, side: unit.label.endsWith(":player") ? "player" as const : "opponent" as const })));

describe("Giga Drain (202) geometry-keyed sprite-order plan", () => {
  it("reproduces every ROM grid plan (34 instances, both sides, A == B), including all predicted flips", () => {
    expect(instances).toHaveLength(34);
    let flips = 0;
    for (const { name, job, unit, side } of instances) {
      expect(job.identicalAB, name).toBe(true);
      expect([MAJORITY, FLIP_18], name).toContain(unit.plan);
      expect(gigaDrainSpriteOrderPlanForGeometry(side, species(job)), name).toBe(unit.plan);
      if (job.predicted !== undefined) expect(job.predicted, name).toBe(unit.plan === MAJORITY ? "majority" : "flip window 18 (D9,7)");
      if (unit.plan === FLIP_18) flips += 1;
    }
    expect(flips).toBe(10); // prep43's DIGLETT + the 9 predicted grid flips
    for (const side of ["player", "opponent"] as const) {
      const pairs = new Set(instances.filter(row => row.side === side).map(row => JSON.stringify(species(row.job))));
      expect(pairs.size).toBeGreaterThanOrEqual(12);
    }
  });

  it("the DIGLETT opponent attacker flips the window-18 orb pair (prep43's one non-majority probe)", () => {
    expect(gigaDrainSpriteOrderPlanForGeometry("opponent", { playerSpecies: ONIX, opponentSpecies: DIGLETT })).toBe(FLIP_18);
    expect(gigaDrainSpriteOrderPlanForGeometry("opponent", { playerSpecies: ONIX, opponentSpecies: ROSELIA })).toBe(MAJORITY);
    expect(gigaDrainSpriteOrderPlanForGeometry("player", { playerSpecies: ROSELIA, opponentSpecies: ONIX })).toBe(MAJORITY);
  });

  it("per-frame: the production cursor with the geometry plan matches every ROM allocation window; the majority plan does not for the flips", () => {
    const run = (unit: Unit, text: string) => {
      const plan = decodeSpriteOrderPlan(text), start = createSpriteOrderPlanCursor({ known: true, free: unit.F0, pendingDestroyed: [] });
      expect(plan).toHaveLength(unit.windows.length);
      return unit.windows.every((rom, k) => {
        const cursor = applySpriteOrderUnitPlan(start, plan.slice(0, k + 1));
        return cursor.order.known && JSON.stringify(cursor.order.free) === JSON.stringify(rom.F);
      });
    };
    for (const { name, job, unit, side } of instances) {
      expect(run(unit, gigaDrainSpriteOrderPlanForGeometry(side, species(job))!), name).toBe(true);
      expect(run(unit, MAJORITY), name).toBe(unit.plan === MAJORITY);
    }
  });

  it("geometry sweep: every species pair's plan differs from the majority only in the order of same-frame destroy groups", () => {
    // The plan depends on the two picture centres only: sweep every distinct (attacker centre, target centre) of the species table.
    const centre = (species: number, side: "player" | "opponent") => {
      const art = createBattleCommandFieldArtView({ player: { species }, opponent: { species } } as never);
      const corner = battleCommandFieldSpeciesSpriteOrigin(art[side], side);
      return `${corner.x},${corner.y}`;
    };
    const species: number[] = [];
    for (let id = 1; id <= 411; id += 1) { try { centre(id, "player"); species.push(id); } catch { /* no battle picture */ } }
    const majority = MAJORITY.split(";");
    for (const side of ["player", "opponent"] as const) {
      const seen = new Set<string>(), classes = new Set<string>();
      for (const player of species) for (const opponent of species) {
        const key = `${centre(player, "player")}|${centre(opponent, "opponent")}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const plan = gigaDrainSpriteOrderPlanForGeometry(side, { playerSpecies: player, opponentSpecies: opponent })!;
        classes.add(plan);
        const windows = plan.split(";");
        expect(windows).toHaveLength(majority.length);
        windows.forEach((window, k) => {
          if (window === majority[k]) return;
          // only a multi-slot destroy window may differ, and only as a permutation of the same sprites
          expect(window.startsWith("D") && window.includes(",") && !window.includes("C"), `${key} window ${k}`).toBe(true);
          expect(window.slice(1).split(",").map(Number).sort((l, r) => l - r))
            .toEqual(majority[k]!.slice(1).split(",").map(Number).sort((l, r) => l - r));
        });
      }
      expect(seen.size).toBeGreaterThan(400);
      expect([...classes].sort()).toEqual([MAJORITY, FLIP_18].sort()); // both classes occur on each side
    }
  });

  it("the transform applies the geometry plan to a body event that carries geometry; without geometry it invalidates as before", () => {
    const tracker = createSpriteOrderTracker(knownEntrySpriteOrderState("ordinary-factory"));
    const body = (geometry?: { playerSpecies: number; opponentSpecies: number }): SpriteOrderPresentationEvent =>
      ({ kind: "move-animation", moveId: 202, attackerSide: "opponent", ...(geometry ? { geometry } : {}) });
    expect(applySpriteOrderPresentationEvent(tracker, body()).invalidReason).toBe("no EXACT plan: body 202:opponent");
    const diglett = applySpriteOrderPresentationEvent(tracker, body({ playerSpecies: ONIX, opponentSpecies: DIGLETT }));
    const roselia = applySpriteOrderPresentationEvent(tracker, body({ playerSpecies: ONIX, opponentSpecies: ROSELIA }));
    expect([diglett.cursor.order.known, roselia.cursor.order.known]).toEqual([true, true]);
    // the flipped pair frees its two slots in the other order: the free orders after the body differ
    expect(diglett.cursor.order.free).not.toEqual(roselia.cursor.order.free);
    expect([...diglett.cursor.order.free].sort((l, r) => l - r)).toEqual([...roselia.cursor.order.free].sort((l, r) => l - r));
  });

  it("the host attaches the displayed species of the body's own command (battleResolutionMoveAnimationField) and keeps lending", () => {
    const ev = (sequence: number, kind: string, extra: object = {}) =>
      Object.freeze({ sequence, payload: { kind, ...extra }, provenance: undefined }) as unknown as BattleKernelSemanticEvent;
    const host = Object.freeze({ ...createLiveSpriteOrderHost(knownEntrySpriteOrderState("ordinary-factory")), promptRequestId: 2 });
    const resolution = { resolutionId: { requestId: 2 }, segmentIndex: 0, segments: [{ events: [
      ev(1, "animation", { animationId: "MOVE_ANIMATION", battler: 1, target: 0, arguments: ["202", "0", "0", "0", "0", "0"] })] }] };
    const without = advanceLiveSpriteOrderHost(host, resolution, Number.POSITIVE_INFINITY);
    expect(without.tracker.invalidReason).toBe("no EXACT plan: body 202:opponent");
    expect(lendLiveSpriteOrder(without, 288)).toBeUndefined();
    const asked: [number, number][] = [];
    const withGeometry = advanceLiveSpriteOrderHost(host, resolution, Number.POSITIVE_INFINITY, false, (segment, sequence) => {
      asked.push([segment, sequence]);
      return { playerSpecies: ONIX, opponentSpecies: DIGLETT };
    });
    expect(asked).toEqual([[0, 1]]);
    expect(withGeometry.tracker.invalidReason).toBeNull();
    expect(lendLiveSpriteOrder(withGeometry, 288)?.known).toBe(true);
    // the field at a move-animation command: the segment's field after the commands before it (a switch-in replaces the species)
    const mon = (species: number) => ({ species }) as never;
    const segment = { field: { player: mon(ONIX), opponent: mon(ROSELIA) }, commands: [
      { type: "switch-in", eventSequence: 3, battler: 1, incoming: mon(DIGLETT) },
      { type: "move-animation", eventSequence: 7, battler: 1 },
    ] } as never;
    expect(battleResolutionMoveAnimationField(segment, 7)?.opponent.species).toBe(DIGLETT);
    expect(battleResolutionMoveAnimationField(segment, 8)).toBeNull();
  });

  it("ordinary route: bodies after an opponent Giga Drain keep the lend; ON/OFF gameplay identical", () => {
    // seed 101, streak 33, slot 1 every turn: opponent Giga Drain (202) then the player's Dragon Breath (225), repeatedly.
    const on = generatedCommandAnimationReplay(101, "on", [1, 1, 1, 1, 1], 33, true, true);
    const off = generatedCommandAnimationReplay(101, "off", [1, 1, 1, 1, 1], 33, true, true);
    expect(on.boundaries.map(row => row.rng)).toEqual(off.boundaries.map(row => row.rng));
    expect(on.boundaries.map(row => row.boundary)).toEqual(off.boundaries.map(row => row.boundary));
    const labels = on.commands.filter(row => row.type === "move-animation" && (row.command as { animation?: unknown }).animation)
      .map(row => { const a = (row.command as { animation: { moveId: number; attacker: number } }).animation;
        return `${a.moveId}${a.attacker === 0 ? "p" : "o"}${row.spriteOrderInput ? "L" : "-"}`; });
    expect(labels).toEqual(["202oL", "225pL", "225pL", "202oL", "225pL", "202oL", "225pL", "225pL", "202oL"]);
    expect(off.commands.every(row => row.spriteOrderInput === undefined)).toBe(true);
  }, 120000);

  // Mega Drain (72): the same orb family (MegaDrainAbsorbEffect); its one same-frame orb pair is plan n5 / n6 (end age 95).
  const MD_OLDER = "Cf;D0;Cf;D1;Cff;Cff;Cff;Cff;Cff;D2;Cff;D4;D3;Cff;D7;Cff;D9;D5,6;D10;D8;D12;D11;D15;D13;D16;D14;D17;Cf;Cf;Cf;D18;Cf;D19;"
    + "D20;D21;Cf;D22";
  const MD_NEWER = MD_OLDER.replace("D5,6", "D6,5");
  const mdInstances = Object.entries(read("tools/integration/fixtures/gdgeo/md-units.json")).flatMap(([name, job]) => job.units
    .filter(unit => unit.kind === "body" && !unit.truncated && unit.label.startsWith("body 72:"))
    .map(unit => ({ name, job, unit, side: unit.label.endsWith(":player") ? "player" as const : "opponent" as const })));

  it("Mega Drain: reproduces every ROM grid plan (14 instances, both sides, A == B), both pair orders, all predictions", () => {
    expect(mdInstances).toHaveLength(14);
    for (const { name, job, unit, side } of mdInstances) {
      expect(job.identicalAB, name).toBe(true);
      expect([MD_OLDER, MD_NEWER], name).toContain(unit.plan);
      expect(megaDrainSpriteOrderPlanForGeometry(side, species(job)), name).toBe(unit.plan);
      expect(job.predicted, name).toBe(unit.plan === MD_OLDER ? "older-first (D5,6)" : "newer-first (D6,5)");
    }
    for (const side of ["player", "opponent"] as const) {
      const plans = mdInstances.filter(row => row.side === side).map(row => row.unit.plan);
      expect(new Set(plans.map(String)).size, side).toBe(2); // both orders observed on each side
      expect(plans.length).toBeGreaterThanOrEqual(6);
    }
    // the transform: no geometry -> invalidates as before; the two orders free the pair's slots in opposite order
    const tracker = createSpriteOrderTracker(knownEntrySpriteOrderState("ordinary-factory"));
    const body = (geometry?: { playerSpecies: number; opponentSpecies: number }): SpriteOrderPresentationEvent =>
      ({ kind: "move-animation", moveId: 72, attackerSide: "opponent", ...(geometry ? { geometry } : {}) });
    expect(applySpriteOrderPresentationEvent(tracker, body()).invalidReason).toBe("no EXACT plan: body 72:opponent");
    const newer = applySpriteOrderPresentationEvent(tracker, body({ playerSpecies: ONIX, opponentSpecies: DIGLETT }));
    const older = applySpriteOrderPresentationEvent(tracker, body({ playerSpecies: ONIX, opponentSpecies: ROSELIA }));
    expect([newer.cursor.order.known, older.cursor.order.known]).toEqual([true, true]);
    expect(newer.cursor.order.free).not.toEqual(older.cursor.order.free);
  });

  it("Mega Drain: per-frame cursor vs ROM F; geometry sweep differs from either order only in its same-frame pair", () => {
    for (const { name, job, unit, side } of mdInstances) {
      const plan = decodeSpriteOrderPlan(megaDrainSpriteOrderPlanForGeometry(side, species(job))!);
      const start = createSpriteOrderPlanCursor({ known: true, free: unit.F0, pendingDestroyed: [] });
      expect(plan, name).toHaveLength(unit.windows.length);
      unit.windows.forEach((rom, k) => expect(applySpriteOrderUnitPlan(start, plan.slice(0, k + 1)).order.free, `${name} ${k}`).toEqual(rom.F));
    }
    const classes = new Set<string>();
    for (let player = 1; player <= 411; player += 7) for (let opponent = 1; opponent <= 411; opponent += 5) {
      for (const side of ["player", "opponent"] as const) {
        const plan = megaDrainSpriteOrderPlanForGeometry(side, { playerSpecies: player, opponentSpecies: opponent });
        if (plan !== null) classes.add(plan);
      }
    }
    expect([...classes].sort()).toEqual([MD_OLDER, MD_NEWER].sort());
  });
});
