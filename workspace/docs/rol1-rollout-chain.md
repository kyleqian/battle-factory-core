# rol1: why the five-turn Rollout window drifts per counter (diagnosis; no production change)

Scene ON, presentation only. Window: lab `tools/battle-lab/aud242o-rollout5-player-on.json`, stage `aud242o-rollout5-player-on`, trace
`tools/compare/traces/rol1-rollout5-on.json` (frames 0..3000, `npm run compare -- <trace> <out> --summary`; evidence under
`.integration/evidence/rol1/`, hash-aligned with `hash.mjs` / `traj.py` / `win.py` there). Test `tests/rol1RolloutChain.test.ts`.

## Result

**The cause is not a Rollout body length.** The live body (`liveMoveAnimation.ts` case 205: 167 / 167 / 161 / 153 / 145 rows) shrinks
with the counter exactly as the ROM's does (HEADBUTT -> MEGA_KICK2 = 89 / 89 / 83 / 75 / 67 in the ROM, the same deltas 0 / 0 / 6 / 14 / 22 in
the model; `AnimTask_Rollout` length 32 for counter 1, `48 - 8c` after; `Move_ROLLOUT` = `AnimTask_Rollout`, waitforvisualfinish, then
`ShakeTargetBasedOnMovePowerOrDmg` + hit splat + `SE_M_MEGA_KICK2` + a 66-row tail, `data/battle_anim_scripts.s:3235`). Inside every turn
the offset is constant through the body (pixel-exact: counter 3, ROM frame = app frame + 44 for app 1589..1680, 92 / 92 frames;
Defense Curl animation at +35 for app 1338..1433, 96 / 96, and at +55 for app 1915..2010, 96 / 96).

**The growing term is the post-hit hold.** After the hit the ROM's wait grows with the target's HP drain; the model's `hp` command is
`max(28, bar frames + 1)` (`HP_TIMING`, `battleResolutionPresentation.ts:1608`; `battleResolutionCommandDuration` case `hp`), which is flat
for the small Rollout damages of counters 1..4 and only grows at counter 5.

## Measurements (ROM = Scene ON oracle; "ROM - ours" = ROM frame minus app frame of the same visible event)

Offsets of the repeating events (hash alignment, unique frames, `runs.py`): Defense Curl animation +6 (pre-segment) / +20 / +35 / +55 for the
turns of counters 1 / 2 / 3 / 4; Rollout text +16 / +29 / +44 / +64; hit blink (healthbox + target) start +19 / +32 / +47 / +67 / +96 (counters
1..5); HP drain start +19 / +32 / +47 / +69 / +94. Turn-over-turn increments: **13 / 15 / 20 / 29** (the sound window's +9 / +22 / +37 / +57 / +86).

| counter | blink -> HP-bar start | HP-bar start -> text clear, ROM | same, app | ROM - app of that hold |
|---|---|---|---|---|
| 1 | 35 | 23 | 36 | -13 |
| 2 | 35 | 24 | 35 | -11 |
| 3 | 35 | 30 | 36 | -6 |
| 4 | 35 / 37 | 37 | 35 | +2 |
| 5 | 35 | >= 41 (still draining at frame 3000) | 47 | |

Per-turn drift growth relative to counter 1 = (ROM - app hold) relative to counter 1: **0 / 2 / 7 / 15** vs the measured **0 / 2 / 7 / 16** (+-1).
The remaining per-turn constant (13 at counter 1: the 9-10 frames between the Defense Curl stat print and the Rollout print, the +3 between
the body end and the hit blink, the +6 between the hold's end and the next Defense Curl) is the same in every turn.

ROM side (the sound probe fixture): the turn period `stat SE -> stat SE` is constant, 597 / 598 / 597 / 598, because stat SE -> HEADBUTT
(220) and MEGA_KICK2 -> SE_EFFECTIVE (67) are fixed and the post-MEGA_KICK2 span grows by 0 / 2 / 7 / 16 (287 / 289 / 294 / 303) as the body
shrinks. The model's turn shrinks with the body (583 / 583 / 577 / 569 / 561 in the app), so ROM - app grows by the body shrink plus the
unmodelled hold growth; the drift is that shrink uncompensated.

Model, from the HP rows: the app's hold from the drain start is `max(36, bar + 9)` (hp command 28-floor + 8 following rows; counter 5's bar
is 38 frames -> 47); the ROM's is about `bar + 15` with no floor. The 28 floor is the ordinary hit chain's, and lsd194 / msg175 already
recorded it as an over-hold for small damages ("28 frames vs the ROM's 10-row wait", `docs/lsd194-print-floor-and-drain.md` s2 / s5); the
Rollout window is the first ON window where the damage is spread over 8..38 bar frames in one trace.

Damage rolls differ between the app and the ROM here (bars end at 14 / 15 px after counter 4), so the per-turn offset cannot be made
exactly constant in the hold, and counters 4 / 5 compare different damages; the +-1 / 2 in the table is that.

## Scene OFF

The body length is looked up only on the Scene ON live path (`liveMoveAnimationDuration`); OFF has no Rollout body, so its turn length does
not depend on the counter, except through the same `hp` command (`max(28, bar + 1)`), which is identical in both scenes.

## Why no fix here

The floor is shared by every ordinary hit in both scenes; removing it moves pins across the suite and needs a replacement rule (the
ROM hold is bar + ~14 rows after `healthbarupdate`, kernel `instructionExecution` rows as in lsd194's seeded drain), which needs ROM windows
over several moves with known (not rolled) damages. Narrowing the change to Rollout would be a fitted special case. Not attempted.
No production file changed, so gameplay, RNG, damage, turn order and facility state are unchanged by construction (census seeds 0..99 and the
soak were not re-run: there is no code delta to compare).

## Next step (named)

Replace the ordinary-hit `hp` floor by the source rule: the `hp` command lasts the bar frames + 1, followed by the script rows through
the next print (as `hpPrintTailTiming` already does for `datahpupdate; printfromtable; waitmessage`), validated against ROM windows of
ordinary hits with several damages (e.g. this trace's counters 1..4 and a Seismic Toss series with chosen damage); then re-pin the aud242o
five-turn `turnDeltas` (9 / 22 / 37 / 57 / 86 should become one constant) and the aud248 per-row residual list.

PAPERCUT: no Pillow in the system python (the hie2b `offs.py` / `shift.py` hash scripts do not run here), ~10 min; pngjs-based `hash.mjs` replaced it.
