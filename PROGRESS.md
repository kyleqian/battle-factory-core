# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1050 — [supervisor, 2026-08-09] **#85 closed; Sleep Talk animation fold green**

- **State:** master union is green (**828 files / 8,221 passed / 1 skipped**)
  with production build passing. Vanilla soak stays **20/20 OK**.
- **Did:** accepted the generic display-ledger repair (`909a42a8`) and
  kept-party swap handoff (`72e3fed6`); seed 6 now reaches Battle 2 and seed
  55 reaches Battle 3/`roundLost`. The accepted swap exit is **43/43** exact.
  Folded `animation-main` through `ba48a24f` as merge `e7595c81`; Sleep Talk
  gains a typed Scene-ON reducer/seam but truthfully remains unsupported.
- **Next:** follow the user-ordered family-level Gate-6 worklist. Keep ISSUES
  #86's forced-switch and string-resolver failures fatal and separately
  reproducible for the close-out soak pass.
- **Notes:** no canonical Battle-2 work moved past tick 33331. No open
  deferred question. Full-policy 0:60 must be rerun at wind-down for the new
  completion headline after #85 removed all 21 former swap hangs.

## 1049 — [MAIN worker, 2026-08-09] **#85 `factorySwap:complete` stall closed generically**

- **State:** master green (827 files / 8,216 passed / 1 skipped). Vanilla
  soak 0:20 is **20/20 OK**; no HANG. The accepted-exit compare is **43/43**
  byte-exact frames.
- **Did:** reproduced seeds 6 and 55 through the real
  `createInitialState`/`tick`/button path. Both reached a completed kept-party
  swap with the source field handoff set while the generated round still
  awaited a swap offer; the driver was not at fault. `factorySwapRoundDecision`
  now exposes a typed decline only at that completed handoff, so the existing
  generic round bridge heals/preserves the party, advances the round, and
  publishes Battle 2 without changing accepted mutation or presentation
  timing. Added red Tier-1 coverage for accepted and kept-party ownership
  expiry. Declared the existing compare trace's canonical route; no fixed
  window, seed, battle, turn, species, or fatal-invariant weakening.
- **Next:** ISSUES #86's downstream generated battle string/switch-transition
  signatures; continue the ROADMAP S10 family-level Gate-6 sequence.
- **Notes:** seed 6: `CRASH b2 t13 f26280`, unsupported
  `{B_EFF_NAME_WITH_PREFIX}` in `STRINGID_PKMNFELLASLEEP`; seed 55: `OK b3
  t13 f50980 roundLost`. Smoke 375/375; focused swap/route tests 70 + 2;
  full suite and build green. Commits `72e3fed6`, `ee408ab6`; #85 deleted
  from `ISSUES.md`.

## 1047 — [interactive user session, 2026-08-09] **User decisions: #85 first; Gate-6 evidence goes family-level**

- **State:** master green (827 files / 8,213 tests, ~47 s full suite).
  Decisions recorded in the ROADMAP S10 block.
- **Did:** the user ruled the 561-gap hook census closes at FAMILY
  granularity (one receipt per effect/hook family + Tier-1 sibling batch
  checks; per-gap receipts only on divergence), receipt hygiene is advisory
  (worker TIME, not repo weight, is the constraint), and the sequencing is
  #85 -> family-level Gate 6 -> close-out -> playable-round milestone ->
  then schedule S11.
- **Next:** ISSUES #85 — displayed-HP ledger drift (`npm run soak -- --seed
  0`), handoff invariant (`--seed 6`), factorySwap stall (`--seed 55`).
  Then re-soak and burn the battles-2-7/postwin wave.
- **Notes:** vanilla soak 0:20 must stay 20/20 at every wind-down (ROADMAP
  gate). Report full-policy completions/60 as the session headline number.

---
