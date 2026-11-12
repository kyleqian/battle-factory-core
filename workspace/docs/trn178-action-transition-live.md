# trn178 — the action-transition pause, live in Scene OFF (ISSUES #167 (a'))

Presentation only. Kernel events, damage, RNG, AI, turn order and facility state are unchanged (census kernel-event digests identical
for all 1,000 battles in both scenes). Rule and ROM evidence: `docs/trn176-action-transition.md`. Base `31895460a` (src tree
`9de90226b1dd31e5d0892dcf1d9222446d848b77`); production commit `727a6ecab` (src tree `b53d46f547fdba03d08b989c9389283d60abe047`,
unchanged by every later trn178 commit: tests, tools, fixtures and this doc only).

## What changed (`src/engine/battleResolutionPresentation.ts`)

`sceneOffActionTransitionPauseFrames` runs at the generic `set-battler-sprite-visibility` branch, Scene OFF only
(`HITMARKER_NO_ANIMATIONS`), for a `B_SCR_OP_MOVEEND` receipt. It pushes one draw-nothing `move-animation` pause
(`timing: { minimumFrames: P }`, the shape the attack-pause branch already uses) before the sprite-visibility command when:

1. this is the action's **first** MoveEnd receipt (walking back to the anchor meets no other MoveEnd receipt; the instruction count
   never rises, so the walk stays inside the action);
2. only further MoveEnd receipts follow, then the next action's `STRINGID_USEDMOVE` at instructionExecution u < e1 (the count restarted);
3. the anchor (the last `message` / `hp-change` / `status-icon-update` before the receipt) is not the used print itself (Wish:
   msg175's existing pause) or EMPTYSTRING3, and a print anchor is followed by `waitmessage B_WAIT_TIME_LONG` (E = exec + 64).

P = d + 6 + u − (frames of the commands presented after the anchor's command), d = e1 − E − 1. If a command after the anchor has no
timing or a hold, or P ≤ 0, nothing is added. `ACTION_TRANSITION_ROWS = 6`; Wish's `SCENE_OFF_MOVEEND_NEXT_USED_GLYPH_ROWS` is now
`1 + ACTION_TRANSITION_ROWS` (n = 1). It is still 7, and Wish's pause is unchanged (49 in the test; the census's 70 Wish pauses, 3,486 frames, are among the identical
commands).

Sanity values (Tier-1): Bulk Up 12, Sand-Attack 12, Protect 12, Toxic 16 (icon anchor), Scratch 13, Double-Edge 14, Rest 15 (HP anchor).

## Results

| Check | Result |
|---|---|
| ROM-receipt rows (`trn178Receipt.ts`: trn176's evaluation on base vs this tree, Scene OFF; `fixtures/trn178/receipt.{txt,json}`) | **23 / 23** comparable rows land exactly on trn176's predicted "after P" residual. stat (Bulk Up, Double Team, Sand-Attack) −12 → **0** ×3; protect (Protect, Detect) −12 → **0** ×2; control (Agility) −12 → **0**; miss Dynamic Punch opp −12 → **0**, ply −11 → **+1** (its miss print); two-turn Razor Wind / Solar Beam −13 → **0**, Dig −10 → **+4** (its print); failed Snore −2 → **+10** (its print); Toxic (icon) −18 → **−2** (interior); Curse ply / opp −10 / −16 → **+2 / −4**; Rest / Roar (HP anchor, synthetic stats) 3 / 2 → 18 / 17 = their anchor-end Δ. Skipped as in trn176 (6): Confuse Ray, Thunder Wave, Swagger, Flatter (no USEDMOVE next), Wish ×2 (anchor = the used print). |
| HIT path (the 5 trn176 real-stat ROM scenarios) | The production kernel in trn176Predict has synthetic stats, so the raw residual carries the hit's own commands (anchor-end Δ 17 / 17 / 27 / 24 / 8). The **transition** (residual − anchor-end Δ: the anchor command's end → next used first glyph vs the ROM's wait release → first glyph) is **−13 / −13 / −13 / −14 / −13 → 0 / 0 / 0 / 0 / 0** (Scratch ply, Scratch opp, Karate Chop, Double-Edge, Fire Punch), as trn176 predicted (−(d + 6 + u)). Rest / Roar: −15 → 0. Every comparable row's transition is 0 except opponent Baton Pass (a switch, out of scope): −11 → **+1** (trn176's ROM-only check −1). |
| Tier-1 `tests/trn178ActionTransition.test.ts` (6) | Bulk Up P 12, residual 0; stat / protect / control / miss classes 0 (Dynamic Punch ply +1); Scratch 13 / Double-Edge 14, the 5 ROM HIT rows' transition 0; Toxic icon anchor (`status-icon 1, move-animation 16, sprite-visibility ×2`), Rest HP anchor 15; controls: no USEDMOVE next (the foe's Tackle followed by the poison end-of-turn print) adds nothing and Wish keeps only msg175's 49; Scene ON: no pause, trn176's ON residuals unchanged (−16, −18, −15, −18). |
| Census 0..999 (`trn178Census.sh` (job pool, 6 jobs) + `trn178Census.ts` (msg175Census.ts + a live-animation flag) + `trn178CensusDelta.py`; `fixtures/trn178/census-delta-{off,on}.json`, shard hashes `census-sha256.txt`) | **OFF**: 1,000 battles, digests identical, 303,285 → 316,756 commands, **13,706 transition pauses** inserted (**+191,057 frames**, 998 battles; P 9 .. 29, mode 14), every other command identical (303,050), **0 unattributed**. (`byUsed` keys a pause by the latest "used" print; a charge turn has
none, so e.g. 22 charge-turn pauses after a Wish carry the label `WISH!`.) The budget-stalled 434 / 796 / 881 (census tool's 200k-frame budget, both trees) now stop earlier: 125 / 17 / 93 base tail commands not reached, no earlier change. **ON**: 1,000 battles, digests identical, **307,633 commands byte-identical**, 0 pauses. |
| `compare:differential` fight-submenu / battle1-postwin-next-prompt / presentation-rng-playable-live-bodies-seeded-on `--base 31895460a` | **PASS, 641 / 641 byte-identical** (235 + 216 + 190); none of the captured frames crosses a Scene OFF transition. |
| Re-pins (frames only, each attributed) | msg175's named −12 remainder → 0 (all six, P 12); chg161 OFF foe used glyph Dig −10 → +4, Razor Wind / Solar Beam −13 → 0 (ON unchanged); sub157 OFF == ON once the OFF-only pause is removed; factoryRoundBattleOrchestrator ISSUES #95 Hail turn: a third draw-nothing move-animation, keyed to Hail's `BattleScript_MoveEnd` sprite-visibility receipt, P 21 (next action Harden), the two no-hit pauses 40 / 39 unchanged; randomRoundSoak seven-win seed 21 37,298 → 37,738 (renderCalls 2,655 → 2,694), full 17,232 → 17,493 / 26,810 → 27,058, vanilla 9,128 → 9,154 / 8,946 → 9,232 (same battle / turn / end state); sgl138 receipt OFF totals 18,224 → 18,626, 12,778 → 13,078, 33,450 → 33,798, 14,010 → 14,298 (anchors and ON battles unchanged). **Ablation:** the final src with only `sceneOffActionTransitionPauseFrames` forced to null passes the **base** randomRoundSoak / sgl138 (base receipt) / msg175 / chg161 / sub157 tests, 81 / 81, so every moved pin is the new pause alone. |
| Gates (code commit `9d3c20c0d`, tree `c09f0acd06407fa98c73b1aa716ade84a30eb0e1`, src tree `b53d46f5`) | `npm run typecheck` exit 0; `npm run test:smoke` 448 / 448 (on `3d56a8de7`, same src); full `npm test` (nohup, POKEBENCH_VITEST_MAX_WORKERS=2) **1,678 files passed / 44 skipped, 13,918 tests passed / 223 skipped, 0 failed** (2,865 s); `npm run build` exit 0. An earlier full run on `2c2695493` had 1 failure, the Hail pin below, re-pinned in `e9760c419`. |

## Remainder

- Scene ON (same rule; trn176: moves the ON stat/protect/rest/two-turn edges from −13..−18 to the existing −4..+4 body-tail errors).
- Print lengths left as named residuals: Snore "But it failed!" +10, Dig "dug a hole!" +4, Dynamic Punch ply miss +1, Toxic −2 (interior),
  Curse +2 / −4 (its own existing pauses).
- Not covered (no pause, unmeasured): switches (opponent Baton Pass's transition is +1 with the pause, out of scope), faints, end of turn,
  pre-move prints (paralysis, confusion, sleep), a print with a wait other than B_WAIT_TIME_LONG, an anchor followed by a held command.

## Reproduce

```sh
node --experimental-strip-types --no-warnings tools/integration/trn176Predict.ts --scene=off      # every comparable row: P 0
node --experimental-strip-types --no-warnings tools/integration/trn178Receipt.ts <base-tree>      # == fixtures/trn178/receipt.txt
#   <base-tree>: git archive 31895460a workspace/src workspace/tools workspace/package.json, with node_modules linked
npx vitest run tests/trn178ActionTransition.test.ts tests/msg175UsedMessageDuration.test.ts tests/chg161ChargeTurnPrint.test.ts
TRN178_CENSUS_JOBS=6 sh tools/integration/trn178Census.sh <fresh-dir> 31895460a:off 727a6ecab:off 31895460a:on 727a6ecab:on
python3 tools/integration/trn178CensusDelta.py <dir>/off-0c8e67acc <dir>/off-c5189491c out.json   # == fixtures/trn178/census-delta-off.json
npm run compare:differential -- fight-submenu battle1-postwin-next-prompt presentation-rng-playable-live-bodies-seeded-on --base 31895460a
```
