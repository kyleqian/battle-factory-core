import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  chmodSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const RUN_ROOT = process.cwd();
let fakeBin = "";

const PROFILE_ENV_KEYS = [
  "MODEL",
  "SUPERVISOR_PROVIDER",
  "SUPERVISOR_MODEL",
  "SUPERVISOR_REASONING_EFFORT",
  "SUPERVISOR_MAX_MODE",
  "WORKER_PROVIDER",
  "WORKER_MODEL",
  "WORKER_REASONING_EFFORT",
  "POKEBENCH_WORKER_PROVIDER",
  "POKEBENCH_CODEX_MAX_MODE",
] as const;

function runLauncher(
  path: string,
  args: readonly string[],
  extraEnv: NodeJS.ProcessEnv = {},
) {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: `${fakeBin}:${process.env.PATH ?? ""}`,
    ...extraEnv,
  };
  for (const key of PROFILE_ENV_KEYS) {
    if (!(key in extraEnv)) delete env[key];
  }
  return spawnSync("bash", [join(RUN_ROOT, path), ...args], {
    cwd: RUN_ROOT,
    encoding: "utf8",
    env,
  });
}

function configFrom(stdout: string): Record<string, string> {
  return Object.fromEntries(
    stdout
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const separator = line.indexOf("=");
        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

beforeAll(() => {
  fakeBin = mkdtempSync(join(tmpdir(), "codex-launcher-profile-"));
  for (const command of ["codex", "claude"]) {
    const path = join(fakeBin, command);
    writeFileSync(path, "#!/usr/bin/env bash\nexit 0\n");
    chmodSync(path, 0o755);
  }
});

afterAll(() => {
  rmSync(fakeBin, { recursive: true, force: true });
});

describe("Codex launcher profiles", () => {
  it("keeps the ordinary Codex supervisor profile unchanged", () => {
    const result = runLauncher("run-supervisor.sh", [
      "--provider",
      "codex",
      "--print-config",
    ]);

    expect(result.status).toBe(0);
    expect(configFrom(result.stdout)).toMatchObject({
      supervisor_provider: "codex",
      supervisor_model: "gpt-5.6-sol",
      supervisor_effort: "high",
      max_mode: "0",
      worker_provider: "codex",
    });
  });

  it.each([["--max-mode"], ["-M"]])(
    "%s selects a Sol/ultra supervisor and Sol/xhigh workers",
    (flag) => {
      const result = runLauncher("run-supervisor.sh", [
        flag,
        "--print-config",
      ]);

      expect(result.status).toBe(0);
      expect(configFrom(result.stdout)).toMatchObject({
        supervisor_provider: "codex",
        supervisor_model: "gpt-5.6-sol",
        supervisor_effort: "ultra",
        max_mode: "1",
        worker_provider: "codex",
        worker_model: "gpt-5.6-sol",
        worker_effort: "xhigh",
      });
    },
  );

  it("propagates max mode to the worker launcher and permits effort up to xhigh", () => {
    const inherited = runLauncher(
      "tools/run-subagent.sh",
      ["--print-config"],
      { POKEBENCH_CODEX_MAX_MODE: "1" },
    );
    const lowered = runLauncher(
      "tools/run-subagent.sh",
      ["--effort", "high", "--print-config"],
      { POKEBENCH_CODEX_MAX_MODE: "1" },
    );

    expect(inherited.status).toBe(0);
    expect(configFrom(inherited.stdout)).toMatchObject({
      worker_provider: "codex",
      worker_model: "gpt-5.6-sol",
      worker_effort: "xhigh",
      max_mode: "1",
    });
    expect(lowered.status).toBe(0);
    expect(configFrom(lowered.stdout).worker_effort).toBe("high");
  });

  it("rejects Claude or Terra overrides in max mode", () => {
    const claudeSupervisor = runLauncher("run-supervisor.sh", [
      "--max-mode",
      "--provider",
      "claude",
      "--print-config",
    ]);
    const terraWorker = runLauncher("tools/run-subagent.sh", [
      "--max-mode",
      "--model",
      "gpt-5.6-terra",
      "--print-config",
    ]);

    expect(claudeSupervisor.status).toBe(2);
    expect(claudeSupervisor.stderr).toContain("Codex-only profile");
    expect(terraWorker.status).toBe(2);
    expect(terraWorker.stderr).toContain(
      "only permits gpt-5.6-sol workers",
    );
  });
});
