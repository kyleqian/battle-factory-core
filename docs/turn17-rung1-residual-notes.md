# turn17-rung1 residual notes (side lane, 2026-07-31)

Bounded step per the assigned brief. Two parts: (1) confirm the `appRoute`
papercut fix's status on the seven `turn17-rung*.json` traces, (2) attribute
`turn17-rung1.json`'s 28 mismatching frames. **No `src/` edits** — read-only
source investigation to name the mechanism, per the brief's "characterize,
NOT a fix" scope.

## Part 1 — appRoute papercut: already fixed, nothing to do

`712ab295` ("fix(#39 rank-9 follow-up): add missing appRoute to
turn17-rung1..6 traces") already landed this exact fix and is an ancestor of
this worktree's `HEAD` (`git merge-base --is-ancestor 712ab295 HEAD` ->
true). All seven files already carry `"appRoute": "canonical-recorded"` at
line 2. No trace edit was made this step — editing already-correct files
would be a no-op diff.

Fresh verification this session (`npm run compare -- <trace> --summary`),
all seven RUN (no crash) at exactly the numbers entry 791/`712ab295` recorded:

| trace | matched/total |
| --- | --- |
| turn17-rung1.json | **90/118** (pre-existing, this doc's subject) |
| turn17-rung2.json | 221/221 exact |
| turn17-rung3.json | 143/143 exact |
| turn17-rung4.json | 200/200 exact |
| turn17-rung5.json | 113/113 exact |
| turn17-rung6a.json | 255/255 exact |
| turn17-rung6b.json | 41/41 exact |

Note for the record: `turn17-rung1.json` has no `oracleProfile` field, so
per `AGENTS.md`'s historical-trace rule it stays an **ON**-profile trace
(manifest confirms `"oracleProfile": "battle-scene-on"`,
`oracleUrl: http://127.0.0.1:8012`) — this is its established contract, not
something this step changed or should change.

## Part 2 — rung1's 28 frames

### Exact window

`npm run compare -- tools/compare/traces/turn17-rung1.json tools/compare/out/rung1-fresh`
mismatches **frames 21774-21801 inclusive** (28 contiguous frames; frame
21773 and frame 21802 both match exactly, `diffPixels: 0`). This is not
scattered — it is one single contiguous cluster.

Cross-checking the trace's own `segments` (cumulative-sum of `frames`, `A`
i.e. button-press segments only):

```
segment 126: A-press, lands frame 21773 -> 21774   (submenu reopen)
segment 127: 28-frame wait                          (== exactly this window)
segment 128: A-press, lands frame 21801 -> 21802   (move confirm)
```

The mismatch window is **exactly** bounded by two scripted button presses —
not an arbitrary slice of a longer animation.

### Per-cluster pixel table

| frames | count | diffPixels | bbox (minX,minY)-(maxX,maxY) | ssimMean | note |
| --- | --- | --- | --- | --- | --- |
| 21774-21778 | 5 | 362 | (20,30)-(221,103) | 0.9920 | FIGHT/BAG/POKÉMON/RUN box still on screen |
| 21779-21782 | 4 | 398 | (20,30)-(221,133) | 0.9901 | mid-transition to MOVE list |
| 21783-21785 | 3 | 1974 | (20,30)-(229,133) | 0.9320 | MOVE-list box-open transition (peak) |
| 21786-21791 | 6 | 398 | (20,30)-(221,133) | 0.9898 | settled MOVE list, steady mismatch |
| 21792 | 1 | 1974 | (20,30)-(229,133) | 0.9240 | one-frame spike, same shape as the 21783-85 peak |
| 21793-21794 | 2 | 911 | (20,30)-(221,133) | 0.9631 | transitional between spike and steady state |
| 21795-21801 | 7 | 398 | (20,30)-(221,133) | 0.9898 | settled MOVE list, steady mismatch (unchanged through end of window) |

All figures from `tools/compare/out/rung1-fresh/manifest.json` (regenerated
this session). The 1974px spikes (21783-85, 21792) sit inside the box-open
redraw itself — plausibly a cursor-highlight or box-edge blink riding on top
of the main residual, not independently investigated further (would need
its own probe; not blocking the attribution below since the *steady-state*
398px cluster is present on both sides of it with the same two sub-regions).

### What actually differs (pixel-level, both sub-clusters present in every mismatched frame)

Two disjoint regions merge into the reported bbox:

1. **`(20,30)-(99,37)`** — MURKROW's (opponent, top-left) status badge.
   Oracle renders a clean "BRN" badge (burn status, orange oval). The app
   renders a garbled/mispositioned badge overlapping the HP-bar's rounded
   left edge for the same 28 frames.
2. **`(187,91)-(221,103)`** in the early frames, later including the PP
   line once the MOVE list is shown — MAGBY's (own, bottom-right) HP
   number and, once the MOVE list opens, FIRE PUNCH's PP count.
   - Oracle: `79/138` HP, PP `14/15`, throughout.
   - App: `138/138` HP (full), PP `15/15` (full/never-used), throughout.

Both sub-clusters appear together in frame 21774 (before the MOVE list even
opens — the FIGHT/BAG/POKÉMON/RUN box is still on screen) and both persist,
unchanged, through frame 21801. Both self-correct **simultaneously and
without further input** the instant frame 21802 renders (the tick core.ts
processes the second, move-confirming, A-press). This "two unrelated fields
flip together, on a fixed input boundary, with no interpolation" shape is
the key diagnostic fact used to rule out the known families below and to
name the mechanism.

Screenshots backing this (regenerated, not committed — reproduce command
below): `tools/compare/out/rung1-fresh/{app,oracle}-{21773,21774,21783,21801,21802}.png`.

### Family exclusion

- **Not (i) idle-bounce phase** (`docs/idle-bounce-phase-attribution.md`,
  turns 9/11/12's pre-move menu-idle oscillator). That family's bbox
  signature is `44,49-99,110` (battler) / `127,74-229,110` (healthbox) and
  it is a *periodic* misalignment — RAM-proven exact oscillator, wrong
  **phase anchor**, producing "non-monotonic small-tick alignment noise"
  across many ticks with *no discrete correct/incorrect boundary*. Our
  residual is a **discrete, input-bounded jump** between two flat plateaus
  (wrong for 28 ticks, then instantly right) with a bbox
  (`20,30`-`229,133`) that doesn't match either idle-bounce region, and it
  is turn 17, not turns 9-12.
- **Not (ii) ISSUES #5** (mon-pic close-window WIN0V cycle-timing jitter,
  bbox signature `x88-151`, rental/draft-screen mon-pic close animation
  only). Unrelated screen (in-battle FIGHT submenu, not the draft/rental
  mon-pic close), unrelated bbox (`x20-229`, much wider, includes content
  outside `x88-151`), unrelated content (HP/PP/status text, not a WIN0
  window-blend boundary).
- **Not (iii) ISSUES #38-style one-frame register race** (`BLDALPHA` one
  VBlank early, exactly one tick, a sub-tick hardware-register visibility
  artifact). Our residual is **28 contiguous frames**, not one, and the
  content itself (HP number, PP number, status badge) is not a
  hardware-register/palette-blend field — it's plain text/sprite content
  computed from app state.
- **(iv) Genuinely uncharacterized app defect — root cause identified, not fixed** (see below).

### Root cause (source-read, not RAM-probed — the boundary was unambiguous from pixel + segment evidence alone)

This trace's window is drawn by `drawTurn16FightSubmenuWindow`
(`src/engine/battleScene.ts:16405-16728`), specifically the
`terminalResolution !== null` branch (this window is the reopened
action-menu *for turn 17*, gated behind turn 16's already-populated
`terminalResolution`).

The freshly reopened `FightSubmenuState` for turn 17 is created by
`openFightSubmenu` (`battleMenu.ts:1011-1019`), which **always** sets
`confirmElapsed: null` on open. It only becomes non-null when
`confirmFightMove` (`battleMenu.ts:1035-1038`) runs on a later A-press —
here, that's segment 128's press, landing frame 21802. So
`sm.confirmElapsed === null` (hence the local `confirmTick === null`) for
the *entire* 21774-21801 span, by construction.

Inside `drawTurn16FightSubmenuWindow`'s `terminalResolution !== null`
branch, the dispatch is: several `if (confirmTick !== null && ...)` message
branches (lines 16418-16614), all skipped while unconfirmed, falling
through to the final default at **lines 16616-16636**:

```ts
drawTurn5SitrusSettledMenuChrome(fb);
drawFightSubmenuChrome(
  fb, sm.displayCursor,
  false, false, sm.activeMonMoveset,
  false, false, false, false, false, false, false, false, false, false, false,
  true,
);
```

`turn1Resolved` through `turn14Resolved` are **hardcoded `false`** here
(not threaded from the real `BattleSceneState`), only the trailing
`turn16Resolved` argument is hardcoded `true`. `drawFightSubmenuChrome` ->
`currentPPForActiveMon` (`battleScene.ts:7757`) uses these flags to
reconstruct FIRE PUNCH's current PP from its usage history; with every
turn1-14 flag forced false, it computes PP as "never used" — **15/15** —
instead of the real **14/15**. This is exactly the `turnNResolved`/PP-
reconstruction state-field chain already named as open architectural debt
in PROGRESS-archive entry 792's inventory ("the state-field chain
(turnNResolved/PP reconstruction)").

The HP/status half of the symptom traces to the *same* fallback path one
call earlier: `drawTurn16PostSwitchField` (line 16464-16474) is called with
`resolutionAge` computed from `animationAge`/`faintDismissElapsed`, which is
`null` whenever `confirmTick === null` (same precondition as above) — so
the call's HP-override (`targetHp = {startHp: 79, endHp: 27}`) and
opponent-status-override (`{hp: 58, status: "burn"}`) arguments both
collapse to `undefined`/`null` for this window:

```ts
drawTurn16PostSwitchField(
  fb, partyElapsed, bounceTick, t,
  resolutionAge ?? TURN16_SETTLED_OWNED_AGE,
  resolutionAge === null ? undefined : targetHp,        // <- undefined here
  resolutionAge === null ? null : { hp: 58, status: "burn" },  // <- null here
  ...
);
```

Without an explicit override, `drawTurn16PostSwitchField` falls back to
whatever its own internal default battler state is — full HP, no burn
badge — rather than MAGBY's/MURKROW's real settled pre-turn-17 state (79/138
HP, MURKROW burned). `targetHp.startHp === 79` in the surrounding code is
itself independent confirmation that **79 is the known, named, correct
value** for this exact moment — the override argument exists and is
correct, it's just gated off (`resolutionAge === null`) during precisely
the span this trace captures.

Both defaults are literally hardcoded/gated-off in the same branch and both
correct simultaneously once `confirmTick !== null` (the earlier branches
starting line 16418 take over and read the real `terminalResolution`
fields) — this is why HP, PP, and the status badge all flip together at
frame 21802 with no interpolation, matching the observed evidence exactly.

**This is a real, reproducible app content defect** (not a timing/phase or
hardware-cycle artifact): whenever this legacy `canonical-recorded` turn-17
submenu is reopened-but-not-yet-reconfirmed with `terminalResolution`
already populated, the app renders wrong PP (via the hardcoded-false
`turnNResolved` chain) and wrong HP/status (via the ungated `resolutionAge
=== null` fallback in `drawTurn16PostSwitchField`'s call) for as long as the
player takes to press A again. Not independently RAM-probed — the
before/after pixel evidence (frame 21773 correct -> instant flip at 21774,
exactly on the scripted A-press -> instant correction at 21802, exactly on
the next scripted A-press, both boundaries matching `FightSubmenuState`'s
own `openElapsed`/`confirmElapsed` semantics read directly from source) left
no ambiguity to resolve with a live memory probe.

### Named next action (not implemented — out of scope for this step)

In `drawTurn16FightSubmenuWindow`'s `terminalResolution !== null` branch,
lines 16616-16636's `drawFightSubmenuChrome` call and lines 16464-16474's
`drawTurn16PostSwitchField` call both need the *real* pre-turn-17 settled
state threaded through instead of the hardcoded/gated defaults, for the
`confirmTick === null` (not-yet-reconfirmed) case specifically — i.e. supply
`turn1Resolved..turn14Resolved` from the true resolved-flag chain (or the
already-known settled PP count) and always pass MAGBY's real settled HP
(79) / MURKROW's real settled status (`burn`) rather than gating those
behind `resolutionAge !== null`. Both call sites are self-contained to this
one function; no state-shape change should be needed. Whoever picks this up
should re-run `turn17-rung1.json` (expect 118/118 if this is the whole
residual) plus the five other rung* pins (rung2-6b, currently exact) to
confirm no regression, since `drawFightSubmenuChrome`/
`drawTurn16PostSwitchField` are shared with other call sites.

## Reproduce

```sh
# fresh run + manifest with per-frame bbox/diffPixels/ssim
npm run compare -- tools/compare/traces/turn17-rung1.json tools/compare/out/rung1-fresh
python3 -c "
import json
m = json.load(open('tools/compare/out/rung1-fresh/manifest.json'))
for f in m['frames']:
    if f['diffPixels'] > 0:
        print(f['frame'], f['diffPixels'], f['bounds'])
"

# segment->frame boundary cross-check
python3 -c "
import json
t = json.load(open('tools/compare/traces/turn17-rung1.json'))
cum = 0
for seg in t['segments']:
    start = cum; cum += seg['frames']
    if seg.get('buttons'): print(start, cum, seg['buttons'])
"

# the other six rungs, all exact
for f in rung2 rung3 rung4 rung5 rung6a rung6b; do
  npm run compare -- tools/compare/traces/turn17-$f.json --summary
done
```
