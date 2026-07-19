// S6 scene-assembly + send-out engine slices: the BATTLE-SCENE ASSEMBLY
// window (tools/compare/traces-groundtruth/battle1-scene-dense.json, trace
// ticks 1040-1295) plus the SEND-OUT window (battle1-sendout-dense.json,
// ticks 1300-1560, docs/battle-scene-notes.md §7) - both windows' full
// dossier lives in that same doc. Picks up where battleTransition.ts's
// exit-to-black fade holds solid black indefinitely (past trace tick
// ~1030); this module owns the screen from trace tick 1040 onward
// indefinitely.
//
// Pure state: `elapsed` (0 = trace tick 1040, matching this window's own
// ground-truth trace) - every visual through tick ~1418 is a pure function
// of the corresponding trace tick (`TICK0 + elapsed`), no phase enum
// needed. The send-out window adds exactly one piece of input-dependent
// state, `sendOutPressElapsed` (§7, below) - the elapsed value of
// A-PRESS-#3 (trace tick 1420) once registered, folded into this same flat
// state rather than a phase enum (see the field's own doc comment).
//
// STATUS (docs/battle-menu-notes.md §1/§2, S6 PLAYER SEND-OUT slice 1): the
// message-box clear + "Go! ONIX!" print + settled static hold (trace ticks
// 1563-1594) is landed - see `battleMenu.ts` for the cadence logic, hooked
// in at the bottom of `drawSendOutHandoff` below. `tools/compare/traces/
// menu-text.json` (every tick 1556-1594) is **18/39** - ticks 1556-1573
// (the settled "sent\nout GROVYLE!" hold through this slice's own static
// hold) are bit-exact, but 1574-1594 diverge for a reason OUTSIDE this
// slice's scope: pixel-diffing the oracle's own consecutive frames shows
// Brendan's throw-pose swap + a ball-icon-count change genuinely begin at
// trace tick **1574** (re-derived this session, oracle-confirmed), not
// "~1595" as docs/battle-menu-notes.md §1's own coarse pass estimated - the
// same kind of few-to-20-tick coarse-pass underestimate flagged elsewhere in
// that doc, just larger here. Modeling that (Brendan's throw animation/ball
// arc) is explicitly out of scope for this slice (unextracted assets per
// docs/battle-menu-notes.md §6: ball-open particles, affine emerge + color-
// fade tables) - flagged for the next slice/supervisor rather than forced.
//
// STATUS (docs/battle-scene-notes.md §7.19): the party-summary bar's own
// exit slide (§7.15's flagged sub-gap) is landed - `barExitX2`/
// `EXIT_BAR_TILE_ORDER` in `drawOpponentSummaryExit`, source-decoded from
// `SpriteCB_StatusSummaryBar_Exit` (a constant +2px/tick, no acceleration,
// since 32's low 4 bits always mask back to 0) plus the subsprite-table
// width swap that happens the same tick (`sStatusSummaryBar_Subsprites_
// Exit`, 16->24 tiles) and the 64px render-anchor shift that swap implies
// (source-derived from the two tables' own literal x offsets, cross-
// validated by an exhaustive oracle x2 sweep landing on the same constant
// independently). `sendout.json` **199/256 -> 214/256** (+15): 15 of the
// 18 target ticks (1463-1480) are bit-exact; the other 3 (1470/1471/1479)
// are NOT the bar - pixel-confirmed to be an icon-edge/materialize-overlap
// residual instead. See docs/battle-scene-notes.md §7.19 for the full
// per-tick accounting, the render-anchor derivation, and a named-but-not-
// fixed adjacent finding at tick 1462 (out of this step's scope).
//
// STATUS (PROGRESS.md #88): the open-particle burst's (mechanism 3, #82)
// empirical logical-tick-12 cutoff is REMOVED and root-caused - RAM-probed
// the particle sprites' own gSprites slots directly (found via a callback-
// pointer cross-reference against the ELF, not guessed): the whole
// particle subsystem (spawner task + all live particles) freezes for
// exactly one real game tick (RAM tick 1494 duplicates 1493 verbatim),
// which is exactly the boundary the prior session's empirical cutoff had
// already (unknowingly) found the edge of, and the spawner's own `data[0]`
// increment freezes the same tick, delaying the last 2 of 16 particles'
// own spawns by one tick too. Both are RAM-confirmed, not curve-fit - see
// `PARTICLE_STALL_LOGICAL_TICK`'s doc comment on `drawBallOpenParticles`
// for the full derivation. The already pixel-validated age<->radius/frame
// formulas (ages 0-12) are UNCHANGED; only two `logicalT`-relative age
// offsets were added on top, plus a one-tick tighter `PARTICLE_MAX_AGE`
// (25->24: a particle's final RAM write happens the same tick it self-
// destructs, so it's never actually composited - rendering it anyway
// regressed an already-bit-exact tail frame, caught by the compare sweep
// and fixed before landing). `sendout.json` **196/256 -> 199/256** (+3);
// most of the previously-craterous 1481-1503/1516-1519 window's PER-TICK
// pixel mass dropped sharply (several thousand px/tick down to double or
// triple digits) without yet reaching a full-frame match there - see
// PROGRESS.md #88 and docs/battle-scene-notes.md §7.18 for the complete
// per-tick accounting. The party-summary bar's own exit slide (§7.15's
// flagged sub-gap, priority 2) and the small 1504-1521 boundary residual
// (priority 3) are still open, unattempted this session (time-boxed to
// priority 1 alone, per the brief's own precedence rule).
//
// STATUS (PROGRESS.md #84): mechanism 5 of the 5 named in #78/docs §7.11
// landed - GROVYLE's FRONT-SPRITE ENTRANCE STRETCH (`drawGrovyleStretch`,
// `ANIM_V_STRETCH`/`Anim_VerticalStretch`, RAM-probed data[4]/data[5]/y2
// per tick rather than reimplemented from `Sin()` source math - see
// `GROVYLE_STRETCH_TABLE`'s doc comment). ALL FIVE mechanisms are now
// landed. `sendout.json` moved for the first time in this window's whole
// history: **174/256 -> 180/256**; `localcheck.ts` pixel-diff mass across
// 1462-1543 dropped 100498->89444px. Known residual: 2 of 40 covered
// render ticks (1536/1537) have a small unexplained mismatch even with
// RAM-exact affine parameters - flagged, not curve-fit away. See
// PROGRESS.md #84 and docs/battle-scene-notes.md §7.16 for the full
// accounting and remaining per-tick residual attribution.
//
// STATUS (PROGRESS.md #83): mechanism 1 of the 5 named in #78/docs §7.11
// landed - the OPPONENT PARTY-STATUS-SUMMARY DESPAWN
// (`drawOpponentSummaryExit`: source-exact `BLDALPHA` fade + per-icon
// staggered exit slide, `battle_interface.c:1671-1738,1878-1902`; the bar's
// OWN exit slide is NOT implemented, alpha-fades in place only - a known,
// flagged sub-gap). `sendout.json` stays **174/256** (expected);
// `localcheck.ts` pixel-diff mass across 1462-1543 dropped
// 105984->100498px, zero per-tick regressions. Only mechanism 5
// (front-sprite entrance anim) remains - see PROGRESS.md #83 and
// docs/battle-scene-notes.md §7.15 for the full per-mechanism accounting.
//
// STATUS (PROGRESS.md #82): mechanism 3 of the 5 named in #78/docs §7.11
// landed - the OPEN-PARTICLE BURST (`drawBallOpenParticles`, a
// `gSineTable`-driven radial spawner, source-exact through logical tick 12
// then an empirical hard cutoff - see `PARTICLE_RENDER_LAST_LOGICAL_TICK`'s
// doc comment). `localcheck.ts` pixel-diff mass across 1462-1543 dropped
// 106893->105984px.
//
// STATUS (PROGRESS.md #81): mechanism 4 of the 5 named in #78/docs §7.11
// landed - Grovyle's materialize AFFINE-SCALE-IN + BALL-COLOR TINT
// (`drawGrovyleMaterialize`/`drawSpriteSheetAffineTinted`, this engine's
// first affine-OAM scale renderer, nearest-neighbor). `localcheck.ts`
// pixel-diff mass across 1462-1543 dropped 124762->106893px.
//
// STATUS (PROGRESS.md #79): mechanism 2 of the 5 named in #78/docs §7.11
// landed - the send-out BALL SPRITE (`drawSendOutBall`, closed+open frames,
// pixel-brute-force-confirmed corner+timing). `localcheck.ts` pixel-diff
// mass across 1462-1543 dropped 127107->124762px, zero regressions.
//
// STATUS (prior session - trainer-exit RAM ground truth + BG palette-fade
// formula, PROGRESS.md #74): `tools/compare/traces/sendout.json` is still
// **196/256** (score UNCHANGED from the prior session) despite two real,
// independently-verified fixes landing: (1) `trainerExitX`'s `TRAINER_EXIT_X2`
// is now a literal RAM-probed table (`gSprites[4].x2`, the trainer's own
// sprite index - `gBattlerSpriteIds[1]` itself reassigns away from the
// trainer one tick before the handoff, so it was tracked directly instead;
// `tools/probe/specs/sendout-trainer-exit2.json`), replacing the old
// unverified linear-rounding formula; (2) `sendOutBgFadeY`/`drawTileBgFaded`
// implement §7.5's `BeginNormalPaletteFade(...,RGB_WHITE)` BG-to-white
// dither, a per-tick table pixel-sampled from a clean background swatch in
// the oracle's own captures (paletteFade.ts gained `blendComponentToWhite`
// for the 5-bit blend math). Both are exact, oracle-verified, and cut the
// per-frame pixel-diff dramatically across the whole 1462-1521 window (the
// ~20000px/frame plateau at ticks 1496-1503 is now ~1800-2200px; ticks
// 1463-1480 dropped from ~1500px to ~370-600px) - but the scoring metric is
// full-frame exact match, and NO tick in this window has only ONE mechanism
// left broken: every tick still needs the party-summary despawn fade
// (§7.4.3, alpha-blend + per-icon staggered exit-slide, unimplemented), the
// ball sprite, the open-particle burst, and the mon's affine-scale
// materialize (§7.4.2/§7.5's own transient sprites) all simultaneously
// correct too. See PROGRESS.md #74 and docs/battle-scene-notes.md §7.10 for
// the full accounting - this is genuine, verified progress on the
// mechanism, but it does NOT cross the trace's own full-frame-match bar
// this session.
// §7.1-7.3 (idle-hold, A-press-#3 registration, text cadence) were already
// byte-exact (prior session). This session closed the post-text visual
// handoff's highest-value items: (1) the opponent healthbox slide-in +
// content (§7.6) - the general tile-assembly mechanism is genuinely
// unsolved (confirmed again this session: the extracted frame tileset in
// its own raster order still mismatches 728/2574 opaque pixels at the
// pixel-confirmed settled corner), so the content is pixel-harvested
// directly from the oracle's own settled capture instead (see
// `extract-sendout-healthbox-content.ts` - "oracle is ground truth", the
// same methodology this module already used for brute-force-matched
// corners/tables) and composited as a pure horizontal translation - a
// per-tick brute-force x-offset search found ZERO pixel mismatch at every
// single tick across the whole 23-tick slide, so this is exact, not
// approximated; (2) Grovyle's settled materialize pose (§7.5's *end*
// state only) - also brute-force pixel-confirmed as a hard step (zero
// mismatch from tick 1519, full mismatch every tick before) using the
// already-extracted `GROVYLE` front-sprite asset, no new extraction
// needed; (3) two previously-missed gaps found via diffing: the message
// text ("BUG CATCHER DESTIN sent / out GROVYLE!") stays fully printed
// throughout the whole handoff (a prior session's `drawSendOutHandoff`
// dropped it entirely once the handoff started), and the PLAYER's own
// party-status-summary bar+icons stay visible throughout (only the
// SENDING battler's - the opponent's - side despawns per §7.4.3's own
// source citation; a prior session hid both sides by omission). This
// recovers the entire static tail of the trace (ticks 1522-1555, the last
// 34 frames, byte-exact once healthbox+Grovyle are both correct, exactly
// as predicted) plus scattered earlier frames. STILL OPEN, in the brief's
// own priority order: the trainer-pic exit slide's exact rounding (§7.4.1,
// still only structurally correct, not RAM/pixel-verified - unchanged
// from the prior session); the ball sprite itself, the open-particle
// burst, and the materialize tint/BG-white-flash transient frames
// (§7.4.2/§7.5's own ~1462-1518 transient window) - the single largest
// remaining gap (up to ~20000px/frame around ticks 1496-1503, consistent
// with the documented BG-palette-fade-to-white being genuinely
// unimplemented, not a regression - see PROGRESS.md for the precise tick
// list and evidence).
// scene-assembly's own STATUS (prior session, unaffected by this one): the
// whole scene-assembly slice is now FULLY RESOLVED - tools/compare/traces/
// scene-assembly.json is **256/256** (was 255/256). This session closed the
// last residual (point 3's tick-1229 gap, GAP B) with an asymmetric,
// RAM+pixel-confirmed fix to the player bar's own visibility gate - see
// point 3 below for the full derivation. GAP A (the prior session, #68) was
// already fully resolved: the whole BattleIntroSlide3 streak window (ticks
// 1075-1226) is byte-exact. Building on #66's three fixes (trainer OBJ
// layer, BG3's real 512px width, floor-not-round blending), that session
// closed point 2's "STILL OPEN" pixel (tick 1150 x=120/y=84) with two more
// fixes: (a) the GBA alpha-blend formula matches the oracle when run in
// **8-bit-expanded color space with floor division** directly on the
// source colors, NOT #66's 5-bit-quantize-then-reexpand convention -
// proven both negatively (the oracle's exact pixel value is mathematically
// UNREACHABLE by any 5-bit blend of any two palette colors under any
// eva/evb, since `(c5<<3)|(c5>>2)` only ever produces one of 32 fixed
// values per channel) and positively (the 8-bit-domain formula hits all
// three channels exactly, using the very same source colors #66 already
// validated); (b) `evaEvb` needed the identical one-tick render lag every
// other register in this task already has - found via 8 leftover
// boundary-tick mismatches (one per 6-tick BLDALPHA step) after fix (a).
// That session took scene-assembly.json 151/256 -> 255/256 (0 regressions,
// full 18-trace sweep + groundtruth traces re-verified; battle1-intro.json
// even improved 141->167/254 as a side effect, same fix, different trace).
// The mandated VRAM probe (`ram-probe.py` on BG1CNT, BLDCNT/BLDALPHA, the
// literal tile entry at `BG_SCREEN_ADDR(28)` for this pixel, its
// palette-RAM and char-VRAM bytes) came back clean on every axis this doc
// had flagged unverified - BG1's `screenSize=2` reads 256px-wide exactly as
// assumed (no bug), the tile/palette/char bytes match the extracted JSON
// exactly (the JSON's palette-bank numbers are a local remap of VRAM's raw
// bank indices, a labeling difference, not a data bug) - so that fix was
// purely the blend-precision domain, not a geometry/extraction problem.
// Full derivation in point 2 below.
// 1. The settled composite (trace tick 1227 onward, before any widget
//    slide) is byte-exact (unchanged from #58: battle-bg.json's `static`
//    bg + both trainer pics at their source-derived corners + battle-
//    window.json's bg0 tilemap).
// 2. The BattleIntroSlide3 streak (ticks 1075-1226): GEOMETRY is now pixel-
//    exact. This session found a systemic ONE-TICK RENDER LAG affecting
//    every internal register this task drives - the frame captured for
//    trace tick `t` reflects the task's own state as of tick `t-1`, not `t`
//    (task writes registers this tick; HBlank DMA/VBlank copy shows them to
//    the display next tick). Confirmed three independent ways: (a)
//    `windowRange` - scanning the oracle's own captures tick-by-tick for
//    the first/last non-black row (unambiguous ground truth, no pixel
//    aliasing possible) shows the window is exactly 1px (row 80 only) at
//    tick 1075, one tick's growth *behind* the naive `gBattle_WIN0V` RAM
//    reading; the phase-1/phase-2 boundary and full-open tick are each one
//    later too (1107/1108/1119, not 1106/1107/1118 - see the corrected
//    constants below). (b) `scanlineShiftMagnitude` - the actual DMA'd
//    `gScanlineEffectRegBuffers` row-0 content (RAM-probed directly, not
//    just `data[2]`'s own value) is 2px larger at a fixed tick than the
//    naive-pivot formula predicted, exactly matching the same one-tick-
//    later pivot. (c) `bg1X` - `gBattle_BG1_X` (RAM-probed) at tick `t-1`
//    is what a fixed-column pixel search matches, not tick `t`'s own value.
//    LAYER MODEL: `BLDCNT = TGT1_BG1|BLEND|TGT2_BG3|TGT2_OBJ` (0x1842,
//    RAM-confirmed) with BG1 = `entrySlide` (source: `DrawBattleEntryBackground`'s
//    Frontier branch loads it to `BG_CHAR_ADDR(1)`/`BG_SCREEN_ADDR(28)`,
//    matching BG1's own `gBattleBgTemplates` charBase/mapBase) and BG3 =
//    `static` (mapBase 26, matching `DrawMainBattleBackground`). BG1 sits at
//    OAM-scale priority 0 (frontmost), BG3 at priority 3 (backmost), both
//    trainer OBJs at priority 2 (`gOamData_BattleSprite{Player,Opponent}Side`,
//    `battle_main.c:274-301`) - so BG1 is always the topmost layer wherever
//    opaque, and OBJ is BG3's own topmost neighbor (in front of it, behind
//    BG1). **CORRECTION this session (PROGRESS.md #66): the prior "neither
//    trainer OBJ is ever actually visible during the reveal" conclusion
//    (#63) was a misdiagnosis** - it only pixel-sampled each trainer's
//    *settled* corner rect (which is genuinely blank until the tick-1227
//    settle), never checking whether the OBJ appears elsewhere first. RAM-
//    probing `gSprites[gBattlerSpriteIds[0/1]]` (indices 3=player, 4=
//    opponent) directly (`tools/probe/ram-probe.py`, ticks 1073-1240) shows
//    both are `inUse=1`/`invisible=0` from creation (tick 1074) onward, with
//    constant `oam.tileNum`/`paletteNum` (369/7 opponent, 305/0 player) -
//    i.e. they're their full final artwork the whole time, not a
//    placeholder - and each slides in via its own OAM `x2` secondary offset
//    at the EXACT SAME per-tick magnitude as `gTasks[0].data[2]` (the BG3
//    scanline-shift value), opposite sign per side (opponent `x2=-data[2]`,
//    player `x2=+data[2]`, both reaching 0 at the shared tick-1226 settle) -
//    same underlying register driving both mechanisms, so `objShift(t)`
//    below just reuses the already-validated `scanlineShiftMagnitude`
//    rather than a new table. `WININ` includes `WIN0_OBJ`, so the OBJ is
//    window-clipped identically to BG3 (`drawSpriteSheetWindowed`). BG3
//    gets the per-scanline HOFS shift (`sIntroScanlineParams16Bit` targets
//    `&REG_BG3HOFS` literally, `battle_main.c:250-253` - not BG1); BG1
//    scrolls uniformly via the ordinary whole-frame `gBattle_BG1_X` write.
//    Blend only engages where BG1 (TGT1) is opaque; elsewhere the next-
//    topmost opaque layer (OBJ if present, else BG3) draws raw.
//    BLEND PRECISION, corrected again this session (PROGRESS.md #68 - see
//    `blendChannel`): the formula that actually matches the oracle runs in
//    **8-bit-expanded color space with floor division directly on the
//    source colors** (`floor((tgt1*eva+tgt2*evb)/16)`, no 5-bit
//    quantize-then-reexpand step) - NOT the 5-bit-floor convention #66
//    landed on (itself a fix over round-in-8-bit, but the wrong precision
//    domain). Proven two ways at the pixel #66 left open (tick 1150,
//    x=120/y=84, entrySlide content, `entrySlidePixel` returns a real
//    opaque color there): (a) NEGATIVELY - the oracle's own pixel there,
//    (242,246,252), is mathematically UNREACHABLE by 5-bit blending, full
//    stop - `(c5<<3)|(c5>>2)` only ever produces one of 32 fixed values per
//    channel regardless of which two palette colors or which `eva`/`evb`
//    pair feed it, and none of 242/246/252 are among them (brute-forced
//    exhaustively, not just sampled); this holds even changing which tile
//    the blend reads, since ANY GBA palette color is itself one of those
//    same 32 values. (b) POSITIVELY - the 8-bit-domain formula, run on the
//    exact same operands #66 already validated (`entrySlide` tile 8's
//    (222,231,247) blended with `static`'s white (255,255,255) at
//    `eva=6,evb=10`), hits the oracle's value exactly on all three
//    channels: R `floor((222*6+255*10)/16)=242`, G `floor((231*6+255*10)
//    /16)=246`, B `floor((247*6+255*10)/16)=252`. Since `blendChannel` is
//    local to this file (only caller is `drawSlideScene` below), this fix
//    is scoped to this window alone - `paletteFade.ts`'s own blend is a
//    separate function, unaffected, still 5-bit floor for its own (already
//    oracle-validated) use case; apparently mGBA's own blend implementation
//    operates in its native 8bpp framebuffer domain rather than re-deriving
//    5-bit hardware precision, a real emulator characteristic worth
//    matching since the oracle - not idealized hardware semantics - is
//    ground truth (`AGENTS.md`).
//    EVA/EVB RENDER LAG (found immediately after the fix above, same
//    session): switching the blend formula took scene-assembly.json from
//    151/256 to 247/256, leaving exactly 8 residual mismatches - trace
//    ticks 1139/1145/1151/1157/1163/1169/1175/1181, precisely the 6-tick
//    BLDALPHA step boundaries. `evaEvb` was reading `gTasks[0].data[4]`'s
//    effective tick directly (no lag), unlike every other register this
//    task drives (`bg1X`, the window edges, the scanline shift, all
//    corrected for the same one-tick task-writes/display-shows-next-tick
//    lag in this module already) - adding the identical `t-1` lag to
//    `evaEvb` fixed all 8, landing on 255/256 (only GAP B's own
//    already-known point-3 residual, tick 1229, remains - see below).
//    VRAM PROBE (the brief's mandated first step, run this session
//    alongside the above): `ram-probe.py` on BG1CNT (`0x0400000A`),
//    BLDCNT/BLDALPHA (`0x04000050`/`0x04000052`), the literal tilemap entry
//    at `BG_SCREEN_ADDR(28)` for tick-1150 x=120/y=84's tile (tileRow 10,
//    tileCol 28), that tile's char data at `BG_CHAR_ADDR(1)`, and its
//    palette RAM bytes - all came back clean, closing out both items this
//    doc had flagged unverified: BG1CNT decodes to `charBase=1,
//    colorMode=0(4bpp), screenBase=28, screenSize=2` byte-for-byte matching
//    `gBattleBgTemplates[1]` and this module's existing 256px-wide
//    assumption (no bug - screenSize=2 was never actually in question,
//    just never RAM-cross-checked until now); the tile entry decodes to
//    `tileId=8/hFlip=0/vFlip=0`, and its char data (`0x5555 0x5555`, i.e.
//    palette index 5 for all 8 pixels of tile row 4) matches the extracted
//    JSON exactly; the entry's raw palette nibble is hardware bank **4**,
//    not the JSON's bank **2** - but VRAM palette bank 4 index 5 reads
//    BGR555 `0x7B9B` = RGB(222,231,247), byte-identical to the JSON's own
//    bank 2 index 5 - `extract-battle-bg.ts` locally renumbers only the
//    palette banks a tileset actually references rather than preserving
//    raw VRAM bank indices, a labeling convention confirmed harmless here,
//    not a bug. So the true fix was purely the blend-precision domain
//    above, not a geometry/palette/extraction problem.
//    Net across all fixes to date: scene-assembly.json 104/256 -> 151/256
//    (#66) -> **255/256** (#68), 0 regressions at either step (full
//    18-trace sweep + groundtruth traces re-verified both times).
//    GAP A IS NOW FULLY RESOLVED: every captured tick across the whole
//    1075-1226 streak+settle-adjacent window is byte-exact. The one
//    remaining scene-assembly.json mismatch (trace tick 1229) is GAP B's
//    own pre-existing, separate, narrower residual - see point 3 below,
//    untouched this session, out of GAP A's scope.
// 3. The party-status-summary ball-icon + diagonal-bar widgets' entrance
//    slide (ticks ~1228-1291): RESOLVED this session (#64; #60/#62/#63 each
//    left this open - see PROGRESS.md for the full account). Two independent
//    bugs, both found by RAM-probing `gSprites[].{invisible, x2, oam.attr2}`
//    directly per tick for the 14 identified sprite indices (2 bars + 12
//    icons; identification method: match settled `(x, y)` against docs/
//    battle-interface-assets.md's known corners, same as #60/#62 banked):
//    (a) `invisible` and `oam.attr2` (tileNum) never actually change after
//    creation for any of the 14 sprites - #62's "tile swap" and "invisible
//    toggle" theories were both wrong shapes, there is no separate
//    visibility trigger to find. (b) the real cause is the SAME systemic
//    one-tick render lag GAP A found (point 2 above): pixel-ground-truthing
//    the oracle's own captures directly (not just trusting the RAM-baked
//    `x2` tables at face value) shows the displayed frame at trace tick `t`
//    reflects each sprite's `x2` as of RAM tick `t-1`, confirmed exactly at
//    the player bar (tick 1230's oracle edge matches the table's tick-1229
//    value, not 1230's own). `ballIcons`/`ballStatusBarPositions` now render
//    at `t - 1` uniformly (both the table lookup AND the visibility gate -
//    #62's blanket-shift attempt broke on exactly this: it shifted only the
//    table index while leaving the create-tick comparison unshifted,
//    desyncing the two). Separately, the OPP_ICON_X2 tables themselves
//    (baked in #60/#62) had been built from only the sliding tail of each
//    icon's RAM `x2` history, missing the per-icon flat-delay prefix
//    (`SpriteCB_StatusSummaryBalls_Enter`'s `data[1]` countdown, `data[1] =
//    (6-i)*7+10` per source) before the slide starts - every opponent icon
//    was starting its slide 10-54 ticks too early. Rebuilt all 14 tables
//    directly from RAM (`tools/probe/ram-probe.py`, full flat prefix
//    included) rather than reconstructing from the source formula (same
//    "RAM table is ground truth, source is shape-only corroboration"
//    convention #60 established). Net: scene-assembly.json 41/256 -> 104/256.
//
//    GAP B FULLY RESOLVED this session (PROGRESS.md #70): the one narrow
//    residual left above (trace tick 1229, player bar 22px off - the oracle
//    was still background there a tick after the model showed the bar's
//    first frame) was chased with the mandated RAM probe rather than another
//    blanket offset. #64 had already shown a blanket one-tick-later `visible`
//    gate fixes 1229 but breaks the opponent's own first-visible tick (1232)
//    the same way - proof the two sides needed a genuinely asymmetric fix,
//    not a shared constant. RAM-probing `gSprites[5]` (player bar) and
//    `gSprites[6]` (opponent bar, both identified by matching their settled
//    corners, same method as above) tick-by-tick found the actual structural
//    difference: the player bar's `x2` STALLS for one extra tick right after
//    creation - `x2=95` at BOTH RAM tick 1228 (its creation tick) and 1229,
//    only resuming `SpriteCB_StatusSummaryBar_Enter`'s ordinary per-tick
//    decrement (`x2 += data[0]`) at RAM tick 1230 - whereas the opponent
//    bar's `x2` decrements every single tick starting immediately at its own
//    creation (`-95` at 1231, `-90` at 1232, no stall). Pixel-ground-truthing
//    the oracle's own captures independently confirms this is exactly what
//    gates the display (not a coincidence): the player-side region is
//    byte-identical background through trace tick 1229 and first changes
//    (22px, matching the bar's leading-tile opaque wedge at `x2=95`
//    precisely) at 1230; the opponent-side region is unchanged through 1231
//    and first changes (22px, same shape) at 1232 - i.e. the player bar
//    genuinely needs createTick+2 ticks to reach the display, the opponent
//    bar only createTick+1 (the module's ordinary one-tick lag, untouched).
//    Fix: `PLAYER_BAR_VISIBLE_TICK = PLAYER_CREATE_TICK + 1` gates ONLY the
//    player bar's `visible` field (table lookup itself is untouched, since
//    it was already RAM-exact and already encodes the same stall as a
//    literal repeated value, `PLAYER_BAR_X2 = [95, 95, 90, ...]`) - the
//    opponent bar and both sides' ball icons are untouched: icons have their
//    own per-icon flat-delay prefix already baked into their tables (the
//    `data[1]` countdown above), which keeps every icon fully off-screen
//    through this exact tick regardless of any such stall, so nothing there
//    needed correction. scene-assembly.json 255/256 -> **256/256**, 0
//    regressions (full 18-trace sweep re-verified at each trace's exact
//    prior count). This closes the whole scene-assembly slice - see the
//    module-level STATUS note above.

import type { RgbColor } from "./bg.ts";
import { drawText, type FontData } from "./font.ts";
import { blendComponentToWhite } from "./paletteFade.ts";
import {
  GO_TEXT,
  GO_TEXT_START_TICK,
  goTextVisibleChars,
  BRENDAN_THROW_START_TICK,
  brendanThrowFrame,
  brendanThrowDx,
  playerThrowBallTopLeft,
  playerThrowBallSpin,
  playerSummaryFadeEva,
  playerSummaryIconExitDx,
  playerSummaryBarExitDx,
  PLAYER_SUMMARY_FADE_START_TICK,
  playerBallOpenTopLeft,
  PLAYER_BALL_OPEN_END_TICK,
  PLAYER_BALL_OPEN_VISIBLE_BOTTOM,
  playerMaterializeBgFadeY,
  PLAYER_BG_FADE_START_TICK,
  playerHealthboxSlideDx,
  PLAYER_MATERIALIZE_SETTLE_START_TICK,
  playerMaterializeSettleTintCoeff,
  playerMaterializeSettleY2,
  MENU_IDLE_BLANK_START_TICK,
  MENU_IDLE_BLANK_END_TICK,
  menuIdleBounce,
  FIGHT_SUBMENU_OPEN_DELAY,
  FIGHT_SUBMENU_CLOSE_DELAY,
  FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT,
  FIGHT_SUBMENU_RESUMED_BOUNCE_SHIFT,
  FIGHT_SUBMENU_SLOT_NAMES,
  CLOSED_FIGHT_SUBMENU_STATE,
  type FightSubmenuState,
  turnKickoffTextStartTick,
  turnKickoffTextVisibleChars,
  turnKickoffBounceTick,
  TURN_KICKOFF_LINE1,
  TURN_KICKOFF_LINE2,
  doubleTeamCloneOffsets,
  statsBannerEva,
  statsBannerBg1Y,
  STAT_ROSE_LINE1,
  STAT_ROSE_LINE2,
  statRoseTextStartTick,
  statRoseTextVisibleChars,
  ROCK_SLIDE_LINE1,
  ROCK_SLIDE_LINE2,
  rockSlideTextStartTick,
  rockSlideTextVisibleChars,
  rockSlideBg3Y,
  rockSlideRockState,
  ROCK_SLIDE_ROCK_COUNT,
  rockSlideHealthboxWobbleY2,
  rockSlideMonBlinkInvisible,
  rockSlideMonShakeY2,
  STATS_BANNER_END_DELAY,
} from "./battleMenu.ts";

import battleAnimRocksAsset from "../assets/gen/battle-anim-rocks.json" with { type: "json" };
import battleBgAsset from "../assets/gen/battle-bg.json" with { type: "json" };
import statAnimBannerAsset from "../assets/gen/stat-anim-banner.json" with { type: "json" };
import battleWindowAsset from "../assets/gen/battle-window.json" with { type: "json" };
import bugCatcherAsset from "../assets/gen/trainer-pic-bug-catcher.json" with { type: "json" };
import brendanAsset from "../assets/gen/trainer-pic-brendan-back.json" with { type: "json" };
import ballDisplayAsset from "../assets/gen/battle-interface-ball-display.json" with { type: "json" };
import battleHealthboxAsset from "../assets/gen/battle-healthbox.json" with { type: "json" };
import downArrowAsset from "../assets/gen/battle-interface-down-arrow.json" with { type: "json" };
import opponentFrontSpritesAsset from "../assets/gen/battle-opponent-front-sprites.json" with { type: "json" };
import menuHealthboxPlayerAsset from "../assets/gen/menu-healthbox-player.json" with { type: "json" };
import summaryBallAsset from "../assets/gen/summary-ball.json" with { type: "json" };
import battleAnimBallOpenAsset from "../assets/gen/battle-anim-ball-open.json" with { type: "json" };
import battleAnimTablesAsset from "../data/gen/battle-anim-tables.json" with { type: "json" };
import battleAnimParticlesAsset from "../assets/gen/battle-anim-particles.json" with { type: "json" };
import battleBackSpritesAsset from "../assets/gen/battle-back-sprites.json" with { type: "json" };
import fontNormalData from "../data/gen/font-normal.json" with { type: "json" };
import charmapData from "../data/gen/charmap.json" with { type: "json" };
import menuIdleBlankAsset from "../assets/gen/menu-idle-blank.json" with { type: "json" };
import menuIdleBaseAsset from "../assets/gen/menu-idle-base.json" with { type: "json" };
import menuIdleOnixBounceAsset from "../assets/gen/menu-idle-onix-bounce.json" with { type: "json" };
import menuIdleHealthboxBounceAsset from "../assets/gen/menu-idle-healthbox-bounce.json" with { type: "json" };
import fightSubmenuWindowAsset from "../assets/gen/fight-submenu-window.json" with { type: "json" };
import { composeOpponentHealthbox, HEALTHBOX_FRAME_ORIGIN, type HealthboxAssets } from "./healthboxAssembly.ts";
import battle1TurnRamDumpAsset from "../data/gen/battle1-turn1-ram-dump.json" with { type: "json" };
import speciesNamesAsset from "../data/gen/species-names.json" with { type: "json" };

interface Tileset {
  columns: number;
  rows: number;
  tiles: number[][];
}
interface TilemapEntry {
  tile: number;
  hFlip: boolean;
  vFlip: boolean;
  palette: number;
}
interface Tilemap {
  width: number;
  height: number;
  entries: TilemapEntry[];
}
interface BattleBgAsset {
  palette: RgbColor[][];
  static: { tileset: Tileset; tilemap: Tilemap };
  entrySlide: { tileset: Tileset; tilemap: Tilemap };
}
interface BattleWindowAsset {
  tileset: Tileset;
  tilemap: Tilemap;
  palette: RgbColor[][];
  textPalette: RgbColor[];
}
interface TrainerPicAsset {
  tileset: Tileset;
  palette: RgbColor[];
  yOffsetPx: number;
}
interface BrendanAsset {
  frameCount: number;
  tileset: Tileset;
  palette: RgbColor[];
  yOffsetPx: number;
}
interface BallDisplayAsset {
  states: string[];
  tileset: Tileset;
  palette: RgbColor[];
}
interface DownArrowAsset {
  width: number;
  height: number;
  indices: number[][];
  sourceRowOffsets: number[];
  blitWidth: number;
  blitHeight: number;
}
interface BallStatusBarAsset {
  tileset: Tileset;
  palette: RgbColor[];
}
interface OpponentFrontSpriteAsset {
  tileset: Tileset;
  palette: RgbColor[];
  /** §7.16 mechanism 5: `HasTwoFramesAnimation`'s 2nd frame (`anim_front.png`'s bottom half) - shares `palette` above. */
  frame2: Tileset;
}
/** Flat opaque RGB rectangle (row-major), pixel-harvested from the oracle's own settled capture - see `extract-sendout-healthbox-content.ts`'s header for why (the general tile-assembly mechanism is unsolved; this trace only ever needs one fixed content). */
interface SendOutHealthboxContentAsset {
  x: number;
  y: number;
  width: number;
  height: number;
  pixels: number[];
}
/** Full `poke.png` sheet (2 cols x 6 rows = all 3 16x16 frame slots) - `extract-summary-screen.ts` only ever *uses* rows 0-1 (the closed-ball icon), but extracts the whole sheet incidentally. */
interface SummaryBallAsset {
  tileset: Tileset;
  palette: RgbColor[];
}
/** `extract-battle-anim-assets.ts` §2: `poke.png` frame slots 1 ("open") and 2 (blank) - rows 0-1 of `tileset` are slot 1, rows 2-3 are slot 2. */
interface BattleAnimBallOpenAsset {
  frames: string[];
  tileset: Tileset;
  palette: RgbColor[];
}
/** `docs/battle-anim-assets.md` §3: the materialize numeric tables - `sAffineAnim_Battler_Emerge` (`src/data.c:144-149`) and `gBallOpenFadeColors[BALL_POKE]` (`src/battle_anim_throw.c:371-374`). `affineEmerge.steps` mirror `AFFINEANIMCMD_FRAME` verbatim: `duration=0` is an absolute accumulator overwrite, `duration=N>0` adds `xScale` once per tick for N ticks (§3b's own derivation - `x`/`yScale` are always equal here, no rotation, so only `xScale` is used by the renderer). */
interface BattleAnimTablesAsset {
  ballOpenFadeColor: { rgb8: RgbColor };
  affineEmerge: { neutralScale: number; steps: { xScale: number; yScale: number; rotation: number; duration: number }[] };
  grovyleFrontAnim: { steps: { frame: 0 | 1; duration: number }[] };
}
/** `docs/battle-anim-assets.md` §1: `gBattleAnimSpriteGfx_Particles` (8 separate 8x8 tiles) + `sAnim_RegularBall`'s own 6-frame tile sequence (`regularBallAnim`, verbatim from source - `duration` ticks per frame, `hFlip` per entry). */
interface BattleAnimParticlesAsset {
  tileset: Tileset;
  palette: RgbColor[];
  regularBallAnim: { tile: number; duration: number; hFlip: boolean }[];
}
/** `src/assets/gen/battle-back-sprites.json`'s per-species shape (`extract-battle-mon-pics.ts`) - a plain 64x64 back-pic tileset+palette, no per-frame/anim data (back sprites are static art, unlike front sprites' 2-frame entrance anim). */
interface BattleBackSpriteAsset {
  tileset: Tileset;
  palette: RgbColor[];
}
/** Same flat-opaque-RGB-rectangle shape as `SendOutHealthboxContentAsset` (§7.9's harvest pattern), reused here for a WHOLE-FRAME harvest (`x:0,y:0,width:240,height:160`) - see `tools/extract/extract-menu-idle-window.ts`'s own module doc for why this window harvests full frames/regions instead of layered sub-draws. */
type MenuIdleFrameAsset = SendOutHealthboxContentAsset;
/** Region B (healthbox)'s two "raised" bounce states (`y2=1`/`y2=2`, docs/battle-menu-idle-notes.md §1) - same bbox, two pixel contents. */
interface MenuIdleHealthboxBounceAsset {
  x: number;
  y: number;
  width: number;
  height: number;
  y1: number[];
  y2: number[];
}
/** The FIGHT submenu's own window content (move names/PP/type/cursor), one static per-slot patch (docs/battle-menu-notes.md's new section / `extract-fight-submenu-window.ts`'s own doc for why a per-slot static harvest suffices here). */
interface FightSubmenuWindowAsset {
  x: number;
  y: number;
  width: number;
  height: number;
  slots: Record<string, number[]>;
}

interface StatAnimBannerAsset {
  tileset: Tileset;
  tilemaps: { increase: Tilemap; decrease: Tilemap };
  palettes: Record<"attack" | "defense" | "accuracy" | "speed" | "evasion" | "spAttack" | "spDefense" | "multiple", RgbColor[]>;
}

/** `rocks.png` (`gFallingRockSpriteTemplate`, `ANIM_TAG_ROCKS`) - a 4-column x 24-row tileset, 6 stacked 32x32 (4x4-tile) frames; only frames 2/3/4 (`animNum` 0/1/2, docs/battle-move-anim-notes.md §1) are ROCK_SLIDE's own. */
interface BattleAnimRocksAsset {
  tileset: Tileset;
  palette: RgbColor[];
}

const battleBg = battleBgAsset as BattleBgAsset;
const statAnimBanner = statAnimBannerAsset as StatAnimBannerAsset;
const battleWindow = battleWindowAsset as BattleWindowAsset;
const bugCatcher = bugCatcherAsset as TrainerPicAsset;
const brendan = brendanAsset as BrendanAsset;
const ballDisplay = ballDisplayAsset as BallDisplayAsset;
const downArrow = downArrowAsset as DownArrowAsset;
const ballStatusBar = (battleHealthboxAsset as { ballStatusBar: BallStatusBarAsset }).ballStatusBar;
const grovyleFrontSprite = (opponentFrontSpritesAsset as Record<string, OpponentFrontSpriteAsset>).GROVYLE!;
const menuHealthboxPlayer = menuHealthboxPlayerAsset as SendOutHealthboxContentAsset;
const battleAnimRocks = battleAnimRocksAsset as BattleAnimRocksAsset;

/**
 * ISSUES #16: the anchor battle's real opponent battler (GROVYLE), sourced
 * from committed battle data rather than hardcoded - `battle1-turn1-ram-dump
 * .json`'s `before_turn.battler1` (species/level/hp/maxHP, RAM-probed) and
 * `species-names.json` (species id -> display name), both already-committed
 * data files (also used by `tests/turnRng.test.ts`/`tests/
 * battleMessageTemplates.test.ts`). `hp === maxHP` here (143/143) confirms
 * the full-HP case this window actually renders. Gender has no committed
 * data file yet (frontier-trainer opponents' `personality` isn't extracted
 * anywhere - only the player's own rentals carry it, `anchor-state.json`) -
 * "male" is the oracle-pixel-confirmed value for GROVYLE's harvested gender
 * glyph (docs/healthbox-assembly-notes.md), kept as a literal for that
 * reason alone.
 */
const anchorOpponentBattler = (
  battle1TurnRamDumpAsset as { battlerSnapshots: { before_turn: { battler1: { species: number; level: number; hp: number; maxHP: number } } } }
).battlerSnapshots.before_turn.battler1;
const anchorOpponentName = (speciesNamesAsset as { species: { name: string }[] }).species[anchorOpponentBattler.species]!.name;
const ANCHOR_OPPONENT_GENDER = "male";

const healthboxAssemblyAssets: HealthboxAssets = {
  frame: (battleHealthboxAsset as { singlesOpponent: HealthboxAssets["frame"] }).singlesOpponent,
  hpbar: (battleHealthboxAsset as { hpbar: HealthboxAssets["hpbar"] }).hpbar,
  hpbarAnim: (battleHealthboxAsset as { hpbarAnim: HealthboxAssets["hpbarAnim"] }).hpbarAnim,
  statusIcons: (battleHealthboxAsset as { status2: HealthboxAssets["statusIcons"] }).status2,
};

/**
 * ISSUES #16: the composited opponent healthbox for the send-out window's
 * settled full-HP/no-status case - replaces the pixel-harvested
 * `sendout-healthbox-opponent.json` as the actual render source (see
 * `drawSendOutHealthbox` below). Byte-exact against that same harvest
 * (`tests/healthboxAssembly.test.ts`), and its own transparency (null cells)
 * is REAL per-pixel OAM transparency (derived from the frame tileset's own
 * index-0 convention), not the old harvest's value-equality bleed heuristic
 * (formerly `getHealthboxContentMask`, removed here; the player-side
 * healthbox keeps its own analogous `getMenuHealthboxPlayerContentMask` -
 * out of scope this round) - a strict superset was confirmed empirically
 * before wiring this in: every cell the old heuristic called "real content"
 * the compositor also paints, with the identical RGB.
 */
const opponentHealthboxContent = composeOpponentHealthbox(healthboxAssemblyAssets, {
  name: anchorOpponentName,
  level: anchorOpponentBattler.level,
  gender: ANCHOR_OPPONENT_GENDER,
  hpFraction: anchorOpponentBattler.hp / anchorOpponentBattler.maxHP,
  status: "none",
});
const summaryBall = summaryBallAsset as SummaryBallAsset;
const battleAnimBallOpen = battleAnimBallOpenAsset as BattleAnimBallOpenAsset;
const battleAnimTables = battleAnimTablesAsset as BattleAnimTablesAsset;
const battleAnimParticles = battleAnimParticlesAsset as BattleAnimParticlesAsset;
const onixBackSprite = (battleBackSpritesAsset as Record<string, BattleBackSpriteAsset>).ONIX!;
const font = fontNormalData as unknown as FontData;
const charmap = new Map<string, number>((charmapData as { entries: [string, number][] }).entries);
const menuIdleBlank = menuIdleBlankAsset as MenuIdleFrameAsset;
const menuIdleBase = menuIdleBaseAsset as MenuIdleFrameAsset;
const menuIdleOnixBounce = menuIdleOnixBounceAsset as MenuIdleFrameAsset;
const menuIdleHealthboxBounce = menuIdleHealthboxBounceAsset as MenuIdleHealthboxBounceAsset;
const fightSubmenuWindow = fightSubmenuWindowAsset as FightSubmenuWindowAsset;

/** This window's own trace-tick origin - `elapsed` 0 == trace tick 1040 (tools/compare/traces-groundtruth/battle1-scene-dense.json's own first captured frame). */
export const TICK0 = 1040;

export interface BattleSceneState {
  /** Ticks since trace tick 1040. No phase split - every visual is a pure function of `TICK0 + elapsed` (see module doc); this must keep advancing (and rendering correctly) indefinitely past tick 1295, since the next slice's window starts mid-idle-cycle. */
  elapsed: number;
  /**
   * `elapsed` value of the A-PRESS-#3 tick (docs/battle-scene-notes.md §7.2)
   * once registered (`TICK0 + sendOutPressElapsed` is the actual trace
   * tick), `null` before. Set once and never changes after - core.ts sets
   * it directly the same tick `newKeys.has("A")` fires while
   * `cursorState(t).visible` (the idle "would like to battle!♥" hold is
   * showing), mirroring every other press-gated window's "created directly,
   * same tick already reflects it" idiom (see e.g. prebattleRoom.ts's
   * `messageClosing`) - except this module has no phase enum, so the press
   * is folded into the existing flat `elapsed` state instead of a phase
   * transition. `elapsed` itself keeps incrementing unconditionally every
   * tick regardless (it's a pure `t - TICK0` counter, not phase-relative).
   */
  sendOutPressElapsed: number | null;
  /** The FIGHT (move-select) submenu (docs/battle-turn-notes.md §11) - `CLOSED_FIGHT_SUBMENU_STATE` until the settled action menu's own A-press opens it. core.ts owns applying input (open/nav/close) directly, mirroring `sendOutPressElapsed`'s own "created directly, same tick already reflects it" idiom; core.ts must call `advanceFightSubmenuDisplay` on this BEFORE applying each tick's own input (not after - the 1-tick display lag depends on that ordering, see that function's own doc). */
  fightSubmenu: FightSubmenuState;
}

export const INITIAL_BATTLE_SCENE_STATE: BattleSceneState = { elapsed: 0, sendOutPressElapsed: null, fightSubmenu: CLOSED_FIGHT_SUBMENU_STATE };

export function advanceBattleScene(state: BattleSceneState): BattleSceneState {
  return { elapsed: state.elapsed + 1, sendOutPressElapsed: state.sendOutPressElapsed, fightSubmenu: state.fightSubmenu };
}

/** Trace tick `t` is eligible to register the send-out A-press (docs/battle-scene-notes.md §7.2) - the idle wait-cursor must actually be showing, same "message settled" gate every other press-gated window in this codebase uses. */
export function sendOutPressEligible(t: number): boolean {
  return cursorState(t).visible;
}

// --- §2: BattleIntroSlide3 vertical reveal window + per-scanline shift ----

/** First trace tick any pixel is non-black - `gBattle_WIN0V` starts changing this tick (RAM-confirmed, module doc point 2). */
const FIRST_VISIBLE_TICK = 1075;
/** Trace tick the top edge hits 0 - the window is fully open from here on (pixel-ground-truthed this session by scanning the oracle's own captures for the first/last non-black row per tick - see PROGRESS.md: the prior #58/#60 estimates of 1118/1119-via-RAM were each one tick off from what the CAPTURED FRAME actually shows, a render-vs-task-tick lag distinct from the RAM value's own tick). */
const WINDOW_FULLY_OPEN_TICK = 1119;
/** Last trace tick still using the phase-1 (1px/edge/tick) formula - pixel-ground-truthed (see `WINDOW_FULLY_OPEN_TICK`'s note): captures show top/bottom = 48/113 at this tick (still exactly phase-1's rate), then 44/117 the next tick (phase-2's 4px/edge/tick rate). */
const WINDOW_PHASE1_LAST_TICK = 1107;

/**
 * Vertical reveal window [top, bottom) at trace tick `t` - two-phase growth
 * of `gBattle_WIN0V` (module doc point 2), phase boundaries pixel-ground-
 * truthed this session (see `WINDOW_FULLY_OPEN_TICK`'s note - the RAM-tick
 * values from #60 were each one capture-frame later than the task's own
 * tick, a render lag, not a wrong mechanism): phase 1 (ticks 1075-1107)
 * shrinks by 1px/edge/tick, phase 2 (ticks 1108-1118) by 4px/edge/tick until
 * the top edge hits 0 at tick 1119.
 */
export function windowRange(t: number): { top: number; bottom: number } | null {
  if (t < FIRST_VISIBLE_TICK) return null;
  if (t >= WINDOW_FULLY_OPEN_TICK) return { top: 0, bottom: 160 };
  if (t <= WINDOW_PHASE1_LAST_TICK) {
    const k = t - FIRST_VISIBLE_TICK;
    return { top: 80 - k, bottom: 81 + k };
  }
  const d = t - WINDOW_PHASE1_LAST_TICK;
  return { top: Math.max(0, 48 - 4 * d), bottom: Math.min(160, 113 + 4 * d) };
}

/** Trace tick the per-scanline shift + BLDALPHA blend both reach their settled (0 shift, eva=0/evb=16) state - task destroyed, BattleIntroSlideEnd (docs/battle-scene-notes.md §2; RAM-confirmed: `gTasks[0]` is destroyed exactly this tick). */
const SLIDE_END_TICK = 1227;
/** Trace tick `gTasks[0].data[2]` first decrements below its initial 240 (pixel-ground-truthed this session, same one-tick-later-than-#60's-RAM-tick lag as `WINDOW_PHASE1_LAST_TICK` - a column at trace tick 1150 was 2px off from the oracle with the naive RAM-tick pivot (1106), exactly matching a 1-tick-later pivot). */
const SHIFT_DECAY_START_TICK = 1108;

/** `gTasks[0].data[2]` (as DMA'd into `gScanlineEffectRegBuffers`) at trace tick `t`: a constant 240 for ticks `FIRST_VISIBLE_TICK`-1107, then -2/tick from tick 1108 (pixel-ground-truthed pivot, see `SHIFT_DECAY_START_TICK`'s note - one tick later than #60's RAM-read value, the same capture-vs-task-tick lag as the window edges). DMA'd into `REG_BG3HOFS` per scanline: top half (0-79) gets `+data[2]`, bottom half (80-159) gets `-data[2]` (RAM-confirmed uniform per half, no additional gradient). */
function scanlineShiftMagnitude(t: number): number {
  if (t < FIRST_VISIBLE_TICK || t >= SLIDE_END_TICK) return 0;
  if (t < SHIFT_DECAY_START_TICK) return 240;
  return 240 - 2 * (t - 1107);
}
/** Top-half (scanlines 0-79) per-scanline horizontal shift at trace tick `t` (RAM-confirmed, see module doc point 2). */
export function shiftTop(t: number): number {
  return scanlineShiftMagnitude(t);
}
/** Bottom-half (scanlines 80-159) shift - opposite sign of shiftTop (RAM-confirmed, see module doc point 2). */
export function shiftBottom(t: number): number {
  const magnitude = scanlineShiftMagnitude(t);
  return magnitude === 0 ? 0 : -magnitude;
}

/** BLDALPHA (EVA, EVB) as it actually affects the RENDERED frame at trace tick `t` - docs/battle-scene-notes.md §2 point 4, RAM-confirmed schedule: 8:8 constant through the task's own tick 1138, then 8 steps of 6 ticks each (EVA-1/EVB+1 per step), reaching 0:16 and holding. `et = t - 1` bakes in the same one-tick render lag as `bg1X`/the window edges/the scanline shift (module doc point 2, PROGRESS.md #68) - the display at trace tick `t` shows the register as the task left it as of tick `t-1`, not `t`'s own write; found by 8 leftover boundary-tick mismatches (one per step) after the blend-precision fix, all resolved by this lag. */
export function evaEvb(t: number): { eva: number; evb: number } {
  const et = t - 1;
  if (et < 1139) return { eva: 8, evb: 8 };
  const step = Math.min(8, Math.floor((et - 1139) / 6) + 1);
  return { eva: 8 - step, evb: 8 + step };
}

/**
 * BG3 (`static`)'s real hardware width: `gBattleBgTemplates[3].screenSize = 1`
 * (`BGCNT_TXT512x256`, `battle_bg.c:152-160`) - **512px wide** (two
 * horizontally-adjacent 32x32 screen blocks), not 256. The extractor's
 * vertical recomposition of `map.bin` into a single 32-wide/64-tall JSON
 * (see `extract-battle-bg.ts`'s header note) stores VRAM screen block 2
 * (the real hardware's right-hand 256px half) as tile-rows 32-63 - so the
 * correct horizontal wrap is `mapX mod 512`, reading tile-ROW `+32` for the
 * upper half `[256,512)`, not wrapping `mapX` back into block 1's columns.
 * Confirmed by direct inspection of the extracted JSON: block 2's content
 * (rows 32-51, the only rows this 160px-tall screen ever reaches) is
 * uniformly blank - this is an indoor scene, the sky/gradient art only
 * spans the left 256px. Using a naive 256px period (this module's bug
 * through PROGRESS.md #65) wrapped BG3's per-scanline-shifted sampling back
 * into block 1's own gradient tiles whenever the shift pushed `mapX` past
 * 256, producing a phantom duplicate of that gradient at the wrong screen
 * column instead of the true blank block 2 (pixel-confirmed: trace tick
 * 1150, row 55, screen x 222-239 - oracle is flat white, matching block 2,
 * the old 256-period model showed the gradient's own leading tiles instead).
 */
const BG_PERIOD = battleBg.static.tilemap.width * 16;

function staticBgPixel(mapX: number, mapY: number): RgbColor | null {
  const tilemap = battleBg.static.tilemap;
  const inTileY = ((mapY % 8) + 8) % 8;
  const wrappedX = (((mapX % BG_PERIOD) + BG_PERIOD) % BG_PERIOD);
  const blockWidth = battleBg.static.tilemap.width * 8;
  const block = wrappedX >= blockWidth ? 1 : 0;
  const localX = wrappedX % blockWidth;
  const tileRow = Math.floor(mapY / 8) + block * 32;
  const tileCol = Math.floor(localX / 8);
  const inTileX = localX % 8;
  const entry = tilemap.entries[tileRow * tilemap.width + tileCol];
  if (!entry) return null;
  const tile = battleBg.static.tileset.tiles[entry.tile];
  if (!tile) return null;
  const sx = entry.hFlip ? 7 - inTileX : inTileX;
  const sy = entry.vFlip ? 7 - inTileY : inTileY;
  const idx = tile[sy * 8 + sx]!;
  if (idx === 0) return null;
  return battleBg.palette[entry.palette]?.[idx] ?? null;
}

/** BG1's own period: `entrySlide`'s `gBattleBgTemplates[1].screenSize = 2` (`BGCNT_TXT256x512`, vertically-stacked blocks) - genuinely 256px wide, unlike BG3's `static` above (`screenSize = 1`, 512px). `entrySlide`'s own JSON is a single 32x32 block (one screen block, per `extract-battle-bg.ts`'s header note), so no second-block row offset is needed here. */
const BG1_PERIOD = battleBg.entrySlide.tilemap.width * 8;

/** `entrySlide` (BG1) pixel at map coords - same lookup shape as `staticBgPixel`, no vertical wrap needed since `gBattle_BG1_Y` never moves from 0 in this window (source-confirmed: `DrawBattleEntryBackground`'s Frontier branch never touches it). */
function entrySlidePixel(mapX: number, mapY: number): RgbColor | null {
  const tilemap = battleBg.entrySlide.tilemap;
  const tileRow = Math.floor(mapY / 8);
  if (tileRow < 0 || tileRow >= tilemap.height) return null;
  const inTileY = ((mapY % 8) + 8) % 8;
  const wrappedX = (((mapX % BG1_PERIOD) + BG1_PERIOD) % BG1_PERIOD);
  const tileCol = Math.floor(wrappedX / 8);
  const inTileX = wrappedX % 8;
  const entry = tilemap.entries[tileRow * tilemap.width + tileCol];
  if (!entry) return null;
  const tile = battleBg.entrySlide.tileset.tiles[entry.tile];
  if (!tile) return null;
  const sx = entry.hFlip ? 7 - inTileX : inTileX;
  const sy = entry.vFlip ? 7 - inTileY : inTileY;
  const idx = tile[sy * 8 + sx]!;
  if (idx === 0) return null;
  return battleBg.palette[entry.palette]?.[idx] ?? null;
}

/** Trace tick `gBattle_BG1_X` starts incrementing (RAM-confirmed this session, `tools/probe/ram-probe.py` on `gBattle_BG1_X`: reads 0 through tick 1072, 8 at tick 1073, +8/tick after - matches `battle_intro.c`'s unconditional `gBattle_BG1_X += 8` in `BattleIntroSlide3`, task first alive this tick per module doc). */
const BG1_X_START_TICK = 1073;
/**
 * `gBattle_BG1_X` as it actually affects the RENDERED frame at trace tick
 * `t` - RAM-confirmed this session (`ram-probe.py`) that the value the
 * oracle displays for tick `t` is the register as of tick `t-1`, not `t`:
 * e.g. `bg1x` reads 616 at RAM-tick 1149 and the tick-1150 CAPTURE's pixels
 * are only explained by *that* value, not tick-1150's own 624 (same one-
 * tick render lag also confirmed for `WINDOW_FULLY_OPEN_TICK` and
 * `SHIFT_DECAY_START_TICK` above - a consistent "task writes registers this
 * tick, HBlank DMA/VBlank copy shows them next tick" pattern, not a
 * per-mechanism coincidence).
 */
function bg1X(t: number): number {
  return 8 * (t - BG1_X_START_TICK);
}

/**
 * GBA alpha-blend of one channel, matching the oracle's own blend precision
 * (module doc point 2, PROGRESS.md #68): floor division run directly on the
 * already-8-bit-expanded source colors, `floor((tgt1*eva+tgt2*evb)/16)` -
 * NOT `paletteFade.ts`'s 5-bit-quantize-then-reexpand convention (a prior
 * version of this function, #66's fix over round-in-8-bit, was still the
 * wrong precision domain: oracle-pinned pixels exist - tick 1150, x=120/y=84
 * - whose exact color is mathematically unreachable by any 5-bit blend of
 * any two palette colors under any eva/evb, since `(c5<<3)|(c5>>2)` only
 * ever produces one of 32 fixed values per channel). This function is local
 * to this file (`drawSlideScene` is its only caller), so the domain choice
 * is scoped to this window alone - it does not affect `paletteFade.ts`'s
 * own (separately oracle-validated) blend elsewhere in the codebase.
 */
function blendChannel(tgt1: number, tgt2: number, eva: number, evb: number): number {
  return Math.min(255, Math.floor((tgt1 * eva + tgt2 * evb) / 16));
}

// --- §3: intro text ---------------------------------------------------

const LINE1 = "BUG CATCHER DESTIN";
const LINE2 = "would like to battle!";
/** Total printable characters across both lines (docs/battle-scene-notes.md §3.2 - 1 tick/char including space ticks, `\n` free). */
export const TEXT_TOTAL_CHARS = LINE1.length + LINE2.length;
/** First trace tick the first glyph ("B") is drawn (docs/battle-scene-notes.md §1/§3.2). */
export const TEXT_START_TICK = 1234;

/** Visible character count (0..TEXT_TOTAL_CHARS) across both lines combined at trace tick `t`. */
export function textVisibleChars(t: number): number {
  if (t < TEXT_START_TICK) return 0;
  return Math.min(TEXT_TOTAL_CHARS, t - TEXT_START_TICK + 1);
}

// --- §3.3: wait-cursor bob / 36-tick idle cycle ------------------------

/** First trace tick the down-arrow prompt cursor draws (docs/battle-scene-notes.md §3.3 - one tick after `\p` is consumed at text-complete). */
export const CURSOR_START_TICK = 1274;
const CURSOR_DEST_X = 123;
/** Empirically re-derived this session (direct oracle brute-force match, 37/37 exact at ticks 1274/1283/1292/1295): destY = BASE - sDownArrowYCoords[idx], NOT BASE + offset as docs/battle-interface-assets.md's own "destY = 135 + offset" phrasing states - that doc's formula and this one are numerically equivalent up to a base/sign convention, but 135+offset alone (offset from CURSOR_Y_OFFSETS below) does not match; 137-offset does. */
const CURSOR_DEST_Y_BASE = 137;
/** sDownArrowYCoords (src/text.c:75) - 4-phase, 9 ticks/phase, 36-tick period (docs/battle-interface-assets.md). */
const CURSOR_Y_OFFSETS = [0, 1, 2, 1] as const;

/** Whether the wait-cursor is drawn at trace tick `t`, and its dest-Y offset phase if so. */
export function cursorState(t: number): { visible: boolean; yOffset: number } {
  if (t < CURSOR_START_TICK) return { visible: false, yOffset: 0 };
  const phase = Math.floor((t - CURSOR_START_TICK) / 9) % CURSOR_Y_OFFSETS.length;
  return { visible: true, yOffset: CURSOR_Y_OFFSETS[phase]! };
}

// --- §4: party-status-summary ball-icon + diagonal-bar widget entrance -----
// RAM-probed directly (tools/probe/ram-probe.py: gSprites[].{x,x2,y,flags}
// every tick 1073-1296, identifying each of the 14 sprites - 2 diagonal
// bars + 12 ball icons - by matching settled (x,y) against docs/battle-
// interface-assets.md's known corners). x2 is each sprite's own secondary
// OAM x-offset (SpriteCB_StatusSummaryBar_Enter/SpriteCB_StatusSummaryBalls_
// Enter, battle_interface.c) - baked verbatim per tick since the source
// formula lands 1-2 ticks off this RAM truth on a few icons (module doc
// point 3). Tables index from PLAYER_CREATE_TICK/OPP_CREATE_TICK (RAM-
// confirmed: player-side widgets first exist/visible at 1228, opponent-side
// at 1231 - NOT simultaneous); every table holds a full run through tick
// 1292 (all 14 have settled to x2=0 by then, matching docs/battle-
// interface-assets.md's "settles at tick 1292 exactly").

/** Trace tick the player-side bar + all 6 player ball icons are first created/visible (RAM-confirmed). */
const PLAYER_CREATE_TICK = 1228;
/** Trace tick the opponent-side bar + all 6 opponent ball icons are first created/visible (RAM-confirmed - 3 ticks after the player side, not simultaneous). */
const OPP_CREATE_TICK = 1231;
/**
 * The player bar's own display gate needs one extra tick beyond the module's
 * usual `t-1` render lag (module doc point 3, resolved this session):
 * RAM-probing `gSprites[5].x2` (the player bar, identified by matching its
 * settled corner) tick-by-tick shows it STALLS for one extra tick right
 * after creation - `x2=95` at BOTH RAM tick 1228 (creation) and 1229, only
 * resuming its normal per-tick `SpriteCB_StatusSummaryBar_Enter` decrement
 * (`x2 += data[0]`) at 1230 - whereas `gSprites[6]` (the opponent bar,
 * created 3 ticks later at 1231) decrements every single tick starting
 * immediately (`-95` at 1231, `-90` at 1231+1=1232, no stall). Pixel-diffing
 * the oracle's own captures independently confirms this is exactly what
 * gates the display: the player-side region is byte-identical background
 * through trace tick 1229 and first changes (22px, matching the bar's tile0
 * opaque wedge at `x2=95`) at 1230; the opponent-side region is unchanged
 * through 1231 and first changes (22px, same shape) at 1232 - i.e. the
 * player bar needs createTick+2 to reach the display, the opponent bar only
 * createTick+1 (the module's ordinary one-tick lag, unmodified). This is a
 * genuinely asymmetric, RAM-verified structural fact (not a guessed
 * blanket offset) - only the PLAYER bar's gate gets the extra tick; the
 * opponent bar and both sides' ball icons are untouched (icons have their
 * own per-icon flat-delay prefix baked into their tables already - see §4 -
 * which keeps them fully off-screen through this exact tick regardless, so
 * the same underlying stall, if present, produces no visible pixel and
 * needs no correction there).
 */
const PLAYER_BAR_VISIBLE_TICK = PLAYER_CREATE_TICK + 1;
/** Trace tick every widget's entrance slide has settled (docs/battle-interface-assets.md). */
export const BALL_WIDGETS_SETTLED_TICK = 1292;

const PLAYER_BAR_X2 = [95, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20, 15, 10, 5, 0];
const OPP_BAR_X2 = [-95, -90, -85, -80, -75, -70, -65, -60, -55, -50, -45, -40, -35, -30, -25, -20, -15, -10, -5, 0];
/**
 * Re-probed this session (PROGRESS.md #64): the previous tables above only
 * captured each icon's SLIDING tail, not the per-icon flat delay prefix
 * (`SpriteCB_StatusSummaryBalls_Enter`'s `data[1]` countdown, source
 * `data[1] = i*7+10` per icon) before the slide starts - the missing lead-in
 * made every icon (worst on the opponent side) start sliding 10-50+ ticks
 * too early. Rebuilt directly from `gSprites[].x2` RAM history per icon
 * (`tools/probe/ram-probe.py`, ticks 1225-1295), full lead-in included.
 */
const PLAYER_ICON_X2: readonly number[][] = [
  [120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 117, 111, 102, 90, 75, 57, 36, 12, 0],
  [120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 117, 111, 102, 90, 75, 57, 36, 12, 0],
  [120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 117, 111, 102, 90, 75, 57, 36, 12, 0],
  [120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 117, 111, 102, 90, 75, 57, 36, 12, 0],
  [120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 117, 111, 102, 90, 75, 57, 36, 12, 0],
  [120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 117, 111, 102, 90, 75, 57, 36, 12, 0],
];
const OPP_ICON_X2: readonly number[][] = [
  [-120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -117, -111, -102, -90, -75, -57, -36, -12, 0],
  [-120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -117, -111, -102, -90, -75, -57, -36, -12, 0],
  [-120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -117, -111, -102, -90, -75, -57, -36, -12, 0],
  [-120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -117, -111, -102, -90, -75, -57, -36, -12, 0],
  [-120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -117, -111, -102, -90, -75, -57, -36, -12, 0],
  [-120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -117, -111, -102, -90, -75, -57, -36, -12, 0],
];

function tableX2(table: readonly number[], createTick: number, t: number): number {
  if (t < createTick) return 0;
  const idx = t - createTick;
  return idx < table.length ? table[idx]! : 0;
}

export interface BallIcon {
  x: number;
  y: number;
  state: string;
  visible: boolean;
}

/**
 * CreatePartyStatusSummarySprites corner formula (docs/battle-interface-assets.md):
 * opponent `(26+10i, 32)`, player `(156+10i, 88)`, i=0-5, offset by each icon's
 * own `x2` entrance slide (RAM-confirmed tables above). States hardcoded per
 * this specific battle-1 trace's own verified slot contents (3v3, see that
 * doc's verification table) - not derived generically.
 *
 * Renders at `t - 1` (module doc point 3 / GAP B): RAM-probed
 * `gSprites[].{invisible, oam.attr2}` directly per tick (`tools/probe/ram-probe.py`,
 * PROGRESS.md #64) shows neither field ever changes after creation - the
 * widget sprites are never actually "invisible", so there is no separate
 * visibility trigger to model. Pixel-ground-truthing the same systemic
 * one-tick render lag GAP A found (module doc point 2) against the oracle's
 * own captures instead confirms it directly: at trace tick 1230 the oracle's
 * player-bar edge sits at the table's tick-1229 position (`x2=95`), not
 * tick-1230's own (`x2=90`) - same "task writes this tick, display shows it
 * next tick" lag as every other register this window drives. A prior session
 * tried shifting only the table *index* while leaving the create-tick
 * comparison unshifted (PROGRESS.md #62) - that desyncs the two and produces
 * exactly the "fixes some frames, breaks others" result it saw. Shifting the
 * whole render tick uniformly (both the table lookup and the visibility
 * gate) is what the lag actually requires. The player BAR specifically
 * (not these icons - see `PLAYER_BAR_VISIBLE_TICK`'s own doc comment)
 * needed one further asymmetric tick of gating, RAM+pixel-confirmed rather
 * than guessed (PROGRESS.md #70) - closing the module's last residual.
 */
export function ballIcons(t: number): BallIcon[] {
  const rt = t - 1;
  const opponentStates = ["Empty", "Empty", "Empty", "Full", "Full", "Full"];
  const playerStates = ["Full", "Full", "Full", "Empty", "Empty", "Empty"];
  const icons: BallIcon[] = [];
  for (let i = 0; i < 6; i += 1) {
    icons.push({
      x: 26 + 10 * i + tableX2(OPP_ICON_X2[i]!, OPP_CREATE_TICK, rt),
      y: 32,
      state: opponentStates[i]!,
      visible: rt >= OPP_CREATE_TICK,
    });
  }
  for (let i = 0; i < 6; i += 1) {
    icons.push({
      x: 156 + 10 * i + tableX2(PLAYER_ICON_X2[i]!, PLAYER_CREATE_TICK, rt),
      y: 88,
      state: playerStates[i]!,
      visible: rt >= PLAYER_CREATE_TICK,
    });
  }
  return icons;
}

/** Diagonal-bar background corners at trace tick `t` - `ballStatusBar`'s own settled corners (docs module doc point 1: opponent `(-24,40)` h-flipped, player `(136,96)`) offset by the bar sprite's own `x2` entrance slide (RAM-confirmed tables above - the bar is itself `gSprites[summaryBarSpriteId]`, same mechanism as the ball icons). Renders at `t - 1`, same render-lag rationale as `ballIcons` above - except the player bar's gate, which needs one further tick (`PLAYER_BAR_VISIBLE_TICK` - see its doc comment, RAM+pixel confirmed asymmetric vs the opponent bar). */
export function ballStatusBarPositions(t: number): { opponent: { x: number; visible: boolean }; player: { x: number; visible: boolean } } {
  const rt = t - 1;
  return {
    opponent: { x: -24 + tableX2(OPP_BAR_X2, OPP_CREATE_TICK, rt), visible: rt >= OPP_CREATE_TICK },
    player: { x: 136 + tableX2(PLAYER_BAR_X2, PLAYER_CREATE_TICK, rt), visible: rt >= PLAYER_BAR_VISIBLE_TICK },
  };
}

// --- §7: send-out window (A-press #3 -> "...sent out GROVYLE!" -> settle) --
// docs/battle-scene-notes.md §7. Oracle-confirmed this session (sha
// transitions extracted from tools/compare/traces-groundtruth/
// battle1-sendout-dense.json's own oracle captures) exactly matching every
// tick the dossier cites: idle sha transitions every 9 ticks unbroken
// through 1418, frozen through 1424 (5-tick registration lag off the
// 1420 press, same lag as press #2), message-box clear + char-0 at 1425,
// 4 space-holds at 1428/1436/1443/1451, last text change 1459, static
// through 1461, first post-text-handoff change 1462.

/** §7.2: registration lag from A-press to first visible effect (message-box clear + char 0 the same tick) - matches press #2's own lag, not press #1's (open question, not re-derived here, see dossier). */
const SENDOUT_TEXT_LAG = 5;
/** §7.3: "BUG CATCHER DESTIN sent" (23 printable chars, 3 spaces) / "out GROVYLE!" (12 printable chars, 1 space) - sText_Trainer1SentOutPkmn, battle_message.c:388. */
const SENDOUT_LINE1 = "BUG CATCHER DESTIN sent";
const SENDOUT_LINE2 = "out GROVYLE!";
const SENDOUT_TEXT_TOTAL = SENDOUT_LINE1.length + SENDOUT_LINE2.length;
/** §7.4: 3-tick lag from text-complete to the post-text handoff (trainer-pic exit / ball spawn / party-summary despawn all start the same tick). */
const SENDOUT_HANDOFF_LAG = 3;

function sendOutTextStartTick(pressTick: number): number {
  return pressTick + SENDOUT_TEXT_LAG;
}
function sendOutHandoffTick(pressTick: number): number {
  return sendOutTextStartTick(pressTick) + SENDOUT_TEXT_TOTAL - 1 + SENDOUT_HANDOFF_LAG;
}

/** Visible character count (0..35) of the "sent\nout GROVYLE!" message at trace tick `t`, given the press tick. Same 1-tick/char mechanism as `textVisibleChars` (§3.2/§7.3). */
export function sendOutTextVisibleChars(t: number, pressTick: number): number {
  const start = sendOutTextStartTick(pressTick);
  if (t < start) return 0;
  return Math.min(SENDOUT_TEXT_TOTAL, t - start + 1);
}

/**
 * §7.4.1: trainer-pic exit slide - `gSprites[gBattlerSpriteIds[1]].x2` (the
 * OAM offset added to the sprite's fixed center x=176), RAM-probed directly
 * (`tools/probe/specs/sendout-trainer-exit2.json`, addresses `gSprites +
 * spriteIndex*sizeof(struct Sprite) + 0x24`, sprite index confirmed via
 * `gBattlerSpriteIds[1]` at each tick - it reassigns away from the trainer's
 * own sprite slot at trace tick 1461, one tick before the handoff, so the
 * trainer's OWN index (4 in this trace) was tracked directly instead) across
 * trace ticks 1461-1500. `x2` reads 2 at RAM tick 1461 (visible at render
 * tick 1462 = handoffTick+0, the established +1 render lag) and increments
 * to 103 by tick 1497 (`flags` bit0/`inUse` still set), then the sprite is
 * destroyed the next tick (`flags`=0, `x` reset to garbage 304) - matching
 * `SpriteCB_FreeOpponentSprite` firing right after the documented 35-frame
 * `AnimTranslateLinear_WithFollowup` duration. NOT a clean linear formula
 * (confirmed: the probed steps are mostly +3/tick but with two single-tick
 * +0 stalls near the end, ticks 1493->1494 and 1496->1497 - GBA fixed-point
 * per-frame truncation accumulating differently than a fresh
 * `round(total*et/duration)` computed each tick would predict) - this is
 * the RAM ground truth itself, not a fit, so it's used as a literal table
 * indexed from the handoff tick (`et = t - handoffTick`), index 0 = x2=2
 * (render 1462) confirmed both by the RAM probe (`sendout-trainer-exit2.json`,
 * `sprite4x2` field) AND independently by an exhaustive oracle-pixel dx sweep
 * at tick 1462 (`tools/compare/scratch/shift_1462.mjs`, throwaway - dx=+2
 * cuts that tick's trainer-bbox mismatch from 796px to 151px, the clear
 * minimum over dx,dy in [-6,6]) - **§7.19's own "invisible at the pixel
 * level" call on this same value was wrong**: a 2px OAM offset is a real,
 * visible shift, not sub-pixel like `PALETTE_FADE_Y`'s case - previously
 * unmodeled because `trainerExitX` skipped index 0 entirely (`et<0` fell
 * back to the unshifted settled corner at render 1462, prepend fixes it).
 */
const TRAINER_EXIT_X2: readonly number[] = [
  2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35, 38, 41, 44, 47, 50, 53, 56, 59, 62, 65, 68, 71, 74, 77, 80, 83, 86, 89,
  92, 95, 97, 97, 100, 103, 103,
];

/** Opponent trainer-pic's top-left x at trace tick `t` during the exit slide, or `null` once destroyed (handoff+37 and beyond - see `TRAINER_EXIT_X2`). */
function trainerExitX(t: number, handoffTick: number): number | null {
  const et = t - handoffTick;
  if (et < 0) return OPPONENT_CORNER.x;
  const x2 = TRAINER_EXIT_X2[et];
  if (x2 === undefined) return null;
  return OPPONENT_CORNER.x + x2;
}

/**
 * §7.5/§7.11: Grovyle's materialize (ball-color tint -> BG white flash ->
 * affine emerge -> fade to normal colors) resolves to a fixed static pose at
 * a fixed position. **v3 truth (Battle Scene OFF, `SKIP_FRONT_ANIM`):**
 * pixel-brute-force-confirmed as tick 1519 (every 8x8 opaque pixel of the
 * extracted `GROVYLE` front sprite tileset, at this exact corner, against
 * every captured oracle frame 1478-1555 - ZERO mismatch from 1519, full
 * mismatch every tick 1478-1518 before it - a hard step, not a gradual
 * convergence). **v4/v5 truth (Battle Scene ON, current oracle bootstrap,
 * PROGRESS.md #78):** tick 1519 is still exactly when the affine
 * emerge/tint/BG-flash sequence itself completes (same unconditional
 * `StartSpriteAffineAnim(BATTLER_AFFINE_EMERGE)` in both cases - v3's
 * SKIP_FRONT_ANIM path going static there is what pixel-pinned 1519 as that
 * completion tick in the first place), but `SpriteCB_OpponentMonFromBall`
 * (`battle_main.c:2837-2848`) no longer passes `SKIP_FRONT_ANIM` to
 * `BattleAnimateFrontSprite` (`pokemon.c:6803-6809`), so once
 * `affineAnimEnded` fires it now ALSO plays GROVYLE's species front-sprite
 * entrance animation - `sMonFrontAnimIdsTable[SPECIES_GROVYLE-1] =
 * ANIM_V_STRETCH` (`pokemon.c:1659`) -> `Anim_VerticalStretch`
 * (`pokemon_animation.c:1597-1635`, a ~41-tick affine vertical
 * squish/stretch with a Sin-table wobble on frames 10-29), plus a swap to
 * the front sprite's 2nd frame (`HasTwoFramesAnimation(GROVYLE)` is TRUE -
 * `pokemon.c:6988-6994` excludes only CASTFORM/DEOXYS/SPINDA/UNOWN - 2nd
 * frame not yet extracted, see docs/battle-scene-notes.md §7.11 gap list).
 * Re-timed empirically against the regenerated v5 ground truth
 * (`battle1-sendout-dense.json`, twice-run byte-identical): isolating the
 * Grovyle sprite's own 64x64 crop across every tick 1510-1555 shows
 * continuous per-tick change through **1543**, static from **1544** on -
 * exactly the oracle-vs-engine full-frame match boundary too (`sendout.json`
 * frame 1543 mismatches, 1544 matches). The transient entrance-anim frames
 * themselves (1519-1543) are NOT rendered this session (same "hard step,
 * not curve-fitted" principle as the v3 pin) - see docs/battle-scene-notes.md
 * §7.11 for the full derivation and the still-open gap list.
 */
const GROVYLE_MATERIALIZE_TICK = 1544;
const GROVYLE_CORNER = { x: 144, y: 12 };

/**
 * §7.6: opponent healthbox slide-in. The content (name/gender/level/HP bar)
 * is a fixed, fully-assembled STATIC image from the moment it's created -
 * pixel-brute-force-confirmed (per-tick x-offset search against the
 * oracle's own captures, `extract-sendout-healthbox-content.ts`): every
 * tick 1495-1523 matches the SAME extracted content at a purely-translated
 * x with zero pixel mismatch (dx=-110 at 1495, +5px/tick, settled dx=0 from
 * 1517 - a clean 23-step linear slide, matching `StartHealthboxSlideIn`'s
 * source-cited `sSpeedX=-5`/23-tick prediction exactly). Not present at all
 * before 1495 (full mismatch, not just further off-screen).
 */
const HEALTHBOX_SLIDE_START_TICK = 1495;
const HEALTHBOX_SLIDE_START_DX = -110;
const HEALTHBOX_SLIDE_STEP = 5;
const HEALTHBOX_SLIDE_SETTLE_TICK = 1517;

/** Opponent healthbox's content-image x offset (added to its extracted `x`) at trace tick `t`, or `null` before it's created. */
function healthboxSlideDx(t: number): number | null {
  if (t < HEALTHBOX_SLIDE_START_TICK) return null;
  if (t >= HEALTHBOX_SLIDE_SETTLE_TICK) return 0;
  return HEALTHBOX_SLIDE_START_DX + HEALTHBOX_SLIDE_STEP * (t - HEALTHBOX_SLIDE_START_TICK);
}

/**
 * §7.4.2/§7.11 mechanism 2: the send-out ball sprite - `StartSendOutAnim`
 * creates it at `GetBattlerSpriteCoord(battler, BATTLER_COORD_X)`,
 * `GetBattlerSpriteCoord(battler, BATTLER_COORD_Y)+24` (`pokeball.c:389-395`),
 * closed, then `SpriteCB_OpponentMonSendOut` idles 16 ticks
 * (`pokeball.c:991-1003`) before `SpriteCB_ReleaseMonFromBall` fires
 * `StartSpriteAnim(sprite, 1)` -> `sBallAnimSeq1`
 * (`ANIMCMD_FRAME(4,5)` "open", `ANIMCMD_FRAME(8,5)` "openFinal",
 * `docs/battle-anim-assets.md` §2). Position and the closed/open tick
 * boundaries are pixel-brute-force-confirmed against this trace's own
 * regenerated ground truth (not assumed from the other trace
 * `battle-anim-assets.md` used, nor from summing the source constants) -
 * `tools/compare/scratch/find_ball.mjs`/`ball_ticks.mjs` (throwaway, not
 * committed): the closed frame at corner (168,56) is a ZERO-diff pixel match
 * at every tick 1464-1479 (16 ticks, matching the source-cited wait exactly)
 * and a full mismatch at every tick 1460-1463 before it (confirming 1464 =
 * handoffTick+2 as the true first-visible tick, not handoffTick+0). The
 * "open" frame is a ZERO-diff exact match at 1480 (handoffTick+18).
 *
 * **§7.25 correction**: `ANIMCMD_FRAME(8,5)`'s own tile data in `poke.png`
 * (frame slot 2) genuinely IS blank (every pixel palette index 0) - but that
 * data is never what's on screen, because `LoadBallGfx` (`pokeball.c:1308-
 * 1332`), called once when the ball sprite is created, unconditionally DMAs
 * a SEPARATE graphic (`gOpenPokeballGfx` = `graphics/balls/open.png`, its
 * own 16x16 file, never previously extracted) over that exact VRAM tile
 * range for BALL_POKE (and every ball except Dive/Timer/Luxury/Premier). So
 * the ball's real 3rd/4th/5th visible frame is NOT blank: a full round ball
 * (red top/black band/white-gray bottom), distinct from "open"'s
 * halves-separated look. RAM-probed (`gSprites[9]`, confirmed via `x=176,
 * y=64` = `BALL_CORNER`+8,+8 - the ball's own slot, distinct from the
 * particle sprites spawned at `y=59`) across RAM ticks 1462-1495:
 * `animNum` flips 0->1 at RAM 1479 (open anim starts), `animCmdIndex` flips
 * 0->1 at RAM 1484 (6th tick of the open anim - the `openFinal` tile,
 * 43553, appears here, exactly `poke.png`'s tile-offset-8 slot, matching
 * `ANIMCMD_FRAME(8,...)`), `animEnded` sets at RAM 1489 (5 ticks of
 * `openFinal`, matching `ANIMCMD_FRAME(8,5)`'s own duration), and
 * `invisible` sets at RAM 1490 (the tick after `HandleBallAnimEnd` observes
 * `animEnded`). With this window's established +1 render lag (RAM N visible
 * at render N+1, re-confirmed yet again here): open 1480-1484 (unchanged),
 * openFinal 1485-1490 (6 ticks, was wrongly treated as invisible), truly
 * invisible/destroyed from 1491 on. Verified against the oracle's own exact
 * pixels (`tools/compare/scratch/openpng_verify.mjs`, isolated - not yet
 * composited): `open.png`'s own palette indices, drawn at `BALL_CORNER`
 * against renders 1485-1490, match the oracle's opaque pixels 70-82% before
 * even accounting for mechanism 4's tint compositing on top (the ball is
 * drawn AFTER the tint in `drawSendOutHandoff`, so partial occlusion here is
 * expected, same shape as §7.21's already-accepted ball-corner residual) -
 * far above chance and confirmed by the full composited re-render below.
 */
const BALL_CORNER = { x: 168, y: 56 };
const BALL_CLOSED_START_OFFSET = 2;
const BALL_OPEN_START_OFFSET = 18;
const BALL_OPEN_FINAL_START_OFFSET = 23;
const BALL_INVISIBLE_START_OFFSET = 29;

function subTileset(tileset: Tileset, tileRowOffset: number, rows: number): Tileset {
  return {
    columns: tileset.columns,
    rows,
    tiles: tileset.tiles.slice(tileRowOffset * tileset.columns, (tileRowOffset + rows) * tileset.columns),
  };
}

const BALL_CLOSED_TILESET = subTileset(summaryBall.tileset, 0, 2);
const BALL_OPEN_TILESET = subTileset(battleAnimBallOpen.tileset, 0, 2);
const BALL_OPEN_FINAL_TILESET = subTileset(battleAnimBallOpen.tileset, 2, 2);

function drawSendOutBall(fb: Uint8Array, t: number, handoffTick: number): void {
  const et = t - handoffTick;
  if (et < BALL_CLOSED_START_OFFSET || et >= BALL_INVISIBLE_START_OFFSET) return;
  if (et < BALL_OPEN_START_OFFSET) {
    drawSpriteSheet(fb, BALL_CLOSED_TILESET, summaryBall.palette, BALL_CORNER.x, BALL_CORNER.y);
  } else if (et < BALL_OPEN_FINAL_START_OFFSET) {
    drawSpriteSheet(fb, BALL_OPEN_TILESET, battleAnimBallOpen.palette, BALL_CORNER.x, BALL_CORNER.y);
  } else {
    drawSpriteSheet(fb, BALL_OPEN_FINAL_TILESET, battleAnimBallOpen.palette, BALL_CORNER.x, BALL_CORNER.y);
  }
}

// --- rendering ----------------------------------------------------------

function setPixel(fb: Uint8Array, x: number, y: number, c: RgbColor): void {
  if (x < 0 || x >= 240 || y < 0 || y >= 160) return;
  const o = (y * 240 + x) * 4;
  fb[o] = c.r;
  fb[o + 1] = c.g;
  fb[o + 2] = c.b;
  fb[o + 3] = 255;
}

function drawSpriteSheetTile(fb: Uint8Array, tileset: Tileset, palette: RgbColor[], tileIndex: number, ox: number, oy: number): void {
  const tile = tileset.tiles[tileIndex];
  if (!tile) return;
  for (let py = 0; py < 8; py += 1) {
    for (let px = 0; px < 8; px += 1) {
      const idx = tile[py * 8 + px]!;
      if (idx === 0) continue;
      const c = palette[idx];
      if (!c) continue;
      setPixel(fb, ox + px, oy + py, c);
    }
  }
}

function drawSpriteSheet(fb: Uint8Array, tileset: Tileset, palette: RgbColor[], ox: number, oy: number): void {
  for (let ty = 0; ty < tileset.rows; ty += 1) {
    for (let tx = 0; tx < tileset.columns; tx += 1) {
      drawSpriteSheetTile(fb, tileset, palette, ty * tileset.columns + tx, ox + tx * 8, oy + ty * 8);
    }
  }
}

/**
 * Mechanism 4 (§7.5/§7.11, `docs/battle-anim-assets.md` §3): this engine's
 * first affine-OAM scale renderer - nearest-neighbor, the same shape
 * `ConvertScaleParam`/the GBA's own affine sprite hardware uses (`src/
 * sprite.c:1316-1319`): for a source-centered destination pixel offset
 * `(rx,ry)`, the sampled source texel is `((rx*matrixParam) >> 8 +
 * halfWidth, (ry*matrixParam) >> 8 + halfHeight)`, `matrixParam = 0x10000 /
 * accumulator` (truncating integer division, same as the GBA's own u16
 * matrix register). Every opaque source texel draws as a flat `tintColor`
 * (not the sprite's own palette) - correct only for `BlendPalette`
 * coefficient 16 (fully blended, see `MATERIALIZE_TINT_*` below); this
 * primitive does not itself model a partial blend. `accumulator` must be
 * <=`neutralScale` (this mechanism only ever shrinks the sprite, never
 * magnifies it - see `affineEmergeAccumulator`), so scanning the sprite's
 * own unscaled bounding box (no `ST_OAM_AFFINE_DOUBLE` doubling) is always
 * sufficient. `y2` (§7.21) is `sprite->y2` added to the destination row -
 * see `MATERIALIZE_Y2_TABLE` below for why this exists.
 */
function drawSpriteSheetAffineTinted(fb: Uint8Array, tileset: Tileset, ox: number, oy: number, accumulator: number, tintColor: RgbColor, y2 = 0): void {
  const w = tileset.columns * 8;
  const h = tileset.rows * 8;
  const halfW = w / 2;
  const halfH = h / 2;
  const matrixParam = Math.trunc(0x10000 / accumulator);
  for (let dy = 0; dy < h; dy += 1) {
    const ry = dy - halfH;
    const sy = ((ry * matrixParam) >> 8) + halfH;
    if (sy < 0 || sy >= h) continue;
    const tileRow = Math.floor(sy / 8);
    const inTileY = sy % 8;
    for (let dx = 0; dx < w; dx += 1) {
      const rx = dx - halfW;
      const sx = ((rx * matrixParam) >> 8) + halfW;
      if (sx < 0 || sx >= w) continue;
      const tile = tileset.tiles[tileRow * tileset.columns + Math.floor(sx / 8)];
      if (!tile) continue;
      const idx = tile[inTileY * 8 + (sx % 8)]!;
      if (idx === 0) continue;
      setPixel(fb, ox + dx, oy + dy + y2, tintColor);
    }
  }
}

/** Same as `drawSpriteSheet`, but clipped to the WIN0 vertical range (`WININ` includes `WIN0_OBJ` - OBJs are windowed too, module doc point 2). */
function drawSpriteSheetWindowed(
  fb: Uint8Array,
  tileset: Tileset,
  palette: RgbColor[],
  ox: number,
  oy: number,
  win: { top: number; bottom: number },
): void {
  for (let ty = 0; ty < tileset.rows; ty += 1) {
    const rowY = oy + ty * 8;
    if (rowY + 8 <= win.top || rowY >= win.bottom) continue;
    for (let tx = 0; tx < tileset.columns; tx += 1) {
      const tile = tileset.tiles[ty * tileset.columns + tx];
      if (!tile) continue;
      for (let py = 0; py < 8; py += 1) {
        const y = rowY + py;
        if (y < win.top || y >= win.bottom) continue;
        for (let px = 0; px < 8; px += 1) {
          const idx = tile[py * 8 + px]!;
          if (idx === 0) continue;
          const c = palette[idx];
          if (!c) continue;
          setPixel(fb, ox + tx * 8 + px, y, c);
        }
      }
    }
  }
}

function drawTileBg(fb: Uint8Array, tileset: Tileset, tilemap: Tilemap, subpalettes: RgbColor[][]): void {
  for (let screenY = 0; screenY < 160; screenY += 1) {
    const tileRow = Math.floor(screenY / 8);
    const inTileY = screenY % 8;
    for (let screenX = 0; screenX < 240; screenX += 1) {
      const tileCol = Math.floor(screenX / 8);
      const inTileX = screenX % 8;
      const entry = tilemap.entries[tileRow * tilemap.width + tileCol];
      if (!entry) continue;
      const tile = tileset.tiles[entry.tile];
      if (!tile) continue;
      const sx = entry.hFlip ? 7 - inTileX : inTileX;
      const sy = entry.vFlip ? 7 - inTileY : inTileY;
      const idx = tile[sy * 8 + sx]!;
      if (idx === 0) continue;
      const c = subpalettes[entry.palette]?.[idx];
      if (!c) continue;
      setPixel(fb, screenX, screenY, c);
    }
  }
}

/**
 * §7.5/§7.9: the send-out window's materialize BG-to-white dither
 * (`BeginNormalPaletteFade(selectedPalettes=14, 0, 0, 16, RGB_WHITE)`,
 * `battle_anim_throw.c:2056`, PALETTES_BG banks 1-3 only - never applied to
 * OBJ sprites, which is why this is a `drawTileBg` variant, not a global
 * post-process). `SENDOUT_BG_FADE_Y` is a literal per-tick table (not
 * `paletteFade.ts`'s generic `bgFadeY` step formula), pixel-sampled
 * directly from a clean sprite-free background swatch in the already-
 * fetched oracle captures (tick 10,3 - `RGB(222,231,231)` unfaded,
 * confirmed static every other tick in this trace) because the generic
 * formula's implicit `objPaletteToggle` parity (a global flag whose state
 * at this specific trigger tick isn't independently known) produced a
 * 1-tick mismatch right at the y=14->16 boundary when cross-checked against
 * these same pixels - the observed y=14 plateau is 3 ticks wide (1493-1495)
 * here, not the formula's predicted 2. Every other step, forward and
 * reverse, matches a clean 2-ticks-per-step cadence. Indexed by `t -
 * handoffTick`; 0 (fully unfaded) outside the covered range.
 *
 * §7.20: the table's own head/tail were one step short of the ramp it
 * otherwise follows exactly - r=19/20 and r=54/55 (render ticks 1481/1482
 * and 1516/1517) render as y=2 in the oracle (direct pixel decode via
 * `blendComponentToWhite`'s own closed form against a clean background
 * swatch at (150,60): e.g. r=19's oracle RGB (198,198,165) solves exactly
 * to y=2 for unfaded (189,189,156), same formula, same swatch, cross-checked
 * at r=21/22/50/51 against the table's own EXISTING values first to confirm
 * the method - not a new mechanism, the same validated 2-ticks-per-step
 * cadence simply continues one more step at both ends before the table's
 * prior boundaries fell back to the `?? 0` default. `SENDOUT_BG_FADE_START`
 * moves 21->19 to match.
 */
const SENDOUT_BG_FADE_Y: readonly number[] = [
  2, 2, // r=19..20 (§7.20: ramp's own missing head step)
  4, 4, 6, 6, 8, 8, 10, 10, 12, 12, 14, 14, 14, // r=21..33 (ramp up to white, incl. the observed 3-tick y=14 hold)
  16, 16, 16, 16, 16, 16, 16, 16, // r=34..41 (white plateau)
  14, 14, 12, 12, 10, 10, 8, 8, 6, 6, 4, 4, // r=42..53 (ramp back down)
  2, 2, // r=54..55 (§7.20: ramp's own missing tail step)
];
const SENDOUT_BG_FADE_START = 19;

function sendOutBgFadeY(t: number, handoffTick: number): number {
  return SENDOUT_BG_FADE_Y[t - handoffTick - SENDOUT_BG_FADE_START] ?? 0;
}

/** Same as `drawTileBg`, but blending every opaque pixel toward white at coefficient `y` (0..16, see `SENDOUT_BG_FADE_Y`) first - `y=0` is a no-op equivalent to plain `drawTileBg`. */
function drawTileBgFaded(fb: Uint8Array, tileset: Tileset, tilemap: Tilemap, subpalettes: RgbColor[][], y: number): void {
  if (y <= 0) {
    drawTileBg(fb, tileset, tilemap, subpalettes);
    return;
  }
  for (let screenY = 0; screenY < 160; screenY += 1) {
    const tileRow = Math.floor(screenY / 8);
    const inTileY = screenY % 8;
    for (let screenX = 0; screenX < 240; screenX += 1) {
      const tileCol = Math.floor(screenX / 8);
      const inTileX = screenX % 8;
      const entry = tilemap.entries[tileRow * tilemap.width + tileCol];
      if (!entry) continue;
      const tile = tileset.tiles[entry.tile];
      if (!tile) continue;
      const sx = entry.hFlip ? 7 - inTileX : inTileX;
      const sy = entry.vFlip ? 7 - inTileY : inTileY;
      const idx = tile[sy * 8 + sx]!;
      if (idx === 0) continue;
      const c = subpalettes[entry.palette]?.[idx];
      if (!c) continue;
      setPixel(fb, screenX, screenY, {
        r: blendComponentToWhite(c.r, y),
        g: blendComponentToWhite(c.g, y),
        b: blendComponentToWhite(c.b, y),
      });
    }
  }
}

const BRENDAN_FRAME_ROWS = brendan.tileset.rows / brendan.frameCount;
/** One of Brendan's 4 stacked raw back-sprite frames (`trainer-pic-brendan-back.json`), sliced by index - frame 3 is the settled slide-in pose, frames 0-2 are the send-out throw animation (`battleMenu.ts`'s `brendanThrowFrame`). */
function brendanFrameTileset(frameIndex: number): Tileset {
  return {
    columns: brendan.tileset.columns,
    rows: BRENDAN_FRAME_ROWS,
    tiles: brendan.tileset.tiles.slice(
      frameIndex * BRENDAN_FRAME_ROWS * brendan.tileset.columns,
      (frameIndex + 1) * BRENDAN_FRAME_ROWS * brendan.tileset.columns,
    ),
  };
}
/** Frame index 3 (of 4) is the settled slide-in pose (docs trainer-pic extractor comment). */
const BRENDAN_SETTLED_FRAME = 3;
const brendanSettledTileset: Tileset = brendanFrameTileset(BRENDAN_SETTLED_FRAME);
const brendanThrowTilesets: readonly Tileset[] = [0, 1, 2, 3].map(brendanFrameTileset);

const OPPONENT_CORNER = { x: 144, y: 8 };
const PLAYER_CORNER = { x: 48, y: 48 };
const MESSAGE_PALETTE = battleWindow.palette[0]!;
const MESSAGE_TEXT_COLORS = { fg: 1, bg: 15, shadow: 6 };
const LINE1_ORIGIN = { x: 16, y: 121 };
const LINE2_ORIGIN = { x: 16, y: 137 };

function drawMessageTextLines(fb: Uint8Array, line1: string, line2: string, chars: number): void {
  if (chars <= 0) return;
  const l1 = line1.slice(0, Math.min(chars, line1.length));
  drawText(fb, font, charmap, l1, LINE1_ORIGIN.x, LINE1_ORIGIN.y, MESSAGE_PALETTE, MESSAGE_TEXT_COLORS);
  if (chars > line1.length) {
    const l2 = line2.slice(0, chars - line1.length);
    drawText(fb, font, charmap, l2, LINE2_ORIGIN.x, LINE2_ORIGIN.y, MESSAGE_PALETTE, MESSAGE_TEXT_COLORS);
  }
}

function drawMessageText(fb: Uint8Array, chars: number): void {
  drawMessageTextLines(fb, LINE1, LINE2, chars);
}

function drawCursor(fb: Uint8Array, yOffset: number): void {
  const destY = CURSOR_DEST_Y_BASE - yOffset;
  for (let py = 0; py < downArrow.blitHeight; py += 1) {
    for (let px = 0; px < downArrow.blitWidth; px += 1) {
      const idx = downArrow.indices[py]?.[px] ?? 0;
      if (idx === 0) continue;
      const c = MESSAGE_PALETTE[idx];
      if (!c) continue;
      setPixel(fb, CURSOR_DEST_X + px, destY + py, c);
    }
  }
}

function ballStateTileIndex(state: string): number {
  return Math.max(0, ballDisplay.states.indexOf(state));
}

/**
 * Same as `setPixel`, but alpha-blended (`BLDALPHA_BLEND(eva, 16-eva)`) when
 * `eva` isn't `null` - see `battleMenu.ts`'s `playerSummaryFadeEva`. `eva=16`
 * is mathematically a no-op (`blendChannel` reduces to the flat color), so
 * callers can pass it unconditionally once fading starts.
 *
 * **Target 2 is the plain background tile, never whatever another sprite
 * already painted into `fb`** (menu-throw.json's 1581-83/1589-91/1597-98
 * root cause, docs/battle-menu-notes.md §3 item 4b's follow-up): real GBA
 * OBJ hardware tracks only ONE sprite pixel per dot in its compositing
 * buffer (the topmost by priority) - when that top OBJ pixel is itself the
 * blend's target-1 (the icon/bar, `oam.priority=1`), there is no "other OBJ
 * pixel" left for target-2 to resolve to even though `BLDCNT_TGT2_OBJ` is
 * set and a lower-priority sprite (Brendan, `priority=2`) is genuinely
 * beneath it on screen - the blend falls through to the backdrop/BG layers'
 * pixel instead. Oracle-verified exact at the mismatch's own pixel
 * (73,89)/tick 1581: `blend(iconColor, backgroundColor)` reproduces the
 * oracle's `(117,111,131)` bit-for-bit, where `blend(iconColor,
 * brendanColor)` (this function's old behavior) gave the wrong `(61,59,88)`
 * this codebase was actually drawing.
 */
function blendedSetPixel(fb: Uint8Array, x: number, y: number, c: RgbColor, eva: number | null): void {
  if (eva === null) {
    setPixel(fb, x, y, c);
    return;
  }
  if (x < 0 || x >= 240 || y < 0 || y >= 160) return;
  const o = (y * 240 + x) * 4;
  const evb = 16 - eva;
  const bg = healthboxBackgroundColorAt(x, y);
  const tgt2 = bg ?? { r: fb[o]!, g: fb[o + 1]!, b: fb[o + 2]! };
  fb[o] = blendChannel(c.r, tgt2.r, eva, evb);
  fb[o + 1] = blendChannel(c.g, tgt2.g, eva, evb);
  fb[o + 2] = blendChannel(c.b, tgt2.b, eva, evb);
  fb[o + 3] = 255;
}

/** gBattleInterface_BallStatusBarGfx (`ball_status_bar.png`), the diagonal bar the ball icons sit on - corners brute-force-matched against the oracle this session: opponent (-24,40) h-flipped, player (136,96) unflipped, both 212/212 exact. `eva` (non-null only for the player side, post-`PLAYER_SUMMARY_FADE_START_TICK`) alpha-blends against the framebuffer instead of drawing flat - see `blendedSetPixel`. */
function drawBallStatusBar(fb: Uint8Array, ox: number, oy: number, hFlip: boolean, eva: number | null = null): void {
  const { tileset, palette } = ballStatusBar;
  for (let ty = 0; ty < tileset.rows; ty += 1) {
    for (let tx = 0; tx < tileset.columns; tx += 1) {
      const tileCol = hFlip ? tileset.columns - 1 - tx : tx;
      const tile = tileset.tiles[ty * tileset.columns + tileCol];
      if (!tile) continue;
      for (let py = 0; py < 8; py += 1) {
        for (let px = 0; px < 8; px += 1) {
          const sx = hFlip ? 7 - px : px;
          const idx = tile[py * 8 + sx]!;
          if (idx === 0) continue;
          const c = palette[idx];
          if (!c) continue;
          blendedSetPixel(fb, ox + tx * 8 + px, oy + ty * 8 + py, c, eva);
        }
      }
    }
  }
}

function drawBallIcons(fb: Uint8Array, t: number, sides: { opponent: boolean; player: boolean } = { opponent: true, player: true }): void {
  const bars = ballStatusBarPositions(t);
  const playerEva = playerSummaryFadeEva(t);
  const barExitDx = playerSummaryBarExitDx(t);
  // `Task_HidePartyStatusSummary_BattleStart_2`'s own `tBlend==-1` case
  // (battle_interface.c:1746) destroys the player bar+icon sprites outright
  // the instant the fade bottoms out (RAM-confirmed: RAM tick 1605, first
  // visible screen tick 1606, the same tick `playerSummaryFadeEva` itself
  // first clamps to 0) - so once `playerEva` reaches 0 this must stop
  // drawing them altogether, not keep drawing them blended at 0% opacity:
  // with the real sprites gone, whatever's actually behind them (the thrown
  // ball, its open/spin animation, etc.) is fully visible on real hardware,
  // and continuing to draw at eva=0 would instead re-paint that spot with
  // `blendedSetPixel`'s target-2 (see its own doc comment) every tick,
  // silently overwriting whatever draws there later (menu-throw.json
  // 1646-1648, found immediately after fixing the OBJ-vs-OBJ target-2 bug).
  const playerSummaryAlive = playerEva === null || playerEva > 0;
  if (sides.opponent && bars.opponent.visible) drawBallStatusBar(fb, bars.opponent.x, 40, true);
  if (sides.player && bars.player.visible && playerSummaryAlive) {
    const barX = bars.player.x + barExitDx;
    if (playerEva !== null && playerBarExitTableActive(t)) drawPlayerSummaryBarExit(fb, barX, playerEva);
    else drawBallStatusBar(fb, barX, 96, false, playerEva);
  }
  let playerIconIndex = 0;
  for (const icon of ballIcons(t)) {
    if (!icon.visible) continue;
    if (icon.y === 32 && !sides.opponent) continue;
    if (icon.y === 88 && (!sides.player || !playerSummaryAlive)) {
      playerIconIndex += 1;
      continue;
    }
    const tile = ballDisplay.tileset.tiles[ballStateTileIndex(icon.state)];
    if (!tile) continue;
    const eva = icon.y === 88 ? playerEva : null;
    const iconExitDx = icon.y === 88 ? playerSummaryIconExitDx(t, playerIconIndex) : 0;
    if (icon.y === 88) playerIconIndex += 1;
    for (let py = 0; py < 8; py += 1) {
      for (let px = 0; px < 8; px += 1) {
        const idx = tile[py * 8 + px]!;
        if (idx === 0) continue;
        const c = ballDisplay.palette[idx];
        if (!c) continue;
        blendedSetPixel(fb, icon.x + iconExitDx + px, icon.y + py, c, eva);
      }
    }
  }
}

/** §7.5: Grovyle's settled front sprite - see `GROVYLE_MATERIALIZE_TICK`'s doc comment. */
function drawGrovyleSettled(fb: Uint8Array): void {
  drawSpriteSheet(fb, grovyleFrontSprite.tileset, grovyleFrontSprite.palette, GROVYLE_CORNER.x, GROVYLE_CORNER.y);
}

/**
 * §7.5/§7.11 mechanism 4: Grovyle's materialize - `BATTLER_AFFINE_EMERGE`'s
 * scale-in (`sAffineAnim_Battler_Emerge`, `docs/battle-anim-assets.md` §3b)
 * plus `LaunchBallFadeMonTask(TRUE, ...)`'s flat ball-color tint
 * (`gBallOpenFadeColors[BALL_POKE]`, §3a) - both start the same tick as the
 * ball's own "open" frame (`BALL_OPEN_START_OFFSET`, mechanism 2). Window
 * boundaries here are pixel-brute-force-confirmed against this trace's own
 * regenerated ground truth (`tools/compare/scratch/probe_tint.mjs`,
 * throwaway, not committed) by scanning for the exact-tint RGB
 * (255,181,247) - not assumed from `battle-anim-assets.md`'s own
 * (different-trace) ticks, though they land on the identical relative
 * offsets, cross-trace-confirming the same mechanism: first visible tint
 * pixel at **handoffTick+19 (1481)** - one tick after the ball's own open
 * frame (handoffTick+18), the same 1-tick render-lag family as every other
 * sprite/register in this window (checked first, per this run's own rule) -
 * full mismatch/zero tint pixels at handoffTick+18 (1480) confirms it's not
 * 1480. The tinted silhouette's bounding-box width grows monotonically for
 * exactly 12 ticks (1481-1492: 15,23,31,41,49,57,62px at every other tick,
 * an EXACT match to `battle-anim-assets.md` §4's own table from a different
 * trace), matching `affineEmerge`'s `duration=12` step verbatim, then holds
 * - so `affineEmergeAccumulator` is driven directly by the extracted table,
 * not a fitted curve. **Hard cutoff at handoffTick+42 (1504)**: the
 * exact-tint pixel count is non-zero and stable at every tick 1492-1503 (the
 * mon is still a flat, fully-blended silhouette - `BlendPalette` coefficient
 * 16 unchanged, matching `LaunchBallFadeMonTask`'s own `tCoeff=16` initial
 * value and `Task_FadeMon_ToNormal`'s poll-and-wait gate before the 17-tick
 * fade-to-normal even begins, `battle_anim_throw.c:2043-2054,2078-2102`),
 * then hits exactly ZERO at 1504, not a gradual decline - this session did
 * NOT reverse-engineer why the transition is a hard step rather than
 * `Task_FadeMon_ToNormal_Step`'s own gradual 17-tick ramp (flagged as an
 * open follow-up below; plausible causes include the front-sprite entrance
 * animation, mechanism 5, replacing the sprite's own affine matrix/palette
 * state at that exact tick - notably `SENDOUT_BG_FADE_Y`'s ramp-down also
 * starts at this identical offset, `t-handoffTick=42`, which is NOT a
 * coincidence: both are gated by the same `Task_FadeMon_ToNormal`
 * `!gPaletteFade.active` poll per source, `:2078-2086`). Per this run's "no
 * curve-fitting" rule, mechanism 4 simply stops rendering at the hard
 * cutoff rather than guessing the fade-out curve - ticks 1504-1543 stay a
 * known gap (mechanism 5's own window, unimplemented).
 */
const MATERIALIZE_START_OFFSET = 19;
const MATERIALIZE_END_OFFSET = 42;
const MATERIALIZE_TINT_COLOR = battleAnimTables.ballOpenFadeColor.rgb8;

/** `sAffineAnim_Battler_Emerge`'s accumulator at `logicalOffset` ticks after the anim starts (0 = the tick it starts) - a generic reducer over `affineEmerge.steps` (`AFFINEANIMCMD_FRAME` semantics, `docs/battle-anim-assets.md` §3b), not hardcoded constants, so it stays correct if the extracted table ever changes. */
function affineEmergeAccumulator(logicalOffset: number): number {
  let acc = battleAnimTables.affineEmerge.neutralScale;
  let consumed = 0;
  for (const step of battleAnimTables.affineEmerge.steps) {
    if (step.duration === 0) {
      acc = step.xScale;
      continue;
    }
    const stepsApplied = Math.min(step.duration, Math.max(0, logicalOffset - consumed));
    acc += step.xScale * stepsApplied;
    consumed += step.duration;
    if (logicalOffset < consumed) break;
  }
  return Math.min(battleAnimTables.affineEmerge.neutralScale, acc);
}

/**
 * §7.21: RAM-probed (`tools/probe/specs/sendout-grovyle-materialize.json`,
 * `gSprites[8]` - the same battler-sprite slot §7.10/§7.16 already pinned -
 * watching `oam.x`/`y2`/`gOamMatrices[2].a` across RAM ticks 1476-1493) two
 * corrections to the materialize renderer, both needed to close the
 * "silhouette edge" residual (§7.20's naming) in render ticks 1481-1492:
 *
 * 1. **The accumulator lookup was one logical tick behind.** RAM tick 1479
 *    (the tick `StartSpriteAffineAnim(..., BATTLER_AFFINE_EMERGE)` runs)
 *    already writes the anim's absolute first frame (`gOamMatrices[2].a`
 *    reads back exactly `0x10000/40=1638`, i.e. `accumulator=40`,
 *    `affineEmergeAccumulator(0)`) - but `oam.x` is still 0 (the sprite not
 *    yet positioned on screen) that same tick, so nothing visible renders.
 *    `oam.x` becomes 144 (matching `GROVYLE_CORNER.x`) starting RAM tick
 *    1480, the SAME tick the matrix advances to `accumulator=58`
 *    (`affineEmergeAccumulator(1)`) - confirmed by reading back
 *    `gOamMatrices[2].a=1129=round(0x10000/58)` directly, not inferred. With
 *    this window's already-established +1 render lag (RAM tick N visible at
 *    render N+1), render 1481 (the first visible tint tick, per §7.13's own
 *    pixel-brute-force) therefore shows `accumulator=58`
 *    (`affineEmergeAccumulator(1)`), not `accumulator=40`
 *    (`affineEmergeAccumulator(0)`) as previously coded - a plain off-by-one
 *    in which logical tick the visible position/matrix pairing lands on,
 *    not a new mechanism. Brute-force-confirmed independently first
 *    (`tools/compare/scratch/materialize_accum_bruteforce.mjs`, `..
 *    _2d_bruteforce.mjs`): searching every `accumulator` 1-256 (then jointly
 *    with a Y-offset) against the oracle's own exact-tint pixel set at each
 *    of render 1481/83/85/87/89/91/92 landed on exactly this
 *    logicalOffset+1 sequence (58,94,166,202,238,256,256) with NO per-tick
 *    exceptions - a single, uniform +1 shift, not curve-fitting.
 * 2. **A real, previously-unmodeled vertical offset**: `sprite->y2` is
 *    nonzero throughout the same 12-tick ramp - RAM tick 1480 (render 1481)
 *    reads `y2=14`, decaying roughly linearly to `y2=0` by RAM tick 1492
 *    (render 1493), then holding zero (source cause not reverse-engineered
 *    this session - `sAffineAnim_Battler_Emerge` itself has no translation
 *    field, so this must come from a separate concurrent write; RAM
 *    ground truth is trusted over a guessed formula, same precedent as
 *    `GROVYLE_STRETCH_TABLE`, §7.16). This is NOT a curve-fit: the same
 *    brute-force script above, searching accumulator AND a Y-destination-
 *    offset jointly per tick with no RAM knowledge at all, independently
 *    landed on offsets (14,12,10,8,5,3,2) at renders (1481,83,85,87,89,91,92)
 *    - an EXACT match to the RAM-read `y2` values at the corresponding RAM
 *    ticks, found two independent ways.
 * `MATERIALIZE_Y2_TABLE[i]` is RAM tick `1480+i`'s post-tick `y2` (12
 * entries, RAM 1480-1491 inclusive - beyond that `y2` is 0, the `?? 0`
 * fallback). Applying both corrections together (verified against the
 * oracle's own exact-tint-color pixel SET, not just aggregate diff count,
 * `tools/compare/scratch/materialize_ram_verify.mjs`) reproduces the
 * oracle's silhouette as an exact SUBSET-with-known-occluder-holes: every
 * remaining mismatched pixel sits inside the ball sprite's own screen
 * footprint (`BALL_CORNER`, drawn on top per §7.13's compositing order) -
 * i.e. the residual pixels are mechanism 2 (already-implemented, already
 * validated) occluding mechanism 4, not a mechanism-4 sampling error.
 */
const MATERIALIZE_Y2_TABLE: readonly number[] = [14, 13, 12, 11, 10, 9, 8, 7, 5, 4, 3, 2];

/**
 * §7.23 (re-applying §7.22's verified fix): mechanism 5's own affine matrix
 * write starts 7 ticks before its original coded window (et 35, not et 42 -
 * `GROVYLE_FRONT_ANIM_START_OFFSET`, the SAME tick its front-sprite frame
 * cadence already switches, §7.17) - RAM-probed directly
 * (`tools/probe/specs/sendout-grovyle-stretch.json`, already-committed spec,
 * read further into its existing run): mechanism 4's own window is
 * shortened to match (`et < GROVYLE_FRONT_ANIM_START_OFFSET`, was `et <
 * MATERIALIZE_END_OFFSET`) - mechanism 4 never drew non-neutral pixels in
 * the newly-excluded et 35-41 gap anyway (its own tables are already dry by
 * et 30), so this only changes WHICH function renders that tail, not its
 * pixels. See `GROVYLE_STRETCH_EARLY_TABLE`'s doc comment for the other half
 * of this fix.
 */
function drawGrovyleMaterialize(fb: Uint8Array, t: number, handoffTick: number): void {
  const et = t - handoffTick;
  if (et < MATERIALIZE_START_OFFSET || et >= GROVYLE_FRONT_ANIM_START_OFFSET) return;
  const local = et - MATERIALIZE_START_OFFSET;
  const accumulator = affineEmergeAccumulator(local + 1);
  const y2 = MATERIALIZE_Y2_TABLE[local] ?? 0;
  drawSpriteSheetAffineTinted(fb, grovyleFrontSprite.tileset, GROVYLE_CORNER.x, GROVYLE_CORNER.y, accumulator, MATERIALIZE_TINT_COLOR, y2);
}

/**
 * PLAYER-side materialize (docs/battle-menu-notes.md §3 item 5 /
 * docs/battle-anim-assets.md §5) - ONIX's own `SpriteCB_ReleaseMonFromBall`
 * scale-in, the SAME shared source function/table as mechanism 4 above
 * (`BATTLER_AFFINE_EMERGE`/`sAffineAnim_Battler_Emerge`), re-derived fresh
 * against `battle1-menu-dense.json` since screen position/timing genuinely
 * differ per side (only the underlying assets were confirmed to transfer,
 * not tick alignment - `docs/battle-anim-assets.md` §5's own caveat).
 *
 * **Corner**: `(40,48)` - pixel-brute-force-confirmed (`tools/compare/
 * scratch/menu-audit/find_onix_corner2.mjs`, throwaway): the settled ONIX
 * back sprite is a ZERO-diff EXACT match (1664/1664 opaque px) against
 * `src/assets/gen/battle-back-sprites.json["ONIX"]` at this corner, first at
 * trace tick 1691 and repeatedly thereafter (1710-1740, sampled) whenever
 * the not-yet-source-attributed idle-bob (`docs/battle-menu-notes.md` §4,
 * still open) isn't mid-swing.
 *
 * **Accumulator lookup offset**: unlike mechanism 4's `local+1`, the
 * PLAYER-side accumulator is `affineEmergeAccumulator(local+2)` - one
 * logical tick further ahead. Brute-force-confirmed (`tools/compare/
 * scratch/menu-audit/onix_materialize_bruteforce.mjs`, jointly searching
 * `accumulator`+`yOff` against the oracle's own exact-tint-color pixel SET
 * within the `ONIX_CORNER` crop, same method as §7.21's own opponent-side
 * derivation): renders 1653-1659 land on `affineEmergeAccumulator(2..8)`
 * (76,94,112,129~130,148,166,184) at diff 0-13px (near-exact - the codebase's
 * own established "brute-force cross-check over source formula" standard),
 * confirming a uniform +2 (not +1) lag for this call site - a real, distinct
 * offset, not copied from the opponent's own number. Not RAM-probed this
 * session (time-boxed): flagged as a follow-up for full RAM confirmation,
 * same as §7.21's own `y2` precedent of trusting a pixel-brute-forced table
 * directly.
 *
 * **`y2` table**: the SAME 12 values as `MATERIALIZE_Y2_TABLE` (§7.21),
 * reused verbatim at the SAME local index (not offset) - the brute-force
 * search above independently landed on `y2` values 14,13,12,11,10,9,8,7 at
 * local 0-7 (renders 1653-1660), an exact match to `MATERIALIZE_Y2_TABLE`'s
 * own first 8 entries. Plausible since `y2` is a generic per-sprite write
 * (§7.21 didn't source-attribute it either), unlike the accumulator's own
 * anim-index lookup which this call site schedules one tick later.
 *
 * **Window boundary, pinned this session**: `PLAYER_MATERIALIZE_START_TICK`
 * (1653, one tick after the ball's own "open" pose swap, §3 item 4c's
 * already-pinned pattern) through `PLAYER_MATERIALIZE_END_TICK` (1663
 * exclusive of growth, i.e. last modeled tick 1663 - the accumulator/y2
 * pair reaches the table's own tail, `affineEmergeAccumulator(12)=256`
 * neutral) - NOT continued into the coefficient-fade-to-true-color ramp or
 * past it (unlike mechanism 4's own clean hard cutoff, the player window's
 * `LaunchBallFadeMonTask` coefficient ramp entangles with the
 * still-unresolved idle-bob mechanism starting ~1670 - pixel-brute-force
 * showed a non-monotonic residual there rather than a clean single-mechanism
 * fit, so per this run's "no curve-fitting" rule this session stops at the
 * clean boundary rather than forcing it). Named, not guessed at - see
 * `docs/battle-menu-notes.md` §3 item 5 for the full accounting.
 */
const ONIX_MATERIALIZE_CORNER = { x: 40, y: 48 };
const PLAYER_MATERIALIZE_START_TICK = 1653;
const PLAYER_MATERIALIZE_END_TICK = 1663;
const PLAYER_MATERIALIZE_ACCUMULATOR_LEAD = 2;

function drawPlayerMaterialize(fb: Uint8Array, t: number): void {
  if (t < PLAYER_MATERIALIZE_START_TICK || t > PLAYER_MATERIALIZE_END_TICK) return;
  const local = t - PLAYER_MATERIALIZE_START_TICK;
  const accumulator = affineEmergeAccumulator(local + PLAYER_MATERIALIZE_ACCUMULATOR_LEAD);
  const y2 = MATERIALIZE_Y2_TABLE[local] ?? 0;
  drawSpriteSheetAffineTinted(fb, onixBackSprite.tileset, ONIX_MATERIALIZE_CORNER.x, ONIX_MATERIALIZE_CORNER.y, accumulator, MATERIALIZE_TINT_COLOR, y2);
}

/**
 * ISSUES #17: ONIX's own color-fade-to-true-color + settle wobble, picking
 * up exactly where `drawPlayerMaterialize`'s fixed-tint window
 * (`PLAYER_MATERIALIZE_END_TICK`, 1663) leaves off - see
 * `playerMaterializeSettleTintCoeff`/`playerMaterializeSettleY2`
 * (`battleMenu.ts`) for the full RAM+pixel derivation. The affine scale-in
 * itself is already complete by this point (`affineEmergeAccumulator`
 * reaches its own neutral clamp, 256, before this window starts), so unlike
 * `drawGrovyleStretch`'s own independent x/y stretch this is a plain 1:1
 * blit - reuses `drawSpriteSheetAffineStretch` at `xScale=yScale=256`
 * (the identity matrix) purely for its existing palette+`tintCoeff`-blend
 * support, not for any actual stretch.
 */
function drawPlayerMaterializeSettle(fb: Uint8Array, t: number): void {
  if (t < PLAYER_MATERIALIZE_SETTLE_START_TICK) return;
  drawSpriteSheetAffineStretch(
    fb,
    onixBackSprite.tileset,
    onixBackSprite.palette,
    ONIX_MATERIALIZE_CORNER.x,
    ONIX_MATERIALIZE_CORNER.y,
    256,
    256,
    playerMaterializeSettleY2(t),
    MATERIALIZE_TINT_COLOR,
    playerMaterializeSettleTintCoeff(t),
  );
}

/**
 * PLAYER-side ball "open" pose swap (docs/battle-menu-notes.md §3 item 5) -
 * `StartSpriteAnim(sprite, 1)` one tick after arrival (§3 item 4c's
 * `PLAYER_THROW_BALL_ARRIVE_TICK`), same shared `sBallAnimSeq1` mechanism 2
 * (`drawSendOutBall`) already models for the opponent, but at the player's
 * OWN settled center `(72,115)` - top-left `(64,107)`.
 *
 * **Terrain occlusion, resolved with pixel evidence** (`docs/battle-anim-
 * assets.md` §5's own named placement gap): row-by-row pixel diff at trace
 * tick 1652 (`tools/compare/scratch/menu-audit/onix_ball_open_clip.mjs`)
 * shows only screen rows y=110-111 (the open-pose sprite's own top 2 opaque
 * rows) match exactly - every row y>=112 mismatches (the battlefield terrain
 * graphic there instead, confirmed a background-priority occlusion, not a
 * missing/wrong asset). `playerBallOpenTopLeft`/`PLAYER_BALL_OPEN_VISIBLE_BOTTOM`
 * (`battleMenu.ts`) encode the position/clip; this function does the actual
 * clipped draw.
 *
 * **Window boundary**: RAM-confirmed at `PLAYER_BALL_OPEN_END_TICK`
 * (`battleMenu.ts` - see that constant's own doc comment) to be exactly 5
 * ticks (renders 1652-1656), matching `sBallAnimSeq1`'s own
 * `ANIMCMD_FRAME(4,5)` duration and the OPPONENT's own already-correct
 * `drawSendOutBall` window (`BALL_OPEN_START_OFFSET`..`BALL_INVISIBLE_START_OFFSET`,
 * also exactly 5 ticks) - a prior session's wider guess (1663) was corrected
 * back down this session once RAM probing (not pixel guessing) pinned the
 * true duration.
 *
 * **openFinal pose (PROGRESS #104/this session)**: `sBallAnimSeq1` doesn't
 * end at the open pose - the SAME `ANIMCMD_FRAME(8,5)` "openFinal" frame
 * §7.25 found DMA'd over a nominally-blank tile slot for the opponent's own
 * ball (`LoadBallGfx`, `pokeball.c:1308-1332`, a battler-generic call site)
 * plays next here too, RAM-confirmed visible at renders 1657-1662 (6 ticks -
 * `PLAYER_BALL_OPEN_FINAL_END_TICK`'s own doc comment, `battleMenu.ts`, has
 * the full RAM + pixel derivation). Reuses the SAME extracted tileset
 * (`battleAnimBallOpen`, tile rows 2-3) the opponent's own
 * `BALL_OPEN_FINAL_TILESET` already selects - one shared asset, two
 * battler-specific draw sites (this function owns position/occlusion
 * clipping here; `drawSendOutBall` owns the opponent's own unclipped
 * corner).
 */
function drawPlayerBallOpen(fb: Uint8Array, t: number): void {
  const topLeft = playerBallOpenTopLeft(t);
  if (!topLeft) return;
  const tileRowOffset = t <= PLAYER_BALL_OPEN_END_TICK ? 0 : 2;
  for (let ty = 0; ty < 2; ty += 1) {
    const rowY = topLeft.y + ty * 8;
    if (rowY >= PLAYER_BALL_OPEN_VISIBLE_BOTTOM) continue;
    for (let tx = 0; tx < 2; tx += 1) {
      const tile = battleAnimBallOpen.tileset.tiles[(ty + tileRowOffset) * battleAnimBallOpen.tileset.columns + tx];
      if (!tile) continue;
      for (let py = 0; py < 8; py += 1) {
        const y = rowY + py;
        if (y >= PLAYER_BALL_OPEN_VISIBLE_BOTTOM) continue;
        for (let px = 0; px < 8; px += 1) {
          const idx = tile[py * 8 + px]!;
          if (idx === 0) continue;
          const c = battleAnimBallOpen.palette[idx];
          if (!c) continue;
          setPixel(fb, topLeft.x + tx * 8 + px, y, c);
        }
      }
    }
  }
}

/**
 * §7.11/§7.16/§7.17 mechanism 5: GROVYLE's species front-sprite entrance
 * animation - `sMonFrontAnimIdsTable[SPECIES_GROVYLE-1] = ANIM_V_STRETCH` ->
 * `Anim_VerticalStretch` (`pokemon_animation.c:1597-1635`), launched by
 * `SpriteCB_OpponentMonFromBall` (`battle_main.c:2837-2848`) once
 * `sprite->affineAnimEnded` (mechanism 4's own emerge finishing) - the SAME
 * tick it also does `StartSpriteAnim(sprite, 1)` (`HasTwoFramesAnimation`),
 * selecting `sprite->anims[1]` (`grovyleFrontSprite.frame2` is that anim's
 * `ANIMCMD_FRAME(1,...)` image, extracted this session from `anim_front.png`'s
 * bottom half - top half self-verified pixel-identical to `front.png` before
 * accepting the bottom half, `tools/extract/extract-battle-mon-pics.ts`).
 *
 * **§7.17 correction**: `anims[1]` is NOT a static single-frame swap - it's
 * `sAnim_Grovyle_1` (`data/pokemon_graphics/front_pic_anims.h:2930-2938`), a
 * real 5-command "breathing" `ANIMCMD_FRAME` sequence alternating frame 0
 * (`grovyleFrontSprite.tileset`) and frame 1 (`.frame2`) with its own
 * per-command tick durations (`battleAnimTables.grovyleFrontAnim`, extracted
 * verbatim from that source table). A prior
 * session's claim ("frame 2 throughout, reverts to frame 1 at
 * `GROVYLE_MATERIALIZE_TICK`") was pixel-evidence gathered through the
 * broken affine formula below (§7.16's own unconfirmed residual) and didn't
 * hold up: RAM-probed directly this session (`gSprites[8].animCmdIndex`,
 * `tools/probe/specs/sendout-grovyle-frame.json`) - the command sequence
 * starts at RAM tick 1496 (render 1497, this window's established +1 lag),
 * confirmed by its own per-command durations (10,18,7,12,6 RAM ticks) landing
 * exactly on every `animCmdIndex` transition. `frontSpriteAnimFrame` is a
 * generic reducer over the extracted steps (same shape as
 * `affineEmergeAccumulator`), anchored at `GROVYLE_FRONT_ANIM_START_OFFSET`.
 *
 * RAM-probed directly (`tools/probe/specs/sendout-grovyle-stretch.json`,
 * `gSprites[8]` - `gBattlerSpriteIds[1]` confirmed 8 from tick 1461 on,
 * §7.10 - `data[4]`/`data[5]`/`y2`, the exact `xScale`/`yScale`/vertical-
 * offset args `Anim_VerticalStretch` feeds `SetAffineData`/`ObjAffineSet`)
 * rather than reimplemented from `Sin()` source math, per this run's "RAM/
 * groundtruth over source formulas" rule - avoids any `gSineTable` rounding
 * risk for a mechanism that must be pixel-exact for dozens of ticks.
 * `GROVYLE_STRETCH_TABLE[i]` is RAM tick `1503+i`'s post-tick data (36
 * entries, RAM 1503-1538 - beyond that the sprite is already settled at
 * neutral (256,256,0), confirmed by the same probe holding flat through
 * 1549). Applied with this window's established 1-tick render lag
 * (`renderTick = ramTick + 1`, the same family as every other sprite/
 * register here) - re-confirmed for THIS mechanism specifically by brute-
 * force testing lag candidates 0-7 directly against the oracle's own
 * captures rather than assumed: lag 1 gives an exact pixel match on 38 of
 * the 40 covered render ticks (`tools/compare/scratch/grovyle_full_check.mjs`,
 * throwaway).
 *
 * The concurrent ball-color-tint fade-to-normal (`Task_FadeMon_ToNormal_Step`,
 * `battle_anim_throw.c:2088-2102`) was ALSO RAM-probed directly (`gTasks[3]`,
 * `tools/probe/specs/sendout-grovyle-taskfade.json`): `tCoeff` blends from 16
 * (fully tinted, matching mechanism 4's own flat-cutoff value) down by 1
 * every tick for 15 ticks (handoffTick+42 through +56, i.e. render
 * 1504-1518), then the true normal palette (`coeff=0`) - the task's own
 * last real call uses `coeff=1`, never a literal 0, but that residual 1/16
 * blend rounds away to zero visible change for every one of GROVYLE's own
 * palette colors (confirmed directly: plain/unblended rendering from render
 * tick 1519 on is an exact pixel match against the oracle).
 *
 * **§7.16's "known residual" (render 1536/1537) is RESOLVED** by §7.17's two
 * fixes below (the direct, unInverted `xScale`/`yScale` matrix convention in
 * `drawSpriteSheetAffineStretch`, and this frame-cadence correction) - it
 * was never an isolated 2-tick anomaly, just two of the many ticks broken by
 * the same two root causes across the whole window (full account in
 * `docs/battle-scene-notes.md` §7.17).
 */
const GROVYLE_FRONT_ANIM_START_OFFSET = 35; // et (t-handoffTick) of RAM tick 1496's render (1497) - see the module doc above
function frontSpriteAnimFrame(steps: readonly { frame: 0 | 1; duration: number }[], localOffset: number): 0 | 1 {
  let consumed = 0;
  for (const step of steps) {
    if (localOffset < consumed + step.duration) return step.frame;
    consumed += step.duration;
  }
  return steps[steps.length - 1]!.frame;
}
const GROVYLE_STRETCH_TABLE: readonly { xScale: number; yScale: number; y2: number }[] = [
  { xScale: 263, yScale: 239, y2: -2 }, { xScale: 264, yScale: 236, y2: -2 }, { xScale: 265, yScale: 234, y2: -2 },
  { xScale: 266, yScale: 231, y2: -3 }, { xScale: 267, yScale: 221, y2: -4 }, { xScale: 268, yScale: 222, y2: -4 },
  { xScale: 268, yScale: 229, y2: -3 }, { xScale: 269, yScale: 231, y2: -3 }, { xScale: 270, yScale: 222, y2: -4 },
  { xScale: 270, yScale: 213, y2: -5 }, { xScale: 271, yScale: 215, y2: -5 }, { xScale: 271, yScale: 223, y2: -4 },
  { xScale: 271, yScale: 225, y2: -3 }, { xScale: 271, yScale: 218, y2: -4 }, { xScale: 272, yScale: 209, y2: -5 },
  { xScale: 271, yScale: 212, y2: -5 }, { xScale: 271, yScale: 222, y2: -4 }, { xScale: 271, yScale: 226, y2: -3 },
  { xScale: 271, yScale: 219, y2: -4 }, { xScale: 270, yScale: 213, y2: -5 }, { xScale: 270, yScale: 216, y2: -5 },
  { xScale: 269, yScale: 227, y2: -3 }, { xScale: 269, yScale: 232, y2: -3 }, { xScale: 268, yScale: 227, y2: -3 },
  { xScale: 267, yScale: 228, y2: -3 }, { xScale: 266, yScale: 230, y2: -3 }, { xScale: 265, yScale: 233, y2: -2 },
  { xScale: 264, yScale: 235, y2: -2 }, { xScale: 263, yScale: 238, y2: -2 }, { xScale: 262, yScale: 241, y2: -1 },
  { xScale: 261, yScale: 244, y2: -1 }, { xScale: 259, yScale: 247, y2: -1 }, { xScale: 258, yScale: 250, y2: 0 },
  { xScale: 257, yScale: 253, y2: 0 }, { xScale: 256, yScale: 256, y2: 0 }, { xScale: 256, yScale: 256, y2: 0 },
];
/**
 * §7.22/§7.23: mechanism 5's matrix write starts 7 RAM ticks before render
 * 1504 (`GROVYLE_STRETCH_TABLE[0]`'s own tick) - RAM ticks 1496-1502 (et
 * 35-41 via the established +1 render lag), read from the same already-
 * committed `sendout-grovyle-stretch.json` probe run (just further into its
 * existing output, no new spec needed). `GROVYLE_STRETCH_EARLY_TABLE[i]` is
 * RAM tick `1496+i`'s post-tick `(d4, d5, y2)`, literal, same "RAM ground
 * truth over curve-fit" precedent as `GROVYLE_STRETCH_TABLE`, EXCEPT entry 0
 * (RAM 1496, the exact tick the sprite callback switches, §7.17): the raw
 * field read is `(0,0,0)`, but feeding that literally into
 * `drawSpriteSheetAffineStretch` (`mx=my=0`) degenerates to sampling a
 * single source texel for the ENTIRE destination box - a real-hardware
 * affine-matrix artifact, but one that's provably not what's actually
 * latched for this render: render 1497's own oracle pixels (checked
 * directly, `tools/compare/scratch/band_diag.mjs`) are a near-exact match
 * (3px, the already-known ball-occlusion residual, §7.21) to mechanism 4's
 * OWN saturated-neutral tail silhouette, not a solid tint block - i.e. the
 * `data[4]/data[5]` C-level fields have been reset for the callback switch
 * this tick, but the OAM matrix register itself (`gOamMatrices[2]`) hasn't
 * been recomputed from them YET (an extra one-tick lag on top of the
 * already-established RAM-to-render lag, specific to a callback's first
 * tick) - so render 1497 still shows whatever was latched last: the neutral
 * matrix. Substituting neutral (256,256,0) for this one entry (rather than
 * the literal (0,0,0) capture) reproduces that exactly, verified pixel-exact
 * against the oracle below. RAM 1503's value `(263,239,-2)` is bit-exact
 * `GROVYLE_STRETCH_TABLE[0]`, confirming the two probe reads agree at the
 * seam and this table needs no 8th entry.
 */
const GROVYLE_STRETCH_EARLY_TABLE: readonly { xScale: number; yScale: number; y2: number }[] = [
  { xScale: 256, yScale: 256, y2: 0 }, // RAM 1496 raw (0,0,0) not yet latched - see doc comment above
  { xScale: 256, yScale: 256, y2: 0 },
  { xScale: 257, yScale: 254, y2: 0 },
  { xScale: 258, yScale: 251, y2: 0 },
  { xScale: 259, yScale: 248, y2: -1 },
  { xScale: 260, yScale: 245, y2: -1 },
  { xScale: 262, yScale: 241, y2: -1 },
];
/** handoffTick+42 through +56 (15 ticks): tCoeff 15 down to 1 (RAM-probed, see the module doc above); et>56 is the true normal palette. */
function grovyleStretchTintCoeff(localOffset: number): number {
  return Math.max(0, 15 - localOffset);
}
/** `BlendPalette`'s own 5-bit-channel blend (`palette.c`), same shape as `blendComponentToWhite` but toward an arbitrary target color, not just white. */
function blendComponentToward(component8: number, target8: number, coeff: number): number {
  const c5 = component8 >> 3;
  const t5 = target8 >> 3;
  const b5 = c5 + (((t5 - c5) * coeff) >> 4);
  return (b5 << 3) | (b5 >> 2);
}
/**
 * Same nearest-neighbor affine sampling as `drawSpriteSheetAffineTinted`, but with INDEPENDENT x/y scale (a true stretch, not uniform), a vertical pixel offset, and the sprite's OWN palette (optionally blended toward `tintColor` at `tintCoeff`) instead of a flat tint.
 *
 * §7.17: `xScale`/`yScale` here are used AS THE MATRIX VALUE DIRECTLY (`mx=xScale`), NOT inverted (`0x10000/xScale`, mechanism 4's own convention). Root cause: real `ObjAffineSet` (BIOS SWI 0x0E) computes `pa=xScale*cos(theta)`/`pd=yScale*cos(theta)` - with `Anim_VerticalStretch`'s `rotation` always literally 0 (`cos(0)=1.0` exactly, no lookup-table rounding since it's not table-driven here), the OAM matrix element IS `xScale`/`yScale` verbatim, not their reciprocal. `SetAffineData`/`ObjAffineSet` never divides for this mechanism. Validated by brute-forcing both conventions against the RAM-exact `GROVYLE_STRETCH_TABLE` params across all 40 covered oracle-captured render ticks (`tools/compare/scratch/grovyle_formula_sweep.mjs`): the inverted convention only ever matched the near-neutral tail (a coincidence - `0x10000/256===256`, the two conventions agree exactly at the identity point and diverge everywhere else); the direct convention matches far more ticks and is the one kept here. (Mechanism 4's own `drawSpriteSheetAffineTinted` is left as-is, out of this fix's scope - untouched code, no regression risk - though the same BIOS mechanism suggests it may have a latching analogous residual, unconfirmed.)
 */
function drawSpriteSheetAffineStretch(
  fb: Uint8Array,
  tileset: Tileset,
  palette: RgbColor[],
  ox: number,
  oy: number,
  xScale: number,
  yScale: number,
  y2: number,
  tintColor: RgbColor,
  tintCoeff: number,
): void {
  const w = tileset.columns * 8;
  const h = tileset.rows * 8;
  const halfW = w / 2;
  const halfH = h / 2;
  const mx = xScale;
  const my = yScale;
  for (let dy = 0; dy < h; dy += 1) {
    const ry = dy - halfH;
    const sy = ((ry * my) >> 8) + halfH;
    if (sy < 0 || sy >= h) continue;
    const tileRow = Math.floor(sy / 8);
    const inTileY = sy % 8;
    for (let dx = 0; dx < w; dx += 1) {
      const rx = dx - halfW;
      const sx = ((rx * mx) >> 8) + halfW;
      if (sx < 0 || sx >= w) continue;
      const tile = tileset.tiles[tileRow * tileset.columns + Math.floor(sx / 8)];
      if (!tile) continue;
      const idx = tile[inTileY * 8 + (sx % 8)]!;
      if (idx === 0) continue;
      const c = palette[idx];
      if (!c) continue;
      const color = tintCoeff > 0
        ? { r: blendComponentToward(c.r, tintColor.r, tintCoeff), g: blendComponentToward(c.g, tintColor.g, tintCoeff), b: blendComponentToward(c.b, tintColor.b, tintCoeff) }
        : c;
      setPixel(fb, ox + dx, oy + dy + y2, color);
    }
  }
}

/**
 * `docs/battle-menu-notes.md` §3 item 4 / `battleMenu.ts`'s `playerThrowBallSpin`:
 * this engine's first TRUE-rotation affine OAM sampler - mechanism 4/5 above
 * both special-case `rotation=0` (`pb=pc=0`, a pure diagonal scale matrix), so
 * neither generalizes to the thrown ball's actual GBA "spin" affine anim.
 * Real GBA affine OBJ sampling (`sprite.c:1302-1313`'s `ObjAffineSet`, the
 * same BIOS SWI 0x0E mechanism `docs/battle-scene-notes.md` §7.17 already
 * named): for a destination pixel offset `(rx,ry)` from the sprite's OWN
 * center, the sampled source texel is `((rx*pa+ry*pb)>>8+halfW,
 * (rx*pc+ry*pd)>>8+halfH)` - the direct 2x2-matrix generalization of
 * mechanism 4/5's own `(rx*matrixParam)>>8` (which is this formula
 * specialized to `pb=pc=0`, `pa=pd=matrixParam`). `ST_OAM_AFFINE_DOUBLE`
 * (`sBallOamData.affineMode`, `pokeball.c:95`) doubles the destination scan
 * window to 32x32 (still centered on the sprite's real x/y) so a rotated
 * 16x16 source isn't corner-clipped - mechanism 4/5 never needed this since
 * neither ever rotates away from its axis-aligned bounding box.
 */
function drawSpriteSheetAffineRotate(
  fb: Uint8Array,
  tileset: Tileset,
  palette: RgbColor[],
  centerX: number,
  centerY: number,
  pa: number,
  pb: number,
  pc: number,
  pd: number,
): void {
  const w = tileset.columns * 8;
  const h = tileset.rows * 8;
  const halfW = w / 2;
  const halfH = h / 2;
  for (let dy = -h; dy < h; dy += 1) {
    for (let dx = -w; dx < w; dx += 1) {
      const sx = ((dx * pa + dy * pb) >> 8) + halfW;
      const sy = ((dx * pc + dy * pd) >> 8) + halfH;
      if (sx < 0 || sx >= w || sy < 0 || sy >= h) continue;
      const tile = tileset.tiles[Math.floor(sy / 8) * tileset.columns + Math.floor(sx / 8)];
      if (!tile) continue;
      const idx = tile[(sy % 8) * 8 + (sx % 8)]!;
      if (idx === 0) continue;
      const c = palette[idx];
      if (!c) continue;
      setPixel(fb, centerX + dx, centerY + dy, c);
    }
  }
}

function drawGrovyleStretch(fb: Uint8Array, t: number, handoffTick: number): void {
  const local = t - handoffTick - MATERIALIZE_END_OFFSET;
  if (local < 0) return;
  const entry = GROVYLE_STRETCH_TABLE[Math.min(local, GROVYLE_STRETCH_TABLE.length - 1)]!;
  const coeff = grovyleStretchTintCoeff(local);
  const frameOffset = t - handoffTick - GROVYLE_FRONT_ANIM_START_OFFSET;
  const frame = frontSpriteAnimFrame(battleAnimTables.grovyleFrontAnim.steps, frameOffset);
  drawSpriteSheetAffineStretch(
    fb,
    frame === 0 ? grovyleFrontSprite.tileset : grovyleFrontSprite.frame2,
    grovyleFrontSprite.palette,
    GROVYLE_CORNER.x,
    GROVYLE_CORNER.y,
    entry.xScale,
    entry.yScale,
    entry.y2,
    MATERIALIZE_TINT_COLOR,
    coeff,
  );
}

/**
 * §7.22/§7.23: the et 35-41 portion of mechanism 5 (`GROVYLE_STRETCH_EARLY_TABLE`) -
 * a separate call site, not a widened `drawGrovyleStretch` window, because it
 * must be drawn in mechanism 4's OLD slot (before `drawSendOutBall`/
 * `drawBallOpenParticles`), not mechanism 5's own later slot. §7.22 found
 * this the hard way: naively widening `drawGrovyleStretch` in its EXISTING
 * (late) call site made render 1497 WORSE (Grovyle-region diff 3px -> 114px)
 * because the ball-open particle burst (mechanism 3) is still active for et
 * 35-41 and must occlude Grovyle, same as it already correctly does through
 * mechanism 4's call site. Mechanism 5's own original window (et>=42) never
 * needed this ordering because by then the particles have mostly cleared
 * this screen region. Tint coefficient is pinned at 16 (fully tinted, same
 * as mechanism 4's own flat cutoff value) rather than `grovyleStretchTintCoeff`
 * (which assumes `local>=0`, i.e. et>=42) - RAM-confirmed separately
 * (§7.16/§7.21) that `Task_FadeMon_ToNormal`'s poll-gate doesn't start
 * decaying it until et 42 either way.
 */
function drawGrovyleStretchEarly(fb: Uint8Array, t: number, handoffTick: number): void {
  const et = t - handoffTick;
  if (et < GROVYLE_FRONT_ANIM_START_OFFSET || et >= MATERIALIZE_END_OFFSET) return;
  const entry = GROVYLE_STRETCH_EARLY_TABLE[et - GROVYLE_FRONT_ANIM_START_OFFSET]!;
  const frameOffset = et - GROVYLE_FRONT_ANIM_START_OFFSET;
  const frame = frontSpriteAnimFrame(battleAnimTables.grovyleFrontAnim.steps, frameOffset);
  drawSpriteSheetAffineStretch(
    fb,
    frame === 0 ? grovyleFrontSprite.tileset : grovyleFrontSprite.frame2,
    grovyleFrontSprite.palette,
    GROVYLE_CORNER.x,
    GROVYLE_CORNER.y,
    entry.xScale,
    entry.yScale,
    entry.y2,
    MATERIALIZE_TINT_COLOR,
    16,
  );
}

/**
 * §7.4.2/mechanism 3 (`docs/battle-anim-assets.md` §1): the ball-open
 * particle burst - `AnimateBallOpenParticles(sprite->x, sprite->y - 5, 1,
 * 28, ballId)` (`pokeball.c:757`), same release tick as mechanism 4.
 * `gSineTable`-driven radial motion, source-exact (`trig.c:515-523`:
 * `Sin(i,r) = (r * gSineTable[i]) >> 8`, `Cos(i,r) = Sin(i+64,r)`,
 * `gSineTable[i] = round(sin(i*pi/128)*256)` - a Q8.8 256-entry table, not
 * refit here). `PokeBallOpenParticleAnimation` (`battle_anim_throw.c:
 * 1599-1637`) spawns one particle per game tick for 16 ticks (task's own
 * `data[0]` 0..15 = logical spawn tick relative to release), angle
 * `(data[0] % 8) * 32` (GBA angle units, 8 directions 45deg apart, two
 * particles per direction across the 16 spawns). Each particle's own
 * timeline (`PokeBallOpenParticleAnimation_Step1`/`_Step2`, :1642-1657):
 * `age` ticks since ITS OWN spawn - age 0 renders at the raw origin
 * (`x2=y2=0`, sprite-default); `Step1` (age 1) is a one-tick no-op (its
 * `data[1]` starts at exactly 0, so the `if (data[1]==0)` branch fires
 * immediately, no actual wait); `Step2` then runs once per age from age 1
 * onward, each call USING the CURRENT radius (0 the first time, since
 * `data[1]` hadn't been incremented yet) then adding 2 - so age 1 also
 * renders at radius 0 (visually identical to age 0), age 2 at radius 2,
 * ..., age k (k>=1) at radius `2*(k-1)`, destroyed once radius would reach
 * 50 (age 26) - 26 visible ages (0-25) per particle, matching the doc's
 * own "25 ticks of growth" (Step2 itself) plus the 1 static age-0/1
 * pair. Own anim (`sAnim_RegularBall`/`regularBallAnim`) restarts at each
 * particle's own spawn, frame = `age % 6` (all durations 1).
 *
 * **Origin + the uniform 1-tick render lag** (same lag family as every
 * other sprite/register in this window, applied here too since a
 * logical-tick-0 particle - default x2=y2=0 - must render at the raw
 * origin the tick AFTER its logical spawn, not the same tick, to match
 * observed pixels): (172,55), pixel-cross-validated against
 * `docs/battle-anim-assets.md` §4's own independently-harvested ticks
 * (from a *different* trace, sharing this trace's own already-confirmed
 * identical ball corner (168,56), mechanism 2) - that doc's own tile0/1/2
 * positions ((172,55)@1481, (172,55)@1482, (172,57)@1483, particle angle
 * 0) match this exact formula bit-for-bit: age0(1481)=origin,
 * age1(1482)=origin (Step1 no-op + Step2's own first radius-0 call both
 * render as origin), age2(1483)=Cos(0,2)=+2 y (origin+(0,2), i.e. (172,57)
 * - EXACT). This session's own attempt to re-verify directly against THIS
 * trace's cached captures was inconclusive (`tools/compare/scratch/
 * probe_particle.mjs`, throwaway) - the particle palette coincidentally
 * shares exact RGB values with the ball-open frame's own art
 * ((255,173,0)/(255,255,255)), and the two sprites heavily overlap in
 * screen space during the particles' earliest, smallest-radius ticks, so
 * color-based isolation couldn't disambiguate them; the analytical
 * cross-trace match above is the verification this session actually has.
 * **Not implemented**: WIN0 clipping (unlike `drawSpriteSheetWindowed`,
 * mirroring `drawSendOutBall`'s own same simplification - out of scope for
 * this pass). Z-order between particles is now a real per-tick
 * `SortSprites`-derived Y-sort (§7.26/§7.27, `sortAliveParticlesByScreenY`),
 * not spawn-index order - see that function's own doc comment.
 */
const PARTICLE_ORIGIN = { x: 172, y: 55 };
const PARTICLE_SPAWN_COUNT = 16;
const PARTICLE_MAX_AGE = 24;
/**
 * §7.18: the prior session's empirical hard cutoff (render tick 1493, i.e.
 * logical tick 12) is now root-caused and REMOVED - RAM-probed directly
 * (`tools/probe/ram-probe.py` against `tools/compare/traces/sendout.json`'s
 * own segments so tick numbers line up 1:1 with this window's established
 * numbering; watches `gSprites[6/9-23]` - the particles' own slots, found by
 * cross-referencing `dump-task-and-sprite-callbacks.py`'s callback dump
 * against `PokeBallOpenParticleAnimation_Step1`/`_Step2`'s ELF addresses -
 * and `gTasks[2]` - the spawner task itself). Ground truth: **the whole
 * particle subsystem (spawner task AND all already-alive particles'
 * `x2`/`y2`/`animCmdIndex`) freezes for exactly ONE real game tick**, RAM
 * tick 1494 duplicating RAM tick 1493 verbatim (`gTasks[2].data[0]` stays 14
 * across both ticks; every already-spawned particle's `x2`/`y2` is
 * bit-identical across both ticks) - not a particle-specific bug, a
 * whole-frame engine stall (cause not reverse-engineered - a task/sprite
 * list-relinking hiccup is one plausible source, not confirmed; the ONE
 * observed occurrence is treated as ground truth here regardless of cause).
 * This single stall is the root cause the prior session's cutoff had
 * (unknowingly) found the edge of: the naive age model assumed monotonic
 * ticks, so every already-spawned particle silently ran one tick "ahead" of
 * real RAM once the stall passed, and the two not-yet-spawned particles
 * (spawn indices 14/15) were themselves delayed a tick too (the spawner's
 * own `data[0]` increment froze the same tick). Both are corrected below via
 * `logicalT`-relative offsets, not hardcoded absolute ticks.
 *
 * `PARTICLE_STALL_LOGICAL_TICK = 13` is the prior session's OWN
 * pixel-brute-forced boundary ("every tick from logical 13 on is strictly
 * worse"), reused directly rather than re-derived from the RAM ticks above -
 * the two don't translate 1:1 by simple arithmetic (this session tried;
 * RAM-tick math implies logical 15, but that value regressed the
 * already-exact render tick 1522 when tested against the live oracle, while
 * the prior session's own pixel-derived 13 - paired with `PARTICLE_MAX_AGE`
 * tightened 25->24 below - reproduces the correct boundary). The mismatch is
 * a real, open finding: RAM register state and what's actually composited to
 * screen that same tick are NOT the same clock for this mechanism (a raw
 * register read is not proof of on-screen timing) - flagged rather than
 * papered over. The age<->radius/frame formulas themselves (`age<=1 ? 0 :
 * 2*(age-1)` / `anim[age % anim.length]`) are UNCHANGED from the prior
 * session, since they were already pixel-validated for ages 0-12 and a
 * from-RAM-registers rederivation of them (tried this session) measurably
 * hurt that already-good region when checked against the live oracle.
 *
 * `PARTICLE_MAX_AGE` tightened 25->24: a particle's final RAM write (age 25,
 * radius 48) happens the SAME tick `DestroyBallOpenAnimationParticle` runs,
 * so it is never actually composited on screen - rendering it anyway
 * regressed the already-bit-exact render tick 1522 (caught by the full
 * 19-trace sweep before landing, not shipped broken).
 */
const PARTICLE_STALL_LOGICAL_TICK = 13;
const PARTICLE_LATE_SPAWN_START_INDEX = 14;

/** `Sin(index, amplitude)` (`trig.c:515-517`): `gSineTable` is a 256-entry (period) Q8.8 sine table, `(amplitude * gSineTable[index]) >> 8` - reproduced via `Math.sin` at the same Q8.8 rounding rather than a literal 256-entry copy (this mechanism doesn't gate any full-frame match, see the module doc above). */
function gbaSin(index: number, amplitude: number): number {
  const i = ((index % 256) + 256) % 256;
  const q88 = Math.round(Math.sin((i * Math.PI) / 128) * 256);
  return (amplitude * q88) >> 8;
}
/** `Cos(index, amplitude) = Sin(index + 64, amplitude)` (`trig.c:521-523`). */
function gbaCos(index: number, amplitude: number): number {
  return gbaSin(index + 64, amplitude);
}

export type AliveParticle = { i: number; age: number; dx: number; dy: number };

/**
 * §7.26 OAM-priority-compositor model, `struct OamData.priority`/
 * `struct Sprite.subpriority` literals, source-verified against
 * `reference/pokeemerald`: `sBallOamData.priority` (`pokeball.c` ~line 104,
 * shared by every send-out/materialize ball sprite) vs. the literal
 * `1, 28` `AnimateBallOpenParticles` passes for the whole particle burst
 * (`pokeball.c:441` opponent, `:757` player). Lower `oam.priority` wins
 * (renders on top) unconditionally in `SortSprites` (`sprite.c:372-467`)
 * regardless of screen position or subpriority - since
 * `PARTICLE_OAM_PRIORITY < BALL_OAM_PRIORITY`, the particle burst always
 * renders on top of the ball sprite it shares screen space with, which is
 * why `drawSendOutBall`/`drawPlayerBallOpen` are called before
 * `drawBallOpenParticles`/`drawPlayerBallOpenParticles` in
 * `drawSendOutHandoff` below (painter's-algorithm draw order = later-drawn
 * wins, matching the lower-OAM-priority-wins rule).
 */
export const BALL_OAM_PRIORITY = 2;
export const PARTICLE_OAM_PRIORITY = 1;
export const PARTICLE_OAM_SUBPRIORITY = 28;

/**
 * §7.26's real `SortSprites()` model, applied: every particle in one burst
 * shares the exact same literal `oam.priority`/`subpriority`
 * (`AnimateBallOpenParticles`, `pokeball.c:441,757` - both call sites pass
 * literal `1, 28`), so two same-burst particles NEVER resolve their relative
 * order via priority/subpriority - the entire rule is `SortSprites`'s Y
 * tie-break (`sprite.c:372-467`): ascending by `oam.y` (`origin.y + dy` here,
 * the constant origin/centerToCornerVec offset cancels out of the
 * comparison), and on an EXACT Y tie, the insertion sort's strict `<`
 * swap condition never fires, so original `sSpriteOrder` order (ascending
 * sprite-slot/creation-order, i.e. ascending spawn index `i`) survives -
 * meaning the OLDER (lower-index) particle keeps the lower final OAM index,
 * i.e. renders ON TOP. Draw order is a painter's algorithm (later draws
 * overwrite), so: sort ascending by `dy` (lowest Y drawn first/most
 * background, highest Y drawn last/on top), tie-broken by DESCENDING index
 * (so within a tie the newest is drawn first and the oldest is drawn last,
 * landing on top) - this is the exact rule the player-side function's own
 * prior static "descending spawn index" fit (§7.20-era, superseded below)
 * was curve-fitting for its own narrow radius~0 window; this generalizes it
 * to every tick instead of just that one.
 */
export function sortAliveParticlesByScreenY(alive: readonly AliveParticle[]): AliveParticle[] {
  return alive.slice().sort((a, b) => a.dy - b.dy || b.i - a.i);
}

/** `clipBottom` (screen y at/below which pixels are skipped) is only used by the player-side call site - the opponent's own particle field is never occluded at its screen position, so its call omits it. */
function drawParticleTile(fb: Uint8Array, tileIndex: number, hFlip: boolean, ox: number, oy: number, clipBottom?: number): void {
  const tile = battleAnimParticles.tileset.tiles[tileIndex];
  if (!tile) return;
  for (let py = 0; py < 8; py += 1) {
    const y = oy + py;
    if (clipBottom !== undefined && y >= clipBottom) continue;
    for (let px = 0; px < 8; px += 1) {
      const sx = hFlip ? 7 - px : px;
      const idx = tile[py * 8 + sx]!;
      if (idx === 0) continue;
      const c = battleAnimParticles.palette[idx];
      if (!c) continue;
      setPixel(fb, ox + px, y, c);
    }
  }
}

function drawBallOpenParticles(fb: Uint8Array, t: number, handoffTick: number): void {
  const logicalT = t - handoffTick - BALL_OPEN_START_OFFSET - 1;
  if (logicalT < 0) return;
  const anim = battleAnimParticles.regularBallAnim;
  const alive: AliveParticle[] = [];
  for (let i = 0; i < PARTICLE_SPAWN_COUNT; i += 1) {
    let age = logicalT - i;
    if (i >= PARTICLE_LATE_SPAWN_START_INDEX) {
      age -= 1;
    } else if (logicalT >= PARTICLE_STALL_LOGICAL_TICK) {
      age -= 1;
    }
    if (age < 0 || age > PARTICLE_MAX_AGE) continue;
    const angle = (i % 8) * 32;
    const radius = age === 0 ? 0 : 2 * (age - 1);
    alive.push({ i, age, dx: gbaSin(angle, radius), dy: gbaCos(angle, radius) });
  }
  for (const p of sortAliveParticlesByScreenY(alive)) {
    const frame = anim[p.age % anim.length]!;
    drawParticleTile(fb, frame.tile, frame.hFlip, PARTICLE_ORIGIN.x + p.dx, PARTICLE_ORIGIN.y + p.dy);
  }
}

/**
 * PLAYER-side analogue of `drawBallOpenParticles` (docs/battle-menu-notes.md
 * §3 item 5, docs/battle-anim-assets.md §5's own player-window particle-tile
 * cross-check). Same `AnimateBallOpenParticles`/`PokeBallOpenParticleAnimation`
 * source mechanism (`pokeball.c:757`, called from the same battler-generic
 * `SpriteCB_ReleaseMonFromBall` this module's own `drawPlayerMaterialize`/
 * `drawPlayerBallOpen` already model for the player's ONIX release) - only the
 * origin and the anchor tick differ per side, not the age/radius/frame math.
 *
 * **Origin, brute-force pixel-fit (not geometry-assumed)**: at
 * `PLAYER_BG_FADE_START_TICK` (1653, logical tick 0) only ONE particle is
 * ever visible (spawn index 0, age 0, radius 0 - no `dx`/`dy` offset), so its
 * tile is isolated with nothing else overlapping - searched every top-left
 * offset in a generous window against the oracle's tile-0 pixels
 * (`tools/compare/scratch/menu-audit/fit_player_particle_origin.mjs`):
 * `(68,106)` scores 13/14 opaque pixels exact, the best fit by a wide margin
 * (next-best candidate scores 3/14). This is NOT `sprite->y-5`'s center value
 * used directly as a top-left the way the opponent's own `PARTICLE_ORIGIN`
 * is - it's that center `(72,110)` (ball settled center `(72,115)`, `y-5`)
 * shifted by the tile's own half-width/height `(-4,-4)`, since
 * `drawParticleTile`'s `ox,oy` args are a top-left corner while this engine's
 * sprite x/y convention (ball, mon, particle alike) is center-based - the
 * opponent's own `(172,55)` apparently already had this folded in from ITS
 * OWN brute-force fit, not a coincidence this session re-derives differently.
 * The one non-matching pixel of the 14 (tile row 6, col 5 -> screen `(73,112)`)
 * is explained, not a residual: oracle shows a flat, uniform terrain-graphic
 * color there spanning the ENTIRE row 112 (`74,66,82`) - the exact same
 * `y>=PLAYER_BALL_OPEN_VISIBLE_BOTTOM` terrain occlusion already established
 * for the ball's own open pose (`battleMenu.ts`'s
 * `PLAYER_BALL_OPEN_VISIBLE_BOTTOM`/`playerBallOpenTopLeft`'s doc comment) -
 * particles are occluded by the same foreground terrain tile, clipped below.
 *
 * **Anchor**: logical tick 0 renders at `PLAYER_BG_FADE_START_TICK` (1653) -
 * the same tick `battleMenu.ts`'s module doc establishes as "one tick after
 * the ball's own open-pose swap", the identical render-lag convention
 * `BALL_OPEN_START_OFFSET`+1 anchors the opponent's own particle logical tick
 * 0 to (`SENDOUT_BG_FADE_START`, see that function's own doc above) - both
 * `AnimateBallOpenParticles` and `LaunchBallFadeMonTask` fire the same RAM
 * tick, so their first-visible render tick is the same tick for both
 * mechanisms, on both sides.
 *
 * **Stall/late-spawn correction, ISSUES #17**: `PARTICLE_STALL_LOGICAL_TICK`/
 * `PARTICLE_LATE_SPAWN_START_INDEX` only affect ages at logical tick 13+ (the
 * opponent's own empirically-found one-tick RAM stall past that point) - a
 * prior session left this un-ported since this window's own then-relevant
 * range stopped well short of 13. Once ISSUES #17's settle-window work
 * extended this function's own relevant range out to logical tick 39
 * (`PARTICLE_MAX_AGE`+`PARTICLE_SPAWN_COUNT`-1, i.e. render tick 1692 -
 * the particle math was already unconditionally live that far, just
 * unverified past 1663), the SAME correction the opponent's own
 * `drawBallOpenParticles` already applies turned out to be needed here too
 * - porting it verbatim (same call site, same `AnimateBallOpenParticles`
 * source function, battler-generic) closed the full residual: `tools/
 * compare/traces/menu-materialize.json` widened to 1652-1741 (+samples)
 * went from a 104px-down-to-13px tail at 1666-1692 to 0 diff everywhere,
 * confirming this is the same one-tick RAM stall on both sides, not a
 * coincidence.
 *
 * **Draw order, §7.27 update**: previously a static reversed spawn-index
 * loop (oldest-on-top), curve-fit to this window's own radius~0 overlap
 * ticks; now `sortAliveParticlesByScreenY` (§7.26's real per-tick
 * `SortSprites` Y-sort, shared with the opponent's own
 * `drawBallOpenParticles`) - the static reversed order was itself just this
 * sort's own exact-Y-tie case (see that function's doc comment), which this
 * generalizes to every tick instead of only the radius~0 ticks it was
 * fit against.
 *
 * **Verified against the oracle** (`npm run compare` against
 * `tools/compare/traces/menu-materialize.json`): with this origin, the
 * terrain clip, and the per-tick Y-sort, ticks 1652-1663 (all 12 captured
 * frames) reach 0 diff - §7.27 closed the previously-named 1657-1662
 * residual (it was this same particle-vs-particle Y z-order family, not
 * particle-vs-ball as originally guessed; the ball sprite's own higher
 * `oam.priority` (2 vs. the particles' 1) already made it lose to the
 * particle burst unconditionally, so no ball-side change was needed - see
 * `BALL_OAM_PRIORITY`/`PARTICLE_OAM_PRIORITY` above `sortAliveParticlesByScreenY`).
 * See `docs/battle-menu-notes.md` §3 item 5.
 */
const PLAYER_PARTICLE_ORIGIN = { x: 68, y: 106 };

function drawPlayerBallOpenParticles(fb: Uint8Array, t: number): void {
  const logicalT = t - PLAYER_BG_FADE_START_TICK;
  if (logicalT < 0) return;
  const anim = battleAnimParticles.regularBallAnim;
  const alive: AliveParticle[] = [];
  for (let i = 0; i < PARTICLE_SPAWN_COUNT; i += 1) {
    let age = logicalT - i;
    if (i >= PARTICLE_LATE_SPAWN_START_INDEX) {
      age -= 1;
    } else if (logicalT >= PARTICLE_STALL_LOGICAL_TICK) {
      age -= 1;
    }
    if (age < 0 || age > PARTICLE_MAX_AGE) continue;
    const angle = (i % 8) * 32;
    const radius = age === 0 ? 0 : 2 * (age - 1);
    alive.push({ i, age, dx: gbaSin(angle, radius), dy: gbaCos(angle, radius) });
  }
  for (const p of sortAliveParticlesByScreenY(alive)) {
    const frame = anim[p.age % anim.length]!;
    drawParticleTile(
      fb,
      frame.tile,
      frame.hFlip,
      PLAYER_PARTICLE_ORIGIN.x + p.dx,
      PLAYER_PARTICLE_ORIGIN.y + p.dy,
      PLAYER_BALL_OPEN_VISIBLE_BOTTOM,
    );
  }
}

/**
 * §7.4.3/mechanism 1: the opponent party-status-summary widget's despawn -
 * `Task_HidePartyStatusSummary`/`_BattleStart_1`/`SpriteCB_
 * StatusSummaryBalls_Exit` (`battle_interface.c:1671-1738,1878-1902`),
 * source-exact:
 * - **Alpha blend**: `BLDALPHA_BLEND(tBlend, 16-tBlend)`, `tBlend` starts
 *   16, decrements once every OTHER tick (`data[11]++ % 2 == 0` gate) -
 *   pixel-confirmed start tick 1463 (§7.4.3), so `blend(elapsed) =
 *   15 - floor(elapsed/2)` for `elapsed = t - handoffTick - 1`, floored at
 *   0. Applied here as a per-pixel blend toward whatever this frame has
 *   already drawn behind the icon (the same TGT1/TGT2 semantics as
 *   `blendChannel` elsewhere in this module) - correct since nothing else
 *   occupies this screen region during the handoff.
 * - **Per-icon exit slide** (`SpriteCB_StatusSummaryBalls_Exit`): each
 *   icon has a `7*(5-j)`-tick delay (reverse index order on the opponent
 *   side - source assigns `data[1]=7*i` to array slot `PARTY_SIZE-1-i`,
 *   so screen-order slot `j` gets `i=5-j`), pixel-confirmed rightward
 *   (positive x2) via direct oracle-crop inspection (icons visibly shift
 *   right and disappear off the right edge between ticks 1462-1494, not
 *   left). Once a delayed icon's own wait elapses, `x2` grows via a
 *   closed-form accumulator (`data[3] += 56` every active tick, `x2 +=
 *   data[3]>>4` using the PRE-mask value, `data[3] &= 0xFFF0` for next
 *   tick) - hand-derived to the closed form `x2(n) = 3*n*(n+1)/2` for `n`
 *   active ticks (verified by direct simulation of the source's own
 *   integer arithmetic, not fitted), an accelerating slide. Icon becomes
 *   invisible once `x2 + spriteX > 248` (off the right edge) - matches
 *   `SpriteCB_StatusSummaryBalls_Exit`'s own screen-bound check verbatim.
 * - **Bar's own exit slide** (§7.19, `SpriteCB_StatusSummaryBar_Exit`):
 *   unlike the icons, `data[1] += 32` then `&= 0xF` every active tick with
 *   NO delay gate - since 32's low 4 bits are always 0, the mask always
 *   resets `data[1]` to 0, so `x2 += data[1] >> 4` (post-add, POST-mask
 *   read next tick but the shift itself reads the pre-mask value same
 *   tick) is a constant `+2` every tick, no acceleration - closed form
 *   `x2(elapsed) = 2 * (elapsed + 1)`, same `elapsed` zero-point as the
 *   icons/blend (verified by direct simulation of the source's own
 *   integer arithmetic, not fitted). Direction: `data[0]` is halved from
 *   its entrance value (`5/2=2`, C truncating division) before the exit
 *   callback runs, staying positive, so `x2` grows (rightward, same sign
 *   as the icons and as the bar's own entrance slide). The subsprite
 *   table ALSO switches the same tick
 *   (`sStatusSummaryBar_SubspriteTable_Exit`): it keeps the entrance
 *   layout's first 3 blocks (tileOffsets 0,4,8) and the "tip" block
 *   (tileOffset 12) but inserts two EXTRA copies of the tileOffset-8
 *   block before the tip, extending the bar 128px->192px (see
 *   `EXIT_BAR_TILE_ORDER`) - this is not just a slide, the drawn shape
 *   itself widens the instant the exit begins (RAM-probed via source
 *   reading of the two exit-only `Subsprite` tables, cross-checked pixel-
 *   exact against the oracle across the whole 1463-1480 window).
 */
/** Same real-hardware target-2 rule as `blendedSetPixel` above (backdrop/BG, never another sprite already in `fb`) - see that function's doc comment. */
function blendedTile(
  fb: Uint8Array,
  tile: number[],
  palette: RgbColor[],
  hFlip: boolean,
  ox: number,
  oy: number,
  eva: number,
  evb: number,
  skip?: (x: number, y: number) => boolean,
): void {
  for (let py = 0; py < 8; py += 1) {
    for (let px = 0; px < 8; px += 1) {
      const sx = hFlip ? 7 - px : px;
      const idx = tile[py * 8 + sx]!;
      if (idx === 0) continue;
      const c = palette[idx];
      if (!c) continue;
      const x = ox + px;
      const y = oy + py;
      if (x < 0 || x >= 240 || y < 0 || y >= 160) continue;
      if (skip?.(x, y)) continue;
      const o = (y * 240 + x) * 4;
      const bg = healthboxBackgroundColorAt(x, y);
      const tgt2 = bg ?? { r: fb[o]!, g: fb[o + 1]!, b: fb[o + 2]! };
      fb[o] = blendChannel(c.r, tgt2.r, eva, evb);
      fb[o + 1] = blendChannel(c.g, tgt2.g, eva, evb);
      fb[o + 2] = blendChannel(c.b, tgt2.b, eva, evb);
      fb[o + 3] = 255;
    }
  }
}

/**
 * S7 slice B (docs/battle-menu-notes.md §10): DOUBLE_TEAM's clone animation
 * (ticks `pressTick`+47..+174) + the post-clone gap (+175..+207, no code
 * needed - the plain `drawTurnKickoffText` base already shows Grovyle
 * normally, matching the oracle's own frozen-baseline pixels there exactly)
 * + the generic stat-change banner (+208..+274). Both mechanisms erase
 * Grovyle's real-sprite footprint and redraw a blended copy in its place;
 * neither window overlaps the other or the gap, so the caller just tries
 * clones first, then the banner, then falls back to whatever the base scene
 * already drew (plain Grovyle).
 */

/** DOUBLE_TEAM's clone palette - Grovyle's own front-sprite palette blended 11/16 toward RGB_BLACK (`BlendPalette(r3, 16, 11, RGB_BLACK)`, `AnimTask_DoubleTeam`, docs/battle-move-anim-notes.md §3) - the darkened "afterimage" tint. Lazily computed once. */
let doubleTeamClonePaletteCache: RgbColor[] | null = null;
function getDoubleTeamClonePalette(): RgbColor[] {
  if (doubleTeamClonePaletteCache) return doubleTeamClonePaletteCache;
  doubleTeamClonePaletteCache = grovyleFrontSprite.palette.map((c) =>
    c ? { r: blendComponentToward(c.r, 0, 11), g: blendComponentToward(c.g, 0, 11), b: blendComponentToward(c.b, 0, 11) } : c,
  );
  return doubleTeamClonePaletteCache;
}

/**
 * Erases Grovyle's own real-sprite footprint (only the settled tileset's
 * opaque pixels, not the whole bounding box) back to the true field
 * background (`healthboxBackgroundColorAt`) - the target-hide half of
 * `monbg ANIM_ATK_PARTNER` (docs/battle-move-anim-notes.md §2, the
 * `ANIM_DEF_PARTNER` analogue §9.3 already documented for ROCK_SLIDE's own
 * target-hide), needed before drawing either the clone pair or the
 * stat-banner's own blended copy in its place.
 */
function eraseGrovyleFootprint(fb: Uint8Array): void {
  const { tileset } = grovyleFrontSprite;
  for (let ty = 0; ty < tileset.rows; ty += 1) {
    for (let tx = 0; tx < tileset.columns; tx += 1) {
      const tile = tileset.tiles[ty * tileset.columns + tx];
      if (!tile) continue;
      for (let py = 0; py < 8; py += 1) {
        for (let px = 0; px < 8; px += 1) {
          if (tile[py * 8 + px] === 0) continue;
          const x = GROVYLE_CORNER.x + tx * 8 + px;
          const y = GROVYLE_CORNER.y + ty * 8 + py;
          const bg = healthboxBackgroundColorAt(x, y);
          if (bg) setPixel(fb, x, y, bg);
        }
      }
    }
  }
}

/** Same tile-grid iteration as `drawSpriteSheet`, but through `blendedTile` (explicit `eva`/`evb`, not necessarily summing to 16 - the clone window's own flat 12/8 doesn't). */
function drawSpriteSheetBlended(
  fb: Uint8Array,
  tileset: Tileset,
  palette: RgbColor[],
  ox: number,
  oy: number,
  eva: number,
  evb: number,
  skip?: (x: number, y: number) => boolean,
): void {
  for (let ty = 0; ty < tileset.rows; ty += 1) {
    for (let tx = 0; tx < tileset.columns; tx += 1) {
      const tile = tileset.tiles[ty * tileset.columns + tx];
      if (!tile) continue;
      blendedTile(fb, tile, palette, false, ox + tx * 8, oy + ty * 8, eva, evb, skip);
    }
  }
}

/**
 * Whether the OPPONENT healthbox's own real (non-transparent) art occupies
 * screen pixel `(x, y)`, at its settled post-slide-in position
 * (`HEALTHBOX_FRAME_ORIGIN`, no `dx` - by the DOUBLE_TEAM window (tick
 * `pressTick`+47 on, deep into turn 1) the send-out slide is long settled,
 * baked statically into `menuIdleBase`'s own full-frame harvest). The
 * healthbox is a separate, higher-priority OBJ than the battler mon sprite
 * on real hardware (`battle_interface.c`'s own healthbox OAM priority sits
 * in front of the mon OBJ) - normally invisible since Grovyle's own
 * silhouette never reaches this far left, but DOUBLE_TEAM's clones can
 * (`DOUBLE_TEAM_CLONE_OFFSETS_A/B`'s largest excursions, amplitude up to
 * 42px, put the clone's own leftmost content tile within a couple columns of
 * the healthbox's right edge). Used to clip the clone draw so it doesn't
 * paint over the healthbox border - pixel-confirmed against the oracle
 * (docs/battle-menu-notes.md §10c): the previously-unexplained 4-tick, 2-7px
 * residual at ticks 2075/2082/2088/2089 was exactly this border being
 * overpainted by the clone's own chin/jaw tile detail at its most extreme
 * offsets (-41/-42), never a bug in the offset table itself (RAM-reverified
 * bit-exact at every one of those ticks first).
 */
function isOpponentHealthboxOpaqueAt(x: number, y: number): boolean {
  const { width, height, pixels } = opponentHealthboxContent;
  const lx = x - HEALTHBOX_FRAME_ORIGIN.x;
  const ly = y - HEALTHBOX_FRAME_ORIGIN.y;
  if (lx < 0 || lx >= width || ly < 0 || ly >= height) return false;
  return pixels[ly * width + lx] != null;
}

/**
 * DOUBLE_TEAM's two afterimage clones - struct-copies of Grovyle's own
 * rendered sprite (`CloneBattlerSpriteWithBlend`), each with its OWN
 * independent `x2` horizontal motion (`doubleTeamCloneOffsets`,
 * `battleMenu.ts` - NOT a mirrored `±offset` pair, see that function's own
 * doc comment for why), the darkened palette, flat `eva=12/evb=8` blend
 * (mind #112's OBJ-vs-OBJ target-2 lesson - `blendedTile` already resolves
 * target-2 from the plain background, not whatever's already in `fb`). Real
 * sprite hidden for the whole visible window. Returns whether the window is
 * active (so the caller can fall through to the stat banner otherwise).
 */
function drawDoubleTeamClones(fb: Uint8Array, t: number, pressTick: number): boolean {
  const offsets = doubleTeamCloneOffsets(t, pressTick);
  if (offsets === null) return false;
  eraseGrovyleFootprint(fb);
  const palette = getDoubleTeamClonePalette();
  const { tileset } = grovyleFrontSprite;
  drawSpriteSheetBlended(fb, tileset, palette, GROVYLE_CORNER.x + offsets.a, GROVYLE_CORNER.y, 12, 8, isOpponentHealthboxOpaqueAt);
  drawSpriteSheetBlended(fb, tileset, palette, GROVYLE_CORNER.x + offsets.b, GROVYLE_CORNER.y, 12, 8, isOpponentHealthboxOpaqueAt);
  return true;
}

/** BG1's own period for the stat-anim banner: a single 32x32 screen block (`extract-stat-anim.ts`'s own header note - `increase.bin`/`decrease.bin` are each exactly one block, no second-block row offset needed, same situation as `entrySlidePixel`'s BG1 above). */
const STAT_ANIM_BG_PERIOD = statAnimBanner.tilemaps.increase.height * 8;

/**
 * Stat-anim BG1 pixel at map coords, wrapped both axes (unlike
 * `entrySlidePixel`, which never needs a vertical wrap since THAT window's
 * own `gBattle_BG1_Y` never moves - this banner's does, `statsBannerBg1Y`).
 * `null` wherever the sampled tile pixel is transparent (index 0) - per real
 * GBA alpha-blend semantics, BG1 (TGT1) not opaque there means the
 * next-topmost layer (whatever's already in `fb`) shows raw, unblended -
 * `drawStatsBanner` below only touches `fb` when this returns non-null.
 */
function statAnimBg1PixelAt(tilemap: Tilemap, tileset: Tileset, palette: RgbColor[], mapX: number, mapY: number): RgbColor | null {
  const wrappedX = ((mapX % STAT_ANIM_BG_PERIOD) + STAT_ANIM_BG_PERIOD) % STAT_ANIM_BG_PERIOD;
  const wrappedY = ((mapY % STAT_ANIM_BG_PERIOD) + STAT_ANIM_BG_PERIOD) % STAT_ANIM_BG_PERIOD;
  const tileCol = Math.floor(wrappedX / 8);
  const tileRow = Math.floor(wrappedY / 8);
  const inTileX = wrappedX % 8;
  const inTileY = wrappedY % 8;
  const entry = tilemap.entries[tileRow * tilemap.width + tileCol];
  if (!entry) return null;
  const tile = tileset.tiles[entry.tile];
  if (!tile) return null;
  const sx = entry.hFlip ? 7 - inTileX : inTileX;
  const sy = entry.vFlip ? 7 - inTileY : inTileY;
  const idx = tile[sy * 8 + sx]!;
  if (idx === 0) return null;
  return palette[idx] ?? null;
}

/**
 * The generic stat-change banner (`General_StatsChange`,
 * `StatsChangeAnimation_Step1-3`, `src/battle_anim_utility_funcs.c:415-628` -
 * docs/battle-menu-notes.md §10a/§10c/§10d). A real BG1 layer, NOT a flat-
 * white flash (a prior session's 2-sample algebraic solve coincidentally
 * landed on white at both points it checked): `StatsChangeAnimation_Step2`
 * loads `gStatAnim_Increase_Tilemap`/`_Gfx`/`gStatAnim_Evasion_Pal` onto BG1
 * (DOUBLE_TEAM's own `EFFECT_EVASION_UP` - the only stat/direction this
 * slice wires up, per the brief's own scope; `extract-stat-anim.ts` pulls
 * the full 8-palette/2-tilemap family for future battles), and
 * `StatsChangeAnimation_Step1` sets an OBJ-WINDOW mask via a FROZEN copy of
 * Grovyle's own OAM sprite (`CreateInvisibleSpriteCopy`, `battle_anim_mons.
 * c:2323` - `objMode = ST_OAM_OBJ_WINDOW`, taken once at banner start and
 * never moved again) - exactly Grovyle's own silhouette at his current
 * (static, RAM-confirmed unmoving throughout this window) position, which is
 * why this function iterates the same `GROVYLE_CORNER`-anchored tile mask
 * `drawDoubleTeamClones` above uses, not the whole screen. Bit-exact
 * compositing per real GBA alpha-blend semantics: BG1 is TGT1 (priority 0,
 * frontmost within the window), TGT2 is ALL (whatever's already drawn -
 * Grovyle's own real, un-hidden sprite, since `drawTurnKickoffText` already
 * drew it before this runs) - blend where BG1 is opaque, else leave the
 * existing pixel raw (`statAnimBg1PixelAt`'s own `null` case).
 * `statsBannerBg1Y` (`battleMenu.ts`) reproduces `gBattle_BG1_Y`'s own
 * continuous `+3`/tick scroll bit-exact, RAM-confirmed - `gBattle_BG1_X`
 * stays 0 for a stat INCREASE (only a stat DECREASE sets it to 64, out of
 * scope this slice), so only the vertical map coordinate shifts.
 */
function drawStatsBanner(fb: Uint8Array, t: number, pressTick: number): boolean {
  const eva = statsBannerEva(t, pressTick);
  if (eva === null) return false;
  const evb = 16 - eva;
  const bg1Y = statsBannerBg1Y(t, pressTick);
  const { tileset } = grovyleFrontSprite;
  const bgTileset = statAnimBanner.tileset;
  const bgTilemap = statAnimBanner.tilemaps.increase;
  const bgPalette = statAnimBanner.palettes.evasion;
  for (let ty = 0; ty < tileset.rows; ty += 1) {
    for (let tx = 0; tx < tileset.columns; tx += 1) {
      const tile = tileset.tiles[ty * tileset.columns + tx];
      if (!tile) continue;
      for (let py = 0; py < 8; py += 1) {
        for (let px = 0; px < 8; px += 1) {
          if (tile[py * 8 + px] === 0) continue;
          const x = GROVYLE_CORNER.x + tx * 8 + px;
          const y = GROVYLE_CORNER.y + ty * 8 + py;
          if (x < 0 || x >= 240 || y < 0 || y >= 160) continue;
          const bg1c = statAnimBg1PixelAt(bgTilemap, bgTileset, bgPalette, x, y + bg1Y);
          if (!bg1c) continue;
          const o = (y * 240 + x) * 4;
          fb[o] = blendChannel(bg1c.r, fb[o]!, eva, evb);
          fb[o + 1] = blendChannel(bg1c.g, fb[o + 1]!, eva, evb);
          fb[o + 2] = blendChannel(bg1c.b, fb[o + 2]!, eva, evb);
        }
      }
    }
  }
  return true;
}

const OPP_SUMMARY_ICON_BASE = { x: 26, y: 32 };
const OPP_SUMMARY_STATES = ["Empty", "Empty", "Empty", "Full", "Full", "Full"];
const OPP_SUMMARY_BAR = { x: -24, y: 40 };

/**
 * `sStatusSummaryBar_Subsprites_Exit` (`battle_interface.c:575-625`) flattened
 * to per-8px-tile indices into the original 16-tile Enter tileset
 * (`ballStatusBar.tileset`, 4 subsprites x 4 tiles each): the exit table keeps
 * subsprites 0-2 (tileOffsets 0,4,8) unchanged, inserts TWO extra copies of
 * the tileOffset-8 block, then appends the "tip" block (tileOffset 12) last -
 * 6 subsprites x 4 tiles = 24 tiles (192px), vs. the Enter layout's 16 tiles
 * (128px). Indexed left-to-right in unflipped sprite-local space; the render
 * loop below applies the same whole-array reversal `drawBallStatusBar` uses
 * for the opponent's h-flipped bar.
 */
const EXIT_BAR_TILE_ORDER = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 8, 9, 10, 11, 8, 9, 10, 11, 12, 13, 14, 15];

/**
 * The Exit table's "tip" subsprite (tileOffset 12, the array's last entry -
 * see `EXIT_BAR_TILE_ORDER`'s own doc comment) sits at local x=64 (`32*2`,
 * `sStatusSummaryBar_Subsprites_Exit`'s last entry), 64px further right than
 * the Enter table's tip at local x=0 (`sStatusSummaryBar_Subsprites_Enter`'s
 * last entry, `32*0`) - `OPP_SUMMARY_BAR.x` was itself empirically anchored
 * to the Enter tip's mirrored screen position (`drawBallStatusBar`, settled-
 * bar rendering). Under h-flip mirroring a local-x increase becomes a
 * screen-x DECREASE of the same magnitude, so switching tables shifts the
 * render anchor by that same 64px constant (source-derived, not fitted -
 * confirmed bit-exact for 15 of the 18 target render ticks 1463-1480 by
 * direct oracle pixel diff, the other 3 attributed elsewhere below).
 */
const EXIT_BAR_TIP_LOCAL_SHIFT = 64;

/** `SpriteCB_StatusSummaryBar_Exit`'s closed form - see this function's doc comment above. */
function barExitX2(elapsed: number): number {
  return 2 * (elapsed + 1) - EXIT_BAR_TIP_LOCAL_SHIFT;
}

function opponentIconExitX(j: number, elapsed: number): number | null {
  const delay = 7 * (5 - j);
  const localTick = elapsed - delay;
  const baseX = OPP_SUMMARY_ICON_BASE.x + 10 * j;
  if (localTick < 0) return baseX;
  const n = localTick + 1;
  const offset = (3 * n * (n + 1)) / 2;
  const x = baseX + offset;
  return x > 248 ? null : x;
}

/**
 * docs/battle-menu-notes.md §3 (`Task_HidePartyStatusSummary`'s subsprite
 * split), the PLAYER-side twin of `drawOpponentSummaryExit` above -
 * `SetSubspriteTables(..., sStatusSummaryBar_SubspriteTable_Exit)`
 * (`battle_interface.c:1718`) is the exact same call and the exact same
 * shared table for both sides, so `EXIT_BAR_TILE_ORDER` is reused verbatim.
 * The only per-side difference is h-flip: `CreatePartyStatusSummarySprites`
 * only sets `oam.matrixNum = ST_OAM_HFLIP` in the `isOpponent` branch
 * (`:1499-1507`) - the player's bar sprite is drawn unflipped.
 *
 * That changes the render-anchor math entirely: `drawBallStatusBar`'s
 * unflipped loop maps tile index 0 (subsprite 0, tileOffset 0, local x=-96 -
 * the array's FIRST entry, not the tip) directly onto the render anchor
 * `ox` (`ox + tx*8`, no reversal). Subsprite 0 is IDENTICAL between the
 * Enter and Exit tables (both start `{x: 32*-3, tileOffset: 0}`) - the Exit
 * table only inserts two extra copies of the tileOffset-8 block *before*
 * the tip (see `EXIT_BAR_TILE_ORDER`'s own doc comment), so the anchor point
 * this function uses never moves when the table switches. This is why the
 * player side needs NO analogue of `EXIT_BAR_TIP_LOCAL_SHIFT` - that 64px
 * correction is purely a consequence of the opponent's h-flip mirroring
 * pegging its anchor to the TIP (the array's LAST entry) instead of the
 * first. Confirmed by exhausting the alternative (a shift constant) against
 * the oracle: any nonzero shift breaks every tick this renders exact.
 */
function playerBarExitTableActive(t: number): boolean {
  return t - 1 >= PLAYER_SUMMARY_FADE_START_TICK;
}

/** Draws the widened (24-tile) Exit subsprite layout unflipped at `barX` - see the doc comment above for why no anchor shift is needed. */
function drawPlayerSummaryBarExit(fb: Uint8Array, barX: number, eva: number): void {
  const evb = 16 - eva;
  const tiles = ballStatusBar.tileset.tiles;
  for (let tx = 0; tx < EXIT_BAR_TILE_ORDER.length; tx += 1) {
    const tile = tiles[EXIT_BAR_TILE_ORDER[tx]!];
    if (!tile) continue;
    blendedTile(fb, tile, ballStatusBar.palette, false, barX + tx * 8, 96, eva, evb);
  }
}

/**
 * §7.31 (ISSUES #18, closed render 1493) + §7.32 (closed renders 1494/1495 -
 * see the doc comment above `blendedTile` for what this reuses). Once
 * `blend` bottoms out at 0 (`elapsed>=30`), the old `if (blend <= 0) return`
 * treated that as "nothing to draw, let whatever's already painted
 * underneath (Grovyle's opaque materialize tint) show through" - but real
 * GBA OBJ-blend hardware still composites a `blend=0` sprite: at
 * `eva=0,evb=16` the blend output is 100% target-2 (`blendedTile`'s own
 * `healthboxBackgroundColorAt` fallback, the plain BG layer, per the
 * "target-2 is never another already-drawn sprite" rule `blendedSetPixel`'s
 * own doc comment already established), not a skip. RAM/VRAM-probed
 * (`tools/compare/scratch/probe_bar_vram.py`): `gSprites[6]`'s OAM `tileNum`
 * (433) and its full 16-tile OBJ VRAM range are byte-IDENTICAL to the static
 * `ballStatusBar` extraction through RAM tick 1493 (render 1494) - the bar
 * is still genuinely itself, not yet reused - then at RAM tick 1494 (render
 * 1495) `tileNum` jumps to 549 and the VRAM content there is a completely
 * unrelated graphic: the sprite slot has been destroyed and reused, exactly
 * the `open.png` runtime-VRAM-overwrite pattern (§7.25).
 *
 * §7.31 shipped `elapsed<=30` only, since naively extending the cutoff and
 * letting `elapsed` keep incrementing normally (`elapsed<=31`) over-corrects:
 * `barExitX2`'s exit-slide position keeps advancing 2px/tick past the point
 * the real sprite stopped moving, introducing 3 new wrong pixels at render
 * 1494 in the OPPOSITE direction (background painted where the oracle still
 * wants Grovyle's tint). §7.32 found the actual shape empirically (direct
 * oracle pixel search, not curve-fit): render 1494 wants the position/blend
 * computed from `elapsed=30` (i.e. IDENTICAL to render 1493 - frozen, not
 * advanced), and render 1495 wants `elapsed=31` (resumed exactly one step
 * from there, not 32). That is: the closed-form `elapsed` clock STALLS for
 * one extra tick at the render where the RAM-confirmed destroy/reuse above
 * happens (1493->1494 both read as `elapsed=30`), then resumes normal 1:1
 * counting from that point on - plausibly the same slot-transition event
 * pausing whatever internal counter drives this exit animation for one
 * tick, a one-tick engine stall of the same family as §7.18's particle
 * stall. Verified against the oracle tick-by-tick (`elapsed=30` frozen
 * closes 1494 but leaves 3px of 1495's own wider edge open; resuming at 31
 * for 1495 closes it exactly) - both now oracle-pixel-exact, 0 diff.
 * `SUMMARY_EXIT_LAST_ALIVE_ELAPSED=32` extends the draw window through
 * render 1495 only; render 1496 is a separate, unrelated residual (particle
 * z-order, ISSUES #18/§7.32) untouched by this function.
 */
const SUMMARY_EXIT_LAST_ALIVE_ELAPSED = 32;

function drawOpponentSummaryExit(fb: Uint8Array, t: number, handoffTick: number): void {
  const rawElapsed = t - handoffTick - 1;
  if (rawElapsed < 0 || rawElapsed > SUMMARY_EXIT_LAST_ALIVE_ELAPSED) return;
  // §7.32: the position/blend clock stalls one tick at the RAM-confirmed
  // destroy/reuse (renders 1493 and 1494 both read as elapsed=30), then
  // resumes normal 1:1 counting - see the doc comment above.
  const elapsed = rawElapsed <= 30 ? rawElapsed : rawElapsed - 1;
  const blend = Math.max(0, 15 - Math.floor(elapsed / 2));
  const eva = blend;
  const evb = 16 - blend;
  const barTile = ballStatusBar.tileset;
  const barX = OPP_SUMMARY_BAR.x + barExitX2(elapsed);
  for (let tx = 0; tx < EXIT_BAR_TILE_ORDER.length; tx += 1) {
    const col = EXIT_BAR_TILE_ORDER.length - 1 - tx;
    const tileIndex = EXIT_BAR_TILE_ORDER[col]!;
    const tile = barTile.tiles[tileIndex];
    if (!tile) continue;
    blendedTile(fb, tile, ballStatusBar.palette, true, barX + tx * 8, OPP_SUMMARY_BAR.y, eva, evb);
  }
  for (let j = 0; j < 6; j += 1) {
    const x = opponentIconExitX(j, elapsed);
    if (x === null) continue;
    const tileIndex = ballStateTileIndex(OPP_SUMMARY_STATES[j]!);
    const tile = ballDisplay.tileset.tiles[tileIndex];
    if (!tile) continue;
    blendedTile(fb, tile, ballDisplay.palette, false, x, OPP_SUMMARY_ICON_BASE.y, eva, evb);
  }
}

function healthboxBackgroundColorAt(x: number, y: number): RgbColor | undefined {
  const tilemap = battleBg.static.tilemap;
  const tileset = battleBg.static.tileset;
  const tileRow = Math.floor(y / 8);
  const tileCol = Math.floor(x / 8);
  const entry = tilemap.entries[tileRow * tilemap.width + tileCol];
  if (!entry) return undefined;
  const tile = tileset.tiles[entry.tile];
  if (!tile) return undefined;
  const inTileX = x % 8;
  const inTileY = y % 8;
  const sx = entry.hFlip ? 7 - inTileX : inTileX;
  const sy = entry.vFlip ? 7 - inTileY : inTileY;
  const idx = tile[sy * 8 + sx]!;
  if (idx === 0) return undefined;
  return battleBg.palette[entry.palette]?.[idx];
}

/**
 * §7.6, wired to `composeOpponentHealthbox` (ISSUES #16): opponent healthbox
 * content, translated by its slide-in `dx` - see `healthboxSlideDx`'s doc
 * comment. Was a pixel-harvested rectangular asset masked by a value-equality
 * background-bleed heuristic (§7.22/§7.23's `getHealthboxContentMask`,
 * removed) to approximate the healthbox sprite's true non-rectangular shape;
 * now draws the compositor's own canvas directly, whose null cells ARE that
 * true shape (real per-pixel OAM transparency from the frame tileset's own
 * index-0 convention, not a heuristic) - confirmed a strict superset of the
 * old heuristic's "real content" classification before wiring this in (every
 * old-heuristic content cell, plus 48 more that happen to equal the settled
 * background color exactly, so painting them changes nothing visually), and
 * cross-checked pixel-for-pixel against every oracle-pinned coordinate in
 * `tests/battleScene.test.ts`'s existing fade-window test. Clipped to screen
 * by `setPixel`, same as every other sprite draw here.
 */
function drawSendOutHealthbox(fb: Uint8Array, dx: number): void {
  const { width, height, pixels } = opponentHealthboxContent;
  for (let py = 0; py < height; py += 1) {
    for (let px = 0; px < width; px += 1) {
      const color = pixels[py * width + px];
      if (!color) continue;
      setPixel(fb, HEALTHBOX_FRAME_ORIGIN.x + dx + px, HEALTHBOX_FRAME_ORIGIN.y + py, color);
    }
  }
}

/** PLAYER-side twin of `getHealthboxContentMask` (§7.22/§7.23's own bleed-masking precedent) - same rectangular-harvest-vs-true-shape gap, same fix: mark pixels that already equal the plain background as transparent bleed. Lazily computed once. */
let menuHealthboxPlayerContentMask: Uint8Array | null = null;

function getMenuHealthboxPlayerContentMask(): Uint8Array {
  if (menuHealthboxPlayerContentMask) return menuHealthboxPlayerContentMask;
  const { x, y, width, height, pixels } = menuHealthboxPlayer;
  const mask = new Uint8Array(width * height);
  for (let py = 0; py < height; py += 1) {
    for (let px = 0; px < width; px += 1) {
      const i = (py * width + px) * 3;
      const bg = healthboxBackgroundColorAt(x + px, y + py);
      const isBleed = bg !== undefined && bg.r === pixels[i] && bg.g === pixels[i + 1] && bg.b === pixels[i + 2];
      mask[py * width + px] = isBleed ? 0 : 1;
    }
  }
  menuHealthboxPlayerContentMask = mask;
  return mask;
}

/** docs/battle-menu-notes.md §3 item 6: player healthbox content, translated by its slide-in `dx` (`playerHealthboxSlideDx`, `battleMenu.ts`) - same pixel-harvest-plus-content-mask shape as `drawSendOutHealthbox`, mirrored for the player side's own asset/mask/geometry. Unlike the opponent (`x2` starts negative and counts up toward 0), the player's own `x2` starts positive (110, off the right edge) and counts down toward 0 - `dx` is still added to the settled `x`, same as the opponent's own draw. */
function drawMenuHealthboxPlayer(fb: Uint8Array, dx: number): void {
  const { x, y, width, height, pixels } = menuHealthboxPlayer;
  const mask = getMenuHealthboxPlayerContentMask();
  for (let py = 0; py < height; py += 1) {
    for (let px = 0; px < width; px += 1) {
      if (!mask[py * width + px]) continue;
      const i = (py * width + px) * 3;
      setPixel(fb, x + dx + px, y + py, { r: pixels[i]!, g: pixels[i + 1]!, b: pixels[i + 2]! });
    }
  }
}

/** Opaque flat-RGB rectangle blit, no transparency/masking (every pixel in the harvest is real content - see `tools/extract/extract-menu-idle-window.ts`'s own doc for why this window's harvests don't need `getHealthboxContentMask`'s bleed handling: none of these ticks are mid-fade, so there's no stale-background risk). */
function drawRect(fb: Uint8Array, asset: MenuIdleFrameAsset): void {
  const { x, y, width, height, pixels } = asset;
  for (let py = 0; py < height; py += 1) {
    for (let px = 0; px < width; px += 1) {
      const i = (py * width + px) * 3;
      setPixel(fb, x + px, y + py, { r: pixels[i]!, g: pixels[i + 1]!, b: pixels[i + 2]! });
    }
  }
}

/**
 * The settled first-action-menu window (docs/battle-menu-idle-notes.md,
 * trace ticks `MENU_IDLE_BLANK_START_TICK` (1742) on) - the teal blank box,
 * the atomic menu draw, and the settled idle-bounce cycle. Composed almost
 * entirely from oracle-harvested full-frame/region content (see
 * `tools/extract/extract-menu-idle-window.ts`'s own module doc for why);
 * `menuIdleBounce` (`battleMenu.ts`) is the real closed-form generator that
 * selects which region patch(es) to composite - not a per-tick replay
 * table. Region A (onix) only ever reaches `y2=1` within this window (its
 * rare `y2=2` tick, per the closed-form, falls outside 1742-1810 - see
 * `battleMenu.ts`'s own doc comment); if a future wider window needs it,
 * `onixY2 >= 1` degrades to the same `y2=1` patch rather than crashing, a
 * named (not silent) approximation for that unmodeled state.
 */
/** The settled base (window/text content) plus the onix/healthbox idle bounce, using `bounceTick` (not necessarily `t` itself - see `drawFightSubmenuWindow`'s own callers, which pass a shifted tick for the FIGHT-submenu window's own two extra DMA-wait ticks of drift) to select the bounce phase. Factored out of `drawActionMenuIdleWindow` so the FIGHT-submenu slice can reuse the identical base+bounce compositing with a different tick input for the bounce alone. */
function drawActionMenuIdleContent(fb: Uint8Array, bounceTick: number): void {
  drawRect(fb, menuIdleBase);
  const { onixY2, healthboxY2 } = menuIdleBounce(bounceTick);
  if (onixY2 >= 1) drawRect(fb, menuIdleOnixBounce);
  if (healthboxY2 === 1) {
    drawRect(fb, { x: menuIdleHealthboxBounce.x, y: menuIdleHealthboxBounce.y, width: menuIdleHealthboxBounce.width, height: menuIdleHealthboxBounce.height, pixels: menuIdleHealthboxBounce.y1 });
  } else if (healthboxY2 >= 2) {
    drawRect(fb, { x: menuIdleHealthboxBounce.x, y: menuIdleHealthboxBounce.y, width: menuIdleHealthboxBounce.width, height: menuIdleHealthboxBounce.height, pixels: menuIdleHealthboxBounce.y2 });
  }
}

function drawActionMenuIdleWindow(fb: Uint8Array, t: number): void {
  if (t <= MENU_IDLE_BLANK_END_TICK) {
    drawRect(fb, menuIdleBlank);
    return;
  }
  drawActionMenuIdleContent(fb, t);
}

/**
 * The FIGHT submenu window (docs/battle-turn-notes.md §11 / docs/battle-
 * menu-notes.md's new section) - dispatches between the settled action menu
 * (before open / during either DMA-wait), the submenu's own static per-slot
 * content (open, using `FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT`'s empirically-fit
 * bounce-tick offset), and the resumed action menu (after close, using
 * `FIGHT_SUBMENU_RESUMED_BOUNCE_SHIFT`'s own further offset) - see
 * `battleMenu.ts`'s own doc comment on those two constants for why they
 * differ from a plain, unshifted `t`.
 */
function drawFightSubmenuWindow(fb: Uint8Array, t: number, sm: FightSubmenuState): void {
  if (sm.openElapsed === null) {
    drawActionMenuIdleWindow(fb, t);
    return;
  }
  const revealTick = TICK0 + sm.openElapsed + FIGHT_SUBMENU_OPEN_DELAY;
  if (t < revealTick) {
    // Open DMA-wait: the submenu's content is drawn off-screen, not yet
    // revealed - the screen still shows the action menu, unmodified (§11
    // finding 1's "5-tick hold" turns out to need no special-casing at all:
    // it's just this same bounce cycle naturally dwelling on one phase for
    // that span, pixel-confirmed exact with a plain, unshifted `t`).
    drawActionMenuIdleWindow(fb, t);
    return;
  }
  if (sm.closeElapsed !== null) {
    const closeRevealTick = TICK0 + sm.closeElapsed + FIGHT_SUBMENU_CLOSE_DELAY;
    if (t >= closeRevealTick) {
      drawActionMenuIdleContent(fb, t - FIGHT_SUBMENU_RESUMED_BOUNCE_SHIFT);
      return;
    }
  }
  if (sm.confirmElapsed !== null) {
    const pressTick = TICK0 + sm.confirmElapsed;
    const textStart = turnKickoffTextStartTick(pressTick);
    if (t >= textStart) {
      if (t - pressTick > STATS_BANNER_END_DELAY) {
        drawRockSlideWindow(fb, t, pressTick);
        return;
      }
      drawTurnKickoffText(fb, t, pressTick);
      if (!drawDoubleTeamClones(fb, t, pressTick)) drawStatsBanner(fb, t, pressTick);
      return;
    }
    // Engine-side turn-order/attacker resolution is in flight but not yet
    // visible - the submenu keeps showing its ordinary slot content, but the
    // onix/healthbox bounce overlay is already frozen (battleMenu.ts's new
    // Slice 7 doc comment: `DoBounceEffect` stops being polled the instant
    // the A-press hands off, not merely once the text becomes visible).
    drawRect(fb, menuIdleBase);
    const slotName = FIGHT_SUBMENU_SLOT_NAMES[sm.displayCursor];
    const patch = fightSubmenuWindow.slots[slotName]!;
    drawRect(fb, { x: fightSubmenuWindow.x, y: fightSubmenuWindow.y, width: fightSubmenuWindow.width, height: fightSubmenuWindow.height, pixels: patch });
    drawMenuIdleBounceOverlay(fb, turnKickoffBounceTick(t, pressTick));
    return;
  }
  drawRect(fb, menuIdleBase);
  const slotName = FIGHT_SUBMENU_SLOT_NAMES[sm.displayCursor];
  const patch = fightSubmenuWindow.slots[slotName]!;
  drawRect(fb, { x: fightSubmenuWindow.x, y: fightSubmenuWindow.y, width: fightSubmenuWindow.width, height: fightSubmenuWindow.height, pixels: patch });
  drawMenuIdleBounceOverlay(fb, t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT);
}

/** The onix/healthbox bounce overlay alone (`drawActionMenuIdleContent`'s own second half, factored out so `drawFightSubmenuWindow`'s frozen-bounce branch can reuse it without redrawing `menuIdleBase`). */
function drawMenuIdleBounceOverlay(fb: Uint8Array, bounceTick: number): void {
  const { onixY2, healthboxY2 } = menuIdleBounce(bounceTick);
  if (onixY2 >= 1) drawRect(fb, menuIdleOnixBounce);
  if (healthboxY2 === 1) {
    drawRect(fb, { x: menuIdleHealthboxBounce.x, y: menuIdleHealthboxBounce.y, width: menuIdleHealthboxBounce.width, height: menuIdleHealthboxBounce.height, pixels: menuIdleHealthboxBounce.y1 });
  } else if (healthboxY2 >= 2) {
    drawRect(fb, { x: menuIdleHealthboxBounce.x, y: menuIdleHealthboxBounce.y, width: menuIdleHealthboxBounce.width, height: menuIdleHealthboxBounce.height, pixels: menuIdleHealthboxBounce.y2 });
  }
}

/**
 * S7 slice A: the turn-kickoff "Foe GROVYLE used\nDOUBLE TEAM!" message
 * (`battleMenu.ts`'s new Slice 7 - see its own module doc for the full
 * derivation). Reuses this file's existing battle-text printer
 * (`drawMessageTextLines`/`battleWindow`, the same `B_WIN_MSG`-family
 * window+font+cadence already pinned for the intro text/"Go! ONIX!"/
 * send-out text) rather than a new harvest - this message is FONT_NORMAL,
 * unlike the FIGHT submenu's own FONT_NARROW move list. The battlefield
 * base (onix + healthbox, bounce tick per `turnKickoffBounceTick`) is
 * unaffected by the window swap - `drawTileBg` below fully overwrites the
 * settled action-menu's own window content with a blank box before the text
 * draws on top, the same "redraw the window, don't try to diff it" approach
 * `drawSendOutHandoff` already uses for "Go! ONIX!".
 */
function drawTurnKickoffText(fb: Uint8Array, t: number, pressTick: number): void {
  drawActionMenuIdleContent(fb, turnKickoffBounceTick(t, pressTick));
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  drawMessageTextLines(fb, TURN_KICKOFF_LINE1, TURN_KICKOFF_LINE2, turnKickoffTextVisibleChars(t, pressTick));
}

/**
 * S7 slice C (docs/battle-menu-notes.md §11, docs/battle-move-anim-notes.md
 * §9): the ROCK_SLIDE window, ticks `pressTick`+275 (right after slice B's
 * stat-change banner's own last active-but-zero-effect tick) through
 * `pressTick`+596 (right before the HP-bar drain sentinel, slice D's own
 * scope). Three phases share the same battlefield base (`drawActionMenuIdleContent`,
 * frozen bounce tick - unchanged since slice A) + message-box mechanism as
 * `drawTurnKickoffText`: (1) the held DOUBLE_TEAM text through `+283`, (2)
 * "Foe GROVYLE's evasiveness\nrose!" from `+284`, (3) "ONIX used\nROCK
 * SLIDE!" from `+393` on. Once the attack itself starts (rock spawns begin
 * at RAM tick 2347 = `+429` render), `drawRockSlideAttack` layers the BG3_Y
 * shake + falling rocks + generic hit-flash on top - the message box (BG0,
 * a separate layer on real hardware) stays fixed throughout, redrawn
 * unshifted after the shaken battlefield base per `drawRockSlideAttack`'s
 * own doc comment.
 */
function drawRockSlideWindow(fb: Uint8Array, t: number, pressTick: number): void {
  const statRoseStart = statRoseTextStartTick(pressTick);
  const rockSlideStart = rockSlideTextStartTick(pressTick);
  let line1: string;
  let line2: string;
  let chars: number;
  if (t < statRoseStart) {
    line1 = TURN_KICKOFF_LINE1;
    line2 = TURN_KICKOFF_LINE2;
    chars = turnKickoffTextVisibleChars(t, pressTick);
  } else if (t < rockSlideStart) {
    line1 = STAT_ROSE_LINE1;
    line2 = STAT_ROSE_LINE2;
    chars = statRoseTextVisibleChars(t, pressTick);
  } else {
    line1 = ROCK_SLIDE_LINE1;
    line2 = ROCK_SLIDE_LINE2;
    chars = rockSlideTextVisibleChars(t, pressTick);
  }
  drawRockSlideAttack(fb, t, pressTick);
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  drawMessageTextLines(fb, line1, line2, chars);
}

/**
 * The battlefield base, reconstructed from PRIMITIVES rather than
 * `menuIdleBase`'s flat harvest during this window alone: real hardware's
 * ROCK_SLIDE shake (`shake_mon_or_platform type=SHAKE_BG_Y`) scrolls only
 * `gBattle_BG3_Y` - `staticBgPixel`'s own BG3 tilemap sampler (this file's
 * `drawSettledScene`/scanline-shift precedent) - leaving every OBJ (Onix,
 * Grovyle, both healthboxes) at its FIXED screen position; `menuIdleBase`'s
 * own harvest bakes bg+OBJs into one flat image with no way to shift only
 * the background portion, so this window draws the background via
 * `staticBgPixel(x, y+shiftY)` and every OBJ unshifted on top instead.
 * Falling rocks (`rockSlideRockState`) and the generic hit-flash (healthbox
 * `y2` wobble + Grovyle's own blink, both `battleMenu.ts`) layer on top,
 * also unshifted (real OBJs, matching their own RAM-probed positions
 * directly).
 */
function drawRockSlideAttack(fb: Uint8Array, t: number, pressTick: number): void {
  const shiftY = rockSlideBg3Y(t, pressTick);
  drawStaticBgShiftedY(fb, shiftY);
  if (!rockSlideMonBlinkInvisible(t, pressTick)) {
    drawSpriteSheet(fb, grovyleFrontSprite.tileset, grovyleFrontSprite.palette, GROVYLE_CORNER.x, GROVYLE_CORNER.y + rockSlideMonShakeY2(t, pressTick));
  }
  drawSpriteSheet(fb, onixBackSprite.tileset, onixBackSprite.palette, ONIX_MATERIALIZE_CORNER.x, ONIX_MATERIALIZE_CORNER.y);
  const healthboxY2 = rockSlideHealthboxWobbleY2(t, pressTick);
  drawSendOutHealthbox(fb, 0);
  if (healthboxY2 !== 0) drawOpponentHealthboxWobble(fb, healthboxY2);
  drawMenuHealthboxPlayer(fb, 0);
  drawMenuIdleBounceOverlay(fb, turnKickoffBounceTick(t, pressTick));
  for (let i = 0; i < ROCK_SLIDE_ROCK_COUNT; i += 1) {
    const rock = rockSlideRockState(i, t, pressTick);
    if (!rock) continue;
    drawRockSprite(fb, rock.animNum, rock.centerX, rock.centerY);
  }
}

/** `staticBgPixel` (BG3, `battleBg.static`) sampled with a vertical scroll offset - `gBattle_BG3_Y`'s own real hardware semantics (`BG3VOFS`, a VERTICAL OFFSET added to the sampled map row for a given screen row). */
function drawStaticBgShiftedY(fb: Uint8Array, shiftY: number): void {
  for (let screenY = 0; screenY < 160; screenY += 1) {
    for (let screenX = 0; screenX < 240; screenX += 1) {
      const c = staticBgPixel(screenX, screenY + shiftY);
      if (!c) continue;
      setPixel(fb, screenX, screenY, c);
    }
  }
}

/** The real opponent healthbox sprite's own `y2` wobble (`rockSlideHealthboxWobbleY2`) - same erase-then-redraw-translated shape as `drawDoubleTeamClones`' Grovyle erase, reusing `opponentHealthboxContent`/`HEALTHBOX_FRAME_ORIGIN` (`drawSendOutHealthbox`'s own asset, translated vertically here instead of horizontally). */
function drawOpponentHealthboxWobble(fb: Uint8Array, dy: number): void {
  const { width, height, pixels } = opponentHealthboxContent;
  for (let py = 0; py < height; py += 1) {
    for (let px = 0; px < width; px += 1) {
      const color = pixels[py * width + px];
      if (!color) continue;
      const bg = healthboxBackgroundColorAt(HEALTHBOX_FRAME_ORIGIN.x + px, HEALTHBOX_FRAME_ORIGIN.y + py);
      if (bg) setPixel(fb, HEALTHBOX_FRAME_ORIGIN.x + px, HEALTHBOX_FRAME_ORIGIN.y + py, bg);
    }
  }
  for (let py = 0; py < height; py += 1) {
    for (let px = 0; px < width; px += 1) {
      const color = pixels[py * width + px];
      if (!color) continue;
      setPixel(fb, HEALTHBOX_FRAME_ORIGIN.x + px, HEALTHBOX_FRAME_ORIGIN.y + dy + py, color);
    }
  }
}

/** `rocks.png`'s frame `animNum` (0/1/2 -> tileset frame 2/3/4, `src/battle_anim_rock.c`'s `sAnims_FlyingRock`, docs/battle-move-anim-notes.md §1) at CENTER coordinates `(centerX, centerY)` (GBA OAM convention, `gOamData_AffineOff_ObjNormal_32x32` - top-left is `center - 16` each axis). Clipped to the opponent healthbox's own higher-priority OAM the same way `drawDoubleTeamClones` clips its clones (`isOpponentHealthboxOpaqueAt` - #127's z-order lesson, defensive here since the rocks' own X range rarely reaches that far left). */
function drawRockSprite(fb: Uint8Array, animNum: 0 | 1 | 2, centerX: number, centerY: number): void {
  const ox = centerX - 16;
  const oy = centerY - 16;
  const rowOffset = (animNum + 2) * 4;
  const { tileset, palette } = battleAnimRocks;
  for (let ty = 0; ty < 4; ty += 1) {
    for (let tx = 0; tx < 4; tx += 1) {
      const tile = tileset.tiles[(rowOffset + ty) * tileset.columns + tx];
      if (!tile) continue;
      for (let py = 0; py < 8; py += 1) {
        for (let px = 0; px < 8; px += 1) {
          const idx = tile[py * 8 + px]!;
          if (idx === 0) continue;
          const c = palette[idx];
          if (!c) continue;
          const x = ox + tx * 8 + px;
          const y = oy + ty * 8 + py;
          if (isOpponentHealthboxOpaqueAt(x, y)) continue;
          setPixel(fb, x, y, c);
        }
      }
    }
  }
}

/** The settled (post-tick-1227) composite: static bg + both trainer pics + the window frame - byte-exact against the oracle (see module doc point 1). */
function drawSettledScene(fb: Uint8Array): void {
  drawTileBg(fb, battleBg.static.tileset, battleBg.static.tilemap, battleBg.palette);
  drawSpriteSheet(fb, bugCatcher.tileset, bugCatcher.palette, OPPONENT_CORNER.x, OPPONENT_CORNER.y);
  drawSpriteSheet(fb, brendanSettledTileset, brendan.palette, PLAYER_CORNER.x, PLAYER_CORNER.y);
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
}

/**
 * §7.4-7.6: post-text visual handoff - trainer-pic exit, ball spawn/open/
 * materialize, party-summary despawn, opponent healthbox slide-in.
 * `handoffTick` = `sendOutHandoffTick(pressTick)`.
 *
 * STATUS: the message text (unchanged, full 35 chars - stays on screen the
 * whole window), the player's OWN party-status-summary bar+icons (only the
 * SENDING battler's side despawns per §7.4.3's own source citation), the
 * trainer-pic exit slide (§7.4.1, now a RAM-probed exact table - see
 * `TRAINER_EXIT_X2`), Grovyle's settled materialize pose (§7.5, static-step
 * only - see `GROVYLE_MATERIALIZE_TICK`), the opponent healthbox slide-in +
 * content (§7.6, byte-exact - see `healthboxSlideDx`), and the BG-to-white
 * materialize dither (§7.5, now an oracle-pixel-sampled exact table - see
 * `sendOutBgFadeY`) are all rendered. NOT yet rendered: the opponent's OWN
 * party-status-summary despawn (§7.4.3's alpha-blend + per-icon staggered
 * exit-slide - its side is simply omitted rather than animated), the ball
 * sprite itself, the open-particle burst, and the mon's affine-scale-in
 * (§7.4.2/§7.5's own transient sprites, ticks ~1462-1518) - PROGRESS.md #74:
 * every remaining tick in this window needs ALL of these simultaneously
 * correct, so none of the fixes above alone flips a full-frame match yet.
 */
function drawSendOutHandoff(fb: Uint8Array, t: number, handoffTick: number): void {
  // battleMenu.ts's own module doc (§3 item 5 root-cause, PROGRESS.md #98's
  // named blocker): the player's own ONIX release re-triggers the identical
  // BG-to-white materialize dither `sendOutBgFadeY` models for the
  // opponent's own send-out - the two windows never overlap, so only one of
  // the two is ever nonzero at a given tick.
  const bgFadeY = sendOutBgFadeY(t, handoffTick) || playerMaterializeBgFadeY(t);
  drawTileBgFaded(fb, battleBg.static.tileset, battleBg.static.tilemap, battleBg.palette, bgFadeY);
  // battleMenu.ts: Brendan's throw pose-swap + exit translation start at
  // BRENDAN_THROW_START_TICK - before that he's still the settled slide-in
  // pose (frame 3, unshifted). `brendanThrowFrame` uses `null` for BOTH ends
  // of its own table (before the throw starts, AND once its `FRAME(3,50)`
  // tail is exhausted, et>=116 - a "table truncated both ends" case, per
  // this run's own named convention) - the two must NOT be conflated here:
  // once the throw has started, `null` means "long done and off-screen"
  // (`brendanThrowDx` itself freezes fully off-screen at n=50), not "back to
  // the settled on-screen pose". Found via ISSUES #17's own settle-window
  // work: this bug was invisible before (masked by the much larger
  // ONIX-missing gap it happened to overlap) and surfaced only once ONIX's
  // own real transparency let Brendan's incorrectly-redrawn settled sprite
  // show through at render tick 1690+ (`BRENDAN_THROW_START_TICK`+116).
  const throwFrame = brendanThrowFrame(t);
  if (t < BRENDAN_THROW_START_TICK) {
    drawSpriteSheet(fb, brendanSettledTileset, brendan.palette, PLAYER_CORNER.x, PLAYER_CORNER.y);
  } else if (throwFrame !== null) {
    const dx = brendanThrowDx(t) ?? 0;
    drawSpriteSheet(fb, brendanThrowTilesets[throwFrame]!, brendan.palette, PLAYER_CORNER.x + dx, PLAYER_CORNER.y);
  }
  const trainerX = trainerExitX(t, handoffTick);
  if (trainerX !== null) {
    drawSpriteSheet(fb, bugCatcher.tileset, bugCatcher.palette, trainerX, OPPONENT_CORNER.y);
  }
  drawGrovyleMaterialize(fb, t, handoffTick);
  drawGrovyleStretchEarly(fb, t, handoffTick);
  if (t < GROVYLE_MATERIALIZE_TICK) drawGrovyleStretch(fb, t, handoffTick);
  drawSendOutBall(fb, t, handoffTick);
  const playerBallTopLeft = playerThrowBallTopLeft(t);
  if (playerBallTopLeft !== null) {
    drawSpriteSheet(fb, BALL_CLOSED_TILESET, summaryBall.palette, playerBallTopLeft.x, playerBallTopLeft.y);
  }
  const playerBallSpin = playerThrowBallSpin(t);
  if (playerBallSpin !== null) {
    drawSpriteSheetAffineRotate(
      fb,
      BALL_CLOSED_TILESET,
      summaryBall.palette,
      playerBallSpin.centerX,
      playerBallSpin.centerY,
      playerBallSpin.pa,
      playerBallSpin.pb,
      playerBallSpin.pc,
      playerBallSpin.pd,
    );
  }
  drawBallOpenParticles(fb, t, handoffTick);
  drawPlayerMaterialize(fb, t);
  drawPlayerMaterializeSettle(fb, t);
  drawPlayerBallOpen(fb, t);
  drawPlayerBallOpenParticles(fb, t);
  if (t >= GROVYLE_MATERIALIZE_TICK) drawGrovyleSettled(fb);
  // §7.19: `drawOpponentSummaryExit` only draws from elapsed=t-handoffTick-1
  // >= 0 (render handoffTick+1 on) - at handoffTick itself (elapsed=-1) the
  // real game still shows the opponent's settled (un-faded, un-slid) bar+
  // icons for exactly one tick before the exit fade/slide takes over, so
  // fall back to the same settled render the pre-handoff branch uses.
  drawBallIcons(fb, t, { opponent: t === handoffTick, player: true });
  drawOpponentSummaryExit(fb, t, handoffTick);
  const healthboxDx = healthboxSlideDx(t);
  if (healthboxDx !== null) drawSendOutHealthbox(fb, healthboxDx);
  const playerHealthboxDx = playerHealthboxSlideDx(t);
  if (playerHealthboxDx !== null) drawMenuHealthboxPlayer(fb, playerHealthboxDx);
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  // battleMenu.ts §1/§2: the box clears (no blank-box frame - a bare
  // `drawTileBg` above already redraws it empty) and "Go! ONIX!" starts
  // printing the same tick the opponent's held "sent\nout GROVYLE!" text
  // would otherwise still be drawn.
  if (t >= GO_TEXT_START_TICK) {
    drawMessageTextLines(fb, GO_TEXT, "", goTextVisibleChars(t));
  } else {
    drawMessageTextLines(fb, SENDOUT_LINE1, SENDOUT_LINE2, SENDOUT_TEXT_TOTAL);
  }
}

/**
 * Render of the BattleIntroSlide3 reveal, ticks
 * FIRST_VISIBLE_TICK..SLIDE_END_TICK-1. RAM/source-confirmed compositing
 * (module doc point 2, GAP A resolved this session): `BLDCNT =
 * TGT1_BG1|BLEND|TGT2_BG3|TGT2_OBJ`, BG1 (`entrySlide`) is TGT1. A prior
 * session's "neither trainer OBJ is ever visible during the reveal"
 * conclusion (PROGRESS.md #63) was a real misdiagnosis - it only sampled
 * each trainer's *settled* corner rect, but both trainer OBJs are actually
 * `invisible=FALSE`/in-use from the moment they're created (RAM-confirmed,
 * `gSprites[gBattlerSpriteIds[0/1]]`, ticks 1074-1886: `invisible` and
 * `oam.tileNum`/`paletteNum` never change) and slide in via their OWN
 * `x2` OAM offset, entirely independent of BG1 - `x2` tracks the exact
 * same magnitude as `gTasks[0].data[2]` (the BG3 scanline-shift value)
 * every single tick, opposite sign per side (opponent `x2 = -data[2]`,
 * player `x2 = +data[2]`), reaching 0 at the same tick-1226 settle. Since
 * that's numerically identical to the already-validated
 * `scanlineShiftMagnitude` schedule (same RAM register drives both), no
 * new constant table is needed - `objShift(t)` below just reuses it. OBJ
 * sits at priority 2 (`gOamData_BattleSprite{Player,Opponent}Side`,
 * `battle_main.c:274-301`), strictly between BG1 (priority 0, frontmost)
 * and BG3 (priority 3, backmost), so it's TGT2's *other* real occupant:
 * wherever it's opaque, it draws in front of BG3 (raw, unblended, exactly
 * like BG3 draws raw where BG1 is transparent - see below) and BEHIND BG1
 * (so BG1, where opaque, blends against the OBJ color there, not BG3's).
 * `WININ` includes `WIN0_OBJ`, so the OBJ is window-clipped too
 * (`drawSpriteSheetWindowed`). Both trainer sprites' tile/palette are
 * constant throughout (RAM-confirmed) - the same art `drawSettledScene`
 * uses, just at a sliding corner instead of the settled one. BG3
 * (`static`) gets the per-scanline HOFS shift (`sIntroScanlineParams16Bit`
 * targets `&REG_BG3HOFS` literally, `battle_main.c:250-253` - BG1 is NOT
 * part of that DMA); BG1 instead scrolls uniformly via the ordinary
 * whole-frame `gBattle_BG1_X` write (`bg1X` above). Per real GBA
 * alpha-blend semantics, blending only happens where the actual topmost
 * opaque pixel is TGT1-flagged: wherever `entrySlide` is transparent, the
 * next-topmost opaque layer (OBJ if present there, else BG3) draws raw,
 * unblended (confirmed against oracle pixels - PROGRESS.md #62/#65). The
 * window frame (BG0) is not a blend target, so it draws at full
 * brightness, unshifted, on top of everything.
 */
function drawSlideScene(fb: Uint8Array, t: number, win: { top: number; bottom: number }): void {
  const { eva, evb } = evaEvb(t);
  const bg1Shift = bg1X(t);
  const objShift = scanlineShiftMagnitude(t);

  // TGT2: per-scanline-shifted BG3 (`static`), with both trainer OBJs
  // (priority 2, in front of BG3) drawn raw on top wherever opaque - see
  // module doc above.
  const tgt2 = new Uint8Array(240 * 160 * 4);
  for (let y = win.top; y < win.bottom; y += 1) {
    const shift = y < 80 ? shiftTop(t) : shiftBottom(t);
    for (let x = 0; x < 240; x += 1) {
      const c = staticBgPixel(x + shift, y);
      if (c) setPixel(tgt2, x, y, c);
    }
  }
  drawSpriteSheetWindowed(tgt2, bugCatcher.tileset, bugCatcher.palette, OPPONENT_CORNER.x - objShift, OPPONENT_CORNER.y, win);
  drawSpriteSheetWindowed(tgt2, brendanSettledTileset, brendan.palette, PLAYER_CORNER.x + objShift, PLAYER_CORNER.y, win);

  // TGT1: BG1 (`entrySlide`), uniformly shifted. Blend where opaque, else raw TGT2.
  for (let y = win.top; y < win.bottom; y += 1) {
    for (let x = 0; x < 240; x += 1) {
      const o = (y * 240 + x) * 4;
      const bg1c = entrySlidePixel(x + bg1Shift, y);
      if (bg1c) {
        fb[o] = blendChannel(bg1c.r, tgt2[o]!, eva, evb);
        fb[o + 1] = blendChannel(bg1c.g, tgt2[o + 1]!, eva, evb);
        fb[o + 2] = blendChannel(bg1c.b, tgt2[o + 2]!, eva, evb);
        fb[o + 3] = 255;
      } else if (tgt2[o + 3] !== 0) {
        fb[o] = tgt2[o]!;
        fb[o + 1] = tgt2[o + 1]!;
        fb[o + 2] = tgt2[o + 2]!;
        fb[o + 3] = 255;
      }
    }
  }

  // BG0 (window frame): not a blend target, drawn raw on top, unshifted.
  const windowTmp = new Uint8Array(240 * 160 * 4);
  drawTileBg(windowTmp, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  for (let y = win.top; y < win.bottom; y += 1) {
    for (let x = 0; x < 240; x += 1) {
      const o = (y * 240 + x) * 4;
      if (windowTmp[o + 3] === 0) continue;
      fb[o] = windowTmp[o]!;
      fb[o + 1] = windowTmp[o + 1]!;
      fb[o + 2] = windowTmp[o + 2]!;
      fb[o + 3] = 255;
    }
  }
}

/** Renders the full battle-scene-assembly frame for `state` (elapsed since TICK0). */
export function renderBattleScene(fb: Uint8Array, state: BattleSceneState): void {
  const t = TICK0 + state.elapsed;
  const win = windowRange(t);
  if (!win) return; // solid black
  if (t < SLIDE_END_TICK) {
    drawSlideScene(fb, t, win);
    return;
  }
  const pressTick = state.sendOutPressElapsed === null ? null : TICK0 + state.sendOutPressElapsed;
  if (pressTick === null || t < sendOutTextStartTick(pressTick)) {
    // Idle "would like to battle!♥" hold - unaffected by the press until its
    // own registration lag elapses (§7.2: screen stays frozen on whatever
    // the idle cycle shows through pressTick+4, oracle-confirmed unbroken).
    drawSettledScene(fb);
    drawBallIcons(fb, t);
    drawMessageText(fb, textVisibleChars(t));
    const cursor = cursorState(t);
    if (cursor.visible) drawCursor(fb, cursor.yOffset);
    return;
  }
  const handoffTick = sendOutHandoffTick(pressTick);
  if (t < handoffTick) {
    // §7.3: message box cleared, "BUG CATCHER DESTIN sent\nout GROVYLE!"
    // printing - ball icons still at their settled position, no cursor.
    drawSettledScene(fb);
    drawBallIcons(fb, t);
    drawMessageTextLines(fb, SENDOUT_LINE1, SENDOUT_LINE2, sendOutTextVisibleChars(t, pressTick));
    return;
  }
  if (t >= MENU_IDLE_BLANK_START_TICK) {
    // battleMenu.ts §5 / docs/battle-menu-idle-notes.md: the teal blank box,
    // the atomic menu draw, and the settled idle-bounce cycle - an
    // oracle-harvested composition, not layered onto `drawSendOutHandoff`'s
    // own (here, superseded) draw stack. See `drawActionMenuIdleWindow`'s
    // own doc comment. Past the blank box, `drawFightSubmenuWindow` extends
    // this chain with the FIGHT submenu (docs/battle-turn-notes.md §11) -
    // it falls back to `drawActionMenuIdleWindow` itself whenever the
    // submenu isn't open, so this is a strict superset, not a branch.
    if (t <= MENU_IDLE_BLANK_END_TICK) {
      drawRect(fb, menuIdleBlank);
      return;
    }
    drawFightSubmenuWindow(fb, t, state.fightSubmenu);
    return;
  }
  drawSendOutHandoff(fb, t, handoffTick);
}
