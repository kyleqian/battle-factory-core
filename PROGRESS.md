# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1056 — [MAIN worker, 2026-08-09] **#87 wake-up print-table selector closed**

- **State:** committed source-generic repair is green: full suite **831 files /
  8,236 passed / 1 skipped**, production build, smoke **375/375**, and vanilla
  **0:20 = 20 OK / 0 CRASH / 0 HANG**.
- **Did:** source audit proved `AtkCanceler_UnableToUseMove` writes the ordinary
  wake row (0) or Uproar row (1) for `gWokeUpStringIds` before handing
  `BattleScript_MoveUsedWokeUp` to `printfromtable`, with no RNG draw. The
  typed canceler loop now durably projects every phase-owned selector receipt;
  Tier-1 coverage red-proved both wake rows and their real full-turn message.
- **Next:** #86 remains the separate seed-27 no-command boundary at **b4 t16
  f71106**; keep its fatal invariant intact while diagnosing its reducer shape.
- **Notes:** seed 18 is now **OK b3 t18 f53730 roundLost**; seed 16 remains
  **OK b2 t51 f48250**, while seed 27 reproduces unchanged. Unknown
  `printfromtable` table/opcode guards remain fatal; no animation, Gate-6, or
  canonical Battle-2 work changed. Commits `2798e6d3`, `36d5873f`.

## 1055 — [supervisor, 2026-08-09] **Contact family and Fire Spin folded; union green**

- **State:** master union is green: full suite **831 files / 8,234 passed / 1
  skipped**, production build, Gate-6/animation focused **24/24**, and smoke
  **375/375**. Vanilla remains **0:20 = 20 OK / 0 CRASH / 0 HANG**.
- **Did:** accepted the hard-constrained **94/94** contact-route family and one
  fresh Battle Scene OFF Static receipt (`808ec4fc`, merge `e053b6ac`). Every
  candidate reaches target `datahpupdate` and `MOVEEND_ON_DAMAGE_ABILITIES`;
  Bide keeps its charge-only alternative, with zero exceptions/blockers.
  Corrected the receipt ledger to five non-Static contact gaps (`79fba9a1`).
  Folded `animation-main` through Fire Spin `bb38d12d` as `379d05de`.
- **Next:** close #87's source-selected `MoveUsedWokeUp` print-table boundary,
  then #86's separate seed-27 no-command boundary. Rerun full-policy 0:60
  after the next controller/string repair and use its completion headline.
- **Notes:** contact overlaps the already promoted Color Change rows, so unique
  hook gaps stay **111 ability / 300 item**. Static is the one direct contact
  witness; the other five contact outcomes retain explicit receipt gaps. No
  canonical Battle-2 window past tick 33331 or unsupported-barrier pin moved.

## 1054 — [MAIN worker, 2026-08-09] **#86 seed-16 forced-handoff owner repaired**

- **State:** committed fix `59c0182a` is green: full suite **829 files /
  8,229 passed / 1 skipped**, production build, smoke **375/375**, and vanilla
  **0:20 = 20 OK / 0 CRASH / 0 HANG**.
- **Did:** typed faint messages now retain their source battler. A pending
  forced selector opens only on that requested battler's faint dismissal, so
  seed 16 presents PHANPY's automatic opponent `1 -> 2` switch before
  sandstorm's later QUILAVA faint and player selection. The fatal party-change
  invariant is unchanged; red-verified Tier-1 coverage pins the two-faint
  ordering.
- **Next:** #86 retains seed 27's distinct no-command boundary (`b4 t16
  f71106`). #87 separately records seed 18's MoveUsedWokeUp source-string
  boundary (`b3 t9 f37531`); choose either bounded source mechanism next.
- **Notes:** seed 16 is `OK b2 t51 f48250 roundLost`; 12/14/23/44/45/53 all
  retain their green endpoints. No canonical Battle-2 window, animation, or
  Gate-6 artifact changed; no unsupported-barrier pin moved.
