# AERIAL ACE portable Scene-ON acceptance

Two legal Level-50 mechanicLab cases now pin AERIAL ACE with exactly
`ppUps:[0,0,0,0]` in both required orientations:

- opponent-front PIDGEOTTO → player-back ONIX:
  `gCurrentMove` installs at frame 39, HP resolves 117→108, and
  `MOVE_NONE` cleanup occurs at frame 281. The complete intended dense
  acceptance window is frames 46–281 (236 frames).
- player-back PIDGEOTTO → opponent-front ONIX:
  `gCurrentMove` installs at frame 39, HP resolves 117→108, and
  `MOVE_NONE` cleanup occurs at frame 277. The complete intended dense
  acceptance window is frames 46–277 (232 frames).

The four-frame difference is the source/controller printer offset already
seen in other opposite-side cases. The AERIAL-specific state is extracted
behind the shared presentation seam in `src/engine/aerialAce.ts`: signed
fixed-point ellipse tables, two TraceMon slot lives with their independent
OAM-tie order, the 24-display cutting-slice program, the three-display
complex palette blend, and the 16-display vertical shake. Tier-1 tests pin
those clocks, both non-mirrored geometries, immutable HP endpoints, result
printer ages, and cleanup boundaries.

Both complete unthinned windows are now pixel-exact through the live shared
presentation seam:

- opponent-front frames 46–281: **236/236**, zero differing pixels;
- player-back frames 46–277: **232/232**, zero differing pixels.

The opposite side genuinely adds two source-driven variants. The slice
callback anchors to `gBattleAnimTarget`, so its fixed `(40,-32)` script args
produce base `(112,56)` for the player target and `(216,8)` for the opponent
target. The settled opponent-front Onix starts with front-animation OAM
`x2=+1`; monbg ownership resets it to the source base X at animation age 57
and the restored OBJ retains that corner through cleanup. No absolute battle
or turn tick participates.

Reproduce the evidence through the required teardown-safe wrapper:

```sh
scratch_dir=$(mktemp -d)
python3 tools/run-mgba-probe.py "$scratch_dir/opponent.json" -- \
  "$(dirname "$(realpath reference/pokeemerald)")/mgba-venv/bin/python" \
  tools/probe/run-battle-lab-rgb.py \
  tools/battle-lab/mechanic-aerial-ace-pidgeotto-onix.json \
  "$scratch_dir/opponent.json" "$scratch_dir/opponent-rgb"
python3 tools/run-mgba-probe.py "$scratch_dir/player.json" -- \
  "$(dirname "$(realpath reference/pokeemerald)")/mgba-venv/bin/python" \
  tools/probe/run-battle-lab-rgb.py \
  tools/battle-lab/mechanic-aerial-ace-player-pidgeotto-onix.json \
  "$scratch_dir/player.json" "$scratch_dir/player-rgb"
```
