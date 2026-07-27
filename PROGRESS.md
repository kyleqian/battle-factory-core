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
## 525 — [BOUNDED WORKER 2026-07-27 ~17:15] EFFECT_MULTI_HIT/DOUBLE_HIT/TWINEEDLE registered end to end; EFFECT_TRIPLE_KICK/ROAR named remainder

- **State:** tree green at **272 files / 3609 tests** (271/3597 → +1 file /
  +12 tests: new `battleScriptMultiHitFamily.test.ts`), `npm run build`
  clean. Census regenerated: **115/214 effects, 233/355 moves, 187/276
  Factory-L50 unweighted, 2401/2957 weighted (81.2%)** — up from 111/217/177/
  2378. 36/36 self-checks pass (3 pins moved from `requireExactMissingOpcodes`
  to `requireExecutable`, reason named in the generator's own comment).
- **Did:** followed `docs/roar-multihit-registration-scout.md` §4's rung
  order. Registered `B_SCR_OP_INITMULTIHITSTRING` (zero-operand advance —
  its only reader-carrying byte has no writer/reader anywhere in scope) and
  `B_SCR_OP_JUMPIFHASNOHP` (`battleScriptRuleCommands.ts`, both new opcode
  IDs 142/227). Widened three already-registered dispatchers on narrow new
  operand values: `JUMPIFHALFWORD`+`gChosenMove` (Sleep-Talk gate),
  `JUMPIFBYTE`'s shared value table +`MOVE_RESULT_FOE_ENDURED` (Endure
  re-check), `JUMPIFABILITY`+`ABILITY_SUCTION_CUPS` (Roar rung 1, done since
  cheap and independent — **found and fixed the scout's one dossier slip**:
  it cited value `31`, the real header value is `21` — 31 is
  `ABILITY_LIGHTNING_ROD`).
- **Two further hidden barriers found live** (budgeted for per the brief;
  found by actually running the committed scripts to terminal, not by
  trusting the scout doc's §1c/§1d tables): (1) `COPYARRAY`'s
  `(cEFFECT_CHOOSER, sMULTIHIT_EFFECT, 1)` tuple — the scout's own table
  marked this whole opcode "yes, already registered," missing that this
  specific tuple wasn't. (2) The `sMULTIHIT_STRING + 4` hits-landed
  counter's `ADDBYTE` write and its `gBattleTextBuff1 <- sMULTIHIT_STRING`
  `COPYARRAY` presentation read — the scout's §1d table scoped this counter
  to Triple Kick only; it's real on **every** multi-hit iteration
  (`BattleScript_DoMultiHit`'s own shared tail). Both widened: the first
  reuses the existing SETBYTE byte-table read/write; the second got its own
  dedicated `multiHitStringCounter` rules field (can't join the shared
  SETBYTE pointer universe — that table's own eager-validation invariant
  requires every listed pointer have a concrete `setbyte` site, and this one
  never does, only `addbyte`) plus a pure-advance no-op for the presentation
  copy (text-buffer bytes have no reader in this engine's scope, same
  boundary `INITMULTIHITSTRING`'s own doc comment already established).
- **Tests:** `battleScriptMultiHitFamily.test.ts` — full committed-script
  walks for all three effects to a genuine `{kind:"terminal",
  opcodeName:"B_SCR_OP_END"}` halt via the real production handler
  composition, RNG roll counts pinned (1 accuracy + hit-count draw(s) + 2
  rolls/hit-landed + 1 final effect-chance roll), including two different
  MULTI_HIT hit counts from different seeds and TWINEEDLE's poison-chance
  composition (both outcomes). Plus isolated dispatch tests for
  INITMULTIHITSTRING/JUMPIFHASNOHP (`battleScriptRuleCommands.test.ts`) and
  fixed 6 now-stale barrier-pin tests across
  `battleScriptJumpifhalfwordOpcode.test.ts`/`battleScriptJumpifbyteOpcode.test.ts`/
  `battleScriptIngrainLeechSeedWrapOpcode.test.ts`/`battleScriptSetByte.test.ts`
  that predated these widenings (one was testing the *wrong* thing entirely —
  see Notes). Updated 8 handler-count pins (+2 opcodes: 122→124 in the main
  composition; `141, 248` → `141, 142, 227, 248` in 8 smaller composition
  tests) and the ratchet's `battleScriptDamagingWeatherOpcode.ts` barrier
  count (3→4, named: the new `sMULTIHIT_STRING + 4` special case has its own
  narrow guard, distinct from the shared-universe fallback's).
- **Remainder (named, not hidden):** `EFFECT_TRIPLE_KICK` (scout §4 rungs
  7-9: `damagecalcOpcodeHandler` needs to read the already-tracked
  `rules.tripleKickPower` instead of hardcoded 0; a second `JUMPIFBYTE`
  memByte case for its own hit-counter; already inherits this session's
  INITMULTIHITSTRING/JUMPIFHASNOHP/gChosenMove/FOE_ENDURED/sMULTIHIT_STRING+4
  widenings for free — confirmed it now runs past all of them and barriers
  cleanly on the still-real `sTRIPLE_KICK_POWER, 10` ADDBYTE gap, not a
  silent fallthrough) and `EFFECT_ROAR` (scout §4 rungs 10-14: new
  `FORCERANDOMSWITCH`/`SWITCHOUTABILITIES`/`RETURNTOBALL` opcodes, the
  PARTY_SIZE=6 rejection-sampling switch pick, composition with the existing
  switch-in tail). Both untouched this session — ran out of budget after the
  two hidden-barrier detours above; the multi-hit family itself is the
  brief's own named "mandatory resting state" (§4 puts it before Roar's own
  rungs 10-14), landed complete and green.
- **Notes:** one real dossier slip found (`ABILITY_SUCTION_CUPS` = 21 not
  31) plus two hidden barriers beyond the scout's own list, both budgeted-for
  by the brief and both fixed within this step, not deferred. **One of my
  own first-draft test fixes was itself wrong** (assumed `JUMPIFABILITY`'s
  barrier fires on an unrecognized *battler* ability rather than an
  unrecognized *script comparand* — caught by actually running it, corrected
  before committing). No PAPERCUT. Three commits: multi-hit registration +
  tests, census regen.

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
