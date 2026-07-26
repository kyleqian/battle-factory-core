# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 462 — Ingrain/Leech Seed/Wrap-family registered: setters + end-turn bodies executable (entry 461's next-item list)

- **State:** tree green at **219 files / 2610 tests** (+1 file/+20 tests
  over entry 461's 218/2590), build green. Ratchet: `battleScriptHitChainOpcode.ts`
  25→23 barriers (two retired **for real**, not narrowed — see below), new
  `battleScriptIngrainLeechSeedWrapOpcode.ts` pinned at 3 (deliberate, named
  in the ratchet's own comment). One commit (`0a29dfe`). Census
  live-regenerated: **73/214→76/214 effects, 152/355→160/355 moves,
  118/276→125/276 Factory-L50** (25/25 self-checks pass). Verify script
  rerun live against the oracle twice for determinism: **18/18 PASS** both
  times (`node --experimental-strip-types tools/probe/verify-ingrain-leechseed-wrap-ground-truth.ts`).
- **Did:** followed `docs/ingrain-leechseed-wrap-ground-truth.md`'s own
  dependency-ordered slices end to end.
  1. **Setters:** new `TRYSETROOTS` (Ingrain, one concrete site, no RNG) and
     `SETSEEDED` (Leech Seed — accuracy/already-seeded/Grass-immunity/success
     branches, `STATUS3_LEECHSEED`+seeder-id bits) opcodes in a new
     `battleScriptIngrainLeechSeedWrapOpcode.ts`. Wrap's own setter needed no
     new opcode — `MOVE_EFFECT_WRAP` is a new case inside the
     already-registered `Cmd_seteffectwithchance` dispatch
     (`applySetMoveEffect`): the `(Random()&3)+3` duration roll, plus two new
     per-battler fields this doc's own gap analysis flagged
     (`wrappedMove`/`wrappedBy`, optional/defaulted so no existing fixture
     needed updating).
  2. **End-turn bodies:** wired real `ENDTURN_INGRAIN`/`LEECH_SEED`/`WRAP`
     ticks into `battleEndTurnOrchestration.ts`'s existing loop, in the
     enum's real execution order (INGRAIN, ABILITIES/ITEMS1 no-op,
     LEECH_SEED, POISON/BAD_POISON/BURN, NIGHTMARE, CURSE, WRAP, UPROAR
     no-op, THRASH, ...) — **not** the C switch's own textual case order,
     which is cosmetically different and would have mis-sequenced Leech
     Seed/Wrap against the already-landed status-damage tick. Factored the
     repeated "run tick, propagate opcode-barrier, check outcome-decided"
     shape into one `applyTickOutcome` helper shared by all four ticks now
     (status-damage + the three new ones).
  3. **Two real shape gaps the doc named, both closed:** `Cmd_datahpupdate`'s
     negative-damage (HP gain) branch was a barrier from an earlier rung
     ("needs maxHP, unmodeled") — `maxHP` has existed since the burn/poison
     work, so this was just stale; implemented the real heal-clamped-at-maxHP
     branch (no bide/shellBell/physical-special bookkeeping on this branch,
     matching source exactly). `Cmd_cleareffectsonfaint`'s `STATUS2_WRAPPED`
     cross-battler barrier is now a real clear using the new `wrappedBy`
     identity (a fainted mon's own traps release on its allies/foes for
     real).
  4. **Two narrow opcode-table gaps the census tool itself surfaced, not the
     doc:** `PRINTFROMTABLE_TABLES` was missing `gLeechSeedStringIds`
     entirely (opcode-registered ≠ every table pointer wired); `PLAYANIMATION`'s
     animType allowlist needed `B_ANIM_INGRAIN_HEAL`/`B_ANIM_LEECH_SEED_DRAIN`/
     `B_ANIM_TURN_TRAP` added (both discovered by running the tests, not
     predicted in advance — fixed same rung).
- **Test:** full setter lifecycle for all three (Ingrain success/already-rooted;
  Leech Seed success/Grass-immune/already-seeded, entering post-accuracycheck
  per the doc's own scope note since that roll is already covered elsewhere;
  Wrap's duration roll/already-wrapped-skip/`BattleScript_MoveEffectWrap`
  return, isolated at the `seteffectwithchance` dispatch per this codebase's
  own established per-opcode testing convention rather than gambling on a
  full accuracy/crit/damage RNG chain) — 11 tests, new file. End-turn tick
  tests extending `battleEndTurnOrchestration.test.ts`: Ingrain heal capped
  at maxHP (doc's live 159→161 ledger) and uncapped, Ingrain's real full/0-HP
  guard, Leech Seed drain+heal (doc's live numbers) plus a Liquid Ooze
  reversal (seeder damaged instead of healed — the ability check is on the
  **seeded** mon per source, confirmed against `Cmd_jumpifability`'s exact
  call site), Wrap still-trapped decrement+damage and release-with-no-damage
  — 7 new tests. Plus 3 new barrier-reachability tests (COPYARRAY/
  JUMPIFABILITY/MANIPULATEDAMAGE's own narrowed-tuple misses) required by
  the ratchet's own "every pinned module needs a reachability test" check.
  All zero-RNG assertions match the doc's own live ledger exactly.
- **Ratchet pin moves, named:** `battleScriptHitChainOpcode.ts` 25→23 (both
  retirements are real — see item 3 above, not a narrowing);
  `battleScriptIngrainLeechSeedWrapOpcode.ts` new at 3 (`COPYARRAY` narrowed
  to `BattleScript_LeechSeedTurnDrain`'s own `gBattleMoveDamage<-gHpDealt`
  tuple among 16 concrete call sites; `JUMPIFABILITY` narrowed to
  `BS_TARGET`/`BS_ATTACKER` + `ABILITY_LIQUID_OOZE` among 18; `MANIPULATEDAMAGE`
  narrowed to `DMG_CHANGE_SIGN` among 4 — `DMG_RECOIL_FROM_MISS`/`DMG_DOUBLED`
  out of this slice's scope).
- **Next:** CheckViability handler bodies (entry 460's own carried item,
  phased by the earlier audit's 16-reachable-handler table), seam window 3
  (`turn5-rockslide.json`), ENDTURN_ABILITIES/ITEMS1/ITEMS2 breadth (pure-C,
  explicitly out of this step's scope), Nightmare/Curse/Thrash/Disable/Taunt
  end-turn bodies now that their own case-barriers are the only ones left in
  `runDoBattlerEndTurnEffects` (no move effect sets any of their trigger
  bits yet, so still genuinely inert, not just undertested).
- **Notes:** no factory-AI or `docs/factory-ai-*.md` changes (side worker's
  area this hour, per the brief's own scope line) — untouched. No new
  PAPERCUT: the two "opcode registered ≠ every table/animType entry wired"
  gaps (PRINTFROMTABLE/PLAYANIMATION) cost some time but were caught by the
  test suite itself within the same session, not a dev-loop friction worth
  flagging separately from ordinary iteration.

---
## 461 — Full-turn reducer: PLAYER-side forced-switch variant lands (entry 459's item 3, the named remainder)

- **State:** tree green at **218 files / 2585 tests** (+0 files/+3 tests
  over entry 460's 218/2582 — only added tests to the existing
  `factoryBattleScriptFullTurnDecision.test.ts`), build green, ratchet
  unchanged (6/6 — no barrier call site touched). Two per-rung commits
  (`b3f8276` plumbing, `fccfd9d` tests), both green.
- **Did:** surfaced the `faint1`/`faint2` `"player-choice-required"` fork
  (both previously threw "outside this reducer's modeled domain") as a real
  `"forced-switch"` decision-required boundary, mirroring
  `factoryBattleScriptTerminalDecision.ts`'s own `forced-switch-pending`
  phase + resume machinery. Added `playerBenchHp`/`playerBenchOverride` to
  `FactoryFullTurnConfig` (party slot 0 = active, this reducer's own
  convention — both player and opponent parties now share one `benchSlot`
  helper). New `pendingForcedSwitchAt`/`pendingScriptAt`/
  `buildForcedSwitchPendingRules` reconstruct the halted
  `BattleScript_HandleFaintedMon` script from a durable `pendingScript`
  bundle (programCounter/callStack/scheduler); `resumeFullTurnForcedSwitch`
  resumes it via `resumeBattleScriptFaintedActionsAfterPlayerChoice`, and a
  `"resumed"` result runs straight into a new shared `runEndTurnTail` helper
  (factored out of the existing two-action-turn tail, now called from both
  the normal turn path and the forced-switch resume path).
- **Test:** a pure side-relabeling of entry 459 item 2's own trainer-side
  fixture (same STRENGTH/200atk/50def/90hp one-shot, same speed gap) so the
  trainer's killing blow KOs the player's active mon instead. Pins: the
  reducer surfaces `{kind:"forced-switch", side:"player", battler:0,
  faintedPartyIndex:0, legalPartyIndexes:[1]}` (not a throw); submitting the
  legal MACHOP slot rebuilds the active battler (species/hp/partyIndex/
  neutral stat stages/clean status — moves/pp/other stats intentionally NOT
  rebuilt, per `battleScriptSwitchinOpcode.ts`'s own documented "ability/
  item/moves/pp stay untouched" scope) and resumes to a genuine next command
  boundary; exact RNG ledger (4 total across all three submissions — just
  the killing blow's own hit chain, zero from the forced-switch dance, zero
  from the cancelled second action, zero from the quiet end-turn); PP ledger
  (trainer's Strength used once, the player's own action never dispatched);
  the fainted/active slot (index 0) is rejected.
- **Next:** entry 460's own list stands, item 3 is now the completed
  remainder off it — `CheckViability` handler bodies phased by the audit's
  16-reachable-handler table (ground truth scout first), Ingrain/Leech
  Seed/Wrap registration, seam window 3 (`turn5-rockslide.json` per the
  scout doc's ranking), ENDTURN_ABILITIES/ITEMS breadth.
- **Side merge (same hour, supervisor-verified, `83f15c3`):**
  `addbyte`/`jumpifbytenotequal` widened off their single hardcoded
  `gBattleCommunication`/`gBattlersCount` tuple onto the shared SETBYTE
  byte-lvalue universe (+`gBattlersCount` sentinel comparand) —
  `BattleScript_WeatherFormChanges` now runs to its own `return` for
  non-Castform L50 singles (0 RNG draws), Castform barrier still reached
  *through* the loop; Perish Song/Teeter Dance/Intimidate/Palace loop
  counters ride the same mechanism (not separately tested). Census
  unchanged (opcode-level dispatch only; regenerated zero-diff, 25/25
  self-checks); ratchet barrier count still 3 (comment updated). Merged
  suite 218 files / 2590 tests + build re-verified green.
- **Notes:** pure reducer/config work, no presentation/census/opcode-
  registration changes (as scoped; `battleScriptSetByte.ts`/
  `battleScriptDamagingWeatherOpcode.ts` untouched, left for the side worker
  this hour). Scratch-verified via a deleted `tests/_scratch_item3.test.ts`
  before writing the real test (same discipline entry 459 used), confirming
  the exact RNG/PP numbers and the switch-in module's documented
  moves/pp-untouched limitation before asserting on it. No PAPERCUT logged.

---
## 460 — [SUPERVISOR WIND-DOWN 2026-07-25 ~21:50] session summary

- **State:** tree committed and green at **218 files / 2582 tests**, build
  green, census live-verified **73/214 effects, 152/355 moves, 118/276
  Factory-L50 executable** (session start: 53/105/77; all 25 census
  self-checks pass), single main worktree, zero unmerged branches, zero
  stale worktrees. **No DEFERRED entries — nothing blocks the next
  `run-supervisor.sh`.** No usage/rate limits hit all session.
- **Session (~17 workers over 3 lanes, every outcome supervisor-verified
  live; zero cap-kills, one launcher-arg mistake self-caught):**
  - **Main (7 steps):** forced-switch §4 slice 10 (player-side
    forced-switch decision request through `submitBattleDecision` — §4 list
    1-10 COMPLETE); MOVE_EFFECT_CONFUSION+FLINCH registered (census
    105→122 moves; both feed the existing canceler reducers, RNG-threading
    bug found+fixed); presentation-seam window 2 (`turn1-rockslide.json`
    256/256 from kernel events, first production `stat-stage-change`
    emission, 27-trace sweep clean); Factory-AI port in two steps
    (CheckBadMove full incl. get_ability redraw semantics, then
    TryToFaint + CheckViability-as-table + masks 0/1/7 dispatch — all 3
    banked scenario ledgers reproduce at 11/11/13 policy draws);
    screens/weather setters + full `DoFieldEndTurnEffects` (F2-F5 +
    F7-F10, census →148 moves); full-turn reducer consuming the REAL
    mask-7 policy + non-terminal forced-switch full-turn variant (entry
    459 — Gate-5's submission-boundary claim now demonstrated for L50
    singles move selection).
  - **Side (6 scouts/steps, all merged):** screens/weather ground truth
    (29/29 verify, corrected end-turn doc's F8/F10 opcode claim);
    turn1-rockslide seam consumer map (16 inputs, staged proof-of-events);
    ISSUES #44 census fix (support set now mechanically derived, +8
    ground-truth checks); AI port-subset audit (masks per band; two doc
    corrections supervisor-re-verified against source); the
    **RNG caller-attribution probe** (closed entry 455's 2-roll gap:
    window totals bundle a trailing opponent proc draw +
    `BattleTurnPassed`'s `gRandomTurnNumber`, both decision-independent —
    `tools/probe/attribute-factory-ai-random-callers.py`);
    Ingrain/Leech Seed/Wrap ground truth (18/18 verify — Ingrain/Wrap
    end-turn bodies already opcode-complete); `TRYCASTFORMDATACHANGE`
    registered per supervisor (a)/(b) decision (census →152 moves; a
    fielded Forecast Castform is the one named barrier; runtime
    weather-form loop next needs `addbyte`/`jumpifbytenotequal` widened
    past `gBattleCommunication`-only).
  - **Animation (7 steps, stacked 7-deep, all merged):** MOVE_GROWTH
    **`exact`** 63/63 both orientations (residual cracked as per-mechanism
    framebuffer display lag, scale+2/tint+1); MOVE_FUTURE_SIGHT `partial`
    85/114 (SetPsychicBackground ported+RAM-probed incl. the rotation-pause
    cadence; defect B killed by register probe; defect A parked with the
    monbg mechanism RAM-confirmed and a GROW-direction instrument named);
    MOVE_CONFUSION `partial` 108/140 (zero net-new components; window 1
    19/20; window 2 carries defect A — cross-move triangulation banked).
    Coverage **21 exact / 5 partial**. PSYCHIC noted as cheap once staged.
- **Next (in order):** main — full-turn player-side forced-switch variant
  (entry 459's named remainder), CheckViability handler bodies phased by
  the audit's 16-reachable-handler table, `addbyte`/`jumpifbytenotequal`
  sBATTLER widening (unblocks the runtime weather-form loop),
  Ingrain/Leech Seed/Wrap registration (ground truth banked, mostly
  opcode-complete already), seam window 3, ENDTURN_ABILITIES/ITEMS
  breadth. Animation — defect A via the OAM double-size-window instrument
  (promotes FUTURE_SIGHT+CONFUSION together), then PSYCHIC. All prep docs
  carry rerunnable verify scripts.
- **Notes:** PAPERCUTS +1 (dense comparators bbox only the first diff
  frame — partially retired same-day by `confusionPortable.ts`'s
  `--per-frame-bbox`). Supervisor decisions this session, both recorded in
  ROADMAP/PROGRESS: AI-port acceptance restated to policy-own draws
  (11/11/13) after the attribution probe; Castform (a)/(b) split
  registered with the honest fielded-Castform barrier. Memory file updated
  with session tactics (launcher-pipeline exit masking; cross-move
  triangulation; sRandCount+LR attribution probe; point-in-time family
  costs; probe-then-decide).

