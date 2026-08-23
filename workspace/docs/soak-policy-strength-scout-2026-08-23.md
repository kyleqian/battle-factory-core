# Design scout: "policy strength" as an M-B follow-on milestone (2026-08-23, side lane)

Tree: `worker/side-20260823-001236` off master `3a8b58d7`, oracle `battle-scene-off`
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
