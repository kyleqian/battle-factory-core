# `AI_CV_MirrorCoat` live receipt — real-ROM verification, and a real engine fix

> **2026-08-08 resolution:** the residual described below is closed. The scored
> decision now explicitly owns or receives `BattleTurnPassed`'s
> `gRandomTurnNumber`, and the pinned odd-address `AI_CV_Counter3` jump remains
> unfired. The verifier is PASS 4/4: control/reach seeds 1 and 99 match draw
> kinds/counts, score vectors, chosen slots, and endpoint RNG. See
> `docs/issue83-factory-ai-random-draw-diagnosis.md` §5 for the final receipt.

Bounded SIDE-lane worker session, 2026-08-08, Battle Scene OFF oracle
(`http://127.0.0.1:8014`). This is the live receipt for `AI_CV_MirrorCoat`
(`data/battle_ai_scripts.s:2116-2171`, EFFECT_MIRROR_COAT, 14 Level-50 Factory
rental carriers) — the richest CV handler ported today that had no hardware
receipt. **The session found and fixed a genuine hardware divergence in the
port** (headline below), then live-verified the fix's primary scenario.

## 0. Headline: `MOVE_COUNTER` was 243 (Mirror Coat's own id) — now 68

The port's `AI_CV_MirrorCoat` Counter-jump gate
(`factoryAiCheckViability.ts`) checked `userMoves.includes(MOVE_COUNTER)` with
`MOVE_COUNTER = 243`. The real `#define MOVE_COUNTER` is **68**
(`reference/pokeemerald/include/constants/moves.h:72`); **243 is
`MOVE_MIRROR_COAT`'s own id** (`moves.h:247`). Since the handler is only
dispatched for a Mirror Coat move, the port's `includes(243)` was **always
true** — it could never model a Counter-less Mirror Coat carrier and always
burned the single `<100` ScoreUp4 roll instead of the power-0 control path.
The fix (`MOVE_COUNTER = 68`, commit `fcea77b0`) is unambiguous from source.
`AI_CV_Counter`'s sibling `includes(243)` (`MOVE_MIRROR_COAT` for
`if_has_move AI_USER, MOVE_MIRROR_COAT`) was already correct.

## 1. The gate

```
AI_CV_MirrorCoat3:                        (data/battle_ai_scripts.s:2127-2141)
	if_has_move AI_USER, MOVE_COUNTER, AI_CV_MirrorCoat_ScoreUp4   ; 68, not 243
	get_last_used_bank_move AI_TARGET
	get_move_power_from_result
	if_equal 0, AI_CV_MirrorCoat5          ; power-0 path (target's first move / Splash)
	...
AI_CV_MirrorCoat5:
	if_target_not_taunted AI_CV_MirrorCoat6
	...
AI_CV_MirrorCoat6:                        ; non-BUGFIX arm (pinned build, config.h:48)
	get_target_type1
	if_in_bytes AI_CV_MirrorCoat_SpecialTypeList, AI_CV_MirrorCoat_End
	get_target_type2
	if_in_bytes AI_CV_MirrorCoat_SpecialTypeList, AI_CV_MirrorCoat_End
AI_CV_MirrorCoat7:
	if_random_less_than 50, AI_CV_MirrorCoat_End
AI_CV_MirrorCoat_ScoreUp4:
	if_random_less_than 100, AI_CV_MirrorCoat_ScoreUp4_End
	score +4
```

With a full-HP, un-statused target the three status gates and both HP gates
(`>30`, `>50`) fall through with zero rolls, so the split is purely:
**Counter (68) in the AI user's set** → single `<100` ScoreUp4 roll (+4 or 0);
**no Counter** → the target's last move power is read (Splash = power 0 →
MirrorCoat5), then the non-BUGFIX target-type gate (a target whose type IS in
the 8-type special list ends at zero; a non-special target like Ground reaches
MirrorCoat7's `<50` roll + the shared `<100` +4 tail). The port models the
**non-BUGFIX** arm (`hasSpecialType → End`, neither special → two rolls) —
confirmed both by source read and by the live control row below.

## 2. Fixture pair

Both fixtures use `overrides.parties` so the stock ROM builds real parties and
runs its own AI (same cadence/trainer-222/streak-28 mask-7 shape as the
siblings). The AI user is the **opponent lead**; the target is **Donphan**
(232) — pure Ground (not in the special list → MirrorCoat7 reached) with a
single ability (Sturdy → zero get-ability draws) and no move of the AI's set
super-effective against it (→ `ShouldSwitch`, `battle_ai_switch_items.c:429`,
draws zero pre-decision RNG — the siblings' Vaporeon/Chansey trick, applied
here so the decision window is the pure 4-setup + scoring + tie shape). The
target uses Splash, so every observable decision sees `lastUsedMove` = Splash
(power 0) → the power-0 path.

- **control** (`mechanic-factory-ai-cv-mirrorcoat-control-off.json`): opponent
  lead **Corsola** (222, real FRONTIER_MON_CORSOLA, set 151) with
  `[Mirror Coat, Splash, Splash, Splash]` — a real Mirror Coat carrier with
  **no Counter (68)**.
- **reach** (`mechanic-factory-ai-cv-mirrorcoat-reach-off.json`): opponent lead
  **Wobbuffet** (202, real FRONTIER_MON_WOBBUFFET_2, set 290 — a real
  Counter + Mirror Coat carrier) with `[Mirror Coat, Counter, Splash, Splash]`.

The turn-1 decision is drawn in the battle intro and is invisible to the
frame capture (established: the intro's AI decision precedes user-frame 0).
The **first observable decision is turn 2** (between the first and second PP
deltas). Draw counts are scenario-fixed at **7** (4 setup-simulated-rng +
2 CV rolls + 1 tie).

## 3. Live ledger (oracle-verified)

Verifier: `tools/probe/verify-factory-ai-mirrorcoat-live.ts` (runs each
scenario twice and asserts byte-identical reruns; captures three 256-frame
windows spanning the first/second PP deltas).

| Scenario | Seed | Decision RNG (start → draws → end) | ROM slot | Engine draws | Engine endpoint | Engine slot |
| --- | ---: | --- | ---: | ---: | --- | ---: |
| control | 1 | `3644022420 → (7) → 3323223981` | 0 (Mirror Coat) | 7 ✓ | 3323223981 ✓ | 0 ✓ **MATCH** |
| reach | 1 | `3560934917 → (7) → 3726110690` | 3 (Splash) | 7 ✓ | 3726110690 ✓ | 0 ✗ |
| control | 99 | `963358333 → (8) → 1352996645` | 1 (Splash) | 7 ✗ | 2270394938 ✗ | 3 ✗ |
| reach | 99 | `3643996146 → (7) → 1329715331` | 0 (Mirror Coat) | 7 ✓ | 1329715331 ✓ | 1 ✗ |

**control seed 1 is a full MATCH** — the ROM's turn-2 decision drew 7 (4 setup
+ `mirror-coat-roll-6` + `mirror-coat-roll-7` + tie), ending at `3323223981`
and using Mirror Coat (slot 0); the fixed engine reproduces the exact draw
kinds, the exact endpoint, and the exact slot. **Before the fix** this row
diverged: the buggy engine drew 6 (`includes(243)` → Counter path → only
`mirror-coat-roll-7`), ending at `3726110690`, choosing Splash slot 3 — the 
hardware-vs-engine evidence that drove the fix.

**The reach rows match on draw count and endpoint RNG but diverge on the tie
slot**: the engine's Counter-jump roll (`mirror-coat-roll-7`) falls through to
+4 (Mirror Coat 104 → best slot 0/1), while the ROM's decisions assign the
Splash/Mirror Coat slots that its tie RNG produces (turn 2: all-four-100 tie
→ slot 3; turn 3: Mirror Coat 104 only → slot 0). Since the draw count and
endpoint agree exactly, the divergence is in where the scoring draws land
relative to the pre-decision RNG — the port and ROM agree on *how many* draws
but not on the *outcome of the roll positions* for the two-CV-roll reach case.
This is the precisely-located residual; a follow-up should instrument the
reach decision's per-draw values against a `get_ability`/switch-check-aware
view of the intro-and-turn-2 RNG chain.

**control seed 99 diverges by +1 draw** (ROM 8, engine 7): the engine's fixed
7-draw model can't reach the ROM's endpoint. Same residual family as the reach
slot issue — a pre-decision or per-slot draw the scored-decision policy does
not model (the switch-check family draws zero under the matchup, so this is a
distinct, unlocated-by-count event). The CV deltas `[0,0,0,0]` (Mirror Coat 0)
still agree.

## 4. Verdict

**The `MOVE_COUNTER = 243 → 68` fix is a genuine hardware divergence and is
now corrected and live-verified on the control row** (seed 1: full
slot + draw-count + endpoint match). The non-BUGFIX target-type gate is
confirmed correct by the control row (non-special Ground target reaches the
two-roll path). **Residual:** the reach (Counter-in-set) rows and control
seed-99 show a draw-position/outcome mismatch of the same family — draw count
and endpoint RNG agree on the reach rows, but the chosen tie slot differs, and
control seed 99 is +1 draw. These need a follow-up that traces the reach
decision's individual roll outcomes against the full pre-decision RNG chain.

## 5. Tier-1 pin

`tests/factoryAiMirrorCoatLiveReceipt.test.ts` banks: (a) the control seed-1
row (7 draws with kinds `setup×4, mirror-coat-roll-6, mirror-coat-roll-7,
tie`, endpoint `3323223981`, slot 0, CV `[0,0,0,0]`); (b) the reach seed-1
draw/endpoint receipt (`mirror-coat-roll-7` + `counter-bonus-roll`, endpoint
`3726110690`) with the tie-slot residual documented; (c) the regression guard
that a Counter-less set must NOT take the Counter jump (`roll-6` present,
`counter-bonus-roll` absent) while a Counter set must (`counter-bonus-roll`
present) — the guard fails on the pre-fix 243 constant.

## 6. Reproduce

```sh
node --experimental-strip-types tools/probe/generate-factory-ai-mirrorcoat-fixtures.ts
node --experimental-strip-types tools/probe/verify-factory-ai-mirrorcoat-live.ts
npx vitest run tests/factoryAiMirrorCoatLiveReceipt.test.ts \
  tests/factoryAiCheckViability.test.ts tests/factoryAiScoredDecision.test.ts
npm run test:smoke
npm run build
```

Fixture staging note: the fixture generator is committed
(`tools/probe/generate-factory-ai-mirrorcoat-fixtures.ts`); the two JSON
fixtures are committed under `tools/battle-lab/`.
