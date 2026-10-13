# Struggle — required playable animation

## User decision — 2026-10-11

The user directed: "ok let's include it then", after reviewing why the
roadmap excluded Struggle. `MOVE_STRUGGLE` (165) is now required S10A work.
Its absence from rental move lists does not make it unreachable: the battle
engine forces Struggle when all moves are unusable. This decision supersedes
the previous Struggle exclusion and the generic outside-Factory restriction
for this move. Work it first in the next run, alongside stat-change animation
issue #166; do not ask for this scope approval again.

## Current state and accounting

**Status 2026-10-11 (afternoon session): LIVE.** stg107 (evidence, 19 ROM windows) -> stl109 (landed: 15 / 15 live windows 0 px, two
real kernel routes with Scene ON / OFF parity) -> sdl119 (Substitute-doll cells). Census 0..999: 895 / 1,001 Struggle commands live; the
106 declines are order-host invalidations by Odor Sleuth / Hyper Beam bodies earlier in those battles (docs/stf115-struggle-declines.md).
Accounting: `additionalRequiredBodies.MOVE_STRUGGLE` (required -> accepted -> live) outside the historical 276. Audit 26 found and fix122
fixed one Struggle defect (its target keeps its idle rest). The text below is the original scope contract.

- The historical catalogue has 276 accepted bodies, all with scoped live
  adapters. Struggle adds one required body; it is not yet accepted or live.
- Keep historical catalogue counts and evidence intact. Extend the inventory
  and census to track this additional required move before its live promotion,
  so global checks do not reject it merely for lacking a rental-list entry.
  Report required/pending, accepted and live states separately; inclusion alone
  grants no animation acceptance or coverage credit.
- The latest 0..999 sample has 1,089 Struggle commands. All-command coverage
  remains 95.38% by count / 98.72% by frames. Excluding-Struggle coverage is
  diagnostic only and cannot justify S10A completion.
- The sampled input policy can increase PP exhaustion; this affects observed
  frequency, not the requirement to support real forced-Struggle routes.

## Next-run implementation and acceptance

1. Read the original `Move_STRUGGLE` source and reused components. Implement
   its source-derived duration, renderer, assets and cleanup through the normal
   live seam; audit the graphics order/allocation history it consumes or changes.
   Reuse proved components where applicable. Never render captured fixture rows.
2. Prove complete dense windows through the production live renderer, both
   attacking orientations, twice fresh, alternate species and source-required
   variants. Use the standing D3/D4 exceptions only when their evidence applies.
3. Stage real forced-Struggle command input through legal PP exhaustion or
   other unusable-move conditions. Reuse the gameplay contract pinned by
   `tests/factoryBattleScriptNoPpStruggleFullTurn.test.ts`; verify animation,
   cleanup, recoil/HP/faint presentation and the subsequent prompt or terminal
   boundary. Include repeated uses and relevant Substitute/history cases.
4. Preserve existing gameplay outcomes, damage, turn order and gameplay RNG;
   compare Scene ON/OFF. This decision authorizes presentation integration,
   not gameplay changes. Subsequent user authorization on 2026-10-13 permits
   source-proven engine fixes, including #165, through separate main-lane steps
   under `factory-finish-scope.md`; it does not give a Struggle renderer gameplay
   RNG ownership or waive Scene ON/OFF logical parity.
5. Run the scoped production gates in `ANIMATION_VERIFICATION.md`, independently
   reproduce the central proof, and report the census including Struggle.
   Record any remaining variant/history gates honestly and refresh the preview
   at the verified checkpoint. Do not mark S10A complete with this body missing.
