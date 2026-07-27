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
## 496 — [BOUNDED WORKER 2026-07-27 ~02:10] Yawn Rung 3 landed: ENDTURN_ITEMS2 registered with real moveTurn gating — the item the whole Yawn track was roadmapped to unblock (entries 460-464) is now live

- **State:** tree green at **232 files / 3286 tests** (+4 over entry 495's
  3282), `npm run build` clean. Census re-run **byte-identical** (93/214
  effects, 188/355 moves, 151/276 Factory-L50, 1894/2957 weighted, all 32
  checks pass, `git status --porcelain docs/executable-frontier-census.md`
  empty) — expected and confirmed: like Rung 2, this is an end-turn-tick
  reducer change, not a move-execution dispatch change, so the census (which
  only walks move scripts) has nothing new to count.
  `executableFrontierRatchet.test.ts` unmoved (6/6 green, no new barrier —
  zero new opcodes, per the design doc's own "zero additional opcode work"
  finding, now proven true in practice not just analytically).
- **Did:** landed `docs/yawn-thrash-endturn-design.md` §5/Rung 3 exactly as
  scoped, re-verifying every row of §5's gate table against the raw C
  switch (`battle_util.c:3257-3625`) rather than trusting the table blind —
  confirmed both `ENDTURN_ITEMS1` and `ENDTURN_ITEMS2` call the exact SAME
  `ItemBattleEffects(ITEMEFFECT_NORMAL, battler, moveTurn)` caseID
  (`battle_util.c:1500-1505`), only the boolean differs (the design doc's
  own prose didn't name the caseID explicitly; a first-draft test docstring
  mislabeled it `ITEMEFFECT_MOVE_END` — a different, unrelated caseID used
  elsewhere — caught during this session's own re-verification and fixed).
  `runItemsTick` (`battleEndTurnOrchestration.ts:818`) now takes a
  `moveTurn: boolean` fourth parameter; per §5's table, four rows
  short-circuit to `"advance"` when `moveTurn` is true — `HOLD_EFFECT_
  LEFTOVERS`, the Liechi/Salac/Petaya stat-up berries, and the `RESTORE_HP`/
  `RESTORE_PP`/`UNREACHABLE_AT_FACTORY_L50` case-barriers (source's own case
  does nothing at all at ITEMS2, so a barrier there would be spurious) —
  White Herb and the 8 zero-RNG cure branches stay unconditional (no gate in
  source). The `:992`-area `// ENDTURN_ITEMS2: ... no-op.` comment is
  replaced with the real second call site (`moveTurn=true`), positioned
  right after `ENDTURN_YAWN` per the real `turnEffectsTracker` enum order.
- **Tier-1 (+4, `tests/battleEndTurnOrchestration.test.ts`, new "(g)
  ENDTURN_ITEMS2" describe block):** three no-double-fire regression tests,
  one per gated row class, each constructed so the row's fire condition is
  **false at ITEMS1 but would turn true by ITEMS2** via an intervening burn
  tick (the one modeled mid-tick HP mutator), proving the gate suppresses it
  even then — not just when the condition was already false throughout:
  **"Leftovers heals exactly once per tick"** (100/160 HP, heals to 110 —
  NOT 120, which an ungated second ITEMS2 heal would produce); **"Liechi
  Berry does NOT fire at ITEMS2 even though burn drops HP below its
  threshold mid-tick"** (30 HP > 25-threshold at ITEMS1, burn deals 12 →
  18 HP <=25 by ITEMS2, ATK stage stays 6, item uneaten); **"Sitrus Berry's
  RESTORE_HP case-barrier does NOT fire at ITEMS2"** (55 HP > 50-threshold
  at ITEMS1, burn deals 12 → 43 HP <=50 by ITEMS2, result stays "next-turn"
  not "case-barrier"). Named in-file: `RESTORE_PP`/`UNREACHABLE_AT_
  FACTORY_L50` share the identical `!moveTurn &&` gate shape (verified by
  direct code read) but have no modeled mid-tick PP/possession mutator to
  exercise the same live before/after transition — not silently skipped,
  explicitly called out as structurally unexercisable this rung. Plus the
  brief's own called-for **REAL TRIGGER test**: a Chesto-Berry holder with
  `STATUS3_YAWN_TURN_1` — Yawn's own transition writes the sleep bit, then
  the SAME tick's `ENDTURN_ITEMS2` cures it before the sleep status is ever
  "felt" (final `status1===0`, item consumed, exactly 1 RNG draw — Yawn's
  own sleep-turn roll, the cure itself costs none), reusing Rung 2's staged
  lifecycle as the vehicle per the brief.
- **Live fixture (`tools/battle-lab/mechanic-yawn-endturn-items2-chesto-
  off.json`, extends Rung 2's GULPIN-vs-MAGIKARP fixture with MAGIKARP now
  holding a Chesto Berry, item 134):** confirms the engine's real-trigger
  test against the ROM itself, not just analytically. Trajectory (frames
  from a dense binary search, `/tmp` scratch captures, final curated list
  banked in the fixture): **status1 0 → 5 at frame 1260** (`ENDTURN_YAWN`'s
  sleep transition, "Foe MAGIKARP fell asleep!", matches Rung 2's own
  ledger) → **status1 5 → 0 between frames 1308-1310** (the C-side
  `status1 &= ~STATUS1_SLEEP` write happens as `BattleScript_
  BerryCureSlpEnd2` starts, BEFORE its own message text even changes on
  screen — the message still reads "fell asleep" through 1310) → **item
  134 → 0 between frames 1462-1464** (screenshot: "Foe MAGIKARP's CHESTO
  BERRY woke it from its sleep!", the script's own `removeitem` opcode
  running ~150 frames after the C-side status write, same
  status-clears-before-item-consumes delay pattern independently confirmed
  against the ALREADY-BANKED `mechanic-endturn-items1-cure-par-off.json`
  fixture, frames 613 vs 751). All within the SAME end-turn pass — no
  further player input occurred after MAGIKARP's own turn-2 action, and the
  whole Yawn→sleep→Chesto-cure sequence resolved automatically. This is the
  design doc §5's own worked example, now live-proven both ways (engine
  Tier-1 test + ROM oracle trace agree on final state).
- **Next:** Rung 3 (ITEMS2, this step) closes the critical path 1→2→3 to
  `ENDTURN_ITEMS2`. Rungs 4-6 (Thrash-family: `CONFUSEIFREPEATINGATTACKENDS`
  + `MOVE_EFFECT_THRASH` move-execution, then `ENDTURN_THRASH`, then a
  second `ENDTURN_ITEMS2` fixture via Persim Berry) are independent,
  lower-priority follow-ups per the design doc's own §7 ladder — explicitly
  out of scope for this step, next MAIN-lane program item if session time
  allows. Rung 4's own first action (reading `battleScriptActionAdmission.ts`
  for `gLockedMoves`/forced-repeat-move wiring) is un-started.
- **Notes:** no PAPERCUT. Ratchet/census both unmoved, as expected and
  confirmed (named above). Landed comfortably inside the ~40-minute
  first-half guidance (moveTurn threading + gates + no-double-fire tests),
  leaving the remainder for the live fixture (the harder half, per entry
  495's own precedent of binary-searching transition frames) — both halves
  finished inside the overall cap, so no remainder needs naming beyond
  Rungs 4-6 above.

---
## 495 — [BOUNDED WORKER 2026-07-27 ~01:40] Yawn Rung 2 landed: ENDTURN_YAWN end-turn case (countdown decrement + real sleep transition) — live fixture reproduces the ROM's full 2-turn trajectory including the AND-chain firing

- **State:** tree green at **232 files / 3282 tests** (+6 over entry 494's
  3276), `npm run build` clean. Census re-run byte-identical (93/214
  effects, 188/355 moves, 151/276 Factory-L50, 1894/2957 weighted, all 32
  checks pass, `git status --porcelain docs/executable-frontier-census.md`
  empty) — expected: this rung is an end-turn-tick reducer, not a
  move-execution dispatch change, so the census (which only walks move
  scripts) has nothing new to count; the real delta is qualitative
  (`ENDTURN_YAWN`'s silent no-op comment is now a live-modeled case).
  `executableFrontierRatchet.test.ts` unmoved (6/6 green, no new barrier —
  this rung wires an *existing* reachable case rather than adding an
  unsupported-branch barrier).
- **Did:** landed `docs/yawn-thrash-endturn-design.md` §2 exactly as scoped.
  New `runYawnTick` in `battleEndTurnOrchestration.ts`, replacing the
  `:991`-area no-op comment in `runDoBattlerEndTurnEffects`: (1) decrements
  `STATUS3_YAWN` by one turn unit every pass the mask is nonzero (new
  `BATTLE_SCRIPT_STATUS3_YAWN_TURN_1` constant in
  `battleScriptSourceConstants.ts`, mirroring Rung 1's `_TURN_2`); (2) on
  the pass that empties the counter, runs the exact AND-chain
  (`!status1 && ability != VITAL_SPIRIT/INSOMNIA`, reusing Rung 1's own
  ability ids as a plain equality check, no opcode) before calling the
  ALREADY-LANDED `cancelBattleScriptMultiTurnMoves`
  (`battleScriptMultiTurnCancellation.ts`, confirmed by entry 494's own
  de-risking note — no new helper needed) and drawing the sleep-turn RNG
  (`(Random() & 3) + 2`, attributed to `BattleScript_YawnMakesAsleep`'s own
  entry instruction, same "draw before the script starts" convention
  `runShedSkinTick` established); (3) writes the raw sleep-turn count
  directly into `status1` (guaranteed zero going in, so no OR needed,
  unlike every other family-A status write) and syncs the party mirror;
  (4) runs `BattleScript_YawnMakesAsleep` via the plain `runTickScript`
  primitive (`BattleScriptExecute`+`end2`, no `END3` — confirmed opcode-
  complete by Rung 1's own census). One real wiring detail Rung 1's own
  scoping note didn't call out: `BattleScript_YawnMakesAsleep` reads
  `BS_EFFECT_BATTLER` for all three of its battler-selector opcodes
  (`statusanimation`/`updatestatusicon`/`makevisible`, matching source's own
  `gEffectBattler = gActiveBattler`), but `enterTickBattlerContext` only
  ever sets the `attacker` role (documented as narrowed to it, since every
  prior DoTurnDmg-family script only reads `BS_ATTACKER`) — `runYawnTick`
  sets `selectorRoles.effectBattler` explicitly itself, the first tick
  reducer in this file that needs to. Re-verified against the raw C switch
  body (`battle_util.c:1753-1771`, quoted in full) that Yawn's case has NO
  `hp != 0` guard (unlike Curse/Wrap, which do) — the reducer correctly
  omits one. `UproarWakeUpCheck`'s omission (STATUS2_UPROAR never set by
  any production code) is cited in the reducer's own doc comment, not
  re-verified again this session (already confirmed twice: doc §2 and entry
  494's de-risking note).
- **Tier-1 (+6, `tests/battleEndTurnOrchestration.test.ts`):** new `ENDTURN_
  YAWN` describe block — first-pass decrement only (`TURN(2)->TURN(1)`,
  zero RNG); second-pass transition (`TURN(1)->0`, `status1` sleep-turn
  write matching the raw-byte convention, party mirror sync, exactly 1 RNG
  draw, seed-pinned like the file's existing Shed Skin precedent: seed
  919694434's first draw gives `(randomValue&3)+2 == 3`); each AND-chain
  blocker still decrements to zero but does NOT transition (statused
  target, Vital Spirit, Insomnia — 3 tests); no-yawn-set pure no-op. All
  assert the RNG-draw-count convention (zero on decrement-only, one on
  transition) explicitly.
- **Live fixture (`tools/battle-lab/mechanic-yawn-endturn-transition-off.json`,
  new sibling extending Rung 1's GULPIN-vs-MAGIKARP fixture with a second
  turn's worth of input past the original 900-frame idle window):**
  opponent (MAGIKARP) `status3` observed **0 → 4096/0x1000 (frame 180,
  `setyawn`) → 2048/0x800 (frame 320, turn 1's `ENDTURN_YAWN` decrement,
  matches Rung 1's own preview) → 0 (frame 1260, turn 2's `ENDTURN_YAWN`
  decrement emptying the counter)**; `status1` observed **0 → 5** at the
  SAME frame 1260 (`STATUS1_SLEEP_TURN(5)`, within the real 2-5 turn range,
  raw-byte value with no OR — matches the engine's write exactly). Frame
  1260 screenshot: "Foe MAGIKARP fell asleep!" (`STRINGID_PKMNFELLASLEEP`),
  confirming `BattleScript_YawnMakesAsleep` actually ran. Between frames
  320 and 1200 status3/status1 sit frozen at 2048/0 (confirmed at 900,
  1080, 1100, 1120, 1200 during binary-search narrowing) because turn 2
  needs its own manual FIGHT-menu input in this harness (message
  `waitmessage`s auto-advance on their own timer; the top-level action menu
  does not) — the added second `A`-press pair supplies exactly that, GULPIN
  re-attempting Yawn on an already-yawning target (silently fails,
  `ButItFailed`, no new state) while MAGIKARP's own end-turn tick empties
  the counter and transitions. This is the ROM's real 2-turn countdown
  end-to-end, not just Rung 1's single-decrement preview.
- **Next:** Rung 3 (`ENDTURN_ITEMS2` + `moveTurn` gating) is explicitly the
  next MAIN-lane brief per the design doc's own ladder — out of scope for
  this step and deliberately not started (its `moveTurn`-threading work
  deserves its own fresh cap, per this step's own brief). Rungs 4-6
  (Thrash-family) remain independent, lower-priority follow-ups per the
  design doc's own headline finding (Yawn alone unblocks `ENDTURN_ITEMS2`).
- **Notes:** no PAPERCUT. Ratchet/census both unmoved, as expected for an
  end-turn-tick wiring step (named above). Time split roughly matched the
  brief's guidance: reducer + Tier-1 landed well inside 40 minutes, live
  fixture extension (the trickiest part — finding where the harness froze
  waiting for turn-2 input, then binary-searching the transition frame)
  took the remainder but stayed inside the cap.

---
## 494 — [BOUNDED WORKER 2026-07-27 ~01:15] Yawn Rung 1 landed (SETYAWN + JUMPIFABILITY widening) — plus a real accuracycheck gap the design doc's own census missed

- **State:** tree green at **232 files / 3276 tests** (+9 over entry 493's
  3267), `npm run build` clean. Census: 93/214 effects (+1), 188/355 moves
  (+1), 151/276 Factory-L50 unweighted (+1), 1894/2957 weighted (**+10, not
  the design doc's ~14** — see below), all 32 checks pass.
  `executableFrontierRatchet.test.ts`: **`battleScriptHitChainOpcode.ts`
  barrier pin moved 22→23, named and justified in the ratchet's own comment**
  — a real widening (8 of 11 non-`ACC_CURR_MOVE` `accuracycheck` sites now
  execute instead of halting) that adds exactly one new named barrier
  (`STATUS3_ALWAYS_HITS`/Lock-On, mirroring the existing `ACC_CURR_MOVE`
  branch's identical barrier, provably unreachable today).
- **Did:** landed `docs/yawn-thrash-endturn-design.md` Rung 1 exactly as
  scoped — new `battleScriptSetyawnOpcode.ts` (`Cmd_setyawn`,
  `battle_script_commands.c:9352-9364`, two-branch jump on
  `STATUS3_YAWN|status1` gate, writes `STATUS3_YAWN_TURN(2)`), two new
  `BATTLE_SCRIPT_STATUS3_YAWN`/`_TURN_2` constants, and widened
  `JUMPIFABILITY_VALUES` (`battleScriptIngrainLeechSeedWrapOpcode.ts`) with
  `ABILITY_VITAL_SPIRIT`(72)/`ABILITY_INSOMNIA`(15). No (b) barrier material
  needed for either, confirming the doc's own claim.
- **CONFIRM-OR-CORRECT finding (real, not assumed):** the doc's own §0 opcode
  census marked `accuracycheck BattleScript_ButItFailed,
  NO_ACC_CALC_CHECK_LOCK_ON` — Yawn's own accuracy check — "`[registered]`"
  because `B_SCR_OP_ACCURACYCHECK` has a dispatch entry, but that entry was
  narrowed to ONLY the `ACC_CURR_MOVE` operand form; the `NO_ACC_CALC_CHECK_
  LOCK_ON` literal (a completely different source branch, `battle_script_
  commands.c:1103-1113`, that skips the `Random()` accuracy roll entirely)
  hit `unsupportedBranch` every time — confirmed live via a debug run before
  writing any fix. This would have blocked Rung 1's own pass-through test
  outright, so it was in-scope to fix, not deferred: added
  `accuracycheckNoAccCalcCheckLockOn` (sure-hit Lock-On barrier reusing the
  `ACC_CURR_MOVE` branch's own precedent; semi-invulnerable bare-jump miss;
  `JumpIfMoveAffectedByProtect(0)`'s Protect gate, which reads `gCurrentMove`
  for its flag check despite the literal `0` argument). Net effect: **Yawn's
  own move-use side draws ZERO `Random()` calls** (not 1, as I first assumed
  by analogy to Thunder Wave's `ACC_CURR_MOVE` accuracy roll) — this actually
  matches, not contradicts, the design doc's own §2 remark that end-turn's
  sleep-turn roll is "the only `Random()` in end-turn" for the whole Yawn
  mechanic. 7 of the 8 `NO_ACC_CALC_CHECK_LOCK_ON` sites besides Yawn's own
  remain barriered behind their own separate unregistered opcodes (Roar,
  OHKO, Mimic, Pain Split, Curse, Role Play, Skill Swap) — this fix only
  widens the shared opcode's operand-form dispatch, it doesn't newly unblock
  any of those scripts end-to-end.
- **Second finding, in the census refresh itself:** the doc's §1c "14 unique
  Factory L50 carrier species" for `MOVE_YAWN` was counted against the raw
  882-entry `battle-frontier-mons.json` catalog with no tier filter. The
  census's own weighted metric restricts to `factory-round-policy.json`'s
  `rentalSelection.ranges.level50` (a union of real `GetFactoryMonId` rank
  bands, effectively indices 110-849 of the 882) — 6 of the doc's 14 species
  (WOOPER, TOGEPI, SLUGMA, SLAKOTH, **GULPIN**, SLOWPOKE, all at catalog
  indices <110) fall outside every modeled Level-50 rental-rank band, leaving
  8 species / 10 catalog entries (WARTORTLE, TOGETIC, WALREIN, SLAKING ×3,
  QUAGSIRE, SLOWBRO, SLOWKING, URSARING) — exactly the census's own
  precomputed `frontierMonCount:10, speciesCount:8` for `MOVE_YAWN`, and
  exactly the +10 observed. GULPIN (the brief's own suggested live-fixture
  species) is one of the excluded six — the live fixture below still proves
  the mechanic correctly (mechanicLab's `overrides.parties` explicitly
  permits any species regardless of real rental-draft legality), it just
  isn't itself evidence of a Level-50-legal encounter; QUAGSIRE or
  SLOWBRO/SLOWKING would be if that distinction mattered for a future step.
- **Tests (+9):** `tests/battleScriptSetyawnOpcode.test.ts` (new, 5): sets
  `STATUS3_YAWN_TURN(2)` on ordinary landing (zero RNG) / no-ops (fails) when
  already yawning or status1-nonzero / `ButItFailed` via `jumpifability` for
  both Vital Spirit and Insomnia, ahead of `setyawn` ever running.
  `tests/battleScriptHitChainOpcode.test.ts` (+4, new `NO_ACC_CALC_CHECK_
  LOCK_ON` describe block via `BattleScript_EffectRoar`'s own instance, kept
  opcode-generic rather than Yawn-specific): ordinary advance (zero RNG),
  Protect gate (MISSED+B_MSG_PROTECTED), semi-invulnerable bare-jump miss,
  STATUS3_ALWAYS_HITS barrier. Fixed one now-stale barrier-count test in the
  same file (its `.find()` for "any non-ACC_CURR_MOVE site" now finds a
  newly-supported one first; narrowed to the still-genuinely-unsupported
  subset, corrected its stale "9 sites" count to the real 11).
- **Live fixture (`tools/battle-lab/mechanic-yawn-landing-off.json`, GULPIN
  vs MAGIKARP filler, `bin/oracle lab`):** opponent `status3` observed
  **0 → 4096 (0x1000, `STATUS3_YAWN_TURN(2)`) → 2048 (0x800,
  `STATUS3_YAWN_TURN(1)`)** across frames 160/180/300/320 — the middle value
  is Cmd_setyawn's own write, byte-for-byte my `BATTLE_SCRIPT_STATUS3_YAWN_
  TURN_2` constant; the drop to 2048 by frame 320 is the REAL ROM's own
  `ENDTURN_YAWN` decrement already firing once (Rung 2, not yet built in
  this engine) — free live corroboration of Rung 2's own decrement math
  ahead of landing it. Frame 180 screenshot: "GULPIN used YAWN!"; frame 300:
  status3 still 4096 (pre-decrement). Second fixture
  (`mechanic-yawn-vitalspirit-blocked-off.json`, opponent MANKEY,
  ability 72/Vital Spirit): `status3` stays **0** the whole trace; frame 300
  screenshot: "Foe MANKEY's VITAL SPIRIT made it ineffective!" — confirms the
  `ButItFailed` branch live, satisfying the brief's "if stageable in-cap"
  ask (it was).
- **Next:** Rung 2 (`ENDTURN_YAWN` end-turn case, `runYawnTick` in
  `battleEndTurnOrchestration.ts`) is fully scoped by the design doc and
  partially de-risked by this session's own findings: `cancelBattleScript
  MultiTurnMoves` (the doc assumed this needed building) **already exists**
  (`battleScriptMultiTurnCancellation.ts`, used by `battleScriptAction
  Admission.ts`) — Rung 2 can call it directly, no new helper needed. The
  `UproarWakeUpCheck`-omission citation was re-verified this session
  (`STATUS2_UPROAR`/`MOVE_EFFECT_UPROAR` are never set by any production
  code — confirmed by grep, not assumed) and holds. Not started this session
  (time went to the accuracycheck fix + two live fixtures instead) — next
  worker can start directly from `docs/yawn-thrash-endturn-design.md` §2/
  Rung 2 plus this entry's own de-risking notes.
- **Notes:** no PAPERCUT. Ratchet moved deliberately (named above); census
  pins moved deliberately (named above, both effect/move counts and the
  weighted-delta shortfall explanation). Spent more of the time budget than
  planned on the accuracycheck gap and the tier-filter cross-check, so Rung 2
  is banked as the next step rather than rushed — per the brief's own
  time-split allowance ("Rung 1 alone is a complete, committable step").
