# Soak deep sweep — 2026-08-20 (Milestone M-B step 3)

Sweeps the `winning`-policy depth reachable with the union of everything
landed since the 2026-08-19 baseline: the ISSUES #99 fix (soak driver
finally answers its own post-win swap offer, `ed783b57`/`c13b8aea`,
PROGRESS 1358), the ISSUES #100 fix (`{B_CURRENT_MOVE}` resolver for
`STRINGID_NATUREPOWERTURNEDINTO` + the sibling `STRINGID_PKMNWASDEFROSTEDBY`
gap, `b8868647`, PROGRESS 1360), and M-B step 2a (`pickWinningFightSlot` —
`winning` now picks fight moves by power × type-effectiveness × STAB,
`286f2938`, folded at `ae1f24eb`, PROGRESS 1359). None of that union had
been swept before this session. Master HEAD at the start of this session:
`e0f9137f`. Measurement + triage only — no `src/`/`tests/` change this
session (two new crash signatures found are filed as ISSUES entries, not
fixed, per the standing convention).

All raw per-seed lines for every chunk are in
`docs/soak-deep-sweep-2026-08-20.log`, in seed order, exactly as the CLI
printed them (each chunk's own `=== soak summary ===` / `=== depth
distribution ===` block), plus a compact draft/round-boundary excerpt from
seed 99's `--verbose` run (the full 37,264-line log is not committed).

## Commands run

Twelve 20-seed chunks, `--render-every 0`, run as three back-to-back batches
of four parallel foreground processes (`0:80`, `80:160`, `160:240`; each
batch `wait`ed on before the next started — never backgrounded past the
turn):

```
node --experimental-strip-types tools/soak/randomRoundSoak.ts --policy winning --seeds 0:20    --render-every 0
node --experimental-strip-types tools/soak/randomRoundSoak.ts --policy winning --seeds 20:40   --render-every 0
node --experimental-strip-types tools/soak/randomRoundSoak.ts --policy winning --seeds 40:60   --render-every 0
node --experimental-strip-types tools/soak/randomRoundSoak.ts --policy winning --seeds 60:80   --render-every 0
node --experimental-strip-types tools/soak/randomRoundSoak.ts --policy winning --seeds 80:100  --render-every 0
node --experimental-strip-types tools/soak/randomRoundSoak.ts --policy winning --seeds 100:120 --render-every 0
node --experimental-strip-types tools/soak/randomRoundSoak.ts --policy winning --seeds 120:140 --render-every 0
node --experimental-strip-types tools/soak/randomRoundSoak.ts --policy winning --seeds 140:160 --render-every 0
node --experimental-strip-types tools/soak/randomRoundSoak.ts --policy winning --seeds 160:180 --render-every 0
node --experimental-strip-types tools/soak/randomRoundSoak.ts --policy winning --seeds 180:200 --render-every 0
node --experimental-strip-types tools/soak/randomRoundSoak.ts --policy winning --seeds 200:220 --render-every 0
node --experimental-strip-types tools/soak/randomRoundSoak.ts --policy winning --seeds 220:240 --render-every 0
```

## `winning` policy, seeds 0:240

- **OK/CRASH/HANG:** **238 OK, 2 CRASH, 0 HANG.** Zero HANGs anywhere in the
  sweep — no seed exhausted the 1,000,000-frame `winning` budget; every
  non-crash termination was an honest `roundComplete`/`roundLost`. The
  highest frame count observed was 649,579 (seed 70), well under a third of
  the budget even at this sweep's deepest reach, so this is not a
  budget-tuning question for the supervisor this round.
- **carry >= 7  (challengeNum >= 1):** 105/240 (43.75%)
- **carry >= 14 (challengeNum >= 2):** 33/240 (13.75%)
- **carry >= 21 (challengeNum >= 3):** **1/240 (0.4%) — seed 99.** First
  carry >= 21 seed ever observed on the post-#99/#100-fix tree (the
  pre-#99-fix 2a-only supervisor re-measure, PROGRESS 1359, also found one
  in a different 0:60 range under a different code state — see the
  before/after table below).
- **carry >= 28 (challengeNum >= 4):** 0/240 — not observed; deepest carry
  anywhere is 21.
- **Deepest carry anywhere:** 21 — seed 99 (the only seed above).
- **Deepest battle-depth anywhere:** **25 — seed 99** (carry 21, battle 5 of
  the fourth round: `21 + (5-1) = 25`). This is the deepest battle-depth
  observed in any sweep to date (previous deepest: 24, 1359's pre-#99-fix
  2a-only supervisor re-measure; 20, 2026-08-19 `vanilla`).
- **Two new crash signatures** (both `[engine/tick]`, genuine `src/engine`
  throws, not driver bugs) — filed as **ISSUES #101** (seed 90,
  `STRINGID_PKMNTOOKAIM`/Lock-On has no `messageLines` case at all — a wider
  gap than #100's single missing placeholder resolver) and **ISSUES #102**
  (seed 154, `Cmd_switchhandleorder` sees no decided `monToSwitchIntoId` for
  battler 1 after a mid-round forced switch). Neither is small/engine-local
  enough to pin same-step per the standing convention (both need real
  investigation into unmodeled move-effect/switch-in paths); see the
  ISSUES.md entries for repro, stack, and last-actions.

## Chunk-by-chunk breakdown

| seeds | OK | CRASH | HANG | carry>=7 | carry>=14 | carry>=21 | deepest carry | deepest depth |
|---|---|---|---|---|---|---|---|---|
| 0:20 | 20 | 0 | 0 | 13/20 | 5/20 | 0/20 | 14 | 16 |
| 20:40 | 20 | 0 | 0 | 10/20 | 2/20 | 0/20 | 14 | 17 |
| 40:60 | 20 | 0 | 0 | 11/20 | 3/20 | 0/20 | 14 | 19 |
| 60:80 | 20 | 0 | 0 | 7/20 | 2/20 | 0/20 | 14 | 20 |
| 80:100 | 19 | 1 (seed 90, #101) | 0 | 12/20 | 4/20 | **1/20 (seed 99)** | **21** | **25** |
| 100:120 | 20 | 0 | 0 | 6/20 | 3/20 | 0/20 | 14 | 18 |
| 120:140 | 20 | 0 | 0 | 8/20 | 1/20 | 0/20 | 14 | 16 |
| 140:160 | 19 | 1 (seed 154, #102) | 0 | 9/20 | 3/20 | 0/20 | 14 | 18 |
| 160:180 | 20 | 0 | 0 | 8/20 | 2/20 | 0/20 | 14 | 18 |
| 180:200 | 20 | 0 | 0 | 10/20 | 6/20 | 0/20 | 14 | 20 |
| 200:220 | 20 | 0 | 0 | 6/20 | 1/20 | 0/20 | 14 | 16 |
| 220:240 | 20 | 0 | 0 | 5/20 | 1/20 | 0/20 | 14 | 17 |
| **total** | **238** | **2** | **0** | **105/240** | **33/240** | **1/240** | **21** | **25** |

## Seed 99's chain (M-B acceptance artefact) — genuine, not a fluke

`node --experimental-strip-types tools/soak/randomRoundSoak.ts --seed 99
--policy winning --verbose --render-every 0` (full log kept out of git,
37,264 lines; the draft/round-boundary excerpt is committed in
`docs/soak-deep-sweep-2026-08-20.log`). The eight `draft: open menu on slot
1` markers show the full chain — each is annotated with the *previous*
round's outcome (the driver logs from the fresh draft screen, after the
round that just ended):

```
[f=4      b1 t0]  draft open  -- fresh start, carry 0
[f=66243  b7 t10] draft open  -- round 1 WON (b7)  -> carry 7
[f=136958 b7 t21] draft open  -- round 2 WON (b7)  -> carry 14
[f=183410 b7 t5]  draft open  -- round 3 WON (b7)  -> carry 21
[f=226423 b5 t14] draft open  -- round 4 LOST (b5) -> carry resets to 0 (this is the carry<=21 depth<=25 round)
[f=295245 b7 t20] draft open  -- round 5 WON (b7)  -> carry 7
[f=342593 b4 t18] draft open  -- round 6 LOST (b4) -> carry resets to 0
[f=403396 b7 t15] draft open  -- round 7 WON (b7)  -> carry 7
seed 99 ends mid-round-8 at b2, roundLost -- final summary: carry<=21 depth<=25
```

This is genuine chained play, not an artefact of the depth instrument:
round 1 (carry 0→7), round 2 (7→14), and round 3 (14→21) are each won
cleanly in exactly 7 battles (`b7` at every draft boundary), and round 4
(entered at carry 21) reaches battle 5 (`21 + (5-1) = 25`) before an honest
loss re-chains the streak back to 0. **challengeNum at carry 21 is
`floor(21/7) = 3`** — inside `factoryAiMaskSelection.ts`'s
`challengeBelow4` branch (mask 1: `CHECK_BAD_MOVE` only), not
`challengeAtLeast4`'s full AI triad (mask 7), which needs challengeNum >= 4
i.e. **carry >= 28** — not reached in this sweep. So this session's deepest
reach exercises the `CHECK_BAD_MOVE` AI tier at challenge 3, one challenge
short of the full-triad tier.

## Before/after table (winning policy)

| when | code state | seeds | OK | carry>=7 | carry>=14 | carry>=21 | deepest carry | deepest battle-depth |
|---|---|---|---|---|---|---|---|---|
| 2026-08-19 | pre-#99-fix, pre-2a | 0:180 | 180/180 | 64/180 (35.6%) | 10/180 (5.6%) | 0/180 (0%) | 14 | 16 (seed 61) |
| PROGRESS 1358 | post-#99-fix, pre-2a, pre-#100-fix | 0:60 | 59/60 | 20/60 (33.3%) | 4/60 (6.7%) | 0/60 (0%) | 14 | 14 (seeds 7,20,30,32) |
| PROGRESS 1359 (supervisor) | pre-#99-fix + 2a | 0:60 | n/a | 25/60 (41.7%) | 9/60 (15.0%) | 1/60 (1.7%) | — | 24 |
| this sweep, 0:60 slice | post-#99+#100-fix + 2a | 0:60 | 60/60 | 34/60 (56.7%) | 10/60 (16.7%) | 0/60 (0%) | 14 | 19 (seed 46) |
| **this sweep, full** | **post-#99+#100-fix + 2a** | **0:240** | **238/240** | **105/240 (43.75%)** | **33/240 (13.75%)** | **1/240 (0.4%)** | **21** | **25 (seed 99)** |

The 0:60 apples-to-apples slice alone (34/10/0, deepest depth 19) already
clears 1358's post-#99-fix-only floor (20/4/0, deepest depth 14) by a wide
margin, confirming step 2a's type-aware move choice keeps paying off on top
of the #99/#100 fixes. Widening to the required 0:240 range is what
surfaces the first carry >= 21 seed on this code state (seed 99, at index
99 — outside the 0:60 slice), reaching one battle further than 1359's
pre-#99-fix 2a-only measurement (depth 25 vs. 24) despite a completely
different swap-decision mechanic underneath. `full`/`vanilla` were not
re-measured this session (out of scope — this step is `winning`-only per
the brief).

## Triage

- **ISSUES #101** (seed 90, `STRINGID_PKMNTOOKAIM`): filed, not fixed. Wider
  than a missing-resolver gap (#100's pattern) — `EFFECT_LOCK_ON` has no
  `messageLines` case and no execution-path reference anywhere in
  `src/engine/*.ts` outside AI viability scoring. Needs its own
  investigation session to scope the fix.
- **ISSUES #102** (seed 154, `Cmd_switchhandleorder`): filed, not fixed. A
  mid-round forced-switch ordering gap — battler 1's `monToSwitchIntoId`
  was never decided before `switchhandleorder` ran. Root cause not narrowed
  under this step's `src/`-off-limits scope (AI switch-in decision skip vs.
  ordering bug vs. the file's own documented unmodeled multi-battler case).
- No STOP RULE trigger: two distinct, low-frequency (1/120 each) genuine
  engine crashes in previously-unexercised deep territory, not systemic
  driver breakage.

## M-B step-3 headline

Carry >= 21 **is** observed in the required 0:240 sweep (1/240, seed 99),
so the extension to 240:360 described in the brief's fallback branch was not
needed and was not run. The sweep's own numbers already answer the
milestone question: post-#99/#100-fix, `winning`-policy chained play can and
does reach carry 21 (challengeNum 3, the `CHECK_BAD_MOVE` AI tier) and one
battle beyond, though still rarely (0.4% of 240 seeds) and never yet into
challengeNum 4's full AI triad (carry >= 28).
