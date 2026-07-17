# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

