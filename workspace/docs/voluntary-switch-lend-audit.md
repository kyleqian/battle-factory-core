# Voluntary-switch lend audit: cancelled party menu, voluntary switch (reshowBoth → recall → switch-in), opponent KO after a player faint (S10A; ROM evidence + design)

Evidence and design only: no production code is changed, and only new files are added. All runs are direct in-process mGBA, Scene ON, never the shared HTTP oracles.
This follows `docs/playerfaint-lend-audit.md` (role map ρ, forced switch) and `docs/postko-consumer-audit.md` §3 (conditions (a)–(c)).

## 0. Results first

* **ROM ground truth** (§2). 7 BattleLab scenarios (`overrides.parties`), each run twice fresh; every pair is byte-identical. Model vs ROM: **45 activation edges, all known, 0 mismatches**.
  The checks per edge are F, occupancy, battler slots, ROM roles (`gHealthboxSpriteIds` + other half + bar, `shadowSpriteId`), empty task table, condition (b), and proposed lend == role lend.
  Geometries:
  * cancel: 3 scenarios, JOLTEON / NINETALES / SNORLAX leads vs SLOWBRO / JOLTEON;
  * voluntary switch: to party slot 1 (SNORLAX, NINETALES) and to party slot 2 (SNORLAX ×2);
  * player faint → forced switch-in (from party slot 1 or slot 2) → opponent KO + send-out (SLOWBRO or JOLTEON).
* **After the both-battlers reshow (cancel, or the return from a voluntary choose)**, occupancy is `{0,1,2,3,4,60..63}`:
  * battler sprites P 0 / O 1, healthbox mains P 2 / O 3 (other/bar 63,62 / 61,60), enemy shadow 4;
  * matrices P 0 / O 1, bitmap `0x3`, no tasks;
  * F `5,6,7,8,…`.

  These are exactly the `reshowBoth` survivors n0, n1, n2, n5, n8 from the identity order. Because the menu's `ResetSpriteData` erases all history, the state is the same whatever came before. **After the voluntary switch-in** occupancy is `{1,2,3,4,5,60..63}`, with the new player battler in slot 5 and slot 0 freed. Healthboxes, shadow and the opponent battler are unchanged, the bitmap is `0x3`, and F is `21,20,6,19,18,…`. That is the same in all 4 switch scenarios (slot 1 / slot 2, with or without an earlier cancel).
* **Recall unit verdict: PROMOTE.** The provisional `recall(slot)` plan predicts F and occupancy exactly at all 18 edges after a recall (4 scenarios, 2 species pairs, party slots 1 and 2). The `[n2, battler]` group order cannot be observed (§2.3). Four candidate orders all converge to the same F after `switchInParticles`:
  * production `D2,o<b>`;
  * swapped `Do<b>,2`;
  * battler in its own window first;
  * battler in its own window last.

  A wrong guess there can never reach a body edge.
* **Condition (b): YES under the role map** with the reshowBoth roles. The ROM occupant prefix is `[62,60,2,63,3,61,0,1,4]` after the reshow and `[62,60,2,63,3,61,5,1,4]` after the voluntary switch-in. With ρ (battlers → 6/8, healthbox mains → 0/1, shadow → 2) both relabel exactly to the entry prefix `[62,60,0,63,1,61,6,8,2]`, at every edge.
* **Opponent KO after a player faint** (case (c)): **today's production already handles it.** The roles set by `reshowPlayerGone` persist through the faint, the summary and the send-out. At the edge, occupancy is `{1,2,3,5,6,60..63}` and battlers are P 5 / O 6. The production lend equals the role lend, and Sunny Day P renders 158/158 and Swift O (slot-2 geometry) 80/80 with today's lend.
* **What-if** (§3): **15 dense windows, all 0 residual under the role lend**, compared against both fresh runs. Verdicts:
  * **NEEDS-PARAM (role lend):** Sunny Day P ×2, Swift O ×3, Thunderbolt O, Heal Bell P ×3, Giga Drain O;
  * **NEEDS-PARAM (role lend + allocator re-seed):** Light Screen P ×3. These are 88/88 with the entry allocator host and 15/88 without it;
  * **GENERALIZES:** Sunny Day P and Swift O after faint → KO, at 158/158 and 80/80 today.

  Today's production declines: 12–48 exact rows where measured.
* **Today's production host** (§3.1) has two separate failures:
  * After a **cancel** the tracker is known, but the lend is **null** because `reshowBoth` sets the roles to null.
  * After a **voluntary switch** the tracker is **invalid**: `RECALL_OPCODES` maps the recall to "return to ball".

  The emulated proposal fixes both. At all 15 fixtures the host is known, its view equals the model, and the lend equals the role lend. The existing `reseedLiveSpriteAllocatorAfterSendOut` already re-seeds after the voluntary switch-in once the roles are kept. The cancel return needs its own re-seed.
* **Proposal** (§4) has four parts:
  1. `battle-reshow {playerBattlerPresent: true}` sets roles from survivors n2/n5/n8.
  2. `switch-out` keeps the roles.
  3. The host maps the `RETURNATKTOBALL` recall to `switch-out` instead of invalidating.
  4. The allocator is re-seeded at the cancel return when the tracker is role-isomorphic.

## 1. Staging (`tools/integration/voluntaryStage.py`, `voluntaryScenarios.py`)

The stager is an adapted copy of `playerfaintStage.py` and drives the stock ROM from ROM state only. The action cursor `gActionSelectionCursor[0]` uses the layout FIGHT 0, BAG 1 / POKéMON 2, RUN 3, and the cursor is remembered across turns.

* **Starting a turn.** At each `HandleInputChooseAction` rise, the stager navigates to FIGHT (move item) or POKéMON (party item) from +24 frames, with presses 12 frames apart, then presses A.
* **Party menu.** When `CB2_InitPartyMenu` appears, the stager waits **+80 frames** (the fade ignores input) with the cursor on the current mon:
  * cancel: **B**. The prompt rises again and pops the next item, with the action cursor still on POKéMON, so the next item navigates UP;
  * switch: **DOWN ×n, +18 A** (selection menu), **+40 A** (SHIFT).
* **Forced menu.** Handled exactly as in `playerfaintStage.py`.

Example (`voluntary-cancel-slot1`):

| frame | event |
|---|---|
| 1 | prompt |
| 25 / 37 | DOWN / A |
| 60 | party menu |
| 140 | B |
| 194 | back in battle |
| 217 | prompt again (cursor was 2): UP, A, move |
| 1045 | prompt |
| 1104 | menu |
| DOWN, A, A | switch to slot 1 |
| 1379 | recall activation |
| 1606 | first body after the switch-in |

A **JOLTEON switch-in target absorbs Thunderbolt** (Volt Absorb: no animation), so the Thunderbolt scenario switches to NINETALES instead.

## 2. ROM ground truth (`tools/battle-lab/voluntary-*.json`; `fixtures/voluntary/state-*.json`, `roles-*.json`, `model-check-*.json`)

| scenario | party (player / opponent) | edges (frame: unit; **bold** = what-if) | model vs ROM | A == B (sha1) |
|---|---|---|---|---|
| `voluntary-cancel-slot1` | JOLTEON (Sunny Day, Swift, Thunderbolt, Light Screen), SNORLAX (Heal Bell, Light Screen, Swift, Sunny Day), MAGIKARP / SLOWBRO ×3 Swift (Brave, speed 0) | T1 cancel: **322 Sunny Day P**, 623 Swift O, 879 SUN; T2 switch → slot 1: 1379 recall, **1606 Swift O**, 1859 SUN; **2118 Heal Bell P**, 2509, 2879; **3153 Light Screen P**, 3383, 3641 | 12/12 known, 0 | `a448e6f6` |
| `voluntary-cancel-slot2` | NINETALES, MAGIKARP, SNORLAX (Light Screen, Heal Bell, …) / JOLTEON ×3 Swift (faster) | T1 cancel: **326 Swift O**, **516 Sunny Day P**, 873 SUN; T2 switch → slot 2: 1387 recall, **1614 Swift O**, 1864; 2127, **2432 Light Screen P**, 2718; 2993, **3187 Heal Bell P**, 3634 | 12/12 known, 0 | `4213da98` |
| `voluntary-cancel-lightscreen` | SNORLAX (Light Screen, Heal Bell, …), JOLTEON, MAGIKARP / SLOWBRO ×3 Swift | T1 cancel: **325 Light Screen P** (allocator consumer, first body), 555 Swift O; **835 Heal Bell P**, 1226 | 4/4 known, 0 | `9b73157c` |
| `voluntary-slot1-thunderbolt` | SNORLAX (speed 0), NINETALES, MAGIKARP / SLOWBRO ×3 Thunderbolt | 335 recall, **575 Thunderbolt O** (no EXACT plan for `85:opponent`: tracker ends after it) | 2/2 known, 0 | `998a41c4` |
| `voluntary-slot2-gigadrain` | JOLTEON, MAGIKARP, SNORLAX / SLOWBRO ×3 Giga Drain | 347 recall, **578 Giga Drain O** (no EXACT plan for `202:opponent`) | 2/2 known, 0 | `6e318688` |
| `voluntary-faint-ko-sunnyday` | MAGIKARP L5, NINETALES (Flamethrower, Sunny Day, Swift, …), SNORLAX / SHEDINJA (Swift), SLOWBRO ×2 | 99 Swift O (entry; KOs MAGIKARP) → forced → NINETALES; 935 Flamethrower P (KOs SHEDINJA) → summary + send-out; **2197 Sunny Day P**, 2498 Swift O, 2749 SUN, 3034 Swift P, 3218, 3470 | 8/8 known, 0 | `fff08091` |
| `voluntary-faint-ko-slot2-swift` | MAGIKARP L5, SNORLAX, NINETALES (slot 2; forced menu DOWN ×2) / SHEDINJA (Swift), JOLTEON ×2 Swift | 99 Swift O (entry) → forced → NINETALES; 947 Flamethrower P (KOs SHEDINJA) → summary + JOLTEON send-out; **2205 Swift O**, 2395 Sunny Day P, 2752 SUN | 5/5 known, 0 | `75c4dd33` |

The model is the production tracker (`createSpriteOrderTracker` + `applySpriteOrderPresentationEvent`), driven only by each scenario's semantic step list (`voluntaryModelCheck.ts` `SCENARIOS`).
* A voluntary menu is `action-prompt, party-menu-reset (open), party-menu-reset (exit), battle-reshow {playerBattlerPresent: true}`.
* A cancel then adds `action-prompt, actions-committed`.
* A switch then adds `switch-out, switch-in-start, switch-in-finish`.

### 2.1 ROM state at the edges

| geometry | occupancy | battler sprites [P, O] | matrices [P, O] | bitmap | tasks | occupant prefix | F head |
|---|---|---|---|---|---|---|---|
| known entry | `{0,1,2,6,8,60..63}` | [6, 8] | [1, 2] | `0x6` | – | `[62,60,0,63,1,61,6,8,2]` | `4,3,21,20,5,19,…` |
| after reshowBoth (cancel, or before the recall; 14 edges, F head at the first post-menu activation) | `{0,1,2,3,4,60..63}` | [0, 1] | [0, 1] | `0x3` | – | `[62,60,2,63,3,61,0,1,4]` | `5,6,7,8,9,…` |
| after the voluntary switch-in (slot 1 / slot 2; 18 edges, F head at the first one) | `{1,2,3,4,5,60..63}` | [5, 1] | [0, 1] | `0x3` | – | `[62,60,2,63,3,61,5,1,4]` | `21,20,6,19,18,…` |
| after player faint → forced switch-in → opponent KO + send-out (both geometries) | `{1,2,3,5,6,60..63}` | [5, 6] | [1, 0] | `0x3` | – | `[62,60,1,63,2,61,5,6,3]` | `0,4,21,20,7,19,…` |

The matrix numbers after the reshow are P 0 / O 1. That is a third matrix assignment, after the entry's 1/2 and the post-KO 1/0. It is still lowest-free and isomorphic, so the entry-label allocator host fits it, as the Light Screen windows show (§3).

### 2.2 Roles (ROM read, `voluntaryRoleProbe.py`, on the frame before every rise)

| | player battler | opponent battler | player healthbox (main, other, bar) | opponent healthbox | enemy shadow |
|---|---|---|---|---|---|
| after reshowBoth | 0 | 1 | 2, 63, 62 | 3, 61, 60 | 4 |
| after the voluntary switch-in | 5 | 1 | 2, 63, 62 | 3, 61, 60 | 4 |
| after faint → forced switch-in → KO + send-out | 5 | 6 | 1, 63, 62 | 2, 61, 60 | 3 |

`reshowBoth` = `Cf;Cf;Cfee;Cfee;Cf` from the identity order gives these survivors:
* n0 = player battler 0, n1 = opponent battler 1;
* n2..n4 = player healthbox 2, 63, 62;
* n5..n7 = opponent healthbox 3, 61, 60;
* n8 = shadow 4.

The roles in the model check are derived from these survivors and never from the ROM. They match the ROM read at all 45 edges (`checks.roles`). The recall and the switch-in leave the healthboxes and the shadow untouched.

### 2.3 Recall group order (`voluntaryRecallOrder.ts`, `fixtures/voluntary/recall-order-receipt.json`)

| recall variant | post-recall edges exact (4 scenarios) | F right after the recall (head) | F after the switch-in |
|---|---|---|---|
| production `…D0;D1;D2,o<b>;D3…` | 18/18 | `20,19,18,…` | `21,20,6,19,…` |
| swapped `Do<b>,2` | 18/18 | `20,19,18,…` (differs in the tail) | same |
| battler in its own window first | 18/18 | same head | same |
| battler in its own window last | 18/18 | `0,20,19,…` | same |

`switchInStart` + `switchInParticles` recreates and re-destroys slot 0 and the particle slots in a fixed order. That erases the position of the freed pair, and no activation can occur between the recall and the switch-in. So the provisional order is irrelevant to every lend, and the plan can be promoted as is. The ROM's own order inside the window remains unobserved, but it does not matter.

## 3. What-if (`tools/integration/voluntaryWhatIf.ts`, receipts `fixtures/voluntary/whatif-<draft>-<lend>-<allocator>.json`, summary `verdicts.json`)

The what-if is a copy of `playerfaintWhatIf.ts`. It renders the unchanged production adapter path (`liveView` of `liveAdapterFramebuffer.ts`) and replaces only `effect.spriteOrderInput`, plus `spriteAllocatorInput` when `--allocator none` is given. It covers every row of the accepted dense window (the activation plus the accepted offset/length of the move's playerfaint fixture) and compares against both fresh runs, with RGB sha256 checked against the committed state fixture.

Lends:
* `role` = ρ(F).
* `production` = today's `spriteOrderTrackerLend`, which is null after reshowBoth or recall.
* The `proposed` lend equals `role` at every edge (`checks.proposedEqualsRole`), so it is not rendered separately.

| move | side | scenario @ edge (geometry) | rows | role ρ(F) | today | verdict |
|---|---|---|---|---|---|---|
| SUNNY_DAY | P | cancel-slot1 @322 (after cancel) | 158 | **158/158** | 48/158 | **NEEDS-PARAM** ρ |
| SUNNY_DAY | P | cancel-slot2 @516 (after cancel, 2nd body) | 158 | **158/158** | declines (lend null) | **NEEDS-PARAM** ρ |
| SWIFT | O | cancel-slot2 @326 (after cancel) | 80 | **80/80** | declines | **NEEDS-PARAM** ρ |
| SWIFT | O | cancel-slot1 @1606 (after voluntary switch, slot 1) | 80 | **80/80** | 19/80 | **NEEDS-PARAM** ρ |
| SWIFT | O | cancel-slot2 @1614 (after voluntary switch, slot 2) | 80 | **80/80** | declines | **NEEDS-PARAM** ρ |
| THUNDERBOLT | O | slot1-thunderbolt @575 (after voluntary switch) | 237 | **237/237** | 12/237 | **NEEDS-PARAM** ρ |
| GIGA_DRAIN | O | slot2-gigadrain @578 (after voluntary switch, slot 2) | 230 | **230/230** | 28/230 | **NEEDS-PARAM** ρ |
| HEAL_BELL | P | cancel-slot1 @2118 (turn after switch) | 261 | **261/261** | 12/261 | **NEEDS-PARAM** ρ |
| HEAL_BELL | P | cancel-slot2 @3187 | 261 | **261/261** | declines | **NEEDS-PARAM** ρ |
| HEAL_BELL | P | cancel-lightscreen @835 (turn after cancel) | 261 | **261/261** | 12/261 | **NEEDS-PARAM** ρ |
| LIGHT_SCREEN | P | cancel-lightscreen @325 (first body after cancel) | 88 | **88/88** (entry allocator host) | 15/88 (no order, no allocator) | **NEEDS-PARAM** ρ + re-seed |
| LIGHT_SCREEN | P | cancel-slot1 @3153 | 88 | **88/88** (entry host) | 15/88 | **NEEDS-PARAM** ρ + re-seed |
| LIGHT_SCREEN | P | cancel-slot2 @2432 | 88 | **88/88** (entry host) | 15/88 | **NEEDS-PARAM** ρ + re-seed |
| SUNNY_DAY | P | faint-ko-sunnyday @2197 (faint → forced → KO + send-out) | 158 | 158/158 | **158/158** (today's lend) | **GENERALIZES** |
| SWIFT | O | faint-ko-slot2-swift @2205 (faint → forced from slot 2 → KO + JOLTEON send-out) | 80 | 80/80 | **80/80** (today's lend) | **GENERALIZES** |

The ρ lend without the allocator gives Light Screen 15/88 (`role-none`), so the allocator input is required. "declines" means today's lend is null at that edge: the model check and the host replay show `productionLend: null`. Those windows were not rendered a second time without an order.

### 3.1 Production host today vs the proposal (`voluntaryLendHistory.ts`, `fixtures/voluntary/host-replay-receipt.json`)

Each draft's semantic history (`precedingTurns`) is replayed through `liveSpriteOrderHost.ts` and the allocator seam, as `playerfaintLendHistory.ts` does. The history includes the orchestrator markers:
* `voluntary-party-menu {outcome: cancel}` → `openLiveSpriteOrderHostPartyMenu` + `returnLiveSpriteOrderHostFromPartyMenu({true,true})`, allocator invalidated, then the prompt cycle;
* `voluntary-party-menu {outcome: switch}` → open, allocator invalidated, then `beginLiveSpriteOrderTurn(…, fromPartyMenu: true)`.

The recall is the synthesized `set-battler-sprite-visibility` event with the `B_SCR_OP_RETURNATKTOBALL` provenance.

| | 5 post-cancel drafts | 8 post-voluntary-switch drafts | 2 faint → KO drafts |
|---|---|---|---|
| today: host tracker | known, view == model | **invalid** ("return to ball") | known |
| today: `lendLiveSpriteOrder` | **undefined** (roles null after reshowBoth) | undefined | lent, == role lend |
| proposed: tracker known, view == model, lend == role lend | 5/5 | 8/8 | 2/2 |
| proposed: allocator re-seed | at the cancel return (Light Screen @325: input **present**) | by the **existing** `reseedLiveSpriteAllocatorAfterSendOut` after the switch-in (roles kept → reseedable) | existing |

**Caveat (pre-existing, not voluntary-specific).** The allocator history is lost again after bodies that are not net-zero-known, such as Sunny Day 241, Swift 129 and Flamethrower 53 (`allocatorHistoryLostAfterBodies`). As a result, Light Screen @3153 / @2432, which come after Swift/Sunny Day turns, get no allocator input in a real history even with the proposal. Their 88/88 windows prove the re-seeded labels, not the host's history coverage. Light Screen as the first allocator body after a cancel (@325) is covered end to end.

## 4. Production proposal (no code changed here)

1. **`spriteOrderEventTransform.ts` `battle-reshow`**: with `playerBattlerPresent: true`, set `occupantRoles = {healthboxMain: {player: n2, opponent: n5}, shadow: n8}` from `lastSurvivors(cursor)` instead of `null`. This is the counterpart of `reshowPlayerGone` n1/n4/n7.
2. **`switch-out`**: keep `tracker.occupantRoles`, because the recall frees only the battler and its particles. Promote the plan from "provisional" to "group order unobservable" (§2.3). `switch-in-start` already accepts `lastUnit === "recall"`.
3. **`liveSpriteOrderHost.ts` `orderEventOf`**: map a `set-battler-sprite-visibility` event whose provenance is `B_SCR_OP_RETURNATKTOBALL` / `B_SCR_OP_RETURNTOBALL` (battler 0) to `{kind: "switch-out"}`. Today it is `invalidate "return to ball"`. Keep `B_SCR_OP_VARIOUS` invalidating, because that is the forced switch path (Roar etc.), which belongs to the sibling worker. Keep the opponent recall (battler 1) invalidating, because it is unprobed.
4. **Allocator re-seed**:
   * `liveSpriteAllocatorReseedable` already accepts `lastUnit === "switch-in" && occupantRoles !== null`, so it covers the voluntary switch-in once (1) and (2) land, through the orchestrator's existing call after every `switch-in-animation`.
   * Add one call at the cancel return: in `returnOrderHostFromPartyMenu`, the orchestrator `factoryRoundBattleOrchestrator.ts` ~1670, re-seed the allocator host invalidated at menu open when the returned host's `lastUnit === "reshow"` and it is role-isomorphic. Extend `liveSpriteAllocatorReseedable` with `lastUnit === "reshow" && occupantRoles !== null`.
   * The voluntary-choose path does not need a re-seed at the reshow, because the switch-in re-seed follows.
5. **Consumers**: no change.

Tests to add, all hermetic and built from this step's fixtures:
* A tracker unit test: `[party-menu-reset, battle-reshow{true}]` from any tracker gives roles `{2, 3, 4}`, battlers 0/1, and `spriteOrderTrackerLend` = `model-check-voluntary-cancel-slot1.json` edge 0 `roleLend` (`3,4,5,7,9,10,…`). Adding `switch-out, switch-in-start, switch-in-finish` then gives battlers 5/1, roles kept, and lend = edge 4 `roleLend` (`21,20,4,19,…`).
* A tracker scenario test: feed `SCENARIOS` of `voluntaryModelCheck.ts` and assert that the lend equals `roleLend` at all 45 edges. Today that lend is null.
* A host test: replay each draft's `precedingTurns` with the `voluntary-party-menu` markers, as `replayVoluntaryTurns(…, "today")` does once production implements the proposal. Assert that the lend is defined and equals `roleLend`, and that the Light Screen @325 allocator input is present.
* Recall order: pin the §2.3 invariance, so that all four variants give an equal F after the switch-in.
* Dense acceptance: the 15 drafted fixtures `tools/integration/fixtures/voluntary-*.json` are in schema `voluntary-adapter-draft/v1`, `draft: true`, with `precedingTurns` recorded. Run them through `verifyLiveAdapterFramebuffer` once `fixturePostKoLend`'s replay understands the `voluntary-party-menu` marker and the recall provenance field `provenanceOpcodeName`, about 15 lines as in `replayVoluntaryTurns`.

## 5. Open questions / caveats

1. **Allocator history coverage** (§3.1 caveat): Light Screen in a later turn after Swift or Sunny Day still declines. That is the allocator net-zero table, not the voluntary chain.
2. **No EXACT plan** for `85:opponent` and `202:opponent`. The tracker ends after Thunderbolt O and Giga Drain O, as in the earlier audits.
3. **Not probed**:
   * a cancel while a battler is hidden (semi-invulnerable), or after a faint;
   * a second cancel in the same turn (the menu reset makes it idempotent by construction);
   * an opponent recall (AI switch; battler 1);
   * Pursuit on a voluntary switch-out (route evidence in `issue135`, not re-probed);
   * a voluntary switch to a mon that later faints.

   Every relied-on scenario is a 3-mon BattleLab party.
4. **Not observable, but harmless**: the ROM order of the recall group itself (§2.3).

## 6. Reproduce

```
V=../../vendor; export PYTHONPATH=$V/libmgba-py
python3 tools/integration/voluntaryScenarios.py /tmp/vol     # base parties + stager plans (prints the plans)
$V/mgba-venv/bin/python tools/integration/voluntaryStage.py /tmp/vol/base-cancel-slot1.json tools/battle-lab/voluntary-cancel-slot1.json \
  '{"turns":[{"cancel":true},0,{"switch":1},0,1],"frames":5200}'   # already committed; re-running rewrites the same segments
for n in cancel-slot1 cancel-slot2 cancel-lightscreen slot1-thunderbolt slot2-gigadrain faint-ko-sunnyday faint-ko-slot2-swift; do
  for r in a b; do python3 tools/run-mgba-probe.py /tmp/vol/$n-$r.json -- $V/mgba-venv/bin/python tools/integration/postkoStateProbe.py tools/battle-lab/voluntary-$n.json /tmp/vol/$n-$r.json /tmp/vol/$n-$r-rgb; done
  cmp /tmp/vol/$n-a.json /tmp/vol/$n-b.json      # output files must not pre-exist (run-mgba-probe.py requires a fresh output)
  python3 tools/run-mgba-probe.py /tmp/vol/roles-$n.json -- $V/mgba-venv/bin/python tools/integration/voluntaryRoleProbe.py tools/battle-lab/voluntary-$n.json /tmp/vol/$n-a.json /tmp/vol/roles-$n.json
  npx vite-node tools/integration/voluntaryModelCheck.ts -- voluntary-$n tools/integration/fixtures/voluntary/state-voluntary-$n.json tools/integration/fixtures/voluntary/roles-voluntary-$n.json
done
npx vite-node tools/integration/voluntaryRecallOrder.ts               # recall group-order receipt (--write)
python3 tools/integration/voluntaryDrafts.py                          # draft fixtures (keeps recorded precedingTurns)
npx vite-node tools/integration/voluntaryWhatIf.ts -- tools/integration/fixtures/voluntary-swift-opponent.json /tmp/vol/cancel-slot1-a-rgb /tmp/vol/cancel-slot1-b-rgb --lend role --allocator entry
npx vite-node tools/integration/voluntaryLendHistory.ts -- --run      # today vs proposed host replay (--write re-records precedingTurns + receipt)
python3 tools/integration/voluntaryVerdicts.py                        # verdicts.json
```
