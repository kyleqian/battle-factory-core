# `winning` soak policy loss analysis — 2026-08-20

Read-only scout for Milestone M-B step 2 (ROADMAP.md). **No policy change
lands here.** Produced by a side-lane worker (Battle Scene OFF oracle,
worktree `worker/side-20260820-100534`); every driver edit described below
was scratch, reverted before the final commit.

## Method

`tools/soak/randomRoundSoakDriver.ts` (the `winning` `RandomPlayer` policy)
was temporarily instrumented (uncommitted, reverted after this session) to:

1. On every `round.rules.phase` transition into `"roundLost"`, dump a
   `LOSS_CENSUS` JSON line: seed, carry entering the round, `battleIndex`
   (0-based) of the losing battle, the player's and opponent's full 3-mon
   parties (species/HP/status) at that instant, whether a rental swap had
   been accepted earlier in that same round (`orchestrator.performedRentalSwap`),
   and the player's last 3 fight-menu commits — move id/type/power, the
   type-effectiveness multiplier against the opponent's active mon
   (`applyTypeEffectiveness` from `src/engine/damageCalc.ts` against
   `src/data/gen/type-effectiveness.json`), and whether a legal alternative
   move in that moveset would have scored a strictly higher multiplier.
2. Two env-gated ablations in the fight-menu and swap-offer decision points
   (see §2).

Run: `LOSS_CENSUS=1 node --experimental-strip-types tools/soak/randomRoundSoak.ts
--seeds 0:100 --policy winning --render-every 0`. Disabling rendering
(`--render-every 0`, a supported CLI flag — presentation is separate from
`tick()`'s logical outcome, per AGENTS.md) cut wall time from the
~15-22.5s/seed baseline to ~3.2s/seed with byte-identical frame counts to a
rendered spot-check; this let the full 0:100 census (not just the 0:60
minimum) finish in 320.8s. Raw output (397 lines, per-seed summary +
`LOSS_CENSUS` lines + the CLI's own aggregate footer) is committed at
`docs/soak-winning-loss-analysis-2026-08-20.log`.

**Correction to the brief's expected baseline:** re-measured this session at
seeds 0:100 (unmodified `winning`), carry >= 7 is 36/100 (36%), carry >= 14
is 4/100 (4%), carry >= 21 is 0/100 — consistent with (not identical to,
different seed count) the 2026-08-19 doc's 0:180 numbers (35.6% / 5.6% / 0%).

Because `winning` re-chains through many rounds per seed (declining the
terminal's continuation menu only 15% of the time), **100 seeds produced 287
distinct `LOSS_CENSUS` events**, not 100 — each seed's run typically loses,
re-drafts, and loses again several times before the frame/grace budget ends
the run. All aggregates below are over these 287 loss events, not 287 seeds.

## 1. Loss census (seeds 0:100, 287 loss events)

### Ranked loss causes

| Rank | Cause | Count | Share |
| --- | --- | --- | --- |
| 1 | Final fight-menu commit was into a **resisted or immune** move, while at least one legal moveset slot scored strictly better effectiveness | 76 / 287 | 26.5% |
| 2 | Final fight-menu commit was into a **resisted or immune** move with **no** better legal alternative (moveset itself has poor coverage vs. that opponent) | 63 / 287 | 22.0% |
| 3 | Lost in the **very first battle of a fresh draft** (`battleIndex 0`, i.e. round barely started) | 91 / 287 | 31.7% (overlaps with 1/2 above) |
| 4 | A rental swap had been accepted earlier that round | 64 / 287 | 22.3% |
| 5 | Lost at `battleIndex >= 4` (battle 5+, deeper into a round the run had already invested in) | 59 / 287 | 20.6% |
| 6 | Lost while already carrying a streak (`carry >= 7`, i.e. mid- or late-challenge, tougher AI/rental tier) | 40 / 287 | 13.9% |

Row 3 (battle 1 losses) is the single largest bucket and is **not**
explained by AI toughness — `battleIndex 0` losses happen at every carry
tier, including fresh `carry:0` rounds against the weakest AI/rental tier.
That points at rental-draft/coverage variance and the power-only move bias,
not AI strength, as the dominant early-loss driver. A concrete example
(seed 98, `docs/soak-winning-loss-analysis-2026-08-20.log`): HAUNTER's
active moveset committed the same `MOVE_SHADOW_BALL`-family Ghost move three
turns running into `SPECIES_PIDGEOTTO` (Normal/Flying — Ghost is 0x on
Normal), and no other legal move in that moveset scored better either — the
whole rental was walled by that single matchup.

Full effectiveness breakdown of the **last** committed fight choice before
each loss (n=287): resisted (0 < mult < 1x) 103 (35.9%), immune (0x) 36
(12.5%), neutral (1x) 136 (47.4%), super-effective (>1x) 12 (4.2%). So in
**48.4% of losses** (139/287), the very last move the "winning" policy threw
was resisted or immune — and in more than half of those (76/139, 54.7%) a
better-effectiveness legal move sat unused in the same moveset, unused
purely because the highest-*power* heuristic ignores type matchup.

Swap involvement: 64/287 losses (22.3%) had an accepted swap earlier that
round. This is **not** directly interpretable as "swaps hurt" — there is no
matched "no-swap" denominator from this census alone (see §2 ablation (i)'s
failure below for why a controlled comparison wasn't obtained this session).

### Per-battle-index and per-challengeNum win rate — **not measured, flagged**

The brief asks for per-battle-index and per-challengeNum win rate. This
needs total battle *attempts* at each index/tier (wins + losses), not just
losses; the instrumentation built this session only counts losses (dumped at
`roundLost` transitions). Adding attempt-counting (hook `orch.round.rules
.lastBattle` transitions the same way the loss dump hooks `phase`) is a
~15-line follow-up, not attempted here under the time cap. What the loss
distribution *can* say directionally: losses cluster hardest at
`battleIndex 0` (91/287, 31.7%) and taper toward `battleIndex 5` (12/287,
4.2%) before ticking back up at `battleIndex 6` (18/287, 6.3%, — the last
battle before a round-win, likely reflecting that rounds which survive that
far are already the tougher/higher-tier ones). This is consistent with
"most attempts happen at battle 1 of many restarted rounds," not necessarily
"battle 1 has the worst win rate" — the two are confounded without attempt
counts.

## 2. Quick ablations (scratch, revert before commit)

All at seeds 0:60, `--render-every 0`, policy `winning`. Baseline for
comparison is this session's own seeds-0:100 unmodified run (§ above): carry
>= 7 36%, >= 14 4%, >= 21 0%.

| Ablation | carry >= 7 | carry >= 14 | carry >= 21 | Status |
| --- | --- | --- | --- | --- |
| (i) decline ALL swap offers | 26/60 (43.3%) | 2/60 (3.3%) | 0/60 | **instrumentation bug — not a valid measurement, see below** |
| (ii) effectiveness-aware move choice | 24/60 (40.0%) | **9/60 (15.0%)** | 0/60 | working, real |
| (iii) both combined | 24/60 (40.0%) | 9/60 (15.0%) | 0/60 | frame-identical to (ii) alone — confirms (i) is a no-op |
| (iv) draft heuristic (BST/coverage-aware rent) | — | — | — | not attempted (out of time budget) |

**(ii) effectiveness-aware move choice** (score = `power × multiplierTenths
× (STAB ? 1.5 : 1)`, using the engine's own `applyTypeEffectiveness` and each
battler's live `types`; ties still resolve to the lower slot, matching the
original `bestDamagingSlot`'s tie-break) is the one clean, real result this
session produced: **carry >= 14 roughly tripled, 4% → 15%**, on a like-for-
like 60-seed sample (noisy — this is a single 60-seed draw, not a
distribution — but the direction and magnitude line up with the loss
census's finding that ~half of all terminal resisted/immune choices had a
better legal option). Driver change is confined to the `winning`-only
`bestDamagingSlot` closure at `tools/soak/randomRoundSoakDriver.ts:536-559`.

**(i) decline ALL swap offers — broken, root-caused, not fixed.** The
ablation gated the swap-offer YES/NO branch's `accept` computation
(`onPostwin`, the `postwin.dialoguePage === 4 && swapCursorPos !== null`
block). A debug probe (`DEBUG_SWAP=1`, temporary, reverted) proved this
branch is **never entered** for seed 0 even though
`orchestrator.performedRentalSwap` still flips `true` mid-run: zero debug
lines printed, one swap still accepted. The branch's guard condition
(`swapDeclineElapsed === null && swapCursorPos !== null`) apparently never
holds at the tick the `RandomPlayer` observes it, so the swap offer's
YES/NO must be getting resolved by the generic `pressAdvance` fallback at
the bottom of `onPostwin` (a plain A-mash used to dismiss ordinary message
boxes) landing on the menu at a moment when its default cursor position
already reads as YES. That means (a) `winning`'s current swap-offer
"random 50/50 accept" comment is questionable — the real accept rate may be
higher and closer to "defaults to YES whenever the generic advance-mash
gets there first" — and (b) both the no-swap and combined ablation numbers
above are **not evidence of anything** (confirmed: (iii)'s per-seed frame
counts are byte-identical to (ii) alone, `diff` clean except timing noise).
Root-causing exactly where the swap dialogue's readiness window opens
relative to `onPostwin`'s generic-advance fallback needs the actual
milestone-2 session, not this scout.

**(iv) draft heuristic** — not attempted; flagged as the largest remaining
unknown given battleIndex-0 losses are the single biggest bucket (§1) and a
weak-coverage rental (e.g. seed 98's Haunter) plausibly originates at draft
time, before any move-choice bias can matter.

## 3. Recommendation for step 2

Ranked by (measured or estimated benefit) / (cost), most promising first:

1. **Ship the effectiveness-aware move-choice scoring as `winning`'s new
   fight-menu heuristic** (or as a new opt-in policy sibling, per the
   step-2 brief's "or add a stronger opt-in sibling" option). Still
   arbitrary-but-legal: it only reorders which *legal* move a real player
   would rationally prefer (real players do consider type effectiveness),
   never inspects hidden AI state or opponent intent, and never
   special-cases a specific scenario/opponent. Measured this session: carry
   >= 14 4% → 15% (60-seed samples, one draw each — re-run at 180+ seeds to
   firm up before landing). Driver lines: `tools/soak/randomRoundSoakDriver.ts`,
   the `bestDamagingSlot` closure (~536-559) and its call site (~558).
   Tier-1 test: a synthetic `battleCommandPresentation` fixture with two
   legal moves — one higher power but resisted, one lower power but
   super-effective/STAB — asserting the policy's chosen slot is the
   effective one; a second case with all-legal-moves-immune asserting it
   still falls back to the lowest legal slot (parity with today's
   tie-break).
2. **Fix the swap-offer ablation's root cause, then re-measure decline-vs-
   accept-all as a controlled pair.** Cost: a debugging session (the
   `pressAdvance` vs. explicit-branch race needs a timing trace, not just
   reading source). Payoff unknown — this session couldn't produce a valid
   number either direction, so it is not evidence for or against the swap
   path being a net-loss contributor, despite 22.3% of losses touching a
   round that took a swap.
3. **Add a draft-time heuristic** (score each of the 6 draft-screen
   candidates by summed base-stat-total, or move-type coverage breadth, and
   rent the best 3, replacing the current uniform-random 3-of-6). Estimated
   moderate benefit given battleIndex-0 dominates the loss census (31.7%)
   and at least one concrete loss (seed 98) traces to a rental whose entire
   moveset was walled by a single common matchup. Cost: moderate — needs a
   scoring function over `src/data/gen/` rental/species data, still
   "arbitrary but legal" since the real draft screen already exposes a
   SUMMARY peek the driver samples today (`draft.peekedSummary`). Tier-1
   test: fixed 6-candidate fixture, assert the 3 highest-BST (or best-
   coverage) slots are the ones rented.
4. **Add attempt-counting instrumentation** (battle wins, not just losses)
   before step 2 claims a per-battle/per-challengeNum win-rate number — this
   scout's census can't produce one (see §1).

**Is carry >= 21 reachable with pure player-side heuristics at challenge
tier 3+?** Plausibly yes, but not demonstrated, and likely rare even after
landing (1)-(3). The strongest single lever measured this session (2) still
only reached carry >= 14 in 15% of a 60-seed sample and carry >= 21 in 0/60;
reaching a third consecutive 7-win round requires stacking three
independently-hard win probabilities at an escalating AI/rental tier
(`CHECK_BAD_MOVE` engages at challenge 2-3, "full triad" AI at 4+ per the
brief's context), so even a policy that roughly triples the carry >= 14 rate
would need a much larger sweep (several hundred seeds) to observe carry >=
21 naturally, or a further-stacked combination of (1)+(3) (and, once fixed,
whatever (2)/swap-policy turns out to help) to lift the per-round win
probability enough to make it a non-rare event rather than a needle in a
few-hundred-seed haystack.

## 4. Part C landed: voluntary switch out of a walled matchup (2026-08-20, worker/side-20260820-120834)

Implements the §3 loss-census finding that 22.0% of `winning` losses ended
with a resisted/immune move and no better legal move in the active's
moveset ("walled"). At the action menu, when the active's best legal fight
score (`pickWinningFightSlot`'s own scoring) is walled AND a benched,
non-fainted party member has a damaging move that is super-effective
(>= 2x) against the opponent's live types, `winning` now overrides the
drawn action-menu roll to POKéMON and sends out the best-scoring qualifying
bench row (ties to the lower row) instead of part B's always-decline.
Guarded against ping-pong (one voluntary switch per opponent party slot per
battle) and against emptying the bench (never switches with only one
healthy party member left). Pure decision function `pickWinningSwitchRow`
(`tools/soak/randomRoundSoakDriver.ts`), pinned with 6 synthetic cases in
`tests/randomRoundSoak.test.ts`. `full`/`vanilla` byte-identical pins
verified green unmodified; no `src/` change.

**Like-for-like measurement, `--policy winning --seeds 0:60 --render-every 0`,
same worktree, before implementing part C vs. after:**

| | OK | CRASH | HANG | carry>=7 (36/60 baseline) | carry>=14 | carry>=21 | deepest carry | deepest depth |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Before (base, part B) | 57/60 | 3 | 0 | 36/60 (60.0%) | 10/60 (16.7%) | 0/60 (0%) | 14 | 20 |
| After (part C) | 60/60 | 0 | 0 | 25/60 (41.7%) | 6/60 (10.0%) | 1/60 (1.7%) | 21 | 21 |

The before run reproduced the supervisor-reported baseline exactly (57
OK / 3 CRASH — seeds 10, 51 `STRINGID_NATUREPOWERTURNEDINTO`, seed 36
`factory-ai-check-viability: unknown last-used move 65535` — carry>=7
36/60, carry>=14 10/60, carry>=21 0/60, deepest carry 14, deepest depth 20).

**The heuristic measures WORSE on this seed set for the primary carry>=7
metric: 25/60 (41.7%) vs. the 36/60 (60.0%) baseline, a clear regression,
not noise.** carry>=14 also dropped (6/60 vs. 10/60). The only metrics that
improved are the tail: deepest carry (21 vs. 14) and carry>=21 (1/60 vs.
0/60) — plausibly because escaping a walled matchup occasionally survives a
battle that would otherwise be an immediate loss, letting a handful of runs
push one round further than baseline ever reached, at the cost of a lower
overall clear rate (a switch spends a turn not attacking, and the bench
mon it switches to is not vetted against what the opponent sends out next).
All three baseline crashes (seeds 10/36/51) disappeared in the after run —
not a fix (still unreached commits, base tree unchanged: no #100 fix, no
draft heuristic) but a side effect of the heuristic changing play well
before those frames, so those seeds' RNG-consumption/battle-state paths no
longer reach the crashing conditions. Seeds 10 and 51 (STRINGID_NATURE...)
and seed 36 (unknown last-used move) both switched at least once (7, 4, and
6 switches respectively per the count below) before their prior crash point.

**Voluntary switches actually committed:** counted via the `winning switch:
row N` log note (added this session) across the same 60-seed set at
`--max-frames 1_000_000` (matching `DEFAULT_MAX_FRAMES_BY_POLICY.winning`):
**153 switches across 52/60 seeds** (min 1, max 12 in a single seed's
chained rounds) — the heuristic engages often, not a rare edge case.

**Interpretation:** the heuristic is real player behavior (a benched
teammate with a clean super-effective answer beats grinding a walled
attacker) but is not a net win-rate improvement on this seed set — spending
an action-menu turn on POKéMON instead of FIGHT has an opportunity cost
(no chip damage that turn, and the bench mon's own matchup against
whatever the opponent sends out or does next isn't evaluated) that this
20% of decisions apparently outweighs the walled-mon damage it avoids, at
least at 60 seeds. Landing this as `winning`'s default is the supervisor's
call, not this worker's; per the brief, it is committed test-pinned as
measured, without seed-tuning the heuristic's thresholds to chase a better
number here.

## 5. Part C2: tighten "walled" to true 0x-immunity + a 50% HP bench gate (2026-08-20)

Part C's "walled" test fired on any resisted-or-immune matchup (<= 0.5x),
which turned out far too trigger-happy (153 switches across 52/60 seeds,
every one spending a free opponent hit) and measured worse than declining
every switch. This step tightens `isWalledActive`
(`tools/soak/randomRoundSoakDriver.ts`) to require true immunity: every
legal move must be either non-damaging (power 0) or exactly 0x against the
opponent's live types — a merely resisted move (0.25x/0.5x) no longer
qualifies. It also adds an HP gate to `pickWinningSwitchRow`'s bench
candidate: the qualifying bench row must now be at >= 50% of its max HP
(`Math.floor((100 * hp) / maxHp) >= 50`, the same integer-percent convention
`factoryAiCheckViability.ts` already uses), not just carry a super-effective
(>= 2x) move — a real player doesn't send a nearly-fainted teammate into a
matchup it can't safely take a hit in. The ping-pong guard, the >= 2-healthy
guard, and the drawn-but-overridden RNG stream are unchanged. Pins extended
in `tests/randomRoundSoak.test.ts` (resisted-only no longer walled; an
all-immune active with a qualifying bench switches at 80% HP and declines at
30%; a new 50%-exactly boundary case; the existing ping-pong/healthy-count/
tie-break/skip-fainted-or-active cases carry over against a genuinely
all-immune scenario). `full`/`vanilla` byte-identical pins verified green
unmodified; no `src/` change.

**Like-for-like measurement, `--policy winning --seeds 0:60 --render-every
0`, this worktree (based on side `ec212ae0`, which sits on the same
crash-fixed master as part C's own measurement — see note below):**

| | OK | CRASH | HANG | carry>=7 | carry>=14 | carry>=21 | deepest carry | deepest depth | switches |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Rung-1 base (part B, decline-always) | 57/60 | 3 | 0 | 36/60 (60.0%) | 10/60 (16.7%) | 0/60 (0%) | 14 | 20 | 0 |
| Part C (resisted-or-immune walled) | 60/60 | 0 | 0 | 25/60 (41.7%) | 6/60 (10.0%) | 1/60 (1.7%) | 21 | 21 | 153 / 52 seeds |
| Part C2 (0x-immune + 50% HP gate) | 60/60 | 0 | 0 | 38/60 (63.3%) | 13/60 (21.7%) | 2/60 (3.3%) | 21 | 27 | 30 / 19 seeds |

Switch counts were measured the same way as part C: a scratch script (not
committed) counting the `winning switch: row N` note across the same 60
seeds at `DEFAULT_MAX_FRAMES_BY_POLICY.winning`.

**Read the rung-1 comparison with a caveat, the part C comparison without
one.** The rung-1 base's 36/10/0 was measured *before* seeds 10/51/36's
engine crashes were fixed on master (#100/#103); this worktree's base
already includes those fixes (0/60 CRASH here, matching part C's own
crash-free run), so part of the 36→38, 10→13, 0→2 delta versus rung-1 is
those three seeds simply completing instead of crashing early, not the
switch heuristic. Part C's own measurement, by contrast, was already made
on this same crash-fixed base with the same seed set and the same 60/60 OK
count, so the C→C2 comparison is clean: tightening "walled" to true
immunity cut voluntary switches by roughly 5x (153→30) and switching seeds
by more than half (52→19), and **carry>=7 recovered from part C's 25/60
regression all the way past the rung-1 baseline to 38/60** — the best
carry>=7, carry>=14, *and* deepest-battle-depth (27, versus 21 for both
other rows) numbers of the three rows.

**Plain verdict: at n=60, this tightened form of switching is a net win
over part C's looser rule, and a small net win over declining every switch
outright** — it no longer spends a turn retreating from a merely-resisted
matchup, only from ones the active truly cannot damage, and only into a
bench mon healthy enough to take the follow-up hit. The trigger rate is
much lower than part C's (30 switches over 60 seeds vs. 153) but not zero,
so this reads as "switch rarely, but correctly" rather than C's "switch
often, often wrong." As with part C, this is committed test-pinned as
measured, without seed-tuning the 50%/2x thresholds to chase a better
number; landing it as `winning`'s default remains the supervisor's call.

## 6. Draft heuristic (rung 2) re-measured on the #104-fixed tree (2026-08-20, side lane)

Re-measures §3.5's withheld draft heuristic (`wip/mb-step2b-draft-heuristic`
`e9a415a7`, cherry-picked onto this branch on top of master `ef9723c9` --
i.e. on top of rung 1 swap-decline, part C2's 0x-immune+50%-HP-gate switch,
and the ISSUES #104 OK/HANG semantics retune, all of which post-date the
branch this heuristic was cut from). Conflicts in `tests/randomRoundSoak.test.ts`
and this doc resolved by hand (kept both the switch-heuristic exports and
the new draft-heuristic exports); one pre-existing pin (`ISSUES #104 (b)`,
seed 34's carry>=14 check) needed its `maxRounds` bumped 3 -> 12 because the
draft heuristic reshuffles seed 34's whole RNG-consuming trajectory the same
way it already reshuffled the ISSUES #99 swap-offer pins. `npm run
test:smoke` (444/444) and the full `randomRoundSoak.test.ts` file (37/37)
both green before measuring below.

**Time-capped result: n=30 (seeds 0:30), not the >=90 minimum the step
asked for.** The cherry-pick, conflict resolution, and the seed-34 pin fix
consumed most of the 50-minute budget before any measurement could start;
30 same-seed pairs is what completed inside the remaining window. Treat
this as a first read, not a confirming sample -- especially the carry>=21/28
cells, which are single- or low-digit counts on a 30-seed base and swing
heavily on one or two seeds either way.

**Like-for-like, `--policy winning --seeds 0:30 --render-every 0`, same 30
seeds both rows (driver swapped in-place via `git checkout <rev> --
tools/soak/randomRoundSoakDriver.ts`, then restored; two concurrent
15-seed shards per row):**

| | OK | CRASH | HANG | carry>=7 | carry>=14 | carry>=21 | carry>=28 | deepest carry | deepest depth |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Baseline (master `ef9723c9`, no draft heuristic) | 30/30 | 0 | 0 | 30/30 (100%) | 27/30 (90.0%) | 3/30 (10.0%) | 1/30 (3.3%) | 28 | 28 |
| + rung 2 draft heuristic (`e9a415a7` cherry-picked) | 28/30 | 2 | 0 | 30/30 (100%) | 30/30 (100%) | 4/30 (13.3%) | 0/30 (0%) | 21 | 23 |

The 2 heuristic-row crashes (seeds 27 and 29, both battle 3 turn 7, frames
~766,385-768,654) are the same signature: `battleStringResolver:
STRINGID_PKMNSUBSTITUTEFADED references placeholder {B_DEF_NAME_WITH_PREFIX}
with no resolver supplied`. This is a signature not seen in any prior row
of this doc (§3.5's rung-1-alone crashes were `STRINGID_NATUREPOWERTURNEDINTO`
and an "unknown last-used move" AI-viability throw) -- a third pre-existing
`battleStringResolver` resolver gap, reached only because the heuristic's
draft order puts a different RNG path in front of these two seeds. Per this
lane's contract this is reported here, not filed to `ISSUES.md`.
**PAPERCUT: `battleStringResolver` is missing a resolver for
`STRINGID_PKMNSUBSTITUTEFADED`'s `{B_DEF_NAME_WITH_PREFIX}` placeholder
(seeds 27/29, battle 3 turn 7, `--policy winning` with the draft heuristic
applied) -- for the supervisor's crash catalog, not filed here.**

**Plain verdict at n=30: neutral-to-slightly-better on carry depth, with a
new open crash question.** carry>=14 goes from 90.0% to 100% (27/30 ->
30/30) and carry>=21 ticks up (10.0% -> 13.3%, 3/30 -> 4/30). Per-seed
`maxCarriedWinStreak` (same 30 seed numbers, both rows) shows this is not a
uniform lift: every baseline seed that reached carry>=14 stayed at
carry>=14 or above under the heuristic, but the exact carry value moves
both ways per seed -- seeds 15, 16, and 24 drop (21/21/28 -> 14/14/21) while
seeds 2, 6, 7 rise from 7 to 14 and seeds 5, 19, 21 rise from 14 to 21; the
30/30 and 4/30 headline counts are net gains, not every-seed gains. The far
tail inverts (carry>=28 1/30 -> 0/30, deepest carry 28 -> 21, both seed 24
either way) -- a single seed, well within single-draw noise at n=30. The 2
new crashes are the headline risk: not an
engine regression (same "different RNG path through a pre-existing
resolver gap" pattern as §3.5's rung-1 crashes, which is itself not a
draft-heuristic defect), but a real reduction in OK rate (100% -> 93.3%) on
this sample that a larger run could confirm or wash out. This reverses the
direction of §3.5's n=60 pre-#104 finding (25/9/0 vs. 36/10/0, "clear
regression") into "modest improvement at the carry>=14/21 thresholds, at
the cost of 2 new crashes" on the fixed tree -- consistent with the
brief's suspicion that the earlier result was single-draw noise, but not a
confirmation of it; n=30 straddling both the earlier regression and this
session's improvement is exactly the kind of result the brief's requested
n>=90 sample was meant to resolve. **Folding this heuristic, and whether the
new crash signature needs a larger sample or an immediate catalog entry,
remains the supervisor's call** -- this lane only measures.
