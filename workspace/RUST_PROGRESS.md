# Rust lane progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`RUST_PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## R66 — [supervised session, 2026-09-07, unattended] **M63 `Cmd_rolloutdamagecalculation` leaf + green checkpoint**

- **State:** `rust-main` = R65 checkpoint `ec2c211b5` plus the verified Sonnet
  worker `966ca09ba` (fast-forward). The pure
  `B_SCR_OP_ROLLOUTDAMAGECALCULATION` registration/handler projection —
  including an in-module port of `CancelMultiTurnMoves`
  (`battle_util.c:877-888`) applied to the attacker cell on the no-effect
  branch — is native and wasm32-compilable; no ABI, adapter, recovery module,
  canonical TS, or npm file was touched. Session still active;
  `Cmd_trysetrest` dispatching as the final leaf.
- **Did:** worker (claude-sonnet-5, 50-min cap, one commit, ~20 min) ported
  the operandless single-start `0xb3` registration (count/opcode-id/
  dispatcher/zero-operand shape errors), attacker-role-first ordering, the
  no-effect branch (`moveResultFlags & ((1<<0)|(1<<3)|(1<<5))` → cancel
  multi-turn state, late-resolved `BattleScript_MoveMissedPause` jump), and
  the hit ladder: firstHit via `STATUS2_MULTIPLETURNS`, timer 5→0 with the
  lock held until the last hit, firstHit-only `lockedMoves`/
  `rolloutTimerStartValues` writes, the zero-timer premise error, and
  `dynamicBasePower = power * 2^(hits-1)` doubled on post-update
  `STATUS2_DEFENSE_CURL`. Canonical TS supplies **87 behavior** and **6
  registration** cases; corpus sha256
  `8bb284f294f3877e6f5ab27f700592cc344e7f746226b48683b4b866223b8017`.
- **Next:** verify/fold the `Cmd_trysetrest` worker (brief
  `/tmp/rust-briefs/trysetrest.txt`, citations re-verified this session) if
  it lands green before the 19:01 UTC deadline; otherwise reject it unfolded.
  After that: the `Cmd_chargesport` family, then re-scout remaining pure
  leaves. No deferral is open.
- **Notes:** supervisor audit covered the handler against
  `battle_script_commands.c:8536-8569` and the TS module (post-update
  Defense Curl read, lazy label resolution, firstHit gating), the
  `CancelMultiTurnMoves` clear set, and generator provenance; independent
  regeneration was byte-identical. Generated Rust is **422,366 bytes**,
  sha256 `996d8e061ece91cb7627be76f4a7d54334f509776f174ea8be999428d78e9ccf`;
  generator is **31,200 bytes**, sha256
  `faec7431931cc0801b8e2b979cb297bc6d051c4669f309ab2e0925c29e026ae0`.
  Worker notes: source `rolloutTimer` is a 4-bit bitfield (`battle.h:87`) so
  generator noise masks to `0x0f`; `dynamic_base_power` kept `u32` per brief
  (source stores u16 but the projection is unclamped, max 960). Gates rerun
  on `rust-main` post-fold: **1,179/1,179** native, fmt, strict workspace
  Clippy, wasm32 release; artifact **507,121 bytes**, sha256
  `904e7165150ca188047f91c1a1d7e01abe62f02af92f0d8be267a2765aa37b17`. R63 archived.

## R65 — [supervised session, 2026-09-07, unattended] **M62 `Cmd_trywish` leaf + green checkpoint (kill-pattern fixed in practice)**

- **State:** `rust-main` = R64 checkpoint `114dfd07d` plus the verified Sonnet
  worker `5f534382c` (fast-forward). The pure `B_SCR_OP_TRYWISH`
  registration/handler projection is native and wasm32-compilable; no ABI,
  adapter, recovery module, canonical TS, or npm file was touched. Session
  still active; `Cmd_rolloutdamagecalculation` dispatching next.
- **Did:** after ten scheduled sessions (2026-09-01 → 09-06) each died to the
  launch-then-`end_turn` kill pattern on this exact step, this session held
  its turn open across the whole worker run (blocking TaskOutput waits on a
  tracked monitor) and the worker (claude-sonnet-5, 50-min cap, one commit,
  ~20 min) landed it: two-instruction `0xd4` registration; mode 0 (attacker
  role; pending-wish `wishCounter != 0` jump with rules unchanged, else
  `wishCounter[attacker]=2`, `wishMonId[attacker]=partyIndex`, advance);
  mode 1 (target role; both branches carry `battleMoveDamage =
  -max(1, floor(maxHP/2))` and `battleTextBuff1MonNick = {target,
  wishMonId[target]}`; full-HP lazy jump else advance). Canonical TS supplies
  **658 behavior** and **6 registration** cases; corpus sha256
  `e814a4fe03acf5b32c600b4b954599e1143ce1fb5f945751512ada6f550d1696`.
- **Next:** dispatch `Cmd_rolloutdamagecalculation` (brief cached at
  `/tmp/rust-briefs/rollout.txt`, citations re-verified this session), then
  `Cmd_trysetrest` (`trysetrest.txt`), then the `Cmd_chargesport` family;
  re-check ISSUES/PROGRESS for TS-lane activity before each. No deferral is
  open.
- **Notes:** supervisor audit covered control flow and verbatim error texts
  against `battle_script_commands.c:9292-9323` and the TS module (including
  the "a attacker" wording and jump-branch-only lazy label resolution), plus
  generator provenance; independent regeneration was byte-identical.
  Generated Rust is **2,843,760 bytes**, sha256
  `b2a0780c8da93b6f22fef13fa886482be4f37d706619af1e0dcbf3818484c4b0`;
  generator is **33,632 bytes**, sha256
  `955f02de334a4603ee756cc14d3f551d6083a40fd9675990e961de832bc10ff9`.
  Gates rerun on `rust-main` post-fold: **1,162/1,162** native (up from
  1,145), fmt, strict workspace Clippy, wasm32 release; artifact **507,106
  bytes**, sha256
  `99c075becca05d185c36a8a6bc73021db8cc036a2ef1329dad1f14861d6f7bfc`.
  `backup-refs.sh` pushed `rust-main` and the worker ref; its only rejection
  was the animation lane's moving worker branch (theirs, non-blocking).
  Worker fixed one clippy lifetime issue over the salvaged drafts and
  corrected the drafted handler line range (9292-9323). R62 archived.

## R64 — [supervised session wind-down, 2026-08-31 08:24–~11:20 UTC, unattended] **M61 `Cmd_tryswapabilities` leaf + session close (six leaves folded)**

- **State:** `rust-main` = master `3f76b234d` plus six verified Sonnet worker
  fast-forwards this session — `ee7acdbed` jumpifstatus3condition,
  `62591d659` jumpifstat, `bd5177a27` getsecretpowereffect, `91b6bbab6`
  trysetperishsong, `2c3db4311` tryinfatuating, `018b84cc2`
  tryswapabilities — each followed by its ledger commit and a successful
  `backup-refs.sh` push. Tree clean, committed, green; no worker worktree or
  branch left behind. No ABI, adapter, recovery module, canonical TS, or npm
  file was touched all session, so the main supervisor's fold is
  `core-rs/**` + `RUST_PROGRESS*.md` only.
- **Did (this step):** worker (claude-sonnet-5, 40-min cap, one commit,
  14 min) ported Skill Swap's single-start registration (opcode `0xDA`, one
  4-byte failure operand), the required attacker/target roles, the four-way
  fail set (both `ABILITY_NONE`, either Wonder Guard 25,
  `moveResultFlags & MOVE_RESULT_NO_EFFECT`) to the late-resolved operand
  label, and the two-byte ability swap on advance. Canonical TS supplies
  **262 behavior** and **10 registration** cases; corpus sha256
  `b9550f749d80ecf2f3be66bc51227b6e34512db7253f7ec191dbbf06b47ed801`.
- **Next:** merge master, re-run the four Rust gates, then continue the pure
  Battle Script leaf ladder: `Cmd_trywish` (two-mode, 6-byte instruction),
  `Cmd_rolloutdamagecalculation`, `Cmd_trysetrest`, `Cmd_chargesport`
  family; re-check ISSUES/PROGRESS for TS-lane activity on each before
  briefing. Remaining candidates with `unsupported-branch` barriers
  (`jumpifbyte`/`jumpifhalfword`/`jumpifword`) need a barrier-projection
  decision first — record it in `RUST_DEFERRED.md` if it cannot be made in
  session. No deferral is open.
- **Notes:** supervisor audit covered the fail predicate against
  `battle_script_commands.c:9392-9410`, `MOVE_RESULT_NO_EFFECT` composition
  (`battle.h:220/223/225/228` = `0x29`), swap-only mutation, and generator
  provenance; independent regeneration was byte-identical. Generated Rust is
  **584,015 bytes**, sha256
  `93f83c80d8719d7d61e454002098ce2ef1c86827966f41733d0837dd289dd883`;
  generator is **29,907 bytes**, sha256
  `3de44a7da23f932577d063e3e509aafd0afaba79ee82d9867c928734dd0b342a`.
  Final gates on `rust-main`: **1,145/1,145** native (up from 1,068 at
  orient), `cargo fmt --check`, strict workspace Clippy (per worker tree;
  content identical after fast-forward), wasm32 release. Artifact is
  **507,106 bytes**, sha256
  `72f27adf8d511712d939627b6ab6a19b597a1a475efe7cf6764cecb766080b9c`.
  Session-wide: six Sonnet workers, six commits, zero rejections, zero
  cap expiries (14–35 min each). No npm gate required; no deferral or
  barrier added. R61 archived. PAPERCUT: none new (README Apple-path note
  from R57 still stands).

