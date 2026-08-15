# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1267 — [planning session, 2026-08-14] **Next-run queue set (user decision): Noland post-battle consequences → #87 instrument → walk-up scoping; continuous-play bar audited — two wiring gaps named**

- **State:** Docs/ledger only — no `src/`, oracle, or test changes. The
  user ordered the next main-lane work and named the follow-on
  objective; both recorded in ROADMAP.md's "User decisions (2026-08-14,
  planning session)" block.
- **Did:** (1) Verified the Brain program's remaining-list status:
  (a) harness lab mode LIVE (top-layer `33354440`; §5.2 consumers per
  1266) and (c) presentation ran end-to-end — only (b) post-battle
  consequences remains. (2) Queued, in order: (i) consequences — steps
  1-3 of `docs/noland-brain-post-battle-audit.md` §5 (BP award table +
  the +10 brain bonus, symbol grant + BP as round-controller OUTPUTS,
  brain congrats text; the step-4 harness seam now exists, so the
  numbers are live-verifiable); (ii) #87's named instrument (the
  opponent-AI `ChooseAction` ack-timing model,
  `battle_ai_switch_items.c`); (iii) Brain walk-up dialogue — SCOPING
  ONLY (present faithful/trim/skip options; do not build). (3) Audited
  the user's continuous-play bar ("boot and play rounds indefinitely at
  distribution parity") against the code: TWO wiring gaps — the draft
  screen is built exactly once, at boot, from the captured anchor
  records (`core.ts:581` is the only construction site;
  `factoryRentalGeneration.ts` is proven but unwired into any
  next-round entry), and the roundCompleted terminal has no continue
  path into a next round's draft (no challenge advance, no in-session
  streak carry — battle 21/silver Noland is unreachable by natural
  play).
- **Next:** (a) run queue item (i) — the pure outcome function first
  (audit doc §5 step 1 acceptance), then orchestrator wiring, then the
  congrats text; (b) items (ii)/(iii) in order; (c) after (i): the
  continuous-play program (generated-draft round entry + round chaining
  with in-session streak/symbol/BP carry; cross-session saving stays
  OUT of scope).
- **Notes:** Top-layer session; workspace edits limited to
  ROADMAP/PROGRESS per the user's queue request. Entry 1264 rotated to
  the archive. Commits local only — pushing is the user's step.

## 1266 — [supervisor, 2026-08-14] **Wind-down: Brain presentation program built end-to-end in one session; silver 648/701 + gold 700/701 live compares; #87 parked with full forensics; all gates green**

- **State:** 8 rounds / 15 worker steps, zero unresolved failures (two
  honest-stops and one salvage, each strictly narrowing). The Noland arc
  went from "no app frame reachable" at orient to two committed live
  compares. DEFERRED.md remains EMPTY — no open supervisor questions.
- **Did (headlines):** (1) factoryBrain §5.2 consumers: README, silver+gold
  lab fixtures, live integration proof 82/82 (`verify-factory-brain-lab.ts`).
  (2) Brain presentation seam: `getFactoryTrainerPresentation(1022)` real
  NOLAND identity (source-re-derived), new additive
  `frontier-brain-trainer-pic.json` catalog + extractor, proof-stage
  battleIndex-6 widening, Tier-1 pins incl. a brain-LOSS pin. (3) Ground
  truth: silver + gold intro dossiers (49/49 + 44/44 sha verify scripts,
  PNG-verified labels; the whole battle-start window is PRE-checkpoint).
  (4) Live compares: silver 648/701 (transition/pic-reveal/battle-text/
  send-out exact), gold 700/701 (single tint-dot frame remains).
  (5) #87 filed then twice-narrowed: ready-frame formula misses the ROM's
  `TryDoEventsBeforeFirstTurn`/`ChooseAction` span; +7/+7/+5/+4 across four
  committed fixtures; staging, regime-discriminator, and switch-in-proc
  hypotheses each killed by committed instruments; variance localized to
  opponent-AI ChooseAction-ack timing (next instrument named in #87).
  (6) CGB4 papercut retired: 44-file family gated behind
  POKEBENCH_CGB4_EVIDENCE=1 (`npm run test:cgb4`), 88-artifact digest pin
  stays default — full suite 19 min → ~2-3 min. (7) Read-only Noland audit:
  7/8 seams CLEAN, 1 doc defect fixed same-hour (cursor-gap caveats in
  battle-lab README + design doc).
- **Gates (final union, after the last rust fold):** full npm **1,018
  files / 9,802 passed / 223 skipped** (CGB4-gated); build green; cargo
  native green (52 ok-suites); WASM **509,839 B** rebuilt twice, final
  `08436ef1…`; forced-WASM **18 files / 803 tests** (rerun on the final
  artifact); soaks vanilla **20/20 OK**, full **60/60 OK**, 0 crashes /
  0 hangs (run after the last workspace/src change; only core-rs moved
  afterward, which soaks do not exercise). Both lane branches folded at
  wind-down (animation: Flail + Luster Purge; rust: ~38 commits of script
  leaves); both sibling supervisors were LIVE throughout — any post-15:00
  tail is the next orient's fold.
- **Next:** (a) #87's named instrument (opponent-AI ack-timing model —
  battle_ai_switch_items.c unread); (b) the Brain walk-up dialogue surface
  (silver ~12 monologue boxes, gold 2 usher boxes — no app surface yet,
  scoping decision for a fresh session); (c) extending the gold window past
  its ready frame waits on #87.
- **Notes:** oracle freshness FAIL on :8014 was the known timestamp false
  positive (verified serving factoryBrain); :8012 left to the animation
  lane by design. One side worker self-suspended (ScheduleWakeup class) and
  was salvaged via the commit-tail recipe; fresh-worktree wasm-artifact
  papercut bumped to 3 hits with the copy-in workaround recorded.

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
