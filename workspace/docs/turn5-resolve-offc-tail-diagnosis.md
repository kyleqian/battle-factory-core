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

## 11. Mechanism (iii) instrument (2026-08-18, bounded SIDE worker, ISSUES #97
remainder): the PIDGEOTTO materialize->settled transition anchor

Scope per this step's brief: pin the real materialize->settled visual
timeline for PIDGEOTTO's own SPRITE (not the healthbox, already fully
covered by §3/§10's landed fix) across render ticks ~6740-6830, and name
the exact fix shape for `drawTurn5PidgeottoMaterialize`/
`TURN5_PIDGEOTTO_SETTLE_TICK`/`TURN5_STRETCH_TABLE` - the item §3c's own
aside flagged out of scope at the time ("the real sprite's own emerge
animation reaches its idle callback far EARLIER than 6828 in RAM terms
too, 6760 - but... an UNRELATED, NOT re-verified-this-session code path"),
and §10's landed-fix session confirmed is now the dominant remaining
contributor to all 47 mismatched frames after both `turn5-resolve-off-c`
fixes above already landed (149/196 unchanged, ~3% flat residual). This
session's method: same direct-`EmeraldOracle`/`factory-battle-scene-off.json`
replay driver as §1, new probe `tools/probe/dump-turn5-pidgeotto-
materialize-settle-probe.py` (window [6735,6835]), plus a fresh
`npm run compare -- turn5-resolve-off-c --summary` run and direct RGB
sampling of its saved PNGs.

### 11a. Real RAM ground truth (`gBattlerSpriteIds[1]`, PIDGEOTTO's own mon sprite)

| RAM tick | render | event |
|---|---|---|
| <=6743 | <=6744 | sprite invisible, idle (leftover state, doesn't matter - hidden) |
| **6744** | **6745** | callback -> `SpriteCB_OpponentMonFromBall` (0x08039B58, the same address `dump-midbattle-switch-oam.py` already pinned for this ROM), affine matrix `a=d=1638` (tiny apparent silhouette inside a NORMAL, non-doubled affine box - `affineMode=1` the entire session, never `3`/double) |
| 6745 | **6746** | `invisible` clears - first visible tick, EXACTLY `TURN5_BALL_HANDOFF_TICK(6727) + MATERIALIZE_START_OFFSET(19) = 6746`, the app's own `materializeStart` - matches |
| 6745-6755 | 6746-6756 | `a=d` ramps 1129 -> 275 (monotonic shrink-in), `y2` descends 14 -> 3 |
| **6756** | **6757** | `a=d=256` (full/normal scale) reached, `y2=2` (one tick behind) |
| **6757** | **6758** | `y2=0` - BOTH scale and y-offset now at their final rest values; the affine-anim task's own internal step cursor also reports done here (`sAffineAnimStates[matrixNum].animCmdIndex` flips 1->0) |
| 6758-6759 | 6759-6760 | held: `a=d=256`, `y2=0`, callback still `SpriteCB_OpponentMonFromBall` (administrative delay before the formal hand-off) |
| **6760** | **6761** | callback -> `SpriteCallbackDummy` (0x08007428, the idle sentinel `dump-onix-front-idle-anim.py` also uses) - **the real, formal materialize-finished event** |
| 6761-6835 (probe end) | 6762-6836 | **100% unchanged**: `a=d=256`, `y2=0`, `x2=0`, `callback=SpriteCallbackDummy`, every single sampled tick, 75 consecutive ticks with zero further change of any kind - no wobble, no bounce, no idle animation, dead static |

Healthbox cross-check (same probe, `gHealthboxSpriteIds[1]`): slide-in
callback `SpriteCB_HealthBoxSlideIn` from RAM 6762, idle `SpriteCallbackDummy`
from RAM 6785 - byte-identical to §3a's own already-landed table. **Nothing
new or uncovered** in the healthbox for this span; the 6763 slide re-anchor
already covers 100% of the healthbox's own real behavior here.

### 11b. Direct contradiction of the SETTLE_TICK doc comment - flagged, not fixed

`turn5ResolutionAdapter.ts:308-313` (`Turn5SwitchInAdapter.materializeSettleTick`'s
own doc comment, feeding `PIDGEOTTO_MATERIALIZE_SETTLE_TICK = 6828` at
`turn5ResolutionAdapter.ts:196`, in turn `TURN5_PIDGEOTTO_SETTLE_TICK` at
`battleScene.ts:11114`) claims:

> Pidgeotto's own switch-in materialize settle -- RAM tick 6827's idle
> callback flip, visible render 6828

**This session's own direct RAM probe (§11a) contradicts this claim
outright**: the real idle-callback flip is RAM tick **6760**, not 6827 -
sixty-seven ticks earlier. Every one of the 75 sampled ticks from RAM 6761
through 6835 (spanning RAM 6827/6828 explicitly) shows the sprite ALREADY
idle, unchanged, with zero event of any kind at 6827/6828. Per this step's
brief ("record any contradiction, change nothing" - scoped there to the two
landed fixes, but the same discipline applies here since this is analysis-
only): this doc comment's specific factual claim is wrong and should be
corrected by whichever session next touches `turn5ResolutionAdapter.ts`,
but no `src/` edit was made this session.

### 11c. Pixel cross-check: the failure boundary is exactly `TURN5_STRETCH_TICK` (6786), not a wobble-curve-value issue

Fresh `npm run compare -- turn5-resolve-off-c --summary` this session
(149/196, unchanged - `tools/compare/out/run-2026-08-18-18-55-13Z-53562`):
diff magnitude across the window is NOT flat, as this doc's own §10 landed
addendum characterized it - it has a sharp, structural shape:

| render range | diff | note |
|---|---|---|
| 6763-6765 | 185-213px (~0.5%) | small, see §11e |
| 6766-6775 | 596-1571px (1.5-4.1%) | growing, see §11e |
| 6776-6783 | 1109-1198px (2.9-3.1%) | still elevated, see §11e |
| **6784** | **30px (0.08%)** | near-perfect |
| **6785** | **14px (0.04%)** | near-perfect |
| **6786** | **1185px (3.09%)** | **jumps back up, exactly at `TURN5_STRETCH_TICK`** |
| 6787-6809 | 1112-1402px (2.9-3.65%) | stays elevated through the capture window's own end |

Direct RGB sampling of the saved `app-XXXXX.png`/`oracle-XXXXX.png` pairs
(same run) at coordinates inside PIDGEOTTO's own sprite silhouette
(outside the tiny 6784/6785 particle-tail residual's own footprint,
x=127-145/y=23-61 - see §11e):

- **t=6784, 6785**: app and oracle agree EXACTLY at every sampled sprite
  pixel, e.g. `(160,45)`: both `(123,90,74)`; `(175,30)`: both `(90,57,41)`;
  `(190,50)`: both `(33,33,33)`.
- **t=6786 onward (every tick sampled through 6809)**: the ORACLE stays
  LITERALLY CONSTANT at those same coordinates - `(175,30)` reads
  `(90,57,41)` and `(190,50)` reads `(33,33,33)` at EVERY tick 6786, 6790,
  6800, 6809 alike, confirming §11a's RAM finding pixel-for-pixel (the real
  sprite is static). The APP's own colors at those SAME coordinates instead
  change tick to tick - `(175,30)`: `(214,49,24)` at 6786, still `(214,49,24)`
  at 6790, `(239,99,66)` at 6800, `(239,99,66)` at 6809; `(190,50)`:
  `(90,57,41)` at 6786, `(33,33,33)` at 6790 - direct visual proof the app
  is deforming a sprite the real game renders motionless.

The failure boundary is EXACTLY `TURN5_STRETCH_TICK = 6786`
(`battleSceneCanonical.ts:244`) - not a gradual drift, not a
curve-shape-only issue. This pins the mechanism precisely: whatever
`drawTurn5PidgeottoMaterialize` renders for `t < TURN5_STRETCH_TICK` is
(modulo §11e's separate, smaller residual) ALREADY CORRECT by the time it
reaches steady state; the bug is entirely in what happens from
`TURN5_STRETCH_TICK` onward.

### 11d. Named mechanism and fix shape

**`TURN5_STRETCH_TABLE`** (`battleSceneCanonical.ts:246-288`, 41 entries,
consumed at `battleScene.ts:11198-11199` inside `drawTurn5PidgeottoMaterialize`)
encodes a "settle wobble/bounce" - `xScale`/`yScale` swinging as far as
209-272 (up to ~18% asymmetric x/y distortion) before returning to
`{256,256,0}` at its own last entry (render 6826) - **with zero RAM basis
in this trace**: §11a's own per-tick table shows the real affine matrix is
flat at `a=d=256,y2=0` for the ENTIRE span from RAM 6756 (render 6757)
onward, thirty render ticks BEFORE `TURN5_STRETCH_TICK` even begins, and
stays flat another eighty-plus ticks past where the table ends. There is no
wobble to reproduce here, in this profile, for this switch-in. (Whether the
table was derived from a different trace/profile/species entirely, or is a
hand-authored placeholder, is undetermined and out of this session's remit
- it is simply wrong for this call site.)

A second, independent tell confirms it's a code-path/dispatch bug, not
just wrong curve values: even `TURN5_STRETCH_TABLE`'s own FIRST entry
(index 0, render 6786) is `{256,256,0}` - textually identical to "no
distortion" - yet render 6786 already shows the full ~1185px jump (§11c).
That's because the stretch branch calls a DIFFERENT drawing primitive
(`drawSpriteSheetAffineStretch`, `battleScene.ts:6014-6063`) than the
branch before it (`drawSpriteSheetAffineTintedBlend`, used for
`t < TURN5_STRETCH_TICK`), **with `doubled=true`**
(`battleScene.ts:11199`, the 11th positional arg) - GBA double-size affine
OAM semantics. §11a's own RAM table shows `affineMode` is `1` (normal,
non-doubled) at every single sampled tick, never `3` (double) - the real
hardware never uses double-size mode for this sprite. The bug is the
FUNCTION SWITCH itself at `TURN5_STRETCH_TICK`, independent of whether the
table's own values happen to be near-identity at any given tick.

**Fix** (`drawTurn5PidgeottoMaterialize`, `battleScene.ts:11185-11200`):
delete the `if (t < TURN5_STRETCH_TICK) { ... return; }` split and its
`TURN5_STRETCH_TABLE`-driven `else` branch entirely; let the tinted-blend
formula (currently the `if` body) run unconditionally for the whole
materialize window (`materializeStart` through the eventual settle
hand-off). This is safe and suffices on its own, with no new table needed,
because every one of that formula's own inputs already saturates/degenerates
to the exact RAM-confirmed steady state for large `t`:
- `turn5MaterializeCoeff(t)` (`battleScene.ts:11108-11111`): `??` falls
  back to `0` once `t` runs past `TURN5_MATERIALIZE_RAMP_COEFF`'s own last
  entry - no more tint.
- `affineEmergeAccumulator(local + 1)` (`battleScene.ts:5422-5436`):
  `Math.min(neutralScale, acc)` already clamps to `neutralScale` (full
  scale, `256`) for any `logicalOffset` past the extracted table's own
  total duration - no more shrink.
- `MATERIALIZE_Y2_TABLE[local] ?? 0` (`battleScene.ts:5492`, consumed at
  `:11193`): `??` falls back to `0` once `local` exceeds the table's own
  12 entries - no more y-offset.

`TURN5_PIDGEOTTO_SETTLE_TICK` itself (`battleScene.ts:11114`) does not need
to move: once the fix above lands, the tinted-blend formula's own
degenerate/steady state is ALREADY pixel-identical to what
`drawTurn5PidgeottoSettled` draws (verified: PIDGEOTTO has no
`speciesFrontIdleRestOffset` entry in `src/animation/speciesIdleAnim.ts`,
so `drawTurn5PidgeottoSettled`'s own `idle` var is `{x2:0,y2:0}` -
literally the same degenerate anchor the materialize formula converges to)
- so the hand-off from one to the other becomes a no-op at the pixel level,
wherever it happens to fire. Only §11b's doc-comment inaccuracy is a loose
end, not a functional one.

### 11e. Separate, smaller residual flagged but NOT diagnosed this session (out of assigned scope)

Renders 6763-6783 (§11c's table) carry a DIFFERENT, smaller-magnitude
residual this session did not chase to a fix shape (the brief's own scope
was specifically the settle/stretch transition). Two components, both
outside PIDGEOTTO's own sprite silhouette or of much smaller per-pixel
magnitude:

- A tiny (14-30px) residual confined to `x=127-145,y=23-61` at renders
  6784/6785 specifically (colors involving `(255,173,0)`, consistent with
  `drawTurn5SwitchinParticles`' own particle sprites, not the mon sprite) -
  most likely a stray 1px particle-position mistiming near the tail end of
  the switch-in's particle burst. This coordinate range shows ZERO diff at
  every sampled tick from 6786 onward in this session's own trace, so it
  does not affect §11d's predicted counts below.
- A larger (600-1571px) residual at renders 6766-6783, confined to the
  sprite's own silhouette. Direct RGB sampling at renders 6768/6772/6776/
  6780 (inside the silhouette, away from the particle footprint above)
  shows small PER-CHANNEL deltas (e.g. 6776: `(255,206,156)` vs
  `(255,206,165)`, an 9-unit blue delta; 6780: `(231,181,99)` vs
  `(231,181,115)`, a 16-unit blue delta) - the SAME "one-tick-early
  falling edge" shape §4c/§4d already diagnosed and fixed for
  `TURN5_BG_FADE_Y`, but here on the SPRITE's own tint ramp
  (`TURN5_MATERIALIZE_RAMP_COEFF`, `battleScene.ts:11107`) instead of the
  background. Plausible FOURTH mechanism, evidenced but not fixed here -
  flagged for a future instrument, same shape as §4e's own open caveat.

### 11f. Predicted counts (estimates, not rerun-verified - no `src/` edit was made this session)

- **Renders 6786-6809 (24 of the 47 mismatched frames)**: predicted to
  become EXACT (0px) matches once §11d's fix lands - directly supported by
  this session's own per-pixel sampling showing the SAME formula already
  produces byte-identical sprite pixels at 6784/6785, and the one
  known-different contributor at those two ticks (the particle-tail
  residual) is independently confirmed absent at every tick 6786+.
- **Renders 6763-6783 (the remaining 23 of the 47)**: predicted UNCHANGED
  by §11d's fix alone - §11e's own separate residual is untouched by this
  fix shape.
- **`turn5-resolve-off-c` (196 total, 149/196 today)**: predicted
  **173/196** after §11d's fix alone (149 + 24). Reaching 196/196
  additionally needs §11e's flagged fourth mechanism resolved.
- **`turn5-resolve-off-b`** (196 total, 88/196 today, window 6418-6613,
  entirely before this section's 6744+ anchors) and **`turn5-reset-off`**
  (256/256, unrelated control scenario): both **predicted unchanged**.
- **`turn5-resolve-off-d`** (196 total, 24/196 today, per §10's own landed
  addendum its own early frames 6810-6828 already benefit from the landed
  healthbox fix): this section's own fix touches PIDGEOTTO's sprite
  rendering in the SAME `t < TURN5_PIDGEOTTO_SETTLE_TICK(6828)` window
  `drawTurn5SwitchinSprite` (`battleScene.ts:11274-11280`) reuses for every
  later turn's own redraw of the settled scene, so `turn5-resolve-off-d`'s
  own capture window should be checked as part of the regression guard
  below - not confidently predicted unchanged given this fix's broader
  reach through the shared draw path, unlike §10's landed healthbox fix
  which was healthbox-local.

### 11g. Rerunnable PASS/FAIL for the fix worker

1. **Rerun the RAM probe** (should be byte-identical to §11a's own table):
   ```
   python3 tools/run-mgba-probe.py artifacts/turn5-pidgeotto-materialize-settle-probe.json -- \
     tools/probe/dump-turn5-pidgeotto-materialize-settle-probe.py artifacts/turn5-pidgeotto-materialize-settle-probe.json
   ```
   PASS if the mon sprite's callback is `SpriteCB_OpponentMonFromBall` for
   RAM ticks 6744-6759, flips to `SpriteCallbackDummy` at exactly RAM 6760,
   and the affine matrix is `a=d=256,y2=0` for every tick from RAM 6756
   through the probe's own end (6835) with zero further change.
2. **Apply §11d's fix** (`drawTurn5PidgeottoMaterialize`,
   `battleScene.ts:11185-11200`: drop the `TURN5_STRETCH_TICK` split, run
   the tinted-blend branch unconditionally). Direct pixel-sample renders
   6786-6809 at PIDGEOTTO's own silhouette coordinates (e.g. `(175,30)`,
   `(190,50)`) against the oracle's own saved PNGs from a fresh
   `npm run compare -- turn5-resolve-off-c` run - PASS if every one of
   those ticks now reads the SAME static color the oracle already holds
   constant at (this doc's own §11c table has the exact values).
3. **`npm run compare -- turn5-resolve-off-c --summary`**: PASS if
   **173/196 or higher**, with any remaining mismatches confined to
   6763-6783 (§11e's flagged, still-open residual) - NOT 6786-6809.
4. **Regression guard** - rerun all four and confirm no decreases:
   ```
   npm run compare -- turn5-resolve-off-c --summary   # expect >= 173/196, was 149/196
   npm run compare -- turn5-resolve-off-b --summary   # expect unchanged 88/196
   npm run compare -- turn5-resolve-off-d --summary   # expect >= 24/196 (see §11f - reused draw path)
   npm run compare -- turn5-reset-off --summary       # expect unchanged 256/256
   ```

### 11h. Probe script (committed, rerunnable)

- `tools/probe/dump-turn5-pidgeotto-materialize-settle-probe.py` - RAM
  ground truth for PIDGEOTTO's own mon sprite (OAM, callback resolved
  against named addresses, affine matrix + affine-anim state when
  `affineMode != 0`, `data[]`) plus the healthbox cross-check, window
  [6735,6835] (override via two extra argv ticks). Run via
  `python3 tools/run-mgba-probe.py <out.json> -- tools/probe/dump-turn5-pidgeotto-materialize-settle-probe.py <out.json> [start end]`.

Writes gitignored JSON under `artifacts/` - this doc's own tables are the
receipt. No `src/` edit was made this session (`git diff -- src/` empty
throughout).

### 11i. Verdict

The THIRD `turn5-resolve-off-c` mechanism (PIDGEOTTO's own SPRITE
materialize->settled hand-off) is FULLY pinned: the real sprite finishes
its grow-in and formally goes idle by RAM tick 6760 (render 6761) and is
then 100% static for at least 75 more ticks (through render 6836,
spanning the app's own 6828 boundary with zero RAM event there -
contradicting `turn5ResolutionAdapter.ts:308-313`'s own doc comment,
§11b). `TURN5_STRETCH_TABLE`'s wobble (`battleSceneCanonical.ts:246-288`)
has no RAM basis in this trace and is compounded by a `doubled=true`
double-size-affine call (`battleScene.ts:11199`) the real hardware never
uses here either. Fix: drop `drawTurn5PidgeottoMaterialize`'s
`TURN5_STRETCH_TICK` branch split entirely (§11d) - predicted to land
`turn5-resolve-off-c` at 173/196 (up from 149/196), closing renders
6786-6809 exactly. A separate, smaller residual at renders 6763-6783
(§11e) is evidenced but not fixed here, flagged as a probable fourth
mechanism (`TURN5_MATERIALIZE_RAMP_COEFF`'s own falling edge) for a future
instrument.

## 12. Landed (2026-08-18, bounded MAIN worker, ISSUES #97 remainder)

§11d's fix landed exactly as specified — `drawTurn5PidgeottoMaterialize`'s
`TURN5_STRETCH_TICK` branch split dropped entirely, the tinted-blend
formula now runs unconditionally for the whole materialize window. First
rerun of `npm run compare -- turn5-resolve-off-c --summary` after landing
**only** that change: **149/196, unchanged** — NOT §11f's own predicted
173/196. Per this step's own mandatory "attribute before accepting" rule
(the brief anticipated a possible miss), direct RGB sampling of the same
two coordinates §11c used (`(175,30)`/`(190,50)`) on the fresh compare
run's saved PNGs found the real cause: the oracle held pixel-identical at
every sampled render 6784-6809 (as §11a's RAM table already proved it
must), but the **app** now rendered a flat-but-WRONG static image from
render 6786 on — `(214,49,24)` constant, not the oracle's `(90,57,41)`
constant (the same value the app itself correctly showed one tick earlier,
at 6784/6785).

**Root cause of the miss**: `turn5PidgeottoFrame(t)` (the front-sprite
frame selector `drawTurn5PidgeottoMaterialize` also calls, orthogonal to
the affine/tint formula §11d's fix addressed) flips the drawn tileset from
`pidgeottoFrontSprite.tileset` to `pidgeottoFrontSprite.frame2` at exactly
render 6786 (and back and forth at 6766/6776/6821) — a claimed
"RAM-confirmed `animCmdIndex` transition" this dossier's own original §7b
text asserted but never re-verified against this session's denser probe.
§11a's own fresh RAM table (window [6735,6835], the widest and most
direct probe this whole dossier has run) already disproves it: the real
sprite is "100% unchanged... zero further change of any kind... dead
static" for the ENTIRE span RAM 6761-6835, which covers every one of
`turn5PidgeottoFrame`'s claimed transition ticks. The old (pre-§11d-fix)
code never exposed this, because the STRETCH_TABLE branch's own wobble
dominated the diff at those same renders, masking a smaller, separate
wrong-frame contribution underneath it.

**Confirmed by direct experiment, not curve-fit**: temporarily forcing
`turn5PidgeottoFrame` to return `0` unconditionally (reverted before
landing) and rerunning `npm run compare -- turn5-resolve-off-c --summary`
produced **exactly 173/196** — §11f's own predicted count, with renders
6786-6809 now showing 0px diff at every tick and the remaining 23
mismatches confined exactly to §11e's already-flagged, out-of-scope
6763-6783 span (mid-span, 6766-6767 improved from 596px to ~165px with
frame forced 0, but 6768-6783 stayed at essentially the same ~1100-1235px
magnitude — confirming §11e's own attribution of that residual to
`TURN5_MATERIALIZE_RAMP_COEFF`'s falling edge, not the frame selector).

**Landed as part of this same fix, not deferred**: `turn5PidgeottoFrame`
deleted entirely (was exported, now unused everywhere -
`pidgeottoFrontSprite.frame2` was never consumed by any other call site);
`drawTurn5PidgeottoMaterialize` now draws `pidgeottoFrontSprite.tileset`
unconditionally. This one dossier's own §11a RAM table is sufficient
justification on its own (the "dead static... no idle animation" finding
directly contradicts a mid-window frame swap), and the fix is what
actually makes §11d's own predicted count real — landing §11d alone
without this would have left the count silently stuck at 149/196 with no
externally-visible sign the RAM-justified branch removal had even taken
effect. `battleSceneCanonical.ts`'s own doc comment above
`turn5PidgeottoFrame`'s old location, and `turn5ResolutionAdapter.ts`'s
`materializeSettleTick` doc comment (§11b's contradiction), were both
corrected in the same commit, citing this section.

**Numbers:** `turn5-resolve-off-c` 149/196 -> **173/196**, exactly §11f's
own prediction, all 24 of renders 6786-6809 now 0px, the remaining 23
(6763-6783) confirmed still §11e's own flagged fourth mechanism, untouched.
Full guard family, zero decreases: `turn5-reset-off` 256/256,
`turn5-action-off` 32/32, `turn6-reopen-off` 46/46, `turn6-menu-off.json`
fixture 47/47, `turn5-confirm-off-a` 60/132, `turn5-confirm-off-b` 37/132,
`turn5-resolve-off-b` 88/196, `turn13-switchin` 242/242,
`turn4-doubleteam-off`/`turn4-rockslide-off` 256/256 each. One expected,
unprescribed increase: `turn5-resolve-off-d` 50/196 -> **66/196** (the
same shared `drawTurn5SwitchinSprite` draw path `turn5-resolve-off-c`'s
own fix touches is reused for this trace's own later redraw of the settled
scene, per §11f's own flagged reach — its own untouched, out-of-scope
residual past tick 7004 is unaffected).

`npm test` 1067 files / 10058 passed (+2, one new Tier-1 describe block
pinning `drawSpriteSheetAffineTintedBlend`'s degenerate/static-end-state
case, now exported for the test) / 223 skipped; `npm run build` green.
Full writeup and per-trace numbers: `ISSUES.md` #97 sub-entry H.
## 13. Mechanism (iv) instrument (2026-08-18, bounded SIDE worker, ISSUES #97
remainder): the materialize-phase tint/frame anchor, renders 6763-6783

Scope per this step's brief: §11e's own flagged "probable fourth mechanism"
(the SAME "one-tick-early falling edge" shape §4c/§4d already diagnosed and
fixed for `TURN5_BG_FADE_Y`, here suspected on `TURN5_MATERIALIZE_RAMP_
COEFF` instead) across render ticks 6763-6783 - explicitly disjoint from
the parallel main-lane worker's own concurrent §11-addendum/6786+ work (not
touched, not re-measured here). Fresh baseline confirmed in THIS worktree
before starting: `npm run compare -- turn5-resolve-off-c --summary` ->
**149/196**, byte-identical per-frame diff numbers to §11c's own table
(same `run-2026-08-18-19-12-48Z-82442` shape) - no drift from concurrent
lanes as of this session.

This session's method departs from a RAM probe (the brief's own suggested
starting point) because the diff PNGs, read first per the brief's own
instruction, made a pixel-exact EXACT-INTEGER-INVERSION approach directly
tractable and strictly more precise than a RAM sample would be for this
specific question (a byte-level palette-blend formula, not a physical OAM
register) - see §13a. Two new probe scripts implement it, both under
`tools/probe/`, both committed:

- `analyze-turn5-resolve-offc-materialize-tint-probe.ts` - exact per-channel
  coefficient inversion of `blendComponentToward` (`battleScene.ts:5789-
  5794`) at 3 known sprite-silhouette coordinates (`(175,30)`, `(190,50)`,
  `(160,45)`, reused verbatim from §11c), using a base color read from
  `oracle-06785.png`/`app-06785.png` (§11c's own "pixel-exact at 6785"
  finding as the coeff=0 ground truth).
- `analyze-turn5-resolve-offc-materialize-shift-probe.ts` - whole-frame
  `oracle[t]` vs `app[t]` vs `app[t-1]` diff-pixel-count comparison (a
  blunter instrument, superseded by the per-pixel/per-coordinate methods
  below once the whole-frame version proved confounded by independently-
  moving particles - kept as the record of that negative result, §13c).

Both consume a `tools/compare/out/run-*` directory from a fresh
`npm run compare -- turn5-resolve-off-c --capture-range 6755:6790 --summary`
(this session's own run: `tools/compare/out/run-2026-08-18-19-13-00Z-82442`
parent / `run-2026-08-18-19-13-00Z-82486` the capture-range rerun - both
cited below by tick, PNGs are the receipt). Additional inline Node one-liners
(reproduced in full in §13b-§13e below so they're rerunnable without a
separate committed script) extend the same method to whole-mismatched-
pixel-set scans and an analytic (asset-JSON-derived, no baseline-tick
dependency) reconstruction - the strongest single piece of evidence in this
section (§13d).

### 13a. Method: exact integer inversion, not curve-fitting

`blendComponentToward` (`battleScene.ts:5789-5794`) is:
```
c5 = component8 >> 3; t5 = target8 >> 3
b5 = c5 + ((t5 - c5) * coeff) >> 4        (coeff integer, 0..16)
component8_out = (b5 << 3) | (b5 >> 2)
```
This is invertible: `component8 >> 3` recovers `b5` exactly (the 5->8
expansion is bijective over the 32 values the formula can produce), so for
a KNOWN base color and KNOWN target color, trying every integer `coeff` in
0..16 finds the (generically unique) value that reproduces an observed
rendered byte EXACTLY - no least-squares fit, no rounding ambiguity.
Ground truths used, both already-established facts, neither re-derived:

- **Target**: `ballOpenFadeColor.rgb8 = (255,181,247)`
  (`src/data/gen/battle-anim-tables.json`, the same constant
  `MATERIALIZE_TINT_COLOR` resolves to, `battleScene.ts:5419`).
- **Base (frame 0)**: `oracle-06785.png`/`app-06785.png` at the 3
  coordinates - §11c's own table already established these are
  pixel-exact matches at t=6785 (`(175,30)`: both `(90,57,41)`; `(190,50)`:
  both `(33,33,33)`; `(160,45)`: both `(123,90,74)`), i.e. already-verified
  coeff=0 ground truth. Independently cross-checked in §13d by sampling
  `pidgeottoFrontSprite`'s own extracted tileset/palette JSON directly
  (`src/assets/gen/battle-opponent-front-sprites.json`), replicating
  `drawSpriteSheetAffineTintedBlend`'s own sampling math at
  `accumulator=256` (RAM-confirmed flat from RAM 6756/render 6757 per
  §11a) - which reduces to a literal 1:1 tile-to-screen copy
  (`matrixParam = trunc(0x10000/256) = 256`, so `sx = ((rx*256)>>8)+halfW
  = rx+halfW = dx` exactly, no rounding) - and getting the IDENTICAL three
  colors with zero PNG dependency, confirming the PNG-based baseline and
  the asset-JSON-based baseline agree exactly.

### 13b. First pass: coefficient inversion finds a clean signature, but only in the frame-0 sub-spans

`node --experimental-strip-types tools/probe/analyze-turn5-resolve-offc-materialize-tint-probe.ts tools/compare/out/run-2026-08-18-19-13-00Z-82486`
(full table in `artifacts/turn5-resolve-offc-materialize-tint-probe.json`,
gitignored, this doc's own tables are the receipt) shows, for renders
**6776-6783** (all 3 coordinates, every tick):

| render | oracle-implied coeff | app-reported coeff (`turn5MaterializeCoeff(t)`) |
|---|---|---|
| 6776 | 8 | 7 |
| 6777 | 7 | 6 |
| 6778 | 6 | 5 |
| 6779 | 5 | 4 |
| 6780 | 4 | 3 |
| 6781 | 3 | 2 |
| 6782 | 2 | 1 |
| 6783 | 1 | 0 |

`oracle_coeff(t) == app_coeff(t-1)` EXACTLY, all 3 coordinates, every one
of these 8 ticks - the real hardware holds each coefficient step ONE TICK
LONGER than the app's own table implies, i.e. the app steps down one tick
too early. Renders 6763-6767 (the flat-peak hold, coeff=16) mostly already
match (a couple of single-tick discrepancies noted, see §13e). Renders
**6768-6775** show a much noisier, inconsistent picture at first pass (this
is what the brief's §11e flagged as needing a "future instrument" - §13c/
§13d below resolve why).

### 13c. Why 6768-6775 look noisy: `turn5PidgeottoFrame`'s own 2-frame toggle is a confound, not the mechanism

`turn5PidgeottoFrame(t)` (`battleSceneCanonical.ts:1321-1328`) flips
PIDGEOTTO's front-sprite tileset between two hand-authored frames at
render ticks 6761/6766/6776/6786/6821 - `frame0` for 6763-6765 AND
6776-6785 (bracketing my span), `frame2` for **6766-6775**. §13a's
baseline (t=6785) is a `frame0` tick, so my coordinate inversion silently
assumed `frame0`'s palette content for the WHOLE window - correct for
6763-6765/6776-6783, systematically wrong for 6766-6775, where the app's
own `frame2` tileset genuinely differs at these coordinates (`(175,30)`:
frame0=`(90,57,41)` vs frame2=`(214,49,24)` - a completely different
color, not a rounding-adjacent one; asset-JSON-sampled directly, §13a).
This single confound fully explains the "NONE"/inconsistent inversion
results in the first-pass table for 6768-6775 - it isn't evidence against
a clean underlying mechanism, it's evidence the baseline needed to be
frame-aware. Confirmed directly: `analyze-turn5-resolve-offc-materialize-
shift-probe.ts`'s own whole-frame `oracle[t]` vs `app[t-1]` diff-pixel
count (blunter, no coordinate/frame reasoning at all) shows a sharp
discontinuity that lines up EXACTLY with the frame-toggle boundaries, not
the coefficient-ramp boundaries:

| render span | whole-frame diff, unshifted | whole-frame diff, `app[t-1]` shift |
|---|---|---|
| 6763-6766 (frame0, ramp not yet started/just starting) | 185-596px | **0-151px** (mostly resolves) |
| 6767-6776 (frame2 interior) | 596-1571px | 520-16733px (WORSE - wrong frame AND wrong coeff both compounding) |
| 6777-6783 (frame0 again) | 1109-1198px | **520-2956px, mixed** (whole-frame test itself is confounded by particles here too - see the caveat below; the per-coordinate/per-pixel tests in §13b/§13d are the reliable read for this span) |

(The whole-frame shift test is a blunt instrument - shifting the ENTIRE
frame by one tick also misaligns the ALREADY-CORRECT, already-landed
`TURN5_PIDGEOTTO_BG_FADE_Y` background blend, which is actively changing
tick-to-tick in exactly this window and should NOT be shifted - so this
table's own "worse under shift" readings for spans where the background
dominates are an artifact of testing too bluntly, not evidence against the
per-pixel finding. Kept here only as the record of why a coordinate-level/
sprite-footprint-restricted method was needed instead - see §13d.)

### 13d. Combined hypothesis, tested exhaustively over every mismatched pixel: `frame0` (never `frame2`) + coefficient queried at `t-1`

Using the asset-JSON-derived, baseline-tick-independent sampling from
§13a (so this test has ZERO dependency on any single PNG tick, sidestepping
§13c's confound entirely), an inline Node script scanned **every currently-
mismatched pixel inside PIDGEOTTO's own 64x64 sprite footprint**
(`dx,dy` in `[0,64)x[0,64)` relative to `PIDGEOTTO_CORNER=(144,19)`,
`battleSceneCanonical.ts:21`) at 4 representative ticks spanning the
`frame2`-claimed span, predicting each pixel's color as
`blend(frame0Palette[dx,dy], TINT, turn5MaterializeCoeff(t-1))` (i.e.
FORCING frame0 regardless of what `turn5PidgeottoFrame(t)` currently
claims, AND querying the existing, UNCHANGED coefficient table one tick
in the past) and comparing against the oracle's own actual rendered byte:

| render | sprite-footprint mismatch (today) | resolved by combined hypothesis | % |
|---|---|---|---|
| 6769 | 1069px | 1045px | 97.8% |
| 6771 | 1065px | 1045px | 98.1% |
| 6773 | 1084px | 1064px | 98.2% |
| 6775 | 1087px | 1070px | 98.4% |
| **total** | **4305px** | **4224px** | **98.1%** |

Two independently-derived, zero-fitting-parameter hypotheses (never-frame2
+ coefficient-minus-one) together predict 98%+ of every currently-
mismatched sprite pixel in the hardest part of the window, exactly. This
is not curve-fitting: the target color, the frame-0 base colors, and the
coefficient table are all pre-existing, independently-sourced constants:
only WHICH tick/frame they're evaluated at changed. The residual ~2% is
consistent with isolated anti-aliasing/rounding-adjacent single-channel
misses of the kind already seen and accepted elsewhere in this family
(§4c/§4e's own open caveat for `TURN5_BG_FADE_Y`).

Sanity-checked at 2 of the 3 original coordinates by hand (exact
arithmetic, not the script): at `(175,30)`, `t=6769`,
`blend(frame0=(90,57,41), TINT=(255,181,247), coeff=RAMP[6768-6768]=15)`
computes to `(239,173,231)` - the oracle's own actual pixel at that tick
is `(239,173,231)`, an exact match. At `(190,50)`, `t=6773`,
`blend(frame0=(33,33,33), TINT, coeff=RAMP[6772-6768]=11)` computes to
`(181,132,173)` - oracle's own actual pixel is `(181,132,173)`, exact
again. (`(160,45)` can't discriminate frame0 vs frame2 - both frames are
identical `(123,90,74)` at that specific coordinate, which is why it alone
"worked" in the naive first pass at §13b even for 6768-6775.)

### 13e. Particle timing: the same "-1" defect, smaller magnitude, not fully swept

Pixels OUTSIDE the sprite footprint (i.e. `drawTurn5SwitchinParticles`'s
own particle burst, the only other thing `drawTurn5PidgeottoMaterialize`'s
call site draws in this region) contribute a much smaller, partially-
explained residual:

| render | outside-footprint mismatch | resolved by simple `app[t-1]` shift |
|---|---|---|
| 6769 | 23px | 10px (43%) |
| 6771 | 44px | 28px (64%) |
| 6773 | 62px | 49px (79%) |
| 6775 | 55px | 39px (71%) |

Direct spot-checks at the 3 original coordinates (§13b's own raw data,
before the frame confound was understood) show clean EXACT single-pixel
particle matches under the shift at ticks 6763/6765/6766 (e.g. oracle's
own particle-orange `(255,173,0)` pixel at `(160,45)` appears at `t=6770`
in the oracle and at `t=6769` in the app - an exact one-tick-early
match). The partial (43-79%) resolution rate above (vs. the sprite
region's clean 98%) is expected, not contradictory: a coordinate-fixed,
single-tick-shift test is the WRONG instrument for a MOVING point (a
particle occupies different (x,y) at different ages), so it undercounts;
the exact single-particle spot matches are the more reliable signal for
this sub-component. Flagged as evidenced-but-not-exhaustively-quantified,
same discipline as §11e's own original flag for this whole section.

### 13f. Root cause and fix shapes

**Fix 1 (coefficient anchor) - a single call-site `-1`, with a directly
on-point precedent already living in the same file.** `drawTurn5PidgeottoMaterialize`'s
own call (`battleScene.ts:11235-11236`):
```ts
const coeff = turn5MaterializeCoeff(t);
```
should be
```ts
const coeff = turn5MaterializeCoeff(t - 1);
```
**This exact `-1` adjustment is not a new idea** - `drawGeneratedOpponentRelease`
(`battleScene.ts:4796-4809`, a separate, generic switch-in-release renderer)
ALREADY calls `turn5MaterializeCoeff` as
`turn5MaterializeCoeff(TURN5_BALL_HANDOFF_TICK + MATERIALIZE_START_OFFSET + local - 1)`
- substituting `local = elapsed - MATERIALIZE_START_OFFSET`, `elapsed = t -
handoffTick`, this simplifies to `turn5MaterializeCoeff(t - 1)` exactly
whenever `handoffTick == TURN5_BALL_HANDOFF_TICK` (the same-species case).
Its own doc comment (`:4805-4806`) says why: "Intro release reaches
`Task_FadeMon_ToNormal`'s poll one controller callback after the ordinary
switch-in chain reused below" - i.e. this OTHER call site already
discovered, and corrected for, the same one-controller-callback lag
`turn5MaterializeCoeff`'s OWN native tick semantics doesn't natively
include. `drawTurn5PidgeottoMaterialize`'s own direct, unmodified
`turn5MaterializeCoeff(t)` call is the outlier, not the reference - an
omission relative to this file's own established pattern, not a
deliberately different design.

**This does NOT touch `turn5MaterializeCoeff` itself, `TURN5_MATERIALIZE_
RAMP_COEFF`, or `TURN5_MATERIALIZE_RAMP_RENDER_START`** - all three stay
byte-identical, so `turn13MurkrowMaterializeCoeff`
(`battleScene.ts:11347-11354`, which reads `TURN5_MATERIALIZE_RAMP_COEFF`
directly and computes its OWN independent anchor,
`TURN13_MURKROW_RAMP_RENDER_AFTER_DISMISS`) is untouched by construction -
the same "new call-site input, don't edit the shared table" discipline
§10's landed `TURN5_PIDGEOTTO_BG_FADE_Y` fix and §2.2/§2.3's landed
`turn5OffSitrusOnixHp`/`turn5SitrusOffHealTextVisibleChars` fixes both
already established for this exact family of sharing landmine. Whether
Murkrow's OWN materialize-coefficient timing has the same defect is not
evaluated here - out of this session's scope (turn 13 render ticks, a
different trace/window entirely).

**Fix 2 (frame selection) - `turn5PidgeottoFrame`'s own `6766-6775` branch is wrong.**
`turn5PidgeottoFrame` (`battleSceneCanonical.ts:1321-1328`):
```ts
export function turn5PidgeottoFrame(t: number): 0 | 1 {
  if (t < 6761) return 0;
  if (t < 6766) return 0;
  if (t < 6776) return 1;   // <- WRONG for this session's own evidence
  if (t < 6786) return 0;
  if (t < 6821) return 1;
  return 0;
}
```
§13d's own exhaustive, zero-fitting-parameter reconstruction shows the
real hardware renders `frame0` content throughout 6766-6775 (verified
exactly at 2 independent coordinates x 2 ticks, plus 98%+ of every
sprite-footprint pixel at 4 ticks) - the `if (t < 6776) return 1` branch
(effectively covering 6766-6775, since the prior branch already claims
6761-6765) should return `0` instead, i.e. merge into the surrounding
0-branches:
```ts
export function turn5PidgeottoFrame(t: number): 0 | 1 {
  if (t < 6786) return 0;
  if (t < 6821) return 1;
  return 0;
}
```
**Deliberately NOT touching the `6786`/`6821` boundaries** - those govern
the OUT-OF-SCOPE post-6786 span the brief explicitly walled off (a
parallel main-lane worker's own concurrent territory, §11's stretch-branch
fix) - this session has no fresh evidence about whether `frame2` is
correctly used there or not, and didn't look (per the brief's own
constraint, not re-measured). `turn5PidgeottoFrame`'s only call site
(grep-confirmed) is `battleScene.ts:11229`, inside
`drawTurn5PidgeottoMaterialize` itself - not shared with Murkrow
(`turn13MurkrowFrame` is a separate, independent function) - safe to edit
in isolation.

**Fix 3 (particle timing) - flagged, evidenced, not exhaustively pinned.**
`drawTurn5SwitchinParticles` (`battleScene.ts:11310-11312`) computes
`logicalT = t - handoffTick - BALL_OPEN_START_OFFSET - 1` before calling
the shared `drawCleanSwitchinParticles`. §13e's spot checks suggest this
needs ONE MORE tick of delay (`- 2` instead of `- 1`) for turn 5's own
particle burst specifically. **This function is reused verbatim by
Murkrow's own switch-in** (`battleScene.ts:11407`,
`drawTurn5SwitchinParticles(fb, continuationElapsed, TURN13_BALL_HANDOFF_AFTER_DISMISS)`)
- editing the internal `-1` in place would silently retime Murkrow's own
particles too, unverified. Same discipline as Fix 1: add a new optional
parameter (e.g. `extraDelay: number = 0`, added into the `logicalT`
expression) defaulting to today's behavior, and pass `1` only from
`drawTurn5PidgeottoMaterialize`'s/`drawTurn5SwitchinSprite`'s own turn-5
call site (`battleScene.ts:11319`), leaving Murkrow's call untouched. Not
exhaustively quantified this session (§13e's own 43-79% single-pixel-shift
resolution rate is a lower bound, not a full accounting - a moving
particle needs a trajectory-aware instrument, not a fixed-coordinate one) -
flagged as the smallest, least-certain of the three fixes, safe to land
after Fixes 1/2 and re-measure rather than block on.

### 13g. Predicted counts (estimates, not rerun-verified - no `src/` edit was made this session)

- **Renders 6763-6767, 6777-6783 (12 of the 21 pre-6784 mismatched
  frames)**: Fix 1 alone is predicted to resolve the large majority -
  §13b's own table shows a clean, exact `oracle(t)=app(t-1)` signature at
  all 3 sampled coordinates for every one of 6776-6783, and the whole-
  frame shift test showed 100% resolution for 6763-6766 (`0-151px`
  residual from 185-596px unshifted, per §13c's own table).
- **Renders 6768-6776 (9 frames, the `frame2`-claimed span)**: needs BOTH
  Fix 1 AND Fix 2 together - §13d's own 98.1% sprite-footprint resolution
  rate at 4 representative ticks (6769/6771/6773/6775) is strong evidence
  these frames would land at or very near exact match once both fixes are
  applied, modulo Fix 3's own smaller, not-fully-quantified particle
  contribution (§13e: 23-62px per tick outside the sprite footprint,
  mostly but not 100% explained by the same class of fix).
- **`turn5-resolve-off-c` (196 total, 149/196 today in THIS worktree)**:
  no `src/` edit was made this session, so no live rerun exists - directly
  extrapolating §13d/§13b's own per-tick resolution rates suggests Fixes
  1+2 together would close the LARGE majority of the 21 frames 6763-6783,
  with Fix 3 needed for full exact-match on frames where the particle
  burst's own moving footprint dominates the remaining few residual
  pixels. Renders 6786-6809 (the OTHER 26 of the 47 originally-mismatched
  frames) are the separate, disjoint, concurrently-in-flight §11 stretch-
  branch fix - **not predicted or claimed here**, per the brief's own
  explicit walling-off.
- **`turn5-resolve-off-b`** (window 6418-6613, entirely before this
  section's 6763+ anchors) and **`turn5-reset-off`** (256/256, unrelated
  control): both **predicted unchanged**, same reasoning as §11f's own
  equivalent guard.
- **`turn5-resolve-off-d`**: this section's Fix 1/Fix 2 touch
  `drawTurn5PidgeottoMaterialize`, which `drawTurn5SwitchinSprite`
  (`battleScene.ts:11274-11280` per §11f's own citation) reuses for later
  turns' redraw of the settled scene - same "not confidently predicted
  unchanged, check as part of the regression guard" caveat §11f already
  flagged for its own fix, for the same structural reason.

### 13h. Rerunnable PASS/FAIL for the fix worker

1. **Rerun both new probes** (should reproduce this doc's own §13b/§13d
   numbers against a fresh compare-tool run):
   ```
   npm run compare -- turn5-resolve-off-c --capture-range 6755:6790 --summary
   node --experimental-strip-types tools/probe/analyze-turn5-resolve-offc-materialize-tint-probe.ts <fresh-run-dir>
   node --experimental-strip-types tools/probe/analyze-turn5-resolve-offc-materialize-shift-probe.ts <fresh-run-dir> 6763 6790
   ```
   PASS if the coefficient-inversion table reproduces §13b's own
   `oracle_coeff(t)==app_coeff(t-1)` signature for 6776-6783 at all 3
   coordinates.
2. **Apply Fix 1** (`battleScene.ts:11235-11236`, `turn5MaterializeCoeff(t)`
   -> `turn5MaterializeCoeff(t - 1)`). Re-run the tint probe - PASS if the
   6776-6783 mismatch in that table disappears (oracle and app-reported
   coeff now agree at every tick).
3. **Apply Fix 2** (`battleSceneCanonical.ts:1321-1328`, collapse the
   `6766-6775` branch into the surrounding `return 0`). Direct pixel-
   sample renders 6769/6773 at `(175,30)`/`(190,50)` against a fresh
   `npm run compare` run's saved PNGs - PASS if they now read
   `(239,173,231)`/`(198,140,181)` at 6769/6773 respectively for
   `(175,30)` (§13d's own hand-verified values) instead of the
   frame2-tainted colors.
4. **Apply Fix 3** (new `extraDelay` param on `drawTurn5SwitchinParticles`,
   turn5's own call site passing `1`). Spot-check the same particle-pixel
   signature §13e cited (oracle's `(255,173,0)` at `(160,45)`,`t=6770`
   should now match app's own `t=6770` directly, not just `app[t-1]`).
5. **`npm run compare -- turn5-resolve-off-c --summary`**: PASS if
   strictly higher than 149/196 (this worktree's own fresh baseline),
   with any remaining mismatches in 6763-6783 confined to isolated
   single-digit-pixel rounding residuals (§13b's own "a couple of
   single-tick discrepancies" note) rather than the current 185-1571px
   range. Frames 6786-6809 are NOT this fix's responsibility (§11's own
   parallel territory).
6. **Regression guard** - rerun the full family and confirm no decreases:
   ```
   npm run compare -- turn5-resolve-off-c --summary   # expect > 149/196 (THIS worktree's baseline)
   npm run compare -- turn5-resolve-off-b --summary   # expect unchanged 88/196
   npm run compare -- turn5-resolve-off-d --summary   # expect >= 50/196 (see §13g's own reused-draw-path caveat)
   npm run compare -- turn5-reset-off --summary        # expect unchanged 256/256
   npm run compare -- turn13-switchin --summary        # expect unchanged 242/242 (Murkrow reuses TURN5_MATERIALIZE_RAMP_COEFF/drawTurn5SwitchinParticles - Fixes 1/3 are both scoped away from it by construction, this guard proves it empirically too)
   ```

### 13i. Probe scripts (committed, rerunnable)

- `tools/probe/analyze-turn5-resolve-offc-materialize-tint-probe.ts` -
  exact per-channel coefficient inversion at 3 sprite-silhouette
  coordinates, PNG-baseline method (§13a/§13b). Run via
  `node --experimental-strip-types tools/probe/analyze-turn5-resolve-offc-materialize-tint-probe.ts <run-out-dir>`.
- `tools/probe/analyze-turn5-resolve-offc-materialize-shift-probe.ts` -
  whole-frame `oracle[t]` vs `app[t]`/`app[t-1]` diff-pixel-count
  comparison (§13c, the blunter instrument that motivated the
  frame-aware/asset-JSON method). Run via
  `node --experimental-strip-types tools/probe/analyze-turn5-resolve-offc-materialize-shift-probe.ts <run-out-dir> <startTick> <endTick>`.

§13d/§13e's own exhaustive-pixel-scan and particle-footprint checks were
run as inline Node one-liners (their full source is reproduced in this
section's own prose above, byte-for-byte rerunnable) rather than committed
as separate scripts, since they're thin, single-purpose compositions of
the same asset-JSON-sampling primitive `analyze-turn5-resolve-offc-
materialize-tint-probe.ts` already establishes - no new committed script
needed beyond the two listed above. No `src/` edit was made this session
(`git diff -- src/` empty throughout).

### 13j. Verdict

The FOURTH `turn5-resolve-off-c` mechanism (§11e's own flagged residual,
renders 6763-6783) is pinned to THREE independent, additive defects, all
inside `drawTurn5PidgeottoMaterialize`'s own tint/frame/particle
machinery:

1. **`turn5MaterializeCoeff`'s own call site is one tick too early**
   (`battleScene.ts:11235-11236`) - fix is a single-argument `t -> t-1`
   change, with a directly-on-point, ALREADY-EXISTING precedent for the
   exact same adjustment living in the same file
   (`drawGeneratedOpponentRelease`, §13f). Verified via exact integer
   inversion of the blend formula, zero curve-fitting, clean 8/8-tick
   match at 3 independent coordinates for the un-confounded half of the
   window (§13b).
2. **`turn5PidgeottoFrame`'s own `6766-6775` branch claims the wrong
   sprite frame** - the real hardware shows `frame0` throughout, not the
   `frame2` the current code claims. Verified via an asset-JSON-derived,
   PNG-baseline-independent reconstruction matching oracle's own rendered
   bytes EXACTLY at 2 coordinates x 2 ticks, and 98.1% of every currently-
   mismatched sprite-footprint pixel across 4 ticks (§13d) - the single
   strongest piece of evidence in this section, since it has zero free
   parameters and zero dependency on any specific baseline tick.
3. **`drawTurn5SwitchinParticles`'s own timing has the same class of
   one-tick-early defect**, smaller magnitude, evidenced but not
   exhaustively quantified (§13e) - flagged as the least-certain of the
   three, safe to land after 1/2 and re-measure.

All three fixes are scoped to avoid the two known sharing landmines this
family has already hit twice (`TURN5_BG_FADE_Y`/turn13, `TURN5_SITRUS_*`/
turns 9-14): Fix 1 and Fix 3 both add a NEW call-site argument rather than
editing the shared table/function `turn13MurkrowMaterializeCoeff`/
Murkrow's own particle call also depend on; Fix 2 edits a function with a
single, turn5-only call site. Renders 6786-6809 (the OTHER half of the
original 47-frame residual) are explicitly out of this section's scope,
per the brief's own disjoint-span instruction - not touched, not
re-measured, no claim made about them here. No `src/` edit was made this
session (`git diff -- src/` empty throughout); no landed anchor was
contradicted (this section pins a previously-unrecognized defect in
already-existing, never-previously-pixel-verified code, not a
re-litigation of any prior fix).
