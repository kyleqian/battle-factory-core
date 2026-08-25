# Rust lane progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`RUST_PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## R53 — [supervised session, 2026-08-25] **M52 CheckViability tie-receipt repair + green checkpoint**

- **State:** `rust-main` = merged master `33592cba`, verified ORWORD worker
  `bb3c5ab7`, and verified CheckViability repair `de052e3c`. Rust now retains
  the SemiInvulnerable5 speed-tie draw before its TryEncourage draw, matching
  canonical TypeScript. The previously skipped forced-WASM parity case is
  active. The session remains active, committed, and green.
- **Did:** changed the M5d3 handler to append the encourage receipt to the
  existing draw ledger instead of replacing that ledger. Added direct native
  assertions for zero-, one-, and two-draw paths, ordered ordinals, and RNG
  before/after chaining; regenerated the 181-case M5d3 corpus; and removed the
  stale skip from the existing M2 parity test. Corpus sha256
  `bcd17a59b071e204bc80b9880e2ee2580fdb7c802af23800d8f7cc54995ac30b`.
- **Next:** select one more conflict-free pure Battle Script leaf while the
  deadline reserve permits. Main owns removal of ISSUE #124 from `ISSUES.md`;
  this lane must not edit that ledger.
- **Notes:** Terra/max worker, one commit. Supervisor audited the narrow write,
  reproduced the generated corpus twice byte-identically, and passed focused
  native and both-mode parity gates (**9/9** each). Full Rust passes at **1,042
  listed tests**; fmt, required strict library Clippy, and wasm32 release pass.
  Artifact is **506,010 bytes**, sha256
  `e7ec069fddf1d9c0c4a3dfcf0a470a6f1b6d5f3dec47612d6d9224dd6185e028`.
  Pre-fold npm is green at **1,121 files / 10,457 passed / 223 skipped** and
  build is green. Scope stayed inside `core-rs/**` plus the existing M2 parity
  file; no unsupported barrier or Rust deferral was added. PAPERCUT: the
  nested Rust workspace needs the manifest directory for `cargo fmt`, ~1 min;
  copying the rebuilt ignored WASM artifact is a separate required step, ~2
  min.

## R52 — [supervised session, 2026-08-25] **M51 Battle Script ORWORD leaf + green checkpoint**

- **State:** `rust-main` = merged master `33592cba` plus verified
  `Cmd_orword` worker `bb3c5ab7`. The complete pure
  `battleScriptOrwordOpcode.ts` registration/state/control projection is
  native and wasm32-compilable; no ABI or adapter surface was widened. The
  session is active, committed, and green.
- **Did:** ported the exact 43-start eager registration, first-opcode binding,
  ordered shape/pointer/value validation, the sole `gHitMarker` pointer, all
  11 named HITMARKER terms and compound expressions, unsigned 32-bit OR, and
  advance-only control. Canonical TypeScript execution supplies **66 handler
  cases**, **18 registration cases**, and all **43 concrete program sites**;
  corpus sha256
  `b65a896f9ec084d073fe0fa0459fc07d50ca38968c9fa1edfa31b448e300ce08`.
- **Next:** close main-program ISSUES #124 in Rust: carry the speed-tie draw
  through `factory_ai_check_viability`, regenerate the M5d3 vectors, rebuild
  wasm, and restore the skipped forced-WASM parity case. Keep all edits inside
  `core-rs/**` and the existing M2 adapter-owned parity file only.
- **Notes:** Terra/max worker, one commit. Supervisor audited the decomp
  dispatch/body, nine-byte macro, constants, 43 sites, registration order,
  write boundary, errors, and repetitions; regenerated twice byte-identically
  and independently passed focused **5/5**. Worker and merged-tree full Rust
  gates pass at **1,041 listed tests**, fmt, strict Clippy, and wasm32 release.
  Generated Rust is **568,225 bytes**, sha256
  `4c9217fb59426ad2b2d7be892f64078bf667b4763f182d8eb888f70ab8d78210`;
  generator is **41,540 bytes**, sha256
  `dd6258cb620cc1edff4464945735099fa55b391369e2ec64c6e66b79e4a948ab`.
  Artifact is **506,186 bytes**, sha256
  `f902e75917b8301b8f653c456dd9092ee15f52bc9e21dc32e9a1dae9ebbe5a06`.
  Worker npm is green at **1,121 files / 10,456 passed / 224 skipped** and
  build is green. Scope stayed inside `core-rs/**`; no barrier or Rust
  deferral was added. PAPERCUT: stale ignored WASM artifact caused 399 initial
  parity failures before rebuild, ~5 min.

## R51 — [supervised session, 2026-08-20] **M50 Battle Script Focus Punch no-damage gate + final wind-down**

- **State:** `rust-main` = current master `0dd3f36c` plus verified
  `Cmd_jumpifnodamage` worker `09a1bcc1`. The complete pure
  `battleScriptJumpifnodamageOpcode.ts` registration/state/control projection
  is native and wasm32-compilable; no ABI or adapter surface was widened. The
  session ends committed and green.
- **Did:** ported exact singleton registration and complete Focus Punch shape,
  attacker-first role resolution, ProtectStruct-only physical/special receipt
  reads, nonzero-receipt advance without label lookup, and zero-receipt late
  jump resolution. The command preserves every projected field and ignores the
  same-named SpecialStatus copies. Canonical TypeScript execution supplies
  **131 handler cases** and **16 registration cases**, including every four-
  attacker × 25 signed-i32 receipt-edge combination, shadow-receipt controls,
  ordered errors, malformed shapes, preservation, and repetitions. Corpus
  sha256 `d0972bdc7764a77f4ab75ac3c3e52c91ca845e14a52315a0f2ab5e1defa1e046`.
- **Next:** merge current master at the next Rust session, recheck active work,
  and select another conflict-free pure Battle Script leaf. M7c opponent
  generation still waits on canonical TypeScript live generation; main and
  animation moving targets remain excluded.
- **Notes:** Terra/max worker, one commit. Supervisor audited the decomp
  dispatch/body, source fields, macro, singleton Focus Punch site, registration
  and role/label ordering, no-write boundary, shadow fields, and repetitions;
  regenerated twice byte-identically (canonical corpus **343,093 bytes**;
  generated file **885,070 bytes**, sha256
  `cdf36b8c2fb11bdec08c9ba4d7dabd2a8e2af4bb061bc2e5657380ff999d5a78`;
  generator **48,437 bytes**, sha256
  `70848ab99e69b13bad3715fbe62d2581cf2fa01874848548a90ed878185dc9f1`).
  Focused **10/10**, cargo **1,001/1,001**, fmt, strict Clippy, and wasm32
  release pass. Artifact is **492,691 bytes**, sha256
  `61f39cfe556864e1b44483297ed20a5192b7aef4b21391dc9cf87ec99e981574`.
  Final npm is green at **1,068 files / 10,126 passed / 223 skipped**; build is
  green at **691 modules**. Final soaks are vanilla **20/20 OK** and full
  policy **60/60 OK**, both with zero crashes and zero hangs. Scope stayed
  inside `core-rs/**`; no unsupported barrier, Rust deferral, or papercut was
  added. `animation-main` has one unfolded commit (`7f2ccb84`); its supervisor
  still owns that fold.
