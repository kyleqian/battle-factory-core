# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 206 — Bounded worker (S7 slice N-4, rung a): turn 6's stat-fall window landed — §29's flagged ~7570+ residual RESOLVED (it's the generic StatsChangeAnimation banner, already built for turn 1's DOUBLE_TEAM, just never parameterized for a stat DECREASE) — `turn6-statfall.json` **127/127, 0 diff**, first-attempt; rung (b) (Onix's own ROCK_SLIDE vs. Pidgeotto) NOT attempted, precise ground-truth handoff banked in battle-turn-notes.md §30 (S7 bounded worker session, hard 60-minute cap)

- **State:** `npm test` **831/831** (+6), `npm run build` green, tree
  clean. `turn6-statfall.json` **127/127, 0 diff** (7558-7684). Zero
  regressions: `turn6-feathers.json` 106/106, `turn6-featherdance.json`
  90/90, `turn6-menu.json` 33/33, `turn5-rockslide.json` 256/256,
  `turn1-rockslide.json` 256/256.
- **Did:** RAM-probed the residual (`dump-task-and-sprite-callbacks.py`)
  and found `gTasks` slot 1 running `StatsChangeAnimation_Step1/2/3` from
  RAM tick 7567 — the SAME OBJ-window-masked BG1 alpha-blend banner turn
  1's own `drawStatsBanner` already renders, just for a DECREASE
  (`aSharply=TRUE` → `tTargetBlend=13`/`tWaitTime=30`) masked to ONIX
  instead of Grovyle. A direct register probe (`BLDALPHA`/`gBattle_BG1_X`/
  `gBattle_BG1_Y`, stride-1) decoded a clean deterministic step function
  that matched the oracle 0-diff on the FIRST attempt, no bisection
  needed. Also folded a message-sequencing correction directly into
  turn6-notes.md's own understanding (superseding turn7-notes.md §5's
  "generic box transition" guess): the "ONIX's ATTACK harshly fell!" text
  starts at tick 7659 as a plain instant swap, not a box-close/reopen
  slide — the "4 shared frames" turn7-notes noticed is just both messages
  starting with the literal characters "ONIX".
- **Next:** rung (b) — Onix's own ROCK_SLIDE vs. Pidgeotto (7765-8122ish,
  battle-turn-notes.md §30 has a full sha-transition sweep of the whole
  window banked: kickoff transition/hold, rock animation ~7805-7924,
  impact flash ~7935-7955, HP-drain ~7970-8038, an uncaptured gap
  8039-8114 almost certainly "It's super effective!", turn-end 8115-8124).
  Needs: Pidgeotto-parameterized shake/blink (sprite+corner already exist
  from the switch-in code), a fresh HP-drain pixel formula (156-max bar,
  turn6-notes §5 already flagged it's NOT 1-unit-per-tick like turn 1's),
  and the flinch/AI RNG cluster. Pidgeotto's healthbox sits at the SAME
  screen origin Grovyle's did once settled (`turn5PidgeottoHealthboxSlideDx`
  → 0), so the existing wobble geometry should be directly reusable.
  Beyond that: turns 7-13 as parameterizations, turn 15+ scout (FLY
  strike/first forced switch — already banked per #205), ISSUES #26.
- **Notes:** no papercuts. Session was research-heavy (RAM-probing to
  find the real mechanism cost real time) but paid off — first-attempt
  0-diff is rare in this dossier and validates the "RAM-probe before
  writing render code" mandate directly. Stopped rung (b) before
  attempting implementation once it became clear it needed several NEW
  sub-mechanisms (not a pure parameterization as the brief hoped) and the
  session budget was better spent banking precise ground truth than
  rushing a half-fit.

---
## 205 — Worktree scout (supervisor-folded): turn 15 ground truth BANKED — **FLY's strike half rolls REAL accuracy/crit/damage (3 Random() calls — NOT RNG-free like its own charge half)**, hits for "not very effective" 11 clipped to Onix's 4 HP (hp0→0 at tick 19147), and the battle's first **PLAYER-side forced switch** is ground-truthed end to end (faint sink → button-gated "ONIX fainted!" → party-select, cursor defaulting to the fainted slot → SEND OUT → MAGBY 138/138 materialize → settled menu at 20558); `battle1-turn15-dense.json` (245 captures) + `docs/turn15-notes.md`; merged, suite 825/825 on the merged tree

- **State:** merged into master post-N-3, `npm test` 825/825 + build
  green post-merge, worktree/branch cleaned. Supervisor re-verified
  independently: prefix chain re-flattened myself (turn14-dense ⊂
  turn15-dense ⊂ winline-b-swap, script-exact), fresh oracle rerun
  reproduced 16/16 cited shas at their exact ticks, and 4 label-bearing
  PNGs read directly (incl. §5h's negative finding — the blank message
  box where §14-addendum's trace showed the "Get 'em, MAGBY!" quip).
- **Did:** 6 Random() calls total in 18956-20745: accuracy 19003 /
  crit 19029 / damage-variance 19032 (the strike half joins the normal
  hit flow at BattleScript_HitFromAtkString — each half of a two-turn
  move must be checked independently), turn-tail bookkeeping 19240,
  AI-prescoring pair 20550/20556. STATUS2_MULTIPLETURNS clears 19000,
  STATUS3_ON_AIR 19004. Reuse map: faint sink SAME-SHAPE (first
  player-side instance, battler0 params), KO hold / party-select /
  SEND OUT VERBATIM vs §14-addendum, materialize/healthbox SAME-SHAPE
  (honestly not byte-verified), LAX_INCENSE no proc (matches turn 13).
  New finding: the send-out flavor quip is RNG-line-dependent, NOT
  deterministic on matchup — absent on this exact committed line.
- **Next:** engine critical path: turn-6 rungs (c)/(d) (stat-fall
  anim + ATK-fall message ~7559-7684, Onix's ROCK_SLIDE), feather
  residual 7421-7549 (§29's named leads), then turns 7-13 as
  parameterizations; scout territory: turn 16+ (MAGBY vs MURKROW,
  Murkrow faints 22418 per §16 → the WIN arc); ISSUES #26 probe.
- **Notes:** scout stayed in contract (15.6 min of a 40 cap); no
  papercuts; its brief-assumption note (two-turn-move halves are
  asymmetric) folded into this entry's Did line.

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
