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
## 765 — [SUPERVISOR 2026-07-31 ~02:25] #39 rank-1 RETIRED (flip verified); player-cry mechanism confirmed on 3 species; round 8 dispatched

- **State:** union gate green **557 files / 5671 tests + 1 deliberate
  animation-lane skip** (net delta = deleted legacy fixture tests), build
  clean. M7's flip verified: legacy files gone, supervisor personally
  re-ran `battle2-turn1-rockslide` **191/191** and
  `battle2-action-menu-dense` **209/209** (worker verified 16/16, 128/128,
  715/715, ground-truth 38/179 unchanged). S7 merged: player-cry
  triangulation (GRIMER/KADABRA/DELCATTY → `readyLag = 98 + cryDuration`
  within 1 tick — round-6's 8-tick miss was a wrong anchor) + committed
  MAGNETON/RICARDO fixture with landmark map incl. pixel-confirmed
  shadow-elevation frame 1687.
- **Supervisor actions:** #39 issue text + inventory rank-1 row marked
  retired; `battle2-turn1-rockslide.json` given explicit
  `appRoute: canonical-recorded` (fixes the wrong-route crash from the
  M7 papercut); PAPERCUTS bumped (pixel-inspection helper).
- **Round 8 dispatched:** main M8 — implement species-keyed player ready
  lag (canonical route untouched; GRANBULL flat-286 flagged as a separate
  path), build the MAGNETON app-side comparison (second arbitrary-species
  proof; first shadow-path exercise), stage real personalities in the
  staged stages (gender-icon residual), then frames 444/536. Side S8 —
  #39 rank-2 (turn-13 DRAGON_BREATH→faint→switch-in) equivalence
  groundwork, new-files-only, tsc mandatory.
- **Notes:** GRANBULL flat-286 non-reconciliation is recorded in
  `docs/intro-cry-shadow-evidence.md` — treat as a flag on the canonical
  path, not a defect claim.

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
