# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 251 — Bounded worker (turn-13 wiring step, ISSUES #33a): wired the banked MURKROW wobble table — RAM-cross-checked byte-exact fresh, anchor/frame-flip confirmed — but wiring alone didn't reach 0-diff; found+fixed 2 more real bugs (BG-fade never re-anchored for turn 13; tint-ramp needs to keep running into the wobble draw, unlike Pidgeotto's); `turn13-switchin.json` 156→**171/171**, 15 of 66 excluded ticks restored (17004-17018); remaining 51 ticks (17019-17069) re-excluded under a narrower, colors-now-ruled-out residual (likely the reused `frame2` asset is wrong art) — #33a NOT closed, trimmed not deleted

- **State:** `npm test` **993/993** (unchanged), `npm run build` green, tree
  clean. `verify-turn13-materialize.ts` 20/20 (mandatory-first-step rerun,
  unaffected — RAM/oracle-only, doesn't assert app pixels). Regression
  sweep 0 diff: `turn14-fly-miss` 149/149, `turn13-menu` 57/57,
  `turn13-dragonbreath-faint` 141/141.
- **Did:** Transcribed `TURN13_MURKROW_WOBBLE_TABLE` (50 entries) into
  `battleScene.ts`, anchored `TURN13_MURKROW_STRETCH_TICK=17020` (not the
  old `SETTLE_TICK`-minus-table-length 17030), `TURN13_MURKROW_FRAME_FLIP_
  TICK=17034` (single flip, not Pidgeotto's reused 5-breakpoint cycle) —
  then re-ran the RAM probe fresh this session and confirmed all 50 entries
  byte-exact, so the table/anchor were never the problem. Wiring alone left
  the ENTIRE restored window red; found two more bugs by direct pixel
  diffing: (1) `turn5BgFadeY(t)` (the switch-in's own BG-to-white dither)
  was hardcoded to turn 5's own tick range, silently 0 for all of turn 13 —
  added a `bgFadeYOverride` param to `drawTurn5RockSlideAttack` + a
  `turn13MurkrowBgFadeY` reusing `TURN5_BG_FADE_Y` verbatim at a freshly
  re-derived anchor; (2) the wobble draw hardcoded `tintCoeff=0` (copied
  from Pidgeotto, where the ramp always finishes before the stretch phase
  starts) but MURKROW's own ramp-render-start (17026) falls AFTER its own
  wobble start (17020) — fixed by computing `turn13MurkrowMaterializeCoeff
  (t)` in the wobble branch too. Closed 17004-17018 (15 ticks) to 0-diff.
  Remaining 17019-17069: colors now correct (pixel-sampled) but MURKROW's
  own leg/lower-body shape stays mismatched even at near-identity table
  entries — `pa/pb/pc/pd` RAM-exact, `pb=pc=0` (no dropped rotation term),
  frame timing RAM-exact — points at the reused `frame2` asset itself,
  which `drawTurn13MurkrowSettled` never actually exercises (always draws
  `tileset`), so it's never been oracle-validated in any passing trace.
- **Next:** #33a's own concrete next step: fresh VRAM tile dump at a
  materialize-window tick with `animCmdIndex=1` (e.g. RAM 17040, same
  addressing `dump-turn13-murkrow-materialize.py` already established),
  diffed byte-for-byte against the extracted `frame2` tiles. #33b (settled-
  menu bounce, Mission B) still needs its own characterization probe,
  untouched this session. ISSUES #32 and turn-15+ wiring both still open.
- **Notes:** Full writeup `docs/turn13-notes.md`'s newest section (owned
  this round). This is the second time a "banked, pure wiring" derivation
  turned out incomplete on contact with `npm run compare` (cf. #249's own
  51-tick surprise) — the mandatory RAM-only verify script is necessary but
  not sufficient to guarantee 0-diff; only a real oracle pixel compare over
  the restored window catches gaps like the BG-fade anchor and tint-ramp
  duration, which no RAM-only check was set up to see. No PAPERCUTS beyond
  the standing mgba-venv-teardown one.

---
## 250 — Supervisor wind-down: session end 2026-07-21 ~23:05 — **12 verified worker steps folded across 6 rounds** (5 main-lane engine slices incl. 2 cap-kill salvages + 7 worktree probes, zero dud steps); suite **966 → 993/993**; headlines: **turns 13 AND 14 wired end-to-end** (13: menu/SAND_ATTACK/DRAGON_BREATH-faint/MURKROW-switch-in, traces 57+190+141+156; 14: FLY-charge + auto-miss, 149/149), **the AERIAL_ACE window closed GAPLESS** (93/93 + turn-12 mirror 131/131) via a 3-probe crack chain (OAM-winner overlap rule → 5-bit-domain darken → both verified pixel-exact), **ISSUES #31 hitsplat SOLVED + deleted** (wrong target2 — 4210/4210 exact; trace 167/167), **retrofit pipeline completed through the WIN** (verify-turn14/15/16/17 all banked, BRN badge pinned at 21542), #32+#33 filed with named instruments

- **State (verified this minute):** `npm test` **993/993**, `npm run
  build` green, tree clean, no worktrees, no unmerged branches. Traces
  new/extended this session (all supervisor-rerun 0 diff):
  turn13-menu 57, turn13-sandattack 190, turn13-dragonbreath-faint 141,
  turn13-switchin 156, turn14-fly-miss 149, turn10-aerialace 23→93,
  turn9-quickattack 159→167, turn12-aerialace 56→131. Verify scripts all
  passing from main tree: turn13 60/60, turn13-materialize 20/20,
  turn14 28/28, turn15 58/58, turn16, turn17, turn10-aerialace 49/49,
  turn9-hitsplat 12/12.
- **Next:** (1) turn-13 finish via ISSUES #33 — (a) is pure wiring (the
  banked Murkrow wobble table, mind the 50th-entry trap), (b) needs its
  one characterization probe first; (2) ISSUES #32 (named instrument:
  gMain.oamBuffer probe of slots 3/4 at RAM 10939-10940); (3) turn-15
  wiring off verify-turn15 (58/58) — then 16/17/WIN, all retrofit-ready;
  (4) ISSUES #23 stays parked.
- **Notes:** zero merge conflicts across 8 merges. Two cap-kills, both
  salvaged cleanly (SAND_ATTACK probe committed pre-kill; rung 4
  finished work+§50 but not the commit — supervisor verified and
  committed with provenance). Three consecutive early-stop workers
  (~20 of 60 min) fixed by switching to single-rung 40-min briefs —
  later workers then used 30-35 min productively. The probe→wiring
  pipeline went 7-for-7 again; the overlap-rule crack transferred
  across three windows (AERIAL_ACE plain → darken → hitsplat) but #32
  proved "wins its OAM tie" is tick-dependent, not shape-transferable.
  Interactive session; no escalations needed; no usage-limit events.
