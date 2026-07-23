# Battle 2 opening evidence

This note records the bounded 2026-07-23 investigation from JENSON's held
room quote through the first Battle 2 menu. Canonical frame numbers name the
input edge at the start of a one-frame button segment, matching the
ground-truth trace's convention.

## Input gates

- JENSON's six-word room quote finishes at 30381. An A edge starting at 30382
  is rejected; 30383 is the first accepted edge. The canonical edge at 32031
  is therefore a valid delayed dismissal.
- The battle-intro text is still rejecting A at 32478. The first accepted
  edge starts at 32479; the canonical edge at 32531 is a valid delayed press.
  Paired traces differing by one idle frame showed the first divergent
  post-input framebuffer at 32482.

Both probes replayed the committed ground-truth prefix and varied only their
candidate A edges.

## RNG and handoff ledger

A fresh mGBA RAM replay watched `gRngValue` and `gMain.inBattle` through
32020-33031. Ordinary field ownership advances the LCG once per VBlank.
Relative to room `settled` elapsed zero at 32036, setup adds 50 calls at
elapsed 0, 22 at +8, 4 at +15, and one transition-selection call at +23.
After that last ordinary VBlank, the selected value's upper half modulo the
12-entry Frontier table is 10. `src/battle_setup.c` identifies entry 10 as
`B_TRANSITION_FRONTIER_CIRCLES_ASYMMETRIC_SPIRAL_IN_SEQ`.

Battle-scene elapsed zero is 32245. `gMain.inBattle` changes from 0 to 2 at
32250 after five more initialization calls, and field VBlank ownership then
freezes. The transition begins fading at 32226, is black from 32237, and the
first battle framebuffer is 32280.

The matching source task in `src/battle_transition_frontier.c` creates its
three spiraling circle sprites at task timers 0, 16, and 32, using distinct
centers and angles. This is not Battle 1's circles-meet transition.

## Sequential transition repair

`battle2-transition.json` captures every canonical frame 32031-32279 and is
**249/249 exact**. Relative to room `settled` age 0 at 32036:

- the shared three-cycle gray intro occupies ages 25-72;
- the top/left/right circles first render at ages 76/92/108, follow
  `SpriteCB_LogoCircleSpiral`'s Q4.12 `Sin2`/`Cos2` geometry, and settle 32
  callbacks later;
- center-logo alpha is 0 at age 140, reaches 16 at 156, and the source
  31-tick hold ends with exit-fade age 190; age 201 is solid black; and
- black remains exact through 32279. Frame 32280 is intentionally excluded.

A fresh callback replay found the transition task in `gTasks[7]` and the
three circle sprites in `gSprites[10..12]`. Their spiral callbacks become
live in staggered order and become dummy after the respective 32-step
motions. During overlap, `sprite.c:SortSprites`' signed-OAM-Y order is
load-bearing; its stable inherited order at the single top/right Y tie
explains frame 32162. The engine models that live order rather than a fixed
piece painter order. Battle 1's unchanged `CIRCLES_MEET` path remains
**206/206 exact** in `transition.json`.

## Encounter setup

`src/data/battle_frontier/battle_frontier_trainers.h` identifies JENSON as a
FISHERMAN and supplies the observed DOWNCAST quote. The canonical opponent
lead is KABUTO. Engine setup now carries that identity, the healed
ONIX/MAGBY/BAYLEEF HP tuple `[117, 138, 153]`, and ONIX's real move IDs
`[157, 20, 225, 201]` into `EngineState`; the FIGHT submenu no longer has to
fall back to Battle 1's unrelated fixed setup.

## Exact remaining render work

The room dismissal, transition, and trainer intro through canonical 32530
are exact.
To reach 33030/33031 without forbidden framebuffer harvests, the live
renderer still needs:

1. encounter-parameterized KABUTO send-out animation/healthbox;
2. press-relative ONIX send-out timing; and
3. a composed Battle 2 action-menu base, replacing the Battle 1-only
   full-frame Grovyle idle base for this encounter.

Those dynamic spans must then be committed in capture-cap-sized dense traces.
Only a separately proven byte-static hold may be thinned.

## Fisherman trainer intro

`battle2-intro-dense.json` captures every frame **32280-32530** and is
**251/251 exact**. Battle-scene elapsed zero is 32245, so the existing shared
BattleIntroSlide3 clock maps local first-visible tick 1075 directly to 32280;
the reveal/window/scanline shift, status summaries, and message window need
no encounter-specific timing branch.

The identity input is `BattleSceneState.encounter`, copied from
`BattleSetupState`. A state-advance audit found that the handoff set
`"jenson"` correctly but `advanceBattleScene` dropped it after one tick,
silently selecting DESTIN thereafter. Preserving the field lets the same
renderer select the extracted Fisherman trainer pic and source-expanded
`"FISHERMAN JENSON" / "would like to battle!"` text.

Both texts start at local 1234 and print one character per tick. JENSON's
class/name line is two characters shorter than DESTIN's, so its 37th
character finishes at 1270 and the visible PAUSE_UNTIL_PRESS cursor begins
at 1272; the controller's first accepted input remains 1274, matching the
32478 reject / 32479 accept probe. The cursor X remains the shared
width-derived `16 + measureText("would like to battle!") = 123`.
`scene-assembly.json` remains **256/256**, proving the BUG CATCHER DESTIN
defaults are unchanged.

## 32531--33030 boundary ledger (S8 probe, 2026-07-23)

This is a source-relative implementation ledger, not a new pixel acceptance
window.  It replays the committed `battle1-winline-b-swap.json` segments 154
(`A`, frame 32531) and 155 (499 idle frames) unchanged.  A fresh oracle run
confirms the canonical endpoint is frame **33030**: KABUTO Lv50 and ONIX
Lv50, both full, with the FIGHT/BAG/POKeMON/RUN action menu visible and its
cursor on FIGHT.  The held 32531/32533 SHA is identical; the existing app is
also exact at those two samples.  It diverges at every later sampled frame;
the largest sparse diagnostic is 11,210 px at 32831 (then 9,824 at 32931 and
4,786 at 33030).  That ranks missing live composition only; it asserts no
pixel-exactness.

| canonical boundary | mechanism / source and RAM/OAM implication | renderer disposition |
| --- | --- | --- |
| 32531 accepted delayed A; 32531--32535 held visual | `BattleIntroPrintOpponentSendsOut` -> opponent controller (`battle_main.c:3583,3642`; `battle_controller_opponent.c:1867`) accepts the old PAUSE_UNTIL_PRESS, then retains the frame through the shared five-tick printer registration lag. | Reuse shared Battle-1 text/input state unchanged, parameterized by JENSON's text length. |
| 32536--32567 | `"FISHERMAN JENSON sent\nout KABUTO!"` is 32 glyphs at one glyph/tick.  The final glyph is 32567; the shared three-tick post-text wait makes the visual handoff 32570. | Parameterize shared send-out text (trainer/species); no new component. |
| 32570--32606 | Fisherman trainer begins the same `StartAnimLinearTranslation` exit at handoff; its 37-entry fixed-point exit table is the Battle-1 `SpriteCB_FreeOpponentSprite` mechanism (`battle_controller_opponent.c:1867-1892`, `battle_gfx_sfx_util.c:396-407`).  Trainer OAM is freed immediately after its final translation callback. | Reuse motion unchanged, parameterized by Fisherman art; the current Bug Catcher-only paint must not be reused unchanged. |
| 32572--32587; 32588--32592; 32593--32598; gone 32599 | KABUTO ball is closed, open, open-final, then hidden.  This is `Task_DoPokeballSendOutAnim` + `SpriteCB_OpponentMonSendOut` / `SpriteCB_ReleaseMonFromBall` (`pokeball.c:363-405,991-1003,758-806`): handoff +2/+18/+23/+29, with the normal 16-tick wait and `sBallAnimSeq1`. | Reuse the Battle-1 ball/particle state unchanged, parameterized only by handoff and battler. |
| 32589--32604; 32605--32706 | KABUTO materializes at handoff+19.  At +35 its species entrance starts: `sMonFrontAnimIdsTable[SPECIES_KABUTO-1] = ANIM_H_SLIDE_WOBBLE` (`pokemon.c:1546`; `pokemon_animation.c:1803-1829`), whose `data[2]` runs 0..100 before reset.  It overlaps later player work; it is not a blocking substitute for a generic settled sprite. | Ball-affine/materialize path is reusable parameterized by KABUTO asset; KABUTO's 101-callback H-slide-wobble needs a live species-animation component (not Grovyle's V-stretch table). |
| 32603--32625 | Opponent healthbox begins at handoff+33, x offset -110 then +5 each tick, settling at +55.  It is the singles opponent healthbox created/filled by `BattleInitAllSprites` / `CreateBattlerHealthboxSprites` and `InitBattlerHealthboxCoords` (`battle_gfx_sfx_util.c:831-913`; `battle_interface.c:869,1078-1081`). | Reuse slide/chrome unchanged, parameterized as **KABUTO Lv50, 91/91 HP** (species 140); party summary exit remains shared. |
| queued at 32682; visual 32727--32849 | Player `IntroTrainerBallThrow` is queued at handoff+112 (`battle_controller_player.c:2931-3017`), but the already-created player controller retains a 45-callback visual delay. Brendan's first pose is 32727; ball arc 32760, affine spin 32768, open 32805, ONIX materialize 32806, and healthbox slide 32820--32842. The independently queued `Go! ONIX!` printer does not share this delay. | Reuse the entire Battle-1 player throw/ONIX materialize/healthbox visual path through the inherited +45 relative clock; parameters are **ONIX Lv50, 117/117 HP**. |
| 32850--32855; 32856 onward | The message box is blank for six ticks, then `PlayerHandleChooseAction`'s off-screen BG0 composition is revealed atomically by `HandleChooseActionAfterDma3` (`battle_controller_player.c:2565-2573`); cursor is the BG0 tile at FIGHT.  This is input-ready at the reveal and remains so through 33030. | Requires a new live composed Battle-2 action-menu base: the existing Battle-1 harvested Grovyle base cannot be reused.  Window/cursor/text primitives may be reused parameterized by ONIX/KABUTO. |

Fresh lightweight RAM replay over 32530--33031 reads `gMain.inBattle = 2`
throughout, so `main.c`'s ordinary VBlank `Random()` gate is closed.  It also
pins stable player/opponent battle mons (95/117/117 and 140/91/91), healthbox
ids 0/1, and KABUTO's mon-sprite slot change 4->8 at handoff.  `gRngValue`
is flat at 812598902 through 32893, then advances on demand at 32894 (+1),
32898 (+2), and 32900 (+5): this is the pre-first-turn
`TryDoEventsBeforeFirstTurn` / choose-action and opponent-AI work
(`battle_main.c:3841-4168`), not per-VBlank advancement.  Endpoint 33030
therefore has RNG 3530724670, `gBattleControllerExecFlags = 1`, and the same
full-HP battlers.  This preserves the earlier 32020--32250 setup ledger.

## Player send-out dense checkpoint

`battle2-player-sendout-dense.json` captures every frame 32680--32849. The
implementation is **170/170 exact**. The earlier partial's split-clock
interpretation was half-right: the independently queued `Go! ONIX!` printer
does retain the ordinary opponent-handoff-relative clock, clearing at 32715
and printing one glyph per frame from 32716 through 32723. The entire visual
player-controller chain instead retains the inherited 45-callback delay:
Brendan, player party summary, thrown ball, open particles, ONIX
materialize/back animation, and the 117/117 healthbox all map to the already
proven Battle-1 visual helpers through that single relative clock.

The exact source-shaped mappings are:

- 32727 maps to Battle-1 visual tick 1574, Brendan's first throw pose and
  translation callback;
- 32760 maps to 1607, the closed ball's first visible arc frame;
- 32768 maps to 1615, the first affine-spin frame;
- 32805 maps to 1652, the ball-open frame;
- 32806 maps to 1653, the materialize/particle/BG-fade start; and
- 32820 maps to 1667, the 117/117 player healthbox's first visible slide
  frame (settled at 32842).

One coefficient-only inherited-state boundary is independently required:
at player callback age 14 (canonical 32741), the alternating player-summary
fade advances its eva coefficient one step early while the bar/icon sprite
translations remain on their ordinary age. The next callback reconverges.
Tier-1 pins this age locally and proves DESTIN/Battle 1 keeps the shared
default.

Nothing at 32850 or later belongs to this checkpoint. No capture thinning,
framebuffer harvest, absolute canonical-tick lookup, or coordinate/RGB
fitting is used.
