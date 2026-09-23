import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const run = () => JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/verifyRevengeReducer.ts"], { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }));

describe("MOVE_REVENGE source-relative reference reducer", () => {
  it("replays both complete 145-row source windows twice without production credit", () => {
    const first = run(); const second = run();
    expect(second).toEqual(first);
    expect(first).toMatchObject({ move: "MOVE_REVENGE", status: "unsupported-reference-contract", coverageCredit: false, sourceRelative: true, totalRows: 290, matchedRows: 290, production: { changed: false, seam: false, compositor: false, framebufferCompared: false } });
    expect(first.orientations["player-back"]).toMatchObject({ rows: 145, matchedRows: 145, firstInactiveCleanupAge: 144, direction: 1 });
    expect(first.orientations["opponent-front"]).toMatchObject({ rows: 145, matchedRows: 145, firstInactiveCleanupAge: 144, direction: -1 });
  });
});
