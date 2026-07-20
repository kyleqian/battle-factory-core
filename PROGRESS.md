# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 145 — Supervisor: **ISSUES #21 CLOSED — not an engine bug** (the §18 hand-derivation omitted `CalculateBaseDamage`'s unconditional `+2`, the same pitfall §10 documents; `damageCalc.ts` reproduces the RAM values bit-exact, supervisor-reproduced independently: 19 pre-STAB / 28 post-STAB); scout merged

- **State:** `npm test` **674/674**, `npm run build` green, tree clean;
  no worktrees, no unmerged branches.
- **Did:** verified and merged worker/wt-20260719-191802: §18
  'ROOT-CAUSED' addendum; probe `dump-battler-full.py` extended with
  statStages[]/side statuses/crit multiplier;
  `battle2-turn1-fullstate-dump.json` (twice-run) ruled out every other
  #21 lead (stages neutral, side statuses zero, both hold SITRUS_BERRY —
  no damage hook, STURDY/BATTLE_ARMOR touch no damage branch,
  BATTLE_TYPE_FACTORY blocks badge boosts). ISSUES #21 deleted per
  policy. Also verified+accepted #144 (droplets batch 0 green,
  turn2-endeavor-drain 113/114, suite 674/674).
- **Next:** final main-lane increment of the session (batch-1 droplets +
  banked extended squish table, §15c's named next step), then wind-down
  (~21:00-21:30).
- **Notes:** none.

---
## 144 — Bounded worker: S7 slice E1d droplets increment — **first ENDEAVOR sweat-droplet batch RAM-probed and landed green** (renders 3006-3007, real hardware sprite reads, not a pixel fit); `npm test` **674/674** (+2), `npm run build` green

- **State:** `npm test` **674/674**, `npm run build` green, tree clean.
  `turn2-endeavor-drain.json` dense window now 2999-3007 (was 2999-3005);
  `tools/probe/dump-endeavor-droplets.py` and `dump-endeavor-squish-blend-
  ext.py` committed.
- **Did:** RAM-probed all 16 droplet sprites (`AnimFacadeSweatDrop`'s own
  static callback address, thumb-bit-adjusted, since it's not exported)
  across both squish cycles — found §15's own banked table had the two
  `CreateSweatDroplets` offset variants (upper/-20 vs lower/+20) mislabeled
  relative to which `tTimer` triggers which, corrected in `battleScene.ts`'s
  own doc comment. Landing the FIRST batch found a second bug: droplets
  aren't visible on their own `CreateSprite` tick — the naive "same render
  lag as the squish matrix" guess put every droplet one physics step ahead
  of the oracle; fixed via a fresher lag (`RAM=render-1`, matching blend's
  own) plus requiring the sprite's `n>=1` (not `n>=0`), reproducing both the
  previously-pinned clean tick (3005) and the newly-contaminated one (3006)
  at once. Also RAM-probed (not pixel-solved) the ENTIRE squish+blend window
  across both cycles (`gPlttBufferFaded` read directly, `coeff` solved via
  `BlendPalette`'s own real formula) and found/fixed an off-by-one in §15b's
  own prose (matrix lag is `render-2`, not `render-3` — the committed table
  values were always right, only the restated formula was wrong). Tried
  extending `ENDEAVOR_SQUISH_TABLE`/droplets through both full cycles but
  `npm run compare` showed real residual diffs starting render 3008 (batch-1
  droplet timing not yet re-verified past batch 0, and/or shake/hitsplat) —
  trimmed to the last green tick (3007) rather than commit red, per this
  run's own discipline. Full writeup: `docs/battle-menu-notes.md` §15c.
- **Next:** batch-1 (upper) droplet timing — verify/correct the same
  render-lag convention past render 3017 (the analogous first-visible tick);
  once both batches/cycles close, the already-RAM-probed extended squish
  table (banked, not wired) should drop in directly. After that: shake/
  hitsplat (still fully unmodeled, `gAnimMovePower` for ENDEAVOR still not
  RAM-confirmed).
- **Notes:** no papercuts.

---
## 143 — Supervisor: battle-2 scout merged (§17 debts closed + §18 battle-2 turn-1 ground truth); **new ISSUES #21** — RAM-observed base damage 19 vs formula 17 on ROCK_SLIDE-vs-KABUTO, a damageCalc generality gap

- **State:** `npm test` **672/672**, `npm run build` green, tree clean at
  merge `031bfc5`; no worktrees, no unmerged branches.
- **Did:** verified and merged worker/wt-20260719-184149 (3 commits):
  rentalMons[] probe fixed (root cause: global.h's field comments are
  SaveBlock2-absolute offsets, the old probe double-added frontier's
  0x64C base) and validated two ways (pre-swap == anchor dump 3/3 slots;
  post-swap slot0 == pre-swap slot3 per CopySwappedMonData); YES-branch
  LCG ledger committed (bonus: frontier RNG freeze begins tick 33286);
  battle2-turn1.json (33672f/168c, twice-run) + §18 ledger — new pinned
  mechanic: KABUTO's BATTLE_ARMOR short-circuits the crit roll's
  Random() call. Damage discrepancy honestly flagged → filed as ISSUES
  #21 (leads: probe defense/statStages at calc tick). Also
  verified+accepted #142 (squish+blend landed via RAM-probed matrices,
  turn2-endeavor-drain 111/112).
- **Next:** (1) main lane: ENDEAVOR droplets increment (spawn boundary
  pixel-pinned at 3006, physics banked in §15); (2) worktree: root-cause
  ISSUES #21; (3) wind down ~21:30-21:45 (deadline 22:16).
- **Notes:** none.
