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

## 804 — [bounded worker, 2026-07-31 ~night] ISSUES #39 rank-6 slice 3 (turn 3) LANDED — fallback invoked, turn 4 not attempted

- **State:** master HEAD is this session's own commit (src+tests+traces) —
  tree clean, `npx tsc --noEmit` clean, `npm run build` clean, focused
  vitest (battleScene 227/battleMenu 121/fightSubmenu 57/
  factoryBattleStartIntro 5/executableFrontierRatchet 6) 416/416 passed. Docs
  commit (this one) follows.
- **Did:** flipped turn 3's whole ENDEAVOR+ROCK_SLIDE window to Scene-OFF,
  same class-(c)-delete/class-(b)-retime recipe slices 1-2 established (full
  mechanism detail in ISSUES #39's own rank-6 paragraph — not renarrated
  here). New finding beyond the recipe: turn 3's own cross-turn bounce chain
  (`turn3SubmenuBounceTick`/`turn3KickoffBounceTick`) still hardcoded turn
  2's ON-fit redraw delay, AND its frozen-bounce plateau (previously a
  module constant that only coincidentally matched the live formula under
  ON) needed a fresh oracle-pixel grid search — real hardware freezes at
  `pressTick+9`, not the naive `pressTick+FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY`
  continuation. Acceptance: `turn3-endeavor-off.json` **254/255** (one
  residual — ISSUES #61, a pre-existing action-menu/submenu reveal-boundary
  bug confirmed present, worse even, on unmodified master, unrelated to this
  window's own content), `turn3-rockslide-off.json` **161/161** EXACT;
  insurance `turn5-rockslide.json`/`turn8-bind-a.json` 256/256 each, zero
  regression. Retired `turn3-{menu,endeavor,rockslide}.json` (`git rm`).
  Re-pinned `tests/fightSubmenu.test.ts`'s two turn-3 tests at the fresh OFF
  ticks (4043/4205/4212 replacing dead ON 4080/4349/4356) and redirected its
  button-script loader from the retired `turn3-menu.json` to
  `turn3-endeavor-off.json` (byte-identical segments).
- **Next:** turn 4 (rank-6 slice 4, DOUBLE_TEAM+ROCK_SLIDE) is next in
  order — fallback invoked this session (turn-4 attempt would have exceeded
  the session's own time budget after slice 3's bounce-chain investigation
  ran long); a clean turn-3-only landing per the brief's own fallback
  clause. Expect the SAME cross-turn bounce-chain fix pattern for
  `turn4SubmenuBounceTick`/`turn4KickoffBounceTick` (chained off THIS
  slice's own `TURN3_OFF_ROCKSLIDE_MENU_REDRAW_DELAY`=525) plus a fresh
  frozen-plateau grid search for turn 4's own confirm-wait window - budget
  time for both up front, not just the recipe's class-(c)/(b) split.
- **PAPERCUT:** none beyond ISSUES #61's own discovery.

## 803 — [bounded worker, 2026-07-31 ~night] ISSUES #39 rank-6 slice 2 (turn 2) LANDED — third attempt, both blockers root-caused

- **State:** master at `4c793748` — tree clean, tsc/build clean, focused
  vitest (battleScene 227/battleMenu 121/fightSubmenu 57/
  factoryBattleStartIntro 5/executableFrontierRatchet 6) 416/416 passed (20
  fewer than 802's baseline — obsolete ON-fit pixel pins for now-deleted
  class-(c) mechanisms removed, surviving class-(b) pins re-derived at their
  new OFF ticks). One commit (code+tests+traces); this docs commit follows.
- **Did:** restored attempt 2's salvaged 16-edit plumbing (banked in
  entry 802) plus a missing prerequisite the salvage didn't capture — six
  `turn2SubmenuBounceTick`/`turn2KickoffBounceTick` call sites in
  `battleScene.ts` still needed the explicit OFF `redrawDelay` override
  (only the two function definitions were salvaged). That restored the
  documented 210/256 plateau, then root-caused the real blocker as TWO bugs,
  not one: (1) Onix's own hit-flash **flicker** (`endeavorOnixInvisible`) is
  class (b) and survives — missing entirely from both prior attempts'
  analysis, paired with the already-known healthbox wobble via the identical
  hit-flash anchor+1 (RAM-confirmed both first flip RAM tick 3026/3027,
  mirroring the ON fit's own 118/119); fixed via `eraseSpriteFootprint`. (2)
  `drawMenuHealthboxPlayer(fb,0,dy)` never erased the nominal position
  before drawing translated content — safe everywhere else (always over a
  fresh background) but wrong against `menuIdleBase`'s flat harvest; fixed
  with a new `drawMenuHealthboxPlayerWobble` primitive (erase-then-redraw,
  same shape `drawOpponentHealthboxWobble` already uses). Also found the
  ENDEAVOR/DRAGON_BREATH text handoff has zero blank ticks (both delays are
  155, a same-frame swap) — the two prior attempts' own "156"/"blank tick"
  claim was an off-by-one, corrected via direct oracle pixel comparison.
  Acceptance: `turn2-endeavor-off.json` 256/256, `turn2-dragonbreath-
  off.json` 237/237, both EXACT; insurance `turn5-rockslide.json`/`turn8-
  bind-a.json` 256/256 each, zero regression. Retired
  `turn2-{endeavor,endeavor-drain,dragonbreath}.json`; kept
  `turn2-dragonbreath-projectiles.json` (ISSUES #60 domain). Tier-1 pin
  added (re-timed "S7 slice E1 tail" wobble+flicker block) per AGENTS.md's
  negative-dy-blit rule.
- **Next:** rank-6 slices 3/4 (turns 3-4) remain fully unstarted, next in
  order. Turns 5-8 remain explicitly out of rank-6's scope per the adopted
  policy.
- **PAPERCUT:** the salvaged-edits JSON from entry 802 was incomplete (16
  edits captured, but 6 call-site edits for the bounce-fix were missing) —
  cost ~10 minutes reconstructing them by comparing old/new call-site
  argument counts. Future salvage-and-reapply should diff the FULL file
  against a known-good base rather than trusting a partial edit list.

