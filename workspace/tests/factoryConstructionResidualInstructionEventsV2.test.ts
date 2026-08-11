import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type QueueEvent = {
  name: string | null;
  priority: number | null;
  due: boolean;
  whenDelta: number;
};
type Edge = {
  instructionPc: string;
  nextInstructionPc: string;
  cycles: number;
  queueBefore: QueueEvent[];
  queueAfter: QueueEvent[];
};
type Increment = {
  instructionPc: string;
  nextInstructionPc: string;
  memberCycles: number;
  controlCycles: number | null;
  controlMatch: string;
  incrementCycles: number | null;
  eventName: string | null;
  crossedEventNames: string[];
  serviceCostClass: string | null;
  queueBefore: QueueEvent[];
  queueAfter: QueueEvent[];
  controlQueueBefore: QueueEvent[] | null;
};
type Member = {
  component: string;
  ordinal: number;
  entryPc: string;
  returnClass: string;
  increments: Increment[];
};
type ControlGroup = {
  component: string;
  returnClass: string;
  sampleCount: number;
  edges: Edge[];
};
type Receipt = {
  schema: string;
  case: string;
  oracleProfile: string;
  sourceFunction: string;
  memberCount: number;
  cleanControlCount: number;
  cleanControlGroupCount: number;
  members: Member[];
  cleanControls: ControlGroup[];
};

const CASES = ["anchor", "liliana", "factory-varied"] as const;
const ROOT = "tests/fixtures/factory-construction-residual-instruction-events-v2";
const FROZEN_V2 = "tests/fixtures/factory-construction-cycle-v2";
const FROZEN_HASHES = {
  anchor: "631bd21408ba41e03c0e119dde3d83d94dda023cee93ebc3e470e6d94741cc2a",
  liliana: "ae1282b74f74de6a85b8772adfbcd83028fad09f8aa3e3ecd518aafeab17b443",
  "factory-varied": "3e10197a34f4ea7a08a23bead04ae5b6113c653304722167095612a9b0626987",
} as const;

function readReceipt(name: typeof CASES[number]): { bytes: Buffer; value: Receipt } {
  const bytes = readFileSync(`${ROOT}/${name}.json.gz`);
  return { bytes, value: JSON.parse(gunzipSync(bytes).toString("utf8")) as Receipt };
}

function edgeKey(component: string, returnClass: string, edge: Pick<Edge, "instructionPc" | "nextInstructionPc">): string {
  return `${component}|${returnClass}|${edge.instructionPc}|${edge.nextInstructionPc}`;
}

describe("Issue #55 instruction/event classifier v2", () => {
  const packets = CASES.map((name) => ({ name, ...readReceipt(name) }));

  it("keeps the frozen construction v2 receipts byte-identical", () => {
    for (const name of CASES) {
      const bytes = readFileSync(`${FROZEN_V2}/${name}.json`);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(FROZEN_HASHES[name]);
    }
  });

  it("joins exactly 85 members and 488 clean controls", () => {
    expect(packets.map(({ value }) => value.memberCount)).toEqual([41, 19, 25]);
    expect(packets.map(({ value }) => value.cleanControlCount)).toEqual([229, 108, 151]);
    expect(packets.reduce((total, { value }) => total + value.memberCount, 0)).toBe(85);
    expect(packets.reduce((total, { value }) => total + value.cleanControlCount, 0)).toBe(488);

    const members = packets.flatMap(({ value }) => value.members);
    expect(members).toHaveLength(85);
    expect(members.reduce<Record<string, number>>((counts, member) => {
      counts[member.component] = (counts[member.component] ?? 0) + 1;
      return counts;
    }, {})).toEqual({
      "encrypted-accessor": 67,
      "get-nature": 2,
      "level-loop": 3,
      "nature-attempt": 11,
      "outer-factory-loop": 1,
      "signed-divide": 1,
    });
  });

  it("identifies Timer 0 for every member and pins its observed cost classes", () => {
    const members = packets.flatMap(({ value }) => value.members);
    const increments = members.flatMap((member) => member.increments);
    expect(increments).toHaveLength(85);
    expect(members.every((member) => member.increments.length === 1)).toBe(true);
    expect(new Set(increments.map((increment) => increment.eventName))).toEqual(new Set(["GBA Timer 0"]));
    expect(increments.every((increment) => increment.crossedEventNames.includes("GBA Timer 0"))).toBe(true);
    expect(increments.every((increment) => increment.serviceCostClass !== null)).toBe(true);

    const costHistogram = increments.reduce<Record<string, number>>((counts, increment) => {
      const key = increment.serviceCostClass!;
      counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    }, {});
    expect(costHistogram).toEqual({
      "gba-timer-0-m4a-sample": 66,
      "gba-timer-0-m4a-sample+co-due:GBA Video": 16,
      "gba-timer-0-m4a-sample+co-due:GBA Audio Sample": 2,
      "gba-timer-0-m4a-sample+co-due:GBA Video+GBA Audio Sample": 1,
    });
  });

  it("uses observed clean edges where available and records the two cross-epoch path exceptions", () => {
    const cleanEdges = new Map<string, Edge>();
    for (const { value } of packets) {
      for (const group of value.cleanControls) {
        for (const edge of group.edges) {
          const key = edgeKey(group.component, group.returnClass, edge);
          const previous = cleanEdges.get(key);
          if (previous === undefined || edge.cycles < previous.cycles) cleanEdges.set(key, edge);
        }
      }
    }

    const rows = packets.flatMap(({ name, value }) => value.members.flatMap((member) => (
      member.increments.map((increment) => ({ name, member, increment }))
    )));
    const unmatched = rows.filter(({ member, increment }) => (
      !cleanEdges.has(edgeKey(member.component, member.returnClass, increment))
    ));
    expect(unmatched.map(({ name, member, increment }) => [
      name, member.returnClass, increment.instructionPc, increment.nextInstructionPc,
    ])).toEqual([
      ["anchor", "0x0806a51a->0x08068dca", "0x082e7c94", "0x0806a282"],
      ["liliana", "0x0806a51a->0x08068d9a", "0x082e7c90", "0x082e7c92"],
    ]);
    expect(unmatched.every(({ increment }) => (
      increment.controlMatch === "no-identical-clean-edge-in-return-class"
      && increment.controlCycles === null
      && increment.eventName === "GBA Timer 0"
      && increment.crossedEventNames.includes("GBA Timer 0")
    ))).toBe(true);

    const matched = rows.filter(({ member, increment }) => (
      cleanEdges.has(edgeKey(member.component, member.returnClass, increment))
    ));
    expect(matched).toHaveLength(83);
    for (const { member, increment } of matched) {
      const clean = cleanEdges.get(edgeKey(member.component, member.returnClass, increment))!;
      expect(increment.memberCycles - clean.cycles).toBe(18);
    }
  });

  it("retains only relative queue evidence and no absolute/pointer fields", () => {
    const serialized = JSON.stringify(packets.map(({ value }) => value));
    expect(serialized).not.toMatch(/masterCycles|globalCycles|cpuCycles|when\"\s*:/);
    for (const { value } of packets) {
      for (const member of value.members) {
        for (const increment of member.increments) {
          expect(increment.queueBefore.every((event) => Number.isInteger(event.whenDelta))).toBe(true);
          expect(increment.queueAfter.every((event) => Number.isInteger(event.whenDelta))).toBe(true);
          expect(increment.queueBefore.some((event) => event.name === "GBA Timer 0" && event.due)).toBe(true);
        }
      }
    }
  });
});
