# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 1335 — [main worker, 2026-08-18] **ISSUES #97 remainder: `confirm-off-b`'s rockslide-text-delay fix and `resolve-off-d`'s two Sitrus epoch fixes LANDED per `docs/turn5-confirmb-resolved-residuals.md` — 0/132→37/132 and 0/196→50/196**

- **State:** one green commit (`90edc2a6` fix+Tier-1 pins) plus this docs
  commit. `npm test` **1,067 files / 10,056 passed (+7, new pins for both
  fix shapes) / 223 skipped**; `npm run build`/`npm run typecheck` green.
- **Did:** read `docs/turn5-confirmb-resolved-residuals.md` (committed at
  `257fa559`) in full and landed both fix-ready mechanisms it pinned: (A)
  `drawTurn5RockSlideWindow`'s attack/text branch was calling
  `rockSlideTextVisibleChars(t, pressTick)` with no `delay` argument,
  silently defaulting to the shared 393-tick delay instead of this
  family's own `TURN5_OFF_ROCKSLIDE_TEXT_DELAY=355` already threaded into
  the dispatch gate one call up — fixed to `rockSlideTextVisibleChars(t -
  1, pressTick, TURN5_OFF_ROCKSLIDE_TEXT_DELAY)`. (B) `turn5SitrusOnixHp`/
  `turn5SitrusHealTextVisibleChars` still keyed off the stale, older
  `ONIX_SITRUS_IDENTITY_RENDER_TICK` epoch (6874) that the prior session's
  dispatch-gate fix never swept from these detail-render formulas; landed
  two new turn5-off-scoped siblings, `turn5OffSitrusOnixHp` (hard step at
  a new `TURN5_OFF_SITRUS_ONIX_HP_JUMP_TICK=6984`) and
  `turn5SitrusOffHealTextVisibleChars` (anchored at the already-correct
  `TURN5_OFF_SITRUS_HEAL_TEXT_START_TICK=6850`, same `t-1` shape as (A)).
  Per the brief's mandatory pre-landing spot-check, wrote a fresh RAM probe
  (`tools/probe/dump-turn5-resolve-offd-onixhp-ram.py`, dense sweep
  6975-6995 against `turn5-resolve-off-d.json`) BEFORE trusting the doc's
  §2.2 given ground truth — confirmed ONIX's own `gBattleMons[0].hp` is a
  genuine hard step (flat 1 through 6983, flat 31 from 6984 on, zero
  intermediate values), matching the doc exactly; no contradiction, no
  addendum needed.
- **Result:** `turn5-confirm-off-b` 0/132 → **37/132** (exactly the doc's
  own §1.5 prediction). `turn5-resolve-off-d` 0/196 → **50/196** (beats
  the doc's own conservative ~13/196 tail-only floor since both (B)
  sub-components landed, not just the tail — the doc had explicitly hedged
  §2.3's own count as "no specific claim"). Cross-trace bonus,
  independently predicted by the doc's own §1.5: `turn5-resolve-off-a`
  25/196 → **44/196** (the fix lets more of that trace's own opening ticks,
  which share the same call site, catch up sooner). Zero decreases across
  the full guard family: `turn5-reset-off` 256/256, `turn5-action-off`
  32/32, `turn6-reopen-off` 46/46, `turn6-menu-off.json` fixture 47/47,
  `turn5-confirm-off-a` 60/132, `turn5-resolve-off-b` 88/196,
  `turn5-resolve-off-c` 149/196, `turn13-switchin` 242/242,
  `turn4-doubleteam-off`/`turn4-rockslide-off` 256/256 each.
- **Next:** `confirm-off-b`'s own separate small pre-6184 ENDEAVOR-hold
  residual (§1.1's table) stays open, needs its own instrument. `resolve-
  off-d`'s §2.4 (sprite/particle overlay — ONIX's own tint/rotation and
  granting-star placement, also keyed off the same stale epoch but not
  independently isolated this session) and §2.5 (the 6991-6994 transition
  spike, 4 frames) remain unexplained and untouched, per the diagnosis
  doc's own explicit scope boundary. The resolve-off-c settled-transition
  mechanism (`TURN5_PIDGEOTTO_SETTLE_TICK`/`drawTurn5PidgeottoMaterialize`)
  was being instrumented by a side-lane worker in parallel this session,
  untouched here per the brief. #71 Rung 9 unchanged.
- **Notes:** no PAPERCUT. The mandatory RAM spot-check cost one small new
  probe script but was worth it: it independently confirmed the doc's own
  flagged "not independently re-probed" caveat rather than just trusting
  the given fact, and the result (a clean hard step, zero ramp ticks in a
  21-tick dense sweep) meant the doc's literal proposed fix shape could
  land unmodified.
