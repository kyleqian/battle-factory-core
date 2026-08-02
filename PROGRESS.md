# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 852 — [bounded MAIN worker, 2026-08-01] opponent-faint dismiss owner retired and verified

- **State:** `ef1aa50f` is the green implementation checkpoint. Exact
  old-field and alias census is **0/0** in `src` and `tests`; focused
  owner/scene/submenu tests are **296/296**, full `npm test` exits 0, and
  `npm run build` exits 0.
- **Did:** the typed nonterminal owner now atomically owns accepted A,
  frozen cursor, and automatic MURKROW continuation. All icon/text/ball/
  healthbox/menu anchors are dismiss-edge-relative; the turn-13 handoff
  waits for its local completion. Clean-`2649a484` app differential is
  byte-identical: **141 + 242 + 256 + 223 = 862** captures.
- **Evidence:** fresh OFF scratch manifests are **151** base and **104**
  delay-30 captures. App replay accepts at 16821/16851, holds distinct
  frozen frames, and shifts icon, glyph, ball, healthbox, and menu landmarks
  exactly +30. The wider OFF oracle comparator remains non-exact
  (**70/151**, **18/104**), so it is recorded as behavior evidence only.
- **Next:** #39 remains only on the next-command dispatcher debt; do not fold
  that separate design/implementation work into this owner retirement. The
  refreshed retirement census is **2,657 refs / 33,489 LOC**.

---
## 851 — [bounded MAIN worker, 2026-08-01] typed opponent-faint owner introduced; live field remains pending atomic rebase

- **State:** `ae5e5457`, tree clean. Baseline was green: `npm test` 589
  files / 6,112 passed / 1 skipped and build green; Scene-OFF `bin/oracle
  info` answered. Exact old-field census remains **48** (10 src / 38 tests)
  until the atomic migration.
- **Did:** added immutable `OpponentFaintPresentationOwner` + one-shot
  `OpponentFaintDismissEdge`; it composes the real turn-13 resolution and
  MURKROW switch adapters, and atomically publishes accepted edge, frozen
  cursor, and automatic continuation. New Tier-1 owner tests (3/3) and build
  are green.
- **Next:** wire readiness/producer, rebase every Murkrow continuation anchor
  from the owner edge, then delete the flat field only with all consumers
  migrated; do not touch the dispatcher-family debt.

---
## 850 — [supervisor session open, 2026-08-01 22:40] animation-main folded; #39 item-7 + dispatcher-design lanes launching

- **State:** master `2036472f` (fold of animation-main's 3-commit
  ZIGZAG_SLOW family, additive animation files only). Union full
  `npm test` 589 files / 6,112 passed / 1 skipped + `npm run build`
  green. DEFERRED.md empty. Oracle freshness FAIL on 8014/8012 verified
  as the known false positive: every harness commit after each service
  start touches only `_template/` or the `bin/oracle` CLI wrapper.
- **Plan:** per entry 847 — MAIN lane executes ISSUES #39 item 7
  (`opponentFaintDismissElapsed` → typed owner, brief defers to
  `docs/opponent-faint-dismiss-owner-prep.md`, Terra/max, 75-min cap);
  SIDE lane banks the dispatcher-generalization design dossier
  (13 `TurnN...NextCommandHandoff` census + slice plan, new files only,
  Terra/max). Then dispatcher slices per the dossier.

