# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 409 — Gate-3 Soundproof moves-block gate integrated

- **State:** the run is clean and green at **152 files / 1876 tests**. S10
  Gate 3 remains at **27** source-safe executable opcodes. The complete pure
  attack-canceler loop now composes through the post-canceler
  `ABILITYEFFECT_MOVES_BLOCK` decision only; opcode 0 remains unregistered and
  no machine, decision-boundary, core, round, or presentation integration was
  added.
- **Did:** extracted all **10** `sSoundMovesTable` selectors in source order
  into generated move data, added typed `gLastUsedAbility` ownership, and
  ported the zero-argument dispatcher semantics: resolve the target ability
  and current move, scan only for Soundproof, conditionally add
  `HITMARKER_NO_PPDEDUCT` for an already multi-turn attacker, and hand off to
  `BattleScript_SoundproofProtected`. A pure join calls the gate only after a
  supplied canceler effect 0 and bypasses it for effects 1/2.
- **Next:** keep opcode 0 unregistered. The next exact source-order composition
  seam is the already-typed selected-slot PP admission after a continuing
  moves-block result; obedience and every later intercept remain separately
  unowned. Do not add the machine adapter or any controller integration until
  the supervisor assigns a bounded remainder.
- **Notes:** both singles orientations; all **10** sound selectors and six
  non-sound controls; Soundproof/non-Soundproof; multi-turn/no-multi-turn;
  canceler effects **0/1/2**; exact target/ability/move/table/status/marker/
  script receipts; invalid roles/context; deterministic replay, input
  immutability, recursive freezing, and zero-call RNG preservation are pinned.
  Focused **5 files / 56 tests**; integrated **152/1876**, production build,
  OFF v5 info (`9c89c741…`), and diff check green. Code commits `e5e8bae` +
  `12960b9`; pixel diff N/A.

---
## 408 — Complete attack-canceler source loop composed

- **State:** the run is clean and green at **149 files / 1859 tests**. S10
  Gate 3 remains at **27** source-safe executable opcodes. The pure
  `AtkCanceler_UnableToUseMove` do/while is complete; opcode 0 remains
  unregistered and no decision-boundary, controller, round, or presentation
  integration was added.
- **Did:** added one typed immutable dispatcher over the existing FLAGS→THAW
  phase helpers. It starts at the state tracker, stops at END or the first
  nonzero effect, returns the advanced resumable rules/RNG state, ordered
  phase decisions, final script handoff, cumulative RNG value/call receipt,
  and the source-common effect-2 status-controller synchronization.
- **Next:** before registering opcode 0, implement one source-complete
  `Cmd_attackcanceler` machine adapter: map the machine RNG value/calls/ledger
  into this loop and its per-phase draws, apply its script handoff and
  effect-2 controller barrier, then type the still-unowned source remainder
  after the helper (move-block ability, PP, obedience, Magic Coat, Snatch,
  Lightning Rod, and protect branches). Only that complete command may join
  the executable handler table; do not route it through
  `BattleDecisionBoundary`, core, or the round controller as part of
  registration.
- **Notes:** both singles sides, full all-clear traversal, asleep/Truant/Bide
  source-order stops, exact FROZEN→PARALYZED→IN_LOVE and FROZEN→CONFUSED RNG
  chains, skipped-later-phase zero consumption, effect-2 sleep/freeze/thaw
  sync, effect-1/effect-2 resumptions through END, invalid state/tracker/PC/RNG
  accounting, determinism, immutability, and recursive deep freezing are
  pinned. Focused **15 files / 106 tests**; integrated **149/1859**, production
  build, OFF v5 info (`9c89c741…`), and diff check green. Code commit
  `392a8af`; pixel diff N/A.

---
## 407 — Gate-3 attack-canceler THAW source phase integrated

- **State:** the run is clean and green at **148 files / 1850 tests**. S10
  Gate 3 remains at **27** source-safe executable opcodes;
  `AtkCanceler_UnableToUseMove` now has immutable FLAGS through THAW/END
  source decisions only. Opcode 0 remains unregistered and no phase loop exists.
- **Did:** ported battle_util.c:2250-2264 plus the common effect-2 controller
  sync at 2270-2275. `EFFECT_THAW_HIT` alone clears `STATUS1_FREEZE`, pushes
  the cursor, selects `BattleScript_MoveUsedUnfroze`, and sets
  `B_MSG_DEFROSTED_BY_MOVE`; every frozen path returns effect 2 and records the
  exact active-battler/status-write/controller-mark ownership semantically.
- **Next:** keep THAW unlooped and opcode 0 unregistered until the supervisor
  selects the next explicit Gate-3 boundary; do not integrate the decision
  boundary or claim live controller/presentation ownership.
- **Notes:** battlers **0/1**, both sides, generated Flame Wheel/Sacred Fire
  thaw effects and Tackle control, non-frozen effect 0, frozen non-thaw effect
  2 with unchanged status/script, other status bits, preset chooser/rules
  state, missing/invalid context, exact zero-call RNG, one advance to
  `CANCELER_END`, immutability/determinism, and deep freezing are pinned.
  Focused **3 files / 33 tests**; integrated Tier-1 **148/1850**, build, OFF
  v5 info (`9c89c741…`), and diff check green. Code commits `faabbf0` +
  `aaf3f64`; pixel diff N/A.
