# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 208 — Bounded worker (S7 slice N-4 rung (b)): Onix's ROCK_SLIDE vs. PIDGEOTTO landed in full — turn 6 resolved END TO END — `turn6-rockslide-a.json` **255/255**, `turn6-rockslide-b.json` **105/105**, both 0 diff, first-attempt on the mechanics half; a pure parameterization, no new HP-drain formula needed after all (S7 bounded worker session, hard 60-minute cap)

- **State:** `npm test` **837/837** (+6), `npm run build` green, tree
  clean. `turn6-rockslide-{a,b}.json` 0 diff (7765-8124 contiguous).
  Zero regressions: `turn6-statfall.json` 127/127, `turn6-feathers.json`
  106/106, `turn6-featherdance.json` 90/90, `turn6-menu.json` 33/33,
  `turn5-rockslide.json` 256/256, `turn3-rockslide.json` 256/256,
  `turn1-rockslide.json` 256/256.
- **Did:** rung (a) first — fresh dense oracle capture of the full
  7765-8124 window (360 frames), which RESOLVED §30's own flagged
  "8039-8114 uncaptured gap": it's not a second unmodeled mechanism, it's
  the flat hold of "It's super effective!" (ROCK-vs-FLYING), whose own
  message-box swap starts at 8018, 21 ticks earlier than §30's gap
  boundary. Rung (b): every existing ROCK_SLIDE mechanism (rocks/shake/
  hit-flash/drain) reused UNCHANGED behind a synthetic press anchor
  (`TURN6_ROCKSLIDE_PRESS_TICK=7372`) that reproduces the fresh capture's
  own transition ticks exactly by hand-arithmetic before any code was
  written. The brief's flagged "fresh HP-drain pixel formula" turned out
  to be unnecessary — `calcBarFilledPixels` was already maxHp-agnostic
  and `rockSlideOpponentHp` was already value-agnostic; Pidgeotto's own
  156-max bar just needed `pidgeottoHealthboxContentForHp(hp)`, a direct
  copy of the existing per-HP memoization. New: "It's super effective!"
  text (curly-apostrophe fix caught by `npm run compare`'s 14px diff),
  and the turn-end settled-menu function (a missing base-background paint
  caught by a 47%-diff `npm run compare` failure, despite looking correct
  in a side-by-side PNG glance — fixed immediately).
- **Next:** turn 7 as a parameterization of turn 6's own mechanisms
  (turn7-notes.md's dossier already exists), or turns 8-13; scout
  territory: turn 17+ (Murkrow faints 22418 → the WIN arc, per §16);
  ISSUES #26 probe; feather residual 7421-7549 (§29's named leads, still
  open, low priority).
- **Notes:** no papercuts. `npm run compare`'s pixel-diff caught both real
  bugs immediately and precisely (apostrophe glyph, missing bg paint) —
  hand-verifying the mechanism-reuse arithmetic BEFORE writing render code
  (per §30's own mandate, extended to pixels not just RAM) meant the
  mechanics half (255 frames) passed compare on the very first attempt.

---
## 207 — Worktree scout (supervisor-folded): turn 16 ground truth BANKED — the first MAGBY-vs-MURKROW turn: speed order pinned (MURKROW 97 > MAGBY 89, acts first), FAINT_ATTACK skips accuracy entirely (source: `.accuracy=0`), FIRE_PUNCH rolls accuracy even at 100% AND **its 10% burn proc SUCCEEDS** (`status1` 0→16 at tick 21411, burn residual `floor(142/8)=17` at turn-end) — **the run's FIRST status-condition ground truth**, BRN badge PNG-pinned (absent 21540 → present 21548); `battle1-turn16-dense.json` (256 captures) + `docs/turn16-notes.md`; merged, suite 831/831 on the merged tree

- **State:** merged into master post-N-4, `npm test` 831/831 + build
  green post-merge, worktree/branch cleaned. Supervisor re-verified
  independently: prefix chain re-flattened myself (turn15-dense ⊂
  turn16-dense ⊂ winline-b-swap, script-exact), fresh oracle rerun
  reproduced 15/15 cited shas at exact ticks, 3 label PNGs read directly
  (MAGBY's first-ever FIGHT submenu — FIRE PUNCH/SMOKESCREEN/CONFUSE
  RAY/SMOG, PP 15/15, TYPE/FIRE — and the BRN absent→present pair).
  ISSUES #16 trimmed at this fold: ground truth exists now; the engine's
  own status-icon compositor path is the open remainder.
- **Did:** 8 Random() calls in 20745-21773 (crit+dmg for FAINT_ATTACK —
  no accuracy roll; acc+crit+dmg+burn for FIRE_PUNCH; 1 unattributed
  mid-turn at 21152 — FLAME_BODY hypothesis RULED OUT by source,
  FAINT_ATTACK has no contact flag in this ROM; 2-step tail cluster
  21719/21724 matching the "AI-prescoring" shape, first time seen
  mid-battle). Damage: 59 (MAGBY 138→79), 67 (MURKROW 142→75), burn 17
  (75→58). Both new move animations sketched coarse-only (open items).
- **Next:** main lane — N-4 rung (b), Onix's ROCK_SLIDE vs Pidgeotto
  (§30's sha-sweep handoff); scout — turn 17 (§16's "turn 2": Murkrow
  faints 22418 → the WIN sequence); then ISSUES #26 probe, feather
  residual 7421-7549, turns 7-13 parameterizations.
- **Notes:** scout in contract (15.7 of 40 min); no papercuts; its
  proposed "close #16" was corrected to a trim at the fold (ground truth
  ≠ engine validation).

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
