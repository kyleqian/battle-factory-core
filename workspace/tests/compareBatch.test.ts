import { describe, expect, it } from "vitest";
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  beginCompareBatchEntry,
  createCompareBatchManifest,
  defaultCompareBatchDirectoryName,
  entriesNeedingRun,
  finishCompareBatchEntry,
  parseCompareBatchCliArgs,
  parseCompareBatchManifest,
  replaceCompareBatchEntry,
} from "../tools/compare/batchState.ts";

describe("serialized compare batch CLI", () => {
  it("accepts an initial trace list or a manifest-backed resume", () => {
    expect(
      parseCompareBatchCliArgs([
        "anchor",
        "draft-menu.json",
        "--out-root",
        "/tmp/comparisons",
      ]),
    ).toEqual({
      traces: ["anchor", "draft-menu.json"],
      outRoot: "/tmp/comparisons",
      verbose: false,
    });
    expect(
      parseCompareBatchCliArgs(["--resume=/tmp/comparisons", "--verbose"]),
    ).toEqual({
      traces: [],
      resumeRoot: "/tmp/comparisons",
      verbose: true,
    });
  });

  it("rejects ambiguous resume inputs and empty initial batches", () => {
    expect(() => parseCompareBatchCliArgs([])).toThrow("at least one trace");
    expect(() =>
      parseCompareBatchCliArgs(["trace.json", "--resume", "/tmp/batch"])
    ).toThrow("reads traces from batch.json");
    expect(() =>
      parseCompareBatchCliArgs([
        "--resume",
        "/tmp/batch",
        "--out-root",
        "/tmp/other",
      ])
    ).toThrow("cannot be combined");
  });
});

describe("serialized compare batch checkpoints", () => {
  it("gives every trace a stable, collision-free output directory", () => {
    const manifest = createCompareBatchManifest(
      [
        "/first/catalog/same.json",
        "/second/catalog/same.json",
        "/traces/Fly alignment!.json",
      ],
      "2026-07-27T00:00:00.000Z",
      true,
    );

    expect(manifest.entries.map((entry) => entry.outputDirectory)).toEqual([
      "001-same",
      "002-same",
      "003-fly-alignment",
    ]);
    expect(parseCompareBatchManifest(JSON.parse(JSON.stringify(manifest)))).toEqual(
      manifest,
    );
  });

  it("skips passes but retries interrupted and failed entries on resume", () => {
    let manifest = createCompareBatchManifest(
      ["one.json", "two.json", "three.json"],
      "start",
      true,
    );
    const first = finishCompareBatchEntry(
      beginCompareBatchEntry(manifest.entries[0]!, "first-start"),
      0,
      "first-end",
    );
    const second = beginCompareBatchEntry(manifest.entries[1]!, "second-start");
    const third = finishCompareBatchEntry(
      beginCompareBatchEntry(manifest.entries[2]!, "third-start"),
      1,
      "third-end",
    );
    manifest = replaceCompareBatchEntry(manifest, first, "update-1");
    manifest = replaceCompareBatchEntry(manifest, second, "update-2");
    manifest = replaceCompareBatchEntry(manifest, third, "update-3");

    expect(entriesNeedingRun(manifest).map((entry) => entry.id)).toEqual([
      "002",
      "003",
    ]);
    expect(beginCompareBatchEntry(second, "retry").attempts).toBe(2);
  });

  it("uses filesystem-safe unique default batch names", () => {
    expect(
      defaultCompareBatchDirectoryName(
        new Date("2026-07-27T01:02:03.456Z"),
        42,
      ),
    ).toBe("batch-2026-07-27-01-02-03Z-42");
  });

  it("runs serially, checkpoints failures, and resumes only unfinished entries", () => {
    const root = mkdtempSync(join(tmpdir(), "compare-batch-runner-"));
    const batchRoot = join(root, "batch");
    const firstTrace = join(root, "one.json");
    const secondTrace = join(root, "two.json");
    const mockRunner = join(root, "mock-compare.mjs");
    writeFileSync(firstTrace, "{}");
    writeFileSync(secondTrace, "{}");
    writeFileSync(
      mockRunner,
      [
        "import { appendFileSync, mkdirSync } from 'node:fs';",
        "import { basename, dirname, join } from 'node:path';",
        "const trace = process.argv[2];",
        "const output = process.argv[3];",
        "mkdirSync(output, { recursive: true });",
        "appendFileSync(join(dirname(output), 'order.txt'), `${basename(trace)}\\n`);",
        "process.exit(process.env.MOCK_FAIL === basename(trace) ? 1 : 0);",
      ].join("\n"),
    );

    const initial = spawnSync(
      process.execPath,
      [
        "--experimental-strip-types",
        "tools/compare/batch.ts",
        firstTrace,
        secondTrace,
        "--out-root",
        batchRoot,
      ],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          POKEBENCH_COMPARE_SCRIPT: mockRunner,
          MOCK_FAIL: basename(secondTrace),
        },
      },
    );
    expect(initial.status, `${initial.stdout}\n${initial.stderr}`).toBe(1);
    expect(
      parseCompareBatchManifest(
        JSON.parse(readFileSync(join(batchRoot, "batch.json"), "utf8")),
      ).entries.map((entry) => ({
        status: entry.status,
        attempts: entry.attempts,
      })),
    ).toEqual([
      { status: "passed", attempts: 1 },
      { status: "failed", attempts: 1 },
    ]);

    const resumed = spawnSync(
      process.execPath,
      [
        "--experimental-strip-types",
        "tools/compare/batch.ts",
        "--resume",
        batchRoot,
      ],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          POKEBENCH_COMPARE_SCRIPT: mockRunner,
          MOCK_FAIL: "",
        },
      },
    );
    expect(resumed.status, `${resumed.stdout}\n${resumed.stderr}`).toBe(0);
    expect(
      parseCompareBatchManifest(
        JSON.parse(readFileSync(join(batchRoot, "batch.json"), "utf8")),
      ).entries.map((entry) => ({
        status: entry.status,
        attempts: entry.attempts,
      })),
    ).toEqual([
      { status: "passed", attempts: 1 },
      { status: "passed", attempts: 2 },
    ]);
    expect(readFileSync(join(batchRoot, "order.txt"), "utf8")).toBe(
      "one.json\ntwo.json\ntwo.json\n",
    );
  });
});
