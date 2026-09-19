import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const audits = [
  "frustrationSourceAudit.ts",
  "bonemerangSourceAudit.ts",
  "machPunchSourceAudit.ts",
  "metalSoundSourceAudit.ts",
  "smogSourceAudit.ts",
  "signalBeamSourceAudit.ts",
];

// Run the real source audits against an isolated ledger. No production fixture,
// coverage entry, ROM, or captured framebuffer is modified by this test.
describe("move evidence is independent of unrelated animation bookkeeping", () => {
  it("keeps audit bytes stable when another move is queued or promoted, but detects its own regression", () => {
    const scratch = mkdtempSync(join(tmpdir(), "animation-bookkeeping-"));
    try {
      mkdirSync(join(scratch, "tools/compare"), { recursive: true });
      for (const dir of ["src", "reference"]) symlinkSync(join(root, dir), join(scratch, dir), "dir");
      for (const audit of audits) copyFileSync(join(root, "tools/compare", audit), join(scratch, "tools/compare", audit));
      const ledgerPath = join(scratch, "ANIMATION_COVERAGE.json");
      const ledger = JSON.parse(readFileSync(join(root, "ANIMATION_COVERAGE.json"), "utf8"));
      const save = () => writeFileSync(ledgerPath, JSON.stringify(ledger));
      const run = (audit: string) => execFileSync(process.execPath,
        ["--experimental-strip-types", join(scratch, "tools/compare", audit)],
        { cwd: scratch, encoding: "utf8", maxBuffer: 32 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
      save();
      const before = audits.map(run);
      ledger.queue.push("MOVE_CURSE");
      ledger.entries.push({ move: "MOVE_MEGAHORN", status: "exact", covered: ["test-only promotion"], evidence: ["test-only"] });
      save();
      expect(audits.map(run)).toEqual(before);
      ledger.entries.find((entry: { move: string }) => entry.move === "MOVE_FRUSTRATION").status = "partial";
      save();
      expect(() => run("frustrationSourceAudit.ts")).toThrow(/coverage boundary changed/);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });
});
