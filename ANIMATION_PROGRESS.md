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

## SHADOW_PUNCH lands `partial` (third session): fixed a cap-kill's broken mid-rework, wired the attacker framebuffer lag, 84/111 + 0/111 across the two orientations — two named in-scope pixel families plus a materially different, unattributed opponent-orientation bug (2026-07-25)

**Verdict: parked, not landed. This was the third and final scheduled session on
this move's dense acceptance; per the step brief a documented resting state is
the required outcome, not a completed pass. The player-attacker orientation is
close (84/111 framebuffer, all component math exact); the opponent-attacker
orientation is not (0/111, plus a real component-level bug) and needs its own
fresh probe next time — do not assume anything found here transfers.**

**Start-of-session state was a broken build**, inherited from the second
cap-killed session's salvaged mid-rework (tip commit `7200300`): `battleScene.ts`'s
SHADOW_PUNCH draw case referenced `attackerView` in the clone/attacker draw
calls but never defined it — `tsc -b` failed with `Cannot find name
'attackerView'` (confirmed by running the build before touching anything).
`npm test` still reported green only because vitest's transform doesn't
type-check and no Tier-1 test exercises this render path.

**Fix.** Defined `attackerView` right after the existing unlagged `view`,
mirroring DRAGON_RAGE's own phase-aware-view precedent
(`battleScene.ts:17033-17063`): `sceneOnShadowPunchView({ ...state, age:
state.age - SHADOW_PUNCH_ATTACKER_FRAMEBUFFER_LAG })`, scoped to only the
attacker/clone draw calls per the constant's own doc comment (already
committed by the prior session with a lag value of 3). `npx tsc -b` clean
after the fix.

**Bisected the lag constant itself before trusting it further.** Since the
comparator's own component check (`view` computed at *raw*, unlagged age)
already matches oracle RAM reads at 111/111 for every dense tick, a nonzero
framebuffer lag was not obviously justified. Swept
`SHADOW_PUNCH_ATTACKER_FRAMEBUFFER_LAG` through 0/1/2/4 against the
player-attacker fixture: all four values produced a byte-identical 84/111 —
lag in this small range has **zero effect** on this fixture's remaining
mismatches (lag=20 does move the count, and only for the worse, confirming
the mechanism works but isn't the active variable here). Kept the
prior session's committed value (3) since it's harmless and its own doc
cites a direct RAM-pixel justification from a narrower comparison this
session didn't re-run; the remaining mismatches below are a different bug
class entirely.

**Ran both dense comparators** (`npx tsx tools/compare/shadowPunchPortable.ts
<fixture>`, both fixtures under `tools/compare/fixtures/shadow-punch-*.json`)
and attributed every remaining mismatch by mismatch-string/bbox before
touching code further (no blind fits attempted).

**Player-attacker orientation (`shadow-punch-player-haunter-opponent-onix.json`):
component 111/111, framebuffer 84/111.** Three disjoint mismatch families,
all named in `ANIMATION_COVERAGE.json`'s new entry with exact px counts and
bboxes:
1. Frames 126-133 (render ages 41-48): attacker/clone punch-trace region
   (bbox ~x41-131,y64-111) — a real color-level bug, not timing (see the
   lag bisection above). Likely a clone paint-order or blend-coefficient
   issue, same class as DRAGON_RAGE's own fire-plume z-order residual —
   next step should be a `gMain.oamBuffer` RAM read of the live clone stack
   (`dump-dragonrage-oam.py`'s own precedent), not another lag guess.
2. Frames 134-147 (render ages 49-62): top-of-screen region reaching
   x177-206,y12-71 — plausibly the hitsplat/fist reused
   `TURN9_HITSPLAT_MATRIX` affine-stretch schedule not matching this move's
   own anchor ages. Not root-caused this session.
3. Frames 191-195 (render ages 106-110): a large near-white region covering
   most of the screen — this is the generic post-move **result/message
   textbox** appearing, an out-of-scope reusable presentation component per
   this lane's own acceptance rule (it neither blocks nor promotes a move).
   The fixture's own `denseWindow.endFrame` (195) should be trimmed to
   exclude this tail next session rather than carried as a required
   remainder.

**Opponent-attacker orientation (`shadow-punch-opponent-haunter-player-onix.json`):
component 95/111, framebuffer 0/111 — materially worse, a different problem.**
Component mismatches are a genuine BLDY-ramp one-tick drift starting ~frame
172 (oracle's own `bldy` decrements one tick ahead of this codebase's table
— an orientation-specific timing bug with zero counterpart on the
player-attacker side, where BLDY matched exactly). Framebuffer is a total
loss: every single dense frame mismatches, dominated by a persistent
~1590px region from frame 89 in the attacker-side bbox x151-201,y14-71
whose fading-gradient signature suggests the player-attacker fixture's own
lag=3 does not transfer to this orientation. Not root-caused this session —
needs its own dedicated RAM-pixel probe rather than reused player-attacker
assumptions; a reasonable first candidate is re-checking the
`x2 -= tBattlerSpriteId` quirk's sign for the opponent-side attacker slot.

**Coverage:** added `MOVE_SHADOW_PUNCH` to `ANIMATION_COVERAGE.json` as
`partial` (19 exact / **3 partial** / 254 unsupported) — a meaningful dense
window (84/111, all component math exact) is green in one orientation, but
both a real in-scope remainder and an unattempted-clean second orientation
remain, so `exact` is not honest. `covered`/`remaining` carry the full
per-family breakdown above with px counts so the next session can resume
a probe cycle without re-deriving it.

**Evidence.** `npm test` 2222/2222 (one pinned coverage-summary count
updated to match the new partial entry). `npm run build` green.

- **State:** **19 exact / 3 partial / 254 unsupported.** (This
  step — SHADOW_PUNCH now has a `partial` entry; DRAGON_RAGE stays
  CLOSED/parked at 149/150 `partial`, not touched this step.)
- **Did:** Third and final scheduled session on `MOVE_SHADOW_PUNCH`'s dense
  acceptance. Found the build broken at session start (the second
  cap-killed session's salvaged mid-rework left `battleScene.ts` referencing
  an undefined `attackerView`) and fixed it by defining the missing
  phase-aware lagged view, mirroring DRAGON_RAGE's own precedent. Bisected
  `SHADOW_PUNCH_ATTACKER_FRAMEBUFFER_LAG` (0/1/2/4) and found it has zero
  effect on the remaining player-attacker mismatches — ruling out timing as
  the cause of that family before investigating further. Ran both dense
  comparators and attributed every remaining mismatch by mismatch-string/
  bbox: player-attacker orientation lands 111/111 component, 84/111
  framebuffer (two in-scope named families + one out-of-scope generic
  message-textbox tail); opponent-attacker orientation is materially worse
  and a different problem (95/111 component — a new BLDY one-tick drift —
  and 0/111 framebuffer), not root-caused this session. Added
  `MOVE_SHADOW_PUNCH` to `ANIMATION_COVERAGE.json` as `partial`.
- **Evidence:** `npm test` 2222/2222, `npm run build` green.
- **Next:** Player-attacker orientation needs a `gMain.oamBuffer` RAM probe
  of the live clone stack (frames 126-133, DRAGON_RAGE fire-plume
  precedent) and a look at the hitsplat/fist affine-stretch schedule
  (frames 134-147); trim the fixture's `denseWindow.endFrame` (195) to
  exclude the out-of-scope message-textbox tail (frames 191-195).
  Opponent-attacker orientation needs its own fresh RAM-pixel probe (do not
  reuse player-attacker fixes) starting from the BLDY one-tick drift and
  the `x2 -= tBattlerSpriteId` sign for the opponent-side attacker slot.
  See `ANIMATION_COVERAGE.json`'s `MOVE_SHADOW_PUNCH.remaining` for the full
  per-family px-count breakdown. MIST_BALL's own remaining blockers are
  unchanged and still open: `waitforvisualfinish` sprite-lifetime tracking,
  `AnimComplexPaletteBlend`, `AnimTask_MistBallFog`'s own BG1 pipeline (a
  genuinely new subsystem), and generalizing `AnimTask_BlendBattleAnimPal`
  past its one DRAGON_BREATH instance. The `dragon-fire-projectile`
  siblings FIRE_BLAST and FIRE_SPIN also remain open (FIRE_BLAST's own real
  surface is `SoundTask_FireBlast` + `gFireBlastCrossSpriteTemplate`/
  `gFireBlastRingSpriteTemplate` sprites). `blend_color_cycle` (28 Level-50
  moves, the current top no-representative family) is still unenumerated.
- **Housekeeping:** moved the prior "SHADOW_PUNCH RAM-probed and ported"
  dated section to `ANIMATION_PROGRESS-archive.md` (superseded by this
  session's own section) to keep ~3 live (AGENTS.md's convention);
  DRAGON_RAGE's own "rung 6/7" and the BG-swap-pipeline dissolution section
  stay live alongside this one.
