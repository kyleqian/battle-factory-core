# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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


