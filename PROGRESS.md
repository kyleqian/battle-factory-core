# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
> **STANDING ARRANGEMENT (user directive, 2026-07-26):** the animation
> program runs under its own supervisor (`./run-supervisor.sh --lane
> animation`, guide `ANIMATION_SUPERVISOR.md`) in the persistent
> `.worktrees/animation-main` worktree on branch `animation-main`. Main
> supervisor: never brief animation work; fold `animation-main` into
> `master` at orient when it has new commits (details in SUPERVISOR.md's
> parallel-workers note). This replaces the temporary animation pause —
> entry 468's animation items are the animation supervisor's backlog now.

## 763 — [BOUNDED MAIN WORKER 2026-07-31 ~01:50] Round 6: 652..750 partly isolated (HP-IV data bug fixed, ready-lag mechanism named); MAGNETON coverage not reached

- **State:** `tools/compare/appTrace.ts` fix only (dev-time harness, no
  `src/` change); `docs/trainer-pic-off-window-scout.md` §D "Round 6
  resolution" has full findings. YOSHI **650/751** (unchanged count,
  narrower/more-honest residual). GROVYLE pins re-verified intact:
  `battle-command-generated-off` **128/128**, `interactive-generated-
  intro-off` **715/715**. Focused suite (`factoryBattleStartIntro` +
  ack-alignment + `executableFrontierRatchet` + `factoryRoundBattle
  Orchestrator` + `cryDurationsExtraction` + `speciesStatsExtraction` +
  `battleScene` + `kabutoSendOut`) **340/340 green**; `npx tsc --noEmit`
  clean. Full `npm test`/`npm run build` **not run this step**, per the
  brief (side worker live concurrently).
- **Did:** (1) Isolated the dominant piece of the 652..750 family: it was
  a **data bug, not a timing bug** — `generatedCommandRecord`'s hardcoded
  `fixedIv: 31` is only correct for the mechanicLab-override
  `battle-command-generated-off` fixture; the YOSHI `factoryLegal` stage
  needs the real challenge-0 initial-rental IV (**3**, `factory-round-
  policy.json`'s own `fixedIvs[0].regular`), which was making GRIMER's
  displayed max HP wrong (176 vs oracle's 162). Fixed with a `fixedIv`
  parameter (default unchanged for the mechanicLab call site); shrank the
  window's dominant per-frame diff from 102px to 24px. (2) Named the
  larger remaining mechanism (frames 678..721): `battle_controller_
  player.c:979-1063`'s `Intro_TryShinyAnimShowHealthbox` is the same
  cry-duration gate already fixed for the opponent last round, but on the
  **player's own** mon — so `GENERATED_PLAYER_READY_LAG` (currently a
  flat 185) is also species-dependent. A first-cut linear reparametrization
  off GRIMER alone missed by 8 ticks (unlike the opponent fix, which
  matched two species exactly first try) — needs a second player-species
  data point (KADABRA, via MAGNETON/SHIZUKA) before committing a formula,
  so left unfixed rather than curve-fit to one point. (3) Frames 444/536:
  re-checked, unaffected by the HP fix, still not isolated to a site. (4)
  MAGNETON coverage: the committed SHIZUKA fixture's exact tuple
  (trainerId 110, `opponentSetIds:[349,339,327]`) needs 16 battles of real
  ROM RNG history to reproduce independently; brute-forced 1..30000 with
  no match. Found and verified a working **alternative** arbitrary
  (non-reversed-workflow, YOSHI-pattern) tuple that does exercise the
  elevated-shadow path with MAGNETON as the actual opponent lead
  (`rngValue:70, factoryWinStreak:14, battleIndex:0` → trainerId 109
  RICARDO, `opponentSetIds:[349,353,292]`, dispatch delay 111) — recorded
  as the concrete next-step in §D, not built out (would have consumed the
  budget needed for the regression re-runs and this write-up).
- **Next:** three items remain, all named in §D round 6: the ready-lag
  species-dependent formula (needs a second player-cry data point), the
  tiny 24px gender-icon residual (needs real RNG-derived personality —
  same class as the #39 "unproven gender/personality" FINDING), and
  MAGNETON coverage (concrete tuple + fixture-build recipe recorded,
  ready for the next round to pick up directly).
- **Notes:** `GENERATED_OPPONENT_SHADOW_DELAY`(104) is still untested
  against any app-side pixel comparison after this round.

---
## 764 — [SUPERVISOR 2026-07-31 ~01:55] GATE 5 TICKED; #56 filed; round 7: #39 rank-1 flip (main) + #56 evidence pack (side)

- **State:** union gate green **557 files / 5676 tests + 1 deliberate
  animation-lane skip**, build clean. Round 6 verified and merged: M6's
  `fixedIv` harness fix (`7708e362`) + S6's battle-2 ground truth
  (`259e3358` — ONIX/KABUTO personalities probed; ONIX `1205102525`
  independently matches the anchor-draft receipt, a cross-validation
  neither worker planned).
- **GATE 5 TICKED** in ROADMAP S10 with a completion note carrying the
  full evidence chain (audit → commentary ROM receipts → anchor receipt
  link → AI ratchet pins → YOSHI 650/751 arbitrary-trainer proof +
  cry-duration mechanism) and the recorded scope rulings (CBM/CV breadth
  → Gate 6; battles-3-7 receipts declined per S8 policy; P..B fade →
  #39-class; #55 stream model tracked, not absorbed). **ISSUES #56 filed**
  as the honest remainder worklist for the arbitrary-intro window
  (player-side cry gate needs a second data point; frames 444/536;
  MAGNETON shadow coverage via §D's alternative tuple).
- **Round 7 dispatched (user ordering: #39 next):** main M7 — the rank-1
  FLIP consuming the banked adapter + ground truth; six committed pins
  mandatory at recorded counts (179/191/16/209 + 128/128 + 715/715),
  legacy fixture files deleted, honest-stop on any regressed pin. Side
  S7 — #56 evidence pack: player-cry triangulation (>=2 player-lead
  species vs `cry-durations.json`) + committed MAGNETON-lead fixture with
  landmark mapping (new files only, no src changes).
- **Notes:** worker-lesson from entry 762 applied: both briefs demand
  `npx tsc --noEmit` where TS is touched.

---
## 762 — [SUPERVISOR 2026-07-31 ~01:10] Round 5 verified: cry-duration mechanism proven (YOSHI 650/751, GROVYLE pins intact); #39 adapter merged after supervisor type-fix; round 6 dispatched

- **State:** union green — suite **556 files / 5670 tests + 1 deliberate
  animation-lane skip**, build clean after supervisor fix `18c3299c`.
  Supervisor personally re-ran: YOSHI **650/751**,
  `battle-command-generated-off` **128/128**,
  `interactive-generated-intro-off` **715/715**.
- **Round-5 outcomes:** (1) M5 identified the dispatch-delay mechanism —
  `Intro_TryShinyAnimShowHealthbox` blocks on `IsCryPlayingOrClearCrySongs`,
  so the wait is the opponent's cry duration. Extracted
  `src/data/gen/cry-durations.json` (376 species, isolated extractor
  test); MAGNETON (+111) and COMBUSKEN (+125) matched the GROVYLE-baseline
  prediction exactly; species-keyed function replaced both fixed constants
  plus the coupled `GENERATED_PLAYER_VISUAL_DELAY`. Three named YOSHI
  residuals remain (444, 536, 652-750) + the reachable-but-unexercised
  `GENERATED_OPPONENT_SHADOW_DELAY` (MAGNETON is the live case). (2) S5
  banked the #39 rank-1 typed adapter + equivalence proofs (new files
  only) with three FINDINGs (hardcoded move-target legality, unproven
  gender/personality, no generic move-visual owner) and a concrete flip
  checklist.
- **Supervisor fix:** S5's files had two type errors `npm run build`
  catches but vitest does not (tuple-vs-number[] cast; a vacuous
  "flinch" event-kind comparison — no such kind exists). Fixed minimally
  (`as const` tuples; assert no FLINCH messageId instead) in `18c3299c`.
  Worker-brief lesson: focused runs must include `npx tsc --noEmit` for
  new src/test files — added to future side briefs.
- **Round 6 dispatched:** main M6 — isolate/fix the 652-750 family, then
  536/444, then build the MAGNETON app-side comparison (second
  arbitrary-species proof; exercises the shadow path); GROVYLE pins must
  hold. Side S6 — battle-2 party ground-truth probe (personalities,
  genders, bench legality) to discharge the flip's FINDINGs 1-2.
- **Next:** after M6, supervisor ticks Gate 5 (per entry-760 intent — the
  delay mechanism is now fixed and proven on two species) and the main
  lane moves to the #39 rank-1 flip consuming S5+S6.
