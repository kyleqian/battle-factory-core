# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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


---
## 1332 — [main worker, 2026-08-18] **ISSUES #97 §17 item 5 landed: HP-overlay gate's turn4 arm closes turn5-confirm-off-a's frozen-HP frames (15→60/132), zero decreases across the guard family**

- **State:** two green commits (`e7657a86` fix+Tier-1 pin, `0ac71a47`
  docs) plus this docs commit. `npm test` **1,067 files / 10,044 passed
  (+1, the new turn-4-arm pin) / 223 skipped**; `npm run build`/
  `npm run typecheck` green.
- **Did:** per-caller audit FIRST (required by the brief), all 12 real
  call sites of `drawActionMenuIdleContentFromLatest` traced to their own
  turn/window and checked for an override arg and today's gate outcome —
  recorded as `docs/turn5-family-class3-diagnosis.md` §19. Confirmed §10a's
  root cause exactly: `drawTurn5EndeavorText`'s ENDEAVOR-hold fallback is
  the ONLY call site where the gate's `false` outcome wasn't already masked
  by a manual redraw of the same value right after the call (two callers,
  `drawTurn3/4RockSlideTurnEndSettledMenu` and `drawActionMenuIdleWindow`'s
  two branches, already draw the identical override unconditionally, so
  widening the gate there is provably a no-op, not a behavior change).
  Chose fix shape (a) over (b) (§10a's two candidates): added a third OR
  arm, `turn4FightCommandPresentationFromLatest(latest) !== null`,
  mirroring the existing turn2/turn3 arms one turn further — the same
  pattern `drawTurn3EndeavorText` already relies on via the turn2 arm one
  turn earlier. Tier-1 pin: `battleSceneFightCommandPresentationTurn1
  Through4.test.ts`'s "slice 3" describe block, previously asserting "turn
  4: does NOT fire" for the generic shim — split into the retired
  positional-ABI body's own unchanged historical pin plus a new case
  pinning the current shim's turn-4 arm firing.
- **Result:** `turn5-confirm-off-a` 15/132 → **60/132** (strict
  improvement, oracle-verified). `turn5-confirm-off-b` and
  `turn5-resolve-off-d` both held their prior 0-match count with their
  cited residual magnitude UNCHANGED (689px/1.79% bbox=16,124-75,149 and
  258px/0.67% bbox=44,71-195,104 respectively) — both attributed to
  different, ungated code paths this fix cannot reach
  (`drawTurn5RockSlideWindow`'s attack/text phase and its own
  settled-Sitrus-chrome tail; traced, not guessed — see §19). Zero
  decreases anywhere in the 9-trace guard family: `turn5-reset-off`
  256/256, `turn5-action-off` 32/32, `turn6-reopen-off` 22/46, `turn6-menu`
  34/44, `turn5-resolve-off-{a,b,c}` 25/196, 88/196, 149/196,
  `turn4-doubleteam-off`/`turn4-rockslide-off` 256/256 each — all
  byte-identical to the brief's own cited baselines.
- **Next:** ISSUES #97 remainders, all still open, all now attributed to a
  specific code path (not this gate): `confirm-off-b`'s 689px residual
  (`drawTurn5RockSlideWindow` attack/text phase — item 1's own boundary,
  possibly a text-timing recalibration, not an HP overlay); `resolve-off-d`'s
  258px residual (settled-Sitrus-chrome ONIX overlay, needs its own
  instrument); `resolve-off-c`'s trailing 47-frame secondary mechanism
  (§3e/§7, untraced); `turn6KickoffBounceTick`/the 7318+ dispatch (side-lane
  continuation, unchanged). #71 Rung 9 unchanged (blocked on the animation
  lane's rung-4 back dispatcher).
- **Notes:** no PAPERCUT. §19's per-caller audit (required before any edit)
  took the bulk of the session but paid off — it predicted every trace's
  outcome (including the two "stays at 0 but why" residuals) before a
  single oracle rerun, and every prediction held exactly.
