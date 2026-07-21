# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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
