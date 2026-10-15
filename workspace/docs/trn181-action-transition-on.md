# trn181 — the action-transition pause in Scene ON (ISSUES #167 (a'), Scene ON half)

Presentation only. Kernel events, damage, RNG, AI, turn order and facility state are unchanged: census kernel-event digests identical for
all 1,000 battles in both scenes. Rule and ROM evidence: `docs/trn176-action-transition.md`; Scene OFF half: `docs/trn178-action-transition-live.md`.
Base `5cf23a253` (src tree below); production commit `9b08b6c47`. Everything after it is tests, tools, fixtures and this doc (see Identities).

## What changed

`sceneOffActionTransitionPauseFrames` is now `actionTransitionPauseFrames` (`src/engine/battleResolutionPresentation.ts`) and its call site
is no longer gated on `HITMARKER_NO_ANIMATIONS`: one rule, one function, both scenes. The pause is the same draw-nothing
`move-animation` (`timing: { minimumFrames: P }`, P = d + 6 + u − frames presented after the anchor's command) pushed before an action's
first `B_SCR_OP_MOVEEND` sprite-visibility receipt, under the same guard (only MoveEnd receipts, then the next action's USEDMOVE at a
restarted count; the anchor is not the used print / EMPTYSTRING3; a print anchor is followed by `waitmessage B_WAIT_TIME_LONG`; a command
after the anchor with no timing or a hold, or P ≤ 0, means no pause). Wish keeps msg175's pause in OFF (49) and, in ON, gets none from this
rule (its anchor is the used print; the ON rows stay `message 18, move-animation 274 (live body), sprite-visibility 1`).

Scene ON presents live bodies and other commands that OFF does not, so the ON pause carries a marker, `actionTransition: true`
(absent in OFF: the OFF command stream is byte-identical to base), which three consumers honour so that "draws nothing" stays true
for ON (a plain `move-animation` is treated as a body there):

| Consumer | Exemption |
|---|---|
| `applyLiveSemiInvulnerableCommand` (render) | the pause keeps a hidden Dig / Fly / Bounce battler hidden (a real body or sprite-visibility command still clears it) |
| `ordinaryRest` (render) | a marked pause is not a body, so it does not count as "a body ran" for the idle-rest rule |
| `factoryRoundBattleOrchestrator` palette / allocator invalidation | a marked pause does not invalidate the lent palette / sprite-allocator / sprite-order state |

## Acceptance

| # | Check | Result |
|---|---|---|
| 1 | `trn176Predict.ts --scene=on` + ON before/after table (`trn181Receipt.ts`; `fixtures/trn181/receipt.{txt,json}`) | **12 / 12 comparable rows land exactly on the predicted residual** (= the anchor-end error); Thunder Wave skipped (the next action opens with no USEDMOVE print) |
| 2 | Dense Scene ON ROM windows through production (`trn181RomFrames.py`, `trn181DenseCompare.ts`; `fixtures/trn181/{rom,dense}/`) | Bulk Up, Scratch: the pause rows 0 px (next section); Toxic reported with its pre-existing opponent x2 mismatch |
| 3 | Tier-1 `tests/trn181ActionTransitionOn.test.ts` (4) + `tests/trn178ActionTransition.test.ts` (6) | ON pauses Bulk Up 12, Scratch 13, Rest 15, Toxic 16 (and Sand-Attack / Protect 12, Double-Edge 14); OFF unchanged; controls (Toxic icon anchor, Wish ON/OFF rows, Thunder Wave: no pause); ON residuals −4 / −6 / −3 / −3 / 0 |
| 4 | Census 0..999 both scenes (below) | digests identical 1000/1000 both scenes; OFF 316,756 commands byte-identical, 0 pauses inserted; ON 0 unattributed |
| 5 | `compare:differential` fight-submenu / battle1-postwin-next-prompt / presentation-rng-playable-live-bodies-seeded-on `--base 5cf23a253` | 235/235 and 216/216 byte-identical; seeded-on 46/190 identical, 144 differ, all attributed (below) |
| 6 | Re-pins | Scene ON only, per-pin attribution in commit `e52b80ce0`; ablation passes (below) |
| 7 | Gates | Identities and results at the end |

### 1. ON receipt table (residual = production first used glyph − ROM edge; transition in parentheses)

| ON scenario | class | d n u anchor | P | ROM edge | before | after | predicted | landed |
|---|---|---|---|---|---|---|---|---|
| bulk-up | stat | 2 1 4 print+64 | 12 | 409 | −16 (−12) | −4 (0) | −4 | yes |
| double-team | stat | 2 1 4 print+64 | 12 | 375 | −17 (−12) | −5 (0) | −5 | yes |
| sand-attack | stat | 2 2 4 print+64 | 12 | 276 | −18 (−12) | −6 (0) | −6 | yes |
| toxic | status | 6 2 4 icon | 16 | 451 | −37 | −21 | −21 | yes |
| protect | protect | 2 1 4 print+64 | 12 | 254 | −15 (−12) | −3 (0) | −3 | yes |
| detect | protect | 2 1 4 print+64 | 12 | 240 | −15 (−12) | −3 (0) | −3 | yes |
| rest (ply snorlax) | rest | 7 2 2 hp | 15 | 135 | −18 (−15) | −3 (0) | −3 | yes |
| dig | two-turn | 4 1 4 print+64 | 14 | 305 | −10 (−14) | +4 (0) | +4 | yes |
| razor-wind | two-turn | 3 2 4 print+64 | 13 | 167 | −14 (−13) | −1 (0) | −1 | yes |
| solar-beam | two-turn | 3 2 4 print+64 | 13 | 223 | −13 (−13) | 0 (0) | 0 | yes |
| snore | failed | 2 2 4 print+64 | 12 | 148 | −2 (−12) | +10 (0) | +10 | yes |
| dynamic-punch ply / opp | miss | 2 2 4 print+64 | 12 | 162 / 170 | −11 / −12 | +1 / 0 | +1 / 0 | yes |
| thunder-wave | status | skipped: next action does not open with a USEDMOVE print | | | | | | |

The remaining residuals are the out-of-scope anchor-end errors: ON body tails −3..−6 (stat / protect / rest), Dig +4, Snore +10, Dynamic Punch +1.

**Toxic's −21.** The icon anchor is a 1-frame `status-icon-update` after a 90-frame print, and P = 16 lands the transition exactly. What is
left is upstream of the anchor: the production Toxic message starts at row 321 against the ROM's 340 (the dense probe: ROM message spike
382 − 42 start offset), i.e. about 19 frames early (the Toxic status-animation body ahead of the message, pre-existing), plus −2 from message start to the used print (production 109 rows against the ROM's 111). −19 − 2 = −21.
Neither part is the transition; the pause did what the rule predicts.

### 2. Dense ROM windows (anchor print start → the next used print's first glyphs; 240 × 160, per row)

| Window | anchor→used | pause (gap) | anchor print | used print | notes |
|---|---|---|---|---|---|
| Bulk Up (player Primeape vs Onix) | 101 rows (ROM 100: the existing print/stat convention, anchor start Δ −5 vs end Δ −4) | **13 rows, 0 px** in box / opponent / player | 88 rows; box 1,504 px in the 22 reveal rows, **0 px with the ROM shifted one row** | 20 rows, 0 px | 121-row window; the other 60 px/row is a constant healthbox difference present in every row, with and without the pause |
| Scratch (player Primeape vs Onix) | 103 rows | **15 rows, 0 px** | 88 rows, 0 px | 20 rows, 0 px | 123-row window, box / opponent / player 0 px in all 123 rows |
| Toxic | 109 rows (ROM 111) | 18 rows, 0 px in box / player | 90 rows | 20 rows | opponent region carries a constant 1,091 px every row: ROM Onix sits at x2 +1 after the Toxic body, production's tracker idles it at rest. Pre-existing, independent of the pause |

During the draw-nothing pause the field equals the ROM (static: the old print stays in the box until the next print's first glyph clears it).
The ROM probes were run twice (rgb sha256 equal, `fixtures/trn181/rom/rgb-sha256.txt`).

### 4. Census 0..999 (`trn181Census.sh` + `.ts` + `trn181CensusDelta.py`; `TRN178_CENSUS_JOBS` <= 6; fixtures `census-delta-{off,on}.json`, `census-sha256.txt`)

| | Scene OFF | Scene ON |
|---|---|---|
| battles / event-digest mismatches / error mismatches | 1000 / 0 / 0 | 1000 / 0 / 0 |
| commands base → final | 316,756 → 316,756 (all identical; 1000/1000 battles identical; sha256 of all shards equal) | 307,633 → 320,378 |
| inserted pauses | 0 | **12,942 pauses, 180,834 frames, 998 battles** (frames 9..29; mean 13.97; 16: 1,019, 15: 1,702, 14: 2,126, 13: 855, 12: 1,190, 11: 1,664, 10: 1,864, 19: 1,170, others ≤ 595) |
| unattributed | 0 | **0** |
| transitions (a used print right after a run of MoveEnd receipts) | 14,677 (13,776 already paused by trn178, 901 skipped) | 14,568: **12,942 paused, 1,626 skipped by the guard** |

The 197-command ON difference from 12,942 inserted is the three budget-stalled battles 434 / 796 / 881 (the census input budget of 200k frames
is hit in both trees; pre-existing): the final tree reaches the budget earlier, so 97 / 21 / 79 base tail commands are not reached.
Those three are classified `budget-tail` (digests differ only because they cover different numbers of events); the other 997 digests are equal.

**ON transitions the guard skips (1,626 of 14,568, 11.2%), by the command before the receipt run:** status-animation 687, message:hold64 484,
message 320, move-animation 70, switch-in 36, hp 23, status-icon 6. OFF's skips are the same classes minus status-animation and move-animation
(OFF presents neither): message:hold64 516, message 320, switch-in 36, hp 23, status-icon 6. Why (instrumented walk of `actionTransitionPauseFrames`
over ON seeds 0..99: 1,362 transitions, 1,238 paused, 124 skipped): `P <= 0` 62 times, exactly the 62 status-animation skips — the status animation
the ON action presents after the anchor (71+ frames) already covers d + 6 + u, so the rule asks for no further pause (no ROM evidence here: unchanged,
reported); anchor is the used print or EMPTYSTRING3 34 times (Struggle / Substitute-style prints held 64: the OFF guard, Wish's class); anchor print
without `waitmessage B_WAIT_TIME_LONG` 2 times; the remaining skips are runs that are not an action's first MoveEnd group (switch-in, faint, hp, icon
classes). I did not widen the guard: no ROM evidence says it should be.

### 5. compare:differential

`fight-submenu` 235/235 and `battle1-postwin-next-prompt` 216/216 byte-identical. `presentation-rng-playable-live-bodies-seeded-on`
46/190 identical, 144 differ (`fixtures/trn181/differential-{summary,attribution}.txt`). Attribution (`trn181TraceFrames.ts` renders every
frame of the trace in both trees, `trn181TraceAttribution.py`): the trace's ON battle has two pauses (15 frames from frame 2019, 16 frames from
3396); every frame before 2019 is identical, the first differing frame is 2021, and **head frame f equals base frame f − (pause frames elapsed)
for every frame 1700..2283**, i.e. the pause only delays the next print. The first shifted mismatch (2284) follows the trace's scripted
A presses at 2263 / 2273, which land 15 frames earlier in the action's timeline in the final tree (the trace is a fixed-frame script). All 144 differing
captures are at or after frame 2019. Ablation: with the ON branch forced off, all 2,266 frames equal base (0 pause frames).

### 6. Re-pins and ablation

Re-pinned (commit `e52b80ce0`, per-pin attribution in its message; Scene OFF pins unchanged):
- chg161ChargeTurnPrint: ON foe used-glyph residual [-10..-14] -> [4, -1, 0] (Dig 14 / Razor Wind 13 / Solar Beam 13; the existing anchor-end errors).
- sub157SceneOffSubstitute: OFF and ON both carry the pause; ON's has the marker; streams equal apart from it, pause timings equal.
- substituteDollFieldState: doll cleared at command 1:10 (was 1:9): one pause command ahead of the fade message.
- battleTurnPortability: the canonical staged turn (default ON rules) gains the 19-frame HP-anchor pause (seq 7).
- liveBattlerX2History seeds 110 / 134: body keys shift by one command per preceding pause in the segment (13 keys).
- sc106StatsChangeCommand (6 routes): anchors +14 (seed 0), +[0,14,28,42,56,68] (3/3), +38 (3/1), +44 (6/0), +39 (13/3); route totals
  +80 (79 + 1 dismissal parity), +110 (109 + 1), +104 (seed 10); `trn181PinShift.ts` prints each route's pauses.
- sgl138-live-receipt.json regenerated: ON frames +404 / +300 / +348 / +220 (pauses 404 / 300 / 349 / 220; seed 19 is 1 frame of dismissal
  parity); every anchor field and every OFF battle identical.
- generatedCommandAnimationReplay: the marked pause is not listed as a body (no pin changed there).
**Ablation:** forcing the new ON branch off in a copy of the final tree and restoring the base versions of the 9 changed test / tool files,
the 15 affected test files pass (149 / 149), i.e. every re-pin is the pause and nothing else.

## Remainder (not done here)

- The −3..−6 ON body-tail anchor errors, Snore +10 / Dig +4 / Dynamic Punch +1 print-length residuals, Toxic's −19 upstream (status-animation) and −2.
- Skipped classes (ON: status-animation 687 where the status animation already covers P; Struggle / Substitute used-print anchors), switches,
  faints, end of turn, pre-move prints: no pause, unmeasured.
- Toxic's constant opponent x2 mismatch in its ROM window (tracker idle rest vs ROM x2 +1).

## Reproduce

```sh
node --experimental-strip-types --no-warnings tools/integration/trn176Predict.ts --scene=on
node --experimental-strip-types --no-warnings tools/integration/trn181Receipt.ts <base-tree>          # == fixtures/trn181/receipt.txt
npx vitest run tests/trn181ActionTransitionOn.test.ts tests/trn178ActionTransition.test.ts
TRN178_CENSUS_JOBS=5 sh tools/integration/trn181Census.sh <fresh-dir> 5cf23a253:off 9b08b6c47:off 5cf23a253:on 9b08b6c47:on
python3 tools/integration/trn181CensusDelta.py <dir>/on-5cf23a253 <dir>/on-9b08b6c47 out.json         # exit 0; OFF: same with off-* (also requires 0 changes)
npm run compare:differential -- fight-submenu battle1-postwin-next-prompt presentation-rng-playable-live-bodies-seeded-on --base 5cf23a253
node --experimental-strip-types --no-warnings tools/integration/trn181PinShift.ts <seed> <slot>        # the pauses before each sc106 pin
```
