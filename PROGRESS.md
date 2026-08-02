# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 857 — [bounded MAIN worker, 2026-08-02] generated Scene-OFF attack-pause receipt regression fixed

- **State:** `ecd00a9c` is the green implementation checkpoint. Full `npm
  test` is **592 files / 6,138 passed / 1 skipped**, `npm run build` exits 0,
  and the focused receipt/projection/reachability set is **360/360**.
- **Did:** `Cmd_attackanimation`'s `HITMARKER_NO_ANIMATIONS` branch now emits
  one immutable `SCENE_OFF_ATTACK_PAUSE` receipt while still calling the real
  `BattleScript_Pausex20`. The generic presenter projects it through the
  existing visual-no-op hold using provenance and `B_WAIT_TIME_SHORT`; option
  initialization, frozen receipts, and dispatcher files are unchanged.
- **Evidence:** `battle-command-generated-off` recovered **70/128 → 128/128**.
  Clean-parent replay preserves all rank-7 charge/strike/selector/send-out
  and delayed captures byte-for-byte (**1,757/1,757 raw comparisons; the
  recorded 1,496-capture acceptance set remains unchanged**). Intro insurance
  is unchanged and retains oracle results **700/751 YOSHI + 715/715**.
- **Next:** resume dispatcher design slice 4: bridge turns 9–13 semantic
  content, including the retained FLY presentation owner; do not cut state,
  render dispatch, or the core ladder yet.
- **Notes:** no unsupported branch/barrier, trace/capture edit, animation,
  mechanics, RNG, turn/tick selector, or dispatcher/adapter change landed.

---
## 856 — [bounded MAIN worker, 2026-08-02] dispatcher slice 3 Pidgeotto content bridge landed

- **State:** `2820689e` is the green implementation checkpoint. Full `npm
  test` is **592 files / 6,137 passed / 1 skipped**; `npm run build` exits
  0; the focused bridge set is **301/301**.
- **Did:** added immutable semantic `FightCommandPresentation` content for
  turn-5–8 latest receipts: Pidgeotto field snapshots, real bounce/kickoff
  anchors, and staged FEATHER_DANCE/ROCK_SLIDE/BIND text/effect facts. The
  legacy turn-keyed renderer and core reopen ladder remain the production
  route; no PP tuple selects content.
- **Evidence:** an isolated clean-parent `103b0abe` app replay is raw-RGBA
  byte-identical over the required untouched windows: **3,527/3,527**
  captures across turn-5 primary, turn-6–8 menu/action, and turn-9 OFF
  readers. Tier-1 shadow pins compare each bridge to the legacy field,
  drawTurn6–8 bounce, and available move/text inputs.
- **Next:** execute dispatcher design slice 4: bridge turns 9–13 semantic
  content, including the retained FLY presentation owner; do not cut state,
  render dispatch, or the core ladder yet.
- **Notes:** handoff census before/after is unchanged: **13** declarations,
  **13** state fields, **13/13** FIGHT/PP positional parameters, and **289**
  literal assignments. Turn 8 deliberately leaves its turn-9 continuation
  `upcoming: null`; its high-chain move/text content is Slice 4 scope, not a
  PP- or turn-keyed fallback.

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
