# pfr192 -- the PLAYER faint-replacement send-in, keyed in production (ISSUES #146 remainder)

Scope: presentation only. The player's faint-replacement send-in (forced party select -> SEND OUT -> "Go! X!" -> ball -> release -> healthbox
slide -> next print -> action prompt) ran on partySelect's fixed MAGBY clock (`PARTY_SENDOUT_*`: blank 305, clock ready 311, then turn-end 8 +
next-command handoff 6, so the prompt was at **325 from the SEND OUT confirm for every species and both scenes**). The ROM target is
`docs/pfr185-player-faint-replacement-send-in.md`. Kernel events, RNG, damage, AI and turn order are untouched (census below).

## Step 1 -- are turn-end 8 + handoff 6 inside B + D + 17?  Yes

Dense ROM frames (`tools/integration/pfr192RomFrames.sh`, raw RGB888 frames of the 22 pfr185 scenario rows + MAGBY, committed only as hashes)
against production frames (`tools/integration/pfr192Dense.ts`): with the old clock MAGBY (female, 138/138 healthbox art) Scene ON is pixel-exact
through confirm-relative frame 310 and the ROM shows the action menu at 311, while production's fixed clock was ready at 311 and ran 14 more
frames. So the ROM's prompt (B + D + 17) already contains the turn-end (8) and handoff (6) frames: the keyed clock is ready **14 frames earlier**
(`readyAt = P - 14`, P = B + D + 17) when the segment continues with exactly `turn-end`, and the orchestrator's resumed lifecycle then plays
turn-end (draws "Go! X!") and the blank handoff box before the menu opens at P.

## Design

`PartySendOutTiming { ballShift, releaseExtra, readyAt, blankStart, goTextChars }` (`partySelect.ts`), built at the SEND OUT confirm by
`playerFaintReplacementSendOutTiming` (`switchInTail.ts`) / `playerFaintReplacementSendOutTimingOfSegment` (`battleResolutionPresentationRender.ts`):

- B = 91 + length(name) frames from the confirm (`ballShift = B - 96`, MAGBY's 96); D = `sceneOnPlayerForcedSwitchInDuration(species, personality)` /
  `sceneOffPlayerForcedSwitchInDuration(species)`; P = B + D + 17; `releaseExtra` = 1 for CASTFORM (whole post-spawn timeline one frame late).
- `readyAt = P - followingFrames` (`followingFrames` = turn-end 8 + handoff 6 only when the segment's commands after the switch-in are exactly
  `[turn-end]`, else 0); `blankStart = P - 6`; `goTextChars` = printable length of the segment's own "Go!" message.
- Ball, release, particles, healthbox slide and summary-tray hand-off run on `elapsed - ballShift - releaseExtra`; pre-ball phases (fade, black,
  battle fade-in, "Go!" text start 84) and the party-summary tray end (frame 70, confirm-relative for every species) use the raw confirm clock.
- Consumers: `partySelect.ts` (`partySendOutPhase`, `partySendOutBattleMenuReady`, `partySendOutGoTextVisibleChars`), the forced renderer in
  `battleScene.ts`, `createBattleResolutionPresentationRenderView` (`view.switchIn.timing`), and the orchestrator's `presenting-switch-in` ready test.
- Default (timing absent) = the MAGBY constants (305 / 311, 10 chars), so the canonical turn-15..17 trace paths (`core.ts`, `battleSceneCanonical.ts`,
  `ACTION_MENU_BLANK_START_OFFSET`) are byte-for-byte unchanged -- the differential below confirms it. `SWITCH_IN_TIMING` (voluntary switch-in) and the
  opponent replacement are untouched.

## Acceptance

### 1. Residuals vs ROM (frames from the SEND OUT confirm; `tools/integration/pfr192Prod.ts`, `fixtures/pfr192/prod-residuals.json`)

"next" = production's blank-message start vs the ROM next-print state; the screen shows a ROM state change one frame later, so a blank start of
ROM next print + 1 is the pixel-aligned value (the dense frames are exact at the Go!/blank boundary). "prompt" = production's first action-menu
frame vs the ROM action-prompt state (ROM and production both count the menu as open from that frame).

| case | scene | ROM next print / prompt | base blank / menu (res) | keyed blank / menu (res) |
|---|---|---|---|---|
| pidgey-n6 | off | 198 / 205 | 305 / 325 (+107 / +120) | 199 / 205 (+1 / +0) |
| pidgey-n6 | on | 198 / 205 | 305 / 325 (+107 / +120) | 199 / 205 (+1 / +0) |
| metapod-n6 | off | 240 / 247 | 305 / 325 (+65 / +78) | 241 / 247 (+1 / +0) |
| metapod-n6 | on | 240 / 247 | 305 / 325 (+65 / +78) | 241 / 247 (+1 / +0) |
| torkoal-n6 | off | 201 / 208 | 305 / 325 (+104 / +117) | 202 / 208 (+1 / +0) |
| torkoal-n6 | on | 306 / 313 | 305 / 325 (-1 / +12) | 307 / 313 (+1 / +0) |
| torkoal-n0 | off | 201 / 208 | 305 / 325 (+104 / +117) | 202 / 208 (+1 / +0) |
| torkoal-n0 | on | 306 / 313 | 305 / 325 (-1 / +12) | 307 / 313 (+1 / +0) |
| torkoal-n10 | off | 201 / 208 | 305 / 325 (+104 / +117) | 202 / 208 (+1 / +0) |
| torkoal-n10 | on | 306 / 313 | 305 / 325 (-1 / +12) | 307 / 313 (+1 / +0) |
| butterfree-n6 | off | 206 / 213 | 305 / 325 (+99 / +112) | 207 / 213 (+1 / +0) |
| butterfree-n6 | on | 268 / 275 | 305 / 325 (+37 / +50) | 269 / 275 (+1 / +0) |
| bulbasaur-n0 | off | 223 / 230 | 305 / 325 (+82 / +95) | 224 / 230 (+1 / +0) |
| bulbasaur-n0 | on | 242 / 249 | 305 / 325 (+63 / +76) | 243 / 249 (+1 / +0) |
| bulbasaur-n10 | off | 223 / 230 | 305 / 325 (+82 / +95) | 224 / 230 (+1 / +0) |
| bulbasaur-n10 | on | 271 / 278 | 305 / 325 (+34 / +47) | 272 / 278 (+1 / +0) |
| wigglytuff-n6 | off | 202 / 209 | 305 / 325 (+103 / +116) | 203 / 209 (+1 / +0) |
| wigglytuff-n6 | on | 245 / 252 | 305 / 325 (+60 / +73) | 246 / 252 (+1 / +0) |
| typhlosion-n6 | off | 285 / 292 | 305 / 325 (+20 / +33) | 286 / 292 (+1 / +0) |
| typhlosion-n6 | on | 309 / 316 | 305 / 325 (-4 / +9) | 310 / 316 (+1 / +0) |
| castform-n6 | off | 213 / 219 | 305 / 325 (+92 / +106) | 213 / 219 (+0 / +0) |
| castform-n6 | on | 268 / 274 | 305 / 325 (+37 / +51) | 268 / 274 (+0 / +0) |
| magby-n6 | off | 213 / 220 | 305 / 325 (+92 / +105) | 214 / 220 (+1 / +0) |
| magby-n6 | on | 304 / 311 | 305 / 325 (+1 / +14) | 305 / 311 (+1 / +0) |

**Action prompt: 24 / 24 rows residual 0 (base: +9 .. +120).** Next print: 22 rows are ROM next print + 1 (the render lag above; base: -4 .. +107),
CASTFORM (2 rows) is +0: the ROM's CASTFORM next print is B + D + 11 while its prompt stays B + D + 17, i.e. 6 blank frames instead of 7 (the pfr185
documented +-1), which is exactly production's blank length (6), so CASTFORM's blank start equals the ROM state frame and is one frame early
against its screen (the one explained +-1). Production's menu is open from frame P; the ROM *screen* shows it at P + 1 (7 blank frames vs
production's 6 + menu) -- a convention trade-off kept so the orchestrator's frame of menu ownership equals the ROM controller's `HandleInputChooseAction` frame.

Real routes (the generated-rental kernel + `projectBattleResolutionCommands` + orchestrator; `generatedCommandAnimationReplay`, replacement answered
DOWN / A / A; seeds 1..40, both scenes, `prod-routes.log`): 50 replacement send-ins over 24 species; the 46 whose segment continues with exactly
`turn-end` open the menu at exactly 91 + name + D + 17 (**46 / 46 residual 0**). The other 4 (an ability/stat message follows the switch-in, e.g.
seeds 2 and 34) keep the clock ready at P and run their own tail afterwards; there is no ROM row for them (not claimed).

### 2. Dense pixel comparison, production vs ROM (`fixtures/pfr192/dense-summary.json`)

Rows = confirm-relative frames e in [56, promptE - 1], each compared RGB-exact with the ROM screen frame `confirmFrame + e` (delta 0), opponent half
masked. 18 runs = 9 ROM cases x both scenes: MAGBY (male and female), METAPOD (cry-bound), TORKOAL and BULBASAUR n10 (back-animation-bound ON),
PIDGEY, BUTTERFREE, CASTFORM, TYPHLOSION.

| case | scene | rows | zero-mismatch rows | mismatched px (phb / mon / msg) | nonzero e ranges |
|---|---|---|---|---|---|
| MAGBY female (canonical art) | on | 255 | **255** | **0** | none (base: 256 of 258 rows exact, 12,072 msg px in the other 2) |
| MAGBY female | off | 164 | 137 | 28,080 (0 / 28,080 / 0) | mon 162-166, 184-205 (unchanged from base: 28,080) |
| MAGBY male | on | 255 | 128 | 6,387 (6,387 / 0 / 0) | phb 170-296: the canonical healthbox art is female 138/138 |
| MAGBY male | off | 164 | 123 | 29,735 | as female + 1,655 phb |
| METAPOD (cry-bound) | off / on | 191 / 191 | 115 / 79 | 496,202 / 516,683 | fade 56-70, ball y 106-142, release 147-185 (ON to 221) |
| TORKOAL (ON back-bound) | off / on | 152 / 257 | 83 / 84 | 500,469 / 686,305 | as above; ON to 289 (no back animation drawn) |
| PIDGEY | off / on | 149 / 149 | 58 / 58 | 505,599 / 507,342 | fade 56-70, ball y 106-142, release 146-184 |
| BUTTERFREE | off / on | 157 / 219 | 66 / 65 | 513,949 / 654,473 | fade 56-70, ball y 110-146, release 150-188 (ON to 253) |
| CASTFORM | off / on | 163 / 218 | 62 / 55 | 504,322 / 562,213 | fade, ball y 104-, release 149- (ON to 252) |
| BULBASAUR n10 (ON back-bound) | off / on | 174 / 222 | 81 / 64 | 501,495 / 551,401 | fade 56-70, ball y 106-144, release 149-187 (ON to 252) |
| TYPHLOSION | off / on | 236 / 260 | 139 / 60 | 517,105 / 745,066 | fade 56-70, ball y 105-146, release 150-189 (ON to 292) |

Reading: **no row mismatches because of message / blank / menu timing** -- the message region mismatches only in the 15 battle-fade-in rows 56-70
(`msg` = 15 x 11,520 = 172,800), plus CASTFORM's single explained blank-start row (213 OFF / 268 ON, the +-1 of 1). What remains are renderer-fidelity residuals of the *generic* forced-select path, none timing-keyed:
(a) battle fade-in rows 56-70: the generic renderer's palette fade differs from the canonical MAGBY one (72,000 phb + 172,800 msg + mon px);
(b) ball flight: the ball's centre is MAGBY-calibrated (stepY 562 from MAGBY's back-pic y offset), the ROM's ball is 1 px higher from ~B + 9
(88 px per row; the first texel and x are exact for all 9 species -- first texel B + 3, CASTFORM B + 4, fixed here);
(c) release window: no release palette fade / back animation (Scene ON) in the generic path, so ON rows run to the prompt; (d) MAGBY OFF release
window (28,080 px, pre-existing and identical to base).
Fixed on the way: the generic party-summary tray was kept to the ball-relative release start (frame ~145); the ROM drops it at confirm-relative
frame 70 for every species (PIDGEY ON: phb 147,302 -> 119,777 px, zero rows 20 -> 58); CASTFORM's ball first texel is B + 4.

### 3. Tier-1 tests (`tests/pfr192PlayerFaintSendInClock.test.ts`, 8 tests)

All 24 ROM rows' first menu frame; MAGBY ON prompt 311 from the confirm (ready 297, blank 305, phases 296 / 297); TORKOAL OFF 208 vs ON 313 (nature
does not move OFF); CASTFORM (ball shift 3, release extra 1, 219 / 274, blank 213 / 268); non-`[turn-end]` segment keeps readyAt = P; default timing
= 305 / 311 / 10 chars; control: `switchInTiming(0, ..)` voluntary = `SWITCH_IN_SPAN_FRAMES` 91 unchanged; a real generated route (seed 9: YANMA OFF
227, ON 270 from the SEND OUT confirm through the orchestrator).

### 4. Census 0..999, both scenes (`tools/integration/pfr192Census.{ts,sh}`, `pfr192CensusDelta.py`, `fixtures/pfr192/census-delta-{on,off}.json`)

CENSUS_PLACEHOLDER

### 5. `npm run compare:differential -- fight-submenu battle1-postwin-next-prompt presentation-rng-playable-live-bodies-seeded-on --base 4aaf090be`

PASS: fight-submenu 235 / 235, battle1-postwin-next-prompt 216 / 216, presentation-rng-playable-live-bodies-seeded-on 190 / 190 captures
byte-identical (641 / 641, 0 differences). Expected: all three traces use the canonical MAGBY send-in paths (default timing).

### 6. Re-pins

None needed. `tests/partySelect.test.ts` (:259-271), `tests/fightSubmenu.test.ts` (:364-371), `tests/battleSceneResolutionOwner.test.ts` (:64) and
`tests/battle2ActionMenu.test.ts` (`ACTION_MENU_BLANK_START_OFFSET`) pass unchanged: they drive the canonical (default-timing) path. (Full-suite
result below.)

### 7. Gates

GATES_PLACEHOLDER

## Residuals / not done

- Generic forced-select renderer fidelity (fade-in 56-70, ball y path, release palette fade, Scene ON back animation) -- see 2; not timing.
- Segments whose switch-in is followed by anything other than `turn-end` keep the old "clock ready at P, tail afterwards" shape with no ROM row.
- Out of scope, unchanged: shiny send-ins, CRY_MODE_WEAK, Baton Pass, voluntary switch-in, opponent Scene ON tail.
