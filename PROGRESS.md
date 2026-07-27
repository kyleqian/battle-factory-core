# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
> **STANDING ARRANGEMENT (user directive, 2026-07-26):** the animation
> program runs under its own supervisor (`./run-supervisor.sh --lane
> animation`, guide `ANIMATION_SUPERVISOR.md`) in the persistent
> `.worktrees/animation-main` worktree on branch `animation-main`. Main
> supervisor: never brief animation work; fold `animation-main` into
> `master` at orient when it has new commits (details in SUPERVISOR.md's
> parallel-workers note). This replaces the temporary animation pause —
> entry 468's animation items are the animation supervisor's backlog now.


---
## 524 — [SUPERVISOR 2026-07-27 ~16:35] rounds 2-4 verified + merged; census extractor FIXED (Roar row was fabricated); census 80.4% weighted; round 5 dispatched

- **State:** master green at **271 files / 3597 tests**, `npm run build`
  clean, zero unmerged branches, zero stale worktrees. Census regenerated on
  the union: **111/214 effects, 217/355 moves, 2378/2957 weighted (80.4%)**
  — entry 523's predicted +57 flip confirmed exactly, all 36 self-checks
  pass (4 new exact-set pins).
- **Seam program this session:** turn2-endeavor (§13.3, 77/77) and
  turn6-statfall ATK-fell text (§12.3 step 3, 127/127) both wired from
  kernel events; §14 prep-scout banked for turn11-featherdance (178/178
  re-pinned twice; clamp string is STRINGID_STATSWONTDECREASE, zero
  animation events, ZERO new bridge surface needed — existing turn-6 bridge
  resolves it; resolver byte-identity to the curly-glyph literals
  confirmed).
- **Census correction (side rounds 2-3, verified by supervisor against raw
  source):** EFFECT_ROAR's ranked-table row was a control-flow extractor
  fabrication — the walker missed operand-carried jump edges (170 across
  ~60 mnemonics) and fabricated a fallthrough from Roar's script into the
  physically-adjacent EffectMultiHit. Fixed generically in the census's
  graph-consumption layer (labelOperands synthesis + case-by-case-audited
  fallthrough suppression: only forcerandomswitch never falls through, per
  battle_script_commands.c:7164-7386); Roar's true set is FOUR opcodes
  (FINISHACTION/FORCERANDOMSWITCH/RETURNTOBALL/SWITCHOUTABILITIES) + a
  Suction Cups jumpifability widening; EFFECT_RAGE gained a previously
  invisible CLEARSTATUSFROMEFFECT blocker (second real bug, same class).
  Scout dossier: docs/roar-multihit-registration-scout.md (14-rung plan +
  multi-hit per-operand gaps: JUMPIFHALFWORD gChosenMove, JUMPIFBYTE
  MOVE_RESULT_FOE_ENDURED, TRIPLE_KICK power-ramp + hit-counter ptr).
- **Round 5 (dispatched):** main → Roar + multi-hit cluster registration
  per the scout's 14-rung plan (5 effects / 18 moves / 63 weighted
  predicted) ∥ side → live-stage the remaining recipe-only AI CV draw
  sites (§24.5 sites 6 ingrain / 7 curse, then §19.5's 4).
- **Next:** verify round 5; round 6 main = turn11-featherdance wiring
  (§14.3); then EXPLOSION pair (25) / SEMI_INVULNERABLE trio (32) as time
  allows; wind-down from ~19:40 (fold animation-main again — their session
  is live).

---
## 523 — [BOUNDED WORKER 2026-07-27 ~16:30] B_SCR_OP_TRYHEALHALFHEALTH + B_SCR_OP_TRYKO + B_SCR_OP_TRYSETDESTINYBONDTOHAPPEN registered; EFFECT_RESTORE_HP/EFFECT_SOFTBOILED/EFFECT_OHKO executable end to end

- **State:** tree green at **270 files / 3587 tests** (+2 files / +27 tests
  over session start 268/3560: new `battleScriptTryhealhalfhealthOpcode.test.ts`
  8 tests, new `battleScriptTryKOOpcode.test.ts` 18 tests — folds
  `Cmd_trysetdestinybondtohappen`'s own dispatch tests in too, since it's a
  one-line wrapper — plus `battleScriptHitChainOpcode.test.ts`'s
  resultmessage barrier test net +1 (one stale barrier test replaced by two
  real-behavior tests) and `battleScriptRulesContext.test.ts`'s
  production-handler-count assertion updated 119→122), `npm run build`
  clean. **CENSUS REGEN DEFERRED per this step's special instruction** (a
  parallel side-lane worker is rewriting `tools/report/executable-frontier-
  census.ts` this round) — neither the generator nor
  `docs/executable-frontier-census.md` were run or edited. **Predicted
  flip, hand-verified against the committed doc's own row-4/row-5 numbers:
  108→111/214 effects, 209→217/355 moves, 170→177/276 Factory-L50
  unweighted (3+4), 2321→2378/2957 weighted (29+28) — **+3 effects / +8
  moves unweighted / +57 weighted exactly, no correction needed, matches
  the brief's own prediction to the digit.**
- **Did:** registered all three ranked-table-row-4/row-5 opcodes.
  (1) `Cmd_tryhealhalfhealth` (`battleScriptTryhealhalfhealthOpcode.ts`):
  both concrete call sites (`BattleScript_EffectRestoreHp`'s `BS_ATTACKER`
  form, reassigning `target=attacker`; `BattleScript_EffectSoftboiled`'s
  `BS_TARGET` form, no reassignment) — `floor(maxHP/2)`, min-1 clamped,
  negated; full-HP fail jumps to the operand pointer. Zero barriers.
  (2) `Cmd_tryKO` (`battleScriptTryKOOpcode.ts`, EFFECT_OHKO's own
  accuracy/level formula, NOT the standard accuracycheck path — OHKO's own
  `accuracycheck` uses the already-registered `NO_ACC_CALC_CHECK_LOCK_ON`
  no-roll bypass first): Sturdy block (real, hardcoded jump to
  `BattleScript_SturdyPreventsOHKO`, not the operand ptr — same shape as
  `Cmd_tryinfatuating`'s Oblivious block), the real `chance = accuracy +
  (atkLevel - targetLevel)` formula with its hard level-gate override (a
  would-be-successful roll still misses, as "unaffected" not "missed",
  whenever the target out-levels the attacker — the level-too-high fail
  tail), the Endure interaction (reuses the already-modeled `endured` field,
  clips to hp-1, `MOVE_RESULT_FOE_ENDURED`), and plain-KO success (damage =
  target's full current HP, `MOVE_RESULT_ONE_HIT_KO`). Two named (b)
  barriers, both source-derived, both reachability-tested: the
  `HOLD_EFFECT_FOCUS_BAND` roll (`gSpecialStatuses[target].focusBanded`
  unmodeled — same subsystem gap `Cmd_adjustnormaldamage`/
  `Cmd_adjustsetdamage` already carry, a distinct call site not a
  narrowing) and `STATUS3_ALWAYS_HITS` (Lock-On/Mind-Reader,
  `gDisableStructs.battlerWithSureHit` unmodeled — per accuracycheck's own
  established finding, never actually set by any production code path).
  (3) `Cmd_trysetdestinybondtohappen`
  (`battleScriptTrysetdestinybondtohappenOpcode.ts`): a bare wrapper, zero
  barriers, zero RNG.
- **Hidden barrier the brief asked to budget for, found and widened:**
  `Cmd_resultmessage`'s `MOVE_RESULT_ONE_HIT_KO` handling (both the
  exact-match switch case and the combined-bits default case) was an
  existing named (b) barrier ("OHKO subsystem unmodeled") sitting behind
  the already-registered `resultmessage` opcode — exactly the class of gap
  entries 515/519 both hit. Widened both: the exact-match case is a plain
  `STRINGID_ONEHITKO` print (no cursor push, source-verified); the combined
  case (e.g. `SUPER_EFFECTIVE|ONE_HIT_KO`, reachable whenever an OHKO move's
  type happens to be super-effective) jumps to `BattleScript_OneHitKOMsg`
  clearing `ONE_HIT_KO|SUPER_EFFECTIVE|NOT_VERY_EFFECTIVE`, same shape as
  the already-working `FOE_ENDURED` combined case. `gKOFailedStringIds`
  added to the existing `printfromtable` data table (zero code path change,
  data-driven) so `BattleScript_KOFail`'s own miss/unaffected message
  resolves too. `MOVE_RESULT_FOE_HUNG_ON` stays barriered (Focus Band
  subsystem, structurally unreachable now that `Cmd_tryKO` itself barriers
  Focus Band unconditionally).
- **Real bug found and fixed (not an ISSUES entry — fixed within this same
  step, since it's the identical source function this step needed to port):**
  `Cmd_accuracycheck`'s existing `advancePastAccuracyCheck` helper computed
  `TrySetDestinyBondToHappen`'s effect onto the wrong field — the
  **attacker's own `status2 |= STATUS2_DESTINY_BOND`** bit, never read by
  anything, instead of the real `hitMarker |= HITMARKER_DESTINYBOND` that
  `Cmd_tryfaintmon`'s own barrier (`:3184`, same file) actually reads.
  Provably dormant until now: `EFFECT_DESTINY_BOND` (the move) is still
  unregistered, so no committed script could ever make a target's
  `STATUS2_DESTINY_BOND` true, and zero existing tests exercised this
  computation at all. Extracted into one shared, now-correct
  `applyTrySetDestinyBondToHappen` helper (exported from
  `battleScriptHitChainOpcode.ts`) reused by both real call sites —
  accuracycheck's own success path and the new standalone opcode — so
  they're provably consistent by construction, with a new test pinning the
  fixed behavior (hitMarker set, attacker's status2 left untouched).
- **Tests:** isolated dispatch for every distinct branch of all three
  opcodes (both tryhealhalfhealth operand forms incl. the 1-HP-max
  min-clamp edge; tryKO's Sturdy/both barriers/miss/level-too-high/success/
  Endure, each with an exact RNG-roll-count assertion) PLUS full
  committed-script walks to a genuine `{kind:"terminal",
  opcodeName:"B_SCR_OP_END"}` halt for all three effects: RESTORE_HP
  success + full-HP fail tail, SOFTBOILED success + full-HP fail tail (real
  script divergence from RESTORE_HP confirmed and cited: RestoreHp prints
  its own `STRINGID_PKMNREGAINEDHEALTH` tail directly off `BS_ATTACKER`,
  `battle_scripts_1.s:676-685`, never sharing a label; Softboiled instead
  falls into the shared `BattleScript_PresentHealTarget` label Rest's own
  success path also re-enters, `:2031-2034`), OHKO success (2 RNG rolls:
  tryKO's own + `seteffectwithchance`'s always-drawn effect-chance roll,
  confirmed real via source's own `&&` short-circuit order), OHKO miss tail
  (1 roll), OHKO level-too-high fail tail, and the Sturdy block tail (0
  rolls).
- **Next:** continue the ranked-table descent once the census regenerates
  post-merge (predicted next: the Roar trio, corrected by a parallel scout
  per this step's own brief, or the multi-hit pair).
- **Notes:** no PAPERCUT. Commits landed one per green rung: tryhealhalfhealth
  + its tests, the destinyBond helper fix + resultmessage barrier widening
  + tryKO/trysetdestinybondtohappen + their tests, ratchet/handler-count pin
  updates.

---
## 522 — [BOUNDED WORKER 2026-07-27 ~16:00] `turn6-statfall.json` ATK-fell text re-driven from kernel events (§12.3 step 3 landed); banner gate (step 4) found to need disproportionate new surface

- **State:** tree green at **268 files / 3560 tests** (unchanged count —
  wires an already-tested staging-module export into production code, no
  new test file), `npm run build` clean. `executableFrontierRatchet.test.ts`
  unmoved (6/6, zero new barriers).
- **Did:** executed `docs/presentation-seam-scout.md` §12.3 steps 3/4
  (§12.6 completion note appended). Step 3: `battleScene.ts` gained
  `TURN6_ATKFELL_KICKOFF_LINE1/2` (module-load-resolved from
  `turn6FeatherDancePresentationStaging.ts`'s already-staged
  `resolveTurn6AtkFellLines()`, unblocked by entry 520's charmap fix);
  `drawTurn6FeatherDanceKickoffText`'s own `atkFellStart` branch (`:9151`)
  now draws these instead of the raw `TURN6_ATKFELL_LINE1/2` literals. Zero
  bridge edits — entry 514's `resolveFeatherDanceKickoffPresentationWindowContent`
  already returned everything needed. **No literal died**: `TURN6_ATKFELL_
  LINE1/2` stay defined and live at turns 7/8's own repeat call sites
  (`:9397`/`:9586`, verified unchanged). Step 4 (the stat-fall banner gate,
  `drawTurn6StatFallBanner`/`turn6StatFallEva`): investigated and found
  **not cleanly wireable** — `turn6StatFallEva`'s tick-window gate is real
  presentation-native animation timing (no kernel-event/timestamp
  equivalent, §8.4 Option A re-confirmed a 6th time), and
  `drawTurn6StatFallBanner`'s hardcoded ONIX/attack/decrease selection is
  already exactly consistent with the kernel's real `stat-stage-change`
  (no live branch to redirect). Driving it "for real" would force either
  editing turns 7/8's own out-of-scope call sites (the function is a shared
  helper) or building a 7-way stat-to-palette-key translation table for six
  stat values this window never produces (a real naming mismatch too:
  `battleScriptEvents.ts`'s hyphenated `special-attack`/`special-defense`
  vs. `StatAnimBannerAsset`'s camelCase `spAttack`/`spDefense`) — exactly
  the disproportionate-new-surface case the brief's own escape valve names.
  Landed step 3 alone, per the brief's own instruction that this finding is
  a success, not a failure.
- **Acceptance (live, this session):** full sweep run BEFORE the change (on
  pristine `HEAD`) matched every recorded count exactly, then AFTER
  reproduced them byte-identically: `turn6-statfall.json` 127/127 (twice,
  incl. a determinism check), `turn6-featherdance.json` 90/90,
  `turn6-rockslide-a.json` 255/255, `turn6-feathers.json` 235/235,
  `turn6-menu.json` 44/44, `turn1-rockslide.json` 256/256,
  `turn5-rockslide.json` 256/256, `turn4-doubleteam.json` 250/250,
  `turn2-endeavor.json` 77/77.
- **Next:** either `turn11-featherdance.json`'s own ATK-floor wiring (same
  glyph class, now unblocked, a later step per this brief's own out-of-scope
  note) or the Roar/multi-hit registration side scouted in round 2.
- **Notes:** no PAPERCUT. One commit for the wiring + docs.
