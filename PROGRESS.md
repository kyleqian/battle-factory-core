# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 904 — [bounded MAIN worker, 2026-08-04 ~00:10] #72 batch 6: 13 more REACHABLE printstring STRINGIDs landed

- **State:** master (this docs commit follows the engine commit). Full
  `npm test` green (**686 files / 6,717 passed / 1 skipped**, 0 failures),
  `npm run build` green (`tsc -b && vite build`).
- **Did:** Continued ISSUES #72's ranked REACHABLE-28 list from
  `STRINGID_PKMNSXCUREDYPROBLEM` (skipping the hard trio/`TRACED`/`SXBLOCKSY2`
  per the step brief) and landed 13 across 11 staged `it`s in
  `tests/presentationStringIssue72Batch6.test.ts`: the end-turn ability-tick
  trio Shed Skin/Rain Dish/Speed Boost (`SXCUREDYPROBLEM`/`SXRESTOREDHPALITTLE2`/
  `RAISEDSPEED` — Shed Skin's tick gained a small `battleTextBuff1Status`
  pre-clear capture mirroring `HOLD_EFFECT_CURE_STATUS`'s own branch, Speed
  Boost's tick gained an explicit `scriptingBattler` write mirroring
  `battle_util.c:2649`, Rain Dish needed neither — its own print reads
  `B_ATK_*`, already supplied generically by `enterTickBattlerContext`); Wish's
  delayed heal `WISHCAMETRUE` (real 2-turn cast-then-resolve repro); the
  Disable attack-canceler pair `MOVEWASDISABLED`/`MOVEISDISABLED` (real
  same-turn cast-then-blocked-reselect, the second sharing Taunt's exact
  idiom); Perish Song's `PERISHCOUNTFELL` (real same-turn cast-then-tick,
  reusing Stockpile's `battleTextBuff1ByteNumber` substitution); the Magic
  Coat pair `SHROUDEDITSELF`/`MOVEBOUNCED` (real same-turn cast-then-bounced-
  GROWL); `USEDSAFEGUARD` (real same-turn Safeguard-then-blocked Thunder
  Wave); and three zero-new-plumbing defender-only ids
  (`STATSWONTDECREASE2`/`FELLINTONIGHTMARE`/`HEALEDPARALYSIS`). Three ability
  display names added (`RAIN DISH`/`SPEED BOOST`/`SHED SKIN`). All 11 `it`s
  red-verified via `git stash -- src/engine/battleResolutionPresentation.ts
  src/engine/factoryBattleScriptFullTurnDecision.ts
  src/engine/battleEndTurnOrchestration.ts` (each threw the exact pre-fix
  completeness-guard error). Census: **67→54 UNRESOLVED** (exact −13). ISSUES
  #72 REACHABLE trimmed to **15** (28−13, arithmetic-checked).
- **Skipped, with reasons (not just budget):** `STRINGID_PKMNTOOKFOE`
  (Destiny Bond) and `STRINGID_PKMNLOSTPPGRUDGE` (Grudge) both route through
  `tryfaintmon`'s dual `BS_ATTACKER`/`BS_TARGET` operand
  (`battleScriptHitChainOpcode.ts:4270-4340`) — the single-hit case resolves
  to the plain idiom, but proving that holds across every reachable
  `tryfaintmon` call site is its own investigation, not this step's scope.
  `STRINGID_PKMNSXWHIPPEDUPSANDSTORM` (Sand Stream — mechanism fully
  understood, needs a genuine mid-battle switch with a 2nd party slot),
  `STRINGID_PKMNSAFEGUARDEXPIRED` (mechanism understood, needs a real 5-turn
  expiry repro, no `sideTimers` config shortcut), `STRINGID_PKMNTOOKATTACK`
  (Future Sight — mechanism understood, needs a real 3-turn delayed-hit
  repro) all ran out of step budget on staging cost alone.
  `STRINGID_MAGNITUDESTRENGTH` needs a new RNG-roll capture field (genuine new
  plumbing). `STRINGID_PKMNCHANGEDTYPEWITH` (the one permitted plumbing
  extension) not attempted, ran out of budget. `STRINGID_PKMNREDUCEDPP`/
  `STRINGID_PKMNSITEMRESTOREDPP`/`STRINGID_PKMNSTOLEITEM` each need a small
  new substitution-capture pair, not attempted.
- **Next:** #72 batch 7 (REACHABLE-15 list: `SXWHIPPEDUPSANDSTORM` next in
  order, or cherry-pick `STOLEITEM`/`CHANGEDTYPEWITH` first — both cheap per
  this session's own research). The hard trio, `TRACED`, `SXBLOCKSY2`,
  `TOOKFOE`/`LOSTPPGRUDGE`'s tryfaintmon investigation. typeref slices 4-8.
  #71 Slice D.
- **Notes:** No PAPERCUT. Full suite + build ran in the foreground per this
  step's execution-discipline brief (an earlier attempt to background them
  was caught and corrected mid-step before either notification landed).
- **[supervisor addendum, 2026-08-04 ~00:25]** Typeref slice 7b merged on top
  of this entry (`88ddf84e`): battleScene.ts census **41→0**, −272 net lines,
  8,199/8,199 differential captures byte-identical, union smoke + both pin
  suites green post-merge. Slice-8 audit ran supervisor-side (no dead test
  fixtures; adapter-owned types are legitimately retained) — **the §4.1
  typeref retirement program is CLOSED**, recorded in ISSUES #39 and the
  design doc header. Entry 904's "typeref slices 4-8" Next-item is thereby
  retired; #71 Slice D remains gated on the animation lane's rung-3
  dispatcher (not landed as of this session's orient). Side lane currently
  running the loss-path terminal ground-truth scout (docs+traces only).

---
## 903 — [bounded MAIN worker, 2026-08-03 ~23:45] CANCELER_TORMENTED step BLOCKED: assigned premise was factually wrong, corrected docs, no engine/presentation change

- **State:** master `6eaae2c5` (unchanged — docs-only commit follows). Full
  `npm test` green (**685 files / 6,706 passed / 1 skipped**, 0 failures),
  `npm run build` green. No engine or presentation change was made, so no
  differential run was needed (behavior is provably unchanged — see below).
- **Did:** Assigned step: port `AtkCanceler_UnableToUseMove`'s alleged
  "`CANCELLER_TORMENTED` case" (ISSUES #72's note + this doc's own prior
  triage row both claimed it sits between `CANCELER_DISABLED` and
  `CANCELER_TAUNTED`) as a new engine phase, then land
  `STRINGID_PKMNCANTUSEMOVETORMENT`. Per the brief's own "read the C, don't
  guess," read `reference/pokeemerald/src/battle_util.c:1983-2268` in full
  before porting anything: the `CANCELER_*` enum and switch have **exactly
  14 cases, 1:1, no gap** — there is no Torment case in `AtkCanceler` at all,
  in the real pinned source. The premise both docs and the step brief
  repeated was wrong. Torment's actual mechanism is a move-*selection*-time
  rejection, `TrySetCantSelectMoveBattleScript` (`battle_util.c:999-1012`,
  called from `HandleTurnActionSelectionState` in `battle_main.c:4382` for
  both player and AI battlers), dispatching to `BattleScript_SelectingTormentedMove`
  (`printselectionstring`, `battle_scripts_1.s:3563-3565`) — not
  `BattleScript_MoveUsedIsTormented` (`printstring`, same STRINGID), which
  has zero C callers and is dead in the real game too (the prior triage row
  missed the `SelectingTormentedMove` label entirely). Porting a fabricated
  `AtkCanceler` phase anyway would have been a real behavioral bug, not just
  non-source-exact bookkeeping: a two-turn move's forced-continuation turn
  (e.g. Fly turn 2) has `gCurrentMove == gLastMoves[attacker]` without
  passing back through selection, and real Torment does not interrupt it —
  an `AtkCanceler`-time recheck would incorrectly cancel that continuation.
  This engine already ports Torment's *silent* legality half correctly
  (`CheckMoveLimitations`'s Torment bit, `battleScriptActionAdmission.ts:2485-2491`,
  mirrors `battle_util.c:1107` exactly); what's actually missing is
  `TrySetCantSelectMoveBattleScript`'s interactive "reject this selection,
  force a reselect, print the flavor text" loop, which this
  decision-boundary-driven engine (`BattleMoveDecision`/`BattleSwitchDecision`
  supplied directly, assumed pre-legal) has no representation for at all —
  confirmed no other `printselectionstring` rejection path
  (`SelectingDisabledMove`/`SelectingNotAllowedMoveTaunt`/
  `SelectingImprisonedMove`) is wired anywhere in `src/engine` either. That's
  a new subsystem, not the scoped "same idiom as Taunt/Imprison" one-enum-case
  addition — genuinely out of bounds for this bounded step. Per this run's
  worker contract ("if blocked or mis-scoped, say why instead of
  improvising"), did **not** fabricate the phase and did **not** improvise
  the larger selection-rejection subsystem unasked. Instead corrected the
  misinformation at its source: ISSUES.md's "Also found, tracked separately"
  note and `docs/issue72-reachability-triage.md`'s two
  `STRINGID_PKMNCANTUSEMOVETORMENT` rows + a new dated correction section
  (full C citations, same rigor as the doc's existing "settled" appendices).
  Reran the census — byte-identical, still **67 UNRESOLVED** (no change, as
  expected since nothing was landed).
- **Next:** `CANCELER_TORMENTED`/`STRINGID_PKMNCANTUSEMOVETORMENT` needs a
  supervisor re-scope, not a retry of this brief: either design the
  selection-rejection subsystem as its own step (bigger than one STRINGID —
  worth asking whether any other UNRESOLVED id needs the same shape before
  committing to it), or accept it stays permanently DEAD and drop it from
  future REACHABLE-adjacent picks. Otherwise resume ISSUES #72 batch 6 (the
  REACHABLE-28 list from `STRINGID_PKMNSXCUREDYPROBLEM`, per entry 902's
  Next), the hard trio, `TRACED`, `SXBLOCKSY2`, the loss-side terminal-seam
  increment, typeref slices 4-8, #71 Slice D.
- **Notes:** No PAPERCUT. This step cost real time to disprove (~25 min of
  the 60 reading `battle_util.c`/`battle_main.c`/`battle_scripts_1.s`
  directly rather than trusting two independent prior docs that agreed with
  each other but were both wrong) — worth flagging that ISSUES #72's own
  reachability triage methodology should prefer citing exact `battle_util.c`
  case/function names over paraphrasing "Real Gen3 X has a Y recheck"
  claims, since a paraphrase error propagated unchecked from the original
  triage pass through a step brief without anyone re-deriving it from source
  in between.

---
## 902 — [bounded MAIN worker, 2026-08-03 ~23:15] #72 batch 5: 11 more REACHABLE printstring STRINGIDs landed

- **State:** master `072b9066`. Full `npm test` green (**685 files / 6,706
  passed / 1 skipped**, 0 failures), `npm run build` green (`tsc -b && vite
  build`), `compare:differential -- battle-command-generated-off.json --base
  4d75ccdd --summary`: **PASS — 128/128 byte-identical**.
- **Did:** Continued ISSUES #72's ranked REACHABLE list from
  `STRINGID_PKMNFREEDFROM` (per the step brief, skipping the hard trio/
  TRACED/SXBLOCKSY2 already excluded by starting there) and landed 11:
  `STRINGID_PKMNFREEDFROM`/`STRINGID_PKMNGOTFREE` (Bind/Wrap-family
  end-of-turn release + Rapid Spin's own free, both sharing the
  already-landed `STRINGID_PKMNHURTBY`'s `wrappedMove` substitution — staged
  with a real 3-turn Bind-expiry repro and a real Bind-then-Rapid-Spin
  repro), `STRINGID_PKMNDREAMEATEN`/`STRINGID_PKMNWASNTAFFECTED` (Dream
  Eater's status-gated pair), `STRINGID_TARGETCANTESCAPENOW` (Mean Look
  family), `STRINGID_PKMNGOTENCORE` (Encore, staged via the `lastMove`
  config field), `STRINGID_PKMNIDENTIFIED` (Foresight), and three ids
  reusing the existing "move's-own-target's-ability" substitution bucket
  (`STRINGID_PKMNRESTOREDHPUSING`'s family) with zero new plumbing:
  `STRINGID_PKMNSXINFATUATEDY` (Cute Charm, real 1/3 contact-proc repro,
  opposite genders staged via `personality`), `STRINGID_PKMNHURTSWITH`
  (Rough Skin, deterministic), `STRINGID_PKMNCOPIEDFOE` (Role Play).
  `STRINGID_PKMNKNOCKEDOFF` (Knock Off) also landed, reading `heldItems`
  directly (the typed removeitem controller receipt that would advance it
  comes after the print). All 11 are the plain Taunt-pair idiom or direct
  extensions of already-established substitution buckets — no new
  event-payload fields, no new engine phases. Two ability display names
  (`ROUGH SKIN`/`CUTE CHARM`) added to the existing lookup table. Staged in
  `tests/presentationStringIssue72Batch5.test.ts` (11 tests, `mechanicLab`-
  shape full-turn config, no injected transient state beyond the same
  `status1`/`lastMove` config fields prior batches already used), all
  red-verified via `git stash -- src/engine/battleResolutionPresentation.ts
  src/engine/factoryBattleScriptFullTurnDecision.ts` (each threw the exact
  pre-fix completeness-guard/placeholder error). Census: **78→67
  UNRESOLVED** (exact -11, no generic-fallback-resolvable exceptions this
  batch). ISSUES #72 REACHABLE trimmed to **28** (39−11, arithmetic-checked
  against the list body's own unique-id count). Commit `072b9066`.
- **Skipped, not new-plumbing-blocked (just ran out of step budget):**
  `STRINGID_PKMNSXCUREDYPROBLEM` (Shed Skin — needs a small
  `battleTextBuff1Status`-style pre-clear capture added to
  `runShedSkinTick`, same field the `HOLD_EFFECT_CURE_STATUS` branch already
  populates), `STRINGID_PKMNSXWHIPPEDUPSANDSTORM`, `STRINGID_PKMNTOOKFOE`
  (Destiny Bond — `tryfaintmon`'s dual attacker/target operand needs its own
  role investigation), `STRINGID_PKMNWISHCAMETRUE`,
  `STRINGID_PKMNSAFEGUARDEXPIRED`, `STRINGID_PKMNUSEDSAFEGUARD`,
  `STRINGID_PKMNSXRESTOREDHPALITTLE2`, `STRINGID_PKMNMOVEISDISABLED`/
  `MOVEWASDISABLED`, `STRINGID_PKMNTOOKATTACK`,
  `STRINGID_PKMNPERISHCOUNTFELL`, `STRINGID_PKMNMOVEBOUNCED`,
  `STRINGID_PKMNRAISEDSPEED`, `STRINGID_PKMNSHROUDEDITSELF`,
  `STRINGID_STATSWONTDECREASE2`, `STRINGID_MAGNITUDESTRENGTH`. One genuine
  new-plumbing case found: `STRINGID_PKMNCHANGEDTYPEWITH` (Color Change)
  needs a new `battleTextBuff1Type` message substitution wired into
  `prepareMessage` — the rules-context field already exists
  (`battleScriptTypeChangeOpcode.ts`) but isn't surfaced to messages yet.
  `STRINGID_PKMNFELLINTONIGHTMARE`/`LOSTPPGRUDGE`/`REDUCEDPP`/
  `SITEMRESTOREDPP`/`HEALEDPARALYSIS`/`STOLEITEM` also unattempted.
- **Next:** #72 batch 6 (continue the REACHABLE-28 list from
  `STRINGID_PKMNSXCUREDYPROBLEM`). The hard trio
  (`HUNGONWITHX`/`PROTECTEDBY`/`REGAINEDHEALTH`) dedicated step. `TRACED`
  (nickname wiring). `SXBLOCKSY2` (Perish Song loop). `CANCELER_TORMENTED`
  engine gap. Loss-side terminal-seam increment (`VARIOUS` 19/20 + a fresh
  oracle trace, per entry 901). typeref slices 4-8. #71 Slice D.
- **Notes:** No PAPERCUT this step. Full suite took ~10 min wall clock
  (`npm test` backgrounded past the Bash tool's 120s auto-background
  threshold; polled its output file to a foreground completion marker
  rather than treating the background move as a wait-for-notification
  pattern).
