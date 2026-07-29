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

---

## 663 — [BOUNDED MAIN WORKER 2026-07-28 ~21:55] production turn-order inputs live; Swift Swim + Chlorophyll census rows closed

- **State:** tree green at **452 files / 4862 tests**, production build,
  `git diff --check`, and Battle Scene OFF oracle info. Census regenerated
  byte-idempotently: **abilities 57/70 engine-referenced (weighted
  977/1103)**, hold effects unchanged **41/42 (775/850)**; all 15
  validations pass. This matches the assigned prediction exactly.
- **Did:** wired `factoryBattleScriptFullTurnDecision.ts`'s sole production
  `GetWhoStrikesFirst` call with both battlers' numeric ability → shared
  `ABILITY_SYMBOLS` name, existing hold-effect/param resolvers → the shared
  hold-effect name map (extended with Macho Brace id 24), real STATUS1
  paralysis, and `rulesContext.weather`. Rain/sun decoding is suppressed by
  the already-established end-turn `weatherHasEffect` Cloud Nine gate; no
  duplicate ability/item/weather table was added. Six real full-turn tests
  pin Swift Swim, Chlorophyll, opposing Cloud Nine, paralysis, Macho Brace,
  and the existing one-draw-only speed-tie contract. Census identity aliases
  close exactly the two assigned ability rows.
- **Supervisor fold (same round, `ece08e49`):** the paired side-lane probe
  REFUTED the RNG-gap hypothesis — the production engine is genuinely one
  draw short at every clean turn boundary (`BattleTurnPassed`'s
  unconditional `gRandomTurnNumber = Random()`, attributed at positions
  5/19 of a 24-draw two-turn ROM ledger, before each turn's AI draws;
  `turnEndRngGroups` is legacy fixture-only). Full evidence + fix shape:
  `docs/ability-item-speed-scout.md` §B5; mechanical recheck
  `tools/probe/verify-turn-boundary-rng-gap.py` (supervisor re-ran: PASS).
  The probe's OFF fixture also corroborated this entry's wiring on real
  hardware: turn-2 order flips under rain exactly as predicted.
- **Next:** model the boundary draw + persist it as the rules-context
  `gRandomTurnNumber` equivalent, then Quick Claw reads it (closes hold
  effects at 42/42); then the ON_DAMAGE contact family (scout in flight).
- **Notes:** source citations were re-read. ROM `WEATHER_HAS_EFFECT` also
  requires `hp != 0`; this is vacuous at action selection because the
  full-turn reducer resumes only after fainted-actions installs live singles
  actives. The paralysis call-site path has 9 draws by design: 8 ordinary hit
  draws plus its existing attack-admission paralysis roll, and no turn-order
  draw (an erroneous tie would make 10). No generator semantics, canonical
  replay, oracle fixture, Quick Claw, AI, or `unsupported-branch` ratchet
  changed. Scout/probe files untouched. PAPERCUT: none this session.
