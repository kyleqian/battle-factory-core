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
## 537 — [SUPERVISOR VERIFY 2026-07-27 ~20:50] Flail/Reversal implementation + all-band OFF evidence merged green

- **State:** union committed and green at **291 files / 3792 tests**;
  `npm run build` clean. Census regenerates byte-clean at **128/214 effects,
  252/355 moves, 204/276 Factory-L50 distinct, 2586/2957 weighted (87.5%)**,
  with **42/42** checks. Both oracle profiles are fresh; no deferred decision.
- **Did:** reviewed the source-port and found one newly materialized
  cross-action hazard: `gDynamicBasePower` survived into the second mover.
  Commit `8f55359` ports `HandleAction_ActionFinished`'s generic reset and
  pins Flail→ordinary-Strength isolation. Independently replayed and merged
  the side evidence: legal Super Fang staging traverses all six Flail bands
  and five Reversal bands; supervisor hashes match `a1bb097a…5fd3` and
  `056d7e09…e9f6`.
- **Next:** register `B_SCR_OP_FRIENDSHIPTODAMAGECALCULATION` for
  RETURN/FRUSTRATION (**+2 effects / +2 moves / +2 distinct / +18 weighted**)
  while a side lane maps the executable replacement of the old staged
  Battle-2 OFF turn fixture with real full-turn-kernel semantic events.
- **Notes:** verified side worktree/branch removed. No canonical Battle-2
  march, new unsupported barrier, ratchet change, or PAPERCUT.

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
