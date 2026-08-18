# `turn5-resolve-off-c` trailing-47-frame diagnosis (ISSUES #97 remainder)

Scope: `docs/turn5-family-class3-diagnosis.md` §3e/§7 left `turn5-resolve-off-c`'s
trailing 47 mismatched frames (6763-6809, out of 149/196 matched) with two
named-but-untraced mechanisms — PIDGEOTTO's missing status box and a
background dither/striping difference during the pink send-out flash. This
doc is that instrument's own result: both mechanisms are pinned to exact RAM
ticks and exact source lines, with a concrete app-side fix shape for each.
Analysis only — `git diff -- src/` is empty throughout this session.

## 1. Method

Same replay mechanics as `docs/turn5-family-class3-diagnosis.md` §14
(direct `EmeraldOracle` + `factory-battle-scene-off.json` bootstrap +
`turn5-resolve-off-a.json`'s 76-segment script, sha256-confirmed identical
across all six `confirm`/`resolve`-off traces and `turn5-reset-off.json`)
and §9 (drive the real TS engine via `createInitialState`/`tick`, read
exported symbols directly, no `src/` edit):

- **RAM ground truth**: new script
  `tools/probe/dump-turn5-resolve-offc-tail-probe.py`, window [6720,6815],
  recording both battlers' `gBattleMons[]`, PIDGEOTTO's own
  `gHealthboxSpriteIds[1]`/`gBattlerSpriteIds[1]` sprite OAM+position+
  callback, the B_WIN_MSG text-printer struct, `gDisplayedStringBattle`,
  the decoded `gPaletteFade` control struct, and the full
  `gPlttBufferFaded`/`gPlttBufferUnfaded` (32 rows × 16 colors) every tick.
- **App series**: new script
  `tools/probe/analyze-turn5-resolve-offc-tail-app-series.ts`, window
  [6720,6815], recording `turn5PidgeottoHealthboxSlideDx(t)`,
  `turn5MaterializeCoeff(t)`, a verbatim (read-only) copy of
  `turn5BgFadeY(t)`'s inputs, and four rendered-framebuffer pixel samples
  per tick (`render(state)` from `core.ts:3538`).
- **Pixel ground truth**: `npm run compare -- turn5-resolve-off-c --summary`
  (fresh run this session) plus direct RGB reads from the saved
  `app-XXXXX.png`/`oracle-XXXXX.png`/`diff-XXXXX.png` frames it writes —
  used to cross-check the RAM-derived render-tick mapping and to resolve
  the residual mechanism (ii) timing question with pixel-exact precision
  (RAM sampling alone left an ambiguity the pixels settle directly).

All three RAM-ticks-vs-render-ticks in this doc use the SAME convention the
main diagnosis doc established (§9/§15): **render tick = RAM tick + 1**,
confirmed independently below for both mechanisms.

## 2. Repro (today, this session)

```
npm run compare -- turn5-resolve-off-c --summary
  -> 149/196 frames matched
npm run compare -- turn5-resolve-off-b --summary
  -> 88/196 frames matched
npm run compare -- turn5-reset-off --summary
  -> 256/256 frames matched
```

All three match the brief's cited baselines exactly — no drift from other
lanes' concurrent work as of this session.

## 3. Mechanism (i): PIDGEOTTO's status box — wrong anchor, not missing code

### 3a. Real RAM ground truth (`gHealthboxSpriteIds[1]`)

| RAM tick | `invisible` | `x2` | `callback` | event |
|---|---|---|---|---|
| ≤6761 | `true` | 0 | `0x08007428` (idle/dummy) | healthbox sprite exists but is hidden |
| **6762** | **`false`** | **-110** | `0x080769cc` (`SpriteCB_HealthBoxSlideIn`, same address `dump-midbattle-switch-oam.py` pinned for this ROM) | **slide-in starts** — sprite becomes visible off-screen right, full "PIDGEOTTO Lv50" content already drawn on it |
| 6763 | `false` | -110 | `0x080769cc` | held one extra tick (`initialHold`-shaped) |
| 6764-6784 | `false` | -105, -100, ..., -5 | `0x080769cc` | `+5`/tick slide, exactly `HEALTHBOX_SLIDE_STEP=5` from `HEALTHBOX_SLIDE_START_DX=-110` (`battleScene.ts:3556-3558`) |
| **6785** | **`false`** | **0** | **`0x08007428`** (idle) | **settled** — slide task hands off to the idle callback |
| 6786-6815 | `false` | 0 | `0x08007428` | held, unchanged through the probe's own end |

Render mapping (render = RAM+1, confirmed by the rest of this doc's own
cross-checks): **onset renders at capture frame 6763** — the very FIRST
frame of the mismatch window — and **settle renders at frame 6786**.

### 3b. The app's own gate (why it draws nothing)

`turn5PidgeottoHealthboxSlideDx` (`battleScene.ts:11147-11149`):

```ts
export function turn5PidgeottoHealthboxSlideDx(t: number): number | null {
  return healthboxSlideDx(t, TURN5_PIDGEOTTO_SETTLE_TICK + 1);
}
```

`TURN5_PIDGEOTTO_SETTLE_TICK = TURN5_SWITCHIN.materializeSettleTick = 6828`
(`turn5ResolutionAdapter.ts:196/342`) — this is PIDGEOTTO's own **sprite**
materialize-finish tick (a real, separately-RAM-pinned, unrelated event —
confirmed distinct below). `healthboxSlideDx` itself
(`battleScene.ts:3560-3571`):

```ts
export function healthboxSlideDx(t, startTick = HEALTHBOX_SLIDE_START_TICK, startDx = HEALTHBOX_SLIDE_START_DX, initialHold = false): number | null {
  if (t < startTick) return null;
  ...
}
```

returns `null` for every `t < startTick = 6829`. Consumed at
`battleScene.ts:14834-14835` inside `drawTurn6FieldBase` (the function
`drawTurn5RockSlideWindow` calls unconditionally for the ENTIRE mismatch
window, per the main diagnosis doc §9's own dispatch table):

```ts
const pidgeottoHealthboxDx = turn5PidgeottoHealthboxSlideDx(t);
if (pidgeottoHealthboxVisible && pidgeottoHealthboxDx !== null) drawSendOutHealthbox(fb, pidgeottoHealthboxDx, pidgeottoHealthboxContent);
```

Since `resolve-off-c`'s own capture window ends at 6809 (< 6829), the app
draws PIDGEOTTO's healthbox **nowhere** in this window — confirmed directly
by the app-series probe: `healthboxSlideDx` is `null` for every one of the
96 sampled ticks 6720-6815.

### 3c. Root cause and fix shape

The healthbox slide-in's start anchor is wired to the wrong RAM event — the
SPRITE's own materialize-finish (6828/6829), not the healthbox's OWN real
onset (6762/6763). These are two unrelated animations that happen to be
~66 RAM ticks apart in this specific switch-in.

**Fix** (`battleScene.ts:11147-11149`, one call-site change):

```ts
const TURN5_PIDGEOTTO_HEALTHBOX_SLIDE_START_TICK = 6763; // new constant

export function turn5PidgeottoHealthboxSlideDx(t: number): number | null {
  return healthboxSlideDx(t, TURN5_PIDGEOTTO_HEALTHBOX_SLIDE_START_TICK, HEALTHBOX_SLIDE_START_DX, true);
}
```

Verified bit-exact against §3a's own RAM table by hand-evaluating the
formula (`healthboxSlideDx`'s own `age = max(0, t - startTick - (initialHold ? 1 : 0))`,
`span = |startDx| / HEALTHBOX_SLIDE_STEP = 22`):
- `t=6763`: age=0 → dx=-110 (matches onset).
- `t=6764`: age=0 → dx=-110 (matches the one-tick hold at 6763-6764... RAM
  6762-6763 both -110, rendering at 6763-6764).
- `t=6765..6785`: age=1..21 → dx=-105..-5, exactly the `+5`/tick RAM ramp,
  one render tick later at each step (matches §3a row-for-row).
- `t=6786`: age=22 ≥ span → dx=0 (matches settle at render 6786 exactly).

**Do NOT touch** `TURN5_PIDGEOTTO_SETTLE_TICK` (6828) itself — it is a
separate, correctly-anchored constant for PIDGEOTTO's own sprite
materialize/stretch animation (§4 below shows the sprite's own emerge
animation reaches its idle callback far EARLIER than 6828 in RAM terms too,
6760 — but that constant gates `drawTurn5PidgeottoMaterialize`'s
switch-to-`drawTurn5PidgeottoSettled` transition, an UNRELATED, NOT
re-verified-this-session code path; out of this step's scope, flagged only
as a possible adjacent residual, not fixed or asserted broken here).

## 4. Mechanism (ii): background white-flash — mostly already correct, one small falling-edge gap

### 4a. Real source mechanism (pret pokeemerald)

`SpriteCB_ReleaseMonFromBall` (`reference/pokeemerald/src/pokeball.c:750-819`,
the real opponent-send-out ball-release callback) calls, the instant the
ball opens:

```c
sprite->data[0] = LaunchBallFadeMonTask(TRUE, sprite->sBattler, 14, ballId);
```

`LaunchBallFadeMonTask` (`battle_anim_throw.c:2033-2058`) does TWO
independent things:
1. An immediate one-shot `BlendPalette(OBJ_PLTT_ID(spritePalNum), 16, 16, gBallOpenFadeColors[ballId])` (full recolor of PIDGEOTTO's OWN sprite palette to the ball's pink/tan color), then a 16-tick `Task_FadeMon_ToNormal` fades it back — **this is the "pink send-out-flash silhouette"** the main diagnosis doc's §3e already found MATCHING (same phase, both sides) — already correctly reproduced by the app's `drawSpriteSheetAffineTintedBlend`/`turn5MaterializeCoeff` ramp. Not part of this mismatch.
2. `BeginNormalPaletteFade(selectedPalettes=14, delay=0, y:0→16, RGB_WHITE)` — **a genuine BACKGROUND-only white flash**, `selectedPalettes=14=0b1110` = BG palette rows 1, 2, 3 (bit *i* = BG row *i*; row 0 explicitly excluded). Once the sprite's own 16-tick recolor timer elapses AND the fade-in settles, `Task_FadeMon_ToBallColor`'s own follow-through (`battle_anim_throw.c:2070-2073`) fires the reverse: `BeginNormalPaletteFade(selectedPalettes, 0, 16, 0, RGB_WHITE)`, fading the SAME three rows back down.

### 4b. Real RAM ground truth (`gPaletteFade`, full per-tick trace)

| RAM tick | `active` | `y` | `targetY` | note |
|---|---|---|---|---|
| ≤6743 | 0 | 0 | 0 | idle |
| 6744 | 1 | 2 | 16 | fade-in launches (right after ball-open) |
| 6746,6748,...,6756 | 1 | 4,6,...,14 | 16 | +2/2-ticks ramp |
| 6758-6765 | 1 | 16 | 16 | peak hold (`softwareFadeFinishing=1` from 6760) |
| 6766 | 1 | 16 | 0 | second `BeginNormalPaletteFade` launches (target flips, y hasn't moved yet) |
| 6767,6769,...,6779 | 1 | 14,12,...,2 | 0 | -2/2-ticks ramp down |
| 6781-6787 | 1 | 0 | 0 | settled at 0 (`softwareFadeFinishing=1` from 6783) |
| 6788+ | 0 | 0 | 0 | fade fully inactive |

BG rows 0 and 4+ are **byte-identical at every sampled tick** (confirmed
directly from `gPlttBufferFaded`) — only rows 1,2,3 move. Rows 2 and 3 are
literal duplicates of each other at every tick (both blend together,
`selectedPalettes` bit 2 and bit 3 both set). Decoded RGB888 baseline
(t=6740, RGB555→888 expansion) matches the app's OWN extracted asset
**exactly**: `battleBg.palette[0]`/`battleBg.palette[1]`
(`src/assets/gen/battle-bg.json`) are byte-for-byte the real hardware's rows
2/3 baseline colors (`(0,0,0),(255,255,255),(189,189,156),(214,214,198),...`
— matches to within RGB555 rounding on every sampled entry).

### 4c. The app ALREADY has a matching mechanism — pixel-verified, mostly exact

Contrary to the original diagnosis's framing ("not traced to a fix shape,
secondary mechanism"), the app is **not missing this code**. It already has:

- `TURN5_BG_FADE_Y` (`battleScene.ts:10601-10603`, a 36-entry literal table)
  + `turn5BgFadeY(t) = TURN5_BG_FADE_Y[t - TURN5_BG_FADE_START_TICK] ?? 0`
  (`:10604-10609`), `TURN5_BG_FADE_START_TICK = 6746`
  (`battleSceneCanonical.ts:184`).
- Consumed at `drawTurn5RockSlideAttack`'s own first line
  (`battleScene.ts:10832-10833`): `drawStaticBgShiftedY(fb, shiftY,
  bgFadeYOverride ?? turn5BgFadeY(t), ...)`.
- `drawStaticBgShiftedY` (`battleScene.ts:15063-15076`) blends every opaque
  static-bg pixel toward white by `fadeY`/16 via `blendComponentToWhite` —
  the SAME generic idiom `blendPaletteToward` implements elsewhere in this
  file (e.g. the Mist Ball background flash, `battleScene.ts:18399`).

**Direct pixel comparison** (app-`XXXXX.png` vs oracle-`XXXXX.png` from
this session's `npm run compare -- turn5-resolve-off-c` run, sampled at a
fixed known-opaque background coordinate, back-solving each side's implied
blend coefficient from a shared pre-flash baseline color):

| render tick | app | oracle | match? |
|---|---|---|---|
| 6744-6767 (rise + peak-hold) | tracks 0→16 in lockstep | tracks 0→16 in lockstep | **PIXEL-EXACT, every tick** |
| **6768** | already stepped down (~coeff 12ish) | still at peak (255,255,255, coeff 16) | **app one tick early** |
| 6769-6771 | matches | matches | exact |
| **6772** | already stepped down again | still holding | **app one tick early** |
| 6773-6775 | matches | matches | exact |
| **6776** | already stepped down | still holding | **app one tick early** |
| 6777 | matches | matches | exact |
| **6778,6780** | already stepped down | still holding | **app one tick early** (weaker, ~1 channel) |
| 6779,6781+ | matches | matches | exact |

**The rising edge and the peak hold are pixel-perfect — zero drift.** The
ONLY residual is on the **falling edge** (render 6768-6781): at each new
step boundary, the app decrements ONE TICK TOO EARLY relative to the
oracle, which holds the higher value one tick longer before the app and
oracle re-converge for the next few ticks — a small, periodic,
one-tick-early bug confined to the fade-OUT half only, not a "different
pattern," not affecting the fade-in, peak, or settled tail. This directly
answers the brief's distinguishing question: **it is a phase/lag issue
(one tick, localized to the falling half), not a structurally different
blend pattern** — mechanism (ii)'s "striping" appearance in the diff tool's
visualization is the terrain texture's own natural per-pixel brightness
variation crossing the diff threshold unevenly under this small, uniform
one-step coefficient error — not evidence of a missing/wrong blend target.

### 4d. Fix shape

`TURN5_BG_FADE_Y`'s falling-edge segment (`battleScene.ts:10602`, the
`14, 14, 12, 12, ..., 2, 2` tail starting at index 22) is anchored one
index too early relative to the peak. Minimal fix: insert one more `16`
before the fall (extending the peak hold from 8 entries to 9), shifting
every falling-edge value one render tick later:

```ts
const TURN5_BG_FADE_Y: readonly number[] = [
  2, 2, 4, 4, 6, 6, 8, 8, 10, 10, 12, 12, 14, 14, 16, 16, 16, 16, 16, 16, 16, 16, 16,
  14, 14, 12, 12, 10, 10, 8, 8, 6, 6, 4, 4, 2, 2,
];
```

(37 entries instead of 36; `turn5BgFadeY`'s own `?? 0` fallback already
handles the table running out one tick later, no other call-site change
needed.) **Re-verify against §4c's own pixel table after editing** — this
session's own PNG-derived coefficient readings are the ground truth to
match, not a re-derivation from RAM (the RAM `y` value's own render-tick
offset for this specific hardware sub-system was NOT cleanly pinned this
session — see §4e).

### 4e. One open caveat (flagged, not resolved)

This session's RAM `gPaletteFade.y` reads (§4b) do **not** cleanly line up
with the pixel-derived ground truth (§4c) under either a uniform `+1` or
uniform `+2` RAM-to-render offset — testing both hypotheses against the
full 96-tick series leaves 7-8 residual mismatches either way (shown by
directly re-mapping the RAM series both ways, not reproduced here for
brevity — see the two probe scripts' own JSON output to redo this check).
The PIXEL-level comparison (§4c) is authoritative and does not depend on
resolving this offset ambiguity — it reads real rendered colors directly.
**Next instrument if the §4d fix doesn't land clean on the first try**: redo
§4c's pixel-coefficient extraction at 2-3 more background coordinates
(different base colors) to confirm the "one-tick-early-on-the-fall-only"
finding isn't an artifact of 8-bit rounding aliasing at this one sample
point (flagged in-line in §4c already; the qualitative direction — rise
exact, fall one-early — was confirmed at this coordinate only this
session).

## 5. What explains the observed 45.45% spike at frame 6768

Frame 6768's own `npm run compare` bbox (`0,1-239,111`, 17452px/45.45%,
the single largest diff in the window) is the union of BOTH mechanisms,
not one alone:
- **Mechanism (i) is the dominant, constant-through-the-window
  contributor**: the ENTIRE PIDGEOTTO healthbox region (never drawn by the
  app, anywhere in 6763-6809) is part of every one of the 47 mismatched
  frames' own diff, confirmed visually (`oracle-06768.png` shows the
  status box partway slid in; `app-06768.png` shows nothing there — see
  the two saved PNGs from this session's `npm run compare` run,
  `tools/compare/out/run-2026-08-18-17-44-05Z-87401/`).
- **Mechanism (ii)'s falling-edge residual is a small, localized
  contributor**, active only at renders 6768, 6772, 6776, 6780 (and
  weakly 6778) — each a brief one-step coefficient mismatch spanning the
  WHOLE terrain-textured background, which is why it registers as a
  screen-wide "striping" in the diff tool's own thresholded visualization
  even though the underlying per-pixel error is small.

Neither mechanism alone explains all 47 frames or the single-frame spike
shape; together they do.

## 6. Predicted counts after both fixes (estimates, not rerun-verified)

- `turn5-resolve-off-c` (196 total, 149/196 today): §3c's fix alone is
  predicted to close the LARGE majority of the 47 mismatched frames (it is
  present in every one of them). §4d's fix additionally closes the ~4-5
  falling-edge ticks matching depends on byte-exact framebuffer equality
  (`sha256` over raw RGB888, `AGENTS.md`), so even the small mechanism-(ii)
  residual would keep frames 6768/6772/6776/6780(/6778) unmatched if §3c
  is applied alone. **Both fixes together are predicted to reach 196/196**;
  §3c alone is predicted to land in the low-to-mid 190s.
- `turn5-resolve-off-b` (196 total, 88/196 today): window is 6418-6613,
  entirely before this doc's 6762+ anchors — **predicted unchanged**.
- `turn5-reset-off` (256/256 today): unrelated control scenario —
  **predicted unchanged**.

## 7. Rerunnable PASS/FAIL for the fix worker

1. **Rerun the RAM probe** (should be byte-identical to this doc's own
   numbers, sanity-checks the ROM/bootstrap haven't drifted):
   ```
   python3 tools/run-mgba-probe.py artifacts/turn5-resolve-offc-tail-probe.json -- \
     tools/probe/dump-turn5-resolve-offc-tail-probe.py artifacts/turn5-resolve-offc-tail-probe.json
   ```
2. **Apply §3c's fix** (`turn5PidgeottoHealthboxSlideDx`,
   `battleScene.ts:11147-11149`). Rerun the app-series probe:
   ```
   node --experimental-strip-types tools/probe/analyze-turn5-resolve-offc-tail-app-series.ts
   ```
   PASS if `healthboxSlideDx` is non-null starting exactly at tick 6763 and
   reaches 0 exactly at tick 6786 (§3c's own hand-verified table).
3. **Apply §4d's fix** (`TURN5_BG_FADE_Y`, `battleScene.ts:10602`). Re-run
   the pixel comparison this doc's §4c used (fixed background coordinate,
   e.g. `(20,2)`, across renders 6744-6789) and confirm the falling-edge
   mismatches at 6768/6772/6776/6780 are gone.
4. **`npm run compare -- turn5-resolve-off-c --summary`**: PASS if 196/196
   (both fixes) or a count strictly higher than 149/196 with only isolated
   frames near 6768/6772/6776/6780 remaining (§3c fix only, §4d not yet
   applied).
5. **Regression guard** — rerun all three and confirm no regressions:
   ```
   npm run compare -- turn5-resolve-off-c --summary   # expect >= 149/196, target 196/196
   npm run compare -- turn5-resolve-off-b --summary   # expect unchanged 88/196
   npm run compare -- turn5-reset-off --summary       # expect unchanged 256/256
   ```

## 8. Probe scripts (committed, rerunnable)

- `tools/probe/dump-turn5-resolve-offc-tail-probe.py` — RAM ground truth,
  window [6720,6815] (override via two extra argv ticks). Run via
  `python3 tools/run-mgba-probe.py <out.json> -- tools/probe/dump-turn5-resolve-offc-tail-probe.py <out.json> [start end]`.
- `tools/probe/analyze-turn5-resolve-offc-tail-app-series.ts` — app-side
  series (healthbox slide gate, materialize coeff, bg-fade-Y, four
  background pixel samples), same window. Run via
  `node --experimental-strip-types tools/probe/analyze-turn5-resolve-offc-tail-app-series.ts`.

Both write gitignored JSON under `artifacts/` — this doc's own tables are
the receipt.

## 9. Verdict

Both mechanisms named in the brief are pinned:

- **Mechanism (i) (PIDGEOTTO's status box) is FULLY pinned and has a clean,
  bit-exact-verified one-line fix**: `turn5PidgeottoHealthboxSlideDx`
  (`battleScene.ts:11147-11149`) is anchored to the wrong RAM event (the
  SPRITE's own settle tick, 6829, instead of the healthbox's own real
  onset, 6763) — not missing code, a wrong anchor. New constant
  `TURN5_PIDGEOTTO_HEALTHBOX_SLIDE_START_TICK = 6763` plus
  `initialHold = true` reproduces the RAM ground truth exactly (onset,
  hold, 23-step slide, and settle all verified by hand against §3a's own
  table).
- **Mechanism (ii) (background dither/striping) is FULLY pinned as a
  source mechanism and MOSTLY already correctly implemented** —
  contrary to the original diagnosis's "not traced to a fix shape"
  framing, the app already has a matching `TURN5_BG_FADE_Y`/
  `turn5BgFadeY`/`drawStaticBgShiftedY` mechanism that is PIXEL-PERFECT
  for the rising edge and peak hold. The only residual is a small,
  one-tick-early stepping bug confined to the falling edge (renders
  6768/6772/6776/6780), fixed by inserting one more hold-`16` entry into
  `TURN5_BG_FADE_Y` (`battleScene.ts:10602`). §4e flags one open
  caveat (the RAM-to-render offset for this hardware sub-system wasn't
  cleanly resolved) but does not block the fix — the fix itself is
  verified against pixel ground truth, not the ambiguous RAM offset.

Both fixes are additive, narrow, and independently testable per §7's own
PASS/FAIL block. No `src/` edit was made this session (`git diff -- src/`
empty throughout).

## 10. Landed (2026-08-18, bounded MAIN worker, ISSUES #97 remainder)

Both fixes landed exactly as specified in §3c/§4d, with one shape change
to §4d's fix (below) discovered while guarding against regressions.

**§3c landed verbatim**: new constant
`TURN5_PIDGEOTTO_HEALTHBOX_SLIDE_START_TICK = 6763`,
`turn5PidgeottoHealthboxSlideDx` re-anchored with `initialHold = true`.
Re-ran the app-series probe (§7 step 2): `healthboxSlideDx` is non-null
starting exactly at tick 6763 and reaches 0 exactly at tick 6786, matching
§3a's own table bit-for-bit.

**§4d landed with a shape change**: the doc's literal suggestion (edit
`TURN5_BG_FADE_Y` in place, 36 -> 37 entries) was tried first and
regressed `turn13-switchin` 242/242 -> 234/242. That table is shared
verbatim by two other consumers this doc's own method never checked:
`turn13MurkrowBgFadeY` (turn 13's own Murkrow switch-in, own anchor) and
`turn15ReleaseFieldPalette` (a forced-switch MAGBY release, via
`cleanSwitchinBgFadeY`). Oracle data confirms Murkrow's own window
genuinely needs the original 8-entry peak hold while Pidgeotto's turn-5
window needs 9 — not the same curve after all, despite both being
`BeginNormalPaletteFade`-driven. Landed instead as a new, separate
`TURN5_PIDGEOTTO_BG_FADE_Y` table (37 entries, the same insert §4d
specified) consumed only by `turn5BgFadeY`; `TURN5_BG_FADE_Y` itself is
untouched, restoring `turn13-switchin` to 242/242. `turn5BgFadeY` was
exported (previously module-private) so both the Tier-1 pin and the
app-series probe (`tools/probe/analyze-turn5-resolve-offc-tail-app-series.ts`,
re-pointed at the live export instead of its own frozen pre-fix copy) can
exercise the real function. Re-ran the app-series probe (§7 step 3): the
falling-edge mismatches at 6768/6772/6776/6780 are gone (peak hold now
extends through 6768, first fall step lands at 6769).

**§7 step 1** (RAM-probe sanity rerun): re-ran
`dump-turn5-resolve-offc-tail-probe.py` over the same window. Byte-
identical to this doc's own §3a/§4b tables at every spot-checked tick
(healthbox onset/hold/settle at 6762/6763/6785; palette fade launch/peak/
second-launch/settle at 6744/6758-6759/6766/6781) — no ROM/bootstrap
drift.

**§7 step 4/5** (`npm run compare -- turn5-resolve-off-c --summary` plus
the regression guard): **149/196, unchanged from before either fix** —
NOT this doc's own §6 prediction of 196/196. Every one of the same 47
frames (6763-6809) still mismatches, but with per-pixel diff magnitude
collapsed from up to 17452px/45.45% to a flat ~1100-1600px/~3% throughout
— both §3c and §4d's own contributions are confirmed gone from the diff
(direct pixel sampling shows the healthbox region and the isolated
6768/6772/6776/6780 spike are both clean now). The remaining, dominant
contributor is a **third mechanism this doc's own §3c flagged but did not
verify**: `drawTurn5PidgeottoMaterialize`'s settled-transition path never
hands off to `drawTurn5PidgeottoSettled` before `TURN5_PIDGEOTTO_SETTLE_
TICK` (6828), while §3c's own aside already noted the real sprite's own
idle callback fires by RAM tick 6760 — i.e. the real hardware has already
settled for this entire 6763-6809 window, while the app is still drawing
the affine-emerge (t<6786) or affine-stretch-table (t>=6786, clamped at
its last entry) "materializing" variant throughout. Confirmed structurally
(not a tint/color issue) by direct RGB sampling of the diff PNGs at
PIDGEOTTO's own sprite region (e.g. frame 6809, screen coordinate
(173,28): app reads sprite-silhouette brown where the oracle reads
background white; (185,31)/(173,34): different silhouette colors
entirely) — a shape mismatch, not a lingering blend coefficient. This is
exactly the item the brief marked OUT OF SCOPE (`TURN5_PIDGEOTTO_SETTLE_
TICK` and `drawTurn5PidgeottoMaterialize`'s settled-transition path) and
is recorded here, not fixed.

Full guard family, zero decreases: `turn5-reset-off` 256/256,
`turn5-action-off` 32/32, `turn6-reopen-off` 46/46, `turn6-menu-off.json`
fixture 47/47, `turn5-confirm-off-a` 60/132, `turn5-confirm-off-b` 0/132
(689px/1.79% residual unchanged), `turn5-resolve-off-a` 25/196,
`turn5-resolve-off-b` 88/196, `turn4-doubleteam-off`/`turn4-rockslide-off`
256/256 each, `turn13-switchin` 242/242 (after the table-sharing fix
above). One expected, fully-explained increase: `turn5-resolve-off-d`
0/196 -> **24/196** (the healthbox fix's own settle behavior also reaches
this trace's own early frames, 6810-6828, which were previously
mismatching for the exact same reason as `resolve-off-c`; its own
out-of-scope 258px/0.67% residual past tick 7004 is byte-identical before
and after).

`npm test` 1067 files / 10049 passed / 223 skipped; `npm run build` green.
Two Tier-1 pins added in `tests/battleScene.test.ts` for both re-anchored
formulas. Full writeup and per-trace numbers: `ISSUES.md` #97 sub-entry F.
