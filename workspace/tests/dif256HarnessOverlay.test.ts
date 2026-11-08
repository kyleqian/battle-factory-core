import { describe, expect, it } from "vitest";
import {
  loadToolsImportGraph,
  parseHarnessImportFailure,
  planHarnessOverlay,
  resolveWorkspaceImport,
  scanRelativeImports,
  type ImportGraph,
} from "../tools/compare/harnessOverlay.ts";

const ENTRY = "tools/compare/appTrace.ts";

function graph(entries: Record<string, string[]>): ImportGraph {
  return new Map(Object.entries(entries));
}

describe("dif256 planHarnessOverlay", () => {
  it("returns the tools/-only closure, sorted and deduplicated, and reports src/ separately", () => {
    const plan = planHarnessOverlay(ENTRY, graph({
      [ENTRY]: [
        "src/engine/core.ts",
        "tools/compare/traceReplay.ts",
        "tools/compare/oracleClient.ts",
        "src/engine/core.ts",
      ],
      "tools/compare/traceReplay.ts": ["src/engine/core.ts"],
      "tools/compare/oracleClient.ts": ["tools/compare/traceTypes.ts", "tools/compare/traceReplay.ts"],
      "tools/compare/traceTypes.ts": ["src/data/gen/x.json"],
    }));
    expect(plan.files).toEqual([
      "tools/compare/appTrace.ts",
      "tools/compare/oracleClient.ts",
      "tools/compare/traceReplay.ts",
      "tools/compare/traceTypes.ts",
    ]);
    expect(plan.engineImports).toEqual(["src/data/gen/x.json", "src/engine/core.ts"]);
    expect(plan.files.some((file) => file.startsWith("src/"))).toBe(false);
  });

  it("terminates on import cycles", () => {
    const plan = planHarnessOverlay(ENTRY, graph({
      [ENTRY]: ["tools/compare/a.ts"],
      "tools/compare/a.ts": [ENTRY],
    }));
    expect(plan.files).toEqual(["tools/compare/a.ts", ENTRY]);
  });

  it("rejects an entry under src/ and an entry outside tools/", () => {
    expect(() => planHarnessOverlay("src/engine/core.ts", graph({ "src/engine/core.ts": [] })))
      .toThrow(/src\/ is never copied/);
    expect(() => planHarnessOverlay("tests/x.ts", graph({ "tests/x.ts": [] })))
      .toThrow(/not under tools\//);
  });

  it("rejects imports that are neither tools/ nor src/", () => {
    expect(() => planHarnessOverlay(ENTRY, graph({ [ENTRY]: ["tests/helper.ts"] })))
      .toThrow(/neither tools\/ nor src\//);
    expect(() => planHarnessOverlay(ENTRY, graph({ [ENTRY]: ["package.json"] })))
      .toThrow(/neither tools\/ nor src\//);
  });

  it("reports a tools/ import missing from the graph", () => {
    expect(() => planHarnessOverlay(ENTRY, graph({ [ENTRY]: ["tools/compare/gone.ts"] })))
      .toThrow(/no entry for tools\/compare\/gone.ts/);
  });
});

describe("dif256 import scanning", () => {
  it("finds static, side-effect, re-export, type and dynamic relative imports and skips bare ones", () => {
    const source = `
      // import { no } from "./commented.ts";
      /* import { nope } from "./blocked.ts"; */
      import { PNG } from "pngjs";
      import type { Trace } from "./traceTypes.ts";
      import {
        a,
        b,
      } from "../../src/engine/core.ts" with { type: "json" };
      export { x } from "./oracleProfiles.ts";
      import "./sideEffect.ts";
      const lazy = await import("./lazy.ts");
    `;
    expect(scanRelativeImports(source).sort()).toEqual([
      "../../src/engine/core.ts",
      "./lazy.ts",
      "./oracleProfiles.ts",
      "./sideEffect.ts",
      "./traceTypes.ts",
    ]);
  });

  it("resolves specifiers against the importing file and refuses to leave the workspace", () => {
    expect(resolveWorkspaceImport(ENTRY, "../../src/engine/core.ts")).toBe("src/engine/core.ts");
    expect(resolveWorkspaceImport(ENTRY, "./traceReplay.ts")).toBe("tools/compare/traceReplay.ts");
    expect(() => resolveWorkspaceImport(ENTRY, "../../../elsewhere.ts")).toThrow(/leaves the workspace/);
  });

  it("plans the real appTrace harness as tools/-only and keeps the engine out of it", () => {
    const plan = planHarnessOverlay(ENTRY, loadToolsImportGraph(ENTRY, process.cwd()));
    expect(plan.files).toContain(ENTRY);
    expect(plan.files).toContain("tools/compare/traceReplay.ts");
    expect(plan.files.every((file) => file.startsWith("tools/"))).toBe(true);
    expect(plan.engineImports).toContain("src/engine/core.ts");
    expect(plan.engineImports.every((file) => file.startsWith("src/"))).toBe(true);
  });
});

describe("dif256 import failure parsing", () => {
  it("names a missing export", () => {
    expect(parseHarnessImportFailure(
      "SyntaxError: The requested module '../../src/engine/postwin.ts' does not provide an export named 'newThing'\n    at ...",
    )).toEqual({
      kind: "missing-export",
      detail: "module ../../src/engine/postwin.ts has no export 'newThing'",
    });
  });

  it("names a missing module", () => {
    const failure = parseHarnessImportFailure(
      "Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/b/src/engine/new.ts' imported from /b/tools/compare/appTrace.ts",
    );
    expect(failure?.kind).toBe("missing-module");
    expect(failure?.detail).toContain("/b/src/engine/new.ts");
  });

  it("returns undefined for unrelated errors", () => {
    expect(parseHarnessImportFailure("Error: boom")).toBeUndefined();
  });
});
