# scf117 (S10A, ISSUES #166 slices (e) + (f)): General_StatsChange finished — post-stats-change alignment, the Growl x2 row, the order host, accounting

Base: master `681da5c10` (production src `e00a22788`). Final production src: **`d4988e089`** (unchanged since rung 3, `39d2bde2a`).
Presentation only: no kernel, RNG, damage, turn order or facility change. A live adapter is not whole-playable arbitrary-history
exactness.

## 1. Results first

| Rung | Result | Evidence |
|---|---|---|
| **1 — post-stats-change alignment (both scenes)** | **Landed, 0 residual on every path.** After a presented stats-change command, the command now holds `holdFrames` more rows (present only when > 0): the following print shows its first glyph on rel 77 / 91 + (Δ(print) − Δ(STATS_CHANGE) − 1) + 1, less the `stat` commands in between (they draw nothing; their 2 frames are subtracted, the off108 pause convention). olnd113's joint target moves **−2 / −1 / −1 → 0 / 0 / 0** (Bulk Up G+121, Double Team and Sand-Attack G+119, Scene OFF). **Deviation from olnd113's literal formula, measured:** anchoring on the next *receipt* with lead(stat) = 1 is exact everywhere except AllStatsUp (Silver Wind / AncientPower: `statbuffchange` → `printfromtable`, no `jumpifbyte`), where it would be **+1 late**. issue69's dense ROM frames show that path's write on 283 and the box clear on 285 (print + 1), so the print-anchored rule is the uniform one. With lead(stat) = 0 instead, Bulk Up / Calm Mind / Cosmic Power would be −1 | `battleResolutionPresentation.ts statsChangeNextReceiptHoldFrames`, table 1a, `tests/scf117StatsChangeFinish.test.ts` |
| **2 — the x2 tracker gap (Growl)** | **Landed.** `LIVE_BATTLER_X2_SOURCE_ZEROED` (source-derived, consulted after #148's measured table, before the fallback). Target role: Growl 45, Will-O-Wisp 261, Trick 271. Attacker role: Screech 103, Soft-Boiled 135, Belly Drum 187, Trick 271. Each is an unmeasured power-0 move (fallback "keep"), and its script's last write to that battler's x2 / y2 is an absolute reset (every task listed ends `x2 = 0; y2 = 0`). **scd112's comparator through production: 20 / 20 windows 0 px** (was 19 / 20), r1 == r2; Growl ON corner 144 == ROM (tracker `zeroed: [opponent]`). **Dense live bodies after a Growl** (`liveAdapterFramebuffer.ts`, fresh direct-mGBA source probes twice per fixture): opponent ONIX (rest +1) Fury Cutter bodies 0 / 1 / 3 → 43 / 43 rows 0 px; player SCYTHER (Growl target, pla-scyther-golem-growl-2) and opponent GROVYLE (opp-grovyle-blissey-growl-2) stay 0 px; r1 == r2 on all 5. **Base control**: the post-Growl ONIX body 1 is **19 / 43 rows, 70,910 px** on `681da5c10`; the pre-Growl body 0 is 0 px on both | `liveBattlerX2History.ts`, `fixtures/scf117/x2-live.json`, section 3 |
| **3 — order host / allocator** | **Binding: no change needed (proved).** The order host is event-driven (`factoryRoundBattleOrchestrator.ts`): at a command it applies the events strictly before the command's sequence, lends to a body, then applies the command's own event. The stats-change command carries the STATS_CHANGE event's sequence, so since sc106 the unit is applied at the stats-change command, never at the `stat` command. The order state is read only at a body's activation edge, and no body runs inside the command's rows, so the unit-granular plan is exact for every later body. **Plan: 56 / 58 → class 2** (`spriteOrderStatAnimationPlan`; was null = order invalidated). stat101's Memento rows (slot 3 from rel 2, freed rel 89, inUse 9 → 10 → 9) equal Screech's (47, class 2) row for row. **Allocator: no change**: `LIVE_SPRITE_ALLOCATOR_NET_ZERO_GENERAL_ANIMATIONS` lists STATS_CHANGE for every argument, and the copy is freed inside the unit (rel 67 / 89 ≤ E) | `spriteOrderEventTransform.ts`, `tests/spriteOrderEventTransform.test.ts`, test "rung 3" |
| **4 — accounting** | General_StatsChange is reported on its own line, NOT folded into the move-animation share (section 4) | `docs/animation-integration-live-status.json` `generalAnimations`, `docs/live-share-census.md` |

### 1a. Rung 1 per-path residual table (census seeds 0..199, both scenes; ROM rows from direct-mGBA receipts)

rel = rows after A (the gAnimScriptActive rise); the stats-change command's age 0 = rel 1. "glyph" = the first frame of the first
following message (production prints its first glyph on its first frame). ON and OFF counts are identical except StatUpDoAnim 76
(Double Team's live window owns the banner in Scene ON, sc106).

| STATS_CHANGE path (kernel source label) | frames | next | Δ(next) | hold | glyph rel | ROM glyph rel | residual | ON / OFF commands | ROM source |
|---|---|---|---|---|---|---|---|---|---|
| StatUpDoAnim → StatUpPrintString | 76 | message | 1 | 1 | 78 | 78 | 0 | 38 / 209 | stat101 Harden `nextRel` 77 + 1, `firstScreenChangeAfterE` 78 |
| StatUpDoAnim (sharply) | 90 | message | 1 | 1 | 92 | 92 | 0 | 123 / 123 | stat101 Agility `nextRel` 91 + 1 |
| StatDownDoAnim → StatDownPrintString | 76 | message | 1 | 1 | 78 | 78 | 0 | 114 / 114 | stat101 Growl 77 + 1, fsc 78 |
| StatDownDoAnim (sharply) | 90 | message | 1 | 1 | 92 | 92 | 0 | 114 / 114 | stat101 Screech `nextRel` 91 + 1 |
| StatDown (secondary) | 76 | message | 1 | 1 | 78 | 78 | 0 | 172 / 172 | stat101 Icy Wind `next` StatDown+12 on 77 |
| StatUp (secondary) | 76 | message | 1 | 1 | 78 | 78 | 0 | 35 / 35 | same shape |
| IntimidateActivatesLoop | 76 | message | 1 | 1 | 78 | 78 | 0 | 24 / 24 | stat101 Intimidate 77 + 1, fsc 78 |
| SpeedBoostActivates / EffectFlatter / EffectSwagger (90) | 76 / 76 / 90 | message | 1 | 1 | 78 / 78 / 92 | print + 1 | 0 | 14 / 4 / 23 each scene | kernel Δ (print path) |
| EffectMemento (sharply, psca) | 90 | stat | 3 | 3 | 96 | 96 | 0 | 2 / 2 | stat101 Memento write 93, fsc **96** |
| TickleDoMoveAnim (psca) | 76 | stat | 3 | 3 | 82 | write 79 + 3 | 0 | 5 / 5 | stat101 Tickle write 79 (== kernel 76 + Δ 3) |
| CosmicPowerDoMoveAnim (psca) | 76 | stat | 2 | 2 | 81 | write 78 + 3 | 0 | 15 / 15 | stat101 Cosmic Power write 78 (== 76 + 2) |
| BulkUpDoMoveAnim (psca) | 76 | stat | 2 | 2 | 81 | **81 (G+121)** | 0 | 3 / 3 | off108 rom-r1 (olnd113 joint target) |
| CalmMind / DragonDance (psca) | 76 | stat | 2 | 2 | 81 | write + 3 | 0 | 15 / 11 each scene | kernel Δ, Bulk Up's shape |
| SAtkDown2 (Overheat class, sharply) | 90 | stat | 2 | 2 | 95 | write + 3 | 0 | 26 / 26 | kernel Δ |
| **AllStatsUpAtk** (psca) | 76 | stat | 2 | **1** | **80** | **write + 2** | 0 | 7 / 7 | issue69 dense ROM (write 283, box clear 285) |
| AllStatsUpAtk, first stat won't rise | 76 | message | 3 | 3 | 80 | print + 1 | 0 | 1 / 1 | kernel Δ |
| (stat101 Superpower, AtkDefDown: not in seeds 0..199) | 76 | stat | 3 | 3 | 82 | fsc **82** | — | — | stat101 Superpower write 79, fsc 82 |

Every presented stats-change command in seeds 0..199 (746 ON / 917 OFF) has residual 0 against the kernel rule; the ROM-anchored rows
(Harden, Growl, Intimidate, Memento, Bulk Up, AllStatsUp, plus the write rows of Tickle / Cosmic Power) fix the rule itself.
`firstScreenChangeAfterE` is contaminated by the elevated GOLBAT's shadow return (E + 2) on Agility, Screech, Icy Wind, Cosmic Power
and Tickle, so those rows use `nextRel` / the stat write instead.

## 2. Pins moved (all timing, each exactly explained)

| File / test | Move | Why |
|---|---|---|
| `olnd113SceneOffPauses.test.ts` joint target | first message 119 / 118 / 118 → **121 / 119 / 119**, residual −2 / −1 / −1 → **0** | rung 1 (Bulk Up hold 2, DT / Sand-Attack hold 1) |
| `sc106StatsChangeCommand.test.ts` Acid Armor (seed 0 slot 2) | following message +1; route total 6,669 → 6,677 | 7 holds of 1 + 1 frame of A-on-even-frame dismissal parity (7 is odd) |
| `sc106StatsChangeCommand.test.ts` Sand-Attack (seed 3 slot 3) | anchors + (i + 1) | one hold frame per crossed stats-change command |
| `sc106StatsChangeCommand.test.ts` Icy Wind / Intimidate | following message +1 | hold 1 |
| `sc106StatsChangeCommand.test.ts` Tickle (seed 13 slot 3) | following `stat` +3; total 9,091 → 9,102 | holds 3 + 3 + 1 + 1 + 1 + 1 = 10, + 1 dismissal parity |
| `sc106StatsChangeCommand.test.ts` live Double Team (seed 10 slot 2) | total 4,870 → 4,873 | 3 Acid Armor holds of 1 (the DT message stays on 837) |
| `battleTurnPortability.test.ts` | the projected stats-change command gains `holdFrames: 1` | Sand-Attack print path |
| `spriteOrderEventTransform.test.ts` stat classes | 56 / 58: null → class 2 | rung 3 |

## 3. Rung 2 detail

Source scan (`battle_anim_scripts.s`, flattened through `call` / `goto`): every move whose role has no measured row and whose script
writes that battler's x2 with an absolute-reset task (ShakeMon, ShakeMon2, ShakeAndSinkMon, TranslateMonElliptical,
SlideMonToOriginalPos, SlideMonToOffsetAndBack, SwayMon, ShakeTargetBasedOnMovePowerOrDmg) while the fallback says "keep":

- **Added (power 0, last write to that battler is the reset):** Growl 45 target (ShakeMon2; then SoundTask_WaitForCry only),
  Will-O-Wisp 261 target (ShakeMon2; then fire sprites), Trick 271 both (StretchTarget/AttackerUp end `x2 = y2 = 0` too, then ShakeMon),
  Screech 103 attacker (ShakeMon2; then rings and SwayMon on the target), Soft-Boiled 135 attacker (ShakeMon; then egg / ring / star
  sprites), Belly Drum 187 attacker (BellyDrumLeft's ShakeMon; then a note sprite and the blend clear).
- **Not added (follow-up):** damaging moves whose ATTACKER is reset (#148's documented fallback keeps unmeasured attackers):
  Flamethrower 53, Hydro Pump 56, Hyper Beam 63, Strength 70, Dragon Rage 82, Waterfall 127, AncientPower 246, Overheat 315,
  Signal Beam 324, Dragon Claw 337, Volt Tackle 344, Psycho Boost 354 (tails checked for 53 / 56 / 63 / 70 / 82 / 127 / 246: only
  particle sprites / target tasks / SlideMonToOriginalPos after the reset); Spit Up 255 / Swallow 256 (branching scripts). They matter
  only for an opponent ONIX / RATTATA attacker (the only non-zero rests).

## 4. Accounting (rung 4) and census

**General_StatsChange line (census seeds 0..999, final src `d4988e089`), reported separately from the move-animation share:**

| scene | stats-change commands | frames (incl. holds) | hold frames | sharply | played by the ROM | not presented |
|---|---:|---:|---:|---:|---:|---|
| ON | **3,667** | **302,540** | 4,192 | 1,404 | 4,529 | 862 live-Double-Team exemptions (their 230-row window owns the banner) |
| OFF | **4,529** | **368,914** | 5,054 | 1,404 | 4,529 | none |

Kernel STATS_CHANGE events 4,552 = 4,529 played + 23 behind a Substitute (stat101's definition). `stat101Exposure.ts` +
`stat101ExposureSummary.py` rerun on the landed tree: identical counts to stat101 (4,552 events in 878 battles, by-arg / by-class /
side / Substitute tables equal); census frames 15,226,717. **Played == inserted:** OFF 4,529 == 4,529; ON 3,667 == 4,529 − 862 (the DT
choice). Per-scene numbers from `scf117Align.ts` 0..999 (residual 0 on all 22 paths in both scenes); the ON line equals the census's
presented stats-change rows (302,540). Accounting: `docs/animation-integration-live-status.json` `generalAnimations.STATS_CHANGE`
(live, both scenes, evidence chain stat101 → stat102 → sc106 → scd112 → olnd113 → scf117) and the `docs/live-share-census.md` line.

**Census delta (base `681da5c10` vs final, sc106LiveShareCensus.ts, 10 `--index-from` shards each, hist73Merge.py + scf117CensusDelta.py):**

- Move-animation commands 27,429 / 27,429, live 27,099 / 27,099 (**98.80 % / 99.27 %** in both trees). **0 status changes**: no rung-2
  or rung-3 lift on these seeds (no live body sat behind a 56 / 58 order invalidation or depended on a post-Growl rest change in a
  way the census classifies), and **0 live → fallback**. Live frames 4,028,456 → 4,028,454: the one changed command is battle 881's
  budget-cut final Struggle (60 → 58 frames).
- KEY sequence identical in every battle; the 3 budget-stalled battles (434 / 796 / 881) end at the same command counts (238 / 185 /
  264): proven prefixes. **battleDigestExcludingFrames identical on 10 / 10 shards.** Played / terminal / stalled 1000 / 997 / 3.
- Stats-change events 4,552 / 4,552, presented 3,667 / 3,667, 0 event mismatches; presented rows 298,348 → 302,540 = **+4,192 = the
  rung-1 holds** (hold 1 × 3,174, 2 × 463, 3 × 29, 5 × 1).
- Frames 15,222,471 → 15,226,717 (+4,246). Every battle's delta is even: the census driver presses A on even frames in
  awaiting-message-dismiss, so each held stats-change shifts later dismissals by its hold rounded to the press parity (561 battles
  differ from Σholds by that rounding; none outside it).
- Scene ON / OFF gameplay parity on a Double Team route: `sc106StatsChangeCommand.test.ts` "Scene ON / OFF gameplay parity" (seed 0
  slot 2, seed 13 slot 3) and olnd113's DT seed 2 (both scenes) pass on the final tree.

Receipt: `tools/integration/fixtures/scf117-live-receipt.json` (keyed on src `d4988e089`).

## 5. Gates

Final code = commit `5f09fc1b5` (production src `d4988e089`, unchanged since rung 3 `39d2bde2a`; later commits are tests / tools / docs).

- Targeted (4 workers): scf117StatsChangeFinish, olnd113SceneOffPauses, sc106StatsChangeCommand, battleTurnPortability,
  spriteOrderEventTransform, scd112StatsChangeRender, statsChangeReducer, liveSpriteOrderHost, animation/factoryAnimationInventory,
  playableAnimationIntegration, substituteFadePresentation, substituteSwapPresentation, liveBattlerX2History,
  animation/liveEndeavorAdapter, battleResolutionPresentation: **15 files / 227 tests passed**.
- `npm run typecheck`: green. `npm run test:smoke`: **448 / 448**.
- Full suite (4 workers per shard): first pass shard 1 817 / 7,030 passed; shard 2 **3 failed** (randomRoundSoak frame pins: full seed 1
  27,061 → 27,052, vanilla seed 0 9,143 → 9,145, seven-win renderCalls 2,727 → 2,728; `soak111Decoupling.ts` decision AND canonical
  logs SAME vs 681da5c10 on full / vanilla seeds 0 / 1, same battle / turn / endState) → pins moved (`5f09fc1b5`). Rerun of BOTH
  shards (run side by side, 4 workers each): shard 1 **817 files / 7,030 tests passed** (22 / 119 skipped), shard 2 **816 files /
  6,442 tests passed** (22 / 104 skipped), 0 failed.
- `npm run build`: green.
- `npm run compare:differential -- fight-submenu battle1-postwin-next-prompt presentation-rng-playable-live-bodies-seeded-on --base 681da5c10`:
  **PASS, 624 / 624 captures byte-identical**; both canonical railroad traces byte-identical; no capture moved (none falls on a
  stats-change command or after a Growl / source-row move).
- `git diff --check 681da5c10`: clean.
- Not run: `scf117Run.sh` end to end (its pieces ran individually: align, stat102 ROM frames ALL SAME, the comparator r1 == r2, the
  dense x2 bodies, the census, align / exposure 0..999, the receipt).

## 6. Follow-ups (not in scope)

- **The live Double Team window's own gap** (sc106 §2): the 230-row window ends at stats-change rel 68 while the ROM's next
  instruction is rel 77 and the glyph rel 78 → production's DT message is **9 rows early** (Scene ON only; Scene OFF DT now gets the
  generic command and is exact, table 1a). Evidence: dt60 `-long` probes (script end row 158, StatsChangeAnimation at row 162 = rel 1)
  and battle-move-anim-notes §9.1-9.2 (BLDCNT 2127 = rel 2, box 2203 = rel 78). Fix shapes: a 9-row residual after a live DT body, or
  trim the window to its body (row 157) and let the generic command own the banner (moves the DT pins).
- The damaging-move attacker x2 rows (section 3).
- scd112's constructed comparator segment (`scd112Windows.ts`) still builds the stats-change command without the rung-1 hold, so its
  `nextCommandRows` keep showing the 1-row-early glyph on the print path; production routes carry the hold (table 1a).

## 7. Reproduction (from workspace/)

```
sh tools/integration/scf117Run.sh <fresh-out-dir-inside-the-repo>            # align 0..199 both scenes (residual 0), stat102 ROM frames (ALL SAME),
                                                                               # scd112 comparator x2 (20 / 20, r1 == r2), dense x2-live bodies, receipt
sh tools/integration/scf117Run.sh <fresh-out-dir-inside-the-repo> --census   # + census 0..999 base vs final, align / exposure 0..999
npx vitest run tests/scf117StatsChangeFinish.test.ts
node --experimental-strip-types --no-warnings tools/integration/scf117Align.ts --seeds=0..49 --scene=on --out=<f.jsonl>
python3 tools/integration/scf117AlignSummary.py <align-dir> <out.json>
python3 tools/integration/scf117CensusDelta.py <census-base-dir> <census-final-dir> <out.json>
python3 tools/integration/scf117Fixtures.py <probe-dir> <fixture-dir>    # fury99Fixtures.py over fixtures/scf117/scenarios
```
