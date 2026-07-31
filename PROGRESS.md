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

---
## 778 — [SUPERVISOR 2026-07-31 round 1] M1 (#39 rank-3 half 1) + S1 (#57 core fix) both verified and merged; round 2 dispatching

- **State:** master = M1's flip + S1's `387a34a1` merged (`b9fad3f7`);
  full union `npm test` + `npm run build` gate running at commit time —
  result recorded in the next entry if not amended here. Supervisor
  independently re-ran: turn5-switchin **241/241**, turn5-faint
  **110/110**, turn5-sitrus-c **181/181**, and post-merge
  turn13-dragonbreath-faint **141/141** + turn13-switchin **242/242**
  (the maxHP values S1 un-dropped change no pixels). Trace rewrite in
  `9929caf1` checked semantically (`turn5-sitrus-c` old==new modulo
  `appRoute` + pretty-print).
- **Verified worker deviations (both accepted on checked evidence):**
  M1's `turn5KoDismissElapsed` narrowing (36b60ec5 truly touches no
  dismiss-elapsed code — my brief overstated the model; field is
  state-only, never render-read) and S1's wider focused suite (11
  files/65 tests). S1 finding worth keeping: turn13 staging already
  supplied maxHP 117/156 that the pre-fix helper silently dropped.
- **Docs:** #57 trimmed to its open remainder (swap
  `turn5ResolutionAdapter.ts`'s local staging onto the fixed helper);
  #39 + inventory rank-3 row updated to half-1-retired.
- **Next:** M2 = rank-3 half 2 (Sitrus presentation-timing projection +
  #57 remainder swap). S2 (live) = #56 residual evidence probe
  (new-files-only). Then ranks 4-9 / Gate 6 breadth as time allows.
- **Notes:** launcher/monitor notification timestamps proved unreliable
  this session (spurious early "completed" + clock-skewed monitor
  events); policy adopted: act only on `kill -0` from a fresh shell.
  Both round-1 launchers also named the SAME raw JSONL log
  (`...085850.jsonl`, both launched the same second) — worker events
  interleave in it; read with session_id filters.

---
## 777 — [BOUNDED MAIN WORKER 2026-07-31 ~05:45] #39 rank-3 flip, half 1 of 2 DONE: adapter promoted, faint-sink geometry + PIDGEOTTO switch-in literals flipped; Sitrus half deliberately deferred

- **State:** `npx tsc --noEmit` clean; focused suite (turn5Resolution
  AdapterEquivalence, turn13ResolutionAdapterEquivalence, battleScene,
  executableFrontierRatchet, battleMenu, battleMenuIdle, fightSubmenu,
  battleSetup, destinCanonicalReplacements) **513/513 green**, no new
  ratchet barriers, no new canonical-recording imports. Tree clean at
  this commit. Full `npm test`/`npm run build` intentionally not run
  (side worker live concurrently, per brief, precedent entry 775).
- **Did (2 commits):** (1) **Papercut fix, found before any flip work**:
  all ten `tools/compare/traces/turn5-*.json` lacked `"appRoute"`,
  silently defaulting to `"generated-orchestrator"` instead of
  `"canonical-recorded"` — every one mismatched wholesale (0/N, 20-46%
  diff) despite zero renderer bug; same class bd1d6beb already fixed for
  `battle1-turn13-dense-a/b.json`. Bisected to rule out any commit in
  this session before concluding it was the missing field (confirmed:
  `turn5-menu.json` already had it set and was the ONE turn5 trace
  passing). Fixed by adding the field; zero source changes. (2) **The
  actual flip**: promoted `turn5ResolutionAdapterPreview.ts` ->
  `turn5ResolutionAdapter.ts` (+ test rename), added
  `resolveTurn5FaintSinkGeometry` (reuses `turn13ResolutionAdapter.ts`'s
  own generic `opponentFaintSinkGeometry`, now also exporting
  `frontYOffset`, evaluated at Grovyle's real yOffset=4). `battleScene.ts`
  now sources `GROVYLE_FAINT_SINK_STEPS`/`GROVYLE_HEALTHBOX_VANISH_TICK`
  from that formula (deleting the hand-fit `8`/`+19` constants) and
  `PIDGEOTTO_LEVEL`/`pidgeottoHealthboxContent`'s name/level/hpFraction/
  `SWITCHIN_SENTOUT_LINE2` from `resolveTurn5SwitchInAdapter()` — mirrors
  36b60ec5's MURKROW diff exactly, including leaving
  `pidgeottoHealthboxContentForHp`'s own per-tick `PIDGEOTTO_MAX_HP=156`
  denominator alone (same as MURKROW's analogous `142`, out of scope).
- **All mandated pins hold exactly**: turn5-rockslide 256/256, turn5-faint
  110/110, turn5-switchin 241/241, turn5-sitrus-a/b/c/d 110/82/181/133,
  turn5-endeavor 254/254, turn5-menu 42/42, turn5-healthbox 55/55,
  turn5-sentout 141/141; insurance pins turn13-dragonbreath-faint
  141/141, turn13-switchin 242/242, turn13-sandattack 190/190,
  interactive-generated-intro-off 715/715, battle-command-generated-off
  128/128.
- **Deliberately NOT done, with reasons (honest stop within the cap):**
  (a) **Sitrus heal half stays fully hand-fit** — `TURN5_PRESENTATION_
  TIMING_NOT_STAGED` stays exported `true`; this is rank-3's own named
  "half 2 of 2", not this step's scope. (b) **`turn5KoDismissElapsed`
  left alone** — investigated the brief's "replace it the same way
  36b60ec5 replaced turn13's" instruction and found it doesn't hold:
  `git show 36b60ec5` touches zero dismiss-elapsed code, and grep across
  `src`/`tests` shows `turn5KoDismissElapsed` is never read by any render
  path (only gates a one-shot input edge in `core.ts:901-905`), so
  "the render path doesn't inspect a turn number" was already true for
  it. It cannot be merged into turn13's own generic
  `opponentFaintDismissElapsed` field either: that field's one-shot
  latch never resets (`core.ts:913`, `=== null` guard), so turn 5's own
  dismiss would permanently block turn 13's real dismiss detection from
  ever firing again — a genuine regression against `turn13-switchin
  .json`'s own 141/141 pin, confirmed by reading `core.ts`'s full input
  chain and both fields' own dedicated test suites
  (`battleScene.test.ts:1657`, `:2696`). Left as two independent
  one-shot latches, which is what the current architecture requires.
- **Next:** rank-3 half 2 (Sitrus heal presentation-timing projection —
  `resolveTurn5SitrusAdapter` is already proven, just not wired); then
  #57 (shared staging helper's dropped maxHP/item), then ranks 4-9.
- **Notes:** no papercuts beyond the one fixed above (banked in the
  commit, not PAPERCUTS.md — a real bug in committed data, not dev-loop
  friction).
