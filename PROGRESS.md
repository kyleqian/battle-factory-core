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

## 789 — [SUPERVISOR FINAL WIND-DOWN 2026-07-31] Session CLOSED: 7 rounds / 14 workers / 0 failed steps. #39 ranks 3+4 FULLY retired; #57+#58 closed+deleted; #56 two probes resolved/sharpened; rank-5 policy PROPOSED

- **State:** master green at FINAL gate **5739 tests passed + 1
  deliberate animation-lane skip**, production build clean, tree clean
  at this commit. `animation-main` folded at wind-down (`e36a17c6`,
  one commit `555bab3f` — the orient-time delta was 0; the re-check
  caught it again). Only the permanent `.worktrees/animation-main`
  remains; no orphan branches. **DEFERRED.md empty all session.**
- **Session totals (2026-07-31 ~08:55 → ~11:40, 7 rounds, 14 workers
  M1-M7 + S1-S7, 0 failed steps; two honest stops both converted to
  landed work next round):**
  - **#39 rank 3 FULLY retired** (KO/switch-in `5db34996`, Sitrus
    `54278249`) and **rank 4 FULLY retired, all 5 slices**
    (`174cc388`, `441ddf83`+`6aba6662`, `0769ccc6`,
    `40c969e5`+`ef971686`). Every dense pin held at every rung.
  - **#57 closed+deleted** (`387a34a1` core + `14c4295b` retire) and
    **#58 found+filed+closed+deleted same-session** (`594442e6` core +
    `20b12d38` retire) — the shared staging helper now threads
    maxHP/item/statStages + entryLabel, all additive, all pinned.
  - **#56:** idle-bounce family closed no-app-bug (decisive instrument
    `432e16aa`: deltas +67/+139 unequal — falsified); frame 444
    resolved to exact sub-step with described fix (needs 751-frame
    regression); frame 536 model falsified sharper (RAM flat through
    542; species-lead term suspected). +6 route term untouched.
  - **Rank-5 unblocked by evidence** (`350424ed`): OFF gates only the
    move-anim script; committed turn9-12 pins are profile-less (=ON,
    never run vs this lane's oracle). Policy PROPOSED, NOT adopted.
  - Papercut class closed at breadth: appRoute added to 13 traces
    (`9929caf1` turn5, `e3a7f486` turn6/7/8, +3 in M6).
- **Next session (ordered):** (i) adopt-or-reject the rank-5 OFF-pin
  policy (inventory row 5 — it retires/replaces ON-profile pins; user
  or next supervisor decides at start); (ii) #56 frame-444 described
  fix behind a 751-frame regression + frame-536 probe extension;
  (iii) animation handoff: extract the five anim tables into
  `src/data/gen/` (side lane; ANIMATION_PROGRESS "For the main
  program" note — blocks animation rung 2); (iv) rank 6 (turns 1-4)
  or rank 9 postwin-mirror removal per inventory; (v) #56 +6 route
  term; #55 stays a parked boundary record.
- **Notes:** notification/monitor timestamps unreliable all session
  (spurious early "completed", clock-skewed monitor lines, one
  shared-log collision when two launchers started the same second) —
  policy that held: act only on fresh-shell `kill -0` + branch/log
  evidence. Sonnet side workers ran the full suite in their own
  worktrees despite briefs 3x (harmless, own node_modules; no action).
  This entry supersedes 788/787 as the resume point.

---
## 788 — [BOUNDED MAIN WORKER 2026-07-31 ~12:10] #39 rank-4 slice 5 (final rank-4 slice) landed: turn-8 BIND kickoff+miss flipped

- **State:** `npx tsc --noEmit` clean; focused suite (new
  turn8BindPresentationStaging, turn78FeatherDancePresentationStaging,
  turn67RockSlidePresentationStagingEquivalence, executableFrontierRatchet,
  turn13/turn5ResolutionAdapterEquivalence, battle2CommandAdapterEquivalence,
  battleScene, battleMenu, battleMenuIdle, fightSubmenu, battleSetup,
  destinCanonicalReplacements — 13 files) **559/559 green**, no new ratchet
  barriers, no new canonical-recording imports. Tree clean at this commit.
  Full `npm test`/`npm run build` intentionally not run (side worktree live
  concurrently, per brief).
- **Did (3 commits):** (1)+(2) additive infra: `turn1RockSlidePresentationStaging.ts`'s
  shared `stagePlayerHitChainToTerminalMachineState` gained an optional
  `entryLabel` param (defaults to the existing hardcoded entry, every
  pre-existing caller unaffected) plus `B_WAIT_TIME_SHORT` resolution (BIND's
  own miss branch is the first player-attacker chain to reach a `pause
  B_WAIT_TIME_SHORT` step); `presentationEventWindowBridge.ts` gained the
  scout-scoped third bridge shape, `resolveMoveMissedKickoffPresentationWindowContent`
  (`{message, missMessage}`, keyed on `BattleScript_PrintMoveMissed`/
  `BattleScript_MoveMissed` — a miss re-labels the SAME fixed
  `STRINGID_USEDMOVE` kickoff message under a different `sourceLabel` than a
  hit does). New `turn8BindPresentationStaging.ts` stages Onix's real turn-8
  BIND through `BattleScript_EffectTrap` (not the generic hit-chain entry)
  via the shared helper: the canonical MISS uses the real seed carried
  forward from `turn78FeatherDancePresentationStaging.ts`'s own turn-8
  post-roll value (680271464 → 3780969147, byte-identical to
  `docs/turn8-notes.md` §3's tick-9844 row); the on-hit trap-start branch is
  staged too but only as a kernel-only receipt (arbitrary already-documented
  seed, honestly labeled as NOT turn 8's real outcome — no renderer consumes
  it, the canonical line always misses). (3) flipped `TURN8_BIND_LINE1/2`/
  `TURN8_MISS_LINE1/2` in `battleScene.ts` onto the staged resolvers —
  byte-identical text, both stay exported at their existing names
  (`TURN8_MISS_LINE1/2` still reused verbatim by turns 12/14's own miss
  windows).
- **All mandated pins hold exact:** turn8-bind-a **256/256**, turn8-bind-b
  **66/66**, turn8-feathers 162/162, turn7-feathers 145/145, turn6-statfall
  127/127, turn6-featherdance 90/90, turn7-rockslide-a/d 256/19. Insurance:
  turn5-rockslide 256/256, turn13-sandattack 190/190,
  interactive-generated-intro-off 715/715, battle-command-generated-off
  128/128.
- **Rank 4 (`docs/rank4-prep-scout.md`) is now fully closed** — all 5 slices
  landed across this and prior sessions.
- **Next:** rank 4 has no remaining slices. Per entry 787, rank-5's Scene-OFF
  effect-visibility policy (PROPOSED, `docs/` scout `350424ed`) is queued for
  adoption at a future session's start; #56's frames 444/536 OAM probe (S7)
  may still be in flight in a side worktree. No papercuts beyond what prior
  entries already banked.

---
## 787 — [SUPERVISOR 2026-07-31 rounds 5-6] #58 fully closed+deleted; rank-4 slices 2+3 landed; rank-5 evidence banked (policy PROPOSED); round 7 = BIND + 444/536 probe

- **State:** master = M5 (#58 retire, `20b12d38`) + M6 (slices 3+2,
  `441ddf83`/`6aba6662`/`0769ccc6`) + S6's rank-5 scout merged
  (`da28661b`); union gate running at commit time — result in the
  wind-down entry. Supervisor independently re-ran turn6-featherdance
  90/90, turn7-rockslide-d 19/19 (post-M5), turn7-feathers 145/145,
  turn8-feathers 162/162, turn6-statfall 127/127, turn8-bind-b 66/66
  (post-M6). Worktrees/branches cleaned; only `animation-main` remains.
- **Headline:** #58 closed and DELETED same-session it was found
  (filed round 3 → core fixed round 4 → retired round 5). Rank 4 is
  slices 1-2-3 done, BIND (slice 5) the only remainder. M6 also landed
  slice 2 after slice 3 unblocked it — the supervisor's sequencing call
  (stage 7/8 first, then the wrapper flip is mechanical) held.
- **Rank-5 (S6, `350424ed`):** Scene-OFF effect-visibility census —
  source rule + oracle confirmation + the finding that all committed
  turn9-12 pins are profile-less (= Scene-ON, never run against this
  lane's oracle). Policy PROPOSED (class-(c) move bodies empty under
  OFF; re-time generic choreography on fresh OFF pins), endorsed as
  recommended plan; ADOPTION deliberately left to next session's start
  (it retires/replaces committed ON-profile pins — inventory row 5).
- **Also:** M5's slice-2 honest stop (4-caller wrapper) converted into
  M6's ladder — zero wasted work; M6 fixed the appRoute papercut class
  on three more traces (`turn7/8-feathers`, `turn6-statfall`) and a
  ledger-ordering bug (785 mis-appended below 784).
- **Next:** round 7 live — M7 = rank-4 slice 5 (BIND ladder, entry 788);
  S7 = #56 frames 444/536 OAM probe (new-files-only). Then wind-down.
