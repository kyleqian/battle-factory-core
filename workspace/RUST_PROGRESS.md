# Rust lane progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`RUST_PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## R57 — [supervised session, 2026-08-31] **Master sync + green Rust baseline; status3 worker cap-safe rejection**

- **State:** `rust-main` merged from `f58353f83` through current master
  `ba16b8dde`; the persistent tree is clean and no worker commit was folded.
  Native Rust and wasm32 release are green after the merge.
- **Did:** ran the required post-merge baseline: **1,068/1,068** native tests
  passed and `factory-wasm` release built for `wasm32-unknown-unknown`.
  Dispatched one Terra/max Rust worker for the bounded pure
  `Cmd_jumpifstatus3condition` leaf. The five-minute emergency cap expired
  during its first focused compile; it produced no commit, so the supervisor
  correctly rejected the unverified draft rather than folding partial work.
- **Next:** merge current master at the next orient, then rebrief the same
  stable `B_SCR_OP_JUMPIFSTATUS3CONDITION` leaf with a normal cap. Recreate
  the module, deterministic canonical-TS generator/corpus, and focused tests
  from the clean verified base; do not trust or fold the abandoned draft.
- **Notes:** wasm artifact is **507,105 bytes**, sha256
  `b3bbf9fbdfaafad9cb3d406be3407ee0345273c0a2c56847d471e2c24ae54274`.
  Current master added unattended-runner installation for the previously
  missing `rustfmt`/Clippy components; both installed successfully. Formatting
  found and mechanically corrected one pre-existing master-fold line wrap in
  `factory_ai_check_viability.rs`; `cargo fmt --check` is green. Strict Clippy
  was started after formatting but stopped at the session wind-down deadline,
  so it is the first verification at the next orient. No Rust deferral,
  ABI/adapter widening, canonical-TS edit, or barrier was added.
  No npm gate was required because no post-baseline worker fold touched the
  adapter or canonical TypeScript. PAPERCUT: README names an absent Apple
  toolchain path on the unattended Linux image, ~2 min.

## R56 — [supervised session, 2026-08-25] **M55 Helping Hand leaf + final wind-down**

- **State:** `rust-main` = session-start master `33592cba` plus five verified
  increments through `Cmd_trysethelpinghand` worker `15b28803`. ORWORD,
  CheckViability tie-receipt retention, Encore, field-ability scan, and Helping
  Hand are committed and green; no ABI, adapter, recovery module, or canonical
  TypeScript file was widened.
- **Did:** ported Helping Hand's singleton `0xd1` registration, instruction-
  before-attacker ordering, source positional-partner lookup, unconditional
  target retarget before all guards, exact doubles/absence/corrupt-byte gates,
  failure-only late label resolution, target-only success write, repetition,
  and full no-RNG/no-event/no-scheduler preservation. Canonical TypeScript
  supplies **2,632 behavior** and **10 registration** cases; corpus sha256
  `28a79ba053c6e925a8357766f7d73f8adb715d82d1979625d7cd02b4e87fa5e0`.
- **Next:** at the next Rust session, merge current master, recheck active lane
  work, and select another stable pure leaf. Main owns deletion of ISSUE #124
  after folding this lane; Rust has no open deferral.
- **Notes:** Terra/max worker, one commit. Supervisor caught and corrected the
  worker unit fixture's naive battler-id partner expectation; production code
  and the canonical corpus already used `position ^ BIT_FLANK`. Two independent
  regenerations were byte-identical. Generated Rust is **9,314,463 bytes**,
  sha256 `5aac9cb75d4e039e7b81bd41dc5c5e88cc19a59e4e47d37935a04ddedb119972`;
  generator is **41,575 bytes**, sha256
  `c60ebdc8166bad3f26854a170d580334614cccef41ae7129363e1859d46b4156`.
  Final Rust is green at **1,068/1,068** tests, fmt, strict workspace Clippy,
  and wasm32 release. Artifact is **506,009 bytes**, sha256
  `de2fdfdf67692881cb45d64907ad130ab607fc450d7b89bca510716ee6a554d4`.
  Final npm is green at **1,121 files / 10,457 passed / 223 skipped** and build
  is green at **712 modules**. Wind-down soaks: vanilla **20/20**, full
  **60/60**, winning **60/60**, and winning-swap **60/60**, all with zero
  crashes and zero hangs. Scope stayed inside `core-rs/**` plus the existing M2
  parity file used by the receipt repair; no barrier or deferral was added.

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
