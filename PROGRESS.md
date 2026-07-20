# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 181 — Bounded worker: S7 slice L-3 — ball prop + open-particle burst + materialize GROWING phase LANDED; `turn5-switchin.json` (new) **167/167, 0 diff**, `npm test` **781/781** (+1), build green, zero regressions; materialize's own ramp-down/wobble phases + everything past them (healthbox/Sitrus/settled-menu) NOT reached

- **State:** `npm test` 781/781, `npm run build` green, tree clean.
  `turn5-switchin.json` (ball prop create/open/openFinal, the open-particle
  burst, Pidgeotto's materialize GROWING silhouette, tick 6588-6754)
  **167/167, 0 diff** (new). Full regression sweep at exact prior counts,
  all 0 diff: `turn5-sentout` 141/141, `turn5-faint` 110/110, `turn5-
  rockslide` 256/256, `turn5-endeavor` 254/254, `turn5-menu` 41/41, `turn4-
  rockslide` 250/250, `turn4-doubleteam` 249/249, `turn3-rockslide`
  256/256, `turn1-rockslide` 256/256, `fight-submenu` 235/235, `turn3-
  endeavor` 192/192, `turn3-menu` 254/254, `turn2-endeavor-drain` 201/201,
  `turn4-menu` 44/44, `turn2-dragonbreath` 237/237, `turn1-cloneanim`
  230/230, `menu-idle` 69/69, `turn2-endeavor` 77/77, `s6-acceptance`
  224/228, `scene-assembly` 256/256, plus `sendout.json` **255/256**
  (unchanged, pre-existing named residual).
- **Did:** per the brief's own instruction, RAM-probed ambiguities against
  the already-committed probes first, then iterated render code against the
  live oracle. Landed the ball prop (`TURN5_BALL_HANDOFF_TICK=6727`,
  reusing `drawSendOutBall` verbatim - zero new ball code), a NEW clean
  open-particle-burst formula (`drawTurn5SwitchinParticles` - reusing
  `drawBallOpenParticles` verbatim was WRONG, it bakes in an S6-specific
  one-off RAM-stall correction that doesn't apply here), and Pidgeotto's
  materialize GROWING phase (reuses `affineEmergeAccumulator`/
  `MATERIALIZE_Y2_TABLE` verbatim, including the `+1` logical-offset
  correction §7.21 already established for Grovyle). Found and fixed two
  real bugs mid-session: (1) the switch-in window's own BG-to-white dither
  table was under-resolved on a first pass (a low-dynamic-range sky swatch
  hid two real steps) - re-derived from a ground swatch, exact; missing
  this produced a >16000px/43% full-frame diff that read like a sprite bug
  until isolated. (2) Pidgeotto's own front-sprite frame-parity mapping was
  inverted from the naive even/odd guess - pixel-verified and flipped
  (474px -> 26px residual). The coefficient ramp-down phase (render
  6768-6782) still carries a real ~3% residual not root-caused this
  session (RAM-exact coefficients, something else off - see docs); the
  wobble-table phase (~6786-6828) looks clean in spot checks but wasn't
  independently verified as its own 0-diff span. Per AGENTS.md, cut the
  committed trace at the longest verified-clean boundary (6754, right
  before the ramp phase) rather than ship the residual ticks.
- **Next:** close the coefficient-ramp residual (render 6768-6782, exact
  RAM values already known - `docs/faint-switch-notes.md` §10 item 1),
  verify the wobble-table phase as its own dense span (item 2), which
  unlocks `TURN5_PIDGEOTTO_SETTLE_TICK`(6828, already pixel-confirmed) as
  a clean extension boundary. Healthbox slide-in through Sitrus/settled-menu
  (§8e/§2/§3e, fully spec'd) remain completely untouched.
- **Notes:** PAPERCUT: ~25-30 min lost to a background-fade-table
  under-resolution that read as a sprite-geometry bug (huge 43% diff)
  before isolating it to a palette-blend table built from too low a
  dynamic-range swatch - worth flagging in any future "pixel-sample a
  fade table" task: verify against a swatch whose unfaded value has enough
  headroom in EVERY channel to resolve each step distinctly, or solve
  directly from RAM palette-buffer data (as this session ultimately did for
  the ramp-down coefficient) rather than a screenshot color read.

---
## 180 — Bounded worker: S7 slice L-2 (retry) — icon-bar re-trigger LANDED, tick-6727 transient RESOLVED (RAM-probed, not guessed); `turn5-sentout.json` (new) **141/141, 0 diff**, `npm test` **780/780** (+4), build green, zero regressions

- **State:** `npm test` 780/780, `npm run build` green, tree clean.
  `turn5-sentout.json` (icon-bar create/slide/settle/text/fade/destroy,
  tick 6588-6728) **141/141, 0 diff** (new). Full regression sweep at exact
  prior counts, all 0 diff: `turn5-faint` 110/110, `turn5-rockslide`
  256/256, `turn5-endeavor` 254/254, `turn5-menu` 41/41, `turn4-rockslide`
  250/250, `turn4-doubleteam` 249/249, `turn3-rockslide` 256/256, `turn1-
  rockslide` 256/256, `fight-submenu` 235/235, `turn3-endeavor` 192/192,
  `turn3-menu` 254/254, `turn2-endeavor-drain` 201/201, `turn4-menu`
  44/44, `turn2-dragonbreath` 237/237, `turn1-cloneanim` 230/230,
  `menu-idle` 69/69, `turn2-endeavor` 77/77, `s6-acceptance` 224/228,
  `scene-assembly` 256/256, plus `sendout.json` **255/256** (unchanged,
  pre-existing named residual).
- **Did:** per the supervisor's own explicit instruction, RAM-probed BOTH
  of #179's open unknowns BEFORE writing any render code (two new
  `ram-probe.py` specs, `switchin-iconbar-{slidein,transient}.json`, each
  run twice, byte-identical). Result: (1) the icon slide-in is NOT
  per-icon-staggered as #179 guessed - all 7 sprites (bar + 6 icons) share
  one IDENTICAL `x2` curve, bit-for-bit `OPP_BAR_X2` itself, zero stagger.
  (2) the tick-6727 "mystery transient" RESOLVED: at RAM 6725 all 7
  sprites' OAM `objMode` flips `NORMAL`->`BLEND` simultaneously (`x`/`y`/
  `x2`/`y2` unchanged - ruling out a position explanation), then all 7 are
  destroyed together at RAM 6742 - the same `Task_HidePartyStatusSummary`
  alpha-blend-then-destroy shape already modeled for the PLAYER bar's own
  S6-intro exit (`playerSummaryFadeEva`), just a flatter cadence here (1
  unit/tick, not "every other"). Implemented `drawTurn5IconBar` (reuses
  `OPP_BAR_X2`/`tableX2`/`drawBallStatusBar`/`blendedSetPixel` - zero new
  low-level drawing code) + the sent-out text hard-cut at the oracle-pinned
  absolute tick 6687. Landed BOTH the mandatory rung (a) and rung (b) in
  one commit (`turn5-sentout.json`, 6588-6728) since both were RAM-resolved
  before any code was written - stops one tick before the unimplemented
  ball prop's own first pixel (confirmed via a pixel-level diff that the
  gap is ball-shaped, not icon-bar-shaped: mismatched region isolated to
  x170-181/y58-69, the ball's own resting corner, ball-open-palette
  colors). Added 4 Tier-1 pins (icon-flip state, 3 for the tick-6727
  eva-ramp mechanism, 1 for the sent-out text timing). Docs: `docs/faint-
  switch-notes.md` §9 gained a "Resolution" subsection; new §25 in
  `docs/battle-turn-notes.md`.
- **Next:** the ball prop (fully spec'd, §8b: slot 7, static `(176,64)`,
  6727-6756) through Sitrus/settled-menu - all still pinned in docs, none
  reached this session (ran out of cap after landing the icon-bar
  mechanism cleanly). The two-anchor design (ball/tint/particles vs. the
  front-sprite stretch tables, 24 ticks apart) is unaffected by this
  session's findings and remains the right shape for that work.
- **Notes:** no new papercuts - the RAM-probe-first approach (both
  unknowns resolved before writing render code) avoided #179's own
  papercut (a large speculative draft reverted after burning most of the
  cap) entirely; worth keeping as the default order for future sessions
  chasing an undocumented pixel transient.
