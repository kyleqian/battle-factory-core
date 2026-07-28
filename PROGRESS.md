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
## 543 — [BOUNDED MAIN WORKER 2026-07-27 ~21:43] Full-turn singles requests use source move targets

- **State:** tree green at **296 files / 3829 tests**; `npm run build` and
  `git diff --check` clean. The unchanged Battle-2 OFF trace remains
  **16/16 exact**.
- **Did:** extended the generated full-turn move view with `target` and ported
  the represented singles branches of `GetMoveTarget`: USER stays on the
  actor; SELECTED/DEPENDS/BOTH/FOES_AND_ALLY/OPPONENTS_FIELD/RANDOM select the
  only foe without RNG. Canonical ONIX SANDSTORM slot 3 and KABUTO PROTECT
  slot 3 now self-target at initial/trainer/next-turn boundaries; all other
  canonical slots oppose. The existing slot-3 execution/PP proof remains.
- **Next:** source-completely register `B_SCR_OP_COPYFOESTATS` /
  `EFFECT_PSYCH_UP`, walk neutral/non-neutral scripts to END, and regenerate
  the executable-frontier census for exact **+1/+1/+1/+14**.
- **Notes:** focused **24/24**, full **3829/3829**, build/compare/diff green.
  No RNG target draw, unsupported barrier, recording import, ratchet change,
  oracle lifecycle action, animation edit, or PAPERCUT.

---
## 542 — [BOUNDED MAIN WORKER 2026-07-27 ~21:33] Full-turn singles requests are move-slot generic

- **State:** tree green at **295 files / 3824 tests**; `npm run build` and
  `git diff --check` clean. The unchanged Battle-2 OFF trace remains
  **16/16 exact**.
- **Did:** one shared singles legal-move helper now publishes every nonzero
  configured slot, in order, with the opposing target for player/trainer and
  at both initial/next-turn boundaries. Removed the player slot-0 reducer
  guard; public legality still rejects empty slots. Tier-1 submits player
  slot 3 and pins final `currentMovePosition=3`, slot-3 PP **20→19**, and
  PP-event interpreter provenance. Added the scout’s historical-resolution
  note pointing to `22ddfcd` / `f4427c0`.
- **Next:** supervisor verify this correction, the preserved canonical
  ONIX/KABUTO **650807554 / 4-call** result, exact nine-command projection,
  and unchanged **16/16**, then resume the ranked S10 executable frontier.
- **Notes:** focused **24/24**, full **3824/3824**, build/compare/diff green.
  No unsupported barrier, canonical-recording import, ratchet change,
  oracle lifecycle action, animation edit, or PAPERCUT.

---
## 541 — [BOUNDED MAIN WORKER 2026-07-27 ~21:24] Real full-turn kernel now drives the exact Battle-2 OFF seam

- **State:** union green at **295 files / 3823 tests**; `npm run build`
  clean. The unchanged `battle2-off-turn1-staged.json` trace remains
  **16/16 exact** on the selected OFF profile.
- **Did:** the existing Scene-OFF adapter now projects provenance-bearing
  semantic events plus the genuine request-3 boundary into the same nine
  relative commands, acknowledging exactly at
  **145,146,160,260,261,311,400,404,405**. The existing app stage now retains
  the immutable full-turn transition and renders names/HP/stat/text from its
  projection; kernel RNG stays honestly at **650807554 / 4 calls**.
- **Next:** supervisor independently verify `22ddfcd` plus this presentation
  commit and the unchanged **16/16** trace, then resume the ranked S10
  executable frontier. The retired staged 12-draw scenario may be removed
  later only after auditing its remaining callers.
- **Notes:** focused **17/17**, full **3823/3823**, build and `git diff
  --check` green. Preserved the concurrent file-disjoint Return/Frustration
  evidence merge. No synthetic eight-draw tail, canonical recording import,
  unsupported barrier, ratchet change, oracle lifecycle action, or PAPERCUT.
