# Sprite-order rule table vs REAL ordinary-Factory battle histories (S10A, ROM evidence)

Evidence only; no production code. Validates the event-keyed rule table of `docs/sprite-order-gap-causes.md` §2 (bounce pair per prompt, per-(move, side)
body plans, hit-animation blip, stat animation, invalidate list) on the real playable route: open Level-50 rental draft (`oracle/bootstrap/factory.json`,
Scene ON, direct in-process mGBA, never the HTTP oracles) driven by the committed ground-truth button scripts. Model = the production TS applier
(`src/engine/spriteOrderProvider.ts`: `knownEntrySpriteOrderState("ordinary-factory")`, `spriteOrderPlanTableFromFixture`, `createSpriteOrderPlanCursor`,
`applySpriteOrderUnitPlan`, `spriteOrderForSlots`), driven only by recorded EVENTS (never observed masks).

## 1. Results (first)

Traces used (all `tools/compare/traces-groundtruth/`, all from the draft): `battle1-turn17-dense` (longest: 17 turns, ends in the victory), `battle1-switch`,
`battle1-turn2-dragonbreath`, `battle1-grovyle-faint`, `battle1-victory`. Raw rows `fixtures/sprite-order-real-route/raw/<trace>-0.json`; two fresh runs per trace were
byte-identical (sha1 below; the `-1` copies were deleted after comparing). The model replay + extractor outputs are also byte-identical across two regenerations.

| trace | frames kept | move edges | strict: known / exact | resync: tested / exact / mismatch | anim edges (tested/exact) | rule unit checks (prompt+blip) | table body/anim unit checks |
|---|---|---|---|---|---|---|---|
| battle1-turn17-dense | 1048..23601 | 29 | 1 / 1 | 29 / 29 / **0** | 9 (2/2) | 39/39 | 18/18 |
| battle1-switch | 1048..19158 | 24 | 1 / 1 | 24 / 24 / **0** | 7 (1/1) | 32/32 | 18/18 |
| battle1-turn2-dragonbreath | 1048..3846 | 4 | 1 / 1 | 4 / 4 / **0** | 1 (0/0) | 5/5 | 2/2 |
| battle1-grovyle-faint | 1048..7312 | 10 | 1 / 1 | 10 / 10 / **0** | 3 (1/1) | 13/13 | 7/7 |
| battle1-victory | 1048..19634 | 24 | 1 / 1 | 24 / 24 / **0** | 7 (1/1) | 32/32 | 18/18 |

(`fixtures/sprite-order-real-route/replay-receipt.json` → `results[].moveEdges / animEdges / bodyLevel`; per edge: `frame, kind, move, side, attacker, known, trivial, exact, occupiedMatch, consumerOrderExact, observedFHead` (24 entries), `predictedFHead`, `observedFFull`, `predictedFFull`, `unitsSincePrevEdge`.)

* **Strict mode** (the production behaviour: any invalidating event stays invalid for the rest of the battle; no ROM re-seed): only the **first** edge of each trace is known (the entry stream; exact, move 104 opponent), then **0 of the remaining 28/23/3/9/23 edges are known**. The model invalidates at frame **1963**, the first body, because `104:opponent` has no EXACT-PLAN (it is not in `sprite-order-body-plans.json`).
* **Resync mode** (same rules, but after each invalidating event the model is re-seeded from the ROM's observed F+occupancy, so later edges test the rule table in isolation): every edge that is not trivially seeded is **exact (F and occupancy)**: 91/91 move edges over the five traces, 0 mismatches, 0 occupancy mismatches, 0 consumer-slot (`spriteOrderForSlots`, lowest 8 free slots) mismatches. "trivial" = the edge's own pre-state seeded the model (excluded from `tested`; the anim column shows how many were excluded: 7 of 9 anim edges in turn17 follow an unplanned body directly).
* **Independence caveat (honest):** the five traces share the same button prefix, so they are one history family, not five. Distinct edges across all five (by frame): **39 move edges, 11 anim edges**; distinct unit checks: 54 rule (prompt/blip) and 25 table-body/anim, all exact (0 mismatches).
* **Scene caveat:** the ground-truth scripts were recorded against the Scene OFF oracle; here they run Scene ON (move bodies only exist there). Frame timing differs, hence RNG draws and the battle differ from the OFF ground truth; the histories are real ordinary battles but not asserted equal to the OFF traces' move sequence. Move lists observed: see §2.

### Rule coverage on real battle 1 (table of every unit kind that occurred)

| unit | rule | instances (turn17) | result |
|---|---|---|---|
| prompt (DoBounceEffect pair → EndBounceEffect) | `C[2 lowest free]; D[pair, FDERIVED pw 782]` | 17 | 17/17 exact (all traces: 54 rule checks incl. blips) |
| `DoHitAnimHealthboxEffect` marker | blip `C[f]; D[n0]` | 22 | 22/22 exact; every marker followed a damaging body; the "target sprite hidden → no blip" side was **not exercised** (no Fly/Dig/Dive target in these histories) |
| body 157 Rock Slide, player | table plan | 9 | exact (unit + edge) |
| body 332 opponent | table plan | 2 | exact |
| General stat anim PLUS1 stat7 (arg 21) / MINUS1 stat6 (27) | `C[f]; D[n0]` | 2 / 1 | exact |
| General stat anim MINUS2 stat1 (arg 46), ±2 | `C[f]` then carried `D[c1,0]` before the next unit | 3 | exact (first real-route confirmation of the ±2 carry) |
| General HELD_ITEM_EFFECT (7, arg 49154) | table plan | 1 | exact |
| bodies with no plan / NEEDS-KEYS (below) | invalidate | 18 + 2 BRN | model unknown (not mispredicted) |

Distinct (move, side) bodies in these histories (counts over the five traces): `157:player` EXACT-PLAN 32, `332:opponent` EXACT-PLAN 6, `28:opponent` **NEEDS-KEYS** 3, and **NOT-IN-TABLE** (never a corpus scenario): `104:opponent` 9, `283:opponent` 13, `297:opponent` 9, `225:player` 8 (only `225:opponent` is in the table), `98:opponent` 5, `185:opponent` 2, `19:opponent` 2, `7:player` 2; plus status animation `Status:B_ANIM_STATUS_BRN` (not in the mid-battle table: "BRN/FRZ not in corpus").

## 2. Mismatches and invalidation points

**Mismatches: none** (resync, 0 / 91 move edges; 0 / 54 rule checks; 0 / 25 table unit checks). Two harness artefacts were found and fixed while building the replay (not model errors, listed so nobody re-derives them): the `prompt` unit's pre-state is the `DoBounceEffect` frame (not `EndBounceEffect`); the ±2 stat unit's carried destroy must be applied before comparing the following state.

**Where the model invalidates (turn17, `replay-receipt.json` → `results[].invalidations`; strict mode stops at the first):**
| frame (turn17) | event | reason |
|---|---|---|
| 1963, 2992(283), 3167(225:player), 4969, 6006, 7395(297), 8429, 9475, 10921(98), 15468(28 NEEDS-KEYS), 15738, 17773 + 19035 (19 Fly), 20822 + 21850 (185), 21197 + 22218 (7:player) | body | no EXACT-PLAN for `(move, side)` |
| 21412, 21654 | status anim BRN | no EXACT-PLAN (not in corpus) |
| 6519, 15975, 22506 | faint of a battler (§3 U1) | uncovered unit |
| 6587, 6726, 16847, 16984, 20342, 20389 | trainer next-mon / send-out (§3 U2-U4) | uncovered |
| 19325 | `FreeMonSpriteAfterFaintAnim` | uncovered |
| 20033, 20268 | party menu open / battle reshow (all sprites freed) | ResetSpriteData-class → invalidate (table rule confirmed: ROM frees all 64 slots) |
| 23206 | `HandleEndTurn_FinishBattle` trainer slide | uncovered |
| trace end (switch/grovyle-faint/dragonbreath/victory-prefix) | prompt whose `EndBounceEffect` is past the trace end | `prompt-unterminated` (a prompt pair create with no destroy; observed `C[3,4]`) |

## 3. Uncovered unit classes and their observed transforms (`fixtures/sprite-order-real-route/uncovered-units.json`)

Classified from the allocator call streams (every CreateSprite*/DestroySprite entry outside a modelled window: prompt, body/anim up to controller-idle, blip). "created" = slots newly occupied, "destroyed (F order)" = destroyed slots in their order within F afterwards; occupancy before→after. "const" = identical across all instances (instances share one history family, so constancy is relative to the same pre-state).

| class | observed transform | instances | verdict for production |
|---|---|---|---|
| E1 `BeginBattleIntro` battlers/healthboxes/shadows/trainer pics | C[0,1,2,3,4,60..63]; occ 0→9 | 5 | in the known entry stream |
| E2 `BattleIntroPrintTrainerWantsToBattle` party summary balls | C[5,6,48..59]; 9→23 | 5 | known entry |
| E3 opponent send-out | C[8]; D[6,4,48..53]; 23→16 | 5 | known entry |
| E4 player send-out | C[4,6]; D[5,3,54..59]; 16→10 | 5 | known entry |
| E5 `Intro_TryShinyAnimShowHealthbox` | D[4]; 10→9 | 5 | known entry |
| **U1 faint** (`SpriteCB_AnimFaintOpponent`, `FreeMonSpriteAfterFaintAnim`) | **single destroy of the fainted battler's sprite slot** (opp mon 8 first, 5 for the second opp mon, player mon 0; `FreeMon…` D[6]); 9→8 | 6 + 3 | constant *shape* `D[battlerSpriteSlot]` (slot enters head of F); needs the battler sprite's slot, else invalidate |
| **U2 trainer's next mon: party summary** (`CreatePartyStatusSummarySprites`) | C[3,54..59]; 8→15 | 5 | const given same pre-state; invalidate (depends on party size) |
| **U3 next-mon send-out ball anim** | C[5]; D[3,54..59 in F order]; 15→9 | 5 | const; invalidate |
| **U4 player forced switch-in** (`StartSendOutAnim`) / ball particles | C[4,5,6]; 8→11 then D[6,4]; 11→9 | 2 | invalidate |
| **U5 party menu** (`CreateMonIcon…`, `WaitForMonSelection`) | all 64 slots freed first (ResetSpriteData-class), then C[0..12]; 0→13 | 3 | invalidate (as the table says) |
| **U6 battle reshow** (`CreateBattlerHealthboxSprites`…) | C[0,1,2,3,60..63]; 0→8; fresh stream from identity | 2 | invalidate (or a post-reshow entry plan, open) |
| **U7 end of battle** (`HandleEndTurn_FinishBattle`, `OpponentHandleTrainerSlide`) | C[0]; 8→9 | 1 | invalidate (post-win screens: not reached further than this in these traces) |
| prompt interrupted / at trace end (`HandleTurnActionSelectionState`) | C[3,4] (bounce pair create, no destroy yet) | 3 | = the prompt rule's create half |

Not occurring in these histories (so still "from the doc, unverified here"): Confusion/Hail/Sandstorm/trap end-turn animations, substitute, transform, switch-by-choice, recall, Dig/Dive/Fly *target* hidden, multi-hit, missed/no-effect attacks, Intimidate.

## 4. Recommended production rule changes

1. **Keep §2 as is for prompt, blip and stat units** — they are 54/54 and 25/25 exact on a real history (incl. ±2 stat + carry and HELD_ITEM_EFFECT); no rule needs to change.
2. **The binding constraint on real battle 1 is table coverage, not rule error:** under strict (production) semantics the order is known only at the first body, because the first real body `104:opponent` and 8 of the 11 bodies seen are not in `sprite-order-body-plans.json`. To get cross-body tracking on the real route add plans (scenario batch, then `spriteOrderBodyPlans.py`) for, in order of frequency: `283:opponent` (13), `297:opponent` (9; destroy order is F-derived, see 5), `104:opponent` (9), `225:player` (8), `98:opponent` (5), `185:opponent`, `19:opponent`, `7:player`, and the BRN status animation.
3. **Every move-animation event for a move without a plan must invalidate** — including moves that have no live adapter (the ROM still allocates in their body). The integration step must raise the invalidate on the move-animation *event*, not on the adapter being live.
4. **Invalidate triggers to add to the list** (all observed as non-constant pre-state dependent): faint of a battler (U1, unless the sprite slot is tracked: then `D[slot]`), trainer sends next mon (U2/U3), forced switch-in after a faint (U4), party menu and reshow (U5/U6, already in the table), end-of-battle trainer slide (U7), `Status:BRN`.
5. **Do not store net prefixes per move.** Exploratory `learned` mode (receipt `mode: "learned"`; absolute net transform learned from the first instance of an unplanned `(move, side)`): 5/10 (turn17), 6/13, 3/3, 6/6, 6/13 body checks exact; the failures are `297:opponent`, `98:opponent`, `19:opponent`, `7:player`, `28:opponent`, BRN — repeated instances of the same body end with a different destroy order because F-derived/y-keyed groups depend on the live F, so plans must stay windowed (`pw` ties), exactly as in the body-plan table.
6. **Blip condition:** only the "target visible" half is untested here; keep the §2 wording (visibility from the engine's sprite-visibility state) and keep `hit-animation` as the sole event (22/22 markers coincided with a hit-animation command; none without).

## 5. Evidence and regeneration

| claim | file |
|---|---|
| raw per-frame `sSpriteOrder`/mask/anim rows + allocator calls + markers | `tools/integration/fixtures/sprite-order-real-route/raw/<trace>-0.json` (2.6 MB total) |
| event lists (prompt, body, anim, blip, reset, uncovered) + observed F at every edge | `…/events/<trace>.json` |
| replay receipt (strict/resync/learned; per edge frame, move, attacker, observed F head ≥ 24, model known/exact) | `…/replay-receipt.json` |
| uncovered classes | `…/uncovered-units.json` |
| receipt test | `tests/spriteOrderRealRoute.test.ts` |

Raw sha1 (two identical fresh runs each): turn17 `37ae5144c0e46d16757f494d2a0018b3f48528c9`, switch `b9bf1ecf8efca56ac0289a6bca75d1527e415b6e`, turn2-dragonbreath `fc66a4e52bf63e9cbf0db675f28288fc7e3f0171`, grovyle-faint `22cf46c77540bb360c8550be1fb013be8110ece9`, victory `9e65d9ec61eef4a5f944ee9b58a9e398b1d114d9`.

```
V=../../vendor; export PYTHONPATH=$V/libmgba-py
for t in battle1-turn17-dense battle1-switch battle1-turn2-dragonbreath battle1-grovyle-faint battle1-victory; do
  python3 tools/compare/spriteOrderRealRouteProbe.py tools/compare/traces-groundtruth/$t.json tools/integration/fixtures/sprite-order-real-route/raw/$t-0.json   # ~80 s each, direct mGBA
done
python3 tools/integration/spriteOrderRealRouteReplay.py          # raw rows -> events/*.json, uncovered-units.json (pure python)
npx vite-node tools/integration/spriteOrderRealRouteReplay.ts    # TS applier replay -> replay-receipt.json
npx vitest run tests/spriteOrderRealRoute.test.ts --maxWorkers=4
```
`python3 tools/integration/spriteOrderEventModel.py` is unchanged (array 40185/0).
