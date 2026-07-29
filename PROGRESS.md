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

## 694 — [BOUNDED MAIN WORKER 2026-07-29 ~11:52] Rung-14 forced-switch request/presentation seam landed

- **State:** implementation `af9db399`; tree green at **507 files / 5175
  tests**, production build, `git diff --check`, and Battle Scene OFF oracle.
  Both censuses regenerate byte-identically at SHA-256 **8b18f754…5261 /
  3ff4c7f3…dc6c**; import/barrier ratchet remains **6/6**.
- **Did / equivalence:** `partySelect.ts` now constructs immutable row identity,
  live HP/status, fainted/legal flags, and the presentation request from a
  `BattleForcedSwitchRequest` plus full player rental records/party via
  `createFactoryCorpusPartyMember`. The canonical ONIX/MAGBY/BAYLEEF state is
  structurally equal to the prior state, and `core.ts` uses the generic
  constructor. Confirmed SEND OUT submits `{kind:"switch", partyIndex:1}`
  through ordinary `submitBattleDecision`; no new acknowledgement protocol.
- **OFF evidence:** canonical and delayed party-select remain **200/200 +
  200/200 exact**. All ten downstream party-owned windows also remain exact:
  rung 2 **43/43 ×2**, rung 3 **46/46 ×2**, rung 4a **16/16 ×2**, rung 5
  **144/144 ×2**, rung 6 **195/195 ×2**.
- **Sweep / next:** all seeds **4–30** retain outcomes/cursors (**25/27 wins;
  6:791 and 12:1846 losses**), including full previously-unlisted pins
  **9:1252, 10:1657, 25:1497, 27:1882, 28:1999**. Supervisor continues
  rung-14 with battle-command; arbitrary-species party icons/chrome remain a
  later asset slice. No trace/profile/capture list, census byte, ratchet,
  issue, roadmap checkbox, animation, or turn/tick branch moved. PAPERCUT:
  none.

---

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
