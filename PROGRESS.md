# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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
## 158 — Bounded worker: S7 slice E2a-5 attempt — fire-projectile attempt #4: SUPERVISOR'S SAMPLING-CONVENTION HYPOTHESIS TESTED AND REJECTED by direct 4-variant sweep (every alternative to the current convention scored 1.4x-2.7x WORSE); pulled a fourth time, no wrong pixels shipped, `npm test` **711/711** (unchanged), build green

- **State:** `npm test` 711/711, `npm run build` green, tree clean.
  `turn2-dragonbreath.json` **unchanged** (`3121-3176` + `3236-3263`,
  84/84 green) — `3177-3235` still open. No engine code left changed
  (shared `drawSpriteSheetAffineRotate` is byte-identical to E2a-4's own
  baseline — nothing to regress-check against).
- **Did:** Per the brief, tested the supervisor's specific hypothesis
  FIRST (not a fresh RAM-probe cycle): re-wired E2a-3's exact settled
  config verbatim, then swept `drawSpriteSheetAffineRotate`'s sampling
  convention. (1) **Iteration-box question answered from source, not
  swept**: `gDragonBreathFireSpriteTemplate.oam =
  &gOamData_AffineDouble_ObjNormal_32x32` (`battle_anim_dragon.c:93`) —
  same `ST_OAM_AFFINE_DOUBLE` mode the ball spin already uses; the
  existing `-w..w`/`-h..h` loop already implements exactly this
  doubled-window convention (source-confirmed correct, not an open
  question). (2) **Rounding/offset convention swept, 4 variants**
  (`"default"` = unchanged original body, `"halfPixel"` = sample at
  `dx+0.5`, `"round"` = `+128`-before-`>>8` round-to-nearest,
  `"halfPixelRound"` = both — all kept in fixed-point, no floats, to
  avoid JS's truncate-toward-zero-before-shift trap) against the dense
  3177-3235 scratch trace, summed `diffPixels` over 59 frames: default
  **8181** (baseline) vs halfPixel 21469 (2.6x worse), round 21933 (2.7x
  worse), halfPixelRound 11410 (1.4x worse) — **every alternative is
  worse**, the opposite of the hypothesis's prediction. Cross-checked the
  default run's own per-tick numbers against E2a-4's banked reads (23px@
  3178, 2px@3208, 342px@3220 — all three exact matches) to confirm this
  was an apples-to-apples reproduction before trusting the sweep.
  GBATEK/Tonc's documented OBJ affine formula (plain integer
  floor-via-arithmetic-shift, no half-pixel destination offset) is
  already what `"default"` implements, consistent with the sweep result.
  **Verdict: hypothesis REJECTED** — the residual's cause is something
  else, not the sampler's rounding/offset convention. Full writeup
  (formula citation, fixed-point sweep mechanics, the table, the
  `halfPixelRound`-beats-neither-alone signal and what it implies) in
  `docs/dragon-breath-notes.md`'s new "Engine slice E2a-5" section.
  Pulled (`git checkout -- src/engine/battleScene.ts`) per the
  no-wrong-pixels rule — `drawSpriteSheetAffineRotate` carries no
  `variant` param in the committed tree.
- **Next:** the brief's own step-4 fallback (isolate the magnified-half
  missing blob: render spawn 7 alone against a blank canvas, diff against
  an oracle capture with all other content subtracted) was NOT attempted
  — the hypothesis test consumed the full time budget. That's the next
  concrete lead, not a fresh sweep of position/scale/sign/lag/box (all
  now closed questions across E2a-3/4/5). Per #157's own open
  escalation: this is a 4th bounded attempt with a real, provable
  negative result (one more hypothesis eliminated) but still no closure —
  worth the supervisor/user weighing a dedicated non-bounded session
  (isolated single-spawn pixel trace) against parking `3177-3235` as a
  named remainder and moving to E2b (3347+)/faint-switch, none of which
  depend on this gap.
- **Notes:** no papercuts. Scratch sweep infra (`tools/compare/out/e2a5-*`,
  gitignored, not committed) reproduced E2a-4's own numbers exactly — no
  new committed scratch tooling this session (reused E2a-3/E2a-4's
  `dragonbreath-projectile-window.json` and `dump-dragonbreath-anim.py`
  unchanged).
