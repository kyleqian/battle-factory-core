# ISSUES #80 — per-layer fade forensics (BG vs OBJ)

MEASUREMENT-ONLY forensics for the party-menu open/close fade windows of
`mid-battle-switch-dense-a-off` (Battle Scene OFF oracle, port 8014). No
`src/` edits. Produced by a side-lane worker; the fix plan (§4) is the
proposed spec extension for a MAIN worker.

Data source: `npm run compare -- mid-battle-switch-dense-a-off
--capture-range 958:985 --summary`, `... --capture-range 803:830
--summary`, and `... --capture-range 758:830 --summary` oracle captures.
Measured with a throwaway pngjs sampler at the fixed reference pixels below;
the probe script (§5) reruns the same measurement.

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
<compare-out-dir-958-985> [compare-out-dir-803-830]
[compare-out-dir-758-830]` prints the per-frame measured `(y_bg, y_obj)`
against the §1/§2 tables, the 960-963 per-class px counts against §3, and the
§6 field fade-out schedule against §6 (third argument), with a PASS/FAIL
verdict.

Receipts for this doc: `tools/compare/out/run-2026-08-07-19-17-13Z-88801`
(close, 958-985), `tools/compare/out/run-2026-08-07-19-19-35Z-94131`
(open, 803-830), and `tools/compare/out/run-2026-08-07-20-46-49Z-63439`
(field open window, capture-range 758:830; §6 probe PASSes on this dir).

## 6. OPEN window — field fade-out 762-808 (per-frame)

The "battle field" of §2's shorthand is the **settled pre-party-menu scene**
the mid-battle switch flow sits on before the party menu opens: a static,
fully-bright switch-selection screen (current-battler summary window on the
left (BG), party-list text boxes (OBJ), battler front sprite (OBJ)). It is
byte-identical across 761-765; the A-press lands on 762-763; the app pops the
full menu at 763, but the oracle holds the field through 765 and fades it out
766-781 (black hold 782-808), then the menu fades in 809-824 (§2). This
section measures the fade-out with two **field reference pixels** — the §0
menu pixels (204,140)/(193,138) do not exist yet:

| layer | coord | unfaded 24-bit | unfaded 5-bit |
| --- | --- | --- | --- |
| BG screen background | (4,4) | (255,255,255) | (31,31,31) |
| OBJ battler front-sprite body | (176,52) | (165,24,57) | (20,3,7) |

(white (4,4) is the plain BG fill top-left; maroon (165,24,57) is the
front-sprite body at rows 44-72 right of the sprite area. Both are constant
across 762-765 and obey the §0 blend model through the fade; `openElapsed
e = frame - 763`.)

### (a) Edges

- **Last fully-bright settled field frame: 765.** BG (4,4)=(255,255,255) and
  OBJ (176,52)=(165,24,57) both decode y=0; 38400 non-black px. 761-765 are
  byte-identical (0 diff px; shared sha256 of the raw RGB888 framebuffer =
  `212a4e15eef5bcfb54db18768391f8e0721fbedc1c01f8f888c55ea2bc9619dd`).
- **First frame carrying any blend: 766.** BG (4,4)→(222,222,222)=y=2 (the §0
  model's 31→27→222); 30872 px differ from 765. OBJ is not yet touched (y=0).
- **First fully-black frame:** **780 for BG** ((4,4)=(0,0,0)=y=16) with 6939
  OBJ-tail px still at y=14 (the whole OBJ sprite stack, one tick behind);
  **781 for both layers** (0 non-black px).
- **Last fully-black frame before the menu's first blend at 809: 808.**
  782-808 is one contiguous black hold (0 changed px per frame, 0 non-black).

### (b) Per-frame (y_bg, y_obj) table

`y_bg`/`y_obj` are the blend coefficients that reproduce the sampled oracle
pixel exactly; steps run 2,4,…,16, each held **2 frames** (BG 766-780, OBJ one
tick behind 767-781).

| frame | oracle BG @(4,4) | y_bg | oracle OBJ @(176,52) | y_obj |
| ---: | --- | ---: | --- | ---: |
| 762 | (255,255,255) | 0 | (165,24,57) | 0 |
| 763 | (255,255,255) | 0 | (165,24,57) | 0 |
| 764 | (255,255,255) | 0 | (165,24,57) | 0 |
| 765 | (255,255,255) | 0 | (165,24,57) | 0 |
| 766 | (222,222,222) | 2 | (165,24,57) | 0 |
| 767 | (222,222,222) | 2 | (140,16,49) | 2 |
| 768 | (189,189,189) | 4 | (140,16,49) | 2 |
| 769 | (189,189,189) | 4 | (123,16,41) | 4 |
| 770 | (156,156,156) | 6 | (123,16,41) | 4 |
| 771 | (156,156,156) | 6 | (99,8,33) | 6 |
| 772 | (123,123,123) | 8 | (99,8,33) | 6 |
| 773 | (123,123,123) | 8 | (82,8,24) | 8 |
| 774 | (90,90,90) | 10 | (82,8,24) | 8 |
| 775 | (90,90,90) | 10 | (57,8,16) | 10 |
| 776 | (57,57,57) | 12 | (57,8,16) | 10 |
| 777 | (57,57,57) | 12 | (41,0,8) | 12 |
| 778 | (24,24,24) | 14 | (41,0,8) | 12 |
| 779 | (24,24,24) | 14 | (16,0,0) | 14 |
| 780 | (0,0,0) | 16 | (16,0,0) | 14 |
| 781 | (0,0,0) | 16 | (0,0,0) | 16 |
| 782-808 | (0,0,0) | 16 | (0,0,0) | 16 |

All 47 frames reproduce the §0 blend formula **exactly** — the sampled colour
equals `expand5(blendToBlack(base, y))` for a unique integer y with zero
residual (checked per frame; no non-fitting frame exists). A non-fitting frame
would have been reported as a finding; there are none.

### (c) The 37 frames, explained

766-802 (= 37 frames) is **16 fade-ramp frames + 21 black-hold frames**; §2's
"the battle field fades out 766-808" conflates the ramp with the hold. The
ramp is a **plain deltaY=2, 2-frames-per-step fade, structurally identical to
the §1 close window** — there is no different deltaY and no unexplained hold
inside the ramp. Exact counts:

- **Bright hold: 3 frames (763-765).** Byte-static, (0,0). (761-762 are also
  bright and byte-identical; the A-press is 762-763, so the field stays fully
  bright for 3 more frames.)
- **Field fade-out: 16 frames (766-781).** BG blends 766-779 (y=2..14) and
  reaches 16 at 780; OBJ lags one tick, blends 767-780, reaches 16 at 781.
  Frame 780 is the OBJ-tail (BG black, OBJ y=14): 6939 non-black px, top
  classes (24,24,24):2680, (8,8,8):1652, (24,24,16):938, (16,8,16):851 — the
  whole OBJ sprite stack held at y=14 for one frame (mirror of close 979's
  1559-px tail).
- **Black hold: 27 frames (782-808).** Both layers y=16, 0 changed px, 0
  non-black.

### (d) Does OBJ lag BG here too?

**Yes — confirmed.** The same two-reference-pixel method gives OBJ exactly one
blend step (one frame) behind BG across the whole fade-out: 766=(2,0),
767=(2,2), 768=(4,2), …, 779=(14,14), 780=(16,14), 781=(16,16). This is the
same `objPaletteToggle` BG/OBJ alternation (palette.c:454) already verified in
§1/§2.

### (e) What is on screen 762-765

Still the settled, fully-bright field screen. 762-765 are byte-identical to
761 (0 diff px; shared sha256 above). Nothing else appears — no message box,
no cursor change. (For context, 758-760 differ from 761 by 538 px at
(49,74)-(95,111): the second battler sprite region settling before the hold —
outside this window.)

### (f) The menu is already behind the black

At 803-808 the party menu is **already built and its palette force-blended to
black** — the black is the menu's own palette at blend 16, not a separate
black fill. Evidence:

- **809's first blend** (§2) shows the real menu content (box interior
  (204,140), ball-red (193,138)) at y_bg=14/y_obj=16 — the pixels appear
  instantly, which is only possible if the menu was already rendered behind
  the fade.
- **Source:** `ShowPartyMenu` (party_menu.c:570) runs one init state per frame
  behind the black: state 21 (party_menu.c:673)
  `BlendPalettes(PALETTES_ALL, 16, RGB_BLACK)` force-blends the whole menu
  palette to black in the buffer (`gPaletteFade.bufferTransferDisabled = TRUE`
  set at state 2, party_menu.c:596); state 22 (party_menu.c:686)
  `BeginNormalPaletteFade(PALETTES_ALL, 0, 16, 0, RGB_BLACK)` starts the
  y=16→0 fade-in, then hands off to `CB2_UpdatePartyMenu` (party_menu.c:542),
  whose per-frame `UpdatePaletteFade()` produces the §2 schedule. The black
  hold is the party menu's init (VRAM/OAM reset, BG alloc, sprite/gfx load,
  box render, mon icons, message) all happening while the screen is black.

### (g) Fix plan (for a MAIN worker)

Add an open-side state machine in the party-menu-open path keyed on
`openElapsed e = frame - 763` (the confirm frame: A-press 762-763 completes,
the app currently pops the menu at 763). The four phases:

| phase | frames | e range | count |
| --- | --- | ---: | --- |
| bright-hold | 763-765 | 0..2 | 3 |
| field-fade-out | 766-781 | 3..18 | 16 |
| black-hold | 782-808 | 19..45 | 27 |
| menu-fade-in | 809-824 | 46..61 | 16 |

Closed forms for the fade-out and the black hold (identical machinery to §4's
close plan — per-layer post-blends keyed to the layer's own y; both clamp at
16, so they stay correct through the hold):

```
y_bg(e)  = min(16, 2 * max(0, floor((e - 1) / 2)))
y_obj(e) = min(16, 2 * max(0, floor((e - 2) / 2)))
```

For the menu fade-in use §2's table with `m = e - 46`:
`y_bg(m) = max(0, 14 - 2 * floor(m/2))` and
`y_obj(m) = max(0, min(16, 14 - 2 * floor((m-1)/2)))` (OBJ one tick behind:
809=(14,16), 823=(0,2), 824=(0,0)).

The bright-hold must render the settled field screen — today the app pops the
full menu at 763 and never renders the fade-out, black hold, or fade-in at all
(§2), so those phases are the whole missing piece.

**Predicted acceptance:** the open band **763-824 (62 frames) goes byte-exact**
— bright-hold 763-765 (now 37113-px diff because the app pops the menu early),
fade-out 766-781 + black 782-808 (now a 100%-diff band), and fade-in 809-824
(now 100% to 1498 px). The 823 residual is *not* a text issue: it is the §2
OBJ-tail (oracle = the app's full-bright values blended at y=2, identical px
counts per class — e.g. ball-red app (181,66,0):195 ↔ oracle (156,57,0):195),
so 823 goes byte-exact too once the OBJ layer is blended at y=2. Dense-a
should then pin 763-830 with only the §3 message-region residual (960-963)
remaining on the open side.

## 7. Message window swap (924-978) + the icon phase residual

MEASUREMENT-ONLY forensics for ISSUES #80 open remainder item (c): from the
submenu open through the close, the oracle's in-battle party-menu message
window is a DIFFERENT window (and message) than the app's. Data source: fresh
`npm run compare -- mid-battle-switch-dense-a-off --capture-range 900:980
--summary` oracle captures (25/81 matched). The §1 fade model and the settled
message box (byte-exact at 883) are NOT re-derived. Receipt:
`tools/compare/out/run-2026-08-07-21-35-45Z-3175`; the §7 probe (§5 addendum)
PASSes on it.

### (a) The exact frame the window changes — 926

The oracle message-window band (x0-240, y124-160) is byte-identical across
900-925 (0 changed px 923→924, 924→925; the only pre-926 oracle motion is the
489 px mon-icon 2-frame toggle, bbox (7,9)-(112,55), at 905/913/920 — see (e)).
At **frame 926** the band changes by **+6008 px** (bbox (8,97)-(238,158)): the
message window's right frame moves from **x182 to x141** and the settled
"CANCEL pokeball" window (x184-239) is replaced by the SEND OUT submenu window.
Frames 927-963 are then static (0 changed px, plus the icon toggles); the
close fade starts at 964.

The trigger is the trace's **segment 11 A-press at frames 922-923** (the
submenu-open press on the right-column mon: the party menu had been open since
the 762-763 A-press, cursor moved RIGHT at 882-883). The submenu window and the
new message window land together at 926 — 3 frames after the press edge, and
frames 924-925 still render the settled window unchanged. (The earlier §3
"960-963" residual was this same swapped window; it had been mis-scoped to a
4-frame text artifact.)

### (b) The oracle's window — sDoWhatWithMonMsgWindowTemplate (16x2)

The settled window the app already draws correctly is
`sDefaultPartyMsgWindowTemplate` (data/party_menu.h:419-428): bg 2, tilemap
(1,17), **21x2** → px (8,136)-(176,152); measured frame extent **x0-182, y133-155**
(right frame column at x182 on frames 900-925). From frame 926 the oracle swaps
to **`sDoWhatWithMonMsgWindowTemplate` (data/party_menu.h:430-439)**: bg 2,
tilemap (1,17), **16x2** → px (8,136)-(136,152); measured frame extent **x0-141, y133-155**
(right frame column at x141-142, the stepped edge; verified on 930/960/964). Both windows
are the same party-menu message-window frame style (`DrawStdFrameWithCustomTileAndPalette
(windowId, FALSE, 0x4F, 13)`, party_menu.c:2498) with the olive corner.

Full sampled 24-bit palette of the swapped window (frame 930, region
x0-141 y133-155):

| colour | px | role |
| --- | ---: | --- |
| (255,255,255) | 2022 | interior fill |
| (214,214,206) | 338 | text fg |
| (222,214,222) | 296 | frame light-purple gradient (also the "gradient border rows" of the brief) |
| (99,99,99) | 280 | text shadow |
| (115,107,132) | 228 | frame purple |
| (74,74,107) | 46 | frame dark |
| (140,156,41) | 23 | olive corner |
| (41,49,49) | 23 | frame near-black |
| (173,189,173) | 8 | frame light-grey |
| (99,99,148) | 2 | glyph residual |

The window is 16 tiles wide → the message text runs in a **128 px interior**
(white), which is the direct cause of the wrap/clip behaviour in (c).

### (c) The oracle's text — "Do what with this RATTATA?" (one line, clipped)

The swapped window renders `gText_DoWhatWithPokemon` = **"Do what with this
{PKMN}?"** (strings.c:434), the `{PKMN}` placeholder filled by `GetMonNickname`
(party_menu.c:2701, gStringVar1) + `StringExpandPlaceholders` (:2499). The
nickname in this trace is **RATTATA** (decoded from the oracle's slot-1 card
name, white FONT_SMALL ink at x118-147 y15-22). The final string is
**"Do what with this RATTATA?"** — a 140 px run in the 128 px window, so it
renders as ONE line at FONT_NORMAL origin **(8,137)** and is clipped by the
window:

- **"Do what with this"** decodes glyph-by-glyph from the oracle pixels with
  **100% coverage** at (8,137) — render 454 ink px, all present in the oracle
  (fg (214,214,206) + shadow (99,99,99), the sFontColorTable[0] LIGHT_GRAY/DARK_GRAY
  pair resolving to the window bank). Ink bbox x8-98, rows y140-149.
- **The nickname tail** (x100-121, rows y138-151 — 14 rows, taller than the
  standard R/A/T glyphs' 10 rows) does NOT template-match the app's FONT_NORMAL
  Latin atlas: rendering "RATTATA?" at (100,137) covers only 89/300 of its own
  pixels in the oracle, and 75 oracle px stay uncovered. The tail's trailing
  glyph is the **full-width "?"** (font code 172) at x116-121 — matched 32/32.
  The 3 glyph clusters (x100-103, x108-112, x116-121) exactly tile atlas codes
  83+84+172 (61+71+32 = 164 px, zero residual) — i.e. the ROM renders the
  nickname run with a glyph-code range the app's charmap maps to katakana
  (83=ウ, 84=エ) rather than the app's Latin R/A/T codes (204/187/206). This is
  the concrete, measurable tail signature the MAIN worker must reproduce
  (decode the ROM's FONT_NORMAL nickname glyphs, not the app's atlas codes).

There is **no second line**: rows y145-155 at x8-58 are empty, so the message
does not wrap — it is a single clipped line. The settled window's
"Choose a POKéMON." (strings.c:429) does not appear at all during 926-978.

### (d) Static across 924-978?

The message window content is **static** across the whole window: 0 changed
oracle px 900-925, 0 changed 927-963 (message band), and from 964 the only
change is the §1 per-layer close fade (the window is still present and blended).
The single content change is at **926** (the (a) swap). The 489 px icon toggles
at 905/913/920/930/937/945/952/960 (pre-close) and 967/975 (during the fade) are
in the icon bbox (7,9)-(112,55), not in the message window.

### (e) The 489 px icon residual — PHASE OFFSET of +2 frames (not a freeze)

The 489 px residual (bbox (7,9)-(112,55)) appears on exactly the four close
frames **965, 966, 973, 974** (and, pre-close, on the phase-mismatch frames
928-929, 935-936, 943-944, 950-951, 958-959 — the 5630-px compare rows). It is
the mon-icon 2-frame animation (frame0/frame1 of the RATTATA icons;
`monIconFrameAt`, `MON_ICON_FRAME_CYCLE = 15`, `MON_ICON_FRAME1_TICKS = 8`,
battlePartySelect.ts:526-536) being **phase-offset by exactly 2 frames**.

Oracle icon-phase toggles (measured from the 489 phase-differing px, oracle
frames): **905, 913, 920, 930, 937, 945, 952, 960, 967, 975**.
App icon-phase toggles (same method, app frames): **905, 913, 920, 928, 935,
943, 950, 958, 965, 973**.
Oracle − App = 0,0,0,+2,+2,+2,+2,+2,+2,+2 — i.e. the oracle LAGS the app by 2
frames from the first toggle after the submenu open. Mechanism: the oracle's B
phase holds 920-929 (10 frames instead of 8) — the toggle that should land at
928 lands at 930 — a 2-frame stall/delay of the icon anim clock during the
submenu-open processing (A-press 922-923, window lands 926). The cadence then
continues normally (8/7-tick 15-cycle; oracle A 960-966, B 967-974, A 975-978).

**The oracle does NOT freeze the icon animation at the close** — it keeps
animating on its normal cadence through 964-978. The app's clock runs 2 frames
ahead, so on the close frames the two differ exactly when the phases disagree:

| frame | oracle | app | residual |
| ---: | --- | --- | ---: |
| 964 | A | A | 0 |
| 965-966 | A | B | 489 |
| 967-972 | B | B | 0 |
| 973-974 | B | A | 489 |
| 975-978 | A | A | 0 |

### (f) Fix plan (for a MAIN worker, per ISSUES #80 item (c))

1. **Message window swap.** On the submenu-open edge (the A-press at 922-923;
   `submenuOpen` in `advanceBattlePartySelect`, battlePartySelect.ts:420), swap
   the message window from `sDefaultPartyMsgWindowTemplate` (21x2,
   (8,136)-(176,152)) to **`sDoWhatWithMonMsgWindowTemplate` (16x2,
   (8,136)-(136,152))** and render **"Do what with this RATTATA?"** in place of
   "Choose a POKéMON." (`drawPartySelectBgLayer`, battlePartySelect.ts:968-972).
   The window frame style and palette are unchanged (same
   `PARTY_MESSAGE_WINDOW_PALETTE`); only the width (21→16 tiles) and the message
   change. The nickname run must render with the ROM's FONT_NORMAL glyph codes
   for the tail (see (c)) — the exact tail signature is the 83/84/172-pattern at
   x100-121.
2. **Icon clock +2.** Introduce a +2-frame delay in the mon-icon animation clock
   effective from the submenu-open edge (so the toggles land at 930/937/945/952/
   960/967/975 instead of 928/935/943/950/958/965/973). This removes the 489 px
   residual on 965-966, 973-974 AND the pre-close 5630-px frames (928-929, etc.).
3. **Predicted acceptance.** Extending the dense-a spec's `captureFrames` with
   **964-979 (16 frames)** reaches **byte-exact on all 16**: the close-fade
   layer model is already byte-exact (§1, frame 979 is byte-exact today); the
   964-978 residuals are exactly the wrong-window/message class (1994-6008 px at
   bbox (8,129)-(182,158)) plus the icon phase (489 px on 965/966/973/974). Both
   are content defects, not fade defects, so a single MAIN cap that lands items
   1-2 should clear the whole band. Keep green: `battle-command-generated-off`
   128/128, `mid-battle-switch-dense-a-off` 221/221, and the Tier-1
   `inbattlePartyMenu*` pins.

## 8. OPEN-window residual classes A and B

MEASUREMENT-ONLY follow-up to the §6 open-window forensics, on the last 13
red frames of the party-menu OPEN fade (the brief's residual classes A + B).
No `src/` edits. Produced by a side-lane worker; the fix plan (§8(e)) is a
spec extension for a MAIN worker.

Data source: `npm run compare -- mid-battle-switch-dense-a-off
--capture-range 758:790 --summary` →
`tools/compare/out/run-2026-08-07-23-00-35Z-60136` (deterministic — a second
fresh run gives identical per-frame px counts). Probe:
`node --experimental-strip-types tools/probe/fade-open-residual.ts <out-dir>`
re-verifies every table below with a PASS/FAIL verdict; a missing capture is a
FAIL (never a silent pass).

### (a) Class B is the player's healthbox — the "opponent breathing" label is REFUTED

| frame | diff px | bbox | opponent-sprite region (130,10)-(215,70) |
| ---: | ---: | --- | --- |
| 771 | 1639 | (127,74)-(229,110) | 0 px (byte-exact) |
| 773 | 1639 | (127,74)-(229,110) | 0 px |
| 775 | 1639 | (127,74)-(229,110) | 0 px |
| 777 | 1639 | (127,74)-(229,110) | 0 px |
| 779 | 2037 | (49,74)-(229,111) | 0 px |

The diff bbox (127,74)-(229,110) is the **player's healthbox** (the box at
x=127-229 holding nickname/Lv text, the HP bar, HP numbers, and the box's
frame/interior/shadow — its settled colours are the §6 healthbox palette:
interior (255,255,222), frame (222,214,181), HP-teal (82,107,99), dark-green
(33,57,0), text shadow (66,66,66), all from `gBattleInterface_BallStatusBarPal`
`graphics/battle_interface/ball_status_bar.png`). 779 widens to
(49,74)-(229,111) by adding the **player's back sprite** (the RATTATA at
x=49-95, body (181,115,181)). The opponent front sprite region is byte-exact
on all five frames, and the §71 slice-a RAM receipt shows the opponent sprite
settles at `SpriteCallbackDummy`/`{x2:0,y2:0}` with no idle under Battle Scene
OFF — there is nothing for it to be "out of phase" with. The standing
"opponent idle breathing squish" attribution does not survive the pixels.

Sub-region px counts (frame 771; 773/775/777 scale identically at their own
y_obj, 779 adds the back sprite):

| sub-region | rows | px | oracle is one step... |
| --- | --- | ---: | --- |
| box top frame + first interior row | 74-77 | 356 | neither — content shifted (see below) |
| nickname / Lv text row | 79-87 | 225 | " |
| HP bar region | 89-95 | 424 | " |
| HP numbers text row | 96-103 | 113 | " |
| bottom frame + box shadow | 104-110 | 526 | " |

### (b) Not two fade levels — one level, one row's content

The brief's "two one-blend-step pairs in both directions" (oracle
(156,156,132)↔app (132,132,107) etc.) is **not** two fade coefficients in the
oracle. For every Class-B pixel the oracle's value equals `blend(settled,
y_obj)` for a *different source pixel*: the pixel **one row above** it. Frame
771: 1612 of its 1639 diff px satisfy `oracle(x,y) = blend(settled(x, y-1),
y_obj=6)` (1619/1639 at 773-777; 1658 of 779's 2037). Example: the interior
pixel (141,77) renders frame@6 because settled (141,76) is the frame row —
`(255,255,222)` interior@6 would be (156,156,132), but the box's first
interior row draws the frame row's content. So each "step apart" pair is the
same colour sampled from the row above, at one y. **There is no third fade
schedule**: the healthbox interior tracks `y_obj` exactly (per-frame table =
the §6 table; the healthbox reference pixel (145,78) = (255,255,222) decodes
y=0,2,2,4,4,…,16 on 766-781 = `y_obj(e)=min(16,2·max(0,⌊(e−2)/2⌋))`).

The mechanism is a **1-row content offset of the healthbox OBJ tiles from
frame 770** (the box renders the row above it, at the same OBJ blend y), not a
delay or a separate ramp. Source context: the healthbox is an OBJ sprite
composite (`sHealthboxPlayerSpriteTemplates`, `battle_interface.c:209-231`,
palette `TAG_HEALTHBOX_PAL` = `gBattleInterface_BallStatusBarPal`,
`battle_gfx_sfx_util.c:80-83`); the field fade-out is
`PlayerHandleChoosePokemon`'s `BeginNormalPaletteFade(PALETTES_ALL, 0, 0, 16,
RGB_BLACK)` (`battle_controller_player.c:2668`), whose
`UpdateNormalPaletteFade`/`objPaletteToggle` (`palette.c:406-466`) puts every
OBJ palette on `y_obj` (§6). The exact function that re-uploads the healthbox
tiles one row low during this window is not conclusively pinned from static
source this session (the tile copy sites are `TextIntoHealthboxObject`/
`FillHealthboxObject`, `battle_interface.c:2575-2601`); the pixel
characterization above is the load-bearing evidence. 779 additionally shows
the back sprite on a 1-row content offset (content-from-below at `y_obj=14`,
354 px) from 778.

### (c) Why it starts at 771 and not 766

The content offset **begins at frame 770**, not at the fade's first blend:
765-769 all decode exactly at their OBJ y (0 undecodable px), and 767/769 are
byte-exact. 770 (y_obj=4) is the first frame with aliased healthbox rows. 770
is a Class A frame (BG y=6 ≠ OBJ y=4): the *whole* healthbox already differs
there (the OBJ-lag), so the 1-row artifact is hidden inside 770's 7453 px. 771
is the **first frame after 770 where BG==OBJ** (both y=6), so the healthbox's
un-shifted interior now matches the app's single-y blend and the only residual
is the shifted rows → the clean 1639 px Class B. Not a delayed or slower ramp
— a content artifact that begins at 770 and is first *isolated* at 771.

### (d) Class A OBJ mask (for the MAIN fix)

Derived from the oracle alone (frame 766 blends BG at y_bg=2, OBJ untouched at
y_obj=0): pixels **unchanged** 765→766 but **changed** 766→767 are OBJ; pixels
changed 765→766 are BG. Identity-blend handling was a non-issue on this scene:
no pixel stayed unchanged at 766 and 767 and then changed only at 768 (a
would-be dark BG whose y=2 blend is identity) and none changed only at 769 (a
would-be dark OBJ); every settled pixel has changed by 769. The resulting
**OBJ mask is exactly 7528 px**, bbox (13,16)-(229,111), and it equals the
app-vs-oracle diff at 766 pixel-for-pixel (7528 = 7528, set-identical), so the
oracle-only derivation is cross-confirmed by the app comparison.

The OBJ stack is the **switch-selection screen's** sprite set, not a standard
two-battler battle:

| OBJ sub-region | bbox | dominant settled classes |
| --- | --- | --- |
| summary window (frame/interior/HP bar) | (13,16)-(109,40) | interior 910, frame 380, HP-teal 234 |
| separator rule | (21,41)-(187,43) | HP-teal 262 |
| summary mon sprite (RATTATA) | (163,44)-(189,71) | body 37, shade 66, highlight 24, outline 63 |
| player healthbox | (127,74)-(229,110) | interior 762+663, frame 292+258, HP-teal 322, shadow 135 |
| player back sprite (RATTATA) | (49,74)-(95,111) | body 239+251 |

So the "two battler sprites + both healthboxes" expectation does **not** apply
here — this scene carries one healthbox, one back sprite, the summary window,
and the summary mon sprite. The surprise to note for the fix: the summary
window itself is OBJ (its frame/interior/HP bar), so a BG/OBJ split must pull
it out too.

### (e) Fix plan (for a MAIN worker, per ISSUES #80)

The open-side render must stop blending the whole battle scene at one `y_bg`:

1. **Split the settled scene into BG + OBJ layers.** `drawBattleScene`
   currently draws one opaque framebuffer then `applyFadeToBlack(fb, y_bg)`.
   Split it into a BG pass (the screen background, the party-list window
   interior/text, the message box / action-menu strip — 30872 px change at
   766) and an OBJ pass (the 7528 px mask above: summary window, summary mon
   sprite, player healthbox, player back sprite). Blend BG at `y_bg`, then
   composite OBJ blended at `y_obj = y_bg − 2` (clamped ≥ 0) over it, using
   the §4 alpha-coverage mask idiom. This alone makes the 8 Class A frames
   (766/768/770/772/774/776/778/780) byte-exact.
2. **Model the Class-B content offset.** From frame 770, the healthbox OBJ
   content is rendered one row low (each healthbox pixel shows the settled
   pixel one row above, still at `y_obj`); from 778 the back sprite is one row
   high. Cost is small and enumerable — the healthbox is a ~100×36 sprite
   region and the shifted set is 1619 px (2% of screen), so this is a
   per-sprite row offset, not a second compositor. If the MAIN worker prefers,
   the healthbox can be redrawn from the settled tiles with a +1px vertical
   tile-source offset (and the back sprite with a −1px offset) instead of a
   general mechanism.
3. **Predicted acceptance.** Extend dense-a's `captureFrames` with 766, 768,
   770, 771, 772, 773, 774, 775, 776, 777, 778, 779, 780 (13 frames) → 330 →
   **338/338** on top of whatever the concurrent item-(c) step lands. The
   healthbox's own interior rows and all non-Open frames are already pinned.

### (f) Verification

`node --experimental-strip-types tools/probe/fade-open-residual.ts
<compare-out-dir-758-790>` prints all §8 tables (Class-A frame diffs, OBJ mask
7528 px, Class-B frame diffs 1639/2037 px with the row-above-shift count,
healthbox interior `y_obj` schedule, and the 770-begins/771-isolates edge
check) with a PASS/FAIL verdict. PASS on the receipt dir below; FAIL (exit 1)
on a truncated capture dir (missing capture is a FAIL, verified).

Receipt for this doc:
`tools/compare/out/run-2026-08-07-23-00-35Z-60136` (capture-range 758:790,
`mid-battle-switch-dense-a-off`; probe PASSes; a second fresh run
`run-2026-08-07-22-41-29Z-52643` gives identical px counts).

## 9. Open-fade Class B — the mechanism, from RAM (2026-08-07, salvaged)

A side-lane worker measured this with `tools/probe/dump-openfade-classb-sprites.py`
(committed here) but was killed at its cap before writing the section. These
facts were salvaged from its transcript and are recorded because they settle
the mechanism; the per-frame table itself was not written out.

**Tick <-> frame mapping: probe tick N corresponds to oracle frame N+1.**
Anchored three independent ways: the back-sprite settle at tick 760 = frame
761; the healthbox `y2` step at tick 769 = frame 770; the back-sprite `y2`
step at tick 778 = frame 779.

**What moves.** The Class-B residual is not a post-composite pixel shift and
not a fade-level error - it is two sprite-coordinate steps:

- the **player healthbox** sprite's `y2` steps to **1** at oracle frame
  **770** (it is drawn one row lower from there on), and
- the **player back sprite** `y2` steps at oracle frame **779**.

Both match the pixel evidence in section 8 exactly (healthbox one row low
from 770; the back sprite joining the residual at 779, one row high). Two
earlier attempts to reproduce this by shifting composited framebuffer rows
failed at the sprite's own boundary - a row-shift left 27 wrong pixels on the
box outline and its slanted lower-left corner - which is what a coordinate
change explains and a pixel shift cannot.

**Not resolved:** the exact source write site. `party_menu.c:4012` contains a
`sprite->y2 = 1;` and the `SlidePartyMenuBoxSprites` family around
`party_menu.c:2915` was the next thing being read when the cap hit. The fix
does not depend on naming the line - the measured coordinates do.
