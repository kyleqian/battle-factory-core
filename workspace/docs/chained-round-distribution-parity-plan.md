# Chained-round distribution-parity program (scout)

> **STATUS 2026-08-19 (planning session): §4 steps 1-4 are ALL LANDED.
> This program is COMPLETE as scoped.** Verified live, not inferred:
> step 1 = `bceaf1d1` (`tests/factoryRoundChaining.test.ts` case "(b)",
> four hops, silver Brain at hop 3); step 2 =
> `factoryRentalGeneration.ts:229-239`; step 3 = `772ca3e0` + sweeps
> `7da11036` (`vanilla` 0:60, `full` 0:180, `winning` 0:180, all green);
> step 4 = satisfied by harness `4dac4a35`, already noted inline below.
> Do not re-dispatch §4 as open work — a 2026-08-19 session reported this
> program to the user as "queued since 08-15, never picked up" purely from
> a stale ROADMAP queue line, without checking the tree.
>
> **What this program did NOT settle**, and what supersedes it: every
> sweep proves *crash-freedom*, none measures *depth*. So §0's "natural
> chained depth is shallow" prediction and §3 gap 3 are still
> **unmeasured on the winning policy**. That measurement is now ROADMAP
> milestone **M-A** (user decision 2026-08-19, "measure first, then
> scope").
>
> **Warning for whoever builds M-A — the depth instrument this program
> left behind is broken twice over** (audited live 2026-08-19):
> `randomRoundSoakDriver.ts:907` sets `carriedWinStreak` from
> `orchestrator?.config.factoryWinStreak`, i.e. the carry of the round
> that happens to be current when diagnostics are taken — **not** a
> maximum. A loss resets the carry to 0 and most seeds end on
> `roundLost`, so the field reads 0 for nearly every run however deep it
> got; its doc comment ("the deepest chained-streak value this run
> reached", `:158-161`) does not describe what the code does. Second,
> `diagnostics` is driver-only (`RunOptions:794`) — `randomRoundSoak.ts`
> never references it, so no CLI run populates the field at all. Build a
> running max over chain events plus a CLI opt-in; do not implement §4
> step 3's "depth report" by printing the existing field.

Read-only scout for the ROADMAP's "Follow-on objective — continuous play"
bar: "boot the app and play round after round indefinitely, matching what a
real Emerald player would see at distribution parity." Round chaining itself
is live (`factoryRoundChaining.ts`, PROGRESS ~1271-1273); single-shot
generation (rental draw, party-member construction, trainer selection/
schedule) already has dense ROM-source-derived parity suites. This document
inventories what the CHAINED dimension — round N → round N+1 carry — needs,
what's falsifiable and how, what the current instruments genuinely cannot
measure, and the smallest ordered next steps.

## 0. Soak-carry verification (asked directly in the brief)

**Answer: the soak driver's chained play genuinely exercises the real
challenge-advance/reset carry — it is not a silent reset — but its natural
depth under random play is shallow, almost never enough to reach a second
consecutive round win.**

Evidence (read-only: a temporary, uncommitted instrumented copy of
`tools/soak/randomRoundSoakDriver.ts` run outside the repo — `/tmp`, deleted
before finishing — logging `state.factoryCarry`/`state.pendingGeneratedRound`
transitions frame-by-frame; the tracked driver file itself is untouched):

- `core.ts:811-857`'s chaining branch really does thread the carry: the new
  orchestrator is constructed with `factoryWinStreak: pending.carry.
  factoryWinStreak`, `factorySymbolsCount: pending.carry.factorySymbolsCount`,
  `facilityState: { rentsCount: pending.carry.rentsCount }`
  (`core.ts:1938-1947`) — not a fresh/zeroed config.
- Live seeds show **both** carry branches firing for real, not just in the
  unit test: seed 0 (`vanilla` policy, full 600k-frame budget) chains 6
  times, with `factoryCarry.factoryWinStreak` observed at **7** twice (real
  round wins banking `STAGES_PER_CHALLENGE`) and **0** four times (real round
  losses resetting it) — e.g. chain event at frame 82,365 reads
  `streakAfter: 7, bp: 3, rents: 1`, immediately followed by a loss-reset to 0
  at frame 93,987. This is the mechanism the ROM's `IncrementWinStreak`
  (`frontier_util.c:2111-2157`) implements, exercised end-to-end through
  `tick()`, not just through `factoryRoundChaining.test.ts`'s direct calls.
- **But depth is shallow.** Across an 8-seed sample (`vanilla`+`full`, seeds
  0-7, 600k-frame budget) the maximum streak ever observed was **7** — one
  round won, never two in a row. Seed 51 (the ISSUES #90 triage subject,
  `docs/issue90-seed51-hang-triage.md`) chains **11 times** in 361,216 frames
  and every single one resets to streak 0 (a straight losing streak). This
  matches the driver's own random policies: neither `full` nor `vanilla`
  biases toward winning, so a soak's *natural* chained depth almost never
  reaches challengeNum ≥ 2 (streak 14), let alone the streak-21 threshold
  that schedules the silver Frontier Brain (battle 21). **The production
  soak is real evidence for the carry MECHANISM (win-advance vs.
  loss-reset, both directions, live through `tick()`), but it is not, by
  itself, evidence for deep-streak distribution properties (tier/IV
  escalation past challengeNum 1, AI-script escalation past challengeNum 3,
  brain scheduling) — those need a different, win-biased instrument (§2,
  §4).**
- A second, independent confirmation already exists in the tree without
  needing this probe: ISSUES #88's fix and its regression pin
  (`tests/randomRoundSoak.test.ts:226-240`, "seed 0's chained round 2") were
  found and are pinned specifically *because* production soak play reached a
  genuinely chained second round and hit a real engine bug there — the
  chaining path is not dead code reachable only from tests.

## 1. Inventory — chained-carry quantities

Quantities that must survive round N → round N+1 (or are *derived fresh each
round from* something that must survive), with the exact engine location and
the exact ROM source location that defines ground truth.

| Quantity | ROM ground truth | TS engine location | Chaining-layer wiring |
| --- | --- | --- | --- |
| Win streak (`factoryWinStreaks[battleMode][lvlMode]`) | `IncrementWinStreak`, `frontier_util.c:2111-2157` (+1/battle win, capped `MAX_STREAK`=9999); `InitFactoryChallenge`, `battle_factory.c:198-222` (reset to 0 only when `winStreakActiveFlags` bit is clear, i.e. only after a real loss) | `factoryRoundBattleOrchestrator.ts` `config.factoryWinStreak` (+`battleIndex` per in-round battle, `core.ts`/orchestrator lines ~559-582) | `factoryRoundChaining.ts` `advanceFactoryCarry` (`+STAGES_PER_CHALLENGE` on win / `0` on loss, capped `MAX_STREAK`) → `generateFactoryChallengeDraft` → `core.ts:1938-1947` orchestrator construction |
| Challenge number (`winStreak / FRONTIER_STAGES_PER_CHALLENGE`, `u8`, not itself stored) | Recomputed inline at every use site: `GenerateOpponentMons` `battle_factory.c:313`, `GenerateInitialRentalMons` `:534`, `FillFactoryBrainParty` `:771`, `GetAiScriptsInBattleFactory` `:900` | `factoryRentalGeneration.ts` (`Math.floor(factoryWinStreak / STAGES_PER_CHALLENGE)`), `factoryAiMaskSelection.ts`'s `challengeNumber` | Derived fresh each round from the carried streak — no separate stored field, matching source |
| Rental-tier / IV escalation by challenge | `sInitialRentalMonRanges`, `sFixedIVTable`, `GetFactoryMonId`/`GetFactoryMonFixedIV`, `battle_factory.c:157-190,739-866` (challenge 0-6 own row; challenge 7 clamps; challenge 8+ is a retail OOB read — see §3) | `getLevel50FactoryRentalRange`, `getLevel50InitialRentalFixedIv` (`factoryRentalGeneration.ts:165-196`) | Fed `challengeNum` from the carried streak via `generateFactoryChallengeDraft` |
| Rentals-count / rental rank (`factoryRentsCount[battleMode][lvlMode]`) | `GetNumPastRentalsRank`, `battle_factory.c:868-887` (persists across a whole *active* streak, reset only alongside the win streak in `InitFactoryChallenge`; incremented only when `sPerformedRentalSwap` is set, `SetBattleFactoryData` `:259-265`) | `getFactoryRentalRank` (`factoryRentalGeneration.ts:153-163`) | `FactoryCarry.rentsCount`, sourced from `factoryRoundBattleOrchestrator.facilityState.rentsCount` at round end (`core.ts:822`) |
| Battle Points (cumulative award) | `GiveBattlePoints`, `frontier_util.c:1853-1910`; row index = `(winStreak/7)` decremented-unless-zero, clamped | `factoryBrainRoundOutcome.ts` (`FACTORY_SINGLES_BP_BY_AWARD_ROW`) | `FactoryCarry.battlePoints`, capped `MAX_BATTLE_POINTS`=9999 |
| Symbol count (0/1/2) | `GiveFacilitySymbol` `frontier_util.c:1918-1925`; `GetFrontierBrainStatus` `:1656-1693` for scheduling | `frontierBrainStatus.ts` `getFactoryFrontierBrainStatus`, `factoryBrainRoundOutcome.ts` | `FactoryCarry.factorySymbolsCount` |
| Brain scheduling at battle 21/42 (silver/gold thresholds, then every `+21` for gold-repeat) | `sFrontierBrainStreakAppearances[FACTORY] = {21, 42, 21, 1}`, `GetFrontierBrainStatus` `frontier_util.c:1656-1693` | `frontierBrainStatus.ts` (thresholds 21/42, `tests/frontierBrainRoundShape.test.ts`, `tests/frontierBrainStatus.test.ts`) | Fed the carried streak (via `config.factoryWinStreak`) at orchestrator construction |
| AI-script tier by challenge (0/1 none, 2/3 `CHECK_BAD_MOVE`, 4+ full triad; brain always full triad) | `GetAiScriptsInBattleFactory`, `battle_factory.c:889-911` | `selectFactoryAiMask` (`factoryAiMaskSelection.ts`, explicit doc comment "Pure port of ... GetAiScriptsInBattleFactory") | Derived fresh each round/battle from the carried streak |
| Opponent-trainer exclusion window (`trainerIds[0..curChallengeBattleNum)`, no repeat within a round) | `GenerateOpponentMons`, `battle_factory.c:316-329` | `factoryTrainerSchedule.ts` `generateFactoryTrainerSchedule`/`selectFactoryTrainer` | Per-round only (array conceptually reset by `InitFactoryChallenge`'s `curChallengeBattleNum = 0`); each new orchestrator instance starts a fresh schedule, matching source — **not itself a carried quantity**, listed for completeness since it's easy to mistake for one |
| Trainer-ID scaling by challenge (normal vs. hard ID range, `battleIndex==6` uses hard range) | `GetRandomScaledFrontierTrainerId`, `battle_tower.c:1104-1129` | `factoryTrainerSchedule.ts` | Fed `challengeNum` from the carried streak |
| Player trainer ID | N/A (identity, not a mechanic) | `FactoryCarry.playerTrainerId` | Passed through unchanged |
| Level mode / battle mode (Level 50 vs. Open, Singles vs. Doubles) | `gSaveBlock2Ptr->frontier.lvlMode` / `VAR_FRONTIER_BATTLE_MODE`, chosen once at the lobby before a challenge starts | `ANCHOR_FACTORY_METADATA` (fixed: Level 50 Singles) | **Not currently a chained/selectable dimension in the app at all** — out of scope for this program, not a gap in the carry itself |
| Battle Tower Level-50 win streak (used only for `FillFactoryBrainParty`'s IV mistake, see comment at `battle_factory.c:731-738`) | Genuinely a *different* facility's save field, untouched by Factory play | `ANCHOR_FACTORY_METADATA.battleTowerLevel50WinStreak` (static) | Correctly **not** re-derived per Factory round — the app doesn't implement the Tower, so holding it fixed across a Factory-only session is the faithful behavior, not a shortcut |

## 2. Claims — falsifiable, worth proving

Ordered cheapest/most-foundational first.

**C1. Multi-hop carry arithmetic is exact over ≥3 consecutive rounds
(reaching challengeNum ≥ 3 / streak ≥ 21).**
Property: `advanceFactoryCarry`/`generateFactoryChallengeDraft`, chained N
times through the *real* `tick()`-driven terminal→next-draft path (not just
the pure function calls), produce a streak/BP/symbol/rentsCount state
matching hand-computed ROM arithmetic at every hop.
Instrument: extend `factoryRoundChaining.test.ts`'s existing
`driveGeneratedRoundToCompletion` scripted-win harness (currently proven to
2 hops, `it("(b) streak/symbols/BP/rents carry across two consecutive
completed rounds")`) to 3-4 hops. This harness is decision-level (bypasses
UI ticking for the *battle* portion, only `tick()`s the terminal→draft
transition), so it's cheap — the existing 2-hop test costs ~2.3s wall time
per hop pair; the whole file runs in ~5s including 8 tests. A 4-hop
extension is a few more seconds, not a new instrument.
Acceptance: exact equality against hand-derived streak/BP/symbol values at
every hop (as the existing 2-hop assertions already do), reaching
challengeNum 3 (streak 21, the silver-brain threshold) at hop 3.
Cost: ~1 worker step, cheap (no new module, extends one test file).

**C2. Brain scheduling fires correctly when reached via genuine chaining, not
just synthetic entering-streak injection.**
Property: playing 3 real rounds via C1's harness (streak 0→7→14→21) lands
battle 21 as a real Frontier Brain (silver) encounter — `frontierBrain`
status silver, `FillFactoryBrainParty` roster, `selectFactoryAiMask`'s
`frontierBrain` branch — through the *carried* streak, not the
`factoryWinStreak` constructor override `factoryBrainRoundShape.test.ts`
uses today (six real per-round wins but a synthetic starting streak baked
into that one round's config, not a genuine 3-round chain).
Instrument: same C1 harness, assert on hop 3's battle-index-6 opponent
identity/roster/AI mask.
Acceptance: `TRAINER_FRONTIER_BRAIN` opponent, correct roster
(`FillFactoryBrainParty` parity, already proven standalone — this claim is
about *reaching* it via carry, not the roster generation itself), AI mask
`frontierBrain` branch.
Cost: ~0 marginal (same harness run as C1, additional assertions).

**C3. Tier/IV/AI-escalation *distribution* across challengeNum 0-7 matches
source, when driven by genuinely carried streak values (not just unit-called
with synthetic streak inputs).**
Property: `getLevel50FactoryRentalRange`, `getLevel50InitialRentalFixedIv`,
`selectFactoryAiMask` are already unit-tested for arbitrary challengeNum
0-7 as pure functions (this is the "single-shot generation parity is
already dense" baseline the brief describes) — genuinely NEW here is only
proving the *carry* selects the right challengeNum input at each hop, which
C1 already covers arithmetically. This claim is mostly a restatement of C1
plus "and the resulting rentals/AI mask look like challenge N" — do not
build a separate statistical distribution instrument for this; it would
duplicate the already-dense single-shot generation suites for no new
falsifiable content. **Recommendation: fold into C1's assertions (check
`generation.challengeNum` and one drawn rental's range membership at each
hop) rather than a standalone step.**

**C4. Continuous RNG stream: `Random()` truly does not reseed across a
round boundary — the next round's draft draws from the *exact* trailing
cursor of the previous round's last RNG-consuming event.**
Property already asserted by `factoryRoundChaining.test.ts`'s
`rngValueBefore` checks and the module's own doc comment citing the "one
continuous global" design. This is architecturally proven at 1-2 hops
already; C1's extension to 3-4 hops incidentally re-confirms it at no
marginal cost. Not a separate step.

**C5. Deep-streak walk-up presentation ("what a real player would see")
at the silver/gold brain entrance, reached via genuine chained play.**
Property: the FAITHFUL walk-up program (already in flight, separate
program) presents correctly when the brain is reached through real
round-to-round chaining rather than a lab-staged jump straight to
`battleNum = 6`.
Instrument: **cannot be built with the current oracle lab staging** — see
§3. The only currently-available fallback is what the walk-up program
already uses: source + a targeted RAM probe on the existing (deficient)
staged fixture, not a natural-chained-play oracle trace. Recording this
claim here so it is not silently assumed covered by C1-C3 (which are pure
TS-engine claims, no oracle involved) or by the walk-up program (which
proves the dialogue/menu *content* is correct, not that a genuinely
streak-21 chained arrival looks identical to a synthetically-staged one).
Cost: not currently buildable; tracked as a GAP (§3), not a dispatchable
step, until the harness-side fix lands (out of this program's scope — see
ROADMAP's existing harness-fix backlog entries in the two cited docs).

**C6. Streak-56+ boundary (challengeNum 8, Level 50) does not silently
diverge from the pinned ROM build.**
Property: `generateInitialFactoryRentals` and
`getLevel50InitialRentalFixedIv` deliberately `throw` past challengeNum 7
(`factoryRentalGeneration.ts:229-233`, comment: "avoid pretending the retail
OOB read for challenge 8+ is a stable rule"). Confirmed the pinned reference
build has `MODERN=0` and `BUGFIX` undefined
(`reference/pokeemerald/include/config.h:48`,
`reference/pokeemerald/Makefile:6`) — i.e. genuine retail-UB territory: the
un-fixed `GetFactoryMonFixedIV` reads `sFixedIVTable[8]`, one past the
declared 8-row array, whatever memory follows being "interpreted as random
IVs" per the source comment. This is not a definable behavior to port
against — throwing is the intentionally correct choice, not a placeholder
bug. **Not a claim to prove; a boundary to document** so "play indefinitely"
doesn't quietly promise behavior at streak ≥ 56 the ROM itself doesn't have
a stable answer for. No step needed; flagging for the ROADMAP's framing
(see final message).

## 3. Gaps — what the current instruments genuinely cannot measure

1. **Multi-round oracle replay of natural chained play does not exist and
   is expensive to build.** The oracle replays traces against a fixed
   captured savestate; there is no "play N rounds, get the state after"
   trace primitive, and driving one via raw button-press traces through the
   real emulator for even one 7-battle round is already the most expensive
   trace shape this harness uses. Getting to challengeNum ≥ 3 (21 real
   battles) via genuine natural play against the oracle is not a "one worker
   step" cost — it would need either many hours of trace time or a save-state
   staging primitive the harness doesn't have today. This is why C1-C4 above
   are scoped as pure-TS-engine harness claims (decision-level, no oracle),
   not oracle-parity claims — the chained *carry arithmetic* can be proven
   without the oracle (each hop's ingredients — rental generation, party
   construction, trainer selection — already have their own dense
   oracle-backed single-shot parity; chaining is "thread the right numbers
   between already-proven pure functions," which a pure TS scenario can
   check exactly).
2. **The Factory lab-staging mode (`factoryBrain`) cannot reach a genuine
   streak-21/42 overworld state**, so no oracle trace can currently observe
   what the real ROM shows around a *chained* (not directly-staged) brain
   encounter:
   - `docs/noland-walkup-dialogue-scoping.md` §1.6: `BattleLab.prepare()`
     forces `battleNum = 6` (battle-side Brain detection, e.g.
     `FillFactoryBrainParty`) but never writes the SaveBlock2 symbol-count
     field `GetFrontierBrainStatus` reads, so gold's overworld readiness
     check reads `FRONTIER_BRAIN_NOT_READY` and the ordinary-opponent branch
     fires instead of `EnterRoomFactoryHeadBattle` — a lab-staging artifact,
     not real ROM behavior, root-caused via RAM probe
     (`tools/probe/probe-factory-brain-gold-entrance-ram.py`).
   - `docs/noland-silver-walkup-presentation-map.md` §0: the same
     `prepare()` path never writes `VAR_0x8006`, so **silver's**
     PreBattleRoom call-scene (§1.1 events #1-6 of the walk-up script) is
     also unreachable via any currently staged fixture — a different
     specific mechanism than the gold gap, but the same class (harness
     `prepare()` doesn't reproduce the overworld-side bookkeeping a genuine
     chained arrival would have). Both are flagged root-cause, not fixed —
     fixing is harness-side (`oracle/battle_lab.py`), out of scope for a
     workspace-side worker.
   - Practical consequence: any oracle-backed claim about "what a real
     player literally sees walking up to Noland after actually winning
     3 rounds in a row" is currently unbuildable without either (a) a
     harness-side `battle_lab.py` fix (USER-level per the Noland program's
     established handoff pattern) or (b) genuine multi-hour natural play
     through the oracle (§ gap 1). The FAITHFUL walk-up program's existing
     plan (source + targeted RAM probes on the deficient-but-usable staged
     fixture) is the only currently-affordable substitute, and it already
     accepts this as a scoping constraint — not new information, restated
     here because the brief asked this program to reconcile with it.
3. **No "keep winning" soak policy exists.** `RandomPlayer`'s `full` and
   `vanilla` policies are both unbiased/pessimistic about winning (§0); the
   only deterministic-win policy in the tree, `strong-route`, is hardwired
   to one staged single-round scenario (`createSevenWinLiveState`,
   partyIndex/isFirstTurn-specific move selection) and does not generalize
   to arbitrary freshly-generated chained-round opponents. This means the
   *production soak driver* (as opposed to the decision-level
   `driveGeneratedRoundToCompletion` harness C1 proposes reusing) cannot
   itself be used to reach deep-streak crash coverage — a seed that
   naturally strings together 3+ round wins under `full`/`vanilla` play would
   be luck, not something the driver can be pointed at. This is a real gap
   for *crash coverage* at deep streak (distinct from C1-C3's pure-arithmetic
   claims, which don't need the soak driver at all) — noted for the ROADMAP,
   not solved by this program (see step 3 below for the minimal version
   worth building; a full generalized-winning soak policy is explicitly
   out of scope as disproportionate to the payoff).

## 4. Ordered steps (dispatchable, smallest-first)

**Step 1 — Extend the chaining carry-arithmetic test to 3-4 hops
(reaches challengeNum 3 / streak 21).**
Goal: prove C1 and C2. Extend
`tests/factoryRoundChaining.test.ts`'s `driveGeneratedRoundToCompletion` +
`driveTerminalToNextDraft` pattern (already proven for 2 hops at lines
282-301) to a 3rd and 4th hop, reusing the same curated-strong-party
(664/678/527) scripted-win recipe. Assert at each hop: `factoryWinStreak`
(7/14/21/28), `generation.challengeNum` matches `floor(streak/7)`, and at
hop 3 specifically that battle-index-6's opponent is
`TRAINER_FRONTIER_BRAIN` with `frontierBrain.status === "silver"` (via
`getFactoryFrontierBrainStatus`) — folding C3's "does the carry select the
right challengeNum" restatement into the same assertions rather than a
separate harness.
Acceptance: new/extended test green, `npm test` and `npm run build` stay
green, no existing pin moves. Cost: small, single file, no new modules
(the existing 8-test file already runs in ~28s of which ~5s is actual test
time; a 2-hop extension is single-digit seconds more).
Out of scope: touching `factoryRoundChaining.ts`/`core.ts` itself (this is
a test-only step unless it finds a genuine bug, in which case stop and
report rather than architecting a fix); the oracle; the soak driver;
gold/streak-42 (that's a second, symmetric but separate hop count — leave
for a follow-on if step 1 finds nothing surprising at silver).

**Step 2 — Document the streak-56+ (challengeNum 8, Level 50) boundary in
the round-chaining module's own doc comment, citing the retail-UB source
finding (C6).**
Goal: make the intentional `throw` in `generateInitialFactoryRentals`/
`getLevel50InitialRentalFixedIv` traceable to *why* (retail OOB read,
pinned build has `BUGFIX` undefined) without re-deriving the investigation
next time someone hits it. One doc-comment addition near the existing
`factoryRentalGeneration.ts:229` comment, citing
`reference/pokeemerald/include/config.h:48` and
`reference/pokeemerald/Makefile:6`.
Acceptance: comment added, `npm run typecheck` green (comment-only diff),
no test changes needed since behavior is unchanged.
Out of scope: changing the throw to a clamp, an approximation, or any other
behavior — this step is documentation only; changing retail-UB behavior
without a design decision on which fallback to fake is explicitly not this
step's call.

**Step 3 — Add an opt-in "win-biased" soak policy variant for deep-streak
crash coverage (addresses gap 3).**
Goal: a third `SoakPolicy` (e.g. `"winning"`) that reuses `full`'s
menu/target exploration but biases fight-move selection toward
highest-power/legal damaging moves and declines risky voluntary switches,
so a soak run naturally strings together several round wins instead of the
current near-certain quick loss — enough to occasionally reach
challengeNum ≥ 2-3 under real `tick()`-driven play (crash coverage, not
exactness — C1-C3 already cover exactness via the decision-level harness).
Not a guaranteed-win policy (that's `strong-route`'s narrow, scenario-tied
job); a *biased* one, so it stays "arbitrary-but-legal player behavior"
in spirit rather than an oracle for the AI. Land behind an explicit CLI
flag, default soak behavior (`full`/`vanilla`) unchanged.
Acceptance: new policy variant is deterministic per seed (same
determinism test pattern as the existing policies), a small seed range
(e.g. 0:20) shows materially deeper average chain depth than `full`/
`vanilla` on the same seeds (report the observed depth, don't hardcode an
exact number as a pin — RNG-sensitive), `npm test`/`npm run build` green,
no change to `DEFAULT_RUN_OPTIONS` (this is a new opt-in variant, not a
change to the standing full/vanilla soak baselines PROGRESS 1275 just
re-based).
Out of scope: running the new policy over a wide seed range as a new
standing gate (that's a supervisor call once the policy exists and its
cost is known); touching engine code for any crash the new policy
surfaces (file it in ISSUES.md/report it, per the "soak driver never
fixes engine behavior" convention — this step is coverage, not fixing).

**Step 4 — SATISFIED BY LANDED INFRASTRUCTURE (2026-08-16 supervisor
note): no memo needed.** Top-layer harness commit `4dac4a35`
(2026-08-15) implemented exactly what this step would have designed:
`factoryBrain` + `walkup: true` staging redirects the parked field
script to the ROM's own post-win fragment (so `VAR_0x8006 = 1` and the
streak/battle-number bookkeeping land genuinely), and challengeNum 5 now
sets the silver symbol flag `GetFrontierBrainStatus` reads. See
`../oracle/BATTLE_LAB.md` "Frontier-Brain walk-up staging". Gap 2 is
closed; the original step text is preserved below for the record.

**Step 4 (original text; only after 1-3 land and only if the user wants
oracle-backed deep-streak walk-up evidence, not just engine-arithmetic
evidence) — Design (do not build) the harness-side `battle_lab.py` fix
for `factoryBrain` staging's overworld bookkeeping gap.**
Goal: a design memo (not code — `oracle/` is USER-level per the
established Noland-program handoff pattern) specifying what
`BattleLab.prepare()` needs to write (silver: `VAR_0x8006`; gold: the
symbol-count SaveBlock2 field `GetFrontierBrainStatus` reads) to make a
staged `factoryBrain` fixture overworld-readable as a genuine
streak-21/42 arrival, closing gap 2. This is explicitly the smallest
speculative step in this program — only worth dispatching if C5's oracle
evidence becomes a real priority; the walk-up program's existing
source+RAM-probe substitute is a working, already-budgeted alternative
that doesn't need this fix to ship.
Out of scope: touching `oracle/battle_lab.py` itself (design only, per the
harness-changes-go-through-the-user rule already established for this
program).
