# off121 (S10A timeline fidelity): the Scene OFF `status` command length, and the Scene ON status-animation evidence

Base: master `9d23a17c4` (production src `530600bb1`). Production change: `src/engine/battleResolutionPresentation.ts` only (the
`status` command's Scene OFF timing, `sceneOffStatusFrames`; `BattleStatusTiming` widened to `number`). Scene ON untouched.
Presentation only: no kernel, RNG, damage, turn order or facility change. Direct mGBA only (no shared oracle), explicit lab seed
305419897 in every scenario, every probe job twice in fresh processes: **18 / 18 outputs r1 == r2** (9 scenarios x ON / OFF).

## 1. Results first

### 1a. Scene OFF rule (landed)

In Scene OFF `Cmd_statusanimation` is skipped (HITMARKER_NO_ANIMATIONS, `battle_script_commands.c:5753`): the ROM's statusanimation
run is **1 row, no gAnimScriptActive, no screen change, no controller rows** on every OFF statusanimation in the probes (20 runs:
move-inflicted PSN / PRZ / BRN / SLP, end-turn PSN and BRN ticks, sleep turns, the paralysis "can't move" turn). So nothing is drawn
between a status-data receipt and the print after it. Production's `status` command is projected from `set-battler-status-data`
(BtlController_EmitSetMonData REQUEST_STATUS_BATTLE) and was 32 frames in both scenes.

**Rule (Scene OFF, `sceneOffStatusFrames`):** the command ends where the following print's command starts. Commands start
`instructionExecution + lead` after the anchor with lead 1 for a status-data receipt and for a print (off108), so the command lasts
**delta(print) − delta(status)**. When the status command is the FIRST command after "X used Y!" in the same execution (Rest's
trysetrest), it starts on G + 1 (idle98's anchor), before the ROM status row, and lasts **delta(print) − delta(used) + 1**. Anything
else between the two receipts (none in the census), or no provenance: the 32-frame command stays. Scene detection: the rules
context's `hitMarker & HITMARKER_NO_ANIMATIONS` (set once at battle start, `battle_main.c:3086`).

Every OFF status command in census seeds 0..999 is followed directly (same execution, no receipt in between) by a print.

| Class (source emitter) | ROM (lab scenario) P − S_exec | ROM F − P | kernel delta(print) − delta(status) | OFF frames base → final | residual (final) | census 0..999 OFF |
|---|---|---|---|---|---|---|
| move-inflicted PSN (Toxic, SetMoveEffect), both sides | 2 | 2 | 2 | 32 → 2 | **0** (message on G+51 = ROM F − G, both sides) | 1,228 (1,224 at 2, 4 at 1) |
| move-inflicted PRZ (Thunder Wave) | 2 | 2 | 2 | 32 → 2 | **0** (G+50) | (in the row above) |
| move-inflicted BRN (Will-O-Wisp) | 2 | 2 | 2 | 32 → 2 | **0** (length; F − G = 49) | (in the row above) |
| move-inflicted SLP (Spore), both sides | 2 | 2 | 2 | 32 → 2 | **0** (length; F − G = 48) | (in the row above) |
| sleep turn ("fast asleep", attackcanceler effect 2) | 1 (x3) | 2 | 1 | 32 → 1 | **0** (length) | 1,497 |
| wake up (attackcanceler effect 2) | 2 | 2 | 2 | 32 → 2 | **0** (length) | 552 |
| Rest (trysetrest → `pause B_WAIT_TIME_SHORT` → print) | 33 | 2 | 33 | 32 → **38** (first after "used") | **0** (message on G+39 = ROM F − G) | 507 (466 at 38; 35 wake-up / 5 at 1 / 1 at 33 with Rest's label) |
| faint (cleareffectsonfaint; waits 16 rows on the faint controller, executes on P − 1) | 1 | 2 | 1 | 32 → 1 | **0** (length) | 4,327 |
| item cure (Chesto Berry: moveend → playanimation → BattleScript_Pausex20 32 rows → return → print) | 35 (from moveend's last row) | 2 | 35 | 32 → 35 | **0** (length) | 244 (243 at 35) |
| frozen turn / thaw (attackcanceler effect 2) | not staged | | 1 | 32 → 1 | — | 102 / 22 |
| end-turn PSN / BRN tick, paralysis "can't move" (attackcanceler effect 1) | no status data in the ROM or the kernel | | | no `status` command (unchanged) | 0 change | — |

"length" residual = production status frames − (ROM F − (S_exec + 2)), i.e. the command's own length against the ROM rows when it
starts on its lead-1 row; the absolute start is the preceding command chain's (exact on the off108 pause path: Toxic / Thunder Wave,
G-anchored above, and on Rest). Absolute anchors: production's commands after "X used Y!" now end on F − G − 1 = 50 / 49 / 38 for
Toxic / Thunder Wave / Rest (test). Base: Toxic G+81, Thunder Wave G+80 (+30), Rest G+33 (−6).

### 1b. Scene ON status animations (evidence only; ISSUES-ready draft, NOT implemented)

ROM Scene ON (same probes, r1 == r2): Cmd_statusanimation emits BtlController_EmitStatusAnimation and advances in 1 row; the controller
plays B_ANIM_STATUS_* while gBattleControllerExecFlags stays set, so the next instruction waits:

| Status animation | controller rows | gAnimScriptActive rows | screen changes | where measured (both sides where staged) |
|---|---|---|---|---|
| B_ANIM_STATUS_PSN | **71** | 70 | 26–27 | Toxic (opp + player target), end-turn toxic tick x2 each side |
| B_ANIM_STATUS_PRZ | **39** | 38 | 25 | Thunder Wave, paralysis "can't move" |
| B_ANIM_STATUS_BRN | **39** | 38 | 33 | Will-O-Wisp, end-turn burn tick x2 |
| B_ANIM_STATUS_SLP | **97** | 96 | 90 | Spore (opp + player target), sleep turns x3 each side |

(off108 quoted Paralysis 40 / Toxic 72 as the print run length; it is the 1-row statusanimation + 39 / 71 controller rows.) The first
glyph of the following print lands 2 rows after the print executes, as in Scene OFF (rom-r1.json `runs`).

Draft for ISSUES (Scene ON status animations):
- **Mechanism.** Production projects no command from the kernel's `status-animation` receipt (`battleResolutionPresentation.ts` has no
  case for it; only sprite-order / palette bookkeeping read it). The `set-battler-status-data` receipt's 32-frame `status` command is
  the only stand-in, and it exists only on status-data paths (move-inflicted status, sleep / freeze turns, Rest, faint, cures). So in
  Scene ON: move-inflicted PSN is 32 frames vs the ROM's 1 + 71 rows (−40), PRZ / BRN 32 vs 40 (−8), SLP 32 vs 98 (−66); end-turn
  PSN / BRN ticks, sleep turns and paralysis "can't move" get **no** animation time and no drawn animation at all (−71 / −39 / −97 /
  −39 per occurrence), and the faint / Rest / cure status commands hold 32 frames where the ROM draws nothing from statusanimation
  (faint, Rest: no statusanimation in their scripts).
- **ROM evidence.** `tools/integration/fixtures/off121/receipts/rom-r1.json` (`statusAnimations[].controllerRows`), probes r1 == r2.
- **Exposure (census 0..999, Scene OFF status-data classes, same gameplay in ON):** 1,228 move-inflicted, 1,497 sleep turns, 102 frozen
  turns carry a statusanimation; plus every end-turn PSN / BRN tick, paralysis "can't move", confusion / nightmare / curse
  (status2animation) occurrence (not counted here: no status data, no production command).
- **Fix shape.** Scene ON: project the `status-animation` receipt to a presented command (B_ANIM_STATUS_* via `src/animation/
  statusAnimation.ts`, which already renders Status_Burn for the canonical Fire Punch turn) of the measured controller length, and stop
  using the 32-frame `status` command as the stand-in (the status-data write itself draws nothing: 1 frame, or the delta to the next
  receipt as in Scene OFF). Measure CONFUSION / CURSED / NIGHTMARE / FRZ before landing.

### 1c. Rest (rung 3)

The status command before "X went to sleep!" is now exact in Scene OFF (message on G+39 = the ROM's first glyph, §1a). The attack
receipt AFTER "went to sleep!" + `waitmessage` + the status icon (off108 §1 "Open") is **not landed and not re-measured** here
(time): no pause is emitted there, as before.

## 2. Census 0..999 (base 9d23a17c4 vs final)

- **Scene ON** (liveShareCensus, 10 shards `--seeds=a..b --index-from=a` + hist73Merge): **22 / 22 files byte-identical** (10 r<k>.json,
  10 r<k>.jsonl, merged.json, merged.jsonl): 0 live / fallback status changes, 0 per-command frame changes, battleDigestExcludingFrames
  identical.
- **Scene OFF** (off108Route windows): 37,939 uses compared, **0 command mismatches**; status commands changed 32 → 1 x3,877, 32 → 2
  x1,223, 32 → 38 x466, 32 → 35 x236 (−120,187 − 36,690 + 2,796 + 708 = −153,373 frames inside the windows). One budget-stalled seed (796): base 678 /
  final 680 uses, the common prefix identical (the final tree, shorter, gets further).
- **Scene OFF, every status command** (off121StatusCensus): **8,479 / 8,479**, 0 mismatches (label, following receipts, next command
  type), no stalled seed; per class in §1a; **−235,502 frames**.
- Receipt: `tools/integration/fixtures/off121-live-receipt.json` (off121Receipt.py).

## 3. Pins moved (frames only)

`tests/randomRoundSoak.test.ts`: seven wins (seed 21) frames 38,358 → 37,645, renderCalls 2,728 → 2,697 (same battle 7, turn 3,
seven wins, every other diagnostic identical); M-B (c) full seeds 0 / 1: 17,591 → 17,557, 27,052 → 26,869; vanilla 9,145 → 9,130,
9,205 → 9,033. soak111Decoupling.ts: **decision and canonical logs SAME** vs 9d23a17c4 for full and vanilla seeds 0 / 1; same battle /
turn / endState.

## 4. Test

`tests/off121StatusCommand.test.ts`, 13 tests: the ROM receipts per class (8 rows + sleep / wake / cure + every OFF statusanimation
skipped), the production rule on census seeds 7 / 11 / 12 / 13 per class, the absolute Toxic / Thunder Wave / Rest anchors, Scene ON
stays 32. **Revert experiment** (production file = 9d23a17c4's, in a git-archive copy): **2 / 13 fail** (the two production-rule
tests); the 10 ROM-receipt tests and the Scene ON guard pass.

## 5. Gates

Final code = production src `4642cfcba` (commit e34c93caa; later commits add tools / receipt / doc only).

- Targeted (4 workers, before the soak re-pin): olnd113SceneOffPauses, sc106StatsChangeCommand, battleResolutionPresentation,
  randomRoundSoak, playableAnimationIntegration, factoryRoundBattleOrchestrator: 6 files, 199 passed / 3 failed = exactly the three soak
  pins of §3, re-pinned after (both shards below include every one of these files). `tests/off121StatusCommand.test.ts`: 13 / 13.
- `npm run typecheck`: green. `npm run test:smoke`: **448 / 448**.
- Full suite, two shards, 4 workers, one after the other (nohup, polled): shard 1 **819 files / 7,046 tests passed** (22 / 119 skipped),
  0 failed. Shard 2 **818 files / 6,460 tests passed** (22 / 104 skipped), 0 failed.
- `npm run build`: green.
- `npm run compare:differential -- fight-submenu battle1-postwin-next-prompt presentation-rng-playable-live-bodies-seeded-on --base
  9d23a17c4`: **PASS, 624 / 624 captures byte-identical** (the canonical traces are Scene ON).
- `npm run soak -- --policy vanilla --seeds 0:20 --parallel 5`: **OK 20, CRASH 0, HANG 0** (budget 20).
- `git diff --check`: clean.
- Not serialized (the 80-minute cap left no room): build and differential ran during full-suite shard 1, smoke and the soak during
  shard 2; sibling lanes were also running soaks on the same machine.

## 6. Reproduction (from workspace/)

```
sh tools/integration/off121Run.sh <fresh-out-dir-inside-the-repo>            # archives, staging, 36 probe jobs (r1 == r2), ROM receipt, test
sh tools/integration/off121Run.sh <fresh-out-dir-inside-the-repo> --census   # + ON / OFF census 0..999 both trees + receipt == committed
python3 tools/integration/off121Stage.py <dir>/scenarios
python3 tools/run-mgba-probe.py <o.json> -- <mgba-venv python> tools/integration/idle94Probe.py <scenario> on|off <o.json>
python3 tools/integration/off121Rom.py <probe-dir> tools/integration/fixtures/off121/scenario-index.json <rom.json>
node --experimental-strip-types --no-warnings tools/integration/off121StatusCensus.ts --seeds=A..B --scene=off --out=<f.jsonl>
python3 tools/integration/off121CensusDelta.py <on-base> <on-final> <off-base> <off-final> <out.json>
python3 tools/integration/off121Receipt.py <out-dir> <final-src-tree> <out.json>
npx vitest run tests/off121StatusCommand.test.ts
```
