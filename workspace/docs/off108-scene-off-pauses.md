# off108 (S10A timeline fidelity, ISSUES #167, 2026-10-11): Scene OFF no-hit pauses and the miss / fail pause — anchors, a banked patch

Base: master `52c181d54` (production src `14d1be159`). Evidence + BANKED PATCH, new files only. The production change is a TEMP PATCH
(`tools/integration/fixtures/off108/off108-scene-off-pauses.diff`, `battleResolutionPresentation.ts` +135 / -4). It was applied only to
git-archive copies of the base under the gitignored scratch dir. Direct mGBA only (no shared oracle), explicit lab seed in every scenario,
every probe job twice in fresh processes: **30 / 30 outputs r1 == r2** (15 scenarios x ON / OFF).

## 1. Results first

| Question | Answer | Evidence |
|---|---|---|
| The OFF span on no-hit bodies | **F_after - F_att = 35 on 12 / 12 no-hit attack bodies** (stat, status, Protect / Detect, Rest, three charge turns), measured from the pointer runs (`BattleScript_Pausex20` 32 rows + return + waitanimation) | `table/classes.tsv` (span column) |
| The rule production must emit (OFF, no hit receipt) | **P = Δ(N) + lead(N) − D_between**, where Δ = the kernel's `instructionExecution` minus the opener's (one frame per interpreter execution, exactly the ROM row − G), N = the next presented receipt after the attack receipt, lead(message) = 1 (the first glyph lands one row after the print executes), lead(status-data) = 1 (`Cmd_statusanimation` is the next instruction), lead(STATS_CHANGE) = lead(HP bar) = 0, D_between = frames production already presents between the opener and the attack receipt. Equivalently **P = (attG − 1) + 35 + k − D_between**. The hit path's `1 + I + 32` is the same rule with N = the hit receipt | §2 |
| Does the rule land on the ROM row? | **Yes, 16 / 16 checkable classes (Δ(N) + lead == the ROM anchor row − (G + 1))**, and production's PATCHED command stream puts N's command on that row: **OFF residual 0 on 16 / 16** (base −36 .. −48), **ON 5 / 5 pause-path classes** (base −36 / −37) | `receipts/verify-off.json`, `receipts/verify-on.json` |
| Miss verdict | **MoveMissedPause is LOST, in both scenes.** ROM: `pause B_WAIT_TIME_SHORT` rows G+2 .. G+33, effectivenesssound, resultmessage pending at G+35, first glyph of "X's attack missed!" at **G+37**, ON == OFF (Dynamic Punch misses both sides, and the Protect / Detect-blocked Tackle: 4 / 4). Production starts the missed message at G+1 (its glyph 36 frames early; the "used" command is the 24-frame floor with no hold). Same for **"But it failed!"** (Snore while awake, `BattleScript_ButItFailed`: glyph at G+38, production G+1) | `table/classes.tsv` rows miss / failed / protect-blocked, `onVsOff.pausePathSame` 5 / 5 |
| Two-turn strike miss / Protect-blocked | Protect-blocked runs the same path as a miss (attackcanceler sets MOVE_RESULT_MISSED, accuracycheck → `BattleScript_PrintMoveMissed` → MoveMissedPause): measured, identical numbers. A two-turn strike miss goes through `BattleScript_HitFromAccCheck` → the same `BattleScript_PrintMoveMissed` (source); not staged here (Dig / Razor Wind / SolarBeam are 100 % accurate and hit) | `table/classes.json` |
| Scene ON | **ON's no-hit bodies are unaffected** (their live / fallback move-animation command is untouched: census 0 status changes, 0 per-command frame changes). The miss / fail pause is scene-independent in the ROM (5 / 5), so (c) applies to both scenes | `census-delta.json` |
| **BANKED temp patch** | (b) a `SCENE_OFF_ATTACK_PAUSE` receipt without a hit receipt pushes the OFF pause command (`move-animation`, no `animation`, like the hit path) of P frames (`sceneOffNoHitPauseFrames`); (c) a `STRINGID_USEDMOVE` whose first presented receipt is a print preceded within 3 straight-line source instructions by `pause B_WAIT_TIME_SHORT` gets `holdFrames = Δ(print) + 1` after its 24-frame floor (`sourcePauseUsedMoveHoldFrames`, both scenes; the route-scoped `usedMessageHoldFrames` still wins when set). Typecheck green on the patched copy | `off108-scene-off-pauses.diff` |
| Census delta (seeds 0..999, ten shards per tree) | **Scene ON** (liveShareCensus): **0 status changes, 0 per-command frame changes, live counts identical on 10 / 10 shards**, KEY sequence identical on 997 / 1,000 battles (fallback counts move only by the truncated battles' missing commands: 291 → 275, 320 → 301, 313 → 307); battleDigestExcludingFrames identical on 7 / 10 shards. The 3 others each hold ONE battle (seeds 434, 796, 881) that already stalls at the census FRAME_BUDGET in base and now stalls a few turns earlier (common prefix identical: 250 / 195 / 287 commands). Frames +240,834 (14,649,389 → 14,890,223). **Scene OFF** (off108Route.ts): **0 command mismatches** once the patch's own changes are removed (same 3 budget battles, common prefix identical); **9,717 pause commands inserted (+404,165 frames)**: before a message 5,153 (+220,475), STATS_CHANGE 3,084 (+117,695), status data 805 (+37,338), HP bar 621 (+24,821), N beyond the route's 14-receipt window 54 (+3,836); **7,386 used-move holds (+275,018 frames)**: MoveMissed 3,577 (+129,045), ButItFailed 2,488 (+95,387), AlreadyAtFullHp 396, AlreadyParalyzed 128, HitAllWithUndergroundBonusMissed 102, ... | `census-delta.json` |
| Test pins the patch moves | see §4 (`pins.json`) | `pins.json` |
| Open | **Rest** (467 census bodies): its attack receipt follows "went to sleep!" + `waitmessage` + the status icon, where the kernel's provenance is no longer one frame per ROM row (`waitstate` 1 vs 2 rows; waitmessage modelled, not counted). ROM: att = G+128, F_after = G+163, the HP bar's first change G+166 (k = 3). The patch emits no pause there. Also without a pause (unmeasured next receipt): sprite-visibility next 298, a stat-stage-change next (speed 243 / attack 129 / special-attack 34: Curse / Agility-like paths), nothing next 36 | `census-delta.json` `noHitWithoutPause` |

## 2. Per-class rule (ROM rows − G, Scene OFF; G = the opener's release row − 2 = the final glyph of "X used Y!")

Production's command after the opener starts on G + 1 (idle98 §2, the accepted hit-path anchor). The charge turn's opener is the 2-row
EMPTYSTRING3 print, anchored the same way (release row − 2 = the kernel's u: its attack receipt is Δ2 in both).

| Class (lab move) | attG | span | F_after | next ROM anchor | k | N (kernel Δ) | lead | D_between | **P** | base residual |
|---|---|---|---|---|---|---|---|---|---|---|
| stat self (Bulk Up) | 3 | 35 | 38 | STATS_CHANGE activation 40 | 2 | STATS_CHANGE 39 | 0 | 0 | **39** | −39 |
| stat self (Double Team) | 4 | 35 | 39 | activation 41 | 2 | STATS_CHANGE 40 | 0 | 2 (`stat`) | **38** | −38 |
| stat target (Sand-Attack) | 4 | 35 | 39 | activation 41 | 2 | STATS_CHANGE 40 | 0 | 2 | **38** | −38 |
| status msg (Confuse Ray) | 7 | 35 | 42 | glyph 47 | 5 | PKMNWASCONFUSED 45 | 1 | 0 | **46** | −46 |
| status (Toxic, vs ONIX) | 11 | 35 | 46 | statusanimation executes 49 (glyph 51) | 3 | status data 47 | 1 | 0 | **48** | −48 |
| status (Thunder Wave) | 10 | 35 | 45 | statusanimation executes 48 (glyph 50) | 3 | status data 46 | 1 | 0 | **47** | −47 |
| Protect / Detect | 3 | 35 | 38 | glyph 40 | 2 | PROTECTEDITSELF2 38 | 1 | 0 | **39** | −39 |
| charge turn (Dig / Razor Wind / SolarBeam) | 2 | 35 | 37 | glyph 43 | 6 | DUGHOLE / WHIPPEDWHIRLWIND / TOOKSUNLIGHT 41 | 1 | 0 | **42** | −42 |
| Rest | 128 | 35 | 163 | HP bar 166 | 3 | (open, §1) | | | — | — |
| failed (Snore awake) | — | — | — | glyph 38 (ButItFailed pause rows 3..34) | — | BUTITFAILED 36 | 1 | 0 | **hold 37** | −37 |
| miss (Dynamic Punch, both sides) / Protect- or Detect-blocked Tackle | — | — | — | glyph 37 (MoveMissedPause rows 2..33) | — | ATTACKMISSED / PROTECTEDITSELF 35 | 1 | 0 | **hold 36** | −36 |

"base residual" = where base production starts N's command minus the ROM anchor (frames, negative = early); patched = 0 on every row.
The kernel deltas equal the ROM rows on every class: attack receipt (3, 4, 4, 7, 11, 10, 3, 2) and N (39, 40, 40, 45, 47, 46, 38, 41, 36, 35).

**Status class caveat (new, not banked).** In Scene OFF `Cmd_statusanimation` is skipped (HITMARKER_NO_ANIMATIONS,
`battle_script_commands.c:5753`): the print runs on the next row and its glyph lands 2 rows after the status command's start. Production's
`status` command is 32 frames in both scenes (STATUS_TIMING). With this patch its START is exact, but the following message is then
+30 late (Toxic G+81 vs G+51, Thunder Wave G+80 vs G+50; base: −18 / −17 early). Fix shape: an OFF `status` command of 2 frames
(ROM ON plays it: Paralysis 40 rows, Toxic 72). Exposure: 805 census bodies (+ every other OFF status command).

**Other observations (not anchored here).** The "used" message is a 24-frame floor; the ROM's 21-glyph "PRIMEAPE used\nPROTECT!" runs first
glyph → release in 22 rows (first glyph G−20). The charge-turn EMPTYSTRING3 print is a 24-frame message in production, 2 rows in the ROM.
Both are message-timing questions upstream of the G + 1 anchor this step measures from.

## 3. The patch (`off108-scene-off-pauses.diff`)

One file, `src/engine/battleResolutionPresentation.ts`:
- `sceneOffNoHitPauseFrames(events, attackIndex, openerIndex, presentedSinceOpener)`: same execution as the opener (instructionExecution never
  drops), every command since the opener fixed-timing and hold-free (else null: Rest), the first receipt after the attack receipt that is not
  PP / play-se must be a print, a status-data receipt, STATS_CHANGE or the HP bar (else null: unmeasured), P = Δ + lead − presented (> 0).
- `sourcePauseUsedMoveHoldFrames(events, usedIndex)`: the first receipt after the attack string that is not PP must be a print whose program
  counter has `pause B_WAIT_TIME_SHORT` within the 3 previous source instructions (no goto / end / return in between); hold = Δ + 1.
- opener tracking (`pauseOpenerIndex`, `pauseOpenerCommands`) at STRINGID_USEDMOVE / STRINGID_EMPTYSTRING3 after their command is pushed; the
  hit path is untouched (`usedMoveInstructionExecution` still only follows USEDMOVE, so multi-hit later bodies keep their 115).
- `BattleMessageTiming` gains `{ minimumFrames: 24; holdFrames: number }`.

## 4. Pins the patch moves

Patched copy (`git archive 52c181d54` + the diff, its own git repo), `npm test`: **3 files / 6 tests failed, 1,624 files / 13,381 tests passed**
(44 / 223 skipped). One is the environment, not a pin: `tests/appDifferential.test.ts:131` needs `HEAD~` ("fatal: Needed a single revision" in a
one-commit copy repo); with a second commit the file passes 10 / 10. **5 moved pins in 2 files** (`fixtures/off108/pins.json`):

- `tests/factoryRoundBattleOrchestrator.test.ts:1094` (ISSUES #95): asserts a Scene OFF Harden + Sandstorm turn has NO `move-animation` command.
  Its no-hit OFF attack pauses are now presented (that is the fix). The invariant the test guards (no pause pairs with the end-of-turn weather
  loop's hit animation across the execution boundary) still holds: `sceneOffNoHitPauseFrames` stops at an instructionExecution drop. Re-pin as
  "every move-animation command in that turn is a no-hit pause of P frames, none 140".
- `tests/randomRoundSoak.test.ts:311` soak seed 21 (strong-route): frames 37,260 → 38,077, renderCalls 2,671 → 2,715, same battle / outcome / turn.
- `tests/randomRoundSoak.test.ts:728` / `:754` Milestone M-B (c) seed 0: frames 11,955 → 13,889 ('full') and 8,499 → 9,003 ('vanilla'), same
  battle / endState / turn.
- `tests/randomRoundSoak.test.ts:495` (ISSUES #89) soak seed 27, random policy: **driver path, not gameplay.** The soak driver presses A during
  resolution with `rng.gap` cooldowns drawn from its own policy RNG (`randomRoundSoakDriver.ts` `decide` → `onResolution` → `press`), so a
  longer presentation consumes more policy draws and its later random move picks differ: the round is now lost at battle 1, turn 28
  (20,755 frames) instead of battle 4, turn 26 (64,525), so `frames > 30,798` no longer reaches the old Baton Pass halt. The orchestrator
  censuses (fixed least-used-slot policy) show identical gameplay (§1). Re-seed this pin in the land step (a seed whose patched path
  still reaches the ISSUES #89 openpartyscreen halt).

## 5. FOLD INSTRUCTIONS (land step, AFTER the stats-change command — ISSUES #166 slice (c) — is on master)

1. From the repo top: `patch -p1 < workspace/tools/integration/fixtures/off108/off108-scene-off-pauses.diff` (`git apply` run from inside
   the tree silently skips it). The hunks touch the `BattleMessageTiming` union, the constants block after `SCENE_OFF_MOVE_PAUSE_FRAMES`, the
   locals after `usedMoveInstructionExecution`, the USEDMOVE `timing:` expression, the end of the message branch, and the
   `SCENE_OFF_ATTACK_PAUSE` no-hit `continue`. If the stats-change work also edits the STATS_CHANGE / `stat` projection, resolve by hand: the
   two changes are independent.
2. Interaction with the stats-change command. This patch ends the OFF pause on the ROM **activation row** of the stat animation (Bulk Up G+40,
   Double Team / Sand-Attack G+41: `lead(STATS_CHANGE) = 0`), i.e. where a stats-change command whose age 0 is the first
   gAnimScriptActive row must start. If its age 0 is the `playstatchangeanimation` execution row instead, set lead(STATS_CHANGE) = −1 ... +1
   accordingly. D_between is read from the commands actually presented, so moving / merging the `stat` command (Double Team's `stat` is
   projected from a stat-stage-change receipt at Δ2, BEFORE the attack receipt) needs no change. Joint target after both: the first stat
   message's first glyph on **G+121 (Bulk Up)** and **G+119 (Double Team, Sand-Attack)** (`receipts/rom-r1.json`).
3. Pins: the §4 list; files that also pin `stat` timing will move for both changes — re-enumerate on the folded tree.
4. Re-run `sh tools/integration/off108Run.sh <fresh-out-dir> [--census]` on the fold's base: the ROM receipts (probes, rom-r1, classes) must
   stay SAME; routes / verify / census move with the base (the stats-change command shifts later commands but not N's start).
5. Follow-ups: Rest (open, §1); the OFF `status` command length (§2 caveat); unmeasured next receipts (sprite-visibility, stat-stage-change).

## 6. Gates

- `sh tools/integration/off108Run.sh <fresh>` (no census), fresh dir inside the repo, after the patch / table commits: **ALL SAME** (14:55 -> 14:59): scenarios 15 + index, probes 30 / 30 r1 == r2, 60 / 60 outputs == the committed sha256, rom-r1 SAME and r2 == r1, routes 10 / 10 == the committed sha256, classes.json / .tsv SAME, verify-off / verify-on SAME.
- `sh tools/integration/off108Run.sh <fresh> --census` (14:59 -> 15:14, a second fresh dir): **ALL SAME**: everything above plus both censuses (ON liveShareCensus and OFF off108Route, seeds 0..999, ten shards per tree) -> census-delta.json byte-identical to the committed receipt.
- Patched copy (git archive 52c181d54 + the diff, its own git repo): `npm run typecheck` green. `npm test`: §4.
- `npm test` in a git-archive copy of `ae3e6a27d` (this step's commits on 52c181d54; its own two-commit git repo): **1,627 files / 13,387 tests
  passed** (44 / 223 skipped), 0 failed. `npm run build` in the same copy: **green** (exit 0). Later commits add only pins.json, off108Pins.py and doc text.
- `git diff --check` clean at every commit; only new off108 files, staged by explicit path.

## 7. Reproduction (from workspace/)

```
sh tools/integration/off108Run.sh <fresh-out-dir-inside-the-repo>            # archive copies, staging, 30 probe jobs x2 (r1 == r2), ROM table,
                                                                             # production routes, class table, verify OFF / ON
sh tools/integration/off108Run.sh <fresh-out-dir-inside-the-repo> --census   # + both censuses (ON liveShareCensus, OFF off108Route) 0..999
# pieces:
python3 tools/integration/off108Stage.py <dir>/scenarios
python3 tools/run-mgba-probe.py <o.json> -- <mgba-venv python> tools/integration/idle94Probe.py <scenario> on|off <o.json>
python3 tools/integration/off108Rom.py <probe-dir> tools/integration/fixtures/off108/scenario-index.json <rom.json>
node --experimental-strip-types --no-warnings tools/integration/off108Route.ts --seeds=A..B --scene=off|on --out=<f.jsonl>
python3 tools/integration/off108Classes.py <rom.json> <route-dir> <out-dir>
python3 tools/integration/off108Verify.py <classes.json> <base-route-dir> <patched-route-dir> <out.json> [--scene=on]
python3 tools/integration/off108CensusDelta.py <on-base> <on-patched> <off-base> <off-patched> <out.json>
python3 tools/integration/off108Pins.py <npm-test.log> <out.json>
```

Files: `tools/integration/off108{Stage,Rom,Classes,Verify,CensusDelta,Pins}.py`, `off108Route.ts`, `off108Run.sh`. Fixtures
`tools/integration/fixtures/off108/`: `scenarios/` (15) + `scenario-index.json`, `receipts/` (probe / route sha256, rom-r1, verify OFF / ON),
`table/classes.{json,tsv}`, `off108-scene-off-pauses.diff`, `census-delta.json`, `pins.json`, `.gitattributes`.
