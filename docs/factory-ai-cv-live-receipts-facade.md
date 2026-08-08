# `AI_CV_Facade` live receipt — real-ROM verification of the target-status1 gate

Bounded MAIN-lane worker session, 2026-08-08, Battle Scene OFF oracle. This is
the first live receipt for a handler whose gates read the freshly-wired
`STATUS1` poison/burn/paralysis fields — the three bits were **never populated
by the live adapter until earlier today** (they were read by handlers but not
exercised against hardware). The receipt answers the step's central question:
**does the ROM read the TARGET's status for Facade's boost, exactly as the
non-BUGFIX source and today's port model it?**

## 1. The gate, from the real source

```
@ BUG: Facade score is increased if the target is statused, but should be if the user is
AI_CV_Facade:                                  (data/battle_ai_scripts.s:2279-2287)
#ifdef BUGFIX
	if_not_status AI_USER, STATUS1_POISON | STATUS1_BURN | STATUS1_PARALYSIS | STATUS1_TOXIC_POISON, AI_CV_Facade_End
#else
	if_not_status AI_TARGET, STATUS1_POISON | STATUS1_BURN | STATUS1_PARALYSIS | STATUS1_TOXIC_POISON, AI_CV_Facade_End
#endif
	score +1
AI_CV_Facade_End:
	end
```

The pinned checkout is **non-BUGFIX**: the gate reads `gBattleMons[target].status1`
against `STATUS1_POISON | STATUS1_BURN | STATUS1_PARALYSIS | STATUS1_TOXIC_POISON`
and scores `+1` only when any of the four bits is set. The port
(`src/engine/factoryAiCheckViability.ts:4792-4808`, dispatch `:6444-6461`) models
exactly that — a target-side mask read, zero draws, no `funcResult` write. So
the source *and* the port agree on target-side; the open question was whether
the **hardware** matches (i.e. the port's `AI_TARGET` attribution is not a
misreading of `AI_USER`). This receipt confirms hardware = target-side.

## 2. Reach/control fixture pair

The recipe's twin-fixture shape (cf. the counter pair §34.3 of
`docs/factory-ai-checkviability-ground-truth.md`): a level-5 Magikarp relay is
KO'd by the player's four-slot Vital Throw (priority −1, so the relay always
acts first), then the tested mon — Metagross, a genuine Level-50 Facade carrier
(`FRONTIER_MON_METAGROSS_1`, set 466) — switches in with `[Facade, Splash,
Splash, Splash]`. The only difference between the twins is the relay's move:

- **control** (`mechanic-factory-ai-cv-facade-control-off.json`): relay uses
  **Splash ×4**. The target never gets statused.
- **reach** (`mechanic-factory-ai-cv-facade-reach-off.json`): relay uses
  **Thunder Wave ×4** — a **real move** inflicting real paralysis on the target
  on turn 1 before the relay faints. The target's `STATUS1` bit 6 is live when
  Metagross's first decision runs.

Both fixtures use `overrides.parties` (complete parties, so the stock ROM
derives types/ability/stats and runs entry hooks itself): player Vaporeon
(Water, single ability Water Absorb, non-Ground so Thunder Wave lands) ×
[Vital Throw ×4]; opponent = Magikarp Lv 5 relay, Metagross [Facade, Splash ×3],
Bulbasaur filler. Same `[A, wait 30, ×52 (A, wait 18)]` mash cadence as the
counter pair; `trainerId 222`, `challengeNum 7`, streak-derived mask 7
(all three scoring passes).

`Facade` has no CBM handler (the dispatch table has no `EFFECT_FACADE` entry)
and no TryToFaint/CV draw sites, so **every decision consumes exactly
setup×4 + tie×1 = 5 draws** in both scenarios. The whole observable difference
is the CV delta: **+1 when the target is paralyzed, 0 when clean**.

## 3. Live ledger (oracle-verified, both seeds, both runs)

Verifier: `tools/probe/verify-factory-ai-facade-live.ts` (also runs each
scenario twice and asserts byte-identical reruns).

| Scenario | Seed | Target status | Metagross PP start→first | Facade CV | ROM/engine choice | Engine RNG |
| --- | ---: | --- | --- | --- | --- | --- |
| control | 1 | clean | `[20,40,40,40]→[19,40,40,40]` | 0 | Facade slot 0 (tie) | 5 draws, `3894234654→3323223981` |
| reach | 1 | paralyzed | `[20,40,40,40]→[19,40,40,40]` | +1 | Facade slot 0 | 5 draws, `2023871260→1221427251` |
| control | 99 | clean | `[20,40,40,40]→[20,40,40,39]` | 0 | Splash slot 3 (tie) | 5 draws, `1656372911→2270394938` |
| reach | 99 | paralyzed | `[20,40,40,40]→[19,40,40,40]` | +1 | Facade slot 0 | 5 draws, `1352996645→3110092376` |

All four rows reran byte-identically. The engine reproduces, on the same
scored view fed the ROM-observed start RNG, the exact PP-selected slot, score
vector (`[100,100,100,100]` control / `[101,100,100,100]` reach), draw count,
and endpoint RNG. The control rows are a genuine 4-way tie broken by the
decision RNG (`Random() % 4`): seed 1's tie lands on slot 0 (Facade), seed
99's on slot 3 (Splash) — the engine's tie-break lands on the same slot in
both, which is a stronger test than a deterministic split.

The reach scenario's decision window (`1 + 4 + 1` LCG transition triple)
sits at frames 776–778 (seed 1) and the relay paralysis is visible in the
target's `status1`/`status` snapshot (`{kind: "paralysis"}`) from frame ~118
onward; Metagross switches in at ~657 and executes the chosen Facade at ~848.
The control analogue is ~597→~788.

## 4. Verdict

**MATCH.** The real ROM reads the **target's** `STATUS1` poison/burn/paralysis/
toxic bits for `AI_CV_Facade`'s boost, exactly as the non-BUGFIX source
comment and today's port model it. The port's `AI_TARGET` attribution is
confirmed correct against hardware — the freshly-wired `isPoisoned`/`isBurned`/
`isParalyzed`/`isToxicPoisoned` adapter fields reach the handler and change the
score by the exact amount the ROM produces. No `src/engine/` change was needed.

## 5. Tier-1 pin

`tests/factoryAiFacadeLiveReceipt.test.ts` banks all four rows: each seed's
view (attacker Metagross 150/80/95/95/80 @140/140, target Vaporeon
85/80/85/130/115 @205/205), the ROM-observed start RNG, the expected chosen
slot, the exact 5-draw receipt (`setup×4 + tie×1`), the CV deltas
(`[1,0,0,0]` reach / `[0,0,0,0]` control), and the ROM-observed endpoint RNG.
A second test pins the reach/control gate split (`bestMoveSlots` `[0]` vs
`[0,1,2,3]`). A later port that flips the gate to `AI_USER` (or drops a status
bit from the mask) fails these pins.

## 6. Reproduce

```sh
node --experimental-strip-types tools/probe/generate-factory-ai-facade-fixtures.ts
node --experimental-strip-types tools/probe/verify-factory-ai-facade-live.ts
npx vitest run tests/factoryAiFacadeLiveReceipt.test.ts \
  tests/factoryAiCheckViability.test.ts tests/factoryAiScoredDecision.test.ts
npm run test:smoke
npm run build
```
