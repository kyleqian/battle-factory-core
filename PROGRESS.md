# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 385 — Gate-3 MOVEVALUESCLEANUP production context integrated

- **State:** S10 Gate 3 remains open with all **27** source-safe opcodes now
  executable through the single durable production rules context.
- **Did:** extended that context with exactly opcode 37's five source `u8`
  move-value fields, centralized its hit-marker constants, and composed the
  existing generic cleanup handler. Construction/deep freeze, exact resets,
  unrelated nested identity, deterministic repetition, and status behavior
  before/after cleanup are production-context pinned.
- **Next:** extend this one context only for the next completely evidenced
  rules family. Keep attack cancellation, accuracy, damage, PP, status
  application, moves, turn/round state, presentation, and core wiring out.
- **Notes:** cleanup preserves every field except its exact five resets and
  hit-marker bits **6/14**; multi-hit/status behavior is unchanged. Focused
  **25/25**; Tier-1 **126 files / 1665 tests**, build, OFF info, fresh Toxic
  and Confuse Ray zero-PP-Up assertions, and diff check green. Commit
  `5e4a18b`; pixel diff N/A.

---
## 384 — Gate-3 status-animation production rules context integrated

- **State:** S10 Gate 3 remains open with **27** source-safe opcodes; opcodes
  100–102 now have the first durable source-shaped production rules/port
  bundle instead of test-only live-status fixtures.
- **Did:** added a deeply frozen four-battler context with only
  `status1/2/3`, substitute HP, attacker/effect role bindings, global hit
  marker, and multi-hit counter; centralized source constants; implemented
  exact supported selector resolution and live/masked/explicit preparation;
  composed named handler/execution/ack seams without replacing generic ports.
- **Next:** extend this one context only for the next completely evidenced
  rules family. Defer the other `GetBattlerForBattleScript` cases until their
  roles/positions are explicit; keep status application, move-value cleanup
  fields, PP/damage/RNG/turn state, controller timing, and presentation out.
- **Notes:** production composition covers the **26** controls/source/multi-hit
  IDs whose context is now honest; generic opcode 37 remains reusable but
  intentionally uncomposed until its additional fields land. Fresh OFF labs
  prove Toxic `status1 0→0x80` and Confuse Ray status2/confusion `0→4`, both
  PP **10→9**, all PP Ups zero. Focused **80/80**; Tier-1 **125 files / 1658
  tests**, build, oracle info, both manifests, and diff check green. Commit
  `a937987`; pixel diff N/A.

---
## 383 — Gate-3 status-animation family integrated

- **State:** S10 Gate 3 remains open with **27** source-safe opcodes and one
  generic, rules-owned, read-only status-animation preparation seam.
- **Did:** refactored opcode 100 onto frozen `live-status1` requests and added
  `STATUS2ANIMATION`/`CHOSENSTATUSANIMATION` (**101/102**): exact idle/operand/
  selector gates, masked-live versus explicit/raw-u8 requests, validated
  receipts, fixed suppression/advance, and pending/ack bookkeeping.
- **Next:** choose another bounded source family only when its complete rules
  context is explicit. Keep live status/suppression reads in rules; keep
  status mutation, PP policy, RNG/effects, controller bytes, visuals/timing,
  Scene ON, and pixels out.
- **Notes:** exact supported IDs are
  **10/16/17/18/20/37/38/39/40/57/58/60/61/62/65/83/84/85/86/98/100/101/102/111/131/141/248**.
  All **13+5+2** starts/widths are pinned. Fresh OFF Confuse Ray lab evidence
  proves zero PP Ups, PP **10→9**, and stock-created status2/confusion **0→4**.
  Focused **141/141**; Tier-1 **123 files / 1640 tests**, build, oracle info,
  lab manifest check, and diff check green. Pixel diff N/A.
