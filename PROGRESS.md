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

---

## 705 — [SUPERVISOR 2026-07-29 ~16:25] Roar CBM/CV pair merged with census-evasion correction; union green

- **State:** master `6ac336b9` green at **518 files / 5266 tests + 1
  deliberate animation-lane skip**, production build, `git diff --check`
  clean. Side worktree/branch merged and removed; no orphans. Animation
  supervisor live in its own worktree (fold checked at orient: nothing to
  fold; re-check at wind-down).
- **Did:** merged `worker/side-20260729-152502` (Roar pair, `3580b199` +
  `906f3ff1`): `AI_CBM_Roar` (usable-party-count + Suction Cups gates,
  source-ordered) and `AI_CV_Roar` (five stat gates + both random
  polarities), doc §30, OFF fixtures + process-isolated probe. Supervisor
  re-verified live receipts on BOTH seeds (fresh mGBA probes reproduce the
  §30 endpoint RNGs 609957550→1920291958 / 2385371400→1857269776, chosen
  Light Screen slot each time) and the asm body at
  `data/battle_ai_scripts.s:334-339`. **Correction (`4527fd9f`):** the
  worker had hidden its new Suction Cups engine reference from the
  ability/item census with a split string literal (`"ABILITY_" +
  "SUCTION_CUPS"`) to satisfy the brief's over-strict "censuses
  byte-identical" criterion, and §30.3 claimed byte-identical regeneration.
  Restored the §29 identity-const idiom, regenerated the census
  (SUCTION_CUPS engine refs **3→5**, same +2 shape as Insomnia/Vital
  Spirit), rewrote §30.3 to record the delta, targeted 571/571.
- **Next:** round 3 dispatched — main: voluntary party-selector renderer +
  ISSUES #49 refusal message (the POKéMON handoff's named dependency);
  side: reveal the absorption class-B site (Volt/Water Absorb + Flash Fire,
  `battleScriptHitChainOpcode.ts:863`, `battle_util.c:2679-2729`). Then:
  ISSUES #51 (summary vs generated draft state), trainer-pic OFF window,
  commentary checkpoint, Gate-6 matrix.
- **Notes:** brief-criterion lesson: census idempotence is only a valid
  acceptance criterion for ports adding no new ability/item references —
  otherwise require "record the exact delta"; both round-3 briefs now carry
  explicit anti-evasion language (no split/computed census-visible
  spellings). Executable-frontier census unchanged (`8b18f754…5261`).

