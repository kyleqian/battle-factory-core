# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

## 76 — ORACLE BOOTSTRAP v4 SHIPPED (supervisor, harness-level, user-directed): Battle Scene forced ON via zero-frame poke — anchor byte-identical, 18/19 traces hold exactly, only the send-out window's truth moved (174/256, window 1462-1543)

- **State:** harness commit `aae8b98` (+ template-revert follow-up, per
  user preference the ROADMAPs stay untouched — the oracle speaks for
  itself). Oracle service restarted on v4 (`bin/oracle info` → version 4,
  canonical sha unchanged `9c89c741…`). Smoke test green (version pin
  bumped in lockstep). This run: `npm test` 454/454, build green.
- **Did:** single poke in the bootstrap's previously-unused `pokes` field
  (applied after all 6910 scripted frames, before settle — ZERO frames
  added, RNG stream untouched): `gSaveBlock2Ptr`(deref)+0x15: `0x07→0x03`,
  clearing only `optionsBattleSceneOff` (u16 bit 10). Fixed a latent
  harness bug blocking all pokes (`emerald_core.write_u8` used libmgba-py's
  broken `__setitem__` sugar → now `raw_write`). Full verification chain:
  probe shows bit=0 + anchor sha byte-identical; smoke-test golden hashes
  pass; battle1-turn1 replay vs v3 truth: all pre-battle captures
  identical, first divergence tick 1968, 172/223 differ — animations
  visually confirmed (DOUBLE_TEAM afterimage on screen). Full 19-trace
  sweep: 18 at exact prior counts; `sendout.json` 196→**174/256** with ONE
  contiguous mismatch window **1462-1543** (was 1462-1521) — mechanism
  source-identified: `SpriteCB_OpponentMonFromBall`→`BattleAnimateFrontSprite`
  no longer passes `SKIP_FRONT_ANIM` (`battle_main.c:2837`,
  `pokemon.c:6888`), so the mon front-sprite entrance animation now plays
  post-materialize; settled tail 1544-1555 unchanged.
- **Stale-by-design inventory (v3-truth artifacts to regenerate):**
  `battle1-sendout-dense.json` (1462+), `battle1-turn1.json` + its RAM
  dump + battle-turn-notes.md battle-window tables (first action menu
  itself lands later — player send-out front anim), battle-move-anim-notes
  §4-6 timelines (its Battle-Scene-OFF root-cause finding is historical
  truth of v3; its asset/decode work is now exercised). Two lane briefs
  for exactly this split are DRAFTED but NOT LAUNCHED — the user asked to
  hold new workers (2026-07-18 ~17:45); briefs live in the supervisor
  scratchpad (brief-sendout-v4.txt, brief-s7-v4-regen.txt) and their
  content is re-derivable from this entry alone.
- **Notes:** sibling run `swift-koala` shares this oracle and inherits v4
  (user-directed harness change). `docs/battle-turn-notes.md`/`battle-
  move-anim-notes.md` §-references above are the regen worker's map.

---
