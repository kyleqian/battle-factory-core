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
## 548 — [SUPERVISOR WIND-DOWN 2026-07-27 ~22:20] Focus Punch OFF branch evidence merged reproducibly

- **State:** final union green at **300 files / 3862 tests**; `npm run
  build`, oracle freshness, and `git diff --check` pass. The unchanged
  Battle-2 OFF seam remains **16/16 exact**; census remains **132/214
  effects, 256/355 moves, 208/276 Factory-L50 distinct, 2631/2957 weighted**
  with all **42/42** checks.
- **Did:** independently replayed and merged `d880c5c`'s paired legal
  Focus Punch scenarios. Physical damage **135→111** falls through to the
  lost-focus route; Light Screen leaves Breloom **135/135**, so the same
  opcode jumps into the hit chain and damages Starmie **135→66**. Both spend
  Focus Punch PP **20→19** and reproduced byte-identical manifests:
  damaged `380326f3…b19`, undamaged `6df18da0…c53`.
- **Next:** register the source-complete five-byte
  `B_SCR_OP_JUMPIFNODAMAGE` / `Cmd_jumpifnodamage`, carrying the attacker's
  physical/special damage receipts through the generic turn state. Pin both
  receipt fields, both branch polarities, the exact pointer, and genuine
  Focus Punch lost-focus/hit-chain terminal walks.
- **Notes:** `animation-main` advanced after this session's orient fold and
  now has 13 commits absent from `master` (head `a158d9c`); leave its active
  animation-supervisor worktree untouched and fold it at the next main
  orient. Focus evidence's honest boundary is that the lab manifest does not
  expose raw `ProtectStruct` receipt words; source pins their reset/write
  sites. No production recording import, oracle lifecycle action, animation
  edit, DEFERRED item, or PAPERCUT.

---
## 547 — [SUPERVISOR SOURCE REVIEW 2026-07-27 ~22:18] Baton Pass registration tightened before acceptance

- **State:** reviewed tree green at **299 files / 3857 tests**; `npm run
  build` and `git diff --check` pass. Executable-frontier census remains
  **132/214 effects, 256/355 moves, 208/276 Factory-L50 distinct,
  2631/2957 weighted**.
- **Did:** rejected inactive `gBattlersCount` selector sentinels, corrected
  the Baton Pass mask citation, and completed the source-exact singles
  `SwitchInClearSetData` collateral: switching clears an opposing wrap and
  Baton Pass refreshes an opposing sure-hit timer to two turns. The terminal
  proof no longer asserts the deliberately stale active-slot PP/loadout that
  this context cannot rebuild.
- **Next:** merge the independently replayed Focus Punch OFF evidence, then
  register `B_SCR_OP_JUMPIFNODAMAGE` / `EFFECT_FOCUS_PUNCH` from its paired
  damage/no-damage routes.
- **Notes:** deliberately raised `battleScriptSwitchinOpcode.ts`'s barrier
  ratchet **8→10** for doubles-only wrapped-by and sure-hit-owner identities;
  both are source-named and reachability-tested while singles remain exact.
  Focused **60/60**, full **3857/3857**. No recording import, oracle
  lifecycle action, animation edit, or PAPERCUT.

---
## 546 — [BOUNDED MAIN WORKER 2026-07-27 ~22:10] Baton Pass executes through source jumpifcantswitch

- **State:** tree green at **299 files / 3852 tests**; build, freshness, and
  `git diff --check` pass. The unchanged Battle-2 OFF trace remains **16/16
  exact**.
- **Did:** committed `33b24cb`, registering both concrete six-byte
  `B_SCR_OP_JUMPIFCANTSWITCH` starts. Ordinary singles now resolve/mask both
  selectors, own `gActiveBattler`, honor or bypass the three volatile gates,
  and scan either six-slot party for a living non-egg bench. Genuine Baton
  Pass success/no-bench scripts reach their real `END`; success spends PP,
  switches, preserves the source-transferable volatile/stages, emits switch
  provenance, and consumes no RNG.
- **Next:** register the generated top blocker `B_SCR_OP_JUMPIFNODAMAGE` /
  `EFFECT_FOCUS_PUNCH` from pinned source and targeted OFF evidence.
- **Notes:** census is **132/214 effects, 256/355 moves, 208/276 Factory-L50
  distinct, 2631/2957 weighted**, exact **+1/+1/+1/+13**, all **42/42**
  checks. The one intentional new barrier/ratchet pin is
  `battleScriptJumpifcantswitchOpcode.ts`'s in-game-partner/MULTI/
  two-opponents/ordinary-doubles identity scan
  (`battle_script_commands.c:4714-4848`). Focused **87/87**, full
  **3852/3852**. No recording import, oracle lifecycle action, animation edit,
  or PAPERCUT.
