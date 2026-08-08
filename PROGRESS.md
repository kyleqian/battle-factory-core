# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1005 — [bounded MAIN worker, 2026-08-08] **AI_CheckViability batch 5 LANDED: 12 effects (weight 48), incl. the flagged 10-weight SUBSTITUTE done properly; 21 of the brief's 37 remain**

- **State:** master `4066cd4e`, tree clean. Targeted acceptance **9 files / 1105 passed** (factoryAiCheckViability **520**, factoryAiScoredDecision **140**, factoryAiScoredWiringParity 4, factoryAiDecisionPolicy 16, factoryAiLiveDriver 6, factoryAiTryToFaint 10, factoryAiCheckBadMove 396, abilityItemParityCensus 7, executableFrontierRatchet 6); `npm run test:smoke` **375 passed**; `npm run build` exit 0; `npm run typecheck` exit 0. Full `npm test` NOT run (worker rule — supervisor after merge).
- **Did:** five commits, one batch each. **TICKLE** (3) was the cheapest win the brief predicted — `AI_CV_DefenseDown`'s body was already ported, only the `:769` dispatch entry was missing. **Revenge/Superpower/MagicCoat/Foresight/Endeavor** (3+3+3+3+4) — zero-new-field batch: Revenge's single <180 roll, Superpower/Endeavor's deterministic HP/type ladders (0 rolls), MagicCoat's two reachable rolls + `is_first_turn_for AI_USER` funcResult write, Foresight's non-BUGFIX user-side Ghost/evasion gates. **Encore+HealBell** (4+4) — wired `anyMoveDisabled`/`hasAnyStatus`/`targetPartyStatusEqualsAny` (target-side reads; the party field models `Cmd_if_status_in_party`'s exact-`==` scan); Encore's 62-entry encouraged last-move table gates its single <30 roll. **Substitute** (10, done properly per the brief's flag) — the three-HP-band <100 descent (roll count per band: >90 none / 70-90 roll3 / 50-70 roll2+3 / <=50 all three, each FALL-THROUGH -1) then target-faster gate then the last-move-effect dispatch to Substitute5/6/7/8's +1 roll; reused `hasAnyStatus` + existing `lastUsedMoveId`/`isConfused`/`isLeechSeeded`. **Trick+ChangeSelfAbility** (5+5+1) — Trick's Choice-Band subset vs 7-entry broad list, both `get_hold_effect` reads RNG-free; ChangeSelfAbility's `get_ability AI_TARGET` two-ability `Random()&1` guess consumes one `get-ability` draw; wired `holdEffect` (both sides) + `knownAbility`/`speciesAbilities` (target side).
- **Wiring:** every new field populated in pass-3 CheckViability literals the same commit, via the conditional-spread shape + new scored-view fields; per-field through-the-adapter tests (seed-scan pattern for the adapter's RNG-burning passes) prove each reaches its handler and changes the score. Census re-pinned once (RainDance sites + two new ABILITY_NONE recovery sites + four new infra spellings), doc byte-stable.
- **Next:** supervisor reviews + full `npm test` after merge. Remaining CV weight: DISABLE (5, deliberately left for its own funcResult-collision brief), BELLY_DRUM, MIRROR_MOVE, PAIN_SPLIT, POISON, THIEF, HAZE, BIDE, CONVERSION, etc. — the probe lists 21. The side-lane CV batch-2 and this batch-5 are converging; supervisor should coordinate the tail so they don't double-port.
- **Notes:** no PAPERCUTS of my own. Every `if_random_less_than` site per handler is receipt-pinned with the exact draw kind/ordinal in the handler tests; `funcResult` writes (MagicCoat's isFirstTurn, Foresight's type reads, Encore's last-move effect, Substitute's last-move effect, Trick's hold effects, ChangeSelfAbility's ability) are each asserted through the collision map.

---

## 1004 — [bounded MAIN worker, 2026-08-08] **The five unwired AI_CheckViability handler-input fields wired end-to-end + a structural guard that makes the defect class impossible** + 3 Part-C CV handlers

- **State:** master `4aaf3fe8`, tree clean. Targeted acceptance **9 files / 1059 passed** (factoryAiCheckViability **479**, factoryAiScoredDecision **140**, factoryAiCheckBadMove 396, factoryAiDecisionPolicy 16, factoryAiLiveDriver 6, factoryAiTryToFaint 6, abilityItemParityCensus 7, executableFrontierRatchet 6, **factoryAiScoredWiringParity 4**); `npm run test:smoke` **375 passed**; `npm run build` exit 0; `npm run typecheck` exit 0. Full `npm test` NOT run (worker rule — supervisor after merge).
- **Did (A):** confirmed the supervisor's audit exactly — all five (`hasSideReflect`, `isPoisoned`, `isBurned`, `isParalyzed`, `hasSubstitute`) had **zero** occurrences in the pass-3 CheckViability call; the fix was wiring-only, handlers were source-correct. Wired via conditional spreads (the `targetForCbm`/`attackerForCbm` shape): `hasSideReflect` ← new view field `targetSideReflectUp` (**target-side**; the existing `reflectUp` is AI_USER's own side only), `isPoisoned`/`isBurned`/`isParalyzed` ← three new view fields (target status1, `AI_CV_Facade`'s shipped non-BUGFIX AI_TARGET gate), `hasSubstitute` ← existing `view.attacker.hasSubstitute` (AI_USER's own, `AI_CV_FocusPunch3`). Five through-the-adapter tests prove each reaches the handler and changes the score; verified the BrickBreak one fails when the wiring is reverted. Commits `f63e4abe`.
- **Did (B):** `tests/factoryAiScoredWiringParity.test.ts` makes the class impossible: `vi.mock` wraps `runCheckViability`/`runCheckBadMovePreamble`/`runTryToFaint` to capture the exact objects the adapter hands each scorer (probe view sets every optional scored-view field to its firing value so every conditional spread fires); the declared handler-input field sets are derived from compile-time-exhaustive `Required<T>` samples (typecheck enforces the samples can't rot); asserts every declared field is present on the captured input (+ no extras for CV/CBM, one-directional for TTF's view passthrough). **Catches:** a handler-input field never populated on either side — verified it names `hasSideReflect` exactly when the wiring is reverted. **Misses:** a field wired to the WRONG side when the name exists on both sides' types (needs handler-source side analysis, not mechanically derived; Part A's per-field through-the-adapter tests are the side-specific guard for today's five). Commit `f1cb14d3`.
- **Did (C):** three more `AI_CheckViability` ports, one commit each + census re-pin commit each: **AI_CV_DreamEater** (EFFECT_DREAM_EATER, 6 weighted, deterministic weak-effectiveness gate reusing `classifyHighCritEffectiveness`, no new fields), **AI_CV_SleepTalk** (EFFECT_SLEEP_TALK, 8 weighted, AI_USER's-own STATUS1_SLEEP gate → **wired attacker-side `isAsleep`**, which the pass-3 adapter had only ever populated on the target literal), **AI_CV_KnockOff** (EFFECT_KNOCK_OFF, 7 weighted, target-HP gate → `is_first_turn_for AI_USER` funcResult write → single <180 roll; no new fields). Remaining top-weight: SUBSTITUTE (10, needs hasAnyStatus + target last-move effect + target-faster), DISABLE (5, has a funcResult-power-collision modeling question), TRICK/SKILL_SWAP (5 each).
- **Next:** supervisor reviews + full `npm test` after merge. SUBSTITUTE (10) is the next CV port; brief it with the hasAnyStatus view field + target-last-move-effect wiring. The side-lane CV batch-2 is in parallel.
- **Notes:** three census re-pins (4093/4150/4175 → 4130/4187/4212 → 4154/4211/4236 → 4217/4274/4299), each in its own commit per the brief; `docs/ability-item-parity-census.md` byte-stable through all three. No PAPERCUTS of my own.

---

## 1003 — [bounded MAIN worker, 2026-08-08] **AI_CheckBadMove 109/109 table effects ported** + the hardcoded barrier-pin trap retired permanently

- **State:** master `6b1cb0ad`, tree clean. Targeted acceptance **7 files / 575 passed** (factoryAiCheckBadMove **396**, factoryAiScoredDecision 129, factoryAiDecisionPolicy 16, factoryAiLiveDriver 6, battleScriptStockpileOpcode 15, abilityItemParityCensus 7, executableFrontierRatchet 6); `npm run test:smoke` **375 passed**; `npm run build` exit 0; `npm run typecheck` exit 0. Full `npm test` NOT run (worker rule — supervisor after merge).
- **Did:** ported the last 8 CBM effects — **Memento** (:482-484, falls THROUGH into BatonPass's count gate :485-488, reproduced via `runCbmBatonPass`), **Stockpile** (count vs 3), **SpitUpAndSwallow** (shared handler, x0 type gate then count vs 0 — the opposite comparison end of Stockpile's, same field), **Recycle** (usedHeldItemId vs ITEM_NONE), **Imprison/MudSport/WaterSport** (three identical single-`if_status3 AI_USER` gates). 8 → **0 remain (109/109)**. Added optional view fields, all defaulting to battle-start: `imprisonedOthers?`/`mudSportUp?`/`waterSportUp?` (false), `usedHeldItemId?` (0=ITEM_NONE), `stockpileCount?` (0, same 0..3 encoding as `battleScriptStockpileOpcode.test.ts`); wired additively through `attackerForCbm`.
- **Part B (the test trap):** exported `CHECK_BAD_MOVE_HANDLED_TABLE_EFFECTS` + `unportedCheckBadMoveTableEffects()` + `firstMoveIdWithEffect()` from the engine, plus a probe-based `unportedCheckViabilityTableEffects()` (probes `runCheckViability` itself, so a side-lane CV port can't break it). All ~13 barrier pins in `factoryAiCheckBadMove.test.ts` + the two scored-decision barrier tests now derive their example dynamically; **at 109/109 the pins assert the inverted property: no CheckBadMove table effect halts the machine any more** (each iterates `AI_CHECK_BAD_MOVE_TABLE_EFFECTS`, asserts `kind: "scored"`). The `MOVE_STOCKPILE` hardcoded example is gone.
- **Next:** supervisor reviews + full `npm test` after merge. CheckViability still has ~69 unported effects (side lane's batch-2 is in parallel); the barrier that this module's `unsupported-branch` guard still guards is now purely defensive — `AI_CHECK_BAD_MOVE_TABLE_EFFECTS` has no unported member, so the final table check is unreachable until a future source sync adds a new table effect without a port.
- **Notes:** the three sport/imprison gates shipped as one commit (byte-identical bodies, brief's per-effect recipe bent for the trio; everything else one commit per effect). Census re-pin (729/781/1330/2701) landed in its own commit. No PAPERCUTS of my own.

---

## 1002 — [bounded MAIN worker, 2026-08-08] AI_CheckBadMove batch 5 LANDED: all 10 effects, 101/109 table effects ported, 8 remain

- **State:** master at `4c991a7c`, tree clean. Targeted acceptance green: **6 files / 538 passed** (factoryAiCheckBadMove 374, factoryAiScoredDecision 129, factoryAiDecisionPolicy 16, factoryAiLiveDriver 6, abilityItemParityCensus 7, executableFrontierRatchet 6); `npm run test:smoke` **375 passed**; `npm run build` exit 0; `npm run typecheck` exit 0. Full `npm test` NOT run (worker rule — supervisor after merge; a run attempt exceeded the tool cap).
- **Did:** ported the ten remaining CheckBadMove effects, one commit each (`5a10a75b` view-state first): **AccUp** (EFFECT_ACCURACY_UP/_2), **SpAtkDown** (EFFECT_SPECIAL_ATTACK_DOWN/_2, shared `runCbmStatDownViaSharedTail` tail), **Haze** (EFFECT_HAZE + EFFECT_PSYCH_UP share `runCbmHaze`, :314-332), **Mist**, **Disable**, **Encore**, **Attract** (:456-476). 18 → **8 remain** (IMPRISON, MEMENTO, MUD_SPORT, RECYCLE, SPIT_UP, STOCKPILE, SWALLOW, WATER_SPORT). Added optional view fields: `gender` (`FactoryAiMonGender`, MON_MALE/FEMALE/GENDERLESS, undefined-is-genderless), `spAtkStage?` (target), `accStage?` (attacker), `anyMoveDisabled?`/`anyMoveEncored?` (target), `mistUp?` (attacker), `isInfatuated?` (target, CBM-side only). Wired through `targetForCbm`/`attackerForCbm`; all additive.
- **Correction to the ledger, confirmed against source:** PROGRESS.md's claim that the remaining 18 are "blocked on MISSING STATE, not transcription" and that PSYCH_UP needs "Haze-style stat-stage copying" is wrong in detail — 6 of the 10 needed no new state, and EFFECT_PSYCH_UP dispatches to AI_CBM_Haze itself (`battle_ai_scripts.s:181`), no separate handler. **Vestigial finding:** EFFECT_ACCURACY_UP/_2 and EFFECT_SPECIAL_ATTACK_DOWN/_2 have **zero Gen-3 moves** (battle_moves.h uses effects 15/55/21/61 for nothing; the header itself marks 21 `// unused`), so those handlers are dispatch-reachable only and are receipt-pinned via exported entry points.
- **Trap handling:** porting EFFECT_HAZE broke 13 generic-barrier pins in `tests/factoryAiCheckBadMove.test.ts` + the scored-decision CheckBadMove example — all re-pointed to MOVE_STOCKPILE (254, still-unported EFFECT_STOCKPILE), maintenance comments intact. Census re-pinned in its own commit (`4c991a7c`): recovered sites 539/591/1140/2293 → 615/667/1216/2493, ABILITY_OBLIVIOUS refs 6→8.
- **Next:** the 8 remaining effects are the real state-laden ones (STOCKPILE/SWALLOW/SPIT_UP count, MEMENTO/RECYCLE item, IMPRISON/MUD_SPORT/WATER_SPORT) — brief with those fields, not another transcription batch. The side-lane CheckViability batch-2 is in parallel.
- **Notes:** no PAPERCUTS of my own. Full `npm test` attempt exceeded the 10-min tool cap mid-run; all affected-area suites, smoke, build, and typecheck were verified green independently.

---

## 1001 — [supervisor WIND-DOWN, 2026-08-08] Session summary: 20 workers / 8 rounds — ISSUES #80 CLOSED, **8 reachable engine barriers retired**, 44/66 CheckBadMove + first CheckViability batch, battleScene canonical split begun, 2 animation folds

- **State:** master at this entry's commit, clean. **Final independent union
  verification: full `npm test` 772 files / 7545 passed / 1 skipped, exit 0;
  `npm run build` exit 0** (session start was 768 / 7288). DEFERRED.md: no open
  entries — the next `run-supervisor.sh` is unblocked.
- **Folds:** `animation-main` folded **twice** (6 commits: MOVE_DETECT exact +
  IRON_TAIL staged; then 20 commits: MOVE_CRUSH_CLAW exact 124→125 + probe
  offset fixes). The second fold's conflict surface was real — the animation
  lane edited `battleScene.ts` while the main lane moved ~1,750 lines out of it
  — and auto-merged cleanly. **6 further animation commits (TAKE_DOWN staging)
  are left UNFOLDED**: that lane is still actively committing, and those
  commits touch only `src/animation/`+`tests/animation/`+`tools/`, so there is
  no conflict surface with the split. Next orient takes them.
- **ISSUES #80 CLOSED and deleted.** The submenu opened 3 frames early;
  `mid-battle-switch-dense-a-off` **392 → 395/395** byte-exact (supervisor
  reran the compare independently). The whole in-battle party-menu program is
  now discharged.
- **Eight reachable engine barriers retired** — all found by the new
  `docs/barrier-reachability-triage.md` (50 sites classified: 12 (A) reachable,
  1 (B), 15 (C) source-cited unreachable, 22 (D) input guards). Each halted the
  battle-script machine in ordinary play: **Castform** Forecast form/type
  change; **Substitute** fade (plus a latent exact-lethal-damage bug — source
  re-checks `substituteHP == 0` after BOTH branches); **Focus Band** vs OHKO
  moves (78 L50 carriers); **Truant Slaking**'s loafing turn + fire-move thaw
  message tables; **Struggle recoil** (universal) + Beat Up; **Pursuit** both
  halves, now end-to-end; **Spikes** faint EXP; **Focus Punch** charge-up —
  which required porting `Cmd_playanimation`'s full five-way dispatch, because
  Scene-OFF sets `HITMARKER_NO_ANIMATIONS` for the whole battle, making its
  gates the normal path. **Ratchet pins moved 51 → 46.**
- **Opponent AI: 44 of 66 `AI_CheckBadMove` effects ported** (4 batches, one
  commit per effect; it was 4 at session start). Unported effects were scored `unsupported-branch` and
  discarded as failed candidates, so the AI ran with most of its reasoning off.
  **18 remain, and they have changed character**: the remainder is blocked on
  MISSING STATE, not transcription — DISABLE/ENCORE need any-move-disabled and
  encored flags, STOCKPILE/SWALLOW/SPIT_UP a stockpile count, ATTRACT gender,
  PSYCH_UP Haze-style stat-stage copying. The next brief's real subject is that
  state wiring, not another transcription batch.
- **`battleScene.ts` canonical split begun** (user-approved): mechanical
  partition script + design doc, then 4 slices moving **293 symbols**;
  `battleScene.ts` **36,897 → 35,417** (net; the animation fold added CRUSH_CLAW
  back), `battleSceneCanonical.ts` 2,418. **Every slice differential
  1369/1369 byte-identical**, supervisor-reran once independently. Honest
  scope: this is a move within one module graph — the canonical code STILL
  SHIPS; and the canonical bucket is only ~5.3k lines, so this is a ~14%
  reduction, not the 90% the export count suggested.
- **Supervisor corrections (mine):** (1) I merged the Castform work leaving
  master RED — `battleScriptRulesContext.test.ts` pins exact field/handler
  lists and the step never touched it. A worker's own full suite caught it, not
  my merge check. Fixed, and that pin is now in `test:smoke` (~2 s) so it can
  never repeat. (2) I ran `git add -A` mid-worker and swept its in-progress
  563-line script into my commit (PAPERCUTS, hits 1→2, both directions now
  observed). (3) I briefed two already-landed steps from stale docs; both
  workers correctly reported the no-op, and #39's six-day-stale remainder text
  is corrected. (4) I **refuted my own audit's Lightning Rod (A) claim** —
  unreachable in singles (the redirect needs a holder on the opposite side that
  is not the target, and flips to `BIT_FLANK`, which does not exist at
  `gBattlersCount == 2`). (5) I omitted the no-full-suite clause from one main
  brief and it cost that worker its turn to a cap-kill (work salvaged).
- **`AI_CheckViability` (the sibling scorer) opened too:** Rest 49, Absorb 43,
  OHKO 28, Endure 24 ported; **69 table-listed effects remain**, next
  BRICK_BREAK 46 (needs target-side Reflect) and SEMI_INVULNERABLE 32 (inputs
  already modeled). AI_CV_Endure's non-obvious fall-through is worth knowing:
  hp% >= 35 falls INTO the -1 branch rather than skipping it.
- **The last full suite caught a real red that targeted runs missed.**
  `tests/factoryAiScoredDecision.test.ts` hardcodes one still-unported effect
  as its "barrier still fires loudly" example; porting EFFECT_ABSORB silenced
  it. Re-pointed at MOVE_EXPLOSION with a maintenance comment, and the triage
  queue now says every AI batch must run that file. **Third instance today of
  the same class** — an assertion about the engine that the engine quietly
  grew past.
- **Next (ordered):** (1) more `AI_CheckViability` batches (69 left, proven
  recipe). (2) The 18 remaining `AI_CheckBadMove` effects — these need the
  state wiring named above FIRST, so brief that wiring, not another
  transcription batch. (3) split slice 4 continuation — blocked on two cross-program
  decisions the worker correctly refused to make alone: a type-only export
  widening, and `drawTurn16PostSwitchField`, which would force
  `battleSceneCanonical.ts` to import `src/animation/` and trip the boundary
  ratchet. (4) triage items 11 (prove reachability FIRST — its own entry admits
  it was never proven) and 12.
- **Notes:** 20 workers, 1 cap-kill (salvaged: it committed per batch, so
  nothing was lost), 0 lost work. At orient the host carried **three orphaned
  `probeEvolutionBasic.ts` processes, PPID 1, 3 days old**, burning ~200% CPU;
  killed, with a detection command in PAPERCUTS — worth repeating every orient.
  **Standing lesson from three separate finds: a barrier's own reason string
  decays.** Focus Band, `getexp` BS_FAINTED and `Cmd_manipulatedamage` each
  carried a comment asserting the case could not happen; all three were false
  by the time they were read. Verify a barrier's premise against source before
  briefing it, and update the string as part of the fix.

