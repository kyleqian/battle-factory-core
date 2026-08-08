# `AI_CV_DragonDance` live receipt — real-ROM verification of the target-faster gate

Bounded MAIN-lane worker session, 2026-08-08, Battle Scene OFF oracle. This is
the live receipt for `AI_CV_DragonDance` (14 Level-50 Factory rental carriers
with the move), the highest-weight CV handler ported today that had **no
hardware receipt yet**, extending the already-banked line
(`AI_CV_BrickBreak`, `AI_CV_Overheat`, `AI_CV_Facade`, `AI_CV_Curse`,
`AI_CV_ChargeUpMove` all MATCHED 4/4). The receipt answers: **does the ROM's
`Cmd_if_target_faster` classify the AI user vs. the target's relative Speed
exactly as the port's `getWhoStrikesFirst` does, and does the target-faster
path really draw the handler's `<128` roll while the full-HP slow-target path
draws nothing?**

## 1. The gate, from the real source

```
AI_CV_DragonDance:                            (data/battle_ai_scripts.s:2603-2614)
	if_target_faster AI_CV_DragonDance2
	if_hp_more_than AI_USER, 50, AI_CV_DragonDance_End
	if_random_less_than 70, AI_CV_DragonDance_End
	score -1
	goto AI_CV_DragonDance_End

AI_CV_DragonDance2:
	if_random_less_than 128, AI_CV_DragonDance_End
	score +1
AI_CV_DragonDance_End:
	end
```

- **target STRICTLY faster** (reach): jumps to `AI_CV_DragonDance2`'s single
  `if_random_less_than 128` roll — **one** draw, scoring **+1** on a roll ≥ 128
  or **0** on a roll < 128.
- **target NOT faster** (control): at full HP the `if_hp_more_than AI_USER, 50`
  exit fires — **zero** of the handler's own draws, score **0**.

So the rows differ in **both** the CV delta and the handler's own draw count:
reach decision = setup 4 + roll 1 + tie 1 = **6 draws**; control decision =
setup 4 + tie 1 = **5 draws**. The port
(`src/engine/factoryAiCheckViability.ts:5192-5239`, `runCvDragonDance`)
models exactly that, including the equal-speed tie roll fed into
`getWhoStrikesFirst`.

## 2. Reach/control fixture pair

Same twin-fixture recipe as the sibling receipts (cf. the counter pair §34.3 of
`docs/factory-ai-checkviability-ground-truth.md`): a level-5 Magikarp Splash
relay is KO'd by the player's four-slot Vital Throw (priority −1, so the relay
Splashes first and never damages the player), then the tested mon — **Gyarados**,
a genuine Level-50 DragonDance carrier (`FRONTIER_MON_GYARADOS_1`, set 459,
Intimidate) — switches in with `[DragonDance, Splash, Splash, Splash]`. The
**only** difference between the twins is the player-lead species' **Speed**
(chosen at fixture build time — the gate needs no staged transient state at
all, exactly like `AI_CV_Overheat`):

- **control** (`mechanic-factory-ai-cv-dragondance-control-off.json`): target is
  **Shuckle** (base Speed 5 → battle stat 25). Gyarados (101) outspeeds it, so
  `if_target_faster` falls through; the attacker is at full HP, so
  `if_hp_more_than AI_USER, 50` hits the zero `goto End`. Expect CV delta **0**,
  zero handler rolls.
- **reach** (`mechanic-factory-ai-cv-dragondance-reach-off.json`): target is
  **Crobat** (base Speed 130 → battle stat 150). It outspeeds Gyarados, so the
  handler jumps to `DragonDance2`'s `<128` roll. Expect CV **+1** on a roll ≥
  128 or **0** on a roll < 128.

Both fixtures use `overrides.parties` (complete parties, so the stock ROM
derives types/ability/stats and runs entry hooks itself — Gyarados's Intimidate
fires live). The same `[A, wait 30, ×96 (A, wait 18)]` mash cadence as the
siblings, extended from 52 to 96 presses so the relay + switch-in text + decision
all complete inside the trace; `trainerId 222`, `challengeNum 7`,
streak-derived mask 7 (all three scoring passes). `DragonDance`'s CheckBadMove
handler (`AI_CBM_DragonDance`, `battle_ai_scripts.s:595-598`) scores **0** at
neutral ATK/SPEED stages and draws nothing, and both targets are single-ability
species (Shuckle Sturdy / Crobat Inner Focus), so `AI_CheckBadMove`'s per-slot
`get_ability` soundproof guess never draws — the only scoring is
`AI_CV_DragonDance`'s gate.

## 3. Live ledger (oracle-verified, both seeds, both runs)

Verifier: `tools/probe/verify-factory-ai-dragondance-live.ts` (also runs each
scenario twice and asserts byte-identical reruns).

| Scenario | Seed | Target (Speed) | Gyarados PP start→first | DragonDance CV | ROM/engine choice | Decision draws / RNG |
| --- | ---: | --- | --- | --- | --- | --- |
| control | 1 | Shuckle (25) | `[20,40,40,40]→[19,40,40,40]` | 0 | DragonDance slot 0 (4-way tie) | setup 4 + tie 1 = 5, `3693657463→3894234654→3323223981` |
| reach | 1 | Crobat (150) | `[20,40,40,40]→[20,39,40,40]` | 0 (roll 20 < 128) | Splash slot 1 (4-way tie) | setup 4 + roll 1 + tie 1 = 6, `3693657463→3894234654→2023871260` |
| control | 2 | Shuckle (25) | `[20,40,40,40]→[20,39,40,40]` | 0 | Splash slot 1 (4-way tie) | setup 4 + tie 1 = 5, `3387280505→3652931064→3469321887` |
| reach | 2 | Crobat (150) | `[20,40,40,40]→[19,40,40,40]` | **+1 (roll 201 ≥ 128)** | **DragonDance slot 0 (unique best)** | setup 4 + roll 1 + tie 1 = 6, `3387280505→3652931064→3130704934` |
| control | 99 | Shuckle (25) | `[20,40,40,40]→[20,40,40,39]` | 0 | Splash slot 3 (4-way tie) | setup 4 + tie 1 = 5, `4088512940→1656372911→2270394938` |
| reach | 99 | Crobat (150) | `[20,40,40,40]→[20,39,40,40]` | 0 (roll 83 < 128) | Splash slot 1 (4-way tie) | setup 4 + roll 1 + tie 1 = 6, `4088512940→1656372911→1352996645` |

All six rows reran byte-identically. The engine reproduces, on the same
scored view fed the ROM-observed start RNG (`setupTransition.before`), the
exact PP-selected slot, score vector (`[100,100,100,100]` throughout, plus
`[101,100,100,100]` on the seed-2 reach row), draw
count, and endpoint RNG on every row. The AI user sat at **170/170** HP at the
decision on all six rows.

The control rows are the **strong test**: the gate's full-HP exit leaves
DragonDance at 0, tying all four moves at 100, and the ROM **uses DragonDance**
(slot 0, seed 1) or Splash (slots 1/3, seeds 2/99) purely by the decision RNG
(`Random() % 4`) — confirming the handler truly scores nothing on the
slow-target path. The reach rows are the sharp draw-count test: all three
consumed **6** draws (one more than control), and the handler's roll draw is the
decision window's 5th (discriminator `%256` = 20, 201 and 83). Seed 1 and 99
rolled low (`< 128`, CV +0, DragonDance stays in the 4-way tie, which the ROM
breaks onto Splash slot 1 both times); **seed 2 rolled high (201 ≥ 128, CV +1,
DragonDance becomes the unique best at 101 and the ROM uses DragonDance slot 0)
— the `+1` branch is now exercised live**, closing the residual this receipt
originally named (a follow-up seed sweep on the same fixture, 2026-08-08).

## 4. Verdict

**MATCH 6/6.** The real ROM's `Cmd_if_target_faster` split matches the port's
`getWhoStrikesFirst` on both sides of the Speed comparison (Gyarados 101 vs
Shuckle 25 and vs Crobat 150): the outsped-target path draws zero RNG and scores
0, and the outsped-AI-user path draws exactly one extra `<128` roll whose outcome
(0 on rolls < 128, **+1 on the seed-2 roll 201 ≥ 128 — both sides of the branch
now live-exercised**) matches the observed behavior. The engine reproduces the
ROM's chosen slot, score vector, draw count, and exact decision-window RNG on
all six rows. No `src/engine/` change was needed.

## 5. Tier-1 pin

`tests/factoryAiDragonDanceLiveReceipt.test.ts` banks all six rows: each seed's
view (attacker Gyarados 145/99/80/120/101 @170/170, target Shuckle 30/250/30/250/25
@95/95 or Crobat 110/100/90/100/150 @160/160), the ROM-observed start RNG, the
expected chosen slot, the exact draw-count + kind receipt (control
`4× setup-simulated-rng + best-move-tie`, reach `4× setup-simulated-rng +
dragon-dance-roll-2 + best-move-tie`), the roll discriminators (20/83, both
below 128 → CV 0; **201, above 128 → CV +1, the live-closed branch**), the CV
deltas (`[0,0,0,0]`, plus `[1,0,0,0]` on the seed-2 reach row), and the
ROM-observed endpoint RNG. A second test pins the reach/control gate split on a
shared start RNG (5 vs 6 draws, the extra roll only on the fast-target path). A
later port that drops the `if_target_faster` split (or draws the roll on the
wrong path, or scores it on the wrong threshold) fails these pins.

## 6. Reproduce

```sh
node --experimental-strip-types tools/probe/generate-factory-ai-dragondance-fixtures.ts
node --experimental-strip-types tools/probe/verify-factory-ai-dragondance-live.ts
npx vitest run tests/factoryAiDragonDanceLiveReceipt.test.ts \
  tests/factoryAiCheckViability.test.ts tests/factoryAiScoredDecision.test.ts
npm run test:smoke
npm run build
```
