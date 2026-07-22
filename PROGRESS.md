# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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
## 254 — Bounded worker (turn-14 wiring step, ISSUES #34 close-out): wired the probe-confirmed menu-redraw blank hold + bounce-regime RESET — `turn14-fly-miss.json` **165/165, 0 diff** (was 150/150; all 15 predicted ticks restored, exact first try); cheap conditional check on the FIGHT-submenu reopen family (17722-17768) came back 0/43 pass — trimmed ISSUES #34 to that honest remainder, not deleted

- **State:** `npm test` **993/993** (unchanged, pure wiring), `npm run
  build` green, tree clean. `verify-turn14-bounce.ts` **24/24 PASS**
  (mandatory-first-step rerun, oracle-only, unaffected by `src/`).
  Regression sweep 0 diff: `turn13-switchin` 240/240, `turn13-menu` 57/57,
  `turn12-menu` 46/46, `turn13-dragonbreath-faint` 141/141.
- **Did:** Wired `docs/turn13-bounce-notes.md` §10d exactly: new
  `TURN14_MENU_TEXT_CLEAR_TICK=18080` + `TURN14_MENU_REDRAW_RESET_SHIFT =
  TURN5_SITRUS_MENU_REDRAW_TICK - TURN14_MENU_REDRAW_TICK`, swapped into
  `drawTurn14FlyMissWindow`'s settled branch (was borrowing
  `TURN13_SWITCHIN_RESET_SHIFT`, which the probe proved wrong — 871/871 RAM
  mismatches vs. 0/871 for the fresh-reset model) plus a new blank-hold
  branch above it. `drawTurn14FightSubmenuWindow`'s own pre-reveal call
  sites left untouched, per the brief. Restored the 15 predicted ticks
  (18080-18090/18095/18415/18815/18956) to `turn14-fly-miss.json`:
  150→165/165, 0 diff, no gap this time between the RAM/sha probe and real
  pixel compare (unlike 3 of the 4 prior sessions in this chain). Cheap
  conditional check (brief step 5, scratch trace only): restored all 43
  still-untested ticks of 17722-17768 and ran `npm run compare` — **0/43
  pass** (6px smallest diff, up to 2331px), refuting the "may already be
  right" theory; nothing restored, scratch file discarded, real trace
  untouched for that span. ISSUES #34 rewritten from "found, uncharacterized"
  to its honest remainder: 17722-17768 (43 ticks, needs its own RAM probe of
  the actual — earlier, unprobed — reopen-reveal instant), 17781-17787 (7
  ticks, same probable class), 17822-17845 (24 ticks, kerning-class, already
  flagged separately) — not deleted, since real excluded ticks remain.
- **Next:** ISSUES #34's own remainder (17722-17768's reopen-reveal probe,
  same two-independent-methods bar); #33's tiny 2-tick remainder
  (17019/17034); ISSUES #32; turn 15+ wiring.
- **Notes:** Full writeup `docs/turn13-bounce-notes.md` §11 (owned this
  round). No Tier-1 pin forced — no existing precedent for unit-testing
  these per-turn window-selector closures in isolation, same call every
  prior session in this chain made. No PAPERCUTS beyond the standing
  mgba-venv-teardown one.

---
## 253 — Bounded worker (turn-13 wiring step, ISSUES #33a close-out): wired the probe-confirmed closed-window frame-selection fix — `turn13-switchin.json` **240/240, 0 diff** (was 191/191; 49 of 51 excluded ticks restored); the exact 2 ticks the probe flagged in advance (17019, 17034) survive as a new, much smaller, separate residual — trimmed ISSUES #33 to just that, not deleted

- **State:** `npm test` **993/993** (unchanged, pure wiring), `npm run
  build` green, tree clean. `verify-turn13-frame2.ts` **11/11 PASS**
  (mandatory-first-step rerun — oracle-only, unaffected by `src/`).
  Regression sweep 0 diff: `turn14-fly-miss` 150/150, `turn13-menu`
  57/57, `turn13-sandattack` 190/190, `turn13-dragonbreath-faint` 141/141.
  Turn 5's own materialize trace needed no rerun: `turn13MurkrowFrame` is
  called only from `drawTurn13MurkrowMaterialize` (MURKROW/turn-13-only),
  entirely separate from `turn5PidgeottoFrame` — confirmed by grep.
- **Did:** Replaced `turn13MurkrowFrame`'s open-ended step (`t < 17034 ?
  0 : 1`) with the probe's exact closed-interval fix (`t >=
  TURN13_MURKROW_STRETCH_TICK && t <= TURN13_MURKROW_FRAME_FLIP_TICK ? 1
  : 0`, `src/engine/battleScene.ts`). Restored ticks 17019-17069 to
  `turn13-switchin.json` (191→242) and ran `npm run compare`: 240/242,
  diff landing at EXACTLY the two boundary ticks the probe's dossier
  pre-flagged (17019: 418px; 17034: 828px), both bboxes confined to
  Murkrow's own silhouette, nowhere else in the window. Excluded just
  those 2 per the pre-authorized caveat (242→240, 0 diff) rather than
  guessing at a fix. No Tier-1 pin forced — no existing precedent of
  unit-testing these per-turn frame-selector closures in isolation, same
  as `turn5PidgeottoFrame` before it.
- **Next:** ISSUES #33's own tiny remainder (17019/17034, needs a fresh
  probe — wobble table index math or tint coefficient right at those two
  ticks, not re-guessed); ISSUES #34 (turn 14's own menu-redraw blank-hold
  + regime question); ISSUES #32; turn 15+ wiring.
- **Notes:** Full writeup `docs/turn13-notes.md`'s newest section (owned
  this round). Fourth session in a row where a "banked, probe-confirmed"
  fix landed almost-but-not-quite gapless on contact with `npm run
  compare` — this time the probe itself had already flagged the exact
  failure mode in advance, so no time was lost chasing it blind. No
  PAPERCUTS beyond the standing mgba-venv-teardown one.

