# Rust lane progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`RUST_PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

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

## R67 — [supervised session, 2026-09-07, unattended] **M64 `Cmd_trysetrest` leaf + green checkpoint**

- **State:** `rust-main` = R66 checkpoint `f46f234a8` plus the verified Sonnet
  worker `dc692d9d5` (fast-forward). The pure `B_SCR_OP_TRYSETREST`
  registration/handler projection is native and wasm32-compilable; no ABI,
  adapter, recovery module, canonical TS, or npm file was touched. Session
  still active; the `Cmd_chargesport` family dispatching as the final leaf.
- **Did (this step):** worker (claude-sonnet-5, 50-min cap, one commit,
  ~25 min) ported the find-first presence-only registration (`0x81` in the
  committed program), the attacker-role requirement ("an attacker"), the
  UNCONDITIONAL target-role collapse + `battleMoveDamage = -maxHP` writes on
  both branches, the full-HP lazy fail-jump, and the success path:
  `multistringChooser = (status1 & ~7) != 0 ? 1 : 0`, status1 REPLACED with
  `STATUS1_SLEEP_TURN(3)` = 3 (cures prior status in the same write), the
  (side, partyIndex) party-mirror write, and exactly one
  `set-battler-status-data` event. Canonical TS supplies **109 behavior**
  and **3 registration** cases; corpus sha256 `59bb3a8e3d36d1e7f0a0558522ab7c1eef5355e6cb833552459433f3d0b00c82`.
- **Next:** verify/fold the `Cmd_chargesport` worker (brief
  `/tmp/rust-briefs/chargesport.txt`, citations re-verified before dispatch)
  if it lands green with margin before the 19:01 UTC deadline; otherwise
  reject it unfolded. After that: re-scout remaining pure leaves
  (`jumpifbyte`/`jumpifhalfword`/`jumpifword` still need a barrier-projection
  decision first). No deferral is open.
- **Notes:** supervisor audit covered the handler against
  `battle_script_commands.c:6762-6784` (including the `(u8)(~STATUS1_SLEEP)`
  chooser subtlety — corpus stays in u8 range; TS is the corpus oracle) and
  generator provenance; independent regeneration was byte-identical.
  Generated Rust is **952,476 bytes**, sha256 `7dc50e6865c45244ac488636138a98e794b69fa1f3973c8a354b3ddbab64a364`; generator is
  **27,270 bytes**, sha256 `4beebc9980de9510af6f9f43769fea424dbcaa0c42565dd08b8aeb9a1df53199`. Gates rerun on `rust-main` post-fold: **1,197/1,197** native, fmt, strict
  workspace Clippy, wasm32 release; artifact **507,121 bytes**, sha256
  `017d9b6af8d27a1a89b795a70e4e56c1b6bcd53a9cb1cd6fd1678be9aa0deb5c`.
  Worker notes: the registration is genuinely presence-only find-first
  (mirrors tryinfatuating, unlike the cardinality-checked siblings), the
  error text is "an attacker" (not the siblings' "a attacker"), and the
  unchecked TS `operands[0]` read is a typed MissingOperand error covered by
  a unit test only. No npm gate required; no deferral or barrier added. R64
  archived.

