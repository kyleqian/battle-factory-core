# Design scout: "policy strength" as an M-B follow-on milestone (2026-08-23, side lane)

Tree: `worker/side-20260823-001236` off master `05cb1980`, oracle `battle-scene-off`
(`http://127.0.0.1:8014`). Docs only — no engine, driver, or ledger edits.

**Headline, and it overturns the brief's premise.** The wall is **not** "challenge 4/5"; it is
**challengeNum 4 alone**. Booted at carry 28 the `winning` policy wins **0/30** rounds and loses
**battle 1 in 22/30**. Booted seven steps deeper at carry 35 — where the AI flags are *identical*
(`battle_factory.c:906-909`) — the same policy wins **5/30** rounds and only loses battle 1 in
**6/30**. Difficulty *decreases* monotonically past challenge 4, and the source says why: the
player's rental fixed-IV row climbs 15 -> 21 -> 31 while the opponent's is pinned at 3
(`sFixedIVTable`, `battle_factory.c:157-167` + `factoryOpponentGeneration.ts:239-258`).
Challenge 4 is the unique local minimum — the first tier with the full scored triad, and the last
one before the player's IV cushion opens up.

---

## 1. Where the losses happen

Commands (one foreground Bash call, 9 chunks of 10 seeds + 2 verbose repros in parallel, 16 cores,
~5 min wall; per-sweep logs/JSON in `/tmp/scout8023/`, chunk boundaries 0:10 / 10:20 / 20:30):

```
npm run soak -- --policy winning      --start-carry 28 --seeds 0:30 --render-every 0
npm run soak -- --policy winning      --start-carry 35 --seeds 0:30 --render-every 0
npm run soak -- --policy winning-swap --start-carry 28 --seeds 0:30 --render-every 0   # lever (b)
```

Aggregated summary lines (union of the three chunks per sweep):

| sweep | policy | boot carry | n | OK | CRASH | HANG | deepest carry | deepest depth | **rounds won** |
|---|---|---|---|---|---|---|---|---|---|
| (a) | `winning` | 28 | 30 | 30 | 0 | 0 | 28 | 32 | **0/30** |
| (b) | `winning` | 35 | 30 | 30 | 0 | 0 | **42** | **48** | **5/30 (16.7%)** |
| (c) | `winning-swap` | 28 | 30 | 30 | 0 | 0 | 28 | 30 | **0/30** |

Every OK seed's sub-outcome is `budget` (1,000,000 frames), as in every prior `winning` sweep.

**Battle index where the boot round is lost.** `maxBattleDepth - bootCarry` is the 0-based
`battleIndex` reached (`randomRoundSoakDriver.ts:474-481`), so the round is lost at battle
`depth - carry + 1`:

| lost at | (a) `winning`@28 | (b) `winning`@35 | (c) `winning-swap`@28 |
|---|---|---|---|
| b1 | **22** (0,1,2,3,4,5,6,8,10,12,13,16,17,18,19,20,23,25,26,27,28,29) | 6 (7,19,21,24,26,27) | **21** |
| b2 | 5 (7,9,15,22,24) | 3 (13,20,25) | 8 (7,9,11,14,15,21,22,24) |
| b3 | 1 (11) | 5 (4,10,17,22,23) | 1 (13) |
| b4 | 1 (14) | 5 (1,2,3,16,18) | 0 |
| b5 | 1 (21) | 3 (0,11,15) | 0 |
| b6 | 0 | 2 (12,28) | 0 |
| b7 | 0 | 1 (6) | 0 |
| **round won** | **0** | **5** (seeds 5,8,9,14,29 -> carry 42) | **0** |

The 5 carry-35 winners then play a carry-42 round and get **1/6/2/3/6** further battles
(depths 43/48/44/45/48) — i.e. two of them reach **b7 of challenge 6** before the frame budget ends.

**Missing field (feeds deliverable 4).** The driver prints no per-round result and no HP margin, so
"3-0 sweep vs close loss" is **not answerable from the sweep output**. The per-seed line's `b<N>
t<M>` is the battle/turn where the *frame budget* ran out, not where the round was lost, and it is
known to leak across rounds (`docs/soak-deep-sweep-2026-08-22-4M.md`, "Driver papercut"). The
verbose transcript does carry the raw signal — `forced party:` lines appear only on a player faint
(`/tmp/scout8023/v0.log`, e.g. `[f=3481 b1 t3] forced party: DOWN to legal slot`) — but at 86,130
lines per seed it is not a sweep instrument.

---

## 2. Why — what actually changes at challenge 4 and 5

| knob | source | ch3 | **ch4** | **ch5** | ch6 |
|---|---|---|---|---|---|
| opponent AI flags | `battle_factory.c:904-909`, `factoryAiMaskSelection.ts:137-141` | `CHECK_BAD_MOVE` | **`CHECK_BAD_MOVE`+`TRY_TO_FAINT`+`CHECK_VIABILITY`** | same as ch4 | same |
| player rental fixed IV | `sFixedIVTable[challengeNum][0]`, `battle_factory.c:157-167`; `getLevel50InitialRentalFixedIv`, `factoryRentalGeneration.ts:250-263` | 12 | **15** | **21** | 31 |
| opponent fixed IV | `getLevel50FactoryOpponentFixedIv`, `factoryOpponentGeneration.ts:239-258` (Tower-streak bug — row 0 always, `battle_factory.c:735-738`) | 3 / 6 last | **3 / 6 last** | **3 / 6 last** | 3 / 6 |
| mon pool (both sides) | `sInitialRentalMonRanges`, `battle_factory.c:169-190` | 372-467 | **468-563** | **564-659** | 660-755 |

Both sides draw from the *same* row (`GetFactoryMonId(..., FALSE)` for the opponent at
`battle_factory.c:334`, and for rentals at `:560`), so the pool row is symmetric. The **only**
asymmetric knob is the IV ladder, and it moves in the player's favour by +6 at ch5 and +10 at ch6
against a frozen opponent. That is the mechanism behind the (a)-vs-(b) gap and behind the prior
session's `--start-carry 42` sweep winning rounds freely
(`docs/soak-start-carry-2026-08-22.md`, sweep (b)).

**What the triad does that the scorer has no answer to.** `pickWinningFightSlot`
(`randomRoundSoakDriver.ts:89-128`) is `basePower x typeEffectiveness x STAB`, evaluated on the
*current* active pair only. It has no model of:

| opponent capability at ch4 | scorer's blind spot | seen in |
|---|---|---|
| `AI_TryToFaint` picks the move that KOs *this turn* | the scorer never computes damage vs the defender's remaining HP, so it can pick a 120-power resisted move over an 80-power KO | (a) b1 losses; `factoryAiTryToFaint.ts` |
| `AI_CheckViability` scores status/setup/utility effects | the scorer gives every 0-power move score 0 and only ever picks one as a last-resort fallback (`:104-112`, `:127`) — it never uses status itself and never accounts for being statused | `factoryAiCheckViability.ts`, `unportedCheckViabilityTableEffects` (`factoryAiDecisionPolicy.ts:858`) |
| `AI_CheckBadMove` avoids immunities/redundancy | symmetric — this is the one capability the scorer roughly matches | `factoryAiCheckBadMove.ts` |
| accuracy | not in the formula at all — a 120/70%-accurate move outscores a 95/100% one every time | `randomRoundSoakDriver.ts:117-122` |
| the opponent's *bench* | the walled-switch heuristic (`:137-250`) reads only the **live** opponent types, so it can switch into a hard counter | `pickWinningSwitchRow` (`:218`) |
| IV/stat gap (15 vs 3) | draft is random 3-of-6 (`:598-606` policy comment), so half the rank-0 IV cushion is thrown away on the two weakest rentals | (a) 22/30 b1 losses |

**Loss mechanisms visible in the seeds, ranked by frequency.** (a)'s 22/30 battle-1 losses with
0/30 rounds won is a *first-battle* problem, not an attrition problem: the party that walks into
b1 of challenge 4 is simply outclassed. (b)'s spread — losses distributed across b1..b7 with a
long tail — is the attrition profile you would expect from a *competitive* matchup. So the single
dominant mechanism at ch4 is **party quality at draft time**, not in-battle move choice; the
in-battle blind spots above are the second-order tail that (b) shows.

**Instrument caveat found on the way (real, and it biases every `--start-carry` number to date).**
`createStartCarryState` sets `factoryWinStreak: startCarry` but `rentsCount: 0`
(`randomRoundSoakDriver.ts:1437,1440`). A *naturally* chained player at carry 28 has rented 3 mons
in each of 4 completed rounds plus 3 for this one = **15**, which is exactly
`GetNumPastRentalsRank`'s rank-1 threshold (`battle_factory.c:868-887`, ported at
`factoryRentalGeneration.ts:208-212`). At rank 1 one of the six offered rentals is drawn from the
**better range** *and* at `getLevel50InitialRentalFixedIv(4, true)` = row 5 = **21 IVs**
(`factoryRentalGeneration.ts:255-259`). So `--start-carry 28` boots a **weaker-than-real** player,
and (a)'s 0/30 is a pessimistic bound on what natural play at carry 28 faces.

---

## 3. Levers, ranked

| # | lever | predicted carry>=35-by-play rate | size | measurement command |
|---|---|---|---|---|
| **1** | **`--start-carry` rentsCount fidelity fix**: derive `rentsCount` from `startCarry` (`3 * (startCarry/7) + 3`) instead of 0 | **not a play lever — a correctness fix.** Restores rank 1, i.e. 1 of 6 rentals at IV 21. Expect (a) to move off 0/30; magnitude unknown, that's the point of measuring | 1 file, ~5 lines + 1 test | `npm run soak -- --policy winning --start-carry 28 --seeds 0:30 --render-every 0` (re-run (a); success = any round won) |
| **2** | **(e) oracle-strength policy** — reuse `chooseFactoryAiScoredDecision` (`factoryAiDecisionPolicy.ts:895`) for the player's side, mask 7 | **highest.** By construction exactly as strong as the challenge-7 opponent AI, against an opponent that is *weaker* (IV 3 vs the player's 15) — should convert (a) from 0/30 to a majority | ~150-250 lines: a `PlayerPolicy` branch that builds a `FactoryAiScoredBattlerView` pair from `EngineState` and maps the chosen slot to button presses. The scorer is pure and already tested | new `--policy oracle-strength`, then `--start-carry 28 --seeds 0:30`; success = **>= 15/30 rounds won at carry 28** and carry >= 35 observed with **no** `--start-carry` in a 0:120 sweep |
| **3** | **(c) KO-first + accuracy weighting** in `pickWinningFightSlot` | moderate. Fixes the two cheapest blind spots in the table above without touching the draft | ~40 lines in one function + its unit tests; needs a damage estimate the driver does not have today (biggest hidden cost) | `--policy winning --start-carry 28 --seeds 0:30`; success = b1 losses **< 12/30** (vs 22/30) |
| **4** | **(a) draft-by-strength** — the WITHHELD heuristic | **low as built.** `1f500a92` / `docs/soak-draft-heuristic-n180-2026-08-22.md`: 180/180 OK but **carry>=21 in 7/180 and carry>=28 in 0/180**, vs the baseline arm's 40 at carry>=21. It wins round 2 more often and collapses at ch3+ — it optimises base-stat-total + STAB power, which selects bulky mono-STAB rentals with no coverage, and coverage is exactly what a 3-mon party needs across 7 opponents | already written (rebase of `wip/mb-step2b-draft-heuristic`) | re-measure only *after* lever 1 lands: `--policy winning --start-carry 28 --seeds 0:30` |
| **5** | **(d) walled-switch tuning** — widen "walled" past true immunity, read the opponent's bench | low. (a)'s losses are at b1 on party quality; switch tuning is a b3+ lever and (b) already shows b3+ is not where challenge 4 dies | ~30 lines in `pickWinningSwitchRow` (`:218`) | `--policy winning --start-carry 35 --seeds 0:30`; success = rounds won **> 5/30** |
| **6** | **(b) swap-accept** — `winning-swap` | **MEASURED, NEGATIVE.** Sweep (c) above: 0/30 rounds won at carry 28, and a *shorter* tail than `winning` (max b3 vs b5). Accepting swaps does not help at challenge 4 | n/a | done — see sweep (c) |

---

## 4. Instruments missing

Everything in section 1 that needed hand-derivation, in the order it would have saved time:

1. **Per-seed round ledger**: `rounds: W-L, lost at b<N> turn <T>, reason <all-fainted|...>`. Today
   `maxBattleDepth - carry` only works because a boot-carry round is played at most once per seed;
   it is arithmetic on a running max, not a record.
2. **Loss shape**: player mons remaining and opponent mons remaining at the losing battle's end
   (3-0 vs 1-0), plus each side's final HP as a fraction of max. This is the single field that would
   have answered the brief's "sweep or close loss" question directly.
3. **`rentsCount` and rental rank** on the per-seed line — both to expose the `--start-carry` fidelity
   gap above and because rank is a first-class difficulty knob (`battle_factory.c:868-887`).
4. **Fixed-IV pair actually generated** (player row / opponent row) per round. Section 2's whole
   argument is a source read; the driver could just print it.
5. **Fix the `b<N> t<M>` label leak across rounds** (already filed as a papercut in
   `docs/soak-deep-sweep-2026-08-22-4M.md`) — a stale label makes every end-of-run line ambiguous.

Items 1-3 are all reads off `factoryRoundBattleOrchestrator` state the driver already samples every
tick for `maxCarriedWinStreak` (`randomRoundSoakDriver.ts:1603-1612`); this is a ~40-line change.

---

## 5. Recommendation

**Do it, but do lever 1 first and make it a two-step, not a milestone.** The brief's framing — "is
policy strength worth a milestone now that `--start-carry` covers the deep tiers for crash
coverage?" — has a cheaper answer than either yes or no: `--start-carry` **does not** faithfully
cover the deep tiers today, because it boots every deep round at `rentsCount: 0` / rank 0
(`randomRoundSoakDriver.ts:1440`) when a real chained player at that depth is rank 1. That is a
5-line fix to the instrument the whole crash-coverage argument rests on, and it must land before
any policy work is measured against it. After it, the honest picture is that only **one** tier is
actually unbeaten — challenge 4 — and past it the player's IV ladder does the work unaided (sweep
(b): 5/30 round wins at carry 35, two seeds reaching b7 of challenge 6). So the deliverable is not
"a stronger policy" in general; it is "get through challenge 4 once." Lever 2 (the oracle-strength
policy reusing `chooseFactoryAiScoredDecision`) is the one to build, because it is
source-derived rather than hand-tuned, it is bounded (~200 lines, no new game logic), and it lands
opt-in beside `winning` exactly as `winning-swap` did. Do **not** revive lever 4 — it measured worse
at n=180 and section 3 explains why. Single acceptance command and number:
`npm run soak -- --policy oracle-strength --seeds 0:120 --render-every 0` reaching
**carry >= 35 in >= 6/120 seeds with no `--start-carry`** — the same 5% rate sweep (b) shows is
achievable once a party survives challenge 4, and a strict improvement on the 2026-08-22 baseline of
carry >= 28 in 18/480 (3.75%) and carry >= 35 in 0/480.

---

**Supervisor correction (2026-08-23, fold commit).** Section 2's "instrument caveat" and lever 1
rest on a wrong premise: `factoryRentsCount` is NOT "mons rented". Its only writer is
`SetBattleFactoryData`'s `FACTORY_DATA_WIN_STREAK_SWAPS` case, gated on `sPerformedRentalSwap`
(`battle_factory.c:259-265`; the flag is set per ACCEPTED swap at `:300`) — it counts
swap-then-win events, as ISSUES #120 (fixed this session, `99be536d`) re-derived. A naturally
chained `winning` player, which declines every swap, has `rentsCount 0` at every depth, so
`createStartCarryState`'s `rentsCount: 0` is exactly faithful for sweeps (a)/(b) and lever 1 is
NOT a correctness fix for them. It is a fidelity gap only for swap-accepting policies
(`winning-swap`: up to +6 per won round post-#120), where the honest shape is an explicit
`--start-rents N` flag, not a formula. Everything else in this doc stands; lever 2 remains the
recommendation.

---

## Result (2026-08-23, main lane, worker step — lever 2 built and measured)

`--policy oracle-strength` landed as an **opt-in** soak policy
(`tools/soak/randomRoundSoakDriver.ts`, commits `3bbf33b0` + `ee46c9bb`):
identical to `winning` in every respect (random 3-of-6 draft, swap offers
declined, the same voluntary-switch heuristic, the same exploration/timing
rolls) EXCEPT the fight-move choice, which is delegated to the engine's own
source-derived scorer `chooseFactoryAiScoredDecision` under the full mask 7.
`buildOracleStrengthPlayerView` mirrors `createFactoryAiViewFromLiveRules`
with the two sides swapped (attacker battler 0, target battler 1, side
statuses and `gLastMoves` indexed to match) and hands the player full
knowledge of the opponent's live moves / real ability / real hold effect —
a test instrument, not a fairness model. The scorer runs on a u32 cursor
drawn from the **soak's own seeded RNG** (one draw per fight-menu decision)
and its advanced cursor is discarded, so the live battle's RNG cursor is
never touched by the player's decision. No engine edit was needed: everything
it reads was already exported.

### (2) Smoke from the anchor

```
npm run soak -- --policy oracle-strength --seeds 0:20 --render-every 0
```
```
=== soak summary: 20 seeds (policy oracle-strength) in 463.7s ===
OK 20  CRASH 0  HANG 0
carry >= 7 (challengeNum >= 1): 20/20   carry >= 14: 16/20
carry >= 21 (challengeNum >= 3): 4/20   carry >= 28 (challengeNum >= 4): 1/20
deepest carry anywhere: 28   deepest battle-depth anywhere: 28
```
Every seed's sub-outcome is `budget`. The `winning` 2026-08-22 baseline over
480 anchor seeds was carry >= 28 in **18/480 (3.75%)** and carry >= 35 in
**0/480**; this 20-seed slice sits at 1/20 (5%) and 0/20 — the same order of
magnitude, n far too small to call a difference. The 0:120 confirmation sweep
was **not run** (out of session time), so the scout's §5 acceptance number
(carry >= 35 in >= 6/120 with no `--start-carry`) is **unmeasured**.

### (3) THE MEASUREMENT — boot at carry 28, the unbeaten tier

```
npm run soak -- --policy oracle-strength --start-carry 28 --seeds  0:10 --render-every 0
npm run soak -- --policy oracle-strength --start-carry 28 --seeds 10:20 --render-every 0
npm run soak -- --policy oracle-strength --start-carry 28 --seeds 20:30 --render-every 0
```
(three parallel chunks, one foreground call, ~4 min wall; union below)

| policy | boot carry | n | OK | CRASH | HANG | deepest carry | deepest depth | **rounds won** |
|---|---|---|---|---|---|---|---|---|
| `oracle-strength` | 28 | 30 | 30 | 0 | 0 | 28 | 32 | **0/30** |

**Scout prediction >= 15/30. Actual 0/30 — the same as the `winning`
baseline's 0/30. Lever 2 is a NEGATIVE result.**

Battle index where the boot round is lost (`maxBattleDepth - 28 + 1`), against
sweep (a) `winning`@28 from §1:

| lost at | **`oracle-strength`@28** | `winning`@28 (sweep (a)) |
|---|---|---|
| b1 | **22** (0,1,2,3,4,7,8,9,10,12,13,16,17,18,19,20,22,25,26,27,28,29) | **22** |
| b2 | 6 (6,11,14,21,23,24) | 5 |
| b3 | 1 (5) | 1 |
| b4 | 0 | 1 |
| b5 | 1 (15) | 1 |
| **round won** | **0** | **0** |

The distribution is statistically indistinguishable from `winning`'s: the same
22/30 battle-1 losses, the same short tail.

**The scorer really ran.** `SeedResult.oracleStrengthFallbacks` summed to **0**
across all 30 seeds (and 0 on the anchor smoke) — every single fight-menu
decision in the sweep was answered by `chooseFactoryAiScoredDecision`, not by
the fallback. So this is a clean measurement of the lever, not of a policy
that quietly degraded to `winning`.

### What this settles

§2's own ranked-mechanism paragraph was right and its lever ranking was
wrong: *"the single dominant mechanism at ch4 is **party quality at draft
time**, not in-battle move choice; the in-battle blind spots are the
second-order tail."* Giving the player a **source-exact, full-knowledge,
full-triad move chooser** — by construction as strong as the challenge-7
opponent AI, against an opponent with IV 3 vs the player's 15 — moves the
carry-28 round-win rate by **zero**. In-battle move choice is not what loses
challenge 4; the party that walks into b1 is.

That also retires levers 3 and 5 by implication: lever 3 (KO-first +
accuracy weighting in `pickWinningFightSlot`) is a strictly weaker
approximation of exactly what lever 2 just did with no effect, and lever 5
(walled-switch tuning) is a b3+ lever in a distribution where 22/30 losses
are at b1. What remains untested at ch4 is the **draft**, and lever 4 as
built measured worse (§3). A genuinely new draft heuristic — coverage-first
rather than the withheld base-stat+STAB one — is the only lever this
measurement leaves standing, and it is a new design problem, not a rerun.

The policy stays in the tree as an opt-in instrument (it is now the strongest
in-battle player available for crash coverage at depth, and it costs nothing
when unused), but it is **not** promoted to the gate set.

---

## Result — lever 4' (coverage-first draft), 2026-08-23, main lane, worker step

`--policy winning-coverage` landed as an **opt-in** soak policy
(`tools/soak/randomRoundSoakDriver.ts`, commit `1a0c3d09`): identical to
`winning` in every respect (same fight/switch/swap-decline/continuation
decisions, same exploration and timing rolls, same shared-RNG-stream draws —
the constructor's draft shuffle is still *drawn* and then overwritten, and the
NO-decline reroll is still drawn but ignored) EXCEPT the **draft**, which rents
the 3-of-6 offered rentals maximising a **coverage-first lexicographic score**
instead of a random 3-of-6. This is the lever §3's ranking left standing after
lever 2 measured 0/30 (the "Result" section above) — a NEW score, not a rerun
of the withheld bulk+STAB heuristic (`1f500a92`), whose plumbing shape (score
all six off the draft state, then drive the cursor to the chosen slots) is
reused with its score replaced.

**The score** (`pickCoverageDraftPicks`, deterministic — no RNG at all;
enumerates all 20 three-of-six combinations, ties keep the earliest):

| axis | definition |
|---|---|
| **offensive** (primary) | of the 17 Gen-3 defending types, those some damaging move (power > 0) anywhere in the trio is super-effective against, each weighted `1 + occurrences among the six offered rentals' own types` (the rental ranges are symmetric — §2 — so the offers are a free sample of the tier's opponent pool; the `+1` base keeps a type absent from the six offers still worth counting) |
| **defensive** (secondary) | distinct primary/secondary types across the trio, minus the count of *shared* 4x weaknesses (attacking types two or more of the three take >= 4x from) |
| **bst** (tiebreak only) | summed species base-stat total — the withheld heuristic's own axis, demoted from primary to a pure tiebreak precisely because §3 shows optimising it starves coverage |

Rent ORDER inside the chosen trio is descending base-stat total (ties keep the
lower slot), so the bulkiest of the three leads battle 1; the trio itself is
chosen by coverage. The verbose transcript logs
`draft: coverage trio 1,4,5 (off 27 def 5 bst 1234) SPECIES_… …`.
Tier-1 pins: `tests/randomRoundSoakCoverageDraft.test.ts` (4 tests).

### (2) Smoke from the anchor

```
npm run soak -- --policy winning-coverage --seeds  0:10 --render-every 0
npm run soak -- --policy winning-coverage --seeds 10:20 --render-every 0
```
(two parallel 10-seed chunks — the 600 s foreground tool cap; union = the
requested `--seeds 0:20`)

```
=== soak summary: 10 seeds (policy winning-coverage) in 239.4s ===
OK 10  CRASH 0  HANG 0
carry >= 7  (challengeNum >= 1): 10/10   carry >= 14: 10/10
carry >= 21 (challengeNum >= 3): 4/10    carry >= 28 (challengeNum >= 4): 0/10
deepest carry anywhere: 21   deepest battle-depth anywhere: 23

=== soak summary: 10 seeds (policy winning-coverage) in 235.7s ===
OK 10  CRASH 0  HANG 0
carry >= 7  (challengeNum >= 1): 10/10   carry >= 14: 9/10
carry >= 21 (challengeNum >= 3): 6/10    carry >= 28 (challengeNum >= 4): 1/10
deepest carry anywhere: 28   deepest battle-depth anywhere: 28
```
Union: **20/20 OK, 0 CRASH, 0 HANG**, every seed's sub-outcome `budget`.

### (3) THE MEASUREMENT — boot at carry 28, the unbeaten tier

```
npm run soak -- --policy winning-coverage --start-carry 28 --seeds  0:10 --render-every 0
npm run soak -- --policy winning-coverage --start-carry 28 --seeds 10:20 --render-every 0
npm run soak -- --policy winning-coverage --start-carry 28 --seeds 20:30 --render-every 0
```
(three parallel chunks, one foreground call, ~4 min wall; union below)

| policy | boot carry | n | OK | CRASH | HANG | deepest carry | deepest depth | **rounds won** |
|---|---|---|---|---|---|---|---|---|
| `winning-coverage` | 28 | 30 | 30 | 0 | 0 | **28** | 29 | **0/30** |
| `oracle-strength` (lever 2) | 28 | 30 | 30 | 0 | 0 | 28 | 32 | 0/30 |
| `winning` (sweep (a)) | 28 | 30 | 30 | 0 | 0 | 28 | 32 | 0/30 |

**0/30 — a NEGATIVE result on the load-bearing number**, and the third policy
in a row to score exactly 0 at challenge 4. No seed's deepest carry left 28,
i.e. no boot round was won.

Battle index where the boot round is lost (`maxBattleDepth - 28 + 1`):

| lost at | **`winning-coverage`@28** | `oracle-strength`@28 | `winning`@28 (sweep (a)) |
|---|---|---|---|
| b1 | **29** (every seed except 27) | 22 | 22 |
| b2 | 1 (seed 27) | 6 | 5 |
| b3 | 0 | 1 | 1 |
| b4 | 0 | 0 | 1 |
| b5 | 0 | 1 | 1 |
| **round won** | **0** | **0** | **0** |

The tail is *shorter* than either baseline's: 29/30 battle-1 losses vs 22/30.
Booted cold at challenge 4, a coverage-first party is **frailer** than a random
3-of-6 — base-stat total being a pure tiebreak means the trio that maximises
type coverage is routinely three low-BST rentals, and at challengeNum 4 (player
IV 15 vs opponent IV 3, full AI triad — §2) that party gets run over in the
first battle. Coverage without a strength floor is a worse cold-boot draft.

### (4) The anchor sweep — 0:120, no `--start-carry`

```
npm run soak -- --policy winning-coverage --seeds 0:15 --render-every 0    # ... and 15:30, 30:45,
npm run soak -- --policy winning-coverage --seeds 105:120 --render-every 0 # 45:60, 60:75, 75:90, 90:105
```
(eight parallel 15-seed chunks in one foreground call, ~6.5 min wall — the
brief's four 30-seed chunks would have exceeded the 600 s tool cap; seeds are
independent per `runSeed`, so the chunking is scheduling only. Union = `--seeds 0:120`.)

| arm | n | OK | CRASH | HANG | carry >= 21 | **carry >= 28** | **carry >= 35** | deepest carry / depth |
|---|---|---|---|---|---|---|---|---|
| **`winning-coverage`** | **120** | **120** | **0** | **0** | **39 (32.5%)** | **10 (8.3%)** | **0** | 28 / 33 |
| `winning` (2026-08-22 baseline) | 480 | 480 | 0 | 0 | — | 18 (3.75%) | 0 (0%) | 28 / — |

Seeds reaching carry >= 28: 16, 22, 25, 37, 59, 61, 86, 96, 101, 116. Deepest
battle-depth 33 = battle 6 of a challenge-4 round.

**This half is a suggestive POSITIVE, and it does not rescue the lever.**
8.3% vs 3.75% of seeds reaching challengeNum 4 by natural chained play is a
two-proportion z of ~2.1 (one-sided p ~ 0.017) — real enough to record,
n=120 vs n=480 and far from conclusive. But the acceptance number §5 set for a
draft lever was **carry >= 35**, i.e. *beating* challenge 4 at least once
without `--start-carry`: **0/120**, exactly the `winning` baseline's 0/480.

### What this settles

Challenge 4 remains unbeaten by every lever the scout ranked. The two halves of
this measurement point the same way as §2's mechanism paragraph, sharpened:

- **Getting TO challenge 4 is a draft problem** and coverage is a real
  improvement there (+2.2x rate of reaching it through tiers 1-3, where the
  opponent's own parties are weak enough that having a super-effective answer
  to everything decides battles).
- **Getting THROUGH challenge 4 is a draft-QUALITY problem that coverage alone
  makes worse** (29/30 b1 losses cold-booted, vs 22/30 for a random draft).
  Lever 4 (bulk+STAB) starved coverage; lever 4' (coverage-first) starves bulk.
  Neither single-axis draft score beats challenge 4, and the two failure modes
  are mirror images — which is itself the strongest evidence yet that the ch4
  wall wants a *combined* score with a strength floor (e.g. coverage maximised
  subject to a minimum trio BST), not another single axis.

The policy stays in the tree as an opt-in instrument (it is the deepest-reaching
anchor player measured to date and costs nothing when unused) but is **not**
promoted to the gate set. `winning` / `winning-swap` / `full` / `vanilla` /
`oracle-strength` behaviour is byte-identical — their pins all still pass.

---

## Result — lever 4'' (combined draft) + two instrument findings that reframe every number above (2026-08-23, follow-on session)

**Two instrument bugs were found before the lever could be measured, and the
second dissolves this doc's central premise.**

**Finding 1 — `winning-coverage` never declined swaps (fixed `38c81e8c`).**
The swap-offer decline was a per-policy list written for `oracle-strength`;
`winning-coverage` missed it and fell through to `full`'s 50/50 roll — seed 0
accepted 64 offers and random-walked the swap screen (same trap class as
ISSUES #99). Every "Result — lever 4'" number above therefore measured
coverage-draft + random swap-accepts, not the draft alone. The decline is now
keyed on the driver's own `winningLike` getter and Tier-1-pinned.

**Finding 2 — deterministic-draft seeds collapse into ONE trajectory.** The
engine is seed-invariant (vanilla gate, #116); ALL soak variance is
player-RNG-borne. A policy whose decisions never consume the player RNG — the
deterministic coverage drafts — therefore plays essentially the same game on
every seed: the first `winning-combined` carry-28 sweep returned **30
byte-similar chronologies** (identical drafts, identical outcomes, frames
within ~500). Every deterministic-draft `--start-carry` statistic to that
point was effectively **n = 1**, and even the random-draft sweeps above all
faced the SAME six boot offers. Landed instruments (`183e2647`): `--vary-rng`
(advance the boot RNG cursor by the seed before generating the draft — the
exact mechanism by which real players' cursors differ) and `--first-round`
(CLI exposure of `stopAtFirstRoundDecision`, so rounds-won-at-boot reads
directly from `endState` at ~1 s per losing seed instead of 24 s of
budget-bound chaining).

**Lever 4'' itself (`1a0c3d09`-style opt-in, commit `9c2cbf65`):**
`--policy winning-combined` = `winning-coverage` except the trio search,
which maximises the same coverage-first lexicographic score only over trios
whose summed base-stat total meets `combinedDraftBstFloor` — the MEAN
candidate-trio total (half the six offers' sum), i.e. what a random draft
fields in expectation. Deterministic; the max-BST trio always meets a
mean-derived ceiling so the floored search cannot come up empty. Tier-1 pins
in `tests/randomRoundSoakCombinedDraft.test.ts` (floor value, floor-binding
pick red-verified by a floor:=0 mutation, floor-slack equivalence,
determinism, swap decline, staged rent order).

### THE MEASUREMENT — carry-28 boot rounds won, varied offers, honest n

```
npm run soak -- --policy <P> --start-carry 28 --vary-rng --first-round --seeds 0:100 --render-every 0
```

| policy | rounds won (n=100, seeds 0:100) |
|---|---|
| `winning` | 6/100 |
| `oracle-strength` | 4/100 |
| `winning-coverage` (post-fix) | 5/100 |
| `winning-combined` | 7/100 |

Extended to n=1,000 for the two decision-relevant arms (seeds 0:1000, same
walked offers per seed across arms, i.e. PAIRED):

| arm | wins | rate | loss-at-b1 |
|---|---|---|---|
| `winning` | **58/1000** | 5.8% | 462/941 |
| `winning-combined` | **77/1000** | 7.7% | 433/922 |

Paired detail, first 500 seeds: winning-only 26, combined-only 41,
**both-won 0** (expected overlap ~2 under independence — consistent).
Second 500: 32 vs 36 (no separation). Cumulative two-proportion z ≈ 1.7,
one-sided p ≈ 0.045 — **a suggestive ~1.3–1.6x edge, small and not
conclusive**; wave 2 alone shows none.

### What this settles (and un-settles)

1. **Challenge 4 was never unbeatable.** With varied boot offers, plain
   `winning` wins **5.8%** of ch4 boot rounds. Every 0/30 above — `winning`,
   `oracle-strength`, `winning-coverage` — was ONE fixed, losing deal of six
   offers (`ANCHOR_RNG_VALUE`) measured repeatedly. The "unique local
   minimum" mechanism (§2) still stands; the "wall" framing does not.
2. **No draft policy separates decisively at ch4.** All four arms sit at
   4–8%; the combined floor may add ~2 points on a ~6% base (p ≈ .045). The
   draft-lever program has hit diminishing returns.
3. **Crash coverage is the real winner**: ~2,400 varied boot rounds (a
   surface no prior sweep ever touched — every previous `--start-carry` run
   opened on the same draft) produced two real finds: **#122** (Factory AI
   live-driver RNG-lockstep divergence crash under plain `winning`,
   deterministic 0.1 s repro, seed 681) and **#123** (endless battle — 456
   selections of a 15-PP DOUBLE TEAM, then HANG; seed 755).

Recommended standing use: `--vary-rng` sweeps at each `--start-carry` tier as
the crash-coverage instrument of record; the four standing gates stay
unchanged (unvaried, pinned baseline).
