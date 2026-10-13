# seg127 (S10A / ISSUES #168 SA2 prep): the controller's IsBattleSEPlaying gate before a Scene ON status animation

Evidence + a banked, UNWIRED pure rule. **No production change**, no existing file edited. FIXED evidence base: master `cfe4e26ca`
(production src `b4befa039`), git-archive copies only. Builds on docs/sta123-status-animations-design.md (§1 SE-gate finding, §4 row model,
§5 SA2).

> Status of this file: §0 (the source prediction) was written and committed BEFORE any probe ran. Results are added above it as they land.

## 0. Source prediction (written before probing)

### 0a. What the gate tests

- `PlayerHandleStatusAnimation` (`battle_controller_player.c:2768`) / `OpponentHandleStatusAnimation` (`battle_controller_opponent.c:1727`):
  `if (!IsBattleSEPlaying(gActiveBattler)) { InitAndLaunchChosenStatusAnimation(...); ... }` — re-polled once per controller row.
- `IsBattleSEPlaying` (`battle_gfx_sfx_util.c:554-571`): if `IsSEPlaying()`: `soundTimer++`; while `soundTimer < 30` return TRUE (wait);
  on the 30th playing poll `m4aMPlayStop(SE1)`, `m4aMPlayStop(SE2)`; then `soundTimer = 0`, return FALSE. So **gate rows = min(29, number of
  consecutive controller polls that see an SE playing)**; the launch happens on the first non-playing poll (or the 30th poll).
- `IsSEPlaying` (`sound.c:606-613`): **only the SE1 and SE2 music players** (`gMPlayInfo_SE1` / `gMPlayInfo_SE2`): FALSE when both are
  PAUSEd or neither has a live track bit. **SE3 is not tested** — so the looping low-HP alarm `se_low_health` (`MUSIC_PLAYER_SE3`,
  `song_table.inc:99`) never gates; cries use the cry players, not SE1 / SE2.

### 0b. Which SE can still be playing when a status animation is dispatched

- Every battle-animation script (move animations, `playanimation` B_ANIM_* general animations and the B_ANIM_STATUS_* scripts themselves)
  ends through `Cmd_end` (`battle_anim.c:476-503`), which **keeps the script alive while `IsSEPlaying()`** (up to 90 frames, then stops SE1 /
  SE2). So no SE started inside an animation script survives the `waitanimation` / controller completion that follows it.
- The battle scripts' `playse` opcode appears only in the Battle Arena scripts (`battle_scripts_1.s:4451-4480`), never in Factory battles.
- The one SE started **outside** an animation script on the Factory path is **`effectivenesssound`** (`Cmd_effectivenesssound`,
  `battle_script_commands.c:2001-2046`): the target's controller `PlaySE12WithPanning` (`battle_controller_player.c:2882`, `sound.c:577`) of
  `SE_SUPER_EFFECTIVE` (14) / `SE_NOT_EFFECTIVE` (12) / `SE_EFFECTIVE` (13) by `gMoveResultFlags`; all three on `MUSIC_PLAYER_SE1`
  (`song_table.inc:21-23`). The kernel already emits it as the `play-se` event (songId 12 / 13 / 14); production presentation skips it
  (`battleResolutionPresentation.ts:714`, `:821`).

### 0c. SE lengths from the sound data (`tools/integration/seg127SeLength.py`)

m4a: a fresh song runs tick 0 on its first VBlank (tempoI 150), then `TEMPO 90*tbs/2` -> tempoI 90 = 0.6 ticks / VBlank; status loses its
track bits on the first tick after every track processed FINE.

| SE | song id | ticks to FINE (both tracks) | tick T at VBlank | tick T + 1 at VBlank | predicted SE-playing rows after start |
|---|---|---|---|---|---|
| se_not_effective | 12 | 9 | 15 | 17 | **~16..17** |
| se_effective | 13 | 42 | 70 | 72 | **~71..72** |
| se_super_effective | 14 | 51 | 85 | 87 | **~86..87** |

### 0d. Prediction per class

Let `L` = the SE-playing rows of the most recent effectiveness SE, `e` = rows from that SE's start to the status controller's first
`IsBattleSEPlaying` poll. **Predicted gate = clamp(L − e, 0, 29)** (0 when no effectiveness SE was started in the current action, or it ended).
`e` = `hitanimation` (fixed blink) + `healthbarupdate` drain (damage-dependent) + 1-row instructions + any **message + waitmessage
B_WAIT_TIME_LONG (64)** in between. Any message in between makes `e` > 87 > every `L`, hence 0.

| class (what precedes the status animation in the same execution) | SE in flight | predicted gate |
|---|---|---|
| damaging move, **neutral, non-crit** -> secondary status (`seteffectwithchance` -> MoveEffect{Burn,Freeze,Paralysis,Poison,Toxic,Confusion}) | se_effective (~72) | **clamp(72 − e, 0, 29)**, `e` ≈ hit blink + HP drain: e.g. Ice Beam 17 / 18 (sta123) |
| same, **super effective** | se_super_effective (~87) | **0** ("It's super effective!" + waitmessage 64 in between) |
| same, **not very effective** | se_not_effective (~17) | **0** (message in between, and L is short) |
| same, **critical hit** (any effectiveness) | — | **0** ("A critical hit!" + waitmessage 64) |
| contact ability on the attacker at moveend (Static PRZ, Flame Body BRN, Poison Point PSN, Effect Spore PSN / PRZ / SLP via `BattleScript_ApplySecondaryEffect`; Cute Charm INFATUATION via `CuteCharmActivates`) after a neutral non-crit contact hit | se_effective | **clamp(72 − e, 0, 29)**, `e` a few rows larger than the secondary-status case (seteffectwithchance / tryfaintmon / moveend rows) |
| contact ability after a super / not-very-effective / crit hit | — | **0** |
| Synchronize (the second status animation follows the first one's print + waitmessage) | — | **0** |
| Thrash / Outrage / Petal Dance fatigue (`ENDTURN_THRASH` -> ThrashConfuses) | se_effective of the turn's last hit, if nothing printed since | **clamp(72 − e, 0, 29)** if the thrasher hit last, neutral, non-crit, and no end-turn message precedes; else 0 |
| status move infliction (Toxic, Will-O-Wisp, Thunder Wave, Spore, Confuse Ray, ...): no `effectivenesssound` | — | **0** (sta123 measured 0) |
| turn-start (sleep / frozen / can't move / confused / in love): print + waitmessage first | — | **0** (sta123 measured 0) |
| end-turn ticks (PSN / BRN / CURSE / NIGHTMARE): print + waitmessage first | — | **0** (sta123 measured 0) |

Side: the SE is global (SE1 / SE2) and the controller polls on the status battler's own controller; the predicted gate does not depend on the
side except through `e` (sta123's 17 vs 18 = a 1-row `e` difference to be explained by the probe).

Side finding to verify (out of this step's scope): `HandleStatusIconUpdate` (`battle_controller_player.c:2757`, opponent `:1714`),
`HandleMoveAnimation` (`:2470` / `:1450`) and `HandleBattleAnimation` (`:3068` / `:1992`, every `playanimation` incl. General_StatsChange)
carry **the same gate**: e.g. a stat-change animation after a neutral damaging hit's secondary (Psychic / Crunch / Aurora Beam drops) can wait
for se_effective too.
