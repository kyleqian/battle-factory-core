import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { decodeSpriteOrderPlan } from "../src/engine/spriteOrderEventTransform.ts";
import { LAB_TRACES, ROUTE_TRACES, UNIT_PLANS, replay } from "../tools/integration/spriteOrderUncoveredReplay.ts";

// Evidence tests for docs/sprite-order-uncovered-units.md: the proposed constant-shape unit plans equal the ROM-extracted window streams of every observed
// instance, and the strict replay with the units modelled has no mismatch on the real route or the BattleLab KO / switch scenarios.
const FX = new URL("../tools/integration/fixtures/sprite-order-uncovered/", import.meta.url);
const names = [...ROUTE_TRACES, ...LAB_TRACES.map(name => `lab:${name}`)];
interface Window { C?: ["n", number, string][]; D?: ([string, number])[] }
interface UnitEvent { n: number; k: string; unitClass?: string; plan?: Window[]; survivors?: number[]; creatorsByWindow?: string[][] }
const events = (name: string): UnitEvent[] => JSON.parse(readFileSync(new URL(`events/${name.replace(":", "-")}.json`, FX), "utf8")).events;

/** Plan text of an extracted unit; external destroys named by the survivors of the unit directly before it (`c1.r`) when `previous` is given. */
function encode(plan: Window[], previous: number[] = [], rewrite?: (slot: number) => string): string {
  return plan.map(window => [
    window.C ? `C${window.C.map(token => token[2]).join("")}` : "",
    window.D ? `D${window.D.map(([kind, value]) => kind === "o" ? (rewrite ? rewrite(value) : previous.includes(value) ? `c1.${previous.indexOf(value)}` : `o${value}`) : String(value)).join(",")}` : "",
  ].filter(Boolean).join("/")).join(";");
}

describe("uncovered sprite-order units: constant-shape plans", () => {
  const seen = new Map<string, number>();
  const count = (klass: string) => seen.set(klass, (seen.get(klass) ?? 0) + 1);
  it("every extracted instance equals its proposed plan", () => {
    for (const name of names) {
      const list = events(name);
      let previous: UnitEvent | undefined;
      list.forEach((event, index) => {
        if (event.k !== "uncovered" && !(event.k === "anim" && event.unitClass)) return;
        const klass = event.unitClass!;
        const where = `${name}@${event.n} ${klass}`;
        if (klass.startsWith("faint-")) {
          expect(event.plan, where).toHaveLength(1);
          expect(event.plan![0]!.D, where).toHaveLength(1);
          expect(event.plan![0]!.D![0]![0], where).toBe("o");
        } else if (klass === "U2-next-mon-summary") expect(encode(event.plan!), where).toBe(UNIT_PLANS.summary);
        else if (klass === "U3-next-mon-sendout") {
          expect(previous?.unitClass, where).toBe("U2-next-mon-summary");
          expect(encode(event.plan!, previous!.survivors), where).toBe(UNIT_PLANS.nextSendOut);
          expect(event.survivors, where).toHaveLength(1);
        } else if (klass === "U4a-switchin-ball-start") {
          expect(encode(event.plan!), where).toBe(UNIT_PLANS.switchInStart);
          expect(event.survivors, where).toHaveLength(3);
        } else if (klass === "U4b-switchin-ball-particles") {
          expect(previous?.unitClass, where).toBe("U4a-switchin-ball-start");
          expect(encode(event.plan!, previous!.survivors), where).toBe(UNIT_PLANS.switchInParticles);
        } else if (klass === "U6-battle-reshow") {
          const both = (event.creatorsByWindow ?? []).flat().filter(by => by === "CreateBattlerSprite").length === 2;
          expect(encode(event.plan!), where).toBe(both ? UNIT_PLANS.reshowBoth : UNIT_PLANS.reshowPlayerGone);
        } else if (klass === "U7-end-trainer-slide") expect(encode(event.plan!), where).toBe(UNIT_PLANS.trainerSlide);
        else if (klass === "U8-recall-switch-out") {
          const slot = event.plan!.flatMap(window => window.D ?? []).find(([kind]) => kind === "o")![1];
          expect(encode(event.plan!), where).toBe(UNIT_PLANS.recall(slot));
        }
        else return;
        count(klass);
        previous = event;
        void index;
      });
    }
    // every class was exercised (counts over the 5 route traces + 12 lab scenarios)
    expect([...seen.keys()].sort()).toEqual(["U2-next-mon-summary", "U3-next-mon-sendout", "U4a-switchin-ball-start", "U4b-switchin-ball-particles",
      "U6-battle-reshow", "U7-end-trainer-slide", "U8-recall-switch-out", "faint-opponent", "faint-player"]);
  });

  it("plan texts decode and keep the documented creation counts", () => {
    expect(decodeSpriteOrderPlan(UNIT_PLANS.summary)[0]!.C).toHaveLength(7);
    expect(decodeSpriteOrderPlan(UNIT_PLANS.nextSendOut).flatMap(window => window.C ?? [])).toHaveLength(19);
    expect(decodeSpriteOrderPlan(UNIT_PLANS.switchInParticles).flatMap(window => window.D ?? [])).toHaveLength(2 + 16);
    expect(decodeSpriteOrderPlan(UNIT_PLANS.recall(0)).flatMap(window => window.C ?? [])).toHaveLength(16);
  });
});

describe("uncovered sprite-order units: strict replay with the units modelled", () => {
  const sum = (mode: "baseline" | "modelled", isolated: boolean, pick: (name: string) => boolean) => {
    const rows = names.filter(pick).map(name => replay(name, mode, isolated));
    const add = (f: (r: ReturnType<typeof replay>) => number) => rows.reduce((total, row) => total + f(row), 0);
    return {
      edges: add(r => r.moveEdges.edges), known: add(r => r.moveEdges.known), exact: add(r => r.moveEdges.exact), mismatched: add(r => r.moveEdges.mismatched),
      occupied: add(r => r.moveEdges.occupiedMismatch + r.animEdges.occupiedMismatch + r.animEdges.mismatched),
      units: add(r => r.unitChecks.strict.checks + r.unitChecks.isolated.checks), unitMismatched: add(r => r.unitChecks.strict.mismatched + r.unitChecks.isolated.mismatched),
      unitOccupied: add(r => r.unitChecks.strict.occupiedMismatch + r.unitChecks.isolated.occupiedMismatch),
    };
  };
  const route = (name: string) => !name.startsWith("lab:");
  const lab = (name: string) => name.startsWith("lab:");
  it("route baseline reproduces the Endeavor/Fake Tears strict count 44/44/0 of 91", () => {
    expect(sum("baseline", false, route)).toMatchObject({ edges: 91, known: 44, exact: 44, mismatched: 0, occupied: 0 });
  });
  it("route with units modelled: 84/84/0 strict, 91/91/0 isolated, every unit check exact", () => {
    expect(sum("modelled", false, route)).toMatchObject({ edges: 91, known: 84, exact: 84, mismatched: 0, occupied: 0, units: 18, unitMismatched: 0, unitOccupied: 0 });
    expect(sum("modelled", true, route)).toMatchObject({ edges: 91, known: 91, exact: 91, mismatched: 0, occupied: 0, units: 26, unitMismatched: 0, unitOccupied: 0 });
  });
  it("BattleLab KO / switch scenarios: 25/25/0 strict (baseline 15), 27/27/0 isolated", () => {
    expect(sum("baseline", false, lab)).toMatchObject({ edges: 27, known: 15, exact: 15, mismatched: 0, occupied: 0 });
    expect(sum("modelled", false, lab)).toMatchObject({ edges: 27, known: 25, exact: 25, mismatched: 0, occupied: 0, units: 18, unitMismatched: 0, unitOccupied: 0 });
    expect(sum("modelled", true, lab)).toMatchObject({ edges: 27, known: 27, exact: 27, mismatched: 0, occupied: 0, units: 22, unitMismatched: 0, unitOccupied: 0 });
  });
});
