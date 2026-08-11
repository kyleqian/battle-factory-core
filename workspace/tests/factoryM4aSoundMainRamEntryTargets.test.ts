import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = "tests/fixtures/factory-m4a-soundmainram-entry-targets-v1";
const HASHES = {
  anchor: "6b29d708051e0d4422d8f6527e7bd61ffb6bfa408957c017b89b7f2a3c409e1f",
  liliana: "780e332632da2fd024c032a831710c1b8b609d627132836612958546d87fdcf1",
  "factory-varied": "202f18b6d1877ecac55685e51e4f62ec650e2091cb26912ba362efff2c658ad9",
} as const;
const EVIDENCE = "tests/fixtures/factory-m4a-soundmainram-entry-target-evidence-v1.json";
const DOC = "docs/issue55-m4a-soundmainram-entry-targets-v1.md";

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}
function walkKeys(value: unknown, keys: string[] = []): string[] {
  if (Array.isArray(value)) value.forEach((item) => walkKeys(item, keys));
  else if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      keys.push(key);
      walkKeys(child, keys);
    }
  }
  return keys;
}

describe("Factory SoundMainRAM mixer-entry target receipt v1", () => {
  it("pins twice-fresh address-free compact packets at the actual entry hook", () => {
    for (const [name, expectedHash] of Object.entries(HASHES)) {
      const bytes = readFileSync(`${ROOT}/${name}.json`);
      const receipt = JSON.parse(bytes.toString("utf8")) as {
        schema: string;
        case: string;
        oracleProfile: string;
        captureBoundary: string;
        addressFree: boolean;
        durationReducer: boolean;
        observations: Array<{
          sourceStateDigest: string;
          m4aSoundMainCycles: number;
          entryTargetStateDigest: string;
          soundMainRamEntryTargets: Array<{
            channelIndex: number;
            currentRelation: { route: string; inWaveData: boolean; regionComplete: boolean };
            wave: null | {
              sampleRegion: { complete: boolean };
              physicalSampleRegion: { complete: boolean };
              directWaveTargetDescriptor: { storageRole: string; waveAlignmentMod4: number; physicalPayloadBytes: number | null; requiredGuardBytes: number; availableGuardBytes: number | null };
            };
          }>;
        }>;
      };
      expect(sha256(bytes)).toBe(expectedHash);
      expect(bytes.toString("utf8")).toBe(`${JSON.stringify(receipt, null, 2)}\n`);
      expect(receipt).toMatchObject({ schema: "factory-m4a-soundmainram-entry-targets/v1", case: name, oracleProfile: "battle-scene-off", captureBoundary: "sound-main-ram-entry", addressFree: true, durationReducer: false });
      expect(receipt.observations).toHaveLength(name === "anchor" ? 52 : name === "liliana" ? 31 : 30);
      for (const observation of receipt.observations) {
        expect(observation.sourceStateDigest).toMatch(/^[0-9a-f]{64}$/);
        expect(observation.entryTargetStateDigest).toMatch(/^[0-9a-f]{64}$/);
        expect(observation.m4aSoundMainCycles).toBeGreaterThan(0);
        expect(observation.soundMainRamEntryTargets.map(({ channelIndex }) => channelIndex)).toEqual([0, 1, 2, 3, 4]);
        for (const target of observation.soundMainRamEntryTargets) {
          expect(target.wave).not.toBeNull();
          expect(target.wave?.sampleRegion.complete).toBe(true);
          expect(target.wave?.physicalSampleRegion.complete).toBe(true);
          expect(target.wave?.directWaveTargetDescriptor).toMatchObject({ storageRole: "gamepak-ws0", waveAlignmentMod4: 0 });
          expect(target.wave!.directWaveTargetDescriptor.physicalPayloadBytes).not.toBeNull();
          expect(target.wave!.directWaveTargetDescriptor.availableGuardBytes!).toBeGreaterThanOrEqual(target.wave!.directWaveTargetDescriptor.requiredGuardBytes);
          if (target.currentRelation.route !== "not-read-channel-off") {
            expect(target.currentRelation).toMatchObject({ inWaveData: true, regionComplete: true });
          }
        }
      }
      const keys = new Set(walkKeys(receipt));
      for (const forbidden of ["frame", "tick", "cursor", "rngValue", "address", "pointer", "masterCycles", "duration"]) {
        expect(keys.has(forbidden)).toBe(false);
      }
    }
  });

  it("joins all 113 observations and 565 entry targets to frozen v3 plus the 13-branch/4-rule audit", () => {
    const evidence = JSON.parse(readFileSync(EVIDENCE, "utf8")) as {
      schema: string;
      reproducibility: Record<string, unknown>;
      frozenInputs: Record<string, unknown>;
      mechanicalJoin: Record<string, unknown>;
      coverage: Record<string, unknown>;
      closure: Record<string, unknown>;
    };
    expect(evidence.schema).toBe("factory-m4a-soundmainram-entry-target-evidence/v1");
    expect(evidence.reproducibility).toMatchObject({ freshRunsPerCase: 2, byteIdenticalCases: 3 });
    expect(evidence.frozenInputs).toMatchObject({ soundMainRamTargetAuditV1Sha256: "3817b1ab6c0e3e488619e3827cfede5d5a3fa82e038dd551e173c6af0effa04e" });
    expect(evidence.mechanicalJoin).toEqual({ key: "sourceStateDigest", costField: "m4aSoundMainCycles", exactDigestCostJoins: 113, unequalCosts: 0, pointerProducingBranches: 13, sampleReadRules: 4 });
    expect(evidence.coverage).toMatchObject({
      observations: 113,
      selectedChannels: 565,
      active: 462,
      inactive: 103,
      start: 42,
      persistedCurrent: 420,
      fixed: 310,
      linear: 255,
      completeLogicalRegions: 565,
      completePhysicalRegions: 565,
      aligned: 565,
      completeActiveCurrentRelations: 462,
      completeRequiredGuards: 565,
      targetProducingRoutes: { "pre-mplay-persisted": 552, "mplay-replaced-before-entry-unclassified-tone-route": 13 },
      actualSoundMainRamEntryTargetCoverage: true,
      runtimeTargetSafetyComplete: true,
      runtimeTargetProvenanceComplete: false,
    });
    expect(evidence.closure).toMatchObject({ durationLicensed: false, constructionClockLicensed: false });
    expect(String(evidence.closure.exactMissingMutableRouteField)).toContain("13 targetProducingRoute");
    expect(String(evidence.closure.exactMissingMutableRouteField)).toContain("ply_xwave.command-u32");
  });

  it("rebuilds the derived evidence and document byte-for-byte", () => {
    const output = mkdtempSync(join(tmpdir(), "pokebench-m4a-entry-target-report-"));
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/report/factory-m4a-soundmainram-entry-targets-v1.ts", "--out-dir", output]);
    expect(readFileSync(join(output, "factory-m4a-soundmainram-entry-target-evidence-v1.json"))).toEqual(readFileSync(EVIDENCE));
    expect(readFileSync(join(output, "issue55-m4a-soundmainram-entry-targets-v1.md"))).toEqual(readFileSync(DOC));
  });
});
