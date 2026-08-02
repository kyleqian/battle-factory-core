# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 854 — [bounded MAIN worker, 2026-08-01] dispatcher slice 2 shadow latest and PP equivalence landed

- **State:** `7521d5ae` is the green implementation checkpoint. Full `npm
  test` is **591 files / 6,132 passed / 1 skipped**, `npm run build` exits 0,
  and the focused slice/state set is **438/438**.
- **Did:** core now publishes an additive `latestCompletedCommandHandoff`
  shadow alongside every legacy turn 5–13 receipt. The legacy reopen ladder,
  thirteen state fields/parameters, PP renderer route, content dispatch, and
  retained FLY owner remain the only production route. A separate generic PP
  projection proves tuple/slot equivalence without routing production reads.
- **Evidence:** clean-parent `59bec279` app replay is byte-identical for the
  complete slice-1 list: **5,638/5,638 raw RGBA captures across 33 traces**.
  OFF readers remain turn 9 **720**, turn 10 **675**, turn 11 **447**, and
  turn 12 **503**, plus turn12-menu **46**. Tier-1 pins turns 5–13 shadow
  publication, turn 13's **18/20 slot-2 fallback**, and locked/following PP
  precedence.
- **Next:** execute dispatcher design slice 3: introduce the semantic
  Pidgeotto `FightCommandPresentation` content bridge for turns 5–8 only;
  do not cut state/core routing or begin turns 9–13 content.
- **Notes:** handoff census before/after is unchanged: **13** declarations,
  **13** state fields, **13/13** FIGHT/PP positional parameters, and **289**
  literal assignments. No legacy field, import, parameter, or render route
  was deleted or replaced.

---
## 853 — [bounded MAIN worker, 2026-08-01] dispatcher slice 1 uniform receipt contract landed

- **State:** `1e5e81e7` is the green implementation checkpoint. Full `npm
  test` is **591 files / 6,127 passed / 1 skipped**, `npm run build` exits 0,
  and the focused generic/adapter equivalence set is **58/58**.
- **Did:** added immutable `LatestCompletedCommandHandoff` values and additive
  turn 5–13 normalizers. Turns 5–12 copy their legacy tuple/slot/readiness;
  turn 13 builds canonical PP **[0,19,18,10]** from its resumed
  DRAGON_BREATH rules context, with slot 2 equal to the legacy **18/20**
  receipt. State, renderers, core reopen logic, content dispatch, the retained
  FLY owner, and the fresh opponent-faint presentation owner are unchanged.
- **Evidence:** `HEAD^..HEAD` changes only imports, additive exports, and
  tests, so the slice-plan cheap differential applied. One unchanged-list
  window per turn plus the full turn-13 trio is byte-identical to the clean
  parent: **1,474/1,474 raw RGBA captures**.
- **Next:** execute dispatcher design slice 2: shadow the verified generic
  latest receipt and prove generic PP equals the legacy PP path; delete no
  legacy fields/imports and change no render route.
- **Notes:** handoff census before/after is unchanged: **13** declarations,
  **13** state fields, **13/13** FIGHT/PP positional parameters, and **289**
  literal assignments. No conflict with the post-design opponent-faint
  landing: its typed owner remains intact and outside this value contract.

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
