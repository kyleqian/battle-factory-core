# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 901 — [bounded MAIN worker, 2026-08-03 ~22:15] Terminal-seam increments (i)+(ii) landed: win-side text is now real, resolved, and player-visible

- **State:** master `b9a9366b`. Full `npm test` green (**684 files / 6,695
  passed / 1 skipped**, 0 failures), `npm run build` green (`tsc -b && vite
  build`), `compare:differential -- battle-command-generated-off.json --base
  f420330c --summary`: **PASS — 128/128 byte-identical**.
- **Did:** Landed the parked `wip/terminal-seam-increment-i` branch (single
  commit `d64f10c3`, cherry-picked clean as `5f1b3d80`) together with
  increment (ii) in the same change, per that commit's own diagnosis that
  the two are not separable (landing (i) alone converts today's silent skip
  into a hard completeness-guard crash). A player win on the generic round
  path now actually resumes the interpreter past `checkteamslost`'s `end2`
  into a second VM run at `BattleScript_FrontierTrainerBattleWon`, drives it
  to its own `end2`, and emits real text instead of the round orchestrator
  fabricating a dismissed win-quote. Fixed all 3 RED causes the wip commit
  left open (commit `2bb9b3bc`): (1) resolver-mapped
  `STRINGID_PLAYERDEFEATEDTRAINER1`/`STRINGID_TRAINER1LOSETEXT` in
  `battleResolutionPresentation.ts`'s `messageLines` via the #72 Taunt-pair
  idiom, sourcing `{B_TRAINER1_CLASS}`/`{B_TRAINER1_NAME}` and
  `{B_TRAINER1_LOSE_TEXT}` off the already-threaded `opponentTrainer`
  (widened to carry `speechLose`); (2) wired the shared
  `resolveSingleBattlePosition` into the two test harnesses
  (`battleEndTurnOrchestration.test.ts`, `battleScriptFutureAttack.test.ts`)
  still stubbing `resolveBattlerAtPosition` to null; (3) fixed
  `battleEndTurnOrchestration.test.ts`'s fixture to carry
  `BATTLE_TYPE_TRAINER` (Factory battles are trainer battles, matching what
  production actually stages). New pins: `tests/
  presentationStringTerminalSeamWin.test.ts` asserts the DESTIN fixture's
  exact 4 resolved lines ("Player defeated"/"BUG CATCHER DESTIN!"/"PLEASE I
  NEED"/"SOME WATER", cross-checked against `battleScene.ts`'s `TURN17_*`
  ground-truth literals) plus a JENSON generalization pin (different
  facility class/name/speechLose) proving the mapping is data-driven, not
  DESTIN-hardcoded — both red-verified via `git stash --
  src/engine/battleResolutionPresentation.ts`. Census: **80→78
  UNRESOLVED** (commit `b9a9366b`). ISSUES #72's MANUAL-settlement block and
  the scout doc's §3 updated: the two win-side ids are REACHABLE-and-landed;
  `STRINGID_TRAINER1WINTEXT` (loss-path) stays open, with the loss-side
  follow-up (VARIOUS 19/20 + a fresh oracle trace — no loss-path ground
  truth exists anywhere in this repo today) now recorded in both docs.
  `wip/terminal-seam-increment-i` deleted after the merge went green.
- **Scope held:** LOSS/DRAW path kept today's direct terminal boundary
  (win-side second VM run only, per the step brief's hard limit) —
  `VARIOUS` 19/20 not registered this step. Increment (iii) (rendering the
  trainer slide-in + dismissible quote boxes before `postwin`) not
  attempted — `trainer-slide-in`/`trainer-slide-out` semantic events are
  emitted but `projectBattleResolutionCommands` has no branch for them yet,
  so they're silently absorbed with zero visual effect (no new renderer
  built, matching the step's hard limit). No RNG cursor movement from
  entering the second VM run (scout trap 4 confirmed, unchanged).
  Completeness guard untouched (stays fatal per the 2026-08-03 user
  decision).
- **Next:** loss-side terminal-seam increment (`VARIOUS` 19/20 + fresh
  oracle trace for `BattleScript_LocalBattleLost`, then resolver-map
  `STRINGID_TRAINER1WINTEXT`) — no ground truth exists yet, budget a trace.
  Increment (iii) (trainer-slide-in visual + dismissible win/loss quote
  boxes) once the loss side lands too, so both directions render together.
  #72 batch 5 (plain-idiom tail from `STRINGID_PKMNFREEDFROM`, skip
  `TRACED`/`SXBLOCKSY2`/the hard trio). typeref slices 4-8. #71 Slice D.
- **Notes:** No surprises vs. the wip commit's 3-cause diagnosis — all 3
  causes were exactly as described, no additional hidden causes surfaced
  once the full suite reran green. No PAPERCUT this step.

---
## 900 — [bounded MAIN worker, 2026-08-03 ~19:05] ENDTURN_CURSE wired + STRINGID_PKMNLAIDCURSE landed (#72 batch 4)

- **State:** master `20a06520`. Full `npm test` green (**677 files / 6,662
  passed / 1 skipped**, 0 failures), `npm run build` green (`tsc -b && vite
  build`), `compare:differential -- battle-command-generated-off.json --base
  21ea7954 --summary`: **PASS — 128/128 byte-identical** (end-turn Curse
  never fires in that trace, as expected).
- **Did (part 1 — engine):** Wired `battleEndTurnOrchestration.ts`'s
  `ENDTURN_CURSE` case (`battle_util.c:1581-1591`), a hard case-barrier per
  entry 898 (`BattleScript_CurseTurnDmg is not wired`). Same shape as the
  already-wired Nightmare tick — identical `floor(maxHP/4)`, min-1 damage,
  `BattleScript_CurseTurnDmg` → shared `DoTurnDmg` tail, ORWORD-only, no new
  opcodes (`docs/end-turn-ground-truth.md` B9). Unlike Nightmare there's no
  clearing-without-damage branch. Two direct orchestration tests added to
  `tests/battleEndTurnOrchestration.test.ts` mirroring the Nightmare tests'
  shape (quarter-HP ladder + printstring, and the real STATUS2_CURSED
  guard), red-verified via `git stash --
  src/engine/battleEndTurnOrchestration.ts` (exact pre-fix case-barrier).
  Commit `4a29f2e9`.
- **Did (part 2 — #72 batch 4):** Landed `STRINGID_PKMNLAIDCURSE` (Ghost
  Curse, Dusclops carrier), ranked first in #72's REACHABLE list and now
  unblocked. Plain attacker/defender `messageLines` pair, no new
  substitution plumbing — 898 had already proved this shape correct. Full-
  turn repro (`tests/presentationStringIssue72Batch4.test.ts`) surfaced a
  real source detail: `cursetarget` sets `STATUS2_CURSED` on the move's
  TARGET (who takes the recurring end-of-turn tick), while the self-damage
  cost (`floor(attacker.maxHP/2)`) lands on the ATTACKER who cast it — two
  different battlers, confirmed by asserting both HP deltas in one turn.
  Census: 81→80 UNRESOLVED (exact -1/+0; `STRINGID_PKMNAFFLICTEDBYCURSE` was
  already generic-fallback-resolvable, not counted). ISSUES #72 REACHABLE
  trimmed to 39 (40−1, arithmetic-checked against the list body's own
  unique count, excluding the `STRINGID_X` placeholder token).
  Red-verified via `git stash -- src/engine/battleResolutionPresentation.ts`
  (exact completeness-guard error pre-fix). Commit `5442e93f` (+ `20a06520`
  fixing a `types` tuple-literal `tsc -b` error the vitest run didn't
  catch).
- **Part 3 (plain-idiom tail, `STRINGID_PKMNFREEDFROM` onward):** not
  attempted — cap landed after parts 1-2's closing verification (full suite
  + build + differential all took ~20 min alone on this run's machine).
- **Next:** ISSUES #72 batch 5, starting at `STRINGID_PKMNFREEDFROM` (top of
  the remaining plain-idiom tail; skip `TRACED`/`SXBLOCKSY2`, both need
  scoped extra wiring per 898, and the hard trio
  `HUNGONWITHX`/`PROTECTEDBY`/`REGAINEDHEALTH`). The `CANCELER_TORMENTED`
  engine-gap fix. The terminal-seam increment (i) per
  `docs/terminal-seam-round-flow-scout.md` (899's recommended headline,
  still unstarted). typeref slices 4-8. #71 Slice D.
- **Notes:** PAPERCUT: `npm test`'s full suite took noticeably longer this
  session (~13-14 min wall clock, vs. AGENTS.md's stated 5-7 min) with 3
  sibling lane sessions (side + animation) running concurrently on the same
  machine — CPU contention, not a regression; the Bash tool's own 600s
  single-call ceiling meant the run had to be polled to completion rather
  than awaited in one blocking call. No functional papercut, just budget
  awareness for future concurrent multi-lane sessions.
- **[supervisor final addendum, ~19:10]** Bonus-round close on top of this
  entry: typeref **slice 4 landed partial and merged** (`9a87786c`, worker
  `d481cda2`): `turn3KickoffBounceTick`'s legacy param retired, census
  **68→67**, differential 2,059 captures byte-identical, full suite green
  in-worktree. **Honest-partial finding:** the row's other 7 bounce-tick
  helpers form a tight internal delegation chain (not 8 independent
  1-ref cuts) — the §4.1 slice-4 row needs a mini re-scope before the
  remainder lands; next session's brief should start from the worker's
  final message (side-lane log 20260803-182951). Union after both merges:
  smoke green, targeted 10/10, build green (incremental). Entry 899's
  session totals supersede to: **13 workers (5 main + 8 side), 1 lost**;
  #72 census now **80 UNRESOLVED / 39 REACHABLE remaining**; typeref
  **67** refs. Play-preview rebuilt at this addendum's own commit (final
  master at close), serving :5199 nohup-detached. All worker worktrees
  removed; `animation-main` fully folded at close (recheck at next orient
  — its supervisor ran until 20:42).

---
## 899 — [supervisor wind-down, 2026-08-03 ~18:30] Session close: #72 triage + 26 ids fixed (3 batches), #71 latent bug fixed, typeref slices 2+3 landed after re-scope, terminal-seam scout banked; two animation folds; final union green

- **State:** master `45536c75`. Final independent full `npm test`: **676
  files / 6,658 passed / 1 skipped, 0 failures** (the session's ONE
  supervisor full-suite run). `npm run build` green — after landing a
  build-infra fix this same wind-down: `tsc -b` now OOMs the 4 GB default
  V8 heap on today's union (reproduced twice on a quiet machine; clean at
  8 GB), so `package.json`'s build script sets
  `NODE_OPTIONS=--max-old-space-size=8192` (recommend mirroring to the
  harness `_template`). `animation-main` fully folded (orient ff
  `660494f9`, wind-down merge `39dce92e` — back sets 5/25→11/25; the
  animation supervisor may still land more before 20:42, fold at next
  orient). DEFERRED.md: no entries. Play-preview rebuilt at `45536c75`,
  serving :5199 (nohup-detached; check `lsof -i :5199` at next orient).
- **Session (11 workers: 4 main + 7 side, 1 lost, ~4h):**
  1. **#71 latent bug FIXED** (`7e14afae`): drawGeneratedPlayerMaterialize
     ONIX-gates the settle wobble table; species-generic tint kept;
     real-ROM probe banked (docs/probes/kadabra-materialize-settle/).
     Slice D (per-tick playback) still gated on the animation lane's
     rung-3 dispatcher.
  2. **#72 program (user-directed): triage + 26 fixes.** Reachability
     triage of all 107 census ids (66 REACHABLE / 41 DEAD / 0 MANUAL —
     the 4 MANUAL settled DEAD same-session, exposing the sub-110
     draft-floor blind spot in hand-checked carriers). Batches 1-3 landed
     11+11+4 ids at full acceptance each (red-verified repros, census
     ±exact, differential 128/128): census now **81 UNRESOLVED**,
     REACHABLE remainder **40**. New tracked gaps: `ENDTURN_CURSE` has no
     handler (blocks PKMNLAIDCURSE, ranked first), `CANCELER_TORMENTED`
     phase missing; hard trio (HUNGONWITHX/PROTECTEDBY/REGAINEDHEALTH)
     needs one dedicated seed-search/multi-context step.
  3. **Typeref retirement restarted:** re-scope scout resolved entry-889's
     blockage (design doc §4.1: staged shim by call-site cluster, slices
     2-8, 80→0 trajectory); slice 3 (shim + 8 HP-overlay pin tests,
     0-delta, differential 797/797) and slice 2 (Chrome, census **80→68**,
     differential 13,219/13,219 over 83 traces) both landed. Slices 4-8
     remain, briefs re-derivable from the doc.
  4. **Terminal-seam scout banked** (docs/terminal-seam-round-flow-scout.md):
     win/loss label sequences mapped; the round orchestrator resolves at
     `{kind:"terminal"}` with zero presentation step; increment (i) —
     second VM run at the win/loss labels, HandleFaintedMon-style
     two-stage redispatch, **zero new opcodes on the WIN branch** — is the
     **recommended next-session headline** (ROADMAP S8 round-flow
     remainder; also flips the 3 win/loss STRINGIDs to REACHABLE).
- **Incident (recorded in PAPERCUTS):** background-task "completed"
  notifications fired spuriously early 3×; acting on one killed the first
  #71 side worker's worktree mid-step (~38 min lost, probe salvaged, retry
  landed). Kill-0 + terminal-marker verification re-adopted; the rest of
  the session ran on process-verified state only.
- **Next (ordered):** (1) terminal-seam increment (i) per the scout doc;
  (2) #72 batch 4 (plain tail from PKMNFREEDFROM) + the ENDTURN_CURSE
  wiring + hard-trio dedicated step; (3) typeref slices 4-8 in doc order;
  (4) #71 Slice D when the animation rung-3 dispatcher lands.
- **Open user decision (unchanged from AM session, deliberately not in
  DEFERRED.md):** make the battleStringResolver completeness guard
  non-fatal in the playable build (loud console error + best-effort text)
  while staying fatal in tests — still recommended; 81 unresolved ids
  remain reachable-in-principle until the program finishes.

---
