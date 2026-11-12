# Forced-switch continuation after Roar / Whirlwind (S10A, ROM evidence + design)

Evidence + design only (new files). Question (docs/next-adapters-prep11.md §2.1): a live Roar / Whirlwind body leaves the
target slid off-screen at E; what does the ROM do from E+1, what does production present for the same continuation, and what is the
minimal presentation-only change so body + continuation compose exactly?

`E` = first frame after the body (`gAnimScriptActive` falls; prep11 convention: Roar player-attacker window 252..350, E=350).
Every ROM claim: direct mGBA (fresh process, Scene ON lab scenario), **two identical fresh runs** (byte-identical raw outputs, identical
summaries). Production claims: rendered frame by frame through `createBattleResolutionPresentationRenderView` +
`renderBattleResolutionLiveView` over generated routes (two identical runs), see §3.

## 0. Results first

1. **The ROM removes the target instantly: no recall animation.** `Cmd_returntoball` passes `skipAnim = TRUE`; the controller destroys
   the battler sprite and hides the healthbox in one step. Both are gone at **E+4** (every scenario, both sides). The send-in
   (`switchinanim`) starts at **E+10** and is the *same* unit the sprite-order tracker already models as `switchInStart` /
   `switchInParticles` (verified exact, §2.4).
2. **Production presents a 32-frame recall + a late send-in**: `message > move-animation > switch-out(+32) > sprite-visibility >
   switch-in(+33) > message`. Measured on four generated routes (identical offsets): the target is drawn at rest and scaled up
   k=0..26 (a live body would have left it off-screen at x2 +97/+104/-106/-112 and it would **pop back in**), sprite hidden at k=27 (ROM 4),
   healthbox hidden k=32 (ROM 4), send-in starts k=33 (ROM 10).
3. **Production's send-in internals match the ROM; its span does not.** Ball/emerge offsets are exact (ROM particles at ball+18 and mon
   bounce at ball+19 vs production ball-open el 18 / mon visible el 19; player side ROM +47 vs production +48/-1). The healthbox slide start
   and the "dragged out!" message start are **species-dependent in the ROM** (opponent target: healthbox slide E+80..E+244 over 339 Factory
   species; player target: healthbox E+75 constant, message E+101..E+210) and **fixed** in production (opponent healthbox k=66, message k=135).
   This is a gap in production's `switch-in` span, not only in the forced path.
4. The **continuation is bit-identical in Scene OFF and Scene ON** (battler/healthbox/party-index/species/text rows for k=0..169, Roar player
   attacker): the existing OFF-calibrated unit can be reused for both.
5. **Sprite-order tracker**: `D o<battler slot>` + existing `switchInStart` + `switchInParticles` reproduce the ROM free order **exactly** for all
   6 scenarios after each unit (isolated seed at E+3). Missing: event kinds (`forced-switch-out`, a side-generic `forced-switch-in`) and removing
   the `return to ball` invalidation for `B_SCR_OP_RETURNTOBALL`.
6. **Baton Pass correction:** production does *not* stop with "no replacement". After the body segment ends in `turn-end` the engine enters
   `forced-party-handoff` (`factoryRoundBattleOrchestrator.ts:1842-1850` + `:2440`), the route driver (`prep7Replay`) merely stalls at the
   party screen; answered, segment 2 presents `switch-out > sprite-visibility > message > ...` (§5).

## 1. ROM continuation (per side)

Scenarios (all 2x identical): `mechanic-roar-player-houndour-opponent-onix` (player attacker, opponent target), `mechanic-roar-opponent-houndour-player-onix`
(opponent attacker, player target), `prep11-roar-alt-vaporeon` (alt geometry: player VAPOREON), `mechanic-whirlwind-player-butterfree-opponent-onix`,
`mechanic-whirlwind-opponent-butterfree-player-onix`, `prep11-whirlwind-alt-beautifly`. Raw per-frame summaries:
`tools/integration/fixtures/forced-switch/rom/*.json` (events keyed by k=E offset), readable form `rom-timeline.txt`.

| k (E+k) | opponent TARGET (player attacker) | player TARGET (opponent attacker) |
| --- | --- | --- |
| 0 | target battler x2 **+97 Roar / +104 Whirlwind** (slot 8, constant from body age ~93), healthbox visible | x2 **-106 Roar / -112 Whirlwind** (slot 6) |
| 1 | `gBattlerControllerFuncs` back to `*BufferRunCommand` | same |
| **4** | **battler sprite freed (slot 8) and its healthbox `invisible=1`, same frame** | slot 6 freed + healthbox hidden |
| 7 | `gBattlerPartyIndexes[target]` changes | same |
| 9 | `gBattleMons[target].species` replaced | same |
| **10** | ball sprites: slot 3 `SpriteCB_WaitForBattlerBallReleaseAnim`, slot 4 `SpriteCallbackDummy` (the new battler sprite, invisible=1), `Task_DoPokeballSendOutAnim` (task 0) | same; player ctrl = `SwitchIn_TryShinyAnimShowHealthbox` |
| 11 | slot 5 `SpriteCB_OpponentMonSendOut` (opponent) | slot 5 `SpriteCB_PlayerMonSendOut_1` |
| 28..43 | 15 `PokeBallOpenParticleAnimation_Step1` sprites (spawn k=28..43 = ball+18..+33); new mon y2 bounce 14 -> -5 from **k=29** | 15 particles at **k=57..72** (ball+47: the player ball is thrown) ; mon y2 from k=58 |
| healthbox slide (x2 -110 -> 0 at 5 px/frame, 23 frames) | **species-keyed**: k=80 (ARON/304 is 80; most 96) .. 244 | **k=75 constant** (338/339 species; 76 once) |
| "X was dragged out!" first glyph | healthbox slide start + 26 (329/339) | ctrl idle + 2 (339/339); k=101..210, attacker-dependent (Roar HOUNDOUR vs Whirlwind BUTTERFREE differ for the same species) |
| sprite frees | ball slot 3 at k=46, particles k=55..70, ball-task slot 5 k=68 | particles k=100.. |

Stable regardless of species/move/attacker: frees at **k=4**, party index **k=7**, species **k=9**, ball **k=10**, 15 particles. Text during
k=0..(message start) is unchanged: the box keeps the "X used ROAR!" text; no recall message.

Whirlwind differs from Roar only in the off-screen offset (x2 +104/-112 vs +97/-106); prep11 §2.1 quoted the Roar numbers for both.

### 1.1 Source path (reference/pokeemerald)

`BattleScript_EffectRoar` (`data/battle_scripts_1.s:593`) -> `forcerandomswitch` (`battle_script_commands.c:7185`; `TryDoForceSwitchOut` `:7164`)
-> `BattleScript_SuccessForceOut` (`battle_scripts_1.s:3324-3338`):
`attackanimation / waitanimation` (the body) `> switchoutabilities > returntoball BS_TARGET > waitstate > (trainer) getswitchedmondata >
switchindataupdate > switchinanim BS_TARGET, FALSE > waitstate > printstring STRINGID_PKMNWASDRAGGEDOUT > switchineffects`.

* **`returntoball` is instant here.** `Cmd_returntoball` (`battle_script_commands.c:5346-5353`) calls `BtlController_EmitReturnMonToBall(..., TRUE)`;
  `OpponentHandleReturnMonToBall` (`battle_controller_opponent.c:1200-1214`) / `PlayerHandleReturnMonToBall` (`battle_controller_player.c:2227-2242`)
  take the `buffer[1] != 0` branch: `FreeSpriteOamMatrix` + `DestroySprite` + (`HideBattlerShadowSprite`) + `SetHealthboxSpriteInvisible`, no `DoSwitchOutAnimation`.
  (docs/issue84-whirlwind-opponent-recall.md says "with animation enabled": that sentence is wrong; its own frames show removal in one frame.)
  The same opcode `returntoball BS_ATTACKER` is Baton Pass (`battle_scripts_1.s:1706`) -> also instant.
* **The send-in is the ordinary controller unit.** `Cmd_switchinanim` (`:4674`) -> `OpponentHandleSwitchInAnim` (`:1160`, `StartSendOutAnim` -> `Task_DoPokeballSendOutAnim`
  / ball sprites, `SwitchIn_TryShinyAnim`) or `PlayerHandleSwitchInAnim` (`battle_controller_player.c:2185`, `SwitchIn_TryShinyAnimShowHealthbox`).
  Callback chain: `SwitchIn_TryShinyAnim -> SwitchIn_ShowHealthbox` (waits `finishedShinyMonAnim && battler sprite callback == SpriteCallbackDummy` =
  the species front animation: this is why the opponent healthbox slide is species-keyed) `-> SwitchIn_ShowSubstitute -> SwitchIn_HandleSoundAndEnd`
  (waits `!IsCryPlayingOrClearCrySongs()`: why the player-target message start depends on cry overlap incl. the attacker's own Roar cry).
  Probe note: for the opponent target the probe's `gBattlerControllerFuncs[1]` reads `OpponentBufferRunCommand` throughout (it never shows the `SwitchIn_*`
  callbacks, unlike the player target); not explained, does not affect any sprite/healthbox/text row (open question 3).
* It is the **same send-in unit** the sprite-order tracker models as `switchInStart` (Cff;Cf) + `switchInParticles`; it is **not** the `nextSendOut`
  unit (no party-summary precedes it).

## 2. Probes and ROM tooling

* `tools/integration/forcedSwitchRomProbe.py <scenario> <out>` (direct mGBA; env `FS_PROFILE=battle-scene-off`, `FS_WINDOW`) records per frame: both battler sprites
  (slot, x, y, x2, y2, invisible, in-use, matrix), healthboxes, controller callbacks, main func, `gBattlescriptCurrInstr`, party indexes, species, text printer
  state, task funcs, plus a sprite spawn/free log with callback symbols. `forcedSwitchRomRuns.sh <tag>` runs the six scenarios; `forcedSwitchRomSummary.py` compacts
  (E-relative events). `forcedSwitchRomTimeline.py` prints `rom-timeline.txt`.
* 2.1 Two identical fresh runs: raw outputs `cmp`-identical and summaries identical for all 6 scenarios (the `rom/*.json` fixtures carry a per-frame hash of battler+healthbox rows).
* 2.2 `forcedSwitchSweep.py` (replaces the party slot the ROM picks with each species; `FS_SPECIES=tools/integration/fixtures/forced-switch/factory-species-ids.json` = the
  Factory sets' species): `species-sweep-opponent-target.txt` / `species-sweep-player-target.txt` (339 legal species each; 37 failed lab validation; two identical fresh runs each),
  and the 12-species table `species-sweep.txt`. Opponent-target numbers are identical for Roar and Whirlwind scenarios (and attacker species); player-target text start is not.
* 2.3 ON == OFF: `forcedSwitchOnOffCompare.py` (OFF anchored on the party-index change = ON E+7): identical event offsets and 0 differing frames in k=0..169
  (`on-off-compare.txt`; two identical OFF runs).
* 2.4 Sprite-order: `forcedSwitchOrderCheck.ts` / `forcedSwitchOrderFixture.ts` (raw: `prep11Probe.py` with `PREP11_ALWAYS=1`, two identical runs): seeding the plan cursor from the ROM
  free order at E+3, `Do<battler slot>` (frees at E+4), `switchInStart`, `switchInParticles` match the ROM free order after every unit in **6/6** scenarios
  (`order-check.txt`; pinned hermetically by `tests/forcedSwitchContinuation.test.ts` from `order-check.json`). Body plans for `46:*` / `18:*` already exist in `SPRITE_ORDER_PRODUCTION_BODIES`.

## 3. Production timeline today (rendered)

`tools/integration/forcedSwitchProdRender.ts` drives the real orchestrator over the generated routes (player attacker: ROAR 42/0 HOUNDOUR, 6/21 VAPOREON; WHIRLWIND 9/0 BUTTERFREE,
30/0 BEAUTIFLY; opponent-attacker routes cannot be generated by the route driver, so the opponent-attacker side is ROM-only), renders every frame with
`renderBattleResolutionLiveView` and records the view fields + framebuffer hashes (`fixtures/forced-switch/prod/*.json`, change-point text `prod-summary.txt`; two identical runs).
The Roar/Whirlwind `move-animation` has no live body yet (`liveMoveAnimationDuration` = null -> 32-frame placeholder). k=0 = first frame of the following `switch-out` (= body end).

Identical in all four routes (k relative to the end of `move-animation`):

| k | production view |
| --- | --- |
| 0..16 | `switch-out` el 0..16: target drawn at rest, scale 256 (opponent-region framebuffer hash constant, != empty-field hash) |
| 17..26 | scale-up 304..736, y2 3..12 |
| 27..31 | `spriteVisible=false`, empty target side (framebuffer = empty-field hash at k=28,29,30,31) |
| 32 | `sprite-visibility` recall: opponent sprite+healthbox hidden |
| 33 | `switch-in` el 0 (opponent) |
| 35 | ball closed visible (el 2) |
| 51 | ball open (el 18) |
| 52 | mon visible (el 19) |
| 56 / 62 | open-final / ball gone |
| 66 | healthbox slide starts (dx -110, el 33) |
| 135 | `message` "Foe X was / dragged out!" first glyph |
| 161..163 | `sprite-visibility` (MOVEEND) x2, `turn-end` |

Player-side `switch-in` (the only route-driver path to a player-side command: voluntary switch, `forcedSwitchProdVoluntary.ts`, `prod-player-switch-in.txt`): ball visible el 3..44,
mon el 48, healthbox slide el 66, message el 102.

## 4. Diff table (production vs ROM, k = frames after body end; a live body would end at the same k=0)

| # | item | ROM | production | diff |
| --- | --- | --- | --- | --- |
| 1 | target during k=0..3 | off-screen (x2 +97/+104/-106/-112) from the body | drawn at rest | **pop-in** (would reappear at rest after the slide-off) |
| 2 | recall animation | none | `switch-out` k=0..26: scale 256->736 | **present vs absent** (27 visible frames) |
| 3 | target sprite hidden | k=4 | k=27 | +23 |
| 4 | opponent/player healthbox hidden | k=4 (same frame as sprite) | k=32 | +28 |
| 5 | send-in start (ball) | k=10 (R+6, R=k4) | k=33 (ball visible 35) | +23 (hide->send-in gap is 6 in both) |
| 6 | opp ball open / mon emerge | ball+18 / ball+19 | el 18 / el 19 | 0 (relative to send-in start) |
| 7 | player ball particles / mon | ball+47 | el 45..48 (ball gone 45, mon 48) | -2..+1 |
| 8 | opp healthbox slide start | send-in start + 70..234 (species-keyed) | + 33 | **-37..-201** |
| 9 | player healthbox slide start | send-in start + 65 | + 66 | +1 |
| 10 | opp message start | healthbox + 26 (= +96..+260 from send-in start) | + 102 | **-6..-158** |
| 11 | player message start | send-in start + 91..200 (cry/attacker keyed) | + 102 | -11..+98 |
| 12 | sprite-order events | `D o<slot>` at k=4, `Cff;Cf` at k=10, 15 particles | `set-battler-sprite-visibility` RETURNTOBALL -> `invalidate("return to ball")`; `switch-in-animation battler 1` -> `next-mon-send-out` (guard fails: no party-summary) | tracker invalid after every Roar/Whirlwind |

The diffs in 8/10/11 are not forced-switch specific: any `switch-in` command uses the same fixed span (calibrated on RATTATA, voluntary switch, OFF).

## 5. Baton Pass

Where production stops (`forcedSwitchBatonPass.ts`, `baton-pass.txt`, routes 71/0 AIPOM and 2/7 NINJASK): segment 0 = `message > move-animation > turn-end`, then lifecycle
`forced-party-handoff` with `forcedRequest = {kind:"forced-switch", side:"player", battler:0, legalPartyIndexes:[1,2]}` and a created `battleForcedPartySelect`
(`createForcedPartySelect`, `factoryRoundBattleOrchestrator.ts:1842-1850`, handler `:2440`; request derived at `battleResolutionPresentation.ts:3737`
`pendingPlayerForcedSwitchRequest`). `prep7Replay` stops there because it never answers the party screen (the selector cursor starts on the current slot: DOWN then A, as
`tools/soak/randomRoundSoakDriver.ts:2178` does). Answered, segment 1 presents `switch-out > sprite-visibility > message ("Go!") > ... > turn-end` (the voluntary-style
switch-out, again not the ROM's instant `returntoball`). So the **player-attacker replacement is presented**; prep11 §2.2's "no switch command" meant the first segment.
Not measured: the opponent-attacker (AI) Baton Pass replacement flow (no route reaches it) and the body's hide-at-age-9 / free-at-E+8 handling. A ROM-exact Baton Pass needs the same
instant-removal variant (`returntoball BS_ATTACKER` is the same opcode) at body end + the party screen / AI choice sequencing in front of it. No fix attempted.

## 6. Design (presentation-only, minimal)

1. **Instant removal variant.** In `buildResolutionCommands` (`battleResolutionPresentation.ts:3496-3535`) stop emitting the 32-frame `switch-out` for
   `B_SCR_OP_RETURNTOBALL` (always `skipAnim = TRUE`); keep it for `B_SCR_OP_RETURNATKTOBALL` (voluntary) and `VARIOUS`. Emit instead a **4-frame skip removal hold**
   (e.g. `switch-out` with `skipAnimation: true`, timing 4, view `spriteVisible=false` when a live body ran / rest sprite for the no-body OFF path), then the existing
   `sprite-visibility {recall:true}` whose healthbox hide lands at k=4, and make its duration **6** so `switch-in` starts at k=10. Net: hide k=4 (ROM 4), send-in k=10 (ROM 10).
   Because the live body leaves the target at x2 +97/+104/-106/-112 and nothing redraws it, the live effect must not draw the target again after body end (only the removal hold's
   view owns the target side until the replacement emerges).
2. **Send-in.** Reuse `switch-in` for ball/particle/emerge (offsets exact). Replace the fixed healthbox-slide start and message start by species-keyed data: opponent target
   `slideStart = table[species]` (k from send-in start; `species-sweep-opponent-target.txt`, message = slide + 26); player target slide 65 const, `messageStart = f(cry overlap)`
   (`species-sweep-player-target.txt`; depends on the attacker too: Roar HOUNDOUR vs Whirlwind BUTTERFREE differ for the same species, so the player-target tail is only partly keyed by species).
   If that table is not taken, the continuation is exact up to the healthbox slide and then off by the amounts of rows 8/10/11; scope that as the remaining gap.
3. **Sprite-order.** New events in `spriteOrderEventTransform.ts`/`liveSpriteOrderHost.ts`: `forced-switch-out {side}` (plan `D o<slot>`, battler slot -> null, `lastUnit "recall"`),
   side-generic `switch-in-start/finish` (today player-only: `slots.player !== null` guard and `player` slot update), and map `B_SCR_OP_RETURNTOBALL` +
   `switch-in-animation battler 1` *without* a preceding `party-summary-next` to them instead of invalidating. Plans themselves need no change (§2.4).
4. **Live body composition.** `case 46` / `case 18` in `liveMoveAnimation.ts` (allocator slots `[3,4,5]` / `[3,4,5,7,9,10]`, order plans exist) end at E with the target off-screen; the
   continuation above takes over at k=0. Body ownership of tasks is net-zero at E+1.

**Pin by tests:** (a) ROM invariants k=4/7/9/10, 15 particles, 18/47 offsets (done: `tests/forcedSwitchContinuation.test.ts`); (b) tracker: `forced-switch-out` + start + particles equal the
fixture free orders for both sides (the test already pins the plan equality; add the event-level test once events exist); (c) presentation: Roar/Whirlwind command list is
`message > move-animation > (skip removal 4) > sprite-visibility(6) > switch-in > message` with hide at +4 and `switch-in` at +10 from body end; voluntary switch keeps its 32-frame `switch-out`
(the existing `tests/battleResolutionPresentation.test.ts:1085` currently expects `switch-out` for Whirlwind and must change); (d) render: no target pixels in k>=4 and no pop-in at k=0..3
for a live body; (e) species-keyed slide/message start against the sweep fixtures; (f) Baton Pass body: hide and replacement unmodelled, keep the current fallback.

## 7. Open questions

1. Production's OFF flow already ships this recall chain (docs/issue84-whirlwind-opponent-recall.md frames: removal 257, ball open 281..283, release 284..320, settled 321, i.e. removal -> ball open **24** frames
   in the ROM) while production draws hide at k=27 and ball open at k=51 from the start of `switch-out`; whether the OFF pixel comparison accepts that depends on where production anchors the
   start of `switch-out` relative to the ROM message end (not measured here; no OFF production-vs-ROM pixel compare was run). The ON composition must anchor on the **body end**, not the existing OFF chain.
2. Opponent-attacker (player-target) production rendering was not run (no route generator); only ROM + the player-side voluntary `switch-in` timeline.
3. Probe reads `gBattlerControllerFuncs[1]` as `OpponentBufferRunCommand` during the opponent send-in; the callback names for that side are unconfirmed.
4. What drives the opponent healthbox delay is the species front animation (callback-dummy gate); a source-derived table (animation lengths) would replace the sweep table.
5. Alternate geometry (player VAPOREON / BEAUTIFLY attackers) equals the base geometry for the continuation (same k offsets; healthbox slide start depends on the *target replacement species* only).

## 8. Reproduction (workspace root, mgba venv; PY=../../vendor/mgba-venv/bin/python)

```
sh tools/integration/forcedSwitchRomRuns.sh r1; sh tools/integration/forcedSwitchRomRuns.sh r2        # then cmp the two dirs (/tmp/fs/r1, /tmp/fs/r2)
python3 tools/integration/forcedSwitchRomSummary.py /tmp/fs/r1 tools/integration/fixtures/forced-switch/rom; python3 tools/integration/forcedSwitchRomTimeline.py
FS_PROFILE=battle-scene-off $PY tools/integration/forcedSwitchRomProbe.py tools/battle-lab/mechanic-roar-player-houndour-opponent-onix.json /tmp/fs/off1/roarP.json   # + forcedSwitchOnOffCompare.py
FS_WINDOW=260 FS_SPECIES=tools/integration/fixtures/forced-switch/factory-species-ids.json python3 tools/integration/forcedSwitchSweep.py mechanic-roar-player-houndour-opponent-onix opponent f1 1
PREP11_ALWAYS=1 $PY tools/integration/prep11Probe.py tools/battle-lab/<scenario>.json /tmp/fs/ord1/<scenario>.json; node --experimental-strip-types tools/integration/forcedSwitchOrderCheck.ts /tmp/fs/ord1
node --experimental-strip-types tools/integration/forcedSwitchProdRender.ts /tmp/fs/prod1; python3 tools/integration/forcedSwitchProdSummary.py /tmp/fs/prod1
node --experimental-strip-types tools/integration/forcedSwitchProdVoluntary.ts; node --experimental-strip-types tools/integration/forcedSwitchBatonPass.ts
npx vitest run tests/forcedSwitchContinuation.test.ts
```
