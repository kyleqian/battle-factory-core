# Rust lane progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`RUST_PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---


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
  archived.
## R69 — [supervised session wind-down, 2026-09-07 15:01–~18:10 UTC, unattended] **M66 `Cmd_trymemento` leaf + session close (five leaves folded)**

- **State:** `rust-main` = master `3f76b234d` (already merged at orient) plus
  five verified Sonnet worker fast-forwards this session — `5f534382c`
  trywish, `966ca09ba` rolloutdamagecalculation, `dc692d9d5` trysetrest,
  `9ece713e0` chargesport, `f33b967bf` trymemento — each followed by its
  ledger commit and a successful `backup-refs.sh` push. Tree clean,
  committed, green; no worker worktree or branch left behind. No ABI,
  adapter, recovery module, canonical TS, or npm file was touched all
  session, so the main supervisor's fold is `core-rs/**` +
  `RUST_PROGRESS*.md` only.
- **Did (this step):** worker (claude-sonnet-5, 50-min cap, one commit,
  ~21 min) ported the two-start `0xc9` registration (first-offender shape
  errors), per-execution shape check, attacker→target role order, the
  three-conjunct fail predicate (target ATK and SPATK stages both 0 and
  `missType != B_MSG_PROTECTED`) with lazy failure-label resolution and
  rules/scheduler unchanged on the jump, and the success path
  (`battleMoveDamage = attacker.hp`, unique pending-controller append, one
  `health-bar-update {attacker, 0x7fff}` event; target stages untouched).
  Canonical TS supplies **80 behavior** and **9 registration** cases;
  corpus sha256
  `b56a69bc7549bf021804bc25f684d6184109e6df62ca735ae92b29ddb95bf0ff`.
- **Next:** merge master, re-run the four Rust gates, then continue the
  leaf ladder — `/tmp/rust-briefs/tryrecycleitem.txt` is the remaining
  R57-era cached brief (re-verify citations first), then re-scout unported
  pure leaves. Remaining `jumpifbyte`/`jumpifhalfword`/`jumpifword`
  candidates still need a barrier-projection decision first — record it in
  `RUST_DEFERRED.md` if it cannot be made in session. No deferral is open.
- **Notes:** supervisor audit covered the handler against
  `battle_script_commands.c:9072-9091` and the TS module (shape-check-first
  ordering, conjunct set, laziness), plus generator provenance; independent
  regeneration was byte-identical. Generated Rust is **333,065 bytes**,
  sha256 `b922cab147397a3710b943980144c95177601e1a93f31298f4e2e993c93a5dc9`;
  generator is **31,654 bytes**, sha256
  `4d00a8d7a8699c75ce33e98d7155f52d0c514aa9bd7bb487d863163233716b8b`.
  Final gates on `rust-main`: **1,239/1,239** native (up from 1,145 at orient),
  fmt, strict workspace Clippy, wasm32 release; artifact **507,120 bytes**, sha256
  `7c67a269204304d73eb8e1727fd379d9471411aeddc88e5ab8dca3296829c2cf`. Session-wide: five Sonnet workers, five
  commits, zero rejections, zero cap expiries (~20-25 min each). The ten
  dead sessions of 09-01→09-06 were confirmed as the launch-then-end_turn
  kill pattern (headless supervisor ended its turn after launching; wrapper
  cleanup killed even setsid-detached workers); this session held its turn
  open with blocking waits on harness-tracked tasks for every worker — the
  durable fix. No npm gate required; no deferral or barrier added. R66
  archived. PAPERCUT: none new (README Apple-path note from R57 still
  stands).

## R68 — [supervised session, 2026-09-07, unattended] **M65 `Cmd_setcharge`+`Cmd_settypebasedhalvers` leaf + green checkpoint**

- **State:** `rust-main` = R67 checkpoint `7995c6be3` plus the verified Sonnet
  worker `9ece713e0` (fast-forward). The paired `B_SCR_OP_SETCHARGE` +
  `B_SCR_OP_SETTYPEBASEDHALVERS` registration/handler projection is native
  and wasm32-compilable; no ABI, adapter, recovery module, canonical TS, or
  npm file was touched. Session still active; one more leaf may follow
  before wind-down.
- **Did (this step):** worker (claude-sonnet-5, 50-min cap, one commit,
  ~21 min) ported the paired Charge / Mud Sport / Water Sport factory:
  ordered two-opcode registration (setcharge `0xcb` operandless exact-1,
  then settypebasedhalvers `0xe8` with the pinned
  `BattleScript_ButItFailed` operand; charge failures reported first),
  setcharge (attacker `status3 |= 1<<9`, chargeTimer/StartValue = 2
  unconditional refresh), and settypebasedhalvers (effect 201→Mud /
  210→Water via the gen_tables MOVES row, non-sport effect error,
  already-set lazy fail-jump with rules unchanged, else `status3 |= bit` +
  multistringChooser 0/1). Canonical TS supplies **211 behavior** and
  **14 registration** cases; corpus sha256 `b077c122b735d4761232035216052054a88b7bd4b354ec7e01a7ed97b8e73deb`.
- **Next:** if time allows before the 19:01 UTC deadline, verify and
  dispatch one more cached-brief leaf (`trymemento.txt` or
  `tryrecycleitem.txt`, R57-era — re-verify citations first) with a hard
  reject-unfolded cutoff at ~18:25; otherwise wind down. Remaining
  `jumpifbyte`/`jumpifhalfword`/`jumpifword` candidates still need a
  barrier-projection decision first. No deferral is open.
- **Notes:** supervisor audit covered both handlers against
  `battle_script_commands.c:9100-9106`/`:9758-9786`, the ordered
  registration error texts, the STATUS3/effect constants, and generator
  provenance; independent regeneration was byte-identical. Generated Rust
  is **538,477 bytes**, sha256 `25a26a55199bcdccb99c6121a97b3bc5cfb341b581b305834bbaecb3c8d13daa`; generator is **MJS_BYTES
  bytes**, sha256 `d841de568134005bbc648c110df328b802e547df5000f357ab1f2edb80b64792`. Gates rerun on `rust-main` post-fold: **1,225/1,225** native, fmt, strict
  workspace Clippy, wasm32 release; artifact **507,192 bytes**, sha256
  `8ea40493cd3fb1a33be26a1a58e87d26e3c02ae55afbbf3881fe55f04e304af7`.
  Worker notes: TS eagerly resolves currentMove effect at context
  construction (generator snapshots initial state from the raw projection);
  moves 300/346/268/33/354 identities pinned from `src/data/gen/moves.json`.
  No npm gate required; no deferral or barrier added. R65 archived.
