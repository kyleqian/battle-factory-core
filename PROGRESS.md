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
## 536 — [BOUNDED WORKER 2026-07-27 ~20:44] EFFECT_FLAIL executes Flail/Reversal end to end; exact +1/+2/+2/+20

- **State:** tree committed and green at **290 files / 3786 tests**;
  `npm run build` clean. Census regenerates to **128/214 effects, 252/355
  moves, 204/276 Factory-L50 distinct, 2586/2957 weighted (87.5%)**, the
  assigned exact **+1 effect / +2 moves / +2 distinct / +20 weighted**, with
  all **42/42** ground-truth checks passing.
- **Did:** `53b4dc2` source-ports/registers
  `B_SCR_OP_REMAININGHPTOPOWER`, materializes generic `gDynamicBasePower`
  through the existing damage calculator and Triple Kick copy, and adds
  Tier-1 coverage for every inclusive HP-band boundary plus Flail/Reversal
  hit, miss, Protect, faint, and zero-HP-attacker terminals at genuine
  `B_SCR_OP_END`. `e101563` regenerates the verified census.
- **Next:** supervisor verify this completed registration and merge the
  file-disjoint OFF-profile evidence, then continue the generated ranked
  frontier at `B_SCR_OP_FRIENDSHIPTODAMAGECALCULATION` /
  `EFFECT_RETURN` + `EFFECT_FRUSTRATION` (**+2/+2/+2/+18** predicted).
- **Notes:** `tests/executableFrontierRatchet.test.ts` is unchanged: no new
  unsupported barrier and no canonical-recording import. Battle Scene OFF
  oracle freshness was checked at baseline only (`9c89c741…f297`); no oracle
  lifecycle action, evidence-file edit, or recording-derived production
  behavior. No PAPERCUT.

---
## 535 — [SUPERVISOR VERIFY 2026-07-27 ~20:34] Curse registration + repeatable OFF-profile evidence merged green

- **State:** union committed and green at **289 files / 3766 tests**;
  `npm run build` clean. Census regenerates byte-clean at **127/214 effects,
  250/355 moves, 202/276 Factory-L50 distinct, 2566/2957 weighted (86.8%)**,
  with all **42/42** ground-truth checks passing. Both oracle profiles are
  fresh; no deferred decision.
- **Did:** independently reviewed the generic `EFFECT_CURSE` implementation
  and its selector/opcode widenings, reproduced both side-lane Battle Scene
  OFF mechanic-lab traces, then merged the file-disjoint evidence. The ROM
  gives Ghost Curse **120→60 HP + target status2 `0x10000000`** and non-Ghost
  Curse neutral stages **ATK/DEF +1, Speed -1**; two worker reruns and the
  supervisor rerun agree on manifest hashes `77a143a8…a553` and
  `8caa6945…fdc`.
- **Next:** register `B_SCR_OP_REMAININGHPTOPOWER` / `EFFECT_FLAIL`
  generically while a side lane stages repeatable OFF-profile Flail/Reversal
  HP-band evidence; verify the union, then continue to RETURN/FRUSTRATION.
- **Notes:** side worktree and merged branch removed after verification. No
  canonical Battle-2 march, no new unsupported barrier, no ratchet change,
  and no PAPERCUT.

---
## 534 — [BOUNDED WORKER 2026-07-27 ~20:28] EFFECT_CURSE registered end to end; +1 effect / +1 move / +18 weighted

- **State:** tree committed and green at **288 files / 3761 tests**;
  `npm run build` clean. Census regenerated to **127/214 effects, 250/355
  moves, 202/276 Factory-L50 distinct, 2566/2957 weighted (86.8%)**.
  The actual delta is the assigned **+1 effect / +1 move / +1 distinct /
  +18 weighted**, with all **42/42** census self-checks passing.
- **Did:** implemented source-complete generic handlers for
  `B_SCR_OP_JUMPIFTYPE2` (both type slots) and `B_SCR_OP_CURSETARGET`
  (already-cursed failure plus half-max-HP damage), then composed the committed
  `BattleScript_EffectCurse` through its existing selectors, stat reducers,
  damage path, and move-end events. Tier-1 walks reach genuine
  `B_SCR_OP_END` terminals for Ghost and non-Ghost users and pin exact
  HP/status2/stat-stage/event/PP/RNG behavior, including stat-limit failure,
  already-cursed, substitute, and random-target fallback boundaries.
- **Next:** supervisor verify/merge this completed step, then resume the ranked
  frontier at `B_SCR_OP_REMAININGHPTOPOWER` / `EFFECT_FLAIL`; RETURN and
  FRUSTRATION follow. End-turn Curse damage remains explicitly out of scope.
- **Notes:** `tests/executableFrontierRatchet.test.ts` is unchanged; no new
  unsupported barriers or canonical-recording imports. Battle Scene OFF oracle
  freshness was checked at baseline only; no oracle lifecycle action or
  recording-derived behavior. No PAPERCUT.
