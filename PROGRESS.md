# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 221 — Worktree probe (supervisor-folded): ISSUES #30's sSpriteOrder lead NARROWED TO 2 CANDIDATES — the real mechanism (source-read) is a full per-frame insertion sort whose history only matters at exact (priority, wrapped-Y) ties, and the mirrored-pair feathers make ties pervasive (why fresh Y-sorts can't model it); of the 2^3 unknowable initial pair-orders, ONLY the (4,7) pair matters — 2 live candidates, identical across turns 6/7/8; `docs/feather-order-notes.md` + rerunnable simulation script merged (supervisor-rerun reproduces), suite 877/877

- **State:** merged into master post-slice-R, `npm test` 877/877 +
  build green, worktree/branch cleaned. ISSUES #30 updated with the
  narrowing + the named next step (render both candidates over turn
  6's residual window, diff vs fresh oracle captures — decisive either
  way). Probe stopped honestly at cap before the pixel test.
- **Next:** round 10 — main: QUICK_ATTACK's animation (slice R rung
  (c), §35's RAM-probed task inventory banked: elliptical lunge +
  blended afterimage + shake, tasks/slots pinned) then rung (d)
  (ROCK_SLIDE + turn-end); worktree: the #30 candidate pixel test
  (scratch-render, no engine code). Wind-down begins ~07:45.
- **Notes:** probe in contract (9.3 of 30 min), honest cap stop.

---
## 220 — Bounded worker (S7 engine slice R, rungs (a)+(b)): **ISSUES #29 FIXED** (both families, all 3 menu traces restored 0 diff) **+ turn 9's menu-reopen/LEFT-nav/confirm/QUICK_ATTACK-kickoff-text chain landed clean** — `turn9-menu.json` **111/111**; QUICK_ATTACK's own animation + everything downstream (impact/drain/message/ROCK_SLIDE/turn-end) NOT modeled — RAM-probed and precisely characterized (§35), not guessed

- **State:** `npm test` **877/877** (+12), `npm run build` green, tree
  committed. `turn6-menu.json` 44/44, `turn7-menu.json` 93/93,
  `turn8-menu.json` 88/88 (rung a's restoration), `turn9-menu.json`
  **111/111** (new, rung b: reopen through the kickoff text's own
  settled plateau, one tick before the animation's first pixel change
  at 10929). Zero regressions across the full menu/kickoff/rockslide/
  feathers sweep (`turn8-bind-a/b.json` 256/256+66/66, `turn7-
  rockslide-d.json` 19/19, `turn6-rockslide-a.json` 255/255,
  `turn6/7/8-feathers.json` 106/16/33, `turn6-featherdance.json`
  90/90).
- **Did:** Rung (a) — verify script re-run FIRST (both families PASS)
  per policy; Family A (`drawTurn6ActionMenuIdleWindow`/
  `drawTurn7RockSlideTurnEndSettledMenu` gained an optional
  `bounceTick`/`bounceRawTick` param, default `t`); Family B
  (`turn7KickoffBounceTick`'s pre-freeze branch now shifts). ISSUES
  #29 deleted. Rung (b) — `turn8Resolved` state flag (mirrors
  turn1-7Resolved), cursor persists at BIND(1) then `LEFT` returns it
  to ROCK_SLIDE(0) via the already-generic `cursor^1` arithmetic, PP
  ledger gains BIND's own miss-still-decrements-PP rule (19/20), a
  4th bounce regime (`TURN9_REGIME4_TO_REGIME1_SHIFT`), QUICK_ATTACK's
  own kickoff text (timing fit against a FRESH oracle run, not the
  dossier's own loose prose range — that undershot by 4 ticks),
  `turnOrder.ts`'s nonzero-priority branch gets its first real-scenario
  Tier-1 pin (QUICK_ATTACK +1 forces Pidgeotto first).
- **Next:** QUICK_ATTACK's animation (RAM ground truth already banked
  in §35: task window 10925-10949, `AnimTask_TranslateMonElliptical_
  Step`+`AnimTask_TraceMonBlended_Step`+`AnimTask_ShakeMon_Step`,
  sprite slots 2/3/4/7) through the impact/drain/"not very
  effective"/ROCK_SLIDE(82→61)/turn-end — one contiguous block, not
  attempted this session (time). `docs/turn9-notes.md` has the full
  ledger.
- **Notes:** docs updated in the same commit — `docs/bounce-blip-
  notes.md` "Fix landed" section, `docs/battle-turn-notes.md` §35,
  `ISSUES.md` #29 deleted. PAPERCUT: the turn9-notes.md dossier's own
  prose timing ranges (e.g. "text typing in 10878-10929") are
  approximate orientation, not exact render constants — cost ~5 min
  re-fitting `TURN9_QUICKATTACK_TEXT_DELAY` against a fresh oracle run
  instead of trusting the cited range directly.

---
## 219 — Worktree probe (supervisor-folded): **ISSUES #29 ROOT-CAUSED, both families** — the same missing-`FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` mechanism as #28, one dispatch branch earlier (Family A: pre-reveal idle window must key the shift off `openElapsed !== null`, not `revealTick`; Family B: `turn7KickoffBounceTick`'s pre-freeze branch returns unshifted `t`); supervisor re-ran the committed verify script — both families PASS, zero neighbor regressions; probe scoreboard this session: **4-for-4** (#27, #26, #28, #29); merged, suite 865/865

- **State:** merged into master post-feathers, `npm test` 865/865 +
  build green, worktree/branch cleaned. ISSUES #29 rewritten to
  one-fix-step-owed with the probe's rules + the honest open flag
  (turn 6/8 kickoff wrappers share Family B's code shape, unprobed).
- **Next:** round 9 — main: #29 fix as rung (a) (verify-script-first,
  restore 6 ticks: menus → 44/93/88) + turn 9 slice as rungs (b+)
  (turn9-notes.md exists; both published lines reconverge at turn 9);
  worktree: ISSUES #30 probe (simulate SortSprites' persistent
  adjacent-swap order over the committed feather probe tables — all
  inputs committed, pure computation; then the half-texel lead).
- **Notes:** probe in contract (12.0 of 30 min). Every excluded tick
  in turns 1-8 now has either a root-caused fix pending (#29's 6) or
  a live named-lead investigation (#30's feather windows); no
  speculative labels remain.

---
