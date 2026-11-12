# S10A prep61: the semi-invulnerable two-turn units (Fly 19, Bounce 340, Dive 291)

Side lane, evidence only, new files only. Method: prep45 / plans48 / plans51 / plans54. Base: master `395f619dd` (production src tree
`b13260d0`). No tracked file was changed. The production experiment is `tools/integration/fixtures/prep61/prep61-temp-src.diff`, applied
and reverted by `prep61Run.sh`. Receipts are in `tools/integration/fixtures/prep61/`. Every probe was run twice in fresh direct-mGBA
processes; the shared HTTP oracles were never touched.

## Results

**The blocker named in plans51 does not fire on Scene ON routes.**
- `MOVEEND_ATTACKER_INVISIBLE` emits the attacker-hide toggle only under `HITMARKER_NO_ANIMATIONS`, that is, Scene OFF
  (`battle_script_commands.c:4341-4352`).
- With animations on, the setup animation hides the attacker sprite itself. That happens in `FlySetUp`, `BounceSetUp` and `DiveSetUp`
  (`battle_anim_scripts.s:6406`, `:6432`, `:9229`).
- The census agrees. There are **0 `set-battler-sprite-visibility invisible` events in 300 battles**
  (`prep61OrderCensus.ts --events`), so `liveSpriteOrderHost.ts:420`'s "semi-invulnerable battler hidden" invalidation never runs.
  The host's `hidden` flag is never set on these routes, either.
- The real stop is that setup and unleash share one key (`291:<side>`, `19:<side>`, `340:<side>`) and neither has a plan.
  `TWO_TURN_ANIM_MOVE_IDS` (`liveSpriteOrderHost.ts:136`) holds 13 / 76 / 91 / 143 / 280 only.
- **A latent hazard once the key is fixed:** the host would then map a hit animation on the invisible battler to `targetVisible: true`,
  i.e. a blip. The ROM allocates nothing for it.

**Verdicts** (`prep61Check.ts`, prep45Check's per-frame `checkUnit`: the production cursor applies the plan prefix through every
allocation window, and created / destroyed / F must equal the ROM):

| unit (host key) | verdict | plan | ROM instances (exact / total), allocation frames | species |
|---|---|---|---|---|
| Fly setup `19:*` | **EXACT**, both sides | `Cf;D0` | 14 / 14, 28 | SWELLOW 305, PIDGEOT 18 |
| Fly unleash `10019:*` | **EXACT**, both sides | `Cf;Cf;D0;D1` | 12 / 12, 48 | SWELLOW, PIDGEOT |
| Bounce setup `340:*` | **EXACT**, both sides | `Cf;D0` | 15 / 15, 30 | PONYTA 77, RAPIDASH 78 |
| Bounce unleash `10340:*` | **EXACT per side (side-keyed)** | player `Cf;Cf;D0;D1`, opponent `Cf;Cf;D1;D0` | 12 / 12, 48 | PONYTA, RAPIDASH |
| Dive setup `291:*` | **WORDS-KEYED**, reducer-computable | `Cf;D0;Cfffffffffff;D1;D<10 droplets in words order>` | 8 / 8 by `dive.ts` + RAM words, 15 distinct ROM plans in 15 bodies | CHINCHOU 170, LANTURN 171 |
| Dive unleash `10291:*` | **WORDS-KEYED**, reducer-computable | 10 multi-sprite destroy groups | 7 / 7 bodies, 70 / 70 groups by `dive.ts` + RAM words; setup → unleash lend carry 7 / 7 | CHINCHOU, LANTURN |

**Census, seeds 0..299** (temporary patch for Fly / Bounce plus the hidden-battler handling; Dive is still unplanned, see below).
- Identical command sequence: 7970 commands, 0 pairing mismatches.
- Identical battle digest `79313389…e642`.
- **0 live → fallback regressions.**

| | live by count | live by frames |
|---|---|---|
| `395f619dd` | 7710 / 7970 = 96.74 % | 1144356 = 97.96 % |
| prep61 patch | **7721 = 96.88 % (+11)** | **1145747 = 98.08 % (+1391)** |

Gains by first stop:

| first stop (before) | gained |
|---|---|
| `body 19:player` | Sky Uppercut hitting the hidden Fly user, 2 commands / 376 frames |
| `body 340:player` / `340:opponent` | Pursuit 103 and Mud-Slap 51, 2 / 154 |
| `sprite allocator history unknown` | 7 Protect bodies / 861 (battles 103, 286). The order host now stays known through the Fly / Bounce units, so the allocator host re-seeds at the next send-out. These are not order declines, so the chain predictor does not count them. |

Chain predictor (`prep45Chains.py --cleared "body 19 FLY|body 340 BOUNCE" --after`):
- predicted 3 commands / 427 frames;
- measured predicted & live 3 / 427, predicted & not live 0;
- not predicted & live: 1 / 103, the battle 179 Pursuit. Its before-chain lists `TURN_TRAP (wrapped FIRE SPIN)`. That is an artefact of
  prep45OrderCensus.ts's shadow copy of `orderEventOf`, which predates the TURN_TRAP kind keys. Production maps it to the planned
  `TURN_TRAP_FIRE_SPIN` (index 208), and the patched host stays known through it.

**Dive is the largest stop and still not landed.** In the census it is greedy gain 5013 and first unit of 34 declines / 5249 frames:
- 23 declines / 3167 frames behind `body 291:opponent`, 9 / 1846 behind `body 291:player`;
- consumers: Dig 8, Dive setup 11, Double Team 9, Silver Wind 3, Mud-Slap 1.

Its order is now proven to be a function of RAM-read words through the accepted reducer (below). The words57 / words59 deferred lend
does **not** cover it yet; see "Dive and the deferred words lend".

## (1) Ranking (`395f619dd`, seeds 0..299)

`prep61OrderCensus.ts` is prep45OrderCensus.ts verbatim, plus `--events`: every semantic event the production order host consumed, with
the host state after its step. Its report is byte-identical to prep45's. `prep61Rank.py` reads the event log. Receipts:
`rank-before-seeds0-299.json`, `chains-before-seeds0-299.json`.

- **93 declines / 13267 frames**, chain lengths 1:47, 2:12, 3:9, 4:21, 5:4.
- Greedy gain:

  | unit | gain |
  |---|---:|
  | Dive | 5013 |
  | SUBSTITUTE_FADE | 1487 |
  | Dream Eater | 1220 (shadow artefact, plans51) |
  | Shock Wave | 693 |
  | Fly | 376 |
  | Ice Ball | 152 |
  | HAIL_CONTINUES | 152 |
  | Mud-Slap | 102 |
  | Hail | 2033 |
  | WHIRLPOOL | 510 |
  | Bounce | 51 |
  | FIRE_SPIN | 103 |

- Bodies: 87. Dive 24 setups / 19 unleashes, Fly 12 / 11, Bounce 11 / 10. At base, **every one of them starts on an unknown host**.
- Setup → unleash windows (43). The host-consumed allocation events between the bodies:

  | move | windows | between setup and unleash |
  |---|---|---|
  | Dive | 21 | nothing 12; the other battler's status animation 3; its Safeguard 2; its HELD_ITEM_EFFECT 1, plus a status animation 1; no unleash (KO / switch) 2 |
  | Fly | 12 | nothing 8; status animation 2; **Sky Uppercut hitting the hidden user + `HIT_ANIMATION` on it** 1; no unleash 1 |
  | Bounce | 10 | nothing 5; INGRAIN_HEAL 1; TURN_TRAP 2; Safeguard 1; Light Screen + `WEATHER_VAR` (sandstorm) + **`HIT_ANIMATION` on the hidden user** 1 |

- Declines by chain (consumer: commands / frames):
  - `body 291:opponent` 23 / 3167: Dig 8 / 1052, Dive 9 / 1025, Silver Wind 3 / 579, Double Team 2 / 460, Mud-Slap 1 / 51.
  - `body 291:player` 9 / 1846: Double Team 7 / 1610, Dive 2 / 236.
  - `body 19:player` 2 / 376: Sky Uppercut.
  - `body 291:player > Rain Dance > RAIN_CONTINUES` 2 / 236.
  - `body 340:player > TURN_TRAP (FIRE SPIN)` 1 / 103: Pursuit.
  - `body 340:opponent` 1 / 51: Mud-Slap. Plus 1 / 58 inside a 5-unit Ice Ball chain.

## (2) ROM evidence

`prep61Probe.py`:
- Direct mGBA. 26 jobs, each run twice in fresh processes with an explicit lab seed. **All 26 A == B.** A second full run
  (`prep61Run.sh`, 52 more runs) reproduced every receipt byte-identically.
- The probe is `prep61EventProbe.py`: spriteOrderEventProbe.py's rows (same schema) plus a per-frame `extra` list. It holds
  `gAnimMoveTurn`, the battler sprites' `invisible` bits, the `gStatuses3` semi-invulnerable bits and `gRng2Value`.
- `prep61Extract.py` keys a body with `gAnimMoveTurn & 1` as `10000 + move`.

| jobs | stagings |
|---|---|
| FLY (6) | `prep11-fly-alt-swellow` (seed 305419897): SWELLOW and PIDGEOT attackers; opponent side by swapping the parties; Gust 16 from the defender |
| BOUNCE (6) | `prep11-bounce-alt-ponyta` (seed 305419896): PONYTA and RAPIDASH; swap; Gust |
| DIVE (6) | `mechanic-dive-*-chinchou-*-onix`, `prep25-dive-alt-*-lanturn-golem` (seed 305420547): both sides; Surf 57 from the defender |
| HIDDENHIT (6) | moves that hit a semi-invulnerable target and have a production plan: Sky Uppercut 327 vs Fly, Twister 239 vs Bounce, Whirlpool 250 vs Dive, both sides |
| WEATHERHIT (2) | Sandstorm 201 from the defender (ONIX, Rock: immune) vs the Fly user, both sides: the end-turn sandstorm damage hits the hidden Fly user |

**What happens to the hidden battler (RAM).**
- The attacker's `invisible` bit is set inside the setup body: for example, SWELLOW f2064 (setup body start f2057).
- It stays set across the turn gap.
- It clears inside the unleash body: FlyUnleash shows the attacker while the ball strikes. DiveAttack ends with `visible ANIM_ATTACKER`.
- `STATUS3_SEMI_INVULNERABLE` is set after the setup's `attackanimation` and cleared before the unleash's.
- The hide toggles no sprite allocation.

**The hidden window** (`check.json` `hiddenWindow`; every allocation window between the setup body's end and the unleash body's start):

| hidden battler | ROM allocation windows |
|---|---|
| player | none, unless the opponent's attack hits it |
| opponent | the player's action-prompt pair only (`Cff;D0,1`; after Dive's setup `Cff;D1,0`, as sSpriteOrder orders it) |

- **The player-side two-turn user has no prompt in its locked turn.** The host already handles this (`retained locked-action continuation`).
  The census shows no `command resolution without an action prompt` in any Fly / Bounce / Dive chain.
- Attack bodies on the hidden battler: the other battler's body plan is unchanged by the target's invisibility.

  | body | result |
  |---|---|
  | Sky Uppercut `327:player` / `327:opponent` | production table plan, 1 / 1 exact per side |
  | Sandstorm `201:*` and the end-turn `SANDSTORM_CONTINUES` | table plans, 1 / 1 per side and 2 / 2 exact |
  | Whirlpool `250:opponent` | table plan, 1 / 1 exact |
  | Surf `57:opponent` | table plan `""`, 1 / 1 exact |
  | Gust 16 | no table plan; ROM `Cf;D0;Cf;D1` on both sides |
  | Twister 239 | no table plan; 2 ROM plans on the player side, words-dependent |

- **The hit animation on the invisible battler allocates nothing: 12 / 12 hits** (4 Gust, 2 Sky Uppercut, 2 Twister, 1 Whirlpool, 1 Surf,
  2 sandstorm end-turn damage), and
  the RAM `invisible` bit was set at every one of them.
  - Source: `PlayerHandleHitAnimation` / `OpponentHandleHitAnimation` complete at once when
    `gSprites[gBattlerSpriteIds[b]].invisible` is set (`battle_controller_player.c:2862-2866`, `battle_controller_opponent.c:1804-1808`),
    so `DoHitAnimHealthboxEffect` never runs and there is no blip.
  - The transform currently refuses this case: `spriteOrderEventTransform.ts:445-447`, "hit-animation on a hidden target (unproven)".

### The skip rules while hidden (source, and the kernel's port)

1. **`Cmd_playanimation`** (`battle_script_commands.c:4004-4043`) has five ordered branches.
   - (1) STATS_CHANGE / SNATCH_MOVE / SUBSTITUTE_FADE always emit.
   - (2) `HITMARKER_NO_ANIMATIONS` skips (Scene OFF).
   - (3) RAIN / SUN / SANDSTORM / HAIL_CONTINUES emit even for a semi-invulnerable battler.
   - (4) **every other table animation of a `STATUS3_SEMI_INVULNERABLE` battler is skipped**: HELD_ITEM_EFFECT, INGRAIN_HEAL, TURN_TRAP,
     LEECH_SEED_DRAIN, ... on the hidden battler.
   - (5) else emit.

   The kernel ports all five: `battleScriptStatbuffchangeOpcode.ts:163-190`, with branch 4 at `:378-382`. So a skipped animation has no
   event, and the host never sees it.
2. **Status animations** (`Cmd_statusanimation` and the related opcodes) are suppressed for a semi-invulnerable battler, a substitute or
   `NO_ANIMATIONS`. Kernel: `prepareRulesStatusAnimation`, `battleScriptRulesContext.ts:2915`.
3. **An attack that misses the hidden battler** has no animation event: accuracy fails, then `MOVE_RESULT_MISSED`, then
   `Cmd_attackanimation` and `Cmd_hitanimation` skip (`battle_script_commands.c:1765`, `:5562`). ROM: Tackle into Fly / Bounce / Dive,
   no allocation.
4. **An attack that hits it** plays its own body normally (with its table plan) and then `HIT_ANIMATION` on the hidden battler. That hit
   **allocates nothing** (above).
   - The moves are Gust / Twister / Thunder / Sky Uppercut vs ON_AIR, Surf / Whirlpool vs UNDERWATER, Earthquake / Magnitude vs
     UNDERGROUND.
   - The same rule covers end-turn sandstorm / hail damage on a hidden Fly / Bounce user. `Cmd_weatherdamage` exempts only
     UNDERGROUND / UNDERWATER (`battle_script_commands.c:7608-7631`), and `BattleScript_DamagingWeatherContinues` then runs
     `hitanimation BS_ATTACKER` (`battle_scripts_1.s:3213`). Census battle 179 has `WEATHER_VAR` 12 (SANDSTORM_CONTINUES) then
     `HIT_ANIMATION` on the hidden player. ROM (WEATHERHIT, both sides): no blip, and SANDSTORM_CONTINUES matches its table plan.
5. **The setup hides and the unleash reveals.** Both happen inside the bodies, with no event of their own in Scene ON. In Scene OFF
   (`NO_ANIMATIONS`) `MOVEEND_ATTACKER_INVISIBLE` emits the hide; it is not a Scene ON concern. A failed or blocked unleash (Protect,
   paralysis) gets the `MOVEEND_ATTACKER_VISIBLE` show toggle (`:4353-4367`), which allocates nothing. The host already clears `hidden`
   on it without invalidating.

### Dive: RAM-read words (prep46 method) and the reducer

`prep61DiveWords.ts` (receipt `dive-words.json`):
- **Words:** for each body, the Random2 words drawn on the droplet-birth frame. They are the LCG steps between the probe's consecutive
  `gRng2Value` samples.
  - Setup: 21 draws on that frame; the droplets' 20 are **the last 20** (one other draw comes first, as prep25 found).
  - Attack: the last 20 at age 16, then the last 4 at each impact age 30 + 4k.
- **Model:** the accepted reducer `src/animation/dive.ts` `diveAtAge`, using its persistent `hardwareOrder`.
  - Profile: the live adapter's `liveDiveSetupProfile` rule (`liveMoveAnimation.ts:185-205`, velocities from words 2i / 2i+1). For the
    attack, prep25DiveReducerCheck's bubble rule.
  - Inputs: the ROM's slots and the ROM lend, plus `liveBattlerAnchors` geometry of the staged species. Attack impact anchor: target
    Y_PIC_OFFSET y − 8 for a player target, − 2 for an opponent target.
- **Setup: 8 / 8 bodies.** The droplet destroy group equals the reducer's hardware order at the age before it, and the whole plan text
  equals the ROM's. The control, another body's words, differs in 8 / 8.
- **Attack: 7 / 7 bodies, 70 / 70 multi-destroy groups exact.**
- **Carry: 7 / 7.** Start from the setup body's ROM lend and apply the words-predicted setup plan (production cursor). Then apply the
  hidden window's units through the production transform: the prompt cycle (opponent side), Surf / Whirlpool bodies, and the hit on the
  hidden battler as a no-op. The result **equals the ROM lend of the unleash body** on all 7 setup → unleash pairs.
- So Dive's order is **WORDS-KEYED and computable by the existing reducer**. No new source model is needed.

### Dive and the deferred words lend (words57 / words59)

The machinery fits, but three Dive-specific pieces are missing:
- `WORDS_ORDER_UNIT_MOVE_IDS = [28, 189, 240]` (`wordsOrderUnits.ts:10`). A marker of one of these lends `{ known, free: [], deferred }`
  to any consumer.
- `liveWordsOrderDeferredCarry` / `liveWordsUnitPostFree` (`liveMoveAnimation.ts:1432-1446`, `:4140`) carry only dirt (28 / 189) and
  rain (240 / RAIN_CONTINUES).

The fold needs:
1. 291 (setup) and 10291 (unleash) as words-order units.
2. A Dive branch in `liveWordsUnitPostFree`: `diveAtAge` with the body's recorded words, the plan structure above, and the post-body free
   order. This is `prep61DiveWords.ts`'s `predict`.
3. The presentation host recording the unleash body's words. The Dive attack adapter declines (`liveMoveAnimation.ts` `case 291` returns
   null for turn 1), so check that its 20 + 36 draws are recorded by key. Not verified here.

The replay of the hidden-window units works without Dive-specific code once the Fly / Bounce patch's rules are in: the prompt pair, the
other battler's planned bodies, and the hidden-target hit as a no-op.

## (3) Patch shape (`fixtures/prep61/prep61-temp-src.diff`, 87 lines)

1. `src/engine/liveSpriteOrderHost.ts`
   - `:136`: `TWO_TURN_ANIM_MOVE_IDS` gains 19, 291, 340, so the unleash keys are 10019 / 10291 / 10340.
   - New `SEMI_INVULNERABLE_SETUP_MOVE_IDS` = {19, 291, 340}. In `orderEventOf`'s MOVE_ANIMATION branch (`:376`), the event also returns
     `hidden` with the attacker's flag set to `(turn & 1) === 0`: the setup hides, the unleash reveals.
   - `HIT_ANIMATION` (`:379`) then reads `targetVisible: false` for the hidden battler.
   - A `faint-animation` / `switch-in-animation` of a hidden battler invalidates ("unprobed"; the battler check at the top of `orderEventOf`).
2. `src/engine/spriteOrderEventTransform.ts:445-447`: `hit-animation` with `targetVisible: false` returns the tracker unchanged (no
   allocation) instead of invalidating.
3. `tools/integration/spriteOrderProductionTable.ts:159-160`: append `fixture("prep61/plan-rows.json")` after plans54, then regenerate
   `spriteOrderProductionPlans.ts`.
   - Bodies 535 → 543: 19 / 10019 / 340 / 10340 × 2 sides.
   - **0 new plan texts** (all four already exist). No base index moves.
   - `plan-rows.json` comes from `prep61PlanRows.ts`. Rows require exact == instances, at least 2 jobs, and both sides.
4. The patch needs no new event payload and no orchestrator change, so no Scene ON/OFF parity route.

**Corpus replay** (`prep61CorpusReplay.ts`: spriteOrderCrossBodyCorpusReplay with 19 / 291 / 340 turn-keyed by occurrence parity, as
Dig is):

| | known | exact | mismatched |
|---|---:|---:|---:|
| base | 1173 | 1173 | 0 |
| patch | **1181** | 1181 | 0 |

With the unmodified replay, the patch shows 1 mismatch (`340-mechanic-bounce-player-spoink-onix-0.json` unit 9), because that replay
feeds the unleash the setup key.

**Tests a fold must move / add.** Under the patch, 33 related test files pass (1419 tests). Only `tests/spriteOrderEventTransform.test.ts`
has 5 pin moves:

| line | test | change |
|---|---|---|
| `:31` | regenerates byte-identically | 535 bodies → 543 |
| `:35-49` | decodes every EXACT-PLAN body | add `...fixture("prep61/plan-rows.json").bodies` to `extra` (`:42`): the ext table's `19:*` / `340:*` are non-EXACT |
| `:101-` | refuses everything the evidence does not model | `{ kind: "hit-animation", targetVisible: false }` is now known (no-op): move it to a "known, no allocation" assertion |
| `:268` | plans48 | `expect(spriteOrderProductionBodyPlan(19, "player")).toBeNull()` → the prep61 plan |
| `:341-344` | strict corpus replay | turn-key 19 / 291 / 340 in `spriteOrderCrossBodyCorpusReplay.ts` (`:55` `hostMoveId`, `:105`), then known 1173 → 1181, laterKnown 619 → 627, mismatched 0 |

New tests to add (`tests/spriteOrderPrep61.test.ts`):
- Receipts A == B, and per-frame exact for every `PREP61_PLANS` label.
- Each row == the production text.
- The host keys turn 1 as 10019 / 10340, `hidden` follows setup / unleash, and the hidden hit is a no-op.
- A hidden battler's faint invalidates.
- No `291` / `10291` row.

## Not reached / open

- **Dive production**: the words-unit carry (above) and the attack-body words recording. The evidence and predictor are here; the fold is
  the integration lane's.
- Not probed: hail on a hidden battler (`General_Hail` targets visible battlers; the patched host keeps HAIL_CONTINUES / Hail
  unplanned while a battler is hidden: `bothBattlersShown`), Thunder / Earthquake on hidden targets, and a hidden battler fainting or
  being forced out. The patch invalidates the last case.
- Gust 16 and Twister 239 have no production plan. Gust `Cf;D0;Cf;D1` is constant on both sides over 4 instances. Twister is
  words-dependent.

## Reproduce

    OUT=<fresh dir> REC=<fresh dir> sh tools/integration/prep61Run.sh        # ~7 min; every receipt `same`
    SKIP_PROBES=1 ... (reuse $OUT/probe/raw)   SKIP_CENSUS=1 ... (no census / chain / rank / delta)

Individual steps:
- `prep61Probe.py <out> --jobs 12`
- `prep61Extract.py <out> units.json`
- `prep61Check.ts units.json check.json`
- `prep61PlanRows.ts check.json plan-rows.json`
- `prep61DiveWords.ts <out> units.json dive-words.json`
- `prep61CorpusReplay.ts --turn-keyed`
- `prep61OrderCensus.ts --seeds=0..299 --out --commands --events`
- `prep61Rank.py events.jsonl commands.jsonl rank.json`
- `prep45Chains.py`, `prep43CensusDelta.py` (as in prep45Run.sh)
