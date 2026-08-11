# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1135 — [supervisor, 2026-08-11] **Animation tail folded; generic transition seam next**

- **State:** `master` includes `animation-main` through `5123b455`; `rust-main`
  had no unmatched commit. The union is green and both oracle profiles are
  fresh. S8 remains closed; the canonical Battle-2 march stays stopped at
  tick 33331.
- **Did:** folded the Metal Sound evidence tail (`a95c8e49`) and independently
  verified the union: `npm test` **947 files / 8,683 passed / 1 skipped** and
  production build **642 modules**. Restarted both stale post-fold oracle
  processes; freshness and OFF `bin/oracle info` pass.
- **Next:** implement and densely prove the generic RNG-selected Frontier
  transition owner beginning at the staged nonzero-index residual frame 11338.
  Stop at the already-proven generated intro/command boundary; do not resume a
  canonical Battle-2 action or change battle logic/RNG.
- **Notes:** #55's separate construction-clock remainder stays null/unwired.
  No material decision is deferred.

## 1134 — [solo session, 2026-08-11] **Repo promoted to pokeemerald-factory-core; rust lane born**

- **State:** this run IS now the canonical standalone repo at
  `pokebench/pokeemerald-factory-core` — repo top = human/planning + shared
  oracle infra; this `workspace/` = the agent layer (contents unchanged, one
  `git mv`). GitHub origin re-wired as a fast-forward continuation
  (`kyleqian/pokeemerald-factory-core`); **pushing is the user's step from
  now on — commit locally, never push.** The old harness and its run copy
  are FROZEN; never work there.
- **Did:** user decisions executed: **Rust chosen for the rewrite** —
  `core-rs/` cargo workspace born (factory-core with the rng.ts port pinned
  to TS-generated values 4/4, factory-wasm wasm32 build proven; ledger
  `RUST_PROGRESS.md` R1, charter `RUST_SUPERVISOR.md`); supervisor/worker
  lane **"main" renamed to "ts"** ("main" stays a silent legacy alias);
  **rust lane wired** (`./run-supervisor.sh -l rust` → persistent
  `.worktrees/rust-main`; `./tools/run-subagent.sh --lane rust`). Fixed
  three restructure seams (lane worktrees check out the whole repo → cd
  into the `workspace/` subdir; harness root resolves via the git-common-dir
  primary, not the worktree copy; repo-top `reference/pokeemerald` symlink
  restored) and end-to-end tested both lane launches with a stub supervisor.
  **Imported the 4 unfolded animation-main commits** the clone had dropped
  (Metal Sound probe track/evidence, import `920d5e16`) — this resolves
  1133's "newer Metal Sound evidence commits not folded" flag. Migrated all
  gitignored state (node_modules, .codex-logs, .opencode-logs,
  tools/compare/out evidence, oracle/battle-lab output).
- **Next:** unchanged from 1133 — #55 post-command MPlay state
  capture/reduction with costs null and the clock unwired; presentation
  seam per 1133. Next ts supervisor should fold `animation-main`
  (import commit) at orient as usual.
- **Notes:** post-move verification: full `npm test` **946 files / 8,680
  passed / 1 skipped**, build green, vanilla soak **20/20**, `cargo test`
  **4/4**, wasm32 artifact builds. Both oracles now serve from the new repo
  top (:8014 OFF / :8012 ON). TS stays canonical while the rust lane ports;
  the animation lane continues in TS by user decision.

## 1133 — [supervisor, 2026-08-11] **Generic Battle-2+ start seam proven; wind-down green**

- **State:** master is green through `e55fe305`. A nonzero-index `battleStart`
  now has staged OFF proof from LILIANA's room quote through the real next
  command request, without a battle/turn/tick production branch. S8 stays
  closed and the canonical Battle-2 march remains stopped at tick 33331.
- **Did:** folded `animation-main` through `77201333`; then banked exact generic
  Battle-2 room-dismiss **30/30**, black handoff **43/43**, generated intro
  **238/238**, and action-ready **3/3** windows (each twice fresh; independent
  intro **238/238** and prior LILIANA **115/115** reruns). The #55 audit joins
  **113/113** MPlay rows: **5/5** zero-pass calls close at 864 cycles; **108**
  one-pass rows fail closed on missing post-command `Track.flags`/`chan` state.
- **Next:** for #55, capture/reduce that post-command MPlay state; keep costs
  null and the construction clock unwired until all 108 rows compose. For the
  presentation seam, retire the generic RNG-selected transition residual from
  frame 11338; do not extend into a Battle-2 action window.
- **Notes:** final `npm test` **946 files / 8,680 passed / 1 skipped**
  (**117.75s**), build **642 modules** (Vite **6.47s**), vanilla soak **20/20**
  (**33.9s**), and full-policy soak **60/60** (**284.4s**) are green with **0
  crash / 0 hang**. OFF oracle is fresh. `animation-main` has newer Metal
  Sound evidence commits not folded at wind-down. No material decision is
  deferred.
