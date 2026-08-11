import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = "tests/fixtures/factory-m4a-mixer-entry-provenance-v2";
const HASHES = {
  anchor: "afcb80344d7a2e8475b22a1bb2d2f65b8ae337c358c7b88608460faad6c4dab2",
  liliana: "b5cda91156fb1264e03e8729c83bd845121dc3371fddacb9648e3de5eebd516e",
} as const;
const EVIDENCE = "tests/fixtures/factory-m4a-mixer-entry-provenance-evidence-v2.json";
const DOC = "docs/issue55-m4a-mixer-entry-provenance-v2.md";

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

describe("Factory MPlay mixer-entry provenance v2", () => {
  it("pins two byte-identical address-free source-route captures per replacement-bearing receipt", () => {
    for (const [name, expectedHash] of Object.entries(HASHES)) {
      const bytes = readFileSync(`${ROOT}/${name}.json`);
      const receipt = JSON.parse(bytes.toString("utf8")) as {
        schema: string;
        case: string;
        oracleProfile: string;
        addressFree: boolean;
        classificationOnly: boolean;
        observations: Array<{ replacements: Array<{ route: string; wave: { waveSymbol: string; payloadSha256: string }; inlineAncestry: null | { plyXwaveCommandU32Ancestry: boolean } }> }>;
      };
      expect(sha256(bytes)).toBe(expectedHash);
      expect(bytes.toString("utf8")).toBe(`${JSON.stringify(receipt, null, 2)}\n`);
      expect(receipt).toMatchObject({ schema: "factory-m4a-mixer-entry-provenance/v2", case: name, oracleProfile: "battle-scene-off", addressFree: true, classificationOnly: true });
      expect(receipt.observations).toHaveLength(5);
      expect(receipt.observations.flatMap(({ replacements }) => replacements)).toHaveLength(name === "anchor" ? 7 : 6);
      for (const replacement of receipt.observations.flatMap(({ replacements }) => replacements)) {
        expect(replacement.route).toMatch(/^mplay\.ply-note\.(inline|keysplit|rhythm)-tone-wave$/);
        expect(replacement.wave.waveSymbol).toMatch(/^DirectSoundWaveData_/);
        expect(replacement.wave.payloadSha256).toMatch(/^[0-9a-f]{64}$/);
        if (replacement.route === "mplay.ply-note.inline-tone-wave") {
          expect(replacement.inlineAncestry).toMatchObject({ plyXwaveCommandU32Ancestry: false });
        } else expect(replacement.inlineAncestry).toBeNull();
      }
      const keys = new Set(walkKeys(receipt));
      for (const forbidden of ["frame", "tick", "cursor", "rngValue", "address", "pointer", "masterCycles", "duration", "cycles"]) {
        expect(keys.has(forbidden)).toBe(false);
      }
    }
  });

  it("joins and classifies exactly the 13 frozen replacements with no ambiguity", () => {
    const evidence = JSON.parse(readFileSync(EVIDENCE, "utf8")) as {
      schema: string;
      frozenInputs: Record<string, unknown>;
      sourceAndElf: { sources: unknown[]; symbols: unknown[]; instructions: unknown[] };
      mechanicalJoin: Record<string, unknown>;
      coverage: { routes: Record<string, number>; inlinePlyXwaveCommandU32Ancestry: Record<string, number>; runtimeTargetProvenanceComplete: boolean };
      classifiedTargets: Array<{ sourceStateDigest: string; entryTargetStateDigest: string; channelIndex: number }>;
      closure: Record<string, unknown>;
    };
    expect(evidence.schema).toBe("factory-m4a-mixer-entry-provenance-evidence/v2");
    expect(evidence.frozenInputs).toMatchObject({
      entryEvidenceV1: "81635d80696ae102fc67cf5fc670fe37fcb3924942ac0f702632d113229f40a6",
      targetAuditV1: "3817b1ab6c0e3e488619e3827cfede5d5a3fa82e038dd551e173c6af0effa04e",
    });
    expect(evidence.sourceAndElf.sources).toHaveLength(3);
    expect(evidence.sourceAndElf.symbols).toHaveLength(3);
    expect(evidence.sourceAndElf.instructions).toHaveLength(6);
    expect(evidence.mechanicalJoin).toEqual({
      keys: ["sourceStateDigest", "entryTargetStateDigest", "channelIndex"],
      frozenEntryObservations: 113,
      frozenEntryTargets: 565,
      frozenReplacedTargets: 13,
      classifiedTargets: 13,
      ambiguousJoins: 0,
    });
    expect(evidence.coverage).toEqual({
      routes: {
        "mplay.ply-note.inline-tone-wave": 6,
        "mplay.ply-note.keysplit-tone-wave": 0,
        "mplay.ply-note.rhythm-tone-wave": 7,
      },
      inlinePlyXwaveCommandU32Ancestry: { true: 0, false: 6 },
      runtimeTargetProvenanceComplete: true,
    });
    const unique = new Set(evidence.classifiedTargets.map((row) => `${row.sourceStateDigest}:${row.entryTargetStateDigest}:${row.channelIndex}`));
    expect(unique.size).toBe(13);
    expect(evidence.closure).toMatchObject({ exactMissingMutableRouteField: null, durationLicensed: false, constructionClockLicensed: false });
    const keys = new Set(walkKeys(evidence.classifiedTargets));
    for (const forbidden of ["case", "frame", "tick", "cursor", "rngValue", "address", "pointer", "masterCycles", "duration", "cycles"]) {
      expect(keys.has(forbidden)).toBe(false);
    }
  });

  it("rebuilds the v2 evidence and report byte-for-byte", () => {
    const output = mkdtempSync(join(tmpdir(), "pokebench-m4a-mixer-provenance-"));
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/report/factory-m4a-mixer-entry-provenance-v2.ts", "--out-dir", output]);
    expect(readFileSync(join(output, "factory-m4a-mixer-entry-provenance-evidence-v2.json"))).toEqual(readFileSync(EVIDENCE));
    expect(readFileSync(join(output, "issue55-m4a-mixer-entry-provenance-v2.md"))).toEqual(readFileSync(DOC));
  });
});
