# Rust lane progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`RUST_PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## R55 — [supervised session, 2026-08-25] **M54 Battle Script field-ability scan + green checkpoint**

- **State:** `rust-main` = merged master `33592cba` plus the four verified
  session increments through `Cmd_jumpifabilitypresent` worker `70b3417f`.
  The complete pure two-site registration/topology-scan/control projection is
  native and wasm32-compilable; no ABI, adapter, or recovery module was
  changed. The session remains active, committed, and green.
- **Did:** ported exact two-start eager registration, first opcode binding,
  Cloud Nine/Air Lock expression mapping, 2/4-slot topology scan, living-only
  ability match, absent-path advance without label lookup, present-path late
  label resolution, direct-handler unvalidated-ability error, repeated control,
  and full narrow-state immutability. Canonical TypeScript supplies **153
  behavior** and **15 registration** cases; corpus sha256
  `fc70a470d096700098fbf5fe8454bfdecd38da0b599d30f52339820841aa46bc`.
- **Next:** port one final stable pure Battle Script leaf if the deadline
  reserve remains sound; prefer singleton `B_SCR_OP_TRYSETHELPINGHAND`, which
  has bounded doubles topology, target rebinding, no RNG, and no active issue.
- **Notes:** Sol/high worker, one commit. Supervisor audited source dispatch,
  field scan, six-byte macro, both Solar Beam sites, constants, registration
  predicates, late label boundary, ignored absent slots, and no-write output;
  regenerated twice byte-identically and passed focused **8/8**, full Rust
  **1,059/1,059**, fmt, strict workspace Clippy, and wasm32 release. Generated
  Rust is **808,906 bytes**, sha256
  `5ca4649b30f3692bce6fee05f884c4f1f75e9d65c6bfa4eebc6bdfe6201ab496`;
  generator is **26,662 bytes**, sha256
  `4923f0d7bcb94f7bd3c90533e2176422fe2893998732d1fba5a26a62ca24a2ee`.
  Artifact is **505,897 bytes**, sha256
  `6607385fe956f48e1a5f926da9625a40e61ea380bd15212dd8b348eebc6fb060`.
  Worker npm is green at **1,121 files / 10,457 passed / 223 skipped** and
  build is green. Scope stayed inside `core-rs/**`; no barrier or deferral was
  added. PAPERCUT: silent TypeScript typecheck obscured liveness, ~4 min.

## R54 — [supervised session, 2026-08-25] **M53 Battle Script Encore leaf + green checkpoint**

- **State:** `rust-main` = merged master `33592cba` plus verified ORWORD,
  CheckViability receipt, and `Cmd_trysetencore` workers through `431a40c7`.
  The complete pure Encore registration/state/RNG/control projection is native
  and wasm32-compilable; no ABI or adapter surface was widened. The session
  remains active, committed, and green.
- **Did:** ported exact two-stage singleton registration and handler validation,
  target-role ordering, first matching move slot, existing-Encore/PP/missing-
  slot/Struggle/Encore/Mirror Move gates, failure-only late label lookup,
  success-only single RNG draw, duration 3..6, exact four-field target write,
  and advance/jump control. Canonical TypeScript supplies **739 behavior** and
  **12 registration** cases, including the 500 concrete selector matrix and 32
  duplicate-slot PP-precedence cases. Corpus sha256
  `17c24b5dfdeaf7f4d86a690219c6f278fd60ef41c7be38557a7c6e5345b13564`.
- **Next:** port the stable, conflict-free pure
  `B_SCR_OP_JUMPIFABILITYPRESENT` leaf. Preserve its two concrete Solar Beam
  starts, living-battler topology scan, ability operands, eager registration,
  and late jump-label resolution. Keep scope inside `core-rs/**`.
- **Notes:** Terra/max worker, one commit. Supervisor rejected an initially
  incorrect duplicate-slot unit fixture; the implementation and generated
  differential were correct, and the corrected fixture now proves slot zero
  wins when the later duplicate has zero PP. Supervisor audited the decomp
  body, five-byte macro, sole call site, error/write/RNG boundaries, regenerated
  twice byte-identically, and passed focused **7/7**, full Rust, fmt, required
  strict library Clippy, and wasm32 release. Generated Rust is **8,066,126
  bytes**, sha256
  `53095904ebac7afe0a80a1673266afc82ffd79eff72b6655e323ba886e88e8d8`;
  generator is **55,572 bytes**, sha256
  `1de47b8144399f9b95f88cb37ffa395648ca5a880fa795c662f7d1df594a5b05`.
  Artifact is **505,906 bytes**, sha256
  `f4250d789d6cdabda3e407847bf1ae12e3552c4ab0a2c412fade7a83aa3a2fad`.
  Worker npm is green at **1,121 files / 10,457 passed / 223 skipped** and
  build is green. Scope stayed inside `core-rs/**`; no barrier, deferral, or
  papercut was added.

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
