# Rust lane progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`RUST_PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

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

## R63 — [supervised session, 2026-08-31, unattended] **M60 `Cmd_tryinfatuating` leaf + green checkpoint**

- **State:** `rust-main` = R62 checkpoint `a87441049` plus the verified Sonnet
  worker `2c3db4311` (fast-forward). The pure `B_SCR_OP_TRYINFATUATING`
  registration/handler projection is native and wasm32-compilable, reusing
  the existing `battle_script_gender` and `battle_script_ai_reveal` ports; no
  ABI, adapter, recovery module, canonical TS, or npm file was touched.
- **Did:** worker (claude-sonnet-5, 55-min cap, one commit) ported the
  first-match registration (TS validates only presence), required
  attacker/target roles, the Oblivious branch (`lastUsedAbility = 12`,
  ability-reveal record, hardcoded `BattleScript_ObliviousPreventsAttraction`
  pc 2996), the four-way non-short-circuit fail set (same gender, target
  already infatuated by any battler, either genderless) to the operand label,
  and the success write `status2 |= 1 << (16 + attacker)`. Canonical TS
  supplies **953 behavior** and **3 registration** cases; corpus sha256
  `74da7fe4ce04d2721a87ca45021bcc5f9639a4506840a939e8f59a4970b05a81`.
- **Next:** at the next session merge master, re-run the four Rust gates,
  and continue down the unported pure leaves: `Cmd_tryswapabilities`
  (Skill Swap, two ability bytes), `Cmd_trywish`, then
  `Cmd_rolloutdamagecalculation`; re-check ISSUES/PROGRESS for TS-lane
  activity on each before briefing. No deferral is open.
- **Notes:** supervisor audit covered branch order against
  `battle_script_commands.c:7654-7696`, the infatuation bit/mask constants
  (`battle.h:142-143`), reveal no-op semantics, and generator provenance;
  independent regeneration was byte-identical. The worker reported the brief's
  suggested gender-ratio class 225 does not exist in `species-stats.json`
  (actual: 0/31/63/127/191/254/255) and covered 63 instead. Generated Rust is
  **3,600,294 bytes**, sha256
  `8a0c2e9f8deaeec3f2e22057c8d3ab19ca93401c4c0aae554f24659348ae7ee1`;
  generator is **33,294 bytes**, sha256
  `9296e023886c2b4d666c00e93d869a5ccfb3f83d3cd34f1a4132322bf57c9cfa`.
  Gates in the worker tree and again on `rust-main`: **1,128/1,128**, fmt,
  strict workspace Clippy, wasm32 release. Artifact is **507,097 bytes**,
  sha256 `d8151da186000a2fa909f4ddc486cc2c2726048a71b8f8bb2ce46750fa8999f0`.
  No npm gate required; no deferral or barrier added. R60 archived.

## R62 — [supervised session, 2026-08-31, unattended] **M59 `Cmd_trysetperishsong` leaf + green checkpoint**

- **State:** `rust-main` = R61 checkpoint `350b978a0` plus the verified Sonnet
  worker `91b6bbab6` (fast-forward). The pure `B_SCR_OP_TRYSETPERISHSONG`
  registration/handler projection is native and wasm32-compilable; no ABI,
  adapter, recovery module, canonical TS, or npm file was touched. Session
  still active; `Cmd_tryinfatuating` dispatching as the final leaf.
- **Did:** worker (claude-sonnet-5, 60-min cap, one commit) ported the
  single-start registration (opcode `0xB2`, dispatcher, one 4-byte failure
  operand), pass 1 over `battlersCount` (already-sung or Soundproof →
  not-affected; else `status3 |= PERISH_SONG`, timer 3, start value 3), pass
  2 `PressurePPLoseOnUsingPerishSong` (first Perish Song slot, one decrement
  per other Pressure holder, floor at zero, write-only-if-changed), and the
  all-not-affected late-label jump vs advance — both carrying the mutated
  rules. Canonical TS supplies **789 behavior** and **10 registration**
  cases; corpus sha256
  `4854061de9011da05d6d8fc26e0d5baec66e7483607ddf464fe36ba91102f5a2`.
- **Next:** verify/fold the `Cmd_tryinfatuating` worker if it lands green
  before the 12:24 UTC deadline (brief: reuse `gender.rs`,
  `species_gender_ratios_gen.rs`, `battle_script_ai_reveal.rs`; Oblivious
  hardcoded label pc 2996; four-way fail to operand label; success writes
  `1 << (16 + attacker)`); otherwise reject it unfolded and leave it for the
  next session. After that the next unported pure leaves are
  `Cmd_tryswapabilities`, `Cmd_trywish`, `Cmd_rolloutdamagecalculation`.
- **Notes:** supervisor audit covered both passes against
  `battle_script_commands.c:8508-8534` / `battle_util.c:799-830`, the
  snapshot-vs-progressive read equivalence (pass 2 reads only fields pass 1
  never writes), label handling, and generator provenance; independent
  regeneration was byte-identical. Generated Rust is **4,636,075 bytes**,
  sha256 `063e6a1787ea8f26a711687509274d6127ea6486f3f767fbdb2a41904de6470a`;
  generator is **40,832 bytes**, sha256
  `a3d348fe6da851ed08c555d0677fccb5d2135af7879c462cffc2208e0b61c297`.
  Gates in the worker tree and again on `rust-main`: **1,111/1,111**, fmt,
  strict workspace Clippy, wasm32 release. Artifact is **507,097 bytes**,
  sha256 `ee336b0928555b33ce10eacf33ba8918ded1596a5adc7198e22215eb95b3a75b`.
  No npm gate required; no deferral or barrier added. R59 archived.
