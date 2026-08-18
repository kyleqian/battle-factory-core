# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 1325 — [main worker, 2026-08-18] **ISSUES #97-B closed: PP-digit confound root-caused and fixed, rung 3 reapplied — turn5-action-off 1/32 → 26/32, zero regressions**

- **State:** three green commits this session (`1a70ec69` PP fix,
  `5c21df81` rung-3 reapply, plus this docs commit). `npm test` **1,066
  files / 10,040 passed (+2 vs 1323's 10,038, both new Tier-1 pins) / 223
  skipped**, `npm run build`/`npm run typecheck` green after each commit.
- **Did — Goal A (PP confound):** established ground truth with two
  independent instruments per the step brief, plus a third for extra
  confidence: (a) source-derived ROCK_SLIDE decrement count
  (`battleMenu.ts`: turns 1, 3, 4 decrement slot 0 → `maxPP 10 - 3 = 7`);
  (b) backward RAM math from `docs/turn5-6-off-ground-truth.md`'s
  post-turn-5/6 PP handoffs; (c) a fresh live `gBattleMons` RAM probe
  (`tools/run-mgba-probe.py`) across ticks 5920-5960 of `turn5-menu.json`,
  reading `[7,20,19,10]` throughout. All three agree: PP is 7, not the
  app's displayed 8, throughout turn 5's own reopened FIGHT submenu.
  Root cause: `resolveTurn4LatestCompletedCommandHandoff`
  (`turn4ResolutionAdapter.ts`) pinned `playerPp`/`persistedMoveSlot`
  from the *prior* (turn-3) handoff per `docs/turn4-fold-pp-freshness-
  design.md`'s 2026-08-02 direction — that doc's own §6 risk 4 flagged
  this as an unresolved assumption pending exactly this probe. Fixed by
  using turn 4's own fresh receipt directly (matching turn3's/turn5's own
  sibling adapters' shape); re-pinned the 2026-08-02 tests that encoded
  the superseded value, citing this session's ground truth. Full 9-trace
  family + 2 turn-4-adjacent spot checks: zero regressions, one
  improvement (`turn5-confirm-off-a` 8/132 → 14/132).
- **Did — Goal B (rung 3 reapply):** with the confound gone, reapplied
  the banked composed correction (`docs/turn5-bounce-recalibration-
  probe.md` §4 item 1/§9: 3-tick freeze + `+116` raw sine-index offset +
  `t-1` display basis), mirroring rung 2's `menuIdleBounce`/
  `drawMenuIdleBounceOverlay` `indexOffset` idiom and rung 1's
  `turn6ReopenBounceTick` freeze-helper shape (new sibling export,
  `turn5ReopenBounceTick`). Live-verified against the oracle before any
  test edit: `turn5-action-off` mismatch set exactly
  `{5928,5929,5930,5931,5940,5949}`, **26/32** — the exact best-case
  number §9d's own paper derivation predicted, zero deviation. Re-pinned
  `battleScene.test.ts`'s "Onix bounce sprite preserves the existing
  continuation phase" fixture to the new, oracle-matching plateau
  boundary (rung 3's own flagged re-pin, banked verbatim). Added two new
  red-verified Tier-1 pins in `fightSubmenu.test.ts` (the freeze helper's
  own shape; the full composed model against
  `src/data/gen/turn5-6-reopen-bounce-probe.json`'s RAM ground truth).
- **Final family numbers (all traces, zero regressions from Goal A's own
  post-fix baseline):** `turn5-action-off` 1/32 → **26/32**,
  `turn6-reopen-off` 20/46 (unchanged, no decrease), `turn5-reset-off`
  256/256, `turn5-confirm-off-a` 14/132 (PP-fix improvement, held),
  `turn5-confirm-off-b` 0/132, `turn5-resolve-off-{a,b,c,d}` 7/196,
  71/196, 149/196, 0/196, `turn4-doubleteam-off`/`turn4-rockslide-off`
  256/256 each.
- **Next:** ISSUES #97-B's remaining, separately-scoped open items (see
  `ISSUES.md` #97 §B for the full writeup): (i) the §8d/§9e sine-table-peak
  rounding artifact (both windows' own small residual, root cause narrowed
  to the derivation rule, real hardware `Sin()` not yet read); (ii)
  `turn6KickoffBounceTick`/the 7318+ dispatch (a SIDE-worker continuation
  was in flight in parallel this session — check its state before
  touching); (iii) the class-(iii) text/banner mechanism dominating
  `turn5-confirm-off-*`/`turn5-resolve-off-*`'s own remaining mismatches —
  checked against the PP-digit fix by inspection, did NOT meaningfully
  move (a separate, still-uninvestigated mechanism, not this session's
  scope).
- **Notes:** no PAPERCUT. The three-independent-instrument ground-truth
  requirement (source count + backward RAM math + a fresh live RAM probe)
  was worth the extra probe beyond the step's own "two instruments"
  minimum — `docs/turn5-off-reader-set.md` already had a cached
  `[7,20,19,10]` value for this exact window from an earlier session, and
  a fresh live check confirmed it still holds today rather than trusting
  a possibly-stale cached figure (ISSUES #97's own ledger already
  documents one prior instance of the oracle's answer shifting between
  sessions for this same window).

---
## 1324 — [main worker, 2026-08-18] **ISSUES #97-B rung 3: window A's composed correction (3-tick freeze + indexOffset 116 + local display basis) implemented, PROVEN mechanism-exact, then REVERTED — a third, previously-unknown, pre-existing PP-digit defect blocks the numeric acceptance bar**

- **State:** tree is byte-for-byte HEAD (`git checkout -- src/engine/battleScene.ts
  tests/battleScene.test.ts` after verifying the revert reproduces the exact
  `1/32` baseline). No src/test changes landed this rung. `npm test` +
  `npm run build` green (unchanged tree). Docs-only commit pending
  (`ISSUES.md` #97-B rung-3 entry + this one).
- **Did:** ran §9f's RAM-receipt PASS/FAIL check first (passed, no oracle
  call), then implemented `docs/turn5-bounce-recalibration-probe.md` §4
  item 1/§9 exactly — extended `drawActionMenuIdleWindow`'s single-tick
  reopen-press special case to the RAM-proven 3-tick freeze, and composed
  it with window A's own `+116` raw-sine-index constant (§9b) and the
  `displayed(T)=RAM(T-1)` basis (§9c) at both of window A's own call sites
  (`drawActionMenuIdleWindow`'s bounceTick line, `drawFightSubmenuWindow`'s
  `idleWaitBounceTick` line), gated by the same `turn5Active` boolean that
  already scopes this exact formula chain — mirrors rung 2's
  `menuIdleBounce`/`drawMenuIdleBounceOverlay` defaulted-param idiom.
  Paper-derived the predicted per-tick output (real sine table + the
  committed RAM receipt, from scratch in Python) BEFORE touching `src/`,
  per the step's own hard order — reproduced §9d's exact predicted
  mismatch set `{5928,5929,5930,5931,5940,5949}` (frame 5927 resolving to
  a match, the doc's own best-case extrapolation) with zero deviation.
- **Result — mechanism PROVEN exact, but blocked by a new confound:** the
  live oracle result matched the paper derivation perfectly on the
  bounce/healthbox dimension (the same 6 ticks, same large multi-region
  diffs, §8d-class table-peak explained) — but all 24 OTHER ticks in
  `[5932,5957]`, predicted to newly MATCH, instead showed a small isolated
  **35px diff at `bbox=208,124-213,133`** — a PP move-count digit glyph
  ("8" vs oracle's "7", e.g. ROCK_SLIDE "8/10" vs "7/10"), nowhere in this
  doc's RAM-ground-truth analysis (undetectable from a receipt with no PP
  field). Confirmed **pre-existing, not a regression**: baseline's own
  (larger) mismatch bboxes at those same ticks already spatially contain
  `(208,124)-(213,133)` — this rung's fix, by correctly shrinking the
  bounce mismatch to its true residual, is what exposed it standalone for
  the first time. Real achieved count: **2/32** (`{5926,5927}`), far short
  of the 25-26/32 bar — entirely attributable to this one confound.
  Zero regressions on every other trace (`turn6-reopen-off` exactly 20/46,
  `turn5-reset-off` 256/256, `turn5-confirm-off-{a,b}` 8/132 & 0/132,
  `turn5-resolve-off-{a,b,c,d}` 7/196, 71/196, 149/196, 0/196 — all
  byte-for-byte unchanged from rung 2's own baseline).
- **Per the step's own explicit contingency** ("any deviation from the
  predicted set at step 5 → revert to green, bank the per-tick divergence
  table, stop honestly") — reverted rather than landed non-conforming.
  Full per-tick evidence banked in `ISSUES.md` #97-B's new rung-3 entry,
  including the exact fix shape (ready to reapply verbatim once the PP
  defect is independently resolved — do not re-derive).
- **Next:** the PP move-count digit mismatch (`bbox~208,124-213,133`) is
  now the blocking precondition for `turn5-action-off` ever reaching its
  25-26/32 bar — untraced this rung (budget went to confirming it's real/
  pre-existing/isolated, not root-causing it); likely the SAME mechanism as
  the family's already-flagged class-(iii) text/banner bucket (§8g) that
  dominates `turn5-confirm-off-*`/`turn5-resolve-off-*`'s own remaining
  mismatches — worth checking that connection first. Once resolved, window
  A's composed correction (this rung's own diff, proven exact) can be
  reapplied directly.
- **Notes:** no PAPERCUT. Time well spent even though nothing landed: this
  is a genuine, previously-invisible-from-RAM-alone finding that explains
  why this whole doc's line of work could never have closed `turn5-action-off`
  to its predicted number without a second, independent fix.

---
## 1323 — [main worker, 2026-08-18] **ISSUES #97-B rung 2 landed: window B's composed correction (+67 raw sine index + local display-basis t-1 shift) — turn6-reopen-off 11/46 → exactly 20/46, zero regressions**

- **State:** `src/engine/battleMenu.ts`, `src/engine/battleScene.ts`,
  `tests/fightSubmenu.test.ts` edited (new commits pending: fix, then
  docs). `npm run typecheck`/`npm run build` green. `npm test` **1,066
  files / 10,038 passed (+1, the new pin) / 223 skipped** — full suite
  confirmed green, no regressions.
- **Did:** implemented `docs/turn5-bounce-recalibration-probe.md` §8f
  exactly. `menuIdleBounce` gained a defaulted `indexOffset = 0` param
  (added to both raw sine indices before the mod/table lookup) — every
  pre-existing caller unaffected. `drawTurn6FieldBase` (+ its internal
  `drawTurn5RockSlideAttack` onix-Y2 call) thread a new
  `bounceIndexOffset = 0` param through to that call. Exactly TWO call
  sites pass `67`, both provably scoped local (§8e's own warning against
  perturbing the unexplored `turn6KickoffBounceTick`/7318+ dispatch):
  `drawTurn5RockSlideWindow`'s call (the ONLY caller that ever hits
  `drawTurn6FieldBase`'s non-number `bounceTickOrLatest` branch, whose
  fallback moved from `t` to `t - 1` — the §7a display-basis correction),
  and `drawTurn6FightSubmenuWindow`'s DMA-wait branch (`t < revealTick`,
  ~7313-7317 only — `turn6ReopenBounceTick(t - 1, ...)` instead of
  `turn6ReopenBounceTick(t, ...)`). Per the step's hard order: ran §8h's
  RAM-receipt PASS/FAIL check first (passed, no oracle call), then derived
  the predicted per-tick output via `npx tsx` against the live formulas
  BEFORE editing — reproduced §8e's exact predicted match set
  (displayed frames 7305-7317: matches at {7305, 7307-7316}, mismatches at
  {7306, 7317}) with zero deviation.
- **Result:** `turn6-reopen-off` 11/46 → **exactly 20/46** (the best-case
  number §8e predicted, not its 18/46 fallback), in-span mismatch set
  exactly {7306, 7317} (both §8d's already-known sine-table-peak rounding
  artifact), all 9 outside-span matches
  (`{7326,7327,7335,7336,7344,7345,7348,7349,7350}`) unchanged. Zero
  regressions: `turn5-reset-off` 256/256, `turn5-action-off` 1/32,
  `turn5-confirm-off-a` 8/132, `turn5-confirm-off-b` 0/132,
  `turn5-resolve-off-{a,b,c,d}` 7/196, 71/196, 149/196, 0/196 — all
  byte-for-byte unchanged (their own windows sit entirely before
  `turn5SitrusResettledBounceTick`'s bounce-onset tick ~7223, so this fix
  is a structural no-op there, not just coincidentally unaffected).
  Tier-1 pin added to `tests/fightSubmenu.test.ts`, red-verified (fails
  with both `src/` files stashed).
- **Next:** commit fix + docs (ISSUES.md #97-B already updated with the
  rung-2 table) as two commits per the step brief. Remaining #97-B open
  items unchanged in kind: (i) window A's own healthbox-lag correction,
  (ii) §8d's table-peak artifact, (iii) `turn6KickoffBounceTick`/7318+,
  (iv) the family's class-(iii) text/banner mechanism (§8g, ~85% of
  `turn5-confirm-off-*`/`turn5-resolve-off-*`'s own remaining mismatches).
- **Notes:** no PAPERCUT. The positional-param threading needed to keep
  the offset "strictly local" (per the step brief's own warning) required
  passing several `undefined` placeholders through `drawTurn6FieldBase`'s
  already-long parameter list at both new call sites — ugly but matches
  this file's own existing idiom for the same reason (see e.g. the
  turn11/turn13 `drawTurn6FieldBase` callers already doing this).

---
