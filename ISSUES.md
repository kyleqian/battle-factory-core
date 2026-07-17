# Issues — standing backlog

Known-open bugs and debts, numbered (numbers are never reused). When you fix
one, **delete the entry** in the same docs commit that records the fix in
`PROGRESS.md` — git keeps the forensic history. Group by area; per entry:
symptom, what's confirmed from the reference/oracle, and any leads.

## #2 — Draft-screen menu: ball-open art (mon-pic-bg + front sprite) not rendered

**Symptom:** `npm run compare -- tools/compare/traces/draft-menu.json` is
NOT 0-diff: 28/38 captured frames differ (10/38 match). Diff is confined to
a single region — a ~64x64px box centered at screen (120,64) (px x range
~88-152, y range ~32-96) — and stays proportionally similar in size
(1124-5020px, 2.9-13.1%) across every frame where the menu is open; frames
before the first `A` press and after `B` fully closes match exactly (except
two tiny 1-2-frame artifacts noted below). This confirms everything BUT
that one region — chrome, header text, species/category text, the cursor
arrow, the SUMMARY/RENT/OTHERS popup text, and the 2-sprite highlight bar —
is pixel-exact; only the ball-open "mon pic" reveal is unimplemented.

**What's confirmed (oracle + reference/pokeemerald/src/battle_factory_screen.c):**
- On `A`, `Select_Task_HandleMenu`'s `STATE_MENU_INIT` calls `OpenMonPic`
  (line 4067), which creates a sprite from `sSpriteTemplate_Select_MonPicBgAnim`
  at (120,64) with an affine "opening" anim
  (`sAffineAnim_Select_MonPicBg_Opening`, line 536) and a `SpriteCB_OpenMonPic`
  callback; when the affine anim ends it spawns `Task_OpenMonPic` (line 4202),
  which over several frames: sets up WIN0 (`tWinLeft/Right = 88/152`,
  `tWinTop/Bottom` growing from 64/65 to 32/96 in steps of 4px/frame) and
  `BLDCNT`/`BLDALPHA` (`TGT1=BG3`, `TGT2=BG1+OBJ`, `EVA=11/16, EVB=4/16`),
  then on completion calls `Select_CreateMonSprite` (line 2014) to show the
  actual front sprite. `CloseMonPic`/`Task_CloseMonPic` (line 4100/4250) run
  the reverse. Oracle-probed timing (idle from an `A` press): fully settled
  by frame 30 (open) / frame ~75 (close, ~20-frame transient) - NOT the
  `~f45` figure in an earlier ROADMAP note, which was a looser estimate.
- `graphics/battle_frontier/factory_screen/mon_pic_bg.png` +`.bin` (BG3
  pattern, already extracted to `src/assets/gen/mon-pic-bg.json` in S1 "for
  completeness") is the background inside the window; the front sprite
  needs a NEW extraction (species front pics are LZ77-compressed
  `graphics/pokemon/<species>/front.png`, plus a per-species Y-offset table)
  not yet done for any of the 6 anchor species (ONIX, MAGBY, BAYLEEF,
  BUTTERFREE, HAUNTER, QUILAVA).
- The blend math must run in 5-bit GBA color space (not 8-bit) then expand
  via the pinned `(c<<3)|(c>>2)` - blending in 8-bit directly will very
  likely round differently than hardware and fail strict pixel compare.
- Two tiny extra diffs during the CLOSE transition only (16px at capture+~12,
  4px at capture+~16, both well inside the mon-pic window, not investigated
  further) - likely a real 1-2-frame close artifact our instant-revert model
  doesn't reproduce; low priority relative to the main gap above.

**Leads for whoever picks this up:** implement the window growth + blend
compositing (BG3 mon-pic-bg vs BG1/OBJ underneath, per the register values
above) as an explicit render mode keyed on frames-since-open/close (the
draft state machine already has `mode: "menu"` to hang a sub-state off of);
extract the 6 front sprites + palettes; re-run `draft-menu.json` (already
committed, dense captures over both transitions and two different slots)
to check progress.

**Also verified, not a bug:** idle draft-cursor screens are pixel-stable
only up to frame ~104 - `Select_Task_FadeSpeciesName` pulses the species
name's text color (a `BlendPalettes` breathe toward black, ~7 game-frames
per step) starting there. Both S2 traces stay well under that frame count
on purpose; a future long-idle or SUMMARY-adjacent trace will need to model
it (state machine + exact timing already reverse-engineered in commit
history - see `Select_Task_FadeSpeciesName`, battle_factory_screen.c:2277).
