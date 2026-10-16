# fpo187 -- the Scene ON Focus Punch pre-pass "+2" row (ISSUES #139 remainder)

Evidence only; no `src/` or test change. Question: in Scene ON the ROM's pre-pass "...is tightening its focus!" print is 125 rows after the
empty box on `fpc177-a-switch-on` and on the SECOND pre-pass of `fpc177-b1-two-users-on`, but 127 on the (b) cards' first pre-pass and in
production (`docs/fpc177-focus-punch-edges.md` Remainder, `docs/fpc180-focus-punch-live.md` Remainder).

## Answer

The two rows are not in the animation, the sprite wait or the controller handoff. They are a **sound-effect wait**: the battle animation
launch is held while the menu SE the player just triggered is still playing.

`Cmd_playanimation` (`reference/pokeemerald/src/battle_script_commands.c:4004-4041`) emits `BtlController_EmitBattleAnimation`, and both
`PlayerHandleBattleAnimation` (`src/battle_controller_player.c:3066-3080`) and `OpponentHandleBattleAnimation`
(`src/battle_controller_opponent.c:1990-2002`) start with `if (!IsBattleSEPlaying(gActiveBattler))`. `IsBattleSEPlaying`
(`src/battle_gfx_sfx_util.c:554-575`) returns TRUE (and bumps `soundTimer`, cap 30 calls) while `IsSEPlaying()` (`src/sound.c:606-613`:
an SE music-player has a live track) is true. The handler is simply retried each frame until the SE ends; only then does
`TryHandleLaunchBattleTableAnimation` start `General_FocusPunchSetUp` (`data/battle_anim_scripts.s:10635`).

The last `PlaySE(SE_SELECT)` of the player's turn input (`battle_controller_player.c:247-374`) is a 10-frame SE (every A / D-pad press in the
traces shows `gMPlayInfo_SE2.status` = 1 for exactly 10 frames). In the Fight-menu cards the confirming `A` is the trace's last input and
lands 2 frames before the turn-order row; `BattleScript_FocusPunchSetUp` (`data/battle_scripts_1.s:3709-3716`) reaches `playanimation` at
turn-order + 6, i.e. 2 frames before that SE ends (turn-order + 8). In the voluntary-switch card the last SE is 64 frames before the turn
order, and the second pre-pass is ~100 frames after the first pre-pass's animation, so nothing is playing and the animation starts on the
first attempt. Everything after the animation start is identical.

## Row table (Scene ON, ROM, twice-fresh `fpo187Probe.py`, r1 == r2 byte for byte; `fixtures/fpo187/*.json`)

| card / pre-pass | user | turn-order row | last SE (se2 playing) | empty glyph E | `playanimation` reached | anim launched (gAnimScriptActive) | wait | tightening glyph | E -> anim | anim -> glyph | E -> glyph |
|---|---|---|---|---|---|---|---|---|---|---|---|
| b2-hit-scratch-on, pre-pass 1 | player | 68 | 66..75 (A = trace frame 66) | 72 | 74 | 76 | **2** | 199 | 4 | 123 | **127** |
| b1-two-users-on, pre-pass 1 | player | 68 | 66..75 (probed: se2 = 1 at 66..75, anim at 76) | 72 | 74 | 76 | 2 | 199 | 4 | 123 | 127 |
| b1-two-users-on, pre-pass 2 | foe | (297 re-entry) | none (`se1`/`se2` paused 290..300) | 299 | 301 | 301 | 0 | 424 | 2 | 123 | **125** |
| a-switch-on, pre-pass 1 | foe | 308 | 234..243 (last A) | 312 | 314 | 314 | 0 | 437 | 2 | 123 | **125** |

Per-frame excerpts (`gBattleControllerExecFlags`, `gBattlerControllerFuncs`, `gMPlayInfo_SE{1,2}.status`, `gPauseCounterBattle`, script offset):

- b2 ON: 70 `FocusPunchSetUp`; 71 `+3` (print, ctrl0 `CompleteOnInactiveTextPrinter2`); 73 `+6`; **74 `+0xd` (playanimation), execFlags 1, ctrl0 still
  `PlayerBufferRunCommand`, se2 = 1**; 75 same; **76 ctrl0 `CompleteOnFinishedBattleAnimation`, se2 = paused, `gAnimScriptActive` = 1
  `General_FocusPunchSetUp+0x3`**.
- a-switch ON: 310 script; 311 `+3` (ctrl1 `CompleteOnInactiveTextPrinter`); 313 `+6`; **314 `+0xd`: ctrl1 `CompleteOnFinishedBattleAnimation` and
  `gAnimScriptActive` = 1 on the same row**; se1 = se2 = paused throughout.
- b1 ON pre-pass 2: 297 script; 298 `+3`; 300 `+6`; 301 `+0xd` + anim active on that row; se paused.

`animation -> tightening glyph` is 123 in every case (76 -> 199, 314 -> 437, 301 -> 424), so the animation, its sprite/affine waits and the
`waitforvisualfinish` tail are the same; the whole difference is the 2 frames before the launch. The same SE-wait is why Scene OFF is
unaffected: OFF takes the `HITMARKER_NO_ANIMATIONS` branch (`BattleScript_Pausex20`, `battle_script_commands.c:4019-4023`) and never reaches
the controller handler (empty glyph -> tightening glyph is 37 rows in every OFF card: 72 -> 109, 209 -> 246, 312 -> 349).

## The rule production needs

Production models the pre-pass as an empty-box command (`minimumFrames = to - from + 1`, `focusPunchPrePassMessageTiming`,
`src/engine/battleResolutionPresentation.ts:176-188`) then a 124-frame general-animation command (`FOCUS_PUNCH_SETUP_COMMAND_FRAMES`, :142,
used at :4223-4237). Their sum is the 127 that matches the Fight-menu first pre-pass. In Scene ON only, shorten the empty-box to animation
span by 2 (or equivalently the animation command by 2) whenever the SE wait is not in play:

    animWait = max(0, (lastMenuSeStartFrame + 10) - (turnOrderRow + 6))
    pre-pass E -> tightening glyph = 125 + animWait

- first pre-pass of a Fight-menu move turn: `lastMenuSeStart = turnOrderRow - 2` -> animWait 2 -> 127 (production already right).
- first pre-pass of a voluntary-switch turn: the last SE ended long before -> animWait 0 -> **125** (production 127, +2).
- every later pre-pass in the same turn (second Focus Punch user): animWait 0 -> **125** (production 127, +2).
- Scene OFF: no term (Pausex20 path), keep the current rows.

That removes the +2 at a-switch ON (437 / 543 / 625 ...) and at b1 ON 2nd tightening / used (424 / 534), which are the only ON rows still
+2 in `docs/fpc180-focus-punch-live.md` §1. Production does not model the SE; the minimal faithful form is a per-pre-pass flag
"input SE still playing at the launch attempt" = (pre-pass index 0) and (the turn's player decision is a move, not a switch).

## Not covered / caveats

- Only the Fight-menu move and the voluntary-switch decisions were measured. A Bag item turn (an item use before a foe pre-pass) has a different last-input
  SE timing and is unmeasured; the rule above gives the SE-end formula but its `lastMenuSeStart` for that path is not probed.
- A foe-user first pre-pass after a Fight-menu move was not carded (the (b) cards all have the player's Breloom as the first user), so
  "side of the user" is not separately excluded by a card; the controller handlers are the same code for both sides apart from the name,
  and the per-frame probe shows the wait comes from the SE, not the side. The b1 second pre-pass (foe) is 125 with no SE.
- Scene ON first-pre-pass cards where the move is selected by something other than one A press (e.g. a different SE phase relative to the
  turn-order row) were not measured; the 2-frame A -> turn-order lead was seen in all four (b) ON cards via their identical anim-start row (76), and directly in the
  per-frame probe on `b2-hit-scratch-on` and `b1-two-users-on` (the Agility / Thunder Wave cards were not re-probed per frame).

## Reproduce

```sh
source /etc/pokebench-runner.env
F=tools/integration/fixtures/fpc177/scenarios; PY=/srv/pokebench/vendor/mgba-venv/bin/python
for c in b2-hit-scratch-on a-switch-on b1-two-users-on; do
  python3 tools/run-mgba-probe.py /tmp/$c.json -- $PY tools/integration/fpo187Probe.py $F/fpc177-$c.json /tmp/$c.json --until 330
  cmp /tmp/$c.json tools/integration/fixtures/fpo187/$c.json
done
```

`tools/integration/fpo187Probe.py` is `fpc177Probe.py` reduced to a per-frame state log (rows only when any watched field changes, frames
<= `--until`). Each probe takes seconds.
