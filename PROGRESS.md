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


---
## 540 — [BOUNDED MAIN WORKER 2026-07-27 ~21:17] Full-turn controller seam source-correct and provenance-bearing

- **State:** tree green at **294 files / 3820 tests**; `npm run build`
  clean. The direct canonical ONIX/KABUTO full turn reaches player request
  **3** with HP **117/63**, PP **9/14**, accuracy **5**, and RNG
  **650807554 / 4 calls**.
- **Did:** the backward-compatible full-turn config now carries canonical
  ability/item/four-slot PP/friendship; both submitted move slots reach
  `currentMovePosition`. One source-documented `HandleAction_ActionFinished`
  helper clears every represented action field and script stack. Public
  boundary events preserve immutable interpreter provenance; the former
  scout barriers are positive direct-config assertions, including two used-
  move messages, Sand Attack damage **0**, and exact source labels.
- **Next:** project the immutable semantic events plus request-3 boundary
  into the existing nine relative Scene-OFF commands/acknowledgements, then
  replace only `battle2-off-turn1-before-confirm` and reprove the unchanged
  trace at **16/16**. Do not synthesize the later eight AI/controller draws.
- **Notes:** focused **28/28**, full **3820/3820**, build green; baseline OFF
  oracle hash `9c89c741…f297`. No oracle lifecycle action, canonical recording
  import, unsupported barrier, ratchet change, or PAPERCUT.

---
## 539 — [SUPERVISOR VERIFY 2026-07-27 ~21:06] Return/Frustration + Battle-2 OFF kernel-seam evidence merged green

- **State:** union green at **293 files / 3819 tests**; `npm run build`
  clean. Census regenerates byte-clean at **130/214 effects, 254/355 moves,
  206/276 Factory-L50 distinct, 2604/2957 weighted (88.1%)**, with **42/42**
  checks. The unchanged staged Battle-2 OFF trace remains **16/16** and the
  selected OFF oracle is fresh at `9c89c741…f297`.
- **Did:** independently reviewed and verified the generic Return/Frustration
  opcode, all u8 friendship boundaries, terminal paths, and cross-action
  cleanup. Merged `83718d2`, a file-disjoint real-kernel scout proving exact
  Battle-2 turn-1 HP/stat outcomes and four source move draws. It pins the
  remaining reusable seam gaps: canonical ability/item/PP inputs, submitted
  move-slot propagation, complete represented `HandleAction_ActionFinished`
  cleanup, and provenance preservation through the public boundary.
- **Next:** source-completely fix those four shared-controller gaps, then
  project the resulting immutable semantic events and request-3 boundary onto
  the existing nine relative OFF commands. Preserve the unchanged 16-frame
  trace and do not fabricate the eight later next-turn controller/AI draws.
- **Notes:** side worktree/branch removed. No new unsupported barrier,
  canonical-recording production import, ratchet change, or deferred decision.
  No PAPERCUT.

---
## 538 — [BOUNDED WORKER 2026-07-27 ~21:02] Return/Frustration execute end to end; exact +2/+2/+2/+18

- **State:** tree committed and green at **292 files / 3816 tests**;
  `npm run build` clean. Census regenerates to **130/214 effects, 254/355
  moves, 206/276 Factory-L50 distinct, 2604/2957 weighted (88.1%)**, the
  assigned exact **+2 effects / +2 moves / +2 distinct / +18 weighted**,
  with all **42/42** checks passing.
- **Did:** `696d475` source-ports/registers the shared zero-operand
  `B_SCR_OP_FRIENDSHIPTODAMAGECALCULATION` with exact u8 friendship
  complement/floor arithmetic and strict effect/dispatch-shape validation.
  Tier-1 pins both genuine-END walks, all quotient boundaries, extrema,
  invalid contexts, opcode isolation, miss, Protect, faint, and generic
  Frustration→ordinary-Strength action-boundary cleanup. `5e51eea`
  regenerates the census.
- **Next:** supervisor verify this completed row, then take the generated
  top-ranked `B_SCR_OP_COPYFOESTATS` / `EFFECT_PSYCH_UP` row
  (**+1 effect / +1 move / +1 distinct / +14 weighted**).
- **Notes:** no unsupported barrier, canonical-recording import, ratchet,
  side-scout file, canonical Battle-2, or oracle lifecycle change. Battle
  Scene OFF freshness passed at baseline (`9c89c741…f297`). No PAPERCUT.
