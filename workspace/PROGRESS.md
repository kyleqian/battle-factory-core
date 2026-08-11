# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1138 — [MAIN worker, 2026-08-11] **Generated BattleIntroSlide3 reveal exact**

- **State:** implementation `5bb791b6` owns LOGO_WAVE's source-relative
  retained-black callback and the complete generated scene reveal is exact.
  S8 stays closed; Battle 2 remains stopped at tick 33331.
- **Did:** committed `win-go-on-battle2-scene-assembly-reveal-off`
  **154/154 twice fresh** (11557–11710: black callback, reveal, trainer
  convergence, settled plateau). Re-held transition **249/249**, generated
  send-out **238/238**, action-ready **3/3**, legacy assembly **256/256**, and
  far-side LILIANA **115/115**.
- **Next:** choose one complete source-owned status-summary/message phase after
  11710 and before 13385; diagnostic 11711–11812 is exact **102/102** but ends
  mid-phase. Do not submit a Battle-2 action or resume the retired march.
- **Notes:** two trainer/index identities (0/5) and healthy/status/fainted
  summaries are render-pure and leave RNG, rules/controller, parties, and
  outcomes unchanged. Focused **33/33**, smoke **375/375**, typecheck, full
  `npm test` **948 files / 8,761 passed / 1 skipped**, build **643 modules**.

## 1137 — [supervisor, 2026-08-11] **Transition verified; Rust M1/M2 folded**

- **State:** `master` is green with the generic nonzero-index LOGO_WAVE seam
  and `rust-main` through `303a8a4a`. S8 remains closed; the canonical
  Battle-2 march remains stopped at tick 33331.
- **Did:** independently reverified the new complete OFF transition at
  **249/249**, focused **72/72**, and smoke **375/375**. Folded Rust M1/M2:
  hand-rolled ABI v1, WASM loader, and dual-engine RNG adapter/spec.
- **Next:** close a bounded generated scene-assembly/status-summary window
  between the exact black handoff and exact generated send-out, using frozen
  battleStart data rather than trainer/battle/tick branches. Do not submit a
  Battle-2 action.
- **Notes:** union gates: WASM differential **73/73**, Cargo **9/9**, full
  `npm test` **948 files / 8,759 passed / 1 skipped**, production build **643
  modules**. #55 remains null/unwired; no material decision is deferred.

## 1136 — [MAIN worker, 2026-08-11] **Generic RNG-selected Frontier transition exact**

- **State:** implementation `422e4e29` owns the live Factory transition draw
  and renders its source-selected LOGO_WAVE; the tree is fully green. S8
  remains closed and Battle 2 stays stopped at tick 33331.
- **Did:** committed dense `win-go-on-battle2-transition-complete-off`
  **249/249** twice fresh (11308–11556). Re-held room-dismiss **30/30**,
  black **43/43**, generated intro **238/238**, action-ready **3/3**, far-side
  LILIANA **115/115**, and shared `battle2-transition` **249/249**. Focused
  **72/72**, smoke **375/375**, typecheck, full `npm test` **947 files / 8,686
  passed / 1 skipped**, and production build are green.
- **Next:** continue only with the remaining generated scene-assembly/status-
  summary seam before the exact generated send-out; do not submit a Battle-2
  action or resume the retired canonical march.
- **Notes:** selection is one source `Random()%12` call stored as immutable
  presentation state; rendering is RNG-pure and no trainer/battle/turn/tick
  production key was added. #55 and its construction clock are untouched.
