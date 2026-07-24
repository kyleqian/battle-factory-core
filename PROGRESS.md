# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 376 — Gate-3 PLAYFAINTCRY controller command integrated

- **State:** S10 Gate 3 remains open with **19** source-safe opcodes and an
  unwired immutable controller/scheduler/rules/RNG/source-context seam.
- **Did:** added only `PLAYFAINTCRY` (opcode **86**): resolves its required u8
  selector through a typed `GetBattlerForBattleScript` port, activates/marks
  that battler pending, emits one frozen faint-cry event, and advances once.
- **Next:** choose another bounded source family only when its complete rules
  context is explicit. Keep waitcry, faint animation, playback/pan/duration,
  species audio, rendering, PP, rules/RNG, and other opcodes out.
- **Notes:** exact supported IDs are
  **16/17/18/20/37/38/39/40/57/58/60/61/62/65/84/85/86/131/141**. Focused
  **78/78**; Tier-1 **117 files / 1572 tests**, build, and Scene-OFF oracle
  contract green; all six starts and four selector forms are source-pinned.

---
## 375 — Gate-3 PLAYSE/FANFARE controller family integrated

- **State:** S10 Gate 3 remains open with **18** source-safe opcodes and an
  unwired immutable controller/scheduler/rules/RNG/source-context seam.
- **Did:** added only `PLAYSE`/`FANFARE` (opcodes **84/85**): each resolves one
  u16 song plus attacker, selects/marks that battler pending, emits one
  distinct frozen semantic event, and advances without a local idle or
  playback-duration gate. Existing acknowledgement clears command receipt.
- **Next:** choose another bounded source family only when its complete rules
  context is explicit. Keep playback, pan/duration/BGM, presentation, PP,
  rules/RNG, generic pointers, and unrelated opcodes out of this seam.
- **Notes:** exact supported IDs are
  **16/17/18/20/37/38/39/40/57/58/60/61/62/65/84/85/131/141**. Focused
  **67/67**; Tier-1 **116 files / 1561 tests**, build, and Scene-OFF oracle
  contract green; all seven catalogued starts and controller acknowledgement
  are pinned with no audio or pixel claim.
