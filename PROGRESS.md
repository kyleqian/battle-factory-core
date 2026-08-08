# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1012 — [bounded MAIN worker, 2026-08-08] **`AI_CheckBadMove` preamble live-verified 4/4 against the real ROM — the scorer's first hardware receipts (gate A x0-immune exit + gate B `get_ability` redraw quirk both confirmed)**

- **State:** master `faa6702e`, tree clean. No engine edits. Full `npm test`
  **794 files / 7998 passed / 1 skipped, exit 0**; `npm run build` exit 0;
  `npm run typecheck` exit 0; smoke green.
- **Did:** opened the `AI_CheckBadMove` live-verification programme (109
  ported handlers, previously zero hardware checks) by verifying the
  **universal preamble** (`data/battle_ai_scripts.s:51-104`) with the
  established reach/control recipe. New fixtures
  `tools/battle-lab/mechanic-factory-ai-cbm-preamble-{control,reach}-off.json`
  stage Factory trainer Shuckle (TACKLE×4) vs a corpus player target through
  `mechanicLab overrides.parties`; new
  `tools/probe/verify-factory-ai-cbm-preamble-live.ts` prints the ROM-observed
  decision block (seeded after the unmodeled `gRandomTurnNumber` [1], ISSUES
  #83's known seam) beside `chooseFactoryAiScoredDecision` output, plus the
  ROM's PP-selected slot. **4/4 MATCH across seeds 1+2**: control (LUDICOLO,
  two abilities, Normal TACKLE not immune) 13 draws / slot 2-3 / endpoint
  exact; reach (BANETTE, Ghost, Normal x0) 5 draws / slot 1-2 / endpoint
  exact. **Gate A** (x0 → `Score_Minus10` before ability read #1) observable:
  all reach slots CBM **-10**, **0** draws. **Gate B** prediction confirmed:
  two-distinct-ability target costs exactly **2 `get_ability` draws per scored
  slot** (8 CBM draws, the port's load-bearing redraw claim), immune exit 0.
  Banked in `tests/factoryAiCbmPreambleLiveReceipt.test.ts` (6 tests: all four
  ROM rows — draw/CBM-draw counts, delta & score vectors, chosen slot, endpoint
  RNG — plus both rows' exact draw-kind sequences). Write-up in the required
  NEW file `docs/factory-ai-cbm-live-receipts-preamble.md` (ground-truth
  addendum structure; side lane is appending to the shared doc this round).
  Three commits: fixtures+verifier, test+doc, type-safe test fixes.
- **Next (ordered):** (1) more CBM hardware receipts — the preamble was the
  highest-traffic code; per-effect handlers with random sites (e.g. the
  high-risk family, Protect-like gates) are the natural next receipts. (2)
  ISSUES #83's turn-seam decision (whether the scored policy models
  `gRandomTurnNumber`). (3) The remaining unverified CV handlers
  (`AI_CV_PsychUp` 14, `AI_CV_BatonPass` 13, `AI_CV_FocusPunch` 11).
- **Notes:** no PAPERCUTS of my own this session. The two fixtures are
  seed-1-committed; the verifier overrides seed to 1 and 2 (each decision
  window rerun byte-identical).

---

## 1011 — [supervisor WIND-DOWN, 2026-08-08] Session summary: 20 workers / 10 rounds — **the Factory AI move-scoring stack is COMPLETE and now carries hardware receipts**; triage bucket (A) emptied; one port cancelled by refutation; one real AI bug found by live-verify

- **State:** master at this entry's commit, clean. **Final independent union
  verification: full `npm test` 793 files / 7992 passed / 1 skipped, exit 0;
  `npm run build` exit 0.** Session start (after the orient fold) was
  **775 files / 7567 passed**. DEFERRED.md: **no open entries** — the next
  `run-supervisor.sh` is unblocked.
- **Folds:** `animation-main` folded **twice** — 19 commits at orient (MOVE_TAKE_DOWN
  exact 125→126, MOVE_CRUNCH staged, `frame-changemap.py`) and **26 at wind-down**
  (MOVE_COUNTER promoted 130/146, MOVE_DOUBLE_EDGE staged+pinned, LICK/SLASH probes).
  Both auto-merged clean: that lane touched only `src/animation/`,
  `tests/animation/`, `tools/`, and additive `battleScene.ts` draw cases, so it had
  no conflict surface with the main lane's AI work — even while the side lane was
  moving symbols *out* of `battleScene.ts`. Nothing left unfolded.
- **HEADLINE — the opponent AI can now score every move it is allowed to consider.**
  `AI_CheckBadMove` went **91 → 109/109** table effects and `AI_CheckViability`
  **53 → 122/122**, in five batches across two lanes. Before today, an effect with no
  ported handler halted the scorer on an `unsupported-branch` barrier and
  `factoryAiDecisionPolicy.ts` discarded that move as a failed candidate — the AI ran
  most of every turn with its reasoning switched off. Both barriers are now
  **unreachable**, surviving only as defensive guards against a future source sync.
- **It is no longer only a transcription: seven handlers were run against the real
  ROM.** The reach/control live-verification recipe produced receipts for
  `AI_CV_BrickBreak` (46 weighted), `AI_CV_Overheat` (23), `AI_CV_Facade` (19),
  `AI_CV_Curse` (18), `AI_CV_ChargeUpMove` (16+2+1+0, one handler serving four
  effects), `AI_CV_DragonDance` (14) and `AI_CV_MirrorCoat` (14). **Six matched
  hardware 4/4 across two seeds each**; a follow-up seed sweep then closed the
  branches no banked seed had exercised (DragonDance's reach `+1`, Curse's missing
  roll polarities). Each banks a Tier-1 receipt pinning chosen slot, draw count and
  kinds, CV delta, score vector and endpoint RNG. I re-ran
  `verify-factory-ai-brickbreak-live.ts` and `verify-factory-ai-dragondance-live.ts`
  myself and reproduced 4/4 and 6/6.
- **The verification program immediately paid for itself — a real bug.**
  `MOVE_COUNTER` was defined as **243**, which is Mirror Coat's own move id; the real
  id is **68**. `AI_CV_MirrorCoat`'s `if_has_move AI_USER, MOVE_COUNTER` gate was
  therefore testing for the wrong move. **The pre-existing unit test had codified the
  same wrong id**, so no amount of unit testing would ever have caught it — only
  hardware did. Fixed, with a regression guard that fails on the old constant.
- **And it found a second, deeper divergence — ISSUES #83, now diagnosed.**
  `AI_CV_MirrorCoat` was the one handler that did not cleanly match: three of four
  rows reproduced the ROM's draw count and endpoint RNG *exactly* yet chose a
  different slot among equal scores, and one row was short one draw. A dedicated
  diagnosis round located **two** causes by instrument (`sRandCount` + single-step LR
  attribution): (1) **`gRandomTurnNumber = Random()` at `battle_main.c:4013` inside
  `BattleTurnPassed`** — one draw per turn that the standalone scored policy does not
  model, so every decision window opens one LCG step earlier than the engine assumes;
  (2) `Cmd_if_has_move`'s non-BUGFIX operand read `(u16 *)(gAIScriptPtr + 2)` performs
  an **unaligned `ldrh` at an odd address** for `AI_CV_Counter3`, returning garbage so
  the ROM's counter-bonus roll never fires — a build-layout artifact, not a portable
  construct. The worker correctly **declined to fix either**: the seam change
  re-derives banked ordinals, and the alignment quirk has no faithful port. Evidence
  in `docs/issue83-factory-ai-random-draw-diagnosis.md` + `tools/compare/evidence/issue83/`.
- **A real defect I caused, fixed, and then made impossible.** Five handler-input
  fields (`hasSideReflect`, `isPoisoned`, `isBurned`, `isParalyzed`, `hasSubstitute`)
  were read by handlers but **never populated by the live adapter**, so those gates
  saw `false` in real play whatever the battle state. **My own brief caused it** — I
  forbade the side lane from editing `factoryAiDecisionPolicy.ts` to keep two lanes
  conflict-free, and owed a wiring step I never scheduled. Wired end to end, then
  `tests/factoryAiScoredWiringParity.test.ts` was added to capture the objects the
  adapter hands each scorer and fail on any unpopulated declared field. **It caught a
  sixth case (`knownAbility`, dropped by a conditional spread) the very next round.**
  Facade's live receipt then confirmed the newly wired status fields against hardware.
- **Triage bucket (A) is EMPTY, and I refuted its largest remaining item.** Queue item
  11 / A12 proposed "the typed action-scheduler receipt … larger than the rest". It is
  **unreachable**: `RunTurnActionsFunctions` (`battle_main.c:4939`) forces
  `B_ACTION_FINISHED` before dispatching any turn action, and `HandleAction_UseMove` —
  the only producer of a script beginning with `attackcanceler` — runs only through
  that dispatcher; `HandleAction_ActionFinished` assigns the next action and returns
  rather than calling it. The engine already models the preemption and the preflight
  receipt was already source-complete. **Port cancelled**; only the barrier's reason
  string needed fixing, which it got. That string had claimed the case was "consumed
  by the round controller" — **the fourth barrier this run whose own reason string had
  decayed.** Ten of twelve (A) items done, two refuted; only item 12 (Enigma Berry,
  the one pure-(B) site) remains.
- **`battleScene.ts` canonical split: two more batches, then a real boundary.**
  Batches 3 and 4 moved 22 and 24 symbols, each `compare:differential` **1369/1369
  byte-identical**. Batch 5 found **no eligible tranche**: all 199 remaining canonical
  symbols depend on a battleScene-local SHARED/LIVE symbol, so moving them pulls back
  a runtime value import — the ESM cycle whose module-eval read slice 1 proved throws
  TDZ. **I stopped the program there** rather than let it drift into an undeclared
  structural change; ISSUES #39 records the boundary, four named obstacles, and the
  two possible unblocking decisions. The selection scan's `FORBIDDEN` set was also
  found to be **dead code** that falsely certified ONIX-cluster consumers as
  self-contained; fixed. A `CLEAN` label from that scan is not proof of movability.
- **A recurring test trap retired at the pattern level.** ~26 pins hardcoded one
  still-unported effect as their "the barrier still fires loudly" example;
  EFFECT_ABSORB broke it, then EFFECT_HAZE, and EFFECT_STOCKPILE would have been the
  third in two days. The example is now **derived** from "table effects minus
  dispatched effects", and at 109/109 and 122/122 the assertion inverts to the honest
  property: every table effect must *score*.
- **Supervisor corrections (mine):** (1) the unwired-field gap above, caused by my
  lane-ownership rule. (2) I briefed `MOVE_EXPLOSION` as the barrier example from
  entry 1001's prose; the live value was `MOVE_HAZE` — the worker caught it. Same
  stale-ledger class as last session's two. (3) I ran
  `tools/report/executable-frontier-census.ts` **while a main-lane worker was live**;
  it writes its generated doc, so I dirtied that worker's tree. Caught and reverted
  within a minute. Report tools are not read-only. (4) I lost a worker to a cap-kill
  with **zero commits** by asking it to derive a handler's gate from source *and*
  stage a fixture inside 45 minutes; the rebrief named the gate and the same handler
  then landed in one round. **For DeepSeek, name the gate.** (5) Entry 1001's claim
  that the remaining `AI_CheckBadMove` effects were "blocked on MISSING STATE, not
  transcription" was wrong in detail — six of ten needed none, and `EFFECT_PSYCH_UP`
  dispatches to `AI_CBM_Haze` itself. Reading the ten handler bodies before briefing
  turned a "blocked" batch into a same-round landing.
- **Next (ordered):** (1) **ISSUES #83's turn-seam question** — whether the scored
  policy should model `BattleTurnPassed`'s `gRandomTurnNumber` draw. It re-derives
  every banked ordinal, so it is a deliberate seam decision, not a patch; the
  diagnosis doc has what it needs. (2) More live receipts for the ported CV handlers
  — the recipe is proven at ~45 min each, and one in seven found a real bug. Highest
  unverified weight: `AI_CV_PsychUp` (14), `AI_CV_BatonPass` (13),
  `AI_CV_FocusPunch` (11), `AI_CV_Substitute` (10). **`AI_CheckBadMove` has no live
  receipt at all** — 109 ported handlers, zero hardware checks. (3) ISSUES #39's real
  subject, retiring turn-keyed presentation, now that the mechanical split has hit its
  boundary. (4) Triage item 12 (Enigma Berry), the last classified barrier; and a
  reachability refresh of the barriers outside the AI (`battleScriptHitChainOpcode.ts`
  still pins 11) — the original 50-site sweep is now spent.
- **Notes:** 20 workers, 10 rounds, 1 cap-kill with zero commits (my brief's fault;
  rebriefed and landed), 0 lost work otherwise.
  `tools/check-oracle-freshness.sh` FAILs on both oracle ports, but `oracle/` has had
  **zero** commits since either process started — the script compares process start
  time against *harness HEAD*, which moves for `_template`-only commits. Treated as a
  false positive and **not** restarted, which was the right call: the prescribed
  restart of port 8012 would have killed the animation lane's live worker. Logged in
  PAPERCUTS with the disproof command, alongside a second entry for report tools
  rewriting generated docs with no read-only mode.

## 1010 — [bounded MAIN worker, 2026-08-08] **ISSUES #83 LOCATED: the unmodeled per-slot draw is `gRandomTurnNumber = Random()` at `battle_main.c:4013` (BattleTurnPassed); the reach tie divergence is that same one-step misalignment PLUS the ROM never firing `AI_CV_Counter8` — an unaligned `if_has_move` operand read**

- **State:** master `cadfcb1b`, tree clean. No engine edits. Targeted acceptance run green (see below). Diagnosis-only step.
- **Did:** ran the committed `attribute-factory-ai-random-callers.py` instrument on seed-99/1 copies of the MirrorCoat fixtures and wrote two new probes (committed: `tools/probe/attribute-factory-ai-mirrorcoat-scores.py`, `trace-ai-script-pointer.py`, `trace-if-has-move-counter3.py`) that read the live `AI_THINKING_STRUCT->score[]`/`moveConsidered`/`gAIScriptPtr` per draw. **The extra draw (seed-99 control, 8 vs 7) is `gRandomTurnNumber = Random()` at `src/battle_main.c:4013`** — `BattleTurnPassed+0x157` (LR `0x803bb13`), drawn once per turn after `TurnValuesCleanUp` and before `HandleTurnActionSelectionState` → `BattleAI_ChooseMoveOrAction`. Every decision window opens one step earlier than the standalone scored policy models (the battle kernel already models the draw at its turn boundary; the policy/verifier seam does not). **The reach tie divergence is the same misalignment PLUS a second cause:** the ROM's `AI_CV_Counter8` counter-bonus-roll never fires — `AI_CV_Counter3` (odd address `0x082DD46D`) reads its `MOVE_MIRROR_COAT` operand via `(u16 *)(gAIScriptPtr + 2)` (non-BUGFIX `Cmd_if_has_move`, `battle_ai_script_commands.c:1811`); the unaligned `ldrh` at `0x082DD46F` yields `0x010000F3` (register-captured) so the 32-bit `moves[i] == *movePtr` compare always fails → fallthrough to the power-0 path, zero draws. Engine fires an extra `counter-bonus-roll` the ROM never draws (same 7-vs-7 total → same endpoint → different CV roll values → different tie slot). MirrorCoat3's sibling check works because `0x082DD996` is even.
- **Next:** fix worker ports the pre-decision draw at the seam (re-deriving control seed 1's coincidental match), then decides the Counter8 exception (hard-coded evidence-backed, or a general odd-address if_has_move model) against the score-array evidence in `tools/compare/evidence/issue83/`. Full write-up: `docs/issue83-factory-ai-random-draw-diagnosis.md`.
- **Notes:** acceptance: `npx vitest run tests/factoryAiMirrorCoatLiveReceipt.test.ts tests/factoryAiBrickBreakLiveReceipt.test.ts tests/factoryAiFacadeLiveReceipt.test.ts tests/factoryAiCurseLiveReceipt.test.ts tests/factoryAiDragonDanceLiveReceipt.test.ts tests/factoryAiScoredDecision.test.ts tests/factoryAiLiveDriver.test.ts tests/factoryAiCheckViability.test.ts` all green (no engine edits), `npm run test:smoke` + `npm run build` + `npm run typecheck` green. No PAPERCUTS of my own.

---
