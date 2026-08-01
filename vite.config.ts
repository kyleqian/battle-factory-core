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
    // The parallel-worker lane (`tools/run-subagent.sh --worktree`) checks a
    // second copy of the repo out under `.worktrees/`; without this exclude
    // vitest's default glob picks those tests up too while a worktree is live.
    exclude: [...configDefaults.exclude, "**/.worktrees/**"],
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
