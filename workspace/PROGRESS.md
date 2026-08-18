# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 1340 — [main worker, 2026-08-18] **ISSUES #97 remainder: `resolve-off-b`'s fainted-cursor dismiss+freeze LANDED per `docs/turn5-resolve-ab-pools-diagnosis.md` §11.1 — 88/196→196/196 (CLOSED); `-a` 56/196→58/196; `-c` unchanged 195/196**

- **State:** one green commit (`f4b43eec` fix+Tier-1 pins) plus this docs
  commit. `npm test` **1,067 files / 10,079 passed (+4, updated 2 stale
  pins + 2 new describe blocks) / 223 skipped**; `npm run build`/
  `npm run typecheck` green.
- **Did:** read §11 fully (committed today, ab-pools diagnosis doc) and
  landed its named fix shape exactly: a new, disjoint
  `turn5FaintDismissElapsed: number | null` field on `BattleSceneState`
  (optional, not the doc's literal non-optional shape, so the many
  pre-existing raw-state-literal test fixtures kept compiling without a
  mass edit), set once in `core.ts` on the real `newKeys.has("A")` edge
  gated by the already-staged `turn5RockSlideKoDismissEligible`, threaded
  as a trailing param down `drawFightSubmenuWindow` →
  `drawTurn5EndeavorText` → `drawTurn5RockSlideWindow`. Extracted the
  freeze-clamp arithmetic into a new pure `turn5FaintDismissCursorTick`
  helper (matching this codebase's existing small-pure-helper pattern,
  e.g. `faintSinkRowsAndY2`) rather than inlining it, for direct
  testability. **MANDATORY live-pinning caught a real off-by-one:** §11.1
  flagged its own hand-derived `-2` freeze-tick offset as unverified; a
  temporary debug print confirmed `turn5FaintDismissElapsed` lands at
  exactly RAM tick 6561 as predicted, but a fresh `npm run compare --
  turn5-resolve-off-b` with `-2` showed a CONSTANT 24px mismatch across
  the entire frozen tail (6561-6613) — the doc's own derivation was one
  tick short (`cursorState(6559,...)` = offset 1, not the real frozen
  value 2; `cursorState(6560,...)` = 2). Corrected
  `TURN5_FAINT_DISMISS_FREEZE_TICK_OFFSET` to **1**, re-verified. Two
  pre-existing tests (`"rank-3 turn-5 KO dismiss mirror retirement"`)
  had pinned the OLD, since-superseded finding that a KO-dismiss A-press
  at ticks 6561/6591 was "presentation-inert" — now literally false (the
  real mechanism this fix lands DOES change state there) — updated both
  to assert the new correct behavior instead of deleting them.
  `turn5FaintedCursorYOffset` itself left defined but unreferenced, per
  §11.1's own explicit guard.
- **Result:** `turn5-resolve-off-b` 88/196 → **196/196 (CLOSED, exact,
  as §11.1 predicted)**. `turn5-resolve-off-c` unchanged **195/196**
  (only the pre-existing 6763 residual — the hard guard that sank the
  original bare Class C attempt, reverified unaffected). `turn5-resolve-
  off-a` 56/196 → **58/196** (2 of the doc's own 3 predicted direct hits
  close — 6407, 6416; the third, 6398, is the pre-existing, already-
  accepted 1-tick `GROVYLE_HEALTHBOX_VANISH_TICK` residual, ISSUES #97-C,
  unrelated to this fix — 1 short of §11.1's own ≥59 prediction,
  attributed not chased). Zero decreases across the full guard family:
  `turn5-reset-off` 256/256, `turn5-action-off` 32/32, `turn6-reopen-off`
  46/46, `turn6-menu-off.json` fixture 47/47, `turn5-confirm-off-a`
  128/132, `turn5-confirm-off-b` 131/132, `turn5-resolve-off-d` 159/196,
  `turn13-switchin` 242/242 (the load-bearing guard for the new,
  disjoint state slot claim — unaffected, confirming turn 5's dismiss
  did not leak into turn 13's owner), `turn4-doubleteam-off`/
  `turn4-rockslide-off` 256/256 each.
- **Next:** ISSUES #97-J's Class B (the `resolve-off-a` 6248-6365
  static-background residual, §11.2, side-lane territory) is the next
  named instrument — a `DISPCNT`/`BGxCNT` RAM probe to identify which
  layer actually carries the visible sky/ground art. `resolve-off-a`'s
  own 6398 residual (pre-existing, ISSUES #97-C) and `resolve-off-c`'s
  6763 residual stay small, named, unchased. `resolve-off-d`'s
  6970-6988 ring/star and 6989-7005 menu-chrome spike (sub-entry K)
  remain untouched. #71 Rung 9 unchanged.
- **Notes:** no PAPERCUT. The step brief's MANDATORY "pin the unverified
  constant with a probe or targeted pixel read FIRST, then land"
  instruction caught a real bug before commit — landing §11.1's own `-2`
  literally as hand-derived would have shipped `resolve-off-b` at a
  worse count than the pre-fix baseline in the frozen span specifically
  (constant wrong-by-one-step mismatch across all 53 post-dismiss
  frames), silently regressing the exact window the fix targeted while
  still reporting a net "improvement" over 88/196. Re-running the FULL
  guard family (not just `-a`/`-b`) after the correction, per ISSUES
  #97-J's own standing lesson, confirmed `-c` genuinely holds this time.

---
## 1339 — [main worker, 2026-08-18] **ISSUES #97 remainder: `confirm-off-a`/`-b`'s squish-drop + drain-delay mechanisms LANDED, plus `resolve-off-d`'s Onix Sitrus HP display-climb LANDED — 60/132→128/132, 37/132→131/132, 142/196→159/196**

- **State:** two green commits (`02b82685` primary + `37a901db`
  secondary, each fix+Tier-1 pins) plus this docs commit. `npm test`
  **1,067 files / 10,075 passed (+7 total, 2 new describe blocks + 1
  rewritten) / 223 skipped**; `npm run build`/`npm run typecheck` green.
- **Did:** read `docs/turn5-confirm-pools-diagnosis.md` (committed
  `6366f91a`) and `docs/turn5-confirmb-resolved-residuals.md` §8 in full.
  **Primary, both classes landed byte-for-byte per the doc's own diffs:**
  `drawTurn5EndeavorText` was the last remaining caller of
  `drawEndeavorSquish` (turn 2/3 already dropped it, ISSUES #39, zero RAM
  basis — pixel-reconfirmed for turn 5 too) — rewritten to mirror
  `drawTurn3EndeavorText`'s own structure, threading three new turn5-off
  scoped constants (`TURN5_OFF_ENDEAVOR_HP_DRAIN_START_DELAY`=116,
  `_HEALTHBOX_BOUNCE_START`=81, `_FLICKER_START`=82 — all bit-for-bit the
  turn2/3 precedent). Deleted `drawEndeavorSquish`/`drawEndeavorHitsplats`/
  `ENDEAVOR_HITSPLAT_ROUNDS` (grep-confirmed genuinely dead post-rewrite —
  the squish table/blend/shake/droplet helpers survive, still used by the
  separate Scene-ON ENDEAVOR staged path, so not ALL of the doc's own
  speculative cleanup list died). **Secondary landed too (budget
  remained):** §8's own "ring/star" framing for `resolve-off-d`'s
  6953-~6988 residual was superseded by a live-climb HP-overlay finding.
  Per the brief's own MANDATORY verification instruction, did NOT just
  trust the doc's 3-anchor curve fit — ran a fresh oracle-vs-oracle
  per-tick pixel diff of the HP-digit crop, confirming the digit changes
  on EVERY tick 6953-6982 (30 consecutive nonzero diffs, zero skips) then
  holds flat, exactly matching `hp(t)=t-6951` and capping at t=6982 (not
  the hedged ~6982-6984). Landed `turn5OffSitrusOnixHp`'s new live-climb
  body plus a new `TURN5_OFF_SITRUS_ONIX_HP_CLIMB_START_TICK`=6952
  constant (pixel-confirmed absolute tick; no clean relative-offset
  derivation from any existing epoch was found). Per the brief's "hard
  lesson" (sub-entry J), reran the ENTIRE guard family after EACH landed
  mechanism, not just the target traces.
- **Result:** `turn5-confirm-off-a` 60/132 → **128/132** (predicted ~128,
  exact). `turn5-confirm-off-b` 37/132 → **131/132** (predicted ~131,
  exact). `turn5-resolve-off-d` 142/196 → **159/196** (+17, strict
  improvement; 6953-6969 now exact, 6970-6988 keeps a much smaller
  residual — a real, previously-masked ring/star sparkle defect, now
  exposed and still open — and 6989-7005's already-flagged menu-chrome
  spike is untouched). Zero decreases anywhere, verified after both
  landings: `turn5-reset-off` 256/256, `turn5-action-off` 32/32,
  `turn6-reopen-off` 46/46, `turn6-menu-off.json` fixture 47/47,
  `turn5-resolve-off-a` 56/196, `-b` 88/196, `-c` 195/196,
  `turn13-switchin` 242/242, `turn4-doubleteam-off`/`turn4-rockslide-off`
  256/256 each.
- **Next:** confirm-off's class 3 (4-frame confirm-wait submenu bounce,
  next instrument in the doc's own §3.2) and class 4 (1-frame accepted
  edge) remain open. `resolve-off-d`'s newly-exposed 6970-6988 ring/star
  residual and its already-flagged 6989-7005 menu-chrome spike both need
  their own RAM-probe instruments (named in `docs/turn5-confirmb-
  resolved-residuals.md` §8.3, unchanged). `resolve-off-a`/`-b`'s
  remaining pools (sub-entry J, side-lane territory) untouched. #71 Rung
  9 unchanged.
- **Notes:** no PAPERCUT. The secondary's own MANDATORY "verify, don't
  assume" instruction paid off exactly as intended — an independent
  per-tick pixel diff (not just re-checking the doc's 3 anchor points)
  pinned the cap tick one tick earlier than the doc's own hedge (6982 vs
  "~6982-6984") and, just as importantly, revealed that the doc's own
  predicted 160-178/196 range wouldn't fully land: the actual result
  (159/196) is a strict improvement but undershoots the low end by one,
  because a real second mechanism (ring/star) was hiding under the digit
  bug the whole time — exactly the kind of thing a rushed "looks close
  enough" landing would have missed.

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

