# hpd1: the ordinary hit's post-bar hold (source rule measured; production change built, NOT landed)

Presentation only. Scenes ON (8012) and OFF (8014). Tooling: `tools/integration/hpd1Labs.py` (writes the 20 labs `tools/battle-lab/hpd1-*.json` and
traces `tools/compare/traces/hpd1-*.json`; stages in `tools/compare/appTrace.ts`), `hpd1AppOnly.ts` (app-only renderer, ~13 s a lab),
`hpd1Measure.mjs` (drain start / end, text-box change, action menu from the frames), ROM receipts `tools/integration/fixtures/hpd1/rom-holds.json`,
test `tests/hpd1HpHold.test.ts`. Evidence under `.integration/evidence/hpd1/` (ignored).

## Result

1. **The 28-frame floor (`HP_TIMING`, `max(28, bar + 1)`) is a fit, not a ROM rule.** In 20 ROM windows (fixed damage 10..90 by Seismic Toss,
   Dragon Rage 40, Sonic Boom 20; both scenes) the hold after the drain start is `damage + K` with **K constant per shape**:
   K = 17 when the hit ends the turn (shape c, 12 windows), K = 18 when the foe's USEDMOVE follows (shape a, 8 windows); identical in Scene ON and OFF.
   There is no bar-size term and no floor (a 9-frame bar holds as the 90-frame bar does, relative to its own end).
2. **A source-shaped replacement matches the ROM exactly for those shapes.** `hp` = bar frames + 1, plus `tailFrames`: shape a +1 (the `datahpupdate` row;
   the action-transition pause presents the rows after it), shape c + d where d = rows from `datahpupdate` to the first MoveEnd receipt (7 here:
   `critmessage`, `waitmessage`, `resultmessage`, `waitmessage`, `seteffectwithchance`, `tryfaintmon`, `moveendall`; kernel `instructionExecution`
   difference). Measured ROM minus ours, drain end -> next text-box change, all 20 labs (both scenes): **0** (before: shape c sonicboom 0, toss10 -10,
   others +7; shape a sonicboom -6, others +1). Remaining, not hold: drain end -> action menu +2 in shape c (ROM turn-end 8 frames, ours 6), and +8 in
   shape a Scene ON (the foe's action that follows; unchanged by this work).
3. **It is not landed.** The same change made `rol1-rollout5-on` worse (below), which the step's rule forbids. The implementation is commit
   `bab95ae43` (`src/engine/battleResolutionPresentation.ts`: `hpMoveEndLeadRows` / `applyHpHitTails`; re-pins of `battleTurnPortability` and
   `aud242oMoveAnimSounds`); the next commit restores production and those tests, so production is unchanged vs the step's base.

## Why rol1 got worse (the stop evidence)

`rol1-rollout5-on`: 383/3001 matched before, 261/3001 after; frames 0..530 (turn 1 incl. its hit and hold) identical in both, the later turns' chance
matches (static frames) are gone. The aud242o `turnDeltas` (ROM = ours + n, per turn) were 9 / 22 / 37 / 57 / 86; with the exact hold they are
**9 / 35 / 61 / 85 / 110**: the per-turn *increment* is now the near-constant 26 / 26 / 24 / 25 (was 13 / 15 / 20 / 29), but the deltas do not collapse to
one constant. The floor's over-hold (about 13 frames at counter 1, 0 at counter 5) was masking a **separate per-turn constant of ~26 frames in the
chained Rollout turns** (no action menu between turns; rol1 listed 9-10 frames stat print -> Rollout print, +3 body end -> hit blink, +6 hold end ->
next Defense Curl, plus the +2 turn-end). That constant is outside the hit hold; modelling it is the prerequisite for landing the hold.

## Other findings

- Everything else in the representative set is unchanged by the change: 21 traces, both scenes, identical matched counts before / after (turn1 / 3 / 4 / 9
  rockslide, turn10 / 12 aerialace, turn5-resolve a / b, turn2 dragonbreath / endeavor, hie1-sitrus off / on 503/823 / 176/1823, obr251 faint off / on,
  turn5 / 6a / 7a rockslide, turn15 fly-strike 229/256, turn13 dragonbreath faint, turn8 bind, turn11 rockslide).
- **Hits on the player have no ROM window here** and the floor is not safely removable: the off108 Rest window's anchor (foe Tackle on the player)
  moves `anchorEndDelta` -3 -> -14 (`tests/ont193SceneOnTails.test.ts`) when the floor goes. The built change therefore limited itself to foe hits.
- **Shape b** (hit followed by an effectiveness / crit print, a faint, a held item) has no ROM window; it stays on the floor in the built change.
- `src/engine/sceneOffPresentation.ts` (retired staged pipeline) has its own `hp: 28`; untouched.
- No census / soak / gate run: production is unchanged at the end of the step.

## Next step (named)

Measure and model the chained-turn constant of Rollout (turn end -> next turn's first action with no menu, ROM vs ours, in the aud242o window and a
non-Rollout chain), then re-apply `bab95ae43` (`git cherry-pick`), re-pin `turnDeltas` to the resulting constant, and extend to hits on the player
(a ROM window of a foe hit with fixed damage, e.g. a foe Seismic Toss) and shape b.

PAPERCUT: no app-only renderer existed, so each lab compare costs ~45 s of oracle time; `hpd1AppOnly.ts` renders the app side in ~13 s. The pngjs-based
hash scripts replace the Pillow ones (no Pillow in the system python).

# hpd2: the chained Rollout turn's constant (source found; the chain fix landed, the hold NOT)

Presentation only. Scene ON (8012) / OFF (8014). Tool: `tools/integration/hpd2Probe.py <scenario> <on|off> <out.json> [frames]` (per-frame `gBattleMainFunc`,
`gBattlescriptCurrInstr`, `gBattleControllerExecFlags`, `gBattleCommunication[0..3]`, `gCurrentActionFuncId`, `gAnimScriptActive`, controller funcs, in a fresh direct mGBA
process; no capture). Window: `tools/battle-lab/aud242o-rollout5-player-on.json` (player Rollout x4+ vs a foe Defense Curl), trace `rol1-rollout5-on`.

## Source of the chained-turn constant

The old ~26 frames per chained turn (hpd1: 26 / 26 / 24 / 25 with the hold) are **8 + 18**:

- **+8 = the locked player's turn transition (landed).** `BattleTurnPassed` -> `HandleTurnActionSelectionState` (`battle_main.c`, the states `TURN_START_RECORD` ..
  `CONFIRMED`): the locked player (`STATUS2_MULTIPLETURNS` / `RECHARGE`) is auto-confirmed (no menu), but the foe's action selection (EmitChooseAction, the AI
  ChooseMove, its confirm states) still runs, 9 frames, then `SetActionsAndBattlersTurnOrder` / `RunTurnActionsFunctions` 3 -> the script's first instruction.
  RAM probe, both scenes: **13 / 13 / 13 / 12** frames from `BattleTurnPassed` to the script start (ON 13/13/13/12 = OFF 13/13/13/12); the box clears 2 frames after
  `BattleTurnPassed`, so the blank box between chained turns is **15 / 15 / 15 / 14** frames vs the menu path's 7 (6 + 1). The app had the menu's handoff
  (`BATTLE_RESOLUTION_NEXT_COMMAND_HANDOFF_FRAMES` 6) for the locked continuation too: `BATTLE_RESOLUTION_LOCKED_CONTINUATION_HANDOFF_FRAMES` = 6 + 8 = 14 is used when the
  pending boundary is the foe's trainer command (the player is the locked one; `factoryRoundBattleOrchestrator.ts`, the `next-command-handoff` phase).
- **+18 = in-turn constants of this particular turn, not chain-specific** (the first turn already drifts the same; ROM turn period 597 / 598 vs the app's 580 now):
  by sound anchors A +6 Defense Curl -> stat-increase (ROM 765..768 script rows before the stat animation, then 77 + 91), B +3 Rollout lead to its first SE, C +2 hit SE -> `SE_EFFECTIVE`,
  D ~+7 post-hit tail / turn-end (hpd1's open "ROM turn-end 8 vs ours 6"). By the RAM script timeline (ROM minus app, per stage): "used" print -> first animation -7, Defense Curl
  body +2 (103 vs 105), animation -> stat animation -3, "rose!" -1, "rose!" -> Rollout print +1, Rollout print -> animation -11, hit hold / turn end +1. Every one of them sits in
  code ROM-calibrated for other shapes (stat change: `docs/issue69-omniboost-off-ground-truth.md`, sc106 / scd112; the plain move lead), so none was changed here.

## What landed, and the numbers

- `rol1-rollout5-on`: **383 -> 459 / 3001** matched (the floor-free hold on top: 321; the hold alone: 261). The aud242o `turnDeltas` 9 / 22 / 37 / 57 / 86 -> **9 / 14 / 21 / 33 / 54**
  (8 per chained turn off), `aud248` residual 2 / 16 / 31 / 51 / 80 -> 2 / 8 / 15 / 27 / 48; remaining increments 5 / 7 / 12 / 21 are the old floor's over-hold (13 at counter 1,
  0 at counter 5), the same masking hpd1 found.
- The 23 traces (hpd1's 21-trace set plus `turn14-fly-miss`, `rol1-rollout5-on`): app frames **bit-identical** before / after (SHA-1 over all frames, `.integration/evidence/hpd2/hashset.ts`),
  except `rol1-rollout5-on`.
- **The floor-free hold (`e01bfd249`, = hpd1's `bab95ae43` + production assertions) is NOT landed again**: with the chain fix the Rollout window is still worse with it (459 -> 321),
  because the per-turn deltas become 9 / 27 / 45 / 61 / 78 (constant increments 18 / 18 / 16 / 17, but a first-turn offset of 9 and an in-turn 18 that no hold fix removes). It is reverted in
  the same commit that adds the chain fix; the implementation stays at `e01bfd249` for the next step.
- Not done (time / disk): hits on the player and effectiveness / crit shapes (goal 3).

## Next step (named)

Model the in-turn constants of the foe stat move + player Rollout turn (A -3 / -6, "used" -> animation -7, Rollout print -> animation -11, hit blink -2, turn end) against the ROM script
timeline (`romseq`-style dump of `hpd2Probe.py` output, `.integration/evidence/hpd2/romseq.py`), then re-apply `e01bfd249` and re-pin `turnDeltas` to the one constant.
