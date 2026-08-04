# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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
## 898 — [bounded MAIN worker, 2026-08-03 ~18:05] ISSUES #72 batch 3 (shortened, 45-min cap): 4 more REACHABLE printstring STRINGIDs landed

- **State:** master `4913d940`, on top of `897`'s commit (`efecd519`). Full
  `npm test` green (**668 files / 6,614 passed / 1 skipped**, 0 failures),
  `npm run build` green (`tsc -b && vite build`), `compare:differential --
  battle-command-generated-off.json --base efecd519 --summary`: **PASS —
  128/128 byte-identical**.
- **Did:** Shortened (45-min cap) continuation of ISSUES #72's ranked
  REACHABLE list, starting at `STRINGID_PKMNLAIDCURSE` per the supervisor
  brief (skipping the 3 documented hard cases again:
  `PKMNHUNGONWITHX`/`PKMNPROTECTEDBY`/`PKMNREGAINEDHEALTH`, still unlanded).
  Landed 4 via the Taunt-pair idiom (census: 85→81 UNRESOLVED, 35→39
  already-explicit, exact -4/+4 match): `STRINGID_PKMNCOPIEDSTATCHANGES`
  (Psych Up, plain move-attacker/defender pair), `STRINGID_PKMNSXBLOCKSY`
  (Soundproof vs. a sound move via `BattleScript_SoundproofProtected`'s own
  unreassigned move-target read), `STRINGID_PKMNSXMADEITINEFFECTIVE` (Yawn
  vs. Insomnia/Vital Spirit — `BattleScript_PrintBankAbilityMadeIneffective`'s
  own `copybyte sBATTLER, sBATTLER_WITH_ABILITY` fallthrough already writes
  `scriptingBattler`, so no new plumbing needed), `STRINGID_PKMNWASMADEDROWSY`
  (Yawn's own unconditional success tail). All 4 staged as full-turn
  production-kernel repros in one new file,
  `tests/presentationStringIssue72Batch3.test.ts`, red-verified via `git
  stash -- src/engine/battleResolutionPresentation.ts
  src/engine/factoryBattleScriptFullTurnDecision.ts` (exact completeness-
  guard error pre-fix, confirmed per-id). `STRINGID_PKMNLAIDCURSE` (Ghost
  Curse, Dusclops) was staged first — its `messageLines` shape (plain
  attacker/defender, no substitutions) is correct and was proven against the
  script trace, but a real full-turn repro hits an *unrelated* barrier:
  `runEndTurnTail`'s `ENDTURN_CURSE` case throws
  `BattleScript_CurseTurnDmg is not wired` (the per-turn Curse damage tick
  has no handler at all in this reducer's end-of-turn orchestration).
  Reverted rather than landed without a passing red-verified test; new
  tracked gap recorded in ISSUES #72, `STRINGID_PKMNLAIDCURSE` stays open and
  ranked first. `STRINGID_PKMNTRACED` (needs new `battleTextBuff1MonNick`
  nickname-resolution wiring in `prepareMessage`, not yet ported — deferred,
  not attempted) and `STRINGID_PKMNSXBLOCKSY2` (Perish Song vs. Soundproof,
  needs the same per-iteration `sBATTLER`/`addbyte` loop investigation
  `STRINGID_PKMNCUTSATTACKWITH`'s Intimidate loop already got — deferred, not
  attempted) were the next two candidates but the cap landed first. ISSUES
  #72 REACHABLE list trimmed to the remaining 40 (44 − 4, arithmetic-checked
  via `awk`+`grep -o 'STRINGID_[A-Z0-9]*'`+`sort -u`+`wc -l` against the list
  body's own unique count, excluding the one `STRINGID_X` placeholder token
  in the instructional parenthetical).
- **Next:** ISSUES #72 batch 4, starting from `STRINGID_PKMNHUNGONWITHX`/
  `PKMNPROTECTEDBY`/`PKMNREGAINEDHEALTH` if a dedicated seed-search/
  multi-context step is picked up, else `STRINGID_PKMNTRACED` or
  `STRINGID_PKMNSXBLOCKSY2` (both scoped above) or the next plain-idiom id
  after those (`STRINGID_PKMNFREEDFROM`). The new `ENDTURN_CURSE` end-of-turn
  gap (wire `BattleScript_CurseTurnDmg`, same shape as the existing Wrap/
  Reflect/Wish ticks) — a prerequisite for `STRINGID_PKMNLAIDCURSE`. The
  `CANCELER_TORMENTED` engine-gap fix (separate step, not a messageLines
  fix). The 4 MANUAL settling experiments (already DEAD-settled per 897 — no
  further action). #71 Slice D. typeref slice-2 re-scope (#39).
- **Notes:** Shortened step (45-min cap) — landed 4 of the targeted 6-8,
  prioritizing landing fewer ids fully over more partially, per the brief.
  No PAPERCUT this step (research-heavy but no tooling friction hit).

---
