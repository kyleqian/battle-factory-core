# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 152 — Bounded worker: S7 slice E2a-2 increment — DRAGON_BREATH shake + red-fade blend land, oracle-verified (**`turn2-dragonbreath.json` 84/84 green, new contiguous block 3236-3263**); fire-projectile attempt pulled after failing pixel-exactness; `npm test` **693/693** (unchanged), build green

- **State:** `npm test` 693/693, `npm run build` green, tree clean.
  `turn2-dragonbreath.json` `captureFrames` now `3121-3176` (unchanged) +
  `3236-3263` (new, 28 ticks) — **84/84 green**. Regression:
  `turn2-endeavor-drain.json` 200/201 (unchanged, pre-existing ISSUES #19
  residual).
- **Did:** RAM-probed all 5 remaining priorities first (new
  `tools/probe/dump-dragonbreath-anim.py`, ticks 3170-3350 — mandatory
  per the brief). Landed 2: (1) target shake (`dragonBreathShakeX2`) —
  `AnimTask_ShakeMon2`'s own fixed ±2px alternation, RAM-solved exactly,
  render lag **1 tick**; (2) target red-fade blend
  (`dragonBreathBlendCoeff`) — two `AnimTask_BlendBattleAnimPal` instances
  (fade 0→9 then 9→0) via the same `BlendPalette` bit-math ENDEAVOR's own
  blend uses, RAM-solved exactly, render lag **2 ticks** (a THIRD distinct
  lag value in this window, oracle-confirmed independently, not assumed —
  matches the brief's own warning that ENDEAVOR's window had three lag
  conventions too). `drawSpriteSheetAffineStretch` gained an optional `x2`
  param (default 0, other call sites unaffected); new `drawDragonBreathScene`
  wired into `drawTurn2KickoffText`'s fallback branch. **Pulled** the
  8-fire-projectile mechanism after a real attempt: position/spawn-cadence/
  frame-cycle are all RAM-verified EXACT (banked in
  docs/dragon-breath-notes.md's new "Engine slice E2a-2" section, ready to
  wire), but the affine "pop" is a genuine ~178.6° ROTATION (not
  `rotation=0` like every prior affine-scale mechanism in this codebase),
  and a `Math.abs(matrixA)`-as-scale approximation (ignoring the rotation's
  shear, never probed) was close but not pixel-exact (small, smoothly
  growing diffs through the projectiles' own span) — pulled rather than
  ship known-wrong pixels or regress the previously-green 3121-3176 block.
  Hit-flash not attempted (time-boxed out).
- **Next:** fire-projectile mechanism needs `gOamMatrices[].b/c` (this
  session only read `a`/`d`) rendered via the general 2x2 sampler already
  built for the ball-spin mechanism (`drawSpriteSheetAffineRotate`), not
  the diagonal-only `drawSpriteSheetAffineStretch` — all other data
  (position table, spawn ticks, frame formula) already banked. Then
  hit-flash (`SpriteCB_HitAnimHealthoxEffect`, 3263-3283), then Grovyle's
  own HP-bar drain (3298+) + turn-end (3329+) = slice E2b, then faint/
  forced-switch, ISSUES #19 root cause, #20 FONT_NARROW rewire (sibling
  worktree).
- **Notes:** no papercuts. Three distinct RAM/pixel render-lag values
  confirmed independently in one window (shake=1, blend=2, text-family=1
  elsewhere) — don't assume mechanisms in the same window share a lag.

---
## 151 — Bounded worker: S7 slice E2a increment — DRAGON_BREATH kickoff text lands (**`turn2-dragonbreath.json` new, 56/56 green, renders 3121-3176**) + `small_ember.png` extracted; `npm test` **693/693** (unchanged), build green

- **State:** `npm test` 693/693, `npm run build` green, tree clean, 3
  commits this session. New trace `tools/compare/traces/turn2-dragonbreath.json`
  (verbatim 50-segment script from the scout's groundtruth trace, dense
  captureFrames 3121-3176) is 56/56. Regression: `turn2-endeavor-drain.json`
  200/201 (unchanged, pre-existing ISSUES #19 residual).
- **Did:** landed priorities 1-2 of 5 from the brief (docs/dragon-breath-notes.md's
  new "Engine slice E2a" section has the full writeup). (1) `drawTurn2KickoffText`
  (`battleScene.ts`) now switches from ENDEAVOR's held text to "ONIX
  used\nDRAGONBREATH!" at render 3137 (pressTick+192), holds through 3176 -
  all new code in `battleScene.ts` only (not `drawFightSubmenuWindow`, not
  `battleMenu.ts` - both off-limits per this session's file-ownership split
  with a sibling FIGHT-submenu-text worktree). (2) `small_ember.png`
  extracted (`extract-battle-move-anim-assets.ts`, `battle-anim-small-ember.json`),
  independently byte-verified against the raw PNG via PIL (0/5120 pixel
  mismatches; palette matches after the expected GBA round-trip).
- **Next:** priorities 3-5 (8-projectile mechanism, red-fade blend,
  `AnimTask_ShakeMon2`, hit-flash) - explicitly NOT attempted this session;
  the projectile mechanism needs a fresh RAM probe first (this codebase's
  own `AnimTranslateLinear_WithFollowup` precedent, `TRAINER_EXIT_X2`, found
  that primitive does NOT reduce to a clean formula - expect a literal
  RAM-probed table, not a derived one). Full detail + what to probe in
  docs/dragon-breath-notes.md's new section. Then: E2b (HP drain + turn
  end), faint/forced-switch slice, ISSUES #19 root cause, #20 FONT_NARROW
  rewire (sibling worktree, separate from this session).
- **Notes:** no papercuts. Stayed on the assigned step; did not attempt
  priority 3+ rather than risk landing it half-verified against the
  45-minute cap.

---
## 150 — Supervisor: round 1 folded — **ENDEAVOR window fully CLOSED (S7 slice E1 done end to end)** + DRAGON_BREATH window scouted/ground-truthed (slice E2 unblocked); suite **693/693**, build green, scout branch merged clean, no worktrees

- **State (supervisor-verified this minute):** `npm test` **693/693**,
  `npm run build` green, tree clean at merge `6f8b005`, no worktrees or
  stray branches. `turn2-endeavor-drain.json` **200/201** (supervisor-rerun;
  sole residual = tick 2906, ISSUES #19 family, pre-attributed);
  regression spot-checks `turn1-drain.json` 102/102,
  `turn1-rockslide.json` 256/256.
- **Did:** Round 1 = two 45-min workers in parallel. Main lane (#149,
  `f6a53da`): ENDEAVOR tail 3061-3094 landed via RAM-probe-first — two NEW
  mechanisms (player-healthbox post-hit wobble ±1px/20 ticks; Onix
  post-hit invisible-flicker 4-on/4-off ×4), both `render=RAM+1`,
  §15's "same mechanisms' tail" guess disproven by probe before any code.
  Worktree lane (`5cdff4b`, merged): DRAGON_BREATH ground truth —
  corrected window boundary (**3137→3846 pixel-visible**; 3095-3136 is
  ENDEAVOR's own HP-drain tail through ~3116 + handoff), §12 RNG ledger
  re-verified 0 corrections, per-tick task/sprite inventory committed
  (8 fire projectiles @4-tick spawn/20-tick life, target red-fade
  `AnimTask_BlendBattleAnimPal`, `AnimTask_ShakeMon2` ±2px, hit-flash
  sprite), dense every-tick trace 3095-3346 (252 caps, verbatim 50-segment
  prefix — supervisor-verified byte-equal), only `small_ember.png` needs
  extraction. Docs: `docs/dragon-breath-notes.md` (new).
- **Next:** Round 2: main = DRAGON_BREATH engine slice E2a (ember
  extraction + kickoff text + projectile mechanism vs the banked ground
  truth); worktree = ISSUES #20 FONT_NARROW rewire (real glyph pipeline for
  the FIGHT submenu, unblocks S8 battle-2 menus). Then: E2b (blend/shake/
  flash + HP drain + turn end), faint/forced-switch slice, #19 root cause.
- **Notes:** worker costs $8.75 + $4.73, 24.6 + 15.2 min. Zero merge
  conflicts, zero regressions.
