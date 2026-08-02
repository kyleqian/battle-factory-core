# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 851 — [bounded MAIN worker, 2026-08-01] typed opponent-faint owner introduced; live field remains pending atomic rebase

- **State:** `ae5e5457`, tree clean. Baseline was green: `npm test` 589
  files / 6,112 passed / 1 skipped and build green; Scene-OFF `bin/oracle
  info` answered. Exact old-field census remains **48** (10 src / 38 tests)
  until the atomic migration.
- **Did:** added immutable `OpponentFaintPresentationOwner` + one-shot
  `OpponentFaintDismissEdge`; it composes the real turn-13 resolution and
  MURKROW switch adapters, and atomically publishes accepted edge, frozen
  cursor, and automatic continuation. New Tier-1 owner tests (3/3) and build
  are green.
- **Next:** wire readiness/producer, rebase every Murkrow continuation anchor
  from the owner edge, then delete the flat field only with all consumers
  migrated; do not touch the dispatcher-family debt.

---
## 850 — [supervisor session open, 2026-08-01 22:40] animation-main folded; #39 item-7 + dispatcher-design lanes launching

- **State:** master `2036472f` (fold of animation-main's 3-commit
  ZIGZAG_SLOW family, additive animation files only). Union full
  `npm test` 589 files / 6,112 passed / 1 skipped + `npm run build`
  green. DEFERRED.md empty. Oracle freshness FAIL on 8014/8012 verified
  as the known false positive: every harness commit after each service
  start touches only `_template/` or the `bin/oracle` CLI wrapper.
- **Plan:** per entry 847 — MAIN lane executes ISSUES #39 item 7
  (`opponentFaintDismissElapsed` → typed owner, brief defers to
  `docs/opponent-faint-dismiss-owner-prep.md`, Terra/max, 75-min cap);
  SIDE lane banks the dispatcher-generalization design dossier
  (13 `TurnN...NextCommandHandoff` census + slice plan, new files only,
  Terra/max). Then dispatcher slices per the dossier.

---
## 849 — [user-directed maintenance, 2026-08-01 22:20] vitest fair-shares the box; 88,808 scratch dirs / ~210 GB reclaimed

- **State:** full `npm test` 588 files / 6,107 passed / 1 skipped, build
  green, tree clean. $TMPDIR down from 103,881 entries to 15,073.
- **Did:**
  - **Vitest worker oversubscription (user report).** Root cause: only
    `tools/run-subagent.sh` exported `POKEBENCH_VITEST_MAX_WORKERS` (4).
    `run-agent.sh` and `run-supervisor.sh` export nothing, so every
    supervisor and interactive session ran at vitest's default of
    `availableParallelism() - 1` = **15 forks**. Measured solo: uncapped =
    15 forks / 167s / ~83 GB peak tree RSS; `MAX_WORKERS=4` = 4 forks /
    329s / ~36 GB. (RSS sums overcount shared copy-on-write pages — upper
    bounds, the ratio is what matters.)
  - **Fix (user chose fair-share over a flat cap):** `vite.config.ts`
    `resolveMaxWorkers()` counts live peer vitest parents via `ps` and
    divides the core budget; explicit env still wins; floor of 2; `ps`
    failure falls back to assuming solo. Verified: solo 15, explicit cap=3
    gives 3, and a second run launched against one live peer took 7
    (combined 22, vs 30 uncapped). Contended peer run stayed green.
    `tests/vitestWorkerBudget.test.ts` pins the override, the floor, and
    malformed-override handling.
  - **Swept the existing debris** (user approved): 88,808 directories,
    ~210 GB. **Two passes were needed and the reason matters:** the first
    pass found only 89 prefixes because entry 848's codemod had rewritten
    tools/ to `createScratchDir("...")`, which the sweeper's
    `mkdtempSync(join(tmpdir(), ...))` regex no longer matched. The sweeper
    now recognises BOTH spellings (208 prefixes).
  - **Corrected size attribution from entry 848.** By directory *count*
    tests are ~95% of the leak, but by *bytes* it is the reverse: the 2,671
    tools-created directories held **123.53 GB** (~46 MB each, probe RGB
    dumps and diagnostic PNGs) against ~87 GB for the 86k test directories.
    Entry 848's "95% was the suite" is true by count only.
- **Next:** ~13.4k directories were younger than 24h and were left alone;
  they age out, or sweep sooner with `--min-age-hours N`. Papercut entry
  for concurrent full-suite contention rewritten rather than deleted — the
  start-within-seconds race remains. #39 remainder untouched.

---
## 848 — [user-directed maintenance, 2026-08-01 21:40] $TMPDIR scratch leak fixed (95% was the suite, not tools/) + four papercuts retired

- **State:** full `npm test` 587 files / 6,104 passed / 1 skipped and
  `npm run build` green after the change. A full suite run now leaves
  $TMPDIR byte-for-byte unchanged (103,872 entries before and after);
  it previously leaked ~40 directories per run.
- **Did:**
  - **Scratch-directory leak.** $TMPDIR held 97k+ orphaned directories /
    262 GB. Attributing every leaked directory name back to the literal
    prefix that created it showed **~95% came from `tests/`, not `tools/`**
    (tools/ is 2.5%) — the top offenders (`pokeemerald-factory-catalog-`
    10,040, `compare-source-`/`compare-paths-`/`compare-output-` 2,503 each)
    are all test files. Fix is `tests/setup/scratchSandbox.ts` +
    `scratchSandboxGlobal.ts`: `os.tmpdir()` re-reads $TMPDIR on every call,
    so redirecting it to a per-worker sandbox captures all ~200 call sites
    with no per-site edits. Removal is owned by the globalSetup teardown
    because vitest terminates workers, so their `process.on("exit")` never
    fires. `tools/lib/scratch.ts` + a 118-file codemod covers tools run as
    their own process; cleanup there is gated on exit code 0 so a comparator
    that finds a mismatch still keeps its diagnostic PNGs.
  - **`npm run sweep-scratch`** (`tools/sweep-scratch-dirs.ts`) reclaims
    existing debris. It derives its prefix list from the source, so new
    tools/suites are swept without updating a list. Dry run reports
    **88,751 directories / 210.63 GB** older than 24h. NOT yet applied —
    awaiting the user.
  - **Four papercuts fixed and deleted:** `.rgignore` for generated
    JSON/bundles (206 files hidden from plain `rg`; note `-g` overrides it);
    `run-subagent.sh` now accepts `--reasoning`/`--reasoning-effort`,
    `--brief TEXT`, `--side-worktree`, and strips a trailing
    `-worktree`/`-lane` from `--lane`; vitest discovery pinned to
    `tests/**/*.test.ts` so nested checkouts cannot double it; ImageMagick
    entry deleted (ffmpeg is installed and is the path).
  - **Corrected a stale papercut:** the Codex-stdin entry proposed closing
    Codex stdin as the fix — `codex exec ... </dev/null` has been in the
    launcher since `1ef2c4ce` (2026-07-21), before the wedge. Entry now
    records that explicitly so nobody re-plumbs it.
  - Mirrored the generic pieces to `_template` (harness repo).
- **Next:** decide whether to run `npm run sweep-scratch --apply` (210 GB);
  open question from the user on vitest worker counts across concurrent
  sessions. #39 remainder (`opponentFaintDismissElapsed`, dispatcher debt)
  is untouched.
- **Notes:** `tools/` is not in `tsconfig.include`, so the 118-file codemod
  had no compiler safety net — it was verified by parsing every modified
  file with the TypeScript parser, asserting import/usage consistency per
  file, and the full suite (15 suites import `tools/compare` modules).
  `tests/toolsScratchDir.test.ts` pins both directions of the exit-code
  gating.

---
> **STANDING ARRANGEMENT (user directive, 2026-07-26):** the animation
> program runs under its own supervisor (`./run-supervisor.sh --lane
> animation`, guide `ANIMATION_SUPERVISOR.md`) in the persistent
> `.worktrees/animation-main` worktree on branch `animation-main`. Main
> supervisor: never brief animation work; fold `animation-main` into
> `master` at orient when it has new commits (details in SUPERVISOR.md's
> parallel-workers note). This replaces the temporary animation pause —
> entry 468's animation items are the animation supervisor's backlog now.

## 847 — [supervisor wind-down, 2026-08-01 21:00] turns 3+4 retired same-session — ALL FOUR remaining turn flags gone; turn-5 OFF reader set banked

- **State:** master `ab316a5e`, tree clean. Final union full `npm test`
  exit 0 + `npm run build` green (20:47-20:53 run; suite summary garbled
  by the pipe but vitest exits nonzero on any failure, and the 2m31s build
  reflects animation-lane contention only). Session: 3 workers, 3 landings,
  0 failures, no exit-42. `turn1-4Resolved` are ALL retired — `#39`
  remaining: `opponentFaintDismissElapsed` (item 7, prep doc
  `docs/opponent-faint-dismiss-owner-prep.md` — a full-cap slice: OFF
  scratch manifests + delayed +30 continuation re-anchoring), then
  dispatcher debt. DEFERRED.md empty.
- **Did:** (1) folded `animation-main` twice (8 commits at orient
  `ca227c9c`, 12 more at 20:46 `ab316a5e`); (2) MAIN turn-3 slice landed +
  verified (entry 845; my spot compares `turn3-rockslide-off` 161/161,
  `turn4-doubleteam-off` 256/256 live); (3) SIDE banked the turn-5 OFF
  reader set (merge `b7cdbe46`, 8 fixtures / 1,168 stride-1 captures;
  I verified new-files-only, canonical flattened button timeline preserved
  verbatim, boundary coverage vs `docs/turn5-6-off-ground-truth.md`
  incl. the 6994/6995 input-ready edge and 7313 reopen edge, and
  reproduced `turn5-reset-off` 51/51); (4) MAIN turn-4 slice landed +
  verified (entry 846, differential 1,841/1,841; my spot compare
  `turn4-rockslide-off` 256/256 live); temp diff worktrees swept.
- **Decision (supervisor, reversible, recorded at entry 844):** banking
  the turn-5 OFF reader set was additive evidence (new files only),
  precedented by pre-adoption rank-5/6 OFF banking; it does NOT adopt the
  turns 5-8 ON-pin re-timing policy, which stays an open user question for
  when item-7/turns-5-8 re-timing work begins. Several `turn5-*-off`
  fixtures mismatch the live app (ON-timing legacy) by design — they are
  differential witnesses, not live pins (`docs/turn5-off-reader-set.md`).
- **Next session:** item 7 per `docs/opponent-faint-dismiss-owner-prep.md`
  (needs its own full worker cap), then dispatcher debt. **Unfolded:**
  `animation-main` is 3 commits ahead (ZIGZAG_SLOW family, landed 20:55
  at their session deadline while their branch was still moving) —
  fold at next orient.
- **Notes:** oracle 8014 freshness FAIL remains the known docs-only false
  positive (harness `9cadad7`/`acc5c4e`); 8012 was live all session for
  the animation program.

## 846 — [bounded MAIN worker, 2026-08-01] turn-4 predecessor retired with immutable epoch

- **State:** proof `75d9c1d3`, migration `350d5aa0`; `rg -n '\\bturn4Resolved\\b' src tests` is empty. The receipt publishes at the source-owned first choose-action callback: absolute **5352**, runtime elapsed **4312** (the 5351 handler-install tick still rejects A).
- **Did:** migrated turn-5 dispatch, generic HP/content, ENDEAVOR routing, slot-0 PP, all turn-5 clock consumers, and direct presentation calls to PP **[7,20,19,10]**, slot **0**, HP **88/1**, settled/ready, and DoBounceEffect seeds **192/128**, delta **7**, amplitude **1**. Turn-5's open and B-close/A-reopen retain the same receipt object; its existing legacy continuation phase is receipt-derived, not republished.
- **Next:** stay scoped: `opponentFaintDismissElapsed` and dispatcher debt remain #39 work; do not reopen turns 1–4.
- **Notes:** clean-parent `b7cdbe46` (`75d9c1d3^`) app replays are byte-identical: turn-4 DOUBLE_TEAM **256/256**, ROCK_SLIDE **256/256**; turn-5/6 readers **51/51 + 42/42 + 254/254 + 256/256 + 121/121 + 252/252 + 145/145 + 47/47 = 1,168/1,168**; upstream turn-3 **161/161**; total **1,841/1,841** raw RGBA captures. Focused Tier-1 **510/510** (16 files), `npx tsc --noEmit`, and `npm run build` green; full `npm test` deliberately unrun per the bounded brief.

## 845 — [bounded MAIN worker, 2026-08-01] turn-3 predecessor retired with immutable epoch

- **State:** proof `3487117c`, migration `0e7fd346` + follow-up `c0c2c228`; `rg -n '\\bturn3Resolved\\b' src tests` is empty. The receipt publishes at the
  source-owned first choose-action callback: absolute **4212**, runtime
  elapsed **3172** (the 4211 handler-install tick still rejects A).
- **Did:** migrated turn-4 dispatch, generic HP/content, DOUBLE_TEAM routing,
  slot-0 PP, all turn-4 bounce consumers, and direct presentation calls to
  PP **[8,20,19,10]**, slot **0**, HP **88/41**, settled/ready, and the
  DoBounceEffect **192/128**, delta **7**, amplitude **1** receipt. A
  turn-4 B-close/A-reopen retains the same receipt object/epoch. The
  turn-5-only fallback explicitly clears its no-longer-applicable turn-3
  receipt rather than passing a stale positional boolean.
- **Next:** stay scoped: turn 4, `opponentFaintDismissElapsed`, and dispatcher
  debt remain #39 work; do not reopen turns 1–3.
- **Notes:** clean-parent `354ebc89` (`3487117c^`) app replays are byte-
  identical: turn-3 **416/416**, turn-4 readers **512/512**, upstream
  turn-2 **237/237**, total **1,165/1,165** raw RGBA captures. Focused
  Tier-1 **528/528** (19 files), `npx tsc --noEmit`, and `npm run build`
  green; full `npm test` deliberately unrun per the bounded brief.
