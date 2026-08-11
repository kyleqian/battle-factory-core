# switch-pacing tail forensics — ISSUES #78's 4 (5) remaining red frames

Spec: `tools/compare/traces-groundtruth/mid-battle-switch-pacing-b-off.json`
(oracle Battle Scene OFF). Supervisor brief asks for read-only pixel forensics +
mechanism attribution on the red frames 1399/1400 and 1406/1407; this doc also
classifies **1408**, which the extended `--capture-range 1395:1410` run exposes
as a fifth red frame that the pinned spec (capture list ends at 1407) never
measured. Verify script: `tools/probe/switch-pacing-tail-forensics.ts`
(per-class PASS/FAIL, 0 unattributed target).

## 1. Red set — measured, not assumed

`npm run compare -- mid-battle-switch-pacing-b-off --summary` → **148/152**,
red = 1399, 1400, 1406, 1407 (as ISSUES #78 states). An extended
`--capture-range 1395:1410` run adds **1408** (1641px, identical class to
1407). So the real red set is five frames: **1399/1400/1406/1407/1408**. The
ISSUES px counts were re-measured and are correct for the frames it lists:
1399/1400 = 634px each, 1406 = 6083px, 1407 = 1641px, 1408 = 1641px.

## 2. The transition schedule (frame-to-frame, oracle vs app)

Measured with a per-frame diff over `tools/compare/out/run-*/{oracle,app}-NNNNN.png`:

| Event | Oracle | App | App lag |
| --- | --- | --- | --- |
| Box-text clear (`But nothing happened!` text + interior → field bg) | **1398→1399** (634px, rows 123-135) | **1400→1401** (634px) | **+2** |
| Fight-menu open (bottom chrome rows 113-158) | **1405→1406** (6083px) | **1406→1407** (6083px) | **+1** |
| Fight-menu redraw step 1 (rows 74-110) | **1406→1407** (1641px) | **1407→1408** (1641px) | **+1** |
| Fight-menu redraw step 2 (rows 74-110) | **1407→1408** (1641px) | **1408→1409** (1641px) | **+1** |

Cross-check: **oracle(f) == app(f+1) for every f in 1405..1409 (0px diff)** —
the app reproduces the oracle's whole menu-chrome sequence exactly one frame
late, and the box-text clear is two frames late. So the app is not "drawing
different chrome"; it is drawing the *same* chrome on a *delayed* clock.

The box-text clear at 1398→1399 is 10 frames after the `waitmessage
B_WAIT_TIME_LONG` hold ends (1325-1388, exactly 64 frames —
`docs/mid-battle-switch-presentation-ground-truth.md` §2 row 80): the ISSUES
"64+10 turn-end seam" number is confirmed. The app holds the text +2 past that
seam.

## 3. Per-frame pixel classification (every diff px named; target 0 unattributed)

Run: `node --experimental-strip-types tools/probe/switch-pacing-tail-forensics.ts <outDir>`

### 1399 and 1400 (634px each — box-text tail)

Region bbox (16,123)-(130,135), rows 123-135, cols 16-130.

| Oracle class | px | Oracle color | App class | px | App color |
| --- | --- | --- | --- | --- | --- |
| field_bg | 634 | 107,165,165 | box_interior | 345 | 107,90,115 |
| | | | text_ink | 289 | 255,255,255 |

**All 634px:** oracle = cleared field background; app = the `But nothing
happened!` message box (interior + white glyphs) that the oracle already
wiped. Nothing else on screen differs. Verdict: the ISSUES hypothesis
(*app persists M2 box text two frames past the oracle's box-text clear*) is
**confirmed as measured**.

### 1406 (6083px — fight-menu open)

Region bbox (9,113)-(238,158). Oracle draws the FightMenu chrome; app still
draws the settled field + healthboxes.

| Oracle class | px | Oracle color(s) | App class | px | App color(s) |
| --- | --- | --- | --- | --- | --- |
| menu_text_white | 3360 | 255,255,255 | field_bg | 4867 | 107,165,165 |
| menu_frame | 606 | 115,107,132 | healthbox_frame | 480 | 74,66,82 |
| menu_chrome_light | 411 | 214,214,206 | healthbox_hp_red | 466 | 214,74,57 |
| menu_chrome_dark | 358 | 74,74,74 | healthbox_hp_grey | 254 | 132,140,140 |
| menu_interior | 333 | 107,90,115 | healthbox_chrome_pink/dark/brown | 16 | 156,74,99 / 107,66,90 / 173,107,99 |
| menu_border_dark | 324 | 41,49,49 | | | |
| menu_chrome_pale/blue/blue_light/etc | 691 | 222,214,222 / 74,74,107 / 140,140,206 / … | | | |

### 1407 and 1408 (1641px each — menu-chrome redraw, app 1f late)

Region bbox (127,74)-(229,110) = the FightMenu window's upper chrome band.
Both sides draw the *same* menu palette; the diff is the two-frame redraw the
app performs one frame after the oracle (verified: oracle 1407 == app 1408,
0px). All 1641px fall in the 25-color menu palette (frame/ink/interior
classes in the script's `MENU_REDRAW_PALETTE`); 0 unattributed.

## 4. Mechanism attribution (engine, read-only)

### 4a. 1399/1400 — box-text clear is 2 frames late

**Oracle:** the box text is wiped during turn-end, 10 frames after the 64f
waitmessage hold (1388 + 10 = 1398, first clear frame 1399). Mechanism:
`waitmessage B_WAIT_TIME_LONG` (`battle_scripts_1.s:1179`, 64f measured
1325-1388), then `moveend`/`end2` turn-end. The box then holds empty until the
fight menu opens at 1406.

**App:** the message box text is a `message` command held by
`WAITMESSAGE_LONG_TIMING` (`src/engine/battleResolutionPresentation.ts:468-471`,
`WAITMESSAGE_LONG_HOLD_FRAMES = 64` at `:444`), and `STRINGID_BUTNOTHINGHAPPENED`
is in `WAITMESSAGE_LONG_MESSAGE_IDS` (`:541`). The render keeps
`latestMessage` visible for the whole resolution (`battleResolutionPresentationRender.ts:1200-1206`,
`bottom === "message"` at `:1248-1255`), so the box stays up through the
`turn-end` command that follows (`battleResolutionPresentation.ts:603`,
`TURN_END_TIMING = { minimumFrames: 8 }`, pushed at `:3236`) **and** through
the `next-command-handoff` phase (`BATTLE_RESOLUTION_NEXT_COMMAND_HANDOFF_FRAMES`
= `BATTLE_COMMAND_ACTION_ENTER_DELAY` = **6**, `battleResolutionPresentationRender.ts:43-44`),
i.e. 14 frames after the 64f hold, vs the oracle's 10.

**Name the literal change:** the app's box-text tail is `turn-end (8) +
next-command-handoff (6) = 14` frames past the waitmessage; the oracle's is 10.
To land oracle 1399, the box text must clear 2 frames earlier — either drop
`TURN_END_TIMING.minimumFrames` from 8 to 6 in this seam
(`battleResolutionPresentation.ts:603`), or blank the `latestMessage`/`bottom`
at the start of the turn-end command instead of at handoff
(`battleResolutionPresentationRender.ts:1248-1255`). **Predicted per-frame
outcome:** with a 2-frame-earlier clear, frame 1399 and 1400 render field-bg
where the oracle does → 634px each → **green**; 1401 stays green (both sides
already cleared).

### 4b. 1406/1407/1408 — fight-menu open + redraw are 1 frame late

**Oracle:** after the box clears, the fight menu draws in two visible steps:
open 1405→1406 (bottom chrome), redraw 1406→1407 and 1407→1408 (upper chrome
band rows 74-110, same 1641px each).

**App:** the command presentation opens on `action-enter`
(`battleCommandPresentation.ts:434`, `BATTLE_COMMAND_ACTION_ENTER_DELAY = 6` at
`:227`) then reveals the action menu, then the fight submenu after
`FIGHT_SUBMENU_OPEN_DELAY = 5` (`battleMenu.ts:920`). The orchestrator hands
off only after `isBattleResolutionNextCommandHandoffComplete` (6 frames,
`battleResolutionPresentationRender.ts:828-833`). The measured net is a
uniform **+1** across the whole menu sequence (oracle 1406 == app 1407 ==
0px, etc.).

**Name the literal change:** the whole menu-open pipeline is one frame late.
Shorten the pre-reveal seam by 1 — e.g. `BATTLE_COMMAND_ACTION_ENTER_DELAY`
6→5 (`battleCommandPresentation.ts:227`, which also feeds
`BATTLE_RESOLUTION_NEXT_COMMAND_HANDOFF_FRAMES` at
`battleResolutionPresentationRender.ts:43`), or equivalently hand off one frame
earlier in `advanceFactoryRoundBattleCommand`
(`src/engine/factoryRoundBattleOrchestrator.ts:1768-1802`). **Predicted
per-frame outcome:** menu open moves to 1406, redraw steps to 1407 and 1408 →
frames 1406, 1407, **and 1408** each match the oracle's already-advanced
state → all green; 1409 stays green.

**Note for the fix worker:** the two lags are independent (+2 box-text, +1
menu). Fixing only 4b leaves 1399/1400 red; fixing only 4a leaves
1406/1407/1408 red. Both must land for 152/152. The box-text fix must NOT be
implemented by removing the `next-command-handoff` frames themselves (they are
shared with the menu seam); blank the message box, not the clock.

## 5. Verification

```sh
# green-check the two hypotheses / reproductions:
npm run compare -- mid-battle-switch-pacing-b-off --summary        # 148/152
npm run compare -- mid-battle-switch-pacing-b-off --capture-range 1395:1410 --summary  # +1408 red
# classification + schedule verify (out dir from either run above):
node --experimental-strip-types tools/probe/switch-pacing-tail-forensics.ts \
  tools/compare/out/run-<id>     # ALL FRAMES PASS, 0 unattributed per frame
```

After the fix lands, the same script re-run on a fresh `npm run compare` out
dir should report the red frames as absent; the spec's `captureFrames` may
additionally be extended to include 1408 so the fifth frame is pinned.
