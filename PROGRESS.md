# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1038 — [bounded MAIN worker, 2026-08-09] **#84 forced opponent switch presentation complete**

- **State:** #84 is closed. Gate 6 stays **23/24** OFF-profile receipts; R2
  remains the separate final compact-receipt upgrade.
- **Did:** `B_SCR_OP_RETURNTOBALL` now emits controller-owned typed recall
  visibility, and generic resolution projects its 32-frame switch-out before
  the existing opponent switch-in chain. Opponent open-ball frames now retain
  the simultaneous elevated, affine, ball-tinted incoming mon; voluntary
  player recall/send-out behavior remains unchanged.
- **Next:** let the supervisor select the next Gate-6/Main increment. Do not
  resume canonical Battle 2.
- **Notes:** twice-fresh legal BUTTERFREE WHIRLWIND vs MURKROW OFF evidence is
  byte-identical across dense frames 210..420; GROVYLE proves the elevated
  incoming overlap. Focused force-switch/orchestrator/render checks are
  **406/406**, smoke **375/375**, full suite **814 files / 8,151 passed / 1
  skipped**, and production build green.
  No barrier/import pin, rule/RNG, party/HP/status, or completeness guard changed.

## 1037 — [bounded MAIN worker, 2026-08-09] **#84 opponent send-out origin repaired**

- **State:** `d02a46f5` fixed opponent-side routing and origin, but item (1)
  remained presentation-incomplete: its open ball still returned before
  drawing the simultaneously materializing incoming mon. Item (3)'s
  WHIRLWIND recall/send-out seam also remained. Gate 6 stayed **23/24**.
- **Did:** reproduced the generated opponent replacement through the public
  resolution renderer. The typed switch-in projection now preserves battler
  side, ball origin/pose, and healthbox owner: opponent replacements stay at
  `(176,64)` while player replacements retain the `(24,68)` throw arc.
- **Next:** completed by entry 1038's overlap and generic forced-recall repair.
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
