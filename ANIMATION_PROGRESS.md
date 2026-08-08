# Animation coverage

## MOVE_CRUSH_CLAW staged — both orientations isolated at 69 frames; scenarios + dense probe + change maps + reducer banked (2026-08-07 worker)

- **State:** CRUSH_CLAW stays **unsupported**. Coverage unchanged at **124/276
  exact, 0 partial, 0 staged, 152 unsupported**. Nothing promoted; no pin
  moved. This is the staging round; promotion to exact (both orientations, a
  portable at full-window exact) is the NEXT round's job.
- **Did:** staged two legal mechanicLab scenarios (GROVYLE `SPECIES_GROVYLE`
  278 — FRONTIER_MON_GROVYLE_2, set 293, all four active slots CRUSH_CLAW
  306, vs legal ONIX 95; player-back
  `mechanic-crush-claw-player-grovyle-opponent-onix.json` and opponent-front
  `mechanic-crush-claw-opponent-grovyle-player-onix.json`, both verified to
  run with move 306) and `tools/compare/crushClawProbe.py` — a dense probe
  copied from `ironTailProbe.py` with script-pointer isolation to
  `Move_CRUSH_CLAW` (`0x082ceaf7`)..`Move_AROMATHERAPY` (`0x082ceb66`)
  capturing every `gClawSlashSpriteTemplate` claw-slash sprite
  (`AnimClawSlash`, 5-frame anim) and `gHorizontalLungeSpriteTemplate` lunge
  sprite (`createsprite ... 6, 4`), the `AnimTask_ShakeMon2`/`_Step` target
  task, both battlers' sprites, BLDCNT/BLDALPHA/BLDY, all 512
  faded/unfaded/hardware palettes, software + hardware OAM and matrices,
  per-frame raw RGB + sha256. NOTE: this probe reads `animNum`/`animCmdIndex`
  at the TRUE sprite offsets `0x2a`/`0x2b` (the ironTail probe read garbage
  at `0x18`/`0x19` — those fields were never validated there, but CRUSH_CLAW's
  slash anim frame is real evidence). Probe run: `python3
  tools/run-mgba-probe.py <out.json> -- python3
  tools/compare/crushClawProbe.py <scenario.json> <out.json> <rgb-dir> 306`.
  Built `src/animation/crushClaw.ts` (RAM-truth reducer: lunge 6/4 at RAM
  ages 13-26, the two claw-slash pairs spawning at ages 19 and 33 animating
  5 frames each, `ShakeMon2 (2, 0, 18, 1)` target x2 toggling ±2 every two
  ages 19..53 then zero, `setalpha` at age 13 / `blendoff` at age 55, monbg
  ages 10-57, `SE_M_RAZOR_WIND` at ages 19 and 33) and Tier-1
  `tests/animation/crushClaw.test.ts` (6 pins). Plus the displayed-timing
  change maps banked under `tools/compare/evidence/crush-claw-changemap-*.txt`.
- **Measured (fresh runs, both orientations, deterministic and identical):
  move-owned window 69 frames each — player-back frames 77..145,
  opponent-front 81..149** (script first in-bounds .. first inactive cleanup
  at 145/149). Both first frames are CLEAN — no outgoing-teardown
  contamination (software OAM byte-identical to the following frame, hardware
  OAM slots 11+ off-screen y=160, no shadow sprite). Lunge helper created at
  RAM 90/94, attacker x2 ramps 4,8,..,24 over ages 13-18, holds 24 at 19-20,
  returns to 0 over 21-26 (displayed one frame later). Slash pair 1 (x=-10,
  animation 0, subpriority 38 player / 28 opponent) spawns age 19, animates
  cmdIndex 0..4 (4 ticks each) to age 39, destroyed 40; pair 2 (x=+10,
  animation 1) spawns age 33, animates to age 53, destroyed 54. Shake task
  created age 18 (initializer), first toggle write age 19, toggles every 2
  ages to 53, zero write at 53. `blendoff` RAM 132/136 (age 55).
- **Displayed-timing mapping (player-back; opponent-front is identical minus
  4 on every frame):** every visible event displays exactly ONE frame after
  its RAM cause. lunge out displayed 91-96, hold 97-98, back 99-104; claw
  slashes pair 1 displayed 97..117, pair 2 displayed 111..131; shake toggles
  displayed 97,99,101,...,129 then 131 returns to 0; `setalpha`/`blendoff`
  are RAM-truth only — neither changes a pixel in this window (change map has
  no blend step; the wide 2418px-class diffs are slash+shake). See the two
  change-map files for the per-frame pixel receipts.
- **Next:** promote CRUSH_CLAW to exact. Copy `ironTailPortable.ts` -> a
  `crushClawPortable.ts` comparing the reducer against this probe's RAM on
  both orientations at 135-style full-window exact (69 frames x 2 axes);
  `SceneOnCrushClawConfig`/`SceneOnCrushClawView` seam in
  `sceneOnPresentation.ts`, the CRUSH_CLAW draw case in `battleScene.ts` (use
  the existing claw-slash art already wired for DRAGON_CLAW/METAL_CLAW), the
  fixtures (`crush-claw-player-grovyle-opponent-onix.json` /
  `crush-claw-opponent-grovyle-player-onix.json`), the coverage entry and the
  inventory pin 124->125 exact / 152->151 unsupported. All ten CRUSH_CLAW
  components are already proven by exact moves (ZERO new source components —
  claw slash = metalClaw/dragonClaw, lunge = ironTail/dragonClaw, ShakeMon2 =
  many, SE = dragonClaw).
- **Notes — two small findings.** (1) The claw-slash `animNum`/`animCmdIndex`
  live at sprite offsets 0x2a/0x2b, NOT 0x18/0x19 as ironTailProbe reads;
  CRUSH_CLAW's probe reads the true offsets. (2) `setalpha 12, 8` +
  `blendoff` write BLDCNT/BLDALPHA but never change pixels in this move's
  window (no blend step in the change map) — model them as RAM truth, not
  visuals, exactly like the invisible third sweep in IRON_TAIL.

## MOVE_IRON_TAIL promoted to exact — 124/276, the permanent=TRUE metallic-shine case closed in one round (2026-08-07 worker)

- **State:** coverage advanced **123→124/276 exact**, 0 partial, 0 staged, 152
  unsupported. IRON_TAIL was the sole remaining case where the metallic-shine
  grayscale outlives the shine task (`permanent=TRUE`), and it is now proven
  by an exact move — the difference the steelWing/metalClaw draw cases were
  holding open.
- **Did:** landed `src/animation/ironTail.ts` (RAM-truth reducer: permanent
  grayscale until `set_original_pal` at RAM age 126, the two visible band
  sweeps gated on `data10 >= 28`, the sweep-3 3-frame data10 hold modeled for
  RAM fidelity but never drawn, the horizontal lunge 4/4 at RAM ages 107-116,
  the hitsplat anim 2 at RAM ages 115-124, the ShakeMon 3/0/6/1 target x2),
  the `SceneOnIronTailConfig`/`SceneOnIronTailView` seam, the `battleScene.ts`
  IRON_TAIL draw case, `tools/compare/ironTailPortable.ts`, both fixtures
  (`iron-tail-player-azumarill-opponent-onix.json` / `iron-tail-opponent-azumarill-player-onix.json`,
  dense 135-frame windows 216-350 / 215-349), Tier-1 `ironTail.test.ts` (9),
  `ironTailEvidence.test.ts` (3), the ANIMATION_COVERAGE.json entry and the
  inventory pin 123→124 exact / 153→152 unsupported. `npx vitest run
  tests/animation` 310 files / 1735 passed / 1 skip; `npm run build` green.
- **Measured (both portables, fresh runs, exit 0):** component 135/135 and
  framebuffer 135/135 on player-back and opponent-front. Player evidence
  d443cdb3… / raw RGB 952808fa…; opponent evidence 7bebcfb3… / raw RGB
  bea1745a… — matching the fixture pins twice fresh. Coverage `npm run
  animation:coverage` now reads 124/276 exact.
- **Next:** pick the next move from the component-leverage ranking; all ten
  IRON_TAIL components were already proven by exact moves (ZERO new source
  components), so the component-provenance trick is closed for this track.
- **Notes — two reusable findings.** (1) The target's idle→shake switch is a
  draw-gate off-by-one class: the front-idle x2 (ONIX 1px) must hold through
  displayed age 115 and the shake-display (0,0,3,3,0,0,3,3,0,0) starts at
  age 116 — a `<=117` gate drew the shake x2 one frame late and cost exactly
  the two shake-displacement frames (1091px each). (2) The hitsplat anchors
  on the target's Y_PIC_OFFSET, so the opponent-front (back-sprite) target
  needs +8 y (probe: hitsplat at (72,88) vs ONIX-back sprite (72,80)); the
  player-back front target anchors at (176,42). The shake itself also drops
  the front-idle x2 1px to 0 on its first two writes (displayed 116-117),
  which is why the wide 2418px frame-332 diff spans both boxes.

## IRON_TAIL staging correction — the banked "displayed" frames were RAM frames; every visible event lags one frame (2026-08-07 night supervisor)

- **State:** coverage unchanged at **123/276 exact, 0 partial, 0 staged, 153
  unsupported**. Round 1 of this session was a cap-kill with zero commits (45 min,
  94 bash / 31 read calls, no file written) — the worker spent its whole cap
  re-deriving display timing the staged entry had stated as if it were displayed
  truth. Nothing was lost: its finding is confirmed and banked below.
- **Supervisor-measured (my own run, not the worker's claim):** I diffed every
  consecutive raw framebuffer in both probe windows. The window itself is right —
  player-back 216..350, opponent-front 215..349, 135 frames each — but **the
  "displayed" frame numbers in the staged entry below are RAM frames. Every
  visible event displays exactly ONE frame after the RAM state that causes it.**
  The whole 135-frame window is static except at these frames (player-back;
  subtract 1 for opponent-front, which is identical in every other respect):
  - **223** — attacker grayscale ON, 1519px over the attacker box (41,64-101,111).
    RAM initializer is 220-221 with the step from 222, so the grayscale palette
    write displays at 223.
  - **229-253** — metallic-shine sweep 1, band marching down-right across the
    attacker (bbox walks 54,67-59,73 → 102,111-102,111, 12px growing to 384px
    then shrinking to 1px). **254-260 static.**
  - **261-285** — sweep 2, byte-identical pattern at exactly +32 frames.
  - **286-323 static** — the third sweep (d11==2) is INVISIBLE: `ClearBattleAnimBg`
    has already run, so the RAM `data10` 3-frame hold at 285-287 never reaches
    pixels. Do not model it as a visual.
  - **324-327** — lunge out, 1196px/frame, bbox marching right 41→118 (RAM ramp
    323-326). **328-329 static** (RAM x2 holds 16 at 327-328).
  - **330-333** — lunge back (RAM 329-332).
  - **332** — hitsplat appears (RAM spawn 331); the 331→332 diff is the wide
    2418px one spanning both boxes.
  - **334, 336, 338, 340** — target shake, 1769px each over the target box
    (149,12-206,71). RAM x2 toggles at 333/335/337/339.
  - **342** — hitsplat gone (RAM last frame 340), 268px at 165,31-187,53.
  - **343** — attacker grayscale OFF, 1519px, the exact inverse of 223. RAM
    `set_original_pal` is 342. **So displayed grayscale = frames 223..342.**
- **Next:** re-brief IRON_TAIL with the corrected timing and a write-first
  structure (reducer committed before any measurement is allowed). The change
  maps for both orientations are the specification; no further probing is needed
  to build the reducer.
- **Notes — brief-authoring lesson.** A staged entry that prints RAM frames under
  a heading like "displayed" invites exactly this failure: the worker could not
  reconcile the numbers with the pixels, and correctly refused to write code it
  believed was wrong. **State the lag explicitly in the staging entry, or label
  the column RAM.** This is the same one-frame display-lag family already recorded
  for OAM edits and palette writes — it applies to move sprites, attacker/target
  `x2` translation and palette writes alike, all at one frame.

## Supervisor wind-down — FACADE, MINIMIZE, TORMENT and DETECT all exact, 119→123; IRON_TAIL staged (2026-08-07 evening animation session)

- **State:** coverage advanced **119→123/276 exact**, 0 partial, 0 staged, 153
  unsupported. `animation-main` is committed and green at `57fb83dd` with no
  animation worker worktrees or branches left behind. 9 worker launches, 8
  productive, 2 cap-kills both salvaged with zero work lost.
- **Did:** promoted **MOVE_FACADE** (81/81 both orientations), **MOVE_MINIMIZE**
  (153/153 both), **MOVE_TORMENT** (177/177 both, nothing to fix — one round
  from nothing to exact) and **MOVE_DETECT** (110/110 player-back, 109/109
  opponent-front). Staged **MOVE_IRON_TAIL** (both scenarios, dense probe,
  135-frame windows measured at player 216-350 / opponent 215-349). Added
  `tools/animation/rank-remaining.py`. See the entries below.
- **Verified:** every promotion re-run by the supervisor rather than accepted on
  report, each time with the earlier moves' portables as controls. Integrated
  `npm test` **768 files / 7271 passed / 1 established skip** and `npm run build`
  green at `69e03440`; the only commit after it is the additive IRON_TAIL
  staging (four new files, zero deletions), re-checked with `npm run build` plus
  `npx vitest run tests/animation` **308 files / 1723 passed**. The supervisor
  also re-ran `ironTailProbe.py` independently and reproduced its 135-frame
  player window exactly.
- **Next:** close **MOVE_IRON_TAIL** from its staged base — it should be a
  single round. All ten of its components are already proven by exact moves, and
  the one open question (`metallic_shine permanent=TRUE`) is answered in the
  staged entry below. After that, the remaining **zero-new-component** moves by
  script size: CRUSH_CLAW 20, TAKE_DOWN 22, CRUNCH 27, COUNTER 31, DOUBLE_EDGE
  32 (already staged), CRABHAMMER 36.
- **Notes — size a move by component PROVENANCE, not by the coverage report's
  rank.** Map every component to the exact move that proves it (parse
  `ANIMATION_COVERAGE.json` against
  `src/data/gen/battle-animation-components.json`), then read
  `python3 tools/animation/rank-remaining.py` as a shortlist. TORMENT is 12
  script lines yet closed in ONE round because every component except one task
  was already proven; FACADE (6 lines) and MINIMIZE (7 lines) each needed two
  rounds plus a supervisor fix. The moves that look cheapest by line count are
  the expensive ones: **SUBSTITUTE** is 4 lines but needs the substitute-doll
  sheets, which are NOT in `src/animation/assets/`; **HAZE** needs a scrolling
  fog BG; **ACID_ARMOR** pulls in the scanline-effect subsystem; **FAKE_OUT**
  the window registers; **DOUBLE_KICK** places its sprite with four `Random2()`
  draws. Prefer a move whose only new component is a task or a sprite template
  whose asset is already extracted.
- **Notes — two render lags can meet on ONE sprite (new class).** MINIMIZE's
  clones are painted two displays behind their creation but removed one display
  behind their destruction: a freshly allocated OAM matrix needs two displays to
  reach the hardware, while removal is a plain OAM edit. Clone 0 lives RAM
  frames 211-226 yet the oracle shows it only on 213-227 — 15 displayed frames
  for a 16-frame RAM life. Either single lag fails in a measurable direction
  (`age-2` over-draws the expiry frames 228/231/234 by 764px/293px/354px;
  `age-1` draws the spawn frames 212/215/218 too early by 1398px/420px/246px).
  The rule now lives in `minimizeDisplayedClonesAtAge`
  (`src/animation/minimize.ts`) and the TORMENT worker reused it for its thought
  bubbles unprompted. **Diagnostic:** errors only at spawn frames = paint lag too
  short; only at expiry frames = paint lag too long; at both ends under either
  single lag = this class.
- **Notes — outgoing-teardown contamination at a window's OPENING frame (new
  class).** DETECT's opponent-front window failed only on its first frame, which
  carried an extra 32x8 object (hardware OAM slot 11, attr0 `0x4041` / attr1
  `0x40a0` / attr2 `0x5d2d` at (160,65)) that was gone by the next frame. It is
  not a DETECT sprite: it is the enemy mon's shadow
  (`gSpriteTemplate_EnemyShadow` / `SpriteCB_EnemyShadow`) tearing down one
  display behind the script-pointer boundary. Resolved by starting that window
  at 69 for a truthful **109/109**, using new `skipProbeFrames` / `ageOffset`
  fixture fields so the probe drops the frame and the reducer's ages stay
  calibrated — not by excluding a frame from a 110-frame window. The player-back
  window keeps all 110 frames; the asymmetry and its reason are in the coverage
  entry. IRON_TAIL's staging checked for this explicitly and found both first
  frames clean.
- **Notes — the fixture lies about a third of the time.** Two of five fixture
  pairs this session claimed `acceptance.status: "exact"` on a portable that
  actually exited 1 (FACADE opponent was really 72/81). Both were caught only by
  running the portable. Conversely, workers that stopped honestly at `partial`
  with real counts (MINIMIZE 144/153, DETECT 109/110) were right to, and their
  precisely-located residuals are what made the supervisor fixes quick.
- **Notes — launcher mechanics.** `tools/run-subagent.sh` must be started
  detached (`nohup ... & disown` from a foreground shell, PPID 1 confirmed with
  `ps -eo pid,ppid,command`). A launcher held by a tracked background job is
  killed at ~600 s; that nearly cost a 45-minute worker its whole round today.
  `setsid` does not exist on macOS. The lane lock is a pid file that
  auto-takes-over a dead pid, so a relaunch is safe after
  `git worktree remove --force` + `git branch -D`.
- **For the main program:** nothing blocking. No boundary widening, no new
  unsupported barriers, no controller or battle-state ownership taken, no
  animation deferrals opened (`ANIMATION_DEFERRED.md` remains empty). Engine
  contact stayed inside `src/engine/battleScene.ts` animation draw cases.
  `tests/animation/factoryAnimationInventory.test.ts` now pins **123 exact / 153
  unsupported** — that pin moves on every promotion, so a fold that resolves
  `ANIMATION_COVERAGE.json` must re-run it.

## MOVE_IRON_TAIL staged — both orientations isolated at 135 frames; scenarios + dense probe + measured window banked (2026-08-07 worker)

- **State:** IRON_TAIL stays **unsupported**. Coverage unchanged at **123/276
  exact, 0 partial, 0 staged, 153 unsupported**. Nothing promoted; no pin moved.
- **Did:** staged two legal mechanicLab scenarios (FRONTIER_MON_AZUMARILL_2
  set 297, AZUMARILL, all four active slots IRON_TAIL 231, vs legal ONIX;
  player-back `mechanic-iron-tail-player-azumarill-opponent-onix.json` and
  opponent-front `mechanic-iron-tail-opponent-azumarill-player-onix.json`) and
  `tools/compare/ironTailProbe.py` — a dense probe copied from `detectProbe.py`
  with script-pointer isolation to `Move_IRON_TAIL` (`082d342c`)..`Move_POISON_TAIL`
  (`082d348a`) capturing the `AnimTask_MetallicShine`/`_Step` lifecycle with all
  16 data words, `Task_LoopAndPlaySE`, `AnimTask_ShakeMon`/`_Step`, every
  `gHorizontalLungeSpriteTemplate` and `gBasicHitSplatSpriteTemplate` sprite
  (slot, template, callback, x/y/x2/y2, subpriority, attr0/1/2, animNum,
  animCmdIndex, matrix + hardware matrix, data[0..7]), both battlers' own
  sprites, BLDCNT/BLDALPHA/BLDY, all 512 faded/unfaded/hardware palettes,
  software + hardware OAM, hardware matrices, per-frame raw RGB + sha256.
  Probe run: `python3 tools/run-mgba-probe.py <out.json> -- python3
  tools/compare/ironTailProbe.py <scenario.json> <out.json> <rgb-dir> 231`.
- **Measured (fresh runs, both orientations, deterministic and identical):**
  move-owned window **135 frames each — player-back frames 216..350,
  opponent-front 215..349** (script first in-bounds .. first inactive cleanup
  at 350/349). Both first frames are CLEAN — no outgoing-teardown
  contamination (software OAM byte-identical to the following frame, hardware
  OAM slot 11+ all off-screen y=160, no shadow sprite), unlike DETECT.
  **Metallic shine** (the main unknown): task slot 1, initializer
  `AnimTask_MetallicShine` frames 220-221 (player) / 219-220 (opp), step
  `AnimTask_MetallicShine_Step` from 222/221; **`data[1] = 1` = the
  `permanent=TRUE` flag** — the palette restore is SKIPPED at `data[11]==2`,
  so the attacker's OBJ palette is grayscaled (bank0 256-271 player / bank1
  272-287 opp, `SetGrayscaleOrOriginalPalette(FALSE)` at initializer) and
  STAYS gray through the lunge/hitsplat/shake, restored only by the script's
  trailing `set_original_pal` (player f342 / opp f341). STEEL_WING and
  METAL_CLAW pass `permanent=FALSE` and restore in-task at the d11==2 sweep
  boundary; IRON_TAIL is the differing case. Sweep: `data[10]` 4..124 by +4,
  wraps 128 -> 0 at `data[11]` 0->1 (f253/252) then 1->2 (f285/284), third
  sweep at d11==2 through f318/317, task destroyed f319/318, and the shine's
  BLDCNT/BLDALPHA teardown lands f320/319 (`blendoff` regs 0). BLDCNT 0x3f42 /
  BLDALPHA 0xc08 (EVA 8, EVB 12) held frames 220-318 player / 219-317 opp.
  **Lunge** (`gHorizontalLungeSpriteTemplate`, invisible dummy-OAM mover that
  translates the attacker via `TranslateSpriteLinearById`): slot 3, spawn
  **f323 player / f322 opp**, x/y at attacker's base (176,42 / 72,88),
  subpriority attacker-2 (28 / 38), duration 4, dx +4 (player) / -4 (opp,
  `DoHorizontalLunge` negates for non-player side), reverse via
  `ReverseHorizontalLungeDirection` at data[0]==0; attacker x2 ramp +4..+16
  (f323-326), hold 16 (f327-328), -12..0 (f329-332), opp mirrored -4..-16.
  **Hitsplat** (`gBasicHitSplatSpriteTemplate`, `AnimHitSplatBasic`,
  animation=2 = `sAffineAnim_HitSplat_2` FRAME(0xB0,0xB0,0,0) then
  FRAME(0,0,0,8)): slot 4, spawn **f331 player / f330 opp**, x/y at target
  base, subpriority target-2 (38 / 28), affine matrix a/d 0x174 held the whole
  10-frame life, `RunStoredCallbackWhenAffineAnimEnds` -> DestroyAnimSprite.
  **ShakeMon** (target, args 3,0,6,1): slot 0, spawn f331 player / f330 opp,
  data[0]=target spriteId (8 / 6), data[4]=3 (x), data[5]=0 (y), data[1] 6..1
  countdown, toggles target x2 3<->0 every frame pair; displayed target x2
  3,3,0,0,3,3,0,0 f333-340 player / f332-339 opp; task destroyed f341/340.
  **loopsewithpan** `Task_LoopAndPlaySE` SE_M_HARDEN (song 120): slot 0, pan
  -64 player / +63 opp, 28 iterations f220-249 player / f219-248 opp.
  `Task_UpdateMonBg` (monbg target) present f320-348 player / f319-347 opp;
  BLDCNT 0x3f40 / BLDALPHA 0x80c (setalpha 12,8) f323-341 player / f322-340
  opp; clearmonbg+blendoff f342/341; BLDY 0 throughout.
- **Next:** (d) `src/animation/ironTail.ts` reducer + `SceneOnIronTailConfig`/
  View seam + `battleScene.ts` draw case — the metallic-shine reducer
  (`metallicShineAtAge`) already takes the `permanent` flag (see
  `src/animation/metallicShine.ts:59` — `attackerGrayscale: age <
  METALLIC_SHINE_CLEAR_AGE || permanent`), so the permanent=TRUE case is
  exactly the `permanent` param and the trailing `set_original_pal` restore
  is the one new draw-case decision; reuse `horizontalLunge.ts`, the hitsplat
  painter, `shakeMonInPlace.ts`/`AnimTask_ShakeMon` reducer, and the proven
  metallic-shine consumer (steelWing/metalClaw draw cases). Then (e) portable
  + fixtures, (f) Tier-1 + evidence tests + coverage entry + inventory pin
  123->124 exact / 153->152 unsupported.
- **Notes:** AZUMARILL back/front `y_offset` 12; attacker sprite paletteNum 0
  (bank 0 player-back / bank 1 opponent-front). `permanent=TRUE` is the ONLY
  metallic-shine distinction from STEEL_WING/METAL_CLAW (which pass FALSE and
  restore in-task) and IRON_DEFENSE/HARDEN (which call `metallic_shine`
  without a permanent arg — default FALSE) — the measured grayscale-until-
  set_original_pal behavior confirms the `permanent` branch is the operative
  one here. All ten components are proven by exact moves; no new source
  components expected.

## MOVE_DETECT promoted to exact — 123/276 exact (2026-08-07 worker)

- **State:** DETECT is **exact** — player-back 110/110 and opponent-front
  109/109 on both axes. Coverage now **123/276 exact, 0 partial, 0 staged,
  153 unsupported**.
- **Did:** resolved the opponent boundary frame and promoted. The window's
  first in-bounds frame (68) was NOT a DETECT component — it was the outgoing
  animation's OAM teardown one display behind the script-pointer boundary:
  reading gSprites at the software OAM index behind hardware slot 11 found
  `gSpriteTemplate_EnemyShadow` / `SpriteCB_EnemyShadow` (the enemy mon's
  shadow, 32x8 at (160,65), palette bank 5, priority 1), which stays in
  hardware OAM because its invisible flag (set when gAnimScriptActive turns
  true) reaches hardware one display after the pointer enters Move_DETECT;
  absent frame 69+ and never returns. The engine does not model shadows, so
  option B: the opponent fixture's denseWindow re-pins to **69-177 (109
  frames)** via a probe `skip-first-frames` arg (backward compatible — player
  evidence hash unchanged) plus a portable `ageOffset` that keeps the
  reducer's ramp boundaries calibrated to the move's first in-bounds frame.
  Added the sparkle's absolute subpriority (attacker-13: 17 player / 27
  opponent) to the reducer with a Tier-1 pin. Tier-1 detect tests (10) +
  evidence receipts updated; coverage entry promoted (with the boundary
  reason) and inventory pin 122→123 exact / partial 1→0.
- **Measured (both portables, fresh runs, exit 0):** player-back 110/110
  component and framebuffer (64-173); opponent-front 109/109 component and
  framebuffer (69-177). Player evidence 2a1054d2… / raw RGB 274b00b5… —
  unchanged from staging; opponent evidence f8e7f48c… / raw RGB
  2086c05a… — matching the fixture pins twice fresh.
- **Next:** pick the next move from the component-leverage ranking
  (gSpinningSparkleSpriteTemplate now has 1 exact representative left;
  gDirtPlumeSpriteTemplate/gFistFootRandomPosSpriteTemplate at 2).
- **Notes — FIFTH display-lag finding, reusable for every future move:** the
  outgoing animation's OAM teardown lands ONE display behind the
  script-pointer boundary, so a window whose opening frame coincides with the
  animation start can catch the previous animation's sprite (here the enemy
  shadow — the player side shows no such frame only because its pre-move
  field had nothing left over). The software OAM buffer is one frame AHEAD of
  hardware OAM at that boundary (frame 68: software slot 11 already new,
  hardware still old). This is field state, not a move component — when a
  window's first frame shows it, re-pin the window to the first display the
  move owns and write the reason down, never draw a DETECT-specific hack for
  it. Probe gotchas: the enemy shadow template is `gSpriteTemplate_EnemyShadow`
  (data, `& ~1`), callback `SpriteCB_EnemyShadow` (thumb); a sprite's inline
  OAM attr0/1/2 matches the buffer slot, but the affine u32 differs (0 vs the
  buffer's matrix param), so match on the first 6 bytes.

## MOVE_DETECT staged + reducer/seam/draw + evidence — player-back exact, opponent-front partial (2026-08-07 worker)

- **State:** DETECT is **partial** — player-back **exact** (110/110 both axes),
  opponent-front 109/110 framebuffer / 110/110 component. Coverage now
  **122/276 exact, 1 partial, 0 staged, 153 unsupported**.
- **Did:** staged two legal mechanicLab scenarios (FRONTIER_MON_YANMA set 161,
  all four slots DETECT 197, vs legal ONIX; player-back + opponent-front) and
  `tools/compare/detectProbe.py` (copied from tormentProbe.py, script-pointer
  isolated to `Move_DETECT` `082cb3d2`..`Move_FRUSTRATION` `082cb430`).
  **Measured window (both orientations, 110 frames — player-back 64-173,
  opponent-front 68-177):** F_PAL_BG toward-black displayed ramp 0 (a0-7), 2
  (8-11), 4 (12-15), 6 (16-19), 8 (20-23), 9 (24-83), 7 (84-87), 5 (88-91), 3
  (92-95), 1 (96-99), 0 (100+); F_PAL_ATTACKER toward-white displayed ramp 0
  (0-33), 1 (34-35), 2..9 (36-50), 9 (50-84), 8..1 (85-108), 0 (109+); the
  sparkle (the move's ONE new component, gSpinningSparkleSpriteTemplate +
  AnimSpinningSparkle — placed ONCE at attacker picture + (±20,-20), never
  moves) spawns software age 51 / displayed ages 52-67 running the 3-tick
  sAnim_SpinningSparkle FRAME 0/16/32/48/64 program; absolute subpriority
  attacker-13 (17 player-back / 27 opponent-front) → painter order FLIPS with
  orientation; the sparkle-4 tiles/palette reuse the proven REFLECT asset and
  both blends reuse proven paths. Built `src/animation/detect.ts` (displayed
  schedules + software visual-task count), the `SceneOnDetectConfig`/View seam,
  and the battleScene DETECT draw case. `tools/compare/detectPortable.ts` +
  both fixtures (`scene-on-portable-evidence/v1`, 110-frame dense windows,
  hashes twice-fresh). Tier-1 `tests/animation/detect.test.ts` (9 reducer
  tests) + `detectEvidence.test.ts`, the ANIMATION_COVERAGE.json entry
  (MOVE_DETECT only, between DYNAMIC_PUNCH and EARTHQUAKE) and the inventory
  summary pin 154→153 unsupported / 0→1 partial.
- **Measured (fresh portable runs, exit 0):** player-back component 110/110 and
  framebuffer 110/110; opponent-front component 110/110, framebuffer 109/110.
  Player evidence 2a1054d2… / raw RGB 274b00b5…; opponent evidence 047cfd8c… /
  raw RGB ae9c9c50… — matching the fixture pins twice fresh.
- **Blocking note (why opponent-front is partial):** the window's first
  opponent-front frame (68) carries a ONE-FRAME hardware VRAM tile-base
  reallocation artifact from the script's `loadspritegfx` — every hardware OAM
  tile number shifts by 0x400, one battler sprite briefly holds its
  rotation flag, and the field/YANMA show stale tile pixels (a solid 200px
  block at (160-191,65-72)) that the shared sprite-tile seam does not model.
  It is not a reducer error (component 110/110) — reproducing it needs the
  shared seam to model the loadspritegfx VRAM transfer latch.
- **Next:** promote MOVE_DETECT to exact by reproducing the frame-68 VRAM
  transfer latch (then inventory 122→123 exact / partial 1→0); otherwise pick
  the next move from the component-leverage ranking.
- **Notes — component provenance:** asset:ANIM_TAG_SPARKLE_4 proven by
  MOVE_REFLECT; task:AnimTask_BlendBattleAnimPal proven by SELF_DESTRUCT /
  dragonBreath; visualCommand:simple_palette_blend proven by GRASS_WHISTLE /
  TAIL_GLOW; sprite:gSpinningSparkleSpriteTemplate NEW. Probe gotcha: the blend
  transition frames show PARTIAL palette reads (26/22 channel split) — decode
  with the max-y read, not most-common, or you under-read the real coeff.

## MOVE_TORMENT promoted to exact — 122/276 exact (2026-08-07 worker)

- **State:** TORMENT is **exact** — 177/177 on both axes in both orientations.
  Coverage now **122/276 exact, 0 partial, 0 staged, 154 unsupported**.
- **Did:** `src/animation/torment.ts` reducer (source-shaped
  `AnimTask_TormentAttacker`/`TormentAttacker_Step`: six thought bubbles at
  move-relative ages 7/32/57/72/87/102, absolute subpriorities 6..1,
  alternating hFlip, X_2±32/26/20 and Y_PIC−20/20/26/26/32/32; the 12-tick
  sAffineAnims_Torment wobble restarting per bubble with y2 var 48 back / 42
  front; BlendMonInAndOut RGB_RED coeff 1..10..1 ages 136-154; two anger marks
  at 136/158 via the proven `swaggerAngerMarkAtAge`), the
  `SceneOnTormentConfig`/`SceneOnTormentView` seam, and the battleScene TORMENT
  draw case with per-orientation painter order. `tools/compare/tormentPortable.ts`
  + both `tools/compare/fixtures/torment-*.json` (`scene-on-portable-evidence/v1`,
  dense 177-frame windows 68-244 / 72-248, hashes twice-fresh). Added Tier-1
  `tests/animation/torment.test.ts` (10 reducer tests) + `tormentEvidence.test.ts`
  (dense receipt + twice-fresh hash pins), the ANIMATION_COVERAGE.json entry
  (MOVE_TORMENT only, inserted between TOXIC and TWINEEDLE), and the inventory
  summary pin 121→122 exact / 155→154 unsupported. `npm run animation:coverage`
  now reads 122/276 exact. npx vitest on the four touched files green.
- **Measured (both portables, fresh runs, exit 0):** component 177/177 and
  framebuffer 177/177 on player-back and opponent-front, 177-frame windows
  (player-back 68-244, opponent-front 72-248). Player evidence
  7d0bb71d… / raw RGB 805da7f5…; opponent evidence 0116cb14… / raw RGB
  82f08073… — matching the fixture pins twice fresh.
- **Next:** pick the next move from the component-leverage ranking; TORMENT's
  new `AnimTask_TormentAttacker` task is proven by an exact move and the
  absolute-subpriority orientation trap is documented for the anger-tag track.
- **Notes — THIRD and FOURTH display-lag findings (this lane):**
  1. The six TORMENT bubbles carry EXPLICIT ABSOLUTE subpriorities 6..1, so
     the back-to-front painter order FLIPS with orientation (player-back ONIX
     40 → anger 38 → MURKROW 30 → bubbles 6..1; opponent-front MURKROW 40 →
     ONIX 30 → anger 28 → bubbles 6..1). Drawing one order for both sides was
     the trap.
  2. The bubbles reuse the MINIMIZE dual-lag class but the marks/blend DON'T:
     task-created bubbles paint at age−2 and remove at age−1 (the intersection),
     while script-`createsprite` anger marks and the BlendPalette ramp are ONE
     display behind and the wobble affine matrix is TWO behind. The anim
     restart (state 4) reaches the display later than the software state-4
     frame AND plays REVERSED: `StartSpriteAnim(sprite, 2)` is anim index 2 =
     `gMetronomeThroughtBubbleAnimCmds3`, the 48,32,16,0 program — measured
     display start at age 127 showing frames 2,1,0. Displayed bubble flip is
     always `animHFlip(TRUE) XOR field`. Probe gotchas (both bitten twice):
     template symbols need `& ~1`, hFlip lives at sprite offset `0x3f`.

## MOVE_TORMENT staged — both orientations isolated at 177 frames; scenarios + dense probe + measured window banked (2026-08-07 worker)

- **State:** TORMENT stays **unsupported**. Coverage unchanged at **121/276
  exact, 0 partial, 0 staged, 155 unsupported**. Nothing promoted; no pin moved.
- **Did:** staged two legal mechanicLab scenarios (MURKROW_1 set 184 lead vs
  legal ONIX, all four active move slots TORMENT so the Factory AI has a single
  legal choice; player-back `mechanic-torment-player-murkrow-opponent-onix.json`
  and opponent-front `mechanic-torment-opponent-murkrow-player-onix.json`) and
  `tools/compare/tormentProbe.py` — a dense probe copied from `minimizeProbe.py`
  with script-pointer isolation to `Move_TORMENT` (`082cdcae`..`Move_MEMENTO`
  `082cdcf2`) capturing the `AnimTask_TormentAttacker`/`TormentAttacker_Step`
  lifecycle with all 16 data words, EVERY `gThoughtBubbleSpriteTemplate` and
  `gAngerMarkSpriteTemplate` sprite (slot, template, callback, x/y/x2/y2,
  subpriority, attr0/1/2, matrixNum, hFlip at `0x3f`, matrix a/b/c/d, data[0..7]),
  the `AnimTask_BlendMonInAndOut` palette-blend task, the attacker's own matrix +
  y2 + attrs, BLDCNT/BLDALPHA/BLDY, full palettes, hardware OAM/matrices, and
  per-frame raw RGB + sha256. Probe run command recorded in the step brief.
- **Measured (fresh runs, both orientations, deterministic and identical):**
  move-owned window **177 frames each — player-back frames 68..244, opponent-front
  72..248** (script first in-bounds .. first inactive cleanup). Task slot 0:
  first step-visible frame is the FIRST bubble's creation (data[1] already 1 —
  the createvisualtask setup and state-0 step run in consecutive task updates).
  Player-back data[2]=72 (X_2), data[3]=97 (Y_PIC_OFFSET = sprite y 89 + 8);
  opponent-front data[2]=176, data[3]=51 (sprite y, no +8 on opponent side).
  **Six thought bubbles** with ABSOLUTE subpriorities 6..1 (6-data[1]) and
  alternating hFlip (data[1]&1), spawn frames player-back **75/100/125/140/155/170**
  (opponent-front +4: 79/104/129/144/159/174), positions player-back x =
  104,40,98,46,92,52 (72±32/26/20), y = 77,77,71,71,65,65 (97−20/26/32);
  opponent-front x = 208,144,202,150,196,156 (176±…), y = 31,31,25,25,19,19. A
  bubble NEVER moves once placed (callback replaced by SpriteCallbackDummy).
  **Attacker wobble** (sAffineAnims_Torment, 3 frames × 4 ticks) restarts with
  every bubble: software matrix a/d series 244/264,232/272,220/280,208/288,
  228/268,248/248,268/228,288/208,280/220,272/232,264/244,256/256 over 12 ticks
  starting the frame after each bubble, y2 via SetBattlerSpriteYOffsetFromYScale
  (var 48 back / 40 front MURKROW). Cadence: bubbles 0→1 gap 25 (12 affine +
  10 data[6] wait), 1→2 gap 25, then 15 (12 affine + 0 wait); after the 6th
  bubble data[6]=8 wait (state 3), state 4 at player-back f=192 sets every
  bubble's callback + StartSpriteAnim(anim 2, forward 4×2-tick), state 5
  countdown, all six destroyed at f=203 (task destroyed same frame). Second
  half (TARGET): `AnimTask_BlendMonInAndOut` RGB_RED (d1=31, d3=10, d5=1, d7=1,
  d0=273 = OBJ_PLTT_ID(target)+1) player-back f=204..222, d2 ramps 1..10 then
  9..1; anger mark1 f=204 x=196 y=14 sub 38 (target sub 40 − 2), mark2 f=226
  x=156 y=14 sub 38; opponent-front target is player-back ONIX → anger sub 28
  (30 − 2), mark1 f=208 x=52 y=60, mark2 f=230 x=92 y=60 (Y_PIC_OFFSET 88 =
  sprite y 80 + 8). Each anger mark runs the 16-tick gAngerMarkAffineAnimCmds
  (×11/−11 per tick) then DestroySpriteAndMatrix (mark1 gone 1 frame later;
  mark2 gone f=243, window ends f=244/248).
- **Next:** (d) `src/animation/torment.ts` reducer + `SceneOnTormentConfig`/
  View seam + `battleScene.ts` draw case — the back-to-front painter order
  FLIPS with orientation (player-back: ONIX 40 → anger 38 → MURKROW 30 →
  bubbles 6..1; opponent-front: MURKROW 40 → anger 28 → ONIX 30 → bubbles 6..1)
  and the six bubbles' explicit absolute subpriorities are the trap — test both
  orders, never one for both sides. Reuse `swaggerAngerMarkAtAge` for the anger
  marks and the thought-bubble tileset from `taunt.json`. Then (e) portable +
  fixtures, (f) Tier-1 + evidence tests + coverage entry + inventory pin
  121→122 exact / 155→154 unsupported.
- **Notes — probe gotcha (twice bitten):** the sprite TEMPLATE symbols
  (`gThoughtBubbleSpriteTemplate` etc.) are data pointers — the `|1` thumb-bit
  applied to function symbols corrupts them; and `hFlip` is the `0x3f` bitfield,
  NOT attr1's matrix bits. Both were wrong on the first probe run.

## MOVE_MINIMIZE promoted to exact — 121/276 exact (2026-08-07 worker)

- **State:** MINIMIZE is **exact** — 153/153 on both axes in both orientations.
  Coverage now **121/276 exact, 0 partial, 0 staged, 155 unsupported**.
- **Did:** the 144/153 residual (9 clone-expiry frames) was diagnosed and FIXED
  by the supervisor during salvage of a cap-killed worker — the fix already
  shipped on this branch. This worker lifted it out of the draw case into the
  reducer: exported `minimizeDisplayedClonesAtAge(age)` in `src/animation/minimize.ts`
  (the `minimizeClonesAtAge` RAM-truth function is unchanged — the portable's
  component axis still checks it) and the `battleScene.ts` MINIMIZE case now
  calls it instead of computing two views inline. Both fixtures already recorded
  `status: "exact"` with 153/153 on both axes and the twice-fresh sha pins were
  already in `tests/animation/minimizeEvidence.test.ts`; re-ran BOTH portables
  after the refactor — 153/153 component + framebuffer, exit 0, evidence hashes
  byte-identical to the fixture pins (pure move, no behaviour change). Added 2
  Tier-1 tests pinning the dual-lag displayed window for all nine clones,
  updated the ANIMATION_COVERAGE.json entry to `exact` (shaped like FACADE,
  nothing else touched) and the inventory summary pin 120→121 exact / 156→155
  unsupported. `npx vitest run tests/animation` 304 files / 1697 tests green;
  `npm run build` green.
- **Measured (both portables, fresh runs, exit 0):** component 153/153 and
  framebuffer 153/153 on player-back and opponent-front, 153-frame windows
  (frames 210-362). Player evidence c044f61d… / raw RGB 54dfaf40…; opponent
  evidence 060ee54d… / raw RGB da319b66… — matching the fixture pins twice fresh.
- **Next:** pick the next move from the component-leverage ranking
  (`npm run animation:coverage`); MINIMIZE's shared components (clone/OAM-blend
  painter, SetBattlerSpriteYOffsetFromYScale) are now proven by an exact move.
- **Notes — REUSABLE FINDING (first in this lane):** two DIFFERENT render lags
  can meet on the SAME sprite and both are needed. A minimize clone is PAINTED
  only once its freshly allocated OAM matrix reaches the hardware (two-display
  lag) but its REMOVAL is a plain OAM edit (one-display lag). Measured: clone 0
  lives RAM frames 211-226 yet shows on screen 213-227 — 15 displayed frames
  for a 16-frame RAM life. Either lag alone fails: age-2 alone over-draws the
  expiry frames 228/231/234, age-1 alone draws the spawn frames 212/215/218 too
  early. The rule intersects them: clones + frozen matrices from age-2,
  intersected with still-alive-at-age-1. The Tier-1 tests state the measured
  frames so the rule is traceable to evidence, not a fitted constant.

## MOVE_MINIMIZE reducer+seam landed at partial — component 153/153, framebuffer 144/153 (2026-08-07 worker)

- **State:** MINIMIZE stays **unsupported** (partial, not promoted). Coverage
  unchanged at **120/276 exact, 0 partial, 0 staged, 156 unsupported**.
- **Did:** on top of the staged scenarios + `minimizeProbe.py` (previous entry),
  landed the full rung (d): `src/animation/minimize.ts` reducer (source-shaped
  `AnimTask_Minimize` lifecycle — three 32-frame shrink cycles at ages 1-32/
  35-66/69-100, 33-frame hold 101-133, 16-step grow-back 134-150, clones
  spawning ages 1/4/7 per cycle with FROZEN matrices 256/376/496 and y2 0/6/10,
  each alive 16 frames), `SceneOnMinimizeConfig`/`SceneOnMinimizeView` seam +
  `sceneOnMinimizeView`, and the `battleScene.ts` MINIMIZE draw case (subpriority
  derived back-to-front per orientation). Wrote `tools/compare/minimizePortable.ts`
  (copied from `facadePortable.ts`, clone-aware) and both
  `tools/compare/fixtures/minimize-*.json`
  (`scene-on-portable-evidence/v1`, dense window 210-362 = 153 frames both
  orientations, hashes twice-fresh). Added Tier-1 `tests/animation/minimize.test.ts`
  (7 reducer tests: task life, scale series, y2 var=40, clone spawns/frozen
  matrices/lifetime/live-count schedule).
- **Measured (both portables, fresh runs, exit 0):** evidence + raw-RGB sha256
  reproduce the fixture pins in both orientations; **component axis 153/153**,
  **framebuffer axis 144/153** — the 9 residual frames are exactly the
  clone-expiry frames (228/231/234 per cycle), where the clone's 16-frame
  lifetime boundary is one frame off from the ROM's OAM teardown under the
  display-seam lag (clone disappears a frame earlier/later than modeled).
  Fixtures honestly record `status: "partial"`, 144/153 framebuffer, 153/153
  component (NOT exact — the portable's own exit-0 check was run to verify).
- **Next:** fix the clone-expiry off-by-one (compare the probed `data[0]` and
  the displayed clone slot on frames 227-228; the destroy lands one display
  frame earlier than `spawnAge+16` under the two-frame OAM lag), re-run both
  portables to 153/153, then promote: coverage entry to `exact`, inventory pin
  120→121 exact / 156→155 unsupported.
- **Notes — blend target:** the clones are `ST_OAM_OBJ_BLEND` under BLDALPHA
  10/8; `target:"static"` (field pixel, single-spring rule) scored 144, and
  `target:"live"` scored worse, so the residual is not the blend target. The
  orientation-blind draw order was tested both ways (clone0 behind attacker at
  the equal-subpriority tie) and matches the oracle; the residual is purely the
  expiry frame.

## MOVE_MINIMIZE staged — both orientations isolated at 153 frames; scenarios + dense probe + measured window banked (2026-08-07 worker)

- **State:** MINIMIZE stays **unsupported**. Coverage unchanged at **120/276
  exact, 0 partial, 0 staged, 156 unsupported**. Nothing promoted; no pin moved.
- **Did:** staged two legal mechanicLab scenarios (FRONTIER_MON_GRIMER lead vs
  legal ONIX, all four active move slots MINIMIZE so the Factory AI has one
  legal choice; player-back `mechanic-minimize-player-grimer-opponent-onix.json`
  and opponent-front `mechanic-minimize-opponent-grimer-player-onix.json`) and
  `tools/compare/minimizeProbe.py` — a dense probe copied from
  `facadeProbe.py` with script-pointer isolation to `Move_MINIMIZE`
  (`082ccf52`..`Move_METRONOME` `082ccf65`) and the clone machinery's own
  capture: EVERY `ClonedMinizeSprite_Step` clone (slot, template, callback,
  x/y/x2/y2, subpriority, attr0/1/2, matrixNum, matrix a/b/c/d, data[0..7]),
  the attacker's own matrix + y2 + attr words, BLDCNT/BLDALPHA/BLDY, hardware
  OAM/matrices, full palettes, per-frame raw RGB + sha256. Probe run command
  recorded in the probe docstring.
- **Measured (fresh runs, both orientations, deterministic and identical):**
  the move-owned window is **153 frames — frames 210..362 each** (task first
  present at 211, last present at 360, destroyed by 361; blendoff lands on 362
  where BLDCNT/BLDALPHA return to 0). Task slot 0, `AnimTask_Minimize_Step`:
  `data[0]` attacker spriteId (6 player / 8 opponent), `data[7]` = attacker
  subpriority (30 player / 40 opponent). Three 32-frame shrink cycles at ages
  (window-210) 1-32, 35-66, 69-100, scale series **296→1536 in +40 steps**
  (`0x100+0x28`), each cycle one state-1 wait frame + state-2 reset frame
  (scale back to 256), then a 33-frame hold (state 3, ages 101-133, scale
  pinned 1536), then state-4 grow-back ages 134-150 at **-80/frame**
  (1536→256 in 16 steps), state-5 reset at 150, task gone at 151. Attacker
  matrix.a == data[4]; y2 = `SetBattlerSpriteYOffsetFromYScale` with var=40
  (`MON_PIC_HEIGHT 64 - 2*GRIMER y_offset 12`): `trunc((40 - trunc(10240/d))/2)`
  verified 0..17 across the whole series (0 at 256 → 17 at 1536). **Clone
  spawn frames ages 1,4,7 / 35,38,41 / 69,72,75** (data[2]==0,3,6 pre-check),
  slots **3,4,5** per cycle (reused), subpriority = attackerSubpriority -
  cloneIndex (30,29,28 player / 40,39,38 opponent), clone matrix FROZEN at the
  spawn-time scale (256, 376, 496) and clone y2 = y2(cloneMatrix) (0, 6, 10),
  each clone alive exactly **16 frames** (data[0] 16→1; `data[6]` live count
  1,2,3 then 2 at +16, 1 at +19, 0 at +22). `setalpha 10,8` = **BLDCNT
  0x3f40, BLDALPHA 0x80a** held frames 211-361; visual-task count 0→1 (211) /
  1→0 (361); SE_M_MINIMIZE sound task 1 at 211..279 (0 at 280), panX -64.
- **Next:** (d) `src/animation/minimize.ts` reducer + `SceneOnMinimizeConfig`/
  View seam + `battleScene.ts` draw case — clone draw order FLIPS between
  orientations (subpriority-based: player-back ONIX 40 → GRIMER 30 → clones
  30/29/28; opponent-front GRIMER 40 → clones 40/39/38 → ONIX 30), so derive
  the painter order from subpriority per orientation and test both; (e) the
  portable + two fixtures; (f) Tier-1 tests, coverage entry, inventory pin
  120→121 exact / 156→155 unsupported.
- **Notes — variant evidence:** GRIMER was picked (FRONTIER_MON_GRIMER) with
  all four slots MINIMIZE; back and front pic y_offset are both 12, so the y2
  var is 40 in both orientations. `AllocOamMatrix()` returned a real matrix
  every spawn in both runs (no 0xFF-failure clones observed in the live
  window), but the reducer still models the failure branch from source.

## MOVE_FACADE promoted to exact — 119→120; pinning and ledger only, rendering was already verified (2026-08-07 worker)

- **State:** coverage advanced **119→120/276 exact**, 0 partial, 0 staged, 156
  unsupported. This step landed the Tier-1 pinning and the ledger bookkeeping
  only — the rendering itself was already done and oracle-verified on commit
  16d2e52b (cap-killed worker + supervisor salvage).
- **Did:** re-ran **both `facadePortable.ts` runs fresh on this tree**: each
  reports `FACADE component 81/81; framebuffer 81/81` and exits 0, with
  evidence + raw-RGB sha256 reproducing the fixture pins — player
  `0c0069cd…`/`f053995a…`, opponent `0b6d6e52…`/`2c20c276…`, window 212-292
  (81 frames) in both orientations. Added `tests/animation/facade.test.ts`
  (9 reducer tests: task lifecycles ages 4-78/4-75 with the coefficient-0
  restore at 76; blend index advancing per age and wrapping 23→0 across the
  full 72; six droplet batches at ages 9, 21, 34, 46, 59, 71 with four
  droplets each; droplet geometry xOffset 30/+20 vs 18/-20, xCoords
  `[bx-off, bx-off-4, bx+off, bx+off+4]`, `yCoords[i&1]=[by+yoff, by+yoff+6]`,
  velocX -2/+2, velocY -1, 7-tick lifetime; three 24-frame squish FRAME
  cycles with identity resets; y2; typed seam). Added
  `tests/animation/facadeEvidence.test.ts` (3 tests) pinning both fixtures'
  schema, window, evidence/second-fresh/raw-RGB hashes, acceptance 81/81, and
  legal party structure. Promoted the `MOVE_FACADE` entry in
  `ANIMATION_COVERAGE.json` to `exact` (MOVE_FLASH entry shape) and moved the
  inventory pin 119→120 exact / 157→156 unsupported.
- **Measured:** `npx vitest run tests/animation` **302 files / 1685 passed / 1
  established skip**, `npm run animation:coverage` reports **120/276 exact, 0
  partial, 0 staged, 156 unsupported**, both portables 81/81 exit 0.
- **Next:** resume **MOVE_DOUBLE_EDGE** from its staged base (largest remaining
  staged unit), or the next bounded component track from
  `npm run animation:coverage`.
- **Notes — rendering provenance:** the rendering landed via a cap-killed
  worker plus supervisor salvage (commit 16d2e52b); the salvage fixed an
  orientation-blind painter order that had cost 9 opponent-front frames —
  droplets are always `attackerSubpriority - 5` and a LOWER subpriority draws
  in front, so the back-to-front order is ONIX 40 → AZUMARILL 30 → droplets 25
  player-back but AZUMARILL 40 → droplets 35 → ONIX 30 opponent-front. The
  display seam latches the squish affine matrix two displays behind the RAM
  state and the palette + droplets one behind. No engine changes beyond the
  existing FACADE draw case; no boundary widening; `tests/animation/factoryAnimationInventory.test.ts`
  pin updated for this promotion.

## Supervisor wind-down — GRASS_WHISTLE + FLASH exact, 117→119; DOUBLE_EDGE and FACADE staged (2026-08-07 animation session)

- **State:** coverage advanced **117→119/276 exact**, 0 partial, 0 staged, 157
  unsupported. `animation-main` is committed and green with no animation worker
  worktrees or branches left behind. 6 workers, 4 cap-kills, 3 of them salvaged.
- **Did:** promoted **MOVE_GRASS_WHISTLE** (225/225 both orientations, twice
  fresh, source-component + shared-framebuffer) and **MOVE_FLASH** (64/64 both
  orientations, twice fresh). Staged **MOVE_DOUBLE_EDGE** (both scenarios, dense
  isolated probe, 141-frame windows at player 80-220 / opponent 84-224, measured
  task+sprite lifecycles) and **MOVE_FACADE** (both scenarios, dense isolated
  probe, 81-frame window 212-292 both sides). See the four entries below.
- **Verified:** every promotion re-run by the supervisor rather than accepted on
  report — all four GRASS_WHISTLE portable runs and all four FLASH runs
  reproduced their evidence and raw-RGB hashes exactly; the MOVE_SING control
  held at 245/245 player and 248/248 opponent after its reducer was
  parametrized. Integrated `npm test` **760 files / 7206 passed / 1 established
  skip** and `npm run build` green.
- **Next:** finish **MOVE_FACADE** from its staged base (smallest remaining
  unit — resolve the zero-sprite caveat first), then **MOVE_DOUBLE_EDGE** from
  its staged base with a larger cap or a stronger tier.
- **Notes — step sizing, for whoever briefs the next round:** size animation
  steps by anim-script size, not by zero-new-component rank. At a 45-minute
  DeepSeek cap this session, MOVE_FLASH (4-line script, 1 component) closed in
  ONE round; MOVE_GRASS_WHISTLE (6 components) took two; **MOVE_DOUBLE_EDGE (9
  components, ~30-line script) failed three consecutive rounds**, one of which
  produced zero file writes. All remaining zero-new-component Level-50 moves are
  >=9 components, while several 1-new-component moves (SUBSTITUTE 1, HAZE 2,
  MINIMIZE 3, FACADE 3) are much smaller total units — a new component that is
  30 lines of C is cheaper than nine reused ones.
- **Notes — two recurring defect classes worth briefing against:** (1) an
  orientation-blind draw case; GRASS_WHISTLE was framebuffer-exact player-back
  and 153/225 opponent-front purely because one painter order was used for both
  sides, and the ROM's per-sprite subpriority flips placement between
  orientations. (2) an overclaimed fixture; a cap-killed worker left
  `acceptance.status: "exact"` on a fixture whose portable exited 1, so always
  run the portable yourself before merging.
- **For the main program:** nothing blocking. No boundary widening, no new
  unsupported barriers, no controller or battle-state ownership taken, no
  animation deferrals opened (ANIMATION_DEFERRED.md remains empty).
  `tests/animation/factoryAnimationInventory.test.ts` now pins 119 exact / 157
  unsupported — that pin moves on every promotion, so a fold that resolves
  ANIMATION_COVERAGE.json must re-run it.

## MOVE_FACADE staged — both orientations isolated at 81 frames; scenarios + dense probe banked (2026-08-07 cap-killed worker + supervisor salvage)

- **State:** FACADE stays **unsupported**. Coverage unchanged at **119/276
  exact, 0 partial, 0 staged, 157 unsupported**. Nothing promoted; no pin moved.
- **Did:** the worker was cap-killed at 45 min having committed nothing.
  Salvaged its two legal mechanicLab scenarios (FRONTIER_MON_AZUMARILL_1,
  AZUMARILL, versus legal ONIX) and `tools/compare/facadeProbe.py`. No reducer,
  no seam, no portable, no fixtures, no tests.
- **Measured (supervisor, fresh runs of both scenarios):** the probe isolates the
  move-owned window by script pointer and yields **81 frames in both
  orientations — frames 212-292 each**. Task lifecycles are identical on both
  sides: `AnimTask_SquishAndSweatDroplets_Step` slot 0 ages 4-78 and
  `AnimTask_FacadeColorBlend_Step` slot 1 ages **4-75 — exactly the 72 blend
  frames the source predicts** (`gBattleAnimArgs[1] = 72`). Visual-task count
  range 0-2. Schema `facade-dense-evidence/v1`.
- ~~**CAVEAT for the next worker:** the probe records **zero sprites across the
  whole window**.~~ **CORRECTED (supervisor, 2026-08-07, both scenarios re-run
  fresh):** that caveat is **false**. `facadeProbe.py` as committed records
  **168 sweat-drop rows per orientation** — 6 spawn batches of 4 sprites, each
  batch alive exactly 7 displayed frames. Spawn frames are 221, 233, 246, 258,
  271 and 283 in both orientations; sprite slots are 3, 4, 5 and 7 (slot 6 is
  skipped — read the slot from the probe, do not assume contiguity). Droplet
  geometry reproduces the source exactly: `CreateSweatDroplets` at `tTimer==6`
  uses xOffset 30 / yOffset +20 and at `tTimer==18` uses xOffset 18 /
  yOffset -20; `xCoords = [bx-off, bx-off-4, bx+off, bx+off+4]`,
  `yCoords[i&1] = [by+yoff, by+yoff+6]`; `velocX` is -2 for i<2 else +2,
  `velocY` is -1; subpriority is `tSubpriority - 5`. No probe fix is needed and
  no droplet-visibility question remains open.
- **Next:** finish FACADE from this staged base — the reducer, the seam, the
  `battleScene.ts` draw case, the portable, two fixtures, the Tier-1 tests, and
  promotion. The new component `task:AnimTask_FacadeColorBlend` is small: blend
  the attacker's 16-entry OBJ palette at a FIXED coefficient of 8 toward
  `gFacadeBlendColors[i]` (24-entry table, src/battle_anim_effects_3.c:902),
  i advancing per frame and wrapping 23->0, for 72 frames, then one
  coefficient-0 restore and destroy.
- **Supervisor-measured lifecycles (2026-08-07, both scenarios fresh):** the
  squish task is present frames **216-290**; `data[]` is
  `[tState, tTimer, tActiveSprites, tNumSquishes, tBaseX, tBaseY, tSubpriority,
  tBattlerSpriteId, …]`. `tBaseX/tBaseY/tSubpriority` are **72 / 80 / 30**
  player-back and **176 / 40 / 40** opponent-front. `tTimer` runs 1..24 per
  squish; three squishes occupy frames 216-239, 240-264 and 265-289; frame 290
  is `tState=1, tTimer=25` and the task is then destroyed. The blend task is
  present frames **216-287** (72 blends); its `data[2]` palette offset is
  **256** player (OBJ bank 0) and **272** opponent (OBJ bank 1); the
  coefficient-0 restore lands on frame 288. The attacker's affine squish comes
  from `gFacadeSquishAffineAnimCmds` = FRAME(-16,+16,0,6), FRAME(+16,-16,0,12),
  FRAME(-16,+16,0,6); the probe captures the live matrix a/d and `y2` per frame,
  so fit against those rather than re-deriving. The blend arithmetic is
  confirmed against RAM: unfaded `0x5739` blended with
  `gFacadeBlendColors[0] = RGB(28,25,1)` at coefficient 8 gives `0x2F3A`, which
  is exactly what the probe reads at frame 216 — so the RAM write is same-frame
  and only the display latch remains to be measured.
- **Notes:** the other two components (`asset:ANIM_TAG_SWEAT_DROP`,
  `task:AnimTask_SquishAndSweatDroplets`) are credited to exact MOVE_ENDEAVOR,
  but ENDEAVOR's `sceneOnEndeavorView` seam exposes only an HP-drain view — that
  credit may be window bookkeeping rather than reusable rendering code. Expect to
  write the squish/droplet reducer fresh.

## MOVE_FLASH closed — 64/64 both orientations twice-fresh, promoted to exact (2026-08-07 worker)

- **State:** FLASH (new move) → **exact**. Move coverage: **119/276 exact, 0
  partial, 0 staged, 157 unsupported**. Both fixtures pin `framebufferMatching: 64`.
- **Did:** full new-move acceptance on the smallest remaining unit. `Move_FLASH`
  (battle_anim_scripts.s:2984) is `playsewithpan SE_M_LEER` +
  `createvisualtask AnimTask_Flash, 2` + wait + end — a pure palette
  animation, no sprites. `AnimTask_Flash` (battle_anim_utility_funcs.c:649)
  snaps every battle-mon OBJ palette (GetBattleMonSpritePalettesMask(1,1,1,1)
  >> 16 = 0x3, banks 0-1) to RGB_BLACK and the BG palettes
  (GetBattlePalettesMask(TRUE,…) & 0xFFFF = 0xe, banks 1-3) to RGB_WHITEALPHA,
  holds 7 frames, then steps the blend coefficient 16 down to 0 one decrement
  per 2 frames (BG toward 0xFFFF, OBJ toward 0) and is destroyed at age 40.
  Landed the reducer (`src/animation/flash.ts`) — faded coefficient null at
  age 0, 16 at ages 1-8, 15..0 at ages 9..39 (one per 2 frames), null from 40;
  the palette writes latch one display behind the RAM (snap shows at display
  ages 2-9, ramp at 10-39). Added the `SceneOnFlashConfig/View` +
  `sceneOnFlashView` seam and the `battleScene.ts` draw case (field BG banks
  blended toward white, both battler palettes toward black, healthboxes and
  message window untouched), the two mechanic scenarios (FRONTIER_MON_MAREEP
  record 49, all four slots FLASH, vs legal ONIX), `flashProbe.py` (dense,
  task lifecycle + all 512 faded/unfaded/hardware palettes + RGB),
  `flashPortable.ts`, the two scene-on-portable-evidence/v1 fixtures, and
  `flash.test.ts` + `flashEvidence.test.ts`.
- **Measured:** player-back frames 213-276 and opponent-front frames 279-342
  (both script-pointer-isolated 64-frame windows), each **64/64
  source-component and shared-framebuffer exact twice fresh**. Evidence
  `5479cd1b…` / `7969b083…`, RGB `46543297…` / `d6c65c11…` reproduce the
  fixture pins exactly on every fresh portable run (4 runs total).
- **Next:** continue the Level-50 ladder from the ranked coverage report.
- **Notes:** the opponent-front scenario needed a different legal staging
  (seed 1, cotton-spore opponent sets) than the player-back one (seed
  305419897, double-edge opponent sets) — the seed-1 player-staging produced
  an ambiguous ~150-frame `currentMove` window whose script pointer never
  entered the `Move_FLASH` bounds, so it was discarded for the clean
  64-frame config. `factoryAnimationInventory.test.ts` summary pin moved
  118→119 / 158→157 with the promotion. No boundary widening; one new source
  component `task:AnimTask_Flash` expected and recorded.

## MOVE_DOUBLE_EDGE staged — both orientations isolated at 141 frames; scenarios + dense probe banked (2026-08-07 cap-killed worker + supervisor salvage)

- **State:** DOUBLE_EDGE stays **unsupported**. Coverage unchanged at **118/276
  exact, 0 partial, 0 staged, 158 unsupported**. Nothing promoted; no pin moved.
- **Did:** the worker was cap-killed at 45 min having committed nothing. Salvaged
  its two legal mechanicLab scenarios (FRONTIER_MON_HITMONTOP_2 record 341,
  HITMONTOP, all four slots DOUBLE_EDGE, versus legal ONIX) and
  `tools/compare/doubleEdgeProbe.py`, plus a first-draft
  `src/animation/doubleEdge.ts` reducer that is **not yet wired to any seam and
  is unverified** — it reuses `slideMon.ts`, `shakeMonInPlace.ts` and wrap.ts's
  elliptical helper. Fixed one unused import that left the tree red.
- **Measured (supervisor, fresh runs of both scenarios):** the probe isolates the
  move-owned window by script pointer against the
  `Move_DOUBLE_EDGE`..`Move_POISON_STING` label bounds and yields **141 frames in
  both orientations — player 80-220, opponent 84-224**. Across the window:
  3 distinct task functions, visual-task count 0-5, sprite count 0-2. Schema
  `double-edge-dense-evidence/v1`.
- **Next:** finish DOUBLE_EDGE from this staged base — the expensive staging
  (legal carrier, both scenarios, dense isolated probe) is already banked, so the
  remaining work is the seam, the `battleScene.ts` draw case, the portable, two
  fixtures, the Tier-1 tests, and promotion.
- **Notes:** DOUBLE_EDGE is a 9-component contact move with both battlers acted
  on symmetrically (two `AnimTask_RotateMonSpriteToSide` pairs and two
  `AnimTask_ShakeMonInPlace` pairs, plus a restore pass). It did not fit a
  45-minute cap from scratch; split it as staging-then-closure like
  GRASS_WHISTLE. **For a future step:** derive the painter order per orientation
  from the probe's OAM subpriorities — GRASS_WHISTLE's opponent side was
  153/225 purely from an orientation-blind draw order.

## MOVE_GRASS_WHISTLE closed — 225/225 both orientations twice-fresh, promoted to exact (2026-08-07 closure worker)

- **State:** GRASS_WHISTLE (new move) → **exact**. Move coverage: **118/276 exact,
  0 partial, 0 staged, 158 unsupported**. Both fixtures pin
  `framebufferMatching: 225` / `componentMatching: 225` with status `exact`.
- **Did:** finished the staged unit's one diagnosed defect — the note ARRAY
  ordering — and the opponent orientation. (1) The component axis was comparing
  the seam's painter-ordered notes against the ROM's ascending-slot sprite
  records; the cure was GRASS_WHISTLE's own probe-derived
  note→sprite-slot table (`GRASS_WHISTLE_NOTE_SPRITE_SLOTS`/`_ORDER_SEED`,
  generalized `wavyMusicNotesBackToFrontAtAge` to take them) with the portable
  comparing notes at the ACTUAL age re-sorted by slot. (2) The opponent
  framebuffer was 153/225 because the draw order ignored the ROM's
  orientation-dependent OAM subpriority: the notes sit between the two battlers
  on OPPOSITE sides (player ROSELIA sub 30 / note 38 / ONIX sub 40; opponent
  note 28 / ONIX 30 / ROSELIA 40), so player-back ROSELIA draws after its notes
  and opponent-front ROSELIA before them. Both fixtures re-run twice fresh at
  225/225 component AND framebuffer.
- **Measured:** player-back frames 216-440 and opponent-front frames 216-440
  (both script-pointer-isolated 225-frame windows), each **225/225
  source-component and shared-framebuffer exact twice fresh**. Evidence
  `4b4aef45…` / `22a0ea61…`, RGB `eee49e48…` / `9d218d9a…` reproduce the
  fixture pins exactly on every fresh portable run. The slot table and order
  seed coincide with SING's in both orientations (verified at the first-note
  frame 235); GRASS_WHISTLE's no-monbg delta shifts other scene sprites, not
  the notes. MOVE_SING control re-ran **245/245 player / 248/248 opponent**.
- **Next:** continue the zero-new-component Level-50 ladder from the ranked
  coverage report.
- **Notes:** GRASS_WHISTLE is a **sibling move acceptance** — sharing the
  wavy-note reducer accepts no other move; MOVE_SING remains the control and
  did not regress. `factoryAnimationInventory.test.ts` summary pin moved
  117→118 / 159→158 with the promotion. `grassWhistle.test.ts` (8 Tier-1 tests:
  twelve spawn ages + pinned palette rule, note→slot table, velocity/Sin wave
  geometry on both sides, green 0→4→0 blend ramp, visual-task counts, shared
  sSpriteOrder pass, typed seam) and `grassWhistleEvidence.test.ts` added. No
  boundary widening, no new unsupported barriers.

## MOVE_REFRESH closed — 209/209 both orientations twice-fresh, promoted to exact (2026-08-05 closure worker)

- **State:** REFRESH (new move) → **exact**. Move coverage: **117/276 exact,
  0 partial, 0 staged, 159 unsupported**. Both fixtures pin `framebufferMatching: 209`.
- **Did:** closed the already-implemented MOVE_REFRESH unit without re-investigating
  the 209/209 renderer. Added `refresh.test.ts` (7 Tier-1 reducer tests: BG1
  mask window/scroll/eva, delay-8 star spawns + x-only mirror, BG-vs-attacker
  five-frame blend steps, displayed BG-immediacy/OBJ-lag latch, thin-ring scale,
  visual-task counts, typed seam) and `refreshEvidence.test.ts` (2 receipt/source
  pins: windows 515-723 / 519-727, CHANSEY 287×4 vs ONIX 92×4, lifecycle
  counts). Re-ran the named exact portable controls once each: SYNTHESIS
  130/130 and MILK_DRINK 186/186 component+framebuffer clean; AROMATHERAPY
  400/400 framebuffer identity held but its probe evidence hash drifted
  (receipt-only, raw RGB unchanged) — pins left untouched, see report.
- **Measured:** player-back frames 515-723 and opponent-front frames 519-727,
  both **209/209 source-component and shared-framebuffer exact twice fresh**.
  Evidence `35ede52e…` / `8f27ac49…`, RGB `d35ee921…` / `bd2ba9fa…` reproduce
  the fixture pins exactly on every fresh portable run. Coverage JSON + ledger
  promoted REFRESH only; no component credit, no sibling promotion.
- **Verified:** supervisor independently re-ran both portables at 209/209,
  focused tests at 18/18, `npm run animation:coverage` at 117/276 exact,
  the full suite at 743/743 files (7,046 passed, 1 skipped), and the production
  build. All pre-existing tracked scratch diagnostics were preserved.
- **Next:** continue the staged zero-new-component `MOVE_GRASS_WHISTLE` unit:
  isolate `Move_GRASS_WHISTLE` by script pointer from the following sleep-status
  animation, then prove the rainbow tasks/green BG blend and build the portable.
- **Notes:** AROMATHERAPY receipt drift: new evidence `cec76eae360c…`, pinned
  `83f9f2d03fb0…`; raw RGB
  unchanged at `dc02bff98836…` — framebuffer identity required and met.
  GRASS_WHISTLE now has legal ROSELIA-171/ONIX scenarios and a partial probe in
  both orientations (458 current-move frames, 316 animation-active, 12 notes);
  it remains unsupported and must not be promoted from this combined window.

## MOVE_ROCK_THROW closed — 87/87 both orientations twice-fresh, promoted to exact (2026-08-05 worker)

- **State:** ROCK_THROW (new move) → **exact**. Move coverage: **116/276 exact,
  0 partial, 0 staged, 160 unsupported**. Both fixtures pin
  `framebufferMatching: 87` with status `exact`.
- **Did:** finished the staged Level-50 ROCK_THROW unit. The sole eligible
  carrier is FRONTIER_MON_GRAVELER_1 record 166 (GRAVELER, all four slots move
  88) vs legal ONIX; zero new source components — `Move_ROCK_THROW`
  (battle_anim_scripts.s:2098) reuses the shared
  `gFallingRockSpriteTemplate`/`AnimFallingRock`/`TranslateSpriteInEllipse`
  falling-rock body (the ROCK_SLIDE component), the `shake_mon_or_platform`
  BG3-Y shake, and `AnimTask_ShakeMon(ANIM_TARGET,0,5,20,1)`. Kept the
  committed reducer, scenarios, probe, portable, and two fixtures; corrected
  the reducer + fixture profiles + portable oracle-side derivation from dense
  RGB evidence (see Notes), then added `rockThrow.test.ts` (8 Tier-1 tests:
  rock table/stride, BG-Y sequence, spawn/lifetime geometry pinned to oracle,
  measured target-shake boundary) and `rockThrowEvidence.test.ts` (receipt
  pins). Updated `factoryAnimationInventory.test.ts` 115→116 / 161→160.
- **Measured:** player-back frames 296-382 and opponent-front frames 296-382,
  both **87/87 source-component and shared-framebuffer exact twice fresh**
  (semantic identity also 87/87 each run). Evidence `9a7fa756…` /
  `3dc82aad…`, RGB `773f4366…` / `e2592ba2…` reproduce the fixture pins
  exactly on every fresh portable run. The dense exact MOVE_ROCK_SLIDE control
  fixture `rock-slide-grovyle-onix.json` re-ran 175/175 twice fresh (probe
  `984fe6c1…`).
- **Next:** continue the zero-new-component Level-50 ladder from the ranked
  coverage report.
- **Notes:** the capped investigation's remaining mismatch was the target ONIX
  display shake/idle residual, and its staged profile values were hypotheses.
  A dense RGB scan (debug script, since removed) derived the true displayed
  target x2/y2 directly for both orientations: the framebuffer shows +5 at
  display ages 21, 24-25, 28-29, …, 56-57 — a lead frame at 21 then 2-on-2-off
  pairs, i.e. `(age-21)%4 ∈ {0,3}` over [21,57] — NOT the staged 22..55 or
  default 24..57 windows; and the opponent-front ONIX idle-bob x2=+1 drops to
  0 at display age 21, one frame behind its RAM write. The portable's
  oracle-side derivation now uses this RGB-verified latch (y2 lead at
  `targetShakeStartAge`, x2 from RAM one frame back). No boundary widening, no
  new unsupported barriers; ROCK_THROW is a sibling acceptance and shares no
  move credit.

## MOVE_WRAP closed — 38/38 both orientations twice-fresh, promoted to exact (2026-08-05 worker)

- **State:** WRAP (new move) → **exact**. Move coverage: **115/276 exact, 0
  partial, 0 staged, 161 unsupported**. Both fixtures pin
  `framebufferMatching: 38` with status `exact`.
- **Did:** full new-move acceptance on the shared BindWrap track with the
  already-exact MOVE_BIND control. `Move_WRAP` (battle_anim_scripts.s:7130)
  is `AnimTask_TranslateMonEllipticalRespectSide(ANIM_ATTACKER,6,4,2,4)` +
  `goto BindWrap` (SE_M_BIND + two `BindWrapSqueezeTarget`
  `AnimTask_ScaleMonAndRestore(10,-5,5)` calls + waitforvisualfinish + end).
  Landed the reducer (`src/animation/wrap.ts`) reusing bind.ts's shared
  `scaleMonAndRestoreAtAge`: the ellipse runs 32 steps (wavePeriod 16, two
  loops, origin at steps 0/16, final-step origin reset at 31) with the
  source's RespectSide opponent width negation before signed Q8.8 rounding,
  and the two squeezes at probe-measured starts [1,19]. Added
  `SceneOnWrapConfig/View` + `sceneOnWrapView` seam, the `battleScene.ts`
  draw case (TENTACOOL back/front over affine-stretched ONIX target with the
  ONIX front idle residual x2=1, side-correct healthboxes/text), the two
  mechanic scenarios (FRONTIER_MON_TENTACOOL record 124, all four slots
  WRAP, vs legal ONIX — the carrier/species/side audited in the generated
  mons data), `wrapProbe.py` (dense, ellipse+squeeze task lifecycles,
  battler sprite records, RGB), `wrapPortable.ts`, the two
  scene-on-portable-evidence/v1 fixtures, and `wrap.test.ts` +
  `wrapEvidence.test.ts`.
- **Measured:** player-back frames 222-259 and opponent-front frames 78-115,
  both **38/38 source-component and shared-framebuffer exact twice fresh**
  (semantic identity also 38/38 each run). Evidence `0220a498…` /
  `62037408…`, RGB `cc7ca56f…` / `39d3acfc…` reproduce the fixture pins
  exactly on every fresh portable run.
- **Next:** continue the zero-new-component Level-50 ladder from the ranked
  coverage report.
- **Notes:** WRAP is a **sibling move acceptance** — sharing the BIND
  squeeze/scale-and-restore component accepts no other move. BIND remains
  exact (45/45 both orientations) as the control. Two diagnosis corrections
  during fitting: (1) the gender symbol color/position mismatch was the
  wrong fixture gender (personality rule is `ratio > (pid&0xFF) ? female :
  male`, so pid-low 0xa0 ONIX is male, blue ♂), and (2) the player/opponent
  healthbox HP fields must key off the healthbox position, not the attacking
  side. `factoryAnimationInventory.test.ts` summary pin moved 114→115 /
  162→161 with the promotion. No boundary widening, no new unsupported
  barriers.

## Supervisor wind-down — four Level-50 moves exact; animation-main green (2026-08-05)

- **State:** coverage advanced **110→114/276 exact** with no partial or staged
  moves and **162 unsupported**. This branch is folded through master
  `edb54320` and contains no live animation worker worktrees or branches.
- **Did:** independently reviewed, dense-replayed, and merged MOVE_METAL_CLAW,
  MOVE_AGILITY, MOVE_BULK_UP, and MOVE_MUDDY_WATER. Each move is exact in both
  orientations twice fresh; the source-component/shared-framebuffer windows
  are respectively 140/140, 87/87, 104/104, and 144/144. The SURF control also
  remained 144/144 in both orientations twice after the muddy sibling port.
- **Verified:** integrated `npm test` — **737 files passed, 7020 tests passed,
  1 established skip**; integrated `npm run build` — green. Final coverage
  report: **114 exact, 0 partial, 0 staged, 162 unsupported**.
- **Next:** resume the zero-new-component Level-50 ladder from the ranked
  coverage report, one bounded move acceptance at a time.
- **Notes:** no new unsupported barriers, controller ownership, battle-state
  ownership, or animation deferrals. AGILITY's initially reported opponent
  mismatch was stale probe field-profile data plus the established
  species-relative terrain cutoff, corrected before acceptance.

## MOVE_MUDDY_WATER closed — 144/144 both orientations twice-fresh, promoted to exact (2026-08-05 afternoon session)

- **State:** MUDDY_WATER (new move) → **exact**. Move coverage: **114/276
  exact, 0 partial, 0 staged, 162 unsupported**. Both fixtures pin
  `framebufferMatching: 144` with status `exact`.
- **Did:** full new-move acceptance reusing the already-exact
  `create_surf_wave` component (the surfWave source audit already recorded
  this distinct sibling). `Move_MUDDY_WATER` (battle_anim_scripts.s:8601)
  is `panse SE_M_WHIRLPOOL attacker→target +2,0` followed by
  `create_surf_wave palette=ANIM_SURF_PAL_MUDDY_WATER` + wait + end.
  Generalized `surfWaveAtAge` to take a `palette` param — the muddy variant
  keeps the identical wave/scanline/BG1 body, swaps the water palette, plays
  the SE_M_WHIRLPOOL pan sweep from age 1 (player -64→+63, opponent +63→-63,
  ±2/age, terminal one step earlier on the opponent side; track flags drop to
  128 and the sound finishes at 122), and shows the origin scroll at age 4 on
  the player side (the pre-wave panse shifts the initial BG write one display
  later). Staged two complete legal mechanicLab parties
  (FRONTIER_MON_MARSHTOMP_2 set 295, all four slots MUDDY_WATER, vs legal
  ONIX — the only Factory MUDDY_WATER carrier, confirmed in the generated
  mons data). Added MARSHTOMP back/front art to surf-wave.json via the
  extended extractor, `muddyWaterProbe.py` (dense, SE_M_WHIRLPOOL + battler
  RAM field profile), `muddyWaterPortable.ts`, the two
  scene-on-portable-evidence fixtures, and `muddyWater.test.ts` (5 Tier-1
  tests). The Scene-ON seam and battleScene.ts draw case were generalized to
  both moves (muddy palette + MARSHTOMP/ONIX art + `MUDDY WATER!` text; the
  ONIX target keeps its established opponent-front idle x2=+1).
- **Measured:** player-back frames 80-223 and opponent-front frames 84-227,
  both **144/144 source-component and shared-framebuffer exact twice fresh**
  (semantic identity also 144/144 each run). Evidence `4e330cc3…` /
  `f99e8df2…`, RGB `c527751a…` / `1167773f…` reproduce the fixture pins
  exactly. Field profiles from fresh battler RAM: MARSHTOMP 145/145 vs ONIX
  142/142 (both orientations, full HP and stat-neutral at the first dense
  frame).
- **Next:** continue the zero-new-component Level-50 ladder.
- **Notes:** MUDDY_WATER is a **sibling move acceptance** — sharing the
  surfWave reducer/tilemap/draw accepts no other move (SECRET_POWER's
  Factory building dispatch keeps Move_STRENGTH). SURF remains exact at
  144/144 (the generalized reducer defaults to the surf palette; surf
  tests unchanged). `factoryAnimationInventory.test.ts` summary pin moved
  113→114 / 163→162 with the promotion. No boundary widening, no new
  unsupported barriers. The opponent pan sweep reaching its terminal one
  step earlier than the player is a real source consequence of the
  ±(64→63) vs ±(63→-63) ranges, not a fitting.

## MOVE_BULK_UP closed — 104/104 both orientations twice-fresh, promoted to exact (2026-08-05 midday session)

- **State:** BULK_UP (new move) → **exact**. Move coverage: **113/276 exact, 0
  partial, 0 staged, 163 unsupported**. Both fixtures pin `framebufferMatching:
  104` with status `exact`.
- **Did:** full new-move acceptance with **zero new source components**.
  `Move_BULK_UP` (battle_anim_scripts.s:4390) is exactly the already-exact
  `Move_SWAGGER` prefix — ANIM_TAG_BREATH, AnimTask_GrowAndShrink,
  playsewithpan SE_M_SWAGGER, wait, gBreathPuffSpriteTemplate, loopsewithpan
  SE_M_SWAGGER 4,2, wait, end. The reducer (`src/animation/bulkUp.ts`) reuses
  `swaggerGrowAndShrinkAtAge`, `swaggerBreathAtAge`, and a newly generalized
  `growAndShrinkY2AtAge` (battle_anim_mons.c `SetBattlerSpriteYOffsetFromYScale`)
  with the legal carrier's 64−2·7=50 picture height; the draw reuses the shared
  SWAGGER breath asset. Staged two complete legal mechanicLab parties
  (PRIMEAPE set 337 all-slot BULK_UP vs ONIX TACKLE, both orientations —
  independently confirmed the lowest BULK_UP Factory carrier from the generated
  mons data). `bulkUpProbe.py` dense 72-175 / 76-179, `bulkUpPortable.ts`,
  `extractBulkUpAssets.ts` (Primeape back/front only; breath shared), the two
  scene-on-portable-evidence/v1 fixtures, and `bulkUp.test.ts` +
  `bulkUpEvidence.test.ts`.
- **Measured:** player-back frames 72-175 and opponent-front frames 76-179,
  both **104/104 source-component and shared-framebuffer exact twice fresh**
  (semantic identity also 104/104 each run). Evidence `2fb724ec…` /
  `fa85b2f3…`, RGB `b5c127f2…` / `8f2d4c93…` reproduce the fixture pins exactly.
  Field profiles from fresh battler RAM: PRIMEAPE 158/158 vs ONIX 117/117
  (player-back) and ONIX 128/128 vs PRIMEAPE 158/158 (opponent-front), all
  full-HP and stat-neutral at the first dense frame.
- **Next:** continue the zero-new-component Level-50 ladder.
- **Notes:** BULK_UP is a **sibling move acceptance** — sharing the SWAGGER
  grow/breath reducers accepts no other move (GROWTH and friends keep their own
  bodies/evidence). `factoryAnimationInventory.test.ts` summary pin moved
  112→113 / 164→163 with the promotion. No boundary widening, no new unsupported
  barriers. Primeape opponent-front carries no idle-bob residual (x2=0), so the
  draw needs no front idle offset for the attacker; the Onix target keeps its
  established opponent-front x2=1.

## MOVE_AGILITY closed — 87/87 both orientations twice-fresh, promoted to exact (2026-08-05 morning session)

- **State:** AGILITY (new move) → **exact**. Coverage is **112/276 exact, 0
  partial, 0 staged, 164 unsupported**. Both fixtures pin 87/87 framebuffer
  identity through first inactive cleanup.
- **Did:** ported the full source body for sole Level-50 carrier
  FRONTIER_MON_LEDYBA record 40: monbg, alpha 12/8,
  TranslateMonEllipticalRespectSide(24,6,4,4), TraceMonBlended(0,4,7,10), five
  SE_M_DOUBLE_TEAM restarts, clone allocator/OAM overlap order, cleanup, and
  delay 1. Added the pure reducer, typed Scene-ON seam and draw case, two legal
  LEDYBA/ONIX scenarios, dense probe/portable fixtures, and reducer/evidence
  Tier-1 tests.
- **Measured:** player-back frames 217-303 reproduce evidence `6913b732…` /
  RGB `f8633f41…`; opponent-front frames 218-304 reproduce `9f8a7cfb…` /
  `50df74b1…`. Both are 87/87 semantic, raw-RGB, and shared-framebuffer exact
  twice fresh.
- **Next:** continue the zero-new-component Level-50 ladder.
- **Notes:** supervisor review corrected the worker's false field-artifact
  diagnosis: 85/86 pixels were stale field-profile values (probe RAM is ONIX
  128/128 and LEDYBA 102/122 after Tackle); the last pixel required the already
  established species-relative opponent terrain cutoff (`spriteCorner.y + 55`,
  y=75 for LEDYBA). No boundary widening or new unsupported barrier.

## MOVE_METAL_CLAW closed — 140/140 both orientations twice-fresh, promoted to exact (2026-08-05 morning session)

- **State:** METAL_CLAW (new move) → **exact**. Move coverage: **111/276 exact,
  0 partial, 0 staged, 165 unsupported**. Both fixtures pin
  `framebufferMatching: 140` with status `exact`.
- **Did:** full new-move acceptance reusing only established source-faithful
  components — non-permanent `metallic_shine` (accepted HARDEN body), the
  6×4 `gHorizontalLungeSpriteTemplate`, the `create_claw_slash_sprite`
  5-frame art/callback, and `shake_mon_or_platform -4,1,10,SHAKE_MON_Y`. The
  script is `loopsewithpan SE_M_HARDEN` + shine → wait → two strikes, each a
  lunge, a delay-2 SE_M_RAZOR_WIND, a mirrored claw-slash pair at the
  target's `BATTLER_COORD_X_2/Y_PIC_OFFSET` ±10, and the target shake.
  Landed the reducer (`src/animation/metalClaw.ts`): shine at ages 0..95,
  first lunge tick 98, first slashes+shake at 103, second lunge tick 112,
  second mirrored slashes+shake at 117, 21-frame slash lifetime, and the
  11-frame pairwise `gSpriteCoordOffsetY` pattern [0,4,4,0,0,4,4,0,0,4,0].
  Added the typed `SceneOnMetalClawConfig/View` + `sceneOnMetalClawView`
  seam, the `battleScene.ts` draw case (grayscale attacker + masked metal
  sweep, lunged attacker, shaken ONIX, both claw-slash groups), the two
  mechanic scenarios (FRONTIER_MON_CHARMANDER record 88, all four slots
  METAL_CLAW, vs legal ONIX), `metalClawProbe.py` (dense 227-366/229-368,
  metallic + loop-SE tasks, claw/lunge/shake sprite families, registers,
  palettes, hardware OAM, se1 audio, RGB), `metalClawPortable.ts`, the two
  scene-on-portable-evidence/v1 fixtures, and `metalClaw.test.ts` +
  `metalClawEvidence.test.ts`. No new art: CHARMANDER back/front from the
  shared battle-back/opponent-front assets, claw-slash art reused from
  dragon-claw.json.
- **Measured:** player-back frames 227-366 and opponent-front frames 229-368,
  both **140/140 twice fresh** via the portable (reducer-vs-oracle lunge /
  shake / slash semantic identity also 140/140 each run). Evidence
  `db095360…`/`21a1e2ae…`, RGB `55859416…`/`0ff639d1…` reproduce the fixture
  pins exactly. **Pipeline facts:** the claw-slash sprite spawns at the
  target's `BATTLER_COORD_Y_PIC_OFFSET`, which for a player-back target is
  the OAM centre +8 (ONIX player-back = 88, not 80 — this is why the
  ironDefense-opponent fixture's `animationCenter {72,80}` was never
  position-sensitive for that move). The two strikes' slash groups overlap
  for 7 frames (the first group's 21-frame lifetime spans the second
  strike's spawn), and the shake coordinate alternates in pairs (not
  alternating single frames as the DRAGON_CLAW shake's own probe-derived
  table does).
- **Next:** continue the zero-new-component Level-50 ladder (17 remain).
- **Notes:** the damage/HP bar resolution happens after the animation window
  (opponent stays 110/110 throughout), so the field profile carries the
  pre-drain HP as an immutable input. No boundary widening, no new
  unsupported barriers. `factoryAnimationInventory.test.ts` summary pin
  moved 110→111 / 166→165 with the promotion.

## Supervisor wind-down — three moves promoted in one session: STEEL_WING, TAIL_WHIP, IRON_DEFENSE (2026-08-04 evening session)

- **State:** move coverage went **107 exact / 1 partial → 110/276 exact, 0
  partial, 0 staged, 166 unsupported** across three verified DeepSeek rounds.
  `animation-main` is committed and green: wind-down full suite **725 files /
  6,940 passed / 1 skipped**, build green, coverage validator green, no worker
  worktrees or branches left. Session baseline was the fast-forwarded master
  fold (0bbefdda), suite 721/6,927.
- **Did:** (R1) STEEL_WING partial→exact — worker hit the 60-min cap with all
  edits complete but uncommitted; supervisor salvaged, re-verified fresh
  (197/197 both orientations, hashes reproduce), wrote the ledger entry, and
  committed. Two diagnosis corrections landed: ages 144-155 were gust-overlap
  **draw order** (palette-fade hypothesis disproved by probe), 181-185 the Q8.8
  slide-out terminal 23. (R2) TAIL_WHIP new-move exact, 77/77 both
  orientations twice-fresh; new pipeline fact: elliptical-task battler offsets
  render **two** displays behind the dense index (vs. the one-display send-out
  latch). (R3) IRON_DEFENSE new-move exact, 101/101 both orientations
  twice-fresh; `AnimComplexPaletteBlend` BG-only white pulse transcribed with
  displayed 8/9/10-frame asymmetry. Every round independently re-verified by
  supervisor fresh portable runs before merging.
- **For the main program:** three coverage promotions moved the
  `factoryAnimationInventory.test.ts` summary pin (now 110 exact / 166
  unsupported) — the fold should expect that file to move with every
  promotion. R1's salvage briefly left `animation-main` full-suite-red on
  exactly that pin (caught and repinned in R2); supervisor-side lesson
  recorded: post-promotion verification must include the inventory pin, not
  only smoke+focused.
- **Next:** continue the zero-new-component Level-50 ladder (18 moves remain
  after this session — cheapest next: METAL_CLAW carrier CHARMANDER record
  88, AGILITY carrier LEDYBA record 40; supervisor analysis joins
  ANIMATION_COVERAGE.json exact entries against
  `battle-animation-components.json`).
- **Notes:** R2's coverage promotion rewrote `ANIMATION_COVERAGE.json`
  wholesale (unicode-escape normalization; verified semantically lossless —
  exactly one entry added, all others parse-identical), so blame on that file
  resets at ff5f0bb7. Worker rounds cost ~$0.15-0.18 each at 40-60 min wall.
  Oracle-freshness FAIL at session start was again the docs-only false
  positive (single NOTES.md harness commit).

## MOVE_IRON_DEFENSE closed — 101/101 both orientations twice-fresh, promoted to exact (2026-08-04 evening)

- **State:** IRON_DEFENSE (new move) → **exact**. Move coverage: **110/276 exact,
  0 partial, 0 staged, 166 unsupported**. Both fixtures pin
  `framebufferMatching: 101` with status `exact`.
- **Did:** full new-move acceptance, **zero new source components**. The script
  is `loopsewithpan SE_SHINY` + non-permanent `metallic_shine` (the accepted
  HARDEN body, reused unchanged) + one BG-only `complex_palette_blend`
  (selector F_PAL_BG, delay 8, num_blends 2, RGB_WHITEALPHA, blend_y 14 → 0).
  Landed the reducer (`src/animation/ironDefense.ts`): `complexPaletteBlendAtAge`
  transcribes `AnimComplexPaletteBlend` (`battle_anim_normal.c:344-405`) as a
  white 14 → 0 → 14 → restore RAM pulse at creation-relative ages 0/8/17/27,
  and the whole move-owned body trails the shine by one tick
  (`IRON_DEFENSE_BLEND_START_AGE=1`, probe-derived). Cloned HARDEN's Scene-ON
  seam + draw case for the CLAMPERL→ONIX pair, drawing the white pulse on the
  battle-bg palette banks while keeping the grayscale attacker and unblended
  metal palette (F_PAL_BG never touches OBJ/bank-8). No new art: CLAMPERL
  back/front from the shared battle-back/opponent-front sprite assets. Added
  the two mechanic scenarios (FRONTIER_MON_CLAMPERL record 134, all four slots
  IRON_DEFENSE, vs legal ONIX), `ironDefenseProbe.py` (dense 215-315 window,
  metallic + Task_LoopAndPlaySE + blend sprite + BG palette + registers + RGB),
  `ironDefensePortable.ts`, the two scene-on-portable-evidence fixtures, and
  `ironDefense.test.ts` + `ironDefenseEvidence.test.ts`.
- **Measured:** player-back frames 215-315 and opponent-front frames 215-315,
  both **101/101 twice fresh** via the portable. Evidence
  `6da0086c…`/`4390cfb3…`, RGB `a2b2a60a…`/`32987f6e…` reproduce the fixture
  pins exactly. **Display model:** the blend sprite is created one engine-age
  tick after the shine's first step and its `gPlttBufferFaded` writes latch one
  display behind, so the displayed pulse runs at ages 2..9 / 10..18 / 19..28 /
  29+ (the source's 8/9/10-frame asymmetry from the delay=8 countdowns); the
  metalled bg keeps its own palette because `GetBattlePalettesMask(TRUE,…)` for
  F_PAL_BG selects only banks 1-3, never the metal bank.
- **Next:** next zero-new-component Level-50 move (20 remain per supervisor
  component analysis).
- **Notes:** the opponent-front CLAMPERL carries no idle-bob residual
  (`x2=0`), so the draw needs no front idle offset for the attacker; the ONIX
  target keeps its `speciesFrontIdleRestOffset` x2=1. The attacker's Defense
  stage is already +2 at the first dense frame (stat stage applies before the
  animation) and is treated as an immutable field input, never advanced by the
  reducer. No boundary widening, no new unsupported barriers.

## MOVE_TAIL_WHIP closed — 77/77 both orientations twice-fresh, promoted to exact (2026-08-04 evening)

- **State:** TAIL_WHIP (new move) → **exact**. Move coverage: **109/276 exact,
  0 partial, 0 staged, 167 unsupported**. Both fixtures pin
  `framebufferMatching: 77` with status `exact`.
- **Did:** full new-move acceptance, **zero new source components** (the
  entire script is `loopsewithpan SE_M_TAIL_WHIP` + one
  `AnimTask_TranslateMonEllipticalRespectSide(ANIM_ATTACKER,12,4,2,3)`).
  Landed the reducer (`src/animation/tailWhip.ts`), Scene-ON seam route
  (`SceneOnTailWhipConfig/View`), `battleScene.ts` draw case (Ponyta attacker
  at spriteCorner + displayed elliptical offset over Onix; Ponyta back/front
  from the shared gen assets — no new art), the two mechanic scenarios
  (FRONTIER_MON_PONYTA_1 record 191, all four slots TAIL_WHIP, vs legal
  ONIX), `tailWhipProbe.py`, `tailWhipPortable.ts`, two
  scene-on-portable-evidence/v1 fixtures, and `tailWhip.test.ts` +
  `tailWhipEvidence.test.ts`.
- **Measured:** player-back frames 73-149 and opponent-front frames 77-153,
  both 77/77 twice fresh via the portable — evidence
  `24e2ecd6…`/`5a1a6ae1…`, RGB `3a1363ef…`/`02197a46…` reproduce the fixture
  pins exactly. **Key mechanism:** the battler x2/y2 passes the elliptical
  task → software sprite → OAM pipeline **two displays behind** the dense
  index (the oracle's framebuffer shows software-OAM step θ=8 on dense age 3,
  not 1), so the reducer's displayed angle is `8*(age-1)` for ages 2..63;
  loop-1 wrap renders the origin at age 33, and the terminal θ=240 (age 63)
  precedes the θ=248 wrap that resets and destroys the task (no trailing
  offset frame). The probe-derived frames are the `animationBoundaryRatchet`
  and gameplay-stability pins.
- **Next:** MOVE_IRON_DEFENSE (CLAMPERL record 134) — per supervisor
  component analysis 20 Level-50 moves still need zero new components.
- **Notes:** no `extract*Assets` step (the move spawns no effect sprites — SE
  + mon translation only); enemy shadow stays invisible
  (`SpriteCB_SetInvisible`) across both windows; the Onix target's Defense
  stage is already −1 at the first dense frame (stat stage applies before the
  animation) and is treated as an immutable field input, never advanced by
  the reducer. No boundary widening, no new unsupported barriers.

## MOVE_STEEL_WING closed — 197/197 both orientations twice-fresh, promoted to exact (2026-08-04 evening)

- **State:** STEEL_WING partial → **exact**. Move coverage: **108/276 exact, 0
  partial, 0 staged, 168 unsupported**. Both fixtures now pin
  `framebufferMatching: 197` with status `exact`.
- **Did:** two player-side fixes closed the last 17 divergent frames. (1) Ages
  181-185: slide-back start now derives from the slide-out's actual Q8.8
  terminal (`(682*9)>>8 = 23` player / `−24` opponent floor-shift asymmetry)
  instead of the hardcoded 24 — the reducer renders the oracle's 20,18,16,14,12
  2/frame fall, pinned as `[23,20,…,0]` over ages 179-190 in
  `steelWing.test.ts`. (2) Ages 144-155: the two-gust **overlap draw order** —
  the player orientation draws the index-1 gust first (index-0 frontmost);
  opponent order unchanged. **Diagnosis correction:** the doc's
  "faded-vs-unfaded gust palette base" hypothesis for 144-155 is **disproved**
  — the worker's probe read `gPlttBufferFaded` slot 23 as the unfaded rotated
  gray ramp (no per-channel darkening); the residual was OAM ordering at the
  gust overlap (addendum added to `docs/steel-wing-residual-diagnosis.md`).
- **Measured:** player 180 → **197/197**, opponent **197/197** (no
  regression); twice-fresh post-change — worker runs plus the supervisor's own
  independent fresh pair (evidence `e321040c…`/`7af04b35…`, RGB
  `2f44c811…`/`25c8e06b…` reproduce the fixture pins exactly).
- **Next:** MOVE_TAIL_WHIP (sole Level-50 carrier FRONTIER_MON_PONYTA record
  191; zero new source components), then MOVE_IRON_DEFENSE (CLAMPERL 134) —
  per supervisor component analysis, 20 Level-50 moves currently need zero new
  components.
- **Notes:** the DeepSeek worker round hit its 60-min cap (exit 124) after
  completing every code/fixture/test edit and its own twice-fresh player +
  once-fresh opponent measurement, but before the ledger entry and commit.
  Supervisor salvaged the uncommitted worktree state and verified from
  scratch: both portables fresh (197/197 + hashes), focused 4 files / 20
  tests, typecheck, smoke 347/347 — then committed. No boundary widening, no
  new barriers.
