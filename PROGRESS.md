# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 136 — Supervisor: S8's blocking question answered (WIN unreachable at 20000) → **user decision: oracle frame cap raised to 45000** (harness `ccd7554`, service restarted + verified); §15 winline scout merged — Pidgeotto-KO line verified (tick 15887), Murkrow's first RAM ground truth

- **State:** `npm test` **659/659**, `npm run build` green, tree clean at
  the merge commit `f8b0649`; no worktrees, no unmerged branches. Oracle
  answers with `maxFrames: 45000` (smoke-tested on anchor.json).
- **Did:** (1) Worktree scout (merged): confirmed idle-timing is NOT an
  RNG lever (probe: +4-frame shift reproduces §12's ledger shifted +4) —
  move-choice sequence is; found+verified a line KO'ing Pidgeotto at tick
  15887 (BIND at turn 8), settled menu vs Murkrow at 17722; Murkrow RAM
  ground truth (Lv50 142/142 DARK/FLYING, INSOMNIA, LAX INCENSE, Spd 97,
  FAINT_ATTACK/FLY/TORMENT/TAUNT); Onix (4/117 after felling Pidgeotto)
  faints at 19147 dealing 0 to Murkrow — WIN provably misses the 20000
  cap for every plausible line (floor ≈22500 incl. swap + battle-2 menu).
  Traces `battle1-winline-a{,-murkrow}.json` + 2 RAM dumps + new probe
  `dump-battler-full.py` committed (§15). (2) Escalated; user chose
  raising the cap over snapshot/restore or re-scope: harness commit
  `ccd7554` (`MAX_FRAMES = 45_000`), service restarted, verified.
  ROADMAP S8 + Domain notes updated. (3) Verified+accepted workers #134
  (shake residual, turn1-rockslide 256/256) and #135 (slice E1,
  turn2-endeavor 76/77) — see their entries.
- **Next:** (1) scout lane: ground-truth the full WIN → swap → battle-2
  first-menu line under the 45000 cap (extend §15's winline; keep Onix
  healthier / voluntary switch options open); (2) main lane: slice E1b —
  ENDEAVOR attack anim + Onix HP drain 116→101 + player-side HP-digit
  compositor (ticks 2999-3128, §13 handoff: digits are FONT_SMALL,
  already extracted); then E2 (DRAGON_BREATH window, 3129-3846); (3)
  ISSUES #19 family (now 2 traces affected), #20 rewire remainder.
- **Notes:** oracle restart was deferred until the main lane was idle (a
  mid-flight restart would have broken E1's compares). Old cap's two
  stale Thursday `server.py` processes (not on :8012) left untouched.

---
## 135 — Bounded worker: S7 slice E1 — turn 2's FIGHT-submenu reopen through ENDEAVOR's kickoff text, `turn2-endeavor.json` **76/77** (the 1 residual is ISSUES #19's own pre-existing family, confirmed recurring, not new) — suite **659/659**

- **State:** `npm test` **659/659** (+12 Tier-1 pins), `npm run build`
  green, tree clean. New committed trace
  `tools/compare/traces/turn2-endeavor.json` (exact 44-segment prefix +
  `battle1-turn2.json`'s own next 6 segments verbatim, final idle trimmed
  so the trace ends at tick 2999) **76/77**. Zero regressions at exact
  prior counts: `turn1-rockslide` 256/256, `turn1-drain` 102/102,
  `fight-submenu` 234/235, `turn1-kickoff` 81/81, `turn1-cloneanim`
  230/230.
- **Did:** FIGHT submenu reopens for turn 2 (cursor rests at slot 0,
  matching — not yet generalizing — the ground truth) with PP now dynamic
  (9/10, was static 10/10): rendered through the REAL FONT_NORMAL pipeline
  per the brief's own ask (`ppRemainingGlyphCodes` + a new `font.ts` export,
  `drawGlyphCodes`, needed for `CHAR_SPACER`'s own non-charmap glyph code),
  not a second static harvest — oracle-pixel-confirmed 0/450 mismatches,
  and `getCurrentPPToMaxPPState(9,10)` confirmed (not assumed) the color
  band stays full, no palette change. `DOWN` to DRAGON_BREATH (slot 2, PP
  20/20, its harvest already valid, 0 mismatches re-checked) → `A` confirms
  → "Foe GROVYLE used\nENDEAVOR!" prints and holds. Three real bugs found
  and fixed along the way (docs/battle-menu-notes.md §13 has the full
  derivation for each): (1) Grovyle's HP was forgotten by every render path
  except slice D's own `drawTurnEndSettledMenu` — fixed at the root via one
  new `turn1Resolved`-gated helper (`drawMenuIdleBaseWithOpponentHp`)
  threaded through every `menuIdleBase` draw site, not a per-site patch;
  (2) the submenu's own bounce overlay must inherit the RESETTLED menu's
  phase (`rockSlideResettledBounceTick`), not turn 1's own plain-`t`
  formula, which only worked for turn 1 by coincidence (its open predates
  any resettle event); (3) the post-confirm frozen bounce state and the
  kickoff-text hard-cut tick both needed their own grid-search corrections
  (mirroring `turnKickoffFrozenBounceTick`'s own established precedent),
  landing at `TURN2_KICKOFF_FROZEN_BOUNCE_TICK=2119` and a 1-tick-earlier
  `turn2KickoffTextStartTick`. ENDEAVOR's HP-diff math
  (`calculateEndeavorDamage`/`resolveEndeavorDamage`, damageCalc.ts) is
  pinned hermetically against the RAM dump (117,101→16, the 0.5x
  intermediate scale to 8, the restore back to 16) per the brief's own ask,
  independent of the (not-yet-wired) visual drain.
- **Stopped exactly at:** the kickoff text fully printed and held (tick
  2999) — the FIRST real pixel change past that point is oracle-confirmed
  at tick 3003 (ENDEAVOR's own attack animation beginning), well before the
  3128 cap. ENDEAVOR's animation, Onix's HP-bar drain (3098-3116), and the
  player healthbox's own HP-digit compositor (117/117→101/117, needs a
  player-side analogue of `composeOpponentHealthbox` — confirmed this
  session to need nothing new font-wise, just FONT_SMALL again, source-
  traced via `AddTextPrinterAndCreateWindowOnHealthbox`) are explicitly
  NOT wired this session — left for a follow-up slice, per this step's own
  fallback clause.
- **Next:** the deferred visual half (ENDEAVOR anim → HP drain → player
  healthbox digits → settled at tick ~3128) is the natural continuation;
  otherwise ISSUES #19's own anomaly family (now confirmed general, not
  turn-1-specific) or S8's faint/forced-switch slice per #133's own list.
- **Notes:** the grid-search-against-cropped-oracle-regions technique (§8's
  own convention) resolved all three bugs above without ever needing a
  fresh scratch trace — the already-committed `battle1-turn2.json` ground
  truth had every tick this session needed. No papercuts.

---
## 134 — Bounded worker: §11.1's 1px shake residual CLOSED — misdiagnosed as `drawStaticBgShiftedY`; real cause was the player healthbox's bleed-mask heuristic coincidentally matching the unshifted background — `turn1-rockslide.json` **250/256 → 256/256**; suite **649/649**

- **State:** `npm test` **649/649** (+1 Tier-1 pin), `npm run build`
  green, tree clean. `tools/compare/traces/turn1-rockslide.json`
  **256/256, 0 diff**. Full regression sweep, zero change at established
  counts: `turn1-drain` 102/102, `turn1-cloneanim` 230/230,
  `turn1-kickoff` 81/81, `fight-submenu` 234/235, `sendout` 255/256,
  `s6-acceptance` 224/228, `menu-idle` 69/69, `scene-assembly` 256/256.
- **Did:** the brief's own hypothesis (`drawStaticBgShiftedY` sampling a
  wrong tile pixel at a boundary) turned out to be a misdiagnosis —
  `staticBgPixel(173, 85)` genuinely returns `(247,247,255)`, the
  correct raw BG3 sample for that shifted map row. The real bug is one
  layer up: `drawMenuHealthboxPlayer`'s bleed mask
  (`getMenuHealthboxPlayerContentMask`) infers "background bleed" for a
  harvested rectangular pixel by comparing it against the plain,
  always-unshifted background — correct for the settled action-menu
  window it was harvested from, but this same draw call is reused inside
  the Rock Slide shake window, where BG3 genuinely scrolls. One harvested
  pixel (a white frame highlight at screen (173,92)) coincidentally
  equals the *unshifted* background's color there, so the heuristic
  always called it a hole — invisible on `0`-shift ticks (live bg is
  white there too, same coincidence), wrong on `-7`-shift ticks (live bg
  samples a different, non-white tile row). Root-cause fix, not a
  special case: the harvest's bleed set forms exactly 4 connected regions
  (sizes 8/55/260/**1**) — real bleed is a byproduct of the healthbox's
  true non-rectangular shape, so it comes in contiguous patches, never a
  lone pixel stranded inside solid content. The mask now despeckles:
  any bleed-classified pixel whose 4-neighbors are all content gets
  reclassified as content too — generalizes to the whole class of
  coincidence, leaves all genuine bleed regions and every other trace
  untouched. Full derivation + fix in docs/battle-menu-notes.md §11.1
  ("FIXED" note appended, not rewritten — the original attribution stays
  visible as the record of what was tried first and why it was wrong).
- **Next:** ISSUES #19's 99px single-row anomaly family; S7 continues
  (turn-2+ engine slices against §12-§14 ground truth); ISSUES #20
  rewire when S8 nears.
- **Notes:** the misdiagnosis cost real time — confirming
  `drawStaticBgShiftedY`'s math was innocent (dumping the tilemap/tileset
  JSON directly, cross-checking against the oracle's own PNGs pixel-by-
  pixel across the whole 8x8 tile and neighboring ticks) before finding
  the actual layer. A naive first fix attempt (compare the healthbox
  harvest against the *live* framebuffer instead of the flat background)
  made things worse, not better: same 6 failing frames but 1px→211px
  diff each, by reclassifying ~210 genuine bleed pixels as content;
  reverted in favor of the despeckle approach once connected-component
  analysis on the bleed mask made the real distinguishing signal
  (isolated vs. contiguous) obvious. No papercuts otherwise.
