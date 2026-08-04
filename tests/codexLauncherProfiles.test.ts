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
  "SUPERVISOR_AGENT",
  "SUB_AGENT",
  "SUPERVISOR_MODEL",
  "SUPERVISOR_REASONING_EFFORT",
  "SUPERVISOR_MAX_MODE",
  "WORKER_MODEL",
  "WORKER_REASONING_EFFORT",
  "POKEBENCH_WORKER_PROVIDER",
  "POKEBENCH_CODEX_MAX_MODE",
  "OPENCODE_BIN",
  "POKEBENCH_ROLE",
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
  for (const command of ["codex", "claude", "opencode"]) {
    const path = join(fakeBin, command);
    writeFileSync(path, "#!/usr/bin/env bash\nexit 0\n");
    chmodSync(path, 0o755);
  }
});

afterAll(() => {
  rmSync(fakeBin, { recursive: true, force: true });
});

describe("Supervisor and worker launcher profiles", () => {
  it("keeps the default Claude-only profile unchanged", () => {
    const result = runLauncher("run-supervisor.sh", ["--print-config"]);

    expect(result.status).toBe(0);
    expect(configFrom(result.stdout)).toMatchObject({
      supervisor: "claude",
      supervisor_model: "claude-fable-5",
      supervisor_effort: "n/a",
      supervisor_shell_cwd: "project-root-reset",
      max_mode: "0",
      sub_agent: "claude",
      worker_launch_mode: "background",
      worker_routing: "fixed",
      worker_model: "claude-sonnet-5",
      worker_effort: "n/a",
    });
  });

  it("keeps the ordinary Codex supervisor profile unchanged", () => {
    const result = runLauncher("run-supervisor.sh", [
      "--supervisor",
      "Codex",
      "--print-config",
    ]);

    expect(result.status).toBe(0);
    expect(configFrom(result.stdout)).toMatchObject({
      supervisor: "codex",
      supervisor_model: "gpt-5.6-sol",
      supervisor_effort: "high",
      supervisor_shell_cwd: "per-command",
      max_mode: "0",
      sub_agent: "codex",
      worker_launch_mode: "managed",
      worker_routing: "tiered",
      worker_model: "gpt-5.6-sol",
      worker_effort: "high",
    });
  });

  it.each([
    ["short role flags", ["-S", "Claude", "-s", "Codex"]],
    [
      "long role flags",
      ["--supervisor", "claude", "--sub-agent", "codex"],
    ],
  ])(
    "%s selects a Fable supervisor with tiered Codex workers",
    (_name, profileArgs) => {
      const result = runLauncher("run-supervisor.sh", [
        ...profileArgs,
        "--print-config",
      ]);

      expect(result.status).toBe(0);
      expect(configFrom(result.stdout)).toMatchObject({
        supervisor: "claude",
        supervisor_model: "claude-fable-5",
        supervisor_effort: "n/a",
        supervisor_shell_cwd: "project-root-reset",
        max_mode: "0",
        sub_agent: "codex",
        worker_launch_mode: "background",
        worker_routing: "tiered",
        worker_model: "gpt-5.6-sol",
        worker_effort: "high",
      });
    },
  );

  it("supports independent role selection through environment configuration", () => {
    const result = runLauncher(
      "run-supervisor.sh",
      ["--print-config"],
      { SUPERVISOR_AGENT: "Claude", SUB_AGENT: "Codex" },
    );

    expect(result.status).toBe(0);
    expect(configFrom(result.stdout)).toMatchObject({
      supervisor: "claude",
      supervisor_shell_cwd: "project-root-reset",
      sub_agent: "codex",
      worker_launch_mode: "background",
      worker_routing: "tiered",
    });
  });

  it.each([
    ["short flag", ["-s", "DeepSeek"]],
    ["long flag", ["--supervisor", "claude", "--sub-agent", "deepseek"]],
  ])(
    "%s selects a Fable supervisor with fixed DeepSeek V4 Flash/OpenCode workers",
    (_name, profileArgs) => {
      const result = runLauncher("run-supervisor.sh", [
        ...profileArgs,
        "--print-config",
      ]);

      expect(result.status).toBe(0);
      expect(configFrom(result.stdout)).toMatchObject({
        supervisor: "claude",
        supervisor_model: "claude-fable-5",
        supervisor_effort: "n/a",
        supervisor_shell_cwd: "project-root-reset",
        max_mode: "0",
        sub_agent: "deepseek",
        worker_launch_mode: "background",
        worker_routing: "fixed-deepseek",
        worker_model: "deepseek/deepseek-v4-flash",
        worker_effort: "n/a",
        worker_runtime: "opencode",
        worker_headless: "1",
        worker_permissions: "auto",
      });
    },
  );

  it("supports the DeepSeek worker profile through environment configuration", () => {
    const result = runLauncher(
      "run-supervisor.sh",
      ["--print-config"],
      { SUB_AGENT: "DeepSeek" },
    );

    expect(result.status).toBe(0);
    expect(configFrom(result.stdout)).toMatchObject({
      supervisor: "claude",
      sub_agent: "deepseek",
      worker_model: "deepseek/deepseek-v4-flash",
      worker_runtime: "opencode",
    });
  });

  it("configures direct DeepSeek workers as headless OpenCode V4 Flash runs", () => {
    const result = runLauncher("tools/run-subagent.sh", [
      "--sub-agent",
      "DeepSeek",
      "--print-config",
    ]);

    expect(result.status).toBe(0);
    expect(configFrom(result.stdout)).toMatchObject({
      sub_agent: "deepseek",
      worker_model: "deepseek/deepseek-v4-flash",
      worker_effort: "n/a",
      worker_runtime: "opencode",
      worker_headless: "1",
      worker_permissions: "auto",
    });
  });

  it("forces Claude's Bash tool back to the supervisor root between calls", () => {
    const result = runLauncher(
      "run-supervisor.sh",
      ["--print-config"],
      { CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR: "0" },
    );

    expect(result.status).toBe(0);
    expect(configFrom(result.stdout).supervisor_shell_cwd).toBe(
      "project-root-reset",
    );
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
        supervisor: "codex",
        supervisor_model: "gpt-5.6-sol",
        supervisor_effort: "ultra",
        max_mode: "1",
        sub_agent: "codex",
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
      sub_agent: "codex",
      worker_model: "gpt-5.6-sol",
      worker_effort: "xhigh",
      max_mode: "1",
    });
    expect(lowered.status).toBe(0);
    expect(configFrom(lowered.stdout).worker_effort).toBe("high");
  });

  it("routes ordinary Codex workers only as Terra/max, Luna/max, or Sol/high", () => {
    const terra = runLauncher(
      "tools/run-subagent.sh",
      [
        "--model",
        "gpt-5.6-terra",
        "--effort",
        "max",
        "--print-config",
      ],
      { POKEBENCH_WORKER_PROVIDER: "codex" },
    );
    const luna = runLauncher(
      "tools/run-subagent.sh",
      [
        "--model",
        "gpt-5.6-luna",
        "--effort",
        "max",
        "--print-config",
      ],
      { POKEBENCH_WORKER_PROVIDER: "codex" },
    );
    const sol = runLauncher(
      "tools/run-subagent.sh",
      [
        "--model",
        "gpt-5.6-sol",
        "--effort",
        "high",
        "--print-config",
      ],
      { POKEBENCH_WORKER_PROVIDER: "codex" },
    );

    expect(terra.status).toBe(0);
    expect(configFrom(terra.stdout)).toMatchObject({
      sub_agent: "codex",
      worker_model: "gpt-5.6-terra",
      worker_effort: "max",
    });
    expect(luna.status).toBe(0);
    expect(configFrom(luna.stdout)).toMatchObject({
      sub_agent: "codex",
      worker_model: "gpt-5.6-luna",
      worker_effort: "max",
    });
    expect(sol.status).toBe(0);
    expect(configFrom(sol.stdout)).toMatchObject({
      sub_agent: "codex",
      worker_model: "gpt-5.6-sol",
      worker_effort: "high",
    });
  });

  it("rejects effort that does not match the ordinary Codex model", () => {
    const directWorker = runLauncher("tools/run-subagent.sh", [
      "--sub-agent",
      "codex",
      "--effort",
      "medium",
      "--print-config",
    ]);
    const codexSupervisor = runLauncher("run-supervisor.sh", [
      "--supervisor",
      "codex",
      "--effort",
      "medium",
      "--print-config",
    ]);
    const mixedWorkerOverride = runLauncher(
      "run-supervisor.sh",
      ["-S", "claude", "-s", "codex", "--print-config"],
      { WORKER_REASONING_EFFORT: "medium" },
    );
    const maxWorker = runLauncher("tools/run-subagent.sh", [
      "--max-mode",
      "--effort",
      "medium",
      "--print-config",
    ]);

    expect(directWorker.status).toBe(2);
    expect(directWorker.stderr).toContain(
      "ordinary Codex model 'gpt-5.6-sol' requires effort 'high'",
    );
    expect(codexSupervisor.status).toBe(2);
    expect(codexSupervisor.stderr).toContain(
      "ordinary Codex model 'gpt-5.6-sol' requires effort 'high'",
    );
    expect(mixedWorkerOverride.status).toBe(2);
    expect(mixedWorkerOverride.stderr).toContain(
      "ordinary Codex worker model 'gpt-5.6-sol' requires effort 'high'",
    );
    expect(maxWorker.status).toBe(2);
    expect(maxWorker.stderr).toContain(
      "max-mode worker effort must be high or xhigh",
    );
  });

  it("defaults Terra and Luna to max and rejects lower effort", () => {
    for (const model of ["gpt-5.6-terra", "gpt-5.6-luna"]) {
      const implicit = runLauncher("tools/run-subagent.sh", [
        "--sub-agent",
        "codex",
        "--model",
        model,
        "--print-config",
      ]);
      const lowered = runLauncher("tools/run-subagent.sh", [
        "--sub-agent",
        "codex",
        "--model",
        model,
        "--effort",
        "high",
        "--print-config",
      ]);

      expect(implicit.status).toBe(0);
      expect(configFrom(implicit.stdout).worker_effort).toBe("max");
      expect(lowered.status).toBe(2);
      expect(lowered.stderr).toContain(
        `ordinary Codex model '${model}' requires effort 'max'`,
      );
    }
  });

  it("keeps ordinary Sol fixed at high", () => {
    const raised = runLauncher("tools/run-subagent.sh", [
      "--sub-agent",
      "codex",
      "--model",
      "gpt-5.6-sol",
      "--effort",
      "max",
      "--print-config",
    ]);

    expect(raised.status).toBe(2);
    expect(raised.stderr).toContain(
      "ordinary Codex model 'gpt-5.6-sol' requires effort 'high'",
    );
  });

  it("resolves mixed Codex sub-agent overrides through the same matrix", () => {
    for (const model of ["gpt-5.6-terra", "gpt-5.6-luna"]) {
      const result = runLauncher(
        "run-supervisor.sh",
        ["-S", "claude", "-s", "codex", "--print-config"],
        { WORKER_MODEL: model },
      );

      expect(result.status).toBe(0);
      expect(configFrom(result.stdout)).toMatchObject({
        worker_model: model,
        worker_effort: "max",
      });
    }
  });

  it("applies the same Terra/max and Luna/max policy to Codex supervisors", () => {
    for (const model of ["gpt-5.6-terra", "gpt-5.6-luna"]) {
      const result = runLauncher("run-supervisor.sh", [
        "--supervisor",
        "codex",
        "--model",
        model,
        "--print-config",
      ]);

      expect(result.status).toBe(0);
      expect(configFrom(result.stdout)).toMatchObject({
        supervisor_model: model,
        supervisor_effort: "max",
      });
    }
  });

  it("rejects unsupported ordinary Codex models", () => {
    const worker = runLauncher("tools/run-subagent.sh", [
      "--sub-agent",
      "codex",
      "--model",
      "gpt-5.6-other",
      "--print-config",
    ]);
    const supervisor = runLauncher("run-supervisor.sh", [
      "--supervisor",
      "codex",
      "--model",
      "gpt-5.6-other",
      "--print-config",
    ]);

    expect(worker.status).toBe(2);
    expect(worker.stderr).toContain("unsupported ordinary Codex worker model");
    expect(supervisor.status).toBe(2);
    expect(supervisor.stderr).toContain(
      "unsupported ordinary Codex supervisor model",
    );
  });

  it.each([["--read-only"], ["--audit"]])(
    "%s selects the commit-free audit postflight",
    (flag) => {
      const result = runLauncher("tools/run-subagent.sh", [
        "--sub-agent",
        "codex",
        flag,
        "--print-config",
      ]);

      expect(result.status).toBe(0);
      expect(configFrom(result.stdout)).toMatchObject({
        sub_agent: "codex",
        worker_mode: "read-only",
      });
    },
  );

  it("rejects non-Codex role selections or Terra overrides in max mode", () => {
    const claudeSupervisor = runLauncher("run-supervisor.sh", [
      "--max-mode",
      "--supervisor",
      "claude",
      "--print-config",
    ]);
    const deepSeekSubAgent = runLauncher("run-supervisor.sh", [
      "--max-mode",
      "--sub-agent",
      "deepseek",
      "--print-config",
    ]);
    const terraWorker = runLauncher("tools/run-subagent.sh", [
      "--max-mode",
      "--model",
      "gpt-5.6-terra",
      "--print-config",
    ]);

    expect(claudeSupervisor.status).toBe(2);
    expect(claudeSupervisor.stderr).toContain("requires a Codex supervisor");
    expect(deepSeekSubAgent.status).toBe(2);
    expect(deepSeekSubAgent.stderr).toContain("requires Codex sub-agents");
    expect(terraWorker.status).toBe(2);
    expect(terraWorker.stderr).toContain(
      "only permits gpt-5.6-sol workers",
    );
  });

  it.each([
    ["run-supervisor.sh", ["--provider", "codex"]],
    ["run-supervisor.sh", ["--worker-provider", "codex"]],
    ["run-supervisor.sh", ["--hybrid"]],
    ["run-supervisor.sh", ["-H"]],
    ["run-supervisor.sh", ["--deepseek-workers"]],
    ["run-supervisor.sh", ["-D"]],
    ["tools/run-subagent.sh", ["--provider", "codex"]],
    ["tools/run-subagent.sh", ["-p", "codex"]],
  ])("retires the old provider/profile flag in %s: %j", (path, args) => {
    const result = runLauncher(path, [...args, "--print-config"]);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("unknown option");
  });

  it.each([["DeepSeek"], ["deepseek"]])(
    "rejects %s as a supervisor",
    (agent) => {
      const result = runLauncher("run-supervisor.sh", [
        "--supervisor",
        agent,
        "--print-config",
      ]);

      expect(result.status).toBe(2);
      expect(result.stderr).toContain("DeepSeek is not supported as a supervisor");
    },
  );

  it("allows a Codex supervisor to select DeepSeek sub-agents independently", () => {
    const result = runLauncher("run-supervisor.sh", [
      "-S",
      "Codex",
      "-s",
      "DeepSeek",
      "--print-config",
    ]);

    expect(result.status).toBe(0);
    expect(configFrom(result.stdout)).toMatchObject({
      supervisor: "codex",
      sub_agent: "deepseek",
      supervisor_model: "gpt-5.6-sol",
      worker_model: "deepseek/deepseek-v4-flash",
      worker_runtime: "opencode",
    });
  });

  it("keeps DeepSeek workers fixed at V4 Flash without an effort override", () => {
    const directModel = runLauncher("tools/run-subagent.sh", [
      "--sub-agent",
      "deepseek",
      "--model",
      "deepseek/deepseek-reasoner",
      "--print-config",
    ]);
    const directEffort = runLauncher("tools/run-subagent.sh", [
      "--sub-agent",
      "deepseek",
      "--effort",
      "high",
      "--print-config",
    ]);
    const inheritedModel = runLauncher(
      "run-supervisor.sh",
      ["-s", "deepseek", "--print-config"],
      { WORKER_MODEL: "deepseek/deepseek-reasoner" },
    );

    expect(directModel.status).toBe(2);
    expect(directModel.stderr).toContain("fixed at deepseek/deepseek-v4-flash");
    expect(directEffort.status).toBe(2);
    expect(directEffort.stderr).toContain("--effort applies only to a Codex sub-agent");
    expect(inheritedModel.status).toBe(2);
    expect(inheritedModel.stderr).toContain("fixed at deepseek/deepseek-v4-flash");
  });
});
