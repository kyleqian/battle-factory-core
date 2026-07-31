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

---
## 780 — [SUPERVISOR 2026-07-31 round 2] M2 (#39 rank-3 complete + #57 closed), S2 (#56 probe), S3 (rank-4 scout) all verified and merged

- **State:** master = M2's three commits + S2 (`45220c2f`, #56 evidence
  probe) + S3 (`08d49fe0`, rank-4 prep-scout) merged (`7abe977c`,
  `df6234df`); union `npm test`+`npm run build` gate running at commit
  time — result in the next entry if not amended here. Supervisor
  independently re-ran: turn5-sitrus-a **110/110**, turn5-sitrus-d
  **133/133**, turn5-rockslide **256/256** post-M2; equivalence test
  checked non-self-referential (hard-value anchors both sides). Both
  merged side worktrees/branches cleaned; only `animation-main` remains.
- **Headline:** **#39 rank 3 fully retired and #57 fully closed** (entry
  deleted). Retirement inventory rank-3 row updated by M2; #39 prose
  updated by supervisor.
- **S2's #56 evidence (docs/issue56-residual-probe.md):** idle-bounce
  oscillator RAM-proven exact + species-independent — residual is a pure
  phase offset; decisive instrument step named (instrument
  `idleBounceElapsed` start frame; leading suspect
  `BATTLE_COMMAND_ACTION_ENTER_DELAY`'s flat 6-tick,
  `battleCommandPresentation.ts:126`). Frames 444/536 = single-tick 2-3px
  sub-step misalignments (site named, sub-step not isolated). +6 route
  term: `BATTLE_TYPE_FIRST_BATTLE` falsified; two candidates remain.
- **S3's rank-4 scout (docs/rank4-prep-scout.md):** corrected inventory
  warning — stat-down bridge already generalizes ATK/ACC; turns-6/7
  ROCK_SLIDE tails stage through the existing helper with ZERO new
  surface (recommended first slice); BIND needs a `{message,
  missMessage}` bridge shape + entry-label fix.
- **Next:** round 3 — M3 = #56 idle-bounce instrument-then-fix (S2's
  named decisive step). Then rank-4 slice 1 (ROCK_SLIDE tails) per the
  scout. Side workers' harmless full-suite runs in own worktrees noted
  (twice despite brief; no action).

---
## 779 — [BOUNDED MAIN WORKER 2026-07-31 ~09:45] #39 rank-3 FULLY RETIRED: Sitrus heal content flipped (half 2 of 2) + #57 remainder closed

- **State:** `npx tsc --noEmit` clean; focused suite (turn5Resolution
  AdapterEquivalence, turn13ResolutionAdapterEquivalence, battleScene,
  executableFrontierRatchet, battleMenu, battleMenuIdle, fightSubmenu,
  battleSetup, destinCanonicalReplacements, stagePlayerHitChainMaxHpItem)
  **514/514 green**, no new ratchet barriers, no new canonical-recording
  imports. Tree clean at this commit. Full `npm test`/`npm run build`
  intentionally not run (side worktrees `side-20260731-090707` and
  `side-20260731-093409` both live concurrently, per brief, precedent
  entries 775/777).
- **Did (2 commits):** (1) **#57 remainder** (`14c4295b`): swapped
  `turn5ResolutionAdapter.ts`'s `stageTurn5KoHitChainToTerminalMachineState`
  off its own local `battler()`/`createBattleScriptRulesContext`/
  `createBattleScriptStatusRulesExecution`/`stepBattleScriptMachine` loop
  onto the now-fixed shared `stagePlayerHitChainToTerminalMachineState`
  (`387a34a1`) — deleted ~120 lines of local workaround; every existing
  equivalence test stayed green unchanged, proving the swap safe. (2)
  **Sitrus half flip** (`54278249`): `battleScene.ts`'s
  `TURN5_SITRUS_HEAL_HP_START`/`_END` and `TURN5_SITRUS_HEAL_LINE1`/`_LINE2`
  now source from `resolveTurn5SitrusAdapter()` (exported, were unexported
  hand literals) instead of independently re-stated constants; the
  presentation-TIMING curves (`turn5SitrusHealTextVisibleChars`,
  `turn5SitrusOnixHp`'s animation shape, `turn5SitrusRingMatrix`,
  `turn5SitrusResettledBounceTick`) are untouched, still their own
  oracle-pixel-fit closed forms — only the content/keying changed, per the
  brief's own explicit boundary. `TURN5_PRESENTATION_TIMING_NOT_STAGED`
  deleted; the equivalence test's "documented gap" block replaced with real
  pins comparing `battleScene.ts`'s exported constants against a fresh,
  independently-computed `resolveTurn5SitrusAdapter()` call in the test
  (rank-1/2's own "pin the live production path" convention). No new
  turn/battle-number branch added; `SWITCHIN_SENTOUT_TEXT_START_TICK` stays
  the absolute anchor half 1 left.
- **All mandated pins hold exactly** (oracle-verified, entry-777
  baselines): turn5-rockslide 256/256, turn5-faint 110/110, turn5-switchin
  241/241, turn5-sitrus-a/b/c/d 110/82/181/133, turn5-endeavor 254/254,
  turn5-menu 42/42, turn5-healthbox 55/55, turn5-sentout 141/141; insurance
  pins turn13-dragonbreath-faint 141/141, turn13-switchin 242/242,
  turn13-sandattack 190/190, interactive-generated-intro-off 715/715,
  battle-command-generated-off 128/128.
- **Docs:** `docs/battle-scene-retirement-inventory.md` rank-3 row and its
  "Blocked work" item both updated to RETIRED/RESOLVED, citing `5db34996`
  + `54278249`. #39/#57 in ISSUES.md deliberately left untouched per this
  step's own brief — **#57 remainder is closed**; supervisor deletes the
  entry after verification. #39 rank-3 is now fully retired (both halves);
  the still-open remainder is `turn5KoDismissElapsed`/`turn5Resolved`'s own
  mirroring (unchanged this step, same shape as rank 2's own analogous open
  note — see the inventory row).
- **Next:** ranks 4-9 (rank 4 next per the inventory's own recommended
  order: Turns 6-8 Pidgeotto loop, blocked on a generic Scene-OFF stat/
  no-effect/item controller presentation — see the inventory's "Blocked
  work" section); #56 remainder (frames 444/536 + idle-bounce family) is
  S2's own live track; Gate 6 breadth after.
- **Notes:** no papercuts this step.

