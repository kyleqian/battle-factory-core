# S8 OFF — enemy rental picker boundary probe

Evidence checkpoint only: no runtime, renderer, controller, or acceptance
trace changed. Profile is `battle-scene-off`; the unchanged source prefix is
`tools/compare/traces-groundtruth/battle1-swapyes-b.json`. The compact result
fixture is `src/data/gen/battle1-swap-enemy-picker-boundaries.json`.

## Reproduce

The trace generator preserves that committed route and limits captures to a
single named window. It does not contain framebuffer-derived assets.

```sh
taskdir=$(mktemp -d)
node tools/probe/derive-swap-enemy-picker-trace.mjs canonical \
  > "$taskdir/enemy-entry.json"
bin/oracle --profile battle-scene-off run "$taskdir/enemy-entry.json" \
  -o "$taskdir/enemy-entry"

python3 tools/run-mgba-probe.py "$taskdir/swap-picker.json" -- \
  ../../vendor/mgba-venv/bin/python \
  tools/probe/dump-swap-enemy-picker.py \
  tools/compare/traces-groundtruth/battle1-swapyes-b.json \
  "$taskdir/swap-picker.json" 29780 30200
```

The three edge variants are `earliest-swap-a`, `earliest-picker-right`, and
`earliest-accept-a`; pass one as the generator's first argument. Each replay
was also run through `tools/run-mgba-probe.py`, which validated its JSON even
when libmGBA ended with its known teardown SIGSEGV.

## Oracle/RAM boundary ledger

All ticks are oracle trace ticks. The canonical route presses DOWN at 29781;
the menu cursor changes to SWAP at 29782. An A at **29782** is the earliest
post-DOWN SWAP selection: RAM records `Swap_Task_SwitchPartyScreen` state 0
at 29783. The unmodified route waits until A at 29801, so the equivalent
task begins at 29802.

| tick | RAM/source boundary |
| ---: | --- |
| 29802 | canonical `Swap_Task_SwitchPartyScreen` state 0 |
| 29823 | state 3 owns `Swap_Task_SlideCycleBalls`; the three ball-cycle flags progress independently |
| 29886 | `Swap_InitActions(SWAP_ENEMY_SCREEN)` has set `inEnemyScreen=1`, `cursorPos=0`, and `actionsCount=5` |
| 29887–29934 | `Swap_Task_ScreenInfoTransitionIn` runs the two action-button slides, text fade, and picker labels; it is not picker input-ready |
| 29935 | `Swap_Task_HandleChooseMons` state 1: first accepted picker input edge |
| 29936 | RIGHT at 29935 changes cursor 0 → 1; RIGHT at 29934 is rejected |
| 29975 | A at the first ready tick for eligible slot 0 reaches `Swap_AskAcceptMon` |
| 29976 | `Swap_Task_HandleYesNo` begins with `monSwapped=1` and opens the mon picture / `Accept this POKéMON?` path |
| 29999 | `Swap_Task_HandleYesNo` state 5: first accept-popup A/B/UP/DOWN input edge |

The canonical navigation probe still gives the picker sequence 0 → 1 → 2 →
1 → 0 at RIGHT 30001, RIGHT 30021, LEFT 30041, LEFT 30061. Its A at 30081
follows the same `Swap_ActionMon` exit path; the first accept UI task is
30121, and its prompt accepts input at 30145. These later values are delayed
only by the route's idle time, not a different UI mechanism.

The offered identity/order is fixed before the screen: rental slots 3–5 are
GROVYLE (`monId` 188), MURKROW (184), and PIDGEOTTO (135). The evidence
fixture mirrors the checked RAM values in
`src/data/gen/battle1-swap-rentalmons-dump.json`; `Swap_InitActions` does not
roll or reorder them. In this route the chosen player slot is ONIX (0), so
each offered species is eligible—`Swap_AlreadyHasSameSpecies` only rejects a
species held by either non-replaced player slot.

## Source-defined accept/exit boundary

`Swap_OptionSwap` closes the player mon picture, stores `playerMonId`, erases
the popup, and immediately installs `Swap_Task_SwitchPartyScreen`
(`reference/pokeemerald/src/battle_factory_screen.c:3989-3996`). Its state 3
waits for the ball slide and species fade, then calls
`Swap_InitActions(SWAP_ENEMY_SCREEN)`; state 4 enters
`Swap_Task_ScreenInfoTransitionIn` (`3196-3250`, `3961-3979`).

At an enemy ball, `Swap_ActionMon` routes eligible choices through
`Swap_Task_ScreenInfoTransitionOut` to `Swap_AskAcceptMon`; a duplicate keeps
the picker and shows its rejection message (`4039-4062`). `Swap_AskAcceptMon`
sets `monSwapped=TRUE`, opens the mon picture, prints the accept message, and
delegates to `Swap_Task_HandleYesNo` (`2465-2583`). In that prompt, A on YES
closes the mon picture and selects `Swap_Task_Exit`; A on NO or B erases the
popup and returns through `Swap_Task_ScreenInfoTransitionIn` to the enemy
picker. That YES/NO branch is the next distinct implementation boundary.

The only runtime-safe next slice is therefore state-driven enemy picker
presentation through `Swap_Task_HandleChooseMons` input plus the accept-prompt
handoff. It needs its own dense app comparison before any pixel claim; this
checkpoint makes none.

## 2026-08-17 — ISSUES #96(b) frame-29838 header-edge sliver: classified (RAM probe, no fix)

Diagnosis-only checkpoint (side lane): no runtime, renderer, or acceptance
trace changed. Scope is exactly ISSUES #96(b), the `battle1-swap-enemy-picker`
compare trace's single remaining mismatch. Part (a) — the quit-popup
`advanceBallAnim` lag-args bug in `factorySwapPresentation.ts:868`'s call
site — is a **different** worker's parallel fix in
`factorySwapPresentation.ts`; nothing here touches that call site's
arguments, and this diagnosis needed no edit to it.

### Reproduce

```sh
npm run compare -- tools/compare/traces/battle1-swap-enemy-picker.json --summary
# frame 29838: DIFF 5px (0.01%) bbox=239,62-239,66 ssimMean=0.9986 ssimMin=0.5407
# 129/130 frames matched
```

Dense window (`--capture-range 29830:29845 --summary`) confirms neighbors
29836-29837 and 29839-29845 are pixel-perfect; only 29838 mismatches.

### Corrected reading: it is not the ONIX name-box header at all

The ISSUES #96 entry's banked description ("oracle draws a dark border
column of the ONIX name-box header one row further at the screen edge")
is **wrong at the object level** — this is the first thing the per-pixel
read overturns. Sampling the diff PNGs' actual RGB at column 239 across
29836-29840 (`PIL.Image.getpixel`) shows the mismatch band (rows 62-66,
color `(66,66,66)` in the oracle, background dither `(189,231,247)`/
`(148,189,206)` in the app) sits **inside a 32×32 sprite passing through
that column**, not inside any BG text-window box — the header/species
window (`SWAP_WIN_SPECIES`, `battle_factory_screen.c:959-967`) occupies
tilemap rows 2-3 (pixel y 16-32), nowhere near y=62-66. The object actually
at (239, 62-66) is one of the three **cycling rental-ball sprites**
(`Swap_Task_SlideCycleBalls`, `battle_factory_screen.c:2787-2864`),
created at `y=64` (`battle_factory_screen.c:3448`), shape=square size=2
(32×32), clipped to its rightmost 6 columns (234-239) as it slides off the
right edge of the screen mid-transition.

### Per-tick evidence (oracle RAM/OAM, `tools/probe/dump-swap-enemy-picker-edge.py`)

Trace state at this window: `Swap_Task_SwitchPartyScreen` state 3 +
`Swap_Task_SlideCycleBalls` state 1, active continuously 29823-29843+ (per
`tools/probe/dump-swap-enemy-picker.py`, unchanged from the existing
ledger). Reproduced via the resolved compare trace (its
`sourceTrace`+`appendSegments` spliced exactly as
`tools/compare/traceFile.ts`'s `loadCompareTrace` does, so tick numbers
match `npm run compare` 1:1):

| tick | OAM slot @ edge | x (center, raw OAM) | tile | pal | note |
| ---: | --- | ---: | ---: | ---: | --- |
| 29836 | slot4 | 214 | 120 | 1 | resting frame, not yet edge-clipped |
| 29837 | slot3/slot4 | 176 / 224 | 120 / 120 | 1 / 1 | both resting frame; col 239 pixel-perfect |
| **29838** | slot3/slot4 | 186 / **234** | 120 / **136** | 1 / 1 | **slot4 flips to tile 136 (+16), clipped to cols 234-239** |
| 29839 | slot3/slot4 | 196 / -32(wrap) | **136** / 120 | 1 / 0 | slot4 wraps off-screen + regrays; slot3 now flips to 136 |
| 29840 | slot3/slot4 | 206 / -22 | 136 / 120 | 1 / 0 | slot3 stays on 136 (5 ticks, not 1) |

`WIN0H=0x5898 WIN0V=0x4041 WIN1H=0 WIN1V=0 WININ=0x3f WINOUT=0x37
DISPCNT=0x1740` and all four BG `HOFS`/`VOFS` are **constant (0)** across
the entire 29825-29845 window — read every tick, zero deltas anywhere.
Full per-tick OAM+register dump for 29825-29845 (21 ticks) is committed at
`tools/probe/receipts/battle1-swap-enemy-picker-edge-oam.json`.

**Ball position is bit-exact between the app's formula and this RAM**, not
approximately — the app's `factorySwapEnemyBallCycleVisuals` (already
ported, `factorySwapPresentation.ts:1299-1344`) was evaluated in isolation
at `phaseElapsed = tick - 29802` (the known `Swap_Task_SwitchPartyScreen`
state-0 origin tick from this doc's existing ledger) for every tick
29825-29845; all three ball centers matched the RAM-derived centers
(`OAM.x + 16`) exactly at all 21 ticks, including both wrap ticks (29834,
29839). Position is therefore not the divergent value at 29838 — the
**tile index** is: slot4's OAM tile is 120 at 29837, 136 (`+16`) at 29838
only, back to 120 (wrapped away) at 29839. `136-120=16` is exactly the
`AnimCmd`-relative offset from `sAnim_Swap_Pokeball_Moving`'s first frame
(`ANIMCMD_FRAME(16, 4)`, `battle_factory_screen.c:753-772`), against
`sAnim_Swap_Pokeball_Still`'s constant `ANIMCMD_FRAME(0, 30)`
(`battle_factory_screen.c:747-751`) — i.e. the ball is briefly showing its
**rolling/rocking animation's frame 1** instead of its resting frame.

### Mechanism: `SpriteCB_Pokeball`'s RNG-gated roll, unmodeled during ball-cycle

`SpriteCB_Pokeball` (`battle_factory_screen.c:1059-1090`) drives every ball
sprite whose OAM palette is still `PALTAG_BALL_SELECTED` (the "colored"
palette, not yet grayed) through a **`Random() % 5 == 0`**-gated roll: each
tick the current anim ends, a 1-in-5 draw restarts the held `Still` frame
for 32 more ticks, otherwise it starts the multi-frame `Moving` roll
(`0/16/32/0/...`, `battle_factory_screen.c:753-772`). A ball keeps
`PALTAG_BALL_SELECTED` until **its own** `Swap_Task_SlideCycleBalls` wrap
sets it gray (`battle_factory_screen.c:2852-2855`) — each of the 3 balls
wraps at a different tick (staggered ~10-12 ticks apart per the position
table above), so for a meaningful span of the transition, 1-2 balls are
still colored and still rolling.

The evidence rules out a fixed "last-frame-before-wrap" rule: slot4 flips
to 136 exactly **1 tick** before its own wrap (29838→29839 wrap), but
slot3 flips to 136 a full **5 ticks** before its wrap (29839 flip → 29844
wrap per the wider dump), and slot5 (the first/fastest ball, wraps 29834)
shows **no flip at all** in 29825-29833. Inconsistent offset relative to
each ball's own wrap tick is exactly what a `Random()%5==0` gate produces
and a deterministic rule would not.

The TS side: `factorySwapBallTiles` (`factorySwapPresentation.ts:888-896`)
reads `state.ballAnims`, which only ever advances inside
`advanceFactorySwapPresentation`'s `if (selectedPalette && (...))` block
(`factorySwapPresentation.ts:862-879`, the same `advanceBallAnim` call
ISSUES #96(a) already flags for its lag-args bug — a different argument
bug on the *idle-picker* path, not this gate). `selectedPalette`
(`factorySwapPresentation.ts:845-860`) is unconditionally `false` whenever
`controller.phase === "enemySwitch"` (also `"playerSwitch"`), so
**`ballAnims` never advances for the whole ball-cycle transition** —
elsewhere in the file `ballAnims` is only ever passed through
(`state.ballAnims`) or hard-reset (`initialFactorySwapBallAnims()`), never
mutated except in that one gated block. The gate's own comment states the
assumption directly: *"Enemy-side balls have the gray palette, whose
callback never rolls... this callback state owns settled selected
palettes"* (`factorySwapPresentation.ts:841-844`) — true only **after**
each ball's individual wrap, not for the balls still selected-palette
mid-transition, which is exactly the gap this trace's frame 29838 exposes.
`factorySwapRender.ts:414-420` (`renderedBallTiles`) and `:576-591` (the
per-ball draw loop, `firstTile = gray ? 0 : renderedBallTiles[i]`) then
draw whatever frozen tile `ballAnims` held when `enemySwitch` began — for
this trace, that's the resting `0` offset, which matches the oracle on 129
of 130 sampled frames simply because `Random()%5==0` rarely lands a roll
in the narrow window where a still-selected ball is *also* clipped to a
thin edge column *and* the roll frame's graphic differs from frame 0 in
that specific clipped sub-region.

### Candidates eliminated

1. **App reveals the header border 1 tick late/early at a reveal edge** —
   eliminated at the object level: there is no header/text-window box at
   this position at all (see "corrected reading" above); nothing here is
   a BG-window reveal edge.
2. **Oracle-side sprite/BG state genuinely extends 1px further for 1 tick**
   — eliminated in the "wider/shifted" sense: ball OAM x is bit-exact
   between the app's ported position formula and RAM at all 21 sampled
   ticks (including both wrap ticks). It is not 1px wider or offset; it is
   a **different tile's raster content** at an unchanged position.
3. **A windowing/clip register (WIN0H/WIN1H) edge value for 1 tick** —
   eliminated by direct read: `WIN0H/WIN0V/WIN1H/WIN1V/WININ/WINOUT/
   DISPCNT` and all BG `HOFS`/`VOFS` are byte-identical across the entire
   29825-29845 window (never change tick to tick).
4. **Something else (confirmed): an RNG-driven per-ball sprite "rocking"
   animation the TS renderer's ball-cycle path structurally excludes.**
   `SpriteCB_Pokeball`'s `Random()%5==0` roll is real, source-confirmed,
   and unmodeled for `phase === "enemySwitch"`/`"playerSwitch"` by
   `factorySwapPresentation.ts:845-860`'s `selectedPalette` gate.

### Fix shape (not implemented — out of scope for this diagnosis step)

Replace the blanket phase exclusion with a **per-ball** eligibility check:
during `enemySwitch`/`playerSwitch`, each of the three balls should keep
consuming `advanceBallAnim` rolls (`factorySwapPresentation.ts:862-879`'s
existing mechanism, already correct for the idle-picker path) **until that
specific ball's `cycledToEnemy` flag flips true** — i.e. key eligibility
off `factorySwapEnemyBallCycleVisuals`/`factorySwapPlayerSwitchBallCycleVisuals`'s
per-ball `cycledToEnemy` (`factorySwapPresentation.ts:1299-1344`,
`:1559-1567`) rather than off `controller.phase` alone
(`factorySwapPresentation.ts:845-860`). `factorySwapRender.ts:414-425`'s
`renderedBallTiles`/`ballCycle` wiring then needs the per-ball advancing
tile substituted in place of the frozen `view.ballTiles[i]` while
`cycledToEnemy` is false. This is an **RNG-consumption-order** change, not
a pure render tweak: the existing docstring
(`factorySwapPresentation.ts:795-796`) already establishes the required
draw order — selected-palette balls consume their `Random()%5` draws "in
sprite/OAM index order (0, 1, 2)" after the caller's own VBlank
`Random()` call — so threading this through mid-cycle without disturbing
that order (and without touching part (a)'s lag-args call site) is real
work, correctly left to its own step rather than folded into this
diagnosis.
