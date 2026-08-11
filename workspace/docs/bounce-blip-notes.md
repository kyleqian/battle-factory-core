# ISSUES #28 root-cause probe: the recurring period-9 excluded-tick family (S7 worktree probe, oracle/RAM only — no engine code)

## Verdict: ROOT-CAUSED. Modelable rule, verified against all three turns' excluded sets (26 ticks), zero regressions on the currently-green ticks.

The whole family — turn 6's 8 excluded ticks (§27), turn 7's 8 (§32), turn
8's 10 (§33) — is **one single mechanism**: `drawTurn6FightSubmenuWindow`/
`drawTurn7FightSubmenuWindow`/`drawTurn8FightSubmenuWindow`'s **browsing**
(post-reveal, pre-confirm) branch composes the bounce-cycle argument as
plain `bounceTick = t` (`battleScene.ts:6688`/`6973` and turn 7's analogous
line) — **it never applies `FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT`**, the exact
correction turns 1-5's own equivalent "reopened submenu" bounce-tick
wrapper functions (`turn2SubmenuBounceTick`/`turn3SubmenuBounceTick`/
`turn4`'s and `turn5`'s own analogues, all in `battleScene.ts`/
`battleMenu.ts`) already apply via `... - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT`.
Turn 6 (S7 slice N) is the first turn whose FIGHT-submenu dispatch was
rebuilt from scratch (`docs/battle-turn-notes.md` §27's own "why turn 6
needed a NEW base function") and the per-submenu-open shift wrapper was
never re-added to the new dispatch chain — turns 7/8 then inherited the gap
by construction (`drawTurn7FieldBase`/`drawTurn8FieldBase` are thin regime
wrappers around the same `drawTurn6FieldBase`).

This constant ~2-RAM-tick-too-fast phase reference is **invisible almost
everywhere** in the browsing dwell (neighboring ticks share the same
quantized 0/1/2 `y2` plateau — each plateau is ~9 ticks wide, see "Why
period 9" below) and visible **only** at the sine-table plateau-crossing
ticks — which is exactly the named residual family. This is the same
mechanism `docs/turn3-residual-probe-notes.md`'s "Family B" already found
and fixed for turn 3's own reopened submenu ("a uniform, constant
one-RAM-tick-too-advanced phase reference... not a hardware quirk") — it
recurred here because turn 6's from-scratch dispatch simply didn't inherit
that established convention.

## Method

Reused the existing instrumentation verbatim, no new tooling needed:

- `tools/probe/ram-probe.py` (generic, already supports multi-hop `path`
  watches) with **`tools/probe/specs/turn5-menu-bouncer-raw.json`'s own
  watch list, copied unchanged** — it already resolves both bounce-driver
  sprites dynamically (`gBattleSpritesDataPtr` → `healthBoxesData[0]` →
  `{battlerBounceSpriteId,healthboxBounceSpriteId}` → `gSprites[id].data[]`)
  and their targets' resultant `y2` (`gBattlerSpriteIds`/
  `gHealthboxSpriteIds`-relative), so it needed zero changes to point at
  turn 6/8's own windows.
- New specs `tools/probe/specs/turn6-bounce-blip-raw.json` /
  `turn8-bounce-blip-raw.json`: **`segments` copied verbatim** from the
  already-committed `tools/compare/traces/turn6-menu.json` /
  `turn8-menu.json` (same script the green traces themselves replay),
  `startTick` 7300 / 9375 (covers 3+ ticks either side of every named pair
  in each turn).
- Run via `/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
  tools/probe/ram-probe.py <spec> <out>`, **twice independently, byte-
  identical both times** (`diff`, 0 bytes) — committed:
  `src/data/gen/turn6-bounce-blip-probe.json` (1047 ticks, 7300-8346),
  `src/data/gen/turn8-bounce-blip-probe.json` (1452 ticks, 9375-10826).
- Analysis: `tools/probe/verify-bounce-blip-rule.py` (plain `python3`, no
  mGBA needed) — replicates `menuIdleBounce`/`turn5SitrusResettledBounceTick`
  /`TURN8_REGIME3_TO_REGIME1_SHIFT` verbatim from the committed TS, run it
  directly to reproduce every number below.

## Raw RAM sanity checks (rule out a hardware quirk, same discipline as Family B)

- **Sampling convention** (`resultant y2(T) == bounceSin(sinIndex(T-1)) +
  amplitude`, both regions): **zero exceptions** anywhere in either probed
  window. The driver sprites' own raw state is fully self-consistent and
  unremarkable at every one of the 18 excluded ticks checked directly.
- **`sSinIndex` stall/skip check** (`+7 mod 256` every active tick):
  the ONLY genuine stall in either window is the **already-cataloged
  reopen-DMA-wait stall** (`verify-turn5-menu-bounce-rule.py`'s own finding,
  "a genuine 2-tick STALL... starting one tick after the reopen press
  registers") — here at ticks 7313→7314→7315 (onix `sinIndex` frozen at 68)
  and the healthbox driver frozen at 4 over the same span, turn 6's own
  reopen (press tick 7313). This stall **is not what causes the residual**
  (see the "shift=2 already matches reality at 7315-7316" row in the table
  below, computed from the real, stalled RAM values with no special-casing)
  — it just happens to sit at the front of the same periodic family. Past
  that one reopen transient, every step is a clean `+7`.

Conclusion: **no hardware-side anomaly anywhere** — exactly Family B's own
prior verdict, now confirmed to recur in the turn-6+ dispatch chain.

## The composed model, current code vs. the fix

`menuIdleBounce(t) = { onixY2: bounceSin(192+7n)+1, healthboxY2:
bounceSin(128+7n)+1 }` where `n` is derived from `t` through each turn's own
anchor chain (`turn5SitrusResettledBounceTick`, `TURN7_REGIME2_TO_REGIME1_
SHIFT`, `TURN8_REGIME3_TO_REGIME1_SHIFT` — all copied verbatim from
`battleScene.ts`). **Current code** feeds `bounceTick = t` into that chain
for the browsing branch of all three turns. **The fix** (already-existing
constant, zero new code): `bounceTick = t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT`
(2), scoped to the browsing branch only (`sm.confirmElapsed === null` and
past `revealTick`) — exactly mirroring how `turn3SubmenuBounceTick` etc.
already scope it for turns 1-5.

### Turn 6 — all 8 named ticks (real RAM vs current model vs fixed model)

| tick | real (onixY2, hbY2) | current model (shift=0) | fixed model (shift=2) |
|---|---|---|---|
| 7315 | (1, 0) | (1, **1** ✗) | (1, 0) ✓ |
| 7316 | (1, 0) | (1, **1** ✗) | (1, 0) ✓ |
| 7324 | (1, 1) | (**0**, 1) ✗ | (1, 1) ✓ |
| 7325 | (1, 1) | (**0**, 1) ✗ | (1, 1) ✓ |
| 7333 | (0, 1) | (0, **0** ✗) | (0, 1) ✓ |
| 7334 | (0, 1) | (0, **0** ✗) | (0, 1) ✓ |
| 7342 | (0, 0) | (**1**, 0) ✗ | (0, 0) ✓ |
| 7343 | (0, 0) | (**1**, 0) ✗ | (0, 0) ✓ |

**8/8 fixed, 0 new mismatches.**

### Turn 8 — all 10 named ticks

| tick | real (onixY2, hbY2) | current model (shift=0) | fixed model (shift=2) |
|---|---|---|---|
| 9383 | (1, 0) | (1, **1** ✗) | (1, 0) ✓ |
| 9384 | (1, 0) | (1, **1** ✗) | (1, 0) ✓ |
| 9392 | (1, 1) | (**0**, 1) ✗ | (1, 1) ✓ |
| 9393 | (1, 1) | (**0**, 1) ✗ | (1, 1) ✓ |
| 9402 | (0, 1) | (0, **0** ✗) | (0, 1) ✓ |
| 9403 | (0, 1) | (0, **0** ✗) | (0, 1) ✓ |
| 9411 | (0, 0) | (**1**, 0) ✗ | (0, 0) ✓ |
| 9412 | (0, 0) | (**1**, 0) ✗ | (0, 0) ✓ |
| 9420 | (1, 0) | (1, **1** ✗) | (1, 0) ✓ |
| 9421 | (1, 0) | (1, **1** ✗) | (1, 0) ✓ |

**10/10 fixed, 0 new mismatches.** Note turn 8's 5th pair (9420-9421)
repeats turn 6/8's own **1st-pair signature exactly** `(real=(1,0),
current=(1,1),fixed=(1,0))` — turn 8's window is one period-9 cycle longer
than turn 6's, and the cycle's own per-pair signature is byte-identical
across turns, not just same-cadence. This is the cross-turn family-identity
confirmation the brief asked for: not merely "same shape," but the **same
mechanism producing the same values** at the same phase-cycle position.

### Turn 7 — retrodiction only (no fresh RAM probe this session; internal model check)

Scanning the whole turn-7 browsing dwell (8320-8405) for ticks where
`shift=0` and `shift=2` predictions diverge: `[8325,8326, 8334,8335,
8343,8344, 8352,8353, 8361,8362, 8370,8371, 8380,8381, 8389,8390,
8398,8399]` — a clean, perfectly regular period-9 sequence. **The 4 named
excluded pairs (8352-8353/8361-8362/8370-8371/8380-8381) are an exact
contiguous subset** (the ones inside `turn7-menu.json`'s own committed
capture window) — `excluded ⊆ changed` holds with zero exceptions either
direction. Not RAM-confirmed directly this session (turn 6 + turn 8 were
the two RAM-probed turns per the brief's own cross-turn-identity method),
but the identical mechanism, identical cadence, and identical containment
relationship make turn 7 the same family beyond reasonable doubt — full RAM
confirmation is a trivial follow-up (reuse this exact method against
`turn7-menu.json`'s own script) if anyone wants the third direct probe.

## Why period 9 (the mechanism, not just the pattern)

`bounceSin` is 0 for `sinIndex%256` in `[0,63]∪[65,127]∪{128}`, `-1`→`y2=0`
for `[129,255]`, and the single index `64` gives the `+1` extremum
(`y2=2`). `sinIndex` advances **exactly `+7` per RAM tick** (RAM-confirmed
above, no stalls). Walking the ~64-wide sub-ranges `[0,63]`/`[65,127]` at
`+7`/tick crosses a plateau boundary roughly every `64/7≈9.1` ticks — the
observed cadence. Onix's driver seeds at `192` and the healthbox driver at
`128`, so their respective boundary crossings land on **different absolute
ticks**, which is why the excluded pairs alternate between the two regions
(exactly the brief's own observation) rather than always hitting both at
once. None of this is new: it is the identical shape `turn3-residual-probe-
notes.md`'s Family B already derived — this session's contribution is
showing turn 6+'s dispatch chain never inherited the correction.

## Pixel-diff fingerprint (cross-referenced against the existing dossier, not re-captured this session)

`docs/battle-turn-notes.md` §27 already recorded the oracle-vs-app diffs at
these exact ticks when they were first named: **1579px/4.11%** at
7315-7316, **769px/2.00%** at each of 7324-7325/7333-7334/7342-7343. §32/§33
record the same "2-4% each" order of magnitude recurring at turn 7/8's own
pairs. A 769px/2.00% diff on a 1-pixel `y2` error over an ~40px-wide,
~19px-tall on-field sprite/healthbox region (≈760px) is exactly the
expected magnitude for a single quantization step being wrong in one
region — consistent with (not merely "not contradicting") the RAM finding
above. Not re-captured fresh this session (the RAM-vs-model divergence
already fully explains the existing, already-measured pixel diffs; a fresh
oracle capture would only reproduce numbers already on file).

## Regression check: does the fix break anything currently green?

Restricted to each trace's own **pre-confirm browsing domain** (turn 6:
`t<7345`; turn 8: `t<9424`, i.e. before the confirm press's own hold/freeze
takes over — the fix is scoped to the browsing branch only, exactly as
turns 1-5's own wrapper is):

- **Turn 6**: 33 currently-captured ticks in [7300,7346]. `shift=0`
  (current): 0 mismatches (sanity check — matches the already-verified
  0-diff trace). `shift=2` (fixed): 0 mismatches, **except one ARTIFACT at
  tick 7307** — that tick is *before* `revealTick` (~7318), still inside
  `drawTurn6ActionMenuIdleWindow` (the plain idle menu, which correctly
  uses unshifted `t` — no submenu is open yet), so applying the browsing-
  only fix there is testing outside its own domain, not a real regression.
  Confirmed: the real fix must be scoped to the submenu-open branch only
  (`sm.openElapsed !== null && t >= revealTick`), never the pre-reveal idle
  branch — same scoping turns 1-5 already use.
- **Turn 8**: 34 currently-captured pre-confirm ticks. Both `shift=0` and
  `shift=2`: **0 mismatches**. Clean.

## The rule (not applied — engine changes are out of scope for this probe)

In `src/engine/battleScene.ts`, `drawTurn6FightSubmenuWindow` (~line 6688),
`drawTurn7FightSubmenuWindow`, and `drawTurn8FightSubmenuWindow` (~line
6973) each compute:

```ts
const bounceTick = sm.confirmElapsed !== null ? turnNKickoffBounceTick(t, TICK0 + sm.confirmElapsed) : t;
```

The `: t` branch (browsing, submenu open, not yet confirmed) should be `: t
- FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` (the constant already exists,
`battleMenu.ts:843`, already imported into `battleScene.ts`) — a
**one-token change per turn** (3 call sites), restoring all 18 directly-
RAM-confirmed ticks (turn 6 + turn 8) and, per the retrodiction above,
turn 7's own 8. Tier-1 pin: assert `menuIdleBounce` composed through each
turn's own chain matches the committed `turn6-bounce-blip-probe.json`/
`turn8-bounce-blip-probe.json` RAM dumps directly (same pattern
`tests/battleScene.test.ts` already uses for `turn3-menu-bouncer-raw-
probe.json`), at every probed tick, both regions, zero exceptions.

## Files committed this session

- `tools/probe/specs/turn6-bounce-blip-raw.json`,
  `tools/probe/specs/turn8-bounce-blip-raw.json` (probe specs, segments
  copied verbatim from the already-committed traces).
- `src/data/gen/turn6-bounce-blip-probe.json`,
  `src/data/gen/turn8-bounce-blip-probe.json` (RAM dumps, twice-run
  byte-identical).
- `tools/probe/verify-bounce-blip-rule.py` (the analysis script — run it
  directly to reproduce every number in this file).
- This file.

No `src/engine/` changes (out of scope per the brief). No `tools/compare/`
trace changed.

## Verification

`npm test` and `npm run build` unaffected (docs/probe/data-gen files only,
`src/engine/` untouched) — re-ran to confirm no regression, both green.

## Fix landed (S7 engine fix, 2026-07-21)

Re-ran `tools/probe/verify-bounce-blip-rule.py` first, per this file's own
policy: 18/18 named ticks reproduced exactly (shift=0 mismatches all 18,
shift=2 matches all 18, zero new mismatches) — the probe's rule confirmed
before touching code. Applied the one-token fix at all 3 call sites named
above (`battleScene.ts` ~6756/6849/7041, the browsing-branch `: t` ternary
arm changed to `: t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT`).

Restoring `captureFrames` surfaced that **not all 26 named ticks are
actually in the browsing branch's own domain** - `bounce-blip-notes.md`'s
own model check (above) computes the composed formula directly, without
checking whether the real per-tick dispatch has even reached the browsing
branch yet (past `revealTick`, before any confirm press). Pixel compare is
the ground truth the model check couldn't see:

- **turn6-menu.json**: restored 6/8 named ticks (7324-7325/7333-7334/
  7342-7343) + the separate 7348-7350 set (already-fixed per battle-turn-
  notes.md §28's bug-fix section, just unrestored) - **42/42, 0 diff** (33
  base + 9). **7315-7316 excluded** (unexpected fail, kept excluded per the
  brief's own instruction): both ticks land BEFORE `revealTick` (~7318),
  still inside the pre-reveal idle window (`drawTurn6ActionMenuIdleWindow`),
  not the browsing branch this fix touches - filed as ISSUES #29.
- **turn7-menu.json**: restored 6/8 named ticks (8352-8353/8361-8362/
  8370-8371) - **91/91, 0 diff** (85 base + 6). **8380-8381 excluded**
  (unexpected fail): `turn7-menu.json`'s own script presses `A` at 8378-8380
  (the ROCK_SLIDE confirm) - these two ticks land just past that press,
  inside the confirm/kickoff branch (`turn7KickoffBounceTick`), not the
  browsing branch either. The retrodiction above assumed the whole
  8320-8405 dwell was browsing without checking for a confirm press inside
  it; this is exactly where that assumption breaks. Filed as ISSUES #29
  (same entry, different sub-family).
- **turn8-menu.json**: restored all 10/10 named ticks - **86/86, 0 diff**
  (78 base + 10, after also excluding the analogous pre-reveal pair
  9383-9384 - filed as ISSUES #29, third confirmation of the reopen-window
  family alongside turn 6's own 7315-7316).

Tier-1 pins added (`tests/battleScene.test.ts`, "ISSUES #28 fix" describe
block): the browsing-model formula (with the shift) matches the committed
`turn6-bounce-blip-probe.json`/`turn8-bounce-blip-probe.json` RAM dumps
exactly at 3 restored ticks per turn (7324/7333/7342, 9392/9402/9411), and
a companion pin proves the pre-fix (unshifted) formula would have
mismatched at those same ticks - the fix is load-bearing, not a no-op.
`TURN8_REGIME3_TO_REGIME1_SHIFT` exported (one word) so the test can
reproduce turn 8's own regime composition directly instead of re-deriving
it.

Regressions: zero. Full rerun clean at committed/expected counts -
`turn6-featherdance.json` 90/90, `turn6-feathers.json` 106/106,
`turn6-statfall.json` 127/127, `turn8-bind-a.json` 256/256, `turn8-bind-
b.json` 66/66, `turn5-menu.json` 42/42, `turn6-rockslide-a.json` 255/255,
`turn6-rockslide-b.json` 105/105, `turn7-rockslide-a.json` 256/256,
`turn7-rockslide-b.json` 256/256, `turn7-rockslide-c.json` 256/256,
`turn7-rockslide-d.json` 19/19. `npm test` **861/861** (+4). `npm run
build` green.

## S7 worktree probe: ISSUES #29 (2026-07-21, oracle/RAM only — no engine code)

### Verdict: BOTH families ROOT-CAUSED. Same mechanism as #28 (a missing `FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT`), recurring one dispatch branch earlier than #28's own fix touched. Modelable rule for each, verified with zero regressions on every RAM-covered neighboring tick.

#28's fix scoped `FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` to the **post-reveal
browsing** ternary arm only (`sm.confirmElapsed === null`, past `revealTick`).
Restoring `captureFrames` surfaced 6 ticks just *outside* that domain, filed
as two sub-families here. Both turn out to be the **identical missing-shift
shape**, just living in a different function each:

- **Family A** (`turn6-menu.json` 7315-7316, `turn8-menu.json` 9383-9384):
  the **pre-reveal idle window** — `drawTurn6ActionMenuIdleWindow` (turn 6)
  and `drawTurn7RockSlideTurnEndSettledMenu` (reused unchanged by turn 7 AND
  turn 8's own pre-reveal branch) — is called identically for two different
  real states that the function itself can't distinguish: **(a)** genuinely
  idle, no reopen press yet (`sm.openElapsed === null`, correctly unshifted)
  and **(b)** reopen pressed, waiting for the submenu to redraw
  (`sm.openElapsed !== null && t < revealTick`, which should be shifted the
  same way the post-reveal browsing branch is, but isn't). The dispatcher
  (`drawTurn6/7/8FightSubmenuWindow`) already has these as two separate `if`
  blocks — both currently call the idle-window function the same unshifted
  way.
- **Family B** (`turn7-menu.json` 8380-8381): `turn7KickoffBounceTick`'s own
  pre-freeze branch (`t < pressTick + FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY`)
  `return`s plain `t` — the exact same unshifted-`t` shape the browsing
  ternary had before #28's fix, just one function over (the confirm/kickoff
  bounce wrapper instead of the browsing arm itself). Lands right after the
  ROCK_SLIDE confirm press (`TURN7_ROCKSLIDE_PRESS_TICK`'s own doc,
  `battleMenu.ts:2054`, states the real confirm pressTick outright: **8379**
  — "the confirm press occupies frames 8378-8379, matching `confirmFightMove`'s
  own `elapsed+1` registration convention").

### Method

Same discipline as the #28 probe:

- **Family A**: reused the already-committed `src/data/gen/turn6-bounce-blip-
  probe.json` / `turn8-bounce-blip-probe.json` RAM dumps verbatim (already
  twice-run byte-identical by the #28 probe, cover ticks 7300-8346 /
  9375-10826 — both windows already include the pre-reveal range, no new RAM
  probe needed).
- **Family B**: turn 7 had no prior RAM probe (the #28 probe's own doc
  flagged turn 7 as retrodiction-only). New spec
  `tools/probe/specs/turn7-bounce-blip-raw.json` — `segments` copied
  verbatim from `tools/compare/traces/turn7-menu.json` (the same script the
  green trace itself replays), `watch` list copied verbatim from
  `turn6-bounce-blip-raw.json` (the same dynamic driver-resolving spec both
  #28 probes already used), `startTick: 8370`. Run via
  `/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
  tools/probe/ram-probe.py tools/probe/specs/turn7-bounce-blip-raw.json
  <out>`, **twice independently, byte-identical both times** (`diff`, 0
  bytes) — committed: `src/data/gen/turn7-bounce-blip-probe.json` (1011
  ticks, 8370-9380).
- **Branch-aware dispatch reading FIRST** (the brief's own requirement, and
  the #28 probe's own blind spot): read `drawTurn6/7/8FightSubmenuWindow`'s
  actual `if` chain in `src/engine/battleScene.ts` (~6738-7050) before
  writing any model, to identify which function renders each tick and what
  its real bounce-tick argument is — not just the composed closed-form
  formula in isolation (exactly the mistake that produced #28's own
  overclaim).
- **Analysis**: `tools/probe/verify-issues29-rule.py` (plain `python3`, no
  mGBA needed, imports `verify-bounce-blip-rule.py`'s own primitives by path
  rather than re-copying them) — run it directly to reproduce every number
  below. It caught its own first-draft bug: an initial family-A model reused
  the turn6/8 **browsing**-branch chain (`turn5SitrusResettledBounceTick`)
  for turn 8's idle case too, which is wrong — turn 8's own pre-reveal
  branch actually reuses turn 7's `drawTurn7RockSlideTurnEndSettledMenu`
  verbatim, whose real chain is `turn7RockSlideResettledBounceTick` (a
  different anchor, `TURN7_ROCKSLIDE_PRESS_TICK`/`_MENU_REDRAW_DELAY`, not
  `TURN5_SITRUS_MENU_REDRAW_TICK`). The bug surfaced as an outright FAIL
  (turn 8's excluded-pair check failed even at shift=2), not a false PASS —
  caught before being reported here, not after.

### Family A: RAM vs current model (shift=0) vs fixed model (shift=2)

Both regions' `y2`, `real(T) = probed y2 at RAM tick T-1` (the established
+1 render lag, same convention #28's own tables use).

**Turn 6** (`turn6-bounce-blip-probe.json`, already-committed dump; pressTick
7313 — RAM-confirmed: `onixSinIndex`/`healthboxSinIndex` both frozen across
RAM ticks 7313-7315, the already-cataloged reopen-DMA-wait stall):

| tick | real (onix,hb) | shift=0 (current) | shift=2 (fixed) | phase |
|---|---|---|---|---|
| 7301-7305 | (0,0) | (0,0) ✓ | — (pre-press, untested) | idle, no press |
| 7306-7307 | (1,0) | (1,0) ✓ | (0,0) ✗ if misapplied | idle, no press — **shift=2 here is the exact #28-noted artifact** |
| 7308-7314 | (1,0) | (1,0) ✓ | (1,0) ✓ | ambiguous (both match; pressed, pre-reveal) |
| **7315-7316** | **(1,0)** | **(1,**1**) ✗** | **(1,0) ✓** | pressed, pre-reveal — **the named excluded pair** |
| 7317-7322 | (1,1)/(1,1) | ✓ | ✓ | ambiguous (both match) |

**Turn 8** (`turn8-bounce-blip-probe.json`, already-committed dump; pressTick
~9380, within the ISSUES-cited 9380-9382 reopen-press window):

| tick | real (onix,hb) | shift=0 (current) | shift=2 (fixed) |
|---|---|---|---|
| 9376-9382 | (1,0) | ✓ | ✓ (ambiguous band) |
| **9383-9384** | **(1,0)** | **(1,**1**) ✗** | **(1,0) ✓** |
| 9385-9396 | (1,1)→(0,1) | ✓ | ✓ |

**The rule**: `shift = FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT if t >= pressTick else
0` — i.e., **the shift should key off `sm.openElapsed !== null` (the reopen
having registered at all), not off `t >= revealTick`** (a later, purely
cosmetic threshold for when the submenu's *content* redraws — the underlying
bounce-driver phase reference doesn't care about that boundary). Since
`sm.openElapsed !== null` is only ever true once `t` has already reached
`pressTick` (state is monotonic, set once and never unset within a window),
`t >= pressTick` is trivially implied by `sm.openElapsed !== null` at the
call site — **no new constant or threading of `pressTick` into the idle-
window functions is needed**; the fix is exactly "pass a shifted `t` from
the `sm.openElapsed !== null && t < revealTick` branch, unshifted `t` from
the `sm.openElapsed === null` branch," mirroring the two `if` blocks already
in each dispatcher.

Verified by `verify-issues29-rule.py`'s window scans: **0 mismatches** for
turn 6 (scan [7303,7322]) and turn 8 (scan [9376,9390]) under this exact
rule, including the pre-press sanity tick 7307 (which must — and does —
stay unshifted, confirming the fix must not apply before `openElapsed` goes
non-null, the precise scoping #28's own regression check already flagged as
required).

### Family B: RAM vs current model (shift=0) vs fixed model (shift=2)

**Turn 7** (`turn7-bounce-blip-probe.json`, freshly probed this session;
pressTick 8379, source-cited in `battleMenu.ts:2054`'s own comment):

| tick | real (onix,hb) | shift=0 (current) | shift=2 (fixed) |
|---|---|---|---|
| 8379 | (0,1) | ✓ | ✓ |
| **8380-8381** | **(0,1)** | **(0,**0**) ✗** | **(0,1) ✓** |
| 8382-8391 | (0,0) | ✓ | ✓ |

**The rule**: in `turn7KickoffBounceTick`'s pre-freeze branch (`t < pressTick
+ FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY`), return `t -
FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` instead of plain `t` — the exact same
one-token fix shape #28 already applied to the browsing ternary, just in
this sibling function. The post-freeze branch (`return
TURN6_ROCKSLIDE_PRESS_TICK + TURN6_ROCKSLIDE_MENU_REDRAW_DELAY`, a fixed
constant) is shift-invariant by construction, so it can never regress from
this change — confirmed by the full in-domain scan (`t` in
[8379,8391]) showing **0 mismatches** under the fix, including every tick
past the freeze boundary.

Note this pre-freeze branch is structurally identical across all three
kickoff wrappers (`turn6KickoffBounceTick`/`turn7KickoffBounceTick`/
`turn8KickoffBounceTick`, `battleScene.ts` ~6509/6817/7012) — turn 6/8's own
analogues were **not** RAM-probed this session (out of scope: ISSUES #29
only names turn 7's 8380-8381 in this branch; turn 6/8's post-confirm ticks
were already validated 0-diff by #28's own fix). If turn 6/8's kickoff
wrappers have the same bug, it's simply not yet visible in either turn's own
currently-captured window — flagged as an open question, not claimed fixed
or ruled out here.

### Files committed this session

- `tools/probe/specs/turn7-bounce-blip-raw.json` (new probe spec, `segments`
  copied verbatim from `tools/compare/traces/turn7-menu.json`, `watch`
  copied verbatim from `turn6-bounce-blip-raw.json`).
- `src/data/gen/turn7-bounce-blip-probe.json` (RAM dump, twice-run
  byte-identical, 1011 ticks, 8370-9380).
- `tools/probe/verify-issues29-rule.py` (the analysis script — run it
  directly to reproduce every number in this section; PASS/FAIL gated,
  exits 1 on any regression).
- This section.

No `src/engine/` changes (out of scope per the brief — sibling worker owns
`battleScene.ts` this round). No existing `tools/compare/` trace changed.

### Verification

`npm test` and `npm run build` unaffected (docs/probe/data-gen files only,
`src/engine/` untouched) — re-ran to confirm green, see below.

## Fix landed (S7 engine slice R rung (a), 2026-07-21)

Re-ran `tools/probe/verify-issues29-rule.py` first, per policy: both
families PASS (0 mismatches on every scanned window) before touching any
engine code.

Applied both rules named above:

- **Family A**: `drawTurn6ActionMenuIdleWindow` and
  `drawTurn7RockSlideTurnEndSettledMenu` each gained an optional
  `bounceTick`/`bounceRawTick` parameter (default `t`, so every existing
  unshifted caller — the genuinely-idle `openElapsed === null` branch, and
  `drawTurn6RockSlideWindow`/`drawTurn7RockSlideWindow`'s own post-redraw
  settled-menu calls — is unaffected). The two dispatchers'
  `sm.openElapsed !== null && t < revealTick` branches
  (`drawTurn6FightSubmenuWindow`, `drawTurn8FightSubmenuWindow`) now pass
  `t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` explicitly, mirroring the shift the
  browsing ternary one branch below already applies. `drawTurn7FightSubmenuWindow`'s
  own analogous branch (calling `drawTurn6RockSlideTurnEndSettledMenu`) was
  **not** touched — it isn't named in this probe's evidence (no excluded
  Family-A-shaped tick in `turn7-menu.json`) and the regression sweep below
  shows no diff there either, so it stays unmodified per the "no pixel
  evidence, no change" rule.
- **Family B**: `turn7KickoffBounceTick`'s pre-freeze branch now returns
  `t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` instead of plain `t`.

Restored `captureFrames` for all 6 named ticks and reran:

- **turn6-menu.json**: **44/44, 0 diff** (42 base + 7315/7316).
- **turn7-menu.json**: **93/93, 0 diff** (91 base + 8380/8381).
- **turn8-menu.json**: **88/88, 0 diff** (86 base + 9383/9384).

Tier-1 pins added (`tests/battleScene.test.ts`, "ISSUES #29 fix" describe
block, 6 tests): each family's fixed formula matches the committed
`turn6-/turn7-/turn8-bounce-blip-probe.json` RAM dumps exactly at all 6
restored ticks, each paired with a companion pin proving the pre-fix
(unshifted) formula would have mismatched at those same ticks — the fix is
load-bearing, not a no-op. `TURN7_REGIME2_TO_REGIME1_SHIFT` and
`turn7KickoffBounceTick` exported so the test exercises the real production
code instead of re-deriving it.

**Open flag resolved (not by code change, by evidence):** turn 6/8's own
kickoff wrappers (`turn6KickoffBounceTick`/`turn8KickoffBounceTick`) share
Family B's exact code shape but were flagged unprobed. Full regression
sweep post-fix shows their own kickoff windows (`turn6-featherdance.json`,
`turn8-bind-a.json`/`turn8-bind-b.json`) at **0 diff, unchanged counts** —
no evidence of the same bug surfacing in either turn's currently-captured
range, so left as-is (still not proven bug-free for ticks outside those
captures, just not preemptively changed without pixel evidence).

Regressions: zero. Full rerun clean at committed/expected counts —
`turn6-featherdance.json` 90/90, `turn6-feathers.json` 106/106,
`turn6-statfall.json` 127/127, `turn6-rockslide-a.json` 255/255,
`turn6-rockslide-b.json` 105/105, `turn7-feathers.json` 16/16,
`turn7-rockslide-a.json` 256/256, `turn7-rockslide-b.json` 256/256,
`turn7-rockslide-c.json` 256/256, `turn7-rockslide-d.json` 19/19,
`turn8-bind-a.json` 256/256, `turn8-bind-b.json` 66/66, `turn8-feathers.json`
33/33. `npm test` **871/871** (+6). `npm run build` green.

ISSUES #29 deleted in this docs commit.
