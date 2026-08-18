# Sine-table-peak "rounding artifact" (ISSUES #97-B §8d/§9e): source-derived rule, blast radius, fix spec

Continuation of `docs/turn5-bounce-recalibration-probe.md` §8d/§9e. That doc
named the residual but explicitly did not resolve it to hardware's actual
`Sin()` rule ("would need reading `trig.c`'s actual `Sin()`/`Cos()` C
implementation, not just its table - not done, time budget"). This session
reads it, and the conclusion is different from what §9e speculated: **there
is no special hardware peak-rounding rule at all.** The residual is a
one-`sDelta`-step (7-index) index-alignment bug in how this line of work's
own `+67`/`+116` raw-sine-index offset constants were derived, not a defect
in `bounceSin`'s table lookup. The fix is a **4-literal, call-site-local**
correction, not a change to any shared function.

## 1. Source-derived true rule

`reference/pokeemerald/src/battle_main.c:2899-2979` (`DoBounceEffect`/
`SpriteCB_BounceEffect`) is the real driver (current pret source has no
separate `Task_BounceEffect` - the sprite callback IS the whole mechanism):

```c
// battle_controller_player.c:237-238 (setup call, both regions share it)
DoBounceEffect(gActiveBattler, BOUNCE_HEALTHBOX, 7, 1);
DoBounceEffect(gActiveBattler, BOUNCE_MON, 7, 1);
```
```c
// battle_main.c:2899-2938 (DoBounceEffect - seeds sSinIndex, delta=7, amplitude=1)
gSprites[invisibleSpriteId].sSinIndex = 128; // BOUNCE_HEALTHBOX
gSprites[invisibleSpriteId].sSinIndex = 192; // BOUNCE_MON
gSprites[invisibleSpriteId].sDelta = delta;      // 7
gSprites[invisibleSpriteId].sAmplitude = amplitude; // 1
```
```c
// battle_main.c:2967-2979 (SpriteCB_BounceEffect, one call per frame)
static void SpriteCB_BounceEffect(struct Sprite *sprite)
{
    s32 index = sprite->sSinIndex;                              // READ current index
    gSprites[bouncerSpriteId].y2 = Sin(index, sprite->sAmplitude) + sprite->sAmplitude; // COMPUTE y2 from it
    sprite->sSinIndex = (sprite->sSinIndex + sprite->sDelta) & 0xFF;                    // THEN increment
}
```
```c
// trig.c:515-518
s16 Sin(s16 index, s16 amplitude)
{
    return (amplitude * gSineTable[index]) >> 8;
}
```

With `amplitude=1`: `y2 = (gSineTable[index] >> 8) + 1`. At the table's
literal peak (`gSineTable[64] = 256`, `trig.c:71`, `Q_8_8(1)`, an EXACT copy
of the app's `GBA_SINE_TABLE_256[64] = 256`, `battleMenu.ts:791`):
`y2 = (256 >> 8) + 1 = 1 + 1 = 2`. This is **identical** to the app's
`bounceSin(index)+1 = floor(table[index]/256)+1` formula
(`battleMenu.ts:807-810`) - `256/256` has zero fractional remainder, so
there is no rounding-direction ambiguity and no hardware quirk to find.
**The app's per-index math (`bounceSin`) is already exactly correct** and
needs no change.

**The actual bug is in which index is looked up, not the lookup itself.**
`SpriteCB_BounceEffect`'s own execution order is: read `sSinIndex`, use it
to compute this frame's `y2`, **then** increment `sSinIndex` by `sDelta`
for the *next* frame. A RAM probe that reads `sSinIndex` at the same instant
it reads `y2` therefore captures a value **one `sDelta` step (7) ahead** of
the index that actually produced that same frame's `y2` - the read happens
after the frame's own controller logic (including this increment) has run.

## 2. Cross-check against the committed receipts - reproduces every row

Both `onixSinIndex`/`healthboxSinIndex` (the raw RAM `sSinIndex` reads) and
`onixY2`/`healthboxMainY2` (the raw RAM `y2` reads) are direct fields of
`src/data/gen/turn5-6-reopen-bounce-probe.json` (one probe, both windows).
Testing `Y2 == bounceSin(sinIndex) + 1` (current app rule) vs.
`Y2 == bounceSin(sinIndex - 7) + 1` (the delta-corrected rule, `7` = the
receipt's own `onixDelta`/`healthboxDelta`, constant everywhere the bounce
is live) against **every row of the receipt** (using the app's own literal
`GBA_SINE_TABLE_256`, not retyped):

| rule | ok | bad |
|---|---|---|
| current (`bounceSin(idx)+1`) | 161 | **25** |
| corrected (`bounceSin(idx-7)+1`) | 176 | **10** (all 10 are ticks 7347-7351, where the receipt's own `onixDelta`/`healthboxDelta` read **0** - the bounce sprite has already been torn down by `EndBounceEffect`, `y2` forced to 0 directly, outside the formula's domain entirely, not a counterexample) |

**Zero exceptions** once the bounce-ended rows are excluded (correctly, by
their own `delta=0` field) - the corrected rule reproduces literally every
active-bounce row of the receipt, both regions, both windows, not just the
literal peak. (Script: see §5.)

## 3. Why §8d/§9e's "peak-only, healthbox-and-onix-agnostic, ~1-in-9" shape is fully explained

`floor(table[i]/256)` and `floor(table[i-7]/256)` agree at all but 16 of the
256 possible raw indices (computed directly from the app's own table):
`{0,1,2,3,4,5,6,64,71,129,130,131,132,133,134,135}` - two 7-wide bands
around the zero-crossings (0, 128) plus two singleton points near the peak/
trough (64, 71). Since the index advances by exactly 7 per tick, hitting
any of these 16 "danger" values recurs roughly every 256/16 = 16 ticks
naively, but the two adjacent-value clusters compress observed hits to the
empirically-recorded "~1-in-9" cadence. This is a **generic consequence of
the delta being a small fixed step near a table extremum**, not a special
hardware peak rule - fully mechanical, no C-source special case needed.

## 4. Root cause of the bug: `+67`/`+116` are themselves off by exactly 7

The prior rungs (§8c/§9b) derived `indexOffset=+67` (window B) and `+116`
(window A) by fitting the app's computed raw index
(`onixSinIndex(n)+indexOffset` / `healthboxSinIndex(n)+indexOffset`)
directly against the receipt's own `onixSinIndex`/`healthboxSinIndex`
**RAM column** - proven "zero exceptions" (§9f's own PASS script). Per §1/§2
above, that RAM column is the **post-increment** value, one step ahead of
the index that actually produced that row's `Y2`. The derived offsets
inherited that same one-step excess. **The true offsets are `60` (`67-7`)
and `109` (`116-7`)** - algebraically identical to applying a `-7` shift
inside `bounceSin`'s lookup (§2's corrected rule), but expressed as the
offset constant instead.

## 5. Rerunnable receipt check (no oracle call needed)

```sh
python3 -c "
import json, re, math
src = open('src/engine/battleMenu.ts').read()
m = re.search(r'GBA_SINE_TABLE_256[^=]*=\s*\[(.*?)\];', src, re.S)
nums = [int(x) for x in re.findall(r'-?\d+', m.group(1))]
def bounce_sin(index): return math.floor(nums[((index%256)+256)%256]/256)
d = json.load(open('src/data/gen/turn5-6-reopen-bounce-probe.json'))
ok=bad=0
for r in d['ticks']:
    for field, idxfield, deltafield in [('onixY2','onixSinIndex','onixDelta'),('healthboxMainY2','healthboxSinIndex','healthboxDelta')]:
        if r[deltafield] == 0: continue  # bounce already ended, y2 forced 0 directly, out of formula domain
        pred = bounce_sin(r[idxfield] - r[deltafield]) + 1
        ok += pred == r[field]; bad += pred != r[field]
print(f'{ok} ok / {bad} bad (expect 0 bad)')
assert bad == 0
"
```
Expected: `176 ok / 0 bad`.

## 6. Blast radius - computed, not guessed

`menuIdleBounce` has ~28 direct call sites across `battleScene.ts` (plus
`battleSceneCanonical.ts`); `bounceSin` (the private table-lookup primitive)
has exactly 2 consumers: `menuIdleBounce` and `commandMenuBounceY2`. Per
§4, the correct fix is **not** a change to `bounceSin`/`menuIdleBounce`
(shared by every caller) but a literal-constant change at exactly the 4
places `67`/`116` are passed as `indexOffset`:

| file:line | old | new | gate |
|---|---|---|---|
| `battleScene.ts:8320` (`bounceIndexOffset`) | `116` | `109` | `turn5Active && turn5ReopenPressTick !== undefined` |
| `battleScene.ts:8689` (`idleWaitBounceIndexOffset`) | `116` | `109` | `turn5Active` |
| `battleScene.ts:11887` (`drawTurn6ActionMenuIdleWindow` call) | `67` | `60` | DMA-wait branch, `t < revealTick` (window B pre-reveal span only) |
| `battleScene.ts:14869` (`drawTurn6FieldBase` call, window B's own `+67` site) | `67` | `60` | this call site only |

Every other `menuIdleBounce` caller (~24 remaining, default
`indexOffset=0`) is **untouched by construction** - the literal `0` default
is not one of the 4 edited constants, so their computed raw index is
byte-identical before and after.

**This was verified empirically, not just argued**: the 4-literal edit was
applied to a scratch copy of the tree and the full suite + all
family-adjacent oracle windows were run against it (`git diff -- src/`
confirmed empty again afterward - no committed src change, per this step's
scope).

### 6a. Full `npm test` (10,263 tests, 1,110 files) under the corrected constants

**1 failure, everywhere else green** (`1065 passed | 44 skipped`, `10,039
passed | 1 failed | 223 skipped`):

```
FAIL tests/battleScene.test.ts > completed turn-4 receipt: turn 5 reopen
consumes the retained continuation epoch > Onix bounce sprite preserves the
existing continuation phase through 5926-5930, stepping at 5931, at (58,49)
  expected [247, 247, 255] (received, i.e. the CORRECTED pixel)
       to equal [189, 181, 181] (the pinned, pre-fix value)
```
Tick 5931 is one of window A's own six named residual ticks
(`{5928,5929,5930,5931,5940,5949}`, ISSUES #97-B) - this pin was recorded
against the OLD, bug-carrying pixel and is exactly the stale value this fix
is supposed to move. **Not a regression** - a pin that must be updated as
part of landing the fix (§7).

Confirmed by an initial exploratory pass that the WRONG fix shape (a global
`-7` inside `bounceSin`'s own lookup, touching every caller uniformly
instead of the 4 scoped literals) breaks **25 tests across 5 files**,
including `tests/battleMenuIdle.test.ts`'s pixel-harvest-backed turn-1
menu-open window (`battle1-menu-dense.json`, "69/69 oracle match", which
pins `y2=2` at its OWN table-peak tick 1877 as the **correct**, real-oracle
value) and even `tests/animation/sceneOnPresentation.test.ts` (Battle Scene
ON, outside this lane's remit entirely). This is the concrete evidence
behind the "scoping alternative" this step's brief anticipated: the global
form is wrong, the 4-literal form is the one that survives the full suite.

### 6b. Oracle-verified per-trace deltas (`npm run compare`, live against `battle-scene-off` on 8014)

| trace | before (ISSUES #97-B, landed) | after (this fix, live-measured) | delta |
|---|---|---|---|
| `turn5-action-off` | 26/32 | **32/32** | **+6** (all of `{5928,5929,5930,5931,5940,5949}` now match - window fully closed) |
| `turn6-reopen-off` | 20/46 | **22/46** | **+2** (`{7306,7317}` now match; all remaining mismatches sit in `[7318,7347]`, the still-unexplored `turn6KickoffBounceTick` dispatch, ISSUES #97-B's own separately-tracked open item - untouched by this fix by construction, since that call site is never passed a `67`/`116` literal) |
| `turn5-reset-off` (control) | 256/256 | 256/256 | 0 |
| `turn5-confirm-off-a` | 14/132 | **15/132** | **+1** (bonus - `idleWaitBounceIndexOffset` at `battleScene.ts:8689` is gated on plain `turn5Active`, not reopen-press-specific, so it also reaches into this trace's own captured span; a genuine additional oracle match, not predicted by the step brief but confirmed live) |
| `turn5-confirm-off-b` | 0/132 | 0/132 | 0 |
| `turn5-resolve-off-a` | 7/196 | 7/196 | 0 |
| `turn5-resolve-off-b` | 71/196 | 71/196 | 0 |
| `turn5-resolve-off-c` | 149/196 | 149/196 | 0 |
| `turn5-resolve-off-d` | 0/196 | 0/196 | 0 |
| `turn4-doubleteam-off` | 256/256 | 256/256 | 0 |
| `turn4-rockslide-off` | 256/256 | 256/256 | 0 |

**Exactly the predicted shape from the step brief (+6/+2), plus one
verified bonus improvement, and zero regressions anywhere in the family.**

### 6c. `commandMenuBounceY2` (the other direct `bounceSin` consumer) - not touched, and structurally doesn't need to be

`commandMenuBounceY2(age)` (`battleMenu.ts:856-863`, 2 callers,
`battleScene.ts:17538`/`45436`, the "live generated command menu" route -
not exercised by either receipt) uses `index = 7*(age-1)`: at `age=1` (the
first active tick) this evaluates to `192+0`/`128+0` - the literal
**pre-increment seed value**, not a value fit against a RAM `sinIndex`
column. It was never calibrated the way `+67`/`+116` were, so it has no
reason to carry the same one-step excess. Not proven correct by a receipt
this session (neither committed probe exercises this call path), but
structurally it does not share the defect's root cause. Flagged, not fixed
or claimed-verified - worth a fresh RAM probe if this route is ever pinned
against a table-peak tick.

## 7. Fix spec

**Edit** (4 literals, `battleScene.ts`, no other file):
- `:8320` `116` → `109`
- `:8689` `116` → `109`
- `:11887` `67` → `60`
- `:14869` `67` → `60`

No change to `battleMenu.ts` (`bounceSin`, `menuIdleBounce`,
`onixSinIndex`/`healthboxSinIndex`, `commandMenuBounceY2` all stay
byte-identical) and no change to any of `menuIdleBounce`'s other ~24 call
sites (their `indexOffset` stays the untouched default `0`).

**Tier-1 pins to update** (exactly one; found by running the full suite
under the fix, §6a):
- `tests/battleScene.test.ts` - "completed turn-4 receipt: turn 5 reopen
  consumes the retained continuation epoch > Onix bounce sprite preserves
  the existing continuation phase through 5926-5930, stepping at 5931, at
  (58,49)" - `pixelAtTurn5Reopen(5931, 58, 49)` moves from `[189, 181,
  181]` to `[247, 247, 255]` (verified oracle-correct: tick 5931 is inside
  `turn5-action-off`'s newly-100%-matching span, §6b).
- Additionally recommend: `docs/turn5-bounce-recalibration-probe.md` §8d/
  §9e/§8h/§9f/§4/§5 and `ISSUES.md` #97-B's own "remaining, still open"
  bullet should be updated/closed once this fix lands (this doc's remit is
  analysis only, so those edits are left to the landing worker, not made
  here).

**Full guard-trace list to re-run after landing** (all live-verified this
session, §6b): `turn5-action-off`, `turn6-reopen-off`, `turn5-reset-off`,
`turn5-confirm-off-a`, `turn5-confirm-off-b`, `turn5-resolve-off-{a,b,c,d}`,
`turn4-doubleteam-off`, `turn4-rockslide-off`.

### PASS/FAIL (rerunnable)

```sh
cd workspace   # CWD trap - PAPERCUTS.md
npm test                                             # expect exactly 1 known pre-fix failure at HEAD; 0 after the pin update above
npm run compare -- turn5-action-off --summary        # expect: 32/32 frames matched
npm run compare -- turn6-reopen-off --summary        # expect: 22/46 frames matched (remaining 24 all in [7318,7347])
npm run compare -- turn5-confirm-off-a --summary     # expect: 15/132 frames matched
npm run compare -- turn5-reset-off --summary         # expect: 256/256 frames matched (control, unchanged)
npm run compare -- turn4-doubleteam-off --summary    # expect: 256/256 frames matched (unchanged)
npm run compare -- turn4-rockslide-off --summary     # expect: 256/256 frames matched (unchanged)
```

**Verdict at the time of this doc: FAIL** (fix not landed - out of this
step's scope by instruction). Every number above was measured live against
the real oracle and the full Tier-1 suite with the fix applied in a
scratch edit, then reverted (`git diff -- src/` empty, confirmed). The next
worker to pick this up should be able to apply §7's 4-literal edit, update
the one named pin, and land a fully green PASS with no further
investigation.
