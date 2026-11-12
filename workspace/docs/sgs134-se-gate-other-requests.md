# sgs134 (S10A timeline fidelity): the IsBattleSEPlaying gate on the OTHER controller requests — stats-change and multi-hit

Evidence + a BANKED patch (`tools/integration/fixtures/sgs134/sgs134-gate.diff`, applied only to git-archive copies). **No production
change**, no existing file edited. FIXED evidence base: master `b9669e7d8` (production src `7dbc34ab4`), git-archive copies only; direct
mGBA only (seg127's `seg127Probe.py`), explicit lab seeds, every probe job twice in fresh processes (**40 / 40 r1 == r2**, ROM analyses
r2 == r1). Rule and SE lengths: `docs/seg127-status-se-gate.md` (§1: `gate = clamp(seRows[songId] - seAge, 0, 29)`, 18 / 73 / 88 rows).

## 1. Results first

| class (request) | ROM gate (both sides) | production today (b9669e7d8) | verdict | patch |
|---|---|---|---|---|
| **stat-change secondary on the target** (`playanimation` B_ANIM_STATS_CHANGE in BattleScript_StatDown; HandleBattleAnimation) — Mud-Slap ACC−1, Icy Wind SPD−1 | **seGate = clamp(73 − (44 + drain))**: ply 19 / 18, 18 / 17; opp 17 / 15, 17 / 15; controller rows = gate + 76 on every receipt; **Scene OFF identical** (same rows, both sides) | the `stats-change` command presents its own 76 / 90 + hold whatever the gate: ON 733 / 733, OFF 917 / 917 commands (seeds 0..199) | **SHORT by exactly the gate, both scenes** | gated: `seGateFrames` lead |
| **stat-change secondary on the attacker** (BattleScript_StatUp) — Meteor Mash ATK+1 | ply 23 / 21, opp 22 / 19 (fixed 44, ctl = gate + 76; OFF identical) | same (3 gated in seeds 0..199, both scenes) | **SHORT by exactly the gate, both scenes** | gated |
| **multi-hit 2nd+ hit** (`attackanimation` in BattleScript_DoMultiHit; HandleMoveAnimation) — Pin Missile 2..5, Bonemerang 2 | **seGate = clamp(73 − (62 + drain))**: Pin Missile ply 3 / 4, opp 1 / 2; Bonemerang ply 8, opp 7; launch = poll + 2 + gate, ctl(hit k) − gate == ctl(hit 1) (95 / 74) on every receipt; **Scene OFF: no request** (attackanimation skipped) | every 2nd+ hit's `move-animation` lasts exactly the 1st hit's frames: 60 / 60 later hits, delta 0 for every gate (22 gated, gates 1..11) | **SHORT by exactly the gate, Scene ON** (the live adapters' dense windows never contained a gated later hit's lead) | gated |
| status-icon update after an SE | — | — | **0 exposure** (census: 0 open receipts of 1,098; a status animation / print always precedes) | none |
| status-animation | sag130 (live) | — | (already MATCH) | — |
| unmeasured classes after an open SE (no ROM receipt: Leftovers / berries `HELD_ITEM_EFFECT`, Knock Off, turn trap, Focus Band, Wish / Ingrain heal, Overheat / Superpower / AncientPower psca, Speed Boost, two-turn charge) | — | 0 | **OTHER (unmeasured; bounded)** | presented 0 (unchanged) |

- **0 residuals** on every ROM receipt (`receipts/rom-r1.json`, `rom-off-r1.json`): 96 gated requests per scene, 32 with gate > 0 (ON),
  the rule's `clamp(L − age, 0, 29)` == the measured IsBattleSEPlaying polls; the class form `clamp(seRows − (fixedRows + drain))` with
  **fixedRows 44** (stat change, = seg127's hit-secondary path) and **62** (multi-hit) reproduces all 32 open receipts; the 6 closed ones
  follow "A critical hit!" (seAge ≥ 123 → 0). Base delay per opcode is constant: playanimation launch = poll + gate, attackanimation
  launch = poll + 2 + gate (PlayerDoMoveAnimation's case 0 → 1).
- **The banked patch, census 0..999 (base vs patched archive copies, both scenes): ALL TRUE** (`fixtures/sgs134/census-delta.json`):
  1,000 / 1,000 battles with identical end, kernel-events digest and command-type sequence per scene; **only the gated commands
  lengthen, each by exactly its gate**: Scene ON 366 commands (stats-change 240 / 3,114 frames, move-animation 126 / 540) = the census
  projection cell by cell (172 / 172 seed x type cells, 3,654 frames); Scene OFF 240 stats-change / 3,114 frames (126 / 126 cells). The
  only other differences: 106 ON / 78 OFF button-dismissed messages ±1 frame, each after an odd cumulative shift (the census driver
  presses A on even frames while a message awaits dismissal — sc106's "dismissal parity"); 0 problems.
- **Pins in the patched copy**: 205 targeted test files (every test naming stats-change / multi-hit / move-animation / seGate +
  randomRoundSoak + iu120; `fixtures/sgs134/patched-targeted.json`): 2,829 / 2,830 pass; **1 pin moves, exactly explained**:
  `tests/sc106StatsChangeCommand.test.ts` route seed 0 slot 2 `route.frames` 6,722 → 6,739 = + the route's two gated Icy Wind
  secondaries (gates 8 + 9; its anchors' stats-change frames 84 / 85 vs 76). The full suite was NOT run on the patched copy (time cap).

### 1a. Census exposure 0..999 (`fixtures/sgs134/exposure.json`; Scene ON production kernel of b9669e7d8; seg127's battle loop)

"open" = an effectivenesssound earlier in the segment and, between it and the request, no print but the multi-hit loop's
`printstring STRINGID_EMPTYSTRING3` + `waitmessage 1` and no animation script (its `Cmd_end` waits until IsSEPlaying is FALSE,
`battle_anim.c:476-503`; HIT_ANIMATION is a sprite blink, HandleHitAnimation has no gate). Receipts kept = every gated-request event with
an SE earlier in its segment.

| class | after an SE | open (by SE) | closed by: n.v.e. / super / crit / other print / anim script | projected gated | **gate frames** | sides ply / opp (gated, frames) |
|---|---|---|---|---|---|---|
| stats-change on the target (StatDown) | 714 | 440 (se_effective) | 128 / 110 / 34 / 1 / 1 | **232** | **3,000** | 139 / 1,797 · 93 / 1,203 |
| stats-change on the attacker (StatUp) | 29 | 19 | 8 / 0 / 2 / 0 / 0 | **8** | **114** | 3 / 30 · 5 / 84 |
| multi-hit 2nd+ hit | 388 | 308 (194 eff / 43 super / 71 n.v.e.) | 1 / 8 / 22 / 10 / 39 | **126** | **540** | 71 / 344 · 55 / 196 |
| status-icon update | 1,098 | **0** | all | 0 | 0 | — |
| **measured total** | | | | **366** | **3,654** | |
| held item (Leftovers 746, Sitrus 80, stat berries 59 open) | 4,095 | 885 | | unmeasured | ≤ 5,496 (361) | |
| Knock Off (ITEM_KNOCKOFF) | 64 | 45 | | unmeasured | ≤ 841 (45) | |
| turn trap (end-turn wrap damage anim) | 279 | 56 | | unmeasured | ≤ 570 (35) | |
| two-turn charge after a hit (EMPTYSTRING3 opener) | 5,585 | 59 | | unmeasured | ≤ 321 (28) | |
| Focus Band / Wish / Ingrain / Leech Seed / Speed Boost / psca self-drops / AncientPower | | 38 / 28 / 15 / 3 / 14 / 72 / 17 | | unmeasured | ≤ 266 / 128 / 119 / 30 / 30 / 119 / 69 | |

Per move (gated): drops Mud-Slap 95, Icy Wind 57, Rock Tomb 49, Shadow Ball 24, Acid 3, Psychic 2, Crush Claw 2; raises Metal Claw 4,
Meteor Mash 4; multi-hit Fury Swipes 44, Double Slap 29, Double Kick 22, Comet Punch 12, Spike Cannon 7, Pin Missile 6, Triple Kick 6.
Unmeasured bounds use fixedRows 44 (the shortest path after a hit), so they are UPPER bounds (522 receipts, 7,989 frames); most
are end-turn paths (Leftovers, wrap, Wish) whose fixed rows are certainly larger.

### 1b. ROM receipts (`fixtures/sgs134/receipts/`, `scenario-index.json`)

Controlled lab staging on seg127's Bulk Up templates (legal parties, EV totals ≤ 510; only the attacker lead's species / moves /
abilitySlot, the target lead's species, the seed and the turn count change): target Snorlax (Immunity) takes every move neutral; a weak
attacker (Chansey, base Atk 5, female-only) keeps the drain small. Seeds 305419897, Meteor Mash 305419899 (Serene Grace 40 % raise; the
first sweep seed 305419898..905 with the raise on both sides). Turn shape: A, 30, A (slot 1) + 1,400 idle.

| scenario (ply / opp) | path | gates ply | gates opp | controller rows | fixed | drain |
|---|---|---|---|---|---|---|
| Mud-Slap (Primeape) | StatDown | 19, 18 (+ 0 after a crit) | 17, 15 (+ 0) | 95, 94 / 93, 91 (76 at gate 0) | 44 | 10..14 |
| Icy Wind (Primeape) | StatDown | 18, 17 (+ 0) | 17, 15 (+ 0) | 94, 93 / 93, 91 | 44 | 11..14 |
| Meteor Mash (Chansey) | StatUp | 23, 21 | 22, 19 | 99, 97 / 98, 95 | 44 | 6..10 |
| Bonemerang (Chansey) | DoMultiHit | 8, 8 | 7, 7 | 82 / 81 (= 74 + gate) | 62 | 3 / 4 |
| Pin Missile (Primeape) | DoMultiHit | 3 x7, 4 (+ 0 after a crit) | 1 x7, 2 x2 (+ 0) | 95 + gate | 62 | 7..10 |

Scene OFF (`rom-off-r1.json`): every playanimation receipt identical to ON (seGate, controller rows); every DoMultiHit attackanimation
has controller rows 0 (no request: `Cmd_attackanimation` skips under HITMARKER_NO_ANIMATIONS).

## 2. Production today (`fixtures/sgs134/production-{on,off}.json`; `sgs134Production.ts` seeds 0..199, `sgs134ProductionSummary.py`)

The k-th presented `stats-change` command of a segment is paired with the k-th kernel STATS_CHANGE event (143 ON / 3 OFF segments with a
Double Team body or a Substitute doll skipped: their counts differ) and its projected gate computed with the same rule. **Every** paired
command presents exactly its own `minimumFrames + holdFrames` (76 / 90 + hold): ON 733 / 733 (63 gated, 789 frames), OFF 917 / 917
(63 gated, 789 frames). The ROM's controller rows are gate + 76 → production's following print lands **gate rows early**. Multi-hit: 60
later hits (22 gated); `move-animation(hit k) − move-animation(hit 1)` = 0 for every gate value; the ROM's = the gate → **gate rows
early per gated hit**. So sc106 / scf117's 76 / 90 (measured from the gAnimScriptActive rise A) are right; what is missing is the
request → A gap.

## 3. The banked patch (`fixtures/sgs134/sgs134-gate.diff`, 216 lines, src only)

- `src/engine/battleResolutionPresentation.ts`: `sgs134RequestSeGate(events, index)` — seg127's rule via `seg127StatusSeGateRows` with
  fixedRows **44** for a STATS_CHANGE that directly follows a `stat-stage-change` (SetMoveEffect's ChangeStatBuffs → BattleScript_StatDown /
  StatUp; the next print DEFENDERSSTATFELL / ATTACKERSSTATROSE) after a hit (MOVE_ANIMATION or SCENE_OFF_ATTACK_PAUSE before the SE) —
  both scenes; and **62** for a MOVE_ANIMATION of the same move as the hit with only EMPTYSTRING3 in between, not a charge turn (Scene ON:
  OFF has no MOVE_ANIMATION). Closed (0) by any other print or any animation script / status animation after the SE. Every other request
  presents 0. The `stats-change` command gets `minimumFrames = gate + 76 / 90` and `timing.seGateFrames` (only when > 0; the hold
  spread keeps it); the MOVE_ANIMATION `move-animation` command gets `timing.seGateFrames` (`BattleMoveAnimationTiming` gains the optional
  field).
- `src/engine/battleResolutionPresentationRender.ts`: duration `move-animation` = seGate + pre + lead + live + post (non-live: seGate +
  minimumFrames); the move body's age and the preActivationRow window are offset by seGate (the field as it is for the gate rows, as the
  ROM shows); the stats-change banner effect starts at age seGateFrames (`age = phaseElapsed − seGateFrames`, no effect before it).
- NOT changed (deliberately): the presentation-RNG activation of a live body stays on the command's first frame (as for the pre rows
  today), so a gated Random2 body (Double Kick's 2nd hit: 22 census receipts) draws the same words as today; the order host / x2 host lend
  at the command start as today.
- Discriminator check: on census 0..999 the `stat-stage-change`-right-before test separates exactly — all 440 + 19 open StatDown / StatUp
  receipts have it, none of the psca (72) / AllStatsUp (17) / Speed Boost (14) / other (1) receipts do.

### 3a. Landing recipe (exact)

1. `git apply tools/integration/fixtures/sgs134/sgs134-gate.diff` on master (it applies to `b9669e7d8`; the two touched files are unchanged
   since then on this base).
2. Re-pin `tests/sc106StatsChangeCommand.test.ts:64` (`route.frames`): `+ 8 + 9` with a comment "sgs134: the route's two gated Icy Wind
   secondaries (IsBattleSEPlaying, docs/sgs134-se-gate-other-requests.md)" → 6,739. Then run the full suite (two shards) and re-pin any
   other route-frame pin by its route's Σ seGateFrames (± the documented dismissal parity) — the targeted 205 files found only this one.
3. Gates: `npm run typecheck` (green on the patched copy), `npm run test:smoke`, full suite, `npm run build`,
   `sh tools/integration/sgs134Run.sh <fresh-out> --delta` (the delta step then compares base vs base + diff, ALL SAME expected).
4. Accounting: Scene OFF changes too (stats-change only, 240 commands / 3,114 frames on census 0..999) — the main-lane OFF oracle has the
   same gate (rom-off-r1.json).

## 4. Reproduction (from workspace/)

```
sh tools/integration/sgs134Run.sh <fresh-out-dir-inside-the-repo> [--delta]    # archive of b9669e7d8 + sgs134 files of HEAD; ALL SAME expected
python3 tools/integration/sgs134Stage.py <dir>/scenarios
python3 tools/run-mgba-probe.py <o.json> -- <mgba-venv python> tools/integration/seg127Probe.py <scenario> on|off <o.json>
python3 tools/integration/sgs134Rom.py <probe-dir> tools/integration/fixtures/sgs134/scenario-index.json <rom.json> [on|off]
node --experimental-strip-types --no-warnings tools/integration/sgs134Exposure.ts --seeds=A..B --out=<dir>/e<k>.jsonl
python3 tools/integration/sgs134ExposureSummary.py <dir> <exposure.json> tools/integration/fixtures/sgs134/fixed-rows.json
node --experimental-strip-types --no-warnings tools/integration/sgs134Production.ts --seeds=A..B --scene=on|off --out=<f> [--all]
python3 tools/integration/sgs134ProductionSummary.py <dir> tools/integration/fixtures/sgs134/fixed-rows.json <out.json> on|off
python3 tools/integration/sgs134CensusDelta.py <delta-dir> tools/integration/fixtures/sgs134/exposure.json <out.json>
npm test -- tests/sgs134SeGateOtherRequests.test.ts
```

Runner: steps 1-5 (staging, 40 probes, ROM both scenes, exposure census, production census) take ~6 minutes; `--delta` adds the 40-shard
base-vs-patched census (~8 minutes on 16 cores).

## 5. Gates (this step: new files only, production untouched)

- `sh tools/integration/sgs134Run.sh .integration/validation/sgs134-20261012/worker-scratch/run1 --delta` (archive of `b9669e7d8` + the
  sgs134 files of `5c170e32f`): **ALL SAME** — scenarios 10 / index SAME; probes ON 10 / 10 and OFF 10 / 10 r1 == r2, 40 / 40 ==
  committed sha256 per scene; rom-r1 / rom-off-r1 SAME, r2 == r1; exposure.json SAME; production-on / -off SAME; patch applies;
  census-delta.json SAME (ALL TRUE).
- `npm test -- tests/sgs134SeGateOtherRequests.test.ts`: 1 file / 9 tests passed; `npm run typecheck`: green; `npm run test:smoke`:
  448 / 448; `git diff --check`: clean; `git status`: no modified tracked file.
- Patched copy (`b9669e7d8` + the diff): `npm run typecheck` green; 205 targeted test files 2,829 / 2,830 (the one sc106 route pin, §1).
- Full suite on the main checkout at `b1631da09` (not required for new files only; run anyway): `npm test -- --shard=1/2` 824 files /
  7,145 tests passed, `--shard=2/2` 823 files / 6,513 tests passed = **1,647 files / 13,658 tests, 0 failed** (44 / 223 skipped);
  `npm run build`: green.
