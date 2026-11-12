# S10A prep65: Dive 291 as a Random2-words order unit (setup + unleash)

Integration lane, evidence only, new files only. Base: master `83ac6aa75` (production src tree `d7f24b03`). No tracked file was
changed. The production experiment is `tools/integration/fixtures/prep65/prep65-temp-src.diff` (206 lines). `prep65Run.sh` applies it
and always reverts it. Receipts are in `tools/integration/fixtures/prep65/`. Every probe ran twice in fresh direct-mGBA processes with the
jobs' explicit lab seeds. The shared HTTP oracles were never touched.

## Results

**Dive becomes a words unit end to end with three small production pieces, all exact against prep61's ROM receipts.**
1. The presentation host already records the right words for both bodies, including the unleash body that has no adapter.
2. The patched carry reproduces every Dive body's whole ROM order plan from those words.
3. The deferred lend through the hidden turn equals the ROM's lend at the unleash and after it.

On census seeds 0..299 the patch adds **+35 live commands / +5,361 frames**, with 0 live → fallback regressions, an identical command key
sequence and an identical battle digest.

- **(1) Words recording: RECORDED == RAM, 15 / 15 Dive bodies** (8 setup, 7 unleash; receipt `host-words.json`, tool `prep65Words.ts`).
  - Source: `tickLiveMovePresentationRngSession` (`liveMovePresentationRng.ts`) activates **every** presented `move-animation` command
    that has a Random2 plan, whether or not an adapter renders it.
  - `liveMoveRandom2Plan` keys Dive by `turn & 1`. Turn 1 uses `LIVE_DIVE_RANDOM2_PLANS.attack`: 20 words at +16 (DiveAttack's 10
    `AnimSprayWaterDroplet`, `battle_anim_flying.c:1106-1107`), then 4 words at +30 + 4k for k = 0..8 (RisingWaterHitEffect's 2
    `AnimSmallDriftingBubbles` per step, `battle_anim_water.c:1032-1033`). That is 56 words.
  - So the unleash words ARE recorded by key `move:<request>:<segment>:<command>`. The live adapter's turn-1 decline does not prevent it.
  - Check: the production activation ran on a host pinned at the RAM `gRng2Value` of the body's activation frame A. On every plan frame,
    the RAM drew 1 + count words (the per-frame step, then the body's draws), and the last `count` equal the recorded draw group. Every
    other frame from A + 1 to the last plan frame drew exactly 1 word.
  - Routes: 7 probe routes, both attacker sides, CHINCHOU / ONIX and LANTURN / GOLEM, plus the Surf and Whirlpool hidden-hit variants.
  - Caveat (D3): in play the host is **surrogate**-seeded, so these are faithful-random words, never oracle-synchronized. The check
    proves the plan law (ages, counts, per-frame step), not the stream's value.
- **(2) Patch check: 15 / 15 bodies exact** (receipt `check.json`, tool `prep65Check.ts`, run with the patch applied).
  - Inputs: the patched `liveDiveWordsPlanText`, the host-recorded words (as in (1)), the ROM lend `F0` and the job's species.
  - **Plan text == the ROM plan text in 15 / 15 bodies:**
    - setup `Cf;D0;Cfffffffffff;D1;D<10 droplets>`;
    - unleash `Cfffffffffff;Cfff;Cfff;Cfff;D0;D11;…;D37,36`, 25 windows, whose 10 multi-sprite destroy groups are words-dependent.
  - prep61Check's per-frame `checkUnit` is **exact in 15 / 15 bodies, 215 allocation windows**: the production cursor through every
    window, with created, destroyed and F equal to the ROM.
  - Control: another body's words never give the ROM plan (0 / 15).
- **Lend vectors through the production resolver: 7 / 7 + 7 / 7.**
  - Resolver: `resolveSpriteOrderDeferredLend` + `liveWordsOrderDeferredCarry` + `LIVE_WORDS_ORDER_DEFERRED_REPLAY`.
  - Setup marker: activation = the ROM setup lend, `bodySpecies`, turn 0. Its units are the hidden window's order events:
    - the opponent-side prompt cycle;
    - Surf 57 / Whirlpool 250 from the other battler, each followed by `hit-animation {targetVisible: false}`;
    - or nothing.
  - It **lends the ROM unleash lend in 7 / 7 vectors**. This is prep61's 7 / 7 carry, now through production code rather than a tool.
  - The nested unleash marker (activation = the setup marker, turn 1) **lends the ROM free order after the unleash body in 7 / 7**
    (the next unit's `F0`).
  - Control: a species-free Dive marker declines in 7 / 7.
- **(3) Census seeds 0..299, identical seeds** (`liveShareCensus.ts` and `prep61OrderCensus.ts`, base `83ac6aa75` vs the patch).

  | | live by count | live by frames | faithful-random history (D3) |
  |---|---|---|---|
  | base | 7,740 / 7,970 = 97.11 % | 1,147,932 / 1,170,031 = 98.11 % | 274 commands / 43,838 frames |
  | patch | **7,775 = 97.55 % (+35)** | **1,153,293 = 98.57 % (+5,361)** | **309 / 49,199 (+35 / +5,361)** |

  - Command key sequence identical: 7,970 commands; key = battle, kind, moveId, move, side, attacker, target, frames, duration
    (`census-keys-seeds0-299.json`).
  - 0 pairing mismatches, **0 regressions** (`census-delta-seeds0-299.json`).
  - Battle digest `e3603a848daa…` on both runs.
  - Every gained command is a faithful-random claim. The live share excluding faithful random is unchanged: 93.68 % / 94.36 %.
  - Gained, all from "sprite-order lend unknown":

    | move | commands |
    |---|---:|
    | Dive (later setups; opponent 8, player 3) | 11 |
    | Dig (opponent) | 8 |
    | Double Team (opponent 6, player 3) | 9 |
    | Silver Wind (player) | 3 |
    | Spark (opponent) | 3 |
    | Mud-Slap (opponent) | 1 |

  - By first stop (`census-delta`):
    - `no EXACT plan: body 291:opponent` 25 / 26 commands, 3,397 / 3,512 frames;
    - `body 291:player` 10 / 11, 1,964 / 2,082;
    - `duration: unsupported turn 1` (the Dive attack body itself) 0 / 19, 608 frames: the next fold, see (4).
- **Chain predictor vs measurement** (`prep45Chains.py --cleared "body 291 DIVE"`, `chains-predict-dive.json`).
  - Predicted 35 commands / 5,358 frames. Measured: predicted & live 33 / 5,125.
  - Predicted & not live 2 / 233: battles 107 and 162. Those Dive setups now reach the Dive setup adapter and decline on its own gate
    "battler has a status condition" (`liveMoveAnimation.ts:3964`), not on order.
  - Not predicted & live 2 / 236: battle 214's two Dive bodies behind `body 291:player > body 240:player > RAIN_CONTINUES`. That is a
    nested words chain, Dive → Rain Dance → General_Rain; the single-unit predictor does not credit the words units already behind Dive.
  - Seeds 0..999 were not run here. The step's 12,687 fallback frames / 81 commands are master's 0..999 figure.

## The patch shape (`fixtures/prep65/prep65-temp-src.diff`, line numbers of the patched tree)

1. `src/engine/wordsOrderUnits.ts:10-11`: `WORDS_ORDER_UNIT_MOVE_IDS = [28, 189, 240, 291]`. This makes three things follow:
   - `DEFERRED_LEND_MOVE_IDS` holds 291, so the orchestrator's `markLiveSpriteOrderDeferredBody` call marks both Dive bodies;
   - `isWordsOrderDeferredUnit` lends the marker to ANY consumer;
   - `LIVE_WORDS_ORDER_DEFERRED_REPLAY` replays the battle units past it.
2. `src/engine/liveSpriteOrderHost.ts`
   - `:139` `TWO_TURN_ANIM_MOVE_IDS` gains 291, so the unleash body keys `10291:<side>`.
   - `:144` `SEMI_INVULNERABLE_SETUP_MOVE_IDS` gains 291: the diver is `hidden` from setup to unleash. A hit on it is a no-op
     (`spriteOrderEventTransform.ts:448`, fly63's rule). A hidden diver's faint or switch invalidates (fly63).
   - `:146-147` new `deferredBodyOrderKey`: a marked turn-1 two-turn body matches its own `10000 + move` event in
     `advanceLiveSpriteOrderHost` (`:527`). Before, the marker compared `deferredBody.moveId` (291) with the event's 10291 and never
     armed.
   - `:130` `bodySpecies` is recorded for 291 too (words59's field).
3. `src/engine/liveMoveAnimation.ts`
   - `liveWordsOrderDeferredCarry` (`:1470-1473`): a Dive marker carries only with `bodySpecies` (species-free → null);
     `liveDiveWordsPostFree`.
   - New `liveDiveWordsPlanText` / `liveDiveWordsPostFree` (`:4217-4321`):
     - Lifetimes come from `dive.ts diveAtAge` run on placeholder slots.
     - Slots are lowest-free over the activation occupancy, creates before the window's destroys, exactly as
       `applySpriteOrderUnitPlan` allocates.
     - Each multi-sprite destroy group is ordered by the real-slot reducer's `hardwareOrder` at the age before it.
     - The text is applied with the production plan cursor.
     - Setup reuses `liveDiveSetupProfile` (droplet velocities from words 2i / 2i+1, subpriorities 30 / 40, the ball rule).
     - Attack: splash + 10 droplets at +16, 9 impacts at +30 + 4k with 2 bubbles each (`(w & 0xff) | 256`, `w & 0x1ff` folded), impact
       anchor = target Y_PIC_OFFSET y − 8 (player target) / − 2 (opponent target).
     - The seed is the activation order restricted to the body's slots. No pre-allocation re-sort was needed, 15 / 15.
   - Imports: `applySpriteOrderUnitPlan`, `createSpriteOrderPlanCursor`, `decodeSpriteOrderPlan`, `diveAtAge`, `DiveGeometry`.
4. **No new event payload, no orchestrator change, no plan-table row.** Dive stays words-keyed (no `291` / `10291` row in
   `spriteOrderProductionPlans.ts`), so the corpus replay and the table are untouched.

**Tests under the patch.** 27 related files were run (the 22 sprite-order / words / presentation-RNG files, `liveBattlerX2History`,
`playableAnimationLifecycle`, `animation/liveDiveSetupAdapter`, `animation/diveSourceCheckpoint`, `liveMoveAnimationPalette`,
`battleScriptSemiInvulnerableOpcode`, `battleScene`): **530 / 531 pass**.
- The one pin a fold must move: `tests/spriteOrderFly63.test.ts:148-157`, "Dive 291 keeps master's single unplanned key and never
  hides". Under the patch, turn 1 keys `10291` and `hidden` follows setup / unleash, as for Fly / Bounce.
- New tests a fold should add (`tests/spriteOrderPrep65.test.ts`):
  - the `host-words.json` / `check.json` receipts as vectors: the plan text for the 15 bodies, the 7 + 7 lends and the species-free
    decline;
  - the marker arms on the 10291 event (a turn-1 marker with the old moveId comparison never arms);
  - a revert experiment: with `liveMoveAnimation.ts` reverted, the vector test fails.
- The full `npm test` / `npm run build` were not run: there is no committed production change. A fold must run them.

## (4) The Dive ATTACK body adapter (design note, no code)

Stop: `duration: unsupported turn 1` (0..299: 19 commands / 608 frames; the step's 0..999: 64 / 2,048). With the patch, the attack
body's lend is now known: the setup marker resolved through the hidden turn, 7 / 7 above. So the adapter is the remaining piece.

- **Source program** (`battle_anim_scripts.s:9246-9268` DiveAttack, plus `RisingWaterHitEffect` `:1584-1606`):
  - `monbg ANIM_DEF_PARTNER`, `setalpha 12, 8`;
  - the target-side splash (`gDiveWaterSplashSpriteTemplate`, ANIM_TARGET, arg 1);
  - 5 × 2 `AnimSprayWaterDroplet` (ANIM_TARGET, direction arg 1);
  - `delay 12`;
  - RisingWaterHitEffect: `AnimTask_ShakeMon2` on the target, then 9 steps of `gWaterHitSplatSpriteTemplate` + 2
    `gSmallDriftingBubblesSpriteTemplate`, `delay 2` between steps;
  - `visible ANIM_ATTACKER`, `clearmonbg`, `blendoff`.
- **Already ported.** `src/animation/dive.ts` `"attack"` body has:
  - splash, droplets, impacts (matrix 303), bubbles, persistent `hardwareOrder`;
  - `attackerInvisible` (age < 83), `targetInvisible` (13..82), `targetMonbg` (14..86), alpha 12 / 8 (16..82), the target x2 shake
    (from age 30);
  - `targetImpactOffset` (prep25 §B.1a).

  `battleScene.ts:40152` already draws a `move: "DIVE", body: "attack"` config: monbg x2 from age 31, impacts, bubbles. prep25 measured
  the reducer 411 / 411 rows on CHINCHOU / ONIX, both bodies, both orientations; the alternates are exact after the B.1a split.
- **What carries over from the setup adapter** (`liveMoveAnimation.ts` case 291):
  - the non-shiny / status-free gates;
  - `KNOWN_ENTRY_IN_USE_SPRITE_SLOTS` lowest-free;
  - subpriorities 30 / 40;
  - the `AnimSprayWaterDroplet` velocity rule;
  - `withCenter` anchors (spriteCenter / battlePositionCenter / frontIdleRest);
  - words from the presentation host only (now proven recorded, (1)).
- **What the adapter adds:**
  - `liveMoveAnimationDuration` case 291 turn 1 → the measured attack length: 92 rows in all 4 prep25 scenarios, with no species
    dependence observed;
  - an attack `DiveProfile` builder, which is exactly this patch's attack branch of `liveDiveWordsPlanText` (slots from the reducer
    lifetimes; matrices `[0, 3, 4, 5]` per prep25 for pixels);
  - `animationGeometry.targetImpactOffset`;
  - a body-only HUD profile, as `LIVE_FLY_BODY_ONLY_PROFILE`: the staged renderer draws "<species> used" text for the attack body;
  - ending `liveSemiInvulnerableHideBattler`'s hide at the attack body (the reducer's `attackerInvisible` < 83 then shows it).
- **Gate:** `spriteOrderInput.known` (the resolved lend), 56 words, `words.draws` shaped 20 + 9 × 4.
- **Proof a fold needs:** dense windows on the attack body after the patched lend, twice fresh, RAM words pinned through the fixture
  hook.

## Reproduce

    OUT=<fresh dir> REC=<fresh dir> sh tools/integration/prep65Run.sh                 # ~11 min; every receipt `same`
    SKIP_CENSUS=1 ...  (probes + words + patch check only, ~15 s)    SKIP_PROBES=1 ... (reuse $OUT/probe/raw)

Steps:
- `prep61Probe.py <out> --jobs 12 --only DIVE,HIDDENHIT`
- `prep61Extract.py <out> units.json` (sha256 in `units.sha256`)
- `prep65Words.ts <out> units.json host-words.json`
- with the diff applied, `prep65Check.ts <out> units.json check.json`
- `prep61OrderCensus.ts` / `liveShareCensus.ts --seeds=0..299`, base and patched
- `prep43CensusDelta.py`, `prep45Chains.py --cleared "body 291 DIVE"`, `prep65CensusKeys.py`

Reproduction:
- Two fresh SKIP_CENSUS batches (24 runs each, A == B 12 / 12) reproduced `check.json`, `host-words.json`, `units-summary.txt` and
  `units.sha256` byte-identically.
- A third, full run (fresh probes plus the four census runs, then delta / predictor / keys) reproduced **all 11 receipts
  byte-identically**, exited 0, and left src reverted.
- Note: the full run takes ~11 min, longer than a 600 s foreground tool call. Run it in a plain shell, or run `SKIP_CENSUS=1` and the
  census steps separately.
