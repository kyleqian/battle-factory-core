# trp1: the end-of-turn trap animation (2026-11-20)

The frame catcher saw it first (seed 3, battle 1, "Foe GLOOM is hurt by FIRE SPIN!"; `docs/snd2-catcher-sounds.md`, "Found, not fixed"):
at the end of each turn a trapped Pokémon is hurt, and the ROM first plays a short animation of the trapping move around it. Ours went
straight to the text, with no picture, no time and no sound. This step adds it for every trapping move, both scenes and both sides, measured
on the ROM. It is presentation only: no battle rule or RNG changed.

## What the ROM does

`BattleScript_WrapTurnDmg` (`data/battle_scripts_1.s:3829-3833`) runs `playanimation BS_ATTACKER, B_ANIM_TURN_TRAP, sB_ANIM_ARG1` before
"X is hurt by Y!". `General_TurnTrap` (`data/battle_anim_scripts.s:10361-10439`) picks a branch from the trapped Pokémon's wrapped move
(`AnimTask_GetTrappedMoveAnimId`, `battle_anim_throw.c:2486-2500`). The trapped Pokémon is both the script's attacker and its target.

| move | branch | what it is | Scene ON rows before the text |
|---|---|---|---|
| Fire Spin | `Status_FireSpin` | `Move_FIRE_SPIN` with 2 ember swirls (not 3) and a 30-step shake (not 47); `stopsound` at the end | 81 |
| Whirlpool | `Status_Whirlpool` | `Move_WHIRLPOOL` with 2 water swirls and a 30-step shake | 110 |
| Sand Tomb | `Status_SandTomb` | `Move_SAND_TOMB` with 2 dirt swirls and a 30-step shake, so the closing colour fade starts 24 rows earlier | 101 |
| Wrap, Bind | `Status_BindWrap` | not either move's own animation: Constrict's two green tendrils wrap and squeeze the Pokémon while it shakes sideways | 68 |
| Clamp | `Status_Clamp` | `Move_CLAMP` (two jaws and a hit splat) | 39 |

Scene OFF: `Cmd_playanimation` takes `BattleScript_Pausex20` instead, so the text waits 35 rows (every move, both sides). The kernel already
emitted the `TURN_TRAP` animation event (Scene ON only) with the wrapped move; nothing presented it.

## What changed

- `battleResolutionPresentation.ts`: a `TURN_TRAP` event becomes a `general-animation` command (the Ingrain heal pattern) with the
  wrapped move (`trapMove`) and the ROM's length per branch (`TURN_TRAP_COMMAND_FRAMES`). Scene OFF: `B_ANIM_TURN_TRAP` joins the wsh1
  Pausex20 holds (lead 0 gives the ROM's 35), marked `turnTrapHold`. The HP-bar tail rules read past both, so the HP bar just before keeps
  its measured tail (without that, the Seismic Toss bar in the labs fell back to the 28-row floor and the tick started 13 rows early).
- Fire Spin, Whirlpool and Sand Tomb are drawn by their own exact live move bodies with a trap body: `fireSpin.ts` (`turn-trap`: two
  effect calls, shake 30), `whirlpool.ts` (its `residual` body was already ported for this and never used), `sandTomb.ts` (`turn-trap`:
  two calls, shake 30, closing blend at 76, end 99). `battleResolutionPresentationRender.ts` `turnTrapBodyEffect` runs them through
  `liveMoveAnimation.ts` with `request.turnTrapBody` (the trapped Pokémon as the target, the other battler as the attacker the script
  never touches; no substitute swap). The orchestrator lends the sprite order to the command as it does for the Leech Seed drain.
- Wrap and Bind: `src/animation/turnTrapBindWrap.ts` (the two `AnimConstrictBinding` tendrils with their image and affine animations,
  `AnimTask_ShakeMon2` on the trapped Pokémon), drawn by `battleScene.ts` `turnTrapRenderView`. New art `src/animation/assets/tendrils.json`
  (`tools/extract/extract-turn-trap-tendrils.ts`), prefetched in the browser with Bind (20) and Wrap (35) (`anim-asset-moves.json`).
- Sounds: `tools/extract/extract-anim-sound-timing.ts` now walks the five branches as their own entries (the walk could not resolve the
  branch); `moveAnimSounds.ts` plays the branch's SEs and the `stopsound` stop (`TURN_TRAP_STOP`).
- `liveBattlerX2History.ts`: a trap animation leaves the trapped Pokémon at x2 0 (every branch ends on its shake task), as the Focus
  Punch set-up already did. Before, the tracker marked it unknown and the next trap tick's first rows drew the foe 1 pixel off.

## ROM evidence

Labs `tools/battle-lab/trp1-<move>-<side>-<scene>.json` (`tools/integration/trp1Labs.py`): a Lv50 Rattata with the trapping move x4
against a Lv25 Rattata with Seismic Toss x4 (fixed damage and an exact body; the trapper always moves first), `player` = the player's
Rattata is trapped, two turns. App stages `trp1-*` in `tools/compare/appTrace.ts`, traces `tools/compare/traces/trp1-*.json`.

The app stage's RNG seed: the lab's own seed does not give the ROM's dice in the app stage (the first labs, copied from hpf4m with Splash,
missed on one side and hit on the other), so the seed is one whose turns are the ROM's: the ROM's `gRngValue` at trace frame 0 (the lab's
capture state) stepped back k draws, with k found by replaying (HP and trap length at frames 1000 and 2200 equal the ROM's). Foe side
k = 4 for every move; player side k = 78 (Fire Spin, Whirlpool, Sand Tomb, Clamp) and 567 (Wrap, Bind). Hits, damage, trap length and
order then match the ROM on both turns.

In these labs the rows before the first tick already sit a constant number of rows behind the ROM (Scene ON 12 to 23 by move, Scene OFF
6 / 7: the trapping move's own hit and Seismic Toss, not this step), so the animation is compared at that offset. Results with this step
(`npm run compare` windows of 256 frames on the labs; scratch output under `.integration/trp1/`, not kept):

- Scene ON, first tick, from 30 rows before the command to 140 after its start: every frame identical to the ROM for Fire Spin, Whirlpool,
  Sand Tomb and Wrap on both sides, and Bind on the player side. Bind with the foe trapped: identical from the shake on (age 19); before
  it our foe stands 1 pixel left of the ROM's (410 px), which the rows before the command already show (the x2 tracker's state after
  Bind + Seismic Toss; not changed here). Clamp: identical except ages 11 to 32, the undrawn jaws and hit splat.
- Scene ON, second tick: identical for every drawn branch and side (the x2 tracker fix above removed a 1-pixel foe offset in the first
  4 to 18 rows on the foe side).
- Scene OFF: identical through the hold, the text and the HP bar (the few later differences are the next turn's, present before this
  step at the same place, 35 rows earlier).
- Sounds (`tools/audio/soundEventProbe.py lab ... --fast`, all 12 Scene ON labs): every SE row is at command age = the script frame in the
  sound table (Status_BindWrap SE_M_SCRATCH 3 and 10, SE_M_BIND 39; Fire Spin and Sand Tomb 3; Whirlpool 8; Clamp 9), panned to the trapped
  side (-64 player, 63 foe), and the stop of the still-playing SE at 78 (Fire Spin, SE2), 98 (Sand Tomb, SE1) and 103 (Whirlpool, SE1).
  Ours: the same rows, ids, pans and stops.

Test: `tests/trp1TurnTrapAnimation.test.ts` (ROM frame hashes by command age for the 10 drawn labs and Clamp's text, the ROM SE rows of
all 12 Scene ON labs, the command lengths of both ticks, the Scene OFF hold). It fails when the animation's clock moves by one frame.

Frame catcher re-run on the finding itself (seed 3 Scene ON `full`, 3 battles, this branch, `JOBS=1 KEEP=1 tools/frame-catcher/run.sh`):
the stretch with CHARMELEON's Fire Spin and "Foe GLOOM is hurt by FIRE SPIN!" (engine 8,565 to 9,423, ROM 8,936 to 9,814) is now timing
only: the same pictures (501 / 502 distinct) and the same 14 sounds, nothing missing or extra. The tick's SE_M_SACRED_FIRE2 and its stop
are 75 frames apart on both sides and sit 1 frame further from the Acid hit's SE than on the ROM; the stretch's other 19 frames of drift
come from the Fire Spin and Acid moves earlier in the turn (existing timing, not checked here).

## Gameplay

Battle rules and RNG do not change: Frontier battles draw no RNG per frame, and the new rows are presentation only. Checked with the
frame catcher's trace maker (`tools/frame-catcher/makeTrace.mjs`, the soak's seeded test player, 3 battles) on master (aa4cc49ce) and on
this branch, and the library session's gameplay digest (a hash of the battles' semantic events):

| trace | master digest | this branch |
|---|---|---|
| Kyle's live trace (`_playtest-20261120/kyle-trace.json`, no trap tick reached) | 90a4f3cc19dd63f3 | 90a4f3cc19dd63f3 |
| seed 1 Scene ON `winning-swap` (no trap move) | 1be48b0245d3b546 | 1be48b0245d3b546 |
| seed 3 Scene ON `full` (a Fire Spin tick in battle 1, "Foe GLOOM is hurt by FIRE SPIN!"), each build its own trace | e562832ab805888f | e562832ab805888f |
| seed 8 Scene OFF `winning-swap` (3 Fire Spin ticks), each build its own trace | afa23172d179cffc | afa23172d179cffc |

What moves: a fixed button trace recorded on master that reaches a trap tick (seed 3 ON / OFF, seed 8 OFF replayed on this branch) gets
another digest, because the tick now takes 68 to 110 (ON) or 35 (OFF) more rows, so every later press lands later in the game. The same
seed played by the test player on each build gives the same battles (the digests above, and identical battle text for all 3 battles).
Seed 3 Scene OFF `full` is the exception that proves the point: its battle 1 (with the ticks) is identical, then the test player, whose
own draws run per frame, chose to switch PHANPY out on master and not on the branch.

Test pins that moved with the new rows (each re-checked, none a rule change):

- `tests/randomRoundSoak.test.ts` "a winning seed chains two round wins": seed 10 now carries 7 (the soak's presses land at other phases);
  seeds 0..49 re-scanned, 13 / 27 / 47 carry 14, 13 is pinned.
- `tests/randomRoundSoakCoverageFight.test.ts` "declines every postwin swap offer": seed 0's first swap offer moved from frame 76621 to
  117797 (battle 1 lasts to turn 105), so the run is 120,000 frames (was 90,000).
- `tests/liveSpriteOrderHost.test.ts` sweep: + the 2 new TURN_TRAP command edges, both known and equal to the pure transform (compared /
  hostKnown 847 / 746 -> 849 / 748; 0 mismatches).
- `tests/liveBattlerX2History.test.ts`: TURN_TRAP was the test's example of an unknown animation; it now resets the trapped side, and
  WISH_HEAL is the unknown example.

## Not done

- **Clamp's pictures.** Clamp is in no Factory set (`src/data/gen/factory-animation-inventory.json`: outside the Factory, only Shellder),
  so `Status_Clamp` cannot play here. Its command has the ROM's 39 rows and its SE; the jaws (Bite's sprite with Clamp art) and the hit
  splat are not drawn.
- An elevated opponent's shadow during `Status_BindWrap` is hidden for the script's rows (`SpriteCB_EnemyShadow` hides it while an
  animation script runs); the labs' Rattata has no shadow, so this is not ROM-checked. The move-body branches use their move's shadow rule.
- The other battler behind a Substitute doll during a Fire Spin / Whirlpool / Sand Tomb tick: the body is not drawn (the field stands;
  the timing and sounds stay). A trapped Pokémon behind a doll gets no animation, as on the ROM.
