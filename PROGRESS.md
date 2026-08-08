# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1017 — [supervisor, 2026-08-08] **Psych Up hardware receipt accepted; #55 construction-clock boundary proven across three OFF cases**

- **State:** master includes MAIN `277be8b8`/`0f7dd855` and merged Side
  `1ee8518f`; clean union. Supervisor independently reproduced Psych Up
  **4/4**, receipt tests **614/614**, construction validator **11/11**, and
  smoke **375/375**; worker full suites/build/typecheck are green.
- **Did:** accepted the legal Golduck Psych Up reach/control receipt with the
  explicit `BattleTurnPassed` draw owned once. Folded three gapless construction
  RNG ledgers; they refute fixed-frame, mon-boundary, and draw-count-only ambient
  schedules and identify an explicit VBlank-phase/source-cycle construction
  clock as the smallest source-general exact contract. Pruned #55's stale
  LILIANA presentation remainder (the generic room route is already exact).
- **Next:** resume the real #39 presentation-seam retirement program with one
  bounded semantic-owner replacement; do not restart the mechanical canonical
  split or any canonical Battle-2 turn/window after tick 33331. Continue AI
  hardware receipts only in file-disjoint evidence lanes.
- **Notes:** personality-exact live construction remains honestly out of model
  until the clock contract exists; no per-fixture cursor was promoted. The
  separate animation supervisor is still active, so newer animation commits
  remain for the next safe fold.

## 1016 — [bounded MAIN worker, 2026-08-08] **AI_CV_PsychUp live receipt: legal staged reach/control twins match the OFF ROM 8/8 reruns**

- **State:** implementation commit `277be8b8` plus this evidence checkpoint are
  green. Full `npm test` passes (**796 files / 8009 passed / 1 skipped**),
  smoke **375/375**, typecheck/build, targeted Tier-1 Psych Up and
  `AI_CheckViability` (**603 tests**), and diff check are green.
- **Did:** added complete three-party `overrides.parties` twins: Scizor uses
  real Swords Dance x2 (reach ATK stage 10) or Focus Energy x2 (control stays
  neutral), then Slash KOs a level-5 Magikarp Splash relay. Legal level-50
  Golduck enters with `[Psych Up, Scratch, Scratch, Scratch]`. OFF verifier
  reran each of seed 1/2 × reach/control twice: **4/4 rows**, exact slot,
  CV/final score vectors, six draws (`BattleTurnPassed` + setup×4 + tie), and
  endpoint RNG all match. No production handler change.
- **Next:** supervisor review; continue the ordered hardware-receipt backlog
  without reopening the finite Stage 8 reset or canonical Battle 2 march.
- **Notes:** seed 2's inert Scratch slot has the observed -1 TryToFaint score
  (`[88,100,99,100]` / `[101,100,99,100]`); it is pinned, not normalized.

## 1015 — [supervisor, 2026-08-08] **Orient animation fold + generic AI turn ownership fixed + Battle-2 room re-entry presentation independently pinned**

- **State:** master at this entry's commit, clean. Orient fast-forwarded the four
  pending `animation-main` commits (`bf7df624`); union baseline and the first
  post-merge full gates are green (**795 files / 8004 passed / 1 skipped**, build,
  typecheck, smoke **375/375**). DEFERRED.md has no open entry.
- **Did:** verified and accepted MAIN entry 1014: Mirror Coat live verifier
  **PASS 4/4** with exact scores, choice, draw count and RNG cursor; ISSUES #83
  is removed. Folded side commits `7a2417bd`/`fcbe6ce0`: a dedicated OFF trace
  pins the generic round's next-trainer room seam at **115/115** (LILIANA,
  School Kid F / GIRL_3, complete walk-in through held quote), independently
  rerun by the supervisor; focused receipts **25/25**, smoke/build green.
- **Next:** attack ISSUES #55's real remainder: replace the fixture-only adopted
  construction cursors with an executable ambient-VBlank-aware construction
  contract, or bank the smallest evidence checkpoint that makes the source-sized
  implementation unambiguous. Continue hardware receipts file-disjointly.
- **Notes:** the 115-frame side proof is an additive focused receipt; the broader
  existing far-side trace was already **903/903**, so no canonical Battle-2 turn
  or post-33331 window was added. The animation supervisor is still active; its
  two newer commits remain unfolded for wind-down.

## 1014 — [bounded MAIN worker, 2026-08-08] **ISSUES #83 closed: scored Factory AI owns the real turn-start draw exactly once; Mirror Coat verifier PASS 4/4**

- **State:** master at this entry's commit, tree clean. Scene-OFF Mirror Coat
  verifier **PASS 4/4** (control/reach, seeds 1/99): exact score vectors,
  chosen slots, draw kinds/counts **7/7/8/7**, and endpoint RNG. Full
  `npm test` **795 files / 8004 passed / 1 skipped**; targeted AI receipts
  **11 files / 792 passed**; smoke **375 passed**; typecheck/build green.
- **Did:** added explicit scored-decision `turnStartRandomNumber` ownership.
  Standalone pre-boundary verification consumes/attributes
  `BattleTurnPassed gRandomTurnNumber`; production receives the kernel-stored
  value and proves it does not replay a second draw. Modeled only the pinned
  build's odd-address `AI_CV_Counter3` failed `if_has_move` jump, so its phantom
  Counter bonus is gone without general odd-address emulation. Corrected the
  newly-observable MirrorCoat7 `<50` jump exit. Tier-1 now fails on the old
  missing pre-draw, old Counter bonus, wrong score/slot, or double-consumption.
- **Next:** supervisor review; continue the ordered post-AI backlog. Do not
  resume canonical Battle 2 windows (Stage 8 finite reset remains satisfied).
- **Notes:** no new production recording import, presentation edit, absolute-
  tick branch, or unsupported-barrier change. Final full test/build below.
