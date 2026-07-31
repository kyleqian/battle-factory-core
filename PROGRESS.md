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

## 772 — [SUPERVISOR WIND-DOWN 2026-07-31 ~04:00] GATE 5 TICKED + #39 ranks 1+2(faint half) retired: 10 rounds / 20 workers / 0 failed steps

- **State:** master green at final gate **559 files / 5683 tests + 1
  deliberate animation-lane skip**, production build clean, tree clean at
  this commit. `animation-main` fold delta **0 at orient and at
  wind-down**. No orphan worktrees/branches (only permanent
  `.worktrees/animation-main`). **DEFERRED.md empty all session.**
- **Session headlines (2026-07-30 22:10 → 07-31 04:00):**
  (1) **GATE 5 TICKED** (ROADMAP S10) on a verified chain: clause-by-clause
  audit (`docs/gate5-acceptance-audit.md`, 6/11 discharged at audit) →
  commentary ROM receipts (10 preview_report seeds, all matching, 6
  types/6 styles) → anchor-draft receipt link at freshly probed
  pre-generation cursors (selection byte-exact; #55 filed for the
  ambient-VBlank stream boundary) → factory-AI barrier ratchet pins →
  public dense arbitrary-trainer intro proof (pre-checkpoint contract:
  offset-0 mapping, deterministic, YOSHI **699/751** + MAGNETON 424/751
  evidence traces, GROVYLE pins 128/128 + 715/715 intact) → cry-duration
  mechanism (send-out delays gate on cry playback; 376 species extracted,
  exact on 4 opponent + 4 player data points). Scope rulings recorded in
  the completion note (CBM/CV breadth → Gate 6; battles-3-7 receipts
  declined per S8 policy; P..B fade → #39-class).
  (2) **#39 rank 1 RETIRED** — Battle-2 command turn flipped onto
  `battle2CommandAdapter.ts` (kernel-driven, RAM-probed personalities +
  bench), three legacy fixture files deleted, all pins held.
  (3) **#39 rank-2 faint half RETIRED** — `turn13ResolutionAdapter.ts`,
  hand-fit faint geometry replaced by the generic formula; switch-in
  half's decision side proven (`destinCanonicalReplacements`, 0-draw
  `getMostSuitableMonToSwitchInto`), blocked only on
  `stagePlayerHitChain` terminal-state exposure.
  (4) **Quarantine precedent:** M8's species ready-lag regressed the
  715/715 pin → quarantined same round; S9's discriminating probe proved
  the anomaly route-specific (lab-ONIX 0 residual); M10 un-quarantined
  via the route-level `isCanonicalAnchorIntro` fact. Pins outrank open
  evidence; probes beat hypotheses.
- **Open issues:** #56 (MAGNETON tint root-caused, needs 3rd species;
  frames 444/536; canonical +6 route term unnamed), #55 (stream-model
  boundary), #39 (ranks 2-switch-in..9 remain; inventory annotated).
- **Next session (ordered, per user's Gate 5 → #39 → Gate 6):**
  (i) #39 continuation: switch-in half after `stagePlayerHitChain`
  terminal exposure (main), then rank 3 (Turn-5 KO/Sitrus) via the
  proven equivalence-first two-phase pattern; (ii) #56 burn-down
  (MAGNETON 3rd-species tint data point unblocks the shadow verdict);
  (iii) Gate 6 breadth after #39.
- **Notes:** no deferred questions all session. Papercuts banked:
  pixel-inspection helper (new), out/latest race + missing appRoute on
  historical traces (three pinned this session; a pre-existing
  Sitrus string-resolver crash on the generated route surfaces only via
  wrong-route replays — recorded in entry 766/769 notes). Worker
  ledger-numbering collided 4× (all repaired; future briefs carry the
  numbering instruction that fixed it in round 10).

---
## 771 — [BOUNDED MAIN WORKER 2026-07-31 ~04:50] #56 item 1 UN-QUARANTINED via route discriminator; item 3 (MAGNETON tint) isolated, not fixed

- **State:** `interactive-generated-intro-off` **715/715** (hard
  requirement, held). `factory-arbitrary-intro-yoshi-off` **699/751**
  (recovers the 1-frame quarantine cost). `factory-arbitrary-intro-
  magneton-off` **424/751** (unchanged, expected — dominated by the
  separate tint bug). `battle-command-generated-off` **128/128**. `npx tsc
  --noEmit` clean; focused suite (`factoryBattleStartIntro`,
  `factoryBattleStartIntroAckAlignment`, `factoryBattleStartPresentation`,
  `interactiveRouting`, `battleScene`, `factoryRoundBattleOrchestrator`,
  `executableFrontierRatchet`) **336/336** green (2nd pass after the
  MAGNETON investigation: `battleScene`+`executableFrontierRatchet`
  **282/282**). Full `npm test`/`npm run build` not run this step (side
  worker live concurrently, per brief).
- **Did:** (1) Un-quarantined `generatedPlayerReadyLagSpeciesFormula`
  (proven exact on 4 species now — GRIMER/KADABRA/DELCATTY +
  round-9's lab-ONIX 0-residual probe) by adding
  `FactoryBattleStartIntroState.isCanonicalAnchorIntro`, set at
  `beginFactoryRoundBattleStartIntro` from an EXISTING route-level fact
  (`config.adoptedInitialOpponent !== undefined && battleIndex === 0` —
  true only for the interactive draft anchor's own Battle 1, never a
  species/trainer/trace-name check). The canonical route keeps its flat
  ONIX-calibrated `GENERATED_PLAYER_READY_LAG`; every other route now uses
  the species formula. Both calibrations documented at the code site.
  (2) Isolated MAGNETON's affine-emerge tint divergence
  (`drawGeneratedOpponentRelease`, handoff+19) to `origin.y` wrongly
  including the species resting-Y offset (`coords.yOffset`) during the
  materialize blend — a joint (accumulator, y-offset) brute-force sweep
  found the exact fix for MAGNETON (0 missing-tint pixels, 12/12 ticks),
  but the SAME fix regresses COMBUSKEN (`factory-arbitrary-intro-yoshi-
  off` 699→662/751) — falsifies the source's "species-independent" claim
  but the true relationship isn't a single `8 +/- yOffset` constant from
  only two data points. Left unmodified (doc-only commit) rather than
  trade one held pin for another. Shadow verdict (elevated-shadow branch,
  onset app-relative 509) stays **inconclusive** — reported explicitly per
  the brief since the earlier tint divergence still masks it. Frames
  444/536 not reached (budget spent on the MAGNETON investigation).
- **Next:** MAGNETON tint needs a 3rd species or a RAM read of the real
  sprite position during a short-sprite (`coords.height<64`) materialize
  to distinguish a real per-species geometry term from a
  `coords.height`-keyed one (see `battleScene.ts`'s
  `drawGeneratedOpponentRelease` doc comment and
  `docs/trainer-pic-off-window-scout.md`'s new Round 10 section for the
  full finding). Frames 444/536 still open.
- **Notes:** #56 item 1 can be marked resolved in the ISSUES.md trim
  (supervisor). #56 item 3 stays open, now precisely bounded instead of
  "inconclusive/masked."

---
## 770 — [SUPERVISOR 2026-07-31 ~03:10] Rank-2 faint half RETIRED (pins verified); 6-tick anomaly = ROUTE-specific (lab-ONIX 0 residual); DESTIN bench probed; round 10 dispatched

- **State:** union gate green **558 files / 5677 tests + 1 deliberate
  animation-lane skip**, build clean. M9's faint-half flip verified —
  supervisor re-ran `turn13-dragonbreath-faint` **141/141** and
  `turn13-switchin` **242/242**; worker A/B-proved `dense-a` 205/256 is
  the pre-existing parked #23 exclusion byte-identical to baseline, not
  a regression; 715/715 + 190/190 + rank-1 pins held. M9 also fixed the
  dense-a/b missing-appRoute papercut (same class as entry 766's).
  Inventory rank-2 row annotated [FAINT HALF RETIRED].
- **S9 probes (merged):** (1) the ready-lag 6-tick anomaly is
  **route-specific** — a lab `factoryLegal` fixture with ONIX as player
  lead matches the quarantined species formula with **0-tick residual**;
  the formula is species-correct on 4 species and the canonical anchor
  route carries its own +6 (mechanism still unnamed). (2) DESTIN's real
  bench probed: GROVYLE slot 0 (real opener, previously unrecorded) /
  MURKROW slot 1 / PIDGEOTTO slot 2; real send-out order
  GROVYLE→PIDGEOTTO→MURKROW — the switch-in flip needs the real AI
  replacement rule, not next-index.
- **Round 10 dispatched (final work round before wind-down):** main M10
  — un-quarantine by route discrimination (species formula on
  staged/generated intros, canonical keeps its calibrated flat lag;
  715/715 hard), then MAGNETON affine-tint isolation (+ shadow verdict
  if unblocked), then 444/536. Side S10 — ported switch-policy vs the
  two canonical replacements (PIDGEOTTO at turn 5, MURKROW at turn 13)
  from committed evidence, honest-stop if inputs unreconstructable.
- **Notes:** wind-down after round 10: fold check, final gate, #56/#39
  trims, session report.
