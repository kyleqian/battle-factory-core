# S10A prep45 — sprite-ORDER host invalidator chains and the next tier of EXACT order plans

Evidence only (side lane, new files only). Question: for every "sprite-order lend unknown" decline (gate `liveMoveAnimation.ts`
`if (!spriteOrderInput?.known) return null`), which units took the production order host from known to unknown, which later units
kept it unknown, and which of them can get an EXACT plan? Measured with a TEMPORARY production patch (kept as `.diff`, reverted
before every commit). Census baseline: master `5779aa253` (production src tree `e3fc2240`). A sibling integration worker is landing
prep44's allocator ids. This census does not include that work.

## Results

**Census delta, seeds 0..299:** 300 battles, 7970 paired commands, same seeds and driver, without and with
`fixtures/prep45/prep45-temp-src.diff`. Gameplay is unchanged: 0 pairing mismatches, identical battle digest (4,093,242 frames,
5,756 player turns), **0 live → fallback regressions**.

| | live by count | live by frames | order-lend-unknown declines |
|---|---|---|---|
| master | 6499 / 7970 = **81.54 %** | 936788 / 1168273 = **80.19 %** | 954 cmds / 166379 frames |
| patch (18 units) | **6673 = 83.73 % (+174)** | **972402 = 83.23 % (+35614)** | 771 / 129410 (−22 %) |

- Of the +174 commands, 170 commands / 35169 frames are order-lend declines whose whole chain was cleared.
- The other 4 commands / 445 frames were "sprite allocator history unknown" declines. They went live because the order host stays
  known and reseedable at a later send-out (`reseedLiveSpriteAllocatorAfterSendOut`).

**Chain predictor vs measurement.** The predictor rule is "live iff chain ⊆ cleared set", per `prep45Chains.py --cleared ... --after`.
- 209 commands / 40825 frames were predicted to go live.
- Measured live: 170 / 35169 of those, and **0 commands went live without being predicted**.
- The 39 / 5656 predicted but not live are fully explained:
  - **27 / 3932 stop at "command resolution without an action prompt".** This is the retained locked-action continuation, owned by
    the orchestrator step. The shadow tracker misses that unit mid-chain because it reads `retainedLockedActionPresentationOwner` /
    status2 from start-of-step state, while the orchestrator sets the retained owner inside the submit step. As the first unit it is
    always attributed correctly: all 23 such cases came from the production `invalidReason`.
  - **11 / 1673 are now known but decline at "later-body (order lend not a first body)"**, a different consumer gate.
  - **1 / 51 declines at a case-local gate.**

**Corpus replays (master src → patch), `prep45CorpusReplay.ts`:**

| replay | edges | known | exact | mismatched |
|---|---:|---:|---:|---:|
| `spriteOrderCrossBodyCorpusReplay.ts` corpus, turn-keyed (Dig, Brick Break and, new, Solar Beam by occurrence parity) | 1366 | **1136 → 1143** | 1136 → 1143 | **0 → 0** |
| prep45 probe corpus (108 jobs) | 291 | **213 → 241** | 213 → 241 | **0 → 0** |

### Chain statistics (master, seeds 0..299; `chains-before-seeds0-299.json`, `census-before-seeds0-299.json`)

- 954 order-lend-unknown declines / 166379 fallback frames over 64 distinct moves. Chain length is the number of distinct units
  since the host was last known:

  | chain length | 1 | 2 | 3 | 4 | 5 | 6 |
  |---|---:|---:|---:|---:|---:|---:|
  | declines | 523 | 257 | 99 | 52 | 12 | 11 |
  | fallback frames | 93998 | 44423 | 16779 | 8074 | 1509 | 1596 |

  Unlike the allocator host (prep44: only 38 of 232 single-unit chains), more than half of the order chains have a single unit. The
  first-unit ranking is therefore a fair proxy here, but not an exact one.
- **Recovery:** the only revival seen in this policy is the forced party menu (a player faint → `returnLiveSpriteOrderHostFromPartyMenu`'s
  ResetSpriteData), 303 times. The voluntary party menu never opens because the policy only uses FIGHT.
  - Per decline: 526 had no earlier revival in their battle, 306 had 1, 103 had 2, 17 had 3, 2 had 4.
  - A revival is often followed at once by a post-KO unit ("reshow without the opponent battler", or the summary / send-out units the
    shadow sees after skipping).
- Production invalidations, by count (`orderInvalidationsAll`): return to ball 103, BRN 26, without an action prompt 25,
  Giga Drain:player 19, RAIN_CONTINUES 18, Rain Dance:player 16, TURN_TRAP 16, Mud-Slap:opponent 15, ...
- Shadow agreement: the shadow's first unit equals the production `invalidReason` in 510 of 533 known → unknown steps. The other 23 are
  all "command resolution without an action prompt", prepended from production.

### Ranked units (master, seeds 0..299; first-unit fallback frames / commands, greedy gain and rank among non-excluded units)

| unit (production reason, side merged) | first unit | solo | greedy gain (rank) | verdict |
|---|---:|---:|---:|---|
| body 202 GIGA_DRAIN | 16167 / 75 | 8644 | excluded | species-geometry step |
| body 240 RAIN_DANCE | 15301 / 74 | 0 | excluded | Random2 words step |
| command resolution without an action prompt | 12836 / 92 | 8942 | excluded | orchestrator step |
| body 189 MUD_SLAP | 8358 / 71 | 4602 | 4602 (4) | **WORDS-DEPENDENT** |
| general RAIN_CONTINUES | 7975 / 38 | 6088 | excluded | Random2 words step |
| status BRN | 7878 / 42 | 5809 | 5809 (1) | **EXACT-PLAN** (+ carry) |
| battle-start seed: unknown entry | 7262 / 35 | 7262 | — | not a presentation unit (seed) |
| body 28 SAND_ATTACK | 7029 / 52 | 4914 | 4914 (2) | **WORDS-DEPENDENT** |
| general WISH_HEAL | 5445 / 34 | 1024 | 2890 (10) | **EXACT-PLAN** (+ carry) |
| body 56 HYDRO_PUMP | 5340 / 26 | 4766 | 5240 (3) | **EXACT-PLAN** |
| return to ball | 5035 / 33 | 0 | — | **NOT REACHED** (AI switch) |
| body 213 ATTRACT | 4753 / 25 | 3960 | 4509 (5) | **GEOMETRY-KEYED** |
| body 72 MEGA_DRAIN | 4268 / 26 | 2396 | 2570 (9) | **GEOMETRY-KEYED** (absorb-orb family) |
| general INGRAIN_HEAL | 4199 / 19 | 1870 | 2377 (14) | **EXACT-PLAN** (= existing LEECH_SEED_DRAIN plan) |
| body 76 SOLAR_BEAM | 3307 / 18 | 2679 | 2679 (8) | **EXACT-PLAN, keyed by turn** (choosetwoturnanim) |
| body 258 HAIL / general HAIL_CONTINUES | 3303 / 23, 1425 / 11 | 51, 803 | 4092 (24), 1425 (23) | geometry step (prep43) |
| body 179 REVERSAL | 3301 / 13 | 3301 | 3301 (6) | **EXACT-PLAN** |
| status FRZ | 3214 / 16 | 2118 | 2524 (17) | **NOT REACHED** (no freeze scenario) |
| general TURN_TRAP (Wrap) | 3131 / 17 | 2302 | 2495 (13) | **EXACT-PLAN, keyed by trap move** (Bind branch) |
| general SUBSTITUTE_FADE | 2625 / 11 | 1068 | 1068 (30) | NOT REACHED |
| body 315 OVERHEAT | 2517 / 12 | 2287 | 2517 (12) | **EXACT-PLAN** (player side; opponent already planned) |
| body 195 PERISH_SONG | 2355 / 13 | 2355 | 2355 (15) | **EXACT-PLAN** |
| body 349 DRAGON_DANCE | 2295 / 12 | 2295 | 2295 (16) | **EXACT-PLAN, side-keyed** (opponent side added) |
| body 8 ICE_PUNCH | 2052 / 8 | 1164 | 1401 (27) | not probed |
| body 135 SOFT_BOILED | 1832 / 8 | 1832 | 2752 (7) | **EXACT-PLAN** (opponent side added) |
| body 59 BLIZZARD | 1826 / 10 | 0 | 1826 (26) | **GEOMETRY-KEYED** |
| body 291 DIVE | 1786 / 12 | 1306 | 1499 (21) | **WORDS-DEPENDENT** |
| general TURN_TRAP (Whirlpool / Fire Spin / Bind) | 1765 / 9, 498 / 3, 552 / 4 | — | 1969 (19), … | **EXACT-PLAN, keyed by trap move** |
| body 210 FURY_CUTTER | 1761 / 18 | 102 | 1717 (20) | not probed (script branches on the hit count) |
| body 236 MOONLIGHT | 1605 / 7 | 1117 | 2058 (18) | **EXACT-PLAN** (opponent side added) |
| body 138 DREAM_EATER | 1485 / 7 | 380 | 2019 (31) | **GEOMETRY-KEYED** (absorb-orb family) |
| general ITEM_KNOCKOFF | 1471 / 11 | 899 | 1522 (22) | NOT REACHED (no ITEM_KNOCKOFF body in the probes) |
| body 323 WATER_SPOUT | 1112 / 4 | 1112 | 1112 (29) | **KEYED by attacker HP** (not patched) |
| general FUTURE_SIGHT_HIT | 0 / 0 (involved 2717 / 13) | 0 | 1387 (28) | **EXACT-PLAN** (empty plan) |
| body 345 MAGICAL_LEAF | 852 / 5 | 852 | 2956 (11) | **EXACT-PLAN** (opponent side added) |
| body 301 ICE_BALL | 738 / 13 | 152 | 3025 (25) | Random2 (deferred-lend design exists) |

The full table, with involvement and solo per unit and the greedy order over all units, is in `chains-before-seeds0-299.json`.

Greedy over the non-excluded units (cumulative): BRN 5809, Sand-Attack 10723, Hydro Pump 15963, Mud-Slap 20565, Attract 25074,
Reversal 28375, Softboiled 31127, Solar Beam 33806, Mega Drain 36376, WISH_HEAL 39266, Magical Leaf 42222, Overheat 44739,
TURN_TRAP Wrap 47234, INGRAIN_HEAL 49611, Perish Song 51966, Dragon Dance 54261, FRZ 56785, Moonlight 58843, TURN_TRAP Whirlpool 60812, ...

### Per-unit verdicts (`check.json`, `units.json`, `random-scan.txt`)

**Probe evidence.** Every probe below ran twice in fresh direct-mGBA processes (108 jobs, all 108 A/B pairs byte-identical). A second
independent `prep45Run.sh` run reproduced `units.json` / `check.json` byte-identically.

**Check method.** The per-frame check is `prep45Check.ts`, which uses prep43Check's `checkUnit` unchanged. The production cursor applies
the plan prefix through every allocation window, and created / destroyed / free order must equal the ROM after each window. A single
survivor must be destroyed by the very next allocation window, which is the production carry.

**Species variants.** Variants swap the lead species (Snorlax 143, Golbat 42), or for battlers-format scenarios the Factory set
(Lickitung 164, Nosepass 150). Self-target moves vary the attacker.

**Random2 scan.** `prep45RandomScan.py` follows each script's subroutines, its `createsprite` macros, sprite callbacks, visual tasks
and the templates those create. It reports no Random2 / Random for any unit claimed EXACT.

**EXACT-PLAN (20 labels, every instance exact per frame):**

| unit | plan (production encoding) | ROM: instances / jobs / allocation frames | source |
|---|---|---|---|
| status BRN | `Cf;Cf;Cf;D0;D1` (+ carry of the 3rd flame) | 8/8, 4 jobs (both sides; Shuckle, Snorlax, Golbat burned; infliction + end-turn), 48 + 8 carries | `Status_Burn` → 3× `BurnFlame` (`battle_anim_scripts.s:10235`), `AnimBurnFlame` (no Random2) |
| general TURN_TRAP, Fire Spin | `Cf;Cf;Cf;Cf;Cf;Cf;Cf;D1;Cf;D2;D0;Cf;Cf;D3;Cf;D4;Cf;D7;D5;D8;D6;D9;D10` | 4/4 (both sides, Onix / Snorlax / Golbat trapped), 96 + 4 carries | `General_TurnTrap` (`:10361`) `jumpargeq 0, TRAP_ANIM_*`; `AnimTask_GetTrappedMoveAnimId` (`battle_anim_throw.c:2486`) |
| general TURN_TRAP, Whirlpool | `Cff;Cf;Cf;Cf;Cf;Cf;D0;Cf;Cf;Cf;Cf;Cf;Cf;D2;D3;D1;D4;Cf/D5;D8;D6;D9;D7;D10;D13;D11;D12` | 2/2 (both sides), 52 | `Status_Whirlpool` |
| general TURN_TRAP, Sand Tomb | `Cff;Cf;Cf;Cf;Cf;Cf;D0;Cf;D2;Cf;D3;D1;Cf;Cf;D4;Cf;D5;Cf;D8;D6;D9;D7;D10;D11;Cf;D12` | 2/2 (both sides), 54 + 2 carries | `Status_SandTomb` |
| general TURN_TRAP, Bind / Wrap (and any other trap move except Clamp) | `Cf;Cf;D0,1` | 6/6 (Wrap: both sides, Onix / Snorlax / Golbat; Bind: both sides), 18 | `Status_BindWrap` |
| general WISH_HEAL | `Cf;Cf;D0;D1;Cf;Cf;Cf;D2;Cf;D3;D4` (+ carry) | 4/4 (both sides; Illumise / Snorlax / Golbat healed), 48 + 4 carries | `General_WishHeal` |
| general INGRAIN_HEAL | the existing LEECH_SEED_DRAIN plan (index 199) | 4/4 (both sides; Lileep / Snorlax / Golbat), 104 | `General_IngrainHeal` → `call AbsorbEffect`, the same orb core as `General_LeechSeedDrain: goto Move_ABSORB` (prep43) |
| general FUTURE_SIGHT_HIT | empty plan (no sprite allocation; the existing empty index 9) | 4/4 (both sides; Onix / Snorlax / Golbat hit) | visual tasks only |
| body 56 Hydro Pump | 56 windows, both sides identical (`check.json` plans) | 4/4 (both sides; Onix / Snorlax / Golbat defender), 208 | `Move_HYDRO_PUMP` |
| body 179 Reversal | `Cf;D0;Cffffff;D3,2,1,4,5,6;Cf;Cfff;D7;D8;D10;D9` | 4/4 (both orientations; Delcatty / Snorlax defender), 40 | `Move_REVERSAL` |
| body 345 Magical Leaf | existing `345:player` plan (index 182), identical on the opponent side | 4/4 (both sides, 2 defenders each), 96 | `Move_MAGICAL_LEAF` (`create_razor_leaf_particle_sprite` macros) |
| body 76 Solar Beam turn 0 (charge) | `Cf;Cf;Cf;Cf;Cf;D0;…;D10;D11;D12;D13` | 4/4 (both sides; Chansey / Snorlax / Golbat), 112 | `Move_SOLAR_BEAM: choosetwoturnanim SolarBeamSetUp, SolarBeamUnleash` |
| body 76 Solar Beam turn 1 (unleash) → key 10076 | `Cff;Cff;Cf;…;D27;D29` (`check.json`) | 4/4, 244 | same |
| body 135 Softboiled | existing `135:player` plan (index 79), identical on the opponent side | 4/4 (both sides; Chansey / Snorlax user), 56 | `Move_SOFT_BOILED` |
| body 315 Overheat | existing `315:opponent` plan (index 171), identical on the player side | 4/4 (Solrock / Magcargo attacker; Shuckle / Snorlax / Golbat defender), 96 | `Move_OVERHEAT` |
| body 195 Perish Song | `Cffffffffffffff;Cfff;Cf;D17;D14,13,15,12,11,10,0,9,1,8,2,7,3,4,6,5;D16;Cf;D18` | 5/5 (both sides; Onix / Snorlax / Golbat, + the AI-switch c2 receipt), 40 | `Move_PERISH_SONG` |
| body 349 Dragon Dance (side-keyed) | player = existing index 186 `Cfffff;Cf;D2,5,1,3,0,4`; opponent `Cfffff;Cf;D0,4,2,5,1,3` | 2/2 + 2/2 (Dragonair / Snorlax and Dragonair / Golbat user), 12 | `Move_DRAGON_DANCE`: the orbit order depends on the attacker side only (both species per side agree) |
| body 236 Moonlight | existing `236:player` plan (index 128), identical on the opponent side | 4/4 (both sides; Gloom / Snorlax user), 68 | `Move_MOONLIGHT` |
| (control) general HELD_ITEM_EFFECT | the existing plan (index 191) | 2/2 (the Leftovers unit in the Sand Tomb jobs), 12 | — |

**Existing one-sided plans.** Five bodies already had a production plan for one side: 135:player, 236:player, 315:opponent,
345:player and 349:player. Each existing plan text is byte-identical to the plan observed here. For 135, 236, 315 and 345 the plan
also holds on the other side. This is independent confirmation of the probes.

**WORDS-DEPENDENT (Random2):**
- **Sand-Attack 28 and Mud-Slap 189.** `AnimDirtScatter` draws `xOffset = Random2() & 0x1F; yOffset = Random2() & 0x1F` for every
  dirt sprite (`battle_anim_ground.c:213-214`). The same-frame destroy groups then sort by those words: 4 probes per move gave 4
  different plans.
  - A word-keyed plan would need the body's own 60 draws (6 × `SandAttackDirt` / `MudSlapMud` calls × 5 sprites × 2).
  - The deferred-lend design (`SpriteOrderDeferredLend`) covers later bodies of a multi-body move, not a body whose own order is
    word-dependent. These need a per-body presentation-RNG order model.
- **Dive 291.** `AnimSmallDriftingBubbles` (`battle_anim_water.c:1032-1033`) and `AnimSprayWaterDroplet` (`battle_anim_flying.c`);
  scan only, not probed.
- **Ice Ball 301.** `InitIceBallParticle` (Random2); the existing deferred lend applies.

**GEOMETRY-KEYED (for the geometry step, same family as Giga Drain / hail / Icy Wind):**
- **Attract 213.** No Random2. 2 plans in 4 instances: only the player-side attacker with the Onix defender creates one heart a
  frame earlier (`Cf;Cfffffff` vs `Cff;Cffffff`). The Golbat defender and the opponent-side attacker vs Onix both give the other
  plan. The heart projectile's flight time is attacker → target coordinate arithmetic (`gRedHeartProjectileSpriteTemplate` to
  `ANIM_TARGET`).
- **Mega Drain 72 and Dream Eater 138.** The absorb-orb arc of Giga Drain: `AnimAbsorptionOrb`, `InitAnimArcTranslation` to the
  attacker's `BATTLER_COORD_X_2 / Y_PIC_OFFSET`.
  - Mega Drain's plan already differs by side (`D6,5` vs `D5,6`).
  - Both were constant for two defender species per side, but prep43 showed the Giga Drain flip comes from the attacker species
    (a Diglett attacker), which was not varied here.
  - Not patched.
- **Blizzard 59.** Opponent side: 2 plans for 2 defender species. Player side: constant 2/2. The ice crystals target-coordinate path.
- **Hail 258 / HAIL_CONTINUES.** Unchanged from prep43.

**KEYED by battle state (no plan of the current format):**
- **Water Spout 323.** `GetWaterSpoutPowerForAnim` (`battle_anim_water.c:1060, 1243`) sets the droplet count from the attacker's HP.
  The 4 probes (full HP) are constant per side, but ordinary play is not at full HP.
- **Fury Cutter 210.** The script branches on the hit count (`AnimTask_IsFuryCutterHitRight`); not probed.
- **TURN_TRAP Clamp.** Its own `Status_Clamp` branch; not probed, so the patch keeps invalidating it.

**NOT REACHED:**
- **FRZ.** No freeze scenario exists; Ice Beam's 10 % freeze is not staged.
- **ITEM_KNOCKOFF.** The Knock Off probes produced no `General_ItemKnockoff` body.
- **SUBSTITUTE_FADE, NIGHTMARE, Ice Punch.** Not probed (time).
- **"return to ball" (Factory AI voluntary switch).** Four Scene-ON re-profiles of the Scene-OFF AI-switch receipts were tried:
  `ais-a/b/c/c2`, keeping the first submitted turn and adding 1500 idle frames, two fresh runs each, A == B. None shows a switch-out
  special before the first move body:
  - a: Swift / Water Gun
  - b: Protect, then a Leftovers-type mv-0
  - c: Tackle / Spore / SLP
  - c2: Perish Song / Splash

  The receipts' inputs are timed for Scene OFF. Reaching the switch in Scene ON needs re-timed multi-turn inputs, which were not
  attempted (budget ~5 minutes). "return to ball" is the most frequent production invalidation (103), but only 33 first-unit
  declines / 5035 frames, with solo 0: every chain also holds a post-KO / switch unit.

### Patch shape (`fixtures/prep45/prep45-temp-src.diff`, 3 files, +30 −4)

- **`src/engine/spriteOrderProductionPlans.ts:207`** (end of `SPRITE_ORDER_PRODUCTION_PLANS`) — 12 plans appended:
  - 201 STATUS_BRN, 202–204 TURN_TRAP_FIRE_SPIN / _WHIRLPOOL / _SAND_TOMB
  - 205 body 56, 206 body 179, 207 / 208 body 76 / 10076, 209 body 195, 210 body 349:opponent
  - 211 TURN_TRAP_BIND, 212 WISH_HEAL

  **`:273`** (end of `SPRITE_ORDER_PRODUCTION_BODIES`) — 15 keys:
  - `56:*`, `179:*`, `76:*`, `10076:*`, `195:*`
  - `349:opponent`
  - `135:opponent` → 79, `315:player` → 171, `345:opponent` → 182, `236:opponent` → 128

  **`:290`** (end of `SPRITE_ORDER_PRODUCTION_ANIMS`) — 8 keys: `STATUS_BRN`, `TURN_TRAP_FIRE_SPIN`, `TURN_TRAP_WHIRLPOOL`,
  `TURN_TRAP_SAND_TOMB`, `INGRAIN_HEAL` → 199, `TURN_TRAP_BIND`, `WISH_HEAL`, `FUTURE_SIGHT_HIT` → 9 (empty).
- **`src/engine/liveSpriteOrderHost.ts:118`** — `TWO_TURN_ANIM_MOVE_IDS` gains 76, so an odd Solar Beam turn becomes 10076, beside
  Dig, Brick Break and Sky Attack.
  **`:325`** (`orderEventOf` default branch) — `TURN_TRAP` with argument 83 / 250 / 328 / (20, 35) →
  `TURN_TRAP_FIRE_SPIN` / `_WHIRLPOOL` / `_SAND_TOMB` / `_BIND`; anything else, including Clamp 128, stays `TURN_TRAP` (no plan).
- **`src/engine/battleScriptStatbuffchangeOpcode.ts:329`** — the `B_ANIM_TURN_TRAP` event's argument becomes the trapped battler's
  `rulesContext.battlers[battler].wrappedMove`.
  - The ROM passes `wrappedMove` as `sB_ANIM_ARG1/2` (`battle_util.c:1599-1600`).
  - The kernel's `runWrapTick` (`battleEndTurnOrchestration.ts:817`) never stamps `animArg1`, so on master the argument is stale.
  - This is an event-only change; Scene OFF ignores it. The census command sequence and battle digest are identical with it.
- Typecheck is green with the patch (`npm run typecheck`). The full suite was not run with the patch: the generated-table pin fails
  by design.

**A production fold must also:**
- Regenerate the table rather than hand-edit it. Append `fixtures/prep45/plan-rows.json` (rows-v1, written by
  `prep45PlanRows.ts` from `check.json`: 15 bodies and 8 anims) after `prep43/plan-rows.json` in
  `tools/integration/spriteOrderProductionTable.ts:157`.
  - `prep45PlanRowsVerify.ts` renders the table that way. Its key → plan-text mapping is identical to the temporary patch's: 508
    bodies, 20 anims; receipt `plan-rows-verify-map.json`.
  - Only the indices differ: the renderer puts appended bodies before anims.
- Update the pins in `tests/spriteOrderEventTransform.test.ts:25-26`: BODIES 493 → 508, PLANS 201 → 212. The regenerated count is 212,
  not 213: BRN's text `Cf;Cf;Cf;D0;D1` equals STATUS_INFATUATION's existing index 192 and the generator dedupes it. The hand
  patch's index 201 is that duplicate. The anim assertions
  (`:123-131`) gain the new names.
- Update `tests/liveSpriteOrderHost.test.ts:344`, the choosetwoturnanim table, with `[76, 1, 10076]`.
- Add a kernel test that the `TURN_TRAP` event carries `wrappedMove`. The only existing `TURN_TRAP` test fixture
  (`tests/liveBattlerX2History.test.ts:99`) uses `arguments: []` and is unaffected.
- Reword the host's header comment (the TURN_TRAP row).

**Residual after the patch** (`chains-after-all-seeds0-299.json`): 771 declines / 129410 frames. Chain lengths 1:434, 2:184,
3:92, 4:45, 5:16.
- First units: Giga Drain 19683, without-prompt 17456, Rain Dance 15848, Mud-Slap 8409, RAIN_CONTINUES 7975, Sand-Attack 7523,
  battle-start seed 7262, return to ball 5035, Attract 4753, Mega Drain 4268, ...
- Greedy over the non-excluded units: Sand-Attack 5803, Mud-Slap 4862, Attract 4753, Mega Drain 3784, FRZ 2524, Fury Cutter 1717,
  Dive, ITEM_KNOCKOFF, HAIL_CONTINUES, Hail, Ice Ball, Blizzard.
- Everything at the top is now owned by the words / geometry / orchestrator steps, except FRZ, Fury Cutter and ITEM_KNOCKOFF.

## Instrument

`tools/integration/prep45OrderCensus.ts` is a copy of `liveShareCensus.ts`'s driver, as in prep44: that script runs at import and
exports nothing. It keeps the same CLI, policy and report. Its command records equal `liveShareCensus.ts`'s, apart from the two
added fields; this was checked on seeds 0..29.

**Shadow tracker.** Each step:
- When the production order host (`state.liveMoveSpriteAllocatorHost.orderHost`) is known, the shadow is reset to the production
  tracker.
- The shadow receives exactly the events the production host consumed: its cursor before → after, mapped by a verbatim copy of the
  host's private `orderEventOf` / `isForcedSwitchOut` / `followsForcedSwitchOut` / `isVoluntaryPlayerSwitchOut`.
- It also receives the prompt cycle, with the host-level reasons:
  - previous resolution not fully applied
  - command resolution without an action prompt (the orchestrator's `promptShown` from start-of-step state)
  - resolution without a modelled prompt cycle
  - the forced-switch-in reset + reshow
- Every event that would invalidate a known tracker is recorded with `applySpriteOrderPresentationEvent`'s own `invalidReason`. The
  shadow skips it (stays at its pre-unit state), which is the chain predictor's "cleared" assumption.

**Chain bookkeeping.**
- The chain resets whenever the production host is known again, and the revival is recorded.
- On a known → unknown step the production `invalidReason` is the first unit.
- TURN_TRAP units are named with the trapped battler's wrapped move (naming only).
- Each order-lend decline gets `orderChain`: units strictly before its own body's event sequence. It also gets
  `orderRecoveriesBefore`.
- The report adds `orderInvalidatingUnits`, `orderInvalidationsAll`, `orderRecoveriesAll` and `orderShadowAgreement`.

**Known gaps.**
- A prompt-less retained continuation is invisible mid-chain (above); it only over-predicts.
- After a skipped unit, the shadow can record artefact post-KO units: "next-mon summary while the opponent battler is tracked" when
  a skipped unit hid the faint. This lengthens chains (conservative) and they are tagged excluded.

`prep45Chains.py` normalizes body units across sides (a plan is only accepted when proven on both sides). It ranks by first-unit frames
and by greedy chain-clearing gain over the non-excluded units. It reports chain-length and recovery distributions, and with `--cleared`
/ `--after` the prediction and the paired measurement.

## Reproduce

    OUT=/tmp/p45-repro REC=/tmp/p45-rec sh tools/integration/prep45Run.sh   # ~6 min; SKIP_PROBES=1 / SKIP_CENSUS=1
    # prints "same <file>" for every receipt in tools/integration/fixtures/prep45/; src is applied from the .diff and reverted

The reproduction was done twice into fresh directories:
- A full run before the 4 AI-switch jobs were added: all 12 receipts `same`.
- A `SKIP_CENSUS=1` run with the final job list (108 jobs, fresh probes): `units.json`, `units-summary.txt`, `check.json`,
  `random-scan.txt` and `replay-{before,after}.json` all `same`.
- The census receipts do not depend on the probes.

Files (`tools/integration/`):
- `prep45OrderCensus.ts` — instrument.
- `prep45Chains.py` — chains, ranking, prediction and measurement.
- `prep45Probe.py` — 108 jobs, each run twice fresh, via `prep43Probe.run`.
- `prep45Extract.py` — unit receipts, via `prep43Extract`.
- `prep45Check.ts` — per-frame check.
- `prep45RandomScan.py` — source scan.
- `prep45CorpusReplay.ts` — replays.
- `prep45PlanRows.ts` / `prep45PlanRowsVerify.ts` — rows-v1 for the generator, and the check of the regenerated table against the
  patch.
- `prep45Run.sh` — reproduction.
- `prep43CensusDelta.py` — pairing and delta; existing, unchanged.

Receipts (`fixtures/prep45/`), with `.gitattributes` `*.diff -whitespace`:
- `census-{before,after-all}-seeds0-299.json`, `census-delta-all-seeds0-299.json`
- `chains-{before,after-all}-seeds0-299.json`, `chains-predict-all.json`
- `units.json`, `units-summary.txt`, `check.json`, `random-scan.txt`
- `plan-rows.json`, `plan-rows-verify-map.json`
- `replay-{before,after}.json`
- `prep45-temp-src.diff`

No RGB dumps and no mGBA logs.

## Not reached / caveats

- FRZ, ITEM_KNOCKOFF, SUBSTITUTE_FADE, NIGHTMARE, Ice Punch, Fury Cutter, Clamp: no plan (see above).
- The Factory AI switch is not reached in Scene ON.
- Dragon Dance is side-keyed on evidence (2 attacker species per side) plus the source structure. The existing player plan was
  already production.
- Species coverage is 2–3 lead species per side for each EXACT unit. INGRAIN_HEAL relies on the prep43 orb-core result plus 4/4 here.
- The census uses one input policy (FIGHT, least-used slot), battle 1 of a challenge per seed, and 300 seeds.
