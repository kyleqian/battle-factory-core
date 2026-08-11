import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type TimerEvent = {
  name: string;
  priority: number;
  whenDelta: number;
  due: boolean;
};

type Boundary = {
  kind: string;
  pc: string;
  monIndex: number | null;
  attempt: number | null;
  half: "low" | "high" | null;
  globalCycles: number;
  cpuCycles: number;
  masterCycles: number;
  tm0cntL: number;
  tm0cntH: number;
  event: TimerEvent | null;
};

type Receipt = {
  schema: string;
  case: string;
  oracleProfile: string;
  sourceFunction: string;
  frameCycles: number;
  constructionClockEntryPhase: number;
  firstDueRelativeMasterCycles: number | null;
  boundaries: Boundary[];
};

const ROOT = "tests/fixtures/factory-construction-timer0-cadence-v1";
const CASES = ["anchor", "liliana", "factory-varied"] as const;
const EXPECTED = {
  anchor: {
    sha256: "89b8e8310de0bf88826befb5f50bc7020bd927a95883ce4ede11ec1ee0510368",
    entryPhase: 90_931,
    firstDue: 276,
    boundaries: 407,
  },
  liliana: {
    sha256: "a6f6ea437379e79cfd80680415c6c1c9dd445e9711cba314d64a228163bd3a82",
    entryPhase: 256_332,
    firstDue: 403,
    boundaries: 191,
  },
  "factory-varied": {
    sha256: "fa660a9cdd05b1ec2df579c3d70608737a10d632652cd6b4282c925adc653d3f",
    entryPhase: 248_066,
    firstDue: 1_145,
    boundaries: 326,
  },
} as const;

function readReceipt(name: typeof CASES[number]): { bytes: Buffer; value: Receipt } {
  const bytes = readFileSync(`${ROOT}/${name}.json`);
  return { bytes, value: JSON.parse(bytes.toString("utf8")) as Receipt };
}

function dueTimes(receipt: Receipt): number[] {
  return receipt.boundaries.flatMap((boundary) => (
    boundary.event === null ? [] : [boundary.masterCycles + boundary.event.whenDelta]
  ));
}

describe("Issue #55 Timer 0 cadence receipt", () => {
  const packets = CASES.map((name) => ({ name, ...readReceipt(name) }));

  it("keeps fresh wrapper-mediated OFF packets canonical and compact", () => {
    for (const { name, bytes, value } of packets) {
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(EXPECTED[name].sha256);
      expect(bytes.toString("utf8")).toBe(`${JSON.stringify(value, null, 2)}\n`);
      expect(value.schema).toBe("factory-construction-timer0-cadence/v1");
      expect(value.oracleProfile).toBe("battle-scene-off");
      expect(value.frameCycles).toBe(280_896);
      expect(value.boundaries).toHaveLength(EXPECTED[name].boundaries);
      expect(value.constructionClockEntryPhase).toBe(EXPECTED[name].entryPhase);
      expect(value.firstDueRelativeMasterCycles).toBe(EXPECTED[name].firstDue);
      expect(JSON.stringify(value)).not.toMatch(/"when"\s*:/);
    }
  });

  it("pins source registers, queue identity, priority, and global-plus-CPU time", () => {
    for (const { value } of packets) {
      expect(value.boundaries.every((boundary) => (
        boundary.masterCycles === boundary.globalCycles + boundary.cpuCycles
        && boundary.tm0cntL === 0xfb1a
        && boundary.tm0cntH === 0x0080
        && boundary.event !== null
        && boundary.event.name === "GBA Timer 0"
        && boundary.event.priority === 32
        && boundary.event.due === (boundary.event.whenDelta <= 0)
      ))).toBe(true);
      expect(value.boundaries[0]!.kind).toBe("source-function-entry");
      expect(value.boundaries.at(-1)!.kind).toBe("source-function-return");
      expect(value.boundaries.some((boundary) => boundary.kind === "construction-entry")).toBe(true);
      expect(value.boundaries.some((boundary) => boundary.kind === "factory-post-mon-end")).toBe(true);
      expect(value.boundaries.some((boundary) => boundary.kind.startsWith("vblank"))).toBe(false);
    }
  });

  it("shows a 1,254-cycle recurrence while retaining an explicit unknown entry phase", () => {
    const firstDue = packets.map(({ value }) => value.firstDueRelativeMasterCycles);
    expect(firstDue).toEqual([276, 403, 1_145]);
    expect(new Set(firstDue).size).toBe(3);

    for (const { value } of packets) {
      const uniqueDueTimes = [...new Set(dueTimes(value))];
      expect(uniqueDueTimes.length).toBeGreaterThan(1);
      for (const [index, due] of uniqueDueTimes.entries()) {
        if (index === 0) continue;
        const difference = due - uniqueDueTimes[index - 1]!;
        expect(difference).toBeGreaterThan(0);
        expect(difference % 1_254).toBe(0);
      }
    }
  });
});
