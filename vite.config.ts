import { defineConfig, configDefaults } from "vitest/config";

export default defineConfig({
  root: ".",
  build: {
    outDir: "dist",
    target: "es2022",
  },
  server: {
    port: 5173,
  },
  test: {
    // Every suite lives in `tests/`. Pinning discovery there (rather than
    // vitest's default repo-wide glob) keeps nested checkouts invisible: the
    // parallel-worker lane checks a second copy of the repo out under
    // `.worktrees/`, and differential worktrees occasionally land elsewhere
    // under the run root — either one otherwise doubles every suite.
    include: ["tests/**/*.test.ts"],
    exclude: [...configDefaults.exclude, "**/.worktrees/**"],
    // Redirects $TMPDIR to a per-process sandbox that is removed on exit, so
    // the suite's ~200 `mkdtempSync(join(tmpdir(), ...))` sites stop leaking
    // scratch directories that macOS only sweeps on reboot. See the file
    // header for the measurement behind this.
    setupFiles: ["tests/setup/scratchSandbox.ts"],
    globalSetup: ["tests/setup/scratchSandboxGlobal.ts"],
    // Concurrent supervisor lanes each spawning a full-width fork pool
    // oversubscribe the machine (measured 16-30min full suites vs ~3-8min
    // solo). `run-subagent.sh` exports a low cap for worker sessions;
    // solo/interactive sessions keep vitest's default parallelism.
    ...(process.env.POKEBENCH_VITEST_MAX_WORKERS
      ? {
          minWorkers: 1,
          maxWorkers: Number(process.env.POKEBENCH_VITEST_MAX_WORKERS),
        }
      : {}),
  },
});
