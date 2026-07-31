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

## 774 — [SUPERVISOR FINAL WIND-DOWN 2026-07-31 ~04:35] Round 11 verified: #39 rank 2 FULLY retired; MAGNETON tint rule SOLVED (gEnemyMonElevation). Session closed: 11 rounds / 22 workers / 0 failed steps

- **State:** master green at FINAL gate **559 files / 5688 tests + 1
  deliberate animation-lane skip**, production build clean, tree clean.
  `animation-main` fold delta **0** (orient and wind-down). Only the
  permanent `.worktrees/animation-main` remains; no orphan branches.
  **DEFERRED.md empty all session** — no open deferred questions.
- **Round 11 (verified):** M11 flipped the rank-2 Murkrow switch-in half
  (supervisor re-ran `turn13-switchin` **242/242** and
  `turn13-dragonbreath-faint` **141/141**; real
  `openpartyscreen`/`switchindataupdate` opcodes materialize MURKROW from
  DESTIN's probed bench through the 0-draw proven replacement) — **#39
  rank 2 is fully retired**, issue + inventory updated. S11 solved the
  MAGNETON materialize-tint rule with 4 species + source confirmation:
  `origin.y = 8 + yOffset − gEnemyMonElevation[species]`, where
  `gEnemyMonElevation` (`battle_anim_mons.c`) is a never-extracted
  per-species elevation table — #56 item 3 is now a bounded
  extract-and-apply step (probe fixtures committed).
- **Session totals (2026-07-30 22:10 → 07-31 04:35):** GATE 5 TICKED
  with its audited evidence chain (entry 772 has the full summary);
  #39 ranks 1 and 2 retired end-to-end via the equivalence-first
  two-phase pattern; #55/#56 filed with precise remainders; one
  worker-committed pin regression caught, quarantined, root-caused by
  discriminating probe, and properly un-quarantined; suite grew
  5586 → 5688 tests across 30+ commits.
- **Next session (ordered, per user's Gate 5 → #39 → Gate 6):**
  (i) #39 rank 3 (Turn-5 KO → switch-in → Sitrus) equivalence-first;
  (ii) #56: extract `gEnemyMonElevation` + apply the solved formula
  (expect MAGNETON ≫424/751, then rule on the elevated-shadow branch),
  frames 444/536, canonical +6 route term; (iii) ranks 4-9; (iv) Gate 6
  breadth.
- **Notes:** papercuts banked in PAPERCUTS.md; ledger-collision
  numbering instruction now proven in two consecutive briefs; no
  harness asks outstanding.

---
## 773 — [BOUNDED MAIN WORKER 2026-07-31 ~04:20] #39 rank-2 switch-in half RETIRED: stagePlayerHitChain terminal exposure + Murkrow switch-in flip

- **State:** all mandated pins hold: `turn13-switchin.json` **242/242**
  (hard), `turn13-dragonbreath-faint.json` **141/141**,
  `battle1-turn13-dense-a.json` **205/256** (pre-existing #23-parked
  exclusion, A/B baseline) / `-b.json` **223/223**,
  `turn13-sandattack.json` **190/190**, `interactive-generated-intro-off`
  **715/715**; rank-1 pins unaffected (`battle2-turn1-rockslide.json`
  191/191, `battle2-action-menu-dense.json` 209/209). `npx tsc --noEmit`
  clean; focused suite 443/443 green; ratchet unchanged (no new barriers).
  Full `npm test`/`npm run build` not run this step (side worker live
  concurrently, per brief).
- **Did:** (1) Exposed `stagePlayerHitChain`'s terminal
  `BattleScriptMachineState` additively
  (`stagePlayerHitChainToTerminalMachineState`,
  `turn1RockSlidePresentationStaging.ts`) plus two new optional inputs
  (`party`, `battleTopology`) — every pre-existing caller unaffected (same
  computation, empirically confirmed via unchanged pinned test outputs).
  (2) `turn13DragonBreathPresentationStaging.ts` DRY'd its staged input
  and added `stageTurn13DragonBreathHitChainToTerminalMachineState`,
  carrying DESTIN's real bench (`docs/onix-readylag-destin-bench-
  probes.md` Probe 2, `docs/battle-turn-notes.md` HEADLINE 3 for MURKROW's
  full stat block) and `BATTLE_TYPE_FACTORY`. (3)
  `turn13ResolutionAdapter.ts`'s new `resolveTurn13SwitchInAdapter` chains
  that terminal state through `runBattleScriptFaintedActionsOrchestration`
  — the real `openpartyscreen` opcode picks MURKROW via
  `getMostSuitableMonToSwitchInto` (already proven in
  `tests/destinCanonicalReplacements.test.ts`) and `switchindataupdate`
  rebuilds the incoming battler's real species/level/HP; result "resumed"
  (not terminal), MURKROW/slot 1/Lv50/142/142. (4) Flipped
  `battleScene.ts`'s `MURKROW_LEVEL`, `murkrowHealthboxContent`'s name/
  level/hpFraction, and `TURN13_SWITCHIN_SENTOUT_LINE2` onto this adapter
  (same promotion discipline as the two prior flips); left
  `murkrowHealthboxContentForHp`'s own per-tick HP-fraction literal (142,
  turns 14-16's ongoing tracking) alone — out of scope.
- **Next:** #39 rank 3 (Turn-5 KO → Pidgeotto switch-in → Sitrus) via the
  same proven equivalence-first two-phase pattern; the turn-14 dispatcher/
  slot-2 PP mirroring (`TURN13_TURN14_HANDOFF_NOT_STAGED`) stays a later
  step's own flip.
- **Notes:** ISSUES.md #39 rank-2 row can now read fully retired (both
  halves); `docs/battle-scene-retirement-inventory.md` rank-2 row's
  "Switch-in half still keyed" caveat is stale and should be dropped in
  the same trim. No papercuts this step.

---
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
