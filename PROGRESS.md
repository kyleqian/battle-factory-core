# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 859 — [bounded MAIN worker, 2026-08-02] dispatcher slice 5 generic-guard checkpoint

- **State:** `3dda38b6` is the first green slice-5 checkpoint. Full `npm test`
  is **592 files / 6,142 passed / 1 skipped**; `npm run build` and `npx tsc
  --noEmit` exit 0.
- **Did:** the live turn 5–13 route now consumes immutable generic reopen
  guards, atomically installs successors, projects PP from the generic owner,
  and routes drawTurn6–15 only from semantic bridge content. The retained FLY
  owner/segment identity remains a hard invariant.
- **Evidence:** focused generic handoff and FIGHT suites are green; the
  representative Scene-OFF turn-6 replay is **44/44** against the oracle.
- **Next:** delete the nine turn 5–13 state fields, their compatibility locals,
  and the retired renderer/core fallbacks; retain the four early fields plus
  positional renderer/PP parameters through slice 10.
- **Notes:** this checkpoint intentionally still has the nine legacy state
  fields only as inert compatibility shape; production neither publishes nor
  consumes them. No trace/capture edits, animation, barrier, PP selector, or
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
