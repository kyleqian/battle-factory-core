# S10A prep43 — sprite-order EXACT plans for the units that stop the production order host most often

Evidence only (side lane, new files only). Question: for each order-host unit of `docs/live-share-census.md`'s order-host table
(the host's `invalidReason` at lend-unknown bodies), does a constant EXACT plan exist in the tracker's plan format, does the order
depend on Random2 words, or on something else? Measured with a TEMPORARY production patch (kept as `.diff`, reverted before every
commit) through the existing corpus replay and the live-share census on the same seeds. Master `e13dd8db0` (src tree `9a1e8a70`).

## Results

| census unit (1000-battle fallback frames) | verdict | plan (production encoding) | ROM evidence: instances exact / jobs / allocation frames | census Δ seeds 0..199 (live frames / commands of the unit's fallback) |
|---|---|---|---|---|
| status animation CONFUSION (97k) | **EXACT-PLAN** (side- and species-independent, by source) | `Cfffff;D1,2,0,3,4` | 17/17, 9 jobs (both sides; Onix, Snorlax, Golbat, Diglett; Confuse Ray / Dizzy Punch / Confusion histories), 34 | **+13839 / +78** (of 20191 / 116) |
| 4 survivors: status animation PRZ (61k) | **EXACT-PLAN** with the existing plan + carry; the "4 survivors" is a counting bug | existing `Cf;Cf;D0;Cf;D1;Cf;D2;Cf;D3;Cf;D4;Cf;D5;Cf;D6` (index 193), 1 survivor carried `D[c1,0]` | 13/13 + 13/13 carries, 13 jobs (Thunder Wave / Stun Spore / Glare, both sides; Shuckle, Snorlax, Golbat, Onix), 208 | **+5195 / +24** (of 9397 / 44) |
| body 202 Giga Drain (60k) | **BLOCKED — species-geometry key** (not Random2) | majority plan in `prep43Check.ts` (9/10) | 9/10: Diglett attacker (opponent side) flips one same-frame orb pair (`D9,7` vs `D7,9`) | 0 (not patched) |
| body 91 Dig (48k) | **EXACT-PLAN, keyed by `request.turn & 1`** (choosetwoturnanim) | setup `Cff;Cffff;D3,2,5,4;Cffff;D7,6,9,8;Cffff;D11,10,13,12;Cffff;D15,14,17,16;Cffff;D19,18,21,20;D1,0`; unleash `Cff;Cf;D2;D1,0` (existing index 6) | setup 4/4, unleash 4/4 (both sides, Chansey / Snorlax defender), 64 | +230 / +1 (of 10670 / 82): the next stop is the retained locked continuation (below) |
| general animation WEATHER_VAR (26k) | sandstorm: **EXACT-PLAN** (`General_Sandstorm: goto Move_SANDSTORM`, = body 201 plan); hail: **BLOCKED — battler-geometry key** | SANDSTORM_CONTINUES = `Cf;Cf;Cf;Cf;D0;Cf;D1;D2;Cf;Cf;D3;D5;D4;D6` (existing index 107) | sandstorm 3/3 (both sides, Onix / Snorlax), 42; hail: 2 instances, 2 different plans | +1006 / +5 (of 2557 / 15); the rest is hail |
| general animation RAIN_CONTINUES (26k) | **WORDS-DEPENDENT** (Random2); the deferred-lend design does **not** cover it | — | 3 instances, 3 different plans (raindrop pair orders); Rain Dance body 240 likewise (2 plans in 3) | 0 |
| body 280 Brick Break (18k) | **EXACT-PLAN, keyed by `request.turn & 1`** (screen shattered) | normal `Cf;Cf/D0;D1;Cf;Cf;D2;D3;Cf;D4;Cff;D5;D6;Cf;D7`; shattered `Cf;Cf;Cf/D0;D2;Cf;Cf;D3;D4;Cf;D5;Cff;D1;D6;D7;Cffff;D10,11,8,9;Cf;D12` | normal 4/4, shattered 4/4 (both sides, Onix / Snorlax), 128 | **+2713 / +13** (of 3427 / 20) |
| general animation LEECH_SEED_DRAIN (17k) | **EXACT-PLAN** (`General_LeechSeedDrain: goto Move_ABSORB`, orb core of the Absorb plan) | `Cf;D0;Cf;Cf;Cf;Cf;Cf;D1;Cf;D2;Cf;Cf;D3;D5;D4;D6;D7;D8;Cf;Cf;Cf;D9;Cf;D10;D11;D12` | 7/7 (both sides; Onix, Snorlax, Golbat seeded), 182 | +1082 / +5 (of 4621 / 23); next stops TURN_TRAP / Rain Dance |
| command resolution without an action prompt (14k) | **BLOCKED — orchestrator path** (the census cases are all the *retained* locked-action continuation, not a plain locked turn) | a plain locked turn = no prompt unit (empty): ROM-confirmed, patch measured **zero** census effect | player-Dig unleash turn: gap has no bounce pair, next edge exact; opponent-Dig: the player's pair `C[3,4]…D[4,3]` sits between the two bodies | 0 |
| return to ball (13k) | **not reached** | — | — | 0 |

**Total (seeds 0..199, 200 battles, 5334 paired commands, same seeds without / with the patch):** live by count **75.68 % → 78.10 %**
(4037 → 4166, +2.42 pp), live by presented frames **75.95 % → 79.22 %** (565234 → 589577 of 744225, +3.27 pp); 0 pairing
mismatches (gameplay unchanged), **0 live → fallback regressions**; +24343 live frames over 129 commands (incl. 278 frames / 3
commands whose allocator-history decline moved because a later body became order-known).

**Corpus replays (master src → patch):**

| replay | edges | known | exact | mismatched |
|---|---:|---:|---:|---:|
| `spriteOrderCrossBodyCorpusReplay.ts` turn-keyed (prep43CorpusReplay.ts (a)) | 1366 | **1130 → 1136** | 1130 → 1136 | **0 → 0** |
| prep43 probe corpus, 63 jobs (prep43CorpusReplay.ts (b)) | 162 | **125 → 151** | 125 → 151 | **0 → 0** |
| `spriteOrderCrossBodyCorpusReplay.ts` unmodified (no `turn` in its events) | 1366 | 1130 → 1136 | 1130 → 1134 | 0 → **2** |

The unmodified tool's two mismatches are both the Dig *unleash* body (`91-mechanic-dig-{opponent,player}-vibrava-…-0.json`,
the edge after it, unit 5): that tool emits `move-animation` without the host's turn key, so the unleash is fed the setup plan. The
production host maps an odd Dig / Brick Break turn to `10091` / `10280` exactly as it already maps Sky Attack turn 1 to `10143`;
the turn-keyed variant (identical rules, the key derived from the corpus: Dig occurrence parity per attacker side, Brick Break
"screen broken" = not a `-normal-` scenario) has 0 mismatches. The corpus has no identified mv-0 (non-move) bodies, so the status /
general-animation plans gain nothing there; they are carried by the probe corpus (b) and the per-frame check.

## Per unit

### CONFUSION — EXACT-PLAN `Cfffff;D1,2,0,3,4`

Source: `Status_Confusion` → `ConfusionEffect` (`data/battle_anim_scripts.s:10156-10163`): five `gConfusionDuckSpriteTemplate`
sprites in one script frame (wave offsets 0 / 51 / 102 / 153 / 204, period 3, duration 90), `AnimConfusionDuck_Step`
(`src/battle_anim_normal.c:282-297`): `y2 = Sin(data[0], 10)`, `oam.priority = data[0] < 128 ? 1 : 3`, angle advanced by ±3
(+3 when the animated battler is on the player side, −3 otherwise), `DestroyAnimSprite` on step 90 — all five on the same frame.
A destroyed sprite becomes `sDummySprite` (equal keys), so the destroy group's order in `sSpriteOrder` is the last live sort
(step 89, `SortSprites`: priority word `subpriority | oam.priority << 8` ascending, then `oam.y` descending, stable):
player side angles 8/59/110/161/212 → priorities 1,1,1,3,3, y2 1/9/4/−8/−9 → `[1,2,0,3,4]`; opponent side angles
248/43/94/145/196 → priorities 3,1,1,3,3, y2 −2/8/7/−5/−10 → `[1,2,0,3,4]`. All ducks share one base y (target coord − 15), so
species shifts all five equally; the order is side- and species-independent. ROM: 17/17 instances (both sides, four lead species
including the elevated Golbat and the low Diglett, three histories), every allocation frame exact, A == B.
The old NEEDS-KEYS verdict (`docs/sprite-order-gap-causes.md:82`, 15 instances, 1 plan) was the "equal priority word, different y"
classifier rule, not an observed variation.

### PRZ — the existing plan, the "4 survivors" is a survivor-counting bug

`applySpriteOrderUnitPlan` (`src/engine/spriteOrderProvider.ts:407`) computes survivors as `made.filter(slot => occupied.has(slot))`.
The PRZ spark plan re-takes the slot it just freed (sparks alternate slots 3 / 4: `made` = `[3,4,3,4,3,4,3,4]`), so the single live
spark (slot 4) is counted four times and `applyPlan` (`spriteOrderEventTransform.ts:260`) invalidates with "4 survivors". Counting each
slot only at its last creation gives one survivor; the existing carry rule (`D[c1,0]` at once) then continues. ROM: 13/13 PRZ
units exact and in all 13 the very next allocation is the destroy of exactly that survivor (`f… D4`, before any other allocation);
the probe replay continues exactly through the carry to the following body edge (2/2). The same fix is a no-op for every existing
unit without slot reuse (all corpus counts unchanged apart from the gains above).

### Giga Drain (202) — BLOCKED, species-geometry key

`Move_GIGA_DRAIN` → `GigaDrainAbsorbEffect` (`battle_anim_scripts.s:5840-…`): orbs `AnimAbsorptionOrb`
(`battle_anim_effects_1.c:2315`) start at the target (`InitSpritePosToAnimTarget` + offsets) and arc to the attacker's
`BATTLER_COORD_X_2 / Y_PIC_OFFSET` (`InitAnimArcTranslation`). Orbs with the same wave period land on the same frame; their last-sort
y order is a sub-pixel function of the two battlers' picture coordinates. No Random2. ROM: the majority plan holds for 9/10 probes, but
a Diglett attacker on the opponent side flips one pair (window 18). A constant plan does not exist; continuing needs a live-key model
(attacker / target picture y + the arc arithmetic) or a species-pair table — not a plan of the current format.

### Dig (91), Brick Break (280) — EXACT, keyed by the choosetwoturnanim parity

Both scripts branch with `choosetwoturnanim` (`Move_DIG` `:2652`, `Move_BRICK_BREAK` `:3714`; the branch is `gAnimMoveTurn & 1`,
Brick Break's turn = 1 when `Cmd_removelightscreenreflect` broke a screen, `battle_script_commands.c:8758`). Each branch has one
constant plan, identical for both sides and both probed defender species. The production key is the request's `turn`
(`battleMoveAnimationRequest`), mapped in the host like Sky Attack. Dig's census gain is small: after the setup the host's next stop is
the retained locked-action continuation (54 of the 61 opponent-Dig commands).

### WEATHER_VAR — sandstorm EXACT, hail BLOCKED (geometry)

`BattleScript_DamagingWeatherContinues` plays `playanimation_var BS_ATTACKER, sB_ANIM_ARG1` (12 sandstorm / 13 hail); the kernel
event carried no argument, so the host could not tell them apart. `General_Sandstorm: goto Move_SANDSTORM` (fixed `createsprite` args;
the body-201 plan, 3/3 continues instances exact). `General_Hail: goto Move_HAIL` → `GenerateHailParticle`
(`battle_anim_ice.c:1414-…`) targets `GetBattlerSpriteCoord` + width / height attrs of visible battlers (no Random2; the Random2 at
`battle_anim_ice.c:1581` is Ice Ball's): the plan differs with the battlers' geometry (the two hail probes give two plans).

### RAIN_CONTINUES — WORDS-DEPENDENT, not covered by the deferred lend

`General_Rain` → two `AnimTask_CreateRaindrops` (`battle_anim_water.c:495-497`: `x = Random2() % 240`, `y = Random2() % 80` per drop);
same-frame drop pairs destroy in their y order, i.e. in the order of Random2 words (3 probes, 3 plans; Rain Dance's own body 240 the
same). The deferred lend (`docs/s10a-random2-order-lend-blocker.md`, `SpriteOrderDeferredLend`) resolves a *move body* whose live
adapter draws its presentation words at the render seam; RAIN_CONTINUES is a general animation with no live adapter (its words are
never drawn), and the marker is keyed by move body. Covering it needs a presentation-RNG drop stream for the continue animation (D3
permits it) plus a general-animation variant of the deferred marker.

### command resolution without an action prompt — BLOCKED (orchestrator), plain locked turn measured zero

Source: `HandleTurnActionSelectionState` (`battle_main.c:4160-4164`) skips `BtlController_EmitChooseAction` for
`STATUS2_MULTIPLETURNS | STATUS2_RECHARGE` — no prompt, no bounce pair; the orchestrator's `playerLocked` is exactly that mask
(`factoryRoundBattleOrchestrator.ts:1828-1831`). ROM: the player-Dig unleash turn has an empty gap (no pair) and the replay is exact
across it. The incremental patch `prep43-temp-src-locked-incremental.diff` (a plain locked turn applies no prompt events instead of
invalidating) changes **nothing** on seeds 0..199 (commands byte-identical): every census case is the `retained !== null` path
(a retained locked-action continuation whose next command's prompt falls mid-resolution — e.g. the opponent's Dig unleash, where the ROM
shows the player's ordinary pair between the two bodies). Continuing there needs the orchestrator to place the prompt cycle at the
retained resolution's turn boundary; not attempted.

## Patch shape (`tools/integration/fixtures/prep43/prep43-temp-src.diff`, 4 files, +20 −3)

- `src/engine/spriteOrderProvider.ts:407` (patched line 408) — survivors: `made.filter((slot, index) => occupied.has(slot) && made.lastIndexOf(slot) === index)`.
- `src/engine/spriteOrderProductionPlans.ts:203-207` (patched) — five plans appended (indices 196 CONFUSION, 197 LEECH_SEED_DRAIN, 198 Dig
  setup, 199 / 200 Brick Break normal / shattered; Dig unleash = existing 6, sandstorm = existing 107); `:273` bodies
  `91:*` → 198, `10091:*` → 6, `280:*` → 199, `10280:*` → 200; `:281-285` anims `LEECH_SEED_DRAIN`, `SANDSTORM_CONTINUES`,
  `STATUS_CONFUSION`. (This file is generated by `tools/integration/spriteOrderProductionTable.ts` and pinned by
  `tests/spriteOrderEventTransform.test.ts`; a production landing regenerates it from fixture rows and updates the pin.)
- `src/engine/liveSpriteOrderHost.ts:309` (patched 309-310) — `moveId` of the order event: odd `turn` of 91 / 280 → `10000 + moveId` (beside 10143);
  `:321` (patched 322-326) — `WEATHER_VAR` with argument 12 / 13 → `SANDSTORM_CONTINUES` / `HAIL_CONTINUES`.
- `src/engine/battleScriptDamagingWeatherOpcode.ts:130-132` — the `playanimation_var` event's `arguments` = `["12"]` / `["13"]`
  from `rulesContext.weather` (sB_ANIM_ARG1 is set from the weather by the end-turn handler; Scene OFF ignores it).
- Typecheck green with the patch (and with the incremental one). Not run with the patch: the full suite (the generated-table pin
  would fail by design).

## Method

- **Probes** (`prep43Probe.py`): 63 jobs = existing BattleLab mechanic scenarios plus lead-species variants (and idle-frame
  extensions so the unit is followed by a body edge), each run twice in fresh direct-mGBA processes through
  `tools/compare/spriteOrderEventProbe.py` (per-frame `sSpriteOrder`, inUse mask, keys) via `tools/run-mgba-probe.py`. All 63 pairs
  byte-identical.
- **Units** (`prep43Extract.py`): `spriteOrderBodyPlans.windows` split as `spriteOrderBodyPlans.extract_scenario` (body =
  `gAnimScriptActive` interval); every allocation window with created slots (+ f/e mode), destroyed slots in `sSpriteOrder` order and
  the ROM free order after it; F changes on non-allocation frames counted (0 in all jobs). mv-0 bodies are labelled by the job's unit
  (CONFUSION / PRZ / ... jobs); bodies by `(mv, attacker side)`.
- **Per-frame check** (`prep43Check.ts`): the production cursor (`applySpriteOrderUnitPlan`, `decodeSpriteOrderPlan`) applies the plan
  prefix through each window from the ROM F at the unit start; created / destroyed slots and F must equal the ROM after **every**
  allocation window; a single survivor must be destroyed by the very next allocation window (carry).
- **Replays** (`prep43CorpusReplay.ts`) and **census delta** (`prep43CensusDelta.py`: liveShareCensus `--commands` paired line by
  line, each previously non-live command attributed to its before-patch order-host reason).

## Receipts (`tools/integration/fixtures/prep43/`)

`units.json` (63 jobs: identicalAB, rows sha256, units), `check.json`, `replay-{before,after}.json`,
`corpus-replay-unmodified-tool-{before,after}.json`, `census-{before,after,after-locked}-seeds0-199.json`,
`census-delta-seeds0-199.json`, `prep43-temp-src.diff`, `prep43-temp-src-locked-incremental.diff`, `.gitattributes`
(`*.diff -whitespace`). No RGB dumps, no mGBA logs (the runner deletes the probe logs).

```
OUT=/tmp/p43-repro REC=/tmp/p43-rec sh tools/integration/prep43Run.sh   # ~5 min; prints same/DIFF per receipt vs the fixtures
```

Reproduced once into fresh dirs before commit: all 10 JSON receipts `same` (fresh probes A/B, three fresh census runs), src reverted.
`tools/` is outside the tsconfig include: `prep43Check.ts` / `prep43CorpusReplay.ts` were checked separately with the project's strict
options (a temp tsconfig extending the workspace one with `"files"` = the two scripts and `typeRoots` = the workspace `@types`;
`NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc -p <it>`: exit 0). Gates on the committed (clean-src) tree:
`npm test` 1568 files / 12920 tests passed (44 / 223 skipped), `npm run build` green, `git diff --check` clean.

## Not reached / caveats

- **return to ball** (13k): not probed. The host invalidates on a `B_SCR_OP_VARIOUS` / `RETURNATKTOBALL` / `RETURNTOBALL` visibility
  receipt that is neither Roar/Whirlwind's forced switch-out nor the voluntary switch (`liveSpriteOrderHost.ts:333`); 10 commands on
  seeds 0..199 (Sand-Attack, Ice Beam, Silver Wind, ...). Source-level hypothesis (unprobed): the main producer is the Factory AI's
  own voluntary switch — `BattleScript_ActionSwitch`'s `returnatktoball` for battler 1 — because `isVoluntaryPlayerSwitchOut`
  (`liveSpriteOrderHost.ts:266-273`) accepts battler 0 only; Baton Pass and a switch after an earlier `MOVE_ANIMATION` in the segment
  (Pursuit) fall through the same way. Continuing would be the opponent analogue of `switch-out` (`spriteOrderRecallPlanText` with the
  opponent battler slot, if `Special_SwitchOutOpponentMon` allocates like the player's) + `switch-in-start/-finish {opponent}`, which
  needs ROM evidence. One attempt: a Scene-ON variant of `mechanic-factory-ai-switch-receipt-a-off.json` (+900 idle frames, A == B)
  did not switch within the trace (bodies Swift / Water Gun only), so no plan is claimed.
- **Retained locked-action continuation** (the real "without an action prompt" cases, now also Dig's next stop): orchestrator work.
- The census is one input policy, battle 1 of a challenge per seed, 200 seeds; per-unit gains are lower bounds of the unit's share
  because each unit's commands may stop at the *next* unplanned unit (the "still fallback" column in `census-delta-seeds0-199.json`:
  TURN_TRAP, Rain Dance 240, Mega Drain 72, Mud-Slap 189, BRN, ...).
- Species coverage: four lead species per side for CONFUSION, three or four for PRZ; CONFUSION's independence is also argued from source.
