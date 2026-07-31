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

---
## 786 — [BOUNDED MAIN WORKER 2026-07-31 ~11:50] #39 rank-4 slice 3 (turn-7/8 FEATHER_DANCE) + slice 2 (stat-fall banner) both landed

- **State:** `npx tsc --noEmit` clean; focused suite (turn78/turn67/turn6/
  turn11 FeatherDance*, executableFrontierRatchet, battleScene, battleMenu,
  battleMenuIdle, battle2CommandAdapterEquivalence, fightSubmenu,
  battleSetup, destinCanonicalReplacements, turn13/turn5ResolutionAdapter
  Equivalence — 14 files) **567/567 green**, no new ratchet barriers, no
  new canonical-recording imports. Tree clean at this commit. Full
  `npm test`/`npm run build` intentionally not run (side worktree
  `side-20260731-102516` live concurrently, per brief).
- **Did (3 commits):** (1) new `turn78FeatherDancePresentationStaging.ts`
  — ONE parameterized module (not two files, per the supervisor's own
  sequencing note) staging turn 7's (ATK 4→2) and turn 8's (ATK 2→0, floor
  hit but ordinary "harshly fell!" still plays) real FEATHER_DANCE kickoffs,
  RNG seeds carried forward from each preceding turn's own final ledger
  value and cross-checked by LCG inversion both directions. (2) flipped
  `drawTurn7/8FeatherDanceKickoffText` off turn 6's borrowed
  `TURN6_FEATHERDANCE_LINE1/2`/`TURN6_ATKFELL_LINE1/2` onto their own
  resolved constants (byte-identical text, real provenance now). (3) slice
  2: `drawStatDecreaseBannerForBattler`'s hardcoded-`attack` default is
  gone — `drawTurn6StatFallBanner` (shared by all 3 canonical windows) now
  takes an explicit palette param, each turn passing its own real
  `resolveTurnNFeatherDanceWindowContent().statChange.stat`-derived fact
  (narrow assert-attack guard, not a 7-stat translation table the window's
  real domain never needs). The 4th caller (`:30243`, animation-lane-owned
  `sceneOnFeatherDanceView` view) stays an explicit literal with a one-line
  cite — genuinely blocked by lane ownership, not laziness.
  Also fixed the same appRoute-missing papercut (class `e3a7f486`) on
  `turn7-feathers.json`/`turn8-feathers.json`/`turn6-statfall.json`, the
  three dense traces this step's own windows needed to get an oracle read
  at all.
- **All mandated pins hold exact:** turn6-featherdance 90/90, turn6-feathers
  235/235, turn6-rockslide-a/b 255/105, turn7-rockslide-a/b/c/d
  256/256/256/19, turn8-bind-a/b 256/66. New: turn7-feathers 145/145,
  turn8-feathers 162/162, turn6-statfall 127/127 (matches
  `docs/rank4-prep-scout.md` §3's own predicted number exactly). Insurance:
  turn5-rockslide 256/256, turn5-switchin 241/241, turn13-sandattack
  190/190, interactive-generated-intro-off 715/715, battle-command-
  generated-off 128/128; turn6/7/8-menu 44/93/88 spot-checked.
- **Next:** rank-4 slice 5 (turn-8 BIND kickoff+miss) is the only remaining
  slice — needs a new `{message, missMessage}` bridge shape +
  `stagePlayerHitChainToTerminalMachineState`'s `ENTRY_LABEL` made a
  parameter (or a local hand-rolled pipeline, turn6 FEATHER_DANCE's own
  precedent), both scoped in `docs/rank4-prep-scout.md` §2.4/§3 item 5.
- **Notes:** no papercuts beyond the appRoute ones fixed above (banked
  into the commits, not left as friction).
