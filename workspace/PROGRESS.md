# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 1341 — [main worker, 2026-08-18] **ISSUES #97 remainder: `resolve-off-d`'s three §9-named fix shapes (star suppression + text-clear/menu-redraw retiming) LANDED — 159/196→194/196, exactly matching §9.5's own prediction**

- **State:** one green commit (`7448000c` fix+Tier-1 pins) plus this docs
  commit. `npm test` **1,067 files / 10,086 passed (+7, six new pin
  blocks + `pressTick` cleanup) / 223 skipped**; `npm run build`/
  `npm run typecheck` green.
- **Did:** read §9 fully (committed at `1ff264ee`, the side worker's own
  two-instrument follow-up) and landed all three of its named fix shapes
  together (they share one call chain and interact, so landing separately
  would re-derive the same evidence twice): (1) `suppressSitrusStars`,
  mirroring `suppressSitrusRotate` byte-for-byte — §9.2's own full
  64-slot `gSprites` RAM scan found zero granting-star/ring template
  matches anywhere in this trace, so `drawGrantingStars`'s two star
  sprites are spurious, same class as the already-fixed rotation; gated
  behind a new trailing param threaded `drawTurn5RockSlideAttack` →
  `drawTurn6FieldBase` → `resolve-off-d`'s own call site. (2)
  `TURN5_OFF_SITRUS_TEXT_CLEAR_TICK` 6991→6989 (§9.3, real hardware
  clears 2 ticks early). (3) `TURN5_OFF_SITRUS_MENU_REDRAW_TICK`
  6991→6995 (§9.4, RAM-pinned to a `gBattle_BG0_Y` scroll-snap gated
  behind an async DMA3 copy). **Resolved §9.4's own open question
  empirically, per this step's own explicit instruction:** before
  touching `src/`, inspected fresh oracle screenshots at 6989/6991/6994
  side by side — all three are the SAME plain-field image, no message
  box, no chrome at all — falsifying §6.3's own "left portion already
  matches at 6991" framing (that match was measured against unrelated
  on-field sprite pixels, not real prompt-text timing). Source
  cross-check confirms: `B_WIN_ACTION_PROMPT`/`B_WIN_ACTION_MENU`
  (`battle_bg.c:174-192`) are both `bg=0`, same scrolled row, gated by
  the SAME single `gBattle_BG0_Y` register — no independent second gate
  exists to split on. Landed the simplest shape consistent with the
  evidence: retime the one existing shared gate, no split blit. Both
  `TURN5_OFF_SITRUS_*` constants are scoped to this single call site
  (grep-confirmed, per their own doc comments), so moving them
  independently needed no sibling-turn sweep. Exported
  `drawTurn5RockSlideWindow` (was file-private) to pin the two retimed
  gates directly, mirroring `drawTurn5RockSlideAttack`'s own existing
  export for `suppressSitrusRotate`'s tests.
- **Result:** `turn5-resolve-off-d` 159/196 → **194/196** (+35, exactly
  matching §9.5's own predicted count). Tick 6850 (pre-existing,
  unrelated) and tick 6996 (cursor-adjacent, genuinely undiagnosed per
  §9.1's own explicit flag, deliberately not chased per this step's own
  "do not touch anything cursor-related" constraint) remain, both exactly
  as §9.5 predicted. Zero decreases across the full guard family, fresh
  this session: `turn5-reset-off` 256/256, `turn5-action-off` 32/32,
  `turn6-reopen-off` 46/46, `turn6-menu-off.json` fixture 47/47,
  `turn5-confirm-off-a` 128/132, `turn5-confirm-off-b` 131/132,
  `turn5-resolve-off-a` 58/196, `turn5-resolve-off-b` 196/196,
  `turn5-resolve-off-c` 195/196, `turn13-switchin` 242/242,
  `turn4-doubleteam-off`/`turn4-rockslide-off` 256/256 each.
- **Next:** `resolve-off-d` is now down to its two flagged, deliberately
  unchased residuals (6850, 6996) — no further named instrument pending
  for it. `resolve-off-a`'s Class B (6248-6365 static-background span,
  side-lane territory) and `resolve-off-a`'s own 6398 residual,
  `resolve-off-c`'s 6763 residual, and `confirm-off-b`'s classes 3/4
  (ISSUES #97 sub-entries J/K) remain the family's own open items. #71
  Rung 9 unchanged.
- **Notes:** no PAPERCUT. The step brief's own MANDATORY "resolve
  empirically, don't guess" instruction on §9.4's split-gate question
  paid off directly: a plausible-sounding alternative (independently
  gating the message-box and button-grid regions, since §6.3's own
  wording explicitly invited that reading) would have added real
  complexity for no benefit — a direct pixel check ruled it out in
  minutes and the single-retimed-gate fix landed exactly at the
  predicted count on the first try.

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

