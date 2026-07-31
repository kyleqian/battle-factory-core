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

## 765 — [BOUNDED MAIN WORKER 2026-07-31 ~02:45] #39 rank-1 FLIPPED: Battle-2 command turn now kernel-driven; three legacy fixture files deleted

- **State:** all six mandated pins hold at their recorded counts:
  `battle2-turn1-rockslide.json` **191/191**, `battle2-action-menu-dense.json`
  **209/209**, `battle2-off-turn1-staged.json` **16/16**,
  `battle-command-generated-off.json` **128/128**,
  `interactive-generated-intro-off.json` **715/715**; ground-truth-only
  `battle2-off-turn1.json` unchanged at its known-incomplete **38/179**
  (never committed to app acceptance, docs/battle-resolution-seam-
  design.md:452). `npx tsc --noEmit` clean. Focused suite (every touched
  module + `executableFrontierRatchet`) **537/537 green**
  (`battle2CommandAdapterEquivalence` 13, `battle2ActionMenu` 8,
  `battle2Turn1` 3, `battle2PartyGroundTruth` 6, `battleCommandPresentation`
  32, `battleTurnPortability` 5, `executableFrontierRatchet` 6,
  `battle2OffKernelSeamScout` 2, `battleScene` 276,
  `factoryRoundBattleOrchestrator` 30, + 4 more). Full `npm test`/`npm run
  build` **not run this step** per the brief (side worker live concurrently).
- **Did:** redirected `battle2CommandPresentationForRender`'s field/request
  construction and `drawBattle2RockSlideAttack`'s HP sourcing
  (`battleScene.ts`) from the `BATTLE2_ACTION_MENU_MODEL`/`battle2Turn1.ts`
  fixtures to the real kernel via the promoted adapter (`battle2CommandAdapter
  .ts`, renamed from `...Preview.ts` — production now, not a proof). Added
  the real RAM-probed personalities (ONIX 1205102525, KABUTO 2507133325) and
  player bench (`playerBenchHp:[138,153]`, MAGBY/BAYLEEF override) to the
  kernel config per docs/battle2-party-ground-truth.md's two FINDINGs — both
  now closed, evidenced in the new equivalence test and
  `battle2PartyGroundTruth.test.ts`'s updated "fixed" assertions. Deleted
  `battle2Turn1.ts`/`battle2ActionMenu.ts`/`battle2OffScenario.ts`; relocated
  their still-needed timing/RNG-advancement helpers
  (`battle2Turn1RngCalls`+delays, `battle2RockSlideMechanismPressTick`,
  `actionMenu*`/`battle2PreTurnRngCalls`, `BATTLE2_ACTION_MENU_MODEL`,
  `BATTLE2_OFF_TURN1_COMMAND_DURATIONS`) into `battleScene.ts`/
  `battle2CommandAdapter.ts` rather than dropping them — core.ts's RNG-
  advancement loop (accuracy/spread/secondary Random() calls) is unchanged,
  only its source module moved. Dropped genuinely dead code that no renderer
  or RNG loop ever consumed: the `state.battle2Turn1` EngineState field
  (only read by its own now-rewritten test), `battle2RockSlideDamage`,
  `battle2Turn1Order`, `advanceBattle2PreTurnRng` (all unused outside their
  own tests). Kept the ROCK_SLIDE rock-sprite visual's private draw
  primitives untouched (no generic move-visual owner yet, per brief). Rock-
  sprite HP-drain boundary now reads `{from:91,to:63}` off the adapter's
  resolution instead of the deleted `BATTLE2_KABUTO_START_HP`/`END_HP`
  constants. Rewrote `tests/battle2CommandAdapterPreviewEquivalence.test.ts`
  as `tests/battle2CommandAdapterEquivalence.test.ts` (production-path pin,
  not a pre-flip proof) and updated the 5 dependent test files' imports.
- **Next:** ISSUES #39's rank-1 row (docs/battle-scene-retirement-
  inventory.md) is retired — supervisor should trim #39's text to drop the
  rank-1 window from the worklist (rank 2, Turn-13 DRAGON_BREATH→faint→
  Murkrow switch-in, is next per the inventory's stated order) and update
  the retirement-inventory doc's rank-1 row/ref-count census (not touched
  this step, out of scope for a main worker per the brief).
- **Notes:** PAPERCUT: the acceptance list's "battle2-off-turn1.json (179)"
  and "battle2-turn1-rockslide.json (191)" traces both lack `oracleProfile`/
  `appRoute` fields (pre-existing; unrelated to this step), so plain `npm
  run compare -- <trace>` silently uses the wrong default route
  (`generated-orchestrator`) and either crashes (pre-existing, unrelated
  `STRINGID_PKMNSITEMRESTOREDHEALTH` bug, reproduces identically on master)
  or diffs wrong. Verified both via scratch copies with `"appRoute":
  "canonical-recorded"` added (not committed) — ~10 min lost chasing this.
  Worth a real fix (add the field to the two committed trace files) in a
  future docs/tooling pass.

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
