# `AI_CV_ChargeUpMove` live receipt — real-ROM verification of the 0.5x/0.25x effectiveness gate

Bounded SIDE-lane worker session, 2026-08-08, Battle Scene OFF oracle. This
receipt live-verifies one handler that serves **four** `if_effect` entries —
`EFFECT_SOLAR_BEAM` (16 Level-50 Factory carriers), `EFFECT_RAZOR_WIND` (2),
`EFFECT_SKY_ATTACK` (1) and `EFFECT_SKULL_BASH` (0) — all dispatching to the
same `AI_CV_ChargeUpMove` body (`data/battle_ai_scripts.s:683,707,739,740`).
The step stages the receipt with **Solar Beam**, the only one of the four
with real Factory weight. It answers the step's question: **does the ROM's
`if_type_effectiveness` gate on the charge-up move exactly as the port's
`classifyHighCritEffectiveness` models it, and does the whole handler match
hardware for a Solar Beam carrier?**

## 1. The gate, from the real source

```
AI_CV_ChargeUpMove:                       (data/battle_ai_scripts.s:2184-2195)
	if_type_effectiveness AI_EFFECTIVENESS_x0_25, AI_CV_ChargeUpMove_ScoreDown2
	if_type_effectiveness AI_EFFECTIVENESS_x0_5, AI_CV_ChargeUpMove_ScoreDown2
	if_has_move_with_effect AI_TARGET, EFFECT_PROTECT, AI_CV_ChargeUpMove_ScoreDown2
	if_hp_more_than AI_USER, 38, AI_CV_ChargeUpMove_End
	score -1
	goto AI_CV_ChargeUpMove_End
AI_CV_ChargeUpMove_ScoreDown2:
	score -2
AI_CV_ChargeUpMove_End:
	end
```

The whole body is **deterministic — zero `if_random_less_than` sites**. The
gate is a priority ladder: a 0.25x/0.5x hit against the target scores the
flat `-2` (`ScoreDown2`), a target that has used a Protect-effect move also
scores `-2` (the `if_has_move_with_effect AI_TARGET` history scan, with its
pinned-source non-BUGFIX positional quirk — `gBattleMons[sBattler_AI].moves[i]
!= 0` gating the target's used-move history), and otherwise own HP ≤ 38%
scores `-1` (the recharge turn is survivable), HP > 38% scoring `0`. No
command writes `funcResult`. The port (`src/engine/factoryAiCheckViability.ts:
4632-4691`, dispatch `:6395-6420`) models exactly this ladder, reusing
`classifyHighCritEffectiveness` — the same STAB'd `AI_EFFECTIVENESS_x1`
(40) baseline through `applyStab` + `applyTypeEffectiveness` remapped onto
the four named `AI_EFFECTIVENESS_x*` constants that `Cmd_if_type_effectiveness`
(`battle_ai_script_commands.c:1515-1558`) itself uses.

**Discriminating input chosen for this receipt: the 0.5x effectiveness
branch.** The pair differs only in the target species' real typing —
Vaporeon (pure Water) takes Solar Beam at 2x, Ninetales (pure Fire) at 0.5x
(the ROM's `TypeCalc` dedupes a single-typed mon, `types[0] == types[1]`, so
the multiplier applies once — `battle_script_commands.c:1576-1577`). The
Protect gate and the HP gate are both neutral in both scenarios: the target's
only known move is Vital Throw (no Protect), and Venusaur switches in at full
HP (155/155 > 38%). **No weather was needed** — `AI_CV_ChargeUpMove` has no
`get_weather` read, so a Sunny Day (real or staged) would not change the
score; none was staged.

## 2. Reach/control fixture pair

The recipe's twin-fixture shape (cf. `docs/factory-ai-cv-live-receipts-facade.md`
and the counter pair §34.3 of `docs/factory-ai-checkviability-ground-truth.md`):
a level-5 Magikarp relay (Splash ×4) is KO'd by the player's four-slot Vital
Throw (priority −1, so the relay always acts first), then the tested mon —
**Venusaur, a genuine Level-50 Solar Beam carrier** (`FRONTIER_MON_VENUSAUR_2`,
`data/battle_frontier/battle_frontier_mons.h:4779`) — switches in with
`[Solar Beam, Splash, Splash, Splash]`. The only difference between the twins
is the target species' real typing:

- **control** (`mechanic-factory-ai-cv-chargeup-control-off.json`): player
  **Vaporeon** (Water). Solar Beam hits 2x — the effectiveness gate does NOT
  fire; all four moves tie at 100.
- **reach** (`mechanic-factory-ai-cv-chargeup-reach-off.json`): player
  **Ninetales** (Fire). Solar Beam hits 0.5x — the `-2` gate fires; Solar Beam
  scores 98 and the AI shuns it for a Splash.

Both fixtures use `overrides.parties` (complete parties, so the stock ROM
derives types/ability/stats and runs entry hooks itself): player
Vaporeon/Ninetales × [Vital Throw ×4], opponent = Magikarp Lv 5 relay,
Venusaur [Solar Beam, Splash ×3], Bulbasaur filler. Same
`[A, wait 30, ×52 (A, wait 18)]` mash cadence as the facade/counter pairs;
`trainerId 222`, `challengeNum 7`, streak-derived mask 7 (all three scoring
passes). Solar Beam has **no** CBM dispatch entry (only `EFFECT_RAZOR_WIND`/
`EFFECT_SKULL_BASH` reach `AI_CBM_HighRiskForDamage` in `AI_CheckBadMove`
— `:128,:183`) and no TryToFaint/CV draw site at 2x/0.5x, so **every decision
consumes exactly setup×4 + tie×1 = 5 draws** in both scenarios. The whole
observable difference is the CV delta: **−2 on the resisting target, 0 on the
neutral one**.

## 3. Live ledger (oracle-verified, both seeds, both runs)

Verifier: `tools/probe/verify-factory-ai-chargeup-live.ts` (runs each scenario
twice and asserts byte-identical reruns; the fixture pair is generated by
`tools/probe/generate-factory-ai-chargeup-fixtures.ts`).

| Scenario | Seed | Target | Venusaur PP start→first | Solar Beam CV | ROM/engine choice | Engine RNG |
| --- | ---: | --- | --- | --- | --- | --- |
| control | 1 | Vaporeon (2x) | `[10,40,40,40]→[10,39,40,40]` | 0 | Splash slot 1 (tie) | 5 draws, `3917320632→249678687` |
| reach | 1 | Ninetales (0.5x) | `[10,40,40,40]→[10,40,40,39]` | −2 | Splash slot 3 (tie) | 5 draws, `3894234654→3323223981` |
| control | 99 | Vaporeon (2x) | `[10,40,40,40]→[10,40,39,40]` | 0 | Splash slot 2 (tie) | 5 draws, `3126163249→4009132340` |
| reach | 99 | Ninetales (0.5x) | `[10,40,40,40]→[10,40,40,39]` | −2 | Splash slot 3 (tie) | 5 draws, `1656372911→2270394938` |

All four rows reran byte-identically. The engine reproduces, on the same
scored view fed the ROM-observed start RNG (the value immediately before the
decision's 4-draw setup), the exact PP-selected slot, score vector
(`[100,100,100,100]` control / `[98,100,100,100]` reach), draw count, and
endpoint RNG. The reach rows are a genuine **3-way tie** (`bestMoveSlots`
`[1,2,3]`) broken by the decision RNG (`Random() % 3`) onto a Splash slot —
the strongest observable proof that the `−2` actually reached the score: the
AI would otherwise happily pick Solar Beam. The control rows are a genuine
**4-way tie** (`[0,1,2,3]`, `Random() % 4`) landing on slot 1 (seed 1) and
slot 2 (seed 99).

Decision-window frames: reach setup/tail at **f745/f746**, control at
**f742/f743** (both seeds); Venusaur switches in at ~f596-600 and executes
the chosen Splash (PP delta) at **f807**. The decision RNG transition triple
is `1 + 4 + 1` for reach; control shows `1 + 2 + 4 + 1` — one extra 2-step
pre-decision transition (an unmodeled pre-setup draw like the facade receipt's
own single one; the engine is fed the value *after* it and matches the setup+
tail exactly, so the receipt is unaffected).

## 4. Verdict

**MATCH.** The real ROM reads the charge-up move's type effectiveness against
the target and applies the flat `-2` at 0.5x exactly as the non-BUGFIX source
and today's port model it. The ROM's `TypeCalc` output (`Cmd_if_type_effectiveness`
via `AI_EFFECTIVENESS_x1` STAB baseline) and the port's
`classifyHighCritEffectiveness` agree on both probed matchups: Vaporeon 2x
(no gate, all four moves 100) and Ninetales 0.5x (`-2`, Solar Beam 98). One
handler receipt covers all four `EFFECT_SOLAR_BEAM`/`EFFECT_RAZOR_WIND`/
`EFFECT_SKY_ATTACK`/`EFFECT_SKULL_BASH` dispatch entries. No
`src/engine/` change was needed.

## 5. Tier-1 pin

`tests/factoryAiChargeUpLiveReceipt.test.ts` banks all four rows: each seed's
view (attacker Venusaur 102/103/120/120/100 @155/155, target Vaporeon
85/80/130/115/85 @205/205 or Ninetales 96/95/101/120/120 @148/148), the
ROM-observed start RNG, the expected chosen slot, the exact 5-draw receipt
(`setup×4 + tie×1`), the CV deltas (`[-2,0,0,0]` reach / `[0,0,0,0]` control),
and the ROM-observed endpoint RNG. A second test pins the reach/control gate
split (`bestMoveSlots` `[1,2,3]` vs `[0,1,2,3]`). A later port that drops the
0.5x/0.25x branch (or flips the HP comparison) fails these pins.

## 6. Reproduce

```sh
node --experimental-strip-types tools/probe/generate-factory-ai-chargeup-fixtures.ts
node --experimental-strip-types tools/probe/verify-factory-ai-chargeup-live.ts
npx vitest run tests/factoryAiChargeUpLiveReceipt.test.ts \
  tests/factoryAiCheckViability.test.ts tests/factoryAiScoredDecision.test.ts
npm run test:smoke
npm run build
```
