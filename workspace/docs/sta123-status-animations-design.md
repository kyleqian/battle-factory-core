# sta123 (S10A prep pack): the Scene ON status-condition animations (B_ANIM_STATUS_*) — ROM rows, source table, consumer map, slice plan

Evidence only. **No production change**, no existing file edited (new files: this doc, `tools/integration/sta123{Stage,Rom}.py`,
`sta123Exposure.ts`, `sta123ExposureSummary.py`, `sta123Run.sh`, `tools/integration/fixtures/sta123/`). FIXED base master `2d70bafd9`
(production src `14e1274cc`). Note: off121's Scene OFF `status` rule (merge `5c0e3564f`) is **not** an ancestor of this base; it is
quoted below, not assumed. Direct mGBA only (`tools/integration/idle94Probe.py`, the base's own probe), explicit lab seeds, every probe job
twice in fresh processes: **36 / 36 outputs r1 == r2** (18 scenarios x ON / OFF), ROM receipt r1 == r2. Shape copied from
docs/stat101-stats-change-design.md (which landed as sc106 / scd112 / scf117).

## 1. Results first

ROM, Scene ON: `statusanimation` / `status2animation` / `chosenstatusanimation` (the `chosenstatus2animation` macro) execute and advance in
**1 row**; the controller then plays the B_ANIM_STATUS_* script while gBattleControllerExecFlags stays set, so the **next instruction holds
for exactly `controllerRows`**. Scene OFF: the same instruction is 1 row with **0 controller rows** on all 54 OFF occurrences
(HITMARKER_NO_ANIMATIONS: nothing is emitted). Gameplay is identical in both scenes (54 ON / 54 OFF occurrences, same labels).

| B_ANIM_STATUS_* | script (battle_anim_scripts.s) | **controller rows ON** (= hold of the next instruction) | gAnimScriptActive rows (first .. last) | OFF | measured paths (both sides each) | Random / Random2 (D3) | census 0..999 (ON kernel receipts) | ROM rows x census |
|---|---|---|---|---|---|---|---|---|
| PSN (0) | Status_Poison | **71** | 70 (0..69) | 1 row, 0 | move-inflicted (Toxic), end-turn toxic tick x2 | 0 | **1,126** (182 battles) | 79,946 |
| CONFUSION (1) | Status_Confusion | **100** | 99 (0..98) | 1, 0 | move-inflicted (Confuse Ray, chosenstatus2animation), confusion self-check x2 | 0 | **2,404** (377) | 240,400 |
| BRN (2) | Status_Burn | **39** | 38 (0..37) | 1, 0 | move-inflicted (Will-O-Wisp), end-turn burn tick x2 | 0 | **454** (86) | 17,706 |
| INFATUATION (3) | Status_Infatuation | **97** | 96 (0..95) | 1, 0 | in-love check x2 (Attract itself plays none) | 0 | **801** (71) | 77,697 |
| SLP (4) | Status_Sleep | **97** | 96 (0..95) | 1, 0 | move-inflicted (Spore, Hypnosis), sleep turns x3..7 | 0 | **1,903** (235) | 184,591 |
| PRZ (5) | Status_Paralysis | **39** | 38 (0..37) | 1, 0 | move-inflicted (Thunder Wave), can't move | 0 | **1,169** (348) | 45,591 |
| FRZ (6) | Status_Freeze | **117** frozen turn; **133 / 134** after Ice Beam | 116 (0..115) frozen turn; **115 (17..131 / 18..132)** after Ice Beam | 1, 0 | move-inflicted (Ice Beam 10%, audit seed), frozen turns | 0 | **147** (37) | ~17,900 |
| CURSED (7) | Status_Curse | **75** | 74 (0..73) | 1, 0 | end-turn curse tick x2 (Ghost Curse itself plays none) | 0 | **21** (6) | 1,575 |
| NIGHTMARE (8) | Status_Nightmare | **75** | 74 (0..73) | 1, 0 | end-turn nightmare tick x1..3 | 0 | **55** (10) | 4,125 |
| (WRAPPED 9) | none (table has 9 entries) | — | — | — | Wrap / Bind use `playanimation B_ANIM_TURN_TRAP` instead | — | 0 | — |

- **Production today draws none of them and holds none of these rows** in either scene: no presentation command is projected from the kernel's
  `status-animation` receipt (§3). Census 0..999 (Scene ON production kernel, 1,000 battles, 997 terminal + 3 frame-budget stalls): **8,080
  status animations, ~669,000 ROM rows** (~3.1 hours at 60 Hz over the 1,000 battles) not presented; per path in §2c. The only stand-in is the 32-frame `status`
  command on `set-battler-status-data` (status1 writes: move-inflicted PSN / BRN / PRZ / SLP / FRZ and sleep / frozen turns); every status2
  animation (CONFUSION / INFATUATION / CURSED / NIGHTMARE = 3,281, 41 %) and every end-turn PSN / BRN tick and paralysis "can't move" gets
  nothing.
- **New ROM facts** beyond off121 (which measured PSN 71 / PRZ 39 / BRN 39 / SLP 97): CONFUSION **100**, INFATUATION **97**, CURSED **75**,
  NIGHTMARE **75**, FRZ **117**; and the **controller's IsBattleSEPlaying gate**: after a damaging move (Ice Beam) the controller waits
  **17 (opponent target) / 18 (player target) rows** before LaunchStatusAnimation (`firstActive`), capped at 29 by source
  (`battle_gfx_sfx_util.c:554-571`: `soundTimer < 30`, then the SE is stopped). After every status move measured (Toxic, Will-O-Wisp, Thunder
  Wave, Spore, Hypnosis, Confuse Ray) and on every turn-start / end-turn path the gate is 0. FRZ's own active length is 115 after Ice Beam vs
  116 on frozen turns (also in the sprite audit: "lifetime 115, 116 in 2nd / 3rd windows").
- **D3: zero.** No B_ANIM_STATUS_* script, task or sprite callback calls Random / Random2 (§2a: AnimBurnFlame -> AnimTravelDiagonally,
  AnimMagentaHeart, AnimSleepLetterZ(_Step), AnimElectricity, AnimGhostStatusSprite(_Step), AnimConfusionDuck(_Step),
  AnimTask_FrozenIceCube(_Step1..3), AnimTask_ShakeMon2(_Step), AnimTask_BlendColorCycle(Loop)). No presentation-RNG plan is needed.
- Constant per animation on every non-gated path and both sides: **controllerRows = activeRows + 1** (one trailing row: Task_DoStatusAnimation
  clears statusAnimActive, CompleteOnFinishedStatusAnimation releases the controller the next row). So a production command can be one constant
  per animation plus the SE gate rows.

## 2. Source table

### 2a. Animations and components

| B_ANIM | script components (battle_anim_scripts.s) | sprites (create +frame / destroy, the sprite audit) | production components that already exist |
|---|---|---|---|
| PSN | `loopsewithpan SE_M_TOXIC`; `AnimTask_ShakeMon2` (ATTACKER, 1, 0, 18, 2); `blend_color_cycle` F_PAL_ATTACKER delay 2, 2 blends, 0 -> 12, RGB(30, 0, 31) | none (task-only) | `src/animation/shakeMon2.ts`, `src/animation/blendColorCycle.ts` (both proven in move bodies) |
| CONFUSION | `call ConfusionEffect`: `loopsewithpan SE_M_DIZZY_PUNCH`; 5 x `create_confusion_duck_sprite` (x 0, y -15, wave offsets 0 / 51 / 102 / 153 / 204, period 3, duration 90) | 5 x gConfusionDuckSpriteTemplate +3 / all at +92 | duck art (ANIM_TAG_DUCK) via `src/animation/dizzyPunch.ts` / `assets/dizzyPunch.json`; the AnimConfusionDuck wave motion is **new** |
| BRN | 3 x `BurnFlame` (gBurnFlameSpriteTemplate, ANIM_TARGET, -24, 24, 24, 24, 20, 1, 1; delay 4); `waitforvisualfinish` | +3 / +9 / +15, destroyed +26 / +32 / +38 | `firePunchBurnFlames` (`src/animation/firePunch.ts:453-481`: "Status_Burn's three gBurnFlameSpriteTemplate sprites"), small-ember asset |
| INFATUATION | 3 x gMagentaHeartSpriteTemplate (ATTACKER: 0 / -20 / 20, 20), delay 15, SE_M_CHARM | +3 / +20 / +37, destroyed +62 / +79 / +96 | magenta heart in `src/animation/charm.ts` / `attract.ts` (AnimMagentaHeart, Move_CHARM / COVET) |
| SLP | 2 x gSleepLetterZSpriteTemplate (4, -10, 16, 0, 0), delay 30, SE_M_SNORE | +3 / +35, destroyed +64 / +96 | letter Z in `src/animation/rest.ts` / `sleepTalk.ts` (Move_REST uses the same template) |
| PRZ | `AnimTask_ShakeMon2` (ATTACKER, 1, 0, 10, 1); `call ElectricityEffect` (8 x gElectricitySpriteTemplate, delay 2) | 8 sparks +3..+31 / +10..+38 | **`src/animation/statusAnimation.ts` (kind "paralysis": Status_Paralysis, canonical Thunder Wave fixture only)**, `spark.ts` (ElectricityEffect), spark-2 asset |
| FRZ | SE_M_ICY_WIND; `monbg ANIM_DEF_PARTNER`; `splitbgprio`; `waitplaysewithpan SE_M_HAIL, 17`; `AnimTask_FrozenIceCube`; `clearmonbg` | sFrozenIceCubeSpriteTemplate +6 / +109 | `src/animation/frozenIceCube.ts` (Move_SHEER_COLD uses the same task), ice-cube asset |
| CURSED | `monbg ANIM_DEF_PARTNER`; gCurseGhostSpriteTemplate (AnimGhostStatusSprite); `AnimTask_ShakeMon2` (TARGET, 2, 0, 14, 1); `clearmonbg` | +6 / +47 | ghost sprite captured in `src/animation/curse.ts` / `assets/curse.json` (Move_CURSE's ghost branch, same template) |
| NIGHTMARE | as CURSED with gNightmareDevilSpriteTemplate | +6 / +47 | devil art (ANIM_TAG_DEVIL) in `src/animation/lovelyKiss.ts`; AnimGhostStatusSprite motion **new** (shared with CURSED) |

Sprite / palette / free-order streams of all nine (both sides, twice fresh) are already in docs/status-animation-sprite-audit.md; this pack
does not re-measure them.

### 2b. Controller path (both sides identical)

`Cmd_statusanimation` / `Cmd_status2animation` / `Cmd_chosenstatusanimation` (`battle_script_commands.c:5753-5805`): wait for
gBattleControllerExecFlags == 0; **skip** when the battler is semi-invulnerable, behind a Substitute, or **HITMARKER_NO_ANIMATIONS (Scene OFF)**;
else `BtlController_EmitStatusAnimation(isStatus2, status)` + MarkBattlerForControllerExec; advance 2 / 6 / 7. Player / Opponent
`HandleStatusAnimation` (`battle_controller_player.c:2768`): **waits while `IsBattleSEPlaying`** (max 29 rows), then
`InitAndLaunchChosenStatusAnimation` (`battle_gfx_sfx_util.c:421-454`: status1 FRZ, PSN / TOX, BRN, SLP, PRZ; status2 INFATUATION, CONFUSION,
CURSED, NIGHTMARE, WRAPPED in that priority) -> `LaunchStatusAnimation` (`battle_anim_status_effects.c:543`: attacker = target = battler) ->
`Task_DoStatusAnimation` until gAnimScriptActive clears -> statusAnimActive 0 -> `CompleteOnFinishedStatusAnimation` -> BufferExecCompleted.
Production already mirrors the kernel half: `battleScriptRulesContext.ts:2915-2919` suppresses on the same three conditions, and the
priority order is `spriteOrderStatusAnimationName` (`spriteOrderEventTransform.ts:226-241`).

### 2c. Every kernel path that plays one (battle_scripts_1.s) and its census count

| path (script label, line) | opcode | animation | census 0..999 |
|---|---|---|---|
| move / ability infliction: MoveEffectSleep 3869, Poison 3887, Burn 3893, Freeze 3899, Paralysis 3905, Toxic 3916 (also reached by Synchronize / Poison Point / Effect Spore / Static / Flame Body: the "...BY" strings) | statusanimation BS_EFFECT_BATTLER, then the print | SLP / PSN / BRN / FRZ / PRZ / PSN | PSN 261, BRN 97, PRZ 506, SLP 402, FRZ 43 |
| MoveEffectConfusion 3932 (Confuse Ray, Supersonic, Swagger, Flatter, Psybeam ... secondary) | chosenstatus2animation, then the print | CONFUSION | 789 |
| ThrashConfuses 3790 (Thrash / Outrage / Petal Dance fatigue) | chosenstatus2animation | CONFUSION | 51 |
| CuteCharmActivates 4193 | status2animation | INFATUATION | 5 |
| YawnMakesAsleep 3878 | statusanimation, then the print | SLP | (inside SLP "inflicted") |
| MoveUsedIsAsleep 3717 (+ Snore / Sleep Talk 1267 / 1320) | print, waitmessage, statusanimation | SLP | 1,501 |
| MoveUsedIsFrozen 3755 | print, waitmessage, statusanimation | FRZ | 104 |
| MoveUsedIsParalyzed 3773 ("can't move") | print, waitmessage, statusanimation | PRZ | 663 |
| MoveUsedIsConfused 3796 (every confused turn, hit or not) | print, waitmessage, status2animation | CONFUSION | 1,564 |
| MoveUsedIsInLove 3840 (every infatuated turn) | print, waitmessage, status2animation | INFATUATION | 796 |
| PoisonTurnDmg 3736 / BurnTurnDmg 3750 -> DoStatusTurnDmg 3739 | print, waitmessage, statusanimation | PSN / BRN | 865 / 357 |
| CurseTurnDmg 3857 | print, waitmessage, status2animation | CURSED | 21 |
| NightmareTurnDmg 3851 | print, waitmessage, status2animation | NIGHTMARE | 55 |
| none: Attract (tryinfatuating), Ghost Curse (cursetarget), Nightmare (seteffectprimary NIGHTMARE), Rest (trysetrest), faint, cures, wake-up / thaw | — | — | — |

Census sides: player 3,915 / opponent 4,165 (`exposure.json` `byAnimationAndSide`). Path = the message right after the receipt when it is
that animation's own infliction message, else the message right before it; all 8,080 classify (0 unclassified).

## 3. Production consumer map (base 2d70bafd9)

| layer | file:line | today | needed |
|---|---|---|---|
| kernel receipt | `battleScriptEvents.ts:246-251` (`status-animation`: battler, isStatus2, status); emitted by `battleScriptMachine.ts:742` from `battleScriptRulesContext.ts:2915-2941` | exact, suppressed in Scene OFF / Substitute / semi-invulnerable | nothing (already ROM-exact) |
| presentation command | `battleResolutionPresentation.ts` (no `status-animation` case); `status` command at `:3775-3786`, `STATUS_TIMING` 32 at `:795` | **no command**; 32-frame `status` stand-in on status1 writes only | a `status-animation` command (battler, animation, `minimumFrames` = controller rows); the `status` write itself draws nothing in ON either (off121's OFF rule shape) |
| render / clock | `battleResolutionPresentationRender.ts:845` (`status` is invisible logical state), `:1054` (duration), `:1562-1590` (effects); model = `stats-change` (`:573`, `:1070-1072`, `:1562`) | nothing drawn | a `status-animation` render effect (age, battler, animation) -> per-animation visual |
| field renderer | `battleScene.ts:51113`, `:51175` draw `view.statusAnimation` (battler offset + sparks) for the canonical Thunder Wave fixture only (`sceneOnPresentation.ts:12565-12575`, `statusOutcome === "paralysis"`) | canonical only | generalise to the live field (both sides, all nine) |
| sprite order | `liveSpriteOrderHost.ts:475-477` -> `spriteOrderEventTransform.ts:453-455` with `SPRITE_ORDER_PRODUCTION_ANIMS.STATUS_*` (`spriteOrderProductionPlans.ts:322-330`) | already applies the audited streams | none (verify unchanged) |
| sprite allocator | `liveMoveSpriteAllocator.ts:97-99` (all nine net-zero) | already net-zero | none |
| palette host | `factoryRoundBattleOrchestrator.ts:2376-2380` (`crossedUnknownGraphics` -> `invalidateLiveMovePaletteHost`) | invalidates on every status animation | optional: the audited bank-7 stale-palette record instead of invalidation (sprite audit §Palette) |
| battler x2 | `liveBattlerX2History.ts:199-201` (`unknown`) | unknown | ShakeMon2 offsets for PSN / PRZ (attacker) and CURSED / NIGHTMARE (target = battler) if a consumer needs them |
| presentation RNG | — | — | none (D3 = 0) |

## 4. Row model (what a production command must reproduce)

Per status animation at ROM row X (the instruction's row): Scene ON, the next instruction executes on **X + 1 + gate + active + 1** where
gate = IsBattleSEPlaying rows (0 on every status-move / turn-start / end-turn path measured; 17 / 18 after Ice Beam), active = the table's
gAnimScriptActive rows; Scene OFF on X + 1. Production commands start `instructionExecution + lead` after their anchor (off108 / idle98), so
the command's added frames are **controllerRows = gate + active + 1**: PSN 71, BRN 39, PRZ 39, SLP 97, CONFUSION 100, INFATUATION 97, CURSED
75, NIGHTMARE 75, FRZ 117 (+ gate). Exactly stat101's "added rows" model (General_StatsChange: 76 / 90). Dense windows: every receipt carries
`window`, one flag string per row from X - 2 to the release row + 2 (`s` screen, `o` OAM, `p` OBJ palette RAM change, `a` gAnimScriptActive,
`x` controller busy) — the per-row reference a renderer slice compares against.

## 5. Slice plan (each <= 60 min; acceptance commands exact)

Common gates for every production slice: `npm run typecheck`; `npm run test:smoke`; full suite in two shards
(`npx vitest run --no-watch --pool=forks --testTimeout=20000 --shard=1/2`, then `--shard=2/2`); `npm run build`;
`npm run compare:differential -- fight-submenu battle1-postwin-next-prompt presentation-rng-playable-live-bodies-seeded-on --base <base>`;
`npm run soak -- --policy vanilla --seeds 0:20 --parallel 5`; `sh tools/integration/sta123Run.sh <fresh>` (ROM receipts unchanged);
`git diff --check`.

1. **SA1 — `status-animation` command, constant durations, Scene ON (status-move / turn-start / end-turn paths).** Project the kernel
   receipt in `battleResolutionPresentation.ts` to `{ type: "status-animation", eventSequence, battler, animation, timing: { minimumFrames } }`
   with the §4 constants (an exported table, e.g. `STATUS_ANIMATION_ADDED_ROWS`), invisible in the renderer for now (`:845` list), duration in
   `:1054`. Scene OFF is untouched by construction (no receipt). Leave the gate at 0 and flag gated cases (the receipt follows a damaging
   move's hit in the same execution) for SA2. Test `tests/<id>StatusAnimationCommand.test.ts`: per animation x path the command length ==
   `rom-r1.json` controllerRows (18 scenarios), OFF has none, the census seeds of `exposure.json` carry one command per receipt. Census:
   `node --experimental-strip-types --no-warnings tools/integration/liveShareCensus.ts --seeds=a..b --index-from=a --out=<f> --commands=<f.jsonl>`
   x 10 shards both trees + `python3 tools/integration/hist73Merge.py`: only `status-animation` commands added (8,080 on seeds 0..999), every
   other command identical in type / order; OFF census (`off108Route.ts --scene=off`) byte-identical. Expect the soak / timing pins on
   status-bearing seeds to move by exactly the added rows (re-pin like iu120, frames only).
2. **SA2 — the IsBattleSEPlaying gate.** Measure the gate per preceding body (damaging-move secondary statuses: Ice Beam 17 / 18 here; Fire /
   Thunder / Poison / Psybeam secondaries, the ability paths Static / Flame Body / Poison Point / Effect Spore / Synchronize, Cute Charm)
   with new sta123-style scenarios; model it as `min(29, SE rows left)` where production knows the SE end, else a measured per-move table.
   Accept: per-class ROM == production on the new receipts both sides; census delta = the gate rows only.
3. **SA3 — stand-in cleanup.** In Scene ON the 32-frame `status` command on a status1 write followed by a `status-animation` command ends
   at that command (off121's delta rule, extended to ON; land after off121 merges into master). Accept: off121's per-class table re-derived
   for ON from off121's ON probes + `rom-r1.json` (residual 0), census ON delta = −32 + delta per status write.
4. **SA4..SA8 — renderers (one `status-animation` render effect -> `view.statusAnimation`, generalising `statusAnimation.ts` to all
   kinds, both sides), grouped by shared components, each against `rom-r1.json` windows + the sprite audit streams:**
   SA4 PSN (task-only: ShakeMon2 + BlendColorCycle; smallest) and PRZ (live-field version of the existing canonical renderer);
   SA5 BRN (`firePunchBurnFlames`) + SLP (letter Z, rest.ts) + INFATUATION (magenta heart, charm.ts): single-template particle groups;
   SA6 CURSED + NIGHTMARE (AnimGhostStatusSprite + monbg ANIM_DEF_PARTNER + ShakeMon2 on the battler: one new callback, two templates);
   SA7 CONFUSION (5 x AnimConfusionDuck, new wave motion; duck art exists); SA8 FRZ (frozenIceCube.ts + monbg / splitbgprio).
   Accept per slice: a render-check against a direct-mGBA dense capture of 2 scenarios per animation (both sides; the idle98RenderCheck.py
   pattern), the differential unchanged on canonical captures that carry none, full gates.
5. **SA9 — host / order / allocator.** Confirm sprite order and allocator unchanged (already audited); optionally replace the palette-host
   invalidation with the bank-7 stale record; x2 history ShakeMon2 offsets if a consumer reads them. Accept: palette / order receipts of the
   sprite audit reproduced by production on the census windows.
6. **SA10 — census + audit.** `sta123Exposure.ts` + liveShareCensus delta per animation x path == §2c counts x §1 rows; a ROM-vs-production
   per-class table (the fix122 shape: 0 residual per class) and a live receipt.

## 6. Risks / open

- **SE gate** (SA2) is data-dependent and was measured only after Ice Beam; any damaging-move secondary status or ability infliction may
  carry 1..29 gate rows. Status moves and turn-start / end-turn paths measured 0.
- FRZ active 115 vs 116 depends on the path (inflicted after Ice Beam vs frozen turn); source cause not isolated (sound timing around
  `waitplaysewithpan SE_M_HAIL, 17` is the candidate). Sample: 2 inflicted + 3 frozen turns.
- Substitute / semi-invulnerable suppression is ported in the kernel but not staged here (no Substitute / Fly / Dig scenario).
- Canonical differential traces: if one carries a status animation, SA1 moves its captures — check before landing.
- Census frame-budget stalls: 3 / 1,000 battles (434, 796, 881) end at the 200,000-frame budget; their prefixes count.
- WRAPPED never plays (no table entry); turn-trap animations are `playanimation B_ANIM_TURN_TRAP` (a different receipt), out of scope.

## 7. Reproduction (from workspace/)

```
sh tools/integration/sta123Run.sh <fresh-out-dir-inside-the-repo>            # archive copy, staging == committed, 72 probe jobs (r1 == r2 == sha256), rom-r1 == committed
sh tools/integration/sta123Run.sh <fresh-out-dir-inside-the-repo> --census   # + exposure census 0..999 (10 shards) == fixtures/sta123/exposure.json
python3 tools/integration/sta123Stage.py <dir>/scenarios
python3 tools/run-mgba-probe.py <o.json> -- <mgba-venv python> tools/integration/idle94Probe.py <scenario> on|off <o.json>
python3 tools/integration/sta123Rom.py <probe-dir> tools/integration/fixtures/sta123/scenario-index.json <rom.json>
node --experimental-strip-types --no-warnings tools/integration/sta123Exposure.ts --seeds=A..B --out=<dir>/e<k>.jsonl
python3 tools/integration/sta123ExposureSummary.py <dir> <exposure.json>
```

Scenarios (18, explicit seeds): Bulk Up templates (Primeape / Gengar vs Onix / Snorlax, seed 305419897, both sides): Toxic, Will-O-Wisp,
Thunder Wave, Spore, Confuse Ray, Ghost Curse, Attract (female Onix); legal mechanic templates (both sides): Ice Beam Delcatty / Shuckle
(seeds 305419958 / 305419955, the sprite audit's freeze sweep), Nightmare Haunter / Shuckle (seed 1).

## 8. Gates (this pack: new files only, production untouched)

- `sh tools/integration/sta123Run.sh .integration/validation/sta123-run1 --census` (archive copy of 42f68b371): **ALL SAME** — scenarios 18 /
  index SAME, probes 36 / 36 r1 == r2, 72 / 72 == committed sha256, rom-r1 SAME, rom r2 == r1, exposure.json SAME.
- `npm test` (full, one run): **1,638 files / 13,519 tests passed** (44 / 223 skipped), 0 failed (785 s). `npm run build`: green.
- `git diff --check`: clean.
