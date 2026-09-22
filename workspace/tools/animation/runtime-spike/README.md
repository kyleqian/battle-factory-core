# Standalone runtime experiment

See `../../../ANIMATION_RUNTIME_INVESTIGATION.md` for the forward-only question,
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
POKEBENCH_MGBA_PYTHON=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
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
