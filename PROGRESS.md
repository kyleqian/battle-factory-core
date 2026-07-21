# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 188 — Bounded worker (S7 slice M): Pidgeotto's healthbox slide-in LANDED (`turn5-healthbox.json` 55/55, 0 diff, 6820-6874) — Sitrus proc + settled menu NOT landed, blocked on a newly-discovered Onix on-field idle-bob (RAM table pinned, screen mapping unresolved)

- **State:** `npm test` **793/793** (+3), `npm run build` green, tree clean.
  New committed trace `turn5-healthbox.json` (55 captures, 6820-6874) 0
  diff. Regression clean: `turn5-switchin.json` 241/241, `turn5-sentout.json`
  141/141, `turn5-rockslide.json` 256/256.
- **Did:** assigned the full 6828→~7307 window (healthbox slide-in, Sitrus
  proc, settled menu vs PIDGEOTTO). Landed the healthbox slide-in cleanly:
  Pidgeotto's own opponent healthbox was never drawn at all past 6828 (a
  real gap, not just unverified) — composited (name/level/gender, gender
  pixel-confirmed male via an oracle crop) and wired in with the same
  23-step slide `healthboxSlideDx` (now generalized to an arbitrary anchor)
  already used for S6's own send-out. Found and fixed a real off-by-one:
  the naive anchor (matching §8e's own cited RAM tick, 6828) reproduces the
  oracle's slide sequence exactly one tick early throughout — needs the
  ordinary +1 RAM-to-render lag every other mechanism in this dossier
  carries, isolated via a diff-vs-fixed-background pixel scan applied
  identically to oracle and app frames. +3 Tier-1 pins. Then RAM-probed
  past the slide (`tools/probe/specs/switchin-b0-sprite.json`, twice-run
  identical) and found the "flat" window right after settle (6852-7040) is
  NOT actually static: Onix's own sprite (the player's battler, not
  Pidgeotto's) plays a continuous idle vertical bob on a clean 32-tick
  period starting RAM tick 6870 — a genuinely new mechanism (Onix is drawn
  perfectly static through the whole already-verified 6588-6828 span, so
  this only engages once it's just standing idle). The RAM table itself is
  solid (pixel bbox of the affected region matches Onix's sprite footprint
  exactly, nothing else). But applying it as a direct render-tick `y2`
  offset does NOT reproduce the oracle (large residual diffs both signs
  tried) — tried and reverted rather than ship red, per this run's own
  discipline. Also ran a fresh full-window oracle diff scan sharpening
  §3e's own `~`-estimates to exact ticks (sparkle/tint window ~7042-7075,
  Sitrus message exact 7078-7112 (35 chars, byte-length-matched), a big
  redraw at 7222, and — new finding — the HP-climb/menu window keeps
  visibly changing all the way to the 7307 acceptance boundary, so a
  single flat "final frame" harvest won't work for the settled menu).
- **Next:** re-derive the Onix idle-bob's RAM→screen mapping (three
  hypotheses banked in `docs/faint-switch-notes.md` §11 — scale factor,
  wrong sprite-slot assumption, or a second uncontrolled simultaneous
  change) before the Sitrus sparkle/tint/ring/message/HP-climb/settled-menu
  chain can proceed, since the idle-bob renders underneath all of it. The
  Sitrus ring gfx (§8a) also still needs its own pixel-placement pass,
  unchanged from before this session.
- **Notes:** no papercuts. Docs: `faint-switch-notes.md` §11 added (both
  the landed piece and the precise blocker, with the exact pixel/RAM data
  needed to resume without re-deriving); archived #185 to keep the ledger
  to 3 entries.

---
## 187 — Worktree scout (supervisor-folded): turn 6 ground truth BANKED — prefix consistency of the whole engine chain vs the WIN line CONFIRMED (one line, no divergence through turn 7); `battle1-turn6-dense.json` (8346 frames, 251 captures, twice-run identical) + `docs/turn6-notes.md`; merged `858f482`, suite 790/790 on the merged tree

- **State:** merged into master, `npm test` 790/790 + build green
  post-merge (docs+trace only, no src changes). Supervisor re-verified
  independently: script-level prefix check (turn5-switchin ⊂ turn6-dense ⊂
  winline-b-swap, exact) and 4/4 cited boundary shas reproduced on a fresh
  oracle run.
- **Did:** turn 6 = FEATHER_DANCE (Pidgeotto acts first, speed 77 vs 76 —
  RAM-confirmed, previously unpublished) then Onix's ROCK_SLIDE (43 dmg,
  Pidgeotto 156→113, drain window ~7970-8019 at ~3 ticks/pixel-column —
  NOT the 1-unit-per-tick pattern of small bars). RNG ledger: 11
  `Random()` calls, LCG-step-verified. Boundaries sha-cited: menu 7307,
  submenu 7317, confirm 7344, FD kickoff ~7358, ATK-fall msg 7385-7558,
  RS kickoff ~7770, impact 7935-7956, turn-7 menu settled 8122 (+222
  ticks margin to the next winline press). New-to-turn-6 mechanism
  inventoried: FEATHER_DANCE (EFFECT_ATTACK_DOWN_2, two chained message
  phases, `statStages` write mid-message at 7391, no HP drain). One
  characterized-not-attributed find: ticks 7659-7684 and 7765-7784 are a
  byte-identical 26-frame msgbox open/close sequence (likely one generic
  slide routine; lead: shared `gBattlerControllerFuncs[1]`=134609789).
- **Next:** unchanged from #186 — healthbox slide-in/Sitrus/settled-menu
  slice (§8e/§2/§3e), then a turn-6 engine slice against this dossier.
- **Notes:** scout stayed in contract (no src/, no ledger edits); no
  papercuts.

---
## 186 — Bounded worker (S7 slice L-4): materialize ramp-down + wobble phase CLOSED, `turn5-switchin.json` extended **167→241** (6588-6828, full ball-to-settle window), **0 diff, ZERO exclusions** — two independent bugs root-caused (a corrupted coefficient table + a healthbox Z-order miss)

- **State:** `npm test` **790/790** (+3), `npm run build` green, tree clean
  at `9faddea`. No worktrees. `turn5-switchin.json` now covers the FULL
  ball-to-settle window, 0 diff, no excluded ticks.
- **Did:** assigned to close the ramp-down residual (~1100-1350px/frame,
  render 6768-6782) and verify the wobble phase. RAM-probed `oam.affineMode`/
  `gOamMatrices` directly (new `tools/probe/dump-switchin-materialize-
  affine.py`) across the ramp window — matrix pinned at pure identity,
  `affineMode=NORMAL` throughout, ruling out geometry entirely. Root cause
  was the palette coefficient itself: the PRIOR session's own
  `TURN5_MATERIALIZE_RAMP_COEFF` table and its "same render tick" lag
  finding were BOTH corrupted — decoded from a degenerate `gPlttBufferFaded`
  offset (`+0x222..0x228`) where `BlendPalette`'s integer truncation
  collapses several coefficients onto identical output. Reprobed at
  `+0x230` (a non-degenerate color, cross-checked against 3 independent
  oracle pixels) and found the REAL sequence: flat coefficient 16 through
  render 6767, then a perfectly linear 15->0 countdown from render 6768,
  with the ORDINARY +1 RAM-to-render lag (not same-tick as previously
  believed). Unified growing+ramp into one draw call via new
  `drawSpriteSheetAffineTintedBlend` (identical to the old flat-tint call
  at coeff=16, no seam). Wobble phase needed `doubled=true`
  (`ST_OAM_AFFINE_DOUBLE`, RAM-confirmed) threaded into
  `drawSpriteSheetAffineStretch` — verified as its own isolated 0-diff
  span. A SEPARATE bug surfaced once the window widened past 6754: the
  opponent's own particle burst painted over the player's healthbox UI —
  real hardware sets ALL healthbox pieces to OAM priority 0 during battle
  animations (`LaunchBattleAnimation`/`UpdateOamPriorityInAllHealthboxes(0)`,
  `battle_anim.c`), unconditionally on top; moved `drawMenuHealthboxPlayer`/
  `drawPlayerHealthboxHpOverlay` to draw after `drawTurn5SwitchinSprite` in
  `drawTurn5RockSlideWindow`. +3 Tier-1 pins (`turn5MaterializeCoeff`).
  Regression-swept clean at unchanged counts: `turn5-sentout` 141/141,
  `turn5-rockslide` 256/256, `turn4-doubleteam` 250/250, `turn5-menu`
  42/42, `fight-submenu-reopen` 90/90, `turn3-menu` 254/254,
  `turn4-rockslide` 250/250, `turn5-endeavor` 254/254. Docs:
  `faint-switch-notes.md` §10 rewritten (both prior "not landed" items
  closed, the Z-order finding added, status CLOSED); archived #183 to
  `PROGRESS-archive.md` to keep the ledger to 3 entries.
- **Next:** the faint/forced-switch sequence's last unexplored territory
  is past `TURN5_PIDGEOTTO_SETTLE_TICK`(6828) — healthbox slide-in, Sitrus
  proc, settled menu vs PIDGEOTTO (§8e/§2/§3e, fully spec'd, untouched).
  Then turn 6+ toward battle 1's WIN.
- **Notes:** no new papercuts. One self-corrected false start: an
  intermediate "constant coefficient 15" hypothesis for the flat span
  looked plausible from a degenerate RAM decode but was caught by a direct
  oracle pixel cross-check before it was ever committed.

