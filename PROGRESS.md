# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1037 — [bounded MAIN worker, 2026-08-09] **#84 opponent send-out side repaired**

- **State:** #84 item (1) is removed; only item (3)'s WHIRLWIND opponent
  recall/send-out seam remains. Gate 6 stays **23/24** OFF-profile receipts.
- **Did:** reproduced the generated opponent replacement through the public
  resolution renderer. The typed switch-in projection now preserves battler
  side, ball origin/pose, mon and healthbox owner: opponent replacements stay
  at `(176,64)` while player replacements retain the `(24,68)` throw arc.
- **Next:** repair #84 item (3)'s generic WHIRLWIND recall/send-out sequence.
  Do not resume canonical Battle 2.
- **Notes:** fresh legal complete-party OFF evidence captures frames 470..630
  densely; MACHOP proves the fix is species-independent. Full suite **813
  files / 8,147 passed / 1 skipped** and build green. No unsupported barrier,
  canonical import, rules/RNG, completeness guard, or ratchet pin changed.

## 1036 — [supervisor, 2026-08-09] **Status cadence and R9 receipt accepted**

- **State:** #84 now has two presentation defects left: the wrong-side
  opponent ball and the WHIRLWIND recall/send-out jump. Gate 6 advanced
  **22→23/24** OFF-profile receipts; R2 is the final compact-receipt upgrade.
- **Did:** accepted `cab909f8`'s source-provenance `waitmessage` execution for
  TAUNT/TORMENT/TOXIC and merged `29190849`'s twice-fresh legal Swagger item
  receipt as `edd32963`. Lum consumes and cures confusion while preserving
  +2 Attack; White Herb remains held with +2 Attack and confusion.
- **Next:** repair #84's wrong-side opponent send-out ball, then the generic
  WHIRLWIND opponent recall/send-out seam. Run R2 in the disjoint side lane.
- **Notes:** supervisor cadence checks are **4/4** and R9 receipt/kernel/
  manifest checks are **59/59**. Worker full suites are **8,143** and
  **8,144** passed with one skip each; both builds pass. No barrier/import pin
  changed. The final union build is still required after the next pair.

## 1035 — [bounded MAIN worker, 2026-08-08] **#84 status-message cadence repaired**

- **State:** #84 items (2) and (4) are removed; only item (1)'s wrong-side
  opponent ball and item (3)'s WHIRLWIND recall/send-out seam remain. Gate 6
  stays **22/24** OFF-profile receipts.
- **Did:** fresh dense OFF evidence separated text typing, the 64-frame source
  `waitmessage`, Scene-OFF attack/status controller spans, and subsequent
  dispatch. The generic round resolution now derives a direct following
  `B_SCR_OP_WAITMESSAGE B_WAIT_TIME_LONG` from immutable print-event program
  provenance. Public lifecycle tests pin the first formerly-wrong post-typing
  edge and all 64 hold ages for legal TAUNT/TORMENT and TOXIC sibling routes.
- **Next:** repair #84 item (1)'s opponent ball side, then item (3)'s
  WHIRLWIND recall/send-out presentation. Do not resume canonical Battle 2.
- **Notes:** focused presentation/orchestrator/ratchet **89/89**, smoke
  **375/375**, and full suite **812 files / 8,143 passed / 1 skipped**; build
  green. No unsupported barrier, canonical recording import, rules/RNG/event,
  fatal completeness, or fatal status-handoff guard changed.
