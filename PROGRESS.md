# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 855 — [bounded MAIN worker, 2026-08-02] Issue #56 frame-444 particle stall RAM fix landed

- **State:** `1aa13ebb` is the green implementation checkpoint. Full `npm
  test` is **592 files / 6,134 passed / 1 skipped**, `npm run build` exits 0,
  and the focused particle-age pin is **2/2**.
- **Did:** the generated Scene-OFF particle age is now an exported, hermetic
  helper. Arbitrary generated opponent releases publish the shared stall at
  logical tick 13; the audited canonical-anchor route retains its required
  lag 1 through the existing route fact. No affine, display-tail/latch,
  dispatcher, animation, trace, or other particle caller changed.
- **Evidence:** dense YOSHI 440:450 remains **10/11**, but frame 444 shrank
  **219px → 18px**. Pre/post app replay changes exactly **201px** at 444;
  frames 440–443 and 445–450 are byte-identical. Full YOSHI remains
  **700/751** and canonical generated-intro insurance is **715/715**.
- **Next:** resume dispatcher design slice 3: introduce the semantic
  Pidgeotto `FightCommandPresentation` content bridge for turns 5–8 only;
  do not cut state/core routing or begin turns 9–13 content.
- **Notes:** the remaining 18 frame-444 pixels are the settled #5/#61
  display-tail class and were not chased. The optional post-intro
  `battle-command-generated-off` canary currently reports **70/128** from
  frame 68 on this branch; this particle release path is unreachable from
  that staged checkpoint, so the required insurance used the exact 715-frame
  intro window instead.

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
