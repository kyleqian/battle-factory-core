# Factory AI_CV_BatonPass live receipt

Bounded SIDE-lane, Battle Scene OFF. This is a complete-party
`mechanicLab` receipt for the production Factory AI's Baton Pass handler,
not a canonical Battle-2 replay and not injected transient battle state.

## Source proof

`AI_CV_BatonPass` is the one source body at
`reference/pokeemerald/data/battle_ai_scripts.s:1978-2016`. Its relevant
lower band is:

```text
if_stat_level_more_than AI_USER, STAT_ATK, 8, AI_CV_BatonPass2
...
goto AI_CV_BatonPass5
AI_CV_BatonPass5:
    if_stat_level_more_than AI_USER, STAT_ATK, 7, AI_CV_BatonPass7
...
AI_CV_BatonPass7:
    if_target_faster AI_CV_BatonPass8
    if_hp_more_than AI_USER, 60, AI_CV_BatonPass_ScoreDown2
    goto AI_CV_BatonPass_End
```

So an AI user at exactly stored Attack stage 8, faster than its target and
at 30/130 HP (23%, not more than 60%) reaches the zero-score end. With no
stat above 7, it instead reaches `ScoreDown2` for `-2`. Neither branch
has a handler random draw. The only decision draws are the usual explicit
`BattleTurnPassed` random number, four simulated setup draws, and the
best-move tie draw.

The production Level-50 carrier is `FRONTIER_MON_AIPOM`, set 142:

- `battle_frontier_mons.h:997-1003` gives real Aipom with
  Fury Swipes / Sand Attack / **Baton Pass** / Agility. The generated
  catalog records it as index 142; it is one of the 13 legal Level-50
  Baton Pass carriers.
- `level_up_learnsets.h:2619-2630` independently proves Aipom's legal
  Scratch (level 1) and Baton Pass (level 18), which is why the staged
  AI loadout is `[Baton Pass, Scratch, Scratch, Scratch]`.
- `level_up_learnsets.h:880-894` proves Machoke's real Seismic Toss at
  level 19. At level 50 it lands exactly 50 HP damage; the hardware
  captures show Aipom `130 → 80 → 30`.
- `level_up_learnsets.h:1791-1795` proves the level-5 Magikarp relay's
  Splash. It is KO'd through normal battle execution before Aipom enters.

The status twin actions are real ROM move executions from the complete-party
builder, never direct writes to HP/stages: one Swagger reaches just Aipom
Attack 8; one Confuse Ray leaves every Aipom stat at 6. As with the existing
complete-party receipts, the builder is the stock pre-battle construction
surface; its source-bounded loadout fields do not inject a transient battle
state.

## Fixtures and controller

`tools/probe/generate-factory-ai-batonpass-fixtures.ts` creates:

- `tools/battle-lab/mechanic-factory-ai-cv-batonpass-reach-off.json`
- `tools/battle-lab/mechanic-factory-ai-cv-batonpass-control-off.json`

Both contain exactly three records per side and only
`overrides.parties`. Player lead Machoke is
`[Seismic Toss, Swagger|Confuse Ray, Scratch, Scratch]`; opponent is
Magikarp level 5 Splash x4, then Aipom
`[Baton Pass, Scratch, Scratch, Scratch]`, then a live Bulbasaur bench
record. The retained bench is material: Baton Pass has one usable
AI-side recipient, so its CBM preamble is correctly zero rather than its
last-mon `-10` guard.

The controller is a named, fixed sequence of two-frame edges and explicit
waits reconstructed from the committed Psych Up fixture cadence. It
acknowledges the relay faint/switch text, selects Seismic Toss twice, moves
once right to confirm the one status move, then only acknowledges messages.
There is no broad A-spam and no player move-menu interaction after Swagger or
Confuse Ray; the next score window is Aipom's first later Baton Pass
decision.

At the hardware point immediately before each detected decision:

- Aipom is active, `HP 30/130`, Speed `105`, and
  `[Baton Pass, Scratch, Scratch, Scratch]`.
- Machoke is active, Speed `65`, so the target is slower.
- reach has only Aipom Attack at stored stage `8`; every other stored stage
  is `6`.
- control has no Aipom stage above `7` (all are `6`).
- Machoke has spent three Seismic Toss PP total: one relay KO plus the two
  Aipom hits. The status slot has spent exactly one PP.

## OFF oracle ledger

`tools/probe/verify-factory-ai-batonpass-live.ts` runs each row twice in
fresh Scene-OFF oracle calls and rejects any capture JSON divergence. It
finds the unique adjacent RNG transition triple `1 + 4 + 1`, seeds
`chooseFactoryAiScoredDecision` immediately before its first transition
with `turnStartRandomNumber: { owner: "decision" }`, and checks the ROM's
first later PP decrement against the engine's chosen slot.

| seed | twin | pre / PP frame | ROM/engine slot | target HP | CV deltas | final scores | RNG start → end |
| ---: | :--- | ---: | ---: | ---: | :--- | :--- | :--- |
| 3 | reach | 2390 / 2787 | 0 / 0 (Baton Pass) | 79 | `[0,0,0,0]` | `[100,99,99,100]` | `1069702854 → 2570591876` |
| 3 | control | 2204 / 2786 | 3 / 3 (Scratch) | 79 | `[-2,0,0,0]` | `[98,99,99,100]` | `1069702854 → 2570591876` |
| 23 | reach | 2394 / 2787 | 0 / 0 (Baton Pass) | 75 | `[0,0,0,0]` | `[100,99,99,100]` | `4216318620 → 2924665770` |
| 23 | control | 2208 / 2786 | 3 / 3 (Scratch) | 75 | `[-2,0,0,0]` | `[98,99,99,100]` | `4216318620 → 2924665770` |

Every row has exactly six engine draws:

```text
turn-start-random-number,
setup-simulated-rng × 4,
best-move-tie
```

There are no Baton Pass handler draws: the live reach state is exactly the
source's lower >7 band with HP at or below 60%, and the control path is the
deterministic `ScoreDown2` branch. The full score vector preserves the
ordinary TryToFaint variations of the legal Scratch slots
(`[0,-1,-1,0]`), rather than flattening them into an assumed four-way tie.

## Tier-1 pin and reproduction

`tests/factoryAiBatonPassLiveReceipt.test.ts` banks all four live rows:
the ROM cursor before the decision, its endpoint, PP-selected slot, all
per-slot CBM/TryToFaint/CV vectors, full final score vector, and the single
explicit BattleTurnPassed draw. Its boundary test distinguishes exactly stage
8 (Baton Pass CV 0) from no stage above 7 (CV -2).

```sh
node --experimental-strip-types tools/probe/generate-factory-ai-batonpass-fixtures.ts
node --experimental-strip-types tools/probe/verify-factory-ai-batonpass-live.ts
npx vitest run --no-watch --pool=forks --testTimeout=20000 \
  tests/factoryAiBatonPassLiveReceipt.test.ts \
  tests/factoryAiCheckViability.test.ts tests/factoryAiScoredDecision.test.ts
```

No production AI handler, shared interface, recording import, or presentation
path changed for this receipt.
