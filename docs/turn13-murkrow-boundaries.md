# Turn 13 Murkrow boundary ticks

Evidence checkpoint for the two formerly excluded Battle Scene ON frames in
`turn13-switchin.json`: render ticks 17019 and 17034. This resolves ISSUES
#33's remaining question without capturing or using oracle pixels at runtime.

## Result

The residual is neither wobble-table geometry nor tint timing. It is the
front-sprite **VRAM image transfer's one-render lead** over the normal
Sprite/OAM affine state. The image window is render `[17019, 17033]`, while
the affine table remains render-lagged at `[17020, 17069]`. In named terms:

```text
frame2: [TURN13_MURKROW_STRETCH_TICK - 1,
         TURN13_MURKROW_FRAME_FLIP_TICK - 1]
```

This is a relative, reusable boundary rule for this transfer mechanism; the
repair uses the existing two event constants, not an absolute-tick branch.

## Method 1 — direct RAM, final OAM, palette, and OBJ-VRAM probe

Run from the worktree (mGBA's teardown may return 139 after it has written
the JSON; check the output file):

```sh
/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
  tools/probe/dump-turn13-murkrow-boundaries.py \
  tools/probe/specs/turn13-b1-sprite.json /tmp/murkrow-boundaries.json \
  17017 17018 17019 17020 17032 17033 17034 17035
```

Fresh results (RAM tick; `A` is affine mode; tile SHA prefixes distinguish
the byte-exact extracted `tileset` and `frame2`):

| RAM tick | A / matrix / y2 | OBJ-VRAM image | palette evidence |
|---|---|---|---|
| 17018 | normal / 256,256 / 0 | tileset `11eb9140a992` | all 16 entries `31455` (white) |
| 17019 | double / 256,256 / 0 | frame2 `a642b374a627` | all 16 entries still `31455` |
| 17033 | double / 244,268 / 1 | frame2 `a642b374a627` | faded bank begins `29468,23231,…` |
| 17034 | double / 250,262 / 0 | tileset `11eb9140a992` | faded bank begins `29500,22207,…` |

At every sampled tick the `gMain.oamBuffer` entry matches the live Murkrow
Sprite OAM entry (including affine mode/matrix number/tile/palette); it is
not a stale OAM-buffer or sort-order artifact. The probe also reads the full
OBJ palette bank, so there is no special one-frame tint plateau at either
boundary. This independently rules out the remaining candidate classes:
the geometry/table state and tint values are ordinary adjacent states, while
the VRAM image changes at each boundary itself.

## Method 2 — full framebuffer replay

`tools/probe/verify-turn13-murkrow-boundaries.ts` restores only the two
frames in memory, replays the canonical trace against the ON oracle and the
app, and prints strict RGB diff counts. It does not write screenshots or
feed oracle output into the renderer.

```sh
node --experimental-strip-types tools/probe/verify-turn13-murkrow-boundaries.ts
```

Before the relative image-window repair, the fresh replay was:

```text
17017: 0px
17018: 0px
17019: 418px (154,30)-(196,71)
17020: 0px
17033: 0px
17034: 828px (153,32)-(198,72)
17035: 0px
```

Changing only the image interval to the rule above yields 0px at all seven
frames. In particular, unchanged geometry/tint at 17019 and 17034 becomes
exact merely by respectively advancing and ending `frame2` one render early.
That is an end-to-end independent confirmation of the RAM/VRAM conclusion.

## Accepted trace

Both recovered boundary captures are back in
`tools/compare/traces/turn13-switchin.json`; the trace is 242/242 exact under
the historical Battle Scene ON profile. The repair is confined to
`turn13MurkrowFrame`, called only by the turn-13 presentation path.
