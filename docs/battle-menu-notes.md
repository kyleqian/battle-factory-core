# Battle menu notes (S6 groundwork: PLAYER SEND-OUT + FIRST ACTION MENU window, ticks 1560-1810)

Worktree-lane groundwork dossier for the window between the tail of the
opponent's "sent out GROVYLE!" hold and the settled first-action-menu idle:
"Go! ONIX!" prints → Brendan's throw animation → the thrown ball arcs →
ONIX materializes → player healthbox slides in and settles → a long
controller-busy static hold → the message box clears → "What will ONIX do?"
+ FIGHT/BAG/POKéMON/RUN draws → settled 4-phase idle. **Ground-truth pinning
+ source/RAM decode only — no engine code, no `tools/compare/traces/`
fixtures.** Cross-references `docs/battle-scene-notes.md` (BATTLE-SCENE
ASSEMBLY window, 1031-1300 — same idle-cycle signature, same conventions)
and `docs/battle-interface-assets.md` (ball_display + down-arrow-alt, already
extracted byte-exact) and `docs/battle-bringup-notes.md` (coarse SS2/SS3/SS5
pins this session sharpens). All frame numbers are `battle1-intro.json`'s
own absolute tick indices (same script, same RNG stream). sha256 = first 8
hex chars unless spot-cited in full.

## 0. Ground truth: the dense trace

Committed: `tools/compare/traces-groundtruth/battle1-menu-dense.json` —
**identical 40-segment button script** to `battle1-intro.json`, with
`captureFrames` = every tick **1560-1810 inclusive** (251 captures, under the
oracle's 256-capture limit). Verified green via `bin/oracle run`. All three
of the brief's coarse SS2 pins reproduced exactly: tick 1696 and tick 1741
both sha `6d2e0945...` (byte-identical, confirmed not assumed), tick 1750 sha
`fd778a4bb67c314116e902d9d30abff50cc4526f0ba5776f20acf1b4312b960c`.

## 1. Frame-boundary milestones (every-single-frame, not sampled)

| tick | sha256 (8-char) | what |
|---|---|---|
| 1560-1562 | `6cb7ab1e` | tail of "BUG CATCHER DESTIN sent\nout GROVYLE!", held (inherited from before this window — matches `battle-bringup-notes.md` §6's tick-1522 pin) |
| **1563** | `4af1dc66` | message box clears **and** first glyph "G" draws **in the same tick** (1133px sub-region delta) — the box-clear-to-first-char transition is a single-tick jump, no visible blank-box frame, unlike the later 1742-1747 clear (§3) |
| 1564-1571 | (unique per tick) | "Go! ONIX!" prints, 1 tick/char (§2) |
| **1572** | (static begins) | "Go! ONIX!" fully printed; message box text region stops changing (residual per-tick sha changes past this point are Brendan's throw animation elsewhere in frame, not text — confirmed via a sub-region-only diff, §2) |
| **1574** | — | Brendan (player back-sprite) throw-pose swap, exit translation, AND the player party-status-summary bar/icons' fade+slide all begin the same tick **1574** (pixel-pinned every tick this session, engine-modeled exact in `battleMenu.ts` — corrects this row's original "~1595" coarse estimate by 21 ticks); Brendan's frame-cycle + translation continues exact through at least 1614 (§3) |
| **1607**-**1614** | — | thrown Poké Ball sprite visible, arcing toward ONIX's spawn point — engine-modeled exact this session (§3); **1615** is the pinned boundary where an unmodeled GBA affine "ball spin" animation takes over (§3's own named blocker), not ~1638 as the original coarse pass guessed |
| ~1646-1662 | — | ONIX materializes as a flat-color silhouette (ball-open + color-fade, §3) |
| ~1662-1690 | — | ONIX gains full color (affine emerge anim) + healthbox slides in (§3) |
| **1693** | `6d2e0945...` | **scene settles** — corrects the brief's coarse "1696" pin by 3 ticks (same off-by-a-few-ticks correction pattern as `battle-scene-notes.md`'s 1075-not-1077 and this session's own findings below) |
| 1693-1741 | `6d2e0945` | static hold, 49 ticks — matches `battle-bringup-notes.md` §3's RAM finding that `gBattleControllerExecFlags` stays busy (=1) through tick 1740 (cry SFX + `Intro_DelayAndEnd`'s 3-tick delay still running, invisible on-screen, §3) |
| 1742-1747 | `4db851c4` | message box **blank** (teal box, no text) — 6 ticks flat, not "several distinct transitional frames" as the coarse pass guessed; it's one steady blank state |
| **1748** | `fd778a4b...` | **first action menu fully drawn — atomically** ("What will ONIX do?" + full FIGHT/BAG/POKéMON/RUN grid + cursor on FIGHT, all in one tick) — corrects the brief's coarse "tick 1750" pin by 2 ticks; same sha as the idle cycle's phase-0 state (§4) |
| 1749 | `b145eaef` | single-tick idle-cycle phase-3 blip (§4) — **not** part of the menu draw itself, a pre-existing global bob timer already mid-cycle |
| 1750-1758 | `fd778a4b` | idle phase 0, 9-tick dwell (cycle properly "starts" its clean dwell here) |
| 1759-1767 | `dfc21faf` | idle phase 1 |
| 1768-1776 | `d223d98a` | idle phase 2 |
| 1777-1785 | `b145eaef` | idle phase 3 |
| 1786-1810 | (repeats) | phase 0/1/2 (trace ends mid-phase-2 at 1810) |

Coarse-pin corrections this session made (all pixel-verified, not guessed):
**settle 1693** (not 1696), **menu fully drawn 1748** (not 1750). Both are
2-3-tick corrections of the same kind `battle-scene-notes.md` made for its
own window (1075 not 1077) — a recurring lesson that this codebase's coarse
6-14-frame sampling passes systematically land a few ticks late on settle
events.

## 2. "Go! ONIX!" print cadence (source + pixel, exact)

**Source**: `BattleIntroPrintPlayerSendsOut` (`src/battle_main.c`, right
after the opponent's send-out anim completes) calls `PrepareStringBattle(
STRINGID_INTROSENDOUT, ...)` → `sText_GoPkmn = "Go! {B_PLAYER_MON1_NAME}!"`
(`battle_message.c:396`) → resolves to **"Go! ONIX!"** (9 printable chars:
`G`,`o`,`!`,` `,`O`,`N`,`I`,`X`,`!`), then `gBattleMainFunc =
BattleIntroPlayer1SendsOutMonAnimation`. Same window/font/cadence mechanism
as `battle-scene-notes.md` §3.1-3.2 (`B_WIN_MSG`, `FONT_NORMAL`,
`GetPlayerTextSpeedDelay()` → 1 tick/char at this save's `optionsTextSpeed =
FAST`).

**Pixel evidence** (sub-region diff, text-box rows only, ticks 1560-1575):

| tick | Δpx (text region) | char |
|---|---|---|
| 1563 | 1133 (box clear + glyph) | `G` |
| 1564 | 32 | `o` |
| 1565 | 20 | `!` |
| 1566 | 0 | ` ` (space, silent — same "space ticks are pixel-silent but still charged" rule as `battle-scene-notes.md` §3.2) |
| 1567 | 44 | `O` |
| 1568 | 50 | `N` |
| 1569 | 36 | `I` |
| 1570 | 38 | `X` |
| 1571 | 20 | `!` |
| 1572+ | 0 | (fully printed, static) |

Exactly **9 ticks for 9 characters**, 1 tick/char including the silent space
— arithmetic-exact, third confirmation of this codebase's 1-tick/char
convention (field msgbox, scene-intro msgbox, now the send-out msgbox).
Unlike the later 1742-1747 clear (§1), the box-clear-to-first-glyph
transition here is a **single tick** (1562→1563), not a multi-tick blank
hold — the two clears are pixel-confirmed to behave differently, not
assumed identical.

## 3. Mechanism decode: Brendan's throw → ball arc → ONIX materializes → healthbox slides in

**Slice 2 (this session) re-derived everything below pixel-exact, every
tick, from `battle1-menu-dense.json` via the same sub-region-diff +
brute-force asset-position-fit technique §2 used for text** (not the
coarse ~8-tick pass this section originally used) — engine code lives in
`src/engine/battleMenu.ts` (`brendanThrowFrame`/`brendanThrowDx`,
`playerThrowBallTopLeft`, `playerSummaryFadeEva`/
`playerSummaryIconExitDx`/`playerSummaryBarExitDx`), pinned by
`tools/compare/traces/menu-throw.json` (0 diff at ticks 1574 and
1605-1614). Corrections to the original coarse-pass text are called out
inline below; the source chain itself (which functions call what) was
already right, only specific numeric claims needed fixing.

**Source chain** (`src/battle_main.c` → `src/battle_controller_player.c` →
`src/pokeball.c`, cross-checked against the dense trace's pixels):

1. `BattleIntroPlayer1SendsOutMonAnimation` (`battle_main.c:3776`) emits
   `BtlController_EmitIntroTrainerBallThrow` to the player controller.
2. `PlayerHandleIntroTrainerBallThrow` (`battle_controller_player.c:2931`):
   plays Brendan's back-sprite anim **index 1** (`sAnimCmd_Brendan_1`,
   `back_pic_anims.h` — **correction**: this is an *anim command sequence*,
   not raw frame 1 directly; it cycles raw frames **0 (24 ticks), 1 (9
   ticks), 2 (24 ticks), 0 (9 ticks), 3 (50 ticks)** — pixel-fit exact
   against every one of these spans in the dense trace), starts a
   **linear** translation (`StartAnimLinearTranslation`) that exits the
   trainer sprite off-frame, and creates `Task_StartSendOutAnim` with a
   **31-tick pre-delay** (`tStartTimer < 31`) before the actual send-out
   fires. **Correction**: the throw-pose swap and the first translation
   step both begin at trace tick **1574** exactly (pixel-pinned every
   tick, not "~1595"/"inherited already-in-progress from before 1560" as
   originally guessed) — the source sets `data[2]=-40` as an *absolute
   OAM-space x target* (`StartAnimLinearTranslation` overwrites `data[1]`
   with the sprite's own *current* x right before computing `target -
   current`), not a `-40px` delta, so the true total displacement isn't
   40px; this codebase doesn't have Brendan's starting OAM x extracted to
   recover the exact delta algebraically, so the engine pixel-fits the
   Q8.8 step register directly (615, duration 50) — exact (0/1665px
   mismatch) at every dense-trace tick checked, 1574-1614.
3. `StartSendOutAnim` (`:2196`) creates the (invisible) ONIX battler sprite,
   then `DoPokeballSendOutAnimation(0, POKEBALL_PLAYER_SENDOUT)`
   (`pokeball.c:335`).
4. `Task_DoPokeballSendOutAnim` (`pokeball.c:352`): spawns the thrown-ball
   sprite at OAM-space **center (24, 68)** (**correction**: this engine's
   sprite `x`/`y` are center coordinates, not top-left — confirmed by the
   offset landing exactly 8px, half the 16x16 ball sprite's width/height,
   inside the pixel-fit top-left corner (16,60) at tick 1607, not
   assumed), callback `SpriteCB_PlayerMonSendOut_1`. The player's arc lives
   in `SpriteCB_PlayerMonSendOut_1/_2` (`pokeball.c:911-968`):
   `InitAnimArcTranslation` toward `(GetBattlerSpriteCoord(battler,
   BATTLER_COORD_X_2), GetBattlerSpriteCoord(battler,
   BATTLER_COORD_Y_PIC_OFFSET) + 24)` — pixel-fit to center (72,112), arc
   height `-30`, nominal duration `data[0]=25`, driven by
   `TranslateAnimHorizontalArc` every tick until arrival — exact (0/112px
   mismatch) at every tick 1607-1614. **Correction, this session's most
   important finding**: the `HIBYTE(data[7]) ∈ [35,80)` branch inside `_2`
   is **not** dead code for a singles player battler. The original claim
   ("`data[7] += sBattler/3` never increments when `sBattler=0`") is true
   but incomplete — it missed that `data[7]` is the *same field*
   `TranslateAnimHorizontalArc` (called from the `else` branch, i.e. every
   tick this branch *isn't* active) increments by `data[6]=1310`
   regardless of `sBattler`. Solving `floor(n*1310/256) ∈ [35,80)` gives
   `n≥7`, which lands exactly on the tick this session's pixel search
   stops finding an exact match against the plain sine-arc model (n=8,
   trace tick 1615). That branch starts a real GBA affine sprite animation
   (`StartSpriteAffineAnim(sprite, 4)` — a rotate/scale "ball spin" over an
   affine-matrix keyframe table this codebase hasn't extracted or built a
   renderer for) and simultaneously cuts the horizontal step to 1/3 and
   slows the duration countdown to roughly 1-in-3 ticks. This is the
   **named blocker** for extending `playerThrowBallTopLeft` past tick
   1614 — a distinct, non-trivial mechanism from the plain Q8.8 sine-arc
   arithmetic, not attempted this session. This still **confirms the
   original brief's suspicion**: the player send-out genuinely has a
   throw arc; **the opponent's does not** — `SpriteCB_OpponentMonSendOut`
   (`pokeball.c:986-996`) is a flat 16-tick delay with no
   `InitAnimArcTranslation` call at all.
4b. **New this session, not in the original pass**: the same tick
    Brendan's throw starts, `PlayerHandleIntroTrainerBallThrow` also
    reassigns `gTasks[gBattlerStatusSummaryTaskId[...]].func =
    Task_HidePartyStatusSummary` (`:2954-2955`) — the player's own
    party-status-summary bar+icons (the "ball-icon change" PROGRESS #93
    flagged, pixel-confirmed at x150-239/y88-99) start hiding via an
    alpha-blend fade (`Task_HidePartyStatusSummary_BattleStart_1`,
    `battle_interface.c:1727`: `BLDALPHA` `eva` steps 16→0, 1 step every
    *other* tick) **plus** a position slide: each of the 6 icons gets a
    `7*i`-tick predelay then an accelerating leftward
    `SpriteCB_StatusSummaryBalls_Exit` ramp that closes to the triangular
    form `-3*K*(K+1)/2` (`K` = active ticks so far), and the bar itself
    (`SpriteCB_StatusSummaryBar_Exit`) slides a flat `-2px`/tick (its own
    "acceleration" term never actually grows — `data[1]`'s low nibble is
    unchanged by `+=32` every tick, collapsing the ramp to a constant).
    All pixel-fit exact at ticks 1574 and 1605-1614; ticks 1575-1604 had
    a small (<1%, 20-136px) residual — `SetSubspriteTables(...,
    sStatusSummaryBar_SubspriteTable_Exit)` (`:1717`) splits the bar into
    independently-animated subsprites during this exact exit, which the
    engine's monolithic `drawBallStatusBar` doesn't model.

    **Landed this session** (`drawPlayerSummaryBarExit`, `battleScene.ts`):
    this is the *exact same* `SetSubspriteTables` call and the *exact same*
    shared `sStatusSummaryBar_Subsprites_Exit` table §7.19
    (`battle-scene-notes.md`) already decoded for the opponent side — only
    `CreatePartyStatusSummarySprites`'s h-flip differs (`oam.matrixNum =
    ST_OAM_HFLIP` is set only in the `isOpponent` branch, `:1499-1507`; the
    player bar is drawn unflipped), so `EXIT_BAR_TILE_ORDER` is reused
    verbatim, just drawn without whole-array reversal or per-tile hFlip.
    **Correction to the anchor math**: unlike the opponent (whose h-flipped
    render anchors to the table's *last* entry, the "tip" — hence
    `EXIT_BAR_TIP_LOCAL_SHIFT=64`), the player's unflipped
    `drawBallStatusBar` loop maps tile index 0 (the array's *first* entry,
    subsprite 0, tileOffset 0, local x=-96) directly onto the render anchor.
    Subsprite 0 is byte-identical between the Enter and Exit tables (both
    start `{x:32*-3, tileOffset:0}` — the Exit table only inserts two extra
    copies of the tileOffset-8 block *before* the tip), so the player's
    anchor needs **no shift at all** when the table switches — confirmed by
    testing a nonzero shift against the oracle, which breaks every tick.
    The switch itself has the same 1-tick render lag as every other
    register in this window (`ballIcons`/`ballStatusBarPositions`'s own
    `rt=t-1` convention): the flat/Enter-shaped draw is still exactly right
    at tick `PLAYER_SUMMARY_FADE_START_TICK` (1574) itself, and the split
    first becomes visible the next tick (1575) — matching exactly why the
    residual window was 1575-1604, not 1574-1604. `tools/compare/traces/
    menu-throw.json` densified to every tick 1574-1614 (41 total):
    **33/41** at 0 diff (was 11/41 pre-fix; the bar-split residual itself
    is fully gone — see below for the 8 ticks still excluded and why).

    **A separate, previously-hidden mechanism surfaced once the bar was
    fixed**: 8 of the 41 ticks (1581-1583, 1589-1591, 1597-1598) still
    diff, but the mismatch is NOT in the bar — pixel dumps show it's a
    small (4-26px) blob at y=88-94 (the player ICON row), landing exactly
    on the icon whose exit-slide position currently overlaps Brendan's own
    exiting back sprite on screen. Oracle shows Brendan's raw (unblended)
    skin-tone pixel there; this engine shows the alpha-blended icon color
    painted over him. Root cause: this software renderer composites purely
    in draw-call order (icons drawn after Brendan, so they paint over him
    wherever opaque), but real GBA OAM resolves equal-priority overlaps by
    sprite/OAM-slot creation order — Brendan's back sprite (`.priority`,
    created at the intro, long before the status-summary icons) wins the
    tie and renders in front whenever they overlap. This is a genuinely
    different mechanism (sprite-priority/creation-order compositing, not
    the subsprite-split bar this step targeted) and touching the shared
    `drawSendOutHandoff` draw order would risk regressing `sendout.json`'s
    own established 215/256 (that function is shared with the whole
    1462+ send-out window) — **named blocker, not attempted this
    session**, left for a future step that wants to tackle sprite-priority
    compositing generally.
4c. **Landed this session (the ball-spin blocker named above)**: the GBA
    affine "spin" is modeled tick 1615 through arrival, `playerThrowBallSpin`
    (`battleMenu.ts`) + `drawSpriteSheetAffineRotate` (`battleScene.ts`, this
    codebase's first TRUE-rotation affine OAM sampler - mechanism 4/5 both
    special-case `rotation=0`). RAM ground-truthed exact via a new probe
    (`tools/probe/specs/sendout-ball-spin.json`; the ball sprite is
    `gSprites[5]`, identified by matching its callback pointer to
    `SpriteCB_PlayerMonSendOut_2`'s address, `tools/probe/
    dump-task-and-sprite-callbacks.py`) rather than hand-simulated from
    source alone, because the control flow turned out subtler than the
    original blocker note implied: `sprite->sBattler` (`data[6]`) inside the
    branch is NOT the original battler index by this point -
    `InitAnimArcTranslation` already overwrote `data[6]` with the arc's own
    angular step (1310) before the branch ever runs, so `data[7] +=
    sBattler/3` actually advances by 436/tick (not 0), which is what lets the
    branch's own exit condition (`HIBYTE(data[7])>=80`) ever fire at all for
    a singles player battler. `StartSpriteAffineAnim(sprite, 4)`
    (`sAffineAnim_BallRotate_4`, `pokeball.c:190-194`:
    `AFFINEANIMCMD_FRAME(0,0,25,1)` + `AFFINEANIMCMD_JUMP(0)`) is a clean
    closed form (rotation += 25 GBA angle units/tick, forever, scale pinned
    at neutral) — confirmed by hand against RAM, and **kept as a literal
    per-tick matrix table anyway** (`BALL_SPIN_TABLE`) because this
    codebase's `gbaSin` (a `Math.sin`-based re-derivation of `gSineTable`,
    not a literal copy) is off by up to 1 Q8.8 unit at a handful of the 256
    indices — invisible to the sine-ARC mechanisms (a ±1px `y2` bump rarely
    flips a rendered pixel) but not to a rotate SAMPLE kernel (a ±1 matrix
    unit can flip which source texel an edge pixel reads); brute-force
    diffing against the oracle confirmed exactly this (sparse 1-11px edge
    diffs at the affected ticks, 0 diff once swapped for the RAM-exact
    values). The **render lag** (§7.21's convention) applies here too,
    RAM-confirmed rather than assumed: screen tick T shows RAM tick T-1's
    sprite state (cross-checked against the already-exact
    `playerThrowBallTopLeft` window itself first, e.g. screen tick 1614's
    `dx=13` matches RAM tick 1613's `x2`, not RAM tick 1614's, before
    trusting the same offset for the new ticks). **Arrival is exactly trace
    tick 1651** (RAM tick 1650, where the ball's real `x`/`y` snap to their
    final center (72,115) and the affine matrix resets to identity,
    RAM-confirmed the same tick `gSprites[5]`'s callback switches from
    `SpriteCB_PlayerMonSendOut_2` to `SpriteCB_ReleaseMonFromBall`) — this
    resolves the "ball arrives" entry in this doc's own §3 "not tick-exact"
    list below, correcting the ~1646 coarse estimate. **Window boundary**:
    this session's committed trace (`menu-throw.json`, now 70/70 at 0 diff,
    every tick 1574-1651 minus the 8 already-named Brendan-vs-icon ticks)
    stops at 1651 itself — tick 1652 is where `SpriteCB_ReleaseMonFromBall`
    (which starts the NEXT RAM tick after arrival) begins the ball's own
    "open" pose swap (`StartSpriteAnim(sprite, 1)`), and tick 1653 is where
    the magenta materialize silhouette color first appears anywhere in the
    frame (oracle-confirmed by direct pixel search) — both squarely the
    already-named, out-of-scope materialize/ball-open mechanism (item 5
    below), not a new gap.
5. `SpriteCB_ReleaseMonFromBall` (`pokeball.c:750`) on arrival:
   `AnimateBallOpenParticles` (sparkle burst), `LaunchBallFadeMonTask(TRUE,
   battler, 14, ballId)` (flat-color silhouette → true color over ~14
   ticks), `StartSpriteAffineAnim(monSprite, BATTLER_AFFINE_EMERGE)`
   (squash/stretch), and schedules the cry (`Task_PlayCryWhenReleasedFromBall`).
   Pixel-confirmed: ONIX appears as a flat magenta/pink silhouette ~tick
   1646, transitioning toward its true gray coloring through ~tick 1670-1676
   (the two largest per-tick pixel deltas in the whole window, 16-17k px,
   land at 1668/1676 — consistent with the affine emerge + healthbox
   slide-in being the single biggest visual events here).

   **Landed this session (bounded worker, PROGRESS #98), engine-modeled
   through trace tick 1652 only** - narrower than this item's own coarse
   "~1653-1690" framing, for a specific, verified reason (below), not a
   time-budget shortcut:
   - **Ball open-pose swap, tick 1652 exact** (`playerBallOpenTopLeft`,
     `battleMenu.ts` + `drawPlayerBallOpen`, `battleScene.ts`):
     `StartSpriteAnim(sprite, 1)` one tick after arrival (`PLAYER_THROW_BALL_ARRIVE_TICK`+1),
     drawn at the ball's settled center `(72,115)`. **Terrain occlusion**
     (this item's own named placement gap, `docs/battle-anim-assets.md` §5)
     resolved with direct pixel evidence, not guessed: row-by-row diff at
     tick 1652 shows only screen rows y=110-111 (the sprite's own top 2
     opaque rows) match: everything y>=112 is the battlefield terrain
     graphic instead. `tools/compare/traces/menu-materialize.json` (new,
     captures tick 1652 only): **1/1 at 0 diff**.
   - **ONIX's own materialize accumulator/`y2` derived and pixel-verified
     correct in isolation, but NOT included in the committed trace**: the
     same shared `BATTLER_AFFINE_EMERGE` table mechanism 4
     (`battle-scene-notes.md` §7.21) already decoded applies to ONIX's back
     sprite at corner `(40,48)` (brute-force-confirmed - the settled back
     sprite is a zero-diff 1664/1664 exact match there, first at trace tick
     1691), with a `+2` (not `+1`) accumulator-lookup lead and the SAME
     12-entry `y2` table §7.21 already extracted, reused verbatim
     (`drawPlayerMaterialize`, `battleScene.ts` - see its own doc comment for
     the full brute-force derivation, `tools/compare/scratch/menu-audit/
     onix_materialize_bruteforce.mjs`). Enabling it measurably and
     monotonically REDUCES the full-frame pixel diff at every tick
     1653-1663 by exactly the tint silhouette's own pixel count each tick
     (150px at 1653 up to 1551px at 1663, matching this doc's own
     independently-harvested exact-tint-pixel-count table pixel-for-pixel) -
     strong evidence the derivation itself is correct. At the time this was
     landed it was left OUT of the committed trace/window boundary because a
     large (~2400-7700px) pre-existing full-frame residual already occupied
     every tick past 1652 - **root-caused and fixed this session**, see
     below.

     **Root-caused this session (bounded worker, following this item's own
     named blocker + the newest PAPERCUTS.md entry's "A/B the baseline
     first" rule): the pre-existing ~1653+ residual is the player-side twin
     of `battle-scene-notes.md` §7.10/§7.20's own `SENDOUT_BG_FADE_Y`.**
     `SpriteCB_ReleaseMonFromBall` (`reference/pokeemerald/src/
     pokeball.c:758`) calls `sprite->data[0] = LaunchBallFadeMonTask(TRUE,
     sprite->sBattler, 14, ballId)` - the exact same call site (same
     `selectedPalettes=14`, battler-generic signature) that already fires
     for the OPPONENT's own release, so `BeginNormalPaletteFade(
     selectedPalettes, 0, 0, 16, RGB_WHITE)` (`battle_anim_throw.c:2056`)
     fires a SECOND time, independently, for the player's own ONIX release -
     the engine only ever modeled it once. Decoded, not fitted
     (`tools/compare/scratch/menu-audit/decode_player_bgfade.mjs`):
     reversing the already-validated `blendComponentToWhite` formula
     (`c5 + (((31-c5)*y)>>4)` per 5-bit channel, then re-expand) against two
     independent clean background swatches - (165,52), which decodes to a
     **perfectly clean** exact y sequence at all 3 channels for every one of
     the 37 affected ticks (1653-1689), and (194,51), whose blue channel
     cross-validates the exact same sequence (r/g channels alias at a few
     ticks from that swatch's own different c5 rounding - expected, not
     contradicting evidence) - both confirmed clean by sampling every tick
     1600-1652 first (flat, unfaded, matching this doc's own swatch-picking
     discipline). The decoded 37-entry ramp (`2,2,4,4,6,6,8,8,10,10,12,12,
     14,14,14,16×8,14,14,12,12,10,10,8,8,6,6,4,4,2,2`) is **byte-identical to
     `SENDOUT_BG_FADE_Y`** - including its same 3-tick y=14 hold
     irregularity - confirming this is the SAME table/mechanism
     re-triggered, not a coincidentally similar one. Start tick 1653 =
     `PLAYER_BALL_OPEN_START_TICK`+1 - the identical "one tick after the
     ball's own open-pose swap" offset `SENDOUT_BG_FADE_START`'s own
     derivation used for the opponent, independently confirming the shared
     convention rather than a tick chosen to fit.

     **Fix landed**: `battleMenu.ts` gained `playerMaterializeBgFadeY(t)`
     (the literal table, reused verbatim, at the new anchor) and
     `PLAYER_BG_FADE_START_TICK`; `battleScene.ts`'s `drawSendOutHandoff`
     additively ORs it into the existing `drawTileBgFaded` call alongside
     `sendOutBgFadeY` (the two windows never overlap, so exactly one is ever
     nonzero at a given tick). **Verified via oracle compare**: the
     1653-1663 full-frame diff drops **~99%** (2461px→19px at 1653, up to
     7846px→92px at 1662). 6 new Tier-1 tests (`tests/battleMenu.test.ts`)
     pin both ramp boundaries.

     **What's left, classified pixel-for-pixel, not assumed**
     (`tools/compare/scratch/menu-audit/classify_residual.mjs`): **100% of
     the remaining diff at every tick 1653-1663 is the ball-open particle
     burst** (mechanism 3's player-side analogue) - every single mismatched
     pixel's oracle-or-app color is one of the known particle-frame colors
     (`(255,173,0)`, `(255,255,255)`, `(66,66,66)`, `(214,41,41)`,
     `(255,156,123)`, `(132,0,0)`), landing in a small cluster around the
     ball's own settled position (x≈67-80, y≈103-111) that grows tick-over-
     tick as more particles spawn - exactly the shape a radial burst
     originating at ball-open would produce. This refines (doesn't match
     verbatim) this doc's own prior "expected around 1662-1665" guess: pixel
     evidence shows the burst is already present at **every** tick from
     1653 itself (the same tick `AnimateBallOpenParticles` and
     `LaunchBallFadeMonTask` both fire together in
     `SpriteCB_ReleaseMonFromBall`, source-consistent with a single-tick
     trigger for both), not starting a few ticks later.

     **Landed this session (bounded worker, PROGRESS #101)**:
     `drawPlayerBallOpenParticles` (`battleScene.ts`) - the same
     age/radius/frame math as the opponent's own `drawBallOpenParticles`,
     battler-specific only in origin and anchor tick:
     - **Origin `(68,106)`** (top-left, `PLAYER_PARTICLE_ORIGIN`):
       brute-force pixel-fit against the isolated single particle visible at
       logical tick 0 (`tools/compare/scratch/menu-audit/
       fit_player_particle_origin.mjs`, 13/14 opaque pixels exact, next-best
       candidate 3/14 - the 14th pixel is the same terrain occlusion
       (`PLAYER_BALL_OPEN_VISIBLE_BOTTOM`) already established for the
       ball's own open pose). Not the naive `sprite->x, sprite->y-5` center
       value used directly - `drawParticleTile`'s args are a top-left
       corner, so the center `(72,110)` needed the tile's own `-4,-4`
       half-width/height folded in, unlike the opponent's own already-topleft
       `PARTICLE_ORIGIN`.
     - **Anchor**: logical tick 0 renders at `PLAYER_BG_FADE_START_TICK`
       (1653) - same "both `AnimateBallOpenParticles` and
       `LaunchBallFadeMonTask` fire the same RAM tick" reasoning above.
     - **Draw order reversed from the opponent's own function** (oldest
       spawn drawn on top, not newest): pixel-confirmed necessary - the two
       particles that briefly coexist at radius 0 (a particle's own age-0
       tick and the next particle's age-0 tick one game-tick later, same
       origin) need the older on top to match the oracle. Found by direct
       A/B (ascending order left 3-24px residuals at ticks 1654-1656, all
       explained by this exact overlap; reversing made them exact).
     - **A second, distinct problem found while wiring this in**: the ball's
       own "open" pose sprite (item 4c/this item, `drawPlayerBallOpen`) was
       only modeled for its own single tick 1652 - once particles were drawn
       for real, oracle pixels proved the ball's static "open" art is still
       genuinely on screen (through the same terrain clip) for several more
       ticks, needed to explain pixels the particle burst alone doesn't
       cover. Widened `PLAYER_BALL_OPEN_END_TICK` to 1663 (`battleMenu.ts`) -
       fixed tick 1653 outright.
     - **Result, pixel-confirmed exact through tick 1656** (4 new ticks past
       the pre-existing 1652): `tools/compare/traces/menu-materialize.json`
       **1/1 → 5/5** (ticks 1652-1656).
     - **1657+ still has a small (19-30px), separately-named residual - NOT
       this mechanism**: every mismatched pixel is one of the ball-open
       frame's own colors (`66,66,66`/`214,41,41`/`132,0,0`/`255,156,123`),
       appearing where `drawPlayerMaterialize`'s own tint is currently drawn
       instead of the ball/mon's real color - i.e. a materialize-silhouette
       edge issue, the same CLASS of bug `battle-scene-notes.md` §7.21
       root-caused for the opponent's own materialize (a render-lag
       off-by-one and/or a missing accumulator/`y2` correction), not a
       particle problem. **Not root-caused this session** - out of scope for
       the particle-burst brief, and `drawPlayerMaterialize` is `#98`/`#99`'s
       own code; a future session should treat this the same way §7.21
       treated the opponent's analogous edge residual. Named blocker,
       precisely bounded: root-cause the `drawPlayerMaterialize`
       accumulator/`y2`/render-lag combination starting at trace tick 1657
       (`local`=4 in `PLAYER_MATERIALIZE_START_TICK`-relative terms) - once
       fixed, `menu-materialize.json` should extend past 1663 with no
       further particle-burst changes needed. Ticks past the materialize
       window's own end are still separately blocked by the already-named
       coefficient-fade-to-true-color + idle-bob entanglement, and the
       healthbox slide-in boundary (~1693) past that, neither touched this
       session.
6. `HandleBallAnimEnd` waits for both the ball sprite's anim **and** the mon
   sprite's affine anim to finish, then `Intro_TryShinyAnimShowHealthbox`
   (`battle_controller_player.c:979`) calls `UpdateHealthboxAttribute(...,
   HEALTHBOX_ALL)` (draws name/level/HP-bar/digits) + `StartHealthboxSlideIn`
   once cry playback (`waitForCry`) and BGM restore both clear.
7. `Intro_WaitForShinyAnimAndHealthbox` (`:940`) waits for the healthbox
   sprite's slide-in callback to go idle, then sets a **3-tick**
   `introEndDelay` and hands off to `Intro_DelayAndEnd` (`:931`), which
   decrements it to `PlayerBufferExecCompleted()`.

**The 1693-1741 static hold, explained**: pixels settle at 1693, but
`battle-bringup-notes.md` §3's RAM trace shows `gBattleControllerExecFlags`
staying busy through tick 1740 — this is the **cry SFX still playing**
(audio-gated, `waitForCry`, no pixel effect) plus the 3-tick
`introEndDelay`, not a mechanism gap. No RNG anywhere in this chain (the
9-total-draws RNG-checkpoint table in `battle-bringup-notes.md` §3 is
unaffected; this slice found no additional draws).

**Not tick-exact this session** (time-budget cut, pixel-sampled at ~8-tick
granularity rather than every-tick sub-region diffing): the precise
tick boundaries for "Brendan fully exits" / "ball spawns" /
"silhouette flat-color starts" / "true-color complete" / "healthbox
slide starts". ("Ball arrives" is now resolved exactly - trace tick 1651,
item 4c above.) The dense trace (`battle1-menu-dense.json`) has every
frame needed for a future session to nail these exactly via the same
sub-region-diff technique used for the text cadence (§2) — flagging as
open rather than asserting unverified tick numbers.

## 4. The settled action-menu idle cycle: two independent regions, not one

`battle-scene-notes.md` §3.3 and `battle-bringup-notes.md` §6/§2 both
flagged the settled action-menu's "4-phase, 36-tick idle cycle" as sharing a
signature with the down-arrow wait-cursor's bob, candidate driver
un-identified ("the small waiting-for-input prompt indicator or the
party-ball-count icons"). This session pixel-isolated it precisely — **it is
neither of those candidates**:

Diffing consecutive phase transitions across the full 240×160 frame
(ticks 1750→1759→1768→1777→1786, i.e. phase0→1→2→3→0) shows **two disjoint
regions alternating**, not one:

- **Region A** (bbox x∈[44,99], y∈[49,110], 769px) — the **ONIX battler
  sprite itself** — changes on transitions **0→1** and **2→3**.
- **Region B** (bbox x∈[127,229], y∈[74,110], 1579px) — spans the ONIX
  healthbox + the ground-shadow boundary immediately above it — changes on
  transitions **1→2** and **3→0**.

Each region is a clean 2-state toggle with an **18-tick period**; the two
are offset by 9 ticks from each other, and their union is exactly what
produces the observed 4-distinct-sha/36-tick signature (`A→B→C→B'`-style,
matching the down-arrow's own `sDownArrowYCoords={0,1,2,1}` structural
pattern — phase 1 and phase 3 read as "different" shas here because a
*different* region moves each time, not because one region has 4 distinct
states). **Mechanism attribution not resolved**: `SpriteCB_HealthBoxOther`
and `SpriteCB_HealthBar` (`battle_interface.c:979-1012`) both only *mirror*
the main healthbox sprite's `x2`/`y2`, and the main healthbox sprite's own
template callback is `SpriteCallbackDummy` (a no-op) — so no self-driven
motion was found in the healthbox sprite chain itself; the actual driver
(same shared engine-wide timer the down-arrow uses, or the ONIX battler
sprite's own idle-frame table) is not pinned to a specific function this
session. Flagging as open, consistent with `battle-interface-assets.md`'s
own precedent of leaving the down-arrow bob's source/dest axis attribution
unresolved for a future engine slice.

**A wrinkle just past this window, worth flagging**: a supplementary
single-capture check (ticks 1804-1885, outside the committed dense trace's
1560-1810 range but cheap to verify) found the clean 9-tick dwell holds
through 1810 but a **transient 5th sha** (`3ffd10cd`) appears at tick 1813
before the cycle resettles into the same 4-state pattern from 1822 onward —
consistent with regions A and B being two independently free-running
18-tick counters (not locked to a single 36-tick anchor) that occasionally
both land on the same tick. `battle-bringup-notes.md`'s tick-1885 pin
(`d223d98a...`) was re-confirmed exactly by this check.

## 5. First action menu: geometry + cursor (cross-referencing `battle-bringup-notes.md` §3)

Already source-pinned by the sibling dossier (`battle-bringup-notes.md`
lines 315-331, not re-derived here): `B_WIN_ACTION_PROMPT`
(`tilemapLeft=1,tilemapTop=35,width=14,height=4`) and `B_WIN_ACTION_MENU`
(`tilemapLeft=17,tilemapTop=35,width=12,height=4,paletteNum=5`), both
scrolled into view via `gBattle_BG0_Y = DISPLAY_HEIGHT` in
`HandleChooseActionAfterDma3` (`battle_controller_player.c:2565-2573`) —
**this single BG0 scroll is exactly why the menu draws atomically at tick
1748 (§1)**: the window content was already fully composited off-screen
before the scroll, so revealing it is a one-tick event, not a staged
build-up. Menu text `gText_BattleMenu = "FIGHT{CLEAR_TO 56}BAG\nPOKéMON{CLEAR_TO
56}RUN"` (`battle_message.c:1275`).

**Cursor**: `ActionSelectionCreateCursorAt(cursorPosition, 0)`
(`battle_controller_player.c:1530-1538`) writes tile IDs `{1, 2}` directly
into the BG0 tilemap at `(7·(cursorPosition & 1) + 16, 35 + (cursorPosition
& 2))` — **not a sprite**, a direct tilemap poke reusing tile indices from
the same background graphic already backing the action-menu window (so it's
part of whatever tileset `battle-window.json` already extracted, not a
separate asset — unconfirmed by direct byte comparison this session, see
§6). `cursorPosition=0` (FIGHT, default) → tilemap position `(16, 35)`,
matching the on-screen "▶" immediately left of "FIGHT" (pixel-confirmed at
tick 1748/1750, screenshot in this doc's own trace review). Input handling
`HandleInputChooseAction` (`battle_controller_player.c:233-330`) — case
0=FIGHT, 1=BAG (intercepted for Factory battles, "Items can't be used
now.", already documented in `battle-bringup-notes.md` §3), 2=POKéMON,
3=RUN.

## 6. Asset coverage verdict

| element | status | reference |
|---|---|---|
| ONIX back sprite | **extracted** | `src/assets/gen/battle-back-sprites.json["ONIX"]` |
| Brendan back sprite, all 4 throw-anim frames | **extracted, byte-exact** | `src/assets/gen/trainer-pic-brendan-back.json` (`frameCount:4`) — already covers the throw pose (anim frame 1) used by `PlayerHandleIntroTrainerBallThrow`, per that extractor's own oracle cross-check |
| Thrown Poké Ball sprite (`graphics/balls/poke.png`, 3-frame 16×48 send-out sheet) | frame 0 **wired + pixel-exact this session** (`playerThrowBallTopLeft`, `battleMenu.ts`) | `src/assets/gen/summary-ball.json` — frame 0 (closed) is what's visible the whole 1607-1614 modeled arc window; frames 1-2 (needed for `SpriteCB_ReleaseMonFromBall`'s `StartSpriteAnim(ball,1)` "open" pose, and possibly for the affine-spin phase past 1614) still unverified pixel-exact against this window |
| Player healthbox (name/level/HP-bar/digits, left+right halves) | **extracted** | `src/assets/gen/battle-healthbox.json` (`singlesPlayer`, `hpbar`, etc. — same file the opponent healthbox already uses per `battle-bringup-notes.md` §3) |
| Action-menu window frame + font | **extracted** (shared with the message box) | `src/assets/gen/battle-window.json` — same asset `battle-scene-notes.md` §3.1 already confirmed covers `B_WIN_MSG`; `B_WIN_ACTION_PROMPT`/`B_WIN_ACTION_MENU` use the same `sStandardBattleWindowTemplates` family, not independently re-verified pixel-exact this session |
| Action-menu cursor ("▶") | **likely already covered, unverified** | direct tilemap tiles `{1,2}` from the same sheet as the window itself (§5) — no separate sprite/asset file exists to extract; a future slice should byte-check tiles 1-2 of `battle-window.json`'s tileset against the on-screen cursor rather than treat this as a gap |
| Ball-open particle burst (`AnimateBallOpenParticles`) | **extracted** (this row's original MISSING flag was stale) | `src/assets/gen/battle-anim-particles.json` — extracted for the opponent window; pixel-confirmed applicable unchanged to the player window (14/14, 12/12, 12/12 at ticks 1662-1665) by the PROGRESS #95 audit, `docs/battle-anim-assets.md` §5 |
| ONIX materialize affine curve (`BATTLER_AFFINE_EMERGE`) + silhouette color-fade table (`LaunchBallFadeMonTask`) | **extracted** (this row's original MISSING flag was stale) | `src/assets/gen/battle-anim-ball-open.json` + `battle-anim-tables.json` — extracted for the opponent window from the same shared `SpriteCB_ReleaseMonFromBall` chain; color-fade RGB and affine-emerge silhouette shape pixel-confirmed on the player window (incl. back-sprite case) by the PROGRESS #95 audit, `docs/battle-anim-assets.md` §5 |
| Down-arrow-alt wait-cursor | **N/A for this window** | not shown at the action menu (§4 rules it out as the idle-cycle driver here); already extracted per `battle-interface-assets.md` for its own (different) context |

## 7. Risks / follow-ups for the engine slice

1. **Slice 2 landed**: Brendan's throw pose-cycle + exit translation and
   the thrown ball's arc are engine-modeled exact for ticks 1574 and
   1605-1614. **Slice 2b landed this session**: the status-bar's
   subsprite-split exit (`sStatusSummaryBar_SubspriteTable_Exit`,
   `drawPlayerSummaryBarExit` in `battleScene.ts`) — `tools/compare/
   traces/menu-throw.json` densified to every tick 1574-1614 (41 total),
   **33/41** at 0 diff (up from 11/41; full derivation §3 point 4b). Two
   concrete, precisely-named follow-ups remain, both real mechanisms this
   session identified but didn't implement (not estimation gaps):
   - **The ball's GBA affine "spin"** (`StartSpriteAffineAnim(sprite,4)`),
     which takes over at tick 1615 — blocks extending
     `playerThrowBallTopLeft` past 1614 without an affine-matrix keyframe
     renderer (§3 point 4).
   - **Brendan-vs-player-icon sprite-priority compositing** (8 ticks,
     1581-1583/1589-1591/1597-1598) — this engine draws strictly in
     draw-call order, but real GBA OAM breaks equal-priority overlap ties
     by sprite-creation order, so Brendan's back sprite (created at the
     intro) wins over the later-created status icons whenever their
     screen footprints briefly cross during his exit slide (§3 point 4b).
   **Materialization landed across three sessions (PROGRESS #98, #99,
   #101)**: the ball's open-pose swap is engine-modeled through tick 1663
   (widened from a single tick #101, pixel-exact through 1656); ONIX's own
   color-fade/affine-emerge accumulator (derived #98), the player-side
   materialize BG-to-white fade (root-caused + fixed #99), and the ball-open
   particle burst (mechanism 3's player-side analogue, landed #101) are all
   landed and pixel-verified. `tools/compare/traces/menu-materialize.json`:
   **1/1 → 5/5** (ticks 1652-1656). Tick 1657+ has a small, separately-named
   residual in `drawPlayerMaterialize`'s own silhouette edge (same CLASS of
   bug §7.21 in `battle-scene-notes.md` root-caused for the opponent's own
   materialize) - not the particle burst, not root-caused this session
   (§3 item 5 has the full accounting).
2. §4's idle-cycle mechanism (which specific sprite/timer drives regions A
   and B) is pixel-pinned but not source-attributed — needed before an
   engine slice can *generate* the cycle rather than just replay captured
   shas.
3. §6's two MISSING items (ball-open particles, affine emerge + color-fade
   tables) block a byte-exact reproduction of ticks ~1646-1690 specifically;
   everything else in this window (text, healthbox, menu, cursor) has a
   clear extracted-asset path already.
4. The cursor-tile byte-check (§5/§6) is a 10-minute follow-up, not a real
   gap — flagged so a future session doesn't waste time re-extracting
   `battle-window.json` from scratch.
