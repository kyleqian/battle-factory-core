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

## 693 — [BOUNDED MAIN WORKER 2026-07-29 ~11:37] day-audit switch-history + continuous-cursor findings closed

- **State:** implementation `0df6ce0d`, continuous-cursor pin `63394a08`;
  current tree green at **507 files / 5173 tests**, production build and
  `git diff --check`. Both censuses regenerate byte-identically at
  **8b18f754…5261 / 3ff4c7f3…dc6c**; import/barrier ratchets remain **6/6**.
- **Did:** `Cmd_switchindataupdate` now clears only the switched battler's
  source-exact last-move/result/choiced-move and AI move/ability history;
  item-effect and opposing history persist. Tier-1 covers player voluntary
  through next AI sync, player forced, trainer voluntary, and literal buffer
  clearing. Challenge 2 now also starts from challenge 1's returned cursor:
  **514721516 → 782337733**, generation calls **0–204–487**, rentals
  **278/213/206/205/212/246**, opponent 99 **224/243/236**; fixed-seed
  rank proof retained.
- **Equivalence / sweep:** all seeds **4–30** retain exact outcomes and
  cursors (**25/27 wins; 6:791 and 12:1846 legitimate losses**); all
  **31–60** rows are byte-identical to the frozen census (**25/30 wins**).
  No cursor table moved, so no re-pin commit exists. All six R13-D banked
  receipt/control tests remain exact.
- **Next:** supervisor resumes rung-14's ordered forced-switch then
  battle-command presentation seams. No issue, roadmap, animation,
  presentation, oracle capture/profile, census byte, ratchet, or tick branch
  moved. PAPERCUT: none.

---

## 692 — [BOUNDED MAIN WORKER 2026-07-29 ~11:10] Rung-14 generic Frontier trainer-picture selection landed

- **State:** implementation commit `51438230`; current union green at **507
  files / 5169 tests**, production build, `git diff --check`, and Battle Scene
  OFF oracle info. Both censuses regenerate byte-identically at SHA-256
  **8b18f754…5261 / 3ff4c7f3…dc6c**; unsupported/import ratchets remain
  **6/6** with no pin movement.
- **Did / equivalence:** `battleScene.ts` now resolves the generated trainer
  presentation's `TRAINER_PIC_*` symbol through the complete 50-picture
  extracted catalog for settled intro, exit slide, and loss slide. The prior
  Bug Catcher/Fisherman assets are each byte-identical to the generic result;
  canonical settled DESTIN framebuffer SHA-256 remains
  **8d92751a…2346**. All 50 source-exact 64×64 assets decode/resolve, and a
  missing symbol throws loudly; no fallback or battle/turn/tick branch remains.
- **OFF evidence:** the sole acceptance trace under `tools/compare/traces`
  whose recorded window shows a trainer picture,
  `battle2-off-turn1-staged.json`, remains **16/16 exact** (canonical JENSON).
  No committed explicit-OFF window shows a third/non-canonical trainer, so no
  trace was invented. The separate non-acceptance ground-truth diagnostic
  `battle2-off-turn1.json` remains **38/179** and was not thinned or claimed.
- **Sweep / next:** generated-round sweep **24/24**, cursors unchanged:
  **4:2415, 5:2156, 6:791 loss, 7:1337, 8:1922, 11:2012, 13:2415,
  14:1946, 15:1602, 16:1878, 17:2013, 18:2143, 19:1691, 20:2326,
  21:1911, 22:1389, 23:2114, 24:1751, 26:1680, 29:1869, 30:1825**.
  Supervisor resumes rung-14 forced-switch then battle-command seams; the
  commentary OFF checkpoint remains separately bounded by entry 690. No issue,
  roadmap, census byte, capture list/profile, animation, or tick branch moved.
  PAPERCUT: none.

---

## 691 — [SUPERVISOR WIND-DOWN 2026-07-29 ~11:05] rung 13 complete; sweep blocker-free; four §7 receipts ROM-pinned; rung-14 swap+commentary seams live

- **State:** master green at **507 files / 5164 tests**, production build,
  `git diff --check` clean, both censuses idempotent (ability/item at the
  post-Toxic pin, sole session delta ABILITY_IMMUNITY refs 10→12).
  DEFERRED.md **empty all session**. No orphan worktrees or worker
  branches. `animation-main` folded twice (ff at orient `d166f9cf`; 9 more
  commits at wind-down — Whirlwind/Block X/Light Screen/Spore exact, water
  orb partial ratchet); the animation supervisor may land more before its
  own 14:21 wind-down — an unfolded tail there is fine to fold at next
  orient.
- **Session (11 rounds / 13 workers, 0 failed steps):** (1) sweep blockers
  emptied — wake-up `Cmd_bicword` (18/20 exact), Attract/in-love canceler
  (23), end-turn two-budget split (21, from a side-scout dossier
  docs/end-turn-budget-scout.md); **the generated-seed blocker census is
  now empty** (25/27 win seven; 6 and 12 legitimate losses). (2) Rung 13
  complete: R13-A pure ShouldSwitch policy → R13-B trainer switch kernel
  surface → R13-C live driver (headline constraint retired; cursors
  re-pinned source-faithfully, seed 6 honest loss) → R13-D breadth +
  engine-vs-receipt equivalence; four §7 receipts ROM-pinned by
  process-isolated attribution probes (absorber, Wonder Guard, Natural
  Cure, Perish Song zero-draw). Toxic CBM/CV port closed the last
  B-control carve-out. (3) Entry-677 reveal remainder classified and
  wired: 27 class-A sites live with quiet-arm pins, 11 class-B sites
  named to their barriers (docs/ai-reveal-sites.md). (4) King's Rock
  retired state 12 (ratchet 6→5). (5) ISSUES #48 fixed with a
  two-challenge lifecycle proof (rents count 14→15 once, rank 0→1;
  declined control pinned). (6) Rung-14: seam map
  (docs/rung14-presentation-seam-scout.md), generic swap entry (8 OFF
  windows exact at recorded counts), commentary app stage (171/171 +
  164/164 canonical equivalence; explicit-OFF generated trace honestly
  bounded on a missing pre-battle checkpoint), and 50 Frontier
  trainer-pic assets extracted for the identity-visual slice.
- **Next (ordered):** (i) rung-14 remaining windows per the seam map's
  ranking — trainer-pic renderer selection (assets banked), then
  forced-switch and battle-command generic seams; (ii) the commentary
  explicit-OFF route needs a source-valid pre-battle checkpoint (named in
  entry 690); (iii) reveal class-B sites unlock with their named barriers
  (docs/ai-reveal-sites.md); (iv) remaining CBM/CV effect arms behind the
  generic barrier (Toxic pattern established); (v) Gate-6 interaction
  matrix. Oracle freshness FAIL at orient was a docs-only false positive
  (recorded in entry 681) — check service start times before restarting.
- **Notes:** the mid-step side-worktree base papercut was filed in
  PAPERCUTS.md and mitigated in later briefs by naming the last
  supervisor-verified green commit; it still cost two workers ~5 min each
  (receipts-BC, Toxic). PAPERCUT: none new otherwise.
