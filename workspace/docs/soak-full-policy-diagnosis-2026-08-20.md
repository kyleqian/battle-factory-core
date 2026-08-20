# Why `full` never wins a round — 2026-08-20 (Milestone M-B step 1)

Read-only diagnosis of the M-A finding (`docs/soak-depth-measure-2026-08-19.md`):
`full` policy, seeds 0:60, reaches carry >= 7 (a completed 7-battle round) in
**0/60** seeds, while `vanilla` (plainer play) reaches it in 16/60 (26.7%) and
`winning` in 64/180 (35.6%). Per the M-B brief, this session answers *why*
before changing anything in `src/`, `tools/`, or `tests/`. All instrumentation
below was scratch-added to `tools/soak/randomRoundSoakDriver.ts` (env-var-gated
ablation toggles + an opt-in `collectRoundCensus` hook) and a scratch script
`tools/soak/_scratch_census.ts`, and **fully reverted** before this commit —
`git diff master@{u}..HEAD --stat` for this commit touches only docs/
PROGRESS.md.

## Time-box note

The step's 50-minute cap was mostly spent on: (1) reading the round/postwin/
orchestrator source to establish ground truth for what a RETIRE choice
actually does to engine state (needed to know what to instrument), (2)
building and revert-safety-checking the instrumentation, (3) running the
measurements. To fit the cap, **seed ranges are 0:30, not 0:60**, for both the
census and all four single-ablation runs (rates below are per-30, not
per-60); ablation **E (all four combined) did not run** — say so explicitly,
per the brief. `npm run test:smoke` (444 tests) confirmed the scratch edits
were behavior-neutral (env vars unset) before they were reverted.

## Part 1 — per-round termination census (`full`, seeds 0:30, honest instrumentation)

Method: `runSeed()` gained an opt-in `collectRoundCensus` hook (default off,
zero behavior change) that watches engine state directly — not just
`ActionLog` text — for two edges per round-attempt: `state.pendingGeneratedRound`
flipping non-null→null (marks the start of a fresh round attempt, so a seed
that re-chains many times gets one record per attempt, not one per seed), and
`round.rules.phase` first becoming `"roundLost"`/`"roundComplete"` (the ONLY
two phase values `resolveRoundBattle()` ever sets — confirmed by reading
`roundController.ts:490-511`; `resolution.outcome === "loss"` is required,
i.e. this can only fire from a genuine in-battle result). At that edge it
records `battleIndex`, `faintedCount`/`hpList` from `lastBattle.playerParty`
(the `hp`/not `currentHp` field — `src/engine/battleScenario.ts:26-33`), and
two independently-tracked booleans: whether `state.factorySwap` was ever
non-null earlier in the attempt (a swap was accepted), and whether
`postwin.question?.kind === "retire"` with `questionYesElapsed !== null` was
ever seen (the RETIRE question was answered YES). If a run ends (OK/HANG/
CRASH) with no phase edge ever seen for the in-flight attempt, that gets
recorded too, as `unresolved:<outcome>`.

Ground truth established by reading the source first (`postwin.ts`,
`core.ts`, `factoryRoundBattleOrchestrator.ts`): accepting RETIRE only sets
`postwin.questionYesElapsed` (`postwin.ts:1379-1400`) and drives a purely
cosmetic fade-to-black/fade-in render (`core.ts:2725-2730`,
`renderPostwinRetireWarp` at `core.ts:3051`) — grep for `retire`/`Retire` in
`factoryRoundBattleOrchestrator.ts` returns **zero** hits, and `lobbyFreeRoam`
is only ever constructed at one site (`core.ts:885-888`), gated on
`factoryTerminal`'s own decline-chain, which itself requires a genuine
`roundLost`/`roundComplete` presentation command. So the instrumentation's two
edges (`phase` and `retire-YES`) are exhaustive for "how did this attempt
end" — there is no third path.

**Result: 30 seeds, 108 round-attempts total (avg 3.6 attempts/seed as `full`
loses and re-chains). Every single one ended `roundLost` with `faintedCount:
3`, `hpList:[0,0,0]` — a genuine, fully-fainted, honest in-battle loss.**

```
endKind breakdown: { roundLost: 108 }
battles-won-before-end (battleIndex at termination) histogram:
  0: 62   (lost battle 1, i.e. 0 wins this attempt)
  1: 30   (lost battle 2, i.e. 1 win)
  2: 8
  3: 3
  4: 3
  5: 1
  6: 1    (reached the 7th and final battle, then lost it)
rounds with a swap accepted earlier: 46/108 (42.6%)
rounds with retire accepted earlier: 0/108
```

Candidate-(b) scans (both explicit per the brief) came back **empty**:
- `roundLost` with a healthy (non-fully-fainted) remaining party: **0 matches**.
- `unresolved` end without a preceding retire-accept: **0 matches** (all 30
  seeds' final attempts also ended in a genuine `roundLost`, matching the
  established `full` 0:60 OK/CRASH/HANG = 60/0/0 result).

**RETIRE is never once exercised as the actual end of a round in this
sample.** The postwin continuation menu only rolls RETIRE 4% of the time
(`roll < 0.96 ? 2 : 3` → target 3 in `onPostwin`), and even then the
follow-up confirmation question only accepts YES 15% of the time
(`postwin.question.kind === "retire" ? this.rng.chance(0.15) : ...`) — a
compound ~0.6% chance per continuation-menu visit, and 108 round-attempts
apparently never rolled the double-6% needed. This means the earlier
suspicion (RETIRE creates an engine-state dead end, since the source shows it
never touches `round.rules.phase` or `factoryWinStreak`) is real as a
*structural* observation but **not the thing actually killing `full`'s win
rate** — it just never fires often enough to matter at these seeds.

**Spot check (`--seed 21 --verbose`, full log at 7247 lines,
`/tmp/mb-seed21-verbose.log`, not committed — 300-line cap):** seed 21's first
round-attempt census record is `battleIndex:2, endKind:roundLost,
swapAcceptedEarlier:true, faintedCount:3`. The raw log shows battle 3 (driver
label `b3`, i.e. 0-based `battleIndex 2`) ending in `resolution advance` at
frame 40577, then falling straight into the `terminal:` surface (loss route,
not a win-continuation) at frame 40600, then a fresh `draft:` screen (round 2)
at frame 41217 — an exact match to the census tabulation. (Minor curiosity,
not chased further under the time cap: this seed's swap screen entry at frame
11903 has no preceding `"swap offer: YES"` `ActionLog` line even though
`state.factorySwap` was genuinely non-null by then — the census's
engine-state-based `swapAcceptedEarlier` flag is unaffected since it doesn't
depend on that log text, but the `ActionLog` note itself may be missing a
call site. Flagging as a `PAPERCUT`, not chasing further under the time cap.)

## Part 2 — ablation, `full` with one exploration knob disabled, seeds 0:30

Method: four scratch env-var gates in `RandomPlayer`, each overriding only
the *outcome* of an existing roll while still **consuming the same RNG draw**
(draw-count parity with baseline `full`, so later decisions in the same seed
shift only from the changed action itself, not from a shortened/lengthened
RNG stream) — except ablation B, which necessarily drops one `rng.int(4)`
call's *result* (the draw itself is still made, for parity) in favor of a
zero-draw computation.

| # | ablation | mechanism disabled |
|---|---|---|
| A | no voluntary switches | action-menu roll that would pick POKéMON (22%+1.5% wander) is redirected to FIGHT |
| B | best fight slot | fight-menu's uniform `rng.int(4)` slot (legal *or illegal*) replaced with `winning`'s highest-power **legal** slot |
| C | no swap accept | swap-offer YES roll (50%) forced to NO |
| D | no fight cancel | fight-menu's 10% B-cancel forced off |

**Results (seeds 0:30 each, all 30/30 OK, 0 CRASH, 0 HANG):**

| ablation | carry>=7 | carry>=14 | carry>=21 | deepest carry | deepest depth |
|---|---|---|---|---|---|
| baseline `full` (established, 0:60) | 0/60 (0%) | 0/60 | 0/60 | 0 | 6 |
| A — no voluntary switches | 1/30 (3.3%) | 0/30 | 0/30 | 7 | 9 |
| **B — best fight slot** | **6/30 (20.0%)** | 0/30 | 0/30 | 7 | 9 |
| C — no swap accept | 0/30 (0%) | 0/30 | 0/30 | 0 | 6 |
| D — no fight cancel | 0/30 (0%) | 0/30 | 0/30 | 0 | 5 |
| E — all four combined | **not run (time cap)** | — | — | — | — |

**Ablation B (fight-menu move choice) moves the needle by far the most** —
0% → 20.0%, more than a third of the way to `vanilla`'s established 26.7%
(seeds 0:60) and approaching `winning`'s 35.6% (seeds 0:180), from disabling
*one* knob alone. Ablation A helps a little (3.3%). Ablation D shows
**zero** measurable effect at this sample size — fight-cancel is not
meaningfully responsible. ~~Ablation C likewise~~ **CORRECTED by the
supervisor (2026-08-20, same session): ablation C was a NO-OP, not a null
result** — see ISSUES #99: the swap-offer YES/NO branch whose roll it forced
to NO is never reached (the continuation branch shadows it and presses A =
YES), so `full` still accepted ~85% of swaps under "ablation C" and its
0/30 says nothing about swap acceptance. The "minor curiosity" flagged in
Part 1 (seed 21's swap screen with no `swap offer: YES` line) is the same
defect.

This makes mechanical sense against the driver source
(`randomRoundSoakDriver.ts:556`, pre-revert): `full`'s fight-menu picks
`this.rng.int(4)` **uniformly over all 4 slots regardless of legality** — not
just uniformly over legal moves like a middling human player would. On a
typical 1-2-legal-move rental early on, this throws away a large fraction of
turns on dead slots (resampled, wasting the press but not the turn) or
rejected slots (Torment/Taunt/Disable/no-PP, which reject and cost the
message-dismiss but is otherwise turn-neutral) or — the actually costly case —
a *legal but weak/status* move when a stronger damaging option was available,
turn after turn, letting the Factory AI's opponents out-race `full`'s
damage output. Voluntary switching (ablation A) does cost a tempo turn each
time it fires, but it only fires ~22% of the time and 25% of *those* still
cancel, so its total damage to the win rate is smaller than the fight-menu's
near-universal, every-single-turn move-quality tax.

## Verdict

**(a) — `full` is simply bad arbitrary play, not a defect.** Part 1's census
is unambiguous: **100% of 108 round-attempts (30 seeds) ended in a genuine,
fully-fainted, honest in-battle loss** (`roundLost`, `faintedCount:3`,
`hp:[0,0,0]` every time); RETIRE was never once the actual cause of a round
ending; there is no `roundLost` recorded while the player still had healthy
mons; there is no seed that silently stalled mid-round without an honest
resolution. Part 2 confirms the mechanism is ordinary bad play, not an engine
defect: disabling `full`'s worst single exploration knob (its fight-menu's
uniform-over-legality move roll) recovers a large share of `vanilla`'s win
rate (0% → 20.0%, vanilla is 26.7%) using nothing but existing
`winning`-policy logic already in the driver, with **zero** change to
`SoakPolicy`, `DEFAULT_RUN_OPTIONS`, or any gate. `full` never completing a
round is exactly what "explore every legal menu choice with no bias toward
winning, including moves the presentation will reject and slots that do
nothing" predicts against Factory opponents that play to win.

No ISSUES.md entries filed — no candidate-(b) defect was found. M-B step 2
("raise the win rate until carry >= 21 is observed") has a concrete, cheap,
already-measured first lever if it wants one: ablation B's mechanism
(`winning`'s `bestDamagingSlot()`) is the single highest-leverage exploration
knob identified here, though step 2 is free to go further (that step's own
job, not this one's).

## Commands run

```
# scratch instrumentation added/reverted in tools/soak/randomRoundSoakDriver.ts
# (opt-in collectRoundCensus hook; SOAK_ABLATE_{A,B,C,D} env-gated overrides)
node --experimental-strip-types tools/soak/_scratch_census.ts   # seeds 0:30, full policy (scratch script, deleted)
SOAK_ABLATE_A=1 node --experimental-strip-types tools/soak/randomRoundSoak.ts --policy full --seeds 0:30
SOAK_ABLATE_B=1 node --experimental-strip-types tools/soak/randomRoundSoak.ts --policy full --seeds 0:30
SOAK_ABLATE_C=1 node --experimental-strip-types tools/soak/randomRoundSoak.ts --policy full --seeds 0:30
SOAK_ABLATE_D=1 node --experimental-strip-types tools/soak/randomRoundSoak.ts --policy full --seeds 0:30
node --experimental-strip-types tools/soak/randomRoundSoak.ts --policy full --seed 21 --verbose
```

## Supervisor verification + correction (2026-08-20, same session)

- Worker was cap-killed at 50 min in the docs tail (exit 143) with the doc,
  PROGRESS entry and archive rotation written and the driver scratch already
  reverted; the supervisor verified the census aggregate and all four
  ablation blocks against the worker's raw `/tmp/mb-*.log` files (numbers
  above are byte-identical to the logs) and committed the salvage.
- Verdict (a) stands for the question asked (no win-path defect; every one
  of 108 round-attempts is an honest fully-fainted loss). One conclusion is
  withdrawn: the ablation-C "swap-accept is not responsible" reading is void
  because the ablation could not take effect (ISSUES #99, found in parallel
  by the side scout and re-verified by the supervisor). Whether swap
  acceptance matters is re-measured after the #99 fix (PROGRESS 1358).
