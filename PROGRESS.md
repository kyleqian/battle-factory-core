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
## 510 — [SUPERVISOR 2026-07-27 ~12:35] round 4 verified + merged; round 5 dispatched

- **State:** master green at **249 files / 3409 tests**, build clean, census
  **97/214 effects, 195/355 moves, 157/276 Factory-L50, 2108/2957 weighted
  (71.3%)**. Round 4 landed: SETPROTECTLIKE (entry 509; supervisor reran
  suite/build/census on main tree) ∥ side #47-remainder evidence pack
  (merged from `worker/side-20260727-105421`, cleaned; CV verify script
  rerun in-worktree ALL PASS): doc §27 = complete 22-handler funcResult
  write audit + 2 live index-1 fixtures. **Live-confirmed divergence:**
  writes-never predecessor → ROM's TTF carry survives into slot 1's Hail
  (deterministic net +1 pick) where the engine's first-slot-only fallback
  yields a 3-way tie + spurious tie-break draw; writes-always predecessor
  → confirmed clean (audit classification positively validated).
- **Round 5 (dispatched):** main → close ISSUES #47 via per-slot
  funcResult propagation across the CV pass using §27.1's write table
  (value-level, not just carry/no-carry — a writes-always handler's own
  written value can itself re-collide, Channel-1-style), acceptance = the
  2 new fixtures' decision/ledger reproduction + all prior ledgers
  unchanged; 7 writes-conditionally handlers (§27.1: 11, 15-17, 20-22)
  may stay a named live-verification residual ∥ side → §12 prep-scout for
  the next presentation window (§10/§11 contract: read-only recon + one
  unwired staging module + comparator re-pin, self-picked smallest).
- **Next:** verify round 5; round 6 candidates = NEGATIVEDAMAGE/TRYSETREST
  census sets (main) ∥ §24.5 sites 5/6/7 (side); then wind-down.

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

