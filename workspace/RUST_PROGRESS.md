# Rust lane progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`RUST_PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## R61 — [supervised session, 2026-08-31, unattended] **M58 `Cmd_getsecretpowereffect` leaf + green checkpoint**

- **State:** `rust-main` = R60 checkpoint `135f4997e` plus the verified Sonnet
  worker `bd5177a27` (fast-forward). The pure `B_SCR_OP_GETSECRETPOWEREFFECT`
  registration/handler projection is native and wasm32-compilable; no ABI,
  adapter, recovery module, canonical TS, or npm file was touched. Session
  still active; `Cmd_trysetperishsong` dispatching next.
- **Did:** worker (claude-sonnet-5, 60-min cap, one commit) ported exact
  single-start eager registration (count → opcode id `0xE4` / dispatcher /
  zero operands, TS error order) and the operandless
  `gBattleEnvironment`→`moveEffectByte` map (GRASS→POISON, LONG_GRASS→SLEEP,
  SAND→ACC−1, UNDERWATER→DEF−1, WATER→ATK−1, POND→SPD−1, MOUNTAIN→CONFUSION,
  CAVE→FLINCH, every other u8→PARALYSIS) with advance-only control and
  single-field write. Canonical TS supplies **298 behavior** (full 0..=255
  environment domain + overwrite matrix) and **6 registration** cases; corpus
  sha256 `4a368aa0860dce4751ea8059af38ca35f6251dd392096558e25c3debd805eb80`.
- **Next:** dispatch `Cmd_trysetperishsong` (single start at pc 1057;
  status3/perish timers + Pressure PP scan; brief prepared). If the deadline
  reserve still holds after that, scout `Cmd_tryinfatuating` (pure, uses the
  already-ported gender module) before any further dispatch; otherwise wind
  down at the last green checkpoint.
- **Notes:** supervisor audit covered all nine environment arms and the
  MOVE_EFFECT constants against `include/constants/battle.h:247-274`,
  registration order, single-field mutation, and generator provenance;
  independent regeneration was byte-identical. Generated Rust is
  **1,250,835 bytes**, sha256
  `17513961b106b1f5d959a1140c7c50496abfc3defb33ba29c38d90eb390f9365`;
  generator is **17,622 bytes**, sha256
  `ef5e88b5242dd38761d5d35b20a2ba27a793838cf04e287223c8810375dcce44`.
  Gates in the worker tree and again on `rust-main`: **1,096/1,096**, fmt,
  strict workspace Clippy, wasm32 release. Artifact is **507,098 bytes**,
  sha256 `8cefaa0f3708c3a8e61e037509169d0df4556b73822d36691846a3027e3215a0`.
  No npm gate required; no deferral or barrier added. R58 archived.

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
