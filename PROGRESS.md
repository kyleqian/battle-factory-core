# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 239 — Bounded worker (S7/S8, turn 12 wiring): both halves LAND 0-diff — Pidgeotto's 2nd AERIAL_ACE (pure +2068-tick re-anchor of turn 10's 5-mechanism tables, zero new mechanism code) and the arc's FIRST ROCK_SLIDE MISS (zero-animation text-swap, structurally = turn 8's BIND-miss) — new `turn12-menu.json` **46/46**, `turn12-aerialace.json` **56/56**, `turn12-rockslide-miss.json` **38/38**, all 0 diff

- **State:** `npm test` **966/966** (957 + 9 new), `npm run build`
  green, `verify-turn12.ts` unchanged **20/20**. Full regression sweep 0
  diff, every count matches the acceptance criteria exactly:
  `turn11-menu.json` **56/56**, `turn11-featherdance.json` **178/178**,
  `turn11-rockslide.json` **163/163**, `turn10-aerialace.json` **18/18**,
  `turn10-rockslide.json` **220/220**, `turn8-bind-a.json` **256/256**.
- **Did:** added `turn11Resolved` as a new `BattleSceneState` field
  threaded through the FULL existing reopen-gate chain (mirroring every
  prior `turnNResolved` flag verbatim) — ROCK_SLIDE now a 9th slot-0 PP
  use, 1/10 entering turn 12 (corrects the brief's own stale "2/10").
  `drawTurn12AerialAceWindow` calls turn 10's own five mechanism
  functions VERBATIM (re-anchored to a fresh live `pressTick`, Onix's HP
  14→4) via a new `drawTurn12FieldBase`/`turn12KickoffBounceTick` regime-7
  wrapper — no new mechanism code anywhere. `drawTurn12RockSlideWindow`
  mirrors `drawTurn8BindWindow`'s own text-swap-over-frozen-field
  structure exactly (synthetic `TURN12_ROCKSLIDE_PRESS_TICK=14237`,
  reused `ROCK_SLIDE_LINE1/2`→`TURN8_MISS_LINE1/2` swap, 95-tick
  miss-hold, 7-tick clear-to-redraw). One real gap correctly EXCLUDED not
  fixed: turn 10's own committed traces leave RAM 12363-12437
  uncaptured (mechanism-3 residual + an unmodeled hit-flash flicker); the
  first `turn12-aerialace.json` draft sampled inside the +2068-shifted
  equivalent and showed real diffs (up to 4.33%) — corrected by excluding
  that same relative range, per the brief's own explicit instruction.
- **Next:** turn 13 — its probe/verify script (`verify-turn13.ts`,
  46/46) already landed two sessions ago; natural next step is wiring it
  the same way, adding a `turn12Resolved` flag off
  `TURN12_ROCKSLIDE_MENU_REDRAW_DELAY` (already exported).
- **Notes:** `docs/battle-turn-notes.md` §45 has the full writeup.
  AERIAL_ACE mechanisms 3/4 (§42/§43) and the hitsplat (ISSUES #31)
  remain untouched, out of scope. No PAPERCUTS beyond the standing
  mgba-venv-teardown one.

---
## 238 — Supervisor merge fold ×3 + ISSUES #31 filed: (1) turn-12 probe (`wt-125234`): AERIAL_ACE recurs **bit-exact at +2068 RAM ticks** off turn 10's 5-mechanism tables (pressTick=14373, zero corrections); ROCK_SLIDE-miss half RAM-proven **zero-animation** (pressTick=14237; kickoff text only, hit mechanisms never fire — bit-exact to turn 8's BIND-miss precedent incl. the identical 95-tick miss→clear gap); `verify-turn12.ts` **20/20** — turn 12 is pure wiring, both halves. (2) hitsplat palette-tint probe (`wt-130606`): REFUTED — `gPlttBufferFaded` byte-identical to unfaded, bank 7, every live tick (supervisor-rerun) — third refuted hypothesis, filed as **ISSUES #31** with the two untested avenues. (3) turn-13 probe (`wt-131215`): `verify-turn13.ts` **46/46**, wiring-only verdict, 3 dossier §4 corrections (6 idle-bounce phases not one plateau; cursor-jump at exactly 15408; a previously-missed ~90-tick SAND_ATTACK mid-message animation 15540-15629 = the ONE real unknown before that half renders)

- **State (supervisor-verified post-merges):** `npm test` **957/957**,
  `npm run build` green; verify scripts fresh from main tree: turn12
  20/20, turn13 46/46 (turn9-postlunge 108/108 + turn11 52/52 an hour
  earlier). No worktrees, no unmerged branches. Turns 9/10/11 traces all
  supervisor-rerun this hour: 159+77+163 / 83+18+220 / 56+178+163.
- **Notes:** probe scoreboard this session: turn-10-rockslide,
  turn-11, turn-12, turn-13 all "pure wiring" verdicts with PASS/FAIL
  scripts; the three hitsplat refutations close every named lead — #31
  carries the avenue list so nobody re-fits blends. Turn-13's probe also
  demonstrated the verify-script convention retrofits onto an
  already-folded dossier cleanly.

---
## 237 — Bounded worker (S7 slice R rung 0 + turn 11 rungs 1-3): turn 9's flicker gap CLOSED (20→32-tick table extension, `turn9-quickattack.json` 159/159) and turn 11's whole arc (menu reopen, FEATHER_DANCE-blocked half, ROCK_SLIDE half) LANDS 0-diff through the turn-12 menu boundary — new `turn11-menu.json` **56/56**, `turn11-featherdance.json` **178/178**, `turn11-rockslide.json` **163/163**; one genuine cross-regime idle-bounce bug found + fixed along the way

- **State:** `npm test` **957/957** (946 + 11 new), `npm run build`
  green, both mandatory verify scripts fresh: `verify-turn9-postlunge.ts`
  **108/108**, `verify-turn11.ts` **52/52**, both unchanged. Full
  regression sweep 0 diff, every count matches the acceptance criteria
  exactly: `turn9-quickattack.json` **159/159** (117 base + 42 new),
  `turn9-quickattack-b.json` **77/77**, `turn9-rockslide.json` **130/130**,
  `turn10-menu.json` **83/83**, `turn10-rockslide.json` **220/220**,
  `turn6-feathers.json` **235/235**.
- **Did:** (rung 0) bumped `TURN9_EP2_FLICKER_TOTAL_TICKS` 20→32 — the
  4th flicker block and the task's own force-visible tick both fall out
  of the existing `n % PERIOD < ON` gate with no special-casing, exactly
  as the dossier's own addendum predicted (no new mechanism). (rungs 1-3)
  added `turn10Resolved` as a new `BattleSceneState` field threaded
  through the FULL existing reopen-gate chain in `core.ts` (mirroring
  every prior `turnNResolved` flag verbatim) + `drawFightSubmenuWindow`'s
  dispatch chain + `currentPPForActiveMon`'s PP-decrement chain (ROCK_SLIDE
  now an 8th slot-0 use, 2/10 entering turn 11); `drawTurn11FeatherDanceWindow`
  reuses turns 6/7/8's own kickoff-text functions unchanged, omits the
  feather-sprite draw calls entirely (RAM-confirmed they never fire), then
  dispatches the new ATK-floor message; `drawTurn11RockSlideAttack`/`Window`/
  `TurnEndSettledMenu` mirror turns 6/7/9/10's own instances with only the
  press tick + Pidgeotto's HP (38→16) new. One real bug found via
  `npm run compare` itself (not guessed): turn 11's own FIGHT-submenu
  browsing phase needs its OWN regime-shift constant
  (`TURN11_REGIME6_TO_REGIME1_SHIFT` + `drawTurn11FieldBase`), not turn
  10's — `menuIdleBounce`'s underlying task genuinely restarts at every
  turn's own menu redraw. Also caught+fixed a 1-tick error in the dossier's
  own "13858" text-clear citation (real hardware holds through 13858,
  clears at 13859).
- **Next:** turn 12 (a sibling probe owns `turn12-notes.md` this round,
  out of scope here) — `battle-turn-notes.md` §15's own predicted
  ROCK_SLIDE miss (PP 1/10→0/10) is the natural next full-turn scout.
  Standing named gaps unchanged: the hitsplat tip/edge residual (10935-10944,
  next instrument: `gPlttBufferFaded` tint dump — do NOT re-attempt a
  blend-coefficient fit, decisively refuted); AERIAL_ACE mechanisms 3/4
  (§42/§43's gaps, untouched this session, out of scope).
- **Notes:** `docs/battle-turn-notes.md` §44 has the full writeup. No
  PAPERCUTS beyond the standing mgba-venv-teardown one.
