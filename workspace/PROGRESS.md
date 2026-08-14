# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1265 — [MAIN worker, 2026-08-14] **Ready-lag #87: switch-in ability/item procs ruled out as the driver of BOTH residual families (source audit + live tick-by-tick RAM trace); `overrides.parties` correlation found but its general mechanism was already cleared by a prior differential — honest-stop, no validated `src/` fix**

- **State:** no `src/` change this round (source archaeology + a live RAM
  probe disproved the leading hypothesis before any bisection was
  attempted — nothing to revert). All committed windows unchanged: silver
  `factory-round-battle7-noland-reveal-off` **648/701**, gold
  `factory-round-battle7-noland-gold-reveal-off` **700/701**, Lukas
  **154/154**, Yoshi **700/751**, `test:smoke` **375/375**.
- **Did:** Assigned to model `TryDoEventsBeforeFirstTurn`'s span length
  from source per-fixture and check it predicts the confirmed +7/+7/+5/+4
  residual table. Read the switch-in ability/item loop
  (`battle_main.c:3841-3910`): it only costs extra ticks when
  `AbilityBattleEffects`/`ItemBattleEffects` report a real effect;
  otherwise both battlers' loops complete in a single tick. Audited all 12
  active-lead abilities/held-items across all 6 confirmed fixtures
  (real-gen: GRIMER/YOSHI, KADABRA/SHIZUKA, DUGTRIO/gold-dense,
  WEEPINBELL/QUINN; `overrides.parties`: TANGELA/silver, PUPITAR/probe)
  against `battle_util.c`'s switch-in cases — **none trigger a real
  effect** (including DELCATTY's Cute Charm, which has no
  `ABILITYEFFECT_ON_SWITCHIN` case in Gen 3 at all, contact-only per
  `battle_util.c:2851`). This rules out switch-in procs as the cause of
  either the +4-vs-+5 split or the +5-vs-+7 jump. Built
  `tools/probe/probe-readylag-span-tickbytick.ts` (committed, rerunnable)
  to localize the +5-vs-+4 split live: re-ran GRIMER/YOSHI and
  KADABRA/SHIZUKA dense and found the switch-in-loop leg is an **identical
  +3 ticks in both** (confirming the "no procs → 1 tick" source read); the
  entire split lives in the opponent's own `ChooseAction`-ack tick count
  (3 ticks for COMBUSKEN, 2 for MAGNETON) — a real span, but in the AI's
  own decision logic (`battle_ai_switch_items.c`, unread this round), not
  the switch-in loop. Separately noticed both confirmed +7 fixtures share
  a byte-identical `overrides.parties` player roster (DELCATTY/SABLEYE/
  LICKITUNG) — but `docs/overrides-ready-lag-probe.md` (same day, side
  lane) already ran a byte-matched ± differential at the exact PUPITAR
  route and found the staging mechanism innocent (offset 0) for an
  *arbitrary* roster — so this round's correlation is real but its cause
  is still open (roster×staging interaction vs. a roster/route property
  independent of staging), not a new, confirmed discriminator. Full
  writeup: `docs/trainer-pic-off-window-scout.md` round 14.
- **Next:** (1) the still-untested decisive cell: stage the exact
  DELCATTY/SABLEYE/LICKITUNG roster under real generation (not
  `overrides.parties`) and see if it's still +7. (2) run the
  tick-by-tick trace on a +7 fixture (TANGELA or PUPITAR) — unknown
  whether its extra ticks live in the same AI-ack leg Step 3 found for the
  +4/+5 family or somewhere earlier. (3) read
  `battle_ai_switch_items.c`'s move-scoring loop to source-model the
  AI-ack leg's own tick count — needed even for the +4/+5 baseline before
  either family has a non-empirical fix.
- **Notes:** commits this round: probe script + dossier/ISSUES/PROGRESS
  append only (no `src/`, no fixture/trace changes). ISSUES #87 updated in
  place (trimmed eliminated theories, added this round's audit + open
  lead) per the "never mark closed in place, trim to open remainder"
  convention — not deleted, since the defect is still open.

## 1264 — [MAIN worker, 2026-08-14] **Ready-lag `dispatchDelay(opponent)<101` discriminator FALSIFIED with clean RAM triangulation; real missing ROM span located precisely (`TryDoEventsBeforeFirstTurn`/`ChooseAction` handshake); no validated `src/` fix — honest-stop, evidence landed**

- **State:** No `src/` change this round (a speculative flat-constant fix
  was tried, empirically bisected, found insufficient, and reverted).
  `factory-round-battle7-noland-reveal-off` (silver) stays **648/701**;
  `factory-round-battle7-noland-gold-reveal-off` (gold) stays **700/701**;
  no regressions anywhere, since nothing shipped.
- **Did:** Assigned to fix the ready-lag +7/+5 family
  (`docs/ready-lag-discriminator-scout.md`'s `dispatchDelay(opponent)<101`
  discriminator). Instead **falsified that discriminator** with a clean,
  non-confounded data point: `tools/battle-lab/factory-brain-gold-intro-
  dense-off.json` is `factoryBrain` mode with **no `overrides.parties` at
  all** (a genuine, un-staged oracle RNG walk) and opponent lead BLAZIKEN
  gives `dispatchDelay=132` (deep in the "safe, should-be-exact" regime) —
  the exact untested cell the discriminator dossier's own §3 flagged. Built
  `tools/probe/probe-ready-lag-chooseaction-handshake.ts` (committed,
  rerunnable, byte-identical across 3 runs) to measure it, plus two fixtures
  the dossier calls "confirmed 0-residual" (GRIMER/YOSHI, KADABRA/SHIZUKA),
  all via live RAM (`state.engine.{controllerExecFlags,
  playerControllerCommand,opponentControllerCommand}`), not PNG citations.
  **All three show a +4/+5 tick residual**, including the two "exact" ones
  and the override-free/high-dispatchDelay one — the regime split in the
  existing dossier is best explained as an old-PNG-landmark-vs-new-RAM-
  predicate measurement-convention split, not a real ROM regime boundary.
  Traced the real missing span in `reference/pokeemerald/src/battle_main.c`:
  `TryDoEventsBeforeFirstTurn` (:3841, switch-in ability/item/weather-check
  loop) + `HandleTurnActionSelectionState`'s `ChooseAction` dispatch (:4168)
  run AFTER the player's own send-out completes and BEFORE the menu is
  interactive — a real, generic, always-present ROM span
  `generatedBattleStartCommandReady` (battleScene.ts:4590-4600) has zero
  term for. Tried it as one flat additive constant (unconditional, no
  regime gate) and bisected empirically against silver: K=9 peaks at
  690/701 (98.4%, up from 648/701) but falls short of the ~699+/701 the step
  required, with a K-insensitive residual persisting at frames 647-653
  unrelated to the correction. **Reverted the `src/` edit** — a
  non-converging fitted constant is an explicitly failed outcome per this
  step's own brief. Full writeup: `docs/trainer-pic-off-window-scout.md`
  round 13.
- **Next:** (1) the 647-653 bbox residual may be masking the true
  ChooseAction-handshake optimum — resolve it first. (2) re-run this
  round's probe against the concurrent side worker's promised real
  `factoryLegal`/low-`dispatchDelay` fixture once it lands; if its residual
  is also ~+4/+5 (not +7), the TANGELA/PUPITAR +7 carries a second,
  additional ~+2-3-tick effect on top of this round's universal gap (a
  two-term fix). (3) double check whether the compare harness has its own
  RAM-tick-to-pixel-frame offset beyond the documented "RAM leads pixel by
  1" convention before trusting a future bisection here.
- **Notes:** commits this round: probe script + dossier/PROGRESS append
  only (no `src/`, no fixture/trace changes). Regression-verified
  unaffected (nothing shipped to regress): silver **648/701**, gold
  **700/701**, `factory-round-battle6-lukas-reveal-off` **154/154**,
  `factory-arbitrary-intro-yoshi-off` **700/751**, `test:smoke`
  **375/375**. Finish gate (full `npm test` + `npm run build`) recorded
  below this entry's commit.

## 1263 — [MAIN worker, 2026-08-14] **Gold Brain-reveal alignment bisected: 478/701 → 700/701; corrected two of PROGRESS 1262's claims (its transplanted offset AND its ready-lag non-recurrence read)**

- **State:** `factory-round-battle7-noland-gold-reveal-off` compare now
  **700/701 (99.86%)**, up from 1262's 478/701. Root cause was exactly
  1262's own favored hypothesis (a) — a genuine alignment error, not a
  render bug — but the actual bug was more precise than "transplanted from
  silver": 1262's own re-probed `speciesPopulateFrame` (1186) used a
  **pixel** self-diff (first sha-differing frame) instead of the §C-defined
  **RAM-state** landmark (`state.battlers.{player,opponent}.species` first
  nonzero) that every prior fixture's offset (SHIZUKA/YOSHI/MAGNETON, and
  silver's own Brain fixture per 1260) was actually keyed to. Re-ran
  `bin/oracle lab` dense against this fixture's own scenario and read the
  RAM field directly: species populate at **frame 1185**, one frame before
  the first visible pixel change (1186) — the same one-frame RAM-vs-pixel
  lag §C's own SHIZUKA table already implies but 1262 didn't re-check.
- **Did:** Corrected `preCheckpointFrameOffset` 1152→**1151**
  (`1185-26-8`) and, via 1262's own applied `press = hold-end-4` relation,
  the A-press tick 388→**389**. Verified by direct `npm run compare`
  sweep, not algebra alone: **388→481/701, 389→700/701, 390→482/701** — a
  sharp single-frame optimum, confirming a true alignment fix rather than a
  lucky combination. **Result: 700/701.** The frame-34-onward growing
  horizontal-bar mismatch 1262 named is gone entirely. Sole remaining
  residual: **frame 465** (oracle-absolute 1616), 16px/0.04%, inside the
  opponent send-out materialize span — the same unmechanized single-frame
  tint residual family as silver's 420/503 and Yoshi/Magneton's 444/536;
  not chased, per the step's no-pixel-fitting/no-per-fixture-special-case
  hard stop. **Also corrected 1262's ready-lag tail claim:** the committed
  701-frame window ends (oracle-absolute 1851) *before* this fixture's own
  true ready-menu transition (RAM predicate fires at 1865); 1262's "465-700
  exact, unlike silver's +7" reading examined a window that never reached
  the ready state at all. A throwaway (uncommitted) 730-frame diagnostic
  extension shows gold **does** have the same construction-route ready-lag
  family as silver — app's own menu appears at app-relative 711, oracle's
  settles at 716, a **5-tick early-fire gap**, same direction as silver's
  +7 but a different magnitude (not a flat cross-fixture constant) — a new,
  more precise data point left for the concurrent ready-lag side-probe to
  consume. Full writeup: `docs/trainer-pic-off-window-scout.md` §D round 12
  (this worker's doc round, as assigned).
- **Next:** the +7-family ready-lag fix itself is explicitly out of scope
  this step (side worker's discriminator dossier lands first). Frame 465's
  tint-materialize residual would need a third/fourth species data point to
  isolate, same as the existing 420/503/444/536 family. The gold ground
  truth doc's own dense-probe fixture (`factory-brain-gold-intro-dense-off`)
  still has different upstream transition timing than this reveal-off
  fixture's real generated-orchestrator construction (black-hold 39f vs
  44f, per 1262) — a reminder that landmark re-probing per fixture stays
  load-bearing, not a one-time constant.
- **Notes:** trace-only fix (`tools/compare/traces/factory-round-battle7-
  noland-gold-reveal-off.json`), zero `src/` changes. Regression matrix
  held: `factory-round-battle7-noland-reveal-off` (silver) **648/701**,
  `factory-round-battle6-lukas-reveal-off` **154/154**,
  `factory-arbitrary-intro-yoshi-off` **700/751**, `test:smoke` **375/375**.
  Finish gate: full `npm test` **1,014 files / 9,765 passed, 44 files / 223
  skipped** (pre-existing CGB4 gating, not a regression); `npm run build`
  green (669 modules). Archived 1260 to `PROGRESS-archive.md` to keep this
  ledger at 3 entries.

