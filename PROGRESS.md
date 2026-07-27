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
## 509 — [BOUNDED WORKER 2026-07-27 ~12:20] B_SCR_OP_SETPROTECTLIKE registered, EFFECT_PROTECT/EFFECT_ENDURE executable end to end; NEGATIVEDAMAGE/TRYSETREST not started (ran out of step budget)

- **State:** tree green at **249 files / 3409 tests** (+1 file / +14 tests
  over session start 248/3395: new `battleScriptProtectlikeOpcode.test.ts`,
  14 tests; new production `battleScriptProtectlikeOpcode.ts` alongside it;
  plus one assertion added to the existing `cleareffectsonfaint` suite and
  small fixture/count updates in 4 other test files for the new
  `protectUses` field — no new test count from those), `npm run build`
  clean.
  `executableFrontierRatchet.test.ts`: +1 deliberate, named barrier
  (`battleScriptProtectlikeOpcode.ts`, 1 — the `protectUses >= 4` OOB
  `sProtectSuccessRates` read, reachability-tested).
- **Did:** registered `B_SCR_OP_SETPROTECTLIKE` (`Cmd_setprotectlike`,
  `BattleScript_EffectProtect`/`_EffectEndure`'s shared setter — the two
  labels alias one script, one call site source-wide) exactly per entry
  507's scoping, addressing each named point:
  1. **New persistent `protectUses` field** added to `BattleScriptRulesBattlerState`
     (`battleScriptRulesContext.ts`, optional input defaulting to 0, matching
     the `protected`/`endured` precedent) — models `DisableStruct::protectUses`,
     the success-rate streak counter (`sProtectSuccessRates = [65535, 32767,
     16383, 8191]`, `USHRT_MAX/{1,2,4,8}`), with the reset-when-last-move-
     wasn't-protect-like semantics ported as an unconditional pre-roll write
     (not an `else` of the roll), proven by a differential test that forces
     the roll to use tier 0 vs. a stale stored tier and shows the outcome
     flips.
  2. **`cleareffectsonfaint`'s zero-on-faint is now a real write**: added
     `protectUses: 0` to its active-battler reset object
     (`battleScriptHitChainOpcode.ts`), pinned with its own assertion on the
     existing BS_TARGET KO-scenario test (previously a documented no-op since
     the field didn't exist).
  3. **`gProtectLikeUsedStringIds` was NOT already in `PRINTFROMTABLE_TABLES`**
     — verified by grep before assuming, then added
     (`STRINGID_PKMNPROTECTEDITSELF2`/`STRINGID_PKMNBRACEDITSELF`/
     `STRINGID_BUTITFAILED`, indices 0/1/2 matching
     `B_MSG_PROTECTED_ITSELF`/`BRACED_ITSELF`/`PROTECT_FAILED`), and proven
     live by full-script tests that walk `printfromtable`/`waitmessage`
     through completion for all three chooser values, not just dispatched
     in isolation.
  4. **`protectUses >= 4` OOB decision**: real hardware reads whatever ROM
     byte follows the 4-entry const array after 4 consecutive successful
     Protects — not something this engine can source-model deterministically
     — so it's a named (b) barrier, reachability-tested (protectUses=3 still
     resolves normally, only 4 halts).
  5. **Protect's block is the ALREADY-registered `attackcanceler` +
     `accuracycheck` consuming sites** (`isDefenderProtected`, wired in a
     prior session) — nothing new to build here. Proved genuinely composed,
     not faked: ran `Cmd_setprotectlike` for real to produce `protected=1`,
     fed that exact output battler into a fresh `BattleScript_HitFromAtkCanceler`
     walk (real TACKLE from the opponent), and confirmed `attackcanceler`
     sets `MOVE_RESULT_MISSED`/`missType=B_MSG_PROTECTED` then `accuracycheck`
     genuinely jumps to `BattleScript_PrintMoveMissed` with **zero** accuracy
     RNG draws.
  6. **Endure's survival clamp is the ALREADY-registered `adjustnormaldamage`/
     `adjustsetdamage` consuming sites** (`targetBattler.endured === 1` HP
     clamp + `MOVE_RESULT_FOE_ENDURED`, also wired in a prior session).
     Same real-composition proof: ran `Cmd_setprotectlike` for real
     (`endured=1`), fed it into a fresh hit walk (POUND, 100 accuracy, 255
     attack/level 100 vs. 10 HP — an unambiguous lethal hit), and confirmed
     `adjustnormaldamage` clamps `battleMoveDamage` to `hp-1=9` (not the raw
     lethal number) with `MOVE_RESULT_FOE_ENDURED` set.
- **Tests:** `tests/battleScriptProtectlikeOpcode.test.ts` (new, 14 tests):
  isolated dispatch (success ×2 effects, guaranteed-failure-still-spends-RNG
  on the turn's last action, reset-vs-preserve-streak differentials ×3, OOB
  barrier + its own reachability edge), 3 full committed-script integration
  tests (`EFFECT_PROTECT` success, `EFFECT_ENDURE` success, `EFFECT_PROTECT`
  failure — all walked from the script's own entry through
  attackanimation/printfromtable/waitmessage/`moveendall`/`end`, exactly one
  RNG call total each, matching the real ground-truth ledger), and the 2
  cross-script consuming-site proofs above (block / survive).
- **Census re-run (before → after):** 95/214 → **97/214** effects,
  192/355 → **195/355** moves, 154/276 → **157/276** Factory-L50
  unweighted, **2047/2957 → 2108/2957** weighted (+61, exactly
  EFFECT_PROTECT+EFFECT_ENDURE's combined weight). New top blocker per the
  regenerated doc: `B_SCR_OP_NEGATIVEDAMAGE` (EFFECT_ABSORB/DREAM_EATER, 49
  weighted). Doc regenerated and committed with the code.
- **Next:** `B_SCR_OP_NEGATIVEDAMAGE` (EFFECT_ABSORB/DREAM_EATER, 49
  weighted — `gBattleMoveDamage = -(gHpDealt/2)`, the draining-move HP-gain
  half; check whether `Cmd_datahpupdate`'s existing negative-damage/heal
  clamp path already covers the write side or needs its own barrier), then
  `B_SCR_OP_TRYSETREST` (EFFECT_REST, 49 weighted — sets
  `STATUS1_SLEEP_TURN(3)` unconditionally on success, fails only at full
  HP; needs a `REQUEST_STATUS_BATTLE` controller sync same shape as
  existing status-write opcodes). Both entirely unexamined this session;
  this step's own time went to SETPROTECTLIKE's field/message-table/OOB
  work plus proving the two already-registered consuming sites for real
  rather than assuming free — budget similarly for a full end-to-end test
  per set, not just opcode dispatch.
- **Notes:** no PAPERCUT.

---
## 508 — [SUPERVISOR 2026-07-27 ~11:30] rounds 2-3 verified + merged; round 4 dispatched

- **State:** master green at **248 files / 3395 tests**, build clean. Landed
  and supervisor-verified this block: §11 turn4-doubleteam kickoff wiring
  (entry 506; compare 250/250 + sweep rerun by supervisor) ∥ census
  EFFECT_EARTHQUAKE set (entry 507; 95/214 effects, 2047/2957 weighted,
  +147 — largest single win) ∥ side §24.5 DRAW SITE 2 live-verified
  (merged from `worker/side-20260727-101228`, cleaned; CV verify script
  rerun in-worktree by supervisor, ALL PASS; includes a real Gate-A
  polarity correction to the doc's prior recipe text; sites 5/6/7 honestly
  not attempted — calibration cost, PAPERCUTS entry added, 2 hits).
- **Round 4 (dispatched):** main → `B_SCR_OP_SETPROTECTLIKE` per entry
  507's handoff (new `protectUses` field, MULTISTRING_CHOOSER check, OOB
  edge decision), then NEGATIVEDAMAGE/TRYSETREST as cap allows ∥ side →
  ISSUES #47 movesetIndex-1-3 remainder EVIDENCE (per-handler funcResult
  write audit from `battle_ai_scripts.s` + live fixtures isolating a
  weather move at CV index 1-3, carry-survives and carry-destroyed
  classes; no src edits — main consumes it next round).
- **Next:** verify round 4; round 5 = main closes #47 from side's
  evidence ∥ side §24.5 sites 5/6/7 or §12 prep-scout.

---
## 507 — [BOUNDED WORKER 2026-07-27 ~11:20] Kernel census breadth: B_SCR_OP_JUMPIFNEXTTARGETVALID + B_SCR_OP_SELECTFIRSTVALIDTARGET registered, EFFECT_EARTHQUAKE executable end to end; SETPROTECTLIKE/NEGATIVEDAMAGE/TRYSETREST not started

- **State:** tree green at **248 files / 3395 tests** (+1 file / +10 tests
  over session start 247/3385: new `battleScriptTargetIterationOpcode.test.ts`
  (8 tests), +1 EFFECT_EARTHQUAKE integration test, +1 new `Cmd_bicword`
  pass-through test), `npm run build` clean.
  `executableFrontierRatchet.test.ts`: +1 deliberate, named barrier
  (`battleScriptTargetIterationOpcode.ts`, 1 — the doubles-only
  `jumpifnexttargetvalid` next-target scan, reachability-tested).
- **Did:** registered the census's own named top blocker exactly as
  briefed: `Cmd_selectfirstvalidtarget` has no `BATTLE_TYPE_DOUBLE` branch
  in source at all (same skip-attacker/skip-absent loop for singles and
  doubles), so it registers (a) source-complete with zero barriers.
  `Cmd_jumpifnexttargetvalid` DOES branch on `BATTLE_TYPE_DOUBLE`
  (`battle_script_commands.c:6594`); its `else` arm (singles) is an
  unconditional fallthrough (never jumps), and the `if` arm's own
  incrementing next-target scan (continuing a multi-target spread-move
  loop to another battler slot) is a named (b) barrier, unreachable for
  Level-50 singles, reachability-tested with an explicit doubles fixture.
  **Hidden second blocker found and fixed:** the census's static walk
  marks `Cmd_bicword` "registered" (opcode present) without checking which
  *operand values* are modeled — EFFECT_EARTHQUAKE's real singles path
  (target not underground) hits `bicword gHitMarker,
  HITMARKER_IGNORE_UNDERGROUND`, which was still an existing (b) barrier
  (only `BattleScript_DamagingWeatherContinuesEnd`'s own 4-bit clear was
  modeled). Widened `Cmd_bicword` to also accept this exact sibling pair
  (the natural counterpart to `Cmd_orword`'s already-registered set of the
  same bit) — same 1 barrier call site in the file, narrower trigger
  (only `BattleScript_MoveUsedWokeUp`'s `HITMARKER_WAKE_UP_CLEAR` remains),
  so `PINNED_BARRIER_COUNTS` for that module is unchanged. Without this
  fix, Earthquake would have looked executable in the census but halted
  on every real singles run — worth flagging for the remaining ranked-table
  sets below: **a census "0 missing opcodes" is not proof of a live run;
  budget time to actually execute each flipped effect's full script.**
- **Tests:** `tests/battleScriptTargetIterationOpcode.test.ts` (new, 8
  tests: both opcodes' dispatch in isolation, singles + doubles, the
  doubles barrier's reachability, the "no valid target" invariant throw).
  `tests/battleScriptHitChainOpcode.test.ts` gained a full
  `EFFECT_EARTHQUAKE: full committed script` integration test — the real
  committed script from `BattleScript_EffectEarthquake` through to its own
  `end`, proving Earthquake's actual semantics (not just reachability):
  plain-hit damage lands, the exact 3-roll ground-truth ledger
  (accuracycheck, critcalc, adjustnormaldamage — no 4th
  `seteffectwithchance` roll, since Earthquake sets no secondary move
  effect), and `jumpifnexttargetvalid` genuinely falls through in
  singles rather than looping back.
- **Census re-run (before → after):** 94/214 → **95/214** effects,
  191/355 → **192/355** moves, 153/276 → **154/276** Factory-L50
  unweighted, **1900/2957 → 2047/2957** weighted (+147, exactly
  EFFECT_EARTHQUAKE's weight). EFFECT_EXPLOSION and EFFECT_MAGNITUDE both
  lost the two shared target-iteration opcodes from their own remaining
  blocker lists (still blocked on their own separate opcodes:
  TRYEXPLOSION/SETATKHPTOZERO, MAGNITUDEDAMAGECALCULATION respectively).
  Doc regenerated and committed with the code.
- **Next (ranked table, in order, none started):** `B_SCR_OP_SETPROTECTLIKE`
  (EFFECT_PROTECT/EFFECT_ENDURE, 61 weighted) — scoped and NOT a quick
  follow-up: needs a brand-new persistent per-battler `protectUses` field
  (currently explicitly untracked, see `battleScriptHitChainOpcode.ts`'s
  `cleareffectsonfaint` doc comment), which once modeled also turns
  `cleareffectsonfaint`'s existing "zero it on faint" behavior from a
  no-op into a real write needing its own test; `Cmd_setprotectlike` also
  needs `gBattleCommunication[MULTISTRING_CHOOSER]` message-table
  selection (verify that value's already-modeled printfromtable/message
  path actually covers `B_MSG_PROTECTED_ITSELF`/`B_MSG_BRACED_ITSELF`/
  `B_MSG_PROTECT_FAILED` before assuming it's free) and a decision on the
  `protectUses >= 4` OOB table read (structurally possible after 4
  consecutive successful Protects, vanishingly unlikely — likely its own
  named (b) barrier). Then `B_SCR_OP_NEGATIVEDAMAGE` (EFFECT_ABSORB/
  DREAM_EATER, 49) and `B_SCR_OP_TRYSETREST` (EFFECT_REST, 49), both
  entirely unexamined this session. Given this session's Earthquake
  experience, budget real time per set for a live end-to-end Tier-1 test,
  not just the opcode's own dispatch, since the census cannot see
  per-operand barriers on opcodes it already considers "registered."
- **Notes:** no PAPERCUT. Archived entry 504 to `PROGRESS-archive.md` to
  keep this ledger at 3 live entries (507/506/505).


