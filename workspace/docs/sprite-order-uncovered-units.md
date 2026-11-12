# Sprite-order uncovered units: faint, next-mon summary/send-out, switch-in, party menu, reshow, recall, trainer slide (S10A, ROM evidence + design)

Evidence and design only; **no production code is changed** (new files only). Direct in-process mGBA, Scene ON, never the shared HTTP oracles. Starting point: the seven unit classes of
`docs/sprite-order-real-route.md` §3 that invalidate the tracked free order `F` in real Factory battles. Every relied-on probe was run twice fresh and the A/B outputs are byte-identical
(sha1 below). Model = the production tracker (`src/engine/spriteOrderEventTransform.ts`, `createSpriteOrderTracker` / `applySpriteOrderPresentationEvent`) + `applySpriteOrderUnitPlan`
for the proposed units, driven only by recorded EVENTS, never by observed masks (except the explicit "isolated" mode, §1.4).

## 1. Results

### 1.1 Verdict per class

Call streams are the exact `CreateSprite*/DestroySprite` entries with their caller symbols (`fixtures/sprite-order-uncovered/units.json`, `windows[].creates[].by` / `destroyBy`); the plan is the
allocation-relative window list in the plan-token format of `docs/sprite-order-body-plans.md` §2 (text form of `decodeSpriteOrderPlan`: `C` = creates `f` lowest-free / `e` highest-free, `D` = destroys
in array order, `n` = n-th sprite created by the unit, `o<slot>` = external occupant, `c<ago>.<r>` = r-th survivor of the unit `ago` units earlier). Instances: 5 route traces (ONE history family,
`battle1-*` share a button prefix; distinct frames in parentheses) + 12 BattleLab KO / switch scenarios (second geometry: other species, party roster, move set, KO order, trainer id).

| class (ROM marker) | call stream (callers → symbols) | verdict | transform | instances route (distinct) / lab |
|---|---|---|---|---|
| **faint** opponent (`SpriteCB_AnimFaintOpponent`), player (`FreeMonSpriteAfterFaintAnim`) | one `DestroySprite` of the fainted battler's sprite, no creates | **CONSTANT-SHAPE** `D[battlerSlot]` (SINGLE group); slot varies (opp 8, 5, 0; player 6, 5), so it needs the tracked battler slot | `D o<slot>` (slot = model's own battler slot) | opp 6 (3) / 7; player 3 (2) / 1 |
| **next-mon party summary** (`CreatePartyStatusSummarySprites`, opponent) | `CreateSprite` bar + 6x `CreateSpriteAtEnd` balls (`battle_interface.c:1494-1511`: bar once, `PARTY_SIZE` = 6 balls always) | **CONSTANT-SHAPE**, no party-size / species / side dependence (source loop is `i < PARTY_SIZE`); no destroys | `Cfeeeeee` (bar = lowest free, balls = 59..54) | 5 (2) / 5 |
| **next-mon send-out** (`StartSendOutAnim`, `Task_HidePartyStatusSummary_DuringBattle`, `PokeBallOpenParticleAnimation`) | creates: `SpriteCB_WaitForBattlerBallReleaseAnim` n0 (invisible callback sprite), `StartSendOutAnim` n1 (**the battler sprite**), `Task_DoPokeballSendOutAnim` n2 (ball), 16 particles; destroys: summary bar + 6 balls (`DestroySpriteAndFreeResources` / `Task_HidePartyStatusSummary…`), `HandleBallAnimEnd` (ball, slot immediately re-taken by the 16th particle), `SwitchIn_TryShinyAnim` (callback sprite), 16 `DestroyBallOpenAnimationParticle` | **CONSTANT-SHAPE given** the summary unit directly before it; destroy groups: summary group = 6 balls tied (subpriority 9, F order 54..59) + bar (subpriority 10) = FDERIVED/static, all others SINGLE; 1 survivor (n1) | `nextSendOut` (§2) | 5 (2) / 5 |
| **forced switch-in** after the party menu (`StartSendOutAnim`, ball particles) | start: callback n0, battler n1, ball n2; particles: 16 creates, `HandleBallAnimEnd` frees the ball (n2), `SwitchIn_TryShinyAnimShowHealthbox` frees n0, 16 particle destroys | **CONSTANT-SHAPE** (both halves); absolute slots differ (route 4,5,6 / lab 0,5,6) only | `switchInStart` + `switchInParticles` | 2 (2) / 1 |
| **party menu** open/return (`CreateMonIconSprite`…, `Task_HandleChooseMonInput`) | `ResetSpriteData` frees all 64 slots first (observed identity `F`, empty occupancy), 13 lowest-free creates, then `ResetSpriteData` again on exit | **net CONSTANT = reset to identity** (the window split of the 13 creates VARIES 5/7/1 vs 6/6/1 with the menu content; irrelevant, the exit reset erases it); every observed menu open and return is an all-free identity frame | `reset` (F = [0..63], occupancy ∅) at menu open **and** at menu return | 3 (2) / 2 |
| **battle reshow** (`CreateBattlerSprite`, `CreateBattlerHealthboxSprites`, `LoadAndCreateEnemyShadowSprites`) | from identity: battler sprite(s), healthbox sprites f/e, enemy shadow | **CONSTANT-SHAPE keyed by whether the player battler exists**: player gone (forced switch after a faint) 8 creates, both battlers (voluntary return) 9 creates | `reshowPlayerGone`, `reshowBoth` | 2 (2) / 1 |
| **voluntary recall** (`InitAndLaunchSpecialAnimation` B_ANIM_SWITCH_OUT_PLAYER_MON) | 16 particle creates, 16 `DestroyBallOpenAnimationParticle`, `FreeMonSpriteAfterSwitchOutAnim` frees the battler in the same window as particle n2 | CONSTANT-SHAPE on **one** instance; the group `[n2, battler]` is a 2-slot tie class that is unverified on a second geometry (provisional) | `recall(battlerSlot)` | 0 / 1 |
| **end-of-battle trainer slide** (`HandleEndTurn_FinishBattle` → `OpponentHandleTrainerSlide`) | one `CreateSprite` | **CONSTANT-SHAPE**: one lowest-free create that lives to the end of the battle | `Cf` | 1 (1) / 0 (+3 identical in the extra probed traces) |
| prompt interrupted by the party menu | bounce pair create `C[3,4]`, no destroy | = the prompt rule's create half; the menu reset erases it | `action-prompt` then `reset` | 3 / 3 |

**VARIES with**: the faint slot (which battler / history); the reshow shape (player battler present or not); the party-menu window split (menu content). **Nothing varies with species, party
size (always 6 balls), side (summary bar side differs only in x), or which mon fainted** beyond the slot identity. **NEEDS-KEYS: none** (no unit has a destroy group whose order needs live `y`/priority keys);
the only two multi-slot groups are the summary group (FDERIVED, §1.1) and the recall pair (one observation).

### 1.2 Occupancy after each unit (known entry NOT restored)

Entry occupancy (first prompt, `KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER`) = `{0,1,2,6,8,60..63}` (player battler 6, opponent 8). `spriteOrderTrackerLend` (and the allocator host's consumers) only lend while occupancy equals that set.
Real route (turn 17 history, `raw/battle1-turn17-dense-0.json` mask samples):

| after | occupied slots |
|---|---|
| opponent faint #1 | `{0,1,2,6,60..63}` (8 freed) |
| summary | `+ {3,54..59}` |
| send-out #2 | `{0,1,2,5,6,60..63}`: **the new opponent battler is slot 5, not 8** (n0 = 4 callback, n1 = 5 battler, n2 = 7 ball; lowest-free order after the bar took 3) |
| opponent faint #2 / send-out #3 | 5 freed, then 5 again (bar takes 3, callback 4, battler 5) |
| player faint | player battler 6 freed: `{0,1,2,5,60..63}` |
| menu return + reshow | `{0,1,2,3,60..63}` (opponent battler now **slot 0**, healthboxes 1,2, enemy shadow 3, 60..63) |
| forced switch-in | `{0,1,2,3,5,60..63}` (player battler **slot 5**) |
| opponent faint #3 / trainer slide | `{1,2,3,5,60..63}` then `+ 0` (slide sprite takes the lowest free slot) |

So the free-slot sets (and hence lowest-free consumer slots) differ from the entry after the first KO; the order lend must be generalised from "occupancy == entry set" to "occupancy == the model's own cursor occupancy" (replay: the modelled tracker's `occupied` equals the ROM mask at 100% of the 44 + 40 additional known edges; **lent** stays 44/91 because the existing gate rejects every post-KO edge, §3 proposal 3).

### 1.3 Affine-matrix bitmap and task table (`fixtures/sprite-order-uncovered/affine-units.json`, probe `spriteOrderUncoveredAffineProbe.py`, 7 runs x2 byte-identical)

* **Baseline `0x6` is NOT restored after a faint + send-out.** Matrix numbers are lowest-free per `AllocOamMatrix`: entry = player battler matrix 1, opponent matrix 2 (`0x6`). Opponent faint frees matrix 2 (→ `0x2`; or 0 when the opponent holds 0, `0x3 → 0x2`); the next send-out's battler takes the **lowest free matrix 0** (→ `0x3`: opponent 0, player 1) and keeps it. Player faint frees matrix 1 (route `0x3 → 0x1`; lab `0x6 → 0x4`, then `0x0` after the menu reset). Reshow after the reset: opponent battler matrix 0 (`0x1`); forced switch-in: transient `0x7` while the ball sprite is affine, settles `0x3` (opponent 0, player 1); voluntary recall: `0x3 → 0x2`, then switch-in `0x2 → 0x7 → 0x3`. Party menu: bitmap `0x0` throughout (the reset clears `ResetAffineAnimData`). Trainer slide: `0x2 → 0x3` (the slide sprite's matrix 0).
* **Task table:** empty at the entry; summary leaves one task (`TaskDummy`, then `Task_HidePartyStatusSummary_DuringBattle` which ends with the send-out); send-out leaves `Task_HandleMonAnimation` + `Task_DuckBGMForPokemonCry` (+ `Task_FadeMon_ToNormal`) for ~100 frames after the last allocator call, then the table is empty again; faint tasks: none; party menu: one input task (slot 0) then empty. Task slot numbering after a send-out is not the entry numbering (slots 1..3 reused). So the allocator-plan-v2 matrix/task baseline (`0x6`, no tasks) is valid only until the first faint/switch, and the post-unit baselines are the constants above (`0x3` after a next-mon send-out with no tasks once the cry tasks finish, `0x3` after a forced switch-in, `0x0` in the menu).

### 1.4 Strict replay with the units modelled (`fixtures/sprite-order-uncovered/replay-receipt.json`, `tests/spriteOrderUncoveredUnits.test.ts`)

Strict = starts at `knownEntrySpriteOrderState("ordinary-factory")`, never re-seeded from the ROM (production behaviour: any unmodelled unit leaves the order invalid). Baseline = today's behaviour **plus the Endeavor/Fake Tears rows** (`docs/sprite-order-policy-gaps.md` §1 B, applied as an override here because the generated production table does not contain them at this HEAD) with every uncovered unit invalidating.

| set | move edges | known / exact / mismatched, baseline | known / exact / mismatched, units modelled | anim edges known (mismatch), baseline → modelled |
|---|---|---|---|---|
| real route, 5 traces | 91 | **44 / 44 / 0** (the figure of the brief) | **84 / 84 / 0** (turn17 24/29, switch 23/24, dragonbreath 4/4, grovyle-faint 10/10, victory 23/24) | 9 → 22 (0) |
| BattleLab KO/switch, 12 scenarios | 27 | 15 / 15 / 0 | **25 / 25 / 0** | 2 → 6 (0) |
| unit checks (predicted F + occupancy vs ROM after each modelled unit) | | | route 18/18, lab 18/18 (**0 mismatches, 0 occupancy mismatches**) | |
| "isolated" (re-seeded from the ROM pre-state whenever unknown; rule test in isolation; battler slots then hinted from the unit stream) | | 91/91 route, 27/27 lab | **91 / 91 / 0** route (26 unit checks), **27 / 27 / 0** lab (22 unit checks), 0 mismatches | |

The remaining 7 route edges (strict) are unknown only because a later body has no EXACT plan (`28:opponent` NEEDS-KEYS, Fly `19`, `185`, `7:player` ... frames 15044/15468, `docs/sprite-order-real-route.md` §2): body coverage, no longer uncovered units. The first invalidation of the route traces moved from the first faint (frame 6519; 3336 in `dragonbreath`, an interrupted prompt) to `28:opponent` (frame 15468 turn17, 15044 switch/victory) or never (`dragonbreath`, `grovyle-faint`). Lab: `gate6-ohko-*`, `issue129-noitem` stop at `90:player` (no plan), `issue131` at `31:opponent`.
Chain covered end to end in strict mode: faint → summary → send-out → prompt → body (opponent KO, 6 lab scenarios + route), player faint → party menu (reset) → reshow → forced switch-in (route), and a **voluntary** chain: party menu → reshow (both battlers) → Pursuit body → recall → switch-in (`issue135-pursuit-switch-intercept`, 4/4 edges known and exact).

## 2. The transforms (production plan-token text, `UNIT_PLANS` in `tools/integration/spriteOrderUncoveredReplay.ts`)

```
faint(side)        D o<battlerSlot[side]>                      ; battlerSlot = single survivor n1 of the latest send-out/switch-in unit (entry: opp 8, player 6)
summary            Cfeeeeee
nextSendOut        Cff;Cf;Dc1.6,c1.5,c1.4,c1.3,c1.2,c1.1,c1.0;Cf x12;D2;Cf;Cf;Cf;D0;D3;D4;...;D15;D16;D17;D18   ; applied directly after `summary` (c1.r = its survivors); 1 survivor (n1)
switchInStart      Cff;Cf                                       ; 3 survivors (n0 callback, n1 battler, n2 ball)
switchInParticles  Cf x13;Dc1.2;Cf;Cf;Cf;Dc1.0;D0;D1;...;D15   ; applied directly after switchInStart; no survivors; battler = switchInStart n1
reset              F = [0..63], occupancy {} (party menu open AND party menu return); battler slots forgotten
reshowPlayerGone   Cf;Cfee;Cfee;Cf                               ; player battler already gone; opponent battler = n0
reshowBoth         Cf;Cf;Cfee;Cfee;Cf                            ; player n0, opponent n1
recall(slot)       Cf x16;D0;D1;D2,o<playerBattlerSlot>;D3;...;D15   ; provisional (1 instance)
trainerSlide       Cf
```

Rules the host must follow (each is what the replay does): (a) `summary` and `nextSendOut` are applied back to back (the `c1.r` tokens resolve against the previous unit; if anything intervenes the tokens do not resolve and the tracker invalidates, never guesses); (b) `switchInParticles` directly after `switchInStart`; (c) a faint with an unknown battler slot, an unknown reshow variant, or a plan that does not resolve invalidates; (d) after `reset` every unit is applicable again (the tracker is known after a menu even if it was invalid before: **the party menu is the one event that revives an invalid order**).

## 3. Production mapping proposal (no code changed)

Engine markers (semantic events from the kernel, `battleScriptEvents.ts`; presentation commands from `battleResolutionPresentation.ts`):

| unit | kernel semantic event (script command) | presentation command | host today |
|---|---|---|---|
| faint | `faint-animation` (`battleScriptEvents.ts:159`, `Cmd_dofaintanimation`, `battle_scripts_1.s:2812/2820`) | `type: "faint"` (`battleResolutionPresentation.ts:177`, built at `:3537-3573`; side = `battler`) | `INVALIDATING_EVENTS` (`liveSpriteOrderHost.ts:39-42`) |
| next-mon summary | `draw-party-status-summary` battler 1 (`battleScriptEvents.ts:168`; `BattleScript_FaintedMonSendOutNew`, `battle_scripts_1.s:2884`) | `type: "party-summary"`, `visible: true` (`:190`, `:3577-3592`) | invalidating |
| next-mon send-out | `hide-party-status-summary` battler 1 (`:163`, `battle_scripts_1.s:2889`) then `switch-in-animation` battler 1 (`:303`, `:2890`, `battleScriptSwitchinOpcode.ts:771`); apply `nextSendOut` at the **switch-in-animation** event, the hide event is the marker that the previous unit was `summary` | `type: "switch-in"` (`:200`, `:3640-3654`) | invalidating |
| player side `draw/hide-party-status-summary` battler 0 | same events | `party-summary` battler 0 | **no allocation observed** (forced and voluntary: 0 allocator calls) → no-op, not invalidating |
| forced switch-in after the menu | `switch` (player) + `switch-in-animation` battler 0 | `switch-in` battler 0, lifecycle phase `presenting-switch-in` (`battleResolutionPresentation.ts:399`, set at `:4045`; orchestrator `prepareResolutionPalette` `factoryRoundBattleOrchestrator.ts:2079-2108`, today invalidates "switch-in presentation") | invalidating |
| party menu open | command-presentation lifecycle phase `party-handoff` (`battleCommandPresentation.ts:99/611`), entered at `factoryRoundBattleOrchestrator.ts:2735-2768` (today `invalidateLiveSpriteOrderHost(…, "party menu")`); forced menu: resolution phase `forced-party-handoff` (`battleResolutionPresentation.ts:399`, `factoryRoundBattleOrchestrator.ts:1819-1824`, `:2379`) | – | invalidating |
| party menu return | cancel: `cancelBattleCommandPartySelection` branch `factoryRoundBattleOrchestrator.ts:2658-2668`; choose: the `switch` decision submit | – | no hook (`pendingPartyCancelEntryHost` is the palette host's equivalent) |
| voluntary recall | `set-battler-sprite-visibility` with opcode `B_SCR_OP_RETURNATKTOBALL`/`RETURNTOBALL` (`liveSpriteOrderHost.ts:36` `RECALL_OPCODES`) | `type: "switch-out"` (`battleResolutionPresentation.ts:217`, `:3500-3512`) | invalidating ("return to ball") |
| trainer slide | `trainer-slide-in` / `trainer-slide-out` (`battleScriptEvents.ts:239/243`; `HandleEndTurn_FinishBattle`), then `outcome` (`:308`) | `type: "trainer-slide"` (`:248`, `:3322-3331`, `TRAINER_SLIDE_TIMING` `:672`) | invalidating; only the win-slide `Cf` is modelled (trainer-slide-in at battle start is the entry stream; mid-battle `trainerslideout` of the AI "about to switch" prompt is unobserved) |

Proposed changes (in order of benefit):
1. **`spriteOrderEventTransform.ts`**: new presentation events `faint {side}`, `party-summary-next {}`, `next-mon-send-out {}`, `switch-in-start {}`, `switch-in-finish {}`, `party-menu-reset {}`, `battle-reshow {playerBattlerPresent}`, `switch-out {}`, `trainer-slide-end {}` implementing §2 with the tracker holding `battler: {player, opponent}` (updated from the unit's single survivor) and `lastUnit` (adjacency guard). `reset` creates a fresh known tracker (`initSpriteOrderState()`), the one revive path.
2. **`liveSpriteOrderHost.ts` `orderEventOf`**: remove `faint-animation`, `draw-party-status-summary`, `hide-party-status-summary`, `switch-in-animation`, `trainer-slide-*` from `INVALIDATING_EVENTS`; map as in the table above, with the opponent/player split on `battler`; `outcome` stays invalidating.
3. **Lend gate**: `spriteOrderTrackerLend` (`spriteOrderEventTransform.ts`, requires `occupied == KNOWN_ENTRY_OCCUPIED`) must lend while the tracker's own cursor occupancy is exact (it is, §1.4); the allocator host `knownEntrySpriteAllocator.ts` needs the matching post-unit occupancy/matrix baselines of §1.2/§1.3 (opponent battler 5 / 0, matrix 0, bitmap `0x3`) or must keep declining after the first KO (today's behaviour, correct but conservative).
4. **`factoryRoundBattleOrchestrator.ts`** `:2735-2768` / `:2086-2108`: replace the two invalidations by `party-menu-reset` (menu opened) and `battle-reshow` (menu returned/cancelled; variant from "player battler exists") plus the switch-in start/finish events at the `presenting-switch-in` phase.

Tests to add (all derivable from this step's fixtures): `tests/liveSpriteOrderHost.test.ts` resolution views `[faint-animation(1), draw-party-status-summary(1), … hide-party-status-summary(1), switch-in-animation(1)]` keep `known` and equal `events/battle1-turn17-dense.json` observed `F` at the next prompt/body edge (frames 6519 / 6587 / 6726 up to the next body edge); player branch `[faint-animation(0)] + party-menu-reset + battle-reshow(false) + switch-in start/finish` equals the `obsF` of the U4b event (frame 20389); unit tests that each plan text decodes and resolves from the entry state (`tests/spriteOrderUncoveredUnits.test.ts` pins the plan texts against every extracted instance and the replay counts above); adjacency guard tests (send-out without a summary invalidates; faint with an unknown battler slot invalidates; menu reset revives an invalid tracker).

## 4. Method notes and caveats

* **Windows.** A window = consecutive same-kind allocator calls inside one frame (a destroy followed by a create in the same frame, e.g. `HandleBallAnimEnd` then the 16th particle taking the freed slot, is two windows in call order); a destroy group's array order is the observed `F` order at frame+1 (the sort row), exactly as in `spriteOrderBodyPlans.py`. Destroys of a slot recreated earlier in the unit name the newer sprite (live creation index).
* **Independence.** Route traces are one history family; the lab scenarios add other species (party species ids, player/opponent: 191/16/66 vs 217/1/1, 217/1/1 vs 191/16/66, 217/1/1 vs 191x3, 51/183/27 vs 11/191/194, 202/1/4 vs 143/129/187, 168/1/1 vs 303/191/191, 27/218/194 vs 84/19/19 and 53/19/19, 9/132/132 vs 26/134/132; trainer ids 110/150/222), rosters, KO orders (single / double / toxic end-turn KO / Shell Bell / OHKO) but all are 3-mon Factory-style parties, so party-size independence rests on the source loop (`PARTY_SIZE`), not on a 2- or 6-mon observation. The lab "forced player switch" scenario ends inside the menu (menu-selection button scripts for it were not accepted by the menu in this step: 2/2 attempts left the selector waiting), so the forced switch-in has **route evidence only** (+ the voluntary lab chain); a second forced switch-in geometry is open.
* **Scene caveat** as in `docs/sprite-order-real-route.md`: the ground-truth scripts were recorded Scene OFF, run here Scene ON; the histories are real ordinary battles, not asserted equal to the OFF traces' move sequence.
* Extra traces probed twice fresh (byte-identical, same history family, not committed): `battle1-winline-b-swap` (9710a2b4…), `battle1-swapyes-b` (c12a7cf6…), `battle1-winline-a-murkrow` (b28b625a…), `battle1-postwin-dense` (5cec3d5f…): all unit classes up to the trainer slide are shape-identical to turn 17; after the slide the battle returns to the overworld (`ReturnFromBattleToOverworld`, out of scope) and the next battle's entry has several cluster-cut variants (E3 17→16 split etc.), i.e. a second battle needs its own entry-stream check.
* Open: (1) mid-battle `trainerslideout`/`about to switch` prompt and Substitute/Transform ownership changes remain invalidating; (2) the recall pair-group order `[n2, battler]` (one instance); (3) a second forced switch-in geometry; (4) doubles (out of scope); (5) a player-side summary (`draw-party-status-summary` battler 0) allocation in other contexts (none seen); (6) the allocator host's matrix/task baselines for `lend` after a KO.

## 5. Evidence and regeneration

| claim | file |
|---|---|
| per-unit windowed streams (callers), plans, survivors, occupancy, F heads | `tools/integration/fixtures/sprite-order-uncovered/units.json` (summary per class at the top) |
| events with unit annotations (consumed by the replay) | `…/events/<trace>.json` (5 route + 12 lab) |
| raw per-frame order/mask rows + allocator calls for the 12 lab scenarios | `…/raw/<scenario>.json`; scenarios `…/scenarios/*.json` (BattleLab copies with `profile: battle-scene-on`) |
| route raws | `tools/integration/fixtures/sprite-order-real-route/raw/*` (re-probed fresh x2 this step: byte-identical to the committed files) |
| affine/task | `…/affine-raw/<name>.json`, `…/affine-units.json` |
| replay receipt | `…/replay-receipt.json` (`summary` = the §1.4 numbers) |
| tests | `tests/spriteOrderUncoveredUnits.test.ts` |

Raw sha1 (A == B fresh runs): lab rows/calls identical for all 12 scenarios x (rows, calls); `spriteOrderUncoveredLabProbe.py` outputs sha1 in `/tmp` only (re-run to reproduce). Route: turn17 `37ae5144…`, switch `b9bf1ecf…`, dragonbreath `fc66a4e5…`, grovyle-faint `22cf46c7…`, victory `9e65d9ec…` (equal to `sprite-order-real-route/raw`).

```
V=../../vendor; export PYTHONPATH=$V/libmgba-py; PY=$V/mgba-venv/bin/python
for n in forced-switch-player-choice forced-switch-ai-choice hit-chain-ko gate6-ohko-hit destiny-bond-ko issue129-noitem-ohko endturn-toxic-ko issue131-endturn-order-switch factory-ai-switch-receipt-a issue135-pursuit-switch-intercept gate6-ohko-sturdy issue129-shellbell-ko-heal; do
  $PY tools/integration/spriteOrderUncoveredLabProbe.py tools/integration/fixtures/sprite-order-uncovered/scenarios/$n.json /tmp/lab-$n.json   # ~20 s each, direct mGBA, copy to fixtures/.../raw/$n.json
  $PY tools/integration/spriteOrderUncoveredAffineProbe.py lab 0 tools/integration/fixtures/sprite-order-uncovered/scenarios/$n.json /tmp/aff-$n.json   # affine/task rows (7 of them committed)
done
python3 tools/integration/spriteOrderUncoveredExtract.py --write          # units.json + events/*.json (pure python)
python3 tools/integration/spriteOrderUncoveredAffine.py --write           # affine-units.json
npx vite-node tools/integration/spriteOrderUncoveredReplayRun.ts -- --write   # replay-receipt.json + summary
npx vitest run tests/spriteOrderUncoveredUnits.test.ts --maxWorkers=4
```
Scripts: `spriteOrderUncoveredExtract.py` (streams, plans, verdict shapes; reuses `spriteOrderRealRouteReplay.build`), `spriteOrderUncoveredLabProbe.py` / `spriteOrderUncoveredAffineProbe.py` (adapted copies of `tools/compare/spriteOrderRealRouteProbe.py` / `affineTaskProbe.py`: BattleLab staging hooked from the first frame; the affine probe keeps the whole battle instead of cutting at the last reset), `spriteOrderUncoveredReplay.ts` (+ `…ReplayRun.ts`), `spriteOrderUncoveredAffine.py`.
