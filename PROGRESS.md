# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

## 104 — Supervisor: round-8 worktree branch merged — sendout ball's REAL 3rd frame found (`open.png`, runtime VRAM overwrite; never previously extracted) — 1485-1490 pixel mass -95-97%, `sendout.json` holds 236/256 behind a narrow z-order residual

- **State (verified post-merge):** `npm test` **521/521**, `npm run build`
  green, tree clean. sendout 236/256, scene-assembly 256/256,
  menu-materialize 6/6, menu-throw 70/70. Worktree removed, branch deleted.
- **Did:** merged `worker/wt-20260719-023340` (conflict-free): the
  1485-1495 span's dominant residual was the ball sprite rendered as
  nothing — `LoadBallGfx` (pokeball.c:1308-1332) unconditionally DMAs
  `graphics/balls/open.png` (a separate, never-extracted file) over the
  blank `ANIMCMD_FRAME(8,5)` tile range at ball creation; extractor now
  pulls it as `battle-anim-ball-open.json`'s `openFinal`; `drawSendOutBall`
  gained a 3rd branch; `BALL_INVISIBLE_START_OFFSET` 23→29 (RAM). Score
  gated at 236/256 by a 2-7px pre-existing particle z-order residual
  (1482-84/1497-98) — worker tried the naive OAM reorder (+4/-2), reverted
  it correctly; §7.25 documents both plus the untouched 1491-95
  sub-residual. Extractor landmine (grovyleFrontAnim silently dropped on
  re-run) caught pre-commit; PAPERCUTS.md updated.
- **Next:** (1) main lane — apply `openFinal` to the PLAYER ball window
  (the 1657-62 residual #103 narrowed to ball-palette pixels is very
  likely this same missing frame, shared `LoadBallGfx` path); (2) worktree
  — §4 idle-cycle + §5 menu-draw source attribution dossier (unblocks the
  last menu slice); (3) then the OAM-priority compositor SOLO (three
  residual families now converge on it: 1482-84/1497-98, menu-throw's 8
  ticks, likely 1470/71/79); (4) healthbox slide-in; (5) menu draw + idle;
  (6) S6 acceptance end-to-end.
- **Notes:** sendout remaining named: 1462, 1470/71/79, 1482-84/1491-98
  region (z-order + small sub-residual). Two lanes independently converged
  on the same missing ball frame from opposite sides this round.

---
