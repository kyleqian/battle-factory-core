# S10A hist73 — the two largest HISTORY stops: allocator history (37 bodies) and the hidden battler's faint / reshow

Evidence only (main-lane worker, new files only). Master `a7904fcc0` (production src tree `5cd1b684`; plans69 + fold71 and dive70
merged). Every production change is a TEMPORARY patch (`tools/integration/fixtures/hist73/*.diff`) applied only to `git archive`
copies under the scratch dir; the checkout's tracked files never changed. Direct mGBA processes only (no shared HTTP oracle).
Censuses are seeds 0..999 run as 10 `--index-from` shards (battle i = global index, streak `(i * 11) % 49`: the shards concatenate
to exactly one `--seeds=0..999` run).

## 1. Results

| | live by count | live by frames | allocator-unknown | gain |
|---|---|---|---|---|
| master `a7904fcc0` | 25,680 / 27,518 = **93.32 %** | 3,848,230 / 3,952,274 = **97.37 %** | 180 cmds / 18,232 frames | |
| + PART A patch (37 bodies allocator net-zero) | 25,799 = **93.75 %** | 3,860,480 = **97.68 %** | 61 / 5,982 | **+119 / +12,250** |
| + PART B patch (hidden battler faint / reshow) | 25,713 = **93.44 %** | 3,853,084 = **97.49 %** | 177 / 18,004 | **+33 / +4,854** |
| + A + B (both diffs) | 25,834 = **93.88 %** | 3,865,486 = **97.80 %** | 56 / 5,602 | **+154 / +17,256** |

A + B gains 2 commands / 152 frames more than A and B measured separately (battle 713: the Part B reseed keeps the allocator known
into bodies the Part A ids no longer invalidate). All three deltas: command KEY sequence (battle, kind, moveId, side, attacker, target), presented frames per command, the 10 shard battle
digests (merged `11b30db7a344…`) and the KEY digest identical; **0 live → fallback regressions**
(`keycheck-partA.txt`, `keycheck-partB.txt`, `keycheck-partAB.txt`). **Chain predictor (Part A): 119 commands / 12,250 frames = measured exactly**
(`chains-predict.json`; 67.2 % of the bucket's frames, the brief's ~60 % bar). Treating Ice Ball 301 as cleared (ice72) adds
nothing to the Part A prediction: its 2 chains also hold an order-host reseed unit.

The supervisor's input report (master src `afcf8175`, before plans69 / fold71 / dive70) is committed as
`census-input-seeds0-999-afcf8175.json` + `.jsonl.gz`; on `a7904fcc0` the allocator bucket is 180 / 18,232 (was 183 / 18,554) and the
two hidden-battler order stops are unchanged (26 / 4,010 and 4 / 616).

### PART A per-unit table (allocator history)

Instrument: `hist73AllocatorCensus.ts` = prep52's allocator census + hide66's `hiddenSides` + aud56's general-animation shadow
(`liveSpriteAllocatorAnimationUnit`) + `--index-from` + the hidden-battler order stops. Chains (`chains-before-seeds0-999.json`):
180 declines, lengths 1:111, 2:41, 3:15, 4:11, 5:2. **Every greedy unit is a LIVE-ADAPTER move body that no allocator audit ever
covered** (they became live after prep52); no status / general animation remains in any chain (aud56 / prep50 / prep52 hold).

Verdicts: `net-zero-audit.json` (`hist73Probe.py` → prep52's `prep52NetZeroProbe.py`, prep52's verdict rule via
`hist73Extract.py`): baseline == end, created == destroyed per complete body, every late change owned by the next action, ≥ 1 complete
body per side from the known entry `[0,1,2,6,8,60,61,62,63]`. 154 scenario rows (both orientations of the accepted Scene ON
mechanic pair + the same two with the DEFENDER replaced by Snorlax — Golbat for Curse-stat's Snorlax user and for Astonish (Ghost
move, no body vs Normal) — or, for moves with no Scene ON scenario, four copies of the move on Murkrow / Eevee vs Onix, both
sides), each run twice in fresh processes: **all 154 pairs byte-identical, every row has ≥ 1 complete body, all 37 units NET-ZERO.**

| step | unit (move id) | cum. cmds / frames | involved / solo frames | complete bodies (known entry ply / opp) | created / body | late changes | attacker species |
|---:|---|---|---|---|---|---|---|
| 1 | FURY CUTTER (210; counters 1..4: +3 turns) | 21 / 2,268 | 2,584 / 2,268 | 23 (11 / 11) | 3, 5 | healthbox hit effect | Grovyle |
| 2 | PSYWAVE (149) | 36 / 3,502 | 1,942 / 1,234 | 4 (2 / 2) | 12 | healthbox hit effect | Spoink, Chimecho |
| 3 | CURSE (174; stat + Ghost branches) | 45 / 4,609 | 1,699 / 1,107 | 8 (4 / 4) | 1, 7 | none | Snorlax, Haunter |
| 4 | FEATHERDANCE (297) | 54 / 5,716 | 1,230 / 1,107 | 4 (2 / 2) | 16 | next animation script | Murkrow, Eevee |
| 5 | SILVER WIND (318) | 62 / 6,700 | 1,060 / 984 | 4 (2 / 2) | 18 | healthbox hit effect | Butterfree |
| 6 | HEAL BELL (215) | 69 / 7,303 | 603 / 427 | 4 (2 / 2) | 33 | none | Chimecho |
| 7 | SWEET SCENT (230) | 76 / 7,865 | 887 / 474 | 4 (2 / 2) | 24 | next animation script | Weepinbell |
| 8 | MAGNITUDE (222; regular + intense) | 80 / 8,310 | 691 / 445 | 6 (3 / 3) | 0, 4 | healthbox hit effect | Graveler, Camerupt |
| 9 | METEOR MASH (309) | 83 / 8,644 | 334 / 334 | 7 (4 / 3) | 70 | healthbox hit effect | Metang |
| 10 | (forced switch-in reseed: order host, not audited) | 87 / 8,948 | 380 / 0 | | | | |
| 11 | TRI ATTACK (161) | 90 / 9,223 | 275 / 275 | 4 (2 / 2) | 31 | healthbox hit effect | Porygon |
| 12 | SOFTBOILED (135) | 93 / 9,487 | 264 / 264 | 7 (4 / 3) | 19 | none | Murkrow, Eevee |
| 13 | TRICK (271) | 95 / 9,733 | 246 / 246 | 4 (2 / 2) | 6 | none | Murkrow, Eevee |
| 14 | SUBSTITUTE (164) | 97 / 9,979 | 246 / 246 | 4 (2 / 2) | 0 | none | Golem |
| 15 | GRUDGE (288) | 99 / 10,225 | 246 / 246 | 8 (4 / 4) | 6 | none | Haunter |
| 16 | THRASH (37; +2 turns) | 102 / 10,453 | 228 / 228 | 13 (7 / 6) | 6 | healthbox hit effect | Tauros |
| 17 | EXTRASENSORY (326) | 104 / 10,629 | 633 / 176 | 4 (2 / 2) | 1 | healthbox hit effect | Nuzleaf |
| 18 | SLEEP TALK (214) | 106 / 10,805 | 176 / 176 | 4 (2 / 2) | 9 | none | Seaking |
| 19 | DESTINY BOND (194) | 108 / 10,977 | 172 / 172 | 4 (2 / 2) | 1 | none | Wobbuffet |
| 20 | MUDDY WATER (330) | 109 / 11,100 | 246 / 123 | 4 (2 / 2) | 0 | healthbox hit effect | Marshtomp |
| 21 | CRABHAMMER (152) | 110 / 11,223 | 246 / 0 | 4 (2 / 2) | 15 | healthbox hit effect | Krabby |
| 22 | ASTONISH (310) | 112 / 11,434 | 422 / 88 | 4 (2 / 2) | 6 | healthbox hit effect | Loudred |
| 23 | WATER SPOUT (323) | 113 / 11,557 | 123 / 123 | 4 (2 / 2) | 49, 55 | healthbox hit effect | Wailmer |
| 24 | OCTAZOOKA (190) | 114 / 11,680 | 123 / 123 | 4 (2 / 2) | 6 | healthbox hit effect | Octillery |
| 25 | GLARE (137) | 115 / 11,803 | 123 / 123 | 4 (2 / 2) | 28 | next animation script | Dunsparce |
| 26 | BULK UP (339) | 116 / 11,926 | 123 / 0 | 4 (2 / 2) | 2 | next animation script | Primeape |
| 27 | FLATTER (260) | 117 / 12,014 | 316 / 88 | 4 (2 / 2) | 47, 48 | none | Nidorina |
| 28 | ROCK BLAST (350; +1 turn) | 118 / 12,102 | 88 / 88 | 10 (6 / 4) | 16 | healthbox hit effect | Rhyhorn |
| 29 | ENDEAVOR (283; +4 turns) | 119 / 12,188 | 86 / 86 | 9 (5 / 4) | 20 | healthbox hit effect | Murkrow, Eevee |
| 31 | SKILL SWAP (285) | 121 / 12,346 | 79 / 79 | 4 (2 / 2) | 17 | none | Girafarig |
| 32 | SKY UPPERCUT (327) | 122 / 12,422 | 568 / 76 | 4 (2 / 2) | 16 | healthbox hit effect | Hitmonchan |
| 35-37 | DRAGON DANCE (349), SIGNAL BEAM (324), RETURN (216) | (tail: chains also hold order-host units) | 334 / 123 / 88, solo 0 | 4 (2 / 2) each | 6-7 / 48 / 71 | | Dragonair / Ariados / Dragonair |
| - | DIZZY PUNCH (146), TEETER DANCE (298), REVENGE (279), FOCUS ENERGY (116) | (tail) | 123 / 123 / 88 / 88, solo 0 | 4 (2 / 2) each | 28 / 5 / 12 / 15 | | Spinda / Murkrow, Eevee / Machamp, Qwilfish / Taillow |

Steps 1-29 without step 10 are the 37 audited ids' unlock order; the cumulative column includes step 10 from there on (greedy
over all units). The census gain per unit is its solo frames plus its share of multi-unit chains; the exact union is the measured
+119 / +12,250.

**Residual after the patch** (`chains-after-seeds0-999.json`, `reseed-blockers-after.json`): 61 / 5,982.
- **55 / 5,523: post-KO send-out reseeds blocked by the ORDER host** (chain `command party-summary + command switch-in`): the order
  host had no EXACT plan at the switch-in — Sand-Attack 28 (19 / 1,928), Mud-Slap 189 (11 / 1,165), Rain Dance 240 (13 / 1,118),
  RAIN_CONTINUES (8 / 855), Ice Ball 301 (2 / 246: cleared by ice72 once landed, if the rest of its chain clears), Astonish 310's
  order plan (2 / 211). These are the Random2 words / order-plan units: order-host scope, not allocator.
- 5 / 380: reseeds whose order host is "reshow with a hidden battler" (4 forced switch-ins + 1 switch-in command, battle 713) —
  PART B clears it (measured: 3 / 228 of them go live with the Part B patch alone).
- 1 / 79: Struggle 165 (not a live adapter, out of scope). Gust 16 / Transform 144 (prep52 NET-ZERO, excluded from production by
  the ⊆-live-adapters policy) appear only in chains that also hold order-host units.

### PART B per-case table (hidden battler faint / reshow)

The census on master has exactly **two** hidden-battler order stops (`chains-census-before-seeds0-999.json` `hiddenBattlerOrderStops`,
with each resolution's event list):

| census case | path (kernel events) | stop | declined bodies after it |
|---|---|---|---|
| battle 533 (seed 533, streak 32), turn 19 | opponent Fly 19 charge (`BattleScriptFirstChargingTurn`), player Bulk Up, end of turn: item heal, `BattleScript_PoisonTurnDmg` (Toxic) → `BattleScript_FaintAttacker` `faint-animation b1` while ON_AIR → next-mon summary → send-out | `faint-animation of a hidden battler` (liveSpriteOrderHost.ts:348-350) | 26 / 4,010: the next opponent's Dig ×20, Double Team ×6 (the host stays invalid for the rest of the battle) |
| battle 713 (seed 713, streak 3), turn 5 | player Dive 291 charge; opponent Bounce 340 charge; the player's Dive strike misses; end of turn: Toxic KOs the player → forced party menu → reshow while the opponent is ON_AIR | `reshow with a hidden battler` (:228) | 4 / 616: Psywave ×2, Pursuit ×2; plus 5 / 380 allocator declines (the forced switch-in cannot reseed) |

Other paths (a move hitting the semi-invulnerable battler, Perish Song, weather, Leech Seed) do not occur in seeds 0..999.
`partB-cases.json` (`hist73PartBCases.py`) lists both stops' kernel event paths from the charge body on and the 30 declined bodies
with their status after the Part B patch (all 30 live).

Predictions were committed BEFORE any Part B probe (`partB-predictions.md`, commit `bae48a32c`). ROM probes
(`hist73HiddenProbe.py` → `hist73EventProbe.py`, every frame's 64-byte `sSpriteOrder`, inUse mask, per-slot keys, battler-sprite
invisible bits, STATUS3_SEMI_INVULNERABLE bits; 10 scenarios × 2 fresh runs, **all A == B**) staged with real moves only
(lab seed pinned):

| pair (hidden vs control) | staging | window | verdict |
|---|---|---|---|
| hf-opp-swellow vs vf-opp-swellow | opponent L6 / L5 Swellow Fly ×4 badly poisoned by a faster L50 Onix's Toxic; the 7th tick (HP 23) KOs it on a CHARGE turn (invisible bit + ON_AIR set the frame before) vs the 6th tick (HP 21) on a strike turn | faint (slot 8 freed) → summary → send-out → next script | **SAME** (39 events) |
| hf-opp-pidgeot vs vf-opp-pidgeot | the same with L5 / L4 Pidgeot (HP 23 / 20) | same | **SAME** (39) |
| hf-ply-swellow vs vf-ply-swellow | the player side (Onix's Toxic AI-forced), forced party menu (DOWN, A, A) | faint (slot 6) → party menu → reshow → send-out | **SAME** (46) |
| hf-ply-pidgeot vs vf-ply-pidgeot | the player side, Pidgeot | same | **SAME** (46) |
| rs-opp-swellow vs vf-ply-swellow | a slower L50 Golem's Explosion into the charging L50 Swellow (misses ON_AIR; Golem faints) → forced party menu → reshow with the opponent hidden | menu reset → reshow → send-out → next script | **SAME** (45) |
| rs-opp-pidgeot vs vf-ply-swellow | the same vs Pidgeot | same | **SAME** (45) |

"SAME" = identical lists of mask-change events (added slots, removed slots, full `sSpriteOrder`), frame numbers dropped (the
message timing differs). Verdicts vs predictions:
- **P1 / P3 confirmed:** a hidden battler's faint (either side, two species) frees its battler slot and orders every later sprite
  exactly as a shown battler's faint. The new mon is shown.
- **P2 half wrong:** the reshow allocates exactly as the normal reshow, but the hidden opponent's sprite is re-created **INVISIBLE**
  (`gSprites[gBattlerSpriteIds[1]].invisible` = 1 from the reshow, frames 3038-3382, until its strike body) — so `battlerData.invisible`
  IS set for a semi-invulnerable battler in Scene ON, and production's render hide (kept until the strike by
  `applyLiveSemiInvulnerableCommand`) matches the ROM. No render change is needed. Source: every move-animation controller command
  ends with `CopyAllBattleSpritesInvisibilities()` (`battle_controller_opponent.c:1513`, `battle_controller_player.c:2534`, the
  `DoMoveAnimation` state 3), which copies the charge animation's `gSprites[].invisible = TRUE` into `battlerData[].invisible`;
  `reshow_battle_screen.c:272` then re-creates the sprite with it. (hide66 §1's "battlerData[b].invisible is never set" in Scene ON
  is therefore wrong; the reshow evidence is `hidden-battler-audit.json` `flagsAfterReshow`.)
- A hidden PLAYER at a reshow cannot happen in singles (the player's party menu opens only after its own KO or at the action
  prompt, where it cannot be charging); it stays invalid. A hidden battler's switch-in stays invalid (unprobed, not in the census).

**Part B patch** (`hist73-partB-temp-src.diff`, `src/engine/liveSpriteOrderHost.ts` only):
- `orderEventOf` (:347-350): `faint-animation` of a hidden battler → `{ kind: "faint", side }` (the shown plan) plus
  `hidden[battler] = false`; `switch-in-animation` of a hidden battler still invalidates.
- `returnLiveSpriteOrderHostFromPartyMenu` (:226-228): only `host.hidden[0]` invalidates ("reshow with a hidden battler"); a hidden
  opponent takes the normal `battle-reshow`, `hidden` kept.

Census delta (`censusB-delta-seeds0-999.json`): **+33 / +4,854**: all 26 / 4,010 faint-of-hidden bodies and all 4 / 616
reshow-with-hidden bodies go live, plus 3 / 228 allocator declines in battle 713 (the forced switch-in now reseeds the allocator:
the reshow's allocation is the probed normal one). 0 regressions.

## 2. Fold instructions (tests a fold must move — measured by running the related tests on the patched copies)

**PART A** (`hist73-partA-temp-src.diff`: append the 37 ids to `LIVE_SPRITE_ALLOCATOR_NET_ZERO_MOVE_IDS`,
`src/engine/liveMoveSpriteAllocator.ts:77`, with a comment citing `tools/integration/fixtures/hist73/net-zero-audit.json`). 35 related
files (every test naming the allocator constant / history / input, plus wall / Light Screen / Protect / census / real-route files):
**5 failures in 3 files, all expected pin moves** (480 passed; `related-tests-partA.txt`):
1. `tests/liveSpriteAllocator.test.ts:154-224` "pins the constant exactly to the union of the net-zero receipts" (fails at :191):
   add the hist73 receipt (schema `hist73-net-zero-audit/v1`, numeric keys, every unit NET-ZERO, `bodiesFromKnownEntry` ≥ 1 per side,
   every row `identicalAB`) to the expected union; the stay-out loop at :221-223 `[116, 339, 16, 144]` must drop **116 (Focus
   Energy) and 339 (Bulk Up)** — both are now live adapters and audited here.
2. `tests/liveSpriteAllocator.test.ts:232-234` "invalidates for non-audited moves": its example id 116 is now audited — use an
   unaudited id (e.g. 165 Struggle, or 999 alone).
3. `tests/voluntaryLend.test.ts:180`: `"light-screen-player.json@3153": false` → **true** (the bodies before that Light Screen are now
   audited; update the :178 comment).
4. `tests/animation/liveWallMoveAdapters.test.ts:33-35` routes `[10, 0, 0, 112, false]` and `[260, 0, 0, 277, false]` → **true**
   (Barrier / Magic Coat after newly audited bodies); add 10 and 260 to the `firstIndex` exception list at :69-70 and a comment
   (as alloc50 / alloc52 did). A fold should dense-check those two routes against the ROM (the adapter turns exact there).

**PART B** (`hist73-partB-temp-src.diff`). 63 related files (the Part A set plus every sprite-order / forced / post-KO /
player-faint / Fly / Bounce / Dive / hidden test): **2 failures in 2 files, both the predicted pins** (693 passed;
`related-tests-partB.txt`):
1. `tests/spriteOrderFly63.test.ts:135-148` (fails at :139, `faint-animation/0`): a hidden battler's faint no longer invalidates —
   assert the order equals the shown faint's (`applySpriteOrderPresentationEvent(window.tracker, { kind: "faint", side })`) and
   `hidden[b] === false`; the `switch-in-animation` half stays as is.
2. `tests/liveSpriteOrderHost.test.ts:215-218` (fails at :218): `hidden: [false, true]` at the reshow is now the normal reshow (assert
   it equals the unhidden reshow's order with `hidden` kept); add `hidden: [true, false]` still invalidating.
New pins: `hidden-battler-audit.json` `allSame` and `allIdenticalAB` true, and the two census battles (533, 713) as route pins.

Production gates for a fold: the affected tests above, smoke, full `npm test`, `npm run build`, and the census (+119 / +12,250,
+33 / +4,854, together +154 / +17,256 on seeds 0..999 with this driver). This worker did NOT run the full suite on the patched copies
(evidence-only step; the related sets above are the measured pin list).

## 3. Reproduction (from workspace/)

```
sh tools/integration/hist73Run.sh <fresh-out-dir>       # probes (A 154 + B 10 scenarios x 2) + 6 seeds-0..999 censuses; ~20 min
SKIP_PROBES=1 sh tools/integration/hist73Run.sh <dir>   # censuses only;   SKIP_CENSUS=1 ...  probes + extraction only
```
The runner refuses a non-empty out dir, never removes anything outside it, checks `git status --short src` is empty before and
after, applies the two `.diff`s only to `git archive` copies inside the out dir, and prints `same` / `DIFF` for every receipt vs
`tools/integration/fixtures/hist73/`.

Verified in this session: a full `hist73Run.sh` pass (fresh dir, ~17 min) reproduced every census / chain / key-check / probe
receipt byte-for-byte except `hidden-battler-audit.json`, whose raw-run hashes then still embedded the out-dir path (fixed in
`3d0d963ce`; the fixed extractor on that pass's raw runs gives the committed file); a second fresh `SKIP_CENSUS=1` pass on the final
code reproduced `net-zero-audit.json` and `hidden-battler-audit.json` byte-for-byte. The checkout's `src/` stayed unchanged
throughout.

Individual steps: `hist73AllocatorCensus.ts` / `hist73LiveShareCensus.ts --seeds=A..B --index-from=A` (10 shards) → `hist73Merge.py`
→ `hist73Chains.py [--cleared ids]` / `hist73ReseedBlockers.py` / `hist73KeyCheck.py` / `prep43CensusDelta.py`;
`hist73Probe.py` → `hist73Extract.py`; `hist73HiddenProbe.py` → `hist73HiddenExtract.py` (mGBA venv python, `PYTHONPATH` =
libmgba-py).
