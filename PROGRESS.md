# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 894 — [supervisor orient, 2026-08-03 ~15:35] Animation fold (ff to `660494f9`) verified green on the union; session in progress

- **State:** master `660494f9` = fast-forward fold of `animation-main` (6
  commits: BACK_ANIM_GROW + BACK_ANIM_CIRCLE_COUNTERCLOCKWISE player-back
  sets — 7/25 back sets now ported). The ff target is the animation
  supervisor's own baseline merge of master; both supervisors launched
  14:42 and run concurrently until 20:42. Union verification: `npm run
  build` green (2m33s); full `npm test` **0 test failures** (5,539 passed /
  1 skipped; 5 files hit vitest worker collection *fetch timeouts* under
  triple-suite CPU contention, and all 5 pass targeted — 1,038/1,038 in
  28s). DEFERRED.md: no entries.
- **Did (so far):** fold + union verification above. Session incidents worth
  the ledger: (1) background-task completion notifications fired spuriously
  early twice — acted on one and removed the first #71 side worker's
  worktree while it was still live (worker noticed, reported cleanly, no
  tree damage; its RAM probe was salvaged intact). Re-adopted the
  2026-07-31 kill-0 policy: only process-verified state counts. (2) The
  salvaged probe settled the #71 latent-bug fix shape with real-ROM
  evidence: KADABRA's back settle is its own y2 descent 14→0 (its
  shrink-grow family motion) — NOT flat zero and NOT ONIX's wobble table;
  the tint fade (16→0, −1/tick) is species-generic. Retry brief embeds the
  probe (artifacts: docs-bound copy pending worker; scratchpad backup
  kept).
- **In flight:** side lane — #71 `drawGeneratedPlayerMaterialize` fix
  (ONIX-gate the wobble table, keep generic tint; worktree
  side-20260803-151003). Main lane — #72 107-id printstring reachability
  triage (user-directed first brief), launching next.
- **Next:** verify + merge both; then #72 REACHABLE fixes per triage;
  typeref slice-2 re-scope (#39). Preview server is DOWN (died with last
  session); restart at wind-down on the final commit.

---
## 893 — [bounded MAIN worker, 2026-08-03 ~13:05] Same-day crash FIXED (STRINGID_PKMNFELLFORTAUNT + sibling) + ISSUES #72 filed (107-id census, blind-spot class beyond #70)

- **State:** master `a6d533a7`. Full `npm test`: **660 files / 6,558 passed /
  1 skipped**. `npm run build` green (tsc -b + vite).
  `compare:differential -- battle-command-generated-off.json --base 78fb4ef0
  --summary`: **PASS — 128/128 byte-identical**.
  `tests/executableFrontierRatchet.test.ts` green, untouched, no barrier
  changes.
- **Did:** Fixed the same-day user-reported crash (live preview `3a1e1d8b`:
  opponent MURKROW's TAUNT threw battleStringResolver's completeness guard
  on `{B_DEF_NAME_WITH_PREFIX}`). Mapped `STRINGID_PKMNFELLFORTAUNT` in
  `messageLines` (`battleResolutionPresentation.ts`) — Taunt's own
  `Cmd_settaunt` operates on `gBattlerTarget` directly, so B_DEF is the
  move's own defender, same shape as `STRINGID_PKMNSUBJECTEDTOTORMENT`.
  While staging a real repro (MURKROW's real Factory rental set,
  `FRONTIER_MON_MURKROW_1`), found and fixed a **sibling gap in the same
  turn**: `STRINGID_PKMNCANTUSEMOVETAUNT` (the taunted battler's own blocked
  status-move action, printed by the attack canceler instead of
  STRINGID_USEDMOVE) — sourced from the frozen action snapshot's
  attacker/currentMove, not `lastMoveAttacker` (no used-move message
  precedes a canceled action). `tests/presentationStringTaunt.test.ts`: full
  production-kernel repro, red-verified via `git stash` on the engine file
  (threw the exact reported error pre-fix).
  **Root cause of why #70 missed both:** #70's sweep grepped `src/engine/
  *.ts` for `STRINGID_` TS literals; these two ids are emitted purely by the
  generic `printstring` opcode handler reading the operand straight out of
  the parsed battle-script program — no TS code ever names them, so the
  grep-based method structurally cannot see this class. Wrote
  `tools/report/printstring-literal-census.ts` (regenerable,
  `docs/printstring-literal-census.md`) to enumerate it properly: **207**
  unique literal `printstring` STRINGID operands in the parsed program, 13
  already explicit + 87 generic-fallback-safe, **107 UNRESOLVED**
  (syntactic upper bound, not per-id reachability-traced like #70's own
  method — many are structurally dead, e.g. Battle Arena/link-battle-only
  ids). Filed as **ISSUES #72** with the full list and the 7
  highest-suspicion same-family next picks (PKMNALREADYASLEEP/CONFUSED/
  HASBURN/POISONED/ISALREADYPARALYZED, PKMNCANTUSEMOVETORMENT/SEALED) —
  per the step's own outcome rule (longer tail → file, don't chase).
- **Next:** ISSUES #72's 7 highest-suspicion ids (same "already-status"/
  "can't-use-move-X" family as the just-fixed Taunt pair, same fix idiom);
  the rest of #72's 107-id list needs #70-style per-id reachability triage
  before fixing (many are dead paths, not real gaps); ISSUES #71 remaining
  (Slice D gated on animation lane's rung-3 dispatcher; the
  `drawGeneratedPlayerMaterialize` ONIX-back latent bug from entry 891);
  typeref slice-2 re-scope.
- **Notes:** no PAPERCUT this step. `npm test` auto-backgrounded past the
  harness's 120s default Bash timeout (suite takes ~11min); resolved by
  polling the background output file in a single blocking foreground Bash
  call with an explicit longer timeout, per this run's "never actually
  background a verification" discipline — worth remembering the fix
  pattern rather than re-deriving it next time a full-suite run exceeds
  120s.
- **[supervisor close, 14:05]** the #72 reachability triage (user-directed:
  attribute each of the 107 unresolved printstring ids to its emitting
  move/hook + Factory-corpus carrier + static battle-type gates, partition
  reachable/dead/manual) was launched at 14:02 by supervisor clock error
  and cancelled 2 min in, nothing landed — **it is next session's FIRST
  brief**, fully re-derivable from ISSUES #72 + docs/printstring-literal-
  census.md + the #70 reachability doc's methodology. Second open user
  decision unchanged: non-fatal resolver guard in the playable build.
  Tree clean and green at `78d9efcc`; preview serves `bc763f06` (:5199).
- **[supervisor final addendum, 13:10]** verified (repro test + smoke
  green; worker's same-commit full suite 660 files / 6,558 / 1 skipped;
  differential 128/128). Play-preview rebuilt at `bc763f06`, serving :5199.
  Session final totals: **9 workers (6 main + 3 side), 0 lost.** OPEN
  question for the user (asked live, unanswered at close): make the
  battleStringResolver completeness guard non-fatal in the playable build
  (loud console error + best-effort text) while staying fatal in tests —
  recommended given #72's 107-id tail; next session implements per the
  answer.

---
## 892 — [supervisor wind-down, 2026-08-03 ~12:40] #70 CLOSED + dossier CLOSED + #71 hookup slices A/B/C landed + typeref slice 1; animation fold; final union green

- **State:** master `3a1e1d8b` = supervisor fold of animation-main
  `32415c02` (18 commits: back-family send-out reducers begin —
  `backSendOutAnim.ts`, 5 families with twice-fresh evidence — plus shrink-
  grow/spring/vibrate/slide docs) onto `98b2287a`. Final independent full
  `npm test`: **659 files / 6,557 passed / 1 skipped**, `npm run build` green
  (the session's ONE supervisor full-suite run per today's new
  judicious-suite directive). DEFERRED.md: no entries. Play-preview rebuilt
  at `3a1e1d8b`, serving :5199.
- **Session (8 workers: 5 main + 3 side, 0 lost, ~4h):**
  1. **ISSUES #70 CLOSED** (was: 47-id presentation-string sweep debt).
     Batch 3 final 12 ids (`8489ca18`), then the INTROSENDOUT extractor gap:
     side-banked hand-mapped intro table `battleIntroStrings.ts` ids 0/1/2/5
     (`a76bb338`) wired into `messageLines` (`49b8c323`) with new
     `introBattler`/`introHpScale`/`introOutcome` event fields. Every
     STRINGID the engine can print now resolves; the crash class from the
     2026-08-02 user playtest is fully retired.
  2. **Species-dossier program CLOSED** (7/7): capstone slice 4 via side
     lane (`90e5a2b2`), differential 144/144.
  3. **Typeref slice 1 landed** (`7ca03a17`, 72 of 144 refs cut,
     differential 7,466/7,466); slice 2 honestly blocked — real shape is
     bigger than the design doc row (9+ Family-R call sites + an HP-overlay
     turn-1 exclusion nuance), documented in ISSUES #39 for re-scoping.
  4. **User directives adopted mid-session:** (a) judicious full-suite
     cadence (SUPERVISOR.md verify step updated; memory banked); (b) #71
     send-out hookup = MAIN lane's job, reprioritized ahead of remaining
     typeref slices (ISSUES #71 sequencing updated; memory banked).
  5. **ISSUES #71 hookup begun — Slices A+B+C landed** on the banked scout
     doc `docs/send-out-live-wiring-consumer-map.md` (`9c6de475`):
     front terminal rest offsets wired at all 5 live settle hooks with the
     real fieldView species threaded (`2ef1c9d8`), RAM-probe-confirmed vs
     the ROM incl. a RATTATA positive case (`32af4030`, `0dce7d73` tests);
     back-side hand-fits documented + loud-guarded, KABUTO 4th hand-fit
     included (`e5bd18dd`). Supervisor-verified scout finding: only
     ONIX+RATTATA of 386 species have nonzero terminal offsets.
  6. **Real latent bug found (NOT yet fixed, next session's top pick):**
     `drawGeneratedPlayerMaterialize` applies ONIX-only offset/tint tables
     to ANY player species on the generated route — reachable today
     (KADABRA lead in `factoryBattleStartIntro.test.ts` at elapsed
     710/714). Details + candidate fix in ISSUES #71. The fold's new
     back-family reducers (`backSendOutAnim.ts`) may supersede the
     candidate fix — re-check that surface before briefing (the scout doc's
     "back surface absent" §3 is now stale).
- **Next (ordered):** (1) the generated-route ONIX-back latent bug;
  (2) #71 remaining: §1e 56-site patch retirement, Slice D + per-tick
  playback (gated on animation-lane rung-3 dispatcher — cross-lane ask in
  ISSUES #71; back reducers now partially banked); (3) typeref slice-2
  re-scope + slices 3/4a/4b/5 (behind #71 per user directive).
- **Notes:** harness repo got a NOTES.md commit (`8850261`, anti-cheat/
  server-stepped-simulation summary, user request) — the oracle freshness
  checker will now flag services older than harness HEAD; it is the KNOWN
  docs-only false positive, no restart needed. animation-main folded at
  `32415c02`; the animation supervisor was still live at fold (same 14:13
  deadline) — any commits it lands after `32415c02` are next session's
  boring fold. PAPERCUTS: +1 new entry (mechanicLab send-out probes inert
  under battle-scene-off). Ledger repair: entry 887 was appended out of
  order by its worker; reordered in `4fe0e206`.
---
