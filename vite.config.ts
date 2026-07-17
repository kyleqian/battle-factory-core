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
  },
});
