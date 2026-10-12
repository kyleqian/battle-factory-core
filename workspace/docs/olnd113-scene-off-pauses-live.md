# olnd113 (S10A timeline fidelity, ISSUES #167 land): the Scene OFF no-hit pause and the miss / fail hold, live

Base: master `bce86a4b0` (production src `94a7f48b3`, carries sc106 + soak111). Production change: `src/engine/battleResolutionPresentation.ts`
only = off108's banked patch (`tools/integration/fixtures/off108/off108-scene-off-pauses.diff`, `patch -p1` from the repo top, applied
cleanly with no sc106 conflict) + **lead(STATS_CHANGE) = 1**. Final production src: `b46ad30e2`. Presentation only: no kernel, RNG,
damage, turn order or facility change.

## 1. Results first

| Question | Answer | Evidence |
|---|---|---|
| What landed | (b) Scene OFF: a `SCENE_OFF_ATTACK_PAUSE` receipt without a hit receipt pushes a plain `move-animation` (no live animation) of P = Δ(N) + lead(N) − D_between frames (`sceneOffNoHitPauseFrames`). (c) both scenes: a STRINGID_USEDMOVE whose first presented receipt is a print with `pause B_WAIT_TIME_SHORT` within the three straight-line source instructions before it holds Δ(print) + 1 after its 24-frame floor (`sourcePauseUsedMoveHoldFrames`) | `battleResolutionPresentation.ts` |
| lead(STATS_CHANGE) | **1** (off108 banked 0). stat101 §1b: rel 0 = A = the gAnimScriptActive rise = the row playanimation / playstatchangeanimation executes, which is off108's "activation row" (Bulk Up G+40, Double Team / Sand-Attack G+41). stat102's frame mapping, which the renderer uses (`statsChangeRow(params, age + 1)`), puts the sc106 command's **age 0 on rel 1**. So the pause must end on A + 1. With it, the stats-change command covers rel 1 .. 76 and the next command starts on rel 77, the ROM's next instruction (sc106's δ = 0 assumption holds in OFF). Lead 0 would start the banner one row early and the following command on rel 76 | `olnd113Verify.py`, test "joint target" |
| Rule check on the landed tree (off108's 16 classes) | **OFF 16 / 16 at 0 residual** against the lead-adjusted anchor (off108's romAnchor + 1 for the three STATS_CHANGE classes, unchanged for the other 13). Against off108's unadjusted anchor: 13 / 16 at 0 and +1 on Bulk Up / Double Team / Sand-Attack, which is the lead decision. **ON 5 / 5 pause-path classes at 0** (Snore ButItFailed, Dynamic Punch miss on both sides, Tackle vs Protect / Detect). Base residuals are unchanged from off108's (−36 .. −48): sc106's command sits at or after N, so it does not move N's start | runner, `olnd113-verify.json` |
| **Joint target** (Scene OFF, first stat message's first glyph; ROM G+121 Bulk Up / G+119 Double Team, Sand-Attack) | **NOT 0: the landed tree starts that message on G+119 / G+118 / G+118 = −2 / −1 / −1.** The pause is exact: the stats-change command starts on A + 1 on every route. All of the residual comes AFTER the 76-frame command: the print executes on rel 77 and its glyph lands on rel 78, but production starts the message on rel 77 (−1, both scenes, the sc106 post-command δ on the print path). Bulk Up (playstatchangeanimation) also runs `setstatchanger` on rel 77, so its stat write is on rel 78; production's `stat` command starts on rel 77 and its 2 frames leave the message without the print → glyph lead (−1 more). **No single lead gives 0 on all three:** lead 2 → 0 / 0 / −1, lead 3 → +1 / +1 / 0, and either one moves the banner off its ROM rows. Fix shape (follow-up, both scenes, sc106 territory): after a presented stats-change command, start the next presented receipt on rel 77 + (Δ(next) − Δ(STATS_CHANGE) − 1) + lead(next) | runner `jointTarget`, test pins −2 / −1 / −1 |
| sc106's live-Double-Team exemption | Stays **Scene-ON-only**. `statsChangePresented` keys on a preceding `move-animation` that HAS a live `animation` (moveId 104). The OFF pause command has none, so the OFF stats-change command after an OFF Double Team pause is still emitted. Pinned: OFF seed 2 has pause → stats-change; ON seed 2 has a live DT body and no stats-change command | test "sc106's live-Double-Team exemption ..." |
| Runner (`olnd113Run.sh`, fresh dir) | **ROM receipts SAME**: scenarios 15 + index, probes 30 / 30 r1 == r2 and 60 / 60 == off108's sha256, rom-r1 SAME, r2 == r1. **classes.json / .tsv SAME** (computed from the base bce86a4b0 routes: sc106 does not move a class signature). Moved by design (not compared to off108's receipts): routes (production changed), verify-off (13 / 16 vs off108's anchor, explained above), verify-on SAME numbers (5 / 5) | section 3 |
| Pins moved | **7 tests in 3 files**, all timing, each explained by the pauses / holds its route crosses (section 4). Soak: **frames only**. soak111's decision and canonical logs are identical to bce86a4b0's for full and vanilla seeds 0 / 1. The ISSUES #89 pin (seed 226) did not move | `fixtures/olnd113-pins.json` |
| Test | `tests/olnd113SceneOffPauses.test.ts`, 27 tests: the per-class rule on production census routes (11 no-hit classes, P and N's start), the joint target as measured, the DT exemption, the hold in BOTH scenes for the 5 hold classes, a Dynamic Punch miss on each side (seeds 56 / 7), Scene ON no-hit bodies gain no pause. **Revert experiments**: production reverted to bce86a4b0 → 25 / 27 fail (the table-shape check and the ON guard pass); lead(STATS_CHANGE) back to 0 → exactly 4 fail (the 3 stat classes + the joint target) | section 5 |
| Census 0..999 (base bce86a4b0 vs final) | **Scene ON** (liveShareCensus, 10 shards + hist73Merge): **0 status changes, 0 per-command frame changes** over 27,513 compared commands. Live commands 26,245 / 26,245, live frames 3,932,860 / 3,932,860. battleDigestExcludingFrames is identical on 7 / 10 shards. The other 3 each hold one battle that stalls at the census FRAME_BUDGET in both trees (seeds 434 / 796 / 881). The final tree's commands there are a **proven prefix** of the base's (250 / 195 / 286 of 265 / 214 / 292). That accounts for the −40 denominator commands. Frames +240,834 (14,946,997 → 15,187,831), the same as off108's patched-copy ON delta. **Scene OFF** (off108Route): **0 command mismatches** once the change's own commands are removed. 3 use-key mismatches = the same 3 budget seeds, final a proven prefix (656 / 678 / 420 uses of 710 / 740 / 432). **Pauses: 9,717 inserted, +407,249 frames = off108's 9,717 / +404,165 + 3,084 = exactly one frame per STATS_CHANGE-next pause (the lead)**. Per N: message 5,153 / +220,475, STATS_CHANGE 3,084 / +120,779 (off108 117,695 + 3,084), status data 805 / +37,338, HP bar 621 / +24,821, beyond the route's window 54 / +3,836: every count and every other class's frames equal off108's. **Holds: 7,382 / +274,874** vs off108's 7,386 / +275,018. The −4 / −144 (= 4 × 36) are all BattleScript_MoveMissed holds in the budget-stalled tails. off108's base (no sc106) stalled later, so its compared prefixes were 660 / 682 / 421 uses vs 656 / 678 / 420 here. The 9 uses only off108 compared contain exactly 4 MoveMissed uses (434: 3, 796: 1, 881: 0; read from this census's base routes). Uses outside the 3 seeds: 36,185 in both censuses | receipt `fixtures/olnd113-live-receipt.json` |

## 2. Follow-ups (not in scope, documented)

- **Post-stats-change δ** (both scenes): −1 on the print path, −2 on playstatchangeanimation paths. Fix shape in section 1, joint target row.
- **Rest** (off108 §1): no pause, because its attack receipt follows a held message and the status icon.
- **The OFF `status` command length** (off108 §2 caveat). With the pause the Toxic / Thunder Wave status command START is exact, but the
  following message is +30 late (32-frame STATUS_TIMING vs the ROM's skipped `Cmd_statusanimation`).
- **Unmeasured next receipts** (no pause there): sprite-visibility, stat-stage-change (Curse / Agility-like paths), nothing next.

## 3. Runner

`sh tools/integration/olnd113Run.sh <fresh-out-dir-inside-the-repo> [--census] [<final-rev>]` (from workspace/). It builds git-archive copies of
bce86a4b0 and <final-rev> (default HEAD), then runs the off108 pipeline. ROM receipts are compared to off108's committed receipts; base
classes are compared to off108's table. `olnd113Verify.py` does the lead-adjusted rule check and the joint target. With `--census` it adds
liveShareCensus (ON) + off108Route (OFF) 0..999 in both copies, `hist73Merge.py`, `off108CensusDelta.py`, and `olnd113Receipt.py`, whose
output is compared to the committed receipt.

Run on this branch (`.integration/validation/olnd113/run2`, `--census`, final = 5a3cecce5, src b46ad30e2), 16:45 → 17:00:

```
SAME scenarios (15) / SAME scenario-index
probes: 30 / 30 r1 == r2; probe outputs == off108 committed sha256: 60 / 60
SAME rom-r1.json / SAME rom r2 == r1
off108Classes: 17 classes, rule check 16 / 16; SAME table/classes.json (base bce86a4b0 routes); SAME table/classes.tsv
off108Verify OFF {"checked": 16, "patchedZeroResidual": 13}   (the 3 STATS_CHANGE classes at +1 = the lead decision)
off108Verify ON  {"checked": 16, "patchedZeroResidual": 5}
olnd113Verify    {"off": [16, 16], "on": [5, 5], "joint": {"339": [-2], "104": [-1], "28": [-1]}}
olnd113Run: ALL SAME
```

The committed receipt `tools/integration/fixtures/olnd113-live-receipt.json` was generated from that run by `olnd113Receipt.py`, keyed on the
final production src tree. A no-census run (`run1`, 16:30) printed the same lines. Columns that move vs off108's receipts, and why: routes
(the production change, plus sc106's stats-change command on the base); verify-off 13 / 16 (the lead); verify-on's base column (bce86a4b0
instead of 52c181d54: residuals identical, −36 / −37).

## 4. Pins (full suite on 8aed73113, two shards, 4 workers: shard 1 1 failed / 6,991 passed; shard 2 6 failed / 6,424 passed)

| File / test | Move | Why exactly |
|---|---|---|
| `factoryRoundBattleOrchestrator.test.ts` ISSUES #95 (presence pin) | "no move-animation command" → exactly 2 no-hit pause commands: MOVE_HAIL (`BattleScript_MoveWeatherChange`) 40, MOVE_HARDEN (`BattleScript_StatUpAttackAnim`) 39 | Each pause is at its own SCENE_OFF_ATTACK_PAUSE receipt before the weather loop's execution restart, has no live animation, and is never the hit path's 140. The guarded invariant (nothing pairs with the weather loop's hit) is kept |
| `sc106StatsChangeCommand.test.ts` Acid Armor (seed 0) | route total 6,633 → 6,669 | + one STRINGID_BUTITFAILED hold (36, frame 4752). The anchor is before it and unmoved |
| `sc106StatsChangeCommand.test.ts` Sand-Attack (seed 3) | anchors +0 / 36 / 72 / 108 / 144 / 144 | 36-frame holds at 812 (ITDOESNTAFFECT), 1257 (ATTACKMISSED), 1705, 2150 (3116 is after the last anchor) |
| `sc106StatsChangeCommand.test.ts` Tickle (seed 13) | stats-change 1929 → 2008, stat 2005 → 2084, total 9,013 → 9,091 | + two ATTACKMISSED holds, 39 (frame 1140) + 40 (frame 1625) = 79. The total is 79 − 1: the replay presses A on even frames in awaiting-message-dismiss, and the per-command delta drops 79 → 78 right after the button message at base 5218 / final 5297 |
| `randomRoundSoak.test.ts` seven wins (seed 21) | frames 37,569 → 38,358, renderCalls 2,679 → 2,727 | Same battle 7, turn 3, seven wins, every other diagnostic identical |
| `randomRoundSoak.test.ts` M-B (c) full seeds 0 / 1 | 16,321 → 17,591; 25,321 → 27,061 | Same battle / turn / endState. Decision + canonical logs SAME vs bce86a4b0 (`soak111Decoupling.ts`) |
| `randomRoundSoak.test.ts` M-B (c) vanilla seeds 0 / 1 | 8,683 → 9,143; 8,670 → 9,205 | Same, logs SAME |

`tools/integration/olnd113RouteHolds.ts` lists, for a production route, every inserted pause / hold and its start frame. That gives the sc106
route attributions above. The soak totals are not reconciled hold by hold: the soak's press stream re-times message dismissals. Their
trajectory check is the log identity.

## 5. Gates

GATES_PLACEHOLDER

## 6. Reproduction (from workspace/)

```
sh tools/integration/olnd113Run.sh <fresh-out-dir-inside-the-repo>            # ROM receipts + routes + rule check + joint target
sh tools/integration/olnd113Run.sh <fresh-out-dir-inside-the-repo> --census   # + census 0..999 both scenes + receipt == committed
npx vitest run tests/olnd113SceneOffPauses.test.ts                             # 27 tests
node --experimental-strip-types --no-warnings tools/integration/olnd113RouteHolds.ts --seed=3 --route=3,3,3,3,3,3,3,3 --scene=on
python3 tools/integration/olnd113Verify.py <rom-r1.json> <verify-off.json> <verify-on.json> <final-off-route-dir> <out.json>
python3 tools/integration/olnd113Receipt.py <out-dir> <final-sha> <out.json>
```
