# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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
## 159 — Bounded worker: S7 slice E2b — DRAGON_BREATH's RESOLUTION half landed (HP-bar drain, hit-flash reuse, text-clear, turn-3 menu reopen): `turn2-dragonbreath.json` extended 3121-3176/3236-3263 (84/84) -> +3264-3346 minus one named tick, **166/166 green**; `npm test` **718/718** (+7 Tier-1), build green, zero regressions

- **State:** `npm test` 718/718, `npm run build` green, tree clean.
  `turn2-dragonbreath.json` **166/166** (`3121-3176`+`3236-3263`+`3264-3346`
  minus `3337`). Regressions re-run and confirmed: `turn2-endeavor-drain.json`
  **201/201**, `turn1-drain.json` **102/102**, `fight-submenu.json`
  **235/235**. The `3177-3235` fire-projectile gap (E2a-2..E2a-5, parked)
  is untouched, per the brief's explicit out-of-scope.
- **Did:** Landed all four of the brief's E2b priorities. (1) **Grovyle's
  HP-bar drain**: `dragonBreathGrovyleHp` (exported, `battleScene.ts`) —
  same 1-HP/tick clamped shape as `rockSlideOpponentHp`/`endeavorOnixHp`,
  start=101 (`anchorOpponentAfterTurnHp`, reused — the phase table's own
  "100→88" prose was a minor imprecision, the committed ram-dump's
  `before_turn2.battler1.hp` actually reads 101, matching 101-88=13 =
  the locked damage roll), end=88 (new `anchorOpponentAfterTurn2Hp`).
  (2) **Hit-flash**: DRAGON_BREATH's own `SpriteCB_HitAnimHealthoxEffect`
  (3263-3283, 20 ticks) turned out to be the SAME generic mechanism
  ROCK_SLIDE's own `rockSlideHealthboxWobbleY2`/`rockSlideMonBlinkInvisible`
  already model — reused via input-translation (a `pressTick` offset
  constant) rather than rebuilt, exactly the "check if already modeled
  under a different name" the scout doc flagged. `drawOpponentHealthbox
  Wobble` gained an optional `content` param (default unchanged) so it
  could take Grovyle's real 101-HP content instead of the full-143 one
  every ROCK_SLIDE caller assumes. (3) **Text-clear + (4) turn-3 menu
  reopen**: `drawTurn2KickoffText` extended with `DRAGONBREATH_TEXT_CLEAR_
  DELAY`(384)/`DRAGONBREATH_MENU_REDRAW_DELAY`(391), same two-phase shape
  `drawRockSlideWindow`/`drawTurnEndSettledMenu` already use for ROCK_
  SLIDE's own turn-end. Caught a real bug via a 60px oracle diff before
  shipping: the resettled menu also needed an explicit Onix HP-digit
  overlay (`drawPlayerHealthboxHpOverlay`) — unlike ROCK_SLIDE's own
  turn-1→2 transition (Onix still full HP there), Onix already carries
  ENDEAVOR's own damage by turn 2's end, so `menuIdleBase`'s stale
  pre-turn-1 "117/117" harvest needed the same overdraw treatment
  Grovyle's bar already gets. All new constants iteration-verified against
  `npm run compare`, not assumed from prose (a `DRAGONBREATH_MENU_REDRAW_
  DELAY` sweep of ±1/±2 confirmed 391 is the unique best fit). Full
  writeup in `docs/dragon-breath-notes.md`'s new "Engine slice E2b"
  section. 7 new Tier-1 tests in `tests/battleScene.test.ts` (1 numeric
  suite for `dragonBreathGrovyleHp`, 5 real-framebuffer pixel pins for the
  drain/hit-flash/text-clear/menu-redraw dispatch).
- **Next:** one named single-tick residual (render 3337, the phase table's
  own "mid-bounce flicker") excluded from `captureFrames` rather than
  chased — the redraw-delay/bounce-anchor formula is already swept to a
  provable optimum (1 mismatch out of 11 ticks in that sub-window; every
  neighboring value scores strictly worse), so closing it needs a direct
  RAM probe of the bounce task's own re-init state at that one tick, not
  more formula sweeping. Otherwise: the `3347-3846` tail is likely a cheap
  dense-capture-and-confirm pass (already pixel-stable per the scout's own
  phase table, turn-3 menu already fully modeled here) for whoever picks
  this up next; the `3177-3235` fire-projectile gap remains the standing
  open item (per #157's escalation, still awaiting a supervisor/user call
  on a dedicated non-bounded session vs. parking permanently); faint/
  forced-switch and ISSUES #22 untouched.
- **Notes:** no papercuts. File ownership respected — `src/engine/core.ts`,
  `fightSubmenuText.ts`, `battleMenu.ts`, `docs/battle-menu-notes.md`
  untouched (only imported two more existing exports from `battleMenu.ts`:
  `HIT_FLASH_RAM_ANCHOR_DELAY`, already-exported `rockSlideHealthboxWobbleY2`/
  `rockSlideMonBlinkInvisible` were already imported).

---
