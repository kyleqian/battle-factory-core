# go246: the battle-start "Go!" intro waits for the species animations

Handoff "Next work" 4b(a) remainder (`docs/cax31-session-handoff.md`); plan in `docs/vis243a-sendin-census.md` section 7. Kyle's report:
"send-out cut short" on the battle-start intro, opponent SPOINK (`ANIM_H_JUMPS_V_STRETCH_TWICE`).

## 1. Kyle's case first: yes, SPOINK was cut short

The generated intro dispatched the player's "Go! <mon>!" at a **cry-bound** delay after the opponent handoff
(`generatedPlayerDispatchDelay` = 101 + cry(opponent) - cry(GROVYLE)), and the Scene ON player release draws the opponent at its
terminal front frame (`GENERATED_INTRO_OPPONENT_SETTLED_LOCAL`). SPOINK's cry is short (21 ticks, delay 64) but its front animation
is long (function animation 157 frames), so at the app's "Go!" the animation snapped to rest **137 frames early**. The ROM holds the
opponent's "sent out" text until the animation ends. SPOINK window (seed 8, GRIMER lead vs SPOINK), Scene ON ROM, same alignment, lag 0:
opponent / player-mon residual **318,460 / 585,343 px before -> 132 / 0 px after** (table in section 4).

## 2. The ROM rule

`Intro_TryShinyAnimShowHealthbox` (`battle_controller_opponent.c:292-383`, `battle_controller_player.c:979-1063`) moves on only when
**both** `bgmRestored` (the cry has ended: `!IsCryPlayingOrClearCrySongs()`) **and** `battlerAnimsDone` (the battler sprite callback is
`SpriteCallbackDummy`, i.e. `BattleAnimateFrontSprite` / `BattleAnimateBackSprite` have finished; `pokemon.c:6803-6900`). The app modelled
only the cry half. Scene OFF (`HITMARKER_NO_ANIMATIONS`) skips both animations, so there only the cry half exists.

Implementation (intro-local holds, no canonical-tick constant changed; `src/engine/battleResolutionPresentationRender.ts`,
`src/engine/battleScene.ts`):

| hold | rule (Scene ON; Scene OFF = 0) | applied to |
|---|---|---|
| `generatedIntroOpponentAnimHold(species, cryDelay)` | `max(0, max(S + 43, A + delay - 1 + 44) - cryDelay)`; S / A / delay = the species tail terms of `src/data/sendInTail.ts` (sprite frame animation length, function animation length, `sMonAnimationDelayTable`), the same terms the mid-battle slide waits on | `generatedPlayerDispatchDelay`: the "Go!" print, player throw, release and everything after |
| `generatedIntroPlayerAnimHold(species, personality, cry)` | `max(0, T_back + 5 - cry)`; `T_back` = `backAnimWaitTick` (vis243a / snd182), nature = personality % 25 | `generatedPlayerReadyLag` (the first action menu, `generatedBattleStartCommandReady`, the orchestrator's intro end) and the intro's message clear (`MENU_IDLE_BLANK_START_TICK + hold`) |

The orchestrator's intro length is the `generatedBattleStartCommandReady` predicate (`factoryRoundBattleOrchestrator.ts`
`advanceFactoryRoundBattleStartIntro`), so both holds thread through it with no separate frame count.

Constants are ROM fits, each confirmed on several windows:

* `A + 44` (function-animation bound): SABLEYE `GLOW_BLACK` (hold 98 = bso226's fitted lag 98), RATICATE `FIGURE_8` (39 = 39), BUTTERFREE
  `H_SLIDE_WOBBLE` (74 = 74), SPOINK `H_JUMPS_V_STRETCH_TWICE` (137; the window becomes exact).
* `S + 43` (frame-animation bound): ELEKID (45 = bso226's 45), ARON (128; harness lag sweep -2..1 at frame 550: -1 is the only exact
  value under the old `+44`, i.e. 43).
* `A + delay - 1 + 44` with a nonzero `sMonAnimationDelayTable` delay: POLIWHIRL (A 74, delay 5, S 75: 122 vs 118; hold 60). Lag sweep
  -4..4 at frame 560: lag 0 is the only exact one (opp 0 px; +-1 = 30,968 px), so the delay term is confirmed and the frame bound is not
  what holds it.
* COMBUSKEN (yoshi) and the canonical GROVYLE are cry-bound: hold 0.
* `T_back + 5` (player): the menu lag of every window after the opponent hold was GRIMER 12 (three windows), KOFFING 17, WAILMER 59, SPINDA 6,
  ONIX 6; the Scene OFF oracle gives **6 on every window** (spinda, koffing, spoink: the scene-independent ready-lag residual of the
  `factoryLegal` lab staging, ISSUES #87's +4..+7 class, not an animation wait). Scene ON minus 6 = 6 / 11 / 53 / 0 / 0 =
  `max(0, T_back + 5 - cry)` for GRIMER (T_back 31, cry 30), KOFFING (64, 58), WAILMER (128, 80), SPINDA (22, 35), ONIX (33, 70). WAILMER
  was predicted before it was measured (its menu falls past the staged pre-checkpoint frames: see section 3).

After the fix the menu lag is **6 on all eight Scene ON windows**, the same constant as Scene OFF: Scene ON no longer adds anything.

## 3. Harness

cln237 deleted the bso226 tools; restored from `4f6fa87e4^` with additions:

* `tools/integration/bso226Run.ts`: `playerPersonalities` optional (for `--scan`), `--menulag=F0` (first-menu lag fit: the first app frame
  >= F0 whose lag-0 `rest` residual exceeds 500 px, best lag -5..60 over the next 30 frames), `--romlast=N` (last ROM frame for `--menulag`).
* `tools/integration/bso226Stage.py`: `BSO226_PROFILE=battle-scene-off` stages on the Scene OFF oracle.
* WAILMER's menu is past the 2,007 staged pre-checkpoint frames: re-staged with a 160-frame post-checkpoint trace
  (`wailmerx-scenario.json`), post-checkpoint `frame-k` linked as pre-checkpoint `2006 + k` (frame 0 equals pre-checkpoint 2006
  byte-for-byte). The fitted lag (59) and the 384-px best residual equal every other window's, which supports the mapping.

Reproduce (per window; params / offsets in `tools/integration/fixtures/go246/intro-windows.json`):

```
python3 tools/integration/bso226Stage.py /tmp/w spoink 8 34 110,130,150 121,171,154
node --experimental-strip-types --no-warnings tools/integration/bso226Run.ts /tmp/w/spoink.json /tmp/w/spoink/rom /tmp/w/out.json \
  --scene=on --offset=1153 --ack=387 --end=810 --lag=6@772
node --experimental-strip-types --no-warnings tools/integration/bso226Run.ts /tmp/w/spoink.json /tmp/w/spoink/rom /tmp/x.json \
  --scene=on --offset=1153 --ack=387 --end=826 --menulag=560
```

## 4. ROM proof (Scene ON oracle `battle-scene-on`, `factoryLegal` lab staging)

"before" = parent `4b59eed6c`, **lag 0** (no `--lag`), same frames; "after" = this step with only the scene-independent menu lag
(`--lag=6@<menu frame>`). Px = differing pixels summed over app frames 0..end, regions as bso226 (opp x >= 120, y < 64; pm x < 120,
48 <= y < 112; rest).

| window | player lead / opponent lead | end | before opp / pm / rest | after opp / pm / rest |
|---|---|---|---|---|
| yoshi (42) | GRIMER / COMBUSKEN | 760 | 12 / 26,688 / 152,638 | **12 / 0** / 6 |
| wailmer (5) | WAILMER / SABLEYE | 960 | 277,110 / 560,480 / 1,939,478 | **132** / 7,903 / 16,768 |
| spinda (22) | SPINDA / RATICATE | 760 | 241,058 / 428,147 / 841,690 | **11** / 1,855 / 7,525 |
| onix (35) | ONIX / ELEKID | 780 | 267,078 / 489,688 / 940,320 | 46,322 / 14,502 / 54,599 |
| koffing (11) | KOFFING / BUTTERFREE | 790 | 298,214 / 545,982 / 1,288,294 | **12 / 97** / 7,001 |
| **spoink (8)** | GRIMER / **SPOINK** | 810 | 318,460 / 585,343 / 1,883,317 | **132 / 0** / 8,273 |
| aron (4) | GRIMER / ARON | 800 | 292,469 / 591,179 / 1,794,959 | 37,516 / 14,502 / 44,713 |
| poliwhirl (25) | GRIMER / POLIWHIRL | 760 | 274,362 / 430,220 / 1,265,674 | **6 / 0** / 268,115 |

The acceptance windows with `--lag 0` on the long-animation windows: **wailmer** (bso226 98@517) and **spinda** (39@475) need no
dispatch lag any more; the player half is the bso226 named residual (wailmer 7,903 = bso226's lagged value: frame 117 before the
intro, the in-flight ball 664..702, the ball-open sparkles 719..747; spinda 1,855 = the Spinda spot palette 606..645). wailmer's
`rest` 850..859 (435 px/frame) is the "Go! WAILMER!" clear: before the clear followed the hold it was 797..859 (the fixed tick 1742
blanked the box 63 frames early). With the lag split moved to 850 only 850..853 remain: the ROM clears 6 frames before its menu, the app
10, because WAILMER's long cry (80) already put its cry-bound ready 10 ticks after `MENU_IDLE_BLANK_START_TICK` (the canonical ONIX route:
6). That 4-frame offset is pre-existing for every species with cry > 74 in both scenes, unchanged by this step (named, not chased: it would
move the Scene OFF clear).

Named residuals (unchanged by this step):

* opp 11..132 px on one frame (first emerge frame): bso226.
* onix / aron opp: the app's **sprite frame animation** (`S`-bound species) runs one frame long against the ROM inside the animation
  (ELEKID 454..511, ARON 434..579); the dispatch itself is exact (`S + 43`). ELEKID also carries the bso226 gender mismatch. Below the
  species-animation timing class this step owns.
* onix / aron pm 14,502 px on alternate frames 455..477 / 435..457: bso226's release / ball-open frames.
* `rest` on every window: a constant 24 px / frame (bso226) and the 6-frame menu constant. poliwhirl's `rest` is 766..905 px / frame from
  frame 194 on, before the intro proper and identical before / after (a staging difference of that window outside the mon regions; not
  chased).

## 5. Scene OFF

No change by construction (`state.sceneOn` false -> both holds 0). Scene OFF oracle menu lag on spinda / koffing / spoink: 6 / 6 / 6 (the
same constant as Scene ON after the fix), so the OFF cry-bound timeline is not touched. `interactive-generated-intro-off` 715 / 715 and all
Scene OFF traces byte-identical (section 6).

## 6. Gates

Tested code commit `d34e3b650` (tree `ab0720d59231427d98bc1cdb327cc41733d2cb58`). Evidence: `.integration/validation/sv-20261104/go246-evidence/`
(worktree-local).

* `npm run typecheck`: exit 0.
* `npm run compare:differential` vs parent `4b59eed6c`, the 211 standard traces in five chunks: **PASS, 38,532 / 38,532 captures
  byte-identical** (4,278 + 4,874 + 9,409 + 6,650 + 13,321). No capture changed: the committed intro traces' leads are cry-bound
  (canonical GROVYLE opponent hold 0, ONIX player hold 0: `presentation-rng-playable-live-bodies-on` / `-seeded-on` 190 / 190 each,
  `interactive-generated-intro-off` 715 / 715); no other trace runs a generated Scene ON intro.
* Tests: `tests/go246IntroWait.test.ts` (new, 5), `bso226BattleStartIntroSendOuts`, `factoryBattleStartIntro`,
  `factoryBattleStartIntroAckAlignment`, `factoryRoundBattleOrchestrator`, `factoryRoundIntroGeneralization`, `plr162PlayerForcedSendIn`,
  `presentationRngSession`, `rsl141OrdinaryRowRest`, `wth236WeatherContinues`, `contain209GameplayThrow`: all pass. No pin re-pinned.
* Census: section 7.

## 7. Census

See below (filled in from the run).
