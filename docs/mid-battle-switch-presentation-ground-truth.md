# Mid-battle voluntary switch presentation ground truth (ISSUES #78)

Ground-truth scout for ISSUES #78: in live play a mid-battle voluntary switch
(a) shows the incoming Pokémon popping into existence with no materialize, and
(b) the opponent's move fires immediately after with no send-out cadence. This
doc banks the real game's mid-battle switch schedule frame-by-frame under
**Battle Scene OFF** (mechanicLab, `overrides.parties`), attributes every
boundary to its source mechanism, and names the app-side gaps a MAIN bind step
can execute without re-deriving anything.

Measurement receipt: everything below was measured **twice fresh** (two
independent oracle runs of the dense chunk `dense-a`, frames 1000-1255) and the
two runs are **byte-identical**: **256/256 PNG `sha256`s equal** and all
semantic state equal. The schedule is deterministic for this staged trace.
Sprite-level facts (ball throw, ball-release emerge, healthbox slide) were
confirmed with a RAM probe (`tools/probe/dump-midbattle-switch-ram.py`)
replaying the exact same scenario in-process through `BattleLab.prepare`.

Scratch traces (committed):
- `tools/battle-lab/scratch-mid-battle-switch-coarse-off.json` — coarse sweep.
- `tools/battle-lab/scratch-mid-battle-switch-dense-menu-a-off.json` /
  `-b-off` — every frame 700-999 (party-menu open through menu fade-out).
- `tools/battle-lab/scratch-mid-battle-switch-dense-a-off.json` — every frame
  1000-1255 (recall through the send-in materialize).
- `tools/battle-lab/scratch-mid-battle-switch-dense-b-off.json` — every frame
  1256-1460 (opponent move through next input-ready).

Per-frame diff helper: `tools/probe/analyze-switch-window.py`. RAM probe:
`tools/probe/dump-midbattle-switch-ram.py` (run via `tools/run-mgba-probe.py`
with the mgba-venv interpreter).

---

## 1. Staged scenario

`mechanicLab` OFF trace, `overrides.parties`, seed 1. Both sides field three
**RATTATA (species 19)**, level 50, 31 IVs, 0 EVs, `abilitySlot 0`, item none.
Player: `MOVE_SPLASH` (150) ×4 on all three. Opponent: `MOVE_SPLASH` ×4 on all
three (all four slots identical, so the Factory AI's only legal move is Splash
— no AI injection). Turn 1 is a double Splash (no damage, no status). Turn 2
the player opens the party menu and voluntarily switches from slot 0 to slot 1.

Input recipe (the proven `DOWN, A, RIGHT, A, A` sequence from
`docs/battle-resolution-adapter-ground-truth.md`'s "Staging recipes" section):
`A(2f)`, idle 18f, `A(2f)` (fight menu → move 1), idle 700f (turn 1 resolves),
then `DOWN(2f)` (fight menu cursor FIGHT→POKéMON), idle 38f, `A(2f)` (open
party menu), idle 118f, `RIGHT(2f)` (menu cursor slot 0→1), idle 38f, `A(2f)`
(open SEND OUT / SUMMARY / CANCEL submenu, default = SEND OUT), idle 38f,
`A(2f)` (confirm), idle 900f. There is **no Yes/No confirmation dialog** for a
voluntary menu switch (unlike the forced-switch flow's `CANCEL` path).

Frame numbers below are battle-lab trace frames (frame 0 = post-checkpoint,
the fight menu is already open).

## 2. Dense schedule (Battle Scene OFF, deterministic)

| Frame | Event | Mechanism (file:line) |
| ---: | --- | --- |
| 0-721 | Fight menu open (input-ready). | `CONTROLLER_CHOOSEACTION` (id 18), `PlayerHandleActionSelection`, `battle_controller_player.c:198-306`. |
| 722-723 | `DOWN` press — action cursor FIGHT→POKÉMON. | `gActionSelectionCursor` XOR bit1, `battle_controller_player.c:278-283`. |
| 762-763 | `A` — open party menu. | `PlayerHandleChoosePokemon`, `battle_controller_player.c:2665-2688` (fade, then `OpenPartyMenuInBattle`). |
| ~764-1000 | Party-menu fade-in + interactive (stable 1000-1018, zero pixel diff). | `gPartyMenu.action = 0` (`PARTY_ACTION_CHOOSE_MON`), `party_menu.c`. |
| 1019-1034 | Party-menu **fade-out**, 16 frames (biggest single-frame diffs of the whole window: ~114 760 px). | menu-close palette fade; `CONTROLLER_CHOOSEPOKEMON` (id 22) still current. |
| 1035-1036 | `exec=0` (controller handoff). | — |
| 1037-1042 | Idle (menu gone, box empty, no sprites changed). | — |
| 1043-1076 | **"RATTATA, that's enough!\nCome back!"** — printstring command 1043, glyphs land 1044-1076 (~33-35 frames @ 1 glyph/frame, FAST). | `printstring STRINGID_RETURNMON` (`battle_scripts_1.s:3090`); `sText_PkmnThatsEnough[] = "{B_BUFF1}, that's enough!\nCome back!"` (`battle_message.c:403`, chosen at `:2079-2082` for `hpScale == 0`); printer at FAST speed. |
| 1077-1085 | Recall-message hold (9f) — printer completion → script advance. **No `waitmessage` on this line.** | `Cmd_printstring` (`battle_script_commands.c:2137-2146`); `BattleScript_ActionSwitch` runs `switchoutabilities` + `waitstate` (`battle_scripts_1.s:3112-3113`) with no waitmessage. |
| 1086-1117 | **`CONTROLLER_RETURNMONTOBALL`** (id 6), 32 frames. Old mon's switch-out animation: affine scale-up 256→736 (1.0→2.9×, frames 1100-1110), sprite freed ~1111-1117; player side empty from ~1117. Recall message **stays on the box the whole time** (only wiped by the next `printstring`). | `returnatktoball` (`battle_scripts_1.s:3114`) → `PlayerHandleReturnMonToBall` (`battle_controller_player.c:2227-2242`) → `DoSwitchOutAnimation` (`:2244-2259`) → `InitAndLaunchSpecialAnimation(… B_ANIM_SWITCH_OUT_PLAYER_MON)`. |
| 1119-1120 | `CONTROLLER_DRAWPARTYSTATUSSUMMARY` (id 48). | `drawpartystatussummary` (`battle_scripts_1.s:3116`). |
| 1121 | **`getswitchedmondata`**: `gBattlerPartyIndexes[0]` flips **0→1** (RAM-confirmed). | `Cmd_getswitchedmondata` (`battle_script_commands.c:4606-4619`, `:4613`); `switchhandleorder`/`switchindataupdate` on `battle_scripts_1.s:3117-3118`. |
| 1125-1137 | **"Go! RATTATA!"** — printstring command 1125, glyphs land 1126-1137 (12 glyphs @ 1/frame). | `printstring STRINGID_SWITCHINMON` (`battle_scripts_1.s:3120`); `sText_GoPkmn2[] = "Go! {B_BUFF1}!"` (`battle_message.c:398`, chosen at `:2109-2112`). **No `waitmessage` — its visible hold is the switch-in animation that follows.** |
| 1138 | Hold. | — |
| 1139 | `CONTROLLER_HIDEPARTYSTATUSSUMMARY` (id 49). | `hidepartystatussummary` (`battle_scripts_1.s:3121`). |
| 1140-1230 | **`CONTROLLER_SWITCHINANIM`** (id 5), 91 frames. See §3 for the sub-phases. "Go! RATTATA!" stays on the box the whole time. | `switchinanim BS_ATTACKER, FALSE` (`battle_scripts_1.s:3122`) → `PlayerHandleSwitchInAnim` (`battle_controller_player.c:2185-2194`). |
| ~1230-1238 | `exec=0`: `waitstate` releases; `switchineffects`, `moveendcase`s, `end2`. | `battle_scripts_1.s:3123-3126`. |
| 1239-1240 | Opponent's next move (Splash) loaded (`currentMove=150`). | AI move selection + `gCurrentMove`. |
| 1241-1264 | **"Foe RATTATA used SPLASH!"** — command 1241, glyphs 1242-1264 (24 glyphs @ 1/frame). | `attackstring` (`BattleScript_EffectSplash`, `battle_scripts_1.s:1172-1179`). |
| 1265-1302 | Hold (38f) — Splash's Scene-OFF `attackanimation`/`waitanimation` controller lifetime. | `battle_scripts_1.s:1175-1176`. |
| 1303-1324 | **"But nothing happened!"** — command 1303, glyphs 1304-1324 (22 glyphs @ 1/frame). | `printstring STRINGID_BUTNOTHINGHAPPENED` (`battle_scripts_1.s:1178`), `sText_ButNothingHappened` (`battle_message.c:333`). |
| 1325-1388 | **`waitmessage B_WAIT_TIME_LONG`** hold, exactly 64 frames. | `battle_scripts_1.s:1179`; `B_WAIT_TIME_LONG = 64` (`include/constants/battle.h:324`); `Cmd_waitmessage` (`battle_script_commands.c:2159-2178`). |
| 1389-1406 | Turn-end: `moveend` → `end2` → turn passes → fight menu opens; box wiped at 1406. | `BattleTurnPassed`/`HandleTurnActionSelectionState` (`battle_main.c:3956-4019`). |
| **1407** | **Next input-ready**: Fight menu drawn (`CONTROLLER_CHOOSEACTION`, id 18). | — |

Total switch presentation (recall message start 1043 → next input-ready 1407):
**365 frames (~6.1 s)**. Of that, the send-out cadence between "Go! RATTATA!"
(last glyph 1137) and the opponent's "used SPLASH!" first glyph (1242) is
**105 frames**.

## 3. The send-in (`SWITCHINANIM`, frames 1140-1230) — RAM-confirmed sub-phases

The sprite-level facts below are from the RAM probe (`dump-midbattle-switch-ram.py`),
which replays the identical scenario and reads `gBattlerSpriteIds[0]`, the
sprite's `invisible`/`affineAnimEnded` bits, its OAM affine matrix
(`gOamMatrices[matrixNum].pa/pd`), the ball-throw sprite (template inside
`gBallSpriteTemplates`), and the healthbox state each tick.

| Frame | Phase | RAM/pixel evidence | Mechanism |
| ---: | --- | --- | --- |
| 1140 | Switch-in starts. Battler sprite created **invisible** at (72,93); **ball sprite created at (24,68)**; `healthBoxesData[0].ballAnimActive = 1`. | RAM: sprite id 5 invisible; ball sprite id 6 at (24,68); `hbBallAnimActive=1`. | `PlayerHandleSwitchInAnim` (`battle_controller_player.c:2185-2194`) → `StartSendOutAnim` (`:2196-2225`): mon sprite `invisible=TRUE`, `SpriteCB_WaitForBattlerBallReleaseAnim` on the controller sprite, `DoPokeballSendOutAnimation(0, POKEBALL_PLAYER_SENDOUT)` (`pokeball.c:335-352`). |
| 1141-1185 | **Ball-throw arc** (45 frames). Ball sprite renders via x2/y2 arc translation; pixel evidence shows it moving right-down from ~(29,78) to the mon's spot. | RAM: ball sprite persists at base (24,68); pixels: ball blob drifts toward (72,93). | `SpriteCB_PlayerMonSendOut_1` (`pokeball.c:911-921`) → `SpriteCB_PlayerMonSendOut_2` (`:924-985`). |
| 1186 | Ball **lands** at (72,128); mon emerge begins: affine scale **pa 1638 ≈ 6.4×**; battler-sprite callback → `SpriteCB_PlayerMonFromBall`. | RAM: ball at (72,128); `pa=1638`; callback `0x08039E44`. | `TranslateAnimHorizontalArc` completes → `SpriteCB_ReleaseMonFromBall`; `SpriteCB_PlayerMonFromBall` (`battle_main.c:2987-2990`). |
| 1188 | **Mon becomes visible** (`invisible` clears, `pa≈862`). | RAM: `invisible=0`, `pa=862`. | ball-release callback sets the mon visible + starts the emerge affine. |
| 1188-1199 | **Materialize / emerge scale-down**: `pa` 862 → 256 (1.0×) over 12 frames. This is the real game's mid-battle materialize under Scene OFF — the ball-release scale-down, **not** the species' per-species front entrance (which never plays, ISSUES #71 Slice-D). | RAM: `pa` 862→697→585→504→442→394→356→324→297→275→256. | ball-open + `LaunchBallFadeMonTask`/emerge affine (`pokeball.c`); the mon's callback then runs `BattleAnimateBackSprite` (idle setup, `battle_main.c:2988`). |
| 1199-1202 | Emerge done: `pa=256`; `hbBallAnimActive` clears (1200); ball sprite destroyed; `affineAnimEnded=1` (1202). | RAM. | `SpriteCB_WaitForBattlerBallReleaseAnim` (`battle_gfx_sfx_util.c:361-373`) releases the controller sprite; `SwitchIn_TryShinyAnimShowHealthbox` (`battle_controller_player.c:1098-1116`) takes over. |
| 1203 | Mon callback → back-sprite idle (bounce phase begins ~1206; sprite x2/y2 sine oscillation ±16 for ~32 frames). | RAM: callback `0x08183A61` (pokemon_animation.o). | `BattleAnimateBackSprite` idle setup. |
| 1205-1227 | **Healthbox slide-in**: healthbox sprite x2 110→0 at **5 px/frame**, 23 frames; callback `0x080769CD` = `SpriteCB_HealthboxSlideIn`. | RAM: `hbX2` 110,105,…,5,0 (1205-1227); `hbCallback` flips to `0x080769CD` at 1205, back to `SpriteCallbackDummy` at 1227. | `StartHealthboxSlideIn` (`pokeball.c:1241-1269`) — x2=0x73 (115), sSpeedX=5, `SpriteCB_HealthboxSlideIn` decrements 5/frame. |
| 1238-1239 | Settle: battler-sprite callback → `SpriteCallbackDummy` (0x08007428). | RAM. | — |

**Answer to ISSUES #78(a):** under Scene OFF the real game's mid-battle
switch-in **does** show a materialize — the ball-release emerge: ball throw
(45f) → ball lands (1186) → mon becomes visible scaling down 6.4×→1.0×
(1188-1199) → healthbox slides in (1205-1227). The **species' per-species front
entrance animation never plays** (ISSUES #71 Slice-D — `BattleAnimateBackSprite`
only installs the idle bounce, no per-species entrance), but the ball throw +
ball-release scale-down + healthbox slide are real and must be modeled. The app
currently pops the incoming mon in with none of these.

**Answer to ISSUES #78(b):** after "Go! RATTATA!" types (completes 1137), the
real game holds the box through the whole 90-frame send-in (1140-1230) and only
then starts the opponent's move message (first glyph 1241). The app fires the
opponent's move right after the 1-frame switch-in.

## 4. Message cadence details (why there is no `waitmessage` on the switch lines)

Unlike the stat-change/resultmessage family (`docs/battle-message-hold-cadence-ground-truth.md`
§3), the two switch lines are **not** waitmessage-gated:

- `STRINGID_RETURNMON` (`BattleScript_ActionSwitch`, `battle_scripts_1.s:3088-3121`):
  printed at `:3090`, then `setbyte`/pursuit checks/`switchoutabilities`/`waitstate`/
  `returnatktoball`/`waitstate`. Its visible hold (1043-1124, **82 frames**) is the
  return-to-ball controller round-trip, not a `waitmessage`.
- `STRINGID_SWITCHINMON`: printed at `:3120`, then `hidepartystatussummary`/`switchinanim`/
  `waitstate`. Its visible hold (1125-1239, **115 frames**) is the whole send-in
  animation.

The only `waitmessage` on this whole window is `But nothing happened!`'s
`B_WAIT_TIME_LONG` (64f, measured 1325-1388 exactly). So the bind step must
**not** give the two switch lines a `waitmessage` hold — their hold is the
switch-out/switch-in animation duration, which the presentation must supply as
real animation commands (or a minimum-frames span) between the messages.

## 5. App-side gap list (read-only findings)

Live route (kernel events → `battleResolutionPresentation` → orchestrator →
`battleScene`):

1. **The incoming mon pops in.** `switch-in` command renders as an instant
   field swap:
   - `SWITCH_IN_TIMING = { minimumFrames: 1 }` (`battleResolutionPresentation.ts:431`).
   - `battleResolutionCommandDuration` returns `minimumFrames` (1) for
     `"switch-in"` (`battleResolutionPresentationRender.ts:295-299`).
   - The renderer applies the swap via `replaceFieldBattler(field, battler,
     incoming)` (`battleResolutionPresentationRender.ts:232-234`) — no ball,
     no materialize, no healthbox slide.
2. **No send-out cadence before the opponent's move.** After the 1-frame
   switch-in, the next command (opponent's `STRINGID_USEDMOVE`) starts
   immediately. The real 105-frame "Go!"→opponent-move gap (1137→1242, §2) is
   entirely the send-in animation the route skips.
3. **The two switch messages use the generic flash timing.** `STRINGID_RETURNMON`
   and `STRINGID_SWITCHINMON` fall through the `STAT_CHANGE_MESSAGE_IDS.has(...)`
   branch to `MESSAGE_TIMING` (`{ minimumFrames: 24, holdFrames: 0 }`,
   `battleResolutionPresentation.ts:2733-2735`, `:383`). The recall line shows
   only `max(24, ~35) ≈ 35f` instead of the real 82f; "Go!" shows `24f` instead
   of 115f. Their real hold is the animation span (§4), so the fix is to time
   the animation commands, not to add `holdFrames`.
4. **The ball-release materialize + healthbox-slide renderers exist only for
   battle-START** (`battleScene.ts:4240-4721`:
   `drawGeneratedOpponentRelease`, `renderGeneratedBattleStartPlayerRelease`,
   `drawGeneratedPlayerMaterialize`; the materialize affine table
   `sAffineAnim_Battler_Emerge` is already extracted and used there). There is
   **no mid-battle switch-in path** that invokes these — the live route's
   steady-state field renderer just draws the current field battler.
5. Kernel side is ready: `switch` + `switch-in-animation` events exist
   (`battleScriptEvents.ts:297`, emitted by `battleScriptSwitchinOpcode.ts:661`,
   consumed at `battleResolutionPresentation.ts:2962-3011`), and the `switch-in`
   command already carries `incoming` (species, stats) — a binder needs only the
   timing/animation, not new plumbing.

## 6. Bind plan (for a MAIN worker)

Bounded, independently verifiable slices, in dependency order:

1. **Time the switch-in span (cheap, closes (b) first).** Replace the 1-frame
   `SWITCH_IN_TIMING` with a span that covers the real send-in cadence
   (~90f: ball throw 45f + emerge 14f + healthbox 23f + settle), and give the
   `switch-in` command a `minimumFrames` ≈ 90 (or split it into sub-commands).
   With `latestMessage` persistence (already correct, per the #77 doc's §5),
   this alone makes "Go! RATTATA!" hold and pushes the opponent's move to the
   right frame. **Acceptance:** replay
   `scratch-mid-battle-switch-dense-a/b-off.json`; "Go!" box must persist 1137→~1230
   and the opponent's "used SPLASH!" first glyph must land at ~1241 in dense
   compare, not immediately after the switch.
2. **Model the ball-release materialize (closes (a)).** Reuse the battle-START
   materialize machinery: ball sprite throw from the player corner (~45f),
   ball lands, mon appears scaling 6.4×→1.0× (12f, `pa` 1638→256, §3), then the
   idle bounce. The affine values are the same `sAffineAnim_Battler_Emerge`
   table the start-release already uses (`battleScene.ts:1223` doc). **Acceptance:**
   dense pixel compare of frames 1186-1199 must show the scale-down (region
   diff signature per `tools/probe/analyze-switch-window.py` + the RAM `pa`
   ramp pinned in §3 as a Tier-1 unit test of the new renderer).
3. **Healthbox slide-in (small).** After the emerge, slide the player healthbox
   115px over 23 frames at 5px/frame (`StartHealthboxSlideIn`, `pokeball.c:1241-1269`),
   reusing whatever healthbox-draw primitive the live route already has.
4. **Recall-side span.** Extend the `STRINGID_RETURNMON` hold to the real 82f
   (message → return-to-ball → party-summary → getswitched) by timing it with a
   small `switch-out` command or a minimum-frames span, so the outgoing mon's
   scale-up (1100-1110) and teardown have a real window. (Optional for the
   first bind; the incoming-side materialize is the visible defect.)

**Explicitly out of scope for the bind:** the party menu's own visual parity
(ISSUES #80 — the menu pixels here are context, not acceptance); message
hold-timing constants for the waitmessage family (ISSUES #77 — a MAIN worker
binds those); and any change to the kernel's switch logic (already real).

## 7. Out of scope / notes

- No `Random()` is drawn anywhere in the switch window: the RAM probe's `rngValue`
  is byte-identical across the whole 1035-1460 span (matching the forced-switch
  finding in `docs/forced-switch-ground-truth.md` §2b/§3d — switching is
  RNG-free). This trace adds the voluntary path to that ledger.
- The opponent-side switch-in follows the same `StartSendOutAnim` machinery
  (`OpponentHandleSwitchInAnim`, `battle_controller_opponent.c:1160`), but the
  opponent never voluntarily switches in this fixture; only the player side was
  probed.
- Battle-START send-outs are a distinct, verified path (the generated-route
  release); nothing in this doc changes that. The mid-battle switch path is the
  one that needs the bind.
## 8. Ball-fade palette curves (ISSUES #78 residual 1)

The two residual classes PROGRESS 957 left open are now measured dense. This
section banks the per-frame palette curves for the white ball-fade
(`LaunchBallFadeMonTask`), and §9 banks the party-summary panel. Both were
measured with a fresh RAM probe
(`tools/probe/dump-midbattle-switch-fade-palette.py`, committed) replaying
the identical dense-a scenario in-process; the probe reads
`gPlttBufferFaded`/`gPlttBufferUnfaded` (all 512 entries), the decoded
`gPaletteFade` control struct, and the fade task, each tick. **Two
independent probe runs (frames 1000-1255) are byte-identical on every common
field** (fade state, task data, full palette arrays). Receipt:
`docs/probes/mid-battle-switch-ball-fade-palette/palette-ram-probe.json`
(frames 1080-1235) + the oracle PNGs for 1093-1126 in the same dir.

### 8.1 What fades, and which rows

The real game fades **exactly four 16-color rows** (nothing else — the
healthbox and every other sprite's palette row are untouched, verified by
row-diff over the whole window):

| Row | Index | Palette | Effect | Source |
| ---: | ---: | --- | --- | --- |
| BG 1 | 0x010..0x01F | battle-field tiles | **white fade** (in, hold, out) | `BeginNormalPaletteFade(0xe, 0, 0, 16, RGB_WHITE)` |
| BG 2 | 0x020..0x02F | battle-field tiles | white fade (same curve, identical values) | same |
| BG 3 | 0x030..0x03F | battle-field tiles | white fade (same curve, identical values) | same |
| OBJ `paletteNum` (16 = 0x100..0x10F here) | player mon sprite | **ball-color blend** (normal→POKE BALL on recall; POKE BALL→normal on send-in) | `BlendPalette(OBJ_PLTT_ID(tPalOffset), 16, tCoeff, gBallOpenFadeColors[ballId])` |

`selectedPalettes = 0xe` = bits 1,2,3 — i.e. **BG palettes 1-3 only**,
exactly `GetBattlePalettesMask(TRUE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE)`
(`battle_anim_throw.c:693`, the first flag selects the healthbox-independent
field mask — the observed 0xe is the field-tile palette set). The player
mon's sprite OBJ palette is `GetBattlerSpritePaletteNumber(battler)`'s row
(here `paletteNum 0`, confirmed from the sprite's `attr2`), passed as
`sprite->sBattler`/`gBattleAnimAttacker` straight into
`LaunchBallFadeMonTask`'s `spritePalNum`.

The blend target colors (both verified against the actual faded RAM rows):

- `RGB_WHITE` = 0x7FFF (`include/constants/rgb.h`).
- POKE BALL fade color = `gBallOpenFadeColors[BALL_POKE] = RGB(31, 22, 30)`
  = **0x7ADF** (`battle_anim_throw.c:371-384`, `:373`).

Two extra OBJ rows change but are *not* part of the fade: the **ball-open
particle palette** (`gBattleAnimSpritePal_CircleImpact`,
`battle_anim_throw.c:159-173`) is loaded into OBJ row 22 (0x160) on the
recall (created by `AnimTask_SwitchOutBallEffect`'s `AnimateBallOpenParticles`,
`battle_anim_throw.c:692`) and OBJ row 23 (0x170) on the send-in (created by
`SpriteCB_ReleaseMonFromBall`'s `AnimateBallOpenParticles`,
`pokeball.c:757`). The row differs between the two windows because the
palette allocation slot depends on what is free at that moment; the values
are identical (banked verbatim in the receipt).

### 8.2 The mechanism (both windows are the same two-stage machine)

`LaunchBallFadeMonTask` (`battle_anim_throw.c:2033-2058`) does three things
in one tick: it sets the mon's OBJ row to a ball-color blend, starts a
`BeginNormalPaletteFade`, and installs a follow-through task:

- **Recall side** — launched by `AnimTask_SwitchOutBallEffect`
  (`battle_anim_throw.c:669-702`, from `Special_SwitchOutPlayerMon`'s
  `createvisualtask`, `battle_anim_scripts.s:10713-10717`) with
  `unfadeLater=FALSE`: `BlendPalette(OBJ, 16, 0, ball)` (identity), then
  `BeginNormalPaletteFade(0xe, 0, 0, 16, RGB_WHITE)` (white in), and task
  `Task_FadeMon_ToBallColor` ramps the ball blend **0→16**.
- **Send-in side** — launched by `SpriteCB_ReleaseMonFromBall`
  (`pokeball.c:750-824`, `:758`) with `unfadeLater=TRUE`:
  `BlendPalette(OBJ, 16, 16, ball)` (fully ball-colored), then the same
  white-in fade, and task `Task_FadeMon_ToNormal` waits for the fade, starts
  the white-out (16→0), and its `_Step` ramps the ball blend **16→0**.

`BeginNormalPaletteFade` (`palette.c:156-200`): `deltaY=2`, `y` steps toward
`targetY` by 2 every *two* `UpdatePaletteFade` calls
(`palette.c:406-490`), and — critically for a frame-exact bind — **BG
palettes are only re-blended on the BG-toggle frames** (`objPaletteToggle==0`
at update entry); on the intervening OBJ-toggle frames the BG rows keep the
previous frame's blend. `BlendPalette` is a linear per-channel
interpolation with the source's exact arithmetic:
`faded = c + (((target - c) * coeff) >> 4)` with a signed (arithmetic) shift
(`util.c:264-278`). The finish plateau is `softwareFadeFinishing`
(`palette.c:807-828`): `y` freezes at the target for 4+1 ticks while
`active` stays set, and the *next* `BeginNormalPaletteFade` cannot start
until it clears — so the two fades never overlap.

### 8.3 Per-frame coefficient tables (verified byte-exact against RAM)

"bg" = the white-fade coefficient applied to BG rows 1-3 that frame (the
per-frame `gPaletteFade.y` on BG-toggle frames, held one frame on
OBJ-toggle frames). "obj" = the ball-color coefficient applied to OBJ row
`paletteNum` that frame. The model reproduces **every frame's actual
16-color rows 1,2,3 and OBJ `paletteNum` exactly** (144/144 frames,
0 mismatches). "fin" = `softwareFadeFinishing`.

**Recall window (white in 1088-1104, plateau 1105-1109, white out
1110-1126; mon row 0→16→held):**

| Frame | bg | obj | y | fin | | Frame | bg | obj | y | fin |
| ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 1088 | 0 | 0 | 0 | . | | 1110 | 16 | 16 | 16 | . |
| 1089 | 0 | 0 | 2 | . | | 1111 | 16 | 16 | 14 | . |
| 1090 | 2 | 1 | 2 | . | | 1112 | 14 | 16 | 14 | . |
| 1091 | 2 | 2 | 4 | . | | 1113 | 14 | 16 | 12 | . |
| 1092 | 4 | 3 | 4 | . | | 1114 | 12 | 16 | 12 | . |
| 1093 | 4 | 4 | 6 | . | | 1115 | 12 | 16 | 10 | . |
| 1094 | 6 | 5 | 6 | . | | 1116 | 10 | 16 | 10 | . |
| 1095 | 6 | 6 | 8 | . | | 1117 | 10 | 16 | 8 | . |
| 1096 | 8 | 7 | 8 | . | | 1118 | 8 | 16 | 8 | . |
| 1097 | 8 | 8 | 10 | . | | 1119 | 8 | 16 | 6 | . |
| 1098 | 10 | 9 | 10 | . | | 1120 | 6 | 16 | 6 | . |
| 1099 | 10 | 10 | 12 | . | | 1121 | 6 | 16 | 6 | . |
| 1100 | 12 | 11 | 12 | . | | 1122 | 6 | 16 | 4 | . |
| 1101 | 12 | 12 | 14 | . | | 1123 | 4 | 16 | 4 | . |
| 1102 | 14 | 13 | 14 | . | | 1124 | 4 | 16 | 2 | . |
| 1103 | 14 | 14 | 16 | . | | 1125 | 2 | 16 | 2 | . |
| 1104 | 16 | 15 | 16 | . | | 1126 | 2 | 16 | 0 | . |
| 1105 | 16 | 16 | 16 | 1 | | 1127 | 0 | 16 | 0 | . |
| 1106 | 16 | 16 | 16 | 1 | | 1128 | 0 | 16 | 0 | 1 |
| 1107 | 16 | 16 | 16 | 1 | | 1129 | 0 | 16 | 0 | 1 |
| 1108 | 16 | 16 | 16 | 1 | | 1130 | 0 | 16 | 0 | 1 |
| 1109 | 16 | 16 | 16 | 1 | | 1131 | 0 | 16 | 0 | 1 |

Notes: 1104-1109 is the white *plateau* (`finishing`; the whole field rows
1-3 sit at pure white while the mon scales up — this is the ~16k px peak at
the scale-up 1100-1110). The 1121 row shows the **measured jitter**: `y`
holds at 6 for three ticks (1119-1121) because the
drawpartystatussummary/getswitchedmondata commands run heavy compressed
sprite-sheet work (`CreatePartyStatusSummarySprites`,
`battle_interface.c:1450-1668`; the incoming mon's GFX load) that steals a
palette-fade update tick; the palette rows follow the jitter verbatim (the
receipt is ground truth, not the ideal curve). The mon's OBJ row stays at
full POKE BALL color (0x7ADF on every entry, incl. the transparent slot)
from 1104 through **1139**, then flips to the incoming mon's normal palette
at **1140** (switch-in start reloads it).

**Send-in window (white in 1187-1202, plateau 1203-1208, white out
1209-1225; mon row held 16, then 16→0):**

| Frame | bg | obj | y | fin | | Frame | bg | obj | y | fin |
| ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 1187 | 0 | 16 | 2 | . | | 1210 | 16 | 16 | 14 | . |
| 1188 | 2 | 16 | 2 | . | | 1211 | 14 | 15 | 14 | . |
| 1189 | 2 | 16 | 4 | . | | 1212 | 14 | 14 | 12 | . |
| 1190 | 4 | 16 | 4 | . | | 1213 | 12 | 13 | 12 | . |
| 1191 | 4 | 16 | 6 | . | | 1214 | 12 | 12 | 10 | . |
| 1192 | 6 | 16 | 6 | . | | 1215 | 10 | 11 | 10 | . |
| 1193 | 6 | 16 | 8 | . | | 1216 | 10 | 10 | 8 | . |
| 1194 | 8 | 16 | 8 | . | | 1217 | 8 | 9 | 8 | . |
| 1195 | 8 | 16 | 10 | . | | 1218 | 8 | 8 | 6 | . |
| 1196 | 10 | 16 | 10 | . | | 1219 | 6 | 7 | 6 | . |
| 1197 | 10 | 16 | 12 | . | | 1220 | 6 | 6 | 4 | . |
| 1198 | 12 | 16 | 12 | . | | 1221 | 4 | 5 | 4 | . |
| 1199 | 12 | 16 | 14 | . | | 1222 | 4 | 4 | 2 | . |
| 1200 | 14 | 16 | 14 | . | | 1223 | 2 | 3 | 2 | . |
| 1201 | 14 | 16 | 16 | . | | 1224 | 2 | 2 | 0 | . |
| 1202 | 16 | 16 | 16 | . | | 1225 | 0 | 1 | 0 | . |
| 1203 | 16 | 16 | 16 | 1 | | 1226 | 0 | 0 | 0 | 1 |
| 1204 | 16 | 16 | 16 | 1 | | 1227 | 0 | — | 0 | 1 |
| 1205 | 16 | 16 | 16 | 1 | | 1228 | 0 | — | 0 | 1 |
| 1206 | 16 | 16 | 16 | 1 | | 1229 | 0 | — | 0 | 1 |
| 1207 | 16 | 16 | 16 | 1 | | 1230 | 0 | — | 0 | 1 |
| 1208 | 16 | 16 | 16 | 1 | | 1231 | 0 | — | 0 | . |
| 1209 | 16 | 16 | 16 | . | | | | | | |

Notes: the send-in white-in runs 1187-1202 (the ball-release path,
`pokeball.c:758`), plateau 1203-1208 (**6 ticks** — one longer than the
recall's 5; the healthbox slide-in start at 1205 steals an update tick),
white-out 1209-1225. The mon's OBJ row sits at full POKE BALL color
1187-1209, then blends back to normal 1210-1226 (applied 16,15,…,1,0) and
the row equals the unfaded palette again from 1226. The ISSUES-cited
*pixel-visible* window (1191-1224) is the `y≥4` portion of this 1187-1231
RAM span.

### 8.4 Exact palette reproduction (the bind recipe)

The full 16-color rows are in the receipt; here is the exact recipe that
reproduces them all (verified 144/144):

```ts
// faded(c) = c + (((target - c) * coeff) >> 4), per 5-bit channel, with the
// sign-aware shift of util.c:264-278 (i.e. Math.floor for negatives).
// BG rows 1-3: coeff = the frame's effective white coefficient from §8.3.
// OBJ row paletteNum: coeff = the frame's ball coefficient from §8.3,
//   target = 0x7ADF (POKE BALL). row16 = ball-blended during the fade;
//   the mon row is NORMAL (unfaded) outside 1088-1139 / 1187-1226.
```

So a bind does **not** need to port `BeginNormalPaletteFade` — it needs the
per-frame coefficient schedules above applied over the app's rendered
background (rows 1-3 pixels) and the player mon sprite (row `paletteNum`)
with `BlendPalette`'s exact arithmetic. Because the app renders final
colors (no palette pipeline), the practical seam is a post-render
per-channel blend over the already-drawn background layer and mon sprite,
keyed to the two fade windows (recall 1088-1131, send-in 1187-1231).

### 8.5 Interleaving with the existing schedule (§2/§3)

- The recall fade starts at **1088**, 2 frames into
  `CONTROLLER_RETURNMONTOBALL` (1086-1117): `AnimTask_SwitchOutBallEffect`
  (priority 2) runs first and `AnimTask_SwitchOutShrinkMon` (the affine
  scale-up) starts 10 ticks later per `Special_SwitchOutPlayerMon`'s
  `delay 10` (`battle_anim_scripts.s:10714-10716`). The white plateau
  1105-1109 therefore **exactly overlaps** the scale-up peak (1100-1110);
  the ball-color mon row is full POKE BALL the whole scale-up.
- The sprite-freed edge (1111-1117) happens while the white-out is mid-run
  (bg 16→10); the freed mon leaves its row ball-colored until the switch-in
  reloads it at 1140.
- The send-in fade (1187-1231) starts 1 frame after the ball lands (1186)
  and wraps the materialize (1188-1199) and the healthbox slide (1205-1227)
  already in §3: the mon emerges **ball-colored**, then restores to its
  normal palette as the white-out runs (1210-1226).

## 9. Party-summary panel (ISSUES #78 residual 2)

Receipt: `docs/probes/mid-battle-switch-party-summary/` — oracle PNGs
(1119-1140), app PNGs and diffs for the same window (from the dense-a app
stage), and `app-oracle-diff.json` (per-frame diff-pixel counts).

### 9.1 The finding: the real game draws **no** party tray here

The in-battle party-status-summary tray is **not drawn** anywhere in this
fixture's switch window, and the ~389 px residual is the app over-drawing
its own settled tray where the real game draws nothing:

- **Source.** `Cmd_drawpartystatussummary` emits
  `BtlController_EmitDrawPartyStatusSummary(..., skipPlayer = 1)`
  (`battle_script_commands.c:5697-5732`, `:5728`), and
  `PlayerHandleDrawPartyStatusSummary` **skips** the player when
  `gBattleBufferA[gActiveBattler][1] != 0` and the battler is on the player
  side (`battle_controller_player.c:3013-3031`, `:3015-3018`). The
  voluntary-switch `drawpartystatussummary BS_ATTACKER`
  (`battle_scripts_1.s:3109`) therefore produces *no* tray on the player
  side. (The opponent side *would* draw, but no opponent command fires in
  this fixture.)
- **Pixels.** Frames 1120-1160 contain zero tray pixels: frame 1138 vs 1160
  (tray fully gone) differ by only 104 px elsewhere (the incoming mon), and
  the region where the app draws its tray (y 84-112, x 120-240) is pure
  field (255,255,255)/(247,247,255) throughout.

### 9.2 What the residual actually is (app-vs-oracle, dense)

`npm run compare` over the dense-a app stage, frames 1119-1140:

| Frame | total diff | tray region (y84-112,x120-240) | note |
| ---: | ---: | ---: | --- |
| 1119-1125 | 3079-4979 | 362-368 | dominated by the unmodeled BG white fade (§8) + tray |
| 1126-1127 | 410-416 | 362 | fade diff recedes; tray remains |
| **1128-1138** | **386-417** | **362** | the ISSUES ~389 px class: 362 px tray overdraw + 24 px RATTATA sprite palette |
| 1139 | 24 | 0 | app's tray draw stops |
| 1140 | 127 | 0 | send-in start |

The 362 px are the app's `drawTypedPartyStatusSummary` settled tray at
bar (136,96) + ball icons at (156+10·i, 88)
(`src/engine/battleScene.ts:35373-35403`, drawn via `view.partySummary` at
`:35052-35058`); the oracle shows empty field there. The ~24 px class is the
known staged-RATTATA front-sprite palette residual (PROGRESS 957, side-asset
class), not the tray.

### 9.3 The real tray's source geometry (for the cases where it IS drawn)

`CreatePartyStatusSummarySprites` (`battle_interface.c:1450-1668`) — banked
here for the opponent-side / battle-start cases this fixture does not
exercise, and so the bind can reuse it verbatim if a future slice needs a
real tray:

- **Bar** (`sStatusSummaryBarSpriteTemplates`, `:695-715`; 128×8 via the
  4×32px subsprite table `sStatusSummaryBar_Subsprites_Enter`, `:535-569`):
  created at (136,96) player / (104,40) opponent, then `x += 96` player /
  `x -= 96` + HFLIP opponent, and `x2 = 100` player / `-100` opponent. The
  enter callback slides `x2` by `±5`/frame to 0 (`SpriteCB_StatusSummaryBar_Enter`,
  `:1817-1821`) — i.e. **player tray slides in from the right edge, bar left
  edge 136→136 settled, ~20 frames**. Sub-sprite offsets place the visible
  bar at `[x+x2-96, x+x2+32]` × `[96,104]`.
- **Ball icons** (`sStatusSummaryBallsSpriteTemplates`, `:717-737`; 8×8):
  created at (136,92) player, `x += 10·i + 24`, `x2 = 120`; for a mid-battle
  switch (`!isBattleStart`) the callback is
  `SpriteCB_StatusSummaryBalls_OnSwitchout` (`:1904-1910`), which **copies
  the bar's x2** so the six balls ride the bar — settled at
  **(160+10·i, 92)**, 8×8.
- **Ball glyphs** come from
  `gHealthboxElementsGfxTable[HEALTHBOX_GFX_STATUS_BALL]`
  (`graphics/battle_interface/ball_display.png`, 4 glyphs): base tile =
  normal ball, `+1` = empty slot, `+2` = statused, `+3` = fainted
  (`:1549-1562` tileNum deltas; `HP_EMPTY_SLOT`/`hp==0`/`status!=0`
  dispatched at `:1564-1593`). The palette is `gBattleInterface_BallDisplayPal`.
- **Hide** (`Task_HidePartyStatusSummary`, `:1671-1725` + `_DuringBattle`,
  `:1779-1809`): the tray does **not** slide out — it sets the sprites to
  `ST_OAM_OBJ_BLEND` and steps `BLDALPHA` from `(16,0)` to `(0,16)` over
  `tBlend` 16→0 (a ~17-frame fade-out), then destroys the sprites.

### 9.4 Bind plan (for the MAIN worker)

1. **Gate the app's tray off on the voluntary-switch route.** The
   presentation emits the `party-summary` command for the switch
   (`battleResolutionPresentationRender.ts:637-641` → `view.partySummary` →
   `battleScene.ts:35052`), but the real player-side switch skips the tray
   (`battle_controller_player.c:3015-3018`). The bind is to *not* draw the
   tray for the player battler on this route (drop the `party-summary` draw
   when `completed.battler === 0`, or mirror the source's skipPlayer gate).
   **Acceptance:** dense compare frames 1128-1138 drop to the remaining 24
   px RATTATA class (~386→~24 px per frame).
2. **Model the BG white fade + mon ball-color blend (§8).** Apply the §8.3
   per-frame coefficients with the §8.4 recipe over the background layer
   (BG rows 1-3 pixels) and the player mon sprite. **Acceptance:** dense
   compare frames 1093-1126 (recall) and 1191-1224 (send-in) go byte-exact
   once the RATTATA sprite palette residual is also fixed (that residual is
   a side-lane asset fix).
3. If a real tray is ever wanted for the opponent side or battle-start
   (ISSUES #80 scope), §9.3 is the exact geometry; it is **not** needed to
   close this window.


  `bin/oracle lab tools/battle-lab/scratch-mid-battle-switch-dense-*-off.json`.
