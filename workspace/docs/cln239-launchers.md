# cln239 — Claude-only launchers

Plan Cleanup step 3. The repo now has one supervisor script and one worker
launcher, both Claude only. Parent of this step (recovery base): `30360d7cf`.

## Kept

- `run-supervisor.sh` (rewritten): `--headless`, `-c`, `--log`, `--print-config`,
  `-S` / `-s` with `claude` and the aliases `opus` `sonnet` `fable` `haiku`
  (alias in either slot picks Claude and that model), the `DEFERRED.md` OPEN
  check (exit 6) and the `tools/run-claude-supervisor.py` headless path. The
  cron call `./run-supervisor.sh --headless -S opus -s sonnet -c 10 --log <path>`
  is unchanged; `--print-config` of it exits 0 with Opus 5.5 / Sonnet 5.5.
- `tools/run-subagent.sh` (rewritten): `-c`, `-m` (Claude names and aliases),
  `-s claude|sonnet|opus|...`, `--lane ts|side|integration`, `--base`, `--log`,
  `--brief-file`/`--brief`, `--read-only`/`--audit`, `--print-config`, exit 4
  (live lane) and 42 (usage limit), the `POKEBENCH_ROLE=worker` refusal (exit 3)
  and the integration worktree setup (reference symlink, npm install, wasm seed,
  Battle Scene ON oracle).
- `tools/{claude-model-policy,oracle-profiles,resolve-harness-root}.sh`,
  `tools/{stream-pretty,stream-summary}.mjs`, `tools/run-claude-supervisor.py`
  and its test, `tools/backup-logs-to-r2.sh`.
- `tools/autonomy/`: `bin/tar`, `bootstrap-ubuntu.sh`, `verify-runner.sh`,
  `prepare-reference-assets.sh`, `versions.env`, `reference-assets.sha256`,
  `oracle-smoke-trace.json`, `README.md` (rewritten to the runner bootstrap).
  `bootstrap-ubuntu.sh` no longer installs the codex CLI, `verify-runner.sh` no
  longer requires it, and `versions.env` drops `POKEBENCH_CODEX_VERSION`.

## Removed (all unreferenced by kept code, proved by `git grep` before deletion)

| Path | Why dead |
| --- | --- |
| `tools/codex-model-policy.sh`, `tools/deepseek-worker-policy.sh` | only sourced by the old launchers |
| `tools/codex-git-attribution.sh`, `tools/test-codex-git-attribution.sh`, `tools/git-hooks/prepare-commit-msg` | Codex commit-trailer hook; only sourced by the old launchers (hits left: PAPERCUTS history) |
| `tools/run-codex-worker-with-deadline.py` (+ `test_…`), `tools/run-with-deadline.py` (+ `test_…`) | only called by the Codex/OpenCode launch paths |
| `tools/archive-codex-sessions.py`, `tools/codex-stream-pretty.mjs`, `tools/codex-stream-summary.mjs`, `tools/opencode-stream-summary.mjs` | Codex/OpenCode transcript tooling |
| `tests/codexLauncherProfiles.test.ts`, `tests/opencodeStreamSummary.test.ts` | tested only the removed paths; replaced by `tests/launcherProfiles.test.ts` (19 Claude-only cases) |
| `tools/autonomy/{run-lane.sh,install-systemd.sh,backup-refs.sh,test.sh,autonomy.env.example}`, `tools/autonomy/systemd/*` | animation/rust campaign runner and its timers (retired campaigns; docs already said so) |

Animation and rust supervisor lanes are gone from both scripts: `--lane animation`
and `--lane rust` now fail with exit 2 and a clear message, as do `-S codex`,
`-s deepseek|opencode`, `--max-mode` and `-e/--effort`.

## Moved (`git mv`, content unchanged) to `docs/archive/`

`ANIMATION_{SUPERVISOR,UNATTENDED,DEFERRED,PROGRESS}.md`,
`RUST_{SUPERVISOR,UNATTENDED,DEFERRED,PROGRESS}.md`. No test or tool reads them;
the remaining mentions are source comments and historical docs, left as is.
Stay in place: `ANIMATION_COVERAGE.json`, `ANIMATION_LATCHES.md` (read by
`tests/animation/*`), `ANIMATION_VERIFICATION.md` (read by `tools/integration/*`),
`ANIMATION_INTEGRATION_{BRIEF,PROGRESS,SUPERVISOR}.md` (read by
`tools/run-subagent.sh`, `tools/integration/remainingAdaptersCensus.mjs`, cited
by S10A and by SUPERVISOR/AGENTS/LOCAL_SETUP).
Known dangling mentions, not touched because core-rs is out of scope (step 4):
`core-rs/README.md` links `../RUST_PROGRESS.md` and `../RUST_SUPERVISOR.md`, and
core-rs comments cite `RUST_PROGRESS.md` / `RUST_SUPERVISOR.md`.

## Docs

`SUPERVISOR.md`, `AGENTS.md`, `LOCAL_SETUP.md`, `ANIMATION_INTEGRATION_SUPERVISOR.md`,
`tools/autonomy/README.md` and the top-level `../README.md` describe only Claude.
Removed: Codex routing rubric (Terra/Luna/Sol), max mode, DeepSeek fixed-route
text, the animation-supervisor fold protocol. Kept: headless discipline, stop
files, verification, gates, ts/side/integration lane sections. `ROADMAP.md` only
had its log-backup note reworded. `run-agent.sh` and `tools/run-subagent.sh` no
longer point at "the Stage 8 reset in ROADMAP.md"; they cite ROADMAP "Current
execution priority" and `docs/cax31-session-handoff.md`.

## Justified remaining `codex|deepseek|opencode` hits

`git grep -i "codex\|deepseek\|opencode"` over kept scripts and docs
(excluding `docs/archive`, fixtures/receipts, `src/` comments, PAPERCUTS and
scout docs):

- `run-supervisor.sh`, `tools/run-subagent.sh`: header/usage/error text saying
  these providers are rejected (that is the "fails clearly" requirement).
- `.codex-logs/` in the two launchers, `ROADMAP.md`, `tools/autonomy/README.md`,
  `ANIMATION_INTEGRATION_SUPERVISOR.md`, `ANIMATION_INTEGRATION_PROGRESS.md`:
  historical, gitignored log directory name; `/srv/pokebench/ops/daily-run.sh`
  passes `.codex-logs/supervisor/...` to the cron command, so it stays.
- `tools/backup-logs-to-r2.sh`: backs up existing `.codex-logs` / `.opencode-logs`
  history by name.
- `SUPERVISOR.md`, `LOCAL_SETUP.md`, `../README.md`: the removal notices.
- `LOCAL_SETUP.md` (archive transcripts; branch `codex/recovered-physical2-20261002`),
  `docs/cax31-arm-runner.md`, `docs/cax31-session-handoff.md`, `docs/finish-plan.md`
  (the plan item that scheduled this step), `docs/next-adapters-idle94.md`,
  `ANIMATION_INTEGRATION_PROGRESS.md` (dated history, one cites the deleted
  `codexLauncherProfiles` test): historical records, left unedited.

## Recovery

Everything is in git at the parent. Restore any removed or moved path with
`git checkout 30360d7cf -- <path>` (for moves, restore the old root path; the
archived copy stays). Revert a whole commit of this step with `git revert`.

## Verification

Commands and results are in the final report of this step (print-config matrix,
`tests/launcherProfiles.test.ts`, `python3 tools/test_run_claude_supervisor.py`,
`bash -n`, typecheck, `npm run test:smoke`, `npm run build`,
`tests/gate6CoverageManifest.test.ts`).
