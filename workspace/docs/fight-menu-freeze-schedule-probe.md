# Fight-menu freeze schedule — battle-1 ground-truth probe (ISSUES #81)

Answers ISSUES #81's open question from
`docs/fight-menu-chrome-ground-truth.md` §8.1: does the oracle apply the
**same** piecewise bounce-index freeze schedule in battle-1's own fight-menu
windows (the windows that pin the app's current single-2-tick-opening-freeze
constant), or is the torment fixture's 4/1/1 schedule route-dependent?

**Verdict: (b) ROUTE-DEPENDENT.** Battle-1's own fight-menu windows do **not**
show the torment fixture's 4-frame fight-opening freeze. The battle-1 oracle
starts its bounce cleanly at the action-menu opening (0-frame freeze), pauses
the bounce for a **2-frame** freeze at the submenu-open DMA-wait, and applies
two separate **1-frame** freezes at the B-close. The torment fixture's
schedule (4-frame opening + 1-frame message-entry + 1-frame reopen-tail) is
therefore not universal — a MAIN bind should not change the shared
fight-opening freeze constant, because battle-1's own windows (which pin that
constant) show no such 4-frame opening freeze.

---

## 1. Method

Two battle-1 ground-truth traces were replayed through the Battle Scene OFF
oracle with dense captures over the three fight-menu phase boundaries:

- `tools/compare/traces-groundtruth/battle1-fight-submenu-idle.json` (41
  battle-1 segments verbatim + 251-frame idle pad, captureFrames dense over
  the action-menu opening ~1748, the submenu open 1886-1892, and the settled
  submenu idle).
- `tools/compare/traces-groundtruth/battle1-fight-submenu-nav.json` (same
  prefix + FIGHT submenu open, nav loop, and B-close at 2046-2047).

Committed scratch mirrors (same segments, `captureFrames` = every tick
1742-1761 / 1884-1899 / 2040-2071, 68 captures each):

- `tools/battle-lab/scratch-fight-menu-bounce-b1.json` (idle prefix)
- `tools/battle-lab/scratch-fight-menu-bounce-b1-nav.json` (nav prefix)

Two independent measurements agree exactly:

1. **RAM probe** (`tools/probe/specs/battle1-fight-menu-bounce-idle.json` /
   `battle1-fight-menu-bounce-nav.json`, via `ram-probe.py`): read the
   invisible `SpriteCB_BounceEffect` driver sprite's `sSinIndex` directly
   (`gBattleSpritesDataPtr -> healthBoxesData[0] -> healthboxBounceSpriteId ->
   gSprites[id].sSinIndex`, seed 128) plus the target healthbox sprite's `y2`
   every tick 1740-2139. The driver's recorded value is post-advance, so the
   index actually applied at RAM tick T is `recorded(T) - 7`.
2. **Pixel probe** (the brief's stated method): from the oracle PNGs, measure
   the player-healthbox top edge at a fixed x column. The whole healthbox
   translates vertically by `y2`; the topmost green-field row (82,107,99) at
   x=200 sits at screen y `74 + y2`. Validated byte-exact against the RAM
   probe's `healthboxY2` on every sampled frame (0 mismatches, both traces).

Fitting: `y2 = Sin(index, 1) + 1 = (gSineTable[index] >> 8) + 1` with
`gSineTable` a literal copy of `src/trig.c`'s 256-entry Q8.8 table
(`tools/probe/verify-bounce-blip-rule.py`'s copy), and the app/bounce clock
`index = seed + 7*(ramTick - 1748)` (`menuIdleBounce`'s anchor) with screen
tick S showing RAM S-1 (the established +1 render lag).

Determinism: both RAM probes re-run clean; both scratch traces replay with 0
sha mismatches; the verify script passes on two fresh runs.

## 2. Per-boundary measured tables (battle-1, healthbox driver)

### 2a. Action-menu opening (RAM setup tick 1748)

| screen | RAM | measured y2 | applied index | model index (no freeze) | offset |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1748 | 1747 | 0 | — | — | — |
| 1749 | 1748 | 1 | 128 (seed) | 128 | 0 |
| 1750 | 1749 | 0 | 135 | 135 | 0 |
| 1751 | 1750 | 0 | 142 | 142 | 0 |

The bounce starts **cleanly at the seed** — `index = 128 + 7*(ramTick-1748)`
from the very first frame. **No freeze (0 frames).** This is the app's
battle-1 pin (`commandMenuBounceY2`/`menuIdleBounce`), byte-exact. If the
torment 4-frame fight-opening freeze were universal, the battle-1 oracle
would show a 4-frame index hold here (e.g. index stuck at 128 through screen
1752); it does not.

### 2b. Submenu-open DMA-wait (A-press 1886-1887, submenu reveal 1892)

| RAM | recorded driver sSinIndex | applied index | expected (no freeze) | freeze? |
| ---: | ---: | ---: | ---: | --- |
| 1887 | 84 | 77 | 77 | no |
| 1888 | 84 | 77 | 84 | **freeze 1** |
| 1889 | 84 | 77 | 91 | **freeze 2** |
| 1890 | 91 | 84 | 98 | resumed (index now 2 frames behind) |
| 1891 | 98 | 91 | 105 | resumed |

**2-frame freeze** at RAM 1888-1889 (screen 1889-1890), during the FIGHT
submenu's DMA-wait. After it, the index trajectory is permanently shifted
2 frames behind the no-freeze clock — the freeze is observable as a phase
shift on ~8-9 captured screens in-window (1896/1897, 2042/2043, 2060/2061,
…; verify script check 2).

### 2c. B-close (B press 2046-2047, action menu resumes) — nav trace only

| RAM | recorded driver sSinIndex | applied index | expected (no freeze) | freeze? |
| ---: | ---: | ---: | ---: | --- |
| 2048 | 173 | 166 | 166 | no |
| 2049 | 173 | 166 | 173 | **freeze 1** |
| 2050 | 180 | 173 | 180 | resumed |
| 2051 | 180 | 173 | 187 | **freeze 2** |
| 2052 | 187 | 180 | 194 | resumed |

Two **1-frame freezes** at RAM 2049 and 2051 (the B-close → resumed-action-
menu transition).

## 3. Comparison with the torment fixture's schedule (§8.1)

| boundary | torment fixture | battle-1 |
| --- | --- | --- |
| fight/menu opening freeze | **4 frames** (736-739, `oracleBF = n+9`) | **0 frames** (clean seed start at 1748) |
| message-entry / submenu-open freeze | **1 frame** (767, `oracleBF = n+7`) | **2 frames** (1888-1889 DMA-wait) |
| reopen / close-tail freeze | **1 frame** (reopen-tail, `oracleBF = n+6`) | **1 frame + 1 frame** (2049, 2051) |

The battle-1 oracle does not reproduce the torment fixture's 4/1/1 pattern:
its opening has no freeze at all, and its submenu-open freeze is 2 frames
(not 1). The schedule is **route-dependent**.

## 4. Implication for the MAIN bind (ISSUES #81 close)

- The app's current battle-1 constant (single 2-tick opening freeze,
  `commandMenuBounceY2(age)` = `menuIdleBounce(MENU_DRAW_TICK + age)`) is
  **correct for battle-1**: the battle-1 oracle's action-menu opening starts
  the bounce cleanly and matches the pinned constant exactly.
- The torment fixture's residual frames (736, 766, 977) therefore come from
  a **route-specific** schedule, not a wrong shared constant. The MAIN bind
  should either (a) make the freeze schedule route/state-dependent (the
  torment route's 4/1/1 vs battle-1's 0/2/1+1), or (b) stage the torment
  fixture's `idleBounceElapsed`/entry-phase to land on the observed oracle
  index — it must **not** change the shared fight-opening freeze constant,
  since that would regress battle-1's pinned windows.
- Regression surface for adopting the *battle-1* schedule (0/2/1+1) on the
  generated route: the captured frames inside the 2-frame submenu-open
  freeze (screen 1889-1890) and the phase-shifted screens after it
  (1896-1897, 2042-2043, 2060-2061, … in both battle-1 specs), plus the two
  B-close freeze frames (screens 2050, 2052) in the nav spec.

## 5. Artifacts

- `tools/battle-lab/scratch-fight-menu-bounce-b1.json` (new scratch trace)
- `tools/battle-lab/scratch-fight-menu-bounce-b1-nav.json` (new scratch trace)
- `tools/probe/specs/battle1-fight-menu-bounce-idle.json` (new RAM probe spec)
- `tools/probe/specs/battle1-fight-menu-bounce-nav.json` (new RAM probe spec)
- `tools/probe/verify-fight-menu-freeze-schedule.py` (new; rerun:
  `python3 tools/probe/verify-fight-menu-freeze-schedule.py` — replays both
  scratch traces fresh, re-derives the pixel y2, and checks the freeze
  schedule matches §2's tables; PASS on two consecutive fresh runs)
- This doc.

No `src/`, `tests/`, `PROGRESS.md`, or `ISSUES.md` edits (side-lane rule).
