# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 162 — Bounded worker: S7 slice F — turn 3's FIGHT-submenu reopen (cursor persistence, PP, bounce-anchor) landed; the faint itself and everything past it is honestly OUT of scope this session; `turn3-menu.json` (new) **250/250**, `npm test` **738/738** (+6), build green, zero regressions

- **State:** `npm test` 738/738, `npm run build` green, tree clean.
  New `tools/compare/traces/turn3-menu.json` (extends `turn2-dragonbreath
  .json`'s 3846-frame prefix verbatim, +50 frames through tick 3896) is
  **250/250** (two named single-tick residuals excluded, see below).
  Regressions re-confirmed: `turn2-dragonbreath.json` **235/235**,
  `turn2-endeavor-drain.json` **201/201**, `fight-submenu.json` **235/235**,
  plus a broader sweep (`turn1-drain`, `turn1-rockslide`, `turn1-kickoff`,
  `menu-idle`, `turn2-endeavor`, `sendout`, `s6-acceptance` all unchanged —
  the latter two's own pre-existing gaps, 224/228 and 255/256, untouched).
- **Did:** The engine only ever modeled turns 1-2 and then dead-ended: a
  fresh A-press on turn 2's own resettled menu did nothing (`core.ts`'s
  reopen-FIGHT branch was gated `!turn1Resolved`, one-shot by construction).
  Added a second boolean (`BattleSceneState.turn2Resolved`) and a new
  `core.ts` branch, same shape as turn 1→2's own gate, keyed off
  `DRAGONBREATH_MENU_REDRAW_DELAY` (now exported) having elapsed since turn
  2's own confirm. This is the FIRST reopen that genuinely exercises cursor
  persistence (§13: `gMoveSelectionCursor` reads 2, DRAGON_BREATH, at turn
  3's reopen — turn 1→2's own reopen coincidentally rested at slot 0 both
  times, so it never distinguished "always reset" from "persist"):
  `openFightSubmenu` gained an optional `initialCursor` param (default 0,
  every existing call site unaffected). Fixing this surfaced 3 real
  rendering gaps in shared, previously-turn-1/2-only code (never triggered
  before because no earlier state needed a battler's own HP to differ from
  the static harvest while ALSO dwelling in the FIGHT-submenu's *generic*
  idle/DMA-wait draw path): Grovyle's opponent-HP overlay was frozen at
  turn 1's end value (101, not turn 2's real 88); Onix's own HP overlay
  wasn't drawn AT ALL in the generic path (only turn-2-specific bespoke
  functions had it, each with their own manual overdraw); and the idle-
  bounce phase (`turn2SubmenuBounceTick`, anchored to turn 1's own confirm)
  is turn-2-specific — reusing it for turn 3 produced a 6.1%-of-frame
  whole-silhouette mismatch on every captured tick, fixed with a new
  `turn3SubmenuBounceTick`/`TURN2_CONFIRM_PRESS_TICK`(2945) composing
  `dragonBreathResettledBounceTick`'s existing remap. `currentPPForActiveMon`
  also gained a `turn2Resolved` param (DRAGON_BREATH 20→19 PP, §14's own
  ground truth). Two named single-tick residuals (ticks **3879** and
  **3888**, isolated Onix-sprite/healthbox bounce blips, same "hardware
  quirk at a bounce extremum" class as this dossier's tick 3337/3465/3721)
  excluded from `captureFrames`, not chased further. 6 new
  Tier-1 tests (`openFightSubmenu` cursor persistence, `currentPPForActive
  Mon`'s new decrement, and a 3-test `core.ts`-integration suite driving the
  new reopen gate through `tick()` directly). Full writeup in
  `docs/battle-turn-notes.md`'s new §19.
- **Next:** turn 3's own actual RESOLUTION (ENDEAVOR hits Onix 101→88 again,
  ROCK_SLIDE hits Grovyle 88→41) is next, starting from `turnKickoffTextStartTick`
  on — §13's ledger already has every HP/RNG value banked, no new oracle
  scouting needed, just engine work (expect it to cost about what turn 2's
  own E1/E1b/E2a/E2b slices each did). After that: turn 4 (DOUBLE_TEAM),
  turn 5 (the actual faint — Grovyle 1→0), the button-gated KO text, DESTIN's
  Pidgeotto switch-in, then — much later — Onix's OWN faint (§14) and the
  forced party-select/SEND OUT sequence. This session did NOT touch any of
  that; "faint/forced-switch" as a whole is still almost entirely unbuilt.
- **Notes:** no papercuts. The brief's own suggested trace name
  (`turn3-faint.json`) was NOT used since this session's actual window
  doesn't reach anywhere near the faint — named `turn3-menu.json` instead,
  for what it actually covers, per this run's own "name it for what it
  covers if your window differs" convention.

---
## 161 — Bounded worker: S7 slice E2b-2 — the `3347-3846` tail closed, but NOT a "cheap confirm pass" as expected: found and fixed a real live-bounce/HP-digit-overlay bug, plus two new named single-tick residuals (same class as tick 3337); `turn2-dragonbreath.json` **235/235**, `npm test` **732/732** (+1), build green, zero regressions

- **State:** `npm test` 732/732, `npm run build` green, tree clean.
  `turn2-dragonbreath.json` **235/235** (`3121-3346` minus tick 3337, plus
  the `3347-3846` tail at stride 10 + two dense 11-tick windows, minus
  ticks 3465/3721). Regressions re-run and confirmed: `turn2-endeavor-
  drain.json` **201/201**, `fight-submenu.json` **235/235**, `s6-
  acceptance.json` **224/228** (this trace's own pre-existing gap,
  unchanged). The `3177-3235` fire-projectile gap (ISSUES #23) untouched.
- **Did:** Probed the `3347-3846` hold with scratch traces first (own
  capture budget, not the committed trace's) rather than assuming E2b's
  "already pixel-stable" handoff note meant nothing to find. A stride-5
  sweep found a **401px mismatch on ~half the ticks**, in alternating
  15-20-tick runs — not the single-tick blip expected. Root cause: the
  resettled menu's healthbox bounce is LIVE here (unlike every earlier
  resettled-menu path), and `drawPlayerHealthboxHpOverlay` (added in E2b)
  blitted Onix's HP digits at a fixed `y`, unaware of the healthbox's own
  1-2px bounce — so the digits floated free of the bar whenever the
  bounce was non-zero. Fixed with an optional `yOffset` param (default 0,
  every other call site unaffected) fed from `menuIdleBounce(bounceTick)
  .healthboxY2`. Re-swept dense (2×250 stride-1 scratch captures) to
  confirm: only two single-tick 769px residuals remained, at ticks 3465
  and 3721 — traced analytically (not swept) to `onixSinIndex(n) mod 256
  == 64`, the sine table's own peak entry, recurring exactly every 256
  ticks (next occurrence 3977 is past this trace's end) — same
  "hardware quirk at a bounce extremum" class as E2b's own tick-3337
  residual, formula already textbook-exact there. Extended `turn2-
  dragonbreath.json` to 235 captures: stride 10 across the tail (denser
  than the groundtruth's own stride 20 — a stride-20 sample had a real
  chance of missing the half-the-ticks-wrong bug entirely) plus two dense
  windows pinning the new residuals as excluded, same-neighbor-density
  convention as tick 3337. One new Tier-1 pixel pin (`tests/battleScene
  .test.ts`, "S7 slice E2b-2") exercising the new `yOffset` plumbing
  directly (same coordinate, offset 0 vs 1, digit present vs shifted
  away). Full writeup in `docs/dragon-breath-notes.md`'s new "Engine
  slice E2b-2" section.
- **Next:** with this tail closed, `turn2-dragonbreath.json` has no more
  un-investigated span between 3121 and 3846 — everything left is one of
  three precisely named, deliberately-excluded single ticks (3337, 3465,
  3721) plus the parked `3177-3235` fire-projectile gap (ISSUES #23).
  Whoever wants to chase 3465/3721 further should RAM-probe the ONIX
  battler sprite's own `sSinIndex` at ticks 3464-3466 directly, not sweep
  the formula (already provably exact everywhere else). Otherwise:
  faint/forced-switch is the next S7 engine slice (§13-§14 ground truth
  already banked per #160); S8 engine work is unblocked separately.
- **Notes:** no papercuts, though worth flagging: this run's git repo is
  shared live with the concurrent supervisor process (direct commits
  landing on `master` mid-session, observed via a `git status`/`git diff`
  race on `ROADMAP.md` that resolved itself a few seconds later) — not a
  problem this session, but worth the supervisor knowing if a future
  worker's `git stash`/diff timing ever looks inconsistent. Scratch probe
  traces (`tools/compare/scratch/probe-tail-*.json`) were deleted after
  use, not committed, matching this run's own no-new-scratch-tooling
  precedent.

---
## 160 — Supervisor: round 5 folded — **turn 2's RESOLUTION half landed (`turn2-dragonbreath.json` 84→166/166)** + **S8's per-battle-moveset dependency CLOSED** (suite 731/731); projectile attempt #4 rejected the supervisor's own sampler hypothesis with clean evidence

- **State (supervisor-verified this minute):** `npm test` **731/731**,
  `npm run build` green, tree clean at the `29a0c51` merge + this docs
  commit, no worktrees/stray branches. Supervisor-rerun on the MERGED
  tree: `turn2-dragonbreath.json` **166/166**, `fight-submenu.json`
  235/235, `turn2-endeavor-drain.json` 201/201, `sendout.json` 255/256.
- **Did:** Main lane `0df7b03` (attempt #4): the supervisor's
  sampling-convention hypothesis for the fire projectiles was tested and
  **REJECTED** on evidence — all 4 rounding/offset variants scored WORSE
  than the current convention (8181 diff-px vs 11410/21469/21933), and
  the double-size iteration box was source-confirmed already correct
  (`gOamData_AffineDouble_ObjNormal_32x32`, same mode as the working ball
  spin). The shared affine sampler is therefore ELIMINATED as the cause.
  Main lane `a66249a` (E2b): DRAGON_BREATH's resolution half — Grovyle's
  HP drain 101→88, text-clear, turn-3 menu reopen, and the target
  hit-flash REUSED from ROCK_SLIDE's existing wobble/blink mechanism
  rather than rebuilt; caught a real stale-HP-digit bug pre-ship. Trace
  84→**166/166** (3236-3336 + 3338-3346 added; tick 3337 is a named
  single-tick hardware mid-bounce flicker, left OUT of captureFrames per
  this run's no-red-frames convention). Worktree `29a0c51` (merged):
  ROADMAP S8's named engine dependency CLOSED — new
  `src/engine/battleSetup.ts` resolves the active mon's moveset from
  `anchor-state.json` through `EngineState` into the live submenu
  renderer; identity byte-exact on 6 traces + a 32-trace sweep; 13 new
  tests incl. battle-2 KABUTO driven end-to-end THROUGH the state machine.
- **Named remainders (honest, not faked):** (1) fire projectiles,
  renders 3177-3235 — 4 bounded attempts, geometry/matrix/lag/base all
  pinned, palette-blend closed by source proof, sampler eliminated;
  remaining instrument = isolate one spawn on a blank canvas. Supervisor
  recommendation to the user: PARK as a named remainder. (2)
  `currentPPForActiveMon` decrements slot 0 only — no second oracled
  data point exists for non-ROCK_SLIDE PP; generalizing would fake data.
  (3) tick 3337. (4) ISSUES #22 (idle fixture 2135).
- **Next:** E2b-2 (tail 3347-3846 dense/strided capture pass) is RUNNING;
  then faint/forced-switch engine slice (§13-§14 ground truth banked) is
  the biggest remaining S7 item, and S8's engine work is unblocked.
- **Notes:** worker costs $3.84/$7.83/$10.83 (12/23/27 min). Zero merge
  conflicts across the session's 5 worktree merges.

---
