# ISSUES #56 item 1 remainder: naming the canonical anchor route's +6 ready-lag term

Side-lane, investigation-only step. No `src/` changes — production still
discriminates on `isCanonicalAnchorIntro` exactly as before
(`battleScene.ts:4266-4270`). New files only: this doc plus the probe script
`tools/probe/dump-canonical-anchor-readylag-ram.py`.

## Inherited state

`generatedPlayerReadyLagSpeciesFormula` (`98 + cryDurationTicks(playerSpecies)`,
plus the player's own visual lag) is exact (0-tick residual) on GRIMER/
KADABRA/DELCATTY (`docs/intro-cry-shadow-evidence.md` Part 1) and on a fresh
synthetic ONIX `factoryLegal` lab fixture
(`docs/onix-readylag-destin-bench-probes.md` Probe 1: predicts 179, observes
179 — exact). The one canonical anchor route (`interactive-generated-intro-off`,
`battle1-intro.json` replay, DESTIN/GROVYLE vs the player's own ONIX lead)
needs a flat `GENERATED_PLAYER_READY_LAG = 185`, a clean +6 over the same
formula's 179 prediction for the identical ONIX lead — and Probe 1 already
proved the +6 is **route-specific, not ONIX/cry/species-specific** (ONIX
obeys the formula exactly off that one route). This step's brief: find the
named mechanism behind the +6 by reading RAM on the canonical route itself,
not another synthetic fixture.

## Method

New probe `tools/probe/dump-canonical-anchor-readylag-ram.py` re-derives the
exact segment list `interactive-generated-intro-off.json` replays
(`battle1-intro.json`'s own first 34 segments + the committed 98-wait/2-A/
400-wait tail — read directly from both JSON files, nothing hardcoded) and
drives it frame-by-frame from the same canonical `factory-battle-scene-off`
bootstrap every other RAM probe in this tree uses. It records, every frame
from 900 onward, `gBattleControllerExecFlags` (`battle_main.c:156`, a
per-battler busy bitmask) and `gBattleSpritesDataPtr->healthBoxesData[0/1]`'s
bitfields (`struct BattleHealthboxInfo`, `battle.h:553-578`) — `ballAnimActive`,
`waitForCry`, `bgmRestored`, `healthboxSlideInStarted`,
`triedShinyMonAnim`/`finishedShinyMonAnim`. Battler 0 is the player (ONIX),
battler 1 is the opponent (GROVYLE, confirmed by Probe 2's own bench dump and
by this run's own ball-throw-timing ordering). Ground truth, not a pixel
inference: this is the identical state machine
(`Intro_TryShinyAnimShowHealthbox`, `battle_controller_opponent.c:292-383`
and its player-side twin `battle_controller_player.c:979-1063`) the existing
code comments already cite as the mechanism.

Run: `python3 tools/run-mgba-probe.py /tmp/issue56-plus6/ram-series.json --
tools/probe/dump-canonical-anchor-readylag-ram.py
/tmp/issue56-plus6/ram-series.json` (scratch output, not committed).
`canonicalScreenSha256` matched the tree's standard OFF/ON-shared bootstrap
hash before any frame was recorded.

## RAM series (oracle-absolute frame numbers — this trace's own numbering,
which is exactly `generatedBattleIntroSourceClock`'s `t`, since
`GENERATED_BATTLE_INTRO_SOURCE_CLOCK_ORIGIN`(1048) equals this trace's own
`captureWindow.start`)

**Opponent (battler 1, GROVYLE) release, frames 1455-1575:**

| Frame | `execFlags` | `b1.ballAnimActive` | `b1.slideInStarted`/`triedShiny` | Event |
| --- | --- | --- | --- | --- |
| 1458 | 0 | 0 | 0 | idle gap before release |
| **1459** | 2 | **1** | 0 | opponent ball-throw begins — matches `handoffTick` prediction (`1459 = 1459`) exactly |
| 1553 | 2 | 0 | 1→0 | healthbox slide-in / shiny-check completes |
| 1554 | 2 | 0 | 0 | `triedShinyMonAnim`/`finishedShinyMonAnim` reset (next callback, `introEndDelay=3` armed) |
| **1558** | **0** | 0 | 0 | `OpponentBufferExecCompleted` fires (exec bit clears) — `1554+3=1557`, checked next frame, off by the same ±1 this whole investigation already treats as rounding noise |
| 1559 | 0 | — | — | `gBattleControllerExecFlags==0` gate open |
| **1560** | 1 | — | — | player bit sets — predicted `dispatchTick = handoffTick(1459) + dispatchDelay(101, GROVYLE baseline) = 1560`. **Exact match.** |

**Player (battler 0, ONIX) release + ready, frames 1560-1748:**

| Frame | `execFlags` | `b0.ballAnimActive`/`waitForCry` | `b0.slideInStarted`/`triedShiny` | Event |
| --- | --- | --- | --- | --- |
| 1560 | 1 | 0 / 0 | 0 | player's "Go! ONIX!" ball-throw sub-command dispatched |
| **1570** | **0** | 0 / 0 | 0 | ball-throw sub-command completes — predicted `throwVisibleTick = dispatchTick(1560) + visualLag(11, "Go! ONIX!"=9 chars) = 1571`; RAM shows the command boundary one frame earlier, same ±1 class |
| **1571** | **1** | 0 / 0 | 0 | next command (`Intro_TryShinyAnimShowHealthbox` player twin) begins — **exact match to the 1571 prediction** |
| 1733 | 1 | 0 / 0 | 1→0 | healthbox slide-in / shiny-check completes |
| 1734 | 1 | 0 / 0 | 0 | shiny flags reset, `introEndDelay=3` armed |
| **1738** | **0** | 0 / 0 | 0 | `PlayerBufferExecCompleted` fires (exec bit clears) — the real cry-wait-gate mechanism's own completion tick |
| 1739-1740 | 0 | — | — | idle (gate open, nothing dispatched yet) |
| **1741** | **3** | — | — | `CONTROLLER_CHOOSEACTION` dispatched to **both** battlers (turn-order/action-selection setup) |
| **1744** | **1** | — | — | opponent's own AI resolves its action instantly; only the player's bit remains set — the player is now the *sole* remaining input the engine is waiting on |
| 1746 | 1 | — | — | (pixel-only, from Round 7's own dense-diff, not this probe) full menu-box "onset" bbox change |

## Mechanism verdict: **(a) — named mechanism, real, previously unmodeled**

The species formula's own prediction from RAM's `throwVisibleTick`(1571):
`1571 + 98 + cryDurationTicks(ONIX=70) = 1739`. RAM's actual cry-wait-gate
completion (`PlayerBufferExecCompleted`, tick **1738**) matches that
prediction to within **1 tick** — the identical ±1 rounding-class residual
already documented for GRIMER/KADABRA/DELCATTY (`docs/intro-cry-shadow-
evidence.md`'s own "98 vs 99" note). **This directly answers the brief's
discriminating question: the real sprite-callback/cry-wait handoff does
NOT fire 6 ticks late on this route.** It fires at exactly the tick the
species formula already predicts. Probe 1's "route-specific" verdict was
correct about *where the discrepancy isn't* (not ONIX, not cry data, not a
per-species term) but the mechanism itself was still unnamed until this
probe read the actual controller-completion tick instead of inferring it
from pixels.

The +6 lives entirely **after** that real completion, in two further real,
RAM-confirmed engine steps neither the 3-species calibration nor Probe 1's
own landmark ("menu box begins to change") appear to have measured past:

1. **Frames 1738→1741 (+3): post-completion `CHOOSEACTION` dispatch
   latency.** The engine's own `gBattleControllerExecFlags==0` polling gate
   sits idle for 2-3 frames before the next command dispatches (the
   opponent's own analogous gap, 1558→1560, is 2 frames — same class, not
   species-dependent, not this route's own quirk: it is the same "outer
   state-loop polls once per VBlank" latency the code comment at
   `battleScene.ts:4183-4184` already cites for the opponent's own dispatch).
2. **Frames 1741→1744 (+3): opponent Factory-AI action-resolution latency.**
   `CONTROLLER_CHOOSEACTION` is dispatched to *both* battlers simultaneously
   (`execFlags` briefly reads 3); the opponent's own AI resolves its action
   near-instantly (3 frames) while the player's bit stays set, since only the
   player's choice requires real input. This is a genuine, previously
   unnamed additive term: the menu is not truly "player-exclusive-input
   ready" until the AI side has also resolved, 3 ticks after dispatch.

`1738 + 3 + 3 = 1744`, and separately `1459 (handoffTick) + 101 (dispatchDelay)
+ 185 (flat GENERATED_PLAYER_READY_LAG) = 1745` — one tick off 1744, the same
±1 class as every other anchor comparison in this table. **The flat 185
constant is not a bookkeeping fudge or a mis-anchored "press tick" — it is
a more complete prediction than the quarantined species formula, because it
happens to include this real dispatch+AI-resolution tail that the formula
never modeled.**

## What is still open (why this is not a full fix)

Resolved by the main-lane follow-up below. The mechanism is shared, but its
duration is not a universal six ticks; production therefore retains the
route-level term.

## Main-lane follow-up: staged `factoryLegal` controller tail (2026-08-01)

The reusable watcher now accepts either its original canonical replay (no
fixture argument) or a complete legal `factoryLegal` fixture. The committed
same-player-species fixture is
`tools/battle-lab/factory-onix-readylag-off.json`, exactly the Probe-1 recipe
formerly recorded only in scratch: ONIX/ELEKID/NOSEPASS versus
COMBUSKEN/POLIWHIRL/KRABBY, trainer 49, seed 42, Scene OFF. The already
full-window-pixel-validated YOSHI fixture was also run as a cross-check.

Reproduce through the validated wrapper, allocating a fresh output path for
each run:

```sh
probe_dir="$(mktemp -d)"
python3 tools/run-mgba-probe.py "$probe_dir/yoshi.json" -- \
  tools/probe/dump-canonical-anchor-readylag-ram.py "$probe_dir/yoshi.json" \
  tools/battle-lab/factory-arbitrary-intro-yoshi-off.json
python3 tools/run-mgba-probe.py "$probe_dir/onix.json" -- \
  tools/probe/dump-canonical-anchor-readylag-ram.py "$probe_dir/onix.json" \
  tools/battle-lab/factory-onix-readylag-off.json
```

Exact `gBattleControllerExecFlags` transitions:

| Route / player lead | Player completion (`1→0`) | `CHOOSEACTION` both (`0→3`) | Opponent AI clear (`3→1`) | Tail |
| --- | ---: | ---: | ---: | ---: |
| Canonical anchor / ONIX | 1738 | 1741 | 1744 | +3 / +3 |
| Staged YOSHI / GRIMER | 1847 | 1850 | 1853 | +3 / +3 |
| Staged ONIX / ONIX | 1885 | 1888 | 1890 | +3 / +2 |

All three routes share the source mechanism: player
`Intro_TryShinyAnimShowHealthbox` completion clears bit 0, the main battle
loop later dispatches `CONTROLLER_CHOOSEACTION` to both battlers (flags 3),
then Factory AI clears opponent bit 1 while the player input bit remains.
YOSHI reproduces the canonical +3/+3 timing exactly. But the staged ONIX
case—using the same player species as the canonical route—resolves the AI
phase in two ticks, not three. That falsifies a universal fixed +3/+3 tail;
the AI phase is data/decision dependent even though its controller transition
is universal.

**Verdict: non-universal duration.** Keep `isCanonicalAnchorIntro`'s current
ready-lag route term. Folding a fixed six ticks into
`generatedPlayerReadyLagSpeciesFormula` would misname variable AI work and
would move the already-proven staged formula away from its pixel landmarks.
No trainer/species/route/tick selector and no production change follows from
this result. A future generic semantic seam would need to expose an actual
AI-resolution completion event (or run the real staged AI controller) rather
than encode one fixed duration.

## PAPERCUTs

- None worth flagging this step — the existing RAM-probe pattern
  (`tools/probe/dump-battle2-party-ground-truth.py`'s bootstrap/segment-replay
  convention) transferred cleanly to a plain segments-replay (non-`factoryLegal`)
  fixture with no tooling friction.
