# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 149 — Bounded worker: S7 slice E1 tail increment — **ENDEAVOR's animation window CLOSES**: `turn2-endeavor-drain.json` green span now runs contiguously **3000→3094+** (merges into the pre-existing 3095-3120 block); `npm test` **693/693** (+8), `npm run build` green

- **State:** `npm test` **693/693**, `npm run build` green, tree clean.
  `turn2-endeavor-drain.json` `captureFrames` grown 167→201 (every tick
  3061-3094 added, closing the gap between the committed 3000-3060 block
  and the pre-existing dense 3095-3120 block); `tools/probe/dump-endeavor-
  tail.py` committed (new).
- **Did:** RAM-probed the 3061-3094 tail FIRST (mandatory per the brief) by
  extending both §15e-era probes over RAM 3050-3100 - both came back flat
  (shake/hitsplat fields empty, squish matrix neutral, attacker palette
  unchanged), ruling out §15's own "same mechanisms' own tail" guess before
  touching render code. A from-scratch full-sprite-table scan then found
  TWO new, previously-unmodeled mechanisms: (1) the player healthbox's own
  brief post-hit "wobble" - 3 sprites (`gHealthboxSpriteIds[0]` + 2
  lockstep neighbors) alternating `y2=+1/-1` every RAM tick for 20 ticks
  then a hard stop, a different mechanism from `menuIdleBounce`'s own slow
  never-negative sine; (2) Onix's own brief post-hit "flicker" -
  `struct Sprite.invisible` toggling 4-on/4-off for 4 cycles then settling
  visible for good (two other hypotheses - a palette blend, a hardware
  BLDCNT/BLDALPHA flash - were RAM-checked and ruled out first). Both lags
  independently pixel-confirmed at `render=RAM+1` (blend/droplet's family,
  not squish/shake's `render=RAM+2`). Wired into `drawEndeavorSquish`
  (`ENDEAVOR_SQUISH_TABLE` extended with 36 more neutral rows through
  `t=3092` so its primitive-reconstruction path keeps covering the tail);
  `drawMenuHealthboxPlayer` gained an optional `dy` param (default 0, other
  2 call sites unaffected). Landed first-try, zero further mismatches once
  wired. 8 new Tier-1 pins, oracle-cross-checked. True settle tick pinned
  at render 3093 (1-2 ticks earlier than §15's own coarse estimate). Full
  writeup: `docs/battle-menu-notes.md` §15f.
- **Next:** S7's ENDEAVOR slice (§15-§15f) is fully DONE. Remaining S7 work:
  DRAGON_BREATH's own window (~3129+), faint/forced-switch engine slice,
  ISSUES #19 root cause, FONT_NARROW rewire (#20) - all out of this
  session's own scope.
- **Notes:** no papercuts. `tools/compare` full regression check across
  `turn2-endeavor.json` (76/77), `turn1-rockslide.json` (256/256),
  `turn1-cloneanim.json` (230/230), `turn1-drain.json` (102/102) - all
  unchanged, zero regressions.
