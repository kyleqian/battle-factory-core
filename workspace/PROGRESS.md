# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 1328 — [main worker, 2026-08-18] **ISSUES #97-B §8d/§9e sine-index offset fix landed: turn5-action-off CLOSED 32/32, turn6-reopen-off 20→22/46, zero decreases**

- **State:** one green commit (src + 2 test files) plus this docs commit.
  `npm test` **1,066 files / 10,040 passed / 223 skipped**, `npm run build`
  green.
- **Did:** followed `docs/bounce-peak-rounding-fix-spec.md` §7 exactly — a
  SIDE-worker analysis that read `trig.c`'s real `Sin()`/`DoBounceEffect`
  and found the landed `+67`/`+116` raw-sine-index offsets each carried a
  +7 excess inherited from fitting against the receipt's own
  post-increment `sSinIndex` RAM column (real hardware has no special
  peak-rounding rule; the app's per-index `bounceSin` math was already
  exactly correct). Ran the spec's receipt cross-check first (176 ok / 0
  bad, PASS), recorded the full 11-trace baseline, then applied the
  4-literal edit at the exact spec-cited lines (all 4 unchanged since the
  spec was written): `battleScene.ts` `bounceIndexOffset`/
  `idleWaitBounceIndexOffset` 116→109 (:8320/:8689), the two window-B `67`
  literals →60 (`drawTurn6ActionMenuIdleWindow`'s DMA-wait-branch call
  :11887, `drawTurn6FieldBase`'s window-B call :14869). No change to
  `bounceSin`/`menuIdleBounce` internals — confirmed live per the spec's
  own warning: a global `-7` shift inside the shared lookup breaks 25
  tests across 5 files (not attempted here, spec-rejected).
- **Result (exact predicted numbers, zero decreases across the 11-trace
  family):** `turn5-action-off` 26/32→**32/32** (window fully CLOSED — the
  former residual `{5928,5929,5930,5931,5940,5949}` was the same offset
  excess, not the periodic §8d/§9e "rounding artifact" it was previously
  attributed to), `turn6-reopen-off` 20/46→**22/46** (`{7306,7317}` now
  match; remainder is entirely `[7318,7347]`, the still-open
  `turn6KickoffBounceTick` dispatch, untouched by construction),
  `turn5-confirm-off-a` 14/132→**15/132** (bonus — `idleWaitBounceIndexOffset`
  is gated on plain `turn5Active`, reaches this trace's span too);
  `turn5-reset-off` 256/256 and the rest of the family (`confirm-off-b`,
  `resolve-off-{a,b,c,d}`, `turn4-doubleteam-off`, `turn4-rockslide-off`)
  byte-identical, zero decreases. Re-pinned one Tier-1 pixel test
  (`battleScene.test.ts`, tick 5931 at (58,49): `[189,181,181]` →
  `[247,247,255]`, oracle-verified) plus the two rung-2/3 composed-model
  tests in `fightSubmenu.test.ts` that hardcoded the old `67`/`116`
  literals and asserted a named residual set — both now assert zero
  exceptions (verified computationally against the real formula before
  editing: with the corrected offset, all displayed ticks in both
  windows' own probed spans match with no exceptions).
- **Next:** `ISSUES.md` #97 §D lists what's still open — (i)
  `turn6KickoffBounceTick`/the 7318+ dispatch (SIDE-worker continuation,
  check its current state first), (ii) the class-(iii) text/banner
  mechanism dominating `confirm-off-*`/`resolve-off-*`'s remaining
  mismatches, (iii) §17 item 5 (the 12-caller HP-overlay gate) from entry
  1327, (iv) `resolve-off-d`'s own small residual (now ruled out as
  §8d/§9e-caused).
- **Notes:** no PAPERCUT. The spec's cited line numbers (8320/8689/
  11887/14869) turned out unchanged despite the brief's drift warning —
  worth noting the brief over-hedged, not a problem.

---
## 1327 — [main worker, 2026-08-18] **ISSUES #97-B turn5-resolve anchor cluster: §17 items 1-3 landed (2 RAM sweeps + 3 scoped anchor fixes) — resolve-off-a 7→25/196, resolve-off-b 71→88/196, zero decreases**

- **State:** one green commit (`4c49776d`, src+test+probe-script fix) plus
  this docs commit. `npm test` **1,066 files / 10,040 passed (+2, two
  re-pinned tests) / 223 skipped**, `npm run build` green.
- **Did:** followed `docs/turn5-family-class3-diagnosis.md` §17's ordered
  edit list exactly. Ran the two prerequisite RAM sweeps first (extended
  `dump-turn5-resolve-grovyle-side-driver.py`): GROVYLE's own hp is a
  single-tick STEP (1 flat 6184-6284, 0 exactly at 6285 — not a live
  drain curve, resolving §17 item 2's own open question); the real
  Sitrus-heal message starts at tick 6850 and hard-cuts directly to
  `"What will ONIX do?"` at 6991, no intermediate blank state. Landed
  items 1-3 as SCOPED overrides (grepped every shared helper's other
  consumers first, per the brief): `TURN5_OFF_ROCKSLIDE_TEXT_DELAY=355`
  (rockSlideTextStartTick -> 6184, was 6222); `TURN5_OFF_ROCKSLIDE_HP_
  DRAIN_START_DELAY=455` (opponentHp steps to 0 at RAM-exact 6285, was
  6427) + `GROVYLE_FAINT_SINK_START_TICK` 6502->6360 (turn-5-exclusive,
  edited directly; `GROVYLE_HEALTHBOX_VANISH_TICK` auto-follows to 6379,
  within 1 tick of RAM-exact 6378) + `TURN5_FAINTED_TEXT_DELAY` 694->549
  (-> 6378, RAM-exact); new `TURN5_OFF_SITRUS_{HEAL_TEXT_START,TEXT_CLEAR,
  MENU_REDRAW}_TICK`=6850/6991/6991, dispatch-gate-only constants (the
  exported `TURN5_SITRUS_*` triple stays 7078/7216/7222 untouched — it's a
  load-bearing anchor for turns 9-14's own REGIME_SHIFT math, confirmed by
  grep before deciding not to touch it). Item 4
  (`SWITCHIN_SENTOUT_TEXT_START_TICK`) confirmed accurate, left alone.
  Item 5 (§10a's HP-overlay gate, 12 shared call sites) **not attempted**
  this session — time/risk, banked as the clear next step.
- **Result (zero decreases anywhere in the 9-trace family):**
  `resolve-off-a` 7/196→**25/196**, `resolve-off-b` 71/196→**88/196**
  (both genuine full-frame improvements); `resolve-off-c` 149/196
  unchanged (allowed — its own trailing 47-frame mechanism out of scope);
  `confirm-off-a` 14/132 and `confirm-off-b` 0/132 unchanged in count
  (both need item 5) but `resolve-off-d`'s own mismatch magnitude
  collapsed 18.08%→0.67% and `confirm-off-b`'s 2.57%→1.79% without yet
  crossing an exact-match frame. The three already-landed windows are
  provably unmoved: `turn5-action-off` 26/32, `turn6-reopen-off` 20/46,
  `turn5-reset-off` 256/256. Re-pinned two Tier-1 tests in
  `battleScene.test.ts` that encoded the superseded literals
  (`faintSinkRowsAndY2`'s 8-step closed-form receipt,
  `turn5RockSlideKoDismissEligible`'s cursor boundary), citing this
  session's receipt in each.
- **Next:** item 5 (the HP-overlay gate) is the named blocker for
  `confirm-off-a`/`-b` and possibly `resolve-off-d`'s small residual —
  needs a full per-caller audit of `drawActionMenuIdleContentFromLatest`'s
  12 call sites before widening the gate safely. `resolve-off-d`'s own new
  0.67% residual (bbox 44,71-195,104) is untraced — possibly the settled-
  Sitrus-phase ONIX sprite/HP-overlay (`turn5SitrusOnixHp`, a separate
  anchor this session didn't touch) or the known §8d rounding artifact.
  Full per-trace before/after table and remainders in `ISSUES.md` #97 §C.
- **Notes:** no PAPERCUT.

---
## 1326 — [main worker, 2026-08-18] **ISSUES #71 §1e retirement Rungs 2-4 landed: 50 more sites converted (94 of 121 total), zero FINDINGs, zero regressions**

- **State:** three green commits, one per rung, each independently
  verified (`d02ed8d9` Rung 2, `c9ce2d14` Rung 3, `0bd6b34e` Rung 4 —
  the stretch goal). `src/engine/battleScene.ts` only edited each time.
  `npm test` **1,066 files / 10,040 passed / 223 skipped** after every
  commit — byte-for-byte identical to session start, matching entry
  1325's own baseline exactly (pure refactor, zero test-count drift).
  `npm run build`/`npm run typecheck` green after each commit.
- **Did:** followed `docs/sendout-1e-retirement-design.md` §5 Rungs
  2-4 exactly, re-grepping every move's current line number first (doc's
  own drift warning) and confirming every per-move Tier-1 test filename
  with `find` before scoping (doc's rollingKick/healBell caveats both
  reconfirmed). **Rung 2** (14 sites, BRICK_BREAK…IRON_TAIL): GROWTH
  was already one of the pre-existing "dynamic in syntax" sites — only
  its raw call swapped for the OrZero helper inside its existing
  `side==="opponent" ? ... : null` ternary, value-identical by
  inspection. **Rung 3** (16 sites, STEEL_WING…SLEEP_TALK): two
  double-site branches (KARATE_CHOP's ONIX+PRIMEAPE, both proven by
  their own half of the throw-guard). **Rung 4, stretch** (20 sites,
  HEAL_BELL…BULK_UP): five double-site branches (PERISH_SONG/MURKROW,
  COTTON_SPORE/MAREEP, SLEEP_POWDER/HOPPIP — shared branch with
  STUN_SPORE, SWAGGER/RATTATA, BULK_UP/PRIMEAPE); SWAGGER's RATTATA
  fallback was `?? {x2:1,y2:0}` (not the zero idiom, since RATTATA is
  the only other species besides ONIX with a real nonzero table entry)
  — confirmed by inspection that the real table lookup already returns
  that value directly, so the fallback was already dead code and the
  substitution is value-identical, per the doc's own explicit
  diff-review caveat for this site. Every other site matched the
  standard `view.target.species`/`view.attacker.species` substitution
  the doc's §3 describes. Every rung's own site-count sanity check
  (`grep -c speciesFrontIdleRestOffset(` vs
  `speciesFrontIdleRestOffsetOrZero(`) summed to 123 unchanged — 0 (Rung
  0) + 14 (Rung 1) + 14 (Rung 2) + 16 (Rung 3) + 20 (Rung 4) = 64 helper
  sites, 59 raw remaining. Zero FINDINGs across all three rungs — every
  substituted expression matched what its enclosing throw-guard already
  proved, confirmed per-site by inspection, not assumed from the
  pattern.
- **Verification per rung (all three, independently):** named per-move
  Tier-1 test files green (23/84 tests Rung 2, 26/97 Rung 3, 34/92+1skip
  Rung 4), full `npm test` green and byte-identical to baseline each
  time, `npm run build` + `npm run typecheck` green each time, and
  `compare:differential -- battle-command-generated-off.json --base
  <rung's parent sha>` **128/128 byte-identical** each time (expected —
  none of these 108 ON-profile-legacy branches are reachable from that
  trace's OFF-profile route, per the doc's own §5 framing; this is
  insurance against the shared-import/helper change, not primary proof).
- **Next:** Rungs 5-8 remain (TORMENT…DOUBLE_EDGE, ~50 more sites) —
  same recipe, same per-rung verification bar. Rung 5's own doc row
  flags HARDEN as having zero Tier-1 coverage; that gap needs a minimal
  pin (mirroring `calmMind.test.ts`) *before* that site is touched, per
  the doc's explicit instruction — not a mechanical grep-and-substitute
  like every other site so far. Rung 9 (hand-fit swap-over) stays
  blocked on the animation lane's not-yet-started rung-4 back dispatcher.
- **Notes:** no PAPERCUT. Splitting each rung into its own commit meant
  re-running the full `npm test`/build/typecheck three times instead of
  once for the combined 50-site diff — the AGENTS.md-mandated
  per-rung-commit discipline costs real wall-clock time (~5 min/rung)
  but keeps every commit independently bisectable and green, which is
  the point.

---
---

---
