# Fly's semi-invisible turn under Battle Scene OFF — ground truth (ISSUES #79)

Ground-truth scout for ISSUES #79: in live play a MURKROW used FLY and its
sprite stayed on screen during the airborne turn. The user asked for a
double-check before changing anything. This doc banks the real game's
semi-invisible turn frame-by-frame under **Battle Scene OFF** (mechanicLab,
`overrides.parties`, opponent all-four-slots FLY, player idling with SPLASH),
answers sprite/healthbox visibility with pixels + RAM, and maps the app-side
`sprite-visibility` consumption read-only.

**Verdict: the real Scene-OFF game DOES hide the airborne battler's sprite
for the whole semi-invisible span — and it does NOT hide the healthbox.**
The sprite vanishes at frame 171 and stays gone until frame 1769; the
opponent healthbox remains visible the entire time (its `invisible` flag is
never set). The user's report is therefore a genuine app gap to fix, not a
wrong expectation.

Measurement receipt: the coarse sweep (stride) and the seven dense 256-cap
chunks are independent oracle runs; every overlapping frame is byte-identical
(32/32 `sha256` matches), and the RAM probe replay is screenSha-identical to
the manifest at every sampled frame (10/10 sampled MATCH). The schedule is
deterministic for this staged trace.

Scratch trace (committed):
- `tools/battle-lab/mechanic-opponent-fly-off.json` — MURKROW (198) FLY×4 vs
  ONIX (95) SPLASH×4, all `overrides.parties`, seed 305419897, coarse
  `captureFrames` restored (the committed file holds the coarse stride list;
  the dense 30-1750 chunks were run from `/tmp` clones).

RAM probe: `tools/probe/dump-fly-semi-invisible-ram.py` (run via
`tools/run-mgba-probe.py` with the mgba-venv interpreter), records per tick
the opponent's `gStatuses3` `STATUS3_ON_AIR` bit, the battler sprite struct's
`invisible` flag + position, the healthbox sprite's `invisible` flag, the
player sprite's flag, and full-screen + sprite-region hashes (so the probe is
self-aligning against the manifest).

---

## 1. Staged scenario

`mechanicLab` OFF trace, `overrides.parties`, seed 305419897. Player: three
ONIX (species 95), level 50, 31 IVs, SPLASH (150) ×4, no item. Opponent:
three MURKROW (species 198), level 50, FLY (19) ×4 on every slot (all four
identical, so the Factory AI's only legal move is FLY). Turn 1 the opponent
flies up (player SPLASHes — nothing happens); turn 2 the opponent lands and
FLY hits the (4×-resisting) ONIX for 13 damage. Both bench slots exist but
never enter.

Input recipe (proven `A(2f), idle 18f, A(2f)` move selection, per
`docs/battle-resolution-adapter-ground-truth.md`): `A(2f)`, idle 18f,
`A(2f)` (select SPLASH for turn 1), idle 1500f, `A(2f)`, idle 18f, `A(2f)`
(select SPLASH for turn 2), idle 900f. Frame 0 = post-checkpoint, fight menu
open.

## 2. Dense frame schedule (Battle Scene OFF, deterministic)

Frame numbers are battle-lab trace frames, aligned to the manifest semantic
state (opponent `gStatuses3` `STATUS3_ON_AIR` from the capture state) and to
the RAM probe (screenSha-identical).

| Frame | Event | Mechanism (file:line) |
| ---: | --- | --- |
| 0-33 | Fight menu open; A-A at 0-21 selects SPLASH. | `CONTROLLER_CHOOSEACTION` (id 18) → `CHOOSEMOVE`. |
| 34 | Box-clear `printstring STRINGID_EMPTYSTRING3`. | `BattleScriptFirstChargingTurn`, `battle_scripts_1.s:795-808`. |
| 36 | `SETMONDATA` — charging-turn move-effect setup. | `setmoveeffect MOVE_EFFECT_CHARGING`, `battle_scripts_1.s:803`. |
| 76-100 | **"Foe MURKROW flew up high!"** — `printfromtable gFirstTurnOfTwoStringIds[B_MSG_TURN1_FLY]` (`STRINGID_PKMNFLEWHIGH` = `sText_PkmnFlewHigh[] = "{B_ATK_NAME_WITH_PREFIX} flew\nup high!"`, `battle_message.c:139`), 1 glyph/frame, 24-25 glyphs. | `battle_scripts_1.s:806`, `battle_message.c:1025-1031`. |
| 101-164 | `waitmessage B_WAIT_TIME_LONG` hold (64 frames). | `battle_scripts_1.s:807`; `B_WAIT_TIME_LONG=64`, `include/constants/battle.h:324`. |
| **167** | `STATUS3_ON_AIR` set (RAM + manifest semantic `status3 & 0x40`). | `Cmd_setsemiinvulnerablebit` (`battle_script_commands.c:9011-9022`, `MOVE_FLY`→`STATUS3_ON_AIR`); script `setsemiinvulnerablebit` `battle_scripts_1.s:1994`. |
| **170** | Opponent sprite `invisible` flag set (RAM); opponent controller = `SPRITEINVISIBILITY` (id 51). | `MOVEEND_ATTACKER_INVISIBLE` in `Cmd_moveend` (`battle_script_commands.c:4342-4354`): gated on `STATUS3_SEMI_INVULNERABLE && HITMARKER_NO_ANIMATIONS` → `BtlController_EmitSpriteInvisibility(TRUE)`. Scene OFF ⇒ `HITMARKER_NO_ANIMATIONS` set ⇒ hide. |
| **171** | Sprite visually gone (sprite-region pixels = background; MURKROW body color `(57,82,82)` absent). | — |
| 179-194 | **"ONIX used SPLASH!"** types (player PRINTSTRING at 178, SETMONDATA at 196). | `BattleScript_EffectSplash`, `battle_scripts_1.s:1172`. |
| 234-254 | **"But nothing happened!"** types (22 glyphs). | `STRINGID_BUTNOTHINGHAPPENED`, `battle_scripts_1.s:1178`. |
| ~322-331 | Turn 1 ends; fight menu reopens (id 18). | `BattleTurnPassed`. |
| 333-1523 | Fight menu idle (opponent still airborne, sprite still hidden). | — |
| 1522-1543 | A-A selects turn-2 SPLASH. | — |
| **1558** | `STATUS3_ON_AIR` cleared. | `Cmd_clearsemiinvulnerablebit` (`battle_script_commands.c:9025-9036`), second-turn script `clearsemiinvulnerablebit` `battle_scripts_1.s:1999`/`:2005`. |
| 1560 | Opponent PRINTSTRING — **"Foe MURKROW used FLY!"** types 1561-1580. | `BattleScript_HitFromAtkString` `attackstring`, second-turn script `battle_scripts_1.s:1996-2008`. |
| 1622-1623 | Player controller PLAYSE (43) → HITANIMATION (41). | `hitanimation BS_TARGET`. |
| 1624-1652 | Player sprite hit-flash: `invisible` blinks 1 frame every 4 (0/1 at 1624/1628/1632/1636/1640/1644/1648/1652). | player hit-flash animation. |
| **1673** | Player HP 110→97 (FLY lands for 13 damage). | `datahpupdate BS_TARGET`. |
| 1658+ | Player HEALTHBARUPDATE (24). | — |
| **1769** | Opponent sprite `invisible` cleared — sprite visibly returns. | `MOVEEND_ATTACKER_VISIBLE` in `Cmd_moveend` (`battle_script_commands.c:4355-4365`): attacker no longer SEMI_INVULNERABLE ⇒ `BtlController_EmitSpriteInvisibility(FALSE)` + clear status. |

The opponent healthbox `invisible` flag is **0 for every sampled tick in
30-2300** — never hidden, matching `OpponentHandleSpriteInvisibility`/
`Cmd_makevisible`, which only ever touch the sprite's own flag
(`battle_controller_opponent.c`'s `OpponentHandleSpriteInvisibility`;
contrast the recall receipt `CONTROLLER_RETURNMONTOBALL`, which does call
`SetHealthboxSpriteInvisible`).

**Exact spans (frame numbers):**
- `STATUS3_ON_AIR`: **167-1557** (cleared 1558).
- Opponent sprite hidden: **170-1768** (flag set 170, visible again 1769).
- Healthbox: never hidden.
- Semi-invisible turn = the whole flight: hidden through the turn boundary
  and the fight-menu reopen, until the landing move's `moveend`.

## 3. Why Scene OFF hides it (source)

`Cmd_moveend`'s `MOVEEND_ATTACKER_INVISIBLE` case
(`battle_script_commands.c:4342-4354`) only emits the sprite-invisibility
controller receipt when **both** the attacker is `STATUS3_SEMI_INVULNERABLE`
and `gHitMarker & HITMARKER_NO_ANIMATIONS`. `HITMARKER_NO_ANIMATIONS` is set
once at battle init from the Options > Battle Scene setting
(`battle_main.c:3081-3090`), so under Battle Scene OFF the hide runs; under
Scene ON it does not (the animation layer handles it). The reverse
(`MOVEEND_ATTACKER_VISIBLE`, `:4355-4365`) restores the sprite at the landing
move's move-end.

## 4. App-side consumption (read-only findings)

The chain is **wired end-to-end on the live route** — the ISSUES #79
hypothesis that "the live presentation may not consume it mid-battle" is
**not supported by the current code**; the consumption exists and its
shape matches the real game exactly.

1. **Kernel emit** — `battleScriptMoveEndControllers.ts:182-198`
   (`executeAttackerInvisible`): mirrors the source gate verbatim
   (`status3 & SEMI_INVULNERABLE` **and** `hitMarker & NO_ANIMATIONS`), emits
   `set-battler-sprite-visibility { invisible: true }`; the OFF flag is set on
   fresh battles by `factoryBattleStart.ts:405-407`
   (`hitMarker: config.battleScene === "off" ? BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS : 0`).
   The `MOVEEND_ATTACKER_VISIBLE` mirror is `battleScriptMoveEndControllers.ts:200-229`.
2. **Presentation projection** — `battleResolutionPresentation.ts:2920-2934`:
   the event becomes a `sprite-visibility` command
   (`visible: !payload.invisible`), with `recall` derived from the emitting
   instruction's own opcode
   (`recall: event.provenance?.opcodeName === "B_SCR_OP_VARIOUS"`), not from
   window context. Command type doc: `battleResolutionPresentation.ts:182-201`.
3. **Render-view tracking** — `battleResolutionPresentationRender.ts:379,384`
   (`spriteVisibility`/`healthboxVisibility` maps, both default `true`);
   updates at `:391-393` (completed prior segments), `:459-461` (completed
   current-segment commands), `:604-606` (the in-progress command). **The
   `recall`-flagged variant is the only one that also toggles the
   healthbox** (`if (completed.recall) healthboxVisibility.set(...)`); the
   plain Dig/Fly semi-invisible receipt toggles only the sprite — exactly the
   real ROM's distinction. The view exposes
   `visibility.{player,opponent}.{sprite,healthbox}` at `:665-691`.
4. **Renderer gating** — `battleScene.ts:34300` (`if
   (view.visibility.opponent.sprite)`) and `:34323` (player) skip the
   sprite draw when hidden; `:34346`/`:34354` gate the healthboxes on
   `view.visibility.*.healthbox`. This is the **mid-battle** renderer
   (`renderBattleResolutionSceneOffView`); the live dispatch routes through
   it at `core.ts:2396`
   (`renderBattleResolutionPresentation(fb, resolution, { drawScene:
   renderBattleResolutionSceneOffView })`).
5. **Terminal-seam contrast (the `recall` variant):** the same renderer is
   used for the terminal win/loss seam, where the recall receipt
   (`VARIOUS_RETURN_OPPONENT_MON1/MON2` provenance ⇒ `recall: true`) hides
   sprite **and** healthbox (`battleResolutionPresentationRender.ts:393,461,606`).
   Mid-battle Dig/Fly (`recall: false`) hides only the sprite. Both match the
   real `battle_controller_opponent.c` receipts.

**Remaining-open question for the bind:** the consumption is present, so if
the live app still leaves MURKROW visible the defect is upstream of the
renderer — most plausibly the kernel emission not firing on the specific live
path (e.g. the semi-invulnerable bit not being set, or the moveend case not
reached for that FLY execution). That is not re-verified here (no src edits
allowed this scout); it is the first acceptance item below.

## 5. Bind plan (for a MAIN worker)

1. **Pin the live-route emission with a Tier-1 test** (no src change if it
   passes): drive the app kernel through one OFF-profile FLY turn
   (opponent FLY×4, player SPLASH, the committed scenario's parties) via
   `factoryBattleScriptFullTurnDecision` + the presentation projection +
   `createBattleResolutionPresentationRenderView`, and assert:
   - `set-battler-sprite-visibility { invisible: true, battler: 1 }` is
     emitted during the charging turn's `moveend`, and
   - during the airborne span `view.visibility.opponent.sprite === false`
     while `view.visibility.opponent.healthbox === true`, and
   - after the landing move's `moveend`,
     `view.visibility.opponent.sprite === true` again.
   **Acceptance:** `npm run test:smoke` + focused vitest run.
2. If (1) passes, the app is already correct and ISSUES #79 reduces to a
   re-test of the live play build (the user's observation was likely a stale
   build). If (1) fails, fix the emission gap at its root (semi-invulnerable
   status set or moveend case), keeping the source-mirror gate, and re-run.
3. Oracle pixel regression (optional, once the app renders the scenario):
   compare the committed trace's dense window against the app via
   `npm run compare -- mechanic-opponent-fly-off` (a stage must be authored);
   frames 171-1768 must show the opponent sprite region at background and the
   healthbox present.

**Out of scope for the bind:** Dig/Dive/Bounce (same mechanism, same
`MOVEEND_*` cases — verify one sibling each once Fly is pinned); message
hold timing (ISSUES #77); any Scene-ON behavior.
