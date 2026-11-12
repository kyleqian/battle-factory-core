# Order-consumer prep (S10A, side lane): measured inputs for the sSpriteOrder consumer adapters

Evidence/design only; **new files only** (no tracked file edited, no production code). Method copied from `docs/next-adapters-prep5.md` / `docs/h-buffer-s1-prep.md`
(production-helper pins vs accepted fixture values, fresh direct-mGBA activation probes, generated-rental routes, drafted fixtures) and extended with a replay of the
free-slot provider model (`src/engine/spriteOrderProvider.ts` + `docs/sprite-order-body-plans.md` plans) against every accepted fixture's order literal and against
the **observed** per-frame `sSpriteOrder` of direct-mGBA runs. Not run: `npm test`/build (no production file changed), any shared oracle or HTTP service (all runs are
independent direct mGBA through `tools/compare/spriteOrderEventProbe.py` / `tools/integration/issue142ActivationProbe.py`, Scene ON, one fresh run per scenario; the
two-fresh-run byte-identity of the underlying probe was established earlier, `docs/sprite-order-provider-design.md` §2). Drafted fixtures are unverified (no harness run).

## 0. Verdict table (14 target moves)

Provider terms: `F` = the provider's free-slot order (`SpriteOrderState.free`), "known entry" = `knownEntrySpriteOrderState`, "plan replay" = known entry + the body/gap plans of
every preceding unit (`sprite-order-body-plans.json`; the replay used here is `spriteOrderBodyPlans.Sim`, 659/659 edges exact). **A correction first (all rows below depend on it):**
the design doc's `spriteOrderForFirstAllocation(state, n)` (= `F.slice(0, n)`) is **not** what any consumer needs. A consumer takes the move's *lowest-free allocation slots*
(3,4,5,7,9,10,… — the slots, not the first `n` entries of `F`, which at the first action are `4,3,21,20,5,…`) and wants their **relative order in F**: i.e.
`F.filter(slot => allocationSlots.includes(slot))`, evaluated at the right frame (below), and for 64-entry consumers prefixed by the occupied-slot order.

| Move | Verdict | Order input (config field, consumer file:line) | Exact provider call (measured) | Seed validation | Pixel/draw-order sensitivity (accepted reducer re-rendered) | act / window / #142 row / duration / tail | Measurement files |
|---|---|---|---|---|---|---|---|
| EMBER 52 | **READY** (provider-independent) | none; `ember.ts:174-199` sorts equal-Y by `creationOrder` | none: every tie pair is created in a different sort window (1 sprite per window, 6 frames apart), so a later sprite always sorts behind an equal-key earlier one whatever F is | n/a (no literal); provider replay edge == observed 2/2 | reducer order == observed order 45/45 compared ages, both orientations | 384/438; win 388..450 / 442..504; row **-4** (no map row); 63; script end 453/507 (win ends 3 early) | `order-consumer-truth.json`, `-seeds.json`, `-summary.json` |
| FLAMETHROWER 53 | **READY-WITH-PROVIDER** | `animationProfile.spriteOrderSeed` for `flameSpriteSlots` (`flamethrower.ts:22-34`, `:99-101`) | `F` at the frame before the first flame create (player: 2411→create 2412 after body 259; opp: 2465→2466 after body 185), filtered to `flameSpriteSlots` [3,4,5,7,9,10,11,12] | provider == literal == observed **2/2** (`3,10,9,7,5,4,12,11` / `3,4,5,12,11,10,9,7`) | 5 alternative seeds change **0/130** ages (flames are 1 per window) → seed is exact but pixel-neutral | 391/445; win 395..520 / 449..574, ageOffset -11; row **-15**; 115 rows after trimming; **script runs 80 frames past the window** (600/654) | seeds, seed-sensitivity, summary |
| ROCK_THROW 88 | **READY-WITH-PROVIDER** | `animationProfile.spriteOrderSeed` (64) + `occupiedSpriteSlots` (`rockThrow.ts:73-80`, `:238`) | `[...occupiedPrefix, ...F]`, F at frame 2305 (create window of 2 slots [3,4], after Tackle body 33); occupiedPrefix `[62,60,0,63,1,61,6,8,2]` | free tail == literal == observed **2/2**; occupied prefix == observed 2/2 | 5 permutations of the free tail: **0/90** ages differ | 296/296; win 296..382; row **0** (add 88); 87; tail 0 | seeds, seed-sensitivity |
| DRAGON_RAGE 82 | **READY** (provider-independent) | none; `dragonRage.ts:387-390` `orderFirePlumesForDraw` | none: 8 plumes created 3 frames apart (one per window) | n/a; replay edge == observed 2/2 | reducer paint order == observed **41/41** ages at the plume age lag (shift -1), both orientations (5/41 at shift 0 = alignment only); 20 ages have an equal-y same-subpriority pair, all resolved correctly | 82/86; win 89..238 / 93..242; row **-7** (no map row); 150; **21-frame tail uncovered** (259/263) | truth, seeds |
| HEAL_BELL 215 | **READY-WITH-PROVIDER** | initial order inside `healBellNotesInPainterOrder` (`healBell.ts:371` `[4,5,7,9,10,11]`, `:379-407`) — needs a new `initialOrder` parameter | `F` at the activation edge (frame 2214/2215, after Tackle body 33) filtered to `[4,5,7,9,10,11]` = `[4,5,11,10,9,7]` | assumed `[4,5,7,9,10,11]` ≡ provider ≡ observed-at-age-0: **0 differing ages vs observed** (98 compared), both orientations | `descending`/`rotated` inits differ on **5 ages, all with overlapping notes**; assumed/provider/observed/interleaved differ 0 → the hard-coded init happens to be equivalent for this history; other histories can flip it | 209/210; win 209..469 / 210..470; row **0** (add 215); 261; tail 0; **ad-hoc opponent shadow at `battleScene.ts:34439-34452` to retire** | truth, seeds |
| PERISH_SONG 195 | **READY** (provider optional; 3/3 literals) | none in config: `oamSlot` tie `perishSong.ts:12-13`, `battleScene.ts:34629-34632`; profile turns must be literal 3 (`:34551-34556`) | optional rank = (create window, F index before the 14-slot create at 2085/2081): fixes the one flagged age | `NOTE_SLOTS` == the real creation slots (3,4,5,7,9..20) both orientations | 675 equal-centerY pairs/orientation checked; reducer `oamSlot` rule: **1** age (age 4, all notes at (8,8)) with a flipped overlapping pair of differing tile/matrix; provider creation rank: **0** | 71/75; win 71..329 / 75..333; row **0** (add 195); 259; tail 0 | truth (`PERISH_SONG-pairs`), seeds |
| LEAF_BLADE 348 | **READY-WITH-PROVIDER** | initial order inside `leafBladeDisplayedOamOrderAtAge` (`leafBlade.ts:246` `[3, ...TRAIL_OAM_SLOTS]`, `:240-275`) — needs an `initialOrder` parameter | `F` at the activation edge filtered to `[3,4,5,7,9,10,11,12,13,14,15,16]` = `[4,3,5,16,15,14,13,12,11,10,9,7]` (first action) | the reducer's `[3,4,5,7,9,…]` differs from provider/observed (`4,3,5,16,…`) | provider-init vs assumed-init: 1 visible-pair age flipped, **0** with a differing tile cell; both inits within 2-4/134 ages of observed at shift -1 → pixel-insensitive for the measured histories | 76/80; win 76..299 / 80..303; row **0** (add 348); 224; tail 0 | truth, seeds |
| BLAZE_KICK 299 | **READY-WITH-PROVIDER** | `animationProfile.spriteOrderSeed` for `spriteSlots` (`blazeKick.ts:37`, `:226`) | `F` before the first create (2407/2461, creates [3]) filtered to `spriteSlots` [3,4,5,7,9..14] | provider == literal == observed **2/2** | reversed/ascending seeds change **8** ages, swap(3,4) 0, rotated 0-3 (no overlap flips measured) | 389/443; win 399..476 / 453..530; row **-10** (no map row); 78; script end 485/539 (win ends 9 early). Own body **NEEDS-KEYS** (cannot precede another order consumer) | seeds, seed-sensitivity |
| MUD_SLAP 189 | **READY-WITH-PROVIDER** (+ in-body plan step) | `animationProfile.spriteOrderSeed` (64) (`mudSlap.ts:16`, `:89`) | `[...occupiedPrefix, ...F]` with F **after the body-plan prefix `[C n0 slot3 @act+4, D n0 @act+8]`**, i.e. at frame 2095/2091 = the frame before the 6-slot mud window (head `3,4,21,20,5,…`). F at the first create (2091/2087) has head `4,3,…` and does **not** match | literal == provider == observed at exactly that frame, **2/2**; occupied prefix 2/2 | reversed/ascending/rotated free tails change **21-41** ages (all with overlapping flips); the 3/4 swap changes 0 | 77/81; win 80..130 / 84..134, ageOffset 41/45; row **38 / 42** (side-dependent, outside the constant-0 map); 92/96; tail +2 | seeds, seed-sensitivity |
| SAND_ATTACK 28 | **READY-WITH-PROVIDER** (same call as Mud Slap) | `animationProfile.spriteOrderSeed` (64) (`sandAttack.ts:13`, `:89`) | as Mud Slap (F after the transient slot-3 pair, before the 6-slot dirt window, head `3,4,…`). **The accepted literal (`4,3,…`) equals F before the transient create, not F at the 6-slot allocation** | literal == provider == observed at first create only; ✗ at the 6-slot window (both orientations) | swapping 3/4 changes **0/150** ages (so the accepted fixture is pixel-correct either way); other permutations 10-41 ages | 78/82; win **46..314**, ageOffset 7; row **39 / 43**; 276 rows; **window ends 178/174 frames after the script** (accuracy-banner/tail frames) | seeds, seed-sensitivity |
| GRUDGE 288 | **READY-WITH-PROVIDER** (first body); later body **NEEDS-KEYS** | `animationProfile.spriteOrderSeed` for the six `flameSlots` (`grudge.ts:20`, `:180`; accepted from dense row 45, `grudgeFramebuffer.ts:62-63`) | `F` at frame 2121/2117 (just before the 6-slot flame window, row 46) filtered to `[3,4,5,7,9,10]` = `[4,3,5,10,9,7]` (first action) | provider == literal == observed **2/2**; literal also equals F for the whole span edge→create | not rendered (6 flames in one window, F-dependent by construction) | 66/70; win 66..274 / 70..278; row **0** (add 288); 209; tail 0; **ad-hoc opponent shadow `battleScene.ts:16129-16135` to retire**; second body (act 800/804) is preceded by Grudge's own NEEDS-KEYS body → provider invalid | seeds, summary |
| ROCK_SLIDE 157 | **READY-WITH-PROVIDER** (first action; static check only) | `GROVYLE_TO_ONIX_ROCK_SLIDE_PROFILE.spriteOrderSeed` (64) (`sceneOnPresentation.ts:13461-13480`) | known-entry `F` constant `4,3,21,20,5,…` + occupied prefix `[62,60,0,63,1,61,6,8,2]` | literal free tail == `KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER` ✓; the older `battleMenu.ts:1942` literal (`3,4,21,…`) is **not** the first-action F | not measured | no BattleLab scenario for Rock Slide (accepted via a menu probe, window 1967..2141, age 0 = frame 1967): activation not re-probed. Appears later in the Sand Attack scenario (body 157 @2356) after a NEEDS-KEYS body → provider invalid there | seeds (`rockSlideStatic`) |
| MAGNITUDE 222 | **BLOCKED** (not an accepted adapter) | `animationInputs.spriteOrder` (64) (`magnitude.ts:20`, `:159-160`; `magnitudeFramebuffer.ts:82`) | the order itself would be `[...occupiedPrefix, ...F at activation]` | provider == literal == observed **4/4** (regular after Tackle, intense first action), occupied prefix 4/4 | not rendered | 191/195 (intense), 411 (regular); window 411..585 (regular); not drafted. Blocker: `magnitude-dense-evidence.json` `status: "unsupported-evidence"`, `coverageCredit: false`, `reducerAdded: false`, `compositorAdded: false`; magnitude level (`movePower`) is Random-derived and only two branches (regular/intense) have evidence | seeds, pins |
| DIVE 291 | **NEEDS-KEYS** (setup body READY-WITH-PROVIDER) | `animationProfile.spriteOrderSeed` for the body slots (`dive.ts:40`, `:307`; accepted from dense rows setup[9] / attack[15], `diveFramebuffer.ts:82-88`) | setup body: `F`/full-64 at row 9 (frame 2211/2214): provider == literal == observed 2/2 (+ occupied prefix). Attack body: **provider invalid** (preceded by the setup body, NEEDS-KEYS) | setup 2/2 ✓; attack refused | not rendered | setup 199/196 win 199..316 / 196..310 row 0 (map has 196 already; 291 must be added), 118/115, tail 0; attack act 629/764; two-turn flow also open | seeds, summary |

**Ready/blocked totals:** READY without provider input: 2 (Ember, Dragon Rage). READY-WITH-PROVIDER: 9 (Flamethrower, Rock Throw, Heal Bell, Leaf Blade, Blaze Kick, Mud Slap, Sand Attack, Grudge first body, Rock Slide first action) + Perish Song (provider optional). NEEDS-KEYS: Dive (attack body), later bodies of Grudge/Dive. BLOCKED: Magnitude.

## 1. Seed-validation table (fixture → provider → accepted literal)

`tools/integration/orderConsumerSeeds.py --write` → `fixtures/order-consumer-seeds.json`. For every body of the 14 moves in every committed/probed scenario: provider output = known-entry
constant + plan replay of all preceding units (`spriteOrderBodyPlans.Sim`, own body replayed from its observed windows), queried as F after all sort windows with frame ≤ n; observed =
free-slot order of the raw per-frame `sSpriteOrder` at n (`sprite-order-event-raw/` + new `order-consumer-raw/`); literal = accepted fixture / dense-row seed (frame n = trace frame + 2006,
verified: offsets 2006 for all first bodies). "create window (slots)" = provider output before each of the first create windows; ✓/✗ = provider == literal there.

| move | scenario (attacker side) | preceding bodies | provider F == observed at activation | create windows queried (frame (slots): ✓/✗ vs literal) | accepted literal | provider / observed vs literal at the literal's frame | occupied prefix == observed |
|---|---|---|---|---|---|---|---|
| EMBER | ember-opponent-onix-player-murkrow | 185 | ✓ | first create 2448 (1) | none (reducer rule) | - | - |
| EMBER | ember-player-onix-opponent-murkrow | 259 | ✓ | first create 2394 (1) | none | - | - |
| FLAMETHROWER | flamethrower-opponent-onix-player-murkrow | 185 | ✓ | 2466(1):✓ 2470(1):✗ | `3,4,5,12,11,10,9,7` | ✓ / ✓ @2465 | - |
| FLAMETHROWER | flamethrower-player-onix-opponent-murkrow | 259 | ✓ | 2412(1):✓ 2416(1):✗ | `3,10,9,7,5,4,12,11` | ✓ / ✓ @2411 | - |
| ROCK_THROW | rock-throw-opponent-graveler-player-onix | 33 | ✓ | 2306(2):✓ 2314(1):✗ | 64: free tail head `3,4,21,20,5,19,…` | ✓ / ✓ @2305 | ✓ |
| ROCK_THROW | rock-throw-player-graveler-opponent-onix | 33 | ✓ | 2306(2):✓ 2314(1):✗ | same | ✓ / ✓ @2305 | ✓ |
| DRAGON_RAGE | dragon-rage-charmeleon-onix | none | ✓ | first create 2174 (1) | none (spawnIndex rule) | - | - |
| DRAGON_RAGE | dragon-rage-onix-charmeleon | none | ✓ | first create 2178 (1) | none | - | - |
| HEAL_BELL | heal-bell-opponent-chimecho-player-onix | 33 | ✓ | first create 2236 (1) | reducer-assumed `[4,5,7,9,10,11]` (compared at the reducer level, §2) | see §2 | - |
| HEAL_BELL | heal-bell-player-chimecho-opponent-onix | 33 | ✓ | first create 2235 (1) | same | see §2 | - |
| PERISH_SONG | perish-song-opponent-murkrow-player-onix | none | ✓ | first create 2085 (14) | reducer `oamSlot` rule | see §2 | - |
| PERISH_SONG | perish-song-player-murkrow-opponent-onix | none | ✓ | first create 2081 (14) | same | see §2 | - |
| LEAF_BLADE | leaf-blade-opponent-sceptile-player-onix | none | ✓ | first create 2093 (2) | reducer-assumed `[3,4,5,7,9..16]` | see §2 | - |
| LEAF_BLADE | leaf-blade-player-sceptile-opponent-onix | none | ✓ | first create 2089 (2) | same | see §2 | - |
| BLAZE_KICK | blaze-kick-opponent-onix-player-murkrow | 185 | ✓ | 2462(1):✓ 2494(9):✗ | `3,4,5,14,13,12,11,10,9,7` | ✓ / ✓ @2461 | - |
| BLAZE_KICK | blaze-kick-player-onix-opponent-murkrow | 259 | ✓ | 2408(1):✓ 2440(9):✗ | `3,10,9,7,5,4,14,13,12,11` | ✓ / ✓ @2407 | - |
| MUD_SLAP | mud-slap-pidgeotto-onix (opp) | none | ✓ | 2091(1):✗ **2096(6):✓** 2100(5):✗ | 64: head `3,4,21,20,5,19,…` | ✗ / ✗ @2090 (first create); **✓ / ✓ @2095** | ✓ |
| MUD_SLAP | mud-slap-player-pidgeotto-onix | none | ✓ | 2087(1):✗ **2092(6):✓** 2096(5):✗ | same | ✗ / ✗ @2086; **✓ / ✓ @2091** | ✓ |
| SAND_ATTACK | sand-attack-pidgeotto-onix (opp) | none | ✓ | **2095(1):✓** 2100(6):✗ 2104(5):✗ | 64: head `4,3,21,20,5,19,…` | ✓ / ✓ @2094; ✗ at the 6-slot window | ✓ |
| SAND_ATTACK | sand-attack-player-pidgeotto-onix | none | ✓ | **2091(1):✓** 2096(6):✗ | same | ✓ / ✓ @2090; ✗ at the 6-slot window | ✓ |
| GRUDGE | grudge-opponent-haunter-player-onix (body 0) | none | ✓ | 2122(6):✓ | `4,3,5,10,9,7` | ✓ / ✓ @2121 | - |
| GRUDGE | grudge-player-haunter-opponent-onix (body 0) | none | ✓ | 2118(6):✓ | same | ✓ / ✓ @2117 | - |
| GRUDGE | both scenarios, body 1 | 288 (NEEDS-KEYS) | - | - | - | **refused** (provider invalid) | - |
| MAGNITUDE | magnitude-intense-opponent-camerupt-player-onix | none | ✓ | 2334(1):✓ | 64 head `4,3,21,…` (row 0) | ✓ / ✓ @2201 | ✓ |
| MAGNITUDE | magnitude-intense-player-camerupt-opponent-onix | none | ✓ | 2210(1):✓ | same | ✓ / ✓ @2197 | ✓ |
| MAGNITUDE | magnitude-regular-opponent-graveler-player-onix | 33 | ✓ | no create | 64 head `3,4,21,…` (row 0) | ✓ / ✓ @2417 | ✓ |
| MAGNITUDE | magnitude-regular-player-graveler-opponent-onix | 33 | ✓ | no create | same | ✓ / ✓ @2417 | ✓ |
| DIVE | dive-opponent-chinchou-player-onix (setup) | 33 | ✓ | 2212(1):✓ 2266(11):✓ | 64 head `3,4,21,…` (setup row 9) | ✓ / ✓ @2211 | ✓ |
| DIVE | dive-player-chinchou-opponent-onix (setup) | 33 | ✓ | 2215(1):✓ 2272(11):✓ | same | ✓ / ✓ @2214 | ✓ |
| DIVE | both scenarios, attack body | 33, 291 (NEEDS-KEYS) | - | - | - | **refused** | - |
| ROCK_SLIDE | static (no scenario) | first action | - | - | `sceneOnPresentation.ts` seed `4,3,21,…` / `battleMenu.ts` seed `3,4,21,…` | first = ✓ known-entry F; battleMenu literal ✗ | prefix `[62,60,0,63,1,61,6,8,2]` |

**Result: all 28 provider-valid body replays equal the observed free order at the activation edge and at the first create (28/28); all 18 accepted-literal comparisons (flamethrower 2, blaze kick 2, rock throw 2, mud slap 2, sand attack 2, grudge 2, magnitude 4, dive setup 2) match at the right frame; provider and observed agree with each other at every queried create window (0 disagreements), 0 model mismatches.** The two apparent literal mismatches (Mud Slap first create, Sand Attack six-slot window) are
frame-selection facts, not model errors, so the only question is which frame the accepted literal was
read at (Mud Slap: act+8 = after the transient slot-3 sprite; Sand Attack: before it). Both choices give identical Sand Attack pixels (swap 3/4: 0/150 ages).

## 2. Moves whose "literal" is a reducer-internal assumption (no config field)

Source: `fixtures/order-consumer-truth.json` (`tools/integration/orderConsumerTruth.mjs`, observed export `order-consumer-observed.json`). Per-age painter order of the accepted reducer vs the
observed back-to-front order (reverse array order) at the nominal alignment (age 0 = accepted window start); alternative initial permutations re-run through copies of the persistent-order
replay. Alignment shifts scanned ±3.

* **Heal Bell** (both orientations, 98 ages with ≥2 notes): initial orders `assumed [4,5,7,9,10,11]`, `provider [4,5,11,10,9,7]`, `observed-at-age-0` (identical to provider) and `interleaved` → **0** ages differ from observed;
  `descending` and `rotated` → **5** ages differ (each flips an overlapping note pair; first age 34). Reducer-to-reducer: assumed vs provider 0 ages. The hard-coded init therefore reproduces this history; the provider call (§0) is what makes
  it history-independent.
* **Leaf Blade** (224 ages): comparing the full 12-slot list is not meaningful (free slots are not modelled), so the comparison uses visible sprites only: best alignment is shift -1 (2-4 of 134 ages differ for *every* init, i.e. the residual is
  the reducer's creation lag, not the init). Initial order `provider/observed [4,3,5,16,…]` vs assumed `[3,4,5,…]`: 1 age with a flipped visible pair, 0 with differing tile cells.
* **Perish Song**: see §0; `oamSlot` rule vs observed differs on 155 ages in general but only age 4 (16 notes stacked at (8,8)) has a flipped *overlapping* pair with different tile/matrix; provider creation-rank rule 0.
* **Ember / Dragon Rage**: ties only occur between sprites created in different sort windows, which sort in creation order by construction (equal-key elements never swap) → provider-independent; confirmed 45/45 and 41/41.
  This is a general rule worth stating for the briefs: **only sprites created in the same sort window (Perish Song's 14 notes, Heal Bell's 4-5 notes per group, Leaf Blade's first blade+trail, Grudge's 6 flames, Mud Slap/Sand Attack's 5-6 per window, Rock Throw's first two rocks) inherit F; every other tie is creation order**, except the 3/88 "crossed tie" case that needs live keys (LiveKeyTracker).

## 3. Config fields vs production (pins)

`tools/integration/orderConsumerPins.mjs` → `fixtures/order-consumer-pins.json` (167 pins; both orientations; `liveBattlerAnchors` + `createBattleCommandFieldArtView(...).coords` via `prep4Production.derive`):
every consumed field is exact. 9 unequal pins, all unread/informational: unread `animationCenter`s (Rock Throw player attacker 72,92 vs 72,100; Perish Song player attacker 72,89 vs 97 and opponent-front target 72,80 vs 88; Leaf Blade 72,81 vs 89 and
72,80 vs 88; Heal Bell opponent-front target spriteCorner 40,53 vs derived 40,48 and animationCenter 72,93 vs 88 — the renderer draws the Onix at the constant `ONIX_MATERIALIZE_CORNER`, `battleScene.ts:5996`), and
`flameSubpriority` (27/37, the post-offset sprite subpriority vs the base battler 40/30; Flamethrower must supply 27/37 = the script's offset applied to the target base, not the base itself). Grudge's animation target is the user
(MOVE_TARGET_USER), so its dense `battlerSprites.target` equals the attacker (pinned that way: 8/8 exact); Magnitude's intense scenario uses a different opponent species than Onix (read from the scenario: all 16 exact).
Mud Slap/Sand Attack accepted fixtures carry **no** attacker/target geometry (only `animationProfile`): derived values are recorded with accepted "-" (adapter must take them from `liveBattlerAnchors`). The Factory-accepted species gap: **Onix is not a rental carrier of Ember, Flamethrower or Blaze Kick**
(accepted fixtures stage Onix/Murkrow); routes below use other carriers whose art is generic (not pixel-pinned).

## 4. Activation, window, row, duration, tails, ad-hoc shadows

`tools/integration/orderConsumerActivation.sh` → `fixtures/order-consumer-activation/mechanic-*.json` (28 fresh direct-mGBA probes; the probe segfaults at interpreter exit after writing, harmless), summarised in
`fixtures/order-consumer-summary.json` (`tools/integration/orderConsumerDraft.py`). Row = activation − windowStart + ageOffset (ageOffset = `appStage.firstFramePresentationAge|presentationAge`; a negative offset trims the first rows).

* Rows 0 and absent from `LIVE_MOVE_OPPONENT_SHADOW_ROW` (`liveMoveAnimation.ts:112`): **88, 215, 195, 348, 288, 291 (setup)** (196 is already present but is a different move).
* No row (window starts after activation): Ember (-4), Dragon Rage (-7), Flamethrower (-15 after trimming 11 negative-age rows), Blaze Kick (-10).
* Side-dependent positive rows (activation falls inside the window): Mud Slap 38 (player attacker) / 42 (opponent); Sand Attack 39 / 43 — the map is move-id keyed, so these need the opponent value (42 / 43) or an oracle-measured check that the shadow frame is really visible there.
* Uncovered tails: Flamethrower 80 frames (window 395..520, script to 600), Dragon Rage 21, Blaze Kick 9, Ember 3; Sand Attack's window runs 178/174 frames *past* the script end (accuracy banner and later frames) — the adapter's duration must follow the window (276 rows), not the script.
* Ad-hoc age-0 enemy-shadow draws in the target branches (found by scanning `battleEnemyShadow`/`drawSourceOpponentEnemyShadow` uses per `config.move ===` branch): **Grudge `battleScene.ts:16129-16135`** (`!playerAttacker && grudgeState.age === 0`) and **Heal Bell `:34439-34452`** (`opponentToPlayer && healState.age === 0`). None in Ember, Flamethrower, Rock Throw, Dragon Rage, Perish Song, Leaf Blade, Blaze Kick, Mud Slap, Sand Attack, Rock Slide, Magnitude, Dive.
* Durations (rows + ageOffset): Ember 63; Flamethrower 115 (+11 negative-age rows trimmed); Rock Throw 87; Dragon Rage 150; Heal Bell 261; Perish Song 259; Leaf Blade 224; Blaze Kick 78; Mud Slap 92/96; Sand Attack 276; Grudge 209; Dive setup 118/115.

## 5. Generated-rental ordinary routes

`tools/integration/orderConsumerRoutes.ts` → `fixtures/order-consumer-routes.json` (seeds 0..9999, streak 0..42 step 7, `rentsCount 0`, `playerTrainerId 416049562`, party member 0 = `rentals[0]`; `later-action-after-exact-body` =
slot-0 rental that also knows ≥1 other live move whose body plan is EXACT in both orientations, so turn 1 = that move and turn 2 = the order consumer is provider-valid *if the opponent's body is EXACT too*).

| Move | first route (seed / streak / slot) | accepted-species route | later-action route (first-turn candidates) | other carriers (species, any slot) | slot-0 hits |
|---|---|---|---|---|---|
| EMBER | 4 / 7 / 0 Magcargo set 194 | **none** (Onix is not a carrier) | same route (151, 201) | Castform, Combusken, Houndour, Magcargo, Torkoal | 721 |
| FLAMETHROWER | 1 / 42 / 0 Slowking 698 | **none** | same (94, 57) | 25 species incl. Arcanine, Blaziken, Charizard, Typhlosion | 2631 |
| ROCK_THROW | 6 / 7 / 0 Graveler 166 | **same** | none (no EXACT predecessor in its set) | Graveler only | 205 |
| DRAGON_RAGE | 37 / 14 / 0 Charmeleon 280 | same | same (163, 246) | Charmeleon only | 100 |
| HEAL_BELL | 0 / 7 / 0 Delcatty 162 | 84 / 7 / 0 Chimecho 209 | 0 / 7 / 0 Delcatty (290) | Chimecho, Delcatty | 394 |
| PERISH_SONG | 25 / 14 / 0 Murkrow 289 | same | same (86) | Altaria, Jynx, Misdreavus, Murkrow | 414 |
| LEAF_BLADE | 23 / 21 / 0 Sceptile 453 | same | same (197) | Sceptile only | 424 |
| BLAZE_KICK | 43 / 28 / 0 Blaziken 547 | **none** | same (25, 9) | Blaziken only | 96 |
| MUD_SLAP | 9 / 14 / 0 Politoed 370 | **none** (Pidgeotto not in a Mud Slap set) | same (57, 94) | Fearow, Huntail, Lickitung, Marshtomp, Nidorino, Octillery, Pidgeot, Politoed, Quagsire, Wartortle | 1496 |
| SAND_ATTACK | 3 / 0 / 0 Pidgeotto 135 | same | 42 / 7 / 0 Stantler 246 (109, 23) | Aipom, Cacnea, Combusken, Flareon, Kabuto, Linoone, Pidgeotto, Stantler | 1136 |
| GRUDGE | 16 / 0 / 0 Haunter 179 | same | same (325, 109, 180) | Haunter, Ninetales | 309 |
| ROCK_SLIDE | 0 / 42 / 0 Dugtrio 660 | none (Grovyle not a carrier) | same | 43 species | 5958 |
| MAGNITUDE | 6 / 7 / 0 Graveler 166 | same | 88 / 7 / 0 Camerupt 241 (182, 201) | Camerupt, Graveler | 294 |
| DIVE | 9 / 7 / 0 Politoed 265 | 105 / 0 / 0 Chinchou 116 | 52 / 14 / 0 Cloyster 371 (92, 182) | Chinchou, Clamperl, Cloyster, Luvdisc, Politoed | 520 |

Caveat as in prep4/prep5: only the staged species pairs are pixel-pinned; Ember/Flamethrower/Blaze Kick/Mud Slap/Rock Slide have **no accepted-species ordinary route** at all, so their ordinary-route proof is an alternate-species proof (geometry from production anchors, art from `liveSceneOnBattlerArt`).
In a real battle the opponent's body also precedes/follows the player's action; the provider is valid only while every earlier body (both sides) is EXACT-PLAN or known-entry, and refuses (never guesses) after a NEEDS-KEYS body.

## 6. Drafted fixtures

`tools/integration/fixtures/order-consumer-<move>-{player,opponent}.json` (`<side>` = attacker side; schema `order-consumer-adapter-draft/v1`, shape of `prep5-*.json`; the `draft` block carries activation, script end, shadow row, expected duration,
window tail, derived attacker config, verdict, order field, exact provider call, measurement pointer and the per-fixture `orderValidation`). 24 files for Ember, Flamethrower, Rock Throw, Dragon Rage, Heal Bell, Perish Song, Leaf Blade, Blaze Kick,
Mud Slap, Sand Attack, Grudge, Dive (setup body; the attack body is recorded under `draft.secondBody`, not drafted). No drafts for Rock Slide (no scenario/activation) or Magnitude (BLOCKED). Corrected copies of existing drafts: **Ember** (`prep4-ember-*.json`)
now records the measured verdict "provider-independent" instead of "NEEDS-ORDER"; **Heal Bell / Perish Song / Leaf Blade / Dragon Rage** (`prep5-*.json`) repeat their prep5 windows/rows/durations unchanged (re-measured identically, 0 differences) with
the order verdicts replaced by the measured ones. `denseWindow.ageOffset` is the positive presentation-age offset (Mud Slap 41/45, Sand Attack 7), negative offsets are trimmed.

## 7. Recommended batch order (for the order-consumer adapter step)

0. **Provider API first**: add `orderForSlots(state, slots)` (= `free.filter(in slots)`, replacing the `slice(0, n)` use), a way to query `F` **inside** a body at an adapter-chosen window (apply the body plan's first `k` windows: Mud Slap/Sand Attack need `k = 2` = the transient slot-3 create/destroy), and an occupied-prefix input for 64-entry consumers (`[62,60,0,63,1,61,6,8,2]` for the known-entry occupants; equal to the accepted literal and the observed order in all 12 raw-backed 64-entry rows (Rock Throw, Mud Slap, Sand Attack, Dive, Magnitude), derived from battler/healthbox/shadow keys in general).
1. **EMBER, DRAGON_RAGE** (no provider input; recipe + window facts only; Dragon Rage keeps the 21-frame tail question).
2. **FLAMETHROWER, ROCK_THROW, LEAF_BLADE, PERISH_SONG, HEAL_BELL** (one filtered-F call at activation/first create; four of the five are pixel-neutral for the measured histories, Heal Bell is sensitive to a bad init; add `initialOrder` parameters to the Heal Bell/Leaf Blade painter-order functions; retire the Heal Bell shadow).
3. **BLAZE_KICK, GRUDGE (first body)** (filtered F; Blaze Kick pixel-sensitive to reversed/ascending; retire the Grudge shadow; keep both of their own bodies as order-chain terminators).
4. **MUD_SLAP, SAND_ATTACK** (in-body plan step + occupied prefix; high pixel sensitivity of the free tail; side-dependent shadow rows).
5. **ROCK_SLIDE** after a BattleLab/ordinary scenario is probed; **DIVE** setup only after the two-turn flow exists, attack body only with LiveKeyTracker; **MAGNITUDE** after its evidence is accepted.

## 8. Open questions

1. Mud Slap/Sand Attack: which literal should the live adapter reproduce — replace Sand Attack's accepted `4,3,…` with the provider's F at the six-slot window (pixel-identical, closer to hardware), or keep it?
2. Real-route histories: the whole corpus is BattleLab entries (plus two Factory entry traces proving the entry stream identical). A scene-ON Factory battle with both sides' moves has never been probed for a *later* player action; the opponent's body (any move) must itself be EXACT-PLAN. Needs one real-route receipt before relying on later-action calls.
3. Heal Bell opponent scenario's entry-window stream differs from the known entry (`entryMatchesProvider false` in `sprite-order-body-events.json`) although its free order at the first edge equals the constant; confirm this is the staging (the Tackle carrier) and not a route difference.
4. Perish Song: the age-4 stacked-note frame (1 flipped overlapping pair) — adopt the provider rank or accept the 1-age risk; `playerPerishSongTurns/opponentPerishSongTurns` remain literals (`next-adapters-prep5.md` §2.2).
5. Leaf Blade: the reducer's residual 2-4 ages vs observed at shift -1 (lag modelling, independent of the init) — not an order issue but visible in the comparison.
6. Flamethrower/Dragon Rage/Blaze Kick uncovered tails (80/21/9 frames) and Sand Attack's 178-frame over-long window need a duration decision (window-driven vs script-driven).
7. Mud Slap/Sand Attack #142 shadow rows are side-dependent and positive (38/42, 39/43); confirm with pixels whether the opponent shadow actually shows there before adding map entries.
8. Magnitude: whether the live event carries enough (level/`movePower`) once evidence is accepted.
9. Rock Slide: probe a scenario (activation, window, rows) — only static literals were checked.
10. Dive: two-turn flow (the attack body always follows the NEEDS-KEYS setup body) is a LiveKeyTracker consumer by construction.

## 9. Evidence paths

`docs/order-consumer-prep.md`; scripts `tools/integration/orderConsumer{EventBatch.py,Seeds.py,Observed.py,Truth.mjs,SeedSensitivity.mjs,Pins.mjs,Activation.sh,Routes.ts,Draft.py}`;
fixtures `tools/integration/fixtures/order-consumer-{seeds,observed,truth,seed-sensitivity,pins,routes,summary}.json`, `order-consumer-raw/*.json` (14 new raw event-probe runs: Ember, Dragon Rage, Heal Bell, Perish Song, Leaf Blade, Magnitude ×4),
`order-consumer-activation/mechanic-*.json` (28), `order-consumer-<move>-{player,opponent}.json` (24 drafts: 12 moves × 2).
Reproduce (from `workspace/`, mGBA venv `V=../../vendor; PYTHONPATH=$V/libmgba-py`): `$V/mgba-venv/bin/python tools/integration/orderConsumerEventBatch.py` (15 s),
`sh tools/integration/orderConsumerActivation.sh` (26 s), then pure: `python3 tools/integration/orderConsumerSeeds.py --write; python3 tools/integration/orderConsumerObserved.py;`
`node --experimental-strip-types tools/integration/orderConsumerTruth.mjs > …/order-consumer-truth.json; … orderConsumerSeedSensitivity.mjs > …/order-consumer-seed-sensitivity.json; … orderConsumerPins.mjs > …/order-consumer-pins.json; … orderConsumerRoutes.ts > …/order-consumer-routes.json; python3 tools/integration/orderConsumerDraft.py`.
