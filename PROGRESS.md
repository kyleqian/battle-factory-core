# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 382 — Gate-3 STATUSANIMATION receipt/suppression integrated

- **State:** S10 Gate 3 remains open with **25** source-safe opcodes and a
  typed but production-unwired status-preparation/rules port.
- **Did:** added only `STATUSANIMATION` (opcode **100 / 0x64**): idle resolves
  one u8 selector, then the rules port returns the exact frozen primary-status
  receipt or suppression; emission marks pending, suppression emits nothing,
  and both advance two source bytes. Busy identity-blocks.
- **Next:** choose another bounded source family only when its complete rules
  context is explicit. Keep status application, substitute/semi-invulnerable/
  hit-marker ownership, RNG/damage/turn logic, controller bytes, visual
  animation/timing, Scene ON, PP policy, and other opcodes out.
- **Notes:** exact supported IDs are
  **10/16/17/18/20/37/38/39/40/57/58/60/61/62/65/83/84/85/86/98/100/111/131/141/248**.
  All **13** starts/widths are pinned. OFF mechanicLab: Toxic miss/no-status
  **151 captures**; successful Toxic→`0x80` with command-27 suppression
  **102/102 semantic captures**. Focused **103/103**; Tier-1 **122 files /
  1627 tests**, build, and Scene-OFF oracle contract green. Pixel diff N/A.
