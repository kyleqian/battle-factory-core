import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const RUN_ROOT = process.cwd();
let fakeBin = "";

const PROFILE_ENV_KEYS = [
  "MODEL",
  "SUPERVISOR_AGENT",
  "SUPERVISOR_LANE",
  "WORKER_LANE",
  "WORKTREE",
  "HEADLESS",
  "SUB_AGENT",
  "SUPERVISOR_MODEL",
  "WORKER_MODEL",
  "POKEBENCH_WORKER_PROVIDER",
  "POKEBENCH_ROLE",
] as const;

function runLauncher(path: string, args: readonly string[], extraEnv: NodeJS.ProcessEnv = {}) {
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
  fakeBin = mkdtempSync(join(tmpdir(), "launcher-profile-"));
  const path = join(fakeBin, "claude");
  writeFileSync(path, "#!/usr/bin/env bash\nexit 0\n");
  chmodSync(path, 0o755);
});

afterAll(() => {
  if (fakeBin) rmSync(fakeBin, { recursive: true, force: true });
});

describe("run-supervisor.sh (Claude only)", () => {
  it("defaults to a Claude Opus supervisor with Claude Sonnet workers", () => {
    const result = runLauncher("run-supervisor.sh", ["--print-config"]);
    expect(result.status, result.stderr).toBe(0);
    expect(configFrom(result.stdout)).toMatchObject({
      supervisor: "claude",
      supervisor_model: "claude-opus-5-5",
      sub_agent: "claude",
      worker_model: "claude-sonnet-5-5",
      supervisor_mode: "interactive",
    });
  });

  it("accepts the unattended cron form unchanged", () => {
    const result = runLauncher("run-supervisor.sh", [
      "--headless", "-S", "opus", "-s", "sonnet", "-c", "10", "--log", "/tmp/launcher-test.log", "--print-config",
    ]);
    expect(result.status, result.stderr).toBe(0);
    expect(configFrom(result.stdout)).toMatchObject({
      supervisor_mode: "headless",
      supervisor_model: "claude-opus-5-5",
      worker_model: "claude-sonnet-5-5",
    });
  });

  it.each([
    [["-S", "codex"], /unsupported supervisor 'codex'/],
    [["-s", "deepseek"], /unsupported sub-agent 'deepseek'/],
    [["-s", "opencode"], /unsupported sub-agent 'opencode'/],
    [["--lane", "animation"], /unsupported lane 'animation'/],
    [["--lane", "rust"], /unsupported lane 'rust'/],
    [["--max-mode"], /unknown option '--max-mode'/],
  ])("rejects removed option %j", (args, message) => {
    const result = runLauncher("run-supervisor.sh", [...args, "--print-config"]);
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(message);
  });
});

describe("tools/run-subagent.sh (Claude only)", () => {
  it("defaults to the ts lane on Claude Sonnet with the Battle Scene OFF oracle", () => {
    const result = runLauncher("tools/run-subagent.sh", ["--print-config"]);
    expect(result.status, result.stderr).toBe(0);
    expect(configFrom(result.stdout)).toMatchObject({
      sub_agent: "claude",
      worker_model: "claude-sonnet-5-5",
      worker_lane: "ts",
      oracle_profile: "battle-scene-off",
    });
  });

  it("puts the integration lane on the Battle Scene ON oracle", () => {
    const result = runLauncher("tools/run-subagent.sh", ["--lane", "integration", "--print-config"]);
    expect(result.status, result.stderr).toBe(0);
    expect(configFrom(result.stdout)).toMatchObject({ worker_lane: "integration", oracle_profile: "battle-scene-on" });
  });

  it("resolves Claude model aliases through -m and -s", () => {
    const byModel = runLauncher("tools/run-subagent.sh", ["-m", "opus", "--print-config"]);
    expect(configFrom(byModel.stdout).worker_model).toBe("claude-opus-5-5");
    const bySubAgent = runLauncher("tools/run-subagent.sh", ["-s", "sonnet", "--print-config"]);
    expect(configFrom(bySubAgent.stdout).worker_model).toBe("claude-sonnet-5-5");
    const conflict = runLauncher("tools/run-subagent.sh", ["-m", "opus", "-s", "sonnet", "--print-config"]);
    expect(conflict.status).toBe(2);
    expect(conflict.stderr).toMatch(/conflicts/);
  });

  it("marks audit runs read-only", () => {
    const result = runLauncher("tools/run-subagent.sh", ["--read-only", "--print-config"]);
    expect(configFrom(result.stdout).worker_mode).toBe("read-only");
  });

  it.each([
    [["-s", "codex"], /unsupported sub-agent 'codex'/],
    [["-s", "deepseek"], /unsupported sub-agent 'deepseek'/],
    [["--lane", "animation"], /unsupported lane 'animation'/],
    [["--lane", "rust"], /unsupported lane 'rust'/],
    [["--max-mode"], /unknown option '--max-mode'/],
    [["-e", "high"], /unknown option '-e'/],
  ])("rejects removed option %j", (args, message) => {
    const result = runLauncher("tools/run-subagent.sh", [...args, "--print-config"]);
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(message);
  });

  it("refuses to run inside a worker session (exit 3)", () => {
    const result = runLauncher("tools/run-subagent.sh", ["--print-config"], { POKEBENCH_ROLE: "worker" });
    expect(result.status).toBe(3);
    expect(result.stderr).toMatch(/already inside a worker session/);
  });
});
