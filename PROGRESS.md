# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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
## 897 — [bounded MAIN worker, 2026-08-03 ~17:20] ISSUES #72 batch 2: 11 more REACHABLE printstring STRINGIDs landed via the Taunt-pair idiom

- **State:** master `86637733`, on top of `896`'s commit. Full `npm test`
  green (**667 files / 6,606 passed / 1 skipped**, 0 failures), `npm run
  build` green (`tsc -b && vite build`), `compare:differential --
  battle-command-generated-off.json --base 15891bab --summary`: **PASS —
  128/128 byte-identical**.
- **Did:** Landed 11 more of ISSUES #72's ranked REACHABLE printstring
  STRINGIDs, starting at `STRINGID_PKMNSXWOREOFF` per the supervisor brief
  (skipping the 3 documented hard cases `PKMNHUNGONWITHX`/`PKMNPROTECTEDBY`/
  `PKMNREGAINEDHEALTH`, still unlanded): `PKMNANCHORSITSELFWITH`,
  `PKMNANCHOREDITSELF`, `PKMNWASDRAGGEDOUT`, `PKMNCUTSATTACKWITH`,
  `PREVENTEDFROMWORKING`, `PKMNSXPREVENTSFLINCHING`, `PKMNSXPREVENTSYLOSS`,
  `PKMNPREVENTSUSAGE`, `PKMNRESTOREDHPUSING`, `PKMNSXMADEYUSELESS`,
  `PKMNSXWOREOFF` (census: 96→85 UNRESOLVED, 24→35 already-explicit, exact
  -11/+11 match). Same idiom as batch 1: `messageLines`
  (`battleResolutionPresentation.ts`) branches + `prepareMessage`
  substitution cases (`factoryBattleScriptFullTurnDecision.ts`, 9 new
  `ABILITY_DISPLAY_NAME_BY_ID` entries) — plus two small, scoped additions
  this batch needed beyond that pair: a new optional `targetBattler`
  event-payload field (`battleScriptEvents.ts`, mirroring the existing
  `effectBattler` idiom) for the Intimidate loop's own
  `trygetintimidatetarget` cycling (not a move's-own-target relationship,
  so `requireMoveDefender` doesn't apply), and a `battleTextBuff1Move` write
  in `battleEndTurnOrchestration.ts`'s Reflect/Light Screen/Mist wear-off
  ticks (porting real source's own `PREPARE_MOVE_BUFFER` call — the field
  already existed, used by other ids). All 11 staged as real full-turn
  production-kernel repros in one new file,
  `tests/presentationStringIssue72Batch2.test.ts`, red-verified via
  `git stash -- src/engine/battleResolutionPresentation.ts
  src/engine/factoryBattleScriptFullTurnDecision.ts
  src/engine/battleEndTurnOrchestration.ts src/engine/battleScriptEvents.ts`
  (exact completeness-guard error pre-fix, confirmed per-id). Two ids needed
  genuine 2-turn sequences rather than direct config staging, since their
  preconditions have no config override in this reducer: `PKMNANCHOREDITSELF`
  (Ingrain's `STATUS3_ROOTED` — real Ingrain-then-Roar turns) and
  `PKMNSXPREVENTSFLINCHING` (Fake Out's `isFirstTurn !== 0` gate — this
  reducer hardcodes every initial battler's `isFirstTurn: 0` with no config
  field, but a real switch-in sets it to 2, so a genuine switch-then-attack
  sequence stages it). ISSUES #72 REACHABLE list trimmed to the remaining 44
  (55 − 11, arithmetic-checked against the list body's own unique count).
- **Next:** ISSUES #72 batch 3, starting from `STRINGID_PKMNHUNGONWITHX`
  (top of the ranked REACHABLE list, still needing a seed search or
  alternate deterministic staging for Focus Band's hang-on roll) —
  `PKMNPROTECTEDBY` (Sturdy vs. OHKO, same seed-search shape) and
  `PKMNREGAINEDHEALTH` (3-battler-role investigation) are next after that;
  then `STRINGID_PKMNLAIDCURSE` starts the plain-idiom tail. The
  `CANCELER_TORMENTED` engine-gap fix (separate step, not a messageLines
  fix). The 4 MANUAL settling experiments. #71 Slice D. typeref slice-2
  re-scope (#39).
- **[supervisor merges, ~17:45]** three verified side branches folded on
  top of batch 2: typeref slice 3 (`53691c36` — idle-content shim + 8
  HP-overlay pin tests, census 80→80 as predicted, differential 797/797);
  #72 MANUAL settlement (`5c7d6e90` — all 4 settled DEAD; found the
  sub-110 draft-floor blind spot in hand-checked carrier citations, batch-1
  carriers reproduce 6/6 via the topology artifact; ISSUES #72 updated,
  partition now 66/41/0); terminal-seam scout (`19d7c3f9` —
  `docs/terminal-seam-round-flow-scout.md`: win/loss label sequences, the
  orchestrator's zero-presentation gap, increment (i) = second VM run at
  the win/loss labels with zero new WIN-branch opcodes — **recommended
  next-session headline**, feeds ROADMAP S8's round-flow remainder).
  Also corrected ISSUES #72's resurrected "67 ids" claim (was 66) and its
  stale "leaving 55" line (now 44).
- **Notes:** PAPERCUT: `BattleScriptPartyMemberInput`'s `moves` override
  field defaults `pp` to 0 per slot when `pp` is omitted (unlike
  `FactoryFullTurnBattlerConfig`'s own "16-per-nonzero-move" default for the
  two *active* battlers) — staged a bench Fake-Out holder with `moves:
  [FAKE_OUT,0,0,0]` and no `pp` override, got a silent fallback to
  MOVE_STRUGGLE instead of an error, cost ~10 min to notice via a raw event
  dump before finding the fix (`pp: [5,0,0,0]`). Worth a future step: either
  default bench-override PP the same way the active-battler path does, or
  throw when a nonzero move slot has zero PP, rather than silently
  Struggling.

---
