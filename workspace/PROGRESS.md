# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 1334 — [main worker, 2026-08-18] **ISSUES #97 remainder: `resolve-off-c`'s two named tail mechanisms FIXED per `docs/turn5-resolve-offc-tail-diagnosis.md` — count holds at 149/196, blocked by a third, newly-confirmed, out-of-scope mechanism**

- **State:** three green commits (`6b9f1a12` fix+Tier-1 pins,
  `18d8d23c` probe re-point) plus this docs commit. `npm test` **1,067
  files / 10,049 passed (+5, two new pin blocks) / 223 skipped**; `npm
  run build`/`npm run typecheck` green throughout.
- **Did:** landed both fixes the fresh diagnosis doc specified: (i)
  `turn5PidgeottoHealthboxSlideDx` re-anchored from the sprite's own
  unrelated materialize-settle tick (6829) to the healthbox's own
  RAM-pinned onset (`TURN5_PIDGEOTTO_HEALTHBOX_SLIDE_START_TICK = 6763`,
  `initialHold = true`); (ii) the switch-in BG-white-flash peak hold
  extended by one render tick. (ii) landed as a **new, separate**
  `TURN5_PIDGEOTTO_BG_FADE_Y` table rather than the doc's literal
  suggested edit-in-place — extending the shared `TURN5_BG_FADE_Y`
  regressed `turn13-switchin` 242/242→234/242 (caught live, not assumed):
  `turn13MurkrowBgFadeY` and `turn15ReleaseFieldPalette` both reuse that
  table verbatim at their own anchors, and oracle data confirms Murkrow's
  own window genuinely needs the original 8-entry hold while Pidgeotto's
  needs 9. Exported `turn5BgFadeY` (was module-private) and re-pointed
  `tools/probe/analyze-turn5-resolve-offc-tail-app-series.ts` at the live
  function instead of its own frozen pre-fix copy. Ran the doc's §7
  PASS/FAIL block in full, including the RAM-probe sanity rerun (byte-
  identical to the doc's own §3a/§4b tables — no drift) and both
  app-series probe re-runs (both now match their target tables exactly).
- **Result:** `turn5-resolve-off-c` **149/196 → 149/196, unchanged** —
  NOT the doc's own §6 prediction of 196/196. Per-frame attribution: all
  47 mismatched frames' diff magnitude collapsed from up to 17452px/
  45.45% to a flat ~1100-1600px/~3%, confirming both landed fixes are
  clean, but a **third mechanism** — `drawTurn5PidgeottoMaterialize`'s
  settled-transition path never handing off before
  `TURN5_PIDGEOTTO_SETTLE_TICK` (6828), while the doc's own §3c aside
  already noted the real sprite settles by RAM tick 6760 — dominates
  every frame in the window. Confirmed structural (shape, not tint) by
  direct RGB sampling of the diff PNGs. This is exactly the item the
  brief marked **out of scope** (`TURN5_PIDGEOTTO_SETTLE_TICK`/
  `drawTurn5PidgeottoMaterialize`) — recorded in `ISSUES.md` #97 sub-entry
  F and the diagnosis doc's own §10 addendum, not fixed. Zero decreases
  anywhere in the full guard family (`turn5-reset-off` 256/256,
  `turn5-action-off` 32/32, `turn6-reopen-off` 46/46, `turn6-menu-off.json`
  fixture 47/47, `turn5-confirm-off-{a,b}` 60/132 and 0/132
  (689px/1.79% unchanged), `turn5-resolve-off-{a,b}` 25/196 and 88/196,
  `turn4-doubleteam-off`/`turn4-rockslide-off` 256/256 each,
  `turn13-switchin` 242/242 after the table-sharing fix); one expected,
  fully-explained increase: `turn5-resolve-off-d` 0/196 → **24/196** (the
  healthbox fix also reaches this trace's own early frames 6810-6828; its
  own out-of-scope 258px/0.67% residual past tick 7004 is byte-identical
  before and after).
- **Next:** the third mechanism above needs its own instrument (out of
  this step's scope by the brief). `resolve-off-d`'s 258px residual and
  `confirm-off-b`'s 689px residual remain open, untouched (a side-lane
  instrument was diagnosing them in parallel this session, per the
  brief). Class-(iii) text/banner mechanism and #71 Rung 9 unchanged.
- **Notes:** no PAPERCUT. The turn13/turn15 shared-table regression was
  only caught because the brief's "zero decreases anywhere" standard
  prompted a guard-trace sweep beyond the explicitly named list —
  `turn13-switchin` wasn't in the brief's own guard list but shares the
  exact constant the fix touches; worth checking downstream reuse of any
  shared table/constant before treating a doc's literal edit-in-place
  suggestion as safe.

---
## 1333 — [main worker, 2026-08-18] **ISSUES #97 CLOSED: turn6 [7318,7347] bounce correction lands under a supervisor overturn of `turn6-reopen-endstate-spec.md`'s §2/§3 rejection — `turn6-reopen-off` 22/46→46/46, `turn6-menu-off` 23/47→47/47, both FULL**

- **State:** one green commit (`cb7cbee3` fix+Tier-1 pin) plus this docs
  commit. `npm test` **1,067 files / 10,045 passed (+1, the new
  [7318,7350] composed-model pin) / 223 skipped**; `npm run build` green.
- **Did:** per a supervisor decision overturning `docs/turn6-reopen-
  endstate-spec.md`'s own §2/§3 rejection (that doc's `turn6-menu.json`
  regression premise was refuted: that trace has no `oracleProfile` field
  — it's a legacy Battle Scene ON trace, not this lane's OFF ground truth;
  byte-comparing the two compare runs' own oracle captures showed the
  ORACLE PNGs differ at 34/44 overlapping ticks while the profile-blind
  APP PNGs are identical at 44/44 — full evidence in that doc's own
  2026-08-18 addendum). Landed the composed `[7318,7347]` correction:
  `turn6KickoffBounceTick`'s raw branch gets its missing
  `-FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` term (§10b); `drawTurn6FightSubmenu
  Window`'s post-reveal dispatch applies the shared `+60` raw-sine-index
  offset + `t-1` display basis to both the idle-else regime and this raw
  regime; the frozen tail `[7348,7350]` stays untouched (no dynamic RAM
  ground truth there, already correct). Composition re-derived from
  scratch against the receipt on the corrected (post-increment, `t-1`
  basis) footing per this step's own arithmetic caution — NOT the spec's
  own rejected `+67`/`t-1` combination — and proven exact (33/33 ticks)
  against `src/data/gen/turn5-6-reopen-bounce-probe.json` before any live
  compare. Two "content-owned presentation bridge" parity pins
  (`turn5ResolutionAdapter.ts`, `LEGACY_TURN6_FIGHT_COMMAND_PRESENTATION`
  in `battleScene.ts`) updated in lockstep to keep reproducing the real,
  now-fixed function.
- **Result:** `turn6-reopen-off.json` 22/46 → **46/46** (full match, beats
  the ≥40/46 target); `turn6-menu-off.json` 23/47 → **47/47** (full
  match). Expected, accepted ON-profile movement (legacy traces, out of
  this lane's oracle contract): `turn6-menu.json` 34/44→10/44,
  `turn6-featherdance.json` 82/90→64/90, `turn6-feathers.json`
  227/235→209/235 — all inside `[7307,7347]`, the exact touched span.
  Zero regressions across every hard guard: `turn5-sitrus-d` 15/133,
  `turn5-action-off` 32/32, `turn5-reset-off` 256/256,
  `turn5-confirm-off-{a,b}` 60/132 and 0/132 (689px/1.79% unchanged),
  `turn5-resolve-off-{a,b,c,d}` 25/196, 88/196, 149/196, 0/196
  (258px/0.67% unchanged), `win-terminal-window-off` 3590/3590. ISSUES
  #97's `turn6KickoffBounceTick`/7318+ dispatch remainder is fully closed
  (new §E dated sub-entry); full before/after table in
  `docs/turn6-reopen-endstate-spec.md`'s addendum.
- **Next:** ISSUES #97 stays open only for its unrelated remainders:
  `confirm-off-b`'s 689px residual (`drawTurn5RockSlideWindow` attack/text
  phase), `resolve-off-d`'s 258px residual (settled-Sitrus-chrome ONIX
  overlay), `resolve-off-c`'s trailing 47-frame secondary mechanism
  (§3e/§7, untraced), and the Class-(iii) text/banner mechanism (§8g) —
  none touched by this session. #71 Rung 9 unchanged (blocked on the
  animation lane's rung-4 back dispatcher).
- **Notes:** no PAPERCUT. The arithmetic-caution flag in this step's own
  brief (receipt columns are post-increment) was worth the up-front
  `npx tsx` modeling pass — it caught that the spec's own `+67` fit needed
  the same `-7` correction window B's landed fix already applies, so the
  composed formula matched the receipt exactly (33/33) on the first live
  compare, no iteration needed.
