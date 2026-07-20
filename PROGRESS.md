# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 146 — Bounded worker (session's LAST): S7 slice E1d batch-1 increment — **batch-1 droplets confirmed (zero code changes needed) + extended squish/blend table wired (both cycles) + two new "inter-round lull" islands landed green**; the true wall found and pinned exactly: render 3008, gated by an unmodeled hitsplat sprite, not a droplet/squish bug; `npm test` **678/678** (+4), `npm run build` green

- **State:** `npm test` **678/678**, `npm run build` green, tree clean.
  `turn2-endeavor-drain.json` `captureFrames` grown 114→135 (dense
  3000-3007 unchanged, PLUS two newly-verified-green islands 3024-3033 and
  3050-3060); `ENDEAVOR_SQUISH_TABLE` extended 8→57 rows (`t=3000..3056`,
  both squish/blend cycles). No new probe scripts needed (reused
  `dump-endeavor-squish-blend-ext.py`, re-run since the prior session's own
  dump was scratch/uncommitted).
- **Did:** RAM-probed the full squish+blend window fresh (RAM 2996-3055,
  `gOamMatrices`+`gPlttBufferFaded`/`Unfaded` solved for `coeff` per
  `BlendPalette`'s exact formula — found and fixed a probe bug along the
  way: the blend only touches palette indices 1-15, `numEntries=15`, index
  0 is transparent and was polluting the coeff solve) and wired all 57 rows
  into `ENDEAVOR_SQUISH_TABLE`. Verified batch-1 (upper) droplets need ZERO
  code changes: the existing `RAM=render-1`/`n>=1` convention generalizes
  exactly, confirmed both by a targeted oracle pixel check (render 3018,
  the batch's own first-visible tick — one later than §15c's rough "~3017"
  guess) and by the fact that no diff bbox ever touches the attacker-side
  droplet region across the whole 3008-3049 span. Extended dense captures
  tick-by-tick past 3007 and found the wall immediately at 3008: a discrete
  red-starburst diff confined to `x=41-102` (Onix's own body) — a hitsplat
  sprite's own pop-in, unmodeled, not a squish/blend/droplet defect (the
  attacker side stays 100%-exact through the entire span, proving the
  extended table + droplets are correct). Individually diffing every tick
  (not sampled) also surfaced two real "inter-round lull" islands inside
  what §15's coarser scan called one continuous span — `3024-3033` and
  `3050-3060` both diff exactly zero pixels — landed both as `captureFrames`
  additions per this trace's own established sparse+dense convention; the
  red spans between them (3008-3023, 3034-3049) were left OUT of
  `captureFrames` entirely rather than committed red. 4 new Tier-1 pins,
  all oracle-cross-checked (scratch `bin/oracle run` captures, not this
  engine's own output). Full writeup: `docs/battle-menu-notes.md` §15d.
- **Next:** model `AnimHitSplatBasic` (gfx + affine pop table already
  derived, §15) and `AnimTask_ShakeTargetBasedOnMovePowerOrDmg` (needs
  `gAnimMovePower` for ENDEAVOR RAM-confirmed — still open) to close the
  3008-3023/3034-3049 gaps; once landed, the two islands this session found
  should merge into one contiguous green block through ≥3060.
- **Notes:** no papercuts. Session's last main-lane increment — tree is
  resume-ready (clean, green, no worktrees).

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
