# Turn 14 FLY-up opening: excluded frames 17781–17787

Scope: only the seven currently excluded Battle Scene ON frames in
`turn14-fly-miss.json`. This is an evidence checkpoint, not a renderer
repair. Fresh runs used the ON-profile canonical trace; no stored oracle
frame is consulted at runtime or by the verifier.

## Result

These are not a PP, menu redraw, bounce-rule, or affine-sampler window. They
are the first seven visible frames of the existing FLY ball, and the source
matrix/transfer/sampler were already correct. Fresh RGB samples show every
oracle pixel in the former residual retains the underlying opponent terrain
color at screen `y>=74`; the app had painted the ball over that foreground
layer. The same cutoff was already independently established for the
opponent-side QUICK_ATTACK/AERIAL_ACE component family.

The generic affine-stretch blitter now accepts an optional bottom terrain
clip, and the canonical layered FLY path supplies the existing opponent
cutoff. No FLY age, matrix, species, coordinate fit, or baked frame was added.
The formerly excluded frames are **7/7**, and the strengthened canonical
trace is **213/213** with frames 17781-17787 restored.

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

## Completed next instrument

Capture slot 3's matching final `gMain.oamBuffer` entry and render the full
native 4bpp VRAM/palette tile sheet on a blank framebuffer with the hardware
affine-double coordinate convention. (The proposed 32×32 size was corrected
to its source/OAM-proven 64×64 footprint below.) Compare its covered-pixel
mask against the oracle frame minus a valid bare-scene baseline for each of
these seven matrices. This isolates source-pixel center/rounding and the
affine-double iteration bounds without fitting screen coordinates or feeding
captures into production. A fix is warranted only if that experiment produces
one sampler rule that also keeps the already-green later FLY frames and
`turn13-switchin.json` exact.

## Final-OAM blank-mask experiment (2026-07-23)

Run the complete, fresh-input diagnostic from the worktree root:

```sh
node --experimental-strip-types tools/probe/verify-turn14-flyup-affine-sampler.ts
```

It runs `dump-fly-anim.py` under the harness mGBA interpreter, tolerates its
known post-write exit-139 only after validating its JSON, then asks the ON
oracle for fresh frames `17781..17787` plus a fresh bare-scene baseline at
`17805`. `17780` is *not* a valid bare-scene baseline: because presentation
leads the RAM snapshot by one render, it still contains Murkrow. At `17805`
the ball has been destroyed, Murkrow remains hidden, and no FLY-up text has
started. No capture or RAM transfer is retained or consulted by production.

### Corrected transfer/OAM facts

The requested 32x32 premise is disproved by both independent sources of
truth: slot 3's final entry is `gMain.oamBuffer[10]`, with
`attr0=0x03f3`, `attr1=0xc470`, `attr2=0x7931`, hence affine-double,
64x64, 4bpp, `(x,y)=(112,243)` (the PPU's unsigned/wrapping coordinates),
tile 305, OBJ palette 7, and matrix 2. `gFlyBallUpSpriteTemplate` explicitly
uses `gOamData_AffineDouble_ObjNormal_64x64`. Its live transfer is therefore
64 tiles / 2048 bytes, not the 16 tiles / 512 bytes a 32x32 reconstruction
would require. The probe records all 2048 live bytes plus all 16 BGR555
palette entries; their prior SHA observations remain stable.

The sampler renders the complete live 64x64 source in the exact 128x128
affine-double destination box, wraps final OAM X at 512/Y at 256, and compares
only nonzero-texel coverage to the fresh oracle-minus-bare-scene mask. It
sweeps no timeline, position, asset, color, or per-tick fit:

| convention | TP | FP | FN | XOR | Jaccard |
| --- | ---: | ---: | ---: | ---: | ---: |
| floor, destination center 64, source center 32 | 8404 | 444 | 0 | **444** | **0.949819** |
| nearest, 64, 32 | 8323 | 527 | 81 | 608 | 0.931923 |
| trunc, 64, 32 | 8404 | 644 | 0 | 644 | 0.928824 |
| floor, 63.5, 32 | 8276 | 612 | 128 | 740 | 0.917924 |
| floor, 64, 31.5 | 7144 | 1657 | 1260 | 2917 | 0.710069 |
| floor, 63.5, 31.5 | 7163 | 1680 | 1241 | 2921 | 0.710333 |

For the sole aggregate winner (`floor/d64/s32`), every oracle ball pixel is
covered and the remaining coverage is exclusively overdraw:

| render / RAM matrix | oracle mask | predicted | FP | FN | XOR |
| --- | ---: | ---: | ---: | ---: | ---: |
| 17781 / `(1170,0,0,256)` | 400 | 422 | 22 | 0 | 22 |
| 17782 / `(682,0,0,256)` | 688 | 730 | 42 | 0 | 42 |
| 17783 / `(481,0,0,256)` | 988 | 1046 | 58 | 0 | 58 |
| 17784 / `(372,0,0,256)` | 1270 | 1346 | 76 | 0 | 76 |
| 17785 / `(303,0,0,256)` | 1548 | 1642 | 94 | 0 | 94 |
| 17786 / `(256,0,0,256)` | 1840 | 1952 | 112 | 0 | 112 |
| 17787 / `(256,0,0,292)` | 1670 | 1710 | 40 | 0 | 40 |

Those XOR values exactly reproduce the independent whole-frame residuals.
The winning convention is the existing generic sampler's convention; the
other source-/hardware-plausible rounding and pixel-center variants are all
worse. It therefore does **not** supply a new general affine sampler rule.

### Superseded verdict and final correction

The sampler verdict remains correct: keep floor/64/32, because changing it
would regress later FLY and other affine users. The earlier conclusion that
the residual must therefore be an unknown PPU coverage rule was incomplete:
the mask experiment ignored scene-layer priority. Direct failed-pixel RGB
samples (`oracle terrain / app ball`) identify the missing component as
foreground-terrain composition, not raster coverage. Reusing that existing
layer rule closes the window without touching the sampler equation.
