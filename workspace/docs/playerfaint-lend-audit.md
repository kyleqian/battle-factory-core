# Player-faint lend audit: role-map relabel after player faint → forced party menu → reshow → forced switch-in (S10A; ROM evidence + design)

Evidence and design only: no production code is changed, and only new files are added. All runs are direct in-process mGBA, Scene ON, never the shared HTTP oracles.
This follows `docs/postko-consumer-audit.md`, which covers the opponent-KO geometry, its §3.1 π and §3.2 conditions (a)/(b)/(c), and its §5 caveats 1 (player faint) and 2 (second KO).

## 0. Results first

* **Staging recipe** (§1). The forced party menu opens without input: the battle controller runs `OpenPartyMenuToChooseMon`, then `CB2_InitPartyMenu`. Before it opens, the
  "<mon> fainted!" message waits for **A**. After the menu opens it ignores input for about 60 frames while its palette fade runs. Earlier attempts were rejected because they
  pressed buttons during that fade. The cursor starts on the fainted slot 0, and pressing A there loops on "no energy left". The working sequence is **DOWN → +30 A
  (selection menu) → +40 A (SHIFT)**, starting 80 frames after `CB2_InitPartyMenu`. `tools/integration/playerfaintStage.py` drives the stock ROM adaptively from ROM state
  (prompts, the move cursor it remembers, faint, menu) and writes the button schedule as a **fixed** BattleLab `trace.segments` list. Every later run is plain controller input.
* **ROM ground truth** (§2). There are 7 scenarios, each run twice fresh, and each pair is byte-identical. Model vs ROM: **41 known activation edges, 0 mismatches**. That is
  7 entry edges, 27 after a forced switch-in, and 7 after an opponent KO (C: 1 after KO #1 and 5 after KO #2; F: 1). The checks per edge are F, occupancy, battler slots, matrix bitmap, battler matrices, task
  table and condition (b). Four more edges follow a body without an EXACT plan (`202:player`), so the tracker is unknown there. That is a body-plan coverage gap, as with the
  post-KO audit's `85:opponent`, and those edges are not relied on.
  After the forced switch-in, occupancy is `{0,1,2,3,5,60..63}` with battler sprites P 5 / O 0, battler matrices P 1 / O 0, bitmap `0x3` and an **empty task table**. This
  holds at all 27 edges. It is the same when the replacement comes from party slot 2 (E), when the player faints after an opponent KO with the opponent battler in
  slot 5 (F), and after a second player faint and second forced menu (G).
* **Condition (b): YES under a ROLE map.** The post-switch occupant sort prefix is `[62,60,1,63,2,61,5,0,3]`. Under the role map ρ it relabels **exactly** to the entry
  prefix `[62,60,0,63,1,61,6,8,2]` at every edge. The roles were read from ROM `gHealthboxSpriteIds` plus each healthbox's other-half and bar links, not inferred from the sort
  order (§2.2).
* **Role map ρ** (§3). Occupant roles map to their entry labels:
  * player battler → 6, opponent battler → 8;
  * player healthbox main → 0, opponent healthbox main → 1;
  * enemy shadow → 2;
  * healthbox other/bar slots 63,62 / 61,60 stay fixed.

  Free slots map rank-for-rank onto the known-entry free set. After the forced switch-in that gives 0→8, 1→0, 2→1, 3→2, 5→6, 4→3, 6→4, 7→5, 8→7, with 9.. unchanged.
  At the entry and after an opponent KO, ρ equals today's production π. The role lend equals today's production lend at every edge where production lends.
* **What-if** (§3): 13 representatives over the full accepted dense window, each compared with both fresh runs. The role lend gives **0 residual on all 13**, and there is
  **0 NEEDS-NEW**. Verdicts:
  * **NEEDS-PARAM (role lend):** Sunny Day P (from party slot 1, from slot 2, after an opponent KO, and after two player faints), Dragon Dance P, Swift P, Swift O, Thunderbolt O, Heal Bell P, Giga Drain P. Today's production declines on each, with
    12–54 exact rows out of 78–261.
  * **NEEDS-PARAM (role lend + allocator re-seed after the forced switch-in):** Light Screen P, Protect P.
  * **GENERALIZES, second opponent KO:** Sunny Day P with today's production π lend, 158/158.
* **Today's production host**, replayed with the recorded semantic histories and the forced-menu hooks: the tracker is **known** at all 13 fixture edges and its view equals
  the model. However, `lendLiveSpriteOrder` returns **undefined** and the allocator input is **undefined** at every post-player-faint edge. After the second opponent KO it
  lends, and the lend equals the role lend. So the gap is only the lend gate and the allocator re-seed, not the tracker.
* **Proposal** (§4) has three parts:
  1. Track occupant roles in `SpriteOrderTracker`: healthbox main per side plus the shadow, set at entry and by `battle-reshow` from its survivors.
  2. Generalise `spriteOrderEntryLabelRelabel` from fixed occupants to that role map.
  3. Re-seed the allocator host after a forced `switch-in` exactly as `reseedLiveSpriteAllocatorAfterSendOut` does after a `send-out`.

  No consumer changes are needed.

## 1. Staging recipe (`tools/integration/playerfaintStage.py`)

Timeline of `playerfaint-sunnyday-dragondance-swift`. Frames use the numbering of `postkoStateProbe.py`: frame 0 is after `lab.prepare()`, and each trace frame adds 1.

| frame | ROM | input |
|---|---|---|
| 1 | action prompt (turn 1) | +24 A (FIGHT), +56 A (move slot 0) |
| 98 | SLOWBRO Swift body; MAGIKARP HP 0 at 266 | – |
| ~340 | "MAGIKARP fainted!" waits for A (a press at 330 is too early, 350/360 is accepted; the stager presses A every 30 f from HP 0 + 60) | A |
| 428 | `CB2_InitPartyMenu`; `Task_HandleChooseMonInput` +19 f; menu fade ~60 f (a DOWN at menu+40 is ignored) | – |
| 508 / 538 / 578 | `gPartyMenu.slotId` 0 → 1; `Task_HandleSelectionMenuInput`; SHIFT → `Task_ClosePartyMenuAndSetCB2` | DOWN / A / A |
| ~600–660 | `CB2_ReshowBattleScreenAfterMenu` (opponent battler sprite → slot 0), switch-in: `gBattlerSpriteIds` [5, 0] | – |
| 844 | next action prompt | stager: FIGHT + move cursor from `gMoveSelectionCursor[0]` (layout 0 1 / 2 3) |

The stager also has an idle fallback: if no event happens for more than 900 frames while turns remain, it presses A every 60 frames and logs it as `idle-A`. Only the second-KO scenario needs this. Its opponent-faint message also waits for A, which is why the post-KO scenarios press A twice. The party for each scenario is stored in the scenario JSON. A player lead at **level 5** with speed IV 0 is a guaranteed one-hit KO turn 1 and never moves, because it is slower. `overrides.parties` allows a per-mon `level` from 1 to 100.

## 2. ROM ground truth (`tools/battle-lab/playerfaint-*.json`, `fixtures/playerfaint/state-*.json`, `model-check-*.json`)

| scenario | party (player / opponent) | edges (frame: unit) | model vs ROM | A == B sha1 |
|---|---|---|---|---|
| `playerfaint-sunnyday-dragondance-swift` (A) | MAGIKARP L5, JOLTEON (Sunny Day, Dragon Dance, Swift, Light Screen), SNORLAX / SLOWBRO ×3 (Swift, Brave, speed 0) | 98 Swift O (entry); **937 Sunny Day P**, 1238 Swift O, 1493 SUN, **1766 Dragon Dance P**, 1911 stat, 2209 Swift O, 2464 SUN, **2747 Swift P**, 2938 Swift O, 3196 SUN | 11/11 known, 0 mismatches | `a03c635f…` |
| `playerfaint-protect-thunderbolt` (B) | MAGIKARP L5, SNORLAX (Protect, Light Screen, Heal Bell, Swift), SNORLAX / JOLTEON ×3 (Thunderbolt) | 106 Thunderbolt O (entry); **1170 Protect P** (+4 priority; Thunderbolt blocked, no animation); **1685 Thunderbolt O** | 3/3 known, 0 mismatches (2026 PRZ / 2294 full-paralysis follow `85:opponent`, which has no EXACT plan) | `badd8a4a…` |
| `playerfaint-lightscreen-healbell-gigadrain-thunderbolt` (D) | MAGIKARP L5, SNORLAX (speed 31: Light Screen, Heal Bell, Giga Drain, Thunderbolt) / SLOWBRO ×3 (Swift) | 98 (entry); **921 Light Screen P**, 1151 Swift O, **1540 Heal Bell P**, 1931 Swift O, **2223 Giga Drain P**; 2798, 3086, 3517, 3721 unknown | 6/6 known, 0 mismatches; 4 unknown (no EXACT plan `202:player`) | `2a3d1e55…` |
| `playerfaint-slot2-sunnyday` (E) | as A with JOLTEON in party slot 2 (menu DOWN ×2) | 98 (entry); **949 Sunny Day P**, 1250 Swift O, 1505 SUN | 4/4 known, 0 mismatches | `f0c0a946…` |
| `playerfaint-afterko-sunnyday` (F) | NINETALES L5 (Flamethrower), JOLTEON, SNORLAX / SHEDINJA L1, SLOWBRO ×2 (Swift) | 105 Flamethrower P (entry; KO + send-out → opponent battler 5), 1407 Swift O (post-KO; KOs NINETALES from battler 6), **2247 Sunny Day P** (after the forced switch-in), 2548 Swift O, 2804 SUN | 5/5 known, 0 mismatches | `8fc3874f…` |
| `playerfaint-twice-sunnyday` (G) | MAGIKARP L5 ×2, JOLTEON / SLOWBRO ×3 (Swift); menus DOWN ×1, then DOWN ×2 | 98 (entry), 926 Swift O (after the 1st forced switch-in; KOs MAGIKARP #2 in battler slot 5), **1777 Sunny Day P** (after the 2nd), 2078 Swift O, 2333 SUN | 5/5 known, 0 mismatches | `5fb9b758…` |
| `playerfaint-secondko-sunnyday-swift` (C, second opponent KO) | NINETALES (Flamethrower, Sunny Day, Swift, Fire Blast) / SHEDINJA ×3 (Swift) | 105 Flamethrower P (entry), 1453 Flamethrower P (after KO #1), **2773 Sunny Day P** (after KO #2 + send-out #3), 3075 Swift O, 3327 SUN, 3807 Swift O, 4060 SUN | 7/7 known, 0 mismatches | `c1e9081f…` |

The model is the production tracker (`createSpriteOrderTracker` + `applySpriteOrderPresentationEvent`). The forced chain is fed `faint{player}`, `party-menu-reset`, `battle-reshow{playerBattlerPresent:false}`, `switch-in-start`, `switch-in-finish`, and the second KO is fed `faint{opponent}`, `party-summary-next/-hide`, `next-mon-send-out`. Only the scenario's semantic event list drives it, never masks.

### 2.1 ROM state at the edges

| geometry | occupancy | `gBattlerSpriteIds` [P, O] | battler matrices [P, O] | bitmap | tasks | occupant prefix | F head |
|---|---|---|---|---|---|---|---|
| known entry | `{0,1,2,6,8,60..63}` | [6, 8] | [1, 2] | `0x6` | – | `[62,60,0,63,1,61,6,8,2]` | `4,3,21,20,5,19,…` |
| after forced switch-in (27 edges, A/B/D/E/F/G) | `{0,1,2,3,5,60..63}` | [5, 0] | [1, 0] | `0x3` | – | `[62,60,1,63,2,61,5,0,3]` | first body `6,4,21,20,19,…` (A, B), `4,6,21,…` (B 1685) |
| after the 2nd opponent KO + send-out #3 (C, 5 edges) | `{0,1,2,5,6,60..63}` | [6, 5] | [1, 0] | `0x3` | – | `[62,60,0,63,1,61,6,5,2]` | `3,4,21,20,7,19,…` |

The second KO's geometry is identical to the first KO's: send-out #3 reuses slot 5, as `UNIT_PLANS` predicted in the post-KO audit's §5 caveat 2. The effect allocations after the switch-in are the rank images of the entry slots. Sunny Day creates 4,6,7,8, which ρ maps to the entry 3,4,5,7. Dragon Dance creates 4,6,7,8,9,10, which ρ maps to 3,4,5,7,9,10.

### 2.2 Roles (ROM read, `gHealthboxSpriteIds[b]`, the healthbox's `oam.affineParam` = other half, `data[5]` = bar)

| | player battler | opponent battler | player healthbox (main, other, bar) | opponent healthbox | enemy shadow (remaining occupant) |
|---|---|---|---|---|---|
| entry (frame 90) | 6 | 8 | 0, 63, 62 | 1, 61, 60 | 2 |
| after forced switch-in (frame 930) | 5 | 0 | 1, 63, 62 | 2, 61, 60 | 3 |

These match the reshow plan `reshowPlayerGone` = `Cf;Cfee;Cfee;Cf` from the identity order:
* n0 = opponent battler 0;
* n1..n3 = player healthbox 1, 63, 62;
* n4..n6 = opponent healthbox 2, 61, 60;
* n7 = shadow 3.

`playerfaintModelCheck.ts` derives the roles from those survivors, never from the ROM.

## 3. Role map and what-if (`tools/integration/playerfaintWhatIf.ts`, receipts `fixtures/playerfaint/whatif-*.json`, summary `verdicts.json`)

**Condition (a)**, role-complete occupancy: the occupied set equals {both battlers, both healthbox triples, shadow}, which is 9 slots, with every role known. **Condition (b)**, the
ROM occupant prefix relabelled by ρ equals the entry prefix: true at all 41 known edges, checked as `prefixRelabels`. **Condition (c)**, empty task table: true at all 41.
The isomorphism argument of the post-KO audit's §3.2 therefore carries over unchanged with ρ in place of π. Sprite allocation and sorting (`CreateSprite`, `CreateSpriteAtEnd`,
`AllocOamMatrix`, `CreateTask`, `SortSprites`) never compare raw slot numbers: sorting uses keys and breaks ties by order position.

The what-if renders the existing production adapter path: `liveView` of `liveAdapterFramebuffer.ts`, unchanged. Only `effect.spriteOrderInput` is replaced. It renders every
row of the accepted dense window, which is the activation plus the accepted offset of the move's existing fixture, and compares each row with both fresh runs. The RGB
sha256 values are checked against the committed state fixture. Lends: `role` = ρ(F); `production` = today's `spriteOrderTrackerLend`, which is null after a player faint;
`raw` = the tracker's F without relabelling.

| move | side | scenario / edge | window rows | role ρ(F) | today (production) | verdict |
|---|---|---|---|---|---|---|
| SUNNY_DAY | P | A 937 | 158 | **158/158** | 48/158 (declines) | **NEEDS-PARAM** ρ |
| SWIFT | O | A 1238 | 80 | **80/80** | 17/80 | **NEEDS-PARAM** ρ |
| DRAGON_DANCE | P | A 1766 | 142 | **142/142** | 54/142 | **NEEDS-PARAM** ρ |
| SWIFT | P | A 2747 | 78 | **78/78** | 16/78 | **NEEDS-PARAM** ρ |
| PROTECT | P | B 1170 | 123 | **123/123** (entry-label host) | host invalid: allocator input undefined (§3.1 replay) | **NEEDS-PARAM** ρ + host re-seed |
| THUNDERBOLT | O | B 1685 | 237 | **237/237** | 12/237; raw F 12/237 (self-declines) | **NEEDS-PARAM** ρ |
| LIGHT_SCREEN | P | D 921 | 88 | **88/88** (entry-label host) | host invalid | **NEEDS-PARAM** ρ + host re-seed |
| HEAL_BELL | P | D 1540 | 261 | **261/261** | 12/261 | **NEEDS-PARAM** ρ |
| GIGA_DRAIN | P | D 2223 | 230 | **230/230** | 28/230 | **NEEDS-PARAM** ρ |
| SUNNY_DAY | P | E 949 (party slot 2) | 158 | **158/158** | 48/158 | **NEEDS-PARAM** ρ |
| SUNNY_DAY | P | F 2247 (faint after an opponent KO) | 158 | **158/158** | 48/158 | **NEEDS-PARAM** ρ |
| SUNNY_DAY | P | G 1777 (after two player faints) | 158 | **158/158** | 48/158 | **NEEDS-PARAM** ρ |
| SUNNY_DAY | P | C 2773 (2nd KO) | 158 | 158/158 | **158/158** (today's π lend) | **GENERALIZES** |

For Light Screen and Protect, the what-if's `production` row shows 88/88 and 123/123, but there `liveView` supplies the known-entry allocator host. Real production has no
allocator input after the player faint, as shown by `todayAllocatorInput: null` in `host-replay-receipt.json`. The 10 declining rows are negative controls: the harness does
detect a missing body. The windows are those of `postko-sunny-day-player`, `postko-swift-opponent`, `postko-dragon-dance-player`, `postko-swift-player`,
`postko-protect-player`, `postko-thunderbolt-opponent`, `postko-light-screen-player`, `postko-lend/postko-heal-bell-player` and `postko-giga-drain-opponent`. The last one has
the same 230 rows at offset 0 as `prep9-giga-drain-player.json` 214..443.

### 3.1 Production host today (`tools/integration/playerfaintLendHistory.ts`, `fixtures/playerfaint/host-replay-receipt.json`)

Each fixture's semantic history, recorded in its `precedingTurns`, is replayed through `liveSpriteOrderHost.ts` exactly as `postkoHostReplay.ts` does. One orchestrator
marker, `{kind:"forced-party-menu", battlers:{player:false, opponent:true}}`, is replayed as `openLiveSpriteOrderHostPartyMenu` followed by
`returnLiveSpriteOrderHostFromPartyMenu`. The orchestrator makes the same calls on the forced path (`factoryRoundBattleOrchestrator.ts:2138`).

| | 12 post-player-faint fixtures | second-KO fixture |
|---|---|---|
| host tracker known | 12/12 | 1/1 |
| host view (F, occupancy, battler slots) == model | 12/12 | 1/1 |
| `lendLiveSpriteOrder` | **undefined** (gate: not role-isomorphic under the fixed-occupant map) | lent, == role lend |
| allocator input | **undefined** (`reseedLiveSpriteAllocatorAfterSendOut` only fires after `lastUnit === "send-out"`) | – (Sunny Day is not an allocator consumer) |
| role lend computed from the host view == model `roleLend` | 12/12 | 1/1 |

## 4. Production proposal (no code changed here)

1. **Roles in the tracker** (`spriteOrderEventTransform.ts`). Add `occupantRoles: { healthboxMain: {player, opponent}, shadow } | null` to `SpriteOrderTracker`. Set it as follows:
   * the entry tracker: `{0, 1, 2}`;
   * `party-menu-reset`: null, since nothing is allocated;
   * `battle-reshow`, from the unit's survivors:
     * `reshowPlayerGone`: player healthbox main n1, opponent healthbox main n4, shadow n7;
     * `reshowBoth`: n2, n5, n8.

   Faint, summary, send-out, switch-in and bodies do not touch these roles: the healthboxes and the shadow persist. The healthbox other/bar slots are 63,62 / 61,60
   in both creation paths, because `CreateSpriteAtEnd` starts from a full-free order in both. Keep them fixed and assert that they are occupied.
2. **Gate + relabel**: in `spriteOrderEntryLabelRelabel`, replace `FIXED_OCCUPANTS` = {0,1,2,60..63} with the role set {roles.healthboxMain.P → 0, .O → 1, roles.shadow
   → 2, 60..63 → themselves, battler P → 6, battler O → 8}. The remaining parts stay as today: occupied must equal exactly those 9 slots, free slots map by rank, and the
   prompt pair must be absent. At the entry and after opponent KOs, the roles are {0,1,2}, so π is unchanged. All post-KO receipts stay valid; `productionAgrees` held at
   every edge where production lends today. The reference implementation is `roleMap` in `tools/integration/playerfaintModelCheck.ts`.
3. **Allocator re-seed**: `reseedLiveSpriteAllocatorAfterSendOut` should also accept `lastUnit === "switch-in"` when the unit before the switch-in was a `reshow` with
   `playerBattlerPresent: false` (the forced path) and the view is role-isomorphic. In that case it re-seeds the known-entry `firstMove` host, which equals the ρ-relabelled
   view. The orchestrator call site (`factoryRoundBattleOrchestrator.ts:2262`) already runs after every `switch-in-animation`. Keep the voluntary chain (reshowBoth → recall →
   switch-in) excluded until the provisional recall pair group is verified on a second geometry. That chain is out of scope here.
4. **Consumers**: no change. `POSTKO_LEND_EXCLUDED_MOVE_IDS` (Leaf Blade) should apply whenever the battler slots are not the entry ones, which includes after a player faint.

Tests to add, all hermetic and built from this step's fixtures:
* `roleMap` / relabel unit tests:
  * identity at the entry;
  * the post-switch view `{free: F, occupied: {0,1,2,3,5,60..63}, battlers 5/0, roles {1,2,3}}` must give `roleLend` of `model-check-playerfaint-*.json` edge 1, which is
    `4,3,21,20,…`;
  * null when roles are unknown, for example right after a reset.
* A tracker test that feeds `SCENARIOS["playerfaint-sunnyday-dragondance-swift"]` and asserts that the production lend equals `roleLend` at the 10 post-switch edges.
* A host test that replays each fixture's `precedingTurns` with the `forced-party-menu` marker, as `replayPlayerfaintTurns` does, and asserts that the lend and allocator
  input are defined and the lend equals `roleLend`.
* Dense acceptance: the 13 drafted fixtures `tools/integration/fixtures/playerfaint-{sunny-day-player, swift-opponent, dragon-dance-player, swift-player,
  protect-player, thunderbolt-opponent, light-screen-player, heal-bell-player, giga-drain-player, secondko-sunny-day-player, slot2-sunny-day-player, afterko-sunny-day-player, twice-sunny-day-player}.json` are in schema
  `playerfaint-adapter-draft/v1`, `draft: true`, with `precedingTurns` recorded. Run them through `verifyLiveAdapterFramebuffer` once `fixturePostKoLend`'s replay handles the
  `forced-party-menu` marker. The extension is about 6 lines, as in `replayPlayerfaintTurns`.

## 5. Open questions / caveats

1. **Plan coverage, not player faint**: `202:player` (Giga Drain P) and `85:opponent` (Thunderbolt O) have no EXACT body plan. The tracker ends after them, so Thunderbolt P
   (D 3086) is not lendable in this history. The same applies to the post-KO audit's `85:opponent` / `202:opponent`.
2. **Forced-switch geometries covered**: a MAGIKARP L5 lead KO'd at the entry; a NINETALES L5 lead KO'd after an opponent KO (F); replacement from party slot 1 or from slot 2 (E); two successive player faints and forced menus (G). All give an identical geometry. Reset → reshow erases all prior history, so the
   occupancy after the switch-in does not depend on the history. The reshow plan is also pinned on route evidence (`docs/sprite-order-uncovered-units.md`). Every
   relied-on scenario is still a 3-mon BattleLab party with SLOWBRO, JOLTEON or SHEDINJA opponents. Species independence rests on the unit plans, which are
   species-blind.
3. Weather (sun) did not affect any window.
4. The voluntary switch (party menu → reshowBoth → recall → switch-in) is out of scope. Its recall pair group is still provisional.
5. 26 consumers remain class-inferred, as in the post-KO audit. ρ preserves the same §3.2 class argument.

## 6. Reproduce

```
V=../../vendor; export PYTHONPATH=$V/libmgba-py
# staging (already committed; re-running rewrites the same segments): base party JSON = the scenario with its trace replaced
$V/mgba-venv/bin/python tools/integration/playerfaintStage.py <base.json> tools/battle-lab/playerfaint-sunnyday-dragondance-swift.json '{"turns":[0,0,1,2],"menuDown":1,"frames":4200}'
#   (twice-sunnyday: '{"turns":[0,0,0],"menuDown":[1,2],"frames":3000}'; slot2-sunnyday: menuDown 2)
for n in sunnyday-dragondance-swift protect-thunderbolt lightscreen-healbell-gigadrain-thunderbolt slot2-sunnyday afterko-sunnyday twice-sunnyday secondko-sunnyday-swift; do
  for r in a b; do python3 tools/run-mgba-probe.py /tmp/pf/$n-$r.json -- $V/mgba-venv/bin/python tools/integration/postkoStateProbe.py tools/battle-lab/playerfaint-$n.json /tmp/pf/$n-$r.json /tmp/pf/$n-$r-rgb; done
  cmp /tmp/pf/$n-a.json /tmp/pf/$n-b.json          # ~8 s per run; RGB dirs ~0.5 GB each
  npx vite-node tools/integration/playerfaintModelCheck.ts -- playerfaint-$n tools/integration/fixtures/playerfaint/state-playerfaint-$n.json
done
npx vite-node tools/integration/playerfaintWhatIf.ts -- tools/integration/fixtures/playerfaint-sunny-day-player.json /tmp/pf/sunnyday-dragondance-swift-a-rgb /tmp/pf/sunnyday-dragondance-swift-b-rgb --lend role
npx vite-node tools/integration/playerfaintLendHistory.ts -- --run     # production host replay (--write re-records precedingTurns + receipt)
python3 tools/integration/playerfaintVerdicts.py                       # verdicts.json
```
