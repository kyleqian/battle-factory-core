# prep39 — General_SubstituteFade (B_ANIM_SUBSTITUTE_FADE) as a production-ready source model

Side-lane evidence only (new files; no src change). Direct mGBA runs only, every probe twice from fresh processes and
byte-identical (JSON + per-frame RGB, `tools/integration/fixtures/prep39/probes.json`, 8 scenarios, 14 fade windows).
Checker receipts byte-identical across two passes. Reproduce with `OUT=<fresh dir> REC=<dir> sh tools/integration/prep39Run.sh`.
Measured at master `f065514fa` (production src tree `70fd1474`).

## Results first

**Verdict: READY-WITH-CHANGE.** The source model (`tools/integration/prep39FadeModel.ts`) has two checks:

- **Component check:** its RAM rows are compared with the probe (BLDCNT, BLDALPHA, BG-copy palette coefficient, OBJ x2,
  visibility, tile class, behindSubstitute). They are exact on 1,433 of 1,436 rows; the 3 others are alternate-VBlank-phase
  rows, described below.
- **Pixel check:** `tools/integration/prep39FadeCheck.ts` renders the model through the PRODUCTION compositor
  (`renderBattleResolutionSceneOffView` + `createBattleCommandFieldArtView`). **11 of 14 windows are 0 px on every row**,
  message box included. The other 3 carry one row-phase alternative each (D4 class), attributed below. Only one of them is
  visible: ONIX, 2 rows, 271 px each.

The port needs these changes:
- a new 103 / 101-row presentation unit;
- a BG-copy alpha layer in the field renderer;
- the frozen wait cursor of the dismissed message (a message-host input);
- an x2-history reset of the fading side;
- the elevated-opponent shadow kept hidden for 2 rows past the window.

The trailing slide is the existing `substituteSwapRows(side, true)` (liveSubstituteSwap.ts:39), reused verbatim.

| window (scenario @ start frame) | profile | fading -> other | rows | verdict | component | 0 px rows | px | cursor y | doll-hold fallback px |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| prep39-on-player-golem-onix @946 (accepted pair) | ON | GOLEM (p) -> ONIX | 104 | policy-exact | 104 | 104 | 0 | box cleared | 74,734 |
| prep39-on-opponent-golem-onix @946 | ON | GOLEM (o) -> ONIX | 102 | policy-exact | 102 | 102 | 0 | 1 | 77,641 |
| prep39-on-opponent-golem-onix @2368 | ON | GOLEM (o) | 102 | policy-exact | 102 | 102 | 0 | 1 | 77,641 |
| prep39-on-opponent-golem-onix @3790 | ON | GOLEM (o) | 102 | alt-phase (row 61 blendoff early, 0 px) | 101 | 102 | 0 | 1 | 77,641 |
| prep39-on-opponent-golem-onix @5212 | ON | GOLEM (o) | 102 | policy-exact | 102 | 102 | 0 | 1 | 77,641 |
| prep37-on-player-persian-slowbro @2400 (alt pair) | ON | PERSIAN (p) -> SLOWBRO | 104 | policy-exact | 104 | 104 | 0 | 1 | 83,187 |
| prep37-on-opponent-persian-slowbro @2368 | ON | PERSIAN (o) -> SLOWBRO | 102 | policy-exact | 102 | 102 | 0 | 2 | 72,436 |
| prep37-off-player-persian-slowbro @2400 | **OFF** | PERSIAN (p) -> SLOWBRO | 104 | policy-exact | 104 | 104 | 0 | 1 | 83,187 |
| prep39-on-player-persian-onix @3822 (idle-rest ONIX) | ON | PERSIAN (p) -> ONIX | 104 | alt-phase (rows 27, 45: BLDALPHA step early) | 102 | 102 | 542 | 0 | 83,187 |
| prep39-on-opponent-rattata-slowbro @2368 / @5212 / @8056 (idle-rest RATTATA subber) | ON | RATTATA (o) | 102 x3 | policy-exact x3 | 102 x3 | 102 x3 | 0 | 2 | 63,466 |
| prep37-on-opponent-golbat-slowbro @3790 (elevated) | ON | GOLBAT (o) | 102 | alt-phase (row 61 blendoff early, 0 px) | 101 | 102 | 0 | 1 | 72,555 |
| prep37-on-opponent-golbat-slowbro @8056 (elevated) | ON | GOLBAT (o) | 102 | policy-exact | 102 | 102 | 0 | 1 | 72,555 |

Further results:
- **Scene ON vs OFF:** the windows are identical (PERSIAN player: ROM window sha `4dfda72edb41b514` and per-row digest
  `714c1a38f9f1688a` in both). The source exempts the fade from HITMARKER_NO_ANIMATIONS (battle_script_commands.c:4013 /
  :4057).
- **Elevation:** the doll ignores it (BG copy at the doll corner). The returning GOLBAT is drawn at its elevated origin
  (`battleCommandFieldArtElevation`); both GOLBAT windows are 0 px.
- **Idle rest:** the subber's rest (RATTATA +1) is not shown on the doll, and the mon returns at x2 0 and stays there (8 tail
  rows, x2 = 0, not +1). The non-subbed ONIX had been zeroed by its own attacking body (production `liveBattlerX2History`:
  rest 0, matching the ROM). An opponent that still shows its idle rest cannot break the doll without attacking, so it is
  not reachable in a fade.
- **Fallback cost:** the doll-hold static fallback costs 63k–83k px per window over the field band (y < 112). The mon hold
  costs 66k–221k px. Both agree with prep37 (85,111 / 73,994 px including the tail).
- **Negative controls** all FAIL on the GOLEM and PERSIAN pairs (`fade-neg-*.json`; 0 px rows / rows):

  | control | rows at 0 px |
  | --- | --- |
  | age+1 | 57/104 |
  | alpha step every 2 rows | 63–65 |
  | no white palette blend | 55–57 |
  | OBJ tile latch 0 | 84–85 |
  | I/O lag 0 | 75–77 |

## 1. Source program and per-row model

Script `General_SubstituteFade` (data/battle_anim_scripts.s:10326):

1. `monbg ANIM_ATTACKER`
2. `AnimTask_SubstituteFadeToInvisible` (battle_anim_throw.c:2171)
3. `AnimTask_BlendBattleAnimPal F_PAL_ATTACKER, 0, 0, 16, RGB_WHITE` (battle_anim_utility_funcs.c:48 -> :169)
4. `waitforvisualfinish`; `delay 1`; `clearmonbg`; `delay 2`; `blendoff`; blend back to 0
5. `AnimTask_SwapMonSpriteToFromSubstitute TRUE`

Source facts the model relies on (measured anchors in brackets):

- **monbg** copies the attacker's sprite to a BG layer: player BG2 / palette 9 (BGCNT 5e02, offset -40, -65); opponent BG1 /
  palette 8 (offset -144, -24). The OBJ is hidden. `Task_UpdateMonBg` re-copies the OBJ's FADED palette into the BG slot
  every row, so the white blend IS visible on the BG copy, two rows late. [hardware palette 9 = OBJ faded palette of RAM
  row r-2, measured]
- **Alpha fade:** the fade task runs case 0 on row 3, writing BLDCNT `TGT1_BG2|BG1 + EFFECT_BLEND + TGT2_ALL` (0x3f44 /
  0x3f42) and BLDALPHA(16, 0). Then `data[1]++ > 1` raises k every 3rd row (rows 6, 9, ..., 51) and writes
  BLDALPHA(16-k, k). Case 2 on row 52 zero-fills the OBJ tiles (VRAM reads zero after row 53) and clears behindSubstitute
  (row 52).
- **White blend:** the coefficient is 1 after row 3 (two applications on the creation row), then +1 per row up to 16 at
  row 18.
- **Cleanup:** clearmonbg runs rows 55..58 (the OBJ is visible again, but its tiles are zero), and the BG offsets reset at
  row 59. blendoff happens on row 61 (I/O 0 from row 62).
- **Trailing slide:** the swap task starts on row 61 = swap row 0 (substituteSwapRows: x2 -5 per row to -105 / +100, load
  on swap row 21 / 20, VRAM shows the mon from swap row 23 / 22, back to 0). The first inactive row is 103 / 101.

Display rule:
- The OBJ's OAM (visibility, x2) shows the RAM row two rows earlier, as in liveSubstituteSwap.ts.
- The OBJ tile block shows the RAM row one row earlier (new here: the zero -> mon switch appears at row 85 / 84 at the OAM
  x2 of row 83 / 82; the lag0-obj negative fails).
- BLDCNT, BLDALPHA and the hardware palettes on picture a are the values read after row a, i.e. written on row a-1.

BG-copy pixels:
- colour = mGBA expansion of the source `BlendPalette(doll colour, white, c)`;
- composite = `min(255, (c8 * eva + under8 * evb) >> 4)` over the field drawn without the battler (mGBA `_mix` on
  expanded components, the same formula as battleScene.ts:3518 `blendChannel`);
- drawn under the healthbox OBJs and the BG0 message window.

Per-row display table (player; the opponent is identical except the slide is +x and ends at 101):

| display rows | fading battler's layer | eva / evb | white c | RAM facts |
| --- | --- | --- | --- | --- |
| 0-1 | idle doll (OAM latch) | — | — | row 0: monbg, OBJ invisible |
| 2-3 | BG copy, no blend | 16 / 0 | 0 | task created row 3 |
| 4-6 | BG copy | 16 / 0 | 0, 1, 2 | BLDCNT 3f44 / 3f42 |
| 7-51 | BG copy | 16-k / k, k = floor((a-4)/3) (15/1 at 7 .. 1/15 at 49-51) | min(16, a-4) (16 from row 20) | k steps on RAM rows 6, 9, ..., 51 |
| 52-84 / 52-83 | nothing (eva 0, then zero tiles, then the zero-tile slide) | — | — | bit cleared 52; tiles zero 53; clearmonbg 55-58; blendoff 61; swap from 61 |
| 85-103 / 84-101 | mon at x2 -100 .. -10 / +95 .. +10 (swap row a-63) | — | — | mon gfx + palette + y from the swap's load |
| 104-105 / 102-103 (after the window) | mon at x2 -5, 0 / +5, 0 | — | — | OAM tail drawn during the next command |

## 2. Port plan (file:line)

1. **Queue (insertion point).** `battleResolutionPresentation.ts:3370-3371` records `substituteFades {at, battler}` at the
   B_ANIM_SUBSTITUTE_FADE animation event. `:3713-3718` tags the next message (STRINGID_PKMNSUBSTITUTEFADED,
   BattleScript_SubstituteFade battle_scripts_1.s:4257) with `substituteFadeBattler`. The port emits a presentation-only
   command `{ type: "substitute-fade", battler, timing: 103 | 101 rows }` at `fade.at`, i.e. after the dismissed STRINGID
   "took damage" message (or whatever the queue last showed) and BEFORE the "faded" message. All 103 / 101 script rows
   precede that message; the 2 OAM-tail rows overlap its first two rows (draw the mon at the tail x2, as
   `substituteSwapFrameAt` does after a body).
2. **Doll flag.** `substituteDollAtCommandStart` (battleResolutionPresentationRender.ts:784-792) clears the doll when the
   message starts. Move that clear to the fade command's start; the unit draws the battler itself on every row. Keep the
   message-start clear as the fallback when the unit declines.
3. **Renderer.** Add a branch in `renderBattleResolutionLiveView` (battleScene.ts:55101; pattern: `liveSubstituteSwapView`
   at :55105) that is also reachable from `renderBattleResolutionSceneOffView` (:54502), because the fade plays in Scene
   OFF. Per row it renders one of:
   - `doll`: the ordinary view;
   - `none`: the view with `visibility[side].sprite = false`;
   - `mon`: field without the doll, origin + x2;
   - `bg-copy`: the `none` frame, plus the doll pic recoloured and alpha-composited under the healthbox and message layers.

   prep39FadeCheck.ts lines "bg-copy" show the exact loop. The check derives the cover mask by rendering with and without
   healthboxes; a port can simply draw the copy before the healthboxes and the message window.
4. **x2 history.** Add a fade event to `applyLiveBattlerX2Event` (liveBattlerX2History.ts:110) that sets the fading side to
   `zeroed` (the swap task leaves x2 = 0; measured RATTATA stays 0).
5. **Shadow.** For an elevated opponent, keep `postBodyShadowHidden` through 2 rows after the first inactive row. RAM
   shows the shadow visible from row 102, and the 2-row OAM latch puts it on screen at display row 104.

Production inputs, all present today:

| input | production source |
| --- | --- |
| species / HP / gender / names | displayed field (`BattleResolutionDisplayedField`) |
| doll pic + palette + origin, no elevation | battleCommandFieldArt.ts:73-76, :109-113 (`SUBSTITUTE_DOLL_PIC/ORIGIN`) |
| mon pic, origin, elevation | `createBattleCommandFieldArtView` battleCommandFieldArt.ts:140, `battleCommandFieldArtElevation` :161 |
| slide rows | liveSubstituteSwap.ts:39 `substituteSwapRows(side, true)` |
| other battler's rest | liveMoveAnimation.ts:584 `liveBattlerAnchors(...).frontIdleRest` over `liveBattlerX2History` |
| colour expansion | gbaPpu.ts:26 `mgbaColorFromBgr555` |
| 5-bit white blend | source BlendPalette (same arithmetic as spritePaletteHost.ts:135 `blendPalette`) |
| alpha formula | battleScene.ts:3518 `blendChannel` (module-private; export or duplicate) |

No RNG, no sprite order, no matrix, no allocator input. Timing is fixed by the program.

**Inputs production lacks.**
- **Frozen wait cursor of the dismissed button message.** The resolution renderer sets `waitCursor` only while the button
  message is the current command (battleResolutionPresentationRender.ts:1253-1262). On every fade row the ROM shows the
  cursor frozen at the phase of the dismissing press: y offsets 1 / 2 / 0 in these windows (`CURSOR_Y_OFFSETS`
  floor(age/9) % 4).
  - Derivable from the dismiss tick (`phaseElapsed` at the press); a precedent exists in battleCommandPresentation.ts:599.
  - Measured fallback without it: 37 px per row (3,855 px / 104 rows player, 3,774 / 102 opponent).
  - Not fade-specific: any command that follows a dismissed button message has the same box state.
- **The box contents before the fade belong to the queue.** In the super-effective Earthquake window (GOLEM player @946)
  the box is already cleared with no cursor. The check uses the queue state as an explicit per-window override
  (`MESSAGE_OVERRIDES`); it does not pin the fade.

## 3. D4 candidates (lag frame / VBlank phase; docs/faithful-timing.md)

- **BLDALPHA step one row early.** On these rows the I/O read after row r already holds row r's write, and the picture is
  drawn with the next step.
  - Count: 2 of 224 alpha steps (14 windows x 16), both in prep39-on-player-persian-onix @3822 (rows 27 and 45),
    271 px each (bbox 56..86 x 101..111).
  - The checker attributes them: rendering the next step from any scanline 0..101 reproduces the ROM frame exactly; above
    y 101 the two steps happen to render identically.
  - The dominant phase (this model) holds on the other 222 steps.
- **blendoff one row early** (I/O 0 on row 61): 2 of 14 windows (GOLBAT @3790, GOLEM opponent @3790). 0 px, because eva
  has been 0 since row 52 and the BG copy is gone.
- **Policy:** dominant phase (no early step, no early blendoff). The visible alternative costs 542 px in 1 of 14 windows.
  These counts are what a D4 "faithful timing" claim would cite. No other residual exists.

## 4. Not covered

- Rows after the window's first inactive row (the "faded" message rows, the 2-row OAM tail, the elevated shadow return) are
  not pixel-checked here; the facts above come from the RAM tail rows.
- A fade on the battler that is not the move target (e.g. recoil), a fade during a multi-hit chain, and Baton Pass /
  switch interactions were not reached.
- The production queue's Scene OFF presentation of the fade was not exercised end to end; only the renderer path was.

## Reproduce

```sh
OUT=$(mktemp -d) REC=$(mktemp -d) sh tools/integration/prep39Run.sh            # probes twice fresh (json + rgb cmp) + checker + 5 negatives
OUT=<same OUT> REC=$(mktemp -d) SKIP_PROBES=1 sh tools/integration/prep39Run.sh  # second checker pass; cmp the two REC dirs
python3 tools/integration/prep39Timeline.py <OUT>/<scenario>-r1.json --changes   # per-row RAM view of every fade window
```

Scripts:
- `prep39Probe.py` / `prep39Probes.sh`: probe and runner;
- `prep39FadeModel.ts`: the model;
- `prep39FadeCheck.ts`: the checker;
- `prep39ProbeDigest.py`: the compact probe receipt;
- `prep39Timeline.py`: the per-row RAM view.

New scenarios: `tools/battle-lab/prep39-*.json` (GOLEM<->ONIX via ONIX Earthquake; PERSIAN vs ONIX; RATTATA subber).
