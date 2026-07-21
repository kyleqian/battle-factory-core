# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 204 — Bounded worker (S7 slice N-3): FEATHER_DANCE's feather sprites — all 4 rungs attempted, rungs (a)/(b)/(c) landed in full, rung (d) landed as a reduced-scope prefix — `turn6-feathers.json` **106/106, 0 diff** (7307-7420, 16 new ticks past the prior 7404 cutoff); the fuller 7421-7658 window has a small, precisely-characterized residual, documented not chased (S7 bounded worker session, hard 60-minute cap)

- **State:** `npm test` **825/825** (+4), `npm run build` green, tree
  clean. `turn6-feathers.json` **106/106, 0 diff**. Zero regressions:
  `turn6-menu.json` 33/33, `turn6-featherdance.json` 90/90,
  `turn5-sitrus-a.json` 110/110, `turn1-rockslide.json` 256/256.
- **Did:** (a) extracted `ANIM_TAG_WHITE_FEATHER` gfx (byte-exact);
  (b) RAM-probed the full 7404-7658 window for all 8 feather sprites
  (`src/data/gen/turn6-feather-sprites-probe.json`) — new finding: all 8
  fully despawn by 7558, so the back half of the brief's window has zero
  live feathers; (c) pinned the ALREADY-EXISTING generic affine blit
  (`drawSpriteSheetAffineRotate`, from S7 slice M-3) against this
  mechanism's own real matrix + a multi-tile fixture; (d) attempted a
  line-by-line port of `AnimFallingFeather_Step` (validated the phase
  accumulator exactly, but the Y accumulator / `gOamMatrices` write didn't
  reproduce the probe tick-for-tick — a genuine, documented dead end, see
  battle-turn-notes.md §29), then pivoted to a RAM-table renderer
  (`src/engine/featherDance.ts`) — bisected a uniform +1 render lag AND a
  priority-split z-order against Onix's own sprite (both empirically
  verified against the oracle), landing a 0-diff 16-tick prefix of the
  animation. A real latent bug (slot reuse past despawn) was caught by the
  new Tier-1 test before it ever reached a pixel compare.
- **Next:** (1) the 7421-7658 window's own small residual (§29: likely
  same-priority feather-vs-feather ordering, or a half-pixel affine-center
  convention for even-sized sprites — cheapest repro is 7421-7440) and the
  separate ~7570+ stat-flash mechanism (not itemized, out of scope this
  session); (2) rungs (c)/(d) of turn 6 itself (ATK-fall message, Onix's
  ROCK_SLIDE); (3) turn-7..13 as parameterizations; (4) turn-15+ scout
  (FLY strike, Onix's likely KO → first FORCED PLAYER SWITCH → WIN arc);
  (5) ISSUES #26 ring probe; (6) turn6-menu.json's 7348-7350 restoration
  (still open, not attempted this session either).
- **Notes:** no papercuts this session. The algorithmic-port dead end cost
  real time (~20 min) before the RAM-table pivot — worth flagging for
  whoever writes the NEXT animation-heavy brief: RAM-table-driven
  rendering (this session's own fallback) may be the right DEFAULT for
  sine/accumulator-heavy sprite effects in this codebase, not just a
  fallback, given this is the second such mechanism (after the Sitrus
  rotation table) where the real hardware's exact tick-level timing
  resisted a straight source port within a bounded session.

---
## 203 — Supervisor wind-down: session end 2026-07-20 ~20:45 — **17 worker steps verified and folded** (8 main-lane + 9 worktree scouts, 9 rounds); suite **787 → 821/821**; headlines: **the faint/forced-switch sequence is COMPLETE end to end** (ball prop through the settled turn-6 menu, tick 7307 byte-identical — six traces, three sessions' worth of blockers root-caused), **the turn-6 engine slice has begun** (submenu reopen 33/33 + FEATHER_DANCE kickoff 90/90), and **the ground-truth dossier pipeline now covers turns 6-14** (9 dossiers + 10 dense traces, every one prefix-verified against the WIN line)

- **State (verified this minute):** `npm test` **821/821**, `npm run
  build` green, tree clean, no worktrees, no unmerged branches. Engine
  traces this session: `turn5-switchin` 167→241, `turn5-healthbox` 55,
  `turn5-sitrus-{a,b,c,d}` 110/82/150/133, `turn6-menu` 33,
  `turn6-featherdance` 90 — all 0 diff, supervisor-rerun.
- **The Sitrus saga (session's centerpiece, slices L-4→M-5):** the
  materialize ramp-down "hardware quirk" fell as a corrupted coefficient
  table (degenerate palette-offset decode); the "idle bob" fell as the
  Sitrus proc's own opening rotation (AnimTask_RotateMonToSideAndRestore,
  y2 a matrix byproduct — why y-only fits failed both signs); the
  "sampler rounding gap" fell as a +2 render lag (sampler was never
  wrong); GrantingStars spawn spacing corrected 8→10 vs source (RAM
  wins); healthboxes draw above battle-anim particles
  (UpdateOamPriorityInAllHealthboxes). Sole remainder: ISSUES #26 (the
  THIN_RING, 7042-7072 excluded, 3 attempts, untried +2-lag lead).
- **Dossier pipeline discoveries (turns 6-14):** both published lines
  reconverge RNG-exactly at turn 9 (and stay converged through a
  PP-exhaustion boundary); the ATK-floor "won't go lower!" fired and a
  blocked stat change PROVABLY skips the move's animation (33-tick vs
  ~290-tick holds — engine must gate animation on effect-success);
  BIND misses at 8 Random() calls; AERIAL_ACE skips accuracy entirely;
  turn 13's faint arrives via DRAGON_BREATH with the projectile table
  bit-identical to turn 2's (ISSUES #23's exclusion covers it — no
  fresh crack needed) and the Murkrow switch-in is turn-5 machinery
  verbatim; FLY's charge half auto-misses DRAGON_BREATH at ZERO RNG
  cost (STATUS3_ON_AIR short-circuit). Five dossier slips caught and
  corrected at folds (each with supervisor PNG/pixel-diff evidence).
- **Next:** (1) slice N-3 — the feather animation's affine renderer (8
  per-tick-rotating sprites; §28 has RAM ground truth + sketch; needs a
  fresh 60-min cap); (2) rungs (c)/(d) of turn 6, then turns 7-13 as
  parameterizations; (3) turn-15+ scout (FLY strike, Onix's likely KO →
  first FORCED PLAYER SWITCH, the WIN arc); (4) ISSUES #26 ring probe;
  (5) turn6-menu's 8 excluded period-9 ticks (tested this session
  post-bounce-fix: still real, still named).
- **Notes:** no usage-limit events; zero merge conflicts across 9
  worktree merges; 3 new PAPERCUTS entries (cwd persistence — bit a
  worker AND the supervisor, trace-stitching, struct offsets); one
  supervisor brief slip (turn-12 PP) gracefully falsified by the scout;
  worker discipline strong all session (three honest reduced-scope
  stops, every one with banked findings that landed next round).

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

