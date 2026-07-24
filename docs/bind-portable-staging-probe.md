# BIND Scene-ON portable hit staging

`mechanic-bind-player-onix-opponent-murkrow.json` is a legal Level-50
Mechanics Lab case: player-back ONIX has four BIND slots with
`ppUps:[0,0,0,0]`; the normal ROM action is selected with ordinary inputs.
The deterministic seed produces a hit, not the old canonical ONIX miss:
PP is 20→19, MURKROW is 142→137, and its trapped `status2` is installed as
`0x0000c000` at frame 476.

The teardown-safe dense RAM probe establishes this ownership boundary:

| Oracle frames | owner | RAM-backed observation |
| --- | --- | --- |
| 382–426 | BIND move script | attacker controller is busy; ONIX `y2` executes the source sway (first visible at 385), then returns to zero at 424; the script releases at 426 |
| 429–470 | generic hit / HP presentation | target controller changes to generic hit command 41, then health command 24; this is not BIND-owned animation |
| 471–517 | damage / trapped-state commit | HP becomes 137 at 471, `status2=0xc000` at 476, then controller work continues |
| 590 onward | residual lifecycle | `gCurrentMove` is already MOVE_NONE; the trap counter changes to `0xa000` and the continuing wrapped/residual damage animation begins at 610 |

Source matches the boundary. `Move_BIND` in
`data/battle_anim_scripts.s` creates `AnimTask_SwayMon` and then invokes
`BindWrap` twice; each `BindWrapSqueezeTarget` is a 16-frame
`AnimTask_ScaleMonAndRestore` target task. The tendril sprites belong instead
to `General_TurnTrap` → `Status_BindWrap`, which runs during the residual
lifecycle and uses `gConstrictBindingSpriteTemplate` (`ANIM_TAG_TENDRILS`).
They are therefore deliberately excluded from this move-body fixture.

Reproduce the dense evidence with the mGBA environment (the wrapper accepts
the known post-write teardown SIGSEGV):

```sh
scratch_dir=$(mktemp -d)
probe_python="$(dirname "$(realpath reference/pokeemerald)")/mgba-venv/bin/python"
python3 tools/run-mgba-probe.py "$scratch_dir/bind.json" -- \
  "$probe_python" tools/probe/run-battle-lab-rgb.py \
  tools/battle-lab/mechanic-bind-player-onix-opponent-murkrow.json \
  "$scratch_dir/bind.json" "$scratch_dir/bind-rgb"
```

No side/orientation expansion is claimed: the source `Move_BIND` has no
target-anchor sprite program, while a later implementation must still prove
the source-side behavior of `AnimTask_SwayMon` and target scale task through
the shared presentation seam. This checkpoint intentionally does not implement
damage, controller, result text, trapped-state, or residual mechanics.
