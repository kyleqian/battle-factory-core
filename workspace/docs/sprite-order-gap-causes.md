# Causes of the inter-body `sSpriteOrder` gap events (S10A, ROM evidence)

Evidence only; no production code. Answers the open questions of `docs/sprite-order-body-plans.md` (§3 gaps, §6). Every claim cites a
call-stream/raw-row evidence file and a pokeemerald source line. All probe runs are direct mGBA (never the shared HTTP oracles), Scene ON
(the corpus profile; Scene OFF has no move bodies). Two fresh runs of six probe outputs are byte-identical (shasum equal).

Reproduce:
```
V=../../vendor; export PYTHONPATH=$V/libmgba-py
python3 tools/integration/spriteOrderGapCauses.py gen            # targeted scenarios -> tools/integration/fixtures/gap-cause-scenarios/
python3 tools/integration/spriteOrderGapCauses.py run [names]    # probe -> $OUT (/tmp/gapcalls); ~15 s each, direct mGBA
python3 tools/integration/spriteOrderGapCauses.py blips|anims|intimidate|entrysplit   # corpus joins (event table x call streams)
python3 tools/integration/spriteOrderGapCauses.py fixture        # writes the two fixtures below
```
- `tools/compare/spriteOrderGapCallProbe.py` - whole-trace allocator call stream: every `CreateSprite*`/`DestroySprite` entry with caller LR
  (symbolised through the ELF), template/victim callback, stack-scanned return chain and battle context; exact-entry markers for
  `DoHitAnimHealthboxEffect`, `DoBounceEffect`, `CreateInvisibleSpriteWithCallback`, `TryHandleLaunchBattleTableAnimation`,
  `InitAndLaunchSpecialAnimation`, `LaunchStatusAnimation`, `LaunchBattleAnimation` (table + id). (`gc.disable()` is required: the cyclic GC
  segfaults inside libmgba's single-step loop on some scenarios.)
- `tools/integration/fixtures/sprite-order-gap-causes.json` (56 KB: blip corpus join, targeted scenarios, per-animation verdicts, Intimidate replay, entry-split check)
  and `sprite-order-gap-causes-calls.json` (115 KB: call-stream samples).  Corpus call streams: 137 of the 350 table scenarios (all that contain an mv-0 body, 125 BattleLab files) plus 25 targeted runs; outputs are in `/tmp/gapcalls` (not committed, ~40 MB).

## 1. Answers

### Q1. The transient blip is the **target's hit animation** (`DoHitAnimHealthboxEffect`)

* **Creator / destroyer.** `pokeball.c:1284` `DoHitAnimHealthboxEffect` -> `CreateInvisibleSpriteWithCallback(SpriteCB_HitAnimHealthoxEffect)`
  (`sInvisibleSpriteTemplate`, y/priority = the invisible template); called from `PlayerHandleHitAnimation` (`battle_controller_player.c:2872`) /
  `OpponentHandleHitAnimation` (`battle_controller_opponent.c:1814`). Destroyed by `SpriteCB_HitAnimHealthoxEffect` (`pokeball.c:1294`, `DestroySprite` at line 1305 on the 21st callback).
  Call stream, e.g. `fixtures/sprite-order-gap-causes-calls.json` `tackle-both`: frame 2119 `@DoHitAnimHealthboxEffect` LR `OpponentHandleHitAnimation+0x52`, `CreateInvisibleSpriteWithCallback` LR `DoHitAnimHealthboxEffect+0x10` (slot 3), frame 2139 `DestroySprite` slot 3 LR `SpriteCB_HitAnimHealthoxEffect+0x38`.
* **What it is / lifetime.** An invisible helper that jiggles the target's healthbox (`y2 = ±1`) while `DoHitAnimBlinkSpriteEffect` blinks the mon.
  It lives **exactly 20 frames** (create frame n, destroy frame n+20 in all 171 observed instances). The blink holds the controller for 33 frames
  (`battle_controller_player.c:1401-1418`), so no other sprite can be created while the blip lives: it is an atomic C[lowest free] / D[same] pair (HP bar, messages and
  `healthbarupdate` run only after the controller releases).
* **Condition.** The blip exists **iff the script command `hitanimation` executes its `BtlController_EmitHitAnimation` branch and the target's battler sprite is not invisible**:
  `Cmd_hitanimation` (`battle_script_commands.c:5558-5575`) skips on `MOVE_RESULT_NO_EFFECT` (miss | doesn't-affect | failed) and on substitute+`HITMARKER_IGNORE_SUBSTITUTE`;
  the controller handler skips if `gSprites[gBattlerSpriteIds[battler]].invisible`. Crit, effectiveness message, HP-bar change, faint, status icon are *not* conditions: `hitanimation`
  precedes `healthbarupdate/critmessage/resultmessage` (`battle_scripts_1.s:253-262`). Sites that run `hitanimation` (14 in `battle_scripts_1.s`: HitFromAtkAnimation 257, Absorb 335, Explosion 396, DreamEater 445, DoMultiHit 628, TripleKick 1410, HitAllWithUndergroundBonus 1857, BeatUp 1959, BrickBreakDoHit 2439, PursuitDmgOnSwitchOut 3134, **DamagingWeatherLoop 3213 (`BS_ATTACKER`)**, Bide 3307, FutureAttackHit 3525, **SelfConfusionDmg 3807 (`BS_ATTACKER`)**).
* **Evidence matrix** (all `fixtures/sprite-order-gap-causes.json` `targetedScenarios`, one `DoHitAnimHealthboxEffect` marker = one blip, life 20):

  | case | scenario | blips |
  |---|---|---|
  | hit (not very effective / neutral) | `tackle-both`, `splash-tackle` | 1 per hit |
  | **no effect** (Tackle -> Ghost) | `tackle-vs-ghost` | **0** for the Ghost-targeting Tackle, 1 for Gastly's hit |
  | **miss** (Thunder, seed 2) vs hit (seeds 1,3,4) | `thunder-seed2` vs `thunder-seed1` | **0** (miss has no body either: `BattleScript_PrintMoveMissed` has no `attackanimation`) vs 1 |
  | no-damage status (Growl, Leer, Thunder Wave on Ground) | `growl-leer`, `thunderwave-vs-ground` | **0** |
  | multi-hit (Double Slap x3) | `mechanic-double-slap-opponent-poliwhirl-player-onix` | **1 per hit**, each after its own body |
  | charge turn then release (Solar Beam) | `mechanic-solar-beam-player-gloom-...` | none on the charge turn, 1 on the release turn (mv 76) |
  | Present damage vs heal | `mechanic-present-...` vs `...-heal` | 1 (mv 217) vs **0** on the heal outcome |
  | hit on a Substitute (no ignore flag) | `substitute-then-tackle` | **1** (substitute does not suppress it) |
  | faint | `mechanic-explosion-player-glalie-...` | 1 on the target, none for the exploding user |
  | end-of-turn damage (curMove 0, `BS_ATTACKER`) | `mechanic-hail-player-delibird-opponent-onix` | 1 per Hail tick on the damaged mon |
  | move menu cancel / cursor moves | `prompt-move-cancel`, `prompt-cursor-moves` | unchanged |
* **Corpus proof (not a sample).** For the 137 table scenarios with call streams, the 170 gap blips found in the event table (single-slot C then D same slot 20 frames later, in gap units) equal **exactly**
  the frames of the `DoHitAnimHealthboxEffect` markers (170 matched, 0 table-only); the one probe-only marker (`186-sweet-kiss-opponent` frame 2732) is the end-of-trace truncated blip (the table's last gap, `last: true`).
  The empirical rule "Tackle -> blip" is the same fact: all 138 gaps after Tackle contain a blip (Tackle always hits in the corpus); the 5 "impure" keys were extra prompt cycles / truncated tails.
  Of 57 damaging moves observed with a following gap, 53 always have the blip; the 4 exceptions are exactly the no-`hitanimation` turns: Dive and Solar Beam charge turns, Future Sight set-up turn, Present heal (matrix above).
* **Rule for production.** Apply the blip transform at the presentation event `hit-animation` (`battleResolutionPresentation.ts` `type: "hit-animation"`, from the `HIT_ANIMATION` payload; it is emitted by the same `Cmd_hitanimation` branch, so miss/no-effect/heal Present produce no command),
  **provided the target battler sprite is not hidden at that moment** (the engine's `sprite-visibility` state; Dig/Dive/Fly users). Transform = take the lowest free slot out of `F` and re-insert it at the head of `F` (C[f]; D[n0], no allocation between). One per command: multi-hit moves and weather/confusion
  self-damage already emit one `hit-animation` per hit/tick. This replaces the per-previous-body gap table for blips.

### Q2. The "cursor pair" is the action-prompt **bounce pair** (not a menu cursor)

* **Source.** `HandleInputChooseAction` calls `DoBounceEffect(battler, BOUNCE_HEALTHBOX, 7, 1)` and `DoBounceEffect(battler, BOUNCE_MON, 7, 1)` every frame (`battle_controller_player.c:237-238`); `DoBounceEffect` (`battle_main.c:2899`) creates one
  `sInvisibleSpriteTemplate` sprite per call (`SpriteCB_BounceEffect`) guarded by `healthboxIsBouncing`/`battlerIsBouncing`, so exactly two are created on the first frame the prompt runs. They are destroyed by `EndBounceEffect` (`battle_main.c:2940`; HEALTHBOX first, then MON) from
  `PlayerHandleLinkStandbyMsg` (`battle_controller_player.c:3083-3092`, `LINK_STANDBY_STOP_BOUNCE_ONLY`) once the action is chosen.
  Call stream (`tackle-both`, frame 1862): `@DoBounceEffect` LR `HandleInputChooseAction+0x24` and `+0x30`, two `CreateSprite` slots [3,4] (lowest free); frame 2041 two `DestroySprite` LR `EndBounceEffect+0x3c` / `+0x82`. In all 25 targeted runs and every corpus stream there are exactly 2 creates + 2 destroys per command prompt (cycle count = prompt count; e.g. Present-heal: 4 prompts, 8 `DoBounceEffect` markers).
* **Move menu, cancel, cursor.** `prompt-move-cancel` (A, B, A, A) and `prompt-cursor-moves` (RIGHT, DOWN, LEFT, UP, A, A) add **no allocator calls at all** (`tackle-both` and these have identical call counts per prompt: 4 bounce markers over two prompts). The action cursor and move menu are text/window only (`ActionSelectionCreateCursorAt`, `HandleInputChooseMove`).
* **Party menu** is different: `prompt-party-cancel` (DOWN, A, wait, B): opening the party menu runs `ResetSpriteData`-class clearing (all sprites freed; the menu allocates `CreateMonIconSprite`/`CreatePartyMonPokeballSprite`/`CreatePokeballButtonSprite`, frame 2046-2061), and the return (`ReshowBattleScreenAfterMenu`, frame 2465-2474) re-creates `CreateBattlerSprite`, `CreateBattlerHealthboxSprites`, `LoadAndCreateEnemyShadowSprites`, then `HandleInputChooseAction` creates a **new bounce pair** (frame 2499). The post-return order is a fresh stream from identity order: **invalidate**. (Bag/Run screens are the same class; not probed.)
* **Rule.** Prompt event -> `C[two lowest free]` at the first frame of the prompt, `D[FDERIVED order of the pair at creation]` when the turn's actions are committed (before the first body of the turn; the existing table already encodes the order). Move-menu entry/cancel/cursor moves: no-op. Party/bag open+close: invalidate.

### Q3. Non-move animations (mv-0 bodies) are identified; Intimidate is `B_ANIM_STATS_CHANGE`

Identification uses `TryHandleLaunchBattleTableAnimation` (args: tableId, argument), `LaunchStatusAnimation`, `InitAndLaunchSpecialAnimation` and `LaunchBattleAnimation` (table symbol + id) captured inside each mv-0 body, joined to the event table
(`analyse_anims`, 135 of 137 mv-0 bodies matched; the 2 unmatched are Icy Wind's trailing body `196-...-0.json` unit 7). `gBattleAnims_General`/`gBattleAnims_Special`/`gBattleAnims_StatusConditions` ids named from `include/constants/battle_anim.h`.

| animation (table:id [argument class]) | launched by | instances | order transform | verdict |
|---|---|---|---|---|
| **General B_ANIM_STATS_CHANGE (1)**, arg = `STAT_ANIM_PLUS1(14)/MINUS1(21)/PLUS2(38)/MINUS2(45)` + stat id, 55-58 multiple | `playstatchangeanimation`/`playanimation B_ANIM_STATS_CHANGE` (`BattleScript_IntimidateActivates` :4036, StatUp/StatDown) | 73 (all arg classes) | +-1 / multiple: `C[f]; D[n0]` (one invisible copy sprite, 65 frames: `StatsChangeAnimation_Step2` `battle_anim_utility_funcs.c:487` -> `CreateInvisibleSpriteCopy` `battle_anim_mons.c:2323`; destroyed `StatsChangeAnimation_Step3` :617). +-2: `C[f]` in the body and the `D[n0]` lands in the *following* boundary (the unit ends first); same net transform, destroy before any other allocation | **EXACT-PLAN** per arg class (one signature each; none varies) |
| Status B_ANIM_STATUS_PSN (0) | `statusanimation` | 6 | no sprites | EXACT (empty) |
| Status B_ANIM_STATUS_PRZ (5) / SLP (4) / INFATUATION (3) | same | 9 / 14 / 4 | single-slot C/D pairs (`AnimMovePowderParticle`, `AnimSleepLetterZ`, `AnimMagentaHeart`) | EXACT-PLAN |
| Status B_ANIM_STATUS_CONFUSION (1) | same / `AnimConfusionDuck` | 15 | 5 simultaneous ducks, one multi-destroy group, same priority word, different y | **NEEDS-KEYS** |
| General B_ANIM_SUN_CONTINUES (11) | end-turn weather | 2 | 4 creates, 4 single destroys | EXACT-PLAN |
| General B_ANIM_HAIL_CONTINUES (13) | end-turn weather | 2 | particle group with equal priority, different y | **NEEDS-KEYS** |
| General B_ANIM_TURN_TRAP (6) | Fire Spin / Whirlpool end turn | 4 | two distinct plans (83 vs 250), single destroys | **NEEDS-KEYS** (plan varies by trapping move) |
| General B_ANIM_FOCUS_PUNCH_SETUP (20), HELD_ITEM_EFFECT (7) | focus-punch setup / item effect | 3 / 3 | single-slot C/D streams | EXACT-PLAN |

(plans are in the fixture, `midBattleAnimations.anims`; sandstorm/rain are not in the corpus as mv-0 bodies.)

**Intimidate-type entries (12 scenarios: Hitmontop x6, Ekans x2, Masquerain x2 - all 10 probed ones launch `[0,0,0,1,22]`; Howl-alternate x2 are fixture files, not BattleLab files, so they were not probed: same window shape, replay 2/2) - what happens.** Before the first prompt the opposing/own lead's `BattleScript_IntimidateActivates` (`battle_scripts_1.s:4024`) runs `playanimation BS_TARGET, B_ANIM_STATS_CHANGE` with arg 22 (= `STAT_ANIM_MINUS1` + ATK 1):
frame 1891 `TryHandleLaunchBattleTableAnimation` (LR `PlayerHandleBattleAnimation+0x3a`, args `[0,0,0,1,22]`) -> `LaunchBattleAnimation(gBattleAnims_General, 1)`; frame 1893 one invisible sprite at slot 3 (`CreateInvisibleSpriteCopy+0x18`), frame 1958 destroyed by `StatsChangeAnimation_Step3` (`fixtures/sprite-order-gap-causes-calls.json` `mechanic-counter-opponent-hitmontop-player-onix`). The transform is the ordinary stat plan `C[f]; D[n0]`.
**Why the first-edge F differs from the constant (answers the "skipped" 12): not a different entry stream.** The event table samples F at the *first body*, which for these scenarios is the Intimidate animation, i.e. *before* the first prompt's bounce pair; the committed constant is F *after* the first prompt cycle. Replaying
`F(pre-prompt) -> stat plan C[f];D[n0] -> prompt pair (create two lowest free, destroy in F order)` reproduces the observed F at the first real move edge in **12 / 12** (`[3,4,21,20,5,19,...]`; `intimidateEntryReplay`), versus the no-anim entry `[4,3,21,...]` (the pair's F order at creation differs because slot 3 re-entered at the head).
The playable engine's corresponding command is the `stat` command (`type: "stat"`, emitted at the `playanimation B_ANIM_STATS_CHANGE` boundary when `from !== to`; `battleResolutionPresentation.ts:3452`); a switch-in-ability stat drop before the first prompt should therefore apply the stat plan (C[f]; D[n0]) there and then the prompt cycle.
Intimidate prevented/blocked (`BattleScript_IntimidatePrevented`, pause only) and Substitute-skipped targets run no animation: no transform. Per target hit (doubles) one animation per application.

### Q4. The 7 entry-window-split scenarios differ only in **timing**

Magic Coat, Brick Break (x2), Dizzy Punch, Fake Out, Heal Bell and Light Screen (slowpoke fixture): the 117 allocator calls from the battle `ResetSpriteData` to the first prompt, as `(kind, symbolised caller, slot)`, are the **same multiset in all 7** and the **same ordered stream in 6** (`entrySplitCheck`). Only the frame offsets move (first shifts of +12 Magic Coat, +12 Brick Break x2, +4 Heal Bell, -21 Fake Out, -19 Dizzy Punch frames relative to the control run):
the intro takes a species-dependent number of frames (lead cry / shiny check / `Intro_TryShinyAnimShowHealthbox` timing), so simultaneous events fall into different per-frame "sort windows". Light Screen differs in one more way: the `Intro_TryShinyAnimShowHealthbox` destroy of the invisible sprite is interleaved earlier relative to the ball-particle destroys (same calls, different order inside a 150-frame stretch); the committed table already shows its F at the first edge equals the constant. Because the slot stream and per-call order are identical (or a reordering of independent single-slot destroys that the replay already handles), harmless: the entry constant stays valid; the split is only a corpus-parsing artefact of frame spacing. No production action.

## 2. Proposed production rule table (event -> order transform)

`F` = free-slot order (`spriteOrderProvider.ts`), "lowest free" = lowest slot number not occupied.

| presentation event / source boundary | transform on `F` | verdict / notes |
|---|---|---|
| command prompt shown (turn start, incl. after a move-menu cancel) | `C[2 lowest free]` | EXACT; move-menu entry, cancel, cursor moves: **no-op** |
| actions committed (`EndBounceEffect`) | `D[the two, FDERIVED = F order at creation]` | EXACT (existing table) |
| party/bag screen open (+ B cancel) | **invalidate**; stream after return restarts from identity | not planned |
| `move-animation` (move body) | per-(move, side) body plan | EXACT-PLAN / NEEDS-KEYS (`sprite-order-body-plans.json`) |
| `hit-animation` and target sprite visible | **blip**: take lowest free slot out of `F`, re-insert at head (C[f]; D[n0], no allocation inside the 20 frames) | EXACT; 1 per command (multi-hit, weather tick, confusion self-hit included). Replaces per-previous-body gap keys |
| `hit-animation` and target hidden / no `hit-animation` (miss, no effect, status move, charge turn, Present heal, Future Sight set-up) | none | EXACT |
| `stat` (+-1, multiple) incl. switch-in Intimidate before the first prompt | `C[f]; D[n0]` | EXACT-PLAN; Intimidate = this event with the pre-prompt `F` |
| `stat` (+-2) | `C[f]` now, `D[n0]` at the next boundary (before any other allocation) | EXACT-PLAN |
| `status` (PSN, PRZ, SLP, INFATUATION) | plan per status | PSN no sprites, PRZ/SLP/INFATUATION EXACT-PLAN; BRN/FRZ not in corpus |
| `status` CONFUSION (ducks), hail ticks, TURN_TRAP end-turn | group destroy ordered by live y | **NEEDS-KEYS** -> invalidate (or LiveKeyTracker) |
| end-turn Sun | C x4; D x4 | EXACT-PLAN |
| trapping carry-over / Dive-class survivors | `D[c1,0]` of the previous body's first survivor at the next boundary | as in the body-plan table |
| switch / summary / substitute / transform / unknown animation | invalidate | unchanged |

## 3. Open questions

1. `blip` + body interleaving for exotic hit sources never observed as bodies: Pursuit-on-switch (`PursuitDmgOnSwitchOut`), Bide, Beat Up, Absorb/Dream Eater (`hitanimation` sites exist; Absorb/Dream Eater are in the corpus and fit). Fly/Dig *hidden target* skip (controller `invisible` check) is by source, not probed.
2. `prompt-party-cancel` gives the call stream of the reshow allocation (about 20 calls); deriving its exact `F` plan (instead of invalidating) needs one more replay model.
3. +-2 stat animations: the carried destroy was inferred from the table (`C[f]` only in the body, `D[3]` in the next gap, `14-...swords-dance-...-0.json` units 3-4), not separately probed per arg.
4. Two Icy Wind trailing mv-0 bodies have no identified launcher in the probe window; the two Howl-alternate entries (fixture files) were not probed and are classed by identical window shape + replay.
5. Weather hail/sand/rain tick bodies exist only for Hail/Sun in the corpus; Sandstorm's own `hitanimation` blip (it uses `DamagingWeatherLoop`) is expected by source and was seen for Hail.
