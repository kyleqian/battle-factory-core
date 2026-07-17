# Progress ledger — archive

Older entries moved out of `PROGRESS.md` to keep the live ledger lean. Newest
archived entry on top. Git history has the full detail regardless.

---

## 22 — S5 slice 2 (worker, capped): STOPPED before resolving ISSUES #7 — RAM probe hit a SEPARATE, previously-unknown bug (dropped cursor input after a RENT-confirm close) that contaminated the discriminating scenario before it was reached; #7's own two-simultaneous-stall question is still unresolved

- **State:** unchanged from entry 21 — `npm test` **261/261**, `npm run
  build` green, all 7 traces untouched at prior counts. **No `src/`/`tests/`
  changes this session, no `rent-3picks.json` committed.** ISSUES #7 was
  NOT deleted — its root cause is still not proven.
- **Did:** Built a 3-ball RAM probe (`tools/extract/inspect-anchor.py`
  pattern, dumping `gSprites[ballSpriteId].data[0]`/`animNum`/`animCmdIndex`/
  `animEnded` + `gRngValue` tick-by-tick; cross-checked instrumentation via a
  single-ball control probe that reproduces the already-pinned model
  bit-exact through frame 300 — offsets are correct, not a probe artifact).
  First attempt used a 10-tick dwell before the second cursor `RIGHT`
  (shorter than `ballAnimMultiBall.test.ts`'s proven 40-tick
  `DWELL_TO_SLOT2`) and RAM-confirmed (direct reads of
  `sFactorySelectScreen->cursorPos` and `mons[i].selectedId`) that **real
  hardware silently dropped that `RIGHT`** — cursor never left slot 0, and
  the next `A` press deselected slot 0 instead of selecting slot 1. This
  engine's own replay does NOT reproduce the drop: `core.ts`'s "cursor" mode
  branch has no gate analogous to `isMonPicInputReady()` for input arriving
  too soon after a RENT confirm's popup-close. The resulting "mismatch" I
  was chasing (ball 0's sprite fields resetting at tick 99) was just this
  deselect's palette swap, not a `ballAnimStall` effect — a contaminated
  repro, not new evidence about ISSUES #7's real question. Full writeup +
  exact evidence in ISSUES #7's "Worker update" section.
- **Next:** Rebuild the ISSUES #7 repro with a ≥40-tick dwell before **every**
  cursor move (not just the first), then rerun the same dump-and-diff method
  to actually reach the two-simultaneous-active-balls trigger. The probe
  infrastructure is fast (~2 min end-to-end for the control probe) and the
  method is proven — this should be quick for the next session. Separately
  worth a look: whether "cursor" mode needs its own `isMonPicInputReady`-style
  gate on popup-close completion (currently ungated), since any repro script
  with too-short a post-confirm dwell will silently desync the same way mine
  did.
- **Notes:** No `src/` edits made (probe-only, scratch scripts under `/tmp`,
  not committed). PAPERCUT: none beyond the usual oracle round-trip overhead;
  the wasted probe cycle here was a scripting judgment call (dwell too
  short), not tooling friction.

---

## 21 — S5 slice 2 (worker, capped): STOPPED before writing rent-3picks.json — found a SECOND, distinct multi-ball model gap (ISSUES #7): ball-tile pixel mismatches once a trigger stalls TWO already-active balls at once, a scenario ISSUES #6's fix never RAM-verified

- **State:** unchanged from entry 20 — `npm test` **261/261**, `npm run
  build` green, all 7 existing traces untouched at prior counts
  (`rent-slot1.json` still **125/139**, file byte-identical). **No
  `src/`/`tests/` changes this session** and **no `rent-3picks.json`
  committed** — the investigation below found a real, unattributable model
  gap that blocks building that trace correctly (same "stop and report
  precisely" outcome as entry 19).
- **Did:** Built a candidate 3-pick dense trace (rent slot1 → `RIGHT` → rent
  slot2 → `RIGHT` → rent slot3, each rent = `A`(2f)/idle28f/`DOWN`(2f)/
  idle4f/`A`(2f) confirm, matching `rent-slot1.json`'s own shape; confirms
  land at press-ticks 37/113/189) and ran it through `npm run compare`
  (scratch, not committed). Found `DIFF`s at **ball OBJ positions** during
  plain idle dwell — outside ISSUES #5's popup-close window (`x88-151`)
  entirely. Root-caused *which tile* is objectively correct per mismatched
  frame via a RAM-free method: overlay each of a ball's 3 candidate anim
  tiles directly onto a clone of the **oracle's own PNG** (same `drawSprite`
  call the renderer uses) — the correct tile is the one whose overlay is a
  pixel-exact no-op against the untouched oracle frame. Confirmed 3
  mismatches this way (frame 124 ball-index-1 true=32/engine=0; frame 155
  ball-index-0 true=32/engine=0; frame 163 same ball true=0/engine=32 — not
  a constant offset, oscillates ahead/behind). Traced the likely mechanism:
  by frame ~145 the trace's *second* `RIGHT` (slot1→slot2) stalls **two**
  simultaneously-active balls (index 0 and 1) from one trigger —
  `tests/ballAnimMultiBall.test.ts`'s only multi-ball RAM-pinned case never
  reaches this shape (its trigger always stalls exactly **one** already-
  active ball, never two at once). Ball 0 by frame 163 has accumulated
  three stall-worthy triggers total (the first `RIGHT`, the slot-2 confirm,
  and the second `RIGHT` shared with ball 1) — full details, evidence, and
  the exact repro script are in **ISSUES #7** (new).
- **Next:** ISSUES #7 needs a dev-time RAM probe of the same caliber as
  ISSUES #6's own (`gSprites[ballSpriteId].data[0]`/`animNum`/`animEnded` per
  ball, tick-by-tick) but for a 3-ball scenario with **two sequential**
  cursor moves, to determine whether real hardware stalls both
  simultaneously-active balls per trigger, only one, or something else —
  do not guess/patch `ballAnimStall` without that data (a wrong guess would
  silently re-break the already-verified two-ball case). Once resolved,
  `rent-3picks.json` (dense captures through all 3 picks, ending at "Are
  these three POKéMON OK?" — the exact endpoint tick before ANY reveal-chain
  change was worked out this session: the 3rd confirm's own resulting frame,
  since even the popup-preview close counts as part of the reveal chain per
  `docs/confirm-flow-notes.md` §0) and the accompanying 3-ball `gRngValue`
  Tier-1 RAM-pin are both unblocked and ready to build.
- **Notes:** No `src/` edits were made (the investigation stayed read-only:
  scratch TS probes comparing oracle/app PNGs directly, deleted before
  finishing per instructions; the candidate trace file was likewise deleted
  rather than committed broken, matching entry 19's own precedent of not
  writing the trace when blocked). PAPERCUT: none beyond the usual
  oracle-round-trip overhead (~6 `npm run compare`/probe round-trips this
  session).

---

## 20 — ISSUES #6 root-caused and fixed: multi-ball `SpriteCB_Pokeball` stall was never about mon-pic open/close — it's `Select_Print*` text-printer calls (cursor move + RENT/DESELECT confirm) stealing a tick from every OTHER rented ball; two-ball RNG stream now exact, ISSUES #6 DELETED

- **Supervisor addendum (same day):** verified (208/208 → then merged the
  three parked worktree branches: battle-1 assets, confirm-flow dossier,
  battle-transition assets) — `npm test` now **261/261**, build green,
  worktrees cleaned. S6 static-asset groundwork is complete
  (mon/trainer pics, bg, healthbox, window/font, all 12 transition
  variants) and S5's confirm flow is fully scouted
  (`docs/confirm-flow-notes.md`). ISSUES #5 policy question still awaiting
  the user (asked ~12:35; headless fallback active). Next: rent-3picks
  trace worker (multi-ball model now exact), then confirm-flow
  implementation.
- **State:** `npm test` **208/208** (203→208, +5 new in
  `tests/ballAnimMultiBall.test.ts`), `npm run build` green. All 7 traces
  re-verified at their prior counts, files unchanged (`anchor` 1/1,
  `draft-cursor` 13/13, `draft-menu` 38/38, `draft-menu-slot6` 66/66,
  `summary-info-onix` 122/122, `summary-info-magby` 132/132,
  `rent-slot1.json` still **125/139**, gap still 100% attributable to
  ISSUES #5 per entry 18, untouched here).
- **Did:** Overturned the prior session's own working theory (entry 19
  suspected `OpenMonPic`/`CloseMonPic`). RAM-probed (dev-time
  `EmeraldOracle` harness, scratch scripts under `/tmp`, not committed)
  four isolated variants against the pinned single-ball baseline
  (animEnded-equivalent flip at frame 168): a plain cursor **RIGHT move
  with NO popup at all** costs ball 0 a tick (flip→169) — proving the
  effect has nothing to do with mon-pic mechanics; opening a ball's **own**
  popup costs nothing (flip stays 168, answers the brief's self-stall
  question: no); opening a second ball's popup and closing it via **B**
  costs the same single tick as leaving it open (flip→169 either way —
  closing via B/OTHERS adds nothing); only closing via **RENT/DESELECT
  confirm** adds a second, independent tick (flip→170, matching ISSUES #6's
  own cited number exactly). Traced both triggers to source:
  `Select_Task_HandleChooseMons`'s LEFT/RIGHT branch
  (`battle_factory_screen.c` STATE_CHOOSE_MONS_HANDLE_INPUT) calls
  `Select_PrintMonCategory`/`Select_PrintMonSpecies`, and
  `Select_OptionRentDeselect` (:1949-1970) calls `Select_PrintSelectMonString`
  (:1893-1909) — both call `AddTextPrinterParameterized[3]` +
  `CopyWindowToVram(..., COPYWIN_GFX)`; B/OTHERS-close and self-open call
  neither. The stall lands the tick *after* the trigger, matching
  `CB2_SelectScreen`'s `AnimateSprites()`-before-`RunTasks()` ordering
  (:1092-1099) — a same-tick `RunTasks()` text-print can only affect the
  *next* tick's `AnimateSprites()` pass. Modeled as `DraftScreenState.
  ballAnimStall` (`factoryDraftScreen.ts`): a snapshot of which ball slots
  were active *before* this tick's action, consumed to skip exactly those
  slots' `advanceBallAnim` call next tick — LEFT/RIGHT stalls everyone
  active; RENT/DESELECT stalls everyone active *except* the acted-on slot
  (RAM-confirmed via a second ball's own settle timer landing unstalled by
  its own trigger). Along the way, an exhaustive per-frame `gRngValue` diff
  (RAM vs engine, all 260 frames of the two-ball repro, not just
  checkpoints) surfaced two more latent, pre-existing `ballAnim.ts` bugs
  invisible to the single-ball suite (which never sampled a frame in the
  affected gap): the "resting→moving" reroll after a SUCCESS actually lands
  2 ticks later than the naive `REST_TICKS` countdown implied (now
  `REST_INTERNAL_OFFSET`), and a moving cycle ending on a FAILURE (no
  queued rest, immediate reroll) actually rerolls 1 tick later than
  same-tick (now `FAILURE_REROLL_DELAY`) — the latter caught via ball 1's
  own first-ever full cycle (a FAILURE, previously never RAM-tested this
  deep). Both fixes are single-ball-invisible (re-verified 0 mismatches
  across a fresh 400-frame single-ball RAM diff) but required for
  multi-ball interleaving exactness.
- **Next:** S5 slice 2's `rent-3picks.json` is now unblocked (stretch item
  from this session's brief, not attempted — see Notes). ISSUES #6 deleted
  per the fix; ISSUES #5 (real hardware jitter, entry 18) remains the only
  open item blocking `rent-slot1.json`'s last 14 frames — do not re-attempt
  without new information per that entry's own conclusion.
- **Notes:** Only the primary goal was attempted this session (mechanism
  root-cause + engine fix + tests); the stretch goal (RENT-confirm-timing
  jitter probing + committing `rent-3picks.json`) was not reached — ran out
  of session time after the RAM-probe-heavy primary investigation (~15
  oracle round-trips total: 4 discriminating-variant probes, several dense
  per-tick dumps, and one 260-frame exhaustive diff). Whoever picks up
  `rent-3picks.json` next inherits a RNG-exact 2-ball model to build on;
  the two-ball scenario's exhaustive 260-frame diff (0 mismatches) is
  stronger evidence than the checkpoint-only pinning in
  `tests/ballAnimMultiBall.test.ts`, but that full diff isn't itself
  committed (per instructions) — re-run it if extending to 3 balls turns up
  anything suspicious.

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

## 16 — S4 slice 1 (worker, capped): summary-info-magby.json lands 0 diff — "≥2 different slots" acceptance met, no app changes needed

- **State:** `npm test` **159/159** unchanged, `npm run build` green.
  `tools/compare/traces/summary-info-magby.json` (new, 132 every-frame
  captures 45-176, menu-open through entry fade + a settled-window slice +
  full B-exit fade-out/black-hold/fade-in to the resettled draft-with-menu
  state) → **0 diff, 132/132**. `anchor` (1/1), `summary-info-onix`
  (122/122), `draft-cursor` (13/13), `draft-menu` (38/38),
  `draft-menu-slot6` (66/66) all re-verified 0 diff. **No `src/` changes
  were needed** — the existing generic renderer/state machine already
  handled MAGBY's data (name/types/gender-none/hFlip'd sprite) correctly.
- **Did:** Per the brief's method, probed MAGBY's own timing with `bin/
  oracle run` before writing the trace (did not reuse ONIX's offsets
  blind). Found the RIGHT-cursor-move (+4 settle) and menu-open (+40
  settle) timings are generic/species-independent as expected. The Info
  page's fade-settle timing is **also** generic: MAGBY's Info page goes
  sha-stable at SUMMARY-press-tick **+59**, and `B` first registers at
  **+63** — pixel-identical offsets to ONIX's already-documented ones, now
  empirically confirmed rather than assumed. The real MAGBY-specific find:
  its sha-stable window is only **6 ticks wide (+59..+64)**, not ONIX's
  ~100+, because `PokemonSummaryDoMonAnimation`'s per-species
  `sMonAnimationDelayTable`/front-sprite-bounce-and-cry (`pokemon.c:6858`)
  fires almost immediately for MAGBY (starts at +65) — this is "the mon
  idle animation" PROGRESS #15 already flagged as unscoped/undone. Built
  the trace to press `B` at exactly +63 (relative to the SUMMARY press),
  the last tick inside the stable window before that animation would
  intrude — so the committed trace never exercises those not-yet-modeled
  frames at all, by construction, not by luck.
- **Next:** S4's "≥2 different slots" acceptance criterion is now met.
  **Supervisor decision (this session): S4 slice 1 closed; the remainder
  (page nav + scroll-wipe, UP/DOWN switching, move-select, mon idle
  animation) is explicitly deferred behind S5 — recorded in ROADMAP.md's
  S4 section. Main lane proceeds to S5 (docs/rent-flow-notes.md);
  worktree lane is extracting moves/exp/items data in parallel.**
- **Notes:** Debugging template from #14 worked well again: isolated dense
  oracle probe of the new interaction first, sanity-checked pixels
  actually changed after the "trigger" input rather than trusting a
  stable-looking window. `sMonAnimationDelayTable`/`PokemonSummaryDoMonAnimation`
  (`pokemon.c:6858`, `pokemon_summary_screen.c:3994`) is the concrete
  source location for whoever picks up the idle-animation item — it's a
  per-species (`species - 1` indexed) delay-then-bounce-and-cry, gated on
  `!gPaletteFade.active`, same guard family as the input-ready-lag quirk.

---

## 15 — Supervisor wind-down: session end 2026-07-17 ~05:50

- **State (verified this minute):** `npm test` **159/159**, `npm run build`
  green, all five compare traces 0 diff (`anchor` 1/1, `draft-cursor`
  13/13, `draft-menu` 38/38, `draft-menu-slot6` 66/66 every-frame,
  `summary-info-onix` **122/122** every-frame incl. full B-exit).
  `ISSUES.md` empty. Working tree clean. ROADMAP: **S1 [x] S2 [x] S3 [x]
  S4 [~] S5-S9 [ ]** — S4's remainder: MAGBY Info-page trace (probe its
  own stable window), the 3 other pages + scroll-wipe, UP/DOWN
  mon-switching, move-select, the mon idle animation.
- **Session summary (supervised, ~01:00-05:50):** 9 worker steps + 1 merge
  lane. Landed: staged roadmap (iteration 0); S1 pixel-exact anchor +
  compare loop + extraction pipeline; S2 draft interactions frame-exact
  incl. every-frame transients; S3 RNG core + 882 rentals extracted +
  anchor RAM dump (six mons pinned to recomputed stats); S4 fade math,
  Info-page data + renderer, entry+exit fades pixel-exact; scout dossiers
  for S4 (summary-screen-notes.md) and S5 (rent-flow-notes.md). Key
  domain finds in ROADMAP notes: anchor RNG seed, ball-sprite RNG
  consumption, battle-1 opponent is an anchor constant, statics-via-nm
  recipe, fade elapsed+1 + black-hold quirks.
- **Next:** S4 remainder (start with summary-info-magby.json), then S5
  implementation off docs/rent-flow-notes.md. All prerequisites committed.
- **Notes:** Every worker ended at a green commit; no usage-limit events;
  two PAPERCUTS entries total (see file).

---

## 14 — S4 slice 1 (worker, capped): B-exit fade fixed, ISSUES #4 closed; summary-info-onix.json now 0 diff through settle — S4 stays [~] (MAGBY trace still open)

- **State:** `npm test` **159/159** (152→159, +7 new), `npm run build`
  green. `anchor`/`draft-cursor`/`draft-menu`/`draft-menu-slot6` re-verified
  0 diff. `tools/compare/traces/summary-info-onix.json` extended from 64
  captures (entry+settle only) to **122 dense captures, every frame,
  covering SUMMARY-press through the full B-exit (fade-out/black-hold/
  fade-in) back to the resettled draft screen** → **0 diff, all 122
  frames**. `ISSUES.md` #4 deleted (fixed, not worked around).
- **Did:** Per the brief's method: ran a fresh, isolated dense oracle probe
  of the B-exit only (not layered on the entry trace). First probe attempt
  (B pressed at the settled Info page's own press-tick+62, well inside the
  documented pixel-stable window) found B silently did nothing for ~50
  frames — a real gotcha, now in `ROADMAP.md`'s Domain notes: input-ready
  lags visual-stable by a few ticks here (`Task_HandleInput`'s
  `!gPaletteFade.active` guard isn't true yet even though the screen looks
  settled); B first reliably registers at absolute press-tick+63 (a
  parameter sweep confirmed +62 fails, +63 works). With a probe that
  actually triggered the fade, derived the true curve pixel-for-pixel
  (component 90 and 255 samples, matching `paletteFade.test.ts`'s existing
  oracle-pinned values exactly) — the exit fade-out/fade-in curves and
  their `elapsed+1` offset were **already correct** in `core.ts`'s
  `render()`; the actual bug was the black-hold phase: the entry direction
  had a special "hold's own last tick already shows fade-in's first step"
  branch, but the exit direction fell through to always-pure-black instead
  of getting the same treatment — the exit's black hold has the identical
  quirk (oracle-confirmed: the true last hold tick, not pure black, matches
  `bgFadeY(0, FADE_IN)`/`objFadeY(0, FADE_IN)` composited on the *draft*
  screen, symmetric with the entry composing onto the *Info* page).
  Rewrote `render()`'s black-hold branch to apply the peek uniformly by
  direction instead of hardcoding it entry-only. New
  `tests/summaryScreenRender.test.ts` hermetically pins the render()
  *dispatch* itself (which curve/offset/black-hold-quirk applies to which
  phase × direction) — the layer this bug actually lived in, distinct from
  `paletteFade.test.ts`'s already-correct low-level curve math.
- **Next:** `summary-info-magby.json` (stretch, not reached this session —
  probe MAGBY's own stable window first, don't assume ONIX's press-tick+59
  transfers) is the last piece of S4 slice 1's brief before S4's "≥2
  different slots" acceptance criterion is met. After that: S4's remaining
  scope (page navigation RIGHT/LEFT, mon-switching UP/DOWN, move-select) or
  move on to S5 per supervisor call.
- **Notes:** The debugging path here is a good template for future
  fade/dispatch bugs on this screen: (1) isolated dense probe of *only*
  the interaction in question, (2) sanity-check the probe actually
  triggered the intended state transition (don't assume a "stable-looking"
  press registered — verify pixels actually start changing where expected
  before trusting the rest of the derivation), (3) compare the app's
  actual rendered pixels against the oracle's directly (not against a
  hand-derived formula) to localize which specific composited region
  disagrees, since that pinpoints the dispatch bug far faster than
  re-deriving curve math that was already right.

---

## 13 — S4 slice 1 (worker, capped): Info-page renderer built and wired; entry+settle trace 0 diff; B-exit gap found — S4 stays [~]

- **State:** `npm test` **152/152** (146→152, +6 new), `npm run build`
  green. `anchor`/`draft-cursor`/`draft-menu`/`draft-menu-slot6` all
  re-verified 0 diff this session (untouched code paths, but re-ran given
  how much of `src/engine/` this slice touched). **New:**
  `tools/compare/traces/summary-info-onix.json` (dense, every frame from
  the SUMMARY press through the settled Info page's stable window, 64
  captures) → **0 diff**. `ROADMAP.md` still `[~]` — see gap below.
- **Did:** Built `src/engine/summaryInfoPage.ts` (the static Info-page
  compositor: BG3 tilemap, type/markings/ball/mon sprites, all text
  windows, per `docs/summary-screen-notes.md` §7) and wired
  `summaryScreen.ts`+`paletteFade.ts` into `core.ts` (`EngineState` gains
  `summaryScreen`; `tick()` routes A-on-SUMMARY/B-on-Info-page; `render()`
  dispatches flat/faded draft or Info-page rendering by transition phase).
  Then debugged the render pixel-exact against dense oracle captures
  (iterating `npm run compare`'s diff PNGs, per the brief) until the ONIX
  settled Info page and the full entry-fade sequence hit 0 diff. Real bugs
  found and fixed along the way (all still applicable, see commit
  `ec234e9` for the settled-frame set and `5729950` for the fade-timing
  set): `sTextColors` colorId0/1 were transposed (hid/blackened most text);
  the A-button icon is colored by its **window's** palette, not its source
  PNG's; `PositionStatusSlidingWindow`'s on-load reset lands on a flat
  fill, not a redraw of `page_info.bin`'s stale default; `{NO}`/`{LV}` are
  single-glyph control codes with ligature bitmaps already sitting in
  `font-normal.json` at raw codes 264/52 (bypass the charmap, which only
  covers quoted single-char entries); and — the big one — `render()`'s fade
  curves need `bgFadeY(t.elapsed + 1, timing)`/`objFadeY(t.elapsed + 1,
  timing)`, not `t.elapsed` directly (`BeginNormalPaletteFade`'s first
  blend step lands within its own trigger tick), plus the black-hold
  phase's own **last** tick already shows the fade-in's first step (BG
  only — OBJ is a further tick behind even there), which needed its own
  branch instead of always rendering solid black. Extraction: new
  `src/engine/fadeRender.ts` (fading variants of the `drawTileBg`/
  `drawSprite`/`drawText` primitives, `y<=0` reproduces the originals
  exactly — used for both the summary Info page and a new
  `renderFactoryDraftScreenFaded`), `drawSprite` gained an `hFlip` param
  (all 6 anchor species render hFlip'd on this screen, confirmed from
  `species_info.h`'s `noFlip` field — opposite of the draft-screen pic),
  and `src/assets/gen/summary-ball.json` (the summary screen's caught-ball
  icon is a **different** asset than the draft screen's rental-ball
  sprite, `graphics/balls/poke.png` not `factory_screen/pokeball.png` —
  confirmed every rental defaults to `ITEM_POKE_BALL` via
  `pokemon.c:2261`).
- **Next:** **The B-exit (Info page → draft screen) path is unresolved.**
  The state machine's phase/tick bookkeeping looks structurally right
  (settles at the expected tick, `onInfoPage` flips back correctly), but
  the *rendered pixels* diverge severely starting ~2 ticks into the exit
  fade-out and get progressively more wrong (SSIM trending toward 0, not a
  small residual) — this does **not** fit the same "+1" pattern that fixed
  entry, so applying it blindly would likely be wrong. Exact repro: trace
  `2×A, wait 40, 2×A, wait 60, 2×B, wait N`, dense-capture frames 104-165;
  104-106 match, first divergence at 107 (2 ticks after the B press
  registers). Needs a **fresh dense oracle probe of the exit fade
  specifically** (isolated, not layered on the entry trace) before
  guessing further — do not reuse the entry "+1" fix without re-deriving
  it from oracle pixels for this direction. Once that's resolved: extend
  `summary-info-onix.json` to cover the B-exit back to the settled draft
  screen (per the original brief), then `summary-info-magby.json` (stretch
  — probe MAGBY's own stable window first, don't assume ONIX's +59..+64
  transfers).
- **Notes:** `docs/summary-screen-notes.md` §7's spec was excellent — the
  BG-layering/composition-order/window-geometry reasoning all held up
  against oracle pixels with zero corrections needed. Every bug found this
  session was in territory the spec explicitly flagged as unresolved (text
  colors, ball asset, hFlip) or genuinely out of scope for a static-page
  spec (the fade-timing "+1", the black-hold boundary tick, the
  `{NO}`/`{LV}` control codes) — a good sign the extraction-then-implement
  split this run's been using is working. `PAPERCUT`: the `bin/oracle
  run`-vs-`npm run compare` frame-numbering question (are "press-tick N"
  labels from a direct oracle probe always directly comparable to
  `appTrace.ts`'s frame counter?) came up twice this session and cost real
  time both times — worth a `bin/oracle info`/`ROADMAP.md` Domain-notes
  clarification for the next worker who dense-probes a fresh interaction.

---

## 11 — Supervisor: S5 scout merged (rent-flow dossier)

- **State:** `docs/rent-flow-notes.md` merged; main tree `npm test`
  **138/138**, build green, all traces 0 diff. ROADMAP updated: S6 scope
  note + rented-ball RNG domain note (committed).
- **Did:** Verified + merged the S5 scout. Corrections vs prior
  assumptions: RENT is instant (no per-pick confirm; only yes/no is the
  final "Are these three POKeMON OK?"); OTHERS = cancel; DESELECT is
  RENT's relabel on a rented ball. Load-bearing finds: battle 1's opponent
  generated BEFORE frame 0 (anchor constant); rented ball sprites roll
  `Random()%5` per ~32f cooldown per ball (must be modeled from S5 on).
  S5→S6 boundary pinned: the "Right this way, please!" hold.
- **Next:** S4 slice-1 finisher (see entry 10's blocker list): extract
  Info-page data (type/dex/ability text/gender), render the static Info
  page, commit summary-info traces captured inside the stable +59..+64
  window, 0 diff. Then S5 implementation.
- **Notes:** Ledger hygiene: entry 8 was pre-archived by a worker while
  still live here; dropped it from the ledger without re-appending.

---

## 10 — S4 slice 1 (worker, capped): fade math + state machine landed; Info-page rendering NOT reached — S4 stays [~]

- **State:** `npm test` **138/138** (115→138), `npm run build` green.
  Existing 4 compare traces (`anchor`, `draft-cursor`, `draft-menu`,
  `draft-menu-slot6`) still all 0 diff (untouched this slice). **No new
  compare traces committed** — `summary-info-onix.json`/`-magby.json` from
  the step brief were NOT produced; the Info page has no renderer yet, so
  there was nothing to capture against. `ROADMAP.md` S4 stays `[ ]`
  (unstarted rendering-wise; foundation only).
- **Did:** Landed the hard, reusable half of S4 first: dense oracle
  probing (fresh, this session — not just reading the scout's dossier) of
  all 4 `BeginNormalPaletteFade(PALETTES_ALL, 0, ..., RGB_BLACK)` calls
  (entry fade-out/in, exit fade-out/in) fully pinned the per-frame 5-bit
  blend curve and the BG/OBJ 1-tick stagger (`objPaletteToggle`) —
  `src/engine/paletteFade.ts`, self-consistent with the dossier's
  press-tick+59/+53 settle points (20+24+15=59, 18+20+15=53 ticks exactly).
  Wired those tick counts into a summary-screen entry/exit state machine
  (`src/engine/summaryScreen.ts`: transition direction/phase/elapsed,
  selectedSlot, page id) mirroring `Select_Task_OpenSummaryScreen`'s
  3-state machine. 23 new hermetic Tier-1 tests, all pinned against literal
  oracle pixel values (no oracle/pixels at test time). Also confirmed the
  brief's requested number: **first mon idle-animation churn frame is
  press-tick+65** (slot 1/ONIX; settled Info page is stable from +59
  through +64, every frame differs from +65 onward through +151 with no
  further stable window found) — MAGBY (slot 2) not independently probed.
  Addendum written to `docs/summary-screen-notes.md` §6 with full detail.
  Neither module is wired into `core.ts`/render yet.
- **Next:** The Info page renderer itself, blocked on missing extraction
  (found while scoping, not yet done): `species-stats.json` has no
  type/dex-number fields; no ability name/description text table; no
  gender-ratio table. Next slice: (1) extract those (types + dex numbers
  likely cheap additions to `extract-species-header.ts`'s source files;
  ability names/descriptions from `gAbilityNames`/
  `gAbilityDescriptionPointers` need a small new extractor); (2) build the
  Info-page renderer (BG3 tilemap from already-extracted
  `summary-bg.json`, the window/text fields per the dossier's §2/§3, type
  icons from `summary-type-icons.json`) for a **static** frame (mon
  idle-anim can stay a documented remainder, captures must stay ≤
  press-tick+64 per the churn frame above); (3) wire
  `summaryScreen.ts`+`paletteFade.ts` into `core.ts`'s tick/render,
  blending the draft-screen framebuffer during entry-out/exit-in and the
  new Info-page framebuffer during entry-in/exit-out; (4) only then are
  `summary-info-onix.json`/`-magby.json` (dense through the fades, ≤4-frame
  elsewhere) achievable — build and commit those to actually close S4
  slice 1's acceptance criteria, which this session did not reach.
- **Notes:** This slice hit its 50-minute cap on research + the (large,
  now-done-once) fade-curve derivation before rendering could start —
  flagging per `AGENTS.md`'s "stop at a green commit, report exact
  frames/pixels" guidance rather than shipping a rushed/unverified
  renderer. The fade math is the part most likely to have been gotten
  subtly wrong by guessing (5-bit space, BG/OBJ stagger, per-transition
  dead-frame delays all differ from naive assumptions) — glad it's now
  oracle-pinned and covered, since every future summary-screen fade (S4
  paging is a redraw not a fade, but S5's draft-exit fade and S6's battle
  transition likely reuse this exact mechanism).

---

## 9 — Supervisor: S4 scout merged; S2 verified complete

- **State:** Scout branch `worker/wt-20260717-032349` merged: summary-screen
  art extracted (`src/assets/gen/summary-*.json`) + implementation dossier
  `docs/summary-screen-notes.md` (entry `SUMMARY_MODE_LOCK_MOVES`, all 4
  pages + UP/DOWN mon-switching reachable, OT suppressed for rentals,
  ranked frame-exactness risks). Merged tree: `npm test` **115/115**,
  build green, all four compare traces 0 diff. Worktree cleaned up.
- **Did:** Verified the #3 fix (66/66) and the scout deliverables myself;
  merged; re-ran the full battery on the merged tree.
- **Next:** S4 implementation slice 1 — entry fade → static Info page →
  B-exit restore, dense-capture traces 0-diff (dossier §1/§2 is the map;
  keep traces clear of the looping mon idle anim per dossier risk #1).
- **Notes:** Dossier flags the return path re-entering the draft via
  `CB2_InitSelectScreen` (fresh init, `fromSummaryScreen=TRUE`,
  `gLastViewedMonIndex` can move the cursor) — treat exit traces as
  first-class acceptance, not an afterthought.

---

## 8 — ISSUES #3 closed: slot6 every-frame trace 58/66 → 66/66; S2 COMPLETE

- **State:** `npm test` **115/115**, `npm run build` green. Compares:
  `anchor.json` 1/1, `draft-cursor.json` 13/13, `draft-menu.json` 38/38,
  `draft-menu-slot6.json` **66/66** — all 0 diff, no regressions. `ISSUES.md`
  #3 deleted (fixed). S2 ticked `[x]` in `ROADMAP.md`.
- **Did:** Root-caused and fixed the 3 remaining redraw-scheduling clusters
  via single-purpose dense oracle probes (LEFT-only, DOWN-only, and B-only
  from a settled state), all traced to `CB2_SelectScreen`'s
  `AnimateSprites`/`BuildOamBuffer`/`RunTextPrinters`/`UpdatePaletteFade`/
  `RunTasks` ordering (RunTasks runs last, so any OAM change it makes isn't
  picked up until the *next* frame's `BuildOamBuffer`, while window/text
  copies land same-tick): (1) LEFT/RIGHT cursor moves reveal category text,
  species text, then the arrow sprite on 3 successive ticks, not atomically
  — new `CursorRedrawState` in `factoryDraftScreen.ts`; (2) UP/DOWN menu nav
  keeps the highlight bar on the old row for 2 full ticks before jumping to
  the new one (no piecemeal reveal, single OAM move) — new
  `MenuHighlightRedrawState`; (3) `monPic.ts`'s close tables were missing
  the same front-sprite/highlight-bar 1-tick OAM lag the open tables already
  modeled, and (surprise, oracle-verified against both draft-menu.json's own
  first close and draft-menu-slot6.json's) the close's window-shrink shape
  does NOT mirror hasActed-at-close or the open variant letter — only an
  open that was variant C gets the skip+duplicate shape; A and B both close
  clean. Added Tier-1 tests for all three (monPic.test.ts 15→20,
  draftScreen.test.ts 12→16).
- **Next:** S4 — summary screen parity (draft's SUMMARY view, page
  navigation, return to draft). See `ROADMAP.md` S4 acceptance criteria.
- **Notes:** The "mirror the open variant" hypothesis for the close table
  seemed elegant but was empirically wrong — always re-verify against a
  fresh dense probe of the *specific* trace in question rather than
  generalizing from one data point, even when the generalization is
  structurally tempting.

---

## 7 — ISSUES #3 partial: slot6 every-frame trace 40/66 → 58/66

- **State:** `npm test` **110/110**, `npm run build` green. Compares:
  `anchor.json` 1/1, `draft-cursor.json` 13/13, `draft-menu.json` 38/38 —
  still all 0 diff (no regressions). `draft-menu-slot6.json` (every-frame
  0-65) **58/66** (was 40/66). S2 stays `[~]` — 8 frames still differ, all
  redraw-scheduling transients (see `ISSUES.md` #3, trimmed to just these).
- **Did:** Root-caused and fixed the two clusters inside the mon-pic
  sub-state machine (`src/engine/monPic.ts`): (1) the ball-open flash bar's
  flat-vs-blended color was wrongly tied to the hasActed timing variant —
  it actually tracks a separate, session-persistent "has BLDCNT ever been
  configured" flag, now `MonPicState.blended`; (2) that same
  first-ever-open-after-a-cursor-move case needs its own window-growth
  timing table ("variant C"), pinned from dense oracle probing of
  draft-menu-slot6.json. Added 4 new hermetic Tier-1 tests (15→19) pinning
  variant C and the blend/variant decoupling.
- **Next:** Fix the remaining 3 clusters (all `Select_Task_Handle*`'s
  redraw scheduling, not mon-pic): f1-f3 cursor-move header/arrow redraw,
  f37-f38 menu-highlight redraw (likely same mechanism as f1-f3), f44/47-48
  close-phase transients. `ISSUES.md` #3 has a dedicated probing plan for
  each (isolate with single-purpose dense traces before fixing against the
  combined slot6 trace). Then tick S2 `[x]`, then S4.
- **Notes:** The end-states are already exact — only 8/66 frames differ,
  all transient (settle within 2-4 ticks); this is scheduling/timing, not
  missing mechanisms.

---

## 1 — Iteration 0: staged plan authored (supervisor)

- **State:** Baseline green (`npm test` 3/3, `npm run build` OK, oracle
  answering). `ROADMAP.md` now carries the staged plan S1–S9; no engine code
  yet. `tools/compare/traces/anchor.json` committed.
- **Did:** Verified skeleton baseline; probed the oracle (anchor = Lv-50
  single draft screen, ONIX slot 1; RIGHT/A semantics + timings observed);
  pinned the color expansion `(c<<3)|(c>>2)` against all 22 anchor colors;
  verified the dev-time RAM-inspection recipe (replay matches canonical sha
  byte-exactly; anchor `gRngValue = 0xd2ddeec8`); confirmed the per-frame
  VBlank `Random()` rule (`main.c:366`); authored ROADMAP.md stages S1–S9
  with command-backed acceptance criteria.
- **Next:** S1 via worker briefs — extraction pipeline + engine skeleton +
  `appTrace.ts` wiring, driving `npm run compare -- tools/compare/traces/
  anchor.json` to 0 diff.
- **Notes:** RAM-inspection quirks (mGBA log spam on stdout, benign exit-139
  teardown segfault) are documented in ROADMAP.md Domain notes.

---

## 0 — Run initialized

- **State:** Fresh run from the harness template. `npm test` and
  `npm run build` green on the skeleton; engine not started.
- **Did:** Template stamped by `initialize-run.sh` (see `.run.json` for the
  pinned reference revision, ROM SHA-1, and oracle bootstrap version).
- **Next:** Supervisor iteration 0 — bootstrap the plan: probe the oracle,
  survey the reference, replace `ROADMAP.md`'s PLAN PENDING section with
  staged, command-backed acceptance criteria (`SUPERVISOR.md` § "Fresh
  run"), and commit it before any implementation brief.
- **Notes:** The oracle contract and canonical-state description are in
  `bin/oracle info`. Read `AGENTS.md` before anything else.
## 2 — S1 worker: extraction + engine skeleton, anchor frame 94% pixel-exact

- **State:** `npm test` 22/22 green, `npm run build` green, `npm run dev`
  serves without errors. `npm run compare -- tools/compare/traces/
  anchor.json` → **DIFF 2161/38400px (5.63%), ssimMean=0.8171** — NOT yet
  0 diff. All 2161 diff pixels are inside the four text windows (title/
  category/species/message); BG1 chrome tilemap and the OBJ ball+arrow
  sprites are pixel-exact (verified 0 diff outside text regions).
- **Did:** Built `tools/extract/` (indexed-PNG decoder preserving raw
  palette indices — pngjs alone loses them on duplicate colors; JASC .pal
  parser; tile/tilemap decoders; charmap.txt parser) writing committed
  `src/assets/gen/*.json` + `src/data/gen/*.json` from
  `reference/pokeemerald`. Pinned the GBA color round-trip precisely:
  reference art's 8-bit RGB must go 8-bit → 5-bit (`round(v*31/255)`) → the
  oracle's real expansion (`(c<<3)|(c>>2)`), not used as-is (verified
  against real anchor-screenshot colors, e.g. interface.pal's `164,115,246`
  → oracle's actual `165,115,247`). Discovered `sPokeball_Gfx` (factory_
  screen/pokeball.png) is dead code — the real ball art is `graphics/
  starter_choose/pokeball_selection.png` (`gPokeballSelection_Gfx`); menu.png
  supplies BG1's own palette directly (not interface.pal, which is OBJ-only
  for the arrow/highlights). Built `src/engine/` (pure `tick`/`render`,
  240x160 RGBA, no DOM/timers/Math.random): `bg.ts`/`sprites.ts` tile
  compositors, `font.ts` text layout, `factoryDraftScreen.ts` assembling the
  anchor from `sSelect_WindowTemplates` + `CreateSprite` coordinates
  transcribed from `battle_factory_screen.c` (not eyeballed). Wired
  `main.ts` and `tools/compare/appTrace.ts` to the same core. Added 19 new
  Tier-1 tests (tile/tilemap decode, color round-trip, text measurement, an
  anchor-render regression pinning the current output).
- **Next:** Close the remaining 5.63% — see `ISSUES.md` #1: the font
  renderer needs `sFontHalfRowOffsets`/`GenerateFontHalfRowLookupTable`
  (`reference/pokeemerald/src/text.c:41-51,363-420,526-560`) replicated
  exactly; our current `drawText` treats source glyph pixels as directly
  selecting bg/fg/shadow, but the real renderer blends pairs of source
  nibbles through that lookup table first. Fix either in the extractor
  (bake correct bitmaps into `font-normal.json`) or in `src/engine/font.ts`
  at render time, then re-run `npm run compare` to confirm 0 diff and update
  the pinned hash in `tests/anchorRender.test.ts`.
- **Notes:** `npm run dev` checked via `curl` against the Vite dev server
  (200 on `/` and `/src/main.ts`), not a real browser — no headless browser
  was available in this session; worth a real visual check next session.
## 4 — S2 worker: cursor sweep 0-diff; menu state machine done, ball-open art not yet — S2 PARTIAL

- **State:** `npm test` 39/39 green, `npm run build` green.
  `tools/compare/traces/anchor.json` still **1/1, 0 diff** (no regression).
  `tools/compare/traces/draft-cursor.json` (new, committed) → **13/13
  frames matched, 0 diff** — full RIGHT sweep across all 6 slots with wrap,
  full LEFT sweep back with wrap. `tools/compare/traces/draft-menu.json`
  (new, committed) → **10/38 matched** — every frame outside the ball-open
  "mon pic" window is exact; diff is confined to a ~64x64px region (see
  `ISSUES.md` #2 for the full diagnosis). S2 is therefore only partially
  done; see `ROADMAP.md`'s `[~]` status line for the precise breakdown.
- **Did:** Ported `reference/pokeemerald/src/main.c`'s `ReadKeys()` JOY_NEW/
  JOY_REPEAT model exactly (`src/engine/keyRepeat.ts`: one shared repeat
  counter, 40-tick start delay, 5-tick continue delay, reset on any change
  to the held combination) - pinned against a hand-derived tick sequence in
  `tests/keyRepeat.test.ts` (fires at ticks 1, 41, 46, 51...). Wired the
  draft screen's cursor mode (`LEFT`/`RIGHT` with wrap,
  `Select_UpdateBallCursorPosition`) and menu mode (`A` opens SUMMARY/RENT/
  OTHERS with `menuCursorPos=0`, `UP`/`DOWN` navigate with wrap, `B` OR `A`
  on OTHERS closes back to cursor mode - `Select_OptionOthers` is a no-op
  cancel, confirmed from source) into `src/engine/core.ts`'s `tick()`, all
  pinned by 12 new hermetic tests in `tests/draftScreen.test.ts`. Extracted
  the 6 anchor rental-pool species' header text (species name + Pokedex
  category) via a new `tools/extract/extract-species-header.ts` reading
  `species_names.h` + `pokedex_entries.h`, replacing S1's placeholder empty
  slots 2-6 (`src/data/gen/draft-pool-header.json`). Extracted the menu
  highlight sprite pair (`menu_highlight_left/right.png`) and render the
  SUMMARY/RENT/OTHERS popup text + highlight bar when the menu is open.
  Reverse-engineered (and probed against the oracle) the exact settle
  timing for cursor moves, key-repeat, menu nav, and menu open/close - see
  `ROADMAP.md` Domain notes; also discovered idle screens only stay
  pixel-stable for ~104 frames before a previously-unknown species-name
  color pulse (`Select_Task_FadeSpeciesName`) kicks in, and kept both new
  traces safely under that.
- **Next:** The ball-open reveal (`Task_OpenMonPic`/`Task_CloseMonPic`'s
  WIN0 growth + `BG3`/`BG1`/`OBJ` alpha blend, plus the front-sprite
  extraction for ONIX/MAGBY/BAYLEEF/BUTTERFREE/HAUNTER/QUILAVA) is the one
  remaining piece for S2 - `ISSUES.md` #2 has the full mechanism, register
  values, and timing already reverse-engineered; re-run
  `draft-menu.json` (already committed with dense captures over both
  transitions, on 2 different slots) to check progress once implemented.
  After that: S3 is proceeding in a parallel worktree (rental data/RNG) -
  don't touch `src/engine/rng.ts` or `src/data/gen/rental*`/`anchor-state.json`.
- **Notes:** PAPERCUT: none this session - the oracle's dense-capture probing
  loop (`bin/oracle run <trace> -o <dir>` + comparing manifest sha256s) was
  fast and effective for reverse-engineering exact frame timing; no friction.

---

## 3 — S1 worker: font glyph fix closes the anchor compare — S1 COMPLETE

- **State:** S1 acceptance fully met. `npm run compare -- tools/compare/
  traces/anchor.json` → **1/1 frames matched, 0 diff, ssimMean=1.0000, exit
  0** (was 2161/38400px, 5.63%). `npm test` 22/22 green, `npm run build`
  green, `npm run dev` serves (curl 200 on `/` and `/src/main.ts`; still no
  real-browser check — no headless browser available in this session
  either).
- **Did:** Fixed `ISSUES.md` #1 (now deleted). Two distinct bugs in
  `src/engine/font.ts`, both pinned against `reference/pokeemerald/src/
  text.c`: (1) the raw-glyph-pixel → color role mapping was wrong — traced
  `sFontHalfRowOffsets`/`GenerateFontHalfRowLookupTable` (text.c:41-51,
  363-511) by hand and confirmed it is **not** a blend of adjacent source
  pixels (contra the ISSUES.md lead) but a per-pixel remap table (raw 0-3 →
  role bg/fg/shadow, raw 3 folds back onto role 0/bg) vectorized 4-at-a-time
  for GBA speed; also ported `GLYPH_COPY`'s "skip writing when the resolved
  color index is literal 0" transparency rule (text.c:585), replacing the
  old "raw===0 is always transparent" logic. Verified empirically against
  oracle pixel colors (text.pal index1=black=bgColor, index2=white=fgColor
  matches the observed title-text look) before committing. (2)
  `DecompressGlyph_Normal` (text.c:1883) hardcodes `gCurGlyph.height = 15`
  for Latin glyphs regardless of the 16px cell size — our render loop used
  the full `cellSize` and leaked stray bgColor pixels into the row directly
  below the title text. Added `glyphHeight` to `font-normal.json`/`FontData`
  and capped the row loop to it; re-ran the extractor (only `font-normal.
  json` changed). Updated the pinned hash in `tests/anchorRender.test.ts`
  and the `FontData` test fixture in `tests/font.test.ts`. Ticked S1 `[x]`
  in `ROADMAP.md`.
- **Next:** S2 — draft-screen interaction parity (cursor movement, header
  text, A → ball-open + SUMMARY/RENT/OTHERS menu, B/close, message-box
  updates). See `ROADMAP.md` S2 acceptance criteria. S3 (rental data/RNG)
  is running in a parallel worktree per the supervisor's scoping — don't
  touch `src/engine/rng.ts` or `src/data/gen/rental*`.
- **Notes:** No headless browser tooling (playwright/puppeteer) is
  installed in this run; `npm run dev` has only ever been curl-smoke-tested,
  not visually verified. Worth adding if a future stage needs real DOM/
  canvas verification.

---

## 5 — Supervisor: S3 merged from worktree lane — S3 COMPLETE

- **State:** Merged `worker/wt-20260717-012856` (S3: RNG core, rental data,
  anchor RAM dump) into master; on the merged tree `npm test` **91/91**
  green, `npm run build` green, `anchor.json` 1/1 and `draft-cursor.json`
  13/13 still 0 diff. Worktree + branch cleaned up. S3 ticked `[x]` in
  ROADMAP; S2 remains `[~]` with `ISSUES.md` #2 (ball-open reveal) open.
- **Did:** Verified S3 in the worktree (74/74 there; LCG constants checked
  against `random.c`; dump spot-checked: `gRngValue 0xd2ddeec8`, six
  species in pinned order with RAM-read Lv50 stats). Added the
  `sFactorySelectScreen` finding to ROADMAP Domain notes.
- **Next:** Finish S2 via `ISSUES.md` #2 (mon-pic window growth + GBA
  5-bit-space alpha blend + 6 front-sprite extraction), then S4.
- **Notes:** Statics aren't in the linker map — `nm` on the pinned ELF
  resolves them (recipe in `tools/extract/inspect-anchor.py`).

---

## 6 — Ball-open reveal landed (38/38); every-frame capture exposes transients

- **State:** `npm test` **106/106**, `npm run build` green. Compares:
  `anchor.json` 1/1, `draft-cursor.json` 13/13, `draft-menu.json` **38/38**
  — all 0 diff. NEW `draft-menu-slot6.json` (every-frame captures 0-65)
  → **40/66**: the ≤4-frame-spaced traces skip transient frames that are
  not yet exact. S2 stays `[~]`; remainder is `ISSUES.md` #3 (clusters +
  diff forensics there). ISSUES #2 deleted (fixed: reveal + blend + 6 front
  sprites, monPic sub-state Tier-1-pinned).
- **Did:** Worker landed the mon-pic reveal (WIN0 growth, 5-bit-space
  blend, front-sprite extraction for all 6 species) + 15 hermetic tests;
  hit its 50-min cap while building the slot-6 trace. Supervisor verified
  all compares/tests, ran the unfinished trace, inspected diff PNGs,
  filed #3 with per-cluster diagnosis, committed the trace.
- **Next:** Fix `ISSUES.md` #3 → `draft-menu-slot6.json` 66/66, then tick
  S2 `[x]`. Then S4 (summary screen).
- **Notes:** Transient mechanisms are all in battle_factory_screen.c
  (affine open anim, redraw scheduling, close-phase sprite visibility).

---
## 12 — S4 slice 1 (worker, capped): Info-page extraction landed; renderer/traces still NOT reached — S4 stays [~]

- **State:** `npm test` **146/146** (138→146, +8 new), `npm run build`
  green. Existing traces (`anchor`, `draft-cursor`, `draft-menu`,
  `draft-menu-slot6`) untouched, still 0 diff (not re-run this session but
  no shared code was touched). **`summary-info-onix.json`/`-magby.json`
  were NOT produced** — no Info-page renderer exists yet, so there is
  nothing to capture against. `ROADMAP.md` S4 stays `[~]`.
- **Did:** Closed the slice-1 blocker the brief asked for first:
  `tools/extract/extract-summary-info.ts` extracts, for the 6 anchor
  species, National Dex number (RAM-probed `FLAG_SYS_NATIONAL_DEX` at the
  anchor to confirm National — not Hoenn — numbering applies, bit read
  back `1`/TRUE), types, and `genderRatio` from `species_info.h`, plus
  ability name+description text for every ability the pool uses, into
  `src/data/gen/summary-info.json`. Added `src/engine/monGender.ts`
  (pure port of `GetGenderFromSpeciesAndPersonality`). Both pinned in
  `tests/summaryInfo.test.ts` (8 new tests) against the anchor's real
  personality values (e.g. confirms ONIX shows male, MAGBY female).
  Then spent the remainder of the session's budget researching the
  renderer itself (window pixel geometry, text-color tables, sprite
  positions/priorities/anchoring, BG-layer reasoning, a nature-memo
  two-tone-color-code gap in `font.ts`, a few unresolved assumptions) and
  wrote it all up as `docs/summary-screen-notes.md` §7 rather than ship
  unverified rendering code with no oracle pixels behind it — building the
  actual `summaryInfoPage.ts` renderer, wiring `summaryScreen.ts`+
  `paletteFade.ts` into `core.ts` (confirmed **zero existing call sites**
  for either), and capturing/debugging the two dense traces against the
  oracle is real multi-hour work that didn't fit in what was left of this
  session's cap after the research above.
- **Next:** Follow `docs/summary-screen-notes.md` §7 directly — it's a
  resolved implementation spec, not a scouting task: (1) build
  `src/engine/summaryInfoPage.ts` (BG3 tilemap via `drawTileBg` + all
  text windows via `drawText` + type icon/markings/ball/mon-front sprites
  via `drawSprite`); (2) resolve the 4 flagged open items before trusting
  pixels — nature-memo two-tone color codes (§7's caveat), mon-sprite
  `hFlip` table membership for the 6 species, rental-mon caught-ball item
  (assumed but unverified `ITEM_POKE_BALL`), and markings anim-frame-0
  appearance; (3) wire `summaryScreen.ts`+`paletteFade.ts` into
  `core.ts`'s `EngineState`/`tick()`/`render()` per §7's exact branch
  points; (4) only then capture `summary-info-onix.json`/`-magby.json`
  (dense through both fades + the settled +59..+64 window; probe MAGBY's
  own stable window independently, don't assume ONIX's) and iterate to 0
  diff.
- **Notes:** This is the same "stop rather than ship a guessed renderer"
  call the prior slice made for the fade math — the difference this time
  is the blocker (extraction) is actually closed, and the open unknowns
  left for next time are few, named, and cheap to resolve (each is one
  more source grep), not a wide-open scouting problem. `PAPERCUT`: none
  new this session — the RAM-inspection recipe for a single save flag
  (national dex) was fast once `inspect-anchor.py`'s pattern was reused.

---
