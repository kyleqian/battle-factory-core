import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  MPLAY_CALLBACK_PATHS,
  MPLAY_CALLBACK_TABLES,
  MPLAY_JUMP_TARGETS,
  MPLAY_REMAINING_RESIDUALS,
  SOURCE_REFERENCES,
  XCMD_TARGETS,
  assertSourceAnchors,
  loadCompactPackets,
  loadReproducibility,
} from "../tools/report/factory-m4a-mplay-callback-v2.ts";

type Packet = {
  schema: string;
  case: string;
  oracleProfile: string;
  sourceStateReference: { packetSchema: string; digestKey: string };
  mplayCallback: { component: { dispatchTables: { gMPlayJumpTable: { slots: number; targets: string[] }; gXcmdTable: { slots: number; targets: string[] } }; paths: Array<{ id: string; reads: string[]; source: string }>; coverage: { complete: boolean; sourceGeneral: boolean; expectedPathIds: string[]; observedPathIds: string[]; expectedTargetIds: string[]; observedTargetIds: string[] } }; componentDigest: string };
  residualDereferences: Array<Record<string, string>>;
  observations: Array<{ sourceStateDigest: string; m4aCost: number }>;
};

const ROOT = "tests/fixtures/factory-m4a-mplay-callback-v2";
const CASES = ["anchor", "liliana", "factory-varied"] as const;
const COUNTS = { anchor: 52, liliana: 31, "factory-varied": 30 } as const;
const HASHES = {
  anchor: "e7d8d162d18541f408380fc1963a1bd16fda5bb4c7b1a1d76562be733185b66e",
  liliana: "7220967d2a9f394dfb6aa6400cd9537706e8d0ac0bd22d82eb147547991fcff9",
  "factory-varied": "5495157a1382d16f862c5de84e8957bfaf382068197992f68737b215f08e203c",
} as const;

function sha256(bytes: Buffer): string { return createHash("sha256").update(bytes).digest("hex"); }

describe("Issue #55 sixth-MPlayMain callback/read compact evidence", () => {
  it("pins source/ELF anchors, every dispatch slot, and every callback path", () => {
    expect(() => assertSourceAnchors()).not.toThrow();
    expect(MPLAY_JUMP_TARGETS).toHaveLength(36);
    expect(XCMD_TARGETS).toHaveLength(14);
    expect(MPLAY_CALLBACK_PATHS).toHaveLength(50);
    expect(new Set(MPLAY_CALLBACK_PATHS.map((path) => path.id)).size).toBe(50);
    expect(MPLAY_CALLBACK_TABLES).toEqual({
      gMPlayJumpTableTemplate: { bytes: 144, sha256: "5b7ed978ec28ff48f43439dc8ca03166d48915f9e1bfbec26b23682f14f09c14" },
      gXcmdTable: { bytes: 56, sha256: "f3dd8203ce3a7fe85ae8c6df7e0125dfbc1028137e7188d06fc480760c5e5402" },
      gClockTable: { bytes: 49, sha256: "952d81c712713fc630d9d622d5f79eec8189f2a4cf05a78442857b635f0d23f8" },
    });
    expect(SOURCE_REFERENCES.map((reference) => reference.source)).toContain("reference/pokeemerald/src/m4a_tables.c");
    expect(MPLAY_CALLBACK_PATHS.every((path) => path.source.length > 0 && path.reads.length > 0)).toBe(true);
  });

  it("keeps packets compact, address-free, and exactly joined to v3 stateDigest/cost", () => {
    let total = 0;
    const componentDigests = new Set<string>();
    for (const name of CASES) {
      const bytes = readFileSync(`${ROOT}/${name}.json`);
      const packet = JSON.parse(bytes.toString("utf8")) as Packet;
      expect(packet.schema).toBe("factory-m4a-mplay-callback-probe/v2");
      expect(packet.case).toBe(name);
      expect(packet.oracleProfile).toBe("battle-scene-off");
      expect(packet.sourceStateReference).toEqual({ packetSchema: "factory-m4a-source-state-probe/v3", digestKey: "sourceSemanticState.stateDigest" });
      expect(packet.observations).toHaveLength(COUNTS[name]);
      expect(new Set(packet.observations.map((row) => row.sourceStateDigest)).size).toBe(COUNTS[name]);
      expect(packet.mplayCallback.component.dispatchTables.gMPlayJumpTable).toEqual({ slots: 36, targets: [...MPLAY_JUMP_TARGETS] });
      expect(packet.mplayCallback.component.dispatchTables.gXcmdTable).toEqual({ slots: 14, targets: [...XCMD_TARGETS] });
      expect(packet.mplayCallback.component.paths.map((path) => path.id)).toEqual(MPLAY_CALLBACK_PATHS.map((path) => path.id));
      expect(packet.mplayCallback.component.coverage.complete).toBe(true);
      expect(packet.mplayCallback.component.coverage.sourceGeneral).toBe(true);
      expect(packet.mplayCallback.component.coverage.expectedPathIds).toEqual(packet.mplayCallback.component.coverage.observedPathIds);
      expect(packet.mplayCallback.component.coverage.expectedTargetIds).toEqual(packet.mplayCallback.component.coverage.observedTargetIds);
      expect(packet.residualDereferences).toEqual(MPLAY_REMAINING_RESIDUALS);
      expect(bytes.toString("utf8")).toBe(JSON.stringify(packet, null, 2) + "\n");
      expect(bytes.toString("utf8")).not.toContain("\"sourceSemanticState\":");
      expect(bytes.toString("utf8")).not.toContain("\"stages\":");
      for (const forbidden of ["\"frame\":", "\"tick\":", "\"rngValue\":", "\"caseDuration\":", "\"durationKey\":", "\"address\":", "\"pointer\":"]) expect(bytes.toString("utf8")).not.toContain(forbidden);
      expect(bytes.length).toBeLessThan(100_000);
      componentDigests.add(packet.mplayCallback.componentDigest);
      total += packet.observations.length;
    }
    expect(total).toBe(113);
    expect(componentDigests).toEqual(new Set(["bfacdda5b552bd322fb88e18c20d0af4c54fdf8713d3ec0622810115202d87b8"]));
  });

  it("pins two fresh Scene-OFF joins per case", () => {
    const packets = loadCompactPackets();
    const repro = loadReproducibility(packets);
    expect(repro.freshRunsPerCase).toBe(2);
    expect(repro.cases).toHaveLength(3);
    for (const name of CASES) {
      const row = repro.cases.find((candidate) => candidate.case === name);
      expect(row).toBeDefined();
      expect(row!.byteIdentical).toBe(true);
      expect(row!.firstFreshSha256).toBe(HASHES[name]);
      expect(row!.secondFreshSha256).toBe(HASHES[name]);
      expect(sha256(readFileSync(`${ROOT}/${name}.json`))).toBe(HASHES[name]);
    }
    expect(packets.flatMap((packet) => packet.observations)).toHaveLength(113);
    expect(repro.schema).toBe("factory-m4a-mplay-callback-repro/v2");
  });
});
