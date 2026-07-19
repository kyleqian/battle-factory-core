# Battle menu idle-window groundwork dossier (worker lane, ticks 1742-1810)

Groundwork-only dossier (no engine code) for the final slice of the
PLAYER-SEND-OUT + FIRST-ACTION-MENU window: the blank-box gap at 1742-1747,
the atomic menu draw at 1748, and the settled 4-phase idle from 1750 on.
Cross-references `docs/battle-menu-notes.md` §4/§5 (the two things this
dossier exists to source-attribute) and `docs/battle-bringup-notes.md` §3
(coarse SS2/SS3/SS5 pins). Does **not** edit either of those files — this
worktree lane owns only this new file, per the supervisor's brief; the
concurrent main-lane worker owns `battle-menu-notes.md`. Frame numbers are
`battle1-intro.json`/`battle1-menu-dense.json`'s own absolute tick indices
(same 40-segment script, same RNG stream, 1886 ticks total).

## 1. The idle cycle's driver, RAM-pinned exactly: `DoBounceEffect`/`SpriteCB_BounceEffect`

**Source** (`src/battle_controller_player.c:233-238`, `HandleInputChooseAction`,
the battler-controller function `HandleChooseActionAfterDma3` switches to the
instant the action-menu's BG0 scroll-reveal finishes):

```c
static void HandleInputChooseAction(void)
{
    ...
    DoBounceEffect(gActiveBattler, BOUNCE_HEALTHBOX, 7, 1);
    DoBounceEffect(gActiveBattler, BOUNCE_MON, 7, 1);
    ...
```

This runs **every tick** `HandleInputChooseAction` is the active controller
func (i.e. every idle tick at the menu), but `DoBounceEffect` internally
no-ops after the first call per `battler`/`which` pair (guarded by
`healthBoxesData[battler].{battlerIsBouncing,healthboxIsBouncing}`,
`battle_main.c:2899-2938`) — so in practice it fires its setup exactly once,
the first tick the menu's input handler runs.

`DoBounceEffect(battler, which, delta, amplitude)` (`battle_main.c:2899-2938`)
creates an **invisible driver sprite** per `which` (`BOUNCE_MON`=0,
`BOUNCE_HEALTHBOX`=1, `include/battle_main.h:41-42`) with callback
`SpriteCB_BounceEffect`, seeded `sSinIndex = 192` ("-1", `// -1` in source)
for `BOUNCE_MON` and `sSinIndex = 128` ("0", `// 0`) for `BOUNCE_HEALTHBOX`,
`sDelta = 7`, `sAmplitude = 1`. Every tick thereafter
(`SpriteCB_BounceEffect`, `battle_main.c:2967-2979`):

```c
gSprites[bouncerSpriteId].y2 = Sin(index, sprite->sAmplitude) + sprite->sAmplitude;
sprite->sSinIndex = (sprite->sSinIndex + sprite->sDelta) & 0xFF;
```

writing directly into the **target** sprite's `y2` — `bouncerSpriteId` is
`gBattlerSpriteIds[battler]` for `BOUNCE_MON` (**region A** — the ONIX
battler sprite itself, resolving `battle-menu-notes.md` §4's "ONIX battler
sprite itself" candidate) and `gHealthboxSpriteIds[battler]` for
`BOUNCE_HEALTHBOX` (**region B** — the healthbox **main** sprite; its `y2`
is then mirrored onto the two dependent healthbox sprites every frame by
their own already-known callbacks, `SpriteCB_HealthBar`/
`SpriteCB_HealthBoxOther`, `battle_interface.c:979-1013`, both of which just
copy `x2`/`y2` from the main sprite — this is exactly why
`battle-menu-notes.md` §4 found "no self-driven motion... in the healthbox
sprite chain itself": the driver is a **separate, invisible third sprite**,
not any of the three healthbox-family sprites' own callbacks). This closes
that dossier's open attribution precisely.

`Sin(index, amplitude) = (amplitude * gSineTable[index & 0xFF]) >> 8`
(`src/trig.c:515-518`, `gSineTable` a 320-entry Q8.8 table,
`src/trig.c:1-5`). With `amplitude=1` this only ever evaluates to `{-1,0}`
(rarely `1` right at the peak), so `y2 = Sin(...)+1` only ever takes values
`{0,1,2}` — a coarse, mostly-2-state stepper, not a smooth sine bob.

### RAM confirmation (this session, `tools/probe/specs/menu-idle-bounce.json`)

Watched `gSprites[6].y2` (ONIX's own battler sprite — confirmed the region-A
driver by a 64-slot `y2` scan, `gSprites+0x26+i*0x44` for `i=0..63`, which
found exactly 4 nonzero slots: `0`, `6`, `62`, `63`) and `gSprites[0].y2`
(the player healthbox main sprite — region B) across trace ticks 1745-1815,
reusing `battle1-menu-dense.json`'s own 40-segment script. Slots `62`
(`SpriteCB_HealthBar`) and `63` (`SpriteCB_HealthBoxOther`) track `gSprites[0]`
tick-for-tick, exactly as source predicts.

Result (RAM tick → `onixBounceY2` (region A) / `healthboxMainBounceY2` (region B)):

| RAM tick | A (onix) | B (healthbox) | note |
|---|---|---|---|
| 1745-1747 | 0 | 0 | before `HandleInputChooseAction`'s first tick |
| **1748** | 0 | **1** | both `DoBounceEffect` calls fire this tick; B's seed (`sSinIndex=128`) lands on a nonzero `Sin` immediately, A's (`sSinIndex=192`) doesn't yet |
| 1749-1757 | 0 | 0 | (9 ticks) |
| 1758-1766 | 1 | 0 | (9 ticks) |
| 1767-1775 | 1 | 1 | (9 ticks) |
| 1776-1784 | 0 | 1 | (9 ticks) |
| 1785-1793 | 0 | 0 | (9 ticks) |
| 1794-1802 | 1 | 0 | (9 ticks) |
| 1803-1811 | 1 | 1 | (9 ticks) |
| **1812** | 1 | **2** | the sine-index stepper's non-exact divisor (see below) briefly produces the 3rd, rarely-seen `y2=2` state |
| 1813-1815+ | 0 | 1 | cycle continues |

(Exact per-tick values are in the committed spec's output when re-run; the
table above collapses the two clean 9-tick plateaus per phase.)

**This tick-for-tick matches `battle-menu-notes.md` §4's independently
pixel-observed phase table exactly, under this window's own established
+1 render-lag convention** (screen tick *T* shows RAM tick *T−1*'s sprite
state — the same convention `battle-menu-notes.md` §3 item 4c already
established and RAM-confirmed for the ball-spin window):

| screen tick (pixel-observed, §4) | RAM tick (this session) | A / B state |
|---|---|---|
| 1749 (single-tick "blip") | 1748 | B jumps to 1 for exactly one RAM tick — **this is the blip**, and it is real: `DoBounceEffect`'s very first tick, not noise |
| 1750-1758 (phase 0, 9-tick dwell) | 1749-1757 | A=0, B=0 |
| 1759-1767 (phase 1) | 1758-1766 | A=1, B=0 — matches `battle-menu-notes.md` §4's "region A changes on transition 0→1" exactly |
| 1768-1776 (phase 2) | 1767-1775 | A=1, B=1 — matches "region B changes on transition 1→2" |
| 1777-1785 (phase 3) | 1776-1784 | A=0, B=1 — matches "region A changes on transition 2→3" |
| 1786-1794 (phase 0 repeat) | 1785-1793 | A=0, B=0 — matches "region B changes on transition 3→0" |
| 1786-1810 (repeats, trace ends mid-phase-2 at 1810) | 1785-1809 | phase 0/1/2 repeat exactly, all four transitions above holding each cycle |
| **1813 (the "transient 5th sha" `battle-menu-notes.md` §4 flagged but couldn't explain)** | **1812** | **B=2** (the rare 3rd state) — **this single RAM tick is the entire explanation for the 5th sha**: `sSinIndex` (`+=7` mod 256) doesn't evenly divide 256, so every so often the stepped index lands one step deeper into the sine table than the coarse `{0,1}` model predicts, producing a genuinely different (not corrupted) `y2=2` frame before falling back into the regular 2-state alternation |

**Generative model for the engine slice** (both bouncers created the same
RAM tick, 1748 — the first tick `HandleInputChooseAction` runs, one tick
after `battle-menu-notes.md`'s own "1748 fully drawn" pin, which is the
*earlier*, separate BG0-scroll-reveal event, §3 below):

```
sinIndexMon(t)        = (192 + 7*t) & 0xFF   // t = ramTick - 1748, t >= 0
sinIndexHealthbox(t)  = (128 + 7*t) & 0xFF
y2(sinIndex)           = (gSineTable[sinIndex] >> 8) + 1     // amplitude=1
regionA_y2(ramTick)    = y2(sinIndexMon(ramTick-1748))         if ramTick>=1748 else 0
regionB_y2(ramTick)    = y2(sinIndexHealthbox(ramTick-1748))   if ramTick>=1748 else 0
screenTick T shows ramTick = T-1's (regionA_y2, regionB_y2)
```

This is a **closed-form generator**, not a replayed sha table: an engine
slice can compute `y2` for both regions at any tick directly from this
formula (plus `gSineTable`, already in this codebase as `gbaSin`/a literal
table per `battle-menu-notes.md` §3 item 4c's own precedent — **reuse the
literal table, not `gbaSin`**, per that item's own documented ±1-unit
mismatch risk for sample-sensitive uses; a `y2` bob is amplitude-1 so the
risk is much smaller here, but untested, so flagging rather than asserting
it's safe to use the derived version).

**Per-region pixel deltas**: `y2 ∈ {0,1,2}` is a **vertical-only** offset
(no `x2` change was found — the 64-slot scan only checked `y2`; an `x2`
scan wasn't run this session, but `SpriteCB_BounceEffect` only ever writes
`.y2`, never `.x2`, so `x2` is not expected to move — asserted from source,
not independently RAM-confirmed this session). `battle-menu-notes.md` §4's
own bbox sizes (region A 769px, region B 1579px) are the sprite's on-screen
footprint shifting by 1-2px vertically as `y2` steps `0→1→2→1→0`, not a
sprite-shape change.

**Phase origin at menu-draw time**: `DoBounceEffect` fires on
`HandleInputChooseAction`'s first tick, RAM 1748 — one tick *after*
`battle-menu-notes.md`'s pixel-pinned "1748 fully drawn atomically" (§1 of
that doc), because that pin is the **BG0-scroll reveal** completing
(`HandleChooseActionAfterDma3`, §3 below), a strictly earlier controller-func
state than `HandleInputChooseAction`. The bounce genuinely starts the
*next* tick after the visible menu appears, not the same tick — confirmed
by the RAM data (`onixBounceY2`/`healthboxMainBounceY2` are both `0` at RAM
1745-1747, i.e. before the menu is even visible, and B's first nonzero
value lands at RAM 1748 specifically, not 1747 or earlier).

## 2. Is this the same timer as `battle-scene-notes.md`'s scene-assembly idle? **No — independently confirmed, both by code path and by math.**

`battle-scene-notes.md` §3.3's scene-assembly idle is
`TextPrinterDrawDownArrow` (`text.c:787-830`), driven by a **per-textPrinter
bitfield** (`downArrowDelay`/`downArrowYPosIdx`, `text.h:58-59`) that only
exists while a message window's active printer is in the
`RENDER_STATE_CLEAR` "waiting for `\p`" state — it is not running at all at
the action menu (no down-arrow prompt is ever drawn there; `HandleInputChooseAction`
never touches a text printer's down-arrow state). Its period is **exactly**
9 ticks/phase × 4 phases = 36 ticks, because `downArrowDelay` is a flat
countdown-from-8 with no drift.

The menu idle (`DoBounceEffect`/`SpriteCB_BounceEffect`, §1) is a
**completely different code path** (`battle_main.c`, not `text.c`), a
**different data structure** (an invisible driver sprite's `data[]` fields,
not a text-printer bitfield), and **critically, a different kind of
period**: `sSinIndex += 7` never evenly divides the 256-entry sine table
(`gcd(7,256)=1`), so region A/B's ~18-tick half-periods **drift** — the
tick-1812/1813 `y2=2` anomaly (§1) is direct proof of this drift, and is
structurally impossible under the down-arrow's exact bitfield countdown
(which never produces a "5th state"). **Verdict: independent mechanisms
that happen to produce a superficially similar 4-phase/~36-tick signature
by coincidence of both using base-9-ish sub-periods** — the down-arrow's 9
is `8+1` exactly; the bounce's ~9 is an emergent approximation of how often
`(seed + 7t) mod 256` crosses a `Sin(·,1)` zero-boundary, not a designed
9-tick unit. **The engine slice must re-derive/model the menu idle
independently** (via §1's closed-form generator) — it cannot reuse
scene-assembly's down-arrow-phase code or constants.

## 3. Action-menu draw: templates/text confirmed by the sibling dossier; cursor tile byte-check still open (not done this session — see below)

`battle-bringup-notes.md` §3 (lines 315-331) already source-confirms, not
re-derived here: `B_WIN_ACTION_PROMPT`
(`tilemapLeft=1,tilemapTop=35,width=14,height=4,baseBlock=0x01c0`) and
`B_WIN_ACTION_MENU` (`tilemapLeft=17,tilemapTop=35,width=12,height=4,
paletteNum=5,baseBlock=0x0190`) from `sStandardBattleWindowTemplates[]`
(`battle_bg.c:163`), text `gText_BattleMenu = "FIGHT{CLEAR_TO 56}BAG\n
POKéMON{CLEAR_TO 56}RUN"` (`battle_message.c:1275`), prompt string
`gText_WhatWillPkmnDo` (draws "What will ONIX do?" via
`BattleStringExpandPlaceholdersToDisplayedString`), and cursor tile IDs
`{1,2}` poked directly into the BG0 tilemap by
`ActionSelectionCreateCursorAt` (`battle_controller_player.c:1530-1538` per
`battle-menu-notes.md` §5). **New this session**: found the exact draw-order
source, `PlayerHandleChooseAction` (`battle_controller_player.c:2575-2589`):

```c
static void PlayerHandleChooseAction(void)
{
    gBattlerControllerFuncs[gActiveBattler] = HandleChooseActionAfterDma3;
    ...
    BattlePutTextOnWindow(gText_BattleMenu, B_WIN_ACTION_MENU);
    for (i = 0; i < 4; i++)
        ActionSelectionDestroyCursorAt(i);
    ActionSelectionCreateCursorAt(gActionSelectionCursor[gActiveBattler], 0);
    BattleStringExpandPlaceholdersToDisplayedString(gText_WhatWillPkmnDo);
    BattlePutTextOnWindow(gDisplayedStringBattle, B_WIN_ACTION_PROMPT);
}

static void HandleChooseActionAfterDma3(void)
{
    if (!IsDma3ManagerBusyWithBgCopy())
    {
        gBattle_BG0_X = 0;
        gBattle_BG0_Y = DISPLAY_HEIGHT;
        gBattlerControllerFuncs[gActiveBattler] = HandleInputChooseAction;
    }
}
```

Both windows (text + cursor) are fully composited into the tilemap **while
BG0 is still scrolled off-screen**; `HandleChooseActionAfterDma3` polls
`IsDma3ManagerBusyWithBgCopy()` every tick and only reveals (scrolls BG0 to
`Y=0`/visible) once the DMA3 copy of the freshly-drawn tiles into VRAM has
completed — this is the exact, now source-confirmed mechanism behind
`battle-menu-notes.md` §5's claim that "the menu draws atomically... the
window content was already fully composited off-screen before the scroll."
It also directly explains why `HandleInputChooseAction` (and hence
`DoBounceEffect`, §1) only starts the tick *after* the scroll-reveal
completes — they're sequential controller-func states, not concurrent.

**Cursor-tile byte-check (`battle-menu-notes.md` §7 item 4's "10-minute
follow-up"): NOT done this session** — ran out of time budget before
reaching it. This is a real, still-open, precisely-scoped gap, not a new
one: byte-compare tiles `{1,2}` of `src/assets/gen/battle-window.json`'s
extracted tileset against the on-screen cursor pixels at tick 1748/1750
(`battle1-menu-dense.json` has both frames captured already). Flagging
explicitly rather than asserting it's covered.

## 4. The blank-box state 1742-1747: draw-side mechanism found; the specific clear call not pinned this session (open)

**Found, source-confirmed**: the atomic reveal mechanism (§3 above,
`PlayerHandleChooseAction`/`HandleChooseActionAfterDma3`) explains how the
*new* action-menu content appears atomically once BG0 scrolls back at
tick ~1748, and why nothing between the old message box's content and the
new menu's content is drawn incrementally on-screen. **Not found this
session**: the specific call that produces the 6-tick **teal blank** state
observed at 1742-1747 (`battle-menu-notes.md` §1) — i.e. whatever clears
the previous `B_WIN_MSG` ("Go! ONIX!") window's tile contents to blank
*before* `PlayerHandleChooseAction` ever runs. Candidates not yet checked
against source: a `FillWindowPixelBuffer`/`ClearWindowTilemap` call inside
`HandleTurnActionSelectionState`'s `STATE_BEFORE_ACTION_CHOSEN` case
(`battle_main.c:4143` per `battle-bringup-notes.md` §3) prior to emitting
`BtlController_EmitChooseAction`, or a generic "clear all battle windows"
step in `TryDoEventsBeforeFirstTurn`. **Named as an open, precisely-scoped
gap** (not silently skipped) — a future session should start from
`HandleTurnActionSelectionState` (`battle_main.c:4129-4168`) and trace
what runs between `TryDoEventsBeforeFirstTurn` completing and
`BtlController_EmitChooseAction` (`:4168`) firing, cross-checked against
the already-committed `battle1-menu-dense.json`'s 1742-1747 frames. The
distinction from tick 1563's single-tick clear (`battle-menu-notes.md` §1/§2:
box-clear-and-first-glyph happen in the *same* tick there, vs a 6-tick
sustained blank here) is pixel-confirmed already by the existing dossier;
what's still missing is only the *source* side of this specific clear,
not the pixel behavior.

## 5. The 1693-1741 static hold's END-trigger arithmetic

Already substantially chained by `battle-menu-notes.md` §3 items 6-7 and
`battle-bringup-notes.md` §3's RAM finding
(`gBattleControllerExecFlags` busy through tick 1740); this session adds the
**polling-loop arithmetic** that explains why the box-clear boundary lands
on *exactly* tick 1742, not 1741 or 1743, tying those together:

1. `HandleBallAnimEnd` waits for the ball sprite's anim **and** the mon's
   affine anim to finish, then `Intro_TryShinyAnimShowHealthbox`
   (`battle_controller_player.c:979`) draws the healthbox and calls
   `StartHealthboxSlideIn` once **both** cry playback (`waitForCry`, audio
   -gated, no pixel effect) and BGM restore clear.
2. `Intro_WaitForShinyAnimAndHealthbox` (`:940`) waits for the healthbox
   sprite's slide-in callback to go idle, then sets `introEndDelay = 3` and
   hands off to `Intro_DelayAndEnd` (`:931`).
3. `Intro_DelayAndEnd` decrements `introEndDelay` **one tick at a time**;
   on the tick it reaches 0, it calls `PlayerBufferExecCompleted()`
   (`battle_controller_player.c:200-214`), which does
   `gBattleControllerExecFlags &= ~gBitTable[gActiveBattler]` — this is the
   **exact tick** `battle-bringup-notes.md` §3 RAM-confirmed as tick 1740
   (the last tick the flag is still set is 1740; §1 of `battle-menu-notes.md`
   independently pixel-confirms the static hold runs through 1741 inclusive,
   consistent with the flag-clear landing at the *end* of processing on
   1740/1741 and being *observed* clear starting 1741, one report-vs-observe
   tick apart — not re-resolved further this session, flagged as the
   existing ±1 ambiguity rather than asserted precisely).
4. The **main battle loop only checks `gBattleControllerExecFlags` once per
   tick**, at the top of `BattleMainCB1`'s dispatch — so the earliest
   `HandleTurnActionSelectionState`'s `STATE_BEFORE_ACTION_CHOSEN` case
   (`battle_main.c:4143`, which is gated on the exec-flags bit being fully
   clear for *all* active battlers, not just the player) can run is the
   tick **after** the bit clears. This one-tick polling lag is the
   arithmetic reason the blank-box state (§4) begins at tick 1742 and not
   1741 — it is a **direct, mechanical consequence** of this codebase's
   standard "clear this tick, dispatch next tick" controller-exec-flags
   idiom (the same idiom already documented for e.g. `PlayerBufferRunCommand`,
   `battle_controller_player.c:216-225`), not a separate delay constant.
5. No RNG anywhere in this chain — consistent with `battle-bringup-notes.md`
   §3's 9-total-draws RNG-checkpoint table, unaffected by this window (also
   independently reconfirmed by `battle-menu-notes.md` §3's own "no RNG"
   note for the same span).

**Net model**: `boxClearTick = introEndDelayExpiryTick + 1`, where
`introEndDelayExpiryTick` is RAM-confirmed as tick 1740/1741 (the existing
±1 ambiguity noted above) — enough to model the *timing* (a fixed one-tick
dispatch lag after a RAM-confirmed flag-clear event), even though the exact
clear call itself (§4) is still open.

## 6. Summary table for the engine slice

| item | status |
|---|---|
| Idle-cycle driver (region A/B) | **fully source + RAM confirmed this session** — `DoBounceEffect`/`SpriteCB_BounceEffect`, closed-form generator in §1, explains the tick-1813 anomaly exactly |
| Same timer as scene-assembly idle? | **No — confirmed independent**, both by code path and by the drift signature (§2) |
| Action-menu window templates/text | **already source-confirmed** (`battle-bringup-notes.md` §3); draw-order/atomicity mechanism newly source-confirmed this session (§3) |
| Cursor tile byte-check | **still open**, not attempted this session (time-boxed out, §3) |
| Blank-box 1742-1747 source | **partially open** — draw-side (what replaces it) confirmed; clear-side (what blanks the old message box) not found this session (§4) |
| 1693-1741 hold's END-trigger arithmetic | **modeled** — `Intro_DelayAndEnd` + one-tick exec-flags polling lag (§5); one small ±1-tick ambiguity flagged, not re-resolved |

New committed artifact: `tools/probe/specs/menu-idle-bounce.json` (RAM
probe spec backing §1's table; reruns clean against the live oracle,
`gSprites[6]`/`gSprites[0]` `y2` fields).
