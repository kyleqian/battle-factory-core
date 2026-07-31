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

---
## 776 — [SUPERVISOR FINAL WIND-DOWN 2026-07-31 ~04:50] Session CLOSED: 12 rounds / 24 workers / 0 failed steps. Gate 5 ticked; #39 ranks 1-2 retired + rank-3 groundwork; #56 items 1+3 resolved

- **State:** master green at FINAL gate **561 files / 5698 tests + 1
  deliberate animation-lane skip**, production build clean, tree clean
  at this commit. `animation-main` fold delta **0** throughout. Only the
  permanent `.worktrees/animation-main` remains; no orphan branches.
  **DEFERRED.md empty all session — no open deferred questions.**
- **Round 12 (verified):** M12 extracted `gEnemyMonElevation` (61
  species) and applied the solved origin rule at all three
  settled-opponent draw sites + made the elevated shadow persist into
  the command phase — supervisor re-ran **MAGNETON 424→703/751** and
  **YOSHI 699/751 held**; shadow branch **verified**; #56 item 3 marked
  RESOLVED. S12 banked rank-3 (turn-5 KO → PIDGEOTTO switch-in → Sitrus)
  equivalence for BOTH halves (6/6; Sitrus heal flows through the
  already-ported `HOLD_EFFECT_RESTORE_HP` + generic
  `resolveBattleStringLines`) with two findings: **#57 filed** (shared
  staging helper drops caller maxHP/item) and the inventory's "generic
  item projection missing" note **corrected** (only presentation-TIMING
  projection remains for the rank-3 flip).
- **Session totals (2026-07-30 22:10 → 07-31 04:50, 12 rounds, 24
  workers, 0 failed steps):** GATE 5 TICKED on its audited evidence
  chain (entry 772); #39 ranks 1 and 2 fully retired + rank-3
  equivalence banked; #56 items 1 (route-discriminated ready lag) and 3
  (elevation rule) resolved; #55/#57 filed; one worker pin-regression
  caught → quarantined → probe-discriminated → properly un-quarantined;
  suite 5586 → 5698 tests.
- **Next session (ordered, per user's Gate 5 → #39 → Gate 6):**
  (i) #39 rank-3 flip (checklist banked in entry 775 + S12's final
  report; needs the presentation-timing projection named there);
  (ii) #57 small fix (then retire rank-3's local staging workaround);
  (iii) #56 remainder (frames 444/536 + idle-bounce family; canonical
  +6 route term); (iv) ranks 4-9; (v) Gate 6 breadth.
- **Notes:** papercuts banked; ledger numbering instruction held for
  rounds 10-12 (no new collisions); no harness asks outstanding. This
  entry supersedes 772/774 as the resume point.
