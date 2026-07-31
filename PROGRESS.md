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

## 783 — [BOUNDED MAIN WORKER 2026-07-31 ~10:10] #39 rank-4 slice 1 landed: turn-6/7 ROCK_SLIDE tails flipped

- **State:** `npx tsc --noEmit` clean; focused suite (renamed
  turn67RockSlidePresentationStagingEquivalence, executableFrontierRatchet,
  battleScene, battleMenu, battleMenuIdle, battle2CommandAdapterEquivalence,
  fightSubmenu, battleSetup, destinCanonicalReplacements,
  turn13/turn5ResolutionAdapterEquivalence) **539/539 green**, no new
  ratchet barriers, no new canonical-recording imports. Tree clean at this
  commit. Full `npm test`/`npm run build` intentionally not run (side
  worktree `side-20260731-100323` live concurrently, per brief).
- **Did (2 commits):** (1) fixed a blocking papercut: all ten turn6/7/8
  rank-4 compare traces lacked `appRoute`, same class `9929caf1` fixed for
  turn5-*.json — two (`turn6-featherdance`/`turn6-feathers`) crashed
  outright through the generated-orchestrator's own unrelated unfinished
  resolver, the rest silently mismatched; adding the field alone restored
  every trace to its expected baseline, zero source changes. (2) promoted
  `turn67RockSlidePresentationStagingPreview.ts` → `turn67RockSlide
  PresentationStaging.ts` (rank-1/2/3's own pattern) and flipped
  `battleScene.ts`'s turn-6/7 ROCK_SLIDE HP endpoints
  (`TURN6/7_PIDGEOTTO_AFTER_ROCKSLIDE_HP`, `:11038`/`:11302`) and
  attack-kickoff text (new `TURN6/7_ROCKSLIDE_ATTACK_LINE1/2`, replacing the
  shared `ROCK_SLIDE_LINE1/LINE2` hand literals at those two call sites
  only — every other turn's own ROCK_SLIDE window still reads them
  directly, untouched) onto the adapter's real staged facts.
- **All mandated pins hold exactly:** turn6-featherdance 90/90,
  turn6-feathers 235/235, turn6-rockslide-a/b 255/255 105/105,
  turn7-rockslide-a/b/c/d 256/256/256/19, turn8-bind-a/b 256/66. Insurance
  pins held: turn5-rockslide 256/256, turn5-faint 110/110, turn5-switchin
  241/241, turn5-sitrus-a/b/c/d 110/82/181/133, interactive-generated-
  intro-off 715/715, battle-command-generated-off 128/128.
- **Next:** #58 (shared helper drops `statStages`) is still open, owned by
  whoever picks it up — not touched this step (this module's own local
  pipeline workaround stays). Remaining rank-4 slices per
  `docs/rank4-prep-scout.md`: slice 2 (turn-6 stat-fall banner, §2.3's
  named blocker), slice 3 (turn-7/8's own repeat FEATHER_DANCE staging,
  two new modules), slice 5 (turn-8 BIND kickoff+miss, needs a new bridge
  shape + entry-label parameter). Then retire this module's own local
  `statStages` workaround once #58 lands (recipe `14c4295b`).
- **Notes:** no papercuts beyond the one fixed above (already banked into
  the commit, not left as friction).

---
## 782 — [SUPERVISOR 2026-07-31 round 3] M3 (#56 idle-bounce falsification banked) + S4 (rank-4 groundwork + NEW #58) verified and merged

- **State:** master = M3 (test+docs only, verified no production change;
  instrument test re-run 3/3 by supervisor) + S4's `1c015a37` merged
  (`7ddaa69c`); S4's 20 preview-equivalence tests + ratchet re-run green
  in-worktree by supervisor before merge; worktree/branch cleaned. Union
  gate for this round runs with round 4 (docs-and-new-files-only delta
  since the last green gate).
- **M3 (#56 idle-bounce):** decisive instrument = the probe doc's third
  branch — deltas UNEQUAL (+67 YOSHI vs +139 MAGNETON), flat-constant
  app bug falsified, `BATTLE_COMMAND_ACTION_ENTER_DELAY` ruled out on
  magnitude; NO production change (correct per decision rule). Banked:
  committed instrument test + a narrower reversed-order gap lead (doc Q2
  addendum). All four dense pins reconfirmed unchanged.
- **S4 (rank-4 groundwork):** turn-6/7 ROCK_SLIDE-tail preview adapter
  equivalence-proven (156→113, 113→82; attack lines via STRINGID_
  USEDMOVE). **Found #58** (filed): shared staging helper also drops
  `statStages` — live-proven 156→71 wrong damage vs real 156→113;
  same class as #57, same fix recipe.
- **Docs:** #58 filed; #56 item 2 rewritten (idle-bounce closed
  no-app-bug; 444/536 + reversed-gap lead + item-1 +6 route term remain).
- **Next:** round 4 — M4 = rank-4 slice-1 flip (consume S4's adapter);
  S5 = #58 fix (additive statStages threading + pin, existing callers
  bit-identical). Then retire the preview's local pipeline (recipe
  `14c4295b`), then remaining rank-4 slices / Gate 6 breadth.

---
## 781 — [BOUNDED MAIN WORKER 2026-07-31 ~10:00] #56 item 2 CLOSED (no fix): decisive instrument ran, flat-constant hypothesis falsified

- **State:** `npx tsc --noEmit` clean; focused suite (issue56ActionMenuHandoffFrame,
  executableFrontierRatchet, battleCommandPresentation, battleMenu,
  battleMenuIdle, factoryBattleStartIntroAckAlignment,
  factoryRoundBattleOrchestrator) **212/212 green**, no new ratchet
  barriers, no new canonical-recording imports. Tree clean at this
  commit. Full `npm test`/`npm run build` intentionally not run (side
  worktree `side-20260731-094832` live concurrently, per brief,
  precedent entries 775/777/779). All four mandated pins independently
  reconfirmed via `npm run compare` (no production code touched, so
  unchanged as expected): `factory-arbitrary-intro-yoshi-off`
  **699/751**, `factory-arbitrary-intro-magneton-off` **703/751**,
  `interactive-generated-intro-off` **715/715**,
  `battle-command-generated-off` **128/128**.
- **Did:** ran S2's own named decisive step verbatim
  (`docs/issue56-residual-probe.md` Q2's "what fact would decide it"):
  new committed test `tests/issue56ActionMenuHandoffFrame.test.ts` drives
  `beginFactoryRoundBattleStartIntro`/`advanceFactoryRoundBattleStartIntro`
  tick-by-tick for the real YOSHI/MAGNETON tuples and logs the
  app-relative frame where `battleCommandPresentation.lifecycle.phase`
  first reads `"action-menu"`: **678** (YOSHI) and **689** (MAGNETON).
  Compared against the probe's RAM-fitted `n0` (611/550): deltas **+67**
  and **+139** — NOT equal (off by 72), so neither "no change needed" nor
  "one flat constant explains both" holds; the named leading suspect
  (`BATTLE_COMMAND_ACTION_ENTER_DELAY`'s flat 6-tick) is independently
  ruled out on magnitude alone (max possible contribution is 6, an order
  of magnitude short of either delta). Per the brief's own decision rule:
  **no production code changed** — banked the falsification instead of
  guessing.
- **Docs:** `docs/issue56-residual-probe.md` extended with the instrument
  result, an updated Q2 summary-table row (CLOSED, no fix), and a named
  follow-up observation for whoever picks this class of question up next:
  the RAM-fitted `n0` gap between species (611−550=61, tracks the known
  cry-duration-driven ready-lag spread) is much larger than the app's own
  action-menu-handoff gap between the same two fixtures (689−678=11) — a
  ~50-tick discrepancy in the *inter-species gap itself*, not chased this
  step (out of this step's scope, which was the idle-bounce phase-offset
  question specifically), but concrete and falsifiable.
- **Next:** #56 item 2 is closed (no more idle-bounce-phase-offset work
  to schedule). Remaining #56 items: item 2's own frames 444/536 (single-
  tick 2-3px sub-step misalignments, site named not sub-step-isolated,
  lowest priority per the probe) and item 1's leftover +6 canonical route
  term (two undistinguished candidates, docs/onix-readylag-destin-bench-
  probes.md). Rank-4 slice 1 (ROCK_SLIDE tails, `docs/rank4-prep-scout.md`)
  is the next substantive track. The newly-named inter-species ready-lag
  gap (above) is a fresh, separate lead if anyone wants it.
- **Notes:** no papercuts this step.
