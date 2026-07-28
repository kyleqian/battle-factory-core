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
## 527 — [BOUNDED WORKER 2026-07-27 ~18:35] turn11-featherdance ATK-floor text wired from kernel events (§14.3)

- **State:** tree green at **274 files / 3632 tests** (unchanged — no new
  test file; this step wires an already-tested staging-module export into
  production code), `npm run build` clean. `executableFrontierRatchet.test.ts`
  unmoved (6/6, zero new barriers).
- **Did:** executed `docs/presentation-seam-scout.md` §14.3's plan exactly —
  wired `drawTurn11FeatherDanceWindow`'s ATK-floor branch
  (`battleScene.ts:11451`) to draw a new module-level const pair,
  `TURN11_ATKFLOOR_KICKOFF_LINE1`/`LINE2`, resolved once at module load from
  the already-committed, already-tested
  `turn11FeatherDancePresentationStaging.ts`'s `resolveTurn11AtkFloorLines()`,
  instead of the raw `TURN11_ATKFLOOR_LINE1`/`LINE2` literals. Zero bridge
  edits (§14.2's finding held — the existing turn-6 bridge resolves this
  floored branch unchanged). Kickoff-text branch and ROCK_SLIDE half
  untouched, per plan scoping (`git diff` touches only the import line + one
  const block + one call-site swap). All §14.3/§14.4 citations re-verified
  against `HEAD` before editing — no drift, no design-doc slip this time.
  Appended §14.5 completion note to the scout doc, mirroring §13.5's format.
- **Verified:** `turn11-featherdance.json` 178/178 before AND after (twice
  after, determinism check) — byte-identical to §14.4's pinned baseline. Full
  §14.3 regression sweep (`turn11-menu.json` 56/56, `turn11-rockslide.json`
  163/163, `turn6-featherdance.json` 90/90, `turn6-statfall.json` 127/127,
  `turn2-endeavor.json` 77/77, `turn3-rockslide.json` 256/256,
  `turn1-rockslide.json` 256/256, `turn5-rockslide.json` 256/256,
  `turn4-doubleteam.json` 250/250) — every count matches its recorded value,
  zero regressions. `TURN11_ATKFLOOR_LINE1`/`LINE2` stay defined (no literal
  died) — confirmed by grep their only remaining readers are the two
  pre-existing tests, not production code.
- **Notes:** §14.4's own doc text cited `npm test` as 269/3570 (stale
  against this worktree's `HEAD` — entries 524-526's Roar/multi-hit work
  landed 274/3632 in between); noted in the §14.5 completion note so the
  discrepancy doesn't read as this step's own regression. No PAPERCUT. One
  commit (wiring), one commit (docs: §14.5 note + this entry).
- **Next:** turn13-sandattack wiring is banked (§15) for a later step — out
  of this step's scope, not started. EXPLOSION pair (25) / SEMI_INVULNERABLE
  trio (32) remain the next ranked census rows.

---
## 526 — [BOUNDED WORKER 2026-07-27 ~18:00] EFFECT_TRIPLE_KICK + EFFECT_ROAR registered end to end; roar-multihit cluster (5 effects/18 moves/63 weighted) complete

- **State:** tree green at **273 files / 3623 tests** (272/3609 → +1 file /
  +14 tests: new `battleScriptForceSwitchOpcode.test.ts` 11 tests, +3 in
  `battleScriptMultiHitFamily.test.ts` for Triple Kick), `npm run build`
  clean. Census regenerated: **116/214 effects, 235/355 moves, 189/276
  Factory-L50 unweighted, 2441/2957 weighted (82.5%)** — up from
  115/214/187/276/2401/2957 (81.2%). **Actual flip matches the scout's
  predicted end-state exactly** (5 effects/18 moves/63 weighted across both
  sessions; this session's own share: EFFECT_ROAR 2 moves/40 weighted,
  EFFECT_TRIPLE_KICK 1 move/1 weighted). 37/37 self-checks pass (EFFECT_ROAR's
  exact-missing-opcode pin retired to `requireExecutable`; EFFECT_TRIPLE_KICK
  gained a new `requireExecutable` pin; net +1 check).
- **Did:** followed `docs/roar-multihit-registration-scout.md` §4's rung
  order (rungs 7-14, entry 525's named remainder).
  **Triple Kick (rungs 7-9):** `damagecalcOpcodeHandler` now reads
  `rules.tripleKickPower` for the real 10/20/30 dynamic-base-power ramp
  (`battleScriptHitChainOpcode.ts`); `ADDBYTE`'s `sTRIPLE_KICK_POWER` delta
  literal `"10"` and `JUMPIFBYTE`'s standalone `MOVE_RESULT_DOESNT_AFFECT_FOE`
  (`1<<3`) added as resolvable literals (`battleScriptSetByte.ts`);
  `JUMPIFBYTE` now reads `sMULTIHIT_STRING + 4` off the `multiHitStringCounter`
  field entry 525 already wired a writer for; `INITMULTIHITSTRING` now really
  zeroes that counter (was a no-op advance until this session gave it both a
  writer and a reader).
  **Roar (rungs 10-14, new file `battleScriptForceSwitchOpcode.ts`):**
  registered `B_SCR_OP_FORCERANDOMSWITCH` (`TryDoForceSwitchOut`'s exact
  PARTY_SIZE=6 rejection sampling, the level-gated `Random()&0xFF` roll only
  when the target out-levels the attacker, `validMons<=1` fail gate, writes
  `monToSwitchIntoId` directly via the same plain-reducer pattern
  `openpartyscreen`'s AI branch uses — Roar's outgoing battler is healthy and
  gets no say, so it does *not* route through the fainted-replacement
  decision boundary — then jumps to the hardcoded, bytecode-invisible
  `BattleScript_SuccessForceOut` label), `B_SCR_OP_SWITCHOUTABILITIES`,
  `B_SCR_OP_RETURNTOBALL` (both source-complete, zero barriers, compose with
  the already-registered switch-in tail unmodified), and
  `B_SCR_OP_FINISHACTION` as a permanent (b) barrier — per
  `docs/script-terminal-gate3-evidence.md`'s own explicit recommendation to
  defer real implementation (needs a typed action-scheduler receipt this
  engine doesn't have), and doubly unreachable for Factory anyway (the
  trainer-battle fork is always taken; even the counterfactual non-trainer
  arm barriers first on the pre-existing `VARIOUS_SET_TELEPORT_OUTCOME` guard).
- **Three hidden barriers found live this session (budgeted for by the
  brief), beyond entry 525's one dossier slip:** (1) `Cmd_copyarray`'s
  `gDynamicBasePower<-sTRIPLE_KICK_POWER, 2` tuple — the scout's §1d table
  wrongly marked this "registered"; it was never in
  `battleScriptIngrainLeechSeedWrapOpcode.ts`'s accepted tuple set. Widened
  as a pure-advance no-op (`gDynamicBasePower` has no materialized field —
  `damagecalc` reads `tripleKickPower` directly). (2) `JUMPIFBYTE`'s
  standalone `MOVE_RESULT_DOESNT_AFFECT_FOE` value, gating
  `BattleScript_TripleKickPrintStrings`' own "Hit X times!" print — not in
  the scout's tables at all. (3) **A second real dossier slip**:
  `BATTLE_TYPE_ARENA` was defined locally in `battleScriptJumpifwordOpcode.ts`
  but never actually added to `JUMPIFWORD_VALUES` (only used as an internal
  building block for the `BATTLE_TYPE_FRONTIER` OR-mask) — the scout's §1a
  table wrongly claimed it was "already in JUMPIFWORD_VALUES". Fixed: Roar's
  own `jumpifbattletype BATTLE_TYPE_ARENA, BattleScript_ButItFailed` now
  resolves (always false for Factory).
- **Tests:** full committed-script walks to a genuine `{kind:"terminal",
  opcodeName:"B_SCR_OP_END"}` halt for both effects. Triple Kick: zero-hits
  miss, partial 2-of-3-hits-then-miss, and all-3-hits-land (via
  `decrementmultihit`'s own fallthrough exit), each with pinned RNG-roll
  counts covering per-hit accuracy semantics. Roar: unconditional-success
  (equal level), roll-gated success/fail (fail hand-verified: roll=14 <=
  threshold=25), a real accuracy miss (max target evasion), `validMons<=1`
  fail, Suction Cups and STATUS3_ROOTED pre-checks (zero RNG draws, both
  gate before either accuracycheck), and the non-trainer
  `jumpifbattletype` fork arm (barriers on the pre-existing
  `VARIOUS_SET_TELEPORT_OUTCOME` guard, never reaching FINISHACTION) — plus
  isolated dispatch tests for `SWITCHOUTABILITIES`' Natural Cure branch and
  `FINISHACTION`'s own barrier. Updated 8 stale test fixtures'
  `multiHitStringCounter` field (tsc -b `noUnusedLocals`/shape checks) and
  2 now-stale barrier-pin tests (Triple Kick's own `ADDBYTE`/
  `INITMULTIHITSTRING` barriers, both now real pass-through behavior).
  Handler-count pin 124→128 (4 new opcode IDs).
- **Notes:** no PAPERCUT. Four commits: Triple Kick + tests, Roar + tests,
  census regen. `EFFECT_RAGE`/`EFFECT_SLEEP_TALK`/semi-invulnerable/
  `EFFECT_EXPLOSION` (out of scope this step) remain the next ranked rows.

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
