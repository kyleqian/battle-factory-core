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

---
## 769 — [BOUNDED MAIN WORKER 2026-07-31 ~04:10] #39 rank-2 FLIPPED: DRAGON_BREATH/faint half onto turn13ResolutionAdapter.ts

- **State:** all mandated pins hold: `turn13-dragonbreath-faint.json`
  **141/141**, `turn13-switchin.json` **242/242**,
  `battle1-turn13-dense-a.json` **205/256** (pre-existing ISSUES #23
  parked projectile/shake exclusion + a named 3-frame HP-drain residual —
  confirmed byte-identical to the pre-flip baseline via a stash A/B, not a
  regression) / `-b.json` **223/223**. Insurance:
  `turn13-sandattack.json` **190/190**, `interactive-generated-intro-off`
  **715/715**. Rank-1 pins unaffected: `battle2-turn1-rockslide`
  **191/191**, `battle2-action-menu-dense` **209/209**. `npx tsc --noEmit`
  clean; focused suite (`turn13ResolutionAdapterEquivalence`,
  `turn13DragonBreathPresentationStaging`, `battleScene`,
  `battle2CommandAdapterEquivalence`, `executableFrontierRatchet`)
  **305/305** green. Full `npm test`/`npm run build` not run this step
  (side worker live concurrently, per brief).
- **Did:** Promoted `turn13ResolutionAdapterPreview.ts` → production
  `turn13ResolutionAdapter.ts` (rank-1's own promotion pattern) and wired
  `battleScene.ts`'s DRAGON_BREATH/faint half
  (`drawDragonBreathKoWindow`/`drawFaintedOpponentWindow`) onto it:
  `TURN13_DRAGONBREATH_HP` and the kickoff/faint line constants now come
  from one `resolveTurn13ResolutionAdapter()` call (replacing three
  separate direct staging-module imports), and
  `TURN13_FAINT_SINK_STEPS`/`TURN13_HEALTHBOX_VANISH_TICK` are now
  literally derived from the adapter's `opponentFaintSinkGeometry`
  formula (Pidgeotto yOffset=11) instead of independently hand-fit
  constants — deleted the now-dead `faintHealthboxVanishTick` helper.
  Renamed the equivalence test to `turn13ResolutionAdapterEquivalence.test.ts`
  (rank-1's own rename convention) to pin the live production path. Found
  + fixed a papercut in the same class as entry 766's: the ground-truth
  `battle1-turn13-dense-a/b.json` traces lacked `appRoute`, silently
  defaulting to `generated-orchestrator` and crashing on an unrelated
  Sitrus-heal string-resolver gap on that route — added explicit
  `appRoute: "canonical-recorded"` to both (same fix rank-1 applied to
  `battle2-turn1-rockslide.json`).
- **Next:** rank 3 (Turn-5 KO → Pidgeotto switch-in → Sitrus, per the
  inventory) is the next retirement slice. This rank's own switch-in half
  (Murkrow) stays OUT of scope/blocked exactly as banked: `stagePlayerHitChain`
  terminal-state exposure + DESTIN's unprobed bench (a side probe is
  running concurrently per round 9's own dispatch).
- **Notes (for the supervisor's ISSUES.md/inventory trim, left untouched
  per brief):** ISSUES #39's rank-2 row (docs/battle-scene-retirement-
  inventory.md) can now read [RETIRED] like rank 1's, and the #39
  "Retirement progress" prose should note rank 2 flipped onto
  `turn13ResolutionAdapter.ts`.

