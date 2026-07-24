# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 386 — FLY terrain occlusion closes the last excluded charge frames

- **State:** S10 remains open; animation coverage is now **11 exact / 3
  partial / 262 unsupported**. FLY is exact in both legal orientations and
  the canonical Scene-ON window; ISSUES #34 is removed.
- **Did:** added an optional bottom clip to the generic affine-sprite blitter
  and reused the already-evidenced opponent terrain cutoff in the canonical
  layered FLY path. No affine table, sampler equation, move outcome, status,
  PP, RNG, controller rule, or absolute-tick branch changed.
- **Next:** continue the Level-50 animation queue with DRAGON_BREATH while the
  OFF lane extends the source-shaped rules context by a fully evidenced
  family. DIVE still needs independent dense evidence.
- **Notes:** canonical FLY charge/miss **213/213**; portable opponent
  **151/151 + 248/248** and player **147/147 + 244/244**, all with zero
  exclusions. Focused animation tests **304/304**, Tier-1 and build green in
  the lane. Fresh Bounce outcome probes changed on the refreshed Mechanics
  Lab even on the untouched base, so no animation claim or policy change was
  made from those outcomes. Commit `4b9cd44`.

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
