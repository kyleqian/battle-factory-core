# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 79 — Bounded worker: send-out mechanism 2/5 (ball sprite) landed, pixel-validated; `sendout.json` stays **174/256** as expected (per #74/#78's "no subset moves the count" finding), 4 mechanisms remain

- **State:** `npm test` **455/455** (+1), `npm run build` green. Full
  19-trace sweep: 18 others at exact prior counts, `sendout.json`
  unchanged **174/256** — expected, not a miss (see below). Zero
  regressions.
- **Did:** implemented and pixel-validated the **ball sprite** (mechanism 2
  of the 5 named in #78/§7.11) — `StartSendOutAnim`/
  `SpriteCB_ReleaseMonFromBall` (`pokeball.c:389-395,750-824`), using the
  already-extracted `summary-ball.json` (closed frame) and
  `battle-anim-ball-open.json` (open frame) — both landed in an earlier
  commit (`c4a7a85`, a parallel worktree lane) but were unused by any
  engine code until now; checking `src/assets/gen/` first (per the brief)
  found both assets already done, so no new extraction was needed for
  this mechanism. Position/timing pixel-brute-force-confirmed against this
  run's own regenerated ground truth (not assumed from the different trace
  `docs/battle-anim-assets.md` used): corner (168,56), closed frame
  ZERO-diff exact every tick 1464-1479 (16 ticks), open frame ZERO-diff
  exact at 1480 only (degrading after as still-unrendered particles/mon
  occlude it) — confirms `sBallAnimSeq1`'s 5-tick-open+5-tick-blank
  exactly. `localcheck.ts` pixel-diff mass across 1462-1543:
  **127107→124762px** (−2345px, zero tick regressed). New Tier-1 test
  (`tests/battleScene.test.ts`) pins both boundary ticks via a pixel
  opaque in the closed frame's tile but transparent at the same offset in
  the open frame's tile. `docs/battle-scene-notes.md` §7.11 gained the
  ball's own sub-section (mechanism-2 status); `battleScene.ts` gained a
  doc'd `drawSendOutBall` + supporting constants.
- **Why the count didn't move (expected, re-confirmed not re-tested):**
  #74 and #78 both already established structurally that no tick in this
  window has only one mechanism left broken — every tick 1462-1543 needs
  **all five** of: (1) opponent party-summary despawn fade, (2) ball
  sprite [DONE this session], (3) open-particle burst, (4) mon
  affine-scale-in + ball-color tint, (5) front-sprite entrance anim
  (`ANIM_V_STRETCH`) + its missing 2nd frame. This session's own
  before/after sweep (above) reconfirms it: real, measured pixel-mass
  reduction, zero full-frame flips — same pattern as #74's two mechanisms.
- **Next (in decreasing tractability, given time remaining in a session):**
  mechanisms 3 and 4 have their assets/tables **already extracted**
  (`battle-anim-particles.json` incl. `regularBallAnim`'s frame table and
  the spawn/motion formulas cited in `docs/battle-anim-assets.md` §1;
  `battle-anim-tables.json`'s `ballOpenFadeColor`/`affineEmerge` step
  table) — no extraction blocks them, only new renderer code (a radial
  particle spawner for 3; nearest-neighbor affine-scale sprite blending
  for 4, which is this engine's first affine-OAM precedent and will also
  serve mechanism 5's stretch). Mechanism 1 (party-summary despawn) needs
  fresh RAM/pixel timing work first (not even source-timed precisely yet,
  per §7.4.3). Mechanism 5 needs a genuine ROM extraction (GROVYLE's 2nd
  front-sprite frame, `HasTwoFramesAnimation`) plus the `Anim_
  VerticalStretch` Sin-table renderer and its still-open start-tick
  arithmetic — the most expensive of the five. A future step should
  probably tackle 4 next (unlocks 4 and de-risks 5's renderer together),
  then 3, then 1, then 5.
- **Notes:** action-menu window (1560+) and the turn-notes/move-anim docs
  stayed untouched (this step's explicit out-of-scope, per the brief's
  hands-off note for the parallel worktree worker on that lane).

---

## 78 — Send-out window re-grounded under v5 truth: ground truth regenerated + twice-run deterministic, new front-sprite-entrance mechanism decoded, one stale Tier-1 pin corrected (1519→1544). `sendout.json` still **174/256** — score target NOT met, gap precisely re-bounded

- **State:** `npm test` **454/454**, `npm run build` green. Full 19-trace
  sweep: 18 others at exact prior counts (anchor 1/1, draft-cursor 13/13,
  draft-menu 38/38, draft-menu-slot6 66/66, example 4/4, summary-info-onix
  122/122, summary-info-magby 132/132, confirm-decline 67/67,
  accept-prebattle 137/137, walk-warpout 125/125, room-entry 110/110,
  room-npcs 98/98, room-msgbox 142/142, transition 206/206, scene-assembly
  256/256, rent-slot1 125/139, rent-3picks 157/190, confirm-flow 79/95),
  zero regressions. `sendout.json` **174/256**, unchanged from the
  supervisor's pre-session measurement (#76/#77) — **acceptance bar
  "strictly > 174/256" NOT reached this step.**
- **Did:** (1) Regenerated `battle1-sendout-dense.json` ground truth against
  the current v5 oracle via `bin/oracle run`, twice, into separate dirs: all
  256 captures byte-identical between runs (determinism confirmed, no new
  fixture needed — button script unchanged, its one press predates the
  divergence). (2) Re-derived the window boundary empirically (not from
  source-constant arithmetic): isolating Grovyle's own 64×64 sprite crop
  across ticks 1510-1555 shows continuous per-tick change through 1543,
  static from **1544** — corroborated by the full-frame oracle-vs-engine
  match boundary sitting at the same tick. Widens the transient window from
  v3's 1462-1521 (60 frames) to v4/v5's **1462-1543 (82 frames)**, tail
  1544-1555 still byte-exact. (3) Decoded the newly-unmasked mechanism
  source-exactly: `SpriteCB_OpponentMonFromBall` (`battle_main.c:2837-2848`)
  now runs GROVYLE's species front-sprite entrance anim once
  `affineAnimEnded` — `sMonFrontAnimIdsTable[SPECIES_GROVYLE-1] =
  ANIM_V_STRETCH` (`pokemon.c:1659`) → `Anim_VerticalStretch`
  (`pokemon_animation.c:1597-1635`, a 41-tick Sin-table-driven affine
  vertical stretch with a wobble sub-term on ticks 10-29), plus a concurrent
  swap to the front sprite's un-extracted 2nd frame
  (`HasTwoFramesAnimation(GROVYLE)` = TRUE). (4) Corrected the one Tier-1
  pin that encoded v3-only truth: `GROVYLE_MATERIALIZE_TICK` in
  `battleScene.ts` (1519→1544) + its test in `tests/battleScene.test.ts` —
  net score effect is exactly zero (ticks 1519-1543 were already mismatches
  either way; the fix stops asserting a materially false "settled" pixel
  there, doesn't create or destroy a match) but is real correctness, not a
  no-op. Full correction-block written to `docs/battle-scene-notes.md` §7.11
  (§§7.0-7.8 kept verbatim as v3 truth; §7.9/§7.10 marked v3-stale in
  place, not deleted).
- **Next:** per §7.11's own gap list, `sendout.json`'s remaining 82 frames
  (1462-1543) need **five** simultaneous mechanisms, none alone sufficient
  (re-confirmed pattern from #74's two-of-four-implemented/zero-score-change
  result): (1) opponent party-summary despawn fade — still not source-timed
  precisely; (2) ball sprite frame 2 ("open" pose) — not extracted; (3)
  particle-burst sheet (`particles.png`) — not extracted at all; (4) mon
  affine-scale-in + ball-color tint — no affine-OAM precedent in this
  engine; (5) **new**, GROVYLE's front-sprite entrance anim itself — needs
  the missing 2nd front frame extracted AND a `Sin()`-table affine-stretch
  renderer (shares the affine-OAM gap with item 4, not reusable as one
  fix) AND the still-open exact start-tick/scheduling-lag arithmetic. None
  implemented this session — correctly out of one bounded worker step's
  budget per this run's own "no fix that trades ticks"/"no curve-fitting"
  rules (a partial subset was already shown, twice, to move pixel-diff
  magnitude without moving the frame-match count).
- **Notes:** the action-menu window (1560+, first-action-menu timing,
  `battle-turn-notes.md`/`battle-move-anim-notes.md`/
  `battle1-turn1.json`/`battle1-intro.json`/`battle1-menu*.json`) was left
  untouched, per this step's explicit out-of-scope — a parallel worktree
  worker (`.worktrees/wt-20260718-174536`, branch
  `worker/wt-20260718-174536`, unstarted as of this commit) owns that lane.

## 77 — ORACLE BOOTSTRAP v5 (supervisor, harness-level, user preference): Battle Scene ON moved INTO factory.sav itself; v4's runtime poke retired — ground truth proven identical (223/223), all counts unchanged

- **State:** harness commit on the pokebench repo ("bootstrap v5");
  oracle service restarted on v5, smoke test green, this run 454/454 +
  build green. Sweep identical to #76's v4 sweep (18 exact + sendout
  174/256).
- **Did:** per the user's preference for a self-consistent save over
  runtime manipulation: new `oracle/bootstrap/set-battle-scene-on.py`
  (idempotent, layout + checksum from `save.c`, used-size re-derived
  from the file's own verifying checksum rather than hard-coded) edits
  both save slots' SaveBlock2 sectors `0x07→0x03` + recomputed
  checksums; `factory.json` v5 with `pokes: []` again. **Equivalence
  proven, not assumed:** fresh-bootstrap probe bit=0 + anchor sha
  byte-identical; turn-1 groundtruth replay byte-identical to v4's
  manifest (223/223 capture shas) — v5 ≡ v4 ground truth exactly, so
  everything #76 verified carries over unchanged, incl. the
  stale-artifact inventory and the sendout 1462-1543 window.
- **Next:** unchanged from #76 — the two drafted lane briefs (sendout
  re-ground-truth + engine; S7 v4/v5 regeneration) remain HELD per the
  user's standing "don't launch new workers yet" (~17:45). Launch only
  on user go-ahead.
- **Notes:** pristine factory.sav recoverable via pokebench git history;
  v4 section kept in BOOTSTRAP.md as superseded history.
---
