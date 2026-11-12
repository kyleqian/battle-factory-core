# Standalone runtime experiment

See `../../../docs/archive/ANIMATION_RUNTIME_INVESTIGATION.md` for the forward-only question,
results, limitations and next decision. Production files and coverage are untouched.

The runtime consumes JSON instruction data extracted from the pinned ROM at
development time; it never reads the ROM, emulator, oracle or fixtures itself.
The verifier supplies initial context and the external audio host's busy flag.
`observations.json.gz` retains compact source/OAM observations, not pixel captures.

From the workspace root:

```sh
POKEBENCH_VITEST_MAX_WORKERS=1 npm test -- tests/animation/animationRuntimeSpike.test.ts tests/animation/animationBoundaryRatchet.test.ts tests/animation/factoryAnimationInventory.test.ts
npm run typecheck
node --experimental-strip-types tools/animation/runtime-spike/verify.ts tools/animation/runtime-spike/observations.json.gz /tmp/runtime-check.json
```

The verifier freshly decodes the reference script/affine data, then checks every
retained row. Unit tests use committed data and need no emulator or network.
`programs.json` is reproducible with:

```sh
node --experimental-strip-types tools/animation/runtime-spike/extract.ts /tmp/runtime-programs.json Move_TAIL_WHIP Move_BIND Move_SPLASH
cmp /tmp/runtime-programs.json tools/animation/runtime-spike/programs.json
```

For fresh Splash observations, choose a new output path (the wrapper refuses
stale output). `POKEBENCH_MGBA_PYTHON` points to the existing harness interpreter:

```sh
POKEBENCH_MGBA_PYTHON=../../vendor/mgba-venv/bin/python \
python3 tools/run-mgba-probe.py /tmp/runtime-splash-fresh.json -- python3 \
  tools/animation/runtime-spike/capture.py /tmp/runtime-splash-fresh.json \
  tools/animation/runtime-spike/splash-player-fixture.json \
  tools/animation/runtime-spike/splash-opponent-fixture.json
node --experimental-strip-types tools/animation/runtime-spike/verify.ts /tmp/runtime-splash-fresh.json /tmp/runtime-splash-fresh-receipt.json
```

To reproduce the complete retained set, prepend the four control fixtures:
`tail-whip-player-ponyta-opponent-onix.json`,
`tail-whip-opponent-ponyta-player-onix.json`,
`bind-player-onix-opponent-murkrow.json`, and
`bind-opponent-onix-player-murkrow.json`, all under `tools/compare/fixtures/`.
Captures instantiate local mGBA cores directly; they do not use or manage a
shared HTTP oracle. The known Python binding teardown SIGSEGV is accepted only
by the existing wrapper after valid fresh JSON has been written.

Sources: `battle_anim.c` (script commands), `task.c` (fixed slots and linked
priority traversal), `battle_anim_mon_movement.c` (control callbacks),
`battle_anim_effects_2.c` (Splash), `battle_anim_mons.c` (task affine commands),
`main.c` / `battle_main.c` (frame phases), and `battle_gfx_sfx_util.c`
(controller affine restoration). The pinned agbcc binary uses 8-byte affine
commands and 4-byte MonCoords records; the probe/decoder respects that ABI.

`receipt.json` covers all six control/new cases. `splash-repeat-receipt.json`
records the second fresh Splash run and canonical per-case hashes, with equality
to the first capture explicitly checked. These receipts grant no move acceptance.

## Forward decision evidence

The completed comparison uses the unchanged production WindUpLunge helper for
Snatch and the unchanged experimental Splash callback for Mud Sport's task.
The Mud Sport comparison supplies the observed creation boundary once and
executes a synthetic task-only harness; it does not execute the full move.
Neither case is a pixel/production acceptance. See `forward-receipt.json` for
the precise exclusions and the investigation report for the recommendation.

```sh
node --experimental-strip-types tools/animation/runtime-spike/compare-forward.ts tools/animation/runtime-spike/forward-observations.json.gz /tmp/runtime-forward-receipt.json
node --experimental-strip-types tools/animation/runtime-spike/extract.ts /tmp/runtime-forward-programs.json Move_SNATCH Move_MUD_SPORT
cmp /tmp/runtime-forward-programs.json tools/animation/runtime-spike/forward-programs.json
python3 tools/animation/runtime-spike/audit-forward.py > /tmp/runtime-forward-graphics-audit.json
cmp /tmp/runtime-forward-graphics-audit.json tools/animation/runtime-spike/forward-graphics-audit.json
POKEBENCH_VITEST_MAX_WORKERS=1 npm test -- tests/animation/animationRuntimeForwardComparison.test.ts
```

Fresh captures use the same wrapper/capture command above, replacing the two
Splash fixture paths with `snatch-player-fixture.json`,
`snatch-opponent-fixture.json`, `mud-sport-player-fixture.json`, and
`mud-sport-opponent-fixture.json`, all in this directory. Supply a new output
path, then run `compare-forward.ts` on that JSON. The probe performs no runtime
state injection beyond the existing MechanicLab scenario preparation.

At the experiment checkpoint, the source decoder recognized three additional
commands for inspection—loadspritegfx, createsprite and waitplaysewithpan—while
the spike runtime still rejected them. Affine resources were selected by
callback demand rather than a move name. The follow-on status is below.

## Native production slice

The follow-on implementation moved the reusable executor to
`src/animation/nativeAnimationRuntime.ts`; this directory's `runtime.ts` is now
only a compatibility re-export. A host registry supplies extracted programs,
resource metadata, sprite templates, live battler geometry/subpriorities, fixed
slot occupancy, persistent order, and the external audio-busy input. The
runtime itself remains independent of this tooling, captures, mGBA, and ROMs.

The production slice executes complete Splash and Mud Sport scripts. It adds
MUD_SAND tile/palette allocation and cleanup, fixed sprite slots, rising and
falling dirt callbacks, delayed sound tasks, source-order software/hardware OBJ
buffers, and a host renderer that feeds the existing GBA OBJ compositor. The
retained dense receipt covers both orientations: Splash 116/116 rows each and
Mud Sport 233/233 rows each, including 16 particle births, ten delayed sound
tasks, 13 emitted sound commands, all task/sprite fields and flags, resource
state, art transfers, and runtime-owned OBJ transfers.

```sh
node --experimental-strip-types tools/animation/runtime-spike/verify-native.ts \
  tools/animation/runtime-spike/native-observations.json.gz /tmp/native-receipt.json
cmp /tmp/native-receipt.json tools/animation/runtime-spike/native-receipt.json
POKEBENCH_VITEST_MAX_WORKERS=1 npm test -- \
  tests/animation/nativeAnimationRuntime.test.ts \
  tests/animation/animationRuntimeSpike.test.ts \
  tests/animation/animationRuntimeForwardComparison.test.ts
```

`native-repeat-receipt.json` records two byte-identical fresh direct-local-mGBA
captures. This is complete source/runtime-owned semantic evidence, not move
acceptance: ambient sprites/healthbox subsprites, the EnemyShadow callback, the
actual battleScene/core seam, and dense full framebuffers remain outside the
receipt. Splash and Mud Sport therefore remain unsupported in coverage.
