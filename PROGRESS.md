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
- **Next:** close Run Away/Pickup as documented no-op rows, then model the
  whole-battle turn-1 `gRandomTurnNumber` writes.
- **Notes:** Pursuit's pre-switch double-power interception is deliberately
  deferred behind one trigger-narrow `unsupported-branch` in
  `factoryBattleScriptFullTurnDecision.ts`; its barrier ratchet moves **0→1**
  with a reachability test. No presentation, trainer-switch AI, Baton Pass,
  issue, probe/scout, oracle fixture, or canonical trace changed. Identity
  constants were used for all three new ability comparisons. PAPERCUT: none.

---

## 665 — [BOUNDED MAIN WORKER 2026-07-28 ~22:35] ON_DAMAGE contact-ability family implemented

- **State:** tree green at **452 files / 4877 tests**, production build, and
  `git diff --check`. Census regenerated twice byte-identically: abilities exactly
  **64/70 (weighted 1056/1103)**, hold effects **42/42 (850/850)**,
  `ABILITYEFFECT_ON_DAMAGE` **8/8**; all 15 validations pass.
- **Did:** exposed source contact bit 0 through the shared move-flags resolver;
  confirmed the existing real-HP-only `datahpupdate` trackers already make
  Substitute suppress the family; implemented Color Change, Rough Skin,
  Effect Spore, Poison Point, Static, Flame Body, and Cute Charm in moveend
  state 3 with exact gates, RNG, mutations, and callback transfers. Registered
  `seteffectsecondary`; factored the pre-existing gender calculation into one
  shared source helper. The state-3 barrier retired **7→6** for the module.
- **Supervisor fold (same round, `230d776f`):** the paired side-lane worker
  landed scout §A3's census-generator fix (`eef441e4`) — the blanket
  string-literal exclusion now has a narrow comparison-adjacency recovery
  pass, 20 recovered sites exact-pinned (validations 15→16), and refreshed
  `verify-turn-boundary-rng-gap.py` to assert the FIXED state (PASS). Union
  census regenerated at the compound prediction exactly: **abilities 65/70
  (weighted 1060/1103)** (+COMPOUND_EYES via the generator fix), hold
  effects 42/42 (850/850). Remaining unreferenced rows: trapping trio
  (ARENA_TRAP 6, MAGNET_PULL 4, SHADOW_TAG 3) + RUN_AWAY 23 + PICKUP 7.
- **Next:** voluntary switch turn action + trapping-trio legality gate
  (main, in flight); Quick Claw oracle corroboration + stale
  `verify-on-damage-static.py` guard refresh (side, in flight); then
  Run Away/Pickup documented no-op closures and the whole-battle turn-1
  `gRandomTurnNumber` writes.
- **Notes:** full-script tests run every callback shape through its `return`
  and `BattleScript_MoveEnd`'s own `END`; Pound→Static pins the proc as draw 5
  after accuracy/crit/damage/effect chance, with success and failure both +1.
  Effect Spore pins zero-retry and sleep-duration draws; status routing pins
  affects-user, Shield Dust/Safeguard bypass, and ordinary eligibility. No
  census generator, scout/probe/battle-lab fixture, issue, or oracle asset
  changed. Commits: prerequisite `030441c0`, implementation `193fd961`,
  final integration/census fix follows this entry. PAPERCUT: none.

---

## 664 — [BOUNDED MAIN WORKER 2026-07-28 ~22:16] turn-boundary RNG modeled; Quick Claw closes hold-effect census

- **State:** tree green at **452 files / 4867 tests**, production build,
  `git diff --check`, and Battle Scene OFF oracle info. Census regenerated
  byte-idempotently: abilities unchanged **57/70 (weighted 977/1103)**;
  hold effects now **42/42 (weighted 850/850)**, all 15 validations pass.
- **Did:** added `BattleTurnPassed`'s unconditional continuing-boundary draw
  at the production full-turn seam, after end-turn cleanup and before the
  next request/locked-decision recursion; persisted its u16 as the
  `gRandomTurnNumber` equivalent. Staged windows accept an explicit initial
  value (default `0xffff`); whole-battle turn-1 sites `battle_main.c:3140`
  and `:3923` remain the named follow-up. A typed two-turn ledger pins the
  ROM positions 5/19. Quick Claw now applies `UINT_MAX` effective speed for
  stored values `< floor(0xffff*param/100)` (param 20 threshold 13107),
  below priority and with the ordinary tie roll when both holders proc.
- **Supervisor fold (same round, `f828a714`):** the paired side-lane scout
  banked `docs/on-damage-contact-scout.md` — the ON_DAMAGE family is the
  body of the already-registered `MOVEEND_ON_DAMAGE_ABILITIES` state 3
  (its seven-ability barrier retires); the shared rules resolver currently
  drops `FLAG_MAKES_CONTACT` (prerequisite); Oblivious is Cute Charm's
  eligibility check, not an eighth case; live Static receipt attributed the
  proc roll at position 5 right after the four hit-chain rolls
  (`tools/probe/verify-on-damage-static.py`, supervisor re-ran: PASS).
  Predicted implementation delta: abilities 57→64/70, weighted
  977→1056/1103, dispatcher 1/8→8/8.
- **Next:** implement the ON_DAMAGE family from the scout pack (main);
  census generator §A3 string-literal fix (side); then battle-start
  random-turn writes when whole-battle integration owns turn 1.
- **Notes:** boundary commit `c7944fac`; Quick Claw commit follows this
  entry. Existing direct `runBattleEndTurnOrchestration` zero-RNG pin stays
  correct because ownership is in the full-turn reducer. Multi-turn HP,
  Disable-duration, Wish/Future Sight, Focus Energy, and Rollout assertions
  were re-derived after later rolls shifted to their ROM-faithful positions.
  No `unsupported-branch` or canonical-recording ratchet changed.
  `verify-turn-boundary-rng-gap.py` now intentionally stops at its stale
  “explicit model acquired; revisit verdict” guard. PAPERCUT: none.
