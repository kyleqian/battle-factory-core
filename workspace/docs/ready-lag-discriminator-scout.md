# Ready-lag +7 discriminator dossier (side lane, 2026-08-14)

**Verdict up front:** `dispatchDelay(opponent) < 101` (the opponent lead's
cry is shorter than GROVYLE's baseline cry) is the discriminator that
cleanly separates every confirmed 0-residual fixture from every confirmed
+7 fixture — and it survives even when the player species is held fixed
(DELCATTY is the player lead in one EXACT case and both +7 cases). Two
other candidates were tested and one (`challengeNum>=2`) fails outright;
the other (override-constructed mode) also survives on paper but is
independently known to be non-causal (this morning's
`docs/overrides-ready-lag-probe.md` ± differential proved `overrides.parties`
staging itself is innocent) and is shown below to be a **confound**, not the
mechanism — every current low-dispatch-delay data point happens to also be
override-constructed, and no fixture yet tests the two properties
independently. That confound, not "no clean discriminator," is this
dossier's one honest gap; §4 names the exact fixture that would close it.

## 1. The formula: exact site and every input

`src/engine/battleScene.ts`. The public gate:

```ts
export function generatedBattleStartCommandReady(          // battleScene.ts:4590-4600
  state: FactoryBattleStartIntroState,
): boolean {
  const handoffTick = generatedBattleStartOpponentHandoffTick(state);
  return handoffTick !== null
    && generatedBattleIntroSourceClock(state.elapsed, state.sceneAssemblyDisplayLag)
      >= handoffTick + generatedPlayerDispatchDelay(state) + generatedPlayerReadyLag(state);
}
```

Two additive terms after `handoffTick` (the opponent's release-start tick):

**`generatedPlayerDispatchDelay`** (battleScene.ts:4463-4466) — gates the
player's own send-out on the *opponent's* cry finishing
(`Intro_TryShinyAnimShowHealthbox`, `battle_controller_opponent.c:292-383`,
cited at battleScene.ts:4402-4436):

```ts
function generatedPlayerDispatchDelay(state): number {
  return GENERATED_PLAYER_DISPATCH_BASELINE_DELAY            // 101, battleScene.ts:4437
    + (cryDurationTicks(generatedOpponentSpeciesId(state))
       - GROVYLE_CRY_DURATION_TICKS);                        // GROVYLE=278, battleScene.ts:4438,4443
}
```

**`generatedPlayerReadyLag`** (battleScene.ts:4548-4552) — picks one of two
calibrations by an existing route-level flag, `isCanonicalAnchorIntro`
(true only for the interactive draft anchor's own Battle 1; false for
every fixture in this dossier):

```ts
function generatedPlayerReadyLag(state): number {
  return state.isCanonicalAnchorIntro
    ? GENERATED_PLAYER_READY_LAG                              // flat 185, battleScene.ts:4537
    : generatedPlayerReadyLagSpeciesFormula(state);            // battleScene.ts:4539-4546
}

export function generatedPlayerReadyLagSpeciesFormula(state): number {
  const [playerLine] = state.command.text.playerSendOut;
  return generatedPlayerVisualLag(playerLine.length)           // len-1+SENDOUT_HANDOFF_LAG(3), :4476-4478
    + GENERATED_PLAYER_READY_LAG_BASELINE                      // 98, battleScene.ts:4536
    + cryDurationTicks(generatedPlayerSpeciesId(state));
}
```

**Every input, enumerated:**

| Input | Source | Species/route dependence |
| --- | --- | --- |
| `handoffTick` | `generatedBattleStartOpponentHandoffTick(state)` | route-generic (documented as a cross-fixture constant, e.g. 1583 oracle-absolute — see §2) |
| `GENERATED_PLAYER_DISPATCH_BASELINE_DELAY` | constant, 101 | none (GROVYLE-calibrated baseline) |
| `cryDurationTicks(opponentLeadSpecies)` | `src/data/gen/cry-durations.json` | opponent lead species |
| `GROVYLE_CRY_DURATION_TICKS` | same asset, species 278 | none (fixed reference point) |
| `isCanonicalAnchorIntro` | `FactoryBattleStartIntroState`, set in `beginFactoryRoundBattleStartIntro` | route (true only for the interactive-anchor Battle 1) — **false for all 6 fixtures in this dossier** |
| `playerLine.length` | `state.command.text.playerSendOut[0]`, i.e. `"Go! <PlayerLeadName>!"` | player lead species (name length) |
| `SENDOUT_HANDOFF_LAG` | constant, 3 | none |
| `GENERATED_PLAYER_READY_LAG_BASELINE` | constant, 98 | none |
| `cryDurationTicks(playerLeadSpecies)` | `cry-durations.json` | player lead species |

No `dispatchDelay<101` branch exists anywhere in this code today — every
term above is a flat sum. The regime named in §3 is a **discriminator found
in the data**, not something the current formula already treats specially.

## 2. The table

Produced by `tools/probe/probe-ready-lag-inputs.ts` (rerunnable, read-only —
reads the committed `tools/battle-lab/*.json` fixture requests plus
`src/data/gen/{cry-durations,species-names,battle-frontier-mons}.json` to
resolve species/mode/route and recompute `dispatchDelay`/`visualLag`/
predicted-ready from those files, not by hand). The three timing anchors
per fixture (`handoffTick`, `throwVisibleTick`, `oracleReadyTick`) are
**cited, not recomputed** — reused from already-oracle-verified dense
self-diffs per this step's brief ("prefer already-committed evidence...
over fresh runs when equivalent"; the shared oracle is also under heavy
concurrent load from the main-lane worker this round). Script output
below; ran twice, byte-identical (confirmed, not just claimed — see §5).

| Fixture | Mode / route | Opponent lead (cry) | Player lead (cry) | `dispatchDelay` | Regime | Predicted ready | Oracle ready | Residual |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GRIMER/YOSHI | `factoryLegal`, trainerId 49, challenge 0/0 | COMBUSKEN (82t) | GRIMER (30t) | 125 | ≥101 | 1849 | 1849 | **0** |
| KADABRA/SHIZUKA | `factoryLegal`, trainerId 110, challenge 2/2 | MAGNETON (68t) | KADABRA (76t) | 111 | ≥101 | 1882 | 1882 | **0** |
| DELCATTY/MAGNETON | `factoryLegal`, trainerId 109, challenge 2/0 | MAGNETON (68t) | DELCATTY (60t) | 111 | ≥101 | 1867 | 1867 | **0** |
| TANGELA/silver Noland reveal | `factoryBrain`+`overrides.parties`, challenge 2 | TANGELA (43t) | DELCATTY (60t) | 86 | **<101** | 647 | 654 | **+7** |
| PUPITAR/DELCATTY probe | `mechanicLab`+`overrides.parties`, trainerId 109, challenge 2/0 | PUPITAR (24t) | DELCATTY (60t) | 67 | **<101** | 1822 | 1829 | **+7** |
| SKARMORY/gold Noland reveal — **PROVISIONAL** | `factoryBrain`+`overrides.parties`, challenge 5 | SKARMORY (68t) | DUGTRIO (55t) | 111 | ≥101 | not recomputed (transplanted alignment, not bisected) | — | reported exact (465-700), **unconfirmed** |

Notes on the two `oracle-absolute` cross-checks the script also prints:
computed `throwVisible` reproduces the cited value exactly for four of the
five confirmed fixtures, and lands 1 tick off for the PUPITAR probe (1665
computed vs. 1664 cited) — PROGRESS.md 1261 itself flags this fixture's
dispatch-complete landmark as accurate only "within 1 tick," so this is a
pre-existing measurement-granularity note, not a new bug.

**The pivot species.** DELCATTY is the player lead in three of the five
confirmed rows: one EXACT (MAGNETON opponent, dispatchDelay 111) and both
+7 rows (TANGELA and PUPITAR opponents, dispatchDelay 86 and 67). Holding
the player side fixed and only the opponent's `dispatchDelay` varying,
residual flips from 0 to +7 exactly at the 101 boundary — this directly
localizes the defect to a term keyed on the **opponent's** `dispatchDelay`,
not on the player-cry formula (`98 + cryDuration(player)`), which is
independently proven exact by the DELCATTY/MAGNETON row alone.

## 3. Discriminator verdicts

Three candidates tested (script output, `verdict()` calls):

1. **`dispatchDelay(opponent) < 101`** — **SURVIVES.** All three
   ≥101 rows are exact; both <101 rows are +7. No mismatches.
2. **`challengeNum >= 2`** — **FAILS.** KADABRA/SHIZUKA (challenge 2) is
   exact; PUPITAR/DELCATTY (also challenge 2) is +7 — same challenge depth,
   opposite residual. Rejected outright, not just weakly.
3. **Mode family (`factoryBrain`/`mechanicLab` vs. `factoryLegal`)** —
   survives on the raw table (all three `factoryLegal` rows are exact; both
   override-constructed rows are +7) but **this is the correlation the
   morning's `overrides-ready-lag-probe.md` ± differential already tested
   and falsified as a mechanism**: pinning a party through `overrides.parties`
   that byte-matches what real generation would have produced (including at
   the *exact* trainerId-109/challengeNum-2 route this dossier's own
   DELCATTY/MAGNETON row uses) produces offset **+0** relative to the
   unstaged run, at the *ready-gate frame specifically* (that probe's own
   scenario-2 table row). So "override-constructed" tracks the +7 in the
   data available today, but is not itself causal — it's confounded with
   `dispatchDelay` regime in every fixture built so far (see next paragraph).

**The unresolved confound, named precisely.** Every `dispatchDelay<101`
fixture in this dossier is *also* override-constructed with a roster that
does **not** match what the requested route's own real RNG walk would
produce (PUPITAR/JUMPLUFF/TANGELA is not trainerId 109's real challenge-2
opponent — that's MAGNETON/SWALOT/MINUN, confirmed by the DELCATTY/MAGNETON
row's own `factoryLegal` generation at the identical trainerId/challenge/
seed tuple; TANGELA/JUMPLUFF/PUPITAR is the *app's* own `factoryBrain`
roster for that seed, not the *oracle's* natural unpinned `factoryBrain`
walk, which 1260 found generates something else entirely). No fixture yet
tests "`dispatchDelay<101` with a **matching** override" or "`dispatchDelay
>=101` with a **mismatching** override" — those two cells are empty. The
gold cross-check (§below) is the closest available evidence against the
override-family theory specifically, but is explicitly provisional.

**Provisional cross-check (gold, excluded from the verdicts above).** Gold's
opponent lead SKARMORY has `dispatchDelay=111` (≥101 regime) — computed
directly from `cry-durations.json`, no alignment risk, unlike the ready-tick
numbers PROGRESS 1262 flags as transplanted/unbisected. Gold is **also**
override-constructed (`factoryBrain`+`overrides.parties`, the same
construction as both +7 rows) and PROGRESS 1262 reports its own tail
(frames 465-700) fully exact, no +7 recurrence. This is exactly the
combination that would falsify "any override-constructed fixture gets +7"
while remaining consistent with "`dispatchDelay<101` gets +7" — gold and
silver share mode + override mechanism, differ in `dispatchDelay` regime,
and differ in observed residual in the direction the regime predicts. It
is *evidence in favor of* `dispatchDelay` over mode-family, not proof (the
alignment wasn't bisected against gold's own oracle captures), which is why
it's kept out of the formal verdict table above.

## 4. Falsifiable mechanism hypothesis

**Where.** Since `dispatchDelay`'s own value is independently confirmed
correct for both +7 fixtures (computed `throwVisible` matches the cited,
oracle-self-diff-verified value to within 1 tick for both TANGELA and
PUPITAR — see §2), the bug is not in *computing* `dispatchDelay`. And since
the player-cry term is independently proven exact (DELCATTY/MAGNETON row,
residual 0), the bug is not in `98 + cryDuration(player)` either. What's
left is the **interaction**: something in the real ROM's ready gate depends
on `dispatchDelay(opponent)` being at or above some floor, and the current
formula has no such term.

**Two candidate shapes, ranked by fit:**

- **(a) A missing boolean branch (favored).** The +7 residual is
  numerically *identical* (not proportional) across a 19-tick spread in
  `dispatchDelay` (86 vs. 67, an easy control since both share player
  species DELCATTY). A continuously-scaling floor/clamp on `dispatchDelay`
  itself would produce different shortfalls for 86 and 67 unless the floor
  sits exactly at `dispatchDelay=79`-ish for both to land on +7 by
  coincidence — implausible with only two points landing on the exact same
  integer. A flat, regime-gated additive term fits both points exactly with
  one constant. Shape: `generatedPlayerReadyLag` gains
  `+ (dispatchDelay(opponent) < GENERATED_PLAYER_DISPATCH_BASELINE_DELAY
  ? READY_LAG_LOW_DISPATCH_CORRECTION : 0)`, first-cut
  `READY_LAG_LOW_DISPATCH_CORRECTION = 7`. **Flagged explicitly as a
  2-point calibration** — the same caution `intro-cry-shadow-evidence.md`
  applied to the player-cry constant (98) before a third species confirmed
  it; this dossier's +7 has only two points, both sharing the same player
  species, so the constant is *plausible*, not yet *triangulated*.
- **(b) A real per-species floor inside `Intro_TryShinyAnimShowHealthbox`
  itself** (e.g. the opponent controller's own healthbox-slide/anim-idle
  gate has a minimum duration independent of cry, and the player's ready
  gate transitively waits on it) — structurally plausible given the same
  gate function is cited as symmetric for both battlers (battleScene.ts:
  4493-4535's own doc comment), but not distinguishable from (a) with the
  clock-convention mismatch between the two +7 fixtures (TANGELA's anchors
  are app-relative to the `reveal-off` compare-trace stage; PUPITAR's are
  oracle-absolute dense-capture frames) — a floor-from-handoff test would
  need both expressed on one clock, not attempted this session.

**Validation matrix the fix step must run** (whichever shape is chosen):

| Fixture | Must move | Must NOT move |
| --- | --- | --- |
| TANGELA/silver Noland reveal (`factory-round-battle7-noland-reveal-off`) | 648/701 → ideally 700/701 or 701/701 (ready-gate tail was the last named structural gap) | frames 0-646 (already exact) |
| PUPITAR/DELCATTY mechanicLab probe | ready-tick residual +7 → 0 (oracle-only, re-run the dense self-diff) | dispatch-complete/throw-visible ticks (already exact) |
| GRIMER/YOSHI, KADABRA/SHIZUKA, DELCATTY/MAGNETON | must stay exact (regression) | — |
| `battle-command-generated-off` (GRANBULL, `isCanonicalAnchorIntro` N/A — mechanicLab canonical, never exercises this state machine) | must stay 128/128 | — |
| `interactive-generated-intro-off` (ONIX, `isCanonicalAnchorIntro=true`, flat-185 branch) | must stay 715/715 (this fixture never reaches the species-formula branch this fix touches) | — |
| Gold Noland reveal (`factory-round-battle7-noland-gold-reveal-off`) | should stay exact in 465-700 (dispatchDelay 111, ≥101 regime predicts no change) — **useful as a third confound-breaking check**: if the fix is gated on `dispatchDelay<101` and gold is truly unaffected, this is corroborating; if the fix instead uses a mode-family or override-detection signal, gold's own override-construction would make it eligible too and this becomes a real regression risk to watch | frames 0-464 (already exact/already-characterized residuals) |

**The confound-closing probe the fix step should run before trusting either
constant.** Build one new oracle-only fixture (mirroring round 6's
`generateFactoryOpponent` brute-force-search technique already used for the
MAGNETON tuple) that reaches a **real `factoryLegal` route** whose opponent
lead has `dispatchDelay<101` in the wild (a short-cried species drawn from
an actual RNG walk, no `overrides.parties` anywhere) — if the +7 recurs
there too, `dispatchDelay<101` is confirmed construction-route-independent
and hypothesis (a)/(b) above is the whole story. If it does *not* recur,
the override-family confound named in §3 is real after all, and the fix
needs to be gated on "override-constructed AND `dispatchDelay<101`," not
`dispatchDelay<101` alone — a strictly smaller, still-useful discriminator,
but a different fix shape (a construction-route flag `&&` a formula
regime, not a pure formula regime).

## 5. Reproduce

```sh
node --experimental-strip-types tools/probe/probe-ready-lag-inputs.ts
```

Ran twice this session; `diff`'d byte-identical (the fixture/asset reads
are pure, no oracle/network/clock involved).
