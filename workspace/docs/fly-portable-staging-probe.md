# Portable FLY staging checkpoint

`MOVE_FLY` remains **partial**. This checkpoint proves the legal two-turn
stock-ROM staging and installs a source-relative presentation reducer, but it
does not claim a complete portable framebuffer window.

## Legal Scene-ON cases

- `tools/battle-lab/mechanic-fly-murkrow-onix.json`: Level-50 set 184
  MURKROW attacks set 156 ONIX from the opponent side. FLY owns frames
  39–197 (charge) and 473–732 (strike); resolved HP is 117→106.
- `tools/battle-lab/mechanic-fly-player-murkrow-onix.json`: the same legal
  sets in the opposite orientation. FLY owns frames 39–193 and 372–627;
  resolved opponent HP is 117→106.
- Both overrides specify `ppUps:[0,0,0,0]`. The builder, damage, PP, action
  order, multi-turn lock, RNG, and controller outcomes are untouched.

Both were run through `tools/run-mgba-probe.py` with
`tools/probe/run-battle-lab-rgb.py` against the Battle Scene ON profile.

## Portable source state

`src/engine/fly.ts` consumes only a phase-relative age, attacker side, and
source battler centers. It models:

- the shared charge affine program and persistent attacker disappearance;
- the longer player-back charge lifetime caused by its lower source center;
- side-selected offscreen strike origins and affine programs;
- Q8.8 linear travel through the target center;
- side-dependent screen-exit/reappearance;
- the already-shared basic hitsplat and `AnimTask_ShakeMon` schedule.

Direct RAM/OAM evidence:

- opponent charge: frames 58–81, center `(176,51)`, final `y2=-81`;
- player charge: frames 58–83, center `(72,97)`, final `y2=-113`;
- opponent strike: frames 523–552, displayed `(262,-26)` through
  `(-28,148)`, matrix `{142,212,-212,142}`;
- player strike: frames 418–446, displayed `(-22,-29)` through `(269,75)`,
  matrix `{86,-241,241,86}`.

## Honest remainder

The shared reducer is wired into `sceneOnPresentation.ts`, but the portable
framebuffer adapter is not complete: the player-back MURKROW asset and both
orientation-specific healthbox/controller windows still need to be installed
and dense-compared. Canonical charge and strike traces remain the only pixel
evidence. ISSUES #34 also remains unchanged: the first seven visible charge
frames are excluded because the generic affine sampler overdraws only within
the ball footprint. No FLY-, tick-, or matrix-specific sampler exception was
added.
