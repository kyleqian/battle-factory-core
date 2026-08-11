import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

const PATH = "tests/fixtures/factory-timer0-reachability-audit-v1.json";
const bytes = readFileSync(PATH);
const receipt = JSON.parse(bytes.toString("utf8"));

function materializeAuditedSources(root: string): { emerald: string; mgba: string; oracle: string } {
  for (const [relative, anchors] of Object.entries(receipt.auditedAnchors) as Array<[string, string[]]>) {
    const path = join(root, relative);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${anchors.join("\n")}\n`);
  }
  return {
    emerald: join(root, "pokeemerald"),
    mgba: join(root, "mgba"),
    oracle: join(root, "oracle", "emerald_core.py"),
  };
}

function regenerate(sources: ReturnType<typeof materializeAuditedSources>, output: string): void {
  execFileSync(process.execPath, [
    "--experimental-strip-types",
    "tools/extract/extract-factory-timer0-reachability-audit.ts",
    "--pokeemerald-source", sources.emerald,
    "--mgba-source", sources.mgba,
    "--oracle-source", sources.oracle,
    "--out", output,
  ]);
}

describe("Issue #55 Factory Timer 0 runtime-class reachability audit", () => {
  it("keeps source conclusions separate from the finite construction census", () => {
    expect(bytes.toString("utf8")).toBe(`${JSON.stringify(receipt, null, 2)}\n`);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      "b8fa71769ea3af15574b0c8b87723dbfbe7af719c6ab298b5c195a907ee1bb72",
    );
    expect(receipt.schema).toBe("factory-timer0-reachability-audit/v1");
    expect(receipt.release).toMatchObject({
      mgbaVersion: "0.10.5",
      mgbaArchiveSha256: "91d6fbd32abcbdf030d58d3f562de25ebbc9d56040d513ff8e5c19bee9dacf14",
      oracleProfile: "battle-scene-off",
    });
    expect(receipt.sourceFacts.emeraldPairInvariant).toHaveLength(5);
    expect(receipt.sourceFacts.mgbaConsumption.order).toEqual(["FIFO A", "FIFO B"]);
    expect(receipt.sourceFacts.mixer.gameControllable).toBe(false);
  });

  it("pins zero and dual occurrence while keeping single-refill absence finite", () => {
    expect(receipt.constructionCensus.cases).toEqual({
      anchor: { crossings: 126, zeroRefill: 85, singleRefill: 0, dualRefill: 41 },
      liliana: { crossings: 57, zeroRefill: 38, singleRefill: 0, dualRefill: 19 },
      "factory-varied": { crossings: 73, zeroRefill: 48, singleRefill: 0, dualRefill: 25 },
    });
    expect(receipt.constructionCensus.totals).toEqual({
      crossings: 256, zeroRefill: 171, singleRefill: 0, dualRefill: 85,
    });
    expect(receipt.constructionCensus.symmetricEntryStates).toBe(256);
    expect(receipt.constructionCensus.asymmetricEntryStates).toBe(0);
    expect(receipt.constructionCensus.runtimeWindowClasses).toEqual([
      { refill: "dual", audioEnabled: true, mixerPresent: false, externalMixing: false },
      { refill: "dual", audioEnabled: true, mixerPresent: false, externalMixing: false },
    ]);
  });

  it("scopes the reachability verdicts to ordinary post-boot construction", () => {
    expect(receipt.constructionReachability).toEqual({
      zeroRefill: "source-reachable-and-observed",
      dualRefill: "source-reachable-and-observed",
      singleRefill: "not reachable while the audited Emerald pair invariant holds; not observed in the finite census",
      mixerPresent: "not an oracle game path; optional emulator gba.audioHle component only",
      audioDisabled: "not reachable in the audited post-boot Factory construction epoch; SOUNDCNT_X is enabled and runtime receipts agree",
    });
    expect(receipt.explicitBoundary).toHaveLength(4);
    expect(receipt.explicitBoundary.join(" ")).toContain("externally staged asymmetric FIFO/DMA state");
  });

  it("regenerates byte-for-byte without network, emulator, or oracle", () => {
    const directory = mkdtempSync(join(tmpdir(), "timer0-reachability-audit-"));
    const sources = materializeAuditedSources(directory);
    const output = join(directory, "receipt.json");
    regenerate(sources, output);
    expect(readFileSync(output)).toEqual(bytes);
  });

  it("rejects a stale audited source anchor", () => {
    const directory = mkdtempSync(join(tmpdir(), "timer0-reachability-stale-"));
    const sources = materializeAuditedSources(directory);
    const timerPath = join(sources.mgba, "src", "gba", "timer.c");
    writeFileSync(timerPath, readFileSync(timerPath, "utf8").replace("gba->audio.enable", "gba->audio.disabled"));
    const result = spawnSync(process.execPath, [
      "--experimental-strip-types",
      "tools/extract/extract-factory-timer0-reachability-audit.ts",
      "--pokeemerald-source", sources.emerald,
      "--mgba-source", sources.mgba,
      "--oracle-source", sources.oracle,
      "--out", join(directory, "receipt.json"),
    ], { encoding: "utf8" });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("is stale: missing audited anchor");
  });
});
