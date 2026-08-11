import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CGB_CALLBACK_PATHS,
  CGB_CALLBACK_RESIDUALS,
  CGB_CALLBACK_TABLES,
  SOURCE_REFERENCES,
  assertSourceAnchors,
  loadCompactPackets,
  loadReproducibility,
} from "../tools/report/factory-m4a-cgb-callback-v2.ts";

type CompactPacket = {
  schema: string;
  case: string;
  oracleProfile: string;
  sourceStateReference: { packetSchema: string; digestKey: string };
  cgbCallback: {
    component: {
      paths: Array<{ id: string }>;
      coverage: { complete: boolean; expectedPathIds: string[]; observedPathIds: string[]; sourceGeneral: boolean };
    };
    componentDigest: string;
  };
  residualDereferences: Array<Record<string, string>>;
  observations: Array<{ sourceStateDigest: string; m4aCost: number }>;
};
type V3Receipt = {
  schema: string;
  case: string;
  oracleProfile: string;
  interrupts: Array<{
    m4a: {
      state: { sourceSemanticState: { stateDigest: string } };
      stages: Array<{ kind: string; cyclesSinceM4aEntry: number }>;
    };
  }>;
};

const ROOT = "tests/fixtures/factory-m4a-cgb-callback-v2";
const V3_ROOT = "tests/fixtures/factory-m4a-source-state-v3";
const CASES = ["anchor", "liliana", "factory-varied"] as const;
const EXPECTED_OBSERVATIONS = { anchor: 52, liliana: 31, "factory-varied": 30 } as const;
const EXPECTED_COMPONENT_DIGEST = "aa3af5c7638c9d233164feccf2f1e7b1a7d4eb16fe6c1a19370e22f49839af62";
const EXPECTED_HASHES: ReadonlyArray<readonly [string, string]> = [
  ["anchor", "7172eee8739faa176d389f50672eb7f0127964f290a98e32c1a059a0b7b1b6b2"],
  ["liliana", "46ac14714f6eb54e78c059164cbb9e3f7831f59f3b1eed98aa295dc0b64a866a"],
  ["factory-varied", "96a9978df209fe31e7176bd4f8983f00bfc21617db13d85408b77a42eb0ee0ff"],
];

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}
function v3Cost(observation: V3Receipt["interrupts"][number]): number {
  const call = observation.m4a.stages.find((stage) => stage.kind === "m4a-sound-main-call");
  const returned = observation.m4a.stages.find((stage) => stage.kind === "m4a-sound-main-return");
  expect(call).toBeDefined();
  expect(returned).toBeDefined();
  return returned!.cyclesSinceM4aEntry - call!.cyclesSinceM4aEntry;
}

describe("Issue #55 compact CgbSound callback/read evidence", () => {
  it("keeps source/ELF anchors, all 11 selected paths, and all fixed table bytes/digests live", () => {
    expect(() => assertSourceAnchors()).not.toThrow();
    expect(CGB_CALLBACK_PATHS).toHaveLength(11);
    expect(new Set(CGB_CALLBACK_PATHS.map((path) => path.id)).size).toBe(11);
    expect(CGB_CALLBACK_PATHS.filter((path) => path.target === "CgbOscOff")).toHaveLength(4);
    expect(CGB_CALLBACK_PATHS.filter((path) => path.target === "MidiKeyToCgbFreq")).toHaveLength(6);
    expect(CGB_CALLBACK_TABLES).toEqual({
      gCgb3Vol: { bytes: 16, sha256: "86480498f3bc57863a295f2c9a9752be09fd91cb28c998650fa2b7ae3bdefd24" },
      gCgbScaleTable: { bytes: 132, sha256: "2ab14116232b5768777f67dd371a380bd88fdc97858aa050306b132d05faa03e" },
      gCgbFreqTable: { bytes: 24, sha256: "34e0ae7c2f912add79c2e61ed8347ff085000bc39f0173883ccbaff150205ee5" },
      gNoiseTable: { bytes: 60, sha256: "197f0679262884d48dd459dcfe690c0a41e8a73cf76cb62838119fc9cb0e7ab6" },
    });
    expect(SOURCE_REFERENCES.map((reference) => reference.source)).toContain("reference/pokeemerald/src/m4a_tables.c");
  });

  it("stores a compact additive receipt that exactly joins the committed v3 receipt without copying its graph", () => {
    let total = 0;
    const componentDigests = new Set<string>();
    for (const name of CASES) {
      const bytes = readFileSync(ROOT + "/" + name + ".json");
      const text = bytes.toString("utf8");
      const compact = JSON.parse(text) as CompactPacket;
      const v3 = JSON.parse(readFileSync(V3_ROOT + "/" + name + ".json", "utf8")) as V3Receipt;
      expect(compact.schema).toBe("factory-m4a-cgb-callback-probe/v2");
      expect(compact.case).toBe(name);
      expect(compact.oracleProfile).toBe("battle-scene-off");
      expect(compact.sourceStateReference).toEqual({
        packetSchema: "factory-m4a-source-state-probe/v3",
        digestKey: "sourceSemanticState.stateDigest",
      });
      expect(compact.observations).toHaveLength(EXPECTED_OBSERVATIONS[name]);
      expect(new Set(compact.observations.map((row) => row.sourceStateDigest)).size).toBe(EXPECTED_OBSERVATIONS[name]);
      expect(compact.cgbCallback.component.coverage).toEqual({ complete: true, expectedPathIds: CGB_CALLBACK_PATHS.map((path) => path.id), observedPathIds: CGB_CALLBACK_PATHS.map((path) => path.id), sourceGeneral: true });
      expect(compact.cgbCallback.component.paths.map((path) => path.id)).toEqual(CGB_CALLBACK_PATHS.map((path) => path.id));
      expect(compact.residualDereferences).toEqual(CGB_CALLBACK_RESIDUALS);
      expect(v3.schema).toBe("factory-m4a-source-state-probe/v3");
      expect(v3.case).toBe(name);
      expect(v3.oracleProfile).toBe("battle-scene-off");
      const v3ByDigest = new Map(v3.interrupts.map((row) => [row.m4a.state.sourceSemanticState.stateDigest, v3Cost(row)]));
      expect(v3ByDigest.size).toBe(compact.observations.length);
      for (const row of compact.observations) {
        expect(v3ByDigest.get(row.sourceStateDigest)).toBe(row.m4aCost);
      }
      expect(statSync(ROOT + "/" + name + ".json").size).toBeLessThan(1_048_576);
      expect(text).toBe(JSON.stringify(compact, null, 2) + "\n");
      expect(text).not.toContain("\"sourceSemanticState\":");
      expect(text).not.toContain("\"stages\":");
      for (const forbidden of ["\"frame\":", "\"tick\":", "\"rngValue\":", "\"trainerId\":", "\"setIds\":", "\"monIndex\":", "\"address\":", "\"pointer\":", "\"durationKey\":"]) {
        expect(text).not.toContain(forbidden);
      }
      componentDigests.add(compact.cgbCallback.componentDigest);
      total += compact.observations.length;
    }
    expect(total).toBe(113);
    expect(componentDigests).toEqual(new Set([EXPECTED_COMPONENT_DIGEST]));
  });

  it("pins two independently fresh compact packets per case and all 113 equal-state/equal-cost pairs", () => {
    const packets = loadCompactPackets();
    const repro = loadReproducibility(packets);
    expect(repro.freshRunsPerCase).toBe(2);
    expect(repro.cases).toHaveLength(3);
    for (const [name, expectedHash] of EXPECTED_HASHES) {
      const bytes = readFileSync(ROOT + "/" + name + ".json");
      expect(sha256(bytes)).toBe(expectedHash);
      const row = repro.cases.find((candidate) => candidate.case === name);
      expect(row).toBeDefined();
      expect(row!.byteIdentical).toBe(true);
      expect(row!.firstFreshSha256).toBe(expectedHash);
      expect(row!.secondFreshSha256).toBe(expectedHash);
    }
    expect(packets.flatMap((packet) => packet.observations)).toHaveLength(113);
  });
});
