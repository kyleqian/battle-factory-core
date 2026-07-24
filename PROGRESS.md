# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 410 — Gate-3 selected-slot PP admission composed

- **State:** the run is clean and green at **154 files / 1887 tests**. S10
  Gate 3 remains at **27** source-safe executable opcodes. The pure
  attack-canceler composition now reaches the selected-slot PP admission and
  its success-only `HITMARKER_ALLOW_NO_PP` clear; opcode 0 remains unregistered
  and no machine, controller, decision-boundary, core, round, or presentation
  integration was added.
- **Did:** added an immutable source-order join from a supplied
  canceler+moves-block result into the existing typed PP preflight. Canceler
  effects 1/2 and Soundproof blocks bypass PP; a continuing result delegates
  the exact five-part no-PP predicate, `BattleScript_NoPPForMove`/missed
  handoff, or continuation clear without duplicating PP mechanics. The joined
  receipt exposes prior receipts, branch ownership, source PC, and zero added
  RNG while preserving cumulative rules/RNG/call state.
- **Next:** keep opcode 0 unregistered. The next exact source boundary is
  obedience after successful PP admission; do not add Magic Coat, Snatch,
  Lightning Rod, Protect, a machine adapter, or controller integration until
  separately assigned.
- **Notes:** both singles orientations; no-PP, Struggle, allow-no-PP,
  no-attack-string, multi-turn, sufficient-PP, canceler effects **1/2**, and
  Soundproof are pinned with exact marker/result/PC receipts. Invalid
  composition/PC inputs, deterministic replay, input immutability, recursive
  freezing, and zero additional RNG are covered. Focused **3 files / 30
  tests**; integrated **154/1887**, production build, OFF v5 info
  (`9c89c741…`), and diff check green. Code commit `5474ea2`; pixel diff N/A.

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
