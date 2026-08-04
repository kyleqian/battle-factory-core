# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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
