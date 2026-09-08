# Rust lane progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`RUST_PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---


## R74 — [supervised session wind-down, 2026-09-08 15:01–~17:55 UTC, unattended] **M71 `Cmd_tryswapitems` leaf + session close (five leaves folded)**

- **State:** `rust-main` = master (merge at orient was a no-op) plus five
  verified Sonnet worker fast-forwards this session — `94869f4fa`
  tryrecycleitem, `2ac3156d0` removeitem, `1d34a6ee1` tryimprison,
  `1e4cbf444` trysetfutureattack, `e39d11dc2` tryswapitems — each followed
  by its ledger commit and a successful `backup-refs.sh` push. Tree clean,
  committed, green; no worker worktree or branch left behind. No ABI,
  adapter, recovery module, canonical TS, or npm file was touched all
  session, so the main supervisor's fold is `core-rs/**` +
  `RUST_PROGRESS*.md` only.
- **Did (this step):** worker (claude-sonnet-5, 45-min cap, one commit,
  ~22 min) ported Trick's guard ladder in source order (Trainer Hill;
  opponent-side in regular battles with the ALLOWED_SPECIAL bypass set;
  knockedOffMons bits regular-only; both-items-none / Enigma Berry /
  mail 121..=132), per-branch LAZY label resolution (failure label and
  BattleScript_StickyHoldActivates resolve independently, each only on its
  branch), the Sticky Hold jump (lastUsedAbility := 60 +
  aiObservedAbilityIds identity write, scheduler unchanged, no events), and
  the success swap with its deliberate asymmetry (attacker ACTIVE item := 0
  while attacker PARTY slot := target's item; target active+party := old
  attacker item; changedItems[attacker] holds the restore value for the
  later MOVEEND_CHANGED_ITEMS case), choicedMove double clear, chooser
  2/0/1, both text buffs, ordered attacker-then-target pending appends, and
  two ordered set-battler-item events. Canonical TS supplies **44 behavior**
  and **8 registration** cases; corpus sha256
  `0fd8d0364b543840ff250f6d438bebfd2f5d2bb7456e78ae8033cb67373a0cf8`.
- **Next:** merge master, re-run the four Rust gates, then continue the leaf
  ladder. Best-scouted candidates: the stockpile family (0x85/0x86/0x87 —
  needs the shared `calculateBattleScriptBaseDamageForCurrentMove` hit-chain
  helper: sports halvers + dynamicBasePower + type resolution, not yet a
  shared Rust fn; budget as a larger leaf or a two-step split), then re-scout
  remaining pure leaves (rng-free candidates thin out from here). The
  `jumpifbyte`/`jumpifhalfword`/`jumpifword` candidates still need a
  barrier-projection decision first — record it in `RUST_DEFERRED.md` if it
  cannot be made in session. No deferral is open.
- **Notes:** supervisor audit covered the handler against
  `battle_script_commands.c:9189-9269` (guard order, the 9244-9245
  asymmetry, sticky-hold reveal) and generator provenance; independent
  regeneration was byte-identical. Worker's report swapped the corpus and
  generated-file sha labels; correct values: generated Rust **324,169
  bytes**, sha256
  `b86c21fd2532295073c1113f19ed3f3b5759883f975c0e1c28d5061321fd33d2`;
  generator **37,447 bytes**, sha256
  `3c78b47a378619eadbf9a56384ba98cbf51313bed63bc697809b8e96848f8134`.
  Final gates on `rust-main`: **1,329/1,329** native (up from 1,239 at
  orient), fmt, strict workspace Clippy, wasm32 release; artifact **512,496
  bytes**, sha256
  `8e11dc222677ac6f07e1f5ffc8909b812a9b2778d3e8fc12ded73ebfed78bd1a`.
  Session-wide: five Sonnet workers, five commits, zero rejections, zero cap
  expiries (16-33 min each, ~$21 total); the R65-R69 hold-the-turn-open
  pattern (tracked background launcher + chained blocking waits) worked
  every time. M70 was the first leaf to reuse `damage_calc` +
  `gen_tables::MOVES` across module boundaries. No npm gate required; no
  deferral or barrier added. R71 archived. PAPERCUT: none new (README
  Apple-path note from R57 still stands).

## R73 — [supervised session, 2026-09-08, unattended] **M70 `Cmd_trysetfutureattack` leaf + green checkpoint (first damage-kernel-reusing leaf)**

- **State:** `rust-main` = R72 checkpoint `80600ca21` plus the verified Sonnet
  worker `1e4cbf444` (fast-forward). The `B_SCR_OP_TRYSETFUTUREATTACK`
  registration/handler projection — the lane's first battle-script leaf that
  calls the ported `damage_calc::calculate_base_damage` kernel and the
  gen_tables MOVES row — is native and wasm32-compilable; no ABI, adapter,
  recovery module, canonical TS, or npm file was touched. Session still
  active; one final leaf (`Cmd_tryswapitems`, 45-min cap, reject-unfolded
  cutoff ~18:15 UTC) may follow before wind-down.
- **Did (this step):** worker (claude-sonnet-5, 50-min cap, one commit,
  ~33 min) ported the exactly-1 `0xc3` registration (distinct error texts
  pinned verbatim), the per-execution operand-only check, attacker+target
  roles, the occupied-`futureSightCounter[target]` LAZY fail jump, and the
  success path: counter=3 / move / attacker / dmg cell writes,
  `calculate_future_attack_base_damage` (Huge/Pure Power, type-boost items
  for Psychic+Steel, Choice Band, Soul Dew ×2, Light Ball, Metal Powder,
  Thick Club, Hustle, Plus/Minus over alive+present battlers, Guts, Marvel
  Scale — modifiers pre-applied and NOT forwarded to the kernel, mirroring
  the TS which passes no holdEffect/species and only ABILITY_GUTS),
  helpingHand ×15/10 trunc, target-side `SIDE_STATUS_FUTUREATTACK` OR,
  multistringChooser 353→1/248→0. No scheduler write, no events, no RNG.
  Canonical TS supplies **48 behavior** and **8 registration** cases; corpus
  sha256 `ef1b6a8cf22adebb7e4d8dad9faa3f17cd16443e37a2866ec62f58173fd07da8`.
- **Next:** dispatch + verify M71 `Cmd_tryswapitems` (brief prepared this
  session; citations verified) with the 18:15 cutoff, then wind down before
  19:01. After that, remaining rng-free candidates: stockpile family (needs
  the shared `calculateBattleScriptBaseDamageForCurrentMove` hit-chain
  helper — sports halvers + dynamicBasePower + type resolution — not yet
  ported as a shared Rust fn; budget it as a larger leaf), and the
  `jumpifbyte`/`jumpifhalfword`/`jumpifword` barrier-projection decision.
  No deferral is open.
- **Notes:** supervisor audit covered the handler against
  `battle_script_commands.c:8929-8956` and the kernel-input mapping
  (double-application avoidance is exactly the TS contract; the TS-generated
  corpus would fail on any mapping drift) plus generator provenance;
  independent regeneration was byte-identical. `is_double_battle_spread_move`
  is always false (TS `&& false`), so battleTypeFlags is deliberately not in
  this leaf's rules slice. Generated Rust is **228,591 bytes**, sha256
  `89b9d9b4c9c38a34b685715ea55e5dc4a771a1f37fec6ca3cc1620f6841b07c9`;
  generator is **34,927 bytes**, sha256
  `3b77a51f3519fb359573edd5d3a9adcac20c6c2376d1d6595c36a4b3fceb4282`.
  Gates rerun on `rust-main` post-fold: **1,308/1,308** native, fmt, strict
  workspace Clippy, wasm32 release; artifact **512,256 bytes**, sha256
  `8cf919245391dd50536cabd04794dc277f11da0866a7b4d63776ef2d72adf47f` (+5.0 KB
  from the kernel-reusing leaf). No npm gate required; no deferral or
  barrier added. R70 archived.

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
