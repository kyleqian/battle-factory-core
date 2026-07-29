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

## 646 — [BOUNDED MAIN WORKER 2026-07-28 ~17:23] Called locked-move and recharge seams fixed

- **State:** committed `cc6c0b1f`; tree green at **434 files / 4722 tests**,
  production build, OFF oracle info, and `git diff --check`. Census remains
  byte-idempotent at **214/214 effects, 355/355 moves, 276/276 distinct,
  2957/2957 weighted** with all **72** validations passing.
- **Did:** charging and rampage now store executed `gCurrentMove` in the
  attacker lock. The full-turn action consumer accepts a lock independent of
  the caller's physical moveslot, overrides current/chosen from it for both
  multi-turn and recharge actions, and preserves the original slot solely as
  PP owner.
- **Next:** supervisor verify `cc6c0b1f`; audit findings 3 (weather damage
  block) and 4 (Focus Band) remain separate, explicitly out-of-scope steps.
- **Notes:** eight full-turn scenarios pin Assist→Fly, Metronome→Thrash,
  Assist→Bide, Metronome→Hyper Beam, and all four plain paths. Called moves
  resume while only Assist/Metronome's slot spends PP; recharge exposes Hyper
  Beam as chosen/current during admission before source action-finished clears
  current. No barrier-count, handler-pin, census, recording-import,
  presentation, roadmap, or issue change.

---

## 645 — [BOUNDED MAIN WORKER 2026-07-28 ~17:02] Frontier-tail row 8 Metronome closes census

- **State:** committed `529b48ec`; tree green at **431 files / 4712 tests**,
  production build, OFF oracle info, and `git diff --check`. The executable
  census is CLOSED exactly at **214/214 effects, 355/355 moves, 276/276
  distinct, 2957/2957 weighted**: assigned-baseline delta **+1/+1/+1/+2**;
  all **72** validations pass.
- **Did:** registered `B_SCR_OP_METRONOME` with the exact sentinel-bearing
  forbidden table, unbounded one-draw retry loop, source target selection,
  and direct selected-effect tail jump. It writes `gCurrentMove` without
  `gCalledMove`, preserves Metronome as chosen move/PP slot owner, and closes
  the dynamic selectable-universe gate with a live census ratchet.
- **Next:** supervisor verify `529b48ec`; the ordered frontier-tail census plan
  is complete. Do not resume retired canonical Battle 2 or presentation work.
- **Notes:** consumed mandatory `docs/metronome-off-evidence.md`; 25 focused
  tests cover every forbidden move, out-of-range candidates, one/two/N-draw
  streams including both seeds, target/direct-jump state, selected-effect END,
  Metronome-slot PP, and the four history owners. Deliberate handler exact-set
  pin **208→209**. Evidence prose calls candidate 55 Mist, while pinned source
  names 55 Water Gun (Mist is 54); the numeric ROM receipt is pinned exactly.
  No barrier, recording import, presentation, round, tick, roadmap, or issue change.

---

## 644 — [BOUNDED MAIN WORKER 2026-07-28 ~16:53] Frontier-tail row 7 Transform source-complete

- **State:** committed `0577134c`; tree green at **430 files / 4687 tests**,
  production build, OFF oracle info, and `git diff --check`. Census is exactly
  **213/214 effects, 354/355 moves, 275/276 distinct, 2955/2957 weighted**:
  assigned-baseline delta **+1/+1/+0/+0**; all **70** validations pass.
- **Did:** registered `B_SCR_OP_TRANSFORMDATAEXECUTION` as the dossier's
  indivisible step: exact `BattlePokemon [0x00,0x24)` copy, min-five PP,
  Disable/Mimic clears, transformed-personality owner, typed species buffer,
  `[54,2]` reset-selection event, and both `gTransformUsedStringIds` rows.
- **Next:** supervisor verify `0577134c`; continue only at ordered row 8
  Metronome, not presentation/animation or retired canonical Battle 2 work.
- **Notes:** consumed mandatory `docs/transform-off-evidence.md`; receipt-shaped
  tests pin every copied field and unchanged HP/maxHP/level/friendship/item/
  PP bonuses/experience/personality/status, all failure predicates, zero RNG,
  switch/faint lifetime clears, both messages, and move-end. Deliberate handler
  exact-set pin **207→208**. No barrier, recording import, presentation,
  round, tick, roadmap, or issue change.
