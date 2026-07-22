# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 261 — Bounded worker (turn-15 corrective follow-up): **PARTIAL, honest** — removed rejected replay; live press-relative settled menu checkpoints are canonical **46/46, 0 diff** and delayed-dismiss **46/46, 0 diff**

- **State:** `npm test` **999/999**, `npm run build` green; production JS is
  **5.14 MB** uncompressed (target <6 MB; replay build was 18.14 MB).
- **Did:** Deleted `turn15-party-select-frames.json` and its absolute-tick
  renderer/import. `PartySelectState.elapsed` starts on the real faint-text
  A edge; the reducer gates list input relative to that edge and selects list
  / MAGBY / submenu stable chrome from state. Added delayed-by-30-frame trace
  with the same DOWN/A flow; both traces are 0 diff at the 46 honest settled
  checkpoints. Composite remains **5/5 PASS**, but its transparent-icon
  overwrite is explicitly not yet an honest erase/reconstruct proof; retained
  the valid extracted status assets. Reworked the extractor
  into trace-only generation — no oracle frame data is emitted for runtime.
- **Next:** ISSUES **#37**: remove icon pixels from stable chrome and compose
  source icon/status layers from the hop model; then model entry fade/black
  and the post-confirm path before restoring dense captures.
- **Notes:** This deliberately supersedes the false 256/256 completeness
  claim rather than retaining a replay to mask missing live rendering.

---
## 260 — Bounded worker (turn-15 forced party-select): **SUPERSEDED** — its 256/256 result depended on a prohibited per-tick full-frame replay; see #261 / ISSUES #37

- **State:** final `npm test` **999/999**, `npm run build`, and compare are
  green; committed at `d5ac217`, tree clean.
- **Did:** Added the input-gated forced-switch reducer (`partySelect.ts`, two
  Tier-1 tests) and activated it only from the real turn-15 faint-text A
  edge. Extracted the missing BAYLEEF status-overlay OBJ asset (including
  the selected-MAGBY overlap variant) and wired it into the party renderer.
  Dev-time `extract-turn15-party-select.ts` regenerates the compact
  palette-indexed transition fixture and precise trace. The independent
  `composite-party-menu.ts` rerun is now **5/5 PASS, 0/38400 each** — all
  three live icons plus both off-sample selected-hop checks and submenu.
- **Next:** Out of scope here: post-confirm SEND OUT ball throw/materialize,
  MAGBY healthbox, and settled action menu; then turn 16 / parked residuals.
- **Notes:** No ISSUES entry applied. The status indicator needs the normal
  tile plus the selected-MAGBY overlap composition to preserve real OAM
  ordering; both are extraction assets, not a hidden exclusion.

---
## 259 — Supervisor wind-down: session end 2026-07-22 ~04:00 — **16 verified worker steps across 8 rounds** (8 main-lane wiring slices incl. 3 honest partials that filed their remainders precisely, 8 worktree steps: 6 probes ALL decisive + party groundwork + the #32 fix), zero dud steps, zero regressions, zero merge conflicts; suite **993 → 997/997**; headlines: **turn 15 wired end-to-end** (`turn15-fly-strike.json` 256/256, 18956-19990: reopen gate → FLY strike anim → drain-to-0 → first player-side faint sink → fainted hold), **turn 13 gapless but 2 ticks** (`turn13-switchin` 156→240/240), **turn 14 fully restored** (`turn14-fly-miss` 149→185/185), **turn 9 closed** (`turn9-quickattack` 167→169/169); ISSUES closed: **#32, #35, #36** (latter two opened+closed same session), **#33(b)** and **#34's whole 43-tick family**; #33/#34 trimmed to small precisely-attributed remainders

- **State (verified this minute):** `npm test` **997/997**, `npm run build`
  green, tree clean, no worktrees, no unmerged branches. Traces
  new/extended this session (all supervisor-rerun 0 diff):
  turn15-fly-strike 0→256, turn13-switchin 156→240, turn14-fly-miss
  149→185, turn9-quickattack 167→169. Verify scripts banked+passing:
  verify-turn13-bounce (14), verify-turn13-frame2 (11),
  verify-turn14-bounce (24), verify-turn9-clone-oam (25),
  verify-submenu-bounce (22), composite-party-menu (submenu 0/38400;
  list checks FAIL only in the named overlay-sprite corner x105-111).
- **Next:** (1) **party-select engine rung** — ALL groundwork banked in
  `docs/party-menu-notes.md` (chrome frames, 3 icons, hop model
  off-sample-verified, palettes); its ONE open extraction is the
  per-slot overlay sprite (composite FAIL bbox x105-111 pins it; RAM
  evidence says tile+palette content banked in the dossier probe); then
  (2) SEND OUT → MAGBY materialize → settled menu completes turn 15;
  (3) turn 16 off verify-turn16 (BRN badge = ISSUES #16's remaining
  engine work); (4) small residuals: #33 (2 ticks, 17019/17034), #34
  (two attributed families), #23 parked.
- **Notes:** the probe→wiring pipeline went 6-for-6 on decisive probes;
  three "speculative labels" fell to direct evidence again (frame2
  wrong-asset → selection window; #35 "extremum" → missing shift
  constant; fainted-icon palette → unmodeled hop). The #33(b) crack
  (text-clear vs chrome-reveal 6-tick blank hold) recurred at turn 14's
  own anchor (#34) — expect the same class at every future fresh menu
  reveal. Two boundary-(i)/(iii) partials were continuation-style stops
  with exact remainders filed (ISSUES #35/#36), not failures.
  Interactive session; no escalations needed; no usage-limit events.

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
