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

## 668 — [BOUNDED MAIN WORKER 2026-07-28 ~23:31] corpus-to-kernel party adapter implemented

- **State:** tree green at **453 files / 4891 tests**, production build,
  `git diff --check`, and Battle Scene OFF oracle info. Census regenerated
  twice as a byte-identical no-op at **69/69 abilities (1096/1096)** and
  **42/42 hold effects (850/850)**; all 17 validations and both executable
  ratchets pass unchanged.
- **Did:** added a pure generated-corpus adapter from set id + personality/
  fixed IV/ability slot/OT id to a field-complete Level-50
  `BattleScriptPartyMemberState` structural subtype: source nature check,
  uniform IVs, split EVs, shared stat formulas, moves/base PP, experience,
  item/hold effect, single/dual ability, friendship, gender and shiny. A
  focused Tier-1 test constructs every Level-50 set **0–849** and exactly
  reproduces all six OFF bootstrap RAM-dumped rental literals.
- **Supervisor fold (same round, side merge):** rung 1 landed (`eb441047`,
  Terra worker) — fresh-start A/B receipt banked in scout §4.1: draw A
  `BattleStartClearSetData+0x29b` → 62606, draw B
  `TryDoEventsBeforeFirstTurn+0x26f` → 997 overwriting A before action
  selection; wrapper PASS (supervisor re-ran fresh: PASS). Honest bounded
  remainder: the equal-speed tie case is scaffolded, not claimed (unstable
  targeted stepping over the broad pre-battle VBlank span) — rung 3 must
  either finish it or derive the tie position from source with a narrower
  instrument.
- **Next:** rung 2 (pure fresh battle initializer, main) + rung 7 (initial
  rental generator, side) launch this round; then rung 3 (entry-hook
  orchestrator) and rung 4 (whole battle fresh-start→terminal).
- **Notes:** scout §2.2/§2.3/rung-5 citations proved. Battle-lab has no cheap
  generic derived-party read-back command; using its permitted known-good
  literal fallback (the OFF bootstrap RAM dump). Commits `449f6365`,
  `b75b663f`; the census initially caught and forced removal of a quoted
  ability comparison before final validation. No battle-start/controller,
  side-owned, issue, census-generator, or ratchet file changed. PAPERCUT: none.

---

## 667 — [BOUNDED MAIN WORKER 2026-07-28 ~23:14] Run Away/Pickup close the ability-item parity worklist

- **State:** tree green at **452 files / 4887 tests**, production build,
  `git diff --check`, and Battle Scene OFF oracle info. Hook artifact and
  census each regenerated twice byte-identically. Final census is exactly
  **69/69 Factory-battle abilities (weighted 1096/1096)** plus **4 without
  Factory battle hooks**, and **42/42 hold effects (850/850)**; all 17
  validations pass and the unreferenced worklist is empty.
- **Did:** source order disproved the proposed generic trainer-block proof:
  Factory RUN first opens the forfeit confirmation (`battle_main.c:4322-4339`);
  confirmed RUN reaches Run Away before the generic Frontier-trainer success
  (`battle_util.c:427-448`), then every Factory RUN becomes forfeiture before
  `fleeType` is read (`battle_main.c:5058-5062`). A production invariant and
  Tier-1 test pin that this kernel exposes only use-move/switch commands and
  Run Away cannot bypass the distinct trapping gate. Pickup's only two source
  checks are now exact-classified Factory-unreachable: the Frontier victory
  script calls `pickup` only under `BATTLE_TYPE_PYRAMID`
  (`battle_scripts_1.s:3045-3047`), never Factory.
- **Supervisor fold (same round, side merge):** the paired side-lane scout
  banked `docs/facility-round-loop-scout.md` (`1c87f22e`) — Gate-5/whole-
  battle current-state map (full-turn kernel starts post-init; no production
  caller feeds `resolveRoundBattle`; no rental/opponent generators yet; the
  real Factory fully restores HP/PP/status/items between battles; turn-1
  Quick Claw reads `battle_main.c:3923`'s write, which overwrites `:3140`),
  battle-start ground truth §3, a precise rung-1 probe brief §4, and a
  14-rung ordered plan §5 (each ≤45-min with acceptance commands).
- **Next:** rung 1 (fresh-start RNG receipt, side) + rung 5 (corpus-to-
  kernel party adapter, main) launch this round; then rung 2 (fresh battle
  initializer) consumes the receipt. Do not reopen Pickup/Run Away without
  new source reachability.
- **Notes:** predicted closure was 70/70 weighted 1103/1103 only if Pickup
  remained battle-reachable; actual source-supported reclassification removes
  its 7 carriers: `(1073 + 23)/(1103 - 7) = 1096/1096`, and categories move
  from 3 to 4 without Factory battle hooks. Commit `c50a726f`. No
  `unsupported-branch` or canonical-recording ratchet, issue, scout/probe,
  battle-lab, presentation, AI, or oracle fixture changed. PAPERCUT: none.

---

## 666 — [BOUNDED MAIN WORKER 2026-07-28 ~23:05] voluntary switch action + trapping trio complete

- **State:** tree green at **452 files / 4885 tests**, production build,
  `git diff --check`, and Battle Scene OFF oracle info. Census regenerated
  twice byte-identically at exactly **68/70 abilities (weighted 1073/1103)**
  and **42/42 hold effects (850/850)**; all 16 validations pass.
- **Did:** player command requests now enumerate every alive, non-egg bench
  slot and preserve the wrap/escape-prevention/Ingrain menu gates. Shadow
  Tag, grounded Arena Trap, and Steel-only Magnet Pull remove voluntary
  switch entries; Flying/Levitate, fainted, and absent-holder controls pass.
  Trainer requests remain move-only and forced-switch indexes ignore trapping.
  A voluntary switch runs before moves through the shared source switch
  handlers, rebuilds the incoming battler, fires entry hooks, and makes the
  opponent's move hit that incoming mon; an Intimidate receipt pins hook
  timing. The switch draws zero RNG; the switch-turn ledger pins the next
  boundary at position 15 after five staged AI draws.
- **Supervisor fold (same round, side merge):** the paired side-lane worker
  oracle-corroborated the boundary-draw + Quick Claw model (`ad1953db`,
  §B6 of the speed scout): five ROM turns with per-turn `gRandomTurnNumber`
  RAM reads (25804/44835/15553/45723/10727), exactly one attributed
  `BattleTurnPassed+0x157` draw per transition, the 1/5 proc turn
  (10727 < 13107) flipping order exactly as modeled, zero Quick Claw or
  tie draws, and the ENGINE reproducing four boundary values + raw LCG
  states exactly (`verify-quick-claw-turn-boundary.py` +
  `verify-quick-claw-engine.ts`, supervisor re-ran both: PASS). Continuous
  cross-turn replay is non-alignable by design (submitted-decision windows
  omit the ROM AI's intervening draws — documented, not a defect). Also
  refreshed `verify-on-damage-static.py` to the post-implementation guard.
- **Next:** close Run Away/Pickup honestly (documented no-op or
  reclassification, with source proof) to end the ability census; side
  design scout for Gate-5/whole-battle integration (incl. the turn-1
  `gRandomTurnNumber` writes).
- **Notes:** Pursuit's pre-switch double-power interception is deliberately
  deferred behind one trigger-narrow `unsupported-branch` in
  `factoryBattleScriptFullTurnDecision.ts`; its barrier ratchet moves **0→1**
  with a reachability test. No presentation, trainer-switch AI, Baton Pass,
  issue, probe/scout, oracle fixture, or canonical trace changed. Identity
  constants were used for all three new ability comparisons. PAPERCUT: none.
