# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 23 — S5 slice 2 (worker, capped): Priority 1 (post-confirm cursor-input gate) FIXED and Tier-1-pinned; Priority 2's two/three-simultaneous-stall question RAM-CONFIRMED CORRECT with no fix needed, but a narrower, different bug found and left open — ISSUES #7 updated, not deleted

- **State:** `npm test` **264/264** (261→264: +2 `cursorInputGate.test.ts`,
  +1 `monPic.test.ts`), `npm run build` green. All 7 existing traces
  untouched (`rent-slot1.json` still 125/139). One commit landed
  (`isCursorInputReady` fix + tests); no `ballAnimStall` code change this
  session (root cause of the narrower remaining bug not yet found - see
  ISSUES #7).
- **Did (Priority 1 - DONE):** Found the exact gate:
  `Select_Task_HandleChooseMons` (`battle_factory_screen.c:1671-1673`)
  early-returns - dropping LEFT/RIGHT/A-open alike, not just cursor moves -
  for as long as `sFactorySelectScreen->monPicAnimating` is TRUE (set the
  instant `CloseMonPic` fires, cleared only once the flash-shrink sprite's
  affine anim ends). RAM-verified the exact tick boundary (direct
  `monPicAnimating` reads, empirically-found struct offset 672): replaying
  `RENT_SLOT1` (confirm press-tick 37), a `RIGHT` at tick 56 is dropped,
  tick 57 (where `monPicAnimating` first reads FALSE) is accepted - exactly
  matches `MonPicState.phase` flipping `"closing"`→`"closed"`. Added
  `isCursorInputReady` (`monPic.ts`, mirrors `isMonPicInputReady`'s open-side
  gate) and gated `core.ts`'s cursor-mode branch on it. Pinned with
  `tests/cursorInputGate.test.ts` + a `monPic.test.ts` unit case.
- **Did (Priority 2 - partially resolved, real remaining bug found):** Built
  a fresh 3-ball RAM probe (`≥40`-tick dwell before every cursor move, per
  the brief) covering rent slot0 → `RIGHT` → rent slot1 (2 balls active) →
  `RIGHT` (the critical 2-simultaneously-active-ball trigger) → rent slot2
  (3 balls active). **Result: `gRngValue` matches bit-exact between RAM and
  engine on all 37 sampled ticks around that trigger** - `ballAnimStall`'s
  existing `activeSlotsBeforeAction` formula (stall *every* active ball, not
  just one) was already correct; no model change needed. A further probe
  step (pressing `RIGHT` a 4th time, past the 3rd/final rent) showed a real
  divergence, but that's `Select_OptionRentDeselect` handing off to the
  YES/NO reveal screen once all 3 picks are made - out of scope per the
  brief, not a `ballAnimStall` bug. Then reproduced ISSUES #7's *original*
  pixel symptom directly (entry 21's own repro shape, `npm run compare` on a
  scratch trace): frames 124/155/163 **still mismatch** - so the fix above
  doesn't resolve this issue. Cross-referencing the same script's RAM vs
  engine `gRngValue`: the two streams match bit-exact through tick 203
  (spanning every frame the pixel mismatches land on) and diverge for the
  first time at **tick 204** - ball 0 (which has accumulated 4 cumulative
  stall events by then, more than any existing pinned test reaches) misses a
  resting→moving reroll transition that RAM shows firing on schedule. Ran
  out of session time before isolating which `ballAnim.ts` internal counter
  is off. Full evidence and next steps: ISSUES #7 (updated, not deleted -
  per the brief's own instruction not to guess a stall model without RAM
  proof).
- **Next:** dump `gSprites[0]` densely from tick ~195-210 (RAM + engine) to
  find the exact `ballAnim.ts` counter desync, fix, re-verify
  `ballAnim.test.ts`/`ballAnimMultiBall.test.ts` stay green unchanged, pin a
  new Tier-1 test, then delete ISSUES #7 and build `rent-3picks.json`.
- **Notes:** Stretch (`rent-3picks.json`) not attempted - Priority 2 took
  the full remaining budget. PAPERCUT: none beyond the usual oracle
  round-trip overhead (~6 oracle/RAM-probe round-trips this session, plus 2
  `npm run compare` runs on scratch traces, none committed).

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

