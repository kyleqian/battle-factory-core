# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1372 — [supervisor orient, 2026-08-22 11:25] **`animation-main` folded (fast-forward to `df60c00a`, +16: Lovely Kiss + Octazooka exact, Hail evidence; coverage 200/276 Level-50 exact); baseline green on the union; `rust-main` 0 ahead**

- **State:** master = `df60c00a` = `animation-main` tip (their supervisor had
  just merged master, so the fold was a fast-forward; no net change to
  `src/engine/**`). Supervisor-independent baseline on the union: full
  `npm test` **1,086 files / 10,196 passed / 223 skipped**, `npm run build`
  green. Both sibling supervisors (animation, rust) are LIVE this session —
  fold again at wind-down. `check-oracle-freshness.sh` FAILs both ports, but
  the only oracle-side commit since 8014 started (`3e29880b`, 08-15 09:51,
  walk-up staging) was committed 6 min after that process started from the
  same working tree and the walk-up program has run against it since —
  judged client-only (same verdict as entry 821); not restarting shared
  oracles under two live sibling sessions.
- **Next (in flight):** side lane = ISSUES #102 from its live seed-138 repro
  (Opus, diagnostic); ts lane = string-resolver sibling sweep (#106 + #107 +
  census of every reachable placeholder gap); supervisor background = the 7
  carry-28 seeds from 1370 re-run at `--max-frames 4000000` to see what
  breaks past round 5.

---

## 1371 — [supervisor close, 2026-08-20 16:00] **Bonus round folded: final-tree `winning` 0:240 (1370) reaches carry ≥ 28 in 7/240 (2.9%), ≥ 21 20.0%, ≥ 14 90.8% — deepest seeds hit the 1M-frame budget mid-round-5 (instrument ceiling, not a wall); draft heuristic re-measured n=30 (neutral, stays withheld on `wip/mb-step2b-draft-heuristic` @ `18222b3a`); #106 + #107 filed; #102 re-reproduced live (seed 138)**

- **State:** docs-only since 1369's gates; tree clean. Cherry-picked the side
  §6 measurement doc (`18222b3a` → `7b53b7a2`) onto master; ISSUES **#107**
  filed (STRINGID_PKMNSUBSTITUTEFADED `{B_DEF_NAME_WITH_PREFIX}` resolver;
  seeds 27/29 on the wip branch). `animation-main` is **+5 unfolded** at
  close (sibling session live until 18:00) — fold at next orient;
  `rust-main` 0.
- **Next (in order):** (1) string-resolver sibling sweep as ONE step — #106
  (Beat Up `STRINGID_PKMNATTACK` `{B_BUFF1}` via Metronome) + #107 + every
  remaining `{B_ATK_NAME_WITH_PREFIX}`/`{B_DEF_NAME_WITH_PREFIX}`/`{B_BUFF1}`
  STRINGID reachable in Factory singles without a `messageLines` case (five
  were found one at a time today); (2) #102 now has a live repro (seed 138)
  — diagnose + fix; (3) raise or parametrise the `winning` frame budget
  (`--max-rounds` exists) so the challenge-4+ tier is swept for crashes
  rather than truncated at 1,000,000 frames; (4) draft heuristic: n ≥ 180
  before any fold; (5) #104 remainder (YES-branch "battle was recorded"
  message needs an OFF trace). DEFERRED.md: none open.
- **Notes:** the session's final numbers for the user: morning 35.6% / 5.6%
  / 0% / 0% (carry ≥ 7/14/21/28, 08-19 semantics) → close 100% / 90.8% /
  20.0% / 2.9% (new semantics, 1M-frame budget, 0:240). 11 main + 8 side
  worker rounds, 3 cap-kill salvages, 0 regressions folded. Supervisor
  papercut of its own: an unquoted heredoc mangled this entry's first draft
  (backticks ran as commands) — always `<<'EOF'` for ledger text.

---

## 1370 — [main worker, 2026-08-20] **M-B step 3 re-run: honest `winning` 0:240 depth sweep on the new soak semantics — carry ≥ 28 reached at 7/240 (2.9%), 238 OK / 2 CRASH (both triaged) / 0 HANG**

- **State:** docs-only. `docs/soak-deep-sweep-2026-08-20-semantics2.md` +
  `.log` (new), `ISSUES.md` (#106 filed; #102 given a fresh live repro at
  seed 138 instead of a new number, same exact signature), `PROGRESS.md`
  (this entry; 1367 archived). No `src/`/`tools/` changes. `npm run
  test:smoke` **444/444** green (docs-only step, no full suite/build
  required per the brief).
- **Did:** swept `winning --seeds 0:240 --render-every 0` as 3 sequential
  batches of 4 parallel foreground processes (20-seed chunks, ≤4 concurrent
  per the brief; ≈24.7 min wall-clock for all 240). Result: **238 OK
  (all `budget`) / 2 CRASH / 0 HANG**. Depth: carry ≥7 240/240 (100%), ≥14
  218/240 (90.8%), ≥21 48/240 (20.0%), **≥28 7/240 (2.9%) — seeds 24, 63,
  78, 92, 190, 222, 233**; no seed reached carry 29+. Verbose-confirmed
  seeds 24 and 63 (both carry 28, depth 28): genuine continuous play
  (draft → 4 full round wins → into round 5, challengeNum
  `floor(28/7)=4`, the "challenge-4" AI tier), still mid-resolution
  (battle 3 of round 5) when the 1,000,000-frame instrument budget expired
  — an instrument ceiling, not a crash/hang/wall. Table against the 08-19
  0:180 sweep and the pre-#104 0:480 sweep is in the doc, flagged
  explicitly as NOT apples-to-apples (both used the old grace-based OK);
  only this sweep and the supervisor's 0:60 (PROGRESS 1369) share the new
  semantics and are genuinely comparable (218/240=90.8% vs 56/60=93.3% at
  carry≥14, 48/240=20.0% vs 13/60=21.7% at carry≥21, 7/240=2.9% vs
  1/60=1.7% at carry≥28 — consistent, no regression).
- **Triage:** seed 138 crash is the **exact** stack/message as the
  existing ISSUES #102 (`Cmd_switchhandleorder`, no decided
  `monToSwitchIntoId`, battler 1) — #102 was marked non-reproducing on
  HEAD; updated it in place with this fresh live repro rather than opening
  a new number. Seed 203 crash is new: Beat Up's `STRINGID_PKMNATTACK`
  ("{B_BUFF1}'s attack!") has no `B_BUFF1` resolver, hit via move 118
  (METRONOME) presumably calling Beat Up — filed **ISSUES #106** with the
  source-traced lead (`battle_scripts_1.s:1946-1951`
  `BattleScript_BeatUpLoop`). Neither fixed this session (docs-only step,
  `src/` off-limits per the brief).
- **Next:** (1) fix #106 (Beat Up `B_BUFF1` resolver — get a direct
  non-Metronome Beat Up repro first to isolate the path); (2) #102 now has
  a live seed (138) again — capture full `battlerOrder`/fainting context
  from it before generalizing a fix, per its own standing "Next session"
  item; (3) ROADMAP soak-policy block should record the new OK/HANG
  definition (supervisor TODO, carried from 1369); (4) `full`/`vanilla`
  0:240-scale re-sweeps on the new semantics are still outstanding (only
  `winning` was in this step's scope).
- **Notes:** no PAPERCUT. Landed inside the 45-min hard cap (~30 min used
  through triage + docs; smoke run and commit still within budget).

---
