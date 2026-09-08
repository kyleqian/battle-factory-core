# Rust lane progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`RUST_PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---


## R72 — [supervised session, 2026-09-08, unattended] **M69 `Cmd_tryimprison` leaf + green checkpoint**

- **State:** `rust-main` = R71 checkpoint `28e289027` plus the verified Sonnet
  worker `1d34a6ee1` (fast-forward). The pure `B_SCR_OP_TRYIMPRISON`
  registration/handler projection — including the dedicated Pressure PP loop
  from `battle_util.c:767-797` — is native and wasm32-compilable; no ABI,
  adapter, recovery module, canonical TS, or npm file was touched. Session
  still active; the `Cmd_trysetfutureattack` leaf (M70, brief
  `/tmp/rust-briefs/trysetfutureattack-m70.txt`, citations verified this
  session — the lane's first leaf reusing the ported damage_calc kernel)
  dispatching as the final leaf before wind-down.
- **Did (this step):** worker (claude-sonnet-5, 50-min cap, one commit,
  ~25 min) ported the exactly-1 `0xdb` registration, per-execution shape
  check, EAGER failure-label resolution (before role/branches — unresolved
  errors even on success paths), the early IMPRISONED_OTHERS fail jump
  (skipping Pressure PP loss), the Pressure chain-decrement (one per
  opposing Pressure holder, first-Imprison position, floor 0; active pp
  always updated, party mirror + scheduler.activeBattler write + unique
  pending append + one `set-battler-pp-data` event strictly gated on
  MOVE_IS_PERMANENT: !TRANSFORMED && !mimicked-bit), and the post-PP
  overlap scan (MOVE_NONE excluded) choosing Advance + `status3 |=
  IMPRISONED_OTHERS` vs fail Jump. Canonical TS supplies **52 behavior**
  and **8 registration** cases; corpus sha256
  `fa2ed7db8c54beafe6733c53c648e3d9eb64dddedad355ec87aeac9f2c1b89ab`.
- **Next:** dispatch + verify M70 `Cmd_trysetfutureattack` with a hard
  reject-unfolded cutoff at ~18:25 UTC; then wind down (deadline 19:01).
  Remaining rng-free leaf candidates after that: stockpile (223 lines),
  tryswapitems (262). The `jumpifbyte`/`jumpifhalfword`/`jumpifword`
  candidates still need a barrier-projection decision first. No deferral
  is open.
- **Notes:** supervisor audit covered the handler against
  `battle_script_commands.c:9412-9451` + `battle_util.c:767-797` (eager
  resolution order, chain-decrement semantics, permanence gate, overlap on
  post-PP state) and generator provenance; independent regeneration was
  byte-identical. Worker self-corrected its guessed program counter (1794,
  verified against `loadBattleScriptProgram()`) before generating. Generated
  Rust is **402,810 bytes**, sha256
  `21ae30417d75436142571cc0370c17e9e9c894d3b3887fb7f9952283537b26f9`;
  generator is **38,421 bytes**, sha256
  `a39a63488adeafb21ba8b7d48e7491be39c86db6c30378071923071f6ef74e2d`.
  Gates rerun on `rust-main` post-fold: **1,292/1,292** native, fmt, strict
  workspace Clippy, wasm32 release; artifact **507,139 bytes**, sha256
  `22e277ec0eb26360bcce359bef90d3efb4f336c6846b0013239a35b1a7eeef00`.
  No npm gate required; no deferral or barrier added. R69 archived.

## R71 — [supervised session, 2026-09-08, unattended] **M68 `Cmd_removeitem` leaf + green checkpoint**

- **State:** `rust-main` = R70 checkpoint `4345c70c3` plus the verified Sonnet
  worker `2ac3156d0` (fast-forward). The `B_SCR_OP_REMOVEITEM`
  registration/handler projection (13 concrete starts, BS_SCRIPTING /
  BS_ATTACKER selector resolution, unsupported-branch halt) is native and
  wasm32-compilable; no ABI, adapter, recovery module, canonical TS, or npm
  file was touched. Session still active; the `Cmd_tryimprison` leaf (brief
  `/tmp/rust-briefs/tryimprison-m69.txt`, citations verified this session)
  dispatching next.
- **Did (this step):** worker (claude-sonnet-5, 50-min cap, one commit,
  ~26 min) ported the exactly-13-starts `0x6a` registration (cardinality
  error first, then per-instruction first-offender shape errors incl. the
  BS_SCRIPTING/BS_ATTACKER selector whitelist), selector resolution
  (BS_ATTACKER → attacker role, BS_SCRIPTING → scriptingBattler; null →
  UnsupportedBranch halt carrying {pc, opcodeId, opcodeName,
  sourceConstruct, battle_script_commands.c, 5905} with rules/scheduler
  untouched), and the always-advance success path: usedHeldItems[battler] :=
  old active item (UNCONDITIONAL, even 0), active item := 0, party mirror :=
  0, lastUsedItem untouched, unique pending-controller append, one
  `set-battler-item {battler, 0}` event. No per-execution shape re-check
  (TS has none — mirrored). Canonical TS supplies **76 behavior** (74
  applied + 2 halt) and **10 registration** cases; corpus sha256
  `ecf8ec5ecd95f1ba20fec374b3525b4fd44ee827b8b818cae5cbba8f98cee419`.
- **Next:** dispatch + verify the `Cmd_tryimprison` leaf (M69). After that,
  remaining rng-free leaf candidates by TS size: trysetfutureattack (182),
  stockpile (223), tryswapitems (262). The
  `jumpifbyte`/`jumpifhalfword`/`jumpifword` candidates still need a
  barrier-projection decision first. No deferral is open.
- **Notes:** supervisor audit covered the handler against
  `battle_script_commands.c:5901-5915` and `battle_util.c:702-712` selector
  cases, registration ordering, and generator provenance; independent
  regeneration was byte-identical. Worker judgment call (accepted):
  production TS `scriptingBattler` is never-null by constructor, so the
  missing-scriptingBattler halt case is generated by overriding the frozen
  canonical rules object post-construction before calling the exported
  canonical handler — canonical code still computes the expectation. TS doc
  comment's `items.h:5` for ITEM_NONE is actually line 4; pinned at 4.
  Generated Rust is **570,771 bytes**, sha256
  `e5f4a0e413d19c488961e3e260c4997bbad22d5ec6368545fe32fb067909d4d2`;
  generator is **33,859 bytes**, sha256
  `bade63671fb22ff7f5dbba89b297302e22a74f5ffa7f736b48eea74292c8b988`.
  Gates rerun on `rust-main` post-fold: **1,272/1,272** native, fmt, strict
  workspace Clippy, wasm32 release; artifact **507,107 bytes**, sha256
  `32f4ca7baa8ad957134873e85f2c18c7ecf9d88e87e6c5cc8e7252f5fdfb9c5d`.
  No npm gate required; no deferral or barrier added. R68 archived.

## R70 — [supervised session, 2026-09-08, unattended] **M67 `Cmd_tryrecycleitem` leaf + green checkpoint**

- **State:** `rust-main` = R69 checkpoint `c62ac5b39` (master merge at orient
  was a no-op — already up to date) plus the verified Sonnet worker
  `94869f4fa` (fast-forward). The pure `B_SCR_OP_TRYRECYCLEITEM`
  registration/handler projection is native and wasm32-compilable; no ABI,
  adapter, recovery module, canonical TS, or npm file was touched. Session
  still active; the `Cmd_removeitem` leaf (the usedHeldItems producer this
  opcode consumes) is being briefed next.
- **Did (this step):** worker (claude-sonnet-5, 50-min cap, one commit,
  ~16 min) ported the exactly-1 concrete-start `0xea` registration
  (cardinality error first, then first-offender shape errors), the
  per-execution shape check, the attacker-role requirement, the two-conjunct
  fail predicate (`usedHeldItems[attacker] == ITEM_NONE || battlers[attacker]
  .item != ITEM_NONE`, the De Morgan negation of the C success condition)
  with lazy failure-label resolution and rules/scheduler unchanged on the
  jump, and the success path: attacker active item := usedItem, (side,
  partyIndex) party-mirror write, usedHeldItems cell cleared (others
  retained), lastUsedItem := usedItem, unique pending-controller append, and
  exactly one `set-battler-item {attacker, usedItem}` event. Canonical TS
  supplies **85 behavior** and **8 registration** cases; corpus sha256
  `fa5eeb58a8553b283a40624fa18dd85d9157ebc0cfdad9dcb518449f2b254328`.
- **Next:** brief + dispatch the `Cmd_removeitem` leaf (M68; 13 concrete
  starts, BS_SCRIPTING/BS_ATTACKER selector resolution via
  `resolveRulesBattlerForBattleScript`, unsupported-selector outcome —
  citations verified this session). After that, remaining rng-free leaf
  candidates by TS size: tryimprison (171), trysetfutureattack (182),
  stockpile (223), tryswapitems (262). The
  `jumpifbyte`/`jumpifhalfword`/`jumpifword` candidates still need a
  barrier-projection decision first. No deferral is open.
- **Notes:** supervisor audit covered the handler against
  `battle_script_commands.c:9808-9829` (shape-check-first ordering, fail
  conjuncts, laziness, registration cardinality-then-shape order) and
  generator provenance; independent regeneration was byte-identical.
  Generated Rust is **390,032 bytes**, sha256
  `766ed55ce3cb42a90d0f7748833c91f0f7d213d940bfbd2a9cc8f29647e52a3a`;
  generator is **30,696 bytes**, sha256
  `2dbc138155a07f1927c4398c3e2922f56717e67ae384a8d51136e1e12a09a9b8`.
  Gates rerun on `rust-main` post-fold: **1,254/1,254** native (up from
  1,239 at orient), fmt, strict workspace Clippy, wasm32 release; artifact
  **507,121 bytes**, sha256
  `2d2f571d64eee47185ae8a64fe84729ffd8ba3731bc2f73993411cc1c3e34429`.
  Baseline at orient matched R69 exactly (1,239 native, artifact
  `7c67a269…`). No npm gate required; no deferral or barrier added. R67
