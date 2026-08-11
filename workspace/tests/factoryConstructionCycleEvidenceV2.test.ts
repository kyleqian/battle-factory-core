import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  reduceFactoryConstructionEntryTiming,
  reduceFactoryNatureAttemptTiming,
  reduceFactoryOuterLoopTiming,
  reduceFactorySourceReturnTiming,
} from "../src/engine/factoryConstructionClock.ts";
import { advanceRngValue } from "../src/engine/rng.ts";
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };

type CycleEvent = {
  kind: string;
  frame: number;
  masterCycles: number;
  cyclePhase: number;
  pc: string;
  monIndex?: number | null;
  attempt?: number | null;
  half?: "low" | "high" | null;
  interruptIndex?: number;
  returnPc?: string;
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
  sourceFunction: "CreateFrontierFactorySelectableMons" | "FillFactoryFrontierTrainerParty";
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
const frontierMons = (frontierMonsData as { entries: Array<{ index: number; evSpread: number }> })
  .entries;

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

  it("replays every nature-check boundary from candidate-aware compiled instruction timing", () => {
    let acceptedChecks = 0;
    let rejectedChecks = 0;
    const asynchronousStallsByCase: number[] = [];
    for (const { value } of probes) {
      const events = value.cycleEvidence.events;
      const pauses = interruptPauses(events);
      const construction = value.sequence.filter((event) => event.tag === "construction");
      let constructionIndex = 0;
      let asynchronousStalls = 0;
      for (const mon of value.monBoundaries) {
        const monEvents = events.filter((event) => event.monIndex === mon.monIndex);
        const random = monEvents.filter((event) => event.kind === "personality-random");
        const checks = monEvents.filter((event) => event.kind === "personality-attempt-check");
        const create = monEvents.find((event) => event.kind === "create-mon-entry")!;
        checks.forEach((check, attempt) => {
          const low = construction[constructionIndex++]!;
          const high = construction[constructionIndex++]!;
          const candidate = personality(low, high);
          const end = attempt + 1 < checks.length ? random[(attempt + 1) * 2]! : create;
          const expected = reduceFactoryNatureAttemptTiming(candidate, mon.targetNature);
          expect(expected.candidateNature).toBe(candidate % 25);
          expect(expected.accepted).toBe(attempt + 1 === checks.length);
          const measuredCycles = sourceCycles(check, end, pauses);
          const externalCycles = measuredCycles - expected.cycles;
          // A fresh instruction trace attributes this sole residual to mGBA
          // servicing an asynchronous hardware timing event between two
          // ordinary Thumb instructions. It is part of the still-open live
          // audio/timer/DMA clock, not GetNatureFromPersonality's path.
          expect([0, 18]).toContain(externalCycles);
          if (externalCycles !== 0) asynchronousStalls += 1;
          if (expected.accepted) acceptedChecks += 1;
          else rejectedChecks += 1;
        });
      }
      expect(constructionIndex).toBe(construction.length);
      asynchronousStallsByCase.push(asynchronousStalls);

      const callbackCosts = interruptPauses(events)
        .filter(([entry]) => entry >= value.entry.masterCycles && entry <= value.return.masterCycles)
        .map(([entry, resume]) => resume - entry);
      // Interrupt service also depends on live audio/DMA state, not mon inputs.
      expect(new Set(callbackCosts).size).toBeGreaterThan(20);
    }
    expect(acceptedChecks).toBe(12);
    expect(rejectedChecks).toBe(266);
    expect(asynchronousStallsByCase).toEqual([5, 2, 4]);
  });

  it("replays all twelve construction-entry boundaries through the shared compiled prologue", () => {
    const measuredByCase: number[][] = [];
    const vblankPausesByCase: number[][] = [];
    const externalCyclesByCase: number[][] = [];

    for (const { value } of probes) {
      const events = value.cycleEvidence.events;
      const timing = reduceFactoryConstructionEntryTiming(value.sourceFunction);
      const measured: number[] = [];
      const vblankPauses: number[] = [];
      const externalCycles: number[] = [];

      for (const mon of value.monBoundaries) {
        const entry = events.find((event) => (
          event.kind === "construction-entry" && event.monIndex === mon.monIndex
        ))!;
        const firstRandom = events.find((event) => (
          event.kind === "personality-random"
          && event.monIndex === mon.monIndex
          && event.attempt === 0
          && event.half === "low"
        ))!;
        const pauses = interruptPauses(events).filter(([pauseEntry, resume]) => (
          entry.masterCycles <= pauseEntry && resume <= firstRandom.masterCycles
        ));
        const source = sourceCycles(entry, firstRandom, pauses);

        // mGBA's exposed pipelined PC is two bytes beyond the instruction at
        // each boundary. Both Factory callers have already converged on the
        // same CreateMonWithEVSpreadNatureOTID entry path here.
        expect(entry.pc).toBe(`0x${(timing.entryPc + 2).toString(16).padStart(8, "0")}`);
        expect(entry.returnPc).toBe(
          `0x${(timing.callerCallPc + 5).toString(16).padStart(8, "0")}`,
        );
        expect(firstRandom.pc).toBe(`0x${(timing.firstRandomPc + 2).toString(16).padStart(8, "0")}`);
        measured.push(source);
        vblankPauses.push(pauses.reduce((sum, [pauseEntry, resume]) => (
          sum + resume - pauseEntry
        ), 0));
        externalCycles.push(source - timing.cycles);
      }

      measuredByCase.push(measured);
      vblankPausesByCase.push(vblankPauses);
      externalCyclesByCase.push(externalCycles);
    }

    expect(measuredByCase).toEqual([
      [58, 58, 58, 58, 58, 58],
      [58, 58, 58],
      [58, 58, 58],
    ]);
    expect(vblankPausesByCase).toEqual([
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ]);
    expect(externalCyclesByCase).toEqual([
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ]);
  });

  it("replays all nine non-final Factory outer-loop tails from compiled source timing", () => {
    const measuredByCase: number[][] = [];
    const sourceCyclesByCase: number[][] = [];
    const vblankPausesByCase: number[][] = [];
    const asynchronousServiceByCase: number[][] = [];

    for (const { value } of probes) {
      const events = value.cycleEvidence.events;
      const pauses = interruptPauses(events);
      const measured: number[] = [];
      const reduced: number[] = [];
      const containedPauses: number[] = [];
      const asynchronousService: number[] = [];

      for (let monIndex = 0; monIndex + 1 < value.monBoundaries.length; monIndex += 1) {
        const post = events.find((event) => (
          event.kind === "factory-post-mon-end" && event.monIndex === monIndex
        ))!;
        const nextEntry = events.find((event) => (
          event.kind === "construction-entry" && event.monIndex === monIndex + 1
        ))!;
        const contained = pauses.filter(([entry, resume]) => (
          post.masterCycles <= entry && resume <= nextEntry.masterCycles
        ));
        const timing = value.sourceFunction === "CreateFrontierFactorySelectableMons"
          ? reduceFactoryOuterLoopTiming({
            sourceFunction: value.sourceFunction,
            nextMonIndex: monIndex + 1,
            selectableRentalRank: 0,
            selectableChallengeNum: 0,
          })
          : reduceFactoryOuterLoopTiming({
            sourceFunction: value.sourceFunction,
            nextMonIndex: monIndex + 1,
          });
        const source = sourceCycles(post, nextEntry, contained);

        expect(post.pc).toBe(`0x${(timing.startPc + 2).toString(16).padStart(8, "0")}`);
        expect(nextEntry.returnPc).toBe(
          `0x${(timing.nextCallerCallPc + 5).toString(16).padStart(8, "0")}`,
        );
        expect(nextEntry.pc).toBe(
          `0x${(timing.nextConstructionEntryPc + 2).toString(16).padStart(8, "0")}`,
        );
        measured.push(source);
        reduced.push(timing.cycles);
        containedPauses.push(contained.reduce((sum, [entry, resume]) => sum + resume - entry, 0));
        asynchronousService.push(source - timing.cycles);
      }

      measuredByCase.push(measured);
      sourceCyclesByCase.push(reduced);
      vblankPausesByCase.push(containedPauses);
      asynchronousServiceByCase.push(asynchronousService);
    }

    expect(measuredByCase).toEqual([
      [261, 261, 261, 279, 261],
      [130, 130],
      [130, 130],
    ]);
    expect(sourceCyclesByCase).toEqual([
      [261, 261, 261, 261, 261],
      [130, 130],
      [130, 130],
    ]);
    expect(vblankPausesByCase).toEqual([
      [0, 0, 0, 0, 0],
      [0, 0],
      [0, 0],
    ]);
    expect(asynchronousServiceByCase).toEqual([
      [0, 0, 0, 18, 0],
      [0, 0],
      [0, 0],
    ]);
  });

  it("pins all twelve complete EV-spread spans and the accepted-personality source boundary", () => {
    const expectedSourceCycles = [
      [40_410, 28_616, 26_672, 27_878, 28_148, 26_876],
      [27_080, 27_524, 28_190],
      [27_098, 38_673, 41_256],
    ];
    const expectedSpreads = [
      [37, 17, 17, 17, 3, 17],
      [5, 36, 17],
      [6, 37, 37],
    ];
    const expectedContainedPauses = [
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0],
      [0, 36_217, 0],
    ];

    for (const [caseIndex, { value }] of probes.entries()) {
      const events = value.cycleEvidence.events;
      const pauses = interruptPauses(events);
      const sourceCyclesByMon: number[] = [];
      const containedPausesByMon: number[] = [];

      for (const mon of value.monBoundaries) {
        const returned = events.find((event) => (
          event.kind === "create-mon-return" && event.monIndex === mon.monIndex
        ))!;
        const statsEntry = events.find((event) => (
          event.kind === "calculate-mon-stats-entry" && event.monIndex === mon.monIndex
        ))!;
        const contained = pauses.filter(([entry, resume]) => (
          returned.masterCycles <= entry && resume <= statsEntry.masterCycles
        ));
        sourceCyclesByMon.push(sourceCycles(returned, statsEntry, contained));
        containedPausesByMon.push(contained.reduce((sum, [entry, resume]) => (
          sum + resume - entry
        ), 0));
      }

      expect(sourceCyclesByMon).toEqual(expectedSourceCycles[caseIndex]);
      expect(containedPausesByMon).toEqual(expectedContainedPauses[caseIndex]);
    }

    // These source siblings cover two- and three-stat spreads at every bit
    // position used by the receipt. Repeated spread 17 is deliberately not a
    // duration key: SetBoxMonData calls GetSubstruct with the full accepted
    // personality, whose compiled __umodsi3(personality, 24) route differs.
    expect(probes.map(({ value }) => value.sourceSetIds.map((setId) => (
      frontierMons[setId]!.evSpread
    )))).toEqual(expectedSpreads);
    expect([...new Set(expectedSpreads.flatMap((spreads) => (
      spreads.flatMap((spread) => Array.from({ length: 6 }, (_, bit) => bit)
        .filter((bit) => (spread & (1 << bit)) !== 0))
    )))].sort()).toEqual([0, 1, 2, 4, 5]);
    expect(probes.map(({ value }) => value.monBoundaries.map((mon) => (
      mon.acceptedPersonality % 24
    )))).toEqual([
      [5, 19, 2, 2, 18, 20],
      [7, 20, 10],
      [6, 3, 18],
    ]);
  });

  it("replays every final source-return boundary from its compiled loop tail", () => {
    const measuredByCase: number[] = [];
    const vblankPausesByCase: number[] = [];
    const externalCyclesByCase: number[] = [];

    for (const { value } of probes) {
      const events = value.cycleEvidence.events;
      const finalPost = events.filter((event) => event.kind === "factory-post-mon-end").at(-1)!;
      const returned = events.find((event) => event.kind === "source-function-return")!;
      const pauses = interruptPauses(events).filter(([entry, resume]) => (
        finalPost.masterCycles <= entry && resume <= returned.masterCycles
      ));
      const timing = reduceFactorySourceReturnTiming(value.sourceFunction);
      const measured = sourceCycles(finalPost, returned, pauses);

      // mGBA exposes its pipelined Thumb PC two bytes beyond the instruction
      // executing at each probe boundary.
      expect(finalPost.pc).toBe(`0x${(timing.startPc + 2).toString(16).padStart(8, "0")}`);
      expect(returned.pc).toBe(`0x${(timing.callerResumePc + 2).toString(16).padStart(8, "0")}`);
      measuredByCase.push(measured);
      vblankPausesByCase.push(pauses.reduce((sum, [entry, resume]) => sum + resume - entry, 0));
      externalCyclesByCase.push(measured - timing.cycles);
    }

    expect(measuredByCase).toEqual([40, 32, 32]);
    expect(vblankPausesByCase).toEqual([0, 0, 0]);
    expect(externalCyclesByCase).toEqual([0, 0, 0]);
  });
});
