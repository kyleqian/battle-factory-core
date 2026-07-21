# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 202 — Worktree scout (supervisor-folded): turn 14 ground truth BANKED — Murkrow opens with **FLY** (the arc's first two-turn semi-invulnerable move): charge half deals no damage, Onix's DRAGON_BREATH **auto-misses the airborne target at ZERO RNG cost** (`STATUS3_ON_AIR` short-circuit, `battle_script_commands.c:1061`, gRngValue flat through the miss); `battle1-turn14-dense.json` (248 captures) + `docs/turn14-notes.md`; merged `4fe427a`, suite 821/821 on the merged tree

- **State:** merged into master, `npm test` 821/821 + build green
  post-merge. Supervisor re-verified: prefix chain (turn13-b ⊂ turn14 ⊂
  winline-b-swap, script-exact), trace rerun deterministic, and the
  final frame PNG-read: Murkrow's healthbox full at 142/142 with its
  SPRITE INVISIBLE (airborne) over the settled menu — the two-turn
  state pinned visually and in RAM (STATUS2_MULTIPLETURNS set 17820,
  STATUS3_ON_AIR set 17913, both persisting across the turn boundary
  to the trace's last tick 18956).
- **Did:** turn 14 = FLY charge (empty "used" string — STRINGID_
  EMPTYSTRING3 in BattleScriptFirstChargingTurn, then "flew up high!")
  + the auto-miss; nobody takes damage; no forced switch this turn.
  §16's coarse ledger row fully confirmed, refined by one exact
  bookkeeping Random() at 18079. PAPERCUT from the worker
  (dump-battler-full.py struct offsets undocumented outside the script
  body) recorded in PAPERCUTS.md at this fold.
- **Next:** engine critical path unchanged (slice N-3 feather renderer
  → rungs c/d → turns 7-13 parameterizations); dossier pipeline now
  covers turns 6-14; turn-15+ (FLY's strike half, Onix's likely KO →
  the first FORCED PLAYER SWITCH → the WIN arc) is the next scout
  territory.
- **Notes:** scout stayed in contract; 40-min cap, landed in 14.

---
## 201 — Worktree scout (supervisor-folded): turn 13 ground truth BANKED — Pidgeotto FAINTS to DRAGON_BREATH, MURKROW switches in (142/142, LAX_INCENSE, NO switch-in proc), and the REUSE MAP says the whole faint/switch window is turn-5 machinery VERBATIM with new params; **the projectile table is bit-identical to turn 2's** (one closed-form dy param: target yOffset 11 vs 4) so ISSUES #23's exclusion covers turn 13 with no fresh crack; `battle1-turn13-dense-{a,b}.json` (256+223 captures) + `docs/turn13-notes.md`; merged `95524d4`, suite 821/821 on the merged tree

- **State:** merged into master, `npm test` 821/821 + build green
  post-merge. Supervisor re-verified: prefix chain (turn12 ⊂ turn13-a ⊂
  turn13-b ⊂ winline-b-swap, script-exact), switch-commit sha (16944)
  reproduced fresh, final capture PNG-read (settled menu vs MURKROW,
  Onix 4/117). One "surprise" ROOT-CAUSED at the fold: the reported
  cursor "double-decrement" (DOWN: 0→2) is the FIGHT submenu's ordinary
  2×2 grid row move (`battleMenu.ts:981`, `cursor ^ 2`; turn 8's RIGHT
  = +1 column move corroborates) — dossier corrected, nothing open.
- **Reuse map (scout's verdicts):** faint sink verbatim (closed form
  gives n=7 for Pidgeotto's yOffset), ball prop / particle burst /
  landing-bounce verbatim byte-exact; stretch/wobble/tint + healthbox
  slide same-shape but honestly NOT re-verified to the byte; KO-gated
  hold verbatim, pixel-frozen. Also: 0-PP moves are never auto-skipped;
  Onix accuracy stage 6→5 from SAND_ATTACK under the held kickoff.
- **Next:** slice N-3 — the feather animation's affine renderer (8
  per-tick-rotating sprites, §28's RAM ground truth + implementation
  sketch); then rungs (c)/(d); then turn-7..13 slices are all
  parameterizations except the #23-excluded projectile ticks. BIND-hit
  (Test 2) never exercised on this line — battles 2-7 may exercise it.
- **Notes:** scout stayed in contract; no papercuts.

---
## 200 — Bounded worker (S7 slice N rung (b), reduced scope): FEATHER_DANCE's kickoff text + settled hold LANDED — `turn6-featherdance.json` 90/90, 0 diff; a real rung-(a) bug found+fixed (region-A onix-sprite bounce wasn't frozen, only region B was); the feather/starburst SPRITE ANIMATION itself deferred (genuinely new affine-rotation rendering, no precedent in this codebase) — RAM ground truth banked, not implemented

- **State:** `npm test` **821/821** (+3), `npm run build` green, tree
  clean. New committed trace `turn6-featherdance.json` (90 captures,
  7307-7404, same 4 pre-confirm residual pairs excluded as §27, zero new
  exclusions) **0 diff**. Regression sweep: `turn6-menu.json` 33/33,
  `turn5-sitrus-c.json` 150/150, `turn5-sitrus-d.json` 133/133, `turn3-
  rockslide.json` 256/256, `turn5-rockslide.json` 256/256, `turn5-menu.json`
  42/42, `turn4-menu.json` 44/44, `turn5-endeavor.json` 254/254, `turn1-
  cloneanim.json` 230/230 — zero regressions.
- **Did:** kickoff text ("Foe PIDGEOTTO used FEATHERDANCE!") timing
  RAM/pixel-nailed (`turn6FeatherDanceTextStartTick = pressTick+13` = 7358,
  settles 7388, oracle-reprobed fresh — NOT either of the two existing
  generic-kickoff delay constants, both checked and ruled out). Extending
  the captured window past rung (a)'s own 7350 cutoff immediately exposed
  rung (a)'s named "region A" residual on EVERY subsequent tick — RAM-
  probed (`gSprites[gBattlerSpriteIds[0]]`/`[gHealthboxSpriteIds[0]]`'s own
  `y2`, both flat 0 for the whole post-confirm hold) and fixed: (1)
  `drawTurn5RockSlideAttack` never threaded its own `bounceTick` param for
  the on-field Onix sprite's bounce (always used live `t`, even when
  called from a frozen-hold context) — added one, default-preserves every
  other caller; (2) the frozen anchor itself (`pressTick`) sat on a
  `{onixY2:1, healthboxY2:0}` point in `menuIdleBounce`'s own cycle, not
  the real `{0,0}` — moved to `pressTick - 4`, a scanned `{0,0}` plateau.
  This retroactively fixes rung (a)'s own 7348-7350 exclusion too (not
  applied to the already-shipped `turn6-menu.json` this session, to avoid
  churning it under time pressure — noted as an optional cleanup).
  Determined the animation's own true first pixel-change tick is **7405**
  (RAM/pixel-confirmed, earlier than the brief's "~7450" eyeball estimate)
  — `turn6-featherdance.json`'s captureFrames stop there.
- **Did NOT land (scope call, not a resistance-with-no-findings):** the
  feather/starburst sprite animation (7405-7658). RAM-probed the spawn
  timeline (8 `gFallingFeatherSpriteTemplate` sprites, groups of 1/2/2/2/1
  at 8-tick spacing, all spawning at (72,64) — script-confirmed against
  `Move_FEATHER_DANCE`/`data/battle_anim_scripts.s:3975`) and read the
  render mechanism (`AnimFallingFeather`/`_Step`,
  `src/battle_anim_flying.c:572`): each sprite writes an independent
  rotation+scale matrix into `gOamMatrices` every tick from a sine-table
  phase accumulator — a genuinely new affine-rotation sprite primitive
  this codebase has no precedent for (existing affine helpers only ever do
  a single uniform scale or a single externally-supplied static matrix).
  Per the brief's own explicit permission ("if they resist wholesale, stop
  and document rather than shipping a half-fit"), stopped here rather than
  force a bounded-effort implementation that wouldn't reach this dossier's
  0-diff/RAM-verified standard in the remaining time. Full writeup +
  banked RAM data: `docs/battle-turn-notes.md` §28.
- **Next:** the feather/starburst animation itself (§28's own sketch: a
  generic affine-matrix sprite blitter, a full per-tick RAM probe of
  `gOamMatrices`/sprite state across 7405-7658, and `ANIM_TAG_WHITE_FEATHER`
  gfx extraction via `extract-battle-move-anim-assets.ts`'s convention —
  none attempted this session beyond the spawn-timeline scan). Then rung
  (c) (ATK-fall message) and rung (d) (Onix's ROCK_SLIDE, parameterizable).
- **Notes:** PAPERCUT: none new this session — the chained-trace-stitching
  risk flagged in §27 turned out to be moot here (verified `battle1-
  turn6-dense.json`'s own script has zero button presses between the turn-6
  confirm and turn 7's reopen, so `turn6-menu.json`'s already-committed
  idle tail already covered the whole window — no stitching needed at all).

---
