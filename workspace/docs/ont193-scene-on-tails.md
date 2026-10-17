# ont193 -- Scene ON script tails (ISSUES #167 ON -3..-6) and the Focus Punch pre-pass menu-SE wait (ISSUES #139 ON +2)

Lane: Scene ON playable-animation integration; oracle battle-scene-on. Presentation-only: no gameplay, RNG, damage, turn-order or facility change.
Base master `42695ae16`. Commits: `6cf7dab1c` (B), `423163476` (A), `da8c5d3ed` (re-pins + census tooling), then the test/doc commit that carries this file.
Receipts: `tools/integration/fixtures/ont193/`. Tools: `ont193Census.{ts,sh}`, `ont193CensusDelta.py`, `ont193FocusPunchResiduals.ts`,
`ont193FocusPunchWindow.ts`, `ont193RouteWindow.ts`, `ont193DenseWindows.py`. Test: `tests/ont193SceneOnTails.test.ts`.

## 1. Rule A -- the Scene ON script tail (btl188, ISSUES #167)

A Scene ON live no-hit body (stat / protect / status `move-animation` with `animation`) used to end on its own post rows. In the ROM the script
keeps running after the `waitanimation` release row (the held last body frame stays on screen) until the next receipt. Production now presents
that held last body row for

    tailRows   = (Δ(N) - Δ(attack)) + 1 + (ROM release row - body end)        // moveAnimationScriptTailTiming, source-derived kernel provenance
    tail frames = max(0, tailRows + trail - post)                               // liveMoveScriptTailFrames

`N` is the next animation / message emit after the attackanimation, Δ is `instructionExecution`. `ROM release - body end` is the adapter's trail
data (`LIVE_MOVE_POST_ROW_SIDES`, the idle94 trail table), not an assumed 0: Sand-Attack is not in the post-row set and its release is +2 after the body end.
Masked-pre moves (pre = 0, e.g. Double Team, whose window owns the banner) and unknown trails give a 0-frame tail. Scene OFF carries no tail.

Observed tail frames: Bulk Up 4, Protect 3, Detect 3, Sand-Attack 6 (also Acid Armor 3, Tickle 5 -- source-derived only).

## 2. Rule B -- Focus Punch pre-pass launch (fpo187, ISSUES #139)

E (empty box) -> tightening glyph = 125 + animWait. `IsBattleSEPlaying` gates the BattleAnimation launch and the menu SE_SELECT lasts 10 frames,
so animWait = 2 (`FOCUS_PUNCH_PRE_PASS_MENU_SE_LAUNCH_WAIT_FRAMES`) only on the first pre-pass of a turn whose player decision was a Fight-menu move;
0 on a voluntary-switch turn and on later pre-passes. Scene OFF is unchanged. **The Bag/item path is not reachable in Factory (no Bag), so it is not modelled.**

## 3. Acceptance 1 -- btl188Rows.ts and trn176Predict.ts --scene=on, base 42695ae16 -> final

ROM-only anchors (`btl188-rows-{base,final}.txt`: formula `(n-a)+1+(release-bodyEnd)` = the "short" before the change, 0 after):

| row | short before | short after | body rows before -> after |
|---|---|---|---|
| Bulk Up | 4 | 0 | 113 -> 117 |
| Protect | 3 | 0 | 128 -> 131 |
| Detect | 3 | 0 | 115 -> 118 |
| Sand-Attack | 6 | 0 | 61 -> 67 |
| Double Team | 5 | 5 | 239 -> 239 (window-owned, left alone) |

`trn176Predict.ts --scene=on` (`trn176-{on,off}-{base,final}.txt`, `trn176-start-anchor-table.md`):

| ON row | start Δ before | start Δ after | anchor-end Δ before | anchor-end Δ after |
|---|---|---|---|---|
| Bulk Up | -5 | **-1** | -4 | 0 |
| Sand-Attack | -6 | 0 | -6 | 0 |
| Protect | -3 | 0 | -3 | 0 |
| Detect | -3 | 0 | -3 | 0 |
| Double Team | -5 | -5 | -5 | -5 |
| Rest | -22 | -22 | -3 | -3 |
| Toxic / Dig / Razor Wind / Solar Beam / Snore / Dynamic Punch | unchanged | unchanged | unchanged | unchanged |

Bulk Up's start Δ stays -1 (target was 0): the same -1 is in Scene OFF (`trn176-off-*` columns unchanged), a pre-existing one-row offset of the Bulk Up
body start that is not part of the tail; the anchor-end Δ is 0. OFF columns are byte-identical base vs final.

## 4. Acceptance 2 -- fpo187 / fpc177 cards (`fpo-residuals-{base,final}.txt`, `fpo-window-final.txt`)

| card | tightening resid before -> after (ON) | used-print resid after |
|---|---|---|
| a-switch ON | 2 -> **0** | -47 (was -45) |
| b1-two-users ON (both pre-passes) | 0,2 -> **0,0** | 2 -> **0** |
| b2-hit-scratch / statup-agility / thunder-wave / r4 statdown-sand-attack ON | 0 -> 0 | n/a |
| every OFF card | unchanged, 0 | a-switch OFF -32 unchanged |

`docs/fpc180-focus-punch-live.md` §1 tool re-run (`fpc180-compare-after.{txt,json}`): OFF cards unchanged. The remaining a-switch used-print residual
(-32 OFF / -47 ON) is the voluntary switch-in timing, out of scope; ON moved from -45 to -47 only because the used print follows the (now correct) tightening glyph.

## 5. Acceptance 3 -- dense Scene ON windows (`dense-windows.json`, `fpo-window-final.txt`)

ROM per-frame screen sha (`tmr136Probe.py`, direct mGBA, battle-scene-on, the off108 lab scenarios) vs production per-row `renderBattleResolutionLiveView`
sha of the same move in an ordinary census battle, in row coordinate c (c0 = used print's last glyph row). Window = last screen change in the body -> held tail
-> the next command's first screen change. Production is byte-identical across the held rows (the tail is a held screen) in every window.

| move | ROM last body change / next change / held | base next (resid) | final next (resid) | final held rows | last-body-change resid (base = final) |
|---|---|---|---|---|---|
| Bulk Up | c113 / c124 / 11 | c120 (-4) | c124 (**0**) | 13 | -2 |
| Protect | c122 / c132 / 10 | c129 (-3) | c132 (**0**) | 12 | -2 |
| Detect | c115 / c119 / 4 | c116 (-3) | c119 (**0**) | 6 | -2 |
| Sand-Attack | c61 / c76 / 15 | c70 (-6) | c76 (**0**) | 16 | -1 |

The tail moves the next screen change onto the ROM row in all four (and the ROM held span is byte-identical too). Not done: whole-screen pixel equality
production vs ROM on identical scenarios (no per-scenario production renderer exists for the off108 lab battles; the lab and the census battles differ in
species/background). The intra-body last-change offset (-1..-2 rows, identical in base and final) is a pre-existing body-render offset, not caused by this step; it makes
the production held run 2 rows longer than the ROM's for Bulk Up / Protect / Detect.

fpo187 window E -> tightening glyph (`fpo-window-final.txt`, ROM state probes -- these cards have no per-frame pixels):

| card | pre-pass | ROM E | launch L | E->L | ROM glyph | E->glyph | production glyph | resid |
|---|---|---|---|---|---|---|---|---|
| a-switch ON | 1 | 312 | 314 | 2 | 437 | 125 | 437 | 0 |
| b1-two-users ON | 1 (Fight menu) | 72 | 76 | 4 | 199 | 127 | 199 | 0 |
| b1-two-users ON | 2 | 299 | 301 | 2 | 424 | 125 | 424 | 0 |
| b2-hit-scratch ON | 1 (Fight menu) | 72 | 76 | 4 | 199 | 127 | 199 | 0 |

## 6. Acceptance 5 -- census seeds 0..999, both scenes, base vs final (`census-{on,off}.json`)

Kernel event digests identical in 1000/1000 battles in both scenes (0 digest, 0 error mismatches); command type sequences unchanged; **0 unattributed changed commands**.
Every changed command is a Scene ON no-hit `move-animation` with `scriptTailRows`, or (OFF, 1 command: move 144) a 0-frame metadata-only `scriptTailRows`.

| scene | commands | unchanged | changed | battles changed | pre-pass tightening changes |
|---|---|---|---|---|---|
| ON | 320378 | 314548 | 5830 (11839 frames) | 877 | 0 |
| OFF | 316756 | 316755 | 1 (0 frames) | 1 | 0 |

ON classes (5830): ROM-measured moves 799 commands / 2884 frames (Protect 549 x3, Sand-Attack 146 x6, Detect 55 x3, Bulk Up 49 x4); source-derived only, moved,
2567 commands / 8955 frames across 41 moves (per-move frame deltas 2..9; mostly 3 or 4; e.g. 14, 97, 108, 133, 203, 266 = 3; 201, 219, 349 = 4; 271, 321 = 5; 281 = 9; Acid Armor 3, Tickle 5 are the pinned sc106 routes); source-derived
tail but 0 frames, 2464 commands across 24 moves (Double Team 104 x893, 240, 184, 113, 347, 241 and others). Three battles ended on the frame budget in both arms (budgetStalled 3, identical).

## 7. Acceptance 6 -- differential (`differential.txt`)

`npm run compare:differential -- fight-submenu battle1-postwin-next-prompt presentation-rng-playable-live-bodies-seeded-on --base 42695ae16`:
fight-submenu 235/235, battle1-postwin-next-prompt 216/216, presentation-rng-playable-live-bodies-seeded-on 190/190 byte-identical (641 captures; PASS, no difference to attribute).

## 8. Acceptance 7 -- re-pins (moved frames only; commit `da8c5d3ed` and `6cf7dab1c`)

- sc106 seed 0 (Acid Armor): first anchor +3; route +3x3 (Acid Armor) +4 (move 219) -1 dismissal parity. Route totals are cumulative across the no-hit bodies.
- sc106 seed 3 (Sand-Attack): anchors +6 x (i+1), the ROM-measured tail per crossed body.
- sc106 seed 13 (Tickle): first anchor +5; route +2x5 (Tickle) +2x3 (move 148).
- sc106 seed 10 (Double Team route): +3x3 (Barrier 112 x3); masked Double Team carries no tail.
- iu120 / land97 Bulk Up rows 113 -> 117 (the 4 held tail rows).
- trn178 / trn181 Scene ON residuals Bulk Up -4, Sand-Attack -6, Protect -3 -> 0 (Rest -3 stays).
- fpc180: a-switch ON glyph deltas [0,2,2,2] -> [0,0,0,0] (ROM 437/543/625); b1 ON 426/536 -> 424/534; OFF cards and b2 ON unchanged.

## 9. Residuals / out of scope

- Bulk Up ON start Δ -1 (same in OFF); intra-body last-change offset -1..-2 rows (pre-existing).
- Double Team's window tail (-5): the live window owns the banner; Rest (-3): synthetic route. Both left alone.
- 41 moves moved by source-derived tails with no ROM rows (list in `census-on.json` `byMove`; ROM-measured: Protect, Detect, Sand-Attack, Bulk Up only); 24 moves carry a tail that is 0 frames
  (masked pre or unknown trail): they need a ROM scenario before they can move.
- OFF: move 144 carries `scriptTailRows` metadata at 0 frames (digest-neutral).
- Pre-pass tightening changes appear in no census battle (0); covered by the cards only. a-switch used-print residual (-32 OFF / -47 ON): voluntary switch-in timing.
- The Bag/item pre-pass path is unreachable in Factory (no Bag).
- msg189's 24-frame print floor, Leech Seed drain, Rest's synthetic route, voluntary switch-in timing: out of scope.

## 10. Verification

Tested production tree: `git rev-parse HEAD:workspace/src` = `9e7ac718f43c51f87a2f933d189163077ba7c7cd` (code commit `423163476`; later commits touch tests, tools, fixtures and docs only). Test/receipt commit `fab170e51`.
- `npm run typecheck`: pass (after the tools-importing tests were added). `npm run test:smoke`: 8 files / 448 tests pass. `npm run build`: pass. `git diff --check`: clean.
- Full suite as 10 foreground `vitest --shard=i/10` chunks (`--pool=forks --testTimeout=20000`, 2 workers), run while the re-pins below were still being made: shards 1-5, 7 and 9 had failures
  (all attributed to the script tail / the 0-frame `scriptTailRows` metadata and re-pinned in `fab170e51`: iu120 helper tail rows, Wall, tmr136, battleTurnPortability, sub157, the sgl138 receipt's ON route totals); shards 6, 8, 10 were clean.
- Failing files re-run alone after the re-pins: liveGlow + battleTurnPortability (pass), the 13 shard 1-5 files (10 pass, 3 re-pinned and then pass: tmr136, Random2R5, Wall), sub157, sgl138 (pass).
- NOT done: one single end-to-end green `npm test` over the final tree. A re-run of all 73 files that import `tests/helpers/iu120Rows.ts` timed out at 560 s with 43 files passed and 0 failed; the rest (apart from Wall and sgl138, which passed alone) were not re-run before the 170-minute cap.
