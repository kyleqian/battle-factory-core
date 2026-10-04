# Wall-family source allocator and clock evidence

Evidence only (no production code touched). Reflect, Mirror Coat, Barrier,
Magic Coat and Protect measured exactly the way Light Screen was, so a later
integration step can give them source-derived allocator plans through
`knownEntrySpriteAllocator.ts` / `liveMoveSpriteAllocator.ts`.

Receipts: `tools/integration/fixtures/wall-family-<move>-source-receipt.json`
(reference/source/tool sha256 pins, both orientations, both fresh runs, plan,
windowed allocator calls). Raw: `tools/integration/fixtures/wall-family-raw/`
(clock + call outputs, `<move>-<side>-{clock,calls}-{0,1}.json`, each pair
byte-identical; sha256 in the receipts). Staging scenarios (new):
`tools/integration/fixtures/wall-family-scenarios/`.

## Definitions (same as the Light Screen clock probe)

- Activation = first frame with `gAnimScriptActive` and `sAnimMoveIndex == move`
  (frames count from trace frame 0 of the scenario, ordinary BattleLab singles
  entry, no injected state). Light Screen calibration run on its own scenario
  with the new probe reproduces the old probe exactly (act 306, wall 313,
  cleanup 391; live offset 7).
- Live offset = wall (first script sprite) CreateSprite frame - activation.
- Cleanup = first frame the move's script is no longer active (script `end`,
  which waits for sound).
- Ages below are relative to activation unless "from wall".
- Baseline = occupied OBJ slots at activation-1; end = at cleanup.
  Baseline is `[0,1,2,6,8,60,61,62,63]` in every run, and so is the end set:
  **all five moves are net-zero** (profile `battle-scene-on`, like the Light
  Screen receipts; a Scene-OFF entry topology was not measured).
- Every sprite table change in the window is cross-checked against an exact
  `CreateSpriteAt`/`DestroySprite` call (caller, slot argument, returned slot).
  All wall/effect creates come from `CreateSpriteAndAnimate` via
  `CreateSpriteAt` with returned slot = requested slot; all destroys from
  `DestroyAnimSprite`.

## Per-move plans (player / opponent orientation; identical shape both sides)

| Move | Scenario carrier (first body?) | Activation (P/O) | Loads (act+) | Wall slot, create age (live offset) | Effect sprites | Wall destroy age | Cleanup age | Net-zero |
|---|---|---|---|---|---|---|---|---|
| Reflect 115 | accepted `mechanic-reflect-*-shuppet-*-shuckle` (yes, both) | 65 / 69 | +1, +4 | 3, +7 (**7**) | slots 4,5,4 at wall+22/+31/+40 (ages 29/38/47), lifetime 15 each; sparkle 3 reuses slot 4 (sparkle 1 destroyed at wall+37) | +71 (life 64) | +78 | yes |
| Mirror Coat 243 | new `wall-family-mirror-coat-*` (Corsola vs Exeggcute Confusion); **second body** by necessity (yes only as 2nd body) | 319 / 321 | +1, +4 | 3, +7 (**7**) | six `gSpecialScreenSparkle`: slots 4,5,7,4,5,7 at wall+12/20/27/36/44/52; lifetimes 20,20,20,20,22,22 | +71 (life 64) | +85 | yes |
| Barrier 112 | new `wall-family-barrier-*` (Drowzee vs 3x Shuckle) (yes, both) | 70 / 74 | +1 | 3, +4 (**4**) | none | +68 (life 64) | +75 | yes |
| Magic Coat 277 | accepted `mechanic-magic-coat-*-spoink-*-onix` (yes, both) | 69 / 73 | +1 | 3, +4 (**4**) | none | +68 (life 64) | +75 | yes |
| Protect 182 | accepted `mechanic-protect-*-houndour-*-onix` (yes, both) | 68 / 72 | +1 (+monbg, no OBJ) | 3 (`gProtectSpriteTemplate`), +7 (**7**) | none | +117 (life 110) | +122 | yes |

Absolute ticks (player run): Reflect wall 72, sparkles 94/103/112, sparkle
destroys 109/118/127, wall destroy 136, cleanup 143. Mirror Coat wall 326,
sparkles 338/346/353/362/370/378, destroys 358/366/373/382/392/400, wall
destroy 390, cleanup 404. Barrier wall 74 / destroy 138 / cleanup 145. Magic
Coat 73 / 137 / 144. Protect 75 / 185 / 190. Opponent runs are the same plus a
constant shift (act +4 Reflect/Barrier/MC/Protect, +2 Mirror Coat); every
offset above is orientation-independent.

Light Screen comparison: Light Screen live offset 7, six sparkles at wall+12/20/27/36/44/52
(from the Light Screen receipt) — Mirror Coat is identical to it in shape and
timing, including the slot cycle 4,5,7 and the 22-tick last two lifetimes
(the Light Screen "20-tick" figure is exact only for the first four).

## Static scout claims: verdicts

- Barrier and Magic Coat: one wall, no sparkles — **held**.
- Reflect: wall then three sparkles at delays 20/7/7 (spawn ~22/31/40 from the
  wall), 15-tick lifetimes, sparkle 3 reuses sparkle 1's slot — **held
  exactly** (22/31/40, 15, slot 4 reused; sparkle 2 uses slot 5).
- Mirror Coat uses the same SpecialScreenSparkle as Light Screen, six sparkles,
  20-tick life — **mostly held**: spawn ages match Light Screen exactly, but
  the last two sparkles live 22 ticks, not 20.
- Mirror Coat has no `waitplaysewithpan` before the wall — **held in source**,
  yet the wall offset is still 7 (two loads cost +1/+4, then the wall).
- Protect creates one sprite plus a monbg — **held**: monbg allocates no OBJ
  slot (the only OBJ allocation is the protect shield, slot 3, life 110).
- `delay N` costs N+2 ticks — **held** (Reflect wall+22 for delay 20, +9 per
  delay 7; Mirror Coat first sparkle at wall+12 for delay 10).
- Live offsets ~7 (Reflect/Mirror Coat) and ~4 (Barrier/Magic Coat) —
  **held exactly**; Protect is 7 (not claimed).
- Not in the scout list: Mirror Coat can never be the first body (priority -5,
  fails without a prior special hit), so the "first move body" requirement is
  a precise negative for it; it is staged as the second body after a real
  Confusion (the first body's sprite table returns to the same baseline).
  Barrier's accepted fixtures are NOT first-body (the faster Onix Tackles
  first); the new Barrier scenarios use Shuckle on the other side.
  Barrier's +2 Defense stat animation starts 4 ticks after the move script
  ends (outside the move's plan, separate `StatsChangeAnimation` sprite).

## Probe bug found and fixed in this session

The first probe version masked the low bit of every ELF symbol address and
read `gAnimScriptActive` at the wrong (even) byte, shifting activation/cleanup
by about one frame and making opponent Protect look stuck. Fixed before the
committed receipts were generated; the Light Screen calibration above proves
the fixed probe agrees with the existing clock probe.

A second caveat: the Light Screen call probe's own coalescing frame selection
combined with the event frames shifted the single-step frame phase on the
Mirror Coat opponent scenario (a pair differed). The wall-family call probe
single-steps only the clock-event frames, and the receipt builder fails unless
every table change has a matching allocator call.

## Commands

```
# scenarios (new files)
python3 tools/compare/wallFamilyScenarios.py tools/integration/fixtures/wall-family-scenarios
# raw evidence: 2 fresh clock + 2 fresh allocator-call runs per move/orientation
tools/compare/wallFamilyRunAll.sh /tmp/wf/raw2        # needs an empty dir
# one probe by hand
python3 tools/run-mgba-probe.py OUT.json -- python3 tools/compare/wallFamilyClockProbe.py <move-id> <scenario.json> OUT.json
python3 tools/run-mgba-probe.py CALLS.json -- python3 tools/compare/wallFamilyAllocatorCallProbe.py <scenario.json> CLOCK.json CALLS.json
# receipts
python3 tools/compare/wallFamilyReceipt.py <name> <id> /tmp/wf/raw2 tools/integration/fixtures/wall-family-raw tools/integration/fixtures/wall-family-<name>-source-receipt.json
```
