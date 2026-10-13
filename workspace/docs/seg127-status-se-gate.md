# seg127 (S10A / ISSUES #168 SA2 prep): the controller's IsBattleSEPlaying gate before a Scene ON status animation

Evidence + a banked, UNWIRED pure rule. **No production change**, no existing file edited (new files: this doc,
`tools/integration/seg127{SeLength.py,Probe.py,Stage.py,Sweep.sh,Rom.py,Exposure.ts,ExposureSummary.py,Run.sh}`,
`tools/integration/fixtures/seg127/`, `src/engine/seg127StatusSeGate.ts` (imported by nothing but its test),
`tests/seg127StatusSeGate.test.ts`). FIXED evidence base: master `cfe4e26ca` (production src `b4befa039`), git-archive copies only; direct
mGBA only, explicit lab seeds, every probe job twice in fresh processes (**32 / 32 r1 == r2**, ROM analysis r2 == r1). §0 (the source
prediction) was committed (`71f0d040a`) before any probe ran and is kept verbatim at the end; every prediction held.

## 1. Results first

**The source rule (0 residual on 56 / 56 ROM receipts, both sides):**

```
gate = clamp(seRows[songId] - seAge, 0, 29)
  songId = the last effectivenesssound SE: SE_NOT_EFFECTIVE 12 -> 18 rows, SE_EFFECTIVE 13 -> 73, SE_SUPER_EFFECTIVE 14 -> 88; none -> 0
  seAge  = (statusanimation instruction row + 1) - effectivenesssound instruction row      (the controller's first poll is X + 1)
         = fixedRows[path] + hpDrainRows   when no message is printed in between (else seAge >= 129 > 88: gate 0)
  fixedRows: hit-secondary 44, contact ability (Static / Flame Body / Poison Point / Effect Spore) 49, Cute Charm 47,
             Thrash fatigue (end-turn) 54, Yawn (end-turn, after sandstorm damage) 53
  hpDrainRows = the HP bar's MoveBattleBar steps between them = |from - to| (1 HP per row for max HP >= 48)
```

- **What the gate tests** (`battle_gfx_sfx_util.c:554-571`, `sound.c:606-613`): SE1 / SE2 only (not SE3: the looping low-HP alarm never
  gates); TRUE polls are capped at 29 (the 30th stops SE1 / SE2). Measured on every receipt: launch row = first poll + gate, and
  `controllerRows = gate + activeRows + 1` (sta123's row model unchanged).
- **Which SE**: every animation script drains its own SEs in `Cmd_end` (`battle_anim.c:476-503`), so the only SE that survives into a status
  controller is `effectivenesssound`'s (the hit, the confusion self-hit, the end-turn sandstorm / hail damage). Its length is a source
  constant: `seg127SeLength.py` (ticks to FINE at 0.6 ticks / VBlank) predicts 1 + 17 / 72 / 87 rows and **every receipt measures 18 / 73 /
  88** (`se.L` in `rom-r1.json`; 0 exceptions across the 437 sweep receipts too).
- **sta123's Ice Beam 17 / 18 reproduced** — and explained: it is the damage, not the side (opponent target drained 12 HP -> seAge 56 ->
  17; player target 11 HP -> 55 -> 18).
- **Any printed message between the SE and the status animation makes the gate 0**: "It's super effective!" / "It's not very effective..." /
  "A critical hit!" / weather / ability prints (measured: super effective seAge 209 / 236, not very effective 143..159), so the gate is
  nonzero only after a **neutral, non-crit** hit with a small HP drain (`hpDrainRows < 73 - fixedRows`: < 29 / 24 / 26 / 19 / 20).
- **Turn-start, end-turn ticks, status moves and Synchronize are 0 by construction** (a print + waitmessage precedes them, or no
  effectiveness SE was played); sta123's receipts and the Synchronize / Thunder Wave receipts here agree.

### 1a. Per-class ROM table (`tools/integration/fixtures/seg127/receipts/rom-r1.json`; gate rows ply = player attacker, opp = opponent attacker)

| class (scenario) | carrier (controlled lab staging unless noted) | effectiveness | gate ply / opp | seAge ply / opp | HP drain ply / opp | fixed | rule |
|---|---|---|---|---|---|---|---|
| hit-secondary FRZ (Ice Beam) | **legal** sta123 Delcatty / Shuckle scenarios | neutral | **18 / 17** | 55 / 56 | 11 / 12 | 44 | exact |
| hit-secondary BRN (Flamethrower vs Snorlax) | Primeape (Bulk Up template) | neutral | **8 / 5** | 65 / 68 | 21 / 24 | 44 | exact |
| hit-secondary CONFUSION (Psybeam vs Snorlax) | Primeape | neutral | **15 / 12** | 58 / 61 | 14 / 17 | 44 | exact |
| hit-secondary PSN (Sludge Bomb vs Gyarados) | Primeape | neutral | **1 / 0** | 72 / 79 | 28 / 35 | 44 | exact |
| hit-secondary PRZ (Body Slam vs Snorlax) | Primeape | neutral | 0 / 0 | 90 / 103 | 46 / 59 | 44 | exact |
| hit-secondary PRZ (Body Slam vs Onix) | Primeape | not very effective | 0 / 0 | 143 / 144 | 11 / 12 | (message) | exact |
| hit-secondary BRN (Flamethrower vs Onix) | Primeape | not very effective | 0 / 0 | 152 / 159 | 19 / 27 | (message) | exact |
| hit-secondary PRZ (Thunderbolt vs Gyarados) | Primeape | super effective | 0 / 0 | 209 / 236 | 80 / 107 | (message) | exact |
| contact Static PRZ (Tackle -> Pikachu) | target Pikachu, abilitySlot 0 = Static | neutral | 0 / 0 | 79 / 97 | 30 / 48 | 49 | exact |
| contact Flame Body BRN (-> Magmar) | Magmar slot 0 = Flame Body | neutral | **3 / 0** | 70 / 77 | 21 / 28 | 49 | exact |
| contact Poison Point PSN (-> Nidoking) | Nidoking slot 0 = Poison Point | neutral | **7 / 3** | 66 / 70 | 17 / 21 | 49 | exact |
| contact Effect Spore PRZ (-> Parasect) | Parasect slot 0 = Effect Spore | neutral | **10 / 6** | 63 / 67 | 14 / 18 | 49 | exact |
| Cute Charm INFATUATION (-> Clefable, female) | Clefable slot 0 = Cute Charm | neutral | **8 / 4** | 65 / 69 | 18 / 22 | 47 | exact |
| Synchronize PRZ (Thunder Wave -> Alakazam) | Alakazam slot 0 = Synchronize | status move | 0 / 0 (both receipts) | — | 0 | (no effectiveness SE) | exact |
| Thrash fatigue CONFUSION (Thrash vs Snorlax) | Primeape | neutral (last hit) | 0 / 0 | 84 / 90 | 30 / 36 | 54 | exact |
| Yawn SLP after sandstorm (-> Tyranitar, Sand Stream) | Tyranitar slot 0 = Sand Stream | neutral (sand) | **11 / 11** | 62 / 62 | 9 / 9 | 53 | exact |
| turn-start / end-turn receipts in the same scenarios (frozen, confused, paralyzed, asleep turns; PSN / BRN ticks) | — | — | 0 (22 receipts) | 94..338 | — | — | exact |

Every receipt's `controllerRows = gate + activeRows + 1` (FRZ 133 / 134, CONFUSION 112 / 115, BRN 42..47, PRZ 45 / 49, PSN 72..78,
INFATUATION 101 / 105, SLP 108). Carriers: the Bulk Up templates sta123 used (legal parties, EV totals <= 510) with the attacker lead's
species / moves and the target lead's species replaced = **controlled lab staging** (proof of the source rule, not a Factory set claim);
abilities source-verified by `seg127Stage.py` against `species_info.h`. Seeds: 305419897 except Effect Spore (305419901 both) and
Thunderbolt (ply 305419907 / opp 305419901), the first sweep seed with the receipt (`seg127Sweep.sh`, 12 seeds per scenario; Sludge
Bomb moved off Snorlax: Immunity). Not staged: a crit before a status animation (source: "A critical hit!" + waitmessage -> 0; census 22).

### 1b. Census exposure 0..999 (`fixtures/seg127/exposure.json`; Scene ON production kernel of cfe4e26ca; 8,080 receipts, **0 unclassified**)

| class | receipts (player / opponent) | effectiveness SE open (no print since) | closed by: not very eff. / super / crit / other print / no SE | projected gated receipts | **added gate frames** |
|---|---|---|---|---|---|
| turn-start (sleep / frozen / can't move / confused / in love) | 4,629 (2,237 / 2,392) | 0 | all (the print precedes) | 0 | 0 |
| status-move infliction | 1,529 (708 / 821) | 0 | no SE | 0 | 0 |
| end-turn tick (PSN / BRN / CURSED / NIGHTMARE) | 1,298 (673 / 625) | 0 | all | 0 | 0 |
| hit-secondary (damaging move secondary) | 373 (166 / 207) | 237 (all SE_EFFECTIVE) | 85 / 35 / 16 / 0 / 0 | 59 | **612** |
| contact ability (Static / Flame Body / Poison Point / Effect Spore) | 91 (45 / 46) | 36 | 13 / 11 / 3 / 28 / 0 | 7 | **62** |
| Cute Charm | 5 (1 / 4) | 3 | 0 / 0 / 2 / 0 / 0 | 0 | 0 |
| yawn (end-turn sleep) | 84 (47 / 37) | 16 | 10 / 6 / 2 / 8 / 42 | 5 | **45** |
| thrash fatigue | 51 (27 / 24) | 9 | 14 / 1 / 1 / 19 / 7 | 1 | **10** |
| synchronize | 20 (11 / 9) | 0 | 1 / 1 / 0 / 10 / 8 | 0 | 0 |
| **total** | **8,080** | 301 | | **72** | **729 frames** (~12 s over 1,000 battles; 0.11 % of the ~669,000 status-animation rows) |

Per animation x side (projection, `exposure.json` `projection`): hit-secondary PRZ opp 22 receipts / 221 frames, PRZ ply 15 / 129,
CONFUSION 7 / 63 + 5 / 68, FRZ 3 / 47 + 2 / 11, PSN 1 / 24 + 2 / 38, BRN 0 + 2 / 11; contact BRN opp 4 / 49, PRZ opp 1 / 7, PSN opp 2 / 6;
yawn SLP 1 / 11 + 4 / 34; thrash CONFUSION opp 1 / 10. Gates spread 1..26 (none at the 29 cap: seAge >= 44 always).
Approximation in the projection only (the rule itself takes production's real inputs): the yawn / thrash rows use the one measured
fixedRows of their path (after sandstorm damage / after a plain hit); 2 census yawn receipts follow a confusion self-hit and 11 a hit
(all 11 with drain >= 21, 0 at any fixedRows >= 52), 1 thrash receipt follows sandstorm damage.

## 2. The banked rule (UNWIRED): `src/engine/seg127StatusSeGate.ts`

- `seg127StatusSeGateRows({ songId, seAgeRows })` — the source rule.
- `seg127StatusSeGateRowsForPath({ songId, path, hpDrainRows, messageSinceSe })` — the same in production's inputs.
- `seg127StatusSeGateFromEvents(events, index, hpBarRows?)` — the event-level form SA2 calls: from the segment's kernel payloads it takes the
  last `play-se` (`songId`), any `message` after it, the `hp-change` `from` / `to` after it (`hpBarRows` defaults to |from - to|; pass
  `battleHealthBarAnimationFrames` for max HP < 48), and the path from the message right after the receipt (FATIGUECONFUSION ->
  thrash-fatigue, SXINFATUATEDY -> cute-charm, the "...BY" strings -> contact-ability, FELLASLEEP -> yawn, else a move animation before the
  SE -> hit-secondary).
- `tests/seg127StatusSeGate.test.ts` pins: constants == `fixtures/seg127/rule.json`; all 56 ROM receipts (both forms, residual 0; the
  fixed rows per path; Ice Beam 17 / 18; 16 gated); every effectiveness-SE receipt's measured length == the source constant; the 301 open
  census receipts replayed through the event-level form == the projection (72 gated, 729 frames).

## 3. How SA2 wires it (exact recipe)

1. Call site: `projectBattleResolutionCommands` (`src/engine/battleResolutionPresentation.ts:3490`), its event loop (`:3541`) — the
   `status-animation` payload case that SA1 (sa125) adds next to the `set-battler-status-data` case (`:3828` on `cfe4e26ca`).
2. Inputs, all already in that loop's `events` (the segment's kernel events, `events[i].payload`): the `play-se` payloads (today skipped at
   `:714` / `:821`; kernel `battleScriptEvents.ts:144-147`, emitted by Cmd_effectivenesssound), the `message` payloads, the `hp-change`
   payloads (`from` / `to`), the `animation` `MOVE_ANIMATION` payload, and the `message` right after the receipt.
3. `const gate = seg127StatusSeGateFromEvents(events.map((e) => e.payload), index)?.gate ?? 0` (null never occurs on census 0..999;
   treat it as a flag) and `minimumFrames = gate + STATUS_ANIMATION_ADDED_ROWS[animation]` (sa125's constant table = activeRows + 1).
4. Scene OFF: untouched (no receipt there). Accept: per-class ROM == production on `rom-r1.json` (both sides), census delta = the 729 gate
   frames on the 72 projected receipts only (`exposure.json` `openReceipts` lists every open receipt with its gate).

## 4. Side finding (not measured here)

`HandleStatusIconUpdate` (`battle_controller_player.c:2757` / opponent `:1714`), `HandleMoveAnimation` (`:2470` / `:1450`) and
`HandleBattleAnimation` (`:3068` / `:1992`: every `playanimation`, incl. General_StatsChange) carry the **same** IsBattleSEPlaying gate. A
stat-change animation right after a neutral damaging hit's secondary (no print in between) waits for se_effective too; production's
General_StatsChange command (sc106 / scf117) does not model it. Worth a sibling of this rule (`playanimation` B_ANIM_STATS_CHANGE after
`seteffectwithchance`), same inputs.

## 5. Reproduction (from workspace/)

```
sh tools/integration/seg127Run.sh <fresh-out-dir-inside-the-repo> --census   # archive of cfe4e26ca + seg127 files of HEAD; ALL SAME expected
python3 tools/integration/seg127SeLength.py se_effective se_super_effective se_not_effective
python3 tools/integration/seg127Stage.py <dir>/scenarios
python3 tools/run-mgba-probe.py <o.json> -- <mgba-venv python> tools/integration/seg127Probe.py <scenario> on <o.json> [--seed N]
python3 tools/integration/seg127Rom.py <probe-dir> tools/integration/fixtures/seg127/scenario-index.json <rom.json>
sh tools/integration/seg127Sweep.sh <scenario-dir> <fresh-out> 305419897 12
node --experimental-strip-types --no-warnings tools/integration/seg127Exposure.ts --seeds=A..B --out=<dir>/e<k>.jsonl
python3 tools/integration/seg127ExposureSummary.py <dir> <exposure.json> tools/integration/fixtures/seg127/rule.json
npm test -- tests/seg127StatusSeGate.test.ts
```

## 6. Gates (this step: new files only, production untouched)

- `sh tools/integration/seg127Run.sh .integration/validation/seg127-20261012/worker-scratch/run1 --census` (archive of `cfe4e26ca` + the
  seg127 files of `177203bc0`): **ALL SAME** — scenarios 32 / index SAME, probes 32 / 32 r1 == r2, 64 / 64 == committed sha256, rom-r1
  SAME, rom r2 == r1, rule residuals 0, exposure.json SAME.
- `npm test -- tests/seg127StatusSeGate.test.ts tests/animation/factoryAnimationInventory.test.ts`: 2 files / 16 tests passed;
  `npm run typecheck`: green; `npm run test:smoke`: 448 / 448 (first run caught the parity census flagging an `ABILITY_*`-spelled local
  constant in the new module: renamed `INFLICTED_BY_STRINGS`); `git diff --check`: clean; `git status`: no modified tracked file.
- Full suite on `01e3749a3` (not required for new files only; run anyway): `npm test -- --shard=1/2` 820 files / 7,048 tests passed,
  `--shard=2/2` 820 files / 6,492 tests passed = **1,640 files / 13,540 tests, 0 failed** (44 / 223 skipped; prior 1,639 / 13,532 + this
  test's 8); `npm run build`: green.

## 0. Source prediction (written before probing)

### 0a. What the gate tests

- `PlayerHandleStatusAnimation` (`battle_controller_player.c:2768`) / `OpponentHandleStatusAnimation` (`battle_controller_opponent.c:1727`):
  `if (!IsBattleSEPlaying(gActiveBattler)) { InitAndLaunchChosenStatusAnimation(...); ... }` — re-polled once per controller row.
- `IsBattleSEPlaying` (`battle_gfx_sfx_util.c:554-571`): if `IsSEPlaying()`: `soundTimer++`; while `soundTimer < 30` return TRUE (wait);
  on the 30th playing poll `m4aMPlayStop(SE1)`, `m4aMPlayStop(SE2)`; then `soundTimer = 0`, return FALSE. So **gate rows = min(29, number of
  consecutive controller polls that see an SE playing)**; the launch happens on the first non-playing poll (or the 30th poll).
- `IsSEPlaying` (`sound.c:606-613`): **only the SE1 and SE2 music players** (`gMPlayInfo_SE1` / `gMPlayInfo_SE2`): FALSE when both are
  PAUSEd or neither has a live track bit. **SE3 is not tested** — so the looping low-HP alarm `se_low_health` (`MUSIC_PLAYER_SE3`,
  `song_table.inc:99`) never gates; cries use the cry players, not SE1 / SE2.

### 0b. Which SE can still be playing when a status animation is dispatched

- Every battle-animation script (move animations, `playanimation` B_ANIM_* general animations and the B_ANIM_STATUS_* scripts themselves)
  ends through `Cmd_end` (`battle_anim.c:476-503`), which **keeps the script alive while `IsSEPlaying()`** (up to 90 frames, then stops SE1 /
  SE2). So no SE started inside an animation script survives the `waitanimation` / controller completion that follows it.
- The battle scripts' `playse` opcode appears only in the Battle Arena scripts (`battle_scripts_1.s:4451-4480`), never in Factory battles.
- The one SE started **outside** an animation script on the Factory path is **`effectivenesssound`** (`Cmd_effectivenesssound`,
  `battle_script_commands.c:2001-2046`): the target's controller `PlaySE12WithPanning` (`battle_controller_player.c:2882`, `sound.c:577`) of
  `SE_SUPER_EFFECTIVE` (14) / `SE_NOT_EFFECTIVE` (12) / `SE_EFFECTIVE` (13) by `gMoveResultFlags`; all three on `MUSIC_PLAYER_SE1`
  (`song_table.inc:21-23`). The kernel already emits it as the `play-se` event (songId 12 / 13 / 14); production presentation skips it
  (`battleResolutionPresentation.ts:714`, `:821`).

### 0c. SE lengths from the sound data (`tools/integration/seg127SeLength.py`)

m4a: a fresh song runs tick 0 on its first VBlank (tempoI 150), then `TEMPO 90*tbs/2` -> tempoI 90 = 0.6 ticks / VBlank; status loses its
track bits on the first tick after every track processed FINE.

| SE | song id | ticks to FINE (both tracks) | tick T at VBlank | tick T + 1 at VBlank | predicted SE-playing rows after start |
|---|---|---|---|---|---|
| se_not_effective | 12 | 9 | 15 | 17 | **~16..17** |
| se_effective | 13 | 42 | 70 | 72 | **~71..72** |
| se_super_effective | 14 | 51 | 85 | 87 | **~86..87** |

### 0d. Prediction per class

Let `L` = the SE-playing rows of the most recent effectiveness SE, `e` = rows from that SE's start to the status controller's first
`IsBattleSEPlaying` poll. **Predicted gate = clamp(L − e, 0, 29)** (0 when no effectiveness SE was started in the current action, or it ended).
`e` = `hitanimation` (fixed blink) + `healthbarupdate` drain (damage-dependent) + 1-row instructions + any **message + waitmessage
B_WAIT_TIME_LONG (64)** in between. Any message in between makes `e` > 87 > every `L`, hence 0.

| class (what precedes the status animation in the same execution) | SE in flight | predicted gate |
|---|---|---|
| damaging move, **neutral, non-crit** -> secondary status (`seteffectwithchance` -> MoveEffect{Burn,Freeze,Paralysis,Poison,Toxic,Confusion}) | se_effective (~72) | **clamp(72 − e, 0, 29)**, `e` ≈ hit blink + HP drain: e.g. Ice Beam 17 / 18 (sta123) |
| same, **super effective** | se_super_effective (~87) | **0** ("It's super effective!" + waitmessage 64 in between) |
| same, **not very effective** | se_not_effective (~17) | **0** (message in between, and L is short) |
| same, **critical hit** (any effectiveness) | — | **0** ("A critical hit!" + waitmessage 64) |
| contact ability on the attacker at moveend (Static PRZ, Flame Body BRN, Poison Point PSN, Effect Spore PSN / PRZ / SLP via `BattleScript_ApplySecondaryEffect`; Cute Charm INFATUATION via `CuteCharmActivates`) after a neutral non-crit contact hit | se_effective | **clamp(72 − e, 0, 29)**, `e` a few rows larger than the secondary-status case (seteffectwithchance / tryfaintmon / moveend rows) |
| contact ability after a super / not-very-effective / crit hit | — | **0** |
| Synchronize (the second status animation follows the first one's print + waitmessage) | — | **0** |
| Thrash / Outrage / Petal Dance fatigue (`ENDTURN_THRASH` -> ThrashConfuses) | se_effective of the turn's last hit, if nothing printed since | **clamp(72 − e, 0, 29)** if the thrasher hit last, neutral, non-crit, and no end-turn message precedes; else 0 |
| status move infliction (Toxic, Will-O-Wisp, Thunder Wave, Spore, Confuse Ray, ...): no `effectivenesssound` | — | **0** (sta123 measured 0) |
| turn-start (sleep / frozen / can't move / confused / in love): print + waitmessage first | — | **0** (sta123 measured 0) |
| end-turn ticks (PSN / BRN / CURSE / NIGHTMARE): print + waitmessage first | — | **0** (sta123 measured 0) |

Side: the SE is global (SE1 / SE2) and the controller polls on the status battler's own controller; the predicted gate does not depend on the
side except through `e` (sta123's 17 vs 18 = a 1-row `e` difference to be explained by the probe).

Side finding to verify (out of this step's scope): `HandleStatusIconUpdate` (`battle_controller_player.c:2757`, opponent `:1714`),
`HandleMoveAnimation` (`:2470` / `:1450`) and `HandleBattleAnimation` (`:3068` / `:1992`, every `playanimation` incl. General_StatsChange)
carry **the same gate**: e.g. a stat-change animation after a neutral damaging hit's secondary (Psychic / Crunch / Aurora Beam drops) can wait
for se_effective too.
