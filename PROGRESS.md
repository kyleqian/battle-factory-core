# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---

## 106 — Bounded worker: derived the REAL `SortSprites()` OAM-priority model (source+RAM verified) for #96's compositor — disproved PROGRESS #96's Brendan-vs-icon hypothesis, gave the particle z-order family (§7.25) a concrete non-guessed mechanism; no code landed (documentation-only session, ran out of RAM-probe budget before implementing)

- **State:** `npm test` **523/523**, `npm run build` green, tree clean —
  unchanged from #105 (no engine code touched this session). Full sweep not
  re-run (nothing could have regressed; docs/probe-spec only diff).
- **Did:** read `reference/pokeemerald/src/sprite.c`'s actual
  `BuildOamBuffer`/`BuildSpritePriorities`/`SortSprites`/
  `AddSpritesToOamBuffer` chain to derive the REAL compositor rule the
  brief's own model paragraph undersold: pokeemerald sorts sprites into the
  hardware OAM buffer by an insertion sort keyed on `subpriority |
  (oam.priority<<8)` ascending, tie-broken by current unwrapped screen `y`
  descending — NOT by creation order/array index. RAM-probed
  (`tools/probe/specs/menu-throw-oam-priority.json`, new, committed) +
  source-cross-checked (`battle_controller_player.c:2381`,
  `battle_interface.c:678-693/1511`) the two sprites behind PROGRESS #96's
  named 8-tick Brendan-vs-icon blocker: Brendan is `oam.priority=2`, every
  player status icon is `oam.priority=1` — different `oam.priority` means
  the pair never reaches subpriority/OAM-slot/creation-order at all; the
  icon ALWAYS wins, unconditionally, exactly matching what the engine's
  current draw order already does. **#96's "Brendan wins by creation
  order" hypothesis is disproved** — the 8-tick residual is real but is NOT
  a compositing-order bug (root cause still open, new hypothesis: icon's
  own `eva`/`iconExitDx` state, not sprite ordering). Separately,
  source-traced `AnimateBallOpenParticles` (`battle_anim_throw.c:1577`,
  called from `pokeball.c:441`/`757`): every particle in one send-out burst
  shares the exact SAME literal `priority=1, subpriority=28` — so
  same-burst particle overlaps (§7.25's sendout 1482-84/1497-98, likely
  #105's menu-materialize 1658-1662) are resolved ENTIRELY by the Y
  tie-break, recomputed per-tick as each particle's radial position moves —
  not by spawn index (explains why §7.25's static descending-spawn-index
  reorder regressed elsewhere: spawn index is only a coincidental Y proxy,
  since `angle=(i%8)*32` isn't monotonic in age). Full derivation + source
  citations: `docs/battle-scene-notes.md` §7.26. Corrected (not rewrote)
  `docs/battle-menu-notes.md` §3 item 4b's disproved claim with a
  forward-reference.
- **Next:** implement the per-tick Y-sort in `drawBallOpenParticles`/
  `drawPlayerBallOpenParticles` (replace the static ascending/descending
  index loops), verify against `sendout.json` (>236/256) and
  `menu-materialize.json` (12/12 through 1662) with a full 22-trace
  zero-regression sweep; if #105's own 1658-1662 doesn't close from that
  alone (it's particle-vs-BALL, not particle-vs-particle), RAM-probe the
  ball sprite's own `oam.priority`/`subpriority` next (same probe pattern).
  Menu-throw's 8 ticks need fresh investigation along the new eva/
  iconExitDx hypothesis, not a reorder. Then healthbox slide-in, menu draw
  + idle, S6 acceptance.
- **Notes:** this step's brief asked for a full OAM-priority compositor
  rewrite of `drawSendOutHandoff`; the real `SortSprites` model (above)
  turned out to require RAM-probing each relevant sprite PAIR individually
  (not a one-shot "enumerate all slots" table) — only got through one pair
  (Brendan/icon) plus one source-only derivation (particles) before the
  cap. Per the brief's own explicit fallback ("if the full model can't land
  green in-cap... document the rest"), landed research only — a code
  change here without time to verify the 22-trace sweep would have violated
  the brief's own "any regression = stop and bisect" discipline. New
  committed artifact: `tools/probe/specs/menu-throw-oam-priority.json`. No
  PAPERCUT beyond what's already named (dump-task-and-sprite-callbacks.py's
  symbol resolution still requires a separate offline `nm` step, as its own
  docstring already says).

---

## 105 — Bounded worker: applied #104's opponent-side `open.png`/openFinal discovery to the PLAYER ball window — `menu-materialize.json` **6/6 → 7/7** (+1657, contiguous 1652-1657); 1658-1662 residual re-scoped to the already-named particle z-order family

- **State:** `npm test` **523/523** (+2 Tier-1), `npm run build` green, tree
  clean. Full 22-trace sweep against the live oracle: all others at their
  exact #104 counts (accept-prebattle 137/137, anchor 1/1, confirm-decline
  67/67, confirm-flow 79/95, draft-cursor 13/13, draft-menu-slot6 66/66,
  draft-menu 38/38, example 4/4, menu-materialize **7/7**, menu-text 18/18,
  menu-throw 70/70, rent-3picks 157/190, rent-slot1 125/139, room-entry
  110/110, room-msgbox 142/142, room-npcs 98/98, scene-assembly 256/256,
  sendout 236/256, summary-info-magby 132/132, summary-info-onix 122/122,
  transition 206/206, walk-warpout 125/125) — zero regressions.
- **Did:** per #104's own "Next" hypothesis, confirmed §7.25's opponent-side
  `LoadBallGfx` discovery (`pokeball.c:1308-1332` unconditionally DMAs
  `graphics/balls/open.png` over `sBallAnimSeq1`'s nominally-blank
  `ANIMCMD_FRAME(8,5)` slot) is battler-generic, not opponent-only. RAM-probed
  the player ball sprite directly (`tools/probe/specs/menu-player-
  materialize.json`, `gSprites[5]`): `animCmdIndex` flips 0→1 at RAM 1656
  (right after the open pose's own 5-tick hold), holds 5 more ticks
  (`ANIMCMD_FRAME(8,5)`'s own duration), `animEnded` sets at RAM 1661 - with
  the established +1 render lag, openFinal is visible at renders 1657-1662.
  A/B'd against fresh oracle captures BEFORE touching code
  (`tools/compare/scratch/menu-audit/classify_1657_1663.mjs`): tick 1657's
  entire 19px residual is an exact match to openFinal's own tile content
  (19/19), and most of 1658-1662's own residual too (17/19, 20/26, 26/30,
  19/21, 14/16); tick 1663 confirmed NOT part of the window (ball already
  invisible there, oracle-checked directly). Landed: `PLAYER_BALL_OPEN_
  FINAL_END_TICK` (1662, `battleMenu.ts`), widened `playerBallOpenTopLeft`'s
  range to it, `drawPlayerBallOpen` (`battleScene.ts`) now switches tile-row
  offset (0↔2) at `PLAYER_BALL_OPEN_END_TICK`, reusing the SAME extracted
  `battleAnimBallOpen` tileset the opponent's own `BALL_OPEN_FINAL_TILESET`
  already selects. `menu-materialize.json`: **6/6 → 7/7** (tick 1657 exact;
  1652-1657 now contiguous, +1663 non-contiguous past it).
- **What's left (1658-1662, small residual, re-scoped not solved)**: 2-6px
  per tick, pixel-classified as particle-position pixels (oracle color
  `255,173,0`, the known particle-burst color, not in the ball-open palette)
  — the same particle-vs-ball z-order family §7.25 already named and left
  open for the OPPONENT's own send-out (1482-1490/1497-1498), now confirmed
  to have a player-side twin. Not chased this session (§7.25's own "tried
  and reverted" note already warns a naive spawn-index reorder regresses
  elsewhere without real OAM-slot RAM evidence) — belongs with the OAM-
  priority compositor (#96), not a curve-fit on either side alone.
- **Next:** the OAM-priority compositor (#96, solo) — three residual
  families now converge on it: this session's 1658-1662, §7.25's
  1482-84/1491-98, and menu-throw's own 8 Brendan-vs-icon ticks; then
  healthbox slide-in, menu draw + idle (§4/§5, concurrent worktree lane),
  S6 acceptance end-to-end.
- **Notes:** stayed in `battleMenu.ts`/`battleScene.ts` player-side
  functions + `tests/battleMenu.test.ts` + `docs/battle-menu-notes.md` §3,
  per the brief. Did not touch §4/§5, `battleScene.ts` opponent-side
  internals, `tests/battleScene.test.ts`, or `sendout.json`. New committed
  artifact: `tools/compare/scratch/menu-audit/classify_1657_1663.mjs`.

---
