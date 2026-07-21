# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 215 — Worktree probe (supervisor-folded): **ISSUES #28 ROOT-CAUSED** — the 26 period-9 excluded ticks across turns 6/7/8 are ONE engine bug: the turn-6+ browsing-branch dispatch drops `FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` (the existing constant every turn-1-5 wrapper applies); probe model-check fixes 18/18 RAM-probed named ticks with zero new mismatches, turn 7 retrodicts; the ~9 cadence is sinIndex(+7/tick) crossing ~64-wide plateaus, two seeds (192/128) → the region alternation; `docs/bounce-blip-notes.md` + verify script merged, suite 857/857

- **State:** merged into master post-#26-fix, `npm test` 857/857 +
  build green, worktree/branch cleaned. Supervisor verified the
  constant's existence and turns-1-5 usage in code directly
  (battleMenu.ts:843, `turn2ReopenedSubmenuBounceTick` et al.); pixel
  proof comes with the fix step's compare runs. ISSUES #28 rewritten:
  root-caused, one implementation step owed
  (`tools/probe/verify-bounce-blip-rule.py` committed for the fix
  worker to re-run first, per the residual-elimination policy).
- **Notes:** probe in contract (13.6 of 30 min). The session's probe
  scoreboard is now 3-for-3 (#27 attributed, #26 cracked+closed, #28
  root-caused) — every "quirk-at-an-extremum" label so far has fallen
  to a small real engine bug, none survived a dedicated probe.
- **Next:** round 7 — main: the #28 fix (3 call sites + restore 26
  ticks across turn6/7/8-menu traces + the separate 7348-7350
  restoration §28 already enabled); worktree: post-WIN scene-transition
  scout (loss quote 23601 → §17's swap-offer joint). Then: feathers
  dedicated step (turns 6/7/8 tables + §29's sampling-residual leads),
  turn 9+.

---
## 214 — Bounded worker (S7 engine fix): **ISSUES #26 CLOSED** — Sitrus THIN_RING implemented from §16's banked closed form (`turn5SitrusRingMatrix`, first-attempt render), `turn5-sitrus-c.json`'s excluded 7042-7072 restored to **181/181 0 diff**; z-order caveat resolved by reusing the already-established terrain-occlusion clip (`PLAYER_BALL_OPEN_VISIBLE_BOTTOM`), not a shadow-sprite priority contest

- **State:** `npm test` **857/857** (+5), `npm run build` green, tree
  clean. `turn5-sitrus-c.json` 181/181 (150 prior + 31 restored), 0 diff.
  Zero regressions, all rerun at full committed counts: `turn5-sitrus-
  a.json` 110/110, `turn5-sitrus-b.json` 82/82, `turn5-sitrus-d.json`
  133/133, `turn5-switchin.json` 241/241, `turn6-menu.json` 33/33.
- **Did:** the fix was purely mechanical per the brief (§16's own closed
  form ported verbatim, zero re-fitting): `turn5SitrusRingMatrix(t)` -
  `a=d=floor(4096/n)`, `n=clamp(ramTick-7039,1,31)`, ordinary +1 lag,
  fixed center (72,88), wired into `drawTurn5RockSlideAttack` via the
  existing `drawSpriteSheetAffineRotate` sampler + the already-extracted
  ring gfx. The one non-mechanical piece (the z-order caveat) resolved on
  the first attempt: the probe's rows-112-114 residual color `(74,66,82)`
  is an exact match to this dossier's own already-cited terrain-occlusion
  color (`PLAYER_BALL_OPEN_VISIBLE_BOTTOM=112`, §7.27's "lands mostly
  BEHIND the battlefield's foreground terrain tile") - a BG-over-sprite
  compositing rule tied to the player's own field position, not an
  OAM-priority contest against a literal drop-shadow sprite as §13/§15
  had speculated. Added an optional `clipBottom` param to
  `drawSpriteSheetAffineRotate` (no-op for its other 2 call sites) and
  passed the existing constant through - no new mechanism invented.
  5 Tier-1 pins added (both clamp ends, the 2 probe-verified sample
  ticks, the identity tick, the lag/window cutoffs). `faint-switch-
  notes.md` §17 written; ISSUES #26 deleted.
- **Next:** engine: turn 8's own feather sub-window (out of scope this
  step); turn 9+ parameterizations. Probes: #28 (period-9 excluded-tick
  family, worktree-banked per PROGRESS #213, still open). Scout: post-WIN
  scene transition dense ground truth.
- **Notes:** landed well inside the 40-minute cap, first-attempt render
  on both the closed form and the z-order clip - the probe step (§16)
  and this run's own residual-elimination policy (re-reading already-
  committed cross-file findings before touching pixels) did the actual
  hard work; this step was exactly as mechanical as advertised.

---
## 213 — Worktree probe (supervisor-folded): **ISSUES #26's THIN_RING CRACKED ANALYTICALLY** — the ring's matrix is a pure isotropic scale with a closed form (`a=d=floor(4096/n)`, `b=c=0`, `n=clamp(ramTick-7039,1,31)`, center (72,88), render lag **+1** — NOT §13's +2 rotation class), placement verified pixel-exact with ZERO fitting (6/6 px at render 7042, 92/92 at 7048, existing sampler + existing gfx verbatim); after 3 failed fitting attempts across 3 sessions, one 15-min probe made the fix MECHANICAL; `faint-switch-notes.md` §16 + committed probe JSON merged, suite 852/852

- **State:** merged into master post-turn-8, `npm test` 852/852 + build
  green, worktree/branch cleaned. Supervisor re-verified the closed form
  myself against all 32 live ticks of the committed probe JSON (exact
  match, center invariant (72,88)). ISSUES #26 rewritten at this fold:
  from "excluded after 3 attempts" to "analytically placed — one
  mechanical fix step owed" (params in the entry + §16).
- **Did:** probe identified the sprite (slot 4, matrixNum 2, affineMode
  3/double, 64x64, priority 2, alive 7040-7071), dumped per-tick state
  (twice-run byte-identical), tested §13's +2-lag lead FIRST as briefed —
  refuted it (ordinary +1 fits all samples; the +2 class is
  rotation-specific, matching §29's independent negative). Larger-tick
  residuals attributed to the known drop-shadow z-order at rows 112-114,
  named as the fix's one non-mechanical caveat.
- **Next:** round 6 launching now — main: the #26 fix + restore
  turn5-sitrus-c.json's 7042-7072 (mechanical, params banked); worktree:
  ISSUES #28's period-9 probe (3rd recurrence banked by turn 8, §33).
  Then: turn 9+ parameterizations, feathers dedicated step, post-WIN
  scene scout.
- **Notes:** probe in contract (15.0 of 30 min). Pattern now 2-for-2
  this session (after #27): the 30-min probe-only worktree step resolves
  what repeated bounded fitting attempts could not — RAM-first is the
  instrument, not the fallback.

---
