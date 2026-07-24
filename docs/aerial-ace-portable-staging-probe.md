# AERIAL ACE portable Scene-ON staging checkpoint

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

This checkpoint is intentionally **not pixel acceptance**. The live
portable compositor is not installed, and neither dense window has been
compared; the fixtures say `staged-not-compared` explicitly. AERIAL ACE
therefore remains partial. The bounded remainder is exactly all 236 and all
232 frames above, including kickoff, body, generic hit, drain, result,
release, and cleanup.

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
