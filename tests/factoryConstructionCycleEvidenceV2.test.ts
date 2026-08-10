import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { advanceRngValue } from "../src/engine/rng.ts";

type CycleEvent = {
  kind: string;
  frame: number;
  masterCycles: number;
  cyclePhase: number;
  monIndex?: number | null;
  attempt?: number | null;
  half?: "low" | "high" | null;
  interruptIndex?: number;
};

type SequenceEvent = {
  tag: "construction" | "ambient";
  frame: number;
  caller: string;
  pre: number;
  post: number;
  monIndex?: number;
  attempt?: number;
  half?: "low" | "high";
  masterCycles: number;
};

type ProbeCase = {
  case: "anchor" | "liliana" | "factory-varied";
  oracleProfile: string;
  sourceFunction: string;
  sourceSetIds: number[];
  entry: { rngValue: number; masterCycles: number };
  return: { rngValue: number; masterCycles: number };
  sequence: SequenceEvent[];
  monBoundaries: Array<{
    monIndex: number;
    attempts: number;
    targetNature: number;
    acceptedPersonality: number;
    startCursor: number;
    endCursor: number;
  }>;
  totals: { construction: number; ambient: number; total: number };
  cycleEvidence: {
    frameCycles: number;
    initialMasterCyclePhase: number;
    sourceEntryMasterCyclePhase: number;
    cyclesSincePriorVBlank: number;
    events: CycleEvent[];
  };
};

const ROOT = "tests/fixtures/factory-construction-cycle-v2";
const EXPECTED = [
  ["anchor", "631bd21408ba41e03c0e119dde3d83d94dda023cee93ebc3e470e6d94741cc2a", 91_673, 50_560],
  ["liliana", "ae1282b74f74de6a85b8772adfbcd83028fad09f8aa3e3ecd518aafeab17b443", 257_104, 215_990],
  ["factory-varied", "3e10197a34f4ea7a08a23bead04ae5b6113c653304722167095612a9b0626987", 248_986, 207_872],
] as const;

const probes = EXPECTED.map(([name]) => {
  const bytes = readFileSync(`${ROOT}/${name}.json`);
  return { name, bytes, value: JSON.parse(bytes.toString("utf8")) as ProbeCase };
});

function personality(low: SequenceEvent, high: SequenceEvent): number {
  return (((high.post >>> 16) << 16) | (low.post >>> 16)) >>> 0;
}

function interruptPauses(events: CycleEvent[]): Array<[number, number]> {
  const pairs = new Map<number, Partial<{ entry: number; resume: number }>>();
  for (const event of events) {
    if (event.interruptIndex === undefined) continue;
    const pair = pairs.get(event.interruptIndex) ?? {};
    if (event.kind === "vblank-entry") pair.entry = event.masterCycles;
    if (event.kind === "vblank-resume") pair.resume = event.masterCycles;
    pairs.set(event.interruptIndex, pair);
  }
  return [...pairs.values()].flatMap((pair) => (
    pair.entry === undefined || pair.resume === undefined ? [] : [[pair.entry, pair.resume] as [number, number]]
  ));
}

function sourceCycles(a: CycleEvent, b: CycleEvent, pauses: Array<[number, number]>): number {
  const interrupted = pauses.reduce((sum, [entry, resume]) => (
    a.masterCycles <= entry && resume <= b.masterCycles ? sum + resume - entry : sum
  ), 0);
  return b.masterCycles - a.masterCycles - interrupted;
}

describe("Factory construction v2 source/cycle receipt", () => {
  it("is canonical, hash-pinned output reproduced byte-identically by two fresh probes", () => {
    for (const [index, [, sha, initialPhase, sinceVBlank]] of EXPECTED.entries()) {
      const probe = probes[index]!;
      expect(createHash("sha256").update(probe.bytes).digest("hex")).toBe(sha);
      expect(probe.bytes.toString("utf8")).toBe(`${JSON.stringify(probe.value, null, 2)}\n`);
      expect(probe.value.oracleProfile).toBe("battle-scene-off");
      expect(probe.value.cycleEvidence.initialMasterCyclePhase).toBe(initialPhase);
      expect(probe.value.cycleEvidence.cyclesSincePriorVBlank).toBe(sinceVBlank);
      expect(probe.value.cycleEvidence.frameCycles).toBe(280_896);
    }
  });

  it("preserves exact tag order, frames, cursors, mon entries, and accepted personalities", () => {
    expect(probes.map(({ value }) => value.monBoundaries.map((mon) => mon.attempts))).toEqual([
      [23, 25, 51, 16, 2, 4],
      [13, 7, 36],
      [59, 12, 30],
    ]);
    for (const { value } of probes) {
      expect(value.sequence).toHaveLength(value.totals.total);
      expect(value.sequence[0]!.pre).toBe(value.entry.rngValue);
      expect(value.sequence.at(-1)!.post).toBe(value.return.rngValue);
      value.sequence.forEach((event, index) => {
        expect(event.post).toBe(advanceRngValue(event.pre));
        if (index > 0) expect(event.pre).toBe(value.sequence[index - 1]!.post);
      });
      const construction = value.sequence.filter((event) => event.tag === "construction");
      expect(construction).toHaveLength(value.totals.construction);
      for (const mon of value.monBoundaries) {
        const events = construction.filter((event) => event.monIndex === mon.monIndex);
        expect(events).toHaveLength(mon.attempts * 2);
        expect(events[0]!.pre).toBe(mon.startCursor);
        expect(events.at(-1)!.post).toBe(mon.endCursor);
        for (let attempt = 0; attempt < mon.attempts; attempt += 1) {
          const low = events[attempt * 2]!;
          const high = events[attempt * 2 + 1]!;
          expect([low.attempt, low.half, high.attempt, high.half]).toEqual([
            attempt, "low", attempt, "high",
          ]);
          const candidate = personality(low, high);
          expect(candidate % 25 === mon.targetNature).toBe(attempt + 1 === mon.attempts);
          if (attempt + 1 === mon.attempts) expect(candidate).toBe(mon.acceptedPersonality);
        }
      }
    }
  });

  it("pins every source phase and VBlank entry/ambient/return/resume order", () => {
    for (const { value } of probes) {
      const events = value.cycleEvidence.events;
      expect(events.every((event, index) => index === 0 || event.masterCycles >= events[index - 1]!.masterCycles)).toBe(true);
      expect(events.every((event) => event.cyclePhase === event.masterCycles % 280_896)).toBe(true);
      for (const mon of value.monBoundaries) {
        const kinds = events.filter((event) => event.monIndex === mon.monIndex).map((event) => event.kind);
        expect(kinds.filter((kind) => kind === "construction-entry")).toHaveLength(1);
        expect(kinds.filter((kind) => kind === "create-mon-entry")).toHaveLength(1);
        expect(kinds.filter((kind) => kind === "create-mon-return")).toHaveLength(1);
        expect(kinds.filter((kind) => kind === "calculate-mon-stats-entry")).toHaveLength(1);
        expect(kinds.filter((kind) => kind === "calculate-mon-stats-return")).toHaveLength(1);
        expect(kinds.filter((kind) => kind === "construction-return")).toHaveLength(1);
        expect(kinds.filter((kind) => kind === "factory-post-mon-end")).toHaveLength(1);
      }
      const epochInterruptEvents = events.filter((event) => (
        event.masterCycles >= value.entry.masterCycles
        && event.masterCycles <= value.return.masterCycles
        && event.kind.startsWith("vblank-")
      ));
      const order = epochInterruptEvents.map((event) => event.kind);
      for (let index = 0; index + 2 < order.length; index += 3) {
        expect(order.slice(index, index + 3)).toEqual(["vblank-entry", "vblank-return", "vblank-resume"]);
      }
      expect(events.filter((event) => event.kind === "ambient-random")).toHaveLength(value.totals.ambient);
    }
  });

  it("refutes the current operation-only callback and names the two absent inputs", () => {
    for (const { value } of probes) {
      const events = value.cycleEvidence.events;
      const pauses = interruptPauses(events);
      const attemptCosts: number[] = [];
      for (const mon of value.monBoundaries) {
        const monEvents = events.filter((event) => event.monIndex === mon.monIndex);
        const random = monEvents.filter((event) => event.kind === "personality-random");
        const checks = monEvents.filter((event) => event.kind === "personality-attempt-check");
        const create = monEvents.find((event) => event.kind === "create-mon-entry")!;
        checks.forEach((check, attempt) => {
          const end = attempt + 1 < checks.length ? random[(attempt + 1) * 2]! : create;
          attemptCosts.push(sourceCycles(check, end, pauses));
        });
      }
      // GetNatureFromPersonality compiles through data-dependent division.
      // The candidate personality is not present on FactoryConstructionOperation.
      expect(new Set(attemptCosts).size).toBeGreaterThan(30);

      const callbackCosts = interruptPauses(events)
        .filter(([entry]) => entry >= value.entry.masterCycles && entry <= value.return.masterCycles)
        .map(([entry, resume]) => resume - entry);
      // Interrupt service also depends on live audio/DMA state, not mon inputs.
      expect(new Set(callbackCosts).size).toBeGreaterThan(20);
    }
  });
});
