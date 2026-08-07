# ISSUES #80 — per-layer fade forensics (BG vs OBJ)

MEASUREMENT-ONLY forensics for the party-menu open/close fade windows of
`mid-battle-switch-dense-a-off` (Battle Scene OFF oracle, port 8014). No
`src/` edits. Produced by a side-lane worker; the fix plan (§4) is the
proposed spec extension for a MAIN worker.

Data source: `npm run compare -- mid-battle-switch-dense-a-off
--capture-range 958:985 --summary` and `... --capture-range 803:830
--summary` oracle captures. Measured with a throwaway pngjs sampler at the
fixed reference pixels below; the probe script (§5) reruns the same
measurement.

## 0. The model

Oracle fade = `BeginNormalPaletteFade` (`palette.c:156-200`) with
`deltaY=2`, `y` stepping by 2 every *two* `UpdatePaletteFade` calls, and —
critically — BG rows are only re-blended on the BG-toggle frames
(`objPaletteToggle==0` at update entry) while OBJ rows are blended on the
interleaving OBJ-toggle frames. `BlendPalette` (`util.c:264-278`) is a
per-5-bit-channel linear interpolation:

```
faded5 = c5 + (((0 - c5) * y) >> 4)        // target = black for open+close
```

With the 5-bit values expanded to 24-bit as `(v<<3)|(v>>2)` (mGBA's
15→24-bit expansion, sampled — do NOT assume plain `v<<3`). Because BG and
OBJ are blended on alternate ticks, **OBJ is always exactly one blend-step
behind BG** during both fades (`objPaletteToggle` alternation, verified in
both windows below).

Reference pixels (fixed screen coords, stable across the whole menu):

| layer | coord | base 24-bit | base 5-bit |
| --- | --- | --- | --- |
| BG box interior | (204,140) | (115,90,181) | (14,11,22) |
| OBJ ball red | (193,138) | (181,66,0) | (22,8,0) |

(`(115,90,181)` is the CANCEL-window interior colour, `(181,66,0)` the
pokeball sprite red — both documented in
`docs/party-menu-rank6-ground-truth.md`.)

## 1. Close window 964-979 (per-frame)

`y_bg`/`y_obj` are the blend coefficients that reproduce the sampled oracle
pixel exactly. Steps run 2,4,…,14, each held **2 frames**; full black = 16.

| frame | oracle BG @(204,140) | y_bg | oracle OBJ @(193,138) | y_obj |
| ---: | --- | ---: | --- | ---: |
| 964 | (115,90,181) | 0 | (181,66,0) | 0 |
| 965 | (99,74,156) | 2 | (181,66,0) | 0 |
| 966 | (99,74,156) | 2 | (156,57,0) | 2 |
| 967 | (82,66,132) | 4 | (156,57,0) | 2 |
| 968 | (82,66,132) | 4 | (132,49,0) | 4 |
| 969 | (66,49,107) | 6 | (132,49,0) | 4 |
| 970 | (66,49,107) | 6 | (107,41,0) | 6 |
| 971 | (57,41,90) | 8 | (107,41,0) | 6 |
| 972 | (57,41,90) | 8 | (90,33,0) | 8 |
| 973 | (41,33,66) | 10 | (90,33,0) | 8 |
| 974 | (41,33,66) | 10 | (66,24,0) | 10 |
| 975 | (24,16,41) | 12 | (66,24,0) | 10 |
| 976 | (24,16,41) | 12 | (41,16,0) | 12 |
| 977 | (8,8,16) | 14 | (41,16,0) | 12 |
| 978 | (8,8,16) | 14 | (16,8,0) | 14 |
| 979 | (0,0,0) | 16 | (16,8,0) | 14 |
| 980 | (0,0,0) | 16 | (0,0,0) | 16 |

Verdicts:

- **Frame 964 edge confirmed:** both layers still fully unfaded (y=0). The
  fade's first blend lands on BG at **965**; OBJ is first touched at **966**.
  The rank6 §7 "menu fade-out 965-978" is exactly the BG schedule; OBJ trails
  by one tick (966-979). All-black (both layers) = **980**.
- **Frame 979 OBJ-tail:** BG is fully black (y=16) but the OBJ layer is one
  step behind at y=14. 1559 non-black px remain at 979, of which the ball-red
  sprite family `(16,8,0)` is **207 px** — the exact same 207-px count as the
  unfaded `(181,66,0)` ball-red at 964 (pokeball button red
  (186,136)-(201,142) + icon cores). Remaining classes at 979: (8,8,8):597,
  (16,16,24):183, (24,16,24):150, (8,8,16):117, (16,8,24):105, (24,24,24):97,
  (24,16,8):67, (24,8,0):15, (16,16,16):12, (24,24,16):6 → total 1559.
  So the OBJ-tail is the whole OBJ sprite stack (pokeball button, mon icons,
  box-frame outlines, text shadows) sitting at y=14 for exactly one frame.
  By 980 everything is black.

## 2. Open window 805-824 (per-frame)

Context (oracle): the battle field fades out 766-808 (black hold 803-808),
then the party menu fades **in** from black 809-822, full at 823-824
(`party-menu-rank6-ground-truth.md §7`). y descends 14→2 (near-black→nearly
full) held 2 frames each; the OBJ layer again lags BG by one tick.

| frame | oracle state | y_bg | y_obj |
| ---: | --- | ---: | ---: |
| 803-808 | all black (field fade-out hold) | 16 (black) | 16 (black) |
| 809 | menu first blend, BG y=14 | 14 | 16 (black, not yet) |
| 810 | | 14 | 14 |
| 811 | | 12 | 14 |
| 812 | | 12 | 12 |
| 813 | | 10 | 12 |
| 814 | | 10 | 10 |
| 815 | | 8 | 10 |
| 816 | | 8 | 8 |
| 817 | | 6 | 8 |
| 818 | | 6 | 6 |
| 819 | | 4 | 6 |
| 820 | | 4 | 4 |
| 821 | | 2 | 4 |
| 822 | | 2 | 2 |
| 823 | BG full; OBJ still y=2 | 0 | 2 |
| 824 | both full | 0 | 0 |

Measured reference pixels (BG (204,140), OBJ (193,138)) tracked from
(8,8,16)/(0,0,0) up to (115,90,181)/(181,66,0); every frame reproduces the
model table exactly.

**App side (what the app renders instead):** the app opens the party menu
**immediately at 763** (the A-press frames 762-763) with the full,
fully-bright menu — it never runs the field fade-out, the black hold, or the
fade-in. During 805-822 the app holds that full menu (measured: box interior
(115,90,181), ball-red (181,66,0), unchanged through the whole window), while
the oracle is black / fading in from black → **100% diff 805-822**
(38400 px, ssim 0.00). At 823-824 the oracle's now-full menu finally lines up
with the app's → diff collapses to 1498 px (the residual classes below).
**Correction to the prior killed-attempt brief:** the app does *not* render
the battle FIELD there — it renders the full party MENU, popped early with no
open-fade at all. The conclusion ("the app has NO open-fade render") stands.

## 3. Residual 960-963 (message-box region, outside the fade band)

The party menu is fully open and static here (pre-confirm). The oracle is
bit-static across 960-963 (0 changed px 962→963); the **app** redraws
4808 px between 962 and 963.

- **bbox / px per frame:** 960-962 → `(8,81)-(238,158)`, **5141 px** each;
  963 → `(8,97)-(238,158)`, **6008 px**. (Compare run confirms 5141/5141/5141/
  6008.)
- **Geometry:** three row bands differ — y81-102 (94 px/row, x145-238), a
  y108-117 text band (47 px/row, x153-199), and the message-window band
  y124-153 (x8-238; the wide y140-149 runs span 224-231 px/row). From 963 the
  top band (y81-96) converges and the residual bbox top moves to y97.
- **Oracle draws (pixel classes at diff px, frame 960):** white text ink
  (255,255,255):1452; box frame yellows (181,181,90):674 + (206,214,123):670;
  text shadow greys (214,214,206):543, (99,99,99):484, (115,107,132):424,
  (222,214,222):198; dark green accent (41,49,49):226. No pokeball/CANCEL
  button drawn during 960-963 (`ball-red button-region = 0 px`; the button
  only appears at 964, when its disappear animation starts).
- **App draws (same frames):** its own white message text
  (255,255,255):1874, box frame (74,74,99):308 + (140,156,41):280, the CANCEL
  window interior (115,90,181):201 — **and** the pokeball button (181,66,0)
  73 px at (186,136)-(201,142), which the oracle does NOT draw here. On 963
  the app additionally flips its y81-128 x146-237 band from (41,49,49) →
  (181,181,90) (94 px/row × 48 rows), converging toward the oracle's already
  yellow band (oracle unchanged). This one-frame app-side box-fill flip is
  what makes 963 jump 5141 → 6008.

Classification: this is the party-menu **message-window + right-column
box-frame band**, dominated by (a) text-ink/glyph differences between the
app's message and the oracle's (white-on-box classes), (b) the app drawing
the CANCEL/pokeball button 4 frames early (oracle defers it to 964), and
(c) an app one-frame box-fill animation glitch at 963. Text content is NOT
decoded here (out of scope; file separately). Note dense-a's spec starts at
980, so none of 960-963 was ever pinned.

## 4. Fix plan (for a MAIN worker, per ISSUES #80)

The current close renderer is a **single whole-framebuffer blend**:
`renderPartySelectClose` → `applyFadeToBlack` (`src/engine/battlePartySelect.ts:1006-1016`)
fades every pixel with one y, then `applyFadeFromBlack` (:1020-1036) for the
field reveal. That cannot reproduce the oracle's per-layer lag.

1. **Close path — layer-separated blend in `renderPartySelectClose`
   (`src/engine/battlePartySelect.ts:982-1005`).** Replace the single
   `applyFadeToBlack(fb, closeElapsed & ~1)` (:989) with a two-layer pass:
   blend the **BG content** at `y_bg = closeElapsed & ~1` (table §1) and
   the **OBJ content** at `y_obj = (closeElapsed & ~1) - 2`, clamped to ≥0
   (OBJ lags one blend step: 965 BG-only, 966-979 OBJ y = BG y − 2). This
   needs a draw-order split: render the BG pixels (battle field / box
   background), blend them at `y_bg`, then blit the OBJ sprites (pokeball
   button, mon icons, box frames, text) blended at `y_obj` on top — i.e.
   separate the current single framebuffer blend into per-layer
   post-blends keyed to the layer's own y. All-black = both y reach 16
   (BG at 979, OBJ at 980) — the 979 OBJ-tail (1559 px) must appear.
   Constants already exist: `PARTY_SELECT_CLOSE_MENU_FADE_FRAMES = 14`
   (`battlePartySelect.ts:168`).
2. **Open path owner + what it must draw.** The open-fade lives in the
   party-menu open path (the app currently pops the menu at 763 with no
   fade). Whoever owns the menu-open render must run the same two-layer
   fade *backwards*: start black (BG y=16, OBJ y=16) on 809, descend per
   §2 (BG 14→2 on 809-822, full 823; OBJ one tick behind, full 824), using
   the same per-layer blend. The field fade-out (766-808, black hold) also
   needs to exist — today it does not (app never leaves the field).
3. **Predicted acceptance:**
   - Dense-a spec extension 964-1034 (per rank6 §7 budget): the 28 close
     frames 965-980 currently excluded become byte-exact with the
     layer-separated blend → the projected 292/292 (221 captured + 71
     close/black/reveal frames).
   - Open-window pin 805-824: byte-exact once the open fade + field
     fade-out are rendered; at minimum the 100%-diff band 805-822 drops to
     the §2 schedule's exact pixels.
   - The **960-963 message-region residual is filed separately** (ISSUES
     #80 sub-item): it is a text/button-class problem independent of the
     fade layer logic, and the one-frame box-fill flip at 963 needs its own
     diagnosis.
   - Keep green: `battle-command-generated-off` 128/128,
     `mid-battle-switch-dense-a-off` 221/221 (before the spec extension),
     and the Tier-1 `inbattlePartyMenu*` pins.

## 5. Verification

`node --experimental-strip-types tools/probe/fade-layer-forensics.ts
<compare-out-dir-958-985> <compare-out-dir-803-830>` prints the per-frame
measured `(y_bg, y_obj)` against §1/§2 tables and the 960-963 per-class px
counts against §3, with a PASS/FAIL verdict.

Receipt for this doc: `tools/compare/out/run-2026-08-07-19-17-13Z-88801`
(close, 958-985) and `tools/compare/out/run-2026-08-07-19-19-35Z-94131`
(open, 803-830).
