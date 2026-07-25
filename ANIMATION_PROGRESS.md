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

## SHADOW_PUNCH: `AnimTask_AttackerPunchWithTrace` RAM-probed and ported (shadowPunch.ts), Scene-ON wiring + dense comparators NOT done this step (2026-07-25)

**Verdict: the move's one unproven component is now a Tier-1-pinned, RAM-
proven port; the render-seam wiring and dense pixel acceptance the step
brief asked for did not fit in this session's remaining budget after the
probe. No coverage entry added — per this lane's own rule, code alone
(even RAM-proven code) never promotes a move's status. Honest partial, not
a blind fit: everything shipped is either read straight from RAM or reused
verbatim from an already-exact-proven sibling.**

**Extractor decode.** `Move_SHADOW_PUNCH` (`battle_anim_scripts.s:4308-
4327`) decoded into `battle-move-anim-scripts.json` (additive; the
byte-identical-reproducibility test and `factoryAnimationComponents.test.ts`
stayed green). Confirmed the script is exactly as the prior session
scoped it: linear, every op except `createvisualtask
AnimTask_AttackerPunchWithTrace` already proven by FIRE_PUNCH/ICE_PUNCH/
THUNDER_PUNCH/EXTREME_SPEED.

**Assets.** HAUNTER front+back sprites added to `extract-battle-mon-pics.ts`
(mirrors the CHARMELEON precedent). `BG_GHOST` (tile/palette/tilemap,
`fadetobg`'s own new bg id — a single tilemap, unlike EXTREME_SPEED's
side-selected pair) extracted fresh (`extract-shadow-punch-assets.ts`).

**RAM probe (`tools/probe/dump-shadowpunch-full.py`), both attacker
orientations** (staged `FRONTIER_MON_HAUNTER_1`-vs-ONIX via `mechanicLab
overrides.parties`, `tools/battle-lab/mechanic-shadow-punch-{haunter-onix,
onix-haunter}.json`). Found the real mechanism precisely, corrected one
citation error along the way (the task is `battle_anim_mons.c:2392-2496`,
not `battle_anim_fight.c` as the prior session's scoping note said —
confirmed directly via `nm` against the pinned elf, not assumed):

- The task slides the attacker's own sprite `x2` out over 5 ticks then back
  over 4 (genuinely asymmetric — the source's own "do same number of traces
  as before" comment doesn't match its actual `tCounter` bookkeeping),
  spawning one darkened(`BlendPalette` coeff 13 toward `RGB_BLACK`) +
  translucent (`CloneBattlerSpriteWithBlend` sets `ST_OAM_OBJ_BLEND`,
  `setalpha 9,8`) afterimage clone per tick — 9 total, each self-destroying
  exactly 8 ticks after its own creation.
- A real vanilla artifact, confirmed on hardware, not a bug: task setup runs
  `gSprites[attacker].x2 -= tBattlerSpriteId` — subtracting the attacker's
  own SPRITE SLOT INDEX (6-8 in the probed fixtures) from `x2` as if it were
  a pixel offset, applied once and never undone. RAM-confirmed directly
  (both orientations) that this offset is baked into every attacker/clone
  position for the task's whole life.
- `tMoveSpeed` is +8 player-side, -8 opponent-side (`GetBattlerSide`);
  `tPriority` is 2 when the attacker's own subpriority is 20 or 40, else 3 —
  RAM-confirmed both ways (player-side battler-0 subpriority 30 → priority
  3; opponent-side battler-0 subpriority 40 → priority 2).
- Derived a closed form for the whole attacker-offset/clone schedule (no
  lookup table needed — verified against every probed tick both
  orientations, see `shadowPunch.ts`'s own module doc for the formula).
- The move's own `fadetobg`/`restorebg` `BLDY` timeline (mechanism already
  exact-proven via MOVE_EXTREME_SPEED — only this move's own timing anchors
  are new) came back clean and RAM-exact except a genuine 3-tick startup
  hold at `bldy=1` on the `restorebg` ramp only (plausibly `Task_FadeToBg`'s
  own state-2 "recompute the default BG from scratch" costing extra setup
  frames) — encoded as a literal per-tick table rather than fit, since the
  window is short and the anomaly doesn't reduce to a clean formula.
- Fist/hitsplat/target-shake anchor ages read directly off RAM; the target
  shake reuses the already-ported `shakeMon.ts` primitive verbatim
  (`AnimTask_ShakeMon, ANIM_TARGET, 3, 0, 6, 1`).

**Port.** `src/engine/shadowPunch.ts` — the attacker-offset/clone closed
form, the BLDY table, and every anchor age above. `tests/shadowPunch.test.ts`
pins the closed form against every RAM-probed tick (ages 0-16) for BOTH
orientations, plus the BLDY table and the priority rule — 6 new tests, all
green.

**NOT done this step — the named remainder.** Wiring `shadowPunch.ts`
through the Scene-ON render seam (`battleScene.ts`'s
`state.config.move === "SHADOW_PUNCH"` dispatch + a `sceneOnShadowPunchView`
projection in `sceneOnPresentation.ts`, mirroring the DRAGON_RAGE/
EXTREME_SPEED precedent — healthbox/message-text draw calls are fully
generic (`composeOpponentHealthbox`/`composePlayerHealthbox` take a plain
`name: string`, no species union to extend) and the translucent-clone draw
call already exists verbatim (`drawSpriteSheetBlendedOverFb`, QUICK_ATTACK's
own precedent) — and the dense pixel comparators (both orientations, twice
each) the step brief requires for any coverage claim. Ran out of session
budget after the RAM-probe-and-port stage; stopping here with a clean,
tested port is the honest outcome rather than rushing the wiring
uncomparatored. `blend_color_cycle`'s stretch enumeration (this step's own
"only if 1-4 land with ≥10 min spare" clause) was not reached either, since
1-4 themselves didn't land.

**Coverage:** no entry added for `MOVE_SHADOW_PUNCH` — no dense pixel
evidence exists yet, so per this lane's own rule ("shared code alone never
promotes coverage") it stays unsupported in `ANIMATION_COVERAGE.json`.

**Evidence.** `npm test` 2218/2218 (2212 + 6 new). `npm run build` green.
Both RAM probes reproducible (`/tmp/shadowpunch-{haunter-onix,onix-haunter}.
json`, not committed — scratch).

## Current handoff

- **State:** **19 exact / 2 partial / 255 unsupported.** (Unchanged this
  step — SHADOW_PUNCH's RAM-probed port above doesn't move a move's status
  by itself; DRAGON_RAGE stays CLOSED/parked at 149/150 `partial`, not
  touched this step.)
- **Did:** Assigned to prove `MOVE_SHADOW_PUNCH` to honest coverage status
  (the prior session's named next representative for the now-dissolved
  BG-swap-pipeline track). Extractor-decoded its script, extracted HAUNTER
  front/back sprites and the `BG_GHOST` bg asset, then RAM-probed the
  move's one unproven component (`AnimTask_AttackerPunchWithTrace`) both
  attacker orientations via a staged `mechanicLab overrides.parties`
  HAUNTER-vs-ONIX fixture, corrected a citation error along the way (the
  task lives in `battle_anim_mons.c`, not `battle_anim_fight.c`), derived a
  closed-form attacker-offset/clone schedule (including a real vanilla
  `x2 -= tBattlerSpriteId` quirk), and ported it into `shadowPunch.ts` with
  6 Tier-1 tests pinning every RAM-probed tick both orientations. Did NOT
  reach the Scene-ON render-seam wiring or the dense pixel comparators the
  step's own acceptance bar requires — see the dated section above for the
  full account and the exact remainder.
- **Evidence:** `npm test` 2218/2218, `npm run build` green.
- **Next:** Wire `shadowPunch.ts` through the Scene-ON seam
  (`battleScene.ts`'s `state.config.move === "SHADOW_PUNCH"` dispatch + a
  `sceneOnShadowPunchView` projection, mirroring DRAGON_RAGE/EXTREME_SPEED
  — the healthbox/message-text/translucent-clone draw calls it needs
  already exist generically, confirmed this step), then run the dense
  pixel comparators (both orientations, twice each) the step brief
  requires before adding any `ANIMATION_COVERAGE.json` entry. MIST_BALL's
  own remaining blockers are unchanged and still open: `waitforvisualfinish`
  sprite-lifetime tracking, `AnimComplexPaletteBlend`, `AnimTask_MistBallFog`'s
  own BG1 pipeline (a genuinely new subsystem), and generalizing
  `AnimTask_BlendBattleAnimPal` past its one DRAGON_BREATH instance. The
  `dragon-fire-projectile` siblings FIRE_BLAST and FIRE_SPIN also remain
  open (FIRE_BLAST's own real surface is `SoundTask_FireBlast` +
  `gFireBlastCrossSpriteTemplate`/`gFireBlastRingSpriteTemplate` sprites).
  `blend_color_cycle` (28 Level-50 moves, the current top no-representative
  family) is still unenumerated.
- **Housekeeping:** moved the "DRAGON_RAGE rungs 1-3" dated section to
  `ANIMATION_PROGRESS-archive.md` to make room for this step's section
  while keeping ~3 live (AGENTS.md's convention); DRAGON_RAGE's own
  "rung 6/7" and the BG-swap-pipeline dissolution section stay live
  alongside this one.
