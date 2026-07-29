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

---

## 704 — [BOUNDED MAIN WORKER 2026-07-29 ~16:05] Battle-command seam Slice 6 Part B field-art route landed; breadth trace honestly open

- **State:** implementation `216a7fab`; tree green at **518 files / 5254
  tests + 1 deliberate animation-lane skip**, production build, required
  targeted acceptance **148/148**, and `git diff --check`.
- **Did:** the typed command render view now resolves both active battlers'
  complete front/back art, palettes, source pic coordinates, and resting
  origins from live species IDs through the banked 376-species catalogs.
  Canonical Battle 2 consumes that same resolver pixel-neutrally. Added the
  app-visible `battle-command-generated-off` stage: the live generated
  orchestrator reaches a settled GRANBULL-vs-ARON action/FIGHT field with
  live healthboxes/moves and advances through the ordinary request reducer.
- **Next:** the explicit-OFF breadth proof remains **open (0/128 claimed; no
  trace committed)**. The required final legal A-confirm immediately drives
  the generated logical kernel/trainer and publishes the next player request,
  while the ROM holds the confirmed FIGHT field through its Scene-OFF
  action-resolution presentation. That typed resolution/next-command handoff
  belongs to design §5's send-out/action-resolution lifecycle work; do not
  hide it with a screenshot, delayed tick branch, or thinned capture window.
- **Notes:** all fourteen immutable windows exact: Battle 2 **209/209**,
  FIGHT **235/235**, reopen **90/90**; turns 3–13 **254/254, 44/44, 42/42,
  44/44, 93/93, 88/88, 111/111, 83/83, 56/56, 46/46, 57/57**. No canonical
  import, unsupported barrier, capture removal, battle/turn/absolute-tick
  selector, damage/RNG/turn-order, party selector, or animation change.
  PAPERCUT: `bin/oracle lab` default output flooded the session while only a
  screenshot path was needed, ~1 min.

---

## 703 — [BOUNDED MAIN WORKER 2026-07-29 ~15:31] Battle-command seam Slice 6 Part A landed

- **State:** implementation `d995671d`; tree green at **518 files / 5254
  tests + 1 deliberate animation-lane skip**, production build, required
  targeted acceptance **386/386**, and `git diff --check`.
- **Did:** live generated player command boundaries now own a
  `BattleCommandPresentation` built only from the published request and live
  `rulesContext`; action/FIGHT input uses the ordinary phase-relative reducer,
  completed moves cross the existing `submitBattleDecision` bridge with
  `reduceFactoryFullTurnDecision`, trainer commands remain AI-driven, and each
  next player command replaces the request-owned presentation. Added
  controller-owned per-battler move cursors: new requests seed from persistent
  state, switch-ins and fresh battle controller starts reset the affected
  cursor. Tier 1 pins slot-3 persistence, switch-in reset, and zero-seed
  identity for fresh canonical lifecycles. Deleted resolved ISSUES #50.
- **Next:** Slice 6 Part B only: wire the already-banked arbitrary-species
  battle-pic catalogs into the generated presentation renderer, then (only
  after it visibly reaches the window) add the explicit-OFF 128-frame breadth
  trace. Do not redo Part A or alter cursor ownership.
- **Notes:** all fourteen immutable windows exact: Battle 2 **209/209**,
  FIGHT **235/235**, reopen **90/90**; turns 3–13 **254/254, 44/44, 42/42,
  44/44, 93/93, 88/88, 111/111, 83/83, 56/56, 46/46, 57/57**. No battle-pic
  consumer, trace/capture list, party-row/selector renderer, canonical import,
  unsupported barrier, battle/turn/absolute-tick selector, damage, RNG,
  turn-order, or animation change. PAPERCUT: none.

