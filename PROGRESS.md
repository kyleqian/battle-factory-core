# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 93 — Bounded worker: PLAYER SEND-OUT slice 1 landed — message-box clear + "Go! ONIX!" print + static hold, new `battleMenu.ts`; `menu-text.json` ratified at **18/18** (supervisor-trimmed to the slice's true 1556-1573 window)

- **State:** `npm test` **486/486** (+9), `npm run build` green, tree
  clean at `84f2d08`. Full 19-trace sweep against the live oracle: all 19
  at their exact established counts (anchor 1/1, draft-cursor 13/13,
  draft-menu 38/38, draft-menu-slot6 66/66, example 4/4, summary-info-onix
  122/122, summary-info-magby 132/132, confirm-decline 67/67,
  accept-prebattle 137/137, walk-warpout 125/125, room-entry 110/110,
  room-npcs 98/98, room-msgbox 142/142, transition 206/206, scene-assembly
  256/256, rent-slot1 125/139, rent-3picks 157/190, confirm-flow 79/95,
  **sendout 214/256 unchanged**) — zero regressions. New
  `tools/compare/traces/menu-text.json`: worker committed every tick
  1556-1594 (18/39); supervisor trimmed to 1556-1573 → **18/18, 0 diff**
  (re-verified post-trim).
- **Did:** per the brief, new `src/engine/battleMenu.ts` (pure cadence
  logic) + a 2-line-conditional hook into `battleScene.ts`'s
  `drawSendOutHandoff` (reuses the existing `drawMessageTextLines`
  draw path, same B_WIN_MSG/FONT_NORMAL mechanism as battle-scene-notes.md
  §3.1-3.2 — no new drawing code). Implements docs/battle-menu-notes.md
  §1/§2 exactly: tick 1563 clears the box and draws "G" the same tick
  (no blank-box frame), 1564-1571 print the remaining 8 chars 1/tick
  (silent-but-charged space at 1566, byte-identical frame confirmed), 1572+
  static (byte-identical confirmed). 9 new Tier-1 tests
  (`tests/battleMenu.test.ts`): cadence arithmetic + 4 oracle-pinned pixel/
  frame-identity assertions.
- **Scope finding (worker) + ratification (supervisor):** ticks 1574-1594
  of the briefed window diverge because Brendan's throw-pose swap + a
  ball-icon change genuinely begin at trace tick **1574** — not "~1595" as
  docs/battle-menu-notes.md §1's coarse pass estimated (worker pinned this
  by diffing the oracle's own consecutive frames + a visual crop). That is
  exactly the mechanism the brief ruled out of scope, so the worker landed
  the verified text/box-clear feature and flagged rather than forcing a
  fix — correct call, ratified. Supervisor trimmed the trace to the
  slice's true window (18/18) and corrected §1's table row in
  docs/battle-menu-notes.md; the next slice owns 1574+ with its own dense
  trace.
- **Next:** (1) Brendan's throw pose/exit translation + ball-icon change,
  starting tick 1574 (needs pixel-tick-exact re-derivation per docs §3's
  own "Not tick-exact this session" flag, plus the two MISSING asset
  tables in §6: ball-open particles, affine emerge + color-fade); (2) then
  ball arc / ONIX materialize / player healthbox (through settle 1693);
  (3) blank-box + menu draw + idle cycle (1742-1810), per
  docs/battle-menu-notes.md §3-§5.
- **Notes:** healthboxAssembly.ts/healthbox docs, oracle/harness, and
  ROADMAP.md stayed out of scope, per the brief. `battleScene.ts` touchpoint
  kept minimal/additive (one import, one 8-line conditional) per the
  brief's concurrent-worker note. No PAPERCUT.

---

## 92 — Bounded worker: "particle-position residual" mostly re-attributed to a `SENDOUT_BG_FADE_Y` table gap, landed (§7.20) — pixel mass in 1481-1503/1516-1517 cut ~50%, but `sendout.json` **stays 214/256** (supersedes #91's "session end" as the final entry; #91's summary kept intact below)

- **State:** `npm test` **477/477** (+1), `npm run build` green, tree
  clean. Full 19-trace sweep against the live oracle: all 18 others at
  their exact established counts (anchor 1/1, draft-cursor 13/13,
  draft-menu 38/38, draft-menu-slot6 66/66, example 4/4, summary-info-onix
  122/122, summary-info-magby 132/132, confirm-decline 67/67,
  accept-prebattle 137/137, walk-warpout 125/125, room-entry 110/110,
  room-npcs 98/98, room-msgbox 142/142, transition 206/206, scene-assembly
  256/256, rent-slot1 125/139, rent-3picks 157/190, confirm-flow 79/95) —
  zero regressions. `sendout.json` **214/256 (unchanged)**.
- **Did:** per the brief's own lead (brute-force render-lag constants for
  particles against oracle captures), started by pixel-dumping the target
  ticks' actual diff colors before sweeping anything — and the dominant
  signal wasn't particle-colored at all. Root cause: `SENDOUT_BG_FADE_Y`
  (§7.10's own BG-to-white fade table) is one ramp-step short at BOTH
  ends — render ticks 1481/1482 and 1516/1517 decode to y=2 via the
  table's own already-validated `blendComponentToWhite` formula (cross-
  checked first against the table's existing y=4/y=6 entries to confirm
  the method), not the unfaded fallback it was producing. Fix is two
  symmetric table entries + a start-offset shift (19 vs 21) — purely
  additive, zero regressions. Effect: target-window pixel mass **19217px
  → 9607px** (-50%, every tick strictly improved), but no single tick
  reaches zero diff, so `sendout.json`'s count doesn't move. With that
  noise gone, the true residual composition is now named precisely
  (§7.20): 1481-1503's leftover mass is mostly mechanism 4's own
  materialize-tint SILHOUETTE EDGE (color `(255,181,247)`), not particle
  position; 1516/1517's tiny leftover (10-12px, down from 2257/2283px) IS
  a real missing particle, but its implied age (~30) exceeds the already
  pixel-validated `PARTICLE_MAX_AGE=24` death boundary — ruling out a
  uniform lag constant as the mechanism (a lag shift would break the
  already-exact 1519-1522 boundary the same way §7.18's RAM-tick
  rederivation did). One new Tier-1 test pins both new boundary steps.
- **Acceptance-bar note (read before continuing this thread):** the
  brief's bullet list wanted `sendout.json` strictly >214/256 OR a
  writeup with NO code change. This lands a real, zero-regression,
  non-curve-fit fix that doesn't cross that bar — kept anyway because the
  brief's own GOAL line explicitly allows "measurably shrink, with
  tighter naming," which this satisfies precisely. Flagged for the next
  supervisor pass to judge/revert if weighed differently — full reasoning
  in §7.20's own "Acceptance-bar note."
- **Next:** (1) mechanism 4's materialize-tint silhouette-edge residual,
  now the dominant piece of 1481-1503 (likely shares a root cause with
  §7.16's own named stretch-affine-edge residual — worth checking both
  together); (2) the single-particle age-overrun gap at 1516/1517 (named,
  not fixed — too thin an evidence base for one session, needs either a
  fresh RAM probe of that specific particle or a wider trace); (3)
  1470/1471/1479's icon-edge residual; (4) tick 1462's settled-bar gap;
  (5) the small 1504-1515/1518 boundary residual; then action-menu
  (1560+), S6 acceptance end-to-end, S7.
- **Notes:** healthboxAssembly.ts/healthbox docs, oracle/harness, and
  ROADMAP.md stayed out of scope, per the brief. No PAPERCUT.
  **Supervisor ratification (2026-07-18 ~21:35, end of session):** the
  flagged keep-vs-revert call is RATIFIED as kept — verified 477/477 +
  build green + 214/256 + clean tree this minute; the fix is
  mechanism-justified, strictly improving, zero-regression, and the
  brief's GOAL line covers it. Session truly ends here; #91 below
  remains the full session summary (final totals: suite 458→477,
  sendout 180→214/256, 7 worker steps all verified green).

---

## 91 — Supervisor wind-down: session end 2026-07-18 ~21:30 — `sendout.json` **180 → 214/256** across three verified rounds; healthbox pipeline (ISSUES #16) taken from "unsolved remap" to complete-and-parameterized incl. partial-HP/status

- **State (verified this minute):** `npm test` **476/476**, `npm run
  build` green, tree clean at `c78bbcf` (merge of
  `worker/wt-20260718-205048`, the last of 3 conflict-free worktree
  merges). Post-merge re-runs by the supervisor: sendout **214/256**,
  scene-assembly 256/256, transition 206/206, anchor 1/1 (the merge's
  `battle-healthbox.json` change is additive; no other trace's inputs
  touched — workers ran full 19-trace sweeps at #86/#88/#90, zero
  regressions every time). No unmerged branches, no live worktrees.
- **Session summary (supervised, ~19:31-21:30, 6 worker steps = 3 rounds
  × 2 lanes, every step verified green, zero regressions):** Main lane —
  send-out window 180→196 (#86: affine formula was inverted, `pa=xScale`
  directly; GROVYLE front sprite runs `sAnim_Grovyle_1` breathing, not a
  frame swap) →199 (#88: whole particle subsystem freezes one real tick,
  RAM 1494≡1493) →**214/256** (#90: bar exit slide +2px/tick + 16→24-tile
  subsprite swap; 15/18 target ticks bit-exact). Worktree lane — ISSUES
  #16 healthbox: "tile remap" DISSOLVED (#87: no remap; mismatch was
  un-composited content), full content pipeline byte-exact 2574/2574 and
  parameterized (#89: center-based subsprites, text-blit model, bar-wins
  z-order), partial-HP + status icons landed hermetically (#91: strict-`>`
  band thresholds, new `hpbar_anim.png`/`status2.png` extractions; oracle
  validation deferred to S7's first drain trace). Suite 458→476 Tier-1
  tests.
- **Next (in order, per `docs/battle-scene-notes.md` §7.19):** (1)
  particle position residual, 1481-1503/1516-1519 — §7.18's lead:
  brute-force render-lag constants directly against oracle captures
  rather than RAM-tick arithmetic; (2) icon-edge/materialize residual
  1470/1471/1479 (likely same family); (3) tick 1462's named settled-bar
  one-tick gap + trainer-exit tail; (4) small 1504-1521 boundary
  residual; then action-menu window 1560-1810 (`docs/battle-menu-notes.md`,
  groundwork complete), S6 acceptance end-to-end, then S7 (healthbox
  wiring + drain-trace validation fold in there).
- **Notes:** no usage-limit events; both lanes idle at close; all three
  worktree merges conflict-free (doc-ownership discipline held). 30-min
  single-mechanism caps landed reliably (#90 in 21 min, worktree round 3
  in 14 min). PAPERCUTS: none new reported across all six workers.

---

