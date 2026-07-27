import {
  mkdtempSync,
  readFileSync,
  realpathSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

function pythonExecutable(): string {
  const result = spawnSync(
    "python3",
    ["-c", "import sys; print(sys.executable)"],
    { encoding: "utf8" },
  );
  expect(result.status, result.stderr).toBe(0);
  return result.stdout.trim();
}

describe("bin/oracle output controls", () => {
  it("exposes quiet mode on both capture-producing commands", () => {
    for (const command of ["run", "lab"]) {
      const result = spawnSync(
        "python3",
        ["bin/oracle", command, "--help"],
        { encoding: "utf8" },
      );
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toContain("--quiet");
    }
  });

  it("quiet mode still writes the manifest and suppresses only stdout", () => {
    const root = mkdtempSync(join(tmpdir(), "oracle-cli-quiet-"));
    const script = [
      "import runpy, sys",
      "module = runpy.run_path('bin/oracle')",
      "module['write_capture_result'](",
      "    {'schemaVersion': 1, 'captures': []},",
      "    sys.argv[1],",
      "    quiet=True,",
      ")",
    ].join("\n");
    const result = spawnSync(
      "python3",
      ["-c", script, root],
      { encoding: "utf8" },
    );

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toBe("");
    expect(JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"))).toEqual({
      schemaVersion: 1,
      captures: [],
    });
  });
});

describe("mGBA probe wrapper", () => {
  it("routes a bare python3 probe through the selected interpreter", () => {
    const root = mkdtempSync(join(tmpdir(), "mgba-wrapper-"));
    const output = join(root, "probe.json");
    const python = pythonExecutable();
    const nested = [
      "import json, sys",
      "with open(sys.argv[1], 'w') as handle:",
      "    json.dump({'executable': sys.executable}, handle)",
    ].join("\n");
    const result = spawnSync(
      "python3",
      [
        "tools/run-mgba-probe.py",
        "--mgba-python",
        python,
        output,
        "--",
        "python3",
        "-c",
        nested,
        output,
      ],
      { encoding: "utf8" },
    );

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    const payload = JSON.parse(readFileSync(output, "utf8")) as {
      executable: string;
    };
    expect(realpathSync(payload.executable)).toBe(realpathSync(python));
  });
});
