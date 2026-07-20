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
oracle's 256-capture limit). Verified green via `bin/oracle run`. Tick 1750
sha `fd778a4bb67c314116e902d9d30abff50cc4526f0ba5776f20acf1b4312b960c`
reproduced exactly.

**Correction (bounded worker, healthbox slide-in step, following up on the
1693/1696 settle pin below)**: the "tick 1696 and tick 1741 both sha
`6d2e0945...`" claim above was **wrong** — re-verified via two independent
fresh `bin/oracle run` replays of this exact trace (byte-identical to each
other, ruling out nondeterminism) **and** cross-checked against
`battle1-intro.json` (same 40-segment script, confirmed byte-identical
`segments`) at the same ticks, which reproduces the identical wrong-vs-right
shas — not a trace-file drift, a genuine derivation error in the original
pass. Tick 1696's real sha is `4b66ecf2...`; `6d2e0945...` doesn't appear
until tick **1702** (see §1's own correction below for the full tick-by-tick
evidence). Flagging prominently since a later brief (this session's own)
inherited the wrong pin as "scene settles at pinned tick 1693."

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
| **1667-1689** | — | player healthbox slides in, RAM-exact (§3 item 6, this session): `dx=110` at first visible tick 1667, steps -5/tick, settles (`dx=0`) at tick 1689 |
| ~1662-1701 | — | ONIX's own color-fade-to-true-color + a settle-in wobble/overshoot continue past the healthbox's own settle (§3 item 5's still-open blocker) — **not** fully settled by 1693, see the correction below |
| ~~**1693** `6d2e0945...` **scene settles**~~ | | **CORRECTED, WRONG (this session)** — re-verified via fresh `bin/oracle run` (twice, byte-identical) plus an independent cross-check against `battle1-intro.json`'s identical script: tick 1693's real sha is `8ead1641...`, not `6d2e0945...`. The screen keeps changing past 1693 in a way that isn't a clean monotonic settle — it's an **oscillating pattern** (tick 1693 and tick 1700 share the identical sha `8ead1641...`, a 7-tick round-trip) consistent with ONIX's own materialize-tail overshooting and settling, not a hard cut. A transient pass through the eventual hold-sha (`6d2e0945...`) even appears briefly at tick 1698 before diverging again. |
| **1702** | `6d2e0945` | **real scene settle** (corrected pin) — first tick of the true, permanent static hold; verified unchanged through 1741 (40 ticks) |
| 1702-1741 | `6d2e0945` | static hold, 40 ticks — still consistent with `battle-bringup-notes.md` §3's RAM finding that `gBattleControllerExecFlags` stays busy (=1) through tick 1740 (cry SFX + `Intro_DelayAndEnd`'s 3-tick delay still running, invisible on-screen, §3); the delay window is a few ticks longer than this correction's own 1702 start, consistent (the RAM-busy window covers, but isn't identical to, the pixel-static window) |
| 1742-1747 | `4db851c4` | message box **blank** (teal box, no text) — 6 ticks flat, not "several distinct transitional frames" as the coarse pass guessed; it's one steady blank state |
| **1748** | `fd778a4b...` | **first action menu fully drawn — atomically** ("What will ONIX do?" + full FIGHT/BAG/POKéMON/RUN grid + cursor on FIGHT, all in one tick) — corrects the brief's coarse "tick 1750" pin by 2 ticks; same sha as the idle cycle's phase-0 state (§4) |
| 1749 | `b145eaef` | single-tick idle-cycle phase-3 blip (§4) — **not** part of the menu draw itself, a pre-existing global bob timer already mid-cycle |
| 1750-1758 | `fd778a4b` | idle phase 0, 9-tick dwell (cycle properly "starts" its clean dwell here) |
| 1759-1767 | `dfc21faf` | idle phase 1 |
| 1768-1776 | `d223d98a` | idle phase 2 |
| 1777-1785 | `b145eaef` | idle phase 3 |
| 1786-1810 | (repeats) | phase 0/1/2 (trace ends mid-phase-2 at 1810) |

Coarse-pin corrections this session made (all pixel-verified, not guessed):
**menu fully drawn 1748** (not 1750), a 2-tick correction of the same kind
`battle-scene-notes.md` made for its own window (1075 not 1077). **A second,
larger correction (bounded worker, healthbox slide-in step)**: the prior
"settle 1693 (not 1696)" pin was itself wrong in a different way — not just
off by a few ticks, but describing the wrong kind of event (the screen does
NOT reach a clean static hold at 1693; it oscillates through 1701 before
settling for real at **1702**, see §1's correction). A recurring lesson: this
codebase's coarse sampling passes have twice now systematically landed a
few-to-several ticks early on settle events for this specific window,
not late — the opposite direction from `battle-scene-notes.md`'s own
precedent, so "trust the pixel re-derivation over the coarse pass" holds,
but "always land late" is not itself a safe assumption.

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
    painted over him. Root cause (as originally guessed here, **now
    DISPROVEN — see `battle-scene-notes.md` §7.26**): this software
    renderer composites purely in draw-call order (icons drawn after
    Brendan, so they paint over him wherever opaque), but real GBA OAM
    resolves equal-priority overlaps by sprite/OAM-slot creation order —
    Brendan's back sprite (`.priority`, created at the intro, long before
    the status-summary icons) wins the tie and renders in front whenever
    they overlap. ~~This is a genuinely different mechanism (sprite-
    priority/creation-order compositing, not the subsprite-split bar this
    step targeted) and touching the shared `drawSendOutHandoff` draw order
    would risk regressing `sendout.json`'s own established 215/256 (that
    function is shared with the whole 1462+ send-out window)~~ —
    **correction (§7.26, RAM+source-verified)**: Brendan is
    `oam.priority=2`; every icon is `oam.priority=1` — real GBA priority
    comparison is decided by `oam.priority` FIRST (creation order/OAM slot
    only breaks ties within equal `oam.priority`, which this pair never
    has), so the icon (lower number) always wins, unconditionally — the
    engine's current draw order (icon after Brendan) is already correct,
    and this was never a compositing-order bug. The 8 ticks' real cause is
    still open (§7.26 has a concrete next hypothesis: the icon's own
    `eva`/`iconExitDx` state, not sprite ordering) — **do not attempt an
    order-based fix here**.
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

     **Re-derived this session (bounded worker, following §7.21's own
     template - brute-force against oracle pixels first, then confirm via
     RAM probe), per the brief's instruction to re-check #98's `local+2`
     accumulator lead now that the BG fade (#99) and particle burst (#101)
     both sit underneath it: the accumulator/`y2` pair itself is NOT the
     bug.** Re-ran the exact-tint-pixel-SET brute force (`tools/compare/
     scratch/menu-audit/reprobe_player_materialize.mjs`, same method as
     `onix_materialize_bruteforce.mjs` but against fresh oracle captures with
     the full current stack) at every tick 1653-1665: the CURRENT
     `affineEmergeAccumulator(local+2)`/`MATERIALIZE_Y2_TABLE[local]` pair is
     already the best-scoring match at every tick (diff 0,0,0,1 for
     1653-1656, growing to 4,8,13,37... for 1657+ in a smooth, monotonically
     GROWING pattern) - the exact "known-occluder-holes" shape §7.21 itself
     documented for the opponent's own (already-correct) case, not a sign of
     a wrong formula. No change made to either value.

     **The real bug: `PLAYER_BALL_OPEN_END_TICK` (1663) was over-widened.**
     RAM-probed directly (`tools/probe/specs/menu-player-materialize.json`,
     `gSprites[5]` - the ball sprite slot §3 item 4c already pinned -
     watching `animCmdIndex`/`animDelayCounter`): `sBallAnimSeq1`'s
     `ANIMCMD_FRAME(4,5)` ("open", 5 ticks) is active RAM ticks 1651-1655
     only, then `ANIMCMD_FRAME(8,5)` (a genuinely-blank, all-index-0 frame -
     confirmed by direct scan of the committed tileset) takes over at RAM
     1656. With this window's own established +1 render lag (re-confirmed
     here via the arrival position itself, RAM 1650 -> render 1651, matching
     the independently-pinned "arrival is exactly trace tick 1651"), the
     open pose is visible ONLY at renders 1652-1656 - exactly the
     already-committed 0-diff span, and exactly the same 5-tick duration the
     OPPONENT's own `drawSendOutBall` already implements
     (`BALL_OPEN_START_OFFSET`..`BALL_INVISIBLE_START_OFFSET` = 18..23, also
     5 ticks) - the opponent's own code was already right; #101's widening
     of the player's own window to 1663 was an unverified guess that
     happened to not break anything at the time. **Verified empirically**
     (`npm run compare`): shrinking `PLAYER_BALL_OPEN_END_TICK` back to 1656
     leaves ticks 1657-1662 completely UNCHANGED (this function's own drawn
     pixels never actually overlapped that residual's specific positions,
     proving the wider window was never load-bearing there) and newly fixes
     tick 1663 to exact 0 diff (was 1px). `tools/compare/traces/
     menu-materialize.json`: **5/5 -> 6/6** (non-contiguous, matching
     `menu-throw.json`'s own precedent - 1652-1656 + 1663; 1657-1662 excluded
     with precise attribution below).

     **What's left at 1657-1662, re-scoped (not solved) this session**: every
     mismatched pixel's color is exclusively in the ball's own palette
     (`battle-anim-ball-open.json`/`summary-ball.json` - `66,66,66`/
     `214,41,41`/`132,0,0`/`255,156,123`), confirmed by direct palette scan of
     every extracted asset to be UNIQUE to those two ball files - not the
     particle palette (`battle-anim-particles.json`, checked directly, zero
     overlap) and not ONIX's own back-sprite palette (checked directly, zero
     overlap, and mathematically impossible to reach via any single-
     coefficient blend of ONIX's grayscale-ish true colors toward the
     pinkish tint - blending can't invert the R>G,B channel ordering
     `(255,181,247)`'s own blend target imposes). Both this session's own
     candidate mechanisms are now proven NOT responsible (accumulator/`y2`
     re-brute-forced correct above; ball-open's own window A/B'd to have zero
     effect on these specific pixels). Still unidentified - a future session
     should treat this as its own, separately-named residual (NOT a
     `drawPlayerMaterialize` silhouette-edge bug, despite the surface
     resemblance to §7.21's own naming) rather than re-trying either of this
     session's two ruled-out candidates.

     **Root-caused and mostly landed (bounded worker, PROGRESS #105, following
     up on PROGRESS #104's own "Next" hypothesis)**: the mismatched colors
     above (`66,66,66`/`214,41,41`/`132,0,0`/`255,156,123`) are exclusively
     the ball's own palette because they ARE the ball, still on screen -
     `battle-scene-notes.md` §7.25's discovery for the OPPONENT's own ball
     (`LoadBallGfx`, `pokeball.c:1308-1332`, unconditionally DMAs
     `graphics/balls/open.png` over `sBallAnimSeq1`'s nominally-blank
     `ANIMCMD_FRAME(8,5)` tile slot at sprite creation) is a battler-generic
     call site, not opponent-only, so the exact same "openFinal" 3rd frame
     plays for the PLAYER's own ball too. RAM-probed directly
     (`tools/probe/specs/menu-player-materialize.json`, `gSprites[5]` - the
     same ball slot `PLAYER_BALL_OPEN_END_TICK` already pins): `animCmdIndex`
     flips 0->1 at RAM 1656 (immediately after the open pose's own 5-tick
     hold ends), `animDelayCounter` counts down 5 more ticks (RAM 1656-1660,
     matching `ANIMCMD_FRAME(8,5)`'s own duration exactly), `animEnded` sets
     at RAM 1661 - with the window's established +1 render lag, the openFinal
     pose is visible at renders 1657-1662 (6 ticks). **Pixel-confirmed before
     touching code, per this session's own A/B-the-baseline-first brief**
     (`tools/compare/scratch/menu-audit/classify_1657_1663.mjs`, fresh oracle
     captures): tick 1657's entire 19px residual is an EXACT match to
     `battle-anim-ball-open.json`'s openFinal tile content at
     `BALL_OPEN_TOP_LEFT`/`PLAYER_BALL_OPEN_VISIBLE_BOTTOM` (19/19), and the
     large majority of 1658-1662's own residual too (17/19, 20/26, 26/30,
     19/21, 14/16). Tick 1663 was checked and confirmed the ball is already
     invisible by then (oracle's own pixels there show the materialize tint
     fully replacing the ball's colors) - extending one tick further would
     repeat the exact over-widening mistake `PLAYER_BALL_OPEN_END_TICK` was
     itself corrected away from in this same item, so the window stops at
     1662, not 1663.

     **Fix landed**: `battleMenu.ts` gained `PLAYER_BALL_OPEN_FINAL_END_TICK`
     (1662) and widened `playerBallOpenTopLeft`'s own range to it (both poses
     share the same settled-position corner); `drawPlayerBallOpen`
     (`battleScene.ts`) now picks the tile-row offset (0 for open, 2 for
     openFinal) by comparing `t` against `PLAYER_BALL_OPEN_END_TICK`, reusing
     the SAME extracted `battleAnimBallOpen` tileset the opponent's own
     `BALL_OPEN_FINAL_TILESET` already selects (one shared asset, two
     battler-specific draw sites - `drawSendOutBall`'s own unclipped corner
     vs. this function's clipped one). `tools/compare/traces/
     menu-materialize.json`: **6/6 -> 7/7** (tick 1657 newly exact; verified
     via `npm run compare` against the full composited engine, not the
     isolated probe above).

     **What's left at 1658-1662, re-scoped again (CLOSED, §7.27)**: a SMALL
     (2-6px) residual remained at every one of these 5 ticks -
     pixel-classified (same script) as particle-position pixels (oracle
     color `255,173,0`, `battle-anim-particles.json`'s own known burst
     color, not in the ball-open palette at all) sitting adjacent to the ball
     corner. Named here as "the same particle-vs-ball z-order/overlap family"
     `battle-scene-notes.md` §7.25 left open for the OPPONENT's own send-out
     (1482-1490/1497-1498) - **that framing turned out to be imprecise, not
     wrong**: `battle-scene-notes.md` §7.26/§7.27 root-caused it as
     particle-vs-PARTICLE (same-burst particles resolving their own Y
     tie-break, `SortSprites`), not particle-vs-ball - the ball sprite's own
     `oam.priority` (2, `sBallOamData`, `pokeball.c`) is strictly higher than
     the particle burst's (1, `AnimateBallOpenParticles`'s literal `1, 28`
     argument, `pokeball.c:757`), so the particle-vs-ball order was already
     GBA-correct unconditionally (particles always win) with no code change
     needed there. Implementing `drawPlayerBallOpenParticles`'s real per-tick
     Y-sort (`sortAliveParticlesByScreenY`, replacing the static reversed
     spawn-index loop) closed all 5 ticks to 0 diff -
     `tools/compare/traces/menu-materialize.json`'s own `captureFrames` was
     widened to include 1658-1662 (was 7 frames skipping them, now 12
     contiguous 1652-1663) and reads **12/12**.
6. `HandleBallAnimEnd` waits for both the ball sprite's anim **and** the mon
   sprite's affine anim to finish, then `Intro_TryShinyAnimShowHealthbox`
   (`battle_controller_player.c:979`) calls `UpdateHealthboxAttribute(...,
   HEALTHBOX_ALL)` (draws name/level/HP-bar/digits) + `StartHealthboxSlideIn`
   once cry playback (`waitForCry`) and BGM restore both clear.
7. `Intro_WaitForShinyAnimAndHealthbox` (`:940`) waits for the healthbox
   sprite's slide-in callback to go idle, then sets a **3-tick**
   `introEndDelay` and hands off to `Intro_DelayAndEnd` (`:931`), which
   decrements it to `PlayerBufferExecCompleted()`.

**The 1702-1741 static hold, explained**: pixels settle at **1702**
(corrected from the previously-claimed 1693, §1) but
`battle-bringup-notes.md` §3's RAM trace shows `gBattleControllerExecFlags`
staying busy through tick 1740 — this is consistent with the **cry SFX
still playing** (audio-gated, `waitForCry`, no pixel effect) plus the 3-tick
`introEndDelay`, not a mechanism gap; the busy window simply extends a few
ticks earlier than the pixel-static one (nothing requires the two to share
an exact start tick). No RNG anywhere in this chain (the 9-total-draws
RNG-checkpoint table in `battle-bringup-notes.md` §3 is unaffected; this
slice found no additional draws).

## 3a. Item 6: player healthbox slide-in (this session, bounded worker)

**RAM-probed exact** (`tools/probe/specs/menu-player-healthbox.json`,
`gSprites[0]` — per `docs/battle-menu-idle-notes.md`'s own pin, the same
slot that sprite's later idle-bob analysis (§4) already names as the
healthbox's main sprite): `callback` flips from `SpriteCallbackDummy`
(`0x8010ce9`, decimal `134247465`) to `SpriteCB_HealthboxSlideIn`
(`134703565`) at **RAM tick 1666**, where `x2` is first written **110** and
steps **-5/RAM-tick** every tick after (110, 105, 100, ..., 5), landing on
**0** at RAM tick 1688 and holding — callback reverts to the dummy value
there too, confirming settle. `y2` stays 0 throughout (horizontal-only, like
the opponent's own mechanism). `oam.priority` (`gSprites+0x04`, bits 10-11)
reads **1** — same layer as the opponent's own healthbox and the
ball-open-particle family (`battle-scene-notes.md` §7.26).

With this window's established **+1 render lag** (screen tick = RAM tick+1,
independently re-confirmed here: RAM 1666 → render 1667 matches the
pixel-derived first-visible tick and its `dx=110` exactly, brute-force
found in isolation before this was RAM-probed at all), the box is first
visible at trace tick **1667** (`dx=110`, almost entirely off the right
edge of the 240px screen — only its own leftmost sliver is on-screen),
steps -5px/tick, and settles (`dx=0`) at trace tick **1689**, holding
indefinitely from there (through at least 1741, the confirmed static-hold
tail).

**Content**: pixel-harvested (same "oracle is ground truth" methodology as
`extract-sendout-healthbox-content.ts`'s own opponent-side precedent, §7.6/
§7.9 of `battle-scene-notes.md`) — `extract-menu-healthbox-player.ts` →
`src/assets/gen/menu-healthbox-player.json`, bbox `(127,74)-(229,109)`
(103×36), harvested from `battle1-menu-dense.json`'s own tick 1730 (deep in
the confirmed static hold). Non-rectangular-content bleed masked out at
draw time (`getMenuHealthboxPlayerContentMask`, `battleScene.ts` — the same
`§7.23` lesson the opponent's own harvest already needed, applied up
front this time rather than discovered after the fact).

**No spatial overlap with ONIX, despite the brief's working assumption**:
the settled bbox (x0=127) never comes within reach of ONIX's own
materialize bbox (x≤104, `ONIX_MATERIALIZE_CORNER`+64px sprite width) even
at the slide's maximum offset (dx=110 → left edge x=237) — pixel-confirmed,
no oracle capture shows the two regions' bounding boxes intersecting at any
modeled tick. No `SortSprites`-family z-order/priority-tiebreak code was
needed for this mechanism.

**Region-isolated verification (not full-frame — see the blocker below)**:
comparing the app's own rendered healthbox bbox region (`x≥127, y∈[74,109]`)
against the oracle at every tick 1653-1711 gives **zero pixel diff at every
tick**, including through the confirmed 1702-1741 static hold — the slide
mechanism itself is exact, both during the slide and settled.

**Blocked from closing a full-frame trace (pre-existing, not introduced
this session, and out of this task's own assigned mechanism)**: every trace
tick from ~1664 onward already has a full-frame mismatch regardless of the
healthbox, because (1) `drawPlayerMaterialize`'s own materialize-tint
window ends at `PLAYER_MATERIALIZE_END_TICK` (1663) and **nothing draws
ONIX at all after that** — the "coefficient-fade-to-true-color ramp...
entangled with the still-unresolved idle-bob mechanism" §3 item 5 already
named and deliberately left unimplemented is a real, unsolved gap, not a
formality (empirically checked this session: even the single best candidate
tick for "ONIX has reached its plain, untinted, unscaled settled sprite"
still mismatches by 632px in isolation — no clean single tick exists where
a plain draw closes it); and (2) a small triangular residual (x∈[100,109],
y∈[96,111], ONIX's own ground-shadow, immediately adjacent to but distinct
from the healthbox's own bbox — see `extract-menu-healthbox-player.ts`'s own
header comment) is tied to the same unresolved ONIX-tail mechanism, not the
healthbox. **Neither gap is this task's assigned mechanism** (the brief was
"the PLAYER healthbox slide-in") and neither was introduced this session —
both pre-date it and are already named in §3 item 5's own "not continued
into the coefficient-fade..." disclaimer. Filed as ISSUES #17 for a future
session. Per this run's own harvest-first precedent (`sendout.json` stayed
at a fixed score across several sessions while its own transient window was
solved piece by piece, `battle-scene-notes.md` §7.9-§7.27), `tools/compare/
traces/menu-materialize.json` is intentionally left unwidened past 1663 (no
regression: still 12/12) rather than widened with captures that would fail
on a mechanism this step doesn't own — a sibling `menu-healthbox.json`
trace was considered and rejected for the same reason (every candidate
capture tick already fails full-frame on the ONIX gap alone).

**Not tick-exact this session** (time-budget cut, pixel-sampled at ~8-tick
granularity rather than every-tick sub-region diffing): the precise
tick boundaries for "Brendan fully exits" / "ball spawns" /
"silhouette flat-color starts" / "true-color complete" / "healthbox
slide starts". ("Ball arrives" is now resolved exactly - trace tick 1651,
item 4c above.) The dense trace (`battle1-menu-dense.json`) has every
frame needed for a future session to nail these exactly via the same
sub-region-diff technique used for the text cadence (§2) — flagging as
open rather than asserting unverified tick numbers.

## 3b. Item 5's own blocker RESOLVED (ISSUES #17, bounded worker, this
   session): color-fade-to-true-color + settle wobble - the LAST
   unimplemented S6 window closes, `menu-materialize.json` **12/12 → 62/62**
   (widened 1652-1663 to 1652-1741 with samples)

RAM-probed directly (`tools/probe/specs/menu-player-materialize-taskfade.json`
— a full `gTasks[0..15]` scan reusing `sendout-grovyle-taskfade.json`'s own
watch shape, PLUS `gSprites[6]`'s own `y2` field `menu-player-
materialize.json` already watched), and independently cross-validated a
SECOND way (brute-force pixel decode against `battle1-menu-dense.json`'s own
oracle captures, reversing `blendComponentToward` per-channel over every
opaque ONIX texel, `tools/compare/scratch/menu-audit/
decode_player_tint_scratch3.mjs`) — both methods agree at every one of the 39
checked ticks (1664-1702), so this is ground truth, not a fit.

**The color fade** (`Task_FadeMon_ToNormal`/`_Step`, `battle_anim_throw.c:
2078-2102` — the OTHER effect of the SAME `LaunchBallFadeMonTask(TRUE,
battler, 14, ballId)` call site item 5 already cites for the BG-white
dither): the task is created at ball release with `tCoeff=16` (fully
tinted) and sits frozen there polling `!gPaletteFade.active` (the concurrent
BG-white flash, `PLAYER_BG_FADE_Y`) until it clears — RAM-confirmed the
poll resolves at RAM tick 1673 — then `Task_FadeMon_ToNormal_Step`
decrements `tCoeff` by 1 every tick for 17 calls before true colors show.
Folding in this window's own established render lag collapses to a clean
closed form: coefficient 16 constant through render 1675, then exactly one
integer step down per tick, reaching 0 (true color) at render **1691** and
staying there (`playerMaterializeSettleTintCoeff`, `battleMenu.ts`).

**The settle wobble** (item 5's own "may be the DoBounceEffect pre-menu
state or an affine tail" lead): confirmed NOT `DoBounceEffect`
(`battle_controller_player.c:237-238`, `HandleInputChooseAction` — too small
an amplitude (1), and that call site only runs once the action menu is
polling for input, i.e. `MENU_DRAW_TICK`+ — a different, already-implemented
mechanism, `menuIdleBounce`). RAM-probed instead (`gSprites[6].y2`): once
ONIX's own affine scale-in finishes (`affineAnimEnded`, RAM tick 1666),
`BattleAnimateBackSprite` (`pokemon.c:6886`) launches ONIX's own species
back-sprite entrance animation (`LaunchAnimationTaskForBackSprite`,
source-confirmed `GetSpeciesBackAnimSet(SPECIES_ONIX) = BACK_ANIM_V_SHAKE` —
a real vertical-shake entrance, one of 3 nature-dependent variants selected
by `sBackAnimNatureModTable`) — a genuine THIRD animation, exactly as item
5's own lead warned. Kept as a literal RAM-derived table
(`PLAYER_SETTLE_WOBBLE_Y2_TABLE`, `battleMenu.ts`) rather than
reverse-engineering which of the 3 nature-dependent `VerticalShake*`
variants this save's ONIX resolves to: holds 0 through render 1669, then an
irregular (non-monotonic, `Sin`-table-driven) bounce through render 1701,
settling permanently at 0 from render **1702** on — the exact tick PROGRESS
#109 independently corrected the scene's own full-frame settle pin to (two
unrelated derivations landing on the same tick, not a coincidence).

**A second, pre-existing bug found and fixed along the way** (not part of
ISSUES #17's own named mechanism, but blocking this window's 0-diff
closure): `brendanThrowFrame` (`battleMenu.ts`) uses `null` for BOTH ends of
its own frame table — before the throw starts, AND once its `FRAME(3,50)`
tail is exhausted (et≥116, render tick 1690+) — a "table truncated both
ends" case, this run's own named convention. `drawSendOutHandoff`
(`battleScene.ts`) conflated the two, redrawing Brendan's **settled
on-screen pose** at `PLAYER_CORNER` once the table ran out, when the real
game has him long gone (permanently off-screen, `brendanThrowDx` itself
freezes there). Invisible before this session (masked by the much larger
ONIX-missing gap it happened to spatially overlap — `PLAYER_CORNER` (48,48)
vs. `ONIX_MATERIALIZE_CORNER` (40,48)); surfaced the moment ONIX's own real
transparency let Brendan's incorrect redraw show through underneath at
render 1690+. Fixed by gating the settled-pose draw on `t <
BRENDAN_THROW_START_TICK` directly instead of `throwFrame === null`.

**A third, pre-existing gap found and closed**: `drawPlayerBallOpenParticles`
(`battleScene.ts`) never had an upper tick cutoff (particle age alone gates
it, live through logical tick 39 / render 1692), but a prior session had
explicitly NOT ported the opponent's own `drawBallOpenParticles` one-tick
RAM-stall correction (`PARTICLE_STALL_LOGICAL_TICK`/
`PARTICLE_LATE_SPAWN_START_INDEX`) since "this window's own then-relevant
range stopped well short of" where it matters. This session's own widened
window (out to render 1692) made that omission visible for the first time
(a small, shrinking 104px→13px residual, exclusively particle-burst colors)
— porting the identical correction verbatim closed it to 0 diff, confirming
it's the same one-tick stall on both sides, not a coincidence.

**Result**: `tools/compare/traces/menu-materialize.json` widened from
`captureFrames` 1652-1663 (12) to 1652-1710 contiguous + 1720/1730/1741
samples (62 total; the 1702-1741 static hold is one sha, per PROGRESS #109
— a few samples suffice, `menu-idle.json` owns 1742+) — **62/62 at 0 diff**.
Full 23-trace sweep re-verified at every other trace's exact prior count,
zero regressions. **With this landed, the S6 chain (send-out through the
settled first-action-menu idle) has NO unimplemented window left**:
`menu-throw.json` (1574-1651, 70/70) → `menu-materialize.json` (1652-1741+,
62/62) → `menu-idle.json` (1742-1810, 69/69) are contiguous and all 0-diff.

## 3c. `menu-throw.json`'s last 8 ticks (1581-83/1589-91/1597-98) CLOSED - not a compositing-order bug (`battle-scene-notes.md` §7.26 was right to rule that out), not an icon timing bug either (both `playerSummaryIconExitDx`/`playerSummaryFadeEva` are RAM-exact at every one of these ticks) - the real bug was `blendedSetPixel`/`blendedTile`'s own target-2 choice, plus a missing "sprite destroyed" cutoff (bounded worker, this session)

Per the brief: pixel-classify first. Direct oracle diff on a scratch
`captureFrames` copy of the 8 ticks (`tools/compare` against a widened
`menu-throw.json`) shows the mismatch pixels sit squarely inside **Brendan's
own sprite footprint** (e.g. tick 1581, x72-78/y89-94 - `PLAYER_CORNER`
(48,48) + `brendanThrowDx(1581)=-19` puts his 64x64 frame at x29-92), not
anywhere near where the docs' own "player icons live at x150-239" note would
suggest - so the icon really does travel all the way there: `playerSummaryIconExitDx`'s
triangular accelerating slide (§3 above) is far larger than it looks over a
handful of ticks (icon 0 alone covers -84px by tick 1581, -198px by 1585).

**RAM-probed both mechanisms directly** (new
`tools/probe/specs/menu-throw-icon-exit-timing.json`, `gSprites[3].x2`
(Brendan), `gSprites[54..59].x2` (the 6 player icons), and a `gTasks[0..15]`
func+`tBlend` scan to find `Task_HidePartyStatusSummary`'s own live task)
across trace ticks 1560-1611. Both `brendanThrowDx` and
`playerSummaryIconExitDx`/`playerSummaryFadeEva` reproduce the RAM values
**bit-exact at every single tick in the named window** (verified
programmatically, not sampled) - so the 8-tick residual is not a timing bug
in either sprite's own position/alpha at all. It's the two sprites'
**overlap itself**, i.e. how this codebase composites one blended sprite on
top of an already-opaque one.

**The real mechanism**: real GBA OBJ hardware tracks only the **single
topmost** sprite pixel per screen dot in its compositing buffer - there is no
"second OBJ pixel" available for the blend hardware to fall back on. When
the icon (`oam.priority=1`, blend target-1, `BLDCNT_TGT2_ALL` includes OBJ)
is the topmost opaque pixel at a dot, and Brendan (`oam.priority=2`) is
genuinely underneath it on screen, the hardware's "target 2" is **not**
Brendan's sprite color - it falls through to whatever the BG layers show at
that dot (the plain background here, since nothing else occupies it).
`blendedSetPixel`/`blendedTile` (`battleScene.ts`) instead blended against
whatever this codebase's own painter's-algorithm framebuffer already held at
that pixel - Brendan's raw, unblended, opaque color, since he's drawn first.
Confirmed arithmetically before writing any code: at tick 1581/(73,89),
`blend(iconColor, backgroundColor=(247,247,255))` reproduces the oracle's
`(117,111,131)` exactly; `blend(iconColor, brendanColor=(24,41,82))` (the
prior behavior) gives `(61,59,88)` - exactly what this codebase was actually
drawing.

**Fix**: both blend helpers now resolve target-2 from the plain background
tile (`healthboxBackgroundColorAt`, already used elsewhere in this file for
an analogous "what's really behind this" lookup) instead of `fb`'s
accumulated content, falling back to `fb` only if no background tile is
found (should never happen in practice - belt-and-suspenders).

**A second bug this immediately exposed** (regression caught by the full
sweep before landing, not shipped blind): once `playerSummaryFadeEva` bottoms
out at 0 (tick 1605+ - the real hardware's `Task_HidePartyStatusSummary_
BattleStart_2` destroys the bar+icon sprites outright the same tick,
RAM-confirmed), this codebase kept calling the blend helpers anyway with
`eva=0`. Blending at 0% is mathematically a no-op **only if target-2 is
whatever's already drawn there** - which is exactly the behavior the fix
above just removed. With target-2 now resolved to the plain background,
`eva=0` stopped being a no-op and instead re-painted background over
whatever draws later at that spot every tick (the thrown ball's own
open/spin animation, `menu-throw.json` 1646-1648 - previously-passing ticks
that regressed the moment the OBJ-vs-OBJ fix landed). Fixed the same way the
already-correct `drawOpponentSummaryExit` handles its own analogous case
(`if (blend <= 0) return`): `drawBallIcons` now skips drawing the player
bar/icons entirely once `playerEva` reaches 0, matching the real sprites'
destruction instead of blending them at zero visible effect against the
wrong target.

**Result**: `tools/compare/traces/menu-throw.json` widened `captureFrames`
from 70 (1574-1651 minus the 8 excluded ticks) to the full contiguous
1574-1651 (78 ticks) - **78/78 at 0 diff**. Full 23-trace sweep re-verified:
every other trace at #111's exact prior count, zero regressions -
**`sendout.json` incidentally improved 246/256 → 251/256** for free (the
same OBJ-vs-OBJ target-2 fix applies to `drawOpponentSummaryExit`'s own
blended tiles, shared code, no separate diagnosis needed). **With this
landed, `menu-throw.json` (1574-1651) → `menu-materialize.json`
(1652-1741+) → `menu-idle.json` (1742-1810) are ALL 0-diff and contiguous -
the whole S6 chain (send-out through the settled action menu) has no known
pixel gap left.** New Tier-1 tests (`tests/battleMenu.test.ts`) pin 3
oracle-verified pixels inside the fixed overlap (one per excluded tick
group) plus the destroy-cutoff regression guard.

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
| Player healthbox (name/level/HP-bar/digits, left+right halves) | **extracted (raw tileset)**; **rendered content pixel-harvested** (§3a, this session) | `src/assets/gen/battle-healthbox.json` (raw tileset, unused for rendering per ISSUES #16's deliberate harvest-first deferral) / `src/assets/gen/menu-healthbox-player.json` (the actual settled-content asset `drawMenuHealthboxPlayer` reads, `battleScene.ts`) |
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
   - **Brendan-vs-player-icon compositing** (8 ticks,
     1581-1583/1589-1591/1597-1598) — **the "equal-priority, sprite-creation-
     order tie-break" framing here is DISPROVEN, see `battle-scene-notes.md`
     §7.26/§3 point 4b below**: Brendan and the icons have DIFFERENT
     `oam.priority` (2 vs. 1), so the icon wins unconditionally regardless of
     creation order - this engine's current draw order (icon after Brendan)
     is already GBA-correct. The 8 ticks' real root cause is still open (icon
     eva/exit-timing lead, not a compositing-order bug).
   **Materialization landed across five sessions (PROGRESS #98, #99, #101,
   #103, #105)**: the ball's open-pose swap is engine-modeled through
   `PLAYER_BALL_OPEN_END_TICK` (5 ticks, 1652-1656, #103) then its own
   openFinal 3rd frame through `PLAYER_BALL_OPEN_FINAL_END_TICK` (6 more
   ticks, 1657-1662, #105 - the same missing-frame mechanism
   `battle-scene-notes.md` §7.25 found for the opponent's own ball);
   ONIX's own color-fade/affine-emerge accumulator (derived #98,
   re-brute-forced correct #103, no change needed), the player-side
   materialize BG-to-white fade (root-caused + fixed #99), and the ball-open
   particle burst (mechanism 3's player-side analogue, landed #101) are all
   landed and pixel-verified.
   `tools/compare/traces/menu-materialize.json`: **1/1 → 7/7 → 12/12
   (§7.27)** - `captureFrames` widened to the contiguous 1652-1663 span (was
   7 frames skipping 1658-1662); those 5 ticks' small (2-6px) residual
   (pixel-classified by #105 as "the particle-vs-ball z-order family"
   `battle-scene-notes.md` §7.25 already named for the opponent's own
   send-out) is root-caused and closed by §7.26/§7.27's real per-tick
   `SortSprites` Y-sort (`sortAliveParticlesByScreenY`) - it turned out to be
   particle-vs-PARTICLE, not particle-vs-ball (the ball's own higher
   `oam.priority` already made it lose to the particle burst
   unconditionally, no ball-side change needed).
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

## 8. The FIGHT (move-select) submenu engine slice (bounded worker, this session — implements docs/battle-turn-notes.md §11's ground truth)

Extends the S6 chain (§4/§5 above) past the settled action menu's first
A-press: `src/engine/battleMenu.ts`'s new `FightSubmenuState` (open/nav/
close, `openFightSubmenu`/`moveFightCursor`/`closeFightSubmenu`/
`advanceFightSubmenuDisplay`) plus `battleScene.ts`'s `drawFightSubmenuWindow`
dispatcher, wired into `core.ts`'s `tick()`. Scope: A-press → submenu opens
→ cursor nav (all 4 positions) → B-close → resumed action-menu idle cycle.
Move confirmation (A on a move) is out of scope, per the brief.

**Rendering approach — per-slot static harvest, not glyph rendering.**
The brief suggested reusing the text/glyph infrastructure
(`font-normal.json` etc.), but `B_WIN_MOVE_NAME_*`/`B_WIN_PP`/
`B_WIN_MOVE_TYPE` all use `FONT_NARROW` (`battle_message.c`), a font this
codebase has never extracted — only `FONT_NORMAL`/`FONT_SMALL` exist, and
`FontFunc_Narrow` reads `gFontNarrowLatinGlyphs`, a genuinely separate glyph
tileset from `gFontNormalLatinGlyphs` (source-confirmed, not just a
narrower-width table over the same glyphs). Extracting a whole new font
was out of proportion to this slice's time budget. Instead: §11 finding 2
already established the window content is "a pure function of (selected
slot, global phase clock)" — this session pixel-confirmed the STRONGER
claim that the window-region bbox `(1,113)-(231,158)` (231×46, isolated by
diffing tick 1887 vs 1892, both sharing the same onix/healthbox bounce
state) is **byte-identical across an entire slot's whole dwell**, both of
DRAGON_BREATH's two separate visits included. So each of the 4 slots needs
exactly ONE static harvested patch (`tools/extract/
extract-fight-submenu-window.ts` → `src/assets/gen/fight-submenu-window.json`),
reusing the exact same harvest-per-region convention §5/§6 already
established for the settled action menu itself — not a new mechanism, the
same one applied one level deeper. The bounce regions above/beside this
window (ONIX battler + healthbox, `menuIdleBounce`) are reused verbatim;
this bbox sits entirely below both (max bounce y=110 vs. this window's
y≥113), pixel-confirmed no overlap.

**Timing constants, pixel-fit exact against the groundtruth trace**
(`tools/compare/traces-groundtruth/battle1-fight-submenu-nav.json`):
`FIGHT_SUBMENU_OPEN_DELAY = 5` (press 1887 → reveal 1892, matching §11
finding 1 exactly) and `FIGHT_SUBMENU_CLOSE_DELAY = 6` (press 2047 → reveal
2053 — wider than §11's own "2-tick hold" description, which characterizes
the RAM-side redraw calls, not this window's full pixel-visible round-trip
back through a fresh `PlayerHandleChooseAction`, source-confirmed to redraw
the whole action-menu window from scratch via its own `HandleChooseActionAfterDma3`
DMA-wait — not merely un-hide the old one). The open DMA-wait's "5-tick
hold" (§11 finding 1) needed **no special-casing at all**: it's just this
same bounce cycle naturally dwelling on one phase for that exact span
(pixel-confirmed with a plain, unshifted `t` against `drawActionMenuIdleWindow`) —
the settled action-menu window content genuinely doesn't change until the
hard cut, so nothing new was needed for that span beyond calling the
existing function.

**The bounce-overlay tick shift — a real, pixel-fit-necessary correction,
mechanism not fully source-confirmed.** `menuIdleBounce`'s existing sprite
(never reset while FIGHT is open — `HandleInputChooseMove` doesn't call
`DoBounceEffect`/`EndBounceEffect` at all, source-confirmed) should in
principle apply completely unmodified to the submenu window too. Dense
pixel comparison against the oracle found otherwise: the submenu's own
bounce overlay needs `menuIdleBounce(t - 2)` (`FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT`,
0/160 mismatches across the ENTIRE nav groundtruth window, every slot
checked — a clean, total match), and the RESUMED action menu (post
B-close) needs a FURTHER `t - 4` (`FIGHT_SUBMENU_RESUMED_BOUNCE_SHIFT`,
only 1/66 residual — see below). I.e. each of the two atomic hard-cut
DMA-wait events (open, then the close-and-redraw round-trip) costs the
bounce sprite's own per-frame update exactly 2 more ticks of drift than
this window's established render-lag convention alone predicts. Plausible
mechanism (not RAM-confirmed this session): the DMA copy is a genuine
CPU-blocking transfer — while it runs, no game logic (incl. the bounce
sprite's own per-frame `+=7`) executes for a couple of frames, even though
the trace's own frame/VBlank count keeps advancing regardless (frames are
counted by hardware VBlank, not by whether game logic ran that frame).
Kept as literal pixel-fit constants per this run's own established
convention for exactly this situation (`BALL_SPIN_TABLE`/
`MATERIALIZE_Y2_TABLE` precedent), not asserted as proven source behavior.

**One open anomaly, individually attributed (not curve-fit or silently
excluded).** `tools/compare/traces/fight-submenu.json` (a direct copy of
the nav groundtruth trace's button script, 235 dense captures spanning
open → all 4 nav positions → held-repeat check → B-close → 65+ ticks of
resumed idle, more than one full 36-tick cycle) passes **234/235**. The one
residual, tick **2073**, is a 99px row-shaped diff confined to exactly
screen row y=111 (x 127-225) — one pixel row BELOW the healthbox bounce
region's own bbox (y74-110) — pixel-confirmed via direct diff, not
inferred. This is the same still-unidentified family §11 finding 4 already
flagged for the idle-only trace's own two anomalies (ticks 2071/2135 there,
a different button script so not the same absolute tick, but the same
"single-tick, boundary-row, healthbox-adjacent" shape). Tried and ruled
out: a third discrete healthbox-bounce state (the existing 0/1/2 model
already covers every OTHER tick in this 235-tick window with 0 residual);
a different `FIGHT_SUBMENU_RESUMED_BOUNCE_SHIFT` value (every integer
shift from -9 to 0 was grid-searched against the full post-close range —
`-4` is uniquely optimal at 1/66, every other value is strictly worse, see
the git history of this session's scratch work). Not root-caused further
within this session's cap — flagged for whoever next touches this window,
per this run's no-silent-exclusion policy.

**Zero regressions**: menu-idle 69/69, menu-throw 78/78, menu-text 18/18,
sendout 255/256 (unchanged, only 1496 open), s6-acceptance 224/228
(unchanged). `npm test` 592/592 (+13 Tier-1 this session), `npm run build`
green.

## 9. S7 slice A: move CONFIRMATION and turn kickoff (bounded worker, this
session - A on ROCK_SLIDE -> submenu closes -> "Foe GROVYLE used\nDOUBLE
TEAM!" prints, ending exactly at tick 1964 where DOUBLE_TEAM's clone
animation starts, out of scope per docs/battle-move-anim-notes.md §8)

§11 (docs/battle-turn-notes.md) only ever exercised nav + B-close; nobody had
pressed A on a highlighted move before. This session densely re-probed the
window (own oracle trace, 121 dense captures ticks 1900-2020, twice-run 0
sha mismatches - `bin/oracle run` against a trace that reuses
`battle1-turn1.json`'s own first 43 segments verbatim through the 2nd A
press) and RAM-probed alongside it (`tools/probe/ram-probe.py`, `mainFunc`/
`execFlags`/`ctrlFunc0`/`ctrlFunc1`/`moveCursor`/`attacker`/`curMove`/
`bg0y`, ticks 1900-2020).

**Milestone table** (all ticks this session's v5 numbering, identity-mapped
from §9's own table through the 2nd A press per §11's own method note):

| tick | event |
|---|---|
| 1918-1920 | 2nd A press (held 2 frames) |
| **1919** | `JOY_NEW(A_BUTTON)` registers: `gBattleControllerExecFlags` bit0 clears, player `gBattlerControllerFuncs[0]` changes away from `HandleInputChooseMove` - RAM-confirmed, matches `HandleInputChooseMove`'s `!canSelectTarget` branch (`battle_controller_player.c:524-528`: `BtlController_EmitTwoReturnValues`+`PlayerBufferExecCompleted`, no visible per-frame close redraw at all, unlike B's own DMA round-trip) |
| 1919-1921 | submenu keeps showing its ordinary idle-cycle content (mid-phase, frozen visually only because the phase's own sine value happens to plateau there - NOT yet a mechanism freeze) |
| 1922-1924 | `gBattleMainFunc` steps through 3 distinct values (engine-side turn-order/attacker resolution) - RAM-confirmed, no pixel change yet |
| 1924 | `gBattlerAttacker` becomes 1 (GROVYLE) - Grovyle outspeeds Onix, `gBattlerByTurnOrder`=[1,0] (battle-turn-notes.md §9 point 4) |
| 1925 | `gCurrentMove` becomes 104 (MOVE_DOUBLE_TEAM) |
| RAM 1928 (render **1929**) | `gBattle_BG0_Y` flips 320->0 - the message-box hard cut: submenu vanishes AND the first glyph ("F") draws, same tick, no intermediate blank frame (same "off-screen draw then one-step reveal" mechanism as the submenu's own open transition, §11 finding 1) |
| 1929-1956 | "Foe GROVYLE used\nDOUBLE TEAM!" prints 1 char/tick (28 printable, `\n` free), 3 pixel-silent-but-charged space ticks at 1932/1940/1951 - direct oracle-pixel/arithmetic confirmation (not source-reasoning alone), same rule as §1/§2's "Go! ONIX!" and battle-scene-notes.md §3.2's intro text |
| 1957-1963 | static hold, fully printed, no down-arrow prompt cursor (battle text auto-advances, doesn't wait for input) |
| **1964** | scope boundary - pixel-identical to 1957 (DOUBLE_TEAM's clone animation is RAM-confirmed to start here per battle-move-anim-notes.md §8, but produces no visible pixel change until tick 1966 - this slice's own committed trace correctly stops one tick before anything the clone-animation slice would need to model) |

**String, pixel/arithmetic-confirmed, not assumed.** `STRINGID_USEDMOVE` =
`"{B_ATK_NAME_WITH_PREFIX} used\n{B_BUFF2}"` (`src/data/gen/
battle-message-templates.json`'s own `usedMove` entry). Attacker is
GROVYLE, the OPPONENT: `HANDLE_NICKNAME_STRING_CASE`
(`battle_message.c:2286-2306`) prefixes `sText_FoePkmnPrefix = "Foe "` (not
`sText_WildPkmnPrefix`) whenever `GetBattlerSide(gBattlerAttacker) !=
B_SIDE_PLAYER` and `BATTLE_TYPE_TRAINER` is set (true for this Factory
battle) - giving **"Foe GROVYLE used\nDOUBLE TEAM!"**, confirmed by direct
visual inspection of the oracle's own PNG captures at ticks 1929-1964 (not
inferred from source alone).

**Text cadence: 1 tick/char, NOT 2 ticks/char.** `turn-resolution-notes.md`
§6 item 5 (a prior session's own uncommitted scratch doc) claimed FAST speed
means "1 char printed per 2 frames" - **wrong**, a misreading of
`sTextSpeedFrameDelays[FAST]=1`'s delay-counter semantics. This session's
own fresh oracle probe (the 3 silent-tick positions landing exactly on the
string's 3 space characters, ticks 1929+3/+11/+22) independently confirms 1
tick/char, the SAME rule already established twice over in this run
(battle-scene-notes.md §3.2's intro text, this doc's own §1/§2's "Go!
ONIX!") - now three-for-three. `battleScene.ts`'s existing battle-text
printer (`drawMessageTextLines`/`battleWindow`, the `B_WIN_MSG`-family
window+FONT_NORMAL+cadence already pinned for the intro/"Go!"/send-out text)
was reused verbatim for the new string/timing - no new asset or rendering
mechanism needed, since this message (unlike the FIGHT submenu's own move
list) uses FONT_NORMAL, not the unextracted FONT_NARROW.

**The onix/healthbox bounce overlay: live for 3 ticks past the press, then
freezes at a literal pixel-fit tick, not the live formula's own value at the
freeze moment.** Grid-searched directly against this session's own dense
oracle probe (`tools/compare/traces/turn1-kickoff.json`): `menuIdleBounce(t
- FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT)` (the still-open submenu's own live
formula) stays exact through ticks 1919-1921, then a DIFFERENT 9-tick-wide
plateau of frozen-tick candidates (`pressTick-19` through `pressTick-11`,
all equally exact) becomes exact for every tick 1922 onward including the
whole text-print window through 1964 - every other candidate tried
(including the live formula's own tick-1922 value) is not. Plausible
mechanism (not RAM-confirmed): `HandleInputChooseMove` keeps running a
couple more ticks after `JOY_NEW(A_BUTTON)` registers (the source's own
`PlaySE`/target-resolution work before `PlayerBufferExecCompleted` hands
off) before the controller function that drives `DoBounceEffect`'s per-tick
update truly stops being polled. Kept as literal pixel-fit constants per
this run's established convention for exactly this situation
(`BALL_SPIN_TABLE`/`FIGHT_SUBMENU_RESUMED_BOUNCE_SHIFT` precedent).

**RNG stays flat.** No `src/engine/` code this slice added calls any RNG
function - matches battle-turn-notes.md §9 point 3's "gRngValue flat
3485459011 through 1880-2309" finding (this window is entirely inside that
flat span). Pinned by a determinism Tier-1 test (identical button script
replayed twice yields identical state) rather than a `turnRng` integration,
since `turnRng` isn't wired into `core.ts` yet (PROGRESS #120) and this
window consumes zero `Random()` calls to begin with - nothing for it to
assert against.

**Engine implementation**: `battleMenu.ts`'s `FightSubmenuState` gains
`confirmElapsed` (mirrors `closeElapsed`'s own convention) + `confirmFightMove`
(A on cursor 0 only - the only move this trace's ground truth covers) +
`turnKickoffTextStartTick`/`turnKickoffTextVisibleChars`/`turnKickoffBounceTick`.
`battleScene.ts`'s `drawFightSubmenuWindow` gains a `sm.confirmElapsed !==
null` branch (before text: submenu content unchanged, bounce per
`turnKickoffBounceTick`; from `textStart` on: `drawTurnKickoffText`, which
redraws `battleWindow` as a blank box then layers `drawMessageTextLines` on
top - the same "redraw, don't diff" approach `drawSendOutHandoff` already
uses for "Go! ONIX!"). `core.ts` wires the A-press (cursor 0 only) into the
existing FIGHT-submenu input branch, and now also guards that whole branch
on `confirmElapsed === null` so no further input (nav, B) mutates the
submenu once confirmed - matching the source's own "controller no longer
polling" behavior, not just this trace's own idle button script.

**Acceptance**: `tools/compare/traces/turn1-kickoff.json` (canonical
`battle1-turn1.json` prefix through the 2nd A press, then idle to tick 1964,
81 dense captures from the settled submenu) **81/81, 0 diff** - no residual,
no attribution needed. Zero regressions: fight-submenu 234/235 (unchanged,
the one pre-existing tick-2073 anomaly), menu-idle 69/69, sendout 255/256,
s6-acceptance 224/228, menu-throw 78/78. `npm test` 602/602 (+9 net Tier-1
this session, 2 pre-existing tests updated for the new `confirmElapsed`
field), `npm run build` green.

**Out of scope, per the brief**: DOUBLE_TEAM's own clone animation (tick
1964+, `battle-move-anim-notes.md` §8), the stat-change banner, ROCK_SLIDE's
own resolution (accuracy/crit/damage/HP-drain, all much later per
battle-turn-notes.md §9's table), ISSUES #5/#16/#18/#19/#20.

## 10. S7 slice B: DOUBLE_TEAM clone animation + banner - **COMPLETE** (§10d, `turn1-cloneanim.json` 230/230)

### 10a. Convergence retry (bounded worker, this session): Gap 1 CLOSED (RAM-probed, 0 diff except 4 sub-pixel edge ticks), Gap 2 REFRAMED to a smaller, source-confirmed residual

Per the supervisor's brief: RAM/probe evidence first, no more grid searches
over formula space. `tools/compare/traces/turn1-cloneanim.json` went from
**49/230 to 168/230** (was 49/230 after §10b's initial attempt).

**New probe, committed**: `tools/probe/dump-doubleteam-sprites.py` (same
family as `dump-rockslide-sprites.py`) - identifies the two clone sprites by
`callback === AnimDoubleTeam` (`arm-none-eabi-nm`-resolved, `0x08102b3c`,
`static` so absent from `bin/oracle symbols`) via a full 64-slot scan every
tick, dumps their `data[0..7]`/`x2` directly, plus Grovyle's own front
sprite (`gBattlerSpriteIds[1]`) anim/x2/y2 fields in the same pass. Run
against `battle1-turn1.json`'s own segments, ticks 1955-2200, twice
internally cross-checked (a fresh `dump-registers.py` re-probe of the same
window agrees on every `BLDCNT`/`BLDALPHA` transition tick).

**Gap 1 (clone motion) - CLOSED.** The dense `data[]` dump gave the sprite's
OWN internal call-count/phase counters directly, ground truth instead of a
fit, and found TWO separate bugs in the prior session's formula (not one):

1. **The two clones are NOT a shared `+offset`/`-offset` table.** The prior
   session's `Sin(phase+128, amp) === -Sin(phase, amp)` assumption is true
   as real-valued math (`gSineTable[x+128] === -gSineTable[x]` holds
   bit-for-bit) but FALSE once the C-level `>> 8` truncation applies:
   arithmetic right-shift rounds toward -infinity, so
   `floor(-y/256) !== -floor(y/256)` whenever `y` isn't an exact multiple of
   256 - i.e. almost always at these small amplitudes. RAM-confirmed
   directly: at RAM tick 1969 (`n=6`) clone A's `x2=0` but clone B's
   `x2=-1`, NOT `-0`. Fixed by simulating both clones' `data0`/phase/
   amplitude progressions independently in one pass
   (`DOUBLE_TEAM_CLONE_OFFSETS_A`/`_B`, `battleMenu.ts`) instead of negating
   a single table. Verified 0 mismatches against the probe's own per-tick
   `x2` reads for BOTH clones across the full 129-tick lifetime (258
   datapoints).
2. **The anchor tick was right, but for the wrong reason, and the previous
   session's own short-range-vs-long-range conflict was real** - it just
   wasn't caused by a non-uniform call cadence. The clone sprite's own
   `data[3]` sub-counter shows call 1 has ALREADY happened by the time RAM
   tick 1964 is readable, so RAM tick `T`'s own state is call
   `n = T - 1963`. Folding in this run's established one-tick display
   latency (GBA's OAM shadow-buffer-to-hardware-DMA lag - the same "RAM tick
   T shows at render T+1" motif used elsewhere, e.g. `battleScene.ts`'s
   `GROVYLE_STRETCH_TABLE`) means render tick `T` shows RAM tick `T-1`'s
   state, i.e. call `n = T - 1964` - which collapses back to the SAME
   anchor (1964) the register envelope's own `BLDCNT`/`BLDALPHA` jump uses,
   `DOUBLE_TEAM_ANCHOR_DELAY` unchanged at 45. The previous session's grid
   search never found a fit because it was searching the WRONG axis (call
   cadence) for a bug that was actually in the offset TABLE (point 1 above)
   - the anchor itself needed no correction, only empirical confirmation.

   Both fixes verified together against the compare tool (not just RAM):
   the clone window (render ticks 1964-2093) goes from pervasive
   multi-thousand-pixel diffs to exact 0 diff on every tick except four
   (2075/2082/2088/2089), each a 2-7px residual confined to a single edge
   column at the extreme end of the clone's travel (e.g. tick 2075: exactly
   2 adjacent pixels at `x=104,y=25-26`, the clone's leftmost fringe at
   `n`'s largest excursions) - consistent with a sub-pixel rounding
   difference in `eraseGrovyleFootprint`'s fixed-position erase vs. the
   redrawn clone's shifted position, not re-derived further this session
   (bounded, tiny, four ticks out of 230).

   Window bounds also corrected: sprite-active RAM ticks are 1964-2092
   (`data[0]` exceeds 64 and self-destroys right after), but the pixel-
   visible RENDER window is 1966-2093 (`DOUBLE_TEAM_VISIBLE_START_DELAY`=47,
   `_END_DELAY`=174) - both edges swept directly against the compare tool:
   ticks 1964-1965 are oracle-baseline-exact (the register envelope is
   RAM-active there, but `n=0`'s placeholder zero-offset render doesn't
   match yet), and tick 2093 still needs the clone drawn (last render
   showing RAM tick 2092's data under the lag) while 2094+ is baseline
   again.

**Gap 2 (banner-hold color cycling) - REFRAMED, smaller, source-confirmed,
NOT closed.** Followed the brief's own instruction: tested `frame2` FIRST
via the same probe's Grovyle fields. Result: **disproven directly** -
`gSprites[gBattlerSpriteIds[1]]`'s `animNum`/`animCmdIndex`/
`animDelayCounter`/`x2`/`y2`/`callback` are ALL perfectly flat across the
entire banner window (2125-2200 sampled, every single tick identical) -
Grovyle's own sprite fields never move, so no per-mon idle-breathing task is
running here at all (unlike the sendout window's own `frame2` breathing
loop, which genuinely does run there - this just isn't the same situation).

Re-read `StatsChangeAnimation_Step1-3` source directly
(`src/battle_anim_utility_funcs.c:415-628`) since the sprite-side dead end
meant the cycling has to come from somewhere the RAM probe wasn't yet
watching, and found the actual mechanism: `StatsChangeAnimation_Step1` sets
`BLDCNT = BLDCNT_TGT1_BG1 | BLDCNT_TGT2_ALL | ...` - target-1 is **BG1**,
not the flat white color the prior session's two-sample algebraic solve
concluded (that solve was only checked at 2 ticks and happened to land on a
white BG1 tile by coincidence, not a general fit). `StatsChangeAnimation_
Step2` loads a REAL tilemap+graphic+palette onto BG1 for this specific stat
(`gStatAnim_Increase_Tilemap`/`gStatAnim_Gfx`/`gStatAnim_Evasion_Pal` for
DOUBLE_TEAM's `EFFECT_EVASION_UP`), and `StatsChangeAnimation_Step3` runs
`gBattle_BG1_Y += tVelocity` (`tVelocity=3` for a stat increase)
**unconditionally at the top of every call, in ALL THREE states** (fade-in,
wait/hold, fade-out) - i.e. BG1 keeps scrolling continuously through the
whole banner including the "flat eva/evb" hold, which is exactly why the
hold's own pixels still change tick-to-tick despite the blend registers
being frozen: the scrolling tilemap CONTENT is what's moving, not the blend
math or the mon sprite. RAM-confirmed directly (scratch probe of
`gBattle_BG1_Y`, `bin/oracle symbols gBattle_BG1_Y` = `0x2022e1a`): flat 0
through tick 2129, then `0,3,6,9,...,180` in a clean +3/tick ramp from 2130
through 2189 - exact match to `tVelocity=3`, no gaps, confirming the
mechanism outright rather than inferring it. (The hardware `BG1VOFS` mirror
itself reads 0 throughout in this same probe - same "read the EWRAM mirror,
not the raw MMIO register" precedent `gBattle_BG3_Y` needed for ROCK_SLIDE's
shake, `battle-move-anim-notes.md` §8.)

This also explains the window setup this session's probe re-confirmed but
hadn't yet connected: `StatsChangeAnimation_Step1` sets `gBattle_WIN0H`/
`WIN0V`/`WININ`/`WINOUT` and `DISPCNT_OBJWIN_ON` - an OBJ-WINDOW mask, which
is almost certainly why the banner's own visible extent tracks Grovyle's
silhouette (the mechanism this dossier's §9 first assumed was a direct
sprite blend): the window is shaped by Grovyle's own OBJ, and BG1's
scrolling tilemap only shows through the pixels inside that window, not the
whole screen.

**Not implemented this session** - this is genuinely new work, not a
formula tweak: extracting `gStatAnim_Evasion_Pal`/`gStatAnim_Increase_
Tilemap`/`gStatAnim_Gfx` (LZ77-compressed BG assets, need a new extractor,
this run's existing extraction tooling is the right starting point) and
wiring an OBJ-window-clipped, `gBattle_BG1_Y`-scrolled BG1 compositor is a
materially larger task than either gap 1 fix, out of this session's
remaining budget. **Residual is strictly smaller and differently attributed
than before**: previously "a second, unidentified motion, candidate
untested"; now "BG1 stat-arrow tilemap scroll, mechanism identified and
RAM-confirmed byte-exact (`tVelocity=3`, `gBattle_BG1_Y` table above),
blocked only on asset extraction + OBJ-window compositing, not on any
further reverse-engineering."

**Verification**: `npm test` 634/634 (631 + 3 new pins in
`tests/battleMenu.test.ts`, pinning the corrected `doubleTeamAnchorTick`/
`doubleTeamCloneOffsets` against the RAM probe's own literal per-tick
values), `npm run build` green. Regression sweep unchanged: turn1-kickoff
81/81, fight-submenu 234/235, menu-idle 69/69, sendout 255/256,
s6-acceptance 224/228. `turn1-cloneanim.json` (unchanged, per the brief) now
**168/230** (was 49/230) - acceptance (230/230) not met; the remaining 62
failing ticks are ALL inside the banner window (2132-2189, gap 2's own newly
-bounded residual) plus the 4 sub-pixel clone-edge ticks named above.

### 10c. Gap 1's own 4 sub-pixel clone-edge ticks CLOSED (bounded worker, this session) - opponent healthbox z-order, not an offset-table bug

Per the brief's own instruction: fix from the already-committed probe data,
not by fitting. Re-ran `dump-doubleteam-sprites.py` fresh over ticks
2070-2093 of `turn1-cloneanim.json` and cross-checked every one of the 4
failing ticks' own `x2` values (both clone slots) against
`doubleTeamCloneOffsets`' computed table, respecting the one-tick render lag
(render tick `T` reads RAM tick `T-1`): **all 4 match bit-exact**
(e.g. render 2075 reads RAM 2074's `x2=-41/40`; render 2088 reads RAM
2087's `x2=-41/40`; render 2082/2089 read RAM 2081/2088's `x2=41/-42` and
`-42/41`) - confirming §10a's own offset-table fix needed no further
correction. The residual was NOT a formula bug.

Diffed the actual failing pixels directly (`tools/compare/out/latest`,
oracle vs. app PNGs): at tick 2075, both diff pixels (104,25)/(104,26) show
oracle=`(82,107,99)` (a real, STATIC pixel - confirmed unchanged across
ticks 20-30 in the same column, i.e. not clone-related at all) vs.
app=`(123,123,127)` (this run's generic erased-background fill). Cross-
checked against a plain (non-clone) tick 2100: the exact same screen
position (104,25) - and the whole 8x8 tile block it belongs to
(GROVYLE_CORNER+(1,13), tile row 1 col 0) - already matches the oracle
byte-exact at Grovyle's OWN rest position (145-152, 20-27), proving the
tileset's own pixel data (index 14, a genuine chin/jaw shadow tile) is
correct, not corrupted.

**Root cause**: `(104,25)` is the OPPONENT HEALTHBOX's own right border
(`HEALTHBOX_FRAME_ORIGIN = (12,14)`, `FRAME_SIZE = 128x32` - `104,25` is
comfortably inside that rect, local `(92,11)`). On real hardware the
healthbox is a separate, higher-OAM-priority element than the battler mon
sprite (`battle_interface.c`) - normally irrelevant since Grovyle's own
silhouette (corner x=144) never reaches anywhere near the healthbox's right
edge (x<=140), but DOUBLE_TEAM's clones can: `DOUBLE_TEAM_CLONE_OFFSETS_A/B`
peak at amplitude 41-42px (the sine table's own near-90&deg; entries, `data0`
approaching its max 64), putting the clone's leftmost content tile (the same
chin/jaw detail) within 1-2px of the healthbox border at exactly 4 ticks
(2075/2082/2088/2089 - the only render ticks where `n`'s excursion reaches
that peak). This run's clone compositor (`drawDoubleTeamClones`) drew the
shifted tile unconditionally, painting over the healthbox border that
`menuIdleBase`'s own static full-frame harvest had already drawn correctly
underneath.

**Fix**: `isOpponentHealthboxOpaqueAt(x,y)` (`battleScene.ts`) - a per-pixel
lookup against `opponentHealthboxContent`'s own composited canvas at its
settled origin (no slide `dx` - this window is deep past send-out, always
settled) - threaded through `blendedTile`/`drawSpriteSheetBlended` as an
optional `skip` predicate (scoped ONLY to the clone draw call sites, not the
other `blendedTile` callers - ball-status-bar compositing elsewhere in this
file never overlaps the healthbox region so needed no change). Verified
against the compare tool directly: `turn1-cloneanim.json`'s clone window
(1964-2093) is now 0 diff on EVERY tick (was 4/129 failing). New Tier-1 pin
(`tests/battleScene.test.ts`): renders tick 2075 with a real
`FightSubmenuState` and asserts `(104,25)` equals `composeOpponentHealthbox`'s
own output pixel, not a hardcoded literal - ties the regression directly to
the compositor rather than an oracle-sampled magic number.

**Verification**: `npm test` 635/635 (+1 pin), `npm run build` green.
Regression sweep unchanged: turn1-kickoff 81/81, fight-submenu 234/235,
menu-idle 69/69, sendout 255/256, s6-acceptance 224/228, scene-assembly
256/256. `turn1-cloneanim.json` **168/230 -> 172/230** (the clone window
itself now fully 0 diff; all remaining 58 failures are gap 2's own banner
window, 2132-2189).

### 10d. Gap 2 (banner) CLOSED - real BG1 scroll extracted + composited - **S7 slice B COMPLETE, `turn1-cloneanim.json` 230/230** (bounded worker, this session)

Per the brief: extracted the stat-anim family and wired the real, scrolling
BG1 compositor (not the prior flat-white approximation).

**Extractor** (`tools/extract/extract-stat-anim.ts` -> `src/assets/gen/
stat-anim-banner.json`): reference/pokeemerald's `graphics/battle_anims/
stat_change/` directory keeps every one of these assets as a plain,
uncompressed dev-time source (`tiles.png`, 128x32 4-bit-indexed = 64 tiles;
`increase.bin`/`decrease.bin`, a plain 2048-byte/32x32 tilemap - same format
as `extract-battle-bg.ts`'s own `anim_map.bin`; 8 `*.pal` JASC-PAL files) -
no LZ77 decompression needed, same situation that extractor's own header
note already flagged. Extracted the full family (all 8 stat palettes + both
tilemaps) since it's cheap and battles 2-7 will exercise other stats; this
slice only wires up the `evasion`/`increase` pair DOUBLE_TEAM needs.
Verified against oracle pixels before wiring the compositor (brief's own
instruction): the evasion palette's green ramp (`(0,148,99)`, `(33,214,148)`,
`(107,247,198)`, etc.) visibly matches the oracle banner region's own
dominant colors at tick 2150 (histogram-sampled, `(21,142,117)`,
`(72,185,151)`, `(33,160,102)` etc. - clearly the same green family blended
darker with Grovyle's own body colors underneath).

**Compositor** (`drawStatsBanner`, `battleScene.ts`): real GBA alpha-blend
semantics, same shape as the intro-slide's own `drawSlideScene` (BG1=TGT1,
blend where opaque else raw TGT2) - not a special case. The OBJ-window mask
(`StatsChangeAnimation_Step1`'s `CreateInvisibleSpriteCopy`, a FROZEN copy of
Grovyle's own OAM taken once at banner start) is exactly Grovyle's own
silhouette at his current, RAM-confirmed-unmoving position - so the
compositor reuses the SAME `GROVYLE_CORNER`-anchored tile-opacity mask the
prior flat-white version already iterated; only the blended COLOR and the
"transparent BG1 pixel -> leave raw" case are new. `statAnimBg1PixelAt`
samples the tilemap/tileset/palette at `(x, y + statsBannerBg1Y(t))`
(`gBattle_BG1_X` stays 0 for a stat INCREASE, only a DECREASE sets it to 64 -
out of scope this slice), wrapped both axes over the tilemap's own 256px
period.

**The scroll anchor needed the SAME one-tick render lag `bg1X` already uses**
(`battleScene.ts`'s own doc comment: "the value the oracle displays for tick
`t` is the register as of tick `t-1`") - NOT `statsBannerEva`'s own
register-exact, no-lag convention (a different register class, `BLDALPHA`,
apparently on a different display-copy cadence than `BG1VOFS`). This wasn't
assumed - a naive same-tick mapping (`gBattle_BG1_Y(t)` directly) got the
general mechanism right (diff pixel counts roughly halved, ~650-960px vs.
~1500px) but never reached 0. Root-caused via a per-tick brute-force sweep
(`tools/compare/scratch/diagnose_banner.mjs`, not committed as a tool since
it's a one-off diagnostic, kept as scratch per this run's convention): at
ticks 2132/2140/2150/2160, swept every integer Y-shift and found the exact
set that reproduces the oracle bit-exact - periodic mod 32 (the tilemap's
own vertical repeat), and the residue at every tick matches `3*clamp((t-1)-
2129, 0, 60)` (RAM tick `t-1`'s value) exactly, never the same-tick value.
`STATS_BANNER_BG1_Y_ANCHOR_DELAY=211` (`battleMenu.ts`) folds that single
extra tick into the anchor.

**Verification**: `npm test` **638/638** (+3 pins: `STATS_BANNER_BG1_Y_
ANCHOR_DELAY`/`statsBannerBg1Y` schedule in `tests/battleMenu.test.ts`
against the same register probe; a render-level pin in `tests/battleScene.
test.ts` at two banner ticks - 2140 ramp-up, 2160 hold - confirming the
rendered pixel actually differs between them, i.e. content genuinely
scrolls, not just a static blend), `npm run build` green. Regression sweep
unchanged: turn1-kickoff 81/81, fight-submenu 234/235, menu-idle 69/69,
sendout 255/256, s6-acceptance 224/228, scene-assembly 256/256.

**`tools/compare/traces/turn1-cloneanim.json`: 172/230 -> 230/230 - S7 slice
B ACCEPTANCE MET, slice COMPLETE.** Both named residuals from #125 (the
banner's real mechanism, and gap 1's own 4 sub-pixel clone-edge ticks -
§10c above) are closed; zero known gaps remain in this trace's own window
(1964-2193).

### 10b. First attempt (bounded worker, prior session) - superseded by §10a above

Picks up exactly where §9 left off (tick 1964 = pressTick+45). Engine code
landed and wired (`battleMenu.ts`'s `doubleTeamCloneOffset`/`statsBannerEva`
+ `battleScene.ts`'s `drawDoubleTeamClones`/`drawStatsBanner`/
`eraseGrovyleFootprint`), `npm test` 602/602 and `npm run build` stay green,
and the regression sweep is clean (turn1-kickoff 81/81, fight-submenu
234/235, menu-idle 69/69, sendout 255/256, s6-acceptance 224/228 - all
unchanged). **But the acceptance bar (0 diff on the new committed trace)
is NOT met**: `tools/compare/traces/turn1-cloneanim.json` (canonical prefix,
1964-2193, 230 captures) scores **49/230**.

**Gap 1 (clone motion) as originally (mis-)diagnosed**: the per-tick
advance rate doesn't fit any simple `(anchor, rate)` pair against
`AnimDoubleTeam`'s own decoded C formula - a grid search over `(anchor,
rate)` pairs found no fit reconciling the long-range zero-crossings with the
short-range onset. **§10a above found the real cause**: not a non-uniform
call cadence, but a shared-table sign-negation bug in the offset formula
itself (the anchor was actually already correct).

**Gap 2 (banner) as originally flagged**: a second, unidentified motion
under the white-flash blend during the hold, candidate `grovyleFrontSprite.
frame2` untested. **§10a above tested and disproved it**, then identified
the real mechanism (BG1 stat-arrow tilemap scroll) via source-reading.

**Verification (this session, superseded numbers)**: `npm test` 602/602 (no
new Tier-1 pins - the formulas were demonstrably not yet correct so none
were added), `npm run build` green. `turn1-cloneanim.json` committed at
49/230.

## 11. S7 slice C: the ROCK_SLIDE window (bounded worker session 1, implements docs/battle-move-anim-notes.md §9's ground truth; CLOSED to 250/256 by session 2, see the follow-up subsection below)

Picks up exactly where slice B's stat-change banner leaves off (its own
last active-but-zero-effect tick, `pressTick+274` = 2193) through the tick
before the HP-bar drain sentinel (`pressTick+596` = 2515; slice D owns
2516+). New committed trace `tools/compare/traces/turn1-rockslide.json`
(256 captures: every tick 2193-2250 and 2330-2515, stride 7 over the
2251-2329 hold) scores **181/256** (0 regressions on every other committed
trace - `turn1-cloneanim` 230/230, `turn1-kickoff` 81/81, `fight-submenu`
234/235, `menu-idle` 69/69, `sendout` 255/256, `s6-acceptance` 224/228, all
re-verified unchanged).

**Landed, pixel/RAM-confirmed exact:**
- **Three text boxes**, same battle-text printer/cadence as slices A/B: the
  held `TURN_KICKOFF_LINE1/2` text through `+283`, "Foe GROVYLE’s
  evasiveness\nrose!" from `+284` (`STAT_ROSE_LINE1/2`, `battleMenu.ts`),
  "ONIX used\nROCK SLIDE!" from `+393` (`ROCK_SLIDE_LINE1/2`). **Bug found
  and fixed**: the stat-rose text needs `STRINGID_ATTACKERSSTATROSE`'s own
  apostrophe as **U+2019** (the game's charmap has no ASCII `'`, code 180
  is the right-single-quote glyph) - a plain ASCII apostrophe silently
  rendered as a blank glyph (14px steady diff across the entire hold, one
  glyph wide), not caught until a diff-image inspection.
- **`gBattle_BG3_Y` shake**: RAM sequence RAM-reconfirmed this session
  (`dump-registers.py` stride 1, ticks 2337-2365 against the committed
  dense traces) bit-exact against §9.3's table, one-tick render lag (same
  class as `bg1X`/`statsBannerBg1Y`). Applied to a NEW background-only
  resampler (`drawStaticBgShiftedY`, using `staticBgPixel`/BG3's own
  tilemap) rather than shifting the whole scene — real hardware only
  scrolls the field background, not the OBJ sprites/healthboxes sitting on
  it, and this engine's `menuIdleBase` harvest (used everywhere else in
  this window) bakes both into one flat image with no way to shift only
  the background portion. **Needed a vertical wrap** (`BG3_VERTICAL_PERIOD
  = 256`, `BGCNT_TXT512x256`'s own screen-block height) that no other
  `staticBgPixel` caller in this file needed — every other caller only
  ever samples `mapY` in `[0,160)`; this is the first caller whose `mapY`
  goes negative (`screenY + (-7)` for top rows during the shake), and an
  unwrapped negative `mapY` produced a solid-wrong top-7-row band (1680px
  diff) until wrapped.
- **All 20 falling rocks**: spawn schedule/argv table (`ROCK_SLIDE_ROCK_TABLE`)
  and the `SetAverageBattlerPositions` anchor (`{x:176,y:54}`) both
  RAM-cross-verified this session against every one of the 20 spawns
  (`dump-rockslide-sprites.py` re-run against the committed dense traces).
  **Call-timing model corrected against RAM, not just source**: the naive
  "one `TranslateSpriteInEllipse` call per tick from spawn" reading is off
  by one call on the spawn tick itself (RAM shows `circlePos`/`duration`
  jump by TWO steps that tick, not one — `CreateSprite`'s own init-call of
  the initial callback plus that same frame's regular per-frame dispatch,
  since the callback pointer is already reassigned inside the first call);
  every tick after gets exactly one call while `duration` is nonzero, then
  one HELD tick (duration hits 0, callback pointer switches, no motion
  write) before phase 2's own single setup-call tick (`AnimFallingRock_Step`
  — this transition does NOT double-call, unlike spawn). Documented in full
  in `rockSlideRockState`'s own doc comment (`battleMenu.ts`). Uses a new
  literal-table `gbaSinTable`/`gbaCosTable` pair (NOT the existing
  `Math.sin`-based `gbaSin` used by the ball-arc — that one is already
  flagged as imprecise at a couple of indices; the rock motion is
  load-bearing at much larger amplitudes so gets the RAM-exact literal
  table like `bounceSin` already uses).
- **Generic hit-flash**: healthbox `y2` wobble (`rockSlideHealthboxWobbleY2`,
  reuses `opponentHealthboxContent`/`HEALTHBOX_FRAME_ORIGIN` via a new
  erase-then-redraw-translated `drawOpponentHealthboxWobble`, same shape as
  `eraseGrovyleFootprint`) and Grovyle's own blink (`rockSlideMonBlinkInvisible`,
  implemented as simply not drawing Grovyle that tick — no erase needed
  since this window's base is reconstructed from primitives, not a baked
  harvest). Both RAM-exact off `dump-rockslide-sprites.py`'s own
  `healthboxY2`/`targetInvisible` fields, one-tick render lag.
- **Grovyle's own `AnimTask_ShakeMon` bounce — NEW finding, contradicts
  §9.6's own prediction**: §9.6 predicted "a pixel-matching engine can
  likely get away with simply not hiding the sprite" during the
  `monbg`-hidden window (2344-2472). **False** — a per-tick brute-force
  roll search (crop `x=144..208,y=64..76`, a rock-free strip of Grovyle's
  own lower body, against the committed dense PNGs) found Grovyle's visible
  stand-in DOES move: a period-4 render-tick pattern `[5,5,0,0]` (`y2`
  offset), active render ticks 2362-2455 (94 ticks, both boundaries
  pixel-swept exact), then flat 0. This is `AnimTask_ShakeMon`'s own
  `(ANIM_TARGET, 0, 5, 50, 1)` call made visible after all — just not via
  the literal hidden OBJ, and the doubled 2-tick hold (vs. a naive 1-tick
  toggle) isn't independently re-derived from source, only pixel-fit
  (`rockSlideMonShakeY2`, `battleMenu.ts` — flagged as pixel-fit, not
  source-proven, per this run's convention for exactly this situation).

**Open (the acceptance gap, 75/256 non-matching frames, 2963px total diff
mass, avg ~40px/frame, max 172px — small and localized, not a
pervasive/structural miss):** rock-vs-rock stacking order where two or more
falling rocks' 32x32 boxes overlap. This engine draws rocks in a fixed
table-index order (later-spawned on top); real hardware determines
front/back by OAM slot index, which depends on the actual slot
allocation/reuse sequence (`dump-rockslide-sprites.py`'s own RAM dump
confirms only 13 distinct `gSprites[]` slots host all 20 rocks — slots get
freed and reused, so "spawn order" and "slot index order" diverge over the
window). Tried the reverse draw order as a quick check (worse: 171/256, not
better) — the true rule needs actual slot-allocation simulation, not
attempted this session (time-boxed). Every non-matching frame is in the
2362-2453 range, i.e. exactly the window where 2+ rocks are simultaneously
active AND overlapping; the shake (2349-2358), all 20 rocks' spawn
timing/motion in isolation, both text boxes, and the hit-flash are each
independently pixel-exact per the dense per-mechanism sweeps above.

**Verification**: `npm test` 638/638 (no new Tier-1 pins — time-boxed to
landing the pixel work itself, all formulas above are RAM-cross-verified
directly rather than needing a Tier-1 regression pin; a follow-up session
should add pins for `rockSlideRockState`/`rockSlideBg3Y`/`rockSlideMonShakeY2`
against the RAM tables cited above), `npm run build` green.

### 11.1. Follow-up session: rock-vs-rock stacking order CLOSED via a real slot-allocation + `SortSprites` simulation, `turn1-rockslide.json` **181/256 → 250/256** — a separate, pre-existing 6-frame residual found and precisely attributed (NOT fixed, per this step's own "do not rework the shake" scope)

**The named residual (75/256, all in 2362-2453) is fully closed.** Per the
brief: simulated the real `gSprites[]` slot lifecycle (`CreateSprite`'s
"lowest free slot" allocator, `reference/pokeemerald/src/sprite.c:502-510`)
and the real `SortSprites` insertion-sort comparator (`:372-467`) in pure
TS (`rockSlideDrawOrder`, `battleMenu.ts`), seeded from a live RAM read of
`sSpriteOrder` (`EWRAM_DATA static`, no exported symbol — address
`0x020217F4` resolved once via `arm-none-eabi-nm`, same technique this
run already uses for other static callbacks). New probe
`tools/probe/dump-rockslide-slot-order.py` validated the simulation
**0 mismatches** against `battle1-rockslide-dense-b.json`: slot
assignment for all 20 rocks + the shake sprite across 143 sampled RAM
ticks, AND the resulting relative draw order across all 117 multi-rock
ticks (56 of which have an exact on-screen-Y tie among simultaneously
alive rocks).

**Why the simulation only needs to track the 20 rocks, not the ~50 other
`gSprites[]` slots the real hardware also sorts every frame**: RAM-
confirmed the 20 rocks are the only sprites in this whole scene that ever
share an exact `oam.priority`/`subpriority` key (`2`/`38` for every one,
`Cmd_createsprite`'s subpriority formula never varies since the target
battler is fixed all window) — the shake sprite is `oam.priority=3`, every
persistent scene sprite (healthboxes, mons) is `oam.priority` 0 or 1.
Since `SortSprites` is a stable sort, two elements that never tie with a
third party can only have their relative order changed by a direct
comparison against each other — confirmed empirically too (not just
argued): collapsing every non-rock slot to one shared filler key changed
0 of the 117 validated ticks. This is also why the fixed-index heuristic
this session's predecessor tried (~71% of frames) couldn't be patched
into something exact: it had no way to represent "two rocks currently tied
on Y, resolved by which one has been continuously alive in a lower slot
since they last differed."

**A separate, PRE-EXISTING residual was found while sweeping the full
256 frames, not introduced by this fix**: 6 frames (2349, 2350, 2353,
2354, 2357, 2358), 1px each, ssimMin≈0.9999. Confirmed pre-existing by
reverting this session's changes (`git stash`) and re-running compare —
identical 6 mismatches present on the prior commit too. **The prior
session's own claim that "the shake... [is] independently pixel-exact"
(§11 above) was inaccurate** — it was never swept against the full
256-frame set with this precision, only checked mechanism-by-mechanism.
All 6 fall exactly on the render ticks where `rockSlideBg3Y` is `-7`
(never on a `0` tick) — every one is a single stray pixel at screen
position (173, 92), oracle `(255,255,255)` vs this engine's
`(247,247,255)` (both real colors already present elsewhere in this
window's own static-BG asset, `src/assets/gen/`, so not a made-up color —
this engine is sampling a real but wrong tile pixel at that one screen
position when the shake offset is non-zero). RAM-checked that the
naive wrap culprit (§11's own `BG3_VERTICAL_PERIOD` fix) doesn't apply
here — `mapY = 92 + (-7) = 85` never goes negative, so this is a
different, narrower bug in `drawStaticBgShiftedY`'s per-scanline sampling
that only this one pixel's tile boundary hits. **Not fixed this
session**, per this step's own explicit scope ("do NOT rework
text/shake/rocks-motion/hit-flash/ShakeMon") — named precisely instead of
worked around, left for a future session that owns the shake mechanism.

**Full regression sweep, zero regressions**: `turn1-cloneanim` 230/230,
`turn1-kickoff` 81/81, `fight-submenu` 234/235, `sendout` 255/256,
`s6-acceptance` 224/228, `menu-idle` 69/69 — all re-verified at their
established counts.

**FIXED (later session)**: the suspected culprit above (`drawStaticBgShiftedY`
per-scanline tile-boundary sampling) was a misdiagnosis — that function's
`mapY` math is correct; `staticBgPixel(173, 85)` genuinely does return
`(247,247,255)`, and that's the right raw BG3 sample. The real bug is one
layer up, in the PLAYER healthbox overlay drawn on top of it every one of
these ticks: `drawMenuHealthboxPlayer`'s `getMenuHealthboxPlayerContentMask`
(a pixel-harvested rectangular asset, no real per-pixel alpha) infers
"background bleed" (transparent, let BG3 show through) by comparing each
harvested pixel against the plain, always-**unshifted** static background
(`healthboxBackgroundColorAt`) — correct for the settled action-menu window
this asset was harvested from (background never shifts there), but this
exact draw call is reused inside the Rock Slide window too
(`drawRockSlideAttack`), where BG3 genuinely scrolls. One harvested pixel —
a white healthbox-frame highlight at screen (173,92) — coincidentally
equals the *unshifted* background's own color at that spot, so the
heuristic misclassified it as a hole: invisible on `0`-shift ticks (the
live background there is white too, by the same coincidence), wrong on
`-7`-shift ticks (the live background samples a different, non-white tile
row, `staticBgPixel(173,85)` → index 15 → `(247,247,255)`, leaking through
the wrongly-punched hole).

Root-cause fix, not a special case: the harvest's own bleed set forms
exactly 4 connected regions (sizes 8/55/260/**1**) — real bleed is a
byproduct of the healthbox's true non-rectangular shape, so it comes in the
contiguous patches that shape implies, never a lone pixel stranded inside
solid content. `getMenuHealthboxPlayerContentMask` now despeckles:
any bleed-classified pixel whose 4-neighbors are *all* content gets
reclassified as content too. This generalizes to the whole class of
"harvested content pixel coincidentally equals the flat background"
coincidences, not just this one coordinate — and leaves all 3 genuine
multi-pixel bleed regions (and every other trace that exercises this same
draw call) untouched. `turn1-rockslide.json`: 250/256 → **256/256**, 0
diff. New Tier-1 pin: `tests/battleScene.test.ts` (S7 slice C describe
block) renders ticks 2348 (unshifted) and 2349 (shaken) and asserts
`(173,92)` is `(255,255,255)` on both. Full regression sweep re-verified
zero change at established counts: `turn1-drain` 102/102, `turn1-cloneanim`
230/230, `turn1-kickoff` 81/81, `fight-submenu` 234/235, `sendout` 255/256,
`s6-acceptance` 224/228, `menu-idle` 69/69, `scene-assembly` 256/256.

**New Tier-1 pins** (`tests/battleMenu.test.ts`): `rockSlideDrawOrder`
(a spot sample across the window, background-to-foreground order) plus
the deferred pins named at the end of §11 above
(`rockSlideRockState`/`rockSlideBg3Y`/`rockSlideMonShakeY2`, all still
pixel-fit/RAM-exact as originally landed, now regression-guarded).
`npm test` **643/643**, `npm run build` green.

## 12. S7 slice D: HP drain + turn-end (bounded worker, this session) - `turn1-drain.json` **102/102, 0 diff**; closes ISSUES #16's deferred oracle validation

Ticks `pressTick`+597 (RAM 2516, the HP-bar drain sentinel) through the
resettled next-action idle cycle (`pressTick`+664 on, RAM 2583+, swept to
2655/pressTick+736). No RAM probe run this session — every anchor tick was
already pinned by `battle-turn-notes.md` §9's table (drain start/done, hp
update, flinch/turn-pass/`ShouldSwitch`/AI rolls, all silent) or
`battle-move-anim-notes.md` §9.4 (nothing left unattributed through 2516).
What this session added: a fresh 161-frame dense oracle capture (scratch,
ticks 2500-2660, not committed - superseded by the canonical
`turn1-drain.json`) to grid-search the two things §9's RAM-only table
can't answer by itself - the RENDERED pixel bar's exact lag convention, and
the resettled menu's exact bounce-phase alignment.

**HP-bar drain: renders with NO extra frame of lag, unlike every other
ROCK_SLIDE mechanism in this file.** `rockSlideOpponentHp(t, pressTick,
startHp, endHp)` (`battleMenu.ts`) computes `startHp - clamp(t -
(pressTick+597), 0, startHp-endHp)`, clamped to `[endHp, startHp]` - valid
for every `t`, not just mid-drain. Fit **exact (0 residual) against all 15
distinct fill-pixel-count transitions** in the dense capture (cropped to
the bar's own 48px-wide fill strip, sampled independent of the SHA-level
diff): render tick 2517 shows 47/48 px filled, 2519->46, 2522->45, ...,
2558->33/48 (settled, `floor(101/143*48)=33`, still green - `pickHpBarBand`
was already correct, no model change needed). A `-1`-lag hypothesis (the
convention `rockSlideBg3Y`/`rockSlideHealthboxWobbleY2`/etc. all use) was
tried first and rejected: it mispredicts every one of the 15 transitions by
one pixel-column. Plausible mechanism: unlike a hardware register that only
takes visible effect next vblank, `MoveBattleBarGraphically` CPU-copies the
bar's tiles into VRAM synchronously within its own call this same frame, so
no extra render-lag tick accrues here.

**ISSUES #16 resolved for the partial-HP path**: `composeOpponentHealthbox`
/`calcBarFilledPixels`'s floating-point `hpFraction` formula
(`floor(hpFraction*48)`) was never patched - it already agreed with the
exact-integer source formula for every one of the 43 HP values 101-143
this trace exercises (spot-checked: no truncation-boundary 1px divergence
in this range). The compositor's hermetic model was **oracle-confirmed
correct on first contact**, not a headline finding requiring a fix.

**Turn-end (text-clear -> blank hold -> menu redraw), pixel-timed, not
RAM-timed** (the RAM events themselves - flinch/turn-pass/`ShouldSwitch`/AI
setup, 2565-2582 - are already documented as visually silent, so their
exact ticks don't gate any pixel change): the held "ONIX used\nROCK SLIDE!"
text goes blank (box stays, no text - a 60x26px crop diffed byte-identical
background-only) at `pressTick`+657 (render 2576); a single-tick ~6000px
swap of the whole bottom half of the screen (the same atomic
BG0-scroll-reveal shape as the original menu's own tick-1748 draw, §5)
lands at `pressTick`+664 (render 2583) - `ROCK_SLIDE_TEXT_CLEAR_DELAY`/
`ROCK_SLIDE_MENU_REDRAW_DELAY`.

**The resettled menu's own idle-bounce phase reuses `menuIdleBounce`
verbatim, re-anchored to a fresh local `t`, not a continuation of the
pre-turn absolute-`t` counter.** `rockSlideResettledBounceTick(t,
pressTick) = t - (pressTick+664) + (MENU_IDLE_BLANK_END_TICK+1)`. Found by
matching the STRUCTURE of the observed sha sequence, not by guessing a
single shift constant: the very first menu's own opening (`MENU_IDLE_
BLANK_END_TICK+1`=1748 on) shows a distinctive 1-tick "blip" (a transient
sha visible for exactly 1 tick) immediately followed by a full 9-tick
steady dwell, before settling into the regular 9-tick/phase, 36-tick/cycle
pattern (§4). The resettled window's own capture shows the **identical
blip-then-9-tick-dwell shape** at `pressTick`+664/+665, and the SHA
sequence from there on (`c2a09dbe1350`x9 -> `229869e8d282`x9 ->
`0269314e68ff`x9 -> `a4bffb32ef6b`x9, repeating) matches
`menuIdleBounce(localT)` tick-for-tick under this shift, across the whole
155-tick swept range - i.e. the underlying `DoBounceEffect`-class task
(§4's own attribution) genuinely re-initializes when a fresh action menu
opens, it doesn't keep running (frozen, per slice A/C's own finding) and
then resume from where the absolute tick count "would have" put it. A
plain-`t` hypothesis was tried first and rejected (doesn't reproduce the
blip position at all).

**The opponent healthbox is NOT part of the reused flat `menuIdleBase`
harvest's valid content.** That harvest was taken from the original
pre-turn-1 screen (Grovyle still full HP) - reusing it verbatim for the
resettled menu would incorrectly show Grovyle back at 143/143. Bbox-
confirmed this session that the harvest's own two BOUNCE regions (§4's
"Region A"/"Region B") are both on the PLAYER's (ONIX) side -
`menuHealthboxPlayer`'s own origin `(127,74)` is an exact match for
Region B's bbox - and Onix takes zero damage this turn, so the harvest's
*base* content stays valid for everything except Grovyle's own bar, which
`drawTurnEndSettledMenu` (`battleScene.ts`) overdraws on top at its real
(by then always-settled) HP via `opponentHealthboxContentForHp`, a small
memoized cache over `composeOpponentHealthbox` (only 43 distinct integer
HPs ever needed, 143 down to 101). The same per-tick HP now also feeds the
drain-phase `drawSendOutHealthbox` call inside `drawRockSlideAttack`
(previously always full-HP, static) - the only other opponent-healthbox
draw call in the whole ROCK_SLIDE/turn-end window.

**Engine implementation** (`battleMenu.ts` pure functions + `battleScene.ts`
render): `rockSlideOpponentHp`, `ROCK_SLIDE_TEXT_CLEAR_DELAY`/
`ROCK_SLIDE_MENU_REDRAW_DELAY`, `rockSlideResettledBounceTick` (new);
`drawRockSlideWindow` gains a `t >= redrawTick` early-return to
`drawTurnEndSettledMenu` (new) and a `t < textClearTick` guard around its
existing text-draw call; `drawRockSlideAttack` and `drawTurnEndSettledMenu`
both route the opponent healthbox through `opponentHealthboxContentForHp`
instead of the old static `opponentHealthboxContent` constant (kept, now
just that cache's own hp=143 entry).

**Acceptance**: new committed trace `tools/compare/traces/turn1-drain.json`
(canonical 44-segment prefix, dense captures every tick 2510-2600 + strided
samples to 2655, 102 frames total) **102/102, 0 diff** - no residual, no
attribution needed. Zero regressions: `turn1-rockslide` 250/256,
`turn1-cloneanim` 230/230, `turn1-kickoff` 81/81, `fight-submenu` 234/235,
`sendout` 255/256, `s6-acceptance` 224/228. **New Tier-1 pins**
(`tests/battleMenu.test.ts`, 5 new tests): `rockSlideOpponentHp` (drain
schedule + settle, value-agnostic), the text-clear/menu-redraw anchor
ticks, `rockSlideResettledBounceTick`'s own re-anchoring. `npm test`
**648/648**, `npm run build` green.

**Out of scope, per the brief**: turn 2+ (scout lane's), the victory/switch
windows, FONT_NARROW rewire, ISSUES #5/#18/#19/#20, the §11.1-named 1px
`drawStaticBgShiftedY` residual (not attempted this session - ran out of
budget after slice D landed at 0 diff).

## 13. S7 slice E1: turn 2's FIGHT-submenu reopen through ENDEAVOR's kickoff text (bounded worker, this session) - `turn2-endeavor.json` **76/77** (the one residual is ISSUES #19's own pre-existing family, recurring, not a new bug)

Implements docs/battle-turn-notes.md §12's ground truth from the settled
post-turn-1 action menu (tick 2894) through ENDEAVOR's kickoff message
fully printed and held (tick 2999) - FIGHT submenu reopen (cursor rests at
slot 0, PP now dynamic 9/10) -> `DOWN` to DRAGON_BREATH (slot 2, PP 20/20,
unaffected) -> `A` confirms -> "Foe GROVYLE used\nENDEAVOR!" prints and
holds. **Stops before ENDEAVOR's own attack animation** (first pixel change
past the settled text is tick 3003, oracle-confirmed - see "What's left"
below) - the animation, Onix's HP-bar drain, and the player healthbox's own
HP digits are a follow-up slice's work, per this step's own explicit
fallback ("land a green committed subset... say exactly where you
stopped").

**PP digits: real FONT_NORMAL pipeline, not a second static harvest.**
ISSUES #20 flagged the FIGHT submenu's move-name/PP-label/type text as
FONT_NARROW (never extracted, rewire deferred) - but the PP *number*
("10/10") prints on a wholly separate window, `B_WIN_PP_REMAINING`
(`battle_message.c:1560-1569`), which is FONT_NORMAL - already extracted,
already proven (`font-normal.json`, used throughout this file for message
text). `MoveSelectionDisplayPPNumber` (`battle_controller_player.c`) prints
`ConvertIntToDecimalStringN(currentPP, RIGHT_ALIGN, 2)` + "/" + the same for
maxPP - a single-digit value gets a leading `CHAR_SPACER` (`characters.h:74`,
glyph code 119, width 6 - a genuinely distinct font-encoding code from the
plain ASCII space, not in `charmap.json`), not a literal space. `battleMenu.ts`'s
`ppRemainingGlyphCodes(currentPP, maxPP)` reproduces this exactly, rendered
via a new `font.ts` export, `drawGlyphCodes` (a `drawText` sibling for
raw glyph-code arrays, needed since `CHAR_SPACER` has no charmap entry to
route through the string-based `drawText`).

**Color: verified unchanged, not assumed.** `GetCurrentPPToMaxPPState`
(`battle_message.c:3047-3075`, ported as `getCurrentPPToMaxPPState`) governs
`SetPPNumbersPaletteInMoveSelection`'s color-band override - for
currentPP=9/maxPP=10, `currentPP(9) > floor(maxPP/2)=5` is true, so this
returns state 3, the SAME full-PP band 10/10 already uses. No new color
pair is needed; oracle-pixel-confirmed at tick 2911 (0/450 mismatches
against a direct `drawGlyphCodes` render, grid-searched to find the exact
window origin - patch-local (201, 8), cross-confirmed by
`sStandardBattleWindowTemplates`' own tile-position arithmetic relative to
`tests/fontNarrow.test.ts`'s already-established `PP_LABEL_ORIGIN`).

**Grovyle's HP, forgotten by every render path except `drawTurnEndSettledMenu`.**
Slice D's own doc already named the flat `menuIdleBase` harvest as stale for
Grovyle's healthbox (baked at the pre-turn-1 full HP) and patched exactly
one call site (`drawTurnEndSettledMenu`) to overdraw it. Reopening FIGHT for
turn 2 routes through a DIFFERENT set of call sites entirely
(`drawActionMenuIdleWindow`/`drawActionMenuIdleContent`, plus two inline
`drawRect(fb, menuIdleBase)` sites inside `drawFightSubmenuWindow`) - none of
which knew about the overdraw, so turn 2's own submenu (and the brief
pre-reveal action-menu hold) rendered Grovyle back at full HP until fixed.
Root-cause fix, not a special case: a new `turn1Resolved: boolean` field on
`BattleSceneState` (set the same tick core.ts's new reopen branch fires) is
threaded through every one of these call sites via a single new helper,
`drawMenuIdleBaseWithOpponentHp`, so the fix generalizes to every menu-base
draw call rather than patching each site's symptom separately.

**The submenu's own bounce overlay inherits the RESETTLED menu's phase, not
turn 1's own "coincidentally-aligned" absolute-`t` formula.** Turn 1's first
FIGHT-submenu open uses `menuIdleBounce(t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT)`
directly against absolute `t` - this works because that open happens before
ANY menu resettle event, so absolute-`t` and the bounce task's own local
phase coincide by construction. Turn 2's reopen happens long after turn 1's
OWN resettle (`rockSlideResettledBounceTick`'s own re-anchor event, pressTick
1919 + 664), and `HandleInputChooseMove` never resets the bounce task - so
it inherits whatever phase the RESETTLED menu already established, not a
fresh mapping. Oracle-pixel-confirmed (dense diff across the whole 2906-2999
window, 1579px wrong at every affected tick until corrected): the dwelling
formula needs `turn2SubmenuBounceTick(t) = rockSlideResettledBounceTick(t,
1919) - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` (composing BOTH known corrections),
not plain `t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT`.

**The post-confirm "frozen" bounce state needed its own grid search, same
as turn 1's own precedent.** Mirroring `turnKickoffFrozenBounceTick`'s own
finding (the live formula's value AT the freeze moment is NOT what's
observed - a different plateau is), turn 2's own frozen state (ticks
`pressTick`+3 on) is oracle-confirmed to be `onixY2=healthboxY2=0` (neither
bounce region raised) the entire 2948-2999 span - direct pixel comparison
against `menu-idle-healthbox-bounce.json`'s own `y1`/`y2`/base states,
not a full-frame SSIM guess. `TURN2_KICKOFF_FROZEN_BOUNCE_TICK = 2119` is a
literal pixel-fit constant landing in that exact 9-tick flat plateau,
same convention as `turnKickoffFrozenBounceTick`'s own `pressTick - 19`.

**Kickoff text hard-cuts 1 tick earlier than the general formula predicts.**
`turnKickoffTextStartTick(pressTick)` (turn 1's own formula,
`FIGHT_CONFIRM_TEXT_DELAY`=10) predicts 2955 for turn 2's own press (2945) -
but the oracle's WHOLE message-box region (all ~10900px of it) differs at
tick 2954, not 2953 or 2955, meaning the real hard-cut is at 2954. A new
`turn2KickoffTextStartTick = turnKickoffTextStartTick(pressTick) - 1`
pixel-fit correction, not source-attributed this session (a plausible,
unverified guess: the reopened submenu's own extra DMA-wait state costs
this transition 1 tick, the same way `FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT`
costs the bounce overlay 2 - flagged for whoever next touches this).

**ENDEAVOR's damage, pinned hermetically per the brief's own ask** (no
visual drain wired this session - see "what's left"): `damageCalc.ts` gains
`calculateEndeavorDamage(targetHp, userHp)` (the raw
`setdamagetohealthdifference` HP-diff, clamped to 0) and
`resolveEndeavorDamage(targetHp, userHp, typeMultiplierTenths)` (the full
`typecalc`-then-`copyword`-restore sequence: the type multiplier gates
immunity only, a 0x multiplier zeroes the damage, anything else restores
the full unscaled diff) - both pinned against the RAM dump's own values
(117, 101 -> 16; the intermediate 0.5x scale to 8; the restore back to 16).

**One known, pre-existing residual - not new, not fixed either.** Tick 2906
(the submenu's own reveal tick for this reopen) shows the exact same 99px
row-shaped diff (x127-225, y=111) ISSUES #19 already named for
`fight-submenu.json`'s own tick 2073 - same bbox, same pixel count,
confirming it's a property of the reveal/resume mechanism in general, not
a turn-1-only or nav-only quirk. Left unfixed per this step's own explicit
OUT OF SCOPE list (ISSUES #19); recorded there, not re-litigated here.

**What's left (explicitly out of scope this session, for slice E2 or a
follow-up)**: ENDEAVOR's own attack animation (first real pixel change past
the settled kickoff text is oracle-confirmed at tick 3003 - a plain
generic-hit-style animation per battle-turn-notes.md §12, no move-specific
asset the way ROCK_SLIDE's rocks or DOUBLE_TEAM's clone-blend were); Onix's
own HP-bar drain (3098-3116, 116->101); the player healthbox's own HP DIGITS
changing for the first time (117/117 -> 101/117) - needs a player-side
healthbox compositor analogous to `composeOpponentHealthbox`, using
FONT_SMALL (source-confirmed: `AddTextPrinterAndCreateWindowOnHealthbox`
uses `FONT_SMALL`, the SAME font/color convention `healthboxAssembly.ts`
already uses for the opponent's own name/level text - "the tiny healthbox
digit font" the brief flagged turns out to be nothing new, not yet wired
for the player side); tick 3121's still-unattributed RNG step; the turn-3
tie-break prediction.

**Acceptance**: new committed trace `tools/compare/traces/turn2-endeavor.json`
(the exact 44-segment prefix + `battle1-turn2.json`'s own next 6 segments,
button-for-button identical - A/idle(30)/DOWN/idle(10)/A, with the final
idle trimmed to 53 frames so the trace ends at tick 2999, well short of the
3128 cap), 77 captures (dense every tick 2894-2960, strided every 4 to 2999)
**76/77** - the one residual is ISSUES #19's own pre-existing family (see
above), not a new defect. Zero regressions, full sweep re-verified at exact
prior counts: `turn1-rockslide` 256/256, `turn1-drain` 102/102,
`fight-submenu` 234/235, `turn1-kickoff` 81/81, `turn1-cloneanim` 230/230.
**New Tier-1 pins** (`tests/battleMenu.test.ts`, 7 new tests):
`getCurrentPPToMaxPPState`'s band boundaries, `ppRemainingGlyphCodes`'s
exact glyph-code output (9/10 and 10/10), `turn2KickoffTextVisibleChars`'s
timing; (`tests/damageCalc.test.ts`, 5 new tests): `calculateEndeavorDamage`/
`resolveEndeavorDamage` against the RAM-confirmed 117/101/16/8 chain. `npm
test` **659/659**, `npm run build` green.

## 14. S7 slice E1b: Onix's own HP-bar drain + player-healthbox HP digits (bounded worker, this session) - `turn2-endeavor-drain.json` **105/106** (the one residual is the SAME ISSUES #19 family already accepted in `turn2-endeavor.json`); ENDEAVOR's own attack animation stays OUT OF SCOPE, see below

Extends slice E1's own handoff (§13's "what's left") from tick 2999 (the
held "Foe GROVYLE used\nENDEAVOR!" text) toward the settled post-ENDEAVOR
state (~3128): Onix's own HP-bar drain (117->101, `battle-turn-notes.md`
§12's RAM table) and the player healthbox's own HP-digit text
("117/117"->"101/117", FONT_SMALL) are landed; ENDEAVOR's own attack
animation (Grovyle's squish/sweat-droplet/yellow-blend task + the target's
generic hit-flash, `Move_ENDEAVOR`/`BattleScript_HitFromAtkAnimation`) is
explicitly NOT modeled - see "What's out of scope" below for why and what's
needed.

**The brief's own premise ("a plain generic-hit-style animation, no
move-specific asset") does not hold - source-checked, not assumed.**
`data/battle_scripts_1.s:2479` (`BattleScript_EffectEndeavor`) confirms
ENDEAVOR routes through the shared `BattleScript_HitFromAtkAnimation` label
like most damaging moves - but that label's own `attackanimation` opcode
plays ENDEAVOR's OWN animation script (`Move_ENDEAVOR`,
`data/battle_anim_scripts.s:3789`), which is a genuinely custom asset: the
attacker (Grovyle) gets `AnimTask_SquishAndSweatDroplets` (new sprites,
sweat-droplet gfx) plus a yellow `AnimTask_BlendMonInAndOut` palette blend,
THEN two rounds of `AnimTask_ShakeTargetBasedOnMovePowerOrDmg` + a
"hitsplat" sprite (`create_basic_hitsplat_sprite`) on the target, each with
its own sound. Only AFTER that does `hitanimation BS_TARGET` fire the
generic hit-flash (healthbox wobble + mon blink) this file already has
formulas for (`rockSlideHealthboxWobbleY2`/`rockSlideMonBlinkInvisible`,
§12's own derivation). Oracle-confirmed (this session, whole-frame diff
against the tick-2999 baseline, `battle1-turn2.json`'s own dense captures
2999-3095): the screen differs from the held-text baseline for essentially
the WHOLE window 3003-3091 (with two brief 0-diff lulls around 3051-3063 and
3087, matching the script's own two-hitsplat-round structure), settling back
to an EXACT match with the pre-animation baseline (aside from the healthbox
HP itself) from **3095 on**. This is real new-asset work (sweat-droplet
sprites, a squish/stretch scale effect, a palette blend ramp, hitsplat
sprites) - not a same-formula reuse the way ROCK_SLIDE's own hit-flash was
for turn 2's target - so it's deferred, per this step's own explicit
fallback clause ("land the drain+digits half green... report exactly where
you stopped").

**Onix's own hit-flash (healthbox wobble + back-sprite blink) is ALSO
unmodeled, and turns out not to matter for this slice's own footprint.**
RAM-probed this session (`tools/probe/dump-rockslide-sprites.py`, unchanged,
just pointed at `targetBattler=0` for Onix instead of its default 1):
Onix's own healthbox wobble is RAM-active ticks 3063-3082 (20 ticks, same
shape as turn 1's own 20-tick wobble) and its own mon-sprite blink is
RAM-active 3064-3095 (32 ticks, same 4-tick-cycle shape) - i.e. the SAME two
formula shapes §12 already derived, just a new anchor delay (this move/
animation takes a different number of ticks to reach the hit-flash than
ROCK_SLIDE did) and the opposite battler. Not wired this session (still part
of "the animation," out of scope) - but oracle-pixel-confirmed harmless to
skip for THIS slice's own footprint specifically: the wobble only affects
the HEALTHBOX UI element (not Onix's own big monster sprite, which sits
elsewhere on screen), and a direct crop-diff against the tick-2999 baseline
shows the healthbox region itself is byte-identical at every one of the
sparse-sampled ticks 3091/3095/3098 (the wobble's own last RAM-active tick
is 3082, safely settled by then) - so this slice's own trace can safely
start dense captures at 3095 without needing either hit-flash formula.

**Onix's own HP-bar drain: render tick used directly, no extra lag -
verified, not assumed, exactly per this step's own brief.** Source-traced
first (`CompleteOnHealthbarDone`, `battle_controller_player.c:1126-1141`):
`MoveBattleBar` is called once per game frame while draining, and BOTH the
bar's own pixel fill (`MoveBattleBarGraphically`) and the HP digit text
(`UpdateHpTextInHealthbox(..., hpValue, HP_CURRENT)`) are driven off the
SAME per-call return value in the SAME function call - i.e. source predicts
no relative lag between the two, though it doesn't by itself say whether
there's an ABSOLUTE lag relative to render tick (real hardware could still
delay a CPU-copied sprite-tile write to the next vblank). Grid-search fit
(this session) against 6 ticks spanning the drain (2999/3099/3103/3107/
3111/3128, cropped to the bar's own fill-color rows and the digit glyph
region) confirms `t` used directly - same "no extra render lag" rule §12
found for the OPPONENT's own bar (`rockSlideOpponentHp`), now independently
re-confirmed player-side (a real, not rubber-stamped, check: the two sides
use entirely different battle-controller source files,
`battle_controller_player.c` vs `_opponent.c`, so equal timing was a
plausible-but-unverified guess going in). `endeavorOnixHp(t, pressTick,
startHp, endHp)` (`battleMenu.ts`) reproduces `rockSlideOpponentHp`'s exact
shape with its own anchor delay: `ENDEAVOR_HP_DRAIN_START_DELAY=153`
(`pressTick`+153 = RAM/render tick 3098, the sentinel - cross-confirmed
against `battle1-turn2-ram-dump.json`'s own `healthBar0Curr` column, which
independently shows the identical sentinel/drain/done/hp-update tick
sequence `battle-turn-notes.md` §12's table already names). A separate named
function, not a shared generalization of `rockSlideOpponentHp` - the anchor
delay is a different move/animation-window fact, not interchangeable, same
reasoning §12 already gave for why ROCK_SLIDE's own delay is its own named
constant.

**The player healthbox's own HP-digit text needed its own fresh grid search
- the "just FONT_SMALL, nothing new" prediction from §13 undersold how much
of the LAYOUT still had to be found.** The font/charmap infra was indeed
already sitting in `healthboxAssembly.ts` (unused for the player side until
now), but the player healthbox's own screen geometry was never derived -
`singlesPlayer`'s own frame sheet exists as an extracted asset but its
layout/z-order/status-icon geometry has never been source- or pixel-derived
(a full player-side analogue of ISSUES #16 - out of scope this session, see
below). Rather than build that whole compositor, this session's own
`composePlayerHealthboxHpOverlay` is a small sparse OVERLAY patch layered on
top of the existing flat `menu-healthbox-player.json` harvest (which stays
the render source for everything else) - just the two regions that actually
change value: the bar's 6 fill tiles (reusing the SAME `hpbar`/`hpbarAnim`
sheets + `calcBarFilledPixels`/`pickHpBarBand` the opponent's own bar
already uses, just a different screen corner - grid-search-confirmed local
origin `(47,14)`, NOT the opponent's own `(24,16)`) and the HP digit run
(FONT_SMALL, `singlesPlayer`'s own palette bank - bg=idx2/fg=idx1/shadow=
idx3, the SAME role convention `drawHealthboxText` established for the
opponent's nickname/level text, just a different sprite's own palette;
format = `rightAlign3(currentHp) + "/" + rightAlign3(maxHp)`, right-align
padding via `CHAR_SPACER` not a literal space -
`ConvertIntToDecimalStringN`'s own `STR_CONV_MODE_RIGHT_ALIGN` behavior,
`string_util.c:163-217`, the SAME convention `ppRemainingGlyphCodes`
already established for the PP number in slice E1).

**A real bug caught mid-session by widening the pixel check past just the
ink pixels**, worth naming since it's a general lesson for this kind of
patch: an initial grid search fit the DIGIT INK exactly (0 mismatches)
reusing the opponent's own `TEXT_VIS_Y0`/`TEXT_VIS_Y1`/`TEXT_PRINT_Y`
window constants verbatim (an 11-row visible band) - looked done. Running it
through the actual `npm run compare` tool on the extended trace immediately
surfaced a 47px diff at every drained tick, all in the SAME 2-row strip
right below the digits. Root cause: those two rows are the frame's own
static divider line (byte-identical across every HP value this trace
exercises, oracle-confirmed) sitting just past the REAL printer window's
own bottom edge - the opponent's 11-row constants don't apply here (source
confirms why: the HP-text printer calls pass `y=5` to
`AddTextPrinterAndCreateWindowOnHealthbox`, `battle_interface.c:1152`/1163,
vs. the nickname/level windows' own `y=3`, `:1119` - a different vertical
placement this file's existing constants were never derived for). The
INK-only check couldn't see this because the ink brute-force search is
underdetermined (many (printY, destY) pairs place the ink identically) and
never touched the BACKGROUND-clear rectangle's own extent, which is what
was actually wrong. Re-fit against the wider check (every pixel in a
superset region, ink AND non-ink) lands on a 9-row band (glyph rows
`[2,11)` -> canvas rows `[21,30)`, `PLAYER_HP_TEXT_GLYPH_ROW0`/`_ROW1` in
`healthboxAssembly.ts`) - 0 mismatches at all 6 tested ticks, confirmed via
the actual `npm run compare` run afterward, not just the standalone script.
A Tier-1 regression test now pins this specific failure mode (asserts the
divider row stays untouched at every HP value).

**What's out of scope, explicitly, per this step's own fallback clause**:
ENDEAVOR's own attack animation (ticks ~3003-3094, both the attacker's
squish/sweat/blend and the target's own hit-flash - see above for the full
derivation of why this needs new asset work, not a formula reuse); a full
player-side healthbox compositor (`singlesPlayer`'s own frame layout/z-order/
status-icon geometry, the player-side analogue of ISSUES #16 - this
session's own overlay patch sidesteps needing it, but a future status
effect on Onix, or a player-side status icon, would); DRAGON_BREATH's own
window (3129+, slice E2, per the brief's own OUT OF SCOPE list); ISSUES
#19's root cause; #20's FONT_NARROW rewire.

**Trace structure: a SEPARATE `turn2-endeavor-drain.json`, not an extension
of `turn2-endeavor.json` itself - chosen so slice E1's own already-accepted
76/77 fixture stays untouched** (lower blast radius than editing a
passing, already-referenced file) and so this session's own reduced scope
(drain+digits, explicitly NOT the animation) is legible as its own
increment rather than silently folded into E1's own trace. Same verbatim
44+6-segment prefix as `turn2-endeavor.json`, with the final idle segment
extended from 53 to 186 frames (landing at tick 3132, past the 3128 target
with a small settle margin) - all 77 of E1's own `captureFrames` kept
verbatim (re-confirms E1's own result byte-for-byte on every run), plus 29
new captures: dense every tick 3095-3120 (spans the drain sentinel through
well past the settle - the earlier 3003-3094 span is intentionally NOT
captured, since that's exactly the unmodeled animation window) and 3
settle-tail samples (3125/3128/3130). 106 captures total, well under the
256 cap.

**Acceptance**: `tools/compare/traces/turn2-endeavor-drain.json` **105/106**
- the one residual (tick 2906) is the exact same ISSUES #19 family already
named and accepted in `turn2-endeavor.json`'s own 76/77 (same bbox, same
pixel count - this trace shares that exact prefix, so it necessarily
recurs), zero NEW diff frames anywhere in the drain/settle window. Zero
regressions, full sweep re-verified at exact prior counts: `turn2-endeavor`
76/77 (untouched), `turn1-rockslide` 256/256, `turn1-drain` 102/102,
`fight-submenu` 234/235, `turn1-kickoff` 81/81, `turn1-cloneanim` 230/230.
**New Tier-1 pins**: `tests/battleMenu.test.ts` (3 new tests) -
`endeavorOnixHp`'s drain schedule + settle (value-agnostic) and its own
distinct anchor delay from ROCK_SLIDE's; `tests/healthboxAssembly.test.ts`
(6 new tests) - `composePlayerHealthboxHpOverlay`'s bar-tile wiring (full HP
and the 101/117 partial case), the digit-window's own 9-row footprint (a
direct regression guard for the bug above), and `rightAlign3GlyphCodes`'s
exact glyph-code output including the `CHAR_SPACER` padding cases. `npm
test` **669/669**, `npm run build` green.

## 15. S7 slice E1c: ENDEAVOR's own attack animation - groundwork ONLY this session (asset extraction + full source derivation + oracle timing table); ENGINE WIRING NOT LANDED, no trace/render changes - `npm test` 669/669 and `npm run build` green (unchanged, no engine code touched)

**Scope call, made explicitly rather than improvised**: the brief asked for
this exact window (ticks 3003-3094) as "a real asset slice," with an
explicit fallback ("commit the green subset... report where you stopped").
Source-reading `Move_ENDEAVOR` (`data/battle_anim_scripts.s:3789-3803`) this
session found FIVE concurrent, independently-timed sub-mechanisms, not one:
attacker squish (2-axis affine scale, a NEW capability - the engine's only
existing affine renderer, `drawSpriteSheetAffineTinted`/`affineEmergeAccumulator`
§7.22-7.23, is uniform-scale-only, built for the materialize sequence), 16
sweat-droplet sprites with linear velocity+lifetime physics (new gfx,
new particle-sprite bookkeeping), a 16-color palette blend ramp on the
attacker (`BlendPalette`, no new gfx but a new blend primitive distinct from
the existing `blendedTile`/`blendedSetPixel` alpha-compositing pair - this is
a palette-table rewrite, not a framebuffer alpha blend), two independent
target-shake task instances (x2-offset amplitude derived from
`gAnimMovePower`, not yet RAM-confirmed for ENDEAVOR's own value), and two
hitsplat sprites (new gfx, its own affine "pop" scale-down). Given this
run's own precedent for comparable complexity - the ROCK_SLIDE falling-rock
slice (§11) took a FULL session for ONE such mechanism and still left a
6-frame residual - landing all five pixel-exact in the remaining time this
session was not realistic without either rushing an unverified fit or
risking a red trace, both against this run's explicit conventions. Chose to
bank the (real, load-bearing, otherwise-expensive) research + extraction
work instead: source formulas for all five mechanisms, the two new gfx
assets, and an oracle-timed transition table, so a follow-up session can go
straight to grid-search-fitting instead of re-deriving from source. **No
trace was extended and no render code was touched** - extending
`turn2-endeavor-drain.json`'s captures into this window without an engine
change would just produce a red trace, which the brief explicitly forbids;
zero risk of regression follows trivially (nothing existing was modified).

**Assets extracted** (`tools/extract/extract-battle-move-anim-assets.ts`,
new block before the "decoded battle_anim_scripts.s step lists" section):
`src/assets/gen/battle-anim-sweat-drop.json` (`graphics/battle_anims/
sprites/sweat_drop.png`, ANIM_TAG_SWEAT_DROP - a single un-animated 8x8
tile) and `src/assets/gen/battle-anim-hitsplat.json` (`graphics/
battle_anims/sprites/impact.png`, ANIM_TAG_IMPACT - 32x32px/16 tiles, one
frame, affine-only "pop" via `sAffineAnims_HitSplat`, no ANIMCMD_FRAME
table). Both wired through the same `decodeIndexedPng`/`sliceTiles` helpers
every other sprite sheet in this file uses - deterministic, re-running the
extractor reproduces byte-identical JSON.

**Source-derived formulas** (`src/data/gen/battle-move-anim-tables.json`'s
new `endeavor` key, same "decoded" convention as `fallingRock`/`shakeMon`/
`doubleTeam` above - full field-level detail lives there, this is the
summary):
- **`squish`** (`AnimTask_SquishAndSweatDroplets`/`_Step`,
  `battle_anim_effects_3.c:3742-3802`, table `:883-889`): attacker-only,
  2-axis affine scale, steps `[(-16,+16,dur=6), (+16,-16,dur=12),
  (-16,+16,dur=6)]` from neutral 256, run twice (2 full 24-tick cycles, 48
  ticks total) - `arg1=2` (numSquishes).
- **`sweatDroplets`** (`CreateSweatDroplets`/`AnimFacadeSweatDrop`,
  `:3804-3849`): within EACH squish cycle, 2 batches of 4 droplets at local
  tTimer 6 (upper, offset ±18/-20) and 18 (lower, offset ±30/+20) -
  16 sprites total over the full window, each drifts (±2,-1) px/tick for 7
  ticks then self-destroys.
- **`blend`** (`AnimTask_BlendMonInAndOut`/`_Setup`/`_Step`,
  `battle_anim_mons.c:1714-1769`): attacker-only palette ramp toward
  RGB(31,21,0) via `BlendPalette`, coeff 0→12→0 at 1 tick/step, x2 cycles
  (48 ticks total - same length as squish, independently driven).
- **`targetShake`** (`AnimTask_ShakeTargetBasedOnMovePowerOrDmg`/`_Step`,
  `battle_anim_mon_movement.c:971-1032`): TWO task instances (script args
  `FALSE,1,8,1,0` both times - X-axis `x2` only, arg4=0 disables the Y
  branch), amplitude `clamp(gAnimMovePower/12, 1, 16)` split into
  up/down half-steps, alternating every 2 ticks for 8 alternations
  (~16 ticks/instance) then resets to 0 and self-destroys. **ENDEAVOR's own
  `gAnimMovePower` value is NOT RAM-confirmed this session** (the move's
  listed base power is 0, HP-diff damage is computed separately via
  `setdamagetohealthdifference` - whether the anim-power global still reads
  0 or some placeholder needs a RAM dump, flagged for whoever wires this).
- **`hitSplat`** (`gBasicHitSplatSpriteTemplate`/`sAffineAnims_HitSplat`/
  `AnimHitSplatBasic`, `battle_anim_normal.c:134-178,1006-1017`): two static
  32x32 sprites at target-relative offsets `(12,-12)` and `(-12,12)`, each
  using affine-anim-index 2 (instant pop to scale 176/256, then ramps back
  to neutral 256/256 over 8 ticks), self-destroying when its own affine anim
  ends. Round 2 spawns after the script's own `delay 24` following round 1.

**Oracle ground truth (scratch, not committed - `bin/oracle run` against a
dense every-tick 2999-3095 capture, whole-frame diff vs. the tick-2999
baseline, same crop/grid-search technique as PROGRESS-archive #132)**:
confirms §14's own coarse finding (diff essentially the whole 3000-3092
span, two brief 0-diff lulls) at FULL tick resolution:
- **3000-3007**: bbox confined to `x=127-225,y=16-72` (opponent/attacker
  side only, growing symmetrically) - this is the SQUISH alone, before any
  droplet/shake/hitsplat contamination (droplets don't spawn until local
  tTimer==6, i.e. ~3006 script-side). **This is an isolable sub-window** -
  a future session could land squish-only here and capture a genuinely
  green partial slice without needing droplets/blend/shake/hitsplat modeled
  yet, matching the brief's own suggested fallback shape ("attacker-side
  motion only").
- **3008-3049**: bbox widens to include `x=41..` (target/Onix side) -
  droplets + target shake/hitsplat round 1 (and round 2, by the tail)
  overlapping the squish's own two cycles; continuous, no lull.
  Exact per-mechanism boundaries within this span are NOT disentangled from
  bbox alone (multiple concurrent sub-mechanisms touch overlapping regions)
  - would need a RAM probe reading the relevant `gTasks[]`/sprite slots
    (same technique as `dump-rockslide-sprites.py`), not attempted this
    session.
- **3050-3063**: bbox empty (exact match to the tick-2999 baseline) - the
  first lull, corroborating §14's own coarser "3051-3063" finding.
- **3064-3084**: active again (bbox `x=44..229,y=49..111`, alternating two
  distinct shapes tick-to-tick) - unattributed at full resolution this
  session (see above).
- **3085-3088**: second lull (bbox empty).
- **3089-3092**: brief final activity (bbox `x=44-99,y=49-111`, target side
  only - consistent with hitsplat round 2's own tail).
- **3093-3095**: bbox empty - matches §14's own "settles by 3095" finding
  exactly (this session's own dense sweep confirms 3093/3094 are ALSO
  already settled, a slightly earlier margin than §14 estimated).

**What a follow-up session needs, concretely, to land this**: (1) a 2-axis
affine sprite renderer (generalize `drawSpriteSheetAffineTinted` or add a
sibling, no tint, independent x/y scale accumulators - the squish table
above is ready to drive it); (2) a droplet-sprite render/composite path
(the 8x8 tile is extracted, physics formula above is ready, needs a
per-tick sprite-list render call site); (3) a palette-blend primitive
distinct from `blendedTile` (a literal 16-color LUT rewrite toward a target
color, not a framebuffer alpha blend); (4) the hitsplat sprite (gfx
extracted, affine pop formula above is ready) plus RAM confirmation of
`gAnimMovePower` for ENDEAVOR to pin the shake amplitude; (5) RAM-probing
the 3008-3049 and 3064-3084 spans to attribute sub-mechanism boundaries
precisely, the same way `dump-rockslide-sprites.py` did for ROCK_SLIDE's
own concurrent mechanisms. The isolated 3000-3007 squish-only sub-window
(above) is the cheapest possible starting point if a future session wants
an incremental green landing rather than the whole thing at once.

**Verification**: `npm test` **669/669** (unchanged - no engine code
touched, this session added only extractor code + generated JSON + this
doc), `npm run build` green. No trace committed or extended (deliberate,
see "Scope call" above). Zero regressions, trivially: every existing traces'
render code path is byte-for-byte untouched.

### 15a. FITTED addendum (S7 slice E1d, bounded worker, follow-up session): squish wired + oracle-fitted for Y, X-axis still MISFITS - reverted, nothing landed, `npm test` 669/669 unchanged

**What landed:** nothing committed - engine code was written, tested against
the oracle, found to only half-fit, and reverted rather than committing a red
trace (per this run's own "keep every commit green" rule). This addendum
banks the empirical findings so the next session doesn't have to re-derive
them.

**Renderer reuse confirmed, no new primitive needed.** §15's own "what a
follow-up session needs" item 1 (a 2-axis affine renderer) turns out to
already exist: `drawSpriteSheetAffineStretch` (`battleScene.ts` §7.17,
built for GROVYLE_STRETCH/mechanism 5) already takes independent x/y matrix
params, a palette, and an optional tint/coeff - exactly what squish needs.
**But its calling convention doesn't transfer directly**: mechanism 5
(`Anim_VerticalStretch`) is a bespoke C function that writes the OAM matrix
fields DIRECTLY (no inversion), which is why that renderer takes `xScale`/
`yScale` as the matrix value verbatim. Squish (`AnimTask_SquishAndSweatDroplets`)
is instead driven through the generic `AFFINEANIMCMD_FRAME`/`RunAffineAnimFrame`
table system - the SAME system mechanism 4's materialize uses
(`sAffineAnim_Battler_Emerge`) - which goes through real `ObjAffineSet` and
needs the INVERTED convention `drawSpriteSheetAffineTinted` already uses
(`matrixParam = 0x10000/accumulator`). Confirmed empirically this session,
not just reasoned: only the inverted convention reproduces "squashes X /
stretches Y" from the extracted step signs (direct convention renders it
backwards - accX dipping below neutral would ENLARGE under direct
convention, when the label says squash). So a squish caller just needs to
pre-invert its own accumulator (`0x10000/acc`) before calling the existing
`drawSpriteSheetAffineStretch` - no new render primitive required, contra
this section's own original "what's needed" list.

**Local-tick anchor and one axis confirmed exact, pixel-checked, not
assumed.** A fresh dense oracle probe this session (`bin/oracle run` against
`turn2-endeavor-drain.json`'s own prefix, captures 2996-3012, whole-frame
diff vs. the tick-2999 baseline) reproduced §15's own bbox table exactly and
sharpened it to the pixel: **tick 2999 is the last neutral tick (zero diff),
tick 3000 is the first visible squish tick** (bbox x=145-206,y=16-71) growing
symmetrically through **tick 3006** (x=127-225,y=16-72, the widest) then
narrowing at **3007** (x=131-221) before **3008** jumps to include the
target side (x=49..) - droplet/shake/hitsplat contamination starting
exactly on schedule with §15's own estimate. This pins
`ENDEAVOR_SQUISH_START_DELAY=54` (`pressTick`+54 = tick 2999 = neutral/
logical-offset-0) as the accumulator's own anchor, same "+1 tick to first
visible frame" family as every other affine mechanism in this file.
**The step table's `dxScale` field maps to the RENDERED Y axis, not X**
(`dyScale` maps to X) - fitting `drawEndeavorSquish` against the oracle's
own diff bbox at tick 3003 found the Y-axis bbox (16-71) matches the oracle
EXACTLY using `dxScale`'s accumulator inverted into `my`, at every one of
the 8 ticks checked - a real, pixel-confirmed axis-label correction to bank
(the extracted table's own field names describe the SOURCE struct's own
field order, not necessarily screen-space X/Y - not the first time this run
has found a source-order/screen-order mismatch).

**X axis still doesn't fit - the open problem.** With the Y axis pinned
exact, the X axis (`dyScale`'s own accumulator, inverted into `mx`) produces
a bbox far too narrow: oracle's own tick-3003 diff bbox is x=138-214 (76px
wide, 12px WIDER than Grovyle's neutral 64px-wide sprite canvas), while the
fitted renderer only reaches x=144-207 (63px, essentially unchanged) - a
whole-silhouette misalignment (`tools/compare/out/latest/diff-03003.png`
this session, not committed: the diff mask is one large connected blob
covering nearly the entire Grovyle silhouette, not a thin edge fringe) -
ruling out a simple off-by-a-few-pixels tuning issue. Two hypotheses tried
and BOTH failed to close the gap: (1) the sprite's destination box might be
too small to show a widened result (real hardware's `ST_OAM_AFFINE_DOUBLE`
doubles the OAM bounding box, the same mechanism `drawSpriteSheetAffineRotate`
already models for the thrown ball) - added an optional `doubled` param to
`drawSpriteSheetAffineStretch` (scans -halfW..w+halfW/-halfH..h+halfH
instead of 0..w/0..h, backward-compatible default `false`) and reran: the
diff barely moved (2199px -> unchanged), ruling out box-clipping as the
binding constraint; (2) tried both axis-mapping directions for X
(`dxScale`-inverted and `dyScale`-inverted) - neither reaches the oracle's
76px width. **Open questions for whoever picks this up next**: is the
oracle's own 76px width evidence of an X-axis magnitude that's genuinely
larger than the extracted `±16`/`±16` step deltas (i.e. the extracted table
itself has a transcription error, not just a mislabeled axis - worth
re-reading `gFacadeSquishAffineAnimCmds` at `battle_anim_effects_3.c:883-889`
directly rather than trusting last session's own transcription); or is there
a concurrent mechanism (a slight x2/position shift, or the blend task
already contributing by tick 3000 despite this section's own "independently
driven" claim) shifting/widening the visible footprint beyond pure scale.
RAM-probing `gSprites[]`'s own affine data fields directly (the
`dump-rockslide-sprites.py`/`sendout-grovyle-stretch.json`-style probe this
run already has precedent for) rather than continuing to pixel-fit blind is
the recommended next step - this session spent its remaining time on
pixel-fit attempts and ran out of room before reaching for a RAM probe.

**Verification**: engine changes (the `doubled` param + `drawEndeavorSquish`/
`endeavorSquishAccumulator` + the `turn2-endeavor-drain.json` captureFrames
extension) were all reverted (`git checkout`) once the X-axis misfit was
confirmed real rather than a tuning slip - `npm test` **669/669** (unchanged),
`npm run build` green, tree clean, no trace changes. Zero regressions,
trivially: nothing shipped.

### 15b. RESOLVED (S7 slice E1d-retry, bounded worker, second follow-up session): X axis closed by RAM-probing the real hardware matrix - squish (+ its own concurrent palette blend) landed green for renders 3000-3005; `npm test` **672/672** (+3 new), `npm run build` green

**What landed:** `drawEndeavorSquish` in `battleScene.ts` (wired into
`drawTurn2KickoffText`), reusing `drawSpriteSheetAffineStretch` (now with an
opt-in `doubled` param) with an 8-entry RAM-probed table
(`ENDEAVOR_SQUISH_TABLE`). `turn2-endeavor-drain.json` extended
2999-only→2999-3005 dense; `tools/probe/dump-endeavor-squish.py` committed.
Squish itself (geometry) is now pixel-exact everywhere checked; the
concurrent blend (below) also had to be modeled for ANY tick in this window
to go green, since it turns out to start immediately, not later as §15
assumed.

**Method, per the brief: RAM-probe first, pixel-fit never.** §15a's own
recommendation - `tools/probe/dump-endeavor-squish.py` dumps
`gBattleAnimAttacker`→`gBattlerSpriteIds[]`→the attacker's own
`gSprites[].oam.matrixNum`→`gOamMatrices[matrixNum]` (real `a`/`b`/`c`/`d`,
8.8 fixed-point) every tick, resolved dynamically (no hardcoded battler/slot
- both symbols are exported, no `nm` needed unlike the rockslide-era
probes). Over ticks 2996-3012 this reads, RAW, with NO reciprocal curve
(every step is an exact `±16` per tick, matching `gFacadeSquishAffineAnimCmds`
verbatim, `battle_anim_effects_3.c:883-889`):

```
2996-2998: a=256 d=256 (neutral)
2999: a=240 d=272   3000: a=224 d=288   3001: a=208 d=304   3002: a=192 d=320
3003: a=176 d=336   3004: a=160 d=352   3005: a=176 d=336   3006: a=192 d=320
```

`affineMode` reads 0 (OFF) at neutral, **3 (`ST_OAM_AFFINE_DOUBLE`)** for
every squish tick - RAM-confirms §15a's own "doubled" hypothesis was
directionally right, just untestable while the matrix itself was still
wrong.

**Root cause of §15a's miss: wrong subsystem, not a wrong axis.** Squish
(`AnimTask_SquishAndSweatDroplets`/`_Step`) doesn't go through the sprite.c
generic affine-anim system (`RunAffineAnimFrame`/`ContinueAffineAnim`,
mechanism 4's own system, which DOES invert via `ConvertScaleParam`,
`0x10000/accumulator`) - it goes through a completely separate,
task-data-driven system: `PrepareAffineAnimInTaskData`/
`RunAffineAnimFromTaskData`/`SetSpriteRotScale`
(`battle_anim_mons.c:1787-1875`, also `PrepareBattlerSpriteForRotScale`'s own
`oam.affineMode = ST_OAM_AFFINE_DOUBLE` call - the doubling's real source).
`SetSpriteRotScale` calls real `ObjAffineSet` with `xScale`/`yScale` passed
through UNCONVERTED - confirmed both by reading `battle_anim_mons.c:1260-1275`
directly (no `ConvertScaleParam` call anywhere in that path) and by the RAM
probe itself (a reciprocal curve would NOT step by an exact linear `±16`/tick
the way the raw accumulator does). §15a's own empirical "Y axis fits
exactly, X doesn't" result was reasoned as an axis-label swap, but was
actually the SAME wrong (inverting) formula happening to land close on one
axis by numeric coincidence at the specific probed ticks and missing badly
on the other - not a real signal about which field is X vs Y. With the
correct (direct, unswapped, unconverted) values: `xScale` (the table's own
first/`dxScale` field) drives `gOamMatrices.a` (screen X) and `yScale`
(second/`dyScale` field) drives `.d` (screen Y), exactly as their names
already said - no axis correction needed at all once the right subsystem's
math is used. `drawSpriteSheetAffineStretch`'s own existing direct
(non-inverted) convention (§7.17, built for GROVYLE_STRETCH) turns out to
already be exactly right for squish too - just needed the `doubled` scan
window as a new opt-in param (`-halfW..w+halfW`/`-halfH..h+halfH`, the same
"doubles the destination box, still centered on the sprite's own real
position" convention `drawSpriteSheetAffineRotate` already established for
the thrown ball - re-derived from `CalcCenterToCornerVec`'s own doubling of
`centerToCornerVecX/Y`, `sprite.c:687-700`, and RAM-cross-checked: `sprite.x`
(176) minus the doubled vec (64) does land on the oracle's own widened
silhouette bounds).

**A second, real bug found only by chasing the RAM-verified geometry to
100%: §15's "independently driven" blend claim was wrong.** Even with the
matrix geometrically exact (visually near-identical silhouettes against the
oracle), pixel diffs stayed at ~5-6% every tick - a color problem, not
shape. Solving `(candidate RAM matrix, blend coeff, y2)` against each
oracle capture directly (brute-force over every value combination this
session's own probe dump offered, not a guess) found: the attacker's
palette blend (mechanism 3, `AnimTask_BlendMonInAndOut`, target
`RGB(31,21,0)`) is ALREADY ramping (`coeff`=1..8) across this entire
8-tick window - not starting later as §15/§15a assumed ("independently
driven" turns out to mean independently TIMED, not independently
SCHEDULED - both tasks start together). No new blend primitive was needed:
`drawSpriteSheetAffineStretch`'s own existing `tintColor`/`tintCoeff` params
(`blendComponentToward`, the same per-5-bit-channel formula real
`BlendPalette` uses) already do exactly this.

**A third, smaller finding: the matrix and the blend do NOT share one
render lag.** Every other affine mechanism in this file follows "render `T`
shows RAM tick `T-1`'s state" (`GROVYLE_STRETCH_TABLE`'s own convention).
Applying that uniformly to squish left every tick short by one matrix step.
Pixel-solving each of the 8 captures independently (not assuming the family
convention) found the blend coeff DOES follow the 1-tick family lag
(`coeff = i+1` for render offset `i`), but the matrix lags by TWO ticks
(render `3000+i` shows RAM tick `2997+i`'s matrix - render 3000 itself is
still geometrically neutral, blend-only). 7 of 8 render ticks matched the
oracle's own silhouette 100% pixel-exact at these values; the 8th (render
3006) matched 95% pre-trim (not chased further - see below).

**Window trimmed 3000-3007 → 3000-3005: droplets contaminate one tick
earlier than §15 estimated.** Extending the dense capture through 3007 (the
brief's own window) left 3006/3007 red (~0.4%, both traced to real
blue/white sweat-droplet sprites already visible in the oracle's own PNG -
`AnimFacadeSweatDrop`, mechanism 2, unmodeled this session, §15's own
formula for it is already banked). §15 predicted droplets spawn "at local
tTimer==6, ~3006" as a LOWER bound on contamination; this session's own
pixel evidence confirms exactly that boundary - 3006 is where droplets
start, not where they're still absent. `turn2-endeavor-drain.json`'s dense
window was trimmed to 3000-3005 (6 ticks, ALL pixel-exact) rather than
padding the brief's own 3000-3007 with a knowingly-red pair; droplets are
the clear, well-scoped next increment (asset already extracted, physics
formula already banked in §15, spawn-tick boundary now pinned to the pixel
by this session's own evidence).

**Verification**: `npm test` **672/672** (+3 new pixel-pins in
`battleScene.test.ts`, RAM-probe-value-derived, not hand-picked - see their
own doc comments), `npm run build` green. `tools/compare`:
`turn2-endeavor-drain.json` **111/112** (only the pre-existing #19 diff at
frame 2906 remains), `turn2-endeavor.json` **76/77** (unchanged),
`turn1-rockslide.json` **256/256** (unchanged) - zero regressions.

### 15c. S7 slice E1d droplets increment (bounded worker, third follow-up session): the first sweat-droplet batch landed green - `turn2-endeavor-drain.json` dense window **3000-3005 → 3000-3007**; `npm test` **674/674** (+2), `npm run build` green

**What landed:** `drawEndeavorDroplets` in `battleScene.ts`, called from
`drawEndeavorSquish` after the squished attacker draws (droplets sort above
the attacker per `CreateSweatDroplets`'s own `tSubpriority-5`). Renders 3006
and 3007 (the first two ticks of droplet batch 0/cycle 0) are now
pixel-exact; `tools/probe/dump-endeavor-droplets.py` and
`tools/probe/dump-endeavor-squish-blend-ext.py` (both new) are committed.

**Method, per the brief: RAM-probe first.** `dump-endeavor-droplets.py`
identifies droplet sprites by their real `callback` field
(`struct Sprite+0x1C`) against `AnimFacadeSweatDrop`'s own static address
(`nm -n --defined-only pokeemerald.elf`, thumb bit added - `CreateSweatDroplets`/
`AnimFacadeSweatDrop` are both `static`, no `bin/oracle symbols` entry) - a
stronger filter than shape/size. Run over ticks 2995-3060, it caught all 4
spawn events (2 cycles x 2 batches) with exact `x`/`y`/`data[]` (`sTimer`/
`sVelocX`/`sVelocY`) reads at every tick of each droplet's 7-tick life.

**Correction to §15's own banked table: the two `CreateSweatDroplets` offset
variants were mislabeled.** Source (`battle_anim_effects_3.c:3765-3775,
3804-3821`) calls `CreateSweatDroplets(taskId, TRUE)` at local `tTimer==6`
and `CreateSweatDroplets(taskId, FALSE)` at `tTimer==18`; inside that
function, `lowerDroplets=TRUE` selects `xOffset=30,yOffset=+20` (the
LARGER-magnitude, lower-on-screen batch) and `FALSE` selects
`xOffset=18,yOffset=-20` (upper). So `tTimer==6` spawns the LOWER/+20 batch
and `tTimer==18` spawns the UPPER/-20 batch - the OPPOSITE of §15's own
"tTimer==6 -> upper/-20, tTimer==18 -> lower/+20" summary
(`src/data/gen/battle-move-anim-tables.json`'s `endeavor.sweatDroplets`, left
as-is since it transcribes the ORIGINAL source reading verbatim - the
correction lives in `battleScene.ts`'s own doc comment, the authoritative
one). RAM-confirmed: solving `CreateSweatDroplets`'s own `xCoords`/`yCoords`
formula against all 8 probed spawn positions (both batches) against a
constant `task->tBaseX/tBaseY = (176, 40)` fits EXACTLY only with this
(corrected) offset assignment.

**A second, real bug found only by chasing the RAM-verified spawn data to
100% pixel-exact: droplets are NOT visible on their own `CreateSprite`
tick.** Naively reusing the squish matrix's own `RAM = render - 2` lag (so a
droplet's raw spawn position, `n=0`, is what `render = spawnRamTick+2`
shows) put every rendered droplet exactly one physics step
(`velocX`/`velocY`) AHEAD of the oracle's own pixels - e.g. render 3006
showed this engine's `n=0` position while the oracle's own pixels matched
RAM tick 3004's `n=1` (one step of motion already applied). Fixed by using
the fresher `RAM = render - 1` (matching the palette-blend's own lag, not
the matrix's) AND requiring `n>=1` rather than `n>=0` - i.e. a newly-created
droplet's own creation-tick position is written to RAM but not yet
composited into that same tick's OAM/PPU output; the first frame it's
actually drawn already reflects one `AnimFacadeSweatDrop` motion step. This
simultaneously reproduces both previously-unreconciled facts: render 3006 is
the first VISIBLE tick (matches the pixel-confirmed boundary from §15b) AND
render 3005 stays exactly as before (still no droplet - the sprite exists in
RAM by then but isn't composited yet). Found by brute-forcing lag=1/lag=2
against `npm run compare`'s own per-frame diff output directly (not
reasoned from source alone) after noticing the render-3006 diff was a small,
suspiciously-exact one-step positional shift, not noise.

**A third finding, this one a correction to §15b's own prose (not a new
bug): the squish matrix's render lag is `RAM = render - 2`, not `render -
3`.** §15b's own write-up said "render `3000+i` shows RAM tick `2997+i`'s
matrix" (i.e. `RAM = render - 3`); a fresh full-window RAM probe this
session (`dump-endeavor-squish-blend-ext.py`, RAM ticks 2996-3055) found the
COMMITTED TABLE's own actual values only match `RAM = render - 2` (e.g.
render 3001's `xScale=240,yScale=272` is RAM tick 2999's own reading, and
`3001-2=2999`, not `2997+1=2998`). The table's own committed numbers were
always right (they were RAM-probed correctly the first time); only the
prose's restated formula had an off-by-one. `ENDEAVOR_SQUISH_TABLE`'s own
doc comment is corrected in place.

**A fourth finding (informational, not wired): both squish/blend cycles were
fully RAM-probed this session** (`dump-endeavor-squish-blend-ext.py`, RAM
2996-3055 - `matrixA`/`matrixD`/`y2` plus `coeff` solved directly from a live
`gPlttBufferFaded`-vs-`gPlttBufferUnfaded` read against `BlendPalette`'s own
exact formula, `reference/pokeemerald/src/util.c:264-278` - not pixel-solved
against oracle PNGs as §15b's own note flagged). This confirms the squish
task's own "one extra tick per cycle boundary" quirk applies to `coeff` too
(cycle 2's `coeff` restarts ramping at RAM 3023, one tick before the
matrix's own restart at RAM 3024) and gives exact ground truth for the
WHOLE 48-ish-RAM-tick window - genuinely useful prep for a future session,
but **not landed as active render code this session**: extending
`ENDEAVOR_SQUISH_TABLE` to cover it was tried and reverted after `npm run
compare` showed real residual diffs from render 3008 on (batch-1/upper
droplet timing needed its own investigation, not yet done, and §15's own
bbox scan flags shake/hitsplat - unmodeled - as plausibly already
contributing pixels in that span). Landing only what's pixel-verified this
session, per this run's own discipline, rather than shipping an
unverified-past-3007 table as if it were confirmed.

**Window grown 3000-3005 → 3000-3007 (not further):** `npm run compare`
against the extended dense captures (3006-3050 tried) showed exact matches
only through 3007; 3008 onward showed a small (277px) but real residual
that widened further in (up to ~1700px) before narrowing again near each
cycle's own end - not chased further this session (candidates: batch-1/
upper droplet's own render-lag generalization not yet pixel-verified past
batch 0, and/or shake/hitsplat, both plausible and both out of this
session's scope). Trimmed to the last green tick (3007) rather than commit
a knowingly-red window.

**Verification**: `npm test` **674/674** (+2 new pixel pins in
`battleScene.test.ts`, oracle-PNG-cross-checked, not hand-picked - see their
own doc comments), `npm run build` green. `tools/compare`:
`turn2-endeavor-drain.json` **113/114** (only the pre-existing #19 diff at
frame 2906 remains - same residual as always, one more capture than before
so the ratio shifts but the absolute mismatch count doesn't), `turn2-
endeavor.json` **76/77** (unchanged), `turn1-rockslide.json` **256/256**
(unchanged), `turn1-cloneanim.json` **230/230** (unchanged), `turn1-
drain.json` **102/102** (unchanged) - zero regressions.

**Next steps for whoever picks this up**: (1) batch-1 (upper, `tTimer==18`)
droplet timing - verify whether the same `RAM=render-1`/`n>=1` convention
generalizes, or needs its own correction, by RAM-probing/pixel-fitting
render 3017 on (the analogous first-visible tick for batch 1); (2) once
droplets are fully closed for both batches/both cycles, the ALREADY-BANKED
extended `ENDEAVOR_SQUISH_TABLE` data (this session's own probe dump) can
likely just be dropped in; (3) shake/hitsplat (`gAnimMovePower` for ENDEAVOR
still not RAM-confirmed, §15's own flag) remain the last unmodeled
sub-mechanisms blocking a full close of this window.

### 15d. S7 slice E1d batch-1 increment (bounded worker, fourth follow-up session): batch-1 droplets + the extended squish/blend table landed green through render 3007 as before, PLUS two genuine "inter-round lull" islands past it (3024-3033, 3050-3060) - wall found and pinned exactly: render 3008, gated by an unmodeled hitsplat sprite, not a droplet/squish bug

**What landed:** `ENDEAVOR_SQUISH_TABLE` extended from 8 rows (`t=3000..3007`)
to 57 rows (`t=3000..3056`), covering both squish/blend cycles - same two
lags (`matrix/y2: RAM=render-2`, `coeff: RAM=render-1`) that fit the
original 8 rows, re-derived from a fresh `dump-endeavor-squish-blend-ext.py`
run (RAM 2996-3055; the prior session's own dump was scratch/uncommitted, so
this session re-ran it rather than trusting a stale transcription).
`turn2-endeavor-drain.json`'s `captureFrames` grew from 114 to 135: the
pre-existing dense 3000-3007 block, PLUS two newly-verified-green stretches,
`3024-3033` and `3050-3060` (see "the wall" below for why the frames between
them - 3008-3023 and 3034-3049 - stay uncaptured rather than committed red).
4 new Tier-1 pins in `battleScene.test.ts`, all oracle-cross-checked (a
scratch `bin/oracle run` capture, not this engine's own output).

**Batch-1 (upper) droplets: convention generalizes, ZERO code changes
needed - confirmed both by a targeted oracle pixel check and by full-frame
diff evidence.** Batch 1/cycle 0 spawns at RAM `pressTick+59+12=3016`
(`ENDEAVOR_DROPLET_BATCH_STRIDE=12`, already-committed formula); applying
the SAME `RAM=render-1`/`n>=1` convention batch 0 established gives first
visible render `3016+1(n)+1(lag)=3018` - one tick later than §15c's own
rough "~3017" guess (that note was an estimate for where to start looking,
not a computed prediction). A scratch oracle capture at (156,19) - batch 1
droplet index 0's own predicted center - confirms it exactly: render 3017
shows plain background `(247,247,255)`, render 3018 shows the droplet's own
bright highlight `(206,255,255)`, the identical color batch 0's own pin
uses. Independently corroborated by the full-window `npm run compare` diff
bounding boxes (below): every diff tick's bbox stays confined to
`x=41-102` (the target/Onix side) and NEVER shifts toward the
`x=142-210` droplet/attacker region even at render 3018 when batch 1 first
becomes visible - if the convention were wrong for batch 1, that region
would show up as a diff exactly there and it never does, through the whole
3008-3049 span.

**The wall, found and pinned exactly: render 3008, gated by hitsplat (not
shake, not a droplet/squish bug).** Extending dense captures tick-by-tick
past 3007 (per the brief's own "extend then trim to last green" method)
immediately hit a diff at 3008 (277px). Cropping the diff mask's own
bounding box (`tools/compare/diff.ts`'s red-highlight convention) pinpoints
it precisely: `x=49-71,y=65-87` at 3008-3009, growing to `x=44-102,y=49-111`
by 3010 and staying in that same footprint (never touching the attacker
side) through 3023. Visually (`diff-03008.png`) it's an unmistakable small
red starburst sitting on Onix's own body - `AnimHitSplatBasic`'s own "pop"
sprite (§15's own derivation: two static 32x32 sprites at target-relative
`(12,-12)`/`(-12,12)`, instant pop to scale 176/256 then ramping back to
256/256 over 8 ticks) appearing exactly where source says it should, just
not yet modeled by this engine. This is a clean, unambiguous attribution -
not a guess: the bbox never once overlaps the `x>127` attacker/squish/
droplet region across the entire 3008-3049 span, which is exactly the
independent evidence (above) that closes out batch-1's own convention too.

**A genuine bonus finding: two "inter-round lull" islands exist inside what
§15's own coarser bbox scan called one continuous 3008-3049 span.** Diffing
every tick individually (not sampled) found the hitsplat/shake contamination
actually has gaps: `3024-3033` (10 ticks) and `3050-3060` (11 ticks, past
the previously-known settle) both diff EXACTLY ZERO pixels - real quiet
windows between hitsplat round 1's own decay and round 2's own pop-in (and
past round 2 entirely for the second island), not previously distinguished
at §15's coarser 4-tick sampling resolution. Since these ticks are
genuinely, individually oracle-verified green - not adjacent to the
3000-3007 block, but real nonetheless - `captureFrames` includes them
(matching this trace's own pre-existing sparse-then-dense convention, e.g.
the `2963,2967,2971...` prefix already mixes densities); the red spans
between islands (3008-3023, 3034-3049) are deliberately left OUT of
`captureFrames` entirely rather than committed as known-red, per this run's
"never commit red" rule.

**Verification**: `npm test` **678/678** (+4 new pixel-pins, oracle-
cross-checked per their own doc comments), `npm run build` green.
`tools/compare`: `turn2-endeavor-drain.json` **134/135** (grown from
113/114 - only the pre-existing #19 diff at frame 2906 remains),
`turn2-endeavor.json` **76/77** (unchanged), `turn1-rockslide.json`
**256/256** (unchanged), `turn1-cloneanim.json` **230/230** (unchanged),
`turn1-drain.json` **102/102** (unchanged) - zero regressions.

**What's left, precisely scoped for whoever picks this up next**: model
`AnimHitSplatBasic` (gfx + affine pop table already extracted/derived, §15)
and `AnimTask_ShakeTargetBasedOnMovePowerOrDmg` (needs `gAnimMovePower` for
ENDEAVOR RAM-confirmed, still open per §15's own flag) to close the
3008-3023 and 3034-3049 gaps - both squarely target-side, zero risk of
disturbing the now-closed attacker-side squish/blend/droplet modeling. Once
those land, the two islands this session found should merge with 3000-3007
into one fully contiguous green block through at least 3060.

### 15e. S7 slice E1 hitsplat/shake increment (bounded worker, fifth follow-up session, session's LAST): **both remaining sub-mechanisms landed green - the 3008-3023/3034-3049 gaps are CLOSED, `turn2-endeavor-drain.json`'s green window now runs contiguously 3000→3060** (the two "inter-round lull" islands §15d found merged with everything around them, exactly as predicted)

**What landed:** `tools/probe/dump-endeavor-hitsplat-shake.py` (new probe) RAM-
read both remaining mechanisms directly - `gAnimMovePower` (a per-tick scalar,
confirmed **75** for ENDEAVOR throughout, never RAM-confirmed before this
session per §15/§15c/§15d's own repeated flag - the move's *listed* base
power is 0, but `GetMovePower`'s real placeholder for HP-diff moves is 75),
the target's own `sprite->x2` (shake), and the two `AnimHitSplatBasic`
sprites' real position + OAM matrix. Both wired into `drawEndeavorSquish`
(`endeavorShakeX2` applied to Onix's own draw offset, `drawEndeavorHitsplats`
layered on top) and `turn2-endeavor-drain.json`'s `captureFrames` extended to
cover the two previously-red spans in full (3008-3023, 3034-3049) - the trace
now captures EVERY tick 2999-3060 (the two islands §15d found, 3024-3033 and
3050-3060, are no longer distinguishable from their neighbors - all green).
7 new Tier-1 pins (`battleScene.test.ts`), all oracle-cross-checked against
this session's own `bin/oracle run` captures (`tools/compare/out/latest`),
not hand-picked.

**First real probe attempt found a dead end, banked so it isn't re-hit:**
filtering hitsplat sprites by `callback == AnimHitSplatBasic`'s own address
(the same pattern `dump-endeavor-droplets.py` uses for `AnimFacadeSweatDrop`)
finds ZERO sprites, ever - `AnimHitSplatBasic` reassigns
`sprite->callback = RunStoredCallbackWhenAffineAnimEnds` on its own very
first invocation (`battle_anim_normal.c:1006-1017`), so by the earliest tick
any probe could observe the sprite, the callback has already moved on. Fixed
by filtering on `sprite->affineAnims` (offset `0x10`, stable for the sprite's
whole life) against `sAffineAnims_HitSplat`'s own real (rodata) address
instead - a more robust identifying field than `callback` for any sprite
whose callback reassigns itself post-creation.

**Hitsplat: RAM-confirmed CONSTANT matrix, not a ramp - corrects this run's
own earlier banked asset-doc summary.** `src/data/gen/battle-move-anim-
tables.json`'s `endeavor.hitSplat.decoded` (§15, never edited in place) says
the affine anim "ramps back to neutral 0x100 over 8 ticks" after the pop;
reading the actual `sAffineAnim_HitSplat_2` cmd table
(`battle_anim_normal.c:147-152`) shows the SECOND frame is a literal
`AFFINEANIMCMD_FRAME(0x0, 0x0, 0, 8)` - a ZERO delta held for 8 ticks, not a
ramp. RAM-confirmed directly: `gOamMatrices[matrixNum].a`/`.d` read exactly
**372** (`0x10000/176`, the pop's own inverted accumulator) for the sprite's
ENTIRE visible lifetime (10 RAM ticks/round), then the sprite is destroyed
outright with no fade. So the engine only needed a static enlarged pop
(`drawSpriteSheetAffineStretch` reused as-is, `doubled=true` for the same
"enlarges past its native box" reason squish needed it, `tintCoeff=0` for its
own palette), not an interpolated table like squish's.

**Hitsplat position: RAM-read directly rather than hand-deriving the general
target-relative-offset formula.** The script's own literal offsets
(`(12,-12)` round 0, `(-12,12)` round 1, `relative_to=ANIM_TARGET`) don't
apply directly - solving both rounds' RAM-read absolute centers (`(60,76)`,
`(84,100)`) against a single consistent target anchor requires negating the
X component only (`InitSpritePosToAnimTarget`'s own per-side mirroring,
unconfirmed in detail - not worth deriving generally for two static
positions when both are already RAM-ground-truth). Banked as two literal
`{center, ramOffset}` entries (`ENDEAVOR_HITSPLAT_ROUNDS`), the same
"hand-plugged RAM-confirmed literals over a live formula" convention
`ENDEAVOR_DROPLET_BATCH_OFFSETS` already established.

**Shake: THREE distinct render lags now confirmed across this one animation
window, none assumed.** The naive guess (reuse blend/droplet's own
`RAM=render-1`) pixel-solved WRONG - a first wiring attempt using that lag
passed the round-0 hitsplat entirely (render 3008 matched) but round-0 shake
diffed on alternating render ticks (3009/3011/3013/...) while matching on the
others (3010/3012/3014/...), a signature of the render lag being off by
exactly one tick from the RAM's own 2-tick-held pairs. RAM-vs-pixel cross-
check (diffing `oracle-03008..03023.png` against a `t=3008` neutral baseline,
cropped to the target's own `x=40-110,y=45-115` box to exclude the
concurrent squish region) pinned the real first-shake-visible render tick at
**3010**, not 3009 - i.e. `RAM=render-2`, the SAME lag `ENDEAVOR_SQUISH_TABLE`'s
own matrix uses, not blend/droplet's fresher one. So this one window now has
three confirmed lags for three different kinds of per-tick RAM writes: a
direct sprite-field write read once per OAM-build pass (squish matrix, shake
x2: `render-2`), a palette-buffer DMA write (blend coeff: `render-1`), and a
freshly-created sprite's own "written but not yet composited" creation tick
(droplets: `render-1` + `n>=1`). Once the lag was fixed, amplitude fell out
directly from the RAM-confirmed `gAnimMovePower=75` (`75/12=6` integer
division, `upStep=downStep=3`) and the whole window (3000-3060, both
squish/blend cycles, both droplet batches, both shake/hitsplat rounds) landed
first-try with zero further pixel mismatches.

**Verification**: `npm test` **685/685** (+7 new pixel-pins, oracle-cross-
checked per their own doc comments), `npm run build` green. `tools/compare`:
`turn2-endeavor-drain.json` **166/167** (grown from 134/135 - `captureFrames`
now covers every tick 2999-3060 contiguously; only the pre-existing #19 diff
at frame 2906 remains), `turn2-endeavor.json` **76/77** (unchanged),
`turn1-rockslide.json` **256/256** (unchanged), `turn1-cloneanim.json`
**230/230** (unchanged), `turn1-drain.json` **102/102** (unchanged) - zero
regressions. This closes the brief's own acceptance criteria exactly: the
green window runs contiguously 3000→3060 with no new diffs beyond #19's own
frame 2906.

**What's left for whoever picks this up next**: renders past 3060 (the
`3061-3094` span - §15's own original full-window scan found activity there
too, unattributed) are still red/uncaptured - out of THIS session's own
scope (the brief capped at "≥3060"), but likely the SAME hitsplat/shake
mechanisms' own tail interacting with something not yet isolated (§15's own
scan called it "alternating two distinct shapes tick-to-tick", never RAM-
probed). A future session should RAM-probe that span the same way this one
did before assuming it's new territory.

### 15f. S7 slice E1 tail increment (bounded worker, sixth follow-up session): the ENDEAVOR animation window CLOSES - `turn2-endeavor-drain.json`'s green span now runs contiguously **3000→3094+** (every tick through the pre-existing dense 3095-3120 block), TWO more sub-mechanisms found, neither the ones §15's own coarse scan guessed at

**What landed:** `tools/probe/dump-endeavor-tail.py` (new probe) RAM-read the
`3061-3094` gap directly rather than trusting §15's own "alternating two
distinct shapes... likely the same hitsplat/shake mechanisms' own tail"
guess - that guess was WRONG (both `dump-endeavor-hitsplat-shake.py`'s own
fields and `dump-endeavor-squish-blend-ext.py`'s own matrix/blend fields
read zero/neutral throughout this entire span, RAM-confirmed before writing
a single line of new render code, per the brief's own mandatory method).
Two genuinely NEW, previously-unmodeled mechanisms found instead: the player
healthbox's own brief post-hit "wobble" (`endeavorHealthboxBounceY2`) and
Onix's own brief post-hit "flicker" (`endeavorOnixInvisible`). Both wired
into `drawEndeavorSquish` (`battleScene.ts`), which needed its own
`ENDEAVOR_SQUISH_TABLE` extended with 36 more (all-neutral) rows through
`t=3092` so its primitive-reconstruction path - already required for
"erase/shift a live OBJ, which a flat harvest can't do" reasons since §15b -
keeps covering the tail instead of falling back to the flat
`drawActionMenuIdleContent` harvest a tick too early. `turn2-endeavor-
drain.json`'s `captureFrames` extended from 167 to 201 (every tick 3061-3094
added, closing the gap between the previously-committed 3000-3060 block and
the pre-existing dense 3095-3120 block - the whole animation is now one
contiguous captured span). 8 new Tier-1 pins (`battleScene.test.ts`), all
oracle-cross-checked against this session's own `bin/oracle run` captures
(`tools/compare/out/latest`), not hand-picked.

**Method, per the brief: RAM-probe first, wide, before any pixel-diffing.**
Extended both committed §15e-era probes (`dump-endeavor-hitsplat-shake.py`,
`dump-endeavor-squish-blend-ext.py`) over RAM 3050-3100 first, exactly as
the brief instructed - both came back flat: `gAnimMovePower`'s shake/hitsplat
fields empty/zero, the squish matrix pinned at neutral `256/256`, the
attacker's own OBJ palette faded==unfaded throughout. This ruled out "the
same mechanisms' own tail" (§15's own guess) before any render code was
touched. Extending `captureFrames` to the full `3061-3094` gap and running
`npm run compare` against the STILL-unmodified engine (per this run's
"extend then trim to last green" method) confirmed real, non-trivial diffs
from render 3064 on (`3061-3063` matched with zero code changes - genuinely
quiet ticks, not a probe gap) - so the gap was real, not an artifact of
under-capturing.

**Finding the healthbox wobble: a from-scratch full-sprite-table scan, not a
guess.** With the known mechanisms ruled out, a scratch probe dumped EVERY
in-use sprite's `x2`/`y2` over RAM 3058-3096 with zero filtering - three
sprites (`gHealthboxSpriteIds[0]` plus two neighbor slots, almost certainly
other pieces of the same compound healthbox assembly - real healthboxes in
this engine are composited from a single flat harvest, but the real hardware
evidently still uses several OBJ sprites underneath) moved in perfect
lockstep, `y2` alternating `+1`/`-1` every RAM tick for exactly 20 ticks
(`pressTick+118..+137`) then a hard stop - a structurally DIFFERENT
mechanism from `menuIdleBounce`'s own slow, continuous, sine-driven bounce
(`battleMenu.ts` - that one's range is `[0,2]`, never negative, and never
stops). Render lag confirmed **directly against oracle pixels** (a
healthbox border pixel sampled every tick 3060-3085, not just inferred from
`npm run compare`'s own diff-percentage pattern): `render = RAM+1`, the
same lag family blend/droplet already established (not squish/shake's own
`render=RAM+2`). Modeled as a `dy` parameter threaded through
`drawMenuHealthboxPlayer` (previously `dx`-only, default `dy=0` so its other
two call sites are unaffected) rather than a new draw primitive - the
healthbox is already a primitive composite, not a flat harvest, once inside
`drawEndeavorSquish`'s reconstruction path.

**Finding the flicker: two real hypotheses tried and ruled out with RAM
evidence before landing on the right one.** The residual diff after the
healthbox wobble was wired traced to Onix's own silhouette exactly (bbox
`x=44-99,y=49-111`, oracle-confirmed via a direct crop showing Onix fully
ABSENT from an otherwise-correct background at render 3089 - not a color or
position difference, the sprite is simply gone). Two hypotheses were checked
against RAM before guessing further: (1) a palette blend like the attacker's
own `BlendPalette` yellow ramp - ruled out, Onix's own OBJ palette
(`gPlttBufferFaded`, all 16 colors) is byte-identical to a pre-window
baseline at every probed tick; (2) a hardware alpha blend
(`BLDCNT`/`BLDALPHA`/`BLDY`, the same registers a "flash white" effect would
use) - ruled out, all three read `0` throughout (confirming, as a bonus,
that the ATTACKER's own earlier blend genuinely is a manual palette rewrite,
not a hardware blend, cross-checking §15b's own claim). The real mechanism
was found by widening the RAM read to the sprite's full `struct Sprite`
`flags` byte (offset `0x3E`) rather than just position/palette fields:
`gBattlerSpriteIds[0]`'s own sprite toggles its `invisible` bit (bit 2) on
and off - 4 ticks invisible, 4 ticks visible, four full cycles
(`pressTick+119..+150`), then settles visible for good with RAM-confirmed no
fifth cycle. Render lag independently pixel-confirmed the same way as the
wobble (a diagnostic pixel deep inside Onix's own silhouette, sampled every
tick 3060-3095 against the oracle, not inferred): `render = RAM+1`, matching
the wobble's own lag. Modeled as a boolean gate around the existing
`drawSpriteSheet` call for Onix inside `drawEndeavorSquish` - no new
primitive needed, since that path was already reconstructing Onix from a
live sprite draw (not a flat harvest) since §15b.

**The true settle tick, evidence-named per the brief:** render **3093** is
the first tick where BOTH new mechanisms (and every earlier one) are
simultaneously back to their neutral/absent state and stay there - RAM-
confirmed (`dump-endeavor-tail.py`'s own scan through RAM 3096 shows no
further activity on either mechanism) and pixel-confirmed (renders 3093-3094
match the plain fallback with zero code changes, and the pre-existing dense
3095-3120 block was already green). This is 1-2 ticks earlier than §15's own
coarse "settles by 3095" estimate - consistent with that section's own
caveat that it was a whole-frame diff against a neutral baseline, not a
per-tick oracle-vs-engine comparison.

**Verification**: `npm test` **693/693** (+8 new pixel-pins, oracle-cross-
checked per their own doc comments), `npm run build` green. `tools/compare`:
`turn2-endeavor-drain.json` **200/201** (grown from 166/167 -
`captureFrames` now covers every tick 2999-3060 AND 3061-3094 AND the
pre-existing 3095-3120/3125/3128/3130 block, i.e. the entire animation
window through settle; only the pre-existing #19 diff at frame 2906
remains), `turn2-endeavor.json` **76/77** (unchanged), `turn1-rockslide.json`
**256/256** (unchanged), `turn1-cloneanim.json` **230/230** (unchanged),
`turn1-drain.json` **102/102** (unchanged) - zero regressions. This closes
the ENDEAVOR animation window entirely: S7 slice E1 (ENDEAVOR, `docs/
battle-menu-notes.md` §15-§15f) is DONE, no more unattributed spans.

**What's left for whoever picks this up next**: nothing further within
ENDEAVOR's own window. The next S7 remainder is DRAGON_BREATH's own window
(~3129+, out of this session's scope per the brief) and the standing
ISSUES #19 family (the one residual every ENDEAVOR-window trace still
carries, root-caused as pre-existing and out of scope for this slice).
