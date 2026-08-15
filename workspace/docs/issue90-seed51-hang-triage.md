# ISSUES #90 triage — seed 51 "HANG" at `resolution:presenting`

**Verdict up front: this is not a hang.** Seed 51 (policy `full`) is not stuck
on either side — engine or driver. It is an ordinary, crash-free, fully
deterministic playthrough that simply needs more frames than the soak
driver's fixed 300,000-frame budget (`DEFAULT_RUN_OPTIONS.maxFrames`,
`tools/soak/randomRoundSoakDriver.ts:738`) to finish. Given a larger budget
it completes cleanly with no throw, no retry, no special intervention —
just more ticks of the exact same button presses the driver was already
sending. The "stuck at `resolution:presenting`, battle 1 turn 14" report is
a snapshot of ordinary mid-turn presentation, caught mid-flight by an
undersized budget, not a frozen state.

## Evidence

All runs below use the production `runSeed(51, { policy: "full", ... })`
path (same code the CLI/soak sweep uses), `--render-every 0` for speed;
render cadence was confirmed not to affect outcome.

**Baseline repro (matches the filed symptom exactly):**
```
$ npm run soak -- --seed 51 --max-frames 300000 --render-every 0
seed   51  HANG   b1 t14  300000f  7.0s  stuck at resolution:presenting
```

**Same seed, larger budget — completes cleanly, no crash:**
```
$ npm run soak -- --seed 51 --max-frames 361500 --render-every 0
seed   51  OK     b1 t26  361216f  8.5s  roundLost
```

**Binary search on the budget** (fresh, isolated `runSeed` calls per value,
`collectDiagnostics: true`) shows the trajectory is one continuous,
monotonically-advancing timeline — not two different runs:

| maxFrames | outcome | battle/turn (round-relative) | surface |
| --- | --- | --- | --- |
| 60,000 | HANG | b1 t93 | `command:party-handoff` |
| 220,000 | HANG | b1 t31 | `prebattleRoom:fadingIn` (mid round-transition) |
| 260,000 | HANG | b1 t21 | `factorySwap:summaryFade` (won battle 1 of a later round) |
| 299,950 | HANG | b1 t14 | `resolution:presenting` |
| 300,000 | HANG | b1 t14 | `resolution:presenting` (identical to 299,950 — same instant) |
| 305,000 | HANG | b1 **t23** | `resolution:presenting` — turn already advanced 9 steps past the "stuck" turn 14 |
| 320,000 | HANG | b2 t15 | new battle (battle 1 was **won**) |
| 361,000 | HANG | b1 t26 | `factoryTerminal` (round already lost, in the post-round grace window) |
| 361,500 | **OK** | b1 t26 | `roundLost` — clean finish, no crash |

Two important confirmations from this table:
1. **`b1`/`battleIndex` is round-relative, not session-relative.** The
   `RandomPlayer`'s `battle`/`turn` counters (`tools/soak/
   randomRoundSoakDriver.ts:309-328`) reset whenever
   `orch.round.rules.battleIndex` resets, which happens on every in-session
   round chain (`factoryRoundChaining.ts`). "Battle 1 turn 14" is battle 1
   of whichever round is active when the budget runs out — by frame
   ~299,585 seed 51 has already played through several complete rounds
   (≥8 successful draft confirmations observed by frame 362,000, i.e. at
   least that many chained rounds), each costing tens of thousands of
   frames (draft + up to 3 battles + postwin dialogue + terminal).
2. **The state at frame 300,000 is bit-for-bit the same regardless of what
   budget the run was given** (299,950 and 300,000 agree exactly; runs with
   larger budgets pass through the same point and keep going). There is no
   `Date.now()`/`Math.random()`/other non-determinism in `src/engine/core.ts`
   or the driver (confirmed by grep) — the "different" snapshots at
   different budgets in the table above are just later points on the same
   deterministic timeline, not divergent runs.

**Turn-14 resolution itself is unremarkable.** It's a voluntary switch
(`action: POKEMON` → `party: confirm row 0`, logged at frame 299,677)
entering `resolution:presenting` to show the switch-in. By frame 305,000
(5,323 frames later) the turn counter is already at 23 — i.e. the
presentation this specific probe caught mid-message resolved and normal
play resumed within an ordinary number of frames. Nothing about turn 14 is
special; any of dozens of turns sampled at the 300,000-frame cutoff would
have looked identically "stuck" by the same accounting artifact (the
driver's turn counter only updates while `battleCommandPresentation` is
non-null, so it visibly freezes for the whole span any resolution/postwin/
swap/terminal presentation is on screen, even though real progress is
happening underneath).

## Answers to the triage questions

**1. Exact frame the surface last changes, and what it's waiting for.**
There isn't one — it doesn't stop changing. At the current 300,000-frame
cutoff the driver happens to be inside a switch-in `resolution:presenting`
phase (entered frame 299,677); given a few thousand more frames it
transitions normally. There is no fixed frame at which the state machine
is genuinely blocked; "resolution:presenting" is a transient, unremarkable
phase like the hundreds of others this seed passes through, not a special
gate.

**2. Which side is stuck: engine or driver?**
Neither. The engine keeps satisfying every wait; the driver keeps sending
exactly the inputs (`pressAdvance` A/B mashing) that unblock each phase, as
it was already doing before the budget ran out. There is no missing
receipt, no unopened prompt, no unsent input. This rules out both branches
of the open question in the STEP brief: it is not a `#88`-adjacent
continuation/receipt stall that falls into an unsatisfiable wait (that
class of bug throws — see `#88`'s fix and `#89`'s
`BattleScript_EffectBatonPass` crash — it does not silently hang), and it
is not an input-gate deadlock (the driver's `onResolution`/`onCommand`
logic never leaves a surface un-handled here; every phase seed 51 visits
already has a covered branch in `RandomPlayer`).

**3. Precise stall condition, and is it player-reachable?**
There is no stall condition to name — this is a throughput/budget issue,
not a state condition. The mechanism that makes seed 51 *slow* rather than
typical: the `full` policy's exploration model resamples a fresh
choice on almost every decision re-entry (e.g. `onVoluntaryParty` nulls
`partyIntent` after *every* submenu confirm or cancel —
`tools/soak/randomRoundSoakDriver.ts:551-569` — so a single voluntary
switch decision can bounce through many open/cancel cycles before landing),
and in-session round chaining is unbounded by default (no
`stopAtFirstRoundDecision`), so a seed whose random terminal choices keep
declining RECORD chains through many complete rounds back-to-back within
one soak "seed" run. Seed 51 happens to roll both: heavy submenu wandering
*and* a long chain of rounds, pushing its natural completion out to
~361,200 frames — about 20% over budget. A real human player exploring
menus this indecisively for ~361,000 frames (~100 minutes at 60 fps) in a
single soak "session" is not a realistic scenario; this is an artifact of
the `full` policy's undirected random-walk exploration combined with a
fixed global budget sized for typical seeds, not a game-logic condition a
player would ever trigger.

**4. Fix recommendation.**
Not an engine fix — there is no engine bug. Recommended shape, for a fix
worker or the supervisor to choose between:
- **Minimal/safe:** raise `DEFAULT_RUN_OPTIONS.maxFrames` in
  `tools/soak/randomRoundSoakDriver.ts:738` past seed 51's observed
  completion point (361,216 frames) with margin — e.g. 450,000–500,000 —
  and correct the now-stale comment at `tools/soak/
  randomRoundSoakDriver.ts:737` (it claims 300,000 "comfortably covers the
  deepest observed default-sweep seed," which this triage falsifies for
  the `full` policy).
- **Alternative (larger, a design call, not "minimal"):** bound
  round-chaining depth per soak seed (e.g. an explicit "stop after N
  chained rounds" option similar in spirit to the existing
  `stopAtFirstRoundDecision`), so worst-case frame cost per seed is capped
  independent of policy luck. This changes what the unbounded sweep
  measures (multi-round chaining coverage vs. single-round robustness) and
  is best left to the supervisor to decide, not bundled into a one-line
  budget bump.

**Smallest repro for a fix worker to pin:**
- Regression trigger (currently HANG, should read as a "budget too small"
  case, not a real defect): `runSeed(51, { policy: "full", maxFrames:
  300_000 })` → `HANG` at `resolution:presenting`.
- Proof it isn't a real stall (currently OK once given room): `runSeed(51,
  { policy: "full", maxFrames: 361_500 })` → `OK`, `roundLost`, settles at
  frame 361,216. `361_500` is the tightest budget confirmed to complete
  (360,000 and 361,000 still read `HANG` — mid post-round grace window;
  361,500 is over the line). A fix pin should use a comfortably larger
  round number (e.g. 400,000) rather than this exact edge, both runs take
  ~7-9s.

**5. Does any other seed in 0:60 share this mechanism?**
Not currently — the wind-down full soak that filed this issue already
establishes seed 51 is the *only* HANG in `--seeds 0:60`, and the
`vanilla` policy (which has none of the `full` policy's undirected
submenu-wandering or BAG/RUN noop exploration) is a clean 20/20 OK in the
same session, consistent with this being a `full`-policy-specific
exploration-cost effect rather than a general engine risk. That said, the
*mechanism* (unbounded round-chaining × undirected exploration cost) is a
property of each seed's random walk, not something structurally unique to
51 — so it is a latent risk for any wider `full`-policy sweep (e.g.
`60:120`), not something today's 0:60 data can rule out for seeds beyond
that range. This reasoning is why the recommended fix should raise the
budget with real margin rather than just enough to clear seed 51.

## What this changes about the original framing

The STEP brief's open question — "(a) presentation wait that never
completes ... or (b) an input-gate deadlock" — presupposed a genuine
stall. Neither branch holds. The correct classification is a third case
the brief didn't list: **soak-harness budget insufficiency** (a false
"HANG" from a fixed frame cap, not a game or driver defect). No `src/`
change is warranted; the fix belongs entirely in `tools/soak/
randomRoundSoakDriver.ts`.
