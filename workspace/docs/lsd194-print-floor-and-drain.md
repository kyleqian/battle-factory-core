# lsd194 -- the `waitmessage B_WAIT_TIME_LONG` print floor (msg189) and the Leech Seed turn-end drain (lsd186)

Base `6b6d1d128`. Branch `worker/integration-20261017-013328`. Presentation only: no kernel event, RNG draw, HP value or turn order changes
(census section 7: kernel-event digests identical in every battle, both scenes).
Receipts: `tools/integration/fixtures/lsd194/` (`rom/`, `drain/`, `dense/`, `scenarios/`, `rom-print-runs.json`, `print-production-vs-rom.json`,
`drain-production-vs-rom.json`, `census-{on,off}.json`). Tools: `lsd194Probes.sh`, `lsd194PrintRuns.py`, `lsd194Production.ts`, `lsd194PrintCompare.ts`,
`lsd194DrainCompare.ts`, `lsd194DrainDense.ts`, `lsd194Census.{ts,sh}`, `lsd194CensusDelta.py`. Tests: `tests/lsd194PrintFloorAndDrain.test.ts`.

## 1. Part A -- the 24-row floor on `WAITMESSAGE_LONG_TIMING` is an over-hold

Production printed a `waitmessage B_WAIT_TIME_LONG` line for `max(24, L) + 64` rows (L = printable glyph count), the ROM prints it for `L + 64`
(typing is one glyph per row, `B_WAIT_TIME_LONG` = 64, `reference/pokeemerald/include/constants/battle.h:324`). The 24 came from the
effectiveness-line cards of `docs/battle-message-hold-cadence-ground-truth.md` (sec. 4-5 there; "It's not very effective..." is exactly 24 glyphs and
"hold after typing = 64 + 13 / 64 + 2" is the 64 plus the *next* action's pre-print rows, not part of the print). Its sec. 5 `max(24, 21) = 24` bind-plan text
is historical: `STAT_CHANGE_MESSAGE_TIMING` copied the 24 from `MESSAGE_TIMING` (a non-print message floor), which is a different mechanism.

Change: `WAITMESSAGE_LONG_TIMING = {minimumFrames: 0, holdFrames: 64}` (commit `5a11553e1`). `MESSAGE_TIMING` (24 / 0), `RETURN_MON_TIMING` and
`SWITCH_IN_MESSAGE_TIMING` are untouched (no ROM rows of their own; Tier-1 control in `lsd194PrintFloorAndDrain.test.ts`).

### 1.1 ROM rows (twice-fresh: r1 == r2 byte-identical rows and RGB for every receipt, `rom/r1-r2-identity.txt`)

A "print run" is a `waitmessage` run (consecutive frames on one `gBattlescriptCurrInstr`) whose first glyph is at run row `first`; `toNext` = run length - first =
first glyph -> the next instruction = `L + 64` (production's next command starts on G + 1). Five classes x both scenes, 15 prints, residual vs production = 0 on all:

| class (scenario) | print | L | ROM first glyph -> next | production (`lsd194Production.ts`) | residual |
| --- | --- | ---: | ---: | ---: | ---: |
| super effective (mechanic-hit-chain, Water Gun vs NOSEPASS) | "It's super effective!" | 21 | 85 (OFF = ON) | 85 | 0 |
| crit (mechanic-hit-chain-crit) | "A critical hit!" | 15 | 79 (OFF = ON) | 79 | 0 |
| failed (off108 Snore) | "But it failed!" | 14 | 78 (OFF = ON) | 78 | 0 |
| OHKO (gate6-ohko-hit) | "It's a one-hit KO!" | 18 | 82 (OFF = ON) | 82 | 0 |
| stat up (off108 Bulk Up) | "PRIMEAPE's ATTACK rose!" | 22 | 86 (OFF = ON) | 86 | 0 |
| stat up (off108 Bulk Up) | "PRIMEAPE's DEFENSE rose!" | 23 | 87 (OFF = ON) | 87 | 0 |
| controls, L >= 24 | "It's not very effective..." (x2 classes) | 24 | 88 (OFF = ON) | 88 | 0 |

(15 rows in `print-production-vs-rom.json`: 5 classes x 2 scenes, the not-very-effective control inside the super-effective and crit scenarios.)
The old floor over-held every L < 24 print by `24 - L` (3 / 9 / 10 / 6 / 2 / 1 rows for the six lengths above); an L >= 24 print never changed.

## 2. Part B -- the Leech Seed turn-end drain

### 2.1 Derived from source

`BattleScript_LeechSeedTurnDrain` (`data/battle_scripts_1.s`): `playanimation BS_ATTACKER, B_ANIM_LEECH_SEED_DRAIN, sB_ANIM_ARG1; orword gHitMarker,
HITMARKER_IGNORE_SUBSTITUTE | HITMARKER_PASSIVE_HP_UPDATE; healthbarupdate; datahpupdate; copyword gBattleMoveDamage, gHpDealt; jumpifability LIQUID_OOZE; manipulatedamage;
setbyte; goto BattleScript_LeechSeedTurnPrintAndUpdateHp` (`orword; healthbarupdate; datahpupdate; printfromtable; waitmessage B_WAIT_TIME_LONG`).

- **The passive-bar rule is the ordinary bar rule.** `HITMARKER_PASSIVE_HP_UPDATE` is read in exactly one place, `Cmd_datahpupdate`
  (`battle_script_commands.c:1932-1960`): it only suppresses the Counter / Mirror Coat / Shell Bell damage records. It adds no wait. `Cmd_healthbarupdate`
  queues the controller request and `Cmd_datahpupdate` blocks on that controller, so the `datahpupdate` run is `bar + 2` rows (the bar's frames plus the
  request / release rows), with **no 28-row floor** (the 28 is the ordinary hit's `attackanimation; waitanimation; healthbarupdate` floor, not part of `healthbarupdate`).
- **Lead** (last presented MoveEnd row -> the seeded bar's first row): the "was seeded!" print's `goto` row + 9 MoveEnd rows are 10 rows; production presents 2 of them as
  the sprite-visibility rows (`LEECH_SEED_DRAIN_PRE_ROWS = 8` are the rest) plus the drain script's own executions through the seeded `healthbarupdate`
  (`provenance.instructionExecution` of the `datahpupdate`: `playanimation`, Scene OFF's `Pausex20` 33 rows (32 + a return row), `orword`, `healthbarupdate` = 36 on OFF)
  = 8 + 36 = 44 rows + the 2 sprite rows = 46 (ROM OFF seeded bar at A + 46).
- **Scene ON**: `playanimation` runs the real `General_LeechSeedDrain`; the script (`data/battle_anim_scripts.s`, `LEECH_SEED_DRAIN`) is `delay 0` (2 ticks) +
  `Move_ABSORB`'s body (206 rows: 10-row window lead + 194-row window + 2 to the script end, the same 194 as the liveMoveAnimation case 71 comment) = **208 rows**.
  `LEECH_SEED_DRAIN_ANIMATION_ROWS = 208`; the lead term grows by `208 - 1` (the `orword` row the 208-row run already holds) and Scene ON has no `Pausex20`, so its script executions
  through the `healthbarupdate` are 3 (`playanimation`, `orword`, `healthbarupdate`): lead = 8 + 3 + 207 = 218 rows + the 2 sprite rows = 220 (ROM ON seeded bar at A + 220).
- **Gap**: the seeded bar's tail = the executions from the seeded `datahpupdate` to the receiver's (`datahpupdate`, `copyword`, `jumpifability`, `manipulatedamage`, `setbyte`,
  `goto`, then `orword; healthbarupdate`): 8 rows, so the receiver bar starts `bar + 2 + 7` rows after the seeded one (the "7 gap rows").
- **Receiver bar + print**: `datahpupdate`, `printfromtable`, `waitmessage` = `HP_PRINT_TAIL_FRAMES` (3); the sapped print then types from its first glyph.
- **Liquid Ooze** (`jumpifability` skips `manipulatedamage; setbyte`): the executions differ, so the 8-row tail does not hold; `leechSeedDrainRole` requires the receiver's
  `instructionExecution` to be exactly 8 after the seeded one and falls back to the unchanged hp timing otherwise (not measured, left as is).

### 2.2 Implementation (`src/engine/battleResolutionPresentation.ts`, shared by both scenes)

- `leechSeedDrainRole(events, i)`: "seeded" / "receiver" by the program counter of the `datahpupdate` after `BattleScript_LeechSeedTurnDrain` / `...PrintAndUpdateHp` and the paired
  8-execution difference. Seeded hp command: `{minimumFrames: 0, tailFrames: 8}`, preceded by a `general-animation` command `LEECH_SEED_DRAIN` whose duration is the lead
  (`8 + instructionExecution`, `+ 207` when the event stream carries the `LEECH_SEED_DRAIN` animation payload = Scene ON). Receiver hp: `{minimumFrames: 0, tailFrames: 3}`.
- The renderer needs no change: `battleResolutionCommandDuration` already prices `general-animation` as `timing.minimumFrames` and `hp` as `max(min, bar + 1) + tail`;
  `generalAnimationRenderView` returns null for any animation but FOCUS_PUNCH_SETUP, so the field is held (both bars full, "was seeded!" box) for those rows.
- `BattleHpTiming.minimumFrames` is now `28 | 0`; every non-drain hp command keeps 28.

### 2.3 ROM rows vs production (rows relative to A = the first row after the "was seeded!" print; every row residual 0, `drain-production-vs-rom.json`)

Six cases (3 scenarios x both scenes). ROM receipts are lsd186's, re-run fresh a third time (`drain/r1-r2-identity.txt`: r1 == r2, rows and RGB identical, and the fresh r1 reproduce
the lsd186 receipts byte-identically).

| case | scene | lead (A -> seeded bar) | seeded bar start | gap rows | receiver bar start | sapped print first glyph | residual (every row) |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| player seeds, tackled (seed 57) | OFF | 44 + 2 sprite rows | 46 | 7 | 68 | 83 | 0 |
| opponent seeds, tackled (seed 4) | OFF | 44 + 2 | 46 | 7 | 68 | 82 | 0 |
| player seeds, receiver at full HP (seed 4, Tail Whip) | OFF | 44 + 2 | 46 | 7 | 68 | 72 | 0 |
| player seeds, tackled | ON | 218 + 2 | 220 | 7 | 242 | 257 | 0 |
| opponent seeds, tackled | ON | 218 + 2 | 220 | 7 | 242 | 256 | 0 |
| player seeds, full HP | ON | 218 + 2 | 220 | 7 | 242 | 246 | 0 |

Compared fields per row: lead, seeded bar start and command length, gap, receiver bar start and command length, both bars' first changed pixel row, the print's first glyph
(the hp bar's row counts come from `battleHealthBarAnimationFrames`; receiver at full HP is a 0-HP-change bar, command length 4). The "was seeded!" print itself is now exact too ("ONIX was seeded!" L = 16 -> 80 rows, "Foe ONIX was seeded!" L = 20 -> 84 rows; both were 88 under the floor).
Scene OFF's `Pausex20` rows are not presented as a separate command in production; the same `general-animation` hold spans them (44 rows = 8 + 36).

### 2.4 Dense ROM pixel window across the drain through production (`dense/`, `lsd194DrainDense.ts`)

Window = the "was seeded!" print's first row .. the end of the "sapped by LEECH SEED!" print, ROM raw RGB vs `renderBattleResolutionLiveView` at each production row (A <-> ROM D - 10).

| case | scene | rows | pixel-exact rows | px: message box / healthboxes+other / player sprite / opponent sprite |
| --- | --- | ---: | ---: | --- |
| opponent seeds, tackled | OFF | 263 | **263** | 0 / 0 / 0 / 0 |
| opponent seeds, tackled | ON | 437 | 259 (all 219 non-animation rows + 40 animation rows) | outside the 218-row animation span: 0 / 0 / 0 / 0 |
| player seeds, tackled | OFF | 272 | 44 | 0 / 0 / 0 / 248,748 (1,091 px per row, constant) |
| player seeds, tackled | ON | 446 | 99 | outside the animation span: 0 / 0 / 0 / 154,922 (1,091 px per row, 142 rows) |
| player seeds, full HP | OFF | 261 | 44 | 0 / 0 / 0 / 236,747 (1,091 px per row) |
| player seeds, full HP | ON | 435 | 40 | outside the animation span: 0 / 0 / 0 / 236,747 (1,091 px per row) |

- **Every message-box, healthbox (HP bar, HP numerals, names) and player-sprite pixel outside the Scene ON animation span matches the ROM** in all six cases, so the bars, the 7-row gap, the
  lead and both prints are pixel-exact, not only timing-exact.
- Scene ON animation span (218 rows = 2 sprite rows + the 208-row hold + the row): the ROM draws Absorb's orbs / hit splat and darkens the background; production holds the field. The differences
  there are the expected undrawn animation (it is the residual in section 5), e.g. opponent-seeds ON: 751,551 opp / 682,935 player-sprite / 1,700,278 other px over the 218 rows.
- The constant 1,091 px per row in the player-seeds cases is the **foe ONIX's idle pose** (the foe sprite that used Tackle earlier in the same turn): it is present from the first row of the
  "was seeded!" print (before any drain row), identical on every row, absent in the opponent-seeds cases (ONIX is the player's back sprite there, exact), and the ROM's pose is
  constant across the window. It is not a drain row and was not touched; see section 5.

## 3. The other passive-bar users (poison / burn / weather / Leftovers / Wish): same bar path, different script shapes, no ROM rows -> not extended

All five end in the same `healthbarupdate; datahpupdate` pair, so the bar-is-`bar + 2` rule is the same source path, but the lead and tail script shapes differ, and every one needs its own ROM row:

| user | script (source) | lead before the bar | tail after `datahpupdate` | `HITMARKER_PASSIVE_HP_UPDATE` |
| --- | --- | --- | --- | --- |
| poison / Toxic / burn | `BattleScript_PoisonTurnDmg` / `BurnTurnDmg`: `printstring; waitmessage 64; statusanimation; orword; healthbarupdate; datahpupdate; tryfaintmon; checkteamslost; end2` | print + 64 hold + status animation (`statusanimation` is a real animation on ON, skipped on OFF) | `tryfaintmon`, `checkteamslost`, `end2` | set |
| sandstorm / hail | `BattleScript_DamagingWeatherContinues`: `printfromtable; waitmessage 64; playanimation_var; setbyte; orword; effectivenesssound; hitanimation; waitstate; healthbarupdate; datahpupdate; tryfaintmon; ...` | print + 64 + weather animation + hit animation + waitstate | as above | set |
| Leftovers | `BattleScript_ItemHealHP_RemoveItem`: `playanimation B_ANIM_HELD_ITEM_EFFECT; printstring; waitmessage 64; orword; healthbarupdate; datahpupdate; removeitem; end2` | item animation + print + 64 | `removeitem`, `end2` | **not set** (IGNORE_SUBSTITUTE only) |
| Wish | `BattleScript_WishComesTrue`: `trywish; playanimation B_ANIM_WISH_HEAL; printstring; waitmessage 64; orword; healthbarupdate; datahpupdate; printstring; waitmessage 64` | wish animation + print + 64 | the "regained health" print | **not set** |

So (a) the passive flag is *not* what makes the bar shape; Leftovers and Wish have no passive flag and the same `bar + 2`; (b) each user's lead (animation + print + hold) and tail
differ from Leech Seed's, and no twice-fresh ROM rows with row-level bar starts exist in `tools/integration/fixtures` or the docs for them (`docs/end-turn-ground-truth.md` has the HP-landing
frames of burn / Toxic ticks, not bar rows). Their hp commands therefore still carry the 28-row floor and their current residuals are exactly the lsd186 pattern (a floor over-hold of
`28 - (bar + 1)` rows and an unmodelled lead); they are listed here and not extended. Next action: stage poison, burn, sandstorm, Leftovers, Wish (and Toxic) lab scenarios the way
`lsd186` staged Leech Seed, run `lsd194Probes.sh` twice, and add each user's lead/tail with its own ROM row.

## 4. Re-pins (frames moved by my change only; none of ont193's pins moved by the drain)

Floor drop (`5a11553e1`): `tests/battleResolutionPresentation.test.ts` and `tests/battleTurnPortability.test.ts`, every moved pin attributed to its print's `24 - L` in the commit message.
`tests/ont193SceneOnTails.test.ts` (`9d04fca52`): the trn176 anchor evaluator for Bulk Up moved by exactly the two stat prints' over-holds -- first print L = 22 (-2), second L = 23 (-1):
ON `anchorStartDelta` -1 -> -3 (-2), `anchorEndDelta` 0 -> -3 (-2, -1), `residual` 0 -> -3; OFF `anchorStartDelta` -1 -> -3, `anchorEndDelta` 0 -> -3; Sand-Attack / Protect / Detect unchanged.
The earlier 0 / -1 hid a -3 offset located between the two stat prints (OFF, localised against `off108` ROM `rom-r1.json`): the ATTACK print (`BulkUpDoMoveAnim+40`) matches
exactly (first glyph production row 141), then the ROM runs four single-row instructions (`BulkUpTryDef+0 / +6 / +12 / +23` = `setstatchanger`, `statbuffchange`, `jumpifbyte`, `printfromtable`)
before the DEFENSE print's wait run (`BulkUpTryDef+28`, first glyph one row later), whereas production presents the 2-row `stat` command and starts the DEFENSE message 3 rows early
(229 vs ROM 232). The floor's over-hold happened to cancel it; it is not a print row, was not introduced by lsd194, and is listed in section 5.

## 5. Residuals and next actions

1. **Scene ON drawing of `General_LeechSeedDrain`** (208 rows, held field now). Next action: draw it as `Move_ABSORB`'s body: the existing ABSORB live body in `src/animation/`
   (the liveMoveAnimation case 71 window, 194 rows) driven by the `general-animation` command's age (`generalAnimationRenderView` currently returns null for LEECH_SEED_DRAIN), reusing the ABSORB body's existing orb / hit-splat /
   heal components and assets; the drawing work is wiring that body to the drain's battler pair and the 2 + 206 row offsets above. Then re-run
   `lsd194DrainDense.ts` ON: the animation-span pixel counts in section 2.4 are the acceptance numbers to take to 0.
2. **Foe-sprite pose after the foe's own Tackle** (1,091 px per row, opp region, player-seeds cases only, from the print's first row): not a timing row; next action: dump the ROM foe ONIX frame
   vs `renderBattleResolutionLiveView`'s (`lsd194DrainDense.ts --dump=-40`, `.png` side by side) and compare the idle pose source (`liveBattlerX2History` for the foe after a no-hit attacker).
3. **Bulk Up -3 offset between the two stat prints** (ON and OFF; `ont193SceneOnTails` Bulk Up pins -3 / -3 / -3): localised (not fixed): ROM has 4 single-row instruction runs
   (`BulkUpTryDef+0 / +6 / +12 / +23`) after the first stat print, production's second `stat` command is 2 rows. Next action: model the second `statbuffchange` gap (the first stat
   command's pre-print rows with `setstatchanger` / `statbuffchange` / `jumpifbyte` / `printfromtable` executed, plus the first glyph row) with its own ROM row, then un-pin the -3.
4. **Poison / burn / weather / Leftovers / Wish bars** (section 3): floor 28 retained, no ROM rows.
5. **Unpinned scope of the drain**: the 8-row pre-lead was measured with the "was seeded!" print as the only predecessor (all six ROM cases); a drain after another end-of-turn
   effect (a status tick, weather) has different MoveEnd rows before it; Liquid Ooze drains fall back to the old hp timing.

## 6. Acceptance numbers

1. Print classes: 15 / 15 ROM prints at residual 0 (5 classes x 2 scenes), r1 == r2 for all 10 print receipts + 6 drain receipts.
2. Six lsd186 ROM drain receipts vs production: every row (lead, bars, gap, print glyph) residual 0 in both scenes (`lsd194DrainCompare.ts`).
3. Dense ROM window across the drain: section 2.4 (opponent-seeds OFF 263 / 263 rows pixel-exact; all other cases exact outside the ON animation span except the constant foe-pose px).
4. Tier-1: `tests/lsd194PrintFloorAndDrain.test.ts` (12 tests: floor L < 24 x 2 scenes, L >= 24 control x 2 scenes, MESSAGE_TIMING control, drain layouts x 6, 208-row hold).
5-8: see section 7 (census, differential, gates).

## 7. Census, differential and gates

### 7.1 Census 0..999, both scenes, base `6b6d1d128` vs final `3ded8b23f` (src/tools identical to `f088fa73e`)

`lsd194Census.sh` (6 jobs, 25-seed parts) + `lsd194CensusDelta.py`; receipts `tools/integration/fixtures/lsd194/census-{on,off}.json`. 1000 battles per scene.

- **Kernel digests identical**: `digestMismatch = []`, `errorMismatch = []`, `typeSequenceChanged = []` (the command *type* sequence is unchanged once the inserted `LEECH_SEED_DRAIN` animations are skipped) in both scenes.
  85 battles per scene end in an error in BOTH trees (identical text): 82 are the pre-existing `battleHealthBar: invalid HP program` throw of the census harness (present in the base tree; digests equal, 82 / 82)
  and 3 (seeds 434, 796, 881) are `frame budget` stalls, whose digest differs only because the 200k-frame budget cuts the battle at a different command once the presentation frames shifted (reported as `budgetTail`, not a gameplay change).
- **0 unattributed commands** in both scenes. Every changed command is one of:

| class | ON | OFF |
|---|---|---|
| Print floor, L < 24 (msg189), frames = L - 24 exactly | 15,782 commands, -69,105 frames | 15,806 commands, -69,185 frames |
| Print floor, L >= 24 (timing 24 -> 0, frames unchanged) | 32,564 commands, 0 frames | 32,960 commands, 0 frames |
| Inserted `LEECH_SEED_DRAIN` animations | 451 (445 x 218 rows, 6 x 11 rows = animation not played) in 48 battles | 451 x 44 rows in 48 battles |
| Seeded `hp` (min 28 -> 0, tail 0 -> 8) | 451 | 451 |
| Receiver `hp` (min 28 -> 0, tail 0 -> 3) | 442 | 442 |

  Print floor by L (commands, ON | OFF): 12 29 | 29, 13 8 | 8, 14 2417 | 2417, 15 1142 | 1149, 16 172 | 172, 17 415 | 415, 18 307 | 307, 19 984 | 984, 20 1292 | 1292, 21 3712 | 3712, 22 1570 | 1570, 23 3734 | 3751
  (frames = -(24 - L) each). Messages with extra hold rows (hold != 64, e.g. the 73-row move-name prints) are included: only `minimumFrames` 24 -> 0 and the presented frames change.
  The seeded / receiver frame deltas are not a constant: they are `28 - (bar + 1)` over-hold removed plus the new tail (seeded +8, receiver +3), a per-battle function of the bar length; the delta histograms are in the receipts.
- Battles: 995 of 1000 changed (every battle has a short print), 5 identical, per scene.

### 7.2 Differential

`npm run compare:differential -- fight-submenu battle1-postwin-next-prompt presentation-rng-playable-live-bodies-seeded-on --base 6b6d1d128`: **PASS, 641 captures byte-identical across 3 traces**
(235 + 216 + 190). No difference to attribute.

## 8. Re-pins found by the full suite (per-pin attribution) and the gates

The full suite (`npm test`, `POKEBENCH_VITEST_MAX_WORKERS=2`, nohup + exit file) found frames-only pin movements in four files beyond ont193's (all kernel-digest-identical; battle / turn / end state unchanged).
Every moved pin was attributed by measurement and re-pinned (`495a7d6f0`, `8b820a135`); the attribution tools are committed (`lsd194SoakPins.ts`, `lsd194ScAttribution.ts`).

| file / pin | before -> after | attribution |
|---|---|---|
| `randomRoundSoak` seven wins (seed 21) | frames 37,536 -> 37,478; renderCalls 2,688 -> 2,681 | floor drop 37,536 -> 37,456 (2,675), Leech Seed drain rows 37,456 -> 37,478 (2,681); measured on archived trees `6b6d1d128` / `5a11553e1` / final |
| `randomRoundSoak` "full" seed 0 / seed 1 | 17,175 -> 17,125; 26,866 -> 26,804 | floor drop only (identical on the floor-only tree) |
| `randomRoundSoak` "vanilla" seed 0 / seed 1 | 8,928 -> 8,895; 8,979 -> 8,920 | floor drop only |
| `sc106StatsChangeCommand` anchor seed 0 slot 2 | 983 -> 982 | -1: "dug a hole!" (L = 23) |
| anchor seed 3 slot 1 | 1,432 -> 1,429 | -3: one "It's super effective!" (L = 21) |
| anchor seed 6 slot 0 | 2,839 -> 2,831 | -9 floor (three L = 21 prints) +1 dismissal parity (the replay presses A on even frames; the old pin already carried a -1 parity term) |
| anchor seed 13 slot 3 | 2,053 -> 2,051 | -2: two "attack missed!" (L = 23) |
| `route.frames` (seed 0 slot 2 / seed 13 slot 3) | 6,738 -> 6,701; 9,668 -> 9,619 | -39 floor +2 parity (8 short prints); -49 floor (13 short prints) |
| `off148SceneOffPauses` (Rest command shape, 4 pins) | the `startOf` proxy is `min + hold` and summed 24 + 64 for every WAITMESSAGE_LONG print | the proxy keeps 24 (`proxyFrames`); production did not move for the Rest print (its L >= 24); the Rest `message` row now reads `[message, 0, 64]` |

**Residual found while attributing (not fixed, Rest is out of scope):** with the real printable length the Rest chain since the opener ends at 136 (player, census seed 12), not the ROM's attackanimation row 127, and the Rest pause rule's other anchors read 173 / 161 vs 164:
the off148 "exact on the ROM row" fit was only exact under the `min + hold` proxy. Next action: recompute the Rest pause P (`off148`) from the real print lengths against `off108` `rom-r1.json`, then drop the proxy.

### Gates

- `npm run typecheck`: exit 0 on `3ded8b23f` (the final production / test source before the re-pins; the later commits changed only tests, tools and docs -- see the final message for the tested tree).
- `npm run build`: exit 0.
- `npm run test:smoke`: 8 files, 448 tests pass.
- `git diff --check 6b6d1d128..HEAD`: clean. `npm run animation:audit`: exact. `npm run animation:coverage`: runs (no ledger edited).
- Full `npm test`: see the final message -- the suite did not complete inside the 120-minute cap (one run was killed by memory pressure when `npm run build` ran concurrently with it, and was restarted alone at 02:51 UTC); the failing files it reported are listed and re-run above.

## 9. rst197: Rest's Scene OFF pause from the real print length (closes the section 8 residual)

**Rule** (`sceneOffNoHitPauseFrames`, held branch; presentation timing only, kernel events / RNG / outcomes unchanged; Scene ON untouched, the function runs only for a `SCENE_OFF_ATTACK_PAUSE` receipt).
Source (`reference/pokeemerald/data/battle_scripts_1.s` `BattleScript_EffectRest`): `trysetrest; pause B_WAIT_TIME_SHORT; printfromtable gRestUsedStringIds; waitmessage B_WAIT_TIME_LONG; updatestatusicon BS_ATTACKER; waitstate; goto BattleScript_PresentHealTarget` (`attackanimation` first).
ROM (off108 `rom-r1.json`, Scene OFF, G-relative): printfromtable 37, the waitmessage run 38..123 (86 rows = 1 + L + 64, L = 21), `updatestatusicon` 124, `waitstate` 125 (2 rows), `goto` 127, attackanimation **128**, healthbarupdate 164, the HP command 165.
Production presents status 38, the print `L + 64` (lsd194: no floor), the status icon 1: the icon command IS the ROM's `updatestatusicon` row (G + 1 + 38 + L + 64 = 124 for L = 21). The old rule assumed the chain ends on the attackanimation row (127), true only while the 24-frame floor made the print 88 (= 85 + 3, a coincidence for L = 21; wrong for every other L).
New: the pause starts the frame after the icon, so **P = Δ(N) - Δ(icon) + 1 + lead(N)** (kernel icon Δ 102, healthbarupdate Δ 141, lead 0: **40**; was 37 = Δ(N) - Δ(attack) + 1 + lead with the attack 3 rows after the icon). It no longer depends on L or a Rest constant: the 3 rows are the kernel's `waitstate; goto; attackanimation` Δ(att) - Δ(icon) (the ROM's waitstate takes its extra row inside the icon-to-attack span, production's icon command is one frame).

| residual (Rest HP command start vs the ROM row, shifted by the body's L - 21) | before | after |
|---|---|---|
| Scene OFF, census seeds 0..39 both sides (15 bodies, L = 20, 21, 22, 26, 33) | -3 each (P 37) | **0 each** (P 40) |
| the section 8 readings 136 / 173 / 161 vs 127 / 164 | different prints (player seed 12 prints "slept and became healthy!", L = 33 -> chain 136; the ROM probe prints L = 21 -> 124), so not comparable raw: L-adjusted they were all -3 | 0 |
| attackanimation row = chain + (Δ(att) - Δ(icon) = 3) + 1 | 128 for L = 21 | 128 (same, now pinned per body) |
| Scene ON | no Rest pause (live body); unchanged | unchanged (see "left" below) |

`off148SceneOffPauses` no longer masks the print floor (`proxyFrames` removed: `startOf` sums `max(minimumFrames, printable length) + hold`); the Rest anchor is the ROM's 165 shifted by the body's `L - 21`, P is 40, and a new test pins the chain (status 38, print L + 64, icon 1, then +3 = the ROM attackanimation row 128) for both sides.

**Pins moved (all frames-only; kernel digest unchanged):** `off148SceneOffPauses` Rest P 37 -> 40 (rule above); `sgl138-live-receipt.json` battle `19-off` frames 33,050 -> 33,080 (+30 = that route's 10 Rest bodies x +3; anchors unchanged, regenerated by `sgl138Live.ts`, one field differs); `sc106StatsChangeCommand` seed 13 slot 3 `route.frames` +8 is NOT this step: it was an unverified lsd196 movement (the pre-lsd196 production file reproduces the old pin 9,619; final 9,627 = Tickle's DEF `stat` between two prints, events 44 / 63, 2 -> 6 rows each; same single-row shape as Bulk Up but source-derived, no Tickle ROM row). `msg175UsedMessageDuration` is unchanged and passes: its Rest edge (ROM 135 / 124 vs production 132 / 142 = -3 ON / +18 OFF, `trn176Predict`) is the preceding Tackle's HP anchor (28 frames vs the ROM's 10-row wait for that damage, synthetic stats), not Rest's pause, so the rule leaves it; trn178 / trn181 / ont193 Bulk Up stay 0.

**Left:** Scene ON Rest: the live body starts at the same chain end, i.e. 3 rows before the ROM attackanimation row (128), the same `waitstate; goto` rows (scriptLeadFrames exists for other scripts); no ON ROM comparison of Rest's own body exists in the toolchain (btl188 "Rest not decomposed"), so it is not changed. Files: `src/engine/battleResolutionPresentation.ts`, `tests/off148SceneOffPauses.test.ts`, `tests/sc106StatsChangeCommand.test.ts`, `tools/integration/fixtures/sgl138-live-receipt.json`.

## 10. Final-code gates (supervisor, 2026-10-23, CAX31)

Tested code: `8bee336e6` (src tree `9f76866e2`; lsd194 + lsd196 + rst197 + the `BattleStatTiming` widening that fixed lsd196's
typecheck error), test re-pin `b1797e9ed`. Logs: `.integration/validation/sv-20261022/rst197/` (ignored).

- `npm run typecheck`: exit 0 (after widening `BattleStatTiming.minimumFrames` from the literal `2` to `number`).
- Census 0..999 both scenes, `lsd194Census.sh` arms `3ded8b23f` (lsd194, attributed in section 7) vs `8bee336e6`; delta
  `tools/integration/rst197CensusDelta.py` (both trees carry the drain, so `lsd194CensusDelta.py` misaligns): digests and errors identical
  in 1000 / 1000 battles per scene, command type sequences identical, and every changed command is one of:
  - a `stat` between two `message`s, 961 per scene (identical counts ON / OFF): 2 -> 4 (Curse, AncientPower, Silver Wind), 2 -> 5 (Bulk Up,
    Calm Mind, Dragon Dance, Cosmic Power), 2 -> 6 (Tickle, Memento, Superpower). Bulk Up and Curse are ROM-checked (lsd196); the others
    follow the same source rule (instruction-execution delta) without their own ROM row yet.
  - Scene OFF Rest's `move-animation` pause 37 -> 40, 451 bodies (rst197); none in Scene ON.
  Receipts `tools/integration/fixtures/rst197/census-delta-{on,off}.txt`.
- `npm run compare:differential -- fight-submenu battle1-postwin-next-prompt presentation-rng-playable-live-bodies-seeded-on --base 6b6d1d128`:
  PASS, 641 / 641 captures byte-identical.
- Full suite (2 workers, 2,809 s): 1,684 files / 13,965 tests passed, 2 failed, both `randomRoundSoak` frame pins, attributed with
  `lsd194SoakPins.ts` on `66e89d36e` / `b0032b17a` / `a3c34152d` / `8bee336e6`: lsd196 moves seven-wins 37,478 -> 37,467 (renderCalls
  2,681 -> 2,674) and full seed 1 26,804 -> 26,817 (the jittered press cooldown draws follow the presentation length); rst197 moves neither;
  battle / turn / end state unchanged. Re-pinned in `b1797e9ed`; `randomRoundSoak.test.ts` 64 / 64.
- `npm run build`: exit 0.
