# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 244 — Bounded worker (S7/S8 turn 13 engine step, rung 2 of 4): SAND_ATTACK's text/banner sub-phases LAND 0-diff (dirt-throw sub-phase excluded, named gap); rungs 3-4 (DRAGON_BREATH+faint+KO-hold, MURKROW switch-in) NOT attempted this session — out of the remaining time budget

- **State:** `npm test` **978/978** (969 + 9 new Tier-1), `npm run build`
  green, tree clean. `verify-turn13.ts` **60/60** (mandatory-first-step
  rerun, unaffected). New trace `turn13-sandattack.json` **185/185, 0
  diff** (ticks 15420-15475 + 15522-15650: confirm-transient tail,
  settled kickoff text, silent monbg gap, accuracy-drop stat banner,
  "ONIX’s accuracy fell!" typing+hold — deliberately EXCLUDES
  15476-15521, the dirt-throw/attacker-slide window). Regression sweep
  clean: `turn13-menu` 57/57, `turn12-menu` 46/46, `turn12-aerialace`
  56/56, `turn11-menu` 56/56, `turn10-aerialace` 23/23.
- **Did:** `drawTurn13SandAttackWindow` dispatches SAND_ATTACK's own
  kickoff text ("Foe PIDGEOTTO used\nSAND-ATTACK!"), a new
  `turn13SandAttackAccEva`/`Bg1Y` pair (a THIRD parameter combination of
  the already-wired generic `StatsChangeAnimation` banner — non-sharply
  target/wait 10/20 crossed with a DECREASE direction and the `accuracy`
  palette, no new asset extraction needed), and "ONIX’s accuracy fell!"
  (curly apostrophe, matching the font/charmap pin `TURN6_ATKFELL_LINE1`
  already established). All pure wiring, zero new render primitives.
  **One genuine bug found by oracle bisection, not guessed**: `pressTick`
  (`TICK0+sm.confirmElapsed`) is **15419** at runtime, not 15418 (the
  confirm press's own segment-start tick a naive dossier reading
  suggests) — a fresh `npm run compare` caught every mid-typing frame
  showing a small diff localized to exactly one trailing glyph (the
  classic off-by-one-tick signature) plus a huge diff at the transition
  frame itself; rebased all three new delay constants off the real
  anchor, closed to 0 immediately.
- **Next:** rung 3 (DRAGON_BREATH re-targeted at Pidgeotto — kickoff text
  reuses the ALREADY-GENERIC `dragonBreathTextStartTick`/`Chars`
  verbatim with a new synthetic pressTick anchor; HP-drain reuses
  `dragonBreathGrovyleHp` verbatim; faint sink reuses
  `grovyleFaintSinkRowsAndY2` verbatim; the KO-gated hold needs a NEW
  `turn13KoDismissElapsed`-style field threaded through `core.ts`,
  mirroring `turn5KoDismissElapsed`'s own pattern exactly, cycling the 4
  idle-bounce shas the dossier names), then rung 4 (MURKROW switch-in —
  turn 5's faint-switch machinery re-anchored, but needs a NEW
  front-sprite asset for MURKROW, not yet extracted anywhere in
  `src/assets/gen/`). Both rungs' full ground truth is already banked in
  `docs/turn13-notes.md` §4-§7 — nothing left to probe, this is pure
  wiring + one new asset extraction from here.
- **Notes:** `docs/battle-turn-notes.md` §47 has the full writeup. The
  (a) dirt-throw sub-phase (30 dirt sprites from one shared
  attacker-relative origin, `Random2()&0x1F` per-sprite jitter,
  regenerable via the committed `tools/probe/dump-sandattack-anim.py`)
  needs a new sprite-sheet asset extraction (`ANIM_TAG_MUD_SAND`, not yet
  in `src/assets/gen/`) — didn't fit this session's remaining time;
  excluded from `turn13-sandattack.json`'s own `captureFrames` rather
  than claim a false 0-diff pass, matching the "exclude, don't fake"
  convention ISSUES #23's own projectile exclusion already establishes.
  No PAPERCUTS beyond the standing mgba-venv-teardown one.

---
## 243 — Bounded worker (S7/S8 turn 13 engine step, rung 1 of 4): turn 12->13 FIGHT-submenu reopen gate LANDS 0-diff; rungs 2-4 (SAND_ATTACK, DRAGON_BREATH+faint, MURKROW switch-in) NOT attempted this session - out of the remaining time budget

- **State:** `npm test` **969/969** (966 + 3 new Tier-1), `npm run build`
  green, tree clean. `verify-turn13.ts` **60/60** (mandatory-first-step
  rerun, unaffected). New trace `turn13-menu.json` **57/57, 0 diff**
  (ticks 15374-15430: reopen, DOWN nav, cursor jump at 15408, confirm,
  confirm-press transient hold - stops just before SAND_ATTACK's own
  kickoff text starts at 15431, out of this rung's scope). Regression
  sweep clean: `turn12-menu` 46/46, `turn12-aerialace` 56/56,
  `turn12-rockslide-miss` 38/38, `turn11-menu` 56/56, `turn10-aerialace`
  23/23.
- **Did:** threaded `turn12Resolved` through the FULL reopen-gate chain
  (`core.ts`, mirroring every prior `turnNResolved` flag verbatim),
  `currentPPForActiveMon`'s 10th independent slot-0 decrement
  (ROCK_SLIDE reads 0/10 exhausted, matching turn13-notes.md §3), and a
  new `drawTurn13FightSubmenuWindow` dispatcher (own regime-8
  field-base/kickoff-bounce-freeze pair, `TURN13_REGIME8_TO_REGIME1_SHIFT`,
  reusing `drawTurn12TurnEndSettledMenu` verbatim for the pre-open/
  DMA-wait baseline - the established "reuse the prior turn's own
  TurnEndSettledMenu" pattern). The DOWN-nav cursor jump (0->2,
  DRAGON_BREATH) needed **zero new code** - `moveFightCursor`'s existing
  2x2-grid arithmetic already reproduces it, confirming the supervisor's
  prior root-cause fold. One genuine per-turn residue found by oracle
  bisection (not assumed, not guessed): the open-DMA-wait branch needs
  an **unshifted** raw tick for this regime's own `menuIdleBounce`
  plateau boundary, NOT the usual `FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT`
  every other turn's analogous branch uses - a real quantization-residue
  difference specific to this regime's anchor tick, pixel-fit directly
  (debugged via a throwaway script driving `core.ts`'s `tick`/`render`
  directly to inspect `fightSubmenu.openElapsed` per-frame, since the
  oracle-diff alone didn't distinguish "wrong regime" from "wrong
  shift").
- **Next:** rung 2 (SAND_ATTACK's 4 sub-phases: dirt-throw+slide via
  `dump-sandattack-anim.py`'s pinned tables, silent monbg gap, the
  accuracy-drop stat banner - needs a `turn6StatFallEva`/
  `turn6StatFallBg1Y` generalization or sibling for the
  non-sharply/decrease/accuracy parameter combo, "ONIX's accuracy
  fell!" text), then rung 3 (DRAGON_BREATH re-targeted at Pidgeotto via
  turn 2's own reused mechanism functions, HP-drain, faint sink reused
  from turn 5, KO-gated hold cycling 4 idle-bounce shas), then rung 4
  (MURKROW switch-in, turn 5's faint-switch machinery re-anchored). All
  four sub-steps and their exact ground truth are in
  `docs/turn13-notes.md`'s "SAND_ATTACK characterization" section and
  §5-§7 - nothing left to probe, this is pure wiring from here. Rung 1's
  own `drawTurn13FightSubmenuWindow` deliberately does NOT dispatch past
  the confirm-press transient yet (same "caller/trace never captures
  past the oracle-confirmed safe boundary" convention `drawTurn3Endeavor
  Text` established) - rung 2 adds that forward branch.
- **Notes:** not a blocked/mis-scoped step - genuinely just larger than
  one bounded session (menu + 4-phase SAND_ATTACK + re-targeted
  DRAGON_BREATH + faint-switch reuse + KO-gate + Murkrow switch-in, vs.
  turn 12's much smaller "AERIAL_ACE reanchor + one miss text-swap").
  Stopped at a clean, fully-verified rung boundary per AGENTS.md rather
  than leaving rung 2 half-wired. No PAPERCUTS beyond the standing
  mgba-venv-teardown one.

---
## 242 — Supervisor fold (evening session round 1): SAND_ATTACK probe merged — turn 13 is now FULLY pure wiring (last unknown characterized); AERIAL_ACE rung (a) verified landed, rung (b) residual queued for a targeted probe

- **State (supervisor-verified post-merge):** `npm test` **966/966**,
  `npm run build` green, tree clean, no worktrees/unmerged branches.
  `verify-turn13.ts` (now **60 checks**: 46 + 14 SAND_ATTACK) passes from
  the main tree, supervisor-rerun. `turn10-aerialace.json` 23/23
  supervisor-rerun, plus neighbors 220/220, 56/56, 159/159.
- **Did:** verified + merged `worker/wt-20260721-182214` (SAND_ATTACK
  ~90-tick window decomposes into 4 sub-phases, ALL pure wiring: dirt-throw
  via unmodified `AnimDirtScatter`/`SlideMonToOffset` (+1 lag; per-call
  scatter offsets are DEAD script args — all 30 sprites share one origin,
  only `Random2()` target jitter differs; regenerate tables via committed
  `dump-sandattack-anim.py`), silent monbg gap, turn-6-family stat banner
  (0 lag, assets already extracted), "ONIX's accuracy fell!" text — the
  prior "blank 15630-15699" label was WRONG, that sha is the held
  accuracy-fell text). Probe was cap-killed mid-final-message but its
  commit was complete — no salvage needed. Verified #241's engine work
  (see below).
- **Next:** round 2 in flight — main lane wires turn 13 end-to-end;
  worktree probes AERIAL_ACE's overlap residual (#241's handoff) + the
  12371-12437 flicker (rung (c) precondition). Then turn 14+.
