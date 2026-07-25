# Animation coverage

Living status for the Battle Scene ON lane. Source scope is generated in
`factory-animation-inventory.json`; the script dependency graph is generated
in `battle-animation-components.json`. Evidence, move acceptance, and
non-exclusive component tracks live in `ANIMATION_COVERAGE.json`. Run
`npm run animation:coverage` for the working view.

## Priority and acceptance

1. Level 50 Factory: all **276** reachable, executable moves (`MOVE_NONE`
   empty slots are excluded).
2. Open Level additions: **1** move (`OUTRAGE`), plus a geometry audit of
   **8** exclusive species across **32** sets and **37** overlapping moves.
   Overlapping moves retain Level 50 evidence unless that audit finds a real
   variant dependency.
3. The **77** remaining Emerald moves, after Factory coverage.

Moves remain the acceptance unit. Components—scripts, assets, sprites, tasks,
and visual commands—are the implementation unit. A track may overlap other
tracks; FIRE PUNCH can belong to both punch and fire work. Prove a component
with one representative, batch-check siblings, and keep separate move-level
oracle evidence. Do not build one absolute-tick timeline per move.

Move acceptance covers the move-owned animation body and its evidence-required
geometry variants. Generic hit reactions, HP/result presentation, statuses,
held-item use, and controller/menu handoffs are reusable presentation
components with independent coverage; they neither block nor promote a move
animation. A status caused by a move is not part of that move's animation.

- `staged`: a deterministic matching ON-oracle/app case exists.
- `partial`: a meaningful dense window is green, but portability or a required
  variant remains.
- `exact`: the complete dense animation window is green through the shared
  presentation seam and all source- or evidence-required variants are covered.
- No entry means unsupported.

Start with one representative attacker/target. Add variants only when source
inspection or comparison identifies a dependency: attacker side, front/back
orientation, battler dimensions or anchors, palette/silhouette, transformed or
substitute state, multi-turn/multi-hit state, or another explicit script input.
Every status needs a committed ON-profile trace; `exact` cannot retain a known
remainder.

## DRAGON_RAGE rungs 1-3: render-age-1 guard fixed, fire-spit sheetFrame off-by-one root-caused from source, fire-plume window disciplined-probed but not resolved — 127/150 → 139/150, stays `partial` (2026-07-25)

**Verdict: two of the three named residuals fixed on hard evidence (one of
them overturning the prior rung's own "rounding question" hypothesis); the
third (fire-plume) got a genuine disciplined probe cycle — colors dumped,
RAM read, two candidate fixes tried and both rejected on evidence — but no
fix survived, so it stays named, not swept. `MOVE_DRAGON_RAGE` stays
`partial`, a strictly smaller remainder than last rung's.**

**Rung 1 — render-age-1 creation-guard artifact, fixed.** Pixel-dumped
frame 90 (render age 1) of the player-attacker dense window directly: the
oracle photo already shows the attacker's `AnimTask_ShakeMon` offset
applied one tick before the lag-2 model's own `renderTick < creationTick`
guard clears — a shifted-tileset color map confirmed the two images agree
everywhere except a small silhouette region matching exactly a 2px
`yOffset` shake state the app predicts as zero. `shakeMonOffsetAtRenderTick`
now special-cases `renderTick === creationTick - 1` to return the raw
`{xOffset,yOffset}` (the RAM-invisible collapsed `sequence[0]` write,
framebuffer-visible for exactly that one transient tick) instead of zero;
every other pre-creation tick is unaffected. Tier-1 pinned
(`tests/dragonRage.test.ts`).

**Rung 2 — fire-spit "rounding" residual, root-caused as a real bug, not a
rounding question.** Per the step brief's own probe-first method,
pixel-dumped the render-age-86-96 diff colors *first*: they were genuine
small-ember fire-ramp colors, but the oracle's true fire-spit silhouette
was consistently LARGER than the app's, correlated with WHICH of the 3
animation frames was active (frame 0 undercounted ~5x, frame 2
overcounted) — a shape signature, not a rounding/timing one, so the step
brief's own "further `drawSpriteSheetAffineRotate` rounding question"
hypothesis is falsified and recorded as eliminated. Source proof
(`reference/pokeemerald/src/battle_anim_dragon.c:126-131`):
`sAnim_DragonRageFire` is `ANIMCMD_FRAME(16,3),(32,3),(48,3),JUMP(0)` —
byte-identical tile offsets to `sAnim_DragonBreathFire_0` (`:47-52`), the
already-pixel-exact DRAGON_BREATH precedent, which `dragonBreath.ts`
already reads with a `+1` tile-row-block shift (RAM's own `animCmdIndex` is
an index into the 3-entry ANIMCMD array, not a tile-row-block number — tile
offsets 16/32/48 are blocks 1/2/3, block 0 belongs to a different animation,
`sAnim_OutrageOverheatFire_0`). `dragonRage.ts`'s own `sheetFrame` formula
was missing that shift, silently picking the wrong, unused-by-this-
animation tile block for frame 0. Fixed the formula and the two Tier-1
assertions that had pinned the old (wrong) `sheetFrame === animCmdIndex`
equality to the source-justified `animCmdIndex + 1`; fire-plume's own
`sheetFrame` is untouched (its own animcmd table legitimately starts at
tile 0, a separate asset). Dense sweep: every render age 86-96 frame now
matches, zero regressions.

**Rung 3 — fire-plume window (render ages 98, 105-114): disciplined-probed,
not resolved, negative results recorded.** Two sub-cases, investigated
independently:

- **Render age 98** (the exact tick both the target `AnimTask_ShakeMon` and
  fire-plume spawn 0 are created): a 1598px mismatch confined exactly to
  ONIX's own sprite box, using ONIX's own grayscale palette — NOT
  plume-palette colors (the step brief's own hypothesis for this family,
  checked directly and not confirmed). RAM-probed the target sprite's full
  state (position, x2/y2, animNum, animCmdIndex, invisible, subpriority,
  matrixNum) across the surrounding ticks: all clean and unchanged, so the
  mismatch isn't explained by any currently-modeled variable. Confirmed
  deterministic (byte-identical mismatch on a second, independent fresh
  oracle run). Not root-caused.
- **Render ages 105-114** (10 frames, 1px each): confirmed via direct pixel
  reconstruction (manually sampling each candidate spawn's own tileset at
  its RAM-read position/frame) to be a real tie-break bug between two
  overlapping same-subpriority fire-plume spawns — but not a single-knob
  fix. Reversing the paint order within each subpriority group fixes the
  105-113 overlap (spawn 0 vs spawn 1) but breaks a *different*,
  previously-clean overlap at render ages 114-118/123 (spawn 1 vs spawn 4) —
  tried, net smaller improvement, reverted, not shipped. A uniform
  fire-plume lag of 0 was also tried (ages 98-144 regress hard, 112/150,
  much worse) and rejected; lag 1 stays committed. The age-114 case further
  shows spawn 1's own rendered sheet frame sits one step behind what the
  uniform 1-tick lag model predicts at its OWN specific frame-boundary
  transition, while the same lag is exactly right for every other
  simultaneously-active spawn — a genuinely compound (z-order tie-break
  *and* a per-spawn frame-transition detail) residual, not a single
  constant to sweep. Isolating it cleanly needs a fixture where individual
  plume spawns don't spatially overlap each other, out of this rung's
  budget.

**Rung 4 — not reached.** Player orientation is 139/150, not the required
150/150, so per the step brief's own gate the opponent-attacker orientation
dense run and CHARMELEON's `ANIM_BACK_AND_LUNGE` front-anim port were not
attempted this step.

**Coverage:** `MOVE_DRAGON_RAGE` stays `partial` — `remaining` updated to
139/150 with the narrowed, single-family (fire-plume) residual.

**Evidence.** `npm test` 2209/2209 (2207 + 2 new: the rung-1 transient pin
and the rung-2 `sheetFrame` shift assertions). `npm run build` green. Both
fixes reproduced against a fresh, independent oracle capture (not just the
cached one used to iterate) — 139/150 byte-identical both times.

## DRAGON_RAGE rung 6/7: fire-plume z-order fixed via `gMain.oamBuffer` RAM probe (139/150 → 149/150); age-98 ONIX-silhouette anomaly disciplined-probed, both named candidates eliminated, lands `partial` with a single-frame remainder (2026-07-25)

**Verdict: the fire-plume family's tie-break residual (render ages 105-114)
is FIXED on direct hardware evidence, not fitted — the step's own two
sanctioned instruments (RUNG 1's `gMain.oamBuffer` probe, RUNG 2's VRAM/blend
probe) were both applied exactly as specified. RUNG 1 landed a real fix.
RUNG 2's probe cycle completed cleanly but named no fix (both brief
candidates eliminated by hard evidence) — per the step's own PARK RULE,
`MOVE_DRAGON_RAGE` stays `partial`, now with a single remaining frame.**

**Rung 1 — plume-vs-plume z-order ties, FIXED.** Wrote
`tools/probe/dump-dragonrage-oam.py` (ISSUES #32 lineage: the same
`gMain.oamBuffer`-array-position instrument `dump-turn9-clone-oam.py`/
`dump-aerialace-oam.py`/`dump-quickattack-hitsplat-oam.py` already used,
matching each live fire-plume/target sprite's own OAM attrs against the
128-entry composited buffer to find its real final position — lower
position = lower hardware OAM index = drawn on top, this codebase's already-
established `AddSpritesToOamBuffer` convention). Ran it across RAM ticks
183-206 (render ages 94-117) against the committed CHARMELEON-vs-ONIX
fixture. Cross-referencing each RAM slot's `(x,y)` against
`DRAGON_RAGE_FIRE_PLUME_SPAWNS`' own declared offsets gave an exact,
unambiguous spawn-index↔slot mapping for all 7 spawns observed in this
window. The 8 spawns share only 2 distinct subpriorities
(`targetSubpriority ± 2`), so cross-group order was never the problem
(confirmed correct already); the real-hardware order WITHIN each group,
read directly off the buffer at every tick both members of a pair were
alive, resolved to one consistent, source-consistent rule with zero
exceptions: primarily sort by absolute screen Y (higher Y wins, drawn more
in front — the ordinary `SortSprites` same-priority/different-Y tie-break);
ONLY on an exact Y tie (this move's own script has two: spawns 0/4 share
y-offset 0, spawns 2/6 share y-offset 25) does the EARLIER-created spawn
win instead (spawn 0 beats spawn 4 at every tick from RAM 195-206; spawn 2
beats spawn 6 at every tick from RAM 204-206) — matching this codebase's
already-established "ascending creation order survives an exact tie"
convention elsewhere (§7.26/27, `spriteOrder.ts`'s own module doc), NOT the
previously-shipped code's raw script-order paint loop, which was ALSO wrong
for at least one non-tied pair (spawn 3's higher Y should beat spawn 4's,
but script order painted spawn 4 after spawn 3). Per the brief's own
instruction (encode per-instance params for exactly these plume pairs, not
a whole-history `sSpriteOrder` simulation), landed `orderFirePlumesForDraw`
(`dragonRage.ts`) — a plain `(y, then descending spawnIndex)` comparator,
not a persistent scheduler — replacing the naive script-order draw loop in
`battleScene.ts`'s DRAGON_RAGE case. Tier-1 pinned directly against the two
RAM-read tie orderings plus a full-group ordering check (`tests/
dragonRage.test.ts`, 3 new tests). Dense sweep: **139/150 → 149/150** (every
render age 105-114 now clean, zero regressions), reproduced byte-identical
on two independent fresh oracle runs (determinism confirmed).

**Rung 2 — age-98 ONIX-silhouette anomaly, disciplined-probed, no fix
survived.** Extended the same instrument class with a second targeted probe,
`tools/probe/dump-dragonrage-onix-vram.py`, reading ONIX's own OBJ VRAM tile
range (`tileNum=473`, 4bpp, 64 tiles/2048 bytes) and hashing it every tick
from RAM 80 through 190. Both of the step brief's own named candidates were
checked directly and BOTH eliminated:
- **(a) Runtime VRAM overwrite (`LoadBallGfx` precedent):** the VRAM hash is
  completely STABLE and unchanged across the entire target-shake-creation
  window (RAM 186 onward) — the only hash change in the whole probed range
  is one unrelated `tileNum` swap at RAM tick 80→82 (ONIX's send-out
  graphic settling in), long before this move even starts. No overwrite
  occurs anywhere near the residual's own tick. Eliminated.
- **(b) OBJ-over-OBJ blend-to-BG compositing gap (#112 precedent):** the
  existing `dump-dragonrage-oam.py` probe's `BLDCNT`/`BLDALPHA` reads are
  `0x0`/`0x0` (no color special effect enabled at all) at every tick in this
  window, and ONIX's own OAM `affineMode` is `0` (no affine transform, ruling
  out a scale/rotate resampling explanation too) throughout. Eliminated.

With both named mechanisms ruled out, re-examined the mismatch itself
directly (`tools/compare` diff, not committed — scratch): 1598px confined
exactly to ONIX's own sprite bounding box (x149-204, y12-73), every
mismatched color one of ONIX's own known palette shades swapping between
NEARBY screen positions (e.g. `(222,214,214)` at one pixel, `(189,181,181)`
— another real ONIX shade — right next to it and vice versa) — the
signature of a small spatial misregistration of the whole sprite for this
one tick, not a wrong tile or a color-math bug. The target sprite's own
already-modeled state (position, x2/y2, animNum, animCmdIndex, invisible,
subpriority, matrixNum, and now also affineMode) is RAM-confirmed clean and
matches this port's own prediction through the whole window — this is the
SAME finding the prior rung already reached, now extended to rule out the
two remaining named hypotheses too. **No fix shipped**: per this run's own
standing policy (documented no-fix beats a blind fit), this residual needs a
different investigative angle than RAM-state/VRAM/IO-register comparison —
named here, not chased further. Candidate for a future session: a fixture
with less concurrent sprite creation at this exact tick (both the target
shake task AND fire-plume spawn 0 are created simultaneously here), to
separate a genuine engine gap from a possible emulator/hardware sub-frame
ordering effect this per-tick discrete model can't represent at all.
Confirmed deterministic (byte-identical mismatch on a second independent
fresh oracle run).

**Coverage:** `MOVE_DRAGON_RAGE` stays `partial` — `remaining` updated to
149/150 (up from 139/150), a single residual (render age 98).

**Evidence.** `npm test` 2212/2212 (2209 + 3 new: `orderFirePlumesForDraw`
pinned against the RAM probe). `npm run build` green. Dense sweep reproduced
byte-identical on two independent fresh oracle runs.

## BG-swap pipeline (restorebg/waitbgfadein/waitbgfadeout): assigned premise dissolved by a real extractor bug, not a port — MOVE_EXTREME_SPEED is already the exact representative; MIST_BALL's fog needs a different, still-open mechanism (2026-07-25)

**Verdict: the step's own goal — "open the top component family with NO
exact representative" — turned out to rest on a tooling bug, not a missing
port. Fixed the bug (real, tested, committed); the family now correctly
shows an exact representative that was always there. No new engine code
lands this step; the corrected enumeration plus a precisely-scoped next
representative (`MOVE_SHADOW_PUNCH`) is the deliverable, matching the step
brief's own STOP THRESHOLD sanction ("a precise map... is itself the
deliverable").**

**The bug.** `tools/extract/extract-battle-animation-components.ts`'s
`controlCommands` set spelled the two conditional-jump opcodes
`"jumretfalse"`/`"jumrettrue"` — missing the `p` — against the real macro
names `jumpretfalse`/`jumprettrue`
(`reference/pokeemerald/asm/macros/battle_anim_script.inc:275-284`). Since
neither string ever matched, `referencedBlocks()` never followed either
branch, so any script block reachable ONLY through one of these two jumps
was silently dropped from that move's `componentIds` — undercounting, not
overcounting, so the leaderboard's "no exact representative" claims were
false positives, not false negatives. 21 real uses of these two opcodes
exist in `battle_anim_scripts.s`. Fixed the typo, re-ran the extractor
(`--out` byte-identical-reproducibility test still green) and the
downstream `extract-level50-move-parameterization.ts` (joins on this
file). **12 moves gained real, previously-hidden components** (935→971
total components, 3190→3269 dependency edges); the pinned summary counts
in `tests/factoryAnimationComponents.test.ts` were updated to match.

**The one that matters: `MOVE_EXTREME_SPEED`.** Its script
(`battle_anim_scripts.s:3392-3434`) branches on
`jumprettrue ExtremeSpeedAgainstPlayer` before reaching `ExtremeSpeedContinue:`
— the label holding `waitbgfadeout`, `createvisualtask
AnimTask_StartSlidingBg`, `waitbgfadein`, and (after the move body) the
exact `restorebg` / `waitbgfadeout` / `setarg` / `waitbgfadein` closing
sequence. All of that was invisible to the graph before this fix.
EXTREME_SPEED is already `exact` in `ANIMATION_COVERAGE.json`, and its own
coverage note already lists "the opening and restore display latches" and
"BG_HIGHSPEED_{PLAYER,OPPONENT} selection" as dense-verified — i.e. this
move's hand-fit `src/engine/extremeSpeed.ts`
(`extremeSpeedBackgroundAtAge`) already implements and pixel-proves the
whole fade-out/BG-load/fade-in/hold/restore-fade-out/restore-fade-in cycle.
The corrected graph now shows `MOVE_EXTREME_SPEED` with **zero** unproven
components among the restorebg family. Re-running
`npm run animation:coverage` confirms the effect directly: `restorebg`,
`waitbgfadein`, `waitbgfadeout`, `fadetobg`, and `setarg` no longer appear
anywhere in the "components without an exact representative" leaderboard
(replaced by an unrelated set: `blend_color_cycle` 28,
`gHorizontalLungeSpriteTemplate` 19, `AnimTask_ShakeMonInPlace` 14,
`ANIM_TAG_BLUE_STAR`/`gHealingBlueStarSpriteTemplate` 11 each,
`UnsetPsychicBackground` 11).

**Real C-source enumeration of the pipeline** (full read of
`reference/pokeemerald/src/battle_anim.c`, this step's own rung-2
requirement, done via research pass before the bug was found — still the
correct map):
- `Cmd_monbg`/`Cmd_clearmonbg` (`battle_anim.c:591-911`,
  `Task_InitUpdateMonBg`/`Task_UpdateMonBg`/`Task_ClearMonBg`) — paints a
  battler sprite onto a BG layer and tracks it per-frame. **Already fully
  proven**, unrelated to this bug (124+ exact-proved moves).
- `Cmd_blendoff` (`:1036-1041`) — zeroes `BLDCNT`/`BLDALPHA` directly, no
  task. Already proven.
- `Cmd_setarg` (`:1055-1071`) — pure script-parser write to
  `gBattleAnimArgs[argId]`, no BG/task interaction.
- `Cmd_fadetobg`/`Cmd_fadetobgfromset`/`Cmd_restorebg`/`Task_FadeToBg`
  (`:1110-1228`) — the real new subsystem. `Task_FadeToBg` is a 4-state
  machine: fade to black via `BeginHardwarePaletteFade(0xE8,0,0,16,0)`
  (state 0) → while `gPaletteFade.active`, wait → load the new BG
  (`LoadMoveBg(bgId)` or, for `restorebg`'s `bgId=-1` sentinel,
  `LoadDefaultBg()`/`DrawMainBattleBackground()` — **`restorebg` does NOT
  snapshot/restore prior state; it recomputes the map's default BG from
  scratch**, state 2) → fade back in (state 2 continued) → wait, then
  destroy the task (state 3). A single flat `sAnimBackgroundFadeState`
  global (0/1/2) is what `Cmd_waitbgfadeout`/`Cmd_waitbgfadein` poll — not
  a per-task counter.
- `Cmd_waitbgfadeout`/`Cmd_waitbgfadein` (`:1230-1254`) — the two poll
  points on that global.
- `Cmd_changebg` (`:1256-1261`) — synchronous BG swap, no fade, no task.
- `gBattleAnimBackgroundTable[]` (`src/data/battle_anim.h:1596-1625`) is a
  flat `{image,palette,tilemap}` LZ77-pointer table keyed by bg-id
  (`BG_GHOST`=2, `BG_HIGHSPEED_OPPONENT`=9, `BG_HIGHSPEED_PLAYER`=10, etc,
  `include/constants/battle_anim.h:330-338`); `Cmd_monbg`/`Cmd_clearmonbg`
  never touch it — the two pipelines are independent and composable.

Independently, this exact hardware-fade ramp shape (1 BLDY unit per tick,
fade out / hold / fade in / later restore-fade-out / restore-fade-in) is
already hand-derived and pixel-pinned **twice**, completely independently:
`extremeSpeed.ts`'s `extremeSpeedBackgroundAtAge` and `faintAttack.ts`'s own
bldy ramp. Both match the same `BeginHardwarePaletteFade` shape. This is
strong cross-evidence that a shared, parametric module (`durationTicks`
fixed at 16 per `BeginHardwarePaletteFade`'s own literal argument, per-move
start-tick probed) would generalize cleanly — **not attempted this step**
(refactoring two already-exact/partial moves' code carried needless
regression risk against this step's remaining time budget; left as a
bounded, low-risk follow-up, not a new derivation).

**This was never actually MIST_BALL's blocker.** Re-read
`Move_MIST_BALL`'s real script (`battle_anim_scripts.s`, printed directly,
not from memory) end to end: it contains no `restorebg`, `monbg`,
`fadetobg`, `clearmonbg`, `waitbgfadein`, or `waitbgfadeout` anywhere.
`AnimTask_MistBallFog` (`battle_anim_ice.c:1097-1170+`) is a **separate**
mechanism — a task that loads its OWN BG1 tile/tilemap/palette trio
(`gWeatherFogHorizontalTiles`/`gBattleAnimFogTilemap`/`gFogPalette`) and
drives `BLDCNT`/`BLDALPHA` through its own 4-phase state machine directly,
never going through `Cmd_fadetobg`/`Task_FadeToBg` at all. The step brief's
framing conflated the two because both are "background" mechanisms in the
loose sense; they share no code. MIST_BALL's real remaining blockers are
unchanged from the archived rung-3 session: `waitforvisualfinish`
sprite-lifetime tracking, `AnimComplexPaletteBlend` (whole-palette-set
blend gated on `gPaletteFade.active`), `AnimTask_MistBallFog`'s own BG1
pipeline (a genuinely new subsystem, untouched by this step), and
generalizing `AnimTask_BlendBattleAnimPal` past its one DRAGON_BREATH
instance.

**Named next representative for whoever continues this family** (now a
small, well-bounded task, not a new-subsystem port): `MOVE_SHADOW_PUNCH`.
Its script (`battle_anim_scripts.s:4308-4327`) is fully linear — no
branches, so its extracted component list was already accurate before this
fix — and Factory-legal at Level 50 via `FRONTIER_MON_HAUNTER_1`
(`SPECIES_HAUNTER`, moves `{SHADOW_PUNCH, CONFUSE_RAY, SPITE, GRUDGE}` —
its whole kit sits in this family,
`reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h:1256-1262`).
Post-fix, its only unproven component is `task:AnimTask_AttackerPunchWithTrace`
— every other component (`fadetobg`, `waitbgfadein`, `monbg`, `setalpha`,
`clearmonbg`, `blendoff`, `restorebg`, `create_basic_hitsplat_sprite`,
`create_fist_sprite`, `ANIM_TAG_HANDS_AND_FEET`, `ANIM_TAG_IMPACT`,
`AnimTask_ShakeMon`) is already proven by FIRE_PUNCH/ICE_PUNCH/
THUNDER_PUNCH/EXTREME_SPEED. `AnimTask_AttackerPunchWithTrace`
(`battle_anim_mons.c:2392-2496`) is a sprite-clone "afterimage/trace"
effect (not shake, not palette-flash): attacker slides ±8px out over 5
ticks then back over 5, spawning one blended-palette clone sprite per tick
that self-destructs after 8 ticks, then waits for all clones to expire.
Not ported this step — no RAM probe run, no code written; named here as
the concrete next rung (probe HAUNTER's own battler sprite + the clone
slots via a `mechanicLab overrides.parties` fixture, port the trace effect,
generalize the fade-ramp module out of `extremeSpeed.ts`/`faintAttack.ts`,
wire through the Scene-ON seam, dense window both orientations twice).

**Evidence.** `npm test` 2212/2212 (unchanged count — this step's fix is a
reattribution, not new logic; the one touched test updates a byte-count
pin to the corrected, re-verified extraction). `npm run build` green.

## Current handoff

- **State:** **19 exact / 2 partial / 255 unsupported.** (DRAGON_RAGE is
  CLOSED/parked at 149/150 `partial` per this session's own brief — not
  touched this step; see the two dated sections above for its own
  accounting.)
- **Did:** Assigned to open the "BG-swap pipeline"
  (`restorebg`/`waitbgfadein`/`waitbgfadeout`, ~40 Level-50 moves each,
  reportedly with no exact representative) as a named blocker for
  MIST_BALL's fog. Rung 1 (pick representative) surfaced a real bug in
  `tools/extract/extract-battle-animation-components.ts` first: a typo
  (`jumretfalse`/`jumrettrue` vs. the real `jumpretfalse`/`jumprettrue`
  macro names) silently dropped every script block reachable only through
  those two branch ops. Fixed it (12 moves gained real components,
  935→971, 3190→3269 edges) and re-ran the downstream
  level50-parameterization generator. The fix flips the assigned premise:
  `MOVE_EXTREME_SPEED` (already `exact`) turns out to already be the
  pixel-verified representative for this whole family — its own
  `extremeSpeedBackgroundAtAge` already implements the
  fade-out/BG-load/fade-in/restore cycle, just previously mis-attributed
  by the buggy graph. `npm run animation:coverage`'s "no exact
  representative" leaderboard no longer lists this family at all. Also
  confirmed by direct re-read of `Move_MIST_BALL`'s real script that this
  family was never actually MIST_BALL's blocker (it never calls
  `restorebg`/`monbg`/`fadetobg`/either wait op) — `AnimTask_MistBallFog`
  is a separate, still-fully-open subsystem. Full C-source enumeration of
  `Cmd_monbg`/`Cmd_restorebg`/`Cmd_waitbgfadein`/`Cmd_waitbgfadeout`/
  `Cmd_changebg` and `Task_FadeToBg`'s state machine, plus a scoped next
  representative (`MOVE_SHADOW_PUNCH` via `FRONTIER_MON_HAUNTER_1`, one
  remaining unproven component: `AnimTask_AttackerPunchWithTrace`), is
  written into the dated section above. No engine port lands this step —
  see that section for why stopping here (a corrected map plus a
  small, precisely bounded next task) is the right-sized outcome rather
  than rushing a fresh port.
- **Evidence:** `npm test` 2212/2212, `npm run build` green.
- **Next:** Port `AnimTask_AttackerPunchWithTrace`
  (`battle_anim_mons.c:2392-2496`, sprite-clone/trace effect) and wire
  `MOVE_SHADOW_PUNCH` (HAUNTER, Level-50-legal) through the Scene-ON seam;
  optionally generalize the hardware BG-fade ramp out of
  `extremeSpeed.ts`/`faintAttack.ts` into a shared module first (low risk —
  both already independently derive the identical shape). MIST_BALL's own
  remaining blockers are unchanged and still open: `waitforvisualfinish`
  sprite-lifetime tracking, `AnimComplexPaletteBlend`, `AnimTask_MistBallFog`'s
  own BG1 pipeline (a genuinely new subsystem), and generalizing
  `AnimTask_BlendBattleAnimPal` past its one DRAGON_BREATH instance. The
  `dragon-fire-projectile` siblings FIRE_BLAST and FIRE_SPIN also remain
  open (confirmed this step: FIRE_BLAST doesn't use the BG-swap family at
  all — its own real surface is `SoundTask_FireBlast` +
  `gFireBlastCrossSpriteTemplate`/`gFireBlastRingSpriteTemplate` sprites, a
  different, smaller pocket of work).
- **Housekeeping:** moved the two oldest DRAGON_RAGE dated sections
  ("rung 5 remainder" and "idle-motion subsystem") to
  `ANIMATION_PROGRESS-archive.md` to make room for this step's section
  while keeping ~3 live (AGENTS.md's convention); DRAGON_RAGE's own
  "rungs 1-3" and "rung 6/7" sections stay live alongside this one.
