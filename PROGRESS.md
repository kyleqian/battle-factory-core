# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 191 — Worktree scout (supervisor-folded): turn 8 ground truth BANKED — winline-b takes **BIND, and it MISSES** (8 Random() calls, miss short-circuits crit/spread/effect); ATK stage hits its floor (2→0) yet prints the ordinary "harshly fell" (source-traced: the "won't go lower" variant needs the stat already AT floor before the attempt); `battle1-turn8-dense.json` (10826 frames, 226/226 captures) + `docs/turn8-notes.md`; merged `fc0d23c`, suite 793/793 on the merged tree

- **State:** merged into master, `npm test` 793/793 + build green
  post-merge (docs+trace only). Supervisor re-verified: prefix chain
  (turn7-dense ⊂ turn8-dense ⊂ winline-b-swap, script-exact), 5/5 cited
  boundary shas reproduced fresh, cursor-on-BIND submenu frame (9420, PP
  20/20 TYPE/NORMAL) read as an image. Scout PNG-read every text label
  per the new discipline.
- **Did:** turn 8 on the committed line = Pidgeotto's 3rd FEATHER_DANCE
  (Onix ATK floor 2→0) then Onix's BIND miss (acc 75 — corrects §14's
  prose "85"; roll at RAM 9844 fires under the PREVIOUS text, 2 ticks
  before the box transition). No HP change either side. BIND's trap
  mechanic (EFFECT_TRAP/STATUS2_WRAPPED, maxHP/16 end-of-turn) inventoried
  from source but NOT exercised (missed; RAM wrap-status flat). The
  4-frame shared box-open prefix reconfirmed 3× within this turn; the
  stat-write→"fell"-text gap is 293 ticks (vs 294/293 turns 6/7).
  "Won't go lower" variant's real trigger pinned = a 4th FD (turn-9
  scout's falsifiable test). Minor flag: BIND's description text
  ("2 to 5 turns") vs source-implemented 3-6 wrap duration — noted in
  the doc, not chased.
- **Next:** M-3 (affine-sampler small-angle fix per §12's bisect-at-6887
  instrument, then the Sitrus stages); turn-6/7/8 engine slices against
  the three dossiers (turn 8 = text-only resolution, cheapest of the
  three).
- **Notes:** scout stayed in contract; no papercuts.

---
## 190 — Bounded worker (S7 slice M-2): Onix "idle bob" ROOT-CAUSED and NAMED — it's the Sitrus proc's own opening animation stage (`General_HeldItemEffect`, a genuine GBA affine-OAM rotation), starting at tick 6869 not ~7042; render fix attempted and REVERTED (regresses the protected healthbox trace on a small-angle rounding gap) — NOT landed, no new committed traces

- **State:** `npm test` 793/793 (unchanged), `npm run build` green, tree
  clean. No `src/` changes committed (one attempted engine change was
  tried, found to regress `turn5-healthbox.json`, and reverted per this
  run's own no-red-trace discipline). Regression check clean:
  `turn5-healthbox.json` 55/55, `turn5-switchin.json` 241/241,
  `turn5-sentout.json` 141/141, `turn5-rockslide.json` 256/256, all still
  0 diff/unchanged.
- **Did:** ladder rung (a) ("NAME the bob mechanism") fully closed, source-
  cited AND RAM-verified 100%. §11's "idle bob" isn't idle - it's the
  OPENING stage of the Sitrus Berry proc's own battle animation
  (`General_HeldItemEffect`, `B_ANIM_HELD_ITEM_EFFECT`), launched at RAM
  tick 6869 via `TryHandleLaunchBattleTableAnimation`
  (`battle_gfx_sfx_util.c`) - ~170 ticks before the sparkle/tint every
  prior session assumed was the proc's start. Its first 3 steps
  (`AnimTask_RotateMonToSideAndRestore` x3) are a genuine GBA affine-OAM
  ROTATION of Onix's sprite, not a y-only bounce: `y2 = |gOamMatrices[
  matrixNum].c| >> 3` is a BYPRODUCT of the rotation matrix
  (`SetBattlerSpriteYOffsetFromRotation`, `battle_anim_mons.c`), RAM-
  verified exact at every probed tick (matrix `(a,b,c,d)` cross-read
  directly against `y2`, 100% match). This is exactly why the prior
  session's "apply y2 as a signed pixel offset" attempt failed BOTH
  directions - a rotation shears every row horizontally too; §11's own
  hypotheses (a)/(b)/(c) are superseded, not confirmed. 3 back-to-back
  32-tick rotation cycles (identity at RAM ticks 6872/6904/6936/6968),
  then a genuinely new, still-unitemized `GrantingStarsEffect` stage
  (~6968-~7040) BEFORE the tint/ring/message stage §11 already scoped -
  the "flat window" framing is gone entirely; the whole 6869-7222+ span is
  actively animating. Attempted to wire the fix in (reusing the engine's
  existing, already-proven `drawSpriteSheetAffineRotate` primitive built
  for the thrown ball's own spin - no new renderer needed, just a 32-entry
  RAM-read table) - but it regresses the PROTECTED `turn5-healthbox.json`
  (ticks 6873/6874 go from 0 diff to 600px), a genuine small-angle
  sub-pixel rounding gap in the existing sampler (ruled out a simple
  pb/pc axis swap as the cause). Reverted rather than ship red.
- **Next:** audit `drawSpriteSheetAffineRotate`'s nearest-neighbor
  rounding at SMALL rotation magnitudes specifically (bisect against the
  oracle at a fixed large-in-cycle tick like 6887 first, `a=251,b=49,
  c=-49,d=251`), then reuse the table/call-site banked in
  `faint-switch-notes.md` §12 verbatim - no need to re-derive the
  mechanism. After that: `GrantingStarsEffect` gfx/timing (unitemized),
  then §11's own tint/sparkle/ring/message/HP-climb/settled-menu chain.
- **Notes:** no papercuts. Docs: `faint-switch-notes.md` §12 added (full
  mechanism, RAM proof, the reverted attempt's exact diagnostic data, and
  the corrected 3-stage timeline); small dev-tool addition (`isActive`
  field in `tools/probe/dump-task-and-sprite-callbacks.py`, not `src/`);
  archived #187 to keep the ledger to 3 entries.

---
## 189 — Worktree scout (supervisor-folded): turn 7 ground truth BANKED + two REAL corrections to the turn-6 dossier — `battle1-turn7-dense.json` (9380 frames, 256/256 captures, twice-run identical, verbatim winline extension) + `docs/turn7-notes.md`; **turn 7 brings NO new mechanism** (repeats turn 6's FEATHER_DANCE/ROCK_SLIDE pair); merged `af7a3e3`, suite 793/793 on the merged tree

- **State:** merged into master, `npm test` 793/793 + build green
  post-merge (docs+trace only). Supervisor re-verified: prefix check
  (turn6-dense ⊂ turn7-dense ⊂ winline-b-swap, script-exact), 4/4 cited
  boundary shas reproduced on a fresh oracle run, and the label-bearing
  frames READ as images (8354: submenu with cursor persisted on ROCK
  SLIDE, PP 5/10 — §19's rule exercised at a real turn boundary).
- **Did:** turn 7 ledger RAM-confirmed on the winline (Pidgeotto 113→82,
  −31; PP ROCK_SLIDE 5→4, FD 14→13; ATK stage 4→2; 11 Random() calls,
  same shape as turn 6). Turn-8 divergence state pinned (BIND vs
  ROCK_SLIDE choice). **Corrections (supervisor PNG-verified against the
  regenerated turn-6 captures, then folded into turn6-notes §5):** (1)
  turn 6's "ATK-fall message window 7385-7558" rows were mislabeled — the
  FEATHERDANCE kickoff text holds ~7358-7658 with the feather attack
  animation playing during the hold; the RAM `onixAtkStage` write (7391)
  precedes the "harshly fell!" text by ~294 ticks (separate battle-script
  steps, not one unit); the ATK-fall text is fully drawn at 7684. (2) the
  "byte-identical 26-frame msgbox pair" claim shrank to first-4-frames
  under re-verification. Lesson recorded: sha reproduction validates
  determinism, NOT semantic labels — supervisor label-checks now read
  the PNGs.
- **Next:** slice M-2 (Onix idle-bob root cause + Sitrus window, §11's
  three hypotheses); then turn-6/turn-7 engine slices against the two
  dossiers (turn 7 = pure parameterization of turn 6).
- **Notes:** scout stayed in contract; no papercuts. Turn-6 engine slice
  must budget for the FEATHER_DANCE attack animation (feathers/starburst,
  ~7450-7658) that the original dossier's mislabeled table hid.

---
