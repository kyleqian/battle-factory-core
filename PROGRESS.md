# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 379 — Selected-battler controller lifecycle consolidated

- **State:** S10 Gate 3 remains open with **21** source-safe opcodes and an
  unwired immutable controller/scheduler/rules/RNG/source-context seam.
- **Did:** replaced the duplicated `PLAYFAINTCRY`,
  `HIDEPARTYSTATUSSUMMARY`, and `MAKEVISIBLE` lifecycle with one local,
  strongly typed helper. It alone validates one u8 selector, resolves or
  blocks/halts, activates and marks the battler pending, freezes the
  command-specific event, and advances once; exact payloads are unchanged.
- **Next:** choose another bounded source family only when its complete rules
  context is explicit. Keep presentation, raw controller bytes, rules/RNG,
  PP, turn/round state, and other opcodes out.
- **Notes:** exact supported IDs remain
  **16/17/18/20/37/38/39/40/57/58/60/61/62/65/84/85/86/98/111/131/141**.
  Command-focused **34/34**; Tier-1 **119 files / 1597 tests**, build, and
  Scene-OFF oracle contract green. Pixel/oracle diff is N/A for this semantic
  refactor; all existing command-specific authoritative tests remain intact.

---
## 378 — Gate-3 HIDEPARTYSTATUSSUMMARY controller command integrated

- **State:** S10 Gate 3 remains open with **21** source-safe opcodes and an
  unwired immutable controller/scheduler/rules/RNG/source-context seam.
- **Did:** added only `HIDEPARTYSTATUSSUMMARY` (opcode **98 / 0x62**):
  resolves its required u8 selector through the typed
  `GetBattlerForBattleScript` port, activates/marks that battler pending,
  emits one frozen `hide-party-status-summary` event, and advances one
  instruction/two source bytes without an idle guard.
- **Next:** choose another bounded source family only when its complete rules
  context is explicit. Keep tray sprite allocation/destruction, blend/task
  timing, shown state, presentation/pixels, waitstate, raw controller bytes,
  rules/RNG/PP, and other opcodes out.
- **Notes:** exact supported IDs are
  **16/17/18/20/37/38/39/40/57/58/60/61/62/65/84/85/86/98/111/131/141**.
  Focused **87/87**; Tier-1 **119 files / 1597 tests**, build, and Scene-OFF
  oracle contract green. All four starts and both selector forms are pinned;
  acknowledgement represents receipt/task kickoff, not tray completion.

---
## 377 — Gate-3 MAKEVISIBLE controller command integrated

- **State:** S10 Gate 3 remains open with **20** source-safe opcodes and an
  unwired immutable controller/scheduler/rules/RNG/source-context seam.
- **Did:** added only `MAKEVISIBLE` (opcode **111 / 0x6f**): resolves its
  required u8 selector through the typed `GetBattlerForBattleScript` port,
  activates/marks that battler pending, emits one frozen
  `set-battler-sprite-visibility` event with `invisible: false`, and advances
  one instruction/two source bytes.
- **Next:** choose another bounded source family only when its complete rules
  context is explicit. Keep `RETURNTOBALL`, sprite presence/allocation,
  persistent visibility, teardown, presentation timing, rules/RNG/PP,
  animation, pixels, and other opcodes out.
- **Notes:** exact supported IDs are
  **16/17/18/20/37/38/39/40/57/58/60/61/62/65/84/85/86/111/131/141**.
  Focused **90/90**; Tier-1 **118 files / 1584 tests**, build, and Scene-OFF
  oracle contract green. All five evidence starts are pinned; only the three
  MAKEVISIBLE starts execute, while both RETURNTOBALL starts remain excluded.
