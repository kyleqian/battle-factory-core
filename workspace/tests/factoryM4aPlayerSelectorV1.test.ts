import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { makeEvidence } from "../tools/report/factory-m4a-player-selector-v1.ts";

const HASHES = {
  anchor: "35fe3e32eb893ef7601cc74a15b1f7b5cdf74675f4c5e9397d71acc60343649d",
  liliana: "4dbb8aba89d6621513deddb94d7b627e19f4a20578090d8ac22a894a0827ef4c",
  "factory-varied": "1e77d4654401096f62f51d4fbe7fdd1e5760491b3cdbf09e252866c1de05cde7",
} as const;
const sha256 = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

function keys(value: unknown, result: string[] = []): string[] {
  if (Array.isArray(value)) value.forEach((item) => keys(item, result));
  else if (value && typeof value === "object") Object.entries(value).forEach(([key, child]) => { result.push(key); keys(child, result); });
  return result;
}

describe("Factory sixth-MPlayMain player selector v1", () => {
  it("pins two-fresh compact packets and normalized scalar fields", () => {
    for (const [name, hash] of Object.entries(HASHES)) {
      const bytes = readFileSync(`tests/fixtures/factory-m4a-player-selector-v1/${name}.json`);
      const packet = JSON.parse(bytes.toString("utf8")) as { schema: string; case: string; observations: Array<{ playerScalar: { playerRole: string; scalarBytes: number[]; normalizedFields: string[] } }> };
      expect(sha256(bytes)).toBe(hash);
      expect(bytes.toString("utf8")).toBe(`${JSON.stringify(packet, null, 2)}\n`);
      expect(packet.schema).toBe("factory-m4a-player-selector-probe/v1");
      expect(packet.case).toBe(name);
      expect(packet.observations).toHaveLength(name === "anchor" ? 52 : name === "liliana" ? 31 : 30);
      for (const { playerScalar } of packet.observations) {
        expect(playerScalar.playerRole).toBe("music-player-5");
        expect(playerScalar.scalarBytes).toHaveLength(12);
        expect(playerScalar.scalarBytes.slice(0, 4)).toEqual([0, 0, 0, 0]);
        expect(playerScalar.normalizedFields).toEqual(["memAccArea"]);
        expect(playerScalar.scalarBytes.slice(8, 10)).toEqual([144, 0]);
      }
      const present = new Set(keys(packet));
      for (const forbidden of ["pointer", "address", "frame", "tick", "duration", "masterCycles", "caseDuration"]) expect(present.has(forbidden)).toBe(false);
    }
  });

  it("mechanically joins every frozen v3 digest/cost row and regenerates byte-stably", () => {
    const evidence = makeEvidence();
    expect(evidence.coverage).toEqual({
      observations: 113,
      joinedRows: 113,
      zeroPass: 5,
      onePass: 108,
      caseCounts: {
        anchor: { observations: 52, zeroPass: 3, onePass: 49 },
        liliana: { observations: 31, zeroPass: 1, onePass: 30 },
        "factory-varied": { observations: 30, zeroPass: 1, onePass: 29 },
      },
    });
    expect(JSON.parse(readFileSync("tests/fixtures/factory-m4a-player-selector-evidence-v1.json", "utf8"))).toEqual(evidence);
    const output = mkdtempSync(join(tmpdir(), "pokebench-m4a-player-selector-v1-"));
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/report/factory-m4a-player-selector-v1.ts", "--out-dir", output]);
    expect(readFileSync(join(output, "tests/fixtures/factory-m4a-player-selector-evidence-v1.json"))).toEqual(readFileSync("tests/fixtures/factory-m4a-player-selector-evidence-v1.json"));
    expect(readFileSync(join(output, "docs/issue55-m4a-player-selector-v1.md"))).toEqual(readFileSync("docs/issue55-m4a-player-selector-v1.md"));
  });
});
