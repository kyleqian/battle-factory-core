# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 110 — Supervisor: menu-idle branch merged (two-file conflict, hand-resolved incl. a marker that briefly slipped into the merge commit — caught by the post-commit test run, amended before push) — `menu-idle.json` **69/69**; S6 chain has ONE unimplemented window left (1664-1741, ISSUES #17)

- **State (verified post-merge, amended commit):** `npm test` **545/545**,
  `npm run build` green, tree clean. menu-idle 69/69, menu-materialize
  12/12, sendout 246/256, scene-assembly 256/256, menu-throw 70/70,
  menu-text 18/18, transition 206/206, anchor 1/1.
- **Did:** merged `worker/wt-20260719-034821` (action-menu window
  1742-1810): closed-form idle generator (`menuIdleBounce` + literal
  `gSineTable` copy — the `Math.sin`-derived `gbaSin` is off by 1 at
  indices 62/63, which would have produced phantom y2=2 frames at ticks
  1767/1804 inside this very window), atomic menu draw, teal blank pinned
  to `TryDoEventsBeforeFirstTurn`'s `BattlePutTextOnWindow(gText_
  EmptyString3)`, cursor tiles byte-verified. Window base is
  oracle-harvested composition (sibling healthbox work was in flight) —
  honest, documented; regenerating it from the engine's own render once
  #17 closes is a cheap future cleanup. Conflicts: battleScene.ts (2
  regions) + battleMenu.ts (1 region), all both-sides-added — resolved
  keeping both; the battleMenu.ts markers initially slipped into the
  merge commit (compound-command tail truncated the conflict list),
  caught immediately by the test run, amended.
- **Next:** (1) main lane — ISSUES #17 (ONIX color-fade to true color +
  settle wobble, 1664-1701, the LAST unimplemented S6 window; RAM leads
  filed in the issue); (2) worktree — sendout 1491-96 (biggest remaining
  span, opponent-side internals); (3) then S6 acceptance trace (uniform
  ~250-capture grid anchor→1810), remaining polish (menu-throw's 8
  icon-exit ticks, 1470/71/79, 1462), wind-down before 07:55.
- **Notes:** sendout remaining: 1462, 1470/71/79, 1491-96 (10 ticks).
  menu-throw's 8 ticks: §7.26 disproved the order hypothesis; icon
  fade/exit timing is the standing lead.

---

## 109 — Bounded worker: player healthbox slide-in implemented, RAM-exact and region-isolated 0-diff — but found + corrected a wrong settle-tick pin (real settle 1702, not 1693/1696) and the assigned full-frame trace-closure acceptance criterion is BLOCKED by a separate, pre-existing, already-named ONIX materialize-tail gap (new ISSUES #17)

- **State:** `npm test` **530/530** (+8 Tier-1), `npm run build` green, tree
  clean. Full 22-trace sweep against the live oracle: every trace at #108's
  exact counts (accept-prebattle 137/137, anchor 1/1, confirm-decline
  67/67, confirm-flow 79/95, draft-cursor 13/13, draft-menu-slot6 66/66,
  draft-menu 38/38, example 4/4, menu-materialize **12/12** (unchanged,
  deliberately not widened - see below), menu-text 18/18, menu-throw 70/70,
  rent-3picks 157/190, rent-slot1 125/139, room-entry 110/110, room-msgbox
  142/142, room-npcs 98/98, scene-assembly 256/256, sendout 246/256,
  summary-info-magby 132/132, summary-info-onix 122/122, transition
  206/206, walk-warpout 125/125) — zero regressions.
- **Did:** implemented the PLAYER healthbox slide-in end-to-end:
  RAM-probed `gSprites[0]` directly (`tools/probe/specs/menu-player-
  healthbox.json`, new) rather than pixel-fitting — `x2` starts **110** at
  RAM tick 1666, steps **-5/RAM-tick**, settles **0** at RAM tick 1688;
  `oam.priority` reads **1**. With this window's established +1 render lag,
  the box is first visible at trace tick **1667** (`dx=110`), settles
  (`dx=0`) at **1689**, holds through at least 1741. Pixel-harvested the
  settled content (`extract-menu-healthbox-player.ts` → new
  `src/assets/gen/menu-healthbox-player.json`, bbox `(127,74)-(229,109)`,
  103×36) from `battle1-menu-dense.json`'s own tick 1730, built the
  content mask up front (§7.23's lesson, not discovered after the fact) —
  `getMenuHealthboxPlayerContentMask`/`drawMenuHealthboxPlayer`,
  `battleScene.ts`, wired into `drawSendOutHandoff`. **No spatial overlap
  with ONIX found** (pixel-checked directly) — the brief's own working
  assumption that this window needs #108's SortSprites z-order model was
  disproved for this specific mechanism; no such code was added. Verified
  the mechanism in total isolation: comparing just the healthbox's own bbox
  region against the oracle across ticks 1653-1711 gives **0px diff at
  every tick**, slide and settled alike. 8 new Tier-1 tests
  (`tests/battleMenu.test.ts`) pin the RAM-derived table, geometry, and two
  oracle-pinned pixel samples.
- **Found and corrected a pre-existing wrong pin**: the brief's own
  "scene settles at pinned tick 1693" (inherited from
  `docs/battle-menu-notes.md` §1) is **wrong** — re-verified via two fresh
  `bin/oracle run` replays (byte-identical) plus an independent cross-check
  against `battle1-intro.json`'s identical script: the real, permanent
  static hold starts at trace tick **1702**; ticks 1693-1701 oscillate
  (tick 1693 and 1700 share an identical sha, a 7-tick round-trip) rather
  than settling cleanly. Corrected in `docs/battle-menu-notes.md` §1/§3a.
- **Why the trace can't close (not this session's mechanism, not
  introduced this session)**: every tick from ~1664 onward already has a
  full-frame mismatch regardless of the healthbox, because nothing draws
  ONIX at all past `PLAYER_MATERIALIZE_END_TICK` (1663) — the
  "coefficient-fade-to-true-color... entangled with idle-bob" gap §3 item 5
  already named and deliberately deferred is real, not a formality
  (empirically re-checked: best-candidate plain-sprite tick still
  mismatches by 632px in isolation, no clean single tick closes it) — plus
  a small ONIX-owned ground-shadow triangle tied to the same tail. Filed as
  **ISSUES #17** with RAM-probe leads (`gPaletteFade`, ONIX's own
  `gSprites[6]`) for a future session. Per this run's own harvest-first
  precedent (`sendout.json` held a fixed score across several sessions
  while solved piece by piece), `menu-materialize.json` stays unwidened
  past 1663 (still 12/12, zero regression) rather than widened with
  captures that would fail on a mechanism this step doesn't own; a sibling
  `menu-healthbox.json` trace was considered and rejected for the same
  reason (every candidate tick already fails full-frame on the ONIX gap
  alone, independent of the healthbox).
- **Next:** ISSUES #17 (ONIX materialize-tail: palette-fade + settle
  wobble) is now the hard blocker for closing any menu-window trace past
  1663 — RAM-probe `gPaletteFade`/ONIX's own sprite fields per #17's own
  leads before attempting a pixel-fit. Once closed, revisit whether
  `menu-materialize.json` should widen all the way to 1702+ or a new
  trace should own the healthbox+ONIX-settled window. Menu draw/idle slice
  is the concurrent worktree lane's (separate docs file, not touched here).
- **Notes:** stayed within `battleMenu.ts`/`battleScene.ts` additive hooks
  + `tests/battleMenu.test.ts` + `docs/battle-menu-notes.md`/`ISSUES.md`,
  per the brief. New committed artifacts: `tools/extract/extract-menu-
  healthbox-player.ts`, `src/assets/gen/menu-healthbox-player.json`,
  `tools/probe/specs/menu-player-healthbox.json`. Did not touch
  `battleScene.ts` opponent-side internals, `sendout.json`, or the
  1694-1741 static hold/1742+ menu draw (out of scope, worktree lane's).
  No PAPERCUT beyond time spent re-verifying a wrong inherited pin (~15min)
  — flagging as a process note, not a tooling papercut: coarse-derived
  tick pins in this codebase's docs should get an independent re-check
  before a brief cites them as a hard acceptance boundary.

---
## 108 — Bounded worker: implemented §7.26's real `SortSprites()` Y-tiebreak for both ball-open particle bursts — `sendout.json` **236/256 → 246/256** (+10, closes 1482-84/1497-98), `menu-materialize.json` widened + **12/12** (closes #105's 1658-1662 too — same family, not the particle-vs-ball fallback)

- **State:** `npm test` **525/525** (+2 Tier-1), `npm run build` green, tree
  clean. Full 22-trace sweep against the live oracle: all others at #107's
  exact counts (accept-prebattle 137/137, anchor 1/1, confirm-decline 67/67,
  confirm-flow 79/95, draft-cursor 13/13, draft-menu-slot6 66/66, draft-menu
  38/38, example 4/4, menu-materialize **12/12**, menu-text 18/18,
  menu-throw 70/70, rent-3picks 157/190, rent-slot1 125/139, room-entry
  110/110, room-msgbox 142/142, room-npcs 98/98, scene-assembly 256/256,
  sendout **246/256**, summary-info-magby 132/132, summary-info-onix
  122/122, transition 206/206, walk-warpout 125/125) — zero regressions.
- **Did:** implemented (not re-derived) §7.26 Finding 2: both
  `drawBallOpenParticles`/`drawPlayerBallOpenParticles` (`battleScene.ts`)
  now build the currently-alive particle list per tick and draw it in
  `sortAliveParticlesByScreenY`'s order — ascending computed screen Y (lowest
  drawn first/background, highest drawn last/on top, matching
  `SortSprites`'s "larger Y wins" rule under a painter's-algorithm draw
  order), tie-broken by descending spawn index (an exact Y tie never
  triggers `SortSprites`'s insertion-sort swap, so original ascending
  creation order survives — the older/lower-index particle keeps the lower
  final OAM index, i.e. must be drawn LAST to render on top) — replacing the
  two previously-separate, opposite-direction static index loops §7.26
  identified as narrow curve-fits of this one real rule. Also source-checked
  (no live probe needed — literal already in `reference/pokeemerald`) the
  ball sprite's own `oam.priority` (`sBallOamData.priority=2`,
  `pokeball.c`) against the particles' (`1`, already RAM-verified in #106):
  since particle priority is strictly lower, particles always beat the ball
  unconditionally — the engine's existing ball-before-particles draw order
  was already GBA-correct, so the "if Finding 2 alone doesn't close #105,
  probe the ball" fallback §7.26 flagged needed zero code change, just the
  two constants pinned as documentation/tests
  (`BALL_OAM_PRIORITY`/`PARTICLE_OAM_PRIORITY`/`PARTICLE_OAM_SUBPRIORITY`).
  Widened `tools/compare/traces/menu-materialize.json`'s `captureFrames` to
  the full contiguous 1652-1663 span (was 7 frames skipping 1658-1662) —
  verified 12/12 on a scratch copy before committing the change to the real
  trace file. `docs/battle-scene-notes.md` §7.27 (full derivation + score
  effect); `docs/battle-menu-notes.md` §3/§7 updated in place (not rewritten)
  with forward-references, matching this run's existing correction style.
- **What's still open in `sendout.json` (10 ticks, confirmed unrelated, not
  assumed out of scope)**: `1462` (trainer-exit-tail/settled-bar gap,
  §7.25), `1470/1471/1479` (icon-row residual, different screen region —
  mismatch pixel sets bit-identical before/after this session's change),
  `1491-1496` (§7.25's own separately-named "materialize tint" family, not
  particle-colored). None are the OAM-priority compositor's territory.
- **Next:** healthbox slide-in (1663-1693, harvest-based per §7.9's
  precedent); menu draw/idle slice (source/RAM dossier already landed, #107);
  menu-throw's own 8 Brendan-vs-icon ticks (§7.26 Finding 1's new lead: the
  icon's own `eva`/`iconExitDx` state, NOT a compositing-order bug — do not
  re-attempt a reorder there); then S6 acceptance end-to-end.
- **Notes:** stayed entirely within `battleScene.ts` particle functions +
  `tests/battleScene.test.ts` + the two named docs files, per the brief.
  Did not touch menu-throw's 8 ticks, healthbox, idle, tick 1462, or
  1470/71/79 (checked unaffected, not skipped blindly). No PAPERCUT this
  session.

---
## 107 — Supervisor: idle/menu-draw dossier branch merged (docs/spec only) — final menu slice (1742-1810) fully unblocked; round-11 = SortSprites implementation SOLO

- **State (verified post-merge):** `npm test` **523/523**, `npm run build`
  green, tree clean. New `docs/battle-menu-idle-notes.md` (+ probe spec
  `menu-idle-bounce.json`): idle cycle SOLVED closed-form
  (`DoBounceEffect` drivers on gSprites[6]/gSprites[0], sine step +=7 mod
  256, +1 render lag — even explains the prior dossier's unattributed
  tick-1813 transient); menu idle is INDEPENDENT of the scene-assembly
  idle (re-derive, don't reuse); atomic menu draw = off-screen draw +
  BG0-scroll reveal after DMA3. Still open there: cursor-tile byte-check,
  the 1742-47 teal-blank's specific source call (pointers named).
- **Next (in order):** (1) SOLO main-lane step NOW: implement §7.26's
  derived SortSprites model (priority → subpriority → per-tick screen-Y
  tiebreak) in drawSendOutHandoff — targets sendout 1482-84/1497-98 and
  menu-materialize 1658-62; menu-throw's 8 ticks are NOT this mechanism
  (§7.26 disproved #96's hypothesis — icon fade/exit timing is the new
  lead, separate step); (2) then parallel: healthbox slide-in 1663-1693
  (harvest-based like §7.9's precedent, assembly stays with ISSUES #16)
  + menu draw/idle slice off the new dossier; (3) S6 acceptance
  end-to-end attempt; wind-down with margin before 07:55.
- **Notes:** two model-falsifications this session (§7.21's shared-root,
  §7.26's creation-order) — both caught by RAM before shipping wrong code.
