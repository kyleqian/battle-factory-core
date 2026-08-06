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

## 10. The four mon-sprite residual classes (ISSUES #78 residuals 1a-1d) — OAM ground truth

This section banks the per-tick OAM ground truth for the four classes
PROGRESS 961 measured and left for a MAIN bind: (1a) the recall switch-out
affine scale-up, (1b) the recall/send-in ball-open particles, (1c) the
send-in emerge, (1d) the send-in settle / healthbox slide. Everything here
was measured with a fresh RAM probe
(`tools/probe/dump-midbattle-switch-oam.py`, committed; a copy of the §8
probe's recipe) replaying the identical dense-a scenario in-process and
dumping, each tick, every live `gSprites` entry (decoded OAM attrs, `x`/`y`/
`x2`/`y2`, `centerToCornerVec`, anim/affine-anim cursors, `data[0..7]`,
visibility, template + callback pointers), the `gOamMatrices` `a/b/c/d`, the
`gMain.oamBuffer[128]`, and the battler/healthbox sprite ids. **Two
independent probe runs (frames 1085-1235) are byte-identical on every
common field.** Receipt:
`docs/probes/mid-battle-switch-oam/oam-ram-probe.json` plus the oracle
PNGs + app-vs-oracle diff PNGs for the four windows (1091-1117, 1118-1130,
1186-1204, 1207-1227) from `npm run compare`.

**Timeline convention.** The probe's tick N = the post-`BattleLab.prepare`
state after N advances, which equals the oracle trace frame N (confirmed:
the oracle's rendered frames match the probe's gSprites state — the mon is
invisible through 1187 and first visible at 1188 in both). The §8 palette
tables (§8.3) use this same convention. **The §3 send-in rows (ball land
1186 / pa 1638 / pa 862 at 1188) are each one tick ahead of this
convention** (e.g. §3 says `pa=862` at 1188, this probe measures `pa=1129`
at 1188 and `862` at 1189); the §3 recall rows (scale-up 256→736 over
1100-1110) and the healthbox slide (1205-1227, 110→0) agree exactly. Treat
this section's tables as authoritative (they are consistent with §8.3).

### 10.1 Class 1a — recall switch-out affine scale-up (1101-1112, 172-935 px)

`AnimTask_SwitchOutShrinkMon` (`battle_anim_throw.c:642-667`) drives the
outgoing player mon (gSprites slot 7 here). RAM per tick (`a`/`d` = the
OAM matrix scale, `y2` = the feet anchor, mode/ctc = the affine OAM
geometry, `art.origin` = the app's settled top-left = (40,61)):

| Frame | matrix a/d | y2 | mode | ctc | box TL (x,y) | canvas TL | center (x,y) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1085-1099 | 256 | 0 | 1 | (−32,−32) | (40,61) | (40,61) | (72,93) |
| 1100 | 256 | 0 | **3** | **(−64,−64)** | (8,29) | (40,61) | (72,93) |
| 1101 | 304 | 3 | 3 | (−64,−64) | (8,32) | (40,64) | (72,96) |
| 1102 | 352 | 5 | 3 | (−64,−64) | (8,34) | (40,66) | (72,98) |
| 1103 | 400 | 7 | 3 | (−64,−64) | (8,36) | (40,68) | (72,100) |
| 1104 | 448 | 8 | 3 | (−64,−64) | (8,37) | (40,69) | (72,101) |
| 1105 | 496 | 9 | 3 | (−64,−64) | (8,38) | (40,70) | (72,102) |
| 1106 | 544 | 10 | 3 | (−64,−64) | (8,39) | (40,71) | (72,103) |
| 1107 | 592 | 11 | 3 | (−64,−64) | (8,40) | (40,72) | (72,104) |
| 1108 | 640 | 11 | 3 | (−64,−64) | (8,40) | (40,72) | (72,104) |
| 1109 | 688 | 12 | 3 | (−64,−64) | (8,41) | (40,73) | (72,105) |
| 1110 | 736 | 12 | 3 | (−64,−64) | (8,41) | (40,73) | (72,105) |
| 1111 | 256 | 12 | 1 | (−32,−32) | (40,72) | invisible; freed ~1117 | |

"box TL" is the OAM buffer's double-size-box top-left
(`oam.x = x + x2 + ctcX`, `oam.y = y + y2 + ctcY`); "canvas TL" is the
64×64 sprite's top-left = box TL + 32; the transform center = the canvas
center = (x, y + y2) = (72, 93+y2). The sprite is a plain affine OBJ (mode
1, ctc ±32) at rest and flips to **double-size (mode 3, ctc ±64)** for the
whole scale-up window (1100-1110), then back to mode 1 at 1111 (same tick
it goes invisible). The scale ramp is the pinned 256→736 at 48/tick, but
the visible first frame (1101) already reads 304 — i.e. the §2 "1100-1110"
window's 1100 frame is the invisible mode flip only.

**The `y2` column is the missing mechanism.** It is
`SetBattlerSpriteYOffsetFromYScale` (`battle_anim_mons.c:1873-1883`):
`var = MON_PIC_HEIGHT(64) - GetBattlerYDeltaFromSpriteId*2`, for RATTATA
`gMonBackPicCoords[19].y_offset = 13` (`back_pic_coordinates.h:26`) so
`var = 38`, then `y2 = (var - SAFE_DIV(var<<8, gOamMatrices[matrix].d))/2`.
Verified value-for-value: 304→3, 352→5, 400→7, 448→8, 496→9, 544→10,
592→11, 640→11, 688→12, 736→12 (integer division, exactly as measured).
This anchors the sprite's **feet** at the ground as it grows.

**Where the app diverges** (`battleScene.ts:35264-35293`
`drawMidBattleSwitchOutSprite` → `drawSpriteSheetAffineStretch`): the app
passes `y2=0` and `doubled=false`, so it (1) scales around the center
(72,93) instead of (72,93+y2) — the sprite sits ~3-12px too high — and
(2) clips the scaled sprite to the 64×64 canvas footprint instead of the
real 128×128 double-size box, so at the peak (736) the app draws only the
central ~22 source rows (~22 screen px tall) where the real sprite fills
the 128px box (~44 source rows). Both make the app's sprite **smaller and
higher** than the oracle's, exactly the ISSUES diff signature (compare:
1101→813 px, 1102→935 px, then receding; bbox 49,74-95,111).

**Bind (MAIN):** pass `doubled=true` and `y2 = 61 + feetAnchorY2(elapsed)`
to the affine stretch (or add a `y2` argument to
`drawSpriteSheetAffineStretch` and call with the §10.1 y2 table over
relative elapsed 15-24), keep the origin (40,61) as the canvas top-left.
A Tier-1 pin of the 10-entry `y2` table + the mode/ctc flip boundary
(relative 14) is cheap and file-disjoint.

### 10.2 Class 1b — ball-open particles (1091-1100 7-59 px; 1113-1126 47-96 px)

`AnimateBallOpenParticles` (`battle_anim_throw.c:1577-1652`): a task
(`sBallParticleAnimationFuncs[0]` = `PokeBallOpenParticleAnimation`,
0x08171E50) spawns one 8×8 particle sprite per tick for 16 ticks, each at
`var0 = (task tick) mod 8` → `data[0] = var0*32` (0,32,…,224, wrapping), at
the base (x, y), then `PokeBallOpenParticleAnimation_Step1/_Step2`
(0x08171F68/0x08171F88) move it radially. **Recall window** (launched by
`AnimTask_SwitchOutBallEffect`, `battle_anim_throw.c:669-702`):
- Spawn: one particle/tick **1089-1104** (16 total), base **(72,112)**
  (= the mon's feet: `GetBattlerSpriteCoord` + 32).
- Each particle: 8×8 (shape 0 size 0), OAM priority **2**, subpriority 30,
  OBJ palette bank **6** (= flat palette row 0x160 =
  `gBattleAnimSpritePal_CircleImpact` — this is §8.1's "row 22"; the
  (255,173,0) orange family confirmed in the §8 receipt at 0x160), tile
  base **405** cycling 405/406/407 (3-frame anim).
- Motion (`Step2`): `x2 = Sin(data[0], data[1])`, `y2 = Cos(data[0],
  data[1])` (gSineTable amplitude-scaled: `x2 = (gSineTable[data[0]] ·
  data[1]) >> 8`), `data[1] += 2` per tick, destroyed at `data[1] == 50`
  (~26 ticks alive; first particle 1089→1115). The first particle's `x2`
  is 0 and `y2` grows +2/tick (angle 0 = straight down); the others fan at
  22.5° steps. The rendered frame lags one tick (visible x2/y2 = the RAM
  value at `data[1]-2`).
- Screen position = (72 + x2, 112 + y2) per the RAM columns in the
  receipt; 16 alive 1104-1114, then one destroyed/tick through 1130.

**Send-in window** (launched by `SpriteCB_ReleaseMonFromBall`,
`pokeball.c:750-824`, `:757`): identical machinery, base **(72,123)**
(= ball sprite (72,128) minus 5), spawn 1187-1202, tile base **417**
(417/418/419), OBJ palette bank **7** (= flat row 0x170), OAM priority
**1**/subpriority 30 — the send-in particles draw **above** the mon (prio
1 < 2), the recall particles tie the mon at prio 2 (OAM order breaks the
tie; they sit above the mon's feet region regardless). Last destroyed 1228.

**Where the app diverges:** it draws no particles at all. The 1091-1100
class is purely these recall particles (7→59 px as they spread); the
1113-1126 class is their tail (1118:90 px decaying to 1126:48 px; 1127-1130
are 42/28/18/7 px and the committed spec starts byte-exact at 1131). The
24-32 px in 1201-1204 (send-in) are also particles.

**Bind (MAIN):** a `drawMidBattleSwitchBallOpenParticles` keyed off the
§8.3 fade windows (recall 1089-1130, send-in 1187-1228), 16 sprites at
base (72,112)/(72,123) with the (255,173,0)-family `gBattleAnimSpritePal_
CircleImpact` palette (bank 6/7) and the Sin/Cos radial motion; draw order
prio 2 (recall) / prio 1 (send-in). Particle tiles/palette are the
`TAG_PARTICLES_POKEBALL` sheet already extracted under the battle-anim
assets if a move animation needs them; otherwise the 3-frame tile cycle
can be a generated mini-sheet. The exact per-tick `data[0]/data[1]/x2/y2/
tile` columns are in the receipt.

### 10.3 Class 1c — send-in emerge (1188-1200, 90-616 px)

The incoming mon sprite (slot 6) during the ball-release emerge. RAM per
tick (acc = `sAffineAnim_Battler_Emerge` accumulator; `a/d` =
`floor(0x10000/acc)`; y2 = the same descent `MATERIALIZE_Y2_TABLE` the
battle-START materialize uses):

| Frame | invisible | a/d | acc | y2 | | Frame | invisible | a/d | acc | y2 |
| ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 1186 | T | 256 | 256 | 0 | | 1194 | F | 394 | 166 | 8 |
| 1187 | T | 1638 | 40 | 0 | | 1195 | F | 356 | 184 | 7 |
| 1188 | F | 1129 | 58 | 14 | | 1196 | F | 324 | 202 | 5 |
| 1189 | F | 862 | 76 | 13 | | 1197 | F | 297 | 220 | 4 |
| 1190 | F | 697 | 94 | 12 | | 1198 | F | 275 | 238 | 3 |
| 1191 | F | 585 | 112 | 11 | | 1199 | F | 256 | 256 | 2 |
| 1192 | F | 504 | 130 | 10 | | 1200 | F | 256 | 256 | 0 |
| 1193 | F | 442 | 148 | 9 | | | | | | |

Notes: the emerge affine starts 1187 (acc 40) while the sprite is still
invisible (the ball sprite is at (72,128), open tile 409, from 1187); the
sprite becomes visible at 1188 already at acc **58** (matrix 1129), and
`862` does not appear until 1189. The §3 "pa 862 at 1188" row is one tick
ahead (§10 timeline note). The y2 column is **exactly**
`MATERIALIZE_Y2_TABLE` (14,13,12,11,10,9,8,7,5,4,3,2) — the emerging
sprite descends 14→2 px as it scales down, same source as the battle-start
player materialize (§7.21). Sprite canvas: mode 1 (single), ctc (−32,−32),
`x=72,y=93`, so canvas top-left = (40, 61+y2), center = (72, 93+y2) — the
app's `art.origin` (40,61) is correct at rest.

**Where the app diverges** (`battleScene.ts:35218-35254`
`drawMidBattleSwitchInSprite`): (1) the pinned
`MID_BATTLE_SWITCH_EMERGE_START_ACCUMULATOR=76` lands on acc 76 at the
first visible frame, but the real first visible frame is acc **58** — the
app's scale-down is one logical tick behind (and one frame shorter: 11 vs
the real 12). (2) The draw passes `y2=0`; the real sprite descends 14→2.
(3) The draw is a flat `MATERIALIZE_TINT_COLOR` fill while the real sprite
keeps its **texture** with its OBJ row (paletteNum 0) blended toward
`gBallOpenFadeColors[BALL_POKE]` (0x7ADF) by the §8.3 obj coefficient (16
through 1209, then 16→0 over 1210-1226). Pixel check (frame 1192, mon
region): the oracle shows the textured ball-blended body (e.g. (255,181,247)
and the un-blended reddish RATTATA patch (214,74,57) at y 115), while the
app's mon region mixes the flat tint (255,181,247) with the **un-blended**
teal (107,165,165) — the affine tint is also over-drawn by the settled
mon's generic player draw (`battleScene.ts:35433-35454`,
`view.visibility.player.sprite`) that the switch-in command leaves visible.

**Bind (MAIN):** (a) start the emerge at acc 58 (12 frames, not 11); (b)
apply the y2 descent table; (c) replace the flat tint with a per-pixel
blend of the mon's own back-sprite palette toward 0x7ADF by the §8.3 obj
coefficient (the app's `blendPaletteToward` + `drawSpriteSheet` on the
already-blended `playerMonPalette` gives exactly this), and (d) suppress
the generic settled player draw while the emerge command is current
(gate `visibility.player.sprite` off during the affine window).

### 10.4 Class 1d — send-in settle / healthbox slide (1207-1227, 211-1379 px)

**Healthbox slide (the named target).** RAM: the player healthbox sprite's
`x2` is 110 at 1205 and steps −5/tick to 0 at 1227 (`StartHealthboxSlideIn`,
`pokeball.c:1241-1269`, `SpriteCB_HealthboxSlideIn` 0x080769CC), exactly
the pinned schedule. But the **oracle's rendered** healthbox lags the RAM
by one tick (the §8 render-lag): the visible slide spans rendered frames
**1206-1228** (x2 110…0), so at rendered frame F the healthbox sits at
`max(0, 110 - 5·(F-1206))`. The app's `midBattleSwitchInAt` healthboxDx
(elapsed 65→87, frames 1205-1227) renders the slide **one frame early and
one frame short** — measured directly: on every rendered frame 1208-1227
the app's healthbox tan frame-left is **exactly 5 px left** of the
oracle's (oracle 237→142, app 232→137, same slope), collapsing to byte-exact
at 1228 (the committed spec's first settle frame). **This is a pure
one-frame-timing fix**: key the slide off `elapsed - 66` (frames
1206-1228) instead of `elapsed - 65`, or shift the dx formula to
`max(0, 110 - 5·(elapsed - 66))` and keep the healthbox drawn (dx>0)
through elapsed 88.

**Mon sprite: static — the §3 "bounce begins ~1206" is corrected.** The
incoming mon is completely still through the whole slide window and beyond
(x2=0, y2=0, callback `SpriteCallbackDummy` 0x08007428 from 1203 through
1235; no idle-bounce x2/y2 write anywhere in the receipt). The app already
draws the settled mon at (40,61), so the mon itself is not the 1d driver.

**Per-frame diff decomposition** (`npm run compare`, frames 1207-1227;
`x<120` = mon/particle region, `x≥120` = healthbox band):

| Frame | total | hb-band (x≥120) | mon/particles (x<120) | | Frame | total | hb-band | mon/particles |
| ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: |
| 1207 | 211 | 186 | 25 | | 1218 | 802 | 743 | 59 |
| 1208 | 333 | 304 | 29 | | 1219 | 813 | 767 | 46 |
| 1209 | 363 | 329 | 34 | | 1220 | 854 | 818 | 36 |
| 1210 | 397 | 358 | 39 | | 1221 | 900 | 871 | 29 |
| 1211 | 456 | 413 | 43 | | 1222 | 967 | 933 | 34 |
| 1212 | 554 | 484 | 70 | | 1223 | 1001 | 969 | 32 |
| 1213 | 603 | 536 | 67 | | 1224 | 1099 | 1066 | 33 |
| 1214 | 668 | 596 | 72 | | 1225 | 1274 | 1240 | 34 |
| 1215 | 716 | 646 | 70 | | 1226 | 1379 | 1357 | 22 |
| 1216 | 754 | 683 | 71 | | 1227 | 1368 | 1357 | 11 |
| 1217 | 782 | 710 | 72 | | | | | |

The healthbox band (186→1357 px, growing as more of the 100-px-wide
healthbox becomes visible) is entirely the 5-px slide-timing offset above;
it vanishes at 1228 (committed byte-exact). The `x<120` remainder (11-72
px) is the **send-in ball-open particles still alive** (1187-1202 spawn,
through 1228; the app draws none, §10.2) plus the known staged-RATTATA
mon palette residual (PROGRESS 957 side-asset class). So the 1d bind is
one timing constant; the particles and palette classes are separate,
already-named binds.

### 10.5 Bind-plan summary (MAIN, in the existing route)

Read-only seams in `battleResolutionPresentationRender.ts` /
`battleScene.ts` (the voluntary-switch presentation route):

1. **1a** — `battleScene.ts:35264` `drawMidBattleSwitchOutSprite`: call
   `drawSpriteSheetAffineStretch` with `doubled=true` and the §10.1
   `y2(elapsed)` feet-anchor table (relative 15-24; constants live at
   `battleResolutionPresentationRender.ts:91-95`). Verdict: app is smaller
   + higher because of the 64-vs-128 clip and the missing `y2`.
2. **1b** — new `drawMidBattleSwitchBallOpenParticles` in
   `renderBattleResolutionSceneOffView` (`battleScene.ts:35391`), keyed to
   the §8.3 fade windows; recall base (72,112)/bank 6/tiles 405-407/prio 2,
   send-in base (72,123)/bank 7/tiles 417-419/prio 1, Sin/Cos radial
   motion. Verdict: app draws nothing; both particle batches unmodeled.
3. **1c** — `battleScene.ts:35218` `drawMidBattleSwitchInSprite` + the
   `battleResolutionPresentationRender.ts:76` accumulator pin: acc 58 (not
   76) on the first visible frame (12 frames), y2 descent 14→2, textured
   OBJ-row blend toward 0x7ADF by the obj coeff instead of the flat tint,
   and suppress the generic settled player draw during the affine window.
4. **1d** — `battleResolutionPresentationRender.ts:64-67` healthbox slide
   constants: key off elapsed−66 (rendered frames 1206-1228), dx ends at
   elapsed 88. Verdict: pure one-frame render-lag timing fix; the mon is
   static (no bounce).

   `bin/oracle lab tools/battle-lab/scratch-mid-battle-switch-dense-*-off.json`.
