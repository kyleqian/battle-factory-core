# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 249 — Bounded worker (S7/S8 engine step): turn 14 wired end-to-end — Murkrow's FLY charge-half + Onix's DRAGON_BREATH auto-miss (STATUS3_ON_AIR) through the settled turn-15 menu — `turn14-fly-miss.json` **149/149, 0 diff**; a pre-existing shared-regime residual (ISSUES #50's family) resurfaces at 51 ticks, named and excluded per the brief's own instruction, NOT chased

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

---
## 248 — Bounded worker (S7 engine step): AERIAL_ACE + hitsplat CLOSE-OUT — all 4 parts LAND: turn-10 window gapless 0-diff 12345-12437 (overlap rule + darken + flicker + a newly-discovered player-healthbox wobble), ISSUES #31 hitsplat SOLVED and deleted (167/167, was 159/159), turn-12 mirror gapless 0-diff over its own +2068 shift (131/131); one NEW residual found and honestly excluded (ISSUES #32, a different bug from #31, NOT chased)

- **State:** `npm test` **993/993** (986 + 7 new Tier-1), `npm run build`
  green, tree clean, 4 commits this session (one per part, each green).
  `verify-turn10-aerialace.ts` **49/49**, `verify-turn9-hitsplat.ts`
  **12/12** (both mandatory-first-step reruns, unchanged throughout).
  Traces: `turn10-aerialace.json` **93/93** (was 23/23, now gapless
  12345-12437 — `turn10-rockslide.json` still owns 12438+), `turn9-
  quickattack.json` **167/167** (was 159/159, restores 8 of the 10
  previously-excluded 10935-10944 renders), `turn12-aerialace.json`
  **131/131** (was 56/56, closes the +2068-shifted 14431-14505 gap). Full
  regression sweep 0 diff: `turn10-rockslide` 220/220, `turn9-quickattack-b`
  77/77, `turn9-rockslide` 130/130, `turn12-rockslide-miss` 38/38,
  `turn13-switchin` 156/156.
- **Did:** wired every rule the dossiers had already pinned — PART 1: slot 7
  wins its OAM tie against the real sprite unconditionally (blends against
  the field, never live `fb`); slot 4 does NOT share that rule (falsified
  both "always wins" and "always loses" via `npm run compare` — the truth is
  a one-tick flip, wins ONLY at its own life's last tick, render 12368,
  corrected its life-1 window's end lag along the way, updated the stale
  Tier-1 pin). PART 2: turn 9's flicker reused verbatim at a new anchor;
  extending to gapless coverage surfaced a SECOND unpinned mechanism
  (`docs/aerial-ace-notes.md`'s own named-but-unchecked "player-healthbox
  wobble" gap) — reused `turn9Ep2HealthboxWobbleY2` the same way, tested the
  reuse hypothesis directly against the oracle (not derived from the shape
  alone), closes exactly. PART 3: fixed the hitsplat's target2 (field, not
  live fb, `eva=12/evb=8`) — genuinely solved, but restoring the excluded
  window exposed a DIFFERENT bug one layer deeper (Pidgeotto's own
  QUICK_ATTACK clone overlap, 2 ticks, 203px) — tried transferring
  AERIAL_ACE's exact formula, it didn't fit; reverted rather than curve-fit,
  named `ISSUES.md` #32. PART 4: turn 12's own dispatcher had never wired
  mechanism 4/flicker/wobble at all — added, using the SAME `(t,pressTick)`-
  relative anchors turn 10 uses, confirming the "+2068 bit-exact re-anchor"
  claim extends to these three mechanisms too.
- **Next:** ISSUES #32 (turn 9 QUICK_ATTACK slot 3/4 overlap, 10940-10941) —
  needs a fresh `gMain.oamBuffer` RAM probe of those two sprites specifically
  before the next attempt, per the "wiring not derivation" convention (this
  session deliberately did not re-derive without that ground truth). Turn
  13's own §50 residuals (materialize/wobble, settled-menu subset) and turn
  14+ wiring remain the next natural targets, unchanged from #247's own
  handoff.
- **Notes:** Full writeup in `docs/battle-turn-notes.md` §51 +
  `docs/aerial-ace-notes.md`'s + `docs/turn9-shake-notes.md`'s own newest
  dated sections. No PAPERCUTS beyond the standing mgba-venv-teardown one.

---
## 247 — Supervisor fold: turn-13 rung 4 SALVAGED+LANDED (`turn13-switchin.json` **156/156**, cap-killed pre-commit — supervisor verified + committed with provenance; turn 13 NOT fully green, two named residuals excluded per §50), turn-16 + turn-17 retrofit probes verified+merged (**every banked dossier turn 13→WIN now has a PASS/FAIL verify script**), overlap-rule transfer probe folded earlier (AERIAL_ACE darken = 5-bit-domain formula fix, 18/18 exact; ISSUES #31 hitsplat SOLVED 4210/4210 — wrong target2, wiring-ready)

- **State (supervisor-verified):** `npm test` **986/986**, `npm run build`
  green, tree clean, no unmerged branches. Traces this hour (all
  supervisor-rerun 0 diff): turn13-menu 57/57, turn13-sandattack 190/190,
  turn13-dragonbreath-faint 141/141, turn13-switchin 156/156. Verify
  scripts from main tree: turn13 60/60, turn14 28/28, turn15 58/58,
  turn16 233-cap PASS, turn17 245-cap PASS, turn10-aerialace 49/49,
  turn9-hitsplat 12/12.
- **Did:** rung 4's worker finished the engine work + §50 writeup but was
  cap-killed before committing — supervisor reran suite/build/trace/
  regression sweep and committed (`battleScene.ts` +251 lines,
  icon-bar/particles generalized with new anchor params; frozen wait-
  cursor + double-shift bugs found by compare and fixed). §50's honest
  remainders: (1) Murkrow's materialize/wobble 17004-17069 needs its OWN
  RAM table (Pidgeotto's deltas don't transfer; settle tick corrected to
  17070); (2) settled-menu bounce subset 17106-17130+ — reset shift is
  NOT purely additive, suspect a fresh-menu-open-style blank transient.
  BRN badge pinned at tick 21542 (replaces HP label glyph, no layout
  shift, static). Turn-17 retrofit: 7 corrections incl. a unique
  pixel-leads-RAM faint-sink freeze; DESTIN trainer-pic slide-in (~31
  ticks) characterized; faint-sink family now formula-exact.
- **Next:** (1) AERIAL_ACE + hitsplat close-out engine step (launching
  now): rung-b darken via the 5-bit-domain formula, rung-c flicker =
  turn9Ep2OnixInvisible re-anchor, overlap compositing rule (OAM-winner +
  BG-composite target2) in the turn-10 window AND the turn-9 hitsplat
  (restore #31's excluded 10935-10944), rung-d turn-12 mirror at +2068.
  (2) turn-13's two §50 residuals (materialize RAM probe first). (3)
  turn-14 wiring off verify-turn14 (28/28) — dossiers/scripts wiring-ready
  through the WIN.

