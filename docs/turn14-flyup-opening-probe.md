# Turn 14 FLY-up opening: excluded frames 17781–17787

Scope: only the seven currently excluded Battle Scene ON frames in
`turn14-fly-miss.json`. This is an evidence checkpoint, not a renderer
repair. Fresh runs used the ON-profile canonical trace; no stored oracle
frame is consulted at runtime or by the verifier.

## Result

These are not a PP, menu redraw, or bounce-rule window. They are the first
seven *visible* frames of the existing FLY ball's extreme affine stretch.
There is no unambiguous new relative rule to add safely: the current live
renderer already uses the hardware's exact ball lifetime, OBJ transfer,
palette, position, affine-double mode, matrix number, and per-frame matrix.
The residual is confined to the ball bounds and therefore points at the
high-compression/high-stretch affine sampler, not a timeline/state rule.

## Independent fresh evidence

1. RAM/OAM/OBJ transfer:

   ```sh
   /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
     tools/probe/dump-fly-anim.py tools/compare/traces/turn14-fly-miss.json \
     /tmp/fly.json 17780 17787
   ```

   (The mGBA interpreter writes the complete JSON then exits 139 during
   teardown; validate the output, as with the other RAM probes.) Slot 3 is
   the live affine-double ball for every RAM tick. Its OAM is constant
   `(x,y,x2,y2)=(176,51,0,0)`, tile `305`, OBJ palette `7`, matrix `2`; its
   16-tile VRAM SHA-256 is
   `832e4fa551a7e997802d5b9f15edc0afae83a2a585daf21d49e8ddb28d806f31`
   and palette SHA-256 is
   `d21029e873c5e844fb1c3d7b2404ac08a45c754246178f7a7539e6ee7c67d5a2`
   on every captured tick. Murkrow's slot 5 is already invisible; Onix's
   `y2` remains zero. The only ball change is the matrix:

   | RAM tick | matrix `(a,d)` |
   | --- | --- |
   | 17780–17786 | `(1170,256)`, `(682,256)`, `(481,256)`, `(372,256)`, `(303,256)`, `(256,256)`, `(256,292)` |

   Render ticks 17781–17787 display those RAM ticks (the already-modelled
   one-frame render lead). This validates the existing table directly and
   rules out a graphics/palette DMA lead or menu/bounce movement.

2. Fresh whole-frame app/oracle comparison:

   ```sh
   node --experimental-strip-types tools/probe/verify-turn14-flyup-opening.ts
   ```

   It dynamically overrides the trace capture set to exactly these seven
   frames and compares the live app render to fresh ON-oracle PNGs. Results:

   `17781..17787`: `22, 42, 58, 76, 94, 112, 40` differing pixels. Every
   difference is inside the FLY-ball-only bounds, respectively
   `174,74–178,79`, `172,74–180,79`, `170,74–182,79`, `168,74–184,79`,
   `166,74–186,79`, `163,74–188,79`, and `167,74–184,76`. The verifier
   intentionally exits nonzero until this rendering defect is fixed.

Together, the raw-state method and the independent framebuffer method agree:
the seven frames expose one bounded affine-rasterization defect in the
already-general FLY-ball presentation path; they do not justify a tick-based
repair. Later FLY frames already green are not used as proof for this claim.

## Exact next instrument

Capture slot 3's matching final `gMain.oamBuffer` entry and render the same
32×32, 4bpp VRAM/palette tile sheet on a blank framebuffer with the hardware
affine-double coordinate convention. Compare its covered-pixel mask against
the oracle frame minus the immediately preceding bare-scene baseline for
each of these seven matrices. This isolates source-pixel center/rounding and
the affine-double iteration bounds without fitting screen coordinates or
feeding captures into production. A fix is warranted only if that experiment
produces one sampler rule that also keeps the already-green later FLY frames
and `turn13-switchin.json` exact.
