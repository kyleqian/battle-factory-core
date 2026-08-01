# Primary-status clear display boundary — Battle Scene OFF checkpoint

This SIDE-lane source-and-oracle receipt complements
[`fire-punch-burn-lifecycle-off-evidence.md`](fire-punch-burn-lifecycle-off-evidence.md).
It adds no production interpreter, controller, renderer, animation, generated data, or
trace change. Its purpose is the generic **primary-status clear** boundary: logical and
party status clear before the healthbox icon does.

[`mechanic-primary-status-clear-heal-bell-toxic-off.json`](../tools/battle-lab/mechanic-primary-status-clear-heal-bell-toxic-off.json)
uses `mechanicLab` `overrides.parties` to construct three complete records per side before
normal battle initialization. It explicitly selects `battle-scene-off`; the observed
metadata says `sourceInitialized: true` and `customPartiesBuiltBeforeBattle: true`.
Nothing transient is staged: Toxic and Heal Bell are normal move choices, and all HP,
status, controller, turn, and display changes are ROM-owned.

## Staged legal route

- Player lead: level-50 Chimecho (schema species 358), with stock Heal Bell (move 215)
  in slot 2. Chimecho learns it at level 38 in the pinned source
  (`reference/pokeemerald/src/data/pokemon/level_up_learnsets.h:5603-5616`).
- Opponent lead: level-50 Crobat (species 169), four Toxic slots (move 92). Crobat's
  TM/HM learnset includes Toxic (`tmhm_learnsets.h:4398-4403`); repeated legal slots
  constrain the Factory AI without injecting a decision. Its source base Speed is 130
  versus Chimecho's 65 (`species_info.h:5079-5087`, `11639-11647`), and the built
  receipt reports 182 versus 70, so Toxic acts first.
- Seed 1 lands Toxic, then the already-selected Heal Bell cures that Toxic in the same
  turn. The next ordinary action request therefore has no opportunity to reapply it.

The trace asks for frame 0 and every VBlank in the five claimed windows:
**140-145**, **232-237**, **272-277**, **320-328**, and **407-416** — 38 captures in
all, each with oracle semantic state. It is a new narrow fixture, not a thinned capture
list from an existing trace.

## Battle Scene OFF result

The oracle framebuffer digests below are raw RGB888 SHA-256 values, not PNG-file hashes.
`status1` and the active persistent party record are both shown because the status-data
controller path writes both.

| Frame boundary | Observable receipt | Raw framebuffer SHA-256 |
| --- | --- | --- |
| 141 → 142 | Toxic's normal script changes active and party `status1` together from `0 → 128` (`STATUS1_TOXIC_POISON`). The framebuffer is deliberately unchanged: the PSN icon is not yet displayed. | `48171b3d7ee11489c6886521e3aae68e06d2e5e74fff17a815dd0425b916b92f` (both) |
| 234 → 235 | The raw state remains 128; frame 235 is player controller command 26 (`CONTROLLER_STATUSICONUPDATE`), `controllerExecFlags = 1`, and PSN first appears in Chimecho's healthbox. | `f084084f900b29f754a26b4bd00dba5d68e355dbfad8c93c7e4af28ceaee17c4` → `e48111d17bdf2c9da6a6b8c3eed4dd93e3a1aa6f2c974f6c27a02ea23b2ddc2a` |
| 274 → 275 | Heal Bell has spent PP `5 → 4`; `healpartystatus` changes active and party `status1` from `128 → 0`. The PSN pixels are still present. | `58bbdbb47347c6053ece1ff4c8e59960b7a1248ba8bbd75f288eef4f56a82efa` (both) |
| 325 → 326 | The source-owned icon update removes PSN while `A bell chimed!` is held. It is **51 frames after** the raw clear, so clearing the displayed icon at raw data receipt would be early. | `4bcc2a416269398df3bc21c22448330d15792bc9a129d01fb97a507031214b03` → `3c35159c18f75253dd3e65536d0552d1465c285e36684aa6ce669f69627dab54` |
| 409; 415 | Both battlers receive normal `CONTROLLER_CHOOSEACTION` at 409, and frame 415 is the settled `What will CHIMECHO do?` prompt. Active and party `status1` remain 0, PP remains 4, and outcome remains 0. | `f73c1e93b330f6e083bac6aeb54bb700c4d889d37baa5b4d59d09d8f946c18f2`; `be9cf9dd3b24c7cfe570f559f8512f3960043f316e3c900b5e6c2c95f40f0d3a` |

Thus primary-status application has a 93-frame data-to-icon delay here (142 → 235),
while the generic party cure has a distinct 51-frame clear delay (275 → 326). Both
are normal controller/display sequencing, not a Battle Scene ON animation.

## Source causal map

- Toxic's stock effect script runs its guards, accuracy check, animation, then
  `setmoveeffect MOVE_EFFECT_TOXIC` / `seteffectprimary`
  (`reference/pokeemerald/data/battle_scripts_1.s:686-705`). `SetMoveEffect` writes
  the primary word and emits `REQUEST_STATUS_BATTLE` to the target controller
  (`src/battle_script_commands.c:2476-2489`); the player controller writes
  `MON_DATA_STATUS` to the party record (`src/battle_controller_player.c:2102-2104`).
  The generic poison result script prints, waits, then calls `updatestatusicon`
  (`data/battle_scripts_1.s:3869-3876`).
- Battle Scene OFF sets `HITMARKER_NO_ANIMATIONS`, so `Cmd_statusanimation` skips its
  animation controller emission (`battle_script_commands.c:5753-5766`), but it does
  **not** skip `Cmd_updatestatusicon`. That command emits status1/status2 and marks the
  controller (`7699-7729`); `PlayerHandleStatusIconUpdate` redraws
  `HEALTHBOX_STATUS_ICON` from the persistent party record (`battle_controller_player.c:2755-2765`).
  This explains the visible frame-235 apply edge without inventing an OFF animation.
- Heal Bell's shared script is `ppreduce → healpartystatus → waitstate → ... →
  updatestatusicon → waitstate` (`battle_scripts_1.s:1361-1382`).
  `Cmd_healpartystatus` zeros the non-Soundproof attacker's `status1`, gathers the party
  mask, and emits one zero `REQUEST_STATUS_BATTLE` write (`battle_script_commands.c:8375-8465`).
  The later script icon command, rather than that earlier logical write, causes the
  frame-326 visible clear.
- With no outcome, `BattleTurnPassed` resets turn values, makes new action selections,
  and advances the random turn number (`battle_main.c:3956-4013`);
  `HandleTurnActionSelectionState` emits Choose Action (`4160-4170`), and the player
  controller builds the normal action prompt (`battle_controller_player.c:2575-2584`).

## Reproduction and determinism

```sh
scratch_a=$(mktemp -d /tmp/pokebench-primary-status-clear-a-XXXXXX)
scratch_b=$(mktemp -d /tmp/pokebench-primary-status-clear-b-XXXXXX)
bin/oracle --profile battle-scene-off lab \
  tools/battle-lab/mechanic-primary-status-clear-heal-bell-toxic-off.json \
  -o "$scratch_a" --quiet
bin/oracle --profile battle-scene-off lab \
  tools/battle-lab/mechanic-primary-status-clear-heal-bell-toxic-off.json \
  -o "$scratch_b" --quiet
cmp -s "$scratch_a/manifest.json" "$scratch_b/manifest.json"
diff -qr "$scratch_a" "$scratch_b"
```

Two fresh runs produced a byte-identical 966-frame manifest and all 38 matching PNGs.
Fixture SHA-256: `99c73b507ef52493d4a3cbe1873c259d5998ecc8c45dce4aaf4cdbd4bc739c93`.
Manifest SHA-256: `068ccfb40b8e8fda280e33182d5033ba4131fc1040fc259865f43d6f0bc202a4`.

## Smallest generic follow-up

The existing typed `status-icon-update` semantic event should own the display boundary
for both nonzero status and `status1 = 0` clears. Preserve the raw status-data receipt
for battle logic, but clear `displayedStatus1` only when a short, controller-owned
generic status-icon presentation command completes. No new controller interface,
move-specific branch, absolute-tick fit, or Scene-ON animation is justified by this
checkpoint.
