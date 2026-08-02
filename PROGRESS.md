# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 860 — [bounded MAIN worker, 2026-08-02] dispatcher slice 6 Turn-1 generic fold

- **State:** `04bc1092` carries the optional typed epoch/content checkpoint;
  `cbb41421` is the green field-cut checkpoint. Full `npm test` is **592 files
  / 6,144 passed / 1 skipped**; `npm run build` and `npx tsc --noEmit` pass.
- **Did:** Turn 1 now publishes the generic completed-command owner at the
  HandleInputChooseAction → DoBounceEffect reset (epoch 1308, HP 117/101,
  seeds 192/128). Production core, rendering, PP projection, and the turn-2
  link consume that content; B-close/A-reopen preserves it. The retired Turn-1
  scene field is gone while turns 2–4 retain their staged ABI.
- **Evidence:** clean-parent `04bc1092` raw-RGBA replay is **1,395/1,395**:
  required turn-1/2 windows **1,162/1,162** plus turn-9 reader **233/233**.
  `battle-command-generated-off` is **128/128** vs the Scene-OFF oracle.
  Census state/initial/copy **4→3**; test literals **202→194**; declarations
  and staged FIGHT/PP parameters remain **13**.
- **Next:** Slice 7 — fold Turn 2 epoch/content onto the same generic owner;
  leave Turns 3–4 and final positional ABI deletion for their planned slices.
- **Notes:** no trace/capture-list edits, recording import, PP/turn selector,
  animation, unsupported-branch barrier, or ON-profile work.

---
## 859 — [bounded MAIN worker, 2026-08-02] dispatcher slice 5 production cut

- **State:** `5c8eb38c` is the second green slice-5 checkpoint. `npm test` is
  **592 files / 6,142 passed / 1 skipped**; `npm run build` and `npx tsc
  --noEmit` exit 0.
- **Did:** generic semantic content and immutable reopen guards are now the
  production turn-5–13 route. Core atomically installs each successor/retained
  FLY owner; the nine legacy state fields, copies, publications, and renderer
  fallbacks are gone. Turns 1–4 and the staged 13 renderer/PP parameters/types
  remain untouched for later slices.
- **Evidence:** clean-parent app replay is **5,638/5,638** raw captures across
  all 33 slice-1 windows; generated Scene-OFF is **128/128**; changed terminal
  rungs are **255/255**, **147/147**, **255/255**, **118/118**. Census:
  state/initial/copy **13→4**, type declarations and FIGHT/PP parameters remain
  **13**, test literal assignments **289→202**.
- **Next:** Slice 6, fold the turn-1 epoch/content into the generic owner;
  preserve the remaining early-turn invariants and staged ABI.
- **Notes:** no trace/capture edits, animation, barrier, PP tuple selector, or
  completed-turn selector landed.

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
