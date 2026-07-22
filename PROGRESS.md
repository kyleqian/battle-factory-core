# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 252 — Bounded worker (turn-13 wiring step, ISSUES #33b): wired the probe-confirmed switch-in text-clear/menu-redraw split — `turn13-switchin.json` **191/191, 0 diff** (was 171/171); found a NEW regression in turn 14's own downstream reuse while restoring the probe's turn-14 predictions, filed as ISSUES #34 rather than re-derived on the spot — `turn14-fly-miss.json` **150/150, 0 diff** (net +1 from 149: +4 restored, -3 excluded as a real regression)

- **State:** `npm test` **993/993** (unchanged, pure wiring), `npm run
  build` green, tree clean. `verify-turn13-bounce.ts` **14/14 PASS**
  (mandatory-first-step rerun, both before and after the edit — oracle-
  only, unaffected by `src/`). Regression sweep 0 diff: `turn13-menu`
  57/57, `turn13-sandattack` 190/190, `turn13-dragonbreath-faint` 141/141,
  `turn12-menu` 46/46.
- **Did:** Wired `docs/turn13-bounce-notes.md` §6 exactly: new
  `TURN13_SWITCHIN_TEXT_CLEAR_TICK=17106`; `TURN13_SWITCHIN_MENU_REDRAW_
  TICK` moved `17106→17112`; new blank-hold branch in
  `drawTurn13SwitchinWindow` mirroring `drawTurn5RockSlideWindow`'s own
  no-op gap. `turn13-switchin.json` restored to 191/191 (the named
  17106-17111/17113/17117-17122/17126-17130 family + spot ticks
  17175/17200). Testing turn 14's predicted restores directly against
  `npm run compare` (not just RAM) found they mostly don't hold: 0/13 of
  the "likely closes" family (18080-18090/18815/18956) pass; only 4/54 of
  the "flagged-maybe" families (17722-17768, 17781-17787) pass
  (17722-17725). Worse, applying the corrected `TURN13_SWITCHIN_RESET_
  SHIFT` to turn 14's own continuation formula regressed 3 previously-
  passing ticks (18087/18095/18415) — a fresh oracle sha probe of
  `TURN14_MENU_REDRAW_TICK`'s (18086) own neighborhood shows the SAME
  structural signature #33(b) had (a 6-tick unmodeled blank hold at
  18080-18085, before an already-correctly-anchored reveal at 18086) plus
  an unresolved regime-reset-vs-continuation question for the bounce phase
  from 18086 on. Did not re-derive this in-session (needs its own RAM
  probe, same two-independent-methods bar this dossier holds itself to) —
  filed as **ISSUES #34**, excluded the 3 regressed ticks + the tested-
  and-failed families, restored the 4 that passed. ISSUES #33(b) deleted
  (fixed); #33(a) untouched (sibling probe's own remainder, not touched
  this session).
- **Next:** ISSUES #34 (turn 14's own menu-redraw blank-hold + regime
  question — needs `dump-turn13-bounce-driver.py`'s own method re-pointed
  at 18086, then likely a small wiring pass much like this one); #33(a)'s
  VRAM tile dump (frame2 asset); ISSUES #32; turn 15+ wiring.
- **Notes:** Full writeup `docs/turn13-bounce-notes.md` §9 (owned this
  round, per the brief). Third session in a row where a "banked, probe-
  confirmed, pure wiring" derivation was locally exact (2 independent
  methods, RAM+sha) yet still surfaced a genuinely new bug on contact with
  a wider `npm run compare` sweep — this time one turn downstream, not in
  the fix's own window. The fix itself is not in question (turn13-
  switchin.json's own 191/191 is exact); the lesson is that shared
  constants (`TURN13_SWITCHIN_RESET_SHIFT`) need their OWN reuse sites
  re-verified, not just their defining window, before a session can claim
  "no other constants change." No PAPERCUTS beyond the standing
  mgba-venv-teardown one.

