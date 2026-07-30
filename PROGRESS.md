# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
> **STANDING ARRANGEMENT (user directive, 2026-07-26):** the animation
> program runs under its own supervisor (`./run-supervisor.sh --lane
> animation`, guide `ANIMATION_SUPERVISOR.md`) in the persistent
> `.worktrees/animation-main` worktree on branch `animation-main`. Main
> supervisor: never brief animation work; fold `animation-main` into
> `master` at orient when it has new commits (details in SUPERVISOR.md's
> parallel-workers note). This replaces the temporary animation pause —
> entry 468's animation items are the animation supervisor's backlog now.

## 708 — [BOUNDED MAIN WORKER 2026-07-29 ~17:00] Generated draft summaries consume live rental records

- **State:** implementation `9c342d01` + type fix `804c27a3`; tree green at
  **520 files / 5287 tests + 1 deliberate animation-lane skip**, production
  build, targeted summary/state tests **22/22**, and all required serial
  canonical windows exact: draft
  **13/13 + 38/38 + 66/66**, summary entry **132/132 + 122/122**, mon
  navigation **54/54 + 87/87**, page changes **25/25 + 56/56**.
- **Did:** the generated-rental adapter now preserves six complete
  presentation records (identity, level, item, nature/gender, moves+PP,
  ability surface, stats/EXP, OT ID/source-hidden OT text, front-pic
  identity). Every Info/Skills/Moves/transition renderer and `core.ts`
  consumes those live records; summary DOWN reaches un-rented generated pool
  slots without anchor fallback. Canonical ONIX retains its committed
  byte-exact framebuffer hash. Deleted resolved ISSUES #51.
- **Next:** supervisor can proceed to trainer-pic OFF or Gate-6 work.
- **Notes:** current generated data lacks non-anchor National Dex mapping,
  ability display text/descriptions, and non-anchor summary 64×64 front-pic
  assets; those layers stay absent rather than substituting anchor content.
  No new canonical-recording import, unsupported barrier, trace/capture
  change, swap/party/command/animation change, or tick-keyed branch.
  PAPERCUT: none.

---

## 707 — [SUPERVISOR 2026-07-29 ~16:45] Absorption class-B reveal merged; union green; round 4 dispatched

- **State:** master green at **519 files / 5285 tests + 1 deliberate
  animation-lane skip**, production build, `git diff --check` clean, side
  worktree/branch merged and removed, no orphans.
- **Did:** merged `worker/side-20260729-161729` (absorption reveal,
  `523ae6e6`+`2a291b4f`+`18541792`): Volt Absorb/Water Absorb quarter-max
  heal (min-1, full-HP failure, PP-loss selection, battle+party HP sync)
  and Flash Fire boost/consumption source-complete at `JumpIfMoveFailed`;
  reveal row promoted B→A; unsupported-branch ratchet deliberately shrank
  **13→12**. Supervisor verification: no census evasion (deltas recorded
  honestly: Volt Absorb 2→4, Water Absorb 2→3, Flash Fire 2→4; generator
  diff was only exact-set pin line-drift re-pinning), censuses idempotent
  in-worktree, targeted 405/405 incl. ratchet, and a fresh seed-324508639
  mGBA probe reproduced the banked receipt **byte-identically**. Also
  banked two new papercuts (`7f690de1`: oracle-lab verbosity, mGBA stray
  probe logs).
- **Next:** round 4 dispatched — main: ISSUES #51 (summary consumes six
  full generated rental records instead of anchor globals); side: reveal
  the status-curing `MOVEEND_IMMUNITY_ABILITIES` class-B site
  (`battleScriptMoveEndOpcode.ts:556`, `battle_util.c:2876`), with an
  explicit unreachability-finding escape hatch. Then: trainer-pic OFF
  window, remaining CBM/CV arms, Synchronize moveend reveal, Gate-6
  matrix. Commentary OFF checkpoint stays blocked on a harness-side Battle
  Lab earlier-checkpoint decision (entry 690) — not worker-brief material.
- **Notes:** session so far: 6 workers, 0 failed steps, 1 integrity
  correction (entry 705's census evasion — both round-4 briefs carry the
  anti-evasion clause). Full-suite runs stay staggered to lane-idle
  windows; spot-checks between rounds are targeted vitest + serial
  compares.

---

## 706 — [BOUNDED MAIN WORKER 2026-07-29 ~16:28] Live voluntary party selector + source refusal landed

- **State:** implementation `558fb93d`; tree green at **519 files / 5271
  tests + 1 deliberate animation-lane skip**, production build, targeted
  selector/seam acceptance **88/88**, and `git diff --check`. Both forced
  party windows remain **200/200**; the complete fourteen command-menu
  windows remain exact (**209/235/90 +
  254/44/42/44/93/88/111/83/56/46/57**).
- **Did:** the generated battle command's typed `party-handoff` now constructs
  a voluntary three-row selector from live rules state, renders source-extracted
  party tiles/font plus arbitrary `SPECIES_*` icons, implements source
  single-layout cursor edges/submenu, restores the same request/action cursor
  on B, and submits the exact legal selected index. Both voluntary and forced
  SEND OUT now print Emerald's exact two-line `<mon> has no energy / left to
  battle!` refusal and stay in the party menu. Deleted resolved ISSUES #49.
- **Next:** supervisor should proceed to ISSUES #51 (generated draft summary
  data), trainer-pic OFF window, or Gate-6 work. The explicit-OFF 128-frame
  command breadth proof remains bounded by entry 704's action-resolution
  lifecycle gap; this step recorded no trace.
- **Notes:** no canonical-recording import, unsupported barrier, trace/capture
  change, battle/turn/absolute-tick selector, damage/RNG/turn-order, swaps,
  summary, or animation change. PAPERCUT: none.
