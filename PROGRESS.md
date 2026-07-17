# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 19 — S5 slice 2 (worker, capped): STOPPED before writing rent-3picks.json — found a real, RAM-confirmed multi-ball throttling effect that breaks the "fully independent per-ball RNG" assumption; species-name-breathe rule fully pinned instead (no code changes this session)

- **State:** unchanged from entry 18 — `npm test` **203/203**, `npm run
  build` green, all 7 traces at their prior counts (`rent-slot1.json` still
  125/139, untouched). **No `src/`/`tests/` changes**: the investigation
  below found a real modeling gap that blocks building `rent-3picks.json`
  correctly, so nothing was written that would need reverting. This is a
  "stop and report precisely" session per the brief's own contingency.
- **Did (species-name breathe — fully resolved, no code needed):** Read
  `Select_Task_FadeSpeciesName`/`fadeSpeciesNameActive` (`battle_factory_screen.c:2277-2330`,
  set at :1611/:1636/:1682/:1689/:1714/:1556/:1567) and confirmed with 3
  oracle probes: the fade coefficient only advances while
  `fadeSpeciesNameActive` is true, which is **exactly `mode === "cursor"`
  (no popup open)** — opening a ball's popup (A-press tick) freezes it
  instantly, closing it (B/OTHERS/RENT-continue tick) resumes it, and
  **the underlying counters are never reset, only paused** (probe: idle 95
  active ticks → open popup → sit 100+ ticks inside it, zero pixel diffs the
  entire time → close popup → breathe resumes and trips within ~10 ticks,
  not a fresh ~105-tick cycle). Pure-idle-from-anchor threshold measured
  exactly: **first visible pixel diff at tick 105**, repeating every 7
  ticks thereafter. Rule for future trace-building: sum only the
  cursor-mode (no-popup) ticks since screen init; keep that cumulative sum
  under 105 and the breathe never becomes visible — no engine model needed.
- **Did (multi-ball RNG — blocked, real finding):** `core.ts`'s tick() loop
  already iterates all 6 `ballAnims` slots unconditionally in slot order
  every tick (written in slice 1) — structurally already "N-ball capable"
  and was assumed independent per dossier Risk 2. RAM-verified this
  assumption directly: dumped `gSprites[ballSpriteId]`'s `data[0]`/`animNum`/
  `animEnded` + `gRngValue` tick-by-tick for (a) a single rented ball idling
  220 ticks, vs (b) the same ball PLUS a second ball rented via a RIGHT +
  open-popup + DOWN + RENT-confirm sequence inserted while the first ball's
  128-tick "moving" cycle is in flight. **Result: ball 0's own moving-cycle
  completion (the `animEnded` flip) lands at tick 168 in scenario (a) but
  tick 170 in scenario (b) — a reproducible 2-tick delay**, which cascades
  into its resting countdown and next roll (tick 201 vs tick 203). This
  directly contradicts `SpriteCB_Pokeball`'s own source reading (`data[0]`
  is plainly per-sprite with no shared state) and the module comment in
  `ballAnim.ts` — yet the RAM shows a real divergence correlated with the
  second ball's own popup open/close (2 mon-pic transitions ≈ 2 stalled
  ticks for the *other* ball; not yet proven to be exactly 1 tick/transition,
  only observed as a net +2 over that window). Cross-checked the JS engine
  against the single-ball probe (exact match) and the two-ball probe
  (5 tick-level RNG-value mismatches, all clustered exactly at the two
  delayed transitions) via a throwaway node harness — confirms this is a
  gap in the model, not a probe artifact.
- **Next:** Do **not** attempt `rent-3picks.json` (or extend `ballAnim.ts`
  to N balls) until this throttling mechanism is identified precisely —
  building the trace now would either desync RNG-dependent state silently
  or require guessing at the mechanism, which risks landing something that
  merely *looks* pixel-clean at sparse sample points. Concrete next step for
  whoever picks this up: read `OpenMonPic`/`CloseMonPic` (battle_factory_screen.c,
  the mon-pic-bg palette/tile setup they do) for anything that could cost
  *other* sprites' `AnimateSprites()` a frame — e.g. a blocking VRAM/tile
  allocation call — then RAM-confirm with a probe that inserts exactly ONE
  mon-pic open (no close) vs one open+close to see if the delay is
  per-transition (1 tick each) or a flat per-popup-session cost. ISSUES.md
  #6 has the full data (probe scripts summarized, not committed per
  instructions — recipe is `tools/extract/inspect-anchor.py`'s pattern
  adapted to read `gSprites[]`/`gRngValue` on a custom button script; scratch
  files lived under `/tmp`, not committed).
- **Notes:** Work items 3-4 from the brief (jitter-clean close-window
  probing, the committed `rent-3picks.json` trace) were not reached — they
  depend on item 1 (multi-ball RNG) being solid first, since the trace's
  own churn windows would otherwise assert against an unverified RNG
  stream. PAPERCUT: none beyond the usual RAM-probe/oracle round-trip
  overhead (~3-5s/probe × ~6 probes this session, not a blocker).

---

## 18 — ISSUES #5 root-caused via direct RAM/IO inspection: confirmed genuine GBA cycle-timing jitter, NOT fixable at this engine's tick/state level — no code change, rent-slot1.json stays 125/139

- **State:** unchanged from entry 17 — `npm test` **203/203**, `npm run
  build` green, all 6 pre-existing traces still 0 diff. `rent-slot1.json`
  still **125/139** (not re-timed, not touched — trace file has zero diff
  from what entry 17 committed). No `src/` changes this session: the
  investigation conclusively found there is nothing at this engine's
  modeling granularity left to fix (see below), so no code was written.
- **Did:** Followed the assigned method exactly — read
  `battle_factory_screen.c`'s mon-pic construction (`Task_CloseMonPic`,
  `SpriteCB_*MonPic`, the `sSpriteTemplate_*_MonPicBgAnim` affine sprite),
  then did dense dev-time RAM/IO inspection (scratch scripts using
  `EmeraldOracle.core.memory.u16[...]`, not committed) of `WIN0V`,
  `BLDCNT`/`BLDALPHA`/`BLDY`, `BG3HOFS/VOFS`, the mon-pic-bg palette, and
  `gTasks[]`'s raw state (`0x03005E00`, struct layout from `task.h`) across
  a clean close (press-tick 30) and a bad one (press-tick 36), then swept
  press-tick 20-60 to map the WIN0V sequence exactly. Traced the divergence
  all the way to its true source: `Task_CloseMonPic`'s internal
  `tWinTop`/`tWinBottom` state is **provably clean** (identical, purely
  time-shifted, between the clean and bad runs) — the bug is entirely in
  *when the already-correct value becomes visible*, via GBA's real
  `SetGpuReg` double-buffer (`gpu_regs.c:66-98`): writes queue for the next
  vblank flush unless `REG_VCOUNT` has already crossed into vblank at the
  exact moment `SetGpuReg` executes, which depends on the total CPU cycle
  cost of everything else that ran earlier that frame. Proved this isn't
  reducible to any state this engine tracks: replaying `rent-slot1.json`
  with 0/3/7/10/17 idle frames prepended (preserving every *relative*
  timing this engine models, shifting only absolute session tick) produces
  a **different** catch-up pattern each time — conclusive evidence the
  jitter depends on absolute emulated-cycle count, not on open-variant,
  dwell time, or RENT-flow-local state. Full writeup with file:line
  references, the ruled-out leads (monPicBg static palette confirmed
  unchanged — the earlier "shimmer" suspicion was wrong; task-list
  insertion order confirmed identical between clean/bad — not a
  scheduling-order bug either), and the remaining options is in ISSUES #5
  (kept open, not deleted, per the brief's stop condition).
- **Next:** This exact acceptance criterion (`rent-slot1.json` 0/139
  *without* re-timing) cannot be met without cycle-accurate CPU emulation,
  which is out of scope for this engine's architecture. A future
  supervisor decision is needed on ISSUES #5's two remaining options
  (re-time the RENT-confirm press to a trace-specific clean tick, or accept
  125/139 permanently with the gap documented as attributable to this
  issue) — do not re-attempt a "general fix" without new information (e.g.
  a way to cheaply approximate per-frame cycle cost) that changes the
  tractability conclusion above.
- **Supervisor addendum (same day):** S6 scout dossier merged
  (`docs/battle-bringup-notes.md`, 595 lines; ROADMAP S6 corrections
  folded in: RNG advances per-VBlank until battle proper, transition is a
  random 12-way pick, opponent personalities rolled at battle start;
  battle-1 identities RAM-pinned: trainer 50 DESTIN, Grovyle/Murkrow/
  Pidgeotto vs Onix/Magby/Bayleef). 203/203 + build green post-merge.
  **ISSUES #5 policy question escalated to the user** (0-diff bar vs
  cycle-jitter windows — see the ISSUES entry for the two options);
  battle-1 asset extraction in flight on the worktree lane.
- **Notes:** No commit was needed for `src/`/`tests/` (nothing changed);
  this commit is docs-only (`ISSUES.md` rewritten with the confirmed root
  cause, this entry). Time was spent entirely on RAM-inspection
  investigation per the brief's explicit method — the conclusion is a
  negative result (root cause found, fix infeasible at this level), which
  the brief anticipated as an acceptable outcome ("stop and report
  precisely").

---

## 17 — S5 slice 1 (worker, capped): RENT/DESELECT + ball-rock RNG stream implemented and RAM-verified; pixel trace 125/139 — blocked short of 0 diff by a newly-found pre-existing rendering bug (ISSUES #5), not by anything in this slice's own code

- **State:** `npm test` **173/173** (159→173, +14 new), `npm run build`
  green. All 6 pre-existing traces re-verified 0 diff (`anchor` 1/1,
  `draft-cursor` 13/13, `draft-menu` 38/38, `draft-menu-slot6` 66/66,
  `summary-info-onix` 122/122, `summary-info-magby` 132/132) — **no
  regressions**. New `tools/compare/traces/rent-slot1.json` (dense,
  every-frame, popup-open → RENT confirm → 100-tick dwell) → **125/139
  matched, NOT 0 diff** (see Notes — acceptance criterion not met this
  session). New Tier-1 tests **are** fully green and RAM-verified:
  `tests/rentSelect.test.ts` (9 tests, state machine + renumbering) and
  `tests/ballAnim.test.ts` (5 tests, engine `rngValue` pinned against
  RAM-dumped `gRngValue` at frames 0/36/37/39/201 — includes both a
  SUCCESS and a FAILURE roll).
- **Did:** Implemented `src/engine/ballAnim.ts` (new — the
  `SpriteCB_Pokeball` idle/rock state machine + RNG roll, RAM-verified
  timings: first roll-eligibility lands 2 ticks after selection, a 17-step
  Moving cmd table matching `sAnim_Select_Pokeball_Moving` exactly, a
  32-tick rest after a successful roll, immediate reroll after a failed
  one; a `displayTile`/`pendingDisplayTile` 2-stage shift register
  reproduces an oracle-verified 2-tick render lag between the internal
  state transition and the visible tile, kept structurally separate from
  the RNG-critical internal timing). Wired RNG into `EngineState`
  (`rngValue`, seeded `ANCHOR_RNG_VALUE`, advances once/tick unconditionally
  per `main.c:366`, ball rolls consume a *second* step the same tick,
  RAM-confirmed ordering: standard tick first, roll second). Implemented
  RENT/DESELECT in `factoryDraftScreen.ts` (`applySelect`/`applyDeselect`
  pure reducers, the renumbering special case, `selectMonMessage`,
  context-sensitive row-1 label) and wired the confirm path into
  `core.ts`'s `tick()`. Found and fixed two real render bugs along the way:
  (1) the info-window message and popup label lag the palette swap by 2
  ticks (`RentConfirmRedrawState`, same redraw-scheduling pattern as
  `CursorRedrawState`); (2) `monPicRender.ts`'s `ballColor()` helper (used
  for the mon-pic window's blend target2 source) was hardcoded to the gray
  palette/tile 0 for *every* ball regardless of selection state — fixed via
  a shared `ballVisuals()`/`BallVisual` threaded into both `drawMonPic` and
  the OBJ ball loop so they can't drift apart again.
- **Next:** ISSUES #5 (a pre-existing, RENT-independent mon-pic-close
  rendering bug, confirmed via a bare `A`+`B` reproduction with zero RENT
  code involved) is what's between this trace and 0 diff — see that entry
  for the full probe log and a lead (likely an un-modeled palette-cycle/
  shimmer in `monPicBg`). A future slice should either root-cause it
  directly, or re-time `rent-slot1.json`'s RENT-confirm press to land in a
  confirmed-clean window once the periodic pattern is pinned precisely
  enough to predict one reliably (trial-and-error this session found good
  windows at ~31 and ~47+ ticks after open, but shifting into the second one
  just moved a *different* set of diffs into frames outside this trace's
  species-name-breathe budget — see Notes).
- **Supervisor addendum (same day):** verified independently (tests,
  build, 125/139 + no regressions reproduced). Both parallel-lane
  extraction branches merged on top: moves/exp/items data (19 tests) and
  the pre-battle-room scene incl. `docs/prebattle-room-notes.md`
  (11 tests, composite-verified 0/38400 px vs oracle) — `npm test` now
  **203/203**, build green, worktrees cleaned up. ROADMAP S5 marked [~]
  with slice-1 note. Next: root-cause ISSUES #5 (main lane); S6 scout
  dossier in flight on the worktree lane.
- **Notes:** **This is the "STOP and report precisely" case the brief
  anticipated**, just triggered by a different collision than the one it
  named (species-name breathe) — ISSUES #5 instead. Confirmed root-cause
  separation carefully before stopping: (1) reverted the RENT-specific
  trace to a bare `A`-open+`B`-close with no selection/RNG code touched at
  all, and it reproduces the identical diff at the identical relative
  offset — proves this is not a bug in this slice's new code; (2) all of
  this slice's *own* new behavior — palette swap, message/label redraw
  timing, the ball's idle/rock tile sequence, and the RNG stream through
  both a SUCCESS and a FAILURE roll — is independently confirmed exact via
  RAM-dumped `gRngValue` checkpoints (hermetic, unaffected by any pixel
  bug) plus the trace's own frames 58-138, which sit entirely outside every
  close-animation window and are 100% clean. The RAM-inspection recipe
  (`tools/extract/inspect-anchor.py`'s pattern, scratch script not
  committed) was essential here: a per-frame dump of `gSprites[ballId]`'s
  `data[0]`/`animEnded`/`animNum`/`animCmdIndex` alongside `gRngValue`
  turned a confusing pixel-only investigation into an exact tick-by-tick
  state trace, which is what let SETTLE_TICKS/the Moving cmd table/the
  2-stage display lag all get pinned correctly on the first real attempt.

---
