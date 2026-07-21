# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 240 — Supervisor wind-down: session end 2026-07-21 ~14:20 — **17 productive worker steps verified and folded** (7 rounds, 6 main-lane engine slices + 9 worktree probes + 2 salvage/dud events); suite **880 → 966/966**; headlines: **turns 9-12 landed end-to-end 0-diff** (turn 9: clones/shake/wobble/flicker/drain/text/hold/ROCK_SLIDE incl. the flicker gap closed at 159/159; turn 10: menu/AERIAL_ACE/ROCK_SLIDE; turn 11: menu/FEATHER_DANCE-blocked/ROCK_SLIDE; turn 12: menu/AERIAL_ACE-reanchor/ROCK_SLIDE-miss), **ISSUES #30 CLOSED by a full crack** (feather draw-order candidate A + the AFFINE_NORMAL box-clip root cause, 425px→0 on all three turns, traces 106/16/33→235/145/162), **ISSUES #31 filed** (hitsplat: 3 hypotheses refuted with committed instruments), and **the probe→wiring pipeline ran at full cadence** — every landed window was pre-probed with a PASS/FAIL verify script and every "pure wiring" verdict held on landing

- **State (verified this minute):** `npm test` **966/966**, `npm run
  build` green, tree clean, no worktrees, no unmerged branches. New/
  extended traces this session (all supervisor-rerun 0 diff):
  turn9-quickattack 112→159, turn9-quickattack-b 77, turn9-rockslide
  130, turn6/7/8-feathers 235/145/162, turn10-menu 83, turn10-aerialace
  18, turn10-rockslide 220, turn11-menu 56, turn11-featherdance 178,
  turn11-rockslide 163, turn12-menu 46, turn12-aerialace 56,
  turn12-rockslide-miss 38; bonus turn2-endeavor-drain 200→201 (rung-c3
  hitsplat fixes closed its last residual). Verify scripts banked:
  turn9-postlunge 108, turn10-aerialace 20, turn10-rockslide 44,
  turn11 52, turn12 20, turn13 46 — all supervisor-rerun post-merge.
- **Next:** (1) wire turn 13 (verify script + dossier corrections
  banked; ONE real unknown: SAND_ATTACK's ~90-tick mid-message
  animation 15540-15629, uncharacterized); (2) AERIAL_ACE mechanisms
  3/4 (§42/§43 handoffs: bisect lunge-table indices 0-2; re-derive the
  live BG palette bank by RAM read); (3) ISSUES #31's two named avenues;
  (4) turn 14 (forced switch) onward — dossiers exist through
  post-WIN; S8 engine slices have complete ground truth.
- **Notes:** zero merge conflicts across 8 merges; no usage-limit
  events. One supervisor launch error (nested-worktree launch needs the
  worktree's OWN script copy invoked relatively — an absolute-path
  main-tree launcher bases on master; the mis-based worker caught it and
  stopped honestly at $0.27) and one 20-min probe cap-kill mid-writeup
  (work salvaged: supervisor reran its uncommitted verify script +
  diagnostics, wrote the dossier append with provenance, committed on
  its branch — the "hit-flash mechanism" it dissolved was folded intact).
  PAPERCUTS: exit-139-teardown entry added and re-confirmed by three
  workers. Interactive session; no escalations needed.

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
