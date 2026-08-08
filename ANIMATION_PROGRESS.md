# Animation coverage

## MOVE_CRABHAMMER staged — dense two-orientation RAM receipt + typed seam; remains unsupported (2026-08-08 worker, round A)

- **State:** Coverage deliberately unchanged at **131/276 exact, 0 partial, 0 staged, 145 unsupported**. `MOVE_CRABHAMMER` remains unsupported; no inventory pin or coverage entry moved, no draw case, shared-helper edit, controller/state edit, boundary widening, or new unsupported barrier.
- **Evidence:** Added legal Battle Scene ON KRABBY→ONIX fixtures (`mechanic-crabhammer-{player-krabby-opponent-onix,opponent-krabby-player-onix}.json`) and `crabHammerProbe.py`. Both set all active KRABBY slots to **152** and source-verify the real `FRONTIER_MON_KRABBY` set-111 loadout. The pointer-isolated `Move_CRABHAMMER` `0x082d1cd0..Move_SURF 0x082d1dca` windows are clean **player-back 212..316 / opponent-front 302..406 (105 frames each)**, ending at first inactive cleanup; fresh reruns byte-compare exactly (player receipt `fbd3c2e3…`, opponent `6fda2003…`; first/last RGB player `73241ed1…`/`6994068c…`, opponent `7666f800…`/`7666f800…`). Committed change maps: `crabhammer-changemap-{player,opponent}.txt`.
- **RAM vs display:** Orientations share one age-indexed reducer and are shifted **+90 absolute frames**. ICE_CRYSTALS/WATER_IMPACT palette tags load at RAM ages **1/4**, monbg at **7**, alpha 12/8 + identity WATER_IMPACT splat at **10**, complex `F_PAL_BG|F_PAL_BATTLERS` `RGB(13,21,31)=0x7ead,y=10` + target slide at **13**, neutral palette reset **16**, return slide **32**, eight small-bubble pairs at **37,43,49,55,61,67,73,79** (20 RAM ages each; OAM slots `3,4,5,7` repeat), `ShakeMon(0,4,8,1)` at **37..50**, cleanup at **100**. Each visible splat/slide/bubble/ShakeMon/palette edge lands RAM+1 in *both* maps; monbg/setalpha/cleanup have no independently separable pixel edge here and are recorded as RAM-only, not assigned a guessed lag. The player target's ONIX-front idle x2 is +1 before the slide; opponent target's ONIX-back idle x2 is 0; both return to 0.
- **Port:** Added `src/animation/crabHammer.ts` (RAM truth only) and typed `SceneOnCrabHammerConfig`/`sceneOnCrabHammerView`; it reuses `slideMon.ts` and `shakeMon.ts`, with Tier-1 equivalence pins. Added `tests/animation/crabHammer.test.ts` (windows, all 12 body components, both orientations, slots, blend, latches, seam). Focused Crabhammer + boundary ratchet + inventory: **16/16 passed**.
- **Component / sibling audit:** Representative body is exactly `ANIM_TAG_ICE_CRYSTALS`, `ANIM_TAG_WATER_IMPACT`, both slide templates, `gSmallBubblePair`, `gWaterHitSplat`, `AnimTask_ShakeMon`, `complex_palette_blend`, `monbg`, `setalpha`, `clearmonbg`, `blendoff`. WATERFALL still needs its own complete underwater waterfall body; SECRET_POWER only reaches it under `BATTLE_ENVIRONMENT_UNDERWATER` (Factory building routes to STRENGTH); WATER_GUN and HYDRO_PUMP retain their already-independent exact receipts but have projectile/droplet or beam/orb bodies; DIVE still needs its two-turn splash/strike body; WATER_SPOUT needs launch/rain geometry. Shared components do not promote any sibling or Crabhammer.
- **Correction / next:** The Mud Shot fixture's `[156,…]` controller IDs are its established mechanismLab encoding despite its receipt label “set-111”; substituting literal `111` blocks the known opponent path, so Crabhammer preserves those IDs while the source assertion proves set 111. Promotion still needs a scene draw case, portable, assets/compositor proof, and fresh full-window component/framebuffer acceptance in both orientations.

## Supervisor wind-down — SLASH, LICK, COUNTER and DOUBLE_EDGE all exact, 127→131; DOUBLE_EDGE closed after three prior failures; the display latch is per-TASK, not per-category (2026-08-08 animation session)

- **State:** coverage advanced **127→131/276 exact**, 0 partial, 0 staged, 145
  unsupported. `animation-main` is committed and green with no worker worktrees
  or branches left behind. 9 worker launches, 9 productive, 3 cap-kills (all
  salvaged in full). `ANIMATION_DEFERRED.md` remains empty.
- **Did:** promoted **MOVE_SLASH** (46/46 both orientations), **MOVE_LICK**
  (73/73 both), **MOVE_COUNTER** (88/88 both) and **MOVE_DOUBLE_EDGE** (141/141
  both) — the last after **three failed promotion rounds on 2026-08-07** and a
  day spent as 340 lines of dead code that nothing imported and no test pinned.
  Normalized `ANIMATION_COVERAGE.json` back to its canonical one-space
  serialization after one promotion drifted it.
- **Verified:** every promotion re-run by the supervisor rather than accepted on
  report — both portables per move, fresh, plus an **earlier move's portable as a
  control every time** (CRUNCH held at 142/142 twice with its committed hashes;
  LICK held at 73/73 and SLASH at 46/46 after later draw cases landed). All eight
  change maps re-derived by the supervisor from independent fresh probe runs and
  diffed byte-for-byte against the committed files — **8/8 identical**. Both new
  asset extractors re-run: byte-for-byte regeneration confirmed. The DOUBLE_EDGE
  reducer validated field-by-field against the supervisor's own probe **twice** —
  once at staging and again after the promotion round edited it — matching every
  offset and **all 141 frames × 2 orientations × 4 affine-matrix fields with zero
  mismatches** both times. Final integrated `npm test` **786 files / 7630 passed /
  1 established skip** and `npm run build` exit 0 on the merged tree.
- **Next:** the remaining moves ranked by TOTAL unit size — anim-script lines
  PLUS the lines of C in any new component, which is the number that actually
  predicted round cost across this session and the last. Zero-new-component
  first: **CRABHAMMER** (35 script lines), **MEGA_KICK** (23 lines but 22
  components across several blocks), **MAGICAL_LEAF** (42), **THUNDER** (56).
  Then the small one-new-component moves: **SUBSTITUTE** (3 script lines + 39 C,
  but it needs the substitute-doll gfx and a mon-sprite swap, so the line count
  understates it), **FAKE_OUT** (9 + 47), **BARRIER** (8 + 59, new
  ANIM_TAG_GRAY_LIGHT_WALL asset), **HAZE** (8 + 86). **Avoid MOVE_DOUBLE_KICK
  and MOVE_THRASH** despite their small size: `AnimFistOrFootRandomPos` makes
  four `Random2()` calls and this lane does not model the Random2 stream.
  Caveat from experience: a low total is necessary but not sufficient —
  DOUBLE_EDGE scored 31 and still failed three rounds, because composing nine
  already-exact components across a 141-frame window is its own kind of hard.
  Prefer a small script AND few components together.
- **Notes — the headline mechanism finding: the display latch is per-TASK, and
  the lane's working rule was wrong.** Before this session the lane believed
  "sprite-driven displays one frame after RAM, task-driven displays two." That
  generalization is FALSE and MOVE_COUNTER falsified it inside a single window:
  `AnimTask_TranslateMonEllipticalRespectSide` displays at **RAM+2** while
  `AnimTask_ShakeMon` displays at **RAM+1** — same move, same frames. Meanwhile
  `AnimTask_ShakeMon2` displays at **RAM+2** (SLASH, LICK, TAKE_DOWN), and
  `AnimTask_RotateMonSpriteToSide` measures **RAM+2** (DOUBLE_EDGE). ShakeMon and
  ShakeMon2 are different source tasks and they latch differently. **Measure the
  lag per task, per move, from the change map — never inherit it.** Sprite-driven
  events have been RAM+1 in every move measured so far.
- **Notes — the orientation shift is not a lane constant either.** It came out
  **+4** (CRUNCH, SLASH, DOUBLE_EDGE), **−1** (LICK) and **+0** (COUNTER) — three
  different values in one session. Every brief this session told the worker to
  measure both windows separately, and that was the right call. Related: the two
  orientations do NOT have matching changed-pixel counts even when their timing
  lines up, because the target is ONIX's *front* sprite in one orientation and
  its *back* sprite in the other — a ~20% footprint difference on SLASH.
- **Notes — a second measured painter rule.** For equal-subpriority
  semi-transparent overlaps the **lower OAM slot** wins the PPU's one-selected-OBJ
  blend, NOT creation order. COUNTER's three hitsplats land on slots 3/5/4 (the
  allocator cycles 3,4,5 and reuses), measured from probe hardware OAM at the
  frame-247 and frame-255 overlaps; it cost two portable iterations to pin. SLASH
  found the same rule from the other side: its two equal-subpriority slices
  resolve in allocator order, the reverse of CRUNCH's "later slot wins" reading.
- **Notes — the DOUBLE_EDGE retry, and why it worked this time.** DOUBLE_EDGE
  failed three consecutive promotion rounds on 2026-08-07, one with zero file
  writes, and left `src/animation/doubleEdge.ts` behind: 340 lines that nothing
  imported and no test pinned. All three failures predate
  `tools/compare/frame-changemap.py`. The retry brief ordered the change maps
  FIRST, before any TypeScript, and told the worker to treat the existing reducer
  as an unverified hypothesis rather than a staged asset. That round was
  cap-killed but committed its green state; the supervisor's own validation then
  showed the corrected reducer exact on every affine field. **The premise held:
  the missing artifact was the change map, not the difficulty of the move.**
  A follow-up round made the reducer load-bearing (pins + seam) so it cannot rot
  as dead code again. The promotion round that followed was also cap-killed, with
  the draw case, portable and both fixtures committed and two test files left
  uncommitted; the supervisor salvaged those two files unchanged, verified both
  portables at **141/141 component and framebuffer, exit 0, both orientations**
  with `counterPortable` held as a control at 88/88, re-validated the reducer
  against its own probe after the worker's edits, and then wrote the coverage
  entry and moved the inventory pin itself. **Three of this session's nine
  launches were cap-killed and all three were salvaged in full** — the pattern
  that makes that cheap is workers committing green intermediate state rather
  than holding one big change.
- **Notes — briefs that pre-supply mechanical facts keep paying.** Every round
  this session got script-pointer bounds from `arm-none-eabi-nm` (these labels are
  NOT in the linker map; `bin/oracle symbols` returns null), the move id, the
  carrying Factory set, and a named scenario pair to copy. Three of the four moves
  needed **no scenario authoring at all** — SLASH copied CRUNCH's pair, LICK
  copied the existing SLAM pair (set 164 LICKITUNG legally carries both), and
  COUNTER copied the DOUBLE_EDGE pair (set 341 HITMONTOP legally carries both).
  Checking which existing scenario's species already carries the target move is
  the cheapest minute available in this lane.
- **Notes — worker self-correction worth recording.** The SLASH promotion round
  was told in its brief that the `AnimTask_ShakeMon2` creation-frame write is a
  same-frame transient that never reaches pixels. It checked the framebuffer
  instead of believing the brief, and the brief was wrong: the write reaches
  exactly one displayed frame. The LICK round then refined it further — that same
  write is a real one-frame step for ONIX's *back* sprite but idle-coincident, and
  therefore invisible, for its *front* sprite. Both rounds reported the correction
  explicitly rather than silently working around it.
- **Notes — two duplicated closed forms, deliberately pinned rather than
  refactored.** SLASH and LICK each re-derived `AnimTask_ShakeMon2` as a closed
  form instead of calling `src/animation/shakeMon2.ts`. They agree with the shared
  port on every observable age (they differ only at the creation index, a
  same-frame transient), so rather than rewrite proven draw cases, each carries a
  Tier-1 pin asserting equivalence with the shared port over the observable range.
  COUNTER and DOUBLE_EDGE do import their shared ports (`slideMon.ts`,
  `shakeMon.ts`, `shakeMonInPlace.ts`) directly, which is the preferred shape.
- **Notes — the honest non-result got settled, and the answer was neither
  candidate.** The pin round recorded `AnimTask_ShakeMonInPlace`'s display lag as
  **NOT DETERMINED**: its window is fully overlapped by DOUBLE_EDGE's forward
  rotation and BG white-blend ramp, the best fit was RAM+1, and that fit explained
  every player-back frame but contradicted one opponent-front toggle. Refusing to
  guess was the right call, because the promotion round then measured a rule that
  is neither RAM+1 nor RAM+2: **the shake displays PAIR-ALIGNED.** Its RAM writes
  come in two-frame pairs at the even ages 80..100, the odd-age writes never reach
  a displayed frame at all, so the displayed value at display age A is the RAM
  pair containing A-1 (each value holding two displayed frames) and the RAM
  age-101 restore shows at displayed age 103. That rule is exact on BOTH
  orientations, and it is pinned in `tests/animation/doubleEdge.test.ts` via the
  exported `doubleEdgeRamShakeX2` / `doubleEdgeDisplayedShakeX2` pair. A guessed
  RAM+1 would have shipped a draw case that was wrong on one orientation.
- **For the main program:** nothing blocking. No boundary widening, no new
  unsupported barriers, no controller or battle-state ownership taken, no
  animation deferrals opened. Engine contact stayed inside
  `src/engine/battleScene.ts` animation draw cases plus the
  `src/animation/sceneOnPresentation.ts` seam; every engine diff this session was
  purely additive with zero deletions.
  `tests/animation/factoryAnimationInventory.test.ts` now pins **131 exact / 145
  unsupported** — that pin moves on every promotion, so a fold that resolves
  `ANIMATION_COVERAGE.json` must re-run it. One housekeeping note for whoever
  edits that file next: it is serialized at **one space per nesting level**
  (`json.dumps(..., indent=1)`); a promotion this session drifted two entries to
  four-space and the supervisor re-serialized it in a separate whitespace-only
  commit.

## MOVE_DOUBLE_EDGE pinned and wired — stays unsupported, 130/276 exact unchanged (2026-08-08 worker, pin round)

- **State:** DOUBLE_EDGE stays **unsupported**. Coverage unchanged at **130/276
  exact, 0 partial, 0 staged, 146 unsupported**. Nothing promoted; no pin
  moved; no boundary widening; no shared-helper edit. This is the pin round —
  the 340-line dead reducer is now load-bearing; promotion to exact (both
  orientations, a portable at full-window exact) is the NEXT round's job.
- **Did:** wrote `tests/animation/doubleEdge.test.ts` (11 pins, modelled on
  counter.test.ts — the shared elliptical lunge, the two gSlideMonTo* slides
  and a basic hitsplat) and added `SceneOnDoubleEdgeConfig` /
  `SceneOnDoubleEdgeView` / `sceneOnDoubleEdgeView` to
  `src/animation/sceneOnPresentation.ts` following
  `SceneOnCounterConfig`/`sceneOnCounterView` exactly (same config shape, same
  union memberships in `SceneOnMoveConfig` and `createSceneOnMovePresentation`,
  same view shape). HITMONTOP was already in the presentation species union
  (COUNTER added it), so no species work. No engine file touched.
- **Measured (from the banked change maps + the supervisor's validated probe
  facts, no new oracle run):** window **141 frames both orientations** —
  player-back **80..220**, opponent-front **84..224**, an **orientation shift of
  +4**. The pins lock: the 18/6/**2**/4 two-loop lunge (via the shared `wrap.ts`
  port, both orientations incl. the mirrored width), the attacker slide +20 and
  target slide -32 as REUSE pins against `slideMon.ts` (the opponent-side target
  holds **+31, not -32** — the shared port's truncating Q8.8 division; the
  player-side target holds exactly -32), the `ShakeMonInPlace(4,0,12,1)` x2 as a
  REUSE pin against `shakeMonInPlace.ts` (the shake is added to BOTH battlers'
  x2 over ages 80-100 — this is what makes the change-map bbox span both
  battlers), the `RotateMonSpriteToSide` matrices at their boundary ages
  (forward span 256..2048, reversal 2304..3840, identity reset with the
  persistent y2=12), the rotation-derived y2 applying only to the player-side
  battler (dead-code correction #1), the hitsplat ages 70-78 at the mirrored
  target-relative anchor, and the attacker-white (10 at 4-7/13-18) + BG-white
  (16 at 63-82, ramping to 0 at 111) blend curves. The **ONIX front-idle
  exclusion is pinned explicitly**: player-back `targetOffset.x2` reads 0 for
  ages 0-69 while the probe reads 1 (ONIX front idle hold) — a species-idle
  property the draw case supplies, not a reducer bug (TAKE_DOWN/SLASH/LICK/
  COUNTER convention); opponent-front has no such hold (ONIX back rests at x2=0)
  and mismatches zero fields.
- **Next (exactly what a promotion round still needs):** the MOVE_DOUBLE_EDGE
  draw case in `battleScene.ts` (must split the display latch per the two lags
  below), a `tools/compare/doubleEdgePortable.ts` at full-window exact (141
  frames x 2 axes x 2 orientations), the two fixtures, the evidence test
  (`tests/animation/doubleEdgeEvidence.test.ts`), the coverage entry and the
  inventory pin 130 -> 131 exact / 146 -> 145 unsupported. The ellipse task was
  per-move-profiled (`wrap.ts` port, two loops vs COUNTER's one) — a promotion
  round must verify ITS display latch, not inherit COUNTER's +2.
- **Notes — the two display lags read off the banked change maps (first time
  either is measured in this lane), one line each:** **`AnimTask_RotateMonSpriteToSide`
  is TASK-driven and renders RAM + 2** — isolated restore-phase window: static
  frames 193-200, first pixel change 201 = RAM 119 + 2, seven consecutive
  change frames for the seven restore steps (119-125), identity reset at RAM 126
  landing with the attacker origin slide at 208, confirmed in both orientations
  (opponent restore 119-125 -> changes 205-211). **`AnimTask_ShakeMonInPlace` is
  NOT DETERMINED from the change maps** — its window (RAM ages 80-100) is fully
  overlapped in both orientations by the forward rotation (80-87) and the BG
  white-blend ramp (83-111); its 2-frame toggle cadence reads clearly in the
  clean half (odd displayed frames) and the best fit (RAM + 1 with the task's
  tick 0 at RAM age 80) explains the player-back map on every frame, but the
  opponent-front frame 185 (the last toggle) is static, so no single lag
  reproduces both maps byte-for-byte — reported honestly as not determined
  rather than guessed (a fresh single-axis probe is that round's first job).
- **Notes — `npm test` green on the targeted set (doubleEdge 11/11, counter
  9/9, boundary ratchet 3/3, inventory 6/6 at 130/146) at commit time; the
  full-suite + build verification is this round's finish step.** No boundary
  widening, no new unsupported-branch barrier, no shared-helper edit; the only
  engine contact will be the promotion round's draw case.

## MOVE_COUNTER promoted to exact — 130/276, both orientations at 88/88 portable-exact (2026-08-08 worker, round B)

- **State:** coverage advanced **129→130/276 exact**, 0 partial, 0 staged,
  **147→146 unsupported**. COUNTER was staged last round and is now proven by an
  exact move in both orientations through the shared seam. `counterPortable.ts`
  exits 0 at **COUNTER component 88/88; framebuffer 88/88** (player-back,
  frames 207-294) and **component 88/88; framebuffer 88/88** (opponent-front,
  frames 207-294), fresh evidence hashes player `aeb600cd…`/RGB `858b9e0f…`,
  opponent `d6c0b68a…`/RGB `85cab93f…`, reproduced fresh four times each (twice
  standalone + twice via the portable). The inventory pin moved **129→130 exact
  / 147→146 unsupported**.
- **Did:** the MOVE_COUNTER draw case in `battleScene.ts` — HITMONTOP
  back/front and ONIX front/back (shared battle back/front bundles), the three
  opaque fists (subpriority 27, `subTileset(handsAndFeet,0,4)` painter) and
  three basic hitsplats (subpriority 28, identity matrix, blended 12/8 over the
  field+target backdrop, BODY_SLAM convention) at the mirrored target-relative
  anchors, the target always visible as the monbg BG1 copy that tracks the
  sprite x2 (`Task_UpdateMonBg`, battle_anim.c:813-837), and the split display
  latch (below). Wrote `tools/compare/counterPortable.ts` (modelled on
  crunchPortable.ts, probe move 68) + the two fixtures, the evidence test
  (`tests/animation/counterEvidence.test.ts`), the coverage entry, and moved
  the inventory pin.
- **Measured (fresh, deterministic, twice-fresh hashes pinned): the display
  latch is split THREE ways — the first move in the lane where "task-driven
  means +2" is FALSE as a blanket rule.** `AnimTask_TranslateMonEllipticalRespectSide`
  (attacker lunge) is TASK-driven and renders **RAM + 2** (RAM 217 → pixels 219,
  peak x2 18 at RAM 220 → pixels 222, rest RAM 231 → pixels 233). **`AnimTask_ShakeMon`
  is TASK-driven but renders RAM + 1** — the RAM flips land on odd ages and the
  change-map events are the following even ages (244,246,…,290) — **NOT the +2
  the lane's ShakeMon2 rounds (SLASH/LICK/TAKE_DOWN) measured; ShakeMon and
  ShakeMon2 are different source tasks and latch differently, the most reusable
  fact this move teaches.** Both `gSlideMonTo*` dummies and all three
  fist/hitsplat pairs are SPRITE-driven at **RAM + 1** (first hitsplat RAM 238 →
  pixels 239, first fist RAM 241 → pixels 242). The target rests at the ONIX
  front-idle x2=1 through display 241, drops to 0 at 242 (shake creation write),
  then toggles 5/0 every two frames through the 0 restore at display 290 — the
  ONIX x2 never returns to 1, and because the target stays visible (the BG copy
  tracks the sprite x2) the shake IS visible moving pixels, unlike a hidden-OBJ
  assumption would suggest. monbg/setalpha 12,8 (BLDCNT 0x3f40, empty target-1,
  no pixel step)/clearmonbg/blendoff are RAM-truth only, exactly like
  CRUNCH/CRUSH_CLAW.
- **Notes — the orientation-shift trap did NOT bite, but the painter-order trap
  DID, and it was the equal-subpriority semi-transparent overlap, not the
  target-front-vs-back.** The orientations line up **+0 on every frame** (one
  age-indexed reducer serves both; only the battler geometry and the mirrored x
  differ). The changed-pixel counts differ because the target is ONIX's front
  sprite in one and its back sprite in the other — expected. The real finding:
  within the equal-subpriority 28 hitsplat pair the ROM's OAM allocator REUSES
  slots (hitsplats land on 3/5/4, fists on 4/3/5), and the LOWER OAM slot wins
  the PPU's one-selected-OBJ semi-transparent blend (probe-measured at the
  frame-247 hitsplat1/hitsplat2 and frame-255 hitsplat2/hitsplat3 overlaps) —
  so `counter.ts` now reports each hitsplat's OAM slot and the draw paints
  descending. Blind creation-order painting cost this round two portable
  iterations (247 then 255); slot order, not creation order, is the rule.
- **Next:** the settled queue (MOVE_DRAGON_BREATH / MOVE_BIND) and the ranked
  remaining moves; COUNTER adds no new unproven components (the lunge task was
  per-move-profiled, the slides/shake are the shared `slideMon.ts`/`shakeMon.ts`
  ports, fists/hitsplats/monbg/setalpha are all already exact elsewhere).
- **Notes — no boundary widening, no new unsupported-branch barrier, no
  shared-helper edit.** The only engine contacts are the COUNTER draw case in
  `battleScene.ts` and the already-landed `sceneOnCounterView` seam; the only
  src/animation change is exporting `SLIDE_ORIGIN_DURATION` and adding the
  hitsplat `slot` field in `counter.ts`. The coverage entry is flipped LAST,
  after both portables exited 0 at full-window exact (88/88 each).
- **Notes — `npm test`, `npm run typecheck` and `npm run build` green on the
  final tree.** The coverage entry was inserted with `json.dumps(indent=1)`
  serialization (one space per nesting level) — re-serialized the file rather
  than hand-indent an entry, so no whitespace drift.

## MOVE_COUNTER staged — both orientations isolated at 88 frames; scenarios + dense probe + change maps banked (2026-08-08 worker, round A)

- **State:** COUNTER stays **unsupported**. Coverage unchanged at **129/276 exact, 0
  partial, 0 staged, 147 unsupported**. Nothing promoted; no pin moved; no
  boundary widening; no shared-helper edit. This is the staging round;
  promotion to exact (both orientations, a portable at full-window exact) is the
  NEXT round's job.
- **Did:** staged two legal mechanicLab scenarios (HITMONTOP `SPECIES_HITMONTOP`
  237 — FRONTIER_MON_HITMONTOP_2, set 341, item Focus Band 196, nature ADAMANT 3,
  EV spread HP|DEFENSE = 255/255, all four active slots COUNTER 68, vs legal ONIX
  95; player-back `mechanic-counter-player-hitmontop-opponent-onix.json` and
  opponent-front `mechanic-counter-opponent-hitmontop-player-onix.json` — exact
  copies of the DOUBLE_EDGE pair with only HITMONTOP's four move slots changed
  38→68, byte-identical otherwise, both verified to run with currentMove 68) and
  `tools/compare/counterProbe.py` — a dense probe copied from `crunchProbe.py`
  with script-pointer isolation to `Move_COUNTER` (0x082d2422)..`Move_VITAL_THROW`
  (0x082d24f1) capturing every `gFistFootSpriteTemplate` fist (all three, with
  animation number, position and data words — `AnimBasicFistOrFoot`/
  `WaitAnimForDuration`), every `gBasicHitSplatSpriteTemplate` hitsplat (all
  three, `AnimHitSplatBasic`), both `gSlideMonToOffsetSpriteTemplate`/
  `gSlideMonToOriginalPosSpriteTemplate` dummy sprites, the
  `AnimTask_TranslateMonEllipticalRespectSide` attacker-lunge task and the
  `AnimTask_ShakeMon` target-shake task (each with its arguments/state), the
  monbg/setalpha/blendoff machinery (BLDCNT/BLDALPHA/BLDY), both battlers'
  sprites, all 512 palettes, software + hardware OAM and matrices, per-frame raw
  RGB + sha256. NOTE: keeps the TRUE sprite offsets `0x2a`/`0x2b`/`0x2c` for
  animNum/animCmdIndex/animDelayCounter (never `0x18`/`0x19`). Probe run:
  `python3 tools/run-mgba-probe.py <out.json> -- python3 tools/compare/counterProbe.py
  <scenario.json> <out.json> <rgb-dir> 68`. Plus the displayed-timing change
  maps banked under `tools/compare/evidence/counter-changemap-player.txt` /
  `counter-changemap-opponent.txt`.
- **Measured (fresh runs, both orientations, deterministic): move-owned window 88
  frames each — player-back 207..294, opponent-front 207..294** (script first
  in-bounds .. first inactive cleanup). **Both first frames are CLEAN** — no
  outgoing-teardown contamination: player frame 207 / opponent frame 207 are
  pixel-identical to their next 4 frames, no move sprites, no move tasks (the
  `loadspritegfx` prefix is 12 frames of static screen; the monbg invisible flip
  at RAM 214 and the setalpha BLDCNT write at RAM 217 are both RAM-truth-only —
  the BG copy shows identical pixels). **The orientations line up EXACTLY 0 on
  every frame — NOT the +4 of CRUNCH/SLASH, NOT the -1 of LICK** — the reducer
  can be a single age-indexed shape with only the battler geometry differing.
  Determinism: each orientation re-run from scratch is byte-identical (player
  sha seq first/last `5260a0e4…`/`3167d803…`, opponent `79c0de89…`/`79c0de89…`);
  software+hardware OAM byte-identical across runs.
- **RAM timeline (player-back; opponent-front is identical frame-for-frame, only
  mirrored):** **Elliptical lunge** `AnimTask_TranslateMonEllipticalRespectSide
  (ANIM_ATTACKER,18,6,1,4)` — task slot 0, width 18, height 6, loops 1,
  wavePeriod 1<<4=16; attacker x2/y2 over RAM 217-230:
  (6,1),(12,2),(16,4),(18,6),(16,9),(12,11),(6,12),(0,12),(-7,12),(-13,11),(-17,9),
  (-18,6),(-17,4),(-13,2), then task destroyed RAM 231 (x2=y2=0). **Slide-to-offset
  dummy** `gSlideMonToOffsetSpriteTemplate(0,20,0,0,4)` at (176,42) = target
  X_2/Y_PIC, invisible, RAM 232-236 driving attacker x2 5,10,15,20,20 (data[1]=
  1280, accumulator 1280/2560/3840/5120), destroyed 237. **Fist/hitsplat triplets**
  at target-relative offsets (mirrored by `SetAnimSpriteInitialXOffset` for the
  player-side target): hitsplat1 (161,60)=(176−15,42+18) RAM 238-246, fist1
  (161,60) RAM 241-248 (data[0] 7..0 = WaitAnimForDuration 8), hitsplat2 (176,38)
  RAM 246-254, fist2 RAM 249-256, hitsplat3 (191,51) RAM 254-262, fist3 RAM
  257-264 — all animNum 0/animCmd 0 static, fists subpriority 27, hitsplats 28
  (both IN FRONT of the target's 40). **`AnimTask_ShakeMon(ANIM_TARGET,5,0,25,1)`**
  task slot 0 created RAM ~240, first observed RAM 241 (data[1]=24); x2 toggles
  5/0 in same-value pairs, flips at odd RAM frames 243,245,…,287 (x2=5 on
  243-244, 0 on 245-246, …), task destroyed RAM 289 (x2=0). **Slide-to-original
  dummy** `gSlideMonToOriginalPosSpriteTemplate(0,0,5)` (currentX2 20) RAM
  264-268 driving attacker x2 16,12,8,4,0 (data[4]=−1024 = −20<<8/5), destroyed
  269. **monbg ANIM_DEF_PARTNER** hides the target sprite RAM 214; **setalpha
  12,8** (BLDCNT 0x3f40 / BLDALPHA 0x080c) RAM 217; **clearmonbg + blendoff**
  restore it RAM 290 (RAM-truth only — the change map is static after 290, no
  blend pixel step, like CRUNCH's setalpha/blendoff). SE_M_VITAL_THROW (122)
  plays once at the lunge start, SE_M_VITAL_THROW2 (123) three times at the
  fist/hitsplat triplets (SE1). No palette/BG-map changes at all (no fadetobg).
- **Displayed-timing mapping (player-back; opponent-front identical on every
  frame; the change map wins):** **the elliptical lunge is TASK-driven and
  displays TWO frames after its RAM state (RAM 217 → pixels 219; the peak x2 18
  at RAM 220 → pixels 222, back-to-rest RAM 231 → pixels 233)** — the LICK/
  SLASH/TAKE_DOWN case. **The ShakeMon x2, by contrast, displays ONE frame after
  its RAM state (RAM flips at odd frames → change-map events at even frames
  270,272,…,290; the first clean region 269-290 shows the 5/0 toggle reaching
  pixels at 270) — NOT the +2 the lane's ShakeMon2 rounds measured.** **Both
  slides are SPRITE-driven and display RAM+1** (slide-back: RAM 264→pixels 265,
  268→269; slide-to-offset starts at pixels 233). First fist/hitsplat displayed
  239 (hitsplat1 RAM 238 +1), first fist 242 (RAM 241 +1). The two task-driven
  motions therefore do NOT share one lag number — the reducer/draw case must
  split them, exactly as the brief warned. The ONIX front-idle x2=1 rest (player
  frame 207-213) flips to 0 when the shake task's creation write lands and stays
  0 after the task restores it (the shake restore to 0 at RAM 289 displays at
  290, outside the moving window; the ONIX x2 does NOT return to 1).
- **Next:** promote COUNTER to exact. Build `src/animation/counter.ts` (RAM-truth
  reducer at the ages above: the 18/6/1/4 elliptical lunge as the phase
  16..240/step-16 one-cycle wave with the +2 latch, the slide-to-offset (20,0,4)
  + slide-to-original (20,0,5) via the shared `slideMon.ts` helpers, the three
  fist/hitsplat triplets at the target-relative anchors with the mirrored x, the
  ShakeMon 5/0 2-frame-toggle via `shakeMonSequence(5,0,25,1)`, the monbg/
  setalpha/blendoff machinery, no palette work) + Tier-1
  `tests/animation/counter.test.ts`; `SceneOnCounterConfig`/View seam in
  `sceneOnPresentation.ts`; the COUNTER draw case in `battleScene.ts` (fist art
  from `src/assets/gen/battle-anim-hands-and-feet.json`, hitsplat from
  `battle-anim-hitsplat.json`, HITMONTOP/ONIX via existing species art); a
  `counterPortable.ts` at full-window exact (88 frames × 2 axes, both first
  frames kept); the fixtures, the coverage entry and the inventory pin
  129->130 exact / 147->146 unsupported.
- **Notes — zero new components.** Every component is already exact elsewhere:
  `sprite:gFistFootSpriteTemplate`/`AnimBasicFistOrFoot` = FIRE_PUNCH/SHADOW_PUNCH
  (`shadowPunch.ts` fist painter); `sprite:gBasicHitSplatSpriteTemplate` =
  IRON_TAIL/TAKE_DOWN/BODY_SLAM; `sprite:gSlideMonToOffsetSpriteTemplate`/
  `gSlideMonToOriginalPosSpriteTemplate` = the shared `slideMon.ts` helpers
  (reuse, do not re-port); `task:AnimTask_ShakeMon` = IRON_TAIL/POISON_TAIL/
  MUD_SHOT (`shakeMon.ts`); `task:AnimTask_TranslateMonEllipticalRespectSide` =
  per-move-profiled (`faintAttack.ts`'s `faintAttackAttackerOffset` is the same
  task with speed 3 instead of 4 — the ellipseAngleStep/wavePeriod differ and
  must be re-derived, not inherited); monbg/setalpha/clearmonbg/blendoff =
  BODY_SLAM/FAINT_ATTACK. Assets ANIM_TAG_IMPACT (`battle-anim-hitsplat.json`)
  and ANIM_TAG_HANDS_AND_FEET (`battle-anim-hands-and-feet.json`) already
  extracted — no asset work at all. No boundary widening, no new
  unsupported-branch barrier, no shared-helper edit; the only engine contact
  will be the promotion round's draw case.
- **Notes — stretch items 4-5 landed early.** `src/animation/counter.ts`
  (RAM-truth reducer at the RAM ages above) + `tests/animation/counter.test.ts`
  (9 pins, incl. the shared-helper reuse pins asserting the slides equal
  `slideMonToOffsetAtTick(..., 0..3)` and the shake equals
  `shakeMonOffsetAtTick(5, 0, 25, 1, age - 33)` for every age 34..82) are
  committed and exhaustively verified against the probe: **0 mismatches across
  all 88 frames x 2 orientations** for attacker x2/y2, target x2, and fist/
  hitsplat counts. The `SceneOnCounterConfig`/View seam in
  `sceneOnPresentation.ts` follows `SceneOnCrunchConfig`/`sceneOnCrunchView`
  exactly, plus HITMONTOP added to the presentation species union (no draw case —
  that is the promotion round's job). The two measured correction points the
  Tier-1 pins lock in: the elliptical lunge's negated-width floor is
  `-sin(phase,18) = -7` at phase 16 (not -6 — C and JS `>>` both floor toward
  -inf), and the fist sprites' `WaitAnimForDuration` keeps the final data[0]=0
  frame one extra age (9-age lifetime, so the fists OVERLAP like the hitsplats).
  Remaining for promotion: the draw case in `battleScene.ts` (must split the
  display latch — two-age lunge, one-age shake, one-age slides), a
  `counterPortable.ts`, the fixtures, the coverage entry and the inventory pin
  129->130 exact / 147->146 unsupported.
- **Notes — the orientation-shift trap did NOT bite: measured, not inherited.**
  COUNTER came out at opponent-front = player-back **+0** on every frame (both
  windows 207..294, all RAM events and all change-map events frame-aligned),
  against CRUNCH/SLASH's +4 and LICK's −1. The two orientations' changed-pixel
  counts still differ on the moving frames because the target is ONIX's front
  sprite in one and its back sprite in the other (player-back ONIX front x2 rest
  1, opponent-front ONIX back rest 0). A brief that had carried LICK's −1 (or
  CRUNCH's +4) forward would have produced a wrong reducer.

## MOVE_LICK promoted to exact — 129/276, both orientations at 73/73 portable-exact (2026-08-08 worker, round B)

- **State:** coverage advanced **128→129/276 exact**, 0 partial, 0 staged,
  **148→147 unsupported**. LICK was staged last round and is now proven by an
  exact move in both orientations through the shared seam. `lickPortable.ts`
  exits 0 at **LICK component 73/73; framebuffer 73/73** (player-back, frames
  214-286) and **component 73/73; framebuffer 73/73** (opponent-front, frames
  213-285), fresh evidence hashes player `72c763d6…`/RGB `86239977…`,
  opponent `2c8a668d…`/RGB `65f7c595…`, reproduced twice fresh. The inventory
  pin moved **128→129 exact / 148→147 unsupported**.
- **Did:** the MOVE_LICK draw case in `battleScene.ts` — LICKITUNG back/front
  (reusing the SLAM art) and ONIX front/back, the 16x32 lick sprite from
  `src/assets/gen/battle-anim-lick.json` (its OWN embedded palette,
  ObjNormal, `gOamData_AffineOff_ObjNormal_16x32`, 5 frames of 8 tiles) drawn
  at `lick.x - 8` / `lick.y - 16` (center-anchored OAM, change-map bbox
  byte-exact), and the split display latch (below). Wrote
  `tools/compare/lickPortable.ts` (modelled on slashPortable.ts, probe move
  122) + the two fixtures, the evidence test
  (`tests/animation/lickEvidence.test.ts`), the coverage entry, and moved the
  inventory pin.
- **Measured (fresh, deterministic, twice-fresh hashes pinned):** the 16x32
  lick sprite displays ONE frame after its RAM state (creation RAM 235 →
  pixels 236, cmd transitions all at +1, `AnimLick_Step` invisible ramp
  blinks 246/248/249/…/285, gone 286), while the task-driven ShakeMon2 target
  x2 renders the shared sequence at display age − 22 — which lands its tick-0
  creation write (+1) on exactly one displayed frame: a real one-frame pixel
  step for the opponent-front ONIX back (idle x2=0, change-map 235 = RAM 234
  + 1) that coincides with the idle hold for the player-back ONIX front
  (x2=1, change-map first shake frame 237 = RAM 235 + 2). The target rests at
  its ONIX front-idle x2=1 through display age 21 and stays 0 after (the RAM
  restore at age 51 displays at 267 player / 266 opponent). **The orientations
  line up MINUS 1 (opponent-front = player-back − 1 on every frame), not +4 —
  a single age-indexed reducer serves both, only the battler geometry differs.**
- **Next:** the settled queue (MOVE_DRAGON_BREATH / MOVE_BIND) and the ranked
  remaining moves; LICK adds no new unproven components (the lick sprite =
  CUT-shape art with its own palette + ObjNormal 16x32, ShakeMon2 already
  exact via DRAGON_BREATH/SLASH, the target-anchored painter = SLASH).
- **Notes — the orientation trap did NOT bite this round, but the reason is
  probe-measured, not assumed.** The lick sprite's subpriority (38
  player-back / 28 opponent-front) sits IN FRONT of the ONIX front/back
  (40/30) in BOTH orientations, so it paints after the target every time; the
  two orientations' changed-pixel counts differ because the target is ONIX's
  front sprite in one and its back sprite in the other. **The creation-write
  question the SLASH round raised was answered from the pixels for LICK:**
  `AnimTask_ShakeMon2`'s tick-0 +1 creation write DOES reach exactly one
  displayed frame (the opponent-front 235 step), so the draw drives the shake
  from the shared `shakeMon2OffsetAtTick(1, 0, 16, 1, state.age - 22)` sequence
  directly, not the reducer's RAM truth. No boundary widening, no new
  unsupported-branch barrier, no shared-helper edit; the only engine contacts
  are the LICK draw case in `battleScene.ts` and the already-landed
  `sceneOnLickView` seam.
- **Notes — `npm test` (782 files / 7603 passed / 1 established skip),
  `npm run typecheck` and `npm run build` all green on the final tree.** The
  coverage entry was inserted with `json.dumps(indent=1)` serialization (one
  space per nesting level) — re-serialized the file rather than hand-indent an
  entry, so no whitespace drift.


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
