import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
const root = resolve(import.meta.dirname, "../..");
const run = () => JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types",
  "tools/compare/verifyWillOWispReducer.ts"], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }));

describe("MOVE_WILL_O_WISP source-relative reducer", () => {
  it("replays all four orb and six fire programs bilaterally twice", () => {
    const result = run();
    expect(result["player-back"]).toMatchObject({ rows: 214, passes: 2, componentRows: 428 });
    expect(result["opponent-front"]).toMatchObject({ rows: 213, passes: 2, componentRows: 426 });
  });
});
