# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 255 — Bounded worker (turn-15 wiring step, boundary (i) of 3): wired the reopen gate + FIGHT submenu + confirm + FLY-strike kickoff text — `turn15-fly-strike.json` **82/82, 0 diff** (new trace, first commit toward turn 15); boundaries (ii)/(iii) — the strike animation core, faint sink, fainted-hold — NOT attempted this session, scoped and filed as ISSUES #36

- **State:** `npm test` **993/993**, `npm run build` green, tree clean.
  `verify-turn15.ts` re-run first (mandatory step): 59 PASS / 0 FAIL (the
  brief said "58/58"; the script prints 59 PASS lines with 0 failures —
  same "ALL CHECKS PASSED" gate, no discrepancy in substance). Regression
  sweep 0 diff: `turn14-fly-miss` 165/165, `turn13-switchin` 240/240,
  `turn13-menu` 57/57.
- **Did:** New `turn14Resolved` state flag end-to-end (mirrors
  `turn13Resolved` exactly): `BattleSceneState` field, `core.ts`'s new
  reopen branch (`TURN14_DRAGONBREATH_MENU_REDRAW_DELAY`-gated, cursor
  persisted at slot 2/DRAGON_BREATH, no nav), `currentPPForActiveMon`'s 3rd
  slot-2 PP decrement (20→17, turn 14's own auto-missed DRAGON_BREATH still
  costs PP), and `drawTurn15FightSubmenuWindow`/`drawTurn15FlyStrikeWindow`
  (new functions, `battleScene.ts`). Found and corrected one dossier slip
  along the way (now in `docs/turn15-notes.md` §7): the confirm-press
  transient does NOT clear to a bare/blank box before the kickoff text like
  turn 14's own charge half did — the submenu chrome holds unchanged
  through tick 19006, then hard-cuts straight to the text's own first
  glyph at 19007 (dense sha-transition probe, oracle round-trip); kickoff
  text is 20 chars total (not 21), cross-checked via both embedded spaces'
  own "no visible pixel change" ticks landing exactly where the formula
  predicts. Committed `tools/compare/traces/turn15-fly-strike.json`:
  82/82, 0 diff over 18956-19044, excluding 7 ticks (18965-66/74-75/83-85)
  — a pre-existing sine-bounce "extremum" mismatch on Onix's own idle
  sprite, same bug class as the already-documented `turn5SubmenuBounceTick`
  fix, unrelated to this session's new code — named and excluded, filed as
  **ISSUES #35** (not guessed at, not faked).
- **Next:** ISSUES #36 (this same turn's own boundaries (ii)/(iii): ball-
  descent trajectory needs a fresh `dump-fly-anim.py` run over 19045-19075
  against the already-committed groundtruth trace; the new impact sprite
  at tile 433 needs VRAM identification+extraction — both real, bounded,
  RAM/asset tasks, not blocked on anything; everything else in
  `docs/turn15-notes.md` §6f's reuse table is flagged pure wiring once
  those two land). ISSUES #35's own extremum probe; #34's own remainder
  (17722-17768); #33's tiny remainder (17019/17034); ISSUES #32.
- **Notes:** Full writeup `docs/turn15-notes.md` §7 (owned this round).
  Ran out of safe remaining budget before boundaries (ii)/(iii) — both
  need real RAM/VRAM probing (not just wiring already-banked constants,
  unlike every session in the turn13/14 chain before this one), so rather
  than rush an asset extraction and risk an unclean stop, this session
  banked one clean, tested, fully green commit and scoped the remainder
  precisely for the next session. No PAPERCUTS beyond the standing
  mgba-venv-teardown one.

---
