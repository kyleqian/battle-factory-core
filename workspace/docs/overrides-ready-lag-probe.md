# `overrides.parties` ± differential: ready-lag +7 probe (side lane, 2026-08-14)

**Verdict: staging is innocent — offsets all zero**, in all three tested
differentials, across two independent script reruns.

## Context

`docs/trainer-pic-off-window-scout.md` round 11 / `PROGRESS.md` 1261 found
that `generatedBattleStartCommandReady`'s formula-predicted ready frame runs a
flat **+7 ticks early** relative to the oracle's own menu-open frame, in the
final 53 frames of the `factory-round-battle7-noland-reveal-off` compare
(647-700). The same +7 reproduced identically in an independent
`PUPITAR`/`DELCATTY` oracle-only probe
(`tools/battle-lab/factory-mechanic-pupitar-delcatty-readylag-probe.json`)
with a completely different `dispatchDelay` (67 vs. 86 ticks) — ruling out a
species/cry-proportional cause. What both +7-reproducing fixtures share
instead: **both stage their oracle party via `overrides.parties`**
(`mechanicLab` / `factoryBrain`-with-pinned-parties), while all three
previously-validated 0-residual ready-lag points
(GRIMER/YOSHI, KADABRA/SHIZUKA, DELCATTY/MAGNETON) use real `factoryLegal`
rental generation with no override. Round 11 named this correlation but did
not run a controlled differential to test it — that's this probe's job.

## Method

`tools/probe/probe-overrides-ready-lag.ts` builds a minimal ± pair per
scenario:

1. **Base**: an unstaged real-generation run (`factoryLegal` for the two
   mechanicLab differentials, or a bare `factoryBrain` request for the third)
   with `preCheckpointCaptureAllFrames: true`, so the dense send-out→ready
   window is captured sha256-by-frame. The postcheckpoint frame-0 capture's
   `state.parties.player`/`.opponent` is read back — this is the ROM's own
   generated roster (species, level, nature, IVs, EVs, moves, PP Ups, item,
   ability slot, friendship, gender, shininess, exact personality).
2. **Pinned**: the identical route (same `trainerId`/`playerSetIds`/
   `opponentSetIds`/`challengeNum`/`battleNum`/`seed`, or the same
   `challengeNum`/`playerSetIds`/`seed` for `factoryBrain`), restaged through
   `overrides.parties` set to byte-for-byte the base run's own echoed roster
   (only the fields the builder accepts — `species`, `level`, `nature`,
   `ivs`, `evs`, `moves`, `ppUps`, `item`, `abilitySlot`, `friendship`,
   `gender`, `shiny`, `personality` — dropping the echo's extra derived
   fields like `experience`/`pp`/`ability`/`types`/`stats`/`otId`/`status`/
   `checksumValid`), also with `preCheckpointCaptureAllFrames: true`.

Because both parties are identical between base and pinned, every downstream
battle event should be pixel- and tick-identical too; any per-frame sha256
delta in the dense capture stream is then attributable to the staging
mechanism alone.

Diffing works on **content transitions** (frames whose sha256 differs from
the previous frame's), not raw per-frame position, because the long static
runs between events (holding on an unchanging screen) make per-frame offset
search ambiguous — any nearby frame's sha is indistinguishable from its
neighbors during a hold. The script first checks the transition *value*
sequences match 1:1 (same content, same order) between base and pinned — if
they don't, that's flagged as a content divergence, not a timing-only
comparison, and the offset table is not trustworthy. If they do match, each
transition's offset is `pinnedFrame - baseFrame`, collapsed into contiguous
segments. The script separately reports the exact `generatedBattleStartCommandReady`-style
ready-gate frame (first frame where semantic state shows
`playerControllerCommand==18 && controllerExecFlags==1`, the same predicate
`trainer-pic-off-window-scout.md` §A already validated) for both runs.

## Scenarios tested

1. **`factoryLegal-vs-mechanicLab`** — the `oracle/BATTLE_LAB.md` example
   request (`trainerId 50`, `challengeNum 0`, `battleNum 0`,
   `playerSetIds [156,149,180]`, `opponentSetIds [188,184,135]`,
   `seed 305419896`) vs. the same route through `mechanicLab` with
   `overrides.parties` pinned to the echoed roster (species 95/240/153 vs.
   278/198/17).
2. **`factoryLegal-vs-mechanicLab-matched-+7-route`** — the *exact* route
   tuple the already-published `factory-mechanic-pupitar-delcatty-readylag-
   probe.json` used for its `mechanicLab` side (`trainerId 109`,
   `challengeNum 2`, `battleNum 0`, `playerSetIds [267,268,269]`,
   `opponentSetIds [349,353,292]`, `seed 70`) — the specific route depth
   where the +7 was actually observed, not just an arbitrary one. (The
   generated roster here, species 316/322/108 vs. 82/368/354, is not the
   PUPITAR/DELCATTY pin used by that probe — `factoryLegal`'s free RNG walk
   computes its own roster — but that's fine: this differential only needs
   base and pinned to match *each other*, which they do by construction.)
3. **`factoryBrain-vs-factoryBrain+overrides`** — a bare `factoryBrain`
   request (`challengeNum 2`, `playerSetIds [267,268,269]`, `seed 70`, no
   override — the ROM's own `FillFactoryBrainParty` opponent plus real
   rental-generated player) vs. the same request restaged with
   `overrides.parties` pinned to that run's own echoed roster. This is the
   step-3 "same ± differential inside `factoryBrain` mode" the brief asked
   for, reached within the session's time budget.

## Results (offset tables)

All three: **every transition-index segment reports offset `+0`**; ready-gate
frames match exactly between base and pinned; `content-identical transition
sequence: true` in all three (so these are genuine timing-only comparisons,
not content mismatches masquerading as a match).

| Scenario | base frames | pinned frames | transitions | ready frame (base → pinned) | offset |
| --- | --- | --- | --- | --- | --- |
| `factoryLegal-vs-mechanicLab` | 2007 | 2007 | 1101 | 1866 → 1866 | **+0** everywhere |
| `factoryLegal-vs-mechanicLab-matched-+7-route` | 2007 | 2007 | 1144 | 1871 → 1871 | **+0** everywhere |
| `factoryBrain-vs-factoryBrain+overrides` | 4137 | 4137 | 1681 | 4028 → 4028 | **+0** everywhere |

Reran the script twice (`node --experimental-strip-types tools/probe/probe-
overrides-ready-lag.ts --brain`); both runs produced byte-identical verdict
lines (the oracle is deterministic, as expected):

```
factoryLegal-vs-mechanicLab: staging is innocent — offsets all zero
factoryLegal-vs-mechanicLab-matched-+7-route: staging is innocent — offsets all zero
factoryBrain-vs-factoryBrain+overrides: staging is innocent — offsets all zero
```

## Interpretation

**`overrides.parties` staging is not the cause of the +7.** Pinning a party
through the builder produces a pixel- and tick-identical timeline to the ROM
generating that exact same party itself — true for an arbitrary early-battle
route, true at the *exact* route depth (`challengeNum 2`, `trainerId 109`)
where the +7 was actually observed, and true even applying the override
*inside* `factoryBrain` mode against its own no-override baseline. This rules
out the round-11 hypothesis as stated: the staged window is not unfaithful
because of the staging mechanism, and the compare fixture's own oracle ground
truth (through `overrides.parties`) is not corrupted by construction-route
artifacts of the kind suspected.

This also narrows what round 11's step-3 fallback ("the next distinguishing
variable is `factoryBrain` mode vs. `factoryLegal` mode itself") can mean:
since `overrides.parties` presence/absence is proven inert *within*
`factoryBrain` mode too (differential 3), a residual `factoryBrain`-vs-
`factoryLegal` gap — if one exists — is not an overrides artifact either; it
would have to come from something structurally different between the two
route families themselves (e.g. a different pre-battle dialogue path, a
different pacing constant, or the Brain's own aggression/AI setup timing),
not from how the party got into RAM. This probe did not test a direct
`factoryBrain`-vs-`factoryLegal` differential (the two modes take different
request shapes — no shared `trainerId`/`battleNum`/`opponentSetIds` — so
there is no single "same scenario ± mode" construction the way there is for
"same scenario ± overrides"); that remains open for whoever picks up the +7
next.

The +7's real owner is therefore most likely either (a) an error in the
`readyTick = throwVisible + 98 + cryDurationTicks(player)` formula itself
(a constant that needs recalibrating, universally, not per-route) or (b)
something specific to the Brain-battle / late-challenge route family that
is not the override mechanism — not a harness-only artifact of `overrides.
parties` construction. Closing it is out of this probe's scope; this
differential's job was only to clear (or convict) the staging mechanism,
and it clears it.

## Reproduce

```sh
node --experimental-strip-types tools/probe/probe-overrides-ready-lag.ts          # primary two mechanicLab differentials
node --experimental-strip-types tools/probe/probe-overrides-ready-lag.ts --brain  # + the factoryBrain differential
```

Exit code `0` = all differentials innocent (offsets all zero); `1` = at least
one differential is guilty (a non-zero offset segment); `2` = at least one
differential is inconclusive (base/pinned content itself diverged, not just
timing — would mean the ± pair wasn't actually minimal, e.g. a mistake in
route-tuple matching).
