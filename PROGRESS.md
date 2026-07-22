# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 249 — Bounded worker (S7/S8 engine step): turn 14 wired end-to-end — Murkrow's FLY charge-half + Onix's DRAGON_BREATH auto-miss (STATUS3_ON_AIR) through the settled turn-15 menu — `turn14-fly-miss.json` **149/149, 0 diff**; a pre-existing shared-regime residual (battle-turn-notes §50's family, now filed as ISSUES #33) resurfaces at 51 ticks, named and excluded per the brief's own instruction, NOT chased

- **State:** `npm test` **993/993** (unchanged, pure wiring), `npm run build`
  green, tree clean. `verify-turn14.ts` **28/28** (mandatory-first-step
  rerun, unaffected). New trace `tools/compare/traces/turn14-fly-miss.json`
  **149/149, 0 diff** (`npm run compare`), reusing `battle1-turn14-
  dense.json`'s full 110-segment script, dense on every genuinely-0-diff
  span (the whole DRAGONBREATH-kickoff/held/transition/missed-text/held
  window 17916-18079 gapless, plus FLY-up/submenu/settled-menu spot
  ticks). Full regression sweep 0 diff: `turn13-switchin` **156/156**,
  `turn13-menu` **57/57**, `turn12-menu` **46/46**, `turn10-aerialace`
  **93/93**.
- **Did:** `core.ts` gained `turn13Resolved` (mirrors `turn12Resolved`
  exactly — new reopen-gate branch `turn12Resolved && !turn13Resolved`,
  cursor persists at slot 2/DRAGON_BREATH, no `DOWN` nav, gated on new
  `TURN13_DRAGONBREATH_MENU_REDRAW_DELAY`). New render dispatch
  (`drawTurn14FightSubmenuWindow`/`drawTurn14FlyMissWindow`) reuses
  `drawTurn13SwitchinFieldBase` throughout (generalized with a new
  `murkrowInvisible` param) — no fresh switch-in regime this turn, so the
  bounce cycle continues turn 13's own "switchin-reset" regime, frozen
  during the resolution at `TURN5_SITRUS_MENU_REDRAW_TICK` ("phase 0" by
  construction). One genuinely new mechanism: the FLY-up "round shadow"
  ball sprite (`gFlyBallUpSpriteTemplate`) — new asset extractor
  (`tools/extract/extract-fly-ball.ts`, `round_shadow.png`) + new render fn
  (`drawTurn14FlyBall`, reusing the EXISTING `drawSpriteSheetAffineStretch
  (doubled=true)` primitive, no new primitive needed) driven by a literal
  24-entry RAM-truthed per-tick affine table (fresh `dump-fly-anim.py`
  re-run this session). Three literal-anchored kickoff/miss texts, all
  solved cleanly from `settle - (total-1)` under the ordinary 1-char/tick
  formula (no new text mechanism). `currentPPForActiveMon`/
  `drawFightSubmenuChrome` gained a `turn13Resolved` param (DRAGON_BREATH
  PP's second decrement, 20→18, matching the dossier's own ledger).
- **Next:** turn 15+ wiring (Murkrow's FLY strike half, unconditional hit,
  forces the switch to MAGBY) — `battle-turn-notes.md` §16/§50 already
  preview this; nothing new to probe for the reopen-gate shape itself
  (mirror `turn13Resolved` again). Also: §50's own original bounce-regime
  bug (materialize/wobble RAM re-probe) would likely close most of this
  session's own 51 excluded ticks for free if fixed upstream.
- **Notes:** Full writeup in `docs/battle-turn-notes.md` §52. Named,
  excluded residual (NOT this session's own bug, time-boxed per the
  brief's explicit instruction): 51 of 200 originally-sampled ticks
  (submenu-open/confirm-transient 17722-17768, a handful of FLY-up-
  adjacent ticks 17781-17787, "flew up high!" mid-typing kerning-class
  ticks 17822-17845, the menu-redraw transition 18080-18090, two
  settled-tail spot ticks 18815/18956) show diffs (629-1562px, isolated to
  Onix's own sprite/healthbox) whose pixel counts land exactly inside the
  range `battle-turn-notes.md` §50 already characterized as a pre-existing,
  not-a-pure-additive-shift bug in the shared settled-menu bounce regime —
  excluded from `captureFrames` rather than faked, matching this dossier's
  "exclude, don't fake" convention. No PAPERCUTS beyond the standing
  mgba-venv-teardown one.
