<!-- Read-only worker report (Cleanup 7 scout, 2026-11-07, Sonnet 5.5, ~3 min). Saved verbatim by the supervisor; reference counts are a basename heuristic, not runtime proof. -->

# Scout report: finish-plan Cleanup step 7, evidence JSON out of git

Nothing was edited or committed. Scratch files are only in `/tmp`.

The main finding: step 7 is mostly a policy and ignore-path change. About 590 MB of tracked evidence looks write-only, but its basename-reference tests couldn't prove that, so a `git rm --cached` set needs a runtime check first (see Caveats).

## 0. What the repo and the plan say today

- `docs/finish-plan.md:253` says only: "Evidence JSON stops going into git (R2 via `tools/backup-logs-to-r2.sh` or an evidence repo). No history rewrite."
- `.gitignore` already ignores `/tools/compare/out/`, `/tools/probe/out/`, `/artifacts/`, `/oracle-output/`, `/battle-lab-output/` and `.integration/`. It has no entry for the tracked evidence directories.
- `tools/backup-logs-to-r2.sh` is not an evidence backup:
  - It archives only `.codex-logs`, `.opencode-logs` and one hardcoded Claude transcript dir. That dir is a macOS path, `-Users-<name>-Developer-…-warm-bison`.
  - It uses BSD `stat -f`, so it won't run on this Linux host as written.
  - It needs a local `r2` rclone remote. `ROADMAP.md:132` documents it as a log backup only.
- Repo size: 33,431 tracked files. The git pack is 320 MB, which history rewrite is out of scope for. Tracked bytes on disk are about 1.9 GB.

## 1. Tracked evidence inventory

Sizes come from `git ls-files` plus `stat`. "Referenced" means the file's basename appears as a token in `tests/`, `src/` or `tools/` code. That is a static heuristic, not proof of what runs.

| Path | Files | Size | Basename referenced from tests/src | Referenced only from tools/ | Not referenced |
|---|---|---|---|---|---|
| `tools/compare/evidence` | 788 | 625.8 MB | 72 files, 35.4 MB | 263 files, 376.0 MB | 453 files, 214.4 MB |
| `tools/integration/fixtures` | 22,589 | 280.4 MB | 815 files, 33.4 MB | 551 files, 9.3 MB | 21,223 files, 237.7 MB |
| `tools/compare/fixtures` | 1,204 | 34.8 MB | 975 files, 30.7 MB | 53 files, 3.9 MB | 176 files, 0.3 MB |
| `tools/probe/receipts` | 69 | 6.1 MB | 59 files, 5.0 MB | not computed | 10 files, 1.2 MB |
| `docs/probes/*` | about 280 | about 6.9 MB | 1 file (4.3 MB) | not computed | the rest, about 2.2 MB |
| `tools/compare/traces` and `traces-groundtruth` | 296 | 1.5 MB | 103 + 0 files | not computed | 93 + 37 files |
| `tests/fixtures/*` | 283 | 46.5 MB | nearly all | not computed | `…residual-boundaries-v1` and `…residual-instruction-events-v2` (about 250 KB) |

Other notes on the table:
- **`tools/compare/evidence`** holds 442 `.gz`, 167 `.json`, 178 `.txt` and 1 `.md`: per-move `*-changemap-*.json`, `*-dense-state.json.gz`, `*-raw-rgb.tar.gz`, source audits.
- **`tools/integration/fixtures`** is 21,785 `.json` plus 410 `.txt`, `.diff`, `.png`, `.tsv` and `.log` files.
  - The biggest subdirectory is `order-consumer-activation`: 56 files, 104.6 MB, mostly `.log`. Only `tools/integration/issue142ShadowRowsOrderConsumer.py` names it, and 22 files are referenced by name.
  - Next are the top-level files (1,040 files, 16.2 MB), `prep8-sprites` (7.0 MB), `prep7-sprites` (5.4 MB) and `audit-19` (873 files, 5.0 MB).
- **`docs/probes`**: `mid-battle-switch-oam` is 159 files, 5.2 MB. `mid-battle-switch-ball-fade-palette` (35 files) and `mid-battle-switch-party-summary` (79 files) have no basename references.
- **`tests/fixtures`** is real test input (ROM dumps, M4A and VBlank traces, construction cycles). Keep it in git. The big ones are `factory-m4a-source-state-v3` (26.7 MB) and `factory-vblank-workload-internal-v2` (9.4 MB).
- **`src/data/gen`, `src/assets/gen`, `src/animation/assets`** are generated inputs that `src` reads (about 71.8 MB, 17.8 MB and 6.3 MB). They are not evidence.
- **`docs/gate6-coverage-manifest.json`** (5.4 MB) and **`docs/gate6-coverage-manifest.md`** (1.8 MB) are tracked docs, not read-checked.

**Top 20 largest tracked evidence files** (all under `tools/compare/evidence/` unless noted):

| Size | File |
|---|---|
| 38.7 MB | `tri-attack-changemap-player.json` |
| 38.7 MB | `tri-attack-changemap-opponent.json` |
| 14.4 MB | `sky-uppercut-changemap-opponent.json` |
| 14.4 MB | `sky-uppercut-changemap-player.json` |
| 13.2 MB | `zap-cannon-changemap-opponent.json` |
| 13.2 MB | `zap-cannon-changemap-player.json` |
| 8.9 MB | `thunderbolt-changemap-opponent.json` |
| 8.9 MB | `thunderbolt-changemap-player.json` |
| 7.5 MB | `tools/compare/fixtures/dig-evidence.json` |
| 7.4 MB | `tools/compare/fixtures/solar-beam-evidence.json` |
| 4.8 MB | `hyper-beam-changemap-opponent.json` |
| 4.8 MB | `hyper-beam-changemap-player.json` |
| 4.7 MB | `curse-changemap-ghost-player.json` |
| 4.7 MB | `curse-changemap-ghost-opponent.json` |
| 4.4 MB | `water-pulse-changemap-player.json` |
| 4.4 MB | `water-pulse-changemap-opponent.json` |
| 3.8 MB | `destiny-bond-changemap-opponent.json` |
| 3.8 MB | `destiny-bond-changemap-player.json` |
| 3.7 MB | `will-o-wisp-changemap-player.json` |
| 3.7 MB | `will-o-wisp-changemap-opponent.json` |

Not evidence, but also large: `tests/fixtures/factory-m4a-source-state-v3/anchor.json` (12.2 MB), `liliana.json` (7.5 MB) and `factory-varied.json` (7.0 MB). These are test inputs.

**Keep in git (read by tests or src):**
- `tests/fixtures/*` (46.5 MB).
- The 72 `tools/compare/evidence` files named in tests (35.4 MB), for example `sheer-cold-changemap-*.json`, `fissure-*-full-state.json.gz`, `will-o-wisp-*-dense-state.json.gz`, `water-spout-changemap-*`, `leaf-blade-changemap-*.txt` and `revenge-assets.json`.
- `src/animation/assets/revenge-purple-scratch-swipe.json` embeds `sourceReceipt: tools/compare/evidence/revenge-assets.json` as a string, so that receipt is effectively pinned.
- `tools/compare/fixtures` (975 of 1,204 files are referenced by tests; 319 test files name the directory).
- The `tools/integration/fixtures` subdirectories tests enumerate, such as `lend-live` (read via `readdirSync`), and `audit-15` to `audit-20/scenarios/*.json`, which the probe runners default to.
- `tools/probe/receipts` (52 test files name the directory).
- The `tools/compare/traces` files that tests or src reference (103).

**Write-only candidates:**
- About 590 MB in `tools/compare/evidence`: the 453 unreferenced files plus the 263 tools-only files, minus anything a kept probe re-reads. This includes both tri-attack changemaps (77 MB), `sky-uppercut` (28.7 MB), `zap-cannon` (26.4 MB), `thunderbolt` and the `*-raw-rgb.tar.gz` archives.
- About 238 MB of unreferenced files in `tools/integration/fixtures`, led by `order-consumer-activation` (104.6 MB) and the `prep7`/`prep8`/`sprite-order-*` dumps. Most of this is probably covered by finish-plan step 1 (delete one-offs and the fixtures only they read).
- The no-reference `docs/probes/*` subdirectories (about 2.2 MB), and `tools/compare/fixtures/dig-evidence.json` and `solar-beam-evidence.json` (14.9 MB). Those two still need a reader check.

## 2. What writes evidence into tracked paths

- **Per-move scripts hardcode tracked evidence paths.** About 447 files under `tools/compare/` (`*Evidence.ts`, `*Probe.py`, `*SourceAudit.ts`) name `tools/compare/evidence/…`. `auroraBeamEvidence.ts` and `bonemerangEvidence.ts` are examples that hardcode changemap, dense-state and raw-rgb paths. Step 1 deletes most of these.
- **About 162 `tools/integration` scripts name `tools/integration/fixtures`** and write there. Examples are the `audit15Run.sh` to `audit19Run.sh` family and `issue142ShadowRowsOrderConsumer.py`.
- **`tools/probe/*.py`:** 176 of the `OUTPUT_PATH` assignments I counted take the path from `sys.argv`, so there is no tracked default. The risk is in how callers pass the path. Only `generate-factory-ai-spdefup-fixtures.ts` defaults to a tracked directory (`tools/battle-lab`).
- **Already safe:** `liveAdapterFramebuffer.ts` takes `POKEBENCH_LIVE_EVIDENCE_DIR`, and its receipts show it pointed at `.integration/validation/…`, which is ignored. The compare tool's own output goes to the ignored `tools/compare/out`. Workers then copy results into `tools/compare/evidence` by hand or by script, and that copy is the leak.
- There is no single `EVIDENCE_DIR` constant to flip. It's about 447 + 162 scripts.

## 3. R2 on this host

- **rclone:** not on `PATH`. **`~/.config/rclone`:** absent. **R2/AWS/Cloudflare/`RCLONE_*` env vars:** none set. No `.env` file at the repo or parent level.
- **Verdict:** no R2 remote is configured here, so the script can't run until someone installs rclone and creates an `r2` remote. I did not look for the remote on other machines.

## 4. One-commit plan

1. **Land it after finish-plan step 1** (script and fixture deletions), so you don't `git rm --cached` files step 1 deletes anyway.
2. **`.gitignore` additions.** Ignoring a tracked path doesn't untrack it, so these only stop new files being added:
   - `/evidence/`
   - `/tools/compare/evidence/**` with a negation list for the 72 test-read files. Alternatively, leave that directory alone and only ignore a new `/evidence-out/`.
   - `/tools/integration/fixtures/*-raw/`, `*-receipt-raw/` and `order-consumer-activation/`
   - `/docs/probes/**/*.json` for new probe dumps
   - `*.tar.gz` and `*-dense-state.json.gz` under `tools/compare/evidence`
   - Keep `tests/fixtures`, `tools/compare/fixtures` and `tools/probe/receipts` unignored.
3. **Output-path defaults.**
   - Change shared helpers, not 600 scripts. In `liveAdapterFramebuffer.ts` and the common `tools/compare` and `tools/integration` helpers, default to `.integration/evidence/<stepid>/`, which is already ignored.
   - Add `tools/evidence-sync.sh <dir>`: an rclone copy to `r2:pokebench/pokeemerald-factory/evidence/<date>/`, additive-only like the logs script.
   - Fix the existing script's hardcoded macOS `CLAUDE_PROJECT_DIR` and BSD `stat -f`.
   - Retarget the one tracked default in `generate-factory-ai-spdefup-fixtures.ts`.
4. **AGENTS.md policy line, proposed text:** "Evidence (receipts, changemaps, dense-state, raw RGB, probe dumps) is not committed. Write to `.integration/evidence/`, sync with `tools/evidence-sync.sh`, and commit only the small checked-in fixture a test reads, plus a one-line pointer in the report."
5. **`git rm --cached` going forward.** Do this only for files with no runtime reader:
   - the 453 unreferenced `tools/compare/evidence` files (214 MB);
   - after step 1, `order-consumer-activation/*.log` (104.6 MB), if its one reader tool is deleted;
   - the no-reference `docs/probes` subdirectories.
   - Do not remove the 263 tools-only evidence files (376 MB) until the runtime check below. Back up all removed files to R2 first.
6. **Tests that would break.**
   - Any of the 72 tests-referenced evidence files, if wrongly untracked, would fail on a fresh clone. Examples are `sheer-cold-changemap-*`, `fissure-*-full-state`, `revenge-assets.json` and the `leaf-blade` and `magical-leaf` changemaps.
   - Also unsafe to untrack: `lend-live/*.json` and the `audit-N/scenarios` and `patches` directories (read by `readdirSync` and the probe runners).
   - Tools-only evidence may be read by a kept `*Evidence.ts` that a test spawns, which is why the runtime check matters.

## Caveats

- Reference classification is static basename matching. It misses paths a test builds with a template string, and it can't tell reader from writer for the "tools-only" group.
- Runtime check, to run before the `git rm --cached` commit: move candidate files aside and run the full `npm test`. That is the only reliable check.
- A step 1 dependency exists. Finish-plan step 1 and step 7 overlap on the same fixtures. Order matters.
- I did not measure which tests are in `test:gate`, and I did not open `docs/cax31-session-handoff.md` or AGENTS.md beyond a keyword grep.
- Worktree state: this report introduces no repo changes, and the status was clean when I started. I didn't re-run `git status` at the end.
