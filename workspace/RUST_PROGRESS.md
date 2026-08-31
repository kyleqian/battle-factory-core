# Rust lane progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`RUST_PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## R60 — [supervised session, 2026-08-31, unattended] **M57 `Cmd_jumpifstat` leaf + green checkpoint**

- **State:** `rust-main` = R59 checkpoint `8730a5470` plus the verified Sonnet
  worker `62591d659` (fast-forward). The pure `B_SCR_OP_JUMPIFSTAT`
  registration/handler projection is native and wasm32-compilable; no ABI,
  adapter, recovery module, canonical TS, or npm file was touched. Session
  still active; `Cmd_getsecretpowereffect` dispatching next.
- **Did:** worker (claude-sonnet-5, 75-min cap, one commit) ported exact
  18-start eager registration (count → 1/1/1/1/4 shape → six `CMP_*` →
  seven `STAT_*` → `MIN|MAX_STAT_STAGE` → eager label resolution, TS error
  order), all six comparators source-completely, the injected-selector
  `Block { source-context-unavailable }` control variant for a null battler,
  advance without label lookup, and jump on the pre-resolved label. Canonical
  TS supplies **1,602 behavior** and **16 registration** cases; corpus sha256
  `1713232e00bdb6af8d6ce6bce929fa52badfd10dab85511b7daf4b43575a4da9`.
- **Next:** dispatch `Cmd_getsecretpowereffect` (single start at pc 1835,
  pure `gBattleEnvironment`→`moveEffectByte` map), then
  `Cmd_trysetperishsong` (single start at pc 1057; status3/perish timers +
  Pressure PP scan) if the deadline reserve holds. Briefs are prepared.
- **Notes:** supervisor audit covered comparator table, decode-before-block
  ordering, registration order, stat-index addressing, and generator
  provenance; independent regeneration was byte-identical. Generated Rust is
  **2,512,225 bytes**, sha256
  `9f2947617530f559af72c4611957fbe01d904234ad49250d91bcca18500fafd0`;
  generator is **37,103 bytes**, sha256
  `d092db5e978488c6011c9cb98473dacd0ddf7b9ff55e9cb69265ad156f4d052a`.
  Gates in the worker tree and again on `rust-main`: **1,087/1,087**, fmt,
  strict workspace Clippy, wasm32 release. Artifact is **507,097 bytes**,
  sha256 `5692c5dc012ccc892fa8d106945e8455976c7965d2e99ec713798062e9ad3fab`.
  No npm gate required; no deferral or barrier added. R57 archived.

## R59 — [supervised session, 2026-08-31 08:24– UTC, unattended] **M56 `Cmd_jumpifstatus3condition` leaf + green checkpoint**

- **State:** `rust-main` = master `3f76b234d` (already merged at orient) plus
  the verified Sonnet worker `ee7acdbed` (fast-forward). The pure
  `B_SCR_OP_JUMPIFSTATUS3CONDITION` registration/handler projection is native
  and wasm32-compilable; no ABI, adapter, recovery module, canonical TS, or
  npm file was touched. Session still active; next leaf dispatching.
- **Did:** orient baseline was fully green (**1,068/1,068**, fmt, strict
  Clippy — the R57/R58 "Clippy unverified" item is closed — and wasm32 at the
  R58 hash). Worker (claude-sonnet-5, 75-min cap, one commit) ported exact
  7-start eager registration (count → 1/4/1/4 operand shape → `BS_TARGET`
  → `TRUE|FALSE` → five named `STATUS3_*` masks, TS error order), the
  jumpifnostatus3/jumpifstatus3 clear/set semantics, advance without label
  lookup, late label resolution on jump, and typed
  undecodable/unresolved-target errors. Canonical TS supplies **577 behavior**
  and **15 registration** cases; corpus sha256
  `c88eb6c8bd520541a677bac3cffca42e05780ece2024a8267554e143a0eb58f0`.
- **Next:** dispatch the pure `Cmd_jumpifstat` leaf (18 starts,
  `BS_ATTACKER`/`BS_TARGET`, six `CMP_*` comparators, eager label
  validation, `block`/source-context-unavailable variant) with the same
  pattern; then `Cmd_getsecretpowereffect` (single start, pure
  environment→`moveEffectByte` map). Briefs are prepared; both are
  conflict-free against ISSUES/PROGRESS as of this orient.
- **Notes:** supervisor audit covered mask values, registration order,
  handler branch logic, and generator provenance (expected values come from
  the canonical handler with TS-side immutability asserts); independent
  regeneration was byte-identical. Generated Rust is **600,257 bytes**,
  sha256 `4d1c90c33b27e638cdd2fa867136b3ccde489438e7795f59283185d6690c1e8d`;
  generator is **30,001 bytes**, sha256
  `a5591512378aff656f380342516bd7548d116979c2620af1e386819884996934`.
  Gates in the worker tree and again on `rust-main`: **1,077/1,077**, fmt,
  strict workspace Clippy, wasm32 release. Artifact is **507,176 bytes**,
  sha256 `d4e52b8cdff75b9a5d2e0bf3e84f2502f4cc55fb9b5ec9d829300702cff024de`
  (+71 bytes vs R58 with no ABI change; identical hash in both trees, so
  deterministic). No npm gate required (nothing outside `core-rs/**` and
  this ledger changed). No deferral or barrier added. R54–R56 archived.

## R58 — [supervised session, 2026-08-31 07:28–07:37 UTC] **Master sync + green baseline only (9-minute window)**

- **State:** `rust-main` = merge of master `e4d7a01f0` (merge commit
  `72d26538f`, clean, no conflicts). No worker was dispatched: the session
  started 9 minutes before its hard deadline, below any worker cap.
- **Did:** post-merge baseline — **1,068/1,068** native tests passed;
  `factory-wasm` release built for `wasm32-unknown-unknown`, artifact
  **507,105 bytes**, sha256
  `b3bbf9fbdfaafad9cb3d406be3407ee0345273c0a2c56847d471e2c24ae54274`
  (byte-identical to R57).
- **Next:** unchanged from R57 — merge master at orient, run
  strict Clippy first (`cargo fmt --check` is green as of this checkpoint,
  ~45 s; Clippy did not fit inside the window and remains unverified,
  not failed), then rebrief the bounded pure
  `Cmd_jumpifstatus3condition` leaf with a normal cap from the clean base.
- **Notes:** on this Linux image cargo lives at `$HOME/.cargo/bin` (the
  README's Apple toolchain path is absent — R57 PAPERCUT still open). No
  Rust deferral, ABI/adapter widening, canonical-TS edit, or barrier was
  added; no npm gate required (nothing outside RUST_PROGRESS.md changed).
