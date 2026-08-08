# Animation coverage

## MOVE_LICK staged — both orientations isolated at 73 frames; scenarios + dense probe + change maps banked (2026-08-08 worker, round A)

- **State:** LICK stays **unsupported**. Coverage unchanged at **128/276 exact, 0
  partial, 0 staged, 148 unsupported**. Nothing promoted; no pin moved; no
  boundary widening; no shared-helper edit. This is the staging round;
  promotion to exact (both orientations, a portable at full-window exact) is the
  NEXT round's job.
- **Did:** staged two legal mechanicLab scenarios (LICKITUNG 108 —
  FRONTIER_MON_LICKITUNG_1, set 164, all four active slots LICK 122, item Sitrus
  Berry 142, nature QUIRKY 19, EV spread ATTACK|HP = 255/255, vs legal ONIX 95;
  player-back `mechanic-lick-player-lickitung-opponent-onix.json` and
  opponent-front `mechanic-lick-opponent-lickitung-player-onix.json` — exact
  copies of the SLAM pair with only LICKITUNG's four move slots changed 21→122,
  both verified to run with currentMove 122) and `tools/compare/lickProbe.py` — a
  dense probe copied from `crunchProbe.py` with script-pointer isolation to
  `Move_LICK` (0x082d36a8)..`Move_FOCUS_ENERGY` (0x082d36cf) capturing the
  `gLickSpriteTemplate` sprite (position, animNum/animCmdIndex/animDelayCounter
  at the TRUE 0x2a/0x2b/0x2c offsets, invisible, data words, subpriority, OAM),
  the `AnimTask_ShakeMon2` task and its state, both battlers' sprites, all 512
  palettes, software + hardware OAM and matrices, per-frame raw RGB + sha256.
  Probe run: `python3 tools/run-mgba-probe.py <out.json> -- python3
  tools/compare/lickProbe.py <scenario.json> <out.json> <rgb-dir> 122`. Plus the
  displayed-timing change maps banked under
  `tools/compare/evidence/lick-changemap-player.txt` /
  `lick-changemap-opponent.txt`. New standalone asset extractor
  `tools/extract/extract-lick-sprite.ts` (PAPERCUT-dodge) →
  `src/assets/gen/battle-anim-lick.json` with the Tier-1 byte-for-byte regen pin
  `tests/lickSpriteAsset.test.ts`.
- **Measured (fresh runs, both orientations, deterministic): move-owned window
  73 frames each — player-back 214..286, opponent-front 213..285** (script first
  in-bounds .. first inactive cleanup). **Both first frames are CLEAN** — no
  outgoing-teardown contamination: player frame 214 / opponent frame 213 are
  pixel-identical to their next 4 frames, software OAM byte-identical to frame 1,
  no move sprites, no move tasks (the `loadspritegfx` prefix is 21 frames of
  static screen). Determinism: each orientation re-run from scratch is
  byte-identical (player sha seq first/last `89b2f9c6…`/`b3ca9e95…`, opponent
  `f9c87bc9…`/`f9c87bc9…`); software+hardware OAM byte-identical across runs.
- **RAM timeline (player-back; opponent-front is every frame −1 — the two
  orientations are structurally identical, which the reducer must parameterize):
  ** **LICK** (gLickSpriteTemplate, gOamData_AffineOff_ObjNormal_16x32, 5 frames
  of 8 tiles, 2 ticks each, no loop, subpriority 38) created RAM 21 at
  (176,42) = target center (opponent-front (72,88) = ONIX back center; no
  mirroring needed — both sides at target). Anim cmds: cmd0 21, cmd1 22-23,
  cmd2 24-25, cmd3 26-27, cmd4 28-30, animEnded 31. **The flicker ladder IS the
  move** — from RAM 31 the sprite is forced invisible then toggles on the
  data[0]/data[1]/data[2] counter ladder (battle_anim_ghost.c:468
  `AnimLick_Step`): case 0 flips invisible every 2 ticks (visible at 33, 36, 39,
  42, 45), case 1 every 4 ticks (visible at 50, 55, 60, 65, 70), then
  DestroyAnimSprite RAM 71. **AnimTask_ShakeMon2(ANIM_TARGET, 1, 0, 16, 1)**
  created RAM 21 (task slot 0, spriteId 8 = target), drives the target sprite's
  x2 ∓1, toggling every 2 frames: x2 = −1 at 21, +1 at 23, −1 at 25, …, −1 at
  49, task destroyed RAM 51 and x2 restored to 0 (pre-shake ONIX front rest was
  x2=1, so the ONIX x2 does NOT return to 1 — it stays 0). No palette/BG changes
  at all: no monbg, no fadetobg, no setalpha/blendoff — BLDCNT/BLDALPHA/BLDY all
  0 the whole window (the only palette write is the LICK asset load in the
  static prefix, subpal 23 = 368-375, constant after frame 215). SE_M_LICK
  (song header 0x088fc25c) plays once at RAM 21 (SE1).
- **Displayed-timing mapping (player-back; opponent-front is every frame −1):
  ** the 16x32 LICK sprite first visible 236 (RAM 21 + 1, sprite-driven — the
  change map's 220px event); anim frame changes each display RAM+1 (cmd1→pixels
  237, cmd2→239, cmd3→241, cmd4→243); animEnded + invisible-ramp → the flicker
  blinks display at 246, 248, 249, 251, 252, 254, 255, 257, 258, 260, 261, 265,
  266, 270, 271, 275, 276, 280, 281, 285 (+1 from every invisible toggle RAM
  31-70) and the sprite is gone from pixels at 286 (destroy RAM 71 + 1). **The
  shake x2 is TASK-driven and displays TWO frames late (RAM 21 → pixels 237),
  the same TAKE_DOWN WindUpLunge / SLASH case — the measured change-map events
  are at 237, 239, 241, …, 267 (odd frames), exactly the 16 x2 toggles at RAM
  21, 23, …, 51 shifted +2.** Change map and RAM agree on every frame; the
  ledger defers to the change map.
- **Next:** promote LICK to exact. Build `src/animation/lick.ts` (RAM-truth
  reducer at the ages above: the 5-frame/2-tick 16x32 sprite at target center
  with the 5+5-step invisible flicker ladder and destroy at 71, the ShakeMon2
  x2 ∓1 2-frame toggle with the +2 display latch) + Tier-1
  `tests/animation/lick.test.ts`; `SceneOnLickConfig`/View seam in
  `sceneOnPresentation.ts`; the LICK draw case in `battleScene.ts` (lick art
  from `src/assets/gen/battle-anim-lick.json`, ONIX via existing species art); a
  `lickPortable.ts` at full-window exact (73 frames × 2 axes, both first frames
  kept); the fixtures, the coverage entry and the inventory pin 128->129 exact /
  148->147 unsupported.
- **Notes — stretch items 5-6 landed.** `src/animation/lick.ts` (RAM-truth
  reducer at the RAM ages above: the 5-frame/2-tick 16x32 sprite at target
  center with the 5+5-step invisible flicker ladder and destroy at 71, the
  ShakeMon2 x2 ∓1 2-frame toggle) + `tests/animation/lick.test.ts` (8 pins,
  incl. the shake-vs-shared-port pin asserting the closed form equals
  `shakeMon2OffsetAtTick(1, 0, 16, 1, age - 20).x2` for every age 21..51 and
  documenting the +1 creation write at age 20 as the same-frame transient,
  exactly the SLASH convention) are committed. `SceneOnLickConfig`/View seam
  in `sceneOnPresentation.ts` follows `SceneOnSlashConfig`/`sceneOnSlashView`
  exactly. Remaining for promotion: the draw case in `battleScene.ts` (must
  split the display latch — one-age lick sprite/flicker, two-age task-driven
  shake), a `lickPortable.ts`, the fixtures, the coverage entry and the
  inventory pin 128->129 exact / 148->147 unsupported. No boundary widening,
  no new unsupported-branch barrier, no shared-helper edit.
- **Notes — two new components, both staged.** `asset:ANIM_TAG_LICK` is a brand
  new asset extracted standalone (`tools/extract/extract-lick-sprite.ts`,
  deliberately NOT folded into the bulk `extract-battle-anim-assets.ts` which has
  the known silent-drop bug, PAPERCUTS.md) into
  `src/assets/gen/battle-anim-lick.json` with a Tier-1 regen pin
  (`tests/lickSpriteAsset.test.ts`): lick.png is 16x160, 4bpp, colortype 3 — 5
  stacked 16x32 frames of 8 tiles (0x0500 bytes = 40 tiles), own embedded
  palette. `sprite:gLickSpriteTemplate` is new: OAM is
  `gOamData_AffineOff_ObjNormal_16x32` (16x32 NOT 32x32, NOT ObjBlend, NOT
  affine — confirmed against the struct literal in src/data/battle_anim.h:142).
  `task:AnimTask_ShakeMon2` is already exact (DRAGON_BREATH/SLASH etc.) — reuse
  the existing implementation, do not re-port it. No boundary widening, no new
  unsupported-branch barrier, no shared-helper edit; the only engine contact
  will be the promotion round's draw case.


## MOVE_SLASH promoted to exact — 128/276, both orientations at 46/46 portable-exact (2026-08-08 worker, round B)

- **State:** coverage advanced **127→128/276 exact**, 0 partial, 0 staged, **149→148
  unsupported**. SLASH was staged last round and is now proven by an exact move
  in both orientations through the shared seam. `slashPortable.ts` exits 0 at
  **SLASH component 46/46; framebuffer 46/46** (player-back, frames 73-118) and
  **component 46/46; framebuffer 46/46** (opponent-front, frames 77-122), fresh
  evidence hashes player `b1e38fbc…`/RGB `df7ff7a8…`, opponent `b23785fb…`/RGB
  `a08c6c22…`, reproduced twice fresh. The inventory pin moved **127→128 exact /
  149→148 unsupported**.
- **Did:** built `SceneOnSlashConfig`/`sceneOnSlashView` in
  `sceneOnPresentation.ts` (following the CRUNCH seam exactly) and the MOVE_SLASH
  draw case in `battleScene.ts` — CHARMELEON back/front and ONIX front/back, the
  two 32x32 slash slices from `src/assets/gen/battle-anim-slash-slice.json` (its
  OWN embedded palette, ObjNormal not ObjBlend, `gOamData_AffineOff_ObjNormal_32x32`)
  drawn at `slice.x - 16 / slice.y - 16` (center-anchored OAM), the ONIX
  front-idle x2=1 hold through display age 10, and the split display latch
  (below). Wrote `tools/compare/slashPortable.ts` (modelled on crunchPortable.ts,
  probe move 163) + the two fixtures, the evidence test
  (`tests/animation/slashEvidence.test.ts`), the coverage entry, the extra
  Tier-1 shake-vs-shared-port pin in `tests/animation/slash.test.ts`, and moved
  the inventory pin 127→128 exact / 149→148 unsupported.
- **Measured (fresh, deterministic, twice-fresh hashes pinned):** the two slice
  sprites display one frame after their RAM state (slice1 created RAM age 4 →
  pixels 78, slice2 age 10 → pixels 84, cmd transitions all at +1, slice1 gone
  from pixels at 112, slice2 at 118, teardown blinks 96/98/…/116), while the
  task-driven ShakeMon2 target x2 displays TWO frames after its RAM write (RAM
  83 → pixels 85; change-map events 85, 87, 89, …, 117 vs RAM 83, 85, …, 115).
  **The creation write at RAM age 9 (+4) is a same-frame transient the reducer
  leaves at 0, but it DOES reach exactly one displayed frame (pixel 84)** — so
  the draw drives the shake from the shared `shakeMon2OffsetAtTick(4, 0, 18, 1,
  age - 11)` sequence directly, not from the reducer's RAM truth. The target
  rests at the ONIX front-idle x2=1 through display age 10 and stays 0 after
  (the RAM restore to 0 at age 44 displays at 46, outside the window — the ONIX
  x2 never returns to 1).
- **Notes — the painter order was the round's one trap, and it was NOT the
  "slice behind the target" one.** Lower subpriority wins in both orientations
  (slices 38/28 sit IN FRONT of the ONIX front/back 40/30 — measured by the
  slice's frame-0 sliver overwriting opaque ONIX pixels), so the slices paint
  after the target. The genuine flip is WITHIN the equal-subpriority pair:
  slice 1 (slot 3) paints ON TOP of slice 2 (slot 4) — the earlier OAM entry
  wins for equal priority AND equal Y (measured: the oracle's frame-3 slice-1
  pixels at 181,34 win over slice-2's frame-2 value there), opposite to the
  CRUNCH teeth/hitsplat rule where the later slot wins. Painter is
  target → slice2 → slice1 → attacker.
- **Notes — deliverable #4 landed as specified, with a correction to the brief's
  parenthetical.** The extra Tier-1 pin asserts `slash.ts`'s target-shake values
  equal `shakeMon2OffsetAtTick(4, 0, 18, 1, age - 9).x2` for every age 10..45
  (they agree on every RAM age the hardware reaches a frame) and documents that
  the shared sequence's index 0 (+4) is the same-frame creation transient —
  but that transient IS displayed (pixel 84), so the draw case special-cases it
  rather than the reducer. `shakeMon2.ts` untouched, `slash.ts` still duplicates
  the closed form; the pin keeps the two in sync.
- **Next:** the settled queue (MOVE_DRAGON_BREATH / MOVE_BIND) and the ranked
  remaining moves; SLASH adds no new unproven components (the slash slice = CUT's
  cutting-slice shape with its own palette + ObjNormal, ShakeMon2 already exact
  via DRAGON_BREATH, the slicing-seam painter = AERIAL_ACE/CUT).
- **Notes — no boundary widening, no new unsupported-branch barrier, no
  shared-helper edit.** The only engine contacts are the SLASH draw case in
  `battleScene.ts` (plus the `slashSliceFrameTileset` helper) and the
  `sceneOnSlashView` seam in `sceneOnPresentation.ts`. The coverage entry is
  flipped LAST, after both portables exited 0 at full-window exact.


## MOVE_SLASH staged — both orientations isolated at 46 frames; scenarios + dense probe + change maps banked (2026-08-08 worker, round A)

- **State:** SLASH stays **unsupported**. Coverage unchanged at **127/276 exact, 0
  partial, 0 staged, 149 unsupported**. Nothing promoted; no pin moved; no
  boundary widening; no shared-helper edit. This is the staging round;
  promotion to exact (both orientations, a portable at full-window exact) is the
  NEXT round's job.
- **Did:** staged two legal mechanicLab scenarios (CHARMELEON `SPECIES_CHARMELEON`
  5 — FRONTIER_MON_CHARMELEON_1, set 175, all four active slots SLASH 163, item
  Scope Lens 198, nature NAUGHTY, EV spread ATTACK|HP = 255/255, vs legal ONIX 95
  with the CRUNCH file's ONIX blocks unchanged; player-back
  `mechanic-slash-player-charmeleon-opponent-onix.json` and opponent-front
  `mechanic-slash-opponent-charmeleon-player-onix.json`, both verified to run with
  currentMove 163) and `tools/compare/slashProbe.py` — a dense probe copied from
  `crunchProbe.py` with script-pointer isolation to `Move_SLASH`
  (0x082cd3db)..`Move_STRUGGLE` (0x082cd415), capturing both
  `gSlashSliceSpriteTemplate` slice sprites (position, animNum, animCmdIndex,
  animDelayCounter, invisible, data words, subpriority, OAM), the
  `AnimTask_ShakeMon2`/`AnimTask_ShakeMon2_Step` target-shake task, both battlers'
  sprites, all 512 palettes, software + hardware OAM and matrices, per-frame raw
  RGB + sha256. NOTE: keeps the TRUE sprite offsets `0x2a`/`0x2b`/`0x2c` for
  animNum/animCmdIndex/animDelayCounter (never `0x18`/`0x19`). Probe run:
  `python3 tools/run-mgba-probe.py <out.json> -- python3 tools/compare/slashProbe.py
  <scenario.json> <out.json> <rgb-dir> 163`. Plus the displayed-timing change
  maps banked under `tools/compare/evidence/slash-changemap-player.txt` /
  `slash-changemap-opponent.txt`.
- **Measured (fresh runs, both orientations, deterministic): move-owned window 46
  frames each — player-back 73..118, opponent-front 77..122** (script first
  in-bounds .. first inactive cleanup). **Both first frames are CLEAN** — no
  outgoing-teardown contamination: player frame 73 / opponent frame 77 are
  pixel-identical to their next 4 frames, software OAM byte-identical to frame 2,
  no move sprites, no move tasks (the `loadspritegfx` prefix is 4-5 frames of
  static screen; the hw OAM shows the same one-frame-stale vblank quirk as CRUNCH
  at the very first frame but renders zero pixels). Determinism: player re-run
  byte-identical sha256 sequence (first/last `2f99ba4d`/`930d04ef`), opponent
  (`afcf16a2`/`f8213ef2`); software+hardware OAM byte-identical across runs.
- **RAM timeline (player-back; opponent-front is every frame +4 — the two
  orientations are structurally identical, which the reducer must parameterize):
  ** slice1 (gSlashSlice OAM ObjNormal 32x32, subpriority 38, animNum 0 =
  gSlashSliceAnimCmds1: 4 frames of 16 tiles, 4 ticks each, no loop) created RAM
  77 at (168,42) = target X_2 center (176) - 8; slice2 created RAM 83 at
  (184,42) = center + 8. (Y_PIC_OFFSET 42, so no mirroring needed — the ±8 is
  script args, both sides at target.) Slices' anim cmd transitions: slice1
  cmd0 77-79, cmd1 80-83, cmd2 84-87, cmd3 88-91, END 92; slice2 cmd0 83-85,
  cmd1 86-89, cmd2 90-93, cmd3 94-97, END 98. Anim end → RunStoredCallbackWhenAnimEnds
  → AnimFalseSwipeSlice_Step3 (battle_anim_effects_1.c:4756): data[0] counts
  every frame, invisible toggles every 2 frames, data[1] counts to 8 then
  DestroyAnimSprite. slice1 destroyed RAM 111 (last visible 110), slice2
  destroyed RAM 117 (last visible 116). SE_M_RAZOR_WIND (song header 0x088fe984)
  plays at slice1 and slice2 creation (SE1 tracks pan 14/-15 — pan X tracked, not
  the sound player's constant pan). **AnimTask_ShakeMon2(ANIM_TARGET, 4, 0, 18,
  1)**: created RAM 83 (task slot 0, spriteId 8 = target), drives target sprite
  x2 ∓4, toggling every 2 frames (data[3] interval 1): x2 = 1 (rest) → -4 at 83,
  4 at 85, -4 at 87, ..., -4 at 115, task destroyed RAM 117 and x2 restored to 0
  (117-118; pre-shake rest was x2=1, so the ONIX x2 does NOT return to 1 — it
  stays 0). No palette/BG changes at all: no monbg, no fadetobg, no setalpha, no
  blendoff — BLDCNT/BLDALPHA/BLDY untouched the whole window.
- **Displayed-timing mapping (player-back; opponent-front identical +4 on every
  frame): ** slice1 first visible 78, slice2 first visible 84 (both sprite-driven
  = RAM+1); slice anim frame changes each display RAM+1 (slice1 cmd0→cmd1 at 78-79
  boundary → pixels 81; slice2's cmd frames at 84/88/92 etc. all +1). **The shake
  x2 is TASK-driven and displays TWO frames late (RAM 83 → pixels 85), the
  TAKE_DOWN WindUpLunge case — the measured change-map events are at 85, 87, 89,
  ..., 117, one frame later than the sprite-driven +1 rule would place them.
  Slice teardown blinks (Step3 invisible toggles) display at 96, 98, 100, ...,
  116 (+1 from their RAM 95, 97, ... toggles); slice1 gone from pixels at 112
  (RAM 111 +1), slice2 gone at 118 (RAM 117 +1); shake's final x2→0 restore at
  RAM 117 displays at 119 (outside the 118 window, net-zero on screen). Change
  map and RAM agree on every frame; the ledger defers to the change map.
- **Next:** promote SLASH to exact. Build `src/animation/slash.ts` (RAM-truth
  reducer at the ages above: two slice sprites at target X_2∓8 with the 4-frame/
  4-tick cmds1 anim + the Step3 blink teardown, the ShakeMon2 x2 ∓4 2-frame
  toggle on the target sprite with the +2 display latch, no palette work) +
  Tier-1 `tests/animation/slash.test.ts`; `SceneOnSlashConfig`/View seam in
  `sceneOnPresentation.ts`; the SLASH draw case in `battleScene.ts` (slash art
  from `src/assets/gen/battle-anim-slash-slice.json`, ONIX via existing species
  art); a `slashPortable.ts` at full-window exact (46 frames × 2 axes, both
  first frames kept); the fixtures, the coverage entry and the inventory pin
  127->128 exact / 149->148 unsupported.
- **Notes — two new components, both staged.** `asset:ANIM_TAG_SLASH` is a brand
  new asset extracted standalone (`tools/extract/extract-slash-slice.ts`,
  deliberately NOT folded into the bulk `extract-battle-anim-assets.ts` which has
  the known silent-drop bug, PAPERCUTS.md) into
  `src/assets/gen/battle-anim-slash-slice.json` with a Tier-1 regen pin
  (`tests/slashSliceAsset.test.ts`). `sprite:gSlashSliceSpriteTemplate` is new
  but structurally identical to the already-exact `gCuttingSliceSpriteTemplate`
  (same 32x128 4-frame sheet, same 16-tile frames) EXCEPT: slash.png carries its
  OWN embedded palette (gBattleAnimSpritePal_Slash, unlike CUT which shares
  Impact's), and the OAM is ObjNormal not ObjBlend — the two differences the
  reducer must not conflate. `task:AnimTask_ShakeMon2` is already exact
  (DRAGON_BREATH etc.) — reuse the existing implementation, do not re-port it.
  No boundary widening, no new unsupported-branch barrier, no shared-helper
  edit; the only engine contact will be the promotion round's draw case.
- **Notes — stretch item 5 landed early.** `src/animation/slash.ts` (RAM-truth
  reducer at the RAM ages above) + `tests/animation/slash.test.ts` (8 pins) are
  committed this round, exhaustively verified against the probe: all 46 slice
  states (presence, position, tileOffset, invisible) byte-identical across the
  full window, and `targetX2` matches for the shake ages 10-43. The pre-shake
  x2=1 (ages 0-9) is the ONIX front-idle hold — a species-idle property the draw
  case supplies (TAKE_DOWN convention), NOT the move's state, so the reducer
  leaves it 0. **The shake x2 displays TWO frames late** (RAM age 10 → pixels
  window+12, every 2-frame toggle at +2; confirmed by change-map events 85, 87,
  ..., 117 vs RAM 83, 85, ..., 115) — the TAKE_DOWN WindUpLunge case, so the
  promotion draw case must split the display latch (one-age slices, two-age
  shake). Remaining for promotion: the `SceneOnSlashConfig`/View seam, the draw
  case, the portable, fixtures, coverage entry + inventory pin.

## Supervisor wind-down — IRON_TAIL, CRUSH_CLAW, TAKE_DOWN and CRUNCH all exact, 123→127; the change-map tool is the session's real output (2026-08-07 night animation session)

- **State:** coverage advanced **123→127/276 exact**, 0 partial, 0 staged, 149
  unsupported. `animation-main` is committed and green with no worker worktrees
  or branches left behind. 7 worker launches, 6 productive, 1 cap-kill (salvaged
  in full). `ANIMATION_DEFERRED.md` remains empty.
- **Did:** promoted **MOVE_IRON_TAIL** (135/135 both orientations),
  **MOVE_CRUSH_CLAW** (69/69 both), **MOVE_TAKE_DOWN** (98/98 player-back, 97/97
  opponent-front) and **MOVE_CRUNCH** (142/142 both). Added
  **`tools/compare/frame-changemap.py`**. Corrected two probes' sprite offsets
  and one shared-helper off-by-one (below).
- **Verified:** every promotion re-run by the supervisor rather than accepted on
  report — both portables per move, fresh, reproducing each fixture's pinned
  evidence and raw-RGB hashes, with an earlier move's portable as a control each
  time. Both CRUSH_CLAW and CRUNCH change maps re-derived from the probe output
  by the supervisor and diffed byte-for-byte against the committed files; CRUNCH's
  two independent fresh probe runs are identical. Final integrated `npm test`
  **776 files / 7342 passed / 1 established skip** and `npm run build` exit 0 on
  the merged tree.
- **Next:** the remaining zero-new-component moves by script size — COUNTER 31,
  DOUBLE_EDGE 32 (already staged), CRABHAMMER 36, MEGA_KICK 42, MAGICAL_LEAF 43,
  THUNDER 57. **Use the two-round cadence this session settled into:** round A
  stages (scenarios → dense probe → `frame-changemap.py` on both orientations →
  RAM-truth reducer + Tier-1 pins → seam), round B promotes (draw case →
  portable + fixtures → iterate to full-window exact → coverage entry + inventory
  pin + evidence test + ledger). Round B ran in 14-45 minutes every time the
  change map existed.
- **Notes — the change map is the unit of work that made this session fast.**
  `python3 tools/compare/frame-changemap.py <rgb-dir>` diffs every captured
  framebuffer against its predecessor and prints only the frames that changed,
  with pixel count and bbox, collapsing the rest into `static` runs. **That table,
  not the RAM trace, is the reducer's specification.** Measured effect: the first
  IRON_TAIL round spent a full 45-minute cap and wrote zero files trying to
  reconcile RAM frame numbers with pixels; once the map existed, the same move
  closed in 55 minutes, CRUSH_CLAW's promotion round took **14 minutes**, and
  every round since has hit its floor. Bank one per orientation under
  `tools/compare/evidence/` as part of staging — it is cheap, mechanical, and it
  is what a promotion round consumes.
- **Notes — the display-lag rule, now measured on five moves.** Every visible
  event displays exactly **one frame** after the RAM state that causes it — move
  sprites, palette writes and sprite-driven `x2` alike — with one measured
  exception: TAKE_DOWN's **task-driven** WindUpLunge `x2` displays **two** frames
  late (RAM 221 → pixels 223, confirmed independently by the change map and by
  hardware OAM x 40→38). A shared one-display latch therefore drifts by one on a
  task-driven axis; TAKE_DOWN's draw case splits the latch. Separately, some RAM
  transitions never reach pixels at all and must be modelled as RAM truth only:
  IRON_TAIL's third metallic-shine sweep (`ClearBattleAnimBg` already ran),
  CRUSH_CLAW's `setalpha`/`blendoff`, TAKE_DOWN's `blendoff`, CRUNCH's
  `setalpha`/`blendoff`.
- **Notes — write the staging entry in DISPLAYED frames, or label the column RAM.**
  The IRON_TAIL staging entry printed RAM frames under a heading that said
  "displayed". The worker could not make the reducer fit, correctly refused to
  write code it believed was wrong, and burned its whole cap. That is the single
  most expensive mistake available in this lane. TAKE_DOWN's entry then
  contradicted *itself* on the same point (claimed one frame, gave a two-frame
  example); the promotion brief called the contradiction out explicitly and the
  round landed clean. **When a ledger and a change map disagree, the change map
  wins.**
- **Notes — a brief that pre-supplies the mechanical facts buys a whole phase.**
  Script-pointer bounds come from `arm-none-eabi-nm reference/pokeemerald/pokeemerald.elf`
  (`Move_<NAME>` and the next label — these labels are NOT in the linker map and
  `bin/oracle symbols` returns null for them). Move ids, the species set carrying
  the move, and a species already referenced in this lane (so its geometry is
  known) are all one query each. Every round that got these in its brief hit its
  floor; the one that didn't, didn't.
- **Notes — two evidence defects found and fixed, neither load-bearing.**
  (1) `detectProbe.py` and `ironTailProbe.py` read `animNum`/`animCmdIndex`/
  `animDelayCounter` at 0x18/0x19/0x1a; `struct Sprite` puts them at 0x2a/0x2b/0x2c
  and 0x18 is `subspriteTables`, so all three were pointer bytes. Neither portable
  compared those fields, so no acceptance depended on them — re-running all four
  portables after the fix reproduced the same results with new twice-fresh
  deterministic hashes, re-pinned in the fixtures, the evidence tests, the
  coverage JSON and the ledger. (`dragonClawProbe`/`metalClawProbe` read 0x2b
  under the name `animNum`: a naming defect only — their portables compare it
  against the app's `animationFrame`, which IS the anim command index. Left alone
  deliberately.) (2) The TAKE_DOWN round ported `windUpLunge`'s sine and added a
  correction subtracting 1 from negative products that are not multiples of 256.
  `trig.c:517` defines `Sin` as an arithmetic `>> 8`, which floors — and JS `>>`
  floors identically, so the correction made 630 of 635 negative products off by
  one. Latent (TAKE_DOWN never reaches the negative half of the wave, and
  SPIKE_CANNON/BRICK_BREAK use amplitude zero), fixed before it could bite.
- **Notes — verification that earned its keep.** Re-running each portable myself
  caught nothing dishonest this session (a change from last session, when two of
  five fixture pairs lied), but re-reading each diff did: both defects above came
  from reading the diff, not from a failing test. Diffs were purely additive for
  every promotion except the inventory pin, so no sibling-regression surface
  existed — worth checking every time, because the one round that touched a shared
  helper is the one that introduced a bug.
- **For the main program:** nothing blocking. No boundary widening, no new
  unsupported barriers, no controller or battle-state ownership taken, no
  animation deferrals opened. Engine contact stayed inside
  `src/engine/battleScene.ts` animation draw cases plus the
  `src/animation/sceneOnPresentation.ts` seam.
  `tests/animation/factoryAnimationInventory.test.ts` now pins **127 exact / 149
  unsupported** — that pin moves on every promotion, so a fold that resolves
  `ANIMATION_COVERAGE.json` must re-run it.

## MOVE_CRUNCH staged — both orientations isolated at 142 frames; scenarios + dense probe + change maps banked (2026-08-08 worker)

- **State:** CRUNCH stays **unsupported**. Coverage unchanged at **126/276 exact, 0
  partial, 0 staged, 150 unsupported**. Nothing promoted; no pin moved. This is the
  staging round; promotion to exact (both orientations, a portable at full-window
  exact) is the NEXT round's job.
- **Did:** staged two legal mechanicLab scenarios (HOUNDOUR `SPECIES_HOUNDOUR` 228 —
  FRONTIER_MON_HOUNDOUR, set 119, all four active slots CRUNCH 242, vs legal ONIX
  95; player-back `mechanic-crunch-player-houndour-opponent-onix.json` and
  opponent-front `mechanic-crunch-opponent-houndour-player-onix.json`, both verified
  to run with currentMove 242) and `tools/compare/crunchProbe.py` — a dense probe
  copied from `takeDownProbe.py` with script-pointer isolation to
  `Move_CRUNCH` (0x082d05b3)..`Move_CLAMP` (0x082d0663) capturing every
  `gSharpTeethSpriteTemplate` bite sprite (all four, with affine animation number,
  position, velocity and data words — `AnimBite`/`_Step1`/`_Step2`), both
  `gBasicHitSplatSpriteTemplate` hitsplats, both `AnimTask_ShakeMon`/`_Step`
  target-shake tasks, the `fadetobg`/`restorebg` machinery (`Task_FadeToBg` +
  `gPaletteFade` struct + BLDCNT/BLDALPHA/BLDY + BG palettes — CRUNCH's dark fade is
  a real palette/BG change), both battlers' sprites, all 512 palettes, software +
  hardware OAM and matrices, per-frame raw RGB + sha256. NOTE: keeps the TRUE sprite
  offsets `0x2a`/`0x2b`/`0x2c` for animNum/animCmdIndex/animDelayCounter like
  takeDownProbe (never `0x18`/`0x19`). Probe run: `python3 tools/run-mgba-probe.py
  <out.json> -- python3 tools/compare/crunchProbe.py <scenario.json> <out.json>
  <rgb-dir> 242`. Plus the displayed-timing change maps banked under
  `tools/compare/evidence/crunch-changemap-*.txt`.
- **Measured (fresh runs, both orientations, deterministic): move-owned window 142
  frames each — player-back 74..215, opponent-front 78..219** (script first
  in-bounds .. first inactive cleanup). **Both first frames are CLEAN** — no
  outgoing-teardown contamination: player frame 74 / opponent frame 78 are
  pixel-identical to their next 4 frames, software OAM byte-identical to frame 2,
  hw OAM slots 11+ off-screen y=160, no shadow sprite. (The only quirk: hw OAM
  slots 9/10 show one-frame-stale content at the first frame — the hw OAM lags the
  software OAM by one vblank — but it renders zero pixels; the first ~10 frames of
  each window are the `loadspritegfx` prefix and byte-identical on screen. No
  `skipProbeFrames` needed, unlike TAKE_DOWN's opponent-front.) Determinism: player
  re-run byte-identical sha256 sequence (first/last `9c2b60a26f70`/`b54fa1b31c69`).
- **RAM timeline (player-back; opponent-front is every frame +4 — the two
  orientations are structurally identical, which the reducer must parameterize):
  ** monbg ANIM_TARGET (target→BG1, sprite invisible) RAM 81; `fadetobg BG_DARK`
  Task_FadeToBg + palette fade 0→16 RAM 84-100, BG_DARK load 102, fade-in 16→0 RAM
  103-119, done 121; `setalpha 12,8` (BLDCNT 0x3f40 / BLDALPHA 0x080c) RAM 122,
  cleared by `blendoff` RAM 171 (RAM-truth only — no blend pixel step, like
  CRUSH_CLAW); SE_M_BITE RAM 122 and 148 (rounds 1/2). **Teeth** (gSharpTeeth
  ANIM_TAG_SHARP_TEETH, 64x64 affine, subpriority 28): round 1 created RAM 122 at
  target-center ∓32 with xVel +819/+819 and −819/−819 (script animation 1 / 5),
  converge x2 3..31 over RAM 122-131, retract to 3 over 132-140, destroyed 141;
  round 2 created RAM 148 (x=+32,−32 anim 7 vel −819/+819 and x=−32,+32 anim 3 vel
  +819/−819), destroyed 167. The script `animation` arg is the `gAffineAnims_Bite`
  rotation: anim1 {181,−181,181,181} 45°, anim5 {−181,181,−181,−181} 225°, anim7
  {181,181,−181,181} −45°, anim3 {−181,−181,181,−181} 135° (256·cos/sin). **Basic
  hitsplats** (ANIM_TAG_IMPACT, static anim cmdIndex 0, matrix 303 scale):
  created RAM 134 at target center x=−8 (168,42) / round 2 RAM 160 x=+8 (184,42),
  destroyed 144 / 170. The x offset **mirrors for the player-side target**
  (opponent-front round 1 at (80,88)=72+8, round 2 at (64,88)=72−8 — BODY_SLAM
  convention). **AnimTask_ShakeMon(0, 7/8, 5/4, 2)** on the target sprite: round 1
  task RAM 134-146, y2=7 blocks at [134], [138-140], [144-146] (0 elsewhere),
  destroyed 147; round 2 task RAM 160-169, y2=8 blocks at [160], [164-166],
  destroyed 170 (num=4 makes the final toggle net-zero). `restorebg` (FadeToBg
  bgId=−1) RAM 176, fade out 176-193 / in 196-213, done 214, `end` cleanup 215.
- **Displayed-timing mapping (player-back; opponent-front identical +4 on every
  frame; EVERY event displays exactly ONE frame after its RAM cause — no TAKE_DOWN
  windup two-frame case): ** fade-out 86-101, fully-dark static 102-104, fade-in
  105-120; teeth round 1 displayed 123-141, gone 142; hitsplat 1 displayed 135-144,
  gone 145; shake round 1 y2=7 displayed 135, 139-141, 145-147 (isolated change-map
  events at 145 = shake 0→7 + hitsplat1 gone, and 148 = shake 7→0 & destroy); teeth
  round 2 displayed 149-168, gone 168 (teeth RAM 167 + shake RAM 167 combined);
  hitsplat 2 displayed 161-170, gone 171 (the 413px change-map event); shake round 2
  y2=8 displayed 161, 165-167 (final RAM 169 toggle is net-zero → static);
  teardown fade 178-193 + static 194-197 + fade-in 198-213, static tails 214-215.
  Change map and hw OAM agree on every frame; the ledger defers to the change map.
- **Next:** promote CRUNCH to exact. Build `src/animation/crunch.ts` (RAM-truth
  reducer at the ages above: the fade-out/static/fade-in palette darken, monbg
  invisible, setalpha/blendoff, the two teeth pairs' x2/y2 + rotation matrices,
  the two hitsplats with the mirrored anchor, the ShakeMon y2 1/3-frame block
  pattern) + Tier-1 `tests/animation/crunch.test.ts`; `SceneOnCrunchConfig`/View
  seam in `sceneOnPresentation.ts`; the CRUNCH draw case in `battleScene.ts` (dark
  bg via the existing `faintAttackBgState`/`faintAttackDarkBg`, sharp-teeth via the
  BITE art); a `crunchPortable.ts` at full-window exact (142 frames × 2 axes, both
  first frames kept); the fixtures, the coverage entry and the inventory pin
  126->127 exact / 150->149 unsupported.
- **Notes — zero new components.** Every component is already exact elsewhere:
  `gSharpTeethSpriteTemplate`/`AnimBite` = MOVE_BITE/`bite.ts` and MOVE_SECRET_POWER;
  `fadetobg BG_DARK`/`waitbgfadein`/`restorebg` = MOVE_FAINT_ATTACK (the
  `faintAttackBgState`/`faintAttackDarkBg` machinery already wired in
  `battleScene.ts` — reuse it, do not build a second dark-BG path); basic hitsplat =
  IRON_TAIL/TAKE_DOWN/BODY_SLAM; `AnimTask_ShakeMon` = IRON_TAIL/POISON_TAIL/MUD_SHOT;
  monbg/setalpha/clearmonbg/blendoff = BODY_SLAM/FAINT_ATTACK. No boundary widening,
  no new unsupported-branch barrier, no shared-helper edit; the only engine contact
  will be the promotion round's draw case.

## MOVE_TAKE_DOWN promoted to exact — 126/276, both orientations at 98/98 and 97/97 portable-exact (2026-08-08 worker)

- **State:** coverage advanced **125→126/276 exact**, 0 partial, 0 staged, **151→150
  unsupported**. TAKE_DOWN was staged last round and is now proven by an exact move
  in both orientations through the shared seam. `takeDownPortable.ts` exits 0 at
  **TAKE DOWN component 98/98; framebuffer 98/98** (player-back) and
  **component 97/97; framebuffer 97/97** (opponent-front), fresh evidence hashes
  player `5dcaff8f…`/RGB `ebe70e6c…`, opponent `79807540…`/RGB `ad9b74ed…`,
  reproduced twice fresh.
- **Did:** built `SceneOnTakeDownConfig`/`sceneOnTakeDownView` in
  `sceneOnPresentation.ts` (SWABLU added to the presentation species union) and the
  TAKE_DOWN draw case in `battleScene.ts` — SWABLU back/front and ONIX front/back,
  the F_PAL_BG|F_PAL_BATTLERS black coeff-10 darken on the battlers + field
  (healthboxes/message/hitsplat outside the mask), the semi-transparent 12/8 basic
  hitsplat over the target-2 backdrop snapshot (BODY_SLAM convention), the ONIX
  front-idle x2=1 hold until the push displays, and the split display latch (below).
  Wrote `tools/compare/takeDownPortable.ts` + the two fixtures (opponent window via
  `skipProbeFrames: 1` / `ageOffset: 1` like DETECT), the evidence test, the
  coverage entry, and moved the inventory pin 125→126 exact / 151→150 unsupported.
- **Measured (fresh, deterministic, twice-fresh hashes pinned):** the windup ramp
  displays 223-245, hold 246-255, lunge-out 256-265; palette darken 259-261,
  restore 262; hitsplat 259-267, teardown at 268; target slide-to-offset 262-265;
  shake 269-290 (269 first toggle, 290 final release); attacker slide-back
  295-299; target slide-back 300-306. **The two-frame windup latch HELD:** the
  task-driven WindUpLunge x2/y2 render exactly two ages after their RAM write
  (RAM 221 → display 223, change map + hw OAM x 40→38 agree), while every
  sprite-driven event renders one age after its RAM cause — the draw case splits
  the latch and flips the attacker back to the one-age rule at
  SLIDE_BACK_ATTACKER_AGE. `blendoff` clears BLDCNT at RAM 307 with no pixel step
  (RAM truth only, like CRUSH_CLAW).
- **Next:** the settled queue (MOVE_DRAGON_BREATH / MOVE_BIND) and the ranked
  remaining moves; TAKE_DOWN adds no new components to unproven leverage (windup
  = SPIKE_CANNON/BRICK_BREAK, slides = BODY_SLAM/STEEL_WING, ShakeMonInPlace =
  BODY_SLAM/SLAM, complex_palette_blend + basic hitsplat = REVERSAL/AERIAL_ACE/
  BLAZE_KICK/EARTHQUAKE/IRON_TAIL).
- **Notes — reducer correction found during promotion.** The staged reducer only
  modelled the opponent-side target: `Math.max(push, 0)` clamped the player-side
  SlideMonToOffset push (−16) to 0, the two slide-backs hardcoded `currentX2: 16`
  (the +16 arithmetic-shift rounding does not negate cleanly for the −16/−17
  player/opponent bases), and the lunge's sine-tail y2 1 was cut at age 50 even
  though the last task write holds on the sprite through the return slide. All
  fixed in `src/animation/takeDown.ts` with the Tier-1 pins extended to cover both
  orientations (still 10 tests); verified 0 RAM mismatches across both fresh probes.
  Also fixed the slideToOffsetCount to the dummy's real 5-age lifetime. No shared
  helper changed this round (the shared windUpLunge nonzero-sine branch was fixed
  by the supervisor last round); SPIKE_CANNON/BRICK_BREAK Tier-1 untouched. No
  boundary widening, no new unsupported-branch barrier; the only engine contacts
  are the TAKE_DOWN draw case in `battleScene.ts` and the one/two-frame seam.
