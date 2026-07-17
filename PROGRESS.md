# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 24 — S5 slice 2 (worker, capped): STOPPED before implementing a fix — ISSUES #7's tick-204 mystery fully root-caused (RAM-DISPROVEN: `ballAnimStall`'s LEFT/RIGHT branch over-stalls once 2+ balls are active), but the exact replacement rule needs one more RAM data point before it's safe to code

- **State:** unchanged from entry 23 — `npm test` **264/264**, `npm run
  build` green, all traces untouched. **No `src/`/`tests/` changes this
  session, no commits** — per the brief's own fallback ("if the rule
  resists within the cap, commit nothing half-wired, update ISSUES #7,
  stop"), since the corrected rule isn't yet pinned down to more than 2
  data points (see ISSUES #7).
- **Did:** Found a bug in every prior session's own RAM-probe methodology:
  the `struct Sprite` offsets cited for `animNum`/`animCmdIndex`/`data[0]`
  (this entry's own history, `ISSUES.md` #7) don't match
  `reference/pokeemerald/include/sprite.h:194-242` — `animNum`/
  `animCmdIndex` were swapped and `data[0]` was read as a `u8` instead of a
  2-byte `s16`. Rebuilt the RAM probe (`EmeraldOracle`, corrected offsets)
  against entry 21/23's own exact original repro (confirms at press-ticks
  37/113/189) and cross-referenced every `MOVING_CMDS`-cadence transition
  against its zero-stall-expected tick, per ball, per trigger. Result: the
  tick-204 divergence is fully explained — ball 0's 2nd roll (a FAILURE,
  same shape as the single-ball baseline's own frame-201 FAILURE,
  `tests/ballAnim.test.ts`) lands at exactly 201 + (3 real stalls) = 204,
  bit-exact with RAM. But only **3** of ball 0's 4 previously-assumed
  triggers actually cost it a tick: `RIGHT`#1 (1 ball active) and both
  RENT-confirms (#2, #3) do; `RIGHT`#2 — pressed once 2 balls (0 and 1) are
  already active — costs **neither** ball a tick, independently confirmed
  via `cursorPos` genuinely moving (not gate-dropped). The current code
  still stalls both on `RIGHT`#2 (a spurious 4th stall), landing its
  predicted roll one tick late — exactly matching entry 23's own
  observation. This directly overturns entry 23's "RAM-CONFIRMED CORRECT"
  verdict for the 2-simultaneous-stall LEFT/RIGHT case; that verdict was
  built on the same wrong offsets and/or too narrow a sample window to
  reach the ~30-tick-later transition where the missing stall becomes
  visible.
- **Next:** one more RAM data point before coding a fix (only 2 RIGHT
  presses were probed, at 1-active and 2-active — not enough to distinguish
  "stalls only when exactly 1 ball active" from "only the first-ever RIGHT
  ever costs a tick" from a directional LEFT/RIGHT asymmetry): probe a 3rd
  RIGHT press (3 balls active) and/or a LEFT press with 2 active. Then a
  likely-small `core.ts` change narrowing the LEFT/RIGHT branch's
  `ballAnimStall` assignment, re-verify `ballAnim.test.ts`/
  `ballAnimMultiBall.test.ts` stay green unchanged (confirmed this session
  they don't already cover — and so can't already contradict — a
  RIGHT/LEFT-with-2+-active-balls scenario), pin a new Tier-1 test
  (including the tick-204 checkpoint), RAM-verify pixels at frames
  124/155/163, then build `rent-3picks.json` per the brief.
- **Notes:** Full evidence table (per-trigger, per-ball shift/no-shift) is
  in ISSUES #7. All probing was scratch Python under `/tmp` (mGBA/
  `EmeraldOracle` recipe, not committed, per instructions) — no `src/`
  edits were at risk of being lost. PAPERCUT: none beyond the usual
  oracle-round-trip overhead; the offset-mislabeling bug cost real time
  this session (~15 min chasing a nonsensical decrementing "animCmdIndex"
  before checking `sprite.h` directly instead of trusting inherited
  offsets) — worth flagging for future RAM-probe work: verify struct
  offsets against the actual header before reusing offsets cited in prior
  session notes.

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


