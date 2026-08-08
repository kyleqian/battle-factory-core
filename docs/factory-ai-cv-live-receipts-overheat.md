# `AI_CV_Overheat` live receipt — real-ROM verification of the type-effectiveness gate

Bounded MAIN-lane worker session, 2026-08-08, Battle Scene OFF oracle. This is
the live receipt for `AI_CV_Overheat` — the highest-weight CV handler ported
today (23 Level-50 Factory rental carriers) that had **no hardware receipt
yet**, extending the already-banked line (`AI_CV_BrickBreak`, `AI_CV_Facade`,
`AI_CV_ChargeUpMove` all MATCHED 4/4). The receipt answers: **does the ROM's
`Cmd_if_type_effectiveness` classify the STAB'd Fire move against the target's
types exactly as the port's `classifyHighCritEffectiveness` does, and does the
x0.5/x0.25 gate produce the -1 the port models?**

## 1. The gate, from the real source

```
AI_CV_Overheat:                               (data/battle_ai_scripts.s:2572-2583)
	if_type_effectiveness AI_EFFECTIVENESS_x0_25, AI_CV_Overheat_ScoreDown1
	if_type_effectiveness AI_EFFECTIVENESS_x0_5,  AI_CV_Overheat_ScoreDown1
	if_target_faster AI_CV_Overheat2
	if_hp_more_than AI_USER, 60, AI_CV_Overheat_End
	goto AI_CV_Overheat_ScoreDown1
AI_CV_Overheat2:
	if_hp_more_than AI_USER, 80, AI_CV_Overheat_End
AI_CV_Overheat_ScoreDown1:
	score -1
AI_CV_Overheat_End:
	end
```

`Cmd_if_type_effectiveness` (`battle_ai_script_commands.c:1515-1558`) runs
`TypeCalc` on `AI_THINKING_STRUCT->moveConsidered` with
`gBattleMoveDamage = AI_EFFECTIVENESS_x1` (40), which applies the attacker's
STAB then the target's per-type multiplier and remaps the four STAB'd magic
results (120/240/30/15) onto x2/x4/x0.5/x0.25. The port
(`src/engine/factoryAiCheckViability.ts:4722-4766`, `classifyHighCritEffectiveness`
at `:2839-2851`, dispatch `:6422-6442`) models exactly that. There are **zero
`if_random_less_than` sites** in this handler — no RNG of its own; the
decision's draw count is entirely the ordinary setup + get-ability + tie shape.

## 2. Reach/control fixture pair

Same twin-fixture recipe as the sibling receipts (cf. the counter pair §34.3 of
`docs/factory-ai-checkviability-ground-truth.md`): a level-5 Magikarp relay is
KO'd by the player's four-slot Vital Throw (priority −1, so the relay Splashes
first and never damages the player), then the tested mon — Flareon, a genuine
Level-50 Overheat carrier (`FRONTIER_MON_FLAREON_3`, set 636) — switches in
with `[Overheat, Splash, Splash, Splash]`. The **only** difference between the
twins is the player lead's species (chosen at fixture build time — the gate
needs no staged transient state at all):

- **control** (`mechanic-factory-ai-cv-overheat-control-off.json`): target is
  **Chansey** (Normal). Fire is x1, so both `if_type_effectiveness` checks fall
  through; the attacker is at full HP, so `if_hp_more_than AI_USER, 60` hits
  the zero `goto End`. Expect CV delta **0**.
- **reach** (`mechanic-factory-ai-cv-overheat-reach-off.json`): target is
  **Vaporeon** (Water). Fire is x0.5, so the second check jumps straight to
  `ScoreDown1`. Expect CV delta **−1**.

Both fixtures use `overrides.parties` (complete parties, so the stock ROM
derives types/ability/stats and runs entry hooks itself): player Chansey/Vaporeon
× [Vital Throw ×4], opponent = Magikarp Lv 5 Splash relay, Flareon
[Overheat, Splash ×3], Bulbasaur filler. Same `[A, wait 30, ×52 (A, wait 18)]`
mash cadence as the siblings; `trainerId 222`, `challengeNum 7`, streak-derived
mask 7 (all three scoring passes). `Overheat` is in `sIgnoredPowerfulMoveEffects`
(`factoryAiCheckBadMove.ts:184`) so `AI_CheckBadMove` scores it nothing; the
only scoring is `AI_CV_Overheat`'s type gate.

The draw count is **scenario-dependent, and the verifier banks it from the ROM**:
the setup pass is 4 `setup-simulated-rng` draws, then `AI_CheckBadMove`'s
per-slot `get_ability` soundproof guess adds one draw per slot **only when the
target species has two possible abilities** (`nextGetAbilityDraw`,
`factoryAiCheckBadMove.ts:714-747`; Vaporeon has a single ability → 0, Chansey
has Natural Cure/Serene Grace → 4), then the unconditional tie draw. So reach =
5 draws, control = 9 draws. The verifier's window search accepts any `N`-step
setup (≥ 4) and asserts the engine's total is `N + 1` — the receipt does not
hard-code the count.

## 3. Live ledger (oracle-verified, both seeds, both runs)

Verifier: `tools/probe/verify-factory-ai-overheat-live.ts` (also runs each
scenario twice and asserts byte-identical reruns).

| Scenario | Seed | Target | Flareon PP start→first | Overheat CV | ROM/engine choice | Decision draws / RNG |
| --- | ---: | --- | --- | --- | --- | --- |
| control | 1 | Chansey (Normal, 1x) | `[5,40,40,40]→[4,40,40,40]` | 0 | Overheat slot 0 (4-way tie) | setup 8 + tie 1 = 9, `422411211→3726110690→724352597` |
| reach | 1 | Vaporeon (Water, 0.5x) | `[5,40,40,40]→[5,40,40,39]` | −1 | Splash slot 3 | setup 4 + tie 1 = 5, `3693657463→3894234654→3323223981` |
| control | 99 | Chansey (Normal, 1x) | `[5,40,40,40]→[4,40,40,40]` | 0 | Overheat slot 0 (4-way tie) | setup 8 + tie 1 = 9, `26938960→1329715331→4213767554` |
| reach | 99 | Vaporeon (Water, 0.5x) | `[5,40,40,40]→[5,40,40,39]` | −1 | Splash slot 3 | setup 4 + tie 1 = 5, `4088512940→1656372911→2270394938` |

All four rows reran byte-identically. The engine reproduces, on the same
scored view fed the ROM-observed start RNG, the exact PP-selected slot, score
vector (`[100,100,100,100]` control / `[99,100,100,100]` reach), draw count,
and endpoint RNG. The control rows are a genuine 4-way tie broken by the
decision RNG (`Random() % 4`) — both seeds land on slot 0 (Overheat), which is
the strong test (the ROM *uses* Overheat when the gate doesn't fire). The
reach rows see Overheat drop below Splash (99 < 100) and the 3-way Splash tie
lands on slot 3 for both seeds — the ROM *avoids* Overheat the moment the gate
fires.

The gate's two other exits were **not exercised** (the step's scope): the
`if_target_faster` path (Flareon 85 is never slower than either target) and
the HP bands `>60`/`>80` (both attackers sit at full HP the whole window).
Both are pure reads in the port and would need real damage to stage.

## 4. Verdict

**MATCH.** The real ROM classifies the STAB'd Fire move against a Normal target
as neither x0.5 nor x0.25 (gate falls through → CV 0, Overheat ties at 100 and
gets used) and against a Water target as x0.5 (gate jumps to `ScoreDown1` → CV
−1, Overheat drops to 99 and is avoided) — exactly as the non-BUGFIX source and
today's port model it. The engine reproduces the ROM's chosen slot, score
vector, draw count (including the two-ability-target `get_ability` draw
difference), and exact decision-window RNG on all four rows. No `src/engine/`
change was needed.

## 5. Tier-1 pin

`tests/factoryAiOverheatLiveReceipt.test.ts` banks all four rows: each seed's
view (attacker Flareon 150/80/115/130/85 @140/140, target Chansey 25/25/55/125/70
@325/325 or Vaporeon 85/80/130/115/85 @205/205), the ROM-observed start RNG,
the expected chosen slot, the exact draw-count + kind receipt (reach
`4× setup-simulated-rng + tie`, control `4× setup-simulated-rng +
4× get-ability + tie`), the CV deltas (`[-1,0,0,0]` reach / `[0,0,0,0]`
control), and the ROM-observed endpoint RNG. A second test pins the
reach/control gate split (`bestMoveSlots` `[1,2,3]` vs `[0,1,2,3]`). A later
port that drops the x0.25/x0.5 remap (or misreads the STAB) fails these pins.

## 6. Reproduce

```sh
node --experimental-strip-types tools/probe/generate-factory-ai-overheat-fixtures.ts
node --experimental-strip-types tools/probe/verify-factory-ai-overheat-live.ts
npx vitest run tests/factoryAiOverheatLiveReceipt.test.ts \
  tests/factoryAiCheckViability.test.ts tests/factoryAiScoredDecision.test.ts
npm run test:smoke
npm run build
```
