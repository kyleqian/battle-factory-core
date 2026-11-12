# Walk-up build step A — design memo (PreBattleRoom call-scene + general pre-battle menu)

Side-lane scoping deliverable, read-only otherwise (per this session's step
brief). Builds on `docs/noland-walkup-dialogue-scoping.md` (ground truth +
the 2026-08-14-eve FAITHFUL decision), `docs/noland-silver-walkup-
presentation-map.md` (oracle reachability), and the just-landed walk-up
build step B1 (`1ba2e101`/`c4e963f0`, the BattleRoom-entrance brain branch).
No `src/` or test changes in this step; the design below is a plan for the
worker(s) who build it.

## 1. Current-state census

### 1.1 `src/engine/prebattleRoom.ts` — the linear post-menu tail, not a menu

The module is a 9-phase timed state machine (`fadingOut → black → fadingIn →
roomHold → printing → idle → messageClosing → walking → warpFade`) that
types exactly one string (`MESSAGE_TEXT = "Right this way, please!"`), waits
for an A-press, then runs a baked 80-tick walk table into a warp-fade
handoff to `battleRoom.ts`. **It has no menu, no call-scene, no swap ask,
matching its own header ("S5 final slice")** — this is genuinely the whole
of what exists today, for every battle number and both brain and ordinary
opponents alike.

`core.ts` drives it from **two structurally different entry points**,
already diverging in exactly the way the ROM's own `VAR_0x8006` branch does
(`noland-silver-walkup-presentation-map.md` §0):

- **Fresh-draft entry** (`core.ts:2163`, `wasAccepting && confirmReveal ===
  null` → `prebattleRoom = INITIAL_PREBATTLE_ROOM_STATE`, phase
  `"fadingOut"`): fires once, off the draft-accept path. Runs the *full*
  machine from the top, including its own `printing`/`idle` of "Right this
  way, please!" — because for a genuine first-battle-of-challenge entry the
  ROM has no menu to show either (§0's finding: `VAR_0x8006` is neither 1
  nor 2, so `EnterRoom` falls straight through to `EnterBattleRoom` with no
  `AskReady*` gate at all). **This is correct as-is and step A must not
  touch it.**
- **Generated-round handoff** (`core.ts:1119`, inside the
  `factoryRoundBattleOrchestrator`-driven tick branch): fires once
  `postwin.ts`'s own swap-decline resolves and its own "Right this way,
  please!" dismiss is accepted. It hands off **directly into
  `prebattleRoom`'s `"messageClosing"` phase**, skipping
  `fadingOut/black/fadingIn/roomHold/printing/idle` entirely — because
  `postwin.ts` already rendered and dismissed that exact same string itself
  (see §1.2). `prebattleRoom.ts` is reused here **only for its walk/warp
  tail** (events past #7 in §1.1's table).

Both entries converge on the same `battleRoomStateForOpponent(currentOpponent,
...)` call (`core.ts:1037`, B1's own seam) once `warpFade` reaches its fixed
elapsed count — this call already branches on `currentOpponent.frontierBrain`
and needs no change from step A.

`tools/soak/randomRoundSoakDriver.ts` drives both entries the same way: once
`state.prebattleRoom` or `state.battleRoom` is set, it just presses A every
tick (`:317-318`) — it has no branch-selection logic there because there is
currently nothing to select. It *does* already drive `postwin`'s
continuation-menu cursor and RECORD/RETIRE YES/NO (`:665-714`), i.e. the
soak already knows how to exercise a `MULTI_GO_ON_RECORD_REST_RETIRE`-style
menu; step A's brain branch should reuse that existing capability, not
duplicate it.

### 1.2 `src/engine/postwin.ts` — the existing GO ON/RECORD/REST/RETIRE menu, and where it actually lives

The step brief asks whether the postwin menu is a existing surface to
relocate. It is: **`postwin.ts` is the app's only implementation of
`MULTI_GO_ON_RECORD_REST_RETIRE`, and it is already the *ordinary*
`AskReadyForOpponent` flow** — `createPostwinStateFromRound` is called for
**every** `battleWon` regardless of `round.rules.battleIndex`
(`core.ts:687-694`), so the menu is already structurally reused across
battles 2‑7, not a battle-1-only fixture. Concretely, `postwin.ts` already
covers, in order: the shared heal line (`POSTWIN_HEAL_LINE1/2` = §1.1's
`Text_LetUsRestoreMons`, byte-identical), the continuation menu itself
(`continuationCursorPos`/`acceptPostwinContinuation`), three scouting
dialogue pages (`dialoguePage` 1‑3, opponent-commentary text — **ordinary-
match-only content with no §1.1 analogue**, see §3), the swap-offer YES/NO
(`dialoguePage` 4), and its own "Right this way, please!" typing/dismiss
(`postwinRightThisWayVisibleChars`/`acceptPostwinRightThisWayDismiss`) —
which is what hands off into `prebattleRoom`'s `messageClosing` tail.

One existing gap, unrelated to brain work but relevant to "the same menu for
ordinary matches 2‑6": the continuation-menu and reprint text is the literal
constant `POSTWIN_NEXT_LINE1 = "The 2nd match is next!"`
(`postwin.ts:167-168`), **not parameterized by `battleIndex`** — every win
currently shows "2nd match" text regardless of which battle just ended. This
predates step A and is out of this memo's scope to fix, but a brain branch
built alongside it should not paper over it, and a future ordinal-text pass
is implied by "ordinary matches 2-6 show the same menu" if that's ever
exercised end-to-end.

**Menu semantics already decided by the user (ISSUES #73, cited verbatim in
`postwin.ts`/`core.ts`/`docs/postwin-record-retire-ground-truth.md`
:4-8,240-241):**
- **GO ON** → continues (dialoguePage 1, scouting pages, swap offer, walk).
- **RECORD** → stub-only: exact dialogue box ("…battle was recorded…"), no
  real persistence beyond the in-session `disableRecordBattle` flag (which
  *is* real ROM behavior — `SaveRecordBattle` sets
  `frontier.disableRecordBattle` unconditionally on every successful save,
  dropping RECORD from the re-asked menu, `MULTI_GO_ON_REST_RETIRE`).
- **REST** → deliberately unselectable (`acceptPostwinContinuation`'s
  `cursorPos === 2` branch is a no-op) — a deliberate divergence, not an
  oversight.
- **RETIRE** → fully implemented: `beginPostwinQuestion(state, "retire")` →
  YES warps through the existing loss-lobby terminal flow
  (`renderPostwinRetireWarp`, reuses `createFactoryTerminalLossPresentation`
  with `type: "roundLost"`).

This is oracle-verified for the ordinary path (`docs/postwin-record-retire-
ground-truth.md`'s dense trace, frames/rows cited at :35-100,374).

## 2. Step-A design

### 2.1 Where the brain branch slots in

**Recommendation: extend `postwin.ts`'s state machine with a brain-flavored
branch, not a second menu module or a `prebattleRoom.ts` fork.**
`prebattleRoom.ts` stays exactly what it is today — the shared walk/warp
tail, entered at `"messageClosing"` by whichever route (ordinary or brain)
finishes its own "Right this way, please!" dismiss — because §1.1's own
`EnterBattleRoom` (event #7 on) is verbatim identical for both, and that's
already implemented and oracle-pinned.

The new content is everything **before** that shared tail, all of which is
`postwin.ts`'s territory today for the ordinary case:

1. **Call-scene** (§1.1 events #1‑3: phone SE, attendant walk-away/return,
   3-page boss message) — new. Gated on `currentOpponent.frontierBrain !==
   undefined`, inserted immediately after the existing shared heal line
   (`healDismissElapsed`/`POSTWIN_CONTINUATION_MENU_VISIBLE_DELAY` window),
   replacing the ordinary route's direct fall-through into the continuation
   menu.
2. **`AskReadyForHead`** (§1.1 event #4) — the *same*
   `MULTI_GO_ON_RECORD_REST_RETIRE` cursor/menu machinery
   (`continuationCursorPos`, `acceptPostwinContinuation`,
   `beginPostwinQuestion`, all four RECORD/REST/RETIRE branches) **reused
   unchanged**, with only the prompt text swapped ("The FACTORY HEAD is
   demanding you.\nAre you prepared to face him?" vs. "The Nth match is
   next!\nAre you ready?"). This is the direct answer to the brief's
   reconciliation question: it is neither a relocation nor a second
   instance — it is the existing menu's state machine parameterized by a
   `brain: boolean` (or equivalent) mode flag, text-only divergence.
3. **`AskSwapBeforeHead`** (§1.1 events #5‑6) — a *shorter* variant of the
   existing swap-offer step: one "I can't tell you anything about the
   FACTORY HEAD" line, then straight to the YES/NO swap prompt — **skipping
   the three ordinary-match scouting pages** (`dialoguePage` 1‑3 have no
   §1.1 analogue at all; brain's `AskSwapBeforeHead` goes straight from GO
   ON to the swap ask). The existing `dialoguePage` state field would need a
   brain-specific short path (GO ON → page "swap ask" directly, skipping
   1‑3) rather than reusing the 0→1→2→3→4 sequence verbatim.
4. **`EnterBattleRoom`** (§1.1 event #7) — already implemented, unchanged
   (§1.1 above).

### 2.2 State needed

No new persistent/session state is required. Step A's content is either
(a) identical every time (all 7 message-box events in §1.1's table fire the
same way on every brain encounter, first or repeat — unlike B2's silver/gold
personality speech, which *does* need the `HEARD_BRAIN_SPEECH` per-tier
flag, but that flag belongs to `battleRoom.ts`'s brain-speech step, not to
step A) or (b) derivable from fields that already exist:

- `round.rules.currentOpponent.frontierBrain` (`BattleOpponent.frontierBrain`,
  `battleScenario.ts:67`) — presence alone selects the brain branch; the
  `.status` sub-field (silver/gold/streak/streak-long) is **not** needed by
  step A (§1.1's call-scene/menu content doesn't vary by tier), only by B2.
- `round.rules.battleIndex` — already threaded into `createPostwinStateFromRound`,
  needed for the *ordinary* branch's (pre-existing, not step-A's problem)
  ordinal text gap noted in §1.2.

### 2.3 Ordinary-vs-brain branch shape

```
heal line (shared, unchanged)
  -> currentOpponent.frontierBrain?
       no  -> AskReadyForOpponent (existing continuation menu, existing text)
       yes -> call-scene (new: phone SE + attendant move x2 + 3-page message)
              -> AskReadyForHead (existing continuation menu, new prompt text)
  -> GO ON selected ->
       no  -> 3 scouting pages -> swap offer (existing)
       yes -> AskSwapBeforeHead (new: 1 line, no scouting pages) -> swap offer
  -> swap declined (existing) -> "Right this way, please!" (existing) -> prebattleRoom tail (existing, unchanged)
```

## 3. Menu semantics reconciliation

The brief asks whether step A is a relocation, extension, or second instance
of the existing menu, and what the user's RECORD/REST/RETIRE decisions imply
for the brain instance.

**It's an extension** (§2.1): one state machine, mode-flagged, not a new
surface. §1.1's source table shows the multichoice is the literal same
`MULTI_GO_ON_RECORD_REST_RETIRE` constant at the same event slot as the
ordinary flow's own menu — there is no ROM evidence of a brain-specific
variant of the menu itself, only of the text immediately before it and the
absence of scouting pages immediately after GO ON.

**RECORD/REST/RETIRE semantics carry over unchanged, by inference, not by
direct verification** — flagged as an open question below because no oracle
evidence exists (§4) to confirm e.g. whether the RECORD-YES message text
differs when recording a brain battle, or whether RETIRE mid-brain-encounter
has facility-progression consequences (symbol tracking) beyond the shared
presentation. The latter is round/facility-progression state, which per
`AGENTS.md`'s lane table belongs to **main**, not side — step A should only
build the presentation (menu shows, RETIRE warps through the existing
loss-lobby flow) and explicitly leave any symbol/progression bookkeeping on
brain-retire as a follow-up for whichever lane owns `round`/`rules` state.

**RESOLVED BY SOURCE EVIDENCE (2026-08-15 supervisor, same session):**
RETIRE against the Frontier Brain needs NO brain-specific handling. Both
menus route cases 1/2/3 to byte-identical script labels
(`AskRecordBattle`/`AskPauseChallenge`/`AskRetireChallenge` — compare
`scripts.inc:92-98` (ordinary) with `:354-359` (brain); the ONLY case-0
divergence is `AskSwapMon` vs `AskSwapBeforeHead`, plus the intro
message). The ROM has no brain-flavored retire path, so FAITHFUL means
the user's existing RECORD-stub/REST-unselectable/RETIRE-loss-lobby
decisions carry over verbatim; no new user decision is needed.

## 4. Acceptance plan

| Sub-step | Tier-1 (pins) | Oracle evidence | Notes |
| --- | --- | --- | --- |
| Call-scene (phone SE, attendant move, 3-page message) | Yes — `factory-brain-walkup-script.json`'s `preBattleRoomCallScene` scene is already source-pinned by `tests/factoryBrainWalkupScript.test.ts`; new tests pin the `postwin.ts` brain-branch phase/dialogue-index transitions the same way `postwin.test.ts` already pins the ordinary flow | **None available today.** `noland-silver-walkup-presentation-map.md` §0: the only `factoryBrain`-staged lab path falls through the fresh-draft branch (`VAR_0x8006` never 1 or 2) for *both* silver and gold, skipping events #1‑6 entirely. Root cause is a `BattleLab.prepare()` staging gap, explicitly out of scope for a docs-only step to fix. | Zero pixel/behavior evidence exists or can exist until the harness gap closes — a prerequisite, not a blocker to be worked around in-engine. |
| `AskReadyForHead` menu (text + multichoice) | Yes, same as above | Same as above — blocked | Cursor/RECORD/REST/RETIRE *mechanics* reuse code already oracle-verified via the *ordinary* menu (`docs/postwin-record-retire-ground-truth.md`); only the brain-specific prompt text and gating are new and unverified. |
| `AskSwapBeforeHead` (short variant, no scouting pages) | Yes, same as above | Same as above — blocked | |
| `EnterBattleRoom` tail (walk/warp) | Already covered (`tests/prebattleRoom*.test.ts`) | Already oracle-pinned (`noland-silver-walkup-presentation-map.md` §2, frames 456‑627) | **No change** — step A must not touch this path or its tests. |
| Ordinary `AskReadyForOpponent` menu (unchanged) | Already covered (`tests/postwin.test.ts`) | Already oracle-pinned (`docs/postwin-record-retire-ground-truth.md`) | **Differential requirement:** every existing `postwin.test.ts`/`prebattleRoomFlow.test.ts` case must keep passing byte-for-byte after the brain branch lands — the mode flag must default to the exact current behavior when `frontierBrain` is absent. Any refactor of shared code (continuation-menu cursor, RECORD/RETIRE question machinery) needs a before/after diff against these tests, not just "tests still green" (a shared-code refactor could accidentally pass by coincidence on a small suite). |

**Bottom line:** step A can be built and Tier-1-pinned entirely from source
truth (the JSON is already extracted and tested), but its brain-specific
half has **no oracle acceptance available** until the `BattleLab.prepare()`
`VAR_0x8006`/call-scene staging gap is fixed — that fix is infrastructure
work (`oracle/battle_lab.py`), not a `src/` change, and is a separate,
dispatchable prerequisite if dense pixel verification is wanted before
shipping rather than after.

## 5. Dispatchable worker briefs

**Brief 1 — `postwin.ts` brain-mode call-scene + `AskReadyForHead` (Tier-1 only).**
Goal: extend `postwin.ts`'s state machine with a brain branch: insert the
call-scene (phone SE, attendant walk-away/return, 3-page boss message) after
the heal line when `currentOpponent.frontierBrain` is set, then reuse the
existing continuation-menu machinery with `AskReadyForHead`'s prompt text
instead of `AskReadyForOpponent`'s. Wire `core.ts`'s
`createPostwinStateFromRound` call site to pass the brain fact through.
Acceptance: new Tier-1 tests pinning the JSON-sourced text/sequencing
(mirroring `postwin.test.ts`'s existing idiom); every existing
`postwin.test.ts` case unchanged and green (non-brain path byte-identical).
No oracle evidence expected or required (§4). Out of scope: `AskSwapBeforeHead`
(brief 2), any silver/gold text (B2's job), any facility-progression change
on brain-RETIRE (flag as an open question, don't implement).

**Brief 2 — `AskSwapBeforeHead` short-path + soak driver update.**
Goal: brain's post-GO ON path skips the three ordinary scouting pages
straight to a one-line "can't tell you anything about the FACTORY HEAD"
message then the swap YES/NO — extend `postwin.ts`'s `dialoguePage`
sequencing (or equivalent) with this shorter brain variant, converging back
into the existing swap-decline → "Right this way, please!" → `prebattleRoom`
handoff unchanged. Update `tools/soak/randomRoundSoakDriver.ts` (§1.1's
`:665-714` region) to recognize and randomly exercise the brain branch the
same way it already exercises the ordinary one. Acceptance: Tier-1 tests for
the short-path sequencing; a short soak run (not a long one — house rule)
confirming no crashes/divergence through the brain branch when a fixture
opponent has `frontierBrain` set. Out of scope: any oracle claim (§4, still
blocked); silver/gold speech content (B2).

**Brief 3 (infrastructure prerequisite, dispatch only if dense oracle
verification of step A is wanted before it ships) — fix `BattleLab.prepare()`'s
`factoryBrain` staging so the call-scene is reachable.** Goal: per
`noland-silver-walkup-presentation-map.md` §0's root cause, write
`VAR_0x8006 = 1` (and whatever transient state `ReturnToRoomFromBattle`
expects) when staging a `factoryBrain` scenario in `oracle/battle_lab.py`,
so a lab-staged trace takes the `ReturnToRoomFromBattle` branch instead of
the fresh-draft fallthrough. This is oracle-service infrastructure, not
`workspace/src/`, and outside a normal side-lane's file scope — likely a
main-lane or dedicated infra task. Acceptance: a re-run of the silver
walk-up dense-capture fixtures shows the call-scene's 3 message boxes and
the `AskReadyForHead`/`AskSwapBeforeHead` prompts actually on screen, not
the observed direct-to-"Right this way" fallthrough.
