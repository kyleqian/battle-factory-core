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
- Determinism: two fresh runs of `dense-a` (256 frames) byte-identical; the
  whole scenario is seed-fixed (seed 1) and re-runnable via
  `bin/oracle lab tools/battle-lab/scratch-mid-battle-switch-dense-*-off.json`.
