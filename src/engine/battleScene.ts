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

import battleBgAsset from "../assets/gen/battle-bg.json" with { type: "json" };
import battleWindowAsset from "../assets/gen/battle-window.json" with { type: "json" };
import bugCatcherAsset from "../assets/gen/trainer-pic-bug-catcher.json" with { type: "json" };
import brendanAsset from "../assets/gen/trainer-pic-brendan-back.json" with { type: "json" };
import ballDisplayAsset from "../assets/gen/battle-interface-ball-display.json" with { type: "json" };
import battleHealthboxAsset from "../assets/gen/battle-healthbox.json" with { type: "json" };
import downArrowAsset from "../assets/gen/battle-interface-down-arrow.json" with { type: "json" };
import opponentFrontSpritesAsset from "../assets/gen/battle-opponent-front-sprites.json" with { type: "json" };
import sendOutHealthboxOpponentAsset from "../assets/gen/sendout-healthbox-opponent.json" with { type: "json" };
import summaryBallAsset from "../assets/gen/summary-ball.json" with { type: "json" };
import battleAnimBallOpenAsset from "../assets/gen/battle-anim-ball-open.json" with { type: "json" };
import battleAnimTablesAsset from "../data/gen/battle-anim-tables.json" with { type: "json" };
import battleAnimParticlesAsset from "../assets/gen/battle-anim-particles.json" with { type: "json" };
import fontNormalData from "../data/gen/font-normal.json" with { type: "json" };
import charmapData from "../data/gen/charmap.json" with { type: "json" };

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

const battleBg = battleBgAsset as BattleBgAsset;
const battleWindow = battleWindowAsset as BattleWindowAsset;
const bugCatcher = bugCatcherAsset as TrainerPicAsset;
const brendan = brendanAsset as BrendanAsset;
const ballDisplay = ballDisplayAsset as BallDisplayAsset;
const downArrow = downArrowAsset as DownArrowAsset;
const ballStatusBar = (battleHealthboxAsset as { ballStatusBar: BallStatusBarAsset }).ballStatusBar;
const grovyleFrontSprite = (opponentFrontSpritesAsset as Record<string, OpponentFrontSpriteAsset>).GROVYLE!;
const sendOutHealthboxOpponent = sendOutHealthboxOpponentAsset as SendOutHealthboxContentAsset;
const summaryBall = summaryBallAsset as SummaryBallAsset;
const battleAnimBallOpen = battleAnimBallOpenAsset as BattleAnimBallOpenAsset;
const battleAnimTables = battleAnimTablesAsset as BattleAnimTablesAsset;
const battleAnimParticles = battleAnimParticlesAsset as BattleAnimParticlesAsset;
const font = fontNormalData as unknown as FontData;
const charmap = new Map<string, number>((charmapData as { entries: [string, number][] }).entries);

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
}

export const INITIAL_BATTLE_SCENE_STATE: BattleSceneState = { elapsed: 0, sendOutPressElapsed: null };

export function advanceBattleScene(state: BattleSceneState): BattleSceneState {
  return { elapsed: state.elapsed + 1, sendOutPressElapsed: state.sendOutPressElapsed };
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
 * trace ticks 1461-1500. `x2` starts at 2 the tick BEFORE the handoff tick
 * (1461, invisible at the pixel level - see `PALETTE_FADE_Y` module doc for
 * the same "sub-pixel invisible" pattern) and increments to 103 by tick 1497
 * (`flags` bit0/`inUse` still set), then the sprite is destroyed the next
 * tick (`flags`=0, `x` reset to garbage 304) - matching
 * `SpriteCB_FreeOpponentSprite` firing right after the documented 35-frame
 * `AnimTranslateLinear_WithFollowup` duration. NOT a clean linear formula
 * (confirmed: the probed steps are mostly +3/tick but with two single-tick
 * +0 stalls near the end, ticks 1493->1494 and 1496->1497 - GBA fixed-point
 * per-frame truncation accumulating differently than a fresh
 * `round(total*et/duration)` computed each tick would predict) - this is
 * the RAM ground truth itself, not a fit, so it's used as a literal table
 * indexed from the handoff tick (`et = t - handoffTick`), which the probed
 * trace confirms is exactly where index 0 (x2=5) lands.
 */
const TRAINER_EXIT_X2: readonly number[] = [
  5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35, 38, 41, 44, 47, 50, 53, 56, 59, 62, 65, 68, 71, 74, 77, 80, 83, 86, 89, 92,
  95, 97, 97, 100, 103, 103,
];

/** Opponent trainer-pic's top-left x at trace tick `t` during the exit slide, or `null` once destroyed (handoff+36 and beyond - see `TRAINER_EXIT_X2`). */
function trainerExitX(t: number, handoffTick: number): number | null {
  const et = t - 1 - handoffTick;
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
 * (`ANIMCMD_FRAME(4,5)` open, `ANIMCMD_FRAME(8,5)` blank,
 * `docs/battle-anim-assets.md` §2). Position and every tick boundary here are
 * pixel-brute-force-confirmed against this trace's own regenerated ground
 * truth (not assumed from the other trace `battle-anim-assets.md` used, nor
 * from summing the source constants) - `tools/compare/scratch/find_ball.mjs`/
 * `ball_ticks.mjs` (throwaway, not committed): the closed frame at corner
 * (168,56) is a ZERO-diff pixel match at every tick 1464-1479 (16 ticks,
 * matching the source-cited wait exactly) and a full mismatch at every tick
 * 1460-1463 before it (confirming 1464 = handoffTick+2 as the true first-
 * visible tick, not handoffTick+0). The "open" frame is a ZERO-diff exact
 * match at 1480 (handoffTick+18), degrading tick-by-tick from 1481 on as the
 * particle burst and the emerging mon (both still unrendered) increasingly
 * occlude that screen region - not evidence the frame itself is wrong, since
 * the underlying content that WOULD be occluding it isn't drawn yet either.
 * By 1491 the region no longer resembles either frame at all (mon fully
 * emerged over it) - matching `sBallAnimSeq1`'s 5-tick open + 5-tick blank
 * (blank = zero opaque pixels, i.e. nothing left to draw) followed by
 * `HandleBallAnimEnd` destroying the sprite once both anims finish. Net:
 * only "closed" (1464-1479) and "open" (1480-1484) ever need a draw call;
 * blank/destroyed (1485+) is a no-op.
 */
const BALL_CORNER = { x: 168, y: 56 };
const BALL_CLOSED_START_OFFSET = 2;
const BALL_OPEN_START_OFFSET = 18;
const BALL_INVISIBLE_START_OFFSET = 23;

function subTileset(tileset: Tileset, tileRowOffset: number, rows: number): Tileset {
  return {
    columns: tileset.columns,
    rows,
    tiles: tileset.tiles.slice(tileRowOffset * tileset.columns, (tileRowOffset + rows) * tileset.columns),
  };
}

const BALL_CLOSED_TILESET = subTileset(summaryBall.tileset, 0, 2);
const BALL_OPEN_TILESET = subTileset(battleAnimBallOpen.tileset, 0, 2);

function drawSendOutBall(fb: Uint8Array, t: number, handoffTick: number): void {
  const et = t - handoffTick;
  if (et < BALL_CLOSED_START_OFFSET || et >= BALL_INVISIBLE_START_OFFSET) return;
  if (et < BALL_OPEN_START_OFFSET) {
    drawSpriteSheet(fb, BALL_CLOSED_TILESET, summaryBall.palette, BALL_CORNER.x, BALL_CORNER.y);
  } else {
    drawSpriteSheet(fb, BALL_OPEN_TILESET, battleAnimBallOpen.palette, BALL_CORNER.x, BALL_CORNER.y);
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
/** Frame index 3 (of 4) is the settled slide-in pose (docs trainer-pic extractor comment) - the other 3 are the send-out throw animation, out of scope for this window. */
const BRENDAN_SETTLED_FRAME = 3;
const brendanSettledTileset: Tileset = {
  columns: brendan.tileset.columns,
  rows: BRENDAN_FRAME_ROWS,
  tiles: brendan.tileset.tiles.slice(
    BRENDAN_SETTLED_FRAME * BRENDAN_FRAME_ROWS * brendan.tileset.columns,
    (BRENDAN_SETTLED_FRAME + 1) * BRENDAN_FRAME_ROWS * brendan.tileset.columns,
  ),
};

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

/** gBattleInterface_BallStatusBarGfx (`ball_status_bar.png`), the diagonal bar the ball icons sit on - corners brute-force-matched against the oracle this session: opponent (-24,40) h-flipped, player (136,96) unflipped, both 212/212 exact. */
function drawBallStatusBar(fb: Uint8Array, ox: number, oy: number, hFlip: boolean): void {
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
          setPixel(fb, ox + tx * 8 + px, oy + ty * 8 + py, c);
        }
      }
    }
  }
}

function drawBallIcons(fb: Uint8Array, t: number, sides: { opponent: boolean; player: boolean } = { opponent: true, player: true }): void {
  const bars = ballStatusBarPositions(t);
  if (sides.opponent && bars.opponent.visible) drawBallStatusBar(fb, bars.opponent.x, 40, true);
  if (sides.player && bars.player.visible) drawBallStatusBar(fb, bars.player.x, 96, false);
  for (const icon of ballIcons(t)) {
    if (!icon.visible) continue;
    if (icon.y === 32 && !sides.opponent) continue;
    if (icon.y === 88 && !sides.player) continue;
    drawSpriteSheetTile(fb, ballDisplay.tileset, ballDisplay.palette, ballStateTileIndex(icon.state), icon.x, icon.y);
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

function drawGrovyleMaterialize(fb: Uint8Array, t: number, handoffTick: number): void {
  const et = t - handoffTick;
  if (et < MATERIALIZE_START_OFFSET || et >= MATERIALIZE_END_OFFSET) return;
  const local = et - MATERIALIZE_START_OFFSET;
  const accumulator = affineEmergeAccumulator(local + 1);
  const y2 = MATERIALIZE_Y2_TABLE[local] ?? 0;
  drawSpriteSheetAffineTinted(fb, grovyleFrontSprite.tileset, GROVYLE_CORNER.x, GROVYLE_CORNER.y, accumulator, MATERIALIZE_TINT_COLOR, y2);
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
 * this pass), and z-order between particles (drawn spawn-index order,
 * unverified against real OAM priority).
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

function drawParticleTile(fb: Uint8Array, tileIndex: number, hFlip: boolean, ox: number, oy: number): void {
  const tile = battleAnimParticles.tileset.tiles[tileIndex];
  if (!tile) return;
  for (let py = 0; py < 8; py += 1) {
    for (let px = 0; px < 8; px += 1) {
      const sx = hFlip ? 7 - px : px;
      const idx = tile[py * 8 + sx]!;
      if (idx === 0) continue;
      const c = battleAnimParticles.palette[idx];
      if (!c) continue;
      setPixel(fb, ox + px, oy + py, c);
    }
  }
}

function drawBallOpenParticles(fb: Uint8Array, t: number, handoffTick: number): void {
  const logicalT = t - handoffTick - BALL_OPEN_START_OFFSET - 1;
  if (logicalT < 0) return;
  const anim = battleAnimParticles.regularBallAnim;
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
    const dx = gbaSin(angle, radius);
    const dy = gbaCos(angle, radius);
    const frame = anim[age % anim.length]!;
    drawParticleTile(fb, frame.tile, frame.hFlip, PARTICLE_ORIGIN.x + dx, PARTICLE_ORIGIN.y + dy);
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
function blendedTile(fb: Uint8Array, tile: number[], palette: RgbColor[], hFlip: boolean, ox: number, oy: number, eva: number, evb: number): void {
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
      const o = (y * 240 + x) * 4;
      fb[o] = blendChannel(c.r, fb[o]!, eva, evb);
      fb[o + 1] = blendChannel(c.g, fb[o + 1]!, eva, evb);
      fb[o + 2] = blendChannel(c.b, fb[o + 2]!, eva, evb);
      fb[o + 3] = 255;
    }
  }
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

function drawOpponentSummaryExit(fb: Uint8Array, t: number, handoffTick: number): void {
  const elapsed = t - handoffTick - 1;
  if (elapsed < 0) return;
  const blend = Math.max(0, 15 - Math.floor(elapsed / 2));
  if (blend <= 0) return;
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

/** §7.6: opponent healthbox content, translated by its slide-in `dx` - see `healthboxSlideDx`'s doc comment. Flat opaque rectangle (pixel-harvested asset), clipped to screen by `setPixel` same as every other sprite draw here. */
function drawSendOutHealthbox(fb: Uint8Array, dx: number): void {
  const { x, y, width, height, pixels } = sendOutHealthboxOpponent;
  for (let py = 0; py < height; py += 1) {
    for (let px = 0; px < width; px += 1) {
      const i = (py * width + px) * 3;
      setPixel(fb, x + dx + px, y + py, { r: pixels[i]!, g: pixels[i + 1]!, b: pixels[i + 2]! });
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
  drawTileBgFaded(fb, battleBg.static.tileset, battleBg.static.tilemap, battleBg.palette, sendOutBgFadeY(t, handoffTick));
  drawSpriteSheet(fb, brendanSettledTileset, brendan.palette, PLAYER_CORNER.x, PLAYER_CORNER.y);
  const trainerX = trainerExitX(t, handoffTick);
  if (trainerX !== null) {
    drawSpriteSheet(fb, bugCatcher.tileset, bugCatcher.palette, trainerX, OPPONENT_CORNER.y);
  }
  drawGrovyleMaterialize(fb, t, handoffTick);
  drawSendOutBall(fb, t, handoffTick);
  drawBallOpenParticles(fb, t, handoffTick);
  if (t >= GROVYLE_MATERIALIZE_TICK) {
    drawGrovyleSettled(fb);
  } else {
    drawGrovyleStretch(fb, t, handoffTick);
  }
  drawBallIcons(fb, t, { opponent: false, player: true });
  drawOpponentSummaryExit(fb, t, handoffTick);
  const healthboxDx = healthboxSlideDx(t);
  if (healthboxDx !== null) drawSendOutHealthbox(fb, healthboxDx);
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  drawMessageTextLines(fb, SENDOUT_LINE1, SENDOUT_LINE2, SENDOUT_TEXT_TOTAL);
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
  drawSendOutHandoff(fb, t, handoffTick);
}
