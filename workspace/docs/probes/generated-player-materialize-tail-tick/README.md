# Generated-route player materialize tail-tick — RAM probe (ISSUES #74)

Step-1 probe for ISSUES #74's remaining question (PROGRESS entry 922 / the
`docs/probes/materialize-hitmarker-gating/` premise check): do the two
regressed frames — `factory-arbitrary-intro-yoshi-off` frame 640
(`bbox=46,73-97,111`) and `factory-arbitrary-intro-magneton-off` frame 621
(`bbox=41,64-102,111`) — sit inside the species-agnostic affine-emerge window
(`MATERIALIZE_Y2_TABLE`, mechanism 1) or the later settle window (flat
`y2=0`, mechanism 2)? **Verdict: (a), with an exact tick boundary.** Both
frames are the ONE tick where `drawGeneratedPlayerMaterialize`'s mechanism-1
window stops one tick short of `MATERIALIZE_Y2_TABLE`'s own last entry.
Fixed this session — see `src/engine/battleScene.ts`'s
`generatedPlayerMaterializeSettleY2` and its ISSUES #74 doc comment.

## Method

1. **App-side clock mapping** (temporary `console`-free instrumentation, not
   committed — a throwaway `renderAppTrace`-driven script logging
   `drawGeneratedPlayerMaterialize`'s own `playerVisualT`/window-membership
   per compare frame): for both traces, oracle frame 640/621 map to
   `playerVisualT = 1664` exactly — `PLAYER_MATERIALIZE_SETTLE_START_TICK`,
   the FIRST tick of the settle window, immediately after mechanism 1's
   window (`PLAYER_MATERIALIZE_START_TICK..PLAYER_MATERIALIZE_END_TICK`,
   1653-1663) ends. The app currently draws flat `y2=0` there for both
   traces' non-ONIX leads (YOSHI's is GRIMER, MAGNETON's is DELCATTY).
2. **RAM probe of the ACTUAL committed traces** (not the standalone KADABRA
   scenario), via `bin/oracle`'s `battle_lab.py` (`mode: factoryLegal`,
   `battle-scene-off` profile) driving `tools/battle-lab/factory-arbitrary-
   intro-{yoshi,magneton}-off.json` directly (`preCheckpointCaptureAllFrames`
   already `true` in both files), reading `gSprites[gBattlerSpriteIds[0]]`
   (`y2`, `animNum`, `callback`) and `gHitMarker` every frame. Raw windowed
   dumps: `yoshi-ram-window.json` (frames 1795-1815), `magneton-ram-window.json`
   (frames 1783-1803). Driver script not committed (scratch, `/tmp/probe74_ram.py`,
   same addressing convention as `tools/compare/backDipRightSideProbe.py`).

## Findings

**YOSHI** (`preCheckpointFrameOffset=1171`, so oracle frame `F` = RAM frame
`F+1171`; frame 640 → RAM frame 1811):

```
RAM frame  y2   callback
1799       14   SpriteCB_PlayerMonFromBall (0x08039e45)
1800       13
1801       12
1802       11
1803       10
1804        9
1805        8
1806        7
1807        5
1808        4
1809        3
1810        2
1811        0
1812        0
1813        0
1814        0   SpriteCallbackDummy (0x08007429) — callback flips here
```

**MAGNETON** (`preCheckpointFrameOffset=1178`; frame 621 → RAM frame 1799):

```
RAM frame  y2   callback
1787       14   SpriteCB_PlayerMonFromBall (0x08039e45)
1788       13
...
1797        3
1798        2
1799        0
...
1802        0   SpriteCallbackDummy (0x08007429) — callback flips here
```

Both descents are the exact same 13-value species-agnostic sequence
`14,13,12,11,10,9,8,7,5,4,3,2,0` the `materialize-hitmarker-gating` probe
already found for KADABRA/front-ONIX (byte-identical to
`MATERIALIZE_Y2_TABLE`'s 12 entries plus one trailing `0` before the sprite
freezes) — reconfirmed here on the two actual regressed fixtures (GRIMER,
DELCATTY), not just the banked scenario.

**Reconciling RAM ticks with displayed pixels.** The RAM value written
during tick `T` becomes visible in the frame captured as tick `T+1` — the
same one-tick write→display lag this codebase already documents elsewhere
(`battleMenu.ts`'s own settle-tint comment: "a blend applied during RAM tick
T is visible at render T+1"). Cross-checking YOSHI's compare-frame ↔
`playerVisualT` ↔ RAM-frame mapping across frames 635-642 confirms this
lag holds throughout the descent (e.g. compare frame 639/`playerVisualT`
1663/RAM frame 1810 shows `y2=2` in RAM, and `MATERIALIZE_Y2_TABLE[10]`
(local index for `playerVisualT` 1663) is `3` — the app's current mechanism-1
draw for that tick — matching RAM frame **1809** (`y2=3`), one tick earlier,
exactly per the lag). Applying the same lag to the regressed tick: the pixel
**displayed** at oracle frame 640 (YOSHI) reflects RAM frame 1810's `y2=2`,
and the pixel displayed at oracle frame 621 (MAGNETON) reflects RAM frame
1798's `y2=2`. **The correct rendered `y2` at both regressed frames is `2`
— `MATERIALIZE_Y2_TABLE`'s 12th and final entry — for both a GRIMER lead and
a DELCATTY lead alike: species-agnostic, exactly as `materialize-hitmarker-
gating` predicted.**

## Root cause

`drawGeneratedPlayerMaterialize`'s mechanism-1 window
(`PLAYER_MATERIALIZE_START_TICK=1653` through `PLAYER_MATERIALIZE_END_TICK=
1663`) only consumes `MATERIALIZE_Y2_TABLE`'s first 11 entries (local index
0-10, values `14..3`) — the table's 12th/last entry (index 11, value `2`)
is never drawn by mechanism 1. `PLAYER_MATERIALIZE_SETTLE_START_TICK` (1664,
`battleMenu.ts`) picks up on the VERY NEXT tick and, pre-fix,
`generatedPlayerMaterializeSettleY2` drew flat `y2=0` there for every
non-ONIX species — skipping the table's real final value entirely. This is
why the pre-entry-894 code (which applied the ONIX-only wobble table
`PLAYER_SETTLE_WOBBLE_Y2_TABLE` to every species) happened to match the
oracle at exactly this one tick: `PLAYER_SETTLE_WOBBLE_Y2_TABLE[0]` is
independently RAM-derived to be `2` (see its own `battleMenu.ts` doc
comment) — the same real value, reached by an unrelated derivation. Every
OTHER tick that table's misapplication touched belongs to ONIX's own,
genuinely per-species `BACK_ANIM_V_SHAKE` entrance (correctly gated off for
other species by entry 894) — only this one shared tail tick was
species-agnostic underneath.

## Fix

`generatedPlayerMaterializeSettleY2` (`src/engine/battleScene.ts`) now
special-cases `playerVisualT === PLAYER_MATERIALIZE_SETTLE_START_TICK`,
returning `MATERIALIZE_Y2_TABLE`'s last entry (`2`) for every species before
falling through to the existing ONIX-gated/flat logic for every later tick.
For ONIX this is a no-op (already `2` there, by the coincidence above); for
every other species it fixes exactly the one regressed tick. No change to
`PLAYER_MATERIALIZE_START_TICK`/`PLAYER_MATERIALIZE_END_TICK` (shared with
the out-of-scope canonical `drawPlayerMaterialize`/`drawPlayerSideAffineMaterialize`
path) or to `battleMenu.ts`'s `PLAYER_SETTLE_WOBBLE_Y2_TABLE`/canonical-window
hooks (both explicitly out of scope this step). Red-verified: reverting the
fix flips 3 of `tests/generatedPlayerMaterializeSettleSpecies.test.ts`'s 7
cases (which were pinning the pre-fix flat-0 behavior at this exact tick;
updated in the same commit to pin the corrected value).

## Prediction (pinned before the fresh oracle rerun)

Expect exactly `factory-arbitrary-intro-yoshi-off` **700/751** and
`factory-arbitrary-intro-magneton-off` **703/751**, with frames 640/621 now
matching and zero newly-mismatched frames elsewhere (the fix only changes
one tick's `y2` for non-ONIX species, and no other captured frame in either
trace's window sits at `playerVisualT === 1664` for a different reason).
`battle2-player-sendout-dense` (170/170) should be unaffected — it does not
touch the generated-route materialize path.
