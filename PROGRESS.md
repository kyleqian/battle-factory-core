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

## 807 — [bounded worker, 2026-07-31 ~night] ISSUES #60 typed Scene-OFF stat adapter crash fixed

- **State:** implementation commit `f1bc60a2`; focused vitest is green
  (**25/25**, including executable-frontier ratchet **6/6**), full `npm test`
  is green (**567 files, 5708 passed + 1 skipped**), and `npm run build` is
  green. This lean ledger/issue commit follows; no ratchet pin moved and no
  unsupported branch was added.
- **Did:** widened the generated-route typed Scene-OFF stat banner from only
  battler-0 drops to the reusable 2×2 matrix: battler 0/1 × rise/drop. The
  adapter consumes the typed source direction, all seven extracted palettes,
  and the affected battler's live sprite/origin; no battle/turn/tick routing
  was added. Tier 1 proves all four cases, the exact battler-1 EVASION 7→8
  reproducer, deterministic command completion, target-footprint ownership,
  and malformed/directionless guards.
- **Next:** ISSUES #61, then #56 item 2 per entry 806's ordered backlog. #62
  records the retired reproducers' separate pixel debt; do not revive them as
  canonical fixtures or extend the retired Battle-2 march.
- **Notes:** recovered both deleted traces from `01eac159` into a fresh `/tmp`
  directory and added explicit `oracleProfile: battle-scene-off` only to the
  scratch acceptance copies. Both now execute without throwing; compare is
  **0/77** (Endeavor) and **0/237** (Dragon Breath). The crash family is
  closed; the red pixels pre-existed it and remain out of this step's scope.
- **PAPERCUT:** concurrent worktree CPU contention stretched the full suite to
  431s, ~5 minutes slower than an uncontended run.

## 806 — [supervisor tooling, 2026-07-31 ~night] ordinary Codex model/effort policy enforced

- **State:** master working tree contains the supervisor-policy change; full
  `npm test` is green (**567 files, 5706 passed + 1 skipped**) and `npm run
  build` is green. This docs update and the green commit follow.
- **Did:** added one shared launcher policy and enforced it at both supervisor
  and worker entry points: ordinary Codex permits exactly Terra/max,
  Luna/max (when available), or Sol/high. Omitted efforts resolve to the
  required value; mismatched efforts and unknown models fail before launch.
  Hybrid Codex workers inherit the same rule. Expanded the launcher profile
  suite from 16 to 21 tests and updated `SUPERVISOR.md`/CLI guidance.
- **Next:** resume the ordered gameplay backlog from entry 805: ISSUES #60,
  then #61, then #56 item 2.
- **Notes:** per the user's clarification, `--max-mode` is intentionally
  unchanged: all-Sol, with Sol/ultra supervisor and Sol/xhigh workers by
  default (workers may still lower to high).
- **PAPERCUT:** none this session.

## 805 — [bounded worker, 2026-07-31 ~night] ISSUES #39 rank-6 slice 4 (turn 4, FINAL) LANDED — rank 6 FULLY EXECUTED

- **State:** master HEAD is this session's own commit (src+tests+traces) —
  tree clean, `npx tsc --noEmit` clean, `npm run build` clean, focused
  vitest (battleScene 226/battleMenu 121/fightSubmenu 57/
  factoryBattleStartIntro 5/executableFrontierRatchet 6) 415/415 passed (one
  fewer than 804's baseline — the turn-4-only clone-z-order pin removed,
  content it tested no longer renders under OFF). Docs commit (this one)
  follows.
- **Did:** flipped turn 4's whole DOUBLE_TEAM+ROCK_SLIDE window to
  Scene-OFF, same class-(c)-delete/class-(b)-retime recipe slices 1-3
  established (full mechanism detail in ISSUES #39's own rank-6 paragraph).
  Every one of turn 4's own OFF timing constants landed EXACTLY the SAME
  numeric value as turn 1's own OFF window (80/146/83/156/327/362) — a
  second independent confirmation the whole DOUBLE_TEAM+ROCK_SLIDE
  choreography is fixed post-kickoff overhead; only the two post-drain tail
  boundaries (420/427) differ, tracking this turn's own smaller HP-drain
  diff. `drawDoubleTeamClones` (DOUBLE_TEAM never recurs after turn 4) is
  fully DELETED, not just call-site-edited — a genuine class-(c) mechanism
  removal — along with its now-dead helpers and four now-fully-dead
  ON-fit default params/constants slice 1 had introduced exclusively for
  turn 4's own sake. Found the SAME cross-turn bounce-chain bug slices 2-3
  each found one epoch upstream, one epoch further (turn 4's own
  `turn4SubmenuBounceTick`/`turn4KickoffBounceTick` still hardcoding turn
  3's ON-fit redraw delay with no override param at all), fixed via the
  same defaulted-param idiom. The frozen bounce-tick plateau needed its own
  fresh oracle-pixel grid search (this session's own lesson (b) — turn 4's
  case does NOT match slice 3's own `pressTick+9` finding; real hardware
  freezes turn 4's own confirm-wait bounce at `pressTick-11`, a 9-tick-wide
  plateau, grid-search-confirmed). Acceptance: `turn4-doubleteam-off.json`
  **256/256 EXACT**, `turn4-rockslide-off.json` **256/256 EXACT** — both
  fully exact, no residual at all; insurance `turn5-rockslide.json`/`turn8-
  bind-a.json` 256/256 each, zero regression; turns 1-3's own OFF traces
  re-verified zero regression (turn 3's own pre-existing ISSUES #61
  residual unchanged). Retired `turn4-{menu,doubleteam,rockslide}.json`
  (`git rm`). Re-pinned `tests/fightSubmenu.test.ts`'s two turn-4-reopen
  tests at the fresh OFF trace and `tests/battleScene.test.ts`'s turn-4
  describe block (clone-z-order pin removed — dead content; stat-rose-text
  pin re-timed).
- **Next:** rank 6 (turns 1-4) is now FULLY EXECUTED — nothing left in this
  rank. The idle-bounce phase family's turn-1-4 share is CLOSED
  (`docs/idle-bounce-phase-attribution.md` verdict (b)); its remaining
  share is turns 5-8, which is its own future rank/policy question for the
  supervisor, not started here. `docs/battle-scene-retirement-inventory.md`
  names what's next in the broader #39 retirement order.
- **PAPERCUT:** none this session.
- **SUPERVISOR WIND-DOWN (session close 2026-07-31 ~22:30; this addendum
  is the resume point):**
  - **Headline: rank 6 FULLY EXECUTED same-session as its adoption** (user
    decision recorded in archived entry 799). All four turns flipped to
    Scene-OFF-owned presentation at exact acceptance: slice 1/turn 1
    `01eac159` (81+230+256+102), slice 2/turn 2 `4c793748` (256+237, third
    attempt), slice 3/turn 3 `2e567316` (254/255 + 161, the 1 frame =
    pre-existing #61), slice 4/turn 4 `40414e55` (256+256). 13 legacy ON
    turn1-4 pins retired; `turn2-dragonbreath-projectiles.json` kept
    (explicit ON-only fixture). Idle-bounce phase family's turn-1-4 share
    CLOSED (verdict (b) confirmed); remaining share = turns 5-8 (future
    rank/policy question — NOT covered by the rank-6 user decision).
  - **Session totals: 6 workers / 4 slices landed / 2 honest non-landings**
    (slice-2 attempts 1-2, both reverted-with-findings-banked; the banked
    constants + salvaged edits made attempt 3 land). Final gate run by
    supervisor on this union: **567 files / 5701 passed + 1 skipped**
    (count down from 5722 = retired turn-keyed tests deleted with their
    windows), build clean, ratchet 6/6, all 10 rank-6 OFF pins +
    turn5-rockslide/turn8-bind-a insurance re-verified by supervisor
    directly. Tree clean at HEAD; DEFERRED.md empty all session; animation
    fold delta 0 at orient AND wind-down; no orphan worker branches.
  - **Slice-4 worker was killed by a usage limit (launcher exit 42) AFTER
    its landing commit** — work verified complete, exit code was the
    session's wind-down signal per the standing rule. No workers launched
    after it.
  - **New issues filed this session (both confirmed PRE-EXISTING via
    src-swap checks, not slice regressions):** #60 — profile-less
    turn-2-shaped traces crash on the post-#53 generated route (battler-1
    stat-RISE sibling of #59's fixed guard; repro recipe in the entry);
    #61 — reveal-boundary off-by-one at reopen+6 (oracle shows action menu,
    app shows submenu, single tick; suspected `t >= revealTick` boundary in
    the shared reveal mechanism, ~11 call sites).
  - **Next session (ordered):** (i) #60 fix (crash family on the
    production route, same shape as user-reported #59 — top candidate);
    (ii) #61 reveal-boundary off-by-one (RAM-probe the real boundary before
    touching the shared comparison); (iii) #56 item 2's two named sub-steps
    (intro-off rawElapsed pin → frame-444 discriminator; +6 universality
    probe fold-in); (iv) turn9/11/12-menu OFF pins (S9 landmark data
    banked; phase family turn-1-4 share now closed, turns 5-8 share
    remains); (v) turns 5-8 OFF pin policy question for the user when
    their re-timing comes up; (vi) rank 7 (FLY) / rank 8 (burn projection)
    inventory rows. #55 parked.

