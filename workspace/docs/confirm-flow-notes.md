# Confirm-flow notes (S5 scouting, slice 3)

Implementation dossier for the draft's final-confirm sequence: everything
between the 3rd RENT confirm and the YES-press that starts the exit fade,
plus the decline path. Scouting only — no engine code, no extraction.
Sources: `reference/pokeemerald/src/battle_factory_screen.c` (draft UI/task
state machine, `src/sprite.c` (affine-anim interpreter). Builds on
`docs/rent-flow-notes.md` §2/§4 Risks 3-5 and `ROADMAP.md` S5. All line
numbers refer to `battle_factory_screen.c` unless stated otherwise. Oracle
probes: scratch captures under `/tmp/s5-scout-confirm/` (not committed) —
dense (every-frame) `bin/oracle run` traces cross-verified sha256-for-sha256
against a custom frame-by-frame RAM probe (`EmeraldOracle.advance()` +
direct `sFactorySelectScreen` reads) built for this session; every RAM
number below was cross-checked against the oracle service's own PNG
captures for the same button script.

## 0. Correction to prior scouting: the "reveal" is two chained animations

`docs/rent-flow-notes.md` Risk 3 treated the ~47-tick window between the 3rd
confirm and the YES/NO box as one opaque state machine. It is actually
**two separate, back-to-back task/sprite state machines that happen to
share the same `monPicAnimating` gate flag**, so they read as one
continuous block from outside (the flag never observably reads `FALSE` in
between — see §4):

1. **Closing the 3rd pick's own popup preview.** `Select_OptionRentDeselect`
   (:1949-1970) calls `CloseMonPic(sFactorySelectScreen->monPics[1], ...,
   FALSE)` (:1961) **before** `Select_HandleMonSelectionChange()` — this is
   the *exact same* close path every RENT/DESELECT/OTHERS confirm runs
   (:1712, :1991), nothing special to the 3rd pick. `CloseMonPic` (:4100-4110)
   creates `Task_CloseMonPic` (:4250-4292): shrinks the hardware window
   (`WIN0`) vertically from the fully-open `(32,96)` back to a 1px sliver
   `(64,65)` in steps of 4 (8 ticks), then starts the border sprite's
   `sAffineAnim_Select_MonPicBg_Closing` affine anim (:552-564, table of 9
   entries) via `SpriteCB_CloseMonPic` (:4189-4200), which — once
   `affineAnimEnded` — destroys the sprite and only *then* clears
   `monPicAnimating` (`Select_SetMonPicAnimating(FALSE)`, :4197).
2. **The actual 3-mon reveal**, `Select_Task_HandleYesNo`'s
   `STATE_YESNO_SHOW_MONS` case (:1532-1535) calling `Select_ShowChosenMons()`
   (:2219-2230). Because `Select_Task_HandleYesNo` itself is gated by
   `if (monPicAnimating == TRUE) return;` at its very top (:1527-1528), and
   the task switch to this func happens on the *same frame* `CloseMonPic`
   set the flag TRUE, **the reveal cannot start until step 1's close
   finishes** — `Select_ShowChosenMons()` doesn't run (and doesn't re-set
   `monPicAnimating = TRUE` for its own, second animation) until the popup
   preview has fully closed.

Practical effect for a later engine slice: model these as two consecutive
sub-states, not one. Oracle screenshots (own script, press ticks below)
confirm the visual split cleanly: the *unmodified 6-ball grid, in-popup
text already updated* is still on screen well into the window (frame
+19 relative to confirm — the popup-close hasn't visually finished), a
screen-wide blank/white wipe (the reveal's own `Select_Task_OpenChosenMonPics`
window, `WIN0` `(16,224)x(32,96)`, :2131-2171) fills the frame around
mid-window, and the 3 mon sprites + YES/NO box appear together right at the
end.

## 1. The 3-mon reveal — per-phase mechanics and oracle-pinned ticks

All frame numbers below are this session's own button script (rent slot1:
`A,idle28,DOWN,idle4,A`; `RIGHT,idle6` + same for slot2/3), **relative to
the 3rd RENT-confirm press tick, called tick 0 here** (absolute trace frame
191 in the raw capture — a different script than `rent-flow-notes.md`'s, so
absolute frame numbers don't correspond 1:1, only offsets-from-confirm do).

- **tick 0 (confirm press):** `selectingMonsState` 3→4,
  `mons[2].selectedId` 0→3 (RAM-verified, instant, same tick).
  `Select_PrintSelectMonString()` prints **"Are these three POKéMON OK?"**
  into `SELECT_WIN_INFO` this same tick (:1893-1909, :1963) — this text is
  showing *underneath* the still-visible 6-ball grid and stays up
  unchanged through the entire reveal and into the YES/NO screen; it is
  never re-printed at YES/NO-show time. Screenshot-confirmed (tick 0 frame:
  old grid + popup + this text, all simultaneous).
- **~tick 0-19: popup-preview close (phase 1 above).** Screenshot-confirmed
  the 6-ball grid (3 red + 3 gray) is still fully, cleanly on screen at
  tick +19 (no reveal artifacts yet) — i.e. phase 1's ~20-24-tick close
  (matching the general `CloseMonPic` timing already pinned in
  `ROADMAP.md` Domain notes for other popup-close paths) is still the only
  thing running this early.
- **~tick 20-42: the reveal's own window-wipe (phase 2).** `Select_Task_
  OpenChosenMonPics` (:2131-2171): state 0-1 (2 ticks, GPU reg setup +
  `ShowBg(3)`/blend regs), state 2 (window `tWinTop -= 4; tWinBottom += 4`
  from `(64,65)` to `(32,96)`, 8 ticks), then waits on all 3 border
  sprites' (`monPics[0..2].bgSpriteId`, created in `Select_ShowChosenMons`
  at x=44/120/196 y=64, :2221-2223) `sAffineAnim_Select_MonPicBg_Opening`
  affine anim (:536-550, 11-entry table: alternating "jump to next zoom
  step" (duration 0) and "hold 1 tick" entries — 5 hold-ticks total, ending
  at the anim's max zoom) to finish. **All 3 border sprites start this
  affine anim simultaneously on creation** (`sSpriteTemplate_Select_
  MonPicBgAnim.affineAnims`, :623-632, auto-begins per the general
  sprite-affine-anim system, `BeginAffineAnim`/`ContinueAffineAnim`,
  `src/sprite.c:1067-1186` — engine-generic, not S5-specific) — **the side
  pics (index 0/2) run the identical zoom anim as the middle one**, they
  just use `SpriteCallbackDummy` (no extra per-frame logic needed) while
  only the *middle* sprite's callback (`SpriteCB_OpenChosenMonPics`,
  :2080-2098) polls `sprite->affineAnimEnded && gSprites[monPics[0]
  .bgSpriteId].affineAnimEnded && gSprites[monPics[2].bgSpriteId]
  .affineAnimEnded` each tick to decide when *all three* are done. Once all
  three finish: middle+side border sprites go `invisible = TRUE`,
  `Select_Task_OpenChosenMonPics` is spawned (destroying the just-finished
  bg-anim task), which runs its OWN window-widen (`WIN0` `(16,224)x
  (32,96)`, same 8-tick shrink-to-full pattern as above but full-width) —
  screenshot-confirmed this is what produces the screen-wide near-white
  wipe visible mid-window (ticks ~29-42 in this script). Its `default` case
  calls `Select_CreateChosenMonsSprites()` (:2055-2078): creates the 3 real
  mon-pic sprites at `x = i*72+16` (i.e. **x=16/88/160**, not the border
  sprites' 44/120/196 — the mon *pics* sit further left than their
  background-deco sprites) `y=32`, ordered by `selectedId` (so pick order,
  not ball-grid slot order), and clears `monPicAnimating`.
- **tick ~43 (this script): `monPicAnimating` clears.** RAM-verified via a
  byte that flips `0→1` exactly on the confirm tick and back `1→0` at
  tick+42/43 (offset `sFactorySelectScreen+0x2A0`/672 in this build —
  empirically located by correlating the toggle with the source-described
  trigger events; the full byte-exact `FactorySelectScreen` struct layout
  beyond the already-established `mons[]`/`selectedId` fields — see
  `tools/extract/inspect-anchor.py` — was not independently re-derived this
  session, so treat this specific offset as probe-grade, not
  extraction-grade, evidence). **This is 1 tick shorter than
  `rent-flow-notes.md`'s "~47 ticks"** — expected, since that number came
  from a differently-timed button script measuring from a different
  press-tick convention; both agree closely (43 vs ~47).
- **tick +44/45: YES/NO popup appears.** The very next
  `Select_Task_HandleYesNo` call (tick+44, once the gate clears) executes
  `STATE_YESNO_SHOW_OPTIONS`: `Select_ShowYesNoOptions()` (below) — mon
  sprites and the YES/NO box appear **together, same tick**
  (screenshot-confirmed: no frame shows the 3 mons without the box or vice
  versa).

**Answering the brief's specific questions:** the reveal does **not** reuse
the draft's own ball-picking mon sprites — it creates 3 brand-new
`CreateMonPicSprite_HandleDeoxys` sprites (:2070, same helper the summary
screen and the single-ball popup preview use) parented under new bg-deco
sprites at x=44/120/196 (bg) / x=16/88/160 (mon pic itself). All three
zoom in with the *identical* affine anim simultaneously — there is no
"pop the side ones in after the middle" sequencing; the side/middle visual
distinction in Risk 3's phrasing doesn't exist in the code, only in the
*polling* (middle sprite's callback is the one gatekeeping task
advancement, but all three animate identically).

## 2. The YES/NO popup

- **Window:** `SELECT_WIN_YES_NO` (`sSelect_WindowTemplates[4]`, :387-395):
  `bg=0, tilemapLeft=22, tilemapTop=14, width=8, height=4` — same
  left/top anchor as the RENT/DESELECT/OTHERS popup (`SELECT_WIN_OPTIONS`,
  :378-386, `width=8, height=6`) but 2 rows shorter (no 3rd/SUMMARY row),
  its own `baseBlock 0x009b` (doesn't share tile storage with the 3-row
  menu). `Select_ErasePopupMenu(SELECT_WIN_YES_NO)` (:1863-1870, used on
  decline) fully tears down tilemap + pixel buffer, matching every other
  popup-close in this file.
- **Text/art:** `Select_PrintYesNoOptions()` (:1934-1941) — `gText_Yes2`/
  `gText_No2` at `(7,1)`/`(7,17)` in `SELECT_WIN_YES_NO`, same
  `sMenuOptionTextColors` (transparent/dark-gray/transparent) and
  `FONT_NORMAL` as the RENT popup — visually identical styling, just a
  narrower box with 2 rows instead of 3.
- **Cursor:** reuses the *same* `menuCursor1SpriteId`/`menuCursor2SpriteId`
  sprites as the RENT/DESELECT/OTHERS popup (no separate YES/NO cursor
  sprite pair) — `Select_ShowYesNoOptions()` (:1848-1861) repositions them
  to `x=176`/`x=208`, `y=112` (row 0 = YES) and sets `yesNoCursorPos = 0`
  (**default = YES**, confirmed both by source and oracle: the YES row is
  highlighted at first appearance in every capture this session).
- **UP/DOWN:** `Select_UpdateYesNoCursorPosition` (:1390-1409) — `JOY_REPEAT`
  gated (:1571-1580, standard `gKeyRepeatStartDelay=40`/
  `gKeyRepeatContinueDelay=5` repeat rule per `ROADMAP.md` Domain notes, no
  special-cased timing here), wraps between the only two positions (0↔1,
  `y = yesNoCursorPos*16 + 112`) — a simple 2-state toggle, not a
  wrap-around list like the 3-row menu.
- **Interaction with the info-window message:** already covered in §1 —
  **"Are these three POKéMON OK?" is printed at the confirm tick, before
  the reveal even starts**, and never touched again by the YES/NO
  sub-machine. `STATE_YESNO_SHOW_OPTIONS` only touches
  `SELECT_WIN_YES_NO`/cursor sprites, never `SELECT_WIN_INFO`.

## 3. The decline path (A-on-NO or B) — oracle-probed this session

Probed via a dense every-frame RAM trace + a cross-checked `bin/oracle run`
capture: 3 picks confirmed, reveal allowed to fully settle, then `B`
pressed (A-on-NO is source-identical per :1551-1559 vs :1561-1570 — both
call `Select_ErasePopupMenu(SELECT_WIN_YES_NO)` +
`Select_DeclineChosenMons()` + set `fadeSpeciesNameActive = TRUE` + switch
to `Select_Task_HandleChooseMons` at `STATE_CHOOSE_MONS_HANDLE_INPUT`, byte
for byte the same three calls, so only `B` was probed empirically — no
behavioral difference is possible per source).

- **Same tick as the B/NO press:** `selectingMonsState` 4→3,
  `mons[2].selectedId` 3→0 — **RAM-verified instant**, no delay.
  `mons[0].selectedId`/`mons[1].selectedId` unchanged (`1`, `2`) — picks
  1-2 untouched, confirming `docs/rent-flow-notes.md` §2's source-read
  prediction exactly. (Ball *palette* specifically was not read from OAM
  this session — see Risk 5 below — but `Select_HandleMonSelectionChange`
  unconditionally derives the palette from this same `selectedId` transition,
  :1411-1442, so this is as good as verified short of a raw OAM byte read.)
  `cursorPos` **unchanged** (still the 3rd ball's slot) — confirmed via RAM
  and via the post-decline screenshot showing the cursor triangle still
  under that same ball.
- **Un-reveal timing: 20 ticks** (RAM-verified via the same
  `monPicAnimating`-tracking byte located in §1: flips `0→1` on the
  decline-press tick, `1→0` exactly 20 ticks later) — **shorter than the
  43-tick reveal-in**, which makes sense structurally: `Select_
  DeclineChosenMons` (:1972-1982) calls `Select_HideChosenMons()`
  (:2232-2244) directly, which only runs `Select_Task_CloseChosenMonPics`
  (:2173-2217, the reveal's close-mirror: 8-tick window shrink + the
  border sprites' `sAffineAnim_Select_MonPicBg_Closing` anim) — **there is
  no popup-preview-close phase to chain first** (no popup was open at
  decline time), so only "phase 2, reversed" runs, roughly half the total
  reveal-in duration.
- **Screenshot-confirmed the un-reveal is a genuine reverse transition, not
  a cut**: mid-window captures show the same screen-wide wipe look as the
  opening (just the mirror-image shrink), landing back on the plain 6-ball
  grid (3 red rented + 3 gray) with **"Select the third POKéMON."** showing
  in the info window — exactly `Select_PrintSelectMonString()` reading
  `selectingMonsState == 3` (:1902-1903), confirming `docs/
  rent-flow-notes.md`'s source-read prediction pixel-for-pixel.
- **Post-decline state: immediately re-pickable.** Cursor sits on the same
  (now-gray) 3rd ball; pressing `A` after the un-reveal settles opens that
  ball's popup exactly like any fresh pick (screenshot-confirmed: same
  ball-open sequence, nothing special). This session's probe pressed `A`
  well after (80 ticks post-decline, comfortably past the 20-tick un-reveal)
  rather than at the earliest possible tick — the *exact* earliest tick a
  post-decline `A` first registers (i.e. immediately at un-reveal+0, or
  gated a tick or two later like other transitions in this file) was not
  isolated this session; see Risk 6.

## 4. RNG during the reveal + YES/NO dwell — RAM-probed, exact-count method

Rather than eyeballing `gRngValue` deltas (meaningless for an LCG — see
below), this session decoded the **exact number of `Random()` calls per
frame** by replaying the known LCG step (`ISO_RANDOMIZE1(val) =
1103515245*val + 24691`, `include/random.h:16`, applied in `Random()`,
`src/random.c:11-15`) forward from each frame's prior value up to N times
and finding which N reproduces the next frame's actual `gRngValue` exactly
(deterministic and unambiguous — LCG steps don't collide in any
observed window).

- **Baseline confirmed exactly 1 call/frame** throughout the *entire*
  window probed (reveal + 150+ ticks of YES/NO dwell) — matching
  `ROADMAP.md`'s "`Random()` advances once per VBlank" rule; the reveal
  does **not** pause or alter this baseline.
- **Ball-rock extra rolls (`SpriteCB_Pokeball`'s `Random()%5`, `docs/
  rent-flow-notes.md` §3) continue through the reveal, unpaused** —
  contrary to a plausible guess that the reveal's window/BG-layer tricks
  might freeze `AnimateSprites()`, they do not: `CB2_SelectScreen` calls
  `AnimateSprites()` unconditionally every frame regardless of which task
  state is active (the reveal only touches `Select_Task_HandleYesNo`'s own
  task func and the mon-pic sprites/windows, nothing shared with the main
  per-frame sprite loop). **Direct confirmation:** an extra `Random()` call
  (2 calls that frame, not 1) landed at exactly reveal-tick+2 — i.e. the
  3rd-just-rented ball's *first* roll-eligibility check, matching the
  already-pinned "first roll-eligibility is 2 ticks after selection" rule
  from S5 slice 1 (`ROADMAP.md` Domain notes) **exactly**, even while deep
  inside the reveal's own window animation. No further extra rolls landed
  for the rest of the 43-tick reveal window in this specific trace (not
  evidence of throttling — see caveat below — more likely just how this
  trace's 3 balls' individual cooldowns happened to phase against this
  particular window).
- **During the YES/NO dwell (sitting on the popup, no input), extra rolls
  keep firing at roughly the pre-existing cadence** — this session's probe
  saw extra-roll frames at dwell-tick +38, +80, +93, +167 (i.e. roughly
  every 30-90 ticks with 3 balls simultaneously rented, consistent with
  each ball's own independent ~32-tick-plus cooldown/idle-anim cycle, not
  a fixed shared period).
- **Caveat, load-bearing:** `PROGRESS.md` entry 19 / `ISSUES.md` #6 already
  found a **real, RAM-confirmed multi-ball throttling effect** — a
  currently-rented ball's own cooldown/anim-completion tick can shift by
  ~1-2 ticks depending on *other* balls' popup open/close transitions
  during the same window, contradicting the naive "fully independent
  per-sprite `data[0]` counter" reading of `SpriteCB_Pokeball`. That
  investigation is **explicitly still open** (do not re-litigate here) —
  this session's RNG counts above are accurate as *observed in these two
  specific traces* but should not be treated as a general N-ball cadence
  formula until #6 resolves. The one exact, mechanism-level fact this
  session adds on top of #6 is: **the reveal/YES/NO window itself is not
  an additional throttling source** — whatever cadence a ball would have
  had absent the reveal, it keeps having during the reveal (no evidence of
  a reveal-specific pause), so #6's throttle (if real) is attributable to
  the popup open/close transitions themselves, not to the final-confirm
  reveal machinery specifically.

## 5. Risk list — ranked, each with the probe that resolves it

1. **`ISSUES #6`'s multi-ball `SpriteCB_Pokeball` throttling remains
   unresolved** and now provably also affects the confirm-flow window (§4
   showed rolls continuing through the reveal at the pre-existing,
   possibly-throttled cadence) — this blocks any exact RNG-consumption
   model for traces that dwell on YES/NO with multiple balls rented, which
   is unavoidable (the reveal's own ~43-tick gate guarantees ≥1 ball has
   been rented "a while" by the time YES/NO shows). **Probe:** whatever
   resolves #6 generally (RAM-diffing `OpenMonPic`/`CloseMonPic`'s
   VRAM/tile-buffer writes for a stolen-frame source, per that issue's own
   "Next" note) will also resolve this. Do not build a committed
   `rent-3picks`/confirm trace with RNG-sensitive downstream assertions
   until then.
2. **The `sFactorySelectScreen` struct's byte layout beyond `mons[]`/
   `selectedId` (used for §1/§3's `monPicAnimating` timing) was
   empirically located, not extraction-grade derived** — offset 672 (`+
   0x2A0`) tracks a flag that toggles exactly where source predicts
   `monPicAnimating` should, cross-checked twice (reveal-in and
   un-reveal), but the full field-by-field struct layout (`monPics[]`
   itself, `fadeSpeciesName*` fields, etc.) was not re-derived from
   scratch this session the way `tools/extract/inspect-anchor.py` did for
   the `mons[]` region. **Probe:** if a later slice needs more struct
   fields at exact byte precision (e.g. to RAM-verify ball OAM palettes
   directly instead of via the `selectedId` proxy), re-derive the full
   layout with an `nm`/struct-size audit like `inspect-anchor.py`'s,
   rather than trusting this session's single empirical toggle-correlation.
3. **The affine-anim zoom math (`sAffineAnim_Select_MonPicBg_Opening`/
   `_Closing`, :536-564) was read from source but its exact per-tick
   scale/pixel-size progression was not derived** — this dossier pins the
   *tick counts* (oracle-verified) and the *shape* (screenshots) of the
   reveal/un-reveal, but not the frame-by-frame OAM matrix values a
   pixel-exact renderer would need. **Probe:** either derive the GBA affine
   matrix math directly from `src/sprite.c`'s `ApplyAffineAnimFrame*`/
   `ObjAffineSet` chain (engine-generic, may already be needed for other
   affine sprites elsewhere in this codebase — check for an existing
   affine-anim engine module before re-deriving), or oracle-diff individual
   mid-animation frames pixel-by-pixel against a candidate implementation
   once one exists.
4. **The exact earliest tick a post-decline `A`-press registers was not
   isolated** (§3) — this session confirmed re-picking works at
   un-reveal+80, comfortably past settling, but not the precise boundary
   (whether it's un-reveal+0, +1, or gated like the summary-screen's
   "looks stable but isn't yet" quirk from `ROADMAP.md` Domain notes).
   **Probe:** a tight-spaced binary-search trace pressing `A` at un-reveal
   +0, +1, +2, ... until it registers.
5. **Ball palette on decline was verified via the `selectedId` proxy, not a
   raw OAM/palette byte read** — source guarantees they're equivalent
   (`Select_HandleMonSelectionChange` derives palette solely from this same
   transition, :1411-1442), but no direct OAM `paletteNum` byte was read
   this session to double-check against, say, a stale-sprite bug. **Probe:**
   if Risk 2's struct re-derivation happens anyway, add the ball sprites'
   `gSprites[...].oam.paletteNum` to the same pass and cross-check against
   `selectedId` for one decline trace.
6. **`Select_AreSpeciesValid`'s "Can't select same {PKMN}" popup path was
   not (re-)probed this session** — carried over unchanged from `docs/
   rent-flow-notes.md` Risk 6, still open, out of this session's assigned
   scope (final-confirm sequence only).
