# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 1338 — [main worker, 2026-08-18] **ISSUES #97 remainder: `resolve-off-a`'s Class A rock-slide hit-flash profile LANDED — 44/196→56/196; Class C reverted (hard-guard regression); Class B unresolved (new residual found)**

- **State:** one green commit (`8372b6ab` fix+Tier-1 pins) plus this docs
  commit. `npm test` **1,067 files / 10,068 passed (+3, one new pin
  block) / 223 skipped**; `npm run build`/`npm run typecheck` green.
- **Did:** read `docs/turn5-resolve-ab-pools-diagnosis.md` (committed at
  `89d3f065`) in full and worked its three named classes in order.
  **Class A landed**: `drawTurn5RockSlideAttack` was the one sibling
  turn (1/3/4/9/10/11 already have their own scoped profile) still
  calling the shared hit-reaction helpers with no override — added
  `TURN5_OFF_ROCKSLIDE_ANIMATION_PROFILE` (`hitFlashAnchorAge: 418`,
  matching all 8 RAM/pixel-measured blink transitions exactly per §4a;
  shake disabled, real GROVYLE's top row is pixel-flat the whole
  window) and threaded it through all 3 call sites (blink/shake/wobble).
  Spot-checked `turn13-switchin` FIRST per the doc's own mandatory §4c
  guard (unaffected, still 242/242) before touching anything else.
  **Class C attempted then reverted**: swapping `turn5FaintedCursorYOffset`
  for `cursorState(t-1, cursorStart)` per §6b closed `resolve-off-b`'s own
  targeted 6426-6560 span exactly as predicted, but regressed the HARD
  guard `turn5-resolve-off-c` 195/196 → 140/196 — that trace's own
  capture window (6614-6958) shares the same cursor-draw code path and is
  NOT disjoint from Class C's fix as the doc's own §7 PASS/FAIL table
  assumed. Root-caused before reverting (not blind): the trace's own
  button list shows a KO-dismiss `A` press at tick 6561-6562, and past
  that point the real cursor's phase visibly re-anchors/freezes — the
  same class of mechanism turn 13 already solves via
  `opponentFaintPresentationOwner.dismiss`/`frozenCursorTick`, which is
  NOT reproducible from a fixed pixel/RAM constant the way this doc's own
  §6b fix shape assumed (the real freeze point depends on when a
  per-session dismiss input actually lands). Reverted the call site and
  restored `turn5FaintedCursorYOffset` byte-for-byte, with the finding
  recorded in its own doc comment (next instrument: thread
  `opponentFaintPresentationOwner`-style dismiss data into
  `drawTurn5RockSlideWindow`, mirroring turn 13's own pattern).
  **Class B not independently verified**: Class A's fix did NOT fully
  close its own predicted 6248-6365 window — direct pixel/RAM
  investigation (`tools/probe/dump-registers.py` against
  `gBattle_BG3_Y`) found the dominant residual there (huge ~30%-of-frame
  diffs at render ticks 6259/6260/6263/6264/6267/6268) is a SEPARATE,
  previously-unknown static-background rendering artifact, NOT Class
  A's own mechanism: `rockSlideBg3Y`'s formula (shared default
  `rockAnchorAge`, untouched by this fix) is RAM-EXACT at all 26 sampled
  ticks 6245-6270 (bit-for-bit match against a fresh live probe), so the
  registered background-shake value itself is provably correct: the bug
  is in how that shift renders (best-fit cross-correlation on a
  background column suggests a ~1-row misalignment, but a shift alone
  doesn't fully explain the color deltas either — likely a static-BG
  asset/extraction gap in the `-7`-shifted row range, not a timing
  formula). Named but not fixed — out of the "profile"-shaped fix this
  step was scoped to, and doc's own §5 (the 17-frame sink tail) was
  never reached in isolation because of it.
- **Result:** `turn5-resolve-off-a` 44/196 → **56/196** (Class A alone;
  short of the doc's own ≥156/196 floor — attributed above, not a
  contradiction of §4a's own blink-anchor finding, which is independently
  RAM-confirmed correct). `turn5-resolve-off-b` **88/196 unchanged**
  (Class A's own window ends at 6365, before this trace's window starts,
  exactly as the doc's own §7 table predicted; Class C reverted so no
  change here either). Zero decreases across the full guard family:
  `turn5-reset-off` 256/256, `turn5-action-off` 32/32, `turn6-reopen-off`
  46/46, `turn6-menu-off.json` fixture 47/47, `turn5-confirm-off-{a,b}`
  60/132 and 37/132, `turn5-resolve-off-c` 195/196, `turn5-resolve-off-d`
  142/196, `turn13-switchin` 242/242 (the critical shared-function guard,
  spot-checked first per the doc's own instruction),
  `turn4-doubleteam-off`/`turn4-rockslide-off` 256/256 each.
- **Next:** the newly-found static-background artifact at render ticks
  [6259,6268] (RAM-confirmed NOT a `rockSlideBg3Y`/`rockAnchorAge` issue)
  needs its own instrument — likely a `staticBgPixel` asset check in the
  `-7`-shifted row range, or a denser per-pixel oracle sweep across the
  shake window to characterize the exact misalignment before touching
  `drawStaticBgShiftedY`. The dismiss-aware cursor freeze (Class C) needs
  `opponentFaintPresentationOwner`-style plumbing threaded into
  `drawTurn5RockSlideWindow` before it can land without regressing
  `resolve-off-c`. Class B (§5's 17-frame sink tail) still unverified in
  isolation, blocked on the same background artifact dominating that
  span's own diff. #71 Rung 9 unchanged.
- **Notes:** no PAPERCUT. The family's own "confirmed by direct
  experiment, not curve-fit" discipline caught a real regression before
  commit: the diagnosis doc's own §7 PASS/FAIL table assumed
  `resolve-off-c` was a disjoint window unaffected by Class C — a fresh
  guard-family rerun (not just the two named traces) showed that
  assumption was wrong (195/196 → 140/196), and reverting immediately
  rather than chasing a deep dismiss-plumbing fix under a hard time cap
  was the right call. Read the guard-family list literally and rerun ALL
  of it, not just the traces a doc's own predictions section names.

---
## 1337 — [main worker, 2026-08-18] **ISSUES #97 remainder: `resolve-off-c`'s fourth mechanism and `resolve-off-d`'s spurious ONIX rotation LANDED — 173/196→195/196 and 66/196→142/196**

- **State:** one green commit (`8949e4c5` fix+Tier-1 pins) plus this docs
  commit. `npm test` **1,067 files / 10,065 passed (+7, three new pin
  blocks) / 223 skipped**; `npm run build`/`npm run typecheck` green.
- **Did:** read `docs/turn5-resolve-offc-tail-diagnosis.md` §13 (13a-13j)
  and `docs/turn5-confirmb-resolved-residuals.md` §6 in full. Per the
  brief's own reconciliation caveat, re-baselined first: `turn5-resolve-
  off-c` was already **173/196** on today's tree (not §13's own 149/196
  worktree baseline) — §11/§12's stretch/frame-toggle fix had landed on
  `master` ahead of §13's own parallel worktree, already fully covering
  §13f's defect 2 (the frame0/frame2 toggle; `turn5PidgeottoFrame` was
  already deleted, wider than §13's own proposed patch). Landed the other
  two: **defect 1** — `turn5MaterializeCoeff(t)` → `turn5MaterializeCoeff(t
  - 1)` at `drawTurn5PidgeottoMaterialize`'s call site, the same lag
  `drawGeneratedOpponentRelease` already corrects for. **Defect 3** —
  §13f's own literal `extraDelay`/burst-wide-shift proposal was tried
  first and directly disproven by experiment (regressed 17 previously-
  exact frames, `6746-6762`); root cause is a **one-time freeze**, not a
  uniform shift — landed via `drawCleanSwitchinParticles`'s existing
  `stallLogicalTick` param, threaded through a new
  `TURN5_SWITCHIN_PARTICLE_STALL_LOGICAL_TICK` constant that lands on the
  same render tick (6763) as `TURN5_PIDGEOTTO_HEALTHBOX_SLIDE_START_TICK`,
  an independently RAM-pinned anchor for an unrelated component — read as
  corroboration, not curve-fitting (confirmed: one tick either side is
  strictly worse). Separately, landed FIX (2): `onixSitrusRotateMatrix`'s
  periodic curve has zero RAM basis in `turn5-resolve-off-d`'s window (flat
  static at all 108 sampled ticks/7 coordinates, §6.2) — suppressed via a
  new `suppressSitrusRotate` flag threaded from `drawTurn5RockSlideWindow`
  down through `drawTurn6FieldBase`/`drawTurn5RockSlideAttack` (both shared
  across turns 6-13), defaulting `false` everywhere else.
- **Result:** `turn5-resolve-off-c` 173/196 → **195/196** (near-full close
  of 6763-6785; one frame, 6763 itself, keeps a 6px/0.02% anti-aliasing-
  class residual). `turn5-resolve-off-d` 66/196 → **142/196** (closes
  6810-6952 entirely, including the resolve-off-c carryover at 6810-6825;
  6953-6969's own unverified ring/star residual and 6970+'s §6.3/out-of-
  scope spans left open, exactly as §6.2 flagged). Zero decreases across
  the full guard family: `turn5-reset-off` 256/256, `turn5-action-off`
  32/32, `turn6-reopen-off` 46/46, `turn6-menu-off.json` fixture 47/47,
  `turn5-confirm-off-a` 60/132, `turn5-confirm-off-b` 37/132,
  `turn5-resolve-off-a` 44/196, `turn5-resolve-off-b` 88/196,
  `turn13-switchin` 242/242 (the critical shared-function guard, verified
  empirically), `turn4-doubleteam-off`/`turn4-rockslide-off` 256/256 each.
- **Next:** `turn5-resolve-off-c`'s own 6763 residual (6px) and
  `turn5-resolve-off-d`'s 6953-6969 ring/star span (`turn5SitrusRingMatrix`/
  `drawGrantingStars`, never independently RAM-checked) are both small,
  named, unchased residuals. §2.5/§6.3 (the 6991-6994 transition spike,
  re-characterized as the app transitioning early) stays explicitly out of
  scope, next instrument named but not fix-ready. #71 Rung 9 unchanged.
- **Notes:** no PAPERCUT. The brief's reconciliation caveat was load-
  bearing: landing §13f's fixes against its own stated 149/196 baseline
  (rather than re-deriving against today's actual 173/196 tree) would have
  meant re-implementing already-landed defect 2. Separately, blindly
  landing §13f's literal Fix 3 shape without the mandatory re-measurement
  step would have shipped a 17-frame regression masked by a higher net
  count — the family's "confirmed by direct experiment, not curve-fit"
  discipline caught it before commit.

---
## 1336 — [main worker, 2026-08-18] **ISSUES #97 remainder: `resolve-off-c`'s third mechanism (materialize→settled sprite transition) LANDED per `docs/turn5-resolve-offc-tail-diagnosis.md` §11 — 149/196→173/196, exactly the prediction**

- **State:** one green commit (fix+Tier-1 pin) plus this docs commit.
  `npm test` **1,067 files / 10,058 passed (+2, one new Tier-1 describe
  block) / 223 skipped**; `npm run build`/`npm run typecheck` green.
- **Did:** read §11 fully (committed today at `b3497e0f`) and landed its
  named fix: dropped `drawTurn5PidgeottoMaterialize`'s `TURN5_STRETCH_
  TICK` branch split (`battleScene.ts`) — the tinted-blend formula now
  runs unconditionally for the whole materialize window instead of
  switching to a double-size-affine stretch table (`TURN5_STRETCH_TABLE`)
  past render 6786, matching §11a's own fresh RAM probe (real sprite
  "dead static" from RAM 6756 on, no wobble, no double-affine mode ever).
  Landing that alone held the count flat at 149/196, contradicting §11f's
  own 173/196 prediction — per the brief's own "attribute before
  accepting" instruction, direct RGB sampling of the fresh compare run's
  PNGs found a SECOND bug in the same function: `turn5PidgeottoFrame(t)`
  (the front-sprite tileset selector) flipped to a second graphic frame at
  render 6786, contradicted by the same §11a RAM table (dead static
  spans every one of its claimed transition ticks). Confirmed by direct
  experiment (forcing the selector to frame 0 and rerunning the compare)
  before landing: exactly 173/196. Deleted `turn5PidgeottoFrame` entirely
  (its `frame2` branch was the only remaining consumer of
  `pidgeottoFrontSprite.frame2`) and `TURN5_STRETCH_TABLE` (genuinely
  unreferenced after the branch removal); kept `TURN5_STRETCH_TICK`
  (still read by `tools/probe/analyze-turn5-resolve-offc-tail-app-series.ts`)
  and `drawTurn5PidgeottoSettled` (still called past `TURN5_PIDGEOTTO_
  SETTLE_TICK`). Corrected the contradicted doc comments in both
  `turn5ResolutionAdapter.ts` (`materializeSettleTick`, claimed "RAM tick
  6827's idle callback flip" — real flip is RAM 6760) and
  `battleSceneCanonical.ts` (the "Wobble table"/frame-selection comments),
  original text kept for the forensic record. New Tier-1 pin: exported
  `drawSpriteSheetAffineTintedBlend` and added a hand-built-fixture test
  pinning its degenerate case (accumulator=256, coeff=0, y2=0 reproduces a
  plain untransformed draw exactly) — the exact claim the fix relies on.
- **Result:** `turn5-resolve-off-c` 149/196 → **173/196** (exactly §11f's
  prediction; all 24 of renders 6786-6809 now 0px). Zero decreases:
  `turn5-reset-off` 256/256, `turn5-action-off` 32/32, `turn6-reopen-off`
  46/46, `turn6-menu-off.json` fixture 47/47, `turn5-confirm-off-a`
  60/132, `turn5-confirm-off-b` 37/132, `turn5-resolve-off-b` 88/196,
  `turn13-switchin` 242/242, `turn4-doubleteam-off`/`turn4-rockslide-off`
  256/256 each. Bonus, unprescribed increase: `turn5-resolve-off-d`
  50/196 → **66/196** (shares the same draw path, per §11f's own flagged
  reach; its own out-of-scope residual past tick 7004 unaffected).
- **Next:** the remaining 23 of `resolve-off-c`'s 47 mismatched frames
  (renders 6763-6783) are §11e's flagged FOURTH mechanism
  (`TURN5_MATERIALIZE_RAMP_COEFF`'s own falling edge) — needs its own RAM
  instrument, out of this step's scope. `resolve-off-d`'s §2.4/§2.5 (sub-
  entry G) stay open, side-lane territory. #71 Rung 9 unchanged.
- **Notes:** no PAPERCUT. The brief's own "attribute before accepting"
  instruction was load-bearing this session — landing only the named fix
  would have looked like a wash (149/196 unchanged) and could have been
  mistaken for a failed prediction; one more RAM-consistent discovery
  (the frame-selector bug, directly implied by §11a's own already-landed
  "dead static" table, just not yet connected to that specific function)
  was what actually made the predicted count real.

