# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 258 — Bounded worker (turn-15 wiring, boundary (iii) close-out, ISSUES #36 DELETED): wired the player-side faint sink + button-gated "ONIX fainted!" hold — `turn15-fly-strike.json` **256/256, 0 diff** (extended 19308→19990, the entire turn-15 window 18956-19990 now wired end-to-end through the fainted hold, right up to the dismiss press)

- **State:** `npm test` **993/993**, `npm run build` green, tree clean.
  Regression sweep 0 diff: `turn14-fly-miss` 185/185, `turn13-switchin`
  240/240, `turn13-menu` 57/57.
- **Did:** Fresh dense oracle-pixel bisection (stride-1, 19300-19406, not
  assumed from any prior citation) found the real sequence: the held "not
  very effective..." text survives unchanged through 19308, Onix's own
  sprite sinks 19309→19321 fully gone, the player healthbox (box + HP
  overlay) vanishes **entirely in one tick at 19326** (a separate teardown
  step from the sprite, not atomic), text hard-cuts to "ONIX\nfainted!"'s
  own first glyph at 19328 (no blank gap), finishes printing at 19339, and
  the wait-cursor appears at 19341 bouncing through `cursorState`'s own
  generic 4-phase/9-tick cycle VERBATIM, unchanged through the dismiss tick
  (19990, still un-dismissed — out of scope). One real correction along the
  way: the sink is the SAME family as opponent-side `grovyleFaintSinkRowsAndY2`
  (keep the sprite's own top artwork, shift it down, ground-contact edge
  fixed) but at a continuous 5px/tick rate instead of that family's
  8px/2-tick quantization — a first implementation draft got the shift
  direction backwards (cropped the top, kept the bottom fixed instead of
  the reverse), caught immediately by `npm run compare` (a whole-band 4.5%
  diff, not a boundary residual) and fixed before committing. New `src/`
  surface: `drawSpriteSheetTopClipped` (pixel-granular sibling of
  `drawSpriteSheetTopRows`), `turn15OnixSinkSkipRows`,
  `TURN15_ONIX_HEALTHBOX_VANISH_TICK`, `TURN15_FAINTED_LINE1/2`/
  `_TEXT_START_TICK`/`_CURSOR_START_TICK`; `drawTurn5RockSlideAttack` gains
  `onixSinkSkipRows`, `drawTurn13SwitchinFieldBase` gains
  `onixSinkSkipRows`/`onixHealthboxVisible` (both defaulted, every
  pre-existing call site unaffected). No Tier-1 pin added (RAM-only
  stat-stage reset, no pixel effect, no pure-logic module to pin against —
  consistent with every prior session in this whole turn-15 chain).
  `turn15-fly-strike.json` extended 19308→19990 (218→256 captures, exactly
  at the ≤256 budget ceiling), stride-1 over the vanish+teardown+full-text
  span plus 7 sparse hold spot-checks. **256/256, 0 diff, no new
  exclusions.** **ISSUES #36 DELETED.**
- **Next:** The party-select engine rung. ALL its groundwork is already
  banked: `docs/party-menu-notes.md` covers the chrome/icons/hop model/
  palettes plus a composite script; the one open extraction is the
  per-slot overlay sprite in bbox x105-111 — the composite script's own
  FAIL lines pin it exactly, no fresh probing needed. Sequence: SEND OUT →
  MAGBY materialize → settled "What will MAGBY do?" menu completes turn
  15's own full window. After that: ISSUES #34's own tiny remainder
  (17781-17787/17822-17845, kerning-class); #33's tiny remainder
  (17019/17034); ISSUES #32 (sibling worker's own scope).
- **Notes:** Full writeup `docs/turn15-notes.md` §10. The wrong-direction
  sink draft is a useful cautionary note for future sink-family reuses:
  `npm run compare`'s own per-frame diff-percentage output (not just PASS/
  FAIL) was what made the bug obvious — a boundary-off-by-one residual
  would show a small, shrinking diff near the edges; a direction bug shows
  a large diff across the WHOLE remaining band, a distinct signature worth
  recognizing early rather than tweaking constants blindly. No PAPERCUTS
  beyond the standing mgba-venv-teardown one.

---
## 257 — Bounded worker (rider fix + turn-15 wiring iii-partial): wired the banked `FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` fix (closing ISSUES #35 in full and ISSUES #34's entire 43-tick family, not just its 9-tick subset) — `turn15-fly-strike.json` **218/218** (extended 19141→19308 with HP-drain + "not very effective" text), `turn14-fly-miss.json` **185/185**

- **State:** `npm test` **993/993**, `npm run build` green, tree clean.
  `verify-submenu-bounce.ts` re-run first (mandatory step): 22/22 PASS.
  Regression sweep 0 diff: `turn13-switchin` 240/240, `turn13-menu` 57/57.
- **Did (rider, GOAL B):** Wired `docs/turn13-bounce-notes.md` §12e's fix
  shape (4 call sites: `drawTurn14/15FightSubmenuWindow`'s post-reveal arms
  + `turn14/15KickoffBounceTick`'s pre-freeze arms, all missing the
  `FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` correction). That alone didn't reach
  0 diff — two more findings, both oracle-verified, both documented in
  `docs/turn13-bounce-notes.md` §13: (1) `drawTurn14FightSubmenuWindow`'s
  own pre-reveal branch ALSO needs the shift once a real FIGHT-open press
  has registered (§12e's "pre-reveal untouched" claim was only evidenced
  against a degenerate 2-tick turn-15 sanity window where it doesn't
  matter either way); (2) a genuinely separate, adjacent bug — that same
  function's `drawFightSubmenuChrome` call was missing one `true`
  (`turn13Resolved`), undercounting DRAGON_BREATH's PP by 1 for the WHOLE
  FIGHT-submenu-open span (19/20 rendered vs. oracle's 18/20) — found by
  grepping every `drawFightSubmenuChrome(` call site's own ascending
  "one more `true` than the previous turn" pattern. Fixing both closed
  turn 14's own 9 named ticks AND, as a verified bonus (scratch-trace
  checked before committing), the previously-unexplained 11-tick
  `17758-17768` remainder ISSUES #34 had ruled out of the shift rule's own
  scope — its ENTIRE 43-tick family is now closed, not just the subset the
  brief asked for. `turn15-fly-strike.json` 176→183/183 (7 ticks restored,
  ISSUES #35 DELETED — its whole family closes under this one rule).
  `turn14-fly-miss.json` 165→185/185 (20 ticks restored: the 9 named +
  the 11-tick bonus). ISSUES #34 trimmed to just `17781-17787`/
  `17822-17845` (kerning-class), untouched per scope.
- **Did (GOAL A, turn-15 boundary iii, partial):** Dense oracle-pixel
  bisection (scratch stride-1 capture 19140-19160) wired the HP-drain
  (plain 1-HP/tick countdown, anchor 19141, reusing the already-validated
  player-side HP-digit/band overlay machinery verbatim — `onixHp` param
  added to `drawTurn13SwitchinFieldBase`, default-unchanged for every
  pre-existing caller) and "It's not very effective..." text
  (`TURN9_NOTVERYEFFECTIVE_LINE` reused verbatim, start tick bisected to
  19151, independently cross-checked against `docs/turn15-notes.md` §6a's
  own "held window starts at 19174" finding: 19151+24-1=19174 exactly).
  `turn15-fly-strike.json` extended 19141→19308, **218/218, 0 diff** (2
  new exclusions, 19143/19144, a 2px HP-bar band-edge rounding gap at
  hp=2/hp=1 — named, not chased, same shared-primitive-risk class as the
  pre-existing 19059-19061 exclusion).
- **Next:** ISSUES #36's own remainder — dense-bisect 19308-19330 fresh
  (don't assume the original dossier's citations for that span, the same
  "verify don't assume" discipline that already corrected two of this
  window's own citations), then the player-side faint sink (stat-stage
  reset + sprite/healthbox teardown, RAM 19325/19326, pixel vanish 19330),
  then the "ONIX fainted!" button-gated hold through its own dismiss at
  ~19990. ISSUES #34's own tiny remainder (`17781-17787`/`17822-17845`);
  #33's tiny remainder (17019/17034); ISSUES #32.
- **Notes:** Full writeups `docs/turn13-bounce-notes.md` §13 (rider) and
  `docs/turn15-notes.md` §9 (boundary iii partial). The rider ran over its
  own "small fix" billing once the literal 4-edit fix didn't reach 0 diff
  on its own — both extra findings were verified via real oracle pixel
  diffs (not guessed), and fixing them closed MORE ground truth than
  asked (ISSUES #34's full family, not just the shift subset), so the
  extra time bought real, committed progress rather than a stall. GOAL A's
  faint-sink/fainted-hold phases (the bulk of ISSUES #36's own remaining
  scope) were not reached this session — ran out of safe budget after the
  rider's own unplanned depth; the drain/text half that WAS reached is
  fully verified and committed, not a rushed partial. No PAPERCUTS beyond
  the standing mgba-venv-teardown one.

---
## 256 — Bounded worker (turn-15 wiring step, boundary (ii) of 3): both probes run first, then wired the FLY strike animation core (ball descent + impact sprite + Onix hit-flash/shake/healthbox-wobble) — `turn15-fly-strike.json` **176/176, 0 diff** (was 82/82, extended 19045→19141); ISSUES #36 trimmed to boundary (iii) only

- **State:** `npm test` **993/993**, `npm run build` green, tree clean.
  `verify-turn15.ts` re-run first (mandatory step): 59/59 PASS. Regression
  sweep 0 diff: `turn14-fly-miss` 165/165, `turn13-switchin` 240/240,
  `turn13-menu` 57/57.
- **Did:** PROBE 1 (source + fresh VRAM dump) confirmed the impact sprite
  (slot 4, tile 433) IS the already-wired `gBasicHitSplatSpriteTemplate`
  family (ISSUES #31), just `animation=0` (flat, no zoom-pop) instead of
  turn 9's own zoomed variant — pure re-anchor, no new asset. PROBE 2
  (`dump-fly-anim.py` re-run 19035-19150) found the ball's own motion is
  perfectly linear (`x -10/tick, y +6/tick`) under one constant rotation
  matrix — banked as a literal table (`TURN15_FLY_BALL_TABLE`), no formula
  fit. Wired `drawTurn15FlyBallDescent`, `drawTurn15ImpactHitsplat`,
  `turn15OnixInvisible`/`turn15OnixShakeX2`/`turn15OnixHealthboxWobbleY2`,
  new `drawTurn13SwitchinFieldBase` params (`onixInvisible`/
  `healthboxY2Extra`/`onixX2`, all default-off). Dense oracle-pixel
  bisection (not just RAM) surfaced 3 real corrections to the original
  scout dossier's own RAM-only read: (1) Onix's RAM-`invisible` span
  19042-19081 does NOT hide it on screen (`monbg` swaps in a pixel-
  identical BG copy) — only the genuine hit-flash toggle (19107-19134)
  needs a visibility change; (2) the hitsplat blends against the LIVE
  framebuffer (Onix's own body), not the static field turn 9's own
  instance used — a real per-move OAM-ordering difference, solved by
  back-solving the blend equation against oracle pixels; (3) Onix's own
  `AnimTask_ShakeMon` x2 shake (3× 2-tick 6px pulses) is real and needed
  fixing a period-4 match/mismatch oracle pattern. `turn15-fly-strike.json`
  extended 19045→19141, 176/176, 0 diff — excludes 3 ticks (19059-19061,
  ≤10px ball-edge rounding residual, shared-primitive risk not chased) and
  stops cleanly at 19141 rather than padding to ~19150, since dense
  bisection found HP-drain text already changing at 19142 (boundary
  (iii)'s own scope, 5 ticks earlier than the dossier's "~19147" citation).
- **Next:** ISSUES #36's own remainder (boundary (iii): "not very
  effective" text, HP-drain-from-19142, first player-side faint sink,
  "ONIX fainted!" hold — every phase flagged pure-wiring-reuse, no new
  probes expected). ISSUES #35's own extremum probe; #34's own remainder
  (17722-17768); #33's tiny remainder (17019/17034); ISSUES #32.
- **Notes:** Full writeup `docs/turn15-notes.md` §8 (owned this round).
  Both probes were real, bounded RAM/VRAM work exactly as scoped — landed
  in-budget with room to also chase 3 oracle-pixel-only residuals RAM
  alone would never have caught. No PAPERCUTS beyond the standing
  mgba-venv-teardown one.
